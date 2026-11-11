# 減碳偵探（棋盤遊戲）

給特教班用的擲骰走格子遊戲。全班共用一份「地球零用錢」，每一格做一次二選一，
走完一天後每人拿到一張數位「減碳身分證」。

- 純靜態網頁，沒有建置步驟：點兩下 `index.html` 就能玩，沒有網路也可以。
- 學生名字只留在瀏覽器的記憶體，關掉分頁就沒了，不會上傳。

## 結構

```
index.html            入口
engine/               引擎（棋盤、骰子、選擇卡、朗讀、身分證）。不含任何主題內容
themes/list.js        主題清單
themes/save-power/    節電主題：theme.js（內容）＋ icons.js（自繪圖示）
tools/check_theme.mjs 主題檢查程式
calculator/           第一節用的電費單碳排計算器（獨立單頁，與遊戲引擎無關）
```

## 改題目或數字

只改 `themes/save-power/theme.js`。題目只寫瓦數和分鐘數，瓶數由引擎算：

    度數 = 瓦數 × 分鐘 ÷ 60000
    瓶數 = 度數 × constants.kgCO2PerKwh ÷ constants.kgPerBottle

能源署每年公布新的電力排碳係數時，只改 `constants.kgCO2PerKwh` 和 `source`。

改完跑檢查，會列出每一題算出來的度數與瓶數：

    node tools/check_theme.mjs themes/save-power

## 加一個新主題

1. 複製 `themes/save-power/` 成新資料夾，改 `theme.js` 的八個區塊。
2. 在 `themes/list.js` 加一行。
3. 跑 `node tools/check_theme.mjs themes/<新資料夾>`，沒有 ❌ 就能用。
4. 用 `index.html?theme=<id>` 開啟。

圖示三種寫法都可以：`icons.js` 裡的名稱、`images/` 資料夾裡的檔名（.svg／.png／.jpg）、或直接寫一個表情符號。

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
- 家電瓦數為常見機種概略值，上課前以實物標示核對
