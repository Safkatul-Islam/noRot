# Offline / real-world todos extracted from voice chat

## What the error looks like

- During voice chat, the user says something like "I want to go to the beach".
- noRot turns it into a todo item (e.g. "Go to the beach").
- This is misleading because noRot monitors apps/websites, so it cannot track or meaningfully help with the offline part.

## Why it happens

1. **Todo extraction prompt was too permissive**
   - The LLM was allowed to treat any "I want to X" statement as a task.
   - It didn't have a strong rule that todos must be computer tasks (apps/websites).

2. **Voice coach prompt didn't set expectations**
   - The conversational agent wasn't instructed to gently redirect offline goals into computer-side next steps.

## How to detect it automatically

- Unit tests that ensure obviously physical-world tasks (beach/gym/shower/laundry/etc.) are filtered out before showing proposed todos.

Run:

```bash
npm -w @norot/desktop run test:run
```

## Fix

- Add a scope filter for extracted tasks so offline/real-world activities are dropped.
- Update the voice coach prompt to gently pivot offline goals to the computer side (research, messaging, setting reminders), without sounding preachy.
