# Voice Coach: Existing Todos Not Visible

## What It Looks Like

- User has existing todos in the database (e.g. "Linguistics homework" with a 10 PM deadline).
- They open the voice coach dialog.
- The "Draft Tasks" panel shows "Tasks will appear as you talk..." instead of their existing tasks.
- The coach AI asks "What computer task are you doing next?" instead of referencing their existing tasks.
- The agent can technically access DB todos via `list_todos` tool, but it doesn't know to look and the UI doesn't display them.

## Why It Happens

Two-layer disconnect between DB state and the voice coach:

1. **UI layer**: `VoiceTaskPanel` only renders `proposedTodos` from `voice-chat-store`, which starts as `[]` when the dialog opens. DB todos are never loaded into it.
2. **Agent layer**: `buildCoachPrompt()` includes no existing todo context, unlike the check-in agent which gets `activeTodos` via `CheckinContext`.

## How to Detect It

- Open voice coach with existing todos in the database.
- The panel should show them immediately, not "Tasks will appear as you talk..."
- The agent's first message should reference existing tasks if any exist.

## How It Was Fixed

1. **Agent prompt** (`elevenlabs-agent.ts`): Added `{{existing_todos}}` dynamic variable placeholder to both tough_love and normal coach prompts.
2. **Session start** (`useVoiceAgent.ts`): Fetch DB todos before `startSession()` and pass them as `dynamicVariables` so ElevenLabs substitutes the placeholder.
3. **Store** (`voice-chat-store.ts`): Added `dbTodos` state field and `setDbTodos` setter.
4. **Dialog** (`VoiceChatDialog.tsx`): Loads DB todos on open, subscribes to `onTodosUpdated` for real-time sync, passes `existingTodos` prop to panel.
5. **Panel** (`VoiceTaskPanel.tsx`): Renders read-only "Existing" section above draft todos, with "New" sub-header when both are present. Empty state only shows when both lists are empty.

## Related Files

- `apps/desktop/electron/elevenlabs-agent.ts` — coach prompt with `{{existing_todos}}`
- `apps/desktop/src/hooks/useVoiceAgent.ts` — `dynamicVariables` injection
- `apps/desktop/src/stores/voice-chat-store.ts` — `dbTodos` state
- `apps/desktop/src/components/VoiceChatDialog.tsx` — DB todo loading + subscription
- `apps/desktop/src/components/VoiceTaskPanel.tsx` — existing todos rendering
