# Connecting the admin panel

**Status:** GitHub ✅ · Netlify build ✅ · Login ⬅ you are here

> **Why this changed:** the original plan used Netlify Identity + Git Gateway.
> Netlify **deprecated Identity in February 2025** and no longer offers it on
> new sites, which is why "Identity" is missing from the Netlify menu. Git
> Gateway went with it. We now use **DecapBridge**, the replacement built
> specifically for Decap CMS. Sahera still logs in with just an email and
> password, and still never needs a GitHub account.

---

## Done already

- ✅ GitHub repo `moris1998/hekayat`
- ✅ Netlify building from it with `node build.js`
- ✅ DecapBridge site created, config pasted into `admin/config.yml`

## Step 1 — Push

In GitHub Desktop: **Commit to main**, then **Push origin**.
Netlify rebuilds in about a minute.

## Step 2 — Test it yourself

Open **hekayatz.netlify.app/admin** and log in with your DecapBridge account.

Change حكمة الشهر to anything, press **Publish**, wait a minute, then open
**hekayatz.netlify.app/wisdom.html**. If the quote changed, the whole chain
works: panel → GitHub → Netlify → live page.

**Do not hand this to Sahera until you have seen that work.**

## Step 3 — Invite her

DecapBridge dashboard → **Manage collaborators** → invite by email.
She gets a link, sets a password, done.

Then send her:

> رابط لوحة التحكّم: **hekayatz.netlify.app/admin**
>
> ادخلي بالإيميل وكلمة السر اللي عملتيها.
> بعد أي تعديل اضغطي **Publish** ثم **Publish now** — الموقع بيتحدّث لحاله خلال دقيقة.

## The GitHub token

DecapBridge holds a GitHub token for this repo. It is **not** in this repo and
must never be. If the panel suddenly stops saving, the token has most likely
expired: generate a new fine-grained one (only the `hekayat` repo, Contents and
Pull requests set to read and write) and paste it into the DecapBridge site
settings.

---

## If you'd rather not use a third party

The alternative is Decap's **GitHub backend**: no DecapBridge, no extra
service, authentication straight through GitHub. In `admin/config.yml`:

```yaml
backend:
  name: github
  repo: moris1998/hekayat
  branch: main
```

The catch is that **Sahera would need her own GitHub account** and to be added
as a collaborator on the repo. For a non-technical user that is a real hurdle,
which is why DecapBridge is the recommendation. The tradeoff is one more
service in the chain.

---

## What she can change

| القسم | الملف | ماذا تعدّل |
|---|---|---|
| حكمة الشهر | `content/wisdom.json` | جملة هذا الشهر + أرشيف الأشهر الماضية |
| معرض الصور | `content/gallery.json` | رفع صور جديدة، وصف، القسم، حذف |
| معلومات الحضانة | `content/site.json` | الهواتف، الواتساب، العنوان، أيام وساعات الدوام |
| قوانين حكايات | `content/rules.json` | بنود القوانين، إضافة وحذف وترتيب |
| البرنامج اليومي | `content/daily.json` | ساعات اليوم وأسماء الفقرات |

Photos she uploads go to `assets/photos/`, beside the existing ones.

## What she deliberately cannot change

The body prose on pages like «من نحن» and «بماذا نؤمن» is **not** exposed in
the panel, on purpose. Every string on this site exists twice, once in Arabic
and once in Hebrew, and a page breaks if one half goes missing or if markup is
pasted in. Those edits should keep coming through you.

To expose a specific paragraph later: add it to a `content/*.json` file and a
matching field in `admin/config.yml`. Do not hardcode it back into `build.js`.

## Two rules for you

1. **Never hand-edit `js/gallery-data.js`.** It is generated from
   `content/gallery.json` on every build and your changes would be erased.
2. **Bump `ASSET_V` in `build.js`** whenever you change `css/style.css` or
   `js/site.js`, otherwise phones keep serving the cached copy.

## Before each working session

Press **Fetch origin** in GitHub Desktop, then:

```bash
./sync.sh
```

That pulls down anything Sahera published and rebuilds locally, so we never
edit a stale copy and hit a merge conflict.

---

# Tap-to-edit on the site itself

She logs in **on the site**. No panel, no redirect.

## One-time setup

### 1. Make a login for each person

```bash
node tools/make-user.js sahera@example.com "her password" ساهرة
```

It prints one line. The password itself is never stored, only a scrypt hash.
Run it once per person and join the lines with commas.

### 2. Make a signing secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Put four values in Netlify

**Project configuration → Environment variables → Add a variable**

| Name | Value |
|---|---|
| `EDIT_USERS` | the line(s) from step 1, comma-separated |
| `EDIT_SECRET` | the string from step 2 |
| `GITHUB_TOKEN` | fine-grained PAT: only the `hekayat` repo, Contents + Pull requests = read and write |
| `GITHUB_REPO` | `moris1998/hekayat` |

These live only in Netlify. **None are in this repo and none reach the
browser** — the GitHub token never leaves the server, so a visitor cannot
find it however hard they look.

### 4. Push, and wait for the deploy

## How she uses it

1. Opens **hekayatz.netlify.app** on her phone
2. Presses **«تعديل»** at the bottom
3. First time only: types her email and password right there on the page
4. Taps any outlined sentence, changes it, presses **تم**
5. **حفظ التغييرات** when done. Live in about a minute.

She stays logged in for **90 days**. A **«خروج»** button sits beside the edit
button when she wants out.

## Who can edit

Only the people listed in `EDIT_USERS`. There is no sign-up. Adding someone
means adding a line; removing someone means deleting their line, and they are
locked out on their next save.

## The old /admin panel

Still there, still works, now optional. Use it for **photo uploads**, which
tap-to-edit does not cover yet. For text, the site itself is nicer.


## What is editable this way

Anything the build stamps with `data-edit`, currently:

| Page | Editable |
|---|---|
| حكمة الشهر | the month's quote, its source, the whole archive |
| قوانين حكايات | every rule title and body |
| برنامجنا اليومي | every row: times, names, notes |
| Footer, on every page | phones, address, the hours line |

To make something else editable, wrap it in `te()` or `teb()` in `build.js`
instead of `t()` or `tb()`, passing the file and the key path. Example:

```js
te('wisdom.json', 'current.ar', 'current.he', arText, heText)
```

The tap-to-edit layer needs nothing else: it reads those markers.

## It is invisible to visitors

`js/edit.js` exits immediately when there is no login token, before it touches
the page. A parent never sees a button, and none of the edit markup renders
(the CSS is all behind `html.hk-editing`, which only appears after login).

## If saving ever fails

Open the browser console. Errors are logged as `[hekayat edit]`. The usual
cause is an expired login: she should visit `/admin` and log in again.
