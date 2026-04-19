/* ============================================================
   clientdashboard-modals.js  —  ALL MODALS
   ============================================================ */

/* ══════════════════════════════════════════════════════════
   CATEGORY MODAL
══════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════
   DATE MODAL
══════════════════════════════════════════════════════════ */
var _selMonth = null, _selDay = null, _selYear = null;

var MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function openDateModal() {
  var mg = document.getElementById('monthGrid');
  mg.innerHTML = '';
  MONTHS.forEach(function(m) {
    var el = document.createElement('div');
    el.className = 'cm-date-chip' + (_selMonth === m ? ' active' : '');
    el.textContent = m.slice(0,3);
    el.onclick = function() {
      _selMonth = m;
      mg.querySelectorAll('.cm-date-chip').forEach(function(c){ c.classList.remove('active'); });
      el.classList.add('active');
      updateDatePreview();
    };
    mg.appendChild(el);
  });

  var dg = document.getElementById('dayGrid');
  dg.innerHTML = '';
  for (var d = 1; d <= 31; d++) {
    (function(day) {
      var el = document.createElement('div');
      el.className = 'cm-date-chip' + (_selDay === day ? ' active' : '');
      el.textContent = day;
      el.onclick = function() {
        _selDay = day;
        dg.querySelectorAll('.cm-date-chip').forEach(function(c){ c.classList.remove('active'); });
        el.classList.add('active');
        updateDatePreview();
      };
      dg.appendChild(el);
    })(d);
  }

  var yg = document.getElementById('yearGrid');
  yg.innerHTML = '';
  var curYear = new Date().getFullYear();
  for (var y = curYear; y <= curYear + 3; y++) {
    (function(yr) {
      var el = document.createElement('div');
      el.className = 'cm-date-chip' + (_selYear === yr ? ' active' : '');
      el.textContent = yr;
      el.onclick = function() {
        _selYear = yr;
        yg.querySelectorAll('.cm-date-chip').forEach(function(c){ c.classList.remove('active'); });
        el.classList.add('active');
        updateDatePreview();
      };
      yg.appendChild(el);
    })(y);
  }

  updateDatePreview();
  document.getElementById('dateModal').classList.add('show');
}

function updateDatePreview() {
  var prev = document.getElementById('datePreview');
  var btn  = document.getElementById('dateConfirmBtn');
  if (_selMonth && _selDay && _selYear) {
    prev.textContent = '📅 ' + _selMonth + ' ' + _selDay + ', ' + _selYear;
    btn.disabled = false;
  } else {
    prev.textContent = 'No date selected yet 🌷';
    btn.disabled = true;
  }
}

function confirmDateModal() {
  var val = _selMonth + ' ' + _selDay + ', ' + _selYear;
  document.getElementById('eventDate').value              = val;
  document.getElementById('eventDateDisplay').textContent = '📅 ' + val;
  document.getElementById('eventDateDisplay').classList.add('selected');
  closeDateModal();
  checkSubmit();
}

function closeDateModal() {
  document.getElementById('dateModal').classList.remove('show');
}

/* ══════════════════════════════════════════════════════════
   TIME MODAL
══════════════════════════════════════════════════════════ */
var _selTime = null;

var TIMES_AM = [
  '6:00 AM','6:30 AM','7:00 AM','7:30 AM',
  '8:00 AM','8:30 AM','9:00 AM','9:30 AM',
  '10:00 AM','10:30 AM','11:00 AM','11:30 AM'
];
var TIMES_PM = [
  '12:00 PM','12:30 PM','1:00 PM','1:30 PM',
  '2:00 PM','2:30 PM','3:00 PM','3:30 PM',
  '4:00 PM','4:30 PM','5:00 PM','5:30 PM',
  '6:00 PM','6:30 PM','7:00 PM','7:30 PM',
  '8:00 PM','8:30 PM','9:00 PM','9:30 PM','10:00 PM'
];

function openTimeModal() {
  buildTimeGrid('timeGridAM', TIMES_AM);
  buildTimeGrid('timeGridPM', TIMES_PM);
  updateTimePreview();
  document.getElementById('timeModal').classList.add('show');
}

function buildTimeGrid(gridId, times) {
  var grid = document.getElementById(gridId);
  grid.innerHTML = '';
  times.forEach(function(t) {
    var el = document.createElement('div');
    el.className = 'cm-time-chip' + (_selTime === t ? ' active' : '');
    el.textContent = t;
    el.onclick = function() {
      _selTime = t;
      document.querySelectorAll('.cm-time-chip').forEach(function(c){ c.classList.remove('active'); });
      el.classList.add('active');
      updateTimePreview();
    };
    grid.appendChild(el);
  });
}

function updateTimePreview() {
  var prev = document.getElementById('timePreview');
  var btn  = document.getElementById('timeConfirmBtn');
  if (_selTime) {
    prev.textContent = '🕐 ' + _selTime;
    btn.disabled = false;
  } else {
    prev.textContent = 'No time selected yet 🌷';
    btn.disabled = true;
  }
}

function confirmTimeModal() {
  document.getElementById('perfTime').value              = _selTime;
  document.getElementById('perfTimeDisplay').textContent = '🕐 ' + _selTime;
  document.getElementById('perfTimeDisplay').classList.add('selected');
  closeTimeModal();
  checkSubmit();
}

function closeTimeModal() {
  document.getElementById('timeModal').classList.remove('show');
}

/* ══════════════════════════════════════════════════════════
   OCCASION MODAL
══════════════════════════════════════════════════════════ */
var _selOccasion = null;

function selectOccasion(el, val) {
  _selOccasion = val;
  document.querySelectorAll('#occasionModal .cm-pkg-item').forEach(function(i){
    i.classList.remove('active');
  });
  el.classList.add('active');
  document.getElementById('occasionConfirmBtn').disabled = false;
}

function confirmOccasionModal() {
  document.getElementById('occasion').value           = _selOccasion;
  document.getElementById('occasionDisplay').textContent = '🎉 ' + _selOccasion;
  document.getElementById('occasionDisplay').classList.add('selected');
  closeOccasionModal();
  checkSubmit();
}

function closeOccasionModal() {
  document.getElementById('occasionModal').classList.remove('show');
}

function openOccasionModal() {
  _selOccasion = document.getElementById('occasion').value || null;
  document.querySelectorAll('#occasionModal .cm-pkg-item').forEach(function(el) {
    el.classList.toggle('active', _selOccasion && el.querySelector('.cm-pkg-name').textContent.includes(_selOccasion));
  });
  document.getElementById('occasionConfirmBtn').disabled = !_selOccasion;
  document.getElementById('occasionModal').classList.add('show');
}

/* ══════════════════════════════════════════════════════════
   VENUE MODAL
══════════════════════════════════════════════════════════ */
var VENUE_BARANGAYS = {
  'Koronadal City': [
    'Assumption','Avanceña','Cacub','Caloocan','Carpenter Hill',
    'Concepcion','Esperanza','General Paulino Santos','Mabini',
    'Magsaysay','Mambucal','Morales','New Pangasinan','Namnama',
    'Paraiso','Rotonda','San Isidro','San Jose','San Roque',
    'Santa Cruz','Santo Niño','Saravia','Topland','Zulueta'
  ],
  'General Santos City': [
    'Apopong','Baluan','Batomelong','Buayan','Bula','Calumpang',
    'City Heights','Conel','Dadiangas East','Dadiangas North',
    'Dadiangas South','Dadiangas West','Fatima','Katangawan',
    'Lagao (1st)','Lagao (2nd)','Lagao (3rd)','Labangal',
    'Ligaya','Mabuhay','Olympog','San Isidro','San Jose',
    'Sinawal','Tambler','Tinagacan','Upper Labay'
  ],
  'Polomolok': [
    'Bentung','Cannery Site','Glamang','Kinilis','Klinan 6',
    'Koronadal Proper','Landan','Lapuz','Lumakil','Maligo',
    'Malingao','Polo','Poblacion','Rubber','Saravia',
    'Silway 7','Silway 8','Sulit','Sumbakil','Tampakan',
    'Tinago','Tomado','Tupi','Upper Klinan','Validated'
  ],
  'Tupi': [
    'Acmonan','Bololmailom','Bunao','Cebuano','Crossing Palkan',
    'Kablon','Kalkam','Linan','Lunen','Magsaysay',
    'Maltana','Naci','New Iloilo','New Lagao','Palkan',
    'Poblacion','Polonuling','Simbo','Tubeng'
  ],
  'Surallah': [
    'Bentung','Buenavista','Dajay','Duengas','Lambontong',
    'Lamian','Lamsugod','Libertad','Little Baguio','Moloy',
    'Naci','Palumbi','Poblacion','Rublo','Single','Tinongcop'
  ],
  'Lake Sebu': [
    'Bacdulong','Denlag','Halilan','Hanoon','Klubi',
    'Lahpoong','Lake Lahit','Lake Moocan','Lake Sebu (Pob.)','Lamcade',
    'Lamdalag','Lamfugon','Lamhako','Lamlahak','Lamlongon',
    'Lamsiakan','Lamsugod','Mabiyang','Ned','Poblacion',
    'Sinawal','Takunel','Talisay','Tasiman'
  ],
  'Tampakan': [
    'Batang','Bulan','Buto','Danlag','Kapingkong',
    'Lambayong','Lampitak','Lungkunon','Maltana','Palo',
    'Poblacion','Rotonda','Santa Cruz','Santo Niño','Tablu'
  ],
  'Tantangan': [
    'Bukay Pait','Central Glad','Glad','Kinayao','Libas',
    'Liguasan','Magsaysay','Mamali','New Iloilo','New Panay',
    'Patulang','Poblacion','San Felipe','San Juan','Tantangan'
  ],
  'Banga': [
    'Benitez','Carbon','Dajay','Danao','Ilomavis',
    'Kipalbig','Lam-caliaf','Lamba','Lamian','Lampari',
    'Lamsugod','Libertad','Magsaysay','Ned','Olas',
    'Pag-asa','Palumbi','Poblacion','Punong','Rizal',
    'San Lorenzo','San Vicente','Seven Falls','Tinongcop'
  ],
  'Santo Niño': [
    'Dumaguil','Esperanza','Idaoman','Idsaran','Kadingilan',
    'Kamanga','Lam-apos','Lambuling','Lamcaliaf','Lambontong',
    'Lamboyog','Lamlastog','Lamsadong','Lumabat','Maibo',
    'Malitubog','Mangilala','Ned','Patulang','Poblacion',
    'Polonuling','Santa Cruz','Santo Niño','Sinawal','Tinago'
  ],
  'Norala': [
    'Antipas','Bagong Silang','Colongulo','Dajay','Dumaguil',
    'Esperanza','Kibid','Liberty','Mabini','Maibo',
    'Malubo','Norala (Pob.)','Pag-asa','Sinawal','Tinago'
  ],
  'Sto. Niño': [
    'Dumaguil','Esperanza','Idaoman','Idsaran','Kadingilan',
    'Kamanga','Lam-apos','Lambuling','Lamcaliaf','Lambontong',
    'Maibo','Malitubog','Mangilala','Ned','Poblacion',
    'Polonuling','Santa Cruz','Sinawal','Tinago'
  ],
};

var VENUE_CITIES = Object.keys(VENUE_BARANGAYS);

function _buildDatalist(id, items) {
  var dl = document.getElementById(id);
  if (!dl) return;
  dl.innerHTML = '';
  items.forEach(function(v) {
    var o = document.createElement('option');
    o.value = v;
    dl.appendChild(o);
  });
}

function _refreshBarangayList() {
  var cityVal = (document.getElementById('venueCity').value || '').trim();
  var list = VENUE_BARANGAYS[cityVal];
  if (!list) {
    var lower = cityVal.toLowerCase();
    var key = VENUE_CITIES.find(function(c) { return c.toLowerCase().includes(lower); });
    list = key ? VENUE_BARANGAYS[key] : [];
  }
  _buildDatalist('barangayList', list);
}

function updateVenuePreview() {
  var city   = (document.getElementById('venueCity').value    || '').trim();
  var brgy   = (document.getElementById('venueBarangay').value || '').trim();
  var street = (document.getElementById('venueStreet').value   || '').trim();
  var specs  = (document.getElementById('venueSpecs').value    || '').trim();

  var parts = [];
  if (street) parts.push(street);
  if (brgy)   parts.push('Brgy. ' + brgy);
  if (city)   parts.push(city);
  if (specs)  parts.push('(' + specs + ')');

  var preview    = document.getElementById('venuePreview');
  var confirmBtn = document.getElementById('venueConfirmBtn');

  if (city) {
    preview.textContent = parts.join(', ');
    confirmBtn.disabled = false;
  } else {
    preview.textContent = 'No venue locked in yet 🌷';
    confirmBtn.disabled = true;
  }
}

function openVenueModal() {
  _buildDatalist('cityList', VENUE_CITIES);
  _refreshBarangayList();
  document.getElementById('venueModal').classList.add('show');
  updateVenuePreview();
}

function closeVenueModal() {
  document.getElementById('venueModal').classList.remove('show');
}

function confirmVenueModal() {
  var city   = (document.getElementById('venueCity').value    || '').trim();
  var brgy   = (document.getElementById('venueBarangay').value || '').trim();
  var street = (document.getElementById('venueStreet').value   || '').trim();
  var specs  = (document.getElementById('venueSpecs').value    || '').trim();

  if (!city) return;

  var parts = [];
  if (street) parts.push(street);
  if (brgy)   parts.push('Brgy. ' + brgy);
  parts.push(city);
  if (specs)  parts.push('(' + specs + ')');

  var full = parts.join(', ');

  document.getElementById('venue').value = full;

  var display = document.getElementById('venueDisplay');
  display.textContent = full;
  display.classList.add('selected');

  closeVenueModal();
  if (typeof checkSubmit === 'function') checkSubmit();
}
