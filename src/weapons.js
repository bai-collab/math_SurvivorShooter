(function (global) {
  'use strict';

  const PGS = (global.PGS = global.PGS || {});

  const CATEGORIES = ['全部', '手槍', '散彈', '連射', '狙擊', '特殊', '爆破'];

  const WEAPON_DEFS = {
    // ── 手槍類 ──────────────────────────────────────────────
    pistol: {
      id: 'pistol',
      category: '手槍',
      name: '標準手槍',
      tag: '最近鎖定 / 換彈震波',
      desc: '瞄準最近敵人，12發彈匣打空換彈時會震退貼身怪物。',
      targeting: 'nearest',
      sprite: 'bullet',
      color: 0xffe86e,
      damage: 22,
      cooldown: 0.36,
      range: 14,
      speed: 22,
      life: 0.72,
      spread: 0.04,
      pellets: 1,
      pierce: 1,
      bounces: 0,
      knockback: 2.2,
      magSize: 12,
      reloadTime: 0.85,
      reloadShockwave: { radius: 3.6, damage: 18, knockback: 8.5 },
      sound: 'pistol',
    },
    revolver: {
      id: 'revolver',
      category: '手槍',
      name: '跳彈左輪',
      tag: '命中彈跳 / 連鎖收割',
      desc: '6發裝填，子彈命中後會自動朝鄰近怪物彈跳最多 3 次。',
      targeting: 'nearest',
      sprite: 'ricochet',
      color: 0xee80ff,
      damage: 28,
      cooldown: 0.48,
      range: 14,
      speed: 23,
      life: 0.9,
      spread: 0.03,
      pellets: 1,
      pierce: 1,
      bounces: 3,
      bounceRange: 7.5,
      knockback: 1.8,
      magSize: 6,
      reloadTime: 1.0,
      sound: 'revolver',
    },
    dual_smg: {
      id: 'dual_smg',
      category: '手槍',
      name: '雙持衝鋒槍',
      tag: '雙目標齊射 / 高射速',
      desc: '左右開弓同時鎖定兩個不同敵人連續傾瀉子彈，適合四面受敵。',
      targeting: 'nearest',
      dualTarget: true,
      sprite: 'bullet',
      color: 0x76e8ff,
      damage: 11,
      cooldown: 0.22,
      range: 12.5,
      speed: 23,
      life: 0.58,
      spread: 0.1,
      pellets: 1,
      pierce: 1,
      bounces: 0,
      knockback: 1.0,
      magSize: 28,
      reloadTime: 1.1,
      sound: 'minigun',
    },
    venom_pistol: {
      id: 'venom_pistol',
      category: '手槍',
      name: '毒液吹箭槍',
      tag: '持續中毒 / 死後毒爆',
      desc: '子彈附帶 3 秒劇毒持續傷害，中毒敵人死亡會擴散毒霧。',
      targeting: 'nearest',
      sprite: 'venom',
      color: 0x82eb58,
      damage: 14,
      cooldown: 0.42,
      range: 14.5,
      speed: 21,
      life: 0.75,
      spread: 0.04,
      pellets: 1,
      pierce: 1,
      bounces: 0,
      knockback: 1.2,
      poisonDps: 14,
      poisonDuration: 3.0,
      magSize: 10,
      reloadTime: 0.9,
      sound: 'venom',
    },

    // ── 散彈類 ──────────────────────────────────────────────
    shotgun: {
      id: 'shotgun',
      category: '散彈',
      name: '雙管散彈',
      tag: '密集方向 / 強擊退',
      desc: '朝怪群最密集方向噴射 6 顆彈丸，強力擊退保命首選。',
      targeting: 'densest',
      sprite: 'pellet',
      color: 0xff9848,
      damage: 13,
      cooldown: 0.88,
      range: 9.5,
      speed: 20,
      life: 0.44,
      spread: 0.56,
      pellets: 6,
      pierce: 1,
      bounces: 0,
      knockback: 7.5,
      magSize: 4,
      reloadTime: 1.15,
      sound: 'shotgun',
    },
    dragon_breath: {
      id: 'dragon_breath',
      category: '散彈',
      name: '龍息燃燒散彈',
      tag: '高溫火焰 / 灼燒',
      desc: '噴出 5 團廣角烈焰彈丸，貫穿前排並附加 2.5 秒燃燒傷害。',
      targeting: 'densest',
      sprite: 'fire',
      color: 0xff762a,
      damage: 11,
      cooldown: 0.95,
      range: 8.5,
      speed: 15,
      life: 0.52,
      spread: 0.68,
      pellets: 5,
      pierce: 3,
      bounces: 0,
      knockback: 2.5,
      burnDps: 16,
      burnDuration: 2.5,
      magSize: 5,
      reloadTime: 1.2,
      sound: 'shotgun',
    },
    sonic_blaster: {
      id: 'sonic_blaster',
      category: '散彈',
      name: '音爆震盪砲',
      tag: '擴張音波 / 群體推開',
      desc: '發射隨距離不斷變寬的半月形音浪，貫穿並擊退整片怪群。',
      targeting: 'densest',
      sprite: 'sonic',
      color: 0x8cffda,
      damage: 24,
      cooldown: 1.05,
      range: 11.5,
      speed: 14,
      life: 0.72,
      spread: 0.0,
      pellets: 1,
      pierce: 16,
      bounces: 0,
      knockback: 8.2,
      growingWave: true,
      sound: 'sonic',
    },

    // ── 連射類 ──────────────────────────────────────────────
    minigun: {
      id: 'minigun',
      category: '連射',
      name: '轉輪機槍',
      tag: '過熱條 / 越射越快',
      desc: '無彈匣改用過熱條，連射越久射速越快；過熱需降溫 1.5 秒。',
      targeting: 'nearest',
      sprite: 'bullet',
      color: 0xffd058,
      damage: 10,
      cooldown: 0.16,
      minCooldown: 0.055,
      range: 13,
      speed: 24,
      life: 0.62,
      spread: 0.18,
      pellets: 1,
      pierce: 1,
      bounces: 0,
      knockback: 1.1,
      heatPerShot: 4.5,
      coolPerSec: 22,
      overheatLock: 1.5,
      sound: 'minigun',
    },
    pulse_rifle: {
      id: 'pulse_rifle',
      category: '連射',
      name: '脈衝突擊步槍',
      tag: '三連發點射 / 末發暴擊',
      desc: '每次開火快速三連發，第 3 發必定造成 1.8 倍暴擊傷害。',
      targeting: 'nearest',
      sprite: 'rail',
      color: 0x6ee8ff,
      damage: 16,
      cooldown: 0.72,
      burstCount: 3,
      burstInterval: 0.075,
      burstFinalMult: 1.8,
      range: 15.5,
      speed: 28,
      life: 0.62,
      spread: 0.03,
      pellets: 1,
      pierce: 2,
      bounces: 0,
      knockback: 2.0,
      magSize: 18,
      reloadTime: 1.0,
      sound: 'pistol',
    },
    nailgun: {
      id: 'nailgun',
      category: '連射',
      name: '重型釘槍',
      tag: '高頻釘刺 / 命中緩速',
      desc: '連射高速鋼釘，能貫穿 2 名敵人並讓目標大幅減速 1.2 秒。',
      targeting: 'nearest',
      sprite: 'bullet',
      color: 0xda9838,
      damage: 14,
      cooldown: 0.24,
      range: 13,
      speed: 25,
      life: 0.56,
      spread: 0.12,
      pellets: 1,
      pierce: 2,
      bounces: 0,
      knockback: 1.6,
      slowDuration: 1.2,
      magSize: 24,
      reloadTime: 1.05,
      sound: 'minigun',
    },

    // ── 狙擊與光束類 ────────────────────────────────────────
    railgun: {
      id: 'railgun',
      category: '狙擊',
      name: '穿甲電磁狙擊',
      tag: '鎖定菁英 / 貫穿整排',
      desc: '優先鎖定最高血量目標，射出可貫穿 8 名敵人的高速光束。',
      targeting: 'highestHp',
      sprite: 'rail',
      color: 0x5aecff,
      damage: 64,
      cooldown: 1.65,
      range: 20,
      speed: 38,
      life: 0.6,
      spread: 0.0,
      pellets: 1,
      pierce: 8,
      bounces: 0,
      knockback: 3.5,
      sound: 'railgun',
    },
    cryo_beam: {
      id: 'cryo_beam',
      category: '狙擊',
      name: '冷凍射線槍',
      tag: '累積寒氣 / 冰凍定身',
      desc: '連續發射低溫冰晶緩速敵人，疊滿 3 層寒氣會將怪物直接冰凍！',
      targeting: 'nearest',
      sprite: 'cryo',
      color: 0x94f0ff,
      damage: 14,
      cooldown: 0.28,
      range: 14,
      speed: 22,
      life: 0.68,
      spread: 0.04,
      pellets: 1,
      pierce: 2,
      bounces: 0,
      knockback: 0.6,
      chillStacks: 1,
      slowDuration: 2.0,
      sound: 'cryo',
    },
    gravity_gun: {
      id: 'gravity_gun',
      category: '狙擊',
      name: '重力奇點砲',
      tag: '黑洞聚怪 / 延遲引爆',
      desc: '朝密集怪群射出重力核心，產生吸力漩渦把怪物聚在一起後引爆。',
      targeting: 'densest',
      sprite: 'vortex',
      color: 0xd28cff,
      damage: 52,
      cooldown: 2.2,
      range: 15,
      speed: 16,
      life: 0.65,
      spread: 0.0,
      pellets: 1,
      pierce: 1,
      bounces: 0,
      knockback: 0,
      vortexRadius: 4.5,
      vortexDuration: 1.05,
      sound: 'railgun',
    },

    // ── 特殊彈道類 ──────────────────────────────────────────
    swarm_missile: {
      id: 'swarm_missile',
      category: '特殊',
      name: '蜂群飛彈巢',
      tag: '4發自動追蹤 / 曲線轟炸',
      desc: '齊射 4 枚微型追蹤飛彈，自動轉向鎖定不同敵人並造成小範圍爆破。',
      targeting: 'nearest',
      sprite: 'missile',
      color: 0xff6e4c,
      damage: 20,
      cooldown: 1.25,
      range: 18,
      speed: 14,
      life: 1.6,
      spread: 1.4,
      pellets: 4,
      pierce: 1,
      bounces: 0,
      knockback: 2.5,
      homing: 7.5,
      splashRadius: 1.8,
      sound: 'missile',
    },
    sawblade_gun: {
      id: 'sawblade_gun',
      category: '特殊',
      name: '鋸齒迴旋刃槍',
      tag: '折返切割 / 來回雙傷',
      desc: '射出高速旋轉圓鋸，飛到極限距離後折返回玩家手中，來回切割！',
      targeting: 'nearest',
      sprite: 'saw',
      color: 0xff8a70,
      damage: 26,
      cooldown: 1.05,
      range: 14,
      speed: 17,
      life: 1.5,
      spread: 0.05,
      pellets: 1,
      pierce: 99,
      bounces: 0,
      knockback: 2.0,
      boomerang: true,
      sound: 'saw',
    },
    plasma_arc: {
      id: 'plasma_arc',
      category: '特殊',
      name: '電漿連鎖槍',
      tag: '鏈狀閃電 / 瞬跳5目標',
      desc: '命中敵人後立刻釋放高壓鏈狀閃電，瞬間電擊周圍最多 5 名怪物。',
      targeting: 'nearest',
      sprite: 'ricochet',
      color: 0xdca0ff,
      damage: 24,
      cooldown: 0.85,
      range: 14,
      speed: 25,
      life: 0.65,
      spread: 0.02,
      pellets: 1,
      pierce: 1,
      bounces: 0,
      knockback: 1.4,
      chainCount: 5,
      chainRange: 5.5,
      sound: 'zap',
    },

    // ── 爆破類 ──────────────────────────────────────────────
    launcher: {
      id: 'launcher',
      category: '爆破',
      name: '電弧榴彈砲',
      tag: '拋物線 / 範圍緩速',
      desc: '朝密集怪群拋射榴彈，落地爆炸造成範圍傷害與短暫緩速。',
      targeting: 'densest',
      sprite: 'grenade',
      color: 0x9ee878,
      damage: 42,
      cooldown: 1.55,
      range: 14,
      speed: 13,
      life: 0.78,
      spread: 0.08,
      pellets: 1,
      pierce: 1,
      bounces: 0,
      knockback: 4.5,
      arc: true,
      splashRadius: 3.5,
      slowDuration: 1.5,
      sound: 'launcher',
    },
    cluster_mortar: {
      id: 'cluster_mortar',
      category: '爆破',
      name: '集束迫擊砲',
      tag: '二段分裂 / 4枚子炸彈',
      desc: '高拋重型迫擊砲彈，主彈落地爆炸後再向四周分裂 4 顆子炸彈！',
      targeting: 'densest',
      sprite: 'grenade',
      color: 0xffd65c,
      damage: 38,
      cooldown: 2.0,
      range: 16,
      speed: 12,
      life: 0.85,
      spread: 0.05,
      pellets: 1,
      pierce: 1,
      bounces: 0,
      knockback: 4.0,
      arc: true,
      splashRadius: 2.8,
      clusterCount: 4,
      sound: 'launcher',
    },
  };

  function createWeaponInstance(id) {
    const def = WEAPON_DEFS[id];
    return {
      id,
      def,
      level: 1,
      runes: [],
      timer: 0.1,
      ammo: def.magSize || 0,
      reloading: 0,
      heat: 0,
      overheated: 0,
      burstLeft: 0,
      burstTimer: 0,
      burstTarget: null,
      damageMult: 1,
      rateMult: 1,
      bonusPellets: 0,
      bonusPierce: 0,
      bonusBounces: 0,
    };
  }

  function findTarget(player, enemies, mode, maxRange, excludeId = null) {
    if (!enemies.length) return null;
    const r2 = maxRange * maxRange;

    if (mode === 'highestHp') {
      let best = null;
      let bestHp = -1;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.id === excludeId) continue;
        const dx = e.x - player.x;
        const dz = e.z - player.z;
        if (dx * dx + dz * dz > r2) continue;
        if (e.hp > bestHp) {
          bestHp = e.hp;
          best = e;
        }
      }
      return best;
    }

    if (mode === 'densest') {
      let best = null;
      let bestScore = -1;
      const step = enemies.length > 80 ? 2 : 1;
      for (let i = 0; i < enemies.length; i += step) {
        const a = enemies[i];
        if (a.id === excludeId) continue;
        const adx = a.x - player.x;
        const adz = a.z - player.z;
        if (adx * adx + adz * adz > r2) continue;
        let neighbors = 0;
        for (let j = 0; j < enemies.length; j += step) {
          const b = enemies[j];
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          if (dx * dx + dz * dz <= 12.25) neighbors++;
        }
        if (neighbors > bestScore) {
          bestScore = neighbors;
          best = a;
        }
      }
      return best;
    }

    let best = null;
    let bestD2 = r2;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.id === excludeId) continue;
      const dx = e.x - player.x;
      const dz = e.z - player.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = e;
      }
    }
    return best;
  }

  PGS.Weapons = {
    CATEGORIES,
    DEFS: WEAPON_DEFS,
    ALL_IDS: Object.keys(WEAPON_DEFS),
    createInstance: createWeaponInstance,
    findTarget,
  };
})(window);
