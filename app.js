// CP Restoration Management System — Core JavaScript v5
// app.js — loaded by index.html
// Fixes: session tracking, client search, onboarding next step, duplicate detection

// ── EMPLOYEES ──────────────────────────────────────────────────────
var EMPLOYEES = {
  'jason@mycprteam.com':   { password:'CPRAdmin2026',  name:'Jason Crown',       role:'admin',      label:'Admin',             initials:'JC' },
  'queen@mycprteam.com':   { password:'CPRQueen2026',  name:'Queen Jearel Cruz', role:'compliance', label:'Compliance Officer', initials:'QC' },
  'bukunmi@mycprteam.com': { password:'CPRBuku2026',   name:'Bukunmi Aina',      role:'sales',      label:'Sales Rep',          initials:'BA' },
  'elna@mycprteam.com':    { password:'CPRElna2026',   name:'Elna Palabrica',    role:'cs',         label:'CS Agent',           initials:'EP' },

  'alec@mycprteam.com':    { password:'CPRAlec2026',   name:'Alec Sarrosa',      role:'cs',         label:'CS Agent',           initials:'AS' },

  'marcelo@mycprteam.com': { password:'CPRMarcelo2026', name:'Marcelo Torres',     role:'dispute',    label:'Dispute Specialist', initials:'MT' },
  'kimwell@mycprteam.com': { password:'CPRKimwell2026', name:'Kimwell Ablaza',     role:'dispute',    label:'Dispute Specialist', initials:'KA' },
  'annabel@mycprteam.com': { password:'CPRAnnabel2026', name:'Annabel Curada',     role:'dispute',    label:'Dispute Specialist', initials:'AC' },
  'jay@mycprteam.com':     { password:'CPRJay2026',     name:'Jay Rico',           role:'sales',      label:'Sales Rep',          initials:'JR' }
};

var currentUser = null;
var currentRole = null;

// ── CLIENT STORAGE KEY ─────────────────────────────────────────────
var CLIENTS_KEY = 'cp_clients_v2';

// Seed Ryan Felder if no clients exist yet
function seedClients() {
  var existing = getClients();
  if (!existing.find(function(c){ return c.id === 'CPR-00378'; })) {
    existing.push({
      id: 'CPR-00378',
      name: 'Ryan Felder',
      email: 'r.felder1987@gmail.com',
      phone: '',
      package: 'Standard',
      startDate: '2025-06-01',
      status: 'Active',
      disputes: [],
      notes: 'Portal login: CPR-00378 / restore2026',
      createdAt: '2025-06-01T00:00:00.000Z'
    });
    saveClients(existing);
  }
}

function getClients() {
  try { return JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]'); }
  catch(e) { return []; }
}

function saveClients(clients) {
  try { localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients)); }
  catch(e) { showToast('Storage error saving clients', 'error'); }
}

function genClientId() {
  var clients = getClients();
  var nums = clients.map(function(c){
    var m = (c.id||'').match(/CPR-(\d+)/);
    return m ? parseInt(m[1]) : 0;
  });
  var max = nums.length ? Math.max.apply(null, nums) : 0;
  return 'CPR-' + String(max + 1).padStart(5, '0');
}

// ── DUPLICATE DETECTION ────────────────────────────────────────────
function findDuplicates(name, email, phone) {
  var clients = getClients();
  var matches = [];
  var nameLower  = (name||'').toLowerCase().trim();
  var emailLower = (email||'').toLowerCase().trim();
  var phoneClean = (phone||'').replace(/\D/g,'');

  clients.forEach(function(c) {
    var score = 0;
    var reasons = [];
    // Exact email match
    if (emailLower && c.email && c.email.toLowerCase() === emailLower) { score += 100; reasons.push('Same email'); }
    // Exact phone match
    if (phoneClean && c.phone && c.phone.replace(/\D/g,'') === phoneClean) { score += 100; reasons.push('Same phone'); }
    // Name similarity — check if both names share first + last
    if (nameLower && c.name) {
      var nameParts  = nameLower.split(' ').filter(Boolean);
      var cNameParts = c.name.toLowerCase().split(' ').filter(Boolean);
      var shared = nameParts.filter(function(p){ return cNameParts.indexOf(p) !== -1; }).length;
      if (shared >= 2) { score += 80; reasons.push('Same name'); }
      else if (shared === 1 && nameParts.length === 1) { score += 40; reasons.push('Similar name'); }
    }
    if (score >= 80) matches.push({ client: c, score: score, reasons: reasons });
  });
  return matches.sort(function(a,b){ return b.score - a.score; });
}

// ── CLIENT TABLE ───────────────────────────────────────────────────
function loadClientsTable(search, status, category) {
  var tbody = document.getElementById('clients-tbody');
  if (!tbody) return;
  var clients = getClients();
  var s = ((search || (document.getElementById('client-search')||{}).value || '')).toLowerCase().trim();
  var st = status || (document.getElementById('status-filter')||{}).value || '';
  var filtered = clients.filter(function(c) {
    var matchSearch = !s ||
      (c.name||'').toLowerCase().includes(s) ||
      (c.id||'').toLowerCase().includes(s) ||
      (c.email||'').toLowerCase().includes(s) ||
      (c.phone||'').includes(s);
    var matchStatus = !st || st === 'all' || (c.status||'') === st;
    return matchSearch && matchStatus;
  });
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray);padding:32px;">No clients found' + (s ? ' matching "' + s + '"' : '') + '.</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(function(c) {
    var statusBadge = c.status === 'Active'
      ? '<span class="badge badge-green">Active</span>'
      : '<span class="badge badge-gray">' + (c.status||'Unknown') + '</span>';
    return '<tr>' +
      '<td style="font-family:monospace;font-size:12px;font-weight:700;color:var(--navy);">' + (c.id||'—') + '</td>' +
      '<td style="font-weight:700;">' + (c.name||'—') + '</td>' +
      '<td style="font-size:12px;">' + (c.email||'—') + '</td>' +
      '<td style="font-size:12px;">' + (c.phone||'—') + '</td>' +
      '<td style="font-size:12px;">' + (c.package||'—') + '</td>' +
      '<td style="font-size:12px;">' + (c.startDate ? new Date(c.startDate).toLocaleDateString() : '—') + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td><button class="btn btn-sm btn-navy" onclick="viewClient(\'' + c.id + '\')">View</button></td>' +
    '</tr>';
  }).join('');
}

function filterClients() {
  loadClientsTable();
}

function viewClient(id) {
  var clients = getClients();
  var client = clients.find(function(c){ return c.id === id; });
  if (!client) { showToast('Client not found: ' + id, 'error'); return; }
  // Populate client detail modal if it exists
  var fields = { 'view-client-id': client.id, 'view-client-name': client.name,
    'view-client-email': client.email, 'view-client-phone': client.phone,
    'view-client-package': client.package, 'view-client-status': client.status,
    'view-client-start': client.startDate, 'view-client-notes': client.notes };
  Object.keys(fields).forEach(function(fid) {
    var el = document.getElementById(fid);
    if (el) el.textContent = fields[fid] || '—';
  });
  openModal('client-detail-modal');
}

// ── ONBOARDING ─────────────────────────────────────────────────────
var onbStep = 1;
var onbData = {};

function startOnboarding() {
  onbStep = 1;
  onbData = {};
  showOnbStep(1);
  openModal('onboarding-modal');
}

function showOnbStep(step) {
  for (var i = 1; i <= 5; i++) {
    var el = document.getElementById('onb-step-' + i);
    if (el) el.style.display = i === step ? 'block' : 'none';
  }
  onbStep = step;
  // Update step indicator
  document.querySelectorAll('.onb-step-dot').forEach(function(dot, idx) {
    dot.classList.toggle('active', idx + 1 === step);
    dot.classList.toggle('done', idx + 1 < step);
  });
}

function onbNext() {
  if (onbStep === 1) {
    // Collect personal info
    var name  = (document.getElementById('onb-name')||{}).value || '';
    var email = (document.getElementById('onb-email')||{}).value || '';
    var phone = (document.getElementById('onb-phone')||{}).value || '';
    if (!name.trim()) { showToast('Please enter the client name.', 'error'); return; }

    // Duplicate check
    var dupes = findDuplicates(name, email, phone);
    if (dupes.length > 0) {
      var msg = 'Possible duplicate detected:\n';
      dupes.slice(0,2).forEach(function(d){
        msg += d.client.name + ' (' + d.client.id + ') — ' + d.reasons.join(', ') + '\n';
      });
      if (!confirm(msg + '\nContinue anyway?')) return;
    }

    onbData.name  = name.trim();
    onbData.email = email.trim();
    onbData.phone = phone.trim();
    onbData.address = (document.getElementById('onb-address')||{}).value || '';
    onbData.dob     = (document.getElementById('onb-dob')||{}).value || '';
    showOnbStep(2);
    return;
  }

  if (onbStep === 2) {
    // Package selection
    var pkg = (document.getElementById('onb-package')||{}).value || '';
    if (!pkg) { showToast('Please select a package.', 'error'); return; }
    onbData.package   = pkg;
    onbData.startDate = new Date().toISOString().split('T')[0];
    onbData.payAmount = (document.getElementById('onb-pay-amount')||{}).value || '';
    onbData.payMethod = (document.getElementById('onb-pay-method')||{}).value || '';
    showOnbStep(3);
    return;
  }

  if (onbStep === 3) {
    // Dispute documents
    onbData.bureaus   = [];
    ['eq','ex','tu'].forEach(function(b){
      var el = document.getElementById('onb-bureau-' + b);
      if (el && el.checked) onbData.bureaus.push(b.toUpperCase());
    });
    onbData.disputes  = (document.getElementById('onb-disputes')||{}).value || '';
    onbData.ftcReport = (document.getElementById('onb-ftc')||{}).value || '';
    showOnbStep(4);
    return;
  }

  if (onbStep === 4) {
    // Agreement / signature
    onbData.agreeTerms = (document.getElementById('onb-agree')||{}).checked;
    if (!onbData.agreeTerms) { showToast('Client must agree to terms to proceed.', 'error'); return; }
    onbData.signature = (document.getElementById('onb-signature')||{}).value || '';
    showOnbStep(5);
    return;
  }

  if (onbStep === 5) {
    completeOnboarding();
  }
}

function onbBack() {
  if (onbStep > 1) showOnbStep(onbStep - 1);
}

function completeOnboarding() {
  var clients = getClients();
  var newId   = genClientId();
  var client  = {
    id:        newId,
    name:      onbData.name,
    email:     onbData.email,
    phone:     onbData.phone,
    address:   onbData.address || '',
    dob:       onbData.dob || '',
    package:   onbData.package,
    startDate: onbData.startDate,
    bureaus:   onbData.bureaus || [],
    disputes:  onbData.disputes || '',
    payAmount: onbData.payAmount || '',
    payMethod: onbData.payMethod || '',
    status:    'Active',
    notes:     '',
    portalPassword: 'restore2026',
    createdAt: new Date().toISOString()
  };
  clients.push(client);
  saveClients(clients);
  closeModal('onboarding-modal');
  showToast('Client ' + newId + ' — ' + onbData.name + ' created successfully!', 'success');
  loadClientsTable();
  onbStep = 1; onbData = {};
}

// ── PASSWORD TOGGLE ────────────────────────────────────────────────
function togglePwdVisibility() {
  var input = document.getElementById('admin-pass');
  var btn   = document.getElementById('pwd-toggle-btn');
  if (!input) return;
  if (input.type === 'password') { input.type = 'text'; if (btn) btn.textContent = '🙈'; }
  else { input.type = 'password'; if (btn) btn.textContent = '👁'; }
}

// ── LOGIN TABS ─────────────────────────────────────────────────────
function setLoginType(type) {
  var adminForm  = document.getElementById('login-form-admin');
  var clientForm = document.getElementById('login-form-client');
  var tabs       = document.querySelectorAll('.login-tab');
  tabs.forEach(function(t, i) {
    t.classList.toggle('active', (i===0&&type==='admin')||(i===1&&type==='client'));
  });
  if (adminForm)  adminForm.style.display  = type==='admin'  ? 'block' : 'none';
  if (clientForm) clientForm.style.display = type==='client' ? 'block' : 'none';
}

// ── LOGIN ──────────────────────────────────────────────────────────
function loginAdmin() {
  var emailEl = document.getElementById('admin-email');
  var passEl  = document.getElementById('admin-pass');
  var errEl   = document.getElementById('login-error');
  var email   = ((emailEl||{}).value||'').trim().toLowerCase();
  var pass    = ((passEl||{}).value||'').trim();
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
  sessionStorage.setItem('cp_logged_in_user', email);
  sessionStorage.setItem('cp_logged_in_role', emp.role);
  sessionStorage.setItem('cp_logged_in_name', emp.name);
  sessionStorage.setItem('cp_logged_in_label', emp.label);
  sessionStorage.setItem('cp_logged_in_initials', emp.initials||emp.name.split(' ').map(function(w){return w[0];}).join('').substring(0,2));
  if (errEl) errEl.style.display = 'none';
  var loginScreen = document.getElementById('login-screen');
  var appEl = document.getElementById('app');
  if (loginScreen) loginScreen.style.display = 'none';
  if (appEl) appEl.style.display = 'block';
  var nameEl = document.getElementById('current-user-name');
  var roleEl = document.getElementById('current-user-role');
  if (nameEl) nameEl.textContent = emp.name;
  if (roleEl) roleEl.textContent = emp.label;
  var isAdmin = (emp.role === 'admin');
  document.querySelectorAll('.admin-only').forEach(function(el){
    el.style.display = isAdmin ? '' : 'none';
  });
  document.querySelectorAll('.staff-only').forEach(function(el){
    el.style.display = isAdmin ? 'none' : '';
  });
  showPage('dashboard');
  trackTeamSession();
}

function logoutAdmin() {
  trackTeamSession('Logged Out');
  currentUser = null; currentRole = null;
  sessionStorage.removeItem('cp_logged_in_user');
  sessionStorage.removeItem('cp_logged_in_role');
  sessionStorage.removeItem('cp_logged_in_name');
  sessionStorage.removeItem('cp_logged_in_label');
  sessionStorage.removeItem('cp_logged_in_initials');
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
  document.querySelectorAll('.page').forEach(function(p){
    p.style.display='none'; p.classList.remove('active');
  });
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
  var el = document.getElementById('page-' + name);
  if (el) { el.style.display='block'; el.classList.add('active'); }
  var btns = document.querySelectorAll('.nav-btn');
  for (var i=0;i<btns.length;i++){
    if ((btns[i].getAttribute('onclick')||'').indexOf("'"+name+"'")!==-1){ btns[i].classList.add('active'); break; }
  }
  window.scrollTo(0,0);
  trackTeamSession();
  if (name==='clients')   { loadClientsTable(); }
  if (name==='disputes')  { if (typeof loadDisputesTable  ==='function') loadDisputesTable(); }
  if (name==='broadcast') { if (typeof updateBCAudience   ==='function') updateBCAudience(); }
  if (name==='payroll')   { if (typeof renderPayrollTable ==='function') renderPayrollTable(); }
  if (name==='accounting'){ if (typeof renderAccountingPage==='function') renderAccountingPage(); }
  if (name==='disputes')  { loadDisputesTable(); }
  if (name==='sales')     { loadSalesData(); }
}

// ── MODAL ──────────────────────────────────────────────────────────
function openModal(id)  { var m=document.getElementById(id); if(m) m.style.display='flex'; }
function closeModal(id) { var m=document.getElementById(id); if(m) m.style.display='none'; }

// ── TOAST ──────────────────────────────────────────────────────────
function showToast(msg, type) {
  var bg = type==='error'?'#8B1A1A':type==='success'?'#1A5C38':'#1B3A6B';
  var t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:'+bg+';color:white;padding:11px 22px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.3);white-space:nowrap;font-family:Inter,sans-serif;';
  document.body.appendChild(t);
  setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); },3000);
}

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
window.addEventListener('load', function() {
  var ls  = document.getElementById('login-screen');
  var app = document.getElementById('app');
  if (ls) ls.style.display = 'flex';
  if (app) app.style.display = 'none';
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
  var savedEmail = localStorage.getItem('cp_logged_in_user');
  var savedName  = localStorage.getItem('cp_logged_in_name') || '';
  var savedLabel = localStorage.getItem('cp_logged_in_label') || '';
  var savedRole  = localStorage.getItem('cp_logged_in_role') || '';
  var savedInit  = localStorage.getItem('cp_logged_in_initials') || '';

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
    var r = await fetch(_SUPA+'/clients?select=id,name,status,end_date,package&status=eq.Active&order=end_date.asc&limit=500',{headers:_H});
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
  clients:     function(){ if(typeof loadClients==='function') loadClients(); },
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
    var r = await fetch('https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1/clients?start_date=gte.'+from.toISOString().split('T')[0]+'&select=id,name,package,start_date,referred_by', {
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
}
