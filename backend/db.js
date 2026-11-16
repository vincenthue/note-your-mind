const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// DB_PATH lets the database live on a persistent volume (e.g. Railway volume at /data).
// If the target file doesn't exist yet but the bundled notes.db does, copy it over once
// so existing accounts and notes carry across.
const bundledPath = path.join(__dirname, 'notes.db');
const dbPath = process.env.DB_PATH || bundledPath;

if (dbPath !== bundledPath && !fs.existsSync(dbPath)) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (fs.existsSync(bundledPath)) {
    fs.copyFileSync(bundledPath, dbPath);
    console.log(`📦 Seeded ${dbPath} from bundled notes.db`);
  }
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('DB connection error:', err.message);
  else console.log(`✅ Connected to SQLite database at ${dbPath}`);
});

db.run('PRAGMA foreign_keys = ON');

db.exec_run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) reject(err);
    else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
  });
});

db.exec_get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
});

db.exec_all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
});

const initDb = async () => {
  const queries = [
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
  ];
  for (const q of queries) await db.exec_run(q);

  // Migrate older databases
  const noteCols = (await db.exec_all('PRAGMA table_info(notes)')).map(c => c.name);
  if (!noteCols.includes('tags'))       await db.exec_run("ALTER TABLE notes ADD COLUMN tags TEXT DEFAULT ''");
  if (!noteCols.includes('deleted_at')) await db.exec_run('ALTER TABLE notes ADD COLUMN deleted_at DATETIME DEFAULT NULL');
  if (!noteCols.includes('user_id'))    await db.exec_run('ALTER TABLE notes ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0');
  if (!noteCols.includes('status'))     await db.exec_run("ALTER TABLE notes ADD COLUMN status TEXT DEFAULT 'todo'");
  if (!noteCols.includes('position')) {
    await db.exec_run('ALTER TABLE notes ADD COLUMN position REAL DEFAULT 0');
    await db.exec_run('UPDATE notes SET position = id');
  }
  const otpCols = (await db.exec_all('PRAGMA table_info(otps)')).map(c => c.name);
  if (!otpCols.includes('attempts')) await db.exec_run('ALTER TABLE otps ADD COLUMN attempts INTEGER DEFAULT 0');

  await db.exec_run('DELETE FROM sessions WHERE expires_at < ?', [Date.now()]);
  console.log('✅ DB ready');
};

db.ready = initDb();
db.ready.catch(console.error);

module.exports = db;
