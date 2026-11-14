# -*- coding: utf-8 -*-
"""雙語字卡「度（用電度數）」的示意圖（自己畫，不呼叫 Vertex、不花錢）。
2026-11-14 使用者：光是電表照片，學生沒感覺 → 照定義畫：1,000 瓦（1 kW）的電器連續使用 1 小時（h）所消耗的電，重點標示「一度電」。
用法：python tools/gen_kwh_card.py [輸出路徑]    預設 themes/save-power/images/meter.webp（512×512）
吹風機圖＝themes/save-power/art/hairdryer.webp（遊戲裡同一張卡通圖，約 1,000 瓦的常見電器）。"""
import sys, math, pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'themes/save-power/images/meter.webp'
S = 2                                    # 2 倍繪製再縮小，邊緣才平滑
W = H = 512 * S


def font(size, bold=True):
    for f in ('msjhbd.ttc' if bold else 'msjh.ttc', 'msjh.ttc', 'NotoSansTC-VF.ttf'):
        try:
            return ImageFont.truetype(f'C:/Windows/Fonts/{f}', size * S)
        except OSError:
            continue
    raise SystemExit('找不到中文字型')


def mono(size):
    for f in ('consolab.ttf', 'courbd.ttf', 'arialbd.ttf'):
        try:
            return ImageFont.truetype(f'C:/Windows/Fonts/{f}', size * S)
        except OSError:
            continue
    return font(size)


im = Image.new('RGB', (W, H), '#ffffff')
d = ImageDraw.Draw(im)
INK, GREEN, RED, GRAY = '#22303a', '#2b8a6e', '#d93025', '#7b8794'


def text_c(cx, cy, s, f, fill=INK):
    d.text((cx * S, cy * S), s, font=f, fill=fill, anchor='mm')


# 上排：1,000 瓦的電器 × 連續 1 小時
hd = Image.open(ROOT / 'themes/save-power/art/hairdryer.webp').convert('RGBA').resize((140 * S, 140 * S), Image.LANCZOS)
im.paste(hd, (44 * S, 28 * S), hd)
text_c(114, 190, '1,000 瓦', font(30), INK)
text_c(114, 222, '（1 kW）', font(24), GRAY)
text_c(256, 100, '×', font(52), GRAY)
cx, cy, r = 398, 98, 62
d.ellipse(((cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S), fill='#fff7e0', outline=INK, width=6 * S)
for k in range(12):
    a = math.radians(k * 30 - 90)
    d.line(((cx + (r - 12) * math.cos(a)) * S, (cy + (r - 12) * math.sin(a)) * S, (cx + (r - 4) * math.cos(a)) * S, (cy + (r - 4) * math.sin(a)) * S), fill=INK, width=3 * S)
d.line((cx * S, cy * S, cx * S, (cy - 42) * S), fill=INK, width=6 * S)                          # 分針指 12
a = math.radians(30 - 90)
d.line((cx * S, cy * S, (cx + 30 * math.cos(a)) * S, (cy + 30 * math.sin(a)) * S), fill=RED, width=7 * S)  # 時針指 1（從 12 走到 1＝1 小時）
d.arc(((cx - r + 14) * S, (cy - r + 14) * S, (cx + r - 14) * S, (cy + r - 14) * S), start=-90, end=-60, fill=RED, width=5 * S)
d.ellipse(((cx - 5) * S, (cy - 5) * S, (cx + 5) * S, (cy + 5) * S), fill=INK)
text_c(cx, 190, '連續 1 小時', font(30), INK)
text_c(cx, 222, '（h）', font(24), GRAY)

# 往下箭頭＋「所消耗的電」
d.polygon([(130 * S, 296 * S), (92 * S, 258 * S), (114 * S, 258 * S), (114 * S, 246 * S), (146 * S, 246 * S), (146 * S, 258 * S), (168 * S, 258 * S)], fill=GREEN)
d.polygon([(382 * S, 296 * S), (344 * S, 258 * S), (366 * S, 258 * S), (366 * S, 246 * S), (398 * S, 246 * S), (398 * S, 258 * S), (420 * S, 258 * S)], fill=GREEN)
text_c(256, 270, '所消耗的電', font(32), GREEN)

# 重點：一度電（黃色螢光筆底）
d.rounded_rectangle((46 * S, 314 * S, 466 * S, 478 * S), radius=34 * S, fill='#ffe27a', outline='#e0a800', width=5 * S)
text_c(256, 386, '一度電', font(92), '#b3261e')
text_c(256, 447, '＝ 1 kWh', font(34), INK)

im = im.resize((512, 512), Image.LANCZOS)
OUT.parent.mkdir(parents=True, exist_ok=True)
im.save(OUT, quality=92) if OUT.suffix.lower() == '.webp' else im.save(OUT)
print('寫入', OUT)
