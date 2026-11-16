import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { Resend } from 'resend';
import * as db from './db.js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const app  = express();

app.use(cors({
  origin: [
    'https://noteyourmind.com',
    'https://www.noteyourmind.com',
    'https://note-your-mind-vincenthue1.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
  ],
}));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'note-your-mind-api', database: db.configured }));

// Make sure tables exist before the first query (once per server / serverless instance)
app.use(async (req, res, next) => {
  try { await db.ready(); next(); } catch (e) {
    if (e.notConfigured)
      return res.status(503).json({ success: false, message: 'The database is not set up yet. Please try again later.' });
    next(e);
  }
});
app.use(express.json({ limit: '2mb' }));

// ── Email ─────────────────────────────────────────
async function sendOTPEmail(toEmail, code) {
  if (!resend) {
    console.log(`📨 [dev] RESEND_API_KEY not set — OTP for ${toEmail}: ${code}`);
    return;
  }
  await resend.emails.send({
    from: 'Note Your Mind <noreply@noteyourmind.com>',
    to: toEmail,
    subject: 'Your Note Your Mind verification code',
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0E0F12;border-radius:12px;color:#E6E7EA;">
        <h2 style="color:#E6E7EA;margin:0 0 8px;font-weight:600;">Note Your Mind</h2>
        <p style="color:#9A9CA5;margin:0 0 24px;">Your verification code is:</p>
        <div style="background:#16171C;border:1px solid #2A2C33;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:34px;font-weight:700;letter-spacing:10px;color:#8B93FF;">${code}</span>
        </div>
        <p style="color:#6B6E78;font-size:13px;margin:0;">This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>`,
  });
}

// ── Password hashing (scrypt, with legacy HMAC fallback) ──
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
function legacyHash(password) {
  return crypto.createHmac('sha256', 'mynotes_salt_2026').update(password).digest('hex');
}
function safeEqual(a, b) {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
function verifyPassword(password, stored) {
  if (stored.startsWith('scrypt$')) {
    const [, salt, hash] = stored.split('$');
    return safeEqual(crypto.scryptSync(password, salt, 64).toString('hex'), hash);
  }
  return safeEqual(legacyHash(password), stored);
}
function generateOTP() {
  return String(crypto.randomInt(100000, 1000000));
}

// ── Sessions ──────────────────────────────────────
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await db.run('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
    [sha256(token), userId, Date.now() + SESSION_TTL]);
  return token;
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Please sign in.' });
    const session = await db.get('SELECT * FROM sessions WHERE token_hash = ?', [sha256(token)]);
    if (!session || session.expires_at < Date.now())
      return res.status(401).json({ success: false, message: 'Session expired. Please sign in again.' });
    req.userId = session.user_id;
    req.tokenHash = session.token_hash;
    next();
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

const wrap = fn => (req, res) => fn(req, res).catch(e => {
  console.error(e);
  res.status(500).json({ success: false, message: 'Server error.' });
});

const STATUSES = ['todo', 'doing', 'done'];


// ── Availability checks ───────────────────────────
app.post('/api/auth/check/username', wrap(async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ success: false, message: 'Username required.' });
  const exists = await db.get('SELECT id FROM users WHERE username = ?', [username]);
  if (exists) return res.status(409).json({ success: false, message: 'Username already taken.' });
  res.json({ success: true });
}));

app.post('/api/auth/check/email', wrap(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email required.' });
  const exists = await db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (exists) return res.status(409).json({ success: false, message: 'Email already registered.' });
  res.json({ success: true });
}));

// ── Auth ──────────────────────────────────────────
app.post('/api/auth/signup/email', wrap(async (req, res) => {
  const { email, username, password, confirmPassword } = req.body;
  if (!email || !username || !password || !confirmPassword)
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  if (password !== confirmPassword)
    return res.status(400).json({ success: false, message: 'Passwords do not match.' });
  if (password.length < 6)
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  if (await db.get('SELECT id FROM users WHERE username = ?', [username]))
    return res.status(409).json({ success: false, message: 'Username already taken.' });
  if (await db.get('SELECT id FROM users WHERE email = ?', [email]))
    return res.status(409).json({ success: false, message: 'Email already registered.' });
  const r = await db.run('INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
    [username, hashPassword(password), email]);
  const user = await db.get('SELECT id, username, email FROM users WHERE id = ?', [r.lastInsertRowid]);
  const token = await createSession(user.id);
  res.status(201).json({ success: true, data: { ...user, token } });
}));

app.post('/api/auth/signin', wrap(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  const user = await db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
  if (!user || !verifyPassword(password, user.password))
    return res.status(401).json({ success: false, message: 'Invalid username or password.' });
  if (!user.password.startsWith('scrypt$'))
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashPassword(password), user.id]);
  const token = await createSession(user.id);
  res.json({ success: true, data: { id: user.id, username: user.username, email: user.email, token } });
}));

app.get('/api/auth/me', requireAuth, wrap(async (req, res) => {
  const user = await db.get('SELECT id, username, email FROM users WHERE id = ?', [req.userId]);
  if (!user) return res.status(401).json({ success: false, message: 'Account not found.' });
  res.json({ success: true, data: user });
}));

app.post('/api/auth/signout', requireAuth, wrap(async (req, res) => {
  await db.run('DELETE FROM sessions WHERE token_hash = ?', [req.tokenHash]);
  res.json({ success: true });
}));

app.post('/api/auth/forgot-password/send', wrap(async (req, res) => {
  const { target } = req.body;
  if (!target) return res.status(400).json({ success: false, message: 'Email is required.' });
  const user = await db.get('SELECT id FROM users WHERE email = ?', [target]);
  if (!user) return res.status(404).json({ success: false, message: 'No account found with this email.' });
  const code    = generateOTP();
  const expires = Date.now() + 10 * 60 * 1000;
  await db.run('UPDATE otps SET used = 1 WHERE target = ?', [target]);
  await db.run('INSERT INTO otps (target, code, expires_at) VALUES (?, ?, ?)', [target, code, expires]);
  try {
    await sendOTPEmail(target, code);
  } catch (err) {
    console.error('Email error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to send email.' });
  }
  res.json({ success: true, message: 'Verification code sent to your email.' });
}));

app.post('/api/auth/forgot-password/verify', wrap(async (req, res) => {
  const { target, code, newPassword, confirmPassword } = req.body;
  if (!target || !code || !newPassword || !confirmPassword)
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  if (newPassword !== confirmPassword)
    return res.status(400).json({ success: false, message: 'Passwords do not match.' });
  if (newPassword.length < 6)
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  const otp = await db.get('SELECT * FROM otps WHERE target = ? AND used = 0 ORDER BY id DESC LIMIT 1', [target]);
  if (!otp || Date.now() > otp.expires_at)
    return res.status(400).json({ success: false, message: 'Code expired or not found. Request a new one.' });
  if (otp.code !== String(code).trim()) {
    const attempts = otp.attempts + 1;
    await db.run('UPDATE otps SET attempts = ?, used = ? WHERE id = ?', [attempts, attempts >= 5 ? 1 : 0, otp.id]);
    return res.status(400).json({ success: false, message: attempts >= 5 ? 'Too many attempts. Request a new code.' : 'Incorrect code.' });
  }
  const user = await db.get('SELECT id FROM users WHERE email = ?', [target]);
  await db.run('UPDATE users SET password = ? WHERE email = ?', [hashPassword(newPassword), target]);
  await db.run('UPDATE otps SET used = 1 WHERE id = ?', [otp.id]);
  if (user) await db.run('DELETE FROM sessions WHERE user_id = ?', [user.id]);
  res.json({ success: true, message: 'Password reset successfully.' });
}));

// ── Notes (all scoped to the signed-in user) ─────
app.use('/api/notes', requireAuth);

const getOwnNote = (id, userId) =>
  db.get('SELECT * FROM notes WHERE id = ? AND user_id = ?', [id, userId]);

app.get('/api/notes', wrap(async (req, res) => {
  const { q, tag } = req.query;
  let sql = 'SELECT * FROM notes WHERE deleted_at IS NULL AND user_id = ?';
  const params = [req.userId];
  if (q)   { sql += ' AND (title LIKE ? OR content LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  if (tag) { sql += " AND (',' || tags || ',' LIKE ?)"; params.push(`%,${tag},%`); }
  sql += ' ORDER BY updated_at DESC';
  res.json({ success: true, data: await db.all(sql, params) });
}));

app.get('/api/notes/trash', wrap(async (req, res) => {
  res.json({ success: true, data: await db.all(
    'SELECT * FROM notes WHERE deleted_at IS NOT NULL AND user_id = ? ORDER BY deleted_at DESC', [req.userId]) });
}));

app.get('/api/notes/tags', wrap(async (req, res) => {
  const rows = await db.all("SELECT tags FROM notes WHERE deleted_at IS NULL AND user_id = ? AND tags != ''", [req.userId]);
  const tagSet = new Set();
  rows.forEach(r => r.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => tagSet.add(t)));
  res.json({ success: true, data: [...tagSet].sort() });
}));

app.get('/api/notes/:id', wrap(async (req, res) => {
  const note = await getOwnNote(req.params.id, req.userId);
  if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
  res.json({ success: true, data: note });
}));

app.post('/api/notes', wrap(async (req, res) => {
  const { title, content, tags } = req.body;
  const status = STATUSES.includes(req.body.status) ? req.body.status : 'todo';
  if (!title || !String(title).trim()) return res.status(400).json({ success: false, message: 'Title is required' });
  const top = await db.get(
    'SELECT MIN(position) p FROM notes WHERE user_id = ? AND status = ? AND deleted_at IS NULL', [req.userId, status]);
  const position = typeof req.body.position === 'number' ? req.body.position : (top?.p ?? 1) - 1;
  const r = await db.run(
    'INSERT INTO notes (user_id, title, content, tags, status, position) VALUES (?, ?, ?, ?, ?, ?)',
    [req.userId, String(title).trim(), content || '', tags || '', status, position]);
  res.status(201).json({ success: true, data: await getOwnNote(r.lastInsertRowid, req.userId) });
}));

app.put('/api/notes/:id', wrap(async (req, res) => {
  const note = await getOwnNote(req.params.id, req.userId);
  if (!note || note.deleted_at) return res.status(404).json({ success: false, message: 'Note not found' });
  const title   = req.body.title !== undefined ? String(req.body.title).trim() : note.title;
  if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
  const content = req.body.content !== undefined ? req.body.content : note.content;
  const tags    = req.body.tags    !== undefined ? req.body.tags    : note.tags;
  const status  = STATUSES.includes(req.body.status) ? req.body.status : note.status;
  await db.run(
    'UPDATE notes SET title=?, content=?, tags=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?',
    [title, content, tags, status, note.id, req.userId]);
  res.json({ success: true, data: await getOwnNote(note.id, req.userId) });
}));

// Move a card on the board (status + order). Doesn't bump updated_at.
app.patch('/api/notes/:id/move', wrap(async (req, res) => {
  const { status, position } = req.body;
  if (!STATUSES.includes(status) || typeof position !== 'number')
    return res.status(400).json({ success: false, message: 'Invalid status or position' });
  const r = await db.run('UPDATE notes SET status=?, position=? WHERE id=? AND user_id=? AND deleted_at IS NULL',
    [status, position, req.params.id, req.userId]);
  if (r.changes === 0) return res.status(404).json({ success: false, message: 'Note not found' });
  res.json({ success: true, data: await getOwnNote(req.params.id, req.userId) });
}));

app.delete('/api/notes/:id', wrap(async (req, res) => {
  const r = await db.run('UPDATE notes SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=? AND deleted_at IS NULL',
    [req.params.id, req.userId]);
  if (r.changes === 0) return res.status(404).json({ success: false, message: 'Note not found' });
  res.json({ success: true, message: 'Note moved to trash' });
}));

app.put('/api/notes/:id/restore', wrap(async (req, res) => {
  const r = await db.run('UPDATE notes SET deleted_at=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?',
    [req.params.id, req.userId]);
  if (r.changes === 0) return res.status(404).json({ success: false, message: 'Note not found' });
  res.json({ success: true, data: await getOwnNote(req.params.id, req.userId) });
}));

app.delete('/api/notes/:id/permanent', wrap(async (req, res) => {
  const r = await db.run('DELETE FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (r.changes === 0) return res.status(404).json({ success: false, message: 'Note not found' });
  res.json({ success: true, message: 'Note permanently deleted' });
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Server error.' });
});

export default app;
