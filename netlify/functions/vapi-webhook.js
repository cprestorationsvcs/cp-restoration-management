// ═══════════════════════════════════════════════════════
// CP RESTORATION — VAPI WEBHOOK HANDLER v3
// Items 1-15 implemented: booking guard, check_availability,
// get_my_appointments, reschedule, cancel, team routing,
// transfer-destination-request, no rep names to AI
// ═══════════════════════════════════════════════════════

const SUPA_URL    = process.env.SUPABASE_URL    || 'https://jzkfembagpiuuoexmpoy.supabase.co';
const SUPA_KEY    = process.env.SUPABASE_KEY    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50';
const VAPI_SECRET = process.env.VAPI_SECRET;
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID || '';

console.log('[BOOT] SUPABASE_URL set:', !!process.env.SUPABASE_URL);
console.log('[BOOT] SUPABASE_KEY set:', !!process.env.SUPABASE_KEY);
console.log('[BOOT] VAPI_SECRET set:', !!process.env.VAPI_SECRET);

// ── Team configuration (items 6, 10) ───────────────────
const TEAMS = {
  sales: [
    { name: 'Rose Marie',       phone: '+12407883716', email: 'rosemarie@mycprteam.com' },
    { name: 'Raven',            phone: '+12407883921', email: 'raven@mycprteam.com' },
    { name: 'Raymon Guevarra',  phone: '+17073786750', email: 'raymon.guevarra@mycprteam.com' }
  ],
  customer_service: [
    { name: 'Alec Sarrosa',  phone: '+12407883686', email: 'alec@mycprteam.com' },
    { name: 'Elna Palabrica',phone: '+12407883898', email: 'elna@mycprteam.com' }
  ]
};

// Service type config (item 7)
const SERVICE_CONFIG = {
  credit_consult:    { title: 'Credit Repair Consultation', team: 'sales' },
  funding_consult:   { title: 'Funding Consultation',       team: 'sales' },
  customer_service:  { title: 'Customer Service Call',      team: 'customer_service' }
};

// ── Supabase helpers ────────────────────────────────────
function supaHeaders(prefer) {
  const h = {
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
    'Content-Type': 'application/json'
  };
  if (prefer) h['Prefer'] = prefer;
  return h;
}

async function supaGet(path) {
  const r = await fetch(SUPA_URL + '/rest/v1/' + path, { headers: supaHeaders() });
  return r.json();
}

async function supaPost(path, body, prefer) {
  const r = await fetch(SUPA_URL + '/rest/v1/' + path, {
    method: 'POST', headers: supaHeaders(prefer || 'return=representation'),
    body: JSON.stringify(body)
  });
  return r.json();
}

async function supaPatch(path, body) {
  const r = await fetch(SUPA_URL + '/rest/v1/' + path, {
    method: 'PATCH', headers: supaHeaders('return=representation'),
    body: JSON.stringify(body)
  });
  return r.json();
}

// ── Business hours check (item 11) ─────────────────────
function isBusinessHours() {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay(); // 0=Sun,6=Sat
  const hour = et.getHours();
  return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
}

// ── Get available slots for a day ──────────────────────
async function getAvailableSlots(dateStr, team, preferredTime) {
  // dateStr: 'YYYY-MM-DD', team: 'sales'|'customer_service'
  const dayStart = dateStr + 'T00:00:00Z';
  const dayEnd   = dateStr + 'T23:59:59Z';

  // Fetch existing bookings for this day
  const booked = await supaGet(
    `appointments?appointment_date=gte.${dayStart}&appointment_date=lte.${dayEnd}&appointment_status=neq.Cancelled&select=appointment_date,assigned_rep,team`
  );

  // Build slot grid: 9am-5pm ET every 30 min
  const slots = [];
  for (let h = 9; h < 17; h++) {
    for (let m = 0; m < 60; m += 30) {
      // Convert ET to UTC (ET = UTC-4 or UTC-5 depending on DST)
      // Simple approach: use the date string and offset
      const slotET = new Date(`${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
      // Find who's available on this team for this slot
      const teamMembers = TEAMS[team] || TEAMS.sales;
      const bookedAtSlot = (booked || []).filter(b => {
        const bd = new Date(b.appointment_date);
        return Math.abs(bd - slotET) < 30 * 60 * 1000;
      }).map(b => b.assigned_rep);

      const available = teamMembers.filter(m => !bookedAtSlot.includes(m.email));
      if (available.length > 0) {
        const timeLabel = `${h > 12 ? h-12 : h}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'} ET`;
        slots.push({
          slot_id: dateStr + 'T' + String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0'),
          time_spoken: timeLabel,
          available_count: available.length,
          reps: available // kept internal, never sent to AI
        });
      }
    }
  }

  // If preferredTime given, sort by closeness to it
  if (preferredTime) {
    const [ph, pm] = preferredTime.split(':').map(Number);
    const prefMins = ph * 60 + (pm || 0);
    slots.sort((a, b) => {
      const [ah, am] = a.slot_id.split('T')[1].split(':').map(Number);
      const [bh, bm] = b.slot_id.split('T')[1].split(':').map(Number);
      return Math.abs(ah*60+am - prefMins) - Math.abs(bh*60+bm - prefMins);
    });
  }

  return slots;
}

// ── Pick least-busy rep from team for a slot ───────────
async function pickRep(team, dateStr) {
  const teamMembers = TEAMS[team] || TEAMS.sales;
  const dayStart = dateStr + 'T00:00:00Z';
  const dayEnd   = dateStr + 'T23:59:59Z';
  const booked = await supaGet(
    `appointments?appointment_date=gte.${dayStart}&appointment_date=lte.${dayEnd}&appointment_status=neq.Cancelled&select=assigned_rep`
  );
  const counts = {};
  teamMembers.forEach(m => { counts[m.email] = 0; });
  (booked || []).forEach(b => { if (counts[b.assigned_rep] !== undefined) counts[b.assigned_rep]++; });
  return teamMembers.sort((a, b) => (counts[a.email] || 0) - (counts[b.email] || 0))[0];
}

// ── Notify team chat ────────────────────────────────────
async function notifyTeamChat(message) {
  await supaPost('team_chat', {
    channel: 'general', sender: 'AI Receptionist', sender_role: 'system',
    message, created_at: new Date().toISOString()
  }, 'return=minimal').catch(() => {});
}

// ════════════════════════════════════════════════════════
// TOOL HANDLERS
// ════════════════════════════════════════════════════════

// ── search_record ───────────────────────────────────────
async function handle_search_record({ phone, dob, first_name, last_name }) {
  const digits = (phone || '').replace(/\D/g, '');
  const e164 = digits.length === 10 ? '+1' + digits : digits.length === 11 ? '+' + digits : null;
  let client = null, lead = null;

  if (e164) {
    const clients = await supaGet(`clients?or=(phone.eq.${encodeURIComponent(e164)},phone.eq.${encodeURIComponent(digits)})&limit=1&select=*`);
    if (Array.isArray(clients) && clients.length) client = clients[0];
    if (!client) {
      const leads = await supaGet(`leads?or=(phone_e164.eq.${encodeURIComponent(e164)},phone.eq.${encodeURIComponent(digits)})&limit=1&select=*`);
      if (Array.isArray(leads) && leads.length) lead = leads[0];
    }
  }

  if (client) {
    let verified = false;
    if (dob) {
      const stored = client.date_of_birth ? new Date(client.date_of_birth).toISOString().split('T')[0] : '';
      const input  = new Date(dob).toISOString().split('T')[0];
      verified = stored === input;
    }
    return {
      found: true, record_type: 'client',
      verified, client_id: client.id, status: client.status,
      package: client.package, start_date: client.start_date,
      default_team: 'customer_service' // item 9
    };
  }
  if (lead) {
    return { found: true, record_type: 'lead', lead_id: lead.id, default_team: 'sales' };
  }
  return { found: false, record_type: 'none', default_team: 'sales' };
}

// ── check_availability (item 2) ─────────────────────────
async function handle_check_availability({ preferred_day, preferred_time, service_type }) {
  const svc = service_type || 'credit_consult';
  const cfg = SERVICE_CONFIG[svc] || SERVICE_CONFIG.credit_consult;
  const team = cfg.team;

  // Build date string
  const now = new Date();
  let dateStr;
  if (preferred_day && preferred_day.match(/^\d{4}-\d{2}-\d{2}$/)) {
    dateStr = preferred_day;
  } else {
    // Parse day names
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayIdx = days.indexOf((preferred_day || '').toLowerCase());
    const d = new Date(now);
    if (dayIdx >= 0) {
      const diff = (dayIdx - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
    } else {
      d.setDate(d.getDate() + 1); // tomorrow
    }
    dateStr = d.toISOString().split('T')[0];
  }

  const slots = await getAvailableSlots(dateStr, team, preferred_time);
  const publicSlots = slots.slice(0, 5).map(s => ({ slot_id: s.slot_id, time_spoken: s.time_spoken }));

  if (!publicSlots.length) {
    return { available: false, date: dateStr, message: 'No availability that day. Try another day.' };
  }

  // If exact preferred_time given, check if that exact slot is free
  if (preferred_time) {
    const exact = slots.find(s => s.slot_id.endsWith(preferred_time.substring(0,5)));
    return {
      available: true, date: dateStr,
      exact_slot_free: !!exact,
      nearest_slots: publicSlots,
      service_title: cfg.title
    };
  }
  return { available: true, date: dateStr, open_slots: publicSlots, service_title: cfg.title };
}

// ── book_appointment (item 1) ───────────────────────────
async function handle_book_appointment({ slot_id, service_type, caller_phone, caller_name, lead_id, client_id, time_of_day, preferred_day }) {
  const svc = service_type || 'credit_consult';
  const cfg = SERVICE_CONFIG[svc] || SERVICE_CONFIG.credit_consult;
  const team = cfg.team;

  // Resolve slot
  let apptDate, dateStr;
  if (slot_id && slot_id.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)) {
    apptDate = new Date(slot_id);
    dateStr = slot_id.split('T')[0];
  } else {
    // Build from preferred_day + time_of_day
    const now = new Date();
    const d = new Date(now);
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayIdx = days.indexOf((preferred_day || '').toLowerCase());
    if (dayIdx >= 0) {
      const diff = (dayIdx - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
    } else {
      d.setDate(d.getDate() + 1);
    }
    dateStr = d.toISOString().split('T')[0];
    const hour = time_of_day === 'morning' ? 10 : time_of_day === 'afternoon' ? 14 : 10;
    apptDate = new Date(dateStr + 'T' + String(hour).padStart(2,'0') + ':00:00');
  }

  // ── SERVER-SIDE DOUBLE-BOOKING CHECK (item 1) ─────────
  const slotStr = apptDate.toISOString().split('.')[0];
  const existing = await supaGet(
    `appointments?appointment_date=eq.${encodeURIComponent(slotStr + 'Z')}&appointment_status=neq.Cancelled&select=id,assigned_rep,team`
  );
  const teamMembers = TEAMS[team] || TEAMS.sales;
  const bookedReps = (existing || []).map(e => e.assigned_rep);
  const freeReps = teamMembers.filter(m => !bookedReps.includes(m.email));

  if (!freeReps.length) {
    // Slot taken — return next open slots
    const slots = await getAvailableSlots(dateStr, team, null);
    const next = slots.filter(s => s.slot_id !== slot_id).slice(0, 3)
      .map(s => ({ slot_id: s.slot_id, time_spoken: s.time_spoken }));
    return { success: false, reason: 'slot_taken', next_open_slots: next };
  }

  // Pick least-busy free rep (item 8)
  const dayBookings = await supaGet(
    `appointments?appointment_date=gte.${dateStr}T00:00:00Z&appointment_date=lte.${dateStr}T23:59:59Z&appointment_status=neq.Cancelled&select=assigned_rep`
  );
  const counts = {};
  freeReps.forEach(m => { counts[m.email] = 0; });
  (dayBookings || []).forEach(b => { if (counts[b.assigned_rep] !== undefined) counts[b.assigned_rep]++; });
  const rep = freeReps.sort((a, b) => (counts[a.email]||0) - (counts[b.email]||0))[0];

  // Book it
  const digits = (caller_phone || '').replace(/\D/g, '');
  const e164 = digits.length === 10 ? '+1' + digits : digits.length === 11 ? '+' + digits : caller_phone;

  const appt = await supaPost('appointments', {
    client_name: caller_name || 'Unknown',
    client_phone: caller_phone,
    client_phone_e164: e164,
    appointment_date: apptDate.toISOString(),
    service_type: svc,
    title: cfg.title,
    team,
    assigned_rep: rep.email,
    lead_id: lead_id || null,
    client_id: client_id || null,
    appointment_status: 'Booked',
    created_at: new Date().toISOString()
  });

  const apptId = Array.isArray(appt) && appt[0] ? appt[0].id : null;
  const timeLabel = apptDate.toLocaleString('en-US', { timeZone: 'America/New_York', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) + ' ET';

  // Notify assigned rep (item 15) — no name to AI, name only in chat
  await notifyTeamChat(
    `📅 NEW APPOINTMENT BOOKED — ${cfg.title} | ${timeLabel} | Client: ${caller_name || 'Unknown'} | Phone: ${caller_phone} | Assigned to: ${rep.name}`
  );

  // item 10: no rep name to AI
  return {
    success: true,
    appointment_id: apptId,
    title: cfg.title,
    when_spoken: timeLabel,
    assigned_to: 'a representative' // item 10
  };
}

// ── get_my_appointments (item 3) ────────────────────────
async function handle_get_my_appointments({ _caller_phone, _client_id }) {
  var caller_phone = _caller_phone; var client_id = _client_id;
  if (!caller_phone) {
    return { error: 'Unable to identify caller. Please call from your registered number.' };
  }
  if (!client_id) {
    return { error: 'You must be verified as an existing client before viewing appointments. Please provide your date of birth to verify.' };
  }
  let query;
  if (client_id) {
    query = `appointments?client_id=eq.${encodeURIComponent(client_id)}&appointment_status=in.(Booked,Rescheduled)&order=appointment_date.asc&limit=5&select=id,appointment_date,title,appointment_status,service_type`;
  } else {
    const digits = caller_phone.replace(/\D/g,'');
    const e164 = digits.length===10 ? '+1'+digits : '+'+digits;
    query = `appointments?client_phone_e164=eq.${encodeURIComponent(e164)}&appointment_status=in.(Booked,Rescheduled)&order=appointment_date.asc&limit=5&select=id,appointment_date,title,appointment_status,service_type`;
  }
  const appts = await supaGet(query);
  if (!Array.isArray(appts) || !appts.length) {
    return { found: false, message: 'No upcoming appointments found.' };
  }
  return {
    found: true,
    appointments: appts.map(a => ({
      appointment_id: a.id,
      title: a.title,
      when_spoken: new Date(a.appointment_date).toLocaleString('en-US', {
        timeZone:'America/New_York', month:'short', day:'numeric',
        hour:'numeric', minute:'2-digit'
      }) + ' ET',
      status: a.appointment_status
    }))
  };
}

// ── reschedule_appointment (item 4) ────────────────────
async function handle_reschedule_appointment({ appointment_id, new_slot_id, _caller_phone, _client_id }) {
  var caller_phone = _caller_phone; var client_id = _client_id;
  // Verify ownership
  const existing = await supaGet(`appointments?id=eq.${appointment_id}&select=*`);
  if (!Array.isArray(existing) || !existing.length) {
    return { success: false, error: 'Appointment not found.' };
  }
  const appt = existing[0];
  // Ownership check
  const digits = (caller_phone || '').replace(/\D/g,'');
  const e164 = digits.length===10 ? '+1'+digits : '+'+digits;
  const owns = (client_id && appt.client_id === client_id) || appt.client_phone_e164 === e164;
  if (!owns) return { success: false, error: 'Appointment not found.' }; // never confirm ownership

  const svc = appt.service_type || 'credit_consult';
  const cfg = SERVICE_CONFIG[svc] || SERVICE_CONFIG.credit_consult;
  const team = cfg.team;
  const dateStr = new_slot_id.split('T')[0];

  // Re-check new slot server-side (item 4)
  const newDate = new Date(new_slot_id);
  const slotStr = newDate.toISOString().split('.')[0];
  const slotBooked = await supaGet(
    `appointments?appointment_date=eq.${encodeURIComponent(slotStr+'Z')}&appointment_status=neq.Cancelled&id=neq.${appointment_id}&select=id,assigned_rep`
  );
  const teamMembers = TEAMS[team] || TEAMS.sales;
  const bookedReps = (slotBooked || []).map(e => e.assigned_rep);
  const freeReps = teamMembers.filter(m => !bookedReps.includes(m.email));

  if (!freeReps.length) {
    const slots = await getAvailableSlots(dateStr, team, null);
    const next = slots.filter(s => s.slot_id !== new_slot_id).slice(0, 3)
      .map(s => ({ slot_id: s.slot_id, time_spoken: s.time_spoken }));
    return { success: false, reason: 'slot_taken', next_open_slots: next };
  }

  // Pick rep
  const dayBookings = await supaGet(
    `appointments?appointment_date=gte.${dateStr}T00:00:00Z&appointment_date=lte.${dateStr}T23:59:59Z&appointment_status=neq.Cancelled&select=assigned_rep`
  );
  const counts = {};
  freeReps.forEach(m => { counts[m.email] = 0; });
  (dayBookings || []).forEach(b => { if (counts[b.assigned_rep] !== undefined) counts[b.assigned_rep]++; });
  const rep = freeReps.sort((a, b) => (counts[a.email]||0) - (counts[b.email]||0))[0];

  // Book new slot FIRST (item 4)
  const newAppt = await supaPost('appointments', {
    client_name: appt.client_name, client_phone: appt.client_phone,
    client_phone_e164: appt.client_phone_e164,
    appointment_date: newDate.toISOString(),
    service_type: svc, title: cfg.title, team,
    assigned_rep: rep.email,
    lead_id: appt.lead_id, client_id: appt.client_id,
    appointment_status: 'Booked',
    rescheduled_from: String(appointment_id),
    created_at: new Date().toISOString()
  });

  // THEN mark old one Rescheduled (item 4)
  await supaPatch(`appointments?id=eq.${appointment_id}`, {
    appointment_status: 'Rescheduled',
    cancelled_at: new Date().toISOString()
  });

  const timeLabel = newDate.toLocaleString('en-US', { timeZone:'America/New_York', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) + ' ET';
  await notifyTeamChat(`🔄 APPOINTMENT RESCHEDULED | ${cfg.title} | New time: ${timeLabel} | Client: ${appt.client_name} | Assigned to: ${rep.name}`);

  return {
    success: true,
    new_appointment_id: Array.isArray(newAppt) && newAppt[0] ? newAppt[0].id : null,
    when_spoken: timeLabel,
    assigned_to: 'a representative'
  };
}

// ── cancel_appointment (item 5) ─────────────────────────
async function handle_cancel_appointment({ appointment_id, _caller_phone, _client_id }) {
  var caller_phone = _caller_phone; var client_id = _client_id;
  const existing = await supaGet(`appointments?id=eq.${appointment_id}&select=*`);
  if (!Array.isArray(existing) || !existing.length) return { success: false, error: 'Not found.' };
  const appt = existing[0];
  const digits = (caller_phone || '').replace(/\D/g,'');
  const e164 = digits.length===10 ? '+1'+digits : '+'+digits;
  const owns = (client_id && appt.client_id === client_id) || appt.client_phone_e164 === e164;
  if (!owns) return { success: false, error: 'Not found.' };

  await supaPatch(`appointments?id=eq.${appointment_id}`, {
    appointment_status: 'Cancelled',
    cancelled_at: new Date().toISOString()
  });
  await notifyTeamChat(`❌ APPOINTMENT CANCELLED | ${appt.title} | Client: ${appt.client_name} | Phone: ${appt.client_phone}`);
  return { success: true, message: 'Your appointment has been cancelled.' };
}

// ── transfer-destination-request (item 11) ──────────────
async function handle_transfer_destination({ caller_phone, team }) {
  if (!isBusinessHours()) {
    return {
      type: 'callback',
      message: 'Our team is unavailable right now. Business hours are Monday through Friday, 9 AM to 5 PM Eastern. Would you like to schedule a callback?'
    };
  }
  const teamKey = team || 'sales';
  const teamMembers = TEAMS[teamKey] || TEAMS.sales;
  // Pick first available (simplest heuristic — could be enhanced with live status)
  if (!teamMembers.length) return { type: 'callback', message: 'No representatives available. Would you like a callback?' };
  const rep = teamMembers[0];
  // item 10: no name to AI
  return {
    type: 'phone',
    phoneNumber: rep.phone,
    message: 'Connecting you with a representative now.'
  };
}

// ════════════════════════════════════════════════════════
// MAIN HANDLER
// ════════════════════════════════════════════════════════
exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'POST,OPTIONS' }, body: '' };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  // VAPI signature check
  if (VAPI_SECRET) {
    const sig = event.headers['x-vapi-secret'] || event.headers['X-Vapi-Secret'];
    if (sig !== VAPI_SECRET) { console.error('[AUTH] Invalid VAPI secret'); return { statusCode: 401, body: 'Unauthorized' }; }
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: 'Bad JSON' }; }

  const msgType = body?.message?.type;
  console.log('[WEBHOOK] type:', msgType);

  // ── assistant-request ─────────────────────────────────
  if (msgType === 'assistant-request') {
    // Do NOT do any DB lookups here — must respond within 2-3 seconds
    const assistantId = ASSISTANT_ID || process.env.VAPI_ASSISTANT_ID || '';
    const callerPhone = body?.message?.call?.customer?.number || '';
    const isBusinessHours = isBusinessHoursNow();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        assistantId: assistantId,
        assistantOverrides: {
          variableValues: {
            company_name:        'CP Restoration Services',
            phone:               '1-855-327-5847',
            caller_status:       'unknown',
            first_name:          'there',
            business_hours_open: isBusinessHours ? 'true' : 'false',
            default_team:        'sales'
          }
        }
      })
    };
  }

  // ── transfer-destination-request (item 11) ────────────
  if (msgType === 'transfer-destination-request') {
    const callData = body?.message?.call || {};
    const team = callData.metadata?.team || 'sales';
    const result = await handle_transfer_destination({ team });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };
  }

  // ── tool-calls ─────────────────────────────────────────
  if (msgType === 'tool-calls') {
    const toolCalls = body?.message?.toolCalls || [];
    const results = [];

    // Extract caller identity from the call object — AI never needs to pass these
  const callObj = body?.message?.call || {};
  const callerPhone = callObj?.customer?.number || null;
  // Get verified session if exists
  let sessionClientId = null;
  let sessionRecord = null;
  if (callerPhone) {
    const digits = callerPhone.replace(/\D/g, '');
    const e164 = digits.length === 10 ? '+1' + digits : digits.length === 11 ? '+' + digits : callerPhone;
    try {
      const sessions = await supaGet('call_sessions?caller_phone=eq.' + encodeURIComponent(e164) + '&order=created_at.desc&limit=1&select=*');
      if (Array.isArray(sessions) && sessions.length && sessions[0].verified) {
        sessionClientId = sessions[0].client_id || null;
        sessionRecord = sessions[0];
      }
    } catch(e) { console.log('[SESSION] lookup error:', e.message); }
  }

  for (const tc of toolCalls) {
      const name = tc?.function?.name;
      let args = {};
      try { args = typeof tc?.function?.arguments === 'string' ? JSON.parse(tc.function.arguments) : (tc?.function?.arguments || {}); } catch {}

      // Inject caller identity — AI never passes these, we read from call object
      args._caller_phone = callerPhone;
      args._client_id = sessionClientId;

      console.log('[TOOL]', name, JSON.stringify({...args, _caller_phone: callerPhone ? '[set]' : null}));
      let result;

      try {
        switch (name) {
          case 'search_record':       result = await handle_search_record(args); break;
          case 'check_availability':  result = await handle_check_availability(args); break;
          case 'book_appointment':    result = await handle_book_appointment(args); break;
          case 'get_my_appointments': result = await handle_get_my_appointments(args); break;
          case 'reschedule_appointment': result = await handle_reschedule_appointment(args); break;
          case 'cancel_appointment':  result = await handle_cancel_appointment(args); break;
          case 'upsert_lead': {
            const digits = (args.phone || '').replace(/\D/g,'');
            const e164 = digits.length===10 ? '+1'+digits : digits.length===11 ? '+'+digits : null;
            const existing = e164 ? await supaGet(`leads?phone_e164=eq.${encodeURIComponent(e164)}&limit=1&select=id`) : [];
            if (Array.isArray(existing) && existing.length) {
              await supaPatch(`leads?id=eq.${existing[0].id}`, { ...args, phone_e164: e164, updated_at: new Date().toISOString() });
              result = { success: true, lead_id: existing[0].id, action: 'updated' };
            } else {
              const created = await supaPost('leads', { ...args, phone_e164: e164, status:'new', pipeline_stage:'inquiry', source:'vapi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
              result = { success: true, lead_id: Array.isArray(created) ? created[0]?.id : null, action: 'created' };
            }
            await notifyTeamChat(`🔔 NEW LEAD — ${args.name || 'Unknown'} | ${args.phone} | Interest: ${args.offer_interest || 'not specified'}`);
            break;
          }
          default:
            result = { error: 'Unknown tool: ' + name };
        }
      } catch (e) {
        console.error('[TOOL ERROR]', name, e.message);
        result = { error: e.message };
      }

      results.push({ toolCallId: tc.id, result: JSON.stringify(result) });
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ results })
    };
  }

  // ── call-ended log ─────────────────────────────────────
  if (msgType === 'end-of-call-report' || msgType === 'call-ended') {
    const call = body?.message?.call || {};
    await supaPost('call_sessions', {
      call_id: call.id || null,
      caller_phone: call.customer?.number || null,
      duration: call.endedAt && call.startedAt ? Math.floor((new Date(call.endedAt)-new Date(call.startedAt))/1000) : null,
      ended_reason: call.endedReason || null,
      created_at: new Date().toISOString()
    }, 'return=minimal').catch(() => {});
    return { statusCode: 200, body: 'OK' };
  }

  return { statusCode: 200, body: 'OK' };
};
