#!/usr/bin/env node
/**
 * حضانة حكايات - static site generator
 *
 * Every page is composed from one layout so the nav, footer and metadata
 * live in a single place. Content is authored once as {ar, he} pairs and
 * BOTH languages are written into the HTML; CSS shows one and hides the
 * other, so switching language is instant and both are indexable.
 *
 *   node build.js
 */
const fs = require('fs');
const path = require('path');
const OUT = __dirname;

/* ---------------------------------------------------------------- site
   Everything Sahera can edit lives in content/*.json so the CMS can write
   to it. Nothing below should be hardcoded again. */
const C = f => JSON.parse(fs.readFileSync(path.join(__dirname, 'content', f), 'utf8'));
const CFG     = C('site.json');
const WISDOM  = C('wisdom.json');
const GALLERY = C('gallery.json');

const SITE = {
  name:   { ar: 'حضانة حكايات',  he: 'מעון חכאיאת' },
  tag:    { ar: 'بيتكم الثاني',   he: 'הבית השני שלכם' },
  dir:    { ar: 'ساهرة نصرالله',  he: 'סאהרה נסראללה' },
  city:   { ar: CFG.address_ar,   he: CFG.address_he },
  hours:  { ar: CFG.hours_ar,     he: CFG.hours_he },
  mobile: CFG.mobile,
  phone:  CFG.phone,
  fb:     CFG.facebook,
  url:    'https://hekayatz.netlify.app',
};
const waNumber = CFG.whatsapp;
/* schema.org wants HH:MM, but site.json stores the human form (7:30) */
const pad = t => t.padStart(5, '0');
/* Bump when css/js change, so a phone that cached the old files reloads them. */
const ASSET_V = '5';

/* --------------------------------------------------------------- icons
   Stroke glyphs follow the Tabler Icons geometry (MIT), 24x24 grid,
   1.75 stroke. The four age-group creatures are custom because no icon
   set carries "fledgling / chick / bee / butterfly" as one coherent family. */
const I = {
  home:  '<path d="M5 12H3l9-9 9 9h-2M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>',
  heart: '<path d="M19.5 12.6l-7.5 7.4-7.5-7.4a5 5 0 117.5-6.6 5 5 0 117.5 6.6z"/>',
  users: '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2M16 3.1a4 4 0 010 7.8M21 21v-2a4 4 0 00-3-3.8"/>',
  build: '<path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 9h1M14 9h1M9 13h1M14 13h1M9 17h6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  book:  '<path d="M3 19a2 2 0 012-2h14V4H5a2 2 0 00-2 2v13zM3 19a2 2 0 002 2h14v-4"/>',
  pot:   '<path d="M4 9h16v7a4 4 0 01-4 4H8a4 4 0 01-4-4V9zM4 12H2M20 12h2M8 6c0-1 1-1.5 1-2.5M12 6c0-1 1-1.5 1-2.5M16 6c0-1 1-1.5 1-2.5"/>',
  badge: '<path d="M12 3l2.3 1.6 2.8-.2 1 2.6 2.4 1.5-.8 2.7.8 2.7-2.4 1.5-1 2.6-2.8-.2L12 19.6l-2.3-1.6-2.8.2-1-2.6L3.5 14l.8-2.7-.8-2.7 2.4-1.5 1-2.6 2.8.2z"/><path d="M9 12l2 2 4-4"/>',
  chat:  '<path d="M21 15a2 2 0 01-2 2H8l-4 4V5a2 2 0 012-2h13a2 2 0 012 2z"/>',
  cam:   '<path d="M3 8a2 2 0 012-2h2l1.5-2h7L17 6h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><circle cx="12" cy="13" r="3.5"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a12 12 0 006 6L16 13l5 2v4a2 2 0 01-2 2A17 17 0 013 5a2 2 0 012-2z"/>',
  mail:  '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  pin:   '<path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  wa:    '<path d="M3 21l1.7-5A8.2 8.2 0 1112 20.2a8.4 8.4 0 01-4.1-1.1L3 21z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5.7 0 1.2-.6 1-1.2l-.3-.8-1.7-.4-.8.9a4.6 4.6 0 01-2.2-2.2l.9-.8-.4-1.7-.8-.3c-.6-.2-1.2.3-1.2 1z"/>',
  fb:    '<path d="M14 8h3V4.5h-3A4 4 0 0010 8.5V11H7.5v3.5H10V21h3.5v-6.5H16l.5-3.5H13.5V8.8c0-.5.3-.8.5-.8z"/>',
  down:  '<path d="M6 9l6 6 6-6"/>',
  x:     '<path d="M18 6L6 18M6 6l12 12"/>',
  sun:   '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:  '<path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"/>',
  menu:  '<path d="M4 7h16M4 12h16M4 17h16"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  star:  '<path d="M12 3.5l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8L6.6 20l1-6-4.3-4.2 6-.9z"/>',
  spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>',
  music: '<circle cx="7" cy="18" r="2.5"/><circle cx="18" cy="16" r="2.5"/><path d="M9.5 18V6l11-2v12"/>',
  run:   '<circle cx="15" cy="4.5" r="1.8"/><path d="M11 21l1.5-5-3-2.5.8-4.5L7 11l-2-1M12.5 16l3.5 1.5 1.5 3.5M10.3 9l3.7-1.5 2.5 3 3 .5"/>',
  leaf:  '<path d="M4 20c0-8 5-14 16-15 0 11-5 15-11 15a5 5 0 01-5-5z"/><path d="M9 15c1.5-3 4-5 7-6"/>',
  cal:   '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  quote: '<path d="M9 7c-3 1-4.5 3.4-4.5 6.5V17h5.5v-5.5H7c0-2 .7-3.2 2.5-3.8zM19 7c-3 1-4.5 3.4-4.5 6.5V17H20v-5.5h-3c0-2 .7-3.2 2.5-3.8z"/>',
  img:   '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="M4 17l5-4.5 3.5 3L16 12l4 4"/>',
  shield:'<path d="M12 3l8 3v6c0 4.4-3.2 8.2-8 9-4.8-.8-8-4.6-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  hand:  '<path d="M8 12V5.5a1.5 1.5 0 013 0V11m0-.5V4.5a1.5 1.5 0 013 0V11m0-.5v-2a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1a6 6 0 01-6-6v-3a1.5 1.5 0 013 0"/>',
  drop:  '<path d="M12 3s6 6.5 6 10.5A6 6 0 016 13.5C6 9.5 12 3 12 3z"/>',
  paint: '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.2"/><circle cx="12" cy="8" r="1.2"/><circle cx="15.5" cy="10" r="1.2"/><path d="M12 21a3 3 0 010-6 2 2 0 002-2 2 2 0 012-2h5"/>',
  puzzle:'<path d="M9 3h6v3a2 2 0 104 0h2v6h-3a2 2 0 100 4h3v5H9v-3a2 2 0 10-4 0H3V9h3a2 2 0 100-4H3V3z"/>',
  back:  '<path d="M15 6l-6 6 6 6"/>',
};
const svg = (n, cls = '') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

/* the four age-group creatures: dark glyphs on a bright brand disc,
   which reads far better than white-on-bright and keeps the palette vivid */
const CREATURE = {
  zaghalil: `<svg viewBox="0 0 48 48" fill="#241f1b" aria-hidden="true"><ellipse cx="22" cy="27" rx="12" ry="10"/><circle cx="31" cy="18" r="7"/><circle cx="33" cy="16.5" r="1.6" fill="#fffdf7"/><path d="M38 18.5l5-2-5-2z"/><path d="M14 24c-4-3-8-2-9 1 3 1 5 2 8 3z"/><path d="M20 36l-2 6M26 36l2 6" stroke="#241f1b" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  sisan:    `<svg viewBox="0 0 48 48" fill="#241f1b" aria-hidden="true"><circle cx="24" cy="28" r="12"/><circle cx="24" cy="15" r="8"/><circle cx="21" cy="14" r="1.6" fill="#fffdf7"/><circle cx="27" cy="14" r="1.6" fill="#fffdf7"/><path d="M24 17l-3.5 3h7z" fill="#fbe900"/><path d="M19 39l-1.5 5M29 39l1.5 5" stroke="#241f1b" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  nahlat:   `<svg viewBox="0 0 48 48" fill="#241f1b" aria-hidden="true"><ellipse cx="24" cy="29" rx="9" ry="12"/><path d="M15 24h18M15 30h18M17 36h14" stroke="#2c2621" stroke-width="2.6"/><circle cx="24" cy="15" r="6"/><path d="M21 11l-3-4M27 11l3-4" stroke="#241f1b" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="12" cy="22" rx="7" ry="4.5" opacity=".65" transform="rotate(-25 12 22)"/><ellipse cx="36" cy="22" rx="7" ry="4.5" opacity=".65" transform="rotate(25 36 22)"/></svg>`,
  farashat: `<svg viewBox="0 0 48 48" fill="#241f1b" aria-hidden="true"><ellipse cx="15" cy="18" rx="9" ry="11" transform="rotate(-20 15 18)"/><ellipse cx="33" cy="18" rx="9" ry="11" transform="rotate(20 33 18)"/><ellipse cx="16" cy="33" rx="7" ry="8" transform="rotate(-15 16 33)" opacity=".8"/><ellipse cx="32" cy="33" rx="7" ry="8" transform="rotate(15 32 33)" opacity=".8"/><rect x="22" y="12" width="4" height="26" rx="2"/><path d="M23 11l-4-5M25 11l4-5" stroke="#241f1b" stroke-width="2.2" stroke-linecap="round"/></svg>`,
};

/* --------------------------------------------------------------- doodles
   Loose crayon marks that sit behind sections. Decorative only, so they are
   aria-hidden and disappear under prefers-reduced-motion. */
const DOODLE = {
  swirl:`<svg viewBox="0 0 120 90" fill="none" aria-hidden="true"><path d="M8 60c14-30 34-38 46-26s-4 34-16 26 2-38 30-40 32 16 30 26" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M96 44l12 2-7 10" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  burst:`<svg viewBox="0 0 70 70" fill="none" aria-hidden="true"><path d="M35 4v16M35 50v16M4 35h16M50 35h16M13 13l11 11M46 46l11 11M57 13L46 24M24 46L13 57" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>`,
  wave:`<svg viewBox="0 0 140 30" fill="none" aria-hidden="true"><path d="M5 20c15-16 30-16 45 0s30 16 45 0 30-16 40-4" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>`,
  star:`<svg viewBox="0 0 60 60" fill="none" aria-hidden="true"><path d="M30 6l6 17 18 1-14 11 5 18-15-10-15 10 5-18L6 24l18-1z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/></svg>`,
};
const doodle = (name, style, colour='var(--yellow)') =>
  `<span class="doodle" style="${style};color:${colour}" aria-hidden="true">${DOODLE[name]}</span>`;

/* ---------------------------------------------------------------- photos
   Real photographs of the nursery. Every one is a room or a wall, no child
   is identifiable, so none of them raise a consent question. */
const photo = (file, ar, he, mod='') =>
  `<figure class="photo ${mod}">
     <img src="assets/photos/${file}" alt="${ar}" loading="lazy" decoding="async">
     <figcaption data-lang="ar">${ar}</figcaption><figcaption data-lang="he">${he}</figcaption>
   </figure>`;

/* ----------------------------------------------------------- editable
   te() is t() plus a marker saying which file and which key inside it a
   piece of text came from. The tap-to-edit layer reads these markers, so
   tapping a sentence on the page knows exactly what to write back to
   content/*.json. Nothing else about the markup changes.

     te('wisdom.json', 'current.ar', 'current.he', arText, heText)
*/
const te = (file, arKey, heKey, ar, he) =>
  `<span data-lang="ar" data-edit="${file}:${arKey}">${ar}</span>` +
  `<span data-lang="he" data-edit="${file}:${heKey}">${he}</span>`;

/* block-level version, for headings and paragraphs */
const teb = (tag, file, arKey, heKey, ar, he, cls = '') => {
  const c = cls ? ` class="${cls}"` : '';
  return `<${tag} data-lang="ar"${c} data-edit="${file}:${arKey}">${ar}</${tag}>` +
         `<${tag} data-lang="he"${c} data-edit="${file}:${heKey}">${he}</${tag}>`;
};

/* -------------------------------------------------------------- helper */
const t  = (ar, he) => `<span data-lang="ar">${ar}</span><span data-lang="he">${he}</span>`;
const tb = (tag, ar, he, cls = '') => {
  const c = cls ? ` class="${cls}"` : '';
  return `<${tag} data-lang="ar"${c}>${ar}</${tag}><${tag} data-lang="he"${c}>${he}</${tag}>`;
};

/* ----------------------------------------------------------- structure */
const NAV = [
  { slug:'index', ar:'الرئيسية', he:'דף הבית', icon:'home', c:'pink' },
  { label:{ar:'عن حكايات', he:'על חכאיאת'}, children:[
    { slug:'about',      ar:'من نحن؟',              he:'מי אנחנו?',            icon:'users',  c:'blue'   },
    { slug:'believe',    ar:'بماذا نؤمن؟',          he:'במה אנחנו מאמינים?',   icon:'heart',  c:'purple' },
    { slug:'management', ar:'إدارة تسعى للأفضل',    he:'הנהלה ששואפת למיטב',   icon:'star',   c:'orange' },
    { slug:'team',       ar:'الطاقم أصل الحكاية',   he:'הצוות, לב הסיפור',     icon:'spark',  c:'green'  },
    { slug:'license',    ar:'شهادة ترخيص',          he:'תעודת רישוי',          icon:'badge',  c:'teal'   },
  ]},
  { label:{ar:'يومنا في حكايات', he:'היום שלנו'}, children:[
    { slug:'building', ar:'مبنى وصفوف حكايات', he:'המבנה והכיתות',        icon:'build', c:'cyan'   },
    { slug:'daily',    ar:'برنامجنا اليومي',   he:'התוכנית היומית',        icon:'clock', c:'orange' },
    { slug:'kitchen',  ar:'مطبخنا الصحي',      he:'המטבח הבריא שלנו',      icon:'pot',   c:'green'  },
    { slug:'guidance', ar:'إرشاد',             he:'הדרכה וליווי',          icon:'book',  c:'purple' },
    { slug:'rules',    ar:'قوانين حكايات',     he:'הנהלים של חכאיאת',      icon:'shield',c:'blue'   },
    { slug:'hours',    ar:'أيام وساعات العمل', he:'ימים ושעות פעילות',     icon:'cal',   c:'teal'   },
  ]},
  { slug:'gallery', ar:'معرض الصور',  he:'גלריה',        icon:'cam',   c:'cyan' },
  { slug:'wisdom',  ar:'حكمة الشهر',  he:'חוכמת החודש',  icon:'quote', c:'pink' },
];
const CONTACT = { slug:'contact', ar:'طرق التواصل مع الأهل', he:'קשר עם ההורים', icon:'chat', c:'pink' };

/* ------------------------------------------------------------- chrome */
function header(slug){
  const items = NAV.map(n=>{
    if(!n.children){
      const cur = n.slug===slug ? ' aria-current="page"':'';
      return `<div class="nav__item"><a class="nav__link" href="${href(n.slug)}"${cur}>${t(n.ar,n.he)}</a></div>`;
    }
    const active = n.children.some(c=>c.slug===slug);
    return `<div class="nav__item">
      <button class="nav__link" aria-expanded="false"${active?' aria-current="page"':''}>${t(n.label.ar,n.label.he)}${svg('down')}</button>
      <div class="menu">${n.children.map(c=>
        `<a href="${href(c.slug)}"${c.slug===slug?' aria-current="page"':''}><span class="dot" style="background:var(--${c.c})"></span>${t(c.ar,c.he)}</a>`).join('')}</div>
    </div>`;
  }).join('');

  return `<header class="hdr">
  <div class="hdr__in">
    <a class="brand" href="${href('index')}">
      <img src="assets/logo-mark.png" alt="${SITE.name.ar}" width="1200" height="898">
      <span class="brand__txt">${t(SITE.name.ar,SITE.name.he)}<small>${t(SITE.tag.ar,SITE.tag.he)}</small></span>
    </a>
    <nav class="nav" aria-label="${'التنقل الرئيسي'}">${items}</nav>
    <div class="hdr__side">
      <a class="btn btn--primary" href="${href('contact')}" style="padding:.6rem 1.15rem;font-size:.93rem">${t('تواصلوا معنا','צרו קשר')}</a>
      <div class="langtog" role="group" aria-label="Language">
        <button data-setlang="ar">عربي</button><button data-setlang="he">עברית</button>
      </div>
      <button class="burger" data-drawer-open aria-label="${'القائمة'}">${svg('menu')}</button>
    </div>
  </div>
</header>

<div class="drawer" id="drawer">
  <div class="drawer__top">
    <a class="brand" href="${href('index')}"><img src="assets/logo-mark.png" alt="" width="1200" height="898"><span class="brand__txt">${t(SITE.name.ar,SITE.name.he)}</span></a>
    <button class="burger" style="display:grid" data-drawer-close aria-label="${'إغلاق'}">${svg('x')}</button>
  </div>
  ${NAV.map(n=>{
    if(!n.children) return `<div class="drawer__grp"><a href="${href(n.slug)}"><span class="dot" style="background:var(--${n.c})"></span>${t(n.ar,n.he)}</a></div>`;
    return `<div class="drawer__grp">${tb('h4',n.label.ar,n.label.he)}
      ${n.children.map(c=>`<a href="${href(c.slug)}"><span class="dot" style="background:var(--${c.c})"></span>${t(c.ar,c.he)}</a>`).join('')}</div>`;
  }).join('')}
  <div class="drawer__grp"><a href="${href('contact')}"><span class="dot" style="background:var(--pink)"></span>${t(CONTACT.ar,CONTACT.he)}</a></div>
  <a class="btn btn--primary" href="tel:${SITE.mobile.replace(/-/g,'')}" style="width:100%;margin-top:1.5rem">${svg('phone')}${SITE.mobile}</a>
</div>`;
}

function footer(){
  const col = (h,items) => `<div>${tb('h4',h.ar,h.he)}<ul>${items.map(i=>`<li><a href="${href(i.slug)}">${t(i.ar,i.he)}</a></li>`).join('')}</ul></div>`;
  return `<footer class="ftr">
  <div class="wrap">
    <div class="ftr__grid">
      <div>
        <img src="assets/logo-full.png" alt="${SITE.name.ar}" width="1115" height="1300" style="height:96px;width:auto;margin-bottom:.9rem">
        ${tb('p','حضانة حكايات في شفاعمرو. مكان يكبر فيه طفلك بحبّ ومهنية، ويجد فيه بيتًا ثانيًا.','מעון חכאיאת בשפרעם. מקום שבו הילד שלכם גדל באהבה ובמקצועיות, ומוצא בו בית שני.','')}
        <div class="social">
          <a href="${SITE.fb}" target="_blank" rel="noopener" aria-label="Facebook">${svg('fb')}</a>
          <a href="https://wa.me/${waNumber}" target="_blank" rel="noopener" aria-label="WhatsApp">${svg('wa')}</a>
          <a href="tel:${SITE.mobile.replace(/-/g,'')}" aria-label="${'اتصال'}">${svg('phone')}</a>
        </div>
      </div>
      ${col({ar:'عن حكايات',he:'על חכאיאת'}, NAV[1].children)}
      ${col({ar:'يومنا في حكايات',he:'היום שלנו'}, NAV[2].children.slice(0,5))}
      <div>
        ${tb('h4','تواصلوا معنا','צרו קשר')}
        <ul>
          <li><a href="tel:${SITE.mobile.replace(/-/g,'')}" style="direction:ltr;display:inline-block" data-edit="site.json:mobile">${SITE.mobile}</a></li>
          <li><a href="tel:${SITE.phone.replace(/-/g,'')}" style="direction:ltr;display:inline-block" data-edit="site.json:phone">${SITE.phone}</a></li>
          <li>${te('site.json','address_ar','address_he',SITE.city.ar,SITE.city.he)}</li>
          <li>${te('site.json','hours_ar','hours_he',SITE.hours.ar, SITE.hours.he)}</li>
        </ul>
      </div>
    </div>
    <div class="ftr__bar">
      <span>© <span id="yr">2026</span> ${t(SITE.name.ar,SITE.name.he)}. ${t('كل الحقوق محفوظة.','כל הזכויות שמורות.')}</span>
      <span>${t('إدارة: ','ניהול: ')}${t(SITE.dir.ar,SITE.dir.he)}</span>
    </div>
  </div>
</footer>`;
}

const href = s => (s==='index' ? 'index.html' : s + '.html');

/* --------------------------------------------------------------- shell */
function layout(p){
  const title = { ar:`${p.title.ar} | ${SITE.name.ar}`, he:`${p.title.he} | ${SITE.name.he}` };
  return `<!doctype html>
<html lang="ar" dir="rtl" data-page="${p.slug}" data-titles='${JSON.stringify(title).replace(/'/g,"&#39;")}'>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title.ar}</title>
<meta name="description" content="${p.desc.ar}">
<meta name="theme-color" content="#e8117c">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<link rel="icon" href="assets/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="assets/favicon.png">
<link rel="canonical" href="${SITE.url}/${href(p.slug)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${title.ar}">
<meta property="og:description" content="${p.desc.ar}">
<meta property="og:image" content="${SITE.url}/assets/logo-full.png">
<meta property="og:locale" content="ar_AR">
<meta property="og:locale:alternate" content="he_IL">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="css/style.css?v=${ASSET_V}">
<script>/* set language + theme before paint, avoids any flash */
(function(){try{
  document.documentElement.className+=' js';
  var l=localStorage.getItem('hk-lang')||'ar';
  document.documentElement.lang=l;document.documentElement.dir='rtl';
  /* The site used to offer a dark toggle. Any phone that stored 'dark' would
     keep opening dark forever, so clear it and never set the attribute. */
  localStorage.removeItem('hk-theme');
  document.documentElement.removeAttribute('data-theme');
}catch(e){}})();</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"ChildCare","name":"${SITE.name.ar}","alternateName":"Hekayat Zaman",
"description":"${p.desc.ar}","telephone":"+972${SITE.mobile.replace(/-/g,'').slice(1)}",
"address":{"@type":"PostalAddress","streetAddress":"${SITE.city.ar}","addressLocality":"شفاعمرو","addressCountry":"IL"},
"openingHours":"Mo-Fr ${pad(CFG.open_from)}-${pad(CFG.open_to)}","sameAs":["${SITE.fb}"]}
</script>
</head>
<body style="--sig:var(--${p.sig});--sig-d:var(--${p.sig}-d);min-height:100dvh;display:flex;flex-direction:column">
${header(p.slug)}
<main>
${p.body}
</main>
${footer()}
<div class="lb" id="lightbox" role="dialog" aria-modal="true" aria-label="${'عرض الصورة'}">
  <button class="lb__x" data-lb-close aria-label="${'إغلاق'}">${svg('x')}</button>
  <div><img id="lb-img" src="" alt=""><p class="lb__cap" id="lb-cap"></p></div>
</div>
<script src="js/site.js?v=${ASSET_V}"></script>
<script src="js/edit.js?v=${ASSET_V}" defer></script>
</body>
</html>`;
}

/* ------------------------------------------------------------- banner */
const banner = (p) => `<section class="banner">
  <div class="blob" style="width:280px;height:280px;background:var(--${p.sig});opacity:.10;inset-inline-end:-90px;top:-110px"></div>
  ${doodle('wave','inset-inline-start:3%;bottom:14%;width:110px;opacity:.5','var(--' + p.sig + ')')}
  <div class="wrap" style="position:relative">
    <p class="crumb"><a href="index.html">${t('الرئيسية','דף הבית')}</a> / ${t(p.title.ar,p.title.he)}</p>
    ${tb('h1',p.title.ar,p.title.he)}
    ${p.intro.ar ? tb('p',p.intro.ar,p.intro.he,'lead') : ''}
  </div>
</section>`;

/* ================================================================ PAGES */
const AGES = [
  { key:'zaghalil', lo:3, hi:15, c:'pink',  ar:'زغاليل', he:'זע\'אליל',
    ageAr:'3 شهور حتى سنة و3 شهور', ageHe:'3 חודשים עד שנה ו-3 חודשים',
    dAr:'أصغر أهل الحكاية. هنا كل شيء يبدأ بالحضن: نوم هادئ، رضاعة على وقتها، وأيادٍ تعرف متى يحتاج الطفل إلى الطمأنينة قبل أي شيء آخر. نعمل بحسب احتياجات الطفل، والتجارب الحسّية من أهمّ الأدوات لتنمية الطفل في جميع المجالات.',
    dHe:'הקטנטנים שבחבורה. כאן הכול מתחיל בחיבוק: שינה רגועה, האכלה בזמן, וידיים שיודעות מתי תינוק זקוק לביטחון לפני הכול. אנחנו עובדים לפי הצרכים של כל ילד, והחוויות החושיות הן מהכלים החשובים ביותר להתפתחותו בכל התחומים.' },
  { key:'sisan', lo:15, hi:22, c:'orange', ar:'صيصان', he:'ציסאן',
    ageAr:'سنة و3 شهور حتى سنة و10 شهور', ageHe:'שנה ו-3 חודשים עד שנה ו-10 חודשים',
    dAr:'سنّ الخطوات الأولى والكلمات الأولى. نوسّع المساحة أمامهم بأمان، ونحوّل كل محاولة وقوف إلى لعبة، وكل صوت جديد إلى كلمة.',
    dHe:'גיל הצעדים והמילים הראשונות. אנחנו מרחיבים להם את המרחב בבטחה, הופכים כל ניסיון עמידה למשחק וכל צליל חדש למילה.' },
  { key:'nahlat', lo:22, hi:27, c:'green', ar:'نحلات', he:'נחלאת',
    ageAr:'سنة و10 شهور حتى سنتين و3 شهور', ageHe:'שנה ו-10 חודשים עד שנתיים ו-3 חודשים',
    dAr:'نشاط لا يهدأ، وفضول يسأل عن كل شيء. نوجّه هذه الطاقة إلى اللعب المشترك، والرسم، والحركة، وأول قواعد الحياة مع الآخرين. نعزّز الثقة بالنفس والتقدير الذاتي، وننمّي الاستقلالية ليكونوا جاهزين للروضات.',
    dHe:'פעילות בלי הפסקה וסקרנות ששואלת על הכול. אנחנו מנתבים את האנרגיה למשחק משותף, ציור, תנועה, וכללי החיים הראשונים עם אחרים. אנחנו מחזקים ביטחון עצמי והערכה עצמית, ומפתחים עצמאות כדי שיגיעו מוכנים לגן.' },
  { key:'farashat', lo:27, hi:36, c:'cyan', ar:'فراشات', he:'פראשאת',
    ageAr:'سنتين و3 شهور حتى 3 سنوات', ageHe:'שנתיים ו-3 חודשים עד 3 שנים',
    dAr:'الأكبر في حكايات، وعلى أبواب الروضة. نحضّرهم للاستقلالية: يرتّبون، يعبّرون عن أنفسهم، ويتعلّمون ضمن مجموعة بخطة واضحة. يكتسبون مهارات حياتية، ونعمل على تنمية وتطوير الجانب السلوكي والتفكيري والعاطفي والحركي.',
    dHe:'הגדולים של חכאיאת, על סף הגן. אנחנו מכינים אותם לעצמאות: מסדרים, מביעים את עצמם, ולומדים בתוך קבוצה עם תוכנית ברורה. הם רוכשים מיומנויות חיים, ואנחנו מפתחים את ההיבט ההתנהגותי, החשיבתי, הרגשי והמוטורי.' },
];

const ageBlock = () => `
<section class="section" id="ages">
  ${doodle('star','inset-inline-start:4%;top:12%;width:44px','var(--orange)')}
  ${doodle('wave','inset-inline-end:5%;bottom:8%;width:120px','var(--green)')}
  <div class="wrap">
    <div class="sec-head center">
      <h2 data-lang="ar">زغاليل، صيصان، نحلات <span class="scribble scribble--pink">وفراشات</span></h2><h2 data-lang="he">זע'אליל, ציסאן, נחלאת <span class="scribble scribble--pink">ופראשאת</span></h2>
      ${tb('p','نعمل بمجموعات صغيرة مقسّمة بحسب الفئة العمرية، لكل مجموعة صفّها وطاقمها وإيقاعها. اضغطوا على المجموعة لتتعرّفوا عليها.','אנחנו עובדים בקבוצות קטנות לפי גיל, לכל קבוצה הכיתה, הצוות והקצב שלה. לחצו על קבוצה כדי להכיר אותה.','lead')}
    </div>
    <div class="finder" id="finder-box">
      ${tb('div','كم عمر طفلكم؟','בני כמה הילד שלכם?','finder__q')}
      <div class="finder__val" id="finder-val"></div>
      <input type="range" id="finder" min="3" max="36" step="1" value="14"
             aria-label="عمر الطفل بالشهور" aria-describedby="finder-res">
      <div class="finder__scale"><span>${t('3 شهور','3 חודשים')}</span><span>${t('3 سنوات','3 שנים')}</span></div>
      <p class="finder__res" id="finder-res" role="status"></p>
    </div>
    <div class="ages" role="tablist">
      ${AGES.map((a,i)=>`<button class="age" role="tab" data-age="${i}" aria-selected="${i===0}" style="--c:var(--${a.c});--cd:var(--${a.c}-d)">
        <span class="age__ico">${CREATURE[a.key]}</span>
        <span class="age__name">${t(a.ar,a.he)}</span>
        <span class="age__age">${t(a.ageAr,a.ageHe)}</span>
      </button>`).join('')}
    </div>
    <div class="agepanel" id="agepanel" style="--c:var(--pink);--cd:var(--pink-d)"></div>
    <script id="age-data" type="application/json">${JSON.stringify(AGES.map(a=>({
      c:a.c, ico:CREATURE[a.key], lo:a.lo, hi:a.hi,
      ar:{n:a.ar,age:a.ageAr,d:a.dAr}, he:{n:a.he,age:a.ageHe,d:a.dHe}
    })))}</script>
  </div>
</section>`;

/* ---------------------------------------------------------------- home */
const home = {
  slug:'index', sig:'pink',
  title:{ar:'حضانة حكايات، بيتكم الثاني', he:'מעון חכאיאת, הבית השני שלכם'},
  desc:{ar:'حضانة حكايات في شفاعمرو: طاقم مؤهل، مبنى واسع وآمن، مطبخ صحي وبرنامج سنوي مدروس لأطفال من 3 شهور حتى 3 سنوات.',
        he:'מעון חכאיאת בשפרעם: צוות מוסמך, מבנה רחב ובטוח, מטבח בריא ותוכנית שנתית מובנית לילדים מגיל 3 חודשים עד 3 שנים.'},
  body:`
<section class="hero">
  <div class="blob" style="width:420px;height:420px;background:var(--yellow);opacity:.30;inset-inline-start:-140px;top:-120px"></div>
  <div class="blob" style="width:300px;height:300px;background:var(--cyan);opacity:.20;inset-inline-end:-100px;bottom:-140px"></div>
  ${doodle('swirl','inset-inline-end:2%;top:4%;width:104px;transform:rotate(12deg);opacity:.75','var(--orange)')}
  ${doodle('burst','inset-inline-start:3%;bottom:6%;width:44px;opacity:.6','var(--cyan)')}
  <div class="wrap" style="position:relative;z-index:2">
    <div class="hero__grid">
      <div>
        <h1>
          ${t('كل طفل عندنا','אצלנו כל ילד')}
          <span class="line2"><span class="scribble">${t('حكاية بحدّ ذاتها','הוא סיפור בפני עצמו')}</span></span>
        </h1>
        ${tb('p','حضانة في قلب شفاعمرو، بطاقم مؤهّل ومبنى واسع وآمن، ترافق طفلكم من عمر 3 شهور حتى 3 سنوات.','מעון בלב שפרעם, עם צוות מוסמך ומבנה רחב ובטוח, שמלווה את ילדכם מגיל 3 חודשים ועד 3 שנים.','lead')}
        <div class="hero__cta">
          <a class="btn btn--primary" href="contact.html">${svg('chat')}${t('احجزوا زيارة','לתיאום ביקור')}</a>
          <a class="btn btn--ghost" href="#ages">${t('تعرّفوا على مجموعاتنا','הכירו את הקבוצות')}</a>
        </div>
      </div>
      <div class="hero__art">
        <div class="bubbles">
          <span style="width:64px;height:64px;background:var(--green);inset-inline-start:2%;top:14%;animation-delay:-1s"></span>
          <span style="width:38px;height:38px;background:var(--orange);inset-inline-end:6%;top:6%;animation-delay:-2.6s"></span>
          <span style="width:52px;height:52px;background:var(--purple);opacity:.6;inset-inline-end:0;bottom:16%;animation-delay:-4s"></span>
          <span style="width:30px;height:30px;background:var(--blue);inset-inline-start:12%;bottom:6%;animation-delay:-5.2s"></span>
        </div>
        <img src="assets/logo-full.png" alt="${SITE.name.ar}" width="1115" height="1300" fetchpriority="high">
      </div>
    </div>
  </div>
</section>

<section class="section section--tint">
  <div class="wrap">
    <div class="stats">
      <div class="rv" style="--c:var(--pink)"><div class="stat__n"><span data-count="800">800</span> <span style="font-size:.55em">${t('م²','מ"ר')}</span></div><div class="stat__l">${t('ساحات وملاعب مجهّزة','חצרות ומגרשים מאובזרים')}</div></div>
      <div class="rv" style="--c:var(--blue)"><div class="stat__n" data-count="4">4</div><div class="stat__l">${t('مجموعات عمرية صغيرة','קבוצות גיל קטנות')}</div></div>
      <div class="rv" style="--c:var(--green)"><div class="stat__n" data-count="3">3</div><div class="stat__l">${t('وجبات طازجة كل يوم','ארוחות טריות בכל יום')}</div></div>
      <div class="rv" style="--c:var(--orange)"><div class="stat__n" data-count="8">8</div><div class="stat__l">${t('ساعات من المتعة والتعلّم يوميًا','שעות של הנאה ולמידה בכל יום')}</div></div>
    </div>
  </div>
</section>

${ageBlock()}

<section class="section section--tint">
  <div class="wrap">
    <div class="sec-head">
      <h2 data-lang="ar">ما الذي يجعل حكايات <span class="scribble">مختلفة</span></h2><h2 data-lang="he">מה עושה את חכאיאת <span class="scribble">אחרת</span></h2>
    </div>
    <div class="split" style="--sp:1.3fr 1fr">
      <div class="tile rv" style="background:var(--blue-d)">
        <div class="tile__deco"></div>
        <div class="card__ico" style="background:rgba(255,255,255,.2);color:#fff">${svg('build')}</div>
        ${tb('h3','مبنى شفاعمري عريق','מבנה שפרעמי עתיק')}
        ${tb('p','حضانتنا داخل مبنى شفاعمري عريق من نهاية القرن التاسع عشر، يعطي دفء البيت، ومقسّم إلى وحدات بحسب الفئة العمرية. لكل وحدة صفّها وحمّامها ومدخلها الخاص.','המעון שלנו שוכן במבנה שפרעמי עתיק מסוף המאה ה-19, שנותן חמימות של בית, ומחולק ליחידות לפי שכבת גיל. לכל יחידה כיתה, שירותים וכניסה משלה.')}
      </div>
      <div class="tile rv" style="background:var(--green-d)">
        <div class="tile__deco"></div>
        <div class="card__ico" style="background:rgba(255,255,255,.2);color:#fff">${svg('pot')}</div>
        ${tb('h3','مطبخ صحّي، ووجبات لذيذة','מטבח בריא, ארוחות טעימות')}
        ${tb('p','ثلاث وجبات طازجة تُحضَّر في مطبخنا بأيدي المسؤولة عن المطبخ وحدها، من منتجات طازجة.','שלוש ארוחות טריות שמוכנות במטבח שלנו בידי האחראית בלבד, ממוצרים טריים.')}
      </div>
    </div>
    <div class="cards cols-3" style="margin-top:1.25rem">
      <div class="card card--lift rv"><div class="card__ico" style="background:var(--sig-soft);color:var(--pink)">${svg('users')}</div>
        ${tb('h3','طاقم يُختار بعناية','צוות שנבחר בקפידה')}
        ${tb('p','مربّيات مؤهّلات حاصلات على شهادات اختصاص في جيل الطفولة المبكرة، ودورة إسعاف أوّلي، ودورة أمن وأمان، وخبرة سنين.','מטפלות מוסמכות בעלות תעודות התמחות בגיל הרך, קורס עזרה ראשונה, קורס ביטחון ובטיחות וניסיון של שנים.')}</div>
      <div class="card card--lift rv"><div class="card__ico" style="background:#e7f4ff;color:var(--blue)">${svg('leaf')}</div>
        ${tb('h3','أيام الحارة الحلوة','ימי השכונה המתוקים')}
        ${tb('p','مراكز تراب ورمل عملاقة تعيد للأطفال متعة اللعب التي فقدها جيل اليوم، وتطوّر حواسهم وحركتهم.','מרכזי עפר וחול ענקיים שמחזירים לילדים את הנאת המשחק שאבדה לדור של היום.')}</div>
      <div class="card card--lift rv"><div class="card__ico" style="background:#fff2e0;color:var(--orange)">${svg('music')}</div>
        ${tb('h3','فعاليات مشمولة بالرسوم','חוגים כלולים בשכר הלימוד')}
        ${tb('p','مسرح دمى، موسيقى، حركة لجيل الطفولة، سفينة نوح، والطبّاخ الصغير. كلّها ضمن رسوم التسجيل.','תיאטרון בובות, מוזיקה, תנועה, תיבת נוח והשף הקטן. הכול כלול בדמי הרישום.')}</div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="sec-head center">
      <h2 data-lang="ar">هذا هو <span class="scribble">بيتنا</span></h2>
      <h2 data-lang="he">זה <span class="scribble">הבית שלנו</span></h2>
      ${tb('p','صفوف واسعة وعالية، أركان لعب، وركن كتب. هذه صور حقيقية من داخل حكايات.','כיתות רחבות וגבוהות, פינות משחק ופינת ספרים. אלה תמונות אמיתיות מתוך חכאיאת.','lead')}
    </div>
    <div class="mosaic">
      ${photo('classroom-2.jpg','صفّ واسع بسقف خشبي عالٍ وجدارية الفيل','כיתה רחבה עם תקרת עץ גבוהה וציור הפיל','rv photo--wide')}
      ${photo('playhouse.jpg','ركن اللعب: البيت الخشبي وشمس الإضاءة','פינת המשחק: בית העץ ומנורת השמש','rv photo--tall')}
      ${photo('library.jpg','ركن الكتب والمكعبات','פינת הספרים והקוביות','rv photo--wide')}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="quote rv">
      <span class="quote__mark">”</span>
      <blockquote data-lang="ar">تؤمن حكايات بأن كل طفل هو حكاية كاملة لها خصوصيتها، وهي الأفضل والأجمل.</blockquote>
      <blockquote data-lang="he">בחכאיאת אנחנו מאמינים שכל ילד הוא סיפור שלם ומיוחד משלו, והיפה והטוב מכולם.</blockquote>
      <cite>${t('من رسالة حضانة حكايات','מתוך המסר של מעון חכאיאת')}</cite>
    </div>
  </div>
</section>

<section class="section section--tint">
  <div class="wrap" style="text-align:center">
    <h2 data-lang="ar">تعالوا وشوفوا <span class="scribble">بعينيكم</span></h2><h2 data-lang="he">בואו לראות <span class="scribble">במו עיניכם</span></h2>
    ${tb('p','أفضل طريقة لتعرفوا حكايات هي أن تزوروها. اتصلوا بنا وحدّدوا موعدًا يناسبكم، وسنستقبلكم بكل رحابة.','הדרך הטובה ביותר להכיר את חכאיאת היא לבקר בה. התקשרו אלינו, נקבע מועד שנוח לכם ונשמח לארח אתכם.','lead')}
    <div class="hero__cta" style="justify-content:center">
      <a class="btn btn--primary" href="tel:${SITE.mobile.replace(/-/g,'')}">${svg('phone')}${SITE.mobile}</a>
      <a class="btn btn--ghost" href="https://wa.me/${waNumber}" target="_blank" rel="noopener">${svg('wa')}${t('واتساب','וואטסאפ')}</a>
    </div>
  </div>
</section>`
};

module.exports = { C, CFG, WISDOM, GALLERY, te, teb, DOODLE, doodle, photo, SITE, NAV, CONTACT, AGES, CREATURE, I, svg, t, tb, href, layout, banner, ageBlock, home, waNumber, OUT, fs, path };

/* pages 2..15 live in build-pages.js and are appended by the runner */
if (require.main === module) require('./build-pages.js');
