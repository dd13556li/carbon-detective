// 兩節課的活動清單（唯一來源）：lesson/ 整合選單、cert/ 減碳身分認證都讀這一份；教案 build_docx.py 也照這裡的路徑寫網址
// href 以「子資料夾裡的頁面」為準（../xxx/index.html）。extra＝不是網頁、但認證要勾的活動（例如回家任務）
window.LESSON = [
    { title: '第一節　電費單會說話', items: [
      { href: '../hunt/index.html', icon: 'patrol', step: '發展活動一', nm: '電費單尋寶', kind: '遊戲', d: '在帳單上點出度數、金額、計費期間、電力排碳量（A／B／C 三層）' },
      { href: '../mission/index.html', icon: 'bulb', step: '發展活動二', nm: '用電碳排計算器', kind: '工具', d: '照任務選家電、輸入瓦數和一天幾小時，算出一個月幾度、排出幾公斤（舊版輸入度數的計算器仍在 calculator/）' },
      { href: '../spin/index.html', icon: 'waterJug', step: '發展活動三', nm: '碳排有多重？', kind: '遊戲', d: '轉盤轉到生活用電活動（看電視、開燈，也有同時用好幾樣），算出一個月共用幾度、排出幾公斤，再拿起那個重量提提看' },
      { href: '../bag/index.html', icon: 'cloud', step: '發展活動三', nm: '看不見的碳雲', kind: '動畫', d: '用電→發電廠燒煤燒天然氣→看不見的二氧化碳跑到空氣裡，畫成「碳雲」' },
      { href: '../rank/index.html', icon: 'ac', step: '綜合活動', nm: '吃電大戶排排站', kind: '遊戲', d: '把家電排成「吃電多 → 吃電少」，再看一個月各用幾度' },
    ] },
    { title: '第二節　減碳偵探的一天', items: [
      { href: '../overshoot/index.html', icon: 'earth', step: '引起動機', nm: '地球吸不完的碳雲', kind: '動畫', d: '一年 12 朵碳雲，到 7 月 30 日地球就吸不完了（地球超載日）' },
      { href: '../index.html', icon: 'chance', step: '發展活動一', nm: '減碳偵探的一天', kind: '遊戲', d: '全班擲骰走完「我的一天」，把碳雲擋在 4 朵以內，結束看作答總結' },
      { href: '../patrol/index.html', icon: 'patrol', step: '發展活動一', nm: '教室巡守', kind: '遊戲', d: '巡守任務的替代練習：教室裡有電器開著沒人用，點一下關掉（冰箱不能關）' },
      { href: '../say/index.html', icon: 't26', step: '發展活動二', nm: '我會說省電', kind: '遊戲', d: '抽一張省電卡，練習對家人說：「……，好嗎？」' },
    ] },
  ];
window.LESSON_EXTRA = [
  { id: 'home', icon: 'plug', step: '第一節 綜合活動', nm: '回家任務', kind: '任務', d: '和家人一起找一台家電的標示，或找到家裡電費單的度數，請家長簽回條' },
];
