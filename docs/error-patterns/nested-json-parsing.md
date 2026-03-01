# Nested JSON Parsing Bug

## What it looks like
- `/stats/apps` returns `appName: "Unknown"` and `category: "unknown"` for all entries
- `/wins` returns `totalFocusedMinutes: 0` even when the user has been productive
- Any aggregation over stored snapshots produces empty/zero results

## Why it happens
Snapshots stored by `POST /score` use `model_dump_json(by_alias=True)`, which produces nested JSON:
```json
{
  "categories": { "activeApp": "Chrome", "activeDomain": "twitter.com", "activeCategory": "social" },
  "signals": { "productiveMinutes": 42, ... }
}
```
But parsing code reads top-level keys: `parsed.get("activeApp")` instead of `parsed.get("categories", {}).get("activeApp")`. These return `None`, causing silent data loss.

## How to detect it automatically
- Search for `parsed.get("activeApp")` or similar flat access on snapshot JSON
- Any code that calls `json.loads()` on snapshot `data` column and reads fields directly
- Pattern: `parsed.get("<fieldName>")` where `<fieldName>` is a nested field in the snapshot schema

## How to fix
Always access nested structure with fallback for backwards compatibility:
```python
cats = parsed.get("categories", {})
app_name = cats.get("activeApp", parsed.get("activeApp", "Unknown"))
```

## Files affected
- `apps/api/app/db.py` — `get_app_stats()` and `get_wins_data()`

## Tests
- `apps/api/tests/test_bug_fixes.py::test_bug_1_1_app_stats_reads_nested_categories`
- `apps/api/tests/test_bug_fixes.py::test_bug_1_2_wins_reads_nested_signals`
