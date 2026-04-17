// ════════════════════════════════════════════
// STATE — declared first
// ════════════════════════════════════════════
const API_BASE          = window.location.origin;
const clientToken       = sessionStorage.getItem('client_token');
const clientDisplayName = sessionStorage.getItem('client_display_name') || '';
const clientUsername    = sessionStorage.getItem('client_username') || '';

let sfOpenCardId = null;

// ── Auth guard ──────────────────────────────
if (!clientToken) {
  window.location.href = 'clientdashboard.html';
} else {
  initPage();
}

// ════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════
function initPage() {
  const w = document.getElementById('sfWelcome');
  if (w) w.innerHTML = `<strong>${escHtml(clientDisplayName || clientUsername)}</strong>@${escHtml(clientUsername)}`;
  loadSubmissions();
}

// ════════════════════════════════════════════
// FETCH & RENDER
// ════════════════════════════════════════════
async function loadSubmissions() {
  const area = document.getElementById('submittedArea');
  area.innerHTML = '<div class="cd-spinner-wrap"><div class="cd-spinner"></div></div>';
  try {
    const res  = await fetch(API_BASE + '/client/bookings', {
      headers: { 'Authorization': 'Bearer ' + clientToken }
    });
    if (!res.ok) throw new Error('fetch failed');
    const all  = await res.json();
    // Only show pending + confirmed (not declined)
    const data = all.filter(b => b.status === 'pending' || b.status === 'confirmed');
    // Update badge
    const badge = document.getElementById('sfBadge');
    if (badge) badge.textContent = data.length || '';
    if (data.length === 0) {
      area.innerHTML = `
        <div class="cd-empty">
          <span class="cd-ei">📂</span>
          <p>No submissions yet.<br>Fill out the booking form to get started! 🌸</p>
        </div>`;
      return;
    }
    area.innerHTML = data.map(b => buildSfCard(b)).join('');
    // Re-open previously open card
    if (sfOpenCardId) {
      const body = document.getElementById('sfbody-' + sfOpenCardId);
      const chev = document.getElementById('sfchev-' + sfOpenCardId);
      if (body) body.classList.add('open');
      if (chev) chev.classList.add('open');
    }
  } catch (e) {
    area.innerHTML = `
      <div class="cd-empty">
        <span class="cd-ei">⚠️</span>
        <p>Could not load your submissions.<br>Please try refreshing the page.</p>
      </div>`;
  }
}

// ════════════════════════════════════════════
// BUILD CARD HTML
// ════════════════════════════════════════════
function buildSfCard(b) {
  const isPending   = b.status === 'pending';
  const isConfirmed = b.status === 'confirmed';
  const sc  = isPending ? 'pending' : 'confirmed';
  const lbl = isPending ? '⏳ Pending' : '✅ Confirmed';

  // Banner
  let bannerHTML = '';
  if (isConfirmed) {
    bannerHTML = `
      <div class="sf-confirmed-banner">
        <span class="sf-banner-icon">✅</span>
        <span>Confirmed on ${formatDate(b.updatedAt)}</span>
      </div>`;
    if (b.adminNote) {
      bannerHTML += `<div class="sf-admin-note"><strong>Note from Jeoan:</strong> ${escHtml(b.adminNote)}</div>`;
    }
  } else {
    bannerHTML = `
      <div class="sf-pending-banner">
        <span class="sf-banner-icon">⏳</span>
        <span>Awaiting review — Jeoan will reach out to you soon! 💕</span>
      </div>`;
  }

  // Screenshot
  const ssHTML = b.gcashScreenshot
    ? `<div class="sf-ss-section">
         <div class="sf-ss-head">📸 GCash Screenshot</div>
         <img class="sf-ss-img" src="${b.gcashScreenshot}" alt="GCash Screenshot"/>
       </div>`
    : '';

  return `
    <div class="sf-card">
      <div class="sf-card-header" onclick="sfToggleCard(${b.id})">
        <span class="sf-status-dot ${sc}"></span>
        <div class="sf-card-info">
          <div class="sf-card-name">${escHtml(b.name)}</div>
          <div class="sf-card-meta">📅 ${escHtml(b.date)} · ${escHtml(b.occasion)} · ${escHtml(b.package)}</div>
        </div>
        <div class="sf-card-right">
          <span class="sf-badge ${sc}">${lbl}</span>
          <span class="sf-submitted-date">Submitted ${formatDateShort(b.submittedAt)}</span>
        </div>
        <span class="sf-chevron" id="sfchev-${b.id}">▼</span>
      </div>
      <div class="sf-card-body" id="sfbody-${b.id}">
        <div class="sf-detail-grid">
          <div class="sf-detail-item"><div class="sf-dl">Client Name</div><div class="sf-dv">${escHtml(b.name)}</div></div>
          <div class="sf-detail-item"><div class="sf-dl">Event Date</div><div class="sf-dv">${escHtml(b.date)}</div></div>
          <div class="sf-detail-item"><div class="sf-dl">Performance Time</div><div class="sf-dv">${escHtml(b.perfTime)}</div></div>
          <div class="sf-detail-item"><div class="sf-dl">Occasion</div><div class="sf-dv">${escHtml(b.occasion)}</div></div>
          <div class="sf-detail-item full"><div class="sf-dl">Venue</div><div class="sf-dv">${escHtml(b.venue)}</div></div>
          <div class="sf-detail-item"><div class="sf-dl">Rate Type</div><div class="sf-dv">${escHtml(b.rateType)}</div></div>
          <div class="sf-detail-item"><div class="sf-dl">Package</div><div class="sf-dv"><span class="sf-pkg-badge">${escHtml(b.package)}</span></div></div>
          ${b.notes ? `<div class="sf-detail-item full"><div class="sf-dl">Notes</div><div class="sf-dv">${escHtml(b.notes)}</div></div>` : ''}
        </div>
        ${ssHTML}
        ${bannerHTML}
        <div class="sf-submitted-time">Submitted: ${formatDate(b.submittedAt)}</div>
      </div>
    </div>`;
}

function sfToggleCard(id) {
  const body = document.getElementById('sfbody-' + id);
  const chev = document.getElementById('sfchev-' + id);
  const isOpen = body.classList.contains('open');
  if (isOpen) {
    body.classList.remove('open'); chev.classList.remove('open'); sfOpenCardId = null;
  } else {
    body.classList.add('open');   chev.classList.add('open');    sfOpenCardId = id;
  }
}

// ════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════
function sfConfirmLogout() { document.getElementById('sfLogoutModal').classList.add('show'); }
function sfCloseLogout()   { document.getElementById('sfLogoutModal').classList.remove('show'); }
function sfDoLogout() {
  sfCloseLogout();
  sessionStorage.removeItem('client_token');
  sessionStorage.removeItem('client_display_name');
  sessionStorage.removeItem('client_username');
  window.location.href = 'clientdashboard.html';
}

// ════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
       + ' · '
       + d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}
function formatDateShort(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function showToast(msg) {
  const t = document.getElementById('sfToast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
