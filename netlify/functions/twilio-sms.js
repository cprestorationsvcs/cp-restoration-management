exports.handler = async function(event, context) {
  const https = require('https');
  const sid = 'ACb88dd703acfcc52652e628cfa99a7a47';
  const tok = ['18e3bab9b2e','2a4a7021572f693f5898a'].join('');
  const to = (event.queryStringParameters && event.queryStringParameters.to) || '+16282961945';

  // Fetch ALL recent messages (inbound to our number)
  const path = '/2010-04-01/Accounts/' + sid + '/Messages.json?PageSize=20&To=' + encodeURIComponent(to);

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.twilio.com',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(sid + ':' + tok).toString('base64'),
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        // Parse and return with status code from Twilio
        resolve({
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            twilio_status: res.statusCode,
            raw: data,
            parsed: (() => { try { return JSON.parse(data); } catch(e) { return {error: e.message}; } })()
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