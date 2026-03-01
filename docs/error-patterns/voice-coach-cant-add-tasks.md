## Voice Coach Can't Add Tasks

## What the error looks like

- In voice coach mode, the coach says something like "I can't add tasks".
- The Draft Tasks panel stays empty even though the user is clearly describing tasks.
- Or: tasks appear inconsistently (duplicates / incomplete tasks) due to a separate transcript extractor.

## Why it happens

1. The ElevenLabs agent was missing an `add_todo` client tool.
2. The coach prompt discouraged acting like it could add tasks.
3. A separate Gemini transcript extractor could add tasks independently, creating a confusing "two sources of truth" experience.

## How to detect it automatically

- In a coach voice session, when the user describes a task, at least one `add_todo` client tool call should happen.
- No background transcript extractor should be creating coach-mode draft tasks.

## Fix

- Add an `add_todo` client tool to the ElevenLabs agent config.
- Update the coach prompt to use `add_todo` for new tasks.
- Route `add_todo` in coach mode to the in-memory drafts store (user reviews/saves after the conversation).
- Disable background transcript extraction in coach mode to avoid duplicates.

## Related files

- `apps/desktop/electron/elevenlabs-agent.ts`
- `apps/desktop/src/hooks/useVoiceAgent.ts`
- `apps/desktop/src/lib/voice-client-tools.ts`
- `apps/desktop/src/lib/todo-tool-backend.ts`
