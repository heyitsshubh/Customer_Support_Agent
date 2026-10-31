"""Customer and order data acquisition node."""
from __future__ import annotations

from typing import Any, Dict
from src.agent.state import AgentState
from src.observability.logging import get_logger
from src.tools.read_tools import (
    get_customer_profile,
    get_order_status,
    get_transactions,
    check_refund_eligibility,
)

logger = get_logger("fetch_data_node")


async def fetch_customer_data_node(state: AgentState) -> Dict[str, Any]:
    """
    Fetches customer tier, order details, and transaction history using safe read tools.
    """
    customer_id = state.get("customer_id")
    order_number = state.get("order_number")
    intent = state.get("intent", "general")

    logger.info("Fetching customer and order records", customer_id=customer_id, order_number=order_number)

    customer_info = await get_customer_profile.ainvoke({"customer_id": customer_id})
    order_info: Dict[str, Any] = {}
    transaction_info: Dict[str, Any] = {}
    eligibility_info: Dict[str, Any] = {}

    if order_number:
        order_info = await get_order_status.ainvoke({"order_number": order_number})
        transaction_info = await get_transactions.ainvoke({"order_identifier": order_number})

        if intent == "billing_dispute":
            eligibility_info = await check_refund_eligibility.ainvoke({
                "order_number": order_number,
                "reason": "duplicate_charge",
            })

    consolidated_data = {
        "customer": customer_info,
        "order": order_info,
        "transactions": transaction_info,
        "eligibility": eligibility_info,
    }

    return {
        "customer_data": consolidated_data,
    }
