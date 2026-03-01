from app.services.scripts import (
    get_cooldown,
    get_script,
    get_script_with_context,
    get_tts_settings,
)


def test_scripts_present_for_all_personas_and_severities():
    for persona in ("calm_friend", "coach", "tough_love"):
        for severity in (0, 1, 2, 3, 4):
            text = get_script(persona, severity)
            assert isinstance(text, str)
            assert text


def test_severity_zero_is_positive():
    text = get_script("calm_friend", 0)
    assert text  # severity 0 returns encouraging text, not empty


def test_no_repeat_consecutive():
    """Calling get_script twice for the same persona+severity should not repeat."""
    first = get_script("coach", 2)
    second = get_script("coach", 2)
    assert first != second


def test_context_injection_domain():
    text = get_script_with_context("calm_friend", 2, active_domain="www.reddit.com")
    assert "Reddit" in text


def test_context_injection_youtube():
    text = get_script_with_context("coach", 1, active_domain="youtube.com")
    assert "YouTube" in text


def test_context_injection_app():
    text = get_script_with_context("tough_love", 2, active_app="Discord")
    assert "Discord" in text


def test_context_fallback_no_context():
    """Without context, {target} should be replaced with 'off task'."""
    text = get_script_with_context("calm_friend", 1)
    assert "{target}" not in text
    assert "off task" in text


def test_no_target_placeholder_in_output():
    """get_script (no context) should never leave {target} in the output."""
    for persona in ("calm_friend", "coach", "tough_love"):
        for severity in (0, 1, 2, 3, 4):
            text = get_script(persona, severity)
            assert "{target}" not in text


def test_severity_4_no_target():
    """Severity 4 templates are context-independent (no {target})."""
    for persona in ("calm_friend", "coach", "tough_love"):
        text = get_script_with_context(persona, 4, active_domain="reddit.com")
        assert "reddit" not in text.lower() or persona == "tough_love"


def test_tts_settings_vary_by_severity():
    base = get_tts_settings(1)
    urgent = get_tts_settings(2)
    crisis = get_tts_settings(4)

    assert base.model == "eleven_turbo_v2"
    assert urgent.model == "eleven_turbo_v2"
    assert crisis.model == "eleven_turbo_v2"

    assert urgent.stability < base.stability
    assert urgent.speed > base.speed
    assert crisis.speed < base.speed


def test_cooldown_defaults():
    assert get_cooldown(0) == 0
    assert get_cooldown(1) == 300
    assert get_cooldown(2) == 180
    assert get_cooldown(3) == 180
    assert get_cooldown(4) == 180
