/* =====================================================================
 * tts-zh.js — 瀏覽器中文語音工具（Web Speech API）
 * 無依賴、單檔複製即可用：<script src="tts-zh.js"></script> → window.ZhTTS
 *
 * 這份程式碼的每一段防護都對應一次真實事故，動手改之前先讀 SKILL.md 的五條鐵律：
 *   ① 挑好語音直接指定，不驗證瀏覽器有沒有照做
 *   ② getVoices() 每次回新物件 → speak 前用 fresh() 重抓
 *   ③ 品質優先的挑選會把男聲升級成女聲 → 角色說話一律明確傳 voice
 *   ④ 全域守門員只補位不蓋台
 *   ⑤ 音色一致性靠預錄音檔，即時 TTS 只是後備
 *   ⑥ 使用者自選的語音要存「完整識別資料」，不能只存名字（Edge 雲端與 Windows 本機同名）
 * ===================================================================== */
(function (global) {
  'use strict';

  const SS = global.speechSynthesis;
  const has = !!(SS && 'SpeechSynthesisUtterance' in global);

  // ── 引擎辨識 ────────────────────────────────────────────────────
  // ⚠️ Windows 本機語音與 Edge 雲端語音**名字幾乎一樣**：
  //    本機 "Microsoft Yating - Chinese (Traditional, Taiwan)"
  //    雲端 "Microsoft Yating Online (Natural) - Chinese (Traditional, Taiwan)"
  //    用 name.includes('Yating') 會同時命中兩支，取到誰全看排序，而音質天差地遠。
  //    → 一律用 engineOf() 分辨，並且在 UI 上標示出來給使用者看。
  function engineOf(v) {
    const n = (v && v.name) || '';
    if (/online|natural/i.test(n)) return 'online';   // Edge 雲端神經語音（需網路，Edge 才有）
    if (/^google|google/i.test(n)) return 'google';   // Chrome 的 Google 語音
    return 'local';                                   // 作業系統內建（離線，音質較機械）
  }

  const ENGINE_LABEL = {
    online: '☁️ 雲端（Edge 自然語音）',
    google: '🌐 Google 語音',
    local:  '💻 本機（系統內建）',
  };

  // 核心名：把引擎修飾字全部剝掉，用來比對「同一個人聲的不同引擎版本」
  // "Microsoft Yating Online (Natural) - Chinese (Traditional, Taiwan)" → "yating"
  function coreName(v) {
    return String((v && v.name) || '')
      .replace(/\s*-\s*.*$/, '')          // 去掉 " - Chinese (Traditional, Taiwan)"
      .replace(/\(.*?\)/g, '')            // 去掉 "(Natural)"
      .replace(/microsoft|google|online|natural|desktop|neural/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  const keyOf = v => v ? `${v.name}::${v.lang}` : '';
  const isZh  = v => !!(v && v.lang && /^zh/i.test(String(v.lang).replace('_', '-')));
  const isTW  = v => !!(v && /tw/i.test(v.lang || ''));
  const hasCJK = s => /[㐀-鿿豈-﫿]/.test(s || '');

  // ── 性別判定 ────────────────────────────────────────────────────
  // ⚠️ SpeechSynthesisVoice **沒有性別欄位**，語音目錄提供的 gender 也會標錯。
  //    只能靠「實際聽過的音色名單」比對；名單見 references/voice-catalog.md。
  // ⚠️ yunxi(?!a)：Yunxia（云夏）是卡通童聲（F0 311.7 Hz），不可被 yunxi 順手吃進來。
  const MALE_PAT = /yunjhe|云哲|雲哲|zhiwei|智威|yunxi(?!a)|云希|yunjian|云健|yunyang|云扬|yunze|云泽|yunfeng|云枫|yunye|云野|kangkang|康康/i;
  const FEMALE_PAT = /yating|雅婷|hsiaochen|曉臻|hsiaoyu|曉雨|hsiaochi|曉琪|xiaoxiao|晓晓|xiaoyi|晓伊|xiaochen|晓辰|xiaomeng|晓梦|xiaorui|晓睿|xiaohan|晓涵|xiaomo|晓墨|hanhan|涵涵|huihui|慧慧|yaoyao|瑤瑤|google 國語|google 普通话/i;
  // 實測夠低沉的男聲（F0：Yunyang 114.8 / Yunjian 117.1 / YunJhe 119.1 Hz）。
  // 男聲不是有就好——同樣掛 Male 的 Yunxi 是 185.3 Hz，比女聲 Yating（175.8）還高。
  const DEEP_MALE_PAT = /yunjhe|云哲|雲哲|yunjian|云健|yunyang|云扬|yunze|云泽|yunfeng|云枫|yunye|云野/i;

  function genderOf(v) {
    const n = (v && v.name) || '';
    if (MALE_PAT.test(n)) return 'male';
    if (FEMALE_PAT.test(n)) return 'female';
    return 'neutral';
  }

  // ── 語音清單 ────────────────────────────────────────────────────
  const state = { all: [], ready: false, _readyP: null };

  function load() {
    if (!has) return false;
    const all = SS.getVoices() || [];
    if (!all.length) return false;
    const score = v => ({ online: 0, google: 1, local: 2 })[engineOf(v)];
    state.all = all.filter(isZh).sort((a, b) => (score(a) - score(b)) || (isTW(b) - isTW(a)));
    return state.all.length > 0;
  }

  // ⚠️ voiceschanged 不保證會觸發（部分瀏覽器不發），一定要有輪詢補救。
  // ⚠️ 清單載完之前**不可**判定「這台沒有男聲／沒有中文語音」——會誤停用 UI 選項。
  function ready() {
    if (state._readyP) return state._readyP;
    state._readyP = new Promise(resolve => {
      if (!has) { state.ready = true; resolve(state.all); return; }
      const done = () => { state.ready = true; resolve(state.all); };
      if (load()) { done(); return; }
      SS.addEventListener && SS.addEventListener('voiceschanged', () => {
        if (load() && !state.ready) done();
      });
      let tries = 0;
      const t = setInterval(() => {
        if (load() || ++tries >= 13) { clearInterval(t); done(); }   // 最多等 ~4 秒
      }, 300);
    });
    return state._readyP;
  }

  const list = () => state.all.slice();

  // ⚠️ 鐵律②：頁面載入時存下的 voice 物件會失效（雲端語音非同步載入、getVoices 每次回新實例），
  //    設給 u.voice 會被靜默忽略 → 全部退成系統預設語音。真正要唸之前用名字重抓。
  function fresh(v) {
    if (!v || !has) return v;
    const all = SS.getVoices() || [];
    return all.find(x => x.name === v.name && x.lang === v.lang) || all.find(x => x.name === v.name) || v;
  }

  // ── 挑選 ────────────────────────────────────────────────────────
  // 品質優先（系統提示、旁白這類「不是角色在說話」的內容用）。
  // ⚠️ 鐵律③：角色說話**不要**用這支，它會把男聲升級成這台最好的 zh-TW 語音＝多半是女聲。
  function best(prefer) {
    const A = state.all;
    if (prefer && engineOf(prefer) !== 'local') return prefer;
    return A.find(v => engineOf(v) === 'online' && isTW(v))
        || A.find(v => engineOf(v) === 'online')
        || A.find(v => engineOf(v) === 'google' && isTW(v))
        || A.find(isTW) || prefer || A[0] || null;
  }

  // 指定性別的最佳語音（角色說話用）。挑完直接用，不驗證瀏覽器有沒有照做（鐵律①）。
  function bestByGender(gender) {
    const A = state.all.filter(v => genderOf(v) === gender);
    const hi = v => engineOf(v) !== 'local';
    if (gender === 'male') {
      const deep = v => DEEP_MALE_PAT.test(v.name);
      return A.find(v => deep(v) && hi(v) && isTW(v)) || A.find(v => deep(v) && hi(v))
          || A.find(deep) || A.find(v => hi(v) && isTW(v)) || A.find(isTW) || A[0] || null;
    }
    return A.find(v => hi(v) && isTW(v)) || A.find(isTW) || A.find(hi) || A[0] || null;
  }

  // 這台裝置有沒有該性別的中文語音（決定 UI 要不要停用「男角色」之類的選項）。
  // ⚠️ 一定要在 ready() 之後才問，否則清單還沒載完會回 false。
  const hasGender = g => !!bestByGender(g);

  // ── 使用者自選語音（每個瀏覽器各自記住）──────────────────────────
  // localStorage 天然按「瀏覽器 × 網域」隔離，所以 Edge 選的與 Chrome 選的本來就分開存，
  // 不需要自己做瀏覽器偵測。真正要處理的是**換瀏覽器後那支語音不存在**：
  //   Edge 選了 "Microsoft Yating Online (Natural)"，到 Chrome 只有本機 "Microsoft Yating"——
  //   名字像但不是同一支。所以偏好要存完整識別資料，並逐級退回、如實回報退回結果。
  const PREF_PREFIX = 'zhtts_voice_';

  function setPreferred(v, slot) {
    const k = PREF_PREFIX + (slot || 'default');
    try {
      if (!v) { localStorage.removeItem(k); return; }
      localStorage.setItem(k, JSON.stringify({
        name: v.name, lang: v.lang, voiceURI: v.voiceURI, engine: engineOf(v), core: coreName(v),
      }));
    } catch (e) { /* 無痕模式等寫入失敗：不影響發聲 */ }
  }

  function getPreferred(slot) {
    try { return JSON.parse(localStorage.getItem(PREF_PREFIX + (slot || 'default')) || 'null'); }
    catch (e) { return null; }
  }

  const clearPreferred = slot => setPreferred(null, slot);

  /**
   * 解析使用者存下的偏好 → 這台這個瀏覽器實際可用的語音。
   * @returns {{voice, status, saved}} status:
   *   'exact'      完全相同（name+lang）
   *   'same-name'  同名不同語系
   *   'downgraded' 同一個人聲的不同引擎版本（Edge 雲端 ⇄ Windows 本機）——音質會不一樣，**要告知使用者**
   *   'missing'    這個瀏覽器沒有這支語音，已回退到自動挑選
   *   'none'       使用者沒設過偏好
   */
  function resolvePreferred(slot) {
    const saved = getPreferred(slot);
    if (!saved) return { voice: null, status: 'none', saved: null };
    const A = state.all;
    let v = A.find(x => x.name === saved.name && x.lang === saved.lang);
    if (v) return { voice: v, status: 'exact', saved };
    v = A.find(x => x.name === saved.name) || (saved.voiceURI && A.find(x => x.voiceURI === saved.voiceURI));
    if (v) return { voice: v, status: 'same-name', saved };
    // 同一個人聲的其他引擎版本（雅婷雲端 ⇄ 雅婷本機）
    if (saved.core) {
      v = A.find(x => coreName(x) === saved.core && x.lang === saved.lang) || A.find(x => coreName(x) === saved.core);
      if (v) return { voice: v, status: 'downgraded', saved };
    }
    return { voice: null, status: 'missing', saved };
  }

  // 給 UI 用：一支語音該怎麼顯示給使用者看。**一定要連引擎標籤一起顯示**，
  // 否則畫面上會出現兩個「Microsoft Yating」，使用者無從分辨也無法回報。
  function describe(v) {
    if (!v) return { label: '（無）', engine: '', engineLabel: '', gender: 'neutral' };
    const eng = engineOf(v);
    return {
      label: v.name.replace(/\s*-\s*.*$/, ''),      // 去掉語系尾巴，畫面比較乾淨
      full: v.name,
      lang: v.lang,
      engine: eng,
      engineLabel: ENGINE_LABEL[eng],
      gender: genderOf(v),
      key: keyOf(v),
    };
  }

  // ── 說話 ────────────────────────────────────────────────────────
  /**
   * @param {string} text
   * @param {object} [opt] { voice, rate=0.9, pitch=1, lang='zh-TW', onEnd, onStart, keepQueue }
   *   voice 省略＝品質優先自動挑（系統語音用）；角色說話請明確傳入（鐵律③）。
   */
  function speak(text, opt) {
    opt = opt || {};
    if (!has || !text) { opt.onEnd && opt.onEnd(); return null; }
    if (!opt.keepQueue) SS.cancel();

    const u = new global.SpeechSynthesisUtterance(String(text));
    let voice = fresh(opt.voice || best(null));
    // ⚠️ 物件失效時賦值會丟 TypeError；吞掉並讓瀏覽器用預設語音把話說完，比整句唸不出來好。
    try { if (voice) { u.voice = voice; u.lang = voice.lang; } } catch (e) { voice = null; }
    if (!voice) u.lang = opt.lang || 'zh-TW';
    u.rate = opt.rate == null ? 0.9 : opt.rate;
    if (opt.pitch != null) u.pitch = opt.pitch;   // ⚠️ 不要用 pitch 把女聲壓成男聲：音質會變悶（實測放棄）

    // 只記錄實際發聲者供診斷顯示，**不做任何自動判定或換人**（鐵律①）
    ZhTTS.lastVoiceName = (voice && voice.name) || '(未指定)';
    let ended = false;
    const finish = () => { if (!ended) { ended = true; opt.onEnd && opt.onEnd(); } };
    u.onstart = () => { ZhTTS.lastVoiceName = (u.voice && u.voice.name) || '(瀏覽器預設)'; opt.onStart && opt.onStart(); };
    u.onend = finish;
    u.onerror = finish;
    // 保險：部分瀏覽器長句不觸發 onend，會讓「唸完才做的事」永遠不發生
    if (opt.onEnd) setTimeout(finish, Math.min(20000, 1500 + String(text).length * 220));

    SS.speak(u);
    return u;
  }

  function cancel() { if (has) SS.cancel(); }

  // ── 行動裝置解鎖（首次使用者手勢時呼叫一次）────────────────────────
  // 行動瀏覽器會擋「非手勢當下觸發」的音訊與 TTS；在手勢裡講一句無聲的話即算解鎖，
  // 之後自動／延遲觸發的語音才播得出來（隨後 cancel() 不影響解鎖效果）。
  let unlocked = false;
  function unlock() {
    if (unlocked) return true;
    unlocked = true;
    try {
      if (has) { const u = new global.SpeechSynthesisUtterance('。'); u.volume = 0; SS.speak(u); }
    } catch (e) {}
    try {
      const Ctx = global.AudioContext || global.webkitAudioContext;
      if (Ctx) { const ctx = new Ctx(); if (ctx.state === 'suspended') ctx.resume(); }
    } catch (e) {}
    try {
      const a = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      a.volume = 0; a.play().catch(() => {});
    } catch (e) {}
    return true;
  }

  // ── 預錄音檔後備鏈（鐵律⑤）──────────────────────────────────────
  // 依序嘗試 urls，第一個播得動的就播；全部失敗才呼叫 onFallback（通常是即時 TTS）。
  // ⚠️ 部署只上傳 mp3 時，mp3 一定要排在 wav 前面：wav 在前會先 404，要到 onerror 才播 mp3，
  //    那時已脫離使用者手勢的同步脈絡，行動瀏覽器（iOS 最嚴）會擋掉該次 play()。
  let _current = null;
  function playChain(urls, opt) {
    opt = opt || {};
    let i = 0;
    const token = {};
    _current = token;
    const next = () => {
      if (_current !== token) return;                       // 已被別的播放接手
      if (i >= urls.length) { opt.onFallback && opt.onFallback(); return; }
      const audio = new Audio(urls[i++]);
      let advanced = false;
      // ⚠️ onerror 與 play().catch() 對同一個失敗檔案會雙重觸發 → 沒守門會同時播兩個音檔
      const fail = () => { if (advanced) return; advanced = true; next(); };
      audio.onerror = fail;
      audio.onended = () => { if (_current === token) opt.onEnded && opt.onEnded(); };
      audio.onplay = () => { opt.onPlay && opt.onPlay(audio); };
      audio.play().catch(fail);
      opt.onAudio && opt.onAudio(audio);
    };
    next();
    return { stop() { if (_current === token) _current = null; } };
  }

  // ── 全域守門員（選用）────────────────────────────────────────────
  // 用途：整站有很多地方直接呼叫 speechSynthesis.speak，想保證「中文不要被英文語音唸」。
  // ⚠️ 鐵律④：只在「沒指定語音」或「指定了非中文語音」時補派，**已指定中文語音一律尊重**。
  //    無條件蓋台會把各模組費心挑好的角色聲全部換掉，而且極難查——症狀只是「男角色是女聲」。
  function installGatekeeper() {
    if (!has || SS.__zhttsGate) return;
    SS.__zhttsGate = true;
    const orig = SS.speak.bind(SS);
    SS.speak = function (u) {
      try {
        if (u && hasCJK(u.text) && !isZh(u.voice)) {
          const v = best(null);
          if (v) { u.voice = v; u.lang = v.lang; } else { u.voice = null; u.lang = 'zh-TW'; }
        }
      } catch (e) { /* 守門失敗不影響發聲 */ }
      return orig(u);
    };
  }

  const ZhTTS = {
    supported: has,
    lastVoiceName: null,       // 僅供診斷顯示，禁止拿來當控制流程的條件（鐵律①）
    ready, list, refresh: load, fresh,
    engineOf, coreName, keyOf, genderOf, describe, ENGINE_LABEL,
    best, bestByGender, hasGender,
    setPreferred, getPreferred, clearPreferred, resolvePreferred,
    speak, cancel, unlock, playChain, installGatekeeper,
    isFileProtocol: () => global.location && global.location.protocol === 'file:',
  };
  global.ZhTTS = ZhTTS;
})(typeof window !== 'undefined' ? window : globalThis);

/* 減碳偵探的預設語音（遊戲與計算器共用，唯一定義）：
 * 使用者在設定頁指定的 > Edge 雲端「曉臻」 > 「雅婷」（有雲端版用雲端版，Chrome 上是 Windows 本機版） > 模組的品質優先。 */
(function () {
  if (!window.ZhTTS) return;
  const online = (v) => /online|natural/i.test(v.name);
  window.ZhTTS.pickTW = function () {
    const r = ZhTTS.resolvePreferred();
    if (r.voice) return r.voice;
    const L = ZhTTS.list();
    return L.find((v) => /HsiaoChen/i.test(v.name) && online(v))
        || L.find((v) => /Yating/i.test(v.name) && online(v))
        || L.find((v) => /Yating/i.test(v.name))
        || ZhTTS.best(null);
  };

  /* 語音選單（尋寶遊戲用；棋盤遊戲設定頁自己畫，存的是同一份偏好）。
   * ZhTTS.mountPicker(容器, { sample: '試聽句' })：選了就存成這個瀏覽器的偏好，pickTW() 之後都用它。
   * 偏好存在瀏覽器（同網站共用）：在棋盤遊戲選的語音，尋寶遊戲也會用。 */
  window.ZhTTS.mountPicker = function (el, opt = {}) {
    if (!el) return;
    const Z = window.ZhTTS, esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const draw = () => {
      const r = Z.resolvePreferred(), cur = r.voice ? Z.describe(r.voice).key : '';
      const opts = Z.list().map((v) => { const d = Z.describe(v); return `<option value="${esc(d.key)}"${d.key === cur ? ' selected' : ''}>${esc(d.engineLabel)}｜${esc(d.label)}（${esc(v.lang)}）</option>`; }).join('');
      const note = r.status === 'missing' ? '這個瀏覽器沒有你之前選的語音，已改回自動挑選，請重新指定。'
        : r.status === 'downgraded' ? '這個瀏覽器沒有你之前選的那一版，改用同名的另一版，音質會不一樣。' : '';
      const now = Z.pickTW();
      el.innerHTML = `<label for="zhvoice">即時語音</label> <select id="zhvoice"><option value="">自動（Edge 用曉臻、Chrome 用雅婷）</option>${opts}</select>
        <button type="button" id="zhvoicetry">試聽</button>
        <p class="voicenote">${note ? esc(note) + '<br>' : ''}目前使用：${now ? esc(Z.describe(now).engineLabel + '｜' + Z.describe(now).label) : '系統預設（這個瀏覽器還沒載入中文語音）'}。☁️ 雲端語音（Edge）音質最好。</p>`;
    };
    el.addEventListener('change', (e) => {
      if (e.target.id !== 'zhvoice') return;
      const v = Z.list().find((x) => Z.describe(x).key === e.target.value) || null;
      Z.setPreferred(e.target.value ? v : null); draw();
    });
    el.addEventListener('click', (e) => {
      if (e.target.id !== 'zhvoicetry') return;
      try { speechSynthesis.cancel(); } catch (x) {}
      Z.speak(opt.sample || '你好，我是減碳偵探的朗讀聲音。', { voice: Z.pickTW() || undefined, rate: 0.9 });
    });
    draw(); Z.ready().then(draw);
  };
})();
