import type { Persona, Severity, TodoItem } from '@norot/shared';
import { PERSONAS } from '@norot/shared';
import * as database from './database';

const BASE_URL = 'https://api.elevenlabs.io/v1';

async function fetchWithNetworkError(
  url: string,
  init: RequestInit,
  errorPrefix: string
): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    if (err instanceof TypeError || (err instanceof Error && err.name === 'TimeoutError')) {
      console.error(`[elevenlabs-agent] Network/timeout error ${errorPrefix}:`, err);
      throw new Error(`${errorPrefix}:network`);
    }
    throw err;
  }
}

const AGENT_CONFIG_VERSION = 16;

const COACH_TURN_CONFIG = {
  // ElevenLabs enforces turn_timeout in [1, 30] seconds.
  turn_timeout: 30,
  // Use -1 to disable auto-hangup; renderer explicitly ends sessions.
  silence_end_call_timeout: -1,
  mode: 'silence',
} as const;

const CHECKIN_TURN_CONFIG = {
  turn_timeout: 30,
  // Use -1 to disable auto-hangup; renderer explicitly ends sessions.
  silence_end_call_timeout: -1,
  mode: 'silence',
} as const;

const COACH_LLM_MODEL_ID = 'gpt-4o-mini';

const SKIP_TURN_TOOL = {
  type: 'system',
  name: 'skip_turn',
  description: 'Wait silently when the user needs a moment.',
} as const;

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
      deadline: { type: 'string', description: 'Deadline time. Prefer HH:MM 24-hour format (e.g. "17:00", "22:00"), but short forms like "10pm" are OK. For relative times, use deadline_offset_minutes instead. Omit to keep unchanged.' },
      app: { type: 'string', description: 'App name to associate. Omit to keep unchanged.' },
      start_time: { type: 'string', description: 'Start time. Prefer HH:MM 24-hour format (e.g. "14:00", "09:30"), but short forms like "now" or "10am" are OK. For relative times, use start_offset_minutes instead. Omit to keep unchanged.' },
      duration_minutes: { type: 'number', description: 'Duration in minutes. Omit to keep unchanged.' },
      start_offset_minutes: {
        type: 'number',
        description: 'Minutes from now to start. Use 0 for "now", 30 for "in 30 min". Prefer this over start_time for relative times. Omit to keep unchanged.',
      },
      deadline_offset_minutes: {
        type: 'number',
        description: 'Minutes from now for deadline. Use 60 for "in 1 hour", 120 for "in 2 hours". Prefer this over deadline for relative times. Omit to keep unchanged.',
      },
      url: { type: 'string', description: 'Relevant URL. Omit to keep unchanged.' },
      allowed_apps: {
        type: 'array',
        // ElevenLabs validates tool param schemas; string nodes must include a description (or similar metadata).
        // See: docs/error-patterns/elevenlabs-agent-422-tool-schema.md
        items: { type: 'string', description: 'An allowed app or website.' },
        description: 'Allowed apps/sites during this task. Omit to keep unchanged.',
      },
    },
  },
  expects_response: true,
} as const;

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
} as const;

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
} as const;

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
} as const;

const ADD_TODO_TOOL = {
  type: 'client',
  name: 'add_todo',
  description: "Add a new task to the user's draft list. You MUST provide start_time AND deadline (or enough info to calculate both) before calling this tool. Do NOT call add_todo with only one time. Duration is auto-calculated - never ask for it.",
  parameters: {
    type: 'object',
    required: ['text'],
    properties: {
      text: { type: 'string', description: 'Task description.' },
      duration_minutes: { type: 'number', description: 'Duration in minutes. Usually auto-calculated from start_time and deadline - only provide if the user gives a duration with one time endpoint.' },
      start_time: { type: 'string', description: 'Start time. Prefer HH:MM 24-hour format (e.g. "14:00", "09:30"), but short forms like "now" or "10am" are OK. REQUIRED - must be provided or calculable (e.g. deadline + duration_minutes). For relative times, use start_offset_minutes instead.' },
      deadline: { type: 'string', description: 'Deadline/end time. Prefer HH:MM 24-hour format (e.g. "17:00", "22:00"), but short forms like "10pm" are OK. REQUIRED - must be provided or calculable (e.g. start_time + duration_minutes). For relative times, use deadline_offset_minutes instead.' },
      app: { type: 'string', description: 'Primary app (e.g. "VS Code", "Chrome"). Omit if not discussed.' },
      url: { type: 'string', description: 'Relevant URL. Omit if not discussed.' },
      start_offset_minutes: {
        type: 'number',
        description: 'Minutes from now to start. Use 0 for "now", 30 for "in 30 min". Prefer this over start_time for relative times.',
      },
      deadline_offset_minutes: {
        type: 'number',
        description: 'Minutes from now for deadline. Use 60 for "in 1 hour", 120 for "in 2 hours". Prefer this over deadline for relative times.',
      },
      allowed_apps: {
        type: 'array',
        // ElevenLabs validates tool param schemas; string nodes must include a description (or similar metadata).
        // See: docs/error-patterns/elevenlabs-agent-422-tool-schema.md
        items: { type: 'string', description: 'An allowed app or website.' },
        description: 'Allowed apps/sites during this task. Omit if not discussed.',
      },
    },
  },
  expects_response: true,
} as const;

const ALL_TOOLS = [SKIP_TURN_TOOL, LIST_TODOS_TOOL, ADD_TODO_TOOL, UPDATE_TODO_TOOL, DELETE_TODO_TOOL, TOGGLE_TODO_TOOL];

export const ELEVENLABS_AGENT_TOOLS = ALL_TOOLS;

const PERSONA_STYLES: Record<Persona, string> = {
  calm_friend: 'warm, supportive, and empathetic',
  coach: 'firm, encouraging, and motivating',
  tough_love: 'direct, no-nonsense, and blunt',
};

export interface CheckinContext {
  score: number;
  severity: Severity;
  activeApp: string;
  activeDomain?: string;
  activeTodos: TodoItem[];
  overdueTodos: TodoItem[];
}

function buildCoachPrompt(
  persona: Persona,
  explicitToughLove: boolean
): { prompt: string; firstMessage: string } {
  const style = PERSONA_STYLES[persona];

  if (explicitToughLove) {
    return {
      prompt: [
        `You are noRot, an aggressive, funny productivity coach with a ${style} style.`,
        'Be extremely concise: respond in 1 short sentence (max ~20 words). If you need info, ask exactly 1 short question.',
        'Profanity OK (18+). No slurs/hate/threats. Do not insult identity; roast the procrastination loop. Avoid shame/guilt (ADHD-aware).',
        'The user\'s current tasks are: {{existing_todos}}. Refer to these if relevant; do not re-add tasks that already exist.',
        'Scope: computer tasks only. If they mention offline stuff, acknowledge briefly and pivot to a computer next step.',
        'Tasks: for each task, collect: (1) task description, (2) start time, (3) end time/deadline. Do NOT call add_todo until you have both start time and deadline (or one time + duration). Duration is auto-calculated - never ask for it. Timing can be relative or exact; do not require HH:MM format. When calling tools, convert times to HH:MM 24h or use offset_minutes fields.',
        'Tools: if you have enough info, call add_todo (or update_todo for an existing task) BEFORE replying. Then reply with the tool response verbatim. Never claim you added/updated/deleted a task unless a tool call succeeded. If a time is missing, ask exactly 1 short question to get it. Use list_todos if ambiguous. If silence/thinking, use skip_turn.',
      ].join(' '),
      firstMessage: 'Top 3 computer tasks today — go.',
    };
  }

  return {
      prompt: [
        `You are noRot, a productivity coach with a ${style} style.`,
        'Be extremely concise: respond in 1 short sentence (max ~20 words). If you need info, ask exactly 1 short question.',
        'Never shame/blame (ADHD-aware).',
        'The user\'s current tasks are: {{existing_todos}}. Refer to these if relevant; do not re-add tasks that already exist.',
        'Scope: computer tasks only. If they mention offline stuff, acknowledge briefly and pivot to a computer next step.',
        'Tasks: for each task, collect: (1) task description, (2) start time, (3) end time/deadline. Do NOT call add_todo until you have both start time and deadline (or one time + duration). Duration is auto-calculated - never ask for it. Timing can be relative or exact; do not require HH:MM format. When calling tools, convert times to HH:MM 24h or use offset_minutes fields.',
        'Tools: if you have enough info, call add_todo (or update_todo for an existing task) BEFORE replying. Then reply with the tool response verbatim. Never claim you added/updated/deleted a task unless a tool call succeeded. If a time is missing, ask exactly 1 short question to get it. Use list_todos if ambiguous. If silence/thinking, use skip_turn.',
      ].join(' '),
    firstMessage: 'What computer task are you doing next - when does it start and when is it due?',
  };
}

/**
 * PATCHes an existing agent's config (prompt + turn timeouts).
 */
async function patchCoachAgentConfig(
  apiKey: string,
  agentId: string,
  persona: Persona,
  explicitToughLove: boolean
): Promise<void> {
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
    const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 500);
    throw new Error(`patch_agent:${res.status}:${snippet}`);
  }
  console.log('[elevenlabs-agent] PATCHed agent config for:', agentId);
}

/**
 * Ensures an ElevenLabs Conversational AI agent exists for the given persona,
 * creating one if needed. Returns the agentId and a signed URL for connecting
 * from the renderer process.
 */
export async function ensureAgent(
  apiKey: string,
  persona: Persona
): Promise<{ agentId: string; signedUrl: string }> {
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
      } catch (patchErr) {
        console.warn('[elevenlabs-agent] Could not patch agent config, will recreate:', patchErr);
        needsRecreate = true;
      }
    }

    if (!needsRecreate) {
      try {
        const signedUrl = await getSignedUrl(apiKey, settings.elevenLabsAgentId);
        return { agentId: settings.elevenLabsAgentId, signedUrl };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : '';
        // 404 = agent deleted, 401/403 = agent inaccessible (stale cache, different account, etc.)
        if (errMsg.includes('404') || errMsg.includes('401') || errMsg.includes('403')) {
          console.log('[elevenlabs-agent] Cached agent unusable, will recreate:', errMsg);
          needsRecreate = true;
        } else {
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
let lastCheckinAgentId: string | null = null;

/**
 * Best-effort deletion of an ElevenLabs agent. Fire-and-forget.
 */
async function deleteAgent(apiKey: string, agentId: string): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/convai/agents/${encodeURIComponent(agentId)}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': apiKey },
      signal: AbortSignal.timeout(5_000),
    });
    if (res.ok || res.status === 404) {
      console.log('[elevenlabs-agent] Deleted old check-in agent:', agentId);
    } else {
      console.warn(`[elevenlabs-agent] Failed to delete agent ${agentId}: ${res.status}`);
    }
  } catch (err) {
    console.warn('[elevenlabs-agent] Error deleting agent:', err);
  }
}

/**
 * Creates a fresh ElevenLabs check-in agent for severity 3+ interventions.
 * Unlike ensureAgent, this is never cached — context changes each time.
 * Cleans up any previously created check-in agent to avoid leaking resources.
 */
export async function ensureCheckinAgent(
  apiKey: string,
  persona: Persona,
  context: CheckinContext
): Promise<{ agentId: string; signedUrl: string }> {
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

  let agentId: string;
  try {
    agentId = await createCheckinAgent(apiKey, persona, context, explicitToughLove);
  } catch (err) {
    // Creation failed — nothing to clean up
    throw err;
  }

  try {
    const signedUrl = await getSignedUrl(apiKey, agentId);
    lastCheckinAgentId = agentId;
    console.log('[elevenlabs-agent] Check-in agent created:', agentId);
    return { agentId, signedUrl };
  } catch (err) {
    // Signed URL failed — clean up the agent we just created
    deleteAgent(apiKey, agentId);
    throw err;
  }
}

async function createCheckinAgent(
  apiKey: string,
  persona: Persona,
  context: CheckinContext,
  explicitToughLove: boolean
): Promise<string> {
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
    'Your job: a brief check-in that gets them moving.',
    'Be extremely concise: 1 short sentence (max ~20 words). If you need info, ask exactly 1 short question.',
    'Scope: computer tasks only; if offline topic, acknowledge briefly and pivot to a computer next step.',
    explicitToughLove
      ? 'Tone: angry, loud, funny, and blunt. You MAY use profanity (18+).'
      : 'Tone: supportive, ADHD-aware, and non-judgmental.',
    explicitToughLove
      ? "No slurs, hate, or threats. Do not insult the user's identity - roast the behavior/loop."
      : 'Do not shame or guilt-trip. Adding guilt makes it worse.',
    'Goal: identify the intended task and give ONE smallest next step to start now.',
    'Tools: add_todo for new tasks - you MUST have both start time and deadline (or enough info to calculate both) before calling add_todo; duration is auto-calculated. If you have enough info, call the tool BEFORE replying, then reply with the tool response verbatim. Never claim you added/updated/deleted a task unless a tool call succeeded. Convert times to HH:MM 24h or use offset_minutes fields. Offer to toggle done when they finish. Use list_todos if ambiguous. If silence/thinking, use skip_turn.',
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

  const res = await fetchWithNetworkError(
    `${BASE_URL}/convai/agents/create`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    },
    'create_agent'
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[elevenlabs-agent] Failed to create check-in agent: ${res.status} ${res.statusText} — ${text}`);
    const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 500);
    throw new Error(`create_agent:${res.status}:${snippet}`);
  }

  const data = (await res.json()) as { agent_id?: string };
  if (!data.agent_id) {
    throw new Error('[elevenlabs-agent] API response missing agent_id');
  }
  return data.agent_id;
}

async function createAgent(apiKey: string, persona: Persona, explicitToughLove: boolean): Promise<string> {
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

  const res = await fetchWithNetworkError(
    `${BASE_URL}/convai/agents/create`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    },
    'create_agent'
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[elevenlabs-agent] Failed to create agent: ${res.status} ${res.statusText} — ${text}`);
    const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 500);
    throw new Error(`create_agent:${res.status}:${snippet}`);
  }

  const data = (await res.json()) as { agent_id?: string };
  if (!data.agent_id) {
    throw new Error('[elevenlabs-agent] API response missing agent_id');
  }
  return data.agent_id;
}

async function getSignedUrl(apiKey: string, agentId: string): Promise<string> {
  const url = `${BASE_URL}/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`;

  const res = await fetchWithNetworkError(
    url,
    {
      headers: {
        'xi-api-key': apiKey,
      },
      signal: AbortSignal.timeout(10_000),
    },
    'get_signed_url'
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[elevenlabs-agent] Failed to get signed URL: ${res.status} ${res.statusText} — ${text}`);
    const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 500);
    throw new Error(`get_signed_url:${res.status}:${snippet}`);
  }

  const data = (await res.json()) as { signed_url?: string };
  if (!data.signed_url) {
    throw new Error('[elevenlabs-agent] API response missing signed_url');
  }
  return data.signed_url;
}
