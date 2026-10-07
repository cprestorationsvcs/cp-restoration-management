const https = require('https');

exports.handler = async (event) => {
  const headers = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'};

  // Only allow GET requests from the portal
  if (event.httpMethod !== 'GET') return {statusCode:405,headers,body:'Method not allowed'};

  const CLOSE_API_KEY = 'api_312FaoQHfbRRZ1iI0q0f5D.18sSZzANivUMiKRjU8kbYg';
  const WEBHOOK_URL = 'https://portal-cprestorationsvcs.com/.netlify/functions/close-sms';

  const payload = JSON.stringify({
    url: WEBHOOK_URL,
    verify_ssl: true,
    events: [{ action: 'created', object_type: 'activity.sms' }]
  });

  const auth = Buffer.from(CLOSE_API_KEY + ':').toString('base64');

  return new Promise((resolve) => {
    const opts = {
      hostname: 'api.close.com',
      path: '/api/v1/webhook/',
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode === 201) {
          const webhook = JSON.parse(d);
          resolve({
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'Webhook created successfully!',
              webhook_id: webhook.id,
              status: webhook.status,
              signature_key: webhook.signature_key
            })
          });
        } else {
          resolve({
            statusCode: res.statusCode,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Close API returned ' + res.statusCode,
              details: d
            })
          });
        }
      });
    });

    req.on('error', (e) => {
      resolve({statusCode:500,headers,body:JSON.stringify({success:false,error:e.message})});
    });

    req.write(payload);
    req.end();
  });
};
