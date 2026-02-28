import { powerMonitor } from 'electron';
import { classifyApp, extractDomain, isBrowser } from './window-classifier';
import { createActivityClassifier } from './activity/activity-classifier';
import { checkContextRelevance } from './context-checker';
// Cached dynamic import for ESM-only get-windows
let getActiveWindow = null;
async function activeWindow() {
    if (!getActiveWindow) {
        const mod = await import('get-windows');
        getActiveWindow = mod.activeWindow;
    }
    return getActiveWindow();
}
let permissionWarningShown = false;
let permissionConfirmedShown = false;
export function createTelemetryCollector(getCategoryRules, getVisionEnabled, onSnapshot, getGeminiApiKey, getActiveTodos) {
    let running = false;
    let pollInterval = null;
    let pollInFlight = false;
    const activityClassifier = createActivityClassifier();
    let cachedActivity = null;
    let cachedActivityKey = '';
    // Context-aware override (non-blocking Gemini check)
    let lastContextResult = null;
    let lastContextResultKey = '';
    let lastContextCheckTime = 0;
    const CONTEXT_CHECK_THROTTLE_MS = 15_000; // 15 seconds between Gemini calls
    // Session counters
    let sessionStartTime = Date.now();
    let productiveMs = 0;
    let distractingMs = 0;
    let neutralMs = 0;
    let lastPollTime = Date.now();
    let lastAppName = '';
    let tickCount = 0;
    const snoozeTimestamps = [];
    // Rolling time slices for distraction ratio (short window for responsiveness)
    const timeSlices = [];
    const RECENT_DISTRACT_WINDOW_MIN = 2;
    // App switch tracking (sliding 5-min window)
    const switchTimestamps = [];
    // Idle tracking
    let consecutiveIdleSeconds = 0;
    const IDLE_RESET_THRESHOLD = 10 * 60; // 10 minutes
    function resetSession() {
        sessionStartTime = Date.now();
        productiveMs = 0;
        distractingMs = 0;
        neutralMs = 0;
        lastAppName = '';
        tickCount = 0;
        switchTimestamps.length = 0;
        timeSlices.length = 0;
        consecutiveIdleSeconds = 0;
    }
    function countSwitchesLast5Min() {
        const cutoff = Date.now() - 5 * 60 * 1000;
        // Remove old entries
        while (switchTimestamps.length > 0 && switchTimestamps[0] < cutoff) {
            switchTimestamps.shift();
        }
        return switchTimestamps.length;
    }
    function countSnoozesLast60Min() {
        const cutoff = Date.now() - 60 * 60 * 1000;
        while (snoozeTimestamps.length > 0 && snoozeTimestamps[0] < cutoff) {
            snoozeTimestamps.shift();
        }
        return snoozeTimestamps.length;
    }
    function computeRecentDistractRatio() {
        const cutoff = Date.now() - RECENT_DISTRACT_WINDOW_MIN * 60 * 1000;
        // Prune slices older than window
        while (timeSlices.length > 0 && timeSlices[0].timestamp < cutoff) {
            timeSlices.shift();
        }
        let totalMs = 0;
        let distractMs = 0;
        for (const slice of timeSlices) {
            totalMs += slice.durationMs;
            if (slice.category === 'entertainment' || slice.category === 'social') {
                distractMs += slice.durationMs;
            }
        }
        return totalMs > 0 ? distractMs / totalMs : 0;
    }
    async function poll() {
        const now = Date.now();
        const elapsed = now - lastPollTime;
        lastPollTime = now;
        tickCount++;
        // Check system idle time
        const idleSeconds = powerMonitor.getSystemIdleTime();
        if (idleSeconds >= IDLE_RESET_THRESHOLD) {
            if (consecutiveIdleSeconds < IDLE_RESET_THRESHOLD) {
                console.log('[telemetry] Idle for 10+ min, resetting session');
                resetSession();
                lastPollTime = Date.now();
                return;
            }
        }
        consecutiveIdleSeconds = idleSeconds;
        // Get active window
        let appName = 'Unknown';
        let windowTitle;
        let windowUrl;
        let windowBounds;
        try {
            const win = await activeWindow();
            if (win?.owner?.name) {
                appName = win.owner.name;
                windowTitle = win.title;
                windowUrl = win.url;
                windowBounds = win.bounds;
                if (!permissionConfirmedShown) {
                    console.log(`[telemetry] Screen Recording permission OK — detected app: "${appName}"`);
                    permissionConfirmedShown = true;
                }
            }
            else if (!permissionWarningShown) {
                console.warn('[telemetry] Could not read active window. Grant Screen Recording permission in System Settings > Privacy & Security.');
                permissionWarningShown = true;
            }
            else if (permissionWarningShown && tickCount % 30 === 0) {
                console.warn(`[telemetry] Still cannot read active window (tick ${tickCount}). Check Screen Recording permission.`);
            }
        }
        catch (err) {
            if (!permissionWarningShown) {
                console.warn('[telemetry] activeWindow() failed. Grant Screen Recording permission in System Settings > Privacy & Security.', err);
                permissionWarningShown = true;
            }
            else if (permissionWarningShown && tickCount % 30 === 0) {
                console.warn(`[telemetry] Still cannot read active window (tick ${tickCount}). Check Screen Recording permission.`);
            }
        }
        // Detect app switch
        if (appName !== lastAppName && lastAppName !== '') {
            switchTimestamps.push(now);
        }
        lastAppName = appName;
        // Classify and accumulate time
        const rules = getCategoryRules();
        const visionEnabled = getVisionEnabled();
        const baseCategory = classifyApp(appName, rules, windowTitle, windowUrl);
        const activeDomain = isBrowser(appName) ? extractDomain(windowUrl, windowTitle) : undefined;
        const activityKey = `${appName}|${activeDomain ?? ''}|${windowTitle ?? ''}`;
        if (activityKey !== cachedActivityKey) {
            cachedActivityKey = activityKey;
            cachedActivity = null;
        }
        let category = cachedActivity?.category ?? baseCategory;
        // Non-blocking context check: when distracting, check if relevant to a todo
        if (category === 'entertainment' || category === 'social') {
            const apiKey = getGeminiApiKey();
            const todos = getActiveTodos();
            const todosWithApps = todos.filter((t) => t.allowedApps && t.allowedApps.length > 0);
            if (apiKey && todosWithApps.length > 0) {
                const now2 = Date.now();
                // Throttle: only fire a new Gemini call every 15 seconds
                if (now2 - lastContextCheckTime >= CONTEXT_CHECK_THROTTLE_MS) {
                    lastContextCheckTime = now2;
                    checkContextRelevance(apiKey, appName, windowTitle, activeDomain, todos)
                        .then((result) => {
                        lastContextResult = result;
                        lastContextResultKey = activityKey;
                    })
                        .catch(() => { });
                }
            }
            // Only apply override if the cached result matches the CURRENT activity
            if (lastContextResult?.isRelevant && lastContextResultKey === activityKey) {
                category = 'productive';
            }
        }
        else {
            // Clear context result when user switches to non-distracting app
            lastContextResult = null;
            lastContextResultKey = '';
        }
        switch (category) {
            case 'productive':
                productiveMs += elapsed;
                break;
            case 'entertainment':
            case 'social':
                distractingMs += elapsed;
                break;
            default:
                neutralMs += elapsed;
                break;
        }
        // Record time slice for rolling window
        timeSlices.push({ timestamp: now, durationMs: elapsed, category });
        // Emit snapshot every 5 ticks (5 seconds)
        if (tickCount % 5 === 0) {
            const sessionMinutes = parseFloat(((now - sessionStartTime) / 60000).toFixed(2));
            const distractingMinutes = parseFloat((distractingMs / 60000).toFixed(2));
            const productiveMinutes = parseFloat((productiveMs / 60000).toFixed(2));
            const hours = new Date().getHours();
            const minutes = new Date().getMinutes();
            const timeOfDayLocal = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            const recentDistractRatio = computeRecentDistractRatio();
            const snoozesLast60Min = countSnoozesLast60Min();
            // Refresh activity classification.
            // Note: this includes fast rule-based detection even when `visionEnabled` is false.
            cachedActivity = await activityClassifier.classify({
                appName,
                windowTitle,
                windowUrl,
                bounds: windowBounds,
            }, rules, visionEnabled);
            const contextOverride = lastContextResult?.isRelevant === true;
            const contextTodo = contextOverride ? (lastContextResult?.matchedTodoText ?? undefined) : undefined;
            const snapshot = {
                timestamp: new Date().toISOString(),
                focusIntent: null,
                signals: {
                    sessionMinutes,
                    distractingMinutes,
                    productiveMinutes,
                    appSwitchesLast5Min: countSwitchesLast5Min(),
                    idleSecondsLast5Min: idleSeconds,
                    timeOfDayLocal,
                    snoozesLast60Min,
                    recentDistractRatio,
                },
                categories: {
                    activeApp: appName,
                    activeCategory: cachedActivity?.category ?? category,
                    ...(activeDomain ? { activeDomain } : {}),
                    ...(cachedActivity?.activityLabel ? { activityLabel: cachedActivity.activityLabel } : {}),
                    ...(cachedActivity?.activityKind ? { activityKind: cachedActivity.activityKind } : {}),
                    ...(cachedActivity?.activityConfidence != null ? { activityConfidence: cachedActivity.activityConfidence } : {}),
                    ...(cachedActivity?.activitySource ? { activitySource: cachedActivity.activitySource } : {}),
                    ...(contextOverride ? { contextOverride: true } : {}),
                    ...(contextTodo ? { contextTodo } : {}),
                },
            };
            console.log(`[telemetry] Snapshot #${tickCount}: app="${appName}" category="${snapshot.categories.activeCategory}" domain="${activeDomain ?? 'none'}" activity="${snapshot.categories.activityLabel ?? 'none'}" source="${snapshot.categories.activitySource ?? 'none'}" distracting=${distractingMinutes}min session=${sessionMinutes}min rulesCount=${rules.length}`);
            onSnapshot(snapshot);
        }
    }
    // Reset on lock screen
    const onLockScreen = () => {
        console.log('[telemetry] Screen locked, resetting session');
        resetSession();
    };
    return {
        start() {
            if (running)
                return;
            running = true;
            resetSession();
            lastPollTime = Date.now();
            powerMonitor.on('lock-screen', onLockScreen);
            pollInterval = setInterval(() => {
                if (pollInFlight)
                    return;
                pollInFlight = true;
                poll()
                    .catch((err) => console.error('[telemetry] Poll error:', err))
                    .finally(() => { pollInFlight = false; });
            }, 1000);
            console.log('[telemetry] Started real window telemetry');
        },
        stop() {
            if (!running)
                return;
            running = false;
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
            powerMonitor.removeListener('lock-screen', onLockScreen);
            console.log('[telemetry] Stopped');
        },
        isActive() {
            return running;
        },
        addSnooze() {
            snoozeTimestamps.push(Date.now());
        },
    };
}
