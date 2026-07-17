# Photography section

A Bento-style photography portfolio integrated into the existing static
personal website. Public visitors get a clean, premium, read-only gallery
with a fullscreen lightbox. A single admin (matched by email) gets on-canvas
editing: upload, drag-to-reorder, resize, focal point, captions, publish.

It reuses the site's existing shell, sidebar, design tokens, typography and
routing — no separate app, no framework, no build step required for the
default mode.

---

## Two modes

The whole feature talks to one swappable data adapter, selected in
[`photography/config.js`](photography/config.js) via `backend`:

| Mode | `backend` | Image binaries | Metadata | Auth | Setup |
|------|-----------|-----------------|----------|------|-------|
| **Local** (default) | `'local'` | Browser `localStorage` (base64) | `localStorage` | Local email unlock (dev) | **None** — works immediately |
| **Cloud (production)** | `'cloudinary'` | **Cloudinary** (CDN, automatic format/quality, on-the-fly responsive transforms) | Supabase Postgres | **Google Sign-In** + server-side `ADMIN_EMAIL` | See below |

Owner email: set via the `ADMIN_EMAIL` env var (server-side source of
truth) — never hardcoded in the repo. The frontend fetches it at
runtime from `netlify/functions/public-config.js` for UI gating only
(see "Runtime config" below); the real authorization check always
happens server-side.

Local mode is fully functional and is what ships working out of the box —
great for building/arranging the gallery. Switch to `'cloudinary'` when you
want permanent, fast-loading production images (direct-to-Cloudinary
uploads, automatic modern-format delivery, on-the-fly responsive sizes),
secure server-side authorization, and images that persist across devices.
Supabase Postgres is the metadata store either way — only the image
**binaries** move.

---

## File map

```
index.html                       ← 4th nav icon + #photos-content + script tags (only additions)
script.js                        ← /photos routing added (existing routes untouched)
photography/
  config.js                      ← route, backend switch, grid defaults, runtime-config fetch (see "Runtime config")
  cloudinary-helpers.js           ← getCloudinaryUrl/getResponsiveSrcSet/getPlaceholderUrl/getFullscreenUrl
  seed-data.js                   ← 14 placeholder photos (DEMO only, clearly separated)
  data-adapter.js                ← LocalAdapter (default) + CloudinaryAdapter
  auth.js                        ← Google Sign-In (GIS) + local unlock fallback
  bento-grid.js                  ← reusable createBentoGrid() engine (responsive srcset + placeholders)
  lightbox.js                    ← accessible fullscreen viewer
  photography.js                 ← orchestrator (header, toolbar, dialogs, migration, load-more, Book/Featured filters)
  photography.css                ← styles (built on existing tokens)
netlify/functions/               ← production serverless API (admin-authorized)
  _lib.js                        ← Supabase clients, requireAdmin(), row⇄client mapping
  _cloudinary.js                 ← Cloudinary SDK config, signed-upload params, destroyAsset()
  photos-list.js                 ← GET gallery (plain array, or {items,nextCursor,hasMore} paginated)
  photos-settings.js, photos-write.js
  cloudinary-signature.js        ← mints signed direct-upload params (phase 1 of upload)
  cloudinary-delete.js           ← deletes a single Cloudinary asset by public_id
  public-config.js               ← PUBLIC, no auth — serves adminEmail/googleClientId/cloudinaryCloudName at runtime (see "Runtime config")
  package.json                   ← @supabase/supabase-js, google-auth-library, cloudinary
supabase/
  schema.sql                     ← tables (+ Cloudinary columns: cloudinary_public_id, secure_url, format, bytes, dominant_color, aspect_ratio, book, featured)
  policies.sql                   ← RLS policies
.env.example                     ← required env vars (Supabase + Cloudinary + Google)
```

Existing pages, colors, icons, navigation, typography and routes are unchanged.
The only edits to existing files are: the 4th sidebar icon + section container +
`<script>`/`<link>` tags in `index.html`, and the `/photos` branch + button
handler in `script.js`.

---

## Routes

- `/photos` — the public gallery (also `/photography`).
- `/photos/admin` — triggers the admin sign-in. Non-admins simply stay in
  public view. There is no distracting public login prompt.

The 4th sidebar icon (camera) navigates to `/photos` and shows the active
state, matching the existing three icons exactly.

---

## Owner access

There are exactly two modes: **Owner Edit** (only the email set in the
`ADMIN_EMAIL` env var) and **Public Read-Only** (everyone else).

Entry points (subtle, non-disruptive to the public design):
- The **profile icon at the bottom of the left sidebar** → **double-click**
  opens the sign-in dialog (a single click does nothing, so casual visitors
  don't stumble onto it).
- Direct routes **`/admin`**, **`/edit`**, or `/photos/admin`. Unauthorized
  visitors who open these are prompted to sign in and otherwise stay on the
  public gallery (no edit controls are ever shown).

How authorization works:
- **Cloud mode (Google):** clicking sign-in shows the real **Google Sign-In**
  button (Google Identity Services). Google returns a signed ID token; the
  email is checked client-side for UI, and **every protected API verifies the
  token server-side** (`google-auth-library`, audience = `GOOGLE_CLIENT_ID`)
  and requires the email to equal `ADMIN_EMAIL`. Being signed into Chrome is
  never enough — you must sign in to this site, and the server re-verifies each
  write. Hidden buttons are cosmetic only.
- **Local mode (dev):** if no `googleClientId` is set, sign-in falls back to a
  local **email + password** unlock (`photography/config.js` → `ownerPasswordHash`,
  a SHA-256 hash — the plaintext password is never written to any file). This
  is still **not a real security boundary**: this is a static site, so the
  hash ships to every visitor's browser and could be brute-forced offline or
  bypassed by reading `auth.js` in devtools. It only raises the bar above
  "guess the email" for casual visitors. The real protection is Google
  Sign-In + the server-side `ADMIN_EMAIL` check below, once configured.

Enable real Google Sign-In by setting `googleClientId` in
[`photography/config.js`](photography/config.js) and `GOOGLE_CLIENT_ID` in the
server env (see production steps below).

---

## Replacing the placeholder photos

You never need to touch code. In Admin Mode:

1. Open `/photos`, unlock via `/photos/admin`.
2. **Add Photos** → select or drop **as many files at once as you like** →
   they appear as drafts, **auto-sized to match each photo's own orientation**
   (portrait photos get a portrait slot, landscape a landscape slot,
   near-square a square slot — see `pickGridForImage` in `photography.js`) so
   `object-fit: cover` has to crop as little as possible.
3. **Bulk update**: once at least one photo in that upload finishes, a "Bulk
   update" section appears right in the same dialog — set one **category**
   and click **Apply to all**, or **Publish all** / **Unpublish all** — applies
   to every photo from that upload in a single action, no need to open each
   photo's edit dialog individually. Fine-tune any one afterwards via its ✎.
4. Click a card's ✎ to set title/caption/alt text, focal point and size individually.
5. Delete the seed cards you don't want.

Size presets are intentionally few — **Portrait, Square, Landscape, Feature**
(`photography/config.js` → `sizePresets`) — since the auto-sizing above already
covers the common case; presets are just for the occasional deliberate resize
(e.g. a wider "Feature" showcase shot).

Seed data lives only in `seed-data.js` and is copied into storage on first
load; edits/uploads never write back to that file. In cloud mode the seed file
is ignored entirely (rows come from the database).

---

## Going to production (cloud mode)

### 1. Supabase
1. Create a Supabase project.
2. SQL editor → run [`supabase/schema.sql`](supabase/schema.sql), then
   [`supabase/policies.sql`](supabase/policies.sql).
3. Confirm a **public** Storage bucket named `photography` exists (the policy
   script creates it).

### 2. Google Sign-In (Google Cloud Console)
1. Google Cloud Console → **APIs & Services → Credentials → Create OAuth client
   ID → Web application**.
2. **Authorized JavaScript origins:** your site origin(s), e.g.
   `https://your-site.netlify.app` (and `http://localhost:8888` for `netlify dev`).
3. Copy the **Client ID** (public). No secret is needed for the client
   ID-token sign-in flow.
4. The Google Identity Services script loads automatically from `auth.js` once a
   client id is configured — nothing to add to `index.html`.

### 3. Cloudinary setup (image storage, optimization, and delivery)

Cloudinary stores/delivers the image **binaries**; Supabase (step 1) still
stores the **metadata** row for each photo — both are required for
`backend: 'cloudinary'`.

1. **Create or log into a Cloudinary account** — [cloudinary.com](https://cloudinary.com).
   The free tier is enough to get started.
2. **Find your credentials** — Dashboard home page shows **Cloud name**,
   **API Key**, and **API Secret** directly.
3. **Add them ONLY to Netlify environment variables** (step 4 below) —
   never to `photography/config.js`, any other file the browser loads, or
   a commit. `CLOUDINARY_CLOUD_NAME` is the one exception: it's not secret
   (it's part of every public delivery URL), so it's also set as
   `photography/config.js` → `cloudinaryCloudName` for the frontend's URL
   helpers to use.
4. **Create a dedicated upload folder** — pick a root folder name for this
   app's uploads, e.g. `vikash-gallery`, and set it as
   `CLOUDINARY_UPLOAD_FOLDER`. Nothing needs to be pre-created in the
   Cloudinary console — the folder is created automatically on first
   upload. All uploads land under `{folder}/uploads/{year}/{uuid}`
   (category/book aren't known yet at upload time in this app's flow —
   they're assigned afterward in the edit dialog — so the folder path is
   UUID/year-based only, never renamed or moved later).
5. **Allowed formats** — enforced twice: the Netlify function rejects
   anything other than JPEG/PNG/WebP/AVIF before it ever mints a signature,
   and the signed `allowed_formats` parameter makes Cloudinary itself
   reject any other real file content at the upload API level (so a
   spoofed `Content-Type` can't sneak a disallowed format through).
6. **Upload presets — not used, by design.** This app uses **signed**
   uploads exclusively (every upload requires a fresh, admin-gated
   signature from `cloudinary-signature.js`) rather than a broadly
   permissive **unsigned** upload preset. An unsigned preset would let
   *anyone* who discovers your cloud name upload directly to your account
   with no server-side check at all — avoid creating one for this app.
7. **Why the API secret must never be in frontend code**: `CLOUDINARY_API_SECRET`
   is what proves a request came from your own trusted server. If it ever
   shipped to the browser (or a log, or Git), anyone could mint their own
   valid signatures and upload/delete assets in your account directly,
   bypassing `requireAdmin()` entirely. It is only ever read from
   `process.env` inside `netlify/functions/_cloudinary.js`, which runs
   server-side.
8. **Signature algorithm** — if uploads ever fail with "Invalid Signature"
   even though your credentials are correct, check **Settings → Security →
   Signature Algorithm** in the Cloudinary console (SHA-1 vs SHA-256) —
   a mismatch there breaks every signed request, not just this app's.

### 4. Environment variables
Copy [`.env.example`](.env.example) and set the values in
**Netlify → Site settings → Environment variables**:
`ADMIN_EMAIL` (your real owner email), `GOOGLE_CLIENT_ID`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (metadata always lives in
Supabase), and for Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
`CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_FOLDER`.

### 5. Flip the switch
In `photography/config.js`, set `backend: 'cloudinary'`. **Do not** put
`googleClientId`, `cloudinaryCloudName`, or any real `adminEmail` value
directly in this file — see "Runtime config" below for why, and how
they actually reach the frontend.

### Runtime config — why nothing real is ever committed

Netlify's built-in secret scanner fails a deploy if a configured
environment variable's **value** appears anywhere in the deployed
files — including comments, README text, and `.env.example`'s own
placeholder lines if they ever happen to literally match a real value
you configured. This applies even to values that are otherwise totally
fine to expose to every visitor (a Google OAuth client id, a Cloudinary
cloud name, the owner's email) — the scanner just does exact-string
matching against your Netlify env vars, with no concept of "this one's
meant to be public."

So `photography/config.js` never hardcodes `adminEmail`, `googleClientId`,
or `cloudinaryCloudName` — it starts them empty and fetches them once at
page load from `GET /.netlify/functions/public-config` (no auth required
— these three values are the only ones it returns, and none of them are
actually sensitive; the real security boundary is still `requireAdmin()`
verifying the Google ID token server-side on every write). `config.js`
exposes this as `PhotographyConfig.ready`, a Promise that `auth.js` and
`photography.js` await before doing anything that needs these values —
local mode never makes this call at all and resolves `ready` immediately,
keeping its "zero setup, no keys, no network calls" promise intact.

One consequence: the local-mode dev password fallback no longer checks
your real owner email (that value isn't available client-side at all
now) — it checks a fixed placeholder, `localDevOwnerEmail` in
`config.js` (default `owner@localhost.test`), decoupled entirely from
any real credential.

### 6. Local dev
`netlify dev` runs the functions locally against your real Supabase +
Cloudinary credentials (from a local `.env` — never commit it; copy
[`.env.example`](.env.example) to `.env` and fill in real values). With
`backend` still `'local'` in `config.js` you can develop the UI with zero
setup; switch to `'cloudinary'` locally once you want to exercise the real
signed-upload pipeline end to end. `localStorage`/`IndexedDB` are never
used as a production fallback — if `backend` is `'cloudinary'` and a
network call fails, the UI surfaces the error rather than silently writing
to local storage.

### 7. Monitoring usage & rotating credentials
- **Usage**: Cloudinary dashboard → **Usage** (or **Billing**) shows storage,
  bandwidth/transformations, and credits consumed against your plan's
  quota — check this occasionally, especially after a burst of uploads or
  a traffic spike, since exceeding a free-tier quota can throttle delivery.
- **Rotating credentials**: Cloudinary console → **Settings → Security** →
  generate a new API key/secret pair (Cloudinary supports having two active
  keys briefly during rotation). Update `CLOUDINARY_API_KEY` /
  `CLOUDINARY_API_SECRET` in Netlify's environment variables, redeploy, then
  revoke the old key once you've confirmed uploads still work. Do this
  immediately if a secret is ever accidentally exposed (committed, logged,
  pasted somewhere public).

### 8. Deploy
Netlify auto-detects `netlify/functions/` and installs its `package.json`
deps — the `cloudinary` package is pure JavaScript (no native module, no
special bundler config needed, unlike the R2-era `sharp` dependency this
replaces). `/.netlify/functions/*` is reserved by Netlify and is not
affected by the SPA rewrite. Test locally with `netlify dev`.

---

## Migrating existing local photos to the cloud

If you built out your gallery in **Local mode** first (the default) and are
now switching to `'cloudinary'`, nothing migrates automatically —
`localStorage` data on your machine is invisible to the server. Once you
flip `backend` and sign in as the admin again:

1. The toolbar shows a **"Migrate to Cloud"** button whenever this browser
   still has photos with base64 image data left over from local mode.
2. Click it → optionally **Download JSON backup** first (saves everything
   currently in local storage as a `.json` file on your machine, before
   anything is touched).
3. Pick which photos to migrate (all are selected by default) → **Migrate
   selected**. Each one is re-uploaded through the exact same signed path a
   fresh upload would use (so it gets a real Cloudinary asset with correct
   dimensions/format/dominant color), preserving its title, caption,
   category, book, order, focal point/zoom, featured state, and published
   state.
4. Only the photos you actually migrated are removed from local storage
   afterward — anything left unchecked, or that fails to migrate, stays
   exactly as it was so you can retry.

---

## Security model

- **Public** may only read **published** rows and the settings row (enforced by
  Supabase RLS, not just the UI).
- **All writes** (create/update/delete/reorder/resize/settings/upload) go
  through the Netlify functions, which `await requireAdmin(event)` **before**
  any DB/storage access — cryptographically verifying the Google ID token
  (signature + expiry + audience `GOOGLE_CLIENT_ID`) and requiring the email to
  equal `ADMIN_EMAIL`. Only the service-role key (server-only) can write.
- The **service-role key and Cloudinary API secret are never exposed** to
  the browser — uploads use a short-lived signature minted server-side per
  request (`cloudinary-signature.js`), never the raw secret; deletes go
  through an admin-gated Netlify function (`cloudinary-delete.js` /
  `photos-write.js`'s `'delete'` op) that also checks the asset falls under
  this app's own upload folder before deleting it.
- Unpublished photos are never returned by the public endpoint.

---

## Reusing the grid elsewhere

The grid is decoupled from the page. Drop it on any page:

```js
const api = createBentoGrid(containerEl, {
  photos,                 // array of Photograph objects
  mode: 'public',         // or 'edit'
  columns: 12, gap: 16, borderRadius: 16,   // 12/6/2 responsive, 8px system
  showCaption: true, showCategory: true, lightbox: true,
  onOpenLightbox: (photos, i) => myLightbox.open(photos, i)
});
```

Responsive column counts (desktop/tablet/mobile) come from
`PhotographyConfig.grid`.

---

## If an upload fails

The upload dialog now shows the **actual reason** under the failed item
(not just a generic "Failed"). The two real causes in local mode:

1. **HEIC/HEIF photos** — the default format on iPhones. Most non-Safari
   browsers cannot decode HEIC via canvas at all, so the upload fails with
   a message telling you to convert to JPG/PNG (or set the iPhone camera
   to "Most Compatible" under Settings → Camera → Formats, which saves
   new photos as JPG instead of HEIC).
2. **Storage full** — local mode keeps photos as base64 in `localStorage`,
   which has a small per-browser quota (varies by browser, often 5-10MB).
   Real detailed photos can each take several hundred KB once encoded, so
   a browser with a tight quota can fill up after just a handful of
   uploads. The error message tells you to delete a few existing photos,
   or switch to Cloudinary/cloud mode (no such limit — see above).

Non-image files dropped into the upload dialog are now labeled "Skipped —
not an image file" instead of silently vanishing from the list.

**In Cloudinary mode**, each upload item shows a real progress bar (actual
bytes uploaded, not a fake milestone) and a **cancel (×)** button while it's
in flight — cancelling aborts the in-progress request immediately. Other
failure causes you may see:
- **"Upload failed (HTTP …)" / a Cloudinary error message** — Cloudinary
  itself rejected the request (e.g. the signed request became stale, or the
  account's signature algorithm doesn't match — see "Signature algorithm"
  above).
- **"…is a … file — only JPEG, PNG, WebP, and AVIF photos are accepted."** /
  **"…is too large (max 25MB)"** — rejected before any network call, by the
  same allowlist the Netlify function independently enforces before minting
  a signature (client-side check is just a faster failure, not the real
  gate — Cloudinary's own `allowed_formats` check against the real uploaded
  bytes is the actual gate).
- A failed upload never leaves a half-written photo — the metadata row is
  only created after Cloudinary's upload response comes back successfully.

---

## Notes / optional upgrades

- **Cloudinary mode** (`backend: 'cloudinary'`) never pre-generates or
  stores per-size images — `photography/cloudinary-helpers.js` builds
  `f_auto,q_auto` delivery URLs from the stored `cloudinaryPublicId` at
  render time (responsive `srcset` widths `320–1600`, a tiny blurred
  placeholder, a fullscreen transform), and Cloudinary's CDN caches each
  actual transform on first request. True pixel dimensions, format, and
  byte size come directly from Cloudinary's upload response; dominant
  color comes from the optional `colors:true` upload parameter (not
  guaranteed on every account tier — if absent, the UI just falls back to
  its plain shimmer skeleton, no error). `bento-grid.js` renders all of
  this with an instant blurred fill, and only the first (above-the-fold)
  card ever loads eagerly — everything else is native `loading="lazy"`.
- Local mode downscales uploads to WebP in-browser (via canvas) so they fit in
  `localStorage`; very large libraries should migrate to `'cloudinary'` (see
  "Migrating existing local photos to the cloud" above).
- The public gallery loads its **first page** of photos up front and fetches
  more as the visitor scrolls near the bottom (`listPublicPage()` /
  `IntersectionObserver` in `photography.js`) — this only meaningfully
  activates once a catalog grows past a single page; small galleries load
  in one request as before.
- **Featured** is a simple cross-category curated view: mark any photo
  "★ Featured" in its edit dialog, and (once at least one photo is
  featured) a "★ Featured" chip appears in the public filter row — clicking
  it shows just the featured set, independent of category, so it's never a
  category/featured dead end.
- **Book** is a free-text field for grouping photos within a category (e.g.
  a "Story Worlds" category with one `book` value per source book) —
  nothing about any particular category name is hardcoded; whichever
  category is active, if any of its photos have a `book` value set, a
  secondary book-filter row appears automatically.
- An **abandoned-upload edge case** is a reasonable thing to know about: if
  a browser finishes uploading to Cloudinary but the tab closes before the
  Supabase metadata row is saved, that asset is orphaned (no metadata ever
  points at it). At personal-site scale this is rare and low-cost — check
  the Cloudinary dashboard's media library occasionally and delete anything
  under your upload folder with no corresponding photo in the admin grid;
  no automated reconciliation job is built for this.
- For SEO/social previews of `/photos`, add Open Graph tags to `index.html`
  `<head>` (title, description, and an OG image) — the site is a single HTML
  document, so these apply site-wide.
```
