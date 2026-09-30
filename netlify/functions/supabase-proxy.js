exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type,apikey,Authorization,Prefer','Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS'}, body: '' };
  }
  const https = require('https');
  const url = new URL(event.path.replace('/.netlify/functions/supabase-proxy','') + (event.rawQuery?'?'+event.rawQuery:''), 'https://jzkfembagpiuuoexmpoy.supabase.co');
  const body = event.body || '';
  const method = event.httpMethod;
  const inHeaders = event.headers || {};

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'jzkfembagpiuuoexmpoy.supabase.co',
      path: url.pathname + url.search,
      method: method,
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50',
        'Content-Type': 'application/json',
        'Prefer': inHeaders['prefer'] || inHeaders['Prefer'] || '',
        ...(body ? {'Content-Length': Buffer.byteLength(body)}: {})
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},
        body: data || '[]'
      }));
    });
    req.on('error', e => resolve({ statusCode: 500, headers: {'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({error:e.message}) }));
    if(body) req.write(body);
    req.end();
  });
};