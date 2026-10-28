"""Automated evaluation runner for the support agent against the golden dataset."""
from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from typing import Any, Dict, List

from src.agent.graph import run_support_agent
from src.observability.logging import configure_logging, get_logger

configure_logging("info")
logger = get_logger("eval_runner")


async def run_evaluation(dataset_path: str | None = None) -> Dict[str, Any]:
    """Runs all test scenarios in the golden dataset and computes performance benchmarks."""
    if dataset_path is None:
        dataset_path = os.path.join(os.path.dirname(__file__), "golden_dataset.json")

    with open(dataset_path, "r", encoding="utf-8") as f:
        cases = json.load(f)

    logger.info("Starting evaluation run", total_scenarios=len(cases))
    start_time = time.time()

    results: List[Dict[str, Any]] = []
    passed_count = 0

    for i, test_case in enumerate(cases):
        test_id = test_case["id"]
        name = test_case["name"]
        inp = test_case["input"]
        exp = test_case["expected"]

        thread_id = f"eval_{test_id}_{int(time.time())}"
        logger.info(f"[{i+1}/{len(cases)}] Running test: {name}", test_id=test_id)

        try:
            agent_output = await run_support_agent(
                thread_id=thread_id,
                customer_id=inp["customer_id"],
                message=inp["message"],
                context={"order_number": inp.get("order_number")},
            )

            # Evaluate criteria
            actual_intent = agent_output.get("intent")
            actual_status = agent_output.get("status")

            intent_match = actual_intent == exp.get("intent")
            status_match = actual_status == exp.get("status_at_halt")

            # Check if pending action matched
            pending_action_match = True
            if exp.get("requires_supervisor_approval"):
                pending_action = agent_output.get("pending_action", {})
                pending_action_match = (
                    pending_action.get("type") == "refund" and
                    float(pending_action.get("amount", 0.0)) == float(exp.get("refundable_amount", 0.0))
                )

            is_success = intent_match and status_match and pending_action_match
            if is_success:
                passed_count += 1

            results.append({
                "id": test_id,
                "name": name,
                "passed": is_success,
                "intent": {"expected": exp.get("intent"), "actual": actual_intent, "match": intent_match},
                "status": {"expected": exp.get("status_at_halt"), "actual": actual_status, "match": status_match},
                "approval_action_matched": pending_action_match,
                "response_sample": (agent_output.get("response") or "")[:120] + "...",
            })

        except Exception as e:
            logger.error("Error during evaluation scenario execution", test_id=test_id, error=str(e))
            results.append({
                "id": test_id,
                "name": name,
                "passed": False,
                "error": str(e),
            })

    total_time = round(time.time() - start_time, 2)
    accuracy_percent = round((passed_count / len(cases)) * 100, 1)

    summary = {
        "dataset": os.path.basename(dataset_path),
        "totalScenarios": len(cases),
        "passedScenarios": passed_count,
        "failedScenarios": len(cases) - passed_count,
        "accuracyPercent": accuracy_percent,
        "durationSeconds": total_time,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "results": results,
    }

    logger.info("Evaluation run finished", accuracy=f"{accuracy_percent}%", passed=f"{passed_count}/{len(cases)}")
    return summary


if __name__ == "__main__":
    summary = asyncio.run(run_evaluation())
    print("\n================== EVALUATION REPORT ==================")
    print(f"Accuracy: {summary['accuracyPercent']}% ({summary['passedScenarios']}/{summary['totalScenarios']} passed)")
    print(f"Duration: {summary['durationSeconds']}s")
    for r in summary["results"]:
        status_symbol = "✓" if r["passed"] else "✗"
        print(f"  [{status_symbol}] {r['id']}: {r['name']}")
    print("=======================================================")
