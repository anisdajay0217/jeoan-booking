const API_BASE = window.location.origin;

// If already logged in, skip straight to dashboard
if (sessionStorage.getItem('admin_token')) {
  window.location.href = 'admindashboard.html';
}

// Floating petals
(function(){
  const pc = document.getElementById('loginPetals');
  if (!pc) return;
  ['🌸','🌸','🌷','🌸','🌺','🌸','🌷'].forEach(p => {
    const count = p==='🌸' ? 5 : 3;
    for (let i=0; i<count; i++) {
      const el = document.createElement('div');
      el.className = 'petal';
      el.textContent = p;
      el.style.left = Math.random()*100+'%';
      el.style.setProperty('--sz', (12+Math.random()*12)+'px');
      el.style.setProperty('--dur', (5+Math.random()*6)+'s');
      el.style.setProperty('--del', (Math.random()*8)+'s');
      pc.appendChild(el);
    }
  });
})();

// Enter key support
document.getElementById('passwordInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

// Login
async function doLogin() {
  const pw = document.getElementById('passwordInput').value;
  const errEl = document.getElementById('loginError');
  try {
    const res = await fetch(API_BASE + '/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = 'Incorrect password. Please try again.';
      errEl.classList.add('show');
      document.getElementById('passwordInput').value = '';
      document.getElementById('passwordInput').focus();
      return;
    }
    sessionStorage.setItem('admin_token', data.token);
    window.location.href = 'admindashboard.html';
  } catch(e) {
    errEl.textContent = 'Cannot connect to server.';
    errEl.classList.add('show');
  }
}
