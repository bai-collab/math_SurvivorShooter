(function (global) {
  'use strict';

  const PGS = (global.PGS = global.PGS || {});

  const SAVE_KEY = 'pgs_save_v1';
  const ARENA_LIMIT = 108;
  // 答案踏板的圓台半徑；踏板圓心加半徑必須都在場地內
  const ANSWER_PAD_RADIUS = 1.15;

  const ENEMY_ARCHETYPES = {
    crawler: { hp: 28, speed: 3.1, radius: 0.55, halfH: 0.62, shadowScale: 0.85, damage: 8, atkCd: 0.7, xp: 10, goldChance: 0.08, runeChance: 0.025, gearChance: 0.018, cardChance: 0.05 },
    runner: { hp: 22, speed: 5.2, radius: 0.55, halfH: 0.72, shadowScale: 0.9, damage: 11, atkCd: 0.5, xp: 14, goldChance: 0.12, runeChance: 0.035, gearChance: 0.022, cardChance: 0.06 },
    tank: { hp: 115, speed: 2.1, radius: 0.88, halfH: 0.95, shadowScale: 1.35, damage: 16, atkCd: 1.0, xp: 32, goldChance: 0.28, runeChance: 0.08, gearChance: 0.06, cardChance: 0.14 },
    elite: { hp: 420, speed: 2.75, radius: 1.05, halfH: 1.15, shadowScale: 1.6, damage: 24, atkCd: 0.8, xp: 120, goldChance: 1.0, runeChance: 0.5, gearChance: 0.45, cardChance: 1.0 },
    // 1. 進戰類 - 基礎怪物
    dagger: { hp: 24, speed: 5.0, radius: 0.55, halfH: 0.72, shadowScale: 0.85, damage: 6, atkCd: 0.42, xp: 11, goldChance: 0.09, runeChance: 0.025, gearChance: 0.02, cardChance: 0.05 },
    blade: { hp: 58, speed: 3.1, radius: 0.7, halfH: 0.82, shadowScale: 1.1, damage: 14, atkCd: 0.9, xp: 18, goldChance: 0.14, runeChance: 0.04, gearChance: 0.03, cardChance: 0.08 },
    spear: { hp: 32, speed: 4.6, radius: 0.58, halfH: 0.72, shadowScale: 0.9, damage: 7, atkCd: 0.48, onHitStatus: 'bleed', xp: 14, goldChance: 0.12, runeChance: 0.035, gearChance: 0.025, cardChance: 0.06 },
    // 2. 中程類 - 每 200 隻出現 1 隻
    archer: { hp: 95, speed: 2.0, radius: 0.65, halfH: 0.82, shadowScale: 1.0, damage: 24, atkCd: 2.4, range: 12, projSprite: 'e_arrow', projSpeed: 12.5, xp: 85, goldChance: 0.8, runeChance: 0.25, gearChance: 0.25, cardChance: 0.7 },
    slinger: { hp: 80, speed: 3.2, radius: 0.65, halfH: 0.82, shadowScale: 1.0, damage: 8, atkCd: 1.5, range: 10, projSprite: 'e_stone', projSpeed: 9.5, onHitStatus: 'stun', xp: 85, goldChance: 0.8, runeChance: 0.25, gearChance: 0.25, cardChance: 0.7 },
    // 3. 遠程魔法類 - 每 1000 隻出現 1 隻
    mage_fire: { hp: 190, speed: 2.3, radius: 0.72, halfH: 0.9, shadowScale: 1.15, damage: 14, atkCd: 2.0, range: 15, projSprite: 'e_fire', projSpeed: 9.0, onHitStatus: 'burn', xp: 240, goldChance: 1.0, runeChance: 0.7, gearChance: 0.75, cardChance: 1.0 },
    mage_ice: { hp: 190, speed: 2.3, radius: 0.72, halfH: 0.9, shadowScale: 1.15, damage: 12, atkCd: 2.0, range: 15, projSprite: 'e_ice', projSpeed: 9.0, onHitStatus: 'chill', xp: 240, goldChance: 1.0, runeChance: 0.7, gearChance: 0.75, cardChance: 1.0 },
    mage_thunder: { hp: 190, speed: 2.3, radius: 0.72, halfH: 0.9, shadowScale: 1.15, damage: 15, atkCd: 2.2, range: 15, projSprite: 'e_thunder', projSpeed: 10.5, onHitStatus: 'paralyze', xp: 240, goldChance: 1.0, runeChance: 0.7, gearChance: 0.75, cardChance: 1.0 },
  };

  // 怪物被擊倒時的像素碎片主色（對應各怪精靈圖的主色）
  const ENEMY_SHARD_COLORS = {
    crawler: 0x68c45c, runner: 0xd65648, tank: 0x7a74a0, elite: 0xe6b040, dagger: 0x52a880, blade: 0x9c4242,
    spear: 0x4e76c6, archer: 0x40924e, slinger: 0xba8a48, mage_fire: 0xe04e34, mage_ice: 0x4cb2eb, mage_thunder: 0x8e5ce0,
  };

  // ── 算式閘門：依「玩家選到的錯誤選項」給專屬提示（不直接說出正解）──
  // 題目資料只提供 misconceptionTags（迷思標籤）、沒有「選項→迷思」的對應，
  // 所以先用題型與題幹數字推斷這個錯誤選項最像哪一種迷思；推不出來才改用標籤（依錯誤選項順序）給提示。
  // 提示文字刻意少用阿拉伯數字，避免剛好和正確答案撞在一起。
  const MISCONCEPTION_HINTS = {
    '忘記進位': '個位相加滿十時，有沒有向十位進一？',
    '十位與個位混算': '十位和個位要分開算，最後再合起來。',
    '少算或多算一個十': '再檢查十位：是不是多算或少算了一個十？',
    '忘記退位': '個位不夠減時，要向十位借一個十，十位也要跟著少一。',
    '個位大減小': '個位不夠減時，不能直接用大的減小的。',
    '看錯比較方向': '符號的開口要朝向比較大的那個數。',
    '比較符號用反': '符號的開口要朝向比較大的那個數。',
    '只看個位': '先比十位，十位一樣大時才比個位。',
    '多跳或少跳一格': '數一數：從最後一個數再往前跳，要跳幾次？',
    '把間距看錯': '先看相鄰兩個數差多少，那就是每次跳的間距。',
    '把長針和短針看反': '長針看幾分，短針看幾點，再讀一次。',
    '半點讀成整點': '長針指向六是半點，指向十二才是整點。',
    '把乘法當成加法': '乘法是「幾組、每組幾個」，不是把兩個數相加。',
    '九九乘法表記錯': '用九九乘法表或連加，再核對一次。',
    '餘數大於除數': '餘數一定要比除數小。',
    '商多算或少算一個': '用「除數 × 商 + 餘數」檢查，看有沒有剛好等於總數。',
    '只算第一步': '這題有兩個步驟，第一步算完後，還要接著算第二步喔。',
    '運算順序錯': '先想清楚哪一步先算，把第一步的答案拿去做第二步。',
    '加減方向看反': '想一想：第二步是變多了，還是變少了？',
    '忘記把兩邊合起來': '右邊算出來之後，別忘了再和左邊合起來。',
    '把多出來的數加錯': '「多幾隻」是在左邊的數量上再加上去。',
    '把因數和倍數弄反':'因數是能整除的數，倍數是乘出來的數。',
    '忘記檢查能否整除': '用除法檢查：沒有餘數才算整除。',
    '把分母當成大小方向': '分母相同時，只要比較分子。',
    '分子分母一起相加': '分母相同時，分母不變，只算分子。',
    '分母也跟著運算': '分母相同時，分母不變，只算分子。',
    '面積和周長公式混淆': '面積是裡面有多大，周長是繞一圈有多長，算法不一樣。',
    '忘記周長要算兩組長寬': '長方形有四個邊：兩個長、兩個寬，都要算進去。',
    '把公斤當成 100 公克': '一公斤是一千公克，先換成相同單位。',
    '忘記換單位再相加': '單位要先換成一樣，再相加。',
    '把公因數和公倍數弄混': '公因數是能同時整除兩數的數，公倍數是兩數都能乘出來的數。',
    '直接相加或相乘': '最大公因數、最小公倍數不是把兩個數直接相加或相乘。',
    '把 1 當成質數': '質數必須剛好有兩個不同的因數，想想看一有幾個因數。',
    '只檢查奇偶數': '奇數不一定是質數，要檢查有沒有其他因數。',
    '分子分母各自相加': '分母不同時，不能分子分母各自相加，要先通分。',
    '忘記先通分': '分母不同時，先通分成相同分母再算。',
    '答案沒有約分': '算完後，看看分子分母能不能一起約分。',
    '小數點位數點錯': '數一數兩個因數共有幾位小數，積也要有一樣多位。',
    '忘記百分率要除以 100': '百分率是每一百份取幾份，別忘了除以一百。',
    '把剩下的量當成答案': '題目問的是取出的那一部分，不是剩下的。',
    '把比例方向看反': '看清楚比的順序：誰在前、誰在後。',
    '沒有先算每一份': '先算出「每一份」是多少，再乘上份數。',
    '把距離和速率弄混': '距離、速率、時間三者的關係：距離 ＝ 速率 × 時間。',
    '忘記乘上或除以時間': '別忘了時間：速率要乘時間，距離要除以時間。',
  };

  function leadingNumber(text) {
    const m = String(text).match(/^-?\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : NaN;
  }

  // 依題型與題幹數字，判斷「玩家選的這個錯誤選項」最像哪種迷思；判斷不出來回傳 null。
  function targetedMisconceptionHint(question, text) {
    const prompt = String(question.prompt || '');
    const answer = String(question.choices[question.answerIndex]);
    const c = leadingNumber(text);
    const a = leadingNumber(answer);
    let m;
    switch (question.topic) {
      case 'add-subtract': {
        if (!(m = prompt.match(/(\d+) ([+−]) (\d+)/))) return null;
        const x = Number(m[1]);
        const y = Number(m[3]);
        if (m[2] === '+') {
          const ones = (x % 10) + (y % 10);
          if (ones >= 10 && c === (Math.floor(x / 10) + Math.floor(y / 10)) * 10 + (ones % 10)) return MISCONCEPTION_HINTS['忘記進位'];
        } else if ((x % 10) < (y % 10) && c === (Math.floor(x / 10) - Math.floor(y / 10)) * 10 + ((y % 10) - (x % 10))) {
          return MISCONCEPTION_HINTS['忘記退位'];
        }
        if (Math.abs(c - a) === 10) return MISCONCEPTION_HINTS['少算或多算一個十'];
        if (Math.abs(c - a) <= 2) return '十位都對了，再把個位算一次，差一點點喔。';
        return null;
      }
      case 'compare':
        if (/=/.test(text)) return '兩個數字不一樣大，中間不會是等號。';
        return MISCONCEPTION_HINTS['看錯比較方向'];
      case 'number-line': {
        if (!(m = prompt.match(/往前跳 (\d+) 格：(\d+)、(\d+)/))) return null;
        const start = Number(m[2]);
        const second = Number(m[3]);
        if (c === start || c === second) return '問的是「接下來」，答案要比最後一個數更大。';
        return MISCONCEPTION_HINTS['多跳或少跳一格'];
      }
      case 'clock': {
        const minute = String(text).split(':')[1];
        const answerMinute = answer.split(':')[1];
        if (minute !== answerMinute) return MISCONCEPTION_HINTS['半點讀成整點'];
        return '分鐘讀對了，再看短針指在哪個數字附近。';
      }
      case 'multiplication': {
        if (!(m = prompt.match(/(\d+) × (\d+)/))) return null;
        if (c === Number(m[1]) + Number(m[2])) return MISCONCEPTION_HINTS['把乘法當成加法'];
        return MISCONCEPTION_HINTS['九九乘法表記錯'];
      }
      case 'division-remainder': {
        if (!(m = prompt.match(/平均分給 (\d+) 個籃子/))) return null;
        const r = String(text).match(/餘 (\d+)/);
        if (r && Number(r[1]) >= Number(m[1])) return MISCONCEPTION_HINTS['餘數大於除數'];
        return MISCONCEPTION_HINTS['商多算或少算一個'];
      }
      case 'two-step': {
        // 解說固定寫「第一步：…＝X；第二步：…」，選到 X 就是只算了第一步。
        const first = String(question.explanation || '').match(/第一步：[^；]*?= (\d+)/);
        if (first && c === Number(first[1])) return MISCONCEPTION_HINTS['只算第一步'];
        return '把題目分成兩步：先算第一步的結果，再用它算第二步。';
      }
      case 'factors-multiples': {
        if ((m = prompt.match(/哪個數是 (\d+) 的因數/))) {
          return '因數要能把題目那個數整除；用題目的數除以你選的數，有沒有餘數？';
        }
        if ((m = prompt.match(/(\d+) 的下一個倍數/))) {
          return '倍數是題目那個數乘上整數；你選的數能被題目的數整除嗎？';
        }
        return null;
      }
      case 'same-denominator-fractions': {
        if (/比較/.test(prompt)) return MISCONCEPTION_HINTS['把分母當成大小方向'];
        if (!(m = prompt.match(/(\d+)\/(\d+) [+−] (\d+)\/(\d+)/))) return null;
        const den = String(text).split('/')[1];
        if (den !== m[2]) return MISCONCEPTION_HINTS['分母也跟著運算'];
        return '分母不變是對的；再檢查分子是加還是減、算對了沒有。';
      }
      case 'rectangle': {
        if (!(m = prompt.match(/長 (\d+) 公分、寬 (\d+) 公分的長方形，(面積|周長)/))) return null;
        const l = Number(m[1]);
        const w = Number(m[2]);
        if (m[3] === '周長') {
          if (c === l * w) return '你算的是面積；周長要把四個邊的長度加起來。';
          if (c === l + w || c === l * w + l + w) return MISCONCEPTION_HINTS['忘記周長要算兩組長寬'];
          return '周長是繞一圈的長度，把四個邊加起來再檢查一次。';
        }
        if (c === 2 * (l + w)) return '你算的是周長；面積是長 × 寬。';
        if (c === l + w) return '面積不是把長和寬相加，而是長 × 寬。';
        return '面積用長 × 寬，再核對一次乘法。';
      }
      case 'kg-gram': {
        if (!(m = prompt.match(/(\d+) 公斤 (\d+) 公克/))) return null;
        if (c === Number(m[1]) * 100 + Number(m[2])) return MISCONCEPTION_HINTS['把公斤當成 100 公克'];
        if (c === Number(m[1]) + Number(m[2])) return MISCONCEPTION_HINTS['忘記換單位再相加'];
        return '先把公斤換成公克，再和剩下的公克相加。';
      }
      case 'gcd-lcm': {
        if (!(m = prompt.match(/(\d+) 和 (\d+) 的(最大公因數|最小公倍數)/))) return null;
        const x = Number(m[1]);
        const y = Number(m[2]);
        const g = PGS.MathQuest ? PGS.MathQuest.gcd(x, y) : 1;
        const lcm = (x * y) / g;
        if (m[3] === '最大公因數' && c === lcm) return '你找的是公倍數；最大公因數是「能同時整除兩數」的最大數。';
        if (m[3] === '最小公倍數' && c === g) return '你找的是公因數；最小公倍數是「兩數都能乘出來」的最小數。';
        if (c === x + y || c === x * y) return MISCONCEPTION_HINTS['直接相加或相乘'];
        return null;
      }
      case 'prime-composite': {
        if (!(m = prompt.match(/數字 (\d+) 是/))) return null;
        if (Number(m[1]) === 1) return MISCONCEPTION_HINTS['把 1 當成質數'];
        return '列出題目那個數的所有因數，看看除了一和自己，還有沒有別的。';
      }
      case 'unlike-fractions': {
        if (!(m = prompt.match(/(\d+)\/(\d+) [+−] (\d+)\/(\d+)/))) return null;
        const den = Number(String(text).split('/')[1]);
        if (den === Number(m[2]) + Number(m[4])) return MISCONCEPTION_HINTS['分子分母各自相加'];
        return '先通分成相同的分母，再算分子，最後看能不能約分。';
      }
      case 'decimal-multiplication': {
        if (!(m = prompt.match(/(\d+\.\d) × (\d+\.\d)/))) return null;
        if (Math.abs(c - (Number(m[1]) + Number(m[2]))) < 1e-9) return '這題是乘法，不是把兩個小數相加。';
        return MISCONCEPTION_HINTS['小數點位數點錯'];
      }
      case 'percentage': {
        if (!(m = prompt.match(/(\d+) 公斤稻穀的 (\d+)%/))) return null;
        if (c === Number(m[1]) * Number(m[2])) return MISCONCEPTION_HINTS['忘記百分率要除以 100'];
        if (c === Number(m[1]) - a) return MISCONCEPTION_HINTS['把剩下的量當成答案'];
        return '百分率是每一百份取幾份，用「全部 × 百分率 ÷ 一百」再算一次。';
      }
      case 'ratio': {
        if (!(m = prompt.match(/數量比是 (\d+)：(\d+)，藍色有 (\d+) 把/))) return null;
        const red = Number(m[1]);
        const blue = Number(m[2]);
        const blueCount = Number(m[3]);
        if (c === blueCount) return '紅色和藍色的份數不同，數量不會一樣多。';
        if (c === blueCount + red - blue || c === blueCount - red) return '比例不能用「差多少」來算，要用「每一份」是多少。';
        return MISCONCEPTION_HINTS['沒有先算每一份'];
      }
      case 'speed-time': {
        if (!(m = prompt.match(/(\d+) 公里要騎 (\d+) 小時|每小時 (\d+) 公里的速度騎 (\d+) 小時/))) return null;
        if (m[1]) {
          if (c === Number(m[1])) return '這是總距離；平均每小時要把距離除以時間。';
          return MISCONCEPTION_HINTS['忘記乘上或除以時間'];
        }
        if (c === Number(m[3]) + Number(m[4])) return '速率和時間不能相加，距離是速率 × 時間。';
        if (c === Number(m[3])) return '這只是一小時騎的距離；要騎好幾個小時。';
        return MISCONCEPTION_HINTS['忘記乘上或除以時間'];
      }
      default:
        return null;
    }
  }

  // 依「玩家選到的錯誤選項」回傳專屬迷思提示；推不出來時改用 misconceptionTags（依錯誤選項的順序對應）。
  // 回傳 null 代表題目資料不足，由呼叫端退回題型通用提示。
  function getMisconceptionHint(question, choiceIndex) {
    if (!question || !Array.isArray(question.choices) || choiceIndex === question.answerIndex) return null;
    const text = question.choices[choiceIndex];
    if (text == null) return null;
    let hint = null;
    try {
      hint = targetedMisconceptionHint(question, String(text));
    } catch (error) {
      hint = null;
    }
    if (!hint) {
      const tags = (question.misconceptionTags || []).filter((tag) => MISCONCEPTION_HINTS[tag]);
      if (!tags.length) return null;
      let rank = 0;
      for (let i = 0; i < choiceIndex; i++) if (i !== question.answerIndex) rank++;
      hint = MISCONCEPTION_HINTS[tags[rank % tags.length]];
    }
    return `提示：${hint}`;
  }

  const DEFAULT_UNLOCKED_WEAPONS = ['pistol', 'revolver', 'dual_smg', 'venom_pistol'];
  const DEFAULT_UNLOCKED_RUNES = ['fire', 'thunder'];

  function createDefaultSave() {
    const g1 = PGS.Gear.createGearItem('weapon', 1, 'basic');
    const g2 = PGS.Gear.createGearItem('shield', 2, 'basic');
    return {
      gold: 0,
      bestTime: 0,
      bestKills: 0,
      nextUid: 10,
      upgrades: { might: 0, vitality: 0, haste: 0 },
      equipped: { weapon: 1, shield: 2, glove1: null, glove2: null, boot1: null, boot2: null },
      gearBag: [g1, g2],
      unlockedWeapons: DEFAULT_UNLOCKED_WEAPONS.slice(),
      unlockedRunes: DEFAULT_UNLOCKED_RUNES.slice(),
      showDamageNumbers: true,
      freeExplores: 1,
      communityAtlas: { collected: [], rewardsClaimed: [], title: '' },
      mathSettings: { band: 'middle', frequency: 'standard', pauseOnAnswer: false, pauseTouched: false },
      mathStats: { questions: 0, firstTryCorrect: 0, byTopic: {} },
      weaponCards: {},
      runeCards: {},
      cards: [
        { uid: 3, kind: 'num', val: 2 },
        { uid: 4, kind: 'num', val: 5 },
        { uid: 5, kind: 'op', val: '+' },
        { uid: 6, kind: 'op', val: '-' },
      ],
    };
  }

  function loadSave() {
    const def = createDefaultSave();
    try {
      const raw = global.localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const savedMathSettings = parsed.mathSettings && typeof parsed.mathSettings === 'object' ? parsed.mathSettings : {};
        const mathBand = ['low', 'middle', 'high'].includes(savedMathSettings.band) ? savedMathSettings.band : def.mathSettings.band;
        const mathSettings = {
          band: mathBand,
          frequency: ['low', 'standard', 'high'].includes(savedMathSettings.frequency) ? savedMathSettings.frequency : def.mathSettings.frequency,
          pauseOnAnswer: typeof savedMathSettings.pauseOnAnswer === 'boolean' ? savedMathSettings.pauseOnAnswer : mathBand === 'low',
          pauseTouched: savedMathSettings.pauseTouched === true,
        };
        const savedMathStats = parsed.mathStats && typeof parsed.mathStats === 'object' ? parsed.mathStats : {};
        const savedAtlas = parsed.communityAtlas && typeof parsed.communityAtlas === 'object' ? parsed.communityAtlas : {};
        return {
          gold: parsed.gold || 0,
          bestTime: parsed.bestTime || 0,
          bestKills: parsed.bestKills || 0,
          nextUid: parsed.nextUid || def.nextUid,
          upgrades: {
            might: parsed.upgrades?.might || 0,
            vitality: parsed.upgrades?.vitality || 0,
            haste: parsed.upgrades?.haste || 0,
          },
          equipped: parsed.equipped || def.equipped,
          gearBag: Array.isArray(parsed.gearBag) ? parsed.gearBag.map((g) => PGS.Gear.normalizeGearItem(g)) : def.gearBag,
          unlockedWeapons: Array.isArray(parsed.unlockedWeapons) && parsed.unlockedWeapons.length ? parsed.unlockedWeapons : def.unlockedWeapons,
          unlockedRunes: Array.isArray(parsed.unlockedRunes) && parsed.unlockedRunes.length ? parsed.unlockedRunes : def.unlockedRunes,
          showDamageNumbers: parsed.showDamageNumbers !== false,
          freeExplores: typeof parsed.freeExplores === 'number' ? Math.max(0, parsed.freeExplores) : 1,
          communityAtlas: {
            collected: Array.isArray(savedAtlas.collected) ? [...new Set(savedAtlas.collected.filter((id) => typeof id === 'string'))] : [],
            rewardsClaimed: Array.isArray(savedAtlas.rewardsClaimed)
              ? [...new Set(savedAtlas.rewardsClaimed.map(String).filter((key) => ['6', '12', '18'].includes(key)))]
              : [],
            title: typeof savedAtlas.title === 'string' ? savedAtlas.title : '',
          },
          mathSettings,
          mathStats: {
            questions: Math.max(0, Number(savedMathStats.questions) || 0),
            firstTryCorrect: Math.max(0, Number(savedMathStats.firstTryCorrect) || 0),
            byTopic: savedMathStats.byTopic && typeof savedMathStats.byTopic === 'object' ? savedMathStats.byTopic : {},
          },
          weaponCards: parsed.weaponCards && typeof parsed.weaponCards === 'object' ? parsed.weaponCards : {},
          runeCards: parsed.runeCards && typeof parsed.runeCards === 'object' ? parsed.runeCards : {},
          cards: Array.isArray(parsed.cards) ? parsed.cards : def.cards,
        };
      }
    } catch (_) {}
    return def;
  }

  function writeSave(save) {
    try {
      global.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (_) {}
  }

  class SurvivorGame {
    constructor(renderer, audio, ui) {
      this.renderer = renderer;
      this.audio = audio;
      this.ui = ui;

      this.save = loadSave();
      this.stateName = 'menu'; // menu | playing | levelup | gameover
      this.selectedStarter = 'pistol';
      this.selectedStarterRune = null;
      this.selectedStageId = PGS.Gear.STAGES[0].id;
      this.shakeEnabled = true;
      this.showDamageNumbers = this.save.showDamageNumbers !== false;

      this.keys = {};
      this.joyVec = { x: 0, z: 0 };
      this.gamepad = new PGS.GamepadController();
      this.gamepad.onPauseToggle = () => this.togglePause();

      this.nextEnemyId = 1;
      this.resetRunState();
      this._bindInputs();
    }

    _bindInputs() {
      global.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !e.repeat && (this.stateName === 'playing' || this.stateName === 'paused') && this.mathMode !== 'paused-question' && this.mathMode !== 'feedback') {
          e.preventDefault();
          this.togglePause();
          return;
        }
        const k = e.key.toLowerCase();
        this.keys[k] = true;
        if (!e.repeat && this.stateName === 'playing' && this.mathMode === 'paused-question' && /^[1-4]$/.test(k)) {
          e.preventDefault();
          this.answerMathChoice(Number(k) - 1);
          return;
        }
        if (!e.repeat && this.stateName === 'playing' && this.mathMode === 'reward' && /^[1-3]$/.test(k)) {
          e.preventDefault();
          this.chooseMathReward(Number(k) - 1);
          return;
        }
        if (this.stateName === 'levelup') {
          if (k === '1') this.ui.pickChoice(0);
          else if (k === '2') this.ui.pickChoice(1);
          else if (k === '3') this.ui.pickChoice(2);
        }
      });
      global.addEventListener('keyup', (e) => {
        this.keys[e.key.toLowerCase()] = false;
      });
    }

    getStage() {
      return PGS.Gear.STAGES.find((s) => s.id === this.selectedStageId) || PGS.Gear.STAGES[0];
    }

    getQuizInterval() {
      const frequency = this.save.mathSettings?.frequency || 'standard';
      const range = frequency === 'low' ? [60, 80] : frequency === 'high' ? [35, 50] : [45, 70];
      return range[0] + Math.random() * (range[1] - range[0]);
    }

    getMathInputState() {
      if (this.mathMode === 'paused-question') return 'math-question';
      if (this.mathMode === 'reward') return 'math-reward';
      if (this.mathMode === 'feedback' && this.mathCurrent?.paused) return 'math-feedback';
      return this.stateName;
    }

    updateMathEvents(dt) {
      if (!PGS.MathQuest || this.stateName !== 'playing') return;
      if (this.mathMode === 'world-question') {
        this.mathCurrent.timeLeft = Math.max(0, this.mathCurrent.timeLeft - dt);
        this.ui.updateMathTimer(this.mathCurrent.timeLeft);
        if (this.mathCurrent.timeLeft <= 0) this.failMathQuestion('time');
        return;
      }
      if (this.mathMode !== 'none') return;

      if (this.mathHarvest.active) {
        this.mathHarvest.timer = Math.max(0, this.mathHarvest.timer - dt);
        this.ui.updateHarvestTask(this.mathHarvest);
        if (this.mathHarvest.timer <= 0) this.finishHarvestTask();
        return;
      }

      if (this.elapsed >= this.nextHarvestAt) {
        this.startHarvestTask();
        this.nextHarvestAt = this.elapsed + 90 + Math.random() * 8;
        return;
      }

      if (this.elapsed >= this.nextQuizAt) {
        if (this.nextHarvestAt - this.elapsed < 30) {
          this.nextQuizAt = this.nextHarvestAt + 32;
          return;
        }
        this.startMathQuiz();
      }
    }

    startMathQuiz() {
      if (this.stateName !== 'playing' || this.mathMode === 'reward') return null;
      const band = this.save.mathSettings?.band || 'middle';
      const question = PGS.MathQuest.makeQuestion(band, Math.random);
      const halfViewWidth = this.renderer?.camera?.right || 20;
      const atTightCorner = halfViewWidth < 8 && Math.abs(this.player.x) > 96 && Math.abs(this.player.z) > 96;
      const tooNarrowForPads = halfViewWidth < 3.1;
      // 窄螢幕踏板只排在玩家下方；貼近南側或東西邊界放不下時改暫停作答
      const narrowCannotFit = halfViewWidth < 8 && !this.narrowPadsFit(question.choices.length);
      let paused = this.save.mathSettings?.pauseOnAnswer === true || atTightCorner || tooNarrowForPads || narrowCannotFit;
      let pads = paused ? [] : this.createAnswerPads(question.choices);
      // 踏板實際擺出後再確認：圓台要整個在場地內，且標籤與踏板在目前視窗放得下、不被題目橫幅蓋住；否則改走暫停作答
      if (!paused && !this.answerPadsUsable(pads)) {
        paused = true;
        pads = [];
      }
      this.mathCurrent = { question, attempts: 0, timeLeft: band === 'low' ? 20 : 15, paused, completed: false, wrongChoices: [] };
      this.mathMode = paused ? 'paused-question' : 'world-question';
      this.answerPads = pads;
      const topic = this.mathRun.topics[question.topic] || (this.mathRun.topics[question.topic] = {
        label: question.topicLabel, questions: 0, attempts: 0, firstTryCorrect: 0,
      });
      topic.questions++;
      this.mathRun.questions++;
      this.pushEnemiesAwayFromPads();
      this.ui.showMathQuestion(question, paused, this.mathCurrent.timeLeft);
      return question;
    }

    // 窄螢幕（半視野 < 8）答案踏板全排在玩家下方兩列：外列左右各一、內列靠中間，距離玩家 7.2～8.6。
    // 只排下方的原因：z 為負（畫面上方）的踏板，標籤會落在 DOM 題目橫幅底下被整個蓋住。
    // 下方放不下時（玩家太靠南側或東西邊界）由 startMathQuiz 改走暫停作答，見 narrowPadsFit。
    // 窄螢幕踏板左右間距：夾在 1.2～4.25 之間，讓標籤與踏板都留在半視野內
    narrowPadXOffset(halfViewWidth) {
      const compactSize = 1.5;
      return Math.min(4.25, Math.max(1.2, halfViewWidth - compactSize - 0.5));
    }

    narrowPadSlots(count, xOffset) {
      const px = this.player.x;
      const pz = this.player.z;
      const innerX = count === 3 ? 0 : 1.2;
      const rowOneZ = Math.sqrt(Math.max(0, 7.2 * 7.2 - xOffset * xOffset));
      // 內列要與外列踏板距離 > 2，也要距離玩家 ≥ 7
      const rowTwoZ = Math.max(Math.sqrt(8.4 * 8.4 - innerX * innerX), rowOneZ + 2.1);
      const slots = [
        { x: xOffset, z: rowOneZ },
        { x: -xOffset, z: rowOneZ },
        { x: innerX, z: rowTwoZ },
        { x: -innerX, z: rowTwoZ },
      ];
      return slots.slice(0, count).map((slot) => ({ x: px + slot.x, z: pz + slot.z }));
    }

    // 窄螢幕的下方兩列踏板是否都放得進場地：用實際會擺出的位置，圓心加踏板半徑都要在場地內
    narrowPadsFit(count = 4) {
      const halfViewWidth = this.renderer?.camera?.right || 20;
      const slots = this.narrowPadSlots(count, this.narrowPadXOffset(halfViewWidth));
      return slots.every((slot) => this.padInsideArena(slot.x, slot.z));
    }

    // 踏板圓心加半徑是否整個在場地內
    padInsideArena(x, z) {
      const limit = ARENA_LIMIT - ANSWER_PAD_RADIUS;
      return Math.abs(x) <= limit && Math.abs(z) <= limit;
    }

    // 踏板是否都能用：圓台在場地內，且 renderer（若有提供）確認標籤與踏板在目前視窗放得下
    answerPadsUsable(pads) {
      if (!pads.every((pad) => this.padInsideArena(pad.x, pad.z))) return false;
      return this.renderer?.answerPadsFitView?.(pads) !== false;
    }

    createAnswerPads(choices) {
      const count = choices.length;
      const pads = [];
      const halfViewWidth = this.renderer?.camera?.right || 20;
      const narrow = halfViewWidth < 8;
      const edgeX = Math.abs(this.player.x) > 96;
      const edgeZ = Math.abs(this.player.z) > 96;
      const spread = count === 3 ? 1.02 : 1.25;
      const compactSize = narrow ? 1.5 : 2.35;
      const compactLabelSize = narrow ? 1.65 : 2.2;
      let baseAngle = this.player.z > 96 ? -Math.PI / 2 : Math.PI / 2;
      if (edgeX && edgeZ) {
        if (this.player.x > 0 && this.player.z > 0) baseAngle = (250 * Math.PI) / 180;
        else if (this.player.x > 0 && this.player.z < 0) baseAngle = (115 * Math.PI) / 180;
        else if (this.player.x < 0 && this.player.z > 0) baseAngle = (295 * Math.PI) / 180;
        else baseAngle = (65 * Math.PI) / 180;
      } else if (edgeX) {
        baseAngle = Math.atan2(-this.player.z, -this.player.x);
      }
      // 寬螢幕玩家貼近南側邊界（z > 96）：踏板放左右兩側、不放在玩家正上方，避免被題目橫幅遮住（角度 ≤ 0 才不會超出場地）
      let lateralAngles = null;
      if (!narrow && this.player.z > 96) {
        const off = [0.12, 0.55, 0.9, 1.3];
        const right = off.map((a) => -a);
        const left = off.map((a) => Math.PI + a);
        if (this.player.x > 96) lateralAngles = left;
        else if (this.player.x < -96) lateralAngles = right;
        else lateralAngles = [right[0], left[0], right[1], left[1]];
      }
      const xOffset = this.narrowPadXOffset(halfViewWidth);
      const narrowSlots = narrow ? this.narrowPadSlots(count, xOffset) : null;
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0 : i / (count - 1) - 0.5;
        const radius = 7.2 + i * 0.35;
        let x;
        let z;
        const padRadius = ANSWER_PAD_RADIUS;
        if (narrowSlots) {
          x = narrowSlots[i].x;
          z = narrowSlots[i].z;
        } else {
          const angle = lateralAngles ? lateralAngles[i] : baseAngle + t * spread;
          x = this.player.x + Math.cos(angle) * radius;
          z = this.player.z + Math.sin(angle) * radius;
          // 先在同一圈上左右微調角度找沒有障礙物的位置（先要求寬鬆的距離，再退到只要不重疊）；
          // 微調候選與原位置都必須整個在場地內，否則視為被擋住（貼場地邊界時不會被推出場外）。
          // 都找不到時，下面的 clearObstaclesAroundPad 會把擋住的障礙物推開，保證每個踏板都走得到；
          // 若原位置本身出界又找不到場內候選，startMathQuiz 會改走暫停作答。
          const nudges = [0.28, -0.28, 0.56, -0.56, 0.84, -0.84];
          for (const clearance of [1.5, 0.6]) {
            if (this.padInsideArena(x, z) && !this.padBlockedByObstacle(x, z, clearance)) break;
            const found = nudges.find((delta) => {
              const nx = this.player.x + Math.cos(angle + delta) * radius;
              const nz = this.player.z + Math.sin(angle + delta) * radius;
              if (!this.padInsideArena(nx, nz) || this.padBlockedByObstacle(nx, nz, clearance)) return false;
              x = nx;
              z = nz;
              return true;
            });
            if (found !== undefined) break;
          }
        }
        this.clearObstaclesAroundPad(x, z, padRadius);
        pads.push({ index: i, label: choices[i], x, z, radius: padRadius, visualSize: compactSize, labelSize: compactLabelSize, broken: false });
      }
      // 推開障礙物時可能擠到先前放好的踏板，最後再整體確認一次。
      for (let pass = 0; pass < 2; pass++) {
        for (const pad of pads) this.clearObstaclesAroundPad(pad.x, pad.z, pad.radius);
      }
      return pads;
    }

    // 這個位置（半徑 clearance 內，從障礙物邊緣算起）是否被障礙物擋住
    padBlockedByObstacle(x, z, clearance) {
      return this.terrainZones.some((zone) => zone.kind === 'obstacle' && Math.hypot(zone.x - x, zone.z - z) < zone.radius + clearance);
    }

    // 後備：答案踏板周圍仍有障礙物時，把障礙物沿「從踏板往外」的方向推開，直到踏板旁留出可站立的空間。
    // 障礙物本來就會緩慢移動、也會定期重新生成，推開不影響關卡；但踏板若被卡在障礙物裡，玩家就無法答題。
    clearObstaclesAroundPad(x, z, padRadius) {
      for (const zone of this.terrainZones) {
        if (zone.kind !== 'obstacle') continue;
        const need = zone.radius + 0.6;
        let dx = zone.x - x;
        let dz = zone.z - z;
        let dist = Math.hypot(dx, dz);
        if (dist >= need) continue;
        if (dist < 0.01) {
          dx = x - this.player.x || 1;
          dz = z - this.player.z;
          dist = Math.hypot(dx, dz) || 1;
        }
        const clampX = (v) => Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, v));
        let nx = clampX(x + (dx / dist) * need);
        let nz = clampX(z + (dz / dist) * need);
        // 踏板貼近場地邊界、推出去被邊界擋住時，改往場地內側推。
        if (Math.hypot(nx - x, nz - z) < need - 0.01) {
          nx = clampX(x - (dx / dist) * need);
          nz = clampX(z - (dz / dist) * need);
        }
        zone.x = nx;
        zone.z = nz;
      }
    }

    pushEnemiesAwayFromPads() {
      for (const enemy of this.enemies) {
        for (const pad of this.answerPads) {
          const dx = enemy.x - pad.x;
          const dz = enemy.z - pad.z;
          const d = Math.hypot(dx, dz);
          if (d > 0 && d < 3) {
            const nx = dx / d;
            const nz = dz / d;
            enemy.x = pad.x + nx * 3.2;
            enemy.z = pad.z + nz * 3.2;
            enemy.kx += nx * 5;
            enemy.kz += nz * 5;
            break;
          }
        }
      }
    }

    updateMathWorldInteractions() {
      if (this.mathMode !== 'world-question') return;
      for (const pad of this.answerPads) {
        if (!pad.broken && Math.hypot(this.player.x - pad.x, this.player.z - pad.z) <= pad.radius) {
          this.answerMathChoice(pad.index);
          return;
        }
      }
    }

    answerMathChoice(index) {
      if (!this.mathCurrent || (this.mathMode !== 'world-question' && this.mathMode !== 'paused-question')) return;
      const question = this.mathCurrent.question;
      if (!Number.isInteger(index) || index < 0 || index >= question.choices.length) return;
      if (this.mathMode === 'world-question' && this.answerPads[index]?.broken) return;
      // 同一個錯誤選項不可重複計次：暫停作答時鍵盤／手把重按同一個錯誤答案，不能直接判第二次失敗。
      if (!Array.isArray(this.mathCurrent.wrongChoices)) this.mathCurrent.wrongChoices = [];
      if (this.mathCurrent.wrongChoices.includes(index)) return;

      this.mathCurrent.attempts++;
      this.mathCurrent.lastChoice = question.choices[index];
      const runTopic = this.mathRun.topics[question.topic];
      runTopic.attempts++;
      const savedTopic = this.save.mathStats.byTopic[question.topic] || (this.save.mathStats.byTopic[question.topic] = {
        attempts: 0, questions: 0, firstTryCorrect: 0,
      });
      savedTopic.attempts++;
      writeSave(this.save);

      if (index === question.answerIndex) {
        this.mathCurrent.firstTryCorrect = this.mathCurrent.attempts === 1;
        this.completeMathQuestion(true);
        this.mathMode = 'reward';
        this.answerPads = [];
        this.ui.showMathReward(question);
        this.audio.playLevelUp();
        return;
      }

      this.mathCurrent.wrongChoices.push(index);
      if (this.mathMode === 'world-question' && this.answerPads[index]) this.answerPads[index].broken = true;
      if (this.mathCurrent.attempts < 2) {
        this.ui.showMathHint(getMisconceptionHint(question, index) || this.getMathHint(question.topic), this.mathMode === 'paused-question', index);
      } else {
        this.failMathQuestion('wrong');
      }
    }

    getMathHint(topic) {
      const hints = {
        'add-subtract': '想一想：個位滿十時要進位，個位不夠減時要退位。',
        compare: '提示：先比十位，十位相同時再比個位。',
        'number-line': '提示：找出每次增加幾，再往前跳一次。',
        clock: '提示：長針指向 6 是半小時，指向 12 是整點。',
        multiplication: '提示：可以用九九乘法表，或把每一組加起來。',
        'division-remainder': '提示：除數 × 商 + 餘數要等於題目的總數，餘數要比除數小。',
        'two-step': '提示：先算第一步，再用第一步的答案算第二步。',
        'factors-multiples': '提示：因數可以整除；倍數是原數乘上整數。',
        'same-denominator-fractions': '提示：分母相同時，先比較或運算分子。',
        rectangle: '提示：面積用長 × 寬；周長要把四邊都算進去。',
        'kg-gram': '提示：1 公斤是 1000 公克，先換成相同單位。',
        'gcd-lcm': '提示：公因數看能同時整除的數；公倍數看兩邊都能乘出的數。',
        'prime-composite': '提示：檢查除了 1 和自己，還能不能被其他數整除。',
        'unlike-fractions': '提示：分母不同時，先找共同分母再計算。',
        'decimal-multiplication': '提示：先把小數當整數乘，再數兩個因數的小數位數。',
        percentage: '提示：百分率表示每 100 份取幾份。',
        ratio: '提示：先算每一份是多少，再乘上另一邊的份數。',
        'speed-time': '提示：距離、速率和時間要用乘法或除法配對。',
      };
      return hints[topic] || '提示：再讀一次題目，找出數字之間的關係。';
    }

    failMathQuestion(reason) {
      if (!this.mathCurrent || this.mathCurrent.completed) return;
      this.mathCurrent.completed = true;
      this.completeMathQuestion(false, reason);
      this.mathMode = 'feedback';
      this.mathFeedbackTimer = 3;
      this.answerPads = [];
      this.ui.showMathExplanation(this.mathCurrent.question, this.mathCurrent.paused, reason);
    }

    completeMathQuestion(correct, reason) {
      const current = this.mathCurrent;
      if (!current || current.recorded) return;
      current.recorded = true;
      const stats = this.save.mathStats;
      const savedTopic = stats.byTopic[current.question.topic] || (stats.byTopic[current.question.topic] = {
        attempts: 0, questions: 0, firstTryCorrect: 0,
      });
      stats.questions++;
      savedTopic.questions++;
      if (correct && current.firstTryCorrect) {
        stats.firstTryCorrect++;
        savedTopic.firstTryCorrect++;
        this.mathRun.firstTryCorrect++;
        this.mathRun.topics[current.question.topic].firstTryCorrect++;
      }
      if (!correct || current.attempts > 1) {
        this.mathRun.mistakes.push({
          prompt: current.question.prompt,
          answer: current.question.choices[current.question.answerIndex],
          explanation: current.question.explanation,
          topicLabel: current.question.topicLabel,
          reason: correct ? 'recovered' : reason || 'wrong',
        });
      }
      writeSave(this.save);
      this.ui.updateMathGrowth(this);
    }

    updateMathOverlayTimer(dt) {
      if (this.mathMode === 'paused-question' && this.mathCurrent) {
        this.mathCurrent.timeLeft = Math.max(0, this.mathCurrent.timeLeft - dt);
        this.ui.updateMathTimer(this.mathCurrent.timeLeft);
        if (this.mathCurrent.timeLeft <= 0) this.failMathQuestion('time');
      } else if (this.mathMode === 'feedback') {
        this.mathFeedbackTimer = Math.max(0, this.mathFeedbackTimer - dt);
        if (this.mathFeedbackTimer <= 0) {
          this.ui.hideMathAction();
          this.ui.hideMathBanner();
          this.mathMode = 'none';
          this.mathCurrent = null;
          this.nextQuizAt = this.elapsed + this.getQuizInterval();
        }
      }
    }

    chooseMathReward(index) {
      if (this.mathMode !== 'reward' || !this.mathCurrent || ![0, 1, 2].includes(index)) return;
      if (index === 0) this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.3);
      else if (index === 1) this.runGold += 10;
      else this.mathBuffTimer = 20;
      this.ui.hideMathAction();
      this.ui.hideMathBanner();
      this.mathMode = 'none';
      this.mathCurrent = null;
      this.answerPads = [];
      this.nextQuizAt = this.elapsed + this.getQuizInterval();
      this.ui.updateHud(this);
    }

    startHarvestTask() {
      if (this.mathHarvest.active || !PGS.MathQuest) return;
      const band = this.save.mathSettings?.band || 'middle';
      this.mathHarvest = { active: true, rule: PGS.MathQuest.makeHarvestRule(band, Math.random), timer: 25, collected: 0 };
      this.ui.showHarvestTask(this.mathHarvest);
      this.ui.showMathToast(`稻穀豐收開始！${this.mathHarvest.rule.label}，收滿 5 個數字稻穀。`);
    }

    finishHarvestTask() {
      if (!this.mathHarvest.active) return;
      const collected = this.mathHarvest.collected;
      this.mathHarvest.active = false;
      this.pickups = this.pickups.filter((pk) => pk.kind !== 'math-grain');
      this.ui.hideHarvestTask();
      this.ui.showMathToast(`稻穀豐收結束：收集到 ${collected} / 5 個符合的數字。`);
    }

    collectMathGrain(pickup) {
      if (!this.mathHarvest.active) return;
      const n = pickup.value;
      if (!this.mathHarvest.rule.test(n)) {
        // 撿錯的輕微代價：扣 1 點豐收進度（最低 0），並說明為什麼不符合。
        const lost = this.mathHarvest.collected > 0;
        if (lost) {
          this.mathHarvest.collected--;
          this.ui.updateHarvestTask(this.mathHarvest);
        }
        this.ui.showMathToast(`${PGS.MathQuest.explainHarvestMismatch(this.mathHarvest.rule, n)}${lost ? '豐收進度 −1。' : '再找找符合規則的數字吧。'}`);
        return;
      }
      this.mathHarvest.collected++;
      this.spawnFx(this.player.x, this.player.z, 0xb9e96f, 0.85, 0.18, 0.9);
      this.audio.playGem();
      this.ui.updateHarvestTask(this.mathHarvest);
      if (this.mathHarvest.collected >= 5) this.triggerHarvestWave();
      else this.ui.showMathToast(`${n} 符合規則！豐收 ${this.mathHarvest.collected} / 5。`);
    }

    triggerHarvestWave() {
      const x = this.player.x;
      const z = this.player.z;
      this.mathHarvest.active = false;
      this.pickups = this.pickups.filter((pk) => pk.kind !== 'math-grain');
      this.ui.hideHarvestTask();
      this.mathHarvestWave = { x, z, timer: 0.9, duration: 0.9, radius: 30 };
      this.renderer.addShake(0.9, 0.35);
      this.audio.playExplosion();
      for (const enemy of this.enemies.slice()) {
        const dx = enemy.x - x;
        const dz = enemy.z - z;
        const d = Math.hypot(dx, dz);
        if (d > this.mathHarvestWave.radius) continue;
        const angle = d < 0.01 ? Math.random() * Math.PI * 2 : Math.atan2(dz, dx);
        const damage = Math.max(35, enemy.hp * 0.35);
        this.damageEnemy(enemy, damage, Math.cos(angle) * 16, Math.sin(angle) * 16);
      }
      for (let i = 0; i < 18; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 15;
        this.spawnFx(x + Math.cos(angle) * distance, z + Math.sin(angle) * distance, 0xffd058, 0.7 + Math.random(), 0.25, 0.7);
      }
      this.ui.showMathToast('稻浪衝出去了！附近怪物受到傷害並被擊退。');
    }

    resetRunState() {
      const vitBonus = this.save.upgrades.vitality * 20;
      const hasteBonus = 1 + this.save.upgrades.haste * 0.08;
      const mightBonus = 1 + this.save.upgrades.might * 0.1;
      const gearStats = PGS.Gear.computeTotalStats(this.save);
      const stage = this.getStage();
      this.renderer.setStageTint(stage.groundTint, stage.id);
      if (this.renderer.clearTransient) this.renderer.clearTransient();
      const totalHp = Math.max(20, 100 + vitBonus + gearStats.hp);

      this.player = {
        x: 0,
        z: 0,
        facing: 1,
        moving: false,
        walkTimer: 0,
        hp: totalHp,
        maxHp: totalHp,
        speed: Math.max(2.5, 6.6 * hasteBonus * (1 + gearStats.mspd * 0.01)),
        magnet: 3.4,
        globalDamageMult: mightBonus,
        flatAtk: gearStats.atk,
        critChance: Math.max(0, Math.min(85, gearStats.crit)),
        def: gearStats.def,
        dr: Math.max(-75, Math.min(100, gearStats.dr)),
        globalRateMult: Math.max(0.3, 1 + gearStats.aspd * 0.01),
        invuln: 0,
        paralyzeTimer: 0,
        stunTimer: 0,
        bleedTimer: 0,
        bleedTick: 0,
        burnTimer: 0,
        burnTick: 0,
        chillTimer: 0,
        poisonTick: 0,
        inSwamp: false,
        inPoison: false,
        inIce: false,
        level: 1,
        xp: 0,
        nextXp: 50,
      };

      // 進場時確定本局掉落機率：吸血約 1/500，其餘符文約 1/50~1/200，局外裝備約 1/200，卡牌約 1/35~1/50
      this.vampireRuneRate = 1 / 500;
      this.runNormalRuneInterval = 50 + Math.floor(Math.random() * 151);
      this.runNormalRuneRate = 1 / this.runNormalRuneInterval;
      this.gearDropRate = 1 / 200;
      this.runCardInterval = 35 + Math.floor(Math.random() * 16);
      this.cardDropRate = 1 / this.runCardInterval;

      if (!this.isWeaponUnlocked(this.selectedStarter)) {
        this.selectedStarter = this.save.unlockedWeapons[0] || 'pistol';
      }
      if (this.selectedStarterRune && !this.isRuneUnlocked(this.selectedStarterRune)) {
        this.selectedStarterRune = null;
      }

      this.weapons = [this._makeWeaponInstance(this.selectedStarter)];
      if (this.selectedStarterRune) {
        this.applyRuneToWeapon(this.weapons[0], this.selectedStarterRune);
      }
      this.enemies = [];
      this.projectiles = [];
      this.enemyProjectiles = [];
      this.telegraphs = [];
      this.pickups = [];
      this.effects = [];
      this.vortexes = [];
      this.waterPuddles = [];
      this.terrainZones = [];
      this.initTerrainZones(stage);

      this.elapsed = 0;
      this.kills = 0;
      this.runGold = 0;
      this.totalSpawned = 0;
      this.spawnTimer = 0.4;
      this.eliteTimer = 45;
      this.mathMode = 'none';
      this.mathCurrent = null;
      this.answerPads = [];
      this.nextMathPickupId = 1;
      // 第一個算式閘門提早到 18～25 秒，讓短局也一定遇得到數學題；之後依頻率設定間隔。
      this.nextQuizAt = 18 + Math.random() * 7;
      this.nextHarvestAt = 90 + Math.random() * 10;
      this.mathHarvest = { active: false, rule: null, timer: 0, collected: 0 };
      this.mathBuffTimer = 0;
      this.mathHarvestWave = { x: 0, z: 0, timer: 0, duration: 0.8, radius: 22 };
      this.mathRun = { questions: 0, firstTryCorrect: 0, topics: {}, mistakes: [] };
    }

    startRun(starterId) {
      if (starterId) this.selectedStarter = starterId;
      this.audio.unlock();
      this.resetRunState();
      this.stateName = 'playing';
      this.ui.syncAll(this);
    }

    buyMetaUpgrade(key) {
      const cur = this.save.upgrades[key] || 0;
      const cost = 30 + cur * 25;
      if (cur >= 5 || this.save.gold < cost) return false;
      this.save.gold -= cost;
      this.save.upgrades[key] = cur + 1;
      writeSave(this.save);
      this.audio.playLevelUp();
      return true;
    }

    equipGear(slotId, gearUid) {
      const gear = this.save.gearBag.find((g) => g.uid === gearUid);
      const slot = PGS.Gear.SLOTS.find((s) => s.id === slotId);
      if (!gear || !slot || gear.type !== slot.type) return false;
      for (const s of PGS.Gear.SLOTS) {
        if (this.save.equipped[s.id] === gearUid) {
          this.save.equipped[s.id] = null;
        }
      }
      this.save.equipped[slotId] = gearUid;
      writeSave(this.save);
      return true;
    }

    unequipSlot(slotId) {
      if (!this.save.equipped[slotId]) return false;
      this.save.equipped[slotId] = null;
      writeSave(this.save);
      return true;
    }

    isWeaponUnlocked(id) {
      return this.save.unlockedWeapons.includes(id);
    }

    persistSave() {
      writeSave(this.save);
      return true;
    }

    isRuneUnlocked(id) {
      return this.save.unlockedRunes.includes(id);
    }

    unlockWeapon(id) {
      if (!PGS.Weapons.DEFS[id] || this.isWeaponUnlocked(id)) return false;
      this.save.unlockedWeapons.push(id);
      writeSave(this.save);
      return true;
    }

    unlockRune(id) {
      if (!PGS.Runes.DEFS[id] || this.isRuneUnlocked(id)) return false;
      this.save.unlockedRunes.push(id);
      writeSave(this.save);
      return true;
    }

    unlockAllContent() {
      this.save.unlockedWeapons = PGS.Weapons.ALL_IDS.slice();
      this.save.unlockedRunes = PGS.Runes.ALL_IDS.slice();
      writeSave(this.save);
      if (this.ui && typeof this.ui.renderMenu === 'function') this.ui.renderMenu(this);
      return { weapons: this.save.unlockedWeapons.slice(), runes: this.save.unlockedRunes.slice() };
    }

    getExploreCost() {
      return 50;
    }

    canStartExploreMiniGame() {
      return (this.save.freeExplores || 0) > 0 || this.save.gold >= this.getExploreCost();
    }

    consumeExploreCost() {
      if ((this.save.freeExplores || 0) > 0) {
        this.save.freeExplores -= 1;
        writeSave(this.save);
        return 'free';
      }
      const cost = this.getExploreCost();
      if (this.save.gold >= cost) {
        this.save.gold -= cost;
        writeSave(this.save);
        return 'gold';
      }
      return null;
    }

    grantExploreBonus() {
      const bonusGold = 30;
      this.save.gold += bonusGold;
      const uid = this.save.nextUid++;
      const card = Math.random() < 0.65
        ? { uid, kind: 'num', val: 1 + Math.floor(Math.random() * 6) }
        : { uid, kind: 'op', val: ['+', '-', '×'][Math.floor(Math.random() * 3)] };
      this.save.cards.push(card);
      writeSave(this.save);
      return { bonusGold, card };
    }

    grantExploreSupply(supplyType) {
      const bonusGold = 35;
      this.save.gold += bonusGold;
      if (supplyType === 'gear') {
        const types = ['weapon', 'shield', 'glove', 'boot'];
        const t = types[Math.floor(Math.random() * types.length)];
        const tiers = ['basic', 'fine', 'fine'];
        const tier = tiers[Math.floor(Math.random() * tiers.length)];
        const gear = PGS.Gear.createGearItem(t, this.save.nextUid++, tier);
        this.save.gearBag.push(gear);
        writeSave(this.save);
        return { bonusGold, gear };
      }
      const uid = this.save.nextUid++;
      const card = supplyType === 'op_card'
        ? { uid, kind: 'op', val: ['+', '-', '×'][Math.floor(Math.random() * 3)] }
        : supplyType === 'num_card'
          ? { uid, kind: 'num', val: 2 + Math.floor(Math.random() * 8) }
          : (Math.random() < 0.5
            ? { uid, kind: 'num', val: 2 + Math.floor(Math.random() * 8) }
            : { uid, kind: 'op', val: ['+', '-', '×'][Math.floor(Math.random() * 3)] });
      this.save.cards.push(card);
      writeSave(this.save);
      return { bonusGold, card };
    }

    _evalSlotStat(statDef, cards) {
      const res = PGS.Gear.evalCardFormula(cards || []);
      let val = statDef.base + (res.valid ? res.value : 0);
      if (statDef.min != null) val = Math.max(statDef.min, val);
      if (statDef.max != null) val = Math.min(statDef.max, val);
      if (statDef.round) val = Math.round(val);
      return val;
    }

    getWeaponEffectiveStats(weaponId) {
      const def = PGS.Weapons.DEFS[weaponId];
      const out = {
        damage: def.damage,
        pellets: def.pellets,
        pierce: def.pierce,
        bounces: def.bounces,
        chainCount: def.chainCount || 0,
        magSize: def.magSize || 0,
        splashRadius: def.splashRadius || 0,
        ratePct: 0,
      };
      const slotDefs = PGS.Weapons.getCardStats(def);
      const map = this.save.weaponCards[weaponId] || {};
      for (const s of slotDefs) {
        out[s.key] = this._evalSlotStat(s, map[s.key]);
      }
      return out;
    }

    getRuneEffectiveStats(runeId) {
      const def = PGS.Runes.DEFS[runeId];
      const out = {};
      if (!def || !def.cardStats) return out;
      const map = this.save.runeCards[runeId] || {};
      for (const s of def.cardStats) {
        out[s.key] = this._evalSlotStat(s, map[s.key]);
      }
      return out;
    }

    _makeWeaponInstance(id) {
      const inst = PGS.Weapons.createInstance(id);
      const eff = this.getWeaponEffectiveStats(id);
      inst.eff = eff;
      if (eff.magSize > 0) inst.ammo = eff.magSize;
      return inst;
    }

    insertCardToCollection(group, targetId, statKey, cardUid) {
      const bag = group === 'weapon' ? this.save.weaponCards : this.save.runeCards;
      const cardIdx = this.save.cards.findIndex((c) => c.uid === cardUid);
      if (cardIdx === -1) return false;
      if (!bag[targetId]) bag[targetId] = {};
      const list = bag[targetId][statKey] || [];
      if (list.length >= PGS.Gear.MAX_CARDS_PER_STAT) return false;
      const [card] = this.save.cards.splice(cardIdx, 1);
      list.push(card);
      bag[targetId][statKey] = list;
      writeSave(this.save);
      return true;
    }

    removeCardFromCollection(group, targetId, statKey, cardIdx) {
      const bag = group === 'weapon' ? this.save.weaponCards : this.save.runeCards;
      const map = bag[targetId];
      if (!map) return false;
      const list = map[statKey] || [];
      if (cardIdx < 0 || cardIdx >= list.length) return false;
      const [card] = list.splice(cardIdx, 1);
      this.save.cards.push(card);
      writeSave(this.save);
      return true;
    }

    sellCard(cardUid) {
      const idx = this.save.cards.findIndex((c) => c.uid === cardUid);
      if (idx === -1) return false;
      this.save.cards.splice(idx, 1);
      this.save.gold += 5;
      writeSave(this.save);
      this.audio.playGem();
      return true;
    }

    insertCardToStat(gearUid, statKey, cardUid) {
      const gear = this.save.gearBag.find((g) => g.uid === gearUid);
      const cardIdx = this.save.cards.findIndex((c) => c.uid === cardUid);
      if (!gear || cardIdx === -1) return false;
      const list = gear.statCards[statKey] || [];
      if (list.length >= PGS.Gear.MAX_CARDS_PER_STAT) return false;
      const [card] = this.save.cards.splice(cardIdx, 1);
      list.push(card);
      gear.statCards[statKey] = list;
      writeSave(this.save);
      return true;
    }

    removeCardFromStat(gearUid, statKey, cardIdx) {
      const gear = this.save.gearBag.find((g) => g.uid === gearUid);
      if (!gear) return false;
      const list = gear.statCards[statKey] || [];
      if (cardIdx < 0 || cardIdx >= list.length) return false;
      const [card] = list.splice(cardIdx, 1);
      this.save.cards.push(card);
      writeSave(this.save);
      return true;
    }

    spawnFx(x, z, color, size, life, y = 0.55, flat = false) {
      if (this.effects.length > 320) return null;
      const fx = { x, z, y, color, size, maxSize: size, life, maxLife: life, flat };
      this.effects.push(fx);
      return fx;
    }

    // 帶速度與重力的像素碎片（擊倒碎片、槍口火花、金幣閃光）；總量受 effects 上限約束
    spawnShard(x, z, color, size, life, vx, vz, vy, y = 0.5) {
      if (this.effects.length > 260) return;
      this.effects.push({ x, z, y, color, size, maxSize: size, life, maxLife: life, flat: false, vx, vz, vy });
    }

    // 傷害數字：同一隻怪在 0.09 秒內的多次命中合併成一個數字（避免連發槍洗版）
    spawnDamageNumber(e, dmg, critical, killed) {
      if (!this.showDamageNumbers || !this.renderer.spawnDamageNumber) return;
      e.dmgAcc = (e.dmgAcc || 0) + dmg;
      e.dmgCrit = e.dmgCrit || critical;
      if (!killed && this.elapsed < (e.dmgNextAt || 0)) return;
      e.dmgNextAt = this.elapsed + 0.09;
      const kind = e.dmgCrit ? 'crit' : killed ? 'kill' : 'normal';
      this.renderer.spawnDamageNumber(e.x, e.z, e.dmgAcc, kind);
      e.dmgAcc = 0;
      e.dmgCrit = false;
    }

    spawnEnemy(type) {
      const arch = ENEMY_ARCHETYPES[type];
      const angle = Math.random() * Math.PI * 2;
      const dist = 16 + Math.random() * 6;
      const stage = this.getStage();
      const waveScale = (1 + Math.floor(this.elapsed / 35) * 0.22) * stage.hpMult;

      this.enemies.push({
        id: this.nextEnemyId++,
        type,
        x: Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, this.player.x + Math.cos(angle) * dist)),
        z: Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, this.player.z + Math.sin(angle) * dist)),
        vx: 0,
        vz: 0,
        kx: 0,
        kz: 0,
        hp: Math.round(arch.hp * waveScale),
        maxHp: Math.round(arch.hp * waveScale),
        speed: arch.speed * stage.speedMult,
        radius: arch.radius,
        halfH: arch.halfH,
        shadowScale: arch.shadowScale,
        damage: arch.damage,
        atkCd: arch.atkCd || 0.65,
        atkTimer: 0,
        range: arch.range || 0,
        projSprite: arch.projSprite || null,
        projSpeed: arch.projSpeed || 0,
        onHitStatus: arch.onHitStatus || null,
        xp: arch.xp,
        goldChance: arch.goldChance,
        runeChance: arch.runeChance,
        gearChance: arch.gearChance,
        cardChance: arch.cardChance,
        walkPhase: Math.random() * 6,
        hitFlash: 0,
        slowTimer: 0,
        slowFactor: 1,
        freezeTimer: 0,
        chillCount: 0,
        poisonTimer: 0,
        poisonDps: 0,
        burnTimer: 0,
        burnDps: 0,
        blindTimer: 0,
        blindAngle: 0,
      });
    }

    update(dt) {
      this.gamepad.update(dt, this.getMathInputState());

      if (this.stateName !== 'playing') {
        this.renderer.renderFrame(this.getRenderState(), dt);
        return;
      }

      const clampedDt = Math.min(dt, 0.05);
      if (this.mathMode === 'paused-question' || this.mathMode === 'feedback') {
        this.updateMathOverlayTimer(clampedDt);
        this.renderer.renderFrame(this.getRenderState(), 0);
        this.ui.updateHud(this);
        return;
      }

      const worldDt = this.mathMode === 'reward' ? clampedDt * 0.28 : clampedDt;
      this.elapsed += worldDt;
      this.updateMathEvents(worldDt);
      if (this.mathMode === 'paused-question' || this.mathMode === 'feedback') {
        this.renderer.renderFrame(this.getRenderState(), 0);
        this.ui.updateHud(this);
        return;
      }

      this.updateTerrains(worldDt);
      if (this.stateName !== 'playing') return;
      this.updatePlayerStatuses(worldDt);
      if (this.stateName !== 'playing') return;
      this.updatePlayer(worldDt);
      this.updateMathWorldInteractions();
      if (this.mathMode === 'feedback' || this.mathMode === 'paused-question') {
        this.renderer.renderFrame(this.getRenderState(), 0);
        this.ui.updateHud(this);
        return;
      }
      this.updateSpawner(worldDt);
      const weaponRateScale = (this.player.inIce ? 0.6 : 1) * (this.player.chillTimer > 0 ? 0.55 : 1);
      this.updateWeapons(worldDt * weaponRateScale);
      this.updateProjectiles(worldDt);
      this.updateWaterPuddles(worldDt);
      this.updateEnemyProjectiles(worldDt);
      this.updateTelegraphs(worldDt);
      if (this.stateName !== 'playing') return;
      this.updateVortexes(worldDt);
      this.updateEnemies(worldDt);
      this.updatePickups(worldDt);
      this.updateEffects(worldDt);
      this.mathHarvestWave.timer = Math.max(0, this.mathHarvestWave.timer - worldDt);
      this.mathBuffTimer = Math.max(0, this.mathBuffTimer - worldDt);

      this.renderer.renderFrame(this.getRenderState(), worldDt);
      this.ui.updateHud(this);
    }

    getRenderState() {
      return {
        player: this.player,
        enemies: this.enemies,
        projectiles: this.projectiles,
        enemyProjectiles: this.enemyProjectiles,
        telegraphs: this.telegraphs,
        pickups: this.pickups,
        effects: this.effects,
        terrainZones: this.terrainZones,
        waterPuddles: this.waterPuddles,
        answerPads: this.answerPads,
        mathHarvestWave: this.mathHarvestWave,
        shakeEnabled: this.shakeEnabled,
      };
    }

    updatePlayer(dt) {
      if (this.player.invuln > 0) this.player.invuln = Math.max(0, this.player.invuln - dt);
      if (this.player.paralyzeTimer > 0 || this.player.stunTimer > 0) {
        this.player.moving = false;
        this.resolveObstacleCollision(this.player, 0.55);
        return;
      }

      let mx = this.joyVec.x + this.gamepad.moveX;
      let mz = this.joyVec.z + this.gamepad.moveZ;
      if (this.keys['w'] || this.keys['arrowup']) mz -= 1;
      if (this.keys['s'] || this.keys['arrowdown']) mz += 1;
      if (this.keys['a'] || this.keys['arrowleft']) mx -= 1;
      if (this.keys['d'] || this.keys['arrowright']) mx += 1;

      const len = Math.hypot(mx, mz);
      if (len > 0.05) {
        const nx = mx / Math.max(1, len);
        const nz = mz / Math.max(1, len);
        const spd = this.player.speed * (this.player.inSwamp ? 0.55 : 1) * (this.mathBuffTimer > 0 ? 1.2 : 1);
        this.player.x = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, this.player.x + nx * spd * dt));
        this.player.z = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, this.player.z + nz * spd * dt));
        if (Math.abs(nx) > 0.1) this.player.facing = nx > 0 ? 1 : -1;
        this.player.moving = true;
        this.player.walkTimer += dt;
      } else {
        this.player.moving = false;
      }

      this.resolveObstacleCollision(this.player, 0.55);
    }

    updateSpawner(dt) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.enemies.length < 320) {
        const mins = this.elapsed / 60;
        const batch = 1 + Math.floor(mins * 1.8);
        for (let i = 0; i < batch; i++) {
          const r = Math.random();
          if (r < 0.36) this.spawnEnemy('dagger');
          else if (r < 0.68) this.spawnEnemy('blade');
          else this.spawnEnemy('spear');

          this.totalSpawned++;
          if (this.totalSpawned % 200 === 0) {
            this.spawnEnemy(Math.random() < 0.5 ? 'archer' : 'slinger');
          }
          if (this.totalSpawned % 1000 === 0) {
            const mages = ['mage_fire', 'mage_ice', 'mage_thunder'];
            this.spawnEnemy(mages[Math.floor(Math.random() * mages.length)]);
          }
        }
        this.spawnTimer = Math.max(0.28, 1.05 - mins * 0.35);
      }

      this.eliteTimer -= dt;
      if (this.eliteTimer <= 0) {
        this.spawnEnemy('elite');
        this.eliteTimer = 40;
      }
    }

    updateWeapons(dt) {
      for (let i = 0; i < this.weapons.length; i++) {
        const w = this.weapons[i];
        const def = w.def;

        // 太陽光電雷射：靜止時逐段蓄能，移動時以目前能量射擊。
        if (def.stationaryCharge) {
          const eff = w.eff || this.getWeaponEffectiveStats(w.id);
          const maxCharge = def.maxCharge || 3;
          if (!this.player.moving) {
            w.solarCharge = Math.min(maxCharge, (w.solarCharge || 0) + dt / (def.chargeInterval || 0.72));
          }
          w.timer -= dt;
          if (w.timer <= 0 && this.enemies.length > 0) {
            const target = PGS.Weapons.findTarget(this.player, this.enemies, def.targeting, def.range);
            if (target && (this.player.moving || w.solarCharge >= maxCharge)) {
              this.fireSolarLaser(w, target, eff, w.solarCharge);
              w.solarCharge = 0;
              const effRate = Math.max(0.3, 1 + (eff.ratePct || 0) * 0.01) * (this.mathBuffTimer > 0 ? 1.2 : 1);
              w.timer = def.cooldown / (w.rateMult * effRate * this.player.globalRateMult);
            }
          }
          continue;
        }

        // 換彈機制（如標準手槍震波、散彈、左輪）
        if (w.reloading > 0) {
          w.reloading -= dt;
          if (w.reloading <= 0) {
            w.reloading = 0;
            w.ammo = (w.eff && w.eff.magSize) || def.magSize;
            this.audio.playReload();
          }
          continue;
        }

        // 過熱機制（轉輪機槍）
        if (def.heatPerShot) {
          if (w.overheated > 0) {
            w.overheated -= dt;
            w.heat = Math.max(0, (w.overheated / def.overheatLock) * 100);
            if (w.overheated <= 0) {
              w.overheated = 0;
              w.heat = 0;
            }
            continue;
          }
        }

        // 連發點射處理（如脈衝突擊步槍）
        if (w.burstLeft > 0) {
          w.burstTimer -= dt;
          if (w.burstTimer <= 0) {
            const bt =
              w.burstTarget && this.enemies.includes(w.burstTarget)
                ? w.burstTarget
                : PGS.Weapons.findTarget(this.player, this.enemies, def.targeting, def.range);
            if (bt) {
              const isFinal = w.burstLeft === 1;
              this.fireWeapon(w, bt, isFinal ? def.burstFinalMult || 1 : 1);
            }
            w.burstLeft--;
            w.burstTimer = def.burstInterval || 0.075;
          }
          continue;
        }

        w.timer -= dt;
        const target = PGS.Weapons.findTarget(this.player, this.enemies, def.targeting, def.range);

        if (!target) {
          if (def.heatPerShot && w.heat > 0) {
            w.heat = Math.max(0, w.heat - def.coolPerSec * dt);
          }
          continue;
        }

        if (w.timer > 0) continue;

        if (def.burstCount && def.burstCount > 1) {
          this.fireWeapon(w, target, 1);
          w.burstLeft = def.burstCount - 1;
          w.burstTimer = def.burstInterval || 0.075;
          w.burstTarget = target;
        } else if (def.dualTarget) {
          this.fireWeapon(w, target, 1);
          const second = PGS.Weapons.findTarget(this.player, this.enemies, 'nearest', def.range, target.id);
          if (second) this.fireWeapon(w, second, 1);
        } else {
          this.fireWeapon(w, target, 1);
        }

        // 計算下次射擊間隔
        let cd = def.cooldown;
        if (def.minCooldown && def.heatPerShot) {
          const heatRatio = Math.min(1, w.heat / 100);
          cd = def.cooldown - (def.cooldown - def.minCooldown) * heatRatio;
        }
        const effRate = Math.max(0.3, 1 + ((w.eff && w.eff.ratePct) || 0) * 0.01) * (this.mathBuffTimer > 0 ? 1.2 : 1);
        w.timer = cd / (w.rateMult * effRate * this.player.globalRateMult);
      }
    }

    fireWeapon(w, target, dmgBonus = 1) {
      const def = w.def;
      const eff = w.eff || this.getWeaponEffectiveStats(w.id);
      const baseAngle = Math.atan2(target.z - this.player.z, target.x - this.player.x);
      if (def.waterCannon) {
        this.fireWaterStream(w, target, eff, dmgBonus, baseAngle);
        this.audio.playShot(def.sound);
        return;
      }
      const count = eff.pellets + w.bonusPellets;
      const shotIndex = def.primeRifle ? (w.shotCount = (w.shotCount || 0) + 1) : 0;
      const primeCrit = def.primeRifle && PGS.Weapons.isPrime(shotIndex);
      const isCrit = primeCrit || Math.random() * 100 < this.player.critChance;
      const baseDmg = (eff.damage + this.player.flatAtk) * w.damageMult * this.player.globalDamageMult * dmgBonus;
      const dmg = Math.max(1, baseDmg * (primeCrit ? (eff.primeCritMult || def.primeCritMult || 1.75) : isCrit ? 1.75 : 1));
      // 拋物線武器：飛行時間依目標距離計算，讓彈頭落在目標上，而不是固定飛滿 speed×life 後越過近距離的怪。
      let shotLife = def.life;
      if (def.arc && def.speed > 0) {
        const targetDist = Math.hypot(target.x - this.player.x, target.z - this.player.z);
        const maxLife = Math.max(def.life, (def.range || 0) / def.speed);
        shotLife = Math.min(maxLife, Math.max(0.25, (targetDist - 0.5) / def.speed));
      }

      for (let p = 0; p < count; p++) {
        const offset =
          count > 1
            ? (p / (count - 1) - 0.5) * def.spread + (Math.random() - 0.5) * 0.06
            : (Math.random() - 0.5) * def.spread;
        const ang = baseAngle + offset;

        this.projectiles.push({
          x: this.player.x + Math.cos(ang) * 0.5,
          z: this.player.z + Math.sin(ang) * 0.5,
          vx: Math.cos(ang) * def.speed,
          vz: Math.sin(ang) * def.speed,
          angle: -ang,
          sprite: def.sprite,
          color: primeCrit ? 0x88f8ff : def.color,
          critical: isCrit,
          damage: dmg,
          knockback: def.knockback,
          life: shotLife,
          maxLife: shotLife,
          pierce: eff.pierce + w.bonusPierce,
          bounces: eff.bounces + w.bonusBounces,
          bounceRange: def.bounceRange || 7,
          arc: !!def.arc,
          splashRadius: eff.splashRadius || 0,
          slowDuration: def.slowDuration || 0,
          poisonDps: def.poisonDps || 0,
          poisonDuration: def.poisonDuration || 0,
          burnDps: def.burnDps || 0,
          burnDuration: def.burnDuration || 0,
          chillStacks: def.chillStacks || 0,
          growingWave: !!def.growingWave,
          homing: def.homing || 0,
          boomerang: !!def.boomerang,
          turnedAround: false,
          chainCount: eff.chainCount || 0,
          chainRange: def.chainRange || 5.5,
          vortexRadius: def.vortexRadius || 0,
          vortexDuration: def.vortexDuration || 0,
          clusterCount: eff.clusterCount || def.clusterCount || 0,
          firecracker: !!def.firecracker,
          fractionSplit: !!def.fractionSplit,
          splitDepth: eff.splitDepth || def.splitDepth || 0,
          splitLevel: 0,
          fractionLabel: '',
          primeShot: primeCrit,
          egretHoming: !!def.egretHoming,
          returnStrikesLeft: eff.returnStrikes ?? def.returnStrikes ?? 0,
          returnReach: def.returnReach || 1,
          returning: false,
          weaponRef: w,
          runes: w.runes.slice(),
          scale: 1,
          height: 0.65,
          hitIds: new Set(),
        });
      }

      // 槍口火光：白熱核心＋武器色外焰＋兩顆向前飛散的火花
      const muzzleX = this.player.x + Math.cos(baseAngle) * 0.85;
      const muzzleZ = this.player.z + Math.sin(baseAngle) * 0.85;
      this.spawnFx(muzzleX, muzzleZ, def.color, 0.56, 0.08, 0.72);
      this.spawnFx(muzzleX, muzzleZ, 0xfff6d8, 0.3, 0.06, 0.74);
      for (let i = 0; i < 2; i++) {
        const sa = baseAngle + (Math.random() - 0.5) * 0.9;
        const sp = 5 + Math.random() * 3;
        this.spawnShard(muzzleX, muzzleZ, def.color, 0.14, 0.18, Math.cos(sa) * sp, Math.sin(sa) * sp, 0.6, 0.72);
      }
      this.audio.playShot(def.sound);
      if (def.id === 'shotgun' || def.id === 'railgun') {
        this.renderer.addShake(0.14, 0.08);
      }

      // 彈匣消耗與換彈震波
      if (def.magSize) {
        w.ammo--;
        if (w.ammo <= 0) {
          w.reloading = def.reloadTime;
          if (def.reloadShockwave) {
            this.triggerShockwave(def.reloadShockwave);
          }
        }
      }

      // 過熱累積
      if (def.heatPerShot) {
        w.heat = Math.min(100, w.heat + def.heatPerShot);
        if (w.heat >= 100) {
          w.overheated = def.overheatLock;
        }
      }
    }

    fireWaterStream(w, target, eff, dmgBonus, angle) {
      const def = w.def;
      const length = Math.min(def.range, Math.hypot(target.x - this.player.x, target.z - this.player.z) + 0.7);
      const dirX = Math.cos(angle);
      const dirZ = Math.sin(angle);
      const endX = this.player.x + dirX * length;
      const endZ = this.player.z + dirZ * length;
      const damage = Math.max(1, (eff.damage + this.player.flatAtk) * w.damageMult * this.player.globalDamageMult * dmgBonus);
      this.projectiles.push({
        x: this.player.x + dirX * length * 0.5,
        z: this.player.z + dirZ * length * 0.5,
        vx: 0,
        vz: 0,
        angle: -angle,
        sprite: 'water',
        color: def.color,
        damage,
        knockback: def.knockback,
        life: def.life,
        maxLife: def.life,
        waterStream: true,
        originX: this.player.x,
        originZ: this.player.z,
        dirX,
        dirZ,
        range: length,
        endX,
        endZ,
        coneWidth: def.spread,
        tick: def.streamTick || 0.18,
        hitTimers: new Map(),
        puddleDuration: eff.puddleDuration || def.puddleDuration,
        puddleRadius: def.puddleRadius,
        slowPct: eff.slowPct || def.slowPct,
        runes: w.runes.slice(),
        weaponRef: w,
        scaleX: Math.max(1.2, length * 0.9),
        scaleY: 0.46,
        height: 0.58,
      });
      this.spawnFx(this.player.x + dirX * 0.7, this.player.z + dirZ * 0.7, 0x9beeff, 0.48, 0.08, 0.6);
    }

    fireSolarLaser(w, target, eff, charge) {
      const def = w.def;
      const angle = Math.atan2(target.z - this.player.z, target.x - this.player.x);
      const dirX = Math.cos(angle);
      const dirZ = Math.sin(angle);
      const fullyCharged = charge >= (def.maxCharge || 3);
      const multiplier = fullyCharged ? (eff.chargeDamageMult || def.chargeDamageMult) : (def.lowChargeMult || 0.45);
      const damage = Math.max(1, (eff.damage + this.player.flatAtk) * w.damageMult * this.player.globalDamageMult * multiplier);
      const range = fullyCharged ? def.range : Math.min(def.range, 10 + charge * 3);
      const hits = [];
      const rayLimit = fullyCharged ? (eff.pierce || def.pierce) : 1;
      for (const enemy of this.enemies.slice()) {
        const dx = enemy.x - this.player.x;
        const dz = enemy.z - this.player.z;
        const along = dx * dirX + dz * dirZ;
        const across = Math.abs(dx * dirZ - dz * dirX);
        if (along < 0 || along > range || across > enemy.radius + 0.42) continue;
        hits.push({ enemy, along });
      }
      hits.sort((a, b) => a.along - b.along);
      const source = { damage, knockback: def.knockback, runes: w.runes.slice(), weaponRef: w };
      for (const { enemy } of hits.slice(0, rayLimit)) {
        this.applyStatusOnHit(enemy, source);
        this.damageEnemy(enemy, damage, dirX * def.knockback, dirZ * def.knockback, source);
        if (fullyCharged && source.runes.includes('solar') && this.getWeaponResonances(w).some((r) => r.id === 'noon-sun')) {
          enemy.blindTimer = Math.max(enemy.blindTimer || 0, 0.6);
        }
      }
      this.spawnBeamFx(
        this.player.x + dirX * range * 0.5,
        this.player.z + dirZ * range * 0.5,
        -angle,
        range,
        fullyCharged ? 0.46 : 0.28,
        def.color,
        fullyCharged ? 0.2 : 0.12
      );
      this.spawnFx(this.player.x + dirX * 0.85, this.player.z + dirZ * 0.85, def.color, 0.75, 0.1, 0.72);
      this.audio.playShot(def.sound);
      this.renderer.addShake(fullyCharged ? 0.22 : 0.1, fullyCharged ? 0.12 : 0.06);
    }

    spawnBeamFx(x, z, angle, length, width, color, life) {
      // spawnFx 在特效數量達上限時回傳 null；此時不可去改別的特效。
      const beam = this.spawnFx(x, z, color, length, life, 0.62);
      if (!beam) return;
      beam.angle = angle;
      beam.scaleX = beam.maxScaleX = length;
      beam.scaleY = beam.maxScaleY = width;
    }

    triggerShockwave(sw) {
      this.spawnFx(this.player.x, this.player.z, 0xffe86e, sw.radius * 1.4, 0.22, 0.08, true);
      this.renderer.addShake(0.16, 0.1);
      const r2 = sw.radius * sw.radius;
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        const dx = e.x - this.player.x;
        const dz = e.z - this.player.z;
        const d2 = dx * dx + dz * dz;
        if (d2 <= r2 && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          this.damageEnemy(e, sw.damage, (dx / d) * sw.knockback, (dz / d) * sw.knockback);
        }
      }
    }

    updateProjectiles(dt) {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.life -= dt;

        if (p.waterStream) {
          this.updateWaterStream(p, dt);
          if (p.life <= 0) {
            this.createWaterPuddle(p.endX, p.endZ, {
              life: p.puddleDuration,
              radius: p.puddleRadius,
              slowPct: p.slowPct,
              conductive: p.runes.includes('thunder'),
            });
            this.projectiles.splice(i, 1);
          }
          continue;
        }

        // 白鷺箭在追敵與折返玩家間切換；一般追蹤飛彈仍沿用原邏輯。
        if (p.egretHoming && this.enemies.length > 0) {
          const tgt = p.returning ? null : this.findNearestFromPoint(p.x, p.z, p.hitIds);
          const desired = p.returning
            ? Math.atan2(this.player.z - p.z, this.player.x - p.x)
            : tgt ? Math.atan2(tgt.z - p.z, tgt.x - p.x) : Math.atan2(p.vz, p.vx);
          const cur = Math.atan2(p.vz, p.vx);
          let diff = desired - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const turn = Math.max(-p.homing * dt, Math.min(p.homing * dt, diff));
          const nextAng = cur + turn;
          const spd = Math.hypot(p.vx, p.vz);
          p.vx = Math.cos(nextAng) * spd;
          p.vz = Math.sin(nextAng) * spd;
          p.angle = -nextAng;
        } else if (p.homing > 0 && this.enemies.length > 0) {
          const tgt = this.findNearestFromPoint(p.x, p.z);
          if (tgt) {
            const desired = Math.atan2(tgt.z - p.z, tgt.x - p.x);
            const cur = Math.atan2(p.vz, p.vx);
            let diff = desired - cur;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            const turn = Math.max(-p.homing * dt, Math.min(p.homing * dt, diff));
            const nextAng = cur + turn;
            const spd = Math.hypot(p.vx, p.vz);
            p.vx = Math.cos(nextAng) * spd;
            p.vz = Math.sin(nextAng) * spd;
            p.angle = -nextAng;
          }
        }

        // 迴旋圓鋸（飛到一半折返回玩家）
        if (p.boomerang) {
          p.angle += 14 * dt;
          if (!p.turnedAround && p.life <= p.maxLife * 0.5) {
            p.turnedAround = true;
            p.hitIds.clear();
          }
          if (p.turnedAround) {
            const ang = Math.atan2(this.player.z - p.z, this.player.x - p.x);
            const spd = Math.hypot(p.vx, p.vz);
            p.vx = Math.cos(ang) * spd;
            p.vz = Math.sin(ang) * spd;
            if (Math.hypot(this.player.x - p.x, this.player.z - p.z) < 0.9) {
              this.projectiles.splice(i, 1);
              continue;
            }
          }
        }

        // 擴張音波
        if (p.growingWave) {
          const progress = 1 - Math.max(0, p.life / p.maxLife);
          p.scale = 1 + progress * 2.1;
        }

        p.x += p.vx * dt;
        p.z += p.vz * dt;

        if (p.egretHoming && p.returning && Math.hypot(this.player.x - p.x, this.player.z - p.z) <= p.returnReach) {
          p.returning = false;
          const nextTarget = this.findNearestFromPoint(p.x, p.z, p.hitIds);
          if (nextTarget) {
            const nextAngle = Math.atan2(nextTarget.z - p.z, nextTarget.x - p.x);
            const speed = Math.hypot(p.vx, p.vz);
            p.vx = Math.cos(nextAngle) * speed;
            p.vz = Math.sin(nextAngle) * speed;
            p.angle = -nextAngle;
          } else {
            p.life = 0;
          }
        }

        if (p.arc) {
          const t = 1 - Math.max(0, p.life / p.maxLife);
          p.height = 0.65 + Math.sin(t * Math.PI) * 2.4;
          if (p.life <= 0) {
            this.explodeGrenade(p);
            this.projectiles.splice(i, 1);
            continue;
          }
          if (t < 0.72) continue;
        }

        if (p.life <= 0) {
          if (p.vortexRadius > 0) {
            this.spawnVortex(p.x, p.z, p.vortexRadius, p.vortexDuration, p.damage);
          }
          this.projectiles.splice(i, 1);
          continue;
        }

        let removed = false;
        const extraHit = p.growingWave ? (p.scale - 1) * 0.65 : 0;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (p.hitIds.has(e.id)) continue;
          const dx = e.x - p.x;
          const dz = e.z - p.z;
          const hitR = e.radius + 0.35 + extraHit;
          if (dx * dx + dz * dz > hitR * hitR) continue;

          if (p.arc) {
            this.explodeGrenade(p);
            removed = true;
            break;
          }

          if (p.vortexRadius > 0) {
            this.spawnVortex(p.x, p.z, p.vortexRadius, p.vortexDuration, p.damage);
            removed = true;
            break;
          }

          p.hitIds.add(e.id);
          const vLen = Math.hypot(p.vx, p.vz) || 1;
          this.applyStatusOnHit(e, p);
          this.damageEnemy(e, p.damage, (p.vx / vLen) * p.knockback, (p.vz / vLen) * p.knockback, p);
          this.spawnFx(p.x, p.z, p.color, 0.42, 0.09);

          if (p.runes && p.runes.includes('thunder') && this.isEnemyInWater(e)) {
            this.damageEnemy(e, p.damage * 0.35, 0, 0, p);
            this.spawnFx(e.x, e.z, 0xffe45e, 0.58, 0.12);
          }

          if (p.splashRadius > 0) {
            this.explodeGrenade(p);
            removed = true;
            break;
          }

          if (p.chainCount > 0) {
            this.triggerChainLightning(e, p);
          } else if (p.runes && p.runes.includes('thunder')) {
            const rs = this.getRuneEffectiveStats('thunder');
            this.triggerChainLightning(e, {
              chainCount: rs.chains || 3,
              chainRange: 5.5,
              damage: p.damage * ((rs.dmgPct || 65) * 0.01),
              sourceProjectile: p,
            });
          }

          if (p.runes && p.runes.includes('quake')) {
            const rs = this.getRuneEffectiveStats('quake');
            this.triggerImpactShockwave(e.x, e.z, rs.radius || 2.6, p.damage * ((rs.dmgPct || 45) * 0.01), 6.2);
          }

          if (p.fractionSplit && p.splitLevel < p.splitDepth) {
            this.spawnFractionChildren(p);
            removed = true;
            break;
          }

          if (p.egretHoming) {
            if (p.returning) {
              // 折返途中順手撞到別的怪：只算普通命中，不消耗「回身再擊」次數，也不改變折返方向。
              continue;
            }
            if (p.returnStrikesLeft > 0) {
              p.returnStrikesLeft--;
              p.returning = true;
              p.life = Math.max(p.life, 1.6);
              p.pierce = 1;
              const returnAngle = Math.atan2(this.player.z - p.z, this.player.x - p.x);
              const speed = Math.hypot(p.vx, p.vz);
              p.vx = Math.cos(returnAngle) * speed;
              p.vz = Math.sin(returnAngle) * speed;
              p.angle = -returnAngle;
            } else {
              removed = true;
            }
            break;
          }

          if (p.bounces > 0) {
            const nextTarget = this.findBounceTarget(p, e.id);
            if (nextTarget) {
              p.bounces--;
              const ang = Math.atan2(nextTarget.z - p.z, nextTarget.x - p.x);
              const spd = Math.hypot(p.vx, p.vz);
              p.vx = Math.cos(ang) * spd;
              p.vz = Math.sin(ang) * spd;
              p.angle = -ang;
              p.life = Math.max(p.life, 0.35);
              break;
            }
          }

          p.pierce--;
          if (p.pierce <= 0) {
            removed = true;
            break;
          }
        }

        if (removed) {
          this.projectiles.splice(i, 1);
        }
      }
    }

    findNearestFromPoint(x, z, excludeIds = null) {
      let best = null;
      let bestD2 = 144;
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        if (excludeIds && excludeIds.has(e.id)) continue;
        const dx = e.x - x;
        const dz = e.z - z;
        const d2 = dx * dx + dz * dz;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = e;
        }
      }
      return best;
    }

    updateWaterStream(p, dt) {
      for (const enemy of this.enemies) {
        const dx = enemy.x - p.originX;
        const dz = enemy.z - p.originZ;
        const along = dx * p.dirX + dz * p.dirZ;
        if (along < 0.45 || along > p.range) continue;
        const across = Math.abs(dx * p.dirZ - dz * p.dirX);
        const halfWidth = 0.32 + along * p.coneWidth * 0.2 + enemy.radius * 0.35;
        if (across > halfWidth) continue;

        const timeLeft = (p.hitTimers.get(enemy.id) || 0) - dt;
        if (timeLeft > 0) {
          p.hitTimers.set(enemy.id, timeLeft);
          continue;
        }
        p.hitTimers.set(enemy.id, p.tick);
        this.applyStatusOnHit(enemy, p);
        this.damageEnemy(
          enemy,
          p.damage,
          p.dirX * p.knockback,
          p.dirZ * p.knockback,
          p
        );
        enemy.slowTimer = Math.max(enemy.slowTimer || 0, 0.2);
        enemy.slowFactor = Math.min(enemy.slowFactor || 1, 0.5);
      }
    }

    spawnFractionChildren(parent) {
      const nextLevel = parent.splitLevel + 1;
      const angle = -parent.angle;
      const childSprite = nextLevel === 1 ? 'fraction_half' : 'fraction_quarter';
      const childLabel = nextLevel === 1 ? '1/2' : '1/4';
      for (const direction of [-1, 1]) {
        const childAngle = angle + direction * 0.16;
        const speed = Math.hypot(parent.vx, parent.vz);
        this.projectiles.push({
          x: parent.x,
          z: parent.z,
          vx: Math.cos(childAngle) * speed,
          vz: Math.sin(childAngle) * speed,
          angle: -childAngle,
          sprite: childSprite,
          color: parent.color,
          damage: parent.damage * 0.5,
          knockback: parent.knockback,
          life: Math.min(parent.maxLife, Math.max(0.34, parent.life)),
          maxLife: parent.maxLife,
          pierce: 1,
          bounces: 0,
          bounceRange: 0,
          arc: false,
          splashRadius: 0,
          slowDuration: 0,
          chainCount: 0,
          chainRange: 0,
          clusterCount: 0,
          fractionSplit: true,
          splitDepth: parent.splitDepth,
          splitLevel: nextLevel,
          fractionLabel: childLabel,
          runes: parent.runes.slice(),
          weaponRef: parent.weaponRef,
          scale: 0.9,
          height: 0.62,
          // 繼承父彈已命中的目標：分裂是「平分」傷害，不能回頭再打同一隻怪。
          hitIds: new Set(parent.hitIds),
        });
      }
    }

    applyStatusOnHit(e, p) {
      if (p.slowDuration > 0) {
        e.slowTimer = Math.max(e.slowTimer, p.slowDuration);
        e.slowFactor = Math.min(e.slowFactor || 1, 0.45);
      }
      if (p.poisonDps > 0) {
        e.poisonDps = Math.max(e.poisonDps, p.poisonDps);
        e.poisonTimer = Math.max(e.poisonTimer, p.poisonDuration);
      }
      if (p.burnDps > 0) {
        e.burnDps = Math.max(e.burnDps, p.burnDps);
        e.burnTimer = Math.max(e.burnTimer, p.burnDuration);
      }
      if (p.chillStacks > 0) {
        e.chillCount += p.chillStacks;
        if (e.chillCount >= 3) {
          e.chillCount = 0;
          e.freezeTimer = Math.max(e.freezeTimer, 1.35);
          this.spawnFx(e.x, e.z, 0xb8f8ff, 1.05, 0.25);
        }
      }

      // 符文效果（火 / 冰 / 光 / 吸血）
      if (p.runes && p.runes.length > 0) {
        if (p.runes.includes('fire')) {
          const rs = this.getRuneEffectiveStats('fire');
          e.burnDps = Math.max(e.burnDps, rs.burnDps || 14);
          e.burnTimer = Math.max(e.burnTimer, rs.burnSec || 2.8);
        }
        if (p.runes.includes('ice')) {
          const rs = this.getRuneEffectiveStats('ice');
          e.slowTimer = Math.max(e.slowTimer, rs.slowSec || 2.0);
          e.slowFactor = Math.min(e.slowFactor || 1, 0.45);
          if ((rs.freezeChance || 0) > 0 && Math.random() * 100 < rs.freezeChance) {
            e.freezeTimer = Math.max(e.freezeTimer, 1.0);
          }
        }
        if (p.runes.includes('light')) {
          const rs = this.getRuneEffectiveStats('light');
          e.blindTimer = Math.max(e.blindTimer, rs.blindSec || 2.2);
          e.blindAngle = Math.random() * Math.PI * 2;
          if ((rs.dmgBonus || 0) > 0) e.hp -= rs.dmgBonus;
          this.spawnFx(e.x, e.z, 0xfff6b8, 0.72, 0.16);
        }
        if (p.runes.includes('vampire') && this.player.hp < this.player.maxHp) {
          const rs = this.getRuneEffectiveStats('vampire');
          if (Math.random() * 100 < (rs.chance ?? 100)) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + (rs.heal || 1.5));
            this.spawnFx(this.player.x, this.player.z, 0xff5478, 0.45, 0.12, 1.1);
          }
        }
        if (p.runes.includes('water')) {
          const rs = this.getRuneEffectiveStats('water');
          this.createWaterPuddle(e.x, e.z, {
            life: rs.puddleSec || 3,
            radius: 1.9,
            slowPct: rs.slowPct || 35,
          });
        }
        if (p.runes.includes('rice')) {
          const rs = this.getRuneEffectiveStats('rice');
          e.riceHarvest = {
            chance: (rs.dropChance || 22) * 0.01,
            heal: rs.heal || 12,
            xp: 5,
            bonus: false,
          };
        }
        if (p.runes.includes('solar') && p.weaponRef) {
          this.chargeSolarRune(p.weaponRef);
        }
        this.applyRuneResonances(e, p);
      }
    }

    triggerImpactShockwave(x, z, radius, damage, knockback) {
      this.spawnFx(x, z, 0xd29bff, radius * 1.2, 0.18, 0.1, true);
      const r2 = radius * radius;
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        const dx = e.x - x;
        const dz = e.z - z;
        const d2 = dx * dx + dz * dz;
        if (d2 <= r2 && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          this.damageEnemy(e, damage, (dx / d) * knockback, (dz / d) * knockback);
        }
      }
    }

    applyRuneToWeapon(weapon, runeId) {
      if (!weapon || !runeId) return false;
      if (weapon.runes.length >= PGS.Runes.MAX_PER_WEAPON) return false;
      if (weapon.runes.includes(runeId)) return false;
      weapon.runes.push(runeId);
      return true;
    }

    // 共鳴只由符文組合決定：依組合快取結果，避免戰鬥中每幀為每把武器重新建立 Set 與陣列。
    getWeaponResonances(weapon) {
      const runes = weapon && weapon.runes ? weapon.runes : [];
      const key = runes.join('|');
      if (!this._resonanceCache) this._resonanceCache = new Map();
      let list = this._resonanceCache.get(key);
      if (!list) {
        list = PGS.Runes.getResonances(runes);
        this._resonanceCache.set(key, list);
      }
      return list;
    }

    getActiveResonances() {
      const active = new Map();
      for (const weapon of this.weapons || []) {
        for (const resonance of this.getWeaponResonances(weapon)) active.set(resonance.id, resonance);
      }
      return Array.from(active.values());
    }

    createWaterPuddle(x, z, options = {}) {
      if (!Array.isArray(this.waterPuddles)) this.waterPuddles = [];
      const zone = {
        x,
        z,
        life: options.life || 3,
        maxLife: options.life || 3,
        radius: options.radius || 1.9,
        slowPct: options.slowPct || 35,
        conductive: !!options.conductive,
        frozen: !!options.frozen,
        enteredEnemies: new Set(),
      };
      const nearby = this.waterPuddles.find((old) => Math.hypot(old.x - x, old.z - z) < Math.min(old.radius, zone.radius) * 0.75);
      if (nearby) {
        nearby.life = Math.max(nearby.life, zone.life);
        nearby.maxLife = Math.max(nearby.maxLife || 0, zone.maxLife);
        nearby.radius = Math.max(nearby.radius, zone.radius);
        nearby.slowPct = Math.max(nearby.slowPct, zone.slowPct);
        nearby.conductive = nearby.conductive || zone.conductive;
        nearby.frozen = nearby.frozen || zone.frozen;
        // 水槍每個 tick 都會打到同一片水窪：只延長時間，水波特效最多每 0.25 秒補一次，避免洗版。
        const now = this.elapsed || 0;
        if (!(nearby.fxAt > now - 0.25)) {
          nearby.fxAt = now;
          this.spawnFx(x, z, zone.frozen ? 0x9beeff : 0x55d9ff, zone.radius * 1.1, 0.16, 0.04, true);
        }
        return nearby;
      }
      zone.fxAt = this.elapsed || 0;
      this.waterPuddles.push(zone);
      if (this.waterPuddles.length > 16) this.waterPuddles.shift();
      this.spawnFx(x, z, zone.frozen ? 0x9beeff : 0x55d9ff, zone.radius * 1.1, 0.16, 0.04, true);
      return zone;
    }

    isEnemyInWater(enemy) {
      return (this.waterPuddles || []).some((zone) => {
        const dx = enemy.x - zone.x;
        const dz = enemy.z - zone.z;
        return dx * dx + dz * dz <= zone.radius * zone.radius;
      });
    }

    updateWaterPuddles(dt) {
      if (!Array.isArray(this.waterPuddles)) return;
      for (let i = this.waterPuddles.length - 1; i >= 0; i--) {
        const zone = this.waterPuddles[i];
        zone.life -= dt;
        if (zone.life <= 0) {
          this.waterPuddles.splice(i, 1);
          continue;
        }
        const r2 = zone.radius * zone.radius;
        for (const enemy of this.enemies) {
          const dx = enemy.x - zone.x;
          const dz = enemy.z - zone.z;
          if (dx * dx + dz * dz > r2) continue;
          enemy.slowTimer = Math.max(enemy.slowTimer || 0, dt + 0.12);
          enemy.slowFactor = Math.min(enemy.slowFactor || 1, 1 - zone.slowPct * 0.01);
          if (zone.frozen && !zone.enteredEnemies.has(enemy.id)) {
            zone.enteredEnemies.add(enemy.id);
            enemy.freezeTimer = Math.max(enemy.freezeTimer || 0, 0.75);
            const dist = Math.hypot(dx, dz) || 1;
            enemy.kx += (dx / dist) * 3.4;
            enemy.kz += (dz / dist) * 3.4;
            this.spawnFx(enemy.x, enemy.z, 0xb8f8ff, 0.82, 0.18);
          }
        }
      }
    }

    chargeSolarRune(weapon) {
      if (!weapon) return;
      const stats = this.getRuneEffectiveStats('solar');
      weapon.solarRuneEnergy = (weapon.solarRuneEnergy || 0) + (stats.energyPerHit || 20);
      while (weapon.solarRuneEnergy >= 100) {
        weapon.solarRuneEnergy -= 100;
        this.triggerSolarRunePulse(weapon, stats);
      }
    }

    triggerSolarRunePulse(weapon, stats) {
      const resonance = this.getWeaponResonances(weapon).some((item) => item.id === 'noon-sun');
      const radius = resonance ? 6.2 : 4.2;
      const damage = (stats.pulseDamage || 42) * this.player.globalDamageMult;
      this.spawnFx(this.player.x, this.player.z, 0xfff0a0, radius * 2, 0.24, 0.08, true);
      for (const enemy of this.enemies.slice()) {
        const dx = enemy.x - this.player.x;
        const dz = enemy.z - this.player.z;
        if (dx * dx + dz * dz > radius * radius) continue;
        const dist = Math.hypot(dx, dz) || 1;
        const source = { runes: weapon.runes.slice(), weaponRef: weapon, damage };
        this.damageEnemy(enemy, damage, (dx / dist) * 3.8, (dz / dist) * 3.8, source);
        if (resonance) enemy.blindTimer = Math.max(enemy.blindTimer || 0, 1.2);
      }
    }

    applyRuneResonances(e, p) {
      if (!p.weaponRef) return;
      const ids = new Set(this.getWeaponResonances(p.weaponRef).map((item) => item.id));
      if (ids.has('overload')) {
        this.triggerImpactShockwave(e.x, e.z, 1.9, p.damage * 0.22, 2.8);
        this.spawnFx(e.x, e.z, 0xffa45c, 0.78, 0.14);
      }
      if (ids.has('frozen-water')) {
        this.createWaterPuddle(e.x, e.z, { life: 3, radius: 2.2, slowPct: 45, frozen: true });
      }
      if (ids.has('conductive-net')) {
        this.createWaterPuddle(e.x, e.z, { life: 3.2, radius: 2.5, slowPct: 40, conductive: true });
      }
      if (ids.has('harvest-return') && e.riceHarvest) {
        e.riceHarvest.bonus = true;
      }
    }

    triggerChainLightning(originEnemy, p) {
      let curX = originEnemy.x;
      let curZ = originEnemy.z;
      const visited = new Set([originEnemy.id]);
      const source = p.sourceProjectile || p;
      const hasConductiveNet = source.weaponRef && this.getWeaponResonances(source.weaponRef).some((item) => item.id === 'conductive-net');
      const chainRange = (p.chainRange || 5.5) + (hasConductiveNet ? 1.5 : 0);
      const r2 = chainRange * chainRange;
      const chainCount = (p.chainCount || 0) + (hasConductiveNet ? 1 : 0);

      for (let step = 0; step < chainCount; step++) {
        let next = null;
        let bestD2 = r2;
        for (let i = 0; i < this.enemies.length; i++) {
          const cand = this.enemies[i];
          if (visited.has(cand.id)) continue;
          const dx = cand.x - curX;
          const dz = cand.z - curZ;
          const d2 = dx * dx + dz * dz;
          if (d2 < bestD2) {
            bestD2 = d2;
            next = cand;
          }
        }
        if (!next) break;
        visited.add(next.id);
        this.spawnFx((curX + next.x) * 0.5, (curZ + next.z) * 0.5, 0xfff49c, 0.55, 0.14);
        this.spawnFx(next.x, next.z, 0xdca0ff, 0.65, 0.16);
        curX = next.x;
        curZ = next.z;
        const conductiveBonus = this.isEnemyInWater(next) ? 1.35 : 1;
        this.damageEnemy(next, p.damage * 0.78 * conductiveBonus, 0, 0, source);
      }
    }

    spawnVortex(x, z, radius, duration, damage) {
      this.vortexes.push({ x, z, radius, life: duration, damage, fxTimer: 0 });
    }

    updateVortexes(dt) {
      for (let i = this.vortexes.length - 1; i >= 0; i--) {
        const v = this.vortexes[i];
        v.life -= dt;
        v.fxTimer -= dt;
        if (v.fxTimer <= 0) {
          v.fxTimer = 0.12;
          this.spawnFx(v.x, v.z, 0xd28cff, v.radius * 0.75, 0.16, 0.15, true);
        }

        const r2 = v.radius * v.radius;
        for (let j = 0; j < this.enemies.length; j++) {
          const e = this.enemies[j];
          const dx = v.x - e.x;
          const dz = v.z - e.z;
          const d2 = dx * dx + dz * dz;
          if (d2 <= r2 && d2 > 0.05) {
            const d = Math.sqrt(d2);
            e.x += (dx / d) * 6.5 * dt;
            e.z += (dz / d) * 6.5 * dt;
          }
        }

        if (v.life <= 0) {
          this.spawnFx(v.x, v.z, 0xd28cff, v.radius * 1.2, 0.25, 0.3, true);
          this.audio.playExplosion();
          for (let j = this.enemies.length - 1; j >= 0; j--) {
            const e = this.enemies[j];
            const dx = e.x - v.x;
            const dz = e.z - v.z;
            if (dx * dx + dz * dz <= r2) {
              this.damageEnemy(e, v.damage, 0, 0);
            }
          }
          this.vortexes.splice(i, 1);
        }
      }
    }

    findBounceTarget(proj, excludeId) {
      let best = null;
      let bestD2 = proj.bounceRange * proj.bounceRange;
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        if (e.id === excludeId || proj.hitIds.has(e.id)) continue;
        const dx = e.x - proj.x;
        const dz = e.z - proj.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = e;
        }
      }
      return best;
    }

    explodeGrenade(p) {
      this.spawnFx(p.x, p.z, 0xff9848, p.splashRadius * 1.15, 0.22, 0.2, true);
      this.spawnFx(p.x, p.z, 0xffe86e, 1.3, 0.16, 0.6);
      this.renderer.addShake(0.22, 0.12);
      this.audio.playExplosion();

      const r2 = p.splashRadius * p.splashRadius;
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        const dx = e.x - p.x;
        const dz = e.z - p.z;
        const d2 = dx * dx + dz * dz;
        if (d2 <= r2) {
          const d = Math.max(0.1, Math.sqrt(d2));
          if (p.slowDuration > 0) {
            // 敵人移動用 slowFactor 決定減速幅度；只設 slowTimer 不會真的變慢。
            e.slowTimer = Math.max(e.slowTimer || 0, p.slowDuration);
            e.slowFactor = Math.min(e.slowFactor || 1, 0.45);
          }
          if (p.runes && p.runes.length > 0) this.applyStatusOnHit(e, p);
          this.damageEnemy(e, p.damage, (dx / d) * p.knockback, (dz / d) * p.knockback, p);
        }
      }

      // 集束迫擊砲：分裂出子炸彈
      if (p.clusterCount > 0) {
        for (let c = 0; c < p.clusterCount; c++) {
          const ang = (c / p.clusterCount) * Math.PI * 2 + Math.random() * 0.4;
          this.projectiles.push({
            x: p.x,
            z: p.z,
            // 鞭炮的後續小炮落在主爆點周圍約 2 格，跟主爆範圍重疊形成連環爆；集束迫擊砲維持較遠的散布。
            vx: Math.cos(ang) * (p.firecracker ? 5.5 : 7.5),
            vz: Math.sin(ang) * (p.firecracker ? 5.5 : 7.5),
            angle: -ang,
            sprite: p.firecracker ? 'firecracker' : 'pellet',
            color: 0xffd65c,
            damage: p.damage * (p.firecracker ? 0.6 : 0.55),
            knockback: 2.5,
            life: 0.38,
            maxLife: 0.38,
            pierce: 1,
            bounces: 0,
            bounceRange: 0,
            arc: true,
            splashRadius: p.firecracker ? 1.6 : 2.0,
            slowDuration: 0.4,
            clusterCount: 0,
            firecracker: !!p.firecracker,
            runes: p.runes ? p.runes.slice() : [],
            weaponRef: p.weaponRef || null,
            scale: 1.1,
            height: 0.65,
            hitIds: new Set(),
          });
        }
      }
    }

    damageEnemy(e, dmg, kx, kz, source = null) {
      e.hp -= dmg;
      e.hitFlash = 0.06;
      e.kx += kx;
      e.kz += kz;
      if (source || dmg > 1) this.spawnDamageNumber(e, dmg, !!(source && source.critical), e.hp <= 0);
      if (e.hp <= 0) {
        const idx = this.enemies.indexOf(e);
        if (idx !== -1) {
          this.enemies.splice(idx, 1);
          this.kills++;
          this.spawnFx(e.x, e.z, 0xff6e6e, 0.85, 0.16);
          // 擊倒像素碎片：沿各方向彈出、受重力落下
          const shardColor = ENEMY_SHARD_COLORS[e.type] || 0xff6e6e;
          const shardCount = e.type === 'elite' ? 10 : 5;
          for (let i = 0; i < shardCount; i++) {
            const a = (i / shardCount) * Math.PI * 2 + Math.random() * 0.6;
            const sp = 2.2 + Math.random() * 2.4;
            this.spawnShard(e.x, e.z, i % 3 === 0 ? 0xfff0c8 : shardColor, 0.2 + Math.random() * 0.12, 0.45 + Math.random() * 0.25, Math.cos(a) * sp, Math.sin(a) * sp, 3 + Math.random() * 2.5, 0.5);
          }
          // 毒液死亡擴散
          if (e.poisonTimer > 0) {
            this.spawnFx(e.x, e.z, 0x82eb58, 2.8, 0.25, 0.15, true);
            for (let j = this.enemies.length - 1; j >= 0; j--) {
              const other = this.enemies[j];
              const dx = other.x - e.x;
              const dz = other.z - e.z;
              if (dx * dx + dz * dz <= 7.8) {
                other.poisonDps = Math.max(other.poisonDps, e.poisonDps);
                other.poisonTimer = Math.max(other.poisonTimer, 2.2);
              }
            }
          }
          this.pickups.push({ kind: 'gem', x: e.x, z: e.z, value: e.xp, bobPhase: Math.random() * 6 });
          if (e.riceHarvest) {
            const chance = Math.min(0.85, e.riceHarvest.chance * (e.riceHarvest.bonus ? 1.35 : 1));
            if (Math.random() < chance) {
              this.pickups.push({
                kind: 'rice',
                x: e.x + 0.25,
                z: e.z + 0.2,
                heal: e.riceHarvest.heal * (e.riceHarvest.bonus ? 1.5 : 1),
                xp: e.riceHarvest.xp + (e.riceHarvest.bonus ? 2 : 0),
                bobPhase: Math.random() * 6,
              });
            }
          }
          if (Math.random() < e.goldChance) {
            this.pickups.push({ kind: 'coin', x: e.x + 0.3, z: e.z, value: e.type === 'elite' ? 12 : 2, bobPhase: 0 });
            this.spawnFx(e.x + 0.3, e.z, 0xffed83, 0.62, 0.2, 0.7);
            this.spawnShard(e.x + 0.3, e.z, 0xfff6b0, 0.14, 0.4, 0.6, -0.4, 4.6, 0.4);
          }
          if (Math.random() < this.vampireRuneRate && this.isRuneUnlocked('vampire')) {
            this.pickups.push({ kind: 'rune', runeId: 'vampire', x: e.x - 0.3, z: e.z, bobPhase: Math.random() * 6 });
          } else if (Math.random() < this.runNormalRuneRate) {
            const normalRunes = this.save.unlockedRunes.filter((r) => r !== 'vampire');
            if (normalRunes.length > 0) {
              const rId = normalRunes[Math.floor(Math.random() * normalRunes.length)];
              this.pickups.push({ kind: 'rune', runeId: rId, x: e.x - 0.3, z: e.z, bobPhase: Math.random() * 6 });
            }
          }
          if (Math.random() < this.gearDropRate) {
            const types = ['weapon', 'shield', 'glove', 'boot'];
            const gearType = types[Math.floor(Math.random() * types.length)];
            this.pickups.push({ kind: 'gear', gearType, x: e.x, z: e.z + 0.3, bobPhase: Math.random() * 6 });
          }
          if (Math.random() < this.cardDropRate) {
            const stage = this.getStage();
            const isNum = Math.random() < 0.65;
            const card = isNum
              ? { kind: 'num', val: stage.numbers[Math.floor(Math.random() * stage.numbers.length)] }
              : { kind: 'op', val: stage.ops[Math.floor(Math.random() * stage.ops.length)] };
            this.pickups.push({ kind: 'card', card, x: e.x, z: e.z - 0.3, bobPhase: Math.random() * 6 });
          }
          if (this.mathHarvest.active && Math.random() < 0.55) {
            const band = this.save.mathSettings?.band || 'middle';
            const max = band === 'low' ? 20 : band === 'middle' ? 60 : 99;
            this.pickups.push({
              kind: 'math-grain', id: this.nextMathPickupId++, value: this.mathHarvest.rule.pickValue(max, Math.random),
              x: e.x + 0.2, z: e.z - 0.2, bobPhase: Math.random() * 6,
            });
          }
        }
      }
    }

    updateEnemies(dt) {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
        if (e.slowTimer > 0) e.slowTimer = Math.max(0, e.slowTimer - dt);
        if (e.slowTimer <= 0) e.slowFactor = 1;
        if (e.freezeTimer > 0) e.freezeTimer = Math.max(0, e.freezeTimer - dt);
        if (e.atkTimer > 0) e.atkTimer = Math.max(0, e.atkTimer - dt);

        // 中毒與燃燒持續傷害
        let dotDmg = 0;
        if (e.poisonTimer > 0) {
          e.poisonTimer = Math.max(0, e.poisonTimer - dt);
          dotDmg += e.poisonDps * dt;
        }
        if (e.burnTimer > 0) {
          e.burnTimer = Math.max(0, e.burnTimer - dt);
          dotDmg += e.burnDps * dt;
        }
        if (dotDmg > 0) {
          e.hp -= dotDmg;
          if (e.hp <= 0) {
            this.damageEnemy(e, 1, 0, 0);
            continue;
          }
        }

        const dx = this.player.x - e.x;
        const dz = this.player.z - e.z;
        const dist = Math.hypot(dx, dz) || 1;
        const spd = e.freezeTimer > 0 ? 0 : e.speed * (e.slowTimer > 0 ? e.slowFactor || 0.45 : 1);

        if (e.blindTimer > 0) {
          e.blindTimer = Math.max(0, e.blindTimer - dt);
          e.blindAngle += (Math.random() - 0.5) * 4 * dt;
          e.vx = Math.cos(e.blindAngle) * spd * 0.75;
          e.vz = Math.sin(e.blindAngle) * spd * 0.75;
        } else if (e.range > 0 && dist <= e.range) {
          e.vx = 0;
          e.vz = 0;
          if (e.atkTimer <= 0 && e.freezeTimer <= 0) {
            const warnDur = 3.0 + Math.random() * 1.5; // 3～4.5 秒紅色落點預告
            e.atkTimer = warnDur + e.atkCd;
            this.spawnAttackTelegraph(e, warnDur);
          }
        } else {
          e.vx = (dx / dist) * spd;
          e.vz = (dz / dist) * spd;
          if (e.type === 'elite' && dist <= 7.5 && e.atkTimer <= 0 && e.freezeTimer <= 0) {
            const warnDur = 3.2;
            e.atkTimer = warnDur + 3.5;
            this.spawnAttackTelegraph(e, warnDur);
          }
        }

        // 擊退衰減
        e.x += (e.vx + e.kx) * dt;
        e.z += (e.vz + e.kz) * dt;
        e.kx *= Math.pow(0.02, dt);
        e.kz *= Math.pow(0.02, dt);
        e.walkPhase += dt * 10;
        this.resolveObstacleCollision(e, e.radius);

        // 與玩家碰撞扣血（依個別怪物 atkCd 觸發，套用防禦與減傷）
        if (dist < e.radius + 0.45 && e.atkTimer <= 0 && this.player.invuln <= 0) {
          e.atkTimer = e.atkCd;
          this.applyDamageToPlayer(e.damage, e.onHitStatus);
          if (this.stateName !== 'playing') return;
        }
      }

      // 簡易怪物互推分離，避免完全重疊成一團
      const n = this.enemies.length;
      for (let i = 0; i < n; i++) {
        const a = this.enemies[i];
        for (let j = i + 1; j < Math.min(n, i + 14); j++) {
          const b = this.enemies[j];
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          const minD = a.radius + b.radius;
          const d2 = dx * dx + dz * dz;
          if (d2 > 0.0001 && d2 < minD * minD) {
            const d = Math.sqrt(d2);
            const push = (minD - d) * 0.35;
            const nx = (dx / d) * push;
            const nz = (dz / d) * push;
            a.x -= nx;
            a.z -= nz;
            b.x += nx;
            b.z += nz;
          }
        }
      }
    }

    updatePickups(dt) {
      const mag2 = this.player.magnet * this.player.magnet;
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const pk = this.pickups[i];
        pk.bobPhase += dt * 5;
        const dx = this.player.x - pk.x;
        const dz = this.player.z - pk.z;
        const d2 = dx * dx + dz * dz;

        // 數字稻穀必須由玩家自己走過去挑選，不受磁鐵吸引；否則「只收符合規則的數字」形同虛設。
        if (d2 < mag2 && pk.kind !== 'math-grain') {
          const d = Math.max(0.1, Math.sqrt(d2));
          pk.x += (dx / d) * 14 * dt;
          pk.z += (dz / d) * 14 * dt;
        }

        if (d2 < 0.7) {
          this.pickups.splice(i, 1);
          if (pk.kind === 'math-grain') {
            this.collectMathGrain(pk);
          } else if (pk.kind === 'gem') {
            this.audio.playGem();
            this.gainXp(pk.value);
          } else if (pk.kind === 'coin') {
            this.runGold += pk.value;
            this.audio.playGem();
          } else if (pk.kind === 'rice') {
            const healed = Math.min(this.player.maxHp, this.player.hp + pk.heal) - this.player.hp;
            this.player.hp += healed;
            this.gainXp(pk.xp);
            this.audio.playGem();
            this.spawnFx(this.player.x, this.player.z, 0xb9e96f, 0.62, 0.16, 1.0);
          } else if (pk.kind === 'rune') {
            this.openRunePick(pk.runeId);
            return;
          } else if (pk.kind === 'gear') {
            const item = PGS.Gear.createGearItem(pk.gearType, this.save.nextUid++);
            this.save.gearBag.push(item);
            writeSave(this.save);
            this.audio.playLevelUp();
            this.spawnFx(this.player.x, this.player.z, 0x4ce0c0, 0.9, 0.22, 1.0);
          } else if (pk.kind === 'card') {
            const c = { uid: this.save.nextUid++, kind: pk.card.kind, val: pk.card.val };
            this.save.cards.push(c);
            writeSave(this.save);
            this.audio.playGem();
            this.spawnFx(this.player.x, this.player.z, 0xfff2c4, 0.75, 0.2, 1.0);
          }
        }
      }
    }

    gainXp(amount) {
      this.player.xp += amount;
      if (this.player.xp >= this.player.nextXp) {
        this.player.xp -= this.player.nextXp;
        this.player.level++;
        this.player.nextXp = Math.round(this.player.nextXp * 1.32 + 25);
        this.openLevelUp();
      }
    }

    openRunePick(runeId) {
      const canSocketAny = this.weapons.some(
        (w) => w.runes.length < PGS.Runes.MAX_PER_WEAPON && !w.runes.includes(runeId)
      );
      if (!canSocketAny) {
        this.runGold += 10;
        this.audio.playGem();
        this.spawnFx(this.player.x, this.player.z, 0xffd058, 0.7, 0.2, 1.0);
        return;
      }

      this.stateName = 'rune_pick';
      this.audio.playLevelUp();
      this.ui.showRunePick(
        runeId,
        this.weapons,
        (weapon) => {
          this.applyRuneToWeapon(weapon, runeId);
          this.stateName = 'playing';
          this.ui.hideRunePick();
          this.ui.syncAll(this);
        },
        () => {
          this.runGold += 10;
          this.stateName = 'playing';
          this.ui.hideRunePick();
          this.ui.syncAll(this);
        }
      );
    }

    openLevelUp() {
      this.stateName = 'levelup';
      this.audio.playLevelUp();

      const choices = [];
      const ownedIds = new Set(this.weapons.map((w) => w.id));
      const unowned = this.save.unlockedWeapons.filter((id) => !ownedIds.has(id));

      // 優先提供 1 個已解鎖的新武器選項（若尚未集滿 6 把）
      if (unowned.length > 0 && this.weapons.length < 6) {
        const pick = unowned[Math.floor(Math.random() * unowned.length)];
        const def = PGS.Weapons.DEFS[pick];
        choices.push({
          title: `裝備新武器：${def.name}`,
          tag: def.tag,
          desc: def.desc,
          iconId: pick,
          apply: () => {
            this.weapons.push(this._makeWeaponInstance(pick));
          },
        });
      }

      // 現有武器強化
      for (let i = 0; i < this.weapons.length && choices.length < 2; i++) {
        const w = this.weapons[Math.floor(Math.random() * this.weapons.length)];
        if (choices.some((c) => c.weaponId === w.id)) continue;
        choices.push({
          weaponId: w.id,
          title: `強化 ${w.def.name} Lv.${w.level + 1}`,
          tag: '武器升級',
          desc: '傷害 +22%、射速 +12%，並提升特殊彈道數量或貫穿能力。',
          iconId: w.id,
          apply: () => {
            w.level++;
            w.damageMult *= 1.22;
            w.rateMult *= 1.12;
            if (w.id === 'shotgun') w.bonusPellets += 2;
            if (w.id === 'railgun') w.bonusPierce += 2;
            if (w.id === 'revolver') w.bonusBounces += 1;
          },
        });
      }

      // 被動天賦補足 3 選 1
      const passives = [
        {
          title: '戰術補給箱',
          tag: '回復與生命',
          desc: '最大生命 +25 並立即回復 40 點生命值。',
          apply: () => {
            this.player.maxHp += 25;
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 40);
          },
        },
        {
          title: '輕量化戰靴',
          tag: '走位強化',
          desc: '移動速度 +12%、經驗磁鐵吸附範圍 +25%。',
          apply: () => {
            this.player.speed *= 1.12;
            this.player.magnet *= 1.25;
          },
        },
        {
          title: '高能彈藥改造',
          tag: '全武器強化',
          desc: '所有裝備武器的傷害 +15%、攻速 +8%。',
          apply: () => {
            this.player.globalDamageMult *= 1.15;
            this.player.globalRateMult *= 1.08;
          },
        },
      ];

      while (choices.length < 3) {
        const p = passives.shift();
        if (p) choices.push(p);
      }

      this.ui.showLevelUp(choices, (choice) => {
        choice.apply();
        this.stateName = 'playing';
        this.ui.hideLevelUp();
        this.ui.syncAll(this);
      });
    }

    spawnTerrainZone(stage, forcedKind, minDist = 6.5) {
      const pool = (stage.terrains && stage.terrains.length) ? stage.terrains : ['swamp'];
      const kind = forcedKind || pool[Math.floor(Math.random() * pool.length)];
      const ang = Math.random() * Math.PI * 2;
      const dist = minDist + Math.random() * 18;
      const x = Math.max(-ARENA_LIMIT + 5, Math.min(ARENA_LIMIT - 5, this.player.x + Math.cos(ang) * dist));
      const z = Math.max(-ARENA_LIMIT + 5, Math.min(ARENA_LIMIT - 5, this.player.z + Math.sin(ang) * dist));
      const isObs = kind === 'obstacle';
      const speed = isObs ? 0.55 + Math.random() * 0.45 : 1.1 + Math.random() * 1.1;
      const moveAng = Math.random() * Math.PI * 2;
      const life = 12 + Math.random() * 9;
      return {
        kind,
        variant: Math.floor(Math.random() * 3),
        x,
        z,
        radius: isObs ? 1.55 + Math.random() * 0.65 : 3.8 + Math.random() * 1.4,
        vx: Math.cos(moveAng) * speed,
        vz: Math.sin(moveAng) * speed,
        life,
        maxLife: life,
        strikeTimer: 1.6 + Math.random() * 1.2,
      };
    }

    initTerrainZones(stage) {
      this.terrainZones = [];
      const terrains = (stage.terrains && stage.terrains.length) ? stage.terrains : ['swamp'];
      // 先確保每種關卡地形至少出現 1 個，再補足至 6 個局部區域
      for (let i = 0; i < terrains.length; i++) {
        this.terrainZones.push(this.spawnTerrainZone(stage, terrains[i], 7.5));
      }
      while (this.terrainZones.length < 6) {
        this.terrainZones.push(this.spawnTerrainZone(stage, null, 7.5));
      }
    }

    resolveObstacleCollision(entity, entRadius) {
      for (let i = 0; i < this.terrainZones.length; i++) {
        const z = this.terrainZones[i];
        if (z.kind !== 'obstacle') continue;
        const dx = entity.x - z.x;
        const dz = entity.z - z.z;
        const dist = Math.hypot(dx, dz);
        const minDist = z.radius + entRadius;
        if (dist < minDist) {
          const nx = dist > 0.001 ? dx / dist : 1;
          const nz = dist > 0.001 ? dz / dist : 0;
          entity.x = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, z.x + nx * minDist));
          entity.z = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, z.z + nz * minDist));
        }
      }
    }

    updateTerrains(dt) {
      const stage = this.getStage();
      this.player.inSwamp = false;
      this.player.inPoison = false;
      this.player.inIce = false;

      for (let i = 0; i < this.terrainZones.length; i++) {
        const z = this.terrainZones[i];
        // 答題踏板存在期間，障礙物先停住、也不換位置，避免漂到踏板上把它卡住。
        const holdObstacle = z.kind === 'obstacle' && this.mathMode === 'world-question';
        if (!holdObstacle) {
          z.x += z.vx * dt;
          z.z += z.vz * dt;
          if (z.x < -ARENA_LIMIT + 3 || z.x > ARENA_LIMIT - 3) z.vx *= -1;
          if (z.z < -ARENA_LIMIT + 3 || z.z > ARENA_LIMIT - 3) z.vz *= -1;
          z.life -= dt;
        }
        const distP = Math.hypot(this.player.x - z.x, this.player.z - z.z);

        // 離玩家太遠或壽命結束 -> 不定期更換環境與位置
        if ((z.life <= 0 && !holdObstacle) || distP > 44) {
          this.terrainZones[i] = this.spawnTerrainZone(stage, null, 8.5);
          // 答題中新長出的障礙物若落在踏板旁，立刻推開，免得踏板被卡住。
          if (this.terrainZones[i].kind === 'obstacle' && this.mathMode === 'world-question') {
            for (const pad of this.answerPads) this.clearObstaclesAroundPad(pad.x, pad.z, pad.radius);
          }
          continue;
        }

        const inside = distP <= z.radius;
        if (z.kind === 'swamp' && inside) {
          this.player.inSwamp = true;
        } else if (z.kind === 'poison' && inside) {
          this.player.inPoison = true;
        } else if (z.kind === 'ice' && inside) {
          this.player.inIce = true;
        } else if (z.kind === 'thunder') {
          z.strikeTimer -= dt;
          if (z.strikeTimer <= 0) {
            z.strikeTimer = 2.2 + Math.random() * 0.8;
            this.spawnFx(z.x, z.z, 0xffe455, z.radius * 1.4, 0.22, 0.25, true);
            if (inside) {
              const dmg = Math.max(3, Math.round((12 - this.player.def * 0.3) * (1 + this.player.dr * 0.01)));
              this.player.hp -= dmg;
              this.player.paralyzeTimer = 0.85;
              this.renderer.addShake(0.28, 0.16);
              this.audio.playHurt();
              if (this.player.hp <= 0) {
                this.player.hp = 0;
                this.finishRun();
                return;
              }
            }
          }
        }
      }

      if (this.player.inPoison) {
        this.player.poisonTick += dt;
        if (this.player.poisonTick >= 0.5) {
          this.player.poisonTick -= 0.5;
          const dmg = Math.max(2, Math.round(this.player.maxHp * 0.025 * (1 + this.player.dr * 0.01)));
          this.player.hp -= dmg;
          this.spawnFx(this.player.x, this.player.z, 0x62f582, 0.9, 0.18, 0.8);
          if (this.player.hp <= 0) {
            this.player.hp = 0;
            this.finishRun();
            return;
          }
        }
      } else {
        this.player.poisonTick = 0;
      }
    }

    applyDamageToPlayer(rawDamage, status) {
      const afterDr = rawDamage * (1 + this.player.dr * 0.01);
      const finalDmg = Math.max(1, Math.round(afterDr - this.player.def));
      this.player.hp -= finalDmg;
      this.player.invuln = 0.18;
      if (this.showDamageNumbers && this.renderer.spawnDamageNumber) this.renderer.spawnDamageNumber(this.player.x, this.player.z, finalDmg, 'player');
      this.renderer.addShake(0.22, 0.12);
      this.audio.playHurt();

      if (status === 'bleed') this.player.bleedTimer = 5.0;
      else if (status === 'stun') this.player.stunTimer = 5.0;
      else if (status === 'burn') this.player.burnTimer = 4.0;
      else if (status === 'chill') this.player.chillTimer = 5.0;
      else if (status === 'paralyze') this.player.paralyzeTimer = Math.max(this.player.paralyzeTimer, 1.5);

      if (this.player.hp <= 0) {
        this.player.hp = 0;
        this.finishRun();
      }
    }

    updatePlayerStatuses(dt) {
      const p = this.player;
      if (p.paralyzeTimer > 0) p.paralyzeTimer = Math.max(0, p.paralyzeTimer - dt);
      if (p.stunTimer > 0) p.stunTimer = Math.max(0, p.stunTimer - dt);
      if (p.chillTimer > 0) p.chillTimer = Math.max(0, p.chillTimer - dt);

      if (p.bleedTimer > 0) {
        p.bleedTimer = Math.max(0, p.bleedTimer - dt);
        p.bleedTick += dt;
        if (p.bleedTick >= 0.5) {
          p.bleedTick -= 0.5;
          const dmg = Math.max(1, Math.round(p.maxHp * 0.02 * (1 + p.dr * 0.01)));
          p.hp -= dmg;
          this.spawnFx(p.x, p.z, 0xd83242, 0.75, 0.16, 0.75);
          if (p.hp <= 0) {
            p.hp = 0;
            this.finishRun();
            return;
          }
        }
      } else {
        p.bleedTick = 0;
      }

      if (p.burnTimer > 0) {
        p.burnTimer = Math.max(0, p.burnTimer - dt);
        p.burnTick += dt;
        if (p.burnTick >= 0.5) {
          p.burnTick -= 0.5;
          const dmg = Math.max(2, Math.round(p.maxHp * 0.025 * (1 + p.dr * 0.01)));
          p.hp -= dmg;
          this.spawnFx(p.x, p.z, 0xff7a2e, 0.85, 0.16, 0.8);
          if (p.hp <= 0) {
            p.hp = 0;
            this.finishRun();
            return;
          }
        }
      } else {
        p.burnTick = 0;
      }
    }

    updateEnemyProjectiles(dt) {
      for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
        const ep = this.enemyProjectiles[i];
        ep.x += ep.vx * dt;
        ep.z += ep.vz * dt;
        ep.life -= dt;
        if (ep.life <= 0) {
          this.enemyProjectiles.splice(i, 1);
          continue;
        }
        // 碰到障礙物擋下
        let blocked = false;
        for (let k = 0; k < this.terrainZones.length; k++) {
          const z = this.terrainZones[k];
          if (z.kind === 'obstacle' && Math.hypot(ep.x - z.x, ep.z - z.z) < z.radius + 0.25) {
            blocked = true;
            break;
          }
        }
        if (blocked) {
          this.enemyProjectiles.splice(i, 1);
          continue;
        }
        if (Math.hypot(ep.x - this.player.x, ep.z - this.player.z) < 0.75) {
          this.enemyProjectiles.splice(i, 1);
          this.applyDamageToPlayer(ep.damage, ep.onHitStatus);
          if (this.stateName !== 'playing') return;
        }
      }
    }

    spawnAttackTelegraph(e, warnDur) {
      const isMage = e.type.startsWith('mage_');
      const radius = isMage ? 2.5 : e.type === 'elite' ? 2.8 : 1.75;
      let fxColor = 0xff4455;
      if (e.type === 'mage_fire') fxColor = 0xff762a;
      else if (e.type === 'mage_ice') fxColor = 0x76e8ff;
      else if (e.type === 'mage_thunder') fxColor = 0xffe45e;

      this.telegraphs.push({
        x: this.player.x,
        z: this.player.z,
        radius,
        timer: warnDur,
        maxTimer: warnDur,
        damage: e.damage,
        status: e.onHitStatus || null,
        fxColor,
      });
    }

    updateTelegraphs(dt) {
      for (let i = this.telegraphs.length - 1; i >= 0; i--) {
        const tg = this.telegraphs[i];
        tg.timer -= dt;
        if (tg.timer <= 0) {
          this.telegraphs.splice(i, 1);
          this.spawnFx(tg.x, tg.z, tg.fxColor, tg.radius * 1.4, 0.24, 0.22, true);
          this.spawnFx(tg.x, tg.z, 0xffffff, tg.radius * 0.7, 0.16, 0.6);
          if (Math.hypot(this.player.x - tg.x, this.player.z - tg.z) <= tg.radius) {
            this.applyDamageToPlayer(tg.damage, tg.status);
            if (this.stateName !== 'playing') return;
          }
        }
      }
    }

    updateEffects(dt) {
      for (let i = this.effects.length - 1; i >= 0; i--) {
        const fx = this.effects[i];
        fx.life -= dt;
        if (fx.life <= 0) {
          this.effects.splice(i, 1);
          continue;
        }
        fx.size = fx.maxSize * (fx.life / fx.maxLife);
        if (fx.vx !== undefined) {
          fx.x += fx.vx * dt;
          fx.z += fx.vz * dt;
          fx.vy -= 14 * dt;
          fx.y = Math.max(0.08, fx.y + fx.vy * dt);
        }
        if (fx.maxScaleX != null) fx.scaleX = fx.maxScaleX * (fx.life / fx.maxLife);
        if (fx.maxScaleY != null) fx.scaleY = fx.maxScaleY * (fx.life / fx.maxLife);
      }
    }

    finishRun() {
      this.stateName = 'gameover';
      this.mathMode = 'none';
      this.mathCurrent = null;
      this.answerPads = [];
      this.ui.hideMathAction();
      this.ui.hideMathBanner();
      this.ui.hideHarvestTask();
      this.save.gold += this.runGold;
      this.save.freeExplores = (this.save.freeExplores || 0) + 1;
      this.save.bestTime = Math.max(this.save.bestTime, Math.floor(this.elapsed));
      this.save.bestKills = Math.max(this.save.bestKills, this.kills);
      writeSave(this.save);
      this.ui.showGameOver(this);
    }

    togglePause() {
      if (this.mathMode === 'paused-question' || this.mathMode === 'feedback' || this.mathMode === 'reward') return;
      if (this.stateName === 'playing') {
        this.stateName = 'paused';
        this.keys = {};
        this.joyVec = { x: 0, z: 0 };
        this.ui.showPause(this);
      } else if (this.stateName === 'paused') {
        this.resumeFromPause();
      }
    }

    resumeFromPause() {
      if (this.stateName !== 'paused') return;
      this.keys = {};
      this.joyVec = { x: 0, z: 0 };
      this.stateName = 'playing';
      this.ui.hidePause();
    }

    abortToMenu() {
      this.save.gold += this.runGold;
      this.runGold = 0;
      this.save.bestTime = Math.max(this.save.bestTime, Math.floor(this.elapsed));
      this.save.bestKills = Math.max(this.save.bestKills, this.kills);
      writeSave(this.save);
      this.keys = {};
      this.joyVec = { x: 0, z: 0 };
      this.stateName = 'menu';
      this.mathMode = 'none';
      this.mathCurrent = null;
      this.answerPads = [];
      this.ui.hidePause();
      this.ui.hideMathAction();
      this.ui.hideMathBanner();
      this.ui.hideHarvestTask();
      this.ui.els.hud.classList.add('hidden');
      this.ui.els.menuOverlay.classList.remove('hidden');
      this.ui.renderMenu(this);
    }
  }

  PGS.SurvivorGame = SurvivorGame;
})(window);
