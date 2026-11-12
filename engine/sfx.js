// 合成音效（Web Audio，不用音檔）。棋盤遊戲 engine.js 與尋寶遊戲 hunt/ 共用這一份。
// 用法：GameSfx.enabled = () => 開或關；GameSfx.sfx.good()；GameSfx.until()＝音效預計結束的時間（朗讀要等它）
(function () {
  const G = { enabled: () => true, until: () => until };
  let actx, until = 0;
  const VOL = 0.13;
  function ac() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; } catch (e) { return null; } }
  function note(f, t, dur, { type = 'sine', vol = 1, to = 0 } = {}) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + t;
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(VOL * vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(t, dur, { freq = 2000, q = 1, vol = 1, to = 0 } = {}) {
    const c = ac(); if (!c) return;
    const n = Math.max(1, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t0 = c.currentTime + t;
    src.buffer = buf; f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(freq, t0);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.value = VOL * vol; src.connect(f).connect(g).connect(c.destination); src.start(t0);
  }
  function play(fn, dur) {
    if (!G.enabled()) return;
    try { fn(); } catch (e) { /* 沒有聲音也能玩 */ }
    until = Math.max(until, performance.now() + dur * 1000);   // 朗讀等音效結束才開始
  }
  const sfx = {
    rattle: () => play(() => { noise(0, 0.05, { freq: 2600, q: 4, vol: 0.9 }); }, 0.05),                         // 骰子滾動：喀
    land: () => play(() => { note(180, 0, 0.12, { vol: 1.4 }); noise(0, 0.04, { freq: 1200, vol: 0.6 }); }, 0.12), // 骰子停下：咚
    step: () => play(() => { note(620, 0, 0.07, { to: 900 }); }, 0.07),                                          // 走一格：啵
    flip: () => play(() => { noise(0, 0.16, { freq: 900, to: 3800, q: 0.8, vol: 0.8 }); }, 0.16),                // 翻卡：唰
    good: () => play(() => { note(1046, 0, 0.18, { type: 'triangle' }); note(1568, 0.08, 0.22, { type: 'triangle', vol: 0.7 }); }, 0.3), // 叮
    rise: () => play(() => { note(330, 0, 0.45, { to: 740, vol: 0.8 }); noise(0, 0.4, { freq: 500, to: 1600, q: 0.7, vol: 0.35 }); }, 0.45), // 碳雲飄上：咻～
    block: () => play(() => { note(1175, 0, 0.16, { type: 'triangle' }); note(780, 0.1, 0.35, { to: 330, vol: 0.7 }); }, 0.45),            // 擋下：叮＋往下收
    click: () => play(() => { noise(0, 0.025, { freq: 3500, q: 2, vol: 1.2 }); note(1318, 0.12, 0.12, { type: 'triangle', vol: 0.6 }); note(1760, 0.22, 0.2, { type: 'triangle', vol: 0.6 }); }, 0.42), // 關開關：喀＋好
    stamp: () => play(() => { note(110, 0, 0.18, { vol: 1.6 }); noise(0, 0.06, { freq: 700, vol: 0.8 }); }, 0.18),  // 蓋章：碰
    fanfare: () => play(() => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => note(f, i * 0.13, 0.22, { type: 'triangle' })); }, 1.1),
    gentle: () => play(() => { note(523, 0, 0.3, { vol: 0.7 }); note(440, 0.22, 0.3, { vol: 0.6 }); note(523, 0.44, 0.4, { vol: 0.6 }); }, 0.85) // 再試一次（溫和，不像處罰）
  };
  G.sfx = sfx;
  window.GameSfx = G;
})();
