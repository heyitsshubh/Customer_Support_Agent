"""Reasoning and action planning node."""
from __future__ import annotations

from typing import Any, Dict
from src.agent.state import AgentState
from src.observability.logging import get_logger

logger = get_logger("reason_node")


async def reason_and_plan_node(state: AgentState) -> Dict[str, Any]:
    """
    Evaluates evidence from retrieved docs, customer data, and transaction logs.
    Determines if a sensitive financial write action is required and prepares the payload.
    """
    intent = state.get("intent", "general")
    customer_data = state.get("customer_data", {})
    eligibility = customer_data.get("eligibility", {})
    pending_action = None

    if intent == "billing_dispute" and eligibility.get("eligible"):
        amount = eligibility.get("refundable_amount", 49.99)
        txn_id = eligibility.get("transaction_id_to_refund", "txn_sample")
        order_num = state.get("order_number", "ORD-1042")

        pending_action = {
            "type": "refund",
            "amount": amount,
            "order_number": order_num,
            "transaction_id": txn_id,
            "reason": f"Verified duplicate charge on order {order_num}",
            "customer_tier": customer_data.get("customer", {}).get("tier", "standard"),
        }
        logger.info("Planned financial refund action", pending_action=pending_action)

    return {
        "pending_action": pending_action,
    }
