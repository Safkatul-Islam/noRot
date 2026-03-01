## LLM Time Parsing Mismatch

## What the error looks like

- The voice coach says something like "due by 10pm tonight", but the todo card appears with no time info (no deadline, no startTime).
- The user explicitly mentions a time during the voice session, yet the created task has no timing fields at all.
- Console shows `[voice-tools]` warnings when a string parse fails but an offset fallback succeeds.

## Why it happens

The ElevenLabs agent runs GPT-4o-mini under the hood. When the user says "10pm tonight", the LLM sends messy time strings like `"10 p.m. tonight"` or `"by 5pm"` to the `add_todo` / `update_todo` client tools.

The original `normalizeTimeInput()` parser in `time-utils.ts` only supported 4 clean formats:

1. `"now"` — current time
2. `"in 30 min"` — relative offset
3. `"5pm"` / `"5:30 pm"` — 12-hour time (no extra words)
4. `"14:00"` — 24-hour HH:MM

Anything outside those patterns (extra words like "tonight", periods in "a.m.", prefixes like "by" or "around") returned `null`, silently dropping the time info.

## How to detect it automatically

- **User-facing symptom:** Todos created via the voice coach have no `deadline` or `startTime` even though the user clearly mentioned a time in the conversation.
- **Console logging:** `[voice-tools]` logs a `console.warn` when the string parse returns `null` but an offset field was provided and used as a fallback.
- **Test coverage:** Unit tests in `time-utils.test.ts` cover LLM-style messy inputs (e.g. `"10 p.m. tonight"`, `"by 5pm"`, `"around 2:30 p.m."`) and assert they parse correctly.

## Fix

A hybrid approach across three files:

1. **Hardened parser (time-utils.ts):** Added a pre-cleaning step to `normalizeTimeInput()` that strips LLM noise before matching:
   - Removes filler prefixes: `"by"`, `"before"`, `"around"`, `"at"`, `"about"`, `"approximately"`
   - Removes trailing context: `"tonight"`, `"today"`, `"this evening"`, etc.
   - Normalizes `a.m.` / `p.m.` to `am` / `pm`
   - Added keyword support for `"noon"`, `"midnight"`, `"end of the day"`, `"eod"`

2. **Offset fields in tool schemas (elevenlabs-agent.ts):** Added `start_offset_minutes` and `deadline_offset_minutes` numeric fields to both `add_todo` and `update_todo` tool schemas. The LLM prompt instructs the agent to prefer these offset fields for relative times (e.g. "in 30 minutes" becomes `start_offset_minutes: 30`). Numbers are far more reliable than free-form strings from an LLM.

3. **Fallback chain in voice-client-tools.ts:** The `add_todo` and `update_todo` handlers use a fallback chain:
   - First try parsing the string field (`start_time` / `deadline`) with `normalizeTimeInput()`
   - If that returns `null`, check for a numeric offset field (`start_offset_minutes` / `deadline_offset_minutes`) and compute HH:MM from "now + offset"
   - If both are absent, the field stays `undefined` (no time info)

4. **Duration inference:** If `duration_minutes` is provided alongside `start_time` but no `deadline`, the deadline is inferred as `start_time + duration_minutes` (and vice versa).

## Related files

- `apps/desktop/src/lib/time-utils.ts` — `normalizeTimeInput()` parser with pre-cleaning
- `apps/desktop/src/lib/voice-client-tools.ts` — `add_todo` / `update_todo` fallback chain
- `apps/desktop/electron/elevenlabs-agent.ts` — tool schemas with `*_offset_minutes` fields
- `apps/desktop/src/lib/__tests__/time-utils.test.ts` — unit tests for messy LLM inputs
