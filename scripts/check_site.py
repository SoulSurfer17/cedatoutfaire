"""Validate the static site and prepare an allowlisted Pages artifact."""
import argparse
from datetime import date
from html.parser import HTMLParser
import json
from pathlib import Path
import shutil
import xml.etree.ElementTree as ET
from urllib.parse import unquote, urlsplit

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DOMAIN = 'https://cedatoutfaire.org'
PAGES = ['index.html', 'nettoyage-toiture.html', 'nettoyage-veranda.html',
         'entretien-espaces-verts.html', 'qui-suis-je.html', 'realisations.html', 'privacy.html']
ASSETS = ['site-runtime.css', 'site-runtime.js', 'reviews.json', 'robots.txt',
          'sitemap.xml', 'CNAME', '.nojekyll', 'google64384478439e75c1.html', 'ressources']


class Document(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.tags, self.ids, self.jsonld = [], [], []
        self.in_json, self.buffer = False, ''
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.in_json, self.buffer = True, ''

    def handle_data(self, data):
        if self.in_json:
            self.buffer += data

    def handle_endtag(self, tag):
        if tag == 'script' and self.in_json:
            self.jsonld.append(json.loads(self.buffer))
            self.in_json = False

    def select(self, tag, **attrs):
        return [a for t, a in self.tags if t == tag and all(a.get(k) == v for k, v in attrs.items())]


def check():
    docs = {name: Document((ROOT / name).read_text(encoding='utf-8')) for name in PAGES}
    descriptions, canonical_urls = set(), set()
    for name, doc in docs.items():
        assert len(doc.ids) == len(set(doc.ids)), f'{name}: duplicate IDs'
        assert len(doc.select('h1')) == 1, f'{name}: expected one H1'
        assert len(doc.select('title')) == 1, f'{name}: expected one title'
        assert not doc.select('form'), f'{name}: contact forms are not used on this site'
        description = doc.select('meta', name='description')
        assert len(description) == 1 and description[0].get('content'), f'{name}: description missing'
        assert description[0]['content'] not in descriptions, f'{name}: duplicate description'
        descriptions.add(description[0]['content'])
        expected = DOMAIN + '/' + ('' if name == 'index.html' else name)
        assert doc.select('link', rel='canonical') == [{'rel':'canonical', 'href':expected}], f'{name}: canonical URL'
        canonical_urls.add(expected)
        assert len(doc.select('script', src='site-runtime.js')) == 1, f'{name}: shared script missing or duplicated'
        assert len(doc.select('link', rel='stylesheet', href='site-runtime.css')) == 1, f'{name}: shared stylesheet'
        assert {'cookie-banner', 'cookie-settings', 'cookie-accept', 'cookie-decline'} <= set(doc.ids), f'{name}: consent controls'
        assert not any('google' in a.get('src', '').lower() for a in doc.select('script')), f'{name}: Google must load through consent'
        for tag, attrs in doc.tags:
            for key in ('href', 'src'):
                if not attrs.get(key):
                    continue
                url = urlsplit(attrs[key])
                if url.scheme not in ('', 'https', 'http') or (url.netloc and url.netloc != 'cedatoutfaire.org'):
                    continue
                target = unquote(url.path).lstrip('/') or (name if not url.netloc else 'index.html')
                assert (ROOT / target).is_file(), f'{name}: missing {target}'
                if url.fragment and target in docs:
                    assert unquote(url.fragment) in docs[target].ids, f'{name}: missing anchor {target}#{url.fragment}'
            if tag == 'img':
                assert attrs.get('alt'), f'{name}: image needs a description'
                with Image.open(ROOT / unquote(attrs['src'])) as im:
                    assert (int(attrs.get('width', 0)), int(attrs.get('height', 0))) == im.size, f'{name}: wrong image dimensions {attrs["src"]}'
        icons = doc.select('link', rel='icon')
        assert len(icons) == 1, f'{name}: favicon'
        with Image.open(ROOT / icons[0]['href']) as im:
            assert im.width == im.height and im.width >= 48, f'{name}: square favicon required'
        if name != 'privacy.html':
            assert doc.jsonld, f'{name}: structured data missing'
    ns = {'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
    entries = ET.parse(ROOT / 'sitemap.xml').findall('s:url', ns)
    urls = [entry.findtext('s:loc', namespaces=ns) for entry in entries]
    assert len(urls) == len(set(urls)) and set(urls) == canonical_urls, 'Sitemap and canonical pages differ'
    for entry in entries:
        assert date.fromisoformat(entry.findtext('s:lastmod', namespaces=ns)) <= date.today(), 'Future sitemap date'
    assert 'Sitemap: ' + DOMAIN + '/sitemap.xml' in (ROOT / 'robots.txt').read_text(), 'robots sitemap'
    assert (ROOT / 'CNAME').read_text().strip() == 'cedatoutfaire.org', 'Unexpected domain'
    reviews = json.loads((ROOT / 'reviews.json').read_text(encoding='utf-8'))
    assert reviews['recentReviews'] and 0 <= reviews['ratingValue'] <= 5, 'Invalid reviews'
    for path in (ROOT / 'ressources').rglob('*.webp'):
        assert path.stat().st_size < 150_000, f'Image exceeds 150 KB: {path}'
    print(f'PASS: {len(docs)} pages, links, images, metadata, JSON-LD, sitemap and consent markup')


def stage():
    destination = ROOT / 'dist'
    assert destination.resolve() == ROOT.resolve() / 'dist', 'Refuse an unexpected artifact path'
    # Only this fixed, generated directory is replaced; never the workspace.
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir()
    for name in PAGES + ASSETS:
        source, target = ROOT / name, destination / name
        if source.is_dir():
            shutil.copytree(source, target)
        else:
            shutil.copy2(source, target)
    print('Prepared dist/ with public site files only')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--stage', action='store_true')
    args = parser.parse_args()
    check()
    if args.stage:
        stage()
