// CP Restoration — Call Log Function v2
// No external packages — uses /tmp for persistence within function lifetime

const fs = require('fs');
const path = require('path');
const STORE_PATH = '/tmp/cp_calls.json';

function loadRecords() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    }
  } catch(e) {}
  return {};
}

function saveRecords(records) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(records), 'utf8');
  } catch(e) {}
}

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const records = loadRecords();

  // POST — save a call record
  if (event.httpMethod === 'POST') {
    try {
      const record = JSON.parse(event.body || '{}');
      if (!record.callSid) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing callSid' }) };
      }

      const existing = records[record.callSid] || {};
      records[record.callSid] = {
        callSid:   record.callSid,
        caller:    record.caller   || existing.caller    || 'Unknown',
        startTime: existing.startTime || record.time     || new Date().toISOString(),
        lastTime:  record.time        || new Date().toISOString(),
        state:     record.state       || existing.state  || 'active',
        topic:     record.topic       || existing.topic  || '',
        name:      record.name        || existing.name   || '',
        number:    record.number      || existing.number || '',
        transcript: [
          ...(existing.transcript || []),
          ...(record.speech ? [{ time: record.time, speaker: 'caller', text: record.speech }] : []),
          ...(record.reply   ? [{ time: record.time, speaker: 'aria',   text: record.reply  }] : [])
        ]
      };

      saveRecords(records);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

    } catch(e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // GET — return all records newest first
  if (event.httpMethod === 'GET') {
    try {
      const list = Object.values(records)
        .sort((a, b) => (b.lastTime || '').localeCompare(a.lastTime || ''))
        .slice(0, 100);
      return { statusCode: 200, headers, body: JSON.stringify({ records: list }) };
    } catch(e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message, records: [] }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
