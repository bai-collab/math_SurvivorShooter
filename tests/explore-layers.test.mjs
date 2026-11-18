// F9 探索地圖分區：北園國小校內 7 個據點只在「校園層」顯示，社區層只留一個校園入口。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

// ---- 最小假 DOM：只夠讓 CommunityExplore 建構、開啟、收事件 ----
function makeCtx() {
  const state = {};
  return new Proxy(state, {
    get(target, key) {
      if (key === 'createImageData') return (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
      if (key === 'getImageData') return (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
      if (key === 'measureText') return (text) => ({ width: String(text).length * 9 });
      if (key in target) return target[key];
      return () => {};
    },
    set(target, key, value) { target[key] = value; return true; },
  });
}

function makeEl(hidden = false) {
  const classes = new Set(hidden ? ['hidden'] : []);
  const el = {
    children: [],
    handlers: {},
    dataset: {},
    style: {},
    textContent: '',
    disabled: false,
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
      toggle: (name, force) => {
        const on = force === undefined ? !classes.has(name) : !!force;
        if (on) classes.add(name); else classes.delete(name);
        return on;
      },
    },
    appendChild(child) { el.children.push(child); return child; },
    prepend(child) { el.children.unshift(child); },
    addEventListener(type, fn) { el.handlers[type] = fn; },
    querySelector: () => null,
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 350 }),
    setPointerCapture() {},
    getContext: () => makeCtx(),
    toDataURL: () => 'data:image/png;base64,',
    width: 0,
    height: 0,
    set innerHTML(value) { el._html = value; el.children = []; },
    get innerHTML() { return el._html || ''; },
  };
  return el;
}

function loadSandbox() {
  const elements = {};
  const windowListeners = {};
  const doc = {
    getElementById(id) {
      if (!elements[id]) elements[id] = makeEl(id === 'explore-mg-modal' || id === 'explore-atlas-modal' || id === 'explore-layer-btn' || id === 'explore-overlay');
      return elements[id];
    },
    createElement: () => makeEl(),
  };
  const win = {
    document: doc,
    addEventListener(type, fn) { windowListeners[type] = fn; },
    removeEventListener() {},
  };
  win.window = win;
  const context = {
    window: win,
    document: doc,
    performance: { now: () => 0 },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
  };
  vm.createContext(context);
  for (const file of ['beishewei-map-data.js', 'explore-quest.js', 'explore.js', 'weapons.js', 'runes.js']) {
    vm.runInContext(read(`../src/${file}`), context, { filename: `src/${file}` });
  }
  return { PGS: win.PGS, elements, windowListeners, doc };
}

const { PGS, elements, windowListeners } = loadSandbox();
const Explorer = PGS.CommunityExplore;
const quest = PGS.ExploreQuest;
const { LOCATIONS, CAMPUS, PORTALS, CAMPUS_ZONE } = Explorer;

const CAMPUS_IDS = [
  'beiyuan_gate', 'beiyuan_slide', 'one_mu_field', 'rice_drying_yard',
  'solar_roof', 'rainbow_stairs', 'school_history_wall',
];
const campusLocs = LOCATIONS.filter((loc) => CAMPUS_IDS.includes(loc.id));
const communityLocs = LOCATIONS.filter((loc) => !CAMPUS_IDS.includes(loc.id));

function makeGame(overrides = {}) {
  const calls = { consume: 0, canStart: 0 };
  const game = {
    calls,
    save: {
      gold: 100,
      freeExplores: 1,
      unlockedWeapons: ['a', 'b', 'c', 'd'],
      unlockedRunes: ['x', 'y'],
      communityAtlas: { collected: [], rewardsClaimed: [], title: '' },
    },
    audio: { playLevelUp() {}, playGem() {} },
    isWeaponUnlocked: () => false,
    isRuneUnlocked: () => false,
    getExploreCost: () => 30,
    canStartExploreMiniGame() { calls.canStart += 1; return true; },
    consumeExploreCost() { calls.consume += 1; return 'free'; },
    persistSave() {},
    ...overrides,
  };
  return game;
}

// 記錄畫了哪些名稱牌、哪些圖示的假畫布
function makeRecorder() {
  const rec = { labels: [], labelRects: [], icons: 0, fillStyle: '' };
  const ctx = new Proxy({}, {
    get(target, key) {
      // 中文字寬約等於字級，量測值依目前的 font 計算，才貼近真實瀏覽器
      if (key === 'measureText') return (text) => ({ width: String(text).length * (Number((/(\d+)px/.exec(target.font || '') || [])[1]) || 9) });
      if (key === 'fillText') return (text) => { rec.labels.push(text); };
      if (key === 'drawImage') return () => { rec.icons += 1; };
      if (key === 'fillRect') {
        return (x, y, w, h) => {
          if (target.fillStyle === 'rgba(24,18,42,0.92)') rec.labelRects.push({ x, y, w, h });
        };
      }
      if (key in target) return target[key];
      return () => {};
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  rec.ctx = ctx;
  return rec;
}

function makeMarkerExplorer(layer, zoom) {
  const ex = Object.create(Explorer.prototype);
  ex.game = makeGame();
  ex.layer = layer;
  ex.animTime = 0;
  ex.moveTarget = null;
  ex.nearbyLoc = null;
  ex.cam = { x: 240, y: 175, zoom, followPlayer: true };
  ex.roadLabelRects = [];
  ex._getMarkerIcon = () => ({});
  return ex;
}

const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

test('校內 7 個據點都有校園座標，其他 11 個據點留在社區層', () => {
  assert.equal(campusLocs.length, 7);
  assert.equal(communityLocs.length, 11);
  for (const loc of campusLocs) {
    assert.equal(loc.zone, 'campus', `${loc.id} should belong to the campus layer`);
    assert.ok(Number.isFinite(loc.campus.x) && Number.isFinite(loc.campus.y), `${loc.id} needs campus coordinates`);
  }
  for (const loc of communityLocs) assert.equal(loc.zone, undefined, `${loc.id} must stay on the community layer`);
  // 規則不變：據點的獎勵與小遊戲沒被動到，社區座標也還在
  const gate = LOCATIONS.find((loc) => loc.id === 'beiyuan_gate');
  assert.equal(gate.minigame, 'crossing');
  assert.deepEqual([gate.x, gate.y], [151, 167]);
  assert.equal(LOCATIONS.length, 18);
});

test('社區層：校內據點不畫圖示、不畫名稱牌，只多一個北園國小入口', () => {
  const ex = makeMarkerExplorer('community', 3.5);
  const visible = ex.getVisibleLocations('community').map((loc) => loc.id);
  for (const id of CAMPUS_IDS) assert.ok(!visible.includes(id), `${id} should be hidden on the community layer`);
  assert.equal(visible.length, 11);
  const interactables = ex.getInteractables('community');
  assert.equal(interactables.length, 12);
  assert.ok(interactables.includes(PORTALS.campus));

  const rec = makeRecorder();
  ex.drawLocationMarkers(rec.ctx, 1 / Math.sqrt(3.5));
  assert.equal(rec.icons, 12, '11 個社區據點＋1 個校園入口');
  for (const loc of campusLocs) {
    assert.ok(!rec.labels.some((text) => text.includes(loc.name)), `community layer must not label ${loc.name}`);
  }
  assert.ok(rec.labels.includes(PORTALS.campus.name), 'the school entrance must have a name plate');
  for (const loc of communityLocs) assert.ok(rec.labels.some((text) => text.includes(loc.name)), `${loc.name} label (zoomed in)`);
});

test('校園層：畫出全部 7 個校內據點與離開出口，不含社區據點', () => {
  const ex = makeMarkerExplorer('campus', 1);
  const visible = ex.getVisibleLocations('campus').map((loc) => loc.id);
  assert.deepEqual([...visible].sort(), [...CAMPUS_IDS].sort());
  const rec = makeRecorder();
  ex.drawLocationMarkers(rec.ctx, 1);
  assert.equal(rec.icons, 8, '7 個校內據點＋1 個離開出口');
  for (const loc of campusLocs) assert.ok(rec.labels.some((text) => text.includes(loc.name)), `${loc.name} label in campus`);
  assert.ok(rec.labels.includes(PORTALS.community.name));
  for (const loc of communityLocs) assert.ok(!rec.labels.some((text) => text.includes(loc.name)), `${loc.name} must not show in campus`);
});

test('兩層的名稱牌都互不重疊，也不蓋住任何圖示（各種縮放）', () => {
  for (const layer of ['community', 'campus']) {
    for (const zoom of [1, 1.7, 2.5, 3.5]) {
      const ex = makeMarkerExplorer(layer, zoom);
      const invScale = 1 / Math.sqrt(zoom);
      const rec = makeRecorder();
      ex.drawLocationMarkers(rec.ctx, invScale);
      const icons = ex.getInteractables(layer).map((loc) => {
        const pos = Explorer.posOf(loc, layer);
        return Explorer.markerRect(pos.x, pos.y, Explorer.markerSize(loc), invScale);
      });
      rec.labelRects.forEach((a, i) => {
        icons.forEach((icon) => assert.ok(!overlaps(a, icon), `${layer} zoom ${zoom}: a name plate covers an icon`));
        rec.labelRects.slice(i + 1).forEach((b) => assert.ok(!overlaps(a, b), `${layer} zoom ${zoom}: two name plates overlap`));
      });
      if (layer === 'campus') assert.equal(rec.labelRects.length, 8, 'campus shows every name plate');
    }
  }
});

test('校內據點座標在校園範圍內、不在建築碰撞內，標記彼此不重疊，且都走得到', () => {
  const b = CAMPUS.bounds;
  const points = [...campusLocs.map((loc) => ({ name: loc.name, loc, ...loc.campus })), { name: '離開出口', loc: PORTALS.community, ...PORTALS.community }];
  for (const p of points) {
    assert.equal(quest.isBlocked(p.x, p.y, CAMPUS.colliders), false, `${p.name} is inside a campus collider`);
    if (p.loc.portal) continue; // 出口在校門外的人行道上
    assert.ok(p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY, `${p.name} is outside the campus bounds`);
  }
  for (const invScale of [1, 1 / Math.sqrt(1.7), 1 / Math.sqrt(3.5)]) {
    const rects = points.map((p) => Explorer.markerRect(p.x, p.y, Explorer.markerSize(p.loc), invScale));
    rects.forEach((a, i) => {
      assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.w <= 480 && a.y + a.h <= 350, `${points[i].name} marker leaves the canvas`);
      rects.slice(i + 1).forEach((c, j) => assert.ok(!overlaps(a, c), `${points[i].name} and ${points[i + 1 + j].name} markers overlap`));
    });
  }

  // 從校園入口出發，用和 updatePlayer 相同的邊界與碰撞規則，每個據點與出口都要走得到
  const W = 480;
  const H = 350;
  const start = CAMPUS.start;
  assert.equal(quest.isBlocked(start.x, start.y, CAMPUS.colliders), false, 'campus start must be walkable');
  const visited = new Uint8Array(W * H);
  const queue = new Int32Array(W * H);
  let head = 0;
  let tail = 0;
  visited[start.y * W + start.x] = 1;
  queue[tail++] = start.y * W + start.x;
  while (head < tail) {
    const current = queue[head++];
    const x = current % W;
    const y = Math.floor(current / W);
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 14 || nx > W - 14 || ny < 16 || ny > H - 14) continue;
      const next = ny * W + nx;
      if (visited[next] || quest.isBlocked(nx, ny, CAMPUS.colliders)) continue;
      visited[next] = 1;
      queue[tail++] = next;
    }
  }
  for (const p of points) assert.equal(visited[p.y * W + p.x], 1, `${p.name} should be reachable from the campus start`);
});

test('社區層的校園高亮範圍涵蓋校門入口，且入口本身可走', () => {
  assert.ok(PORTALS.campus.x >= CAMPUS_ZONE.x && PORTALS.campus.x <= CAMPUS_ZONE.x + CAMPUS_ZONE.w);
  assert.ok(PORTALS.campus.y >= CAMPUS_ZONE.y && PORTALS.campus.y <= CAMPUS_ZONE.y + CAMPUS_ZONE.h);
  const colliders = quest.prepareBuildingColliders(PGS.BeisheweiMapData.buildings);
  assert.equal(quest.isBlocked(PORTALS.campus.x, PORTALS.campus.y, colliders), false);
});

// ---- 以下用完整建構（假 DOM）測進出校園、鍵盤、滑鼠與按鈕 ----
function makeExplorer(gameOverrides) {
  const game = makeGame(gameOverrides);
  const ui = { renderMenu() {} };
  const ex = new Explorer(game, ui);
  return { ex, game };
}

const keydown = (code) => windowListeners.keydown({ code, preventDefault() {} });
const quickLabels = (ex) => ex.els.quickList.children.map((btn) => btn.children[0].textContent);

test('進出校園：位置、視野、清單與資訊卡都跟著換層', () => {
  const { ex } = makeExplorer();
  ex.open();
  assert.equal(ex.layer, 'community');
  assert.equal(ex.els.layerBtn.classList.contains('hidden'), true, 'exit button hidden on the community layer');
  assert.equal(ex.nearbyLoc.portal, 'campus', 'the spawn point stands at the school entrance');
  assert.match(ex.els.actionBtn.textContent, /進入北園國小校園/);
  assert.equal(ex.els.actionBtn.disabled, false);
  assert.equal(quickLabels(ex)[0], '北園國小（7）');
  for (const loc of campusLocs) assert.ok(!quickLabels(ex).includes(loc.name), `${loc.name} must not be a quick button in the community`);
  assert.equal(quickLabels(ex).length, 12);

  ex.zoomAt(2.5, 100, 100);
  ex.enterCampus();
  assert.equal(ex.layer, 'campus');
  assert.deepEqual([ex.player.x, ex.player.y], [CAMPUS.start.x, CAMPUS.start.y]);
  assert.equal(ex.cam.zoom, 1, 'view resets on layer change');
  assert.equal(ex.els.layerBtn.classList.contains('hidden'), false, 'exit button shows in the campus');
  assert.equal(ex.els.overlay.dataset.layer, 'campus');
  assert.equal(quickLabels(ex)[0], '← 離開校園，回社區');
  assert.equal(quickLabels(ex).length, 1 + 7);
  assert.deepEqual([...quickLabels(ex).slice(1)].sort(), Array.from(campusLocs, (loc) => loc.name).sort());
  assert.ok(ex.nearbyLoc, 'standing at the school gate shows something nearby');

  ex.leaveCampus();
  assert.equal(ex.layer, 'community');
  assert.deepEqual([ex.player.x, ex.player.y], [PORTALS.campus.x, PORTALS.campus.y], 'back at the entrance');
  assert.equal(ex.roadLabelRects, ex.communityRoadLabelRects, 'road-name plates are restored on the community layer');
  assert.equal(ex.els.layerBtn.classList.contains('hidden'), true);
  assert.equal(quickLabels(ex).length, 12);

  ex.setLayer('nowhere');
  assert.equal(ex.layer, 'community', 'unknown layer ignored');
});

test('鍵盤：校園入口按 Enter 進入，Esc 先離開校園、再按才關閉探索', () => {
  const { ex, game } = makeExplorer();
  ex.open();
  assert.equal(ex.nearbyLoc.portal, 'campus');
  keydown('Enter');
  assert.equal(ex.layer, 'campus', 'Enter at the entrance goes in');
  assert.equal(game.calls.consume, 0, 'entering the campus costs nothing');

  keydown('Escape');
  assert.equal(ex.layer, 'community', 'Esc in the campus returns to the community');
  assert.equal(ex.isOpen, true, 'and keeps the explore screen open');
  keydown('Escape');
  assert.equal(ex.isOpen, false, 'Esc on the community layer closes the explore screen');
});

test('鍵盤走路：從校園入口走到出口，走出校門後自動回到社區', () => {
  const { ex } = makeExplorer();
  ex.open();
  ex.enterCampus();
  // 點出口走過去（moveTarget 帶 portal）
  const exitTarget = PORTALS.community;
  ex.moveTarget = { x: exitTarget.x, y: exitTarget.y, portal: 'community' };
  for (let i = 0; i < 80 && ex.layer === 'campus'; i++) ex.updatePlayer(0.05);
  assert.equal(ex.layer, 'community', 'walking onto the exit returns to the community');

  // 方向鍵向上走，圍牆與校舍要擋住（不能穿牆）
  ex.enterCampus();
  ex.keys.ArrowUp = true;
  for (let i = 0; i < 200; i++) ex.updatePlayer(0.05);
  ex.keys.ArrowUp = false;
  assert.equal(ex.layer, 'campus');
  assert.ok(ex.player.y > CAMPUS.colliders[0].maxY, 'the teaching building stops the player');
  assert.equal(quest.isBlocked(ex.player.x, ex.player.y, CAMPUS.colliders), false);
});

test('滑鼠／觸控：點社區的北園國小入口或高亮範圍進校園，點校園出口回社區', () => {
  const { ex } = makeExplorer();
  ex.open();
  const canvas = ex.els.canvas;
  const click = (x, y) => {
    canvas.handlers.pointerdown({ pointerId: 1, clientX: x, clientY: y });
    canvas.handlers.pointerup({ pointerId: 1, clientX: x, clientY: y });
  };
  // 先把主角移走，再點高亮範圍內的空地：應該走向校園入口並進入
  ex.player.x = 140;
  ex.player.y = 190;
  click(130, 130);
  assert.equal(ex.moveTarget.portal, 'campus');
  for (let i = 0; i < 60 && ex.layer === 'community'; i++) ex.updatePlayer(0.05);
  assert.equal(ex.layer, 'campus');

  // 校園層：點出口圖示
  click(PORTALS.community.x, PORTALS.community.y);
  assert.equal(ex.moveTarget.portal, 'community');
  for (let i = 0; i < 60 && ex.layer === 'campus'; i++) ex.updatePlayer(0.05);
  assert.equal(ex.layer, 'community');

  // 社區層點一般空地仍是一般移動，不會被當成入口
  click(300, 300);
  assert.equal(ex.moveTarget.portal, undefined);
});

test('按鈕：清單的北園國小群組、離開校園按鈕、重置視野依層級運作；縮放兩層都可用', () => {
  const { ex } = makeExplorer();
  ex.open();
  ex.els.quickList.children[0].handlers.click();
  assert.equal(ex.layer, 'campus', 'the school group button enters the campus');

  ex.zoomAt(2.4, 240, 175);
  assert.ok(ex.cam.zoom > 1.5);
  ex.els.zoomResetBtn.handlers.click();
  assert.equal(ex.cam.zoom, 1);
  assert.equal(ex.cam.x, 240);
  assert.equal(ex.cam.followPlayer, true);

  ex.els.layerBtn.handlers.click();
  assert.equal(ex.layer, 'community', 'the exit button returns to the community');
  ex.zoomAt(3, 240, 175);
  assert.ok(ex.cam.zoom > 1.5, 'zoom still works on the community layer');
  ex.els.zoomResetBtn.handlers.click();
  assert.equal(ex.cam.zoom, 1);
});

test('關閉探索時人在校園裡，下次打開一律從社區開始', () => {
  const { ex } = makeExplorer();
  ex.open();
  ex.enterCampus();
  ex.close();
  assert.equal(ex.layer, 'community');
  ex.open();
  assert.equal(ex.layer, 'community');
  assert.equal(ex.els.layerBtn.classList.contains('hidden'), true);
});

test('據點互動規則不變：校園據點仍扣探索券、開同一個小遊戲；進出入口不扣', () => {
  const { ex, game } = makeExplorer();
  ex.open();
  ex.enterCampus();
  const opened = [];
  ex.openMiniGame = (loc) => opened.push(loc.id);
  const slide = LOCATIONS.find((loc) => loc.id === 'beiyuan_slide');
  ex.tryStartMiniGame(slide);
  assert.deepEqual(opened, ['beiyuan_slide']);
  assert.equal(game.calls.consume, 1, 'a campus location still spends one explore cost');

  // 走到旋轉溜滑梯旁，資訊卡顯示原本的小遊戲按鈕
  ex.player.x = slide.campus.x;
  ex.player.y = slide.campus.y;
  ex.updateNearbyLocation(true);
  assert.equal(ex.nearbyLoc.id, 'beiyuan_slide');
  assert.match(ex.els.actionBtn.textContent, /自然課沙坑聚光鏡/);
  assert.match(ex.els.actionBtn.textContent, /消耗 1 次免費探索/);

  const consumed = game.calls.consume;
  ex.tryStartMiniGame(PORTALS.community);
  assert.equal(ex.layer, 'community');
  assert.equal(game.calls.consume, consumed, 'leaving the campus is free');
});

test('存檔相容：進出校園與畫清單都不新增存檔欄位', () => {
  const { ex, game } = makeExplorer();
  const before = JSON.stringify(game.save);
  ex.open();
  ex.enterCampus();
  ex.renderQuickList();
  ex.leaveCampus();
  ex.close();
  assert.equal(JSON.stringify(game.save), before, 'save data is untouched by the layer feature');
  assert.ok(!/save\.[A-Za-z]*[Ll]ayer/.test(read('../src/explore.js')), 'layer is never written into the save');

  // 舊存檔（沒有 communityAtlas）也能正常開啟與進出校園
  const old = makeExplorer({ save: { gold: 0, freeExplores: 0, unlockedWeapons: ['a', 'b', 'c', 'd'], unlockedRunes: ['x', 'y'] } });
  old.ex.open();
  old.ex.enterCampus();
  old.ex.leaveCampus();
  assert.equal(old.ex.layer, 'community');
});

test('圖鑑提示：校內據點會提醒先進校園', () => {
  const { ex } = makeExplorer();
  ex.renderAtlas();
  const hints = ex.els.atlasGrid.children.map((card) => card.children.find((child) => child.className === 'atlas-hint')).filter(Boolean);
  assert.equal(hints.length, 18);
  assert.equal(hints.filter((hint) => /先走進北園國小校園/.test(hint.textContent)).length, 7);
});

test('HTML 有進出校園用的標籤與按鈕，且 id 不重複', () => {
  const html = read('../index.html');
  for (const id of ['explore-layer-tag', 'explore-layer-btn']) assert.match(html, new RegExp(`id="${id}"`));
  const ids = Array.from(html.matchAll(/\bid="([^"]+)"/g), (match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(read('../style.css'), /\/\* F9 探索地圖分區/);
  assert.ok(elements['explore-layer-btn']);
});

// ===== F12：校園邊界與校門回社區 =====

test('F12-5 校園層：用方向鍵自校門缺口往南走，跨出校園南界即自動回社區', () => {
  const { ex } = makeExplorer();
  ex.open();
  ex.enterCampus();
  assert.ok(ex.player.x >= CAMPUS.gateGap.minX && ex.player.x <= CAMPUS.gateGap.maxX);
  ex.keys.ArrowDown = true;
  for (let i = 0; i < 60 && ex.layer === 'campus'; i++) ex.updatePlayer(0.05);
  ex.keys.ArrowDown = false;
  assert.equal(ex.layer, 'community', '走出校門缺口應回到社區');
  assert.deepEqual([ex.player.x, ex.player.y], [PORTALS.campus.x, PORTALS.campus.y]);
});

test('F12-5 校園層：點擊目的地與鍵盤移動都限制在校園範圍內，不會走到圍牆外', () => {
  const { ex } = makeExplorer();
  ex.open();
  ex.enterCampus();
  const canvas = ex.els.canvas;
  const click = (x, y) => {
    canvas.handlers.pointerdown({ pointerId: 1, clientX: x, clientY: y });
    canvas.handlers.pointerup({ pointerId: 1, clientX: x, clientY: y });
  };
  const b = CAMPUS.bounds;
  for (const [x, y] of [[2, 2], [478, 3], [3, 345], [479, 348]]) {
    click(x, y);
    assert.ok(ex.moveTarget.x >= b.minX && ex.moveTarget.x <= b.maxX && ex.moveTarget.y >= b.minY && ex.moveTarget.y <= b.maxY,
      `點 (${x}, ${y}) 的目的地應夾在校園內，實際 (${ex.moveTarget.x}, ${ex.moveTarget.y})`);
  }
  // 往東走到底（先離開校門缺口、走到校園中段再往東），不會越過東界
  ex.player.x = 300;
  ex.player.y = 200;
  ex.keys.ArrowRight = true;
  for (let i = 0; i < 200; i++) ex.updatePlayer(0.05);
  ex.keys.ArrowRight = false;
  assert.ok(ex.player.x <= b.maxX, `東界 ${b.maxX}，實際 ${ex.player.x}`);
  // 圍牆南段（非缺口處）往南不會走出去，也不會誤觸發回社區
  ex.player.x = 100;
  ex.player.y = 300;
  ex.keys.ArrowDown = true;
  for (let i = 0; i < 100; i++) ex.updatePlayer(0.05);
  ex.keys.ArrowDown = false;
  assert.equal(ex.layer, 'campus');
  assert.ok(ex.player.y <= b.maxY, `南界 ${b.maxY}，實際 ${ex.player.y}`);
});

// ===== F13：Gemini 收尾外審——校門缺口點擊與斜向移動 =====

test('F13-1 校園層：點校門缺口南側，角色走出缺口後自動回社區', () => {
  const { ex } = makeExplorer();
  ex.open();
  ex.enterCampus();
  const canvas = ex.els.canvas;
  // 點在缺口範圍內、又離「離開校園」出口超過吸附距離（24），才不會被當成點出口
  const gx = CAMPUS.gateGap.minX + 3;
  const gy = 349;
  assert.ok(Math.hypot(gx - PORTALS.community.x, gy - PORTALS.community.y) > 24, '測試點不得落在出口吸附範圍內');
  canvas.handlers.pointerdown({ pointerId: 1, clientX: gx, clientY: gy });
  canvas.handlers.pointerup({ pointerId: 1, clientX: gx, clientY: gy });
  assert.ok(ex.moveTarget.y > CAMPUS.bounds.maxY, `缺口南側的目的地不應被夾在南界，實際 y=${ex.moveTarget.y}`);
  for (let i = 0; i < 200 && ex.layer === 'campus'; i++) ex.updatePlayer(0.05);
  assert.equal(ex.layer, 'community', '點缺口南側應走出校門回社區');
  // 缺口以外的南側點擊仍夾在南界內
  ex.enterCampus();
  canvas.handlers.pointerdown({ pointerId: 1, clientX: 100, clientY: gy });
  canvas.handlers.pointerup({ pointerId: 1, clientX: 100, clientY: gy });
  assert.ok(ex.moveTarget.y <= CAMPUS.bounds.maxY, `缺口以外仍夾限，實際 y=${ex.moveTarget.y}`);
});

test('F13-2 校園層：斜向移動時 X 被擋、Y 通過，不會越過南界卻留在校園層', () => {
  const { ex } = makeExplorer();
  ex.open();
  ex.enterCampus();
  const b = CAMPUS.bounds;
  // 單步位移放大（dt=0.3，遊戲迴圈本身把 dt 限在 0.05 以內，要放大才碰得到）：
  // 候選 x 落在缺口內但被校門柱擋住、y 卻穿過南牆，修正前會停在校園層界外
  Object.assign(ex.player, { x: 200, y: 306 });
  ex.keys = { ArrowDown: true, ArrowRight: true };
  ex.updatePlayer(0.3);
  ex.keys = {};
  assert.equal(ex.layer, 'campus', 'x 沒有真的進缺口，不該換層');
  assert.ok(ex.player.y <= b.maxY, `實際 x=${ex.player.x} 不在缺口內時 y 不得超過南界，實際 y=${ex.player.y}`);

  // 南界附近掃描五種單步長度與兩個斜向：不是回社區，就必須留在南界內
  for (let x = 180; x <= 290; x += 1) {
    for (let y = b.maxY - 30; y <= b.maxY; y += 2) {
      for (const dt of [0.02, 0.05, 0.1, 0.2, 0.3]) {
        for (const side of ['ArrowRight', 'ArrowLeft']) {
          if (ex.layer === 'community') ex.enterCampus();
          Object.assign(ex.player, { x, y });
          ex.keys = { ArrowDown: true, [side]: true };
          ex.updatePlayer(dt);
          ex.keys = {};
          if (ex.layer === 'campus') {
            assert.ok(ex.player.y <= b.maxY, `起點 (${x}, ${y}) dt=${dt} ${side} 後停在校園層界外 (${ex.player.x}, ${ex.player.y})`);
          }
        }
      }
    }
  }
});

test('F13-3 校園層：隨機方向鍵與點擊數百步後，不是在校園範圍內就是已回社區', () => {
  let seed = 20261118;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const { ex } = makeExplorer();
  ex.open();
  const canvas = ex.els.canvas;
  const b = CAMPUS.bounds;
  const keyNames = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  for (let round = 0; round < 40; round++) {
    if (ex.layer === 'community') ex.enterCampus();
    // 隨機起點多半放在校門缺口與南界附近，才測得到邊界
    if (rand() < 0.7) Object.assign(ex.player, { x: 200 + rand() * 80, y: b.maxY - rand() * 20 });
    for (let step = 0; step < 20 && ex.layer === 'campus'; step++) {
      if (rand() < 0.3) {
        const cx = rand() * 480;
        const cy = 250 + rand() * 100;
        canvas.handlers.pointerdown({ pointerId: 1, clientX: cx, clientY: cy });
        canvas.handlers.pointerup({ pointerId: 1, clientX: cx, clientY: cy });
      } else {
        ex.keys = {};
        for (const k of keyNames) if (rand() < 0.4) ex.keys[k] = true;
      }
      for (let i = 0; i < 8 && ex.layer === 'campus'; i++) ex.updatePlayer(0.05);
      if (ex.layer === 'campus') {
        const p = ex.player;
        assert.ok(p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY,
          `校園層玩家不得在範圍外，實際 (${p.x}, ${p.y})`);
      }
    }
  }
});
