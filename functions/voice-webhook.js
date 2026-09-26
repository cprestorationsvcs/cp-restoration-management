// CP Restoration AI Receptionist — Bare minimum, zero dependencies
exports.handler = async (event, context) => {
  const params = new URLSearchParams(event.body || '');
  const qp     = event.queryStringParameters || {};
  const state  = qp['state'] || 'new';
  const speech = (params.get('SpeechResult') || '').trim().toLowerCase();
  const sid    = params.get('CallSid') || qp['sid'] || 'unknown';
  const name   = decodeURIComponent(qp['name'] || '');

  const say = (text, nextState, extra) => {
    const qs = '?sid=' + encodeURIComponent(sid) + '&state=' + nextState + (extra ? '&name=' + encodeURIComponent(extra) : '');
    const action = '/.netlify/functions/voice-webhook' + qs;
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: '<?xml version="1.0" encoding="UTF-8"?><Response>' +
        '<Gather input="speech" action="' + action + '" method="POST" speechTimeout="5" language="en-US">' +
        '<Say voice="Polly.Joanna">' + text + '</Say>' +
        '</Gather>' +
        '<Say voice="Polly.Joanna">Thank you for calling. Please call us back anytime.</Say>' +
        '</Response>'
    };
  };

  const transfer = (text) => ({
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: '<?xml version="1.0" encoding="UTF-8"?><Response>' +
      '<Say voice="Polly.Joanna">' + text + '</Say>' +
      '<Dial>+17542660042</Dial>' +
      '</Response>'
  });

  const end = (text) => ({
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">' + text + '</Say></Response>'
  });

  // NEW CALL
  if (state === 'new') {
    return say('Thank you for calling CP Restoration Services. My name is Aria. How can I help you today?', 'main');
  }

  // COLLECT NAME
  if (state === 'waitname') {
    if (!speech) return say('I did not catch that. Can you say your name?', 'waitname');
    return say('Thank you. And what is the best phone number to reach you?', 'waitnumber', speech);
  }

  // COLLECT NUMBER - done
  if (state === 'waitnumber') {
    if (!speech) return say('I did not catch that. Can you repeat your number?', 'waitnumber', name);
    const callerName = name || 'there';
    return end('Perfect. I have your name as ' + callerName + ' and I will pass your number along. Our team will follow up within 24 hours. Thank you for calling CP Restoration Services. Have a great day.');
  }

  // OFFER ACCEPTED
  if (state === 'waitname_offer') {
    if (/yes|yeah|sure|ok|okay|yep|please/.test(speech)) return say('Can I get your full name?', 'waitname');
    return end('No problem. Thank you for calling CP Restoration Services. Have a great day.');
  }

  // TRANSFER TRIGGERS
  if (/transfer|speak to (a |)(human|person)|real person|cancel|refund|attorney|lawsuit|chargeback/.test(speech)) {
    return transfer('Please hold while I connect you with one of our client services representatives.');
  }

  // PRICING
  if (/price|cost|how much|package|rate|fee/.test(speech)) {
    return say('Our Standard package is $2,499 covering all three bureaus in 120 business days. Express is $3,999 for results in 60 days. We also offer financing with $750 down and $292 a month. Would you like to leave your name and number for a follow-up?', 'waitname_offer');
  }

  // EXPRESS
  if (/express/.test(speech)) {
    return say('The Express package is $3,999 for all three bureaus in 60 business days with a money-back guarantee. Would you like to leave your name and number?', 'waitname_offer');
  }

  // STANDARD
  if (/standard/.test(speech)) {
    return say('The Standard package is $2,499 covering all three bureaus in 120 business days. Our most popular option. Would you like to leave your name and number?', 'waitname_offer');
  }

  // FINANCING
  if (/financ|payment plan|monthly|down payment/.test(speech)) {
    return say('Our financing option is $750 down and $292 a month for 6 months covering all three bureaus. Would you like to leave your name and number to get started?', 'waitname_offer');
  }

  // PROCESS
  if (/how does it work|what do you do|process/.test(speech)) {
    return say('We make live calls to all three credit bureaus, file FTC reports, and send certified dispute letters. We follow up every 10 business days with a money-back guarantee. Would you like to leave your name and number?', 'waitname_offer');
  }

  // TIMELINE
  if (/how long|how fast|when|timeline/.test(speech)) {
    return say('Most clients see results within 30 to 45 days. Bureaus must respond within 30 days by law and we follow up every 10 business days. Would you like to leave your name and number?', 'waitname_offer');
  }

  // COLLECTIONS
  if (/collect/.test(speech)) {
    return say('Yes, collections are one of the most common things we remove through live bureau calls and certified letters. Would you like to leave your name and number?', 'waitname_offer');
  }

  // GUARANTEE
  if (/guarantee|money back/.test(speech)) {
    return say('Yes, we offer a money-back guarantee. If we do not deliver results you get your money back. We have been in business since 2014. Would you like to leave your name and number?', 'waitname_offer');
  }

  // CLOSURE EMAIL
  if (/closed|closing|shut down|email|notice/.test(speech)) {
    return say('CP Restoration is fully open and operational. Any email claiming we closed was sent by a former employee without authorization and is completely false. Your file is active and your service continues as normal. Is there anything else I can help you with?', 'main');
  }

  // EXISTING CLIENT
  if (/my (file|case|account|status)|existing|already a client/.test(speech)) {
    return say('Your file is active and your disputes are ongoing. Our team follows up within 24 hours. Can I get your name and number so we can reach you directly?', 'waitname');
  }

  // YES
  if (/^(yes|yeah|sure|ok|okay|yep|please|go ahead)/.test(speech)) {
    return say('Can I get your full name?', 'waitname');
  }

  // DEFAULT - take a message
  return say('Thank you for that. Can I get your name and best phone number so our team can follow up with you within 24 hours?', 'waitname');
};
