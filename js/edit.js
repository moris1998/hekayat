/* ============================================================
   حضانة حكايات — tap-to-edit
   ------------------------------------------------------------
   Sahera opens the real site on her phone, presses «تعديل»,
   taps any sentence, changes it, presses «حفظ».

   How it hangs together:
     · build.js stamps data-edit="<file>:<key.path>" on every
       piece of text that comes from content/*.json
     · she logs in once at /admin (DecapBridge), which leaves a
       token in localStorage for this origin
     · saving reads each content file through the DecapBridge
       gateway, applies her edits, and writes it back
     · Netlify sees the commit and rebuilds, ~1 minute

   For a normal visitor this file does nothing at all: with no
   token it exits before touching the page.
   ============================================================ */
(function () {
  'use strict';

  var GATEWAY = 'https://gateway.decapbridge.com';
  var BRANCH  = 'main';

  /* ---------------------------------------------------------- token
     Decap/DecapBridge have used several storage keys across versions, and
     PKCE login may differ again. Rather than guess a name, look through
     everything in local and session storage for a credential. */
  function dig(v) {
    if (!v) return null;
    if (typeof v === 'string') {
      // a bare JWT, three dot-separated chunks
      if (/^[\w-]+\.[\w-]+\.[\w-]+$/.test(v)) return v;
      try { return dig(JSON.parse(v)); } catch (e) { return null; }
    }
    if (typeof v === 'object') {
      var direct = v.token || v.access_token || v.jwt || v.id_token;
      if (typeof direct === 'string' && direct.length > 20) return direct;
      for (var k in v) { var found = dig(v[k]); if (found) return found; }
    }
    return null;
  }

  function token() {
    var stores = [];
    try { stores.push(localStorage); } catch (e) {}
    try { stores.push(sessionStorage); } catch (e) {}
    for (var s = 0; s < stores.length; s++) {
      var store = stores[s];
      for (var i = 0; i < store.length; i++) {
        var key = store.key(i);
        if (!/decap|netlify|cms|bridge|auth|user|token/i.test(key)) continue;
        var found = dig(store.getItem(key));
        if (found) return found;
      }
    }
    return null;
  }

  /* Visit any page with ?edit=debug to see what the login actually left
     behind. Prints keys only, never the credential itself. */
  if (location.search.indexOf('edit=debug') > -1) {
    var report = ['--- hekayat edit debug ---'];
    ['localStorage', 'sessionStorage'].forEach(function (name) {
      try {
        var store = window[name];
        report.push(name + ': ' + store.length + ' keys');
        for (var i = 0; i < store.length; i++) {
          var k = store.key(i);
          report.push('   ' + k + '  ->  ' + (dig(store.getItem(k)) ? 'HAS a token' : 'no token'));
        }
      } catch (e) { report.push(name + ': blocked'); }
    });
    report.push('token found: ' + (token() ? 'YES' : 'NO'));
    report.push('editable fields on this page: ' + document.querySelectorAll('[data-edit]').length);
    alert(report.join('\n'));
    console.log(report.join('\n'));
  }

  var fields = [].slice.call(document.querySelectorAll('[data-edit]'));
  if (!fields.length) return;                 // nothing editable on this page
  if (!token() && location.search.indexOf('edit') === -1) return;  // a visitor

  var L = function () { return document.documentElement.lang === 'he' ? 'he' : 'ar'; };
  var T = {
    ar: { edit:'تعديل', save:'حفظ التغييرات', cancel:'إلغاء', done:'تم',
          back:'رجوع', saving:'جاري الحفظ...', ok:'تم الحفظ! الموقع بيتحدّث خلال دقيقة',
          fail:'ما زبط الحفظ. جرّبي كمان مرّة.', login:'سجّلي الدخول أولًا',
          none:'ما في تغييرات', which:'هذا النص يظهر في الموقع' },
    he: { edit:'עריכה', save:'שמירת שינויים', cancel:'ביטול', done:'סיום',
          back:'חזרה', saving:'שומר...', ok:'נשמר! האתר יתעדכן תוך דקה',
          fail:'השמירה נכשלה. נסי שוב.', login:'התחברי קודם',
          none:'אין שינויים', which:'הטקסט הזה מופיע באתר' }
  };
  var t = function (k) { return T[L()][k]; };

  var changes = {};                            // { 'file.json': { 'a.b': 'new text' } }
  var editing = false;

  /* ------------------------------------------------------------ UI */
  var ICON_PEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>';
  var ICON_TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>';

  var fab = document.createElement('div');
  fab.className = 'hk-fab';
  document.body.appendChild(fab);

  var sheet = document.createElement('div');
  sheet.className = 'hk-sheet';
  sheet.innerHTML =
    '<div class="hk-sheet__panel">' +
      '<div class="hk-sheet__grip"></div>' +
      '<div class="hk-sheet__label"></div>' +
      '<div class="hk-sheet__which"></div>' +
      '<textarea dir="auto"></textarea>' +
      '<div class="hk-sheet__row">' +
        '<button class="hk-ok"></button><button class="hk-no"></button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(sheet);
  var ta = sheet.querySelector('textarea');

  function toast(msg, bad) {
    var el = document.createElement('div');
    el.className = 'hk-toast' + (bad ? ' hk-toast--bad' : '');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 3600);
  }

  function count() {
    var n = 0;
    for (var f in changes) n += Object.keys(changes[f]).length;
    return n;
  }

  function paintFab() {
    if (!editing) {
      fab.innerHTML = '<button class="hk-go">' + ICON_PEN + '<span>' + t('edit') + '</span></button>';
      fab.querySelector('.hk-go').onclick = start;
      return;
    }
    var n = count();
    fab.innerHTML =
      '<button class="hk-save">' + ICON_TICK + '<span>' + t('save') + (n ? ' (' + n + ')' : '') + '</span></button>' +
      '<button class="hk-cancel">' + t('cancel') + '</button>';
    fab.querySelector('.hk-save').onclick = save;
    fab.querySelector('.hk-cancel').onclick = stop;
  }

  function start() {
    if (!token()) { toast(t('login'), true); setTimeout(function(){ location.href = '/admin/'; }, 1200); return; }
    editing = true;
    document.documentElement.classList.add('hk-editing');
    paintFab();
  }

  function stop() {
    editing = false;
    changes = {};
    document.documentElement.classList.remove('hk-editing');
    fields.forEach(function (el) {
      el.classList.remove('hk-changed');
      if (el.dataset.hkOriginal !== undefined) {
        el.textContent = el.dataset.hkOriginal;
        delete el.dataset.hkOriginal;
      }
    });
    paintFab();
  }

  /* --------------------------------------------------- open the sheet */
  function open(el) {
    var ref = el.dataset.edit.split(':');       // ['wisdom.json', 'current.ar']
    var file = ref[0], key = ref[1];
    var human = { 'wisdom.json': 'حكمة الشهر', 'rules.json': 'قوانين حكايات',
                  'daily.json': 'البرنامج اليومي', 'site.json': 'معلومات الحضانة',
                  'gallery.json': 'معرض الصور' }[file] || file;

    sheet.querySelector('.hk-sheet__label').textContent = human;
    sheet.querySelector('.hk-sheet__which').textContent = t('which');
    ta.value = el.textContent.trim();
    sheet.querySelector('.hk-ok').textContent = t('done');
    sheet.querySelector('.hk-no').textContent = t('back');
    sheet.classList.add('open');
    setTimeout(function () { ta.focus(); }, 250);

    sheet.querySelector('.hk-ok').onclick = function () {
      var val = ta.value.trim();
      if (el.dataset.hkOriginal === undefined) el.dataset.hkOriginal = el.textContent;
      el.textContent = val;
      el.classList.add('hk-changed');
      changes[file] = changes[file] || {};
      changes[file][key] = val;
      close();
      paintFab();
    };
    sheet.querySelector('.hk-no').onclick = close;
  }
  function close() { sheet.classList.remove('open'); }
  sheet.addEventListener('click', function (e) { if (e.target === sheet) close(); });

  document.addEventListener('click', function (e) {
    if (!editing) return;
    var el = e.target.closest('[data-edit]');
    if (!el) return;
    e.preventDefault();                          // do not follow links while editing
    e.stopPropagation();
    open(el);
  }, true);

  /* --------------------------------------------------------- saving
     The DecapBridge gateway speaks the GitHub contents API, so this is
     read file -> patch the key -> write file, once per touched file. */
  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ Authorization: 'Bearer ' + token(),
                                   'Content-Type': 'application/json' }, opts.headers || {});
    return fetch(GATEWAY + '/github/contents/' + path + (opts.q || ''), opts)
      .then(function (r) {
        if (!r.ok) throw new Error(path + ' -> ' + r.status);
        return r.json();
      });
  }

  function setDeep(obj, dotted, value) {
    var parts = dotted.split('.'), cur = obj;
    for (var i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
    cur[parts[parts.length - 1]] = value;
  }

  /* base64 that survives Arabic and Hebrew (btoa alone does not) */
  function b64(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  function unb64(str) {
    var bin = atob(str.replace(/\n/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function saveFile(file, edits) {
    var path = 'content/' + file;
    return api(path, { q: '?ref=' + BRANCH }).then(function (meta) {
      var json = JSON.parse(unb64(meta.content));
      for (var key in edits) setDeep(json, key, edits[key]);
      return fetch(GATEWAY + '/github/contents/' + path, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: BRANCH,
          message: 'تعديل ' + file + ' من الموقع',
          content: b64(JSON.stringify(json, null, 2) + '\n'),
          sha: meta.sha
        })
      }).then(function (r) { if (!r.ok) throw new Error(path + ' PUT ' + r.status); });
    });
  }

  function save() {
    if (!count()) { toast(t('none')); return; }
    fab.innerHTML = '<button class="hk-save">' + t('saving') + '</button>';
    var files = Object.keys(changes);
    // one file at a time: each write needs the sha from its own read
    files.reduce(function (chain, f) {
      return chain.then(function () { return saveFile(f, changes[f]); });
    }, Promise.resolve())
      .then(function () {
        changes = {};
        editing = false;
        document.documentElement.classList.remove('hk-editing');
        fields.forEach(function (el) { el.classList.remove('hk-changed'); delete el.dataset.hkOriginal; });
        paintFab();
        toast(t('ok'));
      })
      .catch(function (err) {
        console.error('[hekayat edit]', err);
        paintFab();
        toast(t('fail'), true);
      });
  }

  paintFab();
})();
