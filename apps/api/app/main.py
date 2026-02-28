from __future__ import annotations

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request

from app.db import init_db
from app.routers import (
    history_router,
    intervention_router,
    score_router,
    stats_router,
    wins_router,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    api = FastAPI(title="noRot Scoring API", version="1.0.0", lifespan=lifespan)

    api.add_middleware(
        CORSMiddleware,
        allow_origins=["app://.", "null"],
        allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @api.middleware("http")
    async def request_logger(request: Request, call_next):  # type: ignore[no-redef]
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        print(f"{request.method} {request.url.path} {response.status_code} {duration_ms:.1f}ms")
        return response

    @api.get("/")
    async def root():
        return {"status": "ok", "service": "noRot Scoring API"}

    api.include_router(score_router)
    api.include_router(history_router)
    api.include_router(stats_router)
    api.include_router(wins_router)
    api.include_router(intervention_router)

    return api


app = create_app()

