import { SEVERITY_BANDS, PERSONAS } from '@norot/shared';
import type { Severity, Persona } from '@norot/shared';
import type { ContextInfo } from './gemini-client';

function normalizeUrl(endpointUrl: string): string {
  let url = endpointUrl.trim().replace(/\/+$/, '');
  if (!url.endsWith('/v1/chat/completions')) {
    url += '/v1/chat/completions';
  }
  return url;
}

async function callAmdEndpoint(
  endpointUrl: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  const url = normalizeUrl(endpointUrl);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'meta-llama/Llama-3.1-8B-Instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 100,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    console.warn(`[amd] HTTP ${response.status} from vLLM endpoint`);
    return null;
  }

  const json = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() || null;
}

function buildPrompts(
  severity: Severity,
  persona: Persona,
  toughLoveExplicitAllowed: boolean,
  context?: ContextInfo,
): { systemPrompt: string; userPrompt: string } {
  const band = SEVERITY_BANDS.find((b) => b.severity === severity);
  if (!band || band.mode === 'none') return { systemPrompt: '', userPrompt: '' };

  const personaInfo = PERSONAS[persona];
  const isExplicitToughLove = persona === 'tough_love' && toughLoveExplicitAllowed;
  const baseIntro =
    `You are a procrastination interrupter app called noRot. ` +
    `Your persona is "${personaInfo.label}" — ${personaInfo.description}. ` +
    `Many users have ADHD or executive-function challenges. Procrastination is not laziness — it is often an emotion-regulation difficulty.\n`;

  let systemPrompt = '';
  let userPrompt = '';

  if (!context) {
    systemPrompt =
      baseIntro +
      `Rules:\n` +
      `- Write exactly 1-2 sentences.\n` +
      `- Speak directly to the user in second person.\n` +
      `- Do NOT mention any app names, websites, or personal data.\n` +
      `- Keep it natural for text-to-speech (no emojis, no markdown, no special characters).\n` +
      `- Match the intensity to the severity level.\n` +
      `- Be unique and varied each time — never repeat the same phrasing.\n` +
      (isExplicitToughLove
        ? `- You MAY use profanity and aggressive humor (18+). You can be loud, dramatic, and funny.\n` +
          `- Internet slang is okay (bruh, lol, lmao). All-caps emphasis is allowed.\n` +
          `- No slurs, hate, or threats. Don't insult the user's identity — roast the behavior/loop.\n` +
          `- It's okay to give direct commands (e.g., "Close it and start").\n`
        : `- Never shame or blame. Ask curious questions like "What's making it hard to start?" instead of commands like "Stop wasting time."\n`) +
      `- Suggest the smallest possible next step to lower the barrier to action.`;

    userPrompt =
      `Generate a ${band.mode}-level intervention message. ` +
      `Severity: ${severity}/4 (${band.label}). ` +
      `The user is procrastinating and needs a ${band.mode}.`;
  } else {
    const todoList = context.activeTodos
      .slice(0, 5)
      .map((t, i) => `${i + 1}. ${t.text}`)
      .join('\n');

    const matchedNote = context.matchedTodo
      ? `The user appears to be working on: "${context.matchedTodo}".`
      : 'The user does not appear to be working on any specific task.';

    const overdueNote = context.overdueTodos?.length
      ? `These tasks are past their deadline: ${context.overdueTodos.map((t) => `"${t.text}" (due ${t.deadline})`).join(', ')}. Mention a specific overdue task using a curious question, not a command.`
      : '';

    systemPrompt =
      baseIntro +
      `The user's active tasks:\n${todoList}\n\n` +
      `${matchedNote}\n` +
      (overdueNote ? `${overdueNote}\n` : '') +
      `They are currently using "${context.appName}"` +
      (context.domain ? ` on ${context.domain}` : '') + '.\n' +
      `Rules:\n` +
      `- Write exactly 1-2 sentences.\n` +
      `- Speak directly to the user in second person.\n` +
      `- If the user is doing something relevant to their task, encourage them.\n` +
      (isExplicitToughLove
        ? `- If not, redirect them hard with aggressive humor (18+). Profanity allowed.\n` +
          `- Internet slang is okay (bruh, lol, lmao). All-caps emphasis is allowed.\n` +
          `- No slurs, hate, or threats. Don't insult the user's identity — roast the behavior/loop.\n`
        : `- If not, gently redirect them toward their tasks with curiosity, not commands.\n` +
          `- Never shame or blame. Ask questions like "What's one small step you could try?" instead of "Stop wasting time."\n`) +
      `- Keep it natural for text-to-speech (no emojis, no markdown, no special characters).\n` +
      `- Match the intensity to the severity level.\n` +
      `- Be unique and varied each time.`;

    userPrompt = context.matchedTodo
      ? `The user is on task with "${context.matchedTodo}". Generate an encouraging message.`
      : `Generate a ${band.mode}-level intervention message. Severity: ${severity}/4 (${band.label}).`;
  }

  return { systemPrompt, userPrompt };
}

export async function generateScript(
  endpointUrl: string,
  apiKey: string,
  severity: Severity,
  persona: Persona,
  toughLoveExplicitAllowed: boolean = false,
): Promise<string | null> {
  try {
    const { systemPrompt, userPrompt } = buildPrompts(severity, persona, toughLoveExplicitAllowed);
    if (!systemPrompt) return null;
    return await callAmdEndpoint(endpointUrl, apiKey, systemPrompt, userPrompt);
  } catch (err) {
    console.error('[amd] Error generating script:', err);
    return null;
  }
}

export async function generateContextAwareScript(
  endpointUrl: string,
  apiKey: string,
  severity: Severity,
  persona: Persona,
  context: ContextInfo,
  toughLoveExplicitAllowed: boolean = false,
): Promise<string | null> {
  try {
    const { systemPrompt, userPrompt } = buildPrompts(severity, persona, toughLoveExplicitAllowed, context);
    if (!systemPrompt) return null;
    return await callAmdEndpoint(endpointUrl, apiKey, systemPrompt, userPrompt);
  } catch (err) {
    console.error('[amd] Error generating context-aware script:', err);
    return null;
  }
}
