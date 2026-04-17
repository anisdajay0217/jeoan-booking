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

// FIX: Since index.js is ALREADY in src, we serve the current directory (.)
// This prevents the "src/src/" error.
app.use(express.static(__dirname));

// ─── Health & Root ───────────────────────────────────────────
app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/', (req, res) => {
  // FIX: index.html is in the same folder as this index.js
  res.sendFile(path.join(__dirname, 'index.html'));
});

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

// ─── ADMIN & CLIENT BOOKING ENDPOINTS ────────────────────────
// (Add your existing booking GET/POST/PATCH routes here)

// ─── Start ────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🎀 Jeoan API running on port ${PORT}`);
  });
});
