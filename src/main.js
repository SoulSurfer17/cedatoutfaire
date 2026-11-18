import { revealPage } from './navigation.js';

const wide = matchMedia('(min-width: 761px)');
const precise = matchMedia('(hover: hover) and (pointer: fine)');
const enable = document.querySelector('.scene-enable');
let optedIn = false;
try { optedIn = sessionStorage.getItem('catf-3d') === 'enabled'; } catch {}
let journey;

function selectExperience() {
  const body = document.body;
  const unavailable = body.classList.contains('no-webgl');
  const ready = body.classList.contains('webgl-ready');
  const immersive = wide.matches && (precise.matches || optedIn) && !unavailable;
  body.classList.toggle('immersive-journey', immersive);
  enable.hidden = !wide.matches || precise.matches || (immersive && ready);
  enable.disabled = optedIn || unavailable;
  enable.textContent = unavailable ? 'Vue 3D indisponible' : optedIn ? 'Chargement de la 3D…' : 'Explorer en 3D';

  if (!immersive) {
    revealPage();
    return;
  }
  journey ??= import('./desktop-journey.js').catch(error => {
    console.warn('Parcours 3D indisponible.', error);
    body.classList.add('no-webgl');
  }).finally(selectExperience);
}

enable.addEventListener('click', () => {
  optedIn = true;
  try { sessionStorage.setItem('catf-3d', 'enabled'); } catch {}
  selectExperience();
  window.scrollTo({ top: 0, behavior: 'instant' });
});
wide.addEventListener('change', selectExperience);
precise.addEventListener('change', selectExperience);
selectExperience();
