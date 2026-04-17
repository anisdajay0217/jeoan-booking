require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Update to match your Railway Variable name "JB_SECRET"
const JB_SECRET = process.env.JB_SECRET || 'JeoanChuchu';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'JeoanChuchu';

// ─── Database ────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL,
  ssl: { rejectUnauthorized: false } 
});

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve all files inside the 'src' folder
app.use(express.static(__dirname));

// ─── Health Check ─────────────────────────────────────────────
app.get('/health', (req, res) => res.status(200).send('OK'));

// ─── ROOT ROUTE ───────────────────────────────────────────────
app.get('/', (req, res) => {
  // Use index.html because you renamed Client.html
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── ADMIN ROUTE ──────────────────────────────────────────────
app.get('/admin', (req, res) => {
  // Ensure the filename in GitHub is exactly "Admin.html"
  res.sendFile(path.join(__dirname, 'Admin.html'));
});

// ─── AUTH LOGIC ──────────────────────────────────────────────
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  // Use JB_SECRET here
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
    
    // Use JB_SECRET here
    const token = jwt.sign({ role: 'client', username: acct.username }, JB_SECRET, { expiresIn: '8h' });
    res.json({ token, displayName: acct.display_name, username: acct.username });
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🎀 Server running at port ${PORT}`);
});
