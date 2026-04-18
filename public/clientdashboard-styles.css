/* ============================================================
   clientdashboard-scripts.js
   Auth guard, sidebar, tabs, expandable table, edit modal,
   lightbox, toast, logout.
   ============================================================ */

// ── BOOKING MAP ──────────────────────────────────────────────────────────────
// Stores full booking objects keyed by id.
// The edit button passes only the numeric id — no JSON in HTML attributes.
var _bookingsMap = {};

// ── SAFE HTML ESCAPE (guard in case client-scripts.js loads after) ───────────
if (typeof escHtml === 'undefined') {
  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// ── AUTH GUARD ───────────────────────────────────────────────────────────────
(async function guard() {
  var token = sessionStorage.getItem('client_token');
  if (!token) { window.location.replace('client.html'); return; }
  try {
    var res = await fetch(window.location.origin + '/client/bookings', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.status === 401 || res.status === 403) {
      sessionStorage.removeItem('client_token');
      sessionStorage.removeItem('client_display_name');
      sessionStorage.removeItem('client_username');
      window.location.replace('client.html');
      return;
    }
  } catch (e) {
    // Network error — allow dashboard (offline graceful)
  }
  initDashboard();
})();

function initDashboard() {
  if (typeof initFormPetals === 'function') initFormPetals();
  var dn = sessionStorage.getItem('client_display_name') || '';
  var un = sessionStorage.getItem('client_username') || '';
  var el = document.getElementById('cdWelcome');
  if (el) el.innerHTML = '<strong>' + escHtml(dn || un) + '</strong>@' + escHtml(un);
}

// ── SIDEBAR ──────────────────────────────────────────────────────────────────
function toggleSidebar() {
  var s = document.getElementById('cdSidebar');
  var o = document.getElementById('cdSidebarOverlay');
  var b = document.getElementById('cdHamburger');
  var open = s.classList.toggle('open');
  o.classList.toggle('show', open);
  b.textContent = open ? '✕' : '☰';
}
function closeSidebar() {
  document.getElementById('cdSidebar').classList.remove('open');
  document.getElementById('cdSidebarOverlay').classList.remove('show');
  document.getElementById('cdHamburger').textContent = '☰';
}

// ── TABS ─────────────────────────────────────────────────────────────────────
function showTab(tab) {
  ['tabBooking', 'tabSubmitted', 'tabRejected'].forEach(function (id) {
    document.getElementById(id).style.display = 'none';
  });
  ['navBooking', 'navSubmitted', 'navRejected'].forEach(function (id) {
    document.getElementById(id).classList.remove('active');
  });
  if (tab === 'booking') {
    document.getElementById('tabBooking').style.display = '';
    document.getElementById('navBooking').classList.add('active');
  } else if (tab === 'submitted') {
    document.getElementById('tabSubmitted').style.display = '';
    document.getElementById('navSubmitted').classList.add('active');
    loadSubmissions();
  } else if (tab === 'rejected') {
    document.getElementById('tabRejected').style.display = '';
    document.getElementById('navRejected').classList.add('active');
    loadRejected();
  }
}

// ── STATUS BADGE ─────────────────────────────────────────────────────────────
function statusBadge(status) {
  var map = {
    'pending':   '<span class="status-badge status-pending">⏳ Pending</span>',
    'confirmed': '<span class="status-badge status-approved">✅ Confirmed</span>',
    'approved':  '<span class="status-badge status-approved">✅ Approved</span>',
    'declined':  '<span class="status-badge status-declined">✖ Declined</span>'
  };
  return map[status] || '<span class="status-badge status-pending">' + escHtml(status) + '</span>';
}

// ── EXPANDABLE TABLE ─────────────────────────────────────────────────────────
// Builds a <table> with one summary row + one hidden detail row per booking.
// Only the booking id is passed into onclick — full data is in _bookingsMap.

function buildTable(list, rejected) {
  if (!list.length) {
    var icon = rejected ? '🎉' : '📂';
    var msg  = rejected
      ? "No rejected bookings — you're all good! 🌸"
      : 'No submissions yet.<br>Fill out the Booking Form to get started! 🌸';
    return '<div class="cd-empty"><span class="cd-ei">' + icon + '</span><p>' + msg + '</p></div>';
  }

  var rows = list.map(function (b) {
    return summaryRow(b, rejected) + detailRow(b, rejected);
  }).join('');

  return '<table class="bk-table">'
    + '<thead><tr>'
    + '<th></th>'
    + '<th>Name</th>'
    + '<th class="bk-col-date">Date</th>'
    + '<th class="bk-col-occ">Occasion</th>'
    + '<th>Status</th>'
    + '</tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table>';
}

function summaryRow(b, rejected) {
  return '<tr id="bk-main-' + b.id + '" class="bk-tr-main" onclick="toggleRow(' + b.id + ')">'
    + '<td><span class="bk-chevron" id="bk-chev-' + b.id + '">▶</span></td>'
    + '<td><span class="bk-cell-name">' + escHtml(b.name || '—') + '</span></td>'
    + '<td class="bk-col-date">' + escHtml(b.date || '—') + '</td>'
    + '<td class="bk-col-occ">' + escHtml(b.occasion || '—') + '</td>'
    + '<td>' + statusBadge(b.status || 'pending') + '</td>'
    + '</tr>';
}

function detailRow(b, rejected) {
  // Detail grid fields
  var grid = ''
    + detailItem('📅 Date',        b.date     || '—')
    + detailItem('⏰ Time',        b.perfTime || '—')
    + detailItem('🎉 Occasion',    b.occasion || '—')
    + detailItem('💳 Package',     b.package  || '—');

  if (b.venue) grid += detailItem('📍 Venue', b.venue, true);
  if (b.notes) grid += detailItem('📝 Notes', b.notes, true);

  // Rejection reason
  var reasonHtml = '';
  if (rejected && b.adminNote) {
    reasonHtml = '<div class="bk-reason-box">📋 Reason: ' + escHtml(b.adminNote) + '</div>';
  }

  // GCash screenshot
  var ssHtml = '';
  if (b.gcashScreenshot) {
    ssHtml = '<div class="bk-detail-ss">'
      + '<div class="bk-detail-ss-label">📱 GCash Screenshot — tap to view full size</div>'
      + '<img src="' + escHtml(b.gcashScreenshot) + '" alt="GCash screenshot"'
      + ' onclick="openLightbox(this.src);event.stopPropagation();" />'
      + '</div>';
  }

  // Edit & Resubmit button (rejected only)
  var editHtml = '';
  if (rejected) {
    editHtml = '<button class="bk-btn-edit" onclick="openEditModal(' + b.id + ');event.stopPropagation();">'
      + '✏️ Edit &amp; Resubmit</button>';
  }

  return '<tr id="bk-detail-' + b.id + '" class="bk-tr-detail">'
    + '<td colspan="5">'
    + '<div class="bk-detail-panel">'
    + '<div class="bk-detail-grid">' + grid + '</div>'
    + reasonHtml
    + ssHtml
    + editHtml
    + '</div>'
    + '</td>'
    + '</tr>';
}

function detailItem(label, value, fullWidth) {
  var cls = fullWidth ? 'bk-detail-item bk-detail-full' : 'bk-detail-item';
  return '<div class="' + cls + '">'
    + '<div class="bk-detail-lbl">' + label + '</div>'
    + '<div class="bk-detail-val">' + escHtml(value) + '</div>'
    + '</div>';
}

// ── TOGGLE ROW ───────────────────────────────────────────────────────────────
function toggleRow(id) {
  var detailRow = document.getElementById('bk-detail-' + id);
  var mainRow   = document.getElementById('bk-main-'   + id);
  var chevron   = document.getElementById('bk-chev-'   + id);
  if (!detailRow) return;
  var isOpen = detailRow.classList.toggle('open');
  if (mainRow)  mainRow.classList.toggle('open', isOpen);
  if (chevron)  chevron.classList.toggle('open', isOpen);
}

// ── LOAD SUBMISSIONS ─────────────────────────────────────────────────────────
async function loadSubmissions() {
  var el = document.getElementById('submittedList');
  el.innerHTML = '<div class="cd-spinner-wrap"><div class="cd-spinner"></div></div>';
  try {
    var res = await fetch(window.location.origin + '/client/bookings', {
      headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('client_token') }
    });
    if (res.status === 401 || res.status === 403) { doLogout(); return; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    // Filter out declined — those belong in the Rejected tab
    var list = (Array.isArray(data) ? data : (data.bookings || []))
      .filter(function (b) { return b.status !== 'declined'; });
    el.innerHTML = buildTable(list, false);
  } catch (e) {
    el.innerHTML = '<div class="cd-empty"><span class="cd-ei">⚠️</span>'
      + '<p>Could not load submissions.<br><small>' + escHtml(e.message) + '</small></p></div>';
  }
}

// ── LOAD REJECTED ────────────────────────────────────────────────────────────
async function loadRejected() {
  var el = document.getElementById('rejectedList');
  el.innerHTML = '<div class="cd-spinner-wrap"><div class="cd-spinner"></div></div>';
  try {
    var res = await fetch(window.location.origin + '/client/bookings/rejected', {
      headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('client_token') }
    });
    if (res.status === 401 || res.status === 403) { doLogout(); return; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    var list = Array.isArray(data) ? data : (data.bookings || []);

    // Store in map by id — needed by openEditModal
    _bookingsMap = {};
    list.forEach(function (b) { _bookingsMap[b.id] = b; });

    el.innerHTML = buildTable(list, true);
  } catch (e) {
    el.innerHTML = '<div class="cd-empty"><span class="cd-ei">⚠️</span>'
      + '<p>Could not load rejections.<br><small>' + escHtml(e.message) + '</small></p></div>';
  }
}

// ── LIGHTBOX ─────────────────────────────────────────────────────────────────
function openLightbox(src) {
  document.getElementById('cdLightboxImg').src = src;
  document.getElementById('cdLightbox').classList.add('show');
}
function closeLightbox() {
  document.getElementById('cdLightbox').classList.remove('show');
  document.getElementById('cdLightboxImg').src = '';
}
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { closeLightbox(); closeEditModal(); }
});

// ── EDIT / RESUBMIT MODAL ────────────────────────────────────────────────────
var editNewScreenshot = null;

// Accepts only the booking ID — looks up full data from _bookingsMap.
// SAFE: no JSON ever passes through an HTML onclick attribute.
function openEditModal(id) {
  var b = _bookingsMap[id];
  if (!b) { console.error('Booking not found in map:', id); return; }
  editNewScreenshot = null;

  document.getElementById('editBookingId').value  = b.id;
  document.getElementById('editName').value        = b.name      || '';
  document.getElementById('editDate').value        = b.date      || '';
  document.getElementById('editPerfTime').value    = b.perfTime  || '';
  document.getElementById('editOccasion').value    = b.occasion  || '';
  document.getElementById('editVenue').value       = b.venue     || '';
  document.getElementById('editPackage').value     = b.package   || '';
  document.getElementById('editNotes').value       = b.notes     || '';

  var preview = document.getElementById('editSsPreview');
  if (b.gcashScreenshot) {
    preview.src = b.gcashScreenshot;
    preview.classList.add('show');
  } else {
    preview.src = '';
    preview.classList.remove('show');
  }

  document.getElementById('editSsFile').value = '';
  document.getElementById('editError').classList.remove('show');
  document.getElementById('editError').textContent = '';
  document.getElementById('editSubmitBtn').disabled = false;
  document.getElementById('editSubmitBtn').textContent = '🎀 Resubmit Booking';
  document.getElementById('cdEditOverlay').classList.add('show');
}

function closeEditModal() {
  document.getElementById('cdEditOverlay').classList.remove('show');
  editNewScreenshot = null;
}

function handleEditScreenshot(input) {
  if (!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      var maxDim = 900, w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
        else       { w = Math.round(w * maxDim / h); h = maxDim; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      editNewScreenshot = canvas.toDataURL('image/jpeg', 0.72);
      var preview = document.getElementById('editSsPreview');
      preview.src = editNewScreenshot;
      preview.classList.add('show');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(input.files[0]);
}

async function doResubmit() {
  var id       = document.getElementById('editBookingId').value;
  var name     = document.getElementById('editName').value.trim();
  var date     = document.getElementById('editDate').value.trim();
  var perfTime = document.getElementById('editPerfTime').value.trim();
  var occasion = document.getElementById('editOccasion').value;
  var venue    = document.getElementById('editVenue').value.trim();
  var pkg      = document.getElementById('editPackage').value.trim();
  var notes    = document.getElementById('editNotes').value.trim();
  var errEl    = document.getElementById('editError');
  errEl.classList.remove('show');

  if (!name || !date || !perfTime || !occasion || !venue) {
    errEl.textContent = 'Please fill in all required fields.';
    errEl.classList.add('show');
    return;
  }

  var btn = document.getElementById('editSubmitBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Submitting…';

  try {
    var body = { name: name, date: date, perfTime: perfTime, occasion: occasion, venue: venue, package: pkg, notes: notes };
    if (editNewScreenshot) body.gcashScreenshot = editNewScreenshot;

    var res = await fetch(window.location.origin + '/client/bookings/' + id + '/resubmit', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + sessionStorage.getItem('client_token')
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      var err = await res.json().catch(function () { return {}; });
      errEl.textContent = err.error || 'Could not resubmit. Please try again.';
      errEl.classList.add('show');
      btn.disabled = false;
      btn.textContent = '🎀 Resubmit Booking';
      return;
    }

    closeEditModal();
    showToast('✅ Booking resubmitted! Jeoan will review it shortly 💕');
    loadRejected();
  } catch (e) {
    errEl.textContent = 'Cannot connect to server. Please try again.';
    errEl.classList.add('show');
    btn.disabled = false;
    btn.textContent = '🎀 Resubmit Booking';
  }
}

// ── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg) {
  var t = document.getElementById('cdToast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 3200);
}

// ── LOGOUT ───────────────────────────────────────────────────────────────────
function confirmLogout()  { document.getElementById('logoutModal').classList.add('show'); }
function closeLogoutModal(){ document.getElementById('logoutModal').classList.remove('show'); }
function confirmCancel()   { document.getElementById('cancelModal').classList.add('show'); }
function closeCancelModal(){ document.getElementById('cancelModal').classList.remove('show'); }

function doLogout() {
  closeLogoutModal();
  sessionStorage.removeItem('client_token');
  sessionStorage.removeItem('client_display_name');
  sessionStorage.removeItem('client_username');
  window.location.replace('client.html');
}
