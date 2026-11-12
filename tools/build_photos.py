# -*- coding: utf-8 -*-
"""把 _icon_trial/ 審過的原圖做成遊戲用照片：裁掉四周白邊、補成正方形、512px WebP，
存到 themes/save-power/images/<key>.webp。用法：python tools/build_photos.py key1 key2 ...（不給就處理 theme.js photos 裡的全部）
不呼叫 Vertex、不花錢。"""
import sys, re, pathlib
from PIL import Image, ImageChops

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / '_icon_trial'
DST = ROOT / 'themes' / 'save-power' / 'images'

def keys_from_theme():
    s = (ROOT / 'themes' / 'save-power' / 'theme.js').read_text(encoding='utf-8')
    m = re.search(r'photos:\s*\{([^}]*)\}', s)
    return re.findall(r'(\w+):\s*[\'"]', m.group(1)) if m else []

def build(key):
    im = Image.open(SRC / f'{key}.png').convert('RGB')
    bg = Image.new('RGB', im.size, im.getpixel((4, 4)))
    box = ImageChops.difference(im, bg).convert('L').point(lambda v: 255 if v > 28 else 0).getbbox()
    if box: im = im.crop(box)
    w, h = im.size; side = int(max(w, h) * 1.06)
    sq = Image.new('RGB', (side, side), 'white'); sq.paste(im, ((side - w) // 2, (side - h) // 2))
    out = DST / f'{key}.webp'
    sq.resize((512, 512), Image.LANCZOS).save(out, 'WEBP', quality=82)
    return out

DST.mkdir(exist_ok=True)
total = 0
for k in (sys.argv[1:] or keys_from_theme()):
    f = build(k); total += f.stat().st_size
    print(f.name, f.stat().st_size // 1024, 'KB')
print('合計', total // 1024, 'KB')
