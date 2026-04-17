// ════════════════════════════════════════════
// STATE — declared first
// ════════════════════════════════════════════
const API_BASE          = window.location.origin;
const clientToken       = sessionStorage.getItem('client_token');
const clientDisplayName = sessionStorage.getItem('client_display_name') || '';
const clientUsername    = sessionStorage.getItem('client_username') || '';

let rfOpenCardId      = null;
let rfEditImageData   = null;  // new upload (null = keep existing)
let rfExistingImage   = null;  // existing screenshot on the booking

const rfSongNotes = {
  '1–6 Songs':  'Up to 6 songs 🎵', '1–10 Songs': 'Up to 10 songs 🎵',
  '1–15 Songs': 'Up to 15 songs 🎵', 'Band Sub': 'Rate negotiable',
};
const rfHourNotes = {
  '1 Hour': '1 hour of performance 🎤',
  '1 Hr 30 Mins': '1.5 hours of performance 🎤',
  '2 Hours': '2 hours of performance 🎤',
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
  if (w) w.innerHTML = `<strong>${escHtml(clientDisplayName || clientUsername)}</strong>@${escHtml(clientUsername)}`;
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
    if (rfOpenCardId) {
      const body = document.getElementById('rfbody-' + rfOpenCardId);
      const chev = document.getElementById('rfchev-' + rfOpenCardId);
      if (body) body.classList.add('open');
      if (chev) chev.classList.add('open');
    }
  } catch (e) {
    area.innerHTML = `
      <div class="cd-empty">
        <span class="cd-ei">⚠️</span>
        <p>Could not load rejected bookings.<br>Please try refreshing the page.</p>
      </div>`;
  }
}

// ════════════════════════════════════════════
// BUILD CARD HTML
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

  // Store booking data on the button via data attributes (JSON-safe subset)
  const dataJson = escHtml(JSON.stringify({
    id: b.id, date: b.date, perfTime: b.perfTime, occasion: b.occasion,
    venue: b.venue, rateType: b.rateType, package: b.package,
    notes: b.notes || '', gcashScreenshot: b.gcashScreenshot || ''
  }));

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
      <div class="rf-card-body" id="rfbody-${b.id}">
        <div class="rf-detail-grid">
          <div class="rf-detail-item"><div class="rf-dl">Client Name</div><div class="rf-dv">${escHtml(b.name)}</div></div>
          <div class="rf-detail-item"><div class="rf-dl">Event Date</div><div class="rf-dv">${escHtml(b.date)}</div></div>
          <div class="rf-detail-item"><div class="rf-dl">Performance Time</div><div class="rf-dv">${escHtml(b.perfTime)}</div></div>
          <div class="rf-detail-item"><div class="rf-dl">Occasion</div><div class="rf-dv">${escHtml(b.occasion)}</div></div>
          <div class="rf-detail-item full"><div class="rf-dl">Venue</div><div class="rf-dv">${escHtml(b.venue)}</div></div>
          <div class="rf-detail-item"><div class="rf-dl">Rate Type</div><div class="rf-dv">${escHtml(b.rateType)}</div></div>
          <div class="rf-detail-item"><div class="rf-dl">Package</div><div class="rf-dv"><span class="rf-pkg-badge">${escHtml(b.package)}</span></div></div>
          ${b.notes ? `<div class="rf-detail-item full"><div class="rf-dl">Notes</div><div class="rf-dv">${escHtml(b.notes)}</div></div>` : ''}
        </div>
        ${ssHTML}
        ${rejectionNote}
        <button class="rf-edit-btn" data-booking='${dataJson}' onclick="rfOpenEdit(this)">
          ✏️ &nbsp; Edit &amp; Resubmit Booking
        </button>
        <div class="rf-submitted-time">Submitted: ${formatDate(b.submittedAt)}</div>
      </div>
    </div>`;
}

function rfToggleCard(id) {
  const body = document.getElementById('rfbody-' + id);
  const chev = document.getElementById('rfchev-' + id);
  const isOpen = body.classList.contains('open');
  if (isOpen) {
    body.classList.remove('open'); chev.classList.remove('open'); rfOpenCardId = null;
  } else {
    body.classList.add('open');   chev.classList.add('open');    rfOpenCardId = id;
  }
}

// ════════════════════════════════════════════
// EDIT MODAL — OPEN / CLOSE / POPULATE
// ════════════════════════════════════════════
function rfOpenEdit(btn) {
  const booking = JSON.parse(btn.getAttribute('data-booking').replace(/&quot;/g, '"'));
  // Populate fields
  document.getElementById('rfEditId').value   = booking.id;
  document.getElementById('rfDate').value     = booking.date    || '';
  document.getElementById('rfPerfTime').value = booking.perfTime|| '';
  document.getElementById('rfNotes').value    = booking.notes   || '';
  document.getElementById('rfEditError').classList.remove('show');

  // Occasion
  const occSel = document.getElementById('rfOccasion');
  occSel.value = booking.occasion || '';

  // Venue
  document.getElementById('rfVenue').value = booking.venue || '';

  // Rate type + package
  const pkg = booking.package || '';
  const isSong = booking.rateType && booking.rateType.includes('Song');
  const rateVal = isSong ? 'song' : 'hour';
  document.querySelector(`input[name="rfRateType"][value="${rateVal}"]`).checked = true;
  rfSwitchRate();
  // Try to match the package value
  if (isSong) {
    const songSel = document.getElementById('rfSongPkg');
    Array.from(songSel.options).forEach(o => {
      if (pkg.startsWith(o.value.split('|')[0])) songSel.value = o.value;
    });
    rfShowPrice('song');
  } else {
    const hourSel = document.getElementById('rfHourPkg');
    Array.from(hourSel.options).forEach(o => {
      if (pkg.startsWith(o.value.split('|')[0])) hourSel.value = o.value;
    });
    rfShowPrice('hour');
  }

  // Existing screenshot
  rfExistingImage  = booking.gcashScreenshot || null;
  rfEditImageData  = null;
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
// EDIT FORM LOGIC
// ════════════════════════════════════════════
function rfSwitchRate() {
  const radio = document.querySelector('input[name="rfRateType"]:checked');
  if (!radio) return;
  const type = radio.value;
  document.getElementById('rfSongBox').classList.toggle('show', type === 'song');
  document.getElementById('rfHourBox').classList.toggle('show', type === 'hour');
  document.getElementById('rfSongPkg').value = '';
  document.getElementById('rfHourPkg').value = '';
  document.getElementById('rfSongPrice').classList.remove('show');
  document.getElementById('rfHourPrice').classList.remove('show');
}

function rfShowPrice(type) {
  const sel   = document.getElementById(type === 'song' ? 'rfSongPkg' : 'rfHourPkg');
  const tag   = document.getElementById(type === 'song' ? 'rfSongPrice' : 'rfHourPrice');
  if (!sel.value) return;
  const parts = sel.value.split('|');
  const label = parts[0], price = parts[1];
  const note  = type === 'song' ? rfSongNotes[label] : rfHourNotes[label];
  tag.innerHTML = '<strong>' + label + ' — ' + price + '</strong><span>' + (note || '') + '</span>';
  tag.classList.add('show');
}

function rfHandleUpload(input) {
  if (!input.files || !input.files[0]) return;
  rfCompressImage(input.files[0], function (dataUrl) {
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
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const maxDim = 900;
      let w = img.width, h = img.height;
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
// SUBMIT EDIT
// ════════════════════════════════════════════
async function rfSubmitEdit() {
  const errEl = document.getElementById('rfEditError');
  errEl.classList.remove('show');

  const id       = document.getElementById('rfEditId').value;
  const date     = document.getElementById('rfDate').value.trim();
  const perfTime = document.getElementById('rfPerfTime').value.trim();
  const occasion = document.getElementById('rfOccasion').value;
  const venue    = document.getElementById('rfVenue').value.trim();
  const notes    = document.getElementById('rfNotes').value.trim();
  const radio    = document.querySelector('input[name="rfRateType"]:checked');

  // Validation
  if (!date || !perfTime || !occasion || !venue || !radio) {
    errEl.textContent = 'Please fill in all required fields.';
    errEl.classList.add('show'); return;
  }
  const pkgVal = radio.value === 'song'
    ? document.getElementById('rfSongPkg').value
    : document.getElementById('rfHourPkg').value;
  if (!pkgVal) {
    errEl.textContent = 'Please select a package.';
    errEl.classList.add('show'); return;
  }
  const screenshot = rfEditImageData || rfExistingImage;
  if (!screenshot) {
    errEl.textContent = 'Please upload a GCash screenshot.';
    errEl.classList.add('show'); return;
  }

  const parts     = pkgVal.split('|');
  const pkg       = parts[0] + ' — ' + parts[1];
  const rateLabel = radio.value === 'song' ? '🎵 Per Song' : '⏱️ Per Hour';

  const btn = document.getElementById('rfResubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="rf-spinner"></span> Resubmitting…';

  try {
    const res = await fetch(API_BASE + '/client/bookings/' + id + '/resubmit', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + clientToken },
      body: JSON.stringify({
        date, perfTime, occasion, venue, notes,
        rateType: rateLabel, package: pkg, gcashScreenshot: screenshot
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      errEl.textContent = err.error || 'Could not resubmit. Please try again.';
      errEl.classList.add('show');
      btn.disabled = false; btn.innerHTML = '🎀 &nbsp; Resubmit Booking'; return;
    }
    rfCloseEdit();
    showToast('🎀 Booking resubmitted! Jeoan will review it shortly.');
    rfLoadRejected(); // Refresh the list
  } catch (e) {
    errEl.textContent = 'Cannot connect to server. Please try again.';
    errEl.classList.add('show');
    btn.disabled = false; btn.innerHTML = '🎀 &nbsp; Resubmit Booking';
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
  const t = document.getElementById('rfToast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
