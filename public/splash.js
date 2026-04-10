/* Human X Labs — splash screen control script
 *
 * Exposes window.hxSplash.hide() which:
 *   - Waits for minDisplayMs (default 2800) to elapse since page load,
 *     so the full animation has time to complete even on fast machines
 *   - Fades the splash out via CSS transition
 *   - Removes the element from the DOM after the fade completes
 */
(function (global) {
  var mountedAt = Date.now();

  function hide(opts) {
    opts = opts || {};
    var minMs = typeof opts.minDisplayMs === 'number' ? opts.minDisplayMs : 2800;
    var elapsed = Date.now() - mountedAt;
    var wait = Math.max(0, minMs - elapsed);

    setTimeout(function () {
      var el = document.getElementById('hx-splash');
      if (!el) return;
      el.classList.add('hx-splash--hidden');
      setTimeout(function () {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }, 600);
    }, wait);
  }

  global.hxSplash = { hide: hide };
})(window);
