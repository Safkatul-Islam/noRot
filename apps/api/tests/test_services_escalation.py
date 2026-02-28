from app.services.escalation import apply_snooze_escalation, get_mode, score_to_severity


def test_score_to_severity_boundaries():
    assert score_to_severity(0) == 0
    assert score_to_severity(24.999) == 0
    assert score_to_severity(25) == 1
    assert score_to_severity(49.999) == 1
    assert score_to_severity(50) == 2
    assert score_to_severity(69.999) == 2
    assert score_to_severity(70) == 3
    assert score_to_severity(89.999) == 3
    assert score_to_severity(90) == 4
    assert score_to_severity(100) == 4


def test_apply_snooze_escalation():
    assert apply_snooze_escalation(0, 0) == 0
    assert apply_snooze_escalation(1, 1) == 1
    assert apply_snooze_escalation(1, 2) == 2
    assert apply_snooze_escalation(2, 3) == 3
    assert apply_snooze_escalation(3, 99) == 4


def test_get_mode_mapping():
    assert get_mode(0) == "none"
    assert get_mode(1) == "nudge"
    assert get_mode(2) == "remind"
    assert get_mode(3) == "interrupt"
    assert get_mode(4) == "crisis"
    assert get_mode(999) == "none"
