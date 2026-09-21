import { revealPage } from './navigation.js';

// Keep Three.js and the complete scene out of the mobile request graph.
const desktop = matchMedia('(min-width: 761px)');
let journey;
function selectExperience() {
  if (desktop.matches) {
    journey ??= import('./desktop-journey.js').catch(error => {
      console.warn('Parcours 3D indisponible.', error);
      document.body.classList.add('no-webgl');
      revealPage();
    });
  } else {
    revealPage();
  }
}
desktop.addEventListener('change', selectExperience);
selectExperience();
