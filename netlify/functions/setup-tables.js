const https = require('https');

const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZlbWJhZ3BpdXVvZXhtcG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzYwNjEsImV4cCI6MjEwNjM1MjA2MX0.8euoI8CGkr3GBFiTrlaEmO8DtVyCF9jVaWPGORScg50';

async function supaPost(path, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'jzkfembagpiuuoexmpoy.supabase.co',
      path,
      method: 'POST',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + SUPA_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({status: res.statusCode, body: d}));
    });
    req.on('error', e => resolve({status: 500, body: e.message}));
    req.write(data);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
  
  // Use Supabase SQL endpoint to create tables
  const sql = `
    CREATE TABLE IF NOT EXISTS leads (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      source TEXT DEFAULT 'unknown',
      status TEXT DEFAULT 'new',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS client_messages (
      id BIGSERIAL PRIMARY KEY,
      client_id TEXT NOT NULL,
      client_name TEXT,
      from_role TEXT NOT NULL,
      from_name TEXT,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS client_status_updates (
      id BIGSERIAL PRIMARY KEY,
      client_id TEXT NOT NULL,
      client_name TEXT,
      update_text TEXT NOT NULL,
      update_type TEXT DEFAULT 'status',
      posted_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  const result = await supaPost('/rest/v1/rpc/exec_sql', { sql });
  
  // Try inserting a test lead to verify leads table works
  const testResult = await supaPost('/rest/v1/leads', {
    name: 'Test Lead Setup',
    email: 'test@setup.com',
    phone: '5555555555',
    source: 'system-test',
    status: 'new',
    notes: 'Auto-created during setup verification',
    created_at: new Date().toISOString()
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      sql_result: result,
      test_insert: testResult.status,
      test_body: testResult.body.substring(0,200)
    })
  };
};
