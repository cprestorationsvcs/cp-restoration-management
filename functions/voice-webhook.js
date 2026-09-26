// CP Restoration AI Receptionist v6 — Session-aware, no repeat questions
// State is passed through Twilio action URL params so no cold-start memory loss

const https = require('https');
const TRANSFER_NUMBER = '+17542660042';

// ── INSTANT RESPONSES ────────────────────────────────────────────
const R = {
  greeting:    "Thank you for calling CP Restoration Services. My name is Aria. How can I help you today?",
  pricing:     "Our Standard package is $2,499 covering all three bureaus in 120 business days. Express is $3,999 for results in 60 days. We also offer financing — $750 down and $292 a month. Which sounds right for you?",
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

// ── ASK FOR NAME ─────────────────────────────────────────────────
function askName(callSid) {
  return twiml("Can I get your full name?", callSid, 'waitname');
}

// ── ASK FOR NUMBER ────────────────────────────────────────────────
function askNumber(name, callSid) {
  return twiml("Thank you " + name + ". And what is the best phone number to reach you?", callSid, 'waitnumber', encodeURIComponent(name));
}

// ── CONFIRM AND CLOSE ─────────────────────────────────────────────
function confirm(name, number, callSid) {
  return twimlEnd("Perfect. I have your name as " + name + " and your number as " + number + ". Our team will follow up with you within 24 hours. Thank you for calling CP Restoration Services. Have a great day.");
}

// ── TWIML BUILDERS ────────────────────────────────────────────────
function escapeXml(t) {
  return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

function twiml(text, callSid, state, extra) {
  // State and caller data passed through URL so Netlify stateless functions remember context
  var action = '/.netlify/functions/voice-webhook?sid=' + encodeURIComponent(callSid) + '&state=' + (state||'main');
  if (extra) action += '&name=' + extra;
  return '<?xml version="1.0" encoding="UTF-8"?><Response>' +
    '<Gather input="speech" action="' + action + '" method="POST" speechTimeout="4" language="en-US">' +
    '<Say voice="Polly.Joanna">' + escapeXml(text) + '</Say>' +
    '</Gather>' +
    '<Say voice="Polly.Joanna">I didn\'t catch that. Please call us back at any time.</Say>' +
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

// ── KEYWORD MATCH ─────────────────────────────────────────────────
function matchTopic(input) {
  const t = (input||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ');
  if (/transfer|speak to (a |)(human|person|rep)|real person|talk to (a |)(human|person)|connect me/.test(t)) return 'transfer';
  if (/cancel|refund|attorney|lawsuit|charg.?back/.test(t)) return 'transfer';
  if (/closed|closing|shut down|out of business|email.*clos|heard.*clos|told.*clos|notice.*clos/.test(t)) return 'closure';
  if (/\bexpress\b/.test(t)) return 'express';
  if (/\bstandard\b/.test(t)) return 'standard';
  if (/financ|payment plan|monthly|down payment|afford/.test(t)) return 'financing';
  if (/price|cost|how much|package|pricing|rate|fee|charge|option/.test(t)) return 'pricing';
  if (/how long|how fast|timeline|how soon|when will|long does|take to/.test(t)) return 'timeline';
  if (/what do you do|how does it work|process|how it works|tell me about|what you do/.test(t)) return 'process';
  if (/collect/.test(t)) return 'collections';
  if (/guarantee|money back/.test(t)) return 'guarantee';
  if (/my (file|case|account|dispute|status)|existing client|already (a |)client/.test(t)) return 'existing';
  return null;
}

// ── YES / NO DETECT ────────────────────────────────────────────────
function isYes(t) {
  return /\b(yes|yeah|sure|correct|right|yep|yup|ok|okay|please|go ahead|that.s right|that is right)\b/.test((t||'').toLowerCase());
}

// ── HAIKU FALLBACK ─────────────────────────────────────────────────
function askHaiku(question) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve("Can I take your name and number so our team can call you back with a full answer?"), 3500);
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      system: 'You are Aria, receptionist for CP Restoration Services (credit repair, founded 2014). Answer in ONE sentence, max 15 words. Be direct. Express $3,999/60 days, Standard $2,499/120 days, Financing $750 down+$292/mo. Fully open and operational. Never ask for name or number — just answer the question.',
      messages: [{ role:'user', content: question }]
    });
    const req = https.request({
      hostname:'api.anthropic.com', path:'/v1/messages', method:'POST',
      headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'anthropic-version':'2023-06-01'}
    }, (res) => {
      let d='';
      res.on('data', c => d+=c);
      res.on('end', () => {
        clearTimeout(timer);
        try { resolve(JSON.parse(d).content[0].text || "Can I take your name and number so our team can follow up?"); }
        catch(e) { resolve("Can I take your name and number so our team can follow up?"); }
      });
    });
    req.on('error', () => { clearTimeout(timer); resolve("Can I take your name and number so our team can follow up?"); });
    req.write(body); req.end();
  });
}

// ── MAIN HANDLER ──────────────────────────────────────────────────
exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const params = new URLSearchParams(event.body || '');
  const qp     = event.queryStringParameters || {};

  const callSid = params.get('CallSid') || qp['sid'] || 'unknown';
  const speech  = (params.get('SpeechResult') || '').trim();
  const state   = qp['state'] || 'new';
  const nameParam = decodeURIComponent(qp['name'] || '');

  const respond = (body) => ({ statusCode:200, headers:{'Content-Type':'text/xml'}, body });

  // ── NEW CALL ────────────────────────────────────────────────────
  if (state === 'new') {
    return respond(twiml(R.greeting, callSid, 'main'));
  }

  // ── WAITING FOR NAME ────────────────────────────────────────────
  if (state === 'waitname') {
    if (!speech) return respond(twiml("I didn't catch that. Can you say your name again?", callSid, 'waitname'));
    // Store name in URL and ask for number
    return respond(askNumber(speech, callSid));
  }

  // ── WAITING FOR NUMBER ──────────────────────────────────────────
  if (state === 'waitnumber') {
    if (!speech) return respond(twiml("I didn't catch that. Can you repeat your phone number?", callSid, 'waitnumber', encodeURIComponent(nameParam)));
    // Got both name and number — confirm and end
    const name   = nameParam || 'there';
    const number = speech;
    return respond(confirm(name, number, callSid));
  }

  // ── MAIN CONVERSATION ───────────────────────────────────────────
  if (!speech) {
    return respond(twiml("I didn't catch that. How can I help you?", callSid, 'main'));
  }

  // Transfer triggers
  const topic = matchTopic(speech);
  if (topic === 'transfer') return respond(twimlTransfer());

  // Caller saying yes after an answer — offer to take their info
  if (isYes(speech)) {
    return respond(askName(callSid));
  }

  // Known topic — answer instantly then offer to take name/number
  if (topic && R[topic]) {
    const answer = R[topic] + " Would you like to leave your name and number for our team to follow up?";
    return respond(twiml(answer, callSid, 'waitname_offer'));
  }

  // Haiku fallback for unknown questions
  const reply = await askHaiku(speech);
  return respond(twiml(reply + " Can I take your name and number for our team to follow up?", callSid, 'waitname_offer'));
};
