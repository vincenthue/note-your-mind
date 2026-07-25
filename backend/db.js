const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'notes.db'), (err) => {
  if (err) console.error('DB connection error:', err.message);
  else console.log('✅ Connected to SQLite database');
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Helper: run query (INSERT, UPDATE, DELETE)
db.exec_run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
    });
  });
};

// Helper: get one row
db.exec_get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Helper: get all rows
db.exec_all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize tables
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
      deleted_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS otps (
      id         INTEGER  PRIMARY KEY AUTOINCREMENT,
      target     TEXT     NOT NULL,
      code       TEXT     NOT NULL,
      expires_at INTEGER  NOT NULL,
      used       INTEGER  DEFAULT 0
    )`,
  ];

  for (const q of queries) {
    await db.exec_run(q);
  }

  // Migrate existing notes table if needed
  const cols = await db.exec_all('PRAGMA table_info(notes)');
  const colNames = cols.map(c => c.name);
  if (!colNames.includes('tags'))       await db.exec_run("ALTER TABLE notes ADD COLUMN tags TEXT DEFAULT ''");
  if (!colNames.includes('deleted_at')) await db.exec_run('ALTER TABLE notes ADD COLUMN deleted_at DATETIME DEFAULT NULL');
  if (!colNames.includes('user_id'))    await db.exec_run('ALTER TABLE notes ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0');

  console.log('✅ DB ready (notes per user)');
};

initDb().catch(console.error);

module.exports = db;