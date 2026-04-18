// ════════════════════════════════════════════
// clientedit-scripts.js
// Fetches the booking by ?id= from the URL,
// populates the form, and handles resubmit.
// ════════════════════════════════════════════

const API_BASE          = window.location.origin;
const clientToken       = sessionStorage.getItem('client_token');
const clientDisplayName = sessionStorage.getItem('client_display_name') || '';
const clientUsername    = sessionStorage.getItem('client_username') || '';

// Get booking ID from ?id=
const urlParams    = new URLSearchParams(window.location.search);
const ceBookingId  = urlParams.get('id');

let ceEditImageData  = null;  // newly uploaded image (null = keep existing)
let ceExistingImage  = null;  // image already on the booking

const ceSongNotes = {
  '1–6 Songs':  'Up to 6 songs 🎵',
  '1–10 Songs': 'Up to 10 songs 🎵',
  '1–15 Songs': 'Up to 15 songs 🎵',
  'Band Sub':   'Rate negotiable',
};
const ceHourNotes = {
  '1 Hour':        '1 hour of performance 🎤',
  '1 Hr 30 Mins':  '1.5 hours of performance 🎤',
  '2 Hours':       '2 hours of performance 🎤',
};

// ── Auth + ID guard ─────────────────────────
if (!clientToken) {
  window.location.href = 'clientdashboard.html';
} else if (!ceBookingId) {
  window.location.href = 'clientrejectedforms.html';
} else {
  ceInitPage();
}

// ════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════
function ceInitPage() {
  const w = document.getElementById('ceWelcome');
  if (w) w.innerHTML = `<strong>${escHtml(clientDisplayName || clientUsername)}</strong>@${escHtml(clientUsername)}`;
  ceLoadBooking();
}

// ════════════════════════════════════════════
// FETCH BOOKING
// ════════════════════════════════════════════
async function ceLoadBooking() {
  const loadArea = document.getElementById('ceLoadArea');
  const formArea = document.getElementById('ceFormArea');

  try {
    const res = await fetch(`${API_BASE}/client/bookings`, {
      headers: { 'Authorization': 'Bearer ' + clientToken }
    });
    if (!res.ok) throw new Error('fetch failed');

    const all     = await res.json();
    const booking = all.find(b => String(b.id) === String(ceBookingId));

    if (!booking) {
      loadArea.innerHTML = `
        <div class="cd-empty">
          <span class="cd-ei">⚠️</span>
          <p>Booking not found.<br><a href="clientrejectedforms.html">← Go back</a></p>
        </div>`;
      return;
    }
    if (booking.status !== 'declined') {
      loadArea.innerHTML = `
        <div class="cd-empty">
          <span class="cd-ei">ℹ️</span>
          <p>This booking is not in a rejected state.<br><a href="clientrejectedforms.html">← Go back</a></p>
        </div>`;
      return;
    }

    // Hide spinner, show form
    loadArea.style.display = 'none';
    formArea.style.display = '';

    cePopulateForm(booking);
  } catch (e) {
    loadArea.innerHTML = `
      <div class="cd-empty">
        <span class="cd-ei">⚠️</span>
        <p>Could not load booking.<br>Please try refreshing.</p>
      </div>`;
  }
}

// ════════════════════════════════════════════
// POPULATE FORM
// ════════════════════════════════════════════
function cePopulateForm(b) {
  // Rejection banner
  if (b.adminNote) {
    document.getElementById('ceRejectionText').textContent = b.adminNote;
    document.getElementById('ceRejectionBanner').style.display = '';
  }

  document.getElementById('ceDate').value     = b.date     || '';
  document.getElementById('cePerfTime').value = b.perfTime || '';
  document.getElementById('ceNotes').value    = b.notes    || '';
  document.getElementById('ceVenue').value    = b.venue    || '';

  // Occasion
  const occSel = document.getElementById('ceOccasion');
  occSel.value = b.occasion || '';

  // Rate type + package
  const isSong = b.rateType && b.rateType.includes('Song');
  const rateVal = isSong ? 'song' : 'hour';
  document.querySelector(`input[name="ceRateType"][value="${rateVal}"]`).checked = true;
  ceSwitchRate(/* skipReset= */ true);

  const pkg = b.package || '';
  if (isSong) {
    const songSel = document.getElementById('ceSongPkg');
    Array.from(songSel.options).forEach(o => {
      if (pkg.startsWith(o.value.split('|')[0])) songSel.value = o.value;
    });
    ceShowPrice('song');
  } else {
    const hourSel = document.getElementById('ceHourPkg');
    Array.from(hourSel.options).forEach(o => {
      if (pkg.startsWith(o.value.split('|')[0])) hourSel.value = o.value;
    });
    ceShowPrice('hour');
  }

  // Screenshot
  ceExistingImage = b.gcashScreenshot || null;
  ceEditImageData = null;
  if (ceExistingImage) {
    document.getElementById('cePreviewImg').src = ceExistingImage;
    document.getElementById('cePreview').classList.add('show');
    document.getElementById('ceUploadArea').style.display = 'none';
  } else {
    document.getElementById('cePreview').classList.remove('show');
    document.getElementById('ceUploadArea').style.display = '';
  }
  document.getElementById('ceGcashFile').value = '';
}

// ════════════════════════════════════════════
// RATE / PACKAGE LOGIC
// ════════════════════════════════════════════
function ceSwitchRate(skipReset) {
  const radio = document.querySelector('input[name="ceRateType"]:checked');
  if (!radio) return;
  const type = radio.value;
  document.getElementById('ceSongBox').classList.toggle('show', type === 'song');
  document.getElementById('ceHourBox').classList.toggle('show', type === 'hour');
  if (!skipReset) {
    document.getElementById('ceSongPkg').value = '';
    document.getElementById('ceHourPkg').value = '';
    document.getElementById('ceSongPrice').classList.remove('show');
    document.getElementById('ceHourPrice').classList.remove('show');
  }
}

function ceShowPrice(type) {
  const sel = document.getElementById(type === 'song' ? 'ceSongPkg' : 'ceHourPkg');
  const tag = document.getElementById(type === 'song' ? 'ceSongPrice' : 'ceHourPrice');
  if (!sel.value) return;
  const parts = sel.value.split('|');
  const label = parts[0], price = parts[1];
  const note  = type === 'song' ? ceSongNotes[label] : ceHourNotes[label];
  tag.innerHTML = `<strong>${label} — ${price}</strong><span>${note || ''}</span>`;
  tag.classList.add('show');
}

// ════════════════════════════════════════════
// UPLOAD HANDLING
// ════════════════════════════════════════════
function ceHandleUpload(input) {
  if (!input.files || !input.files[0]) return;
  ceCompressImage(input.files[0], function (dataUrl) {
    ceEditImageData = dataUrl;
    document.getElementById('cePreviewImg').src = dataUrl;
    document.getElementById('cePreview').classList.add('show');
    document.getElementById('ceUploadArea').style.display = 'none';
  });
}

function ceClearUpload() {
  ceEditImageData = null;
  ceExistingImage = null;
  document.getElementById('cePreview').classList.remove('show');
  document.getElementById('cePreviewImg').src = '';
  document.getElementById('ceUploadArea').style.display = '';
  document.getElementById('ceGcashFile').value = '';
}

function ceCompressImage(file, callback) {
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
// SUBMIT
// ════════════════════════════════════════════
async function ceSubmit() {
  const errEl = document.getElementById('ceError');
  errEl.classList.remove('show');

  const date     = document.getElementById('ceDate').value.trim();
  const perfTime = document.getElementById('cePerfTime').value.trim();
  const occasion = document.getElementById('ceOccasion').value;
  const venue    = document.getElementById('ceVenue').value.trim();
  const notes    = document.getElementById('ceNotes').value.trim();
  const radio    = document.querySelector('input[name="ceRateType"]:checked');

  if (!date || !perfTime || !occasion || !venue || !radio) {
    errEl.textContent = 'Please fill in all required fields.';
    errEl.classList.add('show'); return;
  }

  const pkgVal = radio.value === 'song'
    ? document.getElementById('ceSongPkg').value
    : document.getElementById('ceHourPkg').value;
  if (!pkgVal) {
    errEl.textContent = 'Please select a package.';
    errEl.classList.add('show'); return;
  }

  const screenshot = ceEditImageData || ceExistingImage;
  if (!screenshot) {
    errEl.textContent = 'Please upload a GCash screenshot.';
    errEl.classList.add('show'); return;
  }

  const parts     = pkgVal.split('|');
  const pkg       = parts[0] + ' — ' + parts[1];
  const rateLabel = radio.value === 'song' ? '🎵 Per Song' : '⏱️ Per Hour';

  const btn = document.getElementById('ceSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="ce-spinner"></span> Resubmitting…';

  try {
    const res = await fetch(`${API_BASE}/client/bookings/${ceBookingId}/resubmit`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + clientToken
      },
      body: JSON.stringify({
        date, perfTime, occasion, venue, notes,
        rateType: rateLabel,
        package: pkg,
        gcashScreenshot: screenshot
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      errEl.textContent = err.error || 'Could not resubmit. Please try again.';
      errEl.classList.add('show');
      btn.disabled = false;
      btn.innerHTML = '🎀 &nbsp; Resubmit Booking';
      return;
    }

    // Success — go back to rejected list with a toast param
    window.location.href = 'clientrejectedforms.html?resubmitted=1';

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
function ceConfirmLogout() { document.getElementById('ceLogoutModal').classList.add('show'); }
function ceCloseLogout()   { document.getElementById('ceLogoutModal').classList.remove('show'); }
function ceDoLogout() {
  ceCloseLogout();
  sessionStorage.removeItem('client_token');
  sessionStorage.removeItem('client_display_name');
  sessionStorage.removeItem('client_username');
  window.location.href = 'clientdashboard.html';
}

// ════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════
function escHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function showToast(msg) {
  const t = document.getElementById('ceToast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}
