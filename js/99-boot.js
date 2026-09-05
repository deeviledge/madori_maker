/* 99-boot.js — 起動処理
   全スクリプトの読み込み後に実行する必要があるため、元ファイル末尾ではなくここに置く。 */
/* ================= 起動 ================= */
initStore();
tryRestore();
snapNow();
applyMode();
render();
setZoom(window.innerWidth<900?Math.min(38,(window.innerWidth-60)/(F().footW+1.3)):40);
