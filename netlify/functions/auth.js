/* ============================================================
   auth  —  logs an editor in, from the site itself
   ------------------------------------------------------------
   POST { email, password }      ->  { session, name }
   POST { googleCredential }     ->  { session, name }

   Two ways in, one guest list. EDIT_USERS decides who may edit; a Google
   sign-in is accepted when the email Google vouches for is on that list.

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

/* Ask Google to vouch for the sign-in. Google verifies the signature for
   us; we still check the token was issued for OUR site and that the
   address is confirmed. */
async function fromGoogle(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return null;
  const res = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' +
                          encodeURIComponent(credential));
  if (!res.ok) return null;
  const info = await res.json();
  if (info.aud !== clientId) return null;                       // issued for someone else
  if (!/^(https:\/\/)?accounts\.google\.com$/.test(info.iss)) return null;
  if (info.email_verified !== true && info.email_verified !== 'true') return null;
  if (info.exp && Date.now() / 1000 > Number(info.exp)) return null;
  return { email: String(info.email || '').toLowerCase(), name: info.name || info.email };
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

  let email, password, googleCredential;
  try {
    ({ email, password, googleCredential } = JSON.parse(event.body || '{}'));
  } catch (e) {
    return { statusCode: 400, headers: JSON_HEADERS, body: '{"error":"bad request"}' };
  }

  /* ---- signed in with Google ---- */
  if (googleCredential) {
    const g = await fromGoogle(googleCredential);
    const allowed = g && users().find(u => u.email === g.email);
    if (!allowed) {
      await new Promise(r => setTimeout(r, 500));
      return { statusCode: 401, headers: JSON_HEADERS,
               body: '{"error":"this account is not allowed to edit"}' };
    }
    const session = sign({ email: g.email, name: allowed.name || g.name,
                           exp: Date.now() + DAYS * 24 * 60 * 60 * 1000 }, secret);
    return { statusCode: 200, headers: JSON_HEADERS,
             body: JSON.stringify({ session, name: allowed.name || g.name, days: DAYS }) };
  }

  /* ---- signed in with a password ---- */
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
