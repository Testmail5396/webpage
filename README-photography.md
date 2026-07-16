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

| Mode | `backend` | Storage | Auth | Setup |
|------|-----------|---------|------|-------|
| **Local** (default) | `'local'` | Browser `localStorage` | Local email unlock (dev) | **None** — works immediately |
| **Cloud** (production) | `'supabase'` | Supabase Postgres + Storage | **Google Sign-In** + server-side `ADMIN_EMAIL` | See below |

Owner email: **vikashsri987@gmail.com** (`ADMIN_EMAIL` on the server;
`adminEmail` in `photography/config.js` for UI gating).

Local mode is fully functional and is what ships working out of the box —
great for building/arranging the gallery. Switch to cloud mode when you want
real cloud uploads (no git push per photo), secure server-side authorization,
and images that persist across devices.

---

## File map

```
index.html                       ← 4th nav icon + #photos-content + script tags (only additions)
script.js                        ← /photos routing added (existing routes untouched)
photography/
  config.js                      ← route, admin email, backend switch, grid defaults
  seed-data.js                   ← 14 placeholder photos (DEMO only, clearly separated)
  data-adapter.js                ← LocalAdapter (default) + SupabaseAdapter
  auth.js                        ← Google Sign-In (GIS) + local unlock fallback
  bento-grid.js                  ← reusable createBentoGrid() engine
  lightbox.js                    ← accessible fullscreen viewer
  photography.js                 ← orchestrator (header, toolbar, dialogs)
  photography.css                ← styles (built on existing tokens)
netlify/functions/               ← production serverless API (admin-authorized)
  _lib.js, photos-list.js, photos-settings.js, photos-write.js, photos-upload.js
  package.json                   ← @supabase/supabase-js
supabase/
  schema.sql                     ← tables
  policies.sql                   ← RLS + storage policies
.env.example                     ← required env vars
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

There are exactly two modes: **Owner Edit** (only `vikashsri987@gmail.com`)
and **Public Read-Only** (everyone else).

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

### 3. Environment variables
Copy [`.env.example`](.env.example) and set the values in
**Netlify → Site settings → Environment variables**:
`ADMIN_EMAIL` (= `vikashsri987@gmail.com`), `GOOGLE_CLIENT_ID`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_BUCKET`
(and the `NEXT_PUBLIC_*` public copies used by the client).

### 4. Flip the switch
In `photography/config.js`:
```js
backend: 'supabase',
googleClientId: 'your-client-id.apps.googleusercontent.com',
supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
supabaseAnonKey: 'your-anon-key',
```

### 5. Deploy
Netlify auto-detects `netlify/functions/` and installs its `package.json`
deps. The existing `netlify.toml` (publish `.`, SPA rewrite) is unchanged;
`/.netlify/functions/*` is reserved by Netlify and is not affected by the SPA
rewrite. Test locally with `netlify dev`.

---

## Security model

- **Public** may only read **published** rows and the settings row (enforced by
  Supabase RLS, not just the UI).
- **All writes** (create/update/delete/reorder/resize/settings/upload) go
  through the Netlify functions, which `await requireAdmin(event)` **before**
  any DB/storage access — cryptographically verifying the Google ID token
  (signature + expiry + audience `GOOGLE_CLIENT_ID`) and requiring the email to
  equal `ADMIN_EMAIL`. Only the service-role key (server-only) can write.
- The **service-role key is never exposed** to the browser.
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
   or switch to Supabase/cloud mode (no such limit — see above).

Non-image files dropped into the upload dialog are now labeled "Skipped —
not an image file" instead of silently vanishing from the list.

---

## Notes / optional upgrades

- Display/thumbnail/high-res variants in cloud mode use Supabase's on-the-fly
  image transformation (`render/image` endpoint) so the original is stored once
  and never altered. To also compute real pixel dimensions or pre-generate
  WebP/AVIF at upload time, add [`sharp`](https://sharp.pixelplumbing.com/) to
  `netlify/functions/package.json` and process the buffer in `photos-upload.js`.
- Local mode downscales uploads to WebP in-browser (via canvas) so they fit in
  `localStorage`; very large libraries should use cloud mode.
- For SEO/social previews of `/photos`, add Open Graph tags to `index.html`
  `<head>` (title, description, and an OG image) — the site is a single HTML
  document, so these apply site-wide.
```
