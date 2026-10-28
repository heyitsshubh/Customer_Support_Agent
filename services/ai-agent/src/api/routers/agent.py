"""Agent API router exposing execution and human approval endpoints connected to LangGraph."""
from typing import Any, Dict, Optional
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from src.agent.graph import run_support_agent, resume_support_agent, agent_graph
from src.observability.logging import get_logger

router = APIRouter(prefix="", tags=["Agent"])
logger = get_logger("agent_router")


class RunAgentRequest(BaseModel):
    thread_id: str = Field(..., description="Unique thread identifier for conversation state")
    customer_id: str = Field(..., description="Customer ID associated with the interaction")
    message: str = Field(..., description="User message or query")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Optional extra metadata")


class ResumeAgentRequest(BaseModel):
    thread_id: str = Field(..., description="Thread identifier paused at approval gate")
    approved: bool = Field(..., description="Whether human reviewer approved the pending action")
    approver_id: str = Field(..., description="ID of human agent/reviewer")
    notes: Optional[str] = Field(None, description="Reviewer notes or reason")


@router.post("/run", status_code=status.HTTP_200_OK)
async def run_agent(payload: RunAgentRequest):
    """
    Initiates or continues execution of the LangGraph support agent.
    If the agent encounters a financial refund action, it pauses at the interrupt gate
    and returns status='pending_approval'.
    """
    logger.info("Received /run request", thread_id=payload.thread_id, customer_id=payload.customer_id)
    result = await run_support_agent(
        thread_id=payload.thread_id,
        customer_id=payload.customer_id,
        message=payload.message,
        context=payload.context,
    )
    return result


@router.post("/resume", status_code=status.HTTP_200_OK)
async def resume_agent(payload: ResumeAgentRequest):
    """
    Resumes an interrupted graph execution using LangGraph Command(resume=...).
    Executes the refund if approved, or composes a rejection notice if not.
    """
    logger.info("Received /resume request", thread_id=payload.thread_id, approved=payload.approved)
    result = await resume_support_agent(
        thread_id=payload.thread_id,
        approved=payload.approved,
        approver_id=payload.approver_id,
        notes=payload.notes,
    )
    return result


@router.get("/state/{thread_id}", status_code=status.HTTP_200_OK)
async def get_agent_state(thread_id: str):
    """
    Retrieves the serialized state snapshot of a LangGraph conversation thread.
    """
    config = {"configurable": {"thread_id": thread_id}}
    state_snapshot = await agent_graph.aget_state(config)

    current_node = state_snapshot.next[0] if state_snapshot.next else "END"
    is_paused = bool(state_snapshot.tasks and state_snapshot.tasks[0].interrupts)
    interrupt_payload = (
        state_snapshot.tasks[0].interrupts[0].value if is_paused else None
    )

    return {
        "thread_id": thread_id,
        "current_node": current_node,
        "is_paused": is_paused,
        "interrupt": interrupt_payload,
        "values": {
            "intent": state_snapshot.values.get("intent"),
            "order_number": state_snapshot.values.get("order_number"),
            "approval_status": state_snapshot.values.get("approval_status"),
            "final_response": state_snapshot.values.get("final_response"),
        },
    }
