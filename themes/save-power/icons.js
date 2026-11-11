// 節電主題的自繪向量圖示。每個值是 viewBox="0 0 64 64" 裡的 SVG 內容。
(function () {
  const wind = (x, y) => `<path d="M${x} ${y}h10M${x + 2} ${y + 6}h10M${x} ${y + 12}h10" stroke="#5bb8f5" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  const acBody = `<rect x="6" y="12" width="52" height="20" rx="5" fill="#fff" stroke="#6b7a90" stroke-width="2.5"/><path d="M12 26h40" stroke="#6b7a90" stroke-width="2.5" stroke-linecap="round"/><circle cx="50" cy="18" r="2" fill="#3ecf8e"/>`;
  const cold = `<path d="M18 38v10M32 38v14M46 38v10" stroke="#5bb8f5" stroke-width="3.5" stroke-linecap="round"/>`;
  const fan = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#e8f4ff" stroke="#3b82c4" stroke-width="2.5"/><g fill="#3b82c4"><ellipse cx="${cx}" cy="${cy - r * 0.45}" rx="${r * 0.22}" ry="${r * 0.42}"/><ellipse cx="${cx - r * 0.4}" cy="${cy + r * 0.25}" rx="${r * 0.22}" ry="${r * 0.42}" transform="rotate(-120 ${cx - r * 0.4} ${cy + r * 0.25})"/><ellipse cx="${cx + r * 0.4}" cy="${cy + r * 0.25}" rx="${r * 0.22}" ry="${r * 0.42}" transform="rotate(120 ${cx + r * 0.4} ${cy + r * 0.25})"/></g><circle cx="${cx}" cy="${cy}" r="${r * 0.14}" fill="#1f4e80"/>`;
  const tvBody = (screen) => `<rect x="6" y="12" width="52" height="34" rx="4" fill="#3a4658"/><rect x="10" y="16" width="44" height="26" rx="2" fill="${screen}"/><path d="M24 54h16M32 46v8" stroke="#3a4658" stroke-width="4" stroke-linecap="round"/>`;
  const tvOn = tvBody("#7fd0ff") + `<circle cx="22" cy="26" r="5" fill="#ffd84d"/><path d="M10 42l12-10 8 6 10-12 14 16z" fill="#4caf7a"/>`;
  const label = (t, bg) => `<rect x="30" y="38" width="32" height="22" rx="6" fill="${bg}"/><text x="46" y="54" font-size="13" font-weight="700" text-anchor="middle" fill="#fff" font-family="sans-serif">${t}</text>`;
  const monitor = (screen) => `<rect x="8" y="10" width="48" height="32" rx="4" fill="#3a4658"/><rect x="12" y="14" width="40" height="24" rx="2" fill="${screen}"/><path d="M32 42v8M20 52h24" stroke="#3a4658" stroke-width="4" stroke-linecap="round"/>`;
  const lamp = (bulb, glow) => `<path d="M14 56h26" stroke="#55627a" stroke-width="5" stroke-linecap="round"/><path d="M27 56V34l14-14" stroke="#55627a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M34 12l18 14-8 6-16-12z" fill="#55627a"/><circle cx="44" cy="30" r="5" fill="${bulb}"/><path d="M40 38l-6 14M46 39v15M52 37l6 13" stroke="${glow}" stroke-width="2.5" stroke-linecap="round"/>`;
  const ceiling = (c, rays) => `<rect x="4" y="6" width="56" height="6" rx="2" fill="#8b98ad"/><rect x="14" y="12" width="36" height="8" rx="3" fill="${c}" stroke="#8b98ad" stroke-width="2"/>${rays ? `<path d="M18 26l-4 10M32 26v12M46 26l4 10" stroke="#ffc933" stroke-width="3" stroke-linecap="round"/>` : ""}`;
  const face = (hat, skin) => `<circle cx="32" cy="38" r="18" fill="${skin}"/><path d="M10 26c2-14 12-20 22-20s20 6 22 20z" fill="${hat}"/><rect x="6" y="24" width="52" height="6" rx="3" fill="${hat}"/><circle cx="25" cy="38" r="2.6" fill="#33333a"/><circle cx="39" cy="38" r="2.6" fill="#33333a"/><path d="M24 46q8 7 16 0" stroke="#33333a" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="20" cy="44" r="3" fill="#ff9d9d" opacity=".6"/><circle cx="44" cy="44" r="3" fill="#ff9d9d" opacity=".6"/>`;

  window.THEME_ICONS = {
    bed: `<rect x="6" y="34" width="52" height="14" rx="3" fill="#7aa7e0"/><rect x="6" y="20" width="8" height="34" rx="2" fill="#8a6a4a"/><rect x="50" y="30" width="8" height="24" rx="2" fill="#8a6a4a"/><rect x="16" y="26" width="16" height="10" rx="4" fill="#fff"/><circle cx="48" cy="14" r="7" fill="#ffd84d"/>`,
    moon: `<path d="M40 8a24 24 0 1 0 16 36A20 20 0 0 1 40 8z" fill="#ffd84d"/><circle cx="14" cy="14" r="2" fill="#fff3b0"/><circle cx="24" cy="6" r="1.5" fill="#fff3b0"/>`,
    chance: `<rect x="12" y="6" width="40" height="52" rx="7" fill="#ffb347" stroke="#e08a1e" stroke-width="2.5"/><text x="32" y="45" font-size="36" font-weight="700" text-anchor="middle" fill="#fff" font-family="sans-serif">?</text>`,
    patrol: `<circle cx="27" cy="27" r="16" fill="#e8f4ff" stroke="#3b82c4" stroke-width="5"/><path d="M39 39l16 16" stroke="#3b82c4" stroke-width="7" stroke-linecap="round"/><path d="M19 27l6 6 10-11" stroke="#3ecf8e" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    bulb: `<circle cx="32" cy="26" r="17" fill="#ffd84d" stroke="#e0a800" stroke-width="2.5"/><rect x="24" y="42" width="16" height="12" rx="3" fill="#8b98ad"/><path d="M32 2v5M10 10l4 4M54 10l-4 4" stroke="#ffc933" stroke-width="3" stroke-linecap="round"/>`,
    curtain: `<rect x="8" y="8" width="48" height="48" rx="3" fill="#9fdcff" stroke="#8a6a4a" stroke-width="3"/><circle cx="34" cy="26" r="9" fill="#ffd84d"/><path d="M8 8h12v48H8zM44 8h12v48H44z" fill="#f08a7a"/><path d="M4 8h56" stroke="#8a6a4a" stroke-width="4" stroke-linecap="round"/>`,
    hairdryer: `<rect x="14" y="14" width="30" height="20" rx="10" fill="#f0739a"/><rect x="40" y="18" width="10" height="12" rx="2" fill="#c44f78"/><rect x="20" y="30" width="10" height="24" rx="4" fill="#c44f78"/>${wind(52, 18)}`,
    towel: `<rect x="14" y="8" width="36" height="48" rx="4" fill="#7fd6c2"/><path d="M14 18h36M14 46h36" stroke="#fff" stroke-width="4"/>`,
    pot: `<rect x="14" y="16" width="34" height="42" rx="6" fill="#f5f7fa" stroke="#6b7a90" stroke-width="2.5"/><rect x="12" y="8" width="38" height="10" rx="4" fill="#6b7a90"/><path d="M48 26h8v6" stroke="#6b7a90" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="24" cy="46" r="3.5" fill="#ff5a4d"/><text x="38" y="50" font-size="9" fill="#6b7a90" font-family="sans-serif">保溫</text>`,
    kettle: `<path d="M16 24h28l4 32H12z" fill="#8fc7f0" stroke="#3b82c4" stroke-width="2.5"/><rect x="18" y="16" width="24" height="8" rx="3" fill="#3b82c4"/><path d="M46 28c12 0 12 20 2 22" stroke="#3b82c4" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M26 4q4 4 0 8M36 4q4 4 0 8" stroke="#b9c4d4" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    ac: acBody + cold,
    fan: fan(32, 26, 20) + `<path d="M32 46v10M20 58h24" stroke="#3b82c4" stroke-width="4" stroke-linecap="round"/>`,
    t22: acBody + label("22°", "#3b82c4") + `<path d="M12 38v10M22 38v14" stroke="#5bb8f5" stroke-width="3.5" stroke-linecap="round"/>`,
    t26: acBody + label("26°", "#3ecf8e") + fan(16, 48, 11),
    lightsOn: ceiling("#ffe680", true) + fan(32, 50, 9),
    lightsOff: ceiling("#d5dbe5", false) + `<rect x="22" y="30" width="20" height="28" rx="4" fill="#f5f7fa" stroke="#6b7a90" stroke-width="2.5"/><rect x="28" y="44" width="8" height="10" rx="2" fill="#6b7a90"/>`,
    pcOn: monitor("#7fd0ff") + `<path d="M18 30l8-8 6 5 8-9" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    pcOff: monitor("#1d2430") + `<circle cx="32" cy="26" r="6" fill="none" stroke="#6b7a90" stroke-width="2.5"/><path d="M32 18v8" stroke="#6b7a90" stroke-width="2.5" stroke-linecap="round"/>`,
    tv: tvOn,
    tv2h: tvOn + label("2小時", "#e0653a"),
    tv1h: tvOn + label("1小時", "#3ecf8e"),
    tvSleep: tvOn + `<text x="44" y="14" font-size="14" font-weight="700" fill="#7a6ff0" font-family="sans-serif">Zz</text>` + label("8小時", "#e0653a"),
    tvTimer: tvOn + `<circle cx="48" cy="48" r="13" fill="#fff" stroke="#3ecf8e" stroke-width="3"/><path d="M48 40v8l6 4" stroke="#3ecf8e" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    clothesDryer: `<rect x="10" y="6" width="44" height="52" rx="5" fill="#f5f7fa" stroke="#6b7a90" stroke-width="2.5"/><circle cx="32" cy="36" r="14" fill="#ffd9c7" stroke="#6b7a90" stroke-width="2.5"/><path d="M26 32q3 4 0 8M32 30q3 6 0 12M38 32q3 4 0 8" stroke="#ff7a4d" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="18" cy="13" r="2.5" fill="#ff5a4d"/>`,
    hanger: `<path d="M4 12h56" stroke="#8a6a4a" stroke-width="3" stroke-linecap="round"/><path d="M32 12v6" stroke="#6b7a90" stroke-width="3"/><path d="M20 22l12-5 12 5 10 8-6 7-4-3v22H20V34l-4 3-6-7z" fill="#6fc3f0" stroke="#3b82c4" stroke-width="2"/><circle cx="52" cy="6" r="5" fill="#ffd84d"/>`,
    riceCooker: `<rect x="8" y="24" width="48" height="30" rx="8" fill="#f5f7fa" stroke="#6b7a90" stroke-width="2.5"/><path d="M12 24q20-14 40 0z" fill="#6b7a90"/><circle cx="32" cy="42" r="4" fill="#ff5a4d"/><path d="M24 4q4 4 0 8M36 4q4 4 0 8" stroke="#b9c4d4" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    microwave: `<rect x="4" y="14" width="56" height="36" rx="4" fill="#55627a"/><rect x="9" y="19" width="34" height="26" rx="2" fill="#ffe9a8"/><circle cx="26" cy="36" r="7" fill="#f08a4d"/><circle cx="52" cy="26" r="3" fill="#b9c4d4"/><circle cx="52" cy="38" r="3" fill="#3ecf8e"/>`,
    oldLamp: lamp("#ff9a3d", "#ffb347"),
    ledLamp: lamp("#dff3ff", "#8fd3ff"),
    plug: `<rect x="18" y="20" width="28" height="22" rx="5" fill="#55627a"/><path d="M25 8v12M39 8v12" stroke="#8b98ad" stroke-width="5" stroke-linecap="round"/><path d="M32 42v16" stroke="#55627a" stroke-width="5" stroke-linecap="round"/>`,
    filter: `<rect x="8" y="12" width="48" height="36" rx="4" fill="#e8f4ff" stroke="#3b82c4" stroke-width="2.5"/><path d="M8 24h48M8 36h48M20 12v36M32 12v36M44 12v36" stroke="#3b82c4" stroke-width="1.5"/><path d="M46 46l4 6 10-14" stroke="#3ecf8e" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    earth: `<circle cx="32" cy="32" r="26" fill="#5bb8f5"/><path d="M14 22q10-8 16 0t-4 12-12-2zM36 34q12-4 16 4t-8 14-8-18z" fill="#4caf7a"/>`,
    // 碳雲（灰色雲＋CO₂ 字樣）與重量比較用的生活物品
    cloud: `<path d="M17 48h31a11 11 0 0 0 1.5-21.9A15 15 0 0 0 21 24.5 12 12 0 0 0 17 48z" fill="#8d97a5" stroke="#5c6776" stroke-width="2.5" stroke-linejoin="round"/><text x="33" y="42" font-size="12" font-weight="700" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif">CO₂</text>`,
    waterBottle: `<rect x="27" y="4" width="10" height="7" rx="2" fill="#3b82c4"/><path d="M25 12h14l4 10v34a4 4 0 0 1-4 4H25a4 4 0 0 1-4-4V22z" fill="#e6f4ff" stroke="#3b82c4" stroke-width="2.5"/><rect x="23.5" y="30" width="17" height="27" rx="2" fill="#7cc6ff"/><rect x="21" y="26" width="22" height="8" fill="#3b82c4"/>`,
    waterJug: `<rect x="25" y="3" width="14" height="6" rx="2" fill="#3b82c4"/><path d="M22 10h20l8 10v36a5 5 0 0 1-5 5H19a5 5 0 0 1-5-5V20z" fill="#e6f4ff" stroke="#3b82c4" stroke-width="2.5"/><rect x="16.5" y="27" width="31" height="31" rx="3" fill="#7cc6ff"/><path d="M46 22h6a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-6" fill="none" stroke="#3b82c4" stroke-width="3.5"/><text x="32" y="48" font-size="11" font-weight="700" text-anchor="middle" fill="#1f4e80" font-family="Arial, sans-serif">5L</text>`,
    scooter: `<circle cx="14" cy="48" r="8" fill="#3a4658"/><circle cx="14" cy="48" r="3.5" fill="#cfd8e3"/><circle cx="50" cy="48" r="8" fill="#3a4658"/><circle cx="50" cy="48" r="3.5" fill="#cfd8e3"/><path d="M8 40c2-8 10-10 18-10h12l4 10z" fill="#e05a47"/><path d="M38 30l6-16h6" fill="none" stroke="#3a4658" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M42 40l6-14 6 14z" fill="#e05a47"/><rect x="16" y="24" width="16" height="6" rx="3" fill="#3a4658"/>`,
    avatar1: face("#3b82c4", "#ffd9b8"),
    avatar2: face("#e0653a", "#f5c9a0"),
    avatar3: face("#3ecf8e", "#ffe0c2"),
    avatar4: face("#8a6ff0", "#e8b98f")
  };
})();
