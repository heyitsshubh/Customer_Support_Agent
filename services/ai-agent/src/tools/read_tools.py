"""Read-only agent tools for fetching customer data, order details, transactions, and policies."""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from langchain_core.tools import tool
from sqlalchemy import text

from src.infrastructure.database import async_engine
from src.observability.logging import get_logger
from src.observability.metrics import MetricsRegistry
from src.rag.retriever import get_retriever

logger = get_logger("read_tools")


@tool
async def get_customer_profile(customer_id: str) -> Dict[str, Any]:
    """
    Fetch customer profile details including tier (standard, silver, gold), name, and lifetime value.

    Args:
        customer_id: The UUID or email of the customer.
    """
    MetricsRegistry.agent_tool_calls_total.labels(tool_name="get_customer_profile", status="attempt").inc()
    logger.info("Executing tool: get_customer_profile", customer_id=customer_id)

    query = text("""
        SELECT id, email, name, tier, lifetime_value, created_at
        FROM customers
        WHERE id::text = :cid OR email = :cid
        LIMIT 1;
    """)

    try:
        async with async_engine.connect() as conn:
            result = await conn.execute(query, {"cid": customer_id})
            row = result.fetchone()

            if not row:
                return {"found": False, "error": f"Customer '{customer_id}' not found."}

            data = {
                "found": True,
                "customer_id": str(row.id),
                "email": row.email,
                "name": row.name,
                "tier": row.tier,
                "lifetime_value": float(row.lifetime_value),
            }
            MetricsRegistry.agent_tool_calls_total.labels(tool_name="get_customer_profile", status="success").inc()
            return data
    except Exception as e:
        logger.error("Error in get_customer_profile", error=str(e))
        MetricsRegistry.agent_tool_calls_total.labels(tool_name="get_customer_profile", status="error").inc()
        return {"found": False, "error": str(e)}


@tool
async def get_order_status(order_number: str) -> Dict[str, Any]:
    """
    Retrieve order details, shipment tracking status, carrier, and item list for an order number.

    Args:
        order_number: The order identifier (e.g. 'ORD-1042').
    """
    MetricsRegistry.agent_tool_calls_total.labels(tool_name="get_order_status", status="attempt").inc()
    logger.info("Executing tool: get_order_status", order_number=order_number)

    query = text("""
        SELECT o.id, o.customer_id, o.order_number, o.status, o.total_amount, 
               o.items, o.tracking_number, o.carrier, o.created_at,
               c.name as customer_name, c.email as customer_email, c.tier as customer_tier
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.order_number = :order_number OR o.id::text = :order_number
        LIMIT 1;
    """)

    try:
        async with async_engine.connect() as conn:
            result = await conn.execute(query, {"order_number": order_number.strip()})
            row = result.fetchone()

            if not row:
                return {"found": False, "error": f"Order '{order_number}' not found."}

            data = {
                "found": True,
                "order_id": str(row.id),
                "customer_id": str(row.customer_id),
                "customer_name": row.customer_name,
                "customer_tier": row.customer_tier,
                "order_number": row.order_number,
                "status": row.status,
                "total_amount": float(row.total_amount),
                "items": row.items or [],
                "tracking_number": row.tracking_number,
                "carrier": row.carrier,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            MetricsRegistry.agent_tool_calls_total.labels(tool_name="get_order_status", status="success").inc()
            return data
    except Exception as e:
        logger.error("Error in get_order_status", error=str(e))
        MetricsRegistry.agent_tool_calls_total.labels(tool_name="get_order_status", status="error").inc()
        return {"found": False, "error": str(e)}


@tool
async def get_transactions(order_identifier: str) -> Dict[str, Any]:
    """
    Get all billing transactions associated with an order and detect duplicate charge anomalies.

    Args:
        order_identifier: Order number (e.g. 'ORD-1042') or order UUID.
    """
    MetricsRegistry.agent_tool_calls_total.labels(tool_name="get_transactions", status="attempt").inc()
    logger.info("Executing tool: get_transactions", order_identifier=order_identifier)

    query = text("""
        SELECT t.id, t.order_id, t.amount, t.type, t.status, t.idempotency_key, t.created_at,
               o.order_number
        FROM transactions t
        JOIN orders o ON t.order_id = o.id
        WHERE o.order_number = :ident OR o.id::text = :ident
        ORDER BY t.created_at ASC;
    """)

    try:
        async with async_engine.connect() as conn:
            result = await conn.execute(query, {"ident": order_identifier.strip()})
            rows = result.fetchall()

            transactions = [
                {
                    "transaction_id": str(r.id),
                    "amount": float(r.amount),
                    "type": r.type,
                    "status": r.status,
                    "idempotency_key": r.idempotency_key,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rows
            ]

            # Analyze for duplicate charges
            charges = [t for t in transactions if t["type"] == "charge" and t["status"] == "success"]
            has_duplicate = len(charges) > 1 and len(set(c["amount"] for c in charges)) == 1

            duplicate_info = {}
            if has_duplicate:
                duplicate_info = {
                    "is_duplicate_detected": True,
                    "charge_count": len(charges),
                    "duplicate_transaction_id": charges[-1]["transaction_id"],
                    "refundable_amount": charges[-1]["amount"],
                    "summary": f"Detected {len(charges)} identical charges of ${charges[0]['amount']} for this order.",
                }
            else:
                duplicate_info = {
                    "is_duplicate_detected": False,
                    "charge_count": len(charges),
                }

            MetricsRegistry.agent_tool_calls_total.labels(tool_name="get_transactions", status="success").inc()
            return {
                "order_identifier": order_identifier,
                "total_transactions": len(transactions),
                "transactions": transactions,
                "duplicate_analysis": duplicate_info,
            }
    except Exception as e:
        logger.error("Error in get_transactions", error=str(e))
        MetricsRegistry.agent_tool_calls_total.labels(tool_name="get_transactions", status="error").inc()
        return {"error": str(e)}


@tool
async def check_refund_eligibility(order_number: str, reason: str = "duplicate_charge") -> Dict[str, Any]:
    """
    Evaluates business policy rules to determine if an order/transaction is eligible for refund.

    Args:
        order_number: Order number to inspect (e.g. 'ORD-1042').
        reason: Reason for refund request ('duplicate_charge', 'return', 'item_missing').
    """
    MetricsRegistry.agent_tool_calls_total.labels(tool_name="check_refund_eligibility", status="attempt").inc()
    logger.info("Executing tool: check_refund_eligibility", order_number=order_number, reason=reason)

    order_info = await get_order_status.ainvoke({"order_number": order_number})
    if not order_info.get("found"):
        return {"eligible": False, "reason": order_info.get("error", "Order not found")}

    txn_info = await get_transactions.ainvoke({"order_identifier": order_number})
    duplicate_analysis = txn_info.get("duplicate_analysis", {})

    if reason == "duplicate_charge":
        if duplicate_analysis.get("is_duplicate_detected"):
            MetricsRegistry.agent_tool_calls_total.labels(tool_name="check_refund_eligibility", status="success").inc()
            return {
                "eligible": True,
                "order_number": order_number,
                "customer_tier": order_info.get("customer_tier"),
                "refundable_amount": duplicate_analysis.get("refundable_amount"),
                "transaction_id_to_refund": duplicate_analysis.get("duplicate_transaction_id"),
                "requires_supervisor_approval": True,
                "policy_citation": "Duplicate Charge Policy: Customer entitled to full refund of duplicate transaction upon supervisor approval.",
            }
        else:
            return {
                "eligible": False,
                "reason": "Duplicate charge not verified in transaction records. Only one charge was found.",
                "requires_supervisor_approval": False,
            }

    # Default fallback eligibility
    return {
        "eligible": True,
        "order_number": order_number,
        "refundable_amount": order_info.get("total_amount"),
        "requires_supervisor_approval": True,
        "policy_citation": "Standard Refund Policy: Subject to manager review.",
    }


@tool
async def search_policy_docs(query: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    RAG Tool: Searches company policy guidelines, SOPs, return procedures, and billing FAQs.

    Args:
        query: The customer question or search topic (e.g. 'duplicate charge policy').
        category: Optional category filter ('billing', 'orders', 'shipping').
    """
    MetricsRegistry.agent_tool_calls_total.labels(tool_name="search_policy_docs", status="attempt").inc()
    logger.info("Executing tool: search_policy_docs", query=query, category=category)

    retriever = get_retriever()
    docs = await retriever.search(query=query, top_k=3, category=category)
    MetricsRegistry.agent_tool_calls_total.labels(tool_name="search_policy_docs", status="success").inc()
    return docs
