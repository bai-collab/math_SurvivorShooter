// 題庫品質回歸測試：F1 修正項目（異分母減法負數、探索題單位一致、同分母不約分、
// 低年級退位／進位迷思、找零為 0 等）。每題型固定種子，各抽 2000 題以上。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const mathSandbox = { module: { exports: {} } };
vm.runInNewContext(read('../src/math-quest.js'), mathSandbox, { filename: 'src/math-quest.js' });
const mathQuest = mathSandbox.module.exports;

const windowSandbox = {};
vm.runInNewContext(read('../src/explore-quest.js'), { window: windowSandbox }, { filename: 'src/explore-quest.js' });
const explore = windowSandbox.PGS.ExploreQuest;

const SAMPLES = 2000;

function gcdOf(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

// 獨立的「數值身分」：分數約分、純數字轉數字，其餘用原文。
function valueKey(text) {
  const s = String(text).trim();
  if (/[<>=]/.test(s)) return s; // 比較式用原文比對
  let m = s.match(/^(-?\d+)\/(\d+)$/);
  if (m) {
    const g = gcdOf(Number(m[1]), Number(m[2]));
    return `${Number(m[1]) / g}/${Number(m[2]) / g}`;
  }
  m = s.match(/^(-?\d+(?:\.\d+)?)(?:\s*(?:公克|公斤|平方公分|公分|公里／小時|公里|度|元|年|隻))?$/);
  if (m) return `n:${Number(m[1])}`;
  return s;
}

function assertDistinctByValue(q, label) {
  const keys = q.choices.map(valueKey);
  assert.equal(new Set(keys).size, keys.length, `${label} 選項數值重複：${q.prompt}；${q.choices.join(' | ')}`);
}

test('異分母分數 2000 題：答案與所有選項皆為正數、無數值相等的選項，且有出減法', () => {
  const rng = mathQuest.createRng(7001);
  let subtractions = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const q = mathQuest.makeQuestion('high', rng, 'unlike-fractions');
    const m = q.prompt.match(/請算：(\d+)\/(\d+) ([+−]) (\d+)\/(\d+)/);
    const [a, d1, b, d2] = [Number(m[1]), Number(m[2]), Number(m[4]), Number(m[5])];
    if (m[3] === '−') {
      subtractions++;
      assert.ok(a * d2 > b * d1, `減法被減數必須大於減數：${q.prompt}`);
    }
    for (const choice of q.choices) {
      assert.ok(!choice.startsWith('-') && !choice.startsWith('0'), `出現負數或 0 的選項 ${choice}：${q.prompt}`);
    }
    assert.equal(q.choices.length, 4, q.prompt);
    assertDistinctByValue(q, '異分母');
  }
  assert.ok(subtractions > SAMPLES * 0.1, `減法題太少（${subtractions}），可能變成全加法`);
});

test('同分母分數加減 2000 題：分子小於分母、不為 0、答案不必約分、選項無數值相等', () => {
  const rng = mathQuest.createRng(7002);
  let checked = 0;
  for (let i = 0; i < SAMPLES * 2; i++) {
    const q = mathQuest.makeQuestion('middle', rng, 'same-denominator-fractions');
    const m = q.prompt.match(/請算：(\d+)\/(\d+) ([+−]) (\d+)\/(\d+)/);
    if (!m) continue; // 比大小題
    checked++;
    const [a, d, b] = [Number(m[1]), Number(m[2]), Number(m[4])];
    const n = m[3] === '+' ? a + b : a - b;
    assert.ok(n > 0, `答案不可為 0 或負：${q.prompt}`);
    assert.ok(n < d, `答案不可是假分數或整數：${q.prompt}`);
    if (m[3] === '−') assert.ok(a > b, `減法不可出現 a == b：${q.prompt}`);
    const answer = q.choices[q.answerIndex];
    assert.equal(answer, `${n}/${d}`, `答案應原樣寫成 n/d，不需約分：${q.prompt}`);
    assert.equal(q.choices.length, 4, q.prompt);
    assertDistinctByValue(q, '同分母');
    for (const choice of q.choices) {
      const [num, den] = choice.split('/').map(Number);
      assert.ok(num >= 1 && num < den, `選項 ${choice} 不是真分數：${q.prompt}`);
    }
    assert.ok(!q.explanation.includes('約分'), `同分母解說不應要求約分：${q.explanation}`);
  }
  assert.ok(checked > 1000, `加減題抽樣不足：${checked}`);
});

test('同分母比大小 2000 題：四個選項不重複、a 不等於 b', () => {
  const rng = mathQuest.createRng(7003);
  let checked = 0;
  for (let i = 0; i < SAMPLES * 2; i++) {
    const q = mathQuest.makeQuestion('middle', rng, 'same-denominator-fractions');
    const m = q.prompt.match(/比較 (\d+)\/(\d+) 和 (\d+)\/(\d+)/);
    if (!m) continue;
    checked++;
    assert.notEqual(m[1], m[3], q.prompt);
    assert.equal(q.choices.length, 4, q.prompt);
    assert.equal(new Set(q.choices).size, 4);
  }
  assert.ok(checked > 1000);
});

test('低年級加減 2000 題：四個不重複選項、無負數，迷思選項與解說依進位／退位分開', () => {
  const rng = mathQuest.createRng(7004);
  const seen = { borrow: 0, noBorrow: 0, carry: 0, noCarry: 0 };
  for (let i = 0; i < SAMPLES; i++) {
    const q = mathQuest.makeQuestion('low', rng, 'add-subtract');
    const m = q.prompt.match(/請算：(\d+) ([+−]) (\d+)/);
    const [a, b] = [Number(m[1]), Number(m[3])];
    const answer = q.choices[q.answerIndex];
    assert.equal(q.choices.length, 4, q.prompt);
    assert.equal(new Set(q.choices).size, 4, q.prompt);
    for (const choice of q.choices) assert.ok(Number(choice) >= 0, `${q.prompt} 出現負數選項 ${choice}`);
    const [onesA, onesB] = [a % 10, b % 10];
    const tens = (n) => Math.floor(n / 10);
    if (m[2] === '−') {
      assert.equal(Number(answer), a - b);
      if (onesA < onesB) {
        seen.borrow++;
        const bigMinusSmall = (tens(a) - tens(b)) * 10 + (onesB - onesA);
        assert.ok(q.choices.includes(String(bigMinusSmall)), `${q.prompt} 缺少「個位大減小」迷思選項 ${bigMinusSmall}；${q.choices.join(',')}`);
        assert.notEqual(bigMinusSmall, a - b);
        assert.ok(q.explanation.includes('借'), `需退位的題目解說要說明借位：${q.explanation}`);
        assert.ok(q.misconceptionTags.includes('忘記退位'));
      } else {
        seen.noBorrow++;
        assert.ok(!q.explanation.includes('借'), `不需退位的題目解說不可提到借：${q.prompt} ${q.explanation}`);
        assert.ok(!q.misconceptionTags.includes('忘記退位'));
      }
    } else {
      assert.equal(Number(answer), a + b);
      if (onesA + onesB >= 10) {
        seen.carry++;
        const noCarry = (tens(a) + tens(b)) * 10 + ((onesA + onesB) % 10);
        assert.ok(q.choices.includes(String(noCarry)), `${q.prompt} 缺少「忘記進位」迷思選項 ${noCarry}`);
        assert.ok(q.explanation.includes('進'), q.explanation);
      } else {
        seen.noCarry++;
        assert.ok(!q.explanation.includes('進'), `不需進位的題目解說不可提到進位：${q.explanation}`);
        assert.ok(!q.misconceptionTags.includes('忘記進位'));
      }
    }
  }
  for (const [kind, count] of Object.entries(seen)) assert.ok(count > 100, `${kind} 題數太少：${count}`);
});

test('各題型 2000 題：選項依數值不重複，且除比大小與質數合數外都是四個選項', () => {
  for (const [band, info] of Object.entries(mathQuest.BANDS)) {
    for (const topic of info.topics) {
      const rng = mathQuest.createRng(`quality-${band}-${topic}`);
      const expectedCount = topic === 'compare' || topic === 'prime-composite' ? 3 : 4;
      for (let i = 0; i < SAMPLES; i++) {
        const q = mathQuest.makeQuestion(band, rng, topic);
        assert.equal(q.choices.length, expectedCount, `${topic}：${q.prompt}；${q.choices.join(' | ')}`);
        assertDistinctByValue(q, topic);
        if (band === 'low') for (const choice of q.choices) assert.ok(!/^-/.test(choice), `${topic} 低年級出現負數：${choice}`);
      }
    }
  }
});

test('因數題 2000 題：錯誤選項都不是該數的因數（不會有兩個正解）', () => {
  const rng = mathQuest.createRng(7005);
  let checked = 0;
  for (let i = 0; i < SAMPLES * 2; i++) {
    // 因數與倍數依 108 課綱屬五年級，F3 已把題型移到高年級段；斷言不變。
    const q = mathQuest.makeQuestion('high', rng, 'factors-multiples');
    const m = q.prompt.match(/是 (\d+) 的因數/);
    if (!m) continue;
    checked++;
    const n = Number(m[1]);
    const factors = q.choices.filter((c) => n % Number(c) === 0);
    assert.equal(factors.length, 1, `${q.prompt} 有 ${factors.length} 個因數選項：${q.choices.join(',')}`);
  }
  assert.ok(checked > 1000);
});

test('比例題 2000 題：選項皆為正整數', () => {
  const rng = mathQuest.createRng(7006);
  for (let i = 0; i < SAMPLES; i++) {
    const q = mathQuest.makeQuestion('high', rng, 'ratio');
    for (const choice of q.choices) assert.ok(/^\d+$/.test(choice) && Number(choice) > 0, `${q.prompt} 選項 ${choice}`);
  }
});

// ---- 探索題 ----

// 把數字換成 #，用來比對選項的格式（單位、符號）是否一致。
function shape(text) {
  return String(text).replace(/\d+/g, '#');
}

function assertSameFormat(q, label) {
  if (!/\d/.test(q.answer)) return; // 答案是文字（星期、鳥名、順序）的題型不比對數字格式
  const shapes = q.choices.map(shape);
  assert.equal(new Set(shapes).size, 1, `${label} 選項格式不一致（可靠格式猜答案）：${q.prompt}；${q.choices.join(' | ')}`);
}

test('光電長條圖四題 2000 組：正解與錯誤選項單位格式一致（都帶「度」）', () => {
  let diffs = 0;
  for (const band of explore.BANDS) {
    for (let seed = 1; seed <= SAMPLES; seed++) {
      const chart = explore.generateSolarSet(band, seed);
      for (const q of chart.questions) {
        assert.equal(q.choices.length, 4);
        if (q.metric === 'difference' || q.metric === 'sum') {
          diffs++;
          for (const choice of q.choices) assert.match(choice, /^\d+ 度$/, `${q.metric} 選項缺「度」：${choice}`);
        }
        assertSameFormat(q, `solar-${q.metric}`);
      }
    }
  }
  assert.equal(diffs, 3 * SAMPLES * 2);
});

test('所有探索題型 2000 題：選項格式一致、四個不重複', () => {
  const generators = {
    array: explore.generateArrayQuestion,
    weight: explore.generateWeightQuestion,
    'water-cycle': explore.generateWaterCycleQuestion,
    volume: explore.generateVolumeQuestion,
    sequence: explore.generateSequenceQuestion,
    history: explore.generateHistoryQuestion,
    change: explore.generateChangeQuestion,
  };
  for (const band of explore.BANDS) {
    for (const [type, generate] of Object.entries(generators)) {
      for (let seed = 1; seed <= SAMPLES; seed++) {
        const q = generate(band, seed);
        assert.equal(q.choices.length, 4, `${type}/${band}/${seed}`);
        assert.equal(new Set(q.choices).size, 4, `${type}/${band}/${seed}`);
        assertSameFormat(q, type);
      }
    }
    for (let seed = 1; seed <= SAMPLES; seed++) {
      for (const q of explore.generateBirdSet(band, seed).questions) {
        assert.equal(q.choices.length, 4);
        assertSameFormat(q, 'birds');
      }
    }
  }
});

test('找零題 2000 題：付款一定大於總價，找零與所有選項都大於 0', () => {
  for (const band of explore.BANDS) {
    for (let seed = 1; seed <= SAMPLES; seed++) {
      const q = explore.generateChangeQuestion(band, seed);
      const total = q.prices[0] + q.prices[1];
      assert.ok(q.paid > total, `${band}/${seed} 付 ${q.paid} 不大於總價 ${total}`);
      assert.ok(q.change > 0 && q.paid - total === q.change);
      for (const choice of q.choices) assert.ok(Number.parseInt(choice, 10) > 0, `${band}/${seed} 選項 ${choice}`);
    }
  }
});

test('高年級數列題 2000 題：正解不會是唯一的奇數（不能靠奇偶猜）', () => {
  for (let seed = 1; seed <= SAMPLES; seed++) {
    const q = explore.generateSequenceQuestion('high', seed);
    const odd = q.choices.filter((c) => Number(c) % 2 === 1);
    assert.ok(odd.length >= 2, `seed ${seed}：${q.prompt}；${q.choices.join(',')}`);
  }
});
