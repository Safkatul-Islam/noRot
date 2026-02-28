# Focus score drops while using productive apps

## What the error looks like

- The UI shows focus dropping (procrastination score rising) even when:
  - `activeCategory` is `productive`, and
  - `distractingMinutes` is near zero.

This usually shows up as a slowly decreasing focus gauge during normal “work” behavior like switching between an IDE, terminal, and docs.

## Why it happens

There are two common causes:

1. **Unit mismatch in switch rate**
   - `appSwitchesLast5Min` is a raw count in the last 5 minutes.
   - If the scoring model treats it as switches-per-minute, it over-penalizes by ~5× and makes focus drop during normal productive task-switching.

2. **Switch penalty applied even when fully productive**
   - If the scoring model always applies the switch-rate penalty, normal productive switching can still push the score above 0.
   - For this product, “procrastination score” should primarily reflect *distracting usage*, not just workflow switching.

## How to detect it automatically

- Unit tests should ensure that a snapshot with:
  - `activeCategory: productive`
  - `recentDistractRatio: 0`
  - moderate `appSwitchesLast5Min`
  results in score `0` (or very close to 0 if you want a small penalty).

Run:

```bash
npm -w @norot/desktop run test:run
```

## Fix strategy

- Convert `appSwitchesLast5Min` to per-minute by dividing by 5 before normalization.
- Gate switch-rate penalties so “fully productive” time does not lower focus.

