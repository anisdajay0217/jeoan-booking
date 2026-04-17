require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Use the exact variable name you have in Railway
const JWT_SECRET = process.env.JB_SECRET || 'JeoanChuchu';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'JeoanChuchu';

// ─── Database ────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL,
  ssl: { rejectUnauthorized: false } // Required for Railway Postgres
});

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serving the 'src' folder where index.js and index.html live
app.use(express.static(__dirname));

// ─── Health Check ─────────────────────────────────────────────
app.get('/health', (req, res) => res.status(200).send('OK'));

// ─── Routes ───────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'Admin.html'));
});

// ─── Auth ─────────────────────────────────────────────────────
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  const token = jwt.sign({ role: 'admin' }, JB_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

app.post('/client/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM client_accounts WHERE LOWER(username)=LOWER($1)', [username]);
    const acct = result.rows[0];
    if (!acct) return res.status(401).json({ error: 'Account not found.' });
    const match = await bcrypt.compare(password, acct.password_hash);
    if (!match) return res.status(401).json({ error: 'Incorrect password.' });
    const token = jwt.sign({ role: 'client', username: acct.username }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, displayName: acct.display_name, username: acct.username });
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🎀 Server started on port ${PORT}`);
});
