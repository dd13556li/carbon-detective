// 主題包：節電「減碳偵探的一天」
// 題目只存瓦數與時間，瓶數由引擎用 constants 換算。改數字只改這個檔。
window.THEME = {
  id: "save-power",
  name: "減碳偵探的一天",
  en: "A Day of the Carbon Detectives",
  version: "1.0",
  intro: "全班一起過一天。每次用電，地球零用錢就會少一點。走完一天，還剩 6 瓶以上就過關！",

  // ① 資源
  resource: {
    name: "地球零用錢",
    unit: "瓶",
    start: 10,
    mode: "coop",
    goal: { keepAtLeast: 6 }
  },

  // ② 換算常數（每年更新只改這裡）
  constants: {
    kgCO2PerKwh: 0.471,
    source: "經濟部能源署 114 年度民生住宅電力排碳係數（2026-06-02 公布）",
    kgPerBottle: 0.5,
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
    { say: "看完電視，把插頭拔掉了！",     icon: "plug",      effect: "save", use: { watts: 10, minutes: 1440 } },
    { say: "順手關掉走廊沒人用的燈！",     icon: "lightsOff", effect: "save", use: { watts: 80, minutes: 120 } },
    { say: "把舊燈泡換成 LED 燈！",        icon: "ledLamp",   effect: "save", use: { watts: 50, minutes: 240 } },
    { say: "把冷氣的濾網洗乾淨了！",       icon: "filter",    effect: "save", use: { kwh: 0.47 },
      source: "經濟部能源署節能月參考做法：每月清洗冷氣濾網，每天約省 0.47 度。" }
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
    avatars: ["avatar1", "avatar2", "avatar3", "avatar4"],
    fields: [
      { key: "billKwh", label: "我家這期用了", unit: "度", from: "teacher", convert: "kwh" },
      { key: "left",    label: "全班守住了",   unit: "瓶", from: "game" },
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

  // ⑧ 雙語字卡與圖片來源
  glossary: [
    { zh: "度", en: "kWh" }, { zh: "二氧化碳", en: "CO₂" }, { zh: "省電", en: "save power" },
    { zh: "關掉", en: "turn off" }, { zh: "電費單", en: "electricity bill" }
  ],
  credits: [{ file: "icons.js", by: "全部圖示為自繪向量圖" }]
};
