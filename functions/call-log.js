// CP Restoration — Call Log Function
// Stores call records in Netlify Blobs and serves them to the dashboard

const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode:200, headers, body:'' };

  try {
    const store = getStore({ name:'call-records', consistency:'strong' });

    // POST — save a call record from the voice webhook
    if (event.httpMethod === 'POST') {
      const record = JSON.parse(event.body || '{}');
      if (!record.callSid) return { statusCode:400, headers, body: JSON.stringify({ error:'Missing callSid' }) };

      // Get existing records for this call or start fresh
      let existing = {};
      try { existing = JSON.parse(await store.get(record.callSid) || '{}'); } catch(e) {}

      // Merge — keep the latest state, accumulate transcript
      const updated = {
        ...existing,
        callSid:  record.callSid,
        caller:   record.caller || existing.caller || 'Unknown',
        startTime: existing.startTime || record.time,
        lastTime:  record.time,
        state:     record.state,
        topic:     record.topic || existing.topic || '',
        name:      record.name  || existing.name  || '',
        number:    record.number|| existing.number || '',
        transcript: [...(existing.transcript||[]), ...(record.speech ? [{ time:record.time, text:record.speech }] : [])]
      };

      await store.set(record.callSid, JSON.stringify(updated));
      return { statusCode:200, headers, body: JSON.stringify({ ok:true }) };
    }

    // GET — return all call records for the dashboard
    if (event.httpMethod === 'GET') {
      const { blobs } = await store.list();
      const records = [];
      for (const blob of blobs.slice(-100)) { // last 100 calls
        try {
          const data = await store.get(blob.key);
          if (data) records.push(JSON.parse(data));
        } catch(e) {}
      }
      // Sort newest first
      records.sort((a,b) => (b.lastTime||'').localeCompare(a.lastTime||''));
      return { statusCode:200, headers, body: JSON.stringify({ records }) };
    }

    return { statusCode:405, headers, body: JSON.stringify({ error:'Method not allowed' }) };

  } catch(err) {
    // Fallback if Netlify Blobs not available — use in-memory store
    console.error('Blob error:', err.message);
    return { statusCode:200, headers, body: JSON.stringify({ records:[], error: err.message }) };
  }
};
