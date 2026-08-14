# Connecting the admin panel

**Status:** GitHub ✅ · Netlify build ✅ · Login ⬅ you are here

> **Why this changed:** the original plan used Netlify Identity + Git Gateway.
> Netlify **deprecated Identity in February 2025** and no longer offers it on
> new sites, which is why "Identity" is missing from the Netlify menu. Git
> Gateway went with it. We now use **DecapBridge**, the replacement built
> specifically for Decap CMS. Sahera still logs in with just an email and
> password, and still never needs a GitHub account.

---

## Step 1 — Create the site on DecapBridge

1. Go to **decapbridge.com** and sign up (free tier covers 3 sites and
   10 users, we need 1 and 2).
2. Create a new site and connect it to the GitHub repo **`moris1998/hekayat`**,
   branch **`main`**. It will ask permission to access the repo; allow it.
3. It gives you a **site id** and an `identity_url` that looks like
   `https://auth.decapbridge.com/sites/xxxxxxxx-xxxx-...`

**Copy that URL.**

## Step 2 — Paste it into the config

Open `admin/config.yml`, find this line near the top:

```
  identity_url: https://auth.decapbridge.com/sites/YOUR-SITE-ID
```

Replace `YOUR-SITE-ID` with the id from step 1. Leave `gateway_url` as is.

Send me the URL and I'll do it, or edit it yourself and save.

## Step 3 — Push

In GitHub Desktop: **Commit to main** → **Push origin**.

Netlify rebuilds in about a minute.

## Step 4 — Test it yourself first

Go to **hekayatz.netlify.app/admin** and log in with your DecapBridge account.

Change حكمة الشهر to anything, press **Publish**, wait a minute, then open
**hekayatz.netlify.app/wisdom.html**. If the quote changed, the whole chain works.

**Do not hand this to Sahera until you've seen that work.**

## Step 5 — Invite her

In DecapBridge, invite her by email. She gets a link, sets a password, done.

Then send her:

> رابط لوحة التحكّم: **hekayatz.netlify.app/admin**
>
> ادخلي بالإيميل وكلمة السر اللي عملتيها.
> بعد أي تعديل اضغطي **Publish** ثم **Publish now** — الموقع بيتحدّث لحاله خلال دقيقة.

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
