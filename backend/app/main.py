from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.v1.router import v1_router
from app.core.exceptions import register_exception_handlers
from app.observability.metrics import metrics_app
from app.observability.tracing import setup_tracing


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up PII engine (loads spaCy en_core_web_sm once at startup)
    from app.services.pii import get_pii_engines
    get_pii_engines()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins.split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    setup_tracing(app)

    app.include_router(v1_router, prefix="/v1")
    app.mount("/metrics", metrics_app)

    register_exception_handlers(app)

    return app


app = create_app()
