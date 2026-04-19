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
// RECEIPT
// ════════════════════════════════════════
async function downloadReceipt(id) {
  const all = await fetchBookingsRaw();
  const b = all.find(x => String(x.id) === String(id));
  if (!b) { showToast('❌ Could not load booking data.'); return; }
  generateReceipt(b);
}

function generateReceipt(b) {
  const canvas = document.getElementById('receiptCanvas');
  const W = 700, H = 980;
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── PALETTE ────────────────────────────────────────
  const bgTop     = '#fff4f7';
  const bgBottom  = '#fce4ef';
  const cardWhite = '#ffffff';
  const rose      = '#e0607a';
  const deepRose  = '#c0405a';
  const roseText  = '#a03050';
  const mauve     = '#9a6070';
  const ink       = '#2d1520';
  const green     = '#1a7a50';
  const softBdr   = '#f0c0d0';
  const accentBar = '#e8a0b8';
  const PAD = 30;

  // ── BACKGROUND ─────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, bgTop);
  bg.addColorStop(1, bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── DECORATIVE SHAPE HELPERS ───────────────────────

  function drawStar(cx, cy, r, alpha, color) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = (Math.PI / 2) + (i * 2 * Math.PI / 5);
      const innerAngle = outerAngle + Math.PI / 5;
      const ir = r * 0.42;
      const ox = cx + r  * Math.cos(outerAngle);
      const oy = cy - r  * Math.sin(outerAngle);
      const ix = cx + ir * Math.cos(innerAngle);
      const iy = cy - ir * Math.sin(innerAngle);
      if (i === 0) { ctx.moveTo(ox, oy); } else { ctx.lineTo(ox, oy); }
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawFlower(cx, cy, r, alpha, color) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((i * Math.PI) / 2);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.6, r * 0.4, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#f9a8c0';
    ctx.globalAlpha = Math.min(alpha * 1.3, 1);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawDiamond(cx, cy, r, alpha, color) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.6, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r * 0.6, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── BACKGROUND DECORATIONS ─────────────────────────
  const bgDecos = [
    { t:'star',    x:38,    y:38,     r:10, a:0.18 },
    { t:'flower',  x:W-38,  y:38,     r:8,  a:0.15 },
    { t:'star',    x:W-38,  y:H-38,   r:9,  a:0.17 },
    { t:'flower',  x:38,    y:H-38,   r:7,  a:0.14 },
    { t:'diamond', x:W/2,   y:22,     r:7,  a:0.18 },
    { t:'diamond', x:W/2,   y:H-22,   r:7,  a:0.18 },
    { t:'star',    x:22,    y:H*0.30, r:7,  a:0.13 },
    { t:'flower',  x:22,    y:H*0.55, r:6,  a:0.12 },
    { t:'star',    x:22,    y:H*0.75, r:6,  a:0.11 },
    { t:'star',    x:W-22,  y:H*0.30, r:7,  a:0.13 },
    { t:'flower',  x:W-22,  y:H*0.55, r:6,  a:0.12 },
    { t:'star',    x:W-22,  y:H*0.75, r:6,  a:0.11 },
    { t:'diamond', x:70,    y:H*0.42, r:4,  a:0.10 },
    { t:'diamond', x:W-70,  y:H*0.42, r:4,  a:0.10 },
    { t:'star',    x:100,   y:H*0.88, r:5,  a:0.10 },
    { t:'star',    x:W-100, y:H*0.88, r:5,  a:0.10 },
  ];
  bgDecos.forEach(d => {
    if (d.t === 'star')    drawStar(d.x, d.y, d.r, d.a, rose);
    if (d.t === 'flower')  drawFlower(d.x, d.y, d.r, d.a, rose);
    if (d.t === 'diamond') drawDiamond(d.x, d.y, d.r, d.a, deepRose);
  });

  // ── CARD HELPER ────────────────────────────────────
  function card(x, y, w, h, radius) {
    ctx.save();
    ctx.shadowColor   = 'rgba(210,110,140,0.14)';
    ctx.shadowBlur    = 18;
    ctx.shadowOffsetY = 4;
    roundRect(ctx, x, y, w, h, radius);
    ctx.fillStyle = cardWhite;
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = softBdr;
    ctx.lineWidth   = 1;
    roundRect(ctx, x, y, w, h, radius);
    ctx.stroke();
  }

  // ── SPACED-CAP LABEL ───────────────────────────────
  function label(text, x, y) {
    ctx.font      = '700 9.5px Arial, sans-serif';
    ctx.fillStyle = rose;
    ctx.textAlign = 'left';
    let cx = x;
    text.toUpperCase().split('').forEach(ch => {
      ctx.fillText(ch, cx, y);
      cx += ctx.measureText(ch).width + 1.2;
    });
  }

  // ── FIELD (label + value) ──────────────────────────
  function field(lbl, val, x, y, maxW) {
    label(lbl, x, y);
    ctx.font      = '400 15.5px Georgia, serif';
    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    let v = val || '—';
    if (maxW) {
      while (ctx.measureText(v).width > maxW && v.length > 2) v = v.slice(0, -1);
      if (v !== (val || '—')) v += '…';
    }
    ctx.fillText(v, x, y + 20);
  }

  // ── SECTION TITLE + RULE ───────────────────────────
  function sectionTitle(text, x, y, lineEnd) {
    ctx.fillStyle = roseText;
    ctx.font      = '700 11px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(text, x, y);
    ctx.strokeStyle = softBdr;
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y + 6);
    ctx.lineTo(lineEnd, y + 6);
    ctx.stroke();
  }

  const cX   = PAD;
  const cW   = W - PAD * 2;
  const col1 = PAD + 14;
  const col2 = W / 2 + 10;
  const colW = W / 2 - PAD - 24;
  const sR   = W - PAD - 14;

  // ════════════════════════════════
  // CARD 1 — HEADER
  // ════════════════════════════════
  const hY = 26, hH = 150;
  card(cX, hY, cW, hH, 18);

  ctx.fillStyle = accentBar;
  roundRect(ctx, cX, hY, cW, 5, { tl:18, tr:18, bl:0, br:0 });
  ctx.fill();

  // stars on bar
  drawStar(col1 + 6,     hY + 2.5, 4,   0.55, '#ffffff');
  drawStar(W / 2,        hY + 2.5, 3,   0.40, '#ffffff');
  drawStar(W - PAD - 20, hY + 2.5, 3,   0.45, '#ffffff');

  ctx.fillStyle = deepRose;
  ctx.font      = 'bold 25px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('Jeoan Gwyneth Dajay Gran', col1, hY + 40);

  ctx.font      = '400 12.5px Arial, sans-serif';
  ctx.fillStyle = mauve;
  ctx.fillText('Singer & Host for Hire  ·  South Cotabato  ·  0912 797 7245', col1, hY + 60);

  // thin rule
  ctx.strokeStyle = softBdr; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(col1, hY + 74); ctx.lineTo(sR, hY + 74); ctx.stroke();
  drawFlower(col1 - 4,    hY + 74, 5, 0.25, rose);
  drawFlower(sR + 4,      hY + 74, 5, 0.25, rose);

  // confirmed badge
  ctx.fillStyle = '#e6f5ee';
  roundRect(ctx, col1, hY + 84, 188, 28, 9);
  ctx.fill();
  ctx.strokeStyle = '#9dd4b8'; ctx.lineWidth = 1;
  roundRect(ctx, col1, hY + 84, 188, 28, 9);
  ctx.stroke();
  ctx.fillStyle = green;
  ctx.font      = 'bold 11.5px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('✓  BOOKING CONFIRMED', col1 + 12, hY + 103);

  ctx.font      = '11px Arial, sans-serif';
  ctx.fillStyle = mauve;
  ctx.textAlign = 'right';
  ctx.fillText(
    'Issued ' + new Date().toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric' }),
    sR, hY + 103
  );

  // ════════════════════════════════
  // CARD 2 — BOOKING DETAILS
  // ════════════════════════════════
  const dY = hY + hH + 12, dH = 252;
  card(cX, dY, cW, dH, 18);

  ctx.fillStyle = accentBar;
  roundRect(ctx, cX, dY, cW, 5, { tl:18, tr:18, bl:0, br:0 });
  ctx.fill();
  drawStar(col1 + 6,     dY + 2.5, 3.5, 0.50, '#ffffff');
  drawStar(W - PAD - 18, dY + 2.5, 3,   0.40, '#ffffff');

  sectionTitle('BOOKING DETAILS', col1, dY + 24, sR);

  let fy = dY + 46;
  const fROW = 52;

  field('Client Name',       b.name,             col1, fy, colW);
  field('Event Date',        b.date,              col2, fy, colW);
  fy += fROW;
  field('Contact Number',    b.phone || '—',     col1, fy, colW);
  field('Performance Time',  b.perfTime || '—',  col2, fy, colW);
  fy += fROW;
  field('Occasion',          b.occasion,          col1, fy, colW);
  field('Package',           b.package,           col2, fy, colW);
  fy += fROW;
  field('Venue',             b.venue,             col1, fy, cW - 28);
  fy += fROW;

  if (b.notes) {
    ctx.font      = 'italic 13px Georgia, serif';
    ctx.fillStyle = mauve;
    ctx.textAlign = 'left';
    ctx.fillText('" ' + b.notes + ' "', col1, fy - 4);
  }

  // mid-card star dividers
  [dY + 96, dY + 148, dY + 200].forEach(sy => {
    drawStar(W / 2 - 7, sy, 3, 0.15, rose);
    drawStar(W / 2 + 7, sy, 3, 0.15, rose);
  });

  // ════════════════════════════════
  // CARD 3 — PAYMENT
  // ════════════════════════════════
  const pY = dY + dH + 12, pH = 134;
  card(cX, pY, cW, pH, 18);

  ctx.fillStyle = rose;
  roundRect(ctx, cX, pY, cW, 5, { tl:18, tr:18, bl:0, br:0 });
  ctx.fill();
  drawStar(col1 + 6,     pY + 2.5, 3.5, 0.55, '#ffffff');
  drawFlower(W / 2,      pY + 2.5, 4,   0.35, '#ffffff');
  drawStar(W - PAD - 18, pY + 2.5, 3,   0.45, '#ffffff');

  sectionTitle('PAYMENT SUMMARY', col1, pY + 24, sR);

  const bd = getPriceBreakdown(b);

  ctx.font      = '400 13.5px Arial, sans-serif';
  ctx.fillStyle = mauve; ctx.textAlign = 'left';
  ctx.fillText('Package Total', col1, pY + 50);
  ctx.font      = '500 14px Arial, sans-serif';
  ctx.fillStyle = ink; ctx.textAlign = 'right';
  ctx.fillText(bd.totalStr, sR, pY + 50);

  ctx.font      = '400 13.5px Arial, sans-serif';
  ctx.fillStyle = mauve; ctx.textAlign = 'left';
  ctx.fillText('Downpayment Paid (GCash)', col1, pY + 74);
  ctx.font      = '600 13.5px Arial, sans-serif';
  ctx.fillStyle = green; ctx.textAlign = 'right';
  ctx.fillText('− ' + bd.dpStr, sR, pY + 74);

  ctx.strokeStyle = softBdr; ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(col1, pY + 87); ctx.lineTo(sR, pY + 87); ctx.stroke();
  ctx.setLineDash([]);

  ctx.font      = '700 12px Arial, sans-serif';
  ctx.fillStyle = deepRose; ctx.textAlign = 'left';
  ctx.fillText('Remaining Balance', col1, pY + 112);
  ctx.font      = 'bold 26px Georgia, serif';
  ctx.fillStyle = deepRose; ctx.textAlign = 'right';
  ctx.fillText(bd.balanceStr, sR, pY + 116);

  // ════════════════════════════════
  // CARD 4 — REMINDERS
  // ════════════════════════════════
  const rY = pY + pH + 12, rH = 118;
  card(cX, rY, cW, rH, 18);

  ctx.fillStyle = '#f5c0d0';
  roundRect(ctx, cX, rY, cW, 5, { tl:18, tr:18, bl:0, br:0 });
  ctx.fill();
  drawStar(col1 + 6,     rY + 2.5, 3.5, 0.50, deepRose);
  drawFlower(W / 2,      rY + 2.5, 4,   0.38, deepRose);
  drawStar(W - PAD - 18, rY + 2.5, 3,   0.40, deepRose);

  sectionTitle('IMPORTANT REMINDERS', col1, rY + 24, sR);

  const reminders = [
    '✦  Please settle the remaining balance on the day of the event.',
    '✦  Confirm your booking details at least 3 days before the event.',
    '✦  For changes or cancellations, contact us as soon as possible.',
  ];
  reminders.forEach((r, i) => {
    ctx.font      = '400 12.5px Arial, sans-serif';
    ctx.fillStyle = roseText;
    ctx.textAlign = 'left';
    ctx.fillText(r, col1, rY + 50 + i * 24);
  });

  // ════════════════════════════════
  // CARD 5 — FOOTER
  // ════════════════════════════════
  const fY = rY + rH + 12;
  const fH = H - fY - 26;

  const ftGrad = ctx.createLinearGradient(0, fY, 0, H);
  ftGrad.addColorStop(0, '#fde0ec');
  ftGrad.addColorStop(1, '#f9c8d8');
  ctx.save();
  ctx.shadowColor   = 'rgba(210,110,140,0.15)';
  ctx.shadowBlur    = 18;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, cX, fY, cW, fH, 18);
  ctx.fillStyle = ftGrad;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = softBdr; ctx.lineWidth = 1;
  roundRect(ctx, cX, fY, cW, fH, 18);
  ctx.stroke();

  ctx.fillStyle = rose;
  roundRect(ctx, cX, fY, cW, 5, { tl:18, tr:18, bl:0, br:0 });
  ctx.fill();

  // festive star row on footer bar
  [col1 + 6, W/2 - 40, W/2, W/2 + 40, W - PAD - 18].forEach((sx, i) => {
    drawStar(sx, fY + 2.5, i === 2 ? 4.5 : 3, 0.55, '#ffffff');
  });

  // dot grid texture
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = '#ffffff';
  for (let dx = cX + 20; dx < cX + cW - 10; dx += 24) {
    for (let dy = fY + 16; dy < H - 20; dy += 24) {
      ctx.beginPath(); ctx.arc(dx, dy, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();

  // corner decorations in footer
  const footerDecos = [
    { t:'star',    x:col1 + 14,   y:fY + 40,  r:6, a:0.22 },
    { t:'flower',  x:W-PAD-26,   y:fY + 38,  r:6, a:0.20 },
    { t:'diamond', x:col1 + 40,  y:fY + 80,  r:4, a:0.16 },
    { t:'diamond', x:W-PAD-52,   y:fY + 80,  r:4, a:0.16 },
    { t:'star',    x:col1 + 10,  y:fY + 130, r:5, a:0.18 },
    { t:'star',    x:W-PAD-22,   y:fY + 130, r:5, a:0.18 },
    { t:'flower',  x:col1 + 30,  y:fY + 168, r:5, a:0.15 },
    { t:'flower',  x:W-PAD-42,   y:fY + 168, r:5, a:0.15 },
  ];
  footerDecos.forEach(d => {
    if (d.t === 'star')    drawStar(d.x, d.y, d.r, d.a, deepRose);
    if (d.t === 'flower')  drawFlower(d.x, d.y, d.r, d.a, rose);
    if (d.t === 'diamond') drawDiamond(d.x, d.y, d.r, d.a, deepRose);
  });

  // mic
  ctx.font      = '34px serif';
  ctx.textAlign = 'center';
  ctx.fillText('🎤', W / 2, fY + 56);

  // thank you
  const firstName = (b.name || 'dear').split(' ')[0];
  ctx.fillStyle = deepRose;
  ctx.font      = 'bold 30px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Thank you, ' + firstName + '!', W / 2, fY + 98);

  // tagline
  ctx.font      = 'italic 14.5px Georgia, serif';
  ctx.fillStyle = roseText;
  ctx.textAlign = 'center';
  ctx.fillText("Can't wait to perform for your special day!", W / 2, fY + 126);

  // 5-star ornament row
  [-60, -30, 0, 30, 60].forEach((ox, i) => {
    drawStar(W / 2 + ox, fY + 150, i === 2 ? 5.5 : 3.5, i === 2 ? 0.42 : 0.26, deepRose);
  });

  // contact
  ctx.font      = '11.5px Arial, sans-serif';
  ctx.fillStyle = '#b06080';
  ctx.textAlign = 'center';
  ctx.fillText('0912 797 7245  ·  South Cotabato', W / 2, fY + 176);

  // flower row at bottom
  [-90, -45, 0, 45, 90].forEach(ox => {
    drawFlower(W / 2 + ox, fY + 200, 5, 0.20, rose);
  });

  // ── DOWNLOAD ──────────────────────────────────────
  const link = document.createElement('a');
  const safeName = (b.name || 'client').replace(/[^a-z0-9]/gi, '_');
  link.download = 'Receipt_' + safeName + '_' + (b.date || 'booking').replace(/[^a-z0-9]/gi, '_') + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ── Canvas helpers ────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  if (typeof r === 'number') r = { tl:r, tr:r, br:r, bl:r };
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x + w, y,     x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  ctx.quadraticCurveTo(x, y + h,     x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y,         x + r.tl, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' ';
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      ctx.fillText(line, x, y); line = words[i] + ' '; y += lineHeight;
    } else { line = test; }
  }
  ctx.fillText(line, x, y);
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
