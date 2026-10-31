"""OpenTelemetry tracing configuration.

Sets up a ``TracerProvider`` with:

* A ``Resource`` tagged with ``service.name`` and ``service.version``.
* An ``OTLPSpanExporter`` (HTTP/protobuf) pointing at the configured collector.
* A ``BatchSpanProcessor`` for non-blocking span export.

Public API::

    from src.observability.tracing import configure_tracing, get_tracer

    configure_tracing(settings)
    tracer = get_tracer(__name__)

    with tracer.start_as_current_span("my-operation") as span:
        span.set_attribute("custom.key", "value")
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.semconv.resource import ResourceAttributes

if TYPE_CHECKING:
    from src.config import Settings

logger = logging.getLogger(__name__)

# Module-level sentinel so we don't configure more than once per process.
_configured: bool = False


def configure_tracing(settings: Settings) -> None:
    """Initialise and register the global :class:`TracerProvider`.

    This function is idempotent: subsequent calls within the same process are
    silently ignored.

    Args:
        settings: Application settings.  The following fields are consumed:

            * ``OTEL_SERVICE_NAME_AI`` – value for the ``service.name`` resource attribute.
            * ``OTEL_EXPORTER_OTLP_ENDPOINT`` – base URL of the OTLP HTTP collector,
              e.g. ``"http://otel-collector:4318"``.

    Side-effects:
        Calls :func:`opentelemetry.trace.set_tracer_provider` which replaces the
        global no-op provider.
    """
    global _configured  # noqa: PLW0603
    if _configured:
        logger.debug("OTEL tracing already configured – skipping")
        return

    resource = Resource.create(
        {
            ResourceAttributes.SERVICE_NAME: settings.OTEL_SERVICE_NAME_AI,
            ResourceAttributes.SERVICE_VERSION: "0.1.0",
            ResourceAttributes.DEPLOYMENT_ENVIRONMENT: "development",
        }
    )

    provider = TracerProvider(resource=resource)

    # Primary exporter: OTLP HTTP → collector
    otlp_endpoint = settings.OTEL_EXPORTER_OTLP_ENDPOINT.rstrip("/") + "/v1/traces"
    try:
        otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
        provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
        logger.info("OTLP span exporter configured", extra={"endpoint": otlp_endpoint})
    except Exception as exc:  # pragma: no cover – network not available in tests
        logger.warning(
            "Failed to configure OTLP exporter, falling back to console: %s", exc
        )
        provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))

    trace.set_tracer_provider(provider)
    _configured = True
    logger.info(
        "OpenTelemetry tracing configured",
        extra={
            "service_name": settings.OTEL_SERVICE_NAME_AI,
            "otlp_endpoint": otlp_endpoint,
        },
    )


def get_tracer(name: str, version: str = "0.1.0") -> trace.Tracer:
    """Return a named :class:`~opentelemetry.trace.Tracer` from the global provider.

    Args:
        name: Instrumentation scope name, typically ``__name__`` of the calling
            module (e.g. ``"src.agents.support_graph"``).
        version: Instrumentation library version string.

    Returns:
        :class:`opentelemetry.trace.Tracer` – the no-op tracer is returned when
        :func:`configure_tracing` has not been called yet, so callers don't need
        to guard against ``None``.

    Example::

        tracer = get_tracer(__name__)

        with tracer.start_as_current_span("rag-retrieval") as span:
            span.set_attribute("query.length", len(query))
            docs = vector_store.similarity_search(query)
    """
    return trace.get_tracer(name, version)


def shutdown_tracing() -> None:
    """Flush and shut down the global :class:`TracerProvider`.

    Should be called during application shutdown to ensure all buffered spans
    are exported before the process exits.
    """
    provider = trace.get_tracer_provider()
    if hasattr(provider, "shutdown"):
        provider.shutdown()  # type: ignore[union-attr]
        logger.info("OpenTelemetry TracerProvider shut down")
