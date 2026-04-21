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
// RECEIPT — 1200×1200 · Coquette · Pink
// Drop-in replacement for generateReceipt()
// getPriceBreakdown() stays unchanged.
// ════════════════════════════════════════

async function downloadReceipt(id) {
  const all = await fetchBookingsRaw();
  const b = all.find(x => String(x.id) === String(id));
  if (!b) { showToast('❌ Could not load booking data.'); return; }
  generateReceipt(b);
}

function generateReceipt(b) {
  const canvas = document.getElementById('receiptCanvas');
  const S = 1200;
  canvas.width  = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  const D = 600, P = 38, W = D - P * 2;

// ════════════════════════════════════════
// FULLY PAID RECEIPT (Archive)
// ════════════════════════════════════════
function downloadFullyPaidReceipt(id) {
  const archived = getArchive();
  const b = archived.find(x => String(x.id) === String(id));
  if (!b) { showToast('❌ Could not find booking data.'); return; }
  generateFullyPaidReceipt(b);
}

function generateFullyPaidReceipt(b) {
  const canvas = document.getElementById('receiptCanvas');
  const S = 1200;
  canvas.width  = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  const D = 600, P = 38, W = D - P * 2;

  // ── Palette ──────────────────────────────────────
  const deep  = '#b83060';
  const rose  = '#d4607a';
  const mid   = '#e8a0b0';
  const blush = '#fff5f7';
  const light = '#fdeef2';
  const ink   = '#2a1520';
  const muted = '#b08090';
  const green = '#2e7d52';
  const greenPale = '#edf7f1';

  // ── Background ───────────────────────────────────
  ctx.fillStyle = blush;
  ctx.fillRect(0, 0, D, D);

  // Dot texture
  ctx.save();
  ctx.fillStyle   = mid;
  ctx.globalAlpha = 0.06;
  for (let x = P; x < D - P; x += 14)
    for (let y = 60; y < D - 60; y += 14) {
      ctx.beginPath(); ctx.arc(x, y, 0.7, 0, Math.PI * 2); ctx.fill();
    }
  ctx.restore();

  // Top & bottom bars
  ctx.fillStyle = rose; ctx.fillRect(0, 0, D, 5);
  ctx.fillStyle = rose; ctx.fillRect(0, D - 5, D, 5);

  // ── Helpers ──────────────────────────────────────
  function txt(s, x, y, font, color, align = 'left') {
    ctx.save(); ctx.font = font; ctx.fillStyle = color;
    ctx.textAlign = align; ctx.fillText(String(s || ''), x, y); ctx.restore();
  }

  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function divLine(y) {
    const cx = D / 2;
    ctx.save();
    ctx.strokeStyle = mid; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(P + 6, y); ctx.lineTo(cx - 10, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 10, y); ctx.lineTo(D - P - 6, y); ctx.stroke();
    ctx.fillStyle = rose; ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(cx, y - 4); ctx.lineTo(cx + 3, y);
    ctx.lineTo(cx, y + 4); ctx.lineTo(cx - 3, y);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function bow(cx, cy, s) {
    ctx.save(); ctx.fillStyle = rose; ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(cx - 2*s, cy);
    ctx.bezierCurveTo(cx - 9*s, cy - 9*s, cx - 22*s, cy - 4*s, cx - 14*s, cy + 2*s);
    ctx.bezierCurveTo(cx - 22*s, cy + 8*s, cx - 9*s, cy + 9*s, cx - 2*s, cy);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 2*s, cy);
    ctx.bezierCurveTo(cx + 9*s, cy - 9*s, cx + 22*s, cy - 4*s, cx + 14*s, cy + 2*s);
    ctx.bezierCurveTo(cx + 22*s, cy + 8*s, cx + 9*s, cy + 9*s, cx + 2*s, cy);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.ellipse(cx, cy, 4*s, 4.5*s, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function heart(cx, cy, r) {
    ctx.save(); ctx.fillStyle = rose; ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.9);
    ctx.bezierCurveTo(cx + r*2.1, cy + r*0.3, cx + r*2.1, cy - r*0.9, cx, cy - r*0.1);
    ctx.bezierCurveTo(cx - r*2.1, cy - r*0.9, cx - r*2.1, cy + r*0.3, cx, cy + r*0.9);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function trunc(s, maxW) {
    let v = String(s || '—');
    while (ctx.measureText(v).width > maxW && v.length > 2) v = v.slice(0, -1);
    if (v !== String(s || '—')) v += '…';
    return v;
  }

  const serif  = sz => `${sz}px 'Palatino Linotype',Palatino,Georgia,serif`;
  const serifI = sz => `italic ${sz}px 'Palatino Linotype',Palatino,Georgia,serif`;

  function field(label, value, x, y, maxW) {
    txt(label.toUpperCase(), x, y, '500 7px Arial,sans-serif', muted);
    txt(trunc(value, maxW || W * 0.45), x, y + 15, serif(13), ink);
  }

  // ── HEADER ───────────────────────────────────────
  let cy = 18;
  txt('BOOKING RECEIPT', D/2, cy, '500 7.5px Arial', mid, 'center');

  cy += 22;
  bow(D/2, cy, 1.3);
  cy += 28;

  txt('Jeoan Gwyneth Dajay Gran', D/2, cy, serifI(21), deep, 'center');
  cy += 13;
  txt('Singer & Host for Hire  ·  South Cotabato  ·  0912 797 7245', D/2, cy, '400 8.5px Arial', muted, 'center');

  cy += 16;
  // Confirmed pill
  ctx.save(); ctx.fillStyle = light; ctx.strokeStyle = mid; ctx.lineWidth = 0.7;
  rrect(P, cy - 11, 106, 15, 7); ctx.fill(); ctx.stroke(); ctx.restore();
  txt('✓  Confirmed', P + 9, cy, serifI(9.5), rose);
  txt('Issued ' + new Date().toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric' }),
    D - P, cy, '400 8px Arial', muted, 'right');

  cy += 14;
  divLine(cy);

  // ── BOOKING DETAILS ──────────────────────────────
  cy += 16;
  txt('Booking Details', P, cy, serifI(10), rose);
  const HW = W / 2 - 10;
  cy += 18;
  field('Client Name',      b.name,     P,       cy, HW + 30);
  field('Event Date',       b.date,     D/2 + 4, cy, HW);
  cy += 30;
  field('Contact',          b.phone,    P,       cy, HW);
  field('Performance Time', b.perfTime, D/2 + 4, cy, HW);
  cy += 30;
  field('Occasion',         b.occasion, P,       cy, HW);
  field('Package',          b.package,  D/2 + 4, cy, HW + 10);
  cy += 30;
  field('Venue',            b.venue,    P,       cy, W);

  if (b.notes) { cy += 26; txt('"' + b.notes + '"', D/2, cy, serifI(9.5), muted, 'center'); }

  cy += 16;
  divLine(cy);

  // ── PAYMENT SUMMARY — FULLY PAID ─────────────────
  cy += 16;
  txt('Payment Summary', P, cy, serifI(10), rose);

  const bd = getPriceBreakdown(b);

  cy += 20;
  txt('Package total',            P,   cy, '400 10.5px Arial', muted);
  txt(bd.totalStr,            D - P,   cy, serif(11.5),         ink,  'right');

  cy += 18;
  txt('Downpayment paid (GCash)', P,   cy, '400 10.5px Arial', muted);
  txt('− ' + bd.dpStr,        D - P,   cy, '500 11px Arial',   rose, 'right');

  cy += 18;
  txt('Balance paid (Cash/GCash)',P,   cy, '400 10.5px Arial', muted);
  txt('− ' + bd.balanceStr,   D - P,   cy, '500 11px Arial',   rose, 'right');

  cy += 12;
  ctx.save(); ctx.strokeStyle = mid; ctx.lineWidth = 0.6;
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(P, cy); ctx.lineTo(D - P, cy); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();

  // ── FULLY PAID green badge ────────────────────────
  cy += 14;
  ctx.save();
  ctx.fillStyle   = greenPale;
  ctx.strokeStyle = '#a8d5bc';
  ctx.lineWidth   = 1;
  rrect(P, cy - 12, W, 30, 10);
  ctx.fill(); ctx.stroke();
  ctx.restore();
  txt('✅  FULLY PAID', D/2, cy + 5, `600 13px Arial,sans-serif`, green, 'center');

  cy += 34;
  divLine(cy);

  // ── TERMS ────────────────────────────────────────
  cy += 16;
  txt('Terms & Conditions', P, cy, serifI(10), rose);
  const terms = [
    '₱200 downpayment is non-refundable and deducted from total.',
    'Balance due via cash or GCash right after the performance.',
    'Venue must provide a working sound system and microphone.',
    'Client cancels: DP forfeited. She cancels due to emergency: full refund.',
  ];
  cy += 16;
  ctx.font = '9.5px Arial,sans-serif';
  terms.forEach(term => {
    heart(P + 4, cy - 3, 1.6);
    const words = term.split(' ');
    let l1 = '', l2 = '', broken = false;
    for (const w of words) {
      const test = (broken ? l2 : l1) + w + ' ';
      if (!broken && ctx.measureText(test).width > W - 18) {
        broken = true; l2 = w + ' ';
      } else if (broken) {
        if (ctx.measureText(l2 + w + ' ').width < W - 18) l2 += w + ' ';
      } else { l1 = test; }
    }
    txt(l1.trim(), P + 13, cy, '400 9.5px Arial,sans-serif', '#5a2535');
    if (l2.trim()) { cy += 13; txt(l2.trim(), P + 13, cy, '400 9.5px Arial,sans-serif', '#5a2535'); }
    cy += 18;
  });

  cy += 4;
  divLine(cy);

  // ── FOOTER ───────────────────────────────────────
  cy += 28;
  const firstName = (b.name || 'Guest').split(' ')[0];
  txt('Thank you, ' + firstName + '!',              D/2, cy,  serifI(20),        deep,  'center');
  cy += 18;
  txt('It was a joy performing for your special day!', D/2, cy, serifI(10),      rose,  'center');
  cy += 16;
  txt('0912 797 7245  ·  South Cotabato',            D/2, cy,  '400 8.5px Arial', muted, 'center');
  cy += 16;
  [-36, -18, 0, 18, 36].forEach(ox => heart(D/2 + ox, cy, 2));

  // ── Download ─────────────────────────────────────
  const link     = document.createElement('a');
  const safeName = (b.name  || 'client' ).replace(/[^a-z0-9]/gi, '_');
  const safeDate = (b.date  || 'booking').replace(/[^a-z0-9]/gi, '_');
  link.download  = 'FullyPaid_Receipt_' + safeName + '_' + safeDate + '.png';
  link.href      = canvas.toDataURL('image/png');
  link.click();
}
  
  // ── Palette (pink only) ───────────────────────────
  const deep  = '#b83060';
  const rose  = '#d4607a';
  const mid   = '#e8a0b0';
  const blush = '#fff5f7';
  const light = '#fdeef2';
  const ink   = '#2a1520';
  const muted = '#b08090';

  // ── Background ───────────────────────────────────
  ctx.fillStyle = blush;
  ctx.fillRect(0, 0, D, D);

  // Subtle dot texture
  ctx.save();
  ctx.fillStyle   = mid;
  ctx.globalAlpha = 0.06;
  for (let x = P; x < D - P; x += 14)
    for (let y = 60; y < D - 60; y += 14) {
      ctx.beginPath();
      ctx.arc(x, y, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  ctx.restore();

  // Top & bottom bars
  ctx.fillStyle = rose;
  ctx.fillRect(0, 0, D, 5);
  ctx.fillRect(0, D - 5, D, 5);

  // ── Helpers ──────────────────────────────────────

  function txt(s, x, y, font, color, align = 'left') {
    ctx.save();
    ctx.font      = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(String(s || ''), x, y);
    ctx.restore();
  }

  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function divLine(y) {
    const cx = D / 2;
    ctx.save();
    ctx.strokeStyle = mid;
    ctx.lineWidth   = 0.5;
    ctx.beginPath(); ctx.moveTo(P + 6,    y); ctx.lineTo(cx - 10,    y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 10,  y); ctx.lineTo(D - P - 6,  y); ctx.stroke();
    // Diamond centre
    ctx.fillStyle   = rose;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(cx, y - 4); ctx.lineTo(cx + 3, y);
    ctx.lineTo(cx, y + 4); ctx.lineTo(cx - 3, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Coquette bow
  function bow(cx, cy, s) {
    ctx.save();
    ctx.fillStyle   = rose;
    ctx.globalAlpha = 0.7;
    // Left wing
    ctx.beginPath();
    ctx.moveTo(cx - 2*s, cy);
    ctx.bezierCurveTo(cx -  9*s, cy - 9*s, cx - 22*s, cy - 4*s, cx - 14*s, cy + 2*s);
    ctx.bezierCurveTo(cx - 22*s, cy + 8*s, cx -  9*s, cy + 9*s, cx -  2*s, cy);
    ctx.closePath();
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(cx + 2*s, cy);
    ctx.bezierCurveTo(cx +  9*s, cy - 9*s, cx + 22*s, cy - 4*s, cx + 14*s, cy + 2*s);
    ctx.bezierCurveTo(cx + 22*s, cy + 8*s, cx +  9*s, cy + 9*s, cx +  2*s, cy);
    ctx.closePath();
    ctx.fill();
    // Centre knot
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 4 * s, 4.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Heart bullet
  function heart(cx, cy, r) {
    ctx.save();
    ctx.fillStyle   = rose;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.9);
    ctx.bezierCurveTo(cx + r*2.1, cy + r*0.3, cx + r*2.1, cy - r*0.9, cx, cy - r*0.1);
    ctx.bezierCurveTo(cx - r*2.1, cy - r*0.9, cx - r*2.1, cy + r*0.3, cx, cy + r*0.9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Truncate text to fit maxW
  function trunc(s, maxW) {
    let v = String(s || '—');
    while (ctx.measureText(v).width > maxW && v.length > 2) v = v.slice(0, -1);
    if (v !== String(s || '—')) v += '…';
    return v;
  }

  // Font helpers — Palatino for elegance
  const serif  = sz => `${sz}px 'Palatino Linotype',Palatino,Georgia,serif`;
  const serifI = sz => `italic ${sz}px 'Palatino Linotype',Palatino,Georgia,serif`;

  function field(label, value, x, y, maxW) {
    txt(label.toUpperCase(), x, y, '500 7px Arial,sans-serif', muted);
    ctx.font = serif(13);
    txt(trunc(value, maxW || W * 0.45), x, y + 15, serif(13), ink);
  }

  // ── HEADER ───────────────────────────────────────
  let cy = 18;
  const HW = W / 2 - 10;

  txt('BOOKING RECEIPT', D/2, cy, '500 7.5px Arial', mid, 'center');

  cy += 22;
  bow(D/2, cy, 1.3);
  cy += 28;

  txt('Jeoan Gwyneth Dajay Gran', D/2, cy, serifI(21), deep, 'center');
  cy += 13;
  txt('Singer & Host for Hire  ·  South Cotabato  ·  0912 797 7245', D/2, cy, '400 8.5px Arial', muted, 'center');

  cy += 16;
  // Confirmed pill
  ctx.save();
  ctx.fillStyle   = light;
  ctx.strokeStyle = mid;
  ctx.lineWidth   = 0.7;
  rrect(P, cy - 11, 106, 15, 7);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  txt('✓  Confirmed', P + 9, cy, serifI(9.5), rose);
  txt(
    'Issued ' + new Date().toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric' }),
    D - P, cy, '400 8px Arial', muted, 'right'
  );

  cy += 14;
  divLine(cy);

  // ── BOOKING DETAILS ──────────────────────────────
  cy += 16;
  txt('Booking Details', P, cy, serifI(10), rose);

  cy += 18;
  field('Client Name',      b.name,     P,       cy, HW + 30);
  field('Event Date',       b.date,     D/2 + 4, cy, HW);
  cy += 30;
  field('Contact',          b.phone,    P,       cy, HW);
  field('Performance Time', b.perfTime, D/2 + 4, cy, HW);
  cy += 30;
  field('Occasion',         b.occasion, P,       cy, HW);
  field('Package',          b.package,  D/2 + 4, cy, HW + 10);
  cy += 30;
  field('Venue',            b.venue,    P,       cy, W);

  if (b.notes) {
    cy += 26;
    txt('"' + b.notes + '"', D/2, cy, serifI(9.5), muted, 'center');
  }

  cy += 16;
  divLine(cy);

  // ── PAYMENT SUMMARY ──────────────────────────────
  cy += 16;
  txt('Payment Summary', P, cy, serifI(10), rose);

  const bd = getPriceBreakdown(b);

  cy += 20;
  txt('Package total',            P,   cy, '400 10.5px Arial', muted);
  txt(bd.totalStr,            D - P,   cy, serif(11.5),         ink,  'right');

  cy += 18;
  txt('Downpayment paid (GCash)', P,   cy, '400 10.5px Arial', muted);
  txt('− ' + bd.dpStr,        D - P,   cy, '500 11px Arial',   rose, 'right');

  cy += 12;
  ctx.save();
  ctx.strokeStyle = mid;
  ctx.lineWidth   = 0.6;
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(P, cy); ctx.lineTo(D - P, cy); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  cy += 20;
  txt('Remaining Balance', P,   cy + 4, '600 9px Arial',    rose);
  txt(bd.balanceStr,     D - P, cy + 6, `500 ${serif(22)}`, deep, 'right');

  cy += 24;
  divLine(cy);

  // ── TERMS & CONDITIONS ───────────────────────────
  cy += 16;
  txt('Terms & Conditions', P, cy, serifI(10), rose);

  const terms = [
    '₱200 downpayment is non-refundable and deducted from total.',
    'Balance due via cash or GCash right after the performance.',
    'Venue must provide a working sound system and microphone.',
    'Client cancels: DP forfeited. She cancels due to emergency: full refund.',
  ];

  cy += 16;
  ctx.font = '9.5px Arial,sans-serif';

  terms.forEach(term => {
    heart(P + 4, cy - 3, 1.6);

    // Word-wrap to 2 lines max
    const words = term.split(' ');
    let l1 = '', l2 = '', broken = false;
    for (const w of words) {
      const test = (broken ? l2 : l1) + w + ' ';
      if (!broken && ctx.measureText(test).width > W - 18) {
        broken = true;
        l2 = w + ' ';
      } else if (broken) {
        if (ctx.measureText(l2 + w + ' ').width < W - 18) l2 += w + ' ';
      } else {
        l1 = test;
      }
    }
    txt(l1.trim(), P + 13, cy,      '400 9.5px Arial,sans-serif', '#5a2535');
    if (l2.trim()) {
      cy += 13;
      txt(l2.trim(), P + 13, cy,    '400 9.5px Arial,sans-serif', '#5a2535');
    }
    cy += 18;
  });

  cy += 4;
  divLine(cy);

  // ── FOOTER (generous margin) ──────────────────────
  cy += 32;
  const firstName = (b.name || 'Guest').split(' ')[0];
  txt('Thank you, ' + firstName + '!',             D/2, cy,      serifI(20),        deep, 'center');
  cy += 18;
  txt("Can't wait to perform for your special day!", D/2, cy,      serifI(10),        rose, 'center');
  cy += 16;
  txt('0912 797 7245  ·  South Cotabato',           D/2, cy,      '400 8.5px Arial', muted,'center');
  cy += 16;
  [-36, -18, 0, 18, 36].forEach(ox => heart(D/2 + ox, cy, 2));

  // ── Download ─────────────────────────────────────
  const link     = document.createElement('a');
  const safeName = (b.name  || 'client' ).replace(/[^a-z0-9]/gi, '_');
  const safeDate = (b.date  || 'booking').replace(/[^a-z0-9]/gi, '_');
  link.download  = 'Receipt_' + safeName + '_' + safeDate + '.png';
  link.href      = canvas.toDataURL('image/png');
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
          ${b.status === 'confirmed' ? `<button class="btn-receipt-sm" onclick="downloadFullyPaidReceipt(${b.id})" style="background:linear-gradient(135deg,#e8728a,#c94f6a);color:#fff;border:none;border-radius:10px;padding:10px 16px;font-size:11px;font-weight:500;letter-spacing:1px;cursor:pointer;">📄 Receipt (Fully Paid)</button>` : ''}
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
