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
// RECEIPT — soft coquette themed
// ════════════════════════════════════════
async function downloadReceipt(id) {
  const all = await fetchBookingsRaw();
  const b = all.find(x => String(x.id) === String(id));
  if (!b) { showToast('❌ Could not load booking data.'); return; }
  generateReceipt(b);
}

function generateReceipt(b) {
  const canvas = document.getElementById('receiptCanvas');

  const W = 700, H = 780;
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── PALETTE ──────────────────────────────────────────────
  const rose      = '#c94f6a';
  const roseDark  = '#7a2040';
  const roseDeep  = '#5c1228';
  const roseLight = '#e8728a';
  const rosePale  = '#fce8ee';
  const mauve     = '#9a6070';
  const ink       = '#2d1520';
  const muted     = '#b08090';
  const green     = '#1a7a50';
  const white     = '#ffffff';
  const borderCol = '#f0c8d4';

  const HDR = 138;
  const FTR = 200;
  const PAD = 36;

  // ── BACKGROUND — dreamy blush gradient ───────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0,   '#fff8fa');
  bgGrad.addColorStop(0.5, '#fef2f5');
  bgGrad.addColorStop(1,   '#fce8ee');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Faint dot grid on body
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = rose;
  for (let x = PAD; x < W - PAD; x += 20) {
    for (let y = HDR + 8; y < H - FTR - 8; y += 20) {
      ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();

  // Decorative lace rings — top-left corner
  ctx.save();
  ctx.globalAlpha = 0.055;
  ctx.strokeStyle = rose;
  ctx.lineWidth = 1.2;
  [40, 65, 90].forEach(r => {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  });
  // bottom-right corner
  [40, 65, 90].forEach(r => {
    ctx.beginPath(); ctx.arc(W, H, r, 0, Math.PI * 2); ctx.stroke();
  });
  ctx.restore();

  // ── HEADER BAND ──────────────────────────────────────────
  const hdrGrad = ctx.createLinearGradient(0, 0, W, HDR);
  hdrGrad.addColorStop(0,   roseDeep);
  hdrGrad.addColorStop(0.6, '#8a2a40');
  hdrGrad.addColorStop(1,   rose);
  ctx.fillStyle = hdrGrad;
  ctx.fillRect(0, 0, W, HDR);

  // Soft glow bubbles in header
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = white;
  ctx.beginPath(); ctx.arc(W - 30, -10, 150, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W - 80, HDR + 5, 55, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Ribbon accent at bottom of header
  const ribbonGrad = ctx.createLinearGradient(0, 0, W, 0);
  ribbonGrad.addColorStop(0, roseLight);
  ribbonGrad.addColorStop(0.5, '#f9a0b8');
  ribbonGrad.addColorStop(1, roseLight);
  ctx.fillStyle = ribbonGrad;
  ctx.fillRect(0, HDR - 4, W, 4);

  // 🎀 bow emoji
  ctx.font = '30px serif';
  ctx.textAlign = 'left';
  ctx.fillText('🎀', PAD, 46);

  // Brand name
  ctx.fillStyle = white;
  ctx.font = 'bold 23px "Playfair Display", Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('Jeoan Gwyneth Dajay Gran', PAD + 44, 42);

  // Tagline
  ctx.font = '400 11px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('Singer & Host for Hire  ·  South Cotabato  ·  0912 797 7245', PAD + 44, 61);

  // CONFIRMED pill badge
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, W - 204, HDR - 56, 168, 30, 15);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  roundRect(ctx, W - 204, HDR - 56, 168, 30, 15);
  ctx.stroke();
  ctx.fillStyle = white;
  ctx.font = 'bold 11px "DM Sans", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✅  BOOKING CONFIRMED', W - 120, HDR - 36);

  // Issue date
  ctx.font = '400 9.5px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.textAlign = 'right';
  ctx.fillText(
    'Issued ' + new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }),
    W - PAD, HDR - 10
  );

  // ── BODY FIELDS ──────────────────────────────────────────
  const bd  = getPriceBreakdown(b);
  const MID = W / 2;
  const COL1 = PAD;
  const COL2 = MID + 12;
  const COL_W = MID - PAD - 20;

  // helper — draws label + value pair
  function field(lbl, val, x, yy, maxW) {
    // label
    ctx.save();
    ctx.font = '600 9.5px "DM Sans", Arial, sans-serif';
    ctx.fillStyle = roseLight;
    ctx.textAlign = 'left';
    // letter-spacing simulation: draw char by char
    let cx = x;
    const spaced = lbl.toUpperCase().split('');
    spaced.forEach(ch => {
      ctx.fillText(ch, cx, yy);
      cx += ctx.measureText(ch).width + 1.2;
    });
    ctx.restore();

    // value
    ctx.font = '400 14.5px "DM Sans", Arial, sans-serif';
    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    let v = val || '—';
    if (maxW) {
      while (ctx.measureText(v).width > maxW && v.length > 2) v = v.slice(0, -1);
      if (v !== (val || '—')) v += '…';
    }
    ctx.fillText(v, x, yy + 18);
  }

  let y = HDR + 28;
  const ROW = 50;

  field('Client Name',       b.name,          COL1, y, COL_W);
  field('Event Date',        b.date,           COL2, y, COL_W);
  y += ROW;

  field('Contact Number',    b.phone || '—',  COL1, y, COL_W);
  field('Performance Time',  b.perfTime || '—', COL2, y, COL_W);
  y += ROW;

  field('Occasion',          b.occasion,       COL1, y, COL_W);
  field('Package',           b.package,        COL2, y, COL_W);
  y += ROW;

  field('Venue',             b.venue,          COL1, y, W - PAD * 2);
  y += ROW;

  // ── DASHED DIVIDER ───────────────────────────────────────
  ctx.strokeStyle = borderCol;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
  ctx.setLineDash([]);
  y += 16;

  // ── PAYMENT STRIP ────────────────────────────────────────
  const stripH = 86;
  const stripGrad = ctx.createLinearGradient(PAD, y, W - PAD, y + stripH);
  stripGrad.addColorStop(0, '#fff0f5');
  stripGrad.addColorStop(1, '#fce8ee');
  ctx.fillStyle = stripGrad;
  roundRect(ctx, PAD, y, W - PAD * 2, stripH, 14);
  ctx.fill();
  ctx.strokeStyle = borderCol;
  ctx.lineWidth = 1.2;
  roundRect(ctx, PAD, y, W - PAD * 2, stripH, 14);
  ctx.stroke();

  const sL = PAD + 22, sR = W - PAD - 22;

  // Package Total
  ctx.font = '400 12px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = muted; ctx.textAlign = 'left';
  ctx.fillText('Package Total', sL, y + 22);
  ctx.font = '500 13.5px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = ink; ctx.textAlign = 'right';
  ctx.fillText(bd.totalStr, sR, y + 22);

  // Downpayment Paid
  ctx.font = '400 12px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = muted; ctx.textAlign = 'left';
  ctx.fillText('Downpayment Paid (GCash)', sL, y + 42);
  ctx.font = '600 13px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = green; ctx.textAlign = 'right';
  ctx.fillText('− ' + bd.dpStr, sR, y + 42);

  // Thin divider
  ctx.strokeStyle = borderCol; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(sL, y + 54); ctx.lineTo(sR, y + 54); ctx.stroke();

  // Remaining Balance
  ctx.font = '700 12px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = rose; ctx.textAlign = 'left';
  ctx.fillText('Remaining Balance', sL, y + 72);
  ctx.font = '700 20px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = roseDark; ctx.textAlign = 'right';
  ctx.fillText(bd.balanceStr, sR, y + 72);

  y += stripH + 12;

  // Notes / song request (only if present)
  if (b.notes || b.adminNote) {
    const noteText = [b.notes ? '🎵 ' + b.notes : '', b.adminNote ? '📝 ' + b.adminNote : ''].filter(Boolean).join('   ');
    ctx.font = 'italic 11px "DM Sans", Arial, sans-serif';
    ctx.fillStyle = muted;
    ctx.textAlign = 'left';
    wrapText(ctx, noteText, PAD, y + 10, W - PAD * 2, 16);
    y += 28;
  }

  // ── FOOTER BAND ──────────────────────────────────────────
  const footerY = H - FTR;

  // Footer background — deep coquette rose
  const ftrGrad = ctx.createLinearGradient(0, footerY, W, H);
  ftrGrad.addColorStop(0, roseDeep);
  ftrGrad.addColorStop(0.5, '#8a2040');
  ftrGrad.addColorStop(1, '#6a1530');
  ctx.fillStyle = ftrGrad;
  ctx.fillRect(0, footerY, W, FTR);

  // Soft glow orbs in footer
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = white;
  ctx.beginPath(); ctx.arc(-10, H + 10, 130, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W + 10, H - 30, 110, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W / 2, footerY, 40, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Ribbon top of footer
  ctx.fillStyle = ribbonGrad;
  ctx.fillRect(0, footerY, W, 3);

  // Small bow cluster above thank-you
  ctx.font = '28px serif';
  ctx.textAlign = 'center';
  ctx.fillText('🎀', W / 2 - 34, footerY + 46);
  ctx.font = '36px serif';
  ctx.fillText('🎤', W / 2, footerY + 52);
  ctx.font = '28px serif';
  ctx.fillText('🎀', W / 2 + 34, footerY + 46);

  // "Thank you, [Name]!" — personal & large
  ctx.fillStyle = white;
  ctx.font = 'bold 27px "Playfair Display", Georgia, serif';
  ctx.textAlign = 'center';
  // Get first name only for a warmer feel
  const firstName = (b.name || 'dear').split(' ')[0];
  ctx.fillText('Thank you, ' + firstName + '! 🌸', W / 2, footerY + 90);

  // Tagline
  ctx.font = 'italic 13.5px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText("Can't wait to perform for your special day — see you there!", W / 2, footerY + 118);

  // Dot separator
  ctx.font = '10px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillText('· · · · · · · · · · · · · · · · · · · · · · · · · ·', W / 2, footerY + 145);

  // Balance payable note
  ctx.font = '400 10.5px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('Remaining balance is payable via Cash or GCash after the performance.', W / 2, footerY + 166);

  // Contact
  ctx.font = '500 11px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('0912 797 7245  ·  South Cotabato', W / 2, footerY + 185);

  // ── DOWNLOAD ─────────────────────────────────────────────
  const link = document.createElement('a');
  const safeName = (b.name || 'client').replace(/[^a-z0-9]/gi, '_');
  link.download = 'Receipt_' + safeName + '_' + (b.date || 'booking').replace(/[^a-z0-9]/gi, '_') + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ── Canvas helpers ────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' ';
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      ctx.fillText(line, x, y);
      line = words[i] + ' ';
      y += lineHeight;
    } else {
      line = test;
    }
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
    const label = isNaN(d) ? 'Unspecified Date' : d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(b);
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
  const month = isNaN(d) ? ''  : d.toLocaleDateString('en-PH', { month: 'short' }).toUpperCase();
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
