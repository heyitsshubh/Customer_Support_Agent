"""
Pytest unit tests for the reason_and_plan LangGraph node.
Tests pending_action creation when a refund is eligible.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from typing import Any


def make_state(**overrides: Any) -> dict:
    return {
        "thread_id": overrides.get("thread_id", "thread-test-001"),
        "customer_id": overrides.get("customer_id", "customer-001"),
        "messages": overrides.get("messages", [
            {"role": "user", "content": "I was charged twice for order ORD-1042."}
        ]),
        "intent": overrides.get("intent", "billing_dispute"),
        "context_docs": overrides.get("context_docs", [
            {"content": "Duplicate charges qualify for immediate refund within 30 days.", "score": 0.92},
        ]),
        "customer_data": overrides.get("customer_data", {
            "customer_id": "customer-001",
            "tier": "premium",
            "orders": [{"order_id": "ORD-1042", "status": "delivered", "total": 89.99}],
            "transactions": [
                {"id": "txn-001", "order_id": "ORD-1042", "amount": 89.99, "type": "charge"},
                {"id": "txn-002", "order_id": "ORD-1042", "amount": 89.99, "type": "charge"},
            ],
            "is_duplicate_detected": True,
        }),
        "pending_action": overrides.get("pending_action", None),
        "requires_approval": overrides.get("requires_approval", False),
        "supervisor_approved": overrides.get("supervisor_approved", None),
        "approver_id": overrides.get("approver_id", None),
        "approval_notes": overrides.get("approval_notes", None),
        "final_response": overrides.get("final_response", None),
        "error": overrides.get("error", None),
    }


class TestReasonNode:
    """Unit tests for reason_and_plan_node."""

    @pytest.fixture(autouse=True)
    def patch_llm(self, monkeypatch):
        """Patch LLM to return a deterministic plan."""
        import json
        self.plan_response = {
            "reasoning": "Duplicate charge detected on ORD-1042. Customer is premium tier. Policy allows refund.",
            "action": "request_refund",
            "action_params": {"order_id": "ORD-1042", "amount": 89.99, "currency": "USD"},
            "requires_approval": True,
        }
        mock_response = MagicMock()
        mock_response.content = json.dumps(self.plan_response)

        mock_llm = AsyncMock()
        mock_llm.ainvoke = AsyncMock(return_value=mock_response)
        self.mock_llm = mock_llm

        monkeypatch.setattr("src.agent.nodes.reason_node.get_llm", lambda: mock_llm)

    @pytest.mark.asyncio
    async def test_creates_pending_action_when_duplicate_detected(self):
        """Should set pending_action for refund when duplicate charge is found."""
        from src.agent.nodes.reason_node import reason_and_plan_node

        state = make_state()
        result = await reason_and_plan_node(state)

        assert result.get("pending_action") is not None
        assert result["pending_action"]["action"] == "request_refund"

    @pytest.mark.asyncio
    async def test_sets_requires_approval_true_for_refund(self):
        """Refund action should require supervisor approval."""
        from src.agent.nodes.reason_node import reason_and_plan_node

        state = make_state()
        result = await reason_and_plan_node(state)

        assert result.get("requires_approval") is True

    @pytest.mark.asyncio
    async def test_pending_action_has_correct_amount(self):
        """The refund amount should match the duplicate charge amount."""
        from src.agent.nodes.reason_node import reason_and_plan_node

        state = make_state()
        result = await reason_and_plan_node(state)

        action_params = result["pending_action"].get("action_params", {})
        assert action_params.get("amount") == pytest.approx(89.99, abs=0.01)

    @pytest.mark.asyncio
    async def test_no_pending_action_for_general_inquiry(self, monkeypatch):
        """General inquiry should not create a pending_action."""
        import json
        no_action_response = MagicMock()
        no_action_response.content = json.dumps({
            "reasoning": "Customer wants to know about return policy.",
            "action": "answer_query",
            "action_params": {},
            "requires_approval": False,
        })
        self.mock_llm.ainvoke = AsyncMock(return_value=no_action_response)

        from src.agent.nodes.reason_node import reason_and_plan_node

        state = make_state(intent="general_inquiry", customer_data={})
        result = await reason_and_plan_node(state)

        # Either no pending_action or action is answer_query (no write action)
        if result.get("pending_action"):
            assert result["pending_action"].get("action") in ("answer_query", None)
        assert result.get("requires_approval") is False

    @pytest.mark.asyncio
    async def test_llm_context_includes_customer_data(self):
        """The LLM should receive customer_data and context_docs in the prompt."""
        from src.agent.nodes.reason_node import reason_and_plan_node

        state = make_state()
        await reason_and_plan_node(state)

        call_args = self.mock_llm.ainvoke.call_args
        prompt_str = str(call_args)
        # Customer data or tier should appear in the prompt
        assert "customer" in prompt_str.lower() or "ORD-1042" in prompt_str

    @pytest.mark.asyncio
    async def test_node_returns_dict(self):
        """The node must always return a dict."""
        from src.agent.nodes.reason_node import reason_and_plan_node

        state = make_state()
        result = await reason_and_plan_node(state)
        assert isinstance(result, dict)
