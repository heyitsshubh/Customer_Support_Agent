"""
Pytest unit tests for the approval_gate LangGraph node.
Tests the interrupt() suspension mechanism for human-in-the-loop approval.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Any


def make_state(**overrides: Any) -> dict:
    return {
        "thread_id": overrides.get("thread_id", "thread-test-001"),
        "customer_id": overrides.get("customer_id", "customer-001"),
        "messages": overrides.get("messages", [
            {"role": "user", "content": "Please refund the duplicate charge."}
        ]),
        "intent": overrides.get("intent", "billing_dispute"),
        "context_docs": overrides.get("context_docs", []),
        "customer_data": overrides.get("customer_data", {}),
        "pending_action": overrides.get("pending_action", {
            "action": "request_refund",
            "action_params": {"order_id": "ORD-1042", "amount": 89.99, "currency": "USD"},
        }),
        "requires_approval": overrides.get("requires_approval", True),
        "supervisor_approved": overrides.get("supervisor_approved", None),
        "approver_id": overrides.get("approver_id", None),
        "approval_notes": overrides.get("approval_notes", None),
        "final_response": overrides.get("final_response", None),
        "error": overrides.get("error", None),
    }


class TestApprovalNode:
    """Unit tests for the approval_gate_node."""

    @pytest.mark.asyncio
    async def test_interrupt_raised_when_approval_required(self):
        """
        When requires_approval=True and supervisor_approved=None,
        the node must call interrupt() to suspend execution.
        """
        with patch("src.agent.nodes.approval_node.interrupt") as mock_interrupt:
            mock_interrupt.side_effect = Exception("GraphInterrupt")  # Simulate LangGraph interrupt

            from src.agent.nodes.approval_node import approval_gate_node

            state = make_state(requires_approval=True, supervisor_approved=None)

            with pytest.raises(Exception, match="GraphInterrupt"):
                await approval_gate_node(state)

            mock_interrupt.assert_called_once()

    @pytest.mark.asyncio
    async def test_interrupt_payload_contains_pending_action(self):
        """The interrupt payload must include the pending_action details."""
        captured_payload = {}

        def capture_interrupt(payload):
            captured_payload.update(payload)
            raise Exception("GraphInterrupt")

        with patch("src.agent.nodes.approval_node.interrupt", side_effect=capture_interrupt):
            from src.agent.nodes.approval_node import approval_gate_node

            state = make_state(requires_approval=True, supervisor_approved=None)

            with pytest.raises(Exception):
                await approval_gate_node(state)

        assert "pending_action" in captured_payload or "action" in str(captured_payload)
        assert "ORD-1042" in str(captured_payload) or "refund" in str(captured_payload).lower()

    @pytest.mark.asyncio
    async def test_no_interrupt_when_already_approved(self):
        """
        When supervisor_approved=True, the node should pass through
        without calling interrupt().
        """
        with patch("src.agent.nodes.approval_node.interrupt") as mock_interrupt:
            from src.agent.nodes.approval_node import approval_gate_node

            state = make_state(
                requires_approval=True,
                supervisor_approved=True,
                approver_id="supervisor-001",
                approval_notes="Verified duplicate charge.",
            )

            result = await approval_gate_node(state)

            mock_interrupt.assert_not_called()
            # State should pass through unchanged or with approval flags
            assert result is not None

    @pytest.mark.asyncio
    async def test_no_interrupt_when_rejected(self):
        """
        When supervisor_approved=False, the node should pass through
        (rejection is handled by execute_action_node).
        """
        with patch("src.agent.nodes.approval_node.interrupt") as mock_interrupt:
            from src.agent.nodes.approval_node import approval_gate_node

            state = make_state(
                requires_approval=True,
                supervisor_approved=False,
                approver_id="supervisor-001",
                approval_notes="Policy does not cover this case.",
            )

            result = await approval_gate_node(state)

            mock_interrupt.assert_not_called()
            assert result is not None

    @pytest.mark.asyncio
    async def test_no_interrupt_when_approval_not_required(self):
        """
        When requires_approval=False, the node should pass through immediately
        without any interrupt, even if supervisor_approved is None.
        """
        with patch("src.agent.nodes.approval_node.interrupt") as mock_interrupt:
            from src.agent.nodes.approval_node import approval_gate_node

            state = make_state(requires_approval=False, supervisor_approved=None)

            result = await approval_gate_node(state)

            mock_interrupt.assert_not_called()
            assert result is not None

    @pytest.mark.asyncio
    async def test_returns_dict(self):
        """The node must return a dict (partial state update)."""
        with patch("src.agent.nodes.approval_node.interrupt") as mock_interrupt:
            from src.agent.nodes.approval_node import approval_gate_node

            state = make_state(requires_approval=False, supervisor_approved=None)

            result = await approval_gate_node(state)

            assert isinstance(result, dict)
