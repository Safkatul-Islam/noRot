# noRot

**ai-powered procrastination interrupter that talks back**

built for [hack for humanity 2026](https://hack-for-humanity-2026.devpost.com/)

![electron](https://img.shields.io/badge/electron-grey?style=flat-square&logo=electron)
![react](https://img.shields.io/badge/react-grey?style=flat-square&logo=react)
![typescript](https://img.shields.io/badge/typescript-grey?style=flat-square&logo=typescript)
![fastapi](https://img.shields.io/badge/fastapi-grey?style=flat-square&logo=fastapi)
![gemini](https://img.shields.io/badge/gemini-grey?style=flat-square&logo=google)
![elevenlabs](https://img.shields.io/badge/elevenlabs-grey?style=flat-square)
![amd](https://img.shields.io/badge/AMD_Cloud-grey?style=flat-square&logo=amd)
![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

## what is noRot?

noRot watches what apps you're using, scores how distracted you are in real time, and talks to you about it. literally - it uses ai voice agents that emotionally escalate the longer you procrastinate. it starts as a calm friend, shifts to a coach, then goes full tough love. but if you hit crisis mode, it switches to being genuinely supportive and helps you reset.

procrastination isn't just about being lazy. it messes with your mental health, tanks your grades, and kills your productivity over time. noRot is meant to be a compassionate ai companion that actually understands your patterns - not a parental control tool that blocks websites.

## key features

- **real-time procrastination scoring** - 0-100 score based on your actual app usage signals
- **emotionally escalating voice interventions** - 3 ai personas via elevenlabs (calm friend, coach, tough love) that match how far gone you are
- **5 severity levels** - focused → drifting → distracted → procrastinating → crisis (supportive reset)
- **voice chat with ai agent** - personalized check-ins where you can actually talk back
- **3d animated voice orb** - three.js orb that reacts to audio, cursor proximity, and your severity level
- **dark mode glassmorphic ui** - severity-reactive colors and animations (cyan when focused, orange when drifting, red when you're cooked)
- **todo system** - deadlines and focus intent tracking so the ai knows what you should be doing
- **live dashboard** - score gauge, usage charts, intervention timeline, and "wins" metrics
- **open-source ai option** - AMD Cloud with Llama 3.1 for fully private, self-hosted inference (no data leaves your infra)
- **works offline** - fallback mp3s and client-side scoring when the api is down
- **late-night multiplier** - knows when you're doom-scrolling at 2am and weighs it accordingly

## how it works

1. **telemetry** - the app quietly tracks which apps are in focus and how often you switch between them
2. **scoring** - a weighted formula crunches distraction ratio, app switch rate, intent gap, and snooze pressure into a 0-100 score. late-night usage gets multiplied
3. **severity mapping** - your score maps to one of 5 severity bands, each with its own tone and urgency
4. **intervention** - an ai model (gemini or llama 3.1 via AMD Cloud) generates a context-aware message matching your severity and persona. elevenlabs speaks it out loud, or at higher severity, starts a live voice conversation
5. **user response** - you can snooze, dismiss, or talk back through the voice chat agent
6. **feedback loop** - your responses feed back into the scoring (snoozing bumps up pressure, engaging brings it down)

## tech stack

| layer | tech |
|-------|------|
| frontend | electron, react, typescript, tailwind css, three.js, framer motion |
| backend | fastapi, python, sqlite |
| ai (cloud) | gemini 2.5 flash (text generation, context analysis) |
| ai (open-source) | llama 3.1 8B via vLLM on AMD Instinct MI300X ([AMD Cloud](docs/amd-cloud-setup.md)) |
| voice | elevenlabs tts, elevenlabs agents api |
| shared | typescript types, scoring logic, constants (npm workspace) |

## architecture

the app is split into three layers:

- **electron main process** - handles system telemetry, database, orchestration, ai integration (gemini + AMD Cloud), and ipc bridge
- **react renderer** - the ui you see: dashboard, voice orb, interventions, settings, todos
- **fastapi backend** - scoring engine, mood analysis, escalation logic, and intervention script generation

they're connected through electron's ipc for main↔renderer, and http for renderer↔api. shared types and scoring constants live in a separate npm package so both sides stay in sync.

the ai layer supports 3 script sources: **gemini** (google cloud), **AMD Cloud / Llama** (open-source, self-hosted on AMD hardware), and **hardcoded fallbacks** (offline). you can switch between them in settings.

## getting started

### prerequisites

- node.js 20+
- python 3.10+

### 1. install dependencies

```bash
npm ci
```

### 2. start the api

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r apps/api/requirements.txt
cd apps/api && uvicorn app.main:app --reload --port 8000
```

### 3. start the desktop app (new terminal)

```bash
npm run dev:desktop
```

the app will open automatically. head to **settings** to configure your api keys.

### api keys (optional but recommended)

in the app's settings page, you can add:

- **gemini api key** - enables dynamic ai-generated interventions, context-aware todo checking, and chat-based daily setup. without it, the app falls back to hardcoded scripts
- **elevenlabs api key** - enables ai voice agents and high-quality text-to-speech. without it, the app uses your browser's built-in speech synthesis
- **AMD Cloud endpoint** - enables open-source Llama 3.1 inference on AMD hardware. fully private — no data leaves your infrastructure. see [AMD Cloud setup guide](docs/amd-cloud-setup.md) for details

## repo structure

```
apps/
  desktop/              electron + react desktop app
    electron/           main process (telemetry, db, ai clients, ipc)
    src/
      pages/            app pages (dashboard, settings, todos, etc.)
      components/       reusable ui components
      stores/           zustand state management
      hooks/            custom react hooks
      services/         api services and utilities
      lib/              shared utilities (electron api, cn, etc.)
  api/                  fastapi scoring backend
    app/
      routers/          api route handlers
      models.py         pydantic models

packages/
  shared/               shared ts types, constants, scoring logic

docs/                   architecture and setup guides
```

## license

MIT - see [LICENSE](LICENSE) for details.

---

built at **hack for humanity 2026** by team noRot
