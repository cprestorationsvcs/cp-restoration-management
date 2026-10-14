const RESEND_KEY = process.env.RESEND_API_KEY;
const https = require('https');

// Store OTPs in memory (resets on cold start — fine for short-lived codes)
const OTP_STORE = {};

function generateOTP() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function sendOTPEmail(to, name, otp) {
  return new Promise((resolve) => {
    if (!RESEND_KEY) { resolve({status:500}); return; }
    const html = `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="background:#1B3A6B;border-radius:12px;width:56px;height:56px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;">
            <span style="color:#C9A84C;font-size:18px;font-weight:900;">CPR</span>
          </div>
          <h2 style="color:#1B3A6B;margin:0;">CP Restoration Services</h2>
        </div>
        <div style="background:white;border-radius:10px;padding:24px;text-align:center;">
          <p style="color:#1E293B;font-size:15px;">Hi ${name || 'there'},</p>
          <p style="color:#64748B;font-size:14px;">Your verification code is:</p>
          <div style="font-size:40px;font-weight:900;color:#1B3A6B;letter-spacing:8px;margin:16px 0;">${otp}</div>
          <p style="color:#94A3B8;font-size:12px;">This code expires in 10 minutes. Do not share it with anyone.</p>
        </div>
        <p style="text-align:center;color:#94A3B8;font-size:11px;margin-top:16px;">CP Restoration Services · 35daycreditrepair.com</p>
      </div>`;
    const body = JSON.stringify({from:'CP Restoration Services <info@35daycreditrepair.com>',to:[to],subject:'Your Verification Code — CP Restoration Services',html});
    const opts = {hostname:'api.resend.com',path:'/emails',method:'POST',headers:{'Authorization':'Bearer '+RESEND_KEY,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}};
    const req = https.request(opts, res => { resolve({status:res.statusCode}); });
    req.on('error', () => resolve({status:500}));
    req.write(body); req.end();
  });
}

exports.handler = async function(event) {
  const headers = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json','Access-Control-Allow-Headers':'Content-Type'};
  if(event.httpMethod === 'OPTIONS') return {statusCode:200,headers,body:''};

  try {
    const body = JSON.parse(event.body || '{}');
    const action = body.action; // 'send' or 'verify'

    if(action === 'send') {
      const email = (body.email || '').toLowerCase().trim();
      const name = body.name || '';
      if(!email || !email.includes('@')) return {statusCode:400,headers,body:JSON.stringify({error:'Invalid email'})};
      const otp = generateOTP();
      OTP_STORE[email] = {otp, expires: Date.now() + 10*60*1000};
      const result = await sendOTPEmail(email, name, otp);
      if(result.status !== 200 && result.status !== 202) return {statusCode:500,headers,body:JSON.stringify({error:'Failed to send email'})};
      return {statusCode:200,headers,body:JSON.stringify({success:true,message:'Code sent'})};
    }

    if(action === 'verify') {
      const email = (body.email || '').toLowerCase().trim();
      const code = (body.code || '').trim();
      const stored = OTP_STORE[email];
      if(!stored) return {statusCode:400,headers,body:JSON.stringify({error:'No code found. Please request a new one.'})};
      if(Date.now() > stored.expires) { delete OTP_STORE[email]; return {statusCode:400,headers,body:JSON.stringify({error:'Code expired. Please request a new one.'})}; }
      if(stored.otp !== code) return {statusCode:400,headers,body:JSON.stringify({error:'Incorrect code. Please try again.'})};
      delete OTP_STORE[email];
      return {statusCode:200,headers,body:JSON.stringify({success:true,verified:true})};
    }

    return {statusCode:400,headers,body:JSON.stringify({error:'Invalid action'})};
  } catch(e) {
    return {statusCode:500,headers,body:JSON.stringify({error:e.message})};
  }
};