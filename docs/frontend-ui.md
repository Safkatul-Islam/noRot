# Frontend UI / UX Styling

This document describes how the desktop UI looks and how that look is implemented today.

If you change the UI (colors, layouts, animations, components), update this doc so it stays accurate.

## Visual Direction

- Dark, glassy surfaces ("glass UI") with soft borders and controlled glows
- A subtle animated background layer (Liquid Ether) behind the app chrome
- One user-selected accent color that drives highlights, glows, and some effects

## Where The Styling Lives

- Theme tokens and base styling: `apps/desktop/src/styles/globals.css`
- Accent color runtime wiring: `apps/desktop/src/hooks/useAccentColor.ts`
- Accent presets: `apps/desktop/src/stores/settings-store.ts`
- App-wide background layer: `apps/desktop/src/components/ThemeProvider.tsx`
- Glass card surface primitive: `apps/desktop/src/components/GlassCard.tsx`

## Colors (Tokens)

The UI uses CSS custom properties (variables) as the source of truth.
They are defined in `apps/desktop/src/styles/globals.css` under `@theme`.

Key tokens you will see in Tailwind classnames:

- `--color-background`, `--color-surface`, `--color-surface-hover`
- `--color-border`, `--color-border-hover`
- `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`
- `--color-primary` (accent), plus `--color-primary-hover`, `--color-primary-foreground`
- Glow tokens like `--color-glow-primary`

Accent color is user-controlled in Settings and applied at runtime by setting CSS variables on `:root`.

## Typography

The global font stack is set in `apps/desktop/src/styles/globals.css`:

- Preferred: `Space Grotesk`, `Manrope`
- Fallback: system UI fonts

If you want consistent typography across machines, bundle or import the fonts; otherwise the fallback fonts will be used.

## Background (Liquid Ether)

The app renders a non-interactive background effect behind everything:

- Mounted in `apps/desktop/src/components/ThemeProvider.tsx`
- Effect implementation: `apps/desktop/src/components/effects/LiquidEther.tsx`
- It is `position: fixed`, `pointer-events: none`, and low opacity so content stays readable
- The effect colors come from the current accent preset (`etherColors`)

## Motion And Effects

The UI uses a few intentional effects (not everywhere):

- Page transitions: `apps/desktop/src/App.tsx` (Framer Motion + blur)
- Section reveal: `apps/desktop/src/components/effects/BlurFade.tsx`
- Hero text accent: `apps/desktop/src/components/effects/AuroraText.tsx` (use sparingly)
- Glass hover spotlight: `apps/desktop/src/components/effects/MagicCard.tsx`
- Intervention emphasis:
  - Spinning border glow: `apps/desktop/src/components/effects/ShineBorder.tsx`
  - Crisis meteors: `apps/desktop/src/components/effects/Meteors.tsx`
  - Shimmer CTA: `apps/desktop/src/components/effects/ShimmerButton.tsx`

Animation keyframes/tokens live in `apps/desktop/src/styles/globals.css`.

## Layout (Pages)

Navigation:

- Sidebar with a collapsible width animation: `apps/desktop/src/components/Sidebar.tsx`

Main shell:

- Fixed-height app container with a draggable title bar region: `apps/desktop/src/layouts/DashboardLayout.tsx`
- Main content scrolls (`overflow-y-auto`) while the outer body stays `overflow: hidden`

Pages:

- Dashboard: `apps/desktop/src/pages/DashboardPage.tsx`
  - Uses a 12-column grid
  - "Focus Score" hero (left) + simulation + intervention history (right)
  - Second row: usage chart (full width)
- History: `apps/desktop/src/pages/HistoryPage.tsx`
  - Stats strip + chart + breakdown + recent list
- Settings: `apps/desktop/src/pages/SettingsPage.tsx`
  - Persona preview, accent color picker, threshold, cooldown, audio toggle, connection status

## Known Layout Pitfall (Flex + min-h-0)

Short windows can cause a flex child to shrink to 0px and hide card bodies.
See `docs/flex-min-h-0-layout-collapse.md`.

In this repo, one defensive pattern is adding a minimum height to panels that must never collapse (example: the Dashboard "Intervention History" card).
