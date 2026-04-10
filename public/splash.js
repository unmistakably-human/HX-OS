/* Human X Labs — splash screen control script
 *
 * Exposes window.hxSplash.hide() which:
 *   - Waits for minDisplayMs (default 2800) to elapse since page load
 *   - Fades the splash out via CSS transition
 *   - Removes the element from the DOM after the fade completes
 *
 * SAFETY: Auto-hides after 8 seconds even if hide() is never called,
 * so the splash never permanently blocks the app.
 */
(function (global) {
  var mountedAt = Date.now();
  var hidden = false;

  function doHide() {
    if (hidden) return;
    hidden = true;
    var el = document.getElementById('hx-splash');
    if (!el) return;
    el.classList.add('hx-splash--hidden');
    setTimeout(function () {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }, 600);
  }

  function hide(opts) {
    opts = opts || {};
    var minMs = typeof opts.minDisplayMs === 'number' ? opts.minDisplayMs : 2800;
    var elapsed = Date.now() - mountedAt;
    var wait = Math.max(0, minMs - elapsed);
    setTimeout(doHide, wait);
  }

  // Safety fallback — auto-hide after 8 seconds no matter what
  setTimeout(doHide, 8000);

  global.hxSplash = { hide: hide };
})(window);
