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

## Optimisation du démarrage 3D

Le décor opaque fixe est regroupé par matériau, avec les couleurs conservées par sommet. La végétation, les tuiles, le personnage et la clôture gardent leurs détails. Le point mobile et les vitres restent séparés. La première image utilise 20 appels de dessin au lieu de 632, pour les mêmes 33 910 triangles dans la vue de référence.

La construction rend régulièrement la main au navigateur. Les programmes du décor et des ombres sont préparés avec `compileAsync` ; le premier rendu reste masqué jusqu'à la fin du travail GPU, vérifiée sans attente bloquante. Les ombres sont recalculées quand le point mobile se déplace, puis réutilisées lors des seuls mouvements de caméra. La photo de secours n'est chargée qu'en cas d'échec WebGL ou sans JavaScript.

Les dérivés WebP sont reproductibles avec `python scripts/optimize_images.py`. Les originaux sont conservés. Les photos de services utilisent `srcset` pour conserver leur définition sur mobile, où elles sont affichées plus grandes. Le logo PC passe de 83 016 à 15 118 octets.

Pour comparer le démarrage, construire et servir le site, puis lancer :

    node scripts/measure_startup.mjs http://127.0.0.1:4184/

Trois essais locaux Chromium, à 1440 × 900, DPR 1 et sans ralentissement artificiel : médiane de la somme des dépassements de 50 ms des tâches longues, 189 ms avant et 21 ms après optimisation. Cette mesure couvre le démarrage jusqu'à 1,8 seconde après disponibilité de la scène ; elle ne constitue pas un score Lighthouse et dépend du matériel. Le score final doit être mesuré sur le site publié.

Les comparaisons du décor sur six cadrages conservent le rendu (écart moyen inférieur à 0,004 sur 255 par canal). Les tests de caméra vérifient aussi que les ombres réutilisées donnent les mêmes pixels qu'un recalcul et qu'aucun nouveau programme graphique n'est compilé au premier rendu après préparation.
