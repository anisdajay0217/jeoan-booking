require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'jeoan_secret_change_me';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'jeoan2025';

// ─── Database ────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_accounts (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id BIGINT PRIMARY KEY,
      client_username TEXT,
      name TEXT NOT NULL,
      date TEXT,
      perf_time TEXT,
      occasion TEXT,
      venue TEXT,
      rate_type TEXT,
      package TEXT,
      notes TEXT,
      gcash_screenshot TEXT,
      screenshot_at TIMESTAMPTZ,
      status TEXT DEFAULT 'pending',
      admin_note TEXT DEFAULT '',
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ
    )
  `);
  console.log('✅ Database tables ready');
}

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// ─── Auth Middleware ──────────────────────────────────────────
function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

function requireClient(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'client') return res.status(403).json({ error: 'Forbidden' });
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// ─── Health ───────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', app: 'Jeoan Booking API 🎀' }));

// ─── ADMIN AUTH ───────────────────────────────────────────────
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// ─── CLIENT AUTH ──────────────────────────────────────────────
app.post('/client/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const result = await pool.query('SELECT * FROM client_accounts WHERE LOWER(username)=LOWER($1)', [username]);
    const acct = result.rows[0];
    if (!acct) return res.status(401).json({ error: 'Account not found. Please contact Jeoan.' });
    const match = await bcrypt.compare(password, acct.password_hash);
    if (!match) return res.status(401).json({ error: 'Incorrect password.' });
    const token = jwt.sign({ role: 'client', username: acct.username, displayName: acct.display_name }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, displayName: acct.display_name, username: acct.username });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── ADMIN: Manage Client Accounts ───────────────────────────
app.get('/admin/clients', requireAdmin, async (req, res) => {
  const result = await pool.query('SELECT id, username, display_name, created_at FROM client_accounts ORDER BY created_at DESC');
  res.json(result.rows);
});

app.post('/admin/clients', requireAdmin, async (req, res) => {
  const { username, password, displayName } = req.body;
  if (!username || !password || !displayName) return res.status(400).json({ error: 'Missing fields' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO client_accounts (username, password_hash, display_name) VALUES ($1,$2,$3) RETURNING id, username, display_name, created_at',
      [username.trim().toLowerCase(), hash, displayName.trim()]
    );
    res.json(result.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Username already exists' });
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/admin/clients/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM client_accounts WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

app.patch('/admin/clients/:id/password', requireAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Missing password' });
  const hash = await bcrypt.hash(password, 10);
  await pool.query('UPDATE client_accounts SET password_hash=$1 WHERE id=$2', [hash, req.params.id]);
  res.json({ ok: true });
});

// ─── ADMIN: Bookings ─────────────────────────────────────────
app.get('/admin/bookings', requireAdmin, async (req, res) => {
  const result = await pool.query('SELECT * FROM bookings ORDER BY id DESC');
  res.json(result.rows.map(dbToBooking));
});

app.patch('/admin/bookings/:id', requireAdmin, async (req, res) => {
  const { status, adminNote } = req.body;
  const result = await pool.query(
    'UPDATE bookings SET status=$1, admin_note=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
    [status, adminNote || '', req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(dbToBooking(result.rows[0]));
});

// ─── CLIENT: Submit Booking ───────────────────────────────────
app.post('/client/bookings', requireClient, async (req, res) => {
  const b = req.body;
  try {
    await pool.query(
      `INSERT INTO bookings (id, client_username, name, date, perf_time, occasion, venue, rate_type, package, notes, status, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',NOW())`,
      [b.id, req.user.username, b.name, b.date, b.perfTime, b.occasion, b.venue, b.rateType, b.package, b.notes || '']
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── CLIENT: Upload GCash Screenshot ─────────────────────────
app.patch('/client/bookings/:id/screenshot', requireClient, async (req, res) => {
  const { gcashScreenshot } = req.body;
  await pool.query(
    'UPDATE bookings SET gcash_screenshot=$1, screenshot_at=NOW() WHERE id=$2 AND client_username=$3',
    [gcashScreenshot, req.params.id, req.user.username]
  );
  res.json({ ok: true });
});

// ─── CLIENT: Get own bookings ─────────────────────────────────
app.get('/client/bookings', requireClient, async (req, res) => {
  const result = await pool.query('SELECT * FROM bookings WHERE client_username=$1 ORDER BY id DESC', [req.user.username]);
  res.json(result.rows.map(dbToBooking));
});

// ─── Helpers ──────────────────────────────────────────────────
function dbToBooking(row) {
  return {
    id: Number(row.id),
    clientUsername: row.client_username,
    name: row.name,
    date: row.date,
    perfTime: row.perf_time,
    occasion: row.occasion,
    venue: row.venue,
    rateType: row.rate_type,
    package: row.package,
    notes: row.notes,
    gcashScreenshot: row.gcash_screenshot,
    screenshotAt: row.screenshot_at,
    status: row.status,
    adminNote: row.admin_note,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at
  };
}

// ─── Start ────────────────────────────────────────────────────
initDB()
  .then(() => {
    console.log("✅ DB connected");
  })
  .catch((e) => {
    console.error("⚠️ DB failed but server will still run:", e.message);
  });

app.listen(PORT, () => {
  console.log(`🎀 Jeoan API running on port ${PORT}`);
});
