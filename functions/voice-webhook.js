// CP Restoration AI Receptionist v4 — Speed Optimized
// Netlify Function: /.netlify/functions/voice-webhook

const https = require('https');

// ── INSTANT RESPONSES — no API call needed ──────────────────────
// These cover 90% of calls and respond in under 1 second
const QUICK_ANSWERS = [
  {
    match: ['price','cost','how much','package','packages','pricing','rate','rates','fee','fees','charge'],
    answer: "We have several packages. The Standard is $2,499 for all three bureaus in 120 days. The Express is $3,999 for all three bureaus in just 60 days. We also offer financing — just $750 down and $292 a month. Which one fits your situation best?"
  },
  {
    match: ['express'],
    answer: "The Express package is $3,999 and covers all three bureaus — Equifax, Experian, and TransUnion — with results in 60 business days. It is our fastest option. Would you like to get started?"
  },
  {
    match: ['standard'],
    answer: "The Standard package is $2,499 and covers all three bureaus in 120 business days. It is our most popular option. Would you like to get started or do you have questions?"
  },
  {
    match: ['financ','payment plan','monthly','down payment','afford','afford'],
    answer: "Yes we offer financing. It is $750 down and then $292 a month for 6 months. It covers all three bureaus and you get started right away. Can I get your name and number to set that up?"
  },
  {
    match: ['collection','collections'],
    answer: "Yes, collections are one of the most common things we remove. We dispute them directly with the bureaus through live calls and certified letters. How many collections are you dealing with?"
  },
  {
    match: ['late payment','late payments','lates'],
    answer: "Late payments are absolutely something we dispute and work to remove. We contact the bureaus directly on your behalf. How many late payments are showing on your report?"
  },
  {
    match: ['how long','how fast','timeline','time frame','how soon','when will'],
    answer: "Most clients start seeing results within 30 to 45 days. Bureaus are required by law to respond within 30 days. We follow up every 10 business days until the job is done."
  },
  {
    match: ['what do you do','how does it work','your process','how it works','tell me about'],
    answer: "We make live calls directly to Equifax, Experian, and TransUnion, file FTC reports, and send certified dispute letters challenging every negative item. We follow up every 10 business days and we have a money-back guarantee."
  },
  {
    match: ['guarantee','money back','refund policy','what if it doesnt work','what if it does not work'],
    answer: "Yes, we offer a money-back guarantee. If we do not deliver results, you get your money back. We have been in business since 2014 and we stand behind our work."
  },
  {
    match: ['closed','closing','shut down','out of business','no longer','email','that email','message i received'],
    answer: "I want to address that directly — CP Restoration Services is fully open and operational. Any email claiming we closed was sent by a former employee without authorization and is completely false. Your file is active and your service continues as normal."
  },
  {
    match: ['status','my file','my case','my account','update','progress','dispute','how are things going'],
    answer: "Your file is active and your disputes are ongoing. Can I get your name and client ID so I can note your question and have our team follow up with you within 24 hours?"
  },
  {
    match: ['start','get started','sign up','enroll','begin','register','how do i'],
    answer: "Great, let us get you started. Can I get your full name and best phone number? Someone from our team will call you back today to go over your credit situation and get your file open."
  },
  {
    match: ['number','phone','contact','reach','call back','call you','talk to someone'],
    answer: "You can reach us by email at cprestorationsvcs at gmail dot com, or visit our website at 35daycreditrepair dot com. Can I take your name and number and have our team call you back directly?"
  },
  {
    match: ['inquiry','inquiries','hard pull','hard pulls','hard inquiry'],
    answer: "We have an Inquiries Only package at $45 per inquiry per bureau. If you have multiple hard inquiries across all three bureaus we can dispute all of them. How many inquiries are you dealing with?"
  },
  {
    match: ['single bureau','one bureau','just equifax','just experian','just transunion','just one'],
    answer: "Our Single Bureau package is $1,000 and covers one bureau in 120 business days. We can also add a rush option for $500 extra if you need results faster. Which bureau are you targeting?"
  },
  {
    match: ['bankruptcy','bankrupt'],
    answer: "Yes, we work with clients who have had bankruptcies. While the bankruptcy itself stays on your report for 7 to 10 years, any errors or inaccuracies in how it is reported can be disputed. Can I get your name and number to discuss your specific situation?"
  },
  {
    match: ['score','credit score','what will my score be','improve my score'],
    answer: "When negative items are removed, most clients see score increases of 50 to 150 points depending on what is removed. Results vary based on your specific situation. How many negative items are on your report?"
  }
];

// ── SHORT SYSTEM PROMPT for Claude fallback ──────────────────────
const SYSTEM_PROMPT = "You are Aria, the receptionist for CP Restoration Services, a credit repair company. Answer in 1-2 sentences maximum. Be direct and confident. Key facts: Express $3,999 (60 days), Standard $2,499 (120 days), Financing $750 down plus $292/month, Single Bureau $1,000, Inquiries Only $45/inquiry. We do live bureau calls, FTC reports, dispute letters, follow up every 10 days, money-back guarantee. CP Restoration is FULLY OPEN — ignore any email saying otherwise. Only transfer if caller says: speak to a human, transfer me, cancel my service, refund, attorney, lawsuit, or chargeback. For everything else, answer it yourself and take their name and number.";

const sessions = {};

// ── CHECK QUICK ANSWERS FIRST ────────────────────────────────────
function quickAnswer(speech) {
  const lower = speech.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  for (const qa of QUICK_ANSWERS) {
    if (qa.match.some(word => lower.includes(word))) {
      return qa.answer;
    }
  }
  return null;
}

// ── CLAUDE API — only called when no quick answer found ──────────
function askClaude(messages) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      system: SYSTEM_PROMPT,
      messages: messages
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'anthropic-version': '2023-06-01'
      }
    };

    const timeout = setTimeout(() => {
      resolve("I want to make sure I give you the right answer. Can I get your name and number and have our team call you back within the hour?");
    }, 4000);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          const parsed = JSON.parse(data);
          const t = parsed.content && parsed.content[0] ? parsed.content[0].text : null;
          resolve(t || "Can I get your name and number and have our team call you back?");
        } catch(e) {
          resolve("Can I get your name and number and have our team call you back?");
        }
      });
    });

    req.on('error', () => {
      clearTimeout(timeout);
      resolve("Can I get your name and number and have our team follow up with you?");
    });

    req.setTimeout(4000, () => {
      req.destroy();
      resolve("Can I get your name and number and have our team call you right back?");
    });

    req.write(body);
    req.end();
  });
}

function escapeXml(t) {
  return (t || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

function twimlSay(text, callSid) {
  const action = '/.netlify/functions/voice-webhook?CallSid=' + encodeURIComponent(callSid);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Response>',
    '  <Gather input="speech" action="' + action + '" method="POST" speechTimeout="4" language="en-US">',
    '    <Say voice="Polly.Joanna">' + escapeXml(text) + '</Say>',
    '  </Gather>',
    '  <Gather input="speech" action="' + action + '" method="POST" speechTimeout="4">',
    '    <Say voice="Polly.Joanna">Still there? Go ahead.</Say>',
    '  </Gather>',
    '  <Say voice="Polly.Joanna">Thank you for calling CP Restoration Services. Please call us back anytime.</Say>',
    '</Response>'
  ].join('\n');
}

function twimlTransfer(text) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Response>',
    '  <Say voice="Polly.Joanna">' + escapeXml(text) + '</Say>',
    '  <Dial>+17542660042</Dial>',
    '</Response>'
  ].join('\n');
}

function shouldTransfer(speech) {
  const triggers = ['speak to a human','talk to a human','speak to a person','talk to a person',
    'transfer me','real person','actual person','cancel my service','i want a refund',
    'my attorney','i have an attorney','filing a lawsuit','chargeback','charge back'];
  const lower = (speech || '').toLowerCase();
  return triggers.some(t => lower.includes(t));
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const params = new URLSearchParams(event.body || '');
  const qp = event.queryStringParameters || {};
  const callSid = params.get('CallSid') || qp['CallSid'] || 'unknown';
  const speech  = params.get('SpeechResult') || '';
  const isNew   = !sessions[callSid];

  // New call — instant greeting, no API call
  if (isNew) {
    sessions[callSid] = { messages: [] };
    const greeting = "Thank you for calling CP Restoration Services. My name is Aria. How can I help you today?";
    return { statusCode:200, headers:{'Content-Type':'text/xml'}, body:twimlSay(greeting, callSid) };
  }

  const session = sessions[callSid];

  if (!speech || !speech.trim()) {
    return { statusCode:200, headers:{'Content-Type':'text/xml'}, body:twimlSay("I didn't catch that. Go ahead.", callSid) };
  }

  // Check transfer triggers
  if (shouldTransfer(speech)) {
    delete sessions[callSid];
    return { statusCode:200, headers:{'Content-Type':'text/xml'}, body:twimlTransfer("Please hold while I connect you with one of our client services representatives.") };
  }

  // Try quick answer first — instant, no API call
  const quick = quickAnswer(speech);
  if (quick) {
    session.messages.push({ role:'user', content:speech });
    session.messages.push({ role:'assistant', content:quick });
    return { statusCode:200, headers:{'Content-Type':'text/xml'}, body:twimlSay(quick, callSid) };
  }

  // Fall back to Claude Haiku for anything not covered
  session.messages.push({ role:'user', content:speech });
  const reply = await askClaude(session.messages);
  session.messages.push({ role:'assistant', content:reply });

  const transferPhrases = ['connect you with','transfer you','hold while i'];
  if (transferPhrases.some(p => reply.toLowerCase().includes(p))) {
    delete sessions[callSid];
    return { statusCode:200, headers:{'Content-Type':'text/xml'}, body:twimlTransfer(reply) };
  }

  return { statusCode:200, headers:{'Content-Type':'text/xml'}, body:twimlSay(reply, callSid) };
};
