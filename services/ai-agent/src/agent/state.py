"""AgentState TypedDict for LangGraph state propagation."""
from __future__ import annotations

from typing import Annotated, Any, Dict, List, Optional
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """
    Core state dictionary passed across every node in the support agent graph.
    Uses add_messages reducer so new messages append cleanly to history.
    """

    # Conversation history
    messages: Annotated[List[BaseMessage], add_messages]

    # Context identifiers
    customer_id: str
    thread_id: str
    order_number: Optional[str]

    # Classified intent ('billing_dispute', 'order_status', 'policy_question', 'general')
    intent: Optional[str]

    # Retrieved RAG context documents from pgvector
    retrieved_docs: List[Dict[str, Any]]

    # Data fetched from internal systems (customer profile, order status, transactions)
    customer_data: Dict[str, Any]

    # Pending financial or sensitive action requiring human supervisor sign-off
    pending_action: Optional[Dict[str, Any]]

    # Human-in-the-loop approval status ('pending', 'approved', 'rejected')
    approval_status: Optional[str]
    approver_id: Optional[str]
    approver_notes: Optional[str]

    # Result of executing the action post-approval
    action_result: Optional[Dict[str, Any]]

    # Final generated response to customer
    final_response: Optional[str]
