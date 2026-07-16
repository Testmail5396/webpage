/* =========================================================
   Photography section — configuration
   ---------------------------------------------------------
   Single place to configure the photography feature.

   LOCAL mode (default): everything runs in the browser with
   localStorage — no backend, no keys. Owner sign-in falls back
   to a local email unlock so the feature stays fully runnable.

   PRODUCTION: set backend='supabase', add your Supabase values
   and a Google OAuth client id. Then sign-in uses real Google
   Identity Services and the Netlify functions verify the Google
   ID token server-side against the private ADMIN_EMAIL env var.
   The service-role / client secret NEVER live here — only in the
   server env (see README-photography.md + .env.example).
   ========================================================= */
(function () {
  window.PhotographyConfig = {
    /* Routes (match the site's /projects style). */
    route: '/photos',
    adminRoute: '/photos/admin',
    ownerRoutes: ['/photos/admin', '/admin', '/edit'],

    /* -------------------------------------------------------
       OWNER IDENTITY
       The one authorized owner. Used client-side ONLY for
       harmless UI decisions (showing the edit toolbar). Real
       authorization is enforced server-side in the Netlify
       function against the private ADMIN_EMAIL env var — never
       trust this value for security.
       ------------------------------------------------------- */
    adminEmail: 'vikashsri987@gmail.com',

    /* Public Google OAuth client id for Google Identity Services.
       Safe to expose. When empty, sign-in falls back to a local
       email+password unlock (dev). Set this to enable real Google Sign-In. */
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

    /* Data layer: 'local' | 'supabase'. */
    backend: 'local',

    /* Public Supabase values (safe to expose). Filled for prod. */
    supabaseUrl: '',
    supabaseAnonKey: '',

    /* Base path for the Netlify serverless functions (prod). */
    functionsBase: '/.netlify/functions',

    /* Bento grid — strict 8px system.
       15 columns on desktop, 6 on tablet, 2 on mobile.
       15 = 5 × 3: the default auto-sized Portrait/Square card (3 units
       wide) now tiles exactly 5-per-row on desktop instead of 4 (was
       12 = 4 × 3). Landscape (4) and Feature (6) don't divide evenly
       into 15 — that's normal for a Bento grid; the collision-aware
       packer fills the remainder with other cards each row, it never
       overlaps or leaves the grid broken. */
    grid: {
      columnsDesktop: 15,
      columnsTablet: 6,
      columnsMobile: 2,
      gap: 16,          // 8px unit × 2
      gapMobile: 8,
      borderRadius: 16, // --radius-lg
      rowUnit: 8        // base grid unit
    },

    /* Predefined card sizes (grid spans on the 12-col system).
       Kept short on purpose: uploads auto-size to match the photo's own
       orientation (see pickGridForImage in photography.js), so most photos
       never need a manual size change — these are just the few honest
       shapes a photo naturally comes in, plus one "Feature" for an
       occasional larger showcase image. */
    sizePresets: [
      { key: 'portrait',  label: 'Portrait',  w: 3, h: 4 },
      { key: 'square',    label: 'Square',    w: 3, h: 3 },
      { key: 'landscape', label: 'Landscape', w: 4, h: 3 },
      { key: 'feature',   label: 'Feature',   w: 6, h: 4 }
    ],

    /* localStorage keys (LOCAL mode persistence + drafts). */
    storageKeys: {
      photos: 'vphoto:photos:v2',
      settings: 'vphoto:settings:v2',
      admin: 'vphoto:admin:v2',
      draft: 'vphoto:draft:v2'
    }
  };
})();
