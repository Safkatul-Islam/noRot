import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import { DEFAULT_SETTINGS, DEFAULT_CATEGORY_RULES } from './types';
import { buildUpdateTodoSql } from './todo-update';
let db;
export function initDatabase() {
    const dbPath = path.join(app.getPath('userData'), 'norot.db');
    db = new Database(dbPath);
    // Enable WAL mode for better concurrent read/write performance
    db.pragma('journal_mode = WAL');
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
    // Migrate: add extra columns to todos table
    const migrateColumns = [
        'app TEXT',
        'url TEXT',
        'allowed_apps TEXT',
        'deadline TEXT',
        'start_time TEXT',
        'duration_minutes INTEGER',
    ];
    for (const col of migrateColumns) {
        try {
            db.exec(`ALTER TABLE todos ADD COLUMN ${col}`);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (!msg.includes('duplicate column')) {
                console.error(`[database] Migration failed for column ${col}:`, msg);
            }
        }
    }
    // Seed default settings if they don't exist
    const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    const seedSettings = db.transaction(() => {
        for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
            insertSetting.run(key, JSON.stringify(value));
        }
    });
    seedSettings();
    // Auto-complete onboarding for existing users who already have data
    const hasData = db.prepare('SELECT COUNT(*) as count FROM interventions').get();
    if (hasData.count > 0) {
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('hasCompletedOnboarding', 'true')").run();
    }
    // Migrate: add default title rules for existing users who don't have any
    const rulesRow = db.prepare("SELECT value FROM settings WHERE key = 'categoryRules'").get();
    if (rulesRow) {
        try {
            const savedRules = JSON.parse(rulesRow.value);
            const hasTitleRules = savedRules.some((r) => r.matchType === 'title');
            if (!hasTitleRules) {
                const titleRules = DEFAULT_CATEGORY_RULES.filter((r) => r.matchType === 'title');
                const merged = [...savedRules, ...titleRules];
                db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('categoryRules', ?)").run(JSON.stringify(merged));
            }
        }
        catch {
            // Ignore malformed rules — defaults will be used
        }
    }
}
// --- Snapshots ---
export function insertSnapshot(timestamp, data) {
    db.prepare('INSERT INTO telemetry_snapshots (timestamp, data) VALUES (?, ?)').run(timestamp, data);
}
export function getLatestSnapshot() {
    const row = db.prepare('SELECT data FROM telemetry_snapshots ORDER BY id DESC LIMIT 1').get();
    if (!row)
        return null;
    try {
        const parsed = JSON.parse(row.data);
        return {
            activeApp: parsed?.categories?.activeApp ?? 'unknown',
            activeDomain: parsed?.categories?.activeDomain,
        };
    }
    catch {
        return null;
    }
}
export function getUsageHistory(minutes = 60) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    const rows = db
        .prepare('SELECT timestamp, data FROM telemetry_snapshots WHERE timestamp >= ? ORDER BY timestamp ASC')
        .all(cutoff);
    // Group by minute (YYYY-MM-DDTHH:MM) and take the last snapshot in each minute.
    const byMinute = new Map();
    for (const row of rows) {
        try {
            const snapshot = JSON.parse(row.data);
            const ts = typeof snapshot?.timestamp === 'string' ? snapshot.timestamp : row.timestamp;
            const minuteKey = ts.slice(0, 16);
            const productive = Number(snapshot?.signals?.productiveMinutes);
            const distracting = Number(snapshot?.signals?.distractingMinutes);
            if (!Number.isFinite(productive) || !Number.isFinite(distracting))
                continue;
            byMinute.set(minuteKey, { timestamp: ts, productive, distracting });
        }
        catch {
            // Ignore malformed rows
        }
    }
    const minutesSeries = Array.from(byMinute.entries())
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([, v]) => v);
    // Convert cumulative minutes to per-minute deltas.
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
export function getAppStats(minutes = 1440) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    const rows = db
        .prepare('SELECT timestamp, data FROM telemetry_snapshots WHERE timestamp >= ? ORDER BY timestamp ASC')
        .all(cutoff);
    const apps = new Map();
    for (const row of rows) {
        try {
            const snapshot = JSON.parse(row.data);
            const rawAppName = snapshot?.categories?.activeApp;
            const category = snapshot?.categories?.activeCategory;
            const activeDomain = snapshot?.categories?.activeDomain;
            if (typeof rawAppName !== 'string' || !rawAppName)
                continue;
            // Key per (app, domain) so "Chrome + YouTube" and "Chrome + GitHub" can be tuned separately.
            const key = `${rawAppName}||${activeDomain ?? ''}`;
            const ts = typeof snapshot?.timestamp === 'string' ? snapshot.timestamp : row.timestamp;
            const existing = apps.get(key);
            if (existing) {
                existing.totalSeconds += 5;
                existing.lastSeen = ts;
            }
            else {
                apps.set(key, {
                    appName: rawAppName,
                    ...(typeof activeDomain === 'string' && activeDomain ? { domain: activeDomain } : {}),
                    category: category ?? 'neutral',
                    totalSeconds: 5,
                    lastSeen: ts,
                });
            }
        }
        catch {
            // Ignore malformed rows
        }
    }
    return Array.from(apps.values())
        .sort((a, b) => b.totalSeconds - a.totalSeconds);
}
// --- Scores ---
export function insertScore(score) {
    db.prepare('INSERT INTO score_history (timestamp, score, severity, reasons, recommendation) VALUES (?, ?, ?, ?, ?)').run(new Date().toISOString(), score.procrastinationScore, score.severity, JSON.stringify(score.reasons), JSON.stringify(score.recommendation));
}
export function getScoreHistory(limit = 50) {
    const rows = db
        .prepare('SELECT * FROM score_history ORDER BY id DESC LIMIT ?')
        .all(limit);
    return rows.map((row) => ({
        procrastinationScore: row.score,
        severity: row.severity,
        reasons: JSON.parse(row.reasons),
        recommendation: JSON.parse(row.recommendation),
    }));
}
export function getLatestScore() {
    const results = getScoreHistory(1);
    return results.length > 0 ? results[0] : null;
}
// --- Interventions ---
export function insertIntervention(event) {
    db.prepare('INSERT INTO interventions (id, timestamp, score, severity, persona, text, user_response, audio_played) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(event.id, event.timestamp, event.score, event.severity, event.persona, event.text, event.userResponse, event.audioPlayed ? 1 : 0);
}
export function updateInterventionResponse(eventId, response) {
    db.prepare('UPDATE interventions SET user_response = ? WHERE id = ?').run(response, eventId);
}
export function updateAudioPlayed(interventionId) {
    db.prepare('UPDATE interventions SET audio_played = 1 WHERE id = ?').run(interventionId);
}
export function getInterventions(limit = 50) {
    const rows = db
        .prepare('SELECT * FROM interventions ORDER BY timestamp DESC LIMIT ?')
        .all(limit);
    return rows.map((row) => ({
        id: row.id,
        timestamp: row.timestamp,
        score: row.score,
        severity: row.severity,
        persona: row.persona,
        text: row.text,
        userResponse: row.user_response,
        audioPlayed: row.audio_played === 1,
    }));
}
// --- Settings ---
export function getSettings() {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
        if (row.key in settings) {
            settings[row.key] = JSON.parse(row.value);
        }
    }
    // Safety gate: never allow explicit Tough Love persona unless user opted in.
    if (settings.persona === 'tough_love' && settings.toughLoveExplicitAllowed !== true) {
        settings.persona = 'coach';
    }
    return settings;
}
export function updateSetting(key, value) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
}
// --- Todos ---
export function getTodos() {
    const rows = db
        .prepare('SELECT id, text, done, "order", app, url, allowed_apps, deadline, start_time, duration_minutes FROM todos ORDER BY "order" ASC')
        .all();
    return rows.map((row) => ({
        id: row.id,
        text: row.text,
        done: row.done === 1,
        order: row.order,
        ...(row.app != null ? { app: row.app } : {}),
        ...(row.url != null ? { url: row.url } : {}),
        ...(row.allowed_apps ? { allowedApps: JSON.parse(row.allowed_apps) } : {}),
        ...(row.deadline != null ? { deadline: row.deadline } : {}),
        ...(row.start_time != null ? { startTime: row.start_time } : {}),
        ...(row.duration_minutes != null ? { durationMinutes: row.duration_minutes } : {}),
    }));
}
export function addTodo(item) {
    db.prepare('INSERT INTO todos (id, text, done, "order", app, url, allowed_apps, deadline, start_time, duration_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(item.id, item.text, item.done ? 1 : 0, item.order, item.app ?? null, item.url ?? null, item.allowedApps ? JSON.stringify(item.allowedApps) : null, item.deadline ?? null, item.startTime ?? null, item.durationMinutes ?? null);
}
export function toggleTodo(id) {
    db.prepare('UPDATE todos SET done = CASE WHEN done = 0 THEN 1 ELSE 0 END WHERE id = ?').run(id);
}
export function deleteTodo(id) {
    db.prepare('DELETE FROM todos WHERE id = ?').run(id);
}
export function updateTodo(id, fields) {
    const built = buildUpdateTodoSql(fields);
    if (!built)
        return;
    db.prepare(`UPDATE todos SET ${built.setSql} WHERE id = ?`).run(...built.values, id);
}
export function reorderTodo(id, newOrder) {
    db.prepare('UPDATE todos SET "order" = ? WHERE id = ?').run(newOrder, id);
}
export function appendTodos(items) {
    if (items.length === 0)
        return;
    const row = db.prepare('SELECT COALESCE(MAX("order"), -1) AS maxOrder FROM todos').get();
    const startOrder = (typeof row?.maxOrder === 'number' ? row.maxOrder : -1) + 1;
    const insert = db.prepare('INSERT OR REPLACE INTO todos (id, text, done, "order", app, url, allowed_apps, deadline, start_time, duration_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const doAppend = db.transaction((todos) => {
        for (let i = 0; i < todos.length; i++) {
            const item = todos[i];
            insert.run(item.id, item.text, item.done ? 1 : 0, startOrder + i, item.app ?? null, item.url ?? null, item.allowedApps ? JSON.stringify(item.allowedApps) : null, item.deadline ?? null, item.startTime ?? null, item.durationMinutes ?? null);
        }
    });
    doAppend(items);
}
export function setTodos(items) {
    const clear = db.prepare('DELETE FROM todos');
    const insert = db.prepare('INSERT INTO todos (id, text, done, "order", app, url, allowed_apps, deadline, start_time, duration_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const replaceAll = db.transaction((todos) => {
        clear.run();
        for (const item of todos) {
            insert.run(item.id, item.text, item.done ? 1 : 0, item.order, item.app ?? null, item.url ?? null, item.allowedApps ? JSON.stringify(item.allowedApps) : null, item.deadline ?? null, item.startTime ?? null, item.durationMinutes ?? null);
        }
    });
    replaceAll(items);
}
// --- Wins ---
export function getWinsData() {
    // Refocuses today: count interventions where user clicked "I'm working!" today
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const cutoff = todayMidnight.toISOString();
    const refocusRow = db.prepare("SELECT COUNT(*) as count FROM interventions WHERE user_response = 'working' AND timestamp >= ?").get(cutoff);
    // Total focused minutes: parse the latest telemetry snapshot
    const latestSnapshot = db.prepare('SELECT data FROM telemetry_snapshots ORDER BY id DESC LIMIT 1').get();
    let totalFocusedMinutes = 0;
    if (latestSnapshot) {
        try {
            const parsed = JSON.parse(latestSnapshot.data);
            const productive = Number(parsed?.signals?.productiveMinutes);
            if (Number.isFinite(productive)) {
                totalFocusedMinutes = Math.round(productive);
            }
        }
        catch {
            // Ignore malformed snapshot
        }
    }
    return {
        refocusCount: refocusRow.count,
        totalFocusedMinutes,
    };
}
export function closeDatabase() {
    if (db) {
        db.close();
    }
}
