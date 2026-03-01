## ElevenLabs Agent 422 Tool Schema

## What the error looks like

- Starting Voice Chat fails immediately.
- UI shows: `ElevenLabs rejected the voice agent config (422)`.
- Logs / error detail contains something like:

```json
{"detail":[{"msg":"Value error, Must set one of: description, dynamic_variable, is_system_provided, or constant_value"}]}
```

## Why it happens

ElevenLabs Agents Platform validates the `conversation_config.agent.prompt.tools[].client.parameters` schema.
For string schema nodes (including array `items` of type `string`), ElevenLabs requires at least one of:

- `description`
- `dynamic_variable`
- `is_system_provided`
- `constant_value`

If we define an array item as just `{ "type": "string" }`, agent creation fails with HTTP 422.

## How to detect it automatically

- Unit test: traverse every tool schema node and assert all `type: "string"` nodes include one of the required metadata fields.
- See: `apps/desktop/electron/__tests__/elevenlabs-agent-tools.test.ts`

## Fix

- Add `description` to any string schema nodes that were missing it (most commonly `allowed_apps.items`).
- Keep a unit test to prevent regressions.

## Related files

- `apps/desktop/electron/elevenlabs-agent.ts`
- `apps/desktop/electron/ipc-handlers.ts`
- `apps/desktop/electron/__tests__/elevenlabs-agent-tools.test.ts`
