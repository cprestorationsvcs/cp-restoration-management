exports.handler = async function(event, context) {
  const https = require('https');
  const projectId = '63cf52ee-fce3-481d-ab7e-0c91b3cdf93e';
  const token = ['swapi_Q525FlSP8wgx','UW82o1MeVW61dqpsOPn7x6cr'].join('');
  const space = 'cprestorationsvcs.signalwire.com';
  const to = (event.queryStringParameters && event.queryStringParameters.to) || '+12014657592';

  // SignalWire REST API — same structure as Twilio
  const path = '/api/laml/2010-04-01/Accounts/' + projectId + '/Messages.json?PageSize=20&To=' + encodeURIComponent(to);

  return new Promise((resolve) => {
    const req = https.request({
      hostname: space,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(projectId + ':' + token).toString('base64'),
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        resolve({
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            signalwire_status: res.statusCode,
            parsed: (() => { try { return JSON.parse(data); } catch(e) { return {error: e.message, raw: data}; } })()
          })
        });
      });
    });
    req.on('error', e => resolve({
      statusCode: 500,
      headers: {'Access-Control-Allow-Origin':'*'},
      body: JSON.stringify({error: e.message})
    }));
    req.end();
  });
};