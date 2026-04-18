// ════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════
const API_BASE          = window.location.origin;
const clientToken       = sessionStorage.getItem('client_token');
const clientDisplayName = sessionStorage.getItem('client_display_name') || '';
const clientUsername    = sessionStorage.getItem('client_username') || '';

// ── Auth guard ──────────────────────────────
if (!clientToken) {
  window.location.href = 'clientdashboard.html';
} else {
  rfInitPage();
}

// ════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════
function rfInitPage() {
  const w = document.getElementById('rfWelcome');
  if (w) w.innerHTML = `<strong>${escHtml(clientDisplayName || clientUsername)}</strong>@${escHtml(clientUsername)}`;

  rfLoadRejected();

  // Show success toast if coming back from clientedit.html
  if (new URLSearchParams(window.location.search).get('resubmitted')) {
    showToast('🎀 Booking resubmitted! Jeoan will review it shortly.');
  }
}

// ════════════════════════════════════════════
// FETCH & RENDER
// ════════════════════════════════════════════
async function rfLoadRejected() {
  const area = document.getElementById('rejectedArea');
  area.innerHTML = '<div class="cd-spinner-wrap"><div class="cd-spinner"></div></div>';
  try {
    const res  = await fetch(API_BASE + '/client/bookings', {
      headers: { 'Authorization': 'Bearer ' + clientToken }
    });
    if (!res.ok) throw new Error('fetch failed');
    const all  = await res.json();
    const data = all.filter(b => b.status === 'declined');

    // Badge
    const badge = document.getElementById('rfBadge');
    if (badge) badge.textContent = data.length || '';

    if (data.length === 0) {
      area.innerHTML = `
        <div class="cd-empty">
          <span class="cd-ei">🎉</span>
          <p>No rejected bookings!<br>All your bookings are looking good. 🌸</p>
        </div>`;
      return;
    }

    area.innerHTML = data.map(b => buildRfCard(b)).join('');
  } catch (e) {
    area.innerHTML = `
      <div class="cd-empty">
        <span class="cd-ei">⚠️</span>
        <p>Could not load rejected bookings.<br>Please try refreshing the page.</p>
      </div>`;
  }
}

// ════════════════════════════════════════════
// BUILD CARD HTML  —  cards start COLLAPSED
// ════════════════════════════════════════════
function buildRfCard(b) {
  const rejectionNote = b.adminNote
    ? `<div class="rf-rejection-note">
         <div class="rn-head">❌ Rejection Reason</div>
         <div class="rn-body">${escHtml(b.adminNote)}</div>
       </div>`
    : `<div class="rf-rejection-note">
         <div class="rn-head">❌ Declined</div>
         <div class="rn-body rf-no-note">No specific reason provided. Please contact Jeoan for details.</div>
       </div>`;

  const ssHTML = b.gcashScreenshot
    ? `<div class="rf-ss-section">
         <div class="rf-ss-head">📸 GCash Screenshot Submitted</div>
         <img class="rf-ss-img" src="${b.gcashScreenshot}" alt="GCash Screenshot"/>
       </div>`
    : '';

  return `
    <div class="rf-card">
      <div class="rf-card-header" onclick="rfToggleCard(${b.id})">
        <span class="rf-status-dot"></span>
        <div class="rf-card-info">
          <div class="rf-card-name">${escHtml(b.name)}</div>
          <div class="rf-card-meta">📅 ${escHtml(b.date)} · ${escHtml(b.occasion)} · ${escHtml(b.package)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
          <span class="rf-badge">❌ Declined</span>
          <span class="rf-declined-date">Declined ${formatDateShort(b.updatedAt)}</span>
        </div>
        <span class="rf-chevron" id="rfchev-${b.id}">▼</span>
      </div>

      <!-- Body starts CLOSED (no .open class) -->
      <div class="rf-card-body" id="rfbody-${b.id}">
        <div class="rf-detail-grid">
          <div class="rf-detail-item">
            <div class="rf-dl">Client Name</div>
            <div class="rf-dv">${escHtml(b.name)}</div>
          </div>
          <div class="rf-detail-item">
            <div class="rf-dl">Event Date</div>
            <div class="rf-dv">${escHtml(b.date)}</div>
          </div>
          <div class="rf-detail-item">
            <div class="rf-dl">Performance Time</div>
            <div class="rf-dv">${escHtml(b.perfTime)}</div>
          </div>
          <div class="rf-detail-item">
            <div class="rf-dl">Occasion</div>
            <div class="rf-dv">${escHtml(b.occasion)}</div>
          </div>
          <div class="rf-detail-item full">
            <div class="rf-dl">Venue</div>
            <div class="rf-dv">${escHtml(b.venue)}</div>
          </div>
          <div class="rf-detail-item">
            <div class="rf-dl">Rate Type</div>
            <div class="rf-dv">${escHtml(b.rateType)}</div>
          </div>
          <div class="rf-detail-item">
            <div class="rf-dl">Package</div>
            <div class="rf-dv"><span class="rf-pkg-badge">${escHtml(b.package)}</span></div>
          </div>
          ${b.notes ? `<div class="rf-detail-item full"><div class="rf-dl">Notes</div><div class="rf-dv">${escHtml(b.notes)}</div></div>` : ''}
        </div>

        ${ssHTML}
        ${rejectionNote}

        <!-- ✅ FIX: navigate to clientedit.html — no data attributes, no JSON, no crash -->
        <a class="rf-edit-btn" href="clientedit.html?id=${b.id}">
          ✏️ &nbsp; Edit &amp; Resubmit Booking
        </a>

        <div class="rf-submitted-time">Submitted: ${formatDate(b.submittedAt)}</div>
      </div>
    </div>`;
}

// ════════════════════════════════════════════
// TOGGLE CARD
// ════════════════════════════════════════════
function rfToggleCard(id) {
  const body = document.getElementById('rfbody-' + id);
  const chev = document.getElementById('rfchev-' + id);
  if (!body || !chev) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  chev.classList.toggle('open', !isOpen);
}

// ════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════
function rfConfirmLogout() { document.getElementById('rfLogoutModal').classList.add('show'); }
function rfCloseLogout()   { document.getElementById('rfLogoutModal').classList.remove('show'); }
function rfDoLogout() {
  rfCloseLogout();
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
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function showToast(msg) {
  const t = document.getElementById('rfToast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}
