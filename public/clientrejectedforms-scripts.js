// ════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════
const API_BASE          = window.location.origin;
const clientToken       = sessionStorage.getItem('client_token');
const clientDisplayName = sessionStorage.getItem('client_display_name') || '';
const clientUsername    = sessionStorage.getItem('client_username') || '';

// Bookings stored in memory after fetch — keyed by id.
// Button passes only the id. No JSON ever goes in HTML attributes.
let rfBookingsMap   = {};
let rfEditImageData = null;
let rfExistingImage = null;

const rfSongNotes = {
  '1–6 Songs':  'Up to 6 songs 🎵',
  '1–10 Songs': 'Up to 10 songs 🎵',
  '1–15 Songs': 'Up to 15 songs 🎵',
  'Band Sub':   'Rate negotiable',
};
const rfHourNotes = {
  '1 Hour':       '1 hour of performance 🎤',
  '1 Hr 30 Mins': '1.5 hours of performance 🎤',
  '2 Hours':      '2 hours of performance 🎤',
};

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
  if (w) w.innerHTML = '<strong>' + escHtml(clientDisplayName || clientUsername) + '</strong>@' + escHtml(clientUsername);
  rfLoadRejected();
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
    const data = all.filter(function(b) { return b.status === 'declined'; });

    // Save all bookings into the map
    rfBookingsMap = {};
    data.forEach(function(b) { rfBookingsMap[b.id] = b; });

    // Badge
    const badge = document.getElementById('rfBadge');
    if (badge) badge.textContent = data.length || '';

    if (data.length === 0) {
      area.innerHTML =
        '<div class="cd-empty">' +
          '<span class="cd-ei">🎉</span>' +
          '<p>No rejected bookings!<br>All your bookings are looking good. 🌸</p>' +
        '</div>';
      return;
    }

    area.innerHTML = data.map(function(b) { return buildRfCard(b); }).join('');
  } catch (e) {
    area.innerHTML =
      '<div class="cd-empty">' +
        '<span class="cd-ei">⚠️</span>' +
        '<p>Could not load rejected bookings.<br>Please try refreshing the page.</p>' +
      '</div>';
  }
}

// ════════════════════════════════════════════
// BUILD CARD — collapsed by default
// ════════════════════════════════════════════
function buildRfCard(b) {
  var rejectionNote = b.adminNote
    ? '<div class="rf-rejection-note"><div class="rn-head">❌ Rejection Reason</div><div class="rn-body">' + escHtml(b.adminNote) + '</div></div>'
    : '<div class="rf-rejection-note"><div class="rn-head">❌ Declined</div><div class="rn-body rf-no-note">No specific reason provided. Please contact Jeoan for details.</div></div>';

  var ssHTML = b.gcashScreenshot
    ? '<div class="rf-ss-section"><div class="rf-ss-head">📸 GCash Screenshot Submitted</div><img class="rf-ss-img" src="' + b.gcashScreenshot + '" alt="GCash Screenshot"/></div>'
    : '';

  var notesRow = b.notes
    ? '<div class="rf-detail-item full"><div class="rf-dl">Notes</div><div class="rf-dv">' + escHtml(b.notes) + '</div></div>'
    : '';

  return '<div class="rf-card">' +
    '<div class="rf-card-header" onclick="rfToggleCard(' + b.id + ')">' +
      '<span class="rf-status-dot"></span>' +
      '<div class="rf-card-info">' +
        '<div class="rf-card-name">' + escHtml(b.name) + '</div>' +
        '<div class="rf-card-meta">📅 ' + escHtml(b.date) + ' · ' + escHtml(b.occasion) + ' · ' + escHtml(b.package) + '</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">' +
        '<span class="rf-badge">❌ Declined</span>' +
        '<span class="rf-declined-date">Declined ' + formatDateShort(b.updatedAt) + '</span>' +
      '</div>' +
      '<span class="rf-chevron" id="rfchev-' + b.id + '">▼</span>' +
    '</div>' +
    '<div class="rf-card-body" id="rfbody-' + b.id + '">' +
      '<div class="rf-detail-grid">' +
        '<div class="rf-detail-item"><div class="rf-dl">Client Name</div><div class="rf-dv">' + escHtml(b.name) + '</div></div>' +
        '<div class="rf-detail-item"><div class="rf-dl">Event Date</div><div class="rf-dv">' + escHtml(b.date) + '</div></div>' +
        '<div class="rf-detail-item"><div class="rf-dl">Performance Time</div><div class="rf-dv">' + escHtml(b.perfTime) + '</div></div>' +
        '<div class="rf-detail-item"><div class="rf-dl">Occasion</div><div class="rf-dv">' + escHtml(b.occasion) + '</div></div>' +
        '<div class="rf-detail-item full"><div class="rf-dl">Venue</div><div class="rf-dv">' + escHtml(b.venue) + '</div></div>' +
        '<div class="rf-detail-item"><div class="rf-dl">Rate Type</div><div class="rf-dv">' + escHtml(b.rateType) + '</div></div>' +
        '<div class="rf-detail-item"><div class="rf-dl">Package</div><div class="rf-dv"><span class="rf-pkg-badge">' + escHtml(b.package) + '</span></div></div>' +
        notesRow +
      '</div>' +
      ssHTML +
      rejectionNote +
      '<button class="rf-edit-btn" onclick="rfOpenEdit(' + b.id + ')">✏️ &nbsp; Edit &amp; Resubmit Booking</button>' +
      '<div class="rf-submitted-time">Submitted: ' + formatDate(b.submittedAt) + '</div>' +
    '</div>' +
  '</div>';
}

// ════════════════════════════════════════════
// TOGGLE CARD
// ════════════════════════════════════════════
function rfToggleCard(id) {
  var body = document.getElementById('rfbody-' + id);
  var chev = document.getElementById('rfchev-' + id);
  if (!body || !chev) return;
  body.classList.toggle('open');
  chev.classList.toggle('open');
}

// ════════════════════════════════════════════
// EDIT MODAL — reads from rfBookingsMap, never from DOM attributes
// ════════════════════════════════════════════
function rfOpenEdit(id) {
  var booking = rfBookingsMap[id];
  if (!booking) return;

  document.getElementById('rfEditId').value   = booking.id;
  document.getElementById('rfDate').value     = booking.date     || '';
  document.getElementById('rfPerfTime').value = booking.perfTime || '';
  document.getElementById('rfNotes').value    = booking.notes    || '';
  document.getElementById('rfVenue').value    = booking.venue    || '';
  document.getElementById('rfOccasion').value = booking.occasion || '';
  document.getElementById('rfEditError').classList.remove('show');

  var isSong  = booking.rateType && booking.rateType.indexOf('Song') !== -1;
  var rateVal = isSong ? 'song' : 'hour';
  document.querySelector('input[name="rfRateType"][value="' + rateVal + '"]').checked = true;
  rfSwitchRate(true);

  if (isSong) {
    var songSel = document.getElementById('rfSongPkg');
    Array.from(songSel.options).forEach(function(o) {
      if ((booking.package || '').indexOf(o.value.split('|')[0]) === 0) songSel.value = o.value;
    });
    rfShowPrice('song');
  } else {
    var hourSel = document.getElementById('rfHourPkg');
    Array.from(hourSel.options).forEach(function(o) {
      if ((booking.package || '').indexOf(o.value.split('|')[0]) === 0) hourSel.value = o.value;
    });
    rfShowPrice('hour');
  }

  rfExistingImage = booking.gcashScreenshot || null;
  rfEditImageData = null;

  if (rfExistingImage) {
    document.getElementById('rfPreviewImg').src = rfExistingImage;
    document.getElementById('rfPreview').classList.add('show');
    document.getElementById('rfUploadArea').style.display = 'none';
  } else {
    document.getElementById('rfPreview').classList.remove('show');
    document.getElementById('rfUploadArea').style.display = '';
  }
  document.getElementById('rfGcashFile').value = '';

  document.getElementById('rfEditOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function rfCloseEdit() {
  document.getElementById('rfEditOverlay').classList.remove('show');
  document.body.style.overflow = '';
}

// ════════════════════════════════════════════
// RATE / PACKAGE
// ════════════════════════════════════════════
function rfSwitchRate(skipReset) {
  var radio = document.querySelector('input[name="rfRateType"]:checked');
  if (!radio) return;
  var type = radio.value;
  document.getElementById('rfSongBox').classList.toggle('show', type === 'song');
  document.getElementById('rfHourBox').classList.toggle('show', type === 'hour');
  if (!skipReset) {
    document.getElementById('rfSongPkg').value = '';
    document.getElementById('rfHourPkg').value = '';
    document.getElementById('rfSongPrice').classList.remove('show');
    document.getElementById('rfHourPrice').classList.remove('show');
  }
}

function rfShowPrice(type) {
  var sel = document.getElementById(type === 'song' ? 'rfSongPkg' : 'rfHourPkg');
  var tag = document.getElementById(type === 'song' ? 'rfSongPrice' : 'rfHourPrice');
  if (!sel.value) return;
  var parts = sel.value.split('|');
  var label = parts[0], price = parts[1];
  var note  = type === 'song' ? rfSongNotes[label] : rfHourNotes[label];
  tag.innerHTML = '<strong>' + label + ' — ' + price + '</strong><span>' + (note || '') + '</span>';
  tag.classList.add('show');
}

// ════════════════════════════════════════════
// UPLOAD
// ════════════════════════════════════════════
function rfHandleUpload(input) {
  if (!input.files || !input.files[0]) return;
  rfCompressImage(input.files[0], function(dataUrl) {
    rfEditImageData = dataUrl;
    document.getElementById('rfPreviewImg').src = dataUrl;
    document.getElementById('rfPreview').classList.add('show');
    document.getElementById('rfUploadArea').style.display = 'none';
  });
}

function rfClearUpload() {
  rfEditImageData = null;
  rfExistingImage = null;
  document.getElementById('rfPreview').classList.remove('show');
  document.getElementById('rfPreviewImg').src = '';
  document.getElementById('rfUploadArea').style.display = '';
  document.getElementById('rfGcashFile').value = '';
}

function rfCompressImage(file, callback) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var maxDim = 900, w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
        else       { w = Math.round(w * maxDim / h); h = maxDim; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ════════════════════════════════════════════
// SUBMIT
// ════════════════════════════════════════════
async function rfSubmitEdit() {
  var errEl = document.getElementById('rfEditError');
  errEl.classList.remove('show');

  var id       = document.getElementById('rfEditId').value;
  var date     = document.getElementById('rfDate').value.trim();
  var perfTime = document.getElementById('rfPerfTime').value.trim();
  var occasion = document.getElementById('rfOccasion').value;
  var venue    = document.getElementById('rfVenue').value.trim();
  var notes    = document.getElementById('rfNotes').value.trim();
  var radio    = document.querySelector('input[name="rfRateType"]:checked');

  if (!date || !perfTime || !occasion || !venue || !radio) {
    errEl.textContent = 'Please fill in all required fields.';
    errEl.classList.add('show'); return;
  }
  var pkgVal = radio.value === 'song'
    ? document.getElementById('rfSongPkg').value
    : document.getElementById('rfHourPkg').value;
  if (!pkgVal) {
    errEl.textContent = 'Please select a package.';
    errEl.classList.add('show'); return;
  }
  var screenshot = rfEditImageData || rfExistingImage;
  if (!screenshot) {
    errEl.textContent = 'Please upload a GCash screenshot.';
    errEl.classList.add('show'); return;
  }

  var parts     = pkgVal.split('|');
  var pkg       = parts[0] + ' — ' + parts[1];
  var rateLabel = radio.value === 'song' ? '🎵 Per Song' : '⏱️ Per Hour';

  var btn = document.getElementById('rfResubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="rf-spinner"></span> Resubmitting…';

  try {
    var res = await fetch(API_BASE + '/client/bookings/' + id + '/resubmit', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + clientToken
      },
      body: JSON.stringify({
        date: date, perfTime: perfTime, occasion: occasion,
        venue: venue, notes: notes,
        rateType: rateLabel, package: pkg, gcashScreenshot: screenshot
      })
    });
    if (!res.ok) {
      var err = await res.json().catch(function() { return {}; });
      errEl.textContent = err.error || 'Could not resubmit. Please try again.';
      errEl.classList.add('show');
      btn.disabled = false;
      btn.innerHTML = '🎀 &nbsp; Resubmit Booking';
      return;
    }
    rfCloseEdit();
    showToast('🎀 Booking resubmitted! Jeoan will review it shortly.');
    rfLoadRejected();
  } catch (e) {
    errEl.textContent = 'Cannot connect to server. Please try again.';
    errEl.classList.add('show');
    btn.disabled = false;
    btn.innerHTML = '🎀 &nbsp; Resubmit Booking';
  }
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
  var d = new Date(iso);
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
  var t = document.getElementById('rfToast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 3500);
}
