/* ============================================================
   clientdashboard-scripts.js  —  CORE LOGIC
   ============================================================ */

/* ── PETALS (form page) ───────────────────────────────────── */
function initFormPetals() {
  const pc = document.getElementById('petals');
  if (!pc || pc.children.length > 0) return;
  ['🌸','🌸','🌷','🌸','🌺','🌸','🌷','🌸'].forEach(function(p) {
    var count = p === '🌸' ? 6 : 3;
    for (var i = 0; i < count; i++) {
      var el = document.createElement('div');
      el.className = 'petal';
      el.textContent = p;
      el.style.left = (Math.random() * 100) + '%';
      el.style.setProperty('--sz',  (13 + Math.random() * 12) + 'px');
      el.style.setProperty('--dur', (5  + Math.random() * 7)  + 's');
      el.style.setProperty('--del', (Math.random() * 10)      + 's');
      pc.appendChild(el);
    }
  });
}

/* ── WELCOME PETALS ───────────────────────────────────────── */
function spawnWelcomePetals() {
  var pc = document.getElementById('wlcPetals');
  if (!pc) return;
  ['🌸','🌸','🌷','🌸','🌺','🌸','🌷'].forEach(function(p) {
    var count = p === '🌸' ? 5 : 3;
    for (var i = 0; i < count; i++) {
      var el = document.createElement('div');
      el.className = 'petal';
      el.textContent = p;
      el.style.left = (Math.random() * 100) + '%';
      el.style.setProperty('--sz',  (13 + Math.random() * 12) + 'px');
      el.style.setProperty('--dur', (5  + Math.random() * 6)  + 's');
      el.style.setProperty('--del', (Math.random() * 8)       + 's');
      pc.appendChild(el);
    }
  });
}

/* ── GO TO BOOKING ────────────────────────────────────────── */
function goToBooking() {
  var wp = document.getElementById('welcomePage');
  wp.classList.add('hide');
  setTimeout(function() {
    wp.style.display = 'none';
    document.getElementById('dashPage').style.display = '';
    initFormPetals();
    window.scrollTo(0, 0);
  }, 550);
}

/* ── CATEGORY SWITCH ──────────────────────────────────────── */
function switchCategory() {
  var val = document.querySelector('input[name="categoryType"]:checked');
  if (!val) return;
  openCategoryModal(val.value);
}

/* ── RATE SWITCH ──────────────────────────────────────────── */
function switchRate() {
  var val = document.querySelector('input[name="rateType"]:checked');
  document.getElementById('songBox').classList.toggle('show', val && val.value === 'song');
  document.getElementById('hourBox').classList.toggle('show', val && val.value === 'hour');
  document.getElementById('songPrice').classList.remove('show');
  document.getElementById('hourPrice').classList.remove('show');
  checkSubmit();
}

/* ── SHOW PRICE ───────────────────────────────────────────── */
function showPrice(type) {
  if (type === 'song') {
    var sel = document.getElementById('songPkg');
    var box = document.getElementById('songPrice');
    if (!sel.value) { box.classList.remove('show'); return; }
    var parts = sel.value.split('|');
    box.innerHTML = '<strong>' + parts[1] + '</strong><span>' + parts[0] + '</span>';
    box.classList.add('show');
  } else {
    var sel2 = document.getElementById('hourPkg');
    var box2 = document.getElementById('hourPrice');
    if (!sel2.value) { box2.classList.remove('show'); return; }
    var parts2 = sel2.value.split('|');
    box2.innerHTML = '<strong>' + parts2[1] + '</strong><span>' + parts2[0] + '</span>';
    box2.classList.add('show');
  }
  checkSubmit();
}

function showHostPrice() {
  var sel = document.getElementById('hostPkg');
  var box = document.getElementById('hostPrice');
  if (!sel.value) { box.classList.remove('show'); return; }
  var parts = sel.value.split('|');
  box.innerHTML = '<strong>' + parts[1] + '</strong><span>' + parts[0] + '</span>';
  box.classList.add('show');
  checkSubmit();
}

/* ── CHECKBOX ─────────────────────────────────────────────── */
function toggleCB() {
  var cb  = document.getElementById('agreeCheck');
  var ccb = document.getElementById('customCB');
  cb.checked = !cb.checked;
  ccb.classList.toggle('checked', cb.checked);
  checkSubmit();
}

/* ── GCASH UPLOAD ─────────────────────────────────────────── */
function handleGcashUpload(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  var reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('gcashPreviewImg').src = e.target.result;
    document.getElementById('gcashPreview').classList.add('show');
    document.getElementById('uploadArea').style.display = 'none';
    checkSubmit();
  };
  reader.readAsDataURL(file);
}

function reuploadScreenshot() {
  document.getElementById('gcashFile').value = '';
  document.getElementById('gcashPreviewImg').src = '';
  document.getElementById('gcashPreview').classList.remove('show');
  document.getElementById('uploadArea').style.display = '';
  checkSubmit();
}

/* ── VALIDATE & SUBMIT CHECK ──────────────────────────────── */
function checkSubmit() {
  var name    = (document.getElementById('clientName').value || '').trim();
  var phone   = (document.getElementById('clientPhone').value || '').trim();
  var date    = (document.getElementById('eventDate').value || '').trim();
  var time    = (document.getElementById('perfTime').value || '').trim();
  var occ     = (document.getElementById('occasion').value || '').trim();
  var venue   = (document.getElementById('venue').value || '').trim();
  var agreed  = document.getElementById('agreeCheck').checked;
  var hasShot = document.getElementById('gcashPreview').classList.contains('show');

  var catVal  = document.querySelector('input[name="categoryType"]:checked');
  var pkgOk   = false;
  if (catVal) {
    if (catVal.value === 'singer') {
      var rt = document.querySelector('input[name="rateType"]:checked');
      if (rt && rt.value === 'song' && document.getElementById('songPkg').value) pkgOk = true;
      if (rt && rt.value === 'hour' && document.getElementById('hourPkg').value) pkgOk = true;
    } else if (catVal.value === 'host') {
      if (document.getElementById('hostPkg').value) pkgOk = true;
    }
  }

  var ok = name && phone && date && time && occ && venue && agreed && hasShot && pkgOk;
  var btn = document.getElementById('submitBtn');
  btn.disabled = !ok;

  var hint = document.getElementById('submitHintEl');
  if (ok) {
    hint.textContent = 'All set! Tap the button below to lock in your booking. 🎀';
    hint.classList.remove('error');
  } else {
    hint.textContent = 'Fill in all required fields and upload your GCash screenshot to proceed.';
    hint.classList.remove('error');
  }
}

/* ── SUBMIT FORM ──────────────────────────────────────────── */
function submitForm() {
  var btn = document.getElementById('submitBtn');
  if (btn.disabled) return;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Submitting…';

  setTimeout(function() {
    buildSummary();
    document.getElementById('tyScreenshot').src = document.getElementById('gcashPreviewImg').src;
    document.getElementById('dashPage').style.display = 'none';
    var ty = document.getElementById('thankYouPage');
    ty.classList.add('show');
    spawnSparkles();
    window.scrollTo(0, 0);
  }, 1400);
}

/* ── BUILD SUMMARY ────────────────────────────────────────── */
function buildSummary() {
  var catVal = document.querySelector('input[name="categoryType"]:checked');
  var pkg    = '—';
  if (catVal) {
    if (catVal.value === 'singer') {
      var rt = document.querySelector('input[name="rateType"]:checked');
      if (rt && rt.value === 'song') {
        var sp = document.getElementById('songPkg').value.split('|');
        pkg = sp[0] + ' — ' + sp[1];
      } else if (rt && rt.value === 'hour') {
        var hp = document.getElementById('hourPkg').value.split('|');
        pkg = hp[0] + ' — ' + hp[1];
      }
    } else {
      var hpkg = document.getElementById('hostPkg').value.split('|');
      pkg = hpkg[0] + ' — ' + hpkg[1];
    }
  }

  var rows = [
    ['Client',    document.getElementById('clientName').value],
    ['Contact',   document.getElementById('clientPhone').value],
    ['Date',      document.getElementById('eventDate').value],
    ['Time',      document.getElementById('perfTime').value],
    ['Occasion',  document.getElementById('occasion').value],
    ['Venue',     document.getElementById('venue').value],
    ['Package',   pkg],
    ['Notes',     document.getElementById('notes').value || '—'],
  ];

  var html = rows.map(function(r) {
    return '<div class="cc-row"><span class="lbl">' + r[0] + '</span><span class="val">' + r[1] + '</span></div>';
  }).join('');
  document.getElementById('summaryRows').innerHTML = html;
}

/* ── SPARKLES ─────────────────────────────────────────────── */
function spawnSparkles() {
  var sc = document.getElementById('sparkles');
  if (!sc) return;
  var colors = ['#f9a8c9','#f7d6e0','#e8728a','#fce8ee','#c94f6a'];
  for (var i = 0; i < 30; i++) {
    var el = document.createElement('div');
    el.className = 'sparkle';
    el.style.left  = Math.random() * 100 + '%';
    el.style.top   = Math.random() * 100 + '%';
    el.style.color = colors[Math.floor(Math.random() * colors.length)];
    el.style.setProperty('--ts', (6 + Math.random() * 10) + 'px');
    el.style.setProperty('--td', (1.5 + Math.random() * 2.5) + 's');
    el.style.setProperty('--tl', (Math.random() * 3) + 's');
    sc.appendChild(el);
  }
}

/* ── CANCEL MODAL ─────────────────────────────────────────── */
function confirmCancel() {
  document.getElementById('cancelModal').classList.add('show');
}
function closeCancelModal() {
  document.getElementById('cancelModal').classList.remove('show');
}
function doCancelForm() {
  closeCancelModal();
  document.getElementById('dashPage').style.display = 'none';
  document.getElementById('welcomePage').style.display = '';
  document.getElementById('welcomePage').classList.remove('hide');
  // reset form
  ['clientName','clientPhone','eventDate','perfTime','venue','notes'].forEach(function(id) {
    document.getElementById(id).value = '';
  });
  document.getElementById('occasion').value = '';
  document.querySelectorAll('input[name="categoryType"]').forEach(function(r) { r.checked = false; });
  document.querySelectorAll('input[name="rateType"]').forEach(function(r) { r.checked = false; });
  document.getElementById('songPkg').value = '';
  document.getElementById('hourPkg').value = '';
  document.getElementById('hostPkg').value = '';
  document.getElementById('songBox').classList.remove('show');
  document.getElementById('hourBox').classList.remove('show');
  document.getElementById('singerBox').classList.remove('show');
  document.getElementById('hostBox').classList.remove('show');
  document.getElementById('songPrice').classList.remove('show');
  document.getElementById('hourPrice').classList.remove('show');
  document.getElementById('hostPrice').classList.remove('show');
  document.getElementById('agreeCheck').checked = false;
  document.getElementById('customCB').classList.remove('checked');
  reuploadScreenshot();
  document.getElementById('submitBtn').disabled = true;
  showToast('Form cleared! 🌸');
}

/* ── TOAST ────────────────────────────────────────────────── */
function showToast(msg) {
  var t = document.getElementById('cdToast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2800);
}

/* ── LIVE VALIDATION LISTENERS ────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  spawnWelcomePetals();
  ['clientName','clientPhone','eventDate','perfTime','venue','notes'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', checkSubmit);
  });
  var occ = document.getElementById('occasion');
  if (occ) occ.addEventListener('change', checkSubmit);
});
