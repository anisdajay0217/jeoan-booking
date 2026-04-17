# 🎀 Jeoan Gwyneth — Booking System

A booking system for Jeoan Gwyneth, built with **TypeScript + Express + SQLite**.

---

## Project Structure

```
jeoan-booking/
├── src/
│   └── server.ts            ← TypeScript backend (Express + SQLite)
├── public/
│   ├── styles.css           ← Shared CSS (colours, animations, modals, buttons)
│   ├── login.html           ← Page 1 — Client login
│   ├── welcome.html         ← Page 2 — Welcome screen after login
│   ├── booking.html         ← Page 3 — Booking form (Submit + Cancel buttons)
│   ├── thankyou.html        ← Page 4 — Booking confirmed + GCash upload
│   └── admin.html           ← Admin dashboard (access via /admin.html)
├── package.json
├── tsconfig.json
├── railway.toml
└── .gitignore
```

### Why are the HTML files split up?

Each page has its own `.html` file so they are short and easy to read and edit individually:

| File | What it does |
|------|-------------|
| `styles.css` | All shared CSS variables, animations, modal styles, button styles |
| `login.html` | Login form + login JS logic |
| `welcome.html` | Greeting card + auth guard |
| `booking.html` | Full booking form, rate/package picker, terms, **Submit + Cancel buttons** |
| `thankyou.html` | Booking summary, GCash QR/number, screenshot upload |
| `admin.html` | Jeoan's admin dashboard |

Pages navigate to each other via `window.location.href`. Session data (token, display name, booking object) is passed through `sessionStorage`.

---

## New Features (vs. original single-file version)

### ✅ Cancel Button (on Booking Form)

`booking.html` now has **two action buttons** at the bottom of the form:

```
[ 🎀  Submit Booking ]   ← sends all form data to Jeoan (disabled until T&C ticked)
[    ✕  Cancel         ]   ← shows a confirm modal, then returns to welcome.html
```

- The **Submit** button collects all encoded form data and POSTs it to `/client/bookings`.
- The **Cancel** button opens a confirmation modal ("Keep Editing" / "Yes, Cancel"). If confirmed, it navigates back to `welcome.html` without submitting anything.

---

## URLs after deployment

| Page | URL |
|------|-----|
| Client login | `https://your-app.up.railway.app/login.html` |
| Client booking | `https://your-app.up.railway.app/booking.html` |
| Admin dashboard | `https://your-app.up.railway.app/admin.html` |

> **Tip:** Set your server to redirect `/` → `/login.html` so clients land on the login page by default.

---

## Deploy to Railway

### Step 1 — Push to GitHub

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

### Step 3 — Set Environment Variables

In Railway → your service → **Variables** tab:

| Variable | Value | Notes |
|----------|-------|-------|
| `ADMIN_PASSWORD` | `your_secure_password` | Admin login password |
| `JWT_SECRET` | `some_long_random_string` | Any random 32+ character string |

> **Optional:** Use `ADMIN_PASSWORD_HASH` with a bcrypt hash instead of plain text.

### Step 4 — Add a Public Domain

Railway → your service → **Settings** → **Networking** → **Generate Domain**

Done! 🎉

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
- Railway's filesystem is **ephemeral** — data resets on redeploy. For persistent storage, use Railway's Volume feature or switch to PostgreSQL.
- To add a persistent volume: service → **Volumes** → mount at `/app`, then set `DB_PATH=/app/jeoan.db` in environment variables.
- Session data between pages uses `sessionStorage` (cleared when the browser tab is closed).
