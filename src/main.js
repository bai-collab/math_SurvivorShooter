(function (global) {
  'use strict';

  const PGS = global.PGS;

  function installDebugTools(game, ui) {
    PGS.debug = PGS.debug || {};
    PGS.debug.unlockAll = () => game.unlockAllContent();
    const prepareDebugRun = () => {
      if (game.stateName !== 'playing') {
        ui.els.menuOverlay.classList.add('hidden');
        ui.els.hud.classList.remove('hidden');
        game.startRun(game.selectedStarter);
      }
      if (game.mathMode === 'world-question' || game.mathMode === 'paused-question' || game.mathMode === 'feedback' || game.mathMode === 'reward') {
        ui.hideMathAction();
        ui.hideMathBanner();
      }
      game.mathMode = 'none';
      game.mathCurrent = null;
      game.answerPads = [];
      if (game.mathHarvest.active) game.finishHarvestTask();
    };
    PGS.debug.forceQuizGate = () => {
      prepareDebugRun();
      return game.startMathQuiz();
    };
    PGS.debug.forceHarvestTask = () => {
      prepareDebugRun();
      game.startHarvestTask();
      return game.mathHarvest;
    };
  }

  function boot() {
    if (typeof global.THREE === 'undefined') {
      document.body.innerHTML =
        '<div style="padding:24px;color:#ffe8b4">無法載入 Three.js，請確認網路連線或使用本機伺服器開啟。</div>';
      return;
    }

    const container = document.getElementById('game-container');
    const assets = PGS.PixelArt.buildAllAssets();
    const renderer = new PGS.PixelRenderer(container, assets.textures);
    const audio = new PGS.RetroAudio();
    const ui = new PGS.GameUI(assets.iconDataUrls, assets.runeDataUrls, assets.gearDataUrls);
    const game = new PGS.SurvivorGame(renderer, audio, ui);

    ui.bindGame(game);
    PGS.game = game;
    // 除錯入口只在網址帶 ?debug=1 時才掛到 window.PGS（避免學生在主控台直接解鎖全部內容）。
    // 沒有 location 的環境（例如 Node 測試用的虛擬環境）視為開發環境，照常掛上。
    const debugEnabled = typeof global.location === 'undefined' || /[?&]debug=1(?:&|$)/.test(String(global.location.search || ''));
    if (debugEnabled) installDebugTools(game, ui);

    let last = performance.now();
    function loop(now) {
      const dt = (now - last) / 1000;
      last = now;
      game.update(dt);
      global.requestAnimationFrame(loop);
    }
    global.requestAnimationFrame(loop);
  }

  global.addEventListener('DOMContentLoaded', boot);
})(window);
