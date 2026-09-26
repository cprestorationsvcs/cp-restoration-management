// CP Restoration AI Receptionist v7 — with live call logging
const https = require('https');
const TRANSFER_NUMBER = '+17542660042';

const R = {
  greeting:    "Thank you for calling CP Restoration Services. My name is Aria. How can I help you today?",
  pricing:     "Our Standard package is $2,499 covering all three bureaus in 120 business days. Express is $3,999 for results in 60 days. We also offer financing with $750 down and $292 a month. Which sounds right for you?",
  express:     "The Express package is $3,999 for all three bureaus in 60 business days. It is our fastest option with a money-back guarantee.",
  standard:    "The Standard package is $2,499 covering all three bureaus in 120 business days. It is our most popular option.",
  financing:   "Our financing is $750 down and $292 a month for 6 months. You get started right away covering all three bureaus.",
  process:     "We make live calls to all three credit bureaus, file FTC reports, and send certified dispute letters. We follow up every 10 business days with a money-back guarantee.",
  timeline:    "Most clients see results within 30 to 45 days. Bureaus must respond within 30 days by law and we follow up every 10 business days.",
  collections: "Yes, collections are one of the most common things we remove through live bureau calls and certified dispute letters.",
  guarantee:   "Yes, we offer a money-back guarantee. If we do not deliver results you get your money back. We have been in business since 2014.",
  closure:     "CP Restoration is fully open and operational. Any email claiming we closed was sent by a former employee without authorization and is completely false. Your file is active and your service continues as normal.",
  existing:    "Your file is active and your disputes are ongoing. Our team follows up within 24 hours on all questions.",
  transfer:    "Please hold while I connect you with one of our client services representatives."
};

function escapeXml(t) {
  return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

function twiml(text, callSid, state, extra) {
  var action = '/.netlify/functions/voice-webhook?sid=' + encodeURIComponent(callSid) + '&state=' + (state||'main');
  if (extra) action += '&name=' + extra;
  return '<?xml version="1.0" encoding="UTF-8"?><Response>' +
    '<Gather input="speech" action="' + action + '" method="POST" speechTimeout="4" language="en-US">' +
    '<Say voice="Polly.Joanna">' + escapeXml(text) + '</Say>' +
    '</Gather>' +
    '<Say voice="Polly.Joanna">I did not catch that. Please call us back anytime.</Say>' +
    '</Response>';
}

function twimlTransfer() {
  return '<?xml version="1.0" encoding="UTF-8"?><Response>' +
    '<Say voice="Polly.Joanna">' + escapeXml(R.transfer) + '</Say>' +
    '<Dial>' + TRANSFER_NUMBER + '</Dial>' +
    '</Response>';
}

function twimlEnd(text) {
  return '<?xml version="1.0" encoding="UTF-8"?><Response>' +
    '<Say voice="Polly.Joanna">' + escapeXml(text) + '</Say>' +
    '</Response>';
}

function matchTopic(input) {
  const t = (input||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ');
  if (/transfer|speak to (a |)(human|person|rep)|real person|talk to (a |)(human|person)|connect me/.test(t)) return 'transfer';
  if (/cancel|refund|attorney|lawsuit|charg.?back/.test(t)) return 'transfer';
  if (/closed|closing|shut down|out of business|email.*clos|heard.*clos|told.*clos/.test(t)) return 'closure';
  if (/\bexpress\b/.test(t)) return 'express';
  if (/\bstandard\b/.test(t)) return 'standard';
  if (/financ|payment plan|monthly|down payment|afford/.test(t)) return 'financing';
  if (/price|cost|how much|package|pricing|rate|fee|charge|option/.test(t)) return 'pricing';
  if (/how long|how fast|timeline|how soon|when will|long does/.test(t)) return 'timeline';
  if (/what do you do|how does it work|process|how it works|tell me about/.test(t)) return 'process';
  if (/collect/.test(t)) return 'collections';
  if (/guarantee|money back/.test(t)) return 'guarantee';
  if (/my (file|case|account|dispute|status)|existing client|already (a |)client/.test(t)) return 'existing';
  return null;
}

function isYes(t) {
  return /\b(yes|yeah|sure|correct|right|yep|yup|ok|okay|please|go ahead)\b/.test((t||'').toLowerCase());
}

function logCall(record) {
  return new Promise((resolve) => {
    try {
      const body = JSON.stringify(record);
      const host = (process.env.URL||'https://portal-cprestorationsvcs.com').replace('https://','').replace('http://','');
      const req = https.request({
        hostname: host, path:'/.netlify/functions/call-log',
        method:'POST', headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}
      }, (res) => { res.on('data',()=>{}); res.on('end', resolve); });
      req.on('error', resolve);
      req.setTimeout(2000, () => { req.destroy(); resolve(); });
      req.write(body); req.end();
    } catch(e) { resolve(); }
  });
}

function askHaiku(question) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve("Can I take your name and number so our team can call you back?"), 3500);
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      system: 'You are Aria, receptionist for CP Restoration Services (credit repair). Answer in ONE sentence only, max 15 words. Be direct. Express $3,999 slash 60 days, Standard $2,499 slash 120 days, Financing $750 down plus $292 per month. Fully open and operational. Never ask for name or number.',
      messages: [{ role:'user', content: question }]
    });
    const req = https.request({
      hostname:'api.anthropic.com', path:'/v1/messages', method:'POST',
      headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'anthropic-version':'2023-06-01'}
    }, (res) => {
      let d=''; res.on('data',c=>d+=c);
      res.on('end',()=>{ clearTimeout(timer); try { resolve(JSON.parse(d).content[0].text||"Can I take your name and number?"); } catch(e){ resolve("Can I take your name and number?"); }});
    });
    req.on('error',()=>{ clearTimeout(timer); resolve("Can I take your name and number?"); });
    req.write(body); req.end();
  });
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const params    = new URLSearchParams(event.body || '');
  const qp        = event.queryStringParameters || {};
  const callSid   = params.get('CallSid') || qp['sid'] || 'unknown';
  const caller    = params.get('From') || 'Unknown';
  const speech    = (params.get('SpeechResult') || '').trim();
  const state     = qp['state'] || 'new';
  const nameParam = decodeURIComponent(qp['name'] || '');
  const topicParam= qp['topic'] || '';
  const now       = new Date().toISOString();

  const respond = (body) => ({ statusCode:200, headers:{'Content-Type':'text/xml'}, body });

  if (state === 'new') {
    await logCall({ callSid, caller, state:'started', time:now, speech:'', topic:'', name:'', number:'' });
    return respond(twiml(R.greeting, callSid, 'main'));
  }

  if (state === 'waitname') {
    if (!speech) return respond(twiml("I did not catch that. Can you say your name?", callSid, 'waitname'));
    return respond(twiml("Thank you " + speech + ". And what is the best phone number to reach you?", callSid, 'waitnumber', encodeURIComponent(speech)));
  }

  if (state === 'waitnumber') {
    if (!speech) return respond(twiml("I did not catch that. Can you repeat your number?", callSid, 'waitnumber', encodeURIComponent(nameParam)));
    const name = nameParam || 'the caller';
    await logCall({ callSid, caller, state:'completed', time:now, speech:'', topic:topicParam, name, number:speech });
    return respond(twimlEnd("Perfect. I have your name as " + name + " and your number as " + speech + ". Our team will follow up with you within 24 hours. Thank you for calling CP Restoration Services. Have a great day."));
  }

  if (!speech) return respond(twiml("I did not catch that. How can I help you?", callSid, 'main'));

  const topic = matchTopic(speech);

  if (topic === 'transfer') {
    await logCall({ callSid, caller, state:'transferred', time:now, speech, topic:'transfer', name:'', number:'' });
    return respond(twimlTransfer());
  }

  if (isYes(speech)) {
    return respond(twiml("Can I get your full name?", callSid, 'waitname'));
  }

  if (topic && R[topic]) {
    const answer = R[topic] + " Would you like to leave your name and number for a follow-up?";
    await logCall({ callSid, caller, state:'answered', time:now, speech, topic, name:'', number:'' });
    return respond(twiml(answer, callSid, 'waitname_offer'));
  }

  if (state === 'waitname_offer') {
    if (isYes(speech)) return respond(twiml("Can I get your full name?", callSid, 'waitname'));
    return respond(twimlEnd("No problem. Thank you for calling CP Restoration Services. Have a great day."));
  }

  const reply = await askHaiku(speech);
  await logCall({ callSid, caller, state:'answered', time:now, speech, topic:'other', name:'', number:'' });
  return respond(twiml(reply + " Would you like to leave your name and number for a follow-up?", callSid, 'waitname_offer'));
};
