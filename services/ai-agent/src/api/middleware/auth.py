"""Internal service authentication middleware."""
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from src.config import get_settings
from src.observability.logging import get_logger

logger = get_logger("auth_middleware")


class InternalAuthMiddleware(BaseHTTPMiddleware):
    """
    Ensures that all incoming requests originate from internal trusted services
    by verifying the X-Internal-Token header against settings.INTERNAL_SERVICE_TOKEN.
    Health and metric endpoints are excluded.
    """

    EXCLUDED_PREFIXES = ("/health", "/metrics", "/docs", "/openapi.json")

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        path = request.url.path

        if any(path.startswith(prefix) for prefix in self.EXCLUDED_PREFIXES):
            return await call_next(request)

        token = request.headers.get("X-Internal-Token")
        settings = get_settings()

        if not token or token != settings.INTERNAL_SERVICE_TOKEN:
            logger.warn("unauthorized_internal_access", path=path, client=request.client.host if request.client else "unknown")
            return JSONResponse(
                status_code=403,
                content={
                    "success": False,
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "Invalid or missing internal service token",
                    },
                },
            )

        return await call_next(request)
