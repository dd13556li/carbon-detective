# 減碳偵探（棋盤遊戲）

給特教班用的擲骰走格子遊戲。全班共用一片天空，每次用電就飄上一些「碳雲」，
每一格做一次二選一，一天結束時碳雲不超過門檻就過關，每人拿到一張數位「減碳身分證」。
碳雲是把看不見的二氧化碳畫出來；重量另外換成生活物品（礦泉水、大桶水、機車）讓學生有感覺。

- 純靜態網頁，沒有建置步驟：點兩下 `index.html` 就能玩，沒有網路也可以。
- 學生名字只留在瀏覽器的記憶體，關掉分頁就沒了，不會上傳。

## 結構

```
index.html            入口
engine/               引擎（棋盤、骰子、選擇卡、朗讀、身分證）。不含任何主題內容
themes/list.js        主題清單
themes/save-power/    節電主題：theme.js（內容）＋ icons.js（自繪圖示）＋ images/（題目卡寫實照片）
tools/check_theme.mjs 主題檢查程式
calculator/           第一節用的用電碳排計算器（獨立單頁，與遊戲引擎無關）
hunt/                 第一節用的「電費單尋寶」練習：在帳單上點出度數、金額、計費期間、電力排碳量（A／B／C 三層；帳單隨機抽、不與上一位重複，題目順序每次打亂）
                      帳單圖與寶藏位置 bills/、bills.js 由 淨零教案競賽/make_bills.py 產生，不要手改
engine/sfx.js         合成音效，棋盤遊戲與尋寶遊戲共用
lesson/               整合選單：依上課順序列出兩節課的全部遊戲與動畫（教案附錄一的 QR 指到這裡）
spin/                 第一節「碳排有多重？」轉盤：轉到幾度 → 選出幾公斤 → 拿起現場 1～5 公斤的重物
bag/                  第一節動畫「看不見的碳雲」：在家用電 → 發電廠燒煤、燒天然氣排出二氧化碳 → 飄上天 → 畫成碳雲
rank/                 第一節「吃電大戶排排站」：依序點家電排出吃電多→少，再看一個月各用幾度
overshoot/            第二節動畫「地球吸不完的碳雲」：一年 12 朵，7 月 30 日地球超載日之後留在天上
say/                  第二節「我會說省電」：抽一張省電卡，練習對家人說那一句
engine/activity.css   上面這幾頁共用的版型（觸控電視用：大字、大按鈕、只用點的）
engine/activity.js    共用小工具：朗讀、圖示、輪流上台（Act.turns：第 n 位 → 老師按 A／B／C → 全班結果）、動畫旁白（Act.story）
```

## 改題目或數字

只改 `themes/save-power/theme.js`。題目只寫瓦數和分鐘數，碳雲朵數由引擎算：

    度數 = 瓦數 × 分鐘 ÷ 60000
    朵數 = 度數 × constants.kgCO2PerKwh ÷ constants.kgPerUnit（1 朵＝0.5 公斤碳）

`resource` 設定單位（名稱、圖示、門檻 `goal.keepAtMost`），`compare` 是公斤換生活物品的清單（由輕到重）。

家電瓦數（`appliances`：計算器家電模式、排排站、教案附錄六共用）、轉盤度數（`spin.kwh`）、我會說的卡片（`sayCards`）也都在 theme.js，檢查程式會驗轉盤四捨五入後剛好是 1～5 公斤、瓦數不重複。

能源署每年公布新的電力排碳係數時，只改 `constants.kgCO2PerKwh` 和 `source`。

改完跑檢查，會列出每一題算出來的度數與朵數：

    node tools/check_theme.mjs themes/save-power

## 加一個新主題

1. 複製 `themes/save-power/` 成新資料夾，改 `theme.js` 的八個區塊。
2. 在 `themes/list.js` 加一行。
3. 跑 `node tools/check_theme.mjs themes/<新資料夾>`，沒有 ❌ 就能用。
4. 用 `index.html?theme=<id>` 開啟。

圖示三種寫法都可以：`icons.js` 裡的名稱、`images/` 資料夾裡的檔名（.svg／.png／.jpg）、或直接寫一個表情符號。

**AI 扁平圖示（棋盤、碳雲、頭像）**：主題的 `art` 把圖示名稱對到 `art/` 裡的圖，`icon()` 有就優先用（向量圖留作後備）。`python tools/gen_sheet.py draw --project <帳戶>` 一次畫成 5×4 圖表（畫風一致，會花錢），`cut` 切格、去背、轉 WebP（不花錢）。

**寫實照片（只用在大圖）**：主題的 `photos` 把圖示名稱對到 `images/` 裡的照片，題目卡選項與機會卡會改顯示照片；棋盤、狀態列、身分證仍用圖示（照片縮到格子大小反而不清楚）。
照片由 `python tools/gen_icons.py --project <帳戶>` 呼叫 Vertex 圖片模型產生到 `_icon_trial/`（不進版控，會花錢：`--project` 沒有預設、`--max-calls` 限制次數），看過後用 `python tools/build_photos.py` 裁邊轉成 512px WebP。成對的圖（例如開燈／關燈）以前一張為底圖修改，兩張只差那一處。

## 測試用網址

- `index.html?test=mid&tier=C`　直接開一題（tier 可換 A／B／C）
- `index.html?test=card`　直接看結果頁與身分證（加 `&flip=1` 看背面）
- `index.html?test=end`　自動玩完一整場

## 還沒做的

- 各隊比賽模式（`resource.mode: "versus"`）：資料格式有欄位，引擎目前只做全班合作。
- 主題範本資料夾、老師後台、成績匯出。

## 資料來源

- 電力排碳係數：經濟部能源署 114 年度民生住宅 0.471 公斤 CO₂e／度（2026-06-02 公布）
- 電熱水瓶保溫耗電：台電（5 公升能源效率 1 級每年約 233 度）
- 冷氣每調高 1℃ 約省電 6%：台電、經濟部能源署
- 清洗冷氣濾網每天約省 0.47 度：經濟部能源署節能月參考做法
- 機車重量：三陽迪爵 125（2026 年式碟煞）整備重量 102 公斤，三陽官網規格表
- 水的重量：1 公升約 1 公斤（500 mL 礦泉水約 0.5 公斤、5 公升大桶水約 5 公斤）
- 家電瓦數為常見機種概略值，上課前以實物標示核對

## 朗讀

- 二選一三級作答（`engine/engine.js` showChoice，仿金錢小達人；畫面只標 A／B／C）：C 簡單＝兩邊顯示朵數、少的閃動、選錯引導再選一次；B 普通＝提示＋兩邊度數與電費；A 困難＝只看圖，選完理由蓋成「❓ 為什麼？」，老師點開才顯示並朗讀。
- 即時語音：`engine/tts-zh.js`（棋盤、尋寶、計算器、課堂活動共用）。一律自動、不給選單（2026-11-12 定案）：檔尾 `ZhTTS.pickTW`（唯一定義）挑 Edge 雲端曉臻 → 雅婷（Chrome 上是 Windows 本機版）→ 品質優先，挑不到也照唸。
- 預錄語音（目前**沒有啟用**）：`python tools/gen_voice.py --project <帳戶>` 會從 `window.__voiceLines()` 拿固定句子（題目、回饋、機會卡、任務），用 Gemini 語音錄到 `themes/save-power/voice/`（檔名＝句子雜湊，附 `index.json`）。有 `index.json` 時引擎優先播預錄、沒有就用即時語音。會花錢：`--project` 沒有預設，`--dry-run` 只列句數不呼叫。

## 音效與頭像照片

- 音效全部由 Web Audio 即時合成（engine.js 的 `sfx`），音量偏小；設定頁與狀態列可關，朗讀會等音效結束才開始。
- 頭像可用學生照片（設定頁 📷）：裁成正方形後只放在網頁記憶體，不上傳、不寫進 localStorage、不放網址，重新整理就消失。使用前請取得家長同意。
