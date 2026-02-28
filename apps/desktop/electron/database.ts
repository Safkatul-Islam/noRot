import { app } from 'electron'
import Database from 'better-sqlite3'
import { join } from 'node:path'

import type { PersonaId } from '@norot/shared'

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

export type SettingsKey =
  | 'onboardingComplete'
  | 'monitoringEnabled'
  | 'dailySetupDate'
  | 'autoShowTodoOverlay'
  | 'apiUrl'
  | 'persona'
  | 'scoreThreshold'
  | 'cooldownSeconds'
  | 'scriptSource'
  | 'geminiKey'
  | 'elevenLabsApiKey'
  | 'visionEnabled'
  | 'muted'
  | 'ttsEngine'
  | 'categoryRules'
  | 'workOverrides'
  | 'refocusCountDate'
  | 'refocusCount'

export interface CategoryRule {
  matchType: 'app' | 'title'
  pattern: string
  category: 'productive' | 'neutral' | 'social' | 'entertainment' | 'unknown'
}

export interface WorkOverride {
  app?: string
  domain?: string
  untilTs: number
}

export interface SettingsState {
  onboardingComplete: boolean
  monitoringEnabled: boolean
  dailySetupDate: string | null
  autoShowTodoOverlay: boolean
  apiUrl: string
  persona: PersonaId
  scoreThreshold: number
  cooldownSeconds: number
  scriptSource: 'default' | 'gemini'
  geminiKey: string
  elevenLabsApiKey: string
  visionEnabled: boolean
  muted: boolean
  ttsEngine: 'auto' | 'elevenlabs' | 'local'
  categoryRules: CategoryRule[]
  workOverrides: WorkOverride[]
  refocusCountDate: string | null
  refocusCount: number
}

export interface TodoRow {
  id: number
  text: string
  done: boolean
  order: number
  app: string | null
  url: string | null
  allowedApps: string[] | null
  deadline: number | null
  startTime: number | null
  durationMinutes: number | null
}

function safeJsonParse(value: string): JsonValue {
  try {
    return JSON.parse(value) as JsonValue
  } catch {
    return null
  }
}

function toDateKey(date: Date): string {
  const yyyy = String(date.getFullYear())
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export class LocalDatabase {
  private readonly db: InstanceType<typeof Database>

  private constructor(db: InstanceType<typeof Database>) {
    this.db = db
  }

  static open(): LocalDatabase {
    const filePath = join(app.getPath('userData'), 'norot.db')
    const db = new Database(filePath)
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
    db.pragma('foreign_keys = ON')
    db.pragma('busy_timeout = 5000')

    const local = new LocalDatabase(db)
    local.migrate()
    local.seedDefaults()
    return local
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS telemetry_snapshots(
        timestamp INTEGER NOT NULL,
        data TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS score_history(
        timestamp INTEGER NOT NULL,
        score REAL NOT NULL,
        severity INTEGER NOT NULL,
        reasons TEXT NOT NULL,
        recommendation TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS interventions(
        id TEXT PRIMARY KEY,
        user_response TEXT NOT NULL,
        audio_played INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings(
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS todos(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        done INTEGER NOT NULL,
        order_index INTEGER NOT NULL,
        app TEXT,
        url TEXT,
        allowed_apps TEXT,
        deadline INTEGER,
        start_time INTEGER,
        duration_minutes INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON telemetry_snapshots(timestamp);
      CREATE INDEX IF NOT EXISTS idx_scores_ts ON score_history(timestamp);
    `)
  }

  private seedDefaults(): void {
    const defaults: SettingsState = {
      onboardingComplete: false,
      monitoringEnabled: true,
      dailySetupDate: null,
      autoShowTodoOverlay: true,
      apiUrl: 'http://localhost:8000',
      persona: 'calm_friend',
      scoreThreshold: 70,
      cooldownSeconds: 180,
      scriptSource: 'default',
      geminiKey: '',
      elevenLabsApiKey: '',
      visionEnabled: false,
      muted: false,
      ttsEngine: 'auto',
      categoryRules: [],
      workOverrides: [],
      refocusCountDate: null,
      refocusCount: 0
    }

    const insert = this.db.prepare<[string, string]>(
      'INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)'
    )

    for (const [key, value] of Object.entries(defaults)) {
      insert.run(key, JSON.stringify(value))
    }

    // If there are past interventions, consider onboarding complete.
    const anyInterventions = this.db
      .prepare<[], { c: number }>('SELECT COUNT(*) AS c FROM interventions')
      .get()
    if ((anyInterventions?.c ?? 0) > 0) {
      this.setSetting('onboardingComplete', true)
    }

    // Ensure refocus counter carries a date key.
    const dateKey = this.getSetting<string | null>('refocusCountDate')
    if (!dateKey) {
      this.setSetting('refocusCountDate', toDateKey(new Date()))
      this.setSetting('refocusCount', 0)
    }
  }

  close(): void {
    this.db.close()
  }

  getAllSettings(): Record<string, JsonValue> {
    const rows = this.db.prepare<[], { key: string; value: string }>('SELECT key,value FROM settings').all()
    const out: Record<string, JsonValue> = {}
    for (const r of rows) {
      out[r.key] = safeJsonParse(r.value)
    }
    return out
  }

  getSetting<T>(key: SettingsKey): T {
    const row = this.db
      .prepare<[string], { value: string }>('SELECT value FROM settings WHERE key=?')
      .get(key)
    const parsed = row ? safeJsonParse(row.value) : null
    return parsed as unknown as T
  }

  setSetting(key: SettingsKey, value: JsonValue): void {
    this.db
      .prepare<[string, string]>(
        'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
      )
      .run(key, JSON.stringify(value))
  }

  incrementRefocusCount(): number {
    const today = toDateKey(new Date())
    const currentDate = this.getSetting<string | null>('refocusCountDate')
    if (currentDate !== today) {
      this.setSetting('refocusCountDate', today)
      this.setSetting('refocusCount', 0)
    }
    const current = this.getSetting<number>('refocusCount') ?? 0
    const next = current + 1
    this.setSetting('refocusCount', next)
    return next
  }

  insertTelemetrySnapshot(timestamp: number, data: JsonValue): void {
    this.db
      .prepare<[number, string]>('INSERT INTO telemetry_snapshots(timestamp,data) VALUES(?,?)')
      .run(timestamp, JSON.stringify(data))
  }

  insertScoreHistory(timestamp: number, score: number, severity: number, reasons: string[], recommendation: JsonValue): void {
    this.db
      .prepare<[number, number, number, string, string]>(
        'INSERT INTO score_history(timestamp,score,severity,reasons,recommendation) VALUES(?,?,?,?,?)'
      )
      .run(timestamp, score, severity, JSON.stringify(reasons), JSON.stringify(recommendation))
  }

  getLatestScore(): { timestamp: number; score: number; severity: number; reasons: string[]; recommendation: JsonValue } | null {
    const row = this.db
      .prepare<[], { timestamp: number; score: number; severity: number; reasons: string; recommendation: string }>(
        'SELECT timestamp,score,severity,reasons,recommendation FROM score_history ORDER BY timestamp DESC LIMIT 1'
      )
      .get()
    if (!row) return null
    const reasons = safeJsonParse(row.reasons)
    const rec = safeJsonParse(row.recommendation)
    return {
      timestamp: row.timestamp,
      score: row.score,
      severity: row.severity,
      reasons: Array.isArray(reasons) ? (reasons as string[]) : [],
      recommendation: rec
    }
  }

  listTodos(): TodoRow[] {
    const rows = this.db
      .prepare<[], {
        id: number
        text: string
        done: number
        order_index: number
        app: string | null
        url: string | null
        allowed_apps: string | null
        deadline: number | null
        start_time: number | null
        duration_minutes: number | null
      }>('SELECT * FROM todos ORDER BY order_index ASC, id ASC')
      .all()

    return rows.map(r => ({
      id: r.id,
      text: r.text,
      done: r.done === 1,
      order: r.order_index,
      app: r.app,
      url: r.url,
      allowedApps: r.allowed_apps ? (safeJsonParse(r.allowed_apps) as unknown as string[]) : null,
      deadline: r.deadline,
      startTime: r.start_time,
      durationMinutes: r.duration_minutes
    }))
  }

  addTodo(text: string): TodoRow {
    const maxOrder = this.db
      .prepare<[], { max_order: number | null }>('SELECT MAX(order_index) AS max_order FROM todos')
      .get()
    const order = (maxOrder?.max_order ?? 0) + 1
    const result = this.db
      .prepare<[string, number]>(
        'INSERT INTO todos(text,done,order_index) VALUES(?,0,?)'
      )
      .run(text, order)
    const id = Number(result.lastInsertRowid)
    return this.getTodo(id)
  }

  updateTodo(id: number, patch: Partial<TodoRow>): TodoRow {
    const existing = this.getTodo(id)
    const next: TodoRow = {
      ...existing,
      ...patch
    }

    this.db
      .prepare<[string, number, number, string | null, string | null, string | null, number | null, number | null, number | null, number]>(
        `
        UPDATE todos
        SET text=?, done=?, order_index=?, app=?, url=?, allowed_apps=?, deadline=?, start_time=?, duration_minutes=?
        WHERE id=?
        `
      )
      .run(
        next.text,
        next.done ? 1 : 0,
        next.order,
        next.app,
        next.url,
        next.allowedApps ? JSON.stringify(next.allowedApps) : null,
        next.deadline,
        next.startTime,
        next.durationMinutes,
        id
      )

    return this.getTodo(id)
  }

  deleteTodo(id: number): void {
    this.db.prepare<[number]>('DELETE FROM todos WHERE id=?').run(id)
  }

  private getTodo(id: number): TodoRow {
    const row = this.db
      .prepare<[number], {
        id: number
        text: string
        done: number
        order_index: number
        app: string | null
        url: string | null
        allowed_apps: string | null
        deadline: number | null
        start_time: number | null
        duration_minutes: number | null
      }>('SELECT * FROM todos WHERE id=?')
      .get(id)
    if (!row) {
      throw new Error(`Todo not found: ${id}`)
    }
    return {
      id: row.id,
      text: row.text,
      done: row.done === 1,
      order: row.order_index,
      app: row.app,
      url: row.url,
      allowedApps: row.allowed_apps ? (safeJsonParse(row.allowed_apps) as unknown as string[]) : null,
      deadline: row.deadline,
      startTime: row.start_time,
      durationMinutes: row.duration_minutes
    }
  }
}
