// CP Restoration Management System — Core JavaScript v5
// app.js — loaded by index.html
// Fixes: session tracking, client search, onboarding next step, duplicate detection

// ── EMPLOYEES ──────────────────────────────────────────────────────
var EMPLOYEES = {
  'jason@mycprteam.com':   { password:'CPRAdmin2026',  name:'Jason Crown',        role:'admin',      label:'Admin' },
  'queen@mycprteam.com':   { password:'CPRQueen2026',  name:'Queen Jearel Cruz',  role:'compliance', label:'Compliance' },
  'bukunmi@mycprteam.com': { password:'CPRBuku2026',   name:'Bukunmi Aina',       role:'sales',      label:'Sales' }
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
  if (errEl) errEl.style.display = 'none';
  var loginScreen = document.getElementById('login-screen');
  var app = document.getElementById('app');
  if (loginScreen) loginScreen.style.display = 'none';
  if (app) app.style.display = 'block';
  var nameEl = document.getElementById('current-user-name');
  var roleEl = document.getElementById('current-user-role');
  if (nameEl) nameEl.textContent = emp.name;
  if (roleEl) roleEl.textContent = emp.label;
  document.querySelectorAll('.admin-only').forEach(function(el){
    el.style.display = emp.role==='admin' ? '' : 'none';
  });
  showPage('dashboard');
  trackTeamSession();
}

function logoutAdmin() {
  trackTeamSession('Logged Out');
  currentUser = null; currentRole = null;
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
