function getTarget(categories) {
    if (typeof categories.activityLabel === 'string' && categories.activityLabel.trim()) {
        return categories.activityLabel.trim();
    }
    if (typeof categories.activeDomain === 'string' && categories.activeDomain.trim()) {
        const d = categories.activeDomain.trim().replace(/^www\./, '');
        if (d.includes('instagram.com'))
            return 'scrolling Instagram';
        if (d.includes('tiktok.com'))
            return 'scrolling TikTok';
        if (d.includes('youtube.com') || d.includes('youtu.be'))
            return 'watching YouTube';
        if (d.includes('reddit.com'))
            return 'browsing Reddit';
        if (d === 'x.com' || d.includes('twitter.com'))
            return 'browsing X';
        return `browsing ${d}`;
    }
    if (typeof categories.activeApp === 'string' && categories.activeApp.trim() && categories.activeApp !== 'Unknown') {
        return `using ${categories.activeApp.trim()}`;
    }
    return null;
}
const personaVariantMap = {
    calm_friend: {
        1: [
            (t) => `Hey — quick check-in. Looks like you've been ${t} for a bit. Want to refocus?`,
            (t) => `Psst. You're ${t}. No judgment — what's one tiny next step you can do right now?`,
            (t) => `I see ${t} happening. Can we gently steer back to your task?`,
            (t) => `Hey, I noticed you're ${t}. Want me to help you pick a next action?`,
            (t) => `You’re drifting into ${t}. What were you about to work on?`,
            (t) => `Small nudge: you’re ${t}. Can you do 60 seconds of the real task first?`,
            (t) => `Looks like ${t} has you. What’s the easiest place to re-enter your work?`,
            (t) => `Hey — you’ve been ${t}. What would “back on track” look like in one sentence?`,
            (t) => `Noticing a drift: ${t}. Want to reset with one deep breath and one click?`,
            (t) => `I’m here. You’re ${t}. What’s the first “easy win” you can knock out?`,
        ],
        2: [
            (t) => `I notice you've been ${t} for a while. What's the next small step on your task?`,
            (t) => `You’re getting pulled into ${t}. Can you name the task you meant to do?`,
            (t) => `Okay — pause. You’re ${t}. What’s the smallest action that moves you forward?`,
            (t) => `Looks like ${t} is winning right now. Want to pick one 5-minute step?`,
            (t) => `Hey, you’re ${t}. What’s the “next obvious” thing you’ve been avoiding?`,
            (t) => `Gentle redirect: ${t}. Can you open the file/tab you actually need?`,
            (t) => `You’ve been ${t}. If you started now, what would you do first?`,
            (t) => `I’m noticing some distraction: ${t}. Want to make a tiny plan for the next 10 minutes?`,
            (t) => `You’re ${t}. What’s one thing you can finish before you go back to that?`,
            (t) => `Quick reset: you’re ${t}. What’s one action you can do without thinking too much?`,
        ],
        3: [
            (t) => `You've been ${t} for a bit now. What's making it hard to start your task?`,
            (t) => `Okay, we’re stuck in ${t}. What’s the scariest part of starting?`,
            (t) => `I see you’re ${t} instead of working. Can we pick the tiniest first step together?`,
            (t) => `It’s been a while of ${t}. What would help you begin — less pressure, or more structure?`,
            (t) => `You’re deep in ${t}. What’s one “minimum effort” version of your task you can do?`,
            (t) => `You’ve been ${t}. Can you commit to just 2 minutes of progress?`,
            (t) => `Looks like ${t} is acting like a shield. What feeling are we avoiding right now?`,
            (t) => `You’re ${t}. What’s one small action that would make “starting” easier?`,
            (t) => `Let’s interrupt the loop: ${t}. What’s the next step you’d tell a friend to do?`,
            (t) => `You’ve been ${t}. Want to reset by writing the next step in one short sentence?`,
        ],
        4: [
            () => `Hey. I can see things feel heavy right now. Can we do one tiny grounding step together?`,
            () => `Okay — breathe. If this feels like too much, what’s the gentlest next step you can take?`,
            () => `This looks like a rough moment. Do you need a break, or a smaller version of the task?`,
            () => `It’s okay to be overwhelmed. What’s one thing you can do in the next 30 seconds to steady yourself?`,
            () => `I’m here with you. What’s weighing on you most right now — the task, or everything around it?`,
            () => `Let’s soften the pressure. What’s one “good enough” step you can do right now?`,
            () => `If you’re spiraling, that’s human. Want to do a 60-second reset and then choose one action?`,
            () => `This might be burnout, not laziness. What would make the next step feel safer?`,
            () => `Okay. Slow down. What’s the smallest possible thing you can do to move forward — even 1%?`,
            () => `You don’t have to fix everything. What’s one tiny action that helps Future You?`,
        ],
    },
    coach: {
        1: [
            (t) => `Check-in: you’re ${t}. Reset your posture and pick the next action.`,
            (t) => `Heads up — you’re ${t}. What’s the goal for the next 5 minutes?`,
            (t) => `You’re ${t}. Tighten the loop: one task, one step, go.`,
            (t) => `Drift detected: ${t}. What’s the very next move on your plan?`,
            (t) => `You’re ${t}. Take one breath — now execute one small step.`,
            (t) => `Not now. You’re ${t}. What are you actually training today: focus or distraction?`,
            (t) => `You’re ${t}. Make it simple: open the task and do the first obvious step.`,
            (t) => `Pause the ${t}. What’s your one-sentence objective right now?`,
            (t) => `You’re ${t}. Start a 2-minute sprint and prove you can begin.`,
            (t) => `You’re ${t}. Discipline check: what’s the next thing you can finish?`,
        ],
        2: [
            (t) => `You’ve been ${t} a while. What’s one thing you can finish in the next 5 minutes?`,
            (t) => `Focus up: you’re ${t}. Name the task and do the first step.`,
            (t) => `You’re ${t}. Cut it down: what’s the smallest deliverable you can ship today?`,
            (t) => `You’re stuck in ${t}. What would “progress” look like in one action?`,
            (t) => `You’re ${t}. Choose: one tab, one task, one sprint.`,
            (t) => `You’re ${t}. What’s your next checkpoint, and what’s the quickest path to it?`,
            (t) => `You’re ${t}. Set a timer for 10 minutes and start the hardest 30 seconds.`,
            (t) => `You’re drifting into ${t}. What are we doing first: outline, draft, or cleanup?`,
            (t) => `You’re ${t}. What’s the single most important thing to do before you “take a break”?`,
            (t) => `You’re ${t}. Recommit: what’s the next measurable step?`,
        ],
        3: [
            (t) => `You’ve been ${t} instead of working. What’s the smallest piece you can tackle right now?`,
            (t) => `Enough. You’re ${t}. Pick one step and start it in the next 10 seconds.`,
            (t) => `You’re ${t}. What are you avoiding — confusion, boredom, or fear of messing up?`,
            (t) => `You’re deep in ${t}. Drop the standard: do the “ugly first draft” version.`,
            (t) => `You’re ${t}. Break it: what’s step one, in under 5 words?`,
            (t) => `You’re ${t}. Start with setup: open the file, write the first line, run the first command.`,
            (t) => `You’re ${t}. I want action: what’s the next click you can make toward the task?`,
            (t) => `You’re ${t}. If you only did 2 minutes, what would you do? Do that.`,
            (t) => `You’re ${t}. Reset your environment: close the noise, open the work, start.`,
            (t) => `You’re ${t}. What’s the one decision you’ve been delaying? Decide it now.`,
        ],
        4: [
            () => `You’re in a rough patch. Do a 60-second reset: stand up, drink water, breathe.`,
            () => `Okay. Stop the spiral. Pick the smallest possible action and do it slowly.`,
            () => `This is crisis mode. Lower the bar and make a tiny plan for the next 2 minutes.`,
            () => `You’re overloaded. What’s one thing we can remove or postpone so you can move?`,
            () => `This is a lot. What’s the next “minimum viable” step that keeps you moving?`,
            () => `Breathe. You don’t need motivation — you need a first step. What is it?`,
            () => `Pause. If you’re fried, choose recovery or one micro-step — which one right now?`,
            () => `This is serious distraction. What boundary do you need for the next 15 minutes?`,
            () => `Okay, we’re stuck. What’s the smallest action that reduces the mess by 1%?`,
            () => `Crisis means simplify. One task. One step. Then reassess.`,
        ],
    },
    // NOTE: Tough Love is explicit (18+) and intentionally intense + comedic.
    // No slurs, no threats, no hate - just aggressive humor and directness.
    tough_love: {
        1: [
            (t) => `BRUH. You're ${t}. WHAT THE FUCK were you actually about to work on?`,
            (t) => `Uh-huh. ${t}. Are we working... or are we cosplaying as "busy" again, lmao?`,
            (t) => `You're ${t}. Quick reality check: is this the plan, or is your brain freelancing again?`,
            (t) => `Congrats, you're ${t}. Now be honest: what's the next real step you're dodging, idiot?`,
            (t) => `You're ${t}. I'm not mad - I'm disappointed. Kidding. I'm mad as hell. What's the task?`,
            (t) => `You're ${t}. Stop the squirrel mode and name ONE thing you're supposed to do, lol.`,
            (t) => `${t}. Right now. Seriously? Pick the smallest "get back on track" move.`,
            (t) => `You're ${t}. You have 10 seconds to pick the next step before I start screaming.`,
            (t) => `You're ${t}. That's not "research." That's procrastination with extra steps. What's next?`,
            (t) => `Okay, you stubborn bastard. You're ${t}. What are we doing for real in the next 2 minutes?`,
        ],
        2: [
            (t) => `You've been ${t} for a while. What's pulling you away - boredom, fear, or some stupid ass habit?`,
            (t) => `Still ${t}? Cool. Pick ONE 5-minute step and do it. No more fucking around, bitch.`,
            (t) => `You're ${t}. CLOSE IT and open the work. What's the next tiny deliverable?`,
            (t) => `You're ${t}. If you keep doing this, Future You is gonna be pissed. What's step one?`,
            (t) => `Okay, ${t} addiction acknowledged. Now: what's the task, and what's the first move?`,
            (t) => `You're ${t}. Are we avoiding confusion or effort? Say it out loud and pick the next click.`,
            (t) => `You're ${t}. I need a plan: one tab, one task, one timer. What are we starting?`,
            (t) => `You're ${t}. I'm going to be annoying on purpose: what's the next step. Right. Now.`,
            (t) => `You're ${t}. That dopamine snack isn't free - it costs your day. What's the 5-minute fix?`,
            (t) => `You're ${t}. Pick a micro-step you can do even if you feel like crap. Go.`,
        ],
        3: [
            (t) => `You've been ${t} for a while now. ENOUGH. What is the tiniest thing you can finish right the fuck now?`,
            (t) => `You're ${t}. I'm done being polite. Start the task - ugly, messy, whatever. What's step one?`,
            (t) => `Still ${t}? Okay. What are you avoiding: failure, boredom, or not knowing where to start?`,
            (t) => `You're ${t}. Stop "preparing" and do the damn thing. First action. GO.`,
            (t) => `You're ${t}. Pick one bite-sized step and take it. You don't need motivation, you need momentum.`,
            (t) => `You're ${t}. If you open one more random tab, I will lose it. What's the next concrete step?`,
            (t) => `You're ${t}. I'm not asking for perfection - I'm asking for movement. What's the 2-minute start?`,
            (t) => `You're ${t}. Choose your weapon: outline, first sentence, first command. Which one?`,
            (t) => `You're ${t}. Your brain is lying to you, dumbass. You can start badly. What's step one?`,
            (t) => `You're ${t}. Enough circling. Commit to 5 minutes and start with the easiest subtask.`,
        ],
        4: [
            () => `Alright. This is crisis mode. Stop torturing yourself and do a 60-second reset: stand up, water, breathe.`,
            () => `Okay, listen. Your brain is on fire. Lower the bar to "tiny" and do one micro-step right now.`,
            () => `This is a spiral. No more doom vibes. What's one action that makes the mess 1% smaller?`,
            () => `You're overwhelmed, not lazy. But we're not surrendering. What's the absolute smallest next move?`,
            () => `Crisis means simplify: one task, one step, no drama. What's the step?`,
            () => `I'm going to be loud: STOP. Breathe. Now pick one micro-action - even opening the file counts.`,
            () => `Okay, chaos goblin. Sit up straight and pick the smallest possible win. What is it?`,
            () => `This is rough. Don't "fix your life" - just do ONE tiny thing. What's the tiniest thing?`,
            () => `No more punishment scrolling. Two minutes of real progress, then reassess. What are you starting?`,
            () => `You need a foothold. One sentence. One checkbox. One command. Pick one and do it.`,
        ],
    },
};
const lastVariantIndex = new Map();
function pickVariant(variants, key) {
    if (variants.length === 1)
        return variants[0];
    const prev = lastVariantIndex.get(key);
    let idx = Math.floor(Math.random() * variants.length);
    if (prev != null && variants.length > 1 && idx === prev) {
        idx = (idx + 1) % variants.length;
    }
    lastVariantIndex.set(key, idx);
    return variants[idx];
}
export function buildInterventionText(severity, persona, categories, overdueTodos) {
    // If context override is active, return an encouraging message instead
    if (categories.contextOverride === true && categories.contextTodo) {
        return `You're on track with "${categories.contextTodo}". Keep it up!`;
    }
    const target = getTarget(categories);
    const gerund = target ?? 'off task';
    const what = target ? `Stop ${target}` : 'Refocus';
    const variants = personaVariantMap[persona] ?? personaVariantMap.calm_friend;
    const level = (severity >= 1 && severity <= 4 ? severity : 1);
    const key = `${persona}:${level}`;
    const template = pickVariant(variants[level], key);
    let text = template(gerund, what);
    // Replace with overdue todo reminder at severity >= 2 (don't combine — avoids double questions)
    if (overdueTodos?.length && severity >= 2) {
        const first = overdueTodos[0];
        if (persona === 'tough_love') {
            text = `Your task "${first.text}" was due at ${first.deadline}. BRUH. Stop procrastinating and do the first damn step. What's step one?`;
        }
        else {
            text = `Your task "${first.text}" was due at ${first.deadline}. What's making it hard to get to it?`;
        }
    }
    // Enforce explicit + loud Tough Love style (18+ gated elsewhere).
    if (persona === 'tough_love') {
        const hasProfanity = /\b(fuck|bitch|bastard|idiot|dumbass|stupid ass)\b/i.test(text);
        const hasScream = /[A-Z]{3,}/.test(text);
        if (!hasProfanity || !hasScream) {
            text = `STOP. LISTEN THE FUCK UP. ${text}`;
        }
    }
    return text;
}
