const https = require('https');

exports.handler = async function(event, context) {
  const p = event.queryStringParameters || {};
  const SHEET = 'https://script.google.com/macros/s/AKfycbwzqGmdxHmtqMbK-WgagIB6wqBj4sjBarljCesbmmUaLom4jon3Wb5_uUk3AaG7redt/exec';
  
  const params = new URLSearchParams({
    id:        p.id        || 'lead_' + Date.now(),
    name:      p.name      || '',
    phone:     p.phone     || '',
    dept:      p.dept      || '',
    reason:    p.reason    || '',
    status:    'new',
    assigned:  p.dept === 'sales' ? 'Bukunmi Aina' : 'Queen Jearel Cruz',
    source:    'aria',
    notes:     p.notes     || '',
    createdAt: new Date().toISOString()
  });

  try {
    const response = await fetch(SHEET + '?' + params.toString());
    const text = await response.text();
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: text
    };
  } catch(e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.toString() })
    };
  }
};
