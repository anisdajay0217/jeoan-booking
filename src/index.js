require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'jeoan_secret_change_me';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'jeoan2025';

// ─── Database ────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL,
  ssl: process.env.DATABASE_PUBLIC_URL ? { rejectUnauthorized: false } : false
});

async function initDB() {
  try {
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
  } catch (err) {
    console.error('⚠️ DB Init Error:', err.message);
  }
}

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// IMPORTANT: Since index.js is in /src, we serve this folder
app.use(express.static(__dirname));

// ─── Health & Root ───────────────────────────────────────────
// Railway uses this to see if the app is "Alive"
app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Auth Middleware ──────────────────────────────────────────
function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.user = payload;
    next();
  } catch { res.status(401).json({ error: 'Unauthorized' }); }
}

function requireClient(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'client') return res.status(403).json({ error: 'Forbidden' });
    req.user = payload;
    next();
  } catch { res.status(401).json({ error: 'Unauthorized' }); }
}

// ─── 1. ADMIN LOGIN ───────────────────────────────────────────
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// ─── 2. CLIENT LOGIN ──────────────────────────────────────────
app.post('/client/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const result = await pool.query('SELECT * FROM client_accounts WHERE LOWER(username)=LOWER($1)', [username]);
    const acct = result.rows[0];
    if (!acct) return res.status(401).json({ error: 'Account not found.' });
    
    const match = await bcrypt.compare(password, acct.password_hash);
    if (!match) return res.status(401).json({ error: 'Incorrect password.' });
    
    const token = jwt.sign(
      { role: 'client', username: acct.username, displayName: acct.display_name }, 
      JWT_SECRET, 
      { expiresIn: '8h' }
    );
    res.json({ token, displayName: acct.display_name, username: acct.username });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Admin & Client Endpoints (Keep your existing DB routes here) ───
// [Rest of your bookings/clients logic...]

// ─── Helpers ──────────────────────────────────────────────────
function dbToBooking(row) {
  return {
    id: Number(row.id),
    clientUsername: row.client_username,
    name: row.name,
    date: row.date,
    status: row.status
    // ... add other fields as needed
  };
}

// ─── Start ────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🎀 Jeoan API running on port ${PORT}`);
  });
});
