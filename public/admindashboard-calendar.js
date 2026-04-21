// ════════════════════════════════════════
// COQUETTE CALENDAR — admindashboard-calendar.js
// Drop this file alongside your other admin JS files.
// ════════════════════════════════════════

(function () {
  // ── State ──────────────────────────────────────────────────────
  let calYear  = new Date().getFullYear();
  let calMonth = new Date().getMonth(); // 0-indexed
  let calBookings = [];
  let selectedDay = null;

  // ── Entry point called by switchTab('calendar') ────────────────
  window.renderCalendar = async function () {
    const view = document.getElementById('viewCalendar');
    if (!view) return;

    view.innerHTML = `
      <div id="calRoot">
        <div class="cal-loading">
          <span class="cal-loading-heart">🩷</span>
          <p>Loading your schedule…</p>
        </div>
      </div>`;

    // Re-use the existing fetchBookings() from admindashboard.js
    const all = await fetchBookings();
    calBookings = all.filter(b => b.status === 'confirmed');

    _buildCalendarUI(view);
  };

  // ── Build full UI ──────────────────────────────────────────────
  function _buildCalendarUI(view) {
    view.innerHTML = `
      <!-- ═══ STYLES ═══ -->
      <style>
        /* ── Reset / Root ── */
        #calRoot {
          font-family: 'Palatino Linotype', Palatino, Georgia, serif;
          background: linear-gradient(160deg, #fff0f5 0%, #fce8f0 50%, #fff5fb 100%);
          min-height: 100vh;
          padding: 28px 20px 60px;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
        }
        #calRoot::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 10% 20%, rgba(255,182,210,0.18) 0%, transparent 70%),
            radial-gradient(ellipse 50% 60% at 90% 80%, rgba(255,160,196,0.14) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* ── Header / Title ── */
        .cal-title-block {
          text-align: center;
          margin-bottom: 24px;
          position: relative;
          z-index: 1;
        }
        .cal-eyebrow {
          font-size: 9px;
          letter-spacing: 3.5px;
          color: #d4607a;
          text-transform: uppercase;
          margin-bottom: 4px;
          font-family: Arial, sans-serif;
          font-weight: 500;
        }
        .cal-title {
          font-size: 28px;
          color: #b83060;
          font-style: italic;
          margin: 0;
          line-height: 1.2;
        }
        .cal-subtitle {
          font-size: 11px;
          color: #c08098;
          margin-top: 4px;
          font-family: Arial, sans-serif;
          letter-spacing: 0.5px;
        }

        /* ── Bow decoration ── */
        .cal-bow-svg {
          display: block;
          margin: 0 auto 6px;
          width: 60px;
          opacity: 0.85;
        }

        /* ── Stats row ── */
        .cal-stats-row {
          display: flex;
          gap: 10px;
          margin-bottom: 22px;
          position: relative;
          z-index: 1;
          flex-wrap: wrap;
        }
        .cal-stat-pill {
          flex: 1 1 0;
          min-width: 80px;
          background: rgba(255,255,255,0.72);
          border: 1px solid rgba(212,96,122,0.22);
          border-radius: 16px;
          padding: 12px 10px 10px;
          text-align: center;
          backdrop-filter: blur(6px);
          box-shadow: 0 2px 12px rgba(180,60,100,0.07);
        }
        .cal-stat-pill .sp-val {
          font-size: 26px;
          color: #b83060;
          line-height: 1;
          font-style: italic;
        }
        .cal-stat-pill .sp-label {
          font-size: 8.5px;
          color: #c08098;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-top: 4px;
          font-family: Arial, sans-serif;
        }
        .cal-stat-pill .sp-heart {
          font-size: 13px;
          display: block;
          margin-bottom: 2px;
        }

        /* ── Month navigation ── */
        .cal-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
          position: relative;
          z-index: 1;
        }
        .cal-nav-btn {
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(212,96,122,0.25);
          border-radius: 50%;
          width: 36px;
          height: 36px;
          font-size: 16px;
          color: #b83060;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.18s, transform 0.15s;
          box-shadow: 0 1px 6px rgba(180,60,100,0.1);
        }
        .cal-nav-btn:hover {
          background: rgba(255,220,232,0.9);
          transform: scale(1.08);
        }
        .cal-month-label {
          font-size: 20px;
          color: #b83060;
          font-style: italic;
          text-align: center;
        }
        .cal-month-label span {
          display: block;
          font-size: 10px;
          color: #d4607a;
          font-style: normal;
          font-family: Arial, sans-serif;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-top: 1px;
        }

        /* ── Day-of-week header ── */
        .cal-dow {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 6px;
          position: relative;
          z-index: 1;
        }
        .cal-dow div {
          text-align: center;
          font-size: 8.5px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #d4607a;
          font-family: Arial, sans-serif;
          font-weight: 600;
          padding-bottom: 4px;
        }

        /* ── Grid ── */
        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 5px;
          position: relative;
          z-index: 1;
        }
        .cal-cell {
          background: rgba(255,255,255,0.60);
          border: 1px solid rgba(232,192,210,0.4);
          border-radius: 14px;
          min-height: 58px;
          padding: 6px 5px 5px;
          cursor: pointer;
          transition: background 0.18s, transform 0.15s, box-shadow 0.18s;
          box-shadow: 0 1px 4px rgba(180,60,100,0.05);
          position: relative;
          overflow: hidden;
        }
        .cal-cell:hover {
          background: rgba(255,235,243,0.88);
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(180,60,100,0.13);
        }
        .cal-cell.empty {
          background: transparent;
          border-color: transparent;
          box-shadow: none;
          cursor: default;
          pointer-events: none;
        }
        .cal-cell.today {
          border-color: #d4607a;
          background: rgba(255,228,238,0.85);
          box-shadow: 0 0 0 2px rgba(212,96,122,0.18), 0 2px 10px rgba(180,60,100,0.1);
        }
        .cal-cell.has-booking {
          background: rgba(255,220,232,0.72);
          border-color: rgba(212,96,122,0.4);
        }
        .cal-cell.selected {
          background: rgba(255,200,220,0.9);
          border-color: #b83060;
          box-shadow: 0 0 0 2.5px rgba(184,48,96,0.28), 0 4px 16px rgba(180,60,100,0.18);
          transform: translateY(-2px);
        }
        .cal-day-num {
          font-size: 13px;
          color: #8a3050;
          font-weight: normal;
          font-style: italic;
          line-height: 1;
          margin-bottom: 3px;
        }
        .cal-cell.today .cal-day-num {
          color: #b83060;
          font-weight: bold;
        }
        .cal-hearts-row {
          display: flex;
          flex-wrap: wrap;
          gap: 2px;
          margin-bottom: 2px;
        }
        .cal-heart-dot {
          font-size: 10px;
          line-height: 1;
          filter: drop-shadow(0 1px 1px rgba(180,60,100,0.18));
          animation: cal-heart-beat 2.4s ease-in-out infinite;
        }
        @keyframes cal-heart-beat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.18); }
        }
        .cal-client-pill {
          font-size: 7.5px;
          background: rgba(212,96,122,0.18);
          color: #9a2848;
          border-radius: 20px;
          padding: 1px 5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          font-family: Arial, sans-serif;
          display: block;
          margin-bottom: 1px;
        }
        .cal-more-label {
          font-size: 7px;
          color: #d4607a;
          font-family: Arial, sans-serif;
          font-style: italic;
        }

        /* ── Detail panel ── */
        .cal-detail-panel {
          position: relative;
          z-index: 1;
          margin-top: 20px;
          background: rgba(255,255,255,0.78);
          border: 1px solid rgba(212,96,122,0.3);
          border-radius: 20px;
          padding: 20px 18px;
          box-shadow: 0 4px 24px rgba(180,60,100,0.1);
          backdrop-filter: blur(8px);
          animation: cal-panel-in 0.22s ease;
        }
        @keyframes cal-panel-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cal-detail-title {
          font-size: 17px;
          color: #b83060;
          font-style: italic;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .cal-detail-title .cdh {
          font-size: 14px;
        }
        .cal-booking-item {
          border-bottom: 1px dashed rgba(212,96,122,0.22);
          padding: 12px 0;
        }
        .cal-booking-item:last-child { border-bottom: none; padding-bottom: 0; }
        .cal-bi-name {
          font-size: 15px;
          color: #2a1520;
          font-style: italic;
          margin-bottom: 6px;
        }
        .cal-bi-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-bottom: 6px;
        }
        .cal-bi-chip {
          font-size: 9px;
          padding: 3px 9px;
          border-radius: 20px;
          font-family: Arial, sans-serif;
          letter-spacing: 0.3px;
        }
        .cal-bi-chip.time     { background:#fff0f5; color:#b83060; border:1px solid rgba(212,96,122,0.3); }
        .cal-bi-chip.occasion { background:#ffedf4; color:#9a2848; border:1px solid rgba(180,60,100,0.2); }
        .cal-bi-chip.pkg      { background:#fde8ef; color:#7a2040; border:1px solid rgba(160,50,80,0.2); }
        .cal-bi-row {
          font-size: 10.5px;
          color: #7a4060;
          font-family: Arial, sans-serif;
          margin-bottom: 3px;
          display: flex;
          align-items: flex-start;
          gap: 5px;
        }
        .cal-bi-row strong { color: #b83060; min-width: 14px; }
        .cal-bi-balance {
          margin-top: 8px;
          background: rgba(255,220,232,0.5);
          border-radius: 10px;
          padding: 7px 12px;
          font-size: 11px;
          color: #9a2848;
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .cal-bi-balance strong { font-size: 13px; color: #b83060; }
        .cal-empty-day {
          text-align: center;
          color: #c09aaa;
          font-size: 13px;
          font-style: italic;
          padding: 18px 0 6px;
        }
        .cal-empty-day .ced-heart { font-size: 22px; display: block; margin-bottom: 6px; }

        /* ── Floating hearts (decorative) ── */
        .cal-float-hearts {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .cal-fh {
          position: absolute;
          font-size: 14px;
          opacity: 0.08;
          animation: cal-fh-float linear infinite;
        }
        @keyframes cal-fh-float {
          0%   { transform: translateY(100vh) rotate(0deg); opacity: 0.06; }
          50%  { opacity: 0.12; }
          100% { transform: translateY(-10vh) rotate(20deg); opacity: 0.04; }
        }

        /* ── Loading ── */
        .cal-loading {
          text-align: center;
          padding: 60px 20px;
          color: #d4607a;
          font-style: italic;
          font-size: 15px;
        }
        .cal-loading-heart {
          font-size: 36px;
          display: block;
          margin-bottom: 12px;
          animation: cal-heart-beat 1.6s ease-in-out infinite;
        }
      </style>

      <!-- ═══ ROOT ═══ -->
      <div id="calRoot">

        <!-- Floating decorative hearts -->
        <div class="cal-float-hearts" id="calFloatHearts"></div>

        <!-- Title -->
        <div class="cal-title-block">
          <div class="cal-eyebrow">✦ Admin Dashboard ✦</div>
          <svg class="cal-bow-svg" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
            <g opacity="0.82">
              <!-- Left wing -->
              <path d="M60 20 C51 11, 28 16, 36 22 C28 28, 51 33, 60 20Z" fill="#d4607a"/>
              <!-- Right wing -->
              <path d="M60 20 C69 11, 92 16, 84 22 C92 28, 69 33, 60 20Z" fill="#d4607a"/>
              <!-- Knot -->
              <ellipse cx="60" cy="20" rx="7" ry="8" fill="#b83060"/>
            </g>
          </svg>
          <h2 class="cal-title">My Performance Calendar</h2>
          <p class="cal-subtitle">All your confirmed bookings, beautifully arranged 🩷</p>
        </div>

        <!-- Stats row -->
        <div class="cal-stats-row" id="calStatsRow"></div>

        <!-- Month nav -->
        <div class="cal-nav">
          <button class="cal-nav-btn" onclick="calPrevMonth()">‹</button>
          <div class="cal-month-label" id="calMonthLabel"></div>
          <button class="cal-nav-btn" onclick="calNextMonth()">›</button>
        </div>

        <!-- Day-of-week header -->
        <div class="cal-dow">
          <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div>
          <div>Thu</div><div>Fri</div><div>Sat</div>
        </div>

        <!-- Calendar grid -->
        <div class="cal-grid" id="calGrid"></div>

        <!-- Detail panel -->
        <div id="calDetailPanel"></div>
      </div>
    `;

    _spawnFloatingHearts();
    _renderCalGrid();
    _renderStats();
  }

  // ── Floating hearts ────────────────────────────────────────────
  function _spawnFloatingHearts() {
    const container = document.getElementById('calFloatHearts');
    if (!container) return;
    const hearts = ['🩷','💗','💕','🌸','💞','🩷'];
    for (let i = 0; i < 18; i++) {
      const h = document.createElement('span');
      h.className = 'cal-fh';
      h.textContent = hearts[i % hearts.length];
      h.style.left     = Math.random() * 100 + '%';
      h.style.animationDuration = (14 + Math.random() * 20) + 's';
      h.style.animationDelay   = (Math.random() * 18) + 's';
      h.style.fontSize = (10 + Math.random() * 14) + 'px';
      container.appendChild(h);
    }
  }

  // ── Stats ──────────────────────────────────────────────────────
  function _renderStats() {
    const now      = new Date();
    const thisMonth = calBookings.filter(b => {
      const d = new Date(b.date);
      return !isNaN(d) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const upcoming = calBookings.filter(b => {
      const d = new Date(b.date);
      return !isNaN(d) && d >= now;
    });
    let totalBalance = 0;
    upcoming.forEach(b => {
      const bd = getPriceBreakdown(b);
      if (!bd.isNegotiable) totalBalance += b.total !== undefined ? b.total : (bd.total - 200);
    });
    const balStr = totalBalance > 0 ? '₱' + totalBalance.toLocaleString() : '—';

    document.getElementById('calStatsRow').innerHTML = `
      <div class="cal-stat-pill">
        <span class="sp-heart">🩷</span>
        <div class="sp-val">${calBookings.length}</div>
        <div class="sp-label">Total Bookings</div>
      </div>
      <div class="cal-stat-pill">
        <span class="sp-heart">💗</span>
        <div class="sp-val">${thisMonth.length}</div>
        <div class="sp-label">This Month</div>
      </div>
      <div class="cal-stat-pill">
        <span class="sp-heart">💕</span>
        <div class="sp-val">${upcoming.length}</div>
        <div class="sp-label">Upcoming</div>
      </div>
      <div class="cal-stat-pill">
        <span class="sp-heart">🌸</span>
        <div class="sp-val" style="font-size:17px">${balStr}</div>
        <div class="sp-label">Balance Due</div>
      </div>
    `;
  }

  // ── Month navigation ───────────────────────────────────────────
  window.calPrevMonth = function () {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    selectedDay = null;
    _renderCalGrid();
  };
  window.calNextMonth = function () {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    selectedDay = null;
    _renderCalGrid();
  };

  // ── Build grid ─────────────────────────────────────────────────
  function _renderCalGrid() {
    const MONTHS = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];

    document.getElementById('calMonthLabel').innerHTML =
      `${MONTHS[calMonth]}<span>${calYear}</span>`;

    const firstDay   = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const today = new Date();

    // Build day→bookings map
    const dayMap = {};
    calBookings.forEach(b => {
      const d = new Date(b.date);
      if (isNaN(d)) return;
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const key = d.getDate();
        if (!dayMap[key]) dayMap[key] = [];
        dayMap[key].push(b);
      }
    });

    let html = '';

    // Empty leading cells
    for (let i = 0; i < firstDay; i++) {
      html += `<div class="cal-cell empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = (
        today.getDate()     === day &&
        today.getMonth()    === calMonth &&
        today.getFullYear() === calYear
      );
      const bookings = dayMap[day] || [];
      const hasB     = bookings.length > 0;
      const isSelected = selectedDay === day;

      let classes = 'cal-cell';
      if (isToday)    classes += ' today';
      if (hasB)       classes += ' has-booking';
      if (isSelected) classes += ' selected';

      // Hearts
      let heartsHTML = '';
      if (hasB) {
        heartsHTML = `<div class="cal-hearts-row">`;
        const max = Math.min(bookings.length, 3);
        for (let h = 0; h < max; h++) {
          heartsHTML += `<span class="cal-heart-dot" style="animation-delay:${h * 0.4}s">🩷</span>`;
        }
        heartsHTML += `</div>`;
      }

      // Client pills (max 2 shown)
      let pillsHTML = '';
      if (hasB) {
        const show = bookings.slice(0, 2);
        pillsHTML = show.map(b => {
          const firstName = (b.name || '').split(' ')[0];
          return `<span class="cal-client-pill">${_esc(firstName)}</span>`;
        }).join('');
        if (bookings.length > 2) {
          pillsHTML += `<span class="cal-more-label">+${bookings.length - 2} more</span>`;
        }
      }

      html += `
        <div class="${classes}" onclick="calSelectDay(${day})">
          <div class="cal-day-num">${day}</div>
          ${heartsHTML}
          ${pillsHTML}
        </div>`;
    }

    document.getElementById('calGrid').innerHTML = html;
    _renderDetailPanel();
  }

  // ── Day selection ──────────────────────────────────────────────
  window.calSelectDay = function (day) {
    selectedDay = selectedDay === day ? null : day;
    _renderCalGrid();
  };

  // ── Detail panel ───────────────────────────────────────────────
  function _renderDetailPanel() {
    const panel = document.getElementById('calDetailPanel');
    if (!panel) return;

    if (selectedDay === null) {
      // Show next upcoming booking as default
      const upcoming = calBookings
        .filter(b => { const d = new Date(b.date); return !isNaN(d) && d >= new Date(); })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (upcoming.length === 0) {
        panel.innerHTML = '';
        return;
      }
      const next = upcoming[0];
      const d = new Date(next.date);
      const label = d.toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric' });
      panel.innerHTML = `
        <div class="cal-detail-panel">
          <div class="cal-detail-title">
            <span class="cdh">🩷</span> Next Up: ${_esc(label)}
          </div>
          ${_buildBookingItem(next)}
        </div>`;
      return;
    }

    // Find bookings for selected day
    const dayBookings = calBookings.filter(b => {
      const d = new Date(b.date);
      return !isNaN(d) &&
        d.getDate()     === selectedDay &&
        d.getMonth()    === calMonth &&
        d.getFullYear() === calYear;
    });

    const MONTHS = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    const label = `${MONTHS[calMonth]} ${selectedDay}, ${calYear}`;

    if (dayBookings.length === 0) {
      panel.innerHTML = `
        <div class="cal-detail-panel">
          <div class="cal-detail-title"><span class="cdh">📅</span> ${_esc(label)}</div>
          <div class="cal-empty-day">
            <span class="ced-heart">🩷</span>
            No bookings on this day yet~
          </div>
        </div>`;
      return;
    }

    panel.innerHTML = `
      <div class="cal-detail-panel">
        <div class="cal-detail-title">
          <span class="cdh">🩷</span>
          ${_esc(label)}
          <span style="font-size:11px;color:#d4607a;font-style:normal;font-family:Arial,sans-serif;margin-left:4px;">
            (${dayBookings.length} booking${dayBookings.length > 1 ? 's' : ''})
          </span>
        </div>
        ${dayBookings.map(_buildBookingItem).join('')}
      </div>`;
  }

  // ── Single booking detail ──────────────────────────────────────
  function _buildBookingItem(b) {
    const bd = getPriceBreakdown(b);
    return `
      <div class="cal-booking-item">
        <div class="cal-bi-name">🩷 ${_esc(b.name)}</div>
        <div class="cal-bi-chips">
          <span class="cal-bi-chip time">⏰ ${_esc(b.perfTime)}</span>
          <span class="cal-bi-chip occasion">${_esc(b.occasion)}</span>
          <span class="cal-bi-chip pkg">${_esc(b.package)}</span>
        </div>
        <div class="cal-bi-row"><strong>📍</strong> ${_esc(b.venue)}</div>
        ${b.phone ? `<div class="cal-bi-row"><strong>📞</strong> ${_esc(b.phone)}</div>` : ''}
        ${b.notes ? `<div class="cal-bi-row"><strong>📝</strong> <em>${_esc(b.notes)}</em></div>` : ''}
        ${b.adminNote ? `<div class="cal-bi-row"><strong>🗒️</strong> ${_esc(b.adminNote)}</div>` : ''}
        <div class="cal-bi-balance">
          <span>💰 Balance due</span>
          <strong>${_esc(bd.balanceStr)}</strong>
        </div>
      </div>`;
  }

  // ── Util ───────────────────────────────────────────────────────
  function _esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();
