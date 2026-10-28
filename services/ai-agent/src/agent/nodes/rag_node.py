"""RAG context retrieval node using pgvector."""
from __future__ import annotations

from typing import Any, Dict
from langchain_core.messages import HumanMessage

from src.agent.state import AgentState
from src.observability.logging import get_logger
from src.tools.read_tools import search_policy_docs

logger = get_logger("rag_node")


async def retrieve_context_node(state: AgentState) -> Dict[str, Any]:
    """
    RAG Node: Performs semantic vector search on company policies and SOPs
    relevant to the conversation intent and user question.
    """
    intent = state.get("intent", "general")
    messages = state.get("messages", [])

    last_user_message = ""
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage) or getattr(msg, "type", "") == "human":
            last_user_message = msg.content if isinstance(msg.content, str) else str(msg.content)
            break

    query = last_user_message
    category = None

    if intent == "billing_dispute":
        query = f"duplicate charge refund policy billing error {last_user_message}"
        category = "billing"
    elif intent == "order_status":
        query = f"order delivery shipping delays SLA tracking {last_user_message}"
        category = "shipping"
    elif intent == "policy_question":
        query = f"return replacement policy guidelines {last_user_message}"

    logger.info("Executing RAG retrieval for intent", intent=intent, query=query)
    docs = await search_policy_docs.ainvoke({"query": query, "category": category})

    return {
        "retrieved_docs": docs,
    }
