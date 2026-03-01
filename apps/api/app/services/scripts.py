from __future__ import annotations

import random
from typing import Optional

from app.models import PersonaId, Severity, TTSSettings

# ---------------------------------------------------------------------------
# Variant-based intervention templates
#
# Each persona × severity has multiple templates. Templates for severities 1-3
# accept a {target} placeholder (e.g. "scrolling Instagram", "browsing Reddit")
# which is interpolated when context is available; severity 0 and 4 are
# context-independent.
#
# This mirrors the desktop's intervention-text.ts system so the API can serve
# varied, context-aware scripts standalone.
# ---------------------------------------------------------------------------

_VARIANTS: dict[PersonaId, dict[Severity, list[str]]] = {
    "calm_friend": {
        0: [
            "You're focused — keep it up!",
            "Solid focus right now. Nice work.",
            "You're in the zone. Keep going!",
            "Great flow — stay with it.",
            "Look at you go. Keep that focus.",
        ],
        1: [
            "Quick check-in: looks like you've been {target} for a bit. Want to refocus?",
            "No judgment — you're {target}. What's one tiny next step you can do right now?",
            "I see you're {target}. Can we gently steer back to your task?",
            "Small nudge: you're {target}. Can you do 60 seconds of the real task first?",
            "Hey — you've been {target}. What would 'back on track' look like?",
        ],
        2: [
            "I notice you've been {target} for a while. What's the next small step on your task?",
            "You're getting pulled into {target}. Can you name the task you meant to do?",
            "Pause. You're {target}. What's the smallest action that moves you forward?",
            "Looks like {target} is winning right now. Want to pick one 5-minute step?",
            "Gentle redirect: you're {target}. Can you open the file or tab you actually need?",
        ],
        3: [
            "You've been {target} for a bit now. What's making it hard to start your task?",
            "We're stuck in {target}. What's the scariest part of starting?",
            "You're {target} instead of working. Can we pick the tiniest first step together?",
            "You're deep in {target}. What's one 'minimum effort' version of your task you can do?",
            "Let's interrupt the loop: you're {target}. What's the next step you'd tell a friend to do?",
        ],
        4: [
            "Hey. I can see things feel heavy right now. Can we do one tiny grounding step together?",
            "Breathe. If this feels like too much, what's the gentlest next step you can take?",
            "This looks like a rough moment. Do you need a break, or a smaller version of the task?",
            "It's okay to be overwhelmed. What's one thing you can do in the next 30 seconds?",
            "You don't have to fix everything. What's one tiny action that helps Future You?",
        ],
    },
    "coach": {
        0: [
            "Solid focus. Keep going.",
            "Locked in. Maintain the pace.",
            "Good discipline. Stay on it.",
            "Focused and executing. Nice.",
            "Momentum looks strong. Keep it.",
        ],
        1: [
            "Check-in: you're {target}. Reset your posture and pick the next action.",
            "Heads up — you're {target}. What's the goal for the next 5 minutes?",
            "You're {target}. Tighten the loop: one task, one step, go.",
            "Drift detected: you're {target}. What's the very next move on your plan?",
            "You're {target}. Start a 2-minute sprint and prove you can begin.",
        ],
        2: [
            "You've been {target} a while. What's one thing you can finish in 5 minutes?",
            "Focus up: you're {target}. Name the task and do the first step.",
            "You're {target}. Cut it down: what's the smallest deliverable you can ship today?",
            "You're stuck in {target}. What would 'progress' look like in one action?",
            "You're {target}. Set a timer for 10 minutes and start the hardest 30 seconds.",
        ],
        3: [
            "You've been {target} instead of working. What's the smallest piece you can tackle?",
            "Enough. You're {target}. Pick one step and start it in the next 10 seconds.",
            "You're {target}. What are you avoiding — confusion, boredom, or fear of messing up?",
            "You're deep in {target}. Drop the standard: do the 'ugly first draft' version.",
            "You're {target}. Reset your environment: close the noise, open the work, start.",
        ],
        4: [
            "You're in a rough patch. Do a 60-second reset: stand up, drink water, breathe.",
            "Stop the spiral. Pick the smallest possible action and do it slowly.",
            "This is crisis mode. Lower the bar and make a tiny plan for the next 2 minutes.",
            "Breathe. You don't need motivation — you need a first step. What is it?",
            "Crisis means simplify. One task. One step. Then reassess.",
        ],
    },
    "tough_love": {
        0: [
            "Good. Stay locked in.",
            "SOLID. Don't let up now.",
            "Actually focused? Respect. Keep it.",
            "LOCKED IN. That's the energy.",
            "Good. Now keep that same energy.",
        ],
        1: [
            "BRUH. You're {target}. WHAT THE FUCK were you actually about to work on?",
            "You're {target}. Quick reality check: is this the plan, or is your brain freelancing again?",
            "You're {target}. Stop the squirrel mode and name ONE thing you're supposed to do.",
            "You're {target}. That's not 'research.' That's procrastination with extra steps. What's next?",
            "You're {target}. I'm not mad — I'm disappointed. Kidding. I'm mad. What's the task?",
        ],
        2: [
            "You've been {target} for a while. Boredom, fear, or just a stupid habit?",
            "Still {target}? Cool. Pick ONE 5-minute step and do it. No more messing around.",
            "You're {target}. CLOSE IT and open the work. What's the next tiny deliverable?",
            "You're {target}. If you keep this up, Future You is gonna be pissed. Step one?",
            "You're {target}. That dopamine snack isn't free — it costs your day. What's the fix?",
        ],
        3: [
            "You've been {target} long enough. ENOUGH. What's the tiniest thing you can finish right now?",
            "You're {target}. I'm done being polite. Start the task — ugly, messy, whatever. Step one?",
            "Still {target}? What are you avoiding: failure, boredom, or not knowing where to start?",
            "You're {target}. Stop 'preparing' and do the damn thing. First action. GO.",
            "You're {target}. Your brain is lying to you. You can start badly. What's step one?",
        ],
        4: [
            "Crisis mode. Stop torturing yourself. Stand up, water, breathe — then one micro-step.",
            "Your brain is on fire. Lower the bar to 'tiny' and do one micro-step right now.",
            "This is a spiral. No more doom vibes. What's one action that makes the mess 1% smaller?",
            "You're overwhelmed, not lazy. But we're not surrendering. What's the smallest next move?",
            "No more punishment scrolling. Two minutes of real progress. What are you starting?",
        ],
    },
}

# Track last-used variant index per persona+severity to avoid repeats.
_last_variant: dict[str, int] = {}

DEFAULT_TTS_MODEL = "eleven_turbo_v2"


def _pick_variant(variants: list[str], key: str) -> str:
    """Pick a random variant, avoiding the most recently used one for this key."""
    if len(variants) == 1:
        return variants[0]
    prev = _last_variant.get(key)
    idx = random.randrange(len(variants))
    if prev is not None and idx == prev:
        idx = (idx + 1) % len(variants)
    _last_variant[key] = idx
    return variants[idx]


def get_script(persona: PersonaId, severity: Severity) -> str:
    """Return a varied intervention script (no context injection)."""
    key = f"{persona}:{severity}"
    variants = _VARIANTS[persona][severity]
    text = _pick_variant(variants, key)
    return text.replace("{target}", "off task")


def get_script_with_context(
    persona: PersonaId,
    severity: Severity,
    active_app: Optional[str] = None,
    active_domain: Optional[str] = None,
) -> str:
    """Return a varied intervention script with context interpolated."""
    key = f"{persona}:{severity}"
    variants = _VARIANTS[persona][severity]
    text = _pick_variant(variants, key)

    # Build a human-readable target string from context.
    target = None
    if active_domain:
        d = active_domain.strip().removeprefix("www.")
        if "instagram.com" in d:
            target = "scrolling Instagram"
        elif "tiktok.com" in d:
            target = "scrolling TikTok"
        elif "youtube.com" in d or "youtu.be" in d:
            target = "watching YouTube"
        elif "reddit.com" in d:
            target = "browsing Reddit"
        elif d == "x.com" or "twitter.com" in d:
            target = "browsing X"
        else:
            target = f"browsing {d}"
    elif active_app and active_app.strip() and active_app != "Unknown":
        target = f"using {active_app.strip()}"

    return text.replace("{target}", target or "off task")


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
