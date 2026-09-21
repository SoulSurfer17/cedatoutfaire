import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { cpSync } from 'node:fs';

export default defineConfig({
  base: './',
  plugins: [{ name: 'static-content', closeBundle() {
    for (const name of ['CNAME', '.nojekyll', 'ressources', 'reviews.json', 'site-runtime.js', 'site-runtime.css', 'page-entry.js', 'robots.txt', 'sitemap.xml', 'google64384478439e75c1.html']) {
      cpSync(resolve(name), resolve('dist', name), { recursive: true });
    }
  }}],
  build: { rollupOptions: { input: Object.fromEntries(['index', 'nettoyage-toiture', 'nettoyage-veranda', 'entretien-espaces-verts', 'realisations', 'qui-suis-je', 'privacy'].map(name => [name, resolve(`${name}.html`)])) } }
});
