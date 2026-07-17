/* =========================================================
   Photography section — DATA ADAPTER
   ---------------------------------------------------------
   A single async interface used by the whole feature so the
   storage backend is swappable:

     LocalAdapter      → browser localStorage (default, zero-config,
                         fully working, used for verification). Only
                         ever used for temporary/demo data — never the
                         production image store.
     CloudinaryAdapter → metadata reads/writes go through the Netlify
                         serverless functions (server-side ADMIN_EMAIL
                         auth, talk to Supabase Postgres with the
                         private service-role key); image BINARIES are
                         stored/delivered by Cloudinary — a signed
                         upload grant lets the browser upload the
                         original directly to Cloudinary, which then
                         generates responsive/format-optimized variants
                         on the fly via delivery URL transforms (no
                         server-side image processing needed). Activate
                         with backend='cloudinary'. See README-photography.md.

   Interface (all return Promises):
     getSettings()            → PhotographySettings
     saveSettings(patch)      → PhotographySettings   (admin)
     listAll()                → Photograph[]          (admin: incl. unpublished)
     listPublic()             → Photograph[]          (published only)
     listPublicPage(cursor,limit,category) → {items,nextCursor,hasMore} (public; pagination)
     create(photo)            → Photograph            (admin)
     update(id, patch)        → Photograph            (admin)
     remove(id)               → void                  (admin)
     saveLayout(items)        → void                  (admin) [{id,gridX,gridY,gridWidth,gridHeight,sortOrder}]
     uploadImage(file, opts)  → {imageUrl, thumbnailUrl, highResolutionUrl,
                                 originalImageUrl, originalWidth, originalHeight,
                                 cloudinaryPublicId?, cloudinaryVersion?, secureUrl?,
                                 format?, bytes?, dominantColor?, aspectRatio?} (admin)
                                 opts: { onProgress(fraction), signal: AbortSignal }
     cleanupAssets(publicId)  → void (admin, best-effort, no-op if unsupported/absent)
   ========================================================= */
(function () {
  var CFG = window.PhotographyConfig;

  /* ---------- small helpers ---------- */
  function uid() {
    return 'p_' + Math.abs(hashStr(String(performance.now()) + ':' + Object.keys(localStorage).length)).toString(36) +
      '_' + (Object.keys(localStorage).length);
  }
  function hashStr(s) { var h = 0; for (var i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return h; }
  function nowISO() { return new Date().toISOString(); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* True for file types/extensions the browser's <img>/canvas pipeline
     cannot decode in most non-Safari browsers — HEIC/HEIF is the common
     real-world case (the default photo format on iPhones). Used only to
     make the failure message specific; decoding is still attempted
     regardless, since some browsers (Safari, some Android WebViews) can
     read it fine. */
  function looksUndecodable(file) {
    var type = (file.type || '').toLowerCase();
    var name = (file.name || '').toLowerCase();
    return /heic|heif/.test(type) || /\.hei[cf]$/.test(name);
  }

  /* Resize an uploaded File to a WebP data URL at a target max edge.
     This gives us "optimized display" + "thumbnail" images locally,
     mirroring what the server pipeline produces in production.
     Rejects with a SPECIFIC, user-facing reason (unsupported format vs.
     an unexpected processing error) instead of a generic failure, so the
     upload UI can tell the owner exactly what went wrong. */
  function toWebp(file, maxEdge, quality) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      var settled = false;
      img.onload = function () {
        if (settled) return;
        try {
          var w = img.naturalWidth, h = img.naturalHeight;
          if (!w || !h) throw new Error('Image has no readable dimensions');
          var scale = Math.min(1, maxEdge / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * scale));
          var ch = Math.max(1, Math.round(h * scale));
          var c = document.createElement('canvas');
          c.width = cw; c.height = ch;
          var ctx = c.getContext('2d');
          if (!ctx) throw new Error('Canvas not available for this image size');
          ctx.drawImage(img, 0, 0, cw, ch);
          var out;
          try { out = c.toDataURL('image/webp', quality); }
          catch (e) { out = c.toDataURL('image/jpeg', quality); }
          settled = true;
          URL.revokeObjectURL(url);
          resolve({ dataUrl: out, width: w, height: h });
        } catch (err) {
          settled = true;
          URL.revokeObjectURL(url);
          reject(new Error('Could not process "' + file.name + '": ' + err.message));
        }
      };
      img.onerror = function () {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        if (looksUndecodable(file)) {
          reject(new Error('"' + file.name + '" is a HEIC/HEIF photo — this browser can\'t open that format. Convert it to JPG or PNG first (or upload from an iPhone with "Automatic" format set to "Most Compatible" in Settings > Camera > Formats), then try again.'));
        } else {
          reject(new Error('"' + file.name + '" couldn\'t be opened as an image — the file may be corrupted or in an unsupported format. Try re-saving it as JPG or PNG.'));
        }
      };
      img.src = url;
    });
  }

  /* Client-side guard mirroring the server allowlist (netlify/functions/
     cloudinary-signature.js) — fails fast with a clear message instead of
     waiting on a round-trip for something we can already tell is wrong.
     The SERVER (and Cloudinary's own `allowed_formats` check against the
     real uploaded bytes) still validates independently; this is only a
     fast UX path. */
  var ALLOWED_UPLOAD_TYPES = { 'image/jpeg': 1, 'image/png': 1, 'image/webp': 1, 'image/avif': 1 };
  var MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

  /* =======================================================
     LOCAL ADAPTER (default — demo/dev only, never production images)
     ======================================================= */
  function LocalAdapter() {}
  LocalAdapter.prototype._readPhotos = function () {
    var raw = localStorage.getItem(CFG.storageKeys.photos);
    if (raw) { try { return JSON.parse(raw); } catch (e) {} }
    // First run → seed from placeholder data (deep copy so edits don't touch seed file)
    var seeded = clone(window.PhotographySeed.photos);
    this._writePhotos(seeded);
    return seeded;
  };
  LocalAdapter.prototype._writePhotos = function (photos) {
    try {
      localStorage.setItem(CFG.storageKeys.photos, JSON.stringify(photos));
    } catch (e) {
      throw new Error('Storage is full for this browser (local mode keeps photos in ' +
        'localStorage, which has a small size limit). Delete a few existing photos to ' +
        'free up space, or switch to cloud storage — see README-photography.md.');
    }
  };
  LocalAdapter.prototype.getSettings = function () {
    var raw = localStorage.getItem(CFG.storageKeys.settings);
    if (raw) { try { return Promise.resolve(JSON.parse(raw)); } catch (e) {} }
    var s = clone(window.PhotographySeed.settings);
    localStorage.setItem(CFG.storageKeys.settings, JSON.stringify(s));
    return Promise.resolve(s);
  };
  LocalAdapter.prototype.saveSettings = function (patch) {
    var self = this;
    return this.getSettings().then(function (s) {
      Object.assign(s, patch, { updatedAt: nowISO() });
      localStorage.setItem(CFG.storageKeys.settings, JSON.stringify(s));
      return s;
    });
  };
  LocalAdapter.prototype.listAll = function () {
    return Promise.resolve(this._readPhotos());
  };
  LocalAdapter.prototype.listPublic = function () {
    return Promise.resolve(this._readPhotos().filter(function (p) { return p.isPublished; }));
  };
  LocalAdapter.prototype.listPublicPage = function () {
    // Local mode never has enough rows to matter — return everything as one page.
    return this.listPublic().then(function (items) { return { items: items, nextCursor: null, hasMore: false }; });
  };
  LocalAdapter.prototype.create = function (photo) {
    var photos = this._readPhotos();
    var maxOrder = photos.reduce(function (m, p) { return Math.max(m, p.sortOrder || 0); }, 0);
    var rec = Object.assign({
      id: uid(),
      title: '', caption: '', altText: '', category: '', book: '',
      gridWidth: 1, gridHeight: 1, gridX: null, gridY: null,
      focalPointX: 0.5, focalPointY: 0.5, focalZoom: 1,
      sortOrder: maxOrder + 1, isPublished: false, featured: false, isSeed: false,
      createdAt: nowISO(), updatedAt: nowISO()
    }, photo);
    photos.push(rec);
    this._writePhotos(photos);
    return Promise.resolve(rec);
  };
  LocalAdapter.prototype.update = function (id, patch) {
    var photos = this._readPhotos();
    var rec = photos.find(function (p) { return p.id === id; });
    if (!rec) return Promise.reject(new Error('Photo not found'));
    Object.assign(rec, patch, { updatedAt: nowISO() });
    this._writePhotos(photos);
    return Promise.resolve(rec);
  };
  LocalAdapter.prototype.remove = function (id) {
    var photos = this._readPhotos().filter(function (p) { return p.id !== id; });
    this._writePhotos(photos);
    return Promise.resolve();
  };
  LocalAdapter.prototype.saveLayout = function (items) {
    var photos = this._readPhotos();
    var byId = {};
    photos.forEach(function (p) { byId[p.id] = p; });
    items.forEach(function (it) {
      var p = byId[it.id];
      if (!p) return;
      if (it.gridX != null) p.gridX = it.gridX;
      if (it.gridY != null) p.gridY = it.gridY;
      if (it.gridWidth != null) p.gridWidth = it.gridWidth;
      if (it.gridHeight != null) p.gridHeight = it.gridHeight;
      if (it.sortOrder != null) p.sortOrder = it.sortOrder;
      p.updatedAt = nowISO();
    });
    this._writePhotos(photos);
    return Promise.resolve();
  };
  LocalAdapter.prototype.uploadImage = function (file, opts) {
    opts = opts || {};
    if (opts.onProgress) opts.onProgress(0.1); // local processing is fast; a token milestone is enough
    // Produce optimized display + thumbnail + "high-res" locally.
    return Promise.all([
      toWebp(file, 1600, 0.82),  // display / high-res
      toWebp(file, 480, 0.7)     // thumbnail
    ]).then(function (res) {
      var big = res[0], thumb = res[1];
      if (opts.onProgress) opts.onProgress(1);
      return {
        imageUrl: big.dataUrl,
        highResolutionUrl: big.dataUrl,
        originalImageUrl: big.dataUrl, // local mode keeps the largest processed copy
        thumbnailUrl: thumb.dataUrl,
        originalWidth: big.width,
        originalHeight: big.height,
        aspectRatio: big.width / big.height,
        // No real Cloudinary asset in local mode — these stay null/absent
        // so bento-grid.js/lightbox.js fall back to the plain imageUrl path.
        cloudinaryPublicId: null, cloudinaryVersion: null, secureUrl: null,
        format: 'webp', bytes: null, dominantColor: null
      };
    });
  };
  LocalAdapter.prototype.cleanupAssets = function () { return Promise.resolve(); }; // nothing to clean up

  /* =======================================================
     REMOTE ADAPTER (shared base for Supabase- and R2-backed modes)
     ---------------------------------------------------------
     Metadata reads/writes are IDENTICAL regardless of where image
     BINARIES live — both proxy to the same Netlify functions, which
     do server-side ADMIN_EMAIL auth and talk to Supabase Postgres.
     Only `uploadImage()` (and R2's extra `cleanupAssets()`) differ
     by subclass. See netlify/functions + supabase/*.sql.
     ======================================================= */
  function RemoteAdapter() {
    this.fnBase = CFG.functionsBase;
  }
  RemoteAdapter.prototype._fn = function (name, opts) {
    opts = opts || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    var token = window.PhotographyAuth && window.PhotographyAuth.token();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(this.fnBase + '/' + name, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error(t || ('HTTP ' + r.status)); });
      return r.status === 204 ? null : r.json();
    });
  };
  RemoteAdapter.prototype.getSettings = function () { return this._fn('photos-settings'); };
  RemoteAdapter.prototype.saveSettings = function (patch) { return this._fn('photos-settings', { method: 'PUT', body: patch }); };
  RemoteAdapter.prototype.listAll = function () { return this._fn('photos-list?scope=all'); };
  RemoteAdapter.prototype.listPublic = function () { return this._fn('photos-list?scope=public'); };
  RemoteAdapter.prototype.listPublicPage = function (cursor, limit, category) {
    var q = 'photos-list?scope=public&limit=' + (limit || 60) +
      (cursor != null ? '&cursor=' + encodeURIComponent(cursor) : '') +
      (category && category !== 'All' ? '&category=' + encodeURIComponent(category) : '');
    return this._fn(q);
  };
  RemoteAdapter.prototype.create = function (photo) { return this._fn('photos-write', { method: 'POST', body: { op: 'create', photo: photo } }); };
  RemoteAdapter.prototype.update = function (id, patch) { return this._fn('photos-write', { method: 'POST', body: { op: 'update', id: id, patch: patch } }); };
  RemoteAdapter.prototype.remove = function (id) { return this._fn('photos-write', { method: 'POST', body: { op: 'delete', id: id } }); };
  RemoteAdapter.prototype.saveLayout = function (items) { return this._fn('photos-write', { method: 'POST', body: { op: 'layout', items: items } }); };
  // Best-effort: removes a PREVIOUS image's Cloudinary asset (used after a
  // successful "replace photo"). Failure here never blocks/reverts the
  // replace itself — the metadata row already points at the new asset.
  RemoteAdapter.prototype.cleanupAssets = function (publicId) {
    if (!publicId) return Promise.resolve();
    return this._fn('cloudinary-delete', { method: 'DELETE', body: { publicId: publicId } })
      .catch(function (e) { console.warn('[photography] asset cleanup failed (non-blocking):', e.message); });
  };

  /* =======================================================
     CLOUDINARY ADAPTER — images in Cloudinary, metadata in Supabase
     ---------------------------------------------------------
     Two-phase upload so the original never routes through a
     Netlify Function body:
       1. cloudinary-signature → admin-gated signed upload params
          (timestamp, signature, apiKey, cloudName, folder, publicId)
       2. browser POSTs the file DIRECTLY to Cloudinary as multipart
          FormData (XHR, so we get real byte-level progress + the
          ability to cancel mid-upload) — Cloudinary itself validates
          the real file bytes against the signed `allowed_formats`,
          so a spoofed Content-Type can't sneak in a disallowed format
       Cloudinary's own JSON response already has everything needed
       (secure_url, public_id, width, height, format, bytes, colors) —
       no second server round-trip / processing step is needed, unlike
       the R2 path this replaces.
     ======================================================= */
  function CloudinaryAdapter() { RemoteAdapter.call(this); }
  CloudinaryAdapter.prototype = Object.create(RemoteAdapter.prototype);
  CloudinaryAdapter.prototype.constructor = CloudinaryAdapter;

  // XHR + FormData POST directly to Cloudinary. Deliberately NOT reusing
  // this project's other XHR helper (used for a raw PUT elsewhere): a
  // multipart POST must NOT have Content-Type set manually (the browser
  // needs to add its own boundary), must NOT carry this app's own
  // Authorization header (wrong origin entirely), and the response body
  // is JSON that must be parsed (not just a status-code check).
  function uploadFormData(url, formData, opts) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.upload.onprogress = function (e) {
        if (opts.onProgress && e.lengthComputable) opts.onProgress(e.loaded / e.total);
      };
      xhr.onload = function () {
        var json;
        try { json = JSON.parse(xhr.responseText); } catch (e) { json = null; }
        if (xhr.status >= 200 && xhr.status < 300 && json) {
          resolve(json);
        } else {
          var msg = (json && json.error && json.error.message) || ('Upload failed (HTTP ' + xhr.status + ').');
          reject(new Error(msg));
        }
      };
      xhr.onerror = function () { reject(new Error('Network error while uploading — check your connection and try again.')); };
      xhr.onabort = function () { reject(new DOMException('Upload cancelled', 'AbortError')); };
      if (opts.signal) {
        if (opts.signal.aborted) { xhr.abort(); return; }
        opts.signal.addEventListener('abort', function () { xhr.abort(); });
      }
      xhr.send(formData);
    });
  }

  CloudinaryAdapter.prototype.uploadImage = function (file, opts) {
    var self = this;
    opts = opts || {};
    var onProgress = opts.onProgress || function () {};

    if (!ALLOWED_UPLOAD_TYPES[file.type]) {
      return Promise.reject(new Error('"' + file.name + '" is a ' + (file.type || 'unrecognized') + ' file — only JPEG, PNG, WebP, and AVIF photos are accepted.'));
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return Promise.reject(new Error('"' + file.name + '" is too large (max ' + Math.round(MAX_UPLOAD_BYTES / 1024 / 1024) + 'MB).'));
    }

    // Phase progress budget: 5% mint signature, 5-100% direct upload to
    // Cloudinary (the actual large transfer + Cloudinary's own processing
    // time before it responds).
    onProgress(0.02);
    return self._fn('cloudinary-signature', {
      method: 'POST',
      body: { filename: file.name, contentType: file.type, fileSize: file.size },
      signal: opts.signal
    }).then(function (grant) {
      onProgress(0.05);
      var formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', grant.apiKey);
      formData.append('timestamp', grant.timestamp);
      formData.append('signature', grant.signature);
      formData.append('public_id', grant.publicId);
      formData.append('folder', grant.folder);
      formData.append('overwrite', grant.overwrite);
      formData.append('colors', grant.colors);
      formData.append('allowed_formats', grant.allowed_formats);
      var uploadUrl = 'https://api.cloudinary.com/v1_1/' + grant.cloudName + '/image/upload';
      return uploadFormData(uploadUrl, formData, {
        signal: opts.signal,
        onProgress: function (frac) { onProgress(0.05 + frac * 0.95); }
      });
    }).then(function (res) {
      onProgress(1);
      var dominantColor = (res.colors && res.colors[0] && res.colors[0][0]) || null;
      return {
        imageUrl: window.CloudinaryHelpers.getCloudinaryUrl(res.public_id, { width: 1024 }),
        thumbnailUrl: window.CloudinaryHelpers.getCloudinaryUrl(res.public_id, { width: 320 }),
        highResolutionUrl: window.CloudinaryHelpers.getCloudinaryUrl(res.public_id, { width: 1600 }),
        originalImageUrl: res.secure_url,
        originalWidth: res.width,
        originalHeight: res.height,
        aspectRatio: res.width / res.height,
        cloudinaryPublicId: res.public_id,
        cloudinaryVersion: res.version,
        secureUrl: res.secure_url,
        format: res.format,
        bytes: res.bytes,
        dominantColor: dominantColor
      };
    });
  };

  window.PhotographyData =
    CFG.backend === 'cloudinary' ? new CloudinaryAdapter() :
    new LocalAdapter();
  window.PhotographyData.backend = CFG.backend;
})();
