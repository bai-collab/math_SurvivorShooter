import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/math-quest.js', import.meta.url), 'utf8');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(source, sandbox, { filename: 'src/math-quest.js' });
const mathQuest = sandbox.module.exports;

function numberFrom(text) {
  const match = String(text).replaceAll(',', '').match(/-?\d+(?:\.\d+)?/);
  assert.ok(match, `找不到數字：${text}`);
  return Number(match[0]);
}

function reducedFraction(n, d) {
  if (n === 0) return '0';
  let a = Math.abs(n);
  let b = Math.abs(d);
  while (b) [a, b] = [b, a % b];
  const divisor = a || 1;
  const sign = n < 0 ? '-' : '';
  n = Math.abs(n) / divisor;
  d = Math.abs(d) / divisor;
  return d === 1 ? `${sign}${n}` : `${sign}${n}/${d}`;
}

function independentPrime(n) {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

function expectedFor(q) {
  const answer = q.choices[q.answerIndex];
  let m;
  // F3 新增分支：比大小的選項改成只放符號（<、>、=），在進入原本的 switch 前先獨立驗算。
  if (q.topic === 'compare' && /^[<>=]$/.test(answer)) {
    m = q.prompt.match(/(\d+) □ (\d+)/);
    const a = Number(m[1]);
    const b = Number(m[2]);
    return answer === (a < b ? '<' : a > b ? '>' : '=');
  }
  switch (q.topic) {
    case 'add-subtract': {
      m = q.prompt.match(/請算：(\d+) ([+−]) (\d+)/);
      const a = Number(m[1]);
      const b = Number(m[3]);
      return numberFrom(answer) === (m[2] === '+' ? a + b : a - b);
    }
    case 'compare': {
      m = q.prompt.match(/(\d+) □ (\d+)/);
      const a = Number(m[1]);
      const b = Number(m[2]);
      return answer === `${a} ${a < b ? '<' : '>'} ${b}`;
    }
    case 'number-line': {
      m = q.prompt.match(/跳 (\d+) 格：(\d+)、(\d+)、/);
      return numberFrom(answer) === Number(m[3]) + Number(m[1]);
    }
    case 'clock': {
      m = q.prompt.match(/短針(?:在 (\d+) 和 \d+ 之間|指向 (\d+))/);
      const hour = Number(m[1] || m[2]);
      const minute = q.prompt.includes('長針指向 6') ? '30' : '00';
      return answer === `${hour}:${minute}`;
    }
    case 'multiplication': {
      m = q.prompt.match(/(\d+) × (\d+)/);
      return numberFrom(answer) === Number(m[1]) * Number(m[2]);
    }
    case 'division-remainder': {
      m = q.prompt.match(/(\d+) 顆稻穀平均分給 (\d+)/);
      const dividend = Number(m[1]);
      const divisor = Number(m[2]);
      return answer === `${Math.floor(dividend / divisor)} 餘 ${dividend % divisor}`;
    }
    case 'two-step': {
      // F3 新增：兩步驟應用題的獨立驗算（依題幹數字各自重算一遍）。
      if ((m = q.prompt.match(/每包稻穀 (\d+) 公斤，搬了 (\d+) 包後又加 (\d+) 公斤/))) {
        return numberFrom(answer) === Number(m[1]) * Number(m[2]) + Number(m[3]);
      }
      if ((m = q.prompt.match(/每行插 (\d+) 株秧苗，插了 (\d+) 行，被白鷺鷥踩壞 (\d+) 株/))) {
        return numberFrom(answer) === Number(m[1]) * Number(m[2]) - Number(m[3]);
      }
      if ((m = q.prompt.match(/一把青菜 (\d+) 元，阿嬤買了 (\d+) 把，付 (\d+) 元/))) {
        return numberFrom(answer) === Number(m[3]) - Number(m[1]) * Number(m[2]);
      }
      if ((m = q.prompt.match(/左邊停了 (\d+) 隻白鷺鷥，右邊比左邊多 (\d+) 隻/))) {
        return numberFrom(answer) === Number(m[1]) + (Number(m[1]) + Number(m[2]));
      }
      return false;
    }
    case 'factors-multiples': {
      m = q.prompt.match(/是 (\d+) 的因數/);
      if (m) return Number(m[1]) % numberFrom(answer) === 0;
      m = q.prompt.match(/(\d+) 之後，(\d+) 的下一個倍數/);
      return numberFrom(answer) === Number(m[1]) + Number(m[2]);
    }
    case 'same-denominator-fractions': {
      if (q.prompt.startsWith('比較')) {
        m = q.prompt.match(/比較 (\d+)\/(\d+) 和 (\d+)\/(\d+)/);
        const a = Number(m[1]);
        const d = Number(m[2]);
        const b = Number(m[3]);
        const sign = a === b ? '=' : a < b ? '<' : '>';
        return answer === `${a}/${d} ${sign} ${b}/${d}`;
      }
      m = q.prompt.match(/請算：(\d+)\/(\d+) ([+−]) (\d+)\/(\d+)/);
      const a = Number(m[1]);
      const d = Number(m[2]);
      const b = Number(m[4]);
      return answer === reducedFraction(m[3] === '+' ? a + b : a - b, d);
    }
    case 'rectangle': {
      m = q.prompt.match(/長 (\d+) 公分、寬 (\d+) 公分的長方形，(面積|周長)/);
      const l = Number(m[1]);
      const w = Number(m[2]);
      const result = m[3] === '面積' ? l * w : 2 * (l + w);
      return answer === `${result} ${m[3] === '面積' ? '平方公分' : '公分'}`;
    }
    case 'kg-gram': {
      m = q.prompt.match(/(\d+) 公斤 (\d+) 公克/);
      return answer === `${Number(m[1]) * 1000 + Number(m[2])} 公克`;
    }
    case 'gcd-lcm': {
      m = q.prompt.match(/(\d+) 和 (\d+) 的(最大公因數|最小公倍數)/);
      const a = Number(m[1]);
      const b = Number(m[2]);
      let x = a;
      let y = b;
      while (y) [x, y] = [y, x % y];
      const result = m[3] === '最大公因數' ? x : (a * b) / x;
      return numberFrom(answer) === result;
    }
    case 'prime-composite': {
      m = q.prompt.match(/數字 (\d+)/);
      const n = Number(m[1]);
      const expected = n === 1 ? '都不是' : independentPrime(n) ? '質數' : '合數';
      return answer === expected;
    }
    case 'unlike-fractions': {
      m = q.prompt.match(/請算：(\d+)\/(\d+) ([+−]) (\d+)\/(\d+)/);
      const a = Number(m[1]);
      const d1 = Number(m[2]);
      const b = Number(m[4]);
      const d2 = Number(m[5]);
      const n = m[3] === '+' ? a * d2 + b * d1 : a * d2 - b * d1;
      return answer === reducedFraction(n, d1 * d2);
    }
    case 'decimal-multiplication': {
      m = q.prompt.match(/(\d+\.\d+) × (\d+\.\d+)/);
      const result = Number((Number(m[1]) * Number(m[2])).toFixed(2));
      return Number(answer) === result;
    }
    case 'percentage': {
      m = q.prompt.match(/(\d+) 公斤稻穀的 (\d+)%/);
      return answer === `${(Number(m[1]) * Number(m[2])) / 100} 公斤`;
    }
    case 'ratio': {
      m = q.prompt.match(/數量比是 (\d+)：(\d+)，藍色有 (\d+)/);
      return numberFrom(answer) === (Number(m[3]) * Number(m[1])) / Number(m[2]);
    }
    case 'speed-time': {
      m = q.prompt.match(/^(\d+) 公里要騎 (\d+) 小時/);
      if (m) return answer === `${Number(m[1]) / Number(m[2])} 公里／小時`;
      m = q.prompt.match(/每小時 (\d+) 公里.*?騎 (\d+) 小時/);
      return answer === `${Number(m[1]) * Number(m[2])} 公里`;
    }
    default:
      assert.fail(`沒有獨立驗算器：${q.topic}`);
  }
}

test('固定種子會重現相同題目', () => {
  const a = mathQuest.makeQuestion('middle', mathQuest.createRng(20261118), 'division-remainder');
  const b = mathQuest.makeQuestion('middle', mathQuest.createRng(20261118), 'division-remainder');
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
});

for (const [band, bandInfo] of Object.entries(mathQuest.BANDS)) {
  for (const topic of bandInfo.topics) {
    test(`${band} 年級段「${topic}」300 題選項與答案可獨立驗算`, () => {
      const rng = mathQuest.createRng(20261118 + bandInfo.topics.indexOf(topic) * 37);
      for (let i = 0; i < 300; i++) {
        const q = mathQuest.makeQuestion(band, rng, topic);
        assert.equal(q.band, band);
        assert.equal(q.topic, topic);
        assert.equal(q.topicLabel, mathQuest.TOPIC_LABELS[topic]);
        assert.ok(q.choices.length >= 3 && q.choices.length <= 4);
        assert.equal(new Set(q.choices).size, q.choices.length);
        assert.ok(q.answerIndex >= 0 && q.answerIndex < q.choices.length);
        assert.equal(q.choices.filter((choice) => choice === q.choices[q.answerIndex]).length, 1);
        assert.ok(q.explanation.trim().length > 0);
        assert.ok(Array.isArray(q.misconceptionTags) && q.misconceptionTags.length > 0);
        assert.equal(expectedFor(q), true, `${q.prompt}；選項：${q.choices[q.answerIndex]}`);
        if (band === 'low') {
          for (const value of q.choices) {
            const numeric = String(value).match(/^-?\d+(?:\.\d+)?/);
            if (numeric) assert.ok(Number(numeric[0]) >= 0, `${q.prompt} 出現負數選項 ${value}`);
          }
        }
      }
    });
  }
}

function independentlyCheckRule(label, n) {
  if (label.includes('偶數')) return n % 2 === 0;
  const threshold = label.match(/收集大於 (\d+) 的數/);
  if (threshold) return n > Number(threshold[1]);
  if (label.includes('配對')) return n + 4 === 10;
  // F3 新增：低、中年級改用不含「倍數／因數」的收割規則標籤。
  if (label.includes('雙數')) return n % 2 === 0;
  if (label.includes('5 個一數')) return n % 5 === 0;
  if (label.includes('3 的乘法答案')) return n % 3 === 0 && n <= 27;
  if (label.includes('倍數')) {
    const base = Number(label.match(/收集 (\d+) 的倍數/)[1]);
    return n % base === 0;
  }
  if (label.includes('因數')) {
    const base = Number(label.match(/收集 (\d+) 的因數/)[1]);
    return n > 0 && base % n === 0;
  }
  if (label.includes('質數')) return independentPrime(n);
  assert.fail(`無法獨立驗算收割規則：${label}`);
}

for (const band of Object.keys(mathQuest.BANDS)) {
  test(`${band} 年級段收割規則樣本與判斷一致`, () => {
    const rng = mathQuest.createRng(`harvest-${band}-20261118`);
    for (let i = 0; i < 90; i++) {
      const rule = mathQuest.makeHarvestRule(band, rng);
      assert.ok(rule.label);
      assert.ok(rule.sampleNumbers.length >= 2);
      assert.ok(rule.sampleNumbers.some((n) => rule.test(n)));
      assert.ok(rule.sampleNumbers.some((n) => !rule.test(n)));
      for (const n of rule.sampleNumbers) assert.equal(rule.test(n), independentlyCheckRule(rule.label, n));

      const max = band === 'low' ? 20 : band === 'middle' ? 60 : 99;
      const picker = mathQuest.createRng(`picker-${band}-${i}`);
      const values = Array.from({ length: 200 }, () => rule.pickValue(max, picker));
      assert.ok(values.every((n) => Number.isInteger(n) && n >= 1 && n <= max), `${rule.label} 必須產生範圍內的正整數`);
      assert.ok(values.filter((n) => rule.test(n)).length >= 70, `${rule.label} 要有足夠合規數字，讓限時任務可完成`);
    }
  });
}
