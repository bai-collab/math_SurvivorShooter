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
      cardStats: [
        { key: 'burnDps', label: '燃燒秒傷', unit: '', base: 14, min: 1 },
        { key: 'burnSec', label: '燃燒秒數', unit: 's', base: 2.8, min: 0.5 },
      ],
    },
    thunder: {
      id: 'thunder',
      name: '雷之符文',
      short: '雷',
      colorHex: 0xffe45e,
      cssColor: '#ffe45e',
      desc: '命中後釋放連鎖閃電，跳躍電擊周圍敵人。',
      cardStats: [
        { key: 'chains', label: '連鎖次數', unit: '次', base: 3, min: 1, max: 15, round: true },
        { key: 'dmgPct', label: '連鎖傷害', unit: '%', base: 65, min: 10 },
      ],
    },
    ice: {
      id: 'ice',
      name: '冰之符文',
      short: '冰',
      colorHex: 0x76e8ff,
      cssColor: '#76e8ff',
      desc: '命中凍結寒氣，使怪物移動速度遲緩並有機率冰凍。',
      cardStats: [
        { key: 'slowSec', label: '遲緩秒數', unit: 's', base: 2.0, min: 0.5 },
        { key: 'freezeChance', label: '冰凍機率', unit: '%', base: 15, min: 0, max: 85 },
      ],
    },
    light: {
      id: 'light',
      name: '光之符文',
      short: '光',
      colorHex: 0xfff6b8,
      cssColor: '#fff6b8',
      desc: '強光致盲怪物，使其眼瞎看不到主角而四處亂走。',
      cardStats: [
        { key: 'blindSec', label: '致盲秒數', unit: 's', base: 2.2, min: 0.5 },
        { key: 'dmgBonus', label: '附加傷害', unit: '', base: 0, min: 0 },
      ],
    },
    vampire: {
      id: 'vampire',
      name: '吸血符文',
      short: '吸',
      colorHex: 0xff5478,
      cssColor: '#ff5478',
      desc: '子彈命中敵人時吸取生命，為主角回復血量。',
      cardStats: [
        { key: 'heal', label: '吸血回復', unit: '', base: 1.5, min: 0.5 },
        { key: 'chance', label: '觸發機率', unit: '%', base: 100, min: 10, max: 100 },
      ],
    },
    quake: {
      id: 'quake',
      name: '震之符文',
      short: '震',
      colorHex: 0xd29bff,
      cssColor: '#d29bff',
      desc: '命中時於目標位置引爆震波，傷害並震退周圍怪物。',
      cardStats: [
        { key: 'radius', label: '震波半徑', unit: '', base: 2.6, min: 0.8 },
        { key: 'dmgPct', label: '震波傷害', unit: '%', base: 45, min: 10 },
      ],
    },
    water: {
      id: 'water',
      name: '水之符文',
      short: '水',
      unlockHint: '在「水資源回收中心」據點解鎖',
      colorHex: 0x55d9ff,
      cssColor: '#55d9ff',
      desc: '命中留下減速水窪；雷電打中水窪內的怪物時會造成額外傷害。',
      cardStats: [
        { key: 'puddleSec', label: '水窪秒數', unit: 's', base: 3, min: 1, max: 8 },
        { key: 'slowPct', label: '水窪減速', unit: '%', base: 35, min: 10, max: 75, round: true },
      ],
    },
    rice: {
      id: 'rice',
      name: '稻穗符文',
      short: '稻',
      unlockHint: '在「校內一畝田」據點解鎖',
      colorHex: 0xb9e96f,
      cssColor: '#b9e96f',
      desc: '擊倒受此武器命中的怪物時，有機會掉落稻穀；撿起後回血並獲得少量經驗。',
      cardStats: [
        { key: 'dropChance', label: '稻穀掉落', unit: '%', base: 22, min: 1, max: 80, round: true },
        { key: 'heal', label: '回血量', unit: '', base: 12, min: 1, max: 80, round: true },
      ],
    },
    solar: {
      id: 'solar',
      name: '光電符文',
      short: '電',
      unlockHint: '在「屋頂太陽光電」據點解鎖',
      colorHex: 0xffe278,
      cssColor: '#ffe278',
      desc: '每次命中累積光能；能量滿 100 時，以玩家為中心釋放光電脈衝。',
      cardStats: [
        { key: 'energyPerHit', label: '每次命中能量', unit: '', base: 20, min: 5, max: 60, round: true },
        { key: 'pulseDamage', label: '脈衝傷害', unit: '', base: 42, min: 5, max: 200, round: true },
      ],
    },
  };

  const RESONANCES = [
    {
      id: 'overload',
      runes: ['fire', 'thunder'],
      name: '過載爆炸',
      desc: '火與雷同時命中時引爆小範圍震波。',
    },
    {
      id: 'frozen-water',
      runes: ['ice', 'water'],
      name: '急凍水窪',
      desc: '水窪結成冰面；怪物踏入時會滑退並短暫凍結。',
    },
    {
      id: 'conductive-net',
      runes: ['thunder', 'water'],
      name: '導電網',
      desc: '雷電沿水窪擴散，額外跳躍電擊附近怪物。',
    },
    {
      id: 'noon-sun',
      runes: ['light', 'solar'],
      name: '正午烈陽',
      desc: '光電脈衝範圍擴大，並讓受擊怪物短暫致盲。',
    },
    {
      id: 'harvest-return',
      runes: ['rice', 'vampire'],
      name: '豐收回春',
      desc: '稻穀更容易掉落，撿起時獲得更多回復。',
    },
  ];

  function getResonances(runeIds) {
    const owned = new Set(runeIds || []);
    return RESONANCES.filter((resonance) => resonance.runes.every((id) => owned.has(id)));
  }

  PGS.Runes = {
    MAX_PER_WEAPON: 3,
    DEFS: RUNE_DEFS,
    ALL_IDS: Object.keys(RUNE_DEFS),
    RESONANCES,
    getResonances,
  };
})(window);
