(function (global) {
  'use strict';

  const PGS = (global.PGS = global.PGS || {});

  const RUNE_DEFS = {
    fire: {
      id: 'fire',
      name: '火之符文',
      short: '火',
      colorHex: 0xff762a,
      cssColor: '#ff762a',
      desc: '命中附帶持續燃燒效果，每秒造成額外火焰傷害。',
    },
    thunder: {
      id: 'thunder',
      name: '雷之符文',
      short: '雷',
      colorHex: 0xffe45e,
      cssColor: '#ffe45e',
      desc: '命中後釋放連鎖閃電，跳躍電擊周圍最多 3 名敵人。',
    },
    ice: {
      id: 'ice',
      name: '冰之符文',
      short: '冰',
      colorHex: 0x76e8ff,
      cssColor: '#76e8ff',
      desc: '命中凍結寒氣，使怪物移動速度大幅遲緩 2 秒。',
    },
    light: {
      id: 'light',
      name: '光之符文',
      short: '光',
      colorHex: 0xfff6b8,
      cssColor: '#fff6b8',
      desc: '強光致盲怪物 2.2 秒，使其眼瞎看不到主角而四處亂走。',
    },
    vampire: {
      id: 'vampire',
      name: '吸血符文',
      short: '吸',
      colorHex: 0xff5478,
      cssColor: '#ff5478',
      desc: '子彈命中敵人時吸取生命，為主角回復血量。',
    },
    quake: {
      id: 'quake',
      name: '震之符文',
      short: '震',
      colorHex: 0xd29bff,
      cssColor: '#d29bff',
      desc: '命中時於目標位置引爆震波，傷害並震退周圍怪物。',
    },
  };

  PGS.Runes = {
    MAX_PER_WEAPON: 3,
    DEFS: RUNE_DEFS,
    ALL_IDS: Object.keys(RUNE_DEFS),
  };
})(window);
