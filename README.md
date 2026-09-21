# Ced A Tout Faire

Site publié sur https://cedatoutfaire.org/ avec GitHub Pages.
Le parcours 3D fonctionne sur ordinateur. Jusqu’à 760 px, le site utilise des images et une lecture classique sans charger Three.js.

## Préparer et vérifier

Avec Node 22 et Python 3.12 :

    npm ci
    npx playwright install chromium
    python -m pip install -r requirements-dev.txt
    python -m playwright install chromium
    npm run build
    python scripts/check_site.py
    npm test
    python scripts/check_browser.py --consent-only

Les contrôles de publication portent sur le dossier `dist`, les sept URL d’origine, les métadonnées SEO, le consentement, l’accessibilité et la navigation.
Le contrôle des caméras utilise le serveur de développement. Pour les tests sur le build, définir `TEST_PRODUCTION=1` avant `npm test`.

GitHub prépare et teste le site automatiquement. Seule la branche principale `main` peut être publiée. La branche `release/threejs-mobile` exécute les contrôles sans publier.
Le domaine, le fichier de validation Google et les réglages Analytics existants sont conservés. Les documents, tests et outils ne sont pas publiés.
Les avis proviennent de `reviews.json`, pas d’une récupération automatique chez Google.

## Retour au site classique

Le repère `site-classique-avant-3d-2026-09-21` conserve le site classique et son ancienne méthode de publication (révision b2b648bb56ac8c935ede6638c772a2b296876fa1).
Pour revenir en arrière, créer une modification qui restaure l’ensemble des fichiers suivis à cet état, puis la publier sur main. Ne pas effacer l’historique ni pousser de force.
Le dossier local `D:/Happy Appz/Site CATF` est aussi conservé intact comme sauvegarde supplémentaire.

Lors des prochaines modifications, travailler dans ce dépôt de publication. Le dossier `Site CATF threeJS` conserve la version de conception, mais ne publie pas automatiquement.
