import { GoogleGenAI, Type } from '@google/genai';
import { randomUUID } from 'crypto';
import { SEVERITY_BANDS, PERSONAS } from '@norot/shared';
import { filterComputerScopedTodos } from './todo-scope';
let cachedClient = null;
let cachedApiKey = '';
export function getClient(apiKey) {
    if (cachedClient && cachedApiKey === apiKey)
        return cachedClient;
    cachedClient = new GoogleGenAI({ apiKey });
    cachedApiKey = apiKey;
    return cachedClient;
}
async function generateScriptInternal(opts) {
    const { apiKey, severity, persona, context } = opts;
    const toughLoveExplicitAllowed = opts.toughLoveExplicitAllowed ?? false;
    try {
        const band = SEVERITY_BANDS.find((b) => b.severity === severity);
        if (!band || band.mode === 'none')
            return null;
        const personaInfo = PERSONAS[persona];
        const client = getClient(apiKey);
        const isExplicitToughLove = persona === 'tough_love' && toughLoveExplicitAllowed;
        const baseIntro = `You are a procrastination interrupter app called noRot. ` +
            `Your persona is "${personaInfo.label}" — ${personaInfo.description}. ` +
            `Many users have ADHD or executive-function challenges. Procrastination is not laziness — it is often an emotion-regulation difficulty.\n`;
        let systemInstruction = '';
        let userPrompt = '';
        if (!context) {
            systemInstruction =
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
        }
        else {
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
            systemInstruction =
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
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction,
                temperature: 0.9,
                maxOutputTokens: 100,
            },
        });
        const text = response.text?.trim();
        if (!text) {
            console.warn(context
                ? '[gemini] Empty context-aware response from Gemini'
                : '[gemini] Empty response from Gemini');
            return null;
        }
        return text;
    }
    catch (err) {
        console.error(context
            ? '[gemini] Error generating context-aware script:'
            : '[gemini] Error generating script:', err);
        return null;
    }
}
export async function generateScript(apiKey, severity, persona, toughLoveExplicitAllowed = false) {
    return generateScriptInternal({ apiKey, severity, persona, toughLoveExplicitAllowed });
}
export async function generateContextAwareScript(apiKey, severity, persona, context, toughLoveExplicitAllowed = false) {
    return generateScriptInternal({ apiKey, severity, persona, context, toughLoveExplicitAllowed });
}
/**
 * Map ChatMessage roles to Gemini API roles.
 * Gemini uses 'model' instead of 'assistant'.
 */
function toGeminiRole(role) {
    return role === 'assistant' ? 'model' : 'user';
}
/**
 * Stream a chat response token-by-token.
 * Yields text chunks as they arrive from Gemini.
 */
export async function* streamChat(apiKey, messages, systemInstruction) {
    const client = getClient(apiKey);
    const contents = messages.map((msg) => ({
        role: toGeminiRole(msg.role),
        parts: [{ text: msg.content }],
    }));
    const response = await client.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents,
        config: {
            systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 1024,
        },
    });
    for await (const chunk of response) {
        const text = chunk.text;
        if (text)
            yield text;
    }
}
/**
 * Extract actionable todos from a chat transcript with app suggestions.
 * Returns structured TodoItem[] using Gemini's JSON response mode.
 */
export async function extractTodosWithApps(apiKey, transcript) {
    try {
        const client = getClient(apiKey);
        function normalizeDeadline(val) {
            if (typeof val !== 'string')
                return undefined;
            const trimmed = val.trim();
            const m = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
            if (!m)
                return undefined;
            const hh = Number(m[1]);
            const mm = Number(m[2]);
            if (!Number.isFinite(hh) || !Number.isFinite(mm))
                return undefined;
            if (hh < 0 || hh > 23 || mm < 0 || mm > 59)
                return undefined;
            return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        }
        const systemInstruction = 'You are a task extraction assistant for noRot, a computer productivity tool. ' +
            'Given a conversation transcript, extract clear, actionable to-do items the user can do on their computer (apps/websites). ' +
            'Do NOT include physical-world activities (errands, going places, chores, exercise, shower, etc.). ' +
            'If the transcript only contains offline activities, return an empty list. ' +
            'Return only items that represent concrete tasks the user should do. ' +
            'Do NOT include vague suggestions or things the assistant will do. ' +
            'For each task, suggest a primary app (e.g. "VS Code", "Chrome", "Figma"), ' +
            'a URL if applicable, and a list of allowed apps/websites relevant to that task. ' +
            'If you cannot suggest a reasonable app/allowed list, omit the task. ' +
            'If timing is not stated clearly, omit it (do not guess). ' +
            'If a deadline is mentioned (e.g. "by 5pm"), include deadline in HH:MM 24-hour time. ' +
            'If a start time is mentioned (e.g. "starting at 3pm", "at 14:00"), include startTime in HH:MM 24-hour time. ' +
            'If duration is mentioned (e.g. "takes 2 hours", "about 30 minutes"), include durationMinutes as a number.';
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Extract actionable to-do items from this conversation:\n\n${transcript}`,
            config: {
                systemInstruction,
                temperature: 0.2,
                maxOutputTokens: 1024,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            text: {
                                type: Type.STRING,
                                description: 'The task description',
                            },
                            app: {
                                type: Type.STRING,
                                description: 'Primary app for this task (e.g. "VS Code", "Chrome", "Figma")',
                            },
                            url: {
                                type: Type.STRING,
                                description: 'Relevant URL if applicable (e.g. "github.com")',
                            },
                            allowedApps: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                                description: 'List of apps/websites allowed for this task',
                            },
                            deadline: {
                                type: Type.STRING,
                                description: 'Optional deadline time in HH:MM (24-hour) if explicitly stated (do not guess)',
                            },
                            startTime: {
                                type: Type.STRING,
                                description: 'Start time in HH:MM (24-hour) if explicitly stated (do not guess)',
                            },
                            durationMinutes: {
                                type: Type.NUMBER,
                                description: 'Estimated duration in minutes if explicitly stated (e.g. 30, 60, 120)',
                            },
                        },
                        required: ['text'],
                    },
                },
            },
        });
        const raw = JSON.parse(response.text || '[]');
        const mapped = raw
            .map((item, i) => {
            const deadline = normalizeDeadline(item.deadline);
            const startTime = normalizeDeadline(item.startTime);
            const durationMinutes = typeof item.durationMinutes === 'number' && item.durationMinutes > 0
                ? Math.trunc(item.durationMinutes)
                : undefined;
            const text = typeof item.text === 'string' ? item.text.trim() : '';
            return {
                id: randomUUID(),
                text,
                done: false,
                order: i,
                ...(item.app ? { app: item.app } : {}),
                ...(item.url ? { url: item.url } : {}),
                ...(item.allowedApps?.length ? { allowedApps: item.allowedApps } : {}),
                ...(deadline ? { deadline } : {}),
                ...(startTime ? { startTime } : {}),
                ...(durationMinutes ? { durationMinutes } : {}),
            };
        })
            .filter((t) => t.text.length > 0);
        const scoped = filterComputerScopedTodos(mapped);
        return scoped.map((t, i) => ({ ...t, order: i }));
    }
    catch (err) {
        console.error('[gemini] Error extracting todos:', err);
        return [];
    }
}
