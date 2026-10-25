"""Structured logging configuration via structlog.

This module provides two public helpers:

* :func:`configure_logging` – call once at application startup to wire up
  structlog with JSON output, stdlib integration, and the desired log level.
* :func:`get_logger` – thin wrapper around ``structlog.get_logger`` that
  attaches a ``logger_name`` context variable for easier log correlation.

Example::

    from src.observability.logging import configure_logging, get_logger

    configure_logging("info")
    log = get_logger(__name__)
    log.info("server started", port=8001)
"""

from __future__ import annotations

import logging
import sys
from typing import Any

import structlog
from structlog.types import EventDict, WrappedLogger


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _add_open_telemetry_span(
    logger: WrappedLogger,  # noqa: ARG001
    method_name: str,  # noqa: ARG001
    event_dict: EventDict,
) -> EventDict:
    """Inject the current OpenTelemetry trace/span IDs into the log record.

    This processor is a no-op when no span is active so it is safe to include
    unconditionally even before OTEL is fully configured.
    """
    try:
        from opentelemetry import trace  # type: ignore[import]

        span = trace.get_current_span()
        ctx = span.get_span_context()
        if ctx.is_valid:
            event_dict["trace_id"] = format(ctx.trace_id, "032x")
            event_dict["span_id"] = format(ctx.span_id, "016x")
    except ImportError:
        pass
    return event_dict


def _drop_color_message_key(
    logger: WrappedLogger,  # noqa: ARG001
    method_name: str,  # noqa: ARG001
    event_dict: EventDict,
) -> EventDict:
    """Remove the ``color_message`` key injected by Uvicorn's access logger."""
    event_dict.pop("color_message", None)
    return event_dict


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def configure_logging(log_level: str = "info") -> None:
    """Configure structlog and the stdlib ``logging`` root logger.

    Must be called **once** before any loggers are used.  Subsequent calls are
    idempotent (structlog is reconfigured but that is safe).

    Args:
        log_level: Case-insensitive log level string, e.g. ``"debug"``,
            ``"info"``, ``"warning"``, ``"error"``.  Defaults to ``"info"``.

    Note:
        When running under a TTY (local development) the renderer falls back
        to :class:`structlog.dev.ConsoleRenderer` for human-readable output.
        In production (non-TTY) JSON is emitted instead.
    """
    level: int = getattr(logging, log_level.upper(), logging.INFO)

    # Shared processors applied before the final renderer
    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        _drop_color_message_key,
        _add_open_telemetry_span,
        structlog.processors.format_exc_info,
    ]

    # Choose renderer based on whether we're attached to a terminal
    is_tty = sys.stderr.isatty()
    if is_tty:
        renderer: Any = structlog.dev.ConsoleRenderer()
    else:
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=shared_processors
        + [
            # Adapt structlog events for stdlib ``logging`` handlers
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        # These run only inside the stdlib formatter (after wrap_for_formatter)
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
        foreign_pre_chain=shared_processors,
    )

    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(level)

    # Quieten noisy third-party loggers
    for noisy in ("uvicorn.access", "sqlalchemy.engine", "httpx"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str | None = None, **initial_values: Any) -> structlog.stdlib.BoundLogger:
    """Return a bound structlog logger with an optional ``logger_name`` key.

    Args:
        name: Typically ``__name__`` of the calling module.  Stored as
            ``logger_name`` in every log record emitted by the returned logger.
        **initial_values: Additional context key-value pairs bound to the
            logger at creation time.

    Returns:
        A :class:`structlog.stdlib.BoundLogger` instance.

    Example::

        log = get_logger(__name__, component="rag-pipeline")
        log.info("retrieval complete", num_docs=5)
    """
    bound: structlog.stdlib.BoundLogger = structlog.get_logger(name, **initial_values)
    if name:
        bound = bound.bind(logger_name=name)
    return bound
