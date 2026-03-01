import type { Persona, Severity } from '@norot/shared';
import { SEVERITY_BANDS } from '@norot/shared';

const stableMessageCache = new Map<string, string>();

function pickStable(key: string, variants: string[]): string {
  const cached = stableMessageCache.get(key);
  if (cached) return cached;
  const idx = variants.length <= 1 ? 0 : Math.floor(Math.random() * variants.length);
  const val = variants[Math.max(0, Math.min(variants.length - 1, idx))] ?? variants[0] ?? '';
  stableMessageCache.set(key, val);
  return val;
}

export function buildStableRecommendationText(severity: Severity, persona: Persona): string {
  const band = SEVERITY_BANDS.find((b) => b.severity === severity);
  if (!band || band.mode === 'none') return '';

  const messages: Record<Persona, Record<string, string[]>> = {
    calm_friend: {
      nudge: [
        "Tiny nudge: shoulders down, jaw unclench. What's one 60‑second step you can do now?",
        "Quick reset: one breath in, one breath out. Now pick the next action (small is fine).",
        "Gentle steering: choose one tab, one task, one minute. What's first?",
        "Micro-win time: do the easiest part of the task for 90 seconds, then reassess.",
      ],
      remind: [
        "You're getting pulled off track. Want to do a 2‑minute restart and then go?",
        "Pause for a second: name the task, then name the very next click.",
        "Soft redirect: what were you about to work on right before this drift?",
        "Let's make it easy: set a 5‑minute timer and do the first obvious step.",
      ],
      interrupt: [
        "Hard moment. Take one breath, then do the smallest possible “start” of your task.",
        "Interrupting the loop: close one distraction, open one work thing, do one tiny step.",
        "You don't need motivation, you need momentum. What's the 2‑minute start?",
        "Okay — we’re stuck. Make the task smaller until it feels doable. What’s the tiny version?",
      ],
      crisis: [
        "Crisis mode means kindness + structure: stand up, water, breathe, then one tiny next step.",
        "If you’re spiraling, that’s human. Let’s do a 60‑second reset and then pick one action.",
        "Lower the bar to “good enough.” What’s one micro‑step that helps Future You?",
        "Reset plan: breathe, unclench, then do one thing that reduces stress by 1%.",
      ],
    },
    coach: {
      nudge: [
        "Quick check: what's the next 2‑minute step? Do it now.",
        "Set a 5‑minute timer. One task. One step. Go.",
        "Tighten the loop: open the work thing, do the first obvious action.",
        "Pick the next move like a coach: specific, tiny, and immediate.",
      ],
      remind: [
        "You're drifting. Pick ONE small action and execute it.",
        "Name the deliverable. Now name the next step. Now do it.",
        "No negotiating: one focused sprint, then you can breathe.",
        "Make it concrete: what is the next click that moves the task forward?",
      ],
      interrupt: [
        "Hard stop. What exactly are you doing for the next 5 minutes?",
        "Interrupt mode: close the distraction, open the task, start messy.",
        "Momentum beats mood. What's the smallest step you can finish right now?",
        "Pick a micro‑goal and ship it. What are we starting?",
      ],
      crisis: [
        "Reset protocol: stand up, water, breathe. Then choose the smallest possible next move.",
        "Crisis = simplify: one task, one step, no drama. What’s the step?",
        "Lower the bar and move anyway: what's the tiniest action that counts as progress?",
        "Stop spiraling. Start small. One minute of forward motion, then reevaluate.",
      ],
    },
    tough_love: {
      nudge: [
        "BRUH. YOU'RE DRIFTING. WHAT THE FUCK IS THE NEXT 2‑MINUTE STEP?",
        "HEY. SNAP OUT OF IT. PICK ONE TINY STEP AND DO IT. NOW.",
        "NOPE. NOT TODAY. ONE TASK. ONE STEP. GO.",
        "OKAY BESTIE. CLOSE THE DISTRACTION AND START THE WORK. WHAT'S STEP ONE?",
      ],
      remind: [
        "YO. YOU'RE DISTRACTED. CLOSE IT AND PICK ONE 5‑MINUTE STEP. GO.",
        "THIS IS NOT 'A BREAK' — IT'S A TRAP. PICK THE NEXT STEP, DUMBASS.",
        "STOP FEEDING THE DOOM. OPEN THE TASK AND DO THE FIRST OBVIOUS THING.",
        "ENOUGH. WHAT'S THE NEXT CLICK THAT MOVES THE WORK FORWARD?",
      ],
      interrupt: [
        "STOP. LISTEN THE FUCK UP. YOU'RE PROCRASTINATING. WHAT ARE YOU DOING IN THE NEXT 2 MINUTES?",
        "HARD STOP. CLOSE THE TAB. START THE TASK. YES, EVEN IF IT'S UGLY. GO. NO FUCKING EXCUSES. FUCK.",
        "YOU'RE NOT 'RESEARCHING.' YOU'RE AVOIDING. WHAT'S THE FIRST REAL STEP? GET THE FUCK STARTED.",
        "I LOVE YOU BUT ALSO: GET YOUR SHIT TOGETHER. PICK ONE MICRO‑STEP. NOW. FUCK. GO.",
      ],
      crisis: [
        "CRISIS MODE. PUT THE PHONE DOWN, BREATHE, GET WATER — THEN DO ONE TINY TASK. RIGHT NOW.",
        "OKAY. RESET. STAND UP. BREATHE. THEN ONE TINY STEP. DON'T ARGUE WITH ME.",
        "THIS IS A SPIRAL. STOP THE SCROLL. ONE MINUTE OF PROGRESS. THEN DECIDE.",
        "YOU'RE OVERWHELMED, NOT LAZY. BUT WE'RE MOVING. WHAT'S THE TINIEST STEP?",
      ],
    },
  };

  const variants = messages[persona]?.[band.mode] ?? [];
  if (variants.length === 0) return 'Time to refocus.';
  return pickStable(`${persona}:${band.mode}`, variants);
}
