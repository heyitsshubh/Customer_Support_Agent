"""SQLAlchemy 2.x async database infrastructure.

Provides:

* ``async_engine`` – the shared :class:`~sqlalchemy.ext.asyncio.AsyncEngine`.
* ``AsyncSessionLocal`` – session factory bound to the engine.
* ``Base`` – declarative base class all ORM models should inherit from.
* :func:`get_db_session` – async context manager / FastAPI dependency that
  yields a session and handles commit / rollback automatically.
* :func:`init_db` – creates all tables on first startup (dev / test only;
  use Alembic migrations in production).
* :func:`close_db` – gracefully disposes the engine connection pool.

Usage in a FastAPI route::

    from fastapi import Depends
    from sqlalchemy.ext.asyncio import AsyncSession

    from src.infrastructure.database import get_db_session

    @router.get("/items/{item_id}")
    async def get_item(
        item_id: int,
        db: AsyncSession = Depends(get_db_session),
    ) -> dict:
        result = await db.execute(select(Item).where(Item.id == item_id))
        item = result.scalar_one_or_none()
        ...
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from src.config import get_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Engine & session factory
# ---------------------------------------------------------------------------

settings = get_settings()

async_engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,          # Set True to log all SQL (very noisy)
    pool_size=10,        # Number of persistent connections
    max_overflow=20,     # Temporary connections above pool_size
    pool_pre_ping=True,  # Validate connections before use (handles stale connections)
    pool_recycle=3600,   # Recycle connections every hour
    connect_args={
        # asyncpg-specific: increase statement timeout to 30 s
        "command_timeout": 30,
        "server_settings": {
            "application_name": settings.OTEL_SERVICE_NAME_AI,
        },
    },
)

AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Avoid implicit lazy loads after commit
    autocommit=False,
    autoflush=False,
)


# ---------------------------------------------------------------------------
# Declarative Base
# ---------------------------------------------------------------------------


class Base(DeclarativeBase):
    """Base class for all ORM models in the AI-agent service.

    Inheriting from this class registers the model with the shared
    ``MetaData`` instance, which is used by :func:`init_db` to create tables.
    """


# ---------------------------------------------------------------------------
# Session dependency / context manager
# ---------------------------------------------------------------------------


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Async context manager that yields a database session.

    Automatically commits on clean exit and rolls back on exception.  The
    session is always closed afterwards.

    Yields:
        AsyncSession: A live SQLAlchemy async session.

    Raises:
        Exception: Re-raises any exception after rolling back the session.

    Example::

        async with get_db_session() as db:
            db.add(MyModel(name="test"))
            # commit happens automatically on __aexit__
    """
    session: AsyncSession = AsyncSessionLocal()
    try:
        yield session
        await session.commit()
        logger.debug("DB session committed")
    except Exception:
        await session.rollback()
        logger.warning("DB session rolled back due to exception")
        raise
    finally:
        await session.close()


async def get_db_session_dependency() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency variant of :func:`get_db_session`.

    Use this with ``Depends()`` in route signatures::

        async def my_route(db: AsyncSession = Depends(get_db_session_dependency)):
            ...
    """
    async with get_db_session() as session:
        yield session


# ---------------------------------------------------------------------------
# Lifecycle helpers
# ---------------------------------------------------------------------------


async def init_db() -> None:
    """Create all tables defined on :class:`Base` if they do not exist.

    .. warning::
        This is intended for **development and testing only**.  In production
        environments use Alembic ``alembic upgrade head`` instead.

    Also ensures the ``vector`` extension (pgvector) is enabled in the current
    database.
    """
    async with async_engine.begin() as conn:
        # Enable pgvector extension (idempotent)
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        # Create tables
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Database initialised (tables created / verified)")


async def close_db() -> None:
    """Dispose the engine and close all pooled connections.

    Should be called during application shutdown to allow graceful drain.
    """
    await async_engine.dispose()
    logger.info("Database engine disposed")


async def check_db_health() -> bool:
    """Check database health by running a simple query."""
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.error(f"Database health check failed: {exc}")
        return False

