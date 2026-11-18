import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const weaponSource = readFileSync(new URL('../src/weapons.js', import.meta.url), 'utf8');
const runeSource = readFileSync(new URL('../src/runes.js', import.meta.url), 'utf8');
const gameSource = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

function createRuntime() {
  const listeners = {};
  const stored = new Map();
  const sandbox = {
    console,
    THREE: {},
    Math: Object.create(Math),
    performance: { now: () => 0 },
    requestAnimationFrame() {},
    addEventListener(name, callback) { listeners[name] = callback; },
    localStorage: {
      getItem(key) { return stored.get(key) || null; },
      setItem(key, value) { stored.set(key, value); },
    },
    document: { getElementById: () => ({ clientWidth: 800, clientHeight: 600, appendChild() {} }) },
  };
  sandbox.window = sandbox;
  sandbox.PGS = {
    Gear: {
      STAGES: [{ id: 'test-stage', name: '測試關卡', groundTint: 0xffffff, hpMult: 1, speedMult: 1, terrains: ['swamp'], numbers: [1, 2, 3], ops: ['+'] }],
      SLOTS: [],
      TERRAINS: {},
      MAX_CARDS_PER_STAT: 5,
      createGearItem: (type, uid) => ({ type, uid, statCards: {} }),
      computeTotalStats: () => ({ hp: 0, mspd: 0, atk: 0, crit: 0, def: 0, dr: 0, aspd: 0 }),
      evalCardFormula: () => ({ valid: false, value: 0 }),
    },
    GamepadController: class { update() {} },
  };
  vm.createContext(sandbox);
  vm.runInContext(weaponSource, sandbox, { filename: 'src/weapons.js' });
  vm.runInContext(runeSource, sandbox, { filename: 'src/runes.js' });
  vm.runInContext(gameSource, sandbox, { filename: 'src/game.js' });

  sandbox.PGS.PixelArt = { buildAllAssets: () => ({ textures: {}, iconDataUrls: {}, runeDataUrls: {}, gearDataUrls: {} }) };
  sandbox.PGS.PixelRenderer = class {
    constructor() { this.camera = { right: 20 }; }
    setStageTint() {}
    addShake() {}
    renderFrame() {}
  };
  sandbox.PGS.RetroAudio = class {
    unlock() {}
    playShot() {}
    playReload() {}
    playLevelUp() {}
    playGem() {}
    playExplosion() {}
    playHurt() {}
  };
  sandbox.PGS.GameUI = class {
    bindGame(game) { this.game = game; }
    syncAll() {}
    renderMenu() { this.menuRenders = (this.menuRenders || 0) + 1; }
    showLevelUp(choices, onPick) { this.choices = choices; this.onPick = onPick; }
    hideLevelUp() {}
    showRunePick() {}
    hideRunePick() {}
  };
  vm.runInContext(mainSource, sandbox, { filename: 'src/main.js' });
  listeners.DOMContentLoaded();
  return { sandbox, game: sandbox.PGS.game, PGS: sandbox.PGS };
}

function makeEnemy(id, x, z = 0, hp = 1000) {
  return {
    id, x, z, hp, maxHp: hp, radius: 0.55, speed: 2, kx: 0, kz: 0,
    slowTimer: 0, slowFactor: 1, freezeTimer: 0, chillCount: 0,
    poisonTimer: 0, poisonDps: 0, burnTimer: 0, burnDps: 0,
    blindTimer: 0, blindAngle: 0, hitFlash: 0, xp: 12,
    goldChance: 0, runeChance: 0, gearChance: 0, cardChance: 0,
  };
}

function startUnlockedRun(game, weaponId) {
  game.unlockAllContent();
  game.startRun(weaponId);
}

test('除錯入口可解鎖全部內容；六把新槍可當起始武器或出現在升級選項', () => {
  const { sandbox, game, PGS } = createRuntime();
  const newIds = ['fraction_splitter', 'prime_rifle', 'canal_water_cannon', 'solar_laser', 'egret_homing_bow', 'firecracker_launcher'];
  assert.ok(newIds.every((id) => !game.isWeaponUnlocked(id)), '六把新槍預設應未解鎖');
  assert.ok(['water', 'rice', 'solar'].every((id) => !game.isRuneUnlocked(id)), '三種新符文預設應未解鎖');
  const unlocked = PGS.debug.unlockAll();
  assert.deepEqual(Array.from(unlocked.weapons), Array.from(PGS.Weapons.ALL_IDS));
  assert.deepEqual(Array.from(unlocked.runes), Array.from(PGS.Runes.ALL_IDS));

  for (const id of newIds) {
    game.save.unlockedWeapons = Array.from(PGS.Weapons.ALL_IDS);
    game.startRun(id);
    assert.equal(game.weapons[0].id, id, `${id} 應能成為起始武器`);

    game.weapons = [game._makeWeaponInstance('pistol')];
    game.save.unlockedWeapons = ['pistol', id];
    sandbox.Math.random = () => 0;
    game.openLevelUp();
    assert.equal(game.ui.choices[0].iconId, id, `${id} 應能出現在升級選項`);
    game.ui.choices[0].apply();
    assert.ok(game.weapons.some((weapon) => weapon.id === id));
  }
});

test('新符文可鑲嵌；五種共鳴都能依照符文組合判定', () => {
  const { game, PGS } = createRuntime();
  game.startRun('pistol');
  const weapon = game._makeWeaponInstance('pistol');
  game.weapons = [weapon];
  for (const id of ['water', 'rice', 'solar']) assert.equal(game.applyRuneToWeapon(weapon, id), true);
  assert.deepEqual(Array.from(weapon.runes), ['water', 'rice', 'solar']);

  for (const resonance of PGS.Runes.RESONANCES) {
    weapon.runes = Array.from(resonance.runes);
    assert.ok(game.getWeaponResonances(weapon).some((active) => active.id === resonance.id), resonance.name);
  }
});

test('分數分裂槍會依序生成 1/2 與 1/4 傷害彈', () => {
  const { game } = createRuntime();
  startUnlockedRun(game, 'fraction_splitter');
  const target = makeEnemy(1, 3);
  // 子彈繼承父彈已命中的目標、不會回頭再打同一隻怪，所以 1/2 子彈要在第二隻怪身上才會再分裂成 1/4。
  game.enemies = [target, makeEnemy(2, 4.3)];
  const weapon = game.weapons[0];
  game.fireWeapon(weapon, target);
  assert.equal(game.projectiles[0].sprite, 'fraction');

  for (let i = 0; i < 4 && game.projectiles.length !== 2; i++) game.updateProjectiles(0.05);
  assert.equal(game.projectiles.length, 2);
  assert.ok(game.projectiles.every((projectile) => projectile.fractionLabel === '1/2' && projectile.damage === 12));

  game.updateProjectiles(0.05);
  assert.equal(game.projectiles.length, 4);
  assert.ok(game.projectiles.every((projectile) => projectile.fractionLabel === '1/4' && projectile.damage === 6));
});

test('質數步槍記錄序號並讓第 2 發必定暴擊', () => {
  const { game } = createRuntime();
  startUnlockedRun(game, 'prime_rifle');
  const target = makeEnemy(1, 4);
  game.player.critChance = 0;
  const weapon = game.weapons[0];

  game.fireWeapon(weapon, target);
  assert.equal(weapon.shotCount, 1);
  assert.equal(game.projectiles.at(-1).primeShot, false);
  game.fireWeapon(weapon, target);
  assert.equal(weapon.shotCount, 2);
  assert.equal(game.projectiles.at(-1).primeShot, true);
  assert.equal(game.projectiles.at(-1).damage, 9 * 1.75);
  assert.equal(game.projectiles.at(-1).color, 0x88f8ff);
});

test('水圳水槍以錐形水柱命中並在落點留下減速水窪', () => {
  const { game } = createRuntime();
  startUnlockedRun(game, 'canal_water_cannon');
  const target = makeEnemy(1, 4);
  game.enemies = [target];
  game.fireWeapon(game.weapons[0], target);
  assert.equal(game.projectiles[0].waterStream, true);
  game.updateProjectiles(0.05);
  assert.ok(target.hp < 1000);
  assert.ok(target.slowFactor < 1);

  for (let i = 0; i < 12 && game.projectiles.length; i++) game.updateProjectiles(0.05);
  const puddle = game.waterPuddles.find((zone) => zone.life > 0 && zone.slowPct === 40);
  assert.ok(puddle);
  assert.ok(Number.isFinite(puddle.x) && Number.isFinite(puddle.z), '水窪應出現在水柱落點');
});

test('太陽光電雷射站立三段蓄能後貫穿命中', () => {
  const { game } = createRuntime();
  startUnlockedRun(game, 'solar_laser');
  const target = makeEnemy(1, 5);
  game.enemies = [target];
  for (let i = 0; i < 3; i++) game.updateWeapons(0.72);
  assert.ok(target.hp < 1000);
  assert.equal(game.weapons[0].solarCharge, 0);
  assert.ok(game.effects.some((effect) => effect.maxScaleX >= 10), '雷射應使用既有特效池繪製長光束');
});

test('白鷺追蹤箭命中後會折返並追擊另一隻怪物', () => {
  const { game } = createRuntime();
  startUnlockedRun(game, 'egret_homing_bow');
  const first = makeEnemy(1, 2);
  const second = makeEnemy(2, 5);
  game.enemies = [first, second];
  game.fireWeapon(game.weapons[0], first);
  game.updateProjectiles(0.05);
  assert.equal(game.projectiles[0].returning, true);
  for (let i = 0; i < 30; i++) game.updateProjectiles(0.05);
  assert.ok(second.hp < 1000, '折返後應鎖定尚未命中的目標');
});

test('鞭炮主爆會建立四顆沿用投射物池的小鞭炮', () => {
  const { game } = createRuntime();
  startUnlockedRun(game, 'firecracker_launcher');
  const target = makeEnemy(1, 4);
  game.enemies = [target];
  game.fireWeapon(game.weapons[0], target);
  const mainBomb = game.projectiles[0];
  assert.equal(mainBomb.clusterCount, 4);
  game.projectiles = [];
  game.explodeGrenade(mainBomb);
  assert.equal(game.projectiles.length, 4);
  assert.ok(game.projectiles.every((projectile) => projectile.sprite === 'firecracker'));
});

test('冰水共鳴會凍結踏入水窪的怪物；稻穗吸血共鳴加強稻穀掉落', () => {
  const { sandbox, game } = createRuntime();
  game.startRun('pistol');
  const frozenWeapon = game._makeWeaponInstance('pistol');
  frozenWeapon.runes = ['ice', 'water'];
  const frozenEnemy = makeEnemy(1, 1);
  game.enemies = [frozenEnemy];
  game.applyStatusOnHit(frozenEnemy, { runes: frozenWeapon.runes, weaponRef: frozenWeapon, damage: 10 });
  game.updateWaterPuddles(0.05);
  assert.ok(game.waterPuddles.some((zone) => zone.frozen));
  assert.ok(frozenEnemy.freezeTimer > 0);

  const riceWeapon = game._makeWeaponInstance('pistol');
  riceWeapon.runes = ['rice', 'vampire'];
  const riceEnemy = makeEnemy(2, 2, 0, 2);
  game.enemies = [riceEnemy];
  game.vampireRuneRate = 0;
  game.runNormalRuneRate = 0;
  game.gearDropRate = 0;
  game.cardDropRate = 0;
  sandbox.Math.random = () => 0.25;
  game.applyStatusOnHit(riceEnemy, { runes: riceWeapon.runes, weaponRef: riceWeapon, damage: 1 });
  game.damageEnemy(riceEnemy, 5, 0, 0, { runes: riceWeapon.runes, weaponRef: riceWeapon });
  const rice = game.pickups.find((pickup) => pickup.kind === 'rice');
  assert.ok(rice);
  assert.equal(rice.heal, 18);
  assert.equal(rice.xp, 7);
});

test('光電符文累積五次命中後釋放玩家周圍脈衝', () => {
  const { game } = createRuntime();
  game.startRun('pistol');
  const weapon = game._makeWeaponInstance('pistol');
  weapon.runes = ['solar'];
  const target = makeEnemy(1, 2);
  game.enemies = [target];
  for (let i = 0; i < 5; i++) game.applyStatusOnHit(target, { runes: ['solar'], weaponRef: weapon, damage: 1 });
  assert.equal(weapon.solarRuneEnergy, 0);
  assert.ok(target.hp < 1000);
});

test('過載、導電網與正午烈陽共鳴會執行各自效果', () => {
  const { game } = createRuntime();
  startUnlockedRun(game, 'pistol');
  const weapon = game._makeWeaponInstance('pistol');
  weapon.runes = ['fire', 'thunder'];
  const overloadTarget = makeEnemy(1, 1);
  const overloadNeighbor = makeEnemy(2, 2.4);
  game.enemies = [overloadTarget, overloadNeighbor];
  game.applyStatusOnHit(overloadTarget, { runes: weapon.runes, weaponRef: weapon, damage: 20 });
  assert.ok(overloadNeighbor.hp < 1000, '過載爆炸應傷到目標附近的怪物');

  weapon.runes = ['thunder', 'water'];
  const conductor = makeEnemy(3, 1);
  const chained = makeEnemy(4, 3);
  game.enemies = [conductor, chained];
  game.applyStatusOnHit(conductor, { runes: weapon.runes, weaponRef: weapon, damage: 20 });
  game.triggerChainLightning(conductor, { chainCount: 1, chainRange: 2.5, damage: 10, weaponRef: weapon });
  assert.ok(chained.hp < 1000, '導電網應沿水窪增加一次跳電');

  weapon.runes = ['light', 'solar'];
  const blinded = makeEnemy(5, 5);
  game.enemies = [blinded];
  for (let i = 0; i < 5; i++) game.chargeSolarRune(weapon);
  assert.ok(blinded.blindTimer >= 1.2, '正午烈陽脈衝應擴大範圍並致盲');
});
