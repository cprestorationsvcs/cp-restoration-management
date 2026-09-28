// CP Restoration Management System — Core JavaScript
// app.js — loaded by index.html

// ── EMPLOYEES ──────────────────────────────────────────────────────
var EMPLOYEES = {
  'jason@mycprteam.com':   { password:'CPRAdmin2026',  name:'Jason Crown',        role:'admin',      label:'Admin' },
  'queen@mycprteam.com':   { password:'CPRQueen2026',  name:'Queen Jearel Cruz',  role:'compliance', label:'Compliance' },
  'bukunmi@mycprteam.com': { password:'CPRBuku2026',   name:'Bukunmi Aina',       role:'sales',      label:'Sales' }
};

var currentUser = null;
var currentRole = null;

// ── LOGIN ──────────────────────────────────────────────────────────
function loginAdmin() {
  var email = ((document.getElementById('admin-email')||{}).value||'').trim().toLowerCase();
  var pass  = ((document.getElementById('admin-password')||{}).value||'').trim();
  var errEl = document.getElementById('login-error');

  if (!email || !pass) {
    if (errEl) { errEl.textContent='Please enter your email and password.'; errEl.style.display='block'; }
    return;
  }

  var emp = EMPLOYEES[email];
  if (!emp || emp.password !== pass) {
    if (errEl) { errEl.textContent='Incorrect email or password. Contact Jason Crown to reset.'; errEl.style.display='block'; }
    var pw = document.getElementById('admin-password'); if(pw) pw.value='';
    return;
  }

  currentUser = email;
  currentRole = emp.role;

  if (errEl) errEl.style.display='none';

  var loginScreen = document.getElementById('login-screen');
  var app = document.getElementById('app');
  if (loginScreen) loginScreen.style.display='none';
  if (app) app.style.display='block';

  // Set header
  var nameEl = document.getElementById('current-user-name');
  if (nameEl) nameEl.textContent = emp.name;
  var roleEl = document.getElementById('current-user-role');
  if (roleEl) roleEl.textContent = emp.label;

  setupNavForRole(emp.role);
  showPage('dashboard');
  trackTeamSession();
}

function logoutAdmin() {
  currentUser = null; currentRole = null;
  var loginScreen = document.getElementById('login-screen');
  var app = document.getElementById('app');
  if (loginScreen) loginScreen.style.display='flex';
  if (app) app.style.display='none';
  var em = document.getElementById('admin-email'); if(em) em.value='';
  var pw = document.getElementById('admin-password'); if(pw) pw.value='';
}

// ── NAVIGATION ──────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(function(p){
    p.style.display='none'; p.classList.remove('active');
  });
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
  var el = document.getElementById('page-'+name);
  if (el) { el.style.display='block'; el.classList.add('active'); }
  var btns = document.querySelectorAll('.nav-btn');
  for (var i=0;i<btns.length;i++){
    var oc = btns[i].getAttribute('onclick')||'';
    if (oc.indexOf("'"+name+"'")!==-1){ btns[i].classList.add('active'); break; }
  }
  window.scrollTo(0,0);
  if (name==='clients')    { if(typeof loadClientsTable==='function') loadClientsTable(); }
  if (name==='disputes')   { if(typeof loadDisputesTable==='function') loadDisputesTable(); }
  if (name==='passwords')  { if(typeof renderPwdTable==='function') renderPwdTable(); }
  if (name==='broadcast')  { if(typeof updateBCAudience==='function') updateBCAudience(); }
  if (name==='activity')   { if(typeof loadActivityLog==='function') loadActivityLog(); }
  if (name==='payroll')    { if(typeof renderPayrollTable==='function') renderPayrollTable(); }
}

// ── ROLE NAV SETUP ─────────────────────────────────────────────────
function setupNavForRole(role) {
  var adminOnly = document.querySelectorAll('.admin-only');
  adminOnly.forEach(function(el){
    el.style.display = role==='admin' ? '' : 'none';
  });
}

// ── TOAST ──────────────────────────────────────────────────────────
function showToast(msg) {
  var t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1B3A6B;color:white;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.3);white-space:nowrap;';
  document.body.appendChild(t);
  setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 3000);
}

// ── MODAL ──────────────────────────────────────────────────────────
function openModal(id) {
  var m = document.getElementById(id);
  if (m) { m.style.display='flex'; m.classList.add('open'); }
}
function closeModal(id) {
  var m = document.getElementById(id);
  if (m) { m.style.display='none'; m.classList.remove('open'); }
}

// ── ACTIVITY TRACKING ──────────────────────────────────────────────
function trackTeamSession() {
  if (!currentUser) return;
  try {
    var emp = EMPLOYEES[currentUser] || {};
    var sessions = JSON.parse(localStorage.getItem('cp_team_sessions')||'{}');
    sessions[currentUser] = {
      email: currentUser, name: emp.name||currentUser, role: emp.label||'',
      lastSeen: new Date().toISOString(),
      page: (document.querySelector('.nav-btn.active')||{}).textContent||'Dashboard'
    };
    localStorage.setItem('cp_team_sessions', JSON.stringify(sessions));
  } catch(e) {}
}

function loadActivityLog() {
  try {
    var clientLog = JSON.parse(localStorage.getItem('cp_activity_log')||'[]');
    var now = new Date();
    var todayStr = now.toISOString().split('T')[0];
    var loginsToday = new Set(clientLog.filter(function(r){ return r.type==='login'&&r.time.startsWith(todayStr); }).map(function(r){ return r.id; })).size;
    var previewEl = document.getElementById('client-activity-preview');
    if (previewEl) {
      var recent = clientLog.filter(function(r){ return r.type==='login'; }).slice(0,5);
      previewEl.innerHTML = recent.length ? recent.map(function(r){
        var mins = Math.floor((now-new Date(r.time))/60000);
        var ago = mins<1?'Just now':mins<60?mins+'m ago':Math.floor(mins/60)+'h ago';
        return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #E2E8F0;font-size:12px;">'+
          '<span><strong>'+(r.name||r.id)+'</strong> logged in</span>'+
          '<span style="color:#6B7280;">'+ago+'</span></div>';
      }).join('') : '<div style="font-size:13px;color:#6B7280;text-align:center;padding:8px;">No client logins yet.</div>';
    }
  } catch(e) {}
}

// ── INIT ───────────────────────────────────────────────────────────
window.addEventListener('load', function() {
  // Show login screen
  var ls = document.getElementById('login-screen');
  var app = document.getElementById('app');
  if (ls) ls.style.display='flex';
  if (app) app.style.display='none';

  // Hide all pages
  document.querySelectorAll('.page').forEach(function(p){ p.style.display='none'; });

  // Enter key on login
  ['admin-email','admin-password'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.addEventListener('keydown', function(e){ if(e.key==='Enter') loginAdmin(); });
  });

  // Refresh activity every 60 seconds
  setInterval(function(){
    trackTeamSession();
    loadActivityLog();
  }, 60000);
});
