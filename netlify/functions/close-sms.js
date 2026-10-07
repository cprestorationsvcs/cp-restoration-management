const https = require('https');

const CLOSE_API_KEY = 'api_312FaoQHfbRRZ1iI0q0f5D.18sSZzANivUMiKRjU8kbYg';
const SUPA_URL = 'https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50';

// Rep number assignments
const REP_NUMBERS = {
  "jason@mycprteam.com": "+17546004934",
  "queen@mycprteam.com": "+17547148877",
  "bukunmi@mycprteam.com": "+17543453951",
  "elna@mycprteam.com": "+17547048665",
  "jonah@mycprteam.com": "+17542982046",
  "alec@mycprteam.com": "+17543344660",
  "anthon@mycprteam.com": "+17546004934"
};

function closeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(CLOSE_API_KEY + ':').toString('base64');
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.close.com',
      path: '/api/v1' + path,
      method,
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(data ? {'Content-Length': Buffer.byteLength(data)} : {})
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({status: res.statusCode, body: JSON.parse(d)}); }
        catch(e) { resolve({status: res.statusCode, body: d}); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function supaPost(table, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const opts = {
      hostname: 'jzkfembagpiuuoexmpoy.supabase.co',
      path: '/rest/v1/' + table,
      method: 'POST',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + SUPA_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return {statusCode:200,headers,body:''};

  try {
    const body = JSON.parse(event.body || '{}');
    const action = body.action || event.queryStringParameters?.action;

    // ── SEND SMS ──
    if (action === 'send') {
      const { to, message, from_email, client_id, client_name } = body;
      if (!to || !message) return {statusCode:400,headers,body:JSON.stringify({error:'Missing to or message'})}; 

      const fromNumber = REP_NUMBERS[from_email] || REP_NUMBERS['jason@mycprteam.com'];

      // Send via Close
      const result = await closeRequest('POST', '/activity/sms/', {
        _type: 'SMS',
        direction: 'outbound',
        phone: to,
        local_phone: fromNumber,
        text: message,
        status: 'sent'
      });

      // Save to Supabase sms_inbox
      await supaPost('sms_inbox', {
        direction: 'outbound',
        from_number: fromNumber,
        to_number: to,
        message,
        client_id: client_id || null,
        client_name: client_name || null,
        sent_by: from_email || 'system',
        status: 'sent',
        created_at: new Date().toISOString()
      });

      return {statusCode:200,headers,body:JSON.stringify({success:true, result:result.body})};
    }

    // ── RECEIVE WEBHOOK (from Close) ──
    if (action === 'webhook' || event.httpMethod === 'POST' && !body.action) {
      const event_type = body.event?.type || body.event_type;
      if (event_type === 'create' && body.data?._type === 'SMS' && body.data?.direction === 'inbound') {
        const sms = body.data;
        const from = sms.phone || sms.remote_phone;
        const text = sms.text || sms.body || '';
        const toNum = sms.local_phone || '';
        const now = new Date().toISOString();

        // Save to sms_inbox
        await supaPost('sms_inbox', {
          direction: 'inbound',
          from_number: from,
          to_number: toNum,
          message: text,
          status: 'unread',
          created_at: now
        });

        // Also add to call queue as HIGH priority
        await supaPost('requests', {
          type: 'call_queue',
          client_name: from,
          client_phone: from,
          priority: 'high',
          assigned_to: 'Any Available',
          reason: 'Inbound SMS received: ' + text.substring(0, 200),
          notes: 'Client texted in via Close SMS. Reply from SMS Inbox.',
          status: 'pending',
          created_at: now
        });
      }
      return {statusCode:200,headers,body:JSON.stringify({received:true})};
    }

    // ── GET MESSAGES ──
    if (action === 'inbox') {
      const result = await closeRequest('GET', '/activity/sms/?_limit=50&direction=inbound');
      return {statusCode:200,headers,body:JSON.stringify(result.body)};
    }

    return {statusCode:400,headers,body:JSON.stringify({error:'Unknown action'})}; 

  } catch(e) {
    return {statusCode:500,headers,body:JSON.stringify({error:e.message})};
  }
};
