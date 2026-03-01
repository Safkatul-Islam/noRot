from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import init_db
from .routers import score, history, stats, wins, intervention


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the database when the app starts up."""
    init_db()
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


@app.get("/")
async def root():
    return {"status": "ok", "service": "noRot Scoring API"}
