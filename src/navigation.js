export const pageSections = {
  'nettoyage-toiture.html': 'services',
  'nettoyage-veranda.html': 'veranda',
  'entretien-espaces-verts.html': 'jardin',
  'realisations.html': 'realisations',
  'qui-suis-je.html': 'cedric',
};

export function reducedNavigation() {
  if (matchMedia('(max-width: 760px)').matches) return true;
  try {
    const saved = sessionStorage.getItem('catf-motion');
    if (saved) return saved === 'reduced';
  } catch {}
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function revealPage() {
  if (!document.documentElement.classList.contains('page-entering')) return;
  // One painted covered frame precedes the 160 ms reveal.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.documentElement.classList.add('page-revealing');
    setTimeout(() => document.documentElement.classList.remove('page-entering', 'page-revealing'), 180);
  }));
}

export function installNavigation({ canAnimate = () => !reducedNavigation(), depart, reset = () => {} } = {}) {
  const curtain = document.createElement('div');
  curtain.className = 'page-curtain'; curtain.setAttribute('aria-hidden', 'true');
  document.body.append(curtain);
  let pending = null, timer;
  const clean = () => {
    clearTimeout(timer); pending = null;
    document.documentElement.classList.remove('page-leaving');
    curtain.style.transition = 'none'; curtain.style.opacity = '0'; reset();
    requestAnimationFrame(() => curtain.style.removeProperty('transition'));
  };
  const navigate = () => {
    if (!pending) return;
    const href = pending.href;
    try {
      sessionStorage.setItem('catf-page-entry', JSON.stringify({href, time: Date.now(), section: pending.section}));
    } catch {}
    location.assign(href);
  };
  const file = url => url.pathname.split('/').pop() || 'index.html';
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href), here = new URL(location.href);
    if (url.origin !== here.origin || !['http:', 'https:'].includes(url.protocol)) return;
    // Hash navigation within the journey keeps its existing scroll behavior.
    if (file(url) === file(here)) return;
    if (!(file(url) in pageSections) && file(url) !== 'index.html' && file(url) !== 'privacy.html') return;
    if (!canAnimate()) return;
    event.preventDefault();
    if (pending) return;
    const section = pageSections[file(url)] || (file(url) === 'index.html' ? url.hash.slice(1) : null);
    const zoom = depart?.(section) === true;
    const duration = zoom ? 320 : 140;
    pending = {href: url.href, section};
    curtain.style.setProperty('--departure-duration', `${duration}ms`);
    curtain.style.setProperty('--fade-delay', zoom ? '150ms' : '0ms');
    curtain.style.setProperty('--fade-duration', zoom ? '170ms' : '140ms');
    document.documentElement.classList.add('page-leaving');
    curtain.style.opacity = '1';
    // Navigation never depends on animation frames or a transitionend event.
    timer = setTimeout(navigate, duration);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && pending) navigate(); });
  window.addEventListener('pageshow', event => { if (event.persisted) clean(); });
  window.addEventListener('pagehide', clean);
  return { clean };
}
