const API_BASE = window.location.origin;

// ════════════════════════════════════════
// STATE
// ════════════════════════════════════════
let adminToken = sessionStorage.getItem('admin_token') || null;
let isLoggedIn = false;
let currentFilter = 'all';
let openCardId = null;
let refreshInterval = null;
let pendingDeleteId = null;

// ════════════════════════════════════════
// ARCHIVE (sessionStorage soft-delete)
// ════════════════════════════════════════
function getArchive() {
  try { return JSON.parse(sessionStorage.getItem('jb_archive') || '[]'); } catch { return []; }
}
function saveArchive(arr) { sessionStorage.setItem('jb_archive', JSON.stringify(arr)); }
function isArchived(id) { return getArchive().some(b => String(b.id) === String(id)); }
function archiveBooking(booking) {
  const arr = getArchive();
  if (!arr.some(b => String(b.id) === String(booking.id))) {
    arr.unshift({ ...booking, archivedAt: new Date().toISOString() });
    saveArchive(arr);
  }
}
function restoreFromArchive(id) { saveArchive(getArchive().filter(b => String(b.id) !== String(id))); }

// ════════════════════════════════════════
// GUARD
// ════════════════════════════════════════
if (!adminToken) {
  window.location.href = 'admin.html';
} else {
  isLoggedIn = true;
  loadDashboard();
}

// ════════════════════════════════════════
// AUTH
// ════════════════════════════════════════
function confirmLogout() { document.getElementById('logoutModal').classList.add('show'); }
function closeLogoutModal() { document.getElementById('logoutModal').classList.remove('show'); }
function doLogout() {
  closeLogoutModal();
  isLoggedIn = false; adminToken = null;
  sessionStorage.removeItem('admin_token');
  window.location.href = 'admin.html';
}

// ════════════════════════════════════════
// TAB SWITCHING
// ════════════════════════════════════════
function switchTab(tab) {
  ['bookings','schedules','archive'].forEach(t => {
    const nav  = document.getElementById('nav' + t.charAt(0).toUpperCase() + t.slice(1));
    const view = document.getElementById('view' + t.charAt(0).toUpperCase() + t.slice(1));
    if (nav)  nav.classList.toggle('active', t === tab);
    if (view) view.style.display = t === tab ? 'flex' : 'none';
  });
  if (tab === 'schedules') renderSchedules();
  if (tab === 'archive')   renderArchive();
}

// ════════════════════════════════════════
// DASHBOARD INIT
// ════════════════════════════════════════
function loadDashboard() {
  const allCard = document.getElementById('filterAll');
  if (allCard) allCard.classList.add('active-filter');
  updateStats();
  renderBookings();
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    if (isLoggedIn) { updateStats(); renderBookings(); }
  }, 10000);
}

// ════════════════════════════════════════
// FETCH
// ════════════════════════════════════════
async function fetchBookingsRaw() {
  try {
    const res = await fetch(API_BASE + '/admin/bookings', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

async function fetchBookings() {
  const all = await fetchBookingsRaw();
  return all.filter(b => !isArchived(b.id));
}

// ════════════════════════════════════════
// PRICE PARSER
// ════════════════════════════════════════
function parsePrice(pkgString) {
  if (!pkgString) return null;
  const match = pkgString.match(/₱([\d,]+)/);
  if (!match) return null;
  return parseInt(match[1].replace(/,/g, ''), 10);
}

function getPriceBreakdown(b) {
  const raw = b.package || '';
  const total = parsePrice(raw);
  const dp = 200;
  if (!total || isNaN(total)) {
    return { totalStr: 'Negotiable', dpStr: '₱200', balanceStr: 'To be discussed', isNegotiable: true };
  }
  const balance = total - dp;
  return {
    total,
    totalStr:   '₱' + total.toLocaleString(),
    dpStr:      '₱200',
    balanceStr: '₱' + balance.toLocaleString(),
    isNegotiable: false
  };
}

// ════════════════════════════════════════
// STATS + FILTER
// ════════════════════════════════════════
async function updateStats() {
  const all       = await fetchBookings();
  const pending   = all.filter(b => b.status === 'pending').length;
  const confirmed = all.filter(b => b.status === 'confirmed').length;
  const declined  = all.filter(b => b.status === 'declined').length;

  document.getElementById('statTotal').textContent     = all.length;
  document.getElementById('statPending').textContent   = pending;
  document.getElementById('statConfirmed').textContent = confirmed;
  document.getElementById('statDeclined').textContent  = declined;

  const pb = document.getElementById('navBadgePending');
  pb.textContent = pending;
  pb.className = 'nav-badge' + (pending > 0 ? ' alert' : '');

  document.getElementById('navBadgeSchedules').textContent = confirmed;
  document.getElementById('navBadgeArchive').textContent   = getArchive().length;
}

function setFilter(filter, el) {
  currentFilter = filter;
  ['filterAll','filterPending','filterConfirmed','filterDeclined'].forEach(id => {
    const card = document.getElementById(id);
    if (card) card.classList.remove('active-filter');
  });
  if (el) el.classList.add('active-filter');
  renderBookings();
}

// ════════════════════════════════════════
// BOOKINGS TAB
// ════════════════════════════════════════
async function renderBookings() {
  let all = await fetchBookings();
  all.sort((a, b) => {
    const order = s => s === 'pending' ? 0 : s === 'confirmed' ? 1 : 2;
    const oa = order(a.status), ob = order(b.status);
    if (oa !== ob) return oa - ob;
    return String(b.id) > String(a.id) ? 1 : -1;
  });
  if (currentFilter !== 'all') {
    all = all.filter(b => b.status === currentFilter);
  }
  const area = document.getElementById('bookingsArea');
  if (all.length === 0) {
    area.innerHTML = '<div class="empty-state"><span class="ei">🌸</span><p>No bookings in this category yet.</p></div>';
    return;
  }
  area.innerHTML = all.map(b => buildCardHTML(b)).join('');
  if (openCardId) {
    const body = document.getElementById('body-' + openCardId);
    const chev = document.getElementById('chev-' + openCardId);
    if (body) body.classList.add('open');
    if (chev) chev.classList.add('open');
  }
}

function getStatusLabel(b) {
  if (b.status === 'confirmed') return '✅ Confirmed';
  if (b.status === 'declined')  return '❌ Declined';
  return '⏳ Pending';
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
       + ' · ' + d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}

function buildCardHTML(b) {
  const sc  = b.status === 'confirmed' ? 'confirmed' : b.status === 'declined' ? 'declined' : 'pending';
  const sl  = getStatusLabel(b);
  const isSettled = b.status === 'confirmed' || b.status === 'declined';
  const bd  = getPriceBreakdown(b);

  const ssHTML = b.gcashScreenshot
    ? `<div class="ss-section">
         <div class="ss-section-head">📸 GCash Screenshot</div>
         <img class="ss-img" src="${b.gcashScreenshot}" alt="GCash Screenshot"/>
       </div>`
    : `<div class="ss-section">
         <div class="no-ss-warning">
           <span class="wi">⚠️</span>
           <div class="wt"><strong>No GCash screenshot yet.</strong><br>Client hasn't uploaded their ₱200 downpayment confirmation.</div>
         </div>
       </div>`;

  const priceHTML = `
    <div class="price-strip">
      <div class="price-row">
        <span class="pr-label">Package Total</span>
        <span class="pr-val">${escHtml(bd.totalStr)}</span>
      </div>
      <div class="price-row">
        <span class="pr-label">Downpayment Paid (GCash)</span>
        <span class="pr-val deducted">− ${escHtml(bd.dpStr)}</span>
      </div>
      <div class="price-row balance-row">
        <span class="pr-label">Remaining Balance</span>
        <span class="pr-val balance">${escHtml(bd.balanceStr)}</span>
      </div>
    </div>`;

  let actionHTML = '';
  if (b.status === 'confirmed') {
    actionHTML = `
      <div class="confirmed-banner">
        <span class="banner-icon">✅</span>
        <span>Confirmed on ${formatDate(b.updatedAt)}</span>
        <button class="btn-revert" onclick="revertStatus(${b.id})">Revert</button>
      </div>
      <div class="action-row" style="margin-top:10px;">
        <button class="btn-receipt" onclick="downloadReceipt(${b.id})">📄 Download Receipt</button>
        <button class="btn-archive-booking" onclick="promptDelete(${b.id})" title="Archive">🗂️ Archive</button>
      </div>`;
  } else if (b.status === 'declined') {
    actionHTML = `
      <div class="declined-banner">
        <span class="banner-icon">❌</span>
        <span>Declined on ${formatDate(b.updatedAt)}</span>
        <button class="btn-revert" onclick="revertStatus(${b.id})">Revert</button>
      </div>
      <div style="margin-top:10px;">
        <button class="btn-archive-booking" style="width:100%" onclick="promptDelete(${b.id})">🗂️ Archive Booking</button>
      </div>`;
  } else {
    actionHTML = `
      <div class="admin-note-row">
        <label>Admin Note (optional)</label>
        <textarea id="note-${b.id}" rows="2" placeholder="e.g. Called client, waiting for payment…">${b.adminNote || ''}</textarea>
      </div>
      <div class="action-row">
        <button class="btn-confirm" onclick="updateBookingStatus(${b.id},'confirmed')">✅ Confirm</button>
        <button class="btn-decline" onclick="updateBookingStatus(${b.id},'declined')">❌ Decline</button>
        <button class="btn-archive-booking" onclick="promptDelete(${b.id})" title="Archive">🗂️</button>
      </div>`;
  }

  const noteDisplay = (isSettled && b.adminNote)
    ? `<div style="margin-top:9px;padding:9px 13px;background:var(--rose-50);border-radius:10px;font-size:12px;color:var(--mauve);"><strong>Note:</strong> ${escHtml(b.adminNote)}</div>`
    : '';

  return `
    <div class="booking-card" id="card-${b.id}">
      <div class="card-header" onclick="toggleCard(${b.id})">
        <span class="status-dot ${sc}"></span>
        <div class="card-info">
          <div class="card-name">${escHtml(b.name)}</div>
          <div class="card-meta">📅 ${escHtml(b.date)} · ${escHtml(b.occasion)} · ${escHtml(b.package)}</div>
        </div>
        <div class="card-right">
          <span class="status-badge ${sc}">${sl}</span>
        </div>
        <span class="chevron" id="chev-${b.id}">▼</span>
      </div>
      <div class="card-body" id="body-${b.id}">
        <div class="detail-grid">
          <div class="detail-item"><div class="dl">Client Name</div><div class="dv">${escHtml(b.name)}</div></div>
          ${b.phone ? `<div class="detail-item"><div class="dl">Contact Number</div><div class="dv">${escHtml(b.phone)}</div></div>` : ''}
          <div class="detail-item"><div class="dl">Event Date</div><div class="dv">${escHtml(b.date)}</div></div>
          <div class="detail-item"><div class="dl">Performance Time</div><div class="dv">${escHtml(b.perfTime)}</div></div>
          <div class="detail-item"><div class="dl">Occasion</div><div class="dv">${escHtml(b.occasion)}</div></div>
          <div class="detail-item full"><div class="dl">Venue</div><div class="dv">${escHtml(b.venue)}</div></div>
          <div class="detail-item"><div class="dl">Package</div><div class="dv"><span class="pkg-badge">${escHtml(b.package)}</span></div></div>
          ${b.notes ? `<div class="detail-item full"><div class="dl">Notes</div><div class="dv">${escHtml(b.notes)}</div></div>` : ''}
        </div>
        ${priceHTML}
        ${ssHTML}
        ${actionHTML}
        ${noteDisplay}
        <div class="submitted-time">Submitted: ${formatDate(b.submittedAt)}</div>
      </div>
    </div>`;
}

function toggleCard(id) {
  const body = document.getElementById('body-' + id);
  const chev = document.getElementById('chev-' + id);
  if (!body) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  chev.classList.toggle('open', !isOpen);
  openCardId = isOpen ? null : id;
}

async function updateBookingStatus(id, status) {
  const noteEl = document.getElementById('note-' + id);
  const note = noteEl ? noteEl.value.trim() : '';
  try {
    await fetch(API_BASE + '/admin/bookings/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
      body: JSON.stringify({ status, adminNote: note })
    });
    if (status === 'confirmed') {
      const all = await fetchBookingsRaw();
      const b = all.find(x => String(x.id) === String(id));
      if (b) {
        b.adminNote = note;
        setTimeout(() => generateReceipt(b), 600);
      }
    }
    showToast(status === 'confirmed' ? '✅ Booking confirmed! Receipt downloading…' : '❌ Booking declined.');
    updateStats(); renderBookings();
  } catch { showToast('❌ Error updating booking.'); }
}

async function revertStatus(id) {
  try {
    await fetch(API_BASE + '/admin/bookings/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
      body: JSON.stringify({ status: 'pending', adminNote: '' })
    });
    showToast('↩️ Booking reverted to pending.');
    updateStats(); renderBookings();
  } catch { showToast('❌ Error reverting.'); }
}

// ════════════════════════════════════════
// RECEIPT — 1200×1200 square, high-res
// Design in 600-unit space, scale ×2 for
// crisp 1200px PNG output
// ════════════════════════════════════════
async function downloadReceipt(id) {
  const all = await fetchBookingsRaw();
  const b = all.find(x => String(x.id) === String(id));
  if (!b) { showToast('❌ Could not load booking data.'); return; }
  generateReceipt(b);
}

function generateReceipt(b) {
  const canvas = document.getElementById('receiptCanvas');
  const S = 1200; // output size — square, high-res
  canvas.width  = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');

  // Design in 600×600 space, render at 2× for crispness
  ctx.scale(2, 2);
  const D   = 600;
  const PAD = 28;

  // ── PALETTE ──────────────────────────────────────────
  const C = {
    bgTop:    '#fff4f7',
    bgBot:    '#fce4ef',
    white:    '#ffffff',
    rose:     '#e0607a',
    deepRose: '#c0405a',
    roseText: '#a03050',
    mauve:    '#9a6070',
    ink:      '#2d1520',
    green:    '#1a7a50',
    border:   '#f0c0d0',
    bar:      '#e8a0b8',
  };

  // ── BACKGROUND gradient ──────────────────────────────
  const bgG = ctx.createLinearGradient(0, 0, 0, D);
  bgG.addColorStop(0, C.bgTop);
  bgG.addColorStop(1, C.bgBot);
  ctx.fillStyle = bgG;
  ctx.fillRect(0, 0, D, D);

  // ── SHAPE PRIMITIVES ─────────────────────────────────

  function rr(x, y, w, h, r) {
    if (typeof r === 'number') r = { tl:r, tr:r, br:r, bl:r };
    ctx.beginPath();
    ctx.moveTo(x+r.tl, y);
    ctx.lineTo(x+w-r.tr, y);
    ctx.quadraticCurveTo(x+w, y,   x+w, y+r.tr);
    ctx.lineTo(x+w, y+h-r.br);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r.br, y+h);
    ctx.lineTo(x+r.bl, y+h);
    ctx.quadraticCurveTo(x, y+h,   x, y+h-r.bl);
    ctx.lineTo(x, y+r.tl);
    ctx.quadraticCurveTo(x, y,     x+r.tl, y);
    ctx.closePath();
  }

  function card(x, y, w, h, radius) {
    ctx.save();
    ctx.shadowColor   = 'rgba(200,100,130,0.13)';
    ctx.shadowBlur    = 10;
    ctx.shadowOffsetY = 3;
    rr(x, y, w, h, radius);
    ctx.fillStyle = C.white;
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = C.border;
    ctx.lineWidth   = 0.6;
    rr(x, y, w, h, radius);
    ctx.stroke();
  }

  function topBar(x, y, w, color) {
    ctx.fillStyle = color;
    rr(x, y, w, 5, { tl:14, tr:14, bl:0, br:0 });
    ctx.fill();
  }

  function star(cx, cy, r, alpha, color) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const oa = (Math.PI/2) + i*(2*Math.PI/5);
      const ia = oa + Math.PI/5;
      const ir = r * 0.42;
      const ox = cx + r*Math.cos(oa),  oy = cy - r*Math.sin(oa);
      const ix = cx + ir*Math.cos(ia), iy = cy - ir*Math.sin(ia);
      if (i===0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function flower(cx, cy, r, alpha, color) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = color;
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(i * Math.PI/2);
      ctx.beginPath();
      ctx.ellipse(0, -r*0.6, r*0.38, r*0.6, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle   = '#f9a8c0';
    ctx.globalAlpha = Math.min(alpha*1.3, 1);
    ctx.beginPath();
    ctx.arc(cx, cy, r*0.28, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function diamond(cx, cy, r, alpha, color) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy-r);
    ctx.lineTo(cx+r*0.55, cy);
    ctx.lineTo(cx, cy+r);
    ctx.lineTo(cx-r*0.55, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function hline(y, x1, x2) {
    ctx.strokeStyle = C.border;
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
  }

  // ── BACKGROUND SCATTER ────────────────────────────────
  [
    ['star',    26,   26,   7,  0.16, C.rose],
    ['flower',  D-26, 26,   6,  0.13, C.rose],
    ['star',    D-26, D-26, 7,  0.16, C.rose],
    ['flower',  26,   D-26, 6,  0.13, C.rose],
    ['diamond', D/2,  14,   4,  0.15, C.deepRose],
    ['diamond', D/2,  D-14, 4,  0.15, C.deepRose],
    ['star',    14,   D*0.38, 4, 0.11, C.rose],
    ['flower',  14,   D*0.63, 4, 0.10, C.rose],
    ['star',    D-14, D*0.38, 4, 0.11, C.rose],
    ['flower',  D-14, D*0.63, 4, 0.10, C.rose],
  ].forEach(([t,x,y,r,a,col]) => {
    if (t==='star')    star(x,y,r,a,col);
    if (t==='flower')  flower(x,y,r,a,col);
    if (t==='diamond') diamond(x,y,r,a,col);
  });

  // ── LAYOUT CONSTANTS ──────────────────────────────────
  const L   = PAD;
  const CW  = D - PAD*2;
  const C1  = PAD + 12;
  const C2  = D/2 + 8;
  const CW2 = D/2 - PAD - 20;
  const RE  = D - PAD - 12;

  // ── TEXT HELPERS ──────────────────────────────────────
  function spaceLabel(text, x, y) {
    ctx.save();
    ctx.font      = '700 7.5px Arial, sans-serif';
    ctx.fillStyle = C.rose;
    ctx.textAlign = 'left';
    let cx = x;
    text.toUpperCase().split('').forEach(ch => {
      ctx.fillText(ch, cx, y);
      cx += ctx.measureText(ch).width + 1;
    });
    ctx.restore();
  }

  function fieldPair(lbl, val, x, y, maxW) {
    spaceLabel(lbl, x, y);
    ctx.font      = '400 12.5px Georgia, serif';
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'left';
    let v = String(val || '—');
    if (maxW) {
      while (ctx.measureText(v).width > maxW && v.length > 2) v = v.slice(0,-1);
      if (v !== String(val||'—')) v += '…';
    }
    ctx.fillText(v, x, y+16);
  }

  function sectionHead(text, x, y) {
    ctx.font      = '700 8.5px Arial, sans-serif';
    ctx.fillStyle = C.roseText;
    ctx.textAlign = 'left';
    ctx.fillText(text, x, y);
    hline(y+4, x, RE);
  }

  // ── CARD CURSOR ──────────────────────────────────────
  let cy = PAD;

  // ════════════════════════
  // CARD 1 — HEADER  h=108
  // ════════════════════════
  const H1 = 108;
  card(L, cy, CW, H1, 14);
  topBar(L, cy, CW, C.bar);
  star(C1+4,  cy+2.5, 3,   0.55, '#fff');
  star(D/2,   cy+2.5, 2.5, 0.40, '#fff');
  star(RE-4,  cy+2.5, 3,   0.50, '#fff');

  // brand
  ctx.fillStyle = C.deepRose;
  ctx.font      = 'bold 20px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('Jeoan Gwyneth Dajay Gran', C1, cy+28);

  ctx.font      = '400 9.5px Arial, sans-serif';
  ctx.fillStyle = C.mauve;
  ctx.fillText('Singer & Host for Hire  ·  South Cotabato  ·  0912 797 7245', C1, cy+43);

  hline(cy+53, C1, RE);
  flower(C1-4, cy+53, 3.5, 0.22, C.rose);
  flower(RE+4, cy+53, 3.5, 0.22, C.rose);

  // confirmed badge
  ctx.fillStyle = '#e6f5ee';
  rr(C1, cy+62, 155, 22, 7);
  ctx.fill();
  ctx.strokeStyle = '#9dd4b8'; ctx.lineWidth = 0.6;
  rr(C1, cy+62, 155, 22, 7);
  ctx.stroke();
  ctx.fillStyle = C.green;
  ctx.font      = 'bold 9px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('✓  BOOKING CONFIRMED', C1+9, cy+77);

  ctx.font      = '8.5px Arial, sans-serif';
  ctx.fillStyle = C.mauve;
  ctx.textAlign = 'right';
  ctx.fillText(
    'Issued ' + new Date().toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'}),
    RE, cy+77
  );

  cy += H1 + 8;

  // ════════════════════════
  // CARD 2 — DETAILS  h=178
  // ════════════════════════
  const H2 = 178;
  card(L, cy, CW, H2, 14);
  topBar(L, cy, CW, C.bar);
  star(C1+4,  cy+2.5, 3,   0.50, '#fff');
  flower(D/2, cy+2.5, 3,   0.38, '#fff');
  star(RE-4,  cy+2.5, 3,   0.45, '#fff');

  sectionHead('BOOKING DETAILS', C1, cy+18);

  let fy = cy + 33;
  const FR = 40;

  fieldPair('Client Name',      b.name,            C1, fy, CW2);
  fieldPair('Event Date',       b.date,             C2, fy, CW2);
  fy += FR;
  fieldPair('Contact Number',   b.phone || '—',    C1, fy, CW2);
  fieldPair('Performance Time', b.perfTime || '—', C2, fy, CW2);
  fy += FR;
  fieldPair('Occasion',         b.occasion,         C1, fy, CW2);
  fieldPair('Package',          b.package,          C2, fy, CW2);
  fy += FR;
  fieldPair('Venue',            b.venue,            C1, fy, CW-24);
  fy += 28;

  if (b.notes) {
    ctx.font      = 'italic 10.5px Georgia, serif';
    ctx.fillStyle = C.mauve;
    ctx.textAlign = 'left';
    ctx.fillText('" ' + b.notes + ' "', C1, fy);
  }

  // small dividers between rows
  [cy+72, cy+112, cy+152].forEach(sy => {
    diamond(D/2-7, sy, 2, 0.13, C.rose);
    diamond(D/2,   sy, 2, 0.13, C.rose);
    diamond(D/2+7, sy, 2, 0.13, C.rose);
  });

  cy += H2 + 8;

  // ════════════════════════
  // CARD 3 — PAYMENT  h=100
  // ════════════════════════
  const H3 = 100;
  card(L, cy, CW, H3, 14);
  topBar(L, cy, CW, C.rose);
  star(C1+4,  cy+2.5, 3,   0.55, '#fff');
  flower(D/2, cy+2.5, 3,   0.42, '#fff');
  star(RE-4,  cy+2.5, 3,   0.50, '#fff');

  sectionHead('PAYMENT SUMMARY', C1, cy+18);

  const bd = getPriceBreakdown(b);

  ctx.font      = '400 11px Arial, sans-serif';
  ctx.fillStyle = C.mauve; ctx.textAlign = 'left';
  ctx.fillText('Package Total', C1, cy+38);
  ctx.font      = '500 11.5px Arial, sans-serif';
  ctx.fillStyle = C.ink;  ctx.textAlign = 'right';
  ctx.fillText(bd.totalStr, RE, cy+38);

  ctx.font      = '400 11px Arial, sans-serif';
  ctx.fillStyle = C.mauve; ctx.textAlign = 'left';
  ctx.fillText('Downpayment Paid (GCash)', C1, cy+54);
  ctx.font      = '600 11px Arial, sans-serif';
  ctx.fillStyle = C.green; ctx.textAlign = 'right';
  ctx.fillText('− ' + bd.dpStr, RE, cy+54);

  ctx.strokeStyle = C.border; ctx.lineWidth = 0.8;
  ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.moveTo(C1, cy+63); ctx.lineTo(RE, cy+63); ctx.stroke();
  ctx.setLineDash([]);

  ctx.font      = '700 9.5px Arial, sans-serif';
  ctx.fillStyle = C.deepRose; ctx.textAlign = 'left';
  ctx.fillText('Remaining Balance', C1, cy+84);
  ctx.font      = 'bold 20px Georgia, serif';
  ctx.fillStyle = C.deepRose; ctx.textAlign = 'right';
  ctx.fillText(bd.balanceStr, RE, cy+88);

  cy += H3 + 8;

  // ════════════════════════
  // CARD 4 — T&C  h=130
  // ════════════════════════
  const H4 = 130;
  card(L, cy, CW, H4, 14);
  topBar(L, cy, CW, '#f5c0d0');
  star(C1+4,  cy+2.5, 3,   0.50, C.deepRose);
  flower(D/2, cy+2.5, 3,   0.38, C.deepRose);
  star(RE-4,  cy+2.5, 3,   0.45, C.deepRose);

  sectionHead('TERMS & CONDITIONS', C1, cy+18);

  // 6 terms in 2 columns × 3 rows
  const terms = [
    { label: 'Downpayment:',  text: '₱200 non-refundable to lock in your date. Deducted from total.' },
    { label: 'Payment:',      text: 'Remaining balance via Cash or GCash right after the performance.' },
    { label: 'Tech Check:',   text: 'Venue must provide a working sound system and microphone.' },
    { label: 'Early Bird:',   text: 'She arrives 30 minutes early for soundcheck.' },
    { label: 'Cancellations:',text: 'Client cancels = DP forfeited. She cancels due to emergency = 100% refund.' },
    { label: 'Safety First:', text: 'Outdoor venues MUST have a covered area for the performer.' },
  ];

  const TL1  = C1;
  const TL2  = D/2 + 4;
  const TMAX = CW/2 - 18;
  const TRH  = 17;

  terms.forEach((t, i) => {
    const col = i % 2 === 0 ? TL1 : TL2;
    const row = Math.floor(i / 2);
    const ty  = cy + 30 + row * 32;

    // dot
    ctx.save();
    ctx.fillStyle   = C.rose;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.arc(col, ty-4, 2, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // bold label
    ctx.font      = '700 8.5px Arial, sans-serif';
    ctx.fillStyle = C.deepRose;
    ctx.textAlign = 'left';
    ctx.fillText(t.label, col+6, ty);

    // body — fit into TMAX, wrap to 2 lines
    ctx.font = '400 8.5px Arial, sans-serif';
    ctx.fillStyle = C.ink;
    const words = t.text.split(' ');
    let l1 = '', l2 = '', broken = false;
    for (const w of words) {
      const test = (broken ? l2 : l1) + w + ' ';
      if (!broken && ctx.measureText(test).width > TMAX) {
        broken = true; l2 = w + ' ';
      } else if (broken) {
        if (ctx.measureText(l2 + w + ' ').width < TMAX) l2 += w + ' ';
        // else drop — 2 lines max
      } else {
        l1 = test;
      }
    }
    ctx.fillText(l1.trim(), col+6, ty + TRH - 4);
    if (l2.trim()) ctx.fillText(l2.trim(), col+6, ty + TRH*2 - 8);
  });

  cy += H4 + 8;

  // ════════════════════════
  // CARD 5 — FOOTER  fills rest
  // ════════════════════════
  const H5 = D - cy - PAD;
  const ftG = ctx.createLinearGradient(0, cy, 0, cy+H5);
  ftG.addColorStop(0, '#fde0ec');
  ftG.addColorStop(1, '#f9c8d8');
  ctx.save();
  ctx.shadowColor   = 'rgba(200,100,130,0.13)';
  ctx.shadowBlur    = 10;
  ctx.shadowOffsetY = 3;
  rr(L, cy, CW, H5, 14);
  ctx.fillStyle = ftG;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = C.border; ctx.lineWidth = 0.6;
  rr(L, cy, CW, H5, 14);
  ctx.stroke();

  topBar(L, cy, CW, C.rose);
  [C1+4, D/2-28, D/2, D/2+28, RE-4].forEach((sx, i) => {
    star(sx, cy+2.5, i===2?4:2.8, 0.55, '#fff');
  });

  // dot texture
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle   = '#fff';
  for (let dx = L+16; dx < L+CW-10; dx+=18) {
    for (let dy = cy+12; dy < cy+H5-6; dy+=18) {
      ctx.beginPath(); ctx.arc(dx,dy,1.3,0,Math.PI*2); ctx.fill();
    }
  }
  ctx.restore();

  // side deco
  flower(C1+8,  cy+H5*0.28, 4,   0.17, C.deepRose);
  star(C1+8,    cy+H5*0.65, 3.5, 0.15, C.deepRose);
  flower(RE-8,  cy+H5*0.28, 4,   0.17, C.deepRose);
  star(RE-8,    cy+H5*0.65, 3.5, 0.15, C.deepRose);

  const fm = cy + H5/2;

  ctx.font      = '26px serif';
  ctx.textAlign = 'center';
  ctx.fillText('🎤', D/2, fm-14);

  ctx.fillStyle = C.deepRose;
  ctx.font      = 'bold 22px Georgia, serif';
  ctx.textAlign = 'center';
  const firstName = (b.name || 'dear').split(' ')[0];
  ctx.fillText('Thank you, ' + firstName + '!', D/2, fm+8);

  ctx.font      = 'italic 11px Georgia, serif';
  ctx.fillStyle = C.roseText;
  ctx.textAlign = 'center';
  ctx.fillText("Can't wait to perform for your special day!", D/2, fm+24);

  [-48,-24,0,24,48].forEach((ox,i) => {
    star(D/2+ox, fm+38, i===2?5:3.2, i===2?0.40:0.22, C.deepRose);
  });

  ctx.font      = '9px Arial, sans-serif';
  ctx.fillStyle = '#b06080';
  ctx.textAlign = 'center';
  ctx.fillText('0912 797 7245  ·  South Cotabato', D/2, fm+54);

  [-68,-34,0,34,68].forEach(ox => {
    flower(D/2+ox, fm+68, 3.5, 0.17, C.rose);
  });

  // ── DOWNLOAD ─────────────────────────────────────────
  const link = document.createElement('a');
  const safeName = (b.name || 'client').replace(/[^a-z0-9]/gi,'_');
  const safeDate = (b.date || 'booking').replace(/[^a-z0-9]/gi,'_');
  link.download = 'Receipt_' + safeName + '_' + safeDate + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ════════════════════════════════════════
// SCHEDULES TAB
// ════════════════════════════════════════
async function renderSchedules() {
  const area = document.getElementById('schedulesArea');
  area.innerHTML = '<div class="empty-state"><span class="ei" style="font-size:28px">⏳</span><p>Loading…</p></div>';

  const all = await fetchBookings();
  const confirmed = all.filter(b => b.status === 'confirmed');

  if (confirmed.length === 0) {
    area.innerHTML = '<div class="empty-state"><span class="ei">📅</span><p>No confirmed bookings yet.<br>Confirmed bookings will appear here!</p></div>';
    return;
  }

  confirmed.sort((a, b) => {
    const da = new Date(a.date), db = new Date(b.date);
    if (!isNaN(da) && !isNaN(db)) return da - db;
    return String(a.date).localeCompare(String(b.date));
  });

  const groups = {};
  confirmed.forEach(b => {
    const d = new Date(b.date);
    const lbl = isNaN(d) ? 'Unspecified Date' : d.toLocaleDateString('en-PH', { month:'long', year:'numeric' });
    if (!groups[lbl]) groups[lbl] = [];
    groups[lbl].push(b);
  });

  let html = '';
  Object.entries(groups).forEach(([month, bookings]) => {
    html += `<div class="schedule-month-label">📅 ${month}</div>`;
    html += bookings.map(b => buildScheduleCard(b)).join('');
  });
  area.innerHTML = html;
}

function buildScheduleCard(b) {
  const d = new Date(b.date);
  const isPast  = !isNaN(d) && d < new Date();
  const day   = isNaN(d) ? '—' : d.getDate();
  const month = isNaN(d) ? ''  : d.toLocaleDateString('en-PH', { month:'short' }).toUpperCase();
  const year  = isNaN(d) ? ''  : d.getFullYear();
  const bd = getPriceBreakdown(b);

  return `
    <div class="schedule-card${isPast ? ' past' : ''}" id="sched-${b.id}">
      <div class="schedule-date-col">
        <div class="schedule-day">${day}</div>
        <div class="schedule-month">${month}</div>
        <div class="schedule-year">${year}</div>
      </div>
      <div class="schedule-info">
        <div class="schedule-name">${escHtml(b.name)}</div>
        <div class="schedule-chips">
          <span class="chip time">⏰ ${escHtml(b.perfTime)}</span>
          <span class="chip occasion">${escHtml(b.occasion)}</span>
          <span class="chip package">${escHtml(b.package)}</span>
        </div>
        <div class="schedule-venue">📍 ${escHtml(b.venue)}</div>
        ${b.phone ? `<div class="schedule-phone">📞 ${escHtml(b.phone)}</div>` : ''}
        <div class="schedule-balance">💰 Balance due: <strong>${escHtml(bd.balanceStr)}</strong></div>
        ${b.adminNote ? `<div class="schedule-note">📝 ${escHtml(b.adminNote)}</div>` : ''}
      </div>
      <div class="schedule-actions">
        <button class="btn-receipt-sm" onclick="downloadReceipt(${b.id})">📄 Receipt</button>
        <button class="btn-done" onclick="markDone(${b.id})">✅ Done</button>
        <button class="btn-sched-archive" onclick="promptDelete(${b.id})">🗂️ Archive</button>
      </div>
    </div>`;
}

function markDone(id) {
  fetchBookings().then(all => {
    const b = all.find(x => String(x.id) === String(id));
    if (b) archiveBooking(b);
    showToast('✅ Marked as done and archived!');
    updateStats();
    renderSchedules();
  });
}

// ════════════════════════════════════════
// ARCHIVE TAB
// ════════════════════════════════════════
function renderArchive() {
  const area = document.getElementById('archiveArea');
  const archived = getArchive();
  document.getElementById('navBadgeArchive').textContent = archived.length;

  if (archived.length === 0) {
    area.innerHTML = '<div class="empty-state"><span class="ei">🗂️</span><p>Archive is empty.<br>Deleted or finished bookings will appear here.</p></div>';
    return;
  }
  area.innerHTML = archived.map(b => buildArchiveCardHTML(b)).join('');
}

function buildArchiveCardHTML(b) {
  const archivedDate = b.archivedAt ? formatDate(b.archivedAt) : '';
  return `
    <div class="booking-card archived" id="arc-${b.id}">
      <div class="card-header" onclick="toggleArchiveCard(${b.id})">
        <span class="status-dot archived"></span>
        <div class="card-info">
          <div class="archive-tag">🗂️ Archived · ${escHtml(b.status || '')}</div>
          <div class="card-name">${escHtml(b.name)}</div>
          <div class="card-meta">📅 ${escHtml(b.date)} · ${escHtml(b.occasion)} · ${escHtml(b.package)}</div>
        </div>
        <span class="chevron" id="arc-chev-${b.id}">▼</span>
      </div>
      <div class="card-body" id="arc-body-${b.id}">
        <div class="detail-grid">
          <div class="detail-item"><div class="dl">Client Name</div><div class="dv">${escHtml(b.name)}</div></div>
          ${b.phone ? `<div class="detail-item"><div class="dl">Contact</div><div class="dv">${escHtml(b.phone)}</div></div>` : ''}
          <div class="detail-item"><div class="dl">Event Date</div><div class="dv">${escHtml(b.date)}</div></div>
          <div class="detail-item"><div class="dl">Time</div><div class="dv">${escHtml(b.perfTime)}</div></div>
          <div class="detail-item"><div class="dl">Occasion</div><div class="dv">${escHtml(b.occasion)}</div></div>
          <div class="detail-item full"><div class="dl">Venue</div><div class="dv">${escHtml(b.venue)}</div></div>
          <div class="detail-item"><div class="dl">Package</div><div class="dv"><span class="pkg-badge">${escHtml(b.package)}</span></div></div>
          ${b.notes ? `<div class="detail-item full"><div class="dl">Notes</div><div class="dv">${escHtml(b.notes)}</div></div>` : ''}
          ${b.adminNote ? `<div class="detail-item full"><div class="dl">Admin Note</div><div class="dv">${escHtml(b.adminNote)}</div></div>` : ''}
        </div>
        ${b.gcashScreenshot ? `<div class="ss-section"><div class="ss-section-head">📸 GCash Screenshot</div><img class="ss-img" src="${b.gcashScreenshot}" alt="GCash"/></div>` : ''}
        <div class="action-row">
          <button class="btn-restore" onclick="restoreBooking(${b.id})">↩️ Restore</button>
          <button class="btn-decline" onclick="permanentDelete(${b.id})" style="flex:0 0 auto;padding:12px 18px">🗑️ Delete</button>
        </div>
        ${archivedDate ? `<div class="submitted-time">Archived: ${archivedDate}</div>` : ''}
      </div>
    </div>`;
}

function toggleArchiveCard(id) {
  const body = document.getElementById('arc-body-' + id);
  const chev = document.getElementById('arc-chev-' + id);
  if (!body) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  if (chev) chev.classList.toggle('open', !isOpen);
}

function restoreBooking(id) {
  restoreFromArchive(id);
  showToast('↩️ Booking restored!');
  updateStats(); renderArchive(); renderBookings();
}

function permanentDelete(id) {
  saveArchive(getArchive().filter(b => String(b.id) !== String(id)));
  showToast('🗑️ Permanently deleted.');
  updateStats(); renderArchive();
}

function confirmClearArchive() { document.getElementById('clearArchiveModal').classList.add('show'); }
function doClearArchive() {
  saveArchive([]);
  document.getElementById('clearArchiveModal').classList.remove('show');
  showToast('🗑️ Archive cleared.');
  updateStats(); renderArchive();
}

// ════════════════════════════════════════
// DELETE MODAL
// ════════════════════════════════════════
function promptDelete(id) {
  pendingDeleteId = id;
  document.getElementById('deleteModal').classList.add('show');
}
function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('show');
  pendingDeleteId = null;
}
async function confirmDelete() {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;
  closeDeleteModal();
  const all = await fetchBookingsRaw();
  const b = all.find(x => String(x.id) === String(id));
  if (b) archiveBooking(b);
  showToast('🗂️ Moved to archive.');
  updateStats(); renderBookings();
}

// ════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
