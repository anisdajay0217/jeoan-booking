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

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// FIX: Serve files from the current directory (src)
app.use(express.static(__dirname));

// ─── Health Check (Railway needs this!) ──────────────────────
app.get('/health', (req, res) => res.status(200).send('OK'));

// ─── ROOT ROUTE ───
app.get('/', (req, res) => {
  // Now that it's renamed to index.html, this will load automatically
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── ADMIN ROUTE ───
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'Admin.html'));
});

// ─── AUTH LOGIC ──────────────────────────────────────────────
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

app.post('/client/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const result = await pool.query('SELECT * FROM client_accounts WHERE LOWER(username)=LOWER($1)', [username]);
    const acct = result.rows[0];
    if (!acct) return res.status(401).json({ error: 'Account not found.' });
    const match = await bcrypt.compare(password, acct.password_hash);
    if (!match) return res.status(401).json({ error: 'Incorrect password.' });
    const token = jwt.sign({ role: 'client', username: acct.username, displayName: acct.display_name }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, displayName: acct.display_name, username: acct.username });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// [Insert your other booking routes here...]

app.listen(PORT, () => {
  console.log(`🎀 Jeoan Booking System Live on port ${PORT}`);
});
