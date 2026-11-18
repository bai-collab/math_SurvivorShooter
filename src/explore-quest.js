(function (global) {
  'use strict';

  const PGS = (global.PGS = global.PGS || {});
  const BANDS = ['low', 'middle', 'high'];
  const DAY_NAMES = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
  const BIRD_TYPES = [
    { id: 'egret', name: '白鷺鷥', icon: '🕊️' },
    { id: 'migrant', name: '候鳥', icon: '🐦' },
    { id: 'sparrow', name: '麻雀', icon: '🐤' },
  ];

  function hashSeed(value) {
    let h = 2166136261;
    const text = String(value);
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  function createRng(seed) {
    let state = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed == null ? 1 : seed);
    if (!state) state = 0x6d2b79f5;
    return () => {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function int(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function pick(rng, values) {
    return values[Math.floor(rng() * values.length)];
  }

  function shuffle(rng, values) {
    const out = values.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function makeQuestion(type, band, prompt, answer, distractors, explanation, hint, details, rng) {
    const answerText = String(answer);
    const choices = [];
    for (const item of [answerText, ...distractors.map(String)]) {
      if (!choices.includes(item)) choices.push(item);
      if (choices.length === 4) break;
    }
    if (choices.length < 4) throw new Error(`題目 ${type} 的選項不足`);
    return {
      type,
      band,
      prompt,
      answer: answerText,
      choices: shuffle(rng, choices),
      explanation,
      hint,
      ...(details || {}),
    };
  }

  function generateArrayQuestion(band, seed) {
    const rng = createRng(seed);
    const limits = band === 'low' ? [2, 5] : band === 'middle' ? [2, 8] : [3, 12];
    const rows = int(rng, limits[0], limits[1]);
    const columns = int(rng, limits[0], limits[1]);
    const count = rows * columns;
    const answer = `${rows} 行 × ${columns} 列`;
    const pairs = [];
    for (let r = 2; r <= rows + 3; r++) {
      for (let c = 2; c <= columns + 3; c++) {
        if (r * c !== count) pairs.push(`${r} 行 × ${c} 列`);
      }
    }
    const distractors = shuffle(rng, [...new Set(pairs)]).slice(0, 3);
    return makeQuestion('array', band, `一畝田有 ${count} 株秧苗，選一種能排成整齊長方形的行數和列數。`, answer, distractors,
      `${rows} 行、每行 ${columns} 株：${rows} × ${columns} = ${count} 株。行列互換也能排成相同大小的長方形。`,
      '把行數乘上每行的株數，檢查總數是否剛好相同。', { count, rows, columns }, rng);
  }

  // 去掉重複、非正整數、超過上限與等於正解的數字，保留前面幾個。
  function positiveDistractors(candidates, answer, max = Infinity) {
    const out = [];
    for (const n of candidates) {
      if (Number.isInteger(n) && n > 0 && n <= max && n !== answer && !out.includes(n)) out.push(n);
    }
    return out;
  }

  function generateWeightQuestion(band, seed) {
    const rng = createRng(seed);
    if (band === 'low') {
      // 低年級：只用同一單位（公斤）的二位數加減，不做公斤與公克換算。
      const operation = pick(rng, ['add', 'subtract']);
      let a;
      let b;
      let total;
      let prompt;
      let explanation;
      if (operation === 'add') {
        a = int(rng, 10, 49);
        b = int(rng, 10, 49);
        total = a + b;
        prompt = `兩袋稻穀，一袋 ${a} 公斤、一袋 ${b} 公斤，合起來共有幾公斤？`;
        explanation = `${a} ＋ ${b} = ${total}，所以共有 ${total} 公斤。`;
      } else {
        a = int(rng, 30, 99);
        b = int(rng, 10, a - 10);
        total = a - b;
        prompt = `稻穀埕有 ${a} 公斤稻穀，裝走 ${b} 公斤，還剩幾公斤？`;
        explanation = `${a} － ${b} = ${total}，所以還剩 ${total} 公斤。`;
      }
      const distractors = positiveDistractors(operation === 'add'
        ? [total + 10, total - 10, total + 1, total - 1, a, total + 2]
        : [a + b, total + 10, total - 10, total + 1, total - 1, b], total, 99).slice(0, 3);
      return makeQuestion('weight', band, prompt, `${total} 公斤`, distractors.map((n) => `${n} 公斤`), explanation,
        operation === 'add' ? '把兩袋的公斤數相加。' : '用原來的公斤數減掉裝走的公斤數。',
        { operation, a, b, total }, rng);
    }
    const numberOfSacks = band === 'middle' ? 2 : 3;
    const parts = Array.from({ length: numberOfSacks }, () => ({
      kg: int(rng, 1, band === 'middle' ? 3 : 4),
      g: int(rng, 1, 9) * 100,
    }));
    const totalGrams = parts.reduce((sum, part) => sum + part.kg * 1000 + part.g, 0);
    const answer = `${totalGrams} 公克`;
    const expression = parts.map((part) => `${part.kg} 公斤 ${part.g} 公克`).join(' ＋ ');
    const offsets = [-700, -300, 400, 900, 1300, -1100];
    const distractors = offsets.map((offset) => `${Math.max(100, totalGrams + offset)} 公克`);
    return makeQuestion('weight', band, `把 ${expression} 的稻穀合起來，共有幾公克？`, answer, distractors,
      `先把公斤換成公克（1 公斤 = 1000 公克），再把每袋重量相加，總共是 ${totalGrams} 公克。`,
      '先將每袋的公斤乘以 1000，再加上公克，最後相加。', { parts, totalGrams }, rng);
  }

  function generateWaterCycleQuestion(band, seed) {
    const rng = createRng(seed);
    const correct = ['蒸發', '凝結', '降水', '匯流'];
    const variants = [
      ['凝結', '蒸發', '降水', '匯流'],
      ['蒸發', '降水', '凝結', '匯流'],
      ['蒸發', '凝結', '匯流', '降水'],
      ['降水', '蒸發', '凝結', '匯流'],
    ].map((steps) => steps.join(' → '));
    const answer = correct.join(' → ');
    return makeQuestion('water-cycle', band, '把水循環排成正確順序：水受熱變成水蒸氣、形成雲、落回地面，再流入河川。', answer, variants,
      '水受熱蒸發，水蒸氣凝結成雲，接著降水，最後匯流回河川或水體。',
      '先找出水變成水蒸氣的步驟，再依序排雲、下雨和匯流。', { correctOrder: correct }, rng);
  }

  function formatVolume(totalMl, asDecimalLiters) {
    if (asDecimalLiters) return `${totalMl / 1000} 公升`;
    const liters = Math.floor(totalMl / 1000);
    const milliliters = totalMl % 1000;
    if (!liters) return `${milliliters} 毫升`;
    if (!milliliters) return `${liters} 公升`;
    return `${liters} 公升 ${milliliters} 毫升`;
  }

  // 低年級容量題：只用「杯」「瓶」這類非標準單位的加減乘，不出現公升、毫升。
  function generateCupVolumeQuestion(band, rng) {
    const kind = pick(rng, ['remaining', 'bottle', 'total']);
    let prompt;
    let answerNumber;
    let candidates;
    let explanation;
    let hint;
    let details;
    if (kind === 'remaining') {
      const capacity = int(rng, 8, 20);
      const poured = int(rng, 2, capacity - 3);
      answerNumber = capacity - poured;
      prompt = `一桶要裝 ${capacity} 杯水，已經倒了 ${poured} 杯，還要再倒幾杯？`;
      candidates = [capacity + poured, poured, answerNumber + 1, answerNumber - 1, answerNumber + 2, answerNumber - 2];
      explanation = `${capacity} － ${poured} = ${answerNumber}，所以還要再倒 ${answerNumber} 杯。`;
      hint = '總共要的杯數減掉已經倒的杯數。';
      details = { kind, capacity, poured, targetCups: answerNumber };
    } else if (kind === 'bottle') {
      const perBottle = int(rng, 2, 5);
      const bottles = int(rng, 2, 4);
      answerNumber = perBottle * bottles;
      prompt = `1 大瓶水剛好可以倒滿 ${perBottle} 小杯。倒了 ${bottles} 大瓶，一共可以倒滿幾小杯？`;
      candidates = [perBottle + bottles, answerNumber + perBottle, answerNumber - perBottle, answerNumber + 1, answerNumber - 1, answerNumber + 2];
      explanation = `每瓶 ${perBottle} 杯，${bottles} 瓶就是 ${perBottle} × ${bottles} = ${answerNumber} 杯。`;
      hint = '每一瓶的杯數，乘上瓶數。';
      details = { kind, perBottle, bottles, targetCups: answerNumber };
    } else {
      const first = int(rng, 6, 25);
      const second = int(rng, 6, 25);
      answerNumber = first + second;
      prompt = `小水桶可以裝 ${first} 杯水，大水桶可以裝 ${second} 杯水。兩個水桶合起來可以裝幾杯？`;
      candidates = [answerNumber + 10, answerNumber - 10, answerNumber + 1, answerNumber - 1, answerNumber + 2, first];
      explanation = `${first} ＋ ${second} = ${answerNumber}，所以合起來可以裝 ${answerNumber} 杯。`;
      hint = '把兩個水桶的杯數相加。';
      details = { kind, first, second, targetCups: answerNumber };
    }
    const distractors = positiveDistractors(candidates, answerNumber).slice(0, 3).map((n) => `${n} 杯`);
    return makeQuestion('volume', band, prompt, `${answerNumber} 杯`, distractors, explanation, hint, details, rng);
  }

  function generateVolumeQuestion(band, seed) {
    const rng = createRng(seed);
    if (band === 'low') return generateCupVolumeQuestion(band, rng);
    const cupCount = band === 'middle' ? int(rng, 1, 3) : int(rng, 2, 4);
    const literCount = band === 'middle' ? 1 : int(rng, 1, 2);
    const targetMl = cupCount * 250 + literCount * 1000;
    // 高年級有一半的題目把目標寫成小數公升（例如 1.75 公升）。
    const decimal = band === 'high' && rng() < 0.5;
    const answer = `${literCount ? `${literCount} 個 1 公升瓶` : ''}${literCount && cupCount ? ' ＋ ' : ''}${cupCount} 杯 250 毫升量杯`;
    const distractors = [
      `${literCount ? `${literCount} 個 1 公升瓶` : ''}${literCount ? ' ＋ ' : ''}${Math.max(1, cupCount - 1)} 杯 250 毫升量杯`,
      `${literCount ? `${literCount + 1} 個 1 公升瓶` : ''}${literCount ? ' ＋ ' : ''}${cupCount} 杯 250 毫升量杯`,
      `${literCount ? `${literCount} 個 1 公升瓶` : ''}${literCount ? ' ＋ ' : ''}${cupCount + 1} 杯 250 毫升量杯`,
      `${literCount ? `${Math.max(1, literCount - 1)} 個 1 公升瓶` : ''}${literCount ? ' ＋ ' : ''}${cupCount + 2} 杯 250 毫升量杯`,
    ];
    const answerParts = Array.from({ length: literCount }, () => 1000).concat(Array.from({ length: cupCount }, () => 250));
    const targetText = formatVolume(targetMl, decimal);
    const convert = decimal ? `${targetText} = ${targetMl} 毫升；` : '';
    return makeQuestion('volume', band, `水桶要裝到 ${targetText}。用 1 公升水瓶和 250 毫升量杯，哪個倒水組合剛好？`, answer, distractors,
      `1 公升 = 1000 毫升；${convert}${literCount} × 1000 ＋ ${cupCount} × 250 = ${targetMl} 毫升，剛好達到目標。`,
      '先把公升換成 1000 毫升，再加上每杯的 250 毫升。', { targetMl, answerParts, availableVessels: [1000, 250] }, rng);
  }

  function generateSolarSet(band, seed) {
    const rng = createRng(seed);
    const days = band === 'low' ? DAY_NAMES.slice(0, 5) : band === 'middle' ? DAY_NAMES.slice(0, 6) : DAY_NAMES.slice();
    const min = band === 'low' ? 2 : band === 'middle' ? 40 : 80;
    const max = band === 'low' ? 12 : band === 'middle' ? 180 : 360;
    const used = new Set();
    const values = days.map((day) => {
      let value = int(rng, min, max);
      while (used.has(value)) value = value === max ? min : value + 1;
      used.add(value);
      return { day, value };
    });
    const highest = values.reduce((a, b) => a.value > b.value ? a : b);
    const lowest = values.reduce((a, b) => a.value < b.value ? a : b);
    const total = values.reduce((sum, item) => sum + item.value, 0);
    const metrics = [
      { key: 'maximum', prompt: '哪一天的發電量最多？', answer: highest.day, distractors: values.filter((v) => v.day !== highest.day).map((v) => v.day), explanation: `${highest.day}最多，是 ${highest.value} 度。` },
      { key: 'minimum', prompt: '哪一天的發電量最少？', answer: lowest.day, distractors: values.filter((v) => v.day !== lowest.day).map((v) => v.day), explanation: `${lowest.day}最少，是 ${lowest.value} 度。` },
      { key: 'difference', prompt: '最多和最少相差幾度？', answer: `${highest.value - lowest.value} 度`, distractors: [highest.value + lowest.value, highest.value - lowest.value + 7, highest.value - lowest.value + 11].map((n) => `${n} 度`), explanation: `${highest.value} − ${lowest.value} = ${highest.value - lowest.value} 度。` },
      { key: 'sum', prompt: '這週的發電量總和是多少？', answer: `${total} 度`, distractors: [total + 7, total + 13, total + 19].map((n) => `${n} 度`), explanation: `把每天的數字相加，總和是 ${total} 度。` },
    ];
    const questions = metrics.map((metric, index) => makeQuestion('solar', band, metric.prompt, metric.answer, metric.distractors,
      metric.explanation, '先在長條圖上找最高與最低的柱子；總和題要把每天的數字加起來。',
      { metric: metric.key, values: values.map((item) => ({ ...item })), dayCount: days.length }, createRng(`${seed}:${index}`)));
    return { band, values, questions, units: '度（遊戲練習數據）' };
  }

  function isPrime(value) {
    if (value < 2) return false;
    for (let divisor = 2; divisor * divisor <= value; divisor++) if (value % divisor === 0) return false;
    return true;
  }

  function generateSequenceQuestion(band, seed) {
    const rng = createRng(seed);
    let values;
    let next;
    let rule;
    let ruleLabel;
    let extraDistractors = [];
    if (band === 'low') {
      const step = pick(rng, [2, 3, 5, 10]);
      const start = int(rng, 1, 18);
      values = Array.from({ length: 4 }, (_, i) => start + step * i);
      next = start + step * 4;
      rule = `每次加 ${step}`;
      ruleLabel = '等差';
    } else if (band === 'middle') {
      // 中年級：加減規律、「加 2、加 3」輪流、九九乘法表的一列；不出現等比。
      const kind = pick(rng, ['add', 'subtract', 'alternate', 'table']);
      if (kind === 'add') {
        const step = pick(rng, [3, 4, 6, 7, 8, 9, 12, 15, 25, 50]);
        const start = int(rng, 5, 60);
        values = Array.from({ length: 4 }, (_, i) => start + step * i);
        next = start + step * 4;
        rule = `每次加 ${step}`;
        ruleLabel = '等差';
      } else if (kind === 'subtract') {
        const step = pick(rng, [3, 4, 6, 7, 8, 9, 12, 15]);
        const start = step * 4 + int(rng, 5, 60);
        values = Array.from({ length: 4 }, (_, i) => start - step * i);
        next = start - step * 4;
        rule = `每次減 ${step}`;
        ruleLabel = '等差';
      } else if (kind === 'alternate') {
        const [first, second] = pick(rng, [[2, 3], [3, 4], [5, 10], [4, 6], [10, 20], [1, 3]]);
        const start = int(rng, 3, 40);
        values = [start, start + first, start + first + second, start + 2 * first + second, start + 2 * first + 2 * second];
        next = start + 3 * first + 2 * second;
        rule = `輪流加 ${first}、加 ${second}`;
        ruleLabel = '輪流相加';
        extraDistractors = [values[4] + second, values[4] + first + second];
      } else {
        const factor = pick(rng, [4, 5, 6, 7, 8, 9]);
        const startRow = int(rng, 1, 5);
        values = Array.from({ length: 4 }, (_, i) => factor * (startRow + i));
        next = factor * (startRow + 4);
        rule = `${factor} 的乘法表（每次多 ${factor}）`;
        ruleLabel = '乘法表的一列';
      }
    } else {
      if (rng() < 0.5) {
        const primes = [];
        for (let n = 2; primes.length < 16; n++) if (isPrime(n)) primes.push(n);
        const start = int(rng, 0, primes.length - 5);
        values = primes.slice(start, start + 4);
        next = primes[start + 4];
        rule = '依序找大於 1 的質數';
        ruleLabel = '質數';
      } else {
        // 等比：每次乘同一個數。下一項固定是偶數，保留「正解不是唯一的奇數」的出題品質。
        const factor = pick(rng, [2, 3, 4]);
        const start = factor === 3 ? pick(rng, [2, 4, 6]) : int(rng, 2, 6);
        values = Array.from({ length: 4 }, (_, i) => start * factor ** i);
        next = start * factor ** 4;
        rule = `每次乘 ${factor}`;
        ruleLabel = '等比';
      }
    }
    const answer = String(next);
    const step = values[1] - values[0];
    let distractors;
    if (band === 'low') {
      // 重複最後一項、跳過一項、多或少一格。
      distractors = [next - step, next + step, next + 1, next - 1, next + 2];
    } else if (band === 'middle') {
      // 重複最後一項、跳過一項、加錯一格、差 1。
      const last = values[values.length - 1];
      distractors = [...extraDistractors, next - Math.abs(step), next + Math.abs(step), last, next + 1, next - 1, next + 2, next - 2];
    } else if (ruleLabel === '等比') {
      const last = values[3];
      distractors = [2 * last - values[2], next + 1, next - 1, last, next + 2];
    } else {
      // 質數除了正解以外，還要有質數與奇合數當錯誤選項，才不會只靠奇偶就猜到答案。
      const primeList = [];
      for (let n = 2; primeList.length < 24; n++) if (isPrime(n)) primeList.push(n);
      const idx = primeList.indexOf(next);
      const oddComposites = [];
      for (let n = Math.max(9, next - 8); n <= next + 12; n++) if (n % 2 === 1 && !isPrime(n)) oddComposites.push(n);
      oddComposites.sort((x, y) => Math.abs(x - next) - Math.abs(y - next));
      distractors = [primeList[idx + 1], values[3], oddComposites[0], next + 1, oddComposites[1]];
    }
    const clean = distractors.filter((n, i) => n > 0 && n !== next && distractors.indexOf(n) === i);
    return makeQuestion('sequence', band, `彩虹階梯的數字是 ${values.join('、')}、下一階是幾？`, answer,
      clean,
      `規律是「${rule}」，所以接下來是 ${next}。`,
      band === 'high' ? '先比較前後數字的差，或檢查是否每次乘同一個數。' : '先比較前後數字的差，看看每次是加還是減。',
      { values, next, rule, ruleLabel }, rng);
  }

  function generateBirdSet(band, seed) {
    const rng = createRng(seed);
    const range = band === 'low' ? [1, 5] : band === 'middle' ? [3, 10] : [5, 16];
    let counts = BIRD_TYPES.map(() => int(rng, range[0], range[1]));
    while (new Set(counts).size !== counts.length) counts = BIRD_TYPES.map(() => int(rng, range[0], range[1]));
    const sightings = shuffle(rng, BIRD_TYPES.flatMap((bird, index) => Array.from({ length: counts[index] }, () => ({ birdId: bird.id, icon: bird.icon }))));
    const rows = BIRD_TYPES.map((bird, index) => ({ ...bird, count: counts[index] }));
    const mostCommon = rows.reduce((a, b) => a.count > b.count ? a : b);
    const questions = rows.map((row, index) => makeQuestion('birds', band, `剛才看見的${row.name}有幾隻？`, `${row.count} 隻`,
      counts.filter((_, i) => i !== index).map((value) => `${value} 隻`).concat([
        `${row.count + 1} 隻`, `${row.count + 2} 隻`, `${row.count + 3} 隻`, `${row.count + 4} 隻`, `${row.count - 1} 隻`, `${row.count - 2} 隻`,
      ]),
      `${row.name}共 ${row.count} 隻；把相同種類的鳥分組，再逐組計數。`, '回想同一種鳥的圖示，或把看到的鳥依種類分組。',
      { birdId: row.id, count: row.count, counts: rows.map(({ id, count }) => ({ id, count })) }, createRng(`${seed}:bird:${index}`)));
    questions.push(makeQuestion('birds', band, '哪一種鳥出現得最多？', mostCommon.name, rows.filter((row) => row.id !== mostCommon.id).map((row) => row.name).concat(['一樣多']),
      `白鷺鷥 ${counts[0]} 隻、候鳥 ${counts[1]} 隻、麻雀 ${counts[2]} 隻；${mostCommon.name}最多。`,
      '把三種鳥各自的數量放在一起比較，找最大的數。',
      { metric: 'most', counts: rows.map(({ id, count }) => ({ id, count })) }, createRng(`${seed}:bird:most`)));
    return { band, rows, sightings, questions };
  }

  function generateHistoryQuestion(band, seed) {
    const rng = createRng(seed);
    const year = 1922;
    let prompt;
    let answer;
    let distractors;
    let explanation;
    let hint = '週年年份用創校年份加上週年數；經過幾年則用後來的年份減創校年份。';
    let details;
    if (band === 'low') {
      // 低年級：只做二位數的加減（年紀與年數），題目不出現四位數的年份。
      const years = pick(rng, [2, 3, 4, 5, 6, 7, 8, 9, 10, 20]);
      const later = rng() < 0.5;
      const age = later ? int(rng, 20, 99 - years) : int(rng, years + 10, 99);
      const result = later ? age + years : age - years;
      prompt = later
        ? `校史牆的老照片裡，有位校友今年 ${age} 歲。再過 ${years} 年，他是幾歲？`
        : `校史牆的老照片裡，有位校友今年 ${age} 歲。${years} 年前，他是幾歲？`;
      answer = `${result} 歲`;
      distractors = [later ? age - years : age + years, result + 10, result - 10, result + 1, result - 1, age]
        .filter((n, i, list) => n > 0 && n <= 99 && n !== result && list.indexOf(n) === i).slice(0, 3).map((n) => `${n} 歲`);
      explanation = later
        ? `往後算要用加法：${age} ＋ ${years} = ${result}，所以是 ${result} 歲。`
        : `往前算要用減法：${age} － ${years} = ${result}，所以是 ${result} 歲。`;
      hint = '再過幾年用加法，幾年前用減法。';
      details = { kind: later ? 'later' : 'earlier', age, years, result, foundingYear: year };
    } else if (band === 'middle') {
      const targetYear = pick(rng, [1942, 1952, 1972, 1992, 2026]);
      const elapsed = targetYear - year;
      prompt = `北園國小在 1922 年創校，到 ${targetYear} 年經過幾年？`;
      answer = `${elapsed} 年`;
      distractors = [`${elapsed - 10} 年`, `${elapsed - 1} 年`, `${elapsed + 1} 年`];
      explanation = `${targetYear} − ${year} = ${elapsed} 年。`;
      details = { foundingYear: year, targetYear, elapsed };
    } else {
      const anniversary = pick(rng, [100, 110, 120, 150]);
      const answerYear = year + anniversary;
      prompt = `北園國小在 1922 年創校，${anniversary} 週年是哪一年？`;
      answer = `${answerYear} 年`;
      distractors = [`${answerYear - 10} 年`, `${answerYear - 1} 年`, `${answerYear + 1} 年`];
      explanation = `${year} + ${anniversary} = ${answerYear}，所以 ${answerYear} 年滿 ${anniversary} 週年。`;
      details = { foundingYear: year, anniversary, answerYear };
    }
    return makeQuestion('history', band, prompt, answer, distractors, explanation, hint, details, rng);
  }

  function generateChangeQuestion(band, seed) {
    const rng = createRng(seed);
    const ranges = band === 'low' ? [3, 19, 50] : band === 'middle' ? [8, 79, 100] : [25, 399, 500];
    const a = int(rng, ranges[0], ranges[1]);
    const b = int(rng, ranges[0], ranges[1]);
    const total = a + b;
    // 付款金額一定大於總價（總價剛好是整數倍時，再往上一個級距），才不會出現找回 0 元。
    const paid = (Math.floor(total / ranges[2]) + 1) * ranges[2];
    const answer = paid - total;
    return makeQuestion('change', band, `買了 ${a} 元和 ${b} 元的商品，付 ${paid} 元，應找回多少元？`, `${answer} 元`,
      [`${answer + 1} 元`, `${answer - 1} 元`, `${total} 元`, `${paid + total} 元`, `${answer + 10} 元`, `${answer + 2} 元`].filter((text) => Number.parseInt(text, 10) > 0),
      `先算商品總價 ${a} + ${b} = ${total} 元，再算 ${paid} − ${total} = ${answer} 元。`,
      '先把兩樣商品的價錢加起來，再用付款金額減掉總價。', { prices: [a, b], total, paid, change: answer }, rng);
  }

  function generateQuestion(type, band, seed) {
    if (!BANDS.includes(band)) throw new Error(`未知年級段：${band}`);
    const generators = {
      array: generateArrayQuestion,
      weight: generateWeightQuestion,
      'water-cycle': generateWaterCycleQuestion,
      volume: generateVolumeQuestion,
      sequence: generateSequenceQuestion,
      history: generateHistoryQuestion,
      change: generateChangeQuestion,
    };
    const generator = generators[type];
    if (!generator) throw new Error(`未知探索題型：${type}`);
    return generator(band, seed);
  }

  function prepareBuildingColliders(buildings) {
    return (buildings || []).filter((building) => building.p && building.p.length >= 3).map((building) => {
      const xs = building.p.map((point) => point[0]);
      const ys = building.p.map((point) => point[1]);
      return {
        minX: Math.min(...xs), maxX: Math.max(...xs),
        minY: Math.min(...ys), maxY: Math.max(...ys),
        p: building.p,
      };
    });
  }

  function pointInPolygon(x, y, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersects = ((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi;
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function isBlocked(x, y, colliders, radius = 3) {
    if (!colliders) return false;
    const probes = [[x, y], [x - radius, y], [x + radius, y], [x, y - radius], [x, y + radius]];
    for (const collider of colliders) {
      if (x + radius < collider.minX || x - radius > collider.maxX || y + radius < collider.minY || y - radius > collider.maxY) continue;
      for (const [px, py] of probes) if (pointInPolygon(px, py, collider.p)) return true;
    }
    return false;
  }

  PGS.ExploreQuest = {
    BANDS,
    BIRD_TYPES,
    generateQuestion,
    generateArrayQuestion,
    generateWeightQuestion,
    generateWaterCycleQuestion,
    generateVolumeQuestion,
    generateSolarSet,
    generateSequenceQuestion,
    generateBirdSet,
    generateHistoryQuestion,
    generateChangeQuestion,
    prepareBuildingColliders,
    pointInPolygon,
    isBlocked,
  };
})(window);
