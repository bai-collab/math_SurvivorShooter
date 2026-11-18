import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const weaponSource = readFileSync(new URL('../src/weapons.js', import.meta.url), 'utf8');
const runeSource = readFileSync(new URL('../src/runes.js', import.meta.url), 'utf8');
const pixelArtSource = readFileSync(new URL('../src/pixel-art.js', import.meta.url), 'utf8');

function loadData(source, property) {
  const window = { PGS: {} };
  vm.runInNewContext(source, { window }, { filename: `src/${property}.js` });
  return window.PGS[property];
}

const weapons = loadData(weaponSource, 'Weapons');
const runes = loadData(runeSource, 'Runes');
const newWeaponIds = [
  'fraction_splitter',
  'prime_rifle',
  'canal_water_cannon',
  'solar_laser',
  'egret_homing_bow',
  'firecracker_launcher',
];

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function estimateDps(def) {
  if (def.fractionSplit) return def.damage * 3 / def.cooldown;
  if (def.primeRifle) {
    const firstTenPrimeShare = 4 / 10; // 2、3、5、7 四個質數序號
    const averageMultiplier = 1 + firstTenPrimeShare * (def.primeCritMult - 1);
    return def.damage * averageMultiplier / def.cooldown;
  }
  if (def.waterCannon) return def.damage * Math.ceil(def.life / def.streamTick) / def.cooldown;
  if (def.stationaryCharge) return def.damage * def.chargeDamageMult / (def.chargeInterval * def.maxCharge);
  if (def.egretHoming) return def.damage * (1 + def.returnStrikes) / def.cooldown;

  let damagePerVolley = def.damage * (def.pellets || 1) * (def.burstCount || 1);
  if (def.boomerang) damagePerVolley *= 2;
  if (def.chainCount) damagePerVolley *= 1 + def.chainCount * 0.78;
  if (def.clusterCount) damagePerVolley *= 1 + def.clusterCount * 0.55;
  return damagePerVolley / def.cooldown;
}

test('所有武器與符文都有可強化數值和對應像素圖示', () => {
  const weaponIcons = pixelArtSource.match(/const weaponIcons = \{([\s\S]*?)\n    \};/)?.[1] || '';
  const runeIcons = pixelArtSource.match(/const runeIcons = \{([\s\S]*?)\n    \};/)?.[1] || '';

  for (const id of weapons.ALL_IDS) {
    const def = weapons.DEFS[id];
    assert.ok(def.name, `${id} 缺少名稱`);
    assert.ok(def.category, `${id} 缺少分類`);
    assert.ok(weapons.getCardStats(def).length > 0, `${id} 缺少可強化數值`);
    assert.match(weaponIcons, new RegExp(`\\b${id}\\s*:`), `${id} 缺少武器圖示`);
  }

  for (const id of runes.ALL_IDS) {
    const def = runes.DEFS[id];
    assert.ok(def.name, `${id} 缺少名稱`);
    assert.ok(def.cardStats?.length, `${id} 缺少可強化數值`);
    assert.match(runeIcons, new RegExp(`\\b${id}\\s*:`), `${id} 缺少符文圖示`);
  }
});

test('六把新武器的估算 DPS 落在同分類量級，並符合測試容許範圍', () => {
  for (const id of newWeaponIds) {
    const def = weapons.DEFS[id];
    const baseline = median(weapons.ALL_IDS
      .filter((otherId) => !newWeaponIds.includes(otherId) && weapons.DEFS[otherId].category === def.category)
      .map((otherId) => estimateDps(weapons.DEFS[otherId])));
    const ratio = estimateDps(def) / baseline;
    assert.ok(ratio >= 0.6 && ratio <= 1.6, `${id} DPS 比值 ${ratio.toFixed(2)}，超出測試容許範圍`);
    assert.ok(ratio >= 0.8 && ratio <= 1.2, `${id} DPS 比值 ${ratio.toFixed(2)}，未達目標平衡區間`);
  }
});
