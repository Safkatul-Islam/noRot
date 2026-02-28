import os
import google.generativeai as genai
from models import InterventionRequest

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

PERSONA_STYLES = {
    "drill_sergeant": (
        "You are an aggressive, no-nonsense military drill sergeant. "
        "Use commanding language, military metaphors, and direct orders. "
        "Yell at the user (use caps occasionally). Be harsh but motivating. "
        "Example tone: 'SOLDIER! You call that productivity?! Drop and give me 20 minutes of REAL work!'"
    ),
    "disappointed_parent": (
        "You are a disappointed parent who expected better from their child. "
        "Use guilt-tripping language, sighs, and emotional manipulation (lovingly). "
        "Reference how hard you worked to give them opportunities. "
        "Example tone: 'I'm not angry... I'm just disappointed. I raised you better than this.'"
    ),
    "chill_friend": (
        "You are a casual, supportive best friend. "
        "Use relaxed language, slang, and genuine encouragement. "
        "Be understanding but still nudge them to do better. "
        "Example tone: 'Hey dude, no judgment, but you've been scrolling for a while. Wanna maybe knock out that task real quick?'"
    ),
    "anime_rival": (
        "You are a dramatic anime rival character. "
        "Use over-the-top dramatic language, reference getting stronger, "
        "talk about surpassing limits and ultimate power. Be competitive. "
        "Example tone: 'Hmph! Is this the extent of your power?! I expected more from my rival! Show me your TRUE productivity!'"
    ),
    "therapist": (
        "You are a calm, reflective therapist. "
        "Use gentle language, ask thoughtful questions, and guide self-reflection. "
        "Help them understand why they're procrastinating without judgment. "
        "Example tone: 'I notice you've been avoiding your tasks. What do you think is driving that avoidance? Let's explore this together.'"
    ),
}

FALLBACK_SCRIPTS = {
    "drill_sergeant": (
        "ATTENTION! You've been wasting time on {top_distraction}! "
        "Your distraction ratio is at {distraction_ratio:.0%}! That is UNACCEPTABLE, soldier! "
        "Close that app RIGHT NOW and get back to work! That's an ORDER!"
    ),
    "disappointed_parent": (
        "Oh sweetie... I just checked in and saw you've been on {top_distraction} again. "
        "Your focus score is only {score}. I just... I thought we talked about this. "
        "I'm not mad, I'm just... *sigh*... disappointed. Please, do better. For me?"
    ),
    "chill_friend": (
        "Hey, no stress, but you've been vibing on {top_distraction} for a bit too long. "
        "Score's sitting at {score} right now. How about we take a quick breather and then "
        "knock something out? You got this, fr."
    ),
    "anime_rival": (
        "Tch! Pathetic! You dare call yourself my rival while wasting time on {top_distraction}?! "
        "A score of {score}?! I surpassed that level AGES ago! "
        "Rise up and show me the warrior I know you can be! THIS ISN'T EVEN YOUR FINAL FORM!"
    ),
    "therapist": (
        "I notice you've spent some time on {top_distraction}. Your current score is {score}. "
        "That's okay -- there's no judgment here. But I'd like you to pause and ask yourself: "
        "what is it you're avoiding right now? Sometimes naming it takes away its power."
    ),
}


def generate_intervention_script(request: InterventionRequest) -> str:
    """Generate an intervention script using Gemini AI, with fallback to templates."""
    persona = request.persona if request.persona in PERSONA_STYLES else "chill_friend"

    # Try Gemini first
    if GEMINI_API_KEY:
        try:
            return _call_gemini(request, persona)
        except Exception:
            pass

    # Fallback to template scripts
    return _fallback_script(request, persona)


def _call_gemini(request: InterventionRequest, persona: str) -> str:
    """Call Gemini API to generate an intervention script."""
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")

    persona_instruction = PERSONA_STYLES[persona]

    todos_text = ", ".join(request.todos) if request.todos else "no specific todos listed"
    recent_apps_text = ", ".join(request.recent_apps) if request.recent_apps else "unknown apps"

    prompt = f"""{persona_instruction}

You are an AI intervention character in a procrastination-monitoring app called "noRot".
The user has been procrastinating and you need to deliver a short, punchy intervention script
(2-4 sentences max) that matches your persona.

Here is the user's current situation:
- Productivity score: {request.score}/100 (lower = worse)
- Severity level: {request.severity}
- Distraction ratio: {request.distraction_ratio:.0%}
- Top distraction app: {request.top_distraction or "unknown"}
- Recent apps used: {recent_apps_text}
- Their current todos: {todos_text}

Generate ONLY the intervention script in character. No preamble, no labels, no quotes around it.
Keep it under 4 sentences. Be direct and in-character."""

    response = model.generate_content(prompt)
    return response.text.strip()


def _fallback_script(request: InterventionRequest, persona: str) -> str:
    """Generate a fallback script from templates when Gemini is unavailable."""
    template = FALLBACK_SCRIPTS.get(persona, FALLBACK_SCRIPTS["chill_friend"])
    return template.format(
        top_distraction=request.top_distraction or "distractions",
        distraction_ratio=request.distraction_ratio,
        score=request.score,
    )
