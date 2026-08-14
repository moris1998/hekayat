# حضانة حكايات — موقع الحضانة | מעון חכאיאת

Static bilingual site (Arabic primary, Hebrew secondary). No build step to deploy:
upload the folder as-is to any host.

---

## Editing content

**All copy lives in two files.** Never edit the `.html` files directly, they are generated.

| File | What is in it |
|---|---|
| `build.js` | site details (phones, address, director), navigation, footer, home page |
| `build-pages.js` | the other 14 pages |

Every piece of text is written once as an Arabic/Hebrew pair:

```js
t('النص بالعربية', 'הטקסט בעברית')
```

After any edit, regenerate the pages:

```bash
node build.js
```

That rewrites all 15 `.html` files. Commit those too, they are what gets served.

---

## Adding photos to the gallery

1. Drop the image files into `assets/gallery/`
2. Add one line per photo in `js/gallery-data.js`:

```js
{ src:'assets/gallery/festival-01.jpg', cat:'events',
  ar:'حفلة غابة الحيوانات', he:'מסיבת יער החיות' },
```

`cat` is one of `events` `yard` `activities` `rooms`.

No rebuild needed. The gallery page shows filters, a masonry grid and a lightbox
as soon as photos exist, and a friendly empty state while the list is empty.

---

## What still needs the nursery's input

Pages carrying a highlighted note (marked `data-draft` in the HTML) contain copy
I drafted rather than took from the brochure. They read correctly but should be
confirmed before launch:

- **شهادة ترخيص** — needs the actual certificate image or PDF, its number and validity date
- **قوانين حكايات** — drafted from common nursery practice, confirm against the real rules
- **برنامجنا اليومي** — hour-by-hour schedule inferred from the brochure (7:30–16:00, three meals, the 4pm snack)
- **إرشاد** — confirm whether there is a named counsellor or a specific guidance programme
- **الطاقم** — ready to receive staff names, photos and short bios
- **حكمة الشهر** — the current month's quote is from the brochure; later months need supplying

Everything else is taken directly from the brochure.

---

## Before going live

1. Set the real domain in `build.js` → `SITE.url` (currently `https://hekayat.example`).
   It feeds the canonical URL and the social share card.
2. Rerun `node build.js`.
3. Upload the whole folder. `index.html` is the entry point.

---

## How it is built

- **Bilingual**: both languages ship inside every page. CSS shows one and hides the
  other, so switching is instant, needs no reload, and search engines index both.
  The choice is remembered in `localStorage`.
- **Colour**: each page owns one signature colour from the logo palette. Deep
  variants (`--pink-d` etc.) are used wherever a brand colour sits behind white
  text, so every combination clears WCAG AA contrast. The pure bright colours stay
  for dots, borders, blobs and the age-group discs.
- **Look**: claymorphism, the standard visual language for children's products.
  Chunky 3px borders and a solid offset edge give every card and button real
  thickness, and pressing one pushes it down onto its own shadow.
- **Age finder**: the slider above the age groups. Parents drag to their child's
  age and the matching group lights up, with a confetti burst on release. Group
  boundaries live in `AGES` in `build.js` as `lo`/`hi` months.
- **Motion**: scroll reveals, counters, the age panel, hero pointer drift and the
  confetti. All of it respects `prefers-reduced-motion`, and content is visible by
  default so nothing can be left blank if JavaScript fails or the tab loads hidden.
- **Texture**: a fixed paper-grain layer over the page, hand-drawn underlines on
  key headline words (`.scribble`), loose crayon marks behind sections
  (`doodle()` in `build.js`), and torn-paper edges between tinted sections.
- **The site is light only.** There is no dark mode and no theme toggle. A bright
  nursery brand should never open dark. Three things enforce this together, and
  all three are needed:
  1. `color-scheme: only light` on `:root` **and** on `html` in `css/style.css`.
     This is the documented opt-out from Android's forced dark (Chrome's
     "Auto Dark Theme for Web Contents", Samsung Internet's Dark mode,
     WebView force-dark).
  2. An explicit `background-color` and `color` on `html`, so the forced-dark
     algorithm has stated values rather than defaults to invert.
  3. The head script clears any `hk-theme` left in a device's `localStorage`
     from the old toggle, which would otherwise keep that phone dark forever.

  Do not add `prefers-color-scheme` back, and do not remove any of the three.

- **Cache busting**: `ASSET_V` in `build.js` is appended to the CSS and JS URLs
  (`style.css?v=4`). **Bump it whenever you change css/style.css or js/site.js**,
  otherwise phones that cached the old files will not see your change. This is
  why an earlier "fix" appeared not to work on a real phone.
- **Contact form**: a static host has no server, so the form composes a WhatsApp
  message to the nursery. Nothing is sent anywhere else.

## Local preview

```bash
npx serve . -l 4321
```
