"""Post-approval action execution node."""
from __future__ import annotations

from typing import Any, Dict
from src.agent.state import AgentState
from src.observability.logging import get_logger
from src.tools.write_tools import request_refund

logger = get_logger("execute_node")


async def execute_action_node(state: AgentState) -> Dict[str, Any]:
    """
    Executes approved financial transactions or registers rejection records.
    """
    approval_status = state.get("approval_status")
    pending_action = state.get("pending_action")
    action_result = {}

    if not pending_action:
        return {"action_result": None}

    if approval_status == "approved":
        logger.info("Executing approved action", pending_action=pending_action)
        result = await request_refund.ainvoke({
            "case_id": state.get("thread_id", "case_placeholder"),
            "transaction_id": pending_action.get("transaction_id", "txn_sample"),
            "amount": float(pending_action.get("amount", 0.0)),
            "reason": pending_action.get("reason", "Approved duplicate refund"),
            "supervisor_approved": True,
            "approver_id": state.get("approver_id"),
            "notes": state.get("approver_notes"),
        })
        action_result = result
    elif approval_status == "rejected":
        logger.info("Skipping execution: Action was rejected by reviewer", notes=state.get("approver_notes"))
        action_result = {
            "status": "rejected",
            "executed": False,
            "reason": state.get("approver_notes", "Supervisor rejected the requested action."),
        }

    return {
        "action_result": action_result,
    }
