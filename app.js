// CP Restoration Management System — Core JavaScript v3
// app.js — loaded by index.html

// ── EMPLOYEES ──────────────────────────────────────────────────────
var EMPLOYEES = {
  'jason@mycprteam.com':   { password:'CPRAdmin2026',  name:'Jason Crown',        role:'admin',      label:'Admin' },
  'queen@mycprteam.com':   { password:'CPRQueen2026',  name:'Queen Jearel Cruz',  role:'compliance', label:'Compliance' },
  'bukunmi@mycprteam.com': { password:'CPRBuku2026',   name:'Bukunmi Aina',       role:'sales',      label:'Sales' }
};

var currentUser = null;
var currentRole = null;

// ── PASSWORD TOGGLE ────────────────────────────────────────────────
function togglePwdVisibility() {
  var input = document.getElementById('admin-pass');
  var btn   = document.getElementById('pwd-toggle-btn');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (btn) btn.textContent = '🙈';
  } else {
    input.type = 'password';
    if (btn) btn.textContent = '👁';
  }
}

// ── LOGIN TABS ─────────────────────────────────────────────────────
function setLoginType(type) {
  var adminForm  = document.getElementById('login-form-admin');
  var clientForm = document.getElementById('login-form-client');
  var tabs       = document.querySelectorAll('.login-tab');
  tabs.forEach(function(t, i) {
    t.classList.toggle('active', (i === 0 && type === 'admin') || (i === 1 && type === 'client'));
  });
  if (adminForm)  adminForm.style.display  = type === 'admin'  ? 'block' : 'none';
  if (clientForm) clientForm.style.display = type === 'client' ? 'block' : 'none';
}

// ── LOGIN ──────────────────────────────────────────────────────────
function loginAdmin() {
  var emailEl = document.getElementById('admin-email');
  var passEl  = document.getElementById('admin-pass');
  var errEl   = document.getElementById('login-error');

  var email = ((emailEl||{}).value||'').trim().toLowerCase();
  var pass  = ((passEl||{}).value||'').trim();

  if (errEl) { errEl.textContent=''; errEl.style.display='none'; }

  if (!email || !pass) {
    if (errEl) { errEl.textContent='Please enter your email and password.'; errEl.style.display='block'; }
    return;
  }

  var emp = EMPLOYEES[email];
  if (!emp || emp.password !== pass) {
    if (errEl) { errEl.textContent='Incorrect email or password. Contact Jason at cprestorationsvcs@gmail.com'; errEl.style.display='block'; }
    if (passEl) passEl.value = '';
    return;
  }

  currentUser = email;
  currentRole = emp.role;

  if (errEl) errEl.style.display = 'none';

  var loginScreen = document.getElementById('login-screen');
  var app = document.getElementById('app');
  if (loginScreen) loginScreen.style.display = 'none';
  if (app) app.style.display = 'block';

  // Set header name/role
  var nameEl = document.getElementById('current-user-name');
  var roleEl = document.getElementById('current-user-role');
  if (nameEl) nameEl.textContent = emp.name;
  if (roleEl) roleEl.textContent = emp.label;

  // Show/hide admin-only nav items
  document.querySelectorAll('.admin-only').forEach(function(el) {
    el.style.display = emp.role === 'admin' ? '' : 'none';
  });

  showPage('dashboard');
  trackTeamSession();
}

function logoutAdmin() {
  currentUser = null;
  currentRole = null;
  var loginScreen = document.getElementById('login-screen');
  var app = document.getElementById('app');
  if (loginScreen) loginScreen.style.display = 'flex';
  if (app) app.style.display = 'none';
  var em = document.getElementById('admin-email');
  var pw = document.getElementById('admin-pass');
  if (em) em.value = '';
  if (pw) { pw.value = ''; pw.type = 'password'; }
  var btn = document.getElementById('pwd-toggle-btn');
  if (btn) btn.textContent = '👁';
}

// ── NAVIGATION ─────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(function(p) {
    p.style.display = 'none';
    p.classList.remove('active');
  });
  document.querySelectorAll('.nav-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  var el = document.getElementById('page-' + name);
  if (el) { el.style.display = 'block'; el.classList.add('active'); }
  var btns = document.querySelectorAll('.nav-btn');
  for (var i = 0; i < btns.length; i++) {
    var oc = btns[i].getAttribute('onclick') || '';
    if (oc.indexOf("'" + name + "'") !== -1) { btns[i].classList.add('active'); break; }
  }
  window.scrollTo(0, 0);
  trackTeamSession();
  if (name === 'clients')   { if (typeof loadClientsTable  === 'function') loadClientsTable(); }
  if (name === 'disputes')  { if (typeof loadDisputesTable === 'function') loadDisputesTable(); }
  if (name === 'broadcast') { if (typeof updateBCAudience  === 'function') updateBCAudience(); }
  if (name === 'activity')  { if (typeof loadActivityLog   === 'function') loadActivityLog(); }
  if (name === 'payroll')   { if (typeof renderPayrollTable === 'function') renderPayrollTable(); }
  if (name === 'accounting'){ if (typeof renderAccountingPage === 'function') renderAccountingPage(); }
}

// ── MODAL ──────────────────────────────────────────────────────────
function openModal(id) {
  var m = document.getElementById(id);
  if (m) { m.style.display = 'flex'; }
}
function closeModal(id) {
  var m = document.getElementById(id);
  if (m) { m.style.display = 'none'; }
}

// ── TOAST ──────────────────────────────────────────────────────────
function showToast(msg, type) {
  var bg = type === 'error' ? '#8B1A1A' : type === 'success' ? '#1A5C38' : '#1B3A6B';
  var t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:' + bg + ';color:white;padding:11px 22px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.3);white-space:nowrap;font-family:Inter,sans-serif;';
  document.body.appendChild(t);
  setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 3000);
}

// ── ACTIVITY TRACKING ──────────────────────────────────────────────
function trackTeamSession() {
  if (!currentUser) return;
  try {
    var emp = EMPLOYEES[currentUser] || {};
    var sessions = JSON.parse(localStorage.getItem('cp_team_sessions') || '{}');
    var activePage = document.querySelector('.nav-btn.active');
    sessions[currentUser] = {
      email: currentUser,
      name: emp.name || currentUser,
      role: emp.label || '',
      lastSeen: new Date().toISOString(),
      page: activePage ? activePage.textContent.trim() : 'Dashboard'
    };
    localStorage.setItem('cp_team_sessions', JSON.stringify(sessions));
  } catch(e) {}
}

function loadActivityLog() {
  try {
    var clientLog = JSON.parse(localStorage.getItem('cp_activity_log') || '[]');
    var now = new Date();
    var previewEl = document.getElementById('client-activity-preview');
    if (previewEl) {
      var recent = clientLog.filter(function(r) { return r.type === 'login'; }).slice(0, 5);
      previewEl.innerHTML = recent.length ? recent.map(function(r) {
        var mins = Math.floor((now - new Date(r.time)) / 60000);
        var ago = mins < 1 ? 'Just now' : mins < 60 ? mins + 'm ago' : Math.floor(mins/60) + 'h ago';
        return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #E2E8F0;font-size:12px;">' +
          '<span><strong>' + (r.name || r.id) + '</strong> logged in</span>' +
          '<span style="color:#6B7280;">' + ago + '</span></div>';
      }).join('') : '<div style="font-size:13px;color:#6B7280;text-align:center;padding:8px;">No client logins yet.</div>';
    }
  } catch(e) {}
}

// ── INIT ───────────────────────────────────────────────────────────
window.addEventListener('load', function() {
  // Show login, hide app
  var ls = document.getElementById('login-screen');
  var app = document.getElementById('app');
  if (ls) ls.style.display = 'flex';
  if (app) app.style.display = 'none';

  // Hide all pages initially
  document.querySelectorAll('.page').forEach(function(p) { p.style.display = 'none'; });

  // Wire up eye icon — find the button next to admin-pass
  var passInput = document.getElementById('admin-pass');
  if (passInput) {
    var eyeBtn = passInput.parentNode ? passInput.parentNode.querySelector('button') : null;
    if (eyeBtn) {
      eyeBtn.id = 'pwd-toggle-btn';
      eyeBtn.onclick = togglePwdVisibility;
    }
  }

  // Enter key triggers login
  var emailEl = document.getElementById('admin-email');
  var passEl  = document.getElementById('admin-pass');
  if (emailEl) emailEl.addEventListener('keydown', function(e) { if (e.key === 'Enter') loginAdmin(); });
  if (passEl)  passEl.addEventListener('keydown',  function(e) { if (e.key === 'Enter') loginAdmin(); });

  // Refresh team session every 60 seconds
  setInterval(function() {
    trackTeamSession();
    loadActivityLog();
  }, 60000);
});
