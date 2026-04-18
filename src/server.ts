import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JB_SECRET || 'JeoanChuchu';
const ADMIN_PASSWORD_PLAIN = process.env.ADMIN_PASSWORD || 'JeoanChuchu';

// ─── DATABASE (Postgres) ──────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL,
  ssl: process.env.DATABASE_PUBLIC_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id BIGINT PRIMARY KEY,
      client_username TEXT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      perf_time TEXT NOT NULL,
      occasion TEXT NOT NULL,
      venue TEXT NOT NULL,
      rate_type TEXT NOT NULL,
      package TEXT NOT NULL,
      notes TEXT DEFAULT '',
      gcash_screenshot TEXT DEFAULT NULL,
      status TEXT DEFAULT 'pending',
      admin_note TEXT DEFAULT '',
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ Database tables ready');
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface JwtPayload {
  role: 'admin' | 'client';
  username?: string;
}

interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ─── APP ──────────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as JwtPayload;
    if (payload.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    req.user = payload;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

function requireClient(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as JwtPayload;
    if (payload.role !== 'client') { res.status(403).json({ error: 'Forbidden' }); return; }
    req.user = payload;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

function mapBooking(row: Record<string, unknown>) {
  return {
    id: row.id,
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
    status: row.status,
    adminNote: row.admin_note,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

app.post('/admin/login', async (req: Request, res: Response) => {
  const { password } = req.body as { password: string };
  if (!password) { res.status(400).json({ error: 'Password required' }); return; }
  const valid = password === ADMIN_PASSWORD_PLAIN;
  if (!valid) { res.status(401).json({ error: 'Incorrect password' }); return; }
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

app.get('/admin/bookings', requireAdmin, async (_req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM bookings ORDER BY id DESC');
  res.json(result.rows.map(mapBooking));
});

app.patch('/admin/bookings/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, adminNote } = req.body as { status?: string; adminNote?: string };
  await pool.query(
    `UPDATE bookings SET
       status = COALESCE($1, status),
       admin_note = COALESCE($2, admin_note),
       updated_at = NOW()
     WHERE id = $3`,
    [status ?? null, adminNote ?? null, id]
  );
  res.json({ ok: true });
});

app.get('/admin/clients', requireAdmin, async (_req: Request, res: Response) => {
  const result = await pool.query('SELECT id, username, display_name, created_at FROM clients ORDER BY created_at DESC');
  res.json(result.rows);
});

app.post('/admin/clients', requireAdmin, async (req: Request, res: Response) => {
  const { username, password, displayName } = req.body as { username: string; password: string; displayName: string };
  if (!username || !password || !displayName) { res.status(400).json({ error: 'All fields are required' }); return; }
  if (password.length < 4) { res.status(400).json({ error: 'Password must be at least 4 characters' }); return; }
  const existing = await pool.query('SELECT id FROM clients WHERE username = $1', [username]);
  if (existing.rows.length > 0) { res.status(409).json({ error: 'Username already exists' }); return; }
  const hash = await bcrypt.hash(password, 10);
  await pool.query('INSERT INTO clients (username, password_hash, display_name) VALUES ($1, $2, $3)', [username, hash, displayName]);
  res.status(201).json({ ok: true });
});

app.patch('/admin/clients/:id/password', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { password } = req.body as { password: string };
  if (!password || password.length < 4) { res.status(400).json({ error: 'Password must be at least 4 characters' }); return; }
  const hash = await bcrypt.hash(password, 10);
  await pool.query('UPDATE clients SET password_hash = $1 WHERE id = $2', [hash, id]);
  res.json({ ok: true });
});

app.delete('/admin/clients/:id', requireAdmin, async (req: Request, res: Response) => {
  await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ─── CLIENT ROUTES ────────────────────────────────────────────────────────────

app.post('/client/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) { res.status(400).json({ error: 'Username and password required' }); return; }
  const result = await pool.query('SELECT * FROM clients WHERE username = $1', [username]);
  const client = result.rows[0];
  if (!client) { res.status(401).json({ error: 'Incorrect username or password' }); return; }
  const valid = await bcrypt.compare(password, client.password_hash);
  if (!valid) { res.status(401).json({ error: 'Incorrect username or password' }); return; }
  const token = jwt.sign({ role: 'client', username: client.username }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, displayName: client.display_name, username: client.username });
});

app.post('/client/bookings', requireClient, async (req: AuthRequest, res: Response) => {
  const { id, name, date, perfTime, occasion, venue, rateType, package: pkg, notes } = req.body as {
    id: number; name: string; date: string; perfTime: string; occasion: string;
    venue: string; rateType: string; package: string; notes?: string;
  };
  if (!name || !date || !perfTime || !occasion || !venue || !pkg) {
    res.status(400).json({ error: 'Missing required fields' }); return;
  }
  await pool.query(
    `INSERT INTO bookings (id, client_username, name, date, perf_time, occasion, venue, rate_type, package, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id ?? Date.now(), req.user?.username ?? null, name, date, perfTime, occasion, venue, rateType, pkg, notes ?? '']
  );
  res.status(201).json({ ok: true });
});

app.patch('/client/bookings/:id/screenshot', requireClient, async (req: Request, res: Response) => {
  const { gcashScreenshot } = req.body as { gcashScreenshot: string };
  if (!gcashScreenshot) { res.status(400).json({ error: 'Screenshot data required' }); return; }
  await pool.query(
    `UPDATE bookings SET gcash_screenshot = $1, status = 'pending', updated_at = NOW() WHERE id = $2`,
    [gcashScreenshot, req.params.id]
  );
  res.json({ ok: true });
});

// ── Get client's own bookings (non-declined) ────────────────────────────────
app.get('/client/bookings', requireClient, async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    `SELECT * FROM bookings WHERE client_username = $1 AND status != 'declined' ORDER BY submitted_at DESC`,
    [req.user?.username]
  );
  res.json(result.rows.map(mapBooking));
});

// ── Get client's rejected/declined bookings ─────────────────────────────────
app.get('/client/bookings/rejected', requireClient, async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    `SELECT * FROM bookings WHERE client_username = $1 AND status = 'declined' ORDER BY submitted_at DESC`,
    [req.user?.username]
  );
  res.json(result.rows.map(mapBooking));
});

// ── Resubmit a declined booking ─────────────────────────────────────────────
app.patch('/client/bookings/:id/resubmit', requireClient, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, date, perfTime, occasion, venue, rateType, package: pkg, notes, gcashScreenshot } = req.body as {
    name?: string; date?: string; perfTime?: string; occasion?: string; venue?: string;
    rateType?: string; package?: string; notes?: string; gcashScreenshot?: string;
  };
  const check = await pool.query(
    'SELECT id FROM bookings WHERE id = $1 AND client_username = $2 AND status = $3',
    [id, req.user?.username, 'declined']
  );
  if (check.rows.length === 0) {
    res.status(403).json({ error: 'Booking not found or not eligible for resubmission' }); return;
  }
  await pool.query(
    `UPDATE bookings SET
      name             = COALESCE($1,  name),
      date             = COALESCE($2,  date),
      perf_time        = COALESCE($3,  perf_time),
      occasion         = COALESCE($4,  occasion),
      venue            = COALESCE($5,  venue),
      rate_type        = COALESCE($6,  rate_type),
      package          = COALESCE($7,  package),
      notes            = COALESCE($8,  notes),
      gcash_screenshot = COALESCE($9,  gcash_screenshot),
      status           = 'pending',
      admin_note       = '',
      updated_at       = NOW()
    WHERE id = $10`,
    [name ?? null, date ?? null, perfTime ?? null, occasion ?? null, venue ?? null,
     rateType ?? null, pkg ?? null, notes ?? null, gcashScreenshot ?? null, id]
  );
  res.json({ ok: true });
});

// ─── CATCH-ALL — serve clientdashboard.html as default ───────────────────────
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/clientdashboard.html'));
});

// ─── START ────────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => console.log(`🎀 Jeoan Booking running on port ${PORT}`));
}).catch(err => {
  console.error('❌ Failed to init DB:', err);
  process.exit(1);
});
