// ══════════════════════════════════════════════════════════
// admin.ts — Jeoan Admin Panel · Admin-Side TypeScript
// ══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const API_BASE = 'https://YOUR-RAILWAY-APP.up.railway.app';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface Booking {
  id: number;
  name: string;
  date: string;
  perfTime: string;
  occasion: string;
  venue: string;
  rateType: string;
  package: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'declined';
  gcashScreenshot?: string;
  adminNote?: string;
  clientUsername?: string;
  submittedAt?: string;
  updatedAt?: string;
}

interface Client {
  id: number;
  username: string;
  display_name: string;
  created_at: string;
}

interface AdminLoginResponse {
  token?: string;
  error?: string;
}

interface ApiError {
  error?: string;
}

type StatusClass = 'confirmed' | 'declined' | 'no-ss' | 'pending';

// ─────────────────────────────────────────────
// AUTH STATE
// ─────────────────────────────────────────────
let adminToken: string | null = sessionStorage.getItem('admin_token');
let isLoggedIn = false;

// ─────────────────────────────────────────────
// INIT — LOGIN PETALS
// ─────────────────────────────────────────────
(function spawnLoginPetals(): void {
  const pc = document.getElementById('loginPetals') as HTMLElement;
  ['🌸','🌸','🌷','🌸','🌺','🌸','🌷'].forEach(p => {
    const count = p === '🌸' ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'petal';
      el.textContent = p;
      el.style.left = `${Math.random() * 100}%`;
      el.style.setProperty('--sz', `${13 + Math.random() * 12}px`);
      el.style.setProperty('--dur', `${5 + Math.random() * 6}s`);
      el.style.setProperty('--del', `${Math.random() * 8}s`);
      pc.appendChild(el);
    }
  });
})();

// ─────────────────────────────────────────────
// ADMIN AUTH
// ─────────────────────────────────────────────
async function doLogin(): Promise<void> {
  const pw = (document.getElementById('passwordInput') as HTMLInputElement).value;
  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    const data: AdminLoginResponse = await res.json();
    if (!res.ok) {
      (document.getElementById('loginError') as HTMLElement).classList.add('show');
      (document.getElementById('passwordInput') as HTMLInputElement).value = '';
      (document.getElementById('passwordInput') as HTMLInputElement).focus();
      return;
    }
    adminToken = data.token!;
    sessionStorage.setItem('admin_token', adminToken);
    isLoggedIn = true;
    (document.getElementById('loginPage') as HTMLElement).style.display = 'none';
    (document.getElementById('dashboardPage') as HTMLElement).classList.add('show');
    loadDashboard();
  } catch {
    const errEl = document.getElementById('loginError') as HTMLElement;
    errEl.textContent = 'Cannot connect to server.';
    errEl.classList.add('show');
  }
}

function doLogout(): void {
  isLoggedIn = false;
  adminToken = null;
  sessionStorage.removeItem('admin_token');
  (document.getElementById('dashboardPage') as HTMLElement).classList.remove('show');
  const lp = document.getElementById('loginPage') as HTMLElement;
  lp.style.display = 'flex';
  (document.getElementById('passwordInput') as HTMLInputElement).value = '';
  const errEl = document.getElementById('loginError') as HTMLElement;
  errEl.classList.remove('show');
  errEl.textContent = 'Incorrect password. Please try again.';
}

(document.getElementById('passwordInput') as HTMLInputElement)
  .addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') doLogin();
  });

// ─────────────────────────────────────────────
// MAIN TAB SWITCH
// ─────────────────────────────────────────────
function switchMainTab(tab: 'bookings' | 'clients'): void {
  (document.getElementById('tabBookings') as HTMLElement).classList.toggle('active', tab === 'bookings');
  (document.getElementById('tabClients') as HTMLElement).classList.toggle('active', tab === 'clients');
  (document.getElementById('bookingsTab') as HTMLElement).style.display = tab === 'bookings' ? 'flex' : 'none';
  (document.getElementById('clientsTab') as HTMLElement).classList.toggle('show', tab === 'clients');
  if (tab === 'clients') loadClients();
}

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────
let currentFilter = 'all';
let openCardId: number | null = null;

function loadDashboard(): void {
  updateStats();
  renderBookings();
  setInterval(() => { if (isLoggedIn) { updateStats(); renderBookings(); } }, 10000);
}

async function fetchBookings(): Promise<Booking[]> {
  try {
    const res = await fetch(`${API_BASE}/admin/bookings`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

async function updateStats(): Promise<Booking[]> {
  const all = await fetchBookings();
  const noSS      = all.filter(b => !b.gcashScreenshot && b.status === 'pending').length;
  const pending   = all.filter(b => b.status === 'pending' && b.gcashScreenshot).length;
  const confirmed = all.filter(b => b.status === 'confirmed').length;
  const declined  = all.filter(b => b.status === 'declined').length;
  (document.getElementById('statTotal') as HTMLElement).textContent     = String(all.length);
  (document.getElementById('statNoSS') as HTMLElement).textContent      = String(noSS);
  (document.getElementById('statPending') as HTMLElement).textContent   = String(pending);
  (document.getElementById('statConfirmed') as HTMLElement).textContent = String(confirmed);
  (document.getElementById('statDeclined') as HTMLElement).textContent  = String(declined);
  return all;
}

async function renderBookings(): Promise<void> {
  let all = await fetchBookings();

  all.sort((a, b) => {
    const order = (sc: StatusClass): number =>
      sc === 'no-ss' ? 0 : sc === 'pending' ? 1 : sc === 'confirmed' ? 2 : 3;
    const oa = order(getStatusClass(a)), ob = order(getStatusClass(b));
    if (oa !== ob) return oa - ob;
    return b.id - a.id;
  });

  if (currentFilter !== 'all') {
    all = all.filter(b => {
      if (currentFilter === 'no-ss')     return getStatusClass(b) === 'no-ss';
      if (currentFilter === 'pending')   return getStatusClass(b) === 'pending';
      if (currentFilter === 'confirmed') return b.status === 'confirmed';
      if (currentFilter === 'declined')  return b.status === 'declined';
      return true;
    });
  }

  const area = document.getElementById('bookingsArea') as HTMLElement;
  if (all.length === 0) {
    area.innerHTML = '<div class="empty-state"><span class="ei">🌸</span><p>No bookings in this category yet.</p></div>';
    return;
  }
  area.innerHTML = all.map(b => buildCardHTML(b)).join('');

  if (openCardId !== null) {
    const body = document.getElementById(`body-${openCardId}`);
    const chev = document.getElementById(`chev-${openCardId}`);
    if (body) body.classList.add('open');
    if (chev) chev.classList.add('open');
  }
}

// ─────────────────────────────────────────────
// STATUS HELPERS
// ─────────────────────────────────────────────
function getStatusClass(booking: Booking): StatusClass {
  if (booking.status === 'confirmed') return 'confirmed';
  if (booking.status === 'declined')  return 'declined';
  if (!booking.gcashScreenshot)       return 'no-ss';
  return 'pending';
}

function getStatusLabel(booking: Booking): string {
  if (booking.status === 'confirmed') return '✅ Confirmed';
  if (booking.status === 'declined')  return '❌ Declined';
  if (!booking.gcashScreenshot)       return '⚠️ No Screenshot';
  return '⏳ Pending';
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  );
}

function setFilter(filter: string, el: HTMLElement): void {
  currentFilter = filter;
  document.querySelectorAll<HTMLElement>('.tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderBookings();
}

// ─────────────────────────────────────────────
// BOOKING CARD BUILDER
// ─────────────────────────────────────────────
function buildCardHTML(b: Booking): string {
  const sc = getStatusClass(b);
  const sl = getStatusLabel(b);
  const ssIcon = b.gcashScreenshot ? '📸 Screenshot' : '⚠️ No Screenshot';
  const isSettled = b.status === 'confirmed' || b.status === 'declined';

  const ssHTML = b.gcashScreenshot
    ? `<div class="ss-section">
         <div class="ss-section-head">📸 GCash Screenshot</div>
         <img class="ss-img" src="${b.gcashScreenshot}" alt="GCash Screenshot"/>
       </div>`
    : `<div class="ss-section">
         <div class="no-ss-warning">
           <span class="wi">⚠️</span>
           <div class="wt">
             <strong>No GCash screenshot provided.</strong><br>
             This client has not uploaded their ₱200 downpayment confirmation yet.
           </div>
         </div>
       </div>`;

  let actionHTML = '';
  if (b.status === 'confirmed') {
    actionHTML = `
      <div class="confirmed-banner">
        <span class="banner-icon">✅</span>
        <span>Booking <strong>confirmed</strong> on ${formatDate(b.updatedAt)}</span>
        <button class="btn-revert" onclick="revertStatus(${b.id})">Revert</button>
      </div>`;
  } else if (b.status === 'declined') {
    actionHTML = `
      <div class="declined-banner">
        <span class="banner-icon">❌</span>
        <span>Booking <strong>declined</strong> on ${formatDate(b.updatedAt)}</span>
        <button class="btn-revert" onclick="revertStatus(${b.id})">Revert</button>
      </div>`;
  } else {
    const warnText = !b.gcashScreenshot
      ? '⚠️ No screenshot — confirm anyway?'
      : '✅ Screenshot attached — confirm this booking?';
    const warnBg    = !b.gcashScreenshot ? 'var(--orange-pale)' : 'var(--green-pale)';
    const warnColor = !b.gcashScreenshot ? '#7a3a10' : '#1a5a30';
    actionHTML = `
      <div style="margin-bottom:8px;padding:8px 10px;background:${warnBg};border-radius:8px;font-size:12px;color:${warnColor};">
        ${warnText}
      </div>
      <div class="admin-note-row">
        <label>Admin Note (optional)</label>
        <textarea id="note-${b.id}" rows="2" placeholder="e.g. Called client, waiting for payment…">${b.adminNote || ''}</textarea>
      </div>
      <div class="action-row">
        <button class="btn-confirm" onclick="updateBookingStatus(${b.id},'confirmed')">✅ Confirm</button>
        <button class="btn-decline" onclick="updateBookingStatus(${b.id},'declined')">❌ Decline</button>
      </div>`;
  }

  const noteDisplay = isSettled && b.adminNote
    ? `<div style="margin-top:8px;padding:8px 10px;background:var(--pink-light);border-radius:8px;font-size:12px;color:var(--mauve);">
         <strong>Note:</strong> ${escHtml(b.adminNote)}
       </div>`
    : '';

  return `
    <div class="booking-card" id="card-${b.id}">
      <div class="card-header" onclick="toggleCard(${b.id})">
        <span class="status-dot ${sc}"></span>
        <div class="card-info">
          <div class="card-name">${escHtml(b.name)}</div>
          <div class="card-meta">📅 ${escHtml(b.date)} · ${escHtml(b.occasion)} · ${escHtml(b.package)}</div>
        </div>
        <div class="card-right">
          <span class="status-badge ${sc}">${sl}</span>
          <span class="ss-indicator">${ssIcon}</span>
        </div>
        <span class="chevron" id="chev-${b.id}">▼</span>
      </div>
      <div class="card-body" id="body-${b.id}">
        <div class="detail-grid">
          <div class="detail-item"><div class="dl">Client Name</div><div class="dv">${escHtml(b.name)}</div></div>
          <div class="detail-item"><div class="dl">Event Date</div><div class="dv">${escHtml(b.date)}</div></div>
          <div class="detail-item"><div class="dl">Performance Time</div><div class="dv">${escHtml(b.perfTime)}</div></div>
          <div class="detail-item"><div class="dl">Occasion</div><div class="dv">${escHtml(b.occasion)}</div></div>
          <div class="detail-item full"><div class="dl">Venue</div><div class="dv">${escHtml(b.venue)}</div></div>
          <div class="detail-item"><div class="dl">Rate Type</div><div class="dv">${escHtml(b.rateType)}</div></div>
          <div class="detail-item"><div class="dl">Package</div><div class="dv"><span class="pkg-badge">${escHtml(b.package)}</span></div></div>
          ${b.notes ? `<div class="detail-item full"><div class="dl">Notes</div><div class="dv">${escHtml(b.notes)}</div></div>` : ''}
          ${b.clientUsername ? `<div class="detail-item"><div class="dl">Account</div><div class="dv">@${escHtml(b.clientUsername)}</div></div>` : ''}
        </div>
        ${ssHTML}
        ${actionHTML}
        ${noteDisplay}
        <div class="submitted-time">Submitted: ${formatDate(b.submittedAt)}</div>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────
// CARD TOGGLE
// ─────────────────────────────────────────────
function toggleCard(id: number): void {
  const body = document.getElementById(`body-${id}`) as HTMLElement;
  const chev = document.getElementById(`chev-${id}`) as HTMLElement;
  const isOpen = body.classList.contains('open');
  if (isOpen) {
    body.classList.remove('open');
    chev.classList.remove('open');
    openCardId = null;
  } else {
    body.classList.add('open');
    chev.classList.add('open');
    openCardId = id;
  }
}

// ─────────────────────────────────────────────
// BOOKING STATUS ACTIONS
// ─────────────────────────────────────────────
async function updateBookingStatus(id: number, status: 'confirmed' | 'declined'): Promise<void> {
  const noteEl = document.getElementById(`note-${id}`) as HTMLTextAreaElement | null;
  const note = noteEl ? noteEl.value.trim() : '';
  try {
    await fetch(`${API_BASE}/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ status, adminNote: note }),
    });
    showToast(status === 'confirmed' ? '✅ Booking confirmed!' : '❌ Booking declined.');
    updateStats();
    renderBookings();
  } catch { showToast('❌ Error updating booking.'); }
}

async function revertStatus(id: number): Promise<void> {
  try {
    await fetch(`${API_BASE}/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'pending', adminNote: '' }),
    });
    showToast('↩️ Booking reverted to pending.');
    updateStats();
    renderBookings();
  } catch { showToast('❌ Error reverting booking.'); }
}

// ─────────────────────────────────────────────
// CLIENT ACCOUNTS
// ─────────────────────────────────────────────
async function loadClients(): Promise<void> {
  const listEl = document.getElementById('clientsList') as HTMLElement;
  listEl.innerHTML = '<div class="empty-state"><span class="ei" style="font-size:24px">⏳</span><p>Loading…</p></div>';
  try {
    const res = await fetch(`${API_BASE}/admin/clients`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const clients: Client[] = await res.json();
    (document.getElementById('clientCount') as HTMLElement).textContent =
      `${clients.length} account${clients.length === 1 ? '' : 's'}`;

    if (clients.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><span class="ei">👤</span><p>No client accounts yet.<br>Create one above!</p></div>';
      return;
    }
    listEl.innerHTML = clients.map(c => `
      <div class="client-row" id="cr-${c.id}">
        <div class="cr-icon">👤</div>
        <div class="cr-info">
          <div class="cr-name">${escHtml(c.display_name)}</div>
          <div class="cr-user">@${escHtml(c.username)}</div>
          <div class="cr-date">Created ${formatDate(c.created_at)}</div>
        </div>
        <div class="cr-actions">
          <button class="btn-pw" onclick="resetClientPassword(${c.id}, '${escHtml(c.display_name)}')">🔑</button>
          <button class="btn-del" onclick="deleteClient(${c.id}, '${escHtml(c.display_name)}')">🗑️</button>
        </div>
      </div>
    `).join('');
  } catch {
    listEl.innerHTML = '<div class="empty-state"><p>Error loading clients.</p></div>';
  }
}

async function createClientAccount(): Promise<void> {
  const displayName = (document.getElementById('newDisplayName') as HTMLInputElement).value.trim();
  const username    = (document.getElementById('newUsername') as HTMLInputElement).value.trim();
  const password    = (document.getElementById('newPassword') as HTMLInputElement).value;
  const errEl = document.getElementById('createError') as HTMLElement;
  const sucEl = document.getElementById('createSuccess') as HTMLElement;
  const btn   = document.getElementById('createBtn') as HTMLButtonElement;

  errEl.classList.remove('show');
  sucEl.classList.remove('show');

  if (!displayName || !username || !password) {
    errEl.textContent = 'Please fill in all fields.';
    errEl.classList.add('show');
    return;
  }
  if (password.length < 4) {
    errEl.textContent = 'Password must be at least 4 characters.';
    errEl.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating…';

  try {
    const res = await fetch(`${API_BASE}/admin/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ username, password, displayName }),
    });
    const data: ApiError = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || 'Could not create account.';
      errEl.classList.add('show');
      btn.disabled = false;
      btn.innerHTML = '🎀 &nbsp; Create Account';
      return;
    }
    sucEl.textContent = `✅ Account created! Username: ${username} — Share credentials with client.`;
    sucEl.classList.add('show');
    (document.getElementById('newDisplayName') as HTMLInputElement).value = '';
    (document.getElementById('newUsername') as HTMLInputElement).value = '';
    (document.getElementById('newPassword') as HTMLInputElement).value = '';
    btn.disabled = false;
    btn.innerHTML = '🎀 &nbsp; Create Account';
    loadClients();
    showToast(`✅ Account created for ${displayName}!`);
  } catch {
    errEl.textContent = 'Server error. Please try again.';
    errEl.classList.add('show');
    btn.disabled = false;
    btn.innerHTML = '🎀 &nbsp; Create Account';
  }
}

async function resetClientPassword(id: number, name: string): Promise<void> {
  const newPw = prompt(`Set new password for ${name}:`);
  if (!newPw) return;
  if (newPw.length < 4) { alert('Password must be at least 4 characters.'); return; }
  try {
    await fetch(`${API_BASE}/admin/clients/${id}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ password: newPw }),
    });
    showToast(`🔑 Password updated for ${name}!`);
  } catch { showToast('❌ Error updating password.'); }
}

async function deleteClient(id: number, name: string): Promise<void> {
  if (!confirm(`Delete account for ${name}? This cannot be undone.`)) return;
  try {
    await fetch(`${API_BASE}/admin/clients/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    showToast('🗑️ Account deleted.');
    loadClients();
  } catch { showToast('❌ Error deleting account.'); }
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
function showToast(msg: string): void {
  const t = document.getElementById('toast') as HTMLElement;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function escHtml(s?: string): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
