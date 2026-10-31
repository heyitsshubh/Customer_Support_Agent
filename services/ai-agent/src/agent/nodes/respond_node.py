"""Response generation node composing customer-facing replies."""
from __future__ import annotations

from typing import Any, Dict
from langchain_core.messages import AIMessage

from src.agent.state import AgentState
from src.observability.logging import get_logger

logger = get_logger("respond_node")


async def compose_response_node(state: AgentState) -> Dict[str, Any]:
    """
    Synthesizes the final resolution message using policy context, customer tier,
    and action execution results.
    """
    intent = state.get("intent", "general")
    customer_data = state.get("customer_data", {})
    customer = customer_data.get("customer", {})
    order = customer_data.get("order", {})
    action_result = state.get("action_result")
    approval_status = state.get("approval_status")
    retrieved_docs = state.get("retrieved_docs", [])

    customer_name = customer.get("name", "there")
    response_text = ""

    # 1. Billing Dispute Resolution (Duplicate Charge scenario)
    if intent == "billing_dispute":
        if approval_status == "approved" and action_result and action_result.get("executed"):
            amount = action_result.get("amount", 49.99)
            order_num = state.get("order_number", "your order")
            response_text = (
                f"Hello {customer_name},\n\n"
                f"I have reviewed your billing details for order {order_num} and confirmed the duplicate charge. "
                f"Our supervisor has approved the refund, and a credit of ${amount:.2f} has been processed "
                f"back to your original payment method. Please allow 3 to 5 business days for the funds to reflect on your statement.\n\n"
                f"Is there anything else I can assist you with today?"
            )
        elif approval_status == "rejected":
            reason = action_result.get("reason", "Verification could not be confirmed.") if action_result else "Verification could not be completed."
            response_text = (
                f"Hello {customer_name},\n\n"
                f"Regarding your inquiry for order {state.get('order_number')}, our review team was unable to authorize "
                f"an automated refund at this time ({reason}). A senior billing specialist has been notified to look deeper into your account."
            )
        else:
            eligibility = customer_data.get("eligibility", {})
            if eligibility.get("eligible"):
                response_text = (
                    f"Hello {customer_name},\n\n"
                    f"We have identified the duplicate charge on order {state.get('order_number')}. "
                    f"Your refund request for ${eligibility.get('refundable_amount', 49.99):.2f} has been submitted "
                    f"to a supervisor for final sign-off. We will notify you as soon as it is approved."
                )
            else:
                response_text = (
                    f"Hello {customer_name},\n\n"
                    f"We reviewed the transactions on your account for order {state.get('order_number')}. "
                    f"Our records currently show only a single settled payment. If you have an additional receipt or bank statement, "
                    f"please share it with us and we will gladly re-investigate."
                )

    # 2. Order Status Resolution
    elif intent == "order_status":
        if order.get("found"):
            order_num = order.get("order_number")
            status = order.get("status")
            carrier = order.get("carrier", "standard carrier")
            tracking = order.get("tracking_number", "pending")
            response_text = (
                f"Hello {customer_name},\n\n"
                f"Your order {order_num} is currently **{status}** via {carrier} with tracking number `{tracking}`. "
                f"Items included in this shipment: {', '.join(i.get('name', 'item') for i in order.get('items', []))}."
            )
        else:
            response_text = (
                f"Hello {customer_name},\n\n"
                f"I was unable to locate order details for that reference number. "
                f"Could you please verify the order number (e.g. ORD-1042) so I can check its shipping status for you?"
            )

    # 3. Policy & SOP Question Resolution (RAG)
    elif intent == "policy_question":
        if retrieved_docs:
            policy_summary = "\n\n".join(
                f"**{d.get('title')}**:\n{d.get('content')}" for d in retrieved_docs[:2]
            )
            response_text = (
                f"Hello {customer_name},\n\n"
                f"Here are the details regarding our company policies:\n\n"
                f"{policy_summary}\n\n"
                f"Please let me know if you would like me to assist you with a return, replacement, or carrier claim!"
            )
        else:
            response_text = (
                f"Hello {customer_name},\n\n"
                f"We accept returns within 30 days of delivery for unused items in original packaging. "
                f"Refunds are processed back to the original payment method. How can I assist you with your order?"
            )

    # 4. General fallback
    else:
        response_text = (
            f"Hello {customer_name},\n\n"
            f"Thank you for contacting customer support. I am here to help you with order tracking, billing inquiries, "
            f"returns, or refunds. How may I assist you today?"
        )

    logger.info("Composed customer response", intent=intent, length=len(response_text))

    return {
        "final_response": response_text,
        "messages": [AIMessage(content=response_text)],
    }
