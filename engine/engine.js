// 減碳偵探：棋盤遊戲引擎。這裡不放任何主題內容，內容都在 themes/<主題>/theme.js。
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const params = new URLSearchParams(location.search);
  const TEST = params.get('test'); // 測試用：mid＝直接開一題；end＝自動玩到結果頁
  const wait = (ms) => new Promise((r) => setTimeout(r, TEST === 'end' ? 0 : ms));
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  let T, C; // 主題、換算常數
  const S = { players: [], turn: 0, pos: 0, amt: 0, deck: [], ring: [], set: { diceMax: 3, speak: true, sfx: true } };

  // ---------- 換算 ----------
  function kwhOf(use) {
    if (!use) return 0;
    if (Array.isArray(use)) return use.reduce((a, u) => a + kwhOf(u), 0);
    if (use.kwh != null) return use.kwh;
    return use.watts * use.minutes / 60000 * (use.factor ?? 1);
  }
  // 資源＝排出去的壞東西（例如碳雲），越用越多；過關＝一天結束時不超過 goal.keepAtMost
  const kgPerUnit = () => C.kgPerUnit ?? C.kgPerBottle;
  const unitsOf = (kwh) => kwh * C.kgCO2PerKwh / kgPerUnit();
  const r1 = (n) => Math.round(n * 10) / 10;
  function fmtUnits(b) {
    if (b <= 0) return '0 ' + T.resource.unit;
    if (b < 0.1) return '一點點';
    return '約 ' + r1(b) + ' ' + T.resource.unit;
  }
  // 公斤 → 生活物品（主題的 compare 清單，由輕到重）：挑「至少 1 個」的最重那一項
  function compareText(kg, short) {
    const L = T.compare || [];
    if (!L.length || kg <= 0) return '';
    let it = L[0];
    for (const x of L) if (kg >= x.kg) it = x;
    const n = kg / it.kg, num = n < 1 ? '不到 1' : String(n >= 2 ? Math.round(n) : r1(n));
    if (short) return `≈ ${num} ${it.label}重`;            // 身分證上空間小
    return `${n < 1 ? '' : '差不多 '}${num} ${it.label}那麼重`;
  }
  const fmtKg = (kg) => kg < 10 ? r1(kg) : Math.round(kg);
  function fmtSub(kwh) {
    if (kwh <= 0) return '不用電';
    const k = kwh < 0.1 ? Math.round(kwh * 100) / 100 : r1(kwh);
    const yuan = kwh * C.pricePerKwh;
    return k + ' 度・約 ' + (yuan < 1 ? '不到 1' : Math.round(yuan)) + ' 元';
  }

  // ---------- 圖 ----------
  function icon(key) {
    if (!key) return '';
    const art = (T && T.art || {})[key];   // AI 畫的圖示（有就優先），沒有才用 icons.js 的向量圖
    if (art) return `<img class="ic art" src="${T.base}art/${esc(art)}" alt="">`;
    const lib = window.THEME_ICONS || {};
    if (/\.(svg|png|jpe?g|webp)$/i.test(key)) return `<img class="ic" src="${T.base}images/${esc(key)}" alt="">`;
    if (lib[key]) return `<svg class="ic" viewBox="0 0 64 64" aria-hidden="true">${lib[key]}</svg>`;
    return `<span class="ic emoji" aria-hidden="true">${esc(key)}</span>`;
  }
  // 大圖（題目卡、機會卡）：主題有寫實照片就用照片，沒有就用圖示。棋盤與小圖示一律用 icon()
  function photo(key) {
    const f = (T.photos || {})[key];
    return f ? `<img class="ic photo" src="${T.base}images/${esc(f)}" alt="">` : icon(key);
  }
  // 一個單位的圖（例如一朵碳雲）。fill 0–1：不滿一個就畫小一點、淡一點；0 畫成空位
  function unit(fill) {
    const f = Math.max(0, Math.min(1, fill));
    return `<span class="unit ${f <= 0 ? 'empty' : ''}" style="--f:${f.toFixed(2)}">${icon(T.resource.icon)}</span>`;
  }
  // 一排單位：amount 個，共畫 count 格；goal 有給就在門檻後面畫一條線
  function unitRow(amount, count, goal, cls = '') {
    let s = '';
    for (let i = 0; i < count; i++) { s += unit(amount - i); if (goal && i === goal - 1 && i < count - 1) s += '<i class="goalmark" aria-hidden="true"></i>'; }
    return `<div class="units ${cls}">${s}</div>`;
  }
  function costRow(b, cls) {
    if (b <= 0) return unitRow(0, 1, 0, cls);
    return unitRow(Math.max(b, 0.08), Math.max(1, Math.ceil(b - 1e-9)), 0, cls);
  }
  // 天空顏色：碳雲越多越灰
  const skyStyle = () => `--sky:${Math.round(Math.min(1, S.amt / (T.resource.max || 10)) * 100)}%`;

  // ---------- 聲音與朗讀 ----------
  // 音效：全部由 Web Audio 即時合成（沒有音檔）。音量偏小、不做刺耳或像處罰的聲音（有些學生對聲音敏感）。
  // 音效在 engine/sfx.js（與尋寶遊戲共用）
  const sfx = window.GameSfx.sfx;
  window.GameSfx.enabled = () => S.set.sfx;

  // 朗讀：預錄語音（themes/<主題>/voice/，檔名＝句子內容的雜湊）優先，沒有才用瀏覽器即時語音。
  // 句子只在這支程式產生一次；tools/gen_voice.py 透過 window.__voiceLines() 拿同一批句子去錄，不另寫一份。
  let VOICE = null, curAudio = null, speakSeq = 0;
  function voiceKey(text) {                     // FNV-1a 32 位元，16 進位 8 碼
    let h = 0x811c9dc5;
    for (const ch of String(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }
  function stopVoice() {
    speakSeq++;
    if (curAudio) { try { curAudio.pause(); } catch (e) {} curAudio = null; }
    if (window.ZhTTS) ZhTTS.cancel();
  }
  function liveSpeak(text) {
    if (!window.ZhTTS) return;
    ZhTTS.speak(text, { voice: ZhTTS.pickTW() || undefined, rate: 0.9 });   // 挑不到語音也照唸（交給系統）
  }
  function speak(text) {
    if (!S.set.speak || TEST === 'end' || !text) return;
    stopVoice();
    const wait = window.GameSfx.until() - performance.now();
    const my = speakSeq;
    if (wait > 20) { setTimeout(() => { if (my === speakSeq) speakNow(text); }, wait); return; }
    speakNow(text);
  }
  function speakNow(text) {
    const k = voiceKey(text);
    if (VOICE && VOICE.has(k)) {
      const a = new Audio(T.base + 'voice/' + k + '.mp3'); curAudio = a;
      let failed = false;
      const fail = () => { if (failed || curAudio !== a) return; failed = true; curAudio = null; liveSpeak(text); };
      a.onerror = fail; a.play().catch(fail);
      return;
    }
    liveSpeak(text);
  }
  async function loadVoiceIndex() {
    try { const r = await fetch(T.base + 'voice/index.json', { cache: 'no-cache' }); if (r.ok) VOICE = new Set(await r.json()); } catch (e) { /* file:// 或沒有預錄：全用即時語音 */ }
  }
  // 固定句子（給錄音腳本用）：每題兩種選項順序、答對／答錯回饋、機會卡、任務
  const promptText = (q, a, b) => q.say + '。' + a.label + '，還是，' + b.label + '？';
  const VERDICT = { good: '👍 這是比較省電的選擇！', bad: '這個比較耗電，下次試試另一個。' };
  const feedbackText = (q, better) => (better ? VERDICT.good : VERDICT.bad).replace('👍 ', '') + (q.feedback || '');
  const chanceText = (c) => { const R = T.resource, save = c.effect === 'save'; return c.say + (save ? R.verbDown : R.verbUp) + fmtUnits(unitsOf(kwhOf(c.use))) + (R.unitName || ''); };
  window.__voiceLines = () => {
    const out = [];
    for (const q of Object.values(T.questions)) {
      const [a, b] = q.options;
      out.push(promptText(q, a, b), promptText(q, b, a), feedbackText(q, true), feedbackText(q, false));
    }
    T.chance.forEach((c) => out.push(chanceText(c)));
    T.board.filter((x) => x.task).forEach((x) => out.push(x.task));
    return [...new Set(out)].map((text) => ({ key: voiceKey(text), text }));
  };

  // ---------- 畫面切換 ----------
  function show(id) { ['setup', 'game', 'result'].forEach((x) => { $('#' + x).hidden = x !== id; }); window.scrollTo(0, 0); }
  function openModal(html) {
    $('#card').innerHTML = html; $('#modal').hidden = false;
    $('#card').tabIndex = -1; $('#card').focus(); // 不預先聚焦選項，免得看起來像已經選好
    if (TEST === 'end') setTimeout(() => { const bs = $('#card').querySelectorAll('button'); if (bs.length) bs[Math.floor(Math.random() * Math.min(2, bs.length))].click(); }, 0);
  }
  function closeModal() { $('#modal').hidden = true; $('#card').innerHTML = ''; }

  // ---------- 頭像：卡通圖或學生照片 ----------
  // 照片只存在這個變數（這次開啟的網頁記憶體）：不上傳、不寫進瀏覽器儲存、不放網址，重新整理就消失。
  function avatarHTML(p) {
    return p.photo ? `<img class="ic avphoto" src="${p.photo}" alt="">` : icon(T.idCard.avatars[p.avatar]);
  }
  const readPhoto = window.readPhoto;   // engine/photo.js

  // ---------- 設定頁 ----------
  function renderSetup() {
    const av = T.idCard.avatars;
    if (!S.players.length) setCount(4);
    const seg = (name, items, cur) => `<div class="seg" data-seg="${name}">` + items.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${String(v) === String(cur)}">${l}</button>`).join('') + `</div>`;
    $('#setup').innerHTML = `
      <h1>${esc(T.name)}</h1><div class="en">${esc(T.en || '')}</div>
      <p class="intro">${esc(T.intro || '')}</p>
      <div class="panel"><h2>幾個人玩？</h2>${seg('count', [1, 2, 3, 4, 5, 6, 7, 8].map((n) => [n, n]), S.players.length)}</div>
      <div class="panel"><h2>偵探名單（點頭像可以換，📷 可用照片）</h2>
        <div class="players">${S.players.map((p, i) => `
          <div class="prow">
            <button type="button" class="av" data-av="${i}" aria-label="換頭像">${avatarHTML(p)}</button>
            <span class="photos"><label class="photobtn" title="用照片當頭像">📷<input type="file" accept="image/*" capture="user" data-photo="${i}" hidden></label>${p.photo ? `<button type="button" class="photobtn" data-unphoto="${i}" title="改回卡通頭像">✕</button>` : ''}</span>
            <input data-name="${i}" value="${esc(p.name)}" maxlength="8" aria-label="第 ${i + 1} 位的名字">
            ${seg('tier' + i, [['A', 'A'], ['B', 'B'], ['C', 'C']], p.tier)}
          </div>`).join('')}
        </div>
        <p class="tierhelp">${tierHelp()}名字和照片只留在這次開啟的網頁裡，不上傳、不儲存，重新整理就消失。使用學生照片前，請先取得家長同意。</p>
      </div>
      <div class="panel"><h2>遊戲長度</h2>${seg('dice', [[3, '短（骰 1–3，約 10 分鐘）'], [2, '中（骰 1–2）'], [1, '完整（每一格都停）']], S.set.diceMax)}</div>
      <div class="panel"><h2>朗讀題目</h2>${seg('speak', [[1, '開'], [0, '關']], S.set.speak ? 1 : 0)}<p class="tierhelp">即時語音自動選用：Edge 用雲端「曉臻」、Chrome 用「雅婷」。</p></div>
      <div class="panel"><h2>音效</h2>${seg('sfx', [[1, '開'], [0, '關']], S.set.sfx ? 1 : 0)}<p class="tierhelp">音效都很小聲，朗讀時會等音效結束再開始。對聲音敏感的學生可以關掉。</p></div>
      <div class="startrow"><button class="btn" id="startbtn">開始遊戲</button></div>`;
  }
  function setCount(n) {
    const av = T.idCard.avatars.length;
    while (S.players.length < n) { const i = S.players.length; S.players.push({ name: '偵探 ' + (i + 1), avatar: i % av, tier: 'B' }); }
    S.players.length = n;
  }
  function onSetupClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    const segEl = b.closest('[data-seg]');
    if (segEl) {
      const k = segEl.dataset.seg, v = b.dataset.v;
      if (k === 'count') setCount(+v);
      else if (k === 'dice') S.set.diceMax = +v;
      else if (k === 'speak') S.set.speak = v === '1';
      else if (k === 'sfx') { S.set.sfx = v === '1'; if (S.set.sfx) sfx.good(); }
      else if (k.startsWith('tier')) S.players[+k.slice(4)].tier = v;
      renderSetup(); return;
    }
    if (b.dataset.av != null) { const p = S.players[+b.dataset.av]; if (p.photo) delete p.photo; else p.avatar = (p.avatar + 1) % T.idCard.avatars.length; renderSetup(); return; }
    if (b.dataset.unphoto != null) { delete S.players[+b.dataset.unphoto].photo; renderSetup(); return; }
    if (b.id === 'startbtn') startGame();
  }
  function onSetupChange(e) {
    if (e.target.dataset.photo != null) { const p = S.players[+e.target.dataset.photo]; readPhoto(e.target.files[0], (d) => { p.photo = d; renderSetup(); }); return; }
  }
  function onSetupInput(e) { const i = e.target.dataset.name; if (i != null) S.players[+i].name = e.target.value.trim() || '偵探 ' + (+i + 1); }

  // ---------- 棋盤 ----------
  function cellOf(i, w, h) { // 第 i 格在外圈的位置（順時針，從左上角開始）
    if (i < w) return [1, i + 1];
    if (i < w + h - 1) return [i - w + 2, w];
    if (i < 2 * w + h - 2) return [h, w - (i - (w + h - 2))];
    return [h - (i - (2 * w + h - 3)), 1];
  }
  function renderBoard() {
    const n = S.ring.length, w = Math.ceil((n + 4) / 4), h = (n + 4) / 2 - w;
    const bd = $('#board');
    bd.style.gridTemplateColumns = `repeat(${w}, 1fr)`; bd.style.gridTemplateRows = `repeat(${h}, 1fr)`;
    bd.innerHTML = S.ring.map((sq, i) => {
      const [r, c] = cellOf(i, w, h);
      return `<div class="sq ${sq.type}" id="sq${i}" style="grid-area:${r}/${c}"><div class="pic">${icon(sq.icon)}</div><div class="nm">${esc(sq.name)}</div></div>`;
    }).join('') + `<div id="hud" style="grid-area:2/2/${h}/${w}"></div>`;
  }
  const cur = () => S.players[S.turn % S.players.length];
  function renderHUD(rolling) {
    const p = cur(), R = T.resource, over = S.amt > R.goal.keepAtMost;
    $('#hud').innerHTML = `
      <div class="resname">${esc(R.name)}</div>
      <div class="sky" style="${skyStyle()}">${unitRow(S.amt, R.max || 10, R.goal.keepAtMost)}</div>
      <div class="leftnum ${over ? 'low' : ''}">現在有 ${r1(S.amt)} ${R.unit}${esc(R.unitName || '')}</div>
      <div class="goal">一天結束時，不超過 ${R.goal.keepAtMost} ${R.unit}就過關</div>
      <div id="turn"><span class="av">${avatarHTML(p)}</span><span>輪到 ${esc(p.name)}</span><span class="tier">${p.tier}</span></div>
      <button class="btn" id="dicebtn" ${rolling ? 'disabled' : ''}><span id="die">?</span><span>擲骰子</span></button>
      <div class="hudtools"><button id="speakbtn">朗讀：${S.set.speak ? '開' : '關'}</button><button id="sfxbtn">音效：${S.set.sfx ? '開' : '關'}</button><button id="quitbtn">回設定</button></div>`;
    document.querySelectorAll('.sq').forEach((x) => x.classList.remove('here'));
    const here = $('#sq' + S.pos); here.classList.add('here');
    const old = $('#token'); if (old) old.remove();
    here.insertAdjacentHTML('beforeend', `<div id="token">${avatarHTML(p)}</div>`);
  }
  function startGame() {
    S.amt = T.resource.start || 0; S.pos = 0; S.turn = 0; S.deck = shuffle(T.chance.slice());
    S.players.forEach((p) => { p.choices = []; p.patrol = false; p.stamps = p.stamps || {}; });
    renderBoard(); renderHUD(); show('game');
    speak('輪到' + cur().name + '，請擲骰子');
    if (TEST === 'end') roll();
    if (TEST === 'card') { // 直接看結果頁：塞一組示範資料
      const tags = ['cool', 'off', 'light', 'heat'];
      S.players.forEach((p, i) => { p.choices = [{ q: 'x', better: i !== 3, tag: tags[i % 4] }, { q: 'y', better: i === 0, tag: tags[i % 4] }]; p.patrol = i < 2; });
      S.players[0].choices[1].better = true; S.amt = 2.6; endGame();
      if (params.get('flip')) document.querySelectorAll('.id').forEach((x) => x.classList.add('flip'));
      return;
    }
    if (TEST === 'mid') { cur().tier = params.get('tier') || 'C'; S.pos = 5; renderHUD(); resolve(); }
  }
  async function roll() {
    renderHUD(true);
    const n = 1 + Math.floor(Math.random() * S.set.diceMax), die = $('#die');
    if (S.set.diceMax > 1) {
      die.classList.add('rolling');
      for (let i = 0; i < 6; i++) { die.textContent = 1 + Math.floor(Math.random() * S.set.diceMax); sfx.rattle(); await wait(90); }
      die.classList.remove('rolling');
    }
    die.textContent = n; sfx.land(); await wait(350);
    for (let i = 0; i < n; i++) {
      S.pos = (S.pos + 1) % S.ring.length;
      renderHUD(true); $('#die').textContent = n; sfx.step(); await wait(380);
      if (S.pos === 0) break; // 回到起點＝一天結束
    }
    resolve();
  }
  function resolve() {
    if (S.pos === 0) return finish();
    const sq = S.ring[S.pos];
    $('#sq' + S.pos).classList.add('done');
    if (sq.type === 'choice') showChoice(sq.question, nextTurn);
    else if (sq.type === 'chance') showChance();
    else if (sq.type === 'action') showAction(sq);
    else nextTurn();
  }
  function nextTurn() {
    closeModal(); S.turn++; renderHUD();
    speak('輪到' + cur().name + '，請擲骰子');
    if (TEST === 'end') roll();
  }
  function spend(b) { S.amt += b; }                      // 用電：多排了 b 個單位
  function gain(b) { S.amt = Math.max(0, S.amt - b); }   // 省電：擋下 b 個單位

  // ---------- 三種卡 ----------
  function optHTML(o, showCost, cls, tag, asButton, idx, showKwh) {
    const cost = showCost ? `<div class="cost">${costRow(o.b)}<div class="amt">${fmtUnits(o.b)}${o.b >= 0.1 ? esc(T.resource.unitName || '') : ''}</div><div class="sub">${fmtSub(o.kwh)}</div></div>`
      : showKwh ? `<div class="cost"><div class="amt kwh">${fmtSub(o.kwh)}</div></div>` : '';
    const inner = `${tag ? `<span class="tag">${tag}</span>` : ''}<div class="pic">${photo(o.icon)}</div><div class="lb">${esc(o.label)}</div>${cost}`;
    return asButton ? `<button type="button" class="opt ${cls || ''}" data-pick="${idx}">${inner}</button>` : `<div class="opt ${cls}">${inner}</div>`;
  }
  // 三級作答（仿金錢小達人：C＝簡單、B＝普通、A＝困難；畫面只寫 A／B／C，不在全班面前寫「簡單」）
  //   C：系統幫你數——兩邊直接顯示幾朵碳雲、語音念出朵數、比較少的那張閃動；選錯不扣，引導再選一次
  //   B：給線索——提示句＋兩邊的度數與電費，自己比較後選
  //   A：自己想——只看圖選；選完理由先蓋成「❓ 為什麼？」，學生說完，老師點開才顯示並朗讀
  const tierHelp = () => { const R0 = T.resource; return `A：只看圖自己選，選完先說理由，老師再點「❓」翻開說明。B：看提示和兩邊的度數再選。C：兩邊直接顯示各${esc(R0.verbUp)}幾${esc(R0.unit)}${esc(R0.unitName || '')}、比較少的那張會閃動，選錯可以再選一次。`; };
  const cloudSay = (o) => `${o.label}，${T.resource.verbUp}${o.b >= 0.1 ? fmtUnits(o.b) : '不到一' + T.resource.unit}`;
  function showChoice(qid, done) {
    const q = T.questions[qid], p = cur();
    const opts = shuffle(q.options.map((o) => { const kwh = kwhOf(o.use); return { ...o, kwh, b: unitsOf(kwh) }; }));
    const min = Math.min(...opts.map((o) => o.kwh));
    const R0 = T.resource;
    const hint = p.tier === 'B' ? `<div class="hint">💡 ${esc((q.hint && q.hint.B) || '想一想：哪一個用的電比較少？')}</div>` : '';
    sfx.flip();
    const askHTML = (wrongIdx) => `<div class="who">${esc(p.name)} 的題目</div><h2>${esc(q.say)}</h2><div class="en">${esc(q.en || '')}</div>${hint}
      ${wrongIdx != null ? `<div class="hint retry">再看看，哪一邊的${esc(R0.unitName || R0.unit)}比較少？</div>` : ''}
      <div class="opts">${opts.map((o, i) => optHTML(o, p.tier === 'C', (p.tier === 'C' && o.kwh === min ? 'guide ' : '') + (i === wrongIdx ? 'tried' : ''), '', true, i, p.tier === 'B')).join('')}</div>`;
    openModal(askHTML(null));
    speak(p.tier === 'C' ? `${q.say.replace(/[。！？!?]$/, '')}。${cloudSay(opts[0])}；${cloudSay(opts[1])}。哪一邊比較少？` : promptText(q, opts[0], opts[1]));
    let retried = false;
    $('#card').onclick = (e) => {
      const b = e.target.closest('[data-pick]'); if (!b || b.disabled) return;
      const pick = opts[+b.dataset.pick], better = pick.kwh === min;
      if (p.tier === 'C' && !better && !retried) {          // C：選錯先不算，引導再選一次
        retried = true; sfx.gentle();
        openModal(askHTML(+b.dataset.pick));
        $('#card').querySelector('.opt.tried').disabled = true;
        speak(`再看看，${cloudSay(pick)}。另一邊比較少喔。`);
        return;
      }
      spend(pick.b); p.choices.push({ q: qid, better, tag: pick.tag, retried });
      better ? sfx.good() : sfx.rise();
      const verdict = better ? VERDICT.good : VERDICT.bad;
      const hide = p.tier === 'A' && q.feedback;
      openModal(`<div class="who">${esc(p.name)} 的題目</div><h2>${esc(q.say)}</h2>
        <div class="opts">${opts.map((o) => optHTML(o, true, (o === pick ? 'picked ' : '') + (o.kwh === min ? 'best' : ''), o === pick ? '你選的' : (o.kwh === min ? '比較省' : ''), false)).join('')}</div>
        <div class="verdict ${better ? 'good' : 'bad'}">${verdict}</div>
        ${hide ? `<button type="button" class="why" id="whybtn"><span class="q">❓</span><span>為什麼？先說說看，<br>說完再點我</span></button><p class="fb" id="fb" hidden>${esc(q.feedback)}</p>`
               : `<p class="fb">${esc(q.feedback || '')}</p>`}
        ${q.source ? `<p class="src">資料：${esc(q.source)}</p>` : ''}
        <div class="actions"><button class="btn" id="okbtn">好，繼續</button></div>`);
      speak(hide ? verdict.replace('👍 ', '') + '為什麼呢？先說說看。' : feedbackText(q, better));
      $('#card').onclick = (ev) => {
        if (ev.target.closest('#whybtn')) { $('#whybtn').hidden = true; $('#fb').hidden = false; sfx.flip(); speak(q.feedback); return; }
        if (ev.target.closest('#okbtn')) { $('#card').onclick = null; done(); }
      };
    };
  }
  function showChance() {
    if (!S.deck.length) S.deck = shuffle(T.chance.slice());
    const c = S.deck.pop(), kwh = kwhOf(c.use), b = unitsOf(kwh), save = c.effect === 'save', R = T.resource;
    save ? gain(b) : spend(b);
    save ? sfx.block() : sfx.rise();
    openModal(`<div class="who">機會卡</div><div class="bigpic">${photo(c.icon)}</div><h2>${esc(c.say)}</h2>
      <div class="delta ${save ? 'save' : 'cost'}"><span>${save ? R.verbDown : R.verbUp}</span>${costRow(b, save ? 'blocked' : '')}<span>${fmtUnits(b)}${esc(R.unitName || '')}</span></div>
      <div class="en">${fmtSub(kwh)}</div>
      ${c.source ? `<p class="src">資料：${esc(c.source)}</p>` : ''}
      <div class="actions"><button class="btn" id="okbtn">好，繼續</button></div>`);
    speak(chanceText(c));
    $('#card').onclick = (e) => { if (e.target.closest('#okbtn')) { $('#card').onclick = null; nextTurn(); } };
  }
  function showAction(sq) {
    const p = cur(), b = unitsOf(kwhOf(sq.use)), R = T.resource;
    sfx.flip();
    openModal(`<div class="who">${esc(p.name)} 的任務</div><div class="bigpic">${icon(sq.icon)}</div><h2>${esc(sq.task)}</h2><div class="en">${esc(sq.en || '')}</div>
      <div class="delta save"><span>做到了可以${R.verbDown}</span>${costRow(b, 'blocked')}<span>${fmtUnits(b)}${esc(R.unitName || '')}</span></div>
      <div class="actions"><button class="btn" id="didbtn">做到了！</button><button class="btn ghost" id="skipbtn">這次先跳過</button></div>`);
    speak(sq.task);
    $('#card').onclick = (e) => {
      if (e.target.closest('#didbtn')) { gain(b); p.patrol = true; sfx.click(); $('#card').onclick = null; nextTurn(); }
      else if (e.target.closest('#skipbtn')) { $('#card').onclick = null; nextTurn(); }
    };
  }
  function finish() {
    const fin = T.board.find((x) => x.type === 'finish');
    if (fin && fin.question) showChoice(fin.question, endGame); else endGame();
  }

  // ---------- 結果與身分證 ----------
  function titleOf(p) {
    const ch = p.choices, better = ch.filter((c) => c.better).length;
    for (const t of T.titles) {
      if (t.default) return t;
      const w = t.when || {};
      if (w.allBetter && ch.length >= (w.minChoices || 1) && better === ch.length) return t;
      if (w.tag && ch.filter((c) => c.better && c.tag === w.tag).length >= (w.atLeast || 1)) return t;
      if (w.betterAtLeast && better >= w.betterAtLeast) return t;
      if (w.totalAtMost != null && S.amt <= w.totalAtMost) return t;
    }
    return T.titles[T.titles.length - 1];
  }
  function cardHTML(p, i) {
    const ID = T.idCard, t = titleOf(p);
    const fields = ID.fields.map((f) => {
      if (f.from === 'teacher') return `<li>${esc(f.label)} <input type="number" min="0" inputmode="numeric" data-field="${i}:${f.key}:${f.convert || ''}" value="${p[f.key] ?? ''}" aria-label="${esc(f.label)}"> ${esc(f.unit)} <span class="conv" id="conv${i}${f.key}"></span></li>`;
      const v = f.key === 'total' ? r1(S.amt) : f.key === 'better' ? p.choices.filter((c) => c.better).length : '';
      return `<li>${esc(f.label)} <b>${v}</b> ${esc(f.unit)}</li>`;
    }).join('');
    const stamps = ID.stamps.map((s) => {
      const on = s.id === 'game' ? true : s.id === 'patrol' ? p.patrol : !!p.stamps[s.id];
      if (s.later) return `<span class="stamp later">${esc(s.label)}</span>`;
      if (s.from === 'teacher') return `<button type="button" class="stamp ${on ? 'on' : ''}" data-stamp="${i}:${s.id}">${esc(s.label)}</button>`;
      return `<span class="stamp ${on ? 'on' : ''}">${esc(s.label)}</span>`;
    }).join('');
    const ruler = ID.ruler.map((x) => {
      const min = 60000 / x.watts, txt = min >= 120 ? Math.round(min / 60) + ' 小時' : min >= 60 ? r1(min / 60) + ' 小時' : Math.round(min) + ' 分鐘';
      return `<li class="rw"><span class="ri">${icon(x.icon)}</span>${esc(x.label)}用 ${txt}</li>`;
    }).join('');
    const gPerKwh = Math.round(C.kgCO2PerKwh * 1000);
    return `<div class="idwrap"><div class="id" id="id${i}" style="animation-delay:${i * 0.15}s">
      <div class="face front">
        <div class="idhead"><b>${esc(ID.title)}</b><span class="en">${esc(ID.en || '')}</span></div>
        <div class="idmain"><div class="av">${avatarHTML(p)}</div>
          <div><div class="idname">${esc(p.name)}</div>
            <div class="idtitle"><span class="tic">${icon(t.icon)}</span>${esc(t.name)}</div>
            <div class="en">${esc(t.en || '')}</div></div></div>
        <ul class="idfields">${fields}</ul>
        <div class="stamps">${stamps}</div>
      </div>
      <div class="face back ruler">
        <div class="idhead"><b>1 度電換算尺</b><span class="en">1 kWh</span></div>
        <ul>
          <li class="rw"><span class="ri">${icon(T.resource.icon)}</span>碳約 ${gPerKwh} 公克${ID.backWeight ? '，' + esc(ID.backWeight) : ''}</li>
          <li>💰 約 ${C.pricePerKwh} 元</li>
          <li>⚡ 1 度電可以讓：</li>
        </ul>
        <ul>${ruler}</ul>
        <p class="src">${esc(C.source)}</p>
      </div>
    </div><button type="button" class="flipbtn" data-flip="${i}">翻到背面</button></div>`;
  }
  // 一天結束 → 總結畫面：自動歸納每位同學在二選一題目的作答（2026-11-13 起先不發身分證；cardHTML 保留，之後要用再接回）
  const TAGS = { cool: '冷氣電扇', off: '關燈拔插頭', light: '照明', heat: '加熱電器' };
  function summaryHTML() {
    const all = S.players.flatMap((p) => p.choices), good = all.filter((c) => c.better).length;
    const rows = S.players.map((p) => {
      const ch = p.choices, ok = ch.filter((c) => c.better).length, re = ch.filter((c) => c.retried).length;
      const pct = ch.length ? Math.round(ok / ch.length * 100) : 0, t = titleOf(p);
      const qs = ch.map((c) => { const q = T.questions[c.q]; return `<li class="${c.better ? 'ok' : 'no'}">${c.better ? '✔' : '✘'} ${esc(q ? q.say : c.q)}${c.retried ? '<small>（選錯後再選一次）</small>' : ''}</li>`; }).join('');
      return `<tr><td class="nm"><span class="av">${avatarHTML(p)}</span>${esc(p.name)}</td><td>${p.tier}</td>
        <td><b>${ok}</b> ／ ${ch.length}</td><td><span class="bar"><i style="width:${pct}%"></i></span>${pct}%</td>
        <td>${re || '—'}</td><td>${p.patrol ? '✔ 做到了' : '—'}</td><td class="ttl">${esc(t.name)}</td></tr>
        <tr class="qs"><td colspan="7"><ul>${qs || '<li>這一天沒有輪到二選一題目</li>'}</ul></td></tr>`;
    }).join('');
    const byTag = Object.entries(TAGS).map(([k, nm]) => { const xs = all.filter((c) => c.tag === k); return xs.length ? `${nm} ${xs.filter((c) => c.better).length}／${xs.length}` : ''; }).filter(Boolean).join('　');
    return `<h2>作答總結</h2>
      <p class="sum2">全班一共答了 <b>${all.length}</b> 題二選一，選了省電的做法 <b>${good}</b> 題${all.length ? `（${Math.round(good / all.length * 100)}%）` : ''}。${byTag ? '<br>分類：' + byTag : ''}</p>
      <table class="sumtab"><thead><tr><th>偵探</th><th>等級</th><th>選省電</th><th>正確率</th><th>C 再選</th><th>巡守任務</th><th>稱號</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function endGame() {
    closeModal();
    const R = T.resource, pass = S.amt <= R.goal.keepAtMost, kg = S.amt * kgPerUnit();
    $('#result').innerHTML = `
      <h1>${pass ? esc(R.passText || '🎉 過關！') : esc(R.failText || '一天結束了，再挑戰一次吧')}</h1>
      <p class="sum">全班一天排了 <b>${r1(S.amt)}</b> ${R.unit}${esc(R.unitName || '')}（目標：不超過 ${R.goal.keepAtMost} ${R.unit}）</p>
      <p class="sum2">碳約 ${fmtKg(kg)} 公斤，${compareText(kg)}</p>
      <div class="sumunits sky" style="${skyStyle()}">${unitRow(S.amt, Math.max(R.max || 10, Math.ceil(S.amt)), R.goal.keepAtMost)}</div>
      ${summaryHTML()}
      <div class="actions"><button class="btn" id="printbtn">列印總結</button><a class="btn ghost" href="cert/index.html">減碳身分認證 →</a><button class="btn ghost" id="againbtn">再玩一次</button><button class="btn ghost" id="backbtn">回設定</button></div>
      <p class="tip">教師紀錄：依每人選省電的題數與完成方式記入紀錄表。這份總結只留在這個分頁，重新整理就清除，不會上傳。</p>
      <p class="src">${esc(C.wattsNote || '')}</p>`;
    show('result');
    pass ? sfx.fanfare() : sfx.gentle();
    speak((pass ? (R.passText || '過關了！') : (R.failText || '一天結束了，再挑戰一次吧')).replace('🎉 ', '') + '。碳約' + fmtKg(kg) + '公斤，' + compareText(kg) + '。');
  }
  function onResultClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.flip != null) { const c = $('#id' + b.dataset.flip); c.classList.toggle('flip'); b.textContent = c.classList.contains('flip') ? '翻回正面' : '翻到背面'; }
    else if (b.dataset.stamp) { const [i, id] = b.dataset.stamp.split(':'); const p = S.players[+i]; p.stamps[id] = !p.stamps[id]; b.classList.toggle('on', p.stamps[id]); if (p.stamps[id]) sfx.stamp(); }
    else if (b.id === 'printbtn') window.print();
    else if (b.id === 'againbtn') startGame();
    else if (b.id === 'backbtn') { renderSetup(); show('setup'); }
  }
  function onResultInput(e) {
    const d = e.target.dataset.field; if (!d) return;
    const [i, key, conv] = d.split(':'), v = parseFloat(e.target.value);
    S.players[+i][key] = isNaN(v) ? undefined : v;
    const out = $('#conv' + i + key); if (!out) return;
    const kg = v * C.kgCO2PerKwh;
    out.textContent = (conv === 'kwh' && v > 0) ? compareText(kg, true) : '';
    out.title = (conv === 'kwh' && v > 0) ? `碳約 ${fmtKg(kg)} 公斤・電費約 ${Math.round(v * C.pricePerKwh)} 元` : '';
  }

  // ---------- 啟動 ----------
  function loadScript(src) { return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('讀不到 ' + src)); document.head.appendChild(s); }); }
  async function boot() {
    const list = window.THEME_LIST || [], want = params.get('theme');
    const entry = list.find((x) => x.id === want) || list[0];
    try {
      await loadScript(entry.path + 'icons.js').catch(() => {}); // 圖示檔可以沒有
      await loadScript(entry.path + 'theme.js');
    } catch (e) { $('#setup').innerHTML = `<p>主題載入失敗：${esc(e.message)}</p>`; return; }
    T = window.THEME; T.base = entry.path; C = T.constants;
    S.ring = T.board.filter((x) => x.type !== 'finish');
    document.title = T.name;
    $('#setup').addEventListener('click', onSetupClick);
    $('#setup').addEventListener('input', onSetupInput);
    $('#setup').addEventListener('change', onSetupChange);
    $('#result').addEventListener('click', onResultClick);
    $('#result').addEventListener('input', onResultInput);
    $('#game').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'dicebtn') roll();
      else if (b.id === 'speakbtn') { S.set.speak = !S.set.speak; if (!S.set.speak) stopVoice(); renderHUD(); }
      else if (b.id === 'sfxbtn') { S.set.sfx = !S.set.sfx; renderHUD(); }
      else if (b.id === 'quitbtn') { renderSetup(); show('setup'); }
    });
    await loadVoiceIndex();
    renderSetup();
    if (window.ZhTTS) ZhTTS.ready().then(() => { if (!$('#setup').hidden) renderSetup(); });
    document.body.addEventListener('pointerdown', () => window.ZhTTS && ZhTTS.unlock(), { once: true });
    if (TEST) startGame();
  }
  if (TEST) window.addEventListener('error', (e) => { document.body.insertAdjacentHTML('afterbegin', '<pre id="testerr">' + esc(e.message + ' @' + e.lineno) + '</pre>'); });
  if (TEST) window.addEventListener('unhandledrejection', (e) => { document.body.insertAdjacentHTML('afterbegin', '<pre id="testerr">' + esc(String(e.reason && e.reason.stack || e.reason)) + '</pre>'); });
  boot();
})();
