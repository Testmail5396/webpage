/* =========================================================
   Photography section — FULLSCREEN LIGHTBOX
   ---------------------------------------------------------
   Accessible fullscreen viewer:
     - loads the high-resolution image
     - prev / next + keyboard arrows + Escape
     - mobile swipe navigation
     - focus trap + restores focus on close
     - optional caption / metadata
     - matches the site theme (grayscale chrome)
   ========================================================= */
(function () {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  function createLightbox() {
    var photos = [], index = 0, lastFocused = null, open = false;

    var root = document.createElement('div');
    root.className = 'pg-lightbox';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Photograph viewer');
    root.setAttribute('hidden', '');
    root.innerHTML =
      '<div class="pg-lb-backdrop" data-close></div>' +
      '<button class="pg-lb-btn pg-lb-close" aria-label="Close (Esc)">' + icon('M6 6l12 12M18 6L6 18') + '</button>' +
      '<button class="pg-lb-btn pg-lb-prev" aria-label="Previous photo">' + icon('M15 6l-6 6 6 6') + '</button>' +
      '<button class="pg-lb-btn pg-lb-next" aria-label="Next photo">' + icon('M9 6l6 6-6 6') + '</button>' +
      '<figure class="pg-lb-figure">' +
      '  <img class="pg-lb-img" alt="">' +
      '  <figcaption class="pg-lb-caption"></figcaption>' +
      '</figure>' +
      '<div class="pg-lb-counter" aria-hidden="true"></div>';
    document.body.appendChild(root);

    var imgEl = root.querySelector('.pg-lb-img');
    var capEl = root.querySelector('.pg-lb-caption');
    var counterEl = root.querySelector('.pg-lb-counter');
    var closeBtn = root.querySelector('.pg-lb-close');
    var prevBtn = root.querySelector('.pg-lb-prev');
    var nextBtn = root.querySelector('.pg-lb-next');

    function icon(path) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + path + '"/></svg>';
    }

    function show(i) {
      if (!photos.length) return;
      index = (i + photos.length) % photos.length;
      var p = photos[index];
      root.classList.add('pg-lb-loading');
      imgEl.src = p.highResolutionUrl || p.imageUrl;
      imgEl.alt = p.altText || '';
      var meta = '';
      if (p.title) meta += '<span class="pg-lb-title">' + esc(p.title) + '</span>';
      if (p.caption) meta += '<span class="pg-lb-text">' + esc(p.caption) + '</span>';
      var sub = [];
      if (p.category) sub.push(p.category);
      if (sub.length) meta += '<span class="pg-lb-sub">' + esc(sub.join(' · ')) + '</span>';
      capEl.innerHTML = meta;
      capEl.style.display = meta ? '' : 'none';
      counterEl.textContent = (index + 1) + ' / ' + photos.length;
      var multi = photos.length > 1;
      prevBtn.style.display = nextBtn.style.display = multi ? '' : 'none';
    }
    imgEl.addEventListener('load', function () { root.classList.remove('pg-lb-loading'); });
    imgEl.addEventListener('error', function () { root.classList.remove('pg-lb-loading'); });

    function next() { show(index + 1); }
    function prev() { show(index - 1); }

    function onKey(e) {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); doClose(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === 'Tab') { trap(e); }
    }
    function trap(e) {
      var focusables = Array.prototype.slice.call(root.querySelectorAll('button:not([style*="display: none"])'))
        .filter(function (b) { return b.offsetParent !== null; });
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    // Swipe
    var tx = 0, ty = 0;
    root.addEventListener('touchstart', function (e) { if (!e.touches[0]) return; tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (!e.changedTouches[0]) return;
      var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { dx < 0 ? next() : prev(); }
    }, { passive: true });

    closeBtn.addEventListener('click', doClose);
    nextBtn.addEventListener('click', next);
    prevBtn.addEventListener('click', prev);
    root.querySelector('[data-close]').addEventListener('click', doClose);
    document.addEventListener('keydown', onKey);

    function doOpen(list, i) {
      photos = list || []; if (!photos.length) return;
      lastFocused = document.activeElement;
      root.removeAttribute('hidden');
      requestAnimationFrame(function () { root.classList.add('pg-lb-open'); });
      document.body.classList.add('pg-lb-lock');
      open = true;
      show(i || 0);
      closeBtn.focus();
    }
    function doClose() {
      open = false;
      root.classList.remove('pg-lb-open');
      document.body.classList.remove('pg-lb-lock');
      setTimeout(function () { root.setAttribute('hidden', ''); imgEl.src = ''; }, 200);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    return { open: doOpen, close: doClose, isOpen: function () { return open; } };
  }

  window.createLightbox = createLightbox;
})();
