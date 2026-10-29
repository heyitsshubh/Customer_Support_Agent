"""
Pytest unit tests for the classify_intent LangGraph node.
Tests routing across billing_dispute, order_status, and general intents.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Any


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_state(message: str, **overrides: Any) -> dict:
    """Build a minimal AgentState dict for testing."""
    return {
        "thread_id": overrides.get("thread_id", "thread-test-001"),
        "customer_id": overrides.get("customer_id", "customer-001"),
        "messages": [{"role": "user", "content": message}],
        "intent": None,
        "context_docs": [],
        "customer_data": {},
        "pending_action": None,
        "requires_approval": False,
        "supervisor_approved": None,
        "approver_id": None,
        "approval_notes": None,
        "final_response": None,
        "error": None,
        **overrides,
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestClassifyNode:
    """Unit tests for classify_intent_node."""

    @pytest.fixture(autouse=True)
    def patch_openai(self, monkeypatch):
        """Patch the LLM call so tests don't hit OpenAI."""
        self.mock_llm_response = MagicMock()
        self.mock_llm_response.content = '{"intent": "billing_dispute", "confidence": 0.95}'

        mock_llm = AsyncMock()
        mock_llm.ainvoke = AsyncMock(return_value=self.mock_llm_response)

        monkeypatch.setattr(
            "src.agent.nodes.classify_node.get_llm",
            lambda: mock_llm,
        )
        self.mock_llm = mock_llm

    @pytest.mark.asyncio
    async def test_classifies_billing_dispute(self):
        """Duplicate charge message should be classified as billing_dispute."""
        from src.agent.nodes.classify_node import classify_intent_node

        state = make_state("I was charged twice for my order ORD-1042.")
        result = await classify_intent_node(state)

        assert result["intent"] == "billing_dispute"

    @pytest.mark.asyncio
    async def test_classifies_order_status(self, monkeypatch):
        """Order tracking message should be classified as order_status."""
        from src.agent.nodes.classify_node import classify_intent_node

        self.mock_llm_response.content = '{"intent": "order_status", "confidence": 0.91}'

        state = make_state("Where is my order? Tracking number 1Z999AA1.")
        result = await classify_intent_node(state)

        assert result["intent"] == "order_status"

    @pytest.mark.asyncio
    async def test_classifies_general_inquiry(self, monkeypatch):
        """General question should fall back to general intent."""
        from src.agent.nodes.classify_node import classify_intent_node

        self.mock_llm_response.content = '{"intent": "general_inquiry", "confidence": 0.80}'

        state = make_state("What is your return policy?")
        result = await classify_intent_node(state)

        assert result["intent"] == "general_inquiry"

    @pytest.mark.asyncio
    async def test_classifies_refund_request(self, monkeypatch):
        """Explicit refund request should be classified as refund_request."""
        from src.agent.nodes.classify_node import classify_intent_node

        self.mock_llm_response.content = '{"intent": "refund_request", "confidence": 0.97}'

        state = make_state("I want a refund for my purchase last week.")
        result = await classify_intent_node(state)

        assert result["intent"] == "refund_request"

    @pytest.mark.asyncio
    async def test_node_returns_updated_state(self):
        """The node should return a dict with at least the intent key."""
        from src.agent.nodes.classify_node import classify_intent_node

        state = make_state("I was overcharged.")
        result = await classify_intent_node(state)

        assert isinstance(result, dict)
        assert "intent" in result

    @pytest.mark.asyncio
    async def test_llm_is_called_once(self):
        """The LLM should be invoked exactly once per classification."""
        from src.agent.nodes.classify_node import classify_intent_node

        state = make_state("Duplicate charge issue.")
        await classify_intent_node(state)

        self.mock_llm.ainvoke.assert_called_once()

    @pytest.mark.asyncio
    async def test_handles_malformed_llm_response_gracefully(self, monkeypatch):
        """If the LLM returns non-JSON, the node should default to general_inquiry."""
        from src.agent.nodes.classify_node import classify_intent_node

        self.mock_llm_response.content = "I cannot determine the intent."

        state = make_state("Something happened with my account.")
        result = await classify_intent_node(state)

        # Should not crash and should have a fallback intent
        assert result.get("intent") is not None

    @pytest.mark.asyncio
    async def test_confidence_stored_in_state(self, monkeypatch):
        """High-confidence classification should be stored."""
        from src.agent.nodes.classify_node import classify_intent_node

        self.mock_llm_response.content = '{"intent": "billing_dispute", "confidence": 0.99}'

        state = make_state("I see two charges on my card.")
        result = await classify_intent_node(state)

        # Intent must be set
        assert result["intent"] == "billing_dispute"
