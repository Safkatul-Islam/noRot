from app.routers.history import router as history_router
from app.routers.intervention import router as intervention_router
from app.routers.score import router as score_router
from app.routers.stats import router as stats_router
from app.routers.wins import router as wins_router

__all__ = [
    "history_router",
    "intervention_router",
    "score_router",
    "stats_router",
    "wins_router",
]

