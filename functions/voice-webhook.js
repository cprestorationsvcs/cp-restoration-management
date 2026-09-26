// CP Restoration AI Receptionist — Twilio Voice Webhook
// Netlify Function: /.netlify/functions/voice-webhook
// Deploy this to your Netlify site and point Twilio to it

const https = require('https');

// ── COMPANY KNOWLEDGE BASE ────────────────────────────────────────
const SYSTEM_PROMPT = `You are Aria, the AI receptionist for CP Restoration Services, a credit repair company founded in 2014 by Jason Crown in Coconut Creek, FL.

CRITICAL SITUATION: CP Restoration Services is FULLY OPERATIONAL. A former employee named Xyla left and started a competing company, taking some staff and emailing our clients to switch. If any caller mentions receiving emails about switching companies, a company closing, or going with a cheaper service — reassure them firmly that CP Restoration is open, their file is safe, and we are not going anywhere.

YOUR ROLE:
- Answer all incoming calls professionally as Aria
- Handle customer service questions about active client files
- Handle sales inquiries — explain packages and capture lead info  
- Reassure existing clients their service continues uninterrupted
- Escalate to a client services representative when needed

COMPANY INFO:
- Name: CP Restoration Services | Website: 35daycreditrepair.com
- Email: cprestorationsvcs@gmail.com
- Location: Coconut Creek, FL | Founded: 2014
- Client portal: portal-cprestorationsvcs.com

PACKAGES:
- Express: $3,999 — all 3 bureaus — 60 business days
- Standard: $2,499 — all 3 bureaus — 120 business days  
- Financing: $750 down + $292/month x 6 months — all 3 bureaus
- Single Bureau: $1,000 — one bureau — 120 business days (Rush +$500)
- Inquiries Only: $45 per inquiry per bureau — 120 days (Rush +$500)

PROCESS: Live bureau calls + FTC reports + certified dispute letters. Follow up every 10 business days. Money-back guarantee if we don't deliver.

VOICE RULES (VERY IMPORTANT):
- Keep responses SHORT — 2-3 sentences max for voice calls
- Speak naturally, no bullet points, no lists
- Never say "I am an AI" — just say you are Aria, the virtual assistant
- Ask one question at a time
- If caller wants to speak to a human or a representative, say: "Absolutely, let me connect you with one of our client services representatives right now. Please hold for just a moment."

ESCALATE immediately when caller says: cancel, refund, lawsuit, attorney, chargeback, speak to owner, speak to representative, urgent, emergency, legal action.

For sales leads: get their name, what credit issues they have, and their phone number for follow-up.`;

// ── CALL SESSIONS (in-memory, resets on cold start) ──────────────
const sessions = {};

// ── CLAUDE API CALL ───────────────────────────────────────────────
function askClaude(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 150, // Keep voice responses short
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
          const text = parsed.content && parsed.content[0] ? parsed.content[0].text : null;
          resolve(text || 'I apologize for the delay. Let me connect you with Jason Crown directly. Please hold.');
        } catch(e) {
          resolve('Thank you for calling CP Restoration Services. Please hold while I connect you with Jason Crown.');
        }
      });
    });

    req.on('error', () => {
      resolve('Thank you for calling CP Restoration Services. Please hold while I connect you with one of our client services representatives.');
    });

    req.write(body);
    req.end();
  });
}

// ── TWIML HELPERS ────────────────────────────────────────────────
function twimlSay(text, gather = true, callSid = '') {
  const gatherAction = `/.netlify/functions/voice-webhook?CallSid=${encodeURIComponent(callSid)}`;
  if (gather) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${gatherAction}" method="POST" speechTimeout="3" language="en-US">
    <Say voice="Polly.Joanna">${escapeXml(text)}</Say>
  </Gather>
  <Say voice="Polly.Joanna">I didn't catch that. Let me connect you with Jason Crown directly.</Say>
  <Dial>${'+17542660042'}</Dial>
</Response>`;
  } else {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(text)}</Say>
  <Hangup/>
</Response>`;
  }
}

function twimlTransfer(text, phone) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(text)}</Say>
  <Dial>${phone}</Dial>
</Response>`;
}

function escapeXml(text) {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── ESCALATION CHECK ─────────────────────────────────────────────
function shouldEscalate(text) {
  const triggers = ['cancel','refund','lawsuit','attorney','chargeback',
    'speak to owner','speak to jason','jason crown','urgent','emergency',
    'legal','lawyer','sue','scam','fraud','police'];
  const lower = (text || '').toLowerCase();
  return triggers.some(t => lower.includes(t));
}

// ── MAIN HANDLER ─────────────────────────────────────────────────
exports.handler = async (event, context) => {
  const params = new URLSearchParams(event.body || '');
  const queryParams = new URLSearchParams((event.rawQuery || event.queryStringParameters ? 
    new URLSearchParams(event.queryStringParameters || {}).toString() : ''));
  
  const callSid  = params.get('CallSid') || queryParams.get('CallSid') || 'unknown';
  const speech   = params.get('SpeechResult') || '';
  const callStatus = params.get('CallStatus') || '';
  const isNew    = !sessions[callSid];

  // ── New call: greeting ────────────────────────────────────────
  if (isNew) {
    sessions[callSid] = { messages: [], startTime: Date.now() };
    const greeting = "Thank you for calling CP Restoration Services. My name is Aria, your virtual assistant. We are fully open and actively working for all of our clients. How can I help you today?";
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: twimlSay(greeting, true, callSid)
    };
  }

  // ── Existing call: process speech ─────────────────────────────
  const session = sessions[callSid];

  if (!speech || speech.trim() === '') {
    // No speech detected
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: twimlSay("I'm sorry, I didn't catch that. Could you please repeat that?", true, callSid)
    };
  }

  // Add caller message to session
  session.messages.push({ role: 'user', content: speech });

  // Check for escalation triggers
  if (shouldEscalate(speech)) {
    const transferMsg = "Absolutely, let me connect you with one of our client services representatives right now. Please hold for just one moment.";
    delete sessions[callSid];
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: twimlTransfer(transferMsg, '+17542660042')
    };
  }

  // Get AI response
  const aiReply = await askClaude(session.messages);

  // Add AI response to session
  session.messages.push({ role: 'assistant', content: aiReply });

  // Check if AI decided to transfer
  const transferPhrases = ['connect you with', 'transfer you to our representative', 'put you through to our team'];
  const shouldTransfer = transferPhrases.some(p => aiReply.toLowerCase().includes(p));

  if (shouldTransfer) {
    delete sessions[callSid];
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: twimlTransfer(aiReply, '+17542660042')
    };
  }

  // Normal AI response — keep conversation going
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: twimlSay(aiReply, true, callSid)
  };
};
