exports.handler = function(context, event, callback) {
  const twiml  = new Twilio.twiml.VoiceResponse();
  const state  = event.state  || 'new';
  const speech = (event.SpeechResult || '').toLowerCase().trim();
  const name   = event.callerName || '';
  const BASE   = 'https://aria-1831.twil.io/path_4';

  // ── HELPERS ──────────────────────────────────────────────────────
  function say(text, nextState, extra) {
    var url = BASE + '?state=' + nextState;
    if (extra) url += '&callerName=' + encodeURIComponent(extra);
    var gather = twiml.gather({ input:'speech', action:url, method:'POST', speechTimeout:'5', language:'en-US' });
    gather.say({ voice:'Polly.Joanna' }, text);
    twiml.say({ voice:'Polly.Joanna' }, 'I did not catch that. Our team will follow up with you shortly. Thank you for calling CP Restoration Services.');
    callback(null, twiml);
  }

  function transfer(text) {
    twiml.say({ voice:'Polly.Joanna' }, text);
    twiml.dial('+17542660042');
    callback(null, twiml);
  }

  function end(text) {
    twiml.say({ voice:'Polly.Joanna' }, text);
    callback(null, twiml);
  }

  // ── BUSINESS HOURS CHECK (Eastern Time) ──────────────────────────
  function isBusinessHours() {
    var now = new Date();
    // Convert to Eastern Time
    var et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    var day  = et.getDay();   // 0=Sun, 1=Mon ... 5=Fri, 6=Sat
    var hour = et.getHours(); // 0-23
    return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
  }

  // ── INSTANT ANSWERS ───────────────────────────────────────────────
  function getAnswer(t) {
    if (/transfer|speak to (a |)(human|person|rep)|real person|connect me/.test(t)) return 'TRANSFER';
    if (/cancel|refund|attorney|lawsuit|charg.?back/.test(t)) return 'TRANSFER';
    if (/closed|closing|shut down|out of business|heard.*clos|told.*clos|email.*clos/.test(t))
      return 'CP Restoration Services is fully open. We are open Monday through Friday 9 AM to 5 PM Eastern. Any message claiming we closed was sent by a former employee and is completely false. Your file is active and we are working on your behalf every business day.';
    if (/\bexpress\b/.test(t))
      return 'The Express package is $3,999 covering all three bureaus in 60 business days with a money-back guarantee.';
    if (/\bstandard\b/.test(t))
      return 'The Standard package is $2,499 covering all three bureaus in 120 business days. That is our most popular option.';
    if (/financ|payment plan|monthly|down payment|afford/.test(t))
      return 'Our financing option is $750 down and $292 a month for 6 months covering all three bureaus.';
    if (/price|cost|how much|package|rate|fee|option/.test(t))
      return 'Our Standard package is $2,499 for all three bureaus in 120 business days. Express is $3,999 in 60 days. We also offer financing with $750 down and $292 a month.';
    if (/how long|timeline|how fast|how soon|when/.test(t))
      return 'Most clients see results within 30 to 45 days. Bureaus must respond within 30 days by law and we follow up every 10 business days.';
    if (/how does it work|what do you do|process|how it works/.test(t))
      return 'We make live calls to all three credit bureaus, file FTC identity theft reports, and send certified dispute letters. We follow up every 10 business days with a money-back guarantee.';
    if (/collect/.test(t))
      return 'Yes, collections are one of the most common items we remove through live bureau calls and certified dispute letters.';
    if (/guarantee|money back/.test(t))
      return 'Yes, we offer a full money-back guarantee. If we do not deliver results you get your money back. We have been in business since 2014.';
    if (/score|credit score/.test(t))
      return 'Most clients see score increases of 50 to 150 points when negative items are removed. Results depend on your specific situation.';
    if (/inquiry|inquiries|hard pull/.test(t))
      return 'Our Inquiries Only package is $45 per inquiry per bureau. We can dispute all hard inquiries across all three bureaus.';
    if (/bankruptcy/.test(t))
      return 'Yes, we work with clients who have had bankruptcies. Any reporting errors can be disputed across all three bureaus.';
    if (/my (file|case|account|dispute|status)|existing|already (a |)client/.test(t))
      return 'Your file is active and your disputes are ongoing. Our team follows up within 24 hours. Let me get your information so a specialist can reach you directly.';
    if (/yes|yeah|sure|ok|okay|yep|please|go ahead/.test(t)) return 'YES';
    return null;
  }

  // ── STATE MACHINE ─────────────────────────────────────────────────
  try {

    // NEW CALL
    if (state === 'new') {
      var open = isBusinessHours();
      if (open) {
        return say(
          'Thank you for calling CP Restoration Services. My name is Aria. Our specialists are available and ready to help. How can I assist you today?',
          'main'
        );
      } else {
        return say(
          'Thank you for calling CP Restoration Services. Our office hours are Monday through Friday 9 AM to 5 PM Eastern Time. We are currently outside of office hours, but I can take your information and a specialist will call you back first thing on the next business day. May I get your full name?',
          'waitname'
        );
      }
    }

    // COLLECT NAME
    if (state === 'waitname') {
      if (!speech) return say('I did not catch that. Could you say your name for me?', 'waitname');
      return say(
        'Thank you ' + speech + '. And what is the best phone number to reach you?',
        'waitnumber', speech
      );
    }

    // COLLECT NUMBER
    if (state === 'waitnumber') {
      if (!speech) return say('I did not catch that. Could you repeat your phone number?', 'waitnumber', name);
      var callerName = name || 'there';
      // Log to Twilio — this gets picked up by the dashboard
      console.log('LEAD_CAPTURED: ' + JSON.stringify({
        name: callerName,
        phone: speech,
        time: new Date().toISOString(),
        source: 'aria_voice'
      }));
      return end(
        'Perfect. I have your name as ' + callerName + ' and your number as ' + speech + '. A CP Restoration specialist will follow up with you within 24 hours, Monday through Friday. Thank you for calling and have a wonderful day.'
      );
    }

    // OFFER RESPONSE
    if (state === 'offer') {
      if (/yes|yeah|sure|ok|okay|yep|please|go ahead/.test(speech)) {
        return say('Can I get your full name?', 'waitname');
      }
      return end('No problem at all. Feel free to call us back anytime Monday through Friday 9 AM to 5 PM Eastern. Thank you for calling CP Restoration Services. Have a great day.');
    }

    // NO SPEECH IN MAIN
    if (!speech) return say('I did not catch that. How can I help you today?', 'main');

    // INSTANT ANSWERS
    var answer = getAnswer(speech);

    if (answer === 'TRANSFER') {
      if (isBusinessHours()) {
        return transfer('Please hold while I connect you with one of our client services specialists.');
      } else {
        return say('Our specialists are available Monday through Friday 9 AM to 5 PM Eastern. Let me take your information so someone can call you back on the next business day. May I get your full name?', 'waitname');
      }
    }

    if (answer === 'YES') return say('Can I get your full name?', 'waitname');

    if (answer) {
      return say(answer + ' Would you like to leave your name and number for a follow-up with one of our specialists?', 'offer');
    }

    // DEFAULT — always collect info
    return say(
      'Thank you for that. Our team would love to help you personally. Can I get your name and best phone number so a specialist can follow up with you today?',
      'waitname'
    );

  } catch(err) {
    console.error('Aria error:', err.message);
    twiml.say({ voice:'Polly.Joanna' }, 'Thank you for calling CP Restoration Services. Please call us back at your convenience Monday through Friday 9 AM to 5 PM Eastern. We look forward to speaking with you.');
    callback(null, twiml);
  }
};
