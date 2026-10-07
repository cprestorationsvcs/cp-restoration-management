const https = require('https');

const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50';

async function supaReq(method, path, body) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'jzkfembagpiuuoexmpoy.supabase.co',
      path: '/rest/v1/' + path,
      method,
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + SUPA_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
        ...(data ? {'Content-Length': Buffer.byteLength(data)} : {})
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({status:res.statusCode, body:d}));
    });
    req.on('error', e => resolve({status:500,body:e.message}));
    if (data) req.write(data);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};

  // Test: insert a message into team_chat
  const insertResult = await supaReq('POST', 'team_chat', {
    channel: 'general',
    sender_name: 'System Test',
    sender_role: 'admin',
    sender_color: '#1B3A6B',
    sender_initials: 'ST',
    message: 'Connection test ' + new Date().toISOString(),
    type: 'system',
    created_at: new Date().toISOString()
  });

  // Test: read from team_chat
  const readResult = await supaReq('GET', 'team_chat?limit=3&order=id.desc');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      insert_status: insertResult.status,
      insert_body: insertResult.body,
      read_status: readResult.status,
      read_body: readResult.body.substring(0, 500)
    })
  };
};
