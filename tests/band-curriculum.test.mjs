// F3 年級段課綱回歸測試：因數倍數只在高年級、低中年級收割規則不用超綱用語、
// 兩步驟題、比例題正整數選項、比大小只放符號與依位數的解說。固定種子，每項至少 2000 題。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const sandbox = { module: { exports: {} } };
vm.runInNewContext(readFileSync(new URL('../src/math-quest.js', import.meta.url), 'utf8'), sandbox, { filename: 'src/math-quest.js' });
const mathQuest = sandbox.module.exports;

const SAMPLES = 2000;

test('中年級題型不含因數與倍數，且該題型只在高年級', () => {
  assert.ok(!mathQuest.BANDS.middle.topics.includes('factors-multiples'));
  assert.ok(!mathQuest.BANDS.low.topics.includes('factors-multiples'));
  assert.ok(mathQuest.BANDS.high.topics.includes('factors-multiples'));
  assert.ok(mathQuest.BANDS.middle.topics.includes('two-step'));
  const rng = mathQuest.createRng('f3-middle-topics');
  for (let i = 0; i < SAMPLES; i++) {
    const q = mathQuest.makeQuestion('middle', rng);
    assert.notEqual(q.topic, 'factors-multiples');
  }
  assert.throws(() => mathQuest.makeQuestion('middle', rng, 'factors-multiples'));
});

test('中年級收割規則 2000 次：標籤與說明都不含「倍數」「因數」「整除」', () => {
  const rng = mathQuest.createRng('f3-middle-harvest');
  const seen = new Set();
  for (let i = 0; i < SAMPLES; i++) {
    const rule = mathQuest.makeHarvestRule('middle', rng);
    seen.add(rule.label);
    assert.ok(!/倍數|因數|整除/.test(rule.label), rule.label);
    for (let n = 0; n <= 60; n++) {
      const text = mathQuest.explainHarvestMismatch(rule, n);
      assert.ok(!/倍數|因數|整除/.test(text), `${rule.label}：${text}`);
    }
  }
  assert.equal(seen.size, 3, `中年級應有 3 種收割規則：${[...seen].join('、')}`);
});

test('低年級收割規則 2000 次：標籤與說明都不含「倍數」「整除」「÷」', () => {
  const rng = mathQuest.createRng('f3-low-harvest');
  const seen = new Set();
  for (let i = 0; i < SAMPLES; i++) {
    const rule = mathQuest.makeHarvestRule('low', rng);
    seen.add(rule.label);
    assert.ok(!/倍數|因數|整除|÷|餘數/.test(rule.label), rule.label);
    for (let n = 0; n <= 20; n++) {
      const text = mathQuest.explainHarvestMismatch(rule, n);
      assert.ok(!/倍數|因數|整除|÷|餘數/.test(text), `${rule.label}：${text}`);
    }
  }
  assert.equal(seen.size, 3, `低年級應有 3 種收割規則：${[...seen].join('、')}`);
});

test('中年級「3 的乘法答案」規則：只收 3 到 27 的 3 的乘法結果，範圍 1～60 內有足夠機會撿到', () => {
  const rng = mathQuest.createRng('f3-times3');
  let found = 0;
  for (let i = 0; i < SAMPLES && found < 20; i++) {
    const rule = mathQuest.makeHarvestRule('middle', rng);
    if (!rule.label.includes('3 的乘法答案')) continue;
    found++;
    const matching = [];
    for (let n = 1; n <= 60; n++) if (rule.test(n)) matching.push(n);
    assert.deepEqual(matching, [3, 6, 9, 12, 15, 18, 21, 24, 27]);
    assert.ok(rule.explain(30).includes('27'));
  }
  assert.ok(found >= 20);
});

test('兩步驟題 2000 題：4 個不重複正整數選項、正解獨立驗算、解說分兩步', () => {
  const rng = mathQuest.createRng('f3-two-step');
  const kinds = new Set();
  for (let i = 0; i < SAMPLES; i++) {
    const q = mathQuest.makeQuestion('middle', rng, 'two-step');
    assert.equal(q.choices.length, 4, q.prompt);
    assert.equal(new Set(q.choices).size, 4, `${q.prompt}：${q.choices.join(',')}`);
    for (const c of q.choices) assert.ok(/^\d+$/.test(c) && Number(c) > 0, `${q.prompt} 選項 ${c} 不是正整數`);
    assert.ok(q.explanation.includes('第一步') && q.explanation.includes('第二步'), q.explanation);
    assert.ok(!/倍數|因數|整除/.test(q.prompt + q.explanation));
    const answer = Number(q.choices[q.answerIndex]);
    let m;
    let expected;
    if ((m = q.prompt.match(/每包稻穀 (\d+) 公斤，搬了 (\d+) 包後又加 (\d+) 公斤/))) {
      kinds.add('rice');
      expected = Number(m[1]) * Number(m[2]) + Number(m[3]);
    } else if ((m = q.prompt.match(/每行插 (\d+) 株秧苗，插了 (\d+) 行，被白鷺鷥踩壞 (\d+) 株/))) {
      kinds.add('seedling');
      expected = Number(m[1]) * Number(m[2]) - Number(m[3]);
      assert.ok(expected > 0);
    } else if ((m = q.prompt.match(/一把青菜 (\d+) 元，阿嬤買了 (\d+) 把，付 (\d+) 元/))) {
      kinds.add('market');
      expected = Number(m[3]) - Number(m[1]) * Number(m[2]);
      assert.ok(expected > 0, `找零不可為 0：${q.prompt}`);
    } else if ((m = q.prompt.match(/左邊停了 (\d+) 隻白鷺鷥，右邊比左邊多 (\d+) 隻/))) {
      kinds.add('egret');
      expected = Number(m[1]) + Number(m[1]) + Number(m[2]);
    } else {
      assert.fail(`認不得的兩步驟題：${q.prompt}`);
    }
    assert.equal(answer, expected, q.prompt);
  }
  assert.equal(kinds.size, 4, `四種情境都要出現：${[...kinds].join(',')}`);
});

test('比例題 2000 題：選項皆為不重複正整數且仍有 4 個', () => {
  const rng = mathQuest.createRng('f3-ratio');
  for (let i = 0; i < SAMPLES; i++) {
    const q = mathQuest.makeQuestion('high', rng, 'ratio');
    assert.equal(q.choices.length, 4, q.prompt);
    assert.equal(new Set(q.choices).size, 4, q.prompt);
    for (const c of q.choices) assert.ok(/^\d+$/.test(c) && Number(c) > 0, `${q.prompt} 選項 ${c}`);
  }
});

test('比大小 2000 題：選項只有 < > =，正解正確，解說依位數規則', () => {
  const rng = mathQuest.createRng('f3-compare');
  const seen = { oneDigit: 0, mixed: 0, tensDiff: 0, tensSame: 0 };
  for (let i = 0; i < SAMPLES; i++) {
    const q = mathQuest.makeQuestion('low', rng, 'compare');
    assert.deepEqual([...q.choices].sort(), ['<', '=', '>']);
    const m = q.prompt.match(/哪個符號能放進 (\d+) □ (\d+)/);
    assert.ok(m, q.prompt);
    const a = Number(m[1]);
    const b = Number(m[2]);
    assert.equal(q.choices[q.answerIndex], a < b ? '<' : '>');
    const e = q.explanation;
    if (a < 10 && b < 10) {
      seen.oneDigit++;
      assert.ok(e.includes('一位數') && e.includes('直接比大小') && !e.includes('十位'), e);
    } else if (a < 10 || b < 10) {
      seen.mixed++;
      assert.ok(e.includes('兩位數比一位數大') && !e.includes('十位'), e);
    } else if (Math.floor(a / 10) !== Math.floor(b / 10)) {
      seen.tensDiff++;
      assert.ok(e.includes('先比十位'), e);
    } else {
      seen.tensSame++;
      assert.ok(e.includes('十位一樣，再比個位'), e);
    }
  }
  for (const [kind, count] of Object.entries(seen)) assert.ok(count > 0, `${kind} 沒有出現`);
});
