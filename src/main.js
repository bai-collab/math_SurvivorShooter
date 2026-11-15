(function (global) {
  'use strict';

  const PGS = global.PGS;

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
