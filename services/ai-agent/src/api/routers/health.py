"""Health check endpoints for liveness and readiness."""
from datetime import datetime, timezone
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from src.infrastructure.database import check_db_health
from src.infrastructure.cache import get_redis_client

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", status_code=status.HTTP_200_OK)
async def liveness():
    """Liveness probe: verifies that the application is running."""
    return {
        "status": "ok",
        "service": "ai-agent",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/ready")
async def readiness():
    """Readiness probe: verifies connectivity to PostgreSQL and Redis."""
    db_ok = await check_db_health()
    redis_client = get_redis_client()
    redis_ok = await redis_client.ping()

    is_ready = db_ok and redis_ok

    payload = {
        "status": "ready" if is_ready else "unhealthy",
        "dependencies": {
            "database": "up" if db_ok else "down",
            "redis": "up" if redis_ok else "down",
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    status_code = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=status_code, content=payload)
