// 學生照片 → 256×256 置中裁切的 JPEG data URL。只存在這次開啟的網頁記憶體，不上傳、不存檔。
// 棋盤遊戲（engine.js）與減碳身分認證（cert/）共用。
window.readPhoto = function (file, done) {
  if (!file || !/^image\//.test(file.type)) return;
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    const side = Math.min(img.naturalWidth, img.naturalHeight), cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    cv.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
    URL.revokeObjectURL(url);
    done(cv.toDataURL('image/jpeg', 0.85));
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
};
