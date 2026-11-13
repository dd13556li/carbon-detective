// 課堂小遊戲與動畫共用的小工具（spin/ rank/ say/ overshoot/ bag/）。需先載入 tts-zh.js、sfx.js、theme.js。
//   Act.speak(text)          朗讀（等音效結束；用 ZhTTS.pickTW 挑高品質語音，與棋盤遊戲同一個選擇）
//   Act.icon(key)            theme art/ 的圖，沒有就用 icons.js 向量圖
//   Act.mountOptions(el)     朗讀／音效開關（語音自動選，不給選單）
//   Act.turns({...})         輪流上台：第 n 位 → 老師按 A／B／C → 玩一回 → 下一位；結果只留在這個分頁
(function () {
  const TH = window.THEME || {}, ART = TH.art || {}, IC = window.THEME_ICONS || {};
  const ARTDIR = '../themes/save-power/art/';
  const S = { speak: true, sfx: true };
  window.GameSfx.enabled = () => S.sfx;
  const $ = (id) => document.getElementById(id);

  function speak(text, opt = {}) {
    if (!S.speak || !window.ZhTTS) { opt.onEnd && opt.onEnd(); return; }
    const wait = Math.max(0, window.GameSfx.until() - performance.now());
    setTimeout(() => {
      try { speechSynthesis.cancel(); } catch (e) {}
      ZhTTS.speak(text, { voice: ZhTTS.pickTW() || undefined, rate: opt.rate || 0.9, onEnd: opt.onEnd });
    }, wait);
  }
  function stop() { try { speechSynthesis.cancel(); } catch (e) {} }
  document.addEventListener('pointerdown', () => { try { window.ZhTTS && ZhTTS.unlock(); } catch (e) {} }, { once: true });

  const icon = (k, alt = '') => ART[k] ? `<img src="${ARTDIR}${ART[k]}" alt="${alt}">`
    : IC[k] ? `<svg viewBox="0 0 64 64" role="img" aria-label="${alt}">${IC[k]}</svg>` : '';

  function mountOptions(el, sample) {
    const draw = () => {
      const seg = (k, label) => `<span>${label}</span>` + [[true, '開'], [false, '關']].map(([v, l]) =>
        `<button data-opt="${k}" data-v="${v}" aria-pressed="${S[k] === v}">${l}</button>`).join('');
      el.querySelector('.seg').innerHTML = seg('speak', '朗讀') + '<span style="width:16px"></span>' + seg('sfx', '音效');
    };
    el.innerHTML = '<div class="seg"></div><p class="note">即時語音自動選用：Edge 用雲端「曉臻」、Chrome 用「雅婷」。</p>';
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-opt]'); if (!b) return;
      S[b.dataset.opt] = b.dataset.v === 'true'; draw(); if (b.dataset.opt === 'sfx' && S.sfx) window.GameSfx.sfx.good();
    });
    draw();
  }

  // 輪流上台。opt：tiers {A:{name,desc},B,C}；play(tier, n, done(result))；resultCols ['欄名']；row(result)→[欄值]
  // 三個畫面的容器：#turn（第 n 位＋選層級）、#play（遊戲）、#done（全班結果）
  const HOW = { 獨立: '自己完成', 提示: '看提示完成', 協助: '在協助下完成' };
  function turns(opt) {
    const T = { n: 0, log: [] };
    function show(id) { ['turn', 'play', 'done'].forEach((x) => { $(x).hidden = x !== id; }); window.scrollTo(0, 0); }
    function next() {
      T.n++; stop();
      $('turn').innerHTML = `<div class="turn">
        <div class="who">第 ${T.n} 位同學上台 🙋</div>
        <p class="sub" style="text-align:center">老師幫這位同學選任務等級</p>
        <div class="tiers">${Object.entries(opt.tiers).map(([k, t]) =>
          `<button class="tier" data-tier="${k}"><b>${t.name}</b><span>${t.desc}</span></button>`).join('')}</div>
        ${T.log.length ? `<button class="go alt" id="finish">全班都玩過了，看結果 ✔</button>` : ''}
      </div>`;
      show('turn');
      speak(`請第${T.n}位同學上台。`);
    }
    document.addEventListener('click', (e) => {
      const b = e.target.closest('#turn .tier, #turn #finish'); if (!b) return;
      if (b.id === 'finish') { T.n--; return finish(); }
      const tier = b.dataset.tier; show('play');
      opt.play(tier, T.n, (result) => { T.log.push({ n: T.n, tier, ...result }); next(); });
    });
    function finish() {
      stop(); window.GameSfx.sfx.fanfare();
      const cnt = ['獨立', '提示', '協助'].map((h) => [h, T.log.filter((x) => x.how === h).length]).filter(([, c]) => c);
      $('done').innerHTML = `<h2>🎉 全班 ${T.log.length} 位都完成了！</h2>
        <p class="sub">${cnt.map(([h, c]) => `${HOW[h]} ${c} 位`).join('、')}</p>
        <table class="log"><thead><tr><th>上台順序</th><th>等級</th>${opt.resultCols.map((c) => `<th>${c}</th>`).join('')}<th>完成方式</th></tr></thead>
        <tbody>${T.log.map((x) => `<tr><td>第 ${x.n} 位</td><td>${x.tier}</td>${opt.row(x).map((v) => `<td>${v}</td>`).join('')}<td>${HOW[x.how]}</td></tr>`).join('')}</tbody></table>
        <div class="row"><button class="go" id="again">再玩一輪</button></div>
        <p class="note">教師紀錄：依完成方式（獨立／提示／協助）記入紀錄表。這份結果只留在這個分頁，重新整理就清除，不會上傳。</p>`;
      show('done');
      speak(`太棒了！全班${T.log.length}位同學都完成了。`);
      $('again').addEventListener('click', () => { T.n = 0; T.log = []; next(); }, { once: true });
    }
    window.__turns = { T, next, finish };
    return { next, finish, show, log: T.log };
  }

  // 動畫頁：一幕一句旁白。steps＝[{ say, run(ctx) }]，run 回傳 Promise（動畫跑完）；旁白念完、動畫跑完才換下一幕。
  // opt：caption（字幕元素）、play／replay（按鈕）、reset()（回到第一幕前的畫面）
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, REDUCED ? Math.min(ms, 30) : ms));
  function anim(el, frames, ms, extra = {}) {
    const a = el.animate(frames, { duration: REDUCED ? 1 : ms, fill: 'forwards', easing: 'ease-in-out', ...extra });
    return a.finished.catch(() => {});
  }
  function story(steps, opt) {
    let run = 0;
    async function start() {
      const me = ++run; stop(); opt.reset();
      opt.play.disabled = true; opt.play.textContent = '播放中…';
      for (const st of steps) {
        if (me !== run) return;
        opt.caption.textContent = st.say;
        const said = new Promise((r) => speak(st.say, { onEnd: r }));
        await Promise.all([st.run ? st.run({ alive: () => me === run }) : 0, S.speak ? said : sleep(Math.max(1800, st.say.length * 160))]);
        if (me !== run) return;
        await sleep(st.pause || 400);
      }
      opt.play.disabled = false; opt.play.textContent = '▶ 再播一次';
      opt.onEnd && opt.onEnd();
    }
    opt.play.addEventListener('click', start);
    opt.replay && opt.replay.addEventListener('click', start);
    window.__story = { start, steps };
    return { start };
  }

  // 公斤 → 生活物品（與 calculator/ 同一套規則：挑「至少 1 個」的最重那一項）
  //   Act.weigh(kg) → { text:'差不多 12 瓶 500 mL 礦泉水', html:圖示列, clouds:朵數 }
  const CMP = TH.compare || [], KPU = (TH.constants || {}).kgPerUnit || 0.5;
  const fmt1 = (n) => Number(n.toFixed(1)).toLocaleString('zh-TW');
  function weigh(kg) {
    let it = CMP[0]; for (const x of CMP) if (kg >= x.kg) it = x;
    const n = kg / it.kg, whole = n < 1 ? 0 : Math.round(n), shown = Math.min(whole, 20);
    const text = n < 1 ? `不到 1 ${it.label}` : `差不多 ${n >= 2 ? Math.round(n) : fmt1(n)} ${it.label}`;
    let html = ''; for (let i = 0; i < shown; i++) html += icon(it.icon, '');
    if (!whole) html += `<span style="opacity:.45">${icon(it.icon, '')}</span>`;
    if (whole > 20) html += `<span>…還有 ${whole - 20} 個</span>`;
    return { text, html, clouds: Math.round(kg / KPU) };
  }

  window.Act = { S, $, speak, stop, icon, mountOptions, turns, story, anim, sleep, weigh, fmt1, TH, sfx: window.GameSfx.sfx };
})();
