import { installNavigation, pageSections, revealPage } from './navigation.js';
installNavigation();
revealPage();
const section = pageSections[location.pathname.split('/').pop()] || 'accueil';
const back = document.createElement('a');
back.className = 'detail-return';
back.href = `index.html#${section}`;
back.textContent = '↶ Reprendre le parcours';
const returnNav = document.createElement('nav');
returnNav.setAttribute('aria-label', 'Retour au parcours 3D');
returnNav.append(back);
document.body.append(returnNav);

const photos = document.querySelectorAll('.work-card img');
if (photos.length) {
  const dialog = document.createElement('dialog');
  dialog.className = 'image-dialog';
  dialog.setAttribute('aria-label', 'Photo de réalisation');
  dialog.innerHTML = '<button type="button" aria-label="Fermer la photo">Fermer ×</button><img alt=""><p></p>';
  document.body.append(dialog);
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  for (const photo of photos) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'gallery-image-button';
    button.setAttribute('aria-label', `Agrandir : ${photo.alt}`);
    photo.before(button); button.append(photo);
    button.addEventListener('click', () => {
      dialog.querySelector('img').src = photo.src;
      dialog.querySelector('img').alt = photo.alt;
      dialog.querySelector('p').textContent = photo.closest('figure').querySelector('figcaption')?.textContent || photo.alt;
      dialog.showModal();
    });
  }
}
