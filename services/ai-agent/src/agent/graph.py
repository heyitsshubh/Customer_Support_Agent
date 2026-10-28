"""StateGraph compilation and execution runner."""
from __future__ import annotations

from typing import Any, Dict, Optional
from langchain_core.messages import HumanMessage
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from src.agent.state import AgentState
from src.agent.nodes.classify_node import classify_intent_node
from src.agent.nodes.rag_node import retrieve_context_node
from src.agent.nodes.fetch_data_node import fetch_customer_data_node
from src.agent.nodes.reason_node import reason_and_plan_node
from src.agent.nodes.approval_node import approval_gate_node
from src.agent.nodes.execute_node import execute_action_node
from src.agent.nodes.respond_node import compose_response_node
from src.agent.router import route_after_reasoning, route_after_approval
from src.observability.logging import get_logger

logger = get_logger("graph")


def build_support_graph() -> Any:
    """Constructs and compiles the customer support LangGraph workflow."""
    workflow = StateGraph(AgentState)

    # 1. Add Nodes
    workflow.add_node("classify_intent", classify_intent_node)
    workflow.add_node("retrieve_context", retrieve_context_node)
    workflow.add_node("fetch_customer_data", fetch_customer_data_node)
    workflow.add_node("reason_and_plan", reason_and_plan_node)
    workflow.add_node("approval_gate", approval_gate_node)
    workflow.add_node("execute_action", execute_action_node)
    workflow.add_node("compose_response", compose_response_node)

    # 2. Add Fixed Edges
    workflow.add_edge(START, "classify_intent")
    workflow.add_edge("classify_intent", "retrieve_context")
    workflow.add_edge("retrieve_context", "fetch_customer_data")
    workflow.add_edge("fetch_customer_data", "reason_and_plan")

    # 3. Add Conditional Routing Edges
    workflow.add_conditional_edges(
        "reason_and_plan",
        route_after_reasoning,
        {
            "approval_gate": "approval_gate",
            "compose_response": "compose_response",
        },
    )

    workflow.add_conditional_edges(
        "approval_gate",
        route_after_approval,
        {
            "execute_action": "execute_action",
            "compose_response": "compose_response",
        },
    )

    workflow.add_edge("execute_action", "compose_response")
    workflow.add_edge("compose_response", END)

    # 4. Compile with durable in-memory / persistent checkpointer
    checkpointer = MemorySaver()
    compiled = workflow.compile(checkpointer=checkpointer)
    logger.info("Compiled LangGraph customer support workflow with checkpointing")
    return compiled


# Singleton compiled graph
agent_graph = build_support_graph()


async def run_support_agent(
    thread_id: str,
    customer_id: str,
    message: str,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Executes or advances a thread in the support graph.
    Returns status: 'completed' or 'pending_approval' with context.
    """
    config = {"configurable": {"thread_id": thread_id}}

    initial_state: AgentState = {
        "messages": [HumanMessage(content=message)],
        "customer_id": customer_id,
        "thread_id": thread_id,
        "order_number": (context or {}).get("order_number"),
        "intent": None,
        "retrieved_docs": [],
        "customer_data": {},
        "pending_action": None,
        "approval_status": None,
        "approver_id": None,
        "approver_notes": None,
        "action_result": None,
        "final_response": None,
    }

    logger.info("Invoking LangGraph agent", thread_id=thread_id, customer_id=customer_id)

    # Run graph (ainvoke runs until completed or interrupted)
    result = await agent_graph.ainvoke(initial_state, config=config)

    # Inspect if graph paused on an interrupt
    state_snapshot = await agent_graph.aget_state(config)
    if state_snapshot.tasks and state_snapshot.tasks[0].interrupts:
        interrupt_val = state_snapshot.tasks[0].interrupts[0].value
        logger.info("Agent workflow paused at interrupt gate", thread_id=thread_id, interrupt=interrupt_val)
        return {
            "thread_id": thread_id,
            "status": "pending_approval",
            "pending_action": interrupt_val,
            "response": "Your request involves a financial refund and is currently awaiting human supervisor review.",
        }

    return {
        "thread_id": thread_id,
        "status": "completed",
        "response": result.get("final_response"),
        "intent": result.get("intent"),
        "order_number": result.get("order_number"),
    }


async def resume_support_agent(
    thread_id: str,
    approved: bool,
    approver_id: str,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Resumes an interrupted graph execution using LangGraph Command(resume=...).
    """
    config = {"configurable": {"thread_id": thread_id}}

    state_snapshot = await agent_graph.aget_state(config)
    if not state_snapshot.tasks or not state_snapshot.tasks[0].interrupts:
        return {
            "thread_id": thread_id,
            "status": "error",
            "message": f"Thread '{thread_id}' is not currently paused at an approval gate.",
        }

    resume_payload = {
        "approved": approved,
        "approver_id": approver_id,
        "notes": notes or ("Approved by supervisor" if approved else "Rejected by supervisor"),
    }

    logger.info("Resuming LangGraph execution with decision", thread_id=thread_id, resume_payload=resume_payload)
    result = await agent_graph.ainvoke(Command(resume=resume_payload), config=config)

    return {
        "thread_id": thread_id,
        "status": "completed",
        "response": result.get("final_response"),
        "approval_status": result.get("approval_status"),
        "action_result": result.get("action_result"),
    }
