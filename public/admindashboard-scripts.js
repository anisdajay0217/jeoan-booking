const API_BASE = window.location.origin;

// ════════════════════════════════════════
// STATE
// ════════════════════════════════════════
let adminToken = sessionStorage.getItem('admin_token') || null;
let isLoggedIn = false;
let currentFilter = 'all';
let openCardId = null;
let refreshInterval = null;
let pendingDeleteId = null;

// Archive stored locally in sessionStorage (soft-delete, server rows untouched)
function getArchive() {
  try { return JSON.parse(sessionStorage.getItem('jb_archive') || '[]'); } catch { return []; }
}
function saveArchive(arr) { sessionStorage.setItem('jb_archive', JSON.stringify(arr)); }
function isArchived(id) { return getArchive().some(b => String(b.id) === String(id)); }
function archiveBooking(booking) {
  const arr = getArchive();
  if (!arr.some(b => String(b.id) === String(booking.id))) {
    arr.unshift({ ...booking, archivedAt: new Date().toISOString() });
    saveArchive(arr);
  }
}
function restoreFromArchive(id) { saveArchive(getArchive().filter(b => String(b.id) !== String(id))); }

// ════════════════════════════════════════
// GUARD
// ════════════════════════════════════════
if (!adminToken) {
  window.location.href = 'admin.html';
} else {
  isLoggedIn = true;
  loadDashboard();
}

// ════════════════════════════════════════
// AUTH
// ════════════════════════════════════════
function confirmLogout() { document.getElementById('logoutModal').classList.add('show'); }
function closeLogoutModal() { document.getElementById('logoutModal').classList.remove('show'); }
function doLogout() {
  closeLogoutModal();
  isLoggedIn = false; adminToken = null;
  sessionStorage.removeItem('admin_token');
  window.location.href = 'admin.html';
}

// ════════════════════════════════════════
// TAB SWITCHING
// ════════════════════════════════════════
function switchTab(tab) {
  ['bookings','schedules','archive'].forEach(t => {
    const nav = document.getElementById('nav' + t.charAt(0).toUpperCase() + t.slice(1));
    const view = document.getElementById('view' + t.charAt(0).toUpperCase() + t.slice(1));
    if (nav) nav.classList.toggle('active', t === tab);
    if (view) view.style.display = t === tab ? 'flex' : 'none';
  });
  if (tab === 'schedules') renderSchedules();
  if (tab === 'archive')   renderArchive();
}

// ════════════════════════════════════════
// DASHBOARD INIT
// ════════════════════════════════════════
function loadDashboard() {
  updateStats();
  renderBookings();
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    if (isLoggedIn) { updateStats(); renderBookings(); }
  }, 10000);
}

// ════════════════════════════════════════
// FETCH
// ════════════════════════════════════════
async function fetchBookingsRaw() {
  try {
    const res = await fetch(API_BASE + '/admin/bookings', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

async function fetchBookings() {
  const all = await fetchBookingsRaw();
  return all.filter(b => !isArchived(b.id));
}

// ════════════════════════════════════════
// STATS
// ════════════════════════════════════════
async function updateStats() {
  const all = await fetchBookings();
  const noSS      = all.filter(b => !b.gcashScreenshot && b.status === 'pending').length;
  const pending   = all.filter(b =>  b.gcashScreenshot && b.status === 'pending').length;
  const confirmed = all.filter(b => b.status === 'confirmed').length;
  const declined  = all.filter(b => b.status === 'declined').length;

  document.getElementById('statTotal').textContent     = all.length;
  document.getElementById('statNoSS').textContent      = noSS;
  document.getElementById('statPending').textContent   = pending;
  document.getElementById('statConfirmed').textContent = confirmed;
  document.getElementById('statDeclined').textContent  = declined;

  const alertCount = noSS + pending;
  const pb = document.getElementById('navBadgePending');
  pb.textContent = alertCount;
  pb.className = 'nav-badge' + (alertCount > 0 ? ' alert' : '');

  document.getElementById('navBadgeSchedules').textContent = confirmed;
  document.getElementById('navBadgeArchive').textContent = getArchive().length;
}

// ════════════════════════════════════════
// BOOKINGS TAB
// ════════════════════════════════════════
async function renderBookings() {
  let all = await fetchBookings();

  all.sort((a, b) => {
    const order = sc => sc === 'no-ss' ? 0 : sc === 'pending' ? 1 : sc === 'confirmed' ? 2 : 3;
    const oa = order(getStatusClass(a)), ob = order(getStatusClass(b));
    if (oa !== ob) return oa - ob;
    return String(b.id) > String(a.id) ? 1 : -1;
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

  const area = document.getElementById('bookingsArea');
  if (all.length === 0) {
    area.innerHTML = '<div class="empty-state"><span class="ei">🌸</span><p>No bookings in this category yet.</p></div>';
    return;
  }
  area.innerHTML = all.map(b => buildCardHTML(b)).join('');
  if (openCardId) {
    const body = document.getElementById('body-' + openCardId);
    const chev = document.getElementById('chev-' + openCardId);
    if (body) body.classList.add('open');
    if (chev) chev.classList.add('open');
  }
}

function getStatusClass(b) {
  if (b.status === 'confirmed') return 'confirmed';
  if (b.status === 'declined')  return 'declined';
  if (!b.gcashScreenshot)       return 'no-ss';
  return 'pending';
}
function getStatusLabel(b) {
  if (b.status === 'confirmed') return '✅ Confirmed';
  if (b.status === 'declined')  return '❌ Declined';
  if (!b.gcashScreenshot)       return '⚠️ No Screenshot';
  return '⏳ Pending';
}
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
       + ' · ' + d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
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
  const isSettled = b.status === 'confirmed' || b.status === 'declined';

  const ssHTML = b.gcashScreenshot
    ? `<div class="ss-section"><div class="ss-section-head">📸 GCash Screenshot</div>
         <img class="ss-img" src="${b.gcashScreenshot}" alt="GCash Screenshot"/></div>`
    : `<div class="ss-section"><div class="no-ss-warning">
         <span class="wi">⚠️</span>
         <div class="wt"><strong>No GCash screenshot provided.</strong><br>This client hasn't uploaded their ₱200 downpayment confirmation yet.</div>
       </div></div>`;

  let actionHTML = '';
  if (b.status === 'confirmed') {
    actionHTML = `<div class="confirmed-banner">
      <span class="banner-icon">✅</span>
      <span>Confirmed on ${formatDate(b.updatedAt)}</span>
      <button class="btn-revert" onclick="revertStatus(${b.id})">Revert</button>
    </div>`;
  } else if (b.status === 'declined') {
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
        <textarea id="note-${b.id}" rows="2" placeholder="e.g. Called client, waiting for payment…">${b.adminNote || ''}</textarea>
      </div>
      <div class="action-row">
        <button class="btn-confirm" onclick="updateBookingStatus(${b.id},'confirmed')">✅ Confirm</button>
        <button class="btn-decline" onclick="updateBookingStatus(${b.id},'declined')">❌ Decline</button>
        <button class="btn-archive-booking" onclick="promptDelete(${b.id})" title="Archive">🗂️</button>
      </div>`;
  }

  const noteDisplay = (isSettled && b.adminNote)
    ? `<div style="margin-top:9px;padding:8px 11px;background:var(--rose-50);border-radius:9px;font-size:12px;color:var(--mauve);"><strong>Note:</strong> ${escHtml(b.adminNote)}</div>`
    : '';

  const settledArchiveBtn = isSettled
    ? `<div style="margin-top:10px;"><button class="btn-archive-booking" style="width:100%" onclick="promptDelete(${b.id})">🗂️ Archive Booking</button></div>`
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
          ${b.phone ? `<div class="detail-item"><div class="dl">Contact Number</div><div class="dv">${escHtml(b.phone)}</div></div>` : ''}
          <div class="detail-item"><div class="dl">Event Date</div><div class="dv">${escHtml(b.date)}</div></div>
          <div class="detail-item"><div class="dl">Performance Time</div><div class="dv">${escHtml(b.perfTime)}</div></div>
          <div class="detail-item"><div class="dl">Occasion</div><div class="dv">${escHtml(b.occasion)}</div></div>
          <div class="detail-item full"><div class="dl">Venue</div><div class="dv">${escHtml(b.venue)}</div></div>
          <div class="detail-item"><div class="dl">Rate Type</div><div class="dv">${escHtml(b.rateType)}</div></div>
          <div class="detail-item"><div class="dl">Package</div><div class="dv"><span class="pkg-badge">${escHtml(b.package)}</span></div></div>
          ${b.notes ? `<div class="detail-item full"><div class="dl">Notes</div><div class="dv">${escHtml(b.notes)}</div></div>` : ''}
        </div>
        ${ssHTML}
        ${actionHTML}
        ${noteDisplay}
        ${settledArchiveBtn}
        <div class="submitted-time">Submitted: ${formatDate(b.submittedAt)}</div>
      </div>
    </div>`;
}

function toggleCard(id) {
  const body = document.getElementById('body-' + id);
  const chev = document.getElementById('chev-' + id);
  if (!body) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  chev.classList.toggle('open', !isOpen);
  openCardId = isOpen ? null : id;
}

async function updateBookingStatus(id, status) {
  const noteEl = document.getElementById('note-' + id);
  const note = noteEl ? noteEl.value.trim() : '';
  try {
    await fetch(API_BASE + '/admin/bookings/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
      body: JSON.stringify({ status, adminNote: note })
    });
    showToast(status === 'confirmed' ? '✅ Booking confirmed!' : '❌ Booking declined.');
    updateStats(); renderBookings();
  } catch { showToast('❌ Error updating booking.'); }
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
  } catch { showToast('❌ Error reverting.'); }
}

// ════════════════════════════════════════
// SCHEDULES TAB
// ════════════════════════════════════════
async function renderSchedules() {
  const area = document.getElementById('schedulesArea');
  area.innerHTML = '<div class="empty-state"><span class="ei" style="font-size:28px">⏳</span><p>Loading…</p></div>';

  const all = await fetchBookings();
  const confirmed = all.filter(b => b.status === 'confirmed');

  if (confirmed.length === 0) {
    area.innerHTML = '<div class="empty-state"><span class="ei">📅</span><p>No confirmed bookings yet.<br>Confirmed bookings will appear here!</p></div>';
    return;
  }

  confirmed.sort((a, b) => {
    const da = new Date(a.date), db = new Date(b.date);
    if (!isNaN(da) && !isNaN(db)) return da - db;
    return String(a.date).localeCompare(String(b.date));
  });

  const groups = {};
  confirmed.forEach(b => {
    const d = new Date(b.date);
    const label = isNaN(d) ? 'Unspecified Date' : d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(b);
  });

  let html = '';
  Object.entries(groups).forEach(([month, bookings]) => {
    html += `<div class="schedule-month-label">📅 ${month}</div>`;
    html += bookings.map(b => buildScheduleCard(b)).join('');
  });
  area.innerHTML = html;
}

function buildScheduleCard(b) {
  const d = new Date(b.date);
  const isPast = !isNaN(d) && d < new Date();
  const day   = isNaN(d) ? '—' : d.getDate();
  const month = isNaN(d) ? ''  : d.toLocaleDateString('en-PH', { month: 'short' }).toUpperCase();
  const year  = isNaN(d) ? ''  : d.getFullYear();

  return `
    <div class="schedule-card${isPast ? ' past' : ''}" id="sched-${b.id}">
      <div class="schedule-date-col">
        <div class="schedule-day">${day}</div>
        <div class="schedule-month">${month}</div>
        <div class="schedule-year">${year}</div>
      </div>
      <div class="schedule-info">
        <div class="schedule-name">${escHtml(b.name)}</div>
        <div class="schedule-chips">
          <span class="chip time">⏰ ${escHtml(b.perfTime)}</span>
          <span class="chip occasion">${escHtml(b.occasion)}</span>
          <span class="chip package">${escHtml(b.package)}</span>
        </div>
        <div class="schedule-venue">📍 ${escHtml(b.venue)}</div>
        ${b.phone ? `<div class="schedule-phone">📞 ${escHtml(b.phone)}</div>` : ''}
        ${b.adminNote ? `<div class="schedule-note">📝 ${escHtml(b.adminNote)}</div>` : ''}
      </div>
      <div class="schedule-actions">
        <button class="btn-done" onclick="markDone(${b.id})">✅ Done</button>
        <button class="btn-sched-archive" onclick="promptDelete(${b.id})">🗂️ Archive</button>
      </div>
    </div>`;
}

function markDone(id) {
  fetchBookings().then(all => {
    const b = all.find(x => String(x.id) === String(id));
    if (b) archiveBooking(b);
    showToast('✅ Marked as done and archived!');
    updateStats();
    renderSchedules();
  });
}

// ════════════════════════════════════════
// ARCHIVE TAB
// ════════════════════════════════════════
function renderArchive() {
  const area = document.getElementById('archiveArea');
  const archived = getArchive();
  document.getElementById('navBadgeArchive').textContent = archived.length;

  if (archived.length === 0) {
    area.innerHTML = '<div class="empty-state"><span class="ei">🗂️</span><p>Archive is empty.<br>Deleted or finished bookings will appear here.</p></div>';
    return;
  }
  area.innerHTML = archived.map(b => buildArchiveCardHTML(b)).join('');
}

function buildArchiveCardHTML(b) {
  const archivedDate = b.archivedAt ? formatDate(b.archivedAt) : '';
  return `
    <div class="booking-card archived" id="arc-${b.id}">
      <div class="card-header" onclick="toggleArchiveCard(${b.id})">
        <span class="status-dot archived"></span>
        <div class="card-info">
          <div class="archive-tag">🗂️ Archived · ${escHtml(b.status || '')}</div>
          <div class="card-name">${escHtml(b.name)}</div>
          <div class="card-meta">📅 ${escHtml(b.date)} · ${escHtml(b.occasion)} · ${escHtml(b.package)}</div>
        </div>
        <span class="chevron" id="arc-chev-${b.id}">▼</span>
      </div>
      <div class="card-body" id="arc-body-${b.id}">
        <div class="detail-grid">
          <div class="detail-item"><div class="dl">Client Name</div><div class="dv">${escHtml(b.name)}</div></div>
          ${b.phone ? `<div class="detail-item"><div class="dl">Contact</div><div class="dv">${escHtml(b.phone)}</div></div>` : ''}
          <div class="detail-item"><div class="dl">Event Date</div><div class="dv">${escHtml(b.date)}</div></div>
          <div class="detail-item"><div class="dl">Time</div><div class="dv">${escHtml(b.perfTime)}</div></div>
          <div class="detail-item"><div class="dl">Occasion</div><div class="dv">${escHtml(b.occasion)}</div></div>
          <div class="detail-item full"><div class="dl">Venue</div><div class="dv">${escHtml(b.venue)}</div></div>
          <div class="detail-item"><div class="dl">Package</div><div class="dv"><span class="pkg-badge">${escHtml(b.package)}</span></div></div>
          ${b.notes ? `<div class="detail-item full"><div class="dl">Notes</div><div class="dv">${escHtml(b.notes)}</div></div>` : ''}
          ${b.adminNote ? `<div class="detail-item full"><div class="dl">Admin Note</div><div class="dv">${escHtml(b.adminNote)}</div></div>` : ''}
        </div>
        ${b.gcashScreenshot ? `<div class="ss-section"><div class="ss-section-head">📸 GCash Screenshot</div><img class="ss-img" src="${b.gcashScreenshot}" alt="GCash"/></div>` : ''}
        <div class="action-row">
          <button class="btn-restore" onclick="restoreBooking(${b.id})">↩️ Restore</button>
          <button class="btn-decline" onclick="permanentDelete(${b.id})" style="flex:0 0 auto;padding:11px 16px">🗑️ Delete</button>
        </div>
        ${archivedDate ? `<div class="submitted-time">Archived: ${archivedDate}</div>` : ''}
      </div>
    </div>`;
}

function toggleArchiveCard(id) {
  const body = document.getElementById('arc-body-' + id);
  const chev = document.getElementById('arc-chev-' + id);
  if (!body) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  if (chev) chev.classList.toggle('open', !isOpen);
}

function restoreBooking(id) {
  restoreFromArchive(id);
  showToast('↩️ Booking restored!');
  updateStats(); renderArchive(); renderBookings();
}

function permanentDelete(id) {
  saveArchive(getArchive().filter(b => String(b.id) !== String(id)));
  showToast('🗑️ Permanently deleted.');
  updateStats(); renderArchive();
}

function confirmClearArchive() { document.getElementById('clearArchiveModal').classList.add('show'); }
function doClearArchive() {
  saveArchive([]);
  document.getElementById('clearArchiveModal').classList.remove('show');
  showToast('🗑️ Archive cleared.');
  updateStats(); renderArchive();
}

// ════════════════════════════════════════
// DELETE MODAL
// ════════════════════════════════════════
function promptDelete(id) {
  pendingDeleteId = id;
  document.getElementById('deleteModal').classList.add('show');
}
function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('show');
  pendingDeleteId = null;
}
async function confirmDelete() {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;
  closeDeleteModal();
  const all = await fetchBookingsRaw();
  const b = all.find(x => String(x.id) === String(id));
  if (b) archiveBooking(b);
  showToast('🗂️ Moved to archive.');
  updateStats(); renderBookings();
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
