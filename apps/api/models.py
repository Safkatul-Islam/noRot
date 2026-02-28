from pydantic import BaseModel


class ActivityEntry(BaseModel):
    timestamp: int
    app: str
    title: str
    category: str
    duration: int


class ScoreRequest(BaseModel):
    activities: list[ActivityEntry]
    snooze_count: int = 0


class ScoreResponse(BaseModel):
    score: int
    severity: str
    distraction_ratio: float
    switch_rate: float
    snooze_pressure: float
    top_distraction: str | None
    minutes_monitored: float


class InterventionRequest(BaseModel):
    score: int
    severity: str
    persona: str
    top_distraction: str | None
    recent_apps: list[str]
    todos: list[str]
    distraction_ratio: float


class InterventionResponse(BaseModel):
    script: str
    persona: str
    severity: str


class WinCreate(BaseModel):
    description: str
    score: int
    type: str


class WinResponse(BaseModel):
    id: int
    timestamp: int
    description: str
    score: int
    type: str


class HistoryEntry(BaseModel):
    timestamp: int
    app: str
    title: str
    category: str
    duration: int
