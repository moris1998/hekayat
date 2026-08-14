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
