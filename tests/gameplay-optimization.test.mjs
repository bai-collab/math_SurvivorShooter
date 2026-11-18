import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const stageDefs = [
  { id: 'meadow', name: '第 1 關：稻香田野', hpMult: 1, speedMult: 1, numbers: [1, 2, 3, 4, 5], ops: ['+', '-'] },
  { id: 'ruins', name: '第 2 關：廟埕夜市', hpMult: 1.35, speedMult: 1.12, numbers: [3, 4, 5, 6], ops: ['+', '-', '*'] },
  { id: 'temple', name: '第 3 關：星空水圳', hpMult: 1.75, speedMult: 1.2, numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9], ops: ['+', '-', '*', '/'] },
];

const mathSandbox = { module: { exports: {} } };
vm.runInNewContext(readFileSync(new URL('../src/math-quest.js', import.meta.url), 'utf8'), mathSandbox, { filename: 'src/math-quest.js' });
const mathQuest = mathSandbox.module.exports;

const weaponsSandbox = { PGS: {} };
weaponsSandbox.window = weaponsSandbox;
vm.runInNewContext(readFileSync(new URL('../src/weapons.js', import.meta.url), 'utf8'), weaponsSandbox, { filename: 'src/weapons.js' });
const weapons = weaponsSandbox.PGS.Weapons;

const gameSandbox = {
  PGS: {
    MathQuest: mathQuest,
    Gear: {
      STAGES: stageDefs,
      createGearItem: (type, uid) => ({ type, uid }),
      normalizeGearItem: (item) => item,
      computeTotalStats: () => ({ hp: 0, mspd: 0, atk: 0, crit: 0, def: 0, dr: 0, aspd: 0 }),
    },
    GamepadController: class { update() {} },
  },
  localStorage: { getItem() { return null; }, setItem() {} },
  addEventListener() {},
  console,
};
gameSandbox.window = gameSandbox;
vm.runInNewContext(readFileSync(new URL('../src/game.js', import.meta.url), 'utf8'), gameSandbox, { filename: 'src/game.js' });
const SurvivorGame = gameSandbox.PGS.SurvivorGame;

function makeGame({ stageId = 'meadow', band = 'low', pauseOnAnswer = true } = {}) {
  const uiEvents = { warnings: [], questions: [], hints: [], explanations: 0, rewards: 0, toasts: [], stageClears: 0 };
  const ui = {
    showBossWarning(name, seconds) { uiEvents.warnings.push({ name, seconds }); },
    updateBossWarning() {},
    hideBossWarning() {},
    updateBossHud() {},
    showMathQuestion(question, paused, timeLeft, kind) { uiEvents.questions.push({ question, paused, timeLeft, kind }); },
    showMathHint(hint) { uiEvents.hints.push(hint); },
    showMathExplanation() { uiEvents.explanations++; },
    showMathReward() { uiEvents.rewards++; },
    updateMathGrowth() {},
    updateMathTimer() {},
    updateHud() {},
    showHarvestTask() {},
    updateHarvestTask() {},
    hideHarvestTask() {},
    showMathToast(message) { uiEvents.toasts.push(message); },
    hideMathAction() {},
    hideMathBanner() {},
    showStageClear() { uiEvents.stageClears++; },
    hideStageClear() {},
    showGameOver() {},
  };
  const game = Object.create(SurvivorGame.prototype);
  Object.assign(game, {
    selectedStageId: stageId,
    stateName: 'playing',
    save: {
      gold: 20,
      nextUid: 10,
      stageClears: [],
      cards: [],
      mathSettings: { band, frequency: 'standard', pauseOnAnswer, pauseTouched: true },
      mathStats: { questions: 0, firstTryCorrect: 0, byTopic: {} },
    },
    player: { x: 0, z: 0, facing: 1, hp: 70, maxHp: 100, speed: 6, level: 1, globalDamageMult: 1, globalRateMult: 1, flatAtk: 0, invuln: 0 },
    weapons: [{ def: { damage: 20, cooldown: 0.5, pellets: 1 }, eff: { damage: 20 }, damageMult: 1, rateMult: 1 }],
    renderer: { camera: { right: 20 }, spawnDamageNumber() {}, addShake() {}, setStageTint() {}, clearTransient() {} },
    audio: { playLevelUp() {}, playGem() {}, playExplosion() {}, unlock() {} },
    ui,
    uiEvents,
    enemies: [],
    projectiles: [],
    enemyProjectiles: [],
    telegraphs: [],
    pickups: [],
    effects: [],
    terrainZones: [],
    waterPuddles: [],
    vortexes: [],
    elapsed: 0,
    kills: 0,
    runGold: 7,
    nextEnemyId: 1,
    mathMode: 'none',
    mathCurrent: null,
    answerPads: [],
    mathHarvest: { active: false, rule: null, timer: 0, collected: 0 },
    mathHarvestWave: { x: 0, z: 0, timer: 0, duration: 0.8, radius: 22 },
    mathBuffTimer: 0,
    mathFeedbackTimer: 0,
    mathRun: { questions: 0, firstTryCorrect: 0, highestCombo: 0, topics: {}, mistakes: [] },
    mathCombo: 0,
    comboDamageBonus: 0,
    bossSpawned: false,
    bossDefeated: false,
    bossWarningActive: false,
    bossEncounterActive: false,
    bossEnemy: null,
    boss: null,
    showDamageNumbers: true,
    nextQuizAt: 0,
    nextHarvestAt: 0,
    spawnTimer: 0,
    eliteTimer: 0,
    totalSpawned: 0,
    vampireRuneRate: 0,
    runNormalRuneRate: 0,
    gearDropRate: 0,
    cardDropRate: 0,
    spawnFx() {},
    spawnShard() {},
  });
  return game;
}

test('弱項選題會提高低首答率題型權重，每個題型仍可抽到', () => {
  const topics = mathQuest.TOPICS_BY_BAND.low.topics;
  const stats = {
    byTopic: {
      [topics[0]]: { questions: 10, firstTryCorrect: 0, attempts: 18, lastAnsweredAt: Date.now() - 86400000 },
    },
  };
  const rng = mathQuest.createRng('f11-weak-topic');
  const counts = Object.fromEntries(topics.map((topic) => [topic, 0]));
  for (let i = 0; i < 5000; i++) counts[mathQuest.pickTopic('low', stats, rng)]++;
  assert.ok(counts[topics[0]] / 5000 > 1 / topics.length, '首答率為 0 的題型應高於平均比例');
  assert.ok(topics.every((topic) => counts[topic] > 0), '每個題型都保有抽中機會');
});

test('沒有作答紀錄時，固定種子 5000 次抽題接近平均分布', () => {
  const topics = mathQuest.TOPICS_BY_BAND.low.topics;
  const rng = mathQuest.createRng('f11-no-topic-history');
  const counts = Object.fromEntries(topics.map((topic) => [topic, 0]));
  for (let i = 0; i < 5000; i++) counts[mathQuest.pickTopic('low', { byTopic: {} }, rng)]++;
  for (const topic of topics) assert.ok(Math.abs(counts[topic] / 5000 - 1 / topics.length) < 0.03, `${topic} 的比例應接近平均`);
});

test('舊存檔補上 stageClears 與 mathStats 新欄位預設值', () => {
  const oldStorage = gameSandbox.localStorage;
  const oldAddEventListener = gameSandbox.addEventListener;
  const oldResetRunState = SurvivorGame.prototype.resetRunState;
  gameSandbox.addEventListener = () => {};
  SurvivorGame.prototype.resetRunState = function () {};
  try {
    gameSandbox.localStorage = {
      getItem: () => JSON.stringify({ mathStats: { questions: 3, byTopic: { compare: { attempts: 4, questions: 2, firstTryCorrect: 1 } } } }),
      setItem() {},
    };
    const game = new SurvivorGame({}, {}, {});
    assert.deepEqual(Array.from(game.save.stageClears), []);
    assert.equal(game.save.mathStats.byTopic.compare.attempts, 4);
    assert.equal(game.save.mathStats.byTopic.compare.lastAnsweredAt, 0);
    assert.deepEqual(Array.from(game.save.stageClears), []);
  } finally {
    gameSandbox.localStorage = oldStorage;
    gameSandbox.addEventListener = oldAddEventListener;
    SurvivorGame.prototype.resetRunState = oldResetRunState;
  }
});

test('第五分鐘前出現三秒頭目警示，警示結束後出現頭目與算式閘門', () => {
  const game = makeGame();
  game.elapsed = 297;
  game.updateBossSchedule(0);
  assert.equal(game.bossWarningActive, true);
  assert.equal(game.bossSpawned, false);
  assert.equal(game.uiEvents.warnings[0].name, '稻草人大王');
  game.updateMathEvents(0.1);
  assert.equal(game.mathMode, 'none', '頭目倒數期間不應排一般數學閘門');

  game.updateBossSchedule(3);
  assert.equal(game.bossSpawned, true);
  assert.equal(game.bossEncounterActive, true);
  assert.equal(game.bossEnemy.isBoss, true);
  assert.equal(game.bossEnemy.shielded, true);
  assert.equal(game.mathCurrent.kind, 'boss');
  assert.equal(game.uiEvents.questions.at(-1).kind, 'boss');
});

test('頭目護盾期間免傷並顯示護盾字樣；答對後破盾 12 秒再開新題', () => {
  const game = makeGame();
  game.spawnBoss();
  const boss = game.bossEnemy;
  const initialHp = boss.hp;
  game.damageEnemy(boss, 250, 0, 0);
  assert.equal(boss.hp, initialHp);

  game.answerMathChoice(game.mathCurrent.question.answerIndex);
  assert.equal(boss.shielded, false);
  assert.equal(boss.shieldTimer, 12);
  assert.equal(game.mathMode, 'none');
  assert.equal(game.uiEvents.rewards, 0, '頭目閘門不應蓋過一般閘門的獎勵選單');

  game.updateBossSchedule(12);
  assert.equal(boss.shielded, true);
  assert.equal(game.mathCurrent.kind, 'boss');
});

test('頭目算式答錯沿用提示與重試，不扣血，兩次錯誤後會重開新題', () => {
  const game = makeGame();
  game.spawnBoss();
  const hp = game.player.hp;
  const question = game.mathCurrent.question;
  const wrong = question.choices.findIndex((_, index) => index !== question.answerIndex);
  game.answerMathChoice(wrong);
  assert.equal(game.mathMode, 'paused-question');
  assert.equal(game.uiEvents.hints.length, 1);
  assert.equal(game.player.hp, hp);

  const secondWrong = question.choices.findIndex((_, index) => index !== question.answerIndex && index !== wrong);
  game.answerMathChoice(secondWrong);
  assert.equal(game.mathMode, 'feedback');
  game.updateMathOverlayTimer(3);
  assert.equal(game.mathMode, 'paused-question');
  assert.equal(game.mathCurrent.kind, 'boss');
  assert.equal(game.player.hp, hp);
  assert.equal(game.uiEvents.explanations, 1);
});

test('頭目攻擊交替出現一圈與兩圈紅色預警', () => {
  const game = makeGame();
  const boss = { x: 0, z: 0, damage: 30, attackCount: 0 };
  game.spawnBossAttack(boss, 2);
  assert.equal(game.telegraphs.length, 1);
  game.spawnBossAttack(boss, 2);
  assert.equal(game.telegraphs.length, 3);
  assert.ok(game.telegraphs.every((ring) => ring.maxTimer === 2 && ring.radius > 0));
});

test('頭目破盾期間自動射擊優先鎖定頭目', () => {
  const nearbyMinion = { id: 1, x: 1, z: 0, hp: 20 };
  const exposedBoss = { id: 2, x: 5, z: 0, hp: 100, isBoss: true, shielded: false };
  assert.equal(weapons.findTarget({ x: 0, z: 0 }, [nearbyMinion, exposedBoss], 'nearest', 10), exposedBoss);
  exposedBoss.shielded = true;
  assert.equal(weapons.findTarget({ x: 0, z: 0 }, [nearbyMinion, exposedBoss], 'nearest', 10), nearbyMinion);
});

test('頭目期間暫停一般閘門、豐收任務與一般怪物排程', () => {
  const game = makeGame();
  game.bossEncounterActive = true;
  game.nextQuizAt = 0;
  game.nextHarvestAt = 0;
  game.updateMathEvents(1);
  const countBefore = game.enemies.length;
  game.updateSpawner(1);
  assert.equal(game.mathMode, 'none');
  assert.equal(game.mathHarvest.active, false);
  assert.equal(game.enemies.length, countBefore);
});

test('擊倒頭目會通關、保存 stageClears，並發放 50 金幣與隨機卡牌', () => {
  const game = makeGame();
  game.spawnBoss();
  game.answerMathChoice(game.mathCurrent.question.answerIndex);
  const boss = game.bossEnemy;
  boss.hp = 1;
  const oldCardCount = game.save.cards.length;
  game.damageEnemy(boss, 2, 0, 0);

  assert.equal(game.stateName, 'stageclear');
  assert.equal(game.bossDefeated, true);
  assert.ok(Array.from(game.save.stageClears).includes('meadow'));
  assert.equal(game.save.gold, 77, '原有本局 7 金幣與通關獎勵 50 金幣會存檔');
  assert.equal(game.stageClearReward.bonusGold, 50);
  assert.equal(game.save.cards.length, oldCardCount + 1);
  assert.ok(['num', 'op'].includes(game.stageClearReward.card.kind));
  assert.equal(game.uiEvents.stageClears, 1);
  assert.equal(game.continueEndless(), true);
  assert.equal(game.stateName, 'playing');
  assert.equal(game.runGold, 0, '已入帳的金幣不會在無盡模式結束時重複入帳');
});

test('第一次答對連擊累計與歸零，攻擊加成封頂 30%，局後保留最高連擊', () => {
  const game = makeGame();
  const answerOne = () => {
    const question = game.startMathQuiz();
    game.answerMathChoice(question.answerIndex);
    game.chooseMathReward(2);
  };
  for (let i = 0; i < 10; i++) answerOne();
  assert.equal(game.mathCombo, 10);
  assert.equal(game.mathRun.highestCombo, 10);
  assert.equal(game.comboDamageBonus, 0.3);
  assert.ok(Math.abs(game.player.globalDamageMult - 1.3) < 1e-10);
  assert.equal(game.pickups.filter((pickup) => pickup.bag).length, 2, '第 5 與第 10 連擊會掉落金幣袋');

  const question = game.startMathQuiz();
  const wrong = question.choices.findIndex((_, index) => index !== question.answerIndex);
  game.answerMathChoice(wrong);
  assert.equal(game.mathCombo, 0);
  assert.equal(game.mathRun.highestCombo, 10);
  assert.equal(game.comboDamageBonus, 0.3, '已取得的本局攻擊加成不因連擊中斷而消失');
  assert.ok(Math.abs(game.player.globalDamageMult - 1.3) < 1e-10);
});


// ===== F12：Gemini 外審回報項目的回歸測試 =====

test('F12-1 頭目被擊倒後選「繼續挑戰」，頭目遺留的預警紅圈不再引爆傷人', () => {
  const game = makeGame();
  game.audio.playHurt = () => {};
  Object.assign(game.player, { def: 0, dr: 0 });
  game.spawnBoss();
  game.answerMathChoice(game.mathCurrent.question.answerIndex);
  const boss = game.bossEnemy;
  // 頭目先放出兩圈預警（紅圈中心就在玩家身上），再被擊倒
  game.spawnBossAttack({ x: 3, z: 0, damage: 30, attackCount: 1 }, 2.1);
  const hpBefore = game.player.hp;
  boss.hp = 1;
  game.damageEnemy(boss, 2, 0, 0);
  assert.equal(game.stateName, 'stageclear');
  assert.equal(game.continueEndless(), true);
  game.updateTelegraphs(3);
  assert.equal(game.player.hp, hpBefore, '頭目已倒，遺留預警不可再傷害玩家');
  assert.equal(game.telegraphs.length, 0, '頭目預警在擊倒當下清除');
});

test('F12-1 清除頭目預警時，一般怪的預警不受影響', () => {
  const game = makeGame();
  game.spawnBoss();
  game.answerMathChoice(game.mathCurrent.question.answerIndex);
  const boss = game.bossEnemy;
  game.spawnAttackTelegraph({ type: 'elite', damage: 10, onHitStatus: null }, 3);
  game.spawnBossAttack({ x: 3, z: 0, damage: 30, attackCount: 1 }, 2.1);
  boss.hp = 1;
  game.damageEnemy(boss, 2, 0, 0);
  assert.equal(game.telegraphs.length, 1, '只留下一般怪的預警');
  assert.equal(game.telegraphs[0].damage, 10);
});

test('F12-2 暫停作答與看解說期間，遊戲時間、頭目排程、波次都不前進', () => {
  for (const mode of ['paused-question', 'feedback']) {
    const game = makeGame();
    game.elapsed = 296.9;
    game.startMathQuiz();
    if (mode === 'feedback') {
      const q = game.mathCurrent.question;
      const wrong = (i) => q.choices.findIndex((_, k) => k !== q.answerIndex && k !== i);
      const first = wrong(-1);
      game.answerMathChoice(first);
      game.answerMathChoice(wrong(first));
    }
    assert.equal(game.mathMode, mode);
    game.renderer.renderFrame = () => {};
    game.gamepad = { update() {} };
    game.updateTerrains = game.updatePlayerStatuses = () => { throw new Error('世界不應更新'); };
    const timeBefore = game.elapsed;
    for (let i = 0; i < 10; i++) game.update(0.05);
    assert.equal(game.elapsed, timeBefore, `${mode} 期間 elapsed 不前進`);
    assert.equal(game.bossWarningActive, false, `${mode} 期間不觸發頭目警示`);
    assert.equal(game.uiEvents.warnings.length, 0);
  }
});

// UI 以假 DOM 載入，驗證連擊 HUD 文字
function loadUiForHud() {
  const sandbox = { PGS: { Weapons: weapons, Runes: { DEFS: {} } }, localStorage: { getItem() { return null; }, setItem() {} }, console };
  sandbox.window = sandbox;
  vm.runInNewContext(readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8'), sandbox, { filename: 'src/ui.js' });
  const mkEl = () => ({ style: {}, textContent: '', innerHTML: '', classList: { toggle() {}, add() {}, remove() {} } });
  const ui = Object.create(sandbox.PGS.GameUI.prototype);
  ui.els = new Proxy({}, { get: (target, key) => (target[key] ||= mkEl()), set: (target, key, value) => { target[key] = value; return true; } });
  ui.updateBossHud = () => {};
  ui.iconDataUrls = {};
  return ui;
}

test('F12-3 連擊歸零但保有加成時，HUD 明示是「本局加成」，不像失效', () => {
  const ui = loadUiForHud();
  const game = { player: { hp: 10, maxHp: 10, xp: 0, nextXp: 10, level: 1 }, elapsed: 0, kills: 0, runGold: 0, stateName: 'playing', mathCombo: 0, comboDamageBonus: 0.3, weapons: [], mathBuffTimer: 0 };
  ui.updateHud(game);
  assert.match(ui.els.mathComboBonus.textContent, /本局加成 \+30%/);
  assert.equal(ui.els.mathComboCount.textContent, '0');
});

test('F12-4 連擊同時升階與掉金幣袋時只顯示一則合併提示', () => {
  for (const [combo, expectBonus, expectBag] of [[3, true, false], [5, true, true], [10, true, true], [15, false, true]]) {
    const game = makeGame();
    for (let i = 0; i < combo - 1; i++) game.registerMathCombo();
    game.uiEvents.toasts.length = 0;
    game.registerMathCombo();
    const comboToasts = game.uiEvents.toasts.filter((text) => text.includes(`連擊 ${combo}`));
    assert.equal(comboToasts.length, 1, `連擊 ${combo} 只有一則提示`);
    assert.equal(comboToasts[0].includes('攻擊加成'), expectBonus, `連擊 ${combo} 加成提示`);
    assert.equal(comboToasts[0].includes('金幣袋'), expectBag, `連擊 ${combo} 金幣袋提示`);
  }
});
