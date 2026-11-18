(function (global) {
  'use strict';

  const PGS = (global.PGS = global.PGS || {});

  const GEAR_TYPES = {
    weapon: {
      type: 'weapon',
      label: '武器',
      stats: [
        { key: 'atk', label: '攻擊', unit: '' },
        { key: 'crit', label: '爆擊', unit: '%' },
      ],
    },
    shield: {
      type: 'shield',
      label: '盾牌',
      stats: [
        { key: 'hp', label: '生命', unit: '' },
        { key: 'def', label: '防禦', unit: '' },
        { key: 'dr', label: '減傷', unit: '%', lowerIsBetter: true },
      ],
    },
    glove: {
      type: 'glove',
      label: '手套',
      stats: [
        { key: 'aspd', label: '攻速', unit: '%' },
        { key: 'crit', label: '爆擊', unit: '%' },
      ],
    },
    boot: {
      type: 'boot',
      label: '鞋子',
      stats: [
        { key: 'mspd', label: '跑速', unit: '%' },
        { key: 'dr', label: '減傷', unit: '%', lowerIsBetter: true },
      ],
    },
  };

  const SLOTS = [
    { id: 'weapon', type: 'weapon', label: '武器' },
    { id: 'shield', type: 'shield', label: '盾牌' },
    { id: 'glove1', type: 'glove', label: '左手套' },
    { id: 'glove2', type: 'glove', label: '右手套' },
    { id: 'boot1', type: 'boot', label: '左鞋' },
    { id: 'boot2', type: 'boot', label: '右鞋' },
  ];

  const GEAR_NAMES = {
    weapon: ['鐵製槍托', '精鋼槍管', '獵人瞄具', '高能核心'],
    shield: ['木質圓盾', '鋼鐵塔盾', '秘銀壁壘', '力場護盾'],
    glove: ['皮製戰術套', '射擊護腕', '迅捷指套', '精密機械手'],
    boot: ['帆布跑鞋', '軍用戰靴', '輕羽長靴', '推進戰靴'],
  };

  const GEAR_TIERS = {
    basic: { key: 'basic', label: '基礎', color: '#9aa4b2', weight: 0.6 },
    medium: { key: 'medium', label: '中等', color: '#4ce0c0', weight: 0.3 },
    advanced: { key: 'advanced', label: '高級', color: '#ffd058', weight: 0.1 },
  };

  const TIER_BASE_STATS = {
    weapon: {
      basic: { atk: 2, crit: 2 },
      medium: { atk: 6, crit: 5 },
      advanced: { atk: 12, crit: 10 },
    },
    shield: {
      basic: { hp: 15, def: 1, dr: -2 },
      medium: { hp: 40, def: 3, dr: -5 },
      advanced: { hp: 80, def: 6, dr: -10 },
    },
    glove: {
      basic: { aspd: 4, crit: 2 },
      medium: { aspd: 10, crit: 5 },
      advanced: { aspd: 18, crit: 10 },
    },
    boot: {
      basic: { mspd: 4, dr: -2 },
      medium: { mspd: 10, dr: -5 },
      advanced: { mspd: 18, dr: -9 },
    },
  };

  const TERRAIN_DEFS = {
    obstacle: { key: 'obstacle', label: '障礙物', desc: '無法通過的岩石阻隔' },
    swamp: { key: 'swamp', label: '沼澤', desc: '踏入後移動變慢' },
    poison: { key: 'poison', label: '毒霧', desc: '身在其中持續扣血' },
    thunder: { key: 'thunder', label: '打雷', desc: '落雷造成傷害並麻痺' },
    ice: { key: 'ice', label: '冰雪', desc: '身在其中攻擊變慢' },
  };

  const STAGES = [
    {
      id: 'meadow',
      name: '第 1 關：稻香田野',
      desc: '基礎怪潮，掉落 1～5 數字牌與 + / - 運算牌。田埂與稻浪之間，障礙是稻草堆／竹叢／稻草人，沼澤是泥巴水田。',
      groundTint: 0xffffff,
      hpMult: 1.0,
      speedMult: 1.0,
      numbers: [1, 2, 3, 4, 5],
      ops: ['+', '-'],
      terrains: ['obstacle', 'swamp'],
    },
    {
      id: 'ruins',
      name: '第 2 關：廟埕夜市',
      desc: '敵人較快，掉落 3～9 數字牌與 + / - / * 運算牌。紅磚廟埕上有石獅、香爐與燈籠，毒霧是香火煙，還有落雷。',
      groundTint: 0xd9a89a,
      hpMult: 1.35,
      speedMult: 1.12,
      numbers: [3, 4, 5, 6, 7, 8, 9],
      ops: ['+', '-', '*'],
      terrains: ['obstacle', 'poison', 'thunder'],
    },
    {
      id: 'temple',
      name: '第 3 關：星空水圳',
      desc: '高壓菁英潮，掉落 1～9 全數字與四則運算牌。星空下的水圳流光，有冷霧、落雷與霜白冰晶。',
      groundTint: 0x9fa8d8,
      hpMult: 1.75,
      speedMult: 1.2,
      numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      ops: ['+', '-', '*', '/'],
      terrains: ['poison', 'thunder', 'ice'],
    },
  ];

  const MAX_CARDS_PER_STAT = 5;

  /**
   * 計算單一數值槽位的數字＋運算牌算式（先乘除後加減）
   * 合法格式必須以數字開頭與結尾，且數字與運算符號交替（1、3 或 5 張牌）
   */
  function evalCardFormula(cards) {
    if (!cards || cards.length === 0) {
      return { valid: true, value: 0, expr: '0' };
    }

    const expr = cards.map((c) => c.val).join(' ');
    if (cards.length % 2 === 0) {
      return { valid: false, value: 0, expr, reason: '需以數字結尾' };
    }

    for (let i = 0; i < cards.length; i++) {
      const expectNum = i % 2 === 0;
      if (expectNum && cards[i].kind !== 'num') {
        return { valid: false, value: 0, expr, reason: '此格應放數字牌' };
      }
      if (!expectNum && cards[i].kind !== 'op') {
        return { valid: false, value: 0, expr, reason: '此格應放運算牌' };
      }
    }

    // 第一輪：處理 * 與 /
    const nums = [Number(cards[0].val)];
    const ops = [];
    for (let i = 1; i < cards.length; i += 2) {
      const op = cards[i].val;
      const rhs = Number(cards[i + 1].val);
      if (op === '*') {
        nums[nums.length - 1] *= rhs;
      } else if (op === '/') {
        if (rhs === 0) return { valid: false, value: 0, expr, reason: '不可除以 0' };
        nums[nums.length - 1] /= rhs;
      } else {
        ops.push(op);
        nums.push(rhs);
      }
    }

    // 第二輪：處理 + 與 -
    let total = nums[0];
    for (let i = 0; i < ops.length; i++) {
      if (ops[i] === '+') total += nums[i + 1];
      else if (ops[i] === '-') total -= nums[i + 1];
    }

    const rounded = Math.round(total * 10) / 10;
    return { valid: true, value: rounded, expr };
  }

  function rollGearTier() {
    const r = Math.random();
    if (r < GEAR_TIERS.advanced.weight) return 'advanced';
    if (r < GEAR_TIERS.advanced.weight + GEAR_TIERS.medium.weight) return 'medium';
    return 'basic';
  }

  function createGearItem(type, uid, tierKey) {
    const names = GEAR_NAMES[type];
    const name = names[Math.floor(Math.random() * names.length)];
    const tier = GEAR_TIERS[tierKey] ? tierKey : rollGearTier();
    const baseStats = { ...(TIER_BASE_STATS[type]?.[tier] || {}) };
    const def = GEAR_TYPES[type];
    const statCards = {};
    def.stats.forEach((s) => {
      statCards[s.key] = [];
    });
    return { uid, type, name, tier, baseStats, statCards };
  }

  function normalizeGearItem(gear) {
    if (!gear || !GEAR_TYPES[gear.type]) return gear;
    const tier = GEAR_TIERS[gear.tier] ? gear.tier : 'basic';
    const defBase = TIER_BASE_STATS[gear.type][tier] || {};
    const baseStats = { ...defBase, ...(gear.baseStats || {}) };
    if (typeof baseStats.dr === 'number' && baseStats.dr > 0 && typeof defBase.dr === 'number') {
      baseStats.dr = defBase.dr;
    }
    const statCards = { ...(gear.statCards || {}) };
    GEAR_TYPES[gear.type].stats.forEach((s) => {
      if (!Array.isArray(statCards[s.key])) statCards[s.key] = [];
    });
    return { ...gear, tier, baseStats, statCards };
  }

  function computeTotalStats(save) {
    const totals = { atk: 0, crit: 0, hp: 0, def: 0, dr: 0, aspd: 0, mspd: 0 };
    if (!save || !save.equipped || !save.gearBag) return totals;

    const byUid = new Map(save.gearBag.map((g) => [g.uid, g]));
    for (const slot of SLOTS) {
      const uid = save.equipped[slot.id];
      if (!uid) continue;
      const gear = byUid.get(uid);
      if (!gear) continue;
      const def = GEAR_TYPES[gear.type];
      if (!def) continue;
      for (const st of def.stats) {
        const baseVal = (gear.baseStats && typeof gear.baseStats[st.key] === 'number')
          ? gear.baseStats[st.key]
          : (TIER_BASE_STATS[gear.type]?.[gear.tier || 'basic']?.[st.key] || 0);
        const res = evalCardFormula((gear.statCards && gear.statCards[st.key]) || []);
        totals[st.key] += baseVal + (res.valid ? res.value : 0);
      }
    }
    return totals;
  }

  PGS.Gear = {
    TYPES: GEAR_TYPES,
    TIERS: GEAR_TIERS,
    TERRAINS: TERRAIN_DEFS,
    SLOTS,
    STAGES,
    MAX_CARDS_PER_STAT,
    evalCardFormula,
    createGearItem,
    normalizeGearItem,
    computeTotalStats,
  };
})(window);
