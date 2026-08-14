/* حضانة حكايات - site behaviour
   Everything degrades gracefully: without JS the pages still read,
   both languages are already in the HTML, and all links work. */
(function () {
  'use strict';
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------- language */
  const titles = (() => {
    try { return JSON.parse(document.documentElement.dataset.titles || '{}'); }
    catch (e) { return {}; }
  })();

  function setLang(l) {
    document.documentElement.lang = l;
    document.documentElement.dir = 'rtl';           // both languages are RTL
    if (titles[l]) document.title = titles[l];
    try { localStorage.setItem('hk-lang', l); } catch (e) {}
    $$('[data-setlang]').forEach(b => b.classList.toggle('on', b.dataset.setlang === l));
    /* <option> cannot hold per-language spans, so swap its text directly */
    $$('option[data-ar]').forEach(o => { o.textContent = o.dataset[l] || o.dataset.ar; });
    renderAge();
    renderGallery();
    paintFinder(false);   // the finder prints months in words, so it must re-render
  }
  $$('[data-setlang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.setlang)));

  /* ----------------------------------------------------------- menus */
  $$('.nav__item').forEach(item => {
    const btn = $('.nav__link[aria-expanded]', item);
    if (!btn) return;
    const close = () => { item.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = item.classList.contains('open');
      $$('.nav__item.open').forEach(o => {
        o.classList.remove('open');
        const b = $('.nav__link[aria-expanded]', o); if (b) b.setAttribute('aria-expanded', 'false');
      });
      if (!open) { item.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
    });
    item.addEventListener('mouseleave', close);
  });
  document.addEventListener('click', () => $$('.nav__item.open').forEach(o => {
    o.classList.remove('open');
    const b = $('.nav__link[aria-expanded]', o); if (b) b.setAttribute('aria-expanded', 'false');
  }));

  /* ---------------------------------------------------------- drawer */
  const drawer = $('#drawer');
  const openDrawer  = () => { drawer.classList.add('open');  document.body.style.overflow = 'hidden'; };
  const closeDrawer = () => { drawer.classList.remove('open'); document.body.style.overflow = ''; };
  const ob = $('[data-drawer-open]'), cb = $('[data-drawer-close]');
  if (ob) ob.addEventListener('click', openDrawer);
  if (cb) cb.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (drawer && drawer.classList.contains('open')) closeDrawer();
    closeLightbox();
  });

  /* ------------------------------------------------------ scroll reveal */
  const rvs = $$('.rv');
  if (reduced || !('IntersectionObserver' in window)) {
    rvs.forEach(el => el.classList.add('in'));
  } else {
    /* The large top rootMargin makes anything at or above the viewport count as
       intersecting. Without it, content skipped in one jump (anchor link, restored
       scroll position, fast wheel) would stay at opacity 0 forever. */
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en, i) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        io.unobserve(el);
        setTimeout(() => el.classList.add('in'), Math.min(i, 6) * 70);
      });
    }, { threshold: 0, rootMargin: '3000px 0px -8% 0px' });
    rvs.forEach(el => io.observe(el));
    /* Last resort: a tab that loads hidden or backgrounded suspends observer
       callbacks. Never leave a visitor staring at blank sections. */
    setTimeout(() => rvs.forEach(el => el.classList.add('in')), 4000);
  }

  /* --------------------------------------------------------- counters */
  const counters = $$('[data-count]');
  if (counters.length) {
    /* The final value is already in the HTML, so a visitor never sees a wrong
       number if this never runs. Animation only counts up to what is there. */
    const run = el => {
      const target = parseFloat(el.dataset.count);
      /* Do not start in a hidden tab: rAF is throttled there and the count
         would freeze on a wrong number. The correct value is already shown. */
      if (reduced || document.hidden) return;
      const dur = 1400, t0 = performance.now();
      const step = now => {
        if (document.hidden) { el.textContent = target; return; }
        const p = Math.min((now - t0) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target;
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      const cio = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { run(e.target); cio.unobserve(e.target); }
      }), { threshold: 0.5 });
      counters.forEach(c => cio.observe(c));
    } else counters.forEach(run);
  }

  /* -------------------------------------------------- age group panel */
  const ageData = (() => {
    const s = $('#age-data');
    try { return s ? JSON.parse(s.textContent) : null; } catch (e) { return null; }
  })();
  let ageIdx = 0;
  function renderAge() {
    const panel = $('#agepanel');
    if (!panel || !ageData) return;
    const a = ageData[ageIdx];
    const l = document.documentElement.lang === 'he' ? 'he' : 'ar';
    panel.style.setProperty('--c', 'var(--' + a.c + ')');
    panel.style.setProperty('--cd', 'var(--' + a.c + '-d)');
    panel.innerHTML =
      '<div class="agepanel__in fadein">' +
        '<div class="agepanel__ico">' + a.ico + '</div>' +
        '<div><h3>' + a[l].n + '</h3>' +
        '<p style="color:var(--ink-2);font-weight:600;margin-bottom:.6rem">' + a[l].age + '</p>' +
        '<p>' + a[l].d + '</p></div>' +
      '</div>';
  }
  function selectAge(i, burstFrom) {
    ageIdx = i;
    $$('.age').forEach(b => b.setAttribute('aria-selected', String(parseInt(b.dataset.age, 10) === i)));
    renderAge();
    if (burstFrom) confetti(burstFrom, ageData[i].c);
  }
  $$('.age').forEach(btn => btn.addEventListener('click', () => {
    const i = parseInt(btn.dataset.age, 10);
    selectAge(i, btn);
    const f = $('#finder');
    if (f) { f.value = ageData[i].lo + 1; paintFinder(false); }
  }));

  /* --------------------------------------------------------- confetti
     A short burst of brand-coloured dots when a group is chosen. Purely
     decorative, skipped entirely under reduced motion. */
  const PALETTE = ['pink', 'blue', 'yellow', 'green', 'orange', 'cyan'];
  function confetti(fromEl, colour) {
    if (reduced) return;
    const r = fromEl.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < 16; i++) {
      const d = document.createElement('span');
      const ang = (Math.PI * 2 * i) / 16 + (i % 3) * 0.2;
      const dist = 70 + (i % 5) * 26;
      d.className = 'pop';
      d.style.left = cx + 'px';
      d.style.top = cy + 'px';
      d.style.background = 'var(--' + (i % 4 === 0 ? colour : PALETTE[i % PALETTE.length]) + ')';
      d.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      d.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      d.style.animation = 'popout ' + (620 + (i % 4) * 130) + 'ms cubic-bezier(.16,1,.3,1) forwards';
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 1100);
    }
  }

  /* ------------------------------------------------------- age finder
     Parents drag to their child's age and the matching group lights up. */
  const finder = $('#finder');
  function monthsLabel(m, l) {
    const y = Math.floor(m / 12), mo = m % 12;
    if (l === 'he') {
      const yt = y === 0 ? '' : (y === 1 ? 'שנה' : 'שנתיים');
      const mt = mo === 0 ? '' : (mo === 1 ? 'חודש' : mo + ' חודשים');
      return [yt, mt].filter(Boolean).join(' ו-');
    }
    const yt = y === 0 ? '' : (y === 1 ? 'سنة' : 'سنتان');
    const mt = mo === 0 ? '' : (mo === 1 ? 'شهر' : mo === 2 ? 'شهران' : mo <= 10 ? mo + ' شهور' : mo + ' شهرًا');
    return [yt, mt].filter(Boolean).join(' و');
  }
  function paintFinder(burst) {
    if (!finder || !ageData) return;
    const m = parseInt(finder.value, 10);
    const l = document.documentElement.lang === 'he' ? 'he' : 'ar';
    let i = ageData.findIndex(a => m >= a.lo && m < a.hi);
    if (i < 0) i = m < ageData[0].lo ? 0 : ageData.length - 1;
    const a = ageData[i];
    const box = $('#finder-box');
    box.style.setProperty('--fc', 'var(--' + a.c + ')');
    box.style.borderColor = 'var(--' + a.c + ')';
    finder.style.setProperty('--fill',
      (((m - finder.min) / (finder.max - finder.min)) * 100).toFixed(1) + '%');
    $('#finder-val').textContent = monthsLabel(m, l);
    $('#finder-res').innerHTML = l === 'he'
      ? 'הילד שלכם מצטרף לקבוצת <b>' + a.he.n + '</b>'
      : 'طفلكم ينضمّ إلى مجموعة <b>' + a.ar.n + '</b>';
    if (i !== ageIdx) selectAge(i, burst ? finder : null);
  }
  if (finder) {
    finder.addEventListener('input', () => paintFinder(false));
    finder.addEventListener('change', () => paintFinder(true));
  }

  /* ------------------------------------------------- hero pointer drift
     Desktop only, transform-driven, no scroll or state involved. */
  const heroArt = $('.hero__art');
  if (heroArt && !reduced && window.matchMedia('(pointer:fine)').matches) {
    let ticking = false;
    $('.hero').addEventListener('pointermove', e => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const r = heroArt.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        heroArt.style.setProperty('--px', (dx * 22).toFixed(1) + 'px');
        heroArt.style.setProperty('--py', (dy * 22).toFixed(1) + 'px');
        ticking = false;
      });
    });
  }

  /* -------------------------------------------------------- accordion */
  $$('.acc__btn').forEach(btn => btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    const panel = btn.nextElementSibling;
    if (panel) panel.dataset.open = String(!open);
  }));

  /* ---------------------------------------------------------- gallery */
  let galCat = 'all';
  function renderGallery() {
    const grid = $('#gal'), empty = $('#galempty');
    if (!grid) return;
    const photos = (window.HEKAYAT_PHOTOS || []).filter(p => galCat === 'all' || p.cat === galCat);
    const l = document.documentElement.lang === 'he' ? 'he' : 'ar';
    if (!photos.length) {
      grid.innerHTML = '';
      if (empty) empty.style.display = '';
      return;
    }
    if (empty) empty.style.display = 'none';
    grid.innerHTML = photos.map((p, i) =>
      '<figure data-i="' + i + '">' +
        '<img src="' + p.src + '" alt="' + (p[l] || '') + '" loading="lazy" width="600" height="450">' +
        (p[l] ? '<figcaption>' + p[l] + '</figcaption>' : '') +
      '</figure>').join('');
    $$('#gal figure').forEach(f => f.addEventListener('click', () => {
      const p = photos[parseInt(f.dataset.i, 10)];
      openLightbox(p.src, p[l] || '');
    }));
  }
  $$('#galfilter .chip').forEach(c => c.addEventListener('click', () => {
    $$('#galfilter .chip').forEach(x => x.classList.remove('on'));
    c.classList.add('on');
    galCat = c.dataset.cat;
    renderGallery();
  }));

  /* -------------------------------------------------------- lightbox */
  const lb = $('#lightbox'), lbImg = $('#lb-img'), lbCap = $('#lb-cap');
  function openLightbox(src, cap) {
    if (!lb) return;
    lbImg.src = src; lbImg.alt = cap || ''; lbCap.textContent = cap || '';
    lb.classList.add('open'); document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    if (!lb || !lb.classList.contains('open')) return;
    lb.classList.remove('open'); lbImg.src = ''; document.body.style.overflow = '';
  }
  if (lb) {
    lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
    const x = $('[data-lb-close]'); if (x) x.addEventListener('click', closeLightbox);
  }

  /* ------------------------------------------------------------- form
     No server on a static host, so the form composes a WhatsApp message
     to the nursery instead of silently going nowhere. */
  const form = $('#visitform');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    const he = document.documentElement.lang === 'he';
    const name  = form.name.value.trim();
    const phone = form.phone.value.trim();
    const age   = form.age.value;
    const msg   = form.msg.value.trim();
    let bad = false;
    const mark = (id, ok) => {
      const f = $('#' + id).closest('.field');
      f.classList.toggle('bad', !ok); if (!ok) bad = true;
    };
    mark('f-name', name.length > 1);
    mark('f-phone', /^[0-9+\-\s()]{9,}$/.test(phone));
    if (bad) return;

    const text = he
      ? 'שלום, שמי ' + name + '.\nטלפון: ' + phone +
        (age ? '\nקבוצה: ' + age : '') + (msg ? '\n' + msg : '') +
        '\nאשמח לתאם ביקור במעון חכאיאת.'
      : 'مرحبًا، أنا ' + name + '.\nرقم الهاتف: ' + phone +
        (age ? '\nالمجموعة: ' + age : '') + (msg ? '\n' + msg : '') +
        '\nأودّ تحديد موعد لزيارة حضانة حكايات.';

    const note = $('#formnote');
    if (note) note.classList.add('show');
    window.open('https://wa.me/972526009826?text=' + encodeURIComponent(text), '_blank', 'noopener');
  });

  /* ---------------------------------------------------------- startup */
  const y = $('#yr'); if (y) y.textContent = new Date().getFullYear();
  let saved = 'ar';
  try { saved = localStorage.getItem('hk-lang') || 'ar'; } catch (e) {}
  setLang(saved);
})();
