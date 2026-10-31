"""Registry mapping all available LangGraph agent tools."""
from typing import List
from langchain_core.tools import BaseTool

from src.tools.read_tools import (
    get_customer_profile,
    get_order_status,
    get_transactions,
    check_refund_eligibility,
    search_policy_docs,
)
from src.tools.write_tools import (
    request_refund,
    escalate_to_human,
    send_resolution_email,
)

# Safe, read-only tools that do not require human supervisor approval
READ_TOOLS: List[BaseTool] = [
    get_customer_profile,
    get_order_status,
    get_transactions,
    check_refund_eligibility,
    search_policy_docs,
]

# Sensitive write tools that affect financial balances or case statuses
WRITE_TOOLS: List[BaseTool] = [
    request_refund,
    escalate_to_human,
    send_resolution_email,
]

# Combined tool suite for the agent
ALL_TOOLS: List[BaseTool] = READ_TOOLS + WRITE_TOOLS


def get_all_tools() -> List[BaseTool]:
    """Returns all tools bound to the support agent."""
    return ALL_TOOLS
