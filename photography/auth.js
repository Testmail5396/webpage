/* =========================================================
   Photography section — AUTH (Google Sign-In)
   ---------------------------------------------------------
   Owner Edit Mode is granted ONLY after an explicit sign-in
   whose verified email exactly equals PhotographyConfig.adminEmail
   (vikashsri987@gmail.com). Being signed into Chrome is NOT
   enough — the user must sign in to THIS site.

   PRODUCTION (googleClientId set):
     Uses Google Identity Services. Google returns a signed ID
     token (JWT). We read the email from it for UI gating, and
     send the raw token to the Netlify functions, which verify
     the signature + audience + email server-side against the
     private ADMIN_EMAIL. The server is the real security
     boundary; hidden buttons are only cosmetic.

   DEV / no-key fallback (googleClientId empty):
     A local email + password unlock (password checked as a SHA-256
     hash, see config.js) so the whole feature stays runnable offline.
     Still NOT a real security boundary — there is no server here, so
     this file (and the hash) ships to every visitor's browser. It only
     raises the bar above "guess the email"; it does not replace the
     production path (Google Sign-In + server-verified ADMIN_EMAIL).

   Interface:
     isAdmin()  email()  token()  signIn()  signOut()  onChange(cb)
   ========================================================= */
(function () {
  var CFG = window.PhotographyConfig;
  var listeners = [];
  var state = { admin: false, email: null, name: null, picture: null, token: null };

  function emit() { listeners.forEach(function (cb) { try { cb(state); } catch (e) {} }); }
  function norm(e) { return String(e || '').trim().toLowerCase(); }
  function isOwner(email) { return norm(email) && norm(email) === norm(CFG.adminEmail); }
  var googleEnabled = !!(CFG.googleClientId && CFG.googleClientId.trim());

  /* ---------- session persistence ---------- */
  function persist() {
    try {
      if (state.admin) sessionStorage.setItem(CFG.storageKeys.admin, JSON.stringify({ email: state.email, name: state.name, picture: state.picture, token: state.token }));
      else sessionStorage.removeItem(CFG.storageKeys.admin);
    } catch (e) {}
  }
  function restore() {
    try {
      var raw = sessionStorage.getItem(CFG.storageKeys.admin);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && isOwner(s.email)) { state.admin = true; state.email = norm(s.email); state.name = s.name || null; state.picture = s.picture || null; state.token = s.token || null; }
    } catch (e) {}
  }

  /* ---------- JWT decode (payload only; server verifies signature) ---------- */
  function decodeJwt(t) {
    try {
      var p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(atob(p).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')));
    } catch (e) { return null; }
  }

  /* ---------- SHA-256 (dev-mode password check only) ---------- */
  function sha256Hex(str) {
    var enc = new TextEncoder().encode(str);
    return crypto.subtle.digest('SHA-256', enc).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
    });
  }

  /* ---------- Google Identity Services ---------- */
  var gisLoaded = false;
  function loadGis() {
    return new Promise(function (resolve, reject) {
      if (gisLoaded && window.google && window.google.accounts) return resolve();
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true; s.defer = true;
      s.onload = function () { gisLoaded = true; resolve(); };
      s.onerror = function () { reject(new Error('Could not load Google Sign-In')); };
      document.head.appendChild(s);
    });
  }
  function initGis() {
    window.google.accounts.id.initialize({
      client_id: CFG.googleClientId,
      callback: onGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true
    });
  }
  function onGoogleCredential(resp) {
    var payload = decodeJwt(resp.credential);
    if (!payload) { showDenied('Sign-in failed. Please try again.'); return; }
    if (payload.email_verified === false) { showDenied('Your Google email is not verified.'); return; }
    if (isOwner(payload.email)) {
      state.admin = true; state.email = norm(payload.email);
      state.name = payload.name || null; state.picture = payload.picture || null;
      state.token = resp.credential;
      persist(); closeDialog(); emit();
    } else {
      // signed in, but not the owner → stay public
      state.admin = false; state.email = norm(payload.email); state.token = resp.credential;
      showDenied('Signed in as ' + payload.email + ', which is not the owner account. Showing the public gallery.');
      emit();
    }
  }

  /* ---------- login dialog ---------- */
  var dialog = null;
  function buildDialog() {
    if (dialog) return dialog;
    dialog = document.createElement('div');
    dialog.className = 'pg-dialog pg-login-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.hidden = true;
    dialog.innerHTML =
      '<div class="pg-dialog-backdrop" data-close></div>' +
      '<div class="pg-dialog-panel pg-login-panel">' +
      '  <h2 class="pg-dialog-title">Owner sign-in</h2>' +
      '  <p class="pg-login-sub">Sign in to manage this photography portfolio. Only the owner account can edit.</p>' +
      '  <div class="pg-login-body"></div>' +
      '  <p class="pg-login-msg" role="status"></p>' +
      '  <div class="pg-dialog-actions"><span class="pg-spacer"></span><button class="pg-btn pg-btn-ghost" data-close>Close</button></div>' +
      '</div>';
    document.body.appendChild(dialog);
    dialog.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) closeDialog(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !dialog.hidden) closeDialog(); });
    return dialog;
  }
  function showDialog() {
    buildDialog();
    var body = dialog.querySelector('.pg-login-body');
    dialog.querySelector('.pg-login-msg').textContent = '';
    body.innerHTML = '';

    if (googleEnabled) {
      var target = document.createElement('div');
      target.className = 'pg-gbtn';
      body.appendChild(target);
      loadGis().then(function () {
        initGis();
        window.google.accounts.id.renderButton(target, { theme: 'outline', size: 'large', type: 'standard', shape: 'pill', text: 'signin_with', logo_alignment: 'left' });
        window.google.accounts.id.prompt(); // optional One Tap
      }).catch(function (err) { dialog.querySelector('.pg-login-msg').textContent = err.message; });
    } else {
      // Dev fallback: email + password unlock (no server — see config.js
      // ownerPasswordHash comment for exactly what this does and doesn't protect).
      body.innerHTML =
        '<label class="pg-field"><span>Owner email</span>' +
        '<input type="email" class="pg-login-email" placeholder="you@example.com" autocomplete="email"></label>' +
        '<label class="pg-field"><span>Password</span>' +
        '<input type="password" class="pg-login-pw" placeholder="••••••••" autocomplete="current-password"></label>' +
        '<button class="pg-btn pg-btn-primary pg-login-go">Continue</button>' +
        '<p class="pg-hint">Dev mode: Google Sign-In activates once a Google Client ID is set in config.js.</p>';
      var input = body.querySelector('.pg-login-email');
      var pwInput = body.querySelector('.pg-login-pw');
      var msgEl = dialog.querySelector('.pg-login-msg');
      var busy = false;
      var go = function () {
        if (busy) return;
        var v = input.value, pw = pwInput.value;
        if (!isOwner(v)) { msgEl.textContent = 'That email is not the owner account.'; return; }
        if (!pw) { msgEl.textContent = 'Enter the owner password.'; return; }
        busy = true; msgEl.textContent = '';
        sha256Hex(pw).then(function (hash) {
          busy = false;
          if (hash === CFG.ownerPasswordHash) {
            state.admin = true; state.email = norm(v); state.name = 'Owner'; state.token = null;
            persist(); closeDialog(); emit();
          } else {
            msgEl.textContent = 'Incorrect password.';
            pwInput.value = ''; pwInput.focus();
          }
        });
      };
      body.querySelector('.pg-login-go').addEventListener('click', go);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') pwInput.focus(); });
      pwInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
      setTimeout(function () { input.focus(); }, 50);
    }

    dialog.hidden = false;
    requestAnimationFrame(function () { dialog.classList.add('pg-dialog-open'); });
    document.body.classList.add('pg-lb-lock');
  }
  function closeDialog() {
    if (!dialog) return;
    dialog.classList.remove('pg-dialog-open');
    document.body.classList.remove('pg-lb-lock');
    setTimeout(function () { dialog.hidden = true; }, 180);
  }
  function showDenied(msg) {
    buildDialog();
    if (dialog.hidden) showDialog();
    var el = dialog.querySelector('.pg-login-msg');
    if (el) el.textContent = msg;
  }

  var Auth = {
    isAdmin: function () { return state.admin; },
    email: function () { return state.email; },
    name: function () { return state.name; },
    picture: function () { return state.picture; },
    token: function () { return state.token; },
    googleEnabled: function () { return googleEnabled; },
    signIn: function () { showDialog(); },
    signOut: function () {
      if (googleEnabled && window.google && window.google.accounts) {
        try { window.google.accounts.id.disableAutoSelect(); } catch (e) {}
      }
      state.admin = false; state.email = null; state.name = null; state.picture = null; state.token = null;
      persist(); emit();
    },
    onChange: function (cb) { listeners.push(cb); return function () { listeners = listeners.filter(function (f) { return f !== cb; }); }; }
  };

  restore();
  window.PhotographyAuth = Auth;
})();
