"""Create display-sized WebP derivatives; keep the original photographs intact.
Run from the repository root with Pillow installed.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
VARIANTS = [
    ('logoCATF.webp', 'logoCATF-header.webp', 444, 90),
    ('moi.webp', 'moi-signature.webp', 128, 86),
    ('toiture.webp', 'toiture-card.webp', 240, 84),
    ('veranda.webp', 'veranda-card.webp', 240, 84),
    ('tonte.webp', 'tonte-card.webp', 240, 84),
    ('jardin/jardin_accueil_1.webp', 'jardin/jardin_accueil_1-card.webp', 400, 82),
    ('jardin/jardin_accueil_2.webp', 'jardin/jardin_accueil_2-card.webp', 400, 82),
    ('toiture.webp', 'toiture-mobile.webp', 400, 84),
    ('veranda.webp', 'veranda-mobile.webp', 400, 84),
    ('tonte.webp', 'tonte-mobile.webp', 400, 84),
    ('a_propos/a_propos.webp', 'a_propos/a_propos-card.webp', 280, 86),
]

def main():
    for source, target, width, quality in VARIANTS:
        src = ROOT / 'ressources' / source
        dst = ROOT / 'ressources' / target
        with Image.open(src) as image:
            image.thumbnail((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
            image.save(dst, 'WEBP', quality=quality, method=6)
        print(f'{target}: {src.stat().st_size:,} -> {dst.stat().st_size:,} bytes')

if __name__ == '__main__':
    main()
