const https = require('https');
exports.handler = async function(event) {
  const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST,OPTIONS'};
  if (event.httpMethod === 'OPTIONS') return {statusCode:200,headers,body:''};
  try {
    const {action,jwt,accessToken,method,path,reqBody} = JSON.parse(event.body||'{}');
    const RC_HOST = 'platform.ringcentral.com';
    const CLIENT_ID = '9XxWlKzJPckcCLW1TWZ0YO';
    const CLIENT_SECRET = 'aw4slUyS9TTf1IGslt93Wz6svM5yTSK9Nef4mr4cUoEQ';
    const makeReq = (opts,data) => new Promise((res,rej) => {
      const req = https.request(opts, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res({status:r.statusCode,body:d})); });
      req.on('error',rej); if(data) req.write(data); req.end();
    });
    if (action === 'jwt') {
      const creds = Buffer.from(CLIENT_ID+':'+CLIENT_SECRET).toString('base64');
      const pd = 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion='+encodeURIComponent(jwt);
      const r = await makeReq({hostname:RC_HOST,path:'/restapi/oauth/token',method:'POST',headers:{'Authorization':'Basic '+creds,'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(pd)}},pd);
      return {statusCode:r.status,headers,body:r.body};
    }
    if (action === 'api') {
      const pd = reqBody ? JSON.stringify(reqBody) : null;
      const rh = {'Authorization':'Bearer '+accessToken,'Accept':'application/json'};
      if(pd){rh['Content-Type']='application/json';rh['Content-Length']=Buffer.byteLength(pd);}
      const r = await makeReq({hostname:RC_HOST,path:path,method:method||'GET',headers:rh},pd);
      return {statusCode:r.status,headers,body:r.body};
    }
    return {statusCode:400,headers,body:JSON.stringify({error:'Unknown action'})};
  } catch(e) { return {statusCode:500,headers,body:JSON.stringify({error:e.message})}; }
};