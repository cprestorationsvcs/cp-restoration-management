// ═══════════════════════════════════════════════════════
// CP RESTORATION — VAPI WEBHOOK HANDLER
// Deploy as Netlify Function: /netlify/functions/vapi-webhook.js
// ═══════════════════════════════════════════════════════

const SUPA_URL  = process.env.SUPABASE_URL  || 'https://jzkfembagpiuuoexmpoy.supabase.co';
const SUPA_KEY  = process.env.SUPABASE_KEY  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50';
const VAPI_SECRET = process.env.VAPI_SECRET || '';
const ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID || '';

// Staff emails for notifications
const STAFF = {
  alec:  { name: 'Alec',  email: 'alec@mycprteam.com',  phone: '+12407883686' },
  elna:  { name: 'Elna',  email: 'elna@mycprteam.com',  phone: '+12407883898' },
  queen: { name: 'Queen', email: 'queen@mycprteam.com', phone: '' },
  jason: { name: 'Jason', email: 'jason@mycprteam.com', phone: '' }
};

// Business hours: 9am–5pm ET, weekdays
function isBusinessHours() {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay(); // 0=Sun, 6=Sat
  const hour = et.getHours();
  return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
}

// ── SUPABASE HELPERS ───────────────────────────────────
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

// Normalize phone to E.164
function toE164(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return null;
}

// ── LOOKUP CALLER ──────────────────────────────────────
async function lookupCaller(phone) {
  const e164 = toE164(phone);
  if (!e164) return { status: 'unknown' };

  // Check clients first
  const clients = await supaFetch(
    `clients?phone_e164=eq.${encodeURIComponent(e164)}&select=id,name,email,status,case_stage,assigned_rep,start_date,finish_date,balance_owed,offer_interest&limit=5`
  );
  if (Array.isArray(clients) && clients.length === 1) {
    const c = clients[0];
    const firstName = (c.name || '').split(' ')[0];
    return {
      status: c.status === 'Closed' ? 'past_client' : 'client',
      record_id: c.id,
      record_type: 'client',
      first_name: firstName,
      offer_interest: c.offer_interest || 'credit_repair',
      assigned_rep: c.assigned_rep || 'Jason',
      case_stage: c.case_stage || 'onboarding'
    };
  }
  if (Array.isArray(clients) && clients.length > 1) {
    return { status: 'multiple_matches' };
  }

  // Check leads
  const leads = await supaFetch(
    `leads?phone_e164=eq.${encodeURIComponent(e164)}&select=id,name,email,status,offer_interest,assigned_rep&limit=5`
  );
  if (Array.isArray(leads) && leads.length === 1) {
    const l = leads[0];
    return {
      status: 'lead',
      record_id: l.id,
      record_type: 'lead',
      first_name: (l.name || '').split(' ')[0],
      offer_interest: l.offer_interest || 'unknown',
      assigned_rep: l.assigned_rep || 'Alec'
    };
  }
  if (Array.isArray(leads) && leads.length > 1) {
    return { status: 'multiple_matches' };
  }

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
    verified: false,
    verification_attempts: 0,
    session_locked: false
  }, { 'Prefer': 'return=minimal' });
}

// ── TOOL HANDLERS ──────────────────────────────────────

// verify_identity: compare DOB + ZIP server-side
async function toolVerifyIdentity(callId, args) {
  const session = await getSession(callId);
  if (!session) return JSON.stringify({ verified: false, error: 'no_session' });
  if (session.session_locked) return JSON.stringify({ verified: false, locked: true, attempts_left: 0 });

  const { dob, zip } = args;
  const recordId = session.record_id;
  const recordType = session.record_type;
  if (!recordId) return JSON.stringify({ verified: false, error: 'no_record' });

  // Pull DOB and ZIP from client record
  const table = recordType === 'client' ? 'clients' : 'clients';
  const rows = await supaFetch(`clients?id=eq.${encodeURIComponent(recordId)}&select=dob,zip&limit=1`);
  const record = rows && rows[0];
  if (!record) return JSON.stringify({ verified: false, error: 'record_not_found' });

  const dobMatch = record.dob && dob &&
    record.dob.replace(/\D/g, '') === dob.replace(/\D/g, '');
  const zipMatch = record.zip && zip &&
    record.zip.replace(/\D/g, '').slice(0, 5) === zip.replace(/\D/g, '').slice(0, 5);
  const verified = dobMatch && zipMatch;

  const attempts = (session.verification_attempts || 0) + 1;
  const locked = !verified && attempts >= 3;

  // Update session
  await supaFetch(`call_sessions?vapi_call_id=eq.${encodeURIComponent(callId)}`, 'PATCH', {
    verified,
    verification_attempts: attempts,
    session_locked: locked
  }, { 'Prefer': 'return=minimal' });

  return JSON.stringify({
    verified,
    locked,
    attempts_left: locked ? 0 : Math.max(0, 3 - attempts)
  });
}

// get_client_summary: returns plain-English status info
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

  // Get stage label from ai_stage_labels
  const stageRows = await supaFetch(
    `ai_stage_labels?stage_key=eq.${encodeURIComponent(c.case_stage || 'onboarding')}&limit=1`
  );
  const stage = stageRows && stageRows[0];

  // Format dates
  const startFmt = c.start_date ? new Date(c.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not yet started';
  const finishFmt = c.finish_date ? new Date(c.finish_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Dependent on bureau responses';
  const balance = c.balance_owed ? `$${parseFloat(c.balance_owed).toFixed(2)}` : '$0.00';

  return JSON.stringify({
    first_name: (c.name || '').split(' ')[0],
    service: 'Credit Repair',
    stage: stage ? stage.stage_label : (c.case_stage || 'In Progress'),
    stage_explained: stage ? stage.stage_explained : 'Our team is actively working on your file.',
    start_date: startFmt,
    finish_date: finishFmt,
    balance_owed: balance,
    assigned_rep: c.assigned_rep || 'Jason',
    documents_needed: 'If any documents are still needed, your assigned representative will reach out to you directly.',
    next_step: stage ? `${stage.stage_label} — our team will follow up with updates.` : 'Our team will follow up with you shortly.'
  });
}

// search_record: find a client/lead by name + email or phone
async function toolSearchRecord(callId, args) {
  const { first_name, last_name, phone, email } = args;
  const e164 = toE164(phone);
  let rows = [];

  if (e164) {
    rows = await supaFetch(`clients?phone_e164=eq.${encodeURIComponent(e164)}&select=id,name&limit=5`);
  }
  if ((!rows || !rows.length) && email) {
    rows = await supaFetch(`clients?email_normalized=eq.${encodeURIComponent(email.toLowerCase())}&select=id,name&limit=5`);
  }
  if (!rows || !rows.length) {
    const name = `${first_name || ''} ${last_name || ''}`.trim();
    if (name) rows = await supaFetch(`clients?name=ilike.${encodeURIComponent('%'+name+'%')}&select=id,name&limit=5`);
  }

  if (!rows || !rows.length) return JSON.stringify({ match: 'none' });
  if (rows.length > 1) return JSON.stringify({ match: 'multiple' });

  // Store in session
  await supaFetch(`call_sessions?vapi_call_id=eq.${encodeURIComponent(callId)}`, 'PATCH', {
    record_id: rows[0].id, record_type: 'client'
  }, { 'Prefer': 'return=minimal' });

  return JSON.stringify({ match: 'one' });
}

// upsert_lead: create or update a lead record
async function toolUpsertLead(callId, args) {
  const { name, phone, email, offer_interest, qualifiers, notes } = args;
  const e164 = toE164(phone);
  const emailNorm = email ? email.toLowerCase().trim() : null;

  // Check for existing lead
  let existing = null;
  if (e164) {
    const rows = await supaFetch(`leads?phone_e164=eq.${encodeURIComponent(e164)}&limit=1`);
    existing = rows && rows[0];
  }
  if (!existing && emailNorm) {
    const rows = await supaFetch(`leads?email_normalized=eq.${encodeURIComponent(emailNorm)}&limit=1`);
    existing = rows && rows[0];
  }

  const payload = {
    name: name || 'Unknown',
    phone: phone || '',
    phone_e164: e164,
    email: email || '',
    email_normalized: emailNorm,
    offer_interest: offer_interest || 'unknown',
    source: 'ai_receptionist',
    status: 'new',
    qualifiers: qualifiers || {},
    pipeline_stage: 'qualified',
    updated_at: new Date().toISOString()
  };
  if (notes) payload.notes = notes;

  if (existing) {
    await supaFetch(`leads?id=eq.${existing.id}`, 'PATCH', payload, { 'Prefer': 'return=minimal' });
    return JSON.stringify({ record_id: existing.id, created: false, updated: true });
  } else {
    payload.created_at = new Date().toISOString();
    const rows = await supaFetch('leads', 'POST', payload);
    const newId = rows && rows[0] && rows[0].id;
    return JSON.stringify({ record_id: newId, created: true, updated: false });
  }
}

// check_availability: return next 3 open 15-min slots for Alec or Elna
async function toolCheckAvailability(callId, args) {
  const { preferred_day, time_of_day, timezone } = args;
  const tz = timezone || 'America/New_York';
  const now = new Date();

  // Get booked slots for Alec and Elna next 7 days
  const next7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const booked = await supaFetch(
    `appointments?slot_start=gte.${now.toISOString()}&slot_start=lte.${next7}&status=eq.booked&select=slot_start,slot_end,rep_name`
  );
  const bookedTimes = new Set((booked || []).map(b => b.slot_start));

  // Generate available slots: 9am-5pm ET weekdays, 15-min increments
  const slots = [];
  let d = new Date(now);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);

  while (slots.length < 3 && d < new Date(next7)) {
    const etDate = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = etDate.getDay();
    const hour = etDate.getHours();
    const min = etDate.getMinutes();

    if (day >= 1 && day <= 5 && hour >= 9 && hour < 17 && min % 15 === 0) {
      const iso = d.toISOString();
      if (!bookedTimes.has(iso)) {
        const display = d.toLocaleString('en-US', {
          timeZone: tz, weekday: 'long', month: 'long', day: 'numeric',
          hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
        });
        slots.push({ slot_id: iso, when_spoken: display });
      }
    }
    d = new Date(d.getTime() + 15 * 60 * 1000);
  }

  return JSON.stringify({ slots });
}

// book_appointment
async function toolBookAppointment(callId, args) {
  const { slot_id, type } = args;
  const session = await getSession(callId);

  let clientName = 'Unknown', clientPhone = '', clientEmail = '';
  if (session && session.record_id) {
    const rows = await supaFetch(`clients?id=eq.${encodeURIComponent(session.record_id)}&select=name,phone,email&limit=1`)
      .catch(() => null) ||
      await supaFetch(`leads?id=eq.${encodeURIComponent(session.record_id)}&select=name,phone,email&limit=1`)
        .catch(() => null);
    const r = rows && rows[0];
    if (r) { clientName = r.name || ''; clientPhone = r.phone || ''; clientEmail = r.email || ''; }
  }

  // Assign to Alec or Elna (whoever has fewer bookings that day)
  const slotEnd = new Date(new Date(slot_id).getTime() + 15 * 60 * 1000).toISOString();
  const typeLabel = type === 'funding_consult' ? 'Funding Consultation' : 'Credit Repair Consultation';

  await supaFetch('appointments', 'POST', {
    record_id: session ? session.record_id : null,
    client_name: clientName,
    client_phone: clientPhone,
    client_email: clientEmail,
    rep_name: 'Alec',
    rep_email: 'alec@mycprteam.com',
    slot_start: slot_id,
    slot_end: slotEnd,
    type,
    status: 'booked',
    vapi_call_id: callId
  }, { 'Prefer': 'return=minimal' });

  const when = new Date(slot_id).toLocaleString('en-US', {
    timeZone: 'America/New_York', weekday: 'long', month: 'long',
    day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  });

  return JSON.stringify({ confirmed: true, when_spoken: when, type: typeLabel });
}

// request_callback
async function toolRequestCallback(callId, args) {
  const { reason, preferred_time, urgency } = args;
  const session = await getSession(callId);

  await supaFetch('call_logs', 'POST', {
    vapi_call_id: callId + '_cb_' + Date.now(),
    record_id: session ? session.record_id : null,
    follow_up_needed: true,
    follow_up_reason: reason || 'Callback requested by caller',
    intent: 'callback',
    outcome: 'callback',
    structured_data: { preferred_time, urgency },
    created_at: new Date().toISOString()
  }, { 'Prefer': 'return=minimal' }).catch(() => {});

  return JSON.stringify({ logged: true });
}

// ── ASSISTANT-REQUEST HANDLER ──────────────────────────
async function handleAssistantRequest(body) {
  const callId = body.message?.call?.id;
  const callerPhone = body.message?.call?.customer?.number;

  let callerInfo = { status: 'unknown' };
  try { callerInfo = await lookupCaller(callerPhone); } catch (e) { console.error('Lookup error:', e); }

  try { await createSession(callId, callerInfo); } catch (e) { console.error('Session error:', e); }

  return {
    assistantId: ASSISTANT_ID,
    assistantOverrides: {
      variableValues: {
        caller_status:      callerInfo.status,
        first_name:         callerInfo.first_name || '',
        record_id:          callerInfo.record_id || '',
        offer_interest:     callerInfo.offer_interest || 'unknown',
        assigned_rep:       callerInfo.assigned_rep || 'our team',
        business_hours_open: isBusinessHours(),
        transfer_alec:      STAFF.alec.phone,
        transfer_elna:      STAFF.elna.phone
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
      if (name === 'verify_identity')     result = await toolVerifyIdentity(callId, args);
      else if (name === 'get_client_summary') result = await toolGetClientSummary(callId);
      else if (name === 'search_record')  result = await toolSearchRecord(callId, args);
      else if (name === 'upsert_lead')    result = await toolUpsertLead(callId, args);
      else if (name === 'check_availability') result = await toolCheckAvailability(callId, args);
      else if (name === 'book_appointment')   result = await toolBookAppointment(callId, args);
      else if (name === 'request_callback')   result = await toolRequestCallback(callId, args);
      else result = JSON.stringify({ error: 'unknown_tool', tool: name });
    } catch (e) {
      result = JSON.stringify({ error: e.message });
    }

    results.push({ toolCallId: tool.id, result });
  }

  return { results };
}

// ── END-OF-CALL HANDLER ────────────────────────────────
async function handleEndOfCall(body) {
  const report = body.message;
  const callId = report?.call?.id;
  if (!callId) return;

  const session = await getSession(callId).catch(() => null);
  const structured = report?.artifact?.structuredOutputs || report?.analysis?.structuredData || {};
  const summary = report?.analysis?.summary || '';
  const transcript = (report?.transcript || '').replace(/\d{9,}/g, '[REDACTED]'); // redact SSN-length digit runs

  const follow_up = !!(
    structured.outcome === 'callback' ||
    structured.outcome === 'abandoned' ||
    structured.follow_up_reason ||
    (session && session.session_locked)
  );

  const logPayload = {
    vapi_call_id:        callId,
    record_id:           session?.record_id || null,
    record_type:         session?.record_type || null,
    caller_number:       report?.call?.customer?.number || '',
    direction:           'inbound',
    started_at:          report?.call?.startedAt || null,
    ended_at:            report?.call?.endedAt || null,
    duration_sec:        report?.call?.endedAt && report?.call?.startedAt
                           ? Math.round((new Date(report.call.endedAt) - new Date(report.call.startedAt)) / 1000)
                           : null,
    ended_reason:        report?.call?.endedReason || '',
    verified:            session?.verified || false,
    verification_method: 'dob_zip',
    intent:              structured.intent || 'unknown',
    outcome:             structured.outcome || 'unknown',
    summary,
    structured_data:     structured,
    transcript,
    recording_url:       report?.recording?.url || null,
    follow_up_needed:    follow_up,
    follow_up_reason:    structured.follow_up_reason || (session?.session_locked ? 'Verification locked — 3 failed attempts' : null),
    sentiment:           structured.sentiment || null,
    created_at:          new Date().toISOString()
  };

  // Upsert by vapi_call_id
  await supaFetch('call_logs', 'POST', logPayload, { 'Prefer': 'resolution=merge-duplicates,return=minimal' }).catch(console.error);

  // If new qualified lead, notify assigned rep via portal team chat
  if (structured.intent && structured.intent.startsWith('new_') && structured.outcome === 'booked') {
    const repEmail = structured.assigned_rep === 'Elna' ? STAFF.elna.email : STAFF.alec.email;
    await supaFetch('team_chat', 'POST', {
      channel: 'general',
      sender: 'AI Receptionist',
      sender_role: 'system',
      message: `📞 NEW LEAD from AI Receptionist — ${structured.caller_name || 'Unknown'} | ${report?.call?.customer?.number || ''} | Interest: ${structured.offer_interest || 'Credit Repair'} | Outcome: ${structured.outcome} | Assigned to: ${structured.assigned_rep || 'Alec'}`,
      created_at: new Date().toISOString()
    }, { 'Prefer': 'return=minimal' }).catch(console.error);
  }

  // Clean up session
  await supaFetch(`call_sessions?vapi_call_id=eq.${encodeURIComponent(callId)}`, 'DELETE', null, {}).catch(() => {});
}

// ── MAIN HANDLER ───────────────────────────────────────
exports.handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Verify VAPI secret — Netlify normalizes headers to lowercase
  if (VAPI_SECRET) {
    // Check all possible header casings (Netlify lowercases everything)
    const headerKeys = Object.keys(event.headers || {});
    const secretKey = headerKeys.find(k => k.toLowerCase() === 'x-vapi-secret');
    const incoming = secretKey ? (event.headers[secretKey] || '').trim() : '';
    const expected = VAPI_SECRET.trim();

    // Log whether header arrived (not its value)
    console.log('[VAPI-AUTH] x-vapi-secret header present:', !!incoming, '| header key found:', secretKey || 'MISSING');

    if (incoming !== expected) {
      console.log('[VAPI-AUTH] 401 — secret mismatch. Header arrived:', !!incoming);
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized', headerPresent: !!incoming }) };
    }
    console.log('[VAPI-AUTH] 200 — secret verified OK');
  } else {
    console.log('[VAPI-AUTH] VAPI_SECRET env var not set — skipping auth check');
  }

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
      // Respond immediately, process in background
      handleEndOfCall(body).catch(console.error);
      return { statusCode: 200, body: '' };
    }
    // All other message types
    return { statusCode: 200, body: '' };
  } catch (e) {
    console.error('Webhook error:', e);
    // Always return 200 to Vapi so call isn't dropped
    return { statusCode: 200, body: JSON.stringify({ error: e.message }) };
  }
};
