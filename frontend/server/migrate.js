// One-time import of users + notes from an old SQLite file into the current database.
//   npm run migrate -- ../backend/notes.db
// Target comes from TURSO_DATABASE_URL / TURSO_AUTH_TOKEN (put them in frontend/.env).
// Safe to re-run: existing rows (same id) are skipped.
import { createClient } from '@libsql/client'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { client as target, ready } from './db.js'

const file = process.argv[2]
if (!file || !existsSync(file)) {
  console.error('Usage: npm run migrate -- <path to old notes.db>')
  process.exit(1)
}
if (!process.env.TURSO_DATABASE_URL) console.warn('⚠ TURSO_DATABASE_URL not set — importing into local.db')

const source = createClient({ url: pathToFileURL(resolve(file)).href })
const columns = async table => (await source.execute(`PRAGMA table_info(${table})`)).rows.map(r => r.name)
const rows = async (sql) => {
  const rs = await source.execute(sql)
  return rs.rows.map(row => Object.fromEntries(rs.columns.map((c, i) => [c, row[i]])))
}

await ready()

const userCols = await columns('users')
const users = await rows('SELECT * FROM users')
const noteCols = await columns('notes')
const notes = await rows('SELECT * FROM notes')
const has = (cols, c) => cols.includes(c)

const stmts = [
  ...users.map(u => ({
    sql: `INSERT OR IGNORE INTO users (id, username, password, phone, email, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [u.id, u.username, u.password, u.phone ?? '', u.email ?? '', has(userCols, 'created_at') ? u.created_at : null],
  })),
  ...notes.map(n => ({
    sql: `INSERT OR IGNORE INTO notes (id, user_id, title, content, tags, status, position, deleted_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      n.id, n.user_id ?? 0, n.title, n.content ?? '', n.tags ?? '',
      has(noteCols, 'status') ? (n.status || 'todo') : 'todo',
      has(noteCols, 'position') ? (n.position ?? n.id) : n.id,
      n.deleted_at ?? null, n.created_at ?? null, n.updated_at ?? n.created_at ?? null,
    ],
  })),
]

const results = await target.batch(stmts, 'write')
const inserted = results.reduce((sum, r) => sum + r.rowsAffected, 0)
const count = async t => (await target.execute(`SELECT COUNT(*) c FROM ${t}`)).rows[0].c
console.log(`Read ${users.length} users and ${notes.length} notes; inserted ${inserted} new rows.`)
console.log(`Target now has ${await count('users')} users and ${await count('notes')} notes.`)
