# Flex + min-h-0 content collapse

## What it looks like

- A card (or panel) shows only its header.
- The body looks "empty" even though the React component renders an empty-state message.
- This usually happens when the window height is smaller than the combined height of the surrounding dashboard sections.

Example symptom on the dashboard:

- `Intervention History` card body disappears when the dashboard is height-constrained.

## Why it happens

This is a flexbox sizing edge case:

- A vertical flex container with a fixed height distributes space across children.
- If a child is `flex-1` and also has `min-h-0`, it is allowed to shrink all the way down to 0px.
- If the shrinking child (or its descendants) also uses `overflow-hidden`, the content is clipped and the panel *looks* empty.

This is easy to trigger in dashboards that try to fit multiple rows on-screen at once.

## How to detect it

Code smell search:

- Look for Tailwind class combinations like:
  - `flex-1 min-h-0 overflow-hidden`
  - `h-full` empty-states inside containers that can shrink

Manual repro:

1. Resize the app window shorter (height).
2. Confirm every card still shows a visible empty state (not header-only).
3. Confirm the page scrolls instead of hiding content.

## How to fix it

Pick one (or combine):

1. Add a minimum height to the shrinking panel (or its content area), e.g. `min-h-[180px]`.
2. Remove `min-h-0` from higher-level flex items when you *want* the page to overflow and let the main scroll container handle it.
3. Keep empty states compact (avoid large vertical padding) so they remain legible in smaller panels.

Where this repo applies it:

- The Dashboard "Intervention History" panel uses `min-h-[180px]` to prevent header-only collapse in short windows.
