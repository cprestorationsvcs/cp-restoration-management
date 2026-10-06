const https = require('https');

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { action, username, password, extension, accessToken, method, path, body } = JSON.parse(event.body || '{}');
    const RC_SERVER = 'platform.ringcentral.com';
    const CLIENT_ID = '9XxWlKzJPckcCLW1TWZ0YO';
    const CLIENT_SECRET = 'aw4slUyS9TTf1IGslt93Wz6svM5yTSK9Nef4mr4cUoEQ';

    if (action === 'auth') {
      // Password grant
      const creds = Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');
      let postBody = `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      if (extension) postBody += `&extension=${encodeURIComponent(extension)}`;

      const result = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: RC_SERVER,
          path: '/restapi/oauth/token',
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + creds,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postBody)
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.write(postBody);
        req.end();
      });

      return {
        statusCode: result.status,
        headers,
        body: result.body
      };
    }

    if (action === 'api') {
      // Proxy API call
      const reqBody = body ? JSON.stringify(body) : null;
      const result = await new Promise((resolve, reject) => {
        const reqHeaders = {
          'Authorization': 'Bearer ' + accessToken,
          'Accept': 'application/json'
        };
        if (reqBody) {
          reqHeaders['Content-Type'] = 'application/json';
          reqHeaders['Content-Length'] = Buffer.byteLength(reqBody);
        }
        const req = https.request({
          hostname: RC_SERVER,
          path: path,
          method: method || 'GET',
          headers: reqHeaders
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        if (reqBody) req.write(reqBody);
        req.end();
      });

      return {
        statusCode: result.status,
        headers,
        body: result.body
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
