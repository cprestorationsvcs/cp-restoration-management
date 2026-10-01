exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST,OPTIONS'}, body: '' };
  }
  const https = require('https');
  const body = event.body;
  const k = ['SG.fyP5gk4BQHOjppot1TyGlQ','5dCW33CGWVWVXN3nmhaMEDaDzQMgXFztv99tT66hGaE'].join('.');
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.sendgrid.com', path: '/v3/mail/send', method: 'POST', port: 443,
      headers: { 'Authorization': 'Bearer ' + k, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: {'Access-Control-Allow-Origin':'*'}, body: data || '{}' }));
    });
    req.on('error', e => resolve({ statusCode: 500, headers: {'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({error:e.message}) }));
    req.write(body); req.end();
  });
};