/* ============================================================
   auth  —  logs an editor in, from the site itself
   ------------------------------------------------------------
   POST { email, password }  ->  { session, name }

   Who is allowed is set once in Netlify's environment variables,
   never in this repo:

     EDIT_USERS   sahera@example.com:<salt>:<hash>:ساهرة,
                  moris@example.com:<salt>:<hash>:Moris
     EDIT_SECRET  any long random string

   Generate the salt/hash pair with:  node tools/make-user.js
   Passwords are never stored, only their scrypt hash.
   ============================================================ */
const crypto = require('crypto');

const DAYS = 90;                       // how long a login lasts

function hash(password, salt) {
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

/* session = base64(payload).hmac, so it cannot be edited by the browser */
function sign(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return body + '.' + mac;
}

function verify(sessionToken, secret) {
  if (typeof sessionToken !== 'string' || !sessionToken.includes('.')) return null;
  const [body, mac] = sessionToken.split('.');
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(mac || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch (e) { return null; }
}

function users() {
  return (process.env.EDIT_USERS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(entry => {
      const [email, salt, digest, name] = entry.split(':');
      return { email: (email || '').toLowerCase(), salt, digest, name: name || email };
    });
}

exports.handler = async (event) => {
  const JSON_HEADERS = { 'Content-Type': 'application/json' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: JSON_HEADERS, body: '{"error":"method"}' };
  }
  const secret = process.env.EDIT_SECRET;
  if (!secret || !process.env.EDIT_USERS) {
    return { statusCode: 500, headers: JSON_HEADERS,
             body: '{"error":"EDIT_SECRET or EDIT_USERS is not set in Netlify"}' };
  }

  let email, password;
  try {
    ({ email, password } = JSON.parse(event.body || '{}'));
  } catch (e) {
    return { statusCode: 400, headers: JSON_HEADERS, body: '{"error":"bad request"}' };
  }

  const who = users().find(u => u.email === String(email || '').toLowerCase().trim());

  /* Always do the work and always answer the same way, so this cannot be
     used to discover which email addresses are registered. */
  const ok = who && who.salt && who.digest &&
    crypto.timingSafeEqual(
      Buffer.from(hash(String(password || ''), who.salt)),
      Buffer.from(who.digest)
    );

  if (!ok) {
    await new Promise(r => setTimeout(r, 700));   // slow down guessing
    return { statusCode: 401, headers: JSON_HEADERS, body: '{"error":"bad credentials"}' };
  }

  const session = sign({
    email: who.email,
    name: who.name,
    exp: Date.now() + DAYS * 24 * 60 * 60 * 1000
  }, secret);

  return { statusCode: 200, headers: JSON_HEADERS,
           body: JSON.stringify({ session, name: who.name, days: DAYS }) };
};

exports.verify = verify;
exports.sign = sign;
exports.hash = hash;
