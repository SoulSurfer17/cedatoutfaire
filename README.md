# Ced A Tout Faire

Site statique publié sur GitHub Pages : https://cedatoutfaire.org/.
Sept pages HTML, sans serveur applicatif, base de données ni formulaire.
Les contacts passent par téléphone et e-mail.

## Fichiers utilisés

- Les fichiers HTML contiennent le contenu, les métadonnées et les styles propres aux pages.
- `site-runtime.css` et `site-runtime.js` gèrent les éléments communs, le menu, les avis et le consentement Analytics.
- `ressources/` contient les photos WebP et l’icône carrée `favicon.png`.
- `reviews.json` contient les avis affichés ; aucun avis n’est récupéré automatiquement auprès de Google.
- `sitemap.xml`, `robots.txt` et `CNAME` décrivent les pages et le domaine.

## Vérifier et publier

Installer Python 3.12 ou plus récent, puis :

```sh
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python scripts/check_site.py --stage
python scripts/check_browser.py
```

Les contrôles vérifient les liens locaux, les images, les métadonnées, les données
structurées (syntaxe), le sitemap, l’affichage à quatre largeurs, l’accessibilité
automatisée et le consentement. Les tests remplacent Google par une simulation :
ils ne créent aucune visite Analytics et ne vérifient pas les réglages du compte.
Un contrôle visuel et une vérification réelle après publication restent nécessaires.

Le workflow `.github/workflows/pages.yml` contrôle chaque modification et publie
`dist/` seulement si les contrôles réussissent. Dans Settings → Pages, la source
doit être **GitHub Actions**. Les documents, outils et audits locaux sont exclus
de l’archive publiée. Un échec laisse la dernière version publiée en place.

Lors d’un changement important de contenu, actualiser la date `lastmod` de la page
concernée dans `sitemap.xml` à la date réelle du changement. Vérifier aussi les
descriptions, les informations partagées et les textes des données structurées.
Ne pas réencoder les photos déjà compressées ; repartir d’un original.

GitHub Pages gère les en-têtes de cache. Un fichier `_headers` ne les configure
pas sur cet hébergeur. Pour un changement incompatible d’un fichier partagé,
changer son nom ou sa version dans les références HTML et mettre à jour les
contrôles ; ne pas compter sur un effacement du cache des visiteurs.

## Réglages externes

- GA4 existant : `G-6GML1CR323`. La durée demandée pour les données détaillées est
  **2 mois**, à régler et vérifier dans l’administration GA4 ; le code du site ne
  peut pas modifier ce paramètre. Le choix de consentement et les cookies ont une
  durée distincte de 180 jours. La collecte reste bloquée avant acceptation.
- Domaine principal : `cedatoutfaire.org`. Les quatre adresses A de GitHub Pages
  sont `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
- Pour HTTPS avec `www`, le DNS attendu est un CNAME `www` vers
  `soulsurfer17.github.io`, sans chemin, en remplacement de la redirection de
  domaine existante pour `www`. Préserver les autres entrées DNS. Vérifier ensuite
  le certificat et la redirection HTTPS vers le domaine principal.

Ces réglages externes doivent être confirmés dans leurs comptes respectifs ;
leur description ici ne vaut pas confirmation de leur application.
