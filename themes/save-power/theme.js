// 主題包：節電「減碳偵探的一天」
// 題目只存瓦數與時間，碳雲朵數由引擎用 constants 換算。改數字只改這個檔。
window.THEME = {
  id: "save-power",
  name: "減碳偵探的一天",
  en: "A Day of the Carbon Detectives",
  version: "1.0",
  intro: "全班一起過一天。每次用電，天上就會多一些碳雲，讓地球變熱。一天結束時，碳雲不超過 4 朵就過關！（真正的二氧化碳是看不見的氣體，碳雲是把它畫出來。）",

  // ① 資源
  // 排出去的壞東西，越用越多。1 朵＝constants.kgPerUnit 公斤的碳
  resource: {
    name: "天上的碳雲",
    unit: "朵", unitName: "碳雲",
    icon: "cloud",
    verbUp: "飄上", verbDown: "擋下",
    start: 0,
    max: 10,
    mode: "coop",
    goal: { keepAtMost: 4 },
    passText: "🎉 過關！全班把碳雲擋在 4 朵以內",
    failText: "碳雲有點多，再挑戰一次吧"
  },

  // ② 換算常數（每年更新只改這裡）
  constants: {
    kgCO2PerKwh: 0.471,
    source: "經濟部能源署 114 年度民生住宅電力排碳係數（2026-06-02 公布）",
    kgPerUnit: 0.5,          // 1 朵碳雲＝0.5 公斤碳 ≈ 1 度電的碳（0.471）
    pricePerKwh: 3.78,
    priceSource: "住宅平均電價，約每度 3.78 元",
    wattsNote: "家電瓦數為常見機種的概略值，上課前請以實物標示核對。"
  },

  // ③ 棋盤：一圈＝我的一天（finish 與 start 同一格）
  board: [
    { type: "start",  name: "起床",     icon: "bed" },
    { type: "choice", name: "房間",     icon: "bulb",      question: "q-light" },
    { type: "choice", name: "浴室",     icon: "hairdryer", question: "q-dryer" },
    { type: "choice", name: "廚房",     icon: "kettle",    question: "q-water" },
    { type: "chance", name: "機會",     icon: "chance" },
    { type: "choice", name: "教室",     icon: "ac",        question: "q-cool" },
    { type: "choice", name: "教室",     icon: "t26",       question: "q-temp" },
    { type: "action", name: "巡守任務", icon: "patrol",
      task: "離開座位，去關掉教室裡一個沒人用的電器！",
      en: "Turn it off!",
      use: { watts: 520, minutes: 60 } },
    { type: "choice", name: "體育課",   icon: "lightsOff", question: "q-pe" },
    { type: "choice", name: "電腦教室", icon: "pcOn",      question: "q-pc" },
    { type: "chance", name: "機會",     icon: "chance" },
    { type: "choice", name: "客廳",     icon: "tv",        question: "q-tv" },
    { type: "choice", name: "陽台",     icon: "hanger",    question: "q-laundry" },
    { type: "choice", name: "晚餐",     icon: "microwave", question: "q-dinner" },
    { type: "choice", name: "書桌",     icon: "ledLamp",   question: "q-lamp" },
    { type: "chance", name: "機會",     icon: "chance" },
    { type: "finish", name: "睡覺",     icon: "moon",      question: "q-sleep" }
  ],

  // ④ 題庫
  questions: {
    "q-light": {
      say: "起床了，房間暗暗的。", en: "The room is dark.",
      options: [
        { label: "開電燈 1 小時", icon: "bulb",    use: { watts: 20, minutes: 60 }, tag: "light" },
        { label: "拉開窗簾",      icon: "curtain", use: null,                        tag: "light" }
      ],
      feedback: "白天拉開窗簾，太陽光不用電。"
    },
    "q-dryer": {
      say: "洗完頭，頭髮濕濕的。", en: "My hair is wet.",
      options: [
        { label: "吹風機吹 10 分鐘",          icon: "hairdryer", use: { watts: 1200, minutes: 10 }, tag: "heat" },
        { label: "先用毛巾擦乾，再吹 3 分鐘", icon: "towel",     use: { watts: 1200, minutes: 3 },  tag: "heat" }
      ],
      feedback: "吹風機很耗電。先擦乾，吹的時間就變短。"
    },
    "q-water": {
      say: "想喝熱水。", en: "I want hot water.",
      options: [
        { label: "電熱水瓶保溫一整天",   icon: "pot",    use: { kwh: 0.64 },               tag: "heat" },
        { label: "要喝的時候再用快煮壺煮", icon: "kettle", use: { watts: 1500, minutes: 5 }, tag: "heat" }
      ],
      feedback: "保溫一整天，一直在用電。要喝再煮比較省。",
      source: "台電：5 公升電熱水瓶能源效率 1 級每年保溫耗電約 233 度，換算每天約 0.64 度。"
    },
    "q-cool": {
      say: "教室好熱！", en: "It's hot!",
      options: [
        { label: "開冷氣 1 小時", icon: "ac",  use: { watts: 900, minutes: 60 }, tag: "cool" },
        { label: "開電扇 1 小時", icon: "fan", use: { watts: 50, minutes: 60 },  tag: "cool" }
      ],
      feedback: "電扇用的電比冷氣少很多。不太熱的時候先開電扇。"
    },
    "q-temp": {
      say: "今天真的很熱，要開冷氣。溫度設幾度？", en: "Set the temperature.",
      options: [
        { label: "設 22 度",        icon: "t22", use: { watts: 900, minutes: 60 }, tag: "cool" },
        { label: "設 26 度加電扇", icon: "t26",
          use: [{ watts: 900, minutes: 60, factor: 0.76 }, { watts: 50, minutes: 60 }], tag: "cool" }
      ],
      feedback: "冷氣每調高 1 度，大約省 6% 的電。26 度加電扇一樣涼。",
      source: "台電、經濟部能源署：冷氣設定溫度每提高 1℃ 約可省電 6%。"
    },
    "q-pe": {
      say: "全班要去上體育課 1 小時。教室的燈和電扇呢？", en: "Time for P.E.",
      options: [
        { label: "開著沒關係", icon: "lightsOn",  use: { watts: 520, minutes: 60 }, tag: "off" },
        { label: "全部關掉",   icon: "lightsOff", use: null,                         tag: "off" }
      ],
      feedback: "沒有人在教室，燈和電扇開著就是浪費。"
    },
    "q-pc": {
      say: "要午休 1 小時了，電腦呢？", en: "Nap time.",
      options: [
        { label: "開著不關", icon: "pcOn",  use: { watts: 150, minutes: 60 }, tag: "off" },
        { label: "關機",     icon: "pcOff", use: null,                         tag: "off" }
      ],
      feedback: "不用的時候就關機。"
    },
    "q-tv": {
      say: "回到家，想看電視。", en: "I want to watch TV.",
      options: [
        { label: "開 2 小時，邊看邊滑手機", icon: "tv2h", use: { watts: 100, minutes: 120 }, tag: "tv" },
        { label: "只看想看的節目 1 小時",   icon: "tv1h", use: { watts: 100, minutes: 60 },  tag: "tv" }
      ],
      feedback: "沒有在看，就把電視關掉。"
    },
    "q-laundry": {
      say: "衣服洗好了，今天有太陽。", en: "The laundry is done.",
      options: [
        { label: "用烘衣機烘 1 小時", icon: "clothesDryer", use: { watts: 2000, minutes: 60 }, tag: "laundry" },
        { label: "晾在陽台",          icon: "hanger",       use: null,                           tag: "laundry" }
      ],
      feedback: "烘衣機非常耗電。有太陽就用晾的。"
    },
    "q-dinner": {
      say: "要加熱晚餐的飯菜。", en: "Heat up dinner.",
      options: [
        { label: "電鍋蒸 20 分鐘", icon: "riceCooker", use: { watts: 800, minutes: 20 }, tag: "heat" },
        { label: "微波爐 3 分鐘",  icon: "microwave",  use: { watts: 1000, minutes: 3 }, tag: "heat" }
      ],
      feedback: "加熱的時間短，用的電就少。"
    },
    "q-lamp": {
      say: "要寫功課 2 小時，開哪一盞檯燈？", en: "Homework time.",
      options: [
        { label: "舊式燈泡檯燈", icon: "oldLamp", use: { watts: 60, minutes: 120 }, tag: "light" },
        { label: "LED 檯燈",     icon: "ledLamp", use: { watts: 10, minutes: 120 }, tag: "light" }
      ],
      feedback: "LED 燈一樣亮，用的電少很多。"
    },
    "q-sleep": {
      say: "睡覺前想看一下電視。", en: "Bedtime.",
      options: [
        { label: "電視開著就睡著了，開了 8 小時", icon: "tvSleep", use: { watts: 100, minutes: 480 }, tag: "off" },
        { label: "設定 1 小時後自動關機",         icon: "tvTimer", use: { watts: 100, minutes: 60 },  tag: "off" }
      ],
      feedback: "用定時功能，睡著了電視會自己關。"
    }
  },

  // ⑤ 機會卡
  chance: [
    { say: "忘記關燈就出門了！",           icon: "bulb",      effect: "cost", use: { watts: 20, minutes: 480 } },
    { say: "電視開著，沒有人在看。",       icon: "tv",        effect: "cost", use: { watts: 100, minutes: 120 } },
    { say: "電腦螢幕整個晚上沒關。",       icon: "pcOn",      effect: "cost", use: { watts: 30, minutes: 600 } },
    { say: "冷氣開著，人卻離開房間 1 小時。", icon: "ac",     effect: "cost", use: { watts: 900, minutes: 60 } },
    { say: "看完電視，把延長線的開關關掉了！", icon: "plug", effect: "save", use: { watts: 10, minutes: 1440 } },   // 2026-11-13 原「把插頭拔掉」不符合生活習慣，改關延長線開關（同樣切斷待機電）
    { say: "順手關掉走廊沒人用的燈！",     icon: "lightsOff", effect: "save", use: { watts: 80, minutes: 120 } },
    { say: "把舊燈泡換成 LED 燈！",        icon: "ledLamp",   effect: "save", use: { watts: 50, minutes: 240 } },
    { say: "把冷氣的濾網洗乾淨了！",       icon: "filter",    effect: "save", use: { kwh: 0.47 },
      source: "經濟部能源署節能月參考做法：每月清洗冷氣濾網，每天約省 0.47 度。" }
  ],

  // ⑤之一 公斤換成生活物品（由輕到重）。水 1 公升約 1 公斤
  // 寫實照片：只用在題目卡選項與機會卡的大圖（棋盤、狀態列、身分證仍用 icons.js 圖示）。
  // 由 tools/gen_icons.py（Vertex 圖片模型）產生、教師看過，tools/build_photos.py 裁邊轉 WebP。
  // AI 畫的扁平圖示（棋盤、碳雲、頭像；第 2 張＝稱號、重量比較物、計算器電器選單）：tools/gen_sheet.py 一次畫成一張圖表再切開去背，教師看過。
  // 有列在這裡的圖示名稱就用 art/ 的圖，其他照舊用 icons.js。
  art: { bed: "bed.webp", bulb: "bulb.webp", hairdryer: "hairdryer.webp", kettle: "kettle.webp", chance: "chance.webp", ac: "ac.webp", t26: "t26.webp", patrol: "patrol.webp", lightsOff: "lightsOff.webp", pcOn: "pcOn.webp", tv: "tv.webp", hanger: "hanger.webp", microwave: "microwave.webp", ledLamp: "ledLamp.webp", moon: "moon.webp", cloud: "cloud.webp", avatar1: "avatar1.webp", avatar2: "avatar2.webp", avatar3: "avatar3.webp", avatar4: "avatar4.webp", fan: "fan.webp", plug: "plug.webp", earth: "earth.webp", waterBottle: "waterBottle.webp", waterJug: "waterJug.webp", scooter: "scooter.webp", riceCooker: "riceCooker.webp", fridge: "fridge.webp", phoneCharge: "phoneCharge.webp" },
  photos: { bulb: "bulb.webp", curtain: "curtain.webp", hairdryer: "hairdryer.webp", towel: "towel.webp", pot: "pot.webp", kettle: "kettle.webp", ac: "ac.webp", fan: "fan.webp", t22: "t22.webp", t26: "t26.webp", lightsOn: "lightsOn.webp", lightsOff: "lightsOff.webp", pcOn: "pcOn.webp", pcOff: "pcOff.webp", tv2h: "tv2h.webp", tv1h: "tv1h.webp", tvSleep: "tvSleep.webp", tvTimer: "tvTimer.webp", clothesDryer: "clothesDryer.webp", hanger: "hanger.webp", riceCooker: "riceCooker.webp", microwave: "microwave.webp", oldLamp: "oldLamp.webp", ledLamp: "ledLamp.webp", tv: "tv.webp", plug: "plug.webp", filter: "filter.webp" },
  compare: [
    { label: "瓶 500 mL 礦泉水", kg: 0.5, icon: "waterBottle" },
    { label: "大桶 5 公升的水",   kg: 5,   icon: "waterJug" },
    { label: "台機車",           kg: 102, icon: "scooter",
      source: "三陽迪爵 125（2026 年式碟煞）整備重量 102 公斤，三陽官網規格表" }
  ],

  // ⑥ 稱號：由上往下，第一個符合的
  titles: [
    { when: { allBetter: true, minChoices: 2 }, name: "地球守護隊長", en: "Earth Guardian",   icon: "earth" },
    { when: { tag: "cool", atLeast: 1 },        name: "涼風高手",     en: "Cool Breeze Pro",  icon: "fan" },
    { when: { tag: "off", atLeast: 1 },         name: "關機小隊長",   en: "Power-Off Leader", icon: "plug" },
    { when: { tag: "light", atLeast: 1 },       name: "省電燈光師",   en: "Light Saver",      icon: "ledLamp" },
    { when: { betterAtLeast: 1 },               name: "減碳偵探",     en: "Carbon Detective", icon: "patrol" },
    { default: true,                            name: "減碳見習偵探", en: "Junior Detective", icon: "patrol" }
  ],

  // ⑦ 身分證
  idCard: {
    title: "減碳身分證", en: "Carbon Saver ID",
    backWeight: "差不多 1 瓶 500 mL 水那麼重（約 1 朵碳雲）",
    avatars: ["avatar1", "avatar2", "avatar3", "avatar4"],
    fields: [
      { key: "billKwh", label: "我家這期用了", unit: "度", from: "teacher", convert: "kwh" },
      { key: "total",   label: "全班一天排了", unit: "朵碳雲", from: "game" },
      { key: "better",  label: "我選了省電",   unit: "次", from: "game" }
    ],
    stamps: [
      { id: "find",     label: "找到度數",     from: "teacher" },
      { id: "calc",     label: "算出碳排",     from: "teacher" },
      { id: "game",     label: "完成一天",     from: "game" },
      { id: "patrol",   label: "教室巡守",     from: "game" },
      { id: "nextBill", label: "下一期電費單", later: true }
    ],
    ruler: [
      { label: "冷氣",   icon: "ac",        watts: 900 },
      { label: "吹風機", icon: "hairdryer", watts: 1200 },
      { label: "電扇",   icon: "fan",       watts: 50 },
      { label: "LED 燈", icon: "ledLamp",   watts: 10 }
    ]
  },

  // ⑨ 課堂小遊戲（第一節 spin/、rank/，第二節 say/）。計算器的家電模式與教案附錄六也讀這一份
  // 家電：示例瓦數與每天使用時數（常見機種概略值，上課前以實物標示核對）
  appliances: [
    { key: "ac",          name: "冷氣",     watts: 900, hours: 8,  taskHours: [4, 6, 8] },
    { key: "riceCooker",  name: "電鍋",     watts: 800, hours: 1,  taskHours: [1, 2] },
    { key: "fridge",      name: "冰箱",     watts: 150, hours: 24, taskHours: [24] },
    { key: "tv",          name: "電視",     watts: 100, hours: 4,  taskHours: [2, 3, 4, 5] },
    { key: "bulb",        name: "電燈",     watts: 20,  hours: 6,  taskHours: [4, 5, 6, 8] },
    { key: "phoneCharge", name: "手機充電器", watts: 10,  hours: 3,  taskHours: [2, 3] }
  ],
  // 用電任務（mission/）出題：taskHours＝「一天用幾小時」從這幾個值隨機抽；瓦數就是上面的 watts
  // 碳排有多重？轉盤：生活中的用電活動（可以好幾樣同時用）。每格算「每天這樣用，一個月（30 天）」
  //   度數＝Σ 瓦數 × 小時 × 30 ÷ 1000（瓦數取 appliances）；只放「× kgCO2PerKwh 四捨五入剛好 1～5 公斤」的活動，
  //   各格公斤數不同 → 現場準備 1～5 公斤的重物，學生拿起來提提看（check_theme 會檢查）
  spin: { days: 30, acts: [
    { label: "開燈 5 小時",                             uses: [{ key: "bulb", hours: 5 }] },
    { label: "看電視 1 小時＋開燈 2 小時",               uses: [{ key: "tv", hours: 1 }, { key: "bulb", hours: 2 }] },
    { label: "看電視 2 小時",                           uses: [{ key: "tv", hours: 2 }] },
    { label: "看電視 2 小時＋開燈 5 小時",               uses: [{ key: "tv", hours: 2 }, { key: "bulb", hours: 5 }] },
    { label: "看電視 3 小時＋開燈 3 小時＋手機充電 2 小時", uses: [{ key: "tv", hours: 3 }, { key: "bulb", hours: 3 }, { key: "phoneCharge", hours: 2 }] }
  ] },
  // 我會說：抽一張，對家人說出這一句（icon＝art/ 的圖）
  // 中英雙語關鍵字卡（cards/ 字卡頁、教案附錄十三都讀這一份）。img 是從遊戲根目錄算起的路徑；
  // ebill／meter／co2／certBadge／netZero 由 tools/gen_icons.py 產生（2026-11-13），其餘重用遊戲裡現成的圖
  words: [
    { zh: "電費單", en: "Electricity Bill", say: "Electricity bill", when: "第一節 引起動機", img: "hunt/bills/B.webp", note: "教學範例帳單" },
    { zh: "電子帳單", en: "E-bill", say: "E-bill", when: "第一節 引起動機", img: "themes/save-power/images/ebill.webp" },
    { zh: "度（用電度數）", en: "kWh", say: "kilowatt-hour", when: "第一節 電費單尋寶", img: "themes/save-power/images/meter.webp" },
    { zh: "二氧化碳", en: "CO2（carbon dioxide）", say: "carbon dioxide", when: "第一節 度數變碳排", img: "themes/save-power/art/cloud.webp" },
    { zh: "節能", en: "Save Energy", say: "Save energy", when: "第一節 吃電大戶排排站", img: "themes/save-power/images/ledLamp.webp" },
    { zh: "碳排放", en: "Carbon Emissions", say: "Carbon emissions", when: "第二節 引起動機", img: "themes/save-power/images/co2.webp" },
    { zh: "碳雲", en: "Carbon Cloud", say: "Carbon cloud", when: "第二節 遊戲說明", img: "themes/save-power/art/cloud.webp", note: "教學比喻：把看不見的二氧化碳畫成雲" },
    { zh: "關掉", en: "Turn off", say: "Turn off", when: "第二節 巡守任務", img: "themes/save-power/images/lightsOff.webp" },
    { zh: "拔插頭", en: "Unplug", say: "Unplug", when: "第二節 我會說省電", img: "themes/save-power/images/plug.webp" },
    { zh: "減碳身分認證", en: "Carbon Saver Check", say: "Carbon saver check", when: "第二節 總結", img: "themes/save-power/images/certBadge.webp" },
    { zh: "淨零", en: "Net Zero", say: "Net zero", when: "第二節 總結", img: "themes/save-power/images/netZero.webp" },
  ],
  sayCards: [
    { icon: "t26",       line: "我們把冷氣調到 26 度，再開電扇，好嗎？", short: "冷氣 26 度＋電扇" },
    { icon: "lightsOff", line: "離開房間的時候，我們把燈關掉，好嗎？",   short: "隨手關燈", en: "Turn off!" },
    { icon: "phoneCharge", line: "手機充飽電了，我們把充電器拔下來，好嗎？", short: "拔充電器", en: "Unplug!" },
    { icon: "hanger",    line: "今天有太陽，我們把衣服晾在外面曬乾，好嗎？", short: "衣服曬太陽" },
    { icon: "ledLamp",   line: "燈壞了，我們換成 LED 燈，好嗎？",       short: "換 LED 燈" },
    { icon: "pcOn",      line: "電腦不用了，我們把它關掉，好嗎？",       short: "電腦關機", en: "Turn off!" },
    // 2026-11-13 加：生活中做得到的省電行動（與棋盤題目、校本「生活家電概論」的內容對得上，不含數字）
    { icon: "tv",        line: "沒有人在看的時候，我們把電視關掉，好嗎？", short: "沒人看就關電視", en: "Turn off!" },
    { icon: "fridge",    line: "拿完東西，我們把冰箱門馬上關好，好嗎？",   short: "冰箱門關好" },
    { icon: "fan",       line: "天氣不太熱，我們先開電扇就好，好嗎？",     short: "先開電扇" },
    { icon: "curtain",   line: "白天很亮，我們拉開窗簾，不用開燈，好嗎？", short: "拉開窗簾用陽光" },
    { icon: "towel",     line: "洗完頭，先用毛巾擦乾，再用吹風機吹，好嗎？", short: "先擦乾再吹" },
    { icon: "kettle",    line: "熱水煮好了，我們不要一直加熱保溫，好嗎？", short: "熱水不用一直加熱" },
    { icon: "filter",    line: "冷氣濾網髒了，我們把它洗乾淨，好嗎？",     short: "洗冷氣濾網" }
  ],

  // ⑧ 雙語字卡與圖片來源
  glossary: [
    { zh: "度", en: "kWh" }, { zh: "二氧化碳", en: "CO₂" }, { zh: "省電", en: "save power" },
    { zh: "關掉", en: "turn off" }, { zh: "電費單", en: "electricity bill" }
  ],
  credits: [{ file: "icons.js", by: "其餘小圖示為自繪向量圖" }, { file: "art/*.webp", by: "棋盤圖示、碳雲、頭像、稱號與比較物圖示由 AI 圖片模型（Google Vertex）生成，經教師審查" }, { file: "images/*.webp", by: "題目卡與機會卡的寫實照片由 AI 圖片模型（Google Vertex）生成，經教師審查" }]
};
