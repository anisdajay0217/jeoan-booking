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
  sfInitPage();
}

// ════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════
function sfInitPage() {
  const w = document.getElementById('sfWelcome');
  if (w) w.innerHTML = '<strong>' + escHtml(clientDisplayName || clientUsername) + '</strong>@' + escHtml(clientUsername);
  sfLoadSubmissions();
}

// ════════════════════════════════════════════
// FETCH & RENDER
// ════════════════════════════════════════════
async function sfLoadSubmissions() {
  const area = document.getElementById('submissionsArea');
  area.innerHTML = '<div class="cd-spinner-wrap"><div class="cd-spinner"></div></div>';
  try {
    const res = await fetch(API_BASE + '/client/bookings', {
      headers: { 'Authorization': 'Bearer ' + clientToken }
    });
    // Session expired or invalid token — send back to login
    if (res.status === 401 || res.status === 403) {
      sessionStorage.removeItem('client_token');
      sessionStorage.removeItem('client_display_name');
      sessionStorage.removeItem('client_username');
      window.location.href = 'clientdashboard.html';
      return;
    }
    if (!res.ok) throw new Error('fetch failed');
    const all = await res.json();

    // IMPORTANT: exclude declined — those belong in clientrejectedforms.html
    const data = all.filter(function(b) { return b.status !== 'declined'; });

    if (data.length === 0) {
      area.innerHTML =
        '<div class="cd-empty">' +
          '<span class="cd-ei">📂</span>' +
          '<p>No submissions yet!<br>Submit a booking form to get started. 🌸</p>' +
        '</div>';
      return;
    }

    area.innerHTML = data.map(function(b) { return buildSfCard(b); }).join('');
  } catch (e) {
    area.innerHTML =
      '<div class="cd-empty">' +
        '<span class="cd-ei">⚠️</span>' +
        '<p>Could not load submissions.<br>Please try refreshing the page.</p>' +
      '</div>';
  }
}

// ════════════════════════════════════════════
// BUILD CARD
// ════════════════════════════════════════════
function buildSfCard(b) {
  const statusClass = b.status === 'confirmed' ? 'confirmed'
                    : b.status === 'pending'   ? 'pending'
                    : 'no-ss';
  const statusLabel = b.status === 'confirmed' ? '✅ Confirmed'
                    : b.status === 'pending'   ? '⏳ Pending'
                    : '⚠️ Awaiting Screenshot';

  const ssHTML = b.gcashScreenshot
    ? '<div class="sf-ss-section"><div class="sf-ss-head">📸 GCash Screenshot</div><img class="sf-ss-img" src="' + b.gcashScreenshot + '" alt="GCash Screenshot"/></div>'
    : '<div class="sf-ss-section"><div class="sf-no-ss">⚠️ No GCash screenshot uploaded yet.</div></div>';

  const adminNoteHTML = b.adminNote
    ? '<div class="sf-admin-note"><div class="sf-an-head">📝 Admin Note</div><div class="sf-an-body">' + escHtml(b.adminNote) + '</div></div>'
    : '';

  const notesRow = b.notes
    ? '<div class="sf-detail-item full"><div class="sf-dl">Notes</div><div class="sf-dv">' + escHtml(b.notes) + '</div></div>'
    : '';

  return '<div class="sf-card">' +
    '<div class="sf-card-header" onclick="sfToggleCard(\'' + b.id + '\')">' +
      '<span class="sf-status-dot ' + statusClass + '"></span>' +
      '<div class="sf-card-info">' +
        '<div class="sf-card-name">' + escHtml(b.name) + '</div>' +
        '<div class="sf-card-meta">📅 ' + escHtml(b.date) + ' · ' + escHtml(b.occasion) + ' · ' + escHtml(b.package) + '</div>' +
      '</div>' +
      '<span class="sf-badge ' + statusClass + '">' + statusLabel + '</span>' +
      '<span class="sf-chevron" id="sfchev-' + b.id + '">▼</span>' +
    '</div>' +
    '<div class="sf-card-body" id="sfbody-' + b.id + '">' +
      '<div class="sf-detail-grid">' +
        '<div class="sf-detail-item"><div class="sf-dl">Client Name</div><div class="sf-dv">' + escHtml(b.name) + '</div></div>' +
        '<div class="sf-detail-item"><div class="sf-dl">Event Date</div><div class="sf-dv">' + escHtml(b.date) + '</div></div>' +
        '<div class="sf-detail-item"><div class="sf-dl">Performance Time</div><div class="sf-dv">' + escHtml(b.perfTime) + '</div></div>' +
        '<div class="sf-detail-item"><div class="sf-dl">Occasion</div><div class="sf-dv">' + escHtml(b.occasion) + '</div></div>' +
        '<div class="sf-detail-item full"><div class="sf-dl">Venue</div><div class="sf-dv">' + escHtml(b.venue) + '</div></div>' +
        '<div class="sf-detail-item"><div class="sf-dl">Rate Type</div><div class="sf-dv">' + escHtml(b.rateType) + '</div></div>' +
        '<div class="sf-detail-item"><div class="sf-dl">Package</div><div class="sf-dv"><span class="sf-pkg-badge">' + escHtml(b.package) + '</span></div></div>' +
        notesRow +
      '</div>' +
      ssHTML +
      adminNoteHTML +
      '<div class="sf-submitted-time">Submitted: ' + formatDate(b.submittedAt) + '</div>' +
    '</div>' +
  '</div>';
}

// ════════════════════════════════════════════
// TOGGLE CARD
// ════════════════════════════════════════════
function sfToggleCard(id) {
  const body = document.getElementById('sfbody-' + id);
  const chev = document.getElementById('sfchev-' + id);
  if (!body || !chev) return;
  body.classList.toggle('open');
  chev.classList.toggle('open');
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
function escHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function showToast(msg) {
  const t = document.getElementById('sfToast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 3500);
}
