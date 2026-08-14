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

  /* ------------------------------------------------------------ session
     Her login lives here, on the site. It is a signed token from our own
     auth function, kept in localStorage so she stays logged in for months
     rather than every five minutes. It carries no password and cannot be
     edited: the signature is checked on the server for every save. */
  var KEY = 'hk-session';
  function session() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function signIn(tok, name) {
    try { localStorage.setItem(KEY, tok); localStorage.setItem('hk-who', name || ''); } catch (e) {}
  }
  function signOut() {
    try { localStorage.removeItem(KEY); localStorage.removeItem('hk-who'); } catch (e) {}
    location.reload();
  }
  function who() { try { return localStorage.getItem('hk-who') || ''; } catch (e) { return ''; } }

  var fields = [].slice.call(document.querySelectorAll('[data-edit]'));
  if (!fields.length) return;                 // nothing editable on this page
  if (!session() && location.search.indexOf('login') === -1) return;  // a visitor

  var L = function () { return document.documentElement.lang === 'he' ? 'he' : 'ar'; };
  var T = {
    ar: { edit:'تعديل', save:'حفظ التغييرات', cancel:'إلغاء', done:'تم',
          back:'رجوع', saving:'جاري الحفظ...', ok:'تم الحفظ! الموقع بيتحدّث خلال دقيقة',
          fail:'ما زبط الحفظ. جرّبي كمان مرّة.', login:'سجّلي الدخول أولًا',
          none:'ما في تغييرات', which:'هذا النص يظهر في الموقع',
          signin:'تسجيل الدخول', signout:'خروج', email:'الإيميل', pass:'كلمة السر',
          enter:'دخول', wrong:'الإيميل أو كلمة السر غير صحيحة', hi:'أهلًا' },
    he: { edit:'עריכה', save:'שמירת שינויים', cancel:'ביטול', done:'סיום',
          back:'חזרה', saving:'שומר...', ok:'נשמר! האתר יתעדכן תוך דקה',
          fail:'השמירה נכשלה. נסי שוב.', login:'התחברי קודם',
          none:'אין שינויים', which:'הטקסט הזה מופיע באתר',
          signin:'התחברות', signout:'יציאה', email:'אימייל', pass:'סיסמה',
          enter:'כניסה', wrong:'אימייל או סיסמה שגויים', hi:'שלום' }
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
      fab.innerHTML = '<button class="hk-go">' + ICON_PEN + '<span>' + t('edit') + '</span></button>' +
        (session() ? '<button class="hk-cancel hk-out">' + t('signout') + '</button>' : '');
      fab.querySelector('.hk-go').onclick = start;
      var out = fab.querySelector('.hk-out'); if (out) out.onclick = signOut;
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
    if (!session()) { showLogin(); return; }
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

  /* ------------------------------------------------------------ login
     Shown on the site itself. No redirect to any panel. */
  function showLogin() {
    sheet.querySelector('.hk-sheet__label').textContent = t('signin');
    sheet.querySelector('.hk-sheet__which').textContent = '';
    var panel = sheet.querySelector('.hk-sheet__panel');
    var form = document.createElement('div');
    form.className = 'hk-login';
    form.innerHTML =
      '<label>' + t('email') + '</label>' +
      '<input type="email" autocomplete="username" inputmode="email" dir="ltr">' +
      '<label>' + t('pass') + '</label>' +
      '<input type="password" autocomplete="current-password" dir="ltr">' +
      '<p class="hk-err"></p>';
    ta.style.display = 'none';
    var old = panel.querySelector('.hk-login'); if (old) old.remove();
    panel.insertBefore(form, panel.querySelector('.hk-sheet__row'));
    sheet.querySelector('.hk-ok').textContent = t('enter');
    sheet.querySelector('.hk-no').textContent = t('back');
    sheet.classList.add('open');
    var inputs = form.querySelectorAll('input');
    setTimeout(function () { inputs[0].focus(); }, 250);

    function attempt() {
      var err = form.querySelector('.hk-err');
      err.textContent = '';
      sheet.querySelector('.hk-ok').disabled = true;
      fetch('/.netlify/functions/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inputs[0].value, password: inputs[1].value })
      }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          sheet.querySelector('.hk-ok').disabled = false;
          if (!res.ok) { err.textContent = t('wrong'); return; }
          signIn(res.d.session, res.d.name);
          close(); form.remove(); ta.style.display = '';
          toast(t('hi') + ' ' + res.d.name);
          start();
        })
        .catch(function () {
          sheet.querySelector('.hk-ok').disabled = false;
          err.textContent = t('wrong');
        });
    }
    inputs[1].onkeydown = function (e) { if (e.key === 'Enter') attempt(); };
    sheet.querySelector('.hk-ok').onclick = attempt;
    sheet.querySelector('.hk-no').onclick = function () {
      close(); form.remove(); ta.style.display = '';
    };
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
  /* The GitHub token is not in the browser at all. We hand our changes to
     our own function, which checks the session and does the commit. */
  function push(changes) {
    return fetch('/.netlify/functions/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: session(), changes: changes })
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.error || ('save ' + r.status));
        return data;
      });
    });
  }

  function save() {
    if (!count()) { toast(t('none')); return; }
    fab.innerHTML = '<button class="hk-save">' + t('saving') + '</button>';
    push(changes)
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
