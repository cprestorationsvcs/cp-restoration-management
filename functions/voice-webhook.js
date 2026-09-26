// CP Restoration AI Receptionist v5 — Twilio IVR with instant responses
// No cold start delay — uses Twilio <Say> + <Gather> state machine
// Claude API only called for unknown questions

const https = require('https');

// Keep warm — ping this function every 5 min via Netlify scheduled function
// or use Twilio's built-in response caching

const TRANSFER_NUMBER = '+17542660042';

// Pre-built instant responses — Twilio reads these with zero API latency
const RESPONSES = {
  greeting: "Thank you for calling CP Restoration Services. My name is Aria. To get started, press 1 for pricing and packages, press 2 if you are an existing client, press 3 to speak with a representative, or just tell me how I can help you.",

  pricing: "Our most popular package is the Standard at $2,499 covering all three bureaus in 120 business days. Our fastest is the Express at $3,999 for results in 60 days. We also offer financing with just $750 down and $292 a month. Which one would you like to know more about?",

  express: "The Express package is $3,999 and covers Equifax, Experian, and TransUnion in 60 business days. It is our fastest option with a money-back guarantee. Can I get your name and number to get you started?",

  standard: "The Standard package is $2,499 covering all three bureaus in 120 business days. It is our most popular option. We also offer financing if needed. Can I get your name and number?",

  financing: "Absolutely. Our financing option is $750 down and then $292 a month for 6 months. You get started right away and we cover all three bureaus. Can I get your name and best number?",

  process: "We make live calls directly to Equifax, Experian, and TransUnion, file FTC identity theft reports, and send certified dispute letters. We follow up every 10 business days and offer a money-back guarantee.",

  timeline: "Most clients start seeing results within 30 to 45 days. Credit bureaus are required by law to respond to disputes within 30 days, and we follow up every 10 business days until the job is done.",

  collections: "Yes, collections are one of the most common things we remove. We dispute them directly with the bureaus through live calls and certified letters. How many collections are you dealing with, and can I get your name and number?",

  guarantee: "Yes we offer a money-back guarantee. If we do not deliver results on your disputed items, you get your money back. We have been in business since 2014 and we stand behind our work completely.",

  closure: "I want to address that directly. CP Restoration Services is fully open and operational. Any email or message claiming we closed was sent by a former employee without authorization and is completely false. Your file is active and your service continues as normal. How can I help you today?",

  existing: "Your file is active and your disputes are ongoing. Can I get your full name and client ID? I will log your question and our team will follow up with you within 24 hours.",

  start: "Great, let us get you started. Can I get your full name and best phone number? Someone from our team will call you today to review your credit situation and open your file.",

  message: "Of course. Can I get your full name, best phone number, and the best time to reach you? I will make sure our team follows up with you within 24 hours.",

  transfer: "Please hold for just a moment while I connect you with one of our client services representatives.",

  fallback: "Thank you for your question. Can I get your full name and best phone number so our team can call you back with a detailed answer within the hour?"
};

function escapeXml(t) {
  return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

function twiml(text, callSid, digits) {
  const action = '/.netlify/functions/voice-webhook?sid=' + encodeURIComponent(callSid);
  const gatherAttr = digits
    ? 'input="dtmf speech" numDigits="1" action="' + action + '" method="POST" speechTimeout="4" language="en-US"'
    : 'input="speech" action="' + action + '" method="POST" speechTimeout="4" language="en-US"';
  return '<?xml version="1.0" encoding="UTF-8"?><Response><Gather ' + gatherAttr + '><Say voice="Polly.Joanna">' + escapeXml(text) + '</Say></Gather><Say voice="Polly.Joanna">Thank you for calling CP Restoration Services. Please call us back anytime.</Say></Response>';
}

function twimlTransfer() {
  return '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">' + escapeXml(RESPONSES.transfer) + '</Say><Dial>' + TRANSFER_NUMBER + '</Dial></Response>';
}

// Keyword matcher — runs in microseconds, no API call
function matchTopic(input) {
  const t = (input || '').toLowerCase().replace(/[^a-z0-9 ]/g,' ');
  if (/transfer|speak to (a |)(human|person|representative|someone|rep)|real person|talk to (a |)(human|person)/.test(t)) return 'transfer';
  if (/cancel|refund|attorney|lawsuit|charg.?back/.test(t)) return 'transfer';
  if (/closed|closing|shut down|out of business|email.*said|message.*said|heard.*closed|told.*closed|notice/.test(t)) return 'closure';
  if (/express/.test(t)) return 'express';
  if (/standard/.test(t)) return 'standard';
  if (/financ|payment plan|monthly|down payment|afford/.test(t)) return 'financing';
  if (/price|cost|how much|package|pricing|rate|fee|charge|option/.test(t)) return 'pricing';
  if (/how long|how fast|timeline|how soon|when will|long does|take to/.test(t)) return 'timeline';
  if (/what do you do|how does it work|process|how it works|tell me about|explain/.test(t)) return 'process';
  if (/collect|collection/.test(t)) return 'collections';
  if (/guarantee|money back|refund policy|if it doesn|if it doesnt/.test(t)) return 'guarantee';
  if (/my (file|case|account|dispute|status)|update|progress|existing client|already (a |)client/.test(t)) return 'existing';
  if (/get started|sign up|enroll|begin|start|register|join|how do i start/.test(t)) return 'start';
  if (/leave (a |)message|take (a |)message|call (me |)back|callback|call back/.test(t)) return 'message';
  return null;
}

// Claude Haiku — only for truly unknown questions, 4 second hard timeout
function askHaiku(question) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(RESPONSES.fallback), 3800);
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      system: 'You are Aria, receptionist for CP Restoration Services (credit repair). Answer in ONE sentence only, max 20 words. Be direct. Key facts: Express $3,999/60 days, Standard $2,499/120 days, Financing $750 down+$292/mo, fully open and operational.',
      messages: [{ role:'user', content: question }]
    });
    const req = https.request({
      hostname:'api.anthropic.com', path:'/v1/messages', method:'POST',
      headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'anthropic-version':'2023-06-01'}
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        clearTimeout(timer);
        try { resolve(JSON.parse(d).content[0].text || RESPONSES.fallback); }
        catch(e) { resolve(RESPONSES.fallback); }
      });
    });
    req.on('error', () => { clearTimeout(timer); resolve(RESPONSES.fallback); });
    req.write(body);
    req.end();
  });
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const params = new URLSearchParams(event.body || '');
  const qp = event.queryStringParameters || {};
  const callSid = params.get('CallSid') || qp['sid'] || 'new';
  const speech  = (params.get('SpeechResult') || '').trim();
  const digit   = (params.get('Digits') || '').trim();
  const isNew   = !speech && !digit;

  // Brand new call — instant greeting with IVR options
  if (isNew) {
    return { statusCode:200, headers:{'Content-Type':'text/xml'}, body:twiml(RESPONSES.greeting, callSid, true) };
  }

  // IVR digit press — instant, no API
  if (digit && !speech) {
    if (digit === '1') return { statusCode:200, headers:{'Content-Type':'text/xml'}, body:twiml(RESPONSES.pricing, callSid) };
    if (digit === '2') return { statusCode:200, headers:{'Content-Type':'text/xml'}, body:twiml(RESPONSES.existing, callSid) };
    if (digit === '3') return { statusCode:200, headers:{'Content-Type':'text/xml'}, body:twimlTransfer() };
  }

  // Speech — try keyword match first (microseconds)
  if (speech) {
    const topic = matchTopic(speech);
    if (topic === 'transfer') return { statusCode:200, headers:{'Content-Type':'text/xml'}, body:twimlTransfer() };
    if (topic && RESPONSES[topic]) {
      return { statusCode:200, headers:{'Content-Type':'text/xml'}, body:twiml(RESPONSES[topic], callSid) };
    }
    // Unknown — ask Haiku with hard timeout
    const reply = await askHaiku(speech);
    return { statusCode:200, headers:{'Content-Type':'text/xml'}, body:twiml(reply, callSid) };
  }

  return { statusCode:200, headers:{'Content-Type':'text/xml'}, body:twiml(RESPONSES.greeting, callSid, true) };
};
