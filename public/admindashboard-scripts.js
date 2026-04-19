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
// Reads package string like "1–6 Songs|₱300" → 300
// ════════════════════════════════════════
function parsePrice(pkgString) {
  if (!pkgString) return null;
  const match = pkgString.match(/₱([\d,]+)/);
  if (!match) return null;
  return parseInt(match[1].replace(/,/g, ''), 10);
}

function getPriceBreakdown(b) {
  // b.package is like "1–6 Songs — ₱300" or "1 Hour — ₱400"
  // also could be stored as "1–6 Songs|₱300" depending on server
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
// STATS
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

// ════════════════════════════════════════
// FILTER
// ════════════════════════════════════════
function setFilter(filter, el) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  // highlight matching filter btn
  const btn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
  if (btn) btn.classList.add('active');
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

  // Price breakdown strip
  const priceHTML = `
    <div class="price-strip">
      <div class="price-row">
        <span class="pr-label">Package Total</span>
        <span class="pr-val">${escHtml(bd.totalStr)}</span>
      </div>
      <div class="price-row">
        <span class="pr-label">Downpayment Paid</span>
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
    ? `<div style="margin-top:9px;padding:8px 11px;background:var(--rose-50);border-radius:9px;font-size:12px;color:var(--mauve);"><strong>Note:</strong> ${escHtml(b.adminNote)}</div>`
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
      // fetch fresh booking data then auto-download receipt
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
// RECEIPT GENERATOR
// ════════════════════════════════════════
async function downloadReceipt(id) {
  const all = await fetchBookingsRaw();
  const b = all.find(x => String(x.id) === String(id));
  if (!b) { showToast('❌ Could not load booking data.'); return; }
  generateReceipt(b);
}

function generateReceipt(b) {
  const canvas = document.getElementById('receiptCanvas');
  const W = 640, H = 980;
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const rose       = '#c94f6a';
  const roseDark   = '#a33556';
  const roseLight  = '#e8728a';
  const rosePale   = '#fce8ee';
  const roseFaint  = '#fff0f4';
  const mauve      = '#9a6070';
  const text       = '#2d1520';
  const muted      = '#b08090';
  const green      = '#1a7a50';
  const greenPale  = '#e8f5ee';
  const white      = '#ffffff';
  const borderCol  = '#f0c8d4';

  // ── BACKGROUND ──────────────────────────────────────────
  ctx.fillStyle = roseFaint;
  ctx.fillRect(0, 0, W, H);

  // ── HEADER GRADIENT BAND ─────────────────────────────────
  const grad = ctx.createLinearGradient(0, 0, W, 200);
  grad.addColorStop(0, rose);
  grad.addColorStop(1, roseLight);
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, W, 200, { tl: 0, tr: 0, br: 60, bl: 60 });
  ctx.fill();

  // ── DECORATIVE CIRCLES ───────────────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = white;
  ctx.beginPath(); ctx.arc(W - 40, 40, 100, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(60, 180, 70, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // ── BOW EMOJI ────────────────────────────────────────────
  ctx.font = '44px serif';
  ctx.textAlign = 'center';
  ctx.fillText('🎀', W / 2, 60);

  // ── BRAND NAME ───────────────────────────────────────────
  ctx.fillStyle = white;
  ctx.font = 'bold 26px "Playfair Display", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Jeoan Gwyneth Dajay Gran', W / 2, 105);

  ctx.font = '500 13px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  ctx.fillText('Singer & Host for Hire · South Cotabato', W / 2, 130);

  // ── CONFIRMED BADGE ──────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  roundRect(ctx, W/2 - 90, 148, 180, 34, 17);
  ctx.fill();
  ctx.fillStyle = white;
  ctx.font = 'bold 13px "DM Sans", Arial, sans-serif';
  ctx.fillText('✅  BOOKING CONFIRMED', W / 2, 171);

  // ── WHITE CARD BODY ──────────────────────────────────────
  ctx.fillStyle = white;
  roundRect(ctx, 28, 218, W - 56, H - 260, 20);
  ctx.fill();

  // card subtle border
  ctx.strokeStyle = borderCol;
  ctx.lineWidth = 1.5;
  roundRect(ctx, 28, 218, W - 56, H - 260, 20);
  ctx.stroke();

  // ── SECTION HELPER ───────────────────────────────────────
  let y = 252;
  const LX = 58, RX = W - 58, MID = W / 2;
  const LINE_H = 30;

  function sectionHead(label) {
    ctx.fillStyle = rose;
    ctx.font = 'bold 10px "DM Sans", Arial, sans-serif';
    ctx.textAlign = 'left';
    // left bar
    ctx.fillRect(LX, y - 1, 3, 14);
    ctx.fillText(label.toUpperCase(), LX + 10, y + 11);
    y += 22;
    // divider
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(LX, y); ctx.lineTo(RX, y); ctx.stroke();
    y += 10;
  }

  function row(label, value, fullWidth) {
    ctx.font = '400 11px "DM Sans", Arial, sans-serif';
    ctx.fillStyle = muted;
    ctx.textAlign = 'left';
    ctx.fillText(label.toUpperCase(), LX, y);

    ctx.font = '500 13px "DM Sans", Arial, sans-serif';
    ctx.fillStyle = text;
    if (fullWidth) {
      ctx.fillText(value || '—', LX, y + 16);
      y += LINE_H + 6;
    } else {
      ctx.fillText(value || '—', LX, y + 16);
      y += LINE_H;
    }
  }

  function twoCol(lLabel, lVal, rLabel, rVal) {
    const colW = (RX - LX) / 2 - 10;
    ctx.font = '400 11px "DM Sans", Arial, sans-serif';
    ctx.fillStyle = muted;
    ctx.textAlign = 'left';
    ctx.fillText(lLabel.toUpperCase(), LX, y);
    ctx.fillText(rLabel.toUpperCase(), LX + colW + 20, y);
    ctx.font = '500 13px "DM Sans", Arial, sans-serif';
    ctx.fillStyle = text;
    ctx.fillText(lVal || '—', LX, y + 16);
    ctx.fillText(rVal || '—', LX + colW + 20, y + 16);
    y += LINE_H + 2;
  }

  // ── CLIENT INFO ──────────────────────────────────────────
  sectionHead('Client Details');
  row('Client Name', b.name, true);
  twoCol('Contact Number', b.phone, 'Occasion', b.occasion);
  y += 4;

  // ── EVENT INFO ───────────────────────────────────────────
  sectionHead('Event Details');
  twoCol('Event Date', b.date, 'Performance Time', b.perfTime);
  row('Venue', b.venue, true);
  y += 2;

  // ── PACKAGE ──────────────────────────────────────────────
  sectionHead('Package');
  row('Selected Package', b.package, true);
  y += 2;

  // ── PAYMENT BREAKDOWN ────────────────────────────────────
  sectionHead('Payment Breakdown');

  const bd = getPriceBreakdown(b);

  // breakdown box
  ctx.fillStyle = roseFaint;
  roundRect(ctx, LX, y, RX - LX, bd.isNegotiable ? 90 : 110, 12);
  ctx.fill();
  ctx.strokeStyle = borderCol;
  ctx.lineWidth = 1;
  roundRect(ctx, LX, y, RX - LX, bd.isNegotiable ? 90 : 110, 12);
  ctx.stroke();

  const bx = LX + 16, by = y + 16;

  // Total
  ctx.font = '400 12px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = mauve;
  ctx.textAlign = 'left';
  ctx.fillText('Package Total', bx, by);
  ctx.font = '600 13px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = text;
  ctx.textAlign = 'right';
  ctx.fillText(bd.totalStr, RX - 16, by);

  // DP
  ctx.font = '400 12px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = mauve;
  ctx.textAlign = 'left';
  ctx.fillText('Downpayment Paid (GCash)', bx, by + 26);
  ctx.font = '600 13px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = green;
  ctx.textAlign = 'right';
  ctx.fillText('− ' + bd.dpStr, RX - 16, by + 26);

  // divider
  ctx.strokeStyle = borderCol;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bx, by + 38); ctx.lineTo(RX - 16, by + 38);
  ctx.stroke();

  if (!bd.isNegotiable) {
    // Balance label
    ctx.font = 'bold 12px "DM Sans", Arial, sans-serif';
    ctx.fillStyle = rose;
    ctx.textAlign = 'left';
    ctx.fillText('Remaining Balance (Cash/GCash)', bx, by + 56);

    // Balance amount — big
    ctx.font = 'bold 22px "DM Sans", Arial, sans-serif';
    ctx.fillStyle = roseDark;
    ctx.textAlign = 'right';
    ctx.fillText(bd.balanceStr, RX - 16, by + 76);

    y += 130;
  } else {
    ctx.font = 'bold 12px "DM Sans", Arial, sans-serif';
    ctx.fillStyle = rose;
    ctx.textAlign = 'left';
    ctx.fillText('Remaining Balance', bx, by + 56);
    ctx.font = '500 13px "DM Sans", Arial, sans-serif';
    ctx.fillStyle = mauve;
    ctx.textAlign = 'right';
    ctx.fillText('To be discussed', RX - 16, by + 56);
    y += 112;
  }

  // balance note
  ctx.font = 'italic 11px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = muted;
  ctx.textAlign = 'center';
  ctx.fillText('Remaining balance is payable via Cash or GCash after performance.', MID, y);
  y += 20;

  // ── NOTES ────────────────────────────────────────────────
  if (b.notes) {
    y += 6;
    sectionHead('Special Notes / Song Requests');
    ctx.font = 'italic 13px "DM Sans", Arial, sans-serif';
    ctx.fillStyle = mauve;
    ctx.textAlign = 'left';
    wrapText(ctx, b.notes, LX, y, RX - LX, 20);
    y += Math.ceil(b.notes.length / 60) * 20 + 10;
  }

  // ── ADMIN NOTE ───────────────────────────────────────────
  if (b.adminNote) {
    y += 4;
    ctx.fillStyle = rosePale;
    roundRect(ctx, LX, y, RX - LX, 44, 10);
    ctx.fill();
    ctx.font = '400 11px "DM Sans", Arial, sans-serif';
    ctx.fillStyle = rose;
    ctx.textAlign = 'left';
    ctx.fillText('📝 Admin Note: ' + b.adminNote, LX + 12, y + 26);
    y += 54;
  }

  // ── FOOTER ───────────────────────────────────────────────
  const footerY = H - 70;

  // footer band
  const fgrad = ctx.createLinearGradient(0, footerY, W, H);
  fgrad.addColorStop(0, rose);
  fgrad.addColorStop(1, roseLight);
  ctx.fillStyle = fgrad;
  roundRect(ctx, 0, footerY, W, H - footerY, { tl: 40, tr: 40, br: 0, bl: 0 });
  ctx.fill();

  ctx.fillStyle = white;
  ctx.font = 'bold 13px "DM Sans", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Jeoan Gwyneth Dajay Gran · 0912 797 7245', MID, footerY + 28);

  ctx.font = '400 11px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('Generated on ' + new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }), MID, footerY + 48);

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
          <button class="btn-decline" onclick="permanentDelete(${b.id})" style="flex:0 0 auto;padding:11px 16px">🗑️ Delete</button>
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
