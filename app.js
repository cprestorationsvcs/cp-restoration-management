// ── CORE GLOBALS ─────────────────────────────────────────────────────
var currentUser = '';
var currentRole = '';
var currentPage = '';

function showPage(name) {
  currentPage = name;
  // Hide all pages
  document.querySelectorAll('.page').forEach(function(p){ p.style.display = 'none'; });
  // Show target page
  var target = document.getElementById('page-' + name);
  if (target) target.style.display = 'block';
  // Update nav active state
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
  var activeBtn = document.querySelector('.nav-btn[onclick*="' + name + '"]');
  if (activeBtn) activeBtn.classList.add('active');
  // Run page loader if registered
  if (_pageLoaders && _pageLoaders[name]) {
    try { _pageLoaders[name](); } catch(e) { console.warn('Page loader error:', e.message); }
  }
  // Track session
  if (typeof trackTeamSession === 'function') trackTeamSession(name);
}
// ─────────────────────────────────────────────────────────────────────

var EMPLOYEES = {
  'jason@mycprteam.com':   { password:'CPRAdmin2026',  name:'Jason Crown',       role:'admin',      label:'Admin',             initials:'JC' },
  'queen@mycprteam.com':   { password:'CPRQueen2026',  name:'Queen Jearel Cruz', role:'compliance', label:'Compliance Officer', initials:'QC' },
  'bukunmi@mycprteam.com': { password:'CPRBuku2026',   name:'Bukunmi Aina',      role:'sales',      label:'Sales Rep',          initials:'BA' },
  'elna@mycprteam.com':    { password:'CPRElna2026',   name:'Elna Palabrica',    role:'cs',         label:'CS Agent',           initials:'EP' },

  'alec@mycprteam.com':    { password:'CPRAlec2026',   name:'Alec Sarrosa',      role:'cs',         label:'CS Agent',           initials:'AS' },

  'marcelo@mycprteam.com': { password:'CPRMarcelo2026', name:'Marcelo Torres',     role:'dispute',    label:'Dispute Specialist', initials:'MT' },
  'annabel@mycprteam.com': { password:'CPRAnnabel2026', name:'Annabel Curada',     role:'dispute',    label:'Dispute Specialist', initials:'AC' },
  // jay@mycprteam.com DEACTIVATED
  'raymon.guevarra@mycprteam.com': { password:'CPRRaymon2026', name:'Raymon Guevarra', role:'sales', label:'Sales Rep', initials:'RG' },
  'elmer.jungco@mycprteam.com': { password:'CPRElmer2026', name:'Elmer Jungco', role:'sales', label:'Sales Rep', initials:'EJ' },
  'rosemarie.deguzman@mycprteam.com': { password:'CPRRosemarie2026', name:'Rosemarie De Guzman', role:'dispute', label:'Bureau Caller', initials:'RD' },

  'bseo.sidd@gmail.com': { password:'CPRSid2026', name:'Jose Isidro Perez', role:'sales', label:'Sales Rep', initials:'JP' },
  'etjjr1989@gmail.com': { password:'CPRElmer2026', name:'Elmer Jungco', role:'sales', label:'Sales Rep', initials:'EJ' },
  'cherrydavis@monfortintl.com': { password:'CPRCherry2026', name:'Cherry Manlapaz', role:'sales', label:'Sales Rep', initials:'CM' },
  'rrpasco11@gmail.com': { password:'CPRRaven2026', name:'Raven Pasco', role:'sales', label:'Sales Rep', initials:'RP' },
  'rosemarie.padilla.deguzman@gmail.com': { password:'CPRRosemarie2026', name:'Rosemarie De Guzman', role:'bureau', label:'Bureau Caller', initials:'RD' },
  'abellar1407@gmail.com': { password:'CPRRedan2026', name:'Redan Abella', role:'bureau', label:'Bureau Caller', initials:'RA' },
};

var TEAM_ROSTER = {
  'jason@mycprteam.com':          {name:'Jason Crown',          role:'Admin',               start:'2014-01-01', weekly:0,   active:true},
  'queen@mycprteam.com':          {name:'Queen Jearel Cruz',    role:'Compliance Specialist',start:'2026-09-21',weekly:200, active:true},
  'queenjearelcruz@gmail.com':    {name:'Queen Jearel Cruz',    role:'Compliance Specialist',start:'2026-09-21',weekly:200, active:true},
  'elna@mycprteam.com':           {name:'Elna Palabrica',       role:'CS Agent',            start:'2026-10-05', weekly:100, active:true},
  'epalabrica2587@gmail.com':     {name:'Elna Palabrica',       role:'CS Agent',            start:'2026-10-05', weekly:100, active:true},
  'alec@mycprteam.com':           {name:'Alec Sarrosa',         role:'CS Agent',            start:'2026-10-05', weekly:100, active:true},
  'absarrosa.va@gmail.com':       {name:'Alec Sarrosa',         role:'CS Agent',            start:'2026-10-05', weekly:100, active:true},
  'marcelo@mycprteam.com':        {name:'Marcelo Torres',       role:'Dispute Specialist',  start:'2026-10-07', weekly:100, active:true},
  'mark.torres08@gmail.com':      {name:'Marcelo Torres',       role:'Dispute Specialist',  start:'2026-10-07', weekly:100, active:true},
  'ablaza200@gmail.com':          {name:'Kimwell Ablaza',       role:'Dispute Specialist',  start:'2026-10-07', weekly:100, active:true},
  'annabel@mycprteam.com':        {name:'Annabel Curada',       role:'Dispute Specialist',  start:'2026-10-07', weekly:100, active:true},
  'annabelcreditrepair@gmail.com':{name:'Annabel Curada',       role:'Dispute Specialist',  start:'2026-10-07', weekly:100, active:true},
  'bukunmi@mycprteam.com':        {name:'Bukunmi Aina',         role:'Lead Generation',     start:'2026-09-21', weekly:250, active:true},
  'jay@mycprteam.com':            {name:'Jay Rico',             role:'Terminated',          start:'',           weekly:0,   active:false},
  'lester.leonardo1997@gmail.com':{name:'Lester Leonardo',      role:'Terminated',          start:'',           weekly:0,   active:false},
  'jonahmariedeguzman2@gmail.com':{name:'Jonah Marie De Guzman','role':'Terminated',        start:'',           weekly:0,   active:false},
  'jonah@mycprteam.com':          {name:'Jonah Marie De Guzman','role':'Terminated',        start:'',           weekly:0,   active:false},
  'anthongiuseppe@gmail.com':     {name:'Anthon Giuseppe Sumbiling','role':'Terminated',    start:'',           weekly:0,   active:false},
  'anthon@mycprteam.com':         {name:'Anthon Giuseppe Sumbiling','role':'Terminated',    start:'',           weekly:0,   active:false},
};


// ── LOGIN / AUTH ─────────────────────────────────────────────────────
function setLoginType(type) {
  var adminForm  = document.getElementById('login-form-admin');
  var clientForm = document.getElementById('login-form-client');
  var tabs = document.querySelectorAll('.login-tab');
  if (adminForm)  adminForm.style.display  = type==='admin'  ? 'block' : 'none';
  if (clientForm) clientForm.style.display = type==='client' ? 'block' : 'none';
  tabs.forEach(function(t,i){ t.classList.toggle('active', (type==='admin'&&i===0)||(type==='client'&&i===1)); });
}

function toggleLoginPw() {
  var inp = document.getElementById('admin-pass');
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function loginAdmin() {
  var email = (document.getElementById('admin-email')||{}).value || '';
  var pass  = (document.getElementById('admin-pass')||{}).value  || '';
  var errEl = document.getElementById('login-error');
  email = email.trim().toLowerCase();

  if (!email || !pass) {
    if (errEl) { errEl.textContent='Please enter your email and password.'; errEl.style.display='block'; }
    return;
  }

  var emp = EMPLOYEES[email];
  if (!emp || emp.password !== pass) {
    if (errEl) { errEl.textContent='Invalid email or password. Contact Jason if you need help.'; errEl.style.display='block'; }
    return;
  }

  // Success — save session
  localStorage.setItem('cp_logged_in_user',     email);
  localStorage.setItem('cp_logged_in_role',     emp.role);
  localStorage.setItem('cp_logged_in_name',     emp.name);
  localStorage.setItem('cp_logged_in_label',    emp.label);
  localStorage.setItem('cp_logged_in_initials', emp.initials || emp.name.split(' ').map(function(w){return w[0];}).join('').substring(0,2));

  // Set global vars
  currentUser = email;
  currentRole = emp.role;

  // Show app
  var loginScreen = document.getElementById('login-screen');
  var appEl       = document.getElementById('app');
  if (loginScreen) loginScreen.style.display = 'none';
  if (appEl)       appEl.style.display       = 'block';

  // Update header
  var s = function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
  s('user-badge',         emp.name);
  s('hdr-name',           emp.name);
  s('hdr-role',           emp.label + ' — CP Restoration Services');
  s('hdr-avatar',         emp.initials || '??');
  s('current-user-name',  emp.name);
  s('current-user-role',  emp.label);

  // Show/hide admin elements
  document.querySelectorAll('.admin-only').forEach(function(el){
    el.style.display = emp.role==='admin' ? '' : 'none';
  });

  // Load dashboard — redirect specific roles to their dedicated pages
  if (emp.role === 'dispute') {
    window.location.href = '/cs-dashboard.html';
    return;
  } else if (emp.role === 'bureau') {
    window.location.href = '/cs-dashboard.html';
    return;
  }
  showPage('dashboard');
  if (typeof loadDashboard === 'function') setTimeout(loadDashboard, 300);
  if (typeof startClock    === 'function') startClock();

  // Clear error
  if (errEl) errEl.style.display = 'none';
}

function loginClient() {
  var idVal = (document.getElementById('client-id')||{}).value || '';
  var ssn   = (document.getElementById('client-ssn')||{}).value || '';
  if (!idVal || !ssn || ssn.length !== 4) {
    alert('Please enter your Client ID and last 4 digits of your SSN.');
    return;
  }
  // Redirect to client portal
  window.location.href = 'client-portal.html?id=' + encodeURIComponent(idVal.trim()) + '&ssn=' + encodeURIComponent(ssn.trim());
}

function setupNavForRole(role) {
  // Admin sees everything; staff see only their relevant pages
  var adminOnly = document.querySelectorAll('.admin-only');
  adminOnly.forEach(function(el) {
    el.style.display = (role === 'admin') ? '' : 'none';
  });
}

function logout() {
  localStorage.removeItem('cp_logged_in_user');
  localStorage.removeItem('cp_logged_in_role');
  localStorage.removeItem('cp_logged_in_name');
  localStorage.removeItem('cp_logged_in_label');
  localStorage.removeItem('cp_logged_in_initials');
  var loginScreen = document.getElementById('login-screen');
  var appEl       = document.getElementById('app');
  if (loginScreen) loginScreen.style.display = 'flex';
  if (appEl)       appEl.style.display       = 'none';
  var emailEl = document.getElementById('admin-email');
  var passEl  = document.getElementById('admin-pass');
  if (emailEl) emailEl.value = '';
  if (passEl)  passEl.value  = '';
}

// Auto-restore session on page load
(function restoreSession() {
  var savedEmail = localStorage.getItem('cp_logged_in_user') || '';
  var savedName  = localStorage.getItem('cp_logged_in_name') || '';
  var savedRole  = localStorage.getItem('cp_logged_in_role') || '';

  // Validate saved user still exists
  if (savedEmail && (!EMPLOYEES[savedEmail] || EMPLOYEES[savedEmail].role === 'terminated')) {
    localStorage.removeItem('cp_logged_in_user');
    localStorage.removeItem('cp_logged_in_role');
    localStorage.removeItem('cp_logged_in_name');
    localStorage.removeItem('cp_logged_in_label');
    localStorage.removeItem('cp_logged_in_initials');
    savedEmail = '';
  }

  if (savedEmail && savedName) {
    var loginScreen = document.getElementById('login-screen');
    var appEl       = document.getElementById('app');
    if (loginScreen) loginScreen.style.display = 'none';
    if (appEl)       appEl.style.display       = 'block';
    var badge = document.getElementById('user-badge');
    if (badge) badge.textContent = savedName;
    setupNavForRole(savedRole);
    showPage('dashboard');
  }
})();
// ────────────────────────────────────────────────────────────────────



// CP Restoration Management System — Core JavaScript v5
// app.js — loaded by index.html
// Fixes: session tracking, client search, onboarding next step, duplicate detection

// ── EMPLOYEES ──────────────────────────────────────────────────────


// ── ACTIVITY TRACKING ──────────────────────────────────────────────
// FIX: Uses currentUser at time of call, not a stale reference
function trackTeamSession(overridePage) {
  if (!currentUser) return;
  try {
    var emp = EMPLOYEES[currentUser] || {};
    var activePage = overridePage || ((document.querySelector('.nav-btn.active')||{}).textContent||'Dashboard').trim();
    var session = {
      email:    currentUser,
      name:     emp.name || currentUser,
      role:     emp.label || '',
      lastSeen: new Date().toISOString(),
      page:     activePage
    };
    // Write to localStorage with user-specific key
    var sessions = JSON.parse(localStorage.getItem('cp_team_sessions') || '{}');
    sessions[currentUser] = session;
    localStorage.setItem('cp_team_sessions', JSON.stringify(sessions));
  } catch(e) {}
}

function loadActivityLog() {
  try {
    var sessions = JSON.parse(localStorage.getItem('cp_team_sessions') || '{}');
    var clientLog = JSON.parse(localStorage.getItem('cp_activity_log') || '[]');
    var now = new Date();

    // Update team online widget on dashboard
    var teamEl = document.getElementById('team-online-list');
    if (teamEl) {
      var online = Object.values(sessions).filter(function(s){ return (now-new Date(s.lastSeen))<5*60*1000; });
      teamEl.innerHTML = online.length ? online.map(function(s){
        var mins = Math.floor((now-new Date(s.lastSeen))/60000);
        return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">' +
          '<span style="width:8px;height:8px;background:#22c55e;border-radius:50%;flex-shrink:0;"></span>' +
          '<div style="flex:1;"><div style="font-size:13px;font-weight:700;">'+s.name+'</div>' +
          '<div style="font-size:11px;color:var(--gray);">'+s.role+' — '+s.page+'</div></div>' +
          '<div style="font-size:11px;color:var(--gray);">'+(mins===0?'Just now':mins+'m ago')+'</div></div>';
      }).join('') : '<div style="font-size:13px;color:var(--gray);text-align:center;padding:8px;">No team members online.</div>';
    }

    // Update client activity preview
    var previewEl = document.getElementById('client-activity-preview');
    if (previewEl) {
      var recent = clientLog.filter(function(r){ return r.type==='login'; }).slice(0,5);
      previewEl.innerHTML = recent.length ? recent.map(function(r){
        var mins = Math.floor((now-new Date(r.time))/60000);
        var ago = mins<1?'Just now':mins<60?mins+'m ago':Math.floor(mins/60)+'h ago';
        return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #E2E8F0;font-size:12px;">' +
          '<span><strong>'+(r.name||r.id)+'</strong> logged in</span>' +
          '<span style="color:#6B7280;">'+ago+'</span></div>';
      }).join('') : '<div style="font-size:13px;color:#6B7280;text-align:center;padding:8px;">No client logins yet.</div>';
    }
  } catch(e) {}
}

// ── INIT ───────────────────────────────────────────────────────────

// ── MISSING FUNCTION IMPLEMENTATIONS ─────────────────────────────────
function seedClients() { /* clients load from Supabase — no seed needed */ }

function filterClients() {
  var s = (document.getElementById('client-search')||{}).value || '';
  var st = (document.getElementById('status-filter')||{}).value || '';
  loadClientsTable(s, st);
}

function closeModal() {
  document.querySelectorAll('.modal-overlay, .overlay, [id$="-modal"]').forEach(function(m){
    m.style.display='none';
    m.classList.remove('open');
  });
}

function flagEmployee(email) {
  if (confirm('Flag employee ' + email + ' for review?')) {
    alert('Employee flagged. Queen will be notified.');
  }
}

function lookupDisputeClient() {
  var val = (document.getElementById('dispute-client-search')||document.getElementById('dc-client-id')||{}).value || '';
  if (val) loadClientsTable(val);
}

function lookupPayClient() {
  var val = (document.getElementById('pay-client-search')||{}).value || '';
  if (val) loadClientsTable(val);
}

function selectPayment(type) {
  document.querySelectorAll('.payment-option').forEach(function(el){ el.classList.remove('selected'); });
  var el = document.getElementById('pay-' + type);
  if (el) el.classList.add('selected');
}

function refreshLiveActivity() {
  if (typeof loadWorkFeed === 'function') loadWorkFeed();
  if (typeof loadDashboard === 'function') loadDashboard();
}

function refreshQuotaMonitor() {
  if (typeof loadAll === 'function') loadAll();
}

function updateDisputeRefLabel() {
  var sel = document.getElementById('dispute-ref-type');
  var lbl = document.getElementById('dispute-ref-label');
  if (sel && lbl) lbl.textContent = sel.value === 'account' ? 'Account #' : 'Reference #';
}

function updateWpRefLabel() {
  var sel = document.getElementById('wp-ref-type');
  var lbl = document.getElementById('wp-ref-label');
  if (sel && lbl) lbl.textContent = sel.value === 'account' ? 'Account #' : 'Reference #';
}

function updateBureauQuota(val) {
  var el = document.getElementById('bureau-quota-display');
  if (el) el.textContent = val;
}

function logSalesQuota()     { if(typeof logWork==='function') logWork('Sales Quota Logged','Manual entry',null,null,1); }
function logFollowUpCheck()  { if(typeof logWork==='function') logWork('Follow-Up Checked','Manual entry',null,null,1); }
function logViolation()      { if(typeof logWork==='function') logWork('Violation Logged','Manual entry',null,null,1); }
function logCsResponse()     { if(typeof logWork==='function') logWork('CS Response Logged','Manual entry',null,null,1); }

function copyRCCredentials() {
  var text = 'RingCentral credentials — see Passwords page';
  navigator.clipboard.writeText(text).catch(function(){});
  alert('Credentials copied!');
}

function loadRCRecordings()  { alert('RingCentral recordings — connect via RingCentral app'); }
function syncRCCallLog()     { alert('Syncing RingCentral call log...'); if(typeof loadRingcentral==='function') loadRingcentral(); }
function testRCConnection()  { alert('Testing RingCentral connection...'); }
// ─────────────────────────────────────────────────────────────────────


// ── CLIENT VIEW / EDIT ───────────────────────────────────────────────
async function viewClient(clientId) {
  if (!clientId) return;
  // Remove existing modal
  var old = document.getElementById('client-view-modal');
  if (old) old.remove();

  // Create modal
  var overlay = document.createElement('div');
  overlay.id = 'client-view-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.innerHTML = '<div style="background:white;border-radius:14px;padding:24px;max-width:680px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
    '<h2 id="cvm-title" style="font-size:17px;font-weight:800;color:#1B3A6B;">Loading...</h2>' +
    '<button id="cvm-close" style="background:none;border:none;font-size:22px;cursor:pointer;color:#64748B;line-height:1;">&#10005;</button></div>' +
    '<div id="cvm-body"><div style="text-align:center;padding:32px;color:#94A3B8;">&#9203; Loading client...</div></div>' +
    '<div id="cvm-actions" style="display:flex;gap:8px;margin-top:18px;"></div></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#cvm-close').onclick = function(){ overlay.remove(); };
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };

  try {
    var r = await fetch('https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1/clients?id=eq.' + encodeURIComponent(clientId) + '&limit=1', {
      headers: {'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50'}
    });
    var data = await r.json();
    var c = Array.isArray(data) && data.length ? data[0] : null;
    if (!c) { document.getElementById('cvm-body').innerHTML = '<p style="color:red;text-align:center;padding:24px;">Client not found.</p>'; return; }

    document.getElementById('cvm-title').textContent = (c.name||'Unknown') + '  —  ' + c.id;

    var isCB = c.chargeback_status === 'Chargeback Filed';
    var html = '';
    if (isCB) html += '<div style="background:#FEE2E2;border:2px solid #7F1D1D;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-weight:800;color:#7F1D1D;font-size:13px;">&#128680; CHARGEBACK FILED — DO NOT WORK THIS FILE</div>';

    var fields = [
      ['Client ID', c.id||'—'], ['Full Name', c.name||'—'], ['Email', c.email||'—'],
      ['Phone', c.phone||'—'], ['Package', c.package||'Standard'], ['Status', c.status||'Active'],
      ['Start Date', c.start_date||'—'], ['Assigned To', c.assigned_to||'—'],
      ['Address', c.address||'—'], ['Notes', c.notes||'—']
    ];
    // Bureau logins section
    var hasLogins = c.experian_username || c.equifax_pin || c.smartcredit_username;
    if (hasLogins) {
      html += '<div style="margin-top:16px;padding:14px;background:#1B3A6B;border-radius:10px;color:white;">';
      html += '<div style="font-size:12px;font-weight:800;letter-spacing:1px;margin-bottom:10px;opacity:.7;">🔐 BUREAU LOGINS</div>';
      html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;font-size:12px;">';
      if(c.experian_username) html += '<div><div style="opacity:.6;font-size:10px;margin-bottom:2px;">EXPERIAN USER</div><div style="font-weight:700;">'+(c.experian_username||'—')+'</div></div>';
      if(c.experian_password) html += '<div><div style="opacity:.6;font-size:10px;margin-bottom:2px;">EXPERIAN PASS</div><div style="font-weight:700;">'+(c.experian_password||'—')+'</div></div>';
      if(c.equifax_pin) html += '<div><div style="opacity:.6;font-size:10px;margin-bottom:2px;">EXPERIAN PIN</div><div style="font-weight:700;">'+(c.equifax_pin||'—')+'</div></div>';
      if(c.smartcredit_username) html += '<div><div style="opacity:.6;font-size:10px;margin-bottom:2px;">SMART CREDIT USER</div><div style="font-weight:700;">'+(c.smartcredit_username||'—')+'</div></div>';
      if(c.smartcredit_password) html += '<div><div style="opacity:.6;font-size:10px;margin-bottom:2px;">SMART CREDIT PASS</div><div style="font-weight:700;">'+(c.smartcredit_password||'—')+'</div></div>';
      if(c.bureau_email) html += '<div><div style="opacity:.6;font-size:10px;margin-bottom:2px;">BUREAU EMAIL</div><div style="font-weight:700;">'+(c.bureau_email||'—')+'</div></div>';
      html += '</div></div>';
    }
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
    fields.forEach(function(f) {
      html += '<div style="background:#F8FAFC;border-radius:8px;padding:10px 12px;">' +
        '<div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">' + f[0] + '</div>' +
        '<div style="font-size:13px;font-weight:600;color:#1E293B;word-break:break-word;">' + (f[1]||'—') + '</div></div>';
    });
    html += '</div>';
    document.getElementById('cvm-body').innerHTML = html;

    var acts = document.getElementById('cvm-actions');
    if (!isCB) {
      var btn1 = document.createElement('button');
      btn1.textContent = 'Open in CS Dashboard';
      btn1.style.cssText = 'padding:9px 16px;background:#166534;color:white;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;';
      btn1.onclick = function(){ window.open('cs-dashboard.html?client=' + encodeURIComponent(c.id), '_blank'); };
      acts.appendChild(btn1);
    }
    var btn2 = document.createElement('button');
    btn2.textContent = 'Close';
    btn2.style.cssText = 'padding:9px 16px;background:#F1F5F9;color:#374151;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;';
    btn2.onclick = function(){ overlay.remove(); };
    acts.appendChild(btn2);

  } catch(e) {
    document.getElementById('cvm-body').innerHTML = '<p style="color:red;text-align:center;padding:24px;">Error: ' + e.message + '</p>';
  }
}

function editClient(id) {
  window.open('client-manager.html?search=' + encodeURIComponent(id), '_blank');
}

function deleteClient(id) {
  if (currentRole !== 'admin') { alert('Only Jason can delete clients.'); return; }
  if (!confirm('DELETE client ' + id + '? This cannot be undone.')) return;
  fetch('https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1/clients?id=eq.' + encodeURIComponent(id), {
    method: 'DELETE',
    headers: {'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50','Prefer':'return=minimal'}
  }).then(function(r) {
    if (r.ok || r.status === 204) { alert('Client ' + id + ' deleted.'); loadClientsTable(); }
    else alert('Error deleting client.');
  }).catch(function(e) { alert('Network error: ' + e.message); });
}

function togglePwdVisibility() {
  var inp = document.getElementById('admin-pass');
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
}
// ─────────────────────────────────────────────────────────────────────

window.addEventListener('load', function() {
  // Only show login if no valid session
  var savedEmail = localStorage.getItem('cp_logged_in_user') || '';
  var hasSession = savedEmail && EMPLOYEES[savedEmail];
  if (!hasSession) {
    var ls  = document.getElementById('login-screen');
    var appEl = document.getElementById('app');
    if (ls) ls.style.display = 'flex';
    if (appEl) appEl.style.display = 'none';
  }
  document.querySelectorAll('.page').forEach(function(p){ p.style.display='none'; });

  // Seed initial clients
  seedClients();

  // Wire eye icon
  var passInput = document.getElementById('admin-pass');
  if (passInput) {
    var eyeBtn = passInput.parentNode ? passInput.parentNode.querySelector('button') : null;
    if (eyeBtn) { eyeBtn.id='pwd-toggle-btn'; eyeBtn.onclick=togglePwdVisibility; }
  }

  // Enter key
  var emailEl = document.getElementById('admin-email');
  var passEl  = document.getElementById('admin-pass');
  if (emailEl) emailEl.addEventListener('keydown', function(e){ if(e.key==='Enter') loginAdmin(); });
  if (passEl)  passEl.addEventListener('keydown',  function(e){ if(e.key==='Enter') loginAdmin(); });

  // Refresh every 60 seconds
  setInterval(function(){
    if (currentUser) {
      trackTeamSession();
      loadActivityLog();
    }
  }, 60000);
});


// ── MISSING FUNCTIONS ADDED ─────────────────────────────────────

function switchTab(tabGroup, tabName) {
  // Hide all tabs in this group
  document.querySelectorAll('[data-tab-group="' + tabGroup + '"]').forEach(function(el) {
    el.style.display = 'none';
  });
  // Show selected tab
  var target = document.getElementById(tabGroup + '-' + tabName);
  if (target) target.style.display = 'block';
  // Update tab buttons
  document.querySelectorAll('[data-tab-group-btn="' + tabGroup + '"]').forEach(function(btn) {
    btn.classList.remove('active');
  });
  var activeBtn = document.querySelector('[data-tab-group-btn="' + tabGroup + '"][data-tab="' + tabName + '"]');
  if (activeBtn) activeBtn.classList.add('active');
}

async function renderPwdTable() {
  var el = document.getElementById('pwd-list');
  if (!el) return;
  el.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:16px;color:#64748B;">Loading...</td></tr>';
  try {
    var r = await fetch('https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1/clients?select=id,name,email,portal_pwd&order=name.asc&limit=500', {
      headers: {'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50'}
    });
    var data = await r.json();
    if (!Array.isArray(data) || !data.length) {
      el.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:16px;color:#64748B;">No clients found.</td></tr>';
      return;
    }
    el.innerHTML = data.map(function(c) {
      return '<tr>' +
        '<td>' + (c.id||'') + '</td>' +
        '<td>' + (c.name||'') + '</td>' +
        '<td>' + (c.email||'') + '</td>' +
        '<td><code>' + (c.portal_pwd||'restore2026') + '</code></td>' +
      '</tr>';
    }).join('');
  } catch(e) {
    el.innerHTML = '<tr><td colspan="4" style="color:#8B1A1A;padding:16px;">Error: ' + e.message + '</td></tr>';
  }
}

function renderSalesTab(tab) {
  document.querySelectorAll('.sales-tab-content').forEach(function(el) { el.style.display='none'; });
  var target = document.getElementById('sales-' + tab);
  if (target) target.style.display = 'block';
  document.querySelectorAll('.tab-btn').forEach(function(btn) { btn.classList.remove('active'); });
  var activeBtn = document.querySelector('.tab-btn[data-tab="' + tab + '"]');
  if (activeBtn) activeBtn.classList.add('active');
}

function openDisputeModal(id) {
  var modal = document.getElementById('dispute-modal');
  if (modal) modal.style.display = 'flex';
}

function closeDisputeModal() {
  var modal = document.getElementById('dispute-modal');
  if (modal) modal.style.display = 'none';
}

function openEditModal(id) {
  var modal = document.getElementById('edit-modal');
  if (modal) modal.style.display = 'flex';
}

function closeEdit() {
  var modal = document.getElementById('edit-modal');
  if (modal) modal.style.display = 'none';
}


// ── SESSION RESTORE + DASHBOARD INIT ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Restore session from localStorage
  var savedEmail = sessionStorage.getItem('cp_logged_in_user') || localStorage.getItem('cp_logged_in_user') || '';
  var savedName  = sessionStorage.getItem('cp_logged_in_name') || localStorage.getItem('cp_logged_in_name') || '';
  var savedLabel = sessionStorage.getItem('cp_logged_in_label') || localStorage.getItem('cp_logged_in_label') || '';
  var savedRole  = sessionStorage.getItem('cp_logged_in_role') || localStorage.getItem('cp_logged_in_role') || '';
  var savedInit  = sessionStorage.getItem('cp_logged_in_initials') || localStorage.getItem('cp_logged_in_initials') || '';
  if (savedEmail && EMPLOYEES[savedEmail]) {
    var emp = EMPLOYEES[savedEmail];
    currentUser = savedEmail;
    currentRole = emp.role || savedRole;

    var loginScreen = document.getElementById('login-screen');
    var appEl = document.getElementById('app');
    if (loginScreen) loginScreen.style.display = 'none';
    if (appEl) appEl.style.display = 'block';

    // Set all header elements
    var s = function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
    s('hdr-name', emp.name);
    s('hdr-role', emp.label + ' — CP Restoration Services');
    s('hdr-avatar', emp.initials || savedInit);
    s('current-user-name', emp.name);
    s('current-user-role', emp.label);

    // Show/hide admin-only elements
    document.querySelectorAll('.admin-only').forEach(function(el){
      el.style.display = emp.role==='admin' ? '' : 'none';
    });

    showPage('dashboard');
    if (typeof loadDashboard === 'function') loadDashboard();
    if (typeof startClock === 'function') startClock();
    if (typeof trackTeamSession === 'function') trackTeamSession();
  }

  // Set today's date on any date fields
  var today = new Date().toISOString().split('T')[0];
  ['emp-esign1-date','emp-esign2-date'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value=today;
  });
});

// ── LOAD DASHBOARD DATA ────────────────────────────────────────────────────
async function loadDashboardData() {
  var SUPA = 'https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50';
  var HDR = {'apikey':KEY,'Authorization':'Bearer '+KEY};

  try {
    // Load client counts
    var r = await fetch(SUPA+'/clients?select=id,status,package,start_date',{headers:HDR});
    var clients = await r.json();
    if (!Array.isArray(clients)) throw new Error('Bad response');
    var active = clients.filter(function(c){
      var s = (c.status||'').toLowerCase();
      return s !== 'inactive' && s !== 'cancelled' && s !== 'canceled' && s !== 'refunded' && s !== 'closed';
    });
    var express = active.filter(function(c){return (c.package||'').toLowerCase().includes('express');});
    var standard = active.filter(function(c){return !((c.package||'').toLowerCase().includes('express'));});
    var setEl = function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
    setEl('total-active', active.length);
    setEl('express-clients', express.length);
    setEl('standard-clients', standard.length);
    setEl('financing-clients', '0');
    // Backlog — active clients with no recent dispute
    var today = new Date();
    var backlog = active.filter(function(c){
      if (!c.last_dispute_date) return true;
      var d = new Date(c.last_dispute_date);
      return (today-d)/(1000*60*60*24) > 30;
    });
    setEl('backlog-count', backlog.length);
    setEl('overdue-count', '0');
  } catch(e) { console.error('Dashboard stats error:', e.message); }

  // Load active team from time_sessions
  try {
    var today2 = new Date().toISOString().split('T')[0];
    var r2 = await fetch(SUPA+'/time_sessions?select=employee_name,status,clock_in&date=eq.'+today2+'&order=clock_in.desc',{headers:HDR});
    var sessions = await r2.json();
    var tbody = document.getElementById('active-team-tbody');
    if (tbody && Array.isArray(sessions) && sessions.length > 0) {
      var seen = {};
      var rows = sessions.filter(function(s){
        if(seen[s.employee_name]) return false;
        seen[s.employee_name] = true; return true;
      }).map(function(s){
        var statusBadge = s.status==='active'
          ? '<span style="background:#DCFCE7;color:#166534;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">Online</span>'
          : '<span style="background:#F1F5F9;color:#475569;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">Away</span>';
        return '<tr><td><strong>'+s.employee_name+'</strong></td><td>CS Agent</td><td>'+statusBadge+'</td><td>—</td><td>—</td></tr>';
      }).join('');
      tbody.innerHTML = rows;
    } else if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:12px;color:#64748B;">No team members clocked in today.</td></tr>';
    }
  } catch(e) { console.error('Team load error:', e.message); }

  // Load recent activity
  try {
    var actEl = document.getElementById('live-activity-feed');
    if (!actEl) actEl = document.querySelector('[id*="activity"]');
    if (actEl) {
      var r3 = await fetch(SUPA+'/time_sessions?select=employee_name,clock_in,status&order=clock_in.desc&limit=10',{headers:HDR});
      var acts = await r3.json();
      if (Array.isArray(acts) && acts.length > 0) {
        actEl.innerHTML = acts.map(function(a){
          var t = a.clock_in ? new Date(a.clock_in).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : '';
          return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F1F5F9;">' +
            '<div style="width:8px;height:8px;border-radius:50%;background:'+(a.status==='active'?'#22C55E':'#94A3B8')+';flex-shrink:0;"></div>' +
            '<div style="font-size:13px;"><strong>'+a.employee_name+'</strong> clocked '+(a.status==='active'?'in':'out')+' at '+t+'</div>' +
          '</div>';
        }).join('');
      } else {
        actEl.innerHTML = '<div style="font-size:13px;color:#64748B;">No activity today yet.</div>';
      }
    }
  } catch(e) { console.error('Activity error:', e.message); }

  // Load revenue from sales table
  try {
    var today3 = new Date().toISOString().split('T')[0];
    var r4 = await fetch(SUPA+'/sales?select=amount,commission,package&created_at=gte.'+today3+'T00:00:00',{headers:HDR});
    var sales = await r4.json();
    if (Array.isArray(sales) && sales.length > 0) {
      var totalRev = sales.reduce(function(s,sale){return s+(parseFloat(sale.amount)||0);},0);
      var totalComm = sales.reduce(function(s,sale){return s+(parseFloat(sale.commission)||0);},0);
      var fmt = function(n){return '$'+n.toLocaleString('en-US',{minimumFractionDigits:0});};
      var setEl2 = function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
      setEl2('revenue-today', fmt(totalRev));
      setEl2('sales-count', sales.length+' sale'+(sales.length!==1?'s':''));
      setEl2('commission-owed', fmt(totalComm));
    }
  } catch(e) { console.error('Revenue error:', e.message); }
}


var _SUPA = 'https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1';
var _KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50';
var _H    = {'apikey':_KEY,'Authorization':'Bearer '+_KEY};

function _set(id,v){ var e=document.getElementById(id); if(e) e.innerHTML=v; }
function _txt(id,v){ var e=document.getElementById(id); if(e) e.textContent=v; }
function _$( n){ return '$'+(parseFloat(n)||0).toLocaleString('en-US',{minimumFractionDigits:0}); }

function _tbl(selectors) {
  for (var i=0; i<selectors.length; i++) {
    var el = document.querySelector(selectors[i]);
    if (el) return el;
  }
  return null;
}

async function loadTimetracker() {
  try {
    var r = await fetch(_SUPA+'/time_sessions?order=clock_in.desc&limit=100',{headers:_H});
    var d = await r.json();
    if (!Array.isArray(d)) return;
    var tb = _tbl(['#tt-log-tbody','#page-timetracker tbody','[id*=timetracker] tbody']);
    if (!tb) return;
    tb.innerHTML = d.length ? d.map(function(s){
      var dur='';
      if(s.clock_in&&s.clock_out){var m=Math.round((new Date(s.clock_out)-new Date(s.clock_in))/60000);dur=Math.floor(m/60)+'h '+(m%60)+'m';}
      var ci=s.clock_in?new Date(s.clock_in).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}):'';
      var co=s.clock_out?new Date(s.clock_out).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}):'Active';
      return '<tr><td>'+(s.employee_name||'')+'</td><td>'+(s.date||'')+'</td><td>'+ci+'</td><td>'+co+'</td><td>'+dur+'</td><td>'+(s.status||'')+'</td></tr>';
    }).join('') : '<tr><td colspan="6" style="text-align:center;padding:16px;color:#64748B;">No time entries yet.</td></tr>';
  } catch(e){console.error('loadTimetracker:',e.message);}
}

async function loadPayments() {
  try {
    var r = await fetch(_SUPA+'/payments?order=created_at.desc&limit=100',{headers:_H});
    var d = await r.json();
    if (!Array.isArray(d)) d=[];
    _txt('payments-pending-count', d.filter(function(p){return p.status==='pending';}).length);
    var tb = _tbl(['#payments-tbody','#page-payments tbody']);
    if (!tb) return;
    tb.innerHTML = d.length ? d.map(function(p){
      return '<tr><td>'+(p.client_name||p.client_id||'')+'</td><td>'+_$(p.amount)+'</td><td>'+(p.type||'')+'</td><td>'+(p.status||'')+'</td><td>'+(p.created_at?new Date(p.created_at).toLocaleDateString():'')+'</td></tr>';
    }).join('') : '<tr><td colspan="5" style="text-align:center;padding:16px;color:#64748B;">No payments on file.</td></tr>';
  } catch(e){console.error('loadPayments:',e.message);}
}

async function loadCompliance() {
  try {
    var r = await fetch(_SUPA+'/clients?select=id,name,status,start_date,package&order=name.asc&limit=500',{headers:_H});
    var d = await r.json();
    if (!Array.isArray(d)) d=[];
    var today=new Date();
    var exp=d.filter(function(c){return c.end_date&&(new Date(c.end_date)-today)/(86400000)<=30;});
    _txt('compliance-expiring-count', exp.length);
    _txt('compliance-active-count', d.length);
    var tb = _tbl(['#compliance-tbody','#page-compliance tbody']);
    if (!tb) return;
    tb.innerHTML = exp.length ? exp.map(function(c){
      var days=Math.round((new Date(c.end_date)-today)/86400000);
      var color=days<=0?'#8B1A1A':'#F59E0B';
      return '<tr><td>'+c.id+'</td><td>'+(c.name||'')+'</td><td>'+(c.package||'Standard')+'</td><td>'+(c.end_date||'')+'</td><td style="color:'+color+';font-weight:700;">'+(days<=0?'EXPIRED':days+' days')+'</td></tr>';
    }).join('') : '<tr><td colspan="5" style="text-align:center;padding:16px;color:#64748B;">No contracts expiring within 30 days.</td></tr>';
  } catch(e){console.error('loadCompliance:',e.message);}
}

async function loadReports() {
  try {
    var r = await fetch(_SUPA+'/clients?select=id,status,package',{headers:_H});
    var d = await r.json();
    if (!Array.isArray(d)) d=[];
    var active=d.filter(function(c){return c.status==='Active';});
    _txt('report-total-clients', d.length);
    _txt('report-active-clients', active.length);
    _txt('report-express-clients', active.filter(function(c){return (c.package||'').toLowerCase().includes('express');}).length);
    _txt('report-standard-clients', active.filter(function(c){return !(c.package||'').toLowerCase().includes('express');}).length);
  } catch(e){console.error('loadReports:',e.message);}
}

async function loadTraining() {
  try {
    var r = await fetch(_SUPA+'/training_results?order=completed_at.desc&limit=100',{headers:_H});
    var d = await r.json();
    if (!Array.isArray(d)) d=[];
    var tb = _tbl(['#training-results-tbody','#page-training tbody']);
    if (!tb) return;
    tb.innerHTML = d.length ? d.map(function(t){
      var p=t.passed?'<span style="color:#166534;font-weight:700;">PASS</span>':'<span style="color:#8B1A1A;font-weight:700;">FAIL</span>';
      return '<tr><td>'+(t.employee_name||'')+'</td><td>'+(t.work_email||'')+'</td><td>'+(t.score||0)+'/'+(t.total||10)+'</td><td>'+(t.percentage||0)+'%</td><td>'+p+'</td><td>'+(t.completed_at?new Date(t.completed_at).toLocaleDateString():'')+'</td></tr>';
    }).join('') : '<tr><td colspan="6" style="text-align:center;padding:16px;color:#64748B;">No quiz results yet.</td></tr>';
  } catch(e){console.error('loadTraining:',e.message);}
}

function loadBroadcast(){}
function loadSms(){}
function loadSendgrid(){}
function loadRingcentral(){
  var el=document.getElementById('rc-log')||document.querySelector('#page-ringcentral p');
  if(el) el.innerHTML='Call log available at <a href="/phone.html" target="_blank" style="color:#1B3A6B;font-weight:700;">Phone System</a>';
}
async function loadPasswords(){ if(typeof renderPwdTable==='function') renderPwdTable(); }

var _pageLoaders = {
  timetracker: loadTimetracker,
  payments:    loadPayments,
  compliance:  loadCompliance,
  reports:     loadReports,
  training:    loadTraining,
  broadcast:   loadBroadcast,
  sms:         loadSms,
  passwords:   loadPasswords,
  sendgrid:    loadSendgrid,
  ringcentral: loadRingcentral,
  dashboard:   function(){ if(typeof loadDashboard==='function') loadDashboard(); },
  clients:     function(){ loadClientsTable(); },
  disputes:    function(){ if(typeof loadDisputes==='function') loadDisputes(); },
  bureau:      function(){ if(typeof loadBureau==='function') loadBureau(); },
  sales:       function(){ if(typeof loadSales==='function') loadSales(); },
  applications:function(){ if(typeof loadApplications==='function') loadApplications(); }
};

// Page loader trigger — called from showPage in index.html
// We do NOT override showPage to avoid infinite recursion.
// Instead index.html's showPage calls _triggerPageLoader after showing the page.
function _triggerPageLoader(page) {
  if (_pageLoaders[page]) {
    setTimeout(function(){ try{ _pageLoaders[page](); }catch(e){console.error('loader:',page,e.message);} }, 150);
  }
}

// Hook: patch showPage safely using a flag to prevent recursion
var _showPagePatched = false;
function _patchShowPage() {
  if (_showPagePatched) return;
  if (typeof showPage !== 'function') return;
  _showPagePatched = true;
  var _orig = showPage;
  showPage = function(page) {
    _orig(page);
    _triggerPageLoader(page);
  };
}
// Try to patch after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _patchShowPage);
} else {
  setTimeout(_patchShowPage, 500);
}


// ── TIME TRACKER ────────────────────────────────────────────────
var _clockedIn = false;
var _clockInTime = null;

function clockIn() {
  var emp = sessionStorage.getItem('cp_logged_in_name') || 'Unknown';
  var role = sessionStorage.getItem('cp_logged_in_role') || 'Staff';
  _clockedIn = true;
  _clockInTime = new Date();
  var btn = document.getElementById('tt-clockin-btn');
  var outBtn = document.getElementById('tt-clockout-btn');
  var status = document.getElementById('tt-status');
  if (btn) btn.disabled = true;
  if (outBtn) outBtn.disabled = false;
  if (status) status.textContent = 'Clocked in at ' + _clockInTime.toLocaleTimeString();
  // Save to Supabase
  fetch('https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1/time_entries', {
    method: 'POST',
    headers: {'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50','Content-Type':'application/json','Prefer':'return=minimal'},
    body: JSON.stringify({
      employee_name: emp, role: role,
      clock_in: _clockInTime.toISOString(),
      date: _clockInTime.toISOString().split('T')[0]
    })
  }).then(function(r) {
    if (r.ok) console.log('Clock in saved');
  }).catch(function(e) { console.error('Clock in error:', e); });
  alert('✅ Clocked in at ' + _clockInTime.toLocaleTimeString());
}

function clockOut() {
  if (!_clockedIn) { alert('You are not clocked in.'); return; }
  var now = new Date();
  var hours = ((now - _clockInTime) / 3600000).toFixed(2);
  _clockedIn = false;
  var btn = document.getElementById('tt-clockin-btn');
  var outBtn = document.getElementById('tt-clockout-btn');
  var status = document.getElementById('tt-status');
  if (btn) btn.disabled = false;
  if (outBtn) outBtn.disabled = true;
  if (status) status.textContent = 'Clocked out. Hours worked: ' + hours;
  alert('✅ Clocked out. Hours worked today: ' + hours);
}

// ── PAYMENTS ────────────────────────────────────────────────────
function processPayment() {
  var clientEl = document.getElementById('pay-client-select') || document.getElementById('pay-client');
  var amtEl = document.getElementById('pay-amount');
  var methodEl = document.getElementById('pay-method');
  var noteEl = document.getElementById('pay-note');
  var client = clientEl ? clientEl.value : '';
  var amount = amtEl ? amtEl.value : '';
  var method = methodEl ? methodEl.value : '';
  var note = noteEl ? noteEl.value : '';
  if (!client || !amount) { alert('Please select a client and enter an amount.'); return; }
  var emp = sessionStorage.getItem('cp_logged_in_name') || 'Unknown';
  fetch('https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1/payments', {
    method: 'POST',
    headers: {'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50','Content-Type':'application/json','Prefer':'return=minimal'},
    body: JSON.stringify({
      client_id: client, amount: parseFloat(amount),
      payment_method: method, notes: note,
      recorded_by: emp, recorded_at: new Date().toISOString()
    })
  }).then(function(r) {
    if (r.ok) { alert('✅ Payment of $' + amount + ' recorded successfully.'); if (amtEl) amtEl.value=''; if (noteEl) noteEl.value=''; }
    else { alert('❌ Error saving payment. Please try again.'); }
  }).catch(function(e) { alert('❌ Network error: ' + e.message); });
}

// ── DISPUTES TABLE ───────────────────────────────────────────────
async function loadDisputesTable() {
  var tbody = document.getElementById('disputes-table');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray);padding:32px;">Loading dispute files...</td></tr>';
  try {
    var r = await fetch('https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1/disputes?order=filed_at.desc&limit=200', {
      headers: {'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50'}
    });
    var disputes = await r.json();
    if (!Array.isArray(disputes) || !disputes.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray);padding:32px;">No dispute files found.</td></tr>';
      // Update stats
      var s = function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
      s('open-files','0'); s('backlog-90','0'); s('completed-month','0');
      return;
    }
    var now = new Date();
    var monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
    var ninetyAgo = new Date(now - 90*24*60*60*1000);
    var open = disputes.filter(function(d){ return (d.status||'open').toLowerCase() !== 'completed'; });
    var backlog = open.filter(function(d){ return d.filed_at && new Date(d.filed_at) < ninetyAgo; });
    var completed = disputes.filter(function(d){ return d.status === 'completed' && d.filed_at && new Date(d.filed_at) >= monthAgo; });
    var s = function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
    s('open-files', open.length);
    s('backlog-90', backlog.length);
    s('completed-month', completed.length);
    tbody.innerHTML = disputes.map(function(d) {
      var date = d.filed_at ? new Date(d.filed_at).toLocaleDateString() : '—';
      var status = d.status || 'Open';
      var statusColor = status.toLowerCase()==='completed' ? 'var(--green)' : status.toLowerCase()==='pending' ? 'var(--gold)' : 'var(--blue)';
      return '<tr>' +
        '<td style="font-size:12px;">' + (d.client_id||'—') + '</td>' +
        '<td style="font-weight:600;">' + (d.client_name||'—') + '</td>' +
        '<td style="font-size:12px;">' + (d.bureaus||d.bureau||'—') + '</td>' +
        '<td style="font-size:12px;">' + (d.items_count||d.bureaus_count||'—') + '</td>' +
        '<td style="font-size:12px;">' + date + '</td>' +
        '<td style="font-size:12px;">' + (d.specialist||d.assigned_to||'—') + '</td>' +
        '<td><span style="background:' + statusColor + '22;color:' + statusColor + ';padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">' + status + '</span></td>' +
        '<td style="font-size:12px;">' + (d.notes||'—').substring(0,40) + '</td>' +
      '</tr>';
    }).join('');
  } catch(e) {
    var tbody2 = document.getElementById('disputes-table');
    if (tbody2) tbody2.innerHTML = '<tr><td colspan="8" style="text-align:center;color:red;padding:32px;">Error loading disputes: ' + e.message + '</td></tr>';
  }
}

// ── SALES PAGE ───────────────────────────────────────────────────
var _salesPeriod = 'month';
function setSalesPeriod(period) {
  _salesPeriod = period;
  document.querySelectorAll('.sales-period-btn').forEach(function(b){ b.classList.remove('active'); });
  var btn = document.getElementById('sp-'+period);
  if (btn) btn.classList.add('active');
  loadSalesData();
}

async function loadSalesData() {
  try {
    var now = new Date();
    var from;
    if (_salesPeriod==='day') from = new Date(now.getFullYear(),now.getMonth(),now.getDate());
    else if (_salesPeriod==='week') { var d=now.getDay(); from = new Date(now - d*86400000); }
    else from = new Date(now.getFullYear(),now.getMonth(),1);
    var r = await fetch('https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1/clients?select=id,name,package,start_date,referred_by&start_date=gte.'+from.toISOString().split('T')[0]+'&limit=500', {
      headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50'}
    });
    var clients = await r.json();
    if (!Array.isArray(clients)) clients = [];
    var el = document.getElementById('sales-summary');
    if (el) el.textContent = clients.length + ' new clients in this period';
  } catch(e) { console.error('Sales data error:', e); }
}

function showSalesTab(tab) {
  document.querySelectorAll('.sales-tab-btn').forEach(function(b){ b.classList.remove('active'); });
  document.querySelectorAll('.sales-tab-pane').forEach(function(p){ p.style.display='none'; });
  var pane = document.getElementById('sales-tab-'+tab);
  if (pane) pane.style.display='block';
  var btns = document.querySelectorAll('[onclick*="showSalesTab"]');
  btns.forEach(function(b){ if ((b.getAttribute('onclick')||'').includes("'"+tab+"'")) b.classList.add('active'); });
  if (tab==='rep') loadSalesRep();
  if (tab==='leads') loadLeadTracker();
  if (tab==='diallog') loadDialLog();
}

async function loadSalesRep() {
  var el = document.getElementById('sales-rep-table');
  if (!el) return;
  el.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--gray);">Loading...</td></tr>';
  try {
    var r = await fetch('https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1/clients?select=referred_by,package&limit=500', {
      headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50'}
    });
    var clients = await r.json();
    if (!Array.isArray(clients)) { el.innerHTML='<tr><td colspan="4">No data.</td></tr>'; return; }
    var reps = {};
    clients.forEach(function(c) {
      var rep = c.referred_by || 'Unassigned';
      if (!reps[rep]) reps[rep] = {count:0};
      reps[rep].count++;
    });
    el.innerHTML = Object.entries(reps).sort(function(a,b){return b[1].count-a[1].count;}).map(function(e){
      return '<tr><td>'+e[0]+'</td><td>'+e[1].count+'</td><td>—</td><td>—</td></tr>';
    }).join('') || '<tr><td colspan="4" style="text-align:center;padding:20px;">No rep data found.</td></tr>';
  } catch(e) { el.innerHTML='<tr><td colspan="4" style="color:red;">Error: '+e.message+'</td></tr>'; }
}

async function loadLeadTracker() {
  var el = document.getElementById('lead-tracker-list');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--gray);padding:20px;text-align:center;">Loading leads...</div>';
  try {
    var r = await fetch('https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1/leads?order=created_at.desc&limit=100', {
      headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50'}
    });
    var leads = await r.json();
    if (!Array.isArray(leads) || !leads.length) { el.innerHTML='<div style="color:var(--gray);padding:20px;text-align:center;">No leads found.</div>'; return; }
    el.innerHTML = leads.map(function(l){
      return '<div style="padding:10px;border-bottom:1px solid var(--border);font-size:13px;">'+
        '<strong>'+(l.name||l.first_name||'Unknown')+'</strong> — '+(l.email||'')+'<br>'+
        '<span style="color:var(--gray);font-size:11px;">'+(l.source||'')+'  '+(l.created_at?new Date(l.created_at).toLocaleDateString():'')+'</span></div>';
    }).join('');
  } catch(e) { el.innerHTML='<div style="color:red;padding:20px;">Error: '+e.message+'</div>'; }
}

async function loadDialLog() {
  var el = document.getElementById('dial-log-list');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--gray);padding:20px;text-align:center;">Loading dial log...</div>';
  try {
    var r = await fetch('https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1/call_log?order=created_at.desc&limit=100', {
      headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50'}
    });
    var calls = await r.json();
    if (!Array.isArray(calls) || !calls.length) { el.innerHTML='<div style="color:var(--gray);padding:20px;text-align:center;">No calls logged yet.</div>'; return; }
    el.innerHTML = calls.map(function(c){
      return '<div style="padding:10px;border-bottom:1px solid var(--border);font-size:13px;">'+
        '<strong>'+(c.contact_name||c.client_name||'Unknown')+'</strong> — '+(c.outcome||c.status||'Called')+'<br>'+
        '<span style="color:var(--gray);font-size:11px;">'+(c.agent||c.rep||'')+'  '+(c.created_at?new Date(c.created_at).toLocaleDateString():'')+'</span></div>';
    }).join('');
  } catch(e) { el.innerHTML='<div style="color:red;padding:20px;">Error: '+e.message+'</div>'; }
}async function loadClients(s,st,cat){ loadClientsTable(s,st,cat); }
async function loadClientsTable(search, status, category) {
  var tbody = document.getElementById('clients-table') || document.getElementById('clients-tbody');
  if (!tbody) return;
  var s = ((search || (document.getElementById('client-search')||{}).value || '')).toLowerCase().trim();
  var st = status || (document.getElementById('status-filter')||{}).value || '';
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748B;padding:24px;">&#9203; Loading clients...</td></tr>';
  try {
    var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50';
    var SUPA = 'https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1';
    var HDR = {'apikey':KEY,'Authorization':'Bearer '+KEY};
    var url;
    if (s && s.length >= 2) {
      var enc = encodeURIComponent(s);
      url = SUPA+'/clients?or=(name.ilike.*'+enc+'*,id.ilike.*'+enc+'*,email.ilike.*'+enc+'*,phone.ilike.*'+enc+'*)&order=name.asc&limit=200';
    } else {
      url = SUPA+'/clients?order=name.asc&limit=1000';
    }
    var r = await fetch(url, {headers:HDR});
    if (!r.ok) throw new Error('HTTP '+r.status);
    var clients = await r.json();
    if (!Array.isArray(clients)) throw new Error('Bad response');
    if (st) clients = clients.filter(function(c){ return (c.status||'Active')===st; });
    if (!clients.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94A3B8;padding:32px;">No clients found.</td></tr>';
      return;
    }
    tbody.innerHTML = clients.map(function(c) {
      var isCB = c.chargeback_status === 'Chargeback Filed';
      var rowStyle = isCB ? 'background:#FEE2E2;border-left:4px solid #7F1D1D;' : '';
      var stColor = c.status==='Active'?'#166534':c.status==='Paused'?'#92400E':c.status==='Cancelled'?'#991B1B':'#1B3A6B';
      var stBg = c.status==='Active'?'#DCFCE7':c.status==='Paused'?'#FEF3C7':c.status==='Cancelled'?'#FEE2E2':'#DBEAFE';
      var cid = (c.id||'').replace(/'/g,"");
      return '<tr style="'+rowStyle+'">' +
        '<td style="font-size:12px;font-family:monospace;font-weight:700;color:#1B3A6B;">'+(c.id||'')+'</td>' +
        '<td><div style="font-weight:700;">'+(c.name||'')+'</div>'+
          (isCB?'<div style="font-size:10px;color:#7F1D1D;font-weight:800;">&#128680; CHARGEBACK &#8212; DO NOT WORK</div>':'')+
          '<div style="font-size:11px;color:#64748B;">'+(c.start_date||'')+'</div></td>' +
        '<td style="font-size:12px;">'+(c.package||c.category||'Standard')+'</td>' +
        '<td><span style="background:'+stBg+';color:'+stColor+';padding:3px 10px;border-radius:10px;font-size:11px;font-weight:700;">'+(c.status||'Active')+'</span></td>' +
        '<td style="font-size:12px;">'+(c.deadline||c.target_date||'&#8212;')+'</td>' +
        '<td style="font-size:12px;">'+(c.last_dispute_date||'&#8212;')+'</td>' +
        '<td style="display:flex;gap:6px;"><button onclick="viewClient(\'' +cid+ '\')" style="padding:4px 10px;background:#1B3A6B;color:white;border:none;border-radius:6px;font-size:11px;cursor:pointer;">View</button>' +
          (currentRole==='admin'?'<button onclick="deleteClient(\'' +cid+ '\')" style="padding:4px 8px;background:#FEE2E2;color:#991B1B;border:none;border-radius:6px;font-size:11px;cursor:pointer;">&#10005;</button>':'') +
        '</td>' +
      '</tr>';
    }).join('');
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="7" style="color:red;text-align:center;padding:24px;">&#10060; Error: '+e.message+'</td></tr>';
    console.error('[CM] loadClientsTable error:', e);
  }
}


var allApplications = [];

// ── EMPLOYEE APPLICATIONS ─────────────────────────────────────
async function loadApplications() {
  var loading = document.getElementById('apps-loading');
  var wrap = document.getElementById('apps-table-wrap');
  if(loading){loading.style.display='block';loading.textContent='Loading applications...';}
  if(wrap) wrap.style.display='none';
  try {
    var KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50';
    var r = await fetch('https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1/employee_onboarding?select=id,firstName,lastName,email,workEmail,phone,timezone,paymentMethod,paymentInfo,source,comments,submittedAt,dob,idType,ecName,ecPhone,internetSpeed&id=gte.1&order=id.desc&limit=50',
      {headers:{'apikey':KEY,'Authorization':'Bearer '+KEY}});
    var data = await r.json();
    if(!Array.isArray(data)) throw new Error(JSON.stringify(data).substring(0,100));
    // Sort by submittedAt descending client-side (avoids DB timeout)
    var sorted = data.sort(function(a,b){
      var da = a.submittedAt||a.created_at||'';
      var db = b.submittedAt||b.created_at||'';
      return db.localeCompare(da);
    });
    // Deduplicate — keep only most recent submission per email
    var seen = {};
    allApplications = sorted.filter(function(a){
      var key = (a.email||a.workEmail||a.firstName+a.lastName||'').toLowerCase().trim();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
    var pending=data.filter(function(a){return !a.app_status||a.app_status==='pending';}).length;
    var approved=data.filter(function(a){return a.app_status==='approved';}).length;
    var declined=data.filter(function(a){return a.app_status==='declined';}).length;
    var s=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
    s('apps-count-pending',pending);s('apps-count-approved',approved);
    s('apps-count-declined',declined);s('apps-count-total',data.length);
    if(typeof renderApplications==='function') renderApplications();
    if(loading) loading.style.display='none';
    if(wrap) wrap.style.display='block';
  } catch(e) {
    if(loading){loading.style.display='block';loading.textContent='Error: '+e.message;}
    console.error('[Apps]',e);
  }
}

function renderApplications() {
  var loading = document.getElementById('apps-loading');
  var wrap = document.getElementById('apps-table-wrap');
  var tbody = document.getElementById('apps-table-body');
  if(loading) loading.style.display = 'none';
  if(wrap) wrap.style.display = 'block';
  // Use app_status (actual DB field) not status
  var pending = allApplications.filter(function(a){return !a.app_status||a.app_status==='pending';}).length;
  var approved = allApplications.filter(function(a){return a.app_status==='approved';}).length;
  var declined = allApplications.filter(function(a){return a.app_status==='declined';}).length;
  const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  set('apps-pending', pending);
  set('apps-approved', approved);
  set('apps-declined', declined);
  set('apps-total', allApplications.length);

  if(!tbody) return;
  if(allApplications.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--gray);padding:32px;">No applications received yet. Share the application link with candidates.</td></tr>';
    return;
  }

  const statusBadge = {
    pending: '<span class="badge badge-gold">⏳ Pending</span>',
    approved: '<span class="badge badge-green">✅ Approved</span>',
    declined: '<span class="badge badge-red">❌ Declined</span>',
  };

  // Filter out terminated employees
  var activeApps = allApplications.filter(function(a) {
    var emailKey = (a.workEmail||a.email||'').toLowerCase().trim();
    var roster = TEAM_ROSTER[emailKey];
    return !roster || roster.active !== false;
  });
  tbody.innerHTML = activeApps.map(function(a) {
    var name = ((a.firstName||'') + ' ' + (a.lastName||'')).trim();
    var emailKey = (a.workEmail||a.email||'').toLowerCase().trim();
    var roster = TEAM_ROSTER[emailKey] || {};
    var role = roster.role || a.source || '—';
    var startDate = roster.start ? new Date(roster.start).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
    var weekly = roster.weekly || 0;
    var payDisplay = weekly ? '$'+weekly+'/wk via '+(a.paymentMethod||'Wise') : (a.paymentMethod||'—');
    var st = a.app_status || 'pending';
    var badge = st==='approved' ? '<span style="background:#DCFCE7;color:#166534;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">✅ Approved</span>'
              : st==='declined' ? '<span style="background:#FEE2E2;color:#991B1B;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">❌ Declined</span>'
              : '<span style="background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">⏳ Pending</span>';
    var submitted = a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : '—';
    var actions = '<button class="btn btn-outline btn-sm" onclick="viewApplication('+a.id+')">View</button>';
    if (st === 'pending' || !st) actions += ' <button onclick="quickApprove('+a.id+')" style="padding:3px 8px;background:#166534;color:white;border:none;border-radius:5px;font-size:11px;cursor:pointer;">✅</button> <button onclick="quickDecline('+a.id+')" style="padding:3px 8px;background:#991B1B;color:white;border:none;border-radius:5px;font-size:11px;cursor:pointer;">❌</button>';
    return '<tr>'+
      '<td><strong>'+name+'</strong><br><span style="font-size:11px;color:#64748B;">Start: '+startDate+'</span></td>'+
      '<td style="font-size:12px;">'+role+'</td>'+
      '<td style="font-size:12px;">'+emailKey+'</td>'+
      '<td style="font-size:12px;">'+payDisplay+'</td>'+
      '<td style="font-size:12px;">'+submitted+'</td>'+
      '<td>'+badge+'</td>'+
      '<td>'+actions+'</td>'+
    '</tr>';
  }).join('');
}

async function viewApplication(id) {
  var a = allApplications.find(function(x){ return String(x.id) === String(id); });
  if (!a) { console.error('Application not found:', id); return; }
  var i = allApplications.indexOf(a);
  // Fetch full record including idCard on demand
  try {
    var r = await fetch('https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1/employee_onboarding?select=idCard,idType,idFileName&id=eq.'+id,
      {headers:{'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50'}});
    var full = await r.json();
    if (Array.isArray(full) && full[0]) {
      a = Object.assign({}, a, full[0]);
    }
  } catch(e) { console.warn('Could not load ID card:', e.message); }
  var date = a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
  var html =
    '<div style="max-width:560px;margin:0 auto;">' +
    '<h2 style="font-size:18px;font-weight:800;color:#1B3A6B;margin-bottom:16px;">'+((a.firstName||'')+' '+(a.lastName||'')).trim()+'</h2>' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
    row('Work Email', a.workEmail||'—') +
    row('Personal Email', a.email||'—') +
    row('Phone', a.phone||'—') +
    row('Timezone', a.timezone||'—') +
    row('Payment Method', a.paymentMethod||'—') +
    row('Payment Info (Wise)', a.paymentInfo||'—') +
    row('Internet Speed', a.internetSpeed||'—') +
    row('Emergency Contact', (a.ecName||'—')+' — '+(a.ecPhone||'')) +
    row('Source / Referral', a.source||'—') +
    row('Comments', a.comments||'—') +
    row('Date of Birth', a.dob||'—') +
    row('ID Type', a.idType||'—') +
    (a.idCard ? '<tr style="border-bottom:1px solid #F1F5F9;"><td style="padding:8px 10px;color:#64748B;font-weight:600;width:40%;">ID Document</td><td style="padding:8px 10px;"><img src="'+a.idCard+'" style="max-width:100%;max-height:300px;border-radius:8px;border:1px solid #E2E8F0;" onerror="this.style.display=\'none\'"></td></tr>' : row('ID Document', '⚠️ Not uploaded')) +
    row('Submitted', date) +
    '</table>' +
    (a.idCard ?
      '<div style="margin-top:16px;padding:14px;background:#F8FAFC;border-radius:10px;border:1px solid #E2E8F0;">' +
        '<div style="font-size:12px;font-weight:700;color:#64748B;margin-bottom:10px;">ID DOCUMENT</div>' +
        '<img id="app-id-img" src="' + a.idCard + '" style="max-width:100%;max-height:220px;object-fit:contain;border-radius:8px;border:1px solid #E2E8F0;cursor:zoom-in;display:block;" title="Click to enlarge">' +
        '<div style="display:flex;gap:8px;margin-top:10px;">' +
          '<button id="app-enlarge-btn" style="padding:7px 14px;background:#1B3A6B;color:white;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;">🔍 Enlarge</button>' +
          '<a id="app-dl-btn" href="' + a.idCard + '" download="' + ((a.firstName||'')+'_'+(a.lastName||'')+'_ID').replace(/\s+/g,'_') + '" style="padding:7px 14px;background:#166534;color:white;border-radius:7px;font-size:12px;font-weight:700;text-decoration:none;display:inline-block;">⬇️ Download</a>' +
        '</div>' +
      '</div>'
    : '') +
    '<div style="display:flex;gap:10px;margin-top:20px;">' +
      '<button onclick="approveApplication('+i+')" style="flex:1;padding:10px;background:#166534;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px;">✅ Approve</button>' +
      '<button onclick="declineApplication('+i+')" style="flex:1;padding:10px;background:#991B1B;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px;">❌ Decline</button>' +
      '<button onclick="closeAppModal()" style="padding:10px 16px;background:#F1F5F9;color:#374151;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px;">Close</button>' +
    '</div></div>';

  function row(label, val) {
    return '<tr style="border-bottom:1px solid #F1F5F9;">'+
      '<td style="padding:8px 10px;color:#64748B;font-weight:600;width:40%;">'+label+'</td>'+
      '<td style="padding:8px 10px;color:#1E293B;font-weight:500;">'+val+'</td></tr>';
  }

  // Show in modal
  var existing = document.getElementById('app-detail-modal');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'app-detail-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = '<div style="background:white;border-radius:14px;padding:24px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);">'+html+'</div>';
  overlay.onclick = function(e){ if(e.target===overlay) closeAppModal(); };
  document.body.appendChild(overlay);
  // Wire up enlarge button and image click after DOM insertion
  setTimeout(function() {
    var img = document.getElementById('app-id-img');
    var btn = document.getElementById('app-enlarge-btn');
    if (img) img.onclick = function() { enlargeID(img.src, ((a.firstName||'')+' '+(a.lastName||'')).trim()); };
    if (btn) btn.onclick = function() { enlargeID(img.src, ((a.firstName||'')+' '+(a.lastName||'')).trim()); };
  }, 100);
}

function closeAppModal() {
  var m = document.getElementById('app-detail-modal');
  if (m) m.remove();
}

function approveApplication(i) {
  var a = typeof i === 'number' ? allApplications[i] : allApplications.find(function(x){return String(x.id)===String(i);});
  if (!a || !confirm('Approve '+a.firstName+' '+a.lastName+'?')) return;
  var K1='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0';
  var K2='8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50';
  fetch('https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1/employee_onboarding?id=eq.'+a.id, {
    method:'PATCH',
    headers:{'apikey':K1+'.'+K2,'Authorization':'Bearer '+K1+'.'+K2,'Content-Type':'application/json','Prefer':'return=minimal'},
    body:JSON.stringify({app_status:'approved'})
  }).then(function(r){
    if(r.ok){ alert('✅ '+a.firstName+' approved!'); closeAppModal(); loadApplications(); }
    else { alert('Error approving. Try again.'); }
  });
}

function declineApplication(i) {
  var a = typeof i === 'number' ? allApplications[i] : allApplications.find(function(x){return String(x.id)===String(i);});
  if (!a || !confirm('Decline '+a.firstName+' '+a.lastName+'?')) return;
  var K1='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0';
  var K2='8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50';
  fetch('https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1/employee_onboarding?id=eq.'+a.id, {
    method:'PATCH',
    headers:{'apikey':K1+'.'+K2,'Authorization':'Bearer '+K1+'.'+K2,'Content-Type':'application/json','Prefer':'return=minimal'},
    body:JSON.stringify({app_status:'declined'})
  }).then(function(r){
    if(r.ok){ alert('❌ '+a.firstName+' declined.'); closeAppModal(); loadApplications(); }
    else { alert('Error declining. Try again.'); }
  });
}

function quickApprove(id) { approveApplication(id); }
function quickDecline(id) { declineApplication(id); }

function enlargeID(src, name) {
  var ex = document.getElementById('id-enlarge-overlay');
  if (ex) ex.remove();
  var overlay = document.createElement('div');
  overlay.id = 'id-enlarge-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;';
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };
  var safeName = (name||'ID').replace(/'/g,'');
  var safeFile = safeName.replace(/\s+/g,'_')+'_ID';
  overlay.innerHTML =
    '<div style="position:relative;max-width:95vw;max-height:90vh;text-align:center;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
        '<span style="color:white;font-weight:700;font-size:15px;">'+safeName+' — ID Document</span>' +
        '<div style="display:flex;gap:8px;">' +
          '<a href="'+src+'" download="'+safeFile+'" onclick="event.stopPropagation()" '+
            'style="padding:7px 16px;background:#166534;color:white;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;">⬇️ Download</a>' +
          '<button onclick="document.getElementById(\'id-enlarge-overlay\').remove();" '+
            'style="padding:7px 14px;background:#7F1D1D;color:white;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">✕ Close</button>' +
        '</div>' +
      '</div>' +
      '<img src="'+src+'" style="max-width:90vw;max-height:80vh;object-fit:contain;border-radius:10px;box-shadow:0 0 60px rgba(0,0,0,.8);">' +
    '</div>';
  document.body.appendChild(overlay);
}

function calcProratedPay(weeklyPay, startDate) {
  // Pay is for 5 days. If they start mid-week, prorate based on days worked.
  var daily = weeklyPay / 5;
  var start = new Date(startDate);
  var dow = start.getDay(); // 0=Sun, 1=Mon ... 5=Fri, 6=Sat
  // Days remaining in week (Mon-Fri)
  var daysLeft;
  if (dow === 0 || dow === 6) { daysLeft = 0; } // Weekend start = 0 days this week
  else { daysLeft = 6 - dow; } // Mon=5, Tue=4, Wed=3, Thu=2, Fri=1
  daysLeft = Math.min(daysLeft, 5);
  var proratedPay = Math.round(daily * daysLeft * 100) / 100;
  return { daily: daily.toFixed(2), daysLeft: daysLeft, proratedPay: proratedPay.toFixed(2) };
}
