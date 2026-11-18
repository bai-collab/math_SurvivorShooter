(function (global) {
  'use strict';

  const PGS = (global.PGS = global.PGS || {});

  const BANDS = {
    low: { label: '低年級（1–2 年級）', topics: ['add-subtract', 'compare', 'number-line', 'clock'] },
    middle: {
      label: '中年級（3–4 年級）',
      topics: ['multiplication', 'division-remainder', 'two-step', 'same-denominator-fractions', 'rectangle', 'kg-gram'],
    },
    high: {
      label: '高年級（5–6 年級）',
      // 因數與倍數、公因數公倍數、質數合數都是五年級才教，所以只放在高年級。
      topics: ['factors-multiples', 'gcd-lcm', 'prime-composite', 'unlike-fractions', 'decimal-multiplication', 'percentage', 'ratio', 'speed-time'],
    },
  };

  const TOPIC_LABELS = {
    'add-subtract': '100 以內加減',
    compare: '比大小',
    'number-line': '數數與數線',
    clock: '整點與半點',
    multiplication: '九九乘法',
    'division-remainder': '除法與餘數',
    'two-step': '兩步驟應用題',
    'factors-multiples': '因數與倍數',
    'same-denominator-fractions': '同分母分數',
    rectangle: '長方形面積與周長',
    'kg-gram': '公斤與公克',
    'gcd-lcm': '公因數與公倍數',
    'prime-composite': '質數與合數',
    'unlike-fractions': '異分母分數',
    'decimal-multiplication': '小數乘法',
    percentage: '百分率',
    ratio: '簡單比例',
    'speed-time': '時間與速率',
  };

  function createRng(seed) {
    let state = typeof seed === 'number' ? seed >>> 0 : hashSeed(String(seed == null ? 1 : seed));
    if (state === 0) state = 0x6d2b79f5;
    return function rng() {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  function int(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function choice(rng, values) {
    return values[Math.floor(rng() * values.length)];
  }

  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a || 1;
  }

  function fractionText(n, d) {
    if (d === 0) return '0';
    if (n === 0) return '0';
    const sign = n < 0 ? '-' : '';
    const k = gcd(n, d);
    n = Math.abs(n) / k;
    d = Math.abs(d) / k;
    return d === 1 ? `${sign}${n}` : `${sign}${n}/${d}`;
  }

  // 把 "n/d" 或整數文字轉成約分後的字串，供數值比對。
  function fractionKey(text) {
    const m = String(text).match(/^(-?\d+)(?:\/(\d+))?$/);
    if (!m) return String(text);
    return fractionText(Number(m[1]), m[2] ? Number(m[2]) : 1);
  }

  function shuffle(rng, items) {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  // keyOf：把選項文字轉成「數值身分」（例如分數 2/6 與 1/3 視為同一個值），避免錯誤選項與正解數值相等。
  function buildQuestion(band, topic, prompt, answer, distractors, explanation, tags, rng, keyOf) {
    const answerText = String(answer);
    const keyFn = typeof keyOf === 'function' ? keyOf : (text) => text;
    const seen = new Set([keyFn(answerText)]);
    const unique = [];
    for (const item of distractors) {
      const text = String(item);
      const key = keyFn(text);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(text);
      }
      if (unique.length === 3) break;
    }
    const options = shuffle(rng, [answerText, ...unique.slice(0, 3)]);
    return {
      id: `${band}-${topic}-${Math.floor(rng() * 0x100000000).toString(36)}`,
      band,
      topic,
      topicLabel: TOPIC_LABELS[topic],
      prompt,
      choices: options,
      answerIndex: options.indexOf(answerText),
      explanation,
      misconceptionTags: Array.from(new Set(tags)),
    };
  }

  function makeAddition(rng) {
    const add = rng() < 0.55;
    let a;
    let b;
    let answer;
    let distractors;
    let explanation;
    let tags;
    if (add) {
      a = int(rng, 12, 68);
      b = int(rng, 11, Math.min(90 - a, 31));
      answer = a + b;
      const ones = (a % 10) + (b % 10);
      const tensSum = Math.floor(a / 10) + Math.floor(b / 10);
      if (ones >= 10) {
        // 忘記進位：個位和只留個位，十位沒有加 1。
        const forgetCarry = tensSum * 10 + (ones % 10);
        distractors = [forgetCarry, answer + 10, answer + 1, answer - 1];
        explanation = `個位 ${a % 10} + ${b % 10} = ${ones}，滿 10 要向十位進 1，所以十位是 ${tensSum + 1}，答案是 ${answer}。`;
        tags = ['忘記進位', '十位與個位混算'];
      } else {
        distractors = [answer + 10, answer - 10, answer + 1, answer - 1];
        explanation = `個位 ${a % 10} + ${b % 10} = ${ones}，十位 ${Math.floor(a / 10)} + ${Math.floor(b / 10)} = ${tensSum}，合起來是 ${answer}。`;
        tags = ['十位與個位混算', '少算或多算一個十'];
      }
    } else {
      a = int(rng, 25, 99);
      b = int(rng, 11, Math.min(a - 1, 58));
      answer = a - b;
      const onesA = a % 10;
      const onesB = b % 10;
      const tensDiff = Math.floor(a / 10) - Math.floor(b / 10);
      if (onesA < onesB) {
        // 忘記退位：個位用「大減小」，十位也沒有少 1。
        const forgetBorrow = tensDiff * 10 + (onesB - onesA);
        distractors = [forgetBorrow, answer + 10, answer - 10, answer + 1, answer - 1];
        explanation = `個位 ${onesA} 不夠減 ${onesB}，向十位借 1 個十，變成 ${10 + onesA} − ${onesB} = ${10 + onesA - onesB}；十位剩 ${Math.floor(a / 10) - 1} − ${Math.floor(b / 10)} = ${tensDiff - 1}，所以 ${a} − ${b} = ${answer}。`;
        tags = ['忘記退位', '個位大減小'];
      } else {
        distractors = [answer + 10, answer - 10, answer + 1, answer - 1, answer + 2];
        explanation = `個位 ${onesA} − ${onesB} = ${onesA - onesB}，十位 ${Math.floor(a / 10)} − ${Math.floor(b / 10)} = ${tensDiff}，合起來是 ${answer}。`;
        tags = ['十位與個位混算', '少算或多算一個十'];
      }
    }
    const op = add ? '+' : '−';
    // 低年級不出現負數選項。
    return buildQuestion('low', 'add-subtract', `請算：${a} ${op} ${b} = ？`, answer,
      distractors.filter((n) => n >= 0), explanation, tags, rng);
  }

  // 比大小：選項只放符號 <、>、=，題幹寫「a □ b」；解說依位數分四種說法，一位數時不講「十位」。
  function makeComparison(rng) {
    const a = int(rng, 1, 99);
    let b = int(rng, 1, 99);
    while (a === b) b = int(rng, 1, 99);
    const answer = a < b ? '<' : '>';
    const tensA = Math.floor(a / 10);
    const tensB = Math.floor(b / 10);
    let explanation;
    if (a < 10 && b < 10) {
      explanation = `兩個數都是一位數，直接比大小：${a} ${answer} ${b}。`;
    } else if (a < 10 || b < 10) {
      explanation = `兩位數比一位數大：${a} ${answer} ${b}。`;
    } else if (tensA !== tensB) {
      explanation = `先比十位：${tensA} 個十和 ${tensB} 個十，十位大的數比較大，所以 ${a} ${answer} ${b}。`;
    } else {
      explanation = `十位一樣，再比個位：${a % 10} 和 ${b % 10}，所以 ${a} ${answer} ${b}。`;
    }
    return buildQuestion('low', 'compare', `哪個符號能放進 ${a} □ ${b}？`, answer,
      ['<', '>', '='].filter((x) => x !== answer), explanation,
      ['看錯比較方向', '只看個位'], rng);
  }

  function makeNumberLine(rng) {
    const step = choice(rng, [1, 2, 5, 10]);
    const start = int(rng, 0, Math.floor((100 - step * 5) / step)) * step;
    const second = start + step;
    const answer = second + step;
    return buildQuestion('low', 'number-line', `數線每次往前跳 ${step} 格：${start}、${second}、接下來是幾？`, answer,
      [second, answer + step, start], `每次增加 ${step}，所以 ${second} 再加 ${step} 是 ${answer}。`,
      ['多跳或少跳一格', '把間距看錯'], rng);
  }

  function makeClock(rng) {
    const hour = int(rng, 1, 11);
    const half = rng() < 0.5;
    const answer = `${hour}:${half ? '30' : '00'}`;
    const prompt = half
      ? `時鐘長針指向 6，短針在 ${hour} 和 ${hour % 12 + 1} 之間。現在是幾點？`
      : `時鐘長針指向 12，短針指向 ${hour}。現在是幾點？`;
    return buildQuestion('low', 'clock', prompt, answer,
      [`${hour}:${half ? '00' : '30'}`, `${hour % 12 + 1}:00`, `${hour % 12 + 1}:30`],
      half ? '長針指向 6 表示 30 分；短針走到兩個數字中間，表示前一個數字的半點。' : '長針指向 12 表示 0 分，短針指向的數字就是小時。',
      ['把長針和短針看反', '半點讀成整點'], rng);
  }

  function makeMultiplication(rng) {
    const a = int(rng, 2, 9);
    const b = int(rng, 2, 9);
    const answer = a * b;
    return buildQuestion('middle', 'multiplication', `請算：${a} × ${b} = ？`, answer,
      [a + b, answer + a, answer - b, answer + b, answer - a, answer + 1, answer - 1], `${a} 組、每組 ${b} 個，就是 ${a} × ${b} = ${answer}。`,
      ['把乘法當成加法', '九九乘法表記錯'], rng);
  }

  function makeDivision(rng) {
    const divisor = int(rng, 2, 9);
    const quotient = int(rng, 2, 12);
    const remainder = int(rng, 1, divisor - 1);
    const dividend = divisor * quotient + remainder;
    const answer = `${quotient} 餘 ${remainder}`;
    return buildQuestion('middle', 'division-remainder', `${dividend} 顆稻穀平均分給 ${divisor} 個籃子，每籃幾顆，還剩幾顆？`, answer,
      [`${quotient + 1} 餘 ${remainder}`, `${quotient} 餘 ${remainder + divisor}`, `${quotient - 1} 餘 ${remainder + divisor}`],
      `${divisor} × ${quotient} = ${divisor * quotient}，再加剩下的 ${remainder} 顆剛好是 ${dividend}；餘數要比除數小。`,
      ['餘數大於除數', '商多算或少算一個'], rng);
  }

  // 中年級兩步驟整數應用題（北園在地情境）：每題解說固定寫成「第一步：…＝X；第二步：…＝答案」，
  // 提示功能會用第一步的結果 X 判斷學生是不是「只算了第一步」。選項一律是不重複的正整數。
  function makeTwoStep(rng) {
    const kind = int(rng, 0, 3);
    let prompt;
    let answer;
    let main;
    let explanation;
    let tags;
    if (kind === 0) {
      const a = int(rng, 6, 15);
      const b = int(rng, 2, 6);
      const c = int(rng, 3, 19);
      answer = a * b + c;
      prompt = `每包稻穀 ${a} 公斤，搬了 ${b} 包後又加 ${c} 公斤，共幾公斤？`;
      main = [a * b, a * (b + c), a + b + c, a * b - c];
      explanation = `第一步：${b} 包稻穀共 ${a} × ${b} = ${a * b} 公斤；第二步：再加 ${c} 公斤，${a * b} + ${c} = ${answer} 公斤。`;
      tags = ['只算第一步', '運算順序錯', '把乘法當成加法', '加減方向看反'];
    } else if (kind === 1) {
      const a = int(rng, 6, 12);
      const b = int(rng, 3, 8);
      const c = int(rng, 2, Math.min(a * b - 1, 15));
      answer = a * b - c;
      prompt = `插秧田每行插 ${a} 株秧苗，插了 ${b} 行，被白鷺鷥踩壞 ${c} 株，還剩幾株？`;
      main = [a * b, a * b + c, a * (b - c), a + b - c];
      explanation = `第一步：${b} 行共插 ${a} × ${b} = ${a * b} 株；第二步：踩壞 ${c} 株，${a * b} − ${c} = ${answer} 株。`;
      tags = ['只算第一步', '運算順序錯', '把乘法當成加法', '加減方向看反'];
    } else if (kind === 2) {
      const a = int(rng, 12, 45);
      const b = int(rng, 2, 5);
      const total = a * b;
      const paid = (Math.floor(total / 50) + 1) * 50;
      answer = paid - total;
      prompt = `早市一把青菜 ${a} 元，阿嬤買了 ${b} 把，付 ${paid} 元，應找回幾元？`;
      main = [total, paid - a - b, paid + total, (paid - a) * b];
      explanation = `第一步：${b} 把青菜共 ${a} × ${b} = ${total} 元；第二步：付 ${paid} 元，${paid} − ${total} = ${answer} 元。`;
      tags = ['只算第一步', '把乘法當成加法', '加減方向看反', '運算順序錯'];
    } else {
      const a = int(rng, 5, 20);
      const b = int(rng, 2, 9);
      answer = a + (a + b);
      prompt = `水田左邊停了 ${a} 隻白鷺鷥，右邊比左邊多 ${b} 隻，兩邊合起來共幾隻？`;
      main = [a + b, 2 * a, a + b + b, a * b];
      explanation = `第一步：右邊有 ${a} + ${b} = ${a + b} 隻；第二步：兩邊合起來，${a} + ${a + b} = ${answer} 隻。`;
      tags = ['只算第一步', '忘記把兩邊合起來', '把多出來的數加錯', '把乘法當成加法'];
    }
    // 全部只留正整數；再補幾個「差一點」的備援選項，確保一定湊得出 4 個。
    const fallback = [answer + 10, answer - 10, answer + 1, answer - 1, answer + 2];
    const distractors = main.concat(fallback).filter((n) => Number.isInteger(n) && n > 0 && n !== answer);
    return buildQuestion('middle', 'two-step', prompt, answer, distractors, explanation, tags, rng);
  }

  function divisors(n) {
    const out = [];
    for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i);
    return out;
  }

  function makeFactorsMultiples(rng) {
    const n = int(rng, 6, 30);
    const askFactor = rng() < 0.5;
    let answer;
    let distractors;
    let prompt;
    if (askFactor) {
      const factors = divisors(n);
      answer = choice(rng, factors);
      // 每個錯誤選項都必須「不是」n 的因數，否則會出現兩個正解。
      distractors = [n + 1, Math.max(2, Math.floor(n / 2) + 1), n * 2, n - 1, n + 2, n + 3, n + 4].filter((x) => x !== answer && n % x !== 0);
      prompt = `下面哪個數是 ${n} 的因數？`;
    } else {
      const k = int(rng, 2, 9);
      answer = n * k;
      prompt = `${answer - n} 之後，${n} 的下一個倍數是幾？`;
      distractors = [answer + 1, answer - 1, answer + n, answer - n];
    }
    return buildQuestion('high', 'factors-multiples', prompt, answer, distractors,
      askFactor ? `因數要能把 ${n} 除盡，${n} ÷ ${answer} 沒有餘數。` : `倍數是 ${n} 乘上整數；${n} × ${answer / n} = ${answer}。`,
      ['把因數和倍數弄反', '忘記檢查能否整除'], rng);
  }

  function makeSameDenominator(rng) {
    const d = int(rng, 3, 12);
    let a = int(rng, 1, d - 1);
    let b = int(rng, 1, d - 1);
    const op = choice(rng, ['+', '−', 'compare']);
    if (op === 'compare') {
      while (a === b) b = int(rng, 1, d - 1);
      const sign = a === b ? '=' : a < b ? '<' : '>';
      const answer = `${a}/${d} ${sign} ${b}/${d}`;
      return buildQuestion('middle', 'same-denominator-fractions', `比較 ${a}/${d} 和 ${b}/${d}：選出正確的比較式。`, answer,
        [`${a}/${d} ${sign === '<' ? '>' : '<'} ${b}/${d}`, `${b}/${d} ${sign} ${a}/${d}`, `${a}/${d} = ${b}/${d}`],
        `分母相同，就比較分子；分子較大的分數比較大。`, ['把分母當成大小方向', '比較符號用反'], rng);
    }
    // 三、四年級課綱：同分母加減不要求約分、不出假分數。
    // 為了讓答案本身就是最簡分數（不必約分），只挑「結果分子與分母互質」的組合。
    for (let tries = 0; tries < 200; tries++) {
      if (op === '+') {
        if (a + b < d && gcd(a + b, d) === 1) break;
        a = int(rng, 1, d - 2);
        b = int(rng, 1, d - 1 - a);
      } else {
        if (a > b && gcd(a - b, d) === 1) break;
        a = int(rng, 2, d - 1);
        b = int(rng, 1, a - 1);
      }
    }
    if (op === '+' ? !(a + b < d && gcd(a + b, d) === 1) : !(a > b && gcd(a - b, d) === 1)) {
      // 保底組合：加法 1 + (d−2) = (d−1)/d、減法 2 − 1 = 1/d，兩者都必定互質。
      [a, b] = op === '+' ? [1, d - 2] : [2, 1];
    }
    const n = op === '+' ? a + b : a - b;
    const answer = `${n}/${d}`;
    const candidates = [`${n}/${d * 2}`, `${n + 1}/${d}`, `${n - 1}/${d}`, `${n + 2}/${d}`, `${d - n}/${d}`, `${n}/${d + 1}`, `${n}/${d + 2}`, `${n + 1}/${d + 1}`]
      .filter((text) => {
        const [num, den] = text.split('/').map(Number);
        return num >= 1 && num < den;
      });
    return buildQuestion('middle', 'same-denominator-fractions', `請算：${a}/${d} ${op} ${b}/${d} = ？`, answer,
      candidates,
      `分母相同時，分母保持 ${d}，只把分子${op === '+' ? '相加' : '相減'}：${a} ${op} ${b} = ${n}，答案是 ${answer}。`,
      ['分子分母一起相加', '分母也跟著運算'], rng, fractionKey);
  }

  function makeRectangle(rng) {
    const l = int(rng, 3, 18);
    const w = int(rng, 2, 12);
    const areaMode = rng() < 0.5;
    const answer = areaMode ? l * w : 2 * (l + w);
    const unit = areaMode ? '平方公分' : '公分';
    return buildQuestion('middle', 'rectangle', `長 ${l} 公分、寬 ${w} 公分的長方形，${areaMode ? '面積' : '周長'}是多少？`, `${answer} ${unit}`,
      [`${areaMode ? 2 * (l + w) : l * w} ${areaMode ? '平方公分' : '公分'}`, `${l + w} ${unit}`, `${l * w + l + w} ${unit}`, `${answer + 2} ${unit}`, `${answer + 10} ${unit}`],
      areaMode ? `面積用長 × 寬：${l} × ${w} = ${answer} 平方公分。` : `周長把四邊相加：(${l} + ${w}) × 2 = ${answer} 公分。`,
      ['面積和周長公式混淆', '忘記周長要算兩組長寬'], rng);
  }

  function makeKgGram(rng) {
    const kg = int(rng, 1, 4);
    const g = int(rng, 1, 9) * 100;
    const answer = kg * 1000 + g;
    return buildQuestion('middle', 'kg-gram', `${kg} 公斤 ${g} 公克合起來是幾公克？`, `${answer} 公克`,
      [`${kg * 100 + g} 公克`, `${kg + g} 公克`, `${kg * 1000 - g} 公克`, `${(kg + 1) * 1000 - g} 公克`, `${answer + 1000} 公克`, `${answer + 100} 公克`],
      `1 公斤是 1000 公克，所以 ${kg} 公斤有 ${kg * 1000} 公克，再加 ${g} 公克。`,
      ['把公斤當成 100 公克', '忘記換單位再相加'], rng);
  }

  function makeGcdLcm(rng) {
    const a = choice(rng, [12, 18, 20, 24, 30, 36]);
    let b = choice(rng, [15, 18, 24, 28, 30, 40]);
    while (b === a) b = choice(rng, [15, 18, 24, 28, 30, 40]);
    const common = gcd(a, b);
    const lcm = (a * b) / common;
    const askGcd = rng() < 0.5;
    const answer = askGcd ? common : lcm;
    return buildQuestion('high', 'gcd-lcm', `${a} 和 ${b} 的${askGcd ? '最大公因數' : '最小公倍數'}是幾？`, answer,
      [askGcd ? lcm : common, a + b, a * b, answer * 2, answer + 2],
      askGcd ? `同時整除 ${a} 和 ${b} 的最大數是 ${common}。` : `先找同時是兩數倍數的數；最小的一個是 ${lcm}。`,
      ['把公因數和公倍數弄混', '直接相加或相乘'], rng);
  }

  function isPrime(n) {
    if (n < 2) return false;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
    return true;
  }

  function makePrimeComposite(rng) {
    const n = choice(rng, [1, 2, 3, 4, 5, 9, 11, 15, 17, 21, 23, 27, 31, 35, 49]);
    const answer = n === 1 ? '都不是' : isPrime(n) ? '質數' : '合數';
    return buildQuestion('high', 'prime-composite', `數字 ${n} 是質數、合數，還是兩者都不是？`, answer,
      ['質數', '合數', '都不是'].filter((x) => x !== answer),
      n === 1 ? '1 只有一個因數，所以既不是質數，也不是合數。' : isPrime(n) ? `${n} 只有 1 和自己兩個因數，所以是質數。` : `${n} 除了 1 和自己，還有其他因數，所以是合數。`,
      ['把 1 當成質數', '只檢查奇偶數'], rng);
  }

  function makeUnlikeFractions(rng) {
    const pairs = [[2, 3], [3, 4], [3, 5], [4, 5], [5, 6], [4, 7], [5, 8], [7, 10]];
    const [d1, d2] = choice(rng, pairs);
    const a = int(rng, 1, d1 - 1);
    const b = int(rng, 1, d2 - 1);
    // 減法只在「被減數大於減數」時出，答案不會是 0 或負數；其餘一律出加法。
    const canSubtract = a * d2 > b * d1;
    const add = !(canSubtract && rng() >= 0.6);
    const numerator = add ? a * d2 + b * d1 : a * d2 - b * d1;
    const denominator = d1 * d2;
    const answer = fractionText(numerator, denominator);
    const badNumerator = add ? a + b : Math.abs(a - b);
    const candidates = [`${badNumerator}/${d1 + d2}`, fractionText(badNumerator, denominator), fractionText(numerator + 1, denominator), fractionText(numerator - 1, denominator), fractionText(numerator + d1, denominator), fractionText(numerator + 2, denominator), `${numerator}/${d1 + d2}`, fractionText(numerator + 3, denominator), fractionText(numerator * 2 + 1, denominator)]
      .filter((text) => text.includes('/') && !text.startsWith('0') && !text.startsWith('-'));
    return buildQuestion('high', 'unlike-fractions', `請算：${a}/${d1} ${add ? '+' : '−'} ${b}/${d2} = ？`, answer,
      candidates,
      `先通分成 ${a * d2}/${denominator} ${add ? '+' : '−'} ${b * d1}/${denominator}，再${add ? '相加' : '相減'}，必要時約分，得到 ${answer}。`,
      ['分子分母各自相加', '忘記先通分', '答案沒有約分'], rng, fractionKey);
  }

  function trimDecimal(n) {
    return Number(n.toFixed(2)).toString();
  }

  function makeDecimalMultiplication(rng) {
    const a = int(rng, 12, 95) / 10;
    const b = int(rng, 2, 9) / 10;
    const product = Number((a * b).toFixed(2));
    const answer = trimDecimal(product);
    return buildQuestion('high', 'decimal-multiplication', `請算：${a.toFixed(1)} × ${b.toFixed(1)} = ？`, answer,
      [trimDecimal(product * 10), trimDecimal(product / 10), trimDecimal(a + b), trimDecimal(product * 100), trimDecimal(product + 1)],
      `先把小數當整數算，再看兩個因數共有幾位小數；${a.toFixed(1)} × ${b.toFixed(1)} = ${answer}。`,
      ['小數點位數點錯', '把乘法當成加法'], rng);
  }

  function makePercentage(rng) {
    const pct = choice(rng, [10, 20, 25, 50, 75]);
    const whole = int(rng, 2, 20) * 100;
    const answer = (whole * pct) / 100;
    return buildQuestion('high', 'percentage', `${whole} 公斤稻穀的 ${pct}% 是幾公斤？`, `${answer} 公斤`,
      [`${whole * pct} 公斤`, `${trimDecimal(whole / pct)} 公斤`, `${whole - answer} 公斤`, `${trimDecimal(answer * 10)} 公斤`, `${trimDecimal(answer / 10)} 公斤`, `${answer + pct} 公斤`],
      `${pct}% 就是每 100 份取 ${pct} 份；${whole} × ${pct} ÷ 100 = ${answer} 公斤。`,
      ['忘記百分率要除以 100', '把剩下的量當成答案'], rng);
  }

  function makeRatio(rng) {
    const redUnit = int(rng, 2, 8);
    let blueUnit = int(rng, 2, 8);
    while (blueUnit === redUnit) blueUnit = int(rng, 2, 8);
    const scale = int(rng, 2, 5);
    const blue = blueUnit * scale;
    const answer = redUnit * scale;
    return buildQuestion('high', 'ratio', `紅、藍稻穀的數量比是 ${redUnit}：${blueUnit}，藍色有 ${blue} 把，紅色有幾把？`, answer,
      // 錯誤選項都用正整數：用「差」去比（加減思維）、直接抄藍色數量、多算份數；
      // blue − redUnit 可能是 0 或負數，所以先濾掉，再補「差一點」的備援選項。
      [blue + redUnit - blueUnit, blue, answer + blueUnit, blue - redUnit, answer + scale, answer - 1, answer + 1, answer + 2, answer + 3]
        .filter((n) => Number.isInteger(n) && n > 0 && n !== answer),
      `藍色的 ${blue} 把是 ${blueUnit} 份，每份 ${scale} 把；紅色有 ${redUnit} 份，共 ${answer} 把。`,
      ['把比例方向看反', '沒有先算每一份'], rng);
  }

  function makeSpeedTime(rng) {
    const speed = int(rng, 3, 12);
    const hours = int(rng, 2, 6);
    const distance = speed * hours;
    const askSpeed = rng() < 0.5;
    const answer = askSpeed ? speed : distance;
    const prompt = askSpeed
      ? `${distance} 公里要騎 ${hours} 小時，平均每小時騎幾公里？`
      : `腳踏車以每小時 ${speed} 公里的速度騎 ${hours} 小時，總共騎幾公里？`;
    const unit = askSpeed ? '公里／小時' : '公里';
    const distractors = askSpeed
      ? [distance, speed + hours, Math.max(1, speed - 1), speed + 1, speed + 2]
      : [speed + hours, Math.max(1, distance - speed), distance + hours, speed, distance + speed, distance + 1];
    return buildQuestion('high', 'speed-time', prompt, `${answer} ${unit}`, distractors.map((n) => `${n} ${unit}`),
      askSpeed ? `平均速率 = 距離 ÷ 時間：${distance} ÷ ${hours} = ${speed} 公里／小時。` : `距離 = 速率 × 時間：${speed} × ${hours} = ${distance} 公里。`,
      ['把距離和速率弄混', '忘記乘上或除以時間'], rng);
  }

  const GENERATORS = {
    'add-subtract': makeAddition,
    compare: makeComparison,
    'number-line': makeNumberLine,
    clock: makeClock,
    multiplication: makeMultiplication,
    'division-remainder': makeDivision,
    'two-step': makeTwoStep,
    'factors-multiples': makeFactorsMultiples,
    'same-denominator-fractions': makeSameDenominator,
    rectangle: makeRectangle,
    'kg-gram': makeKgGram,
    'gcd-lcm': makeGcdLcm,
    'prime-composite': makePrimeComposite,
    'unlike-fractions': makeUnlikeFractions,
    'decimal-multiplication': makeDecimalMultiplication,
    percentage: makePercentage,
    ratio: makeRatio,
    'speed-time': makeSpeedTime,
  };

  // 依首答表現與距離上次作答時間選題；缺少紀錄時每個題型權重相同。
  function pickTopic(band, stats, rng) {
    if (!BANDS[band]) throw new Error(`未知年級段：${band}`);
    const random = typeof rng === 'function' ? rng : Math.random;
    const rows = stats && stats.byTopic && typeof stats.byTopic === 'object' ? stats.byTopic : stats || {};
    const now = Date.now();
    const weights = BANDS[band].topics.map((topic) => {
      const row = rows[topic];
      if (!row || typeof row !== 'object') return { topic, weight: 1 };
      const questions = Math.max(0, Number(row.questions) || 0);
      const firstTryCorrect = Math.max(0, Number(row.firstTryCorrect) || 0);
      const accuracy = questions > 0 ? Math.min(1, firstTryCorrect / questions) : 0.5;
      const lastAnsweredAt = Math.max(0, Number(row.lastAnsweredAt) || 0);
      const ageDays = lastAnsweredAt > 0 ? Math.max(0, (now - lastAnsweredAt) / 86400000) : 0;
      const accuracyWeight = 1 + (1 - accuracy) * 2;
      const recencyWeight = 1 + Math.min(1.5, ageDays / 30);
      return { topic, weight: accuracyWeight * recencyWeight };
    });
    const total = weights.reduce((sum, item) => sum + item.weight, 0);
    let point = Math.min(0.999999999, Math.max(0, random())) * total;
    for (const item of weights) {
      point -= item.weight;
      if (point < 0) return item.topic;
    }
    return weights[weights.length - 1].topic;
  }

  function makeQuestion(band, rng, topic) {
    if (!BANDS[band]) throw new Error(`未知年級段：${band}`);
    const random = typeof rng === 'function' ? rng : Math.random;
    const selected = topic || choice(random, BANDS[band].topics);
    if (!BANDS[band].topics.includes(selected)) throw new Error(`題型 ${selected} 不屬於${BANDS[band].label}`);
    return GENERATORS[selected](random);
  }

  function makeHarvestRule(band, rng) {
    if (!BANDS[band]) throw new Error(`未知年級段：${band}`);
    const random = typeof rng === 'function' ? rng : Math.random;
    // 低年級只用「雙數、大於 10、5 個一數」；中年級用「偶數、3 的乘法答案、大於 40」；
    // 質數、倍數、因數是五年級才教的用語，只給高年級。每條規則可自帶 explain(n)，用該年級段學過的說法解釋。
    const ruleId = choice(random, band === 'low' ? ['evenLow', 'over10', 'multiple5'] : band === 'middle' ? ['multiple3', 'over40', 'even'] : ['prime', 'multiple7', 'factor30']);
    const rules = {
      evenLow: {
        label: '收集雙數（兩個兩個數）', test: (n) => n % 2 === 0, samples: [2, 7, 14, 21],
        explain: (n) => `${n} 不是雙數：兩個兩個數是 2、4、6……，數不到 ${n}。`,
      },
      even: {
        label: '收集偶數', test: (n) => n % 2 === 0, samples: [2, 7, 14, 21],
        explain: (n) => `${n} 不是偶數，除以 2 會有餘數。`,
      },
      over10: { label: '收集大於 10 的數', test: (n) => n > 10, samples: [8, 10, 11, 18] },
      // 原「和 4 配對等於 10」在 1～20 只有 6 符合，撿得到的機會太低；改成低年級數線常用的「5 個 5 個數」。
      multiple5: {
        label: '收集 5 個一數會數到的數（5、10、15…）', test: (n) => n % 5 === 0, samples: [5, 7, 10, 12],
        explain: (n) => `${n} 不是 5 個一數會數到的數：5、10、15……`,
      },
      // 中年級：3 的乘法答案（3 × 1 到 3 × 9），不用五年級才教的「倍數」「因數」。
      multiple3: {
        label: '收集 3 的乘法答案（3、6、9…27）', test: (n) => n % 3 === 0 && n <= 27, samples: [4, 6, 9, 14],
        explain: (n) => (n % 3 === 0 ? `${n} 超過 27 了，3 的乘法表只到 3 × 9 = 27。` : `${n} 不在 3 的乘法表裡：3、6、9……27。`),
      },
      over40: { label: '收集大於 40 的數', test: (n) => n > 40, samples: [30, 40, 41, 55] },
      prime: { label: '收集質數', test: isPrime, samples: [1, 2, 9, 13] },
      multiple7: { label: '收集 7 的倍數', test: (n) => n % 7 === 0, samples: [6, 7, 14, 20] },
      factor30: { label: '收集 30 的因數', test: (n) => n > 0 && 30 % n === 0, samples: [4, 5, 6, 11] },
    };
    const rule = rules[ruleId];
    return {
      label: rule.label,
      test: rule.test,
      explain: rule.explain || null,
      sampleNumbers: shuffle(random, rule.samples),
      pickValue(max, rng) {
        const nextRandom = typeof rng === 'function' ? rng : Math.random;
        const matching = [];
        const other = [];
        for (let n = 1; n <= max; n++) (rule.test(n) ? matching : other).push(n);
        const pool = nextRandom() < 0.6 ? matching : other;
        return choice(nextRandom, pool.length ? pool : matching.length ? matching : other);
      },
    };
  }

  function explainHarvestMismatch(rule, n) {
    if (rule.test(n)) return `${n} 符合「${rule.label}」。`;
    if (typeof rule.explain === 'function') return rule.explain(n);
    if (rule.label.includes('因數')) {
      const target = Number(rule.label.match(/收集 (\d+) 的因數/)?.[1] || 0);
      if (n === 0) return `0 不能當除數；因數要能把 ${target} 除盡。`;
      return `${n} 不是 ${target} 的因數：${target} ÷ ${n} 不能整除。`;
    }
    if (rule.label.includes('倍數')) {
      const base = Number(rule.label.match(/收集 (\d+) 的倍數/)?.[1] || 1);
      return `${n} 不是 ${base} 的倍數：${n} ÷ ${base} 不能整除。`;
    }
    if (rule.label.includes('配對')) return `${n} 加上 4 不等於 10。`;
    const threshold = rule.label.match(/收集大於 (\d+) 的數/)?.[1];
    if (threshold != null) return `${n} 沒有大於 ${threshold}。`;
    if (rule.label.includes('偶數')) return `${n} 不是偶數，除以 2 會有餘數。`;
    if (n === 1) return '1 只有一個因數，不是質數。';
    return `${n} 不是質數：它除了 1 和自己，還能被其他數整除。`;
  }

  const MathQuest = {
    BANDS,
    TOPIC_LABELS,
    TOPICS_BY_BAND: BANDS,
    createRng,
    pickTopic,
    makeQuestion,
    generateQuestion: makeQuestion,
    makeHarvestRule,
    explainHarvestMismatch,
    isPrime,
    gcd,
    fractionText,
  };

  PGS.MathQuest = MathQuest;
  if (typeof module !== 'undefined' && module.exports) module.exports = MathQuest;
})(typeof globalThis !== 'undefined' ? globalThis : window);
