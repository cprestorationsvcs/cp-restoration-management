// CP Restoration AI Receptionist — Express server for Render.com
const https   = require('https');
const http    = require('http');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const TRANSFER_NUMBER = '+17542660042';

// ── TWIML HELPERS ────────────────────────────────────────────────
function say(text, sid, state, extra) {
  const qs = '?sid=' + encodeURIComponent(sid) + '&state=' + state + (extra ? '&name=' + encodeURIComponent(extra) : '');
  const action = process.env.RENDER_URL + '/aria' + qs;
  return '<?xml version="1.0" encoding="UTF-8"?><Response>' +
    '<Gather input="speech" action="' + action + '" method="POST" speechTimeout="5" language="en-US">' +
    '<Say voice="Polly.Joanna">' + esc(text) + '</Say>' +
    '</Gather>' +
    '<Say voice="Polly.Joanna">I did not catch that. Please call us back anytime.</Say>' +
    '</Response>';
}

function transfer(text) {
  return '<?xml version="1.0" encoding="UTF-8"?><Response>' +
    '<Say voice="Polly.Joanna">' + esc(text) + '</Say>' +
    '<Dial>' + TRANSFER_NUMBER + '</Dial>' +
    '</Response>';
}

function end(text) {
  return '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">' + esc(text) + '</Say></Response>';
}

function esc(t) {
  return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

// ── INSTANT RESPONSES ────────────────────────────────────────────
function getAnswer(speech) {
  const t = (speech||'').toLowerCase();
  if (/transfer|speak to (a |)(human|person|rep)|real person|talk to (a |)(human|person)|connect me/.test(t)) return 'TRANSFER';
  if (/cancel|refund|attorney|lawsuit|charg.?back/.test(t)) return 'TRANSFER';
  if (/closed|closing|shut down|out of business|email.*clos|heard.*clos|told.*clos/.test(t))
    return 'CP Restoration is fully open and operational. Any email claiming we closed was sent by a former employee without authorization and is completely false. Your file is active and your service continues as normal. Is there anything else I can help you with?';
  if (/\bexpress\b/.test(t))
    return 'The Express package is $3,999 covering all three bureaus in 60 business days. It is our fastest option with a money-back guarantee.';
  if (/\bstandard\b/.test(t))
    return 'The Standard package is $2,499 covering all three bureaus in 120 business days. It is our most popular option.';
  if (/financ|payment plan|monthly|down payment|afford/.test(t))
    return 'Our financing option is $750 down and $292 a month for 6 months. You get started right away covering all three bureaus.';
  if (/price|cost|how much|package|pricing|rate|fee|charge|option/.test(t))
    return 'Our Standard package is $2,499 for all three bureaus in 120 business days. Express is $3,999 for results in 60 days. We also have financing with $750 down and $292 a month.';
  if (/how long|how fast|timeline|how soon|when will|long does/.test(t))
    return 'Most clients see results within 30 to 45 days. Bureaus must respond within 30 days by law and we follow up every 10 business days.';
  if (/what do you do|how does it work|process|how it works|tell me about/.test(t))
    return 'We make live calls to all three credit bureaus, file FTC identity theft reports, and send certified dispute letters. We follow up every 10 business days with a money-back guarantee.';
  if (/collect/.test(t))
    return 'Yes, collections are one of the most common things we remove through live bureau calls and certified dispute letters.';
  if (/guarantee|money back/.test(t))
    return 'Yes, we offer a money-back guarantee. If we do not deliver results you get your money back. We have been in business since 2014.';
  if (/my (file|case|account|dispute|status)|existing client|already (a |)client/.test(t))
    return 'Your file is active and your disputes are ongoing. Our team follows up within 24 hours on all questions.';
  if (/score|credit score/.test(t))
    return 'Most clients see score increases of 50 to 150 points when negative items are removed. Results depend on your specific situation.';
  if (/bankruptcy|bankrupt/.test(t))
    return 'Yes, we work with clients who have had bankruptcies. While the bankruptcy itself stays on your report, any errors in how it is reported can be disputed.';
  if (/inquiry|inquiries|hard pull/.test(t))
    return 'Our Inquiries Only package is $45 per inquiry per bureau. We can dispute all hard inquiries across all three bureaus.';
  if (/single bureau|one bureau/.test(t))
    return 'Our Single Bureau package is $1,000 covering one bureau in 120 business days. We can add a rush option for $500 extra.';
  if (/yes|yeah|sure|ok|okay|yep|please|go ahead/.test(t)) return 'YES';
  return null;
}

// ── CLAUDE HAIKU FALLBACK ────────────────────────────────────────
function askHaiku(question) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 4000);
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      system: 'You are Aria, receptionist for CP Restoration Services (credit repair, founded 2014). Answer in ONE sentence, max 15 words. Be direct and confident. Packages: Express $3,999/60 days, Standard $2,499/120 days, Financing $750 down+$292/mo. Company is fully open. Never ask for name or number in your answer.',
      messages: [{ role:'user', content: question }]
    });
    const req = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: { 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(body), 'anthropic-version':'2023-06-01' }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        clearTimeout(timer);
        try { resolve(JSON.parse(d).content[0].text || null); }
        catch(e) { resolve(null); }
      });
    });
    req.on('error', () => { clearTimeout(timer); resolve(null); });
    req.write(body); req.end();
  });
}

// ── CALL RECORDS (in-memory) ──────────────────────────────────────
const callRecords = {};

function logCall(rec) {
  const existing = callRecords[rec.callSid] || {};
  callRecords[rec.callSid] = {
    ...existing,
    callSid:   rec.callSid,
    caller:    rec.caller   || existing.caller    || 'Unknown',
    startTime: existing.startTime || rec.time     || new Date().toISOString(),
    lastTime:  rec.time           || new Date().toISOString(),
    state:     rec.state          || existing.state,
    topic:     rec.topic          || existing.topic || '',
    name:      rec.name           || existing.name  || '',
    number:    rec.number         || existing.number|| '',
    transcript:[...(existing.transcript||[]), ...(rec.speech?[{time:rec.time,text:rec.speech}]:[])]
  };
}

// ── PARSE BODY ────────────────────────────────────────────────────
function parseBody(body) {
  const p = new URLSearchParams(body || '');
  return {
    get: (k) => p.get(k) || ''
  };
}

function parseQuery(url) {
  try { return Object.fromEntries(new URL('http://x.com' + url).searchParams); }
  catch(e) { return {}; }
}

// ── HTTP SERVER ───────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // Health check
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, {'Content-Type':'text/plain'});
    res.end('CP Restoration AI Receptionist — Online');
    return;
  }

  // Call records API for dashboard
  if (req.url === '/calls' || req.url.startsWith('/calls?')) {
    res.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
    const records = Object.values(callRecords).sort((a,b)=>(b.lastTime||'').localeCompare(a.lastTime||'')).slice(0,100);
    res.end(JSON.stringify({ records }));
    return;
  }

  // Aria voice webhook
  if (req.url.startsWith('/aria')) {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      const params = parseBody(body);
      const qp     = parseQuery(req.url);
      const sid    = params.get('CallSid') || qp['sid'] || ('call_' + Date.now());
      const caller = params.get('From') || 'Unknown';
      const speech = params.get('SpeechResult').trim();
      const state  = qp['state'] || 'new';
      const name   = decodeURIComponent(qp['name'] || '');
      const now    = new Date().toISOString();

      res.writeHead(200, {'Content-Type':'text/xml'});

      try {
        // NEW CALL
        if (state === 'new') {
          logCall({ callSid:sid, caller, state:'started', time:now });
          res.end(say('Thank you for calling CP Restoration Services. My name is Aria. How can I help you today?', sid, 'main'));
          return;
        }

        // COLLECT NAME
        if (state === 'waitname') {
          if (!speech) { res.end(say("I did not catch that. Can you say your name?", sid, 'waitname')); return; }
          logCall({ callSid:sid, caller, state:'got_name', time:now, name:speech });
          res.end(say('Thank you ' + speech + '. And what is the best phone number to reach you?', sid, 'waitnumber', speech));
          return;
        }

        // COLLECT NUMBER
        if (state === 'waitnumber') {
          if (!speech) { res.end(say("I did not catch that. Can you repeat your number?", sid, 'waitnumber', name)); return; }
          logCall({ callSid:sid, caller, state:'completed', time:now, name, number:speech });
          res.end(end('Perfect. I have your name as ' + (name||'there') + ' and your number as ' + speech + '. Our team will follow up within 24 hours. Thank you for calling CP Restoration Services. Have a great day.'));
          return;
        }

        // OFFER RESPONSE
        if (state === 'waitname_offer') {
          if (/yes|yeah|sure|ok|okay|yep|please|go ahead/.test(speech.toLowerCase())) {
            res.end(say('Can I get your full name?', sid, 'waitname'));
          } else {
            logCall({ callSid:sid, caller, state:'declined_info', time:now });
            res.end(end('No problem at all. Thank you for calling CP Restoration Services. Have a great day.'));
          }
          return;
        }

        // NO SPEECH
        if (!speech) {
          res.end(say("I did not catch that. How can I help you?", sid, 'main'));
          return;
        }

        // GET INSTANT ANSWER
        const answer = getAnswer(speech);

        if (answer === 'TRANSFER') {
          logCall({ callSid:sid, caller, state:'transferred', time:now, speech, topic:'transfer' });
          res.end(transfer('Please hold while I connect you with one of our client services representatives.'));
          return;
        }

        if (answer === 'YES') {
          res.end(say('Can I get your full name?', sid, 'waitname'));
          return;
        }

        if (answer) {
          logCall({ callSid:sid, caller, state:'answered', time:now, speech });
          res.end(say(answer + ' Would you like to leave your name and number so our team can follow up?', sid, 'waitname_offer'));
          return;
        }

        // HAIKU FALLBACK
        const haikuReply = await askHaiku(speech);
        const finalReply = haikuReply || 'Can I take your name and number so our team can follow up with you today?';
        logCall({ callSid:sid, caller, state:'answered', time:now, speech, topic:'other' });
        res.end(say(finalReply + ' Would you like to leave your name and number?', sid, 'waitname_offer'));

      } catch(err) {
        console.error('Error:', err.message);
        res.end(transfer('Thank you for calling CP Restoration Services. Please hold while I connect you with our team.'));
      }
    });
    return;
  }

  res.writeHead(404, {'Content-Type':'text/plain'});
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log('CP Restoration AI Receptionist running on port ' + PORT);
});
