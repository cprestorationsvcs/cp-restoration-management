const https = require('https');
const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = 'CP Restoration Services <onboarding@resend.dev>';
const PORTAL = 'https://portal-cprestorationsvcs.com';

function sendEmail(to, subject, html) {
  return new Promise((resolve) => {
    if (!RESEND_KEY) {
      resolve({status: 500, body: JSON.stringify({error: 'RESEND_API_KEY env var not set'})});
      return;
    }
    const body = JSON.stringify({from: FROM, to: [to], subject, html});
    const opts = {
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        console.log('Resend response:', res.statusCode, d.substring(0, 200));
        resolve({status: res.statusCode, body: d});
      });
    });
    req.on('error', e => {
      console.error('Resend request error:', e.message);
      resolve({status: 500, body: JSON.stringify({error: e.message})});
    });
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({status: 500, body: JSON.stringify({error: 'Request timeout'})});
    });
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'};
  if (event.httpMethod === 'OPTIONS') return {statusCode: 200, headers, body: ''};

  // Test endpoint
  if (event.httpMethod === 'GET' || (event.queryStringParameters && event.queryStringParameters.test)) {
    const keySet = !!RESEND_KEY;
    const keyPreview = RESEND_KEY ? RESEND_KEY.substring(0, 8) + '...' : 'NOT SET';
    return {statusCode: 200, headers, body: JSON.stringify({
      status: 'email-proxy running',
      resend_key_set: keySet,
      resend_key_preview: keyPreview,
      from: FROM
    })};
  }

  try {
    const b = JSON.parse(event.body || '{}');
    const {to, type, name, phone} = b;

    console.log('Email request:', {to, type, name});

    if (!to) return {statusCode: 400, headers, body: JSON.stringify({error: 'Missing email address'})};
    if (!RESEND_KEY) return {statusCode: 500, headers, body: JSON.stringify({error: 'Email service not configured — RESEND_API_KEY missing'})};

    let subject, html;

    if (type === 'funding') {
      subject = 'We Received Your Funding Request - CP Restoration Services';
      html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">'
        + '<div style="background:#1B3A6B;padding:30px;text-align:center;border-radius:8px 8px 0 0">'
        + '<h1 style="color:white;margin:0">CP Restoration Services</h1>'
        + '<p style="color:#C9A84C;margin:8px 0 0">Business Funding &amp; Credit Repair</p></div>'
        + '<div style="background:#F8FAFC;padding:30px">'
        + '<h2 style="color:#1B3A6B">Hi ' + (name || 'there') + ', we received your request!</h2>'
        + '<p style="color:#475569;line-height:1.7">A funding specialist will call you at <strong>' + (phone || 'the number you provided') + '</strong> within the hour during business hours (Mon-Fri 9AM-5PM EST).</p>'
        + '<div style="background:#EFF6FF;border-left:4px solid #1B3A6B;padding:16px;margin:20px 0">'
        + '<p style="color:#1B3A6B;font-weight:700;margin:0 0 8px">What happens next:</p>'
        + '<ul style="color:#475569;margin:0;padding-left:18px;line-height:2.2">'
        + '<li>We review your funding request</li>'
        + '<li>We call to discuss your goals and credit situation</li>'
        + '<li>We build a plan to get you funding-ready</li>'
        + '<li>We connect you with lenders who say YES</li></ul></div>'
        + '<div style="text-align:center;margin:24px 0">'
        + '<a href="tel:18553275847" style="background:#1B3A6B;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block">Call 1-855-327-5847</a></div>'
        + '<p style="color:#64748B;font-size:12px;text-align:center">CP Restoration Services | 35daycreditrepair.com</p>'
        + '</div></div>';
    } else {
      subject = 'Your Free Credit Repair Guide is Ready!';
      html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">'
        + '<div style="background:#1B3A6B;padding:30px;text-align:center;border-radius:8px 8px 0 0">'
        + '<h1 style="color:white;margin:0">CP Restoration Services</h1>'
        + '<p style="color:#C9A84C;margin:8px 0 0">Credit Repair Since 2014</p></div>'
        + '<div style="background:#F8FAFC;padding:30px">'
        + '<h2 style="color:#1B3A6B">Hi ' + (name || 'there') + ', your guide is ready!</h2>'
        + '<p style="color:#475569;line-height:1.7">Thank you for downloading <strong>7 Steps to Fix Your Credit in 90 Days</strong>. Click below to read and save your free guide.</p>'
        + '<div style="text-align:center;margin:28px 0">'
        + '<a href="' + PORTAL + '/ebook.html" style="background:#C9A84C;color:#0A1628;padding:16px 32px;border-radius:8px;text-decoration:none;font-weight:800;font-size:16px;display:inline-block">Download Your Free eBook Now</a></div>'
        + '<p style="color:#475569;line-height:1.7">We have helped over 4,900 clients remove negative items and raise their scores since 2014. Want a free 15-minute consultation?</p>'
        + '<div style="text-align:center;margin:20px 0">'
        + '<a href="tel:18553275847" style="background:#1B3A6B;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block">Call 1-855-327-5847</a></div>'
        + '<p style="color:#64748B;font-size:12px;text-align:center">CP Restoration Services | 35daycreditrepair.com</p>'
        + '</div></div>';
    }

    const result = await sendEmail(to, subject, html);
    const success = result.status === 200 || result.status === 201;

    if (success) {
      return {statusCode: 200, headers, body: JSON.stringify({sent: true})};
    } else {
      console.error('Resend failed:', result.status, result.body);
      return {statusCode: result.status, headers, body: JSON.stringify({sent: false, error: result.body})};
    }
  } catch (e) {
    console.error('email-proxy error:', e.message);
    return {statusCode: 500, headers, body: JSON.stringify({sent: false, error: e.message})};
  }
};
