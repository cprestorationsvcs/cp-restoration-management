// ═══════════════════════════════════════════════════════
// CP RESTORATION — VAPI WEBHOOK HANDLER v2
// ═══════════════════════════════════════════════════════

const SUPA_URL    = process.env.SUPABASE_URL;
const SUPA_KEY    = process.env.SUPABASE_KEY;   // server-side service key only
const VAPI_SECRET = process.env.VAPI_SECRET;
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID || '';

// FIX #3: Fail hard if env vars missing
if (!SUPA_URL || !SUPA_KEY) {
  console.error('[BOOT] FATAL: SUPABASE_URL or SUPABASE_KEY env var not set');
}

const STAFF = {
  alec:  { name: 'Alec',  email: 'alec@mycprteam.com',  phone: '+12407883686' },
  elna:  { name: 'Elna',  email: 'elna@mycprteam.com',  phone: '+12407883898' },
  queen: { name: 'Queen', email: 'queen@mycprteam.com', phone: '' },
  jason: { name: 'Jason', email: 'jason@mycprteam.com', phone: '' }
};

function isBusinessHours() {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const hour = et.getHours();
  return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
}

// ── SUPABASE HELPER ────────────────────────────────────
async function supaFetch(path, method = 'GET', body = null, extra = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...extra
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok && res.status !== 204) {
    const txt = await res.text();
    throw new Error(`Supabase ${method} ${path}: ${res.status} ${txt}`);
  }
  try { return await res.json(); } catch { return null; }
}

function toE164(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return null;
}

// FIX #5: Convert MM/DD/YYYY → YYYY-MM-DD for DB comparison
function normalizeDob(dob) {
  if (!dob) return '';
  const s = dob.trim();
  // MM/DD/YYYY → YYYY-MM-DD
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[1].padStart(2,'0')}-${m1[2].padStart(2,'0')}`;
  // Already YYYY-MM-DD
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
  // Strip all non-digits and compare raw
  return s.replace(/\D/g, '');
}

function dobMatch(stored, incoming) {
  if (!stored || !incoming) return false;
  const a = normalizeDob(stored).replace(/\D/g,'');
  const b = normalizeDob(incoming).replace(/\D/g,'');
  return a === b && a.length >= 6;
}

// ── CALLER LOOKUP ──────────────────────────────────────
async function lookupCaller(phone) {
  const e164 = toE164(phone);
  if (!e164) return { status: 'unknown' };
  const clients = await supaFetch(
    `clients?phone_e164=eq.${encodeURIComponent(e164)}&select=id,name,email,status,case_stage,assigned_rep,start_date,finish_date,balance_owed,offer_interest&limit=5`
  );
  if (Array.isArray(clients) && clients.length === 1) {
    const c = clients[0];
    return {
      status: c.status === 'Closed' ? 'past_client' : 'client',
      record_id: c.id, record_type: 'client',
      first_name: (c.name || '').split(' ')[0],
      offer_interest: c.offer_interest || 'credit_repair',
      assigned_rep: c.assigned_rep || 'Jason',
      case_stage: c.case_stage || 'onboarding'
    };
  }
  if (Array.isArray(clients) && clients.length > 1) return { status: 'multiple_matches' };
  const leads = await supaFetch(
    `leads?phone_e164=eq.${encodeURIComponent(e164)}&select=id,name,email,status,offer_interest,assigned_rep&limit=5`
  );
  if (Array.isArray(leads) && leads.length === 1) {
    const l = leads[0];
    return {
      status: 'lead', record_id: l.id, record_type: 'lead',
      first_name: (l.name || '').split(' ')[0],
      offer_interest: l.offer_interest || 'unknown',
      assigned_rep: l.assigned_rep || 'Alec'
    };
  }
  if (Array.isArray(leads) && leads.length > 1) return { status: 'multiple_matches' };
  return { status: 'unknown' };
}

// ── SESSION HELPERS ────────────────────────────────────
async function getSession(callId) {
  const rows = await supaFetch(`call_sessions?vapi_call_id=eq.${encodeURIComponent(callId)}&limit=1`);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function createSession(callId, callerInfo) {
  await supaFetch('call_sessions', 'POST', {
    vapi_call_id: callId,
    record_id: callerInfo.record_id || null,
    record_type: callerInfo.record_type || null,
    caller_phone: callerInfo.caller_phone || null,
    verified: false,
    verification_attempts: 0,
    session_locked: false
  }, { 'Prefer': 'return=minimal' });
}

// ── TOOL: verify_identity ──────────────────────────────
async function toolVerifyIdentity(callId, args) {
  const session = await getSession(callId);
  if (!session) return JSON.stringify({ verified: false, error: 'no_session' });
  if (session.session_locked) return JSON.stringify({ verified: false, locked: true, attempts_left: 0 });
  const { dob, zip } = args;
  const recordId = session.record_id;
  if (!recordId) return JSON.stringify({ verified: false, error: 'no_record' });
  const rows = await supaFetch(`clients?id=eq.${encodeURIComponent(recordId)}&select=dob,zip&limit=1`);
  const record = rows && rows[0];
  if (!record) return JSON.stringify({ verified: false, error: 'record_not_found' });
  // FIX #5: normalize DOB before comparing
  const dm = dobMatch(record.dob, dob);
  const zm = record.zip && zip && record.zip.replace(/\D/g,'').slice(0,5) === zip.replace(/\D/g,'').slice(0,5);
  const verified = dm && zm;
  const attempts = (session.verification_attempts || 0) + 1;
  const locked = !verified && attempts >= 3;
  await supaFetch(`call_sessions?vapi_call_id=eq.${encodeURIComponent(callId)}`, 'PATCH', {
    verified, verification_attempts: attempts, session_locked: locked
  }, { 'Prefer': 'return=minimal' });
  return JSON.stringify({ verified, locked, attempts_left: locked ? 0 : Math.max(0, 3 - attempts) });
}

// ── TOOL: get_client_summary ───────────────────────────
async function toolGetClientSummary(callId) {
  const session = await getSession(callId);
  if (!session || !session.verified) {
    return JSON.stringify({ error: 'not_verified', message: 'Identity must be verified before file details can be shared.' });
  }
  const rows = await supaFetch(
    `clients?id=eq.${encodeURIComponent(session.record_id)}&select=name,case_stage,start_date,finish_date,balance_owed,assigned_rep,package,notes&limit=1`
  );
  const c = rows && rows[0];
  if (!c) return JSON.stringify({ error: 'not_found' });
  const stageRows = await supaFetch(`ai_stage_labels?stage_key=eq.${encodeURIComponent(c.case_stage || 'onboarding')}&limit=1`);
  const stage = stageRows && stageRows[0];
  const startFmt = c.start_date ? new Date(c.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not yet started';
  const finishFmt = c.finish_date ? new Date(c.finish_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Dependent on bureau responses';
  return JSON.stringify({
    first_name: (c.name || '').split(' ')[0],
    service: 'Credit Repair',
    stage: stage ? stage.stage_label : (c.case_stage || 'In Progress'),
    stage_explained: stage ? stage.stage_explained : 'Our team is actively working on your file.',
    start_date: startFmt, finish_date: finishFmt,
    balance_owed: c.balance_owed ? `$${parseFloat(c.balance_owed).toFixed(2)}` : '$0.00',
    assigned_rep: c.assigned_rep || 'Jason',
    next_step: stage ? `${stage.stage_label} — our team will follow up with updates.` : 'Our team will follow up with you shortly.'
  });
}

// FIX #1: search_record resets verified status when switching records
async function toolSearchRecord(callId, args) {
  const { first_name, last_name, phone, email } = args;
  const e164 = toE164(phone);
  let rows = [];
  if (e164) rows = await supaFetch(`clients?phone_e164=eq.${encodeURIComponent(e164)}&select=id,name&limit=5`);
  if ((!rows || !rows.length) && email) rows = await supaFetch(`clients?email_normalized=eq.${encodeURIComponent(email.toLowerCase())}&select=id,name&limit=5`);
  if (!rows || !rows.length) {
    const name = `${first_name || ''} ${last_name || ''}`.trim();
    if (name) rows = await supaFetch(`clients?name=ilike.${encodeURIComponent('%'+name+'%')}&select=id,name&limit=5`);
  }
  if (!rows || !rows.length) return JSON.stringify({ match: 'none' });
  if (rows.length > 1) return JSON.stringify({ match: 'multiple' });
  // FIX #1: reset verified + attempts when switching to a different record
  const session = await getSession(callId);
  const switchingRecord = session && session.record_id && session.record_id !== rows[0].id;
  await supaFetch(`call_sessions?vapi_call_id=eq.${encodeURIComponent(callId)}`, 'PATCH', {
    record_id: rows[0].id,
    record_type: 'client',
    ...(switchingRecord ? { verified: false, verification_attempts: 0, session_locked: false } : {})
  }, { 'Prefer': 'return=minimal' });
  return JSON.stringify({ match: 'one', switched: switchingRecord || false });
}

// FIX #4: upsert_lead saves lead ID to session
async function toolUpsertLead(callId, args) {
  const { name, phone, email, offer_interest, qualifiers, notes } = args;
  const e164 = toE164(phone);
  const emailNorm = email ? email.toLowerCase().trim() : null;
  let existing = null;
  if (e164) { const r = await supaFetch(`leads?phone_e164=eq.${encodeURIComponent(e164)}&limit=1`); existing = r && r[0]; }
  if (!existing && emailNorm) { const r = await supaFetch(`leads?email_normalized=eq.${encodeURIComponent(emailNorm)}&limit=1`); existing = r && r[0]; }
  const payload = {
    name: name || 'Unknown', phone: phone || '', phone_e164: e164,
    email: email || '', email_normalized: emailNorm,
    offer_interest: offer_interest || 'unknown', source: 'ai_receptionist',
    status: 'new', qualifiers: qualifiers || {}, pipeline_stage: 'qualified',
    updated_at: new Date().toISOString()
  };
  if (notes) payload.notes = notes;
  let leadId;
  if (existing) {
    await supaFetch(`leads?id=eq.${existing.id}`, 'PATCH', payload, { 'Prefer': 'return=minimal' });
    leadId = existing.id;
  } else {
    payload.created_at = new Date().toISOString();
    const rows = await supaFetch('leads', 'POST', payload);
    leadId = rows && rows[0] && rows[0].id;
  }
  // FIX #4: save lead ID to session so appointments link correctly
  if (leadId) {
    await supaFetch(`call_sessions?vapi_call_id=eq.${encodeURIComponent(callId)}`, 'PATCH', {
      record_id: leadId, record_type: 'lead'
    }, { 'Prefer': 'return=minimal' }).catch(() => {});
  }
  return JSON.stringify({ record_id: leadId, created: !existing, updated: !!existing });
}

// ── CALENDAR: assign rep with fewest bookings that day ─
async function assignRep(slotStart) {
  const dayStart = new Date(slotStart);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(slotStart);
  dayEnd.setHours(23, 59, 59, 999);
  const booked = await supaFetch(
    `appointments?slot_start=gte.${dayStart.toISOString()}&slot_start=lte.${dayEnd.toISOString()}&status=eq.booked&select=rep_name`
  ).catch(() => []);
  const counts = { Alec: 0, Elna: 0 };
  (booked || []).forEach(b => { if (counts[b.rep_name] !== undefined) counts[b.rep_name]++; });
  return counts.Alec <= counts.Elna
    ? { name: 'Alec', email: 'alec@mycprteam.com' }
    : { name: 'Elna', email: 'elna@mycprteam.com' };
}

// FIX calendar rules 1-5: check_availability respects preferred_day, time_of_day, no double-booking by time
async function toolCheckAvailability(callId, args) {
  const { preferred_day, time_of_day, timezone } = args;
  const tz = timezone || 'America/New_York';
  const now = new Date();
  const next7End = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Get ALL booked slot times (compare by ISO string millisecond-precision)
  const booked = await supaFetch(
    `appointments?slot_start=gte.${now.toISOString()}&slot_start=lte.${next7End.toISOString()}&status=eq.booked&select=slot_start,rep_name`
  ).catch(() => []);

  // Build per-rep booked sets
  const bookedAlec = new Set();
  const bookedElna = new Set();
  (booked || []).forEach(b => {
    const t = new Date(b.slot_start).getTime();
    if (b.rep_name === 'Alec') bookedAlec.add(t);
    if (b.rep_name === 'Elna') bookedElna.add(t);
  });

  // Time-of-day preference filter
  let hourMin = 9, hourMax = 17;
  if (time_of_day === 'morning')   { hourMin = 9;  hourMax = 12; }
  if (time_of_day === 'afternoon') { hourMin = 12; hourMax = 17; }

  // preferred_day filter: parse "Monday", "tomorrow", "next Tuesday" etc.
  let preferDay = null;
  if (preferred_day) {
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const pd = preferred_day.toLowerCase().trim();
    if (pd === 'tomorrow') {
      preferDay = new Date(now); preferDay.setDate(preferDay.getDate() + 1);
    } else {
      const idx = days.findIndex(d => pd.includes(d));
      if (idx >= 0) {
        const d = new Date(now);
        const diff = (idx - d.getDay() + 7) % 7 || 7;
        d.setDate(d.getDate() + diff);
        preferDay = d;
      }
    }
  }

  const slots = [];
  let d = new Date(now);
  // Start at next 15-min boundary
  d.setSeconds(0, 0);
  const rem = d.getMinutes() % 15;
  if (rem) d.setMinutes(d.getMinutes() + (15 - rem));

  while (slots.length < 3 && d < next7End) {
    const etDate = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = etDate.getDay();
    const hour = etDate.getHours();
    const min = etDate.getMinutes();
    const t = d.getTime();

    // Weekdays only
    if (day >= 1 && day <= 5 && hour >= hourMin && hour < hourMax && min % 15 === 0) {
      // preferred_day filter
      const dayMatch = !preferDay || (
        etDate.getDate() === preferDay.getDate() &&
        etDate.getMonth() === preferDay.getMonth()
      );
      if (dayMatch) {
        // At least one rep free?
        const alecFree = !bookedAlec.has(t);
        const elnaFree = !bookedElna.has(t);
        if (alecFree || elnaFree) {
          const display = d.toLocaleString('en-US', {
            timeZone: tz, weekday: 'long', month: 'long', day: 'numeric',
            hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
          });
          slots.push({ slot_id: d.toISOString(), when_spoken: display });
        }
      }
    }
    d = new Date(d.getTime() + 15 * 60 * 1000);
  }

  return JSON.stringify({ slots });
}

// FIX calendar rules 1,3,6,7: book_appointment assigns correctly, links lead, notifies both reps
async function toolBookAppointment(callId, args) {
  const { slot_id, type } = args;
  const session = await getSession(callId);

  // FIX #6: resolve client/lead info from session (which now has lead ID from upsertLead)
  let clientName = 'Unknown', clientPhone = '', clientEmail = '';
  if (session && session.record_id) {
    const table = session.record_type === 'lead' ? 'leads' : 'clients';
    const rows = await supaFetch(`${table}?id=eq.${encodeURIComponent(session.record_id)}&select=name,phone,email&limit=1`).catch(() => null);
    const r = rows && rows[0];
    if (r) { clientName = r.name || ''; clientPhone = r.phone || ''; clientEmail = r.email || ''; }
  }
  // Fallback to caller phone from session
  if (!clientPhone && session && session.caller_phone) clientPhone = session.caller_phone;

  const slotStart = new Date(slot_id);
  const slotEnd = new Date(slotStart.getTime() + 15 * 60 * 1000).toISOString();

  // FIX calendar rule 1: assign rep with fewer bookings that day
  const rep = await assignRep(slot_id);
  const typeLabel = type === 'funding_consult' ? 'Funding Consultation' : 'Credit Repair Consultation';

  await supaFetch('appointments', 'POST', {
    record_id: session ? session.record_id : null,
    record_type: session ? session.record_type : null,
    client_name: clientName,
    client_phone: clientPhone,
    client_email: clientEmail,
    service_type: typeLabel,         // FIX calendar rule 3: store type label
    rep_name: rep.name,
    rep_email: rep.email,
    slot_start: slot_id,
    slot_end: slotEnd,
    type,
    status: 'booked',
    vapi_call_id: callId
  }, { 'Prefer': 'return=minimal' });

  const when = slotStart.toLocaleString('en-US', {
    timeZone: 'America/New_York', weekday: 'long', month: 'long',
    day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  });

  // FIX #7: notify BOTH Alec and Elna in portal team_chat for any booking
  const chatMsg = `📅 APPOINTMENT BOOKED — ${typeLabel} | Client: ${clientName} | Phone: ${clientPhone} | Email: ${clientEmail || 'N/A'} | When: ${when} | Assigned to: ${rep.name}`;
  await supaFetch('team_chat', 'POST', {
    channel: 'general', sender: 'AI Receptionist', sender_role: 'system',
    message: chatMsg, created_at: new Date().toISOString()
  }, { 'Prefer': 'return=minimal' }).catch(() => {});

  return JSON.stringify({ confirmed: true, when_spoken: when, type: typeLabel, assigned_rep: rep.name });
}

// FIX #4 + #7: request_callback stores caller phone and notifies team
async function toolRequestCallback(callId, args) {
  const { reason, preferred_time, urgency } = args;
  const session = await getSession(callId);
  const callerPhone = session && session.caller_phone ? session.caller_phone : '';

  await supaFetch('call_logs', 'POST', {
    vapi_call_id: callId + '_cb_' + Date.now(),
    record_id: session ? session.record_id : null,
    record_type: session ? session.record_type : null,
    caller_number: callerPhone,   // FIX #4: store caller's number
    follow_up_needed: true,
    follow_up_reason: reason || 'Callback requested by caller',
    intent: 'callback',
    outcome: 'callback',
    structured_data: { preferred_time, urgency, caller_phone: callerPhone },
    created_at: new Date().toISOString()
  }, { 'Prefer': 'return=minimal' }).catch(() => {});

  // FIX #7: notify team for callbacks too (not just booked outcomes)
  const chatMsg = `📞 CALLBACK REQUESTED — Caller: ${callerPhone || 'Unknown'} | Reason: ${reason || 'Not specified'} | Preferred time: ${preferred_time || 'Not specified'} | Urgency: ${urgency || 'normal'}`;
  await supaFetch('team_chat', 'POST', {
    channel: 'general', sender: 'AI Receptionist', sender_role: 'system',
    message: chatMsg, created_at: new Date().toISOString()
  }, { 'Prefer': 'return=minimal' }).catch(() => {});

  return JSON.stringify({ logged: true });
}

// ── ASSISTANT-REQUEST HANDLER ──────────────────────────
async function handleAssistantRequest(body) {
  const callId = body.message?.call?.id;
  const callerPhone = body.message?.call?.customer?.number;
  let callerInfo = { status: 'unknown' };
  try { callerInfo = await lookupCaller(callerPhone); } catch (e) { console.error('Lookup error:', e); }
  // FIX #4: store caller phone on session
  callerInfo.caller_phone = callerPhone || null;
  try { await createSession(callId, callerInfo); } catch (e) { console.error('Session error:', e); }
  return {
    assistantId: ASSISTANT_ID,
    assistantOverrides: {
      variableValues: {
        caller_status:       callerInfo.status,
        first_name:          callerInfo.first_name || '',
        record_id:           callerInfo.record_id || '',
        offer_interest:      callerInfo.offer_interest || 'unknown',
        assigned_rep:        callerInfo.assigned_rep || 'our team',
        business_hours_open: isBusinessHours(),
        transfer_alec:       STAFF.alec.phone,
        transfer_elna:       STAFF.elna.phone
      }
    }
  };
}

// ── TOOL-CALLS HANDLER ─────────────────────────────────
async function handleToolCalls(body) {
  const callId = body.message?.call?.id;
  const tools = body.message?.toolCallList || [];
  const results = [];
  for (const tool of tools) {
    const name = tool.function?.name;
    const args = tool.function?.arguments || {};
    let result = '{}';
    try {
      if (name === 'verify_identity')      result = await toolVerifyIdentity(callId, args);
      else if (name === 'get_client_summary') result = await toolGetClientSummary(callId);
      else if (name === 'search_record')   result = await toolSearchRecord(callId, args);
      else if (name === 'upsert_lead')     result = await toolUpsertLead(callId, args);
      else if (name === 'check_availability') result = await toolCheckAvailability(callId, args);
      else if (name === 'book_appointment') result = await toolBookAppointment(callId, args);
      else if (name === 'request_callback') result = await toolRequestCallback(callId, args);
      else result = JSON.stringify({ error: 'unknown_tool', tool: name });
    } catch (e) {
      console.error(`[TOOL] ${name} error:`, e.message);
      result = JSON.stringify({ error: e.message });
    }
    results.push({ toolCallId: tool.id, result });
  }
  return { results };
}

// ── END-OF-CALL HANDLER ────────────────────────────────
// FIX #6: log synchronously before returning so Netlify doesn't cut it off
async function handleEndOfCall(body) {
  const report = body.message;
  const callId = report?.call?.id;
  if (!callId) return;
  const session = await getSession(callId).catch(() => null);
  const structured = report?.artifact?.structuredOutputs || report?.analysis?.structuredData || {};
  const summary = report?.analysis?.summary || '';
  const transcript = (report?.transcript || '').replace(/\d{9,}/g, '[REDACTED]');
  const follow_up = !!(structured.outcome === 'callback' || structured.outcome === 'abandoned' || structured.follow_up_reason || (session && session.session_locked));
  const logPayload = {
    vapi_call_id: callId,
    record_id: session?.record_id || null,
    record_type: session?.record_type || null,
    caller_number: report?.call?.customer?.number || '',
    direction: 'inbound',
    started_at: report?.call?.startedAt || null,
    ended_at: report?.call?.endedAt || null,
    duration_sec: report?.call?.endedAt && report?.call?.startedAt ? Math.round((new Date(report.call.endedAt) - new Date(report.call.startedAt)) / 1000) : null,
    ended_reason: report?.call?.endedReason || '',
    verified: session?.verified || false,
    verification_method: 'dob_zip',
    intent: structured.intent || 'unknown',
    outcome: structured.outcome || 'unknown',
    summary, structured_data: structured, transcript,
    recording_url: report?.recording?.url || null,
    follow_up_needed: follow_up,
    follow_up_reason: structured.follow_up_reason || (session?.session_locked ? 'Verification locked — 3 failed attempts' : null),
    sentiment: structured.sentiment || null,
    created_at: new Date().toISOString()
  };
  // FIX #6: await the log write before returning
  await supaFetch('call_logs', 'POST', logPayload, { 'Prefer': 'resolution=merge-duplicates,return=minimal' }).catch(console.error);
  // FIX #7: notify for all outcomes that need follow-up
  if (follow_up || structured.outcome === 'booked') {
    const msg = `📞 ${structured.outcome === 'booked' ? 'BOOKING' : 'FOLLOW-UP NEEDED'} — Caller: ${report?.call?.customer?.number || 'Unknown'} | Intent: ${structured.intent || 'unknown'} | Outcome: ${structured.outcome || 'unknown'} | Summary: ${summary.slice(0, 100)}`;
    await supaFetch('team_chat', 'POST', { channel: 'general', sender: 'AI Receptionist', sender_role: 'system', message: msg, created_at: new Date().toISOString() }, { 'Prefer': 'return=minimal' }).catch(console.error);
  }
  await supaFetch(`call_sessions?vapi_call_id=eq.${encodeURIComponent(callId)}`, 'DELETE', null, {}).catch(() => {});
}

// ── MAIN HANDLER ───────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // FIX #2: reject if VAPI_SECRET not set
  if (!VAPI_SECRET) {
    console.error('[VAPI-AUTH] VAPI_SECRET env var not set — rejecting all requests');
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized', reason: 'Secret not configured' }) };
  }

  const headerKeys = Object.keys(event.headers || {});
  const secretKey = headerKeys.find(k => k.toLowerCase() === 'x-vapi-secret');
  const incoming = secretKey ? (event.headers[secretKey] || '').trim() : '';
  const expected = VAPI_SECRET.trim();
  console.log('[VAPI-AUTH] x-vapi-secret header present:', !!incoming, '| header key found:', secretKey || 'MISSING');
  if (incoming !== expected) {
    console.log('[VAPI-AUTH] 401 — secret mismatch. Header arrived:', !!incoming);
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized', headerPresent: !!incoming }) };
  }
  console.log('[VAPI-AUTH] 200 — secret verified OK');

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: 'Bad Request' }; }

  const msgType = body.message?.type;
  try {
    if (msgType === 'assistant-request') {
      const result = await handleAssistantRequest(body);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result) };
    }
    if (msgType === 'tool-calls') {
      const result = await handleToolCalls(body);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result) };
    }
    if (msgType === 'end-of-call-report') {
      // FIX #6: await the log so Netlify doesn't kill it before it finishes
      await handleEndOfCall(body);
      return { statusCode: 200, body: '' };
    }
    return { statusCode: 200, body: '' };
  } catch (e) {
    console.error('Webhook error:', e);
    return { statusCode: 200, body: JSON.stringify({ error: e.message }) };
  }
};
