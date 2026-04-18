/* ============================================================
   clientdashboard-steps.js  —  STEP WIZARD NAVIGATION
   ============================================================ */

var currentStep = 1;

/* ── GO TO STEP ───────────────────────────────────────────── */
function goToStep(n) {
  // Validate before moving forward
  if (n > currentStep) {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
  }

  var direction = n > currentStep ? 'forward' : 'back';

  // Hide current panel
  var oldPanel = document.getElementById('step' + currentStep);
  oldPanel.classList.remove('active');

  // Show new panel
  var newPanel = document.getElementById('step' + n);
  newPanel.classList.remove('slide-back');
  if (direction === 'back') newPanel.classList.add('slide-back');
  newPanel.classList.add('active');

  currentStep = n;
  updateProgress();

  // If entering step 3, populate mini summary
  if (n === 3) buildMiniSummary();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── VALIDATE STEP 1 ──────────────────────────────────────── */
function validateStep1() {
  var name  = (document.getElementById('clientName').value  || '').trim();
  var phone = (document.getElementById('clientPhone').value || '').trim();
  var date  = (document.getElementById('eventDate').value   || '').trim();
  var time  = (document.getElementById('perfTime').value    || '').trim();
  var occ   = (document.getElementById('occasion').value    || '').trim();
  var venue = (document.getElementById('venue').value       || '').trim();

  var catVal = document.querySelector('input[name="categoryType"]:checked');
  var pkgOk  = false;
  if (catVal) {
    if (catVal.value === 'singer') {
      var rt = document.querySelector('input[name="rateType"]:checked');
      if (rt && rt.value === 'song' && document.getElementById('songPkg').value) pkgOk = true;
      if (rt && rt.value === 'hour' && document.getElementById('hourPkg').value) pkgOk = true;
    } else if (catVal.value === 'host') {
      if (document.getElementById('hostPkg').value) pkgOk = true;
    }
  }

  var hint = document.getElementById('step1Hint');
  if (!name || !phone || !date || !time || !occ || !venue) {
    hint.textContent = '⚠️ Please fill in all required fields before continuing.';
    hint.classList.add('error');
    return false;
  }
  if (!pkgOk) {
    hint.textContent = '⚠️ Please choose a package before continuing.';
    hint.classList.add('error');
    return false;
  }
  hint.textContent = 'Looking great! Moving to payment 💚';
  hint.classList.remove('error');
  return true;
}

/* ── VALIDATE STEP 2 ──────────────────────────────────────── */
function validateStep2() {
  var hasShot = document.getElementById('gcashPreview').classList.contains('show');
  var hint    = document.getElementById('step2Hint');
  if (!hasShot) {
    hint.textContent = '⚠️ Please upload your GCash screenshot first!';
    hint.classList.add('error');
    return false;
  }
  hint.textContent = 'Screenshot received! Almost there 🌸';
  hint.classList.remove('error');
  return true;
}

/* ── UPDATE PROGRESS DOTS & BAR ───────────────────────────── */
function updateProgress() {
  // Dots
  for (var i = 1; i <= 3; i++) {
    var dot = document.getElementById('dot' + i);
    dot.classList.remove('active', 'done');
    if (i < currentStep)  dot.classList.add('done');
    if (i === currentStep) dot.classList.add('active');
  }
  // Fill bar: step1=16.5%, step2=50%, step3=100%
  var fills = { 1: '16.5%', 2: '50%', 3: '100%' };
  document.getElementById('stepFill').style.width = fills[currentStep];
}

/* ── BUILD MINI SUMMARY FOR STEP 3 ───────────────────────── */
function buildMiniSummary() {
  var catVal = document.querySelector('input[name="categoryType"]:checked');
  var pkg    = '—';
  if (catVal) {
    if (catVal.value === 'singer') {
      var rt = document.querySelector('input[name="rateType"]:checked');
      if (rt && rt.value === 'song' && document.getElementById('songPkg').value) {
        var sp = document.getElementById('songPkg').value.split('|');
        pkg = sp[0] + ' — ' + sp[1];
      } else if (rt && rt.value === 'hour' && document.getElementById('hourPkg').value) {
        var hp = document.getElementById('hourPkg').value.split('|');
        pkg = hp[0] + ' — ' + hp[1];
      }
    } else if (catVal.value === 'host' && document.getElementById('hostPkg').value) {
      var hpkg = document.getElementById('hostPkg').value.split('|');
      pkg = hpkg[0] + ' — ' + hpkg[1];
    }
  }

  var rows = [
    ['Name',     document.getElementById('clientName').value],
    ['Contact',  document.getElementById('clientPhone').value],
    ['Date',     document.getElementById('eventDate').value],
    ['Time',     document.getElementById('perfTime').value],
    ['Occasion', document.getElementById('occasion').value],
    ['Venue',    document.getElementById('venue').value],
    ['Package',  pkg],
    ['Notes',    document.getElementById('notes').value || '—'],
  ];

  var html = rows.map(function(r) {
    return '<div class="cc-row"><span class="lbl">' + r[0] + '</span><span class="val">' + r[1] + '</span></div>';
  }).join('');
  document.getElementById('miniSummary').innerHTML = html;
}

/* ── WATCH CHECKBOX TO ENABLE SUBMIT ─────────────────────── */
/* toggleCB is defined in clientdashboard-scripts.js          */
/* We patch checkSubmit here to only manage step 3 submit btn */
var _origCheckSubmit = checkSubmit;
checkSubmit = function() {
  // Step 1 next button state
  var btn1 = document.getElementById('nextTo2');
  if (btn1) {
    var name  = (document.getElementById('clientName').value  || '').trim();
    var phone = (document.getElementById('clientPhone').value || '').trim();
    var date  = (document.getElementById('eventDate').value   || '').trim();
    var time  = (document.getElementById('perfTime').value    || '').trim();
    var occ   = (document.getElementById('occasion').value    || '').trim();
    var venue = (document.getElementById('venue').value       || '').trim();
    var catVal = document.querySelector('input[name="categoryType"]:checked');
    var pkgOk  = false;
    if (catVal) {
      if (catVal.value === 'singer') {
        var rt = document.querySelector('input[name="rateType"]:checked');
        if (rt && rt.value === 'song' && document.getElementById('songPkg').value) pkgOk = true;
        if (rt && rt.value === 'hour' && document.getElementById('hourPkg').value) pkgOk = true;
      } else if (catVal.value === 'host') {
        if (document.getElementById('hostPkg').value) pkgOk = true;
      }
    }
    var step1Ok = !!(name && phone && date && time && occ && venue && pkgOk);
    btn1.disabled = !step1Ok;
    var h1 = document.getElementById('step1Hint');
    if (h1 && !h1.classList.contains('error')) {
      h1.textContent = step1Ok ? 'Looks good! Tap Next to continue. ✨' : 'Fill in all required fields above to continue.';
    }
  }

  // Step 2 next button state
  var btn2 = document.getElementById('nextTo3');
  if (btn2) {
    var hasShot = document.getElementById('gcashPreview').classList.contains('show');
    btn2.disabled = !hasShot;
    var h2 = document.getElementById('step2Hint');
    if (h2 && !h2.classList.contains('error')) {
      h2.textContent = hasShot ? 'Screenshot received! Tap Next. 🌸' : 'Upload your GCash screenshot to continue.';
    }
  }

  // Step 3 submit button state
  var submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    var agreed = document.getElementById('agreeCheck').checked;
    submitBtn.disabled = !agreed;
    var sh = document.getElementById('submitHintEl');
    if (sh) {
      sh.textContent = agreed
        ? 'All set! Tap the button below to lock in your booking. 🎀'
        : 'Tick the checkbox above to enable the submit button.';
    }
  }
};

// Run once on load to set initial button states
document.addEventListener('DOMContentLoaded', function() {
  checkSubmit();
  updateProgress();
});
