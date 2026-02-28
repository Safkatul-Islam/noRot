from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Severity = Literal[0, 1, 2, 3, 4]
PersonaId = Literal["calm_friend", "coach", "tough_love"]
RecommendationMode = Literal["none", "nudge", "remind", "interrupt", "crisis"]
ActiveCategory = Literal["productive", "neutral", "social", "entertainment", "unknown"]
InterventionUserResponse = Literal["pending", "snoozed", "dismissed", "working"]


class FocusIntent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    label: str
    minutes_remaining: int = Field(alias="minutesRemaining")


class UsageSignals(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    session_minutes: float = Field(alias="sessionMinutes")
    distracting_minutes: float = Field(alias="distractingMinutes")
    productive_minutes: float = Field(alias="productiveMinutes")
    app_switches_last5min: int = Field(alias="appSwitchesLast5Min")
    idle_seconds_last5min: int = Field(alias="idleSecondsLast5Min")
    time_of_day_local: int = Field(alias="timeOfDayLocal")
    snoozes_last60min: int = Field(alias="snoozesLast60Min")
    recent_distract_ratio: float | None = Field(default=None, alias="recentDistractRatio")
    focus_score: float | None = Field(default=None, alias="focusScore")


class UsageCategories(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    active_app: str = Field(alias="activeApp")
    active_category: ActiveCategory = Field(alias="activeCategory")
    active_domain: str | None = Field(default=None, alias="activeDomain")

    activity_label: str | None = Field(default=None, alias="activityLabel")
    activity_kind: str | None = Field(default=None, alias="activityKind")
    activity_confidence: float | None = Field(default=None, alias="activityConfidence")
    activity_source: str | None = Field(default=None, alias="activitySource")

    context_todo: str | None = Field(default=None, alias="contextTodo")
    context_override: str | None = Field(default=None, alias="contextOverride")


class UsageSnapshot(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    timestamp: int
    focus_intent: FocusIntent | None = Field(alias="focusIntent")
    signals: UsageSignals
    categories: UsageCategories


class TTSSettings(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    model: str
    stability: int
    speed: float


class Recommendation(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    mode: RecommendationMode
    persona: PersonaId
    text: str
    tts: TTSSettings
    cooldown_seconds: int = Field(alias="cooldownSeconds")


class ScoreResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    procrastination_score: float = Field(alias="procrastinationScore")
    severity: Severity
    reasons: list[str]
    recommendation: Recommendation


class InterventionEvent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    timestamp: int
    score: float
    severity: Severity
    persona: PersonaId
    text: str
    user_response: InterventionUserResponse = Field(alias="userResponse")
    audio_played: bool = Field(alias="audioPlayed")


class InterventionUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_response: InterventionUserResponse = Field(alias="userResponse")


class TodoItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    text: str
    done: bool
    order: int
    app: str | None = None
    url: str | None = None
    allowed_apps: list[str] | None = Field(default=None, alias="allowedApps")
    deadline: int | None = None
    start_time: int | None = Field(default=None, alias="startTime")
    duration_minutes: int | None = Field(default=None, alias="durationMinutes")


class ChatMessage(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    timestamp: int
    role: Literal["system", "user", "assistant"]
    content: str


class WinsData(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    refocus_count: int = Field(alias="refocusCount")
    total_focused_minutes: float = Field(alias="totalFocusedMinutes")


class HistoryEntry(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    timestamp: int
    score: float
    severity: Severity
    persona: PersonaId
    mode: RecommendationMode
    text: str


class AppStatEntry(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    app_name: str = Field(alias="appName")
    domain: str | None = None
    category: ActiveCategory
    count: int

