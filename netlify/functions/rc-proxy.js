const https = require('https');

const RC_CLIENT_ID = '9XxWlKzJPckcCLW1TWZ0YO';
const RC_CLIENT_SECRET = 'aw4slUyS9TTf1IGslt93Wz6svM5yTSK9Nef4mr4cUoEQ';
const RC_JWT = 'eyJraWQiOiI4NzYyZjU5OGQwNTk0NGRiODZiZjVjYTk3ODA0NzYwOCIsInR5cCI6IkpXVCIsImFsZyI6IlJTMjU2In0.eyJhdWQiOiJodHRwczovL3BsYXRmb3JtLnJpbmdjZW50cmFsLmNvbS9yZXN0YXBpL29hdXRoL3Rva2VuIiwic3ViIjoiMjgzOTQwMDAyNyIsImlzcyI6Imh0dHBzOi8vcGxhdGZvcm0ucmluZ2NlbnRyYWwuY29tIiwiZXhwIjozOTM3NDkzMDgxLCJpYXQiOjE3OTAwMDk0MzQsImp0aSI6IklmQ1A4eGRTUS1pMVRPVEVCSkx0SEEifQ.gNcv1NcaQu7RXZj1KUmA_wThHW-mZVgsIM8U_h3R3Np87q50x9hpWdANrla4MaB7UUZH0R_3roJHYdwkIN6b6nG_snAEnzllhrlxQt7iNMUGobXm1qtIvKRdrWyKuPABi7RVasGk0bULN91UwOku1pHWDilv6kPo_hIbL2Uazeu3Nf-PoNUN77RVaut-c8afXy6EgW9_SKwqKZ-DGkC4J_jQFO7erGKU-kPleIAORe6eBRgwoC0QC3m7RqRYvnbrO6yQtVSifqmAKzMI_AoKO-m8LkOs4EnwSQG4moS0J0gKTdxEnVqXTNvM5Q_426d9F-URtfj08_37jHHXnzzjuQ';
const RC_HOST = 'platform.ringcentral.com';

const makeReq = (opts, data) => new Promise((res, rej) => {
  const req = https.request(opts, r => {
    let d = ''; r.on('data', c => d += c); r.on('end', () => res({status: r.statusCode, body: d}));
  });
  req.on('error', rej); if (data) req.write(data); req.end();
});

exports.handler = async function(event) {
  const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST,OPTIONS'};
  if (event.httpMethod === 'OPTIONS') return {statusCode:200,headers,body:''};
  try {
    const {action, jwt, accessToken, method, path, reqBody} = JSON.parse(event.body || '{}');

    if (action === 'jwt' || action === 'auto-auth') {
      // Use provided JWT or fall back to stored one
      const jwtToUse = jwt || RC_JWT;
      const creds = Buffer.from(RC_CLIENT_ID + ':' + RC_CLIENT_SECRET).toString('base64');
      const pd = 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + encodeURIComponent(jwtToUse);
      const r = await makeReq({
        hostname: RC_HOST, path: '/restapi/oauth/token', method: 'POST',
        headers: {'Authorization':'Basic '+creds,'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(pd)}
      }, pd);
      return {statusCode: r.status, headers, body: r.body};
    }

    if (action === 'api') {
      const pd = reqBody ? JSON.stringify(reqBody) : null;
      const rh = {'Authorization':'Bearer '+accessToken,'Accept':'application/json'};
      if (pd) {rh['Content-Type']='application/json'; rh['Content-Length']=Buffer.byteLength(pd);}
      const r = await makeReq({hostname:RC_HOST, path:path, method:method||'GET', headers:rh}, pd);
      return {statusCode: r.status, headers, body: r.body};
    }

    return {statusCode:400, headers, body: JSON.stringify({error:'Unknown action'})};
  } catch(e) {
    return {statusCode:500, headers, body: JSON.stringify({error: e.message})};
  }
};