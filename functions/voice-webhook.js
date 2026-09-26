// CP Restoration AI Receptionist — Twilio Voice Webhook v3.0
// Netlify Function: /.netlify/functions/voice-webhook

const https = require('https');

const SYSTEM_PROMPT = [
  "You are Aria, the virtual receptionist for CP Restoration Services.",
  "You know everything about this company and you answer questions directly and confidently.",
  "You never say 'let me find out' or 'I am not sure' — you know the answers and you give them.",
  "",
  "COMPANY: CP Restoration Services | Founded 2014 | Coconut Creek, FL",
  "Website: 35daycreditrepair.com | Email: cprestorationsvcs@gmail.com",
  "",
  "STATUS: CP Restoration is FULLY OPEN AND OPERATIONAL.",
  "A former employee recently sent a fraudulent email to clients claiming the company closed.",
  "That email was completely false and unauthorized.",
  "If any caller brings this up, tell them immediately and confidently:",
  "That email was not from us. CP Restoration is fully open.",
  "Your file is active, your disputes are ongoing, and nothing has changed.",
  "",
  "PACKAGES — know these cold and quote them confidently:",
  "EXPRESS: $3,999 flat — covers all 3 bureaus — results in 60 business days.",
  "STANDARD: $2,499 flat — covers all 3 bureaus — results in 120 business days.",
  "FINANCING: $750 down, then $292 per month for 6 months — covers all 3 bureaus.",
  "SINGLE BUREAU: $1,000 — one bureau only — 120 business days — add $500 for rush.",
  "INQUIRIES ONLY: $45 per inquiry per bureau — 120 business days — add $500 for rush.",
  "",
  "WHAT WE DO: We make live calls directly to Equifax, Experian, and TransUnion.",
  "We file FTC identity theft reports on your behalf.",
  "We send certified dispute letters to challenge every negative item.",
  "We follow up every 10 business days until items are removed.",
  "We offer a money-back guarantee if we do not deliver results.",
  "",
  "HOW LONG IT TAKES: Most clients start seeing results within 30-45 days.",
  "Bureaus are required by law to respond to disputes within 30 days.",
  "We keep working until the job is done.",
  "",
  "WHO CAN WE HELP: Anyone with collections, charge-offs, late payments,",
  "repossessions, bankruptcies, medical debt, student loans, or too many hard inquiries.",
  "We work with all credit situations.",
  "",
  "HOW TO GET STARTED: We collect your information, review your credit report,",
  "identify all disputable items, and begin the process immediately.",
  "The client onboarding form is at portal-cprestorationsvcs.com",
  "",
  "EXISTING CLIENTS: Their file is active. Disputes are ongoing.",
  "The team follows up within 24 hours on any questions.",
  "Collect their name, client ID if they have it, phone number, and their question.",
  "",
  "YOUR PERSONALITY:",
  "Warm, confident, knowledgeable. You sound like a real person who knows this company inside and out.",
  "You answer questions directly — no fluff, no runaround.",
  "If someone asks how much the Express package is, you say: The Express package is $3,999 and covers all three bureaus in 60 business days.",
  "If someone asks what you do, you explain the process clearly and confidently.",
  "If someone asks if you can help with collections, you say: Yes, absolutely — collections are one of the most common things we dispute and remove.",
  "",
  "TAKING MESSAGES:",
  "After answering their questions, always offer to take their information.",
  "Collect: full name, best phone number, best time to call, and what they need help with.",
  "Confirm it back: So just to confirm — your name is [name], best number is [number], and you need help with [topic]. Is that right?",
  "End every message with: Perfect. Our team will follow up with you within 24 hours. Thank you for calling CP Restoration Services.",
  "",
  "VOICE RULES:",
  "Maximum 2-3 sentences per response. This is a phone call, not an email.",
  "One question at a time. Never list more than 3 things at once.",
  "Sound human. Sound confident. Sound helpful.",
  "Never say you are an AI. You are Aria, the virtual receptionist.",
  "",
  "ONLY TRANSFER when caller says one of these exact things:",
  "speak to a human, talk to a person, transfer me, real person,",
  "cancel my service, I want a refund, my attorney, lawsuit, chargeback.",
  "For every other question — answer it yourself. You know everything you need to know."
].join('\n');

const sessions = {};

function askClaude(messages) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 250,
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
          resolve(t || 'Thank you for calling CP Restoration Services. Can I get your name and best callback number?');
        } catch(e) {
          resolve('Thank you for calling CP Restoration Services. Can I get your name and best callback number?');
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
    '  <Gather input="speech" action="' + action + '" method="POST" speechTimeout="5" language="en-US" enhanced="true">',
    '    <Say voice="Polly.Joanna">' + escapeXml(text) + '</Say>',
    '  </Gather>',
    '  <Gather input="speech" action="' + action + '" method="POST" speechTimeout="5" language="en-US">',
    '    <Say voice="Polly.Joanna">Are you still there? I\'m here to help. Go ahead.</Say>',
    '  </Gather>',
    '  <Say voice="Polly.Joanna">Thank you for calling CP Restoration Services. Please call us back and we will be happy to help you.</Say>',
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
  const triggers = [
    'speak to a human', 'talk to a human', 'speak to a person',
    'talk to a person', 'transfer me', 'real person', 'actual person',
    'cancel my service', 'i want a refund', 'requesting a refund',
    'my attorney', 'i have an attorney', 'filing a lawsuit',
    'chargeback', 'charge back'
  ];
  const lower = (speech || '').toLowerCase();
  return triggers.some(t => lower.includes(t));
}

exports.handler = async (event, context) => {
  const params = new URLSearchParams(event.body || '');
  const qp = event.queryStringParameters || {};
  const callSid = params.get('CallSid') || qp['CallSid'] || 'unknown';
  const speech  = params.get('SpeechResult') || '';
  const isNew   = !sessions[callSid];

  if (isNew) {
    sessions[callSid] = { messages: [] };
    const greeting = "Thank you for calling CP Restoration Services. My name is Aria. We help people remove negative items from their credit reports and we have been doing it since 2014. How can I help you today?";
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: twimlSay(greeting, callSid)
    };
  }

  const session = sessions[callSid];

  if (!speech || !speech.trim()) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: twimlSay("I didn't quite catch that. Go ahead, I'm listening.", callSid)
    };
  }

  if (shouldTransfer(speech)) {
    delete sessions[callSid];
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: twimlTransfer("Absolutely. Please hold for just a moment while I connect you with one of our client services representatives.")
    };
  }

  session.messages.push({ role: 'user', content: speech });
  const reply = await askClaude(session.messages);
  session.messages.push({ role: 'assistant', content: reply });

  const transferPhrases = ['connect you with', 'transfer you to', 'let me put you through', 'hold while i'];
  if (transferPhrases.some(p => reply.toLowerCase().includes(p))) {
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
