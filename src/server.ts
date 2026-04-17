import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'jeoan-secret-change-me';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const ADMIN_PASSWORD_PLAIN = process.env.ADMIN_PASSWORD || 'admin1234';

// ─── DATABASE ────────────────────────────────────────────────────────────────
const db = new Database(process.env.DB_PATH || './jeoan.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY,
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
    submitted_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface JwtPayload {
  role: 'admin' | 'client';
  username?: string;
}

interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ─── APP ─────────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // GCash screenshots can be large
app.use(express.static(path.join(__dirname, '../public')));

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as JwtPayload;
    if (payload.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireClient(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as JwtPayload;
    if (payload.role !== 'client') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
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

// ─── ADMIN ROUTES ────────────────────────────────────────────────────────────

// POST /admin/login
app.post('/admin/login', async (req: Request, res: Response) => {
  const { password } = req.body as { password: string };
  if (!password) {
    res.status(400).json({ error: 'Password required' });
    return;
  }

  let valid = false;
  if (ADMIN_PASSWORD_HASH) {
    valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  } else {
    valid = password === ADMIN_PASSWORD_PLAIN;
  }

  if (!valid) {
    res.status(401).json({ error: 'Incorrect password' });
    return;
  }

  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

// GET /admin/bookings
app.get('/admin/bookings', requireAdmin, (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM bookings ORDER BY id DESC').all() as Record<string, unknown>[];
  res.json(rows.map(mapBooking));
});

// PATCH /admin/bookings/:id
app.patch('/admin/bookings/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, adminNote } = req.body as { status?: string; adminNote?: string };

  const existing = db.prepare('SELECT id FROM bookings WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  db.prepare(`
    UPDATE bookings
    SET status = COALESCE(?, status),
        admin_note = COALESCE(?, admin_note),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(status ?? null, adminNote ?? null, id);

  res.json({ ok: true });
});

// GET /admin/clients
app.get('/admin/clients', requireAdmin, (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT id, username, display_name, created_at FROM clients ORDER BY created_at DESC').all();
  res.json(rows);
});

// POST /admin/clients
app.post('/admin/clients', requireAdmin, async (req: Request, res: Response) => {
  const { username, password, displayName } = req.body as {
    username: string;
    password: string;
    displayName: string;
  };

  if (!username || !password || !displayName) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }
  if (password.length < 4) {
    res.status(400).json({ error: 'Password must be at least 4 characters' });
    return;
  }

  const existing = db.prepare('SELECT id FROM clients WHERE username = ?').get(username);
  if (existing) {
    res.status(409).json({ error: 'Username already exists' });
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  db.prepare('INSERT INTO clients (username, password_hash, display_name) VALUES (?, ?, ?)').run(username, hash, displayName);
  res.status(201).json({ ok: true });
});

// PATCH /admin/clients/:id/password
app.patch('/admin/clients/:id/password', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { password } = req.body as { password: string };

  if (!password || password.length < 4) {
    res.status(400).json({ error: 'Password must be at least 4 characters' });
    return;
  }

  const existing = db.prepare('SELECT id FROM clients WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  db.prepare('UPDATE clients SET password_hash = ? WHERE id = ?').run(hash, id);
  res.json({ ok: true });
});

// DELETE /admin/clients/:id
app.delete('/admin/clients/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ─── CLIENT ROUTES ───────────────────────────────────────────────────────────

// POST /client/login
app.post('/client/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const client = db.prepare('SELECT * FROM clients WHERE username = ?').get(username) as
    | { id: number; username: string; password_hash: string; display_name: string }
    | undefined;

  if (!client) {
    res.status(401).json({ error: 'Incorrect username or password' });
    return;
  }

  const valid = await bcrypt.compare(password, client.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Incorrect username or password' });
    return;
  }

  const token = jwt.sign({ role: 'client', username: client.username }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, displayName: client.display_name, username: client.username });
});

// POST /client/bookings
app.post('/client/bookings', requireClient, (req: AuthRequest, res: Response) => {
  const {
    id, name, date, perfTime, occasion, venue, rateType, package: pkg, notes,
  } = req.body as {
    id: number;
    name: string;
    date: string;
    perfTime: string;
    occasion: string;
    venue: string;
    rateType: string;
    package: string;
    notes?: string;
  };

  if (!name || !date || !perfTime || !occasion || !venue || !pkg) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  db.prepare(`
    INSERT INTO bookings (id, client_username, name, date, perf_time, occasion, venue, rate_type, package, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id ?? Date.now(), req.user?.username ?? null, name, date, perfTime, occasion, venue, rateType, pkg, notes ?? '');

  res.status(201).json({ ok: true });
});

// PATCH /client/bookings/:id/screenshot
app.patch('/client/bookings/:id/screenshot', requireClient, (req: Request, res: Response) => {
  const { id } = req.params;
  const { gcashScreenshot } = req.body as { gcashScreenshot: string };

  if (!gcashScreenshot) {
    res.status(400).json({ error: 'Screenshot data required' });
    return;
  }

  db.prepare(`
    UPDATE bookings
    SET gcash_screenshot = ?, status = 'pending', updated_at = datetime('now')
    WHERE id = ?
  `).run(gcashScreenshot, id);

  res.json({ ok: true });
});

// ─── CATCH-ALL: serve frontend ────────────────────────────────────────────────
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/client.html'));
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🎀 Jeoan Booking server running on port ${PORT}`);
});
