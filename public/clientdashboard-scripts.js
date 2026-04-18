/* ============================================================
   clientdashboard-scripts.js  —  CORE LOGIC
   ============================================================ */

const API_BASE = window.location.origin;

/* ── PETALS (form page) ───────────────────────────────────── */
function initFormPetals() {
  var pc = document.getElementById('petals');
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
    var sel  = document.getElementById('songPkg');
    var box  = document.getElementById('songPrice');
    if (!sel.value) { box.classList.remove('show'); return; }
    var parts = sel.value.split('|');
    box.innerHTML = '<strong>' + parts[1] + '</strong><span>' + parts[0] + '</span>';
    box.classList.add('show');
  } else {
    var sel2  = document.getElementById('hourPkg');
    var box2  = document.getElementById('hourPrice');
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
  var reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('gcashPreviewImg').src = e.target.result;
    document.getElementById('gcashPreview').classList.add('show');
    document.getElementById('uploadArea').style.display = 'none';
    checkSubmit();
  };
  reader.readAsDataURL(input.files[0]);
}

function reuploadScreenshot() {
  document.getElementById('gcashFile').value = '';
  document.getElementById('gcashPreviewImg').src = '';
  document.getElementById('gcashPreview').classList.remove('show');
  document.getElementById('uploadArea').style.display = '';
  checkSubmit();
}

/* ── checkSubmit — base version (steps.js will override) ─── */
function checkSubmit() {
  /* Overridden by clientdashboard-steps.js after load.
     This stub exists so calls before steps.js loads don't crash. */
}

/* ── BUILD PACKAGE STRING ─────────────────────────────────── */
function buildPackageInfo() {
  var catVal   = document.querySelector('input[name="categoryType"]:checked');
  var pkg      = '—';
  var rateType = 'host';

  if (catVal) {
    if (catVal.value === 'singer') {
      rateType = 'singer';
      var rt = document.querySelector('input[name="rateType"]:checked');
      if (rt && rt.value === 'song' && document.getElementById('songPkg').value) {
        var sp = document.getElementById('songPkg').value.split('|');
        pkg = sp[0] + ' — ' + sp[1];
      } else if (rt && rt.value === 'hour' && document.getElementById('hourPkg').value) {
        var hp = document.getElementById('hourPkg').value.split('|');
        pkg = hp[0] + ' — ' + hp[1];
      }
    } else if (catVal.value === 'host' && document.getElementById('hostPkg').value) {
      rateType = 'host';
      var hpkg = document.getElementById('hostPkg').value.split('|');
      pkg = hpkg[0] + ' — ' + hpkg[1];
    }
  }

  return { pkg: pkg, rateType: rateType };
}

/* ── SUBMIT FORM ──────────────────────────────────────────── */
function submitForm() {
  var btn = document.getElementById('submitBtn');
  if (btn.disabled) return;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Submitting…';

  var pkgInfo  = buildPackageInfo();
  var gcashSrc = document.getElementById('gcashPreviewImg').src || null;

  var payload = {
    id:             Date.now(),
    name:           document.getElementById('clientName').value.trim(),
    phone:          document.getElementById('clientPhone').value.trim(),
    date:           document.getElementById('eventDate').value.trim(),
    perfTime:       document.getElementById('perfTime').value.trim(),
    occasion:       document.getElementById('occasion').value,
    venue:          document.getElementById('venue').value.trim(),
    rateType:       pkgInfo.rateType,
    package:        pkgInfo.pkg,
    notes:          document.getElementById('notes').value.trim(),
    gcashScreenshot: gcashSrc
  };

  fetch(API_BASE + '/public/bookings', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  })
  .then(function(res) {
    if (!res.ok) {
      return res.json().then(function(data) {
        throw new Error(data.error || 'Server error');
      });
    }
    return res.json();
  })
  .then(function() {
    buildSummary();
    document.getElementById('tyScreenshot').src = gcashSrc || '';
    document.getElementById('dashPage').style.display = 'none';
    var ty = document.getElementById('thankYouPage');
    ty.classList.add('show');
    spawnSparkles();
    window.scrollTo(0, 0);
  })
  .catch(function(err) {
    btn.disabled = false;
    btn.innerHTML = '🎀 Submit Booking';
    showToast('❌ Submission failed: ' + err.message);
  });
}

/* ── BUILD THANK YOU SUMMARY ──────────────────────────────── */
function buildSummary() {
  var pkgInfo = buildPackageInfo();

  var rows = [
    ['Client',   document.getElementById('clientName').value],
    ['Contact',  document.getElementById('clientPhone').value],
    ['Date',     document.getElementById('eventDate').value],
    ['Time',     document.getElementById('perfTime').value],
    ['Occasion', document.getElementById('occasion').value],
    ['Venue',    document.getElementById('venue').value],
    ['Package',  pkgInfo.pkg],
    ['Notes',    document.getElementById('notes').value || '—'],
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
  // Reset to step 1
  if (typeof goToStep === 'function') {
    document.getElementById('step' + currentStep).classList.remove('active');
    currentStep = 1;
    document.getElementById('step1').classList.add('active');
    if (typeof updateProgress === 'function') updateProgress();
  }
  // Go back to welcome
  document.getElementById('dashPage').style.display = 'none';
  var wp = document.getElementById('welcomePage');
  wp.style.display = '';
  wp.classList.remove('hide');
  // Reset all fields
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
  showToast('Form cleared! 🌸');
}

/* ── TOAST ────────────────────────────────────────────────── */
function showToast(msg) {
  var t = document.getElementById('cdToast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2800);
}

/* ── INIT ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  spawnWelcomePetals();
  ['clientName','clientPhone','eventDate','perfTime','venue','notes'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', checkSubmit);
  });
  var occ = document.getElementById('occasion');
  if (occ) occ.addEventListener('change', checkSubmit);
});
