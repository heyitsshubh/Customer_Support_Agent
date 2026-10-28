"""Human-in-the-loop approval gate node using LangGraph interrupt()."""
from __future__ import annotations

from typing import Any, Dict
from langgraph.types import interrupt

from src.agent.state import AgentState
from src.observability.logging import get_logger

logger = get_logger("approval_node")


def approval_gate_node(state: AgentState) -> Dict[str, Any]:
    """
    Approval Node:
    Pauses graph execution via interrupt() if a sensitive action (such as a financial refund) is pending.
    State is persisted to the checkpointer and control returns to the caller with status 'pending_approval'.
    When the human supervisor reviews and calls resume, the response dictionary is returned.
    """
    pending_action = state.get("pending_action")

    if not pending_action:
        # If no approval is required, pass through
        return {
            "approval_status": "none",
        }

    logger.info("Interrupting execution for supervisor approval", pending_action=pending_action)

    # interrupt() halts execution and returns this payload to the external caller
    human_decision = interrupt({
        "action": "approval_required",
        "type": pending_action.get("type"),
        "amount": pending_action.get("amount"),
        "order_number": pending_action.get("order_number"),
        "reason": pending_action.get("reason"),
        "customer_id": state.get("customer_id"),
        "thread_id": state.get("thread_id"),
    })

    # When resumed via Command(resume={...}), human_decision contains the supervisor response
    is_approved = bool(human_decision.get("approved", False))
    approver_id = human_decision.get("approver_id", "supervisor_admin")
    notes = human_decision.get("notes", "Reviewed by supervisor")

    logger.info("Resumed from interrupt approval gate", approved=is_approved, approver=approver_id)

    return {
        "approval_status": "approved" if is_approved else "rejected",
        "approver_id": approver_id,
        "approver_notes": notes,
    }
