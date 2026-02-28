# noRot Architecture

> AI-powered procrastination interrupter for Hack for Humanity 2026.
> Detects procrastination in real time and intervenes with an ElevenLabs voice that escalates in tone the longer you procrastinate.

## How It Works

```
Every 2 seconds:

Telemetry ──> Scoring API (FastAPI) ──> Orchestrator ──> ElevenLabs TTS
(watches your    (calculates 0-100       (decides if         (speaks to you
 active window)   procrastination score)   you need a nudge)   with emotion)
                                                │
                                                v
                                          React Dashboard
                                          (shows score, history,
                                           snooze/dismiss controls)
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Desktop | Electron + electron-vite |
| Frontend | React + TypeScript + Tailwind + shadcn/ui |
| State | Zustand (client) + TanStack Query (server) |
| Backend | FastAPI + Pydantic v2 |
| Databases | better-sqlite3 (Electron) + SQLite (API) — separate DBs |
| Voice | ElevenLabs TTS + ElevenLabs Agents |
| AI | Google Gemini (context classification + script generation) |

## Repo Layout

npm workspaces monorepo with three packages:

- **`packages/shared/`** (`@norot/shared`) — Single source of truth for types, constants, and scoring logic. Both the desktop app and FastAPI backend stay in sync with this.
- **`apps/desktop/electron/`** — Electron main process. Has OS access. Runs telemetry, orchestration, database, and voice integration.
- **`apps/desktop/src/`** — React renderer. Pages, components, Zustand stores, hooks. Talks to main process over IPC.
- **`apps/api/`** — FastAPI backend. Pydantic models mirror shared types. Routers for scoring, history, stats, wins, interventions.

## Scoring

Weighted formula producing a 0-100 procrastination score:
- **Distraction ratio** (55%) — rolling window of time on distracting apps
- **App switch rate** (30%) — how fast you jump between apps
- **Snooze pressure** (15%) — how many times you've dismissed reminders
- **Late-night multiplier** — 1.25x after 11 PM

| Severity | Score | Mode |
|----------|-------|------|
| 0 | 0-24 | none |
| 1 | 25-49 | nudge |
| 2 | 50-69 | remind |
| 3 | 70-89 | interrupt |
| 4 | 90-100 | crisis (calm, supportive) |

## Voice & Escalation

Escalation = **tone and wording**, not volume. Uses ElevenLabs audio tags to shift emotion per severity.

Three personas: `calm_friend`, `coach`, `tough_love`.

Snoozing makes the next intervention more intense (score boost + severity bump).

## IPC Bridge

React can't access Node.js. Communication goes through preload:

```
React ──invoke──> preload.ts ──ipcRenderer──> ipc-handlers.ts ──> database/orchestrator
```

Adding a new IPC capability requires updating **5 files**: `electron/types.ts`, `electron/ipc-handlers.ts`, `electron/preload.ts`, `src/lib/electron-api.ts`, `src/lib/mock-electron-api.ts`.

## API Endpoints

All routes at root (`POST /score`, not `/api/score`).

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/score` | UsageSnapshot in, ScoreResponse out |
| GET | `/history` | Score records for charts |
| GET | `/stats` | Session aggregates |
| GET | `/wins` | Refocus count + focused minutes |
| POST | `/wins/refocus` | Record a refocus event |
| POST | `/intervention` | Record an intervention |

## Database (Electron SQLite)

```sql
telemetry_snapshots (id, timestamp, data)
score_history       (id, timestamp, score, severity, reasons, recommendation)
interventions       (id, timestamp, score, severity, persona, text, user_response, audio_played)
settings            (key, value)
todos               (id, text, done, "order", app, url, allowed_apps, deadline, start_time, duration_minutes)
```

## Key Decisions

1. **Local-first ethics** — only reads app name + window title. No keylogging.
2. **Rule-based scoring** — explainable, no black-box ML.
3. **Shared package is source of truth** — change `@norot/shared` first, then mirror in Python.
