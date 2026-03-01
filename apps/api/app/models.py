"""Pydantic models mirroring packages/shared/src/types.ts."""

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class FocusIntent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    label: str
    minutes_remaining: float = Field(alias="minutesRemaining")


class UsageSignals(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    session_minutes: float = Field(alias="sessionMinutes")
    distracting_minutes: float = Field(alias="distractingMinutes")
    productive_minutes: float = Field(alias="productiveMinutes")
    app_switches_last_5_min: int = Field(alias="appSwitchesLast5Min")
    idle_seconds_last_5_min: float = Field(alias="idleSecondsLast5Min")
    time_of_day_local: str = Field(alias="timeOfDayLocal")  # "HH:MM"
    snoozes_last_60_min: int = Field(alias="snoozesLast60Min")
    recent_distract_ratio: Optional[float] = Field(default=None, alias="recentDistractRatio")


class UsageCategories(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    active_app: str = Field(alias="activeApp")
    active_category: Literal[
        "productive", "neutral", "social", "entertainment", "unknown"
    ] = Field(alias="activeCategory")
    active_domain: str | None = Field(default=None, alias="activeDomain")
    activity_label: str | None = Field(default=None, alias="activityLabel")
    activity_kind: Literal[
        "unknown",
        "coding",
        "spreadsheets",
        "presentations",
        "writing",
        "docs",
        "email",
        "chat",
        "video",
        "social_feed",
        "shopping",
        "games",
        "settings",
        "file_manager",
    ] | None = Field(default=None, alias="activityKind")
    activity_confidence: float | None = Field(default=None, alias="activityConfidence")
    activity_source: Literal["rules", "vision"] | None = Field(default=None, alias="activitySource")
    context_todo: str | None = Field(default=None, alias="contextTodo")
    context_override: bool | None = Field(default=None, alias="contextOverride")


class UsageSnapshot(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    timestamp: str  # ISO 8601
    focus_intent: Optional[FocusIntent] = Field(default=None, alias="focusIntent")
    signals: UsageSignals
    categories: UsageCategories


class TTSSettings(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    model: str
    stability: float
    speed: float


class Recommendation(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    mode: Literal["none", "nudge", "remind", "interrupt", "crisis"]
    persona: Literal["calm_friend", "coach", "tough_love"]
    text: str
    tts: TTSSettings
    cooldown_seconds: int = Field(alias="cooldownSeconds")


class ScoreResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    procrastination_score: float = Field(alias="procrastinationScore")
    severity: int = Field(ge=0, le=4)
    reasons: list[str]
    recommendation: Recommendation


class InterventionEvent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    timestamp: str
    score: float
    severity: int = Field(ge=0, le=4)
    persona: Literal["calm_friend", "coach", "tough_love"]
    text: str
    user_response: Literal["snoozed", "dismissed", "working", "pending"] = Field(
        alias="userResponse"
    )
    audio_played: bool = Field(alias="audioPlayed")


class WinsData(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    refocus_count: int = Field(alias="refocusCount")
    total_focused_minutes: int = Field(alias="totalFocusedMinutes")


class HistoryEntry(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    timestamp: str
    procrastination_score: float = Field(alias="procrastinationScore")
    severity: int
    persona: str
    mode: str
    text: str
