# Connecting the admin panel (one-time, ~10 minutes)

The site currently reaches Netlify by drag-and-drop. That has to change: the
panel saves edits into the repo, and Netlify has to rebuild when it does.
Do these five steps once and Sahera never needs you again for content.

---

## 1. Push this folder to GitHub

The repo is already initialised and committed. Create an empty repo on
GitHub (private is fine), then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/hekayat.git
git push -u origin main
```

## 2. Point Netlify at the repo

In Netlify, open the **hekayatz** site → **Site configuration → Build & deploy
→ Continuous deployment** → **Link repository**, and pick the GitHub repo.

Netlify reads `netlify.toml`, so the build command (`node build.js`) and
publish directory (`.`) are already set. Don't type them by hand.

Deploy once and confirm https://hekayatz.netlify.app still looks right.

## 3. Turn on Netlify Identity

**Site configuration → Identity → Enable Identity.**

Then under **Registration preferences** choose **Invite only**. This matters:
without it, anyone on the internet could sign up and edit the site.

## 4. Turn on Git Gateway

**Identity → Services → Git Gateway → Enable.**

This is what lets the panel write to the repo without Sahera having a
GitHub account.

## 5. Invite Sahera

**Identity → Invite users** → her email address. She gets an email, sets a
password, and she's in.

---

## Then send her this

> رابط لوحة التحكّم: **https://hekayatz.netlify.app/admin**
>
> ادخلي بالإيميل وكلمة السر اللي عملتيها.
> بعد أي تعديل اضغطي **Publish** ثم **Publish now**، والموقع بيتحدّث لحاله خلال دقيقة.

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

If she needs a specific paragraph to become editable, add it to a
`content/*.json` file and a matching field in `admin/config.yml`. Do not
hardcode it back into `build.js`.

## Two rules for you

1. **Never hand-edit `js/gallery-data.js`.** It is generated from
   `content/gallery.json` on every build and your changes would be erased.
2. **Bump `ASSET_V` in `build.js`** whenever you change `css/style.css` or
   `js/site.js`, otherwise phones keep serving the cached copy.

## Testing the panel locally

Decap needs the Git Gateway, so the panel only fully works on the deployed
site. Locally you can still edit `content/*.json` by hand and run:

```bash
node build.js
```
