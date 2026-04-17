// ══════════════════════════════════════════════════════════
// client.ts — Book Jeoan Gwyneth · Client-Side TypeScript
// ══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const API_BASE = 'https://YOUR-RAILWAY-APP.up.railway.app';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface Booking {
  id: number;
  name: string;
  date: string;
  perfTime: string;
  occasion: string;
  venue: string;
  rateType: string;
  package: string;
  notes: string;
}

interface LoginResponse {
  token: string;
  displayName: string;
  username: string;
  error?: string;
}

interface BookingResponse {
  error?: string;
}

// ─────────────────────────────────────────────
// AUTH STATE
// ─────────────────────────────────────────────
let clientToken: string | null = sessionStorage.getItem('client_token');
let clientDisplayName: string = sessionStorage.getItem('client_display_name') || '';
let clientUsername: string = sessionStorage.getItem('client_username') || '';
let currentBookingId: number | null = null;

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
(function init(): void {
  spawnLoginPetals();
  spawnSparkles();
  if (clientToken) {
    showWelcome();
  }
})();

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
async function doClientLogin(): Promise<void> {
  const username = (document.getElementById('loginUsername') as HTMLInputElement).value.trim();
  const password = (document.getElementById('loginPassword') as HTMLInputElement).value;
  const errEl = document.getElementById('loginError') as HTMLElement;
  const btn = document.getElementById('loginBtn') as HTMLButtonElement;
  errEl.classList.remove('show');

  if (!username || !password) {
    errEl.textContent = 'Please enter your username and password.';
    errEl.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Signing in…';

  try {
    const res = await fetch(`${API_BASE}/client/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data: LoginResponse = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || 'Login failed. Please try again.';
      errEl.classList.add('show');
      btn.disabled = false;
      btn.innerHTML = '🔑 &nbsp; Sign In';
      return;
    }
    clientToken = data.token;
    clientDisplayName = data.displayName;
    clientUsername = data.username;
    sessionStorage.setItem('client_token', clientToken);
    sessionStorage.setItem('client_display_name', clientDisplayName);
    sessionStorage.setItem('client_username', clientUsername);
    showWelcome();
  } catch {
    errEl.textContent = 'Cannot connect to server. Please try again.';
    errEl.classList.add('show');
    btn.disabled = false;
    btn.innerHTML = '🔑 &nbsp; Sign In';
  }
}

// ─────────────────────────────────────────────
// WELCOME PAGE
// ─────────────────────────────────────────────
function showWelcome(): void {
  (document.getElementById('loginPage') as HTMLElement).classList.add('hide');
  const wp = document.getElementById('welcomePage') as HTMLElement;
  wp.style.display = 'flex';
  wp.style.opacity = '0';
  wp.style.transition = 'opacity .4s ease';
  setTimeout(() => { wp.style.opacity = '1'; }, 10);
  (document.getElementById('welcomeGreeting') as HTMLElement).textContent =
    `Hello, ${clientDisplayName || clientUsername}! 💕`;
  spawnWelcomePetals();
}

function doLogout(): void {
  clientToken = null;
  clientDisplayName = '';
  clientUsername = '';
  sessionStorage.removeItem('client_token');
  sessionStorage.removeItem('client_display_name');
  sessionStorage.removeItem('client_username');
  (document.getElementById('welcomePage') as HTMLElement).style.display = 'none';
  (document.getElementById('formPage') as HTMLElement).style.display = 'none';
  (document.getElementById('thankYouPage') as HTMLElement).classList.remove('show');
  const lp = document.getElementById('loginPage') as HTMLElement;
  lp.classList.remove('hide');
  (document.getElementById('loginUsername') as HTMLInputElement).value = '';
  (document.getElementById('loginPassword') as HTMLInputElement).value = '';
  (document.getElementById('loginBtn') as HTMLButtonElement).disabled = false;
  (document.getElementById('loginBtn') as HTMLButtonElement).innerHTML = '🔑 &nbsp; Sign In';
  (document.getElementById('loginError') as HTMLElement).classList.remove('show');
}

// ─────────────────────────────────────────────
// PETAL / SPARKLE EFFECTS
// ─────────────────────────────────────────────
function spawnPetals(containerId: string, petals: string[], petalCount: (p: string) => number): void {
  const pc = document.getElementById(containerId) as HTMLElement;
  if (pc.childElementCount > 0) return;
  petals.forEach(p => {
    for (let i = 0; i < petalCount(p); i++) {
      const el = document.createElement('div');
      el.className = 'petal';
      el.textContent = p;
      el.style.left = `${Math.random() * 100}%`;
      el.style.setProperty('--sz', `${13 + Math.random() * 12}px`);
      el.style.setProperty('--dur', `${5 + Math.random() * 6}s`);
      el.style.setProperty('--del', `${Math.random() * 8}s`);
      pc.appendChild(el);
    }
  });
}

function spawnLoginPetals(): void {
  const petalTypes = ['🌸','🌸','🌷','🌸','🌺','🌸','🌷'];
  spawnPetals('loginPetals', petalTypes, p => p === '🌸' ? 5 : 3);
}

function spawnWelcomePetals(): void {
  const petalTypes = ['🌸','🌸','🌷','🌸','🌺','🌸','🌷','🌸','🌸','🌷'];
  spawnPetals('welcomePetals', petalTypes, p => p === '🌸' ? 7 : 4);
}

function initFormPetals(): void {
  const petalTypes = ['🌸','🌸','🌷','🌸','🌺','🌸','🌷','🌸','🌸','🌷'];
  spawnPetals('petals', petalTypes, p => p === '🌸' ? 7 : 4);
}

function spawnSparkles(): void {
  const sc = document.getElementById('sparkles') as HTMLElement;
  const sizes = [8, 9, 10, 11, 12];
  const colors = ['#e8728a', '#c94f6a', '#d4a853', '#e8728a', '#b07080'];
  for (let i = 0; i < 28; i++) {
    const s = document.createElement('div');
    s.className = 'sparkle';
    s.style.left = `${Math.random() * 100}%`;
    s.style.top = `${Math.random() * 100}%`;
    s.style.setProperty('--ts', `${sizes[Math.floor(Math.random() * sizes.length)]}px`);
    s.style.setProperty('--td', `${1.5 + Math.random() * 2.5}s`);
    s.style.setProperty('--tl', `${Math.random() * 3}s`);
    s.style.color = colors[Math.floor(Math.random() * colors.length)];
    sc.appendChild(s);
  }
}

// ─────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────
function goToForm(): void {
  const wp = document.getElementById('welcomePage') as HTMLElement;
  wp.classList.add('hide');
  setTimeout(() => {
    wp.style.display = 'none';
    (document.getElementById('formPage') as HTMLElement).style.display = 'block';
    initFormPetals();
  }, 500);
}

// ─────────────────────────────────────────────
// FORM LOGIC
// ─────────────────────────────────────────────
function switchRate(): void {
  const rateRadio = document.querySelector<HTMLInputElement>('input[name="rateType"]:checked');
  const type = rateRadio?.value;
  (document.getElementById('songBox') as HTMLElement).classList.toggle('show', type === 'song');
  (document.getElementById('hourBox') as HTMLElement).classList.toggle('show', type === 'hour');
  (document.getElementById('songPkg') as HTMLSelectElement).value = '';
  (document.getElementById('hourPkg') as HTMLSelectElement).value = '';
  (document.getElementById('songPrice') as HTMLElement).classList.remove('show');
  (document.getElementById('hourPrice') as HTMLElement).classList.remove('show');
}

const songNotes: Record<string, string> = {
  '1–6 Songs':  'Up to 6 songs of live performance 🎵',
  '1–10 Songs': 'Up to 10 songs of live performance 🎵',
  '1–15 Songs': 'Up to 15 songs of live performance 🎵',
  'Band Sub':   'Rate is negotiable — please discuss with Jeoan',
};

const hourNotes: Record<string, string> = {
  '1 Hour':       '1 hour of live performance 🎤',
  '1 Hr 30 Mins': '1 hour and 30 minutes of live performance 🎤',
  '2 Hours':      '2 hours of live performance 🎤',
};

function showPrice(type: 'song' | 'hour'): void {
  const sel = document.getElementById(type === 'song' ? 'songPkg' : 'hourPkg') as HTMLSelectElement;
  const tag = document.getElementById(type === 'song' ? 'songPrice' : 'hourPrice') as HTMLElement;
  const parts = sel.value.split('|');
  const [label, price] = parts;
  const note = type === 'song' ? songNotes[label] : hourNotes[label];
  tag.innerHTML = `<strong>${label} — ${price}</strong><span>${note || ''}</span>`;
  tag.classList.add('show');
}

function toggleCB(): void {
  setTimeout(() => {
    const cb = document.getElementById('agreeCheck') as HTMLInputElement;
    (document.getElementById('customCB') as HTMLElement).classList.toggle('checked', cb.checked);
    (document.getElementById('submitBtn') as HTMLButtonElement).disabled = !cb.checked;
  }, 0);
}

async function submitForm(): Promise<void> {
  const name     = (document.getElementById('clientName') as HTMLInputElement).value.trim();
  const date     = (document.getElementById('eventDate') as HTMLInputElement).value.trim();
  const perfTime = (document.getElementById('perfTime') as HTMLInputElement).value.trim();
  const occ      = (document.getElementById('occasion') as HTMLSelectElement).value;
  const venue    = (document.getElementById('venue') as HTMLTextAreaElement).value.trim();
  const notes    = (document.getElementById('notes') as HTMLTextAreaElement).value.trim();
  const rateRadio = document.querySelector<HTMLInputElement>('input[name="rateType"]:checked');

  if (!rateRadio) { alert('Please select a Rate Type.'); return; }
  const rateType = rateRadio.value;
  const pkgRaw = rateType === 'song'
    ? (document.getElementById('songPkg') as HTMLSelectElement).value
    : (document.getElementById('hourPkg') as HTMLSelectElement).value;

  if (!name || !date || !perfTime || !occ || !venue || !pkgRaw) {
    alert('Please fill in all required fields (*).');
    return;
  }

  const parts = pkgRaw.split('|');
  const pkg = `${parts[0]} — ${parts[1]}`;

  const booking: Booking = {
    id: Date.now(),
    name, date, perfTime,
    occasion: occ, venue,
    rateType: rateType === 'song' ? '🎵 Per Song' : '⏱️ Per Hour',
    package: pkg,
    notes: notes || '',
  };

  const btn = document.getElementById('submitBtn') as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  try {
    const res = await fetch(`${API_BASE}/client/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`,
      },
      body: JSON.stringify(booking),
    });
    if (!res.ok) {
      const err: BookingResponse = await res.json();
      alert(`Error: ${err.error || 'Could not submit booking.'}`);
      btn.disabled = false;
      btn.textContent = '🎀  Submit Booking';
      return;
    }
  } catch {
    alert('Cannot connect to server. Please check your connection.');
    btn.disabled = false;
    btn.textContent = '🎀  Submit Booking';
    return;
  }

  currentBookingId = booking.id;

  const rows: [string, string][] = [
    ['Client Name', name], ['Event Date', date], ['Time', perfTime],
    ['Occasion', occ], ['Venue', venue],
    ['Rate Type', booking.rateType], ['Package', pkg],
  ];
  if (notes) rows.push(['Notes', notes]);

  (document.getElementById('summaryRows') as HTMLElement).innerHTML = rows
    .map(r => `<div class="cc-row"><span class="lbl">${r[0]}</span><span class="val">${r[1]}</span></div>`)
    .join('');

  (document.getElementById('formPage') as HTMLElement).style.display = 'none';
  (document.getElementById('thankYouPage') as HTMLElement).classList.add('show');
}

// ─────────────────────────────────────────────
// GCASH UPLOAD
// ─────────────────────────────────────────────
function compressImage(file: File, callback: (dataUrl: string) => void): void {
  const reader = new FileReader();
  reader.onload = function (e: ProgressEvent<FileReader>) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const maxDim = 900;
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
        else       { w = Math.round(w * maxDim / h); h = maxDim; }
      }
      canvas.width = w;
      canvas.height = h;
      (canvas.getContext('2d') as CanvasRenderingContext2D).drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}

async function handleGcashUpload(input: HTMLInputElement): Promise<void> {
  if (!input.files || !input.files[0] || !currentBookingId) return;
  compressImage(input.files[0], async (dataUrl: string) => {
    (document.getElementById('gcashPreviewImg') as HTMLImageElement).src = dataUrl;
    (document.getElementById('gcashPreview') as HTMLElement).classList.add('show');
    const uploadArea = document.getElementById('uploadArea') as HTMLElement;
    uploadArea.style.opacity = '0.5';
    uploadArea.style.pointerEvents = 'none';
    try {
      await fetch(`${API_BASE}/client/bookings/${currentBookingId}/screenshot`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${clientToken}`,
        },
        body: JSON.stringify({ gcashScreenshot: dataUrl }),
      });
    } catch (e) { console.warn('Screenshot upload failed', e); }
    (document.getElementById('gcashSuccess') as HTMLElement).classList.add('show');
  });
}
