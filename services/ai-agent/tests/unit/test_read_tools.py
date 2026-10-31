"""
Pytest unit tests for read_tools (LangGraph tool functions).
Tests mock DB calls, duplicate charge detection logic, and policy document search.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Any


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

MOCK_CUSTOMER_ROW = {
    "id": "customer-001",
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "tier": "premium",
    "created_at": "2023-01-10T00:00:00Z",
}

MOCK_ORDER_ROW = {
    "id": "ORD-1042",
    "customer_id": "customer-001",
    "status": "delivered",
    "total_amount": 89.99,
    "currency": "USD",
    "created_at": "2024-01-15T14:00:00Z",
}

MOCK_TRANSACTION_ROWS = [
    {
        "id": "txn-001",
        "order_id": "ORD-1042",
        "amount": 89.99,
        "currency": "USD",
        "type": "charge",
        "created_at": "2024-01-15T14:30:00Z",
        "description": "Order payment",
    },
    {
        "id": "txn-002",
        "order_id": "ORD-1042",
        "amount": 89.99,
        "currency": "USD",
        "type": "charge",
        "created_at": "2024-01-15T14:32:00Z",
        "description": "Order payment",
    },
]


# ---------------------------------------------------------------------------
# get_customer_profile tests
# ---------------------------------------------------------------------------

class TestGetCustomerProfile:
    """Tests for the get_customer_profile read tool."""

    @pytest.fixture(autouse=True)
    def mock_db(self, monkeypatch):
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(
            return_value=MagicMock(fetchone=MagicMock(return_value=MOCK_CUSTOMER_ROW))
        )
        monkeypatch.setattr(
            "src.tools.read_tools.get_db_session",
            MagicMock(return_value=MagicMock(
                __aenter__=AsyncMock(return_value=mock_session),
                __aexit__=AsyncMock(return_value=False),
            )),
        )

    @pytest.mark.asyncio
    async def test_returns_customer_data(self):
        from src.tools.read_tools import get_customer_profile
        result = await get_customer_profile(customer_id="customer-001")
        assert result["id"] == "customer-001"
        assert result["name"] == "Alice Johnson"
        assert result["tier"] == "premium"

    @pytest.mark.asyncio
    async def test_returns_none_for_missing_customer(self, monkeypatch):
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(
            return_value=MagicMock(fetchone=MagicMock(return_value=None))
        )
        monkeypatch.setattr(
            "src.tools.read_tools.get_db_session",
            MagicMock(return_value=MagicMock(
                __aenter__=AsyncMock(return_value=mock_session),
                __aexit__=AsyncMock(return_value=False),
            )),
        )
        from src.tools.read_tools import get_customer_profile
        result = await get_customer_profile(customer_id="nonexistent")
        assert result is None or result.get("error") is not None


# ---------------------------------------------------------------------------
# get_transactions + duplicate detection tests
# ---------------------------------------------------------------------------

class TestGetTransactions:
    """Tests for the get_transactions read tool and duplicate detection."""

    @pytest.fixture(autouse=True)
    def mock_db(self, monkeypatch):
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(
            return_value=MagicMock(fetchall=MagicMock(return_value=MOCK_TRANSACTION_ROWS))
        )
        monkeypatch.setattr(
            "src.tools.read_tools.get_db_session",
            MagicMock(return_value=MagicMock(
                __aenter__=AsyncMock(return_value=mock_session),
                __aexit__=AsyncMock(return_value=False),
            )),
        )

    @pytest.mark.asyncio
    async def test_returns_all_transactions(self):
        from src.tools.read_tools import get_transactions
        result = await get_transactions(customer_id="customer-001", order_id="ORD-1042")
        assert isinstance(result, dict)
        transactions = result.get("transactions", [])
        assert len(transactions) == 2

    @pytest.mark.asyncio
    async def test_detects_duplicate_charge(self):
        """Two charges on ORD-1042 within 5 minutes should be flagged as duplicate."""
        from src.tools.read_tools import get_transactions
        result = await get_transactions(customer_id="customer-001", order_id="ORD-1042")
        assert result.get("is_duplicate_detected") is True

    @pytest.mark.asyncio
    async def test_duplicate_amount_matches(self):
        """The reported duplicate amount should be 89.99 USD."""
        from src.tools.read_tools import get_transactions
        result = await get_transactions(customer_id="customer-001", order_id="ORD-1042")
        if result.get("is_duplicate_detected"):
            assert result.get("duplicate_amount") == pytest.approx(89.99, abs=0.01)


# ---------------------------------------------------------------------------
# check_refund_eligibility tests
# ---------------------------------------------------------------------------

class TestCheckRefundEligibility:
    """Tests for check_refund_eligibility tool."""

    @pytest.fixture(autouse=True)
    def mock_db(self, monkeypatch):
        mock_session = AsyncMock()
        # Return the delivered order
        mock_session.execute = AsyncMock(
            return_value=MagicMock(fetchone=MagicMock(return_value=MOCK_ORDER_ROW))
        )
        monkeypatch.setattr(
            "src.tools.read_tools.get_db_session",
            MagicMock(return_value=MagicMock(
                __aenter__=AsyncMock(return_value=mock_session),
                __aexit__=AsyncMock(return_value=False),
            )),
        )

    @pytest.mark.asyncio
    async def test_eligible_for_duplicate_charge(self):
        from src.tools.read_tools import check_refund_eligibility
        result = await check_refund_eligibility(
            customer_id="customer-001",
            order_id="ORD-1042",
            reason="duplicate_charge",
        )
        assert result.get("eligible") is True

    @pytest.mark.asyncio
    async def test_returns_eligibility_reason(self):
        from src.tools.read_tools import check_refund_eligibility
        result = await check_refund_eligibility(
            customer_id="customer-001",
            order_id="ORD-1042",
            reason="duplicate_charge",
        )
        assert "reason" in result or "message" in result


# ---------------------------------------------------------------------------
# search_policy_docs tests
# ---------------------------------------------------------------------------

class TestSearchPolicyDocs:
    """Tests for the search_policy_docs RAG tool."""

    @pytest.fixture(autouse=True)
    def mock_retriever(self, monkeypatch):
        mock_docs = [
            {
                "id": "doc-001",
                "content": "Duplicate charges are refunded within 3-5 business days.",
                "similarity_score": 0.94,
            },
            {
                "id": "doc-002",
                "content": "Refund requests must be submitted within 30 days of purchase.",
                "similarity_score": 0.87,
            },
        ]
        mock_retrieve = AsyncMock(return_value=mock_docs)
        monkeypatch.setattr("src.tools.read_tools.DocumentRetriever.retrieve", mock_retrieve)
        self.mock_retrieve = mock_retrieve

    @pytest.mark.asyncio
    async def test_returns_relevant_docs(self):
        from src.tools.read_tools import search_policy_docs
        result = await search_policy_docs(query="refund policy for duplicate charge")
        docs = result.get("documents", [])
        assert len(docs) > 0

    @pytest.mark.asyncio
    async def test_docs_sorted_by_score(self):
        from src.tools.read_tools import search_policy_docs
        result = await search_policy_docs(query="duplicate refund")
        docs = result.get("documents", [])
        if len(docs) > 1:
            scores = [d.get("similarity_score", 0) for d in docs]
            assert scores == sorted(scores, reverse=True)

    @pytest.mark.asyncio
    async def test_retriever_called_with_query(self):
        from src.tools.read_tools import search_policy_docs
        await search_policy_docs(query="return policy window")
        self.mock_retrieve.assert_called_once()
        call_args = str(self.mock_retrieve.call_args)
        assert "return policy" in call_args or "window" in call_args

    @pytest.mark.asyncio
    async def test_empty_results_handled(self, monkeypatch):
        monkeypatch.setattr(
            "src.tools.read_tools.DocumentRetriever.retrieve",
            AsyncMock(return_value=[]),
        )
        from src.tools.read_tools import search_policy_docs
        result = await search_policy_docs(query="something very obscure")
        assert isinstance(result, dict)
        docs = result.get("documents", [])
        assert docs == []
