// CP Restoration AI Receptionist — Render.com
const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const BASE_URL = 'https://cp-restoration-management.onrender.com';
const TRANSFER = '+17542660042';

function esc(t) {
  return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function xml(content) {
  return '<?xml version="1.0" encoding="UTF-8"?><Response>' + content + '</Response>';
}

function gather(text, sid, state, extra) {
  var url = BASE_URL + '/aria?sid=' + encodeURIComponent(sid) + '&state=' + state;
  if (extra) url += '&name=' + encodeURIComponent(extra);
  return xml(
    '<Gather input="speech" action="' + url + '" method="POST" speechTimeout="5" language="en-US">' +
    '<Say voice="Polly.Joanna">' + esc(text) + '</Say>' +
    '</Gather>' +
    '<Say voice="Polly.Joanna">I did not catch that. Please call us back anytime.</Say>'
  );
}

function dial(text) {
  return xml('<Say voice="Polly.Joanna">' + esc(text) + '</Say><Dial>' + TRANSFER + '</Dial>');
}

function hangup(text) {
  return xml('<Say voice="Polly.Joanna">' + esc(text) + '</Say>');
}

function answer(speech) {
  var t = (speech||'').toLowerCase();
  if (/transfer|speak to (a |)(human|person|rep)|real person|talk to (a |)(human|person)|connect me/.test(t)) return 'TRANSFER';
  if (/cancel|refund|attorney|lawsuit|charg.?back/.test(t)) return 'TRANSFER';
  if (/closed|closing|shut down|out of business|email|heard.*clos|told.*clos/.test(t)) return 'CP Restoration is fully open. Any email claiming we closed was sent by a former employee without authorization and is completely false. Your file is active and your service continues normally.';
  if (/\bexpress\b/.test(t)) return 'The Express package is $3,999 covering all three bureaus in 60 business days with a money-back guarantee.';
  if (/\bstandard\b/.test(t)) return 'The Standard package is $2,499 covering all three bureaus in 120 business days. Our most popular option.';
  if (/financ|payment plan|monthly|down payment|afford/.test(t)) return 'Our financing is $750 down and $292 a month for 6 months covering all three bureaus.';
  if (/price|cost|how much|package|pricing|rate|fee/.test(t)) return 'Our Standard package is $2,499 for all three bureaus in 120 business days. Express is $3,999 in 60 days. We also offer financing with $750 down and $292 a month.';
  if (/how long|how fast|timeline|how soon|when/.test(t)) return 'Most clients see results within 30 to 45 days. We follow up every 10 business days until the job is done.';
  if (/what do you do|how does it work|process|how it works/.test(t)) return 'We make live calls to all three credit bureaus, file FTC reports, and send certified dispute letters. We follow up every 10 business days with a money-back guarantee.';
  if (/collect/.test(t)) return 'Yes, collections are one of the most common things we remove through live bureau calls and certified letters.';
  if (/guarantee|money back/.test(t)) return 'Yes, we offer a money-back guarantee. If we do not deliver results you get your money back. We have been in business since 2014.';
  if (/score|credit score/.test(t)) return 'Most clients see score increases of 50 to 150 points when negative items are removed.';
  if (/bankruptcy|bankrupt/.test(t)) return 'Yes, we work with clients who have had bankruptcies. Any errors in how it is reported can be disputed.';
  if (/inquiry|inquiries|hard pull/.test(t)) return 'Our Inquiries Only package is $45 per inquiry per bureau.';
  if (/my (file|case|account|dispute|status)|existing|already a client/.test(t)) return 'Your file is active and your disputes are ongoing. Our team follows up within 24 hours.';
  if (/yes|yeah|sure|ok|okay|yep|please|go ahead/.test(t)) return 'YES';
  return null;
}

function parseForm(body) {
  var p = new URLSearchParams(body);
  return function(k) { return p.get(k) || ''; };
}

function parseQS(url) {
  var idx = url.indexOf('?');
  if (idx === -1) return {};
  var p = new URLSearchParams(url.slice(idx+1));
  var obj = {};
  p.forEach(function(v,k){ obj[k]=v; });
  return obj;
}

var server = http.createServer(function(req, res) {
  var body = '';
  req.on('data', function(c){ body += c; });
  req.on('end', function() {

    if (req.url === '/' || req.url === '/health') {
      res.writeHead(200, {'Content-Type':'text/plain'});
      res.end('CP Restoration AI Receptionist Online');
      return;
    }

    if (req.url.startsWith('/aria')) {
      var get = parseForm(body);
      var qp  = parseQS(req.url);
      var sid    = get('CallSid') || qp['sid'] || ('call_' + Date.now());
      var speech = (get('SpeechResult') || '').trim();
      var state  = qp['state'] || 'new';
      var name   = decodeURIComponent(qp['name'] || '');

      res.writeHead(200, {'Content-Type':'text/xml'});

      try {
        if (state === 'new') {
          res.end(gather('Thank you for calling CP Restoration Services. My name is Aria. How can I help you today?', sid, 'main'));
          return;
        }

        if (state === 'waitname') {
          if (!speech) { res.end(gather('I did not catch that. Can you say your name?', sid, 'waitname')); return; }
          res.end(gather('Thank you ' + speech + '. And what is the best phone number to reach you?', sid, 'waitnumber', speech));
          return;
        }

        if (state === 'waitnumber') {
          if (!speech) { res.end(gather('I did not catch that. Can you repeat your number?', sid, 'waitnumber', name)); return; }
          res.end(hangup('Perfect. I have your name as ' + (name||'there') + ' and your number as ' + speech + '. Our team will follow up within 24 hours. Thank you for calling CP Restoration Services. Have a great day.'));
          return;
        }

        if (state === 'waitname_offer') {
          if (/yes|yeah|sure|ok|okay|yep|please|go ahead/.test(speech.toLowerCase())) {
            res.end(gather('Can I get your full name?', sid, 'waitname'));
          } else {
            res.end(hangup('No problem. Thank you for calling CP Restoration Services. Have a great day.'));
          }
          return;
        }

        if (!speech) {
          res.end(gather('I did not catch that. How can I help you today?', sid, 'main'));
          return;
        }

        var a = answer(speech);
        if (a === 'TRANSFER') { res.end(dial('Please hold while I connect you with one of our client services representatives.')); return; }
        if (a === 'YES')      { res.end(gather('Can I get your full name?', sid, 'waitname')); return; }
        if (a)                { res.end(gather(a + ' Would you like to leave your name and number for a follow-up?', sid, 'waitname_offer')); return; }

        res.end(gather('Thank you for calling. Can I get your name and best number so our team can follow up with you within 24 hours?', sid, 'waitname'));

      } catch(err) {
        console.error('Error:', err.message);
        res.end(dial('Thank you for calling CP Restoration Services. Please hold while I connect you with our team.'));
      }
      return;
    }

    res.writeHead(404); res.end('Not found');
  });
});

server.listen(PORT, function() {
  console.log('CP Restoration AI Receptionist running on port ' + PORT);
});
