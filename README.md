# noRot

**ai-powered procrastination interrupter that talks back**

built for hack for humanity 2026

![electron](https://img.shields.io/badge/electron-grey?style=flat-square&logo=electron)
![react](https://img.shields.io/badge/react-grey?style=flat-square&logo=react)
![typescript](https://img.shields.io/badge/typescript-grey?style=flat-square&logo=typescript)
![fastapi](https://img.shields.io/badge/fastapi-grey?style=flat-square&logo=fastapi)
![gemini](https://img.shields.io/badge/gemini-grey?style=flat-square&logo=google)
![elevenlabs](https://img.shields.io/badge/elevenlabs-grey?style=flat-square)

## what is noRot?

noRot watches what apps you're using, scores how distracted you are in real time, and talks to you about it. literally - it uses ai voice agents that emotionally escalate the longer you procrastinate. it starts as a calm friend, shifts to a coach, then goes full tough love. but if you hit crisis mode, it switches to being genuinely supportive and helps you reset.

procrastination isn't just about being lazy. it messes with your mental health, tanks your grades, and kills your productivity over time. noRot is meant to be a compassionate ai companion that actually understands your patterns - not a parental control tool that blocks websites.

<!-- TODO: add screenshot -->

## key features

- **real-time procrastination scoring** - 0-100 score based on your actual app usage signals
- **emotionally escalating voice interventions** - 3 ai personas via elevenlabs (calm friend, coach, tough love) that match how far gone you are
- **5 severity levels** - focused → drifting → distracted → procrastinating → crisis (supportive reset)
- **voice chat with ai agent** - personalized check-ins where you can actually talk back
- **3d animated voice orb** - three.js orb that reacts to audio, cursor proximity, and your severity level
- **dark mode glassmorphic ui** - severity-reactive colors and animations (cyan when focused, orange when drifting, red when you're cooked)
- **todo system** - deadlines and focus intent tracking so the ai knows what you should be doing
- **live dashboard** - score gauge, usage charts, intervention timeline, and "wins" metrics
- **works offline** - fallback mp3s and client-side scoring when the api is down
- **late-night multiplier** - knows when you're doom-scrolling at 2am and weighs it accordingly

<!-- TODO: add screenshot -->

## how it works

1. **telemetry** - the app quietly tracks which apps are in focus and how often you switch between them
2. **scoring** - a weighted formula crunches distraction ratio, app switch rate, intent gap, and snooze pressure into a 0-100 score. late-night usage gets multiplied
3. **severity mapping** - your score maps to one of 5 severity bands, each with its own tone and urgency
4. **intervention** - gemini generates a context-aware message matching your severity and persona. elevenlabs speaks it out loud, or at higher severity, starts a live voice conversation
5. **user response** - you can snooze, dismiss, or talk back through the voice chat agent
6. **feedback loop** - your responses feed back into the scoring (snoozing bumps up pressure, engaging brings it down)

## tech stack

| layer | tech |
|-------|------|
| frontend | electron, react, typescript, tailwind css, three.js, framer motion |
| backend | fastapi, python, sqlite |
| ai | gemini 2.5 flash (text generation, context analysis), elevenlabs agents (voice conversations) |
| voice | elevenlabs tts, elevenlabs agents api |
| shared | typescript types, scoring logic, constants (npm workspace) |

## architecture

<!-- TODO: add architecture diagram -->

the app is split into three layers:

- **electron main process** - handles system telemetry, database, orchestration, gemini ai integration, and ipc bridge
- **react renderer** - the ui you see: dashboard, voice orb, interventions, settings, todos
- **fastapi backend** - scoring engine, mood analysis, escalation logic, and intervention script generation

they're connected through electron's ipc for main↔renderer, and http for renderer↔api. shared types and scoring constants live in a separate npm package so both sides stay in sync.

## getting started

prerequisites: node.js 24+ and python 3.14+

```bash
# install dependencies
npm ci

# start the api (terminal 1)
python3 -m venv .venv && source .venv/bin/activate
pip install -r apps/api/requirements.txt
cd apps/api && uvicorn app.main:app --reload --port 8000

# start the desktop app (terminal 2)
npm run dev:desktop
```

### api keys (optional but recommended)

in the app's settings page, you can add:

- **gemini api key** - enables dynamic ai-generated interventions, context-aware todo checking, and chat-based daily setup. without it, the app falls back to hardcoded scripts
- **elevenlabs api key** - enables ai voice agents and high-quality text-to-speech. without it, the app uses your browser's built-in speech synthesis

## repo structure

```
apps/desktop/   - electron + react app
apps/api/       - fastapi scoring backend
packages/shared/ - shared ts types, constants, scoring logic
```

## built at hack for humanity 2026

made by team noRot 🧠
