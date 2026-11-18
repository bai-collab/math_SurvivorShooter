import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

function loadMathQuest() {
  const sandbox = { module: { exports: {} } };
  const source = readFileSync(new URL('../src/math-quest.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, sandbox, { filename: 'src/math-quest.js' });
  return sandbox.module.exports;
}

const mathQuest = loadMathQuest();
const gameSandbox = {
  PGS: { MathQuest: mathQuest },
  localStorage: { setItem() {} },
  console,
};
gameSandbox.window = gameSandbox;
const gameSource = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8');
vm.runInNewContext(gameSource, gameSandbox, { filename: 'src/game.js' });
const SurvivorGame = gameSandbox.PGS.SurvivorGame;

test('HTML 含有所有 GameUI 控制項，且先載入數學核心再載入遊戲', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const uiSource = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  const ids = Array.from(html.matchAll(/\bid="([^"]+)"/g), (match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'HTML 不應有重複 id');
  for (const match of uiSource.matchAll(/document\.getElementById\('([^']+)'\)/g)) {
    assert.ok(ids.includes(match[1]), `GameUI 參照的 #${match[1]} 不在 index.html`);
  }
  const mathScript = html.indexOf('src/math-quest.js');
  const gameScript = html.indexOf('src/game.js');
  assert.ok(mathScript >= 0 && gameScript > mathScript);
});

function makeGame({ band = 'middle', pauseOnAnswer = false, halfViewWidth = 20, playerPosition = { x: 0, z: 0 } } = {}) {
  const uiEvents = { hints: [], toasts: [], rewards: 0, growthUpdates: 0 };
  const ui = {
    showMathQuestion() {},
    showMathHint(hint) { uiEvents.hints.push(hint); },
    showMathExplanation() {},
    showMathReward() { uiEvents.rewards++; },
    updateMathGrowth() { uiEvents.growthUpdates++; },
    updateMathTimer() {},
    updateHud() {},
    showHarvestTask() {},
    updateHarvestTask() {},
    hideHarvestTask() {},
    showMathToast(message) { uiEvents.toasts.push(message); },
    hideMathAction() {},
    hideMathBanner() {},
  };
  const game = Object.create(SurvivorGame.prototype);
  Object.assign(game, {
    save: {
      mathSettings: { band, frequency: 'standard', pauseOnAnswer, pauseTouched: false },
      mathStats: { questions: 0, firstTryCorrect: 0, byTopic: {} },
    },
    stateName: 'playing',
    mathMode: 'none',
    mathCurrent: null,
    answerPads: [],
    mathRun: { questions: 0, firstTryCorrect: 0, topics: {}, mistakes: [] },
    mathHarvest: { active: false, rule: null, timer: 0, collected: 0 },
    mathHarvestWave: { x: 0, z: 0, timer: 0, duration: 0.8, radius: 22 },
    mathBuffTimer: 0,
    mathFeedbackTimer: 0,
    elapsed: 0,
    keys: {},
    runGold: 0,
    player: { ...playerPosition, hp: 50, maxHp: 100, speed: 6 },
    enemies: [],
    terrainZones: [],
    pickups: [],
    effects: [],
    renderer: { camera: { right: halfViewWidth }, addShake() {} },
    audio: { playLevelUp() {}, playGem() {}, playExplosion() {} },
    ui,
    uiEvents,
    spawnFx() {},
  });
  game.damageEnemy = (enemy, damage) => { enemy.hp -= damage; game.waveHits++; };
  game.waveHits = 0;
  return game;
}

test('移動閘門容許一次錯答、提示不洩漏答案，重試答對可選獎勵', () => {
  const game = makeGame();
  const question = game.startMathQuiz();
  assert.equal(game.mathMode, 'world-question');
  assert.ok(game.answerPads.length >= 3 && game.answerPads.length <= 4);
  assert.ok(game.answerPads.every((pad) => {
    const distance = Math.hypot(pad.x - game.player.x, pad.z - game.player.z);
    return distance >= 7 && distance <= 9;
  }));

  const wrong = (question.answerIndex + 1) % question.choices.length;
  game.answerMathChoice(wrong);
  assert.equal(game.mathMode, 'world-question');
  assert.equal(game.answerPads[wrong].broken, true);
  assert.equal(game.player.hp, 50);
  assert.ok(game.uiEvents.hints[0]);
  assert.ok(!game.uiEvents.hints[0].includes(question.choices[question.answerIndex]));

  game.answerMathChoice(question.answerIndex);
  assert.equal(game.mathMode, 'reward');
  assert.equal(game.save.mathStats.questions, 1);
  assert.equal(game.save.mathStats.byTopic[question.topic].attempts, 2);
  assert.equal(game.save.mathStats.firstTryCorrect, 0);
  assert.equal(game.mathRun.mistakes.length, 1);
  assert.equal(game.uiEvents.rewards, 1);

  game.chooseMathReward(1);
  assert.equal(game.runGold, 10);
  assert.equal(game.mathMode, 'none');
  assert.equal(game.answerPads.length, 0);
});

test('窄螢幕把地面答案台排在視野內且彼此分開', () => {
  const game = makeGame({ halfViewWidth: 5.4 });
  game.startMathQuiz();
  assert.equal(game.mathMode, 'world-question');
  assert.ok(game.answerPads.every((pad) => Math.abs(pad.x - game.player.x) <= 4.25));
  assert.ok(game.answerPads.every((pad) => Math.abs(pad.x - game.player.x) + pad.visualSize <= 5.4));
  assert.ok(game.answerPads.every((pad) => Math.hypot(pad.x - game.player.x, pad.z - game.player.z) >= 7));
  for (let i = 0; i < game.answerPads.length; i++) {
    for (let j = i + 1; j < game.answerPads.length; j++) {
      assert.ok(Math.hypot(game.answerPads[i].x - game.answerPads[j].x, game.answerPads[i].z - game.answerPads[j].z) > 2);
    }
  }
});

test('窄螢幕地圖角落自動切成暫停作答，避免答案台出界', () => {
  const game = makeGame({ halfViewWidth: 5.4, playerPosition: { x: 100, z: 100 } });
  game.startMathQuiz();
  assert.equal(game.mathMode, 'paused-question');
  assert.equal(game.mathCurrent.paused, true);
  assert.equal(game.answerPads.length, 0);
});

test('極窄視野改用暫停作答，避免 3D 選項無法完整顯示', () => {
  const game = makeGame({ halfViewWidth: 2.8 });
  game.startMathQuiz();
  assert.equal(game.mathMode, 'paused-question');
  assert.equal(game.answerPads.length, 0);
});

test('舊存檔可載入，低年級預設暫停且保留已手動設定', () => {
  const oldStorage = gameSandbox.localStorage;
  const oldAddEventListener = gameSandbox.addEventListener;
  const oldResetRunState = SurvivorGame.prototype.resetRunState;
  const oldGear = gameSandbox.PGS.Gear;
  const oldGamepadController = gameSandbox.PGS.GamepadController;
  gameSandbox.PGS.Gear = { STAGES: [{ id: 'test' }], createGearItem: (type, uid) => ({ type, uid }) };
  gameSandbox.PGS.GamepadController = class { update() {} };
  SurvivorGame.prototype.resetRunState = function () {};
  gameSandbox.addEventListener = () => {};

  try {
    gameSandbox.localStorage = {
      getItem: () => JSON.stringify({ gold: 12, mathSettings: { band: 'low' }, mathStats: { questions: 4 } }),
      setItem() {},
    };
    const migrated = new SurvivorGame({}, {}, {});
    assert.equal(migrated.save.gold, 12);
    assert.equal(migrated.save.mathSettings.band, 'low');
    assert.equal(migrated.save.mathSettings.pauseOnAnswer, true);
    assert.equal(migrated.save.mathStats.questions, 4);
    assert.equal(migrated.save.communityAtlas.collected.length, 0);
    assert.equal(migrated.save.communityAtlas.title, '');

    gameSandbox.localStorage.getItem = () => JSON.stringify({ mathSettings: { band: 'low', pauseOnAnswer: false, pauseTouched: true } });
    const customized = new SurvivorGame({}, {}, {});
    assert.equal(customized.save.mathSettings.pauseOnAnswer, false);
    assert.equal(customized.save.mathSettings.pauseTouched, true);

    gameSandbox.localStorage.getItem = () => JSON.stringify({ communityAtlas: { collected: ['one_mu_field', 3], rewardsClaimed: ['6', 'unknown'], title: '保存稱號' } });
    const atlasSave = new SurvivorGame({}, {}, {});
    assert.deepEqual(Array.from(atlasSave.save.communityAtlas.collected), ['one_mu_field']);
    assert.deepEqual(Array.from(atlasSave.save.communityAtlas.rewardsClaimed), ['6']);
    assert.equal(atlasSave.save.communityAtlas.title, '保存稱號');
  } finally {
    gameSandbox.localStorage = oldStorage;
    gameSandbox.addEventListener = oldAddEventListener;
    SurvivorGame.prototype.resetRunState = oldResetRunState;
    gameSandbox.PGS.Gear = oldGear;
    gameSandbox.PGS.GamepadController = oldGamepadController;
  }
});

test('暫停題可用鍵盤 1–4 作答，第二次錯答顯示解說而不扣生命', () => {
  const oldAddEventListener = gameSandbox.addEventListener;
  const listeners = {};
  gameSandbox.addEventListener = (name, callback) => { listeners[name] = callback; };
  try {
    const game = makeGame({ pauseOnAnswer: true });
    const question = game.startMathQuiz();
    SurvivorGame.prototype._bindInputs.call(game);
    let prevented = false;
    listeners.keydown({ key: String((question.answerIndex + 1) % question.choices.length + 1), repeat: false, preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(game.mathCurrent.attempts, 1);
    assert.equal(game.player.hp, 50);

    const remainingWrong = question.choices.findIndex((_, index) => index !== question.answerIndex && index !== (question.answerIndex + 1) % question.choices.length);
    if (remainingWrong >= 0) game.answerMathChoice(remainingWrong);
    else game.answerMathChoice(question.answerIndex);
    assert.equal(game.mathMode, 'feedback');
    assert.equal(game.player.hp, 50);
    assert.equal(game.save.mathStats.questions, 1);
  } finally {
    gameSandbox.addEventListener = oldAddEventListener;
  }
});

test('暫停作答模式答對後回復生命，並累計首次答對紀錄', () => {
  const game = makeGame({ band: 'low', pauseOnAnswer: true });
  const question = game.startMathQuiz();
  assert.equal(game.mathMode, 'paused-question');
  assert.equal(game.answerPads.length, 0);
  game.answerMathChoice(question.answerIndex);
  assert.equal(game.mathMode, 'reward');
  game.chooseMathReward(0);
  assert.equal(game.player.hp, 80);
  assert.equal(game.save.mathStats.firstTryCorrect, 1);
  assert.equal(game.mathRun.firstTryCorrect, 1);
});

test('豐收任務只計入符合規則的數字，滿五個觸發稻浪傷害與擊退', () => {
  const game = makeGame();
  game.startHarvestTask();
  assert.equal(game.mathHarvest.active, true);
  assert.equal(game.mathHarvest.timer, 25);
  const valid = game.mathHarvest.rule.sampleNumbers.find((n) => game.mathHarvest.rule.test(n));
  const invalid = game.mathHarvest.rule.sampleNumbers.find((n) => !game.mathHarvest.rule.test(n));

  game.collectMathGrain({ value: invalid });
  assert.equal(game.mathHarvest.collected, 0);
  assert.ok(game.uiEvents.toasts.at(-1).includes(String(invalid)));

  game.collectMathGrain({ value: valid });
  assert.equal(game.mathHarvest.collected, 1);
  game.mathHarvest.collected = 4;
  game.enemies = [{ x: 4, z: 0, hp: 100, kx: 0, kz: 0 }];
  game.collectMathGrain({ value: valid });
  assert.equal(game.mathHarvest.active, false);
  assert.equal(game.mathHarvestWave.timer, 0.9);
  assert.equal(game.waveHits, 1);
  assert.ok(game.enemies[0].hp < 100);
});
