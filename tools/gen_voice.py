# -*- coding: utf-8 -*-
"""預錄遊戲的固定句子（Gemini 語音，經 Vertex）。
句子的唯一來源＝engine.js 的 window.__voiceLines()（本腳本用 Playwright 開遊戲去拿，不另寫一份）。
檔名＝句子內容的雜湊 → 題目文字一改，雜湊就變，舊檔自動不用、新句子自動補錄。
輸出 themes/save-power/voice/<雜湊>.mp3 與 index.json（引擎只播 index.json 裡有的）。

用法：python tools/gen_voice.py --project cuaji|hidarn [--max-calls N] [--dry-run]
🔴 --project 沒有預設：它決定扣哪個帳單帳戶，跑前先問使用者並確認該帳戶當下的抵免額餘額。
⚠️ location 一定要 global（us-central1 對 tts-preview 模型回 400）。"""
import sys, io, json, time, argparse, pathlib, wave
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'themes' / 'save-power' / 'voice'
ACCOUNTS = {
    'cuaji': ('gen-lang-client-0595501751', '帳單 017F18（cuaji0629，Free Trial，2026-12-10 到期）'),
    'hidarn': ('gen-lang-client-0655714065', '帳單 010DE9（hidarn，Google Developer Program）'),
}
MODEL = 'gemini-3.1-flash-tts-preview'
VOICE = 'Sulafat'
STYLE = ('你是一位台灣的特殊教育老師，正在帶學生玩節能減碳的遊戲。用台灣華語，語氣溫和、親切、有精神，'
         '咬字清楚，速度比平常慢一點，句子之間稍微停頓。數字照中文念（例如「26 度」念成「二十六度」）。'
         '請直接把下面的句子念出來，只輸出語音，不要加任何話。\n\n')


def lines():
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page()
        pg.goto((ROOT / 'index.html').as_uri()); pg.wait_for_timeout(1200)
        out = pg.evaluate('window.__voiceLines()'); b.close()
    return out


def to_mp3(pcm, path):
    from pydub import AudioSegment
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
    buf.seek(0)
    seg = AudioSegment.from_wav(buf)
    seg.export(path, format='mp3', bitrate='64k')
    return len(seg) / 1000


ap = argparse.ArgumentParser()
ap.add_argument('--project', choices=ACCOUNTS)
ap.add_argument('--max-calls', type=int, default=70)
ap.add_argument('--dry-run', action='store_true')
a = ap.parse_args()
sys.stdout.reconfigure(encoding='utf-8')
L = lines(); OUT.mkdir(parents=True, exist_ok=True)
todo = [x for x in L if not (OUT / f"{x['key']}.mp3").exists()]
print(f'{len(L)} 句，已有 {len(L) - len(todo)}，要錄 {len(todo)}（{sum(len(x["text"]) for x in todo)} 字）')
if a.dry_run or not todo:
    pass
else:
    if not a.project: sys.exit('要錄音必須指定 --project')
    from google import genai
    from google.genai import types
    pid, bill = ACCOUNTS[a.project]
    print(f'Vertex：{a.project} → {pid}，{bill}；上限 {a.max_calls} 次', flush=True)
    c = genai.Client(vertexai=True, project=pid, location='global', http_options=types.HttpOptions(timeout=180_000))
    cfg = types.GenerateContentConfig(response_modalities=['AUDIO'], speech_config=types.SpeechConfig(
        voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=VOICE))))
    calls, secs = 0, 0.0
    for x in todo:
        for attempt in range(2):                       # 沒回音訊就重錄一次
            if calls >= a.max_calls: break
            calls += 1
            try:
                r = c.models.generate_content(model=MODEL, contents=STYLE + x['text'], config=cfg)
            except genai.errors.ClientError as ex:
                if ex.code == 429: time.sleep(30); continue
                raise
            parts = (r.candidates[0].content.parts or []) if r.candidates else []
            pcm = next((p.inline_data.data for p in parts if p.inline_data), None)
            if pcm:
                d = to_mp3(pcm, OUT / f"{x['key']}.mp3"); secs += d
                print(x['key'], f'{d:.1f}s', x['text'][:24], flush=True); break
            print(x['key'], '沒有回音訊', flush=True)
        if calls >= a.max_calls: print('達呼叫上限，停止'); break
        time.sleep(1)
    print(f'共呼叫 {calls} 次，音訊 {secs:.0f} 秒')

# index.json 只列「現行句子且檔案存在」；不再使用的舊檔移到 _old/（歸檔不刪）
keep = {x['key'] for x in L if (OUT / f"{x['key']}.mp3").exists()}
for f in OUT.glob('*.mp3'):
    if f.stem not in keep:
        (OUT / '_old').mkdir(exist_ok=True); f.replace(OUT / '_old' / f.name); print('歸檔舊句', f.name)
(OUT / 'index.json').write_text(json.dumps(sorted(keep)), encoding='utf-8')
print('index.json：', len(keep), '句')
