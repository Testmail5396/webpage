/* =========================================================
   Photography section — FREE-FORM CROP EDITOR
   ---------------------------------------------------------
   A standalone, dependency-free crop workspace (no React, no
   bundler — this whole site loads plain <script> tags, see
   index.html, so a component built on a React library like
   react-easy-crop couldn't run without adding a build pipeline
   that doesn't exist here). Delivers the same interaction model
   in vanilla JS + Canvas:

     - drag INSIDE the crop frame to pan/reposition the image
       (the frame stays put in the viewport, exactly like
       react-easy-crop's own drag-to-reposition behavior)
     - drag any of the 8 handles to resize the crop frame itself
       on that side/corner — this is what makes cropping truly
       free-form (react-easy-crop's frame is fixed-size; this one
       isn't)
     - mouse wheel / trackpad pinch (both fire as `wheel`) and a
       slider zoom the image, always keeping whatever point is
       under the cursor visually fixed
     - two-finger touch = pinch-zoom (independent of the 1-finger
       pan gesture, so they never fight each other)
     - rotate left/right 90°, reset, cancel, save

   Interface:
     window.PhotographyCropEditor.open(imageUrl, opts) → Promise
       resolves { blob, width, height } on Save,
       resolves null on Cancel,
       rejects only if the source image itself fails to load.
     opts: { format?: 'png'|'jpg'|... } — hints the export mime type.

   Assumes the CALLER already has the page's scroll-lock class
   applied (see photography.js — this is only ever opened from
   inside the already-locked edit dialog), so this module doesn't
   touch that class itself; it only manages its own dialog's
   show/hide.
   ========================================================= */
(function () {
  var MIN_ZOOM = 1;
  var MAX_ZOOM = 4;
  var MIN_BOX = 40; // px, smallest a crop frame side may shrink to
  var MAX_OUTPUT = 4096; // px, cap the exported image's longest side

  var ASPECTS = [
    { key: 'free', label: 'Free', value: null },
    { key: 'original', label: 'Original', value: 'original' },
    { key: 'square', label: 'Square 1:1', value: 1 },
    { key: 'portrait', label: 'Portrait 3:4', value: 3 / 4 },
    { key: 'landscape', label: 'Landscape 4:3', value: 4 / 3 },
    { key: 'wide', label: 'Wide 16:9', value: 16 / 9 },
    { key: 'panorama', label: 'Panorama 3:1', value: 3 / 1 }
  ];

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function svg(path) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + path + '"/></svg>';
  }

  function open(imageUrl, opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      /* ---------------- DOM ---------------- */
      var root = document.createElement('div');
      root.className = 'pg-dialog pg-crop-dialog';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', 'Crop photo');
      root.hidden = true;
      root.innerHTML =
        '<div class="pg-dialog-backdrop"></div>' +
        '<div class="pg-dialog-panel pg-crop-panel">' +
        '  <div class="pg-crop-head">' +
        '    <h2 class="pg-dialog-title">Crop photo</h2>' +
        '    <div class="pg-crop-aspects" role="group" aria-label="Aspect ratio"></div>' +
        '  </div>' +
        '  <div class="pg-crop-stage-wrap">' +
        '    <div class="pg-crop-stage">' +
        '      <img class="pg-crop-img" alt="" draggable="false">' +
        '      <div class="pg-crop-box">' +
        '        <div class="pg-crop-grid"></div>' +
        '        <button type="button" class="pg-crop-handle pg-crop-h-n" data-h="n" aria-label="Resize crop: top edge"></button>' +
        '        <button type="button" class="pg-crop-handle pg-crop-h-s" data-h="s" aria-label="Resize crop: bottom edge"></button>' +
        '        <button type="button" class="pg-crop-handle pg-crop-h-e" data-h="e" aria-label="Resize crop: right edge"></button>' +
        '        <button type="button" class="pg-crop-handle pg-crop-h-w" data-h="w" aria-label="Resize crop: left edge"></button>' +
        '        <button type="button" class="pg-crop-handle pg-crop-h-nw" data-h="nw" aria-label="Resize crop: top-left corner"></button>' +
        '        <button type="button" class="pg-crop-handle pg-crop-h-ne" data-h="ne" aria-label="Resize crop: top-right corner"></button>' +
        '        <button type="button" class="pg-crop-handle pg-crop-h-sw" data-h="sw" aria-label="Resize crop: bottom-left corner"></button>' +
        '        <button type="button" class="pg-crop-handle pg-crop-h-se" data-h="se" aria-label="Resize crop: bottom-right corner"></button>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '  <div class="pg-crop-controls">' +
        '    <div class="pg-crop-zoom-row">' +
        '      ' + iconBtn('pg-crop-zoom-out', 'Zoom out', 'M5 12h14') +
        '      <input type="range" class="pg-crop-zoom-slider" min="1" max="' + MAX_ZOOM + '" step="0.01" value="1" aria-label="Zoom">' +
        '      ' + iconBtn('pg-crop-zoom-in', 'Zoom in', 'M12 5v14M5 12h14') +
        '    </div>' +
        '    <div class="pg-crop-actions-row">' +
        '      ' + iconBtn('pg-crop-rotate-left', 'Rotate left 90°', 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5') +
        '      ' + iconBtn('pg-crop-rotate-right', 'Rotate right 90°', 'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5') +
        '      <button type="button" class="pg-btn pg-btn-ghost pg-crop-reset">Reset</button>' +
        '      <span class="pg-spacer"></span>' +
        '      <button type="button" class="pg-btn pg-btn-ghost pg-crop-cancel">Cancel</button>' +
        '      <button type="button" class="pg-btn pg-btn-primary pg-crop-save">Save Crop</button>' +
        '    </div>' +
        '  </div>' +
        '</div>';
      document.body.appendChild(root);

      function iconBtn(cls, label, path) {
        return '<button type="button" class="pg-crop-iconbtn ' + cls + '" aria-label="' + label + '">' + svg(path) + '</button>';
      }

      var stage = root.querySelector('.pg-crop-stage');
      var img = root.querySelector('.pg-crop-img');
      var box = root.querySelector('.pg-crop-box');
      var aspectsEl = root.querySelector('.pg-crop-aspects');
      var zoomSlider = root.querySelector('.pg-crop-zoom-slider');

      /* ---------------- state ---------------- */
      var state = {
        naturalW: 0, naturalH: 0,
        rotation: 0,      // 0 | 90 | 180 | 270
        zoom: 1,          // 1..MAX_ZOOM, relative to cover-fit
        offsetX: 0, offsetY: 0,
        aspectKey: 'free',
        box: { x: 0, y: 0, w: 0, h: 0 }
      };
      var settled = false;

      function finish(result) {
        if (settled) return;
        settled = true;
        window.removeEventListener('resize', onWinResize);
        root.classList.remove('pg-dialog-open');
        setTimeout(function () { root.remove(); }, 180);
        resolve(result);
      }

      /* ---------------- geometry helpers ---------------- */
      function effDims() {
        var swapped = (state.rotation % 180) !== 0;
        return swapped ? { w: state.naturalH, h: state.naturalW } : { w: state.naturalW, h: state.naturalH };
      }
      function stageRect() { return stage.getBoundingClientRect(); }
      function baseScale() {
        var r = stageRect(), e = effDims();
        if (!e.w || !e.h || !r.width || !r.height) return 1;
        return Math.max(r.width / e.w, r.height / e.h); // cover-fit at zoom=1
      }
      function currentScale() { return baseScale() * state.zoom; }
      function resolveAspect() {
        if (state.aspectKey === 'free') return null;
        if (state.aspectKey === 'original') { var e = effDims(); return e.w / e.h; }
        var found = ASPECTS.filter(function (a) { return a.key === state.aspectKey; })[0];
        return found ? found.value : null;
      }
      function clampOffset() {
        var r = stageRect(), e = effDims(), s = currentScale();
        var w = e.w * s, h = e.h * s;
        var maxOx = Math.max(0, (w - r.width) / 2);
        var maxOy = Math.max(0, (h - r.height) / 2);
        state.offsetX = clamp(state.offsetX, -maxOx, maxOx);
        state.offsetY = clamp(state.offsetY, -maxOy, maxOy);
      }
      function defaultBox() {
        var r = stageRect();
        var pad = Math.min(r.width, r.height) * 0.06;
        var maxW = Math.max(MIN_BOX, r.width - pad * 2);
        var maxH = Math.max(MIN_BOX, r.height - pad * 2);
        var asp = resolveAspect();
        var w, h;
        if (asp) {
          if (maxW / maxH > asp) { h = maxH; w = h * asp; } else { w = maxW; h = w / asp; }
        } else { w = maxW; h = maxH; }
        return { x: (r.width - w) / 2, y: (r.height - h) / 2, w: w, h: h };
      }

      /* ---------------- render ---------------- */
      function render() {
        var s = currentScale();
        img.style.transform = 'translate(-50%, -50%) translate(' + state.offsetX + 'px,' + state.offsetY + 'px) rotate(' + state.rotation + 'deg) scale(' + s + ')';
        box.style.left = state.box.x + 'px';
        box.style.top = state.box.y + 'px';
        box.style.width = state.box.w + 'px';
        box.style.height = state.box.h + 'px';
        zoomSlider.value = state.zoom;
      }

      function resetAll() {
        state.rotation = 0; state.zoom = 1; state.offsetX = 0; state.offsetY = 0;
        state.aspectKey = 'free';
        syncAspectButtons();
        clampOffset();
        state.box = defaultBox();
        render();
      }

      /* ---------------- aspect presets ---------------- */
      aspectsEl.innerHTML = ASPECTS.map(function (a) {
        return '<button type="button" class="pg-crop-aspect-btn' + (a.key === 'free' ? ' active' : '') + '" data-key="' + a.key + '">' + a.label + '</button>';
      }).join('');
      function syncAspectButtons() {
        Array.prototype.forEach.call(aspectsEl.querySelectorAll('.pg-crop-aspect-btn'), function (b) {
          b.classList.toggle('active', b.getAttribute('data-key') === state.aspectKey);
        });
      }
      aspectsEl.addEventListener('click', function (e) {
        var b = e.target.closest('.pg-crop-aspect-btn'); if (!b) return;
        state.aspectKey = b.getAttribute('data-key');
        syncAspectButtons();
        state.box = defaultBox();
        render();
      });

      /* ---------------- zoom ---------------- */
      function setZoom(target, anchorX, anchorY) {
        var r = stageRect();
        var ax = anchorX != null ? anchorX : r.width / 2;
        var ay = anchorY != null ? anchorY : r.height / 2;
        var oldCenterX = r.width / 2 + state.offsetX, oldCenterY = r.height / 2 + state.offsetY;
        var newZoom = clamp(target, MIN_ZOOM, MAX_ZOOM);
        if (newZoom === state.zoom) return;
        var ratio = newZoom / state.zoom;
        state.zoom = newZoom;
        state.offsetX = (ax - (ax - oldCenterX) * ratio) - r.width / 2;
        state.offsetY = (ay - (ay - oldCenterY) * ratio) - r.height / 2;
        clampOffset();
        render();
      }
      function zoomBy(factor, anchorX, anchorY) { setZoom(state.zoom * factor, anchorX, anchorY); }

      root.querySelector('.pg-crop-zoom-in').addEventListener('click', function () {
        zoomBy(1.25, state.box.x + state.box.w / 2, state.box.y + state.box.h / 2);
      });
      root.querySelector('.pg-crop-zoom-out').addEventListener('click', function () {
        zoomBy(0.8, state.box.x + state.box.w / 2, state.box.y + state.box.h / 2);
      });
      zoomSlider.addEventListener('input', function () {
        setZoom(+zoomSlider.value, state.box.x + state.box.w / 2, state.box.y + state.box.h / 2);
      });
      // Mouse wheel (desktop) AND trackpad pinch (fires as wheel with
      // ctrlKey on macOS) both zoom, anchored under the cursor.
      stage.addEventListener('wheel', function (e) {
        e.preventDefault();
        var r = stageRect();
        var ax = e.clientX - r.left, ay = e.clientY - r.top;
        zoomBy(e.deltaY < 0 ? 1.08 : 0.92, ax, ay);
      }, { passive: false });

      /* ---------------- rotate / reset ---------------- */
      function rotate(delta) {
        state.rotation = (state.rotation + delta + 360) % 360;
        state.zoom = 1; state.offsetX = 0; state.offsetY = 0;
        state.box = defaultBox();
        render();
      }
      root.querySelector('.pg-crop-rotate-left').addEventListener('click', function () { rotate(-90); });
      root.querySelector('.pg-crop-rotate-right').addEventListener('click', function () { rotate(90); });
      root.querySelector('.pg-crop-reset').addEventListener('click', resetAll);

      /* ---------------- pan (drag inside the frame) ---------------- */
      var activePointers = {}; // id -> {x,y}, for pinch detection
      var panning = false, panStartX = 0, panStartY = 0, panStartOffX = 0, panStartOffY = 0;
      var pinching = false, pinchStartDist = 0, pinchStartZoom = 1;

      function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
      function midpoint(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

      stage.addEventListener('pointerdown', function (e) {
        if (e.target.closest('.pg-crop-handle')) return; // handles have their own listeners
        activePointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(activePointers);
        if (ids.length >= 2) {
          // second finger just landed → switch to pinch, abandon any pan
          panning = false;
          pinching = true;
          var pts = ids.map(function (id) { return activePointers[id]; });
          pinchStartDist = dist(pts[0], pts[1]);
          pinchStartZoom = state.zoom;
          return;
        }
        panning = true;
        panStartX = e.clientX; panStartY = e.clientY;
        panStartOffX = state.offsetX; panStartOffY = state.offsetY;
        stage.setPointerCapture(e.pointerId);
      });
      stage.addEventListener('pointermove', function (e) {
        if (!activePointers[e.pointerId]) return;
        activePointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(activePointers);
        if (pinching && ids.length >= 2) {
          var pts = ids.map(function (id) { return activePointers[id]; });
          var d = dist(pts[0], pts[1]);
          var mid = midpoint(pts[0], pts[1]);
          var r = stageRect();
          setZoom(pinchStartZoom * (d / pinchStartDist), mid.x - r.left, mid.y - r.top);
          return;
        }
        if (!panning) return;
        state.offsetX = panStartOffX + (e.clientX - panStartX);
        state.offsetY = panStartOffY + (e.clientY - panStartY);
        clampOffset();
        render();
      });
      function releasePointer(e) {
        delete activePointers[e.pointerId];
        var remaining = Object.keys(activePointers).length;
        if (remaining < 2) pinching = false;
        if (remaining === 0) panning = false;
        try { stage.releasePointerCapture(e.pointerId); } catch (x) {}
      }
      stage.addEventListener('pointerup', releasePointer);
      stage.addEventListener('pointercancel', releasePointer);

      /* ---------------- resize handles ---------------- */
      var NUDGE = 4; // px per arrow-key press, keyboard resizing
      function applyHandleDelta(handle, dx, dy) {
        var r = stageRect();
        var b = state.box;
        var x = b.x, y = b.y, w = b.w, h = b.h;
        var asp = resolveAspect();
        var touchesN = handle.indexOf('n') !== -1, touchesS = handle.indexOf('s') !== -1;
        var touchesE = handle.indexOf('e') !== -1, touchesW = handle.indexOf('w') !== -1;

        if (touchesE) w = w + dx;
        if (touchesW) { x = x + dx; w = w - dx; }
        if (touchesS) h = h + dy;
        if (touchesN) { y = y + dy; h = h - dy; }

        w = Math.max(MIN_BOX, w);
        h = Math.max(MIN_BOX, h);
        // re-anchor x/y in case clamping w/h above changed which edge moved
        if (touchesW) x = b.x + b.w - w;
        if (touchesN) y = b.y + b.h - h;

        if (asp) {
          var isCorner = handle.length === 2;
          if (isCorner) {
            // keep the OPPOSITE corner fixed while forcing the aspect ratio,
            // driven by whichever axis the pointer moved further along
            var anchorX = touchesW ? b.x + b.w : b.x; // opposite edge of the one being dragged
            var anchorY = touchesN ? b.y + b.h : b.y;
            if (Math.abs(dx) > Math.abs(dy)) { h = w / asp; } else { w = h * asp; }
            w = Math.max(MIN_BOX, w); h = Math.max(MIN_BOX, h);
            x = touchesW ? anchorX - w : anchorX;
            y = touchesN ? anchorY - h : anchorY;
          } else {
            // edge-only handle with a locked aspect: resize symmetrically
            // around the box's own center so the opposite edge doesn't jump
            var cx = b.x + b.w / 2, cy = b.y + b.h / 2;
            if (touchesE || touchesW) { h = w / asp; } else { w = h * asp; }
            w = Math.max(MIN_BOX, w); h = Math.max(MIN_BOX, h);
            x = cx - w / 2; y = cy - h / 2;
          }
        }

        // clamp to stage bounds without changing size (slide the box back in)
        x = clamp(x, 0, Math.max(0, r.width - w));
        y = clamp(y, 0, Math.max(0, r.height - h));
        w = Math.min(w, r.width - x);
        h = Math.min(h, r.height - y);

        state.box = { x: x, y: y, w: w, h: h };
        render();
      }

      Array.prototype.forEach.call(root.querySelectorAll('.pg-crop-handle'), function (handle) {
        var h = handle.getAttribute('data-h');
        var dragging = false, startX = 0, startY = 0, startBox = null;
        handle.addEventListener('pointerdown', function (e) {
          e.preventDefault(); e.stopPropagation();
          dragging = true;
          startX = e.clientX; startY = e.clientY;
          startBox = { x: state.box.x, y: state.box.y, w: state.box.w, h: state.box.h };
          handle.setPointerCapture(e.pointerId);
        });
        handle.addEventListener('pointermove', function (e) {
          if (!dragging) return;
          state.box = startBox; // applyHandleDelta reads state.box as "before this move" base
          applyHandleDelta(h, e.clientX - startX, e.clientY - startY);
        });
        function end(e) { dragging = false; try { handle.releasePointerCapture(e.pointerId); } catch (x) {} }
        handle.addEventListener('pointerup', end);
        handle.addEventListener('pointercancel', end);
        // Keyboard: arrow keys nudge this edge/corner; Shift = bigger step.
        handle.addEventListener('keydown', function (e) {
          var step = e.shiftKey ? NUDGE * 4 : NUDGE;
          var dx = 0, dy = 0;
          if (e.key === 'ArrowLeft') dx = -step;
          else if (e.key === 'ArrowRight') dx = step;
          else if (e.key === 'ArrowUp') dy = -step;
          else if (e.key === 'ArrowDown') dy = step;
          else return;
          e.preventDefault();
          startBox = { x: state.box.x, y: state.box.y, w: state.box.w, h: state.box.h };
          state.box = startBox;
          applyHandleDelta(h, dx, dy);
        });
      });

      /* ---------------- resize observer (dialog/viewport resize) ---------------- */
      function onWinResize() {
        // Keep the box proportionally in place rather than resetting it,
        // so rotating the phone or resizing the browser doesn't discard
        // the admin's in-progress crop.
        var before = stageRect();
        if (!before.width || !before.height) return;
        var relX = state.box.x / before.width, relY = state.box.y / before.height;
        var relW = state.box.w / before.width, relH = state.box.h / before.height;
        requestAnimationFrame(function () {
          var r = stageRect();
          if (!r.width || !r.height) return;
          state.box = { x: relX * r.width, y: relY * r.height, w: relW * r.width, h: relH * r.height };
          clampOffset();
          render();
        });
      }
      window.addEventListener('resize', onWinResize);

      /* ---------------- cancel / save ---------------- */
      root.querySelector('.pg-crop-cancel').addEventListener('click', function () { finish(null); });
      root.querySelector('.pg-dialog-backdrop').addEventListener('click', function () { finish(null); });
      root.addEventListener('keydown', function (e) { if (e.key === 'Escape') finish(null); });

      root.querySelector('.pg-crop-save').addEventListener('click', function () {
        exportCrop().then(function (result) { finish(result); })
          .catch(function (e) { console.error('[crop-editor] export failed', e); window.alert('Could not export the crop — please try again.'); });
      });

      /* ---------------- export ---------------- */
      function exportCrop() {
        return buildRotatedSource().then(function (rotatedCanvas) {
          var e = effDims();
          var s = currentScale();
          var r = stageRect();
          var imgLeft = r.width / 2 - (e.w * s) / 2 + state.offsetX;
          var imgTop = r.height / 2 - (e.h * s) / 2 + state.offsetY;
          var b = state.box;
          var sx = clamp((b.x - imgLeft) / s, 0, e.w);
          var sy = clamp((b.y - imgTop) / s, 0, e.h);
          var sw = clamp(b.w / s, 1, e.w - sx);
          var sh = clamp(b.h / s, 1, e.h - sy);

          var outW = sw, outH = sh;
          var longest = Math.max(outW, outH);
          if (longest > MAX_OUTPUT) {
            var down = MAX_OUTPUT / longest;
            outW = Math.round(outW * down); outH = Math.round(outH * down);
          } else {
            outW = Math.round(outW); outH = Math.round(outH);
          }

          var out = document.createElement('canvas');
          out.width = outW; out.height = outH;
          var ctx = out.getContext('2d');
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(rotatedCanvas, sx, sy, sw, sh, 0, 0, outW, outH);

          var mime = (opts.format === 'png') ? 'image/png' : 'image/jpeg';
          var quality = mime === 'image/jpeg' ? 0.92 : undefined;
          return new Promise(function (resolve, reject) {
            out.toBlob(function (blob) {
              if (!blob) { reject(new Error('Canvas export produced no data (possibly a cross-origin image).')); return; }
              resolve({ blob: blob, width: outW, height: outH });
            }, mime, quality);
          });
        });
      }

      // Renders the ORIGINAL (unrotated) source image into an offscreen
      // canvas pre-rotated by the total accumulated rotation, so the crop
      // math afterwards is plain axis-aligned translate+scale — no need
      // to combine rotation into the sx/sy/sw/sh formula directly.
      function buildRotatedSource() {
        return new Promise(function (resolve, reject) {
          var e = effDims();
          var c = document.createElement('canvas');
          c.width = e.w; c.height = e.h;
          var ctx = c.getContext('2d');
          try {
            ctx.translate(e.w / 2, e.h / 2);
            ctx.rotate(state.rotation * Math.PI / 180);
            ctx.drawImage(img, -state.naturalW / 2, -state.naturalH / 2);
            resolve(c);
          } catch (err) { reject(err); }
        });
      }

      /* ---------------- load source image ---------------- */
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        state.naturalW = img.naturalWidth;
        state.naturalH = img.naturalHeight;
        img.style.width = state.naturalW + 'px';
        img.style.height = state.naturalH + 'px';
        root.hidden = false;
        requestAnimationFrame(function () {
          root.classList.add('pg-dialog-open');
          state.box = defaultBox();
          render();
        });
      };
      img.onerror = function () {
        root.remove();
        reject(new Error('Could not load the image for cropping.'));
      };
      img.src = imageUrl;
    });
  }

  window.PhotographyCropEditor = { open: open };
})();
