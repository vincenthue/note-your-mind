const express    = require('express');
const cors       = require('cors');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const db         = require('./db');

const app  = express();
const PORT = 3000;

app.use(cors({
  origin: ['https://note-your-mind-vincenthue1.vercel.app', 'http://localhost:5174', 'http://localhost']
}));
app.use(express.json());

// ── Email transporter ─────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'vincenthws888@gmail.com',
    pass: 'fwnk haza vbgx znkj',
  },
});

async function sendOTPEmail(toEmail, code) {
  await transporter.sendMail({
    from: '"Note Your Mind 📝" <vincenthws888@gmail.com>',
    to: toEmail,
    subject: 'Your Note Your Mind Verification Code',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0C0A1E;border-radius:16px;color:#EDE9FE;">
        <h2 style="color:#A855F7;margin-bottom:8px;">Note Your Mind</h2>
        <p style="color:#C4BCFA;margin-bottom:24px;">Your verification code is:</p>
        <div style="background:#1a1050;border:1px solid rgba(99,102,241,0.4);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#A855F7;">${code}</span>
        </div>
        <p style="color:#6B7280;font-size:13px;">This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    `,
  });
  console.log(`📨 OTP sent to ${toEmail}: ${code}`);
}

// ── Helpers ───────────────────────────────────────
function hashPassword(password) {
  const salt = 'mynotes_salt_2026';
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/*
// ── Dev only ⚠️ DELETE BEFORE DEPLOYMENT ─────────
app.get('/api/dev/all', async (req, res) => {
  try {
    const users = await db.exec_all('SELECT id, username, email FROM users');
    const result = await Promise.all(users.map(async u => ({
      ...u,
      notes: await db.exec_all('SELECT id, title, created_at, updated_at, deleted_at FROM notes WHERE user_id = ?', [u.id])
    })));
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
*/

// ── Availability checks ───────────────────────────
app.post('/api/auth/check/username', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ success: false, message: 'Username required.' });
  const exists = await db.exec_get('SELECT id FROM users WHERE username = ?', [username]);
  if (exists) return res.status(409).json({ success: false, message: 'Username already taken.' });
  res.json({ success: true });
});

app.post('/api/auth/check/email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email required.' });
  const exists = await db.exec_get('SELECT id FROM users WHERE email = ?', [email]);
  if (exists) return res.status(409).json({ success: false, message: 'Email already registered.' });
  res.json({ success: true });
});

// ── Auth Routes ───────────────────────────────────
app.post('/api/auth/signup/email', async (req, res) => {
  try {
    const { email, username, password, confirmPassword } = req.body;
    if (!email || !username || !password || !confirmPassword)
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    if (password !== confirmPassword)
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    if (!email.includes('@'))
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    if (await db.exec_get('SELECT id FROM users WHERE username = ?', [username]))
      return res.status(409).json({ success: false, message: 'Username already taken.' });
    if (await db.exec_get('SELECT id FROM users WHERE email = ?', [email]))
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    const result = await db.exec_run('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', [username, hashPassword(password), email]);
    const user = await db.exec_get('SELECT id, username, email FROM users WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ success: true, data: user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    const user = await db.exec_get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user || hashPassword(password) !== user.password)
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    res.json({ success: true, data: { id: user.id, username: user.username, email: user.email } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/auth/forgot-password/send', async (req, res) => {
  try {
    const { target } = req.body;
    if (!target) return res.status(400).json({ success: false, message: 'Email is required.' });
    const user = await db.exec_get('SELECT id FROM users WHERE email = ?', [target]);
    if (!user) return res.status(404).json({ success: false, message: 'No account found with this email.' });
    const code    = generateOTP();
    const expires = Date.now() + 10 * 60 * 1000;
    await db.exec_run('UPDATE otps SET used = 1 WHERE target = ?', [target]);
    await db.exec_run('INSERT INTO otps (target, code, expires_at) VALUES (?, ?, ?)', [target, code, expires]);
    await sendOTPEmail(target, code);
    res.json({ success: true, message: 'Verification code sent to your email.' });
  } catch (err) {
    console.error('Email error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send email.' });
  }
});

app.post('/api/auth/forgot-password/verify', async (req, res) => {
  try {
    const { target, code, newPassword, confirmPassword } = req.body;
    if (!target || !code || !newPassword || !confirmPassword)
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    if (newPassword !== confirmPassword)
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    const otp = await db.exec_get('SELECT * FROM otps WHERE target = ? AND used = 0 ORDER BY id DESC LIMIT 1', [target]);
    if (!otp || Date.now() > otp.expires_at)
      return res.status(400).json({ success: false, message: 'OTP expired or not found.' });
    if (otp.code !== code)
      return res.status(400).json({ success: false, message: 'Incorrect OTP code.' });
    await db.exec_run('UPDATE users SET password = ? WHERE email = ?', [hashPassword(newPassword), target]);
    await db.exec_run('UPDATE otps SET used = 1 WHERE id = ?', [otp.id]);
    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── Notes Routes ──────────────────────────────────
app.get('/api/notes', async (req, res) => {
  try {
    const { q, tag, user_id } = req.query;
    if (!user_id) return res.status(400).json({ success: false, message: 'user_id required' });
    let sql = 'SELECT * FROM notes WHERE deleted_at IS NULL AND user_id = ?';
    const params = [user_id];
    if (q)   { sql += ' AND (title LIKE ? OR content LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    if (tag) { sql += " AND (',' || tags || ',' LIKE ?)"; params.push(`%,${tag},%`); }
    sql += ' ORDER BY updated_at DESC';
    res.json({ success: true, data: await db.exec_all(sql, params) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/notes/trash', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ success: false, message: 'user_id required' });
    res.json({ success: true, data: await db.exec_all('SELECT * FROM notes WHERE deleted_at IS NOT NULL AND user_id = ? ORDER BY deleted_at DESC', [user_id]) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/notes/tags', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ success: false, message: 'user_id required' });
    const rows = await db.exec_all("SELECT tags FROM notes WHERE deleted_at IS NULL AND user_id = ? AND tags != ''", [user_id]);
    const tagSet = new Set();
    rows.forEach(r => r.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => tagSet.add(t)));
    res.json({ success: true, data: [...tagSet].sort() });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/notes/:id', async (req, res) => {
  try {
    const note = await db.exec_get('SELECT * FROM notes WHERE id = ?', [req.params.id]);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
    res.json({ success: true, data: note });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/notes', async (req, res) => {
  try {
    const { title, content, tags, user_id } = req.body;
    if (!title)   return res.status(400).json({ success: false, message: 'Title is required' });
    if (!content || !content.trim()) return res.status(400).json({ success: false, message: 'Content is required' });
    if (!user_id) return res.status(400).json({ success: false, message: 'user_id required' });
    const r = await db.exec_run('INSERT INTO notes (user_id, title, content, tags) VALUES (?, ?, ?, ?)', [user_id, title, content, tags || '']);
    res.status(201).json({ success: true, data: await db.exec_get('SELECT * FROM notes WHERE id = ?', [r.lastInsertRowid]) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.put('/api/notes/:id', async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    if (!title)   return res.status(400).json({ success: false, message: 'Title is required' });
    if (!content || !content.trim()) return res.status(400).json({ success: false, message: 'Content is required' });
    const r = await db.exec_run('UPDATE notes SET title=?, content=?, tags=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL', [title, content, tags || '', req.params.id]);
    if (r.changes === 0) return res.status(404).json({ success: false, message: 'Note not found' });
    res.json({ success: true, data: await db.exec_get('SELECT * FROM notes WHERE id = ?', [req.params.id]) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    const r = await db.exec_run('UPDATE notes SET deleted_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL', [req.params.id]);
    if (r.changes === 0) return res.status(404).json({ success: false, message: 'Note not found' });
    res.json({ success: true, message: 'Note moved to trash' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.put('/api/notes/:id/restore', async (req, res) => {
  try {
    const r = await db.exec_run('UPDATE notes SET deleted_at=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?', [req.params.id]);
    if (r.changes === 0) return res.status(404).json({ success: false, message: 'Note not found' });
    res.json({ success: true, data: await db.exec_get('SELECT * FROM notes WHERE id = ?', [req.params.id]) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.delete('/api/notes/:id/permanent', async (req, res) => {
  try {
    const r = await db.exec_run('DELETE FROM notes WHERE id = ?', [req.params.id]);
    if (r.changes === 0) return res.status(404).json({ success: false, message: 'Note not found' });
    res.json({ success: true, message: 'Note permanently deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));