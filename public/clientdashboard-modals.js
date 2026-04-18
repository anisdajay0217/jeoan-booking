/* ============================================================
   clientdashboard-modals.js  —  CATEGORY CHOICE MODALS
   ============================================================ */

function openCategoryModal(type) {
  var content = document.getElementById('categoryModalContent');

  if (type === 'singer') {
    content.innerHTML = `
      <span class="cm-icon">🎤</span>
      <div class="cm-title">Singer Only</div>
      <div class="cm-sub">Pure vocals, full feels ✨</div>
      <div class="cm-divider"></div>
      <div class="cm-section-label">Choose your rate type</div>
      <div class="cm-rate-toggle">
        <div class="cm-rate-btn" id="cmRateSong" onclick="selectModalRate(this,'song')">
          <div class="cm-rate-icon">🎵</div>
          <div class="cm-rate-name">Per Song</div>
        </div>
        <div class="cm-rate-btn" id="cmRateHour" onclick="selectModalRate(this,'hour')">
          <div class="cm-rate-icon">⏱️</div>
          <div class="cm-rate-name">Per Hour</div>
        </div>
      </div>
      <div id="modalPkgArea"></div>
      <div class="cm-actions">
        <button class="cm-btn-cancel" onclick="closeCategoryModal()">Cancel</button>
        <button class="cm-btn-confirm" id="cmConfirmBtn" onclick="confirmCategoryModal()" disabled>Confirm 🎀</button>
      </div>
    `;
  } else {
    content.innerHTML = `
      <span class="cm-icon">🎤🎙️</span>
      <div class="cm-title">Singer + Host</div>
      <div class="cm-sub">Vocals AND the whole show 💅</div>
      <div class="cm-divider"></div>
      <div class="cm-section-label">Choose your package</div>
      <div class="cm-pkg-list">
        <div class="cm-pkg-item" onclick="selectModalPkg(this,'host','1 Hour|₱800')">
          <div class="cm-pkg-name">1 Hour</div><div class="cm-pkg-price">₱800</div>
        </div>
        <div class="cm-pkg-item" onclick="selectModalPkg(this,'host','2 Hours|₱900')">
          <div class="cm-pkg-name">2 Hours</div><div class="cm-pkg-price">₱900</div>
        </div>
        <div class="cm-pkg-item" onclick="selectModalPkg(this,'host','3 Hours|₱1,000')">
          <div class="cm-pkg-name">3 Hours</div><div class="cm-pkg-price">₱1,000</div>
        </div>
      </div>
      <div class="cm-actions">
        <button class="cm-btn-cancel" onclick="closeCategoryModal()">Cancel</button>
        <button class="cm-btn-confirm" id="cmConfirmBtn" onclick="confirmCategoryModal()" disabled>Confirm 🎀</button>
      </div>
    `;
  }

  window._modalCategory = type;
  window._modalRate     = null;
  window._modalRateType = null;
  window._modalPkg      = null;

  document.getElementById('categoryModal').classList.add('show');
}

function selectModalRate(el, rateType) {
  window._modalRate     = rateType;
  window._modalRateType = rateType;
  window._modalPkg      = null;

  document.querySelectorAll('.cm-rate-btn').forEach(function(b) { b.classList.remove('active'); });
  el.classList.add('active');

  var area = document.getElementById('modalPkgArea');
  if (rateType === 'song') {
    area.innerHTML = `
      <div class="cm-section-label" style="margin-top:14px;">Pick your song count 🎶</div>
      <div class="cm-pkg-list">
        <div class="cm-pkg-item" onclick="selectModalPkg(this,'song','1–6 Songs|₱300')">
          <div class="cm-pkg-name">1–6 Songs</div><div class="cm-pkg-price">₱300</div>
        </div>
        <div class="cm-pkg-item" onclick="selectModalPkg(this,'song','1–10 Songs|₱350')">
          <div class="cm-pkg-name">1–10 Songs</div><div class="cm-pkg-price">₱350</div>
        </div>
        <div class="cm-pkg-item" onclick="selectModalPkg(this,'song','1–15 Songs|₱400')">
          <div class="cm-pkg-name">1–15 Songs</div><div class="cm-pkg-price">₱400</div>
        </div>
        <div class="cm-pkg-item" onclick="selectModalPkg(this,'song','Band Sub|Negotiable')">
          <div class="cm-pkg-name">Band Sub</div><div class="cm-pkg-price">Negotiable 💬</div>
        </div>
      </div>
    `;
  } else {
    area.innerHTML = `
      <div class="cm-section-label" style="margin-top:14px;">How many hours? ⏱️</div>
      <div class="cm-pkg-list">
        <div class="cm-pkg-item" onclick="selectModalPkg(this,'hour','1 Hour|₱400')">
          <div class="cm-pkg-name">1 Hour</div><div class="cm-pkg-price">₱400</div>
        </div>
        <div class="cm-pkg-item" onclick="selectModalPkg(this,'hour','1 Hr 30 Mins|₱450')">
          <div class="cm-pkg-name">1 Hr 30 Mins</div><div class="cm-pkg-price">₱450</div>
        </div>
        <div class="cm-pkg-item" onclick="selectModalPkg(this,'hour','2 Hours|₱500')">
          <div class="cm-pkg-name">2 Hours</div><div class="cm-pkg-price">₱500</div>
        </div>
      </div>
    `;
  }
  updateModalConfirmBtn();
}

function selectModalPkg(el, rateType, val) {
  window._modalPkg      = val;
  window._modalRateType = rateType;
  el.closest('.cm-pkg-list').querySelectorAll('.cm-pkg-item').forEach(function(i) {
    i.classList.remove('active');
  });
  el.classList.add('active');
  updateModalConfirmBtn();
}

function updateModalConfirmBtn() {
  var btn = document.getElementById('cmConfirmBtn');
  if (!btn) return;
  var ready = !!window._modalPkg;
  if (window._modalCategory === 'singer') ready = ready && !!window._modalRate;
  btn.disabled = !ready;
}

function confirmCategoryModal() {
  var cat = window._modalCategory;

  document.getElementById('singerBox').classList.toggle('show', cat === 'singer');
  document.getElementById('hostBox').classList.toggle('show', cat === 'host');

  if (cat === 'singer') {
    var rateEl = document.getElementById(window._modalRateType === 'song' ? 'rateSong' : 'rateHour');
    if (rateEl) rateEl.checked = true;
    switchRate();
    if (window._modalRateType === 'song') {
      document.getElementById('songPkg').value = window._modalPkg;
      showPrice('song');
    } else {
      document.getElementById('hourPkg').value = window._modalPkg;
      showPrice('hour');
    }
  } else {
    document.getElementById('hostPkg').value = window._modalPkg;
    showHostPrice();
  }

  closeCategoryModal();
  checkSubmit();
}

function closeCategoryModal() {
  document.getElementById('categoryModal').classList.remove('show');
}
