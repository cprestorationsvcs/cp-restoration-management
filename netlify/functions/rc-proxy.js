const https = require('https');

const RC_CLIENT_ID     = '9XxWlKzJPckcCLW1TWZ0YO';
const RC_CLIENT_SECRET = 'aw4slUyS9TTf1IGslt93Wz6svM5yTSK9Nef4mr4cUoEQ';
const RC_JWT           = 'eyJraWQiOiI4NzYyZjU5OGQwNTk0NGRiODZiZjVjYTk3ODA0NzYwOCIsInR5cCI6IkpXVCIsImFsZyI6IlJTMjU2In0.eyJhdWQiOiJodHRwczovL3BsYXRmb3JtLnJpbmdjZW50cmFsLmNvbS9yZXN0YXBpL29hdXRoL3Rva2VuIiwic3ViIjoiMjgzOTQwMDAyNyIsImlzcyI6Imh0dHBzOi8vcGxhdGZvcm0ucmluZ2NlbnRyYWwuY29tIiwiZXhwIjozOTM4NzkxMzY3LCJpYXQiOjE3OTEzMDc3MjAsImp0aSI6Ik1vdS1veEp0UldXenZfWHJfeHlDQVEifQ.d_qkR9vPNLeVVSrXkFcx4YcTwgLLF9Wb6lvc4ArjyFvvJ9NAJqfmKJCLi8GDnfOkGdm7khe22HxuyJUCbtCQ9jtsOVVVTsZhu-ir5tPU6mSUUltt_FEu7atZT_bsmoNJtX_O0gPFVmBkEgevWkJa93a0n7zDZ8ZvJQb79XquuBtY78yC5OqgZ8y9nwOLz2QdAquU4EcCyJrAg1Q-m-Kg0ZKVlAm5QoMDkJ2DVcq-Ol1WmkcGjV19uwAiiW_5y2MAMC6LaypP7EW6ZAhdXUTh5n2hFToCxDFIBNi3GcZ-HIHkey_BbvTEz1iqt4i_SvY6zCK93aPoyGXflT2V4z2cFw';
const RC_HOST          = 'platform.ringcentral.com';

const makeReq = (opts, data) => new Promise((resolve, reject) => {
  const req = https.request(opts, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => resolve({ status: res.statusCode, body }));
  });
  req.on('error', reject);
  if (data) req.write(data);
  req.end();
});

exports.handler = async function(event) {
  const cors = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };

  try {
    const { action, accessToken, method, path, reqBody } = JSON.parse(event.body || '{}');

    /* ── JWT auth ── */
    if (action === 'auth' || action === 'jwt' || action === 'auto-auth') {
      const creds   = Buffer.from(RC_CLIENT_ID + ':' + RC_CLIENT_SECRET).toString('base64');
      const payload = 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + encodeURIComponent(RC_JWT);
      const result  = await makeReq({
        hostname: RC_HOST,
        path:     '/restapi/oauth/token',
        method:   'POST',
        headers: {
          'Authorization':  'Basic ' + creds,
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, payload);
      return { statusCode: result.status, headers: cors, body: result.body };
    }

    /* ── Proxy API call ── */
    if (action === 'api') {
      const body    = reqBody ? JSON.stringify(reqBody) : null;
      const headers = { 'Authorization': 'Bearer ' + accessToken, 'Accept': 'application/json' };
      if (body) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(body); }
      const result = await makeReq({ hostname: RC_HOST, path, method: method || 'GET', headers }, body);
      return { statusCode: result.status, headers: cors, body: result.body };
    }

    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Unknown action' }) };

  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};