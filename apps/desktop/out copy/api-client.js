import { getSettings } from './database';
let apiDownSince = null;
const SUPPRESS_INTERVAL_MS = 60_000;
function getBaseUrl() {
    return getSettings().apiUrl;
}
export async function scoreSnapshot(snapshot, snoozePressure = 0, persona) {
    try {
        const url = new URL(`${getBaseUrl()}/score`);
        url.searchParams.set('snoozePressure', String(snoozePressure));
        if (persona)
            url.searchParams.set('persona', persona);
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(snapshot),
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
            console.error(`[api-client] Score API returned ${response.status}`);
            return null;
        }
        if (apiDownSince !== null) {
            console.log('[api-client] Score API reconnected');
            apiDownSince = null;
        }
        return (await response.json());
    }
    catch (err) {
        const now = Date.now();
        if (apiDownSince === null) {
            console.error('[api-client] Score API unreachable, using local fallback:', err);
            apiDownSince = now;
        }
        else if (now - apiDownSince >= SUPPRESS_INTERVAL_MS) {
            console.warn('[api-client] Score API still unreachable (60s+). Using local fallback.');
            apiDownSince = now;
        }
        return null;
    }
}
