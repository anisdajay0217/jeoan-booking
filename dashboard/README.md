# 🎀 Jeoan Gwyneth — Booking System

A booking system for Jeoan Gwyneth, built with TypeScript + Express + SQLite.

## Project Structure

```
jeoan-booking/
├── src/
│   └── server.ts          ← TypeScript backend (Express + SQLite)
├── public/
│   ├── client.html        ← Client booking page
│   └── admin.html         ← Admin dashboard (access via /admin.html)
├── package.json
├── tsconfig.json
├── railway.toml
└── .gitignore
```

## URLs after deployment

| Page | URL |
|------|-----|
| Client booking | `https://your-app.up.railway.app/` |
| Admin dashboard | `https://your-app.up.railway.app/admin.html` |

---

## Deploy to Railway

### Step 1 — Push to GitHub

1. Create a new GitHub repo (e.g. `jeoan-booking`)
2. Push all files to the `main` branch

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/jeoan-booking.git
git push -u origin main
```

### Step 2 — Create Railway project

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your `jeoan-booking` repo
3. Railway will auto-detect and build it

### Step 3 — Set Environment Variables in Railway

Go to your service → **Variables** tab and add:

| Variable | Value | Notes |
|----------|-------|-------|
| `ADMIN_PASSWORD` | `your_secure_password` | Your admin login password |
| `JWT_SECRET` | `some_long_random_string` | Any random 32+ char string |

> **Optional:** If you want to use a hashed password instead of plain text, set `ADMIN_PASSWORD_HASH` with a bcrypt hash and leave `ADMIN_PASSWORD` unset.

### Step 4 — Add a Public Domain

In Railway → your service → **Settings** → **Networking** → **Generate Domain**

That's it! 🎉

---

## Local Development

```bash
npm install
npm run dev
```

Server runs at `http://localhost:3000`

---

## Notes

- The SQLite database (`jeoan.db`) is created automatically on first run.
- Railway's filesystem is **ephemeral** — data resets on redeploy. For persistent storage, upgrade to Railway's Volume feature or switch to PostgreSQL.
- To add a persistent volume in Railway: service → **Volumes** → mount at `/app` and set `DB_PATH=/app/jeoan.db` in environment variables.
