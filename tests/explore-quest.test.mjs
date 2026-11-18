import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');
const windowSandbox = {};
vm.runInNewContext(read('../src/beishewei-map-data.js'), { window: windowSandbox }, { filename: 'src/beishewei-map-data.js' });
vm.runInNewContext(read('../src/explore-quest.js'), { window: windowSandbox }, { filename: 'src/explore-quest.js' });
vm.runInNewContext(read('../src/explore.js'), { window: windowSandbox }, { filename: 'src/explore.js' });
vm.runInNewContext(read('../src/weapons.js'), { window: windowSandbox }, { filename: 'src/weapons.js' });
vm.runInNewContext(read('../src/runes.js'), { window: windowSandbox }, { filename: 'src/runes.js' });

const quest = windowSandbox.PGS.ExploreQuest;
const locations = Array.from(windowSandbox.PGS.CommunityExplore.LOCATIONS);
const locationById = new Map(locations.map((location) => [location.id, location]));
const newLocationIds = [
  'one_mu_field', 'rice_drying_yard', 'water_recycling_center', 'solar_roof',
  'rainbow_stairs', 'egret_rice_field', 'school_history_wall',
];

function assertQuestion(question) {
  const choices = Array.from(question.choices);
  assert.equal(choices.length, 4, `${question.type} must have four answer choices`);
  assert.equal(new Set(choices).size, 4, `${question.type} choices must be unique`);
  assert.ok(choices.includes(question.answer), `${question.type} answer must be selectable`);
  assert.ok(question.prompt && question.hint && question.explanation, `${question.type} needs a prompt, hint, and explanation`);
}

test('18 個探索據點都有圖鑑內容，7 個新據點使用指定獎勵與小遊戲', () => {
  assert.equal(locations.length, 18);
  assert.equal(new Set(locations.map((location) => location.id)).size, 18);
  for (const location of locations) {
    assert.ok(location.atlasIcon, `${location.id} needs a program-drawn icon kind`);
    assert.ok(location.atlasKnowledge, `${location.id} needs a local knowledge note`);
    assert.ok(location.mathConcept, `${location.id} needs a math concept`);
  }
  const expected = {
    one_mu_field: ['array', ['fraction_splitter', 'rice']],
    rice_drying_yard: ['weight', ['firecracker_launcher']],
    water_recycling_center: ['water', ['canal_water_cannon', 'water']],
    solar_roof: ['solar', ['solar_laser', 'solar']],
    rainbow_stairs: ['sequence', ['prime_rifle']],
    egret_rice_field: ['birds', ['egret_homing_bow']],
    school_history_wall: ['history', []],
  };
  for (const [id, [minigame, rewards]] of Object.entries(expected)) {
    const location = locationById.get(id);
    assert.ok(location, `missing new location ${id}`);
    assert.equal(location.minigame, minigame);
    assert.deepEqual(Array.from(location.rewards, (reward) => reward.id), rewards);
    if (id === 'school_history_wall') assert.equal(location.supplyType, 'op_card');
    for (const reward of location.rewards) {
      const definition = reward.type === 'weapon'
        ? windowSandbox.PGS.Weapons.DEFS[reward.id]
        : windowSandbox.PGS.Runes.DEFS[reward.id];
      assert.ok(definition.unlockHint.includes(location.name), `${reward.id} hint should name ${location.name}`);
    }
  }
});

test('各年級段的探索題都有正確答案、四個不同選項與可核對解說', () => {
  const bands = ['low', 'middle', 'high'];
  for (const band of bands) {
    for (let seed = 1; seed <= 100; seed++) {
      const array = quest.generateArrayQuestion(band, seed);
      assertQuestion(array);
      assert.ok(array.rows > 1 && array.columns > 1, 'array answers must form a non-trivial rectangle');
      assert.equal(array.rows * array.columns, array.count);

      const weight = quest.generateWeightQuestion(band, seed);
      assertQuestion(weight);
      if (band === 'low') {
        // 低年級只用同一單位（公斤）的二位數加減，不做公斤公克換算。
        assert.equal(weight.total, weight.operation === 'add' ? weight.a + weight.b : weight.a - weight.b);
        assert.equal(weight.answer, `${weight.total} 公斤`);
      } else {
        const totalGrams = weight.parts.reduce((sum, part) => sum + part.kg * 1000 + part.g, 0);
        assert.equal(totalGrams, weight.totalGrams);
        assert.equal(weight.answer, `${totalGrams} 公克`);
      }

      const cycle = quest.generateWaterCycleQuestion(band, seed);
      assertQuestion(cycle);
      assert.equal(cycle.answer, Array.from(cycle.correctOrder).join(' → '));

      const volume = quest.generateVolumeQuestion(band, seed);
      assertQuestion(volume);
      if (band === 'low') {
        // 低年級用「杯」「瓶」非標準單位，沒有毫升與公升。
        assert.equal(volume.answer, `${volume.targetCups} 杯`);
      } else {
        assert.equal(volume.answerParts.reduce((sum, part) => sum + part, 0), volume.targetMl);
        assert.ok(Array.from(volume.availableVessels).includes(1000));
      }

      const sequence = quest.generateSequenceQuestion(band, seed);
      assertQuestion(sequence);
      assert.equal(Number(sequence.answer), sequence.next);
      if (band === 'low') {
        assert.equal(sequence.values[1] - sequence.values[0], sequence.values[2] - sequence.values[1]);
      } else if (band === 'middle') {
        // 中年級只有加減規律（差固定，或兩種差輪流），沒有等比。
        const diffs = sequence.values.slice(1).map((value, i) => value - sequence.values[i]);
        assert.ok(diffs.every((d, i) => i < 2 || d === diffs[i - 2]));
      } else if (sequence.ruleLabel === '等比') {
        assert.equal(sequence.values[1] / sequence.values[0], sequence.values[2] / sequence.values[1]);
      } else {
        assert.ok(sequence.values.every((value) => {
          for (let divisor = 2; divisor * divisor <= value; divisor++) if (value % divisor === 0) return false;
          return value > 1;
        }));
      }

      const history = quest.generateHistoryQuestion(band, seed);
      assertQuestion(history);
      assert.equal(history.foundingYear, 1922);
      if (band === 'low') assert.equal(Number(history.answer.match(/\d+/)[0]), history.result);
      else if (band === 'middle') assert.equal(Number(history.answer.match(/\d+/)[0]), history.elapsed);
      else assert.equal(Number(history.answer.match(/\d+/)[0]), history.answerYear);

      const change = quest.generateChangeQuestion(band, seed);
      assertQuestion(change);
      assert.equal(change.paid - change.prices[0] - change.prices[1], change.change);
      assert.equal(change.answer, `${change.change} 元`);
    }
  }
});

test('光電長條圖四題的最高、最低、差距與總和都能從圖表數值驗算', () => {
  for (const band of ['low', 'middle', 'high']) {
    for (let seed = 1; seed <= 80; seed++) {
      const chart = quest.generateSolarSet(band, seed);
      const values = Array.from(chart.values);
      const questions = Array.from(chart.questions);
      const high = values.reduce((a, b) => a.value > b.value ? a : b);
      const low = values.reduce((a, b) => a.value < b.value ? a : b);
      const total = values.reduce((sum, item) => sum + item.value, 0);
      assert.equal(questions.length, 4);
      for (const question of questions) assertQuestion(question);
      assert.equal(questions.find((question) => question.metric === 'maximum').answer, high.day);
      assert.equal(questions.find((question) => question.metric === 'minimum').answer, low.day);
      assert.equal(questions.find((question) => question.metric === 'difference').answer, `${high.value - low.value} 度`);
      assert.equal(questions.find((question) => question.metric === 'sum').answer, `${total} 度`);
      assert.equal(new Set(values.map((item) => item.value)).size, values.length);
    }
  }
});

test('白鷺觀察統計題與短暫鳥群畫面數量相符', () => {
  for (const band of ['low', 'middle', 'high']) {
    for (let seed = 1; seed <= 80; seed++) {
      const birds = quest.generateBirdSet(band, seed);
      const rows = Array.from(birds.rows);
      const sightings = Array.from(birds.sightings);
      const questions = Array.from(birds.questions);
      assert.equal(sightings.length, rows.reduce((sum, row) => sum + row.count, 0));
      for (const row of rows) {
        assert.equal(sightings.filter((bird) => bird.birdId === row.id).length, row.count);
      }
      for (const question of questions) assertQuestion(question);
      for (const question of questions.slice(0, 3)) {
        assert.equal(question.answer, `${rows.find((row) => row.id === question.birdId).count} 隻`);
      }
      const mostCommon = rows.reduce((a, b) => a.count > b.count ? a : b);
      assert.equal(questions[3].answer, mostCommon.name);
    }
  }
});

test('新探索題共用兩次錯答後顯示解法、可重試並支援鍵盤數字鍵', () => {
  const source = read('../src/explore.js');
  assert.match(source, /if \(mistakes === 1\)[\s\S]*question\.hint/);
  assert.match(source, /question\.explanation/);
  assert.match(source, /看懂了，再試一次/);
  assert.match(source, /Digit\[1-4\]/);
  for (const method of ['runArrayGame', 'runWeightGame', 'runWaterGame', 'runSolarGame', 'runSequenceGame', 'runBirdGame', 'runHistoryGame']) {
    assert.match(source, new RegExp(`${method}\\([\\s\\S]*?runQuestionSeries`));
  }
  assert.match(source, /this\.drawSolarChart\(visual, canvas, chart\.values\)/);
});

test('新據點使用建築碰撞規則可通行，且從探索起點可走到各據點', () => {
  const map = windowSandbox.PGS.BeisheweiMapData;
  const colliders = quest.prepareBuildingColliders(map.buildings);
  const newLocations = newLocationIds.map((id) => locationById.get(id));
  for (const location of newLocations) {
    assert.equal(quest.isBlocked(location.x, location.y, colliders), false, `${location.name} is inside a building collider`);
  }

  const width = map.w;
  const height = 350;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const start = 167 * width + 151;
  assert.equal(quest.isBlocked(151, 167, colliders), false, 'explore spawn must be walkable');
  visited[start] = 1;
  queue[tail++] = start;
  while (head < tail) {
    const current = queue[head++];
    const x = current % width;
    const y = Math.floor(current / width);
    for (const [nextX, nextY] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nextX < 14 || nextX > width - 14 || nextY < 16 || nextY > height - 14) continue;
      const next = nextY * width + nextX;
      if (visited[next] || quest.isBlocked(nextX, nextY, colliders)) continue;
      visited[next] = 1;
      queue[tail++] = next;
    }
  }
  for (const location of newLocations) {
    assert.equal(visited[location.y * width + location.x], 1, `${location.name} should be reachable from the spawn`);
  }
  assert.match(read('../src/explore.js'), /PGS\.ExploreQuest\.isBlocked\(x, y, this\.buildingColliders, 3\)/);
});

test('收集 6、12、18 張圖鑑時各發一次獎勵，稱號保存在存檔', () => {
  const Explorer = windowSandbox.PGS.CommunityExplore;
  const explorer = Object.create(Explorer.prototype);
  let saves = 0;
  const game = {
    save: { gold: 0, communityAtlas: { collected: [], rewardsClaimed: [], title: '' } },
    persistSave() { saves++; },
    grantExploreSupply() { return { gear: { name: '測試裝備' } }; },
  };
  explorer.game = game;
  explorer.ui = { renderMenu() {} };
  for (const location of locations) explorer.collectAtlasCard(location);
  const atlas = game.save.communityAtlas;
  assert.equal(atlas.collected.length, 18);
  assert.deepEqual(Array.from(atlas.rewardsClaimed), ['6', '12', '18']);
  assert.equal(game.save.gold, 150);
  assert.equal(atlas.title, '北社尾探索達人');
  const beforeRepeat = saves;
  const repeat = explorer.collectAtlasCard(locations[0]);
  assert.equal(repeat.isNew, false);
  assert.equal(saves, beforeRepeat);
  assert.equal(game.save.gold, 150);
});

test('網頁依序載入探索題庫，圖鑑按鈕與畫面控制項都有 DOM 對應', () => {
  const html = read('../index.html');
  const scripts = Array.from(html.matchAll(/src="([^"]+\.js)"/g), (match) => match[1]);
  assert.ok(scripts.indexOf('src/explore-quest.js') < scripts.indexOf('src/explore.js'));
  for (const id of ['community-title', 'explore-atlas-btn', 'explore-atlas-modal', 'explore-atlas-grid', 'explore-atlas-close-btn']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /社區解鎖進度：0 \/ 27/);
  assert.match(read('../src/ui.js'), /PGS\.Weapons\.ALL_IDS\.length - 4/);
  const ids = Array.from(html.matchAll(/\bid="([^"]+)"/g), (match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'HTML ids must remain unique');
});
