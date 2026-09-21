"""Validate the built Pages artifact, never the development source tree."""
from datetime import date
from html.parser import HTMLParser
import json
import hashlib
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET

REPO = Path(__file__).resolve().parents[1]
ROOT = REPO / 'dist'
DOMAIN = 'https://cedatoutfaire.org'
PAGES = ['index.html','nettoyage-toiture.html','nettoyage-veranda.html','entretien-espaces-verts.html','realisations.html','qui-suis-je.html','privacy.html']
class Document(HTMLParser):
    def __init__(self, source):
        super().__init__(); self.tags=[];self.ids=[];self.meta={};self.title=False;self.jsonld=[];self.json_text=None
        self.headings=[];self.heading=None;self.text=[];self.skip_text=0
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        a=dict(attrs);self.tags.append((tag,a))
        if tag in ('script','style'):self.skip_text+=1
        if tag in ('h1','h2','h3','h4','h5','h6'):
            self.heading={'level':int(tag[1]),'text':''};self.headings.append(self.heading)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='title':self.title=True
        if tag=='meta' and a.get('name') in ['description','robots']:self.meta[a['name']]=a.get('content')
        if tag=='link' and a.get('rel')=='canonical':self.meta['canonical']=a.get('href')
        if tag=='script' and a.get('type')=='application/ld+json':self.json_text=''
    def handle_data(self,data):
        if not self.skip_text:self.text.append(data)
        if self.heading is not None:self.heading['text']+=data
        if self.title:self.meta['title']=self.meta.get('title','')+data
        if self.json_text is not None:self.json_text+=data
    def handle_endtag(self,tag):
        if tag in ('script','style'):self.skip_text-=1
        if self.heading is not None and tag=='h'+str(self.heading['level']):self.heading=None
        if tag=='title':self.title=False
        if tag=='script' and self.json_text is not None:self.jsonld.append(json.loads(self.json_text));self.json_text=None
    def select(self,tag):return [a for t,a in self.tags if t==tag]

def check():
    baseline=json.loads((REPO/'scripts/seo-baseline.json').read_text(encoding='utf-8'))
    content_baseline=json.loads((REPO/'scripts/content-baseline.json').read_text(encoding='utf-8'))
    docs={name:Document((ROOT/name).read_text(encoding='utf-8')) for name in PAGES}
    def check_url(name,href):
        url=urlsplit(urljoin(DOMAIN+'/'+name,href))
        if url.scheme not in ('http','https') or url.netloc!='cedatoutfaire.org':return
        target=unquote(url.path).lstrip('/') or 'index.html'
        path=(ROOT/target).resolve()
        assert ROOT.resolve() in path.parents and path.is_file(),f'{name}: missing local file {target}'
        if url.fragment and target in docs:assert unquote(url.fragment) in docs[target].ids,f'{name}: missing anchor {href}'
    for name,doc in docs.items():
        assert doc.meta==baseline[name],f'{name}: SEO metadata changed: {doc.meta}'
        assert len(doc.select('h1'))==1 and len(doc.select('title'))==1,f'{name}: page heading/title'
        text_hash=hashlib.sha256(' '.join(' '.join(doc.text).split()).encode('utf-8')).hexdigest()
        assert text_hash==content_baseline[name]['textSha256'],f'{name}: page text changed'
        assert doc.jsonld==content_baseline[name]['jsonld'],f'{name}: structured data changed'
        previous=0
        for heading in doc.headings:
            assert heading['text'].strip(),f'{name}: empty heading'
            assert heading['level']<=previous+1,f'{name}: heading level skipped before {heading}'
            previous=heading['level']
        counts={f'h{level}':sum(h['level']==level for h in doc.headings) for level in (1,2,3)}
        print(f'HEADINGS {name}: {counts}')
        assert len(doc.ids)==len(set(doc.ids)),f'{name}: duplicate IDs'
        assert {'cookie-banner','cookie-settings','cookie-accept','cookie-decline'}<=set(doc.ids),f'{name}: consent controls'
        if name!='privacy.html':assert doc.jsonld,f'{name}: missing structured data'
        for tag,a in doc.tags:
            for key in ('href','src'):
                if a.get(key):check_url(name,a[key])
            if a.get('srcset'):
                for candidate in a['srcset'].split(','):check_url(name,candidate.strip().split()[0])
            if tag=='img':
                assert 'alt' in a and int(a.get('width',0))>0 and int(a.get('height',0))>0,f'{name}: image semantics/dimensions'
            if tag=='script':assert not any(host in a.get('src','') for host in ['googletagmanager','google-analytics']),f'{name}: analytics bypasses consent'
    entries=ET.parse(ROOT/'sitemap.xml').findall('{*}url')
    urls=[e.findtext('{*}loc') for e in entries]
    assert len(urls)==len(set(urls)) and set(urls)=={d.meta['canonical'] for d in docs.values()},'Sitemap URLs'
    for e in entries:assert date.fromisoformat(e.findtext('{*}lastmod'))<=date.today(),'Future sitemap date'
    assert 'Sitemap: '+DOMAIN+'/sitemap.xml' in (ROOT/'robots.txt').read_text(),'robots sitemap'
    assert (ROOT/'CNAME').read_text().strip()=='cedatoutfaire.org','domain'
    for name in ['.nojekyll','google64384478439e75c1.html','page-entry.js','site-runtime.js','site-runtime.css','reviews.json']:
        assert (ROOT/name).is_file(),f'Missing publication file {name}'
    assert not any((ROOT/name).exists() for name in ['src','tests','scripts','node_modules','.git','audit']), 'Private development files in artifact'
    print('PASS: built pages, original SEO metadata, headings, links, images, structured data, consent, sitemap and domain')
if __name__=='__main__':check()
