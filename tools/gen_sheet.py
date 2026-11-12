# -*- coding: utf-8 -*-
"""棋盤圖示、碳雲、頭像：請 Vertex 圖片模型一次畫成一張 5×4 圖表（畫風才會一致），再切成單張去背。
用法：
  python tools/gen_sheet.py draw --project cuaji|hidarn [--sheet 1|2] [--max-calls N]   # 畫圖表到 _icon_trial/sheet_raw_N.png（花錢）
  python tools/gen_sheet.py cut _icon_trial/sheet_raw_1.png [--sheet 1|2]                # 切格＋去背到 themes/save-power/art/（不花錢）
第 2 張以第 1 張為畫風參考圖。
🔴 --project 沒有預設：它決定扣哪個帳單帳戶，跑前先問使用者並確認該帳戶當下的抵免額餘額。"""
import sys, argparse, pathlib
from collections import deque
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
TRIAL = ROOT / '_icon_trial'
ART = ROOT / 'themes' / 'save-power' / 'art'
ACCOUNTS = {
    'cuaji': ('gen-lang-client-0595501751', '帳單 017F18（cuaji0629，Free Trial，2026-12-10 到期）'),
    'hidarn': ('gen-lang-client-0655714065', '帳單 010DE9（hidarn，Google Developer Program）'),
}
MODEL = 'gemini-3.1-flash-image'
# (圖示名稱, 這一格要畫什麼)；順序＝由左到右、由上到下
CELLS1 = [
    ('bed', '一張單人床，枕頭和棉被，代表「起床」'),
    ('bulb', '一顆亮著的燈泡，發出光芒'),
    ('hairdryer', '一支粉紅色吹風機，吹出幾道風'),
    ('kettle', '一個藍色的電熱水壺（快煮壺），冒著兩道蒸氣'),
    ('chance', '一張橘色的卡片，中間一個大大的白色問號，代表「機會卡」'),
    ('ac', '一台白色壁掛冷氣，下方吹出藍色冷風線'),
    ('t26', '一台白色壁掛冷氣，旁邊一台小電扇，冷氣右下角一個綠色小牌子寫著「26°」（這一格只能有這三個字元）'),
    ('patrol', '一個藍色放大鏡，鏡片裡一個綠色打勾，代表「巡守任務」'),
    ('lightsOff', '天花板的燈是關的（灰色、不發光），下面一個牆上開關切到關'),
    ('pcOn', '一台開著的電腦螢幕，畫面是藍色，有一條上升的折線'),
    ('tv', '一台開著的電視，畫面是藍天、綠色山丘和太陽'),
    ('hanger', '一件藍色 T 恤掛在衣架上，掛在曬衣竿上，旁邊一顆小太陽'),
    ('microwave', '一台微波爐，窗口裡一個橘色的碗'),
    ('ledLamp', '一盞細長的白色 LED 檯燈，發出淡藍白光'),
    ('moon', '一個黃色彎月和兩顆小星星，代表「睡覺」'),
    ('cloud', '一朵灰色、圓滾滾的雲，雲的中間用白色寫「CO₂」，代表「碳雲」（這一格只能有 CO₂ 這幾個字元）'),
    ('avatar1', '卡通學生頭像（只畫頭和肩膀，圓臉、微笑）：短髮男生，戴藍色鴨舌帽，穿校服'),
    ('avatar2', '卡通學生頭像（只畫頭和肩膀，圓臉、微笑）：綁馬尾的女生，穿校服'),
    ('avatar3', '卡通學生頭像（只畫頭和肩膀，圓臉、微笑）：戴圓框眼鏡的男生，穿校服'),
    ('avatar4', '卡通學生頭像（只畫頭和肩膀，圓臉、微笑）：短髮女生，戴黃色髮夾，穿校服'),
]
# 第 2 張：補遊戲裡還是手繪向量圖的（稱號、重量比較物）＋計算器電器選單原本用 emoji 的
CELLS2 = [
    ('fan', '一台藍白色的立扇（電風扇），正面，吹出幾道風線'),
    ('plug', '一個白色插頭已經從牆上插座拔出來，中間有一小段空隙，插頭線彎曲，代表「拔插頭」'),
    ('earth', '一顆微笑的地球（藍色海洋、綠色陸地），旁邊兩片小綠葉，代表「地球守護」'),
    ('waterBottle', '一瓶直立的透明寶特瓶礦泉水，藍色瓶蓋，瓶裡是淺藍色的水，沒有標籤文字'),
    ('waterJug', '一個 5 公升的大桶裝水（透明藍色方形大水桶、有提把），沒有標籤文字'),
    ('scooter', '一台機車（速克達），側面，整台入鏡，沒有騎士，沒有車牌'),
    ('riceCooker', '一台台灣家庭常見的電鍋（圓筒形、淺色外殼、蓋子上有把手），沒有任何品牌字樣'),
    ('fridge', '一台雙門冰箱（上下門），淺灰色，門上有把手'),
    ('phoneCharge', '一支手機接著充電線，螢幕上一個綠色的電池充電符號'),
]
# 版式：(欄, 列, 格子, 長寬比, 參考圖)。參考圖＝已審過的第 1 張，讓新圖示畫風一致
SHEETS = {1: (5, 4, CELLS1, '5:4', None), 2: (3, 3, CELLS2, '1:1', 'sheet_raw_1.png')}


def prompt(n):
    COLS, ROWS, CELLS, _, ref = SHEETS[n]
    return (('附上的圖是同一套遊戲已經在用的圖示，新圖示的畫風、線條粗細、外框、配色要跟它完全一樣。\n' if ref else '') +
          f'畫一張 {COLS} 欄 × {ROWS} 列、共 {COLS * ROWS} 格的遊戲圖示表，給特殊教育學生玩的節能減碳棋盤遊戲用。\n'
          '風格：彩色扁平插畫圖示，形狀簡單、圓潤可愛、顏色鮮明但柔和，每個圖示都有深灰色的粗外框，'
          '縮小到 80 像素還要認得出來。全部圖示畫風、線條粗細、配色要一致，像同一套貼圖。\n'
          '版面：整張是純白色背景（#FFFFFF），每個圖示置中放在自己的格子裡、四周留白，格子之間不要畫格線、不要編號、'
          '不要任何文字（除了指定的字元）、不要陰影、不要浮水印。人物一律是卡通，不要寫實人臉。\n'
          '由左到右、由上到下，每一格依序是：\n' +
          '\n'.join(f'{i + 1}. {d}' for i, (_, d) in enumerate(CELLS)))


def draw(a):
    from google import genai
    from google.genai import types
    pid, bill = ACCOUNTS[a.project]
    print(f'Vertex：{a.project} → {pid}，{bill}；上限 {a.max_calls} 次', flush=True)
    c = genai.Client(vertexai=True, project=pid, location='global', http_options=types.HttpOptions(timeout=300_000))
    TRIAL.mkdir(exist_ok=True)
    n = 1
    while (TRIAL / f'sheet_raw_{n}.png').exists(): n += 1
    _, _, _, aspect, ref = SHEETS[a.sheet]
    contents = ([types.Part.from_bytes(data=(TRIAL / ref).read_bytes(), mime_type='image/png')] if ref else []) + [prompt(a.sheet)]
    for i in range(a.max_calls):
        r = c.models.generate_content(model=MODEL, contents=contents, config=types.GenerateContentConfig(
            response_modalities=['IMAGE'], image_config=types.ImageConfig(aspect_ratio=aspect)))
        parts = (r.candidates[0].content.parts or []) if r.candidates else []
        img = next((p.inline_data.data for p in parts if p.inline_data), None)
        if img:
            f = TRIAL / f'sheet_raw_{n}.png'; f.write_bytes(img); print('ok', f.name, flush=True); return
        print('沒有回圖，重試')
    print('沒有成功')


def unbg(im):
    """從格子邊緣往內灌，把和邊緣相連的近白色變透明（圖示有深色外框，裡面的白色不會被灌到）。"""
    im = im.convert('RGBA'); w, h = im.size; px = im.load()
    white = lambda p: p[0] > 232 and p[1] > 232 and p[2] > 232
    seen = bytearray(w * h); q = deque()
    for x in range(w): q.extend([(x, 0), (x, h - 1)])
    for y in range(h): q.extend([(0, y), (w - 1, y)])
    while q:
        x, y = q.popleft()
        if not (0 <= x < w and 0 <= y < h) or seen[y * w + x]: continue
        seen[y * w + x] = 1
        if not white(px[x, y]): continue
        px[x, y] = (255, 255, 255, 0)
        q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    return im


def cut(path, n):
    COLS, ROWS, CELLS, _, _ = SHEETS[n]
    im = Image.open(path).convert('RGB'); W, H = im.size; cw, ch = W / COLS, H / ROWS
    ART.mkdir(parents=True, exist_ok=True)
    for i, (key, _) in enumerate(CELLS):
        c, r = i % COLS, i // COLS
        m = int(min(cw, ch) * 0.035)   # 往內縮，避開模型自己畫的淺灰格線
        cell = unbg(im.crop((int(c * cw) + m, int(r * ch) + m, int((c + 1) * cw) - m, int((r + 1) * ch) - m)))
        box = cell.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()
        if box: cell = cell.crop(box)
        side = int(max(cell.size) * 1.08)
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0)); sq.paste(cell, ((side - cell.width) // 2, (side - cell.height) // 2))
        sq.resize((256, 256), Image.LANCZOS).save(ART / f'{key}.webp', 'WEBP', quality=88)
    print('切好', len(CELLS), '張 →', ART)


ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest='cmd', required=True)
d = sub.add_parser('draw'); d.add_argument('--project', required=True, choices=ACCOUNTS); d.add_argument('--max-calls', type=int, default=2)
k = sub.add_parser('cut'); k.add_argument('path')
for x in (d, k): x.add_argument('--sheet', type=int, default=1, choices=SHEETS)
a = ap.parse_args(); sys.stdout.reconfigure(encoding='utf-8')
draw(a) if a.cmd == 'draw' else cut(a.path, a.sheet)
