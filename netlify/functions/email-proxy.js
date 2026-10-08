const https = require('https');
const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = 'CP Restoration Services <onboarding@resend.dev>';
const PORTAL = 'https://portal-cprestorationsvcs.com';

function sendEmail(to, subject, html) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ from: FROM, to: [to], subject, html });
    const opts = {
      hostname: 'api.resend.com', path: '/emails', method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', e => resolve({ status: 500, body: e.message }));
    req.write(body); req.end();
  });
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (!RESEND_KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'RESEND_API_KEY not set in Netlify environment' }) };
  try {
    const b = JSON.parse(event.body || '{}');
    const { to, type, name, phone } = b;
    if (!to) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing email' }) };
    let subject, html;
    if (type === 'funding') {
      subject = 'We Received Your Funding Request - CP Restoration Services';
      html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:#1B3A6B;padding:30px;text-align:center;border-radius:8px 8px 0 0"><h1 style="color:white;margin:0">CP Restoration Services</h1><p style="color:#C9A84C;margin:8px 0 0">Business Funding</p></div><div style="padding:30px;background:#F8FAFC"><h2 style="color:#1B3A6B">Hi ' + (name||'there') + ', we received your request!</h2><p style="color:#475569;line-height:1.7">A funding specialist will call you at <strong>' + (phone||'the number you provided') + '</strong> within the hour (Mon-Fri 9AM-5PM EST).</p><div style="text-align:center;margin:24px 0"><a href="tel:18553275847" style="background:#1B3A6B;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block">Call 1-855-327-5847</a></div><p style="color:#64748B;font-size:12px;text-align:center">CP Restoration Services | 35daycreditrepair.com</p></div></div>';
    } else {
      subject = 'Your Free Credit Repair Guide is Ready!';
      html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:#1B3A6B;padding:30px;text-align:center;border-radius:8px 8px 0 0"><h1 style="color:white;margin:0">CP Restoration Services</h1><p style="color:#C9A84C;margin:8px 0 0">Credit Repair Since 2014</p></div><div style="padding:30px;background:#F8FAFC"><h2 style="color:#1B3A6B">Hi ' + (name||'there') + ', your guide is ready!</h2><p style="color:#475569;line-height:1.7">Thank you for downloading <strong>7 Steps to Fix Your Credit in 90 Days</strong>.</p><div style="text-align:center;margin:28px 0"><a href="' + PORTAL + '/ebook.html" style="background:#C9A84C;color:#0A1628;padding:16px 32px;border-radius:8px;text-decoration:none;font-weight:800;font-size:16px;display:inline-block">Download Your Free eBook Now</a></div><div style="text-align:center;margin:20px 0"><a href="tel:18553275847" style="background:#1B3A6B;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block">Call 1-855-327-5847</a></div><p style="color:#64748B;font-size:12px;text-align:center">CP Restoration Services | 35daycreditrepair.com</p></div></div>';
    }
    const result = await sendEmail(to, subject, html);
    console.log('Resend result:', result.status);
    if (result.status === 200 || result.status === 201) return { statusCode: 200, headers, body: JSON.stringify({ sent: true }) };
    return { statusCode: result.status, headers, body: JSON.stringify({ sent: false, error: result.body }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ sent: false, error: e.message }) };
  }
};
