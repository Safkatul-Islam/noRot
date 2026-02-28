import { app } from 'electron'
import { join } from 'path'
import type Database from 'better-sqlite3'
import type {
  ActivityEntry,
  Intervention,
  Todo,
  Win,
  Settings,
  AppCategory
} from '@norot/shared'

let db: Database.Database | null = null

export function initDb(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const BetterSqlite3 = require('better-sqlite3')
  const dbPath = join(app.getPath('userData'), 'norot.db')
  db = new BetterSqlite3(dbPath)

  // Enable WAL mode for better concurrent performance
  db!.pragma('journal_mode = WAL')

  db!.exec(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      app TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      duration INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS interventions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      score REAL NOT NULL,
      severity TEXT NOT NULL,
      script TEXT NOT NULL,
      persona TEXT NOT NULL,
      snoozed INTEGER NOT NULL DEFAULT 0,
      dismissed INTEGER NOT NULL DEFAULT 0,
      committed_to_work INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS wins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      description TEXT NOT NULL,
      score REAL NOT NULL,
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  // Seed default settings if they don't exist
  const insertSetting = db!.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  )
  const defaults: Record<string, string> = {
    persona: '"chill_friend"',
    onboardingComplete: 'false',
    visionEnabled: 'false',
    elevenLabsApiKey: '""',
    geminiApiKey: '""',
    customAppRules: '[]',
    snoozeCount: '0',
    lastSnoozeTime: 'null'
  }

  const seedTransaction = db!.transaction(() => {
    for (const [key, value] of Object.entries(defaults)) {
      insertSetting.run(key, value)
    }
  })
  seedTransaction()
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return db
}

// ── Activity Log ────────────────────────────────────────────────────────────

export function logActivity(entry: ActivityEntry): void {
  const d = getDb()
  d.prepare(
    `INSERT INTO activity_log (timestamp, app, title, category, duration)
     VALUES (?, ?, ?, ?, ?)`
  ).run(entry.timestamp, entry.app, entry.title, entry.category, entry.duration)
}

export function getActivityHistory(limit: number = 200): ActivityEntry[] {
  const d = getDb()
  const rows = d
    .prepare(
      `SELECT id, timestamp, app, title, category, duration
       FROM activity_log
       ORDER BY timestamp DESC
       LIMIT ?`
    )
    .all(limit) as Array<{
    id: number
    timestamp: number
    app: string
    title: string
    category: string
    duration: number
  }>

  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    app: r.app,
    title: r.title,
    category: r.category as AppCategory,
    duration: r.duration
  }))
}

// ── Interventions ───────────────────────────────────────────────────────────

export function saveIntervention(intervention: Intervention): number {
  const d = getDb()
  const result = d
    .prepare(
      `INSERT INTO interventions (timestamp, score, severity, script, persona, snoozed, dismissed, committed_to_work)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      intervention.timestamp,
      intervention.score,
      intervention.severity,
      intervention.script,
      intervention.persona,
      intervention.snoozed ? 1 : 0,
      intervention.dismissed ? 1 : 0,
      intervention.committedToWork ? 1 : 0
    )
  return result.lastInsertRowid as number
}

export function getInterventions(limit: number = 50): Intervention[] {
  const d = getDb()
  const rows = d
    .prepare(
      `SELECT id, timestamp, score, severity, script, persona, snoozed, dismissed, committed_to_work
       FROM interventions
       ORDER BY timestamp DESC
       LIMIT ?`
    )
    .all(limit) as Array<{
    id: number
    timestamp: number
    score: number
    severity: string
    script: string
    persona: string
    snoozed: number
    dismissed: number
    committed_to_work: number
  }>

  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    score: r.score,
    severity: r.severity as Intervention['severity'],
    script: r.script,
    persona: r.persona,
    snoozed: r.snoozed === 1,
    dismissed: r.dismissed === 1,
    committedToWork: r.committed_to_work === 1
  }))
}

// ── Todos ───────────────────────────────────────────────────────────────────

export function addTodo(text: string): Todo {
  const d = getDb()
  const now = Date.now()
  const result = d
    .prepare(
      `INSERT INTO todos (text, completed, created_at) VALUES (?, 0, ?)`
    )
    .run(text, now)

  return {
    id: result.lastInsertRowid as number,
    text,
    completed: false,
    createdAt: now,
    completedAt: null
  }
}

export function getTodos(): Todo[] {
  const d = getDb()
  const rows = d
    .prepare(
      `SELECT id, text, completed, created_at, completed_at
       FROM todos
       ORDER BY created_at DESC`
    )
    .all() as Array<{
    id: number
    text: string
    completed: number
    created_at: number
    completed_at: number | null
  }>

  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    completed: r.completed === 1,
    createdAt: r.created_at,
    completedAt: r.completed_at
  }))
}

export function toggleTodo(id: number): void {
  const d = getDb()
  const row = d.prepare('SELECT completed FROM todos WHERE id = ?').get(id) as
    | { completed: number }
    | undefined

  if (!row) return

  if (row.completed === 0) {
    d.prepare(
      'UPDATE todos SET completed = 1, completed_at = ? WHERE id = ?'
    ).run(Date.now(), id)
  } else {
    d.prepare(
      'UPDATE todos SET completed = 0, completed_at = NULL WHERE id = ?'
    ).run(id)
  }
}

export function deleteTodo(id: number): void {
  const d = getDb()
  d.prepare('DELETE FROM todos WHERE id = ?').run(id)
}

// ── Wins ────────────────────────────────────────────────────────────────────

export function saveWin(win: Win): number {
  const d = getDb()
  const result = d
    .prepare(
      `INSERT INTO wins (timestamp, description, score, type)
       VALUES (?, ?, ?, ?)`
    )
    .run(win.timestamp, win.description, win.score, win.type)
  return result.lastInsertRowid as number
}

export function getWins(limit: number = 50): Win[] {
  const d = getDb()
  const rows = d
    .prepare(
      `SELECT id, timestamp, description, score, type
       FROM wins
       ORDER BY timestamp DESC
       LIMIT ?`
    )
    .all(limit) as Array<{
    id: number
    timestamp: number
    description: string
    score: number
    type: string
  }>

  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    description: r.description,
    score: r.score,
    type: r.type as Win['type']
  }))
}

// ── Settings ────────────────────────────────────────────────────────────────

export function getSetting<T = unknown>(key: string): T | null {
  const d = getDb()
  const row = d.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined

  if (!row) return null

  try {
    return JSON.parse(row.value) as T
  } catch {
    return row.value as unknown as T
  }
}

export function setSetting(key: string, value: unknown): void {
  const d = getDb()
  d.prepare(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
  ).run(key, JSON.stringify(value))
}

export function getAllSettings(): Partial<Settings> {
  const d = getDb()
  const rows = d.prepare('SELECT key, value FROM settings').all() as Array<{
    key: string
    value: string
  }>

  const settings: Record<string, unknown> = {}
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value)
    } catch {
      settings[row.key] = row.value
    }
  }
  return settings as Partial<Settings>
}
