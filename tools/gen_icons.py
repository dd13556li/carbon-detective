# -*- coding: utf-8 -*-
"""試畫寫實風格圖示（Vertex 圖片模型）。不改遊戲，只把結果存進 _icon_trial/。
用法：python tools/gen_icons.py --project cuaji|hidarn [--max-calls N] [--only ac,scooter]
🔴 --project 沒有預設：它決定扣哪個帳單帳戶，跑前先問使用者並確認該帳戶當下的抵免額餘額。
成對圖示（例 lightsOff）以另一張（lightsOn）為底圖修改，兩張只差那一處。"""
import sys, time, argparse, pathlib
from google import genai
from google.genai import types

ACCOUNTS = {
    'cuaji': ('gen-lang-client-0595501751', '帳單 017F18（cuaji0629，Free Trial，2026-12-10 到期）'),
    'hidarn': ('gen-lang-client-0655714065', '帳單 010DE9（hidarn，Google Developer Program）'),
}
MODEL = 'gemini-3.1-flash-image'
OUT = pathlib.Path(__file__).resolve().parent.parent / '_icon_trial'

STYLE = ('寫實照片風格的圖示（單一物品或簡單的生活場景），給特殊教育學生看的教學遊戲用。'
         '純白背景，物品置中、完整入鏡、四周留白，柔和自然光，清楚好認。'
         '只畫指定的物品，不要人物（指定的手除外）、不要文字、不要數字（除非指定）、不要品牌標誌、不要浮水印。'
         '要能縮到 64 像素還認得出來：輪廓清楚、不要雜物。')
ITEMS = [
    # 題目卡：兩個選項各一張；成對的以前一張為底圖修改，兩張只差那一處
    ('bulb', '白天的小房間一角，正面對著一整面落地窗簾：窗簾完全拉上、從左到右整片遮住窗戶，完全看不到窗戶和外面。天花板的燈亮著，房間靠燈光照亮。'),
    ('curtain', ('bulb', '同一個房間、同一個角度。改兩件事，要非常明顯：①窗簾往兩側完全拉開、收到牆邊，露出整面窗戶，看得到外面的藍天和白雲，明亮的陽光照進房間；②天花板的燈關掉（燈罩不發光）。其他家具保持原樣。')),
    ('hairdryer', '一支吹風機，正在吹出熱風的樣子（可以有淡淡的風線），插頭線垂下。'),
    ('towel', '一條摺好的白色毛巾，旁邊放著一支沒有插電的吹風機（較小、在後方）。'),
    ('pot', '一台台灣家庭常見的電熱水瓶（直立大容量、上方有出水按鈕），插著電，指示燈亮著。'),
    ('kettle', '一台快煮壺（電熱水壺）放在底座上，旁邊一個空杯子。'),
    ('fan', '一台台灣家庭常見的立扇（電風扇），正面。'),
    ('t22', '一支冷氣遙控器，正面，液晶螢幕清楚顯示數字「22」和「°C」。'),
    ('t26', ('t22', '同一支遙控器，液晶螢幕的數字改成「26」；遙控器後方多一台小的立扇。其他保持原樣。')),
    ('pcOn', '一張書桌上的桌上型電腦，螢幕亮著顯示藍色桌面畫面（畫面上沒有文字），旁邊的椅子是空的。'),
    ('pcOff', ('pcOn', '同一個畫面：電腦螢幕關掉變成黑色。其他保持原樣。')),
    ('tv2h', '客廳一角：電視開著播放節目（畫面是模糊的風景，沒有文字），茶几上一支手機螢幕也亮著。沒有人。'),
    ('tv1h', ('tv2h', '同一個客廳、同一個角度：茶几上的手機不見了，只有電視開著。其他保持原樣。')),
    ('tvSleep', '夜晚的臥室：床上的棉被鼓起（像有人睡著，但看不到人），對面的電視還亮著，房間其他地方很暗。'),
    ('tvTimer', ('tvSleep', '同一個臥室、同一個角度：電視已經關掉變黑，房間整個是暗的。其他保持原樣。')),
    ('clothesDryer', '一台家用滾筒烘衣機，門關著，裡面看得到衣服。'),
    ('hanger', '台灣公寓陽台的曬衣竿，上面掛著幾件用衣架晾的衣服，陽光照著。'),
    ('microwave', '一台家用微波爐，門關著，裡面看得到一碗飯菜。'),
    ('oldLamp', '一盞舊式檯燈，燈罩下是透明的鎢絲燈泡（看得到燈絲），發出偏黃的光。'),
    ('ledLamp', '一盞現代的 LED 檯燈，細長的燈頭，發出白光。'),
    ('ac', '一台台灣家庭常見的白色分離式冷氣室內機（壁掛式），正面略側的角度。'),
    ('riceCooker', '一台台灣家庭常見的電鍋（大同電鍋那種圓筒外型，但不要任何品牌字樣），淺色外殼，蓋子蓋著。'),
    ('lightsOn', '從房間門口看進去的一小角：天花板吸頂燈亮著，房間明亮。畫面簡單。'),
    ('lightsOff', ('lightsOn', '同一個畫面、同一個角度、同樣的家具，只改一件事：燈關掉了，房間變暗（但還看得出輪廓）。其他全部保持原樣。')),
    # 機會卡
    ('tv', '寫實照片：客廳裡，從沙發後方斜側看過去，沙發是空的（沒有人），沙發對面的電視開著，螢幕播放模糊的風景節目（不要卡通、不要文字）。電視和沙發都清楚可見，電視不要被擋住。'),
    ('plug', '一個白色牆面插座，插孔是空的；一個插頭已經拔出來，被一隻手拿著、離插座約 10 公分，看得出插頭的兩根金屬片。插頭明顯沒有插在插座上。手只拍到手掌，不要拍到人。'),
    ('filter', '一片從冷氣拆下來的乾淨濾網（白色細網），旁邊有水滴，像剛洗好。'),
    # 試畫用（不在題目卡）
    ('scooter', '一台台灣常見的 125cc 速克達機車，側面視角，整台入鏡，沒有騎士，不要品牌標誌與車牌號碼。'),
    ('waterBottle', '一瓶 500 毫升的透明寶特瓶礦泉水，藍色瓶蓋，沒有標籤文字。'),
]

ap = argparse.ArgumentParser()
ap.add_argument('--project', required=True, choices=ACCOUNTS)
ap.add_argument('--max-calls', type=int, default=10)
ap.add_argument('--only', default='')
ap.add_argument('--force', action='store_true', help='已存在的也重畫')
a = ap.parse_args()
sys.stdout.reconfigure(encoding='utf-8')
OUT.mkdir(exist_ok=True)
pid, bill = ACCOUNTS[a.project]
print(f'Vertex：{a.project} → {pid}，{bill}；上限 {a.max_calls} 次', flush=True)
c = genai.Client(vertexai=True, project=pid, location='global', http_options=types.HttpOptions(timeout=300_000))
only = set(filter(None, a.only.split(',')))
calls = 0
for key, spec in ITEMS:
    if only and key not in only:
        continue
    if (OUT / f'{key}.png').exists() and not a.force:
        continue
    if calls >= a.max_calls:
        print('達呼叫上限，停止'); break
    contents = [f'{STYLE}\n\n【物品】{spec}'] if isinstance(spec, str) else None
    if contents is None:
        base, edit = spec
        src = OUT / f'{base}.png'
        if not src.exists():
            print(key, '缺底圖', src.name, '略過'); continue
        contents = [types.Part.from_bytes(data=src.read_bytes(), mime_type='image/png'), f'{STYLE}\n\n【修改】{edit}']
    calls += 1
    for attempt in range(4):
        try:
            r = c.models.generate_content(model=MODEL, contents=contents, config=types.GenerateContentConfig(
                response_modalities=['IMAGE'], image_config=types.ImageConfig(aspect_ratio='1:1')))
            break
        except genai.errors.ClientError as ex:
            if ex.code != 429 or attempt == 3: raise
            time.sleep(30 * (attempt + 1))
    parts = (r.candidates[0].content.parts or []) if r.candidates else []
    img = next((p.inline_data.data for p in parts if p.inline_data), None)
    if not img:
        print(key, '沒有回圖'); continue
    (OUT / f'{key}.png').write_bytes(img)
    print(key, 'ok', len(img), flush=True)
print('共呼叫', calls, '次')
