"""Pydantic models mirroring packages/shared/src/types.ts."""

from typing import Literal, Optional

import re

from pydantic import BaseModel, ConfigDict, Field, field_validator


class FocusIntent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    label: str = Field(max_length=500)
    minutes_remaining: float = Field(alias="minutesRemaining")


class UsageSignals(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    session_minutes: float = Field(alias="sessionMinutes", ge=0)
    distracting_minutes: float = Field(alias="distractingMinutes", ge=0)
    productive_minutes: float = Field(alias="productiveMinutes", ge=0)
    app_switches_last_5_min: int = Field(alias="appSwitchesLast5Min", ge=0)
    idle_seconds_last_5_min: float = Field(alias="idleSecondsLast5Min", ge=0)
    time_of_day_local: str = Field(alias="timeOfDayLocal", max_length=10)  # "HH:MM"
    snoozes_last_60_min: int = Field(alias="snoozesLast60Min", ge=0)

    @field_validator("time_of_day_local")
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        if not re.match(r"^\d{1,2}:\d{2}$", v):
            raise ValueError("timeOfDayLocal must be in HH:MM format")
        hh, mm = v.split(":")
        if int(hh) > 23 or int(mm) > 59:
            raise ValueError("timeOfDayLocal has invalid hour or minute values")
        return v
    recent_distract_ratio: Optional[float] = Field(default=None, alias="recentDistractRatio", ge=0.0, le=1.0)
    focus_score: Optional[float] = Field(default=None, alias="focusScore", ge=0.0, le=100.0)


class UsageCategories(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    active_app: str = Field(alias="activeApp", max_length=500)
    active_category: Literal[
        "productive", "neutral", "social", "entertainment", "unknown"
    ] = Field(alias="activeCategory")
    active_domain: str | None = Field(default=None, alias="activeDomain", max_length=500)
    activity_label: str | None = Field(default=None, alias="activityLabel", max_length=500)
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
    context_todo: str | None = Field(default=None, alias="contextTodo", max_length=500)
    context_override: bool | None = Field(default=None, alias="contextOverride")


class UsageSnapshot(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    timestamp: str = Field(max_length=50)  # ISO 8601
    focus_intent: Optional[FocusIntent] = Field(default=None, alias="focusIntent")
    signals: UsageSignals
    categories: UsageCategories


class TTSSettings(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    model: str = Field(max_length=100)
    stability: float
    speed: float


class Recommendation(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    mode: Literal["none", "nudge", "remind", "interrupt", "crisis"]
    persona: Literal["calm_friend", "coach", "tough_love"]
    text: str = Field(max_length=2000)
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

    id: str = Field(max_length=100)
    timestamp: str = Field(max_length=50)
    score: float
    severity: int = Field(ge=0, le=4)
    persona: Literal["calm_friend", "coach", "tough_love"]
    text: str = Field(max_length=2000)
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
