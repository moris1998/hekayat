/* ============================================================
   save  —  writes an editor's changes into content/*.json
   ------------------------------------------------------------
   POST { session, changes: { "wisdom.json": { "current.ar": "..." } } }

   The GitHub token lives only here, in Netlify's environment. It is
   never sent to the browser, so a visitor cannot get hold of it even
   if they read every line of the site's JavaScript.

   Environment variables:
     GITHUB_TOKEN   fine-grained PAT, this repo only,
                    Contents + Pull requests = read and write
     GITHUB_REPO    moris1998/hekayat
     EDIT_SECRET    same value as the auth function uses
   ============================================================ */
const { verify } = require('./auth.js');

const API = 'https://api.github.com';
const BRANCH = 'main';

/* only these files may ever be written, so a tampered request cannot
   reach build.js or anything else in the repo */
const ALLOWED = ['wisdom.json', 'rules.json', 'daily.json', 'site.json', 'gallery.json'];

function setDeep(obj, dotted, value) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur == null || typeof cur !== 'object') throw new Error('bad path: ' + dotted);
    cur = cur[parts[i]];
  }
  if (cur == null || typeof cur !== 'object') throw new Error('bad path: ' + dotted);
  cur[parts[parts.length - 1]] = value;
}

async function gh(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'hekayat-site-editor',
      ...(opts.headers || {})
    }
  });
  if (!res.ok) throw new Error(path + ' -> ' + res.status + ' ' + (await res.text()).slice(0, 200));
  return res.json();
}

exports.handler = async (event) => {
  const H = { 'Content-Type': 'application/json' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: '{"error":"method"}' };

  const { GITHUB_TOKEN, GITHUB_REPO, EDIT_SECRET } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_REPO || !EDIT_SECRET) {
    return { statusCode: 500, headers: H,
             body: '{"error":"GITHUB_TOKEN, GITHUB_REPO or EDIT_SECRET missing in Netlify"}' };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers: H, body: '{"error":"bad request"}' }; }

  const who = verify(body.session, EDIT_SECRET);
  if (!who) return { statusCode: 401, headers: H, body: '{"error":"not logged in"}' };

  const changes = body.changes || {};
  const files = Object.keys(changes);
  if (!files.length) return { statusCode: 400, headers: H, body: '{"error":"no changes"}' };
  /* Validate everything before touching the network, so a bad request
     never costs a GitHub round trip and the error stays clear. */
  for (const f of files) {
    if (!ALLOWED.includes(f)) {
      return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'file not editable: ' + f }) };
    }
    for (const [key, value] of Object.entries(changes[f])) {
      if (typeof value !== 'string') {
        return { statusCode: 400, headers: H,
                 body: JSON.stringify({ error: 'only text can be edited: ' + f + ':' + key }) };
      }
      if (!/^[A-Za-z0-9_.]+$/.test(key)) {
        return { statusCode: 400, headers: H,
                 body: JSON.stringify({ error: 'bad key: ' + key }) };
      }
      /* __proto__ and friends would let a crafted request poison objects
         rather than edit content */
      if (key.split('.').some(p => p === '__proto__' || p === 'constructor' || p === 'prototype')) {
        return { statusCode: 400, headers: H,
                 body: JSON.stringify({ error: 'bad key: ' + key }) };
      }
    }
  }

  const written = [];
  try {
    /* one file at a time: each write needs the sha from its own read */
    for (const file of files) {
      const path = `/repos/${GITHUB_REPO}/contents/content/${file}`;
      const meta = await gh(`${path}?ref=${BRANCH}`);
      const json = JSON.parse(Buffer.from(meta.content, 'base64').toString('utf8'));

      for (const [key, value] of Object.entries(changes[file])) setDeep(json, key, value);

      await gh(path, {
        method: 'PUT',
        body: JSON.stringify({
          branch: BRANCH,
          message: `تعديل ${file} من الموقع - ${who.name}`,
          content: Buffer.from(JSON.stringify(json, null, 2) + '\n', 'utf8').toString('base64'),
          sha: meta.sha
        })
      });
      written.push(file);
    }
  } catch (err) {
    return { statusCode: 500, headers: H,
             body: JSON.stringify({ error: String(err.message || err), written }) };
  }

  return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, written }) };
};
