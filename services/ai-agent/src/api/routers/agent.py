"""Agent API router exposing execution and human approval endpoints."""
from typing import Any, Dict, Optional
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="", tags=["Agent"])


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
    Returns status: 'completed', 'pending_approval', or 'error'.
    """
    # Placeholder stub for feat/project-scaffold.
    # Full LangGraph agent graph will be connected in feat/agent-nodes.
    return {
        "thread_id": payload.thread_id,
        "status": "completed",
        "response": f"AI Agent initialized. Received message: '{payload.message}'. LangGraph workflow ready for connection.",
    }


@router.post("/resume", status_code=status.HTTP_200_OK)
async def resume_agent(payload: ResumeAgentRequest):
    """
    Resumes a graph execution that was suspended at an interrupt approval gate.
    """
    return {
        "thread_id": payload.thread_id,
        "status": "completed",
        "response": f"Action {'approved' if payload.approved else 'rejected'} by {payload.approver_id}.",
    }


@router.get("/state/{thread_id}", status_code=status.HTTP_200_OK)
async def get_agent_state(thread_id: str):
    """
    Retrieves the serialized state snapshot of a LangGraph conversation thread.
    """
    return {
        "thread_id": thread_id,
        "current_node": "END",
        "intent": "general_inquiry",
        "messages": [],
    }
