// CP Restoration AI Receptionist — Twilio Voice Webhook
// Netlify Function: /.netlify/functions/voice-webhook

const https = require('https');

const SYSTEM_PROMPT = [
  "You are Aria, the AI receptionist for CP Restoration Services, a credit repair company",
  "founded in 2014 in Coconut Creek, FL. Website: 35daycreditrepair.com.",
  "Email: cprestorationsvcs@gmail.com.",
  "",
  "YOUR PRIMARY JOB: Answer questions, reassure clients, and take detailed messages.",
  "You handle the call yourself. Do NOT transfer unless the caller explicitly demands a human.",
  "",
  "CRITICAL: CP Restoration Services is FULLY OPERATIONAL.",
  "A former employee sent a fraudulent email claiming the company closed.",
  "If any caller mentions this — say firmly: CP Restoration is fully open.",
  "That email was sent by a former employee without authorization and is completely false.",
  "Your file is active and your service continues as normal.",
  "",
  "PACKAGES:",
  "Express: $3,999 — all 3 bureaus — 60 business days.",
  "Standard: $2,499 — all 3 bureaus — 120 business days.",
  "Financing: $750 down plus $292 per month for 6 months — all 3 bureaus.",
  "Single Bureau: $1,000 — one bureau — 120 days — Rush add-on $500.",
  "Inquiries Only: $45 per inquiry per bureau — 120 days — Rush add-on $500.",
  "",
  "OUR PROCESS: Live bureau calls, FTC reports, certified dispute letters.",
  "We follow up every 10 business days. Money-back guarantee.",
  "",
  "HOW TO HANDLE CALLS:",
  "EXISTING CLIENT: Reassure their file is active. Collect name, client ID, phone number,",
  "and their question. Tell them the team follows up within 24 hours. Do not transfer.",
  "NEW PROSPECT: Ask about their credit issues and how many negative items.",
  "Recommend a package. Mention financing. Collect name and phone for follow-up.",
  "CLOSURE EMAIL CALLER: Immediately reassure them it was fraudulent. Company is open.",
  "TAKING A MESSAGE: Get full name, phone number, best callback time, reason for calling.",
  "Confirm it back to them. End with: I have logged your message and our team will",
  "follow up within 24 hours. Thank you for calling CP Restoration Services.",
  "",
  "VOICE RULES:",
  "Keep every response to 2-3 sentences maximum — this is a phone call.",
  "Speak naturally. Ask only one question at a time.",
  "Sound warm, calm, and confident. Never say you are an AI.",
  "",
  "ONLY TRANSFER when caller explicitly says:",
  "speak to a human, talk to a person, transfer me, real person,",
  "cancel my service, I want a refund, my attorney, filing a lawsuit, chargeback.",
  "For everything else — answer it, reassure them, and take a message."
].join('\n');

const sessions = {};

function askClaude(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
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

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const t = parsed.content && parsed.content[0] ? parsed.content[0].text : null;
          resolve(t || 'I apologize for the delay. Let me take your name and number and have someone follow up with you shortly.');
        } catch(e) {
          resolve('Thank you for calling CP Restoration Services. Can I get your name and best callback number so our team can follow up with you?');
        }
      });
    });

    req.on('error', () => {
      resolve('Thank you for calling CP Restoration Services. Can I get your name and best callback number so our team can follow up with you?');
    });

    req.write(body);
    req.end();
  });
}

function escapeXml(t) {
  return (t || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function twimlSay(text, callSid) {
  const action = '/.netlify/functions/voice-webhook?CallSid=' + encodeURIComponent(callSid);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Response>',
    '  <Gather input="speech" action="' + action + '" method="POST" speechTimeout="5" language="en-US">',
    '    <Say voice="Polly.Joanna">' + escapeXml(text) + '</Say>',
    '  </Gather>',
    '  <Say voice="Polly.Joanna">I didn\'t catch that. Can I get your name and number so our team can call you back?</Say>',
    '  <Gather input="speech" action="' + action + '" method="POST" speechTimeout="5" language="en-US">',
    '    <Say voice="Polly.Joanna">Please go ahead.</Say>',
    '  </Gather>',
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

function shouldTransfer(text) {
  const triggers = [
    'speak to a human',
    'talk to a human',
    'speak to a person',
    'talk to a person',
    'transfer me',
    'real person',
    'cancel my service',
    'i want a refund',
    'requesting a refund',
    'my attorney',
    'i have an attorney',
    'filing a lawsuit',
    'chargeback',
    'charge back'
  ];
  const lower = (text || '').toLowerCase();
  return triggers.some(t => lower.includes(t));
}

exports.handler = async (event, context) => {
  const params = new URLSearchParams(event.body || '');
  const qp = event.queryStringParameters || {};
  const callSid = params.get('CallSid') || qp['CallSid'] || 'unknown';
  const speech  = params.get('SpeechResult') || '';
  const isNew   = !sessions[callSid];

  // New call — greeting
  if (isNew) {
    sessions[callSid] = { messages: [] };
    const greeting = "Thank you for calling CP Restoration Services. My name is Aria, your virtual assistant. We are fully open and here to help. How can I assist you today?";
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: twimlSay(greeting, callSid)
    };
  }

  const session = sessions[callSid];

  // No speech
  if (!speech || !speech.trim()) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: twimlSay("I'm sorry, I didn't catch that. Could you please repeat what you said?", callSid)
    };
  }

  // Check for explicit transfer request
  if (shouldTransfer(speech)) {
    delete sessions[callSid];
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: twimlTransfer("Of course. Please hold for just a moment while I connect you with one of our client services representatives.")
    };
  }

  // Add to session and get AI response
  session.messages.push({ role: 'user', content: speech });
  const reply = await askClaude(session.messages);
  session.messages.push({ role: 'assistant', content: reply });

  // Check if AI itself decided to transfer
  const aiTransferPhrases = ['connect you with', 'transfer you to', 'let me put you through'];
  const aiWantsTransfer = aiTransferPhrases.some(p => reply.toLowerCase().includes(p));

  if (aiWantsTransfer) {
    delete sessions[callSid];
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: twimlTransfer(reply)
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: twimlSay(reply, callSid)
  };
};
