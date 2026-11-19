import { createClient } from '@libsql/client'

// Production: Turso (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN).
// Local dev: a SQLite file next to this folder.
const url = process.env.TURSO_DATABASE_URL || (process.env.VERCEL ? ':memory:' : 'file:local.db')
export const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })

// libSQL rows are array-like; turn them into plain objects keyed by column name
const toObjects = rs => rs.rows.map(row => Object.fromEntries(rs.columns.map((c, i) => [c, row[i]])))

export async function run(sql, args = []) {
  const rs = await client.execute({ sql, args })
  return {
    lastInsertRowid: rs.lastInsertRowid === undefined ? undefined : Number(rs.lastInsertRowid),
    changes: rs.rowsAffected,
  }
}
export async function get(sql, args = []) {
  return toObjects(await client.execute({ sql, args }))[0]
}
export async function all(sql, args = []) {
  return toObjects(await client.execute({ sql, args }))
}

export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    username   TEXT     NOT NULL UNIQUE,
    password   TEXT     NOT NULL,
    phone      TEXT     DEFAULT '',
    email      TEXT     DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS notes (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER  NOT NULL DEFAULT 0,
    title      TEXT     NOT NULL,
    content    TEXT,
    tags       TEXT     DEFAULT '',
    status     TEXT     DEFAULT 'todo',
    position   REAL     DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS otps (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    target     TEXT     NOT NULL,
    code       TEXT     NOT NULL,
    expires_at INTEGER  NOT NULL,
    used       INTEGER  DEFAULT 0,
    attempts   INTEGER  DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT     PRIMARY KEY,
    user_id    INTEGER  NOT NULL,
    expires_at INTEGER  NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  'CREATE INDEX IF NOT EXISTS idx_notes_user ON notes (user_id, deleted_at)',
  // Day notes: a one-day timetable. `data` is JSON: { start, end, columns, cells }
  `CREATE TABLE IF NOT EXISTS day_notes (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER  NOT NULL,
    title      TEXT     NOT NULL,
    day        TEXT     NOT NULL,
    data       TEXT     NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  'CREATE INDEX IF NOT EXISTS idx_day_notes_user ON day_notes (user_id)',
]

// On Vercel the filesystem is read-only, so a database URL is required there
export const configured = Boolean(process.env.TURSO_DATABASE_URL) || !process.env.VERCEL

async function init() {
  if (!configured) throw Object.assign(new Error('TURSO_DATABASE_URL is not set'), { notConfigured: true })
  // One round trip: important on serverless cold starts
  await client.batch([
    ...SCHEMA,
    { sql: 'DELETE FROM sessions WHERE expires_at < ?', args: [Date.now()] },
  ], 'write')
}

let readyPromise = null
export function ready() {
  if (!readyPromise) readyPromise = init().catch(err => { readyPromise = null; throw err })
  return readyPromise
}
