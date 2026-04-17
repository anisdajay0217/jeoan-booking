const API_BASE = window.location.origin;
let adminToken = sessionStorage.getItem('admin_token') || null;
let isLoggedIn = false;

// Guard: no token = back to login
if (!adminToken) {
  window.location.href = 'admin.html';
} else {
  isLoggedIn = true;
  loadDashboard();
}

// ════════════════════════════════════════
// AUTH
// ════════════════════════════════════════
function confirmLogout() {
  document.getElementById('logoutModal').classList.add('show');
}
function closeLogoutModal() {
  document.getElementById('logoutModal').classList.remove('show');
}
function doLogout() {
  closeLogoutModal();
  isLoggedIn = false;
  adminToken = null;
  sessionStorage.removeItem('admin_token');
  window.location.href = 'admin.html';
}

// ════════════════════════════════════════
// TAB SWITCHING
// ════════════════════════════════════════
function switchTab(tab) {
  document.getElementById('navBookings').classList.toggle('active', tab==='bookings');
  document.getElementById('navClients').classList.toggle('active', tab==='clients');
  document.getElementById('viewBookings').style.display = tab==='bookings' ? 'flex' : 'none';
  document.getElementById('viewClients').style.display  = tab==='clients'  ? 'flex' : 'none';
  if (tab==='clients') loadClients();
}

// ════════════════════════════════════════
// DASHBOARD INIT
// ════════════════════════════════════════
let currentFilter = 'all';
let openCardId = null;
let refreshInterval = null;

function loadDashboard() {
  updateStats();
  renderBookings();
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    if (isLoggedIn) { updateStats(); renderBookings(); }
  }, 10000);
}

// ════════════════════════════════════════
// BOOKINGS — FETCH & RENDER
// ════════════════════════════════════════
async function fetchBookings() {
  try {
    const res = await fetch(API_BASE + '/admin/bookings', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

async function updateStats() {
  const all = await fetchBookings();
  const noSS      = all.filter(b => !b.gcashScreenshot && b.status==='pending').length;
  const pending   = all.filter(b =>  b.gcashScreenshot && b.status==='pending').length;
  const confirmed = all.filter(b => b.status==='confirmed').length;
  const declined  = all.filter(b => b.status==='declined').length;

  document.getElementById('statTotal').textContent     = all.length;
  document.getElementById('statNoSS').textContent      = noSS;
  document.getElementById('statPending').textContent   = pending;
  document.getElementById('statConfirmed').textContent = confirmed;
  document.getElementById('statDeclined').textContent  = declined;

  const alertCount = noSS + pending;
  const pb = document.getElementById('navBadgePending');
  pb.textContent = alertCount;
  pb.className = 'nav-badge' + (noSS > 0 ? ' alert' : '');

  return all;
}

async function renderBookings() {
  let all = await fetchBookings();
  all.sort((a, b) => {
    const order = sc => sc==='no-ss'?0 : sc==='pending'?1 : sc==='confirmed'?2 : 3;
    const oa = order(getStatusClass(a)), ob = order(getStatusClass(b));
    if (oa !== ob) return oa - ob;
    return b.id - a.id;
  });
  if (currentFilter !== 'all') {
    all = all.filter(b => {
      if (currentFilter==='no-ss')     return getStatusClass(b)==='no-ss';
      if (currentFilter==='pending')   return getStatusClass(b)==='pending';
      if (currentFilter==='confirmed') return b.status==='confirmed';
      if (currentFilter==='declined')  return b.status==='declined';
      return true;
    });
  }
  const area = document.getElementById('bookingsArea');
  if (all.length===0) {
    area.innerHTML = '<div class="empty-state"><span class="ei">🌸</span><p>No bookings in this category yet.</p></div>';
    return;
  }
  area.innerHTML = all.map(b => buildCardHTML(b)).join('');
  if (openCardId) {
    const body = document.getElementById('body-'+openCardId);
    const chev = document.getElementById('chev-'+openCardId);
    if (body) body.classList.add('open');
    if (chev) chev.classList.add('open');
  }
}

function getStatusClass(b) {
  if (b.status==='confirmed') return 'confirmed';
  if (b.status==='declined')  return 'declined';
  if (!b.gcashScreenshot)     return 'no-ss';
  return 'pending';
}
function getStatusLabel(b) {
  if (b.status==='confirmed') return '✅ Confirmed';
  if (b.status==='declined')  return '❌ Declined';
  if (!b.gcashScreenshot)     return '⚠️ No Screenshot';
  return '⏳ Pending';
}
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})
       + ' · '
       + d.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'});
}
function setFilter(filter, el) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderBookings();
}

function buildCardHTML(b) {
  const sc = getStatusClass(b);
  const sl = getStatusLabel(b);
  const ssIcon = b.gcashScreenshot ? '📸 Screenshot' : '⚠️ No Screenshot';
  const isSettled = b.status==='confirmed' || b.status==='declined';

  let ssHTML = b.gcashScreenshot
    ? `<div class="ss-section">
         <div class="ss-section-head">📸 GCash Screenshot</div>
         <img class="ss-img" src="${b.gcashScreenshot}" alt="GCash Screenshot"/>
       </div>`
    : `<div class="ss-section">
         <div class="no-ss-warning">
           <span class="wi">⚠️</span>
           <div class="wt"><strong>No GCash screenshot provided.</strong><br>This client hasn't uploaded their ₱200 downpayment confirmation yet.</div>
         </div>
       </div>`;

  let actionHTML = '';
  if (b.status==='confirmed') {
    actionHTML = `<div class="confirmed-banner">
      <span class="banner-icon">✅</span>
      <span>Confirmed on ${formatDate(b.updatedAt)}</span>
      <button class="btn-revert" onclick="revertStatus(${b.id})">Revert</button>
    </div>`;
  } else if (b.status==='declined') {
    actionHTML = `<div class="declined-banner">
      <span class="banner-icon">❌</span>
      <span>Declined on ${formatDate(b.updatedAt)}</span>
      <button class="btn-revert" onclick="revertStatus(${b.id})">Revert</button>
    </div>`;
  } else {
    const warnText  = !b.gcashScreenshot ? '⚠️ No screenshot — confirm anyway?' : '✅ Screenshot attached — confirm this booking?';
    const warnBg    = !b.gcashScreenshot ? 'var(--orange-pale)' : 'var(--green-pale)';
    const warnColor = !b.gcashScreenshot ? '#7a3a10' : '#1a5a30';
    actionHTML = `
      <div style="margin-bottom:8px;padding:8px 11px;background:${warnBg};border-radius:9px;font-size:12px;color:${warnColor};">${warnText}</div>
      <div class="admin-note-row">
        <label>Admin Note (optional)</label>
        <textarea id="note-${b.id}" rows="2" placeholder="e.g. Called client, waiting for payment…">${b.adminNote||''}</textarea>
      </div>
      <div class="action-row">
        <button class="btn-confirm" onclick="updateBookingStatus(${b.id},'confirmed')">✅ Confirm</button>
        <button class="btn-decline" onclick="updateBookingStatus(${b.id},'declined')">❌ Decline</button>
      </div>`;
  }

  let noteDisplay = '';
  if (isSettled && b.adminNote) {
    noteDisplay = `<div style="margin-top:9px;padding:8px 11px;background:var(--rose-50);border-radius:9px;font-size:12px;color:var(--mauve);"><strong>Note:</strong> ${escHtml(b.adminNote)}</div>`;
  }

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

function toggleCard(id) {
  const body = document.getElementById('body-'+id);
  const chev = document.getElementById('chev-'+id);
  const isOpen = body.classList.contains('open');
  if (isOpen) {
    body.classList.remove('open'); chev.classList.remove('open'); openCardId = null;
  } else {
    body.classList.add('open');  chev.classList.add('open');  openCardId = id;
  }
}

async function updateBookingStatus(id, status) {
  const noteEl = document.getElementById('note-'+id);
  const note = noteEl ? noteEl.value.trim() : '';
  try {
    await fetch(API_BASE + '/admin/bookings/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
      body: JSON.stringify({ status, adminNote: note })
    });
    showToast(status==='confirmed' ? '✅ Booking confirmed!' : '❌ Booking declined.');
    updateStats(); renderBookings();
  } catch(e) { showToast('❌ Error updating booking.'); }
}

async function revertStatus(id) {
  try {
    await fetch(API_BASE + '/admin/bookings/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
      body: JSON.stringify({ status: 'pending', adminNote: '' })
    });
    showToast('↩️ Booking reverted to pending.');
    updateStats(); renderBookings();
  } catch(e) { showToast('❌ Error reverting.'); }
}

// ════════════════════════════════════════
// CLIENTS
// ════════════════════════════════════════
async function loadClients() {
  const listEl = document.getElementById('clientsList');
  listEl.innerHTML = '<div class="empty-state"><span class="ei" style="font-size:24px">⏳</span><p>Loading…</p></div>';
  try {
    const res = await fetch(API_BASE + '/admin/clients', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    const clients = await res.json();
    document.getElementById('clientCount').textContent = clients.length + ' account' + (clients.length===1 ? '' : 's');
    document.getElementById('navBadgeClients').textContent = clients.length;
    if (clients.length===0) {
      listEl.innerHTML = '<div class="empty-state"><span class="ei">👤</span><p>No client accounts yet.</p></div>';
      return;
    }
    listEl.innerHTML = clients.map(c => `
      <div class="client-row" id="cr-${c.id}">
        <div class="cr-avatar">👤</div>
        <div class="cr-info">
          <div class="cr-name">${escHtml(c.display_name)}</div>
          <div class="cr-user">@${escHtml(c.username)}</div>
          <div class="cr-date">Created ${formatDate(c.created_at)}</div>
        </div>
        <div class="cr-actions">
          <button class="btn-pw" onclick="resetClientPassword(${c.id},'${escHtml(c.display_name)}')">🔑 Reset PW</button>
          <button class="btn-del" onclick="deleteClient(${c.id},'${escHtml(c.display_name)}')">🗑️ Delete</button>
        </div>
      </div>
    `).join('');
  } catch(e) {
    listEl.innerHTML = '<div class="empty-state"><p>Error loading clients.</p></div>';
  }
}

async function createClientAccount() {
  const displayName = document.getElementById('newDisplayName').value.trim();
  const username    = document.getElementById('newUsername').value.trim();
  const password    = document.getElementById('newPassword').value;
  const errEl = document.getElementById('createError');
  const sucEl = document.getElementById('createSuccess');
  const btn   = document.getElementById('createBtn');
  errEl.classList.remove('show'); sucEl.classList.remove('show');
  if (!displayName || !username || !password) {
    errEl.textContent = 'Please fill in all fields.'; errEl.classList.add('show'); return;
  }
  if (password.length < 4) {
    errEl.textContent = 'Password must be at least 4 characters.'; errEl.classList.add('show'); return;
  }
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Creating…';
  try {
    const res = await fetch(API_BASE + '/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
      body: JSON.stringify({ username, password, displayName })
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || 'Could not create account.';
      errEl.classList.add('show'); btn.disabled = false; btn.innerHTML = '🎀 &nbsp; Create Account'; return;
    }
    sucEl.textContent = '✅ Account created! Username: ' + username + ' — Share credentials with client.';
    sucEl.classList.add('show');
    document.getElementById('newDisplayName').value = '';
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
    btn.disabled = false; btn.innerHTML = '🎀 &nbsp; Create Account';
    loadClients();
    showToast('✅ Account created for ' + displayName + '!');
  } catch(e) {
    errEl.textContent = 'Server error. Please try again.';
    errEl.classList.add('show'); btn.disabled = false; btn.innerHTML = '🎀 &nbsp; Create Account';
  }
}

async function resetClientPassword(id, name) {
  const newPw = prompt('Set new password for ' + name + ':');
  if (!newPw) return;
  if (newPw.length < 4) { alert('Password must be at least 4 characters.'); return; }
  try {
    await fetch(API_BASE + '/admin/clients/' + id + '/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
      body: JSON.stringify({ password: newPw })
    });
    showToast('🔑 Password updated for ' + name + '!');
  } catch(e) { showToast('❌ Error updating password.'); }
}

async function deleteClient(id, name) {
  if (!confirm('Delete account for ' + name + '? This cannot be undone.')) return;
  try {
    await fetch(API_BASE + '/admin/clients/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    showToast('🗑️ Account deleted.');
    loadClients();
  } catch(e) { showToast('❌ Error deleting account.'); }
}

// ════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
