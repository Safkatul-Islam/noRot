const VALID_CODES = new Set(['NO_API_KEY', 'AUTH', 'RATE_LIMIT', 'NETWORK', 'UNKNOWN']);
const FALLBACK_ERROR = {
    code: 'UNKNOWN',
    message: 'Something went wrong starting voice. Try again, or switch to manual.',
    canRetry: true,
};
/**
 * Parse an IPC error into a structured VoiceAgentError.
 * The main process encodes errors as JSON in Error.message.
 * Electron prefixes thrown errors with "Error invoking remote method '...': ",
 * so we extract the JSON substring rather than parsing the whole string.
 */
export function parseVoiceError(err) {
    const raw = err instanceof Error ? err.message : String(err);
    try {
        const jsonStart = raw.indexOf('{');
        const jsonEnd = raw.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd <= jsonStart)
            return { ...FALLBACK_ERROR };
        const parsed = JSON.parse(raw.substring(jsonStart, jsonEnd + 1));
        if (parsed &&
            typeof parsed.code === 'string' &&
            typeof parsed.message === 'string' &&
            VALID_CODES.has(parsed.code)) {
            return {
                code: parsed.code,
                message: parsed.message,
                canRetry: Boolean(parsed.canRetry),
            };
        }
    }
    catch {
        // Not JSON — fall through
    }
    return { ...FALLBACK_ERROR };
}
