// 教學範例電費單：電價、金額算法與版面的唯一來源。
//   尋寶遊戲的三張範例（淨零教案競賽/make_bills.py 用本檔產圖）與計算器的「隨機電費單」都用這一支。
//   電價：表燈非營業用、非時間電價，兩個月一期，各段度數 ×2（台電 2025-10-01 起費率；
//   前兩段與真實帳單上的「流動電費計算式」一致）。排碳係數讀 theme.js（經濟部能源署 114 年度民生住宅 0.471）。
//   版面參考台電電子帳單第 1 頁，不含任何真實個資、標誌、條碼。
//   CDBill.charge(kwh, summer) → { fee, parts:[[單價, 度數]] }
//   CDBill.make({ kwh, summer, month, period, pay, key, title }) → 帳單資料（含 total、co2）
//   CDBill.html(bill, { marked, label, random, hideCo2 })  hideCo2：電力排碳量蓋成「？？？」，讓學生自己用計算器算 → 一張帳單的 HTML（樣式都在 .cdb 底下，不影響頁面其他元素）
//   CDBill.random() → 一張隨機的教學範例帳單資料
(function () {
  const TH = window.THEME || {};
  const COEF = (TH.constants && TH.constants.kgCO2PerKwh) || 0.471;
  // 每月級距上限（度）與單價：[上限, 非夏月, 夏月]
  const TIERS = [[120, 1.78, 1.78], [330, 2.26, 2.55], [500, 3.13, 3.80], [700, 4.24, 5.14], [1000, 5.27, 6.44], [1e9, 7.03, 8.86]];
  const EBILL_OFF = 10;   // 電子帳單優惠減收 10 元
  const r1 = (x) => Math.round(x * 10 + 1e-9) / 10;   // 四捨五入到 0.1 元（+1e-9 免得 980.55 這種被浮點數吃成 980.5）

  function charge(kwh, summer) {
    let left = kwh, lo = 0; const parts = [];
    for (const [top, ns, s] of TIERS) {
      const seg = Math.min(left, (top - lo) * 2);
      if (seg <= 0) break;
      parts.push([summer ? s : ns, seg]); left -= seg; lo = top;
    }
    return { fee: r1(parts.reduce((a, [r, q]) => a + r * q, 0)), parts };
  }
  function make(b) {
    const { fee, parts } = charge(b.kwh, b.summer);
    return { ...b, fee, parts, total: Math.round(fee - EBILL_OFF + 1e-9), co2: Math.round(b.kwh * COEF) };
  }

  // ---- 隨機帳單：每期（兩個月）100–1000 度（教學設定的範圍）；計費期間 59–61 天，起日 6–7 月算夏月（整期落在 6/1–9/30） ----
  const pad = (n) => String(n).padStart(2, '0');
  const roc = (d) => `${d.getFullYear() - 1911}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  let seq = 0;
  function random(opt = {}) {
    const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const start = new Date(2026, ri(0, 11), ri(1, 28));
    const end = addDays(start, ri(58, 60)), pay = addDays(end, ri(20, 26));
    const summer = start.getMonth() >= 5 && start.getFullYear() === end.getFullYear() && end.getMonth() <= 8;
    const kwh = opt.kwh || ri(100, 1000);
    const n = opt.n || ++seq;
    return make({ key: String(n), title: `隨機電費單 第 ${n} 張`, kwh, summer,
      month: `${end.getFullYear() - 1911}年${end.getMonth() + 1}月`, period: `${roc(start)}至${roc(end)}`, pay: roc(pay) });
  }

  const CSS = `
.cdb{font-family:"Microsoft JhengHei","Noto Sans TC",sans-serif;color:#222;background:#fff;line-height:normal;text-align:left;font-size:16px;width:900px}
.cdb *{box-sizing:content-box}
.cdb .pg{width:900px;padding:26px 40px 70px;box-sizing:border-box;position:relative;overflow:hidden;background:#fff}
.cdb .tag{display:inline-block;border:2px solid #333;padding:2px 10px;font-size:20px}
.cdb .hd{margin-top:14px;background:#f4a9c4;height:76px;display:flex;align-items:center;position:relative}
.cdb .hd .co{color:#fff;font-size:30px;font-weight:700;padding-left:26px;width:330px;letter-spacing:4px}
.cdb .hd .t{position:absolute;left:350px;top:0;height:76px;background:#fde7ef;right:0;display:flex;flex-direction:column;justify-content:center;padding-left:40px;font-size:22px;clip-path:polygon(0 50%,30px 0,100% 0,100% 100%,30px 100%)}
.cdb .who{margin:14px 0 0 60px;color:#555;font-size:19px;line-height:1.5}
.cdb .row{display:grid;grid-template-columns:210px 190px 210px 1fr;gap:12px;margin-top:20px}
.cdb .box .h{background:#f4a9c4;color:#fff;font-weight:700;padding:5px 10px;font-size:16px;white-space:nowrap;overflow:hidden}
.cdb .box .v{border:2px solid #f4a9c4;border-top:0;padding:8px;text-align:center;font-size:19px}
.cdb .mid{display:grid;grid-template-columns:270px 310px minmax(0,1fr);gap:12px;margin-top:16px}
.cdb .pan{border:2px solid #f4a9c4;min-height:330px;font-size:16px;display:flex;flex-direction:column}
.cdb .pan .h{background:#f4a9c4;color:#fff;font-weight:700;padding:5px 10px;font-size:16px;white-space:nowrap}
.cdb .pan .b{padding:8px 10px;line-height:1.45;flex:1;display:flex;flex-direction:column}
.cdb .foot{margin-top:auto;font-size:14px}
.cdb .kv{display:flex;justify-content:space-between;gap:8px;white-space:nowrap}
.cdb .big{font-weight:700;font-size:19px}
.cdb .mask{background:#ddd;color:#888;padding:0 4px}
.cdb .wm{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}
.cdb .wm span{transform:rotate(-28deg);font-size:86px;font-weight:900;color:rgba(220,40,80,.13);white-space:nowrap}
.cdb .note{position:absolute;left:40px;right:40px;bottom:14px;font-size:14px;color:#666;border-top:1px dashed #bbb;padding-top:6px}
.cdb .mk{position:relative;display:inline-block;border:5px solid var(--c);border-radius:10px;padding:0 5px;font-weight:900;font-size:1.12em;background:#fff;white-space:nowrap}
.cdb .mk1{--c:#e0322b}.cdb .mk2{--c:#1f6fd1}.cdb .mk3{--c:#1e9e4a}.cdb .mk4{--c:#f08a00;font-size:1em}
.cdb .mk::before{position:absolute;top:-17px;right:-15px;width:28px;height:28px;border-radius:50%;background:var(--c);color:#fff;font-size:18px;line-height:28px;text-align:center;font-weight:900}
.cdb .mk1::before{content:'1'}.cdb .mk2::before{content:'2'}.cdb .mk3::before{content:'3'}.cdb .mk4::before{content:'4'}
.cdb .legend{display:flex;gap:18px;margin-top:10px;font-size:17px;font-weight:700}.cdb .legend b{border:4px solid var(--c);border-radius:8px;padding:0 6px}
.cdb .lab{position:absolute;right:40px;top:26px;font-size:20px;font-weight:700;color:#c0306a}
@media print{.cdb,.cdb *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
  // 樣式只放一次（同一頁多張帳單共用）
  function ensureCSS() {
    if (typeof document === 'undefined' || document.getElementById('cdb-css')) return;
    const s = document.createElement('style'); s.id = 'cdb-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  const fmt = (n, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const LEGEND = '<div class="legend"><b style="--c:#e0322b">① 度數</b><b style="--c:#1f6fd1">② 金額</b><b style="--c:#1e9e4a">③ 計費期間</b><b style="--c:#f08a00">④ 電力排碳量</b></div>';

  function html(b, opt = {}) {
    if (!opt.noCSS) ensureCSS();
    const marked = !!opt.marked;
    // 寶藏一律包 .t1–.t4（量位置用，不影響外觀）；標示版再加粗框 .mk（同一個寶藏出現兩次時只框第一個）
    const M = (n, t, mark = true) => `<span class="t${n}${marked && mark ? ` mk mk${n}` : ''}">${t}</span>`;
    const formula = b.parts.map(([r, q]) => `${r.toFixed(2)}×${q}`).join('+');
    const label = opt.label != null ? opt.label : `範例 ${b.key}：${b.title}`;
    return `<div class="cdb"><div class="pg">
<span class="tag">電子帳單</span><span class="lab">${label}</span>
<div class="hd"><div class="co">電費通知</div><div class="t"><div>${b.month} 電費通知（教學範例）</div><div style="font-size:18px">Electricity Bill (Sample)</div></div></div>
<div class="who"><span class="mask">郵遞區號</span><br><span class="mask">○○縣○○鄉○○街○號</span><br><span class="mask">○○○</span></div>
<div class="row">
 <div class="box"><div class="h">電號</div><div class="v">00-00-0000-00-0</div></div>
 <div class="box"><div class="h">扣款日期</div><div class="v">${b.pay}</div></div>
 <div class="box"><div class="h">應繳總金額</div><div class="v">${M(2, marked ? `${fmt(b.total)} 元` : `＊＊＊＊${fmt(b.total)} 元`)}</div></div>
 <div class="box"><div class="h">繳費資訊</div><div class="v" style="color:#999;font-size:15px">（範例不提供條碼）</div></div>
</div>
<div class="mid">
 <div class="pan"><div class="h">用戶資訊</div><div class="b">
  <div class="kv"><span>電價種類：</span><span>表燈　非營業用</span></div>
  <div class="kv"><span>時間種類：</span><span>非時間電價</span></div>
  <div class="kv"><span>用電地址：</span><span class="mask">○○○○</span></div>
  <div>計費度數（度）/ kWh</div>
  <div class="kv big"><span>　經常度數</span><span>${M(1, b.kwh)}</span></div>
  <div class="foot">計費期間：${marked ? '<br>' : ''}${M(3, b.period)}</div>
 </div></div>
 <div class="pan"><div class="h">計費內容</div><div class="b">
  <div class="kv"><span>流動電費</span><span>${fmt(b.fee, 1)} 元</span></div>
  <div class="kv"><span>電子帳單優惠減收金額</span><span>-${EBILL_OFF.toFixed(1)} 元</span></div>
  <div class="kv big" style="border-bottom:2px solid #333;margin-top:6px"><span>應繳總金額</span><span>${M(2, `${fmt(b.total)} 元`, false)}</span></div>
  <div class="foot">流動電費計算式：<br>$${fmt(b.fee, 1)}=${formula}<br>（${b.summer ? '夏月' : '非夏月'}，兩個月一期，各段度數 ×2）</div>
 </div></div>
 <div class="pan"><div class="h">其他資訊</div><div class="b">
  <div class="kv big"><span>電力排碳量</span><span>${M(4, opt.hideCo2 ? '<span class="mask">？？</span> 公斤' : `${b.co2} 公斤`)}</span></div>
  <div class="kv"><span>當期每度平均電價</span><span>${(b.fee / b.kwh).toFixed(2)} 元</span></div>
 </div></div>
</div>
${marked ? LEGEND : ''}
<div class="wm"><span>教學範例・非真實帳單</span></div>
<div class="note">版面參考台電電子帳單（已去除個資、標誌與條碼）；${opt.random ? '度數為隨機產生（每期 100～1,000 度）' : '度數依台電公布 2025 年住宅平均用電設定'}，金額依現行住宅累進電價計算，${opt.hideCo2 ? '電力排碳量請用碳排計算器算算看' : `電力排碳量＝度數 × ${COEF}`}。教學用，不可作為繳費憑證。</div>
</div></div>`;
  }

  // 放進別人的頁面時用這個：包在 Shadow DOM 裡，頁面的 .row／.note／.big 等樣式不會滲進帳單
  function mount(el, b, opt = {}) {
    const root = el.shadowRoot || el.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${CSS}</style>` + html(b, { ...opt, noCSS: true });
    return root.querySelector('.cdb');
  }
  window.CDBill = { COEF, TIERS, charge, make, random, html, mount, ensureCSS };
})();
