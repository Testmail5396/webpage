/* =========================================================
   Photography section — ORCHESTRATOR
   ---------------------------------------------------------
   Wires the header, Bento grid, lightbox, admin toolbar and
   edit/upload dialogs together, and switches between the
   public (read-only) and admin (edit) experiences based on
   PhotographyAuth. Mounts into #photos-content in the
   existing site shell — no duplicate layout system.
   ========================================================= */
(function () {
  var CFG = window.PhotographyConfig;
  var DATA = window.PhotographyData;
  var AUTH = window.PhotographyAuth;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function icon(path, extra) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' + (extra || '') + '><path d="' + path + '"/></svg>';
  }

  /* Pick a default grid size that matches the PHOTO'S OWN orientation —
     portrait photos land in a portrait slot, landscape in a landscape
     slot, square-ish in a square slot — so object-fit:cover has to crop
     as little as possible. Only an occasional deliberate "Feature" pick
     (from the presets) makes a photo noticeably wider/taller than it
     naturally is; the automatic default never does that. */
  function pickGridForImage(w, h) {
    if (!w || !h) return { gridWidth: 3, gridHeight: 3 };
    var ar = w / h;
    if (ar < 0.85) return { gridWidth: 3, gridHeight: 4 }; // portrait
    if (ar > 1.2) return { gridWidth: 4, gridHeight: 3 };  // landscape
    return { gridWidth: 3, gridHeight: 3 };                // near-square
  }

  var P = {
    mounted: false,
    grid: null,
    lightbox: null,
    photos: [],
    settings: null,
    activeCategory: 'All',
    activeBook: null,
    featuredOnly: false,
    saveState: 'idle',
    saveTimer: null,
    uploadBatchIds: [], // photos created in the current Upload dialog session (for bulk update)
    activeUploadCount: 0,
    els: {}
  };

  /* ---------------- mount ---------------- */
  P.mount = function (container) {
    if (P.mounted) return;
    P.mounted = true;
    P.container = container;

    container.innerHTML =
      '<div class="pg-header">' +
      '  <div class="pg-header-main">' +
      '    <h1 class="pg-page-title"></h1>' +
      '    <p class="pg-page-desc"></p>' +
      '  </div>' +
      '  <div class="pg-filters" role="tablist" aria-label="Filter by category"></div>' +
      '  <div class="pg-book-filters" role="tablist" aria-label="Filter by book"></div>' +
      '</div>' +
      '<div class="pg-grid-wrap"><div class="pg-grid-mount"></div><div class="pg-load-more-sentinel" aria-hidden="true"></div></div>' +
      '<div class="pg-empty" hidden>No published photographs yet.</div>' +
      '<footer class="pg-footer" hidden><span class="pg-copyright"></span><span class="pg-social"></span></footer>';

    P.els.title = container.querySelector('.pg-page-title');
    P.els.desc = container.querySelector('.pg-page-desc');
    P.els.filters = container.querySelector('.pg-filters');
    P.els.bookFilters = container.querySelector('.pg-book-filters');
    P.els.gridMount = container.querySelector('.pg-grid-mount');
    P.els.empty = container.querySelector('.pg-empty');
    P.els.footer = container.querySelector('.pg-footer');
    P.els.copyright = container.querySelector('.pg-copyright');
    P.els.social = container.querySelector('.pg-social');
    P.els.sentinel = container.querySelector('.pg-load-more-sentinel');

    P.lightbox = window.createLightbox();
    buildToolbar();
    buildEditDialog();
    buildUploadDialog();
    buildSettingsDialog();
    buildMigrationDialog();

    AUTH.onChange(function () { refreshMode(); });
    wireLoadMoreObserver();

    // Deferred until the runtime config (Cloudinary cloud name, real
    // adminEmail) has arrived — in local mode CFG.ready resolves
    // immediately (no observable delay); in cloudinary mode this is
    // the tiny public-config fetch, strictly faster than the photo
    // list fetch that follows it.
    (CFG.ready || Promise.resolve()).then(load);
  };

  /* ---------------- progressive loading: "load more" on scroll ----------------
     Public (non-admin) view only — the admin view always loads the full
     catalog via listAll() since reordering/editing needs the complete set.
     A sentinel below the grid triggers the next page as it nears the
     viewport; pages only ever APPEND to the tail, which is safe for the
     deterministic first-fit packer (see bento-grid.js packedLayout()). */
  var PUBLIC_PAGE_SIZE = 60;

  function wireLoadMoreObserver() {
    if (!('IntersectionObserver' in window) || !P.els.sentinel) return;
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) loadMorePublic();
    }, { rootMargin: '600px 0px' });
    io.observe(P.els.sentinel);
  }

  function loadMorePublic() {
    if (AUTH.isAdmin() || !P.hasMorePublic || P.loadingMore) return;
    P.loadingMore = true;
    DATA.listPublicPage(P.nextCursor, PUBLIC_PAGE_SIZE).then(function (page) {
      P.loadingMore = false;
      var items = (page && page.items) || [];
      if (!items.length) { P.hasMorePublic = false; return; }
      P.photos = P.photos.concat(items);
      P.nextCursor = page ? page.nextCursor : null;
      P.hasMorePublic = !!(page && page.hasMore);
      renderGrid();
    }).catch(function (e) { P.loadingMore = false; console.error('[photography] load more failed', e); });
  }

  function load() {
    DATA.getSettings().then(function (s) {
      P.settings = s;
      renderProfile();
    });
    reloadPhotos();
  }

  function renderProfile() {
    var s = P.settings || {};
    P.els.title.textContent = s.title || 'Photography';
    P.els.desc.textContent = s.description || '';
    P.els.desc.style.display = s.description ? '' : 'none';
    // Subtle public footer: copyright + social links (only when present)
    var copy = s.copyrightText || '';
    P.els.copyright.textContent = copy;
    var links = (s.socialLinks || []).filter(function (l) { return l && l.url; });
    P.els.social.innerHTML = links.map(function (l) {
      return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label || l.url) + '</a>';
    }).join('');
    if (s.contactEmail) {
      P.els.social.innerHTML += '<a href="mailto:' + esc(s.contactEmail) + '">Email</a>';
    }
    P.els.footer.hidden = !(copy || links.length || s.contactEmail);
  }

  function reloadPhotos() {
    var admin = AUTH.isAdmin();
    P.nextCursor = null; P.hasMorePublic = false; P.loadingMore = false;
    if (admin) {
      return DATA.listAll().then(function (photos) {
        P.photos = photos || [];
        renderFilters(); renderGrid(); refreshMode();
      }).catch(function (e) { console.error('[photography] load failed', e); });
    }
    // Public view: fetch only the first page up front — additional pages
    // load as the visitor scrolls near the bottom (see loadMorePublic()).
    return DATA.listPublicPage(null, PUBLIC_PAGE_SIZE).then(function (page) {
      P.photos = (page && page.items) || [];
      P.nextCursor = page ? page.nextCursor : null;
      P.hasMorePublic = !!(page && page.hasMore);
      renderFilters(); renderGrid(); refreshMode();
    }).catch(function (e) { console.error('[photography] load failed', e); });
  }

  /* ---------------- grid ---------------- */
  function visiblePhotos() {
    var list = P.photos.slice();
    // Featured is a cross-category curated view (like a pseudo-category),
    // not combined with the regular category filter — avoids a confusing
    // "category AND featured" empty-intersection dead end.
    if (P.featuredOnly) {
      return list.filter(function (p) { return !!p.featured; });
    }
    if (P.activeCategory !== 'All') {
      list = list.filter(function (p) { return (p.category || 'Uncategorized') === P.activeCategory; });
      if (P.activeBook) {
        list = list.filter(function (p) { return (p.book || '').trim() === P.activeBook; });
      }
    }
    return list;
  }

  function renderGrid() {
    var list = visiblePhotos();
    var admin = AUTH.isAdmin();
    P.els.empty.hidden = list.length > 0 || admin;

    if (P.grid) P.grid.destroy();
    P.grid = window.createBentoGrid(P.els.gridMount, {
      photos: list,
      mode: admin ? 'edit' : 'public',
      columns: CFG.grid.columnsDesktop,
      gap: (P.settings && P.settings.defaultGridGap) || CFG.grid.gap,
      borderRadius: (P.settings && P.settings.defaultBorderRadius) || CFG.grid.borderRadius,
      showCaption: true,
      showCategory: true,
      lightbox: true,
      onOpenLightbox: function (photos, idx) { P.lightbox.open(photos, idx); },
      onSelectCard: function (photo) { /* selection ring handled by grid */ },
      onEditCard: function (photo) { openEditDialog(photo); },
      onDeleteCard: function (photo) { deletePhoto(photo); },
      onLayoutChange: function (items) { autosaveLayout(items); }
    });
  }

  function renderFilters() {
    var cats = {};
    P.photos.forEach(function (p) { if (p.category) cats[p.category] = true; });
    var catList = ['All'].concat(Object.keys(cats).sort());
    var anyFeatured = P.photos.some(function (p) { return !!p.featured; });

    if (catList.length <= 1 && !anyFeatured) {
      P.els.filters.innerHTML = ''; P.els.bookFilters.innerHTML = '';
      return;
    }

    var html = catList.map(function (c) {
      return '<button class="pg-filter' + (!P.featuredOnly && c === P.activeCategory ? ' active' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');
    // Cross-category curated view — only shown at all when at least one
    // photo is actually marked featured, so it's never a dead-end click.
    if (anyFeatured) {
      html += '<button class="pg-filter pg-filter-featured' + (P.featuredOnly ? ' active' : '') + '" data-featured="1">★ Featured</button>';
    }
    P.els.filters.innerHTML = html;

    Array.prototype.forEach.call(P.els.filters.querySelectorAll('.pg-filter'), function (b) {
      b.addEventListener('click', function () {
        if (b.hasAttribute('data-featured')) {
          P.featuredOnly = !P.featuredOnly;
          if (P.featuredOnly) P.activeCategory = 'All';
        } else {
          P.featuredOnly = false;
          P.activeCategory = b.getAttribute('data-cat');
        }
        P.activeBook = null; // switching category/featured invalidates any book sub-filter
        renderFilters(); renderGrid();
      });
    });

    renderBookFilters();
  }

  // Secondary filter row: distinct `book` values within the ACTIVE
  // category only, so switching categories never leaves a stale/invalid
  // book selected. Only appears when that category actually has any.
  function renderBookFilters() {
    var bookEl = P.els.bookFilters;
    if (P.featuredOnly || P.activeCategory === 'All') { bookEl.innerHTML = ''; return; }
    var books = {};
    P.photos.forEach(function (p) {
      var b = (p.book || '').trim();
      if (b && (p.category || 'Uncategorized') === P.activeCategory) books[b] = true;
    });
    var bookList = Object.keys(books).sort();
    if (!bookList.length) { bookEl.innerHTML = ''; return; }
    bookEl.innerHTML = ['All'].concat(bookList).map(function (b) {
      var isAll = b === 'All';
      var active = isAll ? !P.activeBook : P.activeBook === b;
      return '<button class="pg-filter pg-filter-sub' + (active ? ' active' : '') + '" data-book="' + esc(isAll ? '' : b) + '">' + esc(b) + '</button>';
    }).join('');
    Array.prototype.forEach.call(bookEl.querySelectorAll('.pg-filter'), function (btn) {
      btn.addEventListener('click', function () {
        P.activeBook = btn.getAttribute('data-book') || null;
        renderBookFilters(); renderGrid();
      });
    });
  }

  /* ---------------- mode switching ---------------- */
  function refreshMode() {
    var admin = AUTH.isAdmin();
    document.body.classList.toggle('pg-admin', admin);
    if (P.els.toolbar) P.els.toolbar.hidden = !admin;
    if (admin) refreshMigrateButtonVisibility();
    // If admin state changed relative to what grid shows, reload (public⇄all)
    var gridIsAdmin = P.grid && document.body.classList.contains('pg-admin-grid');
    if (admin !== gridIsAdmin) {
      document.body.classList.toggle('pg-admin-grid', admin);
      reloadPhotos();
    }
  }

  /* ---------------- toolbar ---------------- */
  function buildToolbar() {
    var t = document.createElement('div');
    t.className = 'pg-toolbar';
    t.hidden = true;
    t.innerHTML =
      '<span class="pg-save-state" data-state="idle"></span>' +
      '<div class="pg-toolbar-actions">' +
      '  <button class="pg-tbtn" data-act="add">' + icon('M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 3v12m0-12l-4 4m4-4l4 4') + '<span>Add Photos</span></button>' +
      '  <button class="pg-tbtn" data-act="preview">' + icon('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z M12 15a3 3 0 100-6 3 3 0 000 6z') + '<span>Preview</span></button>' +
      '  <button class="pg-tbtn" data-act="profile">' + icon('M12 12a4 4 0 100-8 4 4 0 000 8z M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6') + '<span>Profile</span></button>' +
      '  <button class="pg-tbtn" data-act="migrate" hidden>' + icon('M12 3v12m0 0l-4-4m4 4l4-4 M4 21h16') + '<span>Migrate to Cloud</span></button>' +
      '  <button class="pg-tbtn pg-tbtn-primary" data-act="save">' + icon('M5 13l4 4L19 7') + '<span>Save</span></button>' +
      '  <button class="pg-tbtn" data-act="logout">' + icon('M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9') + '<span>Logout</span></button>' +
      '</div>';
    document.body.appendChild(t);
    P.els.toolbar = t;
    P.els.saveState = t.querySelector('.pg-save-state');

    t.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]'); if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'add') openUploadDialog(true);
      else if (act === 'profile') openSettingsDialog();
      else if (act === 'migrate') openMigrationDialog();
      else if (act === 'preview') togglePreview(btn);
      else if (act === 'save') saveAll();
      else if (act === 'logout') AUTH.signOut();
    });
    setSaveState('idle');
  }

  /* ---------------- one-time local → cloud migration ----------------
     Only relevant once the backend has been switched away from 'local'
     (see config.js). Detects photos still holding base64 data URLs from
     an earlier local session, lets the admin pick which to upload to
     the active cloud backend, and removes ONLY the migrated entries'
     base64 data from localStorage afterward — never a silent fallback,
     never touching photos the admin didn't select. */
  function detectLegacyLocalPhotos() {
    try {
      var raw = localStorage.getItem(CFG.storageKeys.photos);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (p) { return p && typeof p.imageUrl === 'string' && p.imageUrl.indexOf('data:') === 0; });
    } catch (e) { return []; }
  }

  function refreshMigrateButtonVisibility() {
    var btn = P.els.toolbar && P.els.toolbar.querySelector('[data-act="migrate"]');
    if (!btn) return;
    btn.hidden = !(CFG.backend !== 'local' && detectLegacyLocalPhotos().length > 0);
  }

  var previewing = false;
  function togglePreview(btn) {
    previewing = !previewing;
    document.body.classList.toggle('pg-previewing', previewing);
    btn.classList.toggle('pg-tbtn-primary', false);
    // Preview = temporarily render public grid (published only, no controls)
    if (P.grid) P.grid.destroy();
    var list = P.photos.filter(function (p) { return !previewing ? true : p.isPublished; });
    P.grid = window.createBentoGrid(P.els.gridMount, {
      photos: previewing ? P.photos.filter(function (p) { return p.isPublished; }) : P.photos,
      mode: previewing ? 'public' : 'edit',
      columns: CFG.grid.columnsDesktop,
      gap: (P.settings && P.settings.defaultGridGap) || CFG.grid.gap,
      borderRadius: (P.settings && P.settings.defaultBorderRadius) || CFG.grid.borderRadius,
      onOpenLightbox: function (photos, idx) { P.lightbox.open(photos, idx); },
      onEditCard: function (photo) { openEditDialog(photo); },
      onDeleteCard: function (photo) { deletePhoto(photo); },
      onLayoutChange: function (items) { autosaveLayout(items); }
    });
    btn.querySelector('span').textContent = previewing ? 'Exit preview' : 'Preview';
  }

  function setSaveState(s) {
    P.saveState = s;
    if (!P.els.saveState) return;
    var labels = { idle: '', unsaved: 'Unsaved changes', saving: 'Saving…', saved: 'All changes saved', uploading: 'Uploading…', error: 'Save failed' };
    P.els.saveState.textContent = labels[s] || '';
    P.els.saveState.setAttribute('data-state', s);
  }

  /* ---------------- autosave ---------------- */
  function autosaveLayout(items) {
    setSaveState('unsaved');
    clearTimeout(P.saveTimer);
    P.saveTimer = setTimeout(function () {
      setSaveState('saving');
      DATA.saveLayout(items).then(function () {
        // reflect saved layout onto local photos
        items.forEach(function (it) {
          var p = P.photos.find(function (x) { return x.id === it.id; });
          if (p) { p.gridX = it.gridX; p.gridY = it.gridY; p.gridWidth = it.gridWidth; p.gridHeight = it.gridHeight; p.sortOrder = it.sortOrder; }
        });
        setSaveState('saved');
      }).catch(function (e) { console.error(e); setSaveState('error'); });
    }, 600);
  }

  function saveAll() {
    if (!P.grid) return;
    setSaveState('saving');
    var items = P.grid.getLayout();
    DATA.saveLayout(items)
      .then(function () { return P.settings ? DATA.saveSettings(P.settings) : null; })
      .then(function () { setSaveState('saved'); })
      .catch(function (e) { console.error(e); setSaveState('error'); });
  }

  /* ---------------- upload dialog ---------------- */
  function buildUploadDialog() {
    var d = makeDialog('pg-upload-dialog',
      '<h2 class="pg-dialog-title">Upload photographs</h2>' +
      '<div class="pg-dropzone" tabindex="0">' +
      icon('M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 3v12m0-12l-4 4m4-4l4 4', 'width="28" height="28"') +
      '<p>Drag &amp; drop photos here, or <button type="button" class="pg-link pg-choose">choose files</button></p>' +
      '<p class="pg-hint">JPG, PNG or WebP · select or drop as many at once as you like</p>' +
      '<input type="file" accept="image/*" multiple hidden class="pg-file-input">' +
      '</div>' +
      '<ul class="pg-upload-list"></ul>' +
      '<div class="pg-bulk-actions" hidden>' +
      '  <p class="pg-bulk-label">Bulk update — applies to all <span class="pg-bulk-count">0</span> photos uploaded just now</p>' +
      '  <div class="pg-bulk-row">' +
      '    <input type="text" class="pg-bulk-category" placeholder="Category (e.g. Travel)" list="pg-cat-list">' +
      '    <button type="button" class="pg-btn pg-btn-ghost pg-bulk-apply-cat">Apply to all</button>' +
      '  </div>' +
      '  <div class="pg-bulk-row">' +
      '    <button type="button" class="pg-btn pg-btn-primary pg-bulk-publish">Publish all</button>' +
      '    <button type="button" class="pg-btn pg-btn-ghost pg-bulk-unpublish">Unpublish all</button>' +
      '  </div>' +
      '  <p class="pg-bulk-msg" role="status"></p>' +
      '</div>' +
      '<div class="pg-dialog-actions"><button class="pg-btn pg-btn-ghost" data-close>Done</button></div>'
    );
    P.els.uploadDialog = d.root;
    var dz = d.root.querySelector('.pg-dropzone');
    var input = d.root.querySelector('.pg-file-input');
    var listEl = d.root.querySelector('.pg-upload-list');
    var bulkBox = d.root.querySelector('.pg-bulk-actions');
    var bulkCount = d.root.querySelector('.pg-bulk-count');
    var bulkMsg = d.root.querySelector('.pg-bulk-msg');

    function refreshBulkVisibility() {
      bulkBox.hidden = P.uploadBatchIds.length === 0;
      bulkCount.textContent = P.uploadBatchIds.length;
    }
    function bulkApply(patch, label) {
      if (!P.uploadBatchIds.length) return;
      bulkMsg.textContent = 'Applying…';
      setSaveState('saving');
      Promise.all(P.uploadBatchIds.map(function (id) { return DATA.update(id, patch); }))
        .then(function (recs) {
          recs.forEach(function (rec) {
            var p = P.photos.find(function (x) { return x.id === rec.id; });
            if (p) Object.assign(p, rec);
          });
          renderFilters(); renderGrid(); setSaveState('saved');
          bulkMsg.textContent = label + ' applied to ' + recs.length + ' photo' + (recs.length === 1 ? '' : 's') + '.';
        })
        .catch(function (e) { console.error(e); setSaveState('error'); bulkMsg.textContent = 'Failed — try again.'; });
    }
    d.root.querySelector('.pg-bulk-apply-cat').addEventListener('click', function () {
      var cat = d.root.querySelector('.pg-bulk-category').value.trim();
      if (!cat) { bulkMsg.textContent = 'Enter a category first.'; return; }
      bulkApply({ category: cat }, 'Category "' + cat + '"');
    });
    d.root.querySelector('.pg-bulk-publish').addEventListener('click', function () { bulkApply({ isPublished: true }, 'Publish'); });
    d.root.querySelector('.pg-bulk-unpublish').addEventListener('click', function () { bulkApply({ isPublished: false }, 'Unpublish'); });
    P.__refreshBulkVisibility = refreshBulkVisibility;
    P.els.uploadList = listEl;

    d.root.querySelector('.pg-choose').addEventListener('click', function () { input.click(); });
    dz.addEventListener('click', function (e) { if (e.target === dz) input.click(); });
    dz.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', function () { handleFiles(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('pg-drag-over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('pg-drag-over'); }); });
    dz.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files); });
  }

  function openUploadDialog() {
    P.els.uploadList.innerHTML = '';
    P.uploadBatchIds = []; // fresh batch each time the dialog opens
    P.activeUploadCount = 0;
    setUploadsActive(false);
    var bulkBox = P.els.uploadDialog.querySelector('.pg-bulk-actions');
    bulkBox.hidden = true;
    P.els.uploadDialog.querySelector('.pg-bulk-msg').textContent = '';
    P.els.uploadDialog.querySelector('.pg-bulk-category').value = '';
    showDialog(P.els.uploadDialog);
  }

  // Disabled while any upload is in flight so a second batch can't be
  // queued onto the same dialog session mid-upload (spec: "disable
  // repeated submission during an active upload").
  function setUploadsActive(active) {
    var d = P.els.uploadDialog;
    d.querySelector('.pg-dropzone').classList.toggle('pg-dropzone-busy', active);
    d.querySelector('.pg-choose').disabled = active;
    d.querySelector('.pg-file-input').disabled = active;
  }

  function handleFiles(files) {
    var arr = Array.prototype.slice.call(files);
    if (!arr.length) return;
    setSaveState('uploading');
    var done = 0, anyError = false;
    function checkDone() {
      if (done !== arr.length) return;
      setSaveState(anyError ? 'error' : (P.uploadBatchIds.length ? 'saved' : 'idle'));
    }
    arr.forEach(function (file) {
      var li = document.createElement('li');
      li.className = 'pg-upload-item';
      li.innerHTML = '<span class="pg-up-name">' + esc(file.name) + '</span>' +
        '<span class="pg-up-status">Uploading…</span>' +
        '<button type="button" class="pg-up-cancel" aria-label="Cancel upload for ' + esc(file.name) + '">&times;</button>' +
        '<span class="pg-up-bar"><i></i></span>';
      P.els.uploadList.appendChild(li);
      var bar = li.querySelector('.pg-up-bar i');
      var cancelBtn = li.querySelector('.pg-up-cancel');

      // Files the browser doesn't even report as an image (wrong file type
      // picked, or a non-image dropped alongside photos) — say so plainly
      // instead of silently dropping them from the list.
      if (!/^image\//.test(file.type)) {
        cancelBtn.remove();
        li.querySelector('.pg-up-status').textContent = 'Skipped — not an image file';
        li.classList.add('pg-up-fail');
        done++; checkDone();
        return;
      }

      P.activeUploadCount = (P.activeUploadCount || 0) + 1;
      setUploadsActive(true);
      var settled = false;
      var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      cancelBtn.addEventListener('click', function () { if (!settled && controller) controller.abort(); });
      if (!controller) cancelBtn.remove(); // no cancellation support (very old browser) — hide the control

      function settle() {
        settled = true;
        P.activeUploadCount = Math.max(0, (P.activeUploadCount || 1) - 1);
        if (P.activeUploadCount === 0) setUploadsActive(false);
        cancelBtn.remove();
      }

      DATA.uploadImage(file, {
        signal: controller && controller.signal,
        onProgress: function (frac) { bar.style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%'; }
      }).then(function (up) {
        var size = pickGridForImage(up.originalWidth, up.originalHeight);
        return DATA.create({
          imageUrl: up.imageUrl,
          thumbnailUrl: up.thumbnailUrl,
          highResolutionUrl: up.highResolutionUrl,
          originalImageUrl: up.originalImageUrl,
          originalWidth: up.originalWidth,
          originalHeight: up.originalHeight,
          cloudinaryPublicId: up.cloudinaryPublicId || null,
          cloudinaryVersion: up.cloudinaryVersion || null,
          secureUrl: up.secureUrl || null,
          format: up.format || null,
          bytes: up.bytes || null,
          dominantColor: up.dominantColor || null,
          aspectRatio: up.aspectRatio || null,
          altText: file.name.replace(/\.[^.]+$/, ''),
          fileName: file.name,
          gridWidth: size.gridWidth, gridHeight: size.gridHeight,
          isPublished: false, featured: false, book: ''
        });
      }).then(function (rec) {
        settle();
        bar.style.width = '100%';
        li.querySelector('.pg-up-status').textContent = 'Added (draft)';
        li.classList.add('pg-up-ok');
        P.photos.push(rec);
        P.uploadBatchIds.push(rec.id);
        if (P.__refreshBulkVisibility) P.__refreshBulkVisibility();
        done++;
        renderFilters(); renderGrid();
        checkDone();
      }).catch(function (e) {
        settle();
        var cancelled = e && e.name === 'AbortError';
        li.querySelector('.pg-up-status').textContent = cancelled ? 'Cancelled' : 'Failed';
        li.classList.add(cancelled ? 'pg-up-cancelled' : 'pg-up-fail');
        if (!cancelled) {
          console.error(e);
          anyError = true;
          var reason = document.createElement('span');
          reason.className = 'pg-up-reason';
          reason.textContent = e.message || 'Upload failed — unknown error.';
          li.appendChild(reason);
        }
        done++;
        checkDone();
      });
    });
  }

  /* ---------------- edit dialog ---------------- */
  function buildEditDialog() {
    var d = makeDialog('pg-edit-dialog',
      '<h2 class="pg-dialog-title">Edit photograph</h2>' +
      '<div class="pg-edit-grid">' +
      '  <div class="pg-focal">' +
      '    <div class="pg-focal-stage"><img class="pg-focal-img" alt=""><span class="pg-focal-dot"></span></div>' +
      '    <p class="pg-hint">Click the image to set the focal point — the preview shows exactly how it will crop.</p>' +
      '    <div class="pg-zoom-row"><span>Zoom</span><input type="range" class="pg-f-zoom" min="1" max="2.5" step="0.05"><span class="pg-zoom-val">100%</span></div>' +
      '    <div class="pg-edit-row"><button type="button" class="pg-btn pg-btn-ghost pg-crop-open">Crop</button> <button type="button" class="pg-btn pg-btn-ghost pg-replace">Replace photo</button><input type="file" accept="image/*" hidden class="pg-replace-input"></div>' +
      '  </div>' +
      '  <div class="pg-fields">' +
      '    <p class="pg-filename" title="File name"></p>' +
      '    <label class="pg-field"><span>Title</span><input type="text" class="pg-f-title" maxlength="120"></label>' +
      '    <label class="pg-field"><span>Caption</span><textarea class="pg-f-caption" rows="2" maxlength="280"></textarea></label>' +
      '    <label class="pg-field"><span>Category</span><input type="text" class="pg-f-category" list="pg-cat-list" maxlength="60"><datalist id="pg-cat-list"></datalist></label>' +
      '    <label class="pg-field"><span>Book <em>(optional — e.g. for a Story Worlds category)</em></span><input type="text" class="pg-f-book" list="pg-book-list" maxlength="80"><datalist id="pg-book-list"></datalist></label>' +
      '    <label class="pg-field"><span>Alt text <em>(for accessibility)</em></span><textarea class="pg-f-alt" rows="2" maxlength="280"></textarea></label>' +
      '    <label class="pg-field pg-field-inline"><input type="checkbox" class="pg-f-publish"><span>Published (visible to everyone)</span></label>' +
      '    <label class="pg-field pg-field-inline"><input type="checkbox" class="pg-f-featured"><span>★ Featured</span></label>' +
      '    <div class="pg-size-row"><span>Size preset</span><div class="pg-size-btns"></div></div>' +
      '  </div>' +
      '</div>' +
      '<div class="pg-dialog-actions">' +
      '  <button class="pg-btn pg-btn-danger pg-delete">Delete</button>' +
      '  <span class="pg-spacer"></span>' +
      '  <button class="pg-btn pg-btn-ghost" data-close>Cancel</button>' +
      '  <button class="pg-btn pg-btn-primary pg-save-photo">Save</button>' +
      '</div>'
    );
    P.els.editDialog = d.root;
    d.root.querySelector('.pg-size-btns').innerHTML = CFG.sizePresets.map(function (s) {
      return '<button type="button" class="pg-size-btn" data-w="' + s.w + '" data-h="' + s.h + '">' + esc(s.label) + '</button>';
    }).join('');
  }

  var editing = null;
  function openEditDialog(photo) {
    editing = photo;
    // Clear any stale "pending replace" marker from a previous session that
    // was cancelled without saving (so a genuinely new replace-then-save
    // this time around can't clean up the wrong/already-gone old asset).
    delete editing.__pendingOldPublicId;
    if (editing.focalZoom == null) editing.focalZoom = 1;
    var d = P.els.editDialog;
    d.querySelector('.pg-focal-img').src = photo.imageUrl;
    d.querySelector('.pg-filename').textContent = photo.fileName || '';
    d.querySelector('.pg-filename').style.display = photo.fileName ? '' : 'none';
    d.querySelector('.pg-f-title').value = photo.title || '';
    d.querySelector('.pg-f-caption').value = photo.caption || '';
    d.querySelector('.pg-f-category').value = photo.category || '';
    d.querySelector('.pg-f-book').value = photo.book || '';
    d.querySelector('.pg-f-alt').value = photo.altText || '';
    d.querySelector('.pg-f-publish').checked = !!photo.isPublished;
    d.querySelector('.pg-f-featured').checked = !!photo.featured;
    d.querySelector('.pg-f-zoom').value = editing.focalZoom;
    d.querySelector('.pg-zoom-val').textContent = Math.round(editing.focalZoom * 100) + '%';
    // category suggestions (settings categories + those already in use)
    var cats = {}; (P.settings && P.settings.categories || []).forEach(function (c) { cats[c] = true; });
    P.photos.forEach(function (p) { if (p.category) cats[p.category] = true; });
    d.querySelector('#pg-cat-list').innerHTML = Object.keys(cats).map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');
    // book suggestions (books already in use, across all categories)
    var books = {}; P.photos.forEach(function (p) { if (p.book) books[p.book.trim()] = true; });
    d.querySelector('#pg-book-list').innerHTML = Object.keys(books).map(function (b) { return '<option value="' + esc(b) + '">'; }).join('');
    syncPresetActive();
    syncFocalAspect();
    positionFocalDot();
    showDialog(d);
    wireEditDialogOnce();
  }

  function syncPresetActive() {
    var d = P.els.editDialog;
    Array.prototype.forEach.call(d.querySelectorAll('.pg-size-btn'), function (b) {
      b.classList.toggle('active', +b.dataset.w === editing.gridWidth && +b.dataset.h === editing.gridHeight);
    });
  }

  // Crop preview matches the ACTUAL card shape — so what you frame here
  // (focal point) is exactly what will show once placed in the grid.
  function syncFocalAspect() {
    var stage = P.els.editDialog.querySelector('.pg-focal-stage');
    var w = editing.gridWidth || 1, h = editing.gridHeight || 1;
    stage.style.aspectRatio = w + ' / ' + h;
  }

  // Live WYSIWYG crop preview: the stage image is positioned/scaled with
  // the EXACT same object-position + transform math the real grid card
  // uses (see bento-grid.js), so what's visible here is what will show —
  // no more "the important part got cropped out" surprises after saving.
  function positionFocalDot() {
    var d = P.els.editDialog;
    var dot = d.querySelector('.pg-focal-dot');
    var img = d.querySelector('.pg-focal-img');
    var xPct = editing.focalPointX * 100, yPct = editing.focalPointY * 100;
    dot.style.left = xPct + '%';
    dot.style.top = yPct + '%';
    img.style.objectPosition = xPct + '% ' + yPct + '%';
    img.style.transformOrigin = xPct + '% ' + yPct + '%';
    img.style.transform = editing.focalZoom && editing.focalZoom !== 1 ? 'scale(' + editing.focalZoom + ')' : '';
  }

  var editWired = false;
  function wireEditDialogOnce() {
    if (editWired) return; editWired = true;
    var d = P.els.editDialog;
    var stage = d.querySelector('.pg-focal-stage');
    stage.addEventListener('click', function (e) {
      var r = stage.getBoundingClientRect();
      editing.focalPointX = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      editing.focalPointY = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      positionFocalDot();
    });
    var zoomInput = d.querySelector('.pg-f-zoom');
    var zoomVal = d.querySelector('.pg-zoom-val');
    zoomInput.addEventListener('input', function () {
      editing.focalZoom = +zoomInput.value;
      zoomVal.textContent = Math.round(editing.focalZoom * 100) + '%';
      positionFocalDot();
    });
    Array.prototype.forEach.call(d.querySelectorAll('.pg-size-btn'), function (b) {
      b.addEventListener('click', function () {
        editing.gridWidth = +b.dataset.w; editing.gridHeight = +b.dataset.h;
        Array.prototype.forEach.call(d.querySelectorAll('.pg-size-btn'), function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        syncFocalAspect();
      });
    });
    // Shared by "Replace photo" and "Crop" — both end up swapping the
    // Cloudinary asset `editing` points at, so both need the exact same
    // field updates, old-asset bookkeeping, and crop reset.
    function applyReplacementUpload(up) {
      if (editing.__pendingOldPublicId === undefined) editing.__pendingOldPublicId = editing.cloudinaryPublicId || null;
      editing.imageUrl = up.imageUrl; editing.thumbnailUrl = up.thumbnailUrl;
      editing.highResolutionUrl = up.highResolutionUrl; editing.originalImageUrl = up.originalImageUrl;
      editing.originalWidth = up.originalWidth; editing.originalHeight = up.originalHeight;
      editing.cloudinaryPublicId = up.cloudinaryPublicId || null;
      editing.cloudinaryVersion = up.cloudinaryVersion || null;
      editing.secureUrl = up.secureUrl || null;
      editing.format = up.format || null;
      editing.bytes = up.bytes || null;
      editing.dominantColor = up.dominantColor || null;
      editing.aspectRatio = up.aspectRatio || null;
      // The new image (replaced OR freshly cropped) has a different
      // subject/composition than whatever the old focal point framed —
      // reset back to center/no-zoom rather than keep the old one.
      editing.focalPointX = 0.5; editing.focalPointY = 0.5; editing.focalZoom = 1;
      d.querySelector('.pg-focal-img').src = editing.imageUrl;
      d.querySelector('.pg-f-zoom').value = 1;
      d.querySelector('.pg-zoom-val').textContent = '100%';
      positionFocalDot();
      setSaveState('unsaved');
    }

    var replaceInput = d.querySelector('.pg-replace-input');
    d.querySelector('.pg-replace').addEventListener('click', function () { replaceInput.click(); });
    replaceInput.addEventListener('change', function () {
      var f = replaceInput.files[0]; replaceInput.value = '';
      if (!f) return;
      setSaveState('uploading');
      DATA.uploadImage(f).then(applyReplacementUpload)
        .catch(function (e) { console.error(e); setSaveState('error'); });
    });

    // Crop opens a dedicated free-form crop workspace (photography/
    // crop-editor.js — vanilla JS + Canvas, no React/bundler needed) on
    // the highest-resolution version of the current image, then uploads
    // the exported crop through the SAME path a fresh upload/replace
    // uses, so it becomes the new Cloudinary asset via applyReplacementUpload.
    d.querySelector('.pg-crop-open').addEventListener('click', function () {
      var src = editing.originalImageUrl || editing.secureUrl || editing.imageUrl;
      window.PhotographyCropEditor.open(src, { format: editing.format }).then(function (result) {
        if (!result) return; // cancelled
        setSaveState('uploading');
        var ext = result.blob.type === 'image/png' ? 'png' : 'jpg';
        var base = (editing.fileName || 'photo').replace(/\.[^.]+$/, '');
        var file = new File([result.blob], base + '-cropped.' + ext, { type: result.blob.type });
        return DATA.uploadImage(file).then(applyReplacementUpload);
      }).catch(function (e) { console.error(e); setSaveState('error'); });
    });
    d.querySelector('.pg-delete').addEventListener('click', function () {
      if (!editing) return;
      deletePhoto(editing, function () { hideDialog(d); });
    });
    d.querySelector('.pg-save-photo').addEventListener('click', function () {
      if (!editing) return;
      var oldPublicId = editing.__pendingOldPublicId; // set only if "Replace photo" was used this session
      var patch = {
        title: d.querySelector('.pg-f-title').value.trim(),
        caption: d.querySelector('.pg-f-caption').value.trim(),
        category: d.querySelector('.pg-f-category').value.trim(),
        book: d.querySelector('.pg-f-book').value.trim(),
        altText: d.querySelector('.pg-f-alt').value.trim(),
        isPublished: d.querySelector('.pg-f-publish').checked,
        featured: d.querySelector('.pg-f-featured').checked,
        fileName: editing.fileName,
        focalPointX: editing.focalPointX, focalPointY: editing.focalPointY,
        focalZoom: editing.focalZoom || 1,
        gridWidth: editing.gridWidth, gridHeight: editing.gridHeight,
        imageUrl: editing.imageUrl, thumbnailUrl: editing.thumbnailUrl,
        highResolutionUrl: editing.highResolutionUrl, originalImageUrl: editing.originalImageUrl,
        originalWidth: editing.originalWidth, originalHeight: editing.originalHeight,
        cloudinaryPublicId: editing.cloudinaryPublicId || null, cloudinaryVersion: editing.cloudinaryVersion || null,
        secureUrl: editing.secureUrl || null, format: editing.format || null, bytes: editing.bytes || null,
        dominantColor: editing.dominantColor || null, aspectRatio: editing.aspectRatio || null
      };
      setSaveState('saving');
      DATA.update(editing.id, patch).then(function (rec) {
        Object.assign(editing, rec);
        delete editing.__pendingOldPublicId;
        hideDialog(d); renderFilters(); renderGrid(); setSaveState('saved');
        // Best-effort cleanup of the REPLACED image's old asset — only
        // after the metadata row already points at the new one, and only
        // if the public id actually changed (not every save is a replace).
        if (oldPublicId && oldPublicId !== rec.cloudinaryPublicId && DATA.cleanupAssets) {
          DATA.cleanupAssets(oldPublicId);
        }
      }).catch(function (e) { console.error(e); setSaveState('error'); });
    });
  }

  // Shared delete flow — used by the edit dialog's Delete button AND the
  // quick delete icon that appears on card hover (grid mode).
  function deletePhoto(photo, onDone) {
    if (!window.confirm('Delete "' + (photo.title || photo.fileName || 'this photograph') + '"? This cannot be undone.')) return;
    setSaveState('saving');
    DATA.remove(photo.id).then(function () {
      P.photos = P.photos.filter(function (p) { return p.id !== photo.id; });
      renderFilters(); renderGrid(); setSaveState('saved');
      if (onDone) onDone();
    }).catch(function (e) { console.error(e); setSaveState('error'); });
  }

  /* ---------------- profile / page settings dialog ---------------- */
  function buildSettingsDialog() {
    var d = makeDialog('pg-settings-dialog',
      '<h2 class="pg-dialog-title">Profile &amp; page settings</h2>' +
      '<div class="pg-profile-row">' +
      '  <div class="pg-avatar-wrap"><img class="pg-avatar" alt=""><button type="button" class="pg-btn pg-btn-ghost pg-avatar-btn">Photo</button><input type="file" accept="image/*" hidden class="pg-avatar-input"></div>' +
      '  <div class="pg-profile-fields">' +
      '    <label class="pg-field"><span>Page title</span><input type="text" class="pg-s-title" maxlength="80"></label>' +
      '    <label class="pg-field"><span>Owner name</span><input type="text" class="pg-s-name" maxlength="80"></label>' +
      '  </div>' +
      '</div>' +
      '<label class="pg-field"><span>Description</span><textarea class="pg-s-desc" rows="2" maxlength="200"></textarea></label>' +
      '<label class="pg-field"><span>Bio</span><textarea class="pg-s-bio" rows="2" maxlength="300"></textarea></label>' +
      '<label class="pg-field"><span>Contact email</span><input type="email" class="pg-s-contact" maxlength="120"></label>' +
      '<label class="pg-field"><span>Categories <em>(comma separated)</em></span><input type="text" class="pg-s-cats" maxlength="240"></label>' +
      '<div class="pg-field"><span>Social links</span><div class="pg-social-list"></div>' +
      '  <button type="button" class="pg-link pg-add-social">+ Add link</button></div>' +
      '<label class="pg-field"><span>Copyright</span><input type="text" class="pg-s-copy" maxlength="120"></label>' +
      '<div class="pg-dialog-actions"><span class="pg-spacer"></span><button class="pg-btn pg-btn-ghost" data-close>Cancel</button><button class="pg-btn pg-btn-primary pg-s-save">Save</button></div>'
    );
    P.els.settingsDialog = d.root;
    var avatarInput = d.root.querySelector('.pg-avatar-input');
    d.root.querySelector('.pg-avatar-btn').addEventListener('click', function () { avatarInput.click(); });
    avatarInput.addEventListener('change', function () {
      var f = avatarInput.files[0]; avatarInput.value = '';
      if (!f) return;
      setSaveState('uploading');
      DATA.uploadImage(f).then(function (up) {
        d.root.querySelector('.pg-avatar').src = up.thumbnailUrl || up.imageUrl;
        d.root.querySelector('.pg-avatar').dataset.url = up.imageUrl;
        setSaveState('unsaved');
      }).catch(function (e) { console.error(e); setSaveState('error'); });
    });
    d.root.querySelector('.pg-add-social').addEventListener('click', function () { addSocialRow('', ''); });
    d.root.querySelector('.pg-s-save').addEventListener('click', function () {
      var links = [];
      Array.prototype.forEach.call(d.root.querySelectorAll('.pg-social-row'), function (row) {
        var label = row.querySelector('.pg-social-label').value.trim();
        var url = row.querySelector('.pg-social-url').value.trim();
        if (url) links.push({ label: label || url, url: url });
      });
      var cats = d.root.querySelector('.pg-s-cats').value.split(',').map(function (c) { return c.trim(); }).filter(Boolean);
      var avatar = d.root.querySelector('.pg-avatar');
      var patch = {
        title: d.root.querySelector('.pg-s-title').value.trim() || 'Photography',
        description: d.root.querySelector('.pg-s-desc').value.trim(),
        ownerName: d.root.querySelector('.pg-s-name').value.trim(),
        bio: d.root.querySelector('.pg-s-bio').value.trim(),
        contactEmail: d.root.querySelector('.pg-s-contact').value.trim(),
        copyrightText: d.root.querySelector('.pg-s-copy').value.trim(),
        profilePhotoUrl: avatar.dataset.url || P.settings.profilePhotoUrl || '',
        socialLinks: links,
        categories: cats
      };
      setSaveState('saving');
      DATA.saveSettings(patch).then(function (s) {
        P.settings = s; renderProfile(); hideDialog(d.root); setSaveState('saved');
      }).catch(function (e) { console.error(e); setSaveState('error'); });
    });
  }
  function addSocialRow(label, url) {
    var wrap = P.els.settingsDialog.querySelector('.pg-social-list');
    var row = document.createElement('div');
    row.className = 'pg-social-row';
    row.innerHTML = '<input type="text" class="pg-social-label" placeholder="Label (e.g. Instagram)" value="' + esc(label) + '">' +
      '<input type="url" class="pg-social-url" placeholder="https://…" value="' + esc(url) + '">' +
      '<button type="button" class="pg-icon-x" aria-label="Remove">&times;</button>';
    row.querySelector('.pg-icon-x').addEventListener('click', function () { row.remove(); });
    wrap.appendChild(row);
  }
  function openSettingsDialog() {
    var d = P.els.settingsDialog;
    var s = P.settings || {};
    d.querySelector('.pg-s-title').value = s.title || '';
    d.querySelector('.pg-s-name').value = s.ownerName || '';
    d.querySelector('.pg-s-desc').value = s.description || '';
    d.querySelector('.pg-s-bio').value = s.bio || '';
    d.querySelector('.pg-s-contact').value = s.contactEmail || '';
    d.querySelector('.pg-s-cats').value = (s.categories || []).join(', ');
    d.querySelector('.pg-s-copy').value = s.copyrightText || '';
    var avatar = d.querySelector('.pg-avatar');
    avatar.src = s.profilePhotoUrl || '';
    avatar.dataset.url = s.profilePhotoUrl || '';
    avatar.style.display = s.profilePhotoUrl ? '' : 'none';
    var list = d.querySelector('.pg-social-list'); list.innerHTML = '';
    (s.socialLinks || []).forEach(function (l) { addSocialRow(l.label, l.url); });
    showDialog(d);
  }

  /* ---------------- migration dialog (local → cloud, one-time) ---------------- */
  function buildMigrationDialog() {
    var d = makeDialog('pg-migrate-dialog',
      '<h2 class="pg-dialog-title">Migrate photos to cloud storage</h2>' +
      '<p class="pg-hint pg-migrate-intro"></p>' +
      '<div class="pg-migrate-toolbar">' +
      '  <button type="button" class="pg-btn pg-btn-ghost pg-migrate-backup">Download JSON backup</button>' +
      '  <button type="button" class="pg-link pg-migrate-selectall">Select all / none</button>' +
      '</div>' +
      '<ul class="pg-migrate-list"></ul>' +
      '<p class="pg-migrate-msg" role="status"></p>' +
      '<div class="pg-dialog-actions">' +
      '  <span class="pg-spacer"></span>' +
      '  <button class="pg-btn pg-btn-ghost" data-close>Close</button>' +
      '  <button class="pg-btn pg-btn-primary pg-migrate-start">Migrate selected</button>' +
      '</div>'
    );
    P.els.migrateDialog = d.root;
    d.root.querySelector('.pg-migrate-backup').addEventListener('click', downloadLegacyBackup);
    d.root.querySelector('.pg-migrate-selectall').addEventListener('click', function () {
      var boxes = d.root.querySelectorAll('.pg-migrate-item input[type="checkbox"]');
      var allChecked = boxes.length > 0 && Array.prototype.every.call(boxes, function (b) { return b.checked; });
      Array.prototype.forEach.call(boxes, function (b) { b.checked = !allChecked; });
    });
    d.root.querySelector('.pg-migrate-start').addEventListener('click', startMigration);
  }

  function downloadLegacyBackup() {
    var legacy = detectLegacyLocalPhotos();
    var blob = new Blob([JSON.stringify(legacy, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'photography-local-backup.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function openMigrationDialog() {
    var legacy = detectLegacyLocalPhotos();
    var d = P.els.migrateDialog;
    P.__legacyForMigration = legacy;
    d.querySelector('.pg-migrate-intro').textContent = legacy.length
      ? ('Found ' + legacy.length + ' photo' + (legacy.length === 1 ? '' : 's') + ' still stored locally in this browser. ' +
         'Download a backup first if you like, then pick which to upload to cloud storage — only the ones you migrate will be removed from local storage.')
      : 'No locally-stored photos were found in this browser — nothing to migrate.';
    var listEl = d.querySelector('.pg-migrate-list');
    listEl.innerHTML = legacy.map(function (p, i) {
      var thumb = p.thumbnailUrl || p.imageUrl;
      return '<li class="pg-migrate-item" data-idx="' + i + '">' +
        '<img class="pg-migrate-thumb" src="' + thumb + '" alt="">' +
        '<label class="pg-migrate-label"><input type="checkbox" checked> ' + esc(p.title || p.fileName || 'Untitled photo') + '</label>' +
        '<span class="pg-migrate-status"></span>' +
        '</li>';
    }).join('');
    d.querySelector('.pg-migrate-start').disabled = legacy.length === 0;
    d.querySelector('.pg-migrate-msg').textContent = '';
    showDialog(d);
  }

  // Re-creates a real File from a stored base64 data URL, uploads it
  // through the SAME uploadImage()/create() path a fresh upload would use,
  // and preserves the fields the spec calls out explicitly (title/caption/
  // category/order/focal point/published state).
  function migrateOnePhoto(legacyPhoto) {
    var srcUrl = legacyPhoto.originalImageUrl || legacyPhoto.imageUrl;
    return fetch(srcUrl).then(function (r) { return r.blob(); }).then(function (blob) {
      var fileName = legacyPhoto.fileName || ((legacyPhoto.title || 'photo').replace(/\s+/g, '-') + '.webp');
      var file = new File([blob], fileName, { type: blob.type || 'image/webp' });
      return DATA.uploadImage(file);
    }).then(function (up) {
      return DATA.create({
        imageUrl: up.imageUrl, thumbnailUrl: up.thumbnailUrl,
        highResolutionUrl: up.highResolutionUrl, originalImageUrl: up.originalImageUrl,
        originalWidth: up.originalWidth, originalHeight: up.originalHeight,
        cloudinaryPublicId: up.cloudinaryPublicId || null, cloudinaryVersion: up.cloudinaryVersion || null,
        secureUrl: up.secureUrl || null, format: up.format || null, bytes: up.bytes || null,
        dominantColor: up.dominantColor || null, aspectRatio: up.aspectRatio || null,
        title: legacyPhoto.title || '', caption: legacyPhoto.caption || '',
        altText: legacyPhoto.altText || '', category: legacyPhoto.category || '',
        book: legacyPhoto.book || '',
        fileName: legacyPhoto.fileName || '',
        gridWidth: legacyPhoto.gridWidth || 1, gridHeight: legacyPhoto.gridHeight || 1,
        focalPointX: legacyPhoto.focalPointX != null ? legacyPhoto.focalPointX : 0.5,
        focalPointY: legacyPhoto.focalPointY != null ? legacyPhoto.focalPointY : 0.5,
        focalZoom: legacyPhoto.focalZoom || 1,
        sortOrder: legacyPhoto.sortOrder || 0,
        isPublished: !!legacyPhoto.isPublished,
        featured: !!legacyPhoto.featured
      });
    });
  }

  function removeMigratedFromLocalStorage(migratedIds) {
    if (!migratedIds.length) return;
    try {
      var raw = localStorage.getItem(CFG.storageKeys.photos);
      if (!raw) return;
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;
      var idSet = {}; migratedIds.forEach(function (id) { idSet[id] = true; });
      var kept = arr.filter(function (p) { return !(p && idSet[p.id]); });
      localStorage.setItem(CFG.storageKeys.photos, JSON.stringify(kept));
    } catch (e) { console.warn('[photography] could not clean up migrated local data', e); }
  }

  function startMigration() {
    var legacy = P.__legacyForMigration || [];
    var d = P.els.migrateDialog;
    var items = Array.prototype.slice.call(d.querySelectorAll('.pg-migrate-item'));
    var selected = items.filter(function (li) { return li.querySelector('input[type="checkbox"]').checked; });
    if (!selected.length) { d.querySelector('.pg-migrate-msg').textContent = 'Select at least one photo first.'; return; }
    d.querySelector('.pg-migrate-start').disabled = true;
    d.querySelector('.pg-migrate-msg').textContent = 'Migrating…';

    var migratedIds = [], failedCount = 0;
    // Sequential, not parallel — keeps upload bandwidth/server load
    // predictable and status per-item easy to follow (this is a rare,
    // one-time admin action, not a latency-sensitive path).
    var chain = selected.reduce(function (chainPromise, li) {
      return chainPromise.then(function () {
        var legacyPhoto = legacy[+li.dataset.idx];
        var statusEl = li.querySelector('.pg-migrate-status');
        statusEl.textContent = 'Uploading…';
        return migrateOnePhoto(legacyPhoto).then(function (rec) {
          statusEl.textContent = 'Done';
          li.classList.add('pg-up-ok');
          migratedIds.push(legacyPhoto.id);
          P.photos.push(rec);
        }).catch(function (e) {
          console.error('[photography] migration failed for', legacyPhoto.id, e);
          statusEl.textContent = 'Failed';
          li.classList.add('pg-up-fail');
          failedCount++;
        });
      });
    }, Promise.resolve());

    chain.then(function () {
      renderFilters(); renderGrid();
      removeMigratedFromLocalStorage(migratedIds);
      d.querySelector('.pg-migrate-start').disabled = false;
      d.querySelector('.pg-migrate-msg').textContent =
        migratedIds.length + ' migrated' + (failedCount ? (', ' + failedCount + ' failed (left in place — try again)') : '') + '.';
      refreshMigrateButtonVisibility();
    });
  }

  /* ---------------- dialog primitives ---------------- */
  function makeDialog(cls, inner) {
    var root = document.createElement('div');
    root.className = 'pg-dialog ' + cls;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.hidden = true;
    root.innerHTML = '<div class="pg-dialog-backdrop" data-close></div><div class="pg-dialog-panel">' + inner + '</div>';
    document.body.appendChild(root);
    root.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) hideDialog(root); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !root.hidden) hideDialog(root); });
    return { root: root };
  }
  function showDialog(root) { root.hidden = false; requestAnimationFrame(function () { root.classList.add('pg-dialog-open'); }); document.body.classList.add('pg-lb-lock'); }
  function hideDialog(root) { root.classList.remove('pg-dialog-open'); document.body.classList.remove('pg-lb-lock'); setTimeout(function () { root.hidden = true; }, 180); }

  /* ---------------- routing hook ---------------- */
  P.onRoute = function (path) {
    var ownerRoute = (CFG.ownerRoutes || [CFG.adminRoute]).indexOf(path) !== -1;
    if (ownerRoute && !AUTH.isAdmin()) {
      // Prompt sign-in; if they don't become owner they simply stay on the
      // public gallery (unauthorized users are never shown edit controls).
      AUTH.signIn();
    }
  };

  // Owner login entry from the sidebar profile icon.
  P.ownerAction = function () {
    if (AUTH.isAdmin()) {
      // already owner → make sure we're on the gallery in edit mode
      if (window.location.pathname !== CFG.route) history.pushState({}, '', CFG.route);
    } else {
      AUTH.signIn();
    }
  };

  window.Photography = P;
})();
