import { powerMonitor } from 'electron';
import type { UsageSnapshot, TodoItem } from '@norot/shared';
import type { CategoryRule } from './types';
import { classifyApp, extractDomain, isBrowser } from './window-classifier';
import { createActivityClassifier, type ActivityClassification, type VisionProgress } from './activity/activity-classifier';
import { checkContextRelevance, type ContextResult } from './context-checker';
import { tryGetActiveBrowserUrl } from './browser-url';

// Cached dynamic import for ESM-only get-windows
let getActiveWindow: (() => Promise<any>) | null = null;
async function activeWindow() {
  if (!getActiveWindow) {
    const mod = await import('get-windows');
    getActiveWindow = mod.activeWindow;
  }
  return getActiveWindow();
}

let permissionWarningShown = false;
let permissionConfirmedShown = false;

export interface TelemetryCollector {
  start(): void;
  stop(): void;
  isActive(): boolean;
  addSnooze(): void;
}

export interface TelemetryTick {
  elapsedMs: number;
  appName: string;
  activeCategory: UsageSnapshot['categories']['activeCategory'];
  activeDomain?: string;
  activityLabel?: string;
  activitySource?: 'rules' | 'vision';
  visionStatus?: 'disabled' | 'idle' | 'classifying' | 'classified';
  visionMessage?: string;
  visionNextScanInSec?: number | null;
  appSwitchesLast5Min: number;
  idleSeconds: number;
  snoozesLast60Min: number;
  sessionReset: boolean;
}

export function createTelemetryCollector(
  getCategoryRules: () => CategoryRule[],
  getVisionEnabled: () => boolean,
  onSnapshot: (snapshot: UsageSnapshot) => void | Promise<void>,
  getGeminiApiKey: () => string,
  getActiveTodos: () => TodoItem[],
  onTick?: (tick: TelemetryTick) => void,
  getExplicitCategoryOverride?: (appName: string, activeDomain?: string) => UsageSnapshot['categories']['activeCategory'] | null,
): TelemetryCollector {
  function toUiCategory(category: string): 'productive' | 'neutral' | 'unproductive' | 'unknown' {
    if (category === 'productive' || category === 'neutral') return category;
    if (category === 'social' || category === 'entertainment') return 'unproductive';
    return 'unknown';
  }

  function isYouTubeDomain(domain?: string): boolean {
    if (!domain) return false;
    const d = domain.toLowerCase();
    return d.includes('youtube.com') || d.includes('youtu.be');
  }

  let running = false;
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let pollInFlight = false;
  const activityClassifier = createActivityClassifier();
  let cachedActivity: ActivityClassification | null = null;
  let cachedActivityKey = '';
  let visionInFlightKey = '';
  let visionInFlight: Promise<void> | null = null;
  let lastVisionFinishedAt = 0;
  let lastVisionOutcome: 'none' | 'classified' | 'uncertain' | 'error' = 'none';
  const VISION_REFRESH_MS = 5_000;
  let visionProgressKey = '';
  let visionProgress: VisionProgress | null = null;
  let lastBrowserUrlLookupAt = 0;
  let lastBrowserUrlLookupKey = '';
  let lastBrowserUrlLookupValue: string | undefined;
  const BROWSER_URL_THROTTLE_MS = 2_500;

  // Browser domain can be temporarily missing (library gaps, rapid title changes).
  // Keep the last known domain for a short grace window to avoid category flapping.
  const lastBrowserDomainByApp = new Map<string, { domain: string; at: number }>();
  const BROWSER_DOMAIN_GRACE_MS = 60_000;

  // Context-aware override (non-blocking Gemini check)
  let lastContextResult: ContextResult | null = null;
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
  // We poll active window every 1s; emit a stored UsageSnapshot less frequently.
  const SNAPSHOT_EVERY_TICKS = 10; // ~10 seconds
  const snoozeTimestamps: number[] = [];

  // Rolling time slices for distraction ratio (short window for responsiveness)
  const timeSlices: { timestamp: number; durationMs: number; category: string }[] = [];
  const RECENT_DISTRACT_WINDOW_MIN = 2;

  // App switch tracking (sliding 5-min window)
  const switchTimestamps: number[] = [];

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

  function countSwitchesLast5Min(): number {
    const cutoff = Date.now() - 5 * 60 * 1000;
    // Remove old entries
    while (switchTimestamps.length > 0 && switchTimestamps[0] < cutoff) {
      switchTimestamps.shift();
    }
    return switchTimestamps.length;
  }

  function countSnoozesLast60Min(): number {
    const cutoff = Date.now() - 60 * 60 * 1000;
    while (snoozeTimestamps.length > 0 && snoozeTimestamps[0] < cutoff) {
      snoozeTimestamps.shift();
    }
    return snoozeTimestamps.length;
  }

  function computeRecentDistractRatio(): number {
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
        onTick?.({
          elapsedMs: 0,
          appName: 'Unknown',
          activeCategory: 'unknown',
          appSwitchesLast5Min: 0,
          idleSeconds,
          snoozesLast60Min: countSnoozesLast60Min(),
          sessionReset: true,
        });
        return;
      }
    }
    consecutiveIdleSeconds = idleSeconds;

    // Get active window
    let appName = 'Unknown';
    let windowTitle: string | undefined;
    let windowUrl: string | undefined;
    let windowBounds: { x: number; y: number; width: number; height: number } | undefined;
    try {
      const win = await activeWindow();
      if (win?.owner?.name) {
        appName = win.owner.name;
        windowTitle = win.title;
        windowUrl = (win as any).url;
        windowBounds = win.bounds;
        if (!permissionConfirmedShown) {
          console.log(`[telemetry] Screen Recording permission OK — detected app: "${appName}"`);
          permissionConfirmedShown = true;
        }
      } else if (!permissionWarningShown) {
        console.warn(
          '[telemetry] Could not read active window. Grant Screen Recording permission in System Settings > Privacy & Security.'
        );
        permissionWarningShown = true;
      } else if (permissionWarningShown && tickCount % 30 === 0) {
        console.warn(`[telemetry] Still cannot read active window (tick ${tickCount}). Check Screen Recording permission.`);
      }
    } catch (err) {
      if (!permissionWarningShown) {
        console.warn(
          '[telemetry] activeWindow() failed. Grant Screen Recording permission in System Settings > Privacy & Security.',
          err
        );
        permissionWarningShown = true;
      } else if (permissionWarningShown && tickCount % 30 === 0) {
        console.warn(`[telemetry] Still cannot read active window (tick ${tickCount}). Check Screen Recording permission.`);
      }
    }

    // Detect app switch
    if (appName !== lastAppName && lastAppName !== '') {
      switchTimestamps.push(now);
    }
    lastAppName = appName;

    // "Deep" browser classification: if we don't have a URL from the window tracker, ask the browser directly.
    // This lets us reliably classify Chrome/Safari/etc by domain (youtube.com, instagram.com, etc.).
    if (isBrowser(appName)) {
      const domainFromWindow = extractDomain(windowUrl, windowTitle);
      if (!domainFromWindow) {
        const lookupKey = `${appName}|${windowTitle ?? ''}`;
        const throttled =
          lookupKey === lastBrowserUrlLookupKey && now - lastBrowserUrlLookupAt < BROWSER_URL_THROTTLE_MS;
        if (!throttled) {
          lastBrowserUrlLookupAt = now;
          lastBrowserUrlLookupKey = lookupKey;
          lastBrowserUrlLookupValue = await tryGetActiveBrowserUrl(appName);
        }
        if (!windowUrl && lastBrowserUrlLookupValue) {
          windowUrl = lastBrowserUrlLookupValue;
        }
      }
    }

    // Classify and accumulate time
    const rules = getCategoryRules();
    const visionEnabled = getVisionEnabled();
    let activeDomain: string | undefined;
    if (isBrowser(appName)) {
      const rawDomain = extractDomain(windowUrl, windowTitle);
      const key = appName.toLowerCase();
      if (rawDomain) {
        activeDomain = rawDomain;
        lastBrowserDomainByApp.set(key, { domain: rawDomain, at: now });
      } else {
        const prev = lastBrowserDomainByApp.get(key);
        if (prev && now - prev.at <= BROWSER_DOMAIN_GRACE_MS) {
          activeDomain = prev.domain;
        }
      }
    }

    const baseCategory = classifyApp(appName, rules, windowTitle, windowUrl, activeDomain);
    // Use a stable key so we don't restart CV inference constantly when window titles change.
    const activityKey = `${appName}|${activeDomain ?? ''}`;
    if (activityKey !== cachedActivityKey) {
      cachedActivityKey = activityKey;
      cachedActivity = null;
      visionInFlightKey = '';
      visionInFlight = null;
      lastVisionFinishedAt = 0;
      lastVisionOutcome = 'none';
      visionProgressKey = '';
      visionProgress = null;
    }

    let category = cachedActivity?.category ?? baseCategory;

    // Vision scanning is expensive; run it only when it can actually add value:
    // - explicit 50/50 apps (neutral, e.g. browsers)
    // - YouTube contexts (tutorial vs entertainment)
    const visionEligible =
      visionEnabled &&
      (baseCategory === 'neutral' ||
        (isBrowser(appName) && isYouTubeDomain(activeDomain)) ||
        appName.toLowerCase().includes('youtube'));
    const dueForVision = visionEligible && !visionInFlight && now - lastVisionFinishedAt >= VISION_REFRESH_MS;
    if (
      dueForVision
    ) {
      visionInFlightKey = activityKey;
      visionProgressKey = activityKey;
      visionProgress = { attempt: 1, total: 3 };
      visionInFlight = activityClassifier
        .classify(
          {
            appName,
            windowTitle,
            windowUrl,
            bounds: windowBounds,
          },
          rules,
          visionEnabled,
          {
            attempts: 3,
            attemptDelayMs: 2500,
            onProgress: (p) => {
              if (cachedActivityKey !== activityKey) return;
              visionProgressKey = activityKey;
              visionProgress = p;
            },
          }
        )
        .then((res) => {
          if (cachedActivityKey !== activityKey) return;
          cachedActivity = res;
          lastVisionOutcome = res.activitySource === 'vision' ? 'classified' : 'uncertain';
        })
        .catch(() => {
          lastVisionOutcome = 'error';
        })
        .finally(() => {
          if (cachedActivityKey === activityKey) {
            lastVisionFinishedAt = Date.now();
          }
          if (visionInFlightKey === activityKey) {
            visionInFlightKey = '';
            visionInFlight = null;
          }
          if (visionProgressKey === activityKey) {
            visionProgressKey = '';
            visionProgress = null;
          }
        });
    }

    // Non-blocking context check: when distracting, check if relevant to a todo.
    // IMPORTANT: this should NOT change the category used for scoring.
    // (Otherwise the focus score can "bounce" back up while the user is still
    // on a distracting site like Instagram.)
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
            .catch(() => { /* ignore errors */ });
        }
      }

    } else {
      // Clear context result when user switches to non-distracting app
      lastContextResult = null;
      lastContextResultKey = '';
    }

    const explicitOverride = getExplicitCategoryOverride?.(appName, activeDomain);
    if (explicitOverride) {
      category = explicitOverride;
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

    const visionStatus: TelemetryTick['visionStatus'] = !visionEnabled
      ? 'disabled'
      : !visionEligible
        ? 'idle'
        : cachedActivity?.activitySource === 'vision'
          ? 'classified'
          : visionInFlightKey === activityKey
            ? 'classifying'
            : 'idle';

    const subject = activeDomain ? `${appName} (${activeDomain})` : appName;
    const nextScanInMs = visionEligible && !visionInFlight
      ? Math.max(0, VISION_REFRESH_MS - (now - lastVisionFinishedAt))
      : null;
    const nextScanInSec = nextScanInMs != null ? Math.ceil(nextScanInMs / 1000) : null;

    const visionMessage: TelemetryTick['visionMessage'] =
      visionStatus === 'disabled'
        ? 'AI vision is off.'
        : !visionEligible
          ? `Already classified: ${subject} → ${toUiCategory(baseCategory)}.`
          : visionStatus === 'classifying'
            ? visionProgressKey === activityKey && visionProgress
              ? `Scanning ${subject} (${visionProgress.attempt}/${visionProgress.total}) — checking documents vs entertainment…`
              : `Scanning ${subject} — checking documents vs entertainment…`
            : cachedActivity?.activitySource === 'vision'
              ? (nextScanInSec != null
                ? `Scan: ${subject} → ${toUiCategory(cachedActivity.category)}${cachedActivity.activityLabel ? ` (${cachedActivity.activityLabel})` : ''}. Next scan in ${nextScanInSec}s.`
                : `Scan: ${subject} → ${toUiCategory(cachedActivity.category)}${cachedActivity.activityLabel ? ` (${cachedActivity.activityLabel})` : ''}.`)
              : lastVisionOutcome === 'uncertain'
                ? (nextScanInSec != null
                  ? `Could not classify confidently — keeping ${toUiCategory(baseCategory)}. Next scan in ${nextScanInSec}s.`
                  : `Could not classify confidently — keeping ${toUiCategory(baseCategory)}.`)
                : lastVisionOutcome === 'error'
                  ? (nextScanInSec != null ? `Scan failed — next scan in ${nextScanInSec}s.` : 'Scan failed.')
                  : (nextScanInSec != null ? `Waiting… next scan in ${nextScanInSec}s.` : 'Waiting…');

    onTick?.({
      elapsedMs: elapsed,
      appName,
      activeCategory: category as UsageSnapshot['categories']['activeCategory'],
      ...(activeDomain ? { activeDomain } : {}),
      ...(cachedActivity?.activityLabel ? { activityLabel: cachedActivity.activityLabel } : {}),
      ...(cachedActivity?.activitySource ? { activitySource: cachedActivity.activitySource } : {}),
      visionStatus,
      visionMessage,
      visionNextScanInSec: nextScanInSec,
      appSwitchesLast5Min: countSwitchesLast5Min(),
      idleSeconds,
      snoozesLast60Min: countSnoozesLast60Min(),
      sessionReset: false,
    });

    // Emit snapshot every 10 ticks (~10 seconds)
    if (tickCount % SNAPSHOT_EVERY_TICKS === 0) {
      const sessionMinutes = parseFloat(((now - sessionStartTime) / 60000).toFixed(2));
      const distractingMinutes = parseFloat((distractingMs / 60000).toFixed(2));
      const productiveMinutes = parseFloat((productiveMs / 60000).toFixed(2));

      const hours = new Date().getHours();
      const minutes = new Date().getMinutes();
      const timeOfDayLocal = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

      const recentDistractRatio = computeRecentDistractRatio();
      const snoozesLast60Min = countSnoozesLast60Min();

      // Refresh activity classification if we don't already have a cached result for this activity.
      // Note: CV is used for explicitly-eligible contexts (see above).
      cachedActivity = cachedActivity ?? await activityClassifier.classify(
          {
            appName,
            windowTitle,
            windowUrl,
            bounds: windowBounds,
          },
          rules,
          visionEnabled
        );

      const contextOverride =
        lastContextResult?.isRelevant === true &&
        lastContextResultKey === activityKey;
      const contextTodo = contextOverride
        ? (lastContextResult?.matchedTodoText ?? undefined)
        : undefined;

      const snapshot: UsageSnapshot = {
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

      console.log(
        `[telemetry] Snapshot #${tickCount}: app="${appName}" category="${snapshot.categories.activeCategory}" domain="${activeDomain ?? 'none'}" activity="${snapshot.categories.activityLabel ?? 'none'}" source="${snapshot.categories.activitySource ?? 'none'}" distracting=${distractingMinutes}min session=${sessionMinutes}min rulesCount=${rules.length}`
      );
      await onSnapshot(snapshot);
    }
  }

  // Reset on lock screen
  const onLockScreen = () => {
    console.log('[telemetry] Screen locked, resetting session');
    resetSession();
    onTick?.({
      elapsedMs: 0,
      appName: 'Unknown',
      activeCategory: 'unknown',
      appSwitchesLast5Min: 0,
      idleSeconds: powerMonitor.getSystemIdleTime(),
      snoozesLast60Min: countSnoozesLast60Min(),
      sessionReset: true,
    });
  };

  return {
    start() {
      if (running) return;
      running = true;
      resetSession();
      lastPollTime = Date.now();
      powerMonitor.on('lock-screen', onLockScreen);
      pollInterval = setInterval(() => {
        if (pollInFlight) return;
        pollInFlight = true;
        poll()
          .catch((err) => console.error('[telemetry] Poll error:', err))
          .finally(() => { pollInFlight = false; });
      }, 1000);
      console.log('[telemetry] Started real window telemetry');
    },

    stop() {
      if (!running) return;
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
