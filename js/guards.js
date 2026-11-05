/* ============================================================
   Interaction guard: close behavior + small UX optimizations
   ============================================================ */
(function () {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.closeModal = function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('show', 'page-mode');
    if (id === 'checkoutModal' || id === 'adminModal') {
      if (typeof window.navigatePage === 'function' && document.body.dataset.page !== 'shop') {
        window.navigatePage('shop');
      }
      return;
    }
    if (id === 'productFormModal' && document.body.dataset.page === 'admin') {
      const admin = document.getElementById('adminModal');
      if (admin) admin.classList.add('show', 'page-mode');
    }
  };

  window.closeCart = function () {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('overlay');
    if (drawer) drawer.classList.remove('show', 'page-view');
    if (overlay) overlay.classList.remove('show');
    if (document.body.dataset.page === 'cart' && typeof window.navigatePage === 'function') {
      window.navigatePage('shop');
    }
  };

  // Make all modal close buttons work even if an older handler was attached.
  document.addEventListener('click', function (e) {
    const close = e.target.closest('.close');
    if (!close) return;
    const wrap = close.closest('.modal-wrap');
    if (wrap && wrap.id) {
      e.preventDefault();
      e.stopPropagation();
      window.closeModal(wrap.id);
    }
  }, true);

  // Escape closes the top-most UI layer; prevents the page getting "stuck".
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    const visible = [...document.querySelectorAll('.modal-wrap.show')].reverse().find(el => getComputedStyle(el).display !== 'none');
    if (visible) { e.preventDefault(); window.closeModal(visible.id); return; }
    const drawer = document.getElementById('cartDrawer');
    if (drawer && (drawer.classList.contains('show') || drawer.classList.contains('page-view'))) {
      e.preventDefault();
      window.closeCart();
    }
  });

  // Close by tapping the dimmed background, but never when tapping modal content.
  document.addEventListener('click', function (e) {
    const wrap = e.target.classList && e.target.classList.contains('modal-wrap') ? e.target : null;
    if (wrap && wrap.classList.contains('show')) window.closeModal(wrap.id);
  });

  // Debounce search rendering to avoid rebuilding the entire catalog per keystroke.
  const search = document.getElementById('searchInput');
  if (search && !search.dataset.optimized) {
    search.dataset.optimized = '1';
    search.removeEventListener('input', window.renderProducts);
    let timer;
    search.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(() => { if (typeof window.renderProducts === 'function') window.renderProducts(); }, 100);
    }, { passive: true });
  }

  if (reduceMotion) document.documentElement.style.scrollBehavior = 'auto';

  // Keep taps responsive and avoid accidental double-submit on forms.
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function () {
      const submit = form.querySelector('button[type="submit"],button:not([type])');
      if (submit) {
        submit.dataset.originalText = submit.innerHTML;
        submit.disabled = true;
        setTimeout(() => { submit.disabled = false; }, 1800);
      }
    });
  });

  // Re-enable a submit button if browser validation prevents submission.
  document.addEventListener('invalid', function (e) {
    const form = e.target.form;
    if (form) form.querySelectorAll('button:disabled').forEach(b => b.disabled = false);
  }, true);
})();