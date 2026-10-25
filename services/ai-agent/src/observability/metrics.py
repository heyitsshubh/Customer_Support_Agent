"""Prometheus metrics registry for the AI-agent service.

All application metrics are centralised in :class:`MetricsRegistry` so that
instruments are created once and reused everywhere.  The registry exposes a
singleton via :func:`get_metrics_registry`.

Usage::

    from src.observability.metrics import get_metrics_registry

    metrics = get_metrics_registry()

    with metrics.agent_run_duration_seconds.labels(
        status="success", intent="billing_inquiry"
    ).time():
        result = await run_agent(...)

    metrics.llm_tokens_used_total.labels(
        model="gpt-4o-mini", token_type="completion"
    ).inc(response.usage.completion_tokens)
"""

from __future__ import annotations

import threading

from prometheus_client import REGISTRY, Counter, Histogram, Info


# ---------------------------------------------------------------------------
# Bucket definitions
# ---------------------------------------------------------------------------

_LATENCY_BUCKETS = (
    0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0
)

_RAG_BUCKETS = (
    0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0
)


class MetricsRegistry:
    """Container for all Prometheus instruments used by the AI-agent service.

    Instruments are registered with the default Prometheus ``REGISTRY`` on
    instantiation.  Do **not** instantiate this class directly; use
    :func:`get_metrics_registry` instead.

    Attributes:
        agent_run_duration_seconds: Histogram tracking end-to-end agent graph
            execution time.  Labels: ``status`` (``success`` | ``error``),
            ``intent`` (detected customer intent or ``unknown``).

        agent_tool_calls_total: Counter incremented once per tool invocation
            inside the LangGraph agent.  Labels: ``tool_name``, ``status``
            (``success`` | ``error``).

        rag_retrieval_duration_seconds: Histogram for vector-store similarity
            search latency.  Labels: ``collection``.

        llm_tokens_used_total: Counter for OpenAI token consumption.  Labels:
            ``model``, ``token_type`` (``prompt`` | ``completion`` | ``total``).

        http_requests_total: Counter for inbound HTTP requests handled by the
            FastAPI app.  Labels: ``method``, ``path``, ``status_code``.

        http_request_duration_seconds: Histogram for inbound HTTP request
            latency.  Labels: ``method``, ``path``.

        service_info: Static ``Info`` gauge exposing build metadata.
    """

    def __init__(self) -> None:
        self.agent_run_duration_seconds = Histogram(
            name="agent_run_duration_seconds",
            documentation=(
                "End-to-end latency (seconds) of a full LangGraph agent run."
            ),
            labelnames=["status", "intent"],
            buckets=_LATENCY_BUCKETS,
        )

        self.agent_tool_calls_total = Counter(
            name="agent_tool_calls_total",
            documentation="Total number of tool invocations made by the agent.",
            labelnames=["tool_name", "status"],
        )

        self.rag_retrieval_duration_seconds = Histogram(
            name="rag_retrieval_duration_seconds",
            documentation=(
                "Latency (seconds) of pgvector similarity-search queries."
            ),
            labelnames=["collection"],
            buckets=_RAG_BUCKETS,
        )

        self.llm_tokens_used_total = Counter(
            name="llm_tokens_used_total",
            documentation="Cumulative OpenAI token usage.",
            labelnames=["model", "token_type"],
        )

        self.http_requests_total = Counter(
            name="ai_agent_http_requests_total",
            documentation="Total inbound HTTP requests processed by the AI-agent API.",
            labelnames=["method", "path", "status_code"],
        )

        self.http_request_duration_seconds = Histogram(
            name="ai_agent_http_request_duration_seconds",
            documentation="Inbound HTTP request latency in seconds.",
            labelnames=["method", "path"],
            buckets=_LATENCY_BUCKETS,
        )

        self.service_info = Info(
            name="ai_agent_service",
            documentation="Static metadata about the running AI-agent service.",
        )
        self.service_info.info(
            {
                "version": "0.1.0",
                "service": "ai-agent",
                "framework": "fastapi+langgraph",
            }
        )


# ---------------------------------------------------------------------------
# Singleton accessor
# ---------------------------------------------------------------------------

_lock = threading.Lock()
_registry_instance: MetricsRegistry | None = None


def get_metrics_registry() -> MetricsRegistry:
    """Return the process-wide singleton :class:`MetricsRegistry`.

    Thread-safe.  The registry is created on the first call and reused
    thereafter.  In test suites that unregister collectors between tests you
    can reset this via ``src.observability.metrics._registry_instance = None``.

    Returns:
        MetricsRegistry: The singleton metrics registry.
    """
    global _registry_instance  # noqa: PLW0603
    if _registry_instance is None:
        with _lock:
            if _registry_instance is None:
                _registry_instance = MetricsRegistry()
    return _registry_instance
