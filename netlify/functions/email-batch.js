const https = require('https');
const RESEND_KEY = process.env.RESEND_API_KEY;

function sendBatch(messages) {
  return new Promise((resolve) => {
    if (!RESEND_KEY) { resolve({status:500,body:JSON.stringify({error:'No API key'})}); return; }
    const body = JSON.stringify(messages);
    const opts = {
      hostname: 'api.resend.com',
      path: '/emails/batch',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        console.log('Resend batch:', res.statusCode, d.substring(0,200));
        resolve({status: res.statusCode, body: d});
      });
    });
    req.on('error', e => resolve({status:500,body:JSON.stringify({error:e.message})}));
    req.setTimeout(30000, () => { req.destroy(); resolve({status:500,body:JSON.stringify({error:'Timeout'})}); });
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
  if (event.httpMethod === 'OPTIONS') return {statusCode:200,headers,body:''};

  try {
    const b = JSON.parse(event.body || '{}');
    const { messages } = b;

    if (!messages || !messages.length) {
      return {statusCode:400,headers,body:JSON.stringify({error:'No messages'})};
    }

    // Validate and clean messages
    const valid = messages.filter(m => m.to && m.to.includes('@') && m.subject && m.html);
    if (!valid.length) {
      return {statusCode:400,headers,body:JSON.stringify({error:'No valid messages',sent:0})};
    }

    // Add from field if missing
    const prepared = valid.map(m => ({
      from: m.from || 'CP Restoration Services <info@35daycreditrepair.com>',
      to: m.to,
      subject: m.subject,
      html: m.html
    }));

    console.log('Sending batch of', prepared.length, 'emails');
    const result = await sendBatch(prepared);

    if (result.status === 200 || result.status === 201) {
      let rd = {};
      try { rd = JSON.parse(result.body); } catch(e) {}
      const sentCount = Array.isArray(rd) ? rd.length : prepared.length;
      return {statusCode:200,headers,body:JSON.stringify({sent:sentCount,total:prepared.length})};
    } else {
      console.error('Batch failed:', result.status, result.body);
      return {statusCode:result.status,headers,body:JSON.stringify({sent:0,error:result.body})};
    }
  } catch(e) {
    console.error('email-batch error:', e.message);
    return {statusCode:500,headers,body:JSON.stringify({sent:0,error:e.message})};
  }
};
