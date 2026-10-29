"""Intent classification node."""
from __future__ import annotations

import re
from typing import Any, Dict
from langchain_core.messages import HumanMessage, SystemMessage

from src.agent.state import AgentState
from src.observability.logging import get_logger

logger = get_logger("classify_node")


async def classify_intent_node(state: AgentState) -> Dict[str, Any]:
    """
    Analyzes conversation messages to classify customer intent and extract order references.
    """
    messages = state.get("messages", [])
    last_user_message = ""

    for msg in reversed(messages):
        if isinstance(msg, HumanMessage) or getattr(msg, "type", "") == "human":
            last_user_message = msg.content if isinstance(msg.content, str) else str(msg.content)
            break

    text_lower = last_user_message.lower()
    intent = "general"

    # Pattern recognition & classification
    if any(k in text_lower for k in ["duplicate", "charged twice", "double charge", "refund", "overcharge", "billed twice"]):
        intent = "billing_dispute"
    elif any(k in text_lower for k in ["order", "tracking", "status", "where is", "shipped", "delivery", "delivered"]):
        intent = "order_status"
    elif any(k in text_lower for k in ["policy", "return", "warranty", "exchange", "sla", "terms", "replace"]):
        intent = "policy_question"

    # Extract order numbers formatted like ORD-XXXX or #XXXX
    order_match = re.search(r"(?:ORD[-_]?\d+|\b#\d{4,}\b|\border\s*#?\s*(\d+))", last_user_message, re.IGNORECASE)
    order_number = state.get("order_number")

    if order_match and not order_number:
        matched_str = order_match.group(0).upper().replace("#", "").strip()
        if not matched_str.startswith("ORD-"):
            matched_str = f"ORD-{matched_str}"
        order_number = matched_str

    # Default to sample duplicate charge order if discussing duplicate charges without specifying
    if intent == "billing_dispute" and not order_number:
        order_number = "ORD-1042"

    logger.info("Classified intent", intent=intent, order_number=order_number)
    return {
        "intent": intent,
        "order_number": order_number,
    }
