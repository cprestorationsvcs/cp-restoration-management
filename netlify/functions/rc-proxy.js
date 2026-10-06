const https = require('https');

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const body = JSON.parse(event.body || '{}');
    const { action, username, password, extension, accessToken, method, path, reqBody } = body;
    const RC_HOST = 'platform.ringcentral.com';
    const CLIENT_ID = '9XxWlKzJPckcCLW1TWZ0YO';
    const CLIENT_SECRET = 'aw4slUyS9TTf1IGslt93Wz6svM5yTSK9Nef4mr4cUoEQ';

    const makeRequest = (opts, postData) => new Promise((resolve, reject) => {
      const req = https.request(opts, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    });

    if (action === 'auth') {
      const creds = Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');
      let postData = `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      if (extension) postData += `&extension=${encodeURIComponent(extension)}`;
      const result = await makeRequest({
        hostname: RC_HOST, path: '/restapi/oauth/token', method: 'POST',
        headers: {
          'Authorization': 'Basic ' + creds,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, postData);
      return { statusCode: result.status, headers, body: result.body };
    }

    if (action === 'api') {
      const postData = reqBody ? JSON.stringify(reqBody) : null;
      const reqHeaders = {
        'Authorization': 'Bearer ' + accessToken,
        'Accept': 'application/json'
      };
      if (postData) { reqHeaders['Content-Type'] = 'application/json'; reqHeaders['Content-Length'] = Buffer.byteLength(postData); }
      const result = await makeRequest({
        hostname: RC_HOST, path: path, method: method || 'GET', headers: reqHeaders
      }, postData);
      return { statusCode: result.status, headers, body: result.body };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch(e) {
    return { statusCode: 500, headers: {'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ error: e.message }) };
  }
};
