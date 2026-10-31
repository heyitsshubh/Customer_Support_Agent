"""Financial and escalation write tools requiring supervisor approval gates."""
from __future__ import annotations

import uuid
from typing import Any, Dict, Optional
from langchain_core.tools import tool
from sqlalchemy import text

from src.infrastructure.database import async_engine
from src.observability.logging import get_logger
from src.observability.metrics import MetricsRegistry

logger = get_logger("write_tools")


@tool
async def request_refund(
    case_id: str,
    transaction_id: str,
    amount: float,
    reason: str,
    supervisor_approved: bool = False,
    approver_id: Optional[str] = None,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Financial Tool: Submits or executes a refund for a transaction.
    Financial Safety Rule: Requires supervisor_approved=True to execute monetary disbursement.

    Args:
        case_id: The UUID of the support case.
        transaction_id: The transaction ID to refund.
        amount: Dollar amount to refund (e.g. 49.99).
        reason: Justification (e.g. 'Duplicate charge on order ORD-1042').
        supervisor_approved: Must be True to finalize payment gateway call.
        approver_id: The UUID of the supervisor who approved.
        notes: Optional audit notes.
    """
    MetricsRegistry.agent_tool_calls_total.labels(tool_name="request_refund", status="attempt").inc()
    logger.info("Executing write tool: request_refund", case_id=case_id, amount=amount, approved=supervisor_approved)

    # Financial Invariant Check: Safe execution gate
    if not supervisor_approved:
        logger.warn("Refund execution blocked: Human approval gate required", case_id=case_id, amount=amount)
        return {
            "status": "pending_approval",
            "executed": False,
            "requires_human_approval": True,
            "message": f"Refund of ${amount:.2f} requires human manager sign-off before funds disbursement.",
            "approval_payload": {
                "case_id": case_id,
                "transaction_id": transaction_id,
                "amount": amount,
                "reason": reason,
            },
        }

    idempotency_key = f"ref_{transaction_id}_{uuid.uuid4().hex[:8]}"

    query = text("""
        INSERT INTO refund_requests (
            id, case_id, transaction_id, amount, status, idempotency_key,
            approver_id, approved_at, reason, notes, created_at, updated_at
        ) VALUES (
            uuid_generate_v4(), :case_id, :transaction_id, :amount, 'executed',
            :idempotency_key, :approver_id, NOW(), :reason, :notes, NOW(), NOW()
        )
        RETURNING id, idempotency_key, status, amount, approved_at;
    """)

    try:
        async with async_engine.begin() as conn:
            result = await conn.execute(query, {
                "case_id": case_id,
                "transaction_id": transaction_id,
                "amount": amount,
                "idempotency_key": idempotency_key,
                "approver_id": approver_id,
                "reason": reason,
                "notes": notes or "Automated execution post-approval",
            })
            row = result.fetchone()

        MetricsRegistry.agent_tool_calls_total.labels(tool_name="request_refund", status="success").inc()
        logger.info("Refund successfully executed", refund_id=str(row.id), amount=amount)

        return {
            "status": "executed",
            "executed": True,
            "refund_id": str(row.id),
            "amount": float(row.amount),
            "idempotency_key": row.idempotency_key,
            "message": f"Successfully processed refund of ${amount:.2f} to customer payment method.",
        }

    except Exception as e:
        logger.error("Failed to execute refund record", error=str(e), case_id=case_id)
        MetricsRegistry.agent_tool_calls_total.labels(tool_name="request_refund", status="error").inc()
        return {
            "status": "error",
            "executed": False,
            "error": f"Failed to execute refund: {str(e)}",
        }


@tool
async def escalate_to_human(
    case_id: str,
    reason: str,
    priority: str = "high",
) -> Dict[str, Any]:
    """
    Escalates an ongoing case to a human support agent or specialized tier.

    Args:
        case_id: The UUID of the support case.
        reason: Explanation of why human assistance is required.
        priority: Priority level ('medium', 'high', 'urgent').
    """
    MetricsRegistry.agent_tool_calls_total.labels(tool_name="escalate_to_human", status="attempt").inc()
    logger.info("Executing tool: escalate_to_human", case_id=case_id, priority=priority, reason=reason)

    query = text("""
        UPDATE support_cases
        SET priority = :priority,
            summary = :reason,
            updated_at = NOW()
        WHERE id::text = :case_id OR thread_id = :case_id;
    """)

    try:
        async with async_engine.begin() as conn:
            await conn.execute(query, {"case_id": case_id, "priority": priority, "reason": reason})

        MetricsRegistry.agent_tool_calls_total.labels(tool_name="escalate_to_human", status="success").inc()
        return {
            "escalated": True,
            "case_id": case_id,
            "priority": priority,
            "message": f"Case has been escalated to senior support with priority '{priority}'.",
        }
    except Exception as e:
        logger.error("Error escalating case", error=str(e))
        MetricsRegistry.agent_tool_calls_total.labels(tool_name="escalate_to_human", status="error").inc()
        return {"escalated": False, "error": str(e)}


@tool
async def send_resolution_email(
    customer_id: str,
    subject: str,
    message: str,
) -> Dict[str, Any]:
    """
    Sends an automated resolution summary email to the customer.

    Args:
        customer_id: Customer UUID or email address.
        subject: Email subject line.
        message: Body of the email notification.
    """
    MetricsRegistry.agent_tool_calls_total.labels(tool_name="send_resolution_email", status="attempt").inc()
    logger.info("Sending resolution email", customer_id=customer_id, subject=subject)

    # In production, integrates with SendGrid/Resend API
    MetricsRegistry.agent_tool_calls_total.labels(tool_name="send_resolution_email", status="success").inc()
    return {
        "sent": True,
        "recipient": customer_id,
        "subject": subject,
        "status": "delivered_to_outbox",
    }
