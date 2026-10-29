"""FastAPI Application factory for the Python AI Microservice."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app

from src.config import get_settings
from src.observability.logging import configure_logging, get_logger
from src.observability.tracing import configure_tracing
from src.infrastructure.database import init_db, close_db
from src.infrastructure.cache import init_redis, close_redis
from src.api.middleware.auth import InternalAuthMiddleware
from src.api.routers.health import router as health_router
from src.api.routers.agent import router as agent_router

logger = get_logger("ai_service_app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manages application startup and shutdown lifecycles."""
    settings = get_settings()

    # 1. Observability setup
    configure_logging(settings.PYTHON_LOG_LEVEL)
    configure_tracing(settings)
    logger.info("Observability (logging, tracing) initialized")

    # 2. Database & Cache pools initialization
    try:
        await init_redis(settings)
        logger.info("Redis initialized successfully")
    except Exception as exc:
        logger.warning(f"Redis initialization warning (will retry on demand): {exc}")

    logger.info("AI Microservice started successfully", port=settings.PYTHON_PORT)

    yield

    # 3. Graceful shutdown
    logger.info("Shutting down AI Microservice...")
    await close_redis()
    await close_db()
    logger.info("AI Microservice shutdown complete")


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Customer Support AI Agent Microservice",
        version="1.0.0",
        description="LangGraph AI agent microservice with HITL controls and RAG",
        lifespan=lifespan,
    )

    # 1. CORS Middleware (Internal service communication)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 2. Internal Auth Middleware
    app.add_middleware(InternalAuthMiddleware)

    # 3. Mount Prometheus Metrics endpoint
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)

    # 4. Register Routers
    app.include_router(health_router)
    app.include_router(agent_router)

    # 5. Global Exception Handlers
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("unhandled_server_exception", error=str(exc), path=request.url.path)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred in AI service.",
                },
            },
        )

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "src.api.main:app",
        host="0.0.0.0",
        port=settings.PYTHON_PORT,
        reload=False,
    )
