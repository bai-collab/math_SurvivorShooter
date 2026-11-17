(function (global) {
  'use strict';

  const PGS = (global.PGS = global.PGS || {});

  const SAVE_KEY = 'pgs_save_v1';
  const ARENA_LIMIT = 108;

  const ENEMY_ARCHETYPES = {
    crawler: { hp: 28, speed: 3.1, radius: 0.55, halfH: 0.62, shadowScale: 0.85, damage: 8, atkCd: 0.7, xp: 10, goldChance: 0.08, runeChance: 0.025, gearChance: 0.018, cardChance: 0.05 },
    runner: { hp: 22, speed: 5.2, radius: 0.55, halfH: 0.72, shadowScale: 0.9, damage: 11, atkCd: 0.5, xp: 14, goldChance: 0.12, runeChance: 0.035, gearChance: 0.022, cardChance: 0.06 },
    tank: { hp: 115, speed: 2.1, radius: 0.88, halfH: 0.95, shadowScale: 1.35, damage: 16, atkCd: 1.0, xp: 32, goldChance: 0.28, runeChance: 0.08, gearChance: 0.06, cardChance: 0.14 },
    elite: { hp: 420, speed: 2.75, radius: 1.05, halfH: 1.15, shadowScale: 1.6, damage: 24, atkCd: 0.8, xp: 120, goldChance: 1.0, runeChance: 0.5, gearChance: 0.45, cardChance: 1.0 },
    // 1. 進戰類 - 基礎怪物
    dagger: { hp: 24, speed: 5.0, radius: 0.55, halfH: 0.72, shadowScale: 0.85, damage: 6, atkCd: 0.42, xp: 11, goldChance: 0.09, runeChance: 0.025, gearChance: 0.02, cardChance: 0.05 },
    blade: { hp: 58, speed: 3.1, radius: 0.7, halfH: 0.82, shadowScale: 1.1, damage: 14, atkCd: 0.9, xp: 18, goldChance: 0.14, runeChance: 0.04, gearChance: 0.03, cardChance: 0.08 },
    spear: { hp: 32, speed: 4.6, radius: 0.58, halfH: 0.72, shadowScale: 0.9, damage: 7, atkCd: 0.48, onHitStatus: 'bleed', xp: 14, goldChance: 0.12, runeChance: 0.035, gearChance: 0.025, cardChance: 0.06 },
    // 2. 中程類 - 每 200 隻出現 1 隻
    archer: { hp: 95, speed: 2.0, radius: 0.65, halfH: 0.82, shadowScale: 1.0, damage: 24, atkCd: 2.4, range: 12, projSprite: 'e_arrow', projSpeed: 12.5, xp: 85, goldChance: 0.8, runeChance: 0.25, gearChance: 0.25, cardChance: 0.7 },
    slinger: { hp: 80, speed: 3.2, radius: 0.65, halfH: 0.82, shadowScale: 1.0, damage: 8, atkCd: 1.5, range: 10, projSprite: 'e_stone', projSpeed: 9.5, onHitStatus: 'stun', xp: 85, goldChance: 0.8, runeChance: 0.25, gearChance: 0.25, cardChance: 0.7 },
    // 3. 遠程魔法類 - 每 1000 隻出現 1 隻
    mage_fire: { hp: 190, speed: 2.3, radius: 0.72, halfH: 0.9, shadowScale: 1.15, damage: 14, atkCd: 2.0, range: 15, projSprite: 'e_fire', projSpeed: 9.0, onHitStatus: 'burn', xp: 240, goldChance: 1.0, runeChance: 0.7, gearChance: 0.75, cardChance: 1.0 },
    mage_ice: { hp: 190, speed: 2.3, radius: 0.72, halfH: 0.9, shadowScale: 1.15, damage: 12, atkCd: 2.0, range: 15, projSprite: 'e_ice', projSpeed: 9.0, onHitStatus: 'chill', xp: 240, goldChance: 1.0, runeChance: 0.7, gearChance: 0.75, cardChance: 1.0 },
    mage_thunder: { hp: 190, speed: 2.3, radius: 0.72, halfH: 0.9, shadowScale: 1.15, damage: 15, atkCd: 2.2, range: 15, projSprite: 'e_thunder', projSpeed: 10.5, onHitStatus: 'paralyze', xp: 240, goldChance: 1.0, runeChance: 0.7, gearChance: 0.75, cardChance: 1.0 },
  };

  const DEFAULT_UNLOCKED_WEAPONS = ['pistol', 'revolver', 'dual_smg', 'venom_pistol'];
  const DEFAULT_UNLOCKED_RUNES = ['fire', 'thunder'];

  function createDefaultSave() {
    const g1 = PGS.Gear.createGearItem('weapon', 1, 'basic');
    const g2 = PGS.Gear.createGearItem('shield', 2, 'basic');
    return {
      gold: 0,
      bestTime: 0,
      bestKills: 0,
      nextUid: 10,
      upgrades: { might: 0, vitality: 0, haste: 0 },
      equipped: { weapon: 1, shield: 2, glove1: null, glove2: null, boot1: null, boot2: null },
      gearBag: [g1, g2],
      unlockedWeapons: DEFAULT_UNLOCKED_WEAPONS.slice(),
      unlockedRunes: DEFAULT_UNLOCKED_RUNES.slice(),
      freeExplores: 1,
      weaponCards: {},
      runeCards: {},
      cards: [
        { uid: 3, kind: 'num', val: 2 },
        { uid: 4, kind: 'num', val: 5 },
        { uid: 5, kind: 'op', val: '+' },
        { uid: 6, kind: 'op', val: '-' },
      ],
    };
  }

  function loadSave() {
    const def = createDefaultSave();
    try {
      const raw = global.localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          gold: parsed.gold || 0,
          bestTime: parsed.bestTime || 0,
          bestKills: parsed.bestKills || 0,
          nextUid: parsed.nextUid || def.nextUid,
          upgrades: {
            might: parsed.upgrades?.might || 0,
            vitality: parsed.upgrades?.vitality || 0,
            haste: parsed.upgrades?.haste || 0,
          },
          equipped: parsed.equipped || def.equipped,
          gearBag: Array.isArray(parsed.gearBag) ? parsed.gearBag.map((g) => PGS.Gear.normalizeGearItem(g)) : def.gearBag,
          unlockedWeapons: Array.isArray(parsed.unlockedWeapons) && parsed.unlockedWeapons.length ? parsed.unlockedWeapons : def.unlockedWeapons,
          unlockedRunes: Array.isArray(parsed.unlockedRunes) && parsed.unlockedRunes.length ? parsed.unlockedRunes : def.unlockedRunes,
          freeExplores: typeof parsed.freeExplores === 'number' ? Math.max(0, parsed.freeExplores) : 1,
          weaponCards: parsed.weaponCards && typeof parsed.weaponCards === 'object' ? parsed.weaponCards : {},
          runeCards: parsed.runeCards && typeof parsed.runeCards === 'object' ? parsed.runeCards : {},
          cards: Array.isArray(parsed.cards) ? parsed.cards : def.cards,
        };
      }
    } catch (_) {}
    return def;
  }

  function writeSave(save) {
    try {
      global.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (_) {}
  }

  class SurvivorGame {
    constructor(renderer, audio, ui) {
      this.renderer = renderer;
      this.audio = audio;
      this.ui = ui;

      this.save = loadSave();
      this.stateName = 'menu'; // menu | playing | levelup | gameover
      this.selectedStarter = 'pistol';
      this.selectedStarterRune = null;
      this.selectedStageId = PGS.Gear.STAGES[0].id;
      this.shakeEnabled = true;

      this.keys = {};
      this.joyVec = { x: 0, z: 0 };
      this.gamepad = new PGS.GamepadController();
      this.gamepad.onPauseToggle = () => this.togglePause();

      this.nextEnemyId = 1;
      this.resetRunState();
      this._bindInputs();
    }

    _bindInputs() {
      global.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !e.repeat && (this.stateName === 'playing' || this.stateName === 'paused')) {
          e.preventDefault();
          this.togglePause();
          return;
        }
        const k = e.key.toLowerCase();
        this.keys[k] = true;
        if (this.stateName === 'levelup') {
          if (k === '1') this.ui.pickChoice(0);
          else if (k === '2') this.ui.pickChoice(1);
          else if (k === '3') this.ui.pickChoice(2);
        }
      });
      global.addEventListener('keyup', (e) => {
        this.keys[e.key.toLowerCase()] = false;
      });
    }

    getStage() {
      return PGS.Gear.STAGES.find((s) => s.id === this.selectedStageId) || PGS.Gear.STAGES[0];
    }

    resetRunState() {
      const vitBonus = this.save.upgrades.vitality * 20;
      const hasteBonus = 1 + this.save.upgrades.haste * 0.08;
      const mightBonus = 1 + this.save.upgrades.might * 0.1;
      const gearStats = PGS.Gear.computeTotalStats(this.save);
      const stage = this.getStage();
      this.renderer.setStageTint(stage.groundTint);
      const totalHp = Math.max(20, 100 + vitBonus + gearStats.hp);

      this.player = {
        x: 0,
        z: 0,
        facing: 1,
        moving: false,
        walkTimer: 0,
        hp: totalHp,
        maxHp: totalHp,
        speed: Math.max(2.5, 6.6 * hasteBonus * (1 + gearStats.mspd * 0.01)),
        magnet: 3.4,
        globalDamageMult: mightBonus,
        flatAtk: gearStats.atk,
        critChance: Math.max(0, Math.min(85, gearStats.crit)),
        def: gearStats.def,
        dr: Math.max(-75, Math.min(100, gearStats.dr)),
        globalRateMult: Math.max(0.3, 1 + gearStats.aspd * 0.01),
        invuln: 0,
        paralyzeTimer: 0,
        stunTimer: 0,
        bleedTimer: 0,
        bleedTick: 0,
        burnTimer: 0,
        burnTick: 0,
        chillTimer: 0,
        poisonTick: 0,
        inSwamp: false,
        inPoison: false,
        inIce: false,
        level: 1,
        xp: 0,
        nextXp: 50,
      };

      // 進場時確定本局掉落機率：吸血約 1/500，其餘符文約 1/50~1/200，局外裝備約 1/200，卡牌約 1/35~1/50
      this.vampireRuneRate = 1 / 500;
      this.runNormalRuneInterval = 50 + Math.floor(Math.random() * 151);
      this.runNormalRuneRate = 1 / this.runNormalRuneInterval;
      this.gearDropRate = 1 / 200;
      this.runCardInterval = 35 + Math.floor(Math.random() * 16);
      this.cardDropRate = 1 / this.runCardInterval;

      if (!this.isWeaponUnlocked(this.selectedStarter)) {
        this.selectedStarter = this.save.unlockedWeapons[0] || 'pistol';
      }
      if (this.selectedStarterRune && !this.isRuneUnlocked(this.selectedStarterRune)) {
        this.selectedStarterRune = null;
      }

      this.weapons = [this._makeWeaponInstance(this.selectedStarter)];
      if (this.selectedStarterRune) {
        this.applyRuneToWeapon(this.weapons[0], this.selectedStarterRune);
      }
      this.enemies = [];
      this.projectiles = [];
      this.enemyProjectiles = [];
      this.telegraphs = [];
      this.pickups = [];
      this.effects = [];
      this.vortexes = [];
      this.terrainZones = [];
      this.initTerrainZones(stage);

      this.elapsed = 0;
      this.kills = 0;
      this.runGold = 0;
      this.totalSpawned = 0;
      this.spawnTimer = 0.4;
      this.eliteTimer = 45;
    }

    startRun(starterId) {
      if (starterId) this.selectedStarter = starterId;
      this.audio.unlock();
      this.resetRunState();
      this.stateName = 'playing';
      this.ui.syncAll(this);
    }

    buyMetaUpgrade(key) {
      const cur = this.save.upgrades[key] || 0;
      const cost = 30 + cur * 25;
      if (cur >= 5 || this.save.gold < cost) return false;
      this.save.gold -= cost;
      this.save.upgrades[key] = cur + 1;
      writeSave(this.save);
      this.audio.playLevelUp();
      return true;
    }

    equipGear(slotId, gearUid) {
      const gear = this.save.gearBag.find((g) => g.uid === gearUid);
      const slot = PGS.Gear.SLOTS.find((s) => s.id === slotId);
      if (!gear || !slot || gear.type !== slot.type) return false;
      for (const s of PGS.Gear.SLOTS) {
        if (this.save.equipped[s.id] === gearUid) {
          this.save.equipped[s.id] = null;
        }
      }
      this.save.equipped[slotId] = gearUid;
      writeSave(this.save);
      return true;
    }

    unequipSlot(slotId) {
      if (!this.save.equipped[slotId]) return false;
      this.save.equipped[slotId] = null;
      writeSave(this.save);
      return true;
    }

    isWeaponUnlocked(id) {
      return this.save.unlockedWeapons.includes(id);
    }

    isRuneUnlocked(id) {
      return this.save.unlockedRunes.includes(id);
    }

    unlockWeapon(id) {
      if (!PGS.Weapons.DEFS[id] || this.isWeaponUnlocked(id)) return false;
      this.save.unlockedWeapons.push(id);
      writeSave(this.save);
      return true;
    }

    unlockRune(id) {
      if (!PGS.Runes.DEFS[id] || this.isRuneUnlocked(id)) return false;
      this.save.unlockedRunes.push(id);
      writeSave(this.save);
      return true;
    }

    getExploreCost() {
      return 50;
    }

    canStartExploreMiniGame() {
      return (this.save.freeExplores || 0) > 0 || this.save.gold >= this.getExploreCost();
    }

    consumeExploreCost() {
      if ((this.save.freeExplores || 0) > 0) {
        this.save.freeExplores -= 1;
        writeSave(this.save);
        return 'free';
      }
      const cost = this.getExploreCost();
      if (this.save.gold >= cost) {
        this.save.gold -= cost;
        writeSave(this.save);
        return 'gold';
      }
      return null;
    }

    grantExploreBonus() {
      const bonusGold = 30;
      this.save.gold += bonusGold;
      const uid = this.save.nextUid++;
      const card = Math.random() < 0.65
        ? { uid, kind: 'num', val: 1 + Math.floor(Math.random() * 6) }
        : { uid, kind: 'op', val: ['+', '-', '×'][Math.floor(Math.random() * 3)] };
      this.save.cards.push(card);
      writeSave(this.save);
      return { bonusGold, card };
    }

    grantExploreSupply(supplyType) {
      const bonusGold = 35;
      this.save.gold += bonusGold;
      if (supplyType === 'gear') {
        const types = ['weapon', 'shield', 'glove', 'boot'];
        const t = types[Math.floor(Math.random() * types.length)];
        const tiers = ['basic', 'fine', 'fine'];
        const tier = tiers[Math.floor(Math.random() * tiers.length)];
        const gear = PGS.Gear.createGearItem(t, this.save.nextUid++, tier);
        this.save.gearBag.push(gear);
        writeSave(this.save);
        return { bonusGold, gear };
      }
      const uid = this.save.nextUid++;
      const card = supplyType === 'op_card'
        ? { uid, kind: 'op', val: ['+', '-', '×'][Math.floor(Math.random() * 3)] }
        : supplyType === 'num_card'
          ? { uid, kind: 'num', val: 2 + Math.floor(Math.random() * 8) }
          : (Math.random() < 0.5
            ? { uid, kind: 'num', val: 2 + Math.floor(Math.random() * 8) }
            : { uid, kind: 'op', val: ['+', '-', '×'][Math.floor(Math.random() * 3)] });
      this.save.cards.push(card);
      writeSave(this.save);
      return { bonusGold, card };
    }

    _evalSlotStat(statDef, cards) {
      const res = PGS.Gear.evalCardFormula(cards || []);
      let val = statDef.base + (res.valid ? res.value : 0);
      if (statDef.min != null) val = Math.max(statDef.min, val);
      if (statDef.max != null) val = Math.min(statDef.max, val);
      if (statDef.round) val = Math.round(val);
      return val;
    }

    getWeaponEffectiveStats(weaponId) {
      const def = PGS.Weapons.DEFS[weaponId];
      const out = {
        damage: def.damage,
        pellets: def.pellets,
        pierce: def.pierce,
        bounces: def.bounces,
        chainCount: def.chainCount || 0,
        magSize: def.magSize || 0,
        splashRadius: def.splashRadius || 0,
        ratePct: 0,
      };
      const slotDefs = PGS.Weapons.getCardStats(def);
      const map = this.save.weaponCards[weaponId] || {};
      for (const s of slotDefs) {
        out[s.key] = this._evalSlotStat(s, map[s.key]);
      }
      return out;
    }

    getRuneEffectiveStats(runeId) {
      const def = PGS.Runes.DEFS[runeId];
      const out = {};
      if (!def || !def.cardStats) return out;
      const map = this.save.runeCards[runeId] || {};
      for (const s of def.cardStats) {
        out[s.key] = this._evalSlotStat(s, map[s.key]);
      }
      return out;
    }

    _makeWeaponInstance(id) {
      const inst = PGS.Weapons.createInstance(id);
      const eff = this.getWeaponEffectiveStats(id);
      inst.eff = eff;
      if (eff.magSize > 0) inst.ammo = eff.magSize;
      return inst;
    }

    insertCardToCollection(group, targetId, statKey, cardUid) {
      const bag = group === 'weapon' ? this.save.weaponCards : this.save.runeCards;
      const cardIdx = this.save.cards.findIndex((c) => c.uid === cardUid);
      if (cardIdx === -1) return false;
      if (!bag[targetId]) bag[targetId] = {};
      const list = bag[targetId][statKey] || [];
      if (list.length >= PGS.Gear.MAX_CARDS_PER_STAT) return false;
      const [card] = this.save.cards.splice(cardIdx, 1);
      list.push(card);
      bag[targetId][statKey] = list;
      writeSave(this.save);
      return true;
    }

    removeCardFromCollection(group, targetId, statKey, cardIdx) {
      const bag = group === 'weapon' ? this.save.weaponCards : this.save.runeCards;
      const map = bag[targetId];
      if (!map) return false;
      const list = map[statKey] || [];
      if (cardIdx < 0 || cardIdx >= list.length) return false;
      const [card] = list.splice(cardIdx, 1);
      this.save.cards.push(card);
      writeSave(this.save);
      return true;
    }

    sellCard(cardUid) {
      const idx = this.save.cards.findIndex((c) => c.uid === cardUid);
      if (idx === -1) return false;
      this.save.cards.splice(idx, 1);
      this.save.gold += 5;
      writeSave(this.save);
      this.audio.playGem();
      return true;
    }

    insertCardToStat(gearUid, statKey, cardUid) {
      const gear = this.save.gearBag.find((g) => g.uid === gearUid);
      const cardIdx = this.save.cards.findIndex((c) => c.uid === cardUid);
      if (!gear || cardIdx === -1) return false;
      const list = gear.statCards[statKey] || [];
      if (list.length >= PGS.Gear.MAX_CARDS_PER_STAT) return false;
      const [card] = this.save.cards.splice(cardIdx, 1);
      list.push(card);
      gear.statCards[statKey] = list;
      writeSave(this.save);
      return true;
    }

    removeCardFromStat(gearUid, statKey, cardIdx) {
      const gear = this.save.gearBag.find((g) => g.uid === gearUid);
      if (!gear) return false;
      const list = gear.statCards[statKey] || [];
      if (cardIdx < 0 || cardIdx >= list.length) return false;
      const [card] = list.splice(cardIdx, 1);
      this.save.cards.push(card);
      writeSave(this.save);
      return true;
    }

    spawnFx(x, z, color, size, life, y = 0.55, flat = false) {
      if (this.effects.length > 320) return;
      this.effects.push({ x, z, y, color, size, maxSize: size, life, maxLife: life, flat });
    }

    spawnEnemy(type) {
      const arch = ENEMY_ARCHETYPES[type];
      const angle = Math.random() * Math.PI * 2;
      const dist = 16 + Math.random() * 6;
      const stage = this.getStage();
      const waveScale = (1 + Math.floor(this.elapsed / 35) * 0.22) * stage.hpMult;

      this.enemies.push({
        id: this.nextEnemyId++,
        type,
        x: Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, this.player.x + Math.cos(angle) * dist)),
        z: Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, this.player.z + Math.sin(angle) * dist)),
        vx: 0,
        vz: 0,
        kx: 0,
        kz: 0,
        hp: Math.round(arch.hp * waveScale),
        maxHp: Math.round(arch.hp * waveScale),
        speed: arch.speed * stage.speedMult,
        radius: arch.radius,
        halfH: arch.halfH,
        shadowScale: arch.shadowScale,
        damage: arch.damage,
        atkCd: arch.atkCd || 0.65,
        atkTimer: 0,
        range: arch.range || 0,
        projSprite: arch.projSprite || null,
        projSpeed: arch.projSpeed || 0,
        onHitStatus: arch.onHitStatus || null,
        xp: arch.xp,
        goldChance: arch.goldChance,
        runeChance: arch.runeChance,
        gearChance: arch.gearChance,
        cardChance: arch.cardChance,
        walkPhase: Math.random() * 6,
        hitFlash: 0,
        slowTimer: 0,
        freezeTimer: 0,
        chillCount: 0,
        poisonTimer: 0,
        poisonDps: 0,
        burnTimer: 0,
        burnDps: 0,
        blindTimer: 0,
        blindAngle: 0,
      });
    }

    update(dt) {
      this.gamepad.update(dt, this.stateName);

      if (this.stateName !== 'playing') {
        this.renderer.renderFrame(this.getRenderState(), dt);
        return;
      }

      const clampedDt = Math.min(dt, 0.05);
      this.elapsed += clampedDt;

      this.updateTerrains(clampedDt);
      if (this.stateName !== 'playing') return;
      this.updatePlayerStatuses(clampedDt);
      if (this.stateName !== 'playing') return;
      this.updatePlayer(clampedDt);
      this.updateSpawner(clampedDt);
      const weaponRateScale = (this.player.inIce ? 0.6 : 1) * (this.player.chillTimer > 0 ? 0.55 : 1);
      this.updateWeapons(clampedDt * weaponRateScale);
      this.updateProjectiles(clampedDt);
      this.updateEnemyProjectiles(clampedDt);
      this.updateTelegraphs(clampedDt);
      if (this.stateName !== 'playing') return;
      this.updateVortexes(clampedDt);
      this.updateEnemies(clampedDt);
      this.updatePickups(clampedDt);
      this.updateEffects(clampedDt);

      this.renderer.renderFrame(this.getRenderState(), clampedDt);
      this.ui.updateHud(this);
    }

    getRenderState() {
      return {
        player: this.player,
        enemies: this.enemies,
        projectiles: this.projectiles,
        enemyProjectiles: this.enemyProjectiles,
        telegraphs: this.telegraphs,
        pickups: this.pickups,
        effects: this.effects,
        terrainZones: this.terrainZones,
        shakeEnabled: this.shakeEnabled,
      };
    }

    updatePlayer(dt) {
      if (this.player.invuln > 0) this.player.invuln = Math.max(0, this.player.invuln - dt);
      if (this.player.paralyzeTimer > 0 || this.player.stunTimer > 0) {
        this.player.moving = false;
        this.resolveObstacleCollision(this.player, 0.55);
        return;
      }

      let mx = this.joyVec.x + this.gamepad.moveX;
      let mz = this.joyVec.z + this.gamepad.moveZ;
      if (this.keys['w'] || this.keys['arrowup']) mz -= 1;
      if (this.keys['s'] || this.keys['arrowdown']) mz += 1;
      if (this.keys['a'] || this.keys['arrowleft']) mx -= 1;
      if (this.keys['d'] || this.keys['arrowright']) mx += 1;

      const len = Math.hypot(mx, mz);
      if (len > 0.05) {
        const nx = mx / Math.max(1, len);
        const nz = mz / Math.max(1, len);
        const spd = this.player.speed * (this.player.inSwamp ? 0.55 : 1);
        this.player.x = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, this.player.x + nx * spd * dt));
        this.player.z = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, this.player.z + nz * spd * dt));
        if (Math.abs(nx) > 0.1) this.player.facing = nx > 0 ? 1 : -1;
        this.player.moving = true;
        this.player.walkTimer += dt;
      } else {
        this.player.moving = false;
      }

      this.resolveObstacleCollision(this.player, 0.55);
    }

    updateSpawner(dt) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.enemies.length < 320) {
        const mins = this.elapsed / 60;
        const batch = 1 + Math.floor(mins * 1.8);
        for (let i = 0; i < batch; i++) {
          const r = Math.random();
          if (r < 0.36) this.spawnEnemy('dagger');
          else if (r < 0.68) this.spawnEnemy('blade');
          else this.spawnEnemy('spear');

          this.totalSpawned++;
          if (this.totalSpawned % 200 === 0) {
            this.spawnEnemy(Math.random() < 0.5 ? 'archer' : 'slinger');
          }
          if (this.totalSpawned % 1000 === 0) {
            const mages = ['mage_fire', 'mage_ice', 'mage_thunder'];
            this.spawnEnemy(mages[Math.floor(Math.random() * mages.length)]);
          }
        }
        this.spawnTimer = Math.max(0.28, 1.05 - mins * 0.35);
      }

      this.eliteTimer -= dt;
      if (this.eliteTimer <= 0) {
        this.spawnEnemy('elite');
        this.eliteTimer = 40;
      }
    }

    updateWeapons(dt) {
      for (let i = 0; i < this.weapons.length; i++) {
        const w = this.weapons[i];
        const def = w.def;

        // 換彈機制（如標準手槍震波、散彈、左輪）
        if (w.reloading > 0) {
          w.reloading -= dt;
          if (w.reloading <= 0) {
            w.reloading = 0;
            w.ammo = (w.eff && w.eff.magSize) || def.magSize;
            this.audio.playReload();
          }
          continue;
        }

        // 過熱機制（轉輪機槍）
        if (def.heatPerShot) {
          if (w.overheated > 0) {
            w.overheated -= dt;
            w.heat = Math.max(0, (w.overheated / def.overheatLock) * 100);
            if (w.overheated <= 0) {
              w.overheated = 0;
              w.heat = 0;
            }
            continue;
          }
        }

        // 連發點射處理（如脈衝突擊步槍）
        if (w.burstLeft > 0) {
          w.burstTimer -= dt;
          if (w.burstTimer <= 0) {
            const bt =
              w.burstTarget && this.enemies.includes(w.burstTarget)
                ? w.burstTarget
                : PGS.Weapons.findTarget(this.player, this.enemies, def.targeting, def.range);
            if (bt) {
              const isFinal = w.burstLeft === 1;
              this.fireWeapon(w, bt, isFinal ? def.burstFinalMult || 1 : 1);
            }
            w.burstLeft--;
            w.burstTimer = def.burstInterval || 0.075;
          }
          continue;
        }

        w.timer -= dt;
        const target = PGS.Weapons.findTarget(this.player, this.enemies, def.targeting, def.range);

        if (!target) {
          if (def.heatPerShot && w.heat > 0) {
            w.heat = Math.max(0, w.heat - def.coolPerSec * dt);
          }
          continue;
        }

        if (w.timer > 0) continue;

        if (def.burstCount && def.burstCount > 1) {
          this.fireWeapon(w, target, 1);
          w.burstLeft = def.burstCount - 1;
          w.burstTimer = def.burstInterval || 0.075;
          w.burstTarget = target;
        } else if (def.dualTarget) {
          this.fireWeapon(w, target, 1);
          const second = PGS.Weapons.findTarget(this.player, this.enemies, 'nearest', def.range, target.id);
          if (second) this.fireWeapon(w, second, 1);
        } else {
          this.fireWeapon(w, target, 1);
        }

        // 計算下次射擊間隔
        let cd = def.cooldown;
        if (def.minCooldown && def.heatPerShot) {
          const heatRatio = Math.min(1, w.heat / 100);
          cd = def.cooldown - (def.cooldown - def.minCooldown) * heatRatio;
        }
        const effRate = Math.max(0.3, 1 + ((w.eff && w.eff.ratePct) || 0) * 0.01);
        w.timer = cd / (w.rateMult * effRate * this.player.globalRateMult);
      }
    }

    fireWeapon(w, target, dmgBonus = 1) {
      const def = w.def;
      const eff = w.eff || this.getWeaponEffectiveStats(w.id);
      const baseAngle = Math.atan2(target.z - this.player.z, target.x - this.player.x);
      const count = eff.pellets + w.bonusPellets;
      const isCrit = Math.random() * 100 < this.player.critChance;
      const baseDmg = (eff.damage + this.player.flatAtk) * w.damageMult * this.player.globalDamageMult * dmgBonus;
      const dmg = Math.max(1, baseDmg * (isCrit ? 1.75 : 1));

      for (let p = 0; p < count; p++) {
        const offset =
          count > 1
            ? (p / (count - 1) - 0.5) * def.spread + (Math.random() - 0.5) * 0.06
            : (Math.random() - 0.5) * def.spread;
        const ang = baseAngle + offset;

        this.projectiles.push({
          x: this.player.x + Math.cos(ang) * 0.5,
          z: this.player.z + Math.sin(ang) * 0.5,
          vx: Math.cos(ang) * def.speed,
          vz: Math.sin(ang) * def.speed,
          angle: -ang,
          sprite: def.sprite,
          color: def.color,
          damage: dmg,
          knockback: def.knockback,
          life: def.life,
          maxLife: def.life,
          pierce: eff.pierce + w.bonusPierce,
          bounces: eff.bounces + w.bonusBounces,
          bounceRange: def.bounceRange || 7,
          arc: !!def.arc,
          splashRadius: eff.splashRadius || 0,
          slowDuration: def.slowDuration || 0,
          poisonDps: def.poisonDps || 0,
          poisonDuration: def.poisonDuration || 0,
          burnDps: def.burnDps || 0,
          burnDuration: def.burnDuration || 0,
          chillStacks: def.chillStacks || 0,
          growingWave: !!def.growingWave,
          homing: def.homing || 0,
          boomerang: !!def.boomerang,
          turnedAround: false,
          chainCount: eff.chainCount || 0,
          chainRange: def.chainRange || 5.5,
          vortexRadius: def.vortexRadius || 0,
          vortexDuration: def.vortexDuration || 0,
          clusterCount: def.clusterCount || 0,
          runes: w.runes.slice(),
          scale: 1,
          height: 0.65,
          hitIds: new Set(),
        });
      }

      // 槍口火光
      this.spawnFx(
        this.player.x + Math.cos(baseAngle) * 0.85,
        this.player.z + Math.sin(baseAngle) * 0.85,
        def.color,
        0.52,
        0.07,
        0.72
      );
      this.audio.playShot(def.sound);
      if (def.id === 'shotgun' || def.id === 'railgun') {
        this.renderer.addShake(0.14, 0.08);
      }

      // 彈匣消耗與換彈震波
      if (def.magSize) {
        w.ammo--;
        if (w.ammo <= 0) {
          w.reloading = def.reloadTime;
          if (def.reloadShockwave) {
            this.triggerShockwave(def.reloadShockwave);
          }
        }
      }

      // 過熱累積
      if (def.heatPerShot) {
        w.heat = Math.min(100, w.heat + def.heatPerShot);
        if (w.heat >= 100) {
          w.overheated = def.overheatLock;
        }
      }
    }

    triggerShockwave(sw) {
      this.spawnFx(this.player.x, this.player.z, 0xffe86e, sw.radius * 1.4, 0.22, 0.08, true);
      this.renderer.addShake(0.16, 0.1);
      const r2 = sw.radius * sw.radius;
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        const dx = e.x - this.player.x;
        const dz = e.z - this.player.z;
        const d2 = dx * dx + dz * dz;
        if (d2 <= r2 && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          this.damageEnemy(e, sw.damage, (dx / d) * sw.knockback, (dz / d) * sw.knockback);
        }
      }
    }

    updateProjectiles(dt) {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.life -= dt;

        // 自動追蹤（蜂群飛彈）
        if (p.homing > 0 && this.enemies.length > 0) {
          const tgt = this.findNearestFromPoint(p.x, p.z);
          if (tgt) {
            const desired = Math.atan2(tgt.z - p.z, tgt.x - p.x);
            const cur = Math.atan2(p.vz, p.vx);
            let diff = desired - cur;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            const turn = Math.max(-p.homing * dt, Math.min(p.homing * dt, diff));
            const nextAng = cur + turn;
            const spd = Math.hypot(p.vx, p.vz);
            p.vx = Math.cos(nextAng) * spd;
            p.vz = Math.sin(nextAng) * spd;
            p.angle = -nextAng;
          }
        }

        // 迴旋圓鋸（飛到一半折返回玩家）
        if (p.boomerang) {
          p.angle += 14 * dt;
          if (!p.turnedAround && p.life <= p.maxLife * 0.5) {
            p.turnedAround = true;
            p.hitIds.clear();
          }
          if (p.turnedAround) {
            const ang = Math.atan2(this.player.z - p.z, this.player.x - p.x);
            const spd = Math.hypot(p.vx, p.vz);
            p.vx = Math.cos(ang) * spd;
            p.vz = Math.sin(ang) * spd;
            if (Math.hypot(this.player.x - p.x, this.player.z - p.z) < 0.9) {
              this.projectiles.splice(i, 1);
              continue;
            }
          }
        }

        // 擴張音波
        if (p.growingWave) {
          const progress = 1 - Math.max(0, p.life / p.maxLife);
          p.scale = 1 + progress * 2.1;
        }

        p.x += p.vx * dt;
        p.z += p.vz * dt;

        if (p.arc) {
          const t = 1 - Math.max(0, p.life / p.maxLife);
          p.height = 0.65 + Math.sin(t * Math.PI) * 2.4;
          if (p.life <= 0) {
            this.explodeGrenade(p);
            this.projectiles.splice(i, 1);
            continue;
          }
          if (t < 0.72) continue;
        }

        if (p.life <= 0) {
          if (p.vortexRadius > 0) {
            this.spawnVortex(p.x, p.z, p.vortexRadius, p.vortexDuration, p.damage);
          }
          this.projectiles.splice(i, 1);
          continue;
        }

        let removed = false;
        const extraHit = p.growingWave ? (p.scale - 1) * 0.65 : 0;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (p.hitIds.has(e.id)) continue;
          const dx = e.x - p.x;
          const dz = e.z - p.z;
          const hitR = e.radius + 0.35 + extraHit;
          if (dx * dx + dz * dz > hitR * hitR) continue;

          if (p.arc) {
            this.explodeGrenade(p);
            removed = true;
            break;
          }

          if (p.vortexRadius > 0) {
            this.spawnVortex(p.x, p.z, p.vortexRadius, p.vortexDuration, p.damage);
            removed = true;
            break;
          }

          p.hitIds.add(e.id);
          const vLen = Math.hypot(p.vx, p.vz) || 1;
          this.applyStatusOnHit(e, p);
          this.damageEnemy(e, p.damage, (p.vx / vLen) * p.knockback, (p.vz / vLen) * p.knockback);
          this.spawnFx(p.x, p.z, p.color, 0.42, 0.09);

          if (p.splashRadius > 0) {
            this.explodeGrenade(p);
            removed = true;
            break;
          }

          if (p.chainCount > 0) {
            this.triggerChainLightning(e, p);
          } else if (p.runes && p.runes.includes('thunder')) {
            const rs = this.getRuneEffectiveStats('thunder');
            this.triggerChainLightning(e, {
              chainCount: rs.chains || 3,
              chainRange: 5.5,
              damage: p.damage * ((rs.dmgPct || 65) * 0.01),
            });
          }

          if (p.runes && p.runes.includes('quake')) {
            const rs = this.getRuneEffectiveStats('quake');
            this.triggerImpactShockwave(e.x, e.z, rs.radius || 2.6, p.damage * ((rs.dmgPct || 45) * 0.01), 6.2);
          }

          if (p.bounces > 0) {
            const nextTarget = this.findBounceTarget(p, e.id);
            if (nextTarget) {
              p.bounces--;
              const ang = Math.atan2(nextTarget.z - p.z, nextTarget.x - p.x);
              const spd = Math.hypot(p.vx, p.vz);
              p.vx = Math.cos(ang) * spd;
              p.vz = Math.sin(ang) * spd;
              p.angle = -ang;
              p.life = Math.max(p.life, 0.35);
              break;
            }
          }

          p.pierce--;
          if (p.pierce <= 0) {
            removed = true;
            break;
          }
        }

        if (removed) {
          this.projectiles.splice(i, 1);
        }
      }
    }

    findNearestFromPoint(x, z) {
      let best = null;
      let bestD2 = 144;
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        const dx = e.x - x;
        const dz = e.z - z;
        const d2 = dx * dx + dz * dz;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = e;
        }
      }
      return best;
    }

    applyStatusOnHit(e, p) {
      if (p.slowDuration > 0) e.slowTimer = Math.max(e.slowTimer, p.slowDuration);
      if (p.poisonDps > 0) {
        e.poisonDps = Math.max(e.poisonDps, p.poisonDps);
        e.poisonTimer = Math.max(e.poisonTimer, p.poisonDuration);
      }
      if (p.burnDps > 0) {
        e.burnDps = Math.max(e.burnDps, p.burnDps);
        e.burnTimer = Math.max(e.burnTimer, p.burnDuration);
      }
      if (p.chillStacks > 0) {
        e.chillCount += p.chillStacks;
        if (e.chillCount >= 3) {
          e.chillCount = 0;
          e.freezeTimer = Math.max(e.freezeTimer, 1.35);
          this.spawnFx(e.x, e.z, 0xb8f8ff, 1.05, 0.25);
        }
      }

      // 符文效果（火 / 冰 / 光 / 吸血）
      if (p.runes && p.runes.length > 0) {
        if (p.runes.includes('fire')) {
          const rs = this.getRuneEffectiveStats('fire');
          e.burnDps = Math.max(e.burnDps, rs.burnDps || 14);
          e.burnTimer = Math.max(e.burnTimer, rs.burnSec || 2.8);
        }
        if (p.runes.includes('ice')) {
          const rs = this.getRuneEffectiveStats('ice');
          e.slowTimer = Math.max(e.slowTimer, rs.slowSec || 2.0);
          if ((rs.freezeChance || 0) > 0 && Math.random() * 100 < rs.freezeChance) {
            e.freezeTimer = Math.max(e.freezeTimer, 1.0);
          }
        }
        if (p.runes.includes('light')) {
          const rs = this.getRuneEffectiveStats('light');
          e.blindTimer = Math.max(e.blindTimer, rs.blindSec || 2.2);
          e.blindAngle = Math.random() * Math.PI * 2;
          if ((rs.dmgBonus || 0) > 0) e.hp -= rs.dmgBonus;
          this.spawnFx(e.x, e.z, 0xfff6b8, 0.72, 0.16);
        }
        if (p.runes.includes('vampire') && this.player.hp < this.player.maxHp) {
          const rs = this.getRuneEffectiveStats('vampire');
          if (Math.random() * 100 < (rs.chance ?? 100)) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + (rs.heal || 1.5));
            this.spawnFx(this.player.x, this.player.z, 0xff5478, 0.45, 0.12, 1.1);
          }
        }
      }
    }

    triggerImpactShockwave(x, z, radius, damage, knockback) {
      this.spawnFx(x, z, 0xd29bff, radius * 1.2, 0.18, 0.1, true);
      const r2 = radius * radius;
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        const dx = e.x - x;
        const dz = e.z - z;
        const d2 = dx * dx + dz * dz;
        if (d2 <= r2 && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          this.damageEnemy(e, damage, (dx / d) * knockback, (dz / d) * knockback);
        }
      }
    }

    applyRuneToWeapon(weapon, runeId) {
      if (!weapon || !runeId) return false;
      if (weapon.runes.length >= PGS.Runes.MAX_PER_WEAPON) return false;
      if (weapon.runes.includes(runeId)) return false;
      weapon.runes.push(runeId);
      return true;
    }

    triggerChainLightning(originEnemy, p) {
      let curX = originEnemy.x;
      let curZ = originEnemy.z;
      const visited = new Set([originEnemy.id]);
      const r2 = p.chainRange * p.chainRange;

      for (let step = 0; step < p.chainCount; step++) {
        let next = null;
        let bestD2 = r2;
        for (let i = 0; i < this.enemies.length; i++) {
          const cand = this.enemies[i];
          if (visited.has(cand.id)) continue;
          const dx = cand.x - curX;
          const dz = cand.z - curZ;
          const d2 = dx * dx + dz * dz;
          if (d2 < bestD2) {
            bestD2 = d2;
            next = cand;
          }
        }
        if (!next) break;
        visited.add(next.id);
        this.spawnFx((curX + next.x) * 0.5, (curZ + next.z) * 0.5, 0xfff49c, 0.55, 0.14);
        this.spawnFx(next.x, next.z, 0xdca0ff, 0.65, 0.16);
        curX = next.x;
        curZ = next.z;
        this.damageEnemy(next, p.damage * 0.78, 0, 0);
      }
    }

    spawnVortex(x, z, radius, duration, damage) {
      this.vortexes.push({ x, z, radius, life: duration, damage, fxTimer: 0 });
    }

    updateVortexes(dt) {
      for (let i = this.vortexes.length - 1; i >= 0; i--) {
        const v = this.vortexes[i];
        v.life -= dt;
        v.fxTimer -= dt;
        if (v.fxTimer <= 0) {
          v.fxTimer = 0.12;
          this.spawnFx(v.x, v.z, 0xd28cff, v.radius * 0.75, 0.16, 0.15, true);
        }

        const r2 = v.radius * v.radius;
        for (let j = 0; j < this.enemies.length; j++) {
          const e = this.enemies[j];
          const dx = v.x - e.x;
          const dz = v.z - e.z;
          const d2 = dx * dx + dz * dz;
          if (d2 <= r2 && d2 > 0.05) {
            const d = Math.sqrt(d2);
            e.x += (dx / d) * 6.5 * dt;
            e.z += (dz / d) * 6.5 * dt;
          }
        }

        if (v.life <= 0) {
          this.spawnFx(v.x, v.z, 0xd28cff, v.radius * 1.2, 0.25, 0.3, true);
          this.audio.playExplosion();
          for (let j = this.enemies.length - 1; j >= 0; j--) {
            const e = this.enemies[j];
            const dx = e.x - v.x;
            const dz = e.z - v.z;
            if (dx * dx + dz * dz <= r2) {
              this.damageEnemy(e, v.damage, 0, 0);
            }
          }
          this.vortexes.splice(i, 1);
        }
      }
    }

    findBounceTarget(proj, excludeId) {
      let best = null;
      let bestD2 = proj.bounceRange * proj.bounceRange;
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        if (e.id === excludeId || proj.hitIds.has(e.id)) continue;
        const dx = e.x - proj.x;
        const dz = e.z - proj.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = e;
        }
      }
      return best;
    }

    explodeGrenade(p) {
      this.spawnFx(p.x, p.z, 0xff9848, p.splashRadius * 1.15, 0.22, 0.2, true);
      this.spawnFx(p.x, p.z, 0xffe86e, 1.3, 0.16, 0.6);
      this.renderer.addShake(0.22, 0.12);
      this.audio.playExplosion();

      const r2 = p.splashRadius * p.splashRadius;
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        const dx = e.x - p.x;
        const dz = e.z - p.z;
        const d2 = dx * dx + dz * dz;
        if (d2 <= r2) {
          const d = Math.max(0.1, Math.sqrt(d2));
          e.slowTimer = Math.max(e.slowTimer, p.slowDuration);
          this.damageEnemy(e, p.damage, (dx / d) * p.knockback, (dz / d) * p.knockback);
        }
      }

      // 集束迫擊砲：分裂出子炸彈
      if (p.clusterCount > 0) {
        for (let c = 0; c < p.clusterCount; c++) {
          const ang = (c / p.clusterCount) * Math.PI * 2 + Math.random() * 0.4;
          this.projectiles.push({
            x: p.x,
            z: p.z,
            vx: Math.cos(ang) * 7.5,
            vz: Math.sin(ang) * 7.5,
            angle: -ang,
            sprite: 'pellet',
            color: 0xffd65c,
            damage: p.damage * 0.55,
            knockback: 2.5,
            life: 0.38,
            maxLife: 0.38,
            pierce: 1,
            bounces: 0,
            bounceRange: 0,
            arc: true,
            splashRadius: 2.0,
            slowDuration: 0.4,
            clusterCount: 0,
            scale: 1.1,
            height: 0.65,
            hitIds: new Set(),
          });
        }
      }
    }

    damageEnemy(e, dmg, kx, kz) {
      e.hp -= dmg;
      e.hitFlash = 0.1;
      e.kx += kx;
      e.kz += kz;
      if (e.hp <= 0) {
        const idx = this.enemies.indexOf(e);
        if (idx !== -1) {
          this.enemies.splice(idx, 1);
          this.kills++;
          this.spawnFx(e.x, e.z, 0xff6e6e, 0.85, 0.16);
          // 毒液死亡擴散
          if (e.poisonTimer > 0) {
            this.spawnFx(e.x, e.z, 0x82eb58, 2.8, 0.25, 0.15, true);
            for (let j = this.enemies.length - 1; j >= 0; j--) {
              const other = this.enemies[j];
              const dx = other.x - e.x;
              const dz = other.z - e.z;
              if (dx * dx + dz * dz <= 7.8) {
                other.poisonDps = Math.max(other.poisonDps, e.poisonDps);
                other.poisonTimer = Math.max(other.poisonTimer, 2.2);
              }
            }
          }
          this.pickups.push({ kind: 'gem', x: e.x, z: e.z, value: e.xp, bobPhase: Math.random() * 6 });
          if (Math.random() < e.goldChance) {
            this.pickups.push({ kind: 'coin', x: e.x + 0.3, z: e.z, value: e.type === 'elite' ? 12 : 2, bobPhase: 0 });
          }
          if (Math.random() < this.vampireRuneRate && this.isRuneUnlocked('vampire')) {
            this.pickups.push({ kind: 'rune', runeId: 'vampire', x: e.x - 0.3, z: e.z, bobPhase: Math.random() * 6 });
          } else if (Math.random() < this.runNormalRuneRate) {
            const normalRunes = this.save.unlockedRunes.filter((r) => r !== 'vampire');
            if (normalRunes.length > 0) {
              const rId = normalRunes[Math.floor(Math.random() * normalRunes.length)];
              this.pickups.push({ kind: 'rune', runeId: rId, x: e.x - 0.3, z: e.z, bobPhase: Math.random() * 6 });
            }
          }
          if (Math.random() < this.gearDropRate) {
            const types = ['weapon', 'shield', 'glove', 'boot'];
            const gearType = types[Math.floor(Math.random() * types.length)];
            this.pickups.push({ kind: 'gear', gearType, x: e.x, z: e.z + 0.3, bobPhase: Math.random() * 6 });
          }
          if (Math.random() < this.cardDropRate) {
            const stage = this.getStage();
            const isNum = Math.random() < 0.65;
            const card = isNum
              ? { kind: 'num', val: stage.numbers[Math.floor(Math.random() * stage.numbers.length)] }
              : { kind: 'op', val: stage.ops[Math.floor(Math.random() * stage.ops.length)] };
            this.pickups.push({ kind: 'card', card, x: e.x, z: e.z - 0.3, bobPhase: Math.random() * 6 });
          }
        }
      }
    }

    updateEnemies(dt) {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
        if (e.slowTimer > 0) e.slowTimer = Math.max(0, e.slowTimer - dt);
        if (e.freezeTimer > 0) e.freezeTimer = Math.max(0, e.freezeTimer - dt);
        if (e.atkTimer > 0) e.atkTimer = Math.max(0, e.atkTimer - dt);

        // 中毒與燃燒持續傷害
        let dotDmg = 0;
        if (e.poisonTimer > 0) {
          e.poisonTimer = Math.max(0, e.poisonTimer - dt);
          dotDmg += e.poisonDps * dt;
        }
        if (e.burnTimer > 0) {
          e.burnTimer = Math.max(0, e.burnTimer - dt);
          dotDmg += e.burnDps * dt;
        }
        if (dotDmg > 0) {
          e.hp -= dotDmg;
          if (e.hp <= 0) {
            this.damageEnemy(e, 1, 0, 0);
            continue;
          }
        }

        const dx = this.player.x - e.x;
        const dz = this.player.z - e.z;
        const dist = Math.hypot(dx, dz) || 1;
        const spd = e.freezeTimer > 0 ? 0 : e.speed * (e.slowTimer > 0 ? 0.45 : 1);

        if (e.blindTimer > 0) {
          e.blindTimer = Math.max(0, e.blindTimer - dt);
          e.blindAngle += (Math.random() - 0.5) * 4 * dt;
          e.vx = Math.cos(e.blindAngle) * spd * 0.75;
          e.vz = Math.sin(e.blindAngle) * spd * 0.75;
        } else if (e.range > 0 && dist <= e.range) {
          e.vx = 0;
          e.vz = 0;
          if (e.atkTimer <= 0 && e.freezeTimer <= 0) {
            const warnDur = 3.0 + Math.random() * 1.5; // 3～4.5 秒紅色落點預告
            e.atkTimer = warnDur + e.atkCd;
            this.spawnAttackTelegraph(e, warnDur);
          }
        } else {
          e.vx = (dx / dist) * spd;
          e.vz = (dz / dist) * spd;
          if (e.type === 'elite' && dist <= 7.5 && e.atkTimer <= 0 && e.freezeTimer <= 0) {
            const warnDur = 3.2;
            e.atkTimer = warnDur + 3.5;
            this.spawnAttackTelegraph(e, warnDur);
          }
        }

        // 擊退衰減
        e.x += (e.vx + e.kx) * dt;
        e.z += (e.vz + e.kz) * dt;
        e.kx *= Math.pow(0.02, dt);
        e.kz *= Math.pow(0.02, dt);
        e.walkPhase += dt * 10;
        this.resolveObstacleCollision(e, e.radius);

        // 與玩家碰撞扣血（依個別怪物 atkCd 觸發，套用防禦與減傷）
        if (dist < e.radius + 0.45 && e.atkTimer <= 0 && this.player.invuln <= 0) {
          e.atkTimer = e.atkCd;
          this.applyDamageToPlayer(e.damage, e.onHitStatus);
          if (this.stateName !== 'playing') return;
        }
      }

      // 簡易怪物互推分離，避免完全重疊成一團
      const n = this.enemies.length;
      for (let i = 0; i < n; i++) {
        const a = this.enemies[i];
        for (let j = i + 1; j < Math.min(n, i + 14); j++) {
          const b = this.enemies[j];
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          const minD = a.radius + b.radius;
          const d2 = dx * dx + dz * dz;
          if (d2 > 0.0001 && d2 < minD * minD) {
            const d = Math.sqrt(d2);
            const push = (minD - d) * 0.35;
            const nx = (dx / d) * push;
            const nz = (dz / d) * push;
            a.x -= nx;
            a.z -= nz;
            b.x += nx;
            b.z += nz;
          }
        }
      }
    }

    updatePickups(dt) {
      const mag2 = this.player.magnet * this.player.magnet;
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const pk = this.pickups[i];
        pk.bobPhase += dt * 5;
        const dx = this.player.x - pk.x;
        const dz = this.player.z - pk.z;
        const d2 = dx * dx + dz * dz;

        if (d2 < mag2) {
          const d = Math.max(0.1, Math.sqrt(d2));
          pk.x += (dx / d) * 14 * dt;
          pk.z += (dz / d) * 14 * dt;
        }

        if (d2 < 0.7) {
          this.pickups.splice(i, 1);
          if (pk.kind === 'gem') {
            this.audio.playGem();
            this.gainXp(pk.value);
          } else if (pk.kind === 'coin') {
            this.runGold += pk.value;
            this.audio.playGem();
          } else if (pk.kind === 'rune') {
            this.openRunePick(pk.runeId);
            return;
          } else if (pk.kind === 'gear') {
            const item = PGS.Gear.createGearItem(pk.gearType, this.save.nextUid++);
            this.save.gearBag.push(item);
            writeSave(this.save);
            this.audio.playLevelUp();
            this.spawnFx(this.player.x, this.player.z, 0x4ce0c0, 0.9, 0.22, 1.0);
          } else if (pk.kind === 'card') {
            const c = { uid: this.save.nextUid++, kind: pk.card.kind, val: pk.card.val };
            this.save.cards.push(c);
            writeSave(this.save);
            this.audio.playGem();
            this.spawnFx(this.player.x, this.player.z, 0xfff2c4, 0.75, 0.2, 1.0);
          }
        }
      }
    }

    gainXp(amount) {
      this.player.xp += amount;
      if (this.player.xp >= this.player.nextXp) {
        this.player.xp -= this.player.nextXp;
        this.player.level++;
        this.player.nextXp = Math.round(this.player.nextXp * 1.32 + 25);
        this.openLevelUp();
      }
    }

    openRunePick(runeId) {
      const canSocketAny = this.weapons.some(
        (w) => w.runes.length < PGS.Runes.MAX_PER_WEAPON && !w.runes.includes(runeId)
      );
      if (!canSocketAny) {
        this.runGold += 10;
        this.audio.playGem();
        this.spawnFx(this.player.x, this.player.z, 0xffd058, 0.7, 0.2, 1.0);
        return;
      }

      this.stateName = 'rune_pick';
      this.audio.playLevelUp();
      this.ui.showRunePick(
        runeId,
        this.weapons,
        (weapon) => {
          this.applyRuneToWeapon(weapon, runeId);
          this.stateName = 'playing';
          this.ui.hideRunePick();
          this.ui.syncAll(this);
        },
        () => {
          this.runGold += 10;
          this.stateName = 'playing';
          this.ui.hideRunePick();
          this.ui.syncAll(this);
        }
      );
    }

    openLevelUp() {
      this.stateName = 'levelup';
      this.audio.playLevelUp();

      const choices = [];
      const ownedIds = new Set(this.weapons.map((w) => w.id));
      const unowned = this.save.unlockedWeapons.filter((id) => !ownedIds.has(id));

      // 優先提供 1 個已解鎖的新武器選項（若尚未集滿 6 把）
      if (unowned.length > 0 && this.weapons.length < 6) {
        const pick = unowned[Math.floor(Math.random() * unowned.length)];
        const def = PGS.Weapons.DEFS[pick];
        choices.push({
          title: `裝備新武器：${def.name}`,
          tag: def.tag,
          desc: def.desc,
          iconId: pick,
          apply: () => {
            this.weapons.push(this._makeWeaponInstance(pick));
          },
        });
      }

      // 現有武器強化
      for (let i = 0; i < this.weapons.length && choices.length < 2; i++) {
        const w = this.weapons[Math.floor(Math.random() * this.weapons.length)];
        if (choices.some((c) => c.weaponId === w.id)) continue;
        choices.push({
          weaponId: w.id,
          title: `強化 ${w.def.name} Lv.${w.level + 1}`,
          tag: '武器升級',
          desc: '傷害 +22%、射速 +12%，並提升特殊彈道數量或貫穿能力。',
          iconId: w.id,
          apply: () => {
            w.level++;
            w.damageMult *= 1.22;
            w.rateMult *= 1.12;
            if (w.id === 'shotgun') w.bonusPellets += 2;
            if (w.id === 'railgun') w.bonusPierce += 2;
            if (w.id === 'revolver') w.bonusBounces += 1;
          },
        });
      }

      // 被動天賦補足 3 選 1
      const passives = [
        {
          title: '戰術補給箱',
          tag: '回復與生命',
          desc: '最大生命 +25 並立即回復 40 點生命值。',
          apply: () => {
            this.player.maxHp += 25;
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 40);
          },
        },
        {
          title: '輕量化戰靴',
          tag: '走位強化',
          desc: '移動速度 +12%、經驗磁鐵吸附範圍 +25%。',
          apply: () => {
            this.player.speed *= 1.12;
            this.player.magnet *= 1.25;
          },
        },
        {
          title: '高能彈藥改造',
          tag: '全武器強化',
          desc: '所有裝備武器的傷害 +15%、攻速 +8%。',
          apply: () => {
            this.player.globalDamageMult *= 1.15;
            this.player.globalRateMult *= 1.08;
          },
        },
      ];

      while (choices.length < 3) {
        const p = passives.shift();
        if (p) choices.push(p);
      }

      this.ui.showLevelUp(choices, (choice) => {
        choice.apply();
        this.stateName = 'playing';
        this.ui.hideLevelUp();
        this.ui.syncAll(this);
      });
    }

    spawnTerrainZone(stage, forcedKind, minDist = 6.5) {
      const pool = (stage.terrains && stage.terrains.length) ? stage.terrains : ['swamp'];
      const kind = forcedKind || pool[Math.floor(Math.random() * pool.length)];
      const ang = Math.random() * Math.PI * 2;
      const dist = minDist + Math.random() * 18;
      const x = Math.max(-ARENA_LIMIT + 5, Math.min(ARENA_LIMIT - 5, this.player.x + Math.cos(ang) * dist));
      const z = Math.max(-ARENA_LIMIT + 5, Math.min(ARENA_LIMIT - 5, this.player.z + Math.sin(ang) * dist));
      const isObs = kind === 'obstacle';
      const speed = isObs ? 0.55 + Math.random() * 0.45 : 1.1 + Math.random() * 1.1;
      const moveAng = Math.random() * Math.PI * 2;
      const life = 12 + Math.random() * 9;
      return {
        kind,
        x,
        z,
        radius: isObs ? 1.55 + Math.random() * 0.65 : 3.8 + Math.random() * 1.4,
        vx: Math.cos(moveAng) * speed,
        vz: Math.sin(moveAng) * speed,
        life,
        maxLife: life,
        strikeTimer: 1.6 + Math.random() * 1.2,
      };
    }

    initTerrainZones(stage) {
      this.terrainZones = [];
      const terrains = (stage.terrains && stage.terrains.length) ? stage.terrains : ['swamp'];
      // 先確保每種關卡地形至少出現 1 個，再補足至 6 個局部區域
      for (let i = 0; i < terrains.length; i++) {
        this.terrainZones.push(this.spawnTerrainZone(stage, terrains[i], 7.5));
      }
      while (this.terrainZones.length < 6) {
        this.terrainZones.push(this.spawnTerrainZone(stage, null, 7.5));
      }
    }

    resolveObstacleCollision(entity, entRadius) {
      for (let i = 0; i < this.terrainZones.length; i++) {
        const z = this.terrainZones[i];
        if (z.kind !== 'obstacle') continue;
        const dx = entity.x - z.x;
        const dz = entity.z - z.z;
        const dist = Math.hypot(dx, dz);
        const minDist = z.radius + entRadius;
        if (dist < minDist) {
          const nx = dist > 0.001 ? dx / dist : 1;
          const nz = dist > 0.001 ? dz / dist : 0;
          entity.x = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, z.x + nx * minDist));
          entity.z = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, z.z + nz * minDist));
        }
      }
    }

    updateTerrains(dt) {
      const stage = this.getStage();
      this.player.inSwamp = false;
      this.player.inPoison = false;
      this.player.inIce = false;

      for (let i = 0; i < this.terrainZones.length; i++) {
        const z = this.terrainZones[i];
        z.x += z.vx * dt;
        z.z += z.vz * dt;
        if (z.x < -ARENA_LIMIT + 3 || z.x > ARENA_LIMIT - 3) z.vx *= -1;
        if (z.z < -ARENA_LIMIT + 3 || z.z > ARENA_LIMIT - 3) z.vz *= -1;

        z.life -= dt;
        const distP = Math.hypot(this.player.x - z.x, this.player.z - z.z);

        // 離玩家太遠或壽命結束 -> 不定期更換環境與位置
        if (z.life <= 0 || distP > 44) {
          this.terrainZones[i] = this.spawnTerrainZone(stage, null, 8.5);
          continue;
        }

        const inside = distP <= z.radius;
        if (z.kind === 'swamp' && inside) {
          this.player.inSwamp = true;
        } else if (z.kind === 'poison' && inside) {
          this.player.inPoison = true;
        } else if (z.kind === 'ice' && inside) {
          this.player.inIce = true;
        } else if (z.kind === 'thunder') {
          z.strikeTimer -= dt;
          if (z.strikeTimer <= 0) {
            z.strikeTimer = 2.2 + Math.random() * 0.8;
            this.spawnFx(z.x, z.z, 0xffe455, z.radius * 1.4, 0.22, 0.25, true);
            if (inside) {
              const dmg = Math.max(3, Math.round((12 - this.player.def * 0.3) * (1 + this.player.dr * 0.01)));
              this.player.hp -= dmg;
              this.player.paralyzeTimer = 0.85;
              this.renderer.addShake(0.28, 0.16);
              this.audio.playHurt();
              if (this.player.hp <= 0) {
                this.player.hp = 0;
                this.finishRun();
                return;
              }
            }
          }
        }
      }

      if (this.player.inPoison) {
        this.player.poisonTick += dt;
        if (this.player.poisonTick >= 0.5) {
          this.player.poisonTick -= 0.5;
          const dmg = Math.max(2, Math.round(this.player.maxHp * 0.025 * (1 + this.player.dr * 0.01)));
          this.player.hp -= dmg;
          this.spawnFx(this.player.x, this.player.z, 0x62f582, 0.9, 0.18, 0.8);
          if (this.player.hp <= 0) {
            this.player.hp = 0;
            this.finishRun();
            return;
          }
        }
      } else {
        this.player.poisonTick = 0;
      }
    }

    applyDamageToPlayer(rawDamage, status) {
      const afterDr = rawDamage * (1 + this.player.dr * 0.01);
      const finalDmg = Math.max(1, Math.round(afterDr - this.player.def));
      this.player.hp -= finalDmg;
      this.player.invuln = 0.18;
      this.renderer.addShake(0.22, 0.12);
      this.audio.playHurt();

      if (status === 'bleed') this.player.bleedTimer = 5.0;
      else if (status === 'stun') this.player.stunTimer = 5.0;
      else if (status === 'burn') this.player.burnTimer = 4.0;
      else if (status === 'chill') this.player.chillTimer = 5.0;
      else if (status === 'paralyze') this.player.paralyzeTimer = Math.max(this.player.paralyzeTimer, 1.5);

      if (this.player.hp <= 0) {
        this.player.hp = 0;
        this.finishRun();
      }
    }

    updatePlayerStatuses(dt) {
      const p = this.player;
      if (p.paralyzeTimer > 0) p.paralyzeTimer = Math.max(0, p.paralyzeTimer - dt);
      if (p.stunTimer > 0) p.stunTimer = Math.max(0, p.stunTimer - dt);
      if (p.chillTimer > 0) p.chillTimer = Math.max(0, p.chillTimer - dt);

      if (p.bleedTimer > 0) {
        p.bleedTimer = Math.max(0, p.bleedTimer - dt);
        p.bleedTick += dt;
        if (p.bleedTick >= 0.5) {
          p.bleedTick -= 0.5;
          const dmg = Math.max(1, Math.round(p.maxHp * 0.02 * (1 + p.dr * 0.01)));
          p.hp -= dmg;
          this.spawnFx(p.x, p.z, 0xd83242, 0.75, 0.16, 0.75);
          if (p.hp <= 0) {
            p.hp = 0;
            this.finishRun();
            return;
          }
        }
      } else {
        p.bleedTick = 0;
      }

      if (p.burnTimer > 0) {
        p.burnTimer = Math.max(0, p.burnTimer - dt);
        p.burnTick += dt;
        if (p.burnTick >= 0.5) {
          p.burnTick -= 0.5;
          const dmg = Math.max(2, Math.round(p.maxHp * 0.025 * (1 + p.dr * 0.01)));
          p.hp -= dmg;
          this.spawnFx(p.x, p.z, 0xff7a2e, 0.85, 0.16, 0.8);
          if (p.hp <= 0) {
            p.hp = 0;
            this.finishRun();
            return;
          }
        }
      } else {
        p.burnTick = 0;
      }
    }

    updateEnemyProjectiles(dt) {
      for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
        const ep = this.enemyProjectiles[i];
        ep.x += ep.vx * dt;
        ep.z += ep.vz * dt;
        ep.life -= dt;
        if (ep.life <= 0) {
          this.enemyProjectiles.splice(i, 1);
          continue;
        }
        // 碰到障礙物擋下
        let blocked = false;
        for (let k = 0; k < this.terrainZones.length; k++) {
          const z = this.terrainZones[k];
          if (z.kind === 'obstacle' && Math.hypot(ep.x - z.x, ep.z - z.z) < z.radius + 0.25) {
            blocked = true;
            break;
          }
        }
        if (blocked) {
          this.enemyProjectiles.splice(i, 1);
          continue;
        }
        if (Math.hypot(ep.x - this.player.x, ep.z - this.player.z) < 0.75) {
          this.enemyProjectiles.splice(i, 1);
          this.applyDamageToPlayer(ep.damage, ep.onHitStatus);
          if (this.stateName !== 'playing') return;
        }
      }
    }

    spawnAttackTelegraph(e, warnDur) {
      const isMage = e.type.startsWith('mage_');
      const radius = isMage ? 2.5 : e.type === 'elite' ? 2.8 : 1.75;
      let fxColor = 0xff4455;
      if (e.type === 'mage_fire') fxColor = 0xff762a;
      else if (e.type === 'mage_ice') fxColor = 0x76e8ff;
      else if (e.type === 'mage_thunder') fxColor = 0xffe45e;

      this.telegraphs.push({
        x: this.player.x,
        z: this.player.z,
        radius,
        timer: warnDur,
        maxTimer: warnDur,
        damage: e.damage,
        status: e.onHitStatus || null,
        fxColor,
      });
    }

    updateTelegraphs(dt) {
      for (let i = this.telegraphs.length - 1; i >= 0; i--) {
        const tg = this.telegraphs[i];
        tg.timer -= dt;
        if (tg.timer <= 0) {
          this.telegraphs.splice(i, 1);
          this.spawnFx(tg.x, tg.z, tg.fxColor, tg.radius * 1.4, 0.24, 0.22, true);
          this.spawnFx(tg.x, tg.z, 0xffffff, tg.radius * 0.7, 0.16, 0.6);
          if (Math.hypot(this.player.x - tg.x, this.player.z - tg.z) <= tg.radius) {
            this.applyDamageToPlayer(tg.damage, tg.status);
            if (this.stateName !== 'playing') return;
          }
        }
      }
    }

    updateEffects(dt) {
      for (let i = this.effects.length - 1; i >= 0; i--) {
        const fx = this.effects[i];
        fx.life -= dt;
        if (fx.life <= 0) {
          this.effects.splice(i, 1);
          continue;
        }
        fx.size = fx.maxSize * (fx.life / fx.maxLife);
      }
    }

    finishRun() {
      this.stateName = 'gameover';
      this.save.gold += this.runGold;
      this.save.freeExplores = (this.save.freeExplores || 0) + 1;
      this.save.bestTime = Math.max(this.save.bestTime, Math.floor(this.elapsed));
      this.save.bestKills = Math.max(this.save.bestKills, this.kills);
      writeSave(this.save);
      this.ui.showGameOver(this);
    }

    togglePause() {
      if (this.stateName === 'playing') {
        this.stateName = 'paused';
        this.keys = {};
        this.joyVec = { x: 0, z: 0 };
        this.ui.showPause(this);
      } else if (this.stateName === 'paused') {
        this.resumeFromPause();
      }
    }

    resumeFromPause() {
      if (this.stateName !== 'paused') return;
      this.keys = {};
      this.joyVec = { x: 0, z: 0 };
      this.stateName = 'playing';
      this.ui.hidePause();
    }

    abortToMenu() {
      this.save.gold += this.runGold;
      this.runGold = 0;
      this.save.bestTime = Math.max(this.save.bestTime, Math.floor(this.elapsed));
      this.save.bestKills = Math.max(this.save.bestKills, this.kills);
      writeSave(this.save);
      this.keys = {};
      this.joyVec = { x: 0, z: 0 };
      this.stateName = 'menu';
      this.ui.hidePause();
      this.ui.els.hud.classList.add('hidden');
      this.ui.els.menuOverlay.classList.remove('hidden');
      this.ui.renderMenu(this);
    }
  }

  PGS.SurvivorGame = SurvivorGame;
})(window);
