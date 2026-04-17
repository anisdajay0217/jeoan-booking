// ════════════════════════════════════════════
// STATE — all declared first to avoid TDZ
// ════════════════════════════════════════════
const API_BASE = window.location.origin;
let clientToken       = sessionStorage.getItem('client_token') || null;
let clientDisplayName = sessionStorage.getItem('client_display_name') || '';
let clientUsername    = sessionStorage.getItem('client_username') || '';
let pendingImageData  = null;

// ════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════
(function init() {
  spawnLoginPetals();
  spawnSparkles();
  if (clientToken) {
    showDashboard();
  }
})();

// ════════════════════════════════════════════
// AUTH — LOGIN / LOGOUT
// ════════════════════════════════════════════
async function doClientLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  const btn   = document.getElementById('loginBtn');
  errEl.classList.remove('show');
  if (!username || !password) {
    errEl.textContent = 'Please enter your username and password.';
    errEl.classList.add('show'); return;
  }
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Signing in…';
  try {
    const res  = await fetch(API_BASE + '/client/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || 'Login failed. Please try again.';
      errEl.classList.add('show');
      btn.disabled = false; btn.innerHTML = '🔑 &nbsp; Sign In'; return;
    }
    clientToken       = data.token;
    clientDisplayName = data.displayName;
    clientUsername    = data.username;
    sessionStorage.setItem('client_token',        clientToken);
    sessionStorage.setItem('client_display_name', clientDisplayName);
    sessionStorage.setItem('client_username',     clientUsername);
    showDashboard();
  } catch (e) {
    errEl.textContent = 'Cannot connect to server. Please try again.';
    errEl.classList.add('show');
    btn.disabled = false; btn.innerHTML = '🔑 &nbsp; Sign In';
  }
}

function showDashboard() {
  const lp = document.getElementById('loginPage');
  lp.classList.add('hide');
  setTimeout(() => {
    document.getElementById('dashPage').style.display = 'block';
    initFormPetals();
    const welcomeEl = document.getElementById('cdWelcome');
    if (welcomeEl) {
      welcomeEl.innerHTML = `<strong>${escHtml(clientDisplayName || clientUsername)}</strong>@${escHtml(clientUsername)}`;
    }
  }, 300);
}

function confirmLogout()  { document.getElementById('logoutModal').classList.add('show'); }
function closeLogoutModal(){ document.getElementById('logoutModal').classList.remove('show'); }

function doLogout() {
  closeLogoutModal();
  clientToken = null; clientDisplayName = ''; clientUsername = '';
  sessionStorage.removeItem('client_token');
  sessionStorage.removeItem('client_display_name');
  sessionStorage.removeItem('client_username');
  document.getElementById('dashPage').style.display = 'none';
  document.getElementById('thankYouPage').classList.remove('show');
  const lp = document.getElementById('loginPage');
  lp.classList.remove('hide');
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginBtn').disabled = false;
  document.getElementById('loginBtn').innerHTML = '🔑 &nbsp; Sign In';
  document.getElementById('loginError').classList.remove('show');
}

// ════════════════════════════════════════════
// CANCEL FORM
// ════════════════════════════════════════════
function confirmCancel()  { document.getElementById('cancelModal').classList.add('show'); }
function closeCancelModal(){ document.getElementById('cancelModal').classList.remove('show'); }

function doCancelForm() {
  closeCancelModal();
  ['clientName','eventDate','perfTime','venue','notes'].forEach(id =>
    (document.getElementById(id).value = ''));
  document.getElementById('occasion').value = '';
  document.querySelectorAll('input[name="rateType"]').forEach(r => r.checked = false);
  document.getElementById('songBox').classList.remove('show');
  document.getElementById('hourBox').classList.remove('show');
  document.getElementById('songPkg').value = '';
  document.getElementById('hourPkg').value = '';
  document.getElementById('songPrice').classList.remove('show');
  document.getElementById('hourPrice').classList.remove('show');
  document.getElementById('agreeCheck').checked = false;
  document.getElementById('customCB').classList.remove('checked');
  pendingImageData = null;
  document.getElementById('gcashPreview').classList.remove('show');
  document.getElementById('gcashPreviewImg').src = '';
  document.getElementById('uploadArea').style.display = '';
  document.getElementById('gcashFile').value = '';
  document.getElementById('submitBtn').disabled = true;
  updateSubmitHint();
  window.scrollTo(0, 0);
}

// ════════════════════════════════════════════
// BOOKING FORM LOGIC
// ════════════════════════════════════════════
function switchRate() {
  const type = document.querySelector('input[name="rateType"]:checked').value;
  document.getElementById('songBox').classList.toggle('show', type === 'song');
  document.getElementById('hourBox').classList.toggle('show', type === 'hour');
  document.getElementById('songPkg').value = '';
  document.getElementById('hourPkg').value = '';
  document.getElementById('songPrice').classList.remove('show');
  document.getElementById('hourPrice').classList.remove('show');
  updateSubmitHint();
}

const songNotes = {
  '1–6 Songs':  'Up to 6 songs of live performance 🎵',
  '1–10 Songs': 'Up to 10 songs of live performance 🎵',
  '1–15 Songs': 'Up to 15 songs of live performance 🎵',
  'Band Sub':   'Rate is negotiable — please discuss with Jeoan',
};
const hourNotes = {
  '1 Hour':        '1 hour of live performance 🎤',
  '1 Hr 30 Mins':  '1 hour and 30 minutes of live performance 🎤',
  '2 Hours':       '2 hours of live performance 🎤',
};

function showPrice(type) {
  const sel  = document.getElementById(type === 'song' ? 'songPkg'   : 'hourPkg');
  const tag  = document.getElementById(type === 'song' ? 'songPrice' : 'hourPrice');
  const parts = sel.value.split('|');
  const label = parts[0], price = parts[1];
  const note  = type === 'song' ? songNotes[label] : hourNotes[label];
  tag.innerHTML = '<strong>' + label + ' — ' + price + '</strong><span>' + (note || '') + '</span>';
  tag.classList.add('show');
  updateSubmitHint();
}

function toggleCB() {
  setTimeout(() => {
    const cb = document.getElementById('agreeCheck');
    document.getElementById('customCB').classList.toggle('checked', cb.checked);
    updateSubmitHint();
  }, 0);
}

function isFormValid() {
  const name    = document.getElementById('clientName').value.trim();
  const date    = document.getElementById('eventDate').value.trim();
  const perf    = document.getElementById('perfTime').value.trim();
  const occ     = document.getElementById('occasion').value;
  const venue   = document.getElementById('venue').value.trim();
  const agreed  = document.getElementById('agreeCheck').checked;
  const radio   = document.querySelector('input[name="rateType"]:checked');
  let   pkgOk   = false;
  if (radio) {
    const v = radio.value === 'song'
      ? document.getElementById('songPkg').value
      : document.getElementById('hourPkg').value;
    pkgOk = !!v;
  }
  return !!(name && date && perf && occ && venue && agreed && radio && pkgOk && pendingImageData);
}

function getMissingFields() {
  const missing = [];
  if (!document.getElementById('clientName').value.trim()) missing.push('Client Name');
  if (!document.getElementById('eventDate').value.trim())  missing.push('Event Date');
  if (!document.getElementById('perfTime').value.trim())   missing.push('Performance Time');
  if (!document.getElementById('occasion').value)          missing.push('Event Occasion');
  if (!document.getElementById('venue').value.trim())      missing.push('Venue Address');
  const radio = document.querySelector('input[name="rateType"]:checked');
  if (!radio) {
    missing.push('Rate Type');
  } else {
    const v = radio.value === 'song'
      ? document.getElementById('songPkg').value
      : document.getElementById('hourPkg').value;
    if (!v) missing.push('Package');
  }
  if (!document.getElementById('agreeCheck').checked) missing.push('Terms Agreement');
  if (!pendingImageData) missing.push('GCash Screenshot');
  return missing;
}

function updateSubmitHint() {
  const btn   = document.getElementById('submitBtn');
  const hint  = document.getElementById('submitHintEl');
  const valid = isFormValid();
  btn.disabled = !valid;
  if (valid) {
    hint.textContent = 'Everything looks good! Tap Submit Booking to confirm. 🎀';
    hint.classList.remove('error');
  } else {
    const missing = getMissingFields();
    hint.textContent = missing.length
      ? 'Still needed: ' + missing.join(', ') + '.'
      : 'Fill in all required fields and upload your GCash screenshot to proceed.';
    hint.classList.remove('error');
  }
}

document.addEventListener('DOMContentLoaded', function () {
  ['clientName','eventDate','perfTime','venue','notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateSubmitHint);
  });
  ['occasion','songPkg','hourPkg'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updateSubmitHint);
  });
});

// ════════════════════════════════════════════
// SUBMIT
// ════════════════════════════════════════════
async function submitForm() {
  if (!isFormValid()) {
    const hint = document.getElementById('submitHintEl');
    hint.textContent = 'Please complete all required fields and upload your GCash screenshot.';
    hint.classList.add('error'); return;
  }
  const name       = document.getElementById('clientName').value.trim();
  const date       = document.getElementById('eventDate').value.trim();
  const perfTime   = document.getElementById('perfTime').value.trim();
  const occ        = document.getElementById('occasion').value;
  const venue      = document.getElementById('venue').value.trim();
  const notes      = document.getElementById('notes').value.trim();
  const radio      = document.querySelector('input[name="rateType"]:checked');
  const rateType   = radio.value;
  const pkgRaw     = rateType === 'song'
    ? document.getElementById('songPkg').value
    : document.getElementById('hourPkg').value;
  const parts      = pkgRaw.split('|');
  const pkg        = parts[0] + ' — ' + parts[1];
  const rateLabel  = rateType === 'song' ? '🎵 Per Song' : '⏱️ Per Hour';
  const bookingId  = Date.now();
  const btn        = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Submitting…';
  try {
    const res = await fetch(API_BASE + '/client/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + clientToken },
      body: JSON.stringify({ id: bookingId, name, date, perfTime, occasion: occ, venue, rateType: rateLabel, package: pkg, notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      document.getElementById('submitHintEl').textContent = err.error || 'Could not save booking.';
      document.getElementById('submitHintEl').classList.add('error');
      btn.disabled = false; btn.innerHTML = '🎀 Submit Booking'; return;
    }
    await fetch(API_BASE + '/client/bookings/' + bookingId + '/screenshot', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + clientToken },
      body: JSON.stringify({ gcashScreenshot: pendingImageData })
    });
  } catch (e) {
    document.getElementById('submitHintEl').textContent = 'Cannot connect to server. Please try again.';
    document.getElementById('submitHintEl').classList.add('error');
    btn.disabled = false; btn.innerHTML = '🎀 Submit Booking'; return;
  }
  // Show thank-you
  const rows = [
    ['Client', name],['Date', date],['Time', perfTime],
    ['Occasion', occ],['Venue', venue],['Rate', rateLabel],['Package', pkg],
  ];
  if (notes) rows.push(['Notes', notes]);
  document.getElementById('summaryRows').innerHTML = rows.map(r =>
    '<div class="cc-row"><span class="lbl">' + r[0] + '</span><span class="val">' + r[1] + '</span></div>'
  ).join('');
  document.getElementById('tyScreenshot').src = pendingImageData;
  document.getElementById('dashPage').style.display = 'none';
  document.getElementById('thankYouPage').classList.add('show');
}

// ════════════════════════════════════════════
// GCASH UPLOAD
// ════════════════════════════════════════════
function compressImage(file, callback) {
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

function handleGcashUpload(input) {
  if (!input.files || !input.files[0]) return;
  compressImage(input.files[0], function (dataUrl) {
    pendingImageData = dataUrl;
    document.getElementById('gcashPreviewImg').src = dataUrl;
    document.getElementById('gcashPreview').classList.add('show');
    document.getElementById('uploadArea').style.display = 'none';
    updateSubmitHint();
  });
}

function reuploadScreenshot() {
  pendingImageData = null;
  document.getElementById('gcashPreview').classList.remove('show');
  document.getElementById('gcashPreviewImg').src = '';
  document.getElementById('uploadArea').style.display = '';
  document.getElementById('gcashFile').value = '';
  updateSubmitHint();
}

// ════════════════════════════════════════════
// PETALS & SPARKLES
// ════════════════════════════════════════════
function spawnLoginPetals() {
  const pc = document.getElementById('loginPetals');
  if (!pc) return;
  ['🌸','🌸','🌷','🌸','🌺','🌸','🌷'].forEach(p => {
    for (let i = 0; i < (p === '🌸' ? 5 : 3); i++) {
      const el = document.createElement('div'); el.className = 'petal'; el.textContent = p;
      el.style.left = Math.random() * 100 + '%';
      el.style.setProperty('--sz',  (13 + Math.random() * 12) + 'px');
      el.style.setProperty('--dur', (5  + Math.random() * 6)  + 's');
      el.style.setProperty('--del', (Math.random() * 8)       + 's');
      pc.appendChild(el);
    }
  });
}

function initFormPetals() {
  const pc = document.getElementById('petals');
  if (!pc || pc.childElementCount > 0) return;
  ['🌸','🌸','🌷','🌸','🌺','🌸','🌷','🌸','🌸','🌷'].forEach(p => {
    for (let i = 0; i < (p === '🌸' ? 7 : 4); i++) {
      const el = document.createElement('div'); el.className = 'petal'; el.textContent = p;
      el.style.left = Math.random() * 100 + '%';
      el.style.setProperty('--sz',  (13 + Math.random() * 13) + 'px');
      el.style.setProperty('--dur', (5  + Math.random() * 6)  + 's');
      el.style.setProperty('--del', (Math.random() * 8)       + 's');
      pc.appendChild(el);
    }
  });
}

function spawnSparkles() {
  const sc = document.getElementById('sparkles');
  if (!sc) return;
  const sizes  = [8,9,10,11,12];
  const colors = ['#e8728a','#c94f6a','#d4a853','#e8728a','#b07080'];
  for (let i = 0; i < 28; i++) {
    const s = document.createElement('div'); s.className = 'sparkle';
    s.style.left = Math.random() * 100 + '%'; s.style.top = Math.random() * 100 + '%';
    s.style.setProperty('--ts', sizes[Math.floor(Math.random() * sizes.length)] + 'px');
    s.style.setProperty('--td', (1.5 + Math.random() * 2.5) + 's');
    s.style.setProperty('--tl', (Math.random() * 3) + 's');
    s.style.color = colors[Math.floor(Math.random() * colors.length)];
    sc.appendChild(s);
  }
}

// ════════════════════════════════════════════
// UTILITY
// ════════════════════════════════════════════
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
