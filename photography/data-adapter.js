/* =========================================================
   Photography section — DATA ADAPTER
   ---------------------------------------------------------
   A single async interface used by the whole feature so the
   storage backend is swappable:

     LocalAdapter    → browser localStorage (default, zero-config,
                       fully working, used for verification).
     SupabaseAdapter → calls the Netlify serverless functions,
                       which do server-side ADMIN_EMAIL auth and
                       talk to Supabase (Postgres + Storage) with
                       the private service-role key. Activate by
                       setting PhotographyConfig.backend='supabase'.

   Interface (all return Promises):
     getSettings()            → PhotographySettings
     saveSettings(patch)      → PhotographySettings   (admin)
     listAll()                → Photograph[]          (admin: incl. unpublished)
     listPublic()             → Photograph[]          (published only)
     create(photo)            → Photograph            (admin)
     update(id, patch)        → Photograph            (admin)
     remove(id)               → void                  (admin)
     saveLayout(items)        → void                  (admin) [{id,gridX,gridY,gridWidth,gridHeight,sortOrder}]
     uploadImage(file)        → {imageUrl, thumbnailUrl, highResolutionUrl,
                                 originalImageUrl, originalWidth, originalHeight} (admin)
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

  /* =======================================================
     LOCAL ADAPTER (default)
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
  LocalAdapter.prototype.create = function (photo) {
    var photos = this._readPhotos();
    var maxOrder = photos.reduce(function (m, p) { return Math.max(m, p.sortOrder || 0); }, 0);
    var rec = Object.assign({
      id: uid(),
      title: '', caption: '', altText: '', category: '',
      gridWidth: 1, gridHeight: 1, gridX: null, gridY: null,
      focalPointX: 0.5, focalPointY: 0.5,
      sortOrder: maxOrder + 1, isPublished: false, isSeed: false,
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
  LocalAdapter.prototype.uploadImage = function (file) {
    // Produce optimized display + thumbnail + "high-res" locally.
    return Promise.all([
      toWebp(file, 1600, 0.82),  // display / high-res
      toWebp(file, 480, 0.7)     // thumbnail
    ]).then(function (res) {
      var big = res[0], thumb = res[1];
      return {
        imageUrl: big.dataUrl,
        highResolutionUrl: big.dataUrl,
        originalImageUrl: big.dataUrl, // local mode keeps the largest processed copy
        thumbnailUrl: thumb.dataUrl,
        originalWidth: big.width,
        originalHeight: big.height
      };
    });
  };

  /* =======================================================
     SUPABASE ADAPTER (production — calls Netlify functions)
     Read paths hit Supabase directly via anon key + RLS
     (public may only read published rows). All WRITE paths go
     through Netlify functions that verify the admin email
     server-side. See netlify/functions + supabase/*.sql.
     ======================================================= */
  function SupabaseAdapter() {
    this.fnBase = CFG.functionsBase;
  }
  SupabaseAdapter.prototype._fn = function (name, opts) {
    opts = opts || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    var token = window.PhotographyAuth && window.PhotographyAuth.token();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(this.fnBase + '/' + name, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error(t || ('HTTP ' + r.status)); });
      return r.status === 204 ? null : r.json();
    });
  };
  SupabaseAdapter.prototype.getSettings = function () { return this._fn('photos-settings'); };
  SupabaseAdapter.prototype.saveSettings = function (patch) { return this._fn('photos-settings', { method: 'PUT', body: patch }); };
  SupabaseAdapter.prototype.listAll = function () { return this._fn('photos-list?scope=all'); };
  SupabaseAdapter.prototype.listPublic = function () { return this._fn('photos-list?scope=public'); };
  SupabaseAdapter.prototype.create = function (photo) { return this._fn('photos-write', { method: 'POST', body: { op: 'create', photo: photo } }); };
  SupabaseAdapter.prototype.update = function (id, patch) { return this._fn('photos-write', { method: 'POST', body: { op: 'update', id: id, patch: patch } }); };
  SupabaseAdapter.prototype.remove = function (id) { return this._fn('photos-write', { method: 'POST', body: { op: 'delete', id: id } }); };
  SupabaseAdapter.prototype.saveLayout = function (items) { return this._fn('photos-write', { method: 'POST', body: { op: 'layout', items: items } }); };
  SupabaseAdapter.prototype.uploadImage = function (file) {
    var self = this;
    // Read the file, hand raw bytes to the upload function (which stores
    // original + generated display/thumbnail in Supabase Storage).
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () {
        self._fn('photos-upload', {
          method: 'POST',
          body: { filename: file.name, contentType: file.type, dataBase64: String(fr.result).split(',')[1] }
        }).then(resolve, reject);
      };
      fr.onerror = function () { reject(new Error('Could not read file')); };
      fr.readAsDataURL(file);
    });
  };

  window.PhotographyData = (CFG.backend === 'supabase') ? new SupabaseAdapter() : new LocalAdapter();
  window.PhotographyData.backend = CFG.backend;
})();
