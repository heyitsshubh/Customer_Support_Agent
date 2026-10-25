"""Async Redis client wrapper for the AI-agent service.

Wraps ``redis.asyncio`` with a thin, typed façade that:

* Manages a single shared connection pool per process.
* Provides safe ``get`` / ``set`` / ``delete`` / ``exists`` / ``incr`` methods
  with built-in logging and error handling.
* Exposes a FastAPI dependency :func:`get_redis` and a standalone async
  context manager for use outside of FastAPI.

Usage in a FastAPI route::

    from fastapi import Depends
    from src.infrastructure.cache import RedisClient, get_redis

    @router.get("/cached")
    async def cached_endpoint(redis: RedisClient = Depends(get_redis)):
        cached = await redis.get("my-key")
        if cached is None:
            cached = expensive_computation()
            await redis.set("my-key", cached, ttl=300)
        return {"value": cached}

Usage as a context manager::

    from src.infrastructure.cache import RedisClient

    async with RedisClient.from_settings() as redis:
        await redis.set("hello", "world", ttl=60)
        value = await redis.get("hello")
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

import redis.asyncio as aioredis
from redis.asyncio import Redis
from redis.exceptions import RedisError

from src.config import Settings, get_settings

logger = logging.getLogger(__name__)


class RedisClient:
    """Async Redis client wrapper with typed helper methods.

    Args:
        redis: An open :class:`redis.asyncio.Redis` connection (or pool).

    Note:
        Prefer using :func:`get_redis` (FastAPI dependency) or the
        :meth:`from_settings` async context manager rather than instantiating
        this class directly.
    """

    def __init__(self, redis: Redis) -> None:  # type: ignore[type-arg]
        self._redis = redis

    # ------------------------------------------------------------------
    # Core operations
    # ------------------------------------------------------------------

    async def get(self, key: str) -> Optional[str]:
        """Retrieve the string value associated with *key*.

        Args:
            key: Redis key to look up.

        Returns:
            The decoded string value, or ``None`` if the key does not exist
            or has expired.

        Raises:
            RedisError: Propagated from the underlying client on connection
                failures.  Callers should catch this if they want to degrade
                gracefully.
        """
        try:
            value: Optional[bytes] = await self._redis.get(key)
            if value is None:
                logger.debug("Cache miss", extra={"key": key})
                return None
            decoded = value.decode("utf-8")
            logger.debug("Cache hit", extra={"key": key})
            return decoded
        except RedisError as exc:
            logger.error("Redis GET failed", extra={"key": key, "error": str(exc)})
            raise

    async def set(
        self,
        key: str,
        value: str,
        ttl: Optional[int] = None,
    ) -> bool:
        """Store *value* at *key* with an optional TTL.

        Args:
            key: Redis key.
            value: String value to store (serialisation is the caller's
                responsibility).
            ttl: Expiry in **seconds**.  When ``None`` the key persists until
                explicitly deleted.

        Returns:
            ``True`` if the key was set successfully.

        Raises:
            RedisError: On connection or write failure.
        """
        try:
            if ttl is not None:
                await self._redis.setex(key, ttl, value)
            else:
                await self._redis.set(key, value)
            logger.debug("Cache set", extra={"key": key, "ttl": ttl})
            return True
        except RedisError as exc:
            logger.error("Redis SET failed", extra={"key": key, "error": str(exc)})
            raise

    async def delete(self, *keys: str) -> int:
        """Delete one or more keys.

        Args:
            *keys: One or more Redis keys to remove.

        Returns:
            Number of keys that were actually deleted (existing keys only).

        Raises:
            RedisError: On connection failure.
        """
        try:
            count: int = await self._redis.delete(*keys)
            logger.debug("Cache delete", extra={"keys": keys, "deleted": count})
            return count
        except RedisError as exc:
            logger.error("Redis DELETE failed", extra={"keys": keys, "error": str(exc)})
            raise

    async def exists(self, *keys: str) -> int:
        """Check how many of the supplied *keys* currently exist.

        Args:
            *keys: Keys to check.

        Returns:
            The number of keys that exist (0 ≤ n ≤ len(keys)).

        Raises:
            RedisError: On connection failure.
        """
        try:
            count: int = await self._redis.exists(*keys)
            return count
        except RedisError as exc:
            logger.error("Redis EXISTS failed", extra={"keys": keys, "error": str(exc)})
            raise

    async def incr(self, key: str, amount: int = 1) -> int:
        """Atomically increment the integer value of *key* by *amount*.

        If the key does not exist it is initialised to ``0`` before
        incrementing (standard Redis behaviour).

        Args:
            key: Redis key whose value should be incremented.
            amount: Positive integer step size.  Defaults to ``1``.

        Returns:
            The new value after incrementing.

        Raises:
            RedisError: On connection or type-mismatch failure.
        """
        try:
            if amount == 1:
                new_value: int = await self._redis.incr(key)
            else:
                new_value = await self._redis.incrby(key, amount)
            logger.debug("Cache incr", extra={"key": key, "amount": amount, "new_value": new_value})
            return new_value
        except RedisError as exc:
            logger.error("Redis INCR failed", extra={"key": key, "error": str(exc)})
            raise

    async def ping(self) -> bool:
        """Send a PING command to verify the connection is alive.

        Returns:
            ``True`` if the server responded with PONG.
        """
        try:
            return await self._redis.ping()
        except RedisError:
            return False

    async def close(self) -> None:
        """Close the underlying Redis connection / pool."""
        await self._redis.aclose()
        logger.debug("Redis connection closed")

    # ------------------------------------------------------------------
    # Factory / context manager
    # ------------------------------------------------------------------

    @classmethod
    @asynccontextmanager
    async def from_settings(
        cls, settings: Optional[Settings] = None
    ) -> AsyncGenerator["RedisClient", None]:
        """Async context manager that creates and closes a :class:`RedisClient`.

        Args:
            settings: Application settings.  When ``None``, :func:`get_settings`
                is used.

        Yields:
            RedisClient: A connected client instance.

        Example::

            async with RedisClient.from_settings() as redis:
                await redis.set("key", "value", ttl=30)
        """
        cfg = settings or get_settings()
        r: Redis = aioredis.from_url(  # type: ignore[type-arg]
            cfg.REDIS_URL,
            encoding="utf-8",
            decode_responses=False,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
            health_check_interval=30,
        )
        client = cls(r)
        try:
            yield client
        finally:
            await client.close()


# ---------------------------------------------------------------------------
# Module-level connection pool (shared across requests in FastAPI)
# ---------------------------------------------------------------------------

_shared_redis: Optional[Redis] = None  # type: ignore[type-arg]


async def init_redis(settings: Optional[Settings] = None) -> None:
    """Create the module-level Redis connection pool.

    Call this once inside the FastAPI ``lifespan`` startup handler.

    Args:
        settings: Application settings.  Defaults to :func:`get_settings`.
    """
    global _shared_redis  # noqa: PLW0603
    cfg = settings or get_settings()
    _shared_redis = aioredis.from_url(
        cfg.REDIS_URL,
        encoding="utf-8",
        decode_responses=False,
        socket_connect_timeout=5,
        socket_timeout=5,
        retry_on_timeout=True,
        health_check_interval=30,
    )
    # Verify connectivity at startup
    try:
        await _shared_redis.ping()
        logger.info("Redis connection pool initialised", extra={"url": cfg.REDIS_URL})
    except RedisError as exc:
        logger.warning("Redis ping failed at startup – continuing anyway: %s", exc)


async def close_redis() -> None:
    """Close the module-level Redis connection pool.

    Call this inside the FastAPI ``lifespan`` shutdown handler.
    """
    global _shared_redis  # noqa: PLW0603
    if _shared_redis is not None:
        await _shared_redis.aclose()
        _shared_redis = None
        logger.info("Redis connection pool closed")


async def get_redis() -> AsyncGenerator[RedisClient, None]:
    """FastAPI dependency that yields a :class:`RedisClient` backed by the shared pool.

    Raises:
        RuntimeError: If :func:`init_redis` was not called before the first
            request arrives.

    Example::

        @router.get("/")
        async def root(redis: RedisClient = Depends(get_redis)):
            await redis.set("visited", "true", ttl=60)
    """
    if _shared_redis is None:
        raise RuntimeError(
            "Redis pool not initialised. Call init_redis() during application startup."
        )
    yield RedisClient(_shared_redis)


def get_redis_client() -> RedisClient:
    """Returns a RedisClient using the shared connection pool."""
    if _shared_redis is None:
        cfg = get_settings()
        r = aioredis.from_url(
            cfg.REDIS_URL,
            encoding="utf-8",
            decode_responses=False,
            socket_connect_timeout=5,
            socket_timeout=5,
        )
        return RedisClient(r)
    return RedisClient(_shared_redis)

