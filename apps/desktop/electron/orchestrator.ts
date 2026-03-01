import { powerSaveBlocker } from 'electron';
import { randomUUID } from 'crypto';
import type {
  UsageSnapshot,
  ScoreResponse,
  InterventionEvent,
  Severity,
  Persona,
} from '@norot/shared';
import {
  FocusScoreEngine,
  calculateScore,
  applySnoozeEscalation,
  generateReasons,
  SEVERITY_BANDS,
  SNOOZE_PRESSURE_POINTS,
  SNOOZE_PRESSURE_DURATION_MIN,
  MAX_SNOOZE_PRESSURE,
} from '@norot/shared';
import { IPC_CHANNELS, type UserSettings } from './types';
import { createTelemetryCollector, type TelemetryCollector } from './telemetry';
import * as apiClient from './api-client';
import * as database from './database';
import { updateTrayState } from './tray';
import { buildInterventionText } from './intervention-text';
import { buildZeroFocusInterventionText } from './intervention-text';
import { buildStableRecommendationText } from './recommendation-text';
import { buildPraiseText } from './praise-text';
import { generateScript, generateContextAwareScript } from './gemini-client';
import { clearContextCache } from './context-checker';
import { getMainWindow, closeInterventionOverlayWindow, showInterventionOverlayWindow, isInterventionOverlayVisible } from './window-manager';
import { isSnoozeActive } from './snooze-state';
import { clearActiveIntervention, setActiveIntervention } from './intervention-state';
import { hasInterventionGapElapsed, shouldTreatInterventionAsDismissed } from './intervention-guard';
import type { TelemetryTick } from './telemetry';

function generateId(): string {
  return randomUUID();
}

function resolveTimeZoneSetting(timeZoneSetting: string | undefined): string {
  const system = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!timeZoneSetting || timeZoneSetting === 'system') return system || 'UTC';
  return timeZoneSetting;
}

function parseHHMMToMinutes(val: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(val.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function getNowMinutesInTimeZone(timeZoneSetting: string | undefined): number {
  const timeZone = resolveTimeZoneSetting(timeZoneSetting);
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === 'hour')?.value);
    const m = Number(parts.find((p) => p.type === 'minute')?.value);
    if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
  } catch {
    // ignore
  }

  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

interface OrchestratorState {
  telemetryCollector: TelemetryCollector | null;
  lastInterventionTime: number;
  lastStageInterventionAt: number;
  lastStageInterventionSeverity: Severity;
  lastAnyInterventionShownAt: number;
  snoozePressure: number;
  snoozeTimestamps: number[];
  currentSettings: UserSettings;
  activeInterventionId: string | null;
  activeInterventionStartedAt: number;
  activeInterventionCategories: { activeApp: string; activeDomain?: string } | null;
  interventionCategoriesById: Map<string, { activeApp: string; activeDomain?: string }>;
  complianceSnapshots: number;
  focusEngine: FocusScoreEngine | null;
  latestFocusScore: number;
  prevFocusScore: number;
  decaySlowUntil: number;
  praiseArmed: boolean;
  lastPraiseAt: number;
  lastZeroInterventionAt: number;
  workOverrides: Array<{ app: string; domain?: string; expiresAt: number }>;
}

const state: OrchestratorState = {
  telemetryCollector: null,
  lastInterventionTime: 0,
  lastStageInterventionAt: 0,
  lastStageInterventionSeverity: 0 as Severity,
  lastAnyInterventionShownAt: 0,
  snoozePressure: 0,
  snoozeTimestamps: [],
  currentSettings: null as unknown as UserSettings, // Lazily loaded after DB init
  activeInterventionId: null,
  activeInterventionStartedAt: 0,
  activeInterventionCategories: null,
  interventionCategoriesById: new Map(),
  complianceSnapshots: 0,
  focusEngine: null,
  latestFocusScore: 100,
  prevFocusScore: 100,
  decaySlowUntil: 0,
  praiseArmed: false,
  lastPraiseAt: 0,
  lastZeroInterventionAt: 0,
  workOverrides: [],
};

let settingsLoaded = false;
let powerSaveBlockerId: number | null = null;

function ensureSettings(): UserSettings {
  if (!settingsLoaded) {
    state.currentSettings = database.getSettings();
    settingsLoaded = true;
  }
  return state.currentSettings;
}

function sendToRenderer(channel: string, data: unknown): void {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scoreToSeverity(score: number): Severity {
  const band = SEVERITY_BANDS.find((b) => score >= b.scoreMin && score <= b.scoreMax);
  return (band ? band.severity : 0) as Severity;
}

function normalizeKey(value: string | undefined): string | undefined {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return v ? v : undefined;
}

function pruneWorkOverrides(now: number): void {
  const before = state.workOverrides.length;
  state.workOverrides = state.workOverrides.filter((o) => typeof o.expiresAt === 'number' && o.expiresAt > now);
  if (state.workOverrides.length !== before) {
    database.setWorkOverrides(state.workOverrides);
  }
}

function getExplicitCategoryOverride(appName: string, activeDomain?: string): UsageSnapshot['categories']['activeCategory'] | null {
  const now = Date.now();
  pruneWorkOverrides(now);

  const app = normalizeKey(appName);
  if (!app) return null;
  const domain = normalizeKey(activeDomain);

  for (const o of state.workOverrides) {
    if (o.app !== app) continue;
    if (o.domain && o.domain !== domain) continue;
    return 'productive';
  }
  return null;
}

function upsertWorkOverride(activeApp: string, activeDomain: string | undefined, durationMs: number): void {
  const now = Date.now();
  pruneWorkOverrides(now);
  const app = normalizeKey(activeApp);
  if (!app) return;
  const domain = normalizeKey(activeDomain);
  const expiresAt = now + durationMs;

  const existing = state.workOverrides.find((o) => o.app === app && (o.domain ?? undefined) === (domain ?? undefined));
  if (existing) {
    existing.expiresAt = Math.max(existing.expiresAt, expiresAt);
  } else {
    state.workOverrides.push({
      app,
      ...(domain ? { domain } : {}),
      expiresAt,
    });
  }
  database.setWorkOverrides(state.workOverrides);
}

function decaySnoozePressure(): number {
  const now = Date.now();
  const cutoff = now - SNOOZE_PRESSURE_DURATION_MIN * 60 * 1000;

  // Remove expired snooze timestamps
  state.snoozeTimestamps = state.snoozeTimestamps.filter((t) => t > cutoff);

  // Cap pressure to avoid runaway escalation
  if (state.snoozeTimestamps.length > MAX_SNOOZE_PRESSURE) {
    state.snoozeTimestamps = state.snoozeTimestamps.slice(-MAX_SNOOZE_PRESSURE);
  }

  // Each active snooze adds SNOOZE_PRESSURE_POINTS
  return state.snoozeTimestamps.length * SNOOZE_PRESSURE_POINTS;
}

function processTick(tick: TelemetryTick): void {
  try {
    if (!state.focusEngine) {
      state.focusEngine = new FocusScoreEngine({ initialFocusScore: 100 });
      state.latestFocusScore = 100;
      state.prevFocusScore = 100;
    }

    if (tick.sessionReset) {
      state.focusEngine.reset(100);
      state.latestFocusScore = 100;
      state.prevFocusScore = 100;
    } else {
      const now = Date.now();
      const overlayVisible = isInterventionOverlayVisible();

      if (shouldTreatInterventionAsDismissed({
        activeInterventionId: state.activeInterventionId,
        overlayVisible,
        startedAt: state.activeInterventionStartedAt,
        now,
        graceMs: 10_000,
      })) {
        const id = state.activeInterventionId!;
        console.log('[orchestrator] Active intervention with no visible overlay — treating as dismissed', { id });
        handleInterventionResponse(id, 'dismissed');
      }

      const decayScale = overlayVisible ? 0 : (now < state.decaySlowUntil ? 0.5 : 1);
      const res = state.focusEngine.tick({
        activeCategory: tick.activeCategory,
        appSwitchesLast5Min: tick.appSwitchesLast5Min,
        elapsedMs: tick.elapsedMs,
        decayScale,
      });
      state.latestFocusScore = res.focusScore;
    }

    // Arm praise once we dip below 65 ("Focused" band), then praise once we recover to 85+ ("Locked In").
    if (state.latestFocusScore < 65) state.praiseArmed = true;

    const now = Date.now();
    const overlayVisible = isInterventionOverlayVisible();
    if (!overlayVisible && !state.activeInterventionId && state.praiseArmed && state.latestFocusScore >= 85 && now - state.lastPraiseAt > 60_000) {
      state.praiseArmed = false;
      state.lastPraiseAt = now;
      const settings = ensureSettings();
      const text = buildPraiseText(settings.persona);
      sendToRenderer(IPC_CHANNELS.ON_PLAY_AUDIO, {
        procrastinationScore: 0,
        severity: 0 as Severity,
        reasons: ['Great recovery'],
        recommendation: {
          mode: 'none',
          persona: settings.persona,
          text,
          tts: { model: 'eleven_v3', stability: 45, speed: 1.02 },
          cooldownSeconds: settings.cooldownSeconds,
        },
      });
    }

    // If focus hits 0, force a special intervention (no cooldown). Throttle to avoid loops.
    if (
      state.prevFocusScore > 0 &&
      state.latestFocusScore <= 0 &&
      !overlayVisible &&
      !state.activeInterventionId &&
      !isSnoozeActive(now) &&
      hasInterventionGapElapsed({ lastShownAt: state.lastAnyInterventionShownAt, now, minGapMs: 5_000 }) &&
      now - state.lastZeroInterventionAt > 2 * 60_000
    ) {
      state.lastZeroInterventionAt = now;
      state.lastAnyInterventionShownAt = now;
      const settings = ensureSettings();
      const categories = {
        activeApp: tick.appName,
        activeCategory: tick.activeCategory,
        ...(tick.activeDomain ? { activeDomain: tick.activeDomain } : {}),
      } as any;

      const activeTodos = database.getTodos().filter((t) => !t.done);
      const nowMinutes = getNowMinutesInTimeZone(settings.timeZone);
      const overdueTodos = activeTodos
        .filter((t) => t.deadline)
        .filter((t) => {
          const dlMinutes = parseHHMMToMinutes(t.deadline!);
          if (dlMinutes == null) return false;
          return dlMinutes < nowMinutes;
        })
        .map((t) => ({ text: t.text, deadline: t.deadline! }));

      const text = buildZeroFocusInterventionText(settings.persona, categories, {
        activeTodos: activeTodos.map((t) => t.text),
        overdueTodos,
      });

      const intervention: InterventionEvent = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        score: 100,
        severity: 4 as Severity,
        persona: settings.persona,
        text,
        userResponse: 'pending',
        audioPlayed: false,
      };

      database.insertIntervention(intervention);
      state.activeInterventionId = intervention.id;
      state.activeInterventionStartedAt = Date.now();
      state.activeInterventionCategories = { activeApp: tick.appName, ...(tick.activeDomain ? { activeDomain: tick.activeDomain } : {}) };
      state.interventionCategoriesById.set(intervention.id, state.activeInterventionCategories);
      state.complianceSnapshots = 0;
      setActiveIntervention(intervention);
      showInterventionOverlayWindow(intervention);
      sendToRenderer(IPC_CHANNELS.ON_INTERVENTION, intervention);
      sendToRenderer(IPC_CHANNELS.ON_PLAY_AUDIO, {
        procrastinationScore: 100,
        severity: 4 as Severity,
        reasons: ['Focus hit 0'],
        recommendation: {
          mode: 'interrupt',
          persona: settings.persona,
          text,
          tts: { model: 'eleven_v3', stability: 20, speed: 1.12 },
          cooldownSeconds: settings.cooldownSeconds,
        },
        interventionId: intervention.id,
      });
    }

    state.prevFocusScore = state.latestFocusScore;

    const snoozePressure = decaySnoozePressure();
    const procScore = clamp(Math.round((100 - state.latestFocusScore) + snoozePressure), 0, 100);
    const baseSeverity = scoreToSeverity(procScore);
    const severity = applySnoozeEscalation(baseSeverity, tick.snoozesLast60Min);

    sendToRenderer(IPC_CHANNELS.ON_LIVE_SCORE_UPDATE, {
      procrastinationScore: procScore,
      severity,
    });

    updateTrayState({
      score: procScore,
      severity,
      activeApp: tick.appName,
      activeCategory: tick.activeCategory,
      activeDomain: tick.activeDomain,
      telemetryActive: true,
    });
  } catch (err) {
    console.error('[orchestrator] Error processing tick:', err);
  }
}

async function processSnapshot(snapshot: UsageSnapshot): Promise<void> {
  try {
    const settings = ensureSettings();
    const isExplicitToughLove = settings.persona === 'tough_love' && settings.toughLoveExplicitAllowed === true;

    snapshot.signals.focusScore = state.latestFocusScore;

    // Store the raw snapshot
    database.insertSnapshot(snapshot.timestamp, JSON.stringify(snapshot));

    // Calculate snooze pressure
    const snoozePressure = decaySnoozePressure();

    // Try API first, fall back to local scoring
    const apiScoreResult = await apiClient.scoreSnapshot(
      snapshot,
      snoozePressure,
      settings.persona
    );
    const scoreSource: 'api' | 'local' = apiScoreResult ? 'api' : 'local';
    let scoreResult = apiScoreResult;

    if (!scoreResult) {
      // Local fallback
      const { score, severity: baseSeverity } = calculateScore(snapshot, snoozePressure);
      const severity = applySnoozeEscalation(baseSeverity, snapshot.signals.snoozesLast60Min);
      const persona = settings.persona;
      const band = SEVERITY_BANDS.find((b) => b.severity === severity);

      scoreResult = {
        procrastinationScore: score,
        severity,
        reasons: generateReasons(snapshot, score),
        recommendation: {
          mode: band?.mode || 'none',
          persona,
          text: '',
          tts: { model: 'eleven_v3', stability: 35, speed: 1.08 },
          cooldownSeconds: settings.cooldownSeconds,
        },
      };
    }

    // Stabilize the UI recommendation text so it doesn't "shuffle" every 5s update
    // (Score API/Gemini can return varied scripts even when severity is unchanged.)
    scoreResult.recommendation.text = buildStableRecommendationText(
      scoreResult.severity,
      scoreResult.recommendation.persona,
    );

    // Store the score
    database.insertScore(scoreResult);

    // Send score update to renderer
    sendToRenderer(IPC_CHANNELS.ON_SCORE_UPDATE, scoreResult);

    // Update tray icon with live score (not the stale snapshot score)
    const liveProcScore = clamp(Math.round((100 - state.latestFocusScore) + decaySnoozePressure()), 0, 100);
    updateTrayState({
      score: liveProcScore,
      severity: scoreToSeverity(liveProcScore),
      activeApp: snapshot.categories.activeApp,
      activeCategory: snapshot.categories.activeCategory,
      activeDomain: snapshot.categories.activeDomain,
      telemetryActive: true,
    });

    // If severity drops (user refocuses), allow stage-based interventions to trigger again
    // on future escalations.
    if (scoreResult.severity < state.lastStageInterventionSeverity) {
      state.lastStageInterventionSeverity = scoreResult.severity;
    }

    // --- Compliance auto-dismiss check ---
    if (state.activeInterventionId && state.activeInterventionCategories) {
      const wasApp = state.activeInterventionCategories.activeApp;
      const nowApp = snapshot.categories.activeApp;
      const nowCategory = snapshot.categories.activeCategory;
      const switchedAway = nowApp !== wasApp && (nowCategory === 'productive' || nowCategory === 'neutral');

      if (switchedAway) {
        state.complianceSnapshots++;
      } else {
        state.complianceSnapshots = 0;
      }

      // Require 2 consecutive compliant snapshots (~10s) to avoid premature dismissal
      if (state.complianceSnapshots >= 2) {
        const interventionId = state.activeInterventionId;
        sendToRenderer(IPC_CHANNELS.ON_INTERVENTION_DISMISS, { interventionId });
        database.updateInterventionResponse(interventionId, 'dismissed');
        console.log(`[orchestrator] Auto-dismissed intervention ${interventionId} after compliance`);
        clearActiveIntervention(interventionId);
        closeInterventionOverlayWindow();
        state.activeInterventionId = null;
        state.activeInterventionStartedAt = 0;
        state.activeInterventionCategories = null;
        state.complianceSnapshots = 0;
      }
    }

    // Check if we should intervene
    const now = Date.now();
    if (isSnoozeActive(now)) {
      console.log('[orchestrator] Snooze active — skipping intervention check');
      return;
    }
    const cooldownMs = settings.cooldownSeconds * 1000;
    const cooldownExpired = now - state.lastInterventionTime > cooldownMs;
    const meetsThreshold =
      scoreResult.procrastinationScore >= settings.scoreThreshold;
    const hasRecommendation = scoreResult.recommendation.mode !== 'none';

    const stageEscalated =
      scoreResult.severity >= (1 as Severity) &&
      scoreResult.severity > state.lastStageInterventionSeverity &&
      now - state.lastStageInterventionAt > 20_000;

    console.log(
      `[orchestrator] Decision: source=${scoreSource} score=${scoreResult.procrastinationScore} meetsThreshold=${meetsThreshold} cooldownExpired=${cooldownExpired} hasRecommendation=${hasRecommendation} | app="${snapshot.categories.activeApp}" category="${snapshot.categories.activeCategory}" domain="${snapshot.categories.activeDomain ?? 'none'}" recentRatio=${(snapshot.signals.recentDistractRatio ?? 0).toFixed(2)} distracting=${snapshot.signals.distractingMinutes}min session=${snapshot.signals.sessionMinutes}min`
    );

    const shouldIntervene =
      !state.activeInterventionId &&
      hasRecommendation &&
      hasInterventionGapElapsed({ lastShownAt: state.lastAnyInterventionShownAt, now, minGapMs: 5_000 }) &&
      (stageEscalated || (meetsThreshold && cooldownExpired));

    if (shouldIntervene) {
      let interventionText: string | null = null;
      const forceLocalScript = stageEscalated;

      // Compute overdue todos (tasks past their deadline)
      const activeTodos = database.getTodos().filter((t) => !t.done);
      const nowMinutes = getNowMinutesInTimeZone(settings.timeZone);
      const overdueTodos = activeTodos
        .filter((t) => t.deadline)
        .filter((t) => {
          const dlMinutes = parseHHMMToMinutes(t.deadline!);
          if (dlMinutes == null) return false;
          return dlMinutes < nowMinutes;
        })
        .map((t) => ({ text: t.text, deadline: t.deadline! }));

      if (!forceLocalScript && settings.scriptSource === 'gemini' && settings.geminiApiKey) {
        // Use context-aware generation when context info is available
        if (snapshot.categories.contextOverride || snapshot.categories.contextTodo || overdueTodos.length > 0) {
          interventionText = await generateContextAwareScript(
            settings.geminiApiKey,
            scoreResult.severity,
            scoreResult.recommendation.persona,
            {
              appName: snapshot.categories.activeApp,
              windowTitle: undefined,
              domain: snapshot.categories.activeDomain,
              activeTodos,
              matchedTodo: snapshot.categories.contextTodo,
              overdueTodos: overdueTodos.length > 0 ? overdueTodos : undefined,
            },
            settings.toughLoveExplicitAllowed,
          );
        } else {
          interventionText = await generateScript(
            settings.geminiApiKey,
            scoreResult.severity,
            scoreResult.recommendation.persona,
            settings.toughLoveExplicitAllowed,
          );
        }
      }

      // Fall back to on-device script (also used when scriptSource is 'default')
      if (!interventionText) {
        interventionText = buildInterventionText(
          scoreResult.severity,
          scoreResult.recommendation.persona,
          snapshot.categories,
          overdueTodos.length > 0 ? overdueTodos : undefined,
        );
      }

      // Ensure explicit Tough Love always curses + "screams", even if Gemini returns something mild.
      if (isExplicitToughLove && interventionText) {
        const hasProfanity = /\b(fuck|bitch|bastard|idiot|dumbass|stupid ass)\b/i.test(interventionText);
        const hasScream = /[A-Z]{3,}/.test(interventionText);
        if (!hasProfanity || !hasScream) {
          interventionText = `STOP. LISTEN THE FUCK UP. ${interventionText}`;
        }
      }

      // Make explicit Tough Love sound more "loud" for ElevenLabs by adjusting voice settings.
      // If ElevenLabs rejects explicit content, renderer will fall back to local TTS.
      const audioTts = isExplicitToughLove
        ? {
            ...scoreResult.recommendation.tts,
            stability: scoreResult.severity >= 3 ? 15 : 20,
            speed: scoreResult.severity >= 3 ? 1.2 : 1.15,
          }
        : scoreResult.recommendation.tts;

      const intervention: InterventionEvent = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        score: scoreResult.procrastinationScore,
        severity: scoreResult.severity,
        persona: scoreResult.recommendation.persona,
        text: interventionText ?? '',
        userResponse: 'pending',
        audioPlayed: false,
      };

      // Store and send intervention
      database.insertIntervention(intervention);

      // Track active intervention for compliance auto-dismiss
      state.activeInterventionId = intervention.id;
      state.activeInterventionStartedAt = Date.now();
      state.activeInterventionCategories = {
        activeApp: snapshot.categories.activeApp,
        activeDomain: snapshot.categories.activeDomain,
      };
      state.interventionCategoriesById.set(intervention.id, state.activeInterventionCategories);
      state.complianceSnapshots = 0;
      state.lastAnyInterventionShownAt = now;

      // Show an always-on-top popup window to interrupt the user even when noRot isn't focused.
      setActiveIntervention(intervention);
      showInterventionOverlayWindow(intervention);
      sendToRenderer(IPC_CHANNELS.ON_INTERVENTION, intervention);
      console.log(
        `[orchestrator] INTERVENTION FIRED: id=${intervention.id} score=${intervention.score} severity=${intervention.severity}`
      );

      // Always emit the audio request so the renderer can show a "muted/snoozed" toast.
      // (Main process doesn't know about renderer-side snooze, and skipping the event
      // makes the app feel broken when the intervention popup appears but there's no sound.)
      if (interventionText) {
        sendToRenderer(IPC_CHANNELS.ON_PLAY_AUDIO, {
          ...scoreResult,
          recommendation: {
            ...scoreResult.recommendation,
            text: interventionText,
            tts: audioTts,
          },
          interventionId: intervention.id,
        });
      }

      if (stageEscalated) {
        state.lastStageInterventionSeverity = scoreResult.severity;
        state.lastStageInterventionAt = now;
      }

      if (!stageEscalated) {
        state.lastInterventionTime = now;
        state.lastStageInterventionSeverity = Math.max(state.lastStageInterventionSeverity, scoreResult.severity) as Severity;
        state.lastStageInterventionAt = now;
      }
    }
  } catch (err) {
    console.error('[orchestrator] Error processing snapshot:', err);
  }
}

// --- Public API ---

export function startTelemetry(): void {
  stopTelemetry();

  // Refresh settings
  state.currentSettings = database.getSettings();
  settingsLoaded = true;
  console.log(
    `[orchestrator] Settings loaded: threshold=${state.currentSettings.scoreThreshold} cooldown=${state.currentSettings.cooldownSeconds}s persona="${state.currentSettings.persona}" rulesCount=${state.currentSettings.categoryRules.length} geminiKey=${!!state.currentSettings.geminiApiKey}`
  );
  state.snoozePressure = 0;
  state.snoozeTimestamps = [];
  state.lastInterventionTime = 0;
  state.lastStageInterventionAt = 0;
  state.lastStageInterventionSeverity = 0 as Severity;
  state.lastAnyInterventionShownAt = 0;
  state.activeInterventionId = null;
  state.activeInterventionStartedAt = 0;
  state.activeInterventionCategories = null;
  clearActiveIntervention();
  state.interventionCategoriesById = new Map();
  state.complianceSnapshots = 0;
  state.focusEngine = new FocusScoreEngine({ initialFocusScore: 100 });
  state.latestFocusScore = 100;
  state.prevFocusScore = 100;
  state.decaySlowUntil = 0;
  state.praiseArmed = false;
  state.lastPraiseAt = 0;
  state.lastZeroInterventionAt = 0;
  state.workOverrides = database.getWorkOverrides();
  pruneWorkOverrides(Date.now());

  state.telemetryCollector = createTelemetryCollector(
    () => ensureSettings().categoryRules,
    () => ensureSettings().visionEnabled,
    processSnapshot,
    () => ensureSettings().geminiApiKey,
    () => database.getTodos().filter((t) => !t.done),
    processTick,
    getExplicitCategoryOverride,
  );
  state.telemetryCollector.start();

  if (powerSaveBlockerId === null || !powerSaveBlocker.isStarted(powerSaveBlockerId)) {
    powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension');
    console.log('[orchestrator] powerSaveBlocker started', { powerSaveBlockerId });
  }

  console.log('[orchestrator] Started telemetry');
}

export function stopTelemetry(): void {
  if (state.telemetryCollector) {
    state.telemetryCollector.stop();
    state.telemetryCollector = null;
  }
  state.focusEngine = null;
  state.latestFocusScore = 100;
  state.interventionCategoriesById = new Map();

  // Set tray to inactive/gray
  updateTrayState({
    score: 0,
    severity: 0,
    activeApp: '',
    activeCategory: '',
    activeDomain: undefined,
    telemetryActive: false,
  });

  if (powerSaveBlockerId !== null && powerSaveBlocker.isStarted(powerSaveBlockerId)) {
    powerSaveBlocker.stop(powerSaveBlockerId);
    console.log('[orchestrator] powerSaveBlocker stopped', { powerSaveBlockerId });
  }
  powerSaveBlockerId = null;

  console.log('[orchestrator] Telemetry stopped');
}

export function handleInterventionResponse(
  eventId: string,
  response: 'snoozed' | 'dismissed' | 'working'
): void {
  database.updateInterventionResponse(eventId, response);
  clearActiveIntervention(eventId);

  const categoriesForThisIntervention =
    state.interventionCategoriesById.get(eventId) ??
    (state.activeInterventionId === eventId ? state.activeInterventionCategories : null);

  state.interventionCategoriesById.delete(eventId);

  // Clear compliance tracking so auto-dismiss won't fire after user responds
  if (state.activeInterventionId === eventId) {
    state.activeInterventionId = null;
    state.activeInterventionStartedAt = 0;
    state.activeInterventionCategories = null;
    state.complianceSnapshots = 0;
  }

  if (response === 'snoozed') {
    // Add snooze pressure
    state.snoozeTimestamps.push(Date.now());
    if (state.telemetryCollector) {
      state.telemetryCollector.addSnooze();
    }
  } else if (response === 'dismissed') {
    // Give a brief grace period so focus doesn't nosedive instantly after acknowledging the popup.
    state.decaySlowUntil = Date.now() + 60_000;
  } else if (response === 'working') {
    if (categoriesForThisIntervention?.activeApp) {
      // Treat the intervention-triggering app/domain as productive for 2 hours.
      upsertWorkOverride(categoriesForThisIntervention.activeApp, categoriesForThisIntervention.activeDomain, 2 * 60 * 60 * 1000);
    }
    // Reward/acknowledge: extend cooldown and drop any accumulated snooze pressure.
    const settings = ensureSettings();
    state.snoozeTimestamps = [];
    state.lastInterventionTime = Date.now() + settings.cooldownSeconds * 1000;
  }
}

export function refreshSettings(): void {
  state.currentSettings = database.getSettings();
  settingsLoaded = true;
  clearContextCache();
  console.log(
    `[orchestrator] Settings refreshed: threshold=${state.currentSettings.scoreThreshold} cooldown=${state.currentSettings.cooldownSeconds}s`
  );
}

export function isTelemetryActive(): boolean {
  return state.telemetryCollector?.isActive() ?? false;
}
