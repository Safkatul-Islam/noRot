"""Persona-based intervention scripts.

Each persona has a line for every severity level (1-4).
Severity 0 means no intervention, so it's not included here.
"""

from typing import Literal

# Canonical source: packages/shared/src/constants.ts (INTERVENTION_SCRIPTS)
# Keep these in sync — the frontend imports from the shared package directly.
SCRIPTS: dict[str, dict[int, str]] = {
    "calm_friend": {
        1: "[thoughtful] Hey, I noticed you've been scrolling for a while. Maybe take a breath and refocus?",
        2: "[thoughtful] I notice you've drifted a bit. What was the next small step on your task?",
        3: "[concerned] It looks like you've been away from your work for a while. What's making it hard to start?",
        4: "[thoughtful] Hey... I know things feel heavy right now. It's okay to take a break. Want to talk about it?",
    },
    "coach": {
        1: "[thoughtful] Quick check-in \u2014 are you working on what you planned? Let's stay on track.",
        2: "[thoughtful] You've been switching a lot. What's the one thing you could do in the next five minutes?",
        3: "[concerned] I can see you're stuck. What's the smallest piece of your task you could tackle right now?",
        4: "[thoughtful] I see you're struggling. That's okay. Let's take this one step at a time.",
    },
    "tough_love": {
        1: "[thoughtful] BRUH. You're drifting. WHAT THE FUCK were you actually about to work on, lol?",
        2: "[thoughtful] You're distracted. CLOSE IT and pick ONE 5-minute step. What is it, bitch?",
        3: "[concerned] You've been procrastinating long enough. Start the task - ugly is fine. What's step one? GO.",
        4: "[thoughtful] Crisis mode. STOP. Breathe, stand up, drink water - then pick the smallest next move.",
    },
}

# Default TTS settings per persona.
#
# Note: the desktop client normalizes stability values > 1 to a 0-1 range
# (treating them like percentages), so returning 35 here means 0.35 in the
# ElevenLabs request.
DEFAULT_TTS: dict[str, dict] = {
    "calm_friend": {"model": "eleven_v3", "stability": 45, "speed": 1.0},
    "coach": {"model": "eleven_v3", "stability": 45, "speed": 1.0},
    "tough_love": {"model": "eleven_v3", "stability": 45, "speed": 1.0},
}

# Cooldown in seconds per severity level
COOLDOWNS: dict[int, int] = {
    0: 0,
    1: 300,  # 5 minutes
    2: 180,  # 3 minutes
    3: 180,  # 3 minutes
    4: 180,  # 3 minutes
}


def get_intervention_text(persona: str, severity: int) -> str:
    """Return the intervention script for a given persona and severity.

    If severity is 0 (focused), returns an empty string (no intervention).
    Falls back to calm_friend if persona is not recognized.
    """
    if severity == 0:
        return ""
    persona_scripts = SCRIPTS.get(persona, SCRIPTS["calm_friend"])
    return persona_scripts.get(severity, persona_scripts[1])


def get_tts_settings(persona: str, severity: int) -> dict:
    """Return TTS config dict for a persona and severity."""
    base = dict(DEFAULT_TTS.get(persona, DEFAULT_TTS["calm_friend"]))

    # Per-architecture: lower stability and slightly faster pace at severity 2-3.
    if severity in (2, 3):
        base["stability"] = 35
        base["speed"] = 1.08
    elif severity == 4:
        # Crisis tone: calmer and steadier
        base["stability"] = 55
        base["speed"] = 0.98

    return base


def get_cooldown(severity: int) -> int:
    """Return cooldown in seconds for a severity level."""
    return COOLDOWNS.get(severity, 300)
