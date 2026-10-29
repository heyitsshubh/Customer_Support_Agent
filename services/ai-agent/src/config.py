"""Application configuration using pydantic-settings.

This module provides a centralized, type-safe configuration object loaded from
environment variables and an optional .env file.  The ``get_settings`` helper
is cached via ``lru_cache`` so the file is parsed only once per process.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All runtime settings for the AI-agent service.

    Values are resolved in priority order:
    1. Actual environment variables
    2. ``.env`` file in the working directory
    3. Field default values declared below
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ------------------------------------------------------------------
    # OpenAI
    # ------------------------------------------------------------------
    OPENAI_API_KEY: str
    """Secret key for the OpenAI API.  Required – no default."""

    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    """Model used for generating text embeddings."""

    OPENAI_CHAT_MODEL: str = "gpt-4o-mini"
    """Chat-completion model used by the LangGraph agent."""

    # ------------------------------------------------------------------
    # Database (PostgreSQL + pgvector)
    # ------------------------------------------------------------------
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/support_agent"
    )
    """Async SQLAlchemy connection string.  Must use the ``asyncpg`` driver."""

    # ------------------------------------------------------------------
    # Redis
    # ------------------------------------------------------------------
    REDIS_URL: str = "redis://localhost:6379"
    """Connection URL for the Redis instance used for caching / rate-limiting."""

    # ------------------------------------------------------------------
    # Internal service-to-service auth
    # ------------------------------------------------------------------
    INTERNAL_SERVICE_TOKEN: str = "dev-internal-token"
    """Shared secret validated by :class:`~src.api.middleware.auth.InternalAuthMiddleware`.
    Override in production via the ``INTERNAL_SERVICE_TOKEN`` env var.
    """

    # ------------------------------------------------------------------
    # Server
    # ------------------------------------------------------------------
    PYTHON_PORT: int = 8001
    """TCP port the Uvicorn server will bind to."""

    PYTHON_LOG_LEVEL: str = "info"
    """Minimum log level forwarded to structlog (``debug`` | ``info`` | ``warning`` | ``error``)."""

    # ------------------------------------------------------------------
    # LangSmith / LangChain tracing
    # ------------------------------------------------------------------
    LANGCHAIN_TRACING_V2: bool = False
    """Enable LangSmith run tracing when ``True``."""

    LANGCHAIN_API_KEY: str = ""
    """LangSmith API key.  Required only when ``LANGCHAIN_TRACING_V2=True``."""

    LANGCHAIN_PROJECT: str = "customer-support-agent"
    """LangSmith project name traces are grouped under."""

    # ------------------------------------------------------------------
    # OpenTelemetry
    # ------------------------------------------------------------------
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://localhost:4318"
    """Base URL for the OTLP HTTP exporter (e.g. an OpenTelemetry Collector)."""

    OTEL_SERVICE_NAME_AI: str = "ai-agent"
    """``service.name`` resource attribute attached to every exported span."""


@lru_cache
def get_settings() -> Settings:
    """Return the singleton :class:`Settings` instance.

    The result is cached so that ``.env`` is read only once.  In test code
    you can clear the cache with ``get_settings.cache_clear()``.

    Returns:
        Settings: Fully-validated application settings.
    """
    return Settings()
