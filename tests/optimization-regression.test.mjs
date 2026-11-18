import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

// 數學射擊遊戲優化批次（2026-11-18）的回歸測試：每項修正至少一個測試，只新增、不動既有測試。
function readSource(name) {
  return readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
}

function loadSandbox({ location } = {}) {
  const sandbox = { console, localStorage: { getItem: () => null, setItem() {} } };
  if (location) sandbox.location = location;
  sandbox.window = sandbox;
  sandbox.PGS = {};
  vm.createContext(sandbox);
  for (const file of ['math-quest.js', 'weapons.js', 'runes.js', 'game.js', 'ui.js']) {
    vm.runInContext(readSource(file), sandbox, { filename: `src/${file}` });
  }
  return sandbox;
}

const sandbox = loadSandbox();
const { PGS } = sandbox;
const SurvivorGame = PGS.SurvivorGame;

function makeEnemy(id, x, z = 0) {
  return {
    id, x, z, hp: 1000, kx: 0, kz: 0, radius: 0.55,
    slowTimer: 0, slowFactor: 1, freezeTimer: 0, chillCount: 0,
    poisonTimer: 0, poisonDps: 0, burnTimer: 0, burnDps: 0,
  };
}

function makeBare(extra = {}) {
  const calls = { damage: [], toasts: [], hints: [] };
  const game = Object.create(SurvivorGame.prototype);
  Object.assign(game, {
    save: {
      mathSettings: { band: 'middle', frequency: 'standard', pauseOnAnswer: false, pauseTouched: false },
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
    elapsed: 0,
    keys: {},
    runGold: 0,
    player: { x: 0, z: 0, hp: 50, maxHp: 100, speed: 6, magnet: 3.4 },
    enemies: [],
    projectiles: [],
    terrainZones: [],
    pickups: [],
    effects: [],
    waterPuddles: [],
    renderer: { camera: { right: 20 }, addShake() {} },
    audio: { playLevelUp() {}, playGem() {}, playExplosion() {} },
    ui: {
      showMathQuestion() {},
      showMathHint(hint) { calls.hints.push(hint); },
      showMathExplanation() {},
      showMathReward() {},
      updateMathGrowth() {},
      updateMathTimer() {},
      showHarvestTask() {},
      updateHarvestTask() {},
      hideHarvestTask() {},
      showMathToast(message) { calls.toasts.push(message); },
      hideMathAction() {},
      hideMathBanner() {},
    },
    calls,
    ...extra,
  });
  game.damageEnemy = (enemy, damage) => { calls.damage.push({ id: enemy.id, damage }); };
  return game;
}

function makeProjectile(extra = {}) {
  return {
    x: 0, z: 0, vx: 20, vz: 0, angle: 0, color: 0xffffff, damage: 10, knockback: 1,
    life: 1, maxLife: 1, pierce: 1, bounces: 0, arc: false, splashRadius: 0, slowDuration: 0,
    chainCount: 0, vortexRadius: 0, clusterCount: 0, growingWave: false, boomerang: false,
    homing: 0, runes: [], scale: 1, height: 0.65, hitIds: new Set(), ...extra,
  };
}

// ── A1：爆炸減速 ──
test('爆炸武器的減速真的會讓敵人變慢（slowFactor 與 slowTimer 一起設定）', () => {
  const game = makeBare({ enemies: [makeEnemy(1, 1), makeEnemy(2, 30)] });
  game.explodeGrenade(makeProjectile({ splashRadius: 3, slowDuration: 1.5 }));
  const [hit, far] = game.enemies;
  assert.ok(hit.slowTimer >= 1.5);
  assert.ok(hit.slowFactor < 1, '範圍內的敵人 slowFactor 必須小於 1，移動速度才會降低');
  assert.equal(far.slowTimer, 0);
  assert.equal(far.slowFactor, 1);
});

test('沒有減速效果的爆炸不會誤減速', () => {
  const game = makeBare({ enemies: [makeEnemy(1, 1)] });
  game.explodeGrenade(makeProjectile({ splashRadius: 3, slowDuration: 0 }));
  assert.equal(game.enemies[0].slowFactor, 1);
  assert.equal(game.enemies[0].slowTimer, 0);
});

// ── A2：暫停作答重按同一個錯誤答案 ──
test('暫停作答時重複選同一個錯誤選項會被忽略，不會直接判第二次失敗', () => {
  const game = makeBare();
  game.save.mathSettings.pauseOnAnswer = true;
  const question = game.startMathQuiz();
  assert.equal(game.mathMode, 'paused-question');
  const wrong = (question.answerIndex + 1) % question.choices.length;
  game.answerMathChoice(wrong);
  game.answerMathChoice(wrong);
  game.answerMathChoice(wrong);
  assert.equal(game.mathCurrent.attempts, 1);
  assert.equal(game.mathMode, 'paused-question');
  assert.equal(game.save.mathStats.byTopic[question.topic].attempts, 1);

  const another = question.choices.findIndex((_, i) => i !== question.answerIndex && i !== wrong);
  game.answerMathChoice(another);
  assert.equal(game.mathMode, 'feedback', '換另一個錯誤選項才算第二次錯答');
});

// ── A3：特效數量上限 ──
test('特效數量達上限時，光束特效不會去改到別的特效', () => {
  const game = makeBare();
  game.effects = Array.from({ length: 321 }, () => ({ x: 0, z: 0, size: 1, life: 1, maxLife: 1 }));
  const last = game.effects[game.effects.length - 1];
  assert.equal(game.spawnFx(1, 1, 0xffffff, 1, 0.1), null);
  game.spawnBeamFx(0, 0, 1.2, 8, 0.3, 0xffffff, 0.1);
  assert.equal(last.angle, undefined);
  assert.equal(last.scaleX, undefined);
  assert.equal(game.effects.length, 321);
});

test('未達上限時光束特效仍會設定長度與寬度', () => {
  const game = makeBare();
  game.spawnBeamFx(0, 0, 1.2, 8, 0.3, 0xffffff, 0.1);
  assert.equal(game.effects.length, 1);
  assert.equal(game.effects[0].scaleX, 8);
  assert.equal(game.effects[0].angle, 1.2);
});

test('水槍每個 tick 打到同一片水窪只延長時間，不會連續新增水波特效', () => {
  const game = makeBare();
  for (let i = 0; i < 20; i++) {
    game.elapsed = i * 0.02;
    game.createWaterPuddle(3, 3, { life: 3, radius: 1.9, slowPct: 35 });
  }
  assert.equal(game.waterPuddles.length, 1);
  assert.ok(game.effects.length <= 3, `20 次命中只該有少量水波特效，實際 ${game.effects.length}`);
});

// ── A4：答案踏板不會卡在障礙物裡 ──
test('每個答案踏板周圍的障礙物都會被讓開，保證走得到', () => {
  const game = makeBare();
  const probe = game.createAnswerPads(['1', '2', '3', '4']);
  const zones = [];
  for (const pad of probe) {
    zones.push({ kind: 'obstacle', x: pad.x, z: pad.z, radius: 2.2 });
    for (const delta of [0.28, -0.28, 0.56, -0.56]) {
      const angle = Math.atan2(pad.z, pad.x) + delta;
      const r = Math.hypot(pad.x, pad.z);
      zones.push({ kind: 'obstacle', x: Math.cos(angle) * r, z: Math.sin(angle) * r, radius: 2 });
    }
  }
  game.terrainZones = zones;
  const pads = game.createAnswerPads(['1', '2', '3', '4']);
  for (const pad of pads) {
    for (const zone of game.terrainZones) {
      assert.ok(Math.hypot(zone.x - pad.x, zone.z - pad.z) >= zone.radius + 0.5,
        `踏板 ${pad.index} 仍與障礙物重疊`);
    }
  }
});

// ── A5：分數分裂槍子彈繼承已命中目標 ──
test('分數分裂的子彈繼承父彈已命中的目標，不會回頭再打同一隻怪', () => {
  const target = makeEnemy(7, 0.2);
  const game = makeBare({ enemies: [target] });
  const parent = makeProjectile({
    fractionSplit: true, splitDepth: 2, splitLevel: 0, hitIds: new Set([7]), weaponRef: null,
  });
  game.spawnFractionChildren(parent);
  assert.equal(game.projectiles.length, 2);
  for (const child of game.projectiles) {
    assert.ok(child.hitIds.has(7));
    assert.notEqual(child.hitIds, parent.hitIds, '要複製而不是共用同一個 Set');
  }
  game.updateProjectiles(0.01);
  assert.equal(game.calls.damage.length, 0, '1/2 子彈不能再打到父彈已經打過的怪');
  assert.equal(game.projectiles.length, 2);
});

test('子彈命中新目標時仍會繼續平分', () => {
  const game = makeBare({ enemies: [makeEnemy(8, 0.2)] });
  const parent = makeProjectile({ fractionSplit: true, splitDepth: 2, splitLevel: 0, hitIds: new Set([7]), weaponRef: null });
  game.spawnFractionChildren(parent);
  game.updateProjectiles(0.01);
  assert.equal(game.calls.damage.length, 2, '兩顆 1/2 子彈各打到新目標一次');
  assert.equal(game.projectiles.length, 4, '各自再分成兩顆 1/4 子彈');
});

// ── A6：白鷺鷥追蹤弩 ──
test('白鷺鷥折返途中撞到別的怪，不會消耗「回身再擊」次數', () => {
  const game = makeBare({ enemies: [makeEnemy(2, 0.3)] });
  game.player.x = -20;
  const arrow = makeProjectile({
    egretHoming: true, returning: true, returnStrikesLeft: 2, returnReach: 1, homing: 6,
  });
  game.projectiles.push(arrow);
  game.updateProjectiles(0.001);
  assert.equal(game.calls.damage.length, 1, '折返途中撞到怪仍會造成傷害');
  assert.equal(arrow.returnStrikesLeft, 2);
  assert.equal(arrow.returning, true);
  assert.ok(arrow.hitIds.has(2));
  assert.equal(game.projectiles.length, 1);
});

test('白鷺鷥出擊命中時才扣一次「回身再擊」並開始折返', () => {
  const game = makeBare({ enemies: [makeEnemy(2, 0.3)] });
  game.player.x = -20;
  const arrow = makeProjectile({
    egretHoming: true, returning: false, returnStrikesLeft: 2, returnReach: 1, homing: 6,
  });
  game.projectiles.push(arrow);
  game.updateProjectiles(0.001);
  assert.equal(arrow.returnStrikesLeft, 1);
  assert.equal(arrow.returning, true);
});

// ── B7：稻穀豐收 ──
test('數字稻穀不受磁鐵吸引，其他掉落物照常被吸', () => {
  const game = makeBare();
  game.mathHarvest = { active: true, rule: PGS.MathQuest.makeHarvestRule('middle', () => 0.5), timer: 20, collected: 0 };
  game.pickups = [
    { kind: 'math-grain', id: 1, value: 6, x: 2, z: 0, bobPhase: 0 },
    { kind: 'gem', value: 1, x: 2, z: 0, bobPhase: 0 },
  ];
  game.updatePickups(0.1);
  assert.equal(game.pickups[0].x, 2, '稻穀留在原地');
  assert.ok(game.pickups[1].x < 2, '經驗寶石被吸向玩家');
});

test('撿到不符合規則的稻穀會扣 1 點豐收進度（最低 0）並說明原因', () => {
  const game = makeBare();
  game.startHarvestTask();
  const invalid = game.mathHarvest.rule.sampleNumbers.find((n) => !game.mathHarvest.rule.test(n));
  game.mathHarvest.collected = 2;
  game.collectMathGrain({ value: invalid });
  assert.equal(game.mathHarvest.collected, 1);
  assert.ok(game.calls.toasts.at(-1).includes('−1'));
  game.collectMathGrain({ value: invalid });
  game.collectMathGrain({ value: invalid });
  assert.equal(game.mathHarvest.collected, 0);
});

test('豐收結束後場上沒撿的數字稻穀會被清掉', () => {
  const game = makeBare();
  game.startHarvestTask();
  game.pickups = [{ kind: 'math-grain', id: 1, value: 3, x: 5, z: 5, bobPhase: 0 }, { kind: 'gem', value: 1, x: 1, z: 1, bobPhase: 0 }];
  game.finishHarvestTask();
  assert.deepEqual(game.pickups.map((pk) => pk.kind), ['gem']);
});

// ── B9：算式閘門依選到的錯誤選項給專屬提示 ──
test('矩形題選到面積時，提示會說明周長要把四邊加起來，且不洩漏正解', () => {
  const game = makeBare();
  const question = {
    topic: 'rectangle', topicLabel: '長方形', prompt: '長 8 公分、寬 5 公分的長方形，周長是多少？',
    choices: ['26 公分', '40 平方公分', '13 公分', '28 公分'], answerIndex: 0,
    explanation: '', misconceptionTags: ['面積和周長公式混淆', '忘記周長要算兩組長寬'],
  };
  game.mathCurrent = { question, attempts: 0, timeLeft: 15, paused: true, completed: false, wrongChoices: [] };
  game.mathMode = 'paused-question';
  game.mathRun.topics.rectangle = { label: '長方形', questions: 1, attempts: 0, firstTryCorrect: 0 };
  game.answerMathChoice(1);
  assert.ok(game.calls.hints[0].includes('面積'));
  assert.ok(game.calls.hints[0].includes('四個邊'));
  assert.ok(!game.calls.hints[0].includes('26'));
  game.mathMode = 'paused-question';
  game.mathCurrent.attempts = 0;
  game.answerMathChoice(2);
  assert.ok(game.calls.hints[1].includes('四個邊'), '只加了長與寬時提示要提醒四個邊');
});

test('所有題型、所有錯誤選項都會得到提示，且提示不含正確答案原文', () => {
  const game = makeBare();
  const rng = PGS.MathQuest.createRng(20261118);
  const constants = new Set(['1', '2', '4', '10', '100', '1000']);
  for (const band of ['low', 'middle', 'high']) {
    for (const topic of PGS.MathQuest.BANDS[band].topics) {
      for (let n = 0; n < 40; n++) {
        const question = PGS.MathQuest.makeQuestion(band, rng, topic);
        const answer = question.choices[question.answerIndex];
        question.choices.forEach((choice, index) => {
          if (index === question.answerIndex) return;
          game.calls.hints.length = 0;
          game.mathCurrent = { question, attempts: 0, timeLeft: 15, paused: true, completed: false, wrongChoices: [] };
          game.mathMode = 'paused-question';
          game.mathRun.topics[topic] = { label: question.topicLabel, questions: 1, attempts: 0, firstTryCorrect: 0 };
          game.answerMathChoice(index);
          const hint = game.calls.hints[0];
          assert.ok(hint && hint.startsWith('提示：'), `${topic} 沒有提示`);
          if (!constants.has(answer) && answer.length >= 2) {
            assert.ok(!hint.includes(answer), `${topic} 的提示洩漏正解：${answer}／${hint}`);
          }
        });
      }
    }
  }
});

// ── B10 / C13：HUD ──
function makeHudFixture() {
  const writes = { weaponBar: 0, html: '', buffHidden: [], buffText: '' };
  const els = {
    hpFill: { style: {} }, hpGhost: { style: {} }, xpFill: { style: {} }, xpGhost: { style: {} },
    hpText: {}, levelText: {}, timeText: {}, killsText: {}, goldText: {},
    weaponBar: {
      set innerHTML(value) { writes.weaponBar++; writes.html = value; },
      get innerHTML() { return writes.html; },
    },
    mathBuffHud: { classList: { toggle(name, force) { writes.buffHidden.push(force); } } },
    mathBuffTime: { set textContent(v) { writes.buffText = v; }, get textContent() { return writes.buffText; } },
  };
  const ui = Object.create(PGS.GameUI.prototype);
  ui.els = els;
  ui.iconDataUrls = {};
  const resonance = PGS.Runes.RESONANCES[0];
  const weapon = {
    id: 'pistol', def: PGS.Weapons.DEFS.pistol, level: 1, runes: Array.from(resonance.runes), shotCount: 0,
  };
  const game = makeBare({
    weapons: [weapon], kills: 0, runGold: 0,
    player: { x: 0, z: 0, hp: 50, maxHp: 100, xp: 1, nextXp: 50, level: 1 },
  });
  return { ui, game, writes, weapon, resonance };
}

test('武器列內容沒變就不重寫 DOM，共鳴標籤保留 title 提示', () => {
  const { ui, game, writes, weapon, resonance } = makeHudFixture();
  for (let i = 0; i < 30; i++) ui.updateHud(game);
  assert.equal(writes.weaponBar, 1, '30 幀內容相同只應寫入一次');
  assert.ok(writes.html.includes(`title="${resonance.name}：`));
  weapon.runes = [];
  ui.updateHud(game);
  assert.equal(writes.weaponBar, 2, '符文改變後才重寫');
});

test('共鳴結果依符文組合快取，同組合不會每幀重新計算', () => {
  const game = makeBare();
  const runes = Array.from(PGS.Runes.RESONANCES[0].runes);
  const first = game.getWeaponResonances({ runes });
  assert.ok(first.length >= 1);
  assert.equal(game.getWeaponResonances({ runes: runes.slice() }), first);
  assert.deepEqual(Array.from(game.getWeaponResonances({ runes: [] })), []);
});

test('加速獎勵生效時 HUD 顯示剩餘秒數，結束後隱藏', () => {
  const { ui, game, writes } = makeHudFixture();
  game.mathBuffTimer = 12.3;
  ui.updateHud(game);
  assert.equal(writes.buffHidden.at(-1), false);
  assert.equal(writes.buffText, '13');
  game.mathBuffTimer = 0;
  ui.updateHud(game);
  assert.equal(writes.buffHidden.at(-1), true);
});

// ── C11 / C12：美術比例（renderer 需要 WebGL，這裡只核對設定常數） ──
test('一般與擊倒傷害數字約為爆擊字體的 70%／80%', () => {
  const source = readSource('renderer.js');
  const size = (kind) => {
    const m = source.match(new RegExp(`${kind}: \\{[^}]*font: (\\d+)[^}]*w: ([\\d.]+)`));
    assert.ok(m, `找不到 ${kind} 樣式`);
    return Number(m[1]) * Number(m[2]);
  };
  const crit = size('crit');
  assert.ok(size('normal') / crit >= 0.65 && size('normal') / crit <= 0.75);
  assert.ok(size('kill') / crit >= 0.75 && size('kill') / crit <= 0.85);
});

test('障礙物視覺縮小到約 0.7 倍', () => {
  const source = readSource('renderer.js');
  const m = source.match(/OBSTACLE_VISUAL_SCALE = ([\d.]+)/);
  assert.ok(m && Number(m[1]) >= 0.6 && Number(m[1]) <= 0.8);
});

// ── C14：路名牌納入名稱牌避讓 ──
test('據點名稱牌的避讓清單包含道路名稱牌', () => {
  const source = readSource('explore.js');
  assert.ok(source.includes('this.roadLabelRects = []'));
  assert.ok(/placed = items\.map\(\(it\) => it\.rect\)\.concat\(this\.roadLabelRects/.test(source));
});

// ── C15：除錯入口 ──
function bootWith(location) {
  const listeners = {};
  const box = { clientWidth: 800, clientHeight: 600, appendChild() {} };
  const sb = {
    console, THREE: {}, performance: { now: () => 0 }, requestAnimationFrame() {},
    addEventListener(name, cb) { listeners[name] = cb; },
    document: { getElementById: () => box },
  };
  if (location) sb.location = location;
  sb.window = sb;
  sb.PGS = {
    PixelArt: { buildAllAssets: () => ({ textures: {}, iconDataUrls: {}, runeDataUrls: {}, gearDataUrls: {} }) },
    PixelRenderer: class {},
    RetroAudio: class {},
    GameUI: class { bindGame() {} },
    SurvivorGame: class { unlockAllContent() { return 'ok'; } },
  };
  vm.createContext(sb);
  vm.runInContext(readSource('main.js'), sb, { filename: 'src/main.js' });
  listeners.DOMContentLoaded();
  return sb.PGS;
}

test('網址沒有 ?debug=1 時不掛 PGS.debug；帶 ?debug=1 或非瀏覽器環境才掛', () => {
  assert.equal(bootWith({ search: '' }).debug, undefined);
  assert.equal(bootWith({ search: '?foo=1' }).debug, undefined);
  assert.equal(typeof bootWith({ search: '?debug=1' }).debug.unlockAll, 'function');
  assert.equal(typeof bootWith({ search: '?x=2&debug=1' }).debug.forceQuizGate, 'function');
  assert.equal(typeof bootWith(null).debug.unlockAll, 'function');
});

// ── F5：答案標籤與稻穀數字標籤畫在所有世界物件之上，且互不重疊 ──
function loadRendererLabels() {
  const disposed = { textures: 0, materials: 0 };
  const makeCtx = () => {
    const ctx = {
      font: '',
      clearRect() {}, fillRect() {}, strokeText() {}, fillText() {},
      measureText(text) {
        const px = Number(/(\d+)px/.exec(ctx.font)[1]);
        let width = 0;
        for (const ch of String(text)) width += ch.charCodeAt(0) > 255 ? px : px * 0.6;
        return { width };
      },
    };
    return ctx;
  };
  class Sprite {
    constructor(material) {
      this.material = material;
      this.renderOrder = 0;
      this.parent = null;
      this.scale = { x: 1, y: 1, z: 1, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
    }
  }
  const THREE = {
    NearestFilter: 1,
    CanvasTexture: class { constructor(canvas) { this.image = canvas; } dispose() { disposed.textures++; } },
    SpriteMaterial: class { constructor(opts) { Object.assign(this, opts); } dispose() { disposed.materials++; } },
    Sprite,
  };
  const sb = {
    console, THREE, performance: { now: () => 0 },
    document: { createElement: () => ({ width: 0, height: 0, getContext: makeCtx }) },
  };
  sb.window = sb;
  sb.PGS = {};
  vm.createContext(sb);
  vm.runInContext(readSource('renderer.js'), sb, { filename: 'src/renderer.js' });
  return { labels: sb.PGS.RendererLabels, disposed, PGS: sb.PGS };
}

test('答案標籤與稻穀數字標籤的材質關閉深度測試，renderOrder 高於所有世界物件池與傷害數字', () => {
  const { labels } = loadRendererLabels();
  const pad = labels.createTextLabel('4/5 > 3/5', 'pad');
  const grain = labels.createTextLabel('7', 'grain');
  for (const item of [pad, grain]) {
    assert.equal(item.sprite.material.depthTest, false);
    assert.equal(item.sprite.material.depthWrite, false);
  }
  // 世界物件（寶石、怪物、子彈池）沒有設 renderOrder，預設 0；其餘明確設定的 renderOrder 都要低於答案標籤
  const orders = [...readSource('renderer.js').matchAll(/renderOrder = (\d+)/g)].map((m) => Number(m[1]));
  const others = orders.filter((n) => n !== labels.ANSWER_LABEL_RENDER_ORDER && n !== labels.GRAIN_LABEL_RENDER_ORDER);
  assert.ok(others.length >= 1);
  assert.ok(pad.sprite.renderOrder > Math.max(...others), '答案標籤 renderOrder 必須最高');
  assert.ok(grain.sprite.renderOrder > 0 && grain.sprite.renderOrder < pad.sprite.renderOrder);
  assert.ok(pad.sprite.renderOrder >= 100);
});

test('答案標籤放大且依文字量測底板寬度；長文字縮字而不是裁切', () => {
  const { labels } = loadRendererLabels();
  const short = labels.createTextLabel('38 公分', 'pad');
  const frac = labels.createTextLabel('4/5 > 3/5', 'pad');
  const long = labels.createTextLabel('1 個 1 公升瓶 ＋ 3 杯 250 毫升量杯', 'pad');
  const sizeOf = (label) => labels.answerLabelSize(label, 2.2);
  assert.ok(sizeOf(short).h >= 0.82 * 1.4, '標籤高度約為舊版 0.82 的 1.5 倍');
  assert.ok(sizeOf(short).plateW < sizeOf(frac).plateW, '底板寬度隨文字長度改變');
  assert.ok(sizeOf(long).plateW <= sizeOf(long).spriteW + 1e-9, '底板不會超出畫布');
  assert.ok(long.plateW <= long.canvas.width);
});

test('相鄰答案標籤在螢幕上不重疊，過近時上下錯開，且仍在各自踏板正上方（x 相同）', () => {
  const { labels } = loadRendererLabels();
  const texts = ['4/5 > 3/5', '4/5 = 3/5', '4/5 < 3/5', '38 公分'];
  const pads = texts.map((text, i) => ({ x: i * 1.5, z: 8 + i * 0.1, label: text }));
  const items = pads.map((pad) => {
    const label = labels.createTextLabel(pad.label, 'pad');
    const size = labels.answerLabelSize(label, 2.2);
    return { x: pad.x, z: pad.z, h: size.h, plateW: size.plateW };
  });
  const ys = labels.layoutAnswerLabelHeights(items);
  const tilt = -Math.atan2(18, 24);
  const rects = items.map((it, i) => {
    const v = ys[i] * Math.cos(tilt) + it.z * Math.sin(tilt);
    return { left: it.x - it.plateW / 2, right: it.x + it.plateW / 2, bottom: v - it.h / 2, top: v + it.h / 2 };
  });
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      const overlap = a.left < b.right && b.left < a.right && a.bottom < b.top && b.bottom < a.top;
      assert.equal(overlap, false, `標籤 ${i} 與 ${j} 重疊`);
    }
  }
  assert.ok(new Set(ys).size > 1, '水平過近的標籤必須上下錯開');
  assert.ok(ys.every((y) => y >= 3.25));
});

test('相距足夠遠的答案標籤不被無謂錯開', () => {
  const { labels } = loadRendererLabels();
  const label = labels.createTextLabel('38', 'pad');
  const size = labels.answerLabelSize(label, 2.2);
  const ys = labels.layoutAnswerLabelHeights([
    { x: -10, z: 8, h: size.h, plateW: size.plateW },
    { x: 10, z: 8, h: size.h, plateW: size.plateW },
  ]);
  assert.equal(ys[0], ys[1]);
});

test('移除標籤時貼圖與 SpriteMaterial 都被釋放，且從場景移除', () => {
  const { labels, disposed } = loadRendererLabels();
  const grain = labels.createTextLabel('9', 'grain');
  let removed = 0;
  grain.sprite.parent = { remove(sprite) { if (sprite === grain.sprite) removed++; } };
  labels.disposeTextLabel(grain);
  assert.equal(disposed.textures, 1);
  assert.equal(disposed.materials, 1);
  assert.equal(removed, 1);
});

test('renderer 每幀更新答案標籤只呼叫 setTextLabel／版面函式，不新建 canvas 或材質；稻穀標籤移除走 disposeTextLabel', () => {
  const source = readSource('renderer.js');
  const update = source.slice(source.indexOf('updateAnswerPads(pads) {'), source.indexOf('renderFrame(state, dt) {'));
  assert.ok(update.length > 100);
  assert.ok(!/createTextLabel|document\.createElement|new THREE\./.test(update));
  assert.ok(source.includes('disposeTextLabel(label);\n          this.grainLabels.delete(id);'));
});

// ── F6：算式閘門的答案標籤在各種視窗尺寸都完整可見，不被題目橫幅、HUD、搖桿、武器欄遮住 ──
const F6_VIEWPORTS = [
  [375, 667], [375, 812], [414, 896], [768, 1024], [800, 600], [1280, 720],
];
const F6_PLAYER_SPOTS = [
  [0, 0], [0, -100], [100, 0], [-100, 0], [0, 97], [-100, -100], [100, -100], [100, 100], [-100, 100], [50, 80],
];
const F6_CHOICE_SETS = [
  ['38 公分', '40 平方公分', '26 公分', '13 公分'],
  ['4/5 > 3/5', '4/5 = 3/5', '4/5 < 3/5', '12'],
  ['1 個 1 公升瓶 ＋ 3 杯 250 毫升量杯', '2 個 1 公升瓶', '4 杯 250 毫升量杯', '1 個 1 公升瓶 ＋ 1 杯 250 毫升量杯'],
  ['6', '7', '8'],
];

// 獨立於 renderer 的投影：照 renderer 的相機設定（位置 (px, 高, pz+偏移)、看向 (px, 0, pz)、正交半視野 VIEW_SIZE×寬高比），
// 用 lookAt 的基底向量把世界點投影到螢幕像素
function projectToScreen(point, cam) {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(...a); return a.map((n) => n / l); };
  const pos = [cam.cx, cam.height, cam.cz + cam.offset];
  const forward = norm(sub([cam.cx, 0, cam.cz], pos));
  const right = norm(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const rel = sub(point, pos);
  return {
    x: ((dot(rel, right) / cam.halfW + 1) / 2) * cam.pxW,
    y: ((1 - dot(rel, up) / cam.halfH) / 2) * cam.pxH,
  };
}

function rectsOverlap(a, b) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

// 從 style.css 讀出題目橫幅的實際位置（寬螢幕與 ≤600px 手機各一組），供測試與 renderer 的保留區常數核對
function readBannerCss() {
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  const baseRule = /\.math-quiz-banner \{([^}]*)\}/.exec(css)[1];
  const narrowBlock = /@media \(max-width: 600px\) \{[\s\S]*?\.math-quiz-banner \{([^}]*)\}/.exec(css)[1];
  const pct = (rule) => Number(/top:\s*([\d.]+)%/.exec(rule)[1]) / 100;
  return {
    wideTop: pct(baseRule),
    wideWidth: /width:\s*min\(([\d.]+)vw,\s*(\d+)px\)/.exec(baseRule).slice(1).map(Number),
    narrowTop: pct(narrowBlock),
    narrowVw: Number(/width:\s*([\d.]+)vw/.exec(narrowBlock)[1]) / 100,
  };
}

test('F6：renderer 的橫幅保留區常數與 style.css 的 .math-quiz-banner 位置一致', () => {
  const { labels } = loadRendererLabels();
  const css = readBannerCss();
  const S = labels.ANSWER_LABEL_SAFE;
  assert.equal(css.wideTop, S.bannerTopFrac.wide);
  assert.equal(css.narrowTop, S.bannerTopFrac.narrow);
  assert.equal(css.wideWidth[0] / 100, S.bannerWidth.wideVw);
  assert.equal(css.wideWidth[1], S.bannerWidth.wideMaxPx);
  assert.equal(css.narrowVw, S.bannerWidth.narrowVw);
});

test('F6：各視窗尺寸、各種玩家位置與選項長度下，答案標籤整塊在視窗內、不被橫幅／HUD／搖桿／武器欄遮住、彼此不重疊', () => {
  const { labels } = loadRendererLabels();
  const css = readBannerCss();
  const S = labels.ANSWER_LABEL_SAFE;
  let checkedPads = 0;
  for (const [pxW, pxH] of F6_VIEWPORTS) {
    const halfH = labels.VIEW_SIZE;
    const halfW = halfH * (pxW / pxH);
    const narrowScreen = pxW <= 600;
    const bannerW = narrowScreen ? pxW * css.narrowVw : Math.min((pxW * css.wideWidth[0]) / 100, css.wideWidth[1]);
    const banner = {
      left: (pxW - bannerW) / 2,
      right: (pxW + bannerW) / 2,
      top: pxH * (narrowScreen ? css.narrowTop : css.wideTop),
    };
    banner.bottom = banner.top + S.bannerReservePx;
    const hudTopBar = { left: 0, right: pxW, top: 0, bottom: 56 };
    const joystick = { left: pxW - 112, right: pxW, top: pxH - 112, bottom: pxH };
    const weaponBar = { left: 0, right: pxW - 130, top: pxH - 100, bottom: pxH };
    // 踏板是地面圓台：手機（窄螢幕）一律要求不被橫幅保留區蓋住；寬螢幕貼南側邊界時踏板只能排在玩家側邊，
    // 可能略碰到橫幅的保留高度，所以不檢查橫幅（標籤仍照上面的規則完全避開）
    const padZones = narrowScreen
      ? [['題目橫幅', banner], ['右下搖桿', joystick], ['左下武器欄', weaponBar]]
      : [['右下搖桿', joystick], ['左下武器欄', weaponBar]];

    for (const [px, pz] of F6_PLAYER_SPOTS) {
      for (const choices of F6_CHOICE_SETS) {
        const game = makeBare({ player: { x: px, z: pz, hp: 50, maxHp: 100, speed: 6, magnet: 3.4 } });
        game.renderer = { camera: { right: halfW }, addShake() {} };
        if (halfW < 8 && !game.narrowPadsFit()) {
          // 窄螢幕貼邊放不下時，改走暫停作答（不出現 3D 踏板）
          game.startMathQuiz();
          assert.equal(game.mathMode, 'paused-question', `${pxW}x${pxH} 玩家 (${px},${pz}) 放不下踏板時應暫停作答`);
          continue;
        }
        const pads = game.createAnswerPads(choices);
        const cam = { cx: px, cz: pz, height: labels.CAM_HEIGHT, offset: labels.CAM_OFFSET_Z, halfW, halfH, pxW, pxH };
        const items = pads.map((pad) => {
          const label = labels.createTextLabel(pad.label, 'pad');
          const size = labels.answerLabelSize(label, pad.labelSize);
          return { x: pad.x, z: pad.z, h: size.h, plateW: size.plateW };
        });
        const placed = labels.layoutAnswerLabels(items, { cx: px, cz: pz, halfW, halfH, pxW, pxH });
        const where = `${pxW}x${pxH} 玩家 (${px},${pz}) 選項 ${choices[0]}`;
        const rects = placed.map((p, i) => {
          const c = projectToScreen([p.x, p.y, items[i].z], cam);
          const w = ((items[i].plateW * p.scale) / (2 * halfW)) * pxW;
          const h = ((items[i].h * p.scale) / (2 * halfH)) * pxH;
          return { left: c.x - w / 2, right: c.x + w / 2, top: c.y - h / 2, bottom: c.y + h / 2 };
        });
        rects.forEach((r, i) => {
          const eps = 0.5;
          assert.ok(r.left >= -eps && r.right <= pxW + eps && r.top >= -eps && r.bottom <= pxH + eps, `${where}：標籤 ${i} 超出視窗 ${JSON.stringify(r)}`);
          for (const [name, zone] of [['題目橫幅', banner], ['HUD 頂部列', hudTopBar], ['右下搖桿', joystick], ['左下武器欄', weaponBar]]) {
            assert.equal(rectsOverlap(r, zone), false, `${where}：標籤 ${i} 被${name}遮住 ${JSON.stringify(r)}`);
          }
          for (let j = i + 1; j < rects.length; j++) {
            assert.equal(rectsOverlap(r, rects[j]), false, `${where}：標籤 ${i} 與 ${j} 重疊`);
          }
        });
        // 踏板本身（地面圓台）也要在視窗內，且不被橫幅或底部搖桿／武器欄蓋住
        for (const pad of pads) {
          const c = projectToScreen([pad.x, 0, pad.z], cam);
          const half = (pad.visualSize / 2 / (2 * halfW)) * pxW;
          const padRect = { left: c.x - half, right: c.x + half, top: c.y - half, bottom: c.y + half };
          assert.ok(padRect.left >= 0 && padRect.right <= pxW && padRect.top >= 0 && padRect.bottom <= pxH, `${where}：踏板 ${pad.index} 超出視窗`);
          for (const [name, zone] of padZones) {
            assert.equal(rectsOverlap(padRect, zone), false, `${where}：踏板 ${pad.index} 被${name}遮住`);
          }
          checkedPads++;
        }
      }
    }
  }
  assert.ok(checkedPads > 200, `實際檢查的踏板數太少：${checkedPads}`);
});

test('F6：窄螢幕的答案踏板全排在玩家下方，距離玩家 7 以上且彼此分開', () => {
  for (const halfW of [5.4, 6.24, 7.59]) {
    const game = makeBare();
    game.renderer = { camera: { right: halfW }, addShake() {} };
    for (const choices of [['1', '2', '3', '4'], ['1', '2', '3']]) {
      const pads = game.createAnswerPads(choices);
      assert.ok(pads.every((pad) => pad.z - game.player.z > 5), `halfW ${halfW}：踏板必須在玩家下方（z 較大）`);
      assert.ok(pads.every((pad) => Math.hypot(pad.x - game.player.x, pad.z - game.player.z) >= 7));
      for (let i = 0; i < pads.length; i++) {
        for (let j = i + 1; j < pads.length; j++) {
          assert.ok(Math.hypot(pads[i].x - pads[j].x, pads[i].z - pads[j].z) > 2, `踏板 ${i} 與 ${j} 太近`);
        }
      }
    }
  }
});

// ── F7：Gemini 外審對 F5／F6 的三項邊界問題（先重現、再修） ──
const F7_ARENA_LIMIT = 108;

// 用真實 PixelRenderer 的版面判斷方法（this 只需要相機、視窗像素與答案標籤），組成給 game 用的 renderer 替身
function makeF7Renderer(R, pxW, pxH, player) {
  const halfH = R.labels.VIEW_SIZE;
  return {
    camera: { right: halfH * (pxW / pxH), top: halfH, position: { x: player.x, z: player.z + R.labels.CAM_OFFSET_Z } },
    viewPx: { w: pxW, h: pxH },
    answerPadLabels: Array.from({ length: 4 }, () => R.labels.createTextLabel('', 'pad')),
    addShake() {},
    answerLayoutView: R.PGS.PixelRenderer.prototype.answerLayoutView,
    answerLabelItems: R.PGS.PixelRenderer.prototype.answerLabelItems,
    answerPadsFitView: R.PGS.PixelRenderer.prototype.answerPadsFitView,
  };
}

function padInsideArena(pad) {
  return Math.abs(pad.x) + pad.radius <= F7_ARENA_LIMIT && Math.abs(pad.z) + pad.radius <= F7_ARENA_LIMIT;
}

function makeF7Player(x, z) {
  return { x, z, hp: 50, maxHp: 100, speed: 6, magnet: 3.4 };
}

test('F7-1：窄螢幕踏板圓心加半徑不得超出場地南緣，放不下就改走暫停作答', () => {
  let worldChecked = 0;
  let pausedCount = 0;
  for (const halfW of [3.1, 3.5, 4.2, 5.1, 6.24, 7.59]) {
    for (const pz of [90, 96, 97, 98, 98.4, 99, 100, 102]) {
      for (const px of [0, 60, 100, -100, 103]) {
        const game = makeBare({ player: makeF7Player(px, pz) });
        game.renderer = { camera: { right: halfW, top: 13.5 }, addShake() {} };
        for (let n = 0; n < 12; n++) {
          game.mathMode = 'none';
          game.startMathQuiz();
          const where = `halfW ${halfW} 玩家 (${px},${pz})`;
          if (game.mathMode === 'paused-question') { pausedCount++; continue; }
          assert.equal(game.mathMode, 'world-question');
          for (const pad of game.answerPads) {
            assert.ok(padInsideArena(pad), `${where}：踏板 ${pad.index} 超出場地 (${pad.x.toFixed(2)}, ${pad.z.toFixed(2)}) 半徑 ${pad.radius}`);
            worldChecked++;
          }
        }
      }
    }
  }
  assert.ok(worldChecked > 100, `實際擺出踏板的檢查數太少：${worldChecked}`);
  assert.ok(pausedCount > 0, '應該有放不下而暫停作答的情境');
});

// 在目前會擺出的踏板位置各放一個障礙物，逼 createAnswerPads 走左右微調的候選位置
function makeF7BlockedGame(player, halfW) {
  const game = makeBare({ player: makeF7Player(player.x, player.z) });
  game.renderer = { camera: { right: halfW, top: 13.5 }, addShake() {} };
  const probe = game.createAnswerPads(['1', '2', '3', '4']);
  game.terrainZones = probe.map((pad) => ({ kind: 'obstacle', x: pad.x, z: pad.z, radius: 2 }));
  return game;
}

test('F7-2：寬螢幕玩家貼南側時，微調候選不會把踏板推出場地；放不下改走暫停作答', () => {
  const spots = [[0, 107.6], [0, 108], [50, 107.9], [103, 107], [-103, 106], [100, 100], [-100, 100], [0, 97], [20, 105]];
  let worldChecked = 0;
  for (const [px, pz] of spots) {
    for (let n = 0; n < 12; n++) {
      const game = makeF7BlockedGame({ x: px, z: pz }, 20);
      game.mathMode = 'none';
      game.startMathQuiz();
      if (game.mathMode === 'paused-question') continue;
      for (const pad of game.answerPads) {
        assert.ok(padInsideArena(pad), `玩家 (${px},${pz})：踏板 ${pad.index} 被微調到場地外 (${pad.x.toFixed(2)}, ${pad.z.toFixed(2)})`);
        worldChecked++;
      }
    }
  }
  assert.ok(worldChecked > 0, '至少要有幾個情境仍能正常擺出踏板');
});

test('F7-2：寬螢幕玩家貼南側時，踏板不得落在題目橫幅保留區；會被遮擋就改走暫停作答', () => {
  const R = loadRendererLabels();
  let worldChecked = 0;
  for (const [pxW, pxH] of [[800, 600], [1024, 768], [1280, 720], [1920, 1080]]) {
    for (const [px, pz] of [[0, 97], [0, 102], [0, 107], [100, 100], [-100, 100], [50, 80]]) {
      for (const blocked of [false, true]) {
        for (let n = 0; n < 6; n++) {
          const player = { x: px, z: pz };
          const game = blocked ? makeF7BlockedGame(player, (R.labels.VIEW_SIZE * pxW) / pxH) : makeBare({ player: makeF7Player(px, pz) });
          game.renderer = makeF7Renderer(R, pxW, pxH, player);
          game.mathMode = 'none';
          game.startMathQuiz();
          if (game.mathMode === 'paused-question') continue;
          const cam = game.renderer.camera;
          const banner = R.labels.answerLabelSafeRect(pxW, pxH).banner;
          for (const pad of game.answerPads) {
            const c = projectToScreen([pad.x, 0, pad.z], { cx: px, cz: pz, height: R.labels.CAM_HEIGHT, offset: R.labels.CAM_OFFSET_Z, halfW: cam.right, halfH: cam.top, pxW, pxH });
            const half = (pad.visualSize / 2 / (2 * cam.right)) * pxW;
            const rect = { left: c.x - half, right: c.x + half, top: c.y - half, bottom: c.y + half };
            assert.equal(rectsOverlap(rect, banner), false, `${pxW}x${pxH} 玩家 (${px},${pz})${blocked ? '（有障礙物）' : ''}：踏板 ${pad.index} 被題目橫幅蓋住`);
            worldChecked++;
          }
        }
      }
    }
  }
  assert.ok(worldChecked > 0, '至少要有幾個情境仍能正常擺出踏板');
});

test('F7-3：橫向矮視窗（812×375、667×375、896×414）垂直安全區放不下標籤堆疊時，layoutAnswerLabels 回報放不下', () => {
  const R = loadRendererLabels();
  const labels = R.labels;
  const choices = ['38 公分', '40 平方公分', '26 公分', '13 公分'];
  for (const [pxW, pxH] of [[812, 375], [667, 375], [896, 414]]) {
    const halfH = labels.VIEW_SIZE;
    const halfW = halfH * (pxW / pxH);
    const game = makeBare({ player: makeF7Player(0, 0) });
    game.renderer = { camera: { right: halfW }, addShake() {} };
    const pads = game.createAnswerPads(choices);
    const items = pads.map((pad) => {
      const label = labels.createTextLabel(pad.label, 'pad');
      const size = labels.answerLabelSize(label, pad.labelSize);
      return { x: pad.x, z: pad.z, h: size.h, plateW: size.plateW };
    });
    const placed = labels.layoutAnswerLabels(items, { cx: 0, cz: 0, halfW, halfH, pxW, pxH });
    const where = `${pxW}x${pxH}`;
    const safe = labels.answerLabelSafeRect(pxW, pxH);
    const cam = { cx: 0, cz: 0, height: labels.CAM_HEIGHT, offset: labels.CAM_OFFSET_Z, halfW, halfH, pxW, pxH };
    const rects = placed.map((p, i) => {
      const c = projectToScreen([p.x, p.y, items[i].z], cam);
      const w = ((items[i].plateW * p.scale) / (2 * halfW)) * pxW;
      const h = ((items[i].h * p.scale) / (2 * halfH)) * pxH;
      return { left: c.x - w / 2, right: c.x + w / 2, top: c.y - h / 2, bottom: c.y + h / 2 };
    });
    // 放得下時必須整塊在垂直安全區內、彼此不重疊；放不下就必須明確回報 fits === false
    if (placed.fits !== false) {
      rects.forEach((r, i) => {
        assert.ok(r.top >= safe.top - 0.5 && r.bottom <= safe.bottom + 0.5, `${where}：標籤 ${i} 超出垂直安全區 ${JSON.stringify(r)} 安全區 ${safe.top.toFixed(1)}~${safe.bottom.toFixed(1)}`);
        for (let j = i + 1; j < rects.length; j++) assert.equal(rectsOverlap(r, rects[j]), false, `${where}：標籤 ${i} 與 ${j} 重疊`);
      });
    }
    assert.equal(placed.fits, false, `${where}：垂直安全區只有 ${(safe.bottom - safe.top).toFixed(1)}px，應回報放不下`);
  }
});

test('F7-3：橫向矮視窗開始作答時改走暫停作答；一般視窗仍擺出踏板', () => {
  const R = loadRendererLabels();
  for (const [pxW, pxH] of [[812, 375], [667, 375], [896, 414]]) {
    const game = makeBare({ player: makeF7Player(0, 0) });
    game.renderer = makeF7Renderer(R, pxW, pxH, { x: 0, z: 0 });
    game.startMathQuiz();
    assert.equal(game.mathMode, 'paused-question', `${pxW}x${pxH} 應改走暫停作答`);
    assert.equal(game.answerPads.length, 0);
  }
  for (const [pxW, pxH] of [[800, 600], [1280, 720], [375, 812]]) {
    const game = makeBare({ player: makeF7Player(0, 0) });
    game.renderer = makeF7Renderer(R, pxW, pxH, { x: 0, z: 0 });
    game.startMathQuiz();
    assert.equal(game.mathMode, 'world-question', `${pxW}x${pxH} 應照常擺出踏板`);
  }
});
