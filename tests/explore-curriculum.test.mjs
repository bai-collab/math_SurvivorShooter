// F4 探索小遊戲年級段課綱回歸測試：低年級不出現公升毫升、公斤公克換算、四位數與小數分數；
// 中年級數列只有加減規律（無等比、不用「倍數」標籤）；校史題各年級段答案獨立驗算。
// 固定種子 1～2000，每題型每年級段 2000 題。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');
const windowSandbox = {};
vm.runInNewContext(read('../src/explore-quest.js'), { window: windowSandbox }, { filename: 'src/explore-quest.js' });
const quest = windowSandbox.PGS.ExploreQuest;

const SAMPLES = 2000;
const FOUNDING_YEAR = 1922;

const generators = {
  array: quest.generateArrayQuestion,
  weight: quest.generateWeightQuestion,
  'water-cycle': quest.generateWaterCycleQuestion,
  volume: quest.generateVolumeQuestion,
  sequence: quest.generateSequenceQuestion,
  history: quest.generateHistoryQuestion,
  change: quest.generateChangeQuestion,
};

// 單題、鳥群、光電圖三種來源統一成題目清單。
function* questionsOf(band, seed) {
  for (const generate of Object.values(generators)) yield generate(band, seed);
  yield* quest.generateSolarSet(band, seed).questions;
  yield* quest.generateBirdSet(band, seed).questions;
}

function numbersIn(text) {
  return Array.from(String(text).matchAll(/\d+(?:\.\d+)?/g), (match) => Number(match[0]));
}

function shape(text) {
  return String(text).replace(/\d+(?:\.\d+)?/g, '#');
}

function allText(q) {
  return [q.prompt, ...q.choices, q.hint, q.explanation].join('\n');
}

test('所有探索題 × 三個年級段 × 2000 題：四個選項不重複、含正解、格式一致', () => {
  for (const band of quest.BANDS) {
    for (let seed = 1; seed <= SAMPLES; seed++) {
      for (const q of questionsOf(band, seed)) {
        const label = `${q.type}/${band}/${seed}`;
        assert.equal(q.choices.length, 4, label);
        assert.equal(new Set(q.choices).size, 4, label);
        assert.ok(q.choices.includes(q.answer), label);
        if (/\d/.test(q.answer)) {
          assert.equal(new Set(q.choices.map(shape)).size, 1, `${label} 選項格式不一致：${q.choices.join(' | ')}`);
        }
      }
    }
  }
});

test('低年級 2000 題：不出現公升、毫升、1000 公克換算、四位數、小數與分數', () => {
  for (let seed = 1; seed <= SAMPLES; seed++) {
    for (const q of questionsOf('low', seed)) {
      const text = allText(q);
      const label = `${q.type}/low/${seed}：${q.prompt}`;
      assert.ok(!/公升|毫升|1000 公克|公克/.test(text), label);
      assert.ok(!/\d\.\d|分之|\d\/\d/.test(text), label);
      for (const n of numbersIn(text)) assert.ok(n < 1000, `${label} 出現 ${n}`);
      // 低年級加減乘除的數字都在 99 以內（題目與選項）。
      for (const n of numbersIn([q.prompt, ...q.choices].join(' '))) assert.ok(n <= 99, `${label} 出現 ${n}`);
    }
  }
});

test('低年級重量題：只用同一單位的二位數加減，答案與選項都帶「公斤」', () => {
  const operations = new Set();
  for (let seed = 1; seed <= SAMPLES; seed++) {
    const q = quest.generateWeightQuestion('low', seed);
    let expected;
    let m = q.prompt.match(/一袋 (\d+) 公斤、一袋 (\d+) 公斤/);
    if (m) {
      operations.add('add');
      expected = Number(m[1]) + Number(m[2]);
    } else {
      m = q.prompt.match(/有 (\d+) 公斤稻穀，裝走 (\d+) 公斤/);
      assert.ok(m, q.prompt);
      operations.add('subtract');
      expected = Number(m[1]) - Number(m[2]);
      assert.ok(expected > 0);
    }
    assert.equal(q.answer, `${expected} 公斤`, q.prompt);
    for (const choice of q.choices) assert.match(choice, /^\d+ 公斤$/);
  }
  assert.deepEqual([...operations].sort(), ['add', 'subtract']);
});

test('中年級重量題仍有公斤公克換算，並可用題目數字獨立驗算', () => {
  for (let seed = 1; seed <= SAMPLES; seed++) {
    const q = quest.generateWeightQuestion('middle', seed);
    const total = Array.from(q.prompt.matchAll(/(\d+) 公斤 (\d+) 公克/g), (m) => Number(m[1]) * 1000 + Number(m[2]))
      .reduce((sum, n) => sum + n, 0);
    assert.equal(q.answer, `${total} 公克`, q.prompt);
  }
});

test('低年級容量題：只用杯、瓶的非標準單位，並可用題目數字獨立驗算', () => {
  const kinds = new Set();
  for (let seed = 1; seed <= SAMPLES; seed++) {
    const q = quest.generateVolumeQuestion('low', seed);
    let expected;
    let m = q.prompt.match(/要裝 (\d+) 杯水，已經倒了 (\d+) 杯/);
    if (m) {
      kinds.add('remaining');
      expected = Number(m[1]) - Number(m[2]);
    } else if ((m = q.prompt.match(/倒滿 (\d+) 小杯。倒了 (\d+) 大瓶/))) {
      kinds.add('bottle');
      expected = Number(m[1]) * Number(m[2]);
    } else {
      m = q.prompt.match(/可以裝 (\d+) 杯水，大水桶可以裝 (\d+) 杯水/);
      assert.ok(m, q.prompt);
      kinds.add('total');
      expected = Number(m[1]) + Number(m[2]);
    }
    assert.ok(expected > 0);
    assert.equal(q.answer, `${expected} 杯`, q.prompt);
    for (const choice of q.choices) assert.match(choice, /^\d+ 杯$/);
  }
  assert.deepEqual([...kinds].sort(), ['bottle', 'remaining', 'total']);
});

test('中高年級容量題：只有正解組合剛好達到目標，高年級有小數公升', () => {
  function milliliters(text) {
    let total = 0;
    for (const m of text.matchAll(/(\d+) 個 1 公升瓶/g)) total += Number(m[1]) * 1000;
    for (const m of text.matchAll(/(\d+) 杯 250 毫升量杯/g)) total += Number(m[1]) * 250;
    return total;
  }
  let decimalSeen = 0;
  for (const band of ['middle', 'high']) {
    for (let seed = 1; seed <= SAMPLES; seed++) {
      const q = quest.generateVolumeQuestion(band, seed);
      let target;
      const decimal = q.prompt.match(/裝到 (\d+\.\d+) 公升/);
      if (decimal) {
        assert.equal(band, 'high');
        decimalSeen++;
        target = Math.round(Number(decimal[1]) * 1000);
      } else {
        const mixed = q.prompt.match(/裝到 (?:(\d+) 公升)?\s*(?:(\d+) 毫升)?。/);
        target = Number(mixed[1] || 0) * 1000 + Number(mixed[2] || 0);
      }
      assert.equal(milliliters(q.answer), target, q.prompt);
      const matching = q.choices.filter((choice) => milliliters(choice) === target);
      assert.deepEqual(Array.from(matching), [q.answer], `${band}/${seed} 不只一個組合達到目標：${q.prompt}`);
    }
  }
  assert.ok(decimalSeen > 200, `高年級小數公升題太少：${decimalSeen}`);
});

test('數列：低年級等差；中年級只有加減規律，沒有等比也不用「倍數」標籤', () => {
  const middleLabels = new Set();
  for (let seed = 1; seed <= SAMPLES; seed++) {
    const low = quest.generateSequenceQuestion('low', seed);
    const lowDiffs = low.values.slice(1).map((v, i) => v - low.values[i]);
    assert.ok(lowDiffs.every((d) => d === lowDiffs[0] && d > 0));
    assert.equal(low.next, low.values[3] + lowDiffs[0]);

    const q = quest.generateSequenceQuestion('middle', seed);
    middleLabels.add(q.ruleLabel);
    assert.ok(!/倍數/.test(allText(q)) && !/倍數/.test(q.ruleLabel), q.prompt);
    assert.ok(!/乘 \d/.test(q.rule), q.rule);
    assert.notEqual(q.ruleLabel, '等比');
    const values = Array.from(q.values);
    const diffs = values.slice(1).map((v, i) => v - values[i]);
    // 差不是固定就是「兩種差輪流」；下一項要照同一個差的節奏。
    assert.ok(diffs.every((d, i) => i < 2 || d === diffs[i - 2]), `${values}`);
    assert.equal(q.next, values[values.length - 1] + diffs[diffs.length - 2], `${values}`);
    assert.equal(q.answer, String(q.next));
    const ratios = values.slice(1).map((v, i) => v / values[i]);
    assert.ok(!ratios.every((r) => r === ratios[0]), `不得是等比：${values}`);
    assert.ok(values.every((v) => v > 0) && q.next > 0);
  }
  assert.deepEqual([...middleLabels].sort(), ['乘法表的一列', '等差', '輪流相加'].sort());
});

test('高年級數列：質數或等比，下一項可獨立驗算', () => {
  const isPrime = (n) => {
    if (n < 2) return false;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
    return true;
  };
  const labels = new Set();
  for (let seed = 1; seed <= SAMPLES; seed++) {
    const q = quest.generateSequenceQuestion('high', seed);
    labels.add(q.ruleLabel);
    const values = Array.from(q.values);
    if (q.ruleLabel === '質數') {
      assert.ok(values.every(isPrime) && isPrime(q.next));
      let between = 0;
      for (let n = values[3] + 1; n < q.next; n++) if (isPrime(n)) between++;
      assert.equal(between, 0, '下一項必須是下一個質數');
    } else {
      assert.equal(q.ruleLabel, '等比');
      const ratio = values[1] / values[0];
      assert.ok(Number.isInteger(ratio) && ratio >= 2);
      assert.ok(values.every((v, i) => i === 0 || v === values[i - 1] * ratio));
      assert.equal(q.next, values[3] * ratio);
    }
    assert.equal(q.answer, String(q.next));
  }
  assert.deepEqual([...labels].sort(), ['質數', '等比'].sort());
});

test('校史題：各年級段答案都用題目數字（或 1922）獨立驗算', () => {
  const lowKinds = new Set();
  for (let seed = 1; seed <= SAMPLES; seed++) {
    const low = quest.generateHistoryQuestion('low', seed);
    let m = low.prompt.match(/今年 (\d+) 歲。再過 (\d+) 年/);
    let expected;
    if (m) {
      lowKinds.add('later');
      expected = Number(m[1]) + Number(m[2]);
    } else {
      m = low.prompt.match(/今年 (\d+) 歲。(\d+) 年前/);
      assert.ok(m, low.prompt);
      lowKinds.add('earlier');
      expected = Number(m[1]) - Number(m[2]);
    }
    assert.ok(expected > 0 && expected <= 99);
    assert.equal(low.answer, `${expected} 歲`, low.prompt);
    assert.ok(!/1922/.test(allText(low)), '低年級不放四位數年份');

    const middle = quest.generateHistoryQuestion('middle', seed);
    m = middle.prompt.match(/1922 年創校，到 (\d+) 年經過幾年/);
    assert.ok(m, middle.prompt);
    assert.equal(middle.answer, `${Number(m[1]) - FOUNDING_YEAR} 年`, middle.prompt);
    assert.ok(Number(m[1]) <= 2026, '「今年」固定 2026，不讀電腦時間');

    const high = quest.generateHistoryQuestion('high', seed);
    m = high.prompt.match(/1922 年創校，(\d+) 週年是哪一年/);
    assert.ok(m, high.prompt);
    assert.equal(high.answer, `${FOUNDING_YEAR + Number(m[1])} 年`, high.prompt);
  }
  assert.deepEqual([...lowKinds].sort(), ['earlier', 'later']);
});

test('探索題不依賴電腦時間：同一種子、同一年級段出同一題', () => {
  for (const band of quest.BANDS) {
    for (const generate of Object.values(generators)) {
      for (let seed = 1; seed <= 50; seed++) {
        assert.deepEqual(JSON.parse(JSON.stringify(generate(band, seed))), JSON.parse(JSON.stringify(generate(band, seed))));
      }
    }
  }
});
