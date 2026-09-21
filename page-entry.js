// Runs before first paint so an internal navigation never flashes an uncovered page.
(() => {
  try {
    const saved = JSON.parse(sessionStorage.getItem('catf-page-entry'));
    sessionStorage.removeItem('catf-page-entry');
    const reduced = matchMedia('(max-width: 760px)').matches || sessionStorage.getItem('catf-motion') === 'reduced' ||
      (sessionStorage.getItem('catf-motion') !== 'full' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (!reduced && saved?.href === location.href && Date.now() - saved.time < 10000) {
      window.__catfPageEntry = saved;
      document.documentElement.classList.add('page-entering');
      // A failed module must never leave the page covered.
      setTimeout(() => document.documentElement.classList.remove('page-entering'), 900);
    }
  } catch { /* Native navigation still works when storage is unavailable. */ }
  addEventListener('pageshow', event => {
    if (event.persisted) document.documentElement.classList.remove('page-entering', 'page-revealing');
  });
})();
