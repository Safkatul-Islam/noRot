# Cross-Stack Score Rounding Mismatch

## What it looks like
- Same raw data produces different severity levels in Python vs TypeScript
- Score at boundary values (24.5, 49.5, etc.) may land in different severity bands
- Example: Python returns `24.5` (severity 0), TypeScript returns `25` (severity 1)

## Why it happens
Python used `round(proc_score, 2)` which preserves decimal places (e.g., `24.5`), while TypeScript uses `Math.round()` which produces integers (e.g., `25`). At severity band boundaries, this mismatch causes the same data to produce different scores and different intervention behavior.

## How to detect it automatically
- Search for `round(.*,\s*[1-9])` in Python scoring code — any non-zero decimal rounding is suspect
- Compare `round()` calls in Python with `Math.round()` calls in TypeScript scoring
- Severity band boundaries are: 0-24, 25-49, 50-69, 70-89, 90-100

## How to fix
Both stacks should produce integers: use `round(score)` (no decimal places) in Python, matching TypeScript's `Math.round()`.

## Files affected
- `apps/api/app/routers/score.py` — `score_snapshot()` return value

## Tests
- `apps/api/tests/test_bug_fixes.py::test_bug_1_3_score_returns_integer`
- `apps/api/tests/test_cross_stack_consistency.py` — full parity suite
