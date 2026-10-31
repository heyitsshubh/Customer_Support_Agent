"""Conditional edge routing functions for LangGraph."""
from __future__ import annotations

from typing import Literal
from src.agent.state import AgentState
from src.observability.logging import get_logger

logger = get_logger("router")


def route_after_reasoning(state: AgentState) -> Literal["approval_gate", "compose_response"]:
    """
    Decides whether workflow must pause at the human approval gate or proceed directly to response.
    """
    pending_action = state.get("pending_action")

    if pending_action and pending_action.get("type") == "refund":
        logger.info("Routing to approval_gate (financial action detected)")
        return "approval_gate"

    logger.info("Routing directly to compose_response (no supervisor approval needed)")
    return "compose_response"


def route_after_approval(state: AgentState) -> Literal["execute_action", "compose_response"]:
    """
    Routes from approval gate to execution or response composition.
    """
    approval_status = state.get("approval_status")

    if approval_status in ("approved", "rejected"):
        logger.info("Routing to execute_action post-approval", approval_status=approval_status)
        return "execute_action"

    return "compose_response"
