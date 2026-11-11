// 主題檢查：node tools/check_theme.mjs [主題資料夾]
// 檢查欄位齊不齊、圖示在不在，並列出每題算出來的度數與瓶數，方便人工核對。
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const dir = process.argv[2] || 'themes/save-power';
const win = {};
const ctx = vm.createContext({ window: win });
for (const f of ['icons.js', 'theme.js']) {
  const p = path.join(dir, f);
  if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: p });
}
const T = win.THEME, ICONS = win.THEME_ICONS || {};
const errs = [], warns = [];
const err = (m) => errs.push(m), warn = (m) => warns.push(m);
if (!T) { console.error('讀不到 window.THEME'); process.exit(1); }

const C = T.constants || {};
for (const k of ['kgCO2PerKwh', 'kgPerBottle', 'pricePerKwh', 'source']) if (C[k] == null) err(`constants.${k} 沒填`);
for (const k of ['id', 'name', 'resource', 'board', 'questions', 'chance', 'titles', 'idCard']) if (T[k] == null) err(`缺少區塊 ${k}`);

const kwhOf = (u) => !u ? 0 : Array.isArray(u) ? u.reduce((a, x) => a + kwhOf(x), 0) : u.kwh != null ? u.kwh : u.watts * u.minutes / 60000 * (u.factor ?? 1);
const bottles = (k) => k * C.kgCO2PerKwh / C.kgPerBottle;
const checkUse = (u, where) => {
  if (!u) return;
  for (const x of Array.isArray(u) ? u : [u]) {
    if (x.kwh != null) continue;
    if (!(x.watts > 0) || !(x.minutes > 0)) err(`${where}：use 要有 watts 和 minutes（或 kwh）`);
  }
};
const checkIcon = (key, where) => {
  if (!key) return warn(`${where}：沒有圖示`);
  if (/\.(svg|png|jpe?g|webp)$/i.test(key)) {
    const p = path.join(dir, 'images', key);
    if (!fs.existsSync(p)) err(`${where}：找不到圖片 ${p}`);
    else if (fs.statSync(p).size > 300 * 1024) warn(`${where}：圖片超過 300 KB（${key}）`);
  } else if (!ICONS[key]) warn(`${where}：圖示「${key}」不在 icons.js，會當成文字顯示`);
};

// 棋盤
const ring = T.board.filter((s) => s.type !== 'finish');
if (ring.length < 8 || ring.length % 2) err(`棋盤外圈要是偶數格且至少 8 格，現在是 ${ring.length} 格`);
if (ring[0]?.type !== 'start') err('棋盤第一格要是 start');
const used = new Set();
T.board.forEach((s, i) => {
  const w = `棋盤第 ${i + 1} 格（${s.name}）`;
  checkIcon(s.icon, w);
  if (s.type === 'choice' || (s.type === 'finish' && s.question)) {
    if (!T.questions[s.question]) err(`${w}：找不到題目 ${s.question}`); else used.add(s.question);
  }
  if (s.type === 'action') { if (!s.task) err(`${w}：action 要有 task`); checkUse(s.use, w); }
});

// 題庫
const rows = [];
let worst = 0, best = 0;
for (const [id, q] of Object.entries(T.questions)) {
  const w = `題目 ${id}`;
  if (!q.say) err(`${w}：沒有 say（題目文字，也是朗讀文字）`);
  if (!q.feedback) warn(`${w}：沒有 feedback`);
  if (!Array.isArray(q.options) || q.options.length !== 2) { err(`${w}：要剛好 2 個選項`); continue; }
  const ks = q.options.map((o, i) => { if (!o.label) err(`${w} 選項 ${i + 1}：沒有 label`); checkIcon(o.icon, `${w}「${o.label}」`); checkUse(o.use, `${w}「${o.label}」`); return kwhOf(o.use); });
  if (ks[0] === ks[1]) err(`${w}：兩個選項耗電一樣，分不出哪個比較省`);
  if (!used.has(id)) warn(`${w}：棋盤上沒有用到`);
  const hi = Math.max(...ks), lo = Math.min(...ks);
  worst += bottles(hi); best += bottles(lo);
  rows.push([id, q.options[ks[0] >= ks[1] ? 0 : 1].label, hi, q.options[ks[0] >= ks[1] ? 1 : 0].label, lo]);
}
T.chance.forEach((c, i) => {
  const w = `機會卡 ${i + 1}`;
  if (!c.say) err(`${w}：沒有 say`);
  if (!['cost', 'save'].includes(c.effect)) err(`${w}：effect 要是 cost 或 save`);
  if (!c.use) err(`${w}：沒有 use（不接受象徵值）`); checkUse(c.use, w); checkIcon(c.icon, w);
});
if (!T.titles.some((t) => t.default)) err('titles 要有一個 default');
T.titles.forEach((t) => checkIcon(t.icon, `稱號「${t.name}」`));
(T.idCard.avatars || []).forEach((a) => checkIcon(a, '頭像'));
(T.idCard.ruler || []).forEach((r) => { checkIcon(r.icon, `換算尺「${r.label}」`); if (!(r.watts > 0)) err(`換算尺「${r.label}」沒有 watts`); });

// 報表
const f = (n) => n.toFixed(2).padStart(5);
console.log(`\n主題：${T.name}（${dir}）　係數 ${C.kgCO2PerKwh} kg/度，每瓶 ${C.kgPerBottle} kg\n`);
console.log('題目          耗電的選擇 → 度 / 瓶　｜　省電的選擇 → 度 / 瓶');
for (const [id, a, hi, b, lo] of rows) console.log(`${id.padEnd(11)} ${a}：${f(hi)} / ${f(bottles(hi))}　｜　${b}：${f(lo)} / ${f(bottles(lo))}`);
console.log('\n機會卡');
T.chance.forEach((c) => { const k = kwhOf(c.use); console.log(`  ${c.effect === 'save' ? '加' : '扣'} ${f(bottles(k))} 瓶（${f(k)} 度）　${c.say}`); });
const R = T.resource;
console.log(`\n平衡：起始 ${R.start} 瓶，過關門檻 ${R.goal.keepAtLeast} 瓶`);
console.log(`  每題都選耗電：用掉 ${worst.toFixed(2)} 瓶，剩 ${(R.start - worst).toFixed(2)}`);
console.log(`  每題都選省電：用掉 ${best.toFixed(2)} 瓶，剩 ${(R.start - best).toFixed(2)}`);
if (R.start - worst >= R.goal.keepAtLeast) warn('每題都選耗電也能過關，門檻太低');
if (R.start - best < R.goal.keepAtLeast) err('每題都選省電也過不了關，門檻太高');

console.log('');
warns.forEach((m) => console.log('⚠️  ' + m));
errs.forEach((m) => console.log('❌ ' + m));
console.log(errs.length ? `\n有 ${errs.length} 個錯誤要修。` : `\n✅ 通過（${warns.length} 個提醒）。`);
process.exit(errs.length ? 1 : 0);
