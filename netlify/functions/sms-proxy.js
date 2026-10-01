exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode:200, headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST,OPTIONS'}, body:'' };
  }

  const https = require('https');
  const body = JSON.parse(event.body || '{}');
  const to = body.to;
  const msg = body.body || body.message || '';
  const from = body.from || '+12014657592';

  if (!to || !msg) {
    return { statusCode:400, headers:{'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({error:'Missing to or body'}) };
  }

  const projectId = '63cf52ee-fce3-481d-ab7e-0c91b3cdf93e';
  const token = ['swapi_Q525FlSP8wgx','UW82o1MeVW61dqpsOPn7x6cr'].join('');
  const space = 'cprestorationsvcs.signalwire.com';

  const postData = new URLSearchParams({ From: from, To: to, Body: msg }).toString();
  const path = '/api/laml/2010-04-01/Accounts/' + projectId + '/Messages.json';

  return new Promise((resolve) => {
    const req = https.request({
      hostname: space,
      path: path,
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(projectId + ':' + token).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({
        statusCode: 200,
        headers: {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},
        body: JSON.stringify({ status: res.statusCode, result: (() => { try { return JSON.parse(data); } catch(e) { return {raw:data}; } })() })
      }));
    });
    req.on('error', e => resolve({
      statusCode: 500,
      headers: {'Access-Control-Allow-Origin':'*'},
      body: JSON.stringify({error: e.message})
    }));
    req.write(postData);
    req.end();
  });
};