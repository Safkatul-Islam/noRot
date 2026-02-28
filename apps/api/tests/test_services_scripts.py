from app.services.scripts import get_cooldown, get_intervention_text, get_tts_settings


def test_scripts_present_for_all_personas_and_severities():
    for persona in ("calm_friend", "coach", "tough_love"):
        for severity in (1, 2, 3, 4):
            text = get_intervention_text(persona, severity)
            assert isinstance(text, str)
            assert text


def test_severity_zero_has_no_intervention_text():
    assert get_intervention_text("calm_friend", 0) == ""


def test_tts_settings_vary_by_severity():
    base = get_tts_settings("calm_friend", 1)
    urgent = get_tts_settings("calm_friend", 2)
    crisis = get_tts_settings("calm_friend", 4)

    assert base["model"] == "eleven_v3"
    assert urgent["model"] == "eleven_v3"
    assert crisis["model"] == "eleven_v3"

    assert urgent["stability"] < base["stability"]
    assert urgent["speed"] > base["speed"]
    assert crisis["speed"] < base["speed"]


def test_cooldown_defaults():
    assert get_cooldown(0) == 0
    assert get_cooldown(1) == 300
    assert get_cooldown(2) == 180
    assert get_cooldown(3) == 180
    assert get_cooldown(4) == 180
    assert get_cooldown(999) == 300
