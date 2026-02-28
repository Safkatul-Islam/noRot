import { getActivityHistory, getInterventions, getDb } from './local-db'

const API_BASE = 'http://localhost:8000'
const DEFAULT_SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes

let syncTimer: ReturnType<typeof setInterval> | null = null

/**
 * Starts periodic syncing of activities and interventions to the API.
 */
export function startApiSync(interval: number = DEFAULT_SYNC_INTERVAL): void {
  if (syncTimer) {
    clearInterval(syncTimer)
  }

  // Run an initial sync
  runSync().catch((err) => {
    console.error('[api-sync] Initial sync failed:', err)
  })

  syncTimer = setInterval(() => {
    runSync().catch((err) => {
      console.error('[api-sync] Periodic sync failed:', err)
    })
  }, interval)

  console.log(`[api-sync] Started with interval ${interval / 1000}s`)
}

/**
 * Stops periodic API syncing.
 */
export function stopApiSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
    console.log('[api-sync] Stopped')
  }
}

async function runSync(): Promise<void> {
  await syncActivities()
  await syncInterventions()
}

/**
 * Reads unsent activity logs from the DB, POSTs them to the API,
 * and marks them as synced after a successful response.
 */
export async function syncActivities(): Promise<void> {
  try {
    const db = getDb()

    // Ensure the synced column exists (add it if missing)
    ensureSyncedColumn(db, 'activity_log')

    const unsynced = db
      .prepare(
        `SELECT id, timestamp, app, title, category, duration
         FROM activity_log
         WHERE synced = 0
         ORDER BY timestamp ASC
         LIMIT 100`
      )
      .all() as Array<{
      id: number
      timestamp: number
      app: string
      title: string
      category: string
      duration: number
    }>

    if (unsynced.length === 0) return

    const response = await fetch(`${API_BASE}/activities/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activities: unsynced })
    })

    if (!response.ok) {
      console.error(`[api-sync] Activities sync failed: ${response.status} ${response.statusText}`)
      return
    }

    // Mark as synced
    const ids = unsynced.map((a) => a.id)
    const placeholders = ids.map(() => '?').join(',')
    db.prepare(`UPDATE activity_log SET synced = 1 WHERE id IN (${placeholders})`).run(...ids)

    console.log(`[api-sync] Synced ${unsynced.length} activities`)
  } catch (err) {
    console.error('[api-sync] Activities sync error:', err)
  }
}

/**
 * Reads unsent interventions from the DB, POSTs them to the API,
 * and marks them as synced after a successful response.
 */
export async function syncInterventions(): Promise<void> {
  try {
    const db = getDb()

    // Ensure the synced column exists (add it if missing)
    ensureSyncedColumn(db, 'interventions')

    const unsynced = db
      .prepare(
        `SELECT id, timestamp, score, severity, script, persona, snoozed, dismissed, committed_to_work
         FROM interventions
         WHERE synced = 0
         ORDER BY timestamp ASC
         LIMIT 100`
      )
      .all() as Array<{
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

    if (unsynced.length === 0) return

    const payload = unsynced.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      score: r.score,
      severity: r.severity,
      script: r.script,
      persona: r.persona,
      snoozed: r.snoozed === 1,
      dismissed: r.dismissed === 1,
      committedToWork: r.committed_to_work === 1
    }))

    const response = await fetch(`${API_BASE}/interventions/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interventions: payload })
    })

    if (!response.ok) {
      console.error(
        `[api-sync] Interventions sync failed: ${response.status} ${response.statusText}`
      )
      return
    }

    // Mark as synced
    const ids = unsynced.map((i) => i.id)
    const placeholders = ids.map(() => '?').join(',')
    db.prepare(`UPDATE interventions SET synced = 1 WHERE id IN (${placeholders})`).run(...ids)

    console.log(`[api-sync] Synced ${unsynced.length} interventions`)
  } catch (err) {
    console.error('[api-sync] Interventions sync error:', err)
  }
}

/**
 * Ensures a 'synced' column exists on the given table.
 * This is a migration helper so we don't need to alter the DB schema elsewhere.
 */
function ensureSyncedColumn(db: ReturnType<typeof getDb>, table: string): void {
  try {
    const columns = db.pragma(`table_info(${table})`) as Array<{ name: string }>
    const hasSynced = columns.some((col) => col.name === 'synced')
    if (!hasSynced) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN synced INTEGER NOT NULL DEFAULT 0`)
      console.log(`[api-sync] Added 'synced' column to ${table}`)
    }
  } catch (err) {
    console.error(`[api-sync] Failed to ensure synced column on ${table}:`, err)
  }
}
