"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const electron = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const crypto = require("crypto");
const shared = require("@norot/shared");
const genai = require("@google/genai");
const IPC_CHANNELS = {
  RELAUNCH_APP: "app:relaunch",
  START_TELEMETRY: "telemetry:start",
  STOP_TELEMETRY: "telemetry:stop",
  IS_TELEMETRY_ACTIVE: "telemetry:active",
  GET_LATEST_SCORE: "score:latest",
  ON_SCORE_UPDATE: "score:update",
  RESPOND_TO_INTERVENTION: "intervention:respond",
  ON_INTERVENTION: "intervention:new",
  ON_INTERVENTION_DISMISS: "intervention:auto-dismiss",
  GET_USAGE_HISTORY: "usage:get",
  GET_APP_STATS: "apps:stats",
  GET_SETTINGS: "settings:get",
  UPDATE_SETTINGS: "settings:update",
  ON_PLAY_AUDIO: "audio:play",
  REPORT_AUDIO_PLAYED: "audio:played",
  TEST_INTERVENTION: "intervention:test",
  CHECK_PERMISSIONS: "permissions:check",
  REQUEST_PERMISSIONS: "permissions:request",
  ON_WINDOW_SHOWN: "window:shown",
  // Chat
  CHAT_SEND: "chat:send",
  CHAT_CANCEL: "chat:cancel",
  ON_CHAT_TOKEN: "chat:token",
  ON_CHAT_DONE: "chat:done",
  ON_CHAT_ERROR: "chat:error",
  // Todos
  EXTRACT_TODOS: "todos:extract",
  GET_TODOS: "todos:get",
  ADD_TODO: "todos:add",
  TOGGLE_TODO: "todos:toggle",
  DELETE_TODO: "todos:delete",
  UPDATE_TODO: "todos:update",
  REORDER_TODOS: "todos:reorder",
  SET_TODOS: "todos:set",
  APPEND_TODOS: "todos:append",
  ON_TODOS_UPDATED: "todos:updated",
  // Todo overlay window
  OPEN_TODO_OVERLAY: "todo-overlay:open",
  CLOSE_TODO_OVERLAY: "todo-overlay:close",
  IS_TODO_OVERLAY_OPEN: "todo-overlay:is-open",
  // Voice status broadcast (for todo overlay VoiceOrb)
  BROADCAST_VOICE_STATUS: "voice:broadcast-status",
  ON_VOICE_STATUS: "voice:status-update",
  // App focus tracking
  ON_APP_FOCUS_CHANGED: "app:focus-changed",
  // Voice agent
  ENSURE_VOICE_AGENT: "agent:ensure",
  ENSURE_CHECKIN_AGENT: "agent:ensure-checkin",
  // Voice chat (todo overlay orb → main window)
  VOICE_CHAT_OPEN: "voice:chat-open",
  ON_VOICE_CHAT_OPEN: "voice:on-chat-open",
  HAS_ELEVENLABS_KEY: "settings:has-elevenlabs-key",
  ELEVENLABS_TTS: "tts:elevenlabs",
  // Wins tracker
  GET_WINS: "wins:get"
};
const KNOWN_BROWSERS = [
  "Google Chrome",
  "Chrome",
  "chrome.exe",
  "Safari",
  "Firefox",
  "firefox.exe",
  "Arc",
  "arc.exe",
  "Microsoft Edge",
  "Edge",
  "msedge",
  "msedge.exe",
  "Brave Browser",
  "Brave",
  "brave.exe",
  "Opera",
  "opera.exe",
  "Vivaldi",
  "vivaldi.exe",
  "Chromium",
  "chromium.exe"
];
const DEFAULT_CATEGORY_RULES = [
  { id: "prod-code", matchType: "app", pattern: "Code", category: "productive" },
  { id: "prod-terminal", matchType: "app", pattern: "Terminal", category: "productive" },
  { id: "prod-iterm", matchType: "app", pattern: "iTerm", category: "productive" },
  { id: "prod-xcode", matchType: "app", pattern: "Xcode", category: "productive" },
  { id: "prod-notion", matchType: "app", pattern: "Notion", category: "productive" },
  { id: "ent-twitter", matchType: "app", pattern: "Twitter", category: "entertainment" },
  { id: "ent-reddit", matchType: "app", pattern: "Reddit", category: "entertainment" },
  { id: "ent-tiktok", matchType: "app", pattern: "TikTok", category: "entertainment" },
  { id: "ent-youtube", matchType: "app", pattern: "YouTube", category: "entertainment" },
  { id: "ent-instagram", matchType: "app", pattern: "Instagram", category: "entertainment" },
  { id: "soc-slack", matchType: "app", pattern: "Slack", category: "social" },
  { id: "soc-discord", matchType: "app", pattern: "Discord", category: "social" },
  { id: "soc-messages", matchType: "app", pattern: "Messages", category: "social" },
  // Domain-based rules (match browser window titles/URLs)
  { id: "title-youtube", matchType: "title", pattern: "youtube.com", category: "entertainment" },
  { id: "title-reddit", matchType: "title", pattern: "reddit.com", category: "entertainment" },
  { id: "title-twitter", matchType: "title", pattern: "twitter.com", category: "entertainment" },
  { id: "title-x", matchType: "title", pattern: "x.com", category: "entertainment" },
  { id: "title-tiktok", matchType: "title", pattern: "tiktok.com", category: "entertainment" },
  { id: "title-instagram", matchType: "title", pattern: "instagram.com", category: "entertainment" },
  { id: "title-twitch", matchType: "title", pattern: "twitch.tv", category: "entertainment" },
  { id: "title-netflix", matchType: "title", pattern: "netflix.com", category: "entertainment" },
  { id: "title-facebook", matchType: "title", pattern: "facebook.com", category: "entertainment" },
  { id: "title-messenger", matchType: "title", pattern: "messenger.com", category: "social" },
  { id: "title-linkedin", matchType: "title", pattern: "linkedin.com", category: "social" },
  { id: "title-github", matchType: "title", pattern: "github.com", category: "productive" },
  { id: "title-stackoverflow", matchType: "title", pattern: "stackoverflow.com", category: "productive" },
  { id: "title-googledocs", matchType: "title", pattern: "docs.google.com", category: "productive" }
];
const DEFAULT_SETTINGS = {
  persona: "calm_friend",
  toughLoveExplicitAllowed: false,
  scoreThreshold: 25,
  cooldownSeconds: 180,
  apiUrl: "http://127.0.0.1:8000",
  elevenLabsApiKey: "",
  geminiApiKey: "",
  muted: false,
  ttsEngine: "auto",
  scriptSource: "default",
  visionEnabled: true,
  categoryRules: DEFAULT_CATEGORY_RULES,
  hasCompletedOnboarding: false,
  userName: "",
  autoShowTodoOverlay: true,
  timeFormat: "12h",
  timeZone: "system",
  lastDailySetupDate: "",
  elevenLabsAgentId: "",
  elevenLabsAgentPersona: "",
  elevenLabsAgentVersion: 0,
  monitoringEnabled: true
};
const FIELD_DEFS = [
  {
    key: "text",
    colSql: "text",
    normalize: (raw) => {
      if (typeof raw !== "string") return { shouldSet: false };
      const text = raw.trim();
      if (!text) return { shouldSet: false };
      return { shouldSet: true, value: text };
    }
  },
  {
    key: "done",
    colSql: "done",
    normalize: (raw) => {
      if (typeof raw !== "boolean") return { shouldSet: false };
      return { shouldSet: true, value: raw ? 1 : 0 };
    }
  },
  {
    key: "order",
    colSql: '"order"',
    normalize: (raw) => {
      if (typeof raw !== "number" || !Number.isFinite(raw)) return { shouldSet: false };
      return { shouldSet: true, value: Math.trunc(raw) };
    }
  },
  {
    key: "app",
    colSql: "app",
    normalize: (raw) => {
      if (raw == null) return { shouldSet: true, value: null };
      if (typeof raw !== "string") return { shouldSet: false };
      const app = raw.trim();
      return { shouldSet: true, value: app ? app : null };
    }
  },
  {
    key: "url",
    colSql: "url",
    normalize: (raw) => {
      if (raw == null) return { shouldSet: true, value: null };
      if (typeof raw !== "string") return { shouldSet: false };
      const url = raw.trim();
      return { shouldSet: true, value: url ? url : null };
    }
  },
  {
    key: "allowedApps",
    colSql: "allowed_apps",
    normalize: (raw) => {
      if (raw == null) return { shouldSet: true, value: null };
      if (!Array.isArray(raw)) return { shouldSet: false };
      return { shouldSet: true, value: JSON.stringify(raw) };
    }
  },
  {
    key: "deadline",
    colSql: "deadline",
    normalize: (raw) => {
      if (raw == null) return { shouldSet: true, value: null };
      if (typeof raw !== "string") return { shouldSet: false };
      const deadline = raw.trim();
      return { shouldSet: true, value: deadline ? deadline : null };
    }
  },
  {
    key: "startTime",
    colSql: "start_time",
    normalize: (raw) => {
      if (raw == null) return { shouldSet: true, value: null };
      if (typeof raw !== "string") return { shouldSet: false };
      const st = raw.trim();
      return { shouldSet: true, value: st ? st : null };
    }
  },
  {
    key: "durationMinutes",
    colSql: "duration_minutes",
    normalize: (raw) => {
      if (raw == null) return { shouldSet: true, value: null };
      if (typeof raw !== "number" || !Number.isFinite(raw)) return { shouldSet: false };
      return { shouldSet: true, value: Math.trunc(raw) };
    }
  }
];
function buildUpdateTodoSql(fields) {
  const setParts = [];
  const values = [];
  const rec = fields;
  for (const def of FIELD_DEFS) {
    if (!Object.prototype.hasOwnProperty.call(fields, def.key)) continue;
    const raw = rec[def.key];
    const normalized = def.normalize(raw);
    if (!normalized.shouldSet) continue;
    setParts.push(`${def.colSql} = ?`);
    values.push(normalized.value);
  }
  if (setParts.length === 0) return null;
  return { setSql: setParts.join(", "), values };
}
let db;
function initDatabase() {
  const dbPath = path.join(electron.app.getPath("userData"), "norot.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS telemetry_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS score_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      score REAL NOT NULL,
      severity INTEGER NOT NULL,
      reasons TEXT NOT NULL,
      recommendation TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS interventions (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      score REAL NOT NULL,
      severity INTEGER NOT NULL,
      persona TEXT NOT NULL,
      text TEXT NOT NULL,
      user_response TEXT DEFAULT 'pending',
      audio_played INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      "order" INTEGER NOT NULL DEFAULT 0
    );
  `);
  const migrateColumns = [
    "app TEXT",
    "url TEXT",
    "allowed_apps TEXT",
    "deadline TEXT",
    "start_time TEXT",
    "duration_minutes INTEGER"
  ];
  for (const col of migrateColumns) {
    try {
      db.exec(`ALTER TABLE todos ADD COLUMN ${col}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("duplicate column")) {
        console.error(`[database] Migration failed for column ${col}:`, msg);
      }
    }
  }
  const insertSetting = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
  );
  const seedSettings = db.transaction(() => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      insertSetting.run(key, JSON.stringify(value));
    }
  });
  seedSettings();
  const hasData = db.prepare(
    "SELECT COUNT(*) as count FROM interventions"
  ).get();
  if (hasData.count > 0) {
    db.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('hasCompletedOnboarding', 'true')"
    ).run();
  }
  const rulesRow = db.prepare(
    "SELECT value FROM settings WHERE key = 'categoryRules'"
  ).get();
  if (rulesRow) {
    try {
      const savedRules = JSON.parse(rulesRow.value);
      const hasTitleRules = savedRules.some((r) => r.matchType === "title");
      if (!hasTitleRules) {
        const titleRules = DEFAULT_CATEGORY_RULES.filter((r) => r.matchType === "title");
        const merged = [...savedRules, ...titleRules];
        db.prepare(
          "INSERT OR REPLACE INTO settings (key, value) VALUES ('categoryRules', ?)"
        ).run(JSON.stringify(merged));
      }
    } catch {
    }
  }
}
function insertSnapshot(timestamp, data) {
  db.prepare("INSERT INTO telemetry_snapshots (timestamp, data) VALUES (?, ?)").run(
    timestamp,
    data
  );
}
function getLatestSnapshot() {
  const row = db.prepare(
    "SELECT data FROM telemetry_snapshots ORDER BY id DESC LIMIT 1"
  ).get();
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.data);
    return {
      activeApp: parsed?.categories?.activeApp ?? "unknown",
      activeDomain: parsed?.categories?.activeDomain
    };
  } catch {
    return null;
  }
}
function getUsageHistory(minutes = 60) {
  const cutoff = new Date(Date.now() - minutes * 60 * 1e3).toISOString();
  const rows = db.prepare(
    "SELECT timestamp, data FROM telemetry_snapshots WHERE timestamp >= ? ORDER BY timestamp ASC"
  ).all(cutoff);
  const byMinute = /* @__PURE__ */ new Map();
  for (const row of rows) {
    try {
      const snapshot = JSON.parse(row.data);
      const ts = typeof snapshot?.timestamp === "string" ? snapshot.timestamp : row.timestamp;
      const minuteKey = ts.slice(0, 16);
      const productive = Number(snapshot?.signals?.productiveMinutes);
      const distracting = Number(snapshot?.signals?.distractingMinutes);
      if (!Number.isFinite(productive) || !Number.isFinite(distracting)) continue;
      byMinute.set(minuteKey, { timestamp: ts, productive, distracting });
    } catch {
    }
  }
  const minutesSeries = Array.from(byMinute.entries()).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, v]) => v);
  let prevProd = 0;
  let prevDist = 0;
  const points = [];
  for (const entry of minutesSeries) {
    const prodDelta = Math.max(0, entry.productive - prevProd);
    const distDelta = Math.max(0, entry.distracting - prevDist);
    points.push({ timestamp: entry.timestamp, productive: prodDelta, distracting: distDelta });
    prevProd = entry.productive;
    prevDist = entry.distracting;
  }
  return points;
}
function getAppStats(minutes = 1440) {
  const cutoff = new Date(Date.now() - minutes * 60 * 1e3).toISOString();
  const rows = db.prepare(
    "SELECT timestamp, data FROM telemetry_snapshots WHERE timestamp >= ? ORDER BY timestamp ASC"
  ).all(cutoff);
  const apps = /* @__PURE__ */ new Map();
  for (const row of rows) {
    try {
      const snapshot = JSON.parse(row.data);
      const rawAppName = snapshot?.categories?.activeApp;
      const category = snapshot?.categories?.activeCategory;
      const activeDomain = snapshot?.categories?.activeDomain;
      if (typeof rawAppName !== "string" || !rawAppName) continue;
      const key = `${rawAppName}||${activeDomain ?? ""}`;
      const ts = typeof snapshot?.timestamp === "string" ? snapshot.timestamp : row.timestamp;
      const existing = apps.get(key);
      if (existing) {
        existing.totalSeconds += 5;
        existing.lastSeen = ts;
      } else {
        apps.set(key, {
          appName: rawAppName,
          ...typeof activeDomain === "string" && activeDomain ? { domain: activeDomain } : {},
          category: category ?? "neutral",
          totalSeconds: 5,
          lastSeen: ts
        });
      }
    } catch {
    }
  }
  return Array.from(apps.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);
}
function insertScore(score) {
  db.prepare(
    "INSERT INTO score_history (timestamp, score, severity, reasons, recommendation) VALUES (?, ?, ?, ?, ?)"
  ).run(
    (/* @__PURE__ */ new Date()).toISOString(),
    score.procrastinationScore,
    score.severity,
    JSON.stringify(score.reasons),
    JSON.stringify(score.recommendation)
  );
}
function getScoreHistory(limit = 50) {
  const rows = db.prepare("SELECT * FROM score_history ORDER BY id DESC LIMIT ?").all(limit);
  return rows.map((row) => ({
    procrastinationScore: row.score,
    severity: row.severity,
    reasons: JSON.parse(row.reasons),
    recommendation: JSON.parse(row.recommendation)
  }));
}
function getLatestScore() {
  const results = getScoreHistory(1);
  return results.length > 0 ? results[0] : null;
}
function insertIntervention(event) {
  db.prepare(
    "INSERT INTO interventions (id, timestamp, score, severity, persona, text, user_response, audio_played) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    event.id,
    event.timestamp,
    event.score,
    event.severity,
    event.persona,
    event.text,
    event.userResponse,
    event.audioPlayed ? 1 : 0
  );
}
function updateInterventionResponse(eventId, response) {
  db.prepare("UPDATE interventions SET user_response = ? WHERE id = ?").run(
    response,
    eventId
  );
}
function updateAudioPlayed(interventionId) {
  db.prepare("UPDATE interventions SET audio_played = 1 WHERE id = ?").run(interventionId);
}
function getSettings() {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in settings) {
      settings[row.key] = JSON.parse(row.value);
    }
  }
  if (settings.persona === "tough_love" && settings.toughLoveExplicitAllowed !== true) {
    settings.persona = "coach";
  }
  return settings;
}
function updateSetting(key, value) {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(
    key,
    JSON.stringify(value)
  );
}
function getTodos() {
  const rows = db.prepare('SELECT id, text, done, "order", app, url, allowed_apps, deadline, start_time, duration_minutes FROM todos ORDER BY "order" ASC').all();
  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    done: row.done === 1,
    order: row.order,
    ...row.app != null ? { app: row.app } : {},
    ...row.url != null ? { url: row.url } : {},
    ...row.allowed_apps ? { allowedApps: JSON.parse(row.allowed_apps) } : {},
    ...row.deadline != null ? { deadline: row.deadline } : {},
    ...row.start_time != null ? { startTime: row.start_time } : {},
    ...row.duration_minutes != null ? { durationMinutes: row.duration_minutes } : {}
  }));
}
function addTodo(item) {
  db.prepare(
    'INSERT INTO todos (id, text, done, "order", app, url, allowed_apps, deadline, start_time, duration_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    item.id,
    item.text,
    item.done ? 1 : 0,
    item.order,
    item.app ?? null,
    item.url ?? null,
    item.allowedApps ? JSON.stringify(item.allowedApps) : null,
    item.deadline ?? null,
    item.startTime ?? null,
    item.durationMinutes ?? null
  );
}
function toggleTodo(id) {
  db.prepare(
    "UPDATE todos SET done = CASE WHEN done = 0 THEN 1 ELSE 0 END WHERE id = ?"
  ).run(id);
}
function deleteTodo(id) {
  db.prepare("DELETE FROM todos WHERE id = ?").run(id);
}
function updateTodo(id, fields) {
  const built = buildUpdateTodoSql(fields);
  if (!built) return;
  db.prepare(`UPDATE todos SET ${built.setSql} WHERE id = ?`).run(...built.values, id);
}
function reorderTodo(id, newOrder) {
  db.prepare('UPDATE todos SET "order" = ? WHERE id = ?').run(newOrder, id);
}
function appendTodos(items) {
  if (items.length === 0) return;
  const row = db.prepare('SELECT COALESCE(MAX("order"), -1) AS maxOrder FROM todos').get();
  const startOrder = (typeof row?.maxOrder === "number" ? row.maxOrder : -1) + 1;
  const insert = db.prepare(
    'INSERT OR REPLACE INTO todos (id, text, done, "order", app, url, allowed_apps, deadline, start_time, duration_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const doAppend = db.transaction((todos) => {
    for (let i = 0; i < todos.length; i++) {
      const item = todos[i];
      insert.run(
        item.id,
        item.text,
        item.done ? 1 : 0,
        startOrder + i,
        item.app ?? null,
        item.url ?? null,
        item.allowedApps ? JSON.stringify(item.allowedApps) : null,
        item.deadline ?? null,
        item.startTime ?? null,
        item.durationMinutes ?? null
      );
    }
  });
  doAppend(items);
}
function setTodos(items) {
  const clear = db.prepare("DELETE FROM todos");
  const insert = db.prepare(
    'INSERT INTO todos (id, text, done, "order", app, url, allowed_apps, deadline, start_time, duration_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const replaceAll = db.transaction((todos) => {
    clear.run();
    for (const item of todos) {
      insert.run(
        item.id,
        item.text,
        item.done ? 1 : 0,
        item.order,
        item.app ?? null,
        item.url ?? null,
        item.allowedApps ? JSON.stringify(item.allowedApps) : null,
        item.deadline ?? null,
        item.startTime ?? null,
        item.durationMinutes ?? null
      );
    }
  });
  replaceAll(items);
}
function getWinsData() {
  const todayMidnight = /* @__PURE__ */ new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const cutoff = todayMidnight.toISOString();
  const refocusRow = db.prepare(
    "SELECT COUNT(*) as count FROM interventions WHERE user_response = 'working' AND timestamp >= ?"
  ).get(cutoff);
  const latestSnapshot = db.prepare(
    "SELECT data FROM telemetry_snapshots ORDER BY id DESC LIMIT 1"
  ).get();
  let totalFocusedMinutes = 0;
  if (latestSnapshot) {
    try {
      const parsed = JSON.parse(latestSnapshot.data);
      const productive = Number(parsed?.signals?.productiveMinutes);
      if (Number.isFinite(productive)) {
        totalFocusedMinutes = Math.round(productive);
      }
    } catch {
    }
  }
  return {
    refocusCount: refocusRow.count,
    totalFocusedMinutes
  };
}
function closeDatabase() {
  if (db) {
    db.close();
  }
}
const TITLE_DOMAIN_MAP = {
  youtube: "youtube.com",
  reddit: "reddit.com",
  twitter: "twitter.com",
  facebook: "facebook.com",
  instagram: "instagram.com",
  tiktok: "tiktok.com",
  netflix: "netflix.com",
  linkedin: "linkedin.com",
  github: "github.com",
  "stack overflow": "stackoverflow.com",
  twitch: "twitch.tv",
  stackoverflow: "stackoverflow.com",
  "google docs": "docs.google.com",
  "google sheets": "docs.google.com",
  "google slides": "docs.google.com",
  "google drive": "drive.google.com",
  gmail: "mail.google.com"
};
function isBrowser(appName) {
  const lower = appName.toLowerCase();
  return KNOWN_BROWSERS.some((b) => lower.includes(b.toLowerCase()));
}
function extractDomain(url, title) {
  if (url) {
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, "");
      if (hostname) return hostname;
    } catch {
    }
  }
  if (title) {
    const segments = title.split(/\s[-–—|•]\s/g).map((s) => s.trim()).filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i].toLowerCase();
      for (const [name, domain] of Object.entries(TITLE_DOMAIN_MAP)) {
        if (seg === name || seg.startsWith(name + " ")) return domain;
      }
      if (seg.includes(".") && !seg.includes(" ")) {
        return seg.replace(/^www\./, "");
      }
    }
  }
  return void 0;
}
function classifyApp(appName, rules, windowTitle, windowUrl) {
  const lower = appName.toLowerCase();
  for (const rule of rules) {
    if (rule.matchType !== "app") continue;
    if (lower.includes(rule.pattern.toLowerCase())) {
      return rule.category;
    }
  }
  if (isBrowser(appName) && (windowTitle || windowUrl)) {
    const domain = extractDomain(windowUrl, windowTitle);
    if (domain) {
      for (const rule of rules) {
        if (rule.matchType !== "title") continue;
        if (domain.includes(rule.pattern.toLowerCase())) {
          return rule.category;
        }
      }
    }
  }
  return "neutral";
}
const VISION_MODEL_ID = "Xenova/clip-vit-base-patch32";
const VISION_THROTTLE_MS = 1e4;
const MIN_VISION_CONFIDENCE = 0.35;
const CANDIDATE_LABELS = [
  { label: "writing code in an IDE", kind: "coding", category: "productive" },
  { label: "debugging code", kind: "coding", category: "productive" },
  { label: "working in a spreadsheet", kind: "spreadsheets", category: "productive" },
  { label: "editing a presentation slide", kind: "presentations", category: "productive" },
  { label: "writing a document", kind: "writing", category: "productive" },
  { label: "reading technical documentation", kind: "docs", category: "productive" },
  { label: "checking email", kind: "email", category: "neutral" },
  { label: "chatting in a messaging app", kind: "chat", category: "social" },
  { label: "scrolling social media", kind: "social_feed", category: "social" },
  { label: "watching an online video", kind: "video", category: "entertainment" },
  { label: "shopping online", kind: "shopping", category: "entertainment" },
  { label: "playing a video game", kind: "games", category: "entertainment" },
  { label: "using system settings", kind: "settings", category: "neutral" },
  { label: "browsing files in a file manager", kind: "file_manager", category: "neutral" }
];
function brandFromDomain(domain) {
  const d = domain.toLowerCase();
  if (d.includes("instagram.com")) return "Instagram";
  if (d.includes("tiktok.com")) return "TikTok";
  if (d.includes("youtube.com") || d.includes("youtu.be")) return "YouTube";
  if (d.includes("reddit.com")) return "Reddit";
  if (d === "x.com" || d.includes("twitter.com")) return "X";
  if (d.includes("facebook.com")) return "Facebook";
  if (d.includes("twitch.tv")) return "Twitch";
  if (d.includes("netflix.com")) return "Netflix";
  if (d.includes("linkedin.com")) return "LinkedIn";
  if (d.includes("github.com")) return "GitHub";
  if (d.includes("stackoverflow.com")) return "Stack Overflow";
  if (d.includes("docs.google.com")) return "Google Docs";
  return null;
}
function rulesBasedActivity(ctx) {
  const domain = ctx.windowUrl || ctx.windowTitle ? extractDomain(ctx.windowUrl, ctx.windowTitle) : void 0;
  if (domain) {
    const brand = brandFromDomain(domain);
    if (brand === "Instagram") {
      return { category: "social", activityLabel: "scrolling Instagram", activityKind: "social_feed", activityConfidence: 1, activitySource: "rules" };
    }
    if (brand === "TikTok") {
      return { category: "entertainment", activityLabel: "scrolling TikTok", activityKind: "video", activityConfidence: 1, activitySource: "rules" };
    }
    if (brand === "YouTube") {
      return { category: "entertainment", activityLabel: "watching YouTube", activityKind: "video", activityConfidence: 1, activitySource: "rules" };
    }
    if (brand === "Reddit") {
      return { category: "entertainment", activityLabel: "browsing Reddit", activityKind: "social_feed", activityConfidence: 1, activitySource: "rules" };
    }
    if (brand === "X") {
      return { category: "entertainment", activityLabel: "browsing X", activityKind: "social_feed", activityConfidence: 1, activitySource: "rules" };
    }
    if (brand === "GitHub") {
      return { category: "productive", activityLabel: "coding on GitHub", activityKind: "coding", activityConfidence: 1, activitySource: "rules" };
    }
    if (brand === "Stack Overflow") {
      return { category: "productive", activityLabel: "debugging on Stack Overflow", activityKind: "coding", activityConfidence: 1, activitySource: "rules" };
    }
    if (brand === "Google Docs") {
      return { category: "productive", activityLabel: "working in Google Docs", activityKind: "docs", activityConfidence: 1, activitySource: "rules" };
    }
  }
  const appName = ctx.appName.toLowerCase();
  if (appName.includes("code") || appName.includes("xcode") || appName.includes("intellij") || appName.includes("webstorm")) {
    return { category: "productive", activityLabel: "coding", activityKind: "coding", activityConfidence: 1, activitySource: "rules" };
  }
  if (appName.includes("excel") || appName.includes("numbers") || appName.includes("google sheets") || appName.includes("spreadsheet")) {
    return { category: "productive", activityLabel: "working in a spreadsheet", activityKind: "spreadsheets", activityConfidence: 1, activitySource: "rules" };
  }
  if (appName.includes("powerpoint") || appName.includes("keynote") || appName.includes("slides")) {
    return { category: "productive", activityLabel: "editing a presentation", activityKind: "presentations", activityConfidence: 1, activitySource: "rules" };
  }
  if (appName.includes("word") || appName.includes("pages") || appName.includes("notes") || appName.includes("notion")) {
    return { category: "productive", activityLabel: "writing", activityKind: "writing", activityConfidence: 0.9, activitySource: "rules" };
  }
  if (appName.includes("finder") || appName.includes("file explorer")) {
    return { category: "neutral", activityLabel: "browsing files", activityKind: "file_manager", activityConfidence: 0.9, activitySource: "rules" };
  }
  if (appName.includes("system settings") || appName === "settings") {
    return { category: "neutral", activityLabel: "changing settings", activityKind: "settings", activityConfidence: 0.9, activitySource: "rules" };
  }
  return null;
}
async function captureActiveWindowPng(ctx) {
  try {
    if (!ctx.bounds || ctx.bounds.width <= 1 || ctx.bounds.height <= 1) return null;
    const displays = electron.screen.getAllDisplays();
    const centerX = ctx.bounds.x + ctx.bounds.width / 2;
    const centerY = ctx.bounds.y + ctx.bounds.height / 2;
    const display = displays.find(
      (d) => centerX >= d.bounds.x && centerX < d.bounds.x + d.bounds.width && centerY >= d.bounds.y && centerY < d.bounds.y + d.bounds.height
    ) ?? electron.screen.getPrimaryDisplay();
    const sources = await electron.desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 900, height: 600 },
      fetchWindowIcons: false
    });
    const source = sources.find((s) => s.display_id === String(display.id)) ?? sources[0];
    if (!source) return null;
    const thumb = source.thumbnail;
    const thumbSize = thumb.getSize();
    if (thumbSize.width <= 1 || thumbSize.height <= 1) return null;
    const displayBounds = display.bounds;
    const scaleX = thumbSize.width / displayBounds.width;
    const scaleY = thumbSize.height / displayBounds.height;
    const x = Math.round((ctx.bounds.x - displayBounds.x) * scaleX);
    const y = Math.round((ctx.bounds.y - displayBounds.y) * scaleY);
    const width = Math.round(ctx.bounds.width * scaleX);
    const height = Math.round(ctx.bounds.height * scaleY);
    const cropX = Math.max(0, Math.min(thumbSize.width - 1, x));
    const cropY = Math.max(0, Math.min(thumbSize.height - 1, y));
    const cropW = Math.max(1, Math.min(thumbSize.width - cropX, width));
    const cropH = Math.max(1, Math.min(thumbSize.height - cropY, height));
    if (cropW < 20 || cropH < 20) return null;
    const cropped = thumb.crop({ x: cropX, y: cropY, width: cropW, height: cropH });
    const resized = cropped.resize({ width: 384, height: 384, quality: "good" });
    return resized.toPNG();
  } catch (err) {
    console.warn("[vision] capture failed:", err);
    return null;
  }
}
let cachedVisionPipeline = null;
let cachedVisionPipelinePromise = null;
async function getVisionPipeline() {
  if (cachedVisionPipeline) return cachedVisionPipeline;
  if (cachedVisionPipelinePromise) return cachedVisionPipelinePromise;
  cachedVisionPipelinePromise = (async () => {
    const mod = await import("@xenova/transformers");
    const { env, pipeline, RawImage: RawImageClass } = mod;
    try {
      env.useBrowserCache = false;
      env.useFSCache = true;
      env.cacheDir = path.join(electron.app.getPath("userData"), "hf-cache");
    } catch {
    }
    const p = await pipeline("zero-shot-image-classification", VISION_MODEL_ID);
    cachedVisionPipeline = { classifier: p, RawImage: RawImageClass };
    return cachedVisionPipeline;
  })();
  return cachedVisionPipelinePromise;
}
function createActivityClassifier() {
  let lastKey = "";
  let lastAt = 0;
  let lastResult = null;
  return {
    async classify(ctx, categoryRules, visionEnabled) {
      const baseCategory = classifyApp(ctx.appName, categoryRules, ctx.windowTitle, ctx.windowUrl);
      const baseDomain = isBrowser(ctx.appName) ? extractDomain(ctx.windowUrl, ctx.windowTitle) : void 0;
      const base = {
        category: baseCategory,
        ...baseDomain ? { activityLabel: brandFromDomain(baseDomain) ? `browsing ${brandFromDomain(baseDomain)}` : void 0 } : {},
        activityKind: baseDomain ? "unknown" : void 0,
        activityConfidence: 0.5,
        activitySource: "rules"
      };
      const rulesActivity = rulesBasedActivity(ctx);
      if (rulesActivity) {
        return { ...base, ...rulesActivity };
      }
      if (!visionEnabled) return base;
      if (process.platform === "darwin") {
        const status = electron.systemPreferences.getMediaAccessStatus("screen");
        if (status !== "granted") return base;
      }
      if (!isBrowser(ctx.appName) && baseCategory === "productive") return base;
      const key = `${ctx.appName}|${baseDomain ?? ""}|${ctx.windowTitle ?? ""}`;
      const now = Date.now();
      if (key === lastKey && lastResult && now - lastAt < VISION_THROTTLE_MS) {
        return lastResult;
      }
      const png = await captureActiveWindowPng(ctx);
      if (!png) return base;
      try {
        const { classifier, RawImage: RawImageClass } = await getVisionPipeline();
        const pngArrayBuffer = Uint8Array.from(png).buffer;
        const image = await RawImageClass.fromBlob(new Blob([pngArrayBuffer], { type: "image/png" }));
        const labels = CANDIDATE_LABELS.map((c) => c.label);
        const output = await classifier(image, labels, {
          hypothesis_template: "This is a screenshot of someone {}."
        });
        const top = output?.[0];
        if (!top || typeof top.label !== "string" || typeof top.score !== "number") return base;
        if (!Number.isFinite(top.score) || top.score < MIN_VISION_CONFIDENCE) return base;
        const mapped = CANDIDATE_LABELS.find((c) => c.label === top.label);
        const result = {
          category: mapped?.category ?? baseCategory,
          activityLabel: mapped ? top.label : void 0,
          activityKind: mapped?.kind ?? "unknown",
          activityConfidence: top.score,
          activitySource: "vision"
        };
        lastKey = key;
        lastAt = now;
        lastResult = result;
        return result;
      } catch (err) {
        console.warn("[vision] classify failed:", err);
        return base;
      }
    }
  };
}
function normalizeText(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}
const HARD_OFFLINE_PATTERNS = [
  // Going to physical places
  /\b(go|head|drive|walk|run|bike|ride|travel|leave)\s+(to|for)\s+(the\s+)?(beach|gym|park|doctor|dentist|hospital|clinic|pharmacy|post\s+office|airport)\b/,
  // Chores / body needs
  /\b(take|have|get)\s+(a\s+)?(shower|bath)\b/,
  /\b(do|fold|put\s+away)\s+(the\s+)?laundry\b/,
  /\b(wash|do)\s+(the\s+)?dishes\b/,
  /\b(take\s+out|throw\s+out)\s+(the\s+)?trash\b/,
  // Exercise
  /\b(go)\s+for\s+(a\s+)?(run|walk|jog)\b/,
  /\b(walk)\s+(the\s+)?dog\b/,
  // Cooking
  /\b(cook|make)\s+(dinner|lunch|breakfast)\b/
];
const SOFT_OFFLINE_PATTERNS = [
  /\b(buy|get|pick\s+up)\s+groceries\b/,
  /\bgrocery\s+shopping\b/
];
function hasDigitalCue(todo) {
  if (typeof todo.url === "string" && todo.url.trim()) return true;
  if (Array.isArray(todo.allowedApps) && todo.allowedApps.some((a) => {
    const s = String(a).toLowerCase();
    return s.includes("http") || s.includes(".") || s.includes("/");
  })) return true;
  const t = normalizeText(todo.text);
  return /\b(online|order|delivery|deliver|instacart|doordash|ubereats|grubhub|amazon|in\s+chrome|in\s+safari|in\s+edge|on\s+the\s+website|open\s+the\s+site|search|google)\b/.test(t);
}
function isTodoLikelyOffline(todo) {
  const t = normalizeText(todo.text);
  if (!t) return true;
  if (HARD_OFFLINE_PATTERNS.some((re) => re.test(t))) return true;
  const softMatch = SOFT_OFFLINE_PATTERNS.some((re) => re.test(t));
  if (softMatch) return !hasDigitalCue(todo);
  return false;
}
function filterComputerScopedTodos(todos) {
  return todos.filter((t) => !isTodoLikelyOffline(t));
}
let cachedClient = null;
let cachedApiKey = "";
function getClient(apiKey) {
  if (cachedClient && cachedApiKey === apiKey) return cachedClient;
  cachedClient = new genai.GoogleGenAI({ apiKey });
  cachedApiKey = apiKey;
  return cachedClient;
}
async function generateScriptInternal(opts) {
  const { apiKey, severity, persona, context } = opts;
  const toughLoveExplicitAllowed = opts.toughLoveExplicitAllowed ?? false;
  try {
    const band = shared.SEVERITY_BANDS.find((b) => b.severity === severity);
    if (!band || band.mode === "none") return null;
    const personaInfo = shared.PERSONAS[persona];
    const client = getClient(apiKey);
    const isExplicitToughLove = persona === "tough_love" && toughLoveExplicitAllowed;
    const baseIntro = `You are a procrastination interrupter app called noRot. Your persona is "${personaInfo.label}" — ${personaInfo.description}. Many users have ADHD or executive-function challenges. Procrastination is not laziness — it is often an emotion-regulation difficulty.
`;
    let systemInstruction = "";
    let userPrompt = "";
    if (!context) {
      systemInstruction = baseIntro + `Rules:
- Write exactly 1-2 sentences.
- Speak directly to the user in second person.
- Do NOT mention any app names, websites, or personal data.
- Keep it natural for text-to-speech (no emojis, no markdown, no special characters).
- Match the intensity to the severity level.
- Be unique and varied each time — never repeat the same phrasing.
` + (isExplicitToughLove ? `- You MAY use profanity and aggressive humor (18+). You can be loud, dramatic, and funny.
- Internet slang is okay (bruh, lol, lmao). All-caps emphasis is allowed.
- No slurs, hate, or threats. Don't insult the user's identity — roast the behavior/loop.
- It's okay to give direct commands (e.g., "Close it and start").
` : `- Never shame or blame. Ask curious questions like "What's making it hard to start?" instead of commands like "Stop wasting time."
`) + `- Suggest the smallest possible next step to lower the barrier to action.`;
      userPrompt = `Generate a ${band.mode}-level intervention message. Severity: ${severity}/4 (${band.label}). The user is procrastinating and needs a ${band.mode}.`;
    } else {
      const todoList = context.activeTodos.slice(0, 5).map((t, i) => `${i + 1}. ${t.text}`).join("\n");
      const matchedNote = context.matchedTodo ? `The user appears to be working on: "${context.matchedTodo}".` : "The user does not appear to be working on any specific task.";
      const overdueNote = context.overdueTodos?.length ? `These tasks are past their deadline: ${context.overdueTodos.map((t) => `"${t.text}" (due ${t.deadline})`).join(", ")}. Mention a specific overdue task using a curious question, not a command.` : "";
      systemInstruction = baseIntro + `The user's active tasks:
${todoList}

${matchedNote}
` + (overdueNote ? `${overdueNote}
` : "") + `They are currently using "${context.appName}"` + (context.domain ? ` on ${context.domain}` : "") + `.
Rules:
- Write exactly 1-2 sentences.
- Speak directly to the user in second person.
- If the user is doing something relevant to their task, encourage them.
` + (isExplicitToughLove ? `- If not, redirect them hard with aggressive humor (18+). Profanity allowed.
- Internet slang is okay (bruh, lol, lmao). All-caps emphasis is allowed.
- No slurs, hate, or threats. Don't insult the user's identity — roast the behavior/loop.
` : `- If not, gently redirect them toward their tasks with curiosity, not commands.
- Never shame or blame. Ask questions like "What's one small step you could try?" instead of "Stop wasting time."
`) + `- Keep it natural for text-to-speech (no emojis, no markdown, no special characters).
- Match the intensity to the severity level.
- Be unique and varied each time.`;
      userPrompt = context.matchedTodo ? `The user is on task with "${context.matchedTodo}". Generate an encouraging message.` : `Generate a ${band.mode}-level intervention message. Severity: ${severity}/4 (${band.label}).`;
    }
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.9,
        maxOutputTokens: 100
      }
    });
    const text = response.text?.trim();
    if (!text) {
      console.warn(
        context ? "[gemini] Empty context-aware response from Gemini" : "[gemini] Empty response from Gemini"
      );
      return null;
    }
    return text;
  } catch (err) {
    console.error(
      context ? "[gemini] Error generating context-aware script:" : "[gemini] Error generating script:",
      err
    );
    return null;
  }
}
async function generateScript(apiKey, severity, persona, toughLoveExplicitAllowed = false) {
  return generateScriptInternal({ apiKey, severity, persona, toughLoveExplicitAllowed });
}
async function generateContextAwareScript(apiKey, severity, persona, context, toughLoveExplicitAllowed = false) {
  return generateScriptInternal({ apiKey, severity, persona, context, toughLoveExplicitAllowed });
}
function toGeminiRole(role) {
  return role === "assistant" ? "model" : "user";
}
async function* streamChat(apiKey, messages, systemInstruction) {
  const client = getClient(apiKey);
  const contents = messages.map((msg) => ({
    role: toGeminiRole(msg.role),
    parts: [{ text: msg.content }]
  }));
  const response = await client.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents,
    config: {
      systemInstruction,
      temperature: 0.7,
      maxOutputTokens: 1024
    }
  });
  for await (const chunk of response) {
    const text = chunk.text;
    if (text) yield text;
  }
}
async function extractTodosWithApps(apiKey, transcript) {
  try {
    let normalizeDeadline = function(val) {
      if (typeof val !== "string") return void 0;
      const trimmed = val.trim();
      const m = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
      if (!m) return void 0;
      const hh = Number(m[1]);
      const mm = Number(m[2]);
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) return void 0;
      if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return void 0;
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    };
    const client = getClient(apiKey);
    const systemInstruction = 'You are a task extraction assistant for noRot, a computer productivity tool. Given a conversation transcript, extract clear, actionable to-do items the user can do on their computer (apps/websites). Do NOT include physical-world activities (errands, going places, chores, exercise, shower, etc.). If the transcript only contains offline activities, return an empty list. Return only items that represent concrete tasks the user should do. Do NOT include vague suggestions or things the assistant will do. For each task, suggest a primary app (e.g. "VS Code", "Chrome", "Figma"), a URL if applicable, and a list of allowed apps/websites relevant to that task. If you cannot suggest a reasonable app/allowed list, omit the task. If timing is not stated clearly, omit it (do not guess). If a deadline is mentioned (e.g. "by 5pm"), include deadline in HH:MM 24-hour time. If a start time is mentioned (e.g. "starting at 3pm", "at 14:00"), include startTime in HH:MM 24-hour time. If duration is mentioned (e.g. "takes 2 hours", "about 30 minutes"), include durationMinutes as a number.';
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Extract actionable to-do items from this conversation:

${transcript}`,
      config: {
        systemInstruction,
        temperature: 0.2,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseSchema: {
          type: genai.Type.ARRAY,
          items: {
            type: genai.Type.OBJECT,
            properties: {
              text: {
                type: genai.Type.STRING,
                description: "The task description"
              },
              app: {
                type: genai.Type.STRING,
                description: 'Primary app for this task (e.g. "VS Code", "Chrome", "Figma")'
              },
              url: {
                type: genai.Type.STRING,
                description: 'Relevant URL if applicable (e.g. "github.com")'
              },
              allowedApps: {
                type: genai.Type.ARRAY,
                items: { type: genai.Type.STRING },
                description: "List of apps/websites allowed for this task"
              },
              deadline: {
                type: genai.Type.STRING,
                description: "Optional deadline time in HH:MM (24-hour) if explicitly stated (do not guess)"
              },
              startTime: {
                type: genai.Type.STRING,
                description: "Start time in HH:MM (24-hour) if explicitly stated (do not guess)"
              },
              durationMinutes: {
                type: genai.Type.NUMBER,
                description: "Estimated duration in minutes if explicitly stated (e.g. 30, 60, 120)"
              }
            },
            required: ["text"]
          }
        }
      }
    });
    const raw = JSON.parse(response.text || "[]");
    const mapped = raw.map((item, i) => {
      const deadline = normalizeDeadline(item.deadline);
      const startTime = normalizeDeadline(item.startTime);
      const durationMinutes = typeof item.durationMinutes === "number" && item.durationMinutes > 0 ? Math.trunc(item.durationMinutes) : void 0;
      const text = typeof item.text === "string" ? item.text.trim() : "";
      return {
        id: crypto.randomUUID(),
        text,
        done: false,
        order: i,
        ...item.app ? { app: item.app } : {},
        ...item.url ? { url: item.url } : {},
        ...item.allowedApps?.length ? { allowedApps: item.allowedApps } : {},
        ...deadline ? { deadline } : {},
        ...startTime ? { startTime } : {},
        ...durationMinutes ? { durationMinutes } : {}
      };
    }).filter((t) => t.text.length > 0);
    const scoped = filterComputerScopedTodos(mapped);
    return scoped.map((t, i) => ({ ...t, order: i }));
  } catch (err) {
    console.error("[gemini] Error extracting todos:", err);
    return [];
  }
}
const CACHE_TTL_MS = 5 * 60 * 1e3;
const CACHE_MAX_SIZE = 100;
const contextCache = /* @__PURE__ */ new Map();
function getCached(key) {
  const entry = contextCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    contextCache.delete(key);
    return null;
  }
  contextCache.delete(key);
  contextCache.set(key, entry);
  return entry.result;
}
function setCached(key, result) {
  if (contextCache.size >= CACHE_MAX_SIZE) {
    const oldest = contextCache.keys().next().value;
    if (oldest !== void 0) contextCache.delete(oldest);
  }
  contextCache.set(key, { result, timestamp: Date.now() });
}
function clearContextCache() {
  contextCache.clear();
}
async function checkContextRelevance(apiKey, appName, windowTitle, domain, activeTodos) {
  const todosWithApps = activeTodos.filter(
    (t) => !t.done && t.allowedApps && t.allowedApps.length > 0
  );
  if (todosWithApps.length === 0) return null;
  const lowerApp = appName.toLowerCase();
  const lowerDomain = (domain ?? "").toLowerCase();
  const matched = todosWithApps.find(
    (t) => t.allowedApps.some((allowed) => {
      const lowerAllowed = allowed.toLowerCase();
      return lowerApp.includes(lowerAllowed) || lowerDomain && lowerDomain.includes(lowerAllowed);
    })
  );
  if (!matched) return null;
  const cacheKey = `${appName}|${domain ?? ""}|${windowTitle ?? ""}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  try {
    const client = getClient(apiKey);
    const todoList = todosWithApps.slice(0, 5).map((t, i) => `${i + 1}. "${t.text}" (allowed apps: ${t.allowedApps.join(", ")})`).join("\n");
    const systemInstruction = `The user has these tasks:
${todoList}

They are currently using "${appName}" viewing "${windowTitle ?? ""}" on "${domain ?? "unknown"}". Is this activity relevant to any of their tasks? Be generous -- if it could plausibly help with a task, say yes.`;
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Determine if this activity is relevant to the user's tasks.",
      config: {
        systemInstruction,
        temperature: 0.2,
        maxOutputTokens: 200,
        responseMimeType: "application/json",
        responseSchema: {
          type: genai.Type.OBJECT,
          properties: {
            isRelevant: {
              type: genai.Type.BOOLEAN,
              description: "Whether the current activity is relevant to any task"
            },
            matchedTodoText: {
              type: genai.Type.STRING,
              description: "The text of the matched todo, or empty string if none"
            },
            reason: {
              type: genai.Type.STRING,
              description: "Brief explanation of why this is or is not relevant"
            }
          },
          required: ["isRelevant", "matchedTodoText", "reason"]
        }
      }
    });
    const parsed = JSON.parse(response.text || "{}");
    const result = {
      isRelevant: parsed.isRelevant ?? false,
      matchedTodoText: parsed.matchedTodoText || null,
      reason: parsed.reason ?? ""
    };
    setCached(cacheKey, result);
    return result;
  } catch (err) {
    console.error("[context-checker] Gemini context check failed:", err);
    return null;
  }
}
let getActiveWindow = null;
async function activeWindow() {
  if (!getActiveWindow) {
    const mod = await import("get-windows");
    getActiveWindow = mod.activeWindow;
  }
  return getActiveWindow();
}
let permissionWarningShown = false;
let permissionConfirmedShown = false;
function createTelemetryCollector(getCategoryRules, getVisionEnabled, onSnapshot, getGeminiApiKey, getActiveTodos) {
  let running = false;
  let pollInterval = null;
  let pollInFlight = false;
  const activityClassifier = createActivityClassifier();
  let cachedActivity = null;
  let cachedActivityKey = "";
  let lastContextResult = null;
  let lastContextResultKey = "";
  let lastContextCheckTime = 0;
  const CONTEXT_CHECK_THROTTLE_MS = 15e3;
  let sessionStartTime = Date.now();
  let productiveMs = 0;
  let distractingMs = 0;
  let lastPollTime = Date.now();
  let lastAppName = "";
  let tickCount = 0;
  const snoozeTimestamps = [];
  const timeSlices = [];
  const RECENT_DISTRACT_WINDOW_MIN = 2;
  const switchTimestamps = [];
  let consecutiveIdleSeconds = 0;
  const IDLE_RESET_THRESHOLD = 10 * 60;
  function resetSession() {
    sessionStartTime = Date.now();
    productiveMs = 0;
    distractingMs = 0;
    lastAppName = "";
    tickCount = 0;
    switchTimestamps.length = 0;
    timeSlices.length = 0;
    consecutiveIdleSeconds = 0;
  }
  function countSwitchesLast5Min() {
    const cutoff = Date.now() - 5 * 60 * 1e3;
    while (switchTimestamps.length > 0 && switchTimestamps[0] < cutoff) {
      switchTimestamps.shift();
    }
    return switchTimestamps.length;
  }
  function countSnoozesLast60Min() {
    const cutoff = Date.now() - 60 * 60 * 1e3;
    while (snoozeTimestamps.length > 0 && snoozeTimestamps[0] < cutoff) {
      snoozeTimestamps.shift();
    }
    return snoozeTimestamps.length;
  }
  function computeRecentDistractRatio() {
    const cutoff = Date.now() - RECENT_DISTRACT_WINDOW_MIN * 60 * 1e3;
    while (timeSlices.length > 0 && timeSlices[0].timestamp < cutoff) {
      timeSlices.shift();
    }
    let totalMs = 0;
    let distractMs = 0;
    for (const slice of timeSlices) {
      totalMs += slice.durationMs;
      if (slice.category === "entertainment" || slice.category === "social") {
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
    const idleSeconds = electron.powerMonitor.getSystemIdleTime();
    if (idleSeconds >= IDLE_RESET_THRESHOLD) {
      if (consecutiveIdleSeconds < IDLE_RESET_THRESHOLD) {
        console.log("[telemetry] Idle for 10+ min, resetting session");
        resetSession();
        lastPollTime = Date.now();
        return;
      }
    }
    consecutiveIdleSeconds = idleSeconds;
    let appName = "Unknown";
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
      } else if (!permissionWarningShown) {
        console.warn(
          "[telemetry] Could not read active window. Grant Screen Recording permission in System Settings > Privacy & Security."
        );
        permissionWarningShown = true;
      } else if (permissionWarningShown && tickCount % 30 === 0) {
        console.warn(`[telemetry] Still cannot read active window (tick ${tickCount}). Check Screen Recording permission.`);
      }
    } catch (err) {
      if (!permissionWarningShown) {
        console.warn(
          "[telemetry] activeWindow() failed. Grant Screen Recording permission in System Settings > Privacy & Security.",
          err
        );
        permissionWarningShown = true;
      } else if (permissionWarningShown && tickCount % 30 === 0) {
        console.warn(`[telemetry] Still cannot read active window (tick ${tickCount}). Check Screen Recording permission.`);
      }
    }
    if (appName !== lastAppName && lastAppName !== "") {
      switchTimestamps.push(now);
    }
    lastAppName = appName;
    const rules = getCategoryRules();
    const visionEnabled = getVisionEnabled();
    const baseCategory = classifyApp(appName, rules, windowTitle, windowUrl);
    const activeDomain = isBrowser(appName) ? extractDomain(windowUrl, windowTitle) : void 0;
    const activityKey = `${appName}|${activeDomain ?? ""}|${windowTitle ?? ""}`;
    if (activityKey !== cachedActivityKey) {
      cachedActivityKey = activityKey;
      cachedActivity = null;
    }
    let category = cachedActivity?.category ?? baseCategory;
    if (category === "entertainment" || category === "social") {
      const apiKey = getGeminiApiKey();
      const todos = getActiveTodos();
      const todosWithApps = todos.filter((t) => t.allowedApps && t.allowedApps.length > 0);
      if (apiKey && todosWithApps.length > 0) {
        const now2 = Date.now();
        if (now2 - lastContextCheckTime >= CONTEXT_CHECK_THROTTLE_MS) {
          lastContextCheckTime = now2;
          checkContextRelevance(apiKey, appName, windowTitle, activeDomain, todos).then((result) => {
            lastContextResult = result;
            lastContextResultKey = activityKey;
          }).catch(() => {
          });
        }
      }
      if (lastContextResult?.isRelevant && lastContextResultKey === activityKey) {
        category = "productive";
      }
    } else {
      lastContextResult = null;
      lastContextResultKey = "";
    }
    switch (category) {
      case "productive":
        productiveMs += elapsed;
        break;
      case "entertainment":
      case "social":
        distractingMs += elapsed;
        break;
    }
    timeSlices.push({ timestamp: now, durationMs: elapsed, category });
    if (tickCount % 5 === 0) {
      const sessionMinutes = parseFloat(((now - sessionStartTime) / 6e4).toFixed(2));
      const distractingMinutes = parseFloat((distractingMs / 6e4).toFixed(2));
      const productiveMinutes = parseFloat((productiveMs / 6e4).toFixed(2));
      const hours = (/* @__PURE__ */ new Date()).getHours();
      const minutes = (/* @__PURE__ */ new Date()).getMinutes();
      const timeOfDayLocal = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      const recentDistractRatio = computeRecentDistractRatio();
      const snoozesLast60Min = countSnoozesLast60Min();
      cachedActivity = await activityClassifier.classify(
        {
          appName,
          windowTitle,
          windowUrl,
          bounds: windowBounds
        },
        rules,
        visionEnabled
      );
      const contextOverride = lastContextResult?.isRelevant === true;
      const contextTodo = contextOverride ? lastContextResult?.matchedTodoText ?? void 0 : void 0;
      const snapshot = {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        focusIntent: null,
        signals: {
          sessionMinutes,
          distractingMinutes,
          productiveMinutes,
          appSwitchesLast5Min: countSwitchesLast5Min(),
          idleSecondsLast5Min: idleSeconds,
          timeOfDayLocal,
          snoozesLast60Min,
          recentDistractRatio
        },
        categories: {
          activeApp: appName,
          activeCategory: cachedActivity?.category ?? category,
          ...activeDomain ? { activeDomain } : {},
          ...cachedActivity?.activityLabel ? { activityLabel: cachedActivity.activityLabel } : {},
          ...cachedActivity?.activityKind ? { activityKind: cachedActivity.activityKind } : {},
          ...cachedActivity?.activityConfidence != null ? { activityConfidence: cachedActivity.activityConfidence } : {},
          ...cachedActivity?.activitySource ? { activitySource: cachedActivity.activitySource } : {},
          ...contextOverride ? { contextOverride: true } : {},
          ...contextTodo ? { contextTodo } : {}
        }
      };
      console.log(
        `[telemetry] Snapshot #${tickCount}: app="${appName}" category="${snapshot.categories.activeCategory}" domain="${activeDomain ?? "none"}" activity="${snapshot.categories.activityLabel ?? "none"}" source="${snapshot.categories.activitySource ?? "none"}" distracting=${distractingMinutes}min session=${sessionMinutes}min rulesCount=${rules.length}`
      );
      onSnapshot(snapshot);
    }
  }
  const onLockScreen = () => {
    console.log("[telemetry] Screen locked, resetting session");
    resetSession();
  };
  return {
    start() {
      if (running) return;
      running = true;
      resetSession();
      lastPollTime = Date.now();
      electron.powerMonitor.on("lock-screen", onLockScreen);
      pollInterval = setInterval(() => {
        if (pollInFlight) return;
        pollInFlight = true;
        poll().catch((err) => console.error("[telemetry] Poll error:", err)).finally(() => {
          pollInFlight = false;
        });
      }, 1e3);
      console.log("[telemetry] Started real window telemetry");
    },
    stop() {
      if (!running) return;
      running = false;
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      electron.powerMonitor.removeListener("lock-screen", onLockScreen);
      console.log("[telemetry] Stopped");
    },
    isActive() {
      return running;
    },
    addSnooze() {
      snoozeTimestamps.push(Date.now());
    }
  };
}
let apiDownSince = null;
const SUPPRESS_INTERVAL_MS = 6e4;
function getBaseUrl() {
  return getSettings().apiUrl;
}
async function scoreSnapshot(snapshot, snoozePressure = 0, persona) {
  try {
    const url = new URL(`${getBaseUrl()}/score`);
    url.searchParams.set("snoozePressure", String(snoozePressure));
    if (persona) url.searchParams.set("persona", persona);
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
      signal: AbortSignal.timeout(5e3)
    });
    if (!response.ok) {
      console.error(`[api-client] Score API returned ${response.status}`);
      return null;
    }
    if (apiDownSince !== null) {
      console.log("[api-client] Score API reconnected");
      apiDownSince = null;
    }
    return await response.json();
  } catch (err) {
    const now = Date.now();
    if (apiDownSince === null) {
      console.error("[api-client] Score API unreachable, using local fallback:", err);
      apiDownSince = now;
    } else if (now - apiDownSince >= SUPPRESS_INTERVAL_MS) {
      console.warn("[api-client] Score API still unreachable (60s+). Using local fallback.");
      apiDownSince = now;
    }
    return null;
  }
}
const SEVERITY_COLORS = {
  0: "#22c55e",
  // Focused — green
  1: "#eab308",
  // Drifting — yellow
  2: "#f97316",
  // Distracted — orange
  3: "#ef4444",
  // Procrastinating — red
  4: "#a855f7"
  // Crisis — purple
};
const SEVERITY_LABELS = {
  0: "Focused",
  1: "Drifting",
  2: "Distracted",
  3: "Procrastinating",
  4: "Crisis"
};
const INACTIVE_COLOR = "#6b7280";
let tray = null;
let mainWindow$2 = null;
let currentState = {
  score: 0,
  severity: 0,
  activeApp: "",
  activeCategory: "",
  telemetryActive: false
};
function createCircleIcon(hexColor) {
  const size = 16;
  const scale = 2;
  const px = size * scale;
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const buf = Buffer.alloc(px * px * 4);
  const center = px / 2;
  const radius = center - 1;
  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const dx = x - center + 0.5;
      const dy = y - center + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const offset = (y * px + x) * 4;
      if (dist <= radius) {
        const alpha = dist > radius - 1 ? Math.round((radius - dist) * 255) : 255;
        buf[offset] = r;
        buf[offset + 1] = g;
        buf[offset + 2] = b;
        buf[offset + 3] = alpha;
      } else {
        buf[offset + 3] = 0;
      }
    }
  }
  return electron.nativeImage.createFromBuffer(buf, {
    width: px,
    height: px,
    scaleFactor: scale
  });
}
function buildContextMenu() {
  const { score, severity, activeApp, activeCategory, telemetryActive } = currentState;
  const win = mainWindow$2;
  const isVisible = win && !win.isDestroyed() && win.isVisible();
  const statusLabel = telemetryActive ? `${SEVERITY_LABELS[severity]} — Focus: ${100 - score}` : "Monitoring paused";
  const items = [
    { label: statusLabel, enabled: false },
    { type: "separator" }
  ];
  if (telemetryActive && activeApp) {
    const domainSuffix = currentState.activeDomain ? ` [${currentState.activeDomain}]` : "";
    items.push(
      { label: `${activeApp}${domainSuffix} (${activeCategory})`, enabled: false },
      { type: "separator" }
    );
  }
  items.push(
    {
      label: isVisible ? "Hide noRot" : "Show noRot",
      click: () => {
        if (!win || win.isDestroyed()) return;
        if (win.isVisible()) {
          win.hide();
        } else {
          win.show();
          win.focus();
          win.webContents.invalidate();
        }
      }
    },
    { type: "separator" },
    {
      label: "Quit noRot",
      click: () => {
        electron.app.quit();
      }
    }
  );
  return electron.Menu.buildFromTemplate(items);
}
function createTray(window) {
  mainWindow$2 = window;
  const icon = createCircleIcon(INACTIVE_COLOR);
  tray = new electron.Tray(icon);
  tray.setToolTip("noRot");
  tray.setContextMenu(buildContextMenu());
}
function updateTrayState(data) {
  if (!tray) return;
  currentState = data;
  const color = data.telemetryActive ? SEVERITY_COLORS[data.severity] : INACTIVE_COLOR;
  tray.setImage(createCircleIcon(color));
  tray.setContextMenu(buildContextMenu());
  const tooltip = data.telemetryActive ? `noRot — ${SEVERITY_LABELS[data.severity]} (Focus: ${100 - data.score})` : "noRot — Paused";
  tray.setToolTip(tooltip);
}
function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
function getTarget(categories) {
  if (typeof categories.activityLabel === "string" && categories.activityLabel.trim()) {
    return categories.activityLabel.trim();
  }
  if (typeof categories.activeDomain === "string" && categories.activeDomain.trim()) {
    const d = categories.activeDomain.trim().replace(/^www\./, "");
    if (d.includes("instagram.com")) return "scrolling Instagram";
    if (d.includes("tiktok.com")) return "scrolling TikTok";
    if (d.includes("youtube.com") || d.includes("youtu.be")) return "watching YouTube";
    if (d.includes("reddit.com")) return "browsing Reddit";
    if (d === "x.com" || d.includes("twitter.com")) return "browsing X";
    return `browsing ${d}`;
  }
  if (typeof categories.activeApp === "string" && categories.activeApp.trim() && categories.activeApp !== "Unknown") {
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
      (t) => `I’m here. You’re ${t}. What’s the first “easy win” you can knock out?`
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
      (t) => `Quick reset: you’re ${t}. What’s one action you can do without thinking too much?`
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
      (t) => `You’ve been ${t}. Want to reset by writing the next step in one short sentence?`
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
      () => `You don’t have to fix everything. What’s one tiny action that helps Future You?`
    ]
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
      (t) => `You’re ${t}. Discipline check: what’s the next thing you can finish?`
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
      (t) => `You’re ${t}. Recommit: what’s the next measurable step?`
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
      (t) => `You’re ${t}. What’s the one decision you’ve been delaying? Decide it now.`
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
      () => `Crisis means simplify. One task. One step. Then reassess.`
    ]
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
      (t) => `Okay, you stubborn bastard. You're ${t}. What are we doing for real in the next 2 minutes?`
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
      (t) => `You're ${t}. Pick a micro-step you can do even if you feel like crap. Go.`
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
      (t) => `You're ${t}. Enough circling. Commit to 5 minutes and start with the easiest subtask.`
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
      () => `You need a foothold. One sentence. One checkbox. One command. Pick one and do it.`
    ]
  }
};
const lastVariantIndex = /* @__PURE__ */ new Map();
function pickVariant(variants, key) {
  if (variants.length === 1) return variants[0];
  const prev = lastVariantIndex.get(key);
  let idx = Math.floor(Math.random() * variants.length);
  if (prev != null && variants.length > 1 && idx === prev) {
    idx = (idx + 1) % variants.length;
  }
  lastVariantIndex.set(key, idx);
  return variants[idx];
}
function buildInterventionText(severity, persona, categories, overdueTodos) {
  if (categories.contextOverride === true && categories.contextTodo) {
    return `You're on track with "${categories.contextTodo}". Keep it up!`;
  }
  const target = getTarget(categories);
  const gerund = target ?? "off task";
  const what = target ? `Stop ${target}` : "Refocus";
  const variants = personaVariantMap[persona] ?? personaVariantMap.calm_friend;
  const level = severity >= 1 && severity <= 4 ? severity : 1;
  const key = `${persona}:${level}`;
  const template = pickVariant(variants[level], key);
  let text = template(gerund, what);
  if (overdueTodos?.length && severity >= 2) {
    const first = overdueTodos[0];
    if (persona === "tough_love") {
      text = `Your task "${first.text}" was due at ${first.deadline}. BRUH. Stop procrastinating and do the first damn step. What's step one?`;
    } else {
      text = `Your task "${first.text}" was due at ${first.deadline}. What's making it hard to get to it?`;
    }
  }
  if (persona === "tough_love") {
    const hasProfanity = /\b(fuck|bitch|bastard|idiot|dumbass|stupid ass)\b/i.test(text);
    const hasScream = /[A-Z]{3,}/.test(text);
    if (!hasProfanity || !hasScream) {
      text = `STOP. LISTEN THE FUCK UP. ${text}`;
    }
  }
  return text;
}
function buildStableRecommendationText(severity, persona) {
  const band = shared.SEVERITY_BANDS.find((b) => b.severity === severity);
  if (!band || band.mode === "none") return "";
  const messages = {
    calm_friend: {
      nudge: "Hey, I noticed you've been drifting a bit. Maybe a quick stretch?",
      remind: "You're getting pretty distracted. Want to reset together?",
      interrupt: "I care about you — and right now you're deep in procrastination. Take one breath, then come back to your task.",
      crisis: "I'm worried you're spiraling. Step away for a few minutes, drink water, then come back with one tiny next step."
    },
    coach: {
      nudge: "Quick check: what's the next 2-minute step?",
      remind: "You're drifting. Pick ONE small action and do it now.",
      interrupt: "Hard stop. What exactly are you working on in the next 5 minutes?",
      crisis: "Reset: stand up, breathe, then choose the smallest possible next move."
    },
    tough_love: {
      nudge: "BRUH. YOU'RE DRIFTING. WHAT THE FUCK IS THE NEXT 2-MINUTE STEP?",
      remind: "YO. YOU'RE DISTRACTED. CLOSE IT AND PICK ONE 5-MINUTE STEP. GO.",
      interrupt: "STOP. LISTEN THE FUCK UP. YOU'RE PROCRASTINATING. WHAT ARE YOU DOING IN THE NEXT 2 MINUTES?",
      crisis: "CRISIS MODE. PUT THE PHONE DOWN, BREATHE, GET WATER — THEN DO ONE TINY TASK. RIGHT NOW."
    }
  };
  return messages[persona][band.mode] || "Time to refocus.";
}
let mainWindow$1 = null;
let todoWindow = null;
let todoDragging = false;
let todoDraggingTimer = null;
function isTodoDragging() {
  return todoDragging;
}
function getMainWindow() {
  return mainWindow$1;
}
function setMainWindow(win) {
  mainWindow$1 = win;
}
function getTodoWindow() {
  return todoWindow;
}
function setTodoWindow(win) {
  todoWindow = win;
}
function createTodoOverlayWindow() {
  if (todoWindow && !todoWindow.isDestroyed()) {
    return;
  }
  todoWindow = new electron.BrowserWindow({
    width: 320,
    height: 480,
    minWidth: 280,
    minHeight: 400,
    show: false,
    alwaysOnTop: true,
    // Must be focusable so clicks/drag inside the overlay don't force-focus the main window.
    focusable: true,
    frame: false,
    transparent: true,
    backgroundColor: "#00ffffff",
    hasShadow: false,
    skipTaskbar: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    }
  });
  todoWindow.on("will-move", () => {
    todoDragging = true;
    if (todoDraggingTimer) {
      clearTimeout(todoDraggingTimer);
      todoDraggingTimer = null;
    }
  });
  todoWindow.on("moved", () => {
    if (todoDraggingTimer) clearTimeout(todoDraggingTimer);
    todoDraggingTimer = setTimeout(() => {
      todoDragging = false;
      todoDraggingTimer = null;
    }, 300);
  });
  todoWindow.setAlwaysOnTop(true, "floating");
  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    todoWindow.loadURL(`${rendererUrl}#/todo-overlay`);
  } else {
    todoWindow.loadFile(path.join(__dirname, "../renderer/index.html"), { hash: "/todo-overlay" });
  }
  todoWindow.on("closed", () => {
    todoDragging = false;
    if (todoDraggingTimer) {
      clearTimeout(todoDraggingTimer);
      todoDraggingTimer = null;
    }
    todoWindow = null;
  });
}
function generateId() {
  return crypto.randomUUID();
}
function resolveTimeZoneSetting$1(timeZoneSetting) {
  const system = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!timeZoneSetting || timeZoneSetting === "system") return system || "UTC";
  return timeZoneSetting;
}
function parseHHMMToMinutes$1(val) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(val.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}
function getNowMinutesInTimeZone$1(timeZoneSetting) {
  const timeZone = resolveTimeZoneSetting$1(timeZoneSetting);
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(/* @__PURE__ */ new Date());
    const h = Number(parts.find((p) => p.type === "hour")?.value);
    const m = Number(parts.find((p) => p.type === "minute")?.value);
    if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
  } catch {
  }
  const d = /* @__PURE__ */ new Date();
  return d.getHours() * 60 + d.getMinutes();
}
const state = {
  telemetryCollector: null,
  lastInterventionTime: 0,
  snoozePressure: 0,
  snoozeTimestamps: [],
  currentSettings: null,
  // Lazily loaded after DB init
  activeInterventionId: null,
  activeInterventionCategories: null,
  complianceSnapshots: 0
};
let settingsLoaded = false;
let powerSaveBlockerId = null;
function ensureSettings() {
  if (!settingsLoaded) {
    state.currentSettings = getSettings();
    settingsLoaded = true;
  }
  return state.currentSettings;
}
function sendToRenderer(channel, data) {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}
function decaySnoozePressure() {
  const now = Date.now();
  const cutoff = now - shared.SNOOZE_PRESSURE_DURATION_MIN * 60 * 1e3;
  state.snoozeTimestamps = state.snoozeTimestamps.filter((t) => t > cutoff);
  if (state.snoozeTimestamps.length > shared.MAX_SNOOZE_PRESSURE) {
    state.snoozeTimestamps = state.snoozeTimestamps.slice(-shared.MAX_SNOOZE_PRESSURE);
  }
  return state.snoozeTimestamps.length * shared.SNOOZE_PRESSURE_POINTS;
}
async function processSnapshot(snapshot) {
  try {
    const settings = ensureSettings();
    const isExplicitToughLove = settings.persona === "tough_love" && settings.toughLoveExplicitAllowed === true;
    insertSnapshot(snapshot.timestamp, JSON.stringify(snapshot));
    const snoozePressure = decaySnoozePressure();
    const apiScoreResult = await scoreSnapshot(
      snapshot,
      snoozePressure,
      settings.persona
    );
    const scoreSource = apiScoreResult ? "api" : "local";
    let scoreResult = apiScoreResult;
    if (!scoreResult) {
      const { score, severity: baseSeverity } = shared.calculateScore(snapshot, snoozePressure);
      const severity = shared.applySnoozeEscalation(baseSeverity, snapshot.signals.snoozesLast60Min);
      const persona = settings.persona;
      const band = shared.SEVERITY_BANDS.find((b) => b.severity === severity);
      scoreResult = {
        procrastinationScore: score,
        severity,
        reasons: shared.generateReasons(snapshot, score),
        recommendation: {
          mode: band?.mode || "none",
          persona,
          text: "",
          tts: { model: "eleven_v3", stability: 35, speed: 1.08 },
          cooldownSeconds: settings.cooldownSeconds
        }
      };
    }
    scoreResult.recommendation.text = buildStableRecommendationText(
      scoreResult.severity,
      scoreResult.recommendation.persona
    );
    insertScore(scoreResult);
    sendToRenderer(IPC_CHANNELS.ON_SCORE_UPDATE, scoreResult);
    updateTrayState({
      score: scoreResult.procrastinationScore,
      severity: scoreResult.severity,
      activeApp: snapshot.categories.activeApp,
      activeCategory: snapshot.categories.activeCategory,
      activeDomain: snapshot.categories.activeDomain,
      telemetryActive: true
    });
    if (state.activeInterventionId && state.activeInterventionCategories) {
      const wasApp = state.activeInterventionCategories.activeApp;
      const nowApp = snapshot.categories.activeApp;
      const nowCategory = snapshot.categories.activeCategory;
      const switchedAway = nowApp !== wasApp && (nowCategory === "productive" || nowCategory === "neutral");
      if (switchedAway) {
        state.complianceSnapshots++;
      } else {
        state.complianceSnapshots = 0;
      }
      if (state.complianceSnapshots >= 2) {
        const interventionId = state.activeInterventionId;
        sendToRenderer(IPC_CHANNELS.ON_INTERVENTION_DISMISS, { interventionId });
        updateInterventionResponse(interventionId, "dismissed");
        console.log(`[orchestrator] Auto-dismissed intervention ${interventionId} after compliance`);
        state.activeInterventionId = null;
        state.activeInterventionCategories = null;
        state.complianceSnapshots = 0;
      }
    }
    const now = Date.now();
    const cooldownMs = settings.cooldownSeconds * 1e3;
    const cooldownExpired = now - state.lastInterventionTime > cooldownMs;
    const meetsThreshold = scoreResult.procrastinationScore >= settings.scoreThreshold;
    const hasRecommendation = scoreResult.recommendation.mode !== "none";
    console.log(
      `[orchestrator] Decision: source=${scoreSource} score=${scoreResult.procrastinationScore} meetsThreshold=${meetsThreshold} cooldownExpired=${cooldownExpired} hasRecommendation=${hasRecommendation} | app="${snapshot.categories.activeApp}" category="${snapshot.categories.activeCategory}" domain="${snapshot.categories.activeDomain ?? "none"}" recentRatio=${(snapshot.signals.recentDistractRatio ?? 0).toFixed(2)} distracting=${snapshot.signals.distractingMinutes}min session=${snapshot.signals.sessionMinutes}min`
    );
    if (meetsThreshold && cooldownExpired && hasRecommendation) {
      let interventionText = null;
      const activeTodos = getTodos().filter((t) => !t.done);
      const nowMinutes = getNowMinutesInTimeZone$1(settings.timeZone);
      const overdueTodos = activeTodos.filter((t) => t.deadline).filter((t) => {
        const dlMinutes = parseHHMMToMinutes$1(t.deadline);
        if (dlMinutes == null) return false;
        return dlMinutes < nowMinutes;
      }).map((t) => ({ text: t.text, deadline: t.deadline }));
      if (settings.scriptSource === "gemini" && settings.geminiApiKey) {
        if (snapshot.categories.contextOverride || snapshot.categories.contextTodo || overdueTodos.length > 0) {
          interventionText = await generateContextAwareScript(
            settings.geminiApiKey,
            scoreResult.severity,
            scoreResult.recommendation.persona,
            {
              appName: snapshot.categories.activeApp,
              windowTitle: void 0,
              domain: snapshot.categories.activeDomain,
              activeTodos,
              matchedTodo: snapshot.categories.contextTodo,
              overdueTodos: overdueTodos.length > 0 ? overdueTodos : void 0
            },
            settings.toughLoveExplicitAllowed
          );
        } else {
          interventionText = await generateScript(
            settings.geminiApiKey,
            scoreResult.severity,
            scoreResult.recommendation.persona,
            settings.toughLoveExplicitAllowed
          );
        }
      }
      if (!interventionText) {
        interventionText = buildInterventionText(
          scoreResult.severity,
          scoreResult.recommendation.persona,
          snapshot.categories,
          overdueTodos.length > 0 ? overdueTodos : void 0
        );
      }
      if (isExplicitToughLove && interventionText) {
        const hasProfanity = /\b(fuck|bitch|bastard|idiot|dumbass|stupid ass)\b/i.test(interventionText);
        const hasScream = /[A-Z]{3,}/.test(interventionText);
        if (!hasProfanity || !hasScream) {
          interventionText = `STOP. LISTEN THE FUCK UP. ${interventionText}`;
        }
      }
      const audioTts = isExplicitToughLove ? {
        ...scoreResult.recommendation.tts,
        stability: scoreResult.severity >= 3 ? 15 : 20,
        speed: scoreResult.severity >= 3 ? 1.2 : 1.15
      } : scoreResult.recommendation.tts;
      const intervention = {
        id: generateId(),
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        score: scoreResult.procrastinationScore,
        severity: scoreResult.severity,
        persona: scoreResult.recommendation.persona,
        text: interventionText ?? "",
        userResponse: "pending",
        audioPlayed: false
      };
      insertIntervention(intervention);
      state.activeInterventionId = intervention.id;
      state.activeInterventionCategories = {
        activeApp: snapshot.categories.activeApp,
        activeDomain: snapshot.categories.activeDomain
      };
      state.complianceSnapshots = 0;
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        if (!win.isVisible()) win.show();
        win.focus();
      }
      sendToRenderer(IPC_CHANNELS.ON_INTERVENTION, intervention);
      console.log(
        `[orchestrator] INTERVENTION FIRED: id=${intervention.id} score=${intervention.score} severity=${intervention.severity}`
      );
      if (interventionText) {
        sendToRenderer(IPC_CHANNELS.ON_PLAY_AUDIO, {
          ...scoreResult,
          recommendation: {
            ...scoreResult.recommendation,
            text: interventionText,
            tts: audioTts
          },
          interventionId: intervention.id
        });
      }
      state.lastInterventionTime = now;
    }
  } catch (err) {
    console.error("[orchestrator] Error processing snapshot:", err);
  }
}
function startTelemetry() {
  stopTelemetry();
  state.currentSettings = getSettings();
  settingsLoaded = true;
  console.log(
    `[orchestrator] Settings loaded: threshold=${state.currentSettings.scoreThreshold} cooldown=${state.currentSettings.cooldownSeconds}s persona="${state.currentSettings.persona}" rulesCount=${state.currentSettings.categoryRules.length} geminiKey=${!!state.currentSettings.geminiApiKey}`
  );
  state.snoozePressure = 0;
  state.snoozeTimestamps = [];
  state.lastInterventionTime = 0;
  state.activeInterventionId = null;
  state.activeInterventionCategories = null;
  state.complianceSnapshots = 0;
  state.telemetryCollector = createTelemetryCollector(
    () => ensureSettings().categoryRules,
    () => ensureSettings().visionEnabled,
    processSnapshot,
    () => ensureSettings().geminiApiKey,
    () => getTodos().filter((t) => !t.done)
  );
  state.telemetryCollector.start();
  if (powerSaveBlockerId === null || !electron.powerSaveBlocker.isStarted(powerSaveBlockerId)) {
    powerSaveBlockerId = electron.powerSaveBlocker.start("prevent-app-suspension");
    console.log("[orchestrator] powerSaveBlocker started", { powerSaveBlockerId });
  }
  console.log("[orchestrator] Started telemetry");
}
function stopTelemetry() {
  if (state.telemetryCollector) {
    state.telemetryCollector.stop();
    state.telemetryCollector = null;
  }
  updateTrayState({
    score: 0,
    severity: 0,
    activeApp: "",
    activeCategory: "",
    activeDomain: void 0,
    telemetryActive: false
  });
  if (powerSaveBlockerId !== null && electron.powerSaveBlocker.isStarted(powerSaveBlockerId)) {
    electron.powerSaveBlocker.stop(powerSaveBlockerId);
    console.log("[orchestrator] powerSaveBlocker stopped", { powerSaveBlockerId });
  }
  powerSaveBlockerId = null;
  console.log("[orchestrator] Telemetry stopped");
}
function handleInterventionResponse(eventId, response) {
  updateInterventionResponse(eventId, response);
  if (state.activeInterventionId === eventId) {
    state.activeInterventionId = null;
    state.activeInterventionCategories = null;
    state.complianceSnapshots = 0;
  }
  if (response === "snoozed") {
    state.snoozeTimestamps.push(Date.now());
    if (state.telemetryCollector) {
      state.telemetryCollector.addSnooze();
    }
  } else if (response === "working") {
    const settings = ensureSettings();
    state.snoozeTimestamps = [];
    state.lastInterventionTime = Date.now() + settings.cooldownSeconds * 1e3;
  }
}
function refreshSettings() {
  state.currentSettings = getSettings();
  settingsLoaded = true;
  clearContextCache();
  console.log(
    `[orchestrator] Settings refreshed: threshold=${state.currentSettings.scoreThreshold} cooldown=${state.currentSettings.cooldownSeconds}s`
  );
}
function isTelemetryActive() {
  return state.telemetryCollector?.isActive() ?? false;
}
const BASE_URL = "https://api.elevenlabs.io/v1";
async function fetchWithNetworkError(url, init, errorPrefix) {
  try {
    return await fetch(url, init);
  } catch (err) {
    if (err instanceof TypeError || err instanceof Error && err.name === "TimeoutError") {
      console.error(`[elevenlabs-agent] Network/timeout error ${errorPrefix}:`, err);
      throw new Error(`${errorPrefix}:network`);
    }
    throw err;
  }
}
const AGENT_CONFIG_VERSION = 5;
const COACH_TURN_CONFIG = {
  turn_timeout: 30,
  silence_end_call_timeout: 120
};
const CHECKIN_TURN_CONFIG = {
  turn_timeout: 15,
  silence_end_call_timeout: 60
};
const COACH_LLM_MODEL_ID = "gpt-4o-mini";
const SKIP_TURN_TOOL = {
  type: "system",
  name: "skip_turn",
  description: "Wait silently when the user needs a moment."
};
const UPDATE_TODO_TOOL = {
  type: "client",
  name: "update_todo",
  description: "Update an existing task. Use this when the user wants to change a task's text, deadline, or associated app.",
  parameters: {
    type: "object",
    required: ["todo_text"],
    properties: {
      todo_text: { type: "string", description: "The current text of the task to update (or a close match)." },
      new_text: { type: "string", description: "New text for the task. Omit to keep unchanged." },
      deadline: { type: "string", description: "New deadline in HH:MM format. Omit to keep unchanged." },
      app: { type: "string", description: "App name to associate. Omit to keep unchanged." }
    }
  },
  expects_response: true
};
const DELETE_TODO_TOOL = {
  type: "client",
  name: "delete_todo",
  description: "Delete a task from the user's list. Use when the user says to remove or delete a task.",
  parameters: {
    type: "object",
    required: ["todo_text"],
    properties: {
      todo_text: { type: "string", description: "The text of the task to delete (or a close match)." }
    }
  },
  expects_response: true
};
const TOGGLE_TODO_TOOL = {
  type: "client",
  name: "toggle_todo",
  description: "Mark a task as done or not done. Use when the user says they finished a task, or wants to un-complete it.",
  parameters: {
    type: "object",
    required: ["todo_text"],
    properties: {
      todo_text: { type: "string", description: "The text of the task to toggle (or a close match)." }
    }
  },
  expects_response: true
};
const LIST_TODOS_TOOL = {
  type: "client",
  name: "list_todos",
  description: `List the user's current tasks. Use this when you need to know what tasks exist (e.g., user says "delete both" or "delete the ones in my list").`,
  parameters: {
    type: "object",
    properties: {
      include_done: { type: "boolean", description: "If true, include completed tasks. Default: false." },
      limit: { type: "number", description: "Max tasks to return (1-50). Default: 50." }
    }
  },
  expects_response: true
};
const ALL_TOOLS = [SKIP_TURN_TOOL, LIST_TODOS_TOOL, UPDATE_TODO_TOOL, DELETE_TODO_TOOL, TOGGLE_TODO_TOOL];
const PERSONA_STYLES = {
  calm_friend: "warm, supportive, and empathetic",
  coach: "firm, encouraging, and motivating",
  tough_love: "direct, no-nonsense, and blunt"
};
function buildCoachPrompt(persona, explicitToughLove) {
  const style = PERSONA_STYLES[persona];
  if (explicitToughLove) {
    return {
      prompt: [
        `You are noRot, an aggressive, funny productivity coach with a ${style} style.`,
        "You MAY use profanity (18+). No slurs, hate, or threats.",
        "Do not insult the user's identity - roast the procrastination loop.",
        "Many users have ADHD or executive-function challenges, so avoid shame or guilt while staying blunt.",
        'noRot is a computer productivity tool. You can only help with tasks the user does on their computer (apps and websites). If they bring up offline / real-world activities (like going to the beach, the gym, or doing chores), acknowledge it briefly and pivot to a computer-based next step (look something up, send a message, set a calendar reminder), or ask what computer task they want to focus on. Keep this boundary subtle: prefer "I can help with the computer side of that" over a hard refusal.',
        "Help the user plan what to do next by asking for: (1) the tasks, (2) rough duration, and (3) timing (start time or deadline).",
        "If a task is missing a time, ask a follow-up question before summarizing the final list.",
        'You can update, delete, or mark tasks as done using your tools. When the user asks to change, remove, or complete a task, use the appropriate tool. You can also proactively suggest changes (e.g., "It sounds like you finished X — want me to mark it done?").',
        'If you need to know what tasks exist (e.g. user says "delete both"), use the list_todos tool, then act on the returned list.',
        "When the user is silent or thinking, do not prompt them. Use the skip_turn tool to wait silently.",
        "Keep responses to 1-3 sentences and ask one question at a time."
      ].join(" "),
      firstMessage: "Alright. What are we doing on your computer today? Give me your top 3 tasks. No fluff."
    };
  }
  return {
    prompt: [
      `You are noRot, a productivity coach with a ${style} style.`,
      "Many users have ADHD or executive-function challenges, so never shame or blame.",
      "noRot is a computer productivity tool. You can only help with tasks the user does on their computer (apps and websites). If they bring up offline / real-world activities (like going to the beach, the gym, or doing chores), acknowledge it briefly and pivot to a computer-based next step (look something up, send a message, set a calendar reminder), or ask what computer task they want to focus on. Keep this boundary subtle and not preachy.",
      "Help the user plan what to do next by asking for: (1) the tasks, (2) rough duration, and (3) timing (start time or deadline).",
      "If a task is missing a time, ask a follow-up question before summarizing the final list.",
      'You can update, delete, or mark tasks as done using your tools. When the user asks to change, remove, or complete a task, use the appropriate tool. You can also proactively suggest changes (e.g., "It sounds like you finished X — want me to mark it done?").',
      'If you need to know what tasks exist (e.g. user says "delete both"), use the list_todos tool, then act on the returned list.',
      "When the user is silent or thinking, do not prompt them. Use the skip_turn tool to wait silently.",
      "Keep responses to 1-3 sentences and ask one question at a time."
    ].join(" "),
    firstMessage: "Ready to plan? What do you need to get done on your computer, and when does it need to be done by?"
  };
}
async function patchCoachAgentConfig(apiKey, agentId, persona, explicitToughLove) {
  const voiceId = shared.PERSONAS[persona].voiceId;
  const { prompt, firstMessage } = buildCoachPrompt(persona, explicitToughLove);
  const res = await fetch(`${BASE_URL}/convai/agents/${encodeURIComponent(agentId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey
    },
    body: JSON.stringify({
      conversation_config: {
        agent: {
          first_message: firstMessage,
          language: "en",
          prompt: {
            prompt,
            llm: { model_id: COACH_LLM_MODEL_ID },
            tools: ALL_TOOLS
          }
        },
        tts: {
          voice_id: voiceId,
          model_id: "eleven_turbo_v2"
        },
        turn: {
          ...COACH_TURN_CONFIG
        }
      }
    }),
    signal: AbortSignal.timeout(1e4)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[elevenlabs-agent] Failed to PATCH agent config: ${res.status} — ${text}`);
    throw new Error(`patch_agent:${res.status}`);
  }
  console.log("[elevenlabs-agent] PATCHed agent config for:", agentId);
}
async function ensureAgent(apiKey, persona) {
  const settings = getSettings();
  const explicitToughLove = persona === "tough_love" && settings.toughLoveExplicitAllowed === true;
  if (settings.elevenLabsAgentId && settings.elevenLabsAgentPersona === persona) {
    console.log("[elevenlabs-agent] Reusing existing agent:", settings.elevenLabsAgentId);
    let needsRecreate = false;
    if ((settings.elevenLabsAgentVersion ?? 0) < AGENT_CONFIG_VERSION) {
      try {
        await patchCoachAgentConfig(apiKey, settings.elevenLabsAgentId, persona, explicitToughLove);
        updateSetting("elevenLabsAgentVersion", AGENT_CONFIG_VERSION);
      } catch (patchErr) {
        console.warn("[elevenlabs-agent] Could not patch agent config, will recreate:", patchErr);
        needsRecreate = true;
      }
    }
    if (!needsRecreate) {
      try {
        const signedUrl2 = await getSignedUrl(apiKey, settings.elevenLabsAgentId);
        return { agentId: settings.elevenLabsAgentId, signedUrl: signedUrl2 };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "";
        if (errMsg.includes("404") || errMsg.includes("401") || errMsg.includes("403")) {
          console.log("[elevenlabs-agent] Cached agent unusable, will recreate:", errMsg);
          needsRecreate = true;
        } else {
          console.error("[elevenlabs-agent] Error reusing agent:", err);
          throw err;
        }
      }
    }
    if (needsRecreate) {
      updateSetting("elevenLabsAgentId", "");
      updateSetting("elevenLabsAgentPersona", "");
      updateSetting("elevenLabsAgentVersion", 0);
    }
  }
  console.log("[elevenlabs-agent] Creating new agent for persona:", persona);
  const agentId = await createAgent(apiKey, persona, explicitToughLove);
  const signedUrl = await getSignedUrl(apiKey, agentId);
  updateSetting("elevenLabsAgentId", agentId);
  updateSetting("elevenLabsAgentPersona", persona);
  updateSetting("elevenLabsAgentVersion", AGENT_CONFIG_VERSION);
  console.log("[elevenlabs-agent] Agent created and saved:", agentId);
  return { agentId, signedUrl };
}
let lastCheckinAgentId = null;
async function deleteAgent(apiKey, agentId) {
  try {
    const res = await fetch(`${BASE_URL}/convai/agents/${encodeURIComponent(agentId)}`, {
      method: "DELETE",
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(5e3)
    });
    if (res.ok || res.status === 404) {
      console.log("[elevenlabs-agent] Deleted old check-in agent:", agentId);
    } else {
      console.warn(`[elevenlabs-agent] Failed to delete agent ${agentId}: ${res.status}`);
    }
  } catch (err) {
    console.warn("[elevenlabs-agent] Error deleting agent:", err);
  }
}
async function ensureCheckinAgent(apiKey, persona, context) {
  console.log("[elevenlabs-agent] Creating check-in agent for severity:", context.severity);
  const settings = getSettings();
  const explicitToughLove = persona === "tough_love" && settings.toughLoveExplicitAllowed === true;
  if (lastCheckinAgentId) {
    const oldId = lastCheckinAgentId;
    lastCheckinAgentId = null;
    deleteAgent(apiKey, oldId);
  }
  let agentId;
  try {
    agentId = await createCheckinAgent(apiKey, persona, context, explicitToughLove);
  } catch (err) {
    throw err;
  }
  try {
    const signedUrl = await getSignedUrl(apiKey, agentId);
    lastCheckinAgentId = agentId;
    console.log("[elevenlabs-agent] Check-in agent created:", agentId);
    return { agentId, signedUrl };
  } catch (err) {
    deleteAgent(apiKey, agentId);
    throw err;
  }
}
async function createCheckinAgent(apiKey, persona, context, explicitToughLove) {
  const voiceId = shared.PERSONAS[persona].voiceId;
  const style = PERSONA_STYLES[persona];
  const safeApp = JSON.stringify(context.activeApp);
  const safeDomain = context.activeDomain ? JSON.stringify(context.activeDomain) : "unknown";
  const todoList = context.activeTodos.length > 0 ? context.activeTodos.map((t) => JSON.stringify(t.text)).join(", ") : "none set";
  const overdueList = context.overdueTodos.length > 0 ? context.overdueTodos.map((t) => JSON.stringify(t.text)).join(", ") : "none";
  const systemPrompt = [
    `You are noRot, a productivity companion with a ${style} style.`,
    `The user's procrastination score is ${context.score}/100 (severity ${context.severity}).`,
    `They are currently using ${safeApp}${context.activeDomain ? ` on ${safeDomain}` : ""}.`,
    `Their active todos are: ${todoList}.`,
    context.overdueTodos.length > 0 ? `Overdue tasks: ${overdueList}.` : "",
    "",
    "Your job is to have a brief check-in conversation and get them moving.",
    'noRot is a computer productivity tool. You can only help with tasks the user does on their computer (apps and websites). If they bring up offline / real-world activities, acknowledge it briefly and pivot to a computer-based next step. Keep this boundary subtle ("computer side of that") instead of lecturing.',
    explicitToughLove ? "Tone: angry, loud, funny, and blunt. You MAY use profanity (18+)." : "Tone: supportive, ADHD-aware, and non-judgmental.",
    explicitToughLove ? "No slurs, hate, or threats. Do not insult the user's identity - roast the behavior/loop." : "Do not shame or guilt-trip. Adding guilt makes it worse.",
    "Ask what they intended to work on, then help them pick ONE small next step they can start right now.",
    "You can update, delete, or mark tasks as done using your tools. When the user says they finished something, offer to mark it done.",
    'If you need to know what tasks exist (e.g. user says "delete both"), use the list_todos tool, then act on the returned list.',
    "Keep responses to 2-3 sentences.",
    explicitToughLove ? "Direct commands are allowed, but keep it constructive." : "Be warm but direct.",
    'If they seem stuck, suggest the smallest possible action (e.g. "just open the file").',
    "If the user is silent or thinking, use the skip_turn tool to wait silently."
  ].filter(Boolean).join(" ");
  const firstMessage = context.severity >= 4 ? explicitToughLove ? "Alright. Crisis mode. Stop spiraling and tell me the ONE thing you were supposed to do." : "Hey - I can see things have gotten pretty off track. No judgment. Want to talk through what's going on?" : explicitToughLove ? "Hey. You're drifting. What the hell were you actually planning to work on?" : "Hey, noticed you might be drifting a bit. What were you planning to work on?";
  const body = {
    conversation_config: {
      agent: {
        first_message: firstMessage,
        language: "en",
        prompt: {
          prompt: systemPrompt,
          llm: { model_id: COACH_LLM_MODEL_ID },
          tools: ALL_TOOLS
        }
      },
      tts: {
        voice_id: voiceId,
        model_id: "eleven_turbo_v2"
      },
      turn: {
        ...CHECKIN_TURN_CONFIG
      }
    },
    name: "noRot Check-in"
  };
  const res = await fetchWithNetworkError(
    `${BASE_URL}/convai/agents/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(1e4)
    },
    "create_agent"
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[elevenlabs-agent] Failed to create check-in agent: ${res.status} ${res.statusText} — ${text}`);
    throw new Error(`create_agent:${res.status}`);
  }
  const data = await res.json();
  if (!data.agent_id) {
    throw new Error("[elevenlabs-agent] API response missing agent_id");
  }
  return data.agent_id;
}
async function createAgent(apiKey, persona, explicitToughLove) {
  const voiceId = shared.PERSONAS[persona].voiceId;
  const { prompt, firstMessage } = buildCoachPrompt(persona, explicitToughLove);
  const body = {
    conversation_config: {
      agent: {
        first_message: firstMessage,
        language: "en",
        prompt: {
          prompt,
          llm: { model_id: COACH_LLM_MODEL_ID },
          tools: ALL_TOOLS
        }
      },
      tts: {
        voice_id: voiceId,
        model_id: "eleven_turbo_v2"
      },
      turn: {
        ...COACH_TURN_CONFIG
      }
    },
    name: "noRot Coach"
  };
  const res = await fetchWithNetworkError(
    `${BASE_URL}/convai/agents/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(1e4)
    },
    "create_agent"
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[elevenlabs-agent] Failed to create agent: ${res.status} ${res.statusText} — ${text}`);
    throw new Error(`create_agent:${res.status}`);
  }
  const data = await res.json();
  if (!data.agent_id) {
    throw new Error("[elevenlabs-agent] API response missing agent_id");
  }
  return data.agent_id;
}
async function getSignedUrl(apiKey, agentId) {
  const url = `${BASE_URL}/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`;
  const res = await fetchWithNetworkError(
    url,
    {
      headers: {
        "xi-api-key": apiKey
      },
      signal: AbortSignal.timeout(1e4)
    },
    "get_signed_url"
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[elevenlabs-agent] Failed to get signed URL: ${res.status} ${res.statusText} — ${text}`);
    throw new Error(`get_signed_url:${res.status}`);
  }
  const data = await res.json();
  if (!data.signed_url) {
    throw new Error("[elevenlabs-agent] API response missing signed_url");
  }
  return data.signed_url;
}
let lastScreenProbeAt = 0;
let lastScreenProbeOk = false;
const MAX_CHAT_SESSIONS = 10;
const MAX_MESSAGES_PER_SESSION = 100;
const chatSessions = /* @__PURE__ */ new Map();
const chatAbortControllers = /* @__PURE__ */ new Map();
async function canReadActiveWindow() {
  try {
    const mod = await import("get-windows");
    const win = await mod.activeWindow();
    return Boolean(win?.owner?.name);
  } catch {
    return false;
  }
}
function resolveTimeZoneSetting(timeZoneSetting) {
  const system = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!timeZoneSetting || timeZoneSetting === "system") return system || "UTC";
  return timeZoneSetting;
}
function parseHHMMToMinutes(val) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(val.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}
function getNowMinutesInTimeZone(timeZoneSetting) {
  const timeZone = resolveTimeZoneSetting(timeZoneSetting);
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(/* @__PURE__ */ new Date());
    const h = Number(parts.find((p) => p.type === "hour")?.value);
    const m = Number(parts.find((p) => p.type === "minute")?.value);
    if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
  } catch {
  }
  const d = /* @__PURE__ */ new Date();
  return d.getHours() * 60 + d.getMinutes();
}
function registerIpcHandlers() {
  electron.ipcMain.handle(IPC_CHANNELS.RELAUNCH_APP, (_event, rendererUrl) => {
    const nextArgs = process.argv.slice(1);
    if (typeof rendererUrl === "string" && rendererUrl.startsWith("http")) {
      const hasRendererUrlArg = nextArgs.some((a) => a.startsWith("--renderer-url="));
      if (!hasRendererUrlArg) nextArgs.push(`--renderer-url=${rendererUrl}`);
    }
    electron.app.relaunch({ args: nextArgs });
    electron.app.exit(0);
  });
  electron.ipcMain.handle(IPC_CHANNELS.START_TELEMETRY, () => {
    startTelemetry();
  });
  electron.ipcMain.handle(IPC_CHANNELS.STOP_TELEMETRY, () => {
    stopTelemetry();
  });
  electron.ipcMain.handle(IPC_CHANNELS.IS_TELEMETRY_ACTIVE, () => {
    return isTelemetryActive();
  });
  electron.ipcMain.handle(IPC_CHANNELS.GET_LATEST_SCORE, () => {
    return getLatestScore();
  });
  electron.ipcMain.handle(
    IPC_CHANNELS.RESPOND_TO_INTERVENTION,
    (_event, eventId, response) => {
      handleInterventionResponse(eventId, response);
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.REPORT_AUDIO_PLAYED,
    (_event, interventionId) => {
      updateAudioPlayed(interventionId);
    }
  );
  electron.ipcMain.handle(IPC_CHANNELS.GET_USAGE_HISTORY, () => {
    return getUsageHistory(60);
  });
  electron.ipcMain.handle(IPC_CHANNELS.GET_APP_STATS, (_event, minutes) => {
    return getAppStats(minutes);
  });
  electron.ipcMain.handle(IPC_CHANNELS.GET_WINS, () => {
    return getWinsData();
  });
  electron.ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return getSettings();
  });
  electron.ipcMain.handle(
    IPC_CHANNELS.UPDATE_SETTINGS,
    (_event, settings) => {
      const currentSettings = getSettings();
      const nextToughLoveAllowed = typeof settings.toughLoveExplicitAllowed === "boolean" ? settings.toughLoveExplicitAllowed : currentSettings.toughLoveExplicitAllowed;
      const nextPersona = typeof settings.persona === "string" ? settings.persona : currentSettings.persona;
      if (nextPersona === "tough_love" && !nextToughLoveAllowed) {
        settings.persona = "coach";
      }
      if ("elevenLabsApiKey" in settings) {
        if (settings.elevenLabsApiKey !== currentSettings.elevenLabsApiKey) {
          updateSetting("elevenLabsAgentId", "");
          updateSetting("elevenLabsAgentPersona", "");
        }
      }
      for (const [key, value] of Object.entries(settings)) {
        updateSetting(key, value);
      }
      refreshSettings();
    }
  );
  electron.ipcMain.handle(IPC_CHANNELS.TEST_INTERVENTION, async () => {
    const settings = getSettings();
    const testCategories = {
      activeApp: "Chrome",
      activeDomain: "youtube.com"
    };
    let text = buildInterventionText(
      1,
      settings.persona,
      testCategories
    );
    if (settings.scriptSource === "gemini" && settings.geminiApiKey) {
      const geminiText = await generateScript(
        settings.geminiApiKey,
        1,
        settings.persona,
        settings.toughLoveExplicitAllowed
      );
      if (geminiText) text = geminiText;
    }
    const intervention = {
      id: crypto.randomUUID(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      score: 30,
      severity: 1,
      persona: settings.persona,
      text,
      userResponse: "pending",
      audioPlayed: false
    };
    insertIntervention(intervention);
    const mainWindow2 = getMainWindow();
    if (!mainWindow2 || mainWindow2.isDestroyed()) return intervention;
    mainWindow2.webContents.send(IPC_CHANNELS.ON_INTERVENTION, intervention);
    if (text) {
      const tts = { model: "eleven_v3", stability: 50, speed: 1 };
      mainWindow2.webContents.send(IPC_CHANNELS.ON_PLAY_AUDIO, {
        procrastinationScore: 30,
        severity: 1,
        reasons: ["Test intervention"],
        recommendation: { mode: "nudge", persona: settings.persona, text: intervention.text, tts, cooldownSeconds: settings.cooldownSeconds },
        interventionId: intervention.id
      });
    }
    return intervention;
  });
  electron.ipcMain.handle(
    IPC_CHANNELS.ELEVENLABS_TTS,
    async (_event, payload) => {
      const settings = getSettings();
      const apiKey = typeof settings.elevenLabsApiKey === "string" ? settings.elevenLabsApiKey.trim() : "";
      if (!apiKey) {
        throw new Error(JSON.stringify({ code: "NO_KEY", message: "ElevenLabs API key is not configured" }));
      }
      const text = typeof payload?.text === "string" ? payload.text : "";
      const voiceId = typeof payload?.voiceId === "string" ? payload.voiceId : "";
      const tts = payload?.tts;
      if (!text || !voiceId || !tts) {
        throw new Error(JSON.stringify({ code: "BAD_REQUEST", message: "Missing text, voiceId, or tts settings" }));
      }
      const stabilityRaw = Number.isFinite(tts.stability) ? tts.stability : 0.5;
      const stability01 = stabilityRaw > 1 ? Math.max(0, Math.min(stabilityRaw / 100, 1)) : Math.max(0, Math.min(stabilityRaw, 1));
      const stability = stability01 <= 0.25 ? 0 : stability01 <= 0.75 ? 0.5 : 1;
      const modelId = typeof tts.model === "string" && tts.model ? tts.model : "eleven_v3";
      const speed = Number.isFinite(tts.speed) ? tts.speed : 1;
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg"
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: 0.75,
            speed
          }
        }),
        signal: AbortSignal.timeout(15e3)
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(JSON.stringify({ code: "HTTP", statusCode: response.status, message: errorText }));
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("audio/")) {
        throw new Error(JSON.stringify({ code: "NON_AUDIO", message: `Non-audio content-type: ${contentType}` }));
      }
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength < 1e3) {
        throw new Error(JSON.stringify({ code: "SMALL_AUDIO", message: `Suspiciously small audio (${buffer.byteLength} bytes)` }));
      }
      return Buffer.from(new Uint8Array(buffer)).toString("base64");
    }
  );
  electron.ipcMain.handle(IPC_CHANNELS.CHECK_PERMISSIONS, async () => {
    if (process.platform !== "darwin") {
      return { screenRecording: true, status: "granted", canReadActiveWindow: true };
    }
    const status = electron.systemPreferences.getMediaAccessStatus("screen");
    if (status !== "granted") {
      return { screenRecording: false, status, canReadActiveWindow: false };
    }
    const now = Date.now();
    if (now - lastScreenProbeAt > 5e3) {
      lastScreenProbeAt = now;
      lastScreenProbeOk = await canReadActiveWindow();
    }
    return { screenRecording: lastScreenProbeOk, status, canReadActiveWindow: lastScreenProbeOk };
  });
  electron.ipcMain.handle(IPC_CHANNELS.REQUEST_PERMISSIONS, async () => {
    if (process.platform !== "darwin") return;
    const statusBefore = electron.systemPreferences.getMediaAccessStatus("screen");
    if (statusBefore === "granted") return;
    lastScreenProbeAt = 0;
    lastScreenProbeOk = await canReadActiveWindow();
    if (lastScreenProbeOk) return;
    const statusAfter = electron.systemPreferences.getMediaAccessStatus("screen");
    if (statusAfter !== "granted") {
      electron.shell.openExternal(
        "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
      );
    }
  });
  electron.ipcMain.on(IPC_CHANNELS.CHAT_SEND, async (event, payload) => {
    const { message, sessionId } = payload;
    const settings = getSettings();
    if (!settings.geminiApiKey) {
      if (!event.sender.isDestroyed()) {
        event.sender.send(IPC_CHANNELS.ON_CHAT_ERROR, "No Gemini API key configured");
        event.sender.send(IPC_CHANNELS.ON_CHAT_DONE);
      }
      return;
    }
    const existing = chatAbortControllers.get(sessionId);
    if (existing) {
      existing.abort();
      chatAbortControllers.delete(sessionId);
    }
    const controller = new AbortController();
    chatAbortControllers.set(sessionId, controller);
    const { signal } = controller;
    if (!chatSessions.has(sessionId)) {
      if (chatSessions.size >= MAX_CHAT_SESSIONS) {
        const oldest = chatSessions.keys().next().value;
        if (oldest !== void 0) chatSessions.delete(oldest);
      }
      chatSessions.set(sessionId, []);
    }
    const history = chatSessions.get(sessionId);
    history.push({ role: "user", content: message });
    if (history.length > MAX_MESSAGES_PER_SESSION) {
      history.splice(0, history.length - MAX_MESSAGES_PER_SESSION);
    }
    const nameClause = settings.userName ? ` The user's name is ${settings.userName}.` : "";
    const isDailySetup = sessionId.startsWith("daily-setup");
    let systemInstruction;
    if (isDailySetup) {
      const hour = (/* @__PURE__ */ new Date()).getHours();
      const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
      systemInstruction = `You are noRot, a friendly AI productivity companion.${nameClause} It is currently ${timeOfDay}. You are helping the user plan their day. Ask what they need to work on today. noRot works best for tasks the user will do on their computer (apps and websites). If they bring up offline / real-world activities, acknowledge it briefly and pivot to the computer side (look something up, send a message, set a reminder), or ask what computer task they want to focus on. Help break down big tasks into actionable items. Be concise, warm, and encouraging. Don't be preachy.`;
    } else {
      systemInstruction = `You are noRot, a friendly AI productivity companion.${nameClause} Help the user plan their work, break down tasks, and stay focused. noRot works best for tasks the user will do on their computer (apps and websites). If they bring up offline / real-world activities, acknowledge it briefly and pivot to the computer side, or ask what computer task they want to focus on. Be concise and actionable. When the user describes tasks, help them create a clear plan.`;
    }
    let fullReply = "";
    try {
      for await (const token of streamChat(settings.geminiApiKey, history, systemInstruction)) {
        if (signal.aborted || event.sender.isDestroyed()) break;
        fullReply += token;
        event.sender.send(IPC_CHANNELS.ON_CHAT_TOKEN, token);
      }
      if (!signal.aborted) {
        history.push({ role: "assistant", content: fullReply });
      }
    } catch (err) {
      if (!signal.aborted && !event.sender.isDestroyed()) {
        const errMsg = err instanceof Error ? err.message : "Unknown chat error";
        console.error("[ipc] chat error:", errMsg);
        event.sender.send(IPC_CHANNELS.ON_CHAT_ERROR, errMsg);
      }
    } finally {
      if (!event.sender.isDestroyed()) {
        event.sender.send(IPC_CHANNELS.ON_CHAT_DONE);
      }
      if (chatAbortControllers.get(sessionId)?.signal === signal) {
        chatAbortControllers.delete(sessionId);
      }
    }
  });
  electron.ipcMain.on(IPC_CHANNELS.CHAT_CANCEL, () => {
    for (const [id, controller] of chatAbortControllers) {
      controller.abort();
      chatAbortControllers.delete(id);
    }
  });
  function broadcastTodos() {
    const todos = getTodos();
    const main = getMainWindow();
    if (main && !main.isDestroyed()) {
      main.webContents.send(IPC_CHANNELS.ON_TODOS_UPDATED, todos);
    }
    const todo = getTodoWindow();
    if (todo && !todo.isDestroyed()) {
      todo.webContents.send(IPC_CHANNELS.ON_TODOS_UPDATED, todos);
    }
  }
  electron.ipcMain.handle(IPC_CHANNELS.EXTRACT_TODOS, async (_event, transcript) => {
    const settings = getSettings();
    if (!settings.geminiApiKey) return [];
    return extractTodosWithApps(settings.geminiApiKey, transcript);
  });
  electron.ipcMain.handle(IPC_CHANNELS.GET_TODOS, () => {
    return getTodos();
  });
  electron.ipcMain.handle(IPC_CHANNELS.ADD_TODO, (_event, item) => {
    addTodo(item);
    clearContextCache();
    broadcastTodos();
  });
  electron.ipcMain.handle(IPC_CHANNELS.TOGGLE_TODO, (_event, id) => {
    toggleTodo(id);
    clearContextCache();
    broadcastTodos();
  });
  electron.ipcMain.handle(IPC_CHANNELS.DELETE_TODO, (_event, id) => {
    deleteTodo(id);
    clearContextCache();
    broadcastTodos();
  });
  electron.ipcMain.handle(IPC_CHANNELS.UPDATE_TODO, (_event, id, fields) => {
    updateTodo(id, fields);
    clearContextCache();
    broadcastTodos();
  });
  electron.ipcMain.handle(IPC_CHANNELS.REORDER_TODOS, (_event, id, newOrder) => {
    reorderTodo(id, newOrder);
    broadcastTodos();
  });
  electron.ipcMain.handle(IPC_CHANNELS.SET_TODOS, (_event, items) => {
    setTodos(items);
    clearContextCache();
    broadcastTodos();
  });
  electron.ipcMain.handle(IPC_CHANNELS.APPEND_TODOS, (_event, items) => {
    appendTodos(items);
    clearContextCache();
    broadcastTodos();
  });
  electron.ipcMain.handle(IPC_CHANNELS.OPEN_TODO_OVERLAY, () => {
    const settings = getSettings();
    if (!settings.hasCompletedOnboarding) return;
    createTodoOverlayWindow();
    const todoWin = getTodoWindow();
    const anyFocused = electron.BrowserWindow.getAllWindows().some(
      (w) => !w.isDestroyed() && w.isFocused() && w !== todoWin
    );
    if (todoWin && !todoWin.isDestroyed()) {
      if (anyFocused) {
        todoWin.hide();
      } else {
        todoWin.showInactive();
      }
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.CLOSE_TODO_OVERLAY, () => {
    const todoWin = getTodoWindow();
    if (todoWin && !todoWin.isDestroyed()) {
      todoWin.destroy();
      setTodoWindow(null);
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.IS_TODO_OVERLAY_OPEN, () => {
    const todoWin = getTodoWindow();
    return Boolean(todoWin && !todoWin.isDestroyed());
  });
  electron.ipcMain.on(IPC_CHANNELS.BROADCAST_VOICE_STATUS, (event, payload) => {
    for (const win of electron.BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed() && win.webContents !== event.sender) {
        win.webContents.send(IPC_CHANNELS.ON_VOICE_STATUS, payload);
      }
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.ENSURE_VOICE_AGENT, async () => {
    const settings = getSettings();
    if (!settings.elevenLabsApiKey) {
      throw new Error(JSON.stringify({
        code: "NO_API_KEY",
        message: "No ElevenLabs API key found. Add one in Settings to use voice.",
        canRetry: false
      }));
    }
    try {
      return await ensureAgent(settings.elevenLabsApiKey, settings.persona);
    } catch (err) {
      console.error("[ipc] voice agent error:", err);
      const msg = err instanceof Error ? err.message : "";
      let code;
      let message;
      let canRetry;
      if (msg.includes(":401") || msg.includes(":403")) {
        code = "AUTH";
        message = "That API key doesn't seem to be valid. Double-check it in Settings.";
        canRetry = false;
      } else if (msg.includes(":429")) {
        code = "RATE_LIMIT";
        message = "Too many requests. Wait a few seconds and try again.";
        canRetry = true;
      } else if (msg.includes(":network")) {
        code = "NETWORK";
        message = "Couldn't reach the voice servers. Check your internet and try again.";
        canRetry = true;
      } else if (/:5\d\d/.test(msg)) {
        code = "NETWORK";
        message = "The voice servers are temporarily unavailable. Try again in a moment.";
        canRetry = true;
      } else {
        code = "UNKNOWN";
        message = "Something went wrong starting voice. Try again, or switch to manual.";
        canRetry = true;
      }
      throw new Error(JSON.stringify({ code, message, canRetry }));
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.ENSURE_CHECKIN_AGENT, async () => {
    const settings = getSettings();
    if (!settings.elevenLabsApiKey) {
      throw new Error(JSON.stringify({
        code: "NO_API_KEY",
        message: "No ElevenLabs API key found. Add one in Settings to use voice.",
        canRetry: false
      }));
    }
    try {
      const latestScore = getLatestScore();
      const latestSnapshot = getLatestSnapshot();
      const allTodos = getTodos();
      const activeTodos = allTodos.filter((t) => !t.done);
      const nowMinutes = getNowMinutesInTimeZone(settings.timeZone);
      const overdueTodos = activeTodos.filter((t) => {
        if (!t.deadline) return false;
        const dlMinutes = parseHHMMToMinutes(t.deadline);
        if (dlMinutes == null) return false;
        return nowMinutes > dlMinutes;
      });
      return await ensureCheckinAgent(settings.elevenLabsApiKey, settings.persona, {
        score: latestScore?.procrastinationScore ?? 0,
        severity: latestScore?.severity ?? 0,
        activeApp: latestSnapshot?.activeApp ?? "unknown",
        activeDomain: latestSnapshot?.activeDomain,
        activeTodos,
        overdueTodos
      });
    } catch (err) {
      console.error("[ipc] check-in agent error:", err);
      const msg = err instanceof Error ? err.message : "";
      try {
        const p = JSON.parse(msg);
        if (p.code) throw err;
      } catch {
      }
      let code;
      let message;
      let canRetry;
      if (msg.includes(":401") || msg.includes(":403")) {
        code = "AUTH";
        message = "That API key doesn't seem to be valid. Double-check it in Settings.";
        canRetry = false;
      } else if (msg.includes(":429")) {
        code = "RATE_LIMIT";
        message = "Too many requests. Wait a few seconds and try again.";
        canRetry = true;
      } else if (msg.includes(":network")) {
        code = "NETWORK";
        message = "Couldn't reach the voice servers. Check your internet and try again.";
        canRetry = true;
      } else if (/:5\d\d/.test(msg)) {
        code = "NETWORK";
        message = "The voice servers are temporarily unavailable. Try again in a moment.";
        canRetry = true;
      } else {
        code = "UNKNOWN";
        message = "Something went wrong starting voice check-in. Try again, or switch to manual.";
        canRetry = true;
      }
      throw new Error(JSON.stringify({ code, message, canRetry }));
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.HAS_ELEVENLABS_KEY, () => {
    const settings = getSettings();
    return Boolean(settings.elevenLabsApiKey);
  });
  electron.ipcMain.on(IPC_CHANNELS.VOICE_CHAT_OPEN, () => {
    const mainWindow2 = getMainWindow();
    if (!mainWindow2 || mainWindow2.isDestroyed()) return;
    mainWindow2.show();
    mainWindow2.focus();
    mainWindow2.webContents.send(IPC_CHANNELS.ON_VOICE_CHAT_OPEN);
  });
}
function shouldAutoStartTelemetry(settings, today) {
  return settings.hasCompletedOnboarding && settings.lastDailySetupDate === today && settings.monitoringEnabled !== false;
}
function shouldAutoCreateTodoOverlay(settings, today) {
  return settings.hasCompletedOnboarding && settings.lastDailySetupDate === today && settings.autoShowTodoOverlay !== false;
}
let mainWindow = null;
let isQuitting = false;
let focusDebounce = null;
electron.app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
electron.app.commandLine.appendSwitch("disable-renderer-backgrounding");
electron.app.setName("noRot");
function getArgValue(prefix) {
  const arg = process.argv.find((a) => a.startsWith(prefix));
  if (!arg) return void 0;
  return arg.slice(prefix.length) || void 0;
}
function resolveRendererUrl() {
  const envUrl = process.env.ELECTRON_RENDERER_URL;
  if (envUrl) return envUrl;
  const argUrl = getArgValue("--renderer-url=");
  if (argUrl) return argUrl;
  return void 0;
}
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0a0a0f",
    icon: path.join(__dirname, "../../build/icon.png"),
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: process.platform === "darwin" ? { x: 16, y: 12 } : void 0,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
      autoplayPolicy: "no-user-gesture-required"
    }
  });
  const rendererUrl = resolveRendererUrl();
  const isDev = !!rendererUrl;
  if (isDev) {
    console.log("[main] Loading renderer URL:", rendererUrl);
  }
  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error("[main] did-fail-load", { errorCode, errorDescription, validatedURL });
  });
  if (isDev) {
    mainWindow.webContents.on("did-finish-load", () => {
      console.log("[main] did-finish-load", {
        url: mainWindow?.webContents.getURL(),
        title: mainWindow?.getTitle()
      });
    });
    mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
      const levelLabel = ["log", "warn", "error", "debug"][level - 1] ?? `level:${level}`;
      console.log(`[renderer:${levelLabel}] ${message} (${sourceId}:${line})`);
    });
    mainWindow.webContents.on("render-process-gone", (_event, details) => {
      console.error("[main] render-process-gone", details);
    });
    mainWindow.webContents.on("preload-error", (_event, preloadPath, error) => {
      console.error("[main] preload-error", { preloadPath, error });
    });
  }
  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
  mainWindow.on("show", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    console.log("[main] window show event — sending IPC + invalidate");
    mainWindow.webContents.invalidate();
    mainWindow.webContents.send(IPC_CHANNELS.ON_WINDOW_SHOWN);
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
    setMainWindow(null);
  });
  setMainWindow(mainWindow);
}
electron.app.whenReady().then(() => {
  if (process.platform === "darwin" && electron.app.dock) {
    try {
      const iconPath = path.join(__dirname, "../../build/icon-macos.png");
      const icon = electron.nativeImage.createFromPath(iconPath);
      if (!icon.isEmpty()) electron.app.dock.setIcon(icon);
    } catch {
    }
  }
  initDatabase();
  registerIpcHandlers();
  createWindow();
  if (mainWindow) {
    createTray(mainWindow);
  }
  let lastAnyFocused = null;
  const syncTodoOverlayVisibility = (anyFocused) => {
    const todoWin = getTodoWindow();
    if (!todoWin || todoWin.isDestroyed()) return;
    if (anyFocused) {
      if (todoWin.isVisible()) todoWin.hide();
      return;
    }
    if (!todoWin.isVisible()) todoWin.showInactive();
  };
  const checkFocus = () => {
    if (focusDebounce) clearTimeout(focusDebounce);
    focusDebounce = setTimeout(() => {
      const todoWin = getTodoWindow();
      const anyFocused = electron.BrowserWindow.getAllWindows().some(
        (w) => !w.isDestroyed() && w.isFocused() && w !== todoWin
      );
      if (!isTodoDragging()) {
        syncTodoOverlayVisibility(anyFocused);
      }
      if (anyFocused !== lastAnyFocused) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(IPC_CHANNELS.ON_APP_FOCUS_CHANGED, { focused: anyFocused });
        }
      }
      lastAnyFocused = anyFocused;
    }, 150);
  };
  electron.app.on("browser-window-focus", checkFocus);
  electron.app.on("browser-window-blur", checkFocus);
  electron.app.on("browser-window-created", checkFocus);
  checkFocus();
  const settings = getSettings();
  const d = /* @__PURE__ */ new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (shouldAutoStartTelemetry(settings, today)) {
    console.log("[main] Onboarding + daily setup complete — starting telemetry");
    startTelemetry();
  } else {
    console.log("[main] Telemetry will NOT auto-start — waiting for daily setup or monitoring paused");
  }
  if (shouldAutoCreateTodoOverlay(settings, today)) {
    createTodoOverlayWindow();
    checkFocus();
  }
  electron.app.on("activate", (_event, hasVisibleWindows) => {
    if (hasVisibleWindows) return;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.invalidate();
    } else if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("before-quit", () => {
  isQuitting = true;
  if (focusDebounce) {
    clearTimeout(focusDebounce);
    focusDebounce = null;
  }
  const todoWin = getTodoWindow();
  if (todoWin && !todoWin.isDestroyed()) {
    todoWin.destroy();
    setTodoWindow(null);
  }
  destroyTray();
  stopTelemetry();
  closeDatabase();
});
