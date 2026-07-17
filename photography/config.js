/* =========================================================
   Photography section — configuration
   ---------------------------------------------------------
   Single place to configure the photography feature.

   LOCAL mode (default): everything runs in the browser with
   localStorage — no backend, no keys, no network calls at all.
   Owner sign-in falls back to a local email unlock (checked against
   `localDevOwnerEmail` below, NOT the real production owner email)
   so the feature stays fully runnable with zero setup.

   PRODUCTION: set backend='cloudinary'. Real values (owner email,
   Google OAuth client id, Cloudinary cloud name) are NEVER hardcoded
   here — Netlify's secret scanner fails the build if a configured
   environment variable's value appears in any deployed file, even
   values that are otherwise safe to expose to the browser. Instead
   they're fetched at runtime from a public (unauthenticated, no
   secrets) Netlify Function — see `loadRuntimeConfig()` below and
   `netlify/functions/public-config.js`. The API secret / service-role
   key NEVER leave the server at all, runtime-fetched or otherwise —
   see README-photography.md + .env.example. Supabase Postgres stores
   gallery METADATA only; Cloudinary stores and delivers the image
   BINARIES (permanent storage, automatic format/quality optimization,
   on-the-fly responsive transforms).
   ========================================================= */
(function () {
  var CFG = window.PhotographyConfig = {
    /* Routes (match the site's /projects style). */
    route: '/photos',
    adminRoute: '/photos/admin',
    ownerRoutes: ['/photos/admin', '/admin', '/edit'],

    /* -------------------------------------------------------
       OWNER IDENTITY
       `adminEmail` is used client-side ONLY for harmless UI
       decisions (showing the edit toolbar). Real authorization is
       enforced server-side in the Netlify functions against the
       private ADMIN_EMAIL env var — never trust this value for
       security. Starts empty; filled in at runtime for production
       (see loadRuntimeConfig() below) — never committed as a literal
       value, so Netlify's secret scanner has nothing to flag.

       `localDevOwnerEmail` is a fixed, harmless placeholder used ONLY
       by the local-mode dev password fallback below — intentionally
       NOT the real owner email, and never fetched from anywhere, so
       local mode keeps its "zero setup, no keys, no network calls"
       promise even in production-configured deployments.
       ------------------------------------------------------- */
    adminEmail: '',
    localDevOwnerEmail: 'owner@localhost.test',

    /* Public Google OAuth client id for Google Identity Services.
       Starts empty; filled in at runtime for production. When empty,
       sign-in falls back to the local email+password unlock (dev). */
    googleClientId: '',

    /* -------------------------------------------------------
       LOCAL-MODE PASSWORD GATE (fallback sign-in only)
       SHA-256 hash of the owner's chosen dev-mode password — never
       the plaintext, so it isn't sitting in the open in this file.
       This is STILL only a convenience gate, not real security: this
       file is public (shipped to every visitor's browser), so anyone
       could brute-force the hash offline or just read the check in
       auth.js and bypass it via devtools. It only stops a casual
       visitor from guessing their way in — it is NOT a substitute for
       the real protection, which is Google Sign-In + the server-side
       ADMIN_EMAIL check in the Netlify functions (production mode).
       ------------------------------------------------------- */
    ownerPasswordHash: 'c22d38f53f4ad9435a64bb51b5093f48574b70cb2399d8ade9ed0f21c3fcff1a',

    /* Data layer: 'local' | 'cloudinary'.
       'local'      → localStorage, demo/dev only, never production images.
       'cloudinary' → Cloudinary for image storage/delivery (production —
                      see README-photography.md → "Cloudinary setup"). */
    backend: 'cloudinary',

    /* Public Cloudinary cloud name (safe to expose — it's part of every
       delivery URL). Starts empty; filled in at runtime for production
       (see loadRuntimeConfig() below). */
    cloudinaryCloudName: '',

    /* Base path for the Netlify serverless functions (prod). */
    functionsBase: '/.netlify/functions',

    /* Bento grid — strict 8px system.
       15 columns on desktop, 6 on tablet, and THREE mobile tiers so more
       photos are visible per screen instead of one giant full-width
       image: 4 on wider phones (540–768px), 3 on regular phones
       (360–540px), 2 on very small screens (≤360px) — see
       bento-grid.js → currentColumns(). 15 = 5 × 3: the default
       auto-sized Portrait/Square card (3 units wide) now tiles exactly
       5-per-row on desktop instead of 4 (was 12 = 4 × 3). Landscape (4)
       and Feature (6) don't divide evenly into 15 — that's normal for a
       Bento grid; the collision-aware packer fills the remainder with
       other cards each row, it never overlaps or leaves the grid
       broken. On mobile, card spans are rescaled proportionally to the
       much smaller column count instead of reusing these desktop-
       relative numbers verbatim — see bento-grid.js → effectiveSpan(). */
    grid: {
      columnsDesktop: 15,
      columnsTablet: 6,        // 768–1024px
      columnsMobileWide: 4,    // 540–768px — wider phones/phablets
      columnsMobile: 3,        // 360–540px — regular phones
      columnsMobileSmall: 2,   // ≤360px — very small screens
      gap: 16,          // 8px unit × 2
      gapMobile: 8,
      borderRadius: 16, // --radius-lg
      rowUnit: 8        // base grid unit
    },

    /* Predefined card sizes (grid spans on the 15-col desktop system).
       Kept short on purpose: uploads auto-size to match the photo's own
       orientation (see pickGridForImage in photography.js), so most photos
       never need a manual size change — these are just the few honest
       shapes a photo naturally comes in, plus "Feature"/"Panorama" for an
       occasional larger showcase image. `key` doubles as the lookup used
       by bento-grid.js's mobile column-span table (presetKeyFor) — keep
       it in sync with MOBILE_TYPE_SPAN/MOBILE_TYPE_HEIGHT there if this
       list changes. Panorama's 9:3 = 3:1, matching the crop editor's own
       "Panorama 3:1" aspect preset. */
    sizePresets: [
      { key: 'portrait',       label: 'Portrait',       w: 3, h: 4 },
      { key: 'square',         label: 'Square',         w: 3, h: 3 },
      { key: 'landscape',      label: 'Landscape',      w: 4, h: 3 },
      { key: 'wide-landscape', label: 'Wide Landscape', w: 6, h: 3 },
      { key: 'feature',        label: 'Feature',        w: 6, h: 4 },
      { key: 'panorama',       label: 'Panorama',       w: 9, h: 3 }
    ],

    /* localStorage keys (LOCAL mode persistence + drafts). */
    storageKeys: {
      photos: 'vphoto:photos:v2',
      settings: 'vphoto:settings:v2',
      admin: 'vphoto:admin:v2',
      draft: 'vphoto:draft:v2'
    }
  };

  /* Local mode needs zero setup and makes zero network calls, by
     design — resolve immediately. Cloudinary mode fetches the public
     (non-secret) runtime values that Google Sign-In and Cloudinary URL
     building depend on; auth.js/photography.js await this before doing
     anything that needs them (see their own comments). A failure here
     is logged, not thrown — the public gallery itself doesn't need
     these values, only owner sign-in and admin uploads do. */
  CFG.ready = CFG.backend !== 'cloudinary' ? Promise.resolve() :
    fetch(CFG.functionsBase + '/public-config')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (pub) { Object.assign(CFG, pub); })
      .catch(function (e) {
        console.error('[photography] could not load runtime config — owner sign-in will not work until this succeeds.', e);
      });
})();
