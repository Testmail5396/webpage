/* =========================================================
   Photography section — BENTO GRID ENGINE (reusable)
   ---------------------------------------------------------
   A controlled CSS-Grid Bento layout with:
     - fixed unit grid (responsive column counts)
     - collision-aware first-fit packing (no overlap, gaps
       minimized automatically)
     - drag to reorder (edit mode) with live reflow
     - card size changes only via the fixed quicksize presets
       (Portrait/Square/Landscape/Feature) — no free-form resize
     - persisted layout = order + card sizes (x/y derived so
       responsive breakpoints always produce a valid layout)

   Layout strategy note: positions are packed from card ORDER
   + SIZE. Dragging reorders; the grid repacks so cards never
   overlap and empty space is minimized — the Bento.me feel —
   and the same order/size reproduce the layout at any column
   count (desktop/tablet/mobile). This is why gridX/gridY are
   computed, while order + w/h are the source of truth we save.

   Public factory (framework-free, drop-in on any page):
     createBentoGrid(container, {
       photos, mode:'public'|'edit',
       columns, gap, borderRadius, maxWidth,
       showCaption, showCategory, lightbox,
       onOpenLightbox(photo, index),
       onSelectCard(photo|null),
       onEditCard(photo),
       onLayoutChange(layoutItems),   // [{id,gridX,gridY,gridWidth,gridHeight,sortOrder}]
     }) → api { setPhotos, setMode, getLayout, relayout, selectCard, destroy }
   ========================================================= */
(function () {
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function createBentoGrid(container, opts) {
    opts = opts || {};
    var state = {
      photos: (opts.photos || []).slice(),
      mode: opts.mode || 'public',
      columns: opts.columns || 6,
      gap: opts.gap != null ? opts.gap : 16,
      radius: opts.borderRadius != null ? opts.borderRadius : 16,
      showCaption: opts.showCaption !== false,
      showCategory: opts.showCategory !== false,
      lightbox: opts.lightbox !== false,
      selectedId: null,
      draggingId: null,   // card currently being pointer-dragged (excluded from settle-FLIP)
      resizingId: null,   // card currently being resized (excluded from settle-FLIP)
      rendered: false,    // becomes true after the first render (skip FLIP on initial mount)
      cellSize: 200,
      cols: opts.columns || 6,
      cards: {}   // id → element
    };

    container.classList.add('pg-grid');
    if (opts.maxWidth) container.style.maxWidth = (typeof opts.maxWidth === 'number' ? opts.maxWidth + 'px' : opts.maxWidth);
    container.style.setProperty('--pg-gap', state.gap + 'px');
    container.style.setProperty('--pg-radius', state.radius + 'px');

    /* ---------- responsive column count ---------- */
    function currentColumns() {
      var w = window.innerWidth;
      if (w <= 640) return window.PhotographyConfig.grid.columnsMobile;
      if (w <= 1024) return window.PhotographyConfig.grid.columnsTablet;
      return state.columns;
    }

    /* ---------- packing ---------- */
    function packedLayout() {
      var cols = state.cols;
      var items = state.photos.slice().sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
      var grid = [];
      function free(x, y, w, h) {
        if (x + w > cols) return false;
        for (var yy = y; yy < y + h; yy++)
          for (var xx = x; xx < x + w; xx++)
            if (grid[yy] && grid[yy][xx]) return false;
        return true;
      }
      function occupy(x, y, w, h) {
        for (var yy = y; yy < y + h; yy++) {
          if (!grid[yy]) grid[yy] = [];
          for (var xx = x; xx < x + w; xx++) grid[yy][xx] = true;
        }
      }
      var maxRow = 0;
      var out = items.map(function (p) {
        var w = clamp(p.gridWidth || 1, 1, cols);
        var h = clamp(p.gridHeight || 1, 1, 8);
        var placed = false, x = 0, y = 0;
        for (y = 0; y < 2000 && !placed; y++) {
          for (x = 0; x <= cols - w; x++) {
            if (free(x, y, w, h)) { occupy(x, y, w, h); placed = true; break; }
          }
        }
        y = placed ? y - 1 : 0;
        maxRow = Math.max(maxRow, y + h);
        return { id: p.id, x: x, y: y, w: w, h: h, photo: p };
      });
      return { items: out, rows: maxRow };
    }

    /* ---------- sizing ---------- */
    function recalcCell() {
      state.cols = currentColumns();
      // Tighter gap on mobile per the 8px system.
      var g = window.PhotographyConfig.grid;
      state.gap = (window.innerWidth <= 640 && g.gapMobile != null) ? g.gapMobile : (opts.gap != null ? opts.gap : 16);
      container.style.setProperty('--pg-gap', state.gap + 'px');
      var inner = container.clientWidth;
      var cw = (inner - state.gap * (state.cols - 1)) / state.cols;
      state.cellSize = Math.max(24, cw);
      container.style.gridTemplateColumns = 'repeat(' + state.cols + ', 1fr)';
      container.style.gridAutoRows = state.cellSize + 'px';
    }

    /* Approximate rendered-width hints for the `sizes` attribute — the
       exact pixel width varies with how many grid units a card spans,
       but `sizes` only needs to be roughly right for the browser to
       pick a sensibly-close srcset candidate, not pixel-perfect. */
    var SIZES_HINT = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw';
    // Cloudinary generates every one of these widths on the fly from a
    // single stored public_id (see cloudinary-helpers.js) — nothing is
    // pre-generated/stored per-size, so the full spec-suggested list is
    // cheap to offer (more responsive granularity than the old 4-variant
    // R2 scheme, for free).
    var RESPONSIVE_WIDTHS = [320, 480, 640, 800, 1024, 1280, 1600];

    /* ---------- rendering ---------- */
    function buildCard(photo, isPriority) {
      var el = document.createElement('div');
      el.className = 'pg-card';
      el.setAttribute('data-id', photo.id);
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', photo.altText || photo.title || 'Photograph');

      var media = document.createElement('div');
      media.className = 'pg-card-media';

      // Instant fill so there's never a blank/white card before the real
      // image arrives: a tiny blurred Cloudinary placeholder if we have a
      // cloudinaryPublicId, else a flat dominant-color tint, else the
      // original shimmering skeleton (local/seed records with neither).
      if (photo.cloudinaryPublicId) {
        var ph = document.createElement('img');
        ph.className = 'pg-placeholder';
        ph.alt = ''; ph.setAttribute('aria-hidden', 'true');
        ph.src = window.CloudinaryHelpers.getPlaceholderUrl(photo.cloudinaryPublicId);
        media.appendChild(ph);
      } else {
        var sk = document.createElement('div');
        sk.className = 'pg-skeleton';
        if (photo.dominantColor) { sk.style.animation = 'none'; sk.style.background = photo.dominantColor; }
        media.appendChild(sk);
      }

      var img = document.createElement('img');
      img.className = 'pg-img';
      // The very first card (feature/top of sort order) loads eagerly at
      // high priority — everything else stays lazy. Never preload the
      // whole gallery, only this one above-the-fold image.
      img.loading = isPriority ? 'eager' : 'lazy';
      if (isPriority) img.setAttribute('fetchpriority', 'high');
      img.decoding = 'async';
      img.alt = photo.altText || '';
      if (photo.cloudinaryPublicId) {
        // Responsive srcset built from Cloudinary width transforms —
        // mobile never downloads the desktop-sized file, and high-DPI
        // screens can still pick a larger candidate without ALWAYS
        // loading the largest size.
        img.srcset = window.CloudinaryHelpers.getResponsiveSrcSet(photo.cloudinaryPublicId, RESPONSIVE_WIDTHS);
        img.sizes = SIZES_HINT;
        img.src = window.CloudinaryHelpers.getCloudinaryUrl(photo.cloudinaryPublicId, { width: 1024 }); // fallback for browsers ignoring srcset
      } else {
        img.src = photo.imageUrl; // local/legacy records: single image, unchanged behavior
      }
      var fx = (photo.focalPointX != null ? photo.focalPointX : 0.5) * 100;
      var fy = (photo.focalPointY != null ? photo.focalPointY : 0.5) * 100;
      img.style.objectPosition = fx + '% ' + fy + '%';
      // Zoom is applied via a CSS custom property (not a direct inline
      // transform) so it composes with the existing hover-zoom rule in
      // photography.css instead of an inline style silently overriding it.
      var zoom = photo.focalZoom || 1;
      if (zoom !== 1) {
        img.style.transformOrigin = fx + '% ' + fy + '%';
        img.style.setProperty('--pg-focal-zoom', zoom);
      }
      img.addEventListener('load', function () { el.classList.add('pg-loaded'); });
      img.addEventListener('error', function () { el.classList.add('pg-loaded', 'pg-error'); });
      media.appendChild(img);
      el.appendChild(media);

      // Caption / category overlay (public + preview)
      if ((state.showCaption && (photo.title || photo.caption)) || (state.showCategory && photo.category)) {
        var ov = document.createElement('div');
        ov.className = 'pg-card-meta';
        var inner = '';
        if (state.showCategory && photo.category) inner += '<span class="pg-cat">' + esc(photo.category) + '</span>';
        if (state.showCaption && photo.title) inner += '<span class="pg-title">' + esc(photo.title) + '</span>';
        if (state.showCaption && photo.caption) inner += '<span class="pg-cap">' + esc(photo.caption) + '</span>';
        ov.innerHTML = inner;
        el.appendChild(ov);
      }

      if (state.mode === 'edit') decorateEdit(el, photo);

      wireCardEvents(el, photo);
      return el;
    }

    function decorateEdit(el, photo) {
      el.classList.add('pg-editable');
      if (!photo.isPublished) el.classList.add('pg-unpublished');

      var drag = document.createElement('button');
      drag.className = 'pg-handle pg-drag';
      drag.type = 'button';
      drag.setAttribute('aria-label', 'Drag to reorder');
      drag.innerHTML = svg('M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01');
      el.appendChild(drag);

      // Edit + delete sit together at top-right so removing a photo never
      // needs opening the full edit dialog first.
      var rightGroup = document.createElement('div');
      rightGroup.className = 'pg-handle-group-right';

      var del = document.createElement('button');
      del.className = 'pg-handle pg-quick-delete';
      del.type = 'button';
      del.setAttribute('aria-label', 'Delete photo');
      del.innerHTML = svg('M6 6l12 12M18 6L6 18');
      del.addEventListener('click', function (e) { e.stopPropagation(); opts.onDeleteCard && opts.onDeleteCard(photo); });
      rightGroup.appendChild(del);

      var edit = document.createElement('button');
      edit.className = 'pg-handle pg-edit';
      edit.type = 'button';
      edit.setAttribute('aria-label', 'Edit photo');
      edit.innerHTML = svg('M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z');
      edit.addEventListener('click', function (e) { e.stopPropagation(); opts.onEditCard && opts.onEditCard(photo); });
      rightGroup.appendChild(edit);

      el.appendChild(rightGroup);

      if (!photo.isPublished) {
        var badge = document.createElement('span');
        badge.className = 'pg-badge';
        badge.textContent = 'Draft';
        el.appendChild(badge);
      }

      buildQuickSize(el, photo);

      wireDrag(el, drag, photo);
    }

    /* ---------- inline size-preset bar (shown on hover, right on the card) ---------- */
    function abbrevLabel(label) {
      var map = { Small: 'S', Square: 'Sq', Portrait: 'Pt', Landscape: 'Ls', Wide: 'Wd', Tall: 'Tl', Feature: 'Ft' };
      return map[label] || label.slice(0, 2);
    }
    function buildQuickSize(el, photo) {
      var presets = (window.PhotographyConfig && window.PhotographyConfig.sizePresets) || [];
      if (!presets.length) return;
      var bar = document.createElement('div');
      bar.className = 'pg-quicksize';
      bar.setAttribute('role', 'group');
      bar.setAttribute('aria-label', 'Card size presets');
      presets.forEach(function (p) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pg-qs-btn';
        btn.dataset.w = p.w; btn.dataset.h = p.h;
        btn.title = p.label + ' (' + p.w + '×' + p.h + ')';
        btn.textContent = abbrevLabel(p.label);
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          photo.gridWidth = p.w; photo.gridHeight = p.h;
          state.resizingId = photo.id; // this card snaps instantly; neighbors settle smoothly
          render();
          state.resizingId = null;
          persistLayout();   // autosave, same path as drag/resize
        });
        bar.appendChild(btn);
      });
      el.appendChild(bar);
      el.__pgQuickSize = bar;
    }
    function syncQuickSize(el, photo) {
      var bar = el.__pgQuickSize;
      if (!bar) return;
      Array.prototype.forEach.call(bar.children, function (btn) {
        btn.classList.toggle('active', +btn.dataset.w === photo.gridWidth && +btn.dataset.h === photo.gridHeight);
      });
    }

    var FLIP_MS = 220;
    var FLIP_EASE = 'cubic-bezier(.2,.7,.2,1)';

    function render() {
      var isFirst = !state.rendered;

      // FLIP step 1 (First): snapshot every existing card's on-screen box
      // BEFORE anything about the layout changes, so we can animate the
      // difference afterwards instead of letting cards jump instantly.
      var oldRects = {};
      if (!isFirst) {
        Object.keys(state.cards).forEach(function (id) {
          oldRects[id] = state.cards[id].getBoundingClientRect();
        });
      }

      recalcCell();
      var layout = packedLayout();
      container.style.setProperty('--pg-rows', layout.rows);

      var seen = {};
      layout.items.forEach(function (it, index) {
        seen[it.id] = true;
        var el = state.cards[it.id];
        if (!el) { el = buildCard(it.photo, index === 0); state.cards[it.id] = el; container.appendChild(el); }
        el.style.gridColumn = (it.x + 1) + ' / span ' + it.w;
        el.style.gridRow = (it.y + 1) + ' / span ' + it.h;
        el.classList.toggle('pg-selected', state.selectedId === it.id);
        syncQuickSize(el, it.photo);
      });
      // remove stale
      Object.keys(state.cards).forEach(function (id) {
        if (!seen[id]) { state.cards[id].remove(); delete state.cards[id]; }
      });

      // FLIP steps 2-4 (Last/Invert/Play): for every card that already
      // existed and actually moved, play a light "settle" animation into
      // its new spot instead of snapping. The card being actively dragged
      // is handled separately (kept glued to the pointer, see wireDrag);
      // the card being actively resized snaps instantly (direct manipulation).
      if (!isFirst) {
        Object.keys(oldRects).forEach(function (id) {
          var el = state.cards[id];
          if (!el) return; // removed this render
          var oldRect = oldRects[id];
          var newRect = el.getBoundingClientRect();
          var dx = oldRect.left - newRect.left;
          var dy = oldRect.top - newRect.top;
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return; // no visible change

          if (id === state.draggingId) {
            // Fold the shift into the running drag offset so the card
            // stays exactly where the pointer left it — no jump, no delay.
            el.__dragTX = (el.__dragTX || 0) + dx;
            el.__dragTY = (el.__dragTY || 0) + dy;
            el.style.transition = 'none';
            el.style.transform = 'translate(' + el.__dragTX + 'px,' + el.__dragTY + 'px) scale(1.03)';
            return;
          }
          if (id === state.resizingId) return; // direct manipulation, no animation

          el.style.transition = 'none';
          el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
          void el.offsetHeight; // force reflow so the browser registers the start point
          el.style.transition = 'transform ' + FLIP_MS + 'ms ' + FLIP_EASE;
          el.style.transform = '';
          (function (cardEl) {
            var cleanup = function () { cardEl.style.transition = ''; cardEl.removeEventListener('transitionend', cleanup); };
            cardEl.addEventListener('transitionend', cleanup);
          })(el);
        });
      }

      state.rendered = true;
    }

    /* ---------- interactions ---------- */
    var suppressClick = false;

    function wireCardEvents(el, photo) {
      el.addEventListener('click', function () {
        if (suppressClick) { suppressClick = false; return; }
        if (state.mode === 'edit') { selectCard(photo.id); return; }
        if (state.lightbox) openLightboxFor(photo.id);
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (state.mode === 'edit') selectCard(photo.id);
          else if (state.lightbox) openLightboxFor(photo.id);
        }
      });
    }

    function openLightboxFor(id) {
      var pub = state.photos.filter(function (p) { return state.mode === 'edit' || p.isPublished; })
        .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
      var idx = pub.findIndex(function (p) { return p.id === id; });
      opts.onOpenLightbox && opts.onOpenLightbox(pub, Math.max(0, idx));
    }

    function selectCard(id) {
      state.selectedId = (state.selectedId === id) ? null : id;
      render();
      var p = state.photos.find(function (x) { return x.id === state.selectedId; }) || null;
      opts.onSelectCard && opts.onSelectCard(p);
    }

    /* ----- drag to reorder ----- */
    function cellFromPoint(clientX, clientY) {
      var rect = container.getBoundingClientRect();
      var x = Math.floor((clientX - rect.left) / (state.cellSize + state.gap));
      var y = Math.floor((clientY - rect.top) / (state.cellSize + state.gap));
      return { x: clamp(x, 0, state.cols - 1), y: Math.max(0, y) };
    }

    function wireDrag(el, handle, photo) {
      var dragging = false, moved = false, lastX = 0, lastY = 0;
      handle.addEventListener('pointerdown', function (e) {
        e.preventDefault(); e.stopPropagation();
        dragging = true; moved = false;
        lastX = e.clientX; lastY = e.clientY;
        el.__dragTX = 0; el.__dragTY = 0;
        state.draggingId = photo.id;
        el.style.transition = 'none';
        el.classList.add('pg-dragging');
        handle.setPointerCapture(e.pointerId);
      });
      handle.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        moved = true;

        // Track the pointer 1:1, every move — this is what makes the drag
        // feel smooth (the swap below only fires at discrete cell crossings,
        // so without this the card would only "jump" instead of glide).
        var dx = e.clientX - lastX, dy = e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        el.__dragTX = (el.__dragTX || 0) + dx;
        el.__dragTY = (el.__dragTY || 0) + dy;
        el.style.transform = 'translate(' + el.__dragTX + 'px,' + el.__dragTY + 'px) scale(1.03)';

        var cell = cellFromPoint(e.clientX, e.clientY);
        var layout = packedLayout();
        // find target card occupying that cell (not the dragged one)
        var target = layout.items.find(function (it) {
          return it.id !== photo.id &&
            cell.x >= it.x && cell.x < it.x + it.w &&
            cell.y >= it.y && cell.y < it.y + it.h;
        });
        // Triggers render(): other cards animate into their new spots,
        // and this card's own offset is recompensated to stay glued
        // to the pointer (see the draggingId branch inside render()).
        if (target) reorderBefore(photo.id, target.id);
      });
      function end(e) {
        if (!dragging) return;
        dragging = false;
        state.draggingId = null;
        try { handle.releasePointerCapture(e.pointerId); } catch (x) {}
        if (moved) {
          // Settle: animate from wherever the pointer left it into the
          // final grid slot, instead of snapping there instantly.
          el.style.transition = 'transform ' + FLIP_MS + 'ms ' + FLIP_EASE;
          el.style.transform = 'translate(0,0) scale(1)';
          var cleanup = function () {
            el.classList.remove('pg-dragging');
            el.style.transition = ''; el.style.transform = '';
            el.removeEventListener('transitionend', cleanup);
          };
          el.addEventListener('transitionend', cleanup);
          suppressClick = true;
          persistLayout();
        } else {
          el.classList.remove('pg-dragging');
          el.style.transform = '';
        }
      }
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
    }

    function reorderBefore(dragId, targetId) {
      var ordered = state.photos.slice().sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
      var dragIdx = ordered.findIndex(function (p) { return p.id === dragId; });
      var drag = ordered.splice(dragIdx, 1)[0];
      var targetIdx = ordered.findIndex(function (p) { return p.id === targetId; });
      ordered.splice(targetIdx, 0, drag);
      ordered.forEach(function (p, i) { p.sortOrder = i + 1; });
      render();
    }

    function persistLayout() {
      var layout = packedLayout();
      var items = layout.items.map(function (it) {
        // write derived positions back onto the photo objects too
        it.photo.gridX = it.x; it.photo.gridY = it.y;
        return {
          id: it.id, gridX: it.x, gridY: it.y,
          gridWidth: it.w, gridHeight: it.h, sortOrder: it.photo.sortOrder
        };
      });
      opts.onLayoutChange && opts.onLayoutChange(items);
    }

    /* ---------- helpers ---------- */
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
    function svg(path) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="' + path + '"/></svg>';
    }

    /* ---------- lifecycle ---------- */
    var ro = ('ResizeObserver' in window) ? new ResizeObserver(function () { recalcCell(); render(); }) : null;
    if (ro) ro.observe(container);
    var onWin = function () { recalcCell(); render(); };
    window.addEventListener('resize', onWin);

    render();

    return {
      setPhotos: function (photos) { state.photos = (photos || []).slice(); state.cards = {}; container.innerHTML = ''; render(); },
      setMode: function (mode) { state.mode = mode; state.selectedId = null; state.cards = {}; container.innerHTML = ''; render(); },
      getLayout: function () { return packedLayout().items.map(function (it) { return { id: it.id, gridX: it.x, gridY: it.y, gridWidth: it.w, gridHeight: it.h, sortOrder: it.photo.sortOrder }; }); },
      relayout: function () { recalcCell(); render(); },
      selectCard: function (id) { state.selectedId = id; render(); },
      getSelectedId: function () { return state.selectedId; },
      destroy: function () { if (ro) ro.disconnect(); window.removeEventListener('resize', onWin); container.innerHTML = ''; container.classList.remove('pg-grid'); }
    };
  }

  window.createBentoGrid = createBentoGrid;
})();
