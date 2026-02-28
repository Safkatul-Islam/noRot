import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .db import init_db
from .routers import score, history, stats, wins, intervention

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("norot.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the database when the app starts up."""
    init_db()
    logger.info("Database initialized")
    yield


app = FastAPI(title="noRot Scoring API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "app://.",
        "file://",
        "null",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(score.router)
app.include_router(history.router)
app.include_router(stats.router)
app.include_router(wins.router)
app.include_router(intervention.router)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info("%s %s %d (%.1fms)", request.method, request.url.path, response.status_code, duration_ms)
    return response


@app.get("/")
async def root():
    return {"status": "ok", "service": "noRot Scoring API"}
