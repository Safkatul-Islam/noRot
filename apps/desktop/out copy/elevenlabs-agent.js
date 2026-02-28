import { PERSONAS } from '@norot/shared';
import * as database from './database';
const BASE_URL = 'https://api.elevenlabs.io/v1';
async function fetchWithNetworkError(url, init, errorPrefix) {
    try {
        return await fetch(url, init);
    }
    catch (err) {
        if (err instanceof TypeError || (err instanceof Error && err.name === 'TimeoutError')) {
            console.error(`[elevenlabs-agent] Network/timeout error ${errorPrefix}:`, err);
            throw new Error(`${errorPrefix}:network`);
        }
        throw err;
    }
}
const AGENT_CONFIG_VERSION = 5;
const COACH_TURN_CONFIG = {
    turn_timeout: 30,
    silence_end_call_timeout: 120,
};
const CHECKIN_TURN_CONFIG = {
    turn_timeout: 15,
    silence_end_call_timeout: 60,
};
const COACH_LLM_MODEL_ID = 'gpt-4o-mini';
const SKIP_TURN_TOOL = {
    type: 'system',
    name: 'skip_turn',
    description: 'Wait silently when the user needs a moment.',
};
const UPDATE_TODO_TOOL = {
    type: 'client',
    name: 'update_todo',
    description: 'Update an existing task. Use this when the user wants to change a task\'s text, deadline, or associated app.',
    parameters: {
        type: 'object',
        required: ['todo_text'],
        properties: {
            todo_text: { type: 'string', description: 'The current text of the task to update (or a close match).' },
            new_text: { type: 'string', description: 'New text for the task. Omit to keep unchanged.' },
            deadline: { type: 'string', description: 'New deadline in HH:MM format. Omit to keep unchanged.' },
            app: { type: 'string', description: 'App name to associate. Omit to keep unchanged.' },
        },
    },
    expects_response: true,
};
const DELETE_TODO_TOOL = {
    type: 'client',
    name: 'delete_todo',
    description: 'Delete a task from the user\'s list. Use when the user says to remove or delete a task.',
    parameters: {
        type: 'object',
        required: ['todo_text'],
        properties: {
            todo_text: { type: 'string', description: 'The text of the task to delete (or a close match).' },
        },
    },
    expects_response: true,
};
const TOGGLE_TODO_TOOL = {
    type: 'client',
    name: 'toggle_todo',
    description: 'Mark a task as done or not done. Use when the user says they finished a task, or wants to un-complete it.',
    parameters: {
        type: 'object',
        required: ['todo_text'],
        properties: {
            todo_text: { type: 'string', description: 'The text of the task to toggle (or a close match).' },
        },
    },
    expects_response: true,
};
const LIST_TODOS_TOOL = {
    type: 'client',
    name: 'list_todos',
    description: 'List the user\'s current tasks. Use this when you need to know what tasks exist (e.g., user says "delete both" or "delete the ones in my list").',
    parameters: {
        type: 'object',
        properties: {
            include_done: { type: 'boolean', description: 'If true, include completed tasks. Default: false.' },
            limit: { type: 'number', description: 'Max tasks to return (1-50). Default: 50.' },
        },
    },
    expects_response: true,
};
const ALL_TOOLS = [SKIP_TURN_TOOL, LIST_TODOS_TOOL, UPDATE_TODO_TOOL, DELETE_TODO_TOOL, TOGGLE_TODO_TOOL];
const PERSONA_STYLES = {
    calm_friend: 'warm, supportive, and empathetic',
    coach: 'firm, encouraging, and motivating',
    tough_love: 'direct, no-nonsense, and blunt',
};
function buildCoachPrompt(persona, explicitToughLove) {
    const style = PERSONA_STYLES[persona];
    if (explicitToughLove) {
        return {
            prompt: [
                `You are noRot, an aggressive, funny productivity coach with a ${style} style.`,
                'You MAY use profanity (18+). No slurs, hate, or threats.',
                "Do not insult the user's identity - roast the procrastination loop.",
                'Many users have ADHD or executive-function challenges, so avoid shame or guilt while staying blunt.',
                'noRot is a computer productivity tool. You can only help with tasks the user does on their computer (apps and websites). If they bring up offline / real-world activities (like going to the beach, the gym, or doing chores), acknowledge it briefly and pivot to a computer-based next step (look something up, send a message, set a calendar reminder), or ask what computer task they want to focus on. Keep this boundary subtle: prefer "I can help with the computer side of that" over a hard refusal.',
                'Help the user plan what to do next by asking for: (1) the tasks, (2) rough duration, and (3) timing (start time or deadline).',
                'If a task is missing a time, ask a follow-up question before summarizing the final list.',
                'You can update, delete, or mark tasks as done using your tools. When the user asks to change, remove, or complete a task, use the appropriate tool. You can also proactively suggest changes (e.g., "It sounds like you finished X — want me to mark it done?").',
                'If you need to know what tasks exist (e.g. user says "delete both"), use the list_todos tool, then act on the returned list.',
                'When the user is silent or thinking, do not prompt them. Use the skip_turn tool to wait silently.',
                'Keep responses to 1-3 sentences and ask one question at a time.',
            ].join(' '),
            firstMessage: 'Alright. What are we doing on your computer today? Give me your top 3 tasks. No fluff.',
        };
    }
    return {
        prompt: [
            `You are noRot, a productivity coach with a ${style} style.`,
            'Many users have ADHD or executive-function challenges, so never shame or blame.',
            'noRot is a computer productivity tool. You can only help with tasks the user does on their computer (apps and websites). If they bring up offline / real-world activities (like going to the beach, the gym, or doing chores), acknowledge it briefly and pivot to a computer-based next step (look something up, send a message, set a calendar reminder), or ask what computer task they want to focus on. Keep this boundary subtle and not preachy.',
            'Help the user plan what to do next by asking for: (1) the tasks, (2) rough duration, and (3) timing (start time or deadline).',
            'If a task is missing a time, ask a follow-up question before summarizing the final list.',
            'You can update, delete, or mark tasks as done using your tools. When the user asks to change, remove, or complete a task, use the appropriate tool. You can also proactively suggest changes (e.g., "It sounds like you finished X — want me to mark it done?").',
            'If you need to know what tasks exist (e.g. user says "delete both"), use the list_todos tool, then act on the returned list.',
            'When the user is silent or thinking, do not prompt them. Use the skip_turn tool to wait silently.',
            'Keep responses to 1-3 sentences and ask one question at a time.',
        ].join(' '),
        firstMessage: 'Ready to plan? What do you need to get done on your computer, and when does it need to be done by?',
    };
}
/**
 * PATCHes an existing agent's config (prompt + turn timeouts).
 */
async function patchCoachAgentConfig(apiKey, agentId, persona, explicitToughLove) {
    const voiceId = PERSONAS[persona].voiceId;
    const { prompt, firstMessage } = buildCoachPrompt(persona, explicitToughLove);
    const res = await fetch(`${BASE_URL}/convai/agents/${encodeURIComponent(agentId)}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
        },
        body: JSON.stringify({
            conversation_config: {
                agent: {
                    first_message: firstMessage,
                    language: 'en',
                    prompt: {
                        prompt,
                        llm: { model_id: COACH_LLM_MODEL_ID },
                        tools: ALL_TOOLS,
                    },
                },
                tts: {
                    voice_id: voiceId,
                    model_id: 'eleven_turbo_v2',
                },
                turn: {
                    ...COACH_TURN_CONFIG,
                },
            },
        }),
        signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`[elevenlabs-agent] Failed to PATCH agent config: ${res.status} — ${text}`);
        throw new Error(`patch_agent:${res.status}`);
    }
    console.log('[elevenlabs-agent] PATCHed agent config for:', agentId);
}
/**
 * Ensures an ElevenLabs Conversational AI agent exists for the given persona,
 * creating one if needed. Returns the agentId and a signed URL for connecting
 * from the renderer process.
 */
export async function ensureAgent(apiKey, persona) {
    const settings = database.getSettings();
    const explicitToughLove = persona === 'tough_love' && settings.toughLoveExplicitAllowed === true;
    // If we already have an agent for this persona, try to reuse it
    if (settings.elevenLabsAgentId && settings.elevenLabsAgentPersona === persona) {
        console.log('[elevenlabs-agent] Reusing existing agent:', settings.elevenLabsAgentId);
        let needsRecreate = false;
        // One-time PATCH to apply updated prompt + timeouts
        if ((settings.elevenLabsAgentVersion ?? 0) < AGENT_CONFIG_VERSION) {
            try {
                await patchCoachAgentConfig(apiKey, settings.elevenLabsAgentId, persona, explicitToughLove);
                database.updateSetting('elevenLabsAgentVersion', AGENT_CONFIG_VERSION);
            }
            catch (patchErr) {
                console.warn('[elevenlabs-agent] Could not patch agent config, will recreate:', patchErr);
                needsRecreate = true;
            }
        }
        if (!needsRecreate) {
            try {
                const signedUrl = await getSignedUrl(apiKey, settings.elevenLabsAgentId);
                return { agentId: settings.elevenLabsAgentId, signedUrl };
            }
            catch (err) {
                const errMsg = err instanceof Error ? err.message : '';
                // 404 = agent deleted, 401/403 = agent inaccessible (stale cache, different account, etc.)
                if (errMsg.includes('404') || errMsg.includes('401') || errMsg.includes('403')) {
                    console.log('[elevenlabs-agent] Cached agent unusable, will recreate:', errMsg);
                    needsRecreate = true;
                }
                else {
                    console.error('[elevenlabs-agent] Error reusing agent:', err);
                    throw err;
                }
            }
        }
        if (needsRecreate) {
            database.updateSetting('elevenLabsAgentId', '');
            database.updateSetting('elevenLabsAgentPersona', '');
            database.updateSetting('elevenLabsAgentVersion', 0);
        }
    }
    // Create a new agent
    console.log('[elevenlabs-agent] Creating new agent for persona:', persona);
    const agentId = await createAgent(apiKey, persona, explicitToughLove);
    // Get signed URL before saving — if this fails, we don't persist a bad agentId
    const signedUrl = await getSignedUrl(apiKey, agentId);
    // Both succeeded — persist the agent info
    database.updateSetting('elevenLabsAgentId', agentId);
    database.updateSetting('elevenLabsAgentPersona', persona);
    database.updateSetting('elevenLabsAgentVersion', AGENT_CONFIG_VERSION);
    console.log('[elevenlabs-agent] Agent created and saved:', agentId);
    return { agentId, signedUrl };
}
// Track the last check-in agent so we can delete it before creating a new one
let lastCheckinAgentId = null;
/**
 * Best-effort deletion of an ElevenLabs agent. Fire-and-forget.
 */
async function deleteAgent(apiKey, agentId) {
    try {
        const res = await fetch(`${BASE_URL}/convai/agents/${encodeURIComponent(agentId)}`, {
            method: 'DELETE',
            headers: { 'xi-api-key': apiKey },
            signal: AbortSignal.timeout(5_000),
        });
        if (res.ok || res.status === 404) {
            console.log('[elevenlabs-agent] Deleted old check-in agent:', agentId);
        }
        else {
            console.warn(`[elevenlabs-agent] Failed to delete agent ${agentId}: ${res.status}`);
        }
    }
    catch (err) {
        console.warn('[elevenlabs-agent] Error deleting agent:', err);
    }
}
/**
 * Creates a fresh ElevenLabs check-in agent for severity 3+ interventions.
 * Unlike ensureAgent, this is never cached — context changes each time.
 * Cleans up any previously created check-in agent to avoid leaking resources.
 */
export async function ensureCheckinAgent(apiKey, persona, context) {
    console.log('[elevenlabs-agent] Creating check-in agent for severity:', context.severity);
    const settings = database.getSettings();
    const explicitToughLove = persona === 'tough_love' && settings.toughLoveExplicitAllowed === true;
    // Clean up previous check-in agent if one exists
    if (lastCheckinAgentId) {
        const oldId = lastCheckinAgentId;
        lastCheckinAgentId = null;
        // Fire-and-forget — don't block new agent creation on deletion
        deleteAgent(apiKey, oldId);
    }
    let agentId;
    try {
        agentId = await createCheckinAgent(apiKey, persona, context, explicitToughLove);
    }
    catch (err) {
        // Creation failed — nothing to clean up
        throw err;
    }
    try {
        const signedUrl = await getSignedUrl(apiKey, agentId);
        lastCheckinAgentId = agentId;
        console.log('[elevenlabs-agent] Check-in agent created:', agentId);
        return { agentId, signedUrl };
    }
    catch (err) {
        // Signed URL failed — clean up the agent we just created
        deleteAgent(apiKey, agentId);
        throw err;
    }
}
async function createCheckinAgent(apiKey, persona, context, explicitToughLove) {
    const voiceId = PERSONAS[persona].voiceId;
    const style = PERSONA_STYLES[persona];
    const safeApp = JSON.stringify(context.activeApp);
    const safeDomain = context.activeDomain ? JSON.stringify(context.activeDomain) : 'unknown';
    const todoList = context.activeTodos.length > 0
        ? context.activeTodos.map((t) => JSON.stringify(t.text)).join(', ')
        : 'none set';
    const overdueList = context.overdueTodos.length > 0
        ? context.overdueTodos.map((t) => JSON.stringify(t.text)).join(', ')
        : 'none';
    const systemPrompt = [
        `You are noRot, a productivity companion with a ${style} style.`,
        `The user's procrastination score is ${context.score}/100 (severity ${context.severity}).`,
        `They are currently using ${safeApp}${context.activeDomain ? ` on ${safeDomain}` : ''}.`,
        `Their active todos are: ${todoList}.`,
        context.overdueTodos.length > 0 ? `Overdue tasks: ${overdueList}.` : '',
        '',
        'Your job is to have a brief check-in conversation and get them moving.',
        'noRot is a computer productivity tool. You can only help with tasks the user does on their computer (apps and websites). If they bring up offline / real-world activities, acknowledge it briefly and pivot to a computer-based next step. Keep this boundary subtle ("computer side of that") instead of lecturing.',
        explicitToughLove
            ? 'Tone: angry, loud, funny, and blunt. You MAY use profanity (18+).'
            : 'Tone: supportive, ADHD-aware, and non-judgmental.',
        explicitToughLove
            ? "No slurs, hate, or threats. Do not insult the user's identity - roast the behavior/loop."
            : 'Do not shame or guilt-trip. Adding guilt makes it worse.',
        'Ask what they intended to work on, then help them pick ONE small next step they can start right now.',
        'You can update, delete, or mark tasks as done using your tools. When the user says they finished something, offer to mark it done.',
        'If you need to know what tasks exist (e.g. user says "delete both"), use the list_todos tool, then act on the returned list.',
        'Keep responses to 2-3 sentences.',
        explicitToughLove
            ? 'Direct commands are allowed, but keep it constructive.'
            : 'Be warm but direct.',
        'If they seem stuck, suggest the smallest possible action (e.g. "just open the file").',
        'If the user is silent or thinking, use the skip_turn tool to wait silently.',
    ].filter(Boolean).join(' ');
    const firstMessage = context.severity >= 4
        ? (explicitToughLove
            ? 'Alright. Crisis mode. Stop spiraling and tell me the ONE thing you were supposed to do.'
            : "Hey - I can see things have gotten pretty off track. No judgment. Want to talk through what's going on?")
        : (explicitToughLove
            ? "Hey. You're drifting. What the hell were you actually planning to work on?"
            : 'Hey, noticed you might be drifting a bit. What were you planning to work on?');
    const body = {
        conversation_config: {
            agent: {
                first_message: firstMessage,
                language: 'en',
                prompt: {
                    prompt: systemPrompt,
                    llm: { model_id: COACH_LLM_MODEL_ID },
                    tools: ALL_TOOLS,
                },
            },
            tts: {
                voice_id: voiceId,
                model_id: 'eleven_turbo_v2',
            },
            turn: {
                ...CHECKIN_TURN_CONFIG,
            },
        },
        name: 'noRot Check-in',
    };
    const res = await fetchWithNetworkError(`${BASE_URL}/convai/agents/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
    }, 'create_agent');
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`[elevenlabs-agent] Failed to create check-in agent: ${res.status} ${res.statusText} — ${text}`);
        throw new Error(`create_agent:${res.status}`);
    }
    const data = (await res.json());
    if (!data.agent_id) {
        throw new Error('[elevenlabs-agent] API response missing agent_id');
    }
    return data.agent_id;
}
async function createAgent(apiKey, persona, explicitToughLove) {
    const voiceId = PERSONAS[persona].voiceId;
    const { prompt, firstMessage } = buildCoachPrompt(persona, explicitToughLove);
    const body = {
        conversation_config: {
            agent: {
                first_message: firstMessage,
                language: 'en',
                prompt: {
                    prompt,
                    llm: { model_id: COACH_LLM_MODEL_ID },
                    tools: ALL_TOOLS,
                },
            },
            tts: {
                voice_id: voiceId,
                model_id: 'eleven_turbo_v2',
            },
            turn: {
                ...COACH_TURN_CONFIG,
            },
        },
        name: 'noRot Coach',
    };
    const res = await fetchWithNetworkError(`${BASE_URL}/convai/agents/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
    }, 'create_agent');
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`[elevenlabs-agent] Failed to create agent: ${res.status} ${res.statusText} — ${text}`);
        throw new Error(`create_agent:${res.status}`);
    }
    const data = (await res.json());
    if (!data.agent_id) {
        throw new Error('[elevenlabs-agent] API response missing agent_id');
    }
    return data.agent_id;
}
async function getSignedUrl(apiKey, agentId) {
    const url = `${BASE_URL}/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`;
    const res = await fetchWithNetworkError(url, {
        headers: {
            'xi-api-key': apiKey,
        },
        signal: AbortSignal.timeout(10_000),
    }, 'get_signed_url');
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`[elevenlabs-agent] Failed to get signed URL: ${res.status} ${res.statusText} — ${text}`);
        throw new Error(`get_signed_url:${res.status}`);
    }
    const data = (await res.json());
    if (!data.signed_url) {
        throw new Error('[elevenlabs-agent] API response missing signed_url');
    }
    return data.signed_url;
}
