/* pwa.js — Service Worker の登録、更新バー、インストール導線
 * アプリ本体（js/*.js）とは独立。ここが失敗しても間取りエディタは動く。 */
(function () {
  'use strict';

  var isHttp = location.protocol === 'http:' || location.protocol === 'https:';

  /* ---------- 更新バー ---------- */
  var bar = document.getElementById('pwaUpdate');
  var reloadBtn = document.getElementById('pwaReload');
  var dismissBtn = document.getElementById('pwaDismiss');
  var waitingWorker = null;

  function showUpdateBar(worker) {
    waitingWorker = worker || null;
    if (bar) bar.classList.add('show');
  }
  if (reloadBtn) reloadBtn.onclick = function () {
    if (bar) bar.classList.remove('show');
    if (waitingWorker) { waitingWorker.postMessage({ type: 'SKIP_WAITING' }); setTimeout(function(){location.reload();}, 400); }
    else location.reload();
  };
  if (dismissBtn) dismissBtn.onclick = function () { if (bar) bar.classList.remove('show'); };

  /* ---------- Service Worker ---------- */
  if ('serviceWorker' in navigator && isHttp) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js', { scope: './' }).then(function (reg) {

        if (reg.waiting && navigator.serviceWorker.controller) showUpdateBar(reg.waiting);

        reg.addEventListener('updatefound', function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', function () {
            /* controller があるとき＝初回インストールではなく「更新」 */
            if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdateBar(nw);
          });
        });

        /* アプリに戻ってきたタイミングで更新確認 */
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') { try { reg.update(); } catch (e) {} }
        });
      }).catch(function () { /* 登録に失敗してもアプリはそのまま使える */ });

      navigator.serviceWorker.addEventListener('message', function (ev) {
        if (ev.data && ev.data.type === 'ASSETS_UPDATED') showUpdateBar(null);
      });
    });
  }

  /* ---------- ホーム画面へ追加（Android / デスクトップChrome） ---------- */
  var deferred = null;
  var HIDE_KEY = 'madoriInstallHidden';
  function hidden() { try { return localStorage.getItem(HIDE_KEY) === '1'; } catch (e) { return false; } }
  function hide() { try { localStorage.setItem(HIDE_KEY, '1'); } catch (e) {} }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    if (hidden()) return;
    var box = document.createElement('div');
    box.className = 'pwa-install show';
    box.innerHTML = '<span>ホーム画面に追加すると、アプリとして全画面で使えます</span>';
    var ok = document.createElement('button');
    ok.type = 'button'; ok.textContent = '追加';
    ok.onclick = function () {
      box.classList.remove('show');
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; hide(); });
    };
    var no = document.createElement('button');
    no.type = 'button'; no.className = 'ghost'; no.textContent = '×';
    no.setAttribute('aria-label', '閉じる');
    no.onclick = function () { box.classList.remove('show'); hide(); };
    box.appendChild(ok); box.appendChild(no);
    document.body.appendChild(box);
  });

  window.addEventListener('appinstalled', function () { deferred = null; hide(); });
})();
