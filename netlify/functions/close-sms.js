const https = require('https');

const CLOSE_API_KEY = 'api_312FaoQHfbRRZ1iI0q0f5D.18sSZzANivUMiKRjU8kbYg';
const SUPA_URL = 'https://jzkfembagpiuuoexmpoy.supabase.co/rest/v1';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50';

const REP_NUMBERS = {
  'jason@mycprteam.com':   '+17546004934',
  'queen@mycprteam.com':   '+17547148877',
  'bukunmi@mycprteam.com': '+17543453951',
  'elna@mycprteam.com':    '+17547048665',
  'jonah@mycprteam.com':   '+17542982046',
  'alec@mycprteam.com':    '+17543344660',
  'anthon@mycprteam.com':  '+17546004934'
};

const PHONE_IDS = {
  '+17546004934': 'phon_juCP7Mny5wqanNYNFVuASq3esj0vanPKQ6LcJFV1Vqe',
  '+17547148877': 'phon_duuqMuG4t8DrDZSMW4C6I2oCC1eubLLsBcSXcUOuwvO',
  '+17543453951': 'phon_YC8IjXje1RZT209WWCnXPKnqwHPhe3L3v1Fd7YdMWv6',
  '+17547048665': 'phon_WEMnX6aROPOClXIe58rXTiCSgSpaUVN7vmHqoFzme7c',
  '+17542982046': 'phon_nCgFxNpnC3UvEYSOSz9RS0m4wneREq1u7u761c4qESH',
  '+17543344660': 'phon_6USAFBsCJYOKRpHIpImgkRYHM6UCuGNtuUQsvdRCji3'
};

async function supaPost(table, payload) {
  return new Promise((resolve) => {
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
      res.on('end', () => resolve({status: res.statusCode, body: d}));
    });
    req.on('error', e => resolve({status:500,body:e.message}));
    req.write(data);
    req.end();
  });
}

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
        try { resolve({status:res.statusCode,body:JSON.parse(d)}); }
        catch(e) { resolve({status:res.statusCode,body:d}); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
  if (event.httpMethod === 'OPTIONS') return {statusCode:200,headers,body:''};

  try {
    const rawBody = event.body || '{}';
    const body = JSON.parse(rawBody);
    const action = body.action || (event.queryStringParameters && event.queryStringParameters.action);

    // ── TEST SUPABASE ──
    if (action === 'test') {
      const r = await supaPost('sms_inbox', {
        direction:'inbound', from_number:'+15555555555',
        to_number:'+17546004934',
        message:'TEST - ' + new Date().toISOString(),
        status:'unread', created_at:new Date().toISOString()
      });
      return {statusCode:200,headers,body:JSON.stringify({test:true,supabase_status:r.status,supabase_body:r.body})};
    }

    // ── DEBUG: save raw webhook body ──
    if (action === 'debug') {
      return {statusCode:200,headers,body:JSON.stringify({debug:true,last_body:'check Netlify function logs'})};
    }

    // ── INBOUND WEBHOOK FROM CLOSE ──
    if (event.httpMethod === 'POST' && !action) {
      // Save raw body to sms_inbox as debug message so we can see what Close sends
      console.log('CLOSE WEBHOOK RAW:', rawBody.substring(0, 1000));

      const data = body.data || body.model || {};
      const evtType = (body.event && body.event.object_type) || '';

      // Extract message text — try every possible field Close might use
      const msgText = data.text || data.body || data.message || data.content ||
                      data.activity_text || body.text || body.message || '';

      // Extract phone numbers
      const from = data.remote_phone || data.from_phone || data.phone ||
                   data.from || body.remote_phone || '';
      const toNum = data.local_phone || data.to_phone || data.to ||
                    body.local_phone || '';
      const direction = data.direction || body.direction || 'inbound';

      console.log('Parsed - from:', from, 'to:', toNum, 'text:', msgText, 'direction:', direction, 'type:', evtType);

      // Save to sms_inbox regardless — use raw body as fallback message
      const saveMsg = msgText || '[No message content - raw: ' + rawBody.substring(0,100) + ']';

      const saveResult = await supaPost('sms_inbox', {
        direction: direction === 'outbound' ? 'outbound' : 'inbound',
        from_number: from || 'unknown',
        to_number: toNum || 'unknown',
        message: saveMsg,
        status: direction === 'outbound' ? 'sent' : 'unread',
        created_at: new Date().toISOString()
      });

      console.log('Save result:', saveResult.status, saveResult.body);

      // If inbound, also add to call queue
      if (direction !== 'outbound' && msgText) {
        await supaPost('requests', {
          type:'call_queue',
          client_name: from || 'Unknown',
          client_phone: from || '',
          priority:'high',
          assigned_to:'Any Available',
          reason:'Inbound SMS: ' + msgText.substring(0,200),
          notes:'Client texted ' + toNum + '. Reply via /sms-inbox.html',
          status:'pending',
          created_at:new Date().toISOString()
        });
      }

      return {statusCode:200,headers,body:JSON.stringify({received:true,saved:saveResult.status})};
    }

    // ── SEND OUTBOUND SMS ──
    if (action === 'send') {
      const { to, message, from_email, client_id, client_name } = body;
      if (!to || !message) return {statusCode:400,headers,body:JSON.stringify({error:'Missing to or message'})};

      const fromNumber = REP_NUMBERS[from_email] || REP_NUMBERS['jason@mycprteam.com'];
      const localPhoneId = PHONE_IDS[fromNumber] || PHONE_IDS['+17546004934'];

      const result = await closeRequest('POST', '/activity/sms/', {
        _type:'SMS', direction:'outbound',
        phone: to, local_phone: fromNumber,
        local_phone_id: localPhoneId,
        text: message, status:'sent'
      });

      await supaPost('sms_inbox', {
        direction:'outbound', from_number:fromNumber,
        to_number:to, message,
        client_id:client_id||null, client_name:client_name||null,
        sent_by:from_email||'system', status:'sent',
        created_at:new Date().toISOString()
      });

      if (result.status >= 400) return {statusCode:result.status,headers,body:JSON.stringify({error:result.body})};
      return {statusCode:200,headers,body:JSON.stringify({success:true,result:result.body})};
    }

    return {statusCode:200,headers,body:JSON.stringify({ok:true})};

  } catch(e) {
    console.log('close-sms error:', e.message, e.stack);
    return {statusCode:500,headers,body:JSON.stringify({error:e.message})};
  }
};
