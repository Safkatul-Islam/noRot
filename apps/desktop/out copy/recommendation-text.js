import { SEVERITY_BANDS } from '@norot/shared';
export function buildStableRecommendationText(severity, persona) {
    const band = SEVERITY_BANDS.find((b) => b.severity === severity);
    if (!band || band.mode === 'none')
        return '';
    const messages = {
        calm_friend: {
            nudge: "Hey, I noticed you've been drifting a bit. Maybe a quick stretch?",
            remind: "You're getting pretty distracted. Want to reset together?",
            interrupt: "I care about you — and right now you're deep in procrastination. Take one breath, then come back to your task.",
            crisis: "I'm worried you're spiraling. Step away for a few minutes, drink water, then come back with one tiny next step.",
        },
        coach: {
            nudge: "Quick check: what's the next 2-minute step?",
            remind: "You're drifting. Pick ONE small action and do it now.",
            interrupt: "Hard stop. What exactly are you working on in the next 5 minutes?",
            crisis: "Reset: stand up, breathe, then choose the smallest possible next move.",
        },
        tough_love: {
            nudge: "BRUH. YOU'RE DRIFTING. WHAT THE FUCK IS THE NEXT 2-MINUTE STEP?",
            remind: "YO. YOU'RE DISTRACTED. CLOSE IT AND PICK ONE 5-MINUTE STEP. GO.",
            interrupt: "STOP. LISTEN THE FUCK UP. YOU'RE PROCRASTINATING. WHAT ARE YOU DOING IN THE NEXT 2 MINUTES?",
            crisis: "CRISIS MODE. PUT THE PHONE DOWN, BREATHE, GET WATER — THEN DO ONE TINY TASK. RIGHT NOW.",
        },
    };
    return messages[persona][band.mode] || 'Time to refocus.';
}
