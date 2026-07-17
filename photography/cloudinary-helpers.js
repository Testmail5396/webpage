/* =========================================================
   Photography section — CLOUDINARY DELIVERY URL HELPERS
   ---------------------------------------------------------
   Pure functions, no dependencies. Everything is built from a
   stored `cloudinaryPublicId` at RENDER time — nothing is
   pre-generated or stored per-size (per-size URLs are cheap to
   construct and Cloudinary caches the actual transforms on its
   CDN, so storing them ourselves would be pure duplication).

   `cloudName` is NOT secret (it's part of every public delivery
   URL) — read directly from the public config value.
   ========================================================= */
(function () {
  function cloudName() {
    return (window.PhotographyConfig && window.PhotographyConfig.cloudinaryCloudName) || '';
  }

  // f_auto = automatic modern format (WebP/AVIF where supported)
  // q_auto = automatic quality/compression
  // c_limit = never upscale, only shrink to fit within the given width
  // g_auto = content-aware cropping, only meaningful when a fixed
  //          aspect crop (c_fill) is requested alongside a gravity hint
  function getCloudinaryUrl(publicId, opts) {
    if (!publicId) return '';
    opts = opts || {};
    var crop = opts.crop || 'limit';
    var parts = ['f_auto', 'q_auto', 'c_' + crop];
    if (opts.width) parts.push('w_' + Math.round(opts.width));
    if (opts.height) parts.push('h_' + Math.round(opts.height));
    if (crop === 'fill' && opts.gravity) parts.push('g_' + opts.gravity);
    parts.push('dpr_' + (opts.dpr || 'auto'));
    return 'https://res.cloudinary.com/' + cloudName() + '/image/upload/' + parts.join(',') + '/' + publicId;
  }

  // Builds a `srcset`-ready string: "url 320w, url 480w, ...".
  function getResponsiveSrcSet(publicId, widths, opts) {
    if (!publicId) return '';
    widths = widths || [320, 480, 640, 800, 1024, 1280, 1600];
    return widths.map(function (w) {
      return getCloudinaryUrl(publicId, Object.assign({}, opts, { width: w })) + ' ' + w + 'w';
    }).join(', ');
  }

  // Tiny, heavily blurred, near-instant-loading fill shown before the
  // real image arrives — a real (tiny) network request, not an inline
  // data URI, but small/blurred enough that it paints almost immediately.
  function getPlaceholderUrl(publicId) {
    if (!publicId) return '';
    return 'https://res.cloudinary.com/' + cloudName() + '/image/upload/f_auto,q_1,e_blur:1000,w_24/' + publicId;
  }

  // Used only when the fullscreen viewer opens — never in gallery cards.
  function getFullscreenUrl(publicId) {
    if (!publicId) return '';
    return getCloudinaryUrl(publicId, { width: 1920, crop: 'limit' });
  }

  window.CloudinaryHelpers = {
    getCloudinaryUrl: getCloudinaryUrl,
    getResponsiveSrcSet: getResponsiveSrcSet,
    getPlaceholderUrl: getPlaceholderUrl,
    getFullscreenUrl: getFullscreenUrl
  };
})();
