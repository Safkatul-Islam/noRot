# Agent Notes for This Repo

Repo: npm workspaces — `apps/desktop/` (Electron+Vite+React), `apps/api/` (FastAPI/Python), `packages/shared/` (shared TS types/constants/scoring).

Follow noRotarchitecture.md; this file takes precedence. NOTHING IN THIS FILE IS FAKE. if you are unsure about something, use context7 to find documentation on it. When writing plans, be sure you specify if you used context7 for something.

User is a noob at electron apps.

All of my inquiries, unless otherwise stated, will be referring to the dev version of noRot, and not the production build.

## Commands
- **Install:** `npm ci` from root
- **Desktop dev/build:** `npm run dev:desktop` / `npm run build` (artifacts: `apps/desktop/out/`)
- **Shared pkg:** `npm -w @norot/shared run build` (rebuild after editing `packages/shared/src/*`)
- **Typecheck:** `npx tsc -b` or `npx tsc -p apps/desktop/tsconfig.web.json --noEmit`
- **API:** `npm run dev:api` (or `uvicorn app.main:app --reload --port 8000` from `apps/api/`)
- **API deps:** `python3 -m venv .venv && source .venv/bin/activate && pip install -r apps/api/requirements.txt`
- **Tests:** None yet. Use `pytest` (Python) / `npx vitest` (TS) conventions if adding.

## Code Style (compact)
- Small diffs, match local style, ASCII preferred. 2-space indent, single quotes, semicolons (except `ui/*` shadcn files).
- **Structure:** Components `PascalCase.tsx`, Pages `*Page.tsx`, Hooks `useThing.ts`, Stores `*-store.ts` → `useThingStore`, Services kebab-case. All under `apps/desktop/src/`.
- **Imports:** `@/...` alias, `import type` for types. Order: built-ins → 3p → `@norot/shared` → `@/...` → relative.
- **React+Tailwind:** Named function component exports. Tokens in `globals.css`. Use `cn()` from `@/lib/utils`. See `docs/frontend-ui.md`.
- **Types:** `packages/shared/src/types.ts` is source of truth. Mirror changes in `apps/api/app/models.py`. No `any`; use `unknown` + narrow. Prefer string unions / `as const`.
- **IPC:** New capabilities must update: `electron/types.ts`, `electron/ipc-handlers.ts`, `electron/preload.ts`, `src/lib/electron-api.ts`, `src/lib/mock-electron-api.ts`. Keep `contextIsolation: true`, `nodeIntegration: false`, JSON payloads only.
- **Errors:** try/catch network/audio with `[prefix]` logging. Safe fallbacks over crashes. Never log secrets.
- **Python API:** Routers in `app/routers/`, Pydantic v2 models with `Field(alias="camelCase")`, parameterized sqlite3 queries, `HTTPException` for client errors.

## Sharp Edges
- FastAPI routes at root (`POST /score`) — 404s likely mean wrong `apiUrl` setting.
- Desktop imports `@norot/shared` from `dist/` — build shared first or get module errors (`npm run dev:desktop` handles this).
- ElevenLabs keys: desktop settings `elevenLabsApiKey`, renderer dev `VITE_ELEVENLABS_API_KEY`, fallback script `ELEVENLABS_API_KEY`.

# Error fixing workflow

When I find or you report a bug:

1. Write a test first that reproduces the error
2. Fix the bug
3. Search the entire codebase for other instances of the same error pattern
4. Add tests for any other instances found
5. Document the error pattern in a markdown file:
   - What the error looks like
   - Why it happens
   - How to detect it automatically
   - Link this file in relevant comments

Goal: Don't fix one bug. Fix the class of bugs it belongs to.

## Context7 (Library Docs)

Fetch up-to-date library documentation via MCP:

1. `mcp__context7__resolve-library-id` - Find library ID (e.g., `/vercel/next.js`)
2. `mcp__context7__query-docs` - Query docs with that ID

**Attribution:**
```typescript
// Source: Context7 - [library-id] docs - "[topic]"
```

Example:
```typescript
// Source: Context7 - schedule-x/schedule-x docs - "Timed Event Example"
// https://github.com/schedule-x/schedule-x/blob/main/website/app/docs/calendar/events/page.mdx
const startDateTime = instant.toZonedDateTimeISO(timeZone)
```
