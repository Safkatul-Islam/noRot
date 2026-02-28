from __future__ import annotations

from app.models import PersonaId, Severity, TTSSettings

INTERVENTION_SCRIPTS: dict[PersonaId, dict[Severity, str]] = {
    "calm_friend": {
        0: "You're focused — keep it up!",
        1: "[thoughtful] Quick check-in: you're drifting a bit. Want to refocus for 5 minutes?",
        2: "[thoughtful] You're getting pulled off-task. Close the distraction and do one small step.",
        3: "[concerned] You're procrastinating hard right now. Pause, breathe, and switch back to your task.",
        4: "[thoughtful] Crisis mode: stop scrolling. Open your task and start the first step—right now.",
    },
    "coach": {
        0: "Solid focus. Keep going.",
        1: "[thoughtful] Reset. Pick the next tiny action and start it now.",
        2: "[thoughtful] You're slipping into distraction. Set a 10-minute sprint and begin.",
        3: "[concerned] This is procrastination. Close the tab, open your work, and execute the first step.",
        4: "[thoughtful] Crisis: stop negotiating. Take immediate action—start the task for 2 minutes.",
    },
    "tough_love": {
        0: "Good. Stay locked in.",
        1: "[thoughtful] You're drifting. Cut it out and get back to work.",
        2: "[thoughtful] You're distracted. Stop the nonsense and do the task.",
        3: "[concerned] YOU'RE PROCRASTINATING. CLOSE IT. START WORKING. NOW.",
        4: "[thoughtful] CRISIS MODE. DROP THE DISTRACTION AND WORK—IMMEDIATELY.",
    },
}

DEFAULT_TTS_MODEL = "eleven_turbo_v2"


def get_script(persona: PersonaId, severity: Severity) -> str:
    return INTERVENTION_SCRIPTS[persona][severity]


def get_tts_settings(severity: Severity) -> TTSSettings:
    stability = 45
    speed = 1.0
    if severity in (2, 3):
        stability = 35
        speed = 1.08
    elif severity == 4:
        stability = 55
        speed = 0.98
    return TTSSettings(model=DEFAULT_TTS_MODEL, stability=stability, speed=speed)


def get_cooldown(severity: Severity) -> int:
    if severity == 0:
        return 0
    if severity == 1:
        return 300
    return 180

