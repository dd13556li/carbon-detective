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
  const S = { players: [], turn: 0, pos: 0, left: 0, deck: [], ring: [], set: { diceMax: 3, speak: true } };
  const TIER_NAME = { A: 'A 自己想', B: 'B 有提示', C: 'C 看瓶子' };

  // ---------- 換算 ----------
  function kwhOf(use) {
    if (!use) return 0;
    if (Array.isArray(use)) return use.reduce((a, u) => a + kwhOf(u), 0);
    if (use.kwh != null) return use.kwh;
    return use.watts * use.minutes / 60000 * (use.factor ?? 1);
  }
  const bottlesOf = (kwh) => kwh * C.kgCO2PerKwh / C.kgPerBottle;
  const r1 = (n) => Math.round(n * 10) / 10;
  function fmtBottles(b) {
    if (b <= 0) return '0 ' + T.resource.unit;
    if (b < 0.1) return '一小口';
    return '約 ' + r1(b) + ' ' + T.resource.unit;
  }
  function fmtSub(kwh) {
    if (kwh <= 0) return '不用電';
    const k = kwh < 0.1 ? Math.round(kwh * 100) / 100 : r1(kwh);
    const yuan = kwh * C.pricePerKwh;
    return k + ' 度・約 ' + (yuan < 1 ? '不到 1' : Math.round(yuan)) + ' 元';
  }

  // ---------- 圖 ----------
  function icon(key) {
    if (!key) return '';
    const lib = window.THEME_ICONS || {};
    if (/\.(svg|png|jpe?g|webp)$/i.test(key)) return `<img class="ic" src="${T.base}images/${esc(key)}" alt="">`;
    if (lib[key]) return `<svg class="ic" viewBox="0 0 64 64" aria-hidden="true">${lib[key]}</svg>`;
    return `<span class="ic emoji" aria-hidden="true">${esc(key)}</span>`;
  }
  function bottle(fill) {
    const h = 38 * Math.max(0, Math.min(1, fill));
    return `<svg class="bt" viewBox="0 0 24 56" aria-hidden="true"><rect x="8" y="1" width="8" height="6" rx="1.5" fill="#3b82c4"/>` +
      `<path d="M7 8h10l3 8v36a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V16z" fill="#f2f9ff" stroke="#3b82c4" stroke-width="1.5"/>` +
      (h > 0 ? `<rect x="5.2" y="${53.8 - h}" width="13.6" height="${h}" rx="2" fill="#4fb3ff"/>` : '') + `</svg>`;
  }
  // 一排瓶子：amount 瓶，共畫 count 個
  function bottleRow(amount, count) {
    let s = '';
    for (let i = 0; i < count; i++) s += bottle(amount - i);
    return `<div class="bottles">${s}</div>`;
  }
  function costRow(b) {
    if (b <= 0) return bottleRow(0, 1);
    return bottleRow(Math.max(b, 0.08), Math.max(1, Math.ceil(b - 1e-9)));
  }

  // ---------- 聲音與朗讀 ----------
  let actx;
  function tone(freqs, dur = 0.12, type = 'sine') {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      freqs.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type; o.frequency.value = f;
        const t0 = actx.currentTime + i * dur;
        g.gain.setValueAtTime(0.18, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + dur);
      });
    } catch (e) { /* 沒有聲音也能玩 */ }
  }
  const sfx = {
    tick: () => tone([520], 0.06, 'square'),
    good: () => tone([523, 659, 784], 0.12),
    bad: () => tone([330, 247], 0.18, 'triangle'),
    card: () => tone([440, 660], 0.1),
    fanfare: () => tone([523, 659, 784, 1047, 784, 1047], 0.14)
  };
  function speak(text) {
    if (!S.set.speak || !window.speechSynthesis || TEST === 'end') return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-TW'; u.rate = 0.9;
      const v = speechSynthesis.getVoices().find((x) => /zh[-_]TW/i.test(x.lang));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) { /* 沒有語音也能玩 */ }
  }

  // ---------- 畫面切換 ----------
  function show(id) { ['setup', 'game', 'result'].forEach((x) => { $('#' + x).hidden = x !== id; }); window.scrollTo(0, 0); }
  function openModal(html) {
    $('#card').innerHTML = html; $('#modal').hidden = false;
    $('#card').tabIndex = -1; $('#card').focus(); // 不預先聚焦選項，免得看起來像已經選好
    if (TEST === 'end') setTimeout(() => { const bs = $('#card').querySelectorAll('button'); if (bs.length) bs[Math.floor(Math.random() * Math.min(2, bs.length))].click(); }, 0);
  }
  function closeModal() { $('#modal').hidden = true; $('#card').innerHTML = ''; }

  // ---------- 設定頁 ----------
  function renderSetup() {
    const av = T.idCard.avatars;
    if (!S.players.length) setCount(4);
    const seg = (name, items, cur) => `<div class="seg" data-seg="${name}">` + items.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${String(v) === String(cur)}">${l}</button>`).join('') + `</div>`;
    $('#setup').innerHTML = `
      <h1>${esc(T.name)}</h1><div class="en">${esc(T.en || '')}</div>
      <p class="intro">${esc(T.intro || '')}</p>
      <div class="panel"><h2>幾個人玩？</h2>${seg('count', [1, 2, 3, 4, 5, 6, 7, 8].map((n) => [n, n]), S.players.length)}</div>
      <div class="panel"><h2>偵探名單（點頭像可以換）</h2>
        <div class="players">${S.players.map((p, i) => `
          <div class="prow">
            <button type="button" class="av" data-av="${i}" aria-label="換頭像">${icon(av[p.avatar])}</button>
            <input data-name="${i}" value="${esc(p.name)}" maxlength="8" aria-label="第 ${i + 1} 位的名字">
            ${seg('tier' + i, [['A', 'A'], ['B', 'B'], ['C', 'C']], p.tier)}
          </div>`).join('')}
        </div>
        <p class="tierhelp">A：自己選，選完說理由。B：先看提示再選。C：先看兩邊各喝掉幾瓶再選。名字只留在這台電腦，不會上傳。</p>
      </div>
      <div class="panel"><h2>遊戲長度</h2>${seg('dice', [[3, '短（骰 1–3，約 10 分鐘）'], [2, '中（骰 1–2）'], [1, '完整（每一格都停）']], S.set.diceMax)}</div>
      <div class="panel"><h2>朗讀題目</h2>${seg('speak', [[1, '開'], [0, '關']], S.set.speak ? 1 : 0)}</div>
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
      else if (k.startsWith('tier')) S.players[+k.slice(4)].tier = v;
      renderSetup(); return;
    }
    if (b.dataset.av != null) { const p = S.players[+b.dataset.av]; p.avatar = (p.avatar + 1) % T.idCard.avatars.length; renderSetup(); return; }
    if (b.id === 'startbtn') startGame();
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
    const p = cur(), R = T.resource, low = S.left < R.goal.keepAtLeast;
    $('#hud').innerHTML = `
      <div class="resname">${esc(R.name)}</div>
      ${bottleRow(S.left, R.start)}
      <div class="leftnum ${low ? 'low' : ''}">還有 ${r1(S.left)} ${R.unit}</div>
      <div class="goal">走完一天，還剩 ${R.goal.keepAtLeast} ${R.unit}以上就過關</div>
      <div id="turn"><span class="av">${icon(T.idCard.avatars[p.avatar])}</span><span>輪到 ${esc(p.name)}</span><span class="tier">${p.tier} 層</span></div>
      <button class="btn" id="dicebtn" ${rolling ? 'disabled' : ''}><span id="die">?</span><span>擲骰子</span></button>
      <div class="hudtools"><button id="speakbtn">朗讀：${S.set.speak ? '開' : '關'}</button><button id="quitbtn">回設定</button></div>`;
    document.querySelectorAll('.sq').forEach((x) => x.classList.remove('here'));
    const here = $('#sq' + S.pos); here.classList.add('here');
    const old = $('#token'); if (old) old.remove();
    here.insertAdjacentHTML('beforeend', `<div id="token">${icon(T.idCard.avatars[p.avatar])}</div>`);
  }
  function startGame() {
    S.left = T.resource.start; S.pos = 0; S.turn = 0; S.deck = shuffle(T.chance.slice());
    S.players.forEach((p) => { p.choices = []; p.patrol = false; p.stamps = p.stamps || {}; });
    renderBoard(); renderHUD(); show('game');
    speak('輪到' + cur().name + '，請擲骰子');
    if (TEST === 'end') roll();
    if (TEST === 'card') { // 直接看結果頁：塞一組示範資料
      const tags = ['cool', 'off', 'light', 'heat'];
      S.players.forEach((p, i) => { p.choices = [{ q: 'x', better: i !== 3, tag: tags[i % 4] }, { q: 'y', better: i === 0, tag: tags[i % 4] }]; p.patrol = i < 2; });
      S.players[0].choices[1].better = true; S.left = 7.4; endGame();
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
      for (let i = 0; i < 6; i++) { die.textContent = 1 + Math.floor(Math.random() * S.set.diceMax); sfx.tick(); await wait(90); }
      die.classList.remove('rolling');
    }
    die.textContent = n; await wait(350);
    for (let i = 0; i < n; i++) {
      S.pos = (S.pos + 1) % S.ring.length;
      renderHUD(true); $('#die').textContent = n; sfx.tick(); await wait(380);
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
  function spend(b) { S.left = Math.max(0, S.left - b); }
  function gain(b) { S.left = Math.min(T.resource.start, S.left + b); }

  // ---------- 三種卡 ----------
  function optHTML(o, showCost, cls, tag, asButton, idx) {
    const cost = showCost ? `<div class="cost">${costRow(o.b)}<div class="amt">${fmtBottles(o.b)}</div><div class="sub">${fmtSub(o.kwh)}</div></div>` : '';
    const inner = `${tag ? `<span class="tag">${tag}</span>` : ''}<div class="pic">${icon(o.icon)}</div><div class="lb">${esc(o.label)}</div>${cost}`;
    return asButton ? `<button type="button" class="opt" data-pick="${idx}">${inner}</button>` : `<div class="opt ${cls}">${inner}</div>`;
  }
  function showChoice(qid, done) {
    const q = T.questions[qid], p = cur();
    const opts = shuffle(q.options.map((o) => { const kwh = kwhOf(o.use); return { ...o, kwh, b: bottlesOf(kwh) }; }));
    const min = Math.min(...opts.map((o) => o.kwh));
    const hint = p.tier === 'B' ? `<div class="hint">💡 ${esc((q.hint && q.hint.B) || '想一想：哪一個用的電比較少？')}</div>` : '';
    sfx.card();
    openModal(`<div class="who">${esc(p.name)} 的題目</div><h2>${esc(q.say)}</h2><div class="en">${esc(q.en || '')}</div>${hint}
      <div class="opts">${opts.map((o, i) => optHTML(o, p.tier === 'C', '', '', true, i)).join('')}</div>`);
    speak(q.say + '。' + opts[0].label + '，還是，' + opts[1].label + '？');
    $('#card').onclick = (e) => {
      const b = e.target.closest('[data-pick]'); if (!b) return;
      const pick = opts[+b.dataset.pick], better = pick.kwh === min;
      spend(pick.b); p.choices.push({ q: qid, better, tag: pick.tag });
      better ? sfx.good() : sfx.bad();
      const verdict = better ? '👍 這是比較省電的選擇！' : '這個比較耗電，下次試試另一個。';
      openModal(`<div class="who">${esc(p.name)} 的題目</div><h2>${esc(q.say)}</h2>
        <div class="opts">${opts.map((o) => optHTML(o, true, (o === pick ? 'picked ' : '') + (o.kwh === min ? 'best' : ''), o === pick ? '你選的' : (o.kwh === min ? '比較省' : ''), false)).join('')}</div>
        <div class="verdict ${better ? 'good' : 'bad'}">${verdict}</div>
        <p class="fb">${esc(q.feedback || '')}</p>
        ${p.tier === 'A' ? '<p class="ask">說說看：為什麼這個比較省電？</p>' : ''}
        ${q.source ? `<p class="src">資料：${esc(q.source)}</p>` : ''}
        <div class="actions"><button class="btn" id="okbtn">好，繼續</button></div>`);
      speak(verdict.replace('👍 ', '') + (q.feedback || ''));
      $('#card').onclick = (ev) => { if (ev.target.closest('#okbtn')) { $('#card').onclick = null; done(); } };
    };
  }
  function showChance() {
    if (!S.deck.length) S.deck = shuffle(T.chance.slice());
    const c = S.deck.pop(), kwh = kwhOf(c.use), b = bottlesOf(kwh), save = c.effect === 'save';
    save ? gain(b) : spend(b);
    save ? sfx.good() : sfx.bad();
    openModal(`<div class="who">機會卡</div><div class="bigpic">${icon(c.icon)}</div><h2>${esc(c.say)}</h2>
      <div class="delta ${save ? 'save' : 'cost'}"><span>${save ? '省下' : '喝掉'}</span>${costRow(b)}<span>${fmtBottles(b)}</span></div>
      <div class="en">${fmtSub(kwh)}</div>
      ${c.source ? `<p class="src">資料：${esc(c.source)}</p>` : ''}
      <div class="actions"><button class="btn" id="okbtn">好，繼續</button></div>`);
    speak(c.say + (save ? '省下' : '喝掉') + fmtBottles(b));
    $('#card').onclick = (e) => { if (e.target.closest('#okbtn')) { $('#card').onclick = null; nextTurn(); } };
  }
  function showAction(sq) {
    const p = cur(), b = bottlesOf(kwhOf(sq.use));
    sfx.card();
    openModal(`<div class="who">${esc(p.name)} 的任務</div><div class="bigpic">${icon(sq.icon)}</div><h2>${esc(sq.task)}</h2><div class="en">${esc(sq.en || '')}</div>
      <div class="delta save"><span>做到了可以省下</span>${costRow(b)}<span>${fmtBottles(b)}</span></div>
      <div class="actions"><button class="btn" id="didbtn">做到了！</button><button class="btn ghost" id="skipbtn">這次先跳過</button></div>`);
    speak(sq.task);
    $('#card').onclick = (e) => {
      if (e.target.closest('#didbtn')) { gain(b); p.patrol = true; sfx.good(); $('#card').onclick = null; nextTurn(); }
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
      if (w.leftAtLeast != null && S.left >= w.leftAtLeast) return t;
    }
    return T.titles[T.titles.length - 1];
  }
  function cardHTML(p, i) {
    const ID = T.idCard, t = titleOf(p), R = T.resource;
    const fields = ID.fields.map((f) => {
      if (f.from === 'teacher') return `<li>${esc(f.label)} <input type="number" min="0" inputmode="numeric" data-field="${i}:${f.key}:${f.convert || ''}" value="${p[f.key] ?? ''}" aria-label="${esc(f.label)}"> ${esc(f.unit)} <span class="conv" id="conv${i}${f.key}"></span></li>`;
      const v = f.key === 'left' ? r1(S.left) : f.key === 'better' ? p.choices.filter((c) => c.better).length : '';
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
        <div class="idmain"><div class="av">${icon(ID.avatars[p.avatar])}</div>
          <div><div class="idname">${esc(p.name)}</div>
            <div class="idtitle"><span class="tic">${icon(t.icon)}</span>${esc(t.name)}</div>
            <div class="en">${esc(t.en || '')}</div></div></div>
        <ul class="idfields">${fields}</ul>
        <div class="stamps">${stamps}</div>
      </div>
      <div class="face back ruler">
        <div class="idhead"><b>1 度電換算尺</b><span class="en">1 kWh</span></div>
        <ul>
          <li>💧 碳約 ${gPerKwh} 公克（約 1 瓶水的重量）</li>
          <li>💰 約 ${C.pricePerKwh} 元</li>
          <li>⚡ 1 度電可以讓：</li>
        </ul>
        <ul>${ruler}</ul>
        <p class="src">${esc(C.source)}</p>
      </div>
    </div><button type="button" class="flipbtn" data-flip="${i}">翻到背面</button></div>`;
  }
  function endGame() {
    closeModal();
    const R = T.resource, pass = S.left >= R.goal.keepAtLeast;
    $('#result').innerHTML = `
      <h1>${pass ? '🎉 過關！全班守住了地球零用錢' : '一天結束了，再挑戰一次吧'}</h1>
      <p class="sum">${esc(R.name)}還剩 <b>${r1(S.left)}</b> ${R.unit}（目標：${R.goal.keepAtLeast} ${R.unit}以上）</p>
      <div class="sumbottles">${bottleRow(S.left, R.start)}</div>
      <p class="tip">這是每個人的${esc(T.idCard.title)}。老師可以填入電費單的度數、點印章蓋章。</p>
      <div class="cards">${S.players.map(cardHTML).join('')}</div>
      <div class="actions"><button class="btn" id="printbtn">列印身分證</button><button class="btn ghost" id="againbtn">再玩一次</button><button class="btn ghost" id="backbtn">回設定</button></div>
      <p class="src">${esc(C.wattsNote || '')}</p>`;
    show('result');
    pass ? sfx.fanfare() : sfx.card();
    speak(pass ? '過關了！全班守住了地球零用錢。' : '一天結束了，再挑戰一次吧。');
  }
  function onResultClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.flip != null) { const c = $('#id' + b.dataset.flip); c.classList.toggle('flip'); b.textContent = c.classList.contains('flip') ? '翻回正面' : '翻到背面'; }
    else if (b.dataset.stamp) { const [i, id] = b.dataset.stamp.split(':'); const p = S.players[+i]; p.stamps[id] = !p.stamps[id]; b.classList.toggle('on', p.stamps[id]); if (p.stamps[id]) sfx.good(); }
    else if (b.id === 'printbtn') window.print();
    else if (b.id === 'againbtn') startGame();
    else if (b.id === 'backbtn') { renderSetup(); show('setup'); }
  }
  function onResultInput(e) {
    const d = e.target.dataset.field; if (!d) return;
    const [i, key, conv] = d.split(':'), v = parseFloat(e.target.value);
    S.players[+i][key] = isNaN(v) ? undefined : v;
    const out = $('#conv' + i + key); if (!out) return;
    out.textContent = (conv === 'kwh' && v > 0) ? `＝約 ${Math.round(bottlesOf(v))} 瓶重的碳・約 ${Math.round(v * C.pricePerKwh)} 元` : '';
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
    $('#result').addEventListener('click', onResultClick);
    $('#result').addEventListener('input', onResultInput);
    $('#game').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'dicebtn') roll();
      else if (b.id === 'speakbtn') { S.set.speak = !S.set.speak; if (!S.set.speak && window.speechSynthesis) speechSynthesis.cancel(); renderHUD(); }
      else if (b.id === 'quitbtn') { renderSetup(); show('setup'); }
    });
    renderSetup();
    if (TEST) startGame();
  }
  if (TEST) window.addEventListener('error', (e) => { document.body.insertAdjacentHTML('afterbegin', '<pre id="testerr">' + esc(e.message + ' @' + e.lineno) + '</pre>'); });
  if (TEST) window.addEventListener('unhandledrejection', (e) => { document.body.insertAdjacentHTML('afterbegin', '<pre id="testerr">' + esc(String(e.reason && e.reason.stack || e.reason)) + '</pre>'); });
  boot();
})();
