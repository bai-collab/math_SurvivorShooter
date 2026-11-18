(function (global) {
  'use strict';

  const PGS = (global.PGS = global.PGS || {});

  const CAM_HEIGHT = 18;
  const CAM_OFFSET_Z = 24;
  const TILT_X = -Math.atan2(CAM_HEIGHT, CAM_OFFSET_Z);
  // 正交攝影機的垂直半視野（世界單位）；水平半視野 = VIEW_SIZE × 視窗寬高比
  const VIEW_SIZE = 13.5;

  function createPool(scene, texture, maxCount, w, h, useColor = false) {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, maxCount);
    mesh.count = 0;
    mesh.frustumCulled = false;
    if (useColor) {
      const white = new THREE.Color(0xffffff);
      for (let i = 0; i < maxCount; i++) {
        mesh.setColorAt(i, white);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    scene.add(mesh);
    return mesh;
  }

  function createTerrainCircleTexture(fillColor, ringColor, dotColor) {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext('2d');
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const dx = x - 15.5;
        const dy = y - 15.5;
        const r = Math.hypot(dx, dy);
        if (r > 15) continue;
        if (r > 13.3) {
          ctx.fillStyle = ringColor;
          ctx.fillRect(x, y, 1, 1);
        } else if ((x * 7 + y * 13) % 19 === 0) {
          ctx.fillStyle = dotColor;
          ctx.fillRect(x, y, 1, 1);
        } else {
          ctx.fillStyle = fillColor;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  function createTelegraphTexture(isRing) {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext('2d');
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const r = Math.hypot(x - 15.5, y - 15.5);
        if (r > 15) continue;
        if (isRing) {
          if (r >= 13.0) {
            ctx.fillStyle = '#ff384c';
            ctx.fillRect(x, y, 1, 1);
          } else if (r >= 11.6 && (x + y) % 2 === 0) {
            ctx.fillStyle = '#ff8a96';
            ctx.fillRect(x, y, 1, 1);
          }
        } else {
          ctx.fillStyle = r > 13.8 ? '#ff4455' : 'rgba(255, 56, 76, 0.55)';
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  function createTerrainPool(scene, texture, maxCount) {
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, maxCount);
    mesh.count = 0;
    mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  }

  function createFxPool(scene, maxCount) {
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, maxCount);
    mesh.count = 0;
    mesh.frustumCulled = false;
    const white = new THREE.Color(0xffffff);
    for (let i = 0; i < maxCount; i++) {
      mesh.setColorAt(i, white);
    }
    scene.add(mesh);
    return mesh;
  }

  // 文字標籤（答案踏板題字、數字稻穀數字）：一律畫在所有世界物件之上（depthTest 關閉＋高 renderOrder），
  // 不會被寶石、怪物、子彈、障礙物蓋住。答案標籤最高，數字稻穀略低但仍高於一般世界物件與特效。
  const ANSWER_LABEL_RENDER_ORDER = 100;
  const GRAIN_LABEL_RENDER_ORDER = 55;
  const LABEL_STYLES = {
    pad: { w: 512, h: 96, base: '#211a36', edge: '#ffd058', font: 56, minFont: 30, fitPlate: true },
    grain: { w: 256, h: 96, base: '#294631', edge: '#b9e96f', font: 58, minFont: 30, fitPlate: false },
  };

  // 重畫標籤：字太長時先縮字（不橫向壓扁），底板寬度依文字量測決定並置中；畫布大小固定（避免 GPU 貼圖重配）
  function paintTextLabel(label, text) {
    const { ctx, kind, canvas } = label;
    const st = LABEL_STYLES[kind] || LABEL_STYLES.pad;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    const avail = w - 36;
    let font = st.font;
    ctx.font = `bold ${font}px monospace`;
    let textW = ctx.measureText(text).width;
    if (textW > avail) {
      font = Math.max(st.minFont, Math.floor((font * avail) / textW));
      ctx.font = `bold ${font}px monospace`;
      textW = ctx.measureText(text).width;
    }
    const plateW = st.fitPlate ? Math.min(w, Math.max(110, Math.ceil(textW + 44))) : w;
    const x0 = Math.round((w - plateW) / 2);
    ctx.fillStyle = st.edge;
    ctx.fillRect(x0, 0, plateW, h);
    ctx.fillStyle = st.base;
    ctx.fillRect(x0 + 5, 5, plateW - 10, h - 10);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#100d1b';
    ctx.fillStyle = '#fff4d0';
    ctx.strokeText(text, w / 2, h / 2 + 2, avail);
    ctx.fillText(text, w / 2, h / 2 + 2, avail);
    label.plateW = plateW;
    label.texture.needsUpdate = true;
  }

  function createTextLabel(text, kind) {
    const st = LABEL_STYLES[kind] || LABEL_STYLES.pad;
    const canvas = document.createElement('canvas');
    canvas.width = st.w;
    canvas.height = st.h;
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }));
    sprite.renderOrder = kind === 'grain' ? GRAIN_LABEL_RENDER_ORDER : ANSWER_LABEL_RENDER_ORDER;
    const label = { sprite, canvas, ctx, texture, text: String(text), kind, plateW: st.w };
    if (kind === 'grain') sprite.scale.set(1.25, 0.48, 1);
    paintTextLabel(label, label.text);
    return label;
  }

  function setTextLabel(label, text) {
    text = String(text);
    if (label.text === text) return;
    label.text = text;
    paintTextLabel(label, text);
  }

  // 貼圖與 SpriteMaterial 都要釋放（只釋放貼圖會讓材質留在 GPU 端）
  function disposeTextLabel(label) {
    if (label.sprite.parent) label.sprite.parent.remove(label.sprite);
    label.texture.dispose();
    label.sprite.material.dispose();
  }

  const COS_T = Math.cos(TILT_X);
  const SIN_T = Math.sin(TILT_X);
  const ANSWER_LABEL_BASE_Y = 3.25;
  const ANSWER_LABEL_MIN_HEIGHT = 1.1;
  // 垂直安全區縮到標籤高度的這個比例以下就不再縮，視為放不下
  const ANSWER_LABEL_MIN_SCALE = 0.6;

  // 答案標籤的世界尺寸：高度約為舊版的 1.5 倍（800×600 畫面中文字高約 16～20 像素），寬度依底板量測
  function answerLabelSize(label, labelSize) {
    const h = Math.max(ANSWER_LABEL_MIN_HEIGHT, (labelSize || 2.2) * 0.37 * 1.5);
    const canvasW = label.canvas.width;
    const canvasH = label.canvas.height;
    return { h, spriteW: (h * canvasW) / canvasH, plateW: (h * label.plateW) / canvasH };
  }

  // 排列答案標籤高度：標籤固定在踏板正上方（x 與踏板圓心相同）；螢幕上與前面已放好的標籤矩形重疊時整個往上錯開。
  // items: [{ x, z, h, plateW }]；回傳每個標籤的世界 y。螢幕垂直座標 v = y × cosθ + z × SIN_T（SIN_T 為負，z 越大越靠下）。
  function layoutAnswerLabelHeights(items) {
    const placed = [];
    return items.map((it) => {
      let y = ANSWER_LABEL_BASE_Y;
      for (let attempt = 0; attempt < 8; attempt++) {
        const v = y * COS_T + it.z * SIN_T;
        const hit = placed.find((r) => Math.abs(r.x - it.x) < (r.w + it.plateW) / 2 + 0.05 && Math.abs(r.v - v) < (r.h + it.h) / 2 + 0.05);
        if (!hit) break;
        y += (it.h * 1.1) / COS_T;
      }
      placed.push({ x: it.x, v: y * COS_T + it.z * SIN_T, w: it.plateW, h: it.h });
      return y;
    });
  }
  // 答案標籤可以出現的螢幕範圍（像素）。要避開的 DOM 物件：
  //   題目橫幅 .math-quiz-banner（style.css：寬螢幕 top 18%、寬 min(78vw, 760px)；手機 ≤600px top 20%、寬 92vw），
  //   HUD 頂部列（在橫幅上方），以及底部的右下虛擬搖桿與左下武器欄。
  // 橫幅高度隨題目與提示變動，這裡預留 bannerReservePx；底部預留 bottomReservePx。數值要和 style.css 一起改。
  const ANSWER_LABEL_SAFE = {
    narrowMaxWidth: 600,
    bannerTopFrac: { wide: 0.18, narrow: 0.2 },
    bannerWidth: { wideVw: 0.78, wideMaxPx: 760, narrowVw: 0.92 },
    bannerReservePx: 176,
    bottomReservePx: 150,
    marginPx: 6,
  };

  function answerLabelSafeRect(pxW, pxH) {
    const S = ANSWER_LABEL_SAFE;
    const narrow = pxW <= S.narrowMaxWidth;
    const bannerTop = pxH * (narrow ? S.bannerTopFrac.narrow : S.bannerTopFrac.wide);
    const bannerW = narrow ? pxW * S.bannerWidth.narrowVw : Math.min(pxW * S.bannerWidth.wideVw, S.bannerWidth.wideMaxPx);
    return {
      left: S.marginPx,
      right: pxW - S.marginPx,
      top: bannerTop + S.bannerReservePx + S.marginPx,
      bottom: pxH - S.bottomReservePx - S.marginPx,
      banner: { left: (pxW - bannerW) / 2, right: (pxW + bannerW) / 2, top: bannerTop, bottom: bannerTop + S.bannerReservePx },
    };
  }

  // 依實際相機投影排列答案標籤，保證每個標籤整塊落在安全範圍內、彼此不重疊。
  // items: [{ x, z, h, plateW }]（世界座標；h 為標籤高、plateW 為底板寬）。
  // view: { cx, cz, halfW, halfH, pxW, pxH }：相機對準的地面點、正交半視野（世界單位）與畫面像素。
  // 螢幕垂直座標 v = y × cosθ + (z − cz) × SIN_T（θ 為相機俯角；SIN_T 為負，z 越大越靠下）。
  // 回傳每個標籤的 { x, y, scale }：x 會往內夾進視野；底板比視野還寬時整體縮小；
  // 優先放在踏板上方 ANSWER_LABEL_BASE_Y，過近就往上錯開，超出安全範圍或放不下時改往下找空位。
  // 縮放同時考慮水平寬度與垂直安全高度；回傳陣列的 fits 為 false 表示這個視窗放不下
  //（垂直安全區小於標籤高度的 ANSWER_LABEL_MIN_SCALE 倍，或標籤堆疊後找不到不重疊的位置），呼叫端應改走暫停作答。
  function layoutAnswerLabels(items, view) {
    const unit = (2 * view.halfH) / view.pxH;
    const safe = answerLabelSafeRect(view.pxW, view.pxH);
    const xL = -view.halfW + safe.left * unit;
    const xR = view.halfW - (view.pxW - safe.right) * unit;
    const vMax = view.halfH - safe.top * unit;
    const vMin = view.halfH - safe.bottom * unit;
    const placed = [];
    let fits = true;
    const result = items.map((it) => {
      const vScale = (vMax - vMin) / it.h;
      if (vScale < ANSWER_LABEL_MIN_SCALE) fits = false;
      const scale = Math.min(1, (xR - xL) / it.plateW, Math.max(vScale, ANSWER_LABEL_MIN_SCALE));
      const w = it.plateW * scale;
      const h = it.h * scale;
      const dx = Math.min(xR - w / 2, Math.max(xL + w / 2, it.x - view.cx));
      const groundV = (it.z - view.cz) * SIN_T;
      const lo = vMin + h / 2;
      const hi = Math.max(lo, vMax - h / 2);
      const clampV = (v) => Math.min(hi, Math.max(lo, v));
      const v0 = clampV(ANSWER_LABEL_BASE_Y * COS_T + groundV);
      const free = (v) => !placed.some((r) => Math.abs(r.x - dx) < (r.w + w) / 2 + 0.05 && Math.abs(r.v - v) < (r.h + h) / 2 + 0.05);
      const step = h * 1.1;
      let v = v0;
      let found = free(v0);
      for (let k = 1; !found && k <= 8; k++) {
        for (const cand of [v0 + k * step, v0 - k * step]) {
          if (cand < lo - 1e-9 || cand > hi + 1e-9) continue;
          if (free(cand)) { v = cand; found = true; break; }
        }
      }
      if (!found) fits = false;
      placed.push({ x: dx, v, w, h });
      return { x: view.cx + dx, y: (v - groundV) / COS_T, scale };
    });
    result.fits = fits;
    return result;
  }

  // 地面上的點投影到畫面像素（相機對準 (cx, cz)，垂直座標同 layoutAnswerLabels）
  function projectGroundPoint(x, z, view) {
    const v = (z - view.cz) * SIN_T;
    return {
      x: (((x - view.cx) / view.halfW + 1) / 2) * view.pxW,
      y: ((1 - v / view.halfH) / 2) * view.pxH,
    };
  }

  // 踏板圓台（以正方形粗估）是否碰到題目橫幅保留區
  function padOverlapsBanner(pad, view) {
    const banner = answerLabelSafeRect(view.pxW, view.pxH).banner;
    const c = projectGroundPoint(pad.x, pad.z, view);
    const half = ((pad.visualSize || 2.35) / 2 / (2 * view.halfW)) * view.pxW;
    return c.x - half < banner.right && banner.left < c.x + half && c.y - half < banner.bottom && banner.top < c.y + half;
  }
  const ANIM_STEP = 0.45; // 地面與環境 2 幀動畫的換幀間隔（秒）
  const DECOR_CELL = 5; // 地面裝飾的網格邊長（世界單位）
  const DECOR_CAP = 140;
  // 地面裝飾保留機率（每格）：第 1 關稻香田野降到約 1/4，避免背景太花；其餘兩關維持原密度
  const DECOR_KEEP = { meadow: 0.12, ruins: 0.55, temple: 0.55 };
  const DAMAGE_POOL = 36;

  // 各關背景色、光點（螢火蟲／餘燼／花粉）設定與是否有白鷺鷥
  const THEMES = {
    meadow: { bg: 0x2a3a24, sparks: 10, sparkColor: [1.0, 0.97, 0.72], rise: false, egret: [1, 1, 1] },
    ruins: { bg: 0x2a1a1c, sparks: 26, sparkColor: [1.0, 0.62, 0.28], rise: true, egret: null },
    temple: { bg: 0x0e1430, sparks: 38, sparkColor: [0.8, 1.0, 0.52], rise: false, egret: [0.74, 0.86, 1.15] },
  };

  // 子彈拖尾：len 為拖尾長度、w 為寬度（世界單位）
  const TRAIL_DEFS = {
    bullet: { len: 1.1, w: 0.26 },
    pellet: { len: 0.7, w: 0.22 },
    rail: { len: 2.4, w: 0.34 },
    ricochet: { len: 1.0, w: 0.28 },
    missile: { len: 1.5, w: 0.34 },
    fire: { len: 1.0, w: 0.46 },
    cryo: { len: 1.1, w: 0.3 },
    venom: { len: 0.9, w: 0.28 },
    egret: { len: 1.3, w: 0.24 },
  };

  const OBSTACLE_VISUAL_SCALE = 0.7;

  const DAMAGE_STYLES = {
    // 畫面上的字高約等於 font × w：爆擊 38×2.5 為基準，一般數字約 70%、擊倒數字約 80%，小畫面也看得清楚。
    normal: { fill: '#fff4d0', font: 34, life: 0.7, w: 1.96 },
    crit: { fill: '#ffd058', font: 38, life: 0.95, w: 2.5 },
    kill: { fill: '#ff9a6a', font: 36, life: 0.85, w: 2.1 },
    player: { fill: '#ff5a5a', font: 30, life: 0.9, w: 1.9 },
    heal: { fill: '#7dff9a', font: 28, life: 0.8, w: 1.7 },
    shield: { fill: '#7de9ff', font: 26, life: 0.7, w: 1.8 },
  };

  function createDamageSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }));
    sprite.renderOrder = 60;
    sprite.visible = false;
    return { sprite, ctx, texture, age: 0, life: 0, x: 0, z: 0, jitter: 0, style: DAMAGE_STYLES.normal, active: false };
  }

  function paintDamageSprite(item, text, style) {
    const ctx = item.ctx;
    ctx.clearRect(0, 0, 128, 48);
    ctx.font = `bold ${style.font}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(7, Math.round(style.font * 0.22));
    ctx.strokeStyle = '#100d1b';
    ctx.strokeText(text, 64, 26, 120);
    ctx.fillStyle = style.fill;
    ctx.fillText(text, 64, 26, 120);
    item.texture.needsUpdate = true;
  }

  // 由既有精靈圖的透明度取出白色剪影，作為菁英怪外框光暈
  function createSilhouetteTexture(sourceTexture) {
    const src = sourceTexture && sourceTexture.image;
    const c = document.createElement('canvas');
    c.width = (src && src.width) || 26;
    c.height = (src && src.height) || 26;
    const ctx = c.getContext('2d');
    if (src) ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    return tex;
  }

  function makeAdditive(mesh, opacity) {
    mesh.material.blending = THREE.AdditiveBlending;
    mesh.material.depthWrite = false;
    mesh.material.alphaTest = 0;
    if (opacity != null) mesh.material.opacity = opacity;
    mesh.material.needsUpdate = true;
  }

  function hashUnit(a, b) {
    const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  class PixelRenderer {
    constructor(container, textures) {
      this.textures = textures;
      const st = textures.stage;
      if (!st) throw new Error('缺少 stage-art.js：無法建立三關主題場景');
      this.stageArt = st;
      this.theme = 'meadow';
      this.animClock = 0;
      this.animFrame = 0;
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(THEMES.meadow.bg);

      this.viewSize = VIEW_SIZE;
      const aspect = container.clientWidth / Math.max(1, container.clientHeight);
      this.camera = new THREE.OrthographicCamera(
        -this.viewSize * aspect,
        this.viewSize * aspect,
        this.viewSize,
        -this.viewSize,
        0.1,
        120
      );

      this.renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: 'high-performance',
      });
      this.renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.viewPx = { w: container.clientWidth, h: Math.max(1, container.clientHeight) };
      this.renderer.domElement.style.imageRendering = 'pixelated';
      container.appendChild(this.renderer.domElement);

      // 地面（Bayer 4x4 抖動像素地磚）
      const groundGeo = new THREE.PlaneGeometry(240, 240);
      this.groundMat = new THREE.MeshBasicMaterial({ map: st.ground.meadow[0] });
      const ground = new THREE.Mesh(groundGeo, this.groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0;
      this.scene.add(ground);

      // 動態局部環境池與障礙物池（貼圖隨關卡主題與 2 幀動畫替換）
      this.terrainPools = {
        swamp: createTerrainPool(this.scene, st.terrain.meadow.swamp[0], 12),
        poison: createTerrainPool(this.scene, st.terrain.meadow.poison[0], 12),
        thunder: createTerrainPool(this.scene, st.terrain.meadow.thunder[0], 12),
        ice: createTerrainPool(this.scene, st.terrain.meadow.ice[0], 12),
        water: createTerrainPool(this.scene, createTerrainCircleTexture('#174b70', '#55d9ff', '#a9f2ff'), 24),
      };
      for (const kind of ['swamp', 'poison', 'thunder', 'ice']) this.terrainPools[kind].material.opacity = 0.86;
      // 障礙物：每關 3 種站立精靈（稻草堆／竹叢／稻草人 等），碰撞尺寸仍由 zone.radius 決定
      this.obstaclePools = st.obstacles.meadow.map((tex) => createPool(this.scene, tex, 16, 1, 1, false));

      // 地面裝飾（不參與碰撞）：花草、小石、蘆葦等，只在玩家所在網格改變時重排
      this.decorPools = st.decor.meadow.map((tex) => createPool(this.scene, tex, DECOR_CAP, 1, 1, false));
      this.decorKey = '';

      // 白鷺鷥（2 幀拍翅，各 3 隻上限）
      this.egretPools = st.egret.map((tex) => createPool(this.scene, tex, 3, 2.1, 1.54, true));
      this.egrets = Array.from({ length: 3 }, () => ({ x: 0, z: 0, dir: 1, speed: 3, h: 3.6, phase: 0, ready: false }));

      // 光點（螢火蟲／餘燼／花粉），加亮混合
      this.sparkPool = createPool(this.scene, st.glow, 40, 0.5, 0.5, true);
      makeAdditive(this.sparkPool, 0.95);
      this.sparks = Array.from({ length: 40 }, (_, i) => ({ x: 0, z: 0, y: 0.8, phase: i * 1.7, vx: 0, vz: 0, ready: false }));

      // 子彈拖尾與菁英怪光環（皆為上限固定的實例池）
      const trailMat = new THREE.MeshBasicMaterial({
        map: st.trail,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      this.trailPool = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), trailMat, 420);
      this.trailPool.count = 0;
      this.trailPool.frustumCulled = false;
      const whiteTrail = new THREE.Color(0xffffff);
      for (let i = 0; i < 420; i++) this.trailPool.setColorAt(i, whiteTrail);
      this.scene.add(this.trailPool);

      this.eliteRingPool = createTerrainPool(this.scene, st.eliteRing, 40);
      makeAdditive(this.eliteRingPool, 0.85);
      this.eliteHaloPool = createPool(this.scene, createSilhouetteTexture(textures.elite), 40, 2.35, 2.35, true);
      this.eliteHaloPool.material.opacity = 0.9;
      this.bossRingPool = createTerrainPool(this.scene, st.eliteRing, 3);
      makeAdditive(this.bossRingPool, 0.95);

      // 傷害數字：固定 36 個精靈，反覆使用；只在生成時重繪文字
      this.damageItems = Array.from({ length: DAMAGE_POOL }, () => {
        const item = createDamageSprite();
        this.scene.add(item.sprite);
        return item;
      });
      this.damageCursor = 0;
      this.damageBudget = 0;

      // 怪物攻擊紅色預警圈（外框範圍 + 擴張進度內圈）
      this.telegraphRingPool = createTerrainPool(this.scene, createTelegraphTexture(true), 40);
      this.telegraphRingPool.material.opacity = 0.92;
      this.telegraphFillPool = createTerrainPool(this.scene, createTelegraphTexture(false), 40);
      this.telegraphFillPool.material.opacity = 0.5;

      // 玩家 2.5D 貼片
      const pGeo = new THREE.PlaneGeometry(1.45, 1.75);
      const pMat = new THREE.MeshBasicMaterial({
        map: textures.player,
        transparent: true,
        alphaTest: 0.35,
        side: THREE.DoubleSide,
      });
      this.playerMesh = new THREE.Mesh(pGeo, pMat);
      this.playerMesh.rotation.x = TILT_X;
      this.scene.add(this.playerMesh);

      // 陰影池（向右下方投射，呼應 pixel-plays 硬陰影）
      this.shadowPool = createPool(this.scene, textures.shadow, 700, 1.3, 0.85, false);
      this.shadowPool.rotation.x = 0;

      // 怪物實例池
      this.enemyPools = {
        crawler: createPool(this.scene, textures.crawler, 220, 1.25, 1.25, true),
        runner: createPool(this.scene, textures.runner, 160, 1.35, 1.5, true),
        tank: createPool(this.scene, textures.tank, 100, 1.95, 1.95, true),
        elite: createPool(this.scene, textures.elite, 40, 2.35, 2.35, true),
        boss_meadow: createPool(this.scene, textures.boss_meadow, 1, 4.8, 4.8, true),
        boss_ruins: createPool(this.scene, textures.boss_ruins, 1, 4.8, 4.8, true),
        boss_temple: createPool(this.scene, textures.boss_temple, 1, 5.8, 4.8, true),
        dagger: createPool(this.scene, textures.dagger, 260, 1.35, 1.5, true),
        blade: createPool(this.scene, textures.blade, 180, 1.65, 1.65, true),
        spear: createPool(this.scene, textures.spear, 220, 1.5, 1.5, true),
        archer: createPool(this.scene, textures.archer, 40, 1.5, 1.65, true),
        slinger: createPool(this.scene, textures.slinger, 40, 1.5, 1.65, true),
        mage_fire: createPool(this.scene, textures.mage_fire, 24, 1.7, 1.85, true),
        mage_ice: createPool(this.scene, textures.mage_ice, 24, 1.7, 1.85, true),
        mage_thunder: createPool(this.scene, textures.mage_thunder, 24, 1.7, 1.85, true),
      };

      // 敵方遠程投射物池
      this.enemyProjPools = {
        e_arrow: createPool(this.scene, textures.e_arrow, 80, 0.8, 0.65, false),
        e_stone: createPool(this.scene, textures.e_stone, 80, 0.65, 0.65, false),
        e_fire: createPool(this.scene, textures.e_fire, 80, 0.78, 0.78, false),
        e_ice: createPool(this.scene, textures.e_ice, 80, 0.78, 0.78, false),
        e_thunder: createPool(this.scene, textures.e_thunder, 80, 0.78, 0.78, false),
      };

      // 子彈實例池
      this.projPools = {
        bullet: createPool(this.scene, textures.bullet, 260, 0.55, 0.55, false),
        pellet: createPool(this.scene, textures.pellet, 260, 0.45, 0.45, false),
        rail: createPool(this.scene, textures.rail, 140, 1.3, 0.55, false),
        ricochet: createPool(this.scene, textures.ricochet, 180, 0.6, 0.6, false),
        grenade: createPool(this.scene, textures.grenade, 120, 0.8, 0.8, false),
        missile: createPool(this.scene, textures.missile, 160, 0.9, 0.6, false),
        saw: createPool(this.scene, textures.saw, 100, 1.15, 1.15, false),
        cryo: createPool(this.scene, textures.cryo, 180, 0.75, 0.6, false),
        venom: createPool(this.scene, textures.venom, 180, 0.6, 0.6, false),
        vortex: createPool(this.scene, textures.vortex, 40, 1.8, 1.8, false),
        fire: createPool(this.scene, textures.fire, 200, 0.7, 0.7, false),
        sonic: createPool(this.scene, textures.sonic, 100, 1.0, 1.15, false),
        fraction: createPool(this.scene, textures.fraction, 160, 0.62, 0.62, false),
        fraction_half: createPool(this.scene, textures.fraction_half, 180, 1.2, 0.7, false),
        fraction_quarter: createPool(this.scene, textures.fraction_quarter, 240, 1.2, 0.7, false),
        water: createPool(this.scene, textures.water, 80, 1.6, 0.5, false),
        egret: createPool(this.scene, textures.egret, 100, 0.9, 0.62, false),
        firecracker: createPool(this.scene, textures.firecracker, 140, 0.7, 0.7, false),
      };

      // 掉落物實例池
      this.gemPool = createPool(this.scene, textures.gem, 400, 0.65, 0.78, false);
      this.coinPool = createPool(this.scene, textures.coin, 150, 0.65, 0.65, false);
      this.ricePool = createPool(this.scene, textures.rice_pickup, 160, 0.72, 0.78, false);
      this.runePools = {
        fire: createPool(this.scene, textures.rune_fire, 40, 0.9, 0.9, false),
        thunder: createPool(this.scene, textures.rune_thunder, 40, 0.9, 0.9, false),
        ice: createPool(this.scene, textures.rune_ice, 40, 0.9, 0.9, false),
        light: createPool(this.scene, textures.rune_light, 40, 0.9, 0.9, false),
        vampire: createPool(this.scene, textures.rune_vampire, 40, 0.9, 0.9, false),
        quake: createPool(this.scene, textures.rune_quake, 40, 0.9, 0.9, false),
        water: createPool(this.scene, textures.rune_water, 40, 0.9, 0.9, false),
        rice: createPool(this.scene, textures.rune_rice, 40, 0.9, 0.9, false),
        solar: createPool(this.scene, textures.rune_solar, 40, 0.9, 0.9, false),
      };
      this.gearPools = {
        weapon: createPool(this.scene, textures.gear_weapon, 30, 0.95, 0.95, false),
        shield: createPool(this.scene, textures.gear_shield, 30, 0.95, 0.95, false),
        glove: createPool(this.scene, textures.gear_glove, 30, 0.95, 0.95, false),
        boot: createPool(this.scene, textures.gear_boot, 30, 0.95, 0.95, false),
      };
      this.cardPool = createPool(this.scene, textures.card_drop, 60, 0.78, 0.9, false);
      this.answerPadPool = createTerrainPool(this.scene, createTerrainCircleTexture('rgba(48, 36, 66, 0.82)', '#ffd058', '#fff4b0'), 4);
      this.answerPadLabels = Array.from({ length: 4 }, (_, i) => {
        const label = createTextLabel(String(i + 1), 'pad');
        this.scene.add(label.sprite);
        label.sprite.visible = false;
        return label;
      });
      this.grainLabels = new Map();
      this.harvestWavePool = createTerrainPool(this.scene, createTerrainCircleTexture('rgba(255, 208, 88, 0.04)', '#ffd058', '#fff4b0'), 1);
      this.harvestWavePool.material.opacity = 0.9;

      // 像素方塊特效池（爆炸、震波、槍口火光）
      this.fxPool = createFxPool(this.scene, 350);

      this.dummy = new THREE.Object3D();
      this.tempColor = new THREE.Color();
      this.shakeTime = 0;
      this.shakeMag = 0;

      this._onResize = () => this.resize(container);
      global.addEventListener('resize', this._onResize);
    }

    resize(container) {
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      const aspect = w / h;
      this.camera.left = -this.viewSize * aspect;
      this.camera.right = this.viewSize * aspect;
      this.camera.top = this.viewSize;
      this.camera.bottom = -this.viewSize;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.viewPx = { w, h };
    }

    // 依關卡 id 切換整套主題（地面、障礙物、局部環境、裝飾、光點）；主題貼圖已含配色，不再疊乘色調
    setStageTint(hex, stageId) {
      const st = this.stageArt;
      this.theme = st.ground[stageId] ? stageId : 'meadow';
      const theme = THEMES[this.theme];
      this.groundMat.color.setHex(0xffffff);
      this.scene.background.setHex(theme.bg);
      this.obstaclePools.forEach((pool, i) => { pool.material.map = st.obstacles[this.theme][i]; });
      this.decorPools.forEach((pool, i) => { pool.material.map = st.decor[this.theme][i]; });
      this.decorKey = '';
      this.applyAnimFrame();

      const c = new THREE.Color();
      for (let i = 0; i < this.sparks.length; i++) {
        this.sparks[i].ready = false;
        c.setRGB(theme.sparkColor[0], theme.sparkColor[1], theme.sparkColor[2]);
        this.sparkPool.setColorAt(i, c);
      }
      if (this.sparkPool.instanceColor) this.sparkPool.instanceColor.needsUpdate = true;
      for (const e of this.egrets) e.ready = false;
      c.setRGB(1, 1, 1);
      if (theme.egret) c.setRGB(theme.egret[0], theme.egret[1], theme.egret[2]);
      for (const pool of this.egretPools) {
        for (let i = 0; i < 3; i++) pool.setColorAt(i, c);
        if (pool.instanceColor) pool.instanceColor.needsUpdate = true;
      }
    }

    applyAnimFrame() {
      const st = this.stageArt;
      this.groundMat.map = st.ground[this.theme][this.animFrame];
      for (const kind of ['swamp', 'poison', 'thunder', 'ice']) {
        this.terrainPools[kind].material.map = st.terrain[this.theme][kind][this.animFrame];
      }
    }

    // 重新開局時清掉殘留的傷害數字與光點
    clearTransient() {
      for (const item of this.damageItems) {
        item.active = false;
        item.sprite.visible = false;
      }
      this.decorKey = '';
    }

    // 傷害數字：kind = normal | crit | kill | player | heal；每個畫面最多接受 7 筆新數字
    spawnDamageNumber(x, z, value, kind = 'normal') {
      if (this.damageBudget <= 0) return;
      this.damageBudget--;
      const style = DAMAGE_STYLES[kind] || DAMAGE_STYLES.normal;
      const item = this.damageItems[this.damageCursor];
      this.damageCursor = (this.damageCursor + 1) % this.damageItems.length;
      const n = Math.max(0, Math.round(Number(value) || 0));
      let text = kind === 'shield'
        ? String(value)
        : n >= 10000 ? `${(n / 1000).toFixed(0)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
      if (kind === 'crit') text += '!';
      paintDamageSprite(item, text, style);
      item.style = style;
      item.age = 0;
      item.life = style.life;
      item.x = x;
      item.z = z;
      item.jitter = (Math.random() - 0.5) * 0.7;
      item.active = true;
      item.sprite.visible = true;
    }

    updateDamageNumbers(dt) {
      for (const item of this.damageItems) {
        if (!item.active) continue;
        item.age += dt;
        if (item.age >= item.life) {
          item.active = false;
          item.sprite.visible = false;
          continue;
        }
        const t = item.age / item.life;
        const style = item.style;
        const pop = 1 + 0.45 * Math.max(0, 1 - item.age / 0.1);
        item.sprite.position.set(item.x + item.jitter, 1.45 + 1.3 * (1 - (1 - t) * (1 - t)), item.z);
        item.sprite.scale.set(style.w * pop, style.w * pop * 0.375, 1);
        item.sprite.material.opacity = Math.min(1, (item.life - item.age) / 0.25);
      }
    }

    // 2 幀環境動畫（稻穗微擺、水圳流光、光暈閃爍）、裝飾排列、白鷺鷥與光點
    updateAmbient(dt, player) {
      this.animClock += dt;
      const frame = Math.floor(this.animClock / ANIM_STEP) & 1;
      if (frame !== this.animFrame) {
        this.animFrame = frame;
        this.applyAnimFrame();
      }
      this.updateDecor(player);
      this.updateEgrets(dt, player);
      this.updateSparks(dt, player);
    }

    updateDecor(player) {
      const cx = Math.floor(player.x / DECOR_CELL);
      const cz = Math.floor(player.z / DECOR_CELL);
      const spanX = Math.ceil(this.camera.right / DECOR_CELL) + 2;
      const spanZ = 5;
      const key = `${this.theme}|${cx}|${cz}|${spanX}`;
      if (key === this.decorKey) return;
      this.decorKey = key;
      const dummy = this.dummy;
      const salt = this.theme === 'meadow' ? 1 : this.theme === 'ruins' ? 2 : 3;
      const counts = [0, 0, 0];
      const tex = this.stageArt.decor[this.theme];
      const keep = DECOR_KEEP[this.theme] ?? 0.55;
      for (let gz = cz - spanZ - 2; gz <= cz + spanZ + 2; gz++) {
        for (let gx = cx - spanX; gx <= cx + spanX; gx++) {
          if (hashUnit(gx * salt + 0.31, gz + 0.77) > keep) continue;
          const kind = Math.floor(hashUnit(gx + 7.3, gz * salt + 3.1) * 3) % 3;
          if (counts[kind] >= DECOR_CAP) continue;
          const px = (gx + 0.1 + hashUnit(gx + 1.1, gz + 9.2) * 0.8) * DECOR_CELL;
          const pz = (gz + 0.1 + hashUnit(gx + 4.4, gz + 2.5) * 0.8) * DECOR_CELL;
          const img = tex[kind].image;
          const k = 0.85 + hashUnit(gx + 5.5, gz + 6.6) * 0.35;
          const w = (img.width / 11) * k;
          const h = (img.height / 11) * k;
          dummy.position.set(px, h * 0.45, pz);
          dummy.rotation.set(TILT_X, 0, 0);
          dummy.scale.set(hashUnit(gx, gz + 0.5) > 0.5 ? -w : w, h, 1);
          dummy.updateMatrix();
          this.decorPools[kind].setMatrixAt(counts[kind]++, dummy.matrix);
        }
      }
      this.decorPools.forEach((pool, i) => {
        pool.count = counts[i];
        pool.instanceMatrix.needsUpdate = true;
      });
    }

    updateEgrets(dt, player) {
      const theme = THEMES[this.theme];
      const dummy = this.dummy;
      const reach = this.camera.right + 5;
      const counts = [0, 0];
      if (theme.egret) {
        for (const e of this.egrets) {
          if (!e.ready) {
            e.dir = Math.random() < 0.5 ? -1 : 1;
            e.speed = 2.6 + Math.random() * 1.8;
            e.h = 3.2 + Math.random() * 1.4;
            e.x = player.x + (Math.random() * 2 - 1) * reach;
            e.z = player.z + (Math.random() * 2 - 1) * 14;
            e.phase = Math.random() * 6;
            e.ready = true;
          }
          e.x += e.dir * e.speed * dt;
          e.phase += dt * 7;
          if (Math.abs(e.x - player.x) > reach + 3) {
            e.dir = e.x > player.x ? -1 : 1;
            e.z = player.z + (Math.random() * 2 - 1) * 14;
            e.x = player.x - e.dir * (reach + 2);
            e.speed = 2.6 + Math.random() * 1.8;
          }
          const f = Math.floor(e.phase) & 1;
          dummy.position.set(e.x, e.h + Math.sin(e.phase * 0.5) * 0.2, e.z);
          dummy.rotation.set(TILT_X, 0, 0);
          dummy.scale.set(e.dir, 1, 1);
          dummy.updateMatrix();
          this.egretPools[f].setMatrixAt(counts[f]++, dummy.matrix);
        }
      }
      this.egretPools.forEach((pool, i) => {
        pool.count = counts[i];
        pool.instanceMatrix.needsUpdate = true;
      });
    }

    updateSparks(dt, player) {
      const theme = THEMES[this.theme];
      const dummy = this.dummy;
      const reachX = this.camera.right + 3;
      const reachZ = 22;
      const t = this.animClock;
      let n = 0;
      for (let i = 0; i < theme.sparks; i++) {
        const s = this.sparks[i];
        if (!s.ready) {
          s.x = player.x + (Math.random() * 2 - 1) * reachX;
          s.z = player.z + (Math.random() * 2 - 1) * reachZ;
          s.y = 0.4 + Math.random() * 1.8;
          s.vx = (Math.random() - 0.5) * 0.8;
          s.vz = (Math.random() - 0.5) * 0.8;
          s.ready = true;
        }
        s.x += (s.vx + Math.sin(t * 0.9 + s.phase) * 0.35) * dt;
        s.z += (s.vz + Math.cos(t * 0.7 + s.phase) * 0.35) * dt;
        if (theme.rise) {
          s.y += (0.7 + (i % 3) * 0.25) * dt;
          if (s.y > 3.6) s.y = 0.2;
        } else {
          s.y = 0.7 + Math.sin(t * 1.3 + s.phase) * 0.5;
        }
        if (s.x - player.x > reachX) s.x -= reachX * 2;
        else if (s.x - player.x < -reachX) s.x += reachX * 2;
        if (s.z - player.z > reachZ) s.z -= reachZ * 2;
        else if (s.z - player.z < -reachZ) s.z += reachZ * 2;
        const blink = 0.55 + 0.45 * Math.sin(t * 2.4 + s.phase * 3);
        const size = Math.max(0.2, blink);
        dummy.position.set(s.x, s.y, s.z);
        dummy.rotation.set(TILT_X, 0, 0);
        dummy.scale.set(size, size, 1);
        dummy.updateMatrix();
        this.sparkPool.setMatrixAt(n++, dummy.matrix);
      }
      this.sparkPool.count = n;
      this.sparkPool.instanceMatrix.needsUpdate = true;
    }

    addShake(mag, duration = 0.1) {
      this.shakeMag = Math.max(this.shakeMag, mag);
      this.shakeTime = Math.max(this.shakeTime, duration);
    }

    // 目前相機與畫面像素組成的版面資訊（相機對準的地面點、正交半視野、畫面像素）
    answerLayoutView() {
      const cam = this.camera;
      return {
        cx: cam.position.x, cz: cam.position.z - CAM_OFFSET_Z, halfW: cam.right, halfH: cam.top,
        pxW: this.viewPx.w, pxH: this.viewPx.h,
      };
    }

    // 每個要顯示的踏板對應的標籤排版資料（同時把標籤文字畫好）
    answerLabelItems(pads) {
      const shown = [];
      for (const pad of pads) {
        const label = this.answerPadLabels[pad.index];
        if (!label || pad.broken) continue;
        setTextLabel(label, pad.label);
        const size = answerLabelSize(label, pad.labelSize);
        shown.push({ label, x: pad.x, z: pad.z, h: size.h, spriteW: size.spriteW, plateW: size.plateW });
      }
      return shown;
    }

    // 這組踏板在目前視窗是否放得下：標籤能整塊排進安全範圍（橫向矮視窗可能放不下），
    // 且踏板圓台不被題目橫幅蓋住；回傳 false 時 game 會改走暫停作答
    answerPadsFitView(pads) {
      const view = this.answerLayoutView();
      if (!layoutAnswerLabels(this.answerLabelItems(pads), view).fits) return false;
      return !pads.some((pad) => !pad.broken && padOverlapsBanner(pad, view));
    }

    // 答案踏板與其標籤：踏板貼在地上，標籤排在踏板正上方且彼此不重疊；標籤與材質只在建構時建一次，每幀只更新位置與必要時重畫
    updateAnswerPads(pads) {
      const dummy = this.dummy;
      let count = 0;
      for (const pad of pads) {
        const label = this.answerPadLabels[pad.index];
        if (!label || pad.broken) continue;
        dummy.position.set(pad.x, 0.035, pad.z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        const visualSize = pad.visualSize || 2.35;
        dummy.scale.set(visualSize, visualSize, 1);
        dummy.updateMatrix();
        this.answerPadPool.setMatrixAt(count++, dummy.matrix);
      }
      // 依實際相機位置與畫面像素排版：標籤夾在安全範圍內（避開題目橫幅、HUD、搖桿與武器欄）且彼此不重疊
      const shown = this.answerLabelItems(pads);
      const placed = layoutAnswerLabels(shown, this.answerLayoutView());
      for (let i = 0; i < this.answerPadLabels.length; i++) this.answerPadLabels[i].sprite.visible = false;
      shown.forEach((it, i) => {
        const p = placed[i];
        it.label.sprite.scale.set(it.spriteW * p.scale, it.h * p.scale, 1);
        it.label.sprite.position.set(p.x, p.y, it.z);
        it.label.sprite.visible = true;
      });
      this.answerPadPool.count = count;
      this.answerPadPool.instanceMatrix.needsUpdate = true;
    }

    renderFrame(state, dt) {
      const { player, enemies, projectiles, pickups, effects, terrainZones, waterPuddles, shakeEnabled } = state;

      // 鏡頭跟隨 + 微幅震動
      let sx = 0;
      let sz = 0;
      if (this.shakeTime > 0) {
        this.shakeTime = Math.max(0, this.shakeTime - dt);
        if (shakeEnabled) {
          sx = (Math.random() - 0.5) * this.shakeMag;
          sz = (Math.random() - 0.5) * this.shakeMag;
        }
        if (this.shakeTime <= 0) this.shakeMag = 0;
      }

      this.camera.position.set(player.x + sx, CAM_HEIGHT, player.z + CAM_OFFSET_Z + sz);
      this.camera.lookAt(player.x + sx, 0, player.z + sz);

      this.damageBudget = 7;
      this.updateAmbient(dt, player);

      // 玩家貼片與走路上下彈跳
      const bob = player.moving ? Math.abs(Math.sin(player.walkTimer * 12)) * 0.16 : 0;
      this.playerMesh.position.set(player.x, 0.85 + bob, player.z);
      this.playerMesh.scale.x = player.facing < 0 ? -1 : 1;

      const dummy = this.dummy;
      let shadowIdx = 0;

      // 動態環境區域與障礙物
      const tCounts = { swamp: 0, poison: 0, thunder: 0, ice: 0, water: 0 };
      const obsCounts = [0, 0, 0];
      const zones = terrainZones || [];
      for (let i = 0; i < zones.length; i++) {
        const z = zones[i];
        const fade = z.life < 1.0 ? Math.max(0.25, z.life) : 1;
        if (z.kind === 'obstacle') {
          const v = (z.variant || 0) % this.obstaclePools.length;
          const pool = this.obstaclePools[v];
          if (obsCounts[v] < pool.instanceMatrix.count) {
            // 站立精靈（稻草人、香爐等）原本約為玩家身高的 3 倍，壓迫畫面：視覺縮小，碰撞半徑與陰影底圈不變，底部仍貼在碰撞圓上。
            const footW = z.radius * 2.1 * fade;
            const w = footW * OBSTACLE_VISUAL_SCALE;
            const h = w * (28 / 24);
            dummy.position.set(z.x, h * 0.46, z.z);
            dummy.rotation.set(TILT_X, 0, 0);
            dummy.scale.set(w, h, 1);
            dummy.updateMatrix();
            pool.setMatrixAt(obsCounts[v]++, dummy.matrix);
            if (shadowIdx < this.shadowPool.instanceMatrix.count) {
              dummy.position.set(z.x + 0.3, 0.02, z.z + 0.25);
              dummy.rotation.set(-Math.PI / 2, 0, 0);
              dummy.scale.set(footW * 0.8, footW * 0.8, 1);
              dummy.updateMatrix();
              this.shadowPool.setMatrixAt(shadowIdx++, dummy.matrix);
            }
          }
        } else {
          const pool = this.terrainPools[z.kind];
          const idx = tCounts[z.kind];
          if (pool && idx < pool.instanceMatrix.count) {
            let pulse = 1;
            if (z.kind === 'thunder' && z.strikeTimer < 0.65) {
              pulse = 1 + Math.sin(z.strikeTimer * 35) * 0.08;
            }
            const dia = z.radius * 2 * fade * pulse;
            dummy.position.set(z.x, 0.015, z.z);
            dummy.rotation.set(-Math.PI / 2, 0, 0);
            dummy.scale.set(dia, dia, 1);
            dummy.updateMatrix();
            pool.setMatrixAt(idx, dummy.matrix);
            tCounts[z.kind]++;
          }
        }
      }
      for (const z of waterPuddles || []) {
        const pool = this.terrainPools.water;
        const idx = tCounts.water;
        if (idx >= pool.instanceMatrix.count) break;
        const fade = Math.max(0.25, Math.min(1, z.life / Math.min(1, z.maxLife || 1)));
        const dia = z.radius * 2 * fade;
        dummy.position.set(z.x, 0.018, z.z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.set(dia, dia, 1);
        dummy.updateMatrix();
        pool.setMatrixAt(idx, dummy.matrix);
        tCounts.water++;
      }
      this.obstaclePools.forEach((pool, i) => {
        pool.count = obsCounts[i];
        pool.instanceMatrix.needsUpdate = true;
      });
      for (const [k, pool] of Object.entries(this.terrainPools)) {
        pool.count = tCounts[k];
        pool.instanceMatrix.needsUpdate = true;
      }

      // 怪物攻擊紅色預警圈
      const telegraphs = state.telegraphs || [];
      let tgIdx = 0;
      for (let i = 0; i < telegraphs.length && tgIdx < 40; i++) {
        const tg = telegraphs[i];
        const dia = tg.radius * 2;
        const progress = Math.max(0.08, Math.min(1, 1 - tg.timer / tg.maxTimer));
        const blink = tg.timer < 0.65 && Math.floor(tg.timer * 18) % 2 === 0 ? 1.05 : 1;

        dummy.position.set(tg.x, 0.025, tg.z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.set(dia * blink, dia * blink, 1);
        dummy.updateMatrix();
        this.telegraphRingPool.setMatrixAt(tgIdx, dummy.matrix);

        dummy.position.set(tg.x, 0.022, tg.z);
        dummy.scale.set(dia * progress, dia * progress, 1);
        dummy.updateMatrix();
        this.telegraphFillPool.setMatrixAt(tgIdx, dummy.matrix);
        tgIdx++;
      }
      this.telegraphRingPool.count = tgIdx;
      this.telegraphRingPool.instanceMatrix.needsUpdate = true;
      this.telegraphFillPool.count = tgIdx;
      this.telegraphFillPool.instanceMatrix.needsUpdate = true;

      // 玩家陰影（向右偏移）
      dummy.position.set(player.x + 0.25, 0.02, player.z + 0.18);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(1.05, 1.05, 1);
      dummy.updateMatrix();
      this.shadowPool.setMatrixAt(shadowIdx++, dummy.matrix);

      // 怪物按類型分批寫入 InstancedMesh
      const enemyCounts = {};
      for (const k of Object.keys(this.enemyPools)) enemyCounts[k] = 0;
      const normalColor = this._normalColor || (this._normalColor = new THREE.Color(0xffffff));
      // 受擊閃白：顏色倍率超過 1，使貼圖亮部飽和成白色、暗部明顯提亮
      const flashColor = this._flashColor || (this._flashColor = new THREE.Color().setRGB(2.6, 2.4, 2.3));
      let eliteIdx = 0;
      let bossIdx = 0;
      const eliteTime = this.animClock;

      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        const pool = this.enemyPools[e.type];
        const idx = enemyCounts[e.type];
        if (!pool || idx >= pool.instanceMatrix.count) continue;

        const ebob = Math.abs(Math.sin(e.walkPhase)) * 0.1;
        const flip = e.vx < -0.05 ? -1 : 1;
        dummy.position.set(e.x, e.halfH + ebob, e.z);
        dummy.rotation.set(TILT_X, 0, 0);
        dummy.scale.set(flip, 1, 1);
        dummy.updateMatrix();
        pool.setMatrixAt(idx, dummy.matrix);
        pool.setColorAt(idx, e.hitFlash > 0 ? flashColor : normalColor);
        enemyCounts[e.type]++;

        // 菁英怪：腳下金色光環與沿視線方向略向後的金色剪影外框
        if (e.type === 'elite' && eliteIdx < 40) {
          const pulse = 0.5 + 0.5 * Math.sin(eliteTime * 5 + e.id);
          dummy.position.set(e.x, 0.03, e.z);
          dummy.rotation.set(-Math.PI / 2, 0, 0);
          const dia = 3.3 + pulse * 0.4;
          dummy.scale.set(dia, dia, 1);
          dummy.updateMatrix();
          this.eliteRingPool.setMatrixAt(eliteIdx, dummy.matrix);

          dummy.position.set(e.x, e.halfH + ebob - 0.042, e.z - 0.056);
          dummy.rotation.set(TILT_X, 0, 0);
          dummy.scale.set(flip * 1.16, 1.16, 1);
          dummy.updateMatrix();
          this.eliteHaloPool.setMatrixAt(eliteIdx, dummy.matrix);
          this.tempColor.setRGB(1.5 + pulse * 0.6, 1.1 + pulse * 0.4, 0.25);
          this.eliteHaloPool.setColorAt(eliteIdx, this.tempColor);
          eliteIdx++;
        }

        if (e.isBoss && bossIdx < this.bossRingPool.instanceMatrix.count) {
          const pulse = 0.5 + 0.5 * Math.sin(eliteTime * 4 + e.id);
          dummy.position.set(e.x, 0.032, e.z);
          dummy.rotation.set(-Math.PI / 2, 0, 0);
          const dia = 5.8 + pulse * 0.6;
          dummy.scale.set(dia, dia, 1);
          dummy.updateMatrix();
          this.bossRingPool.setMatrixAt(bossIdx++, dummy.matrix);
        }

        if (shadowIdx < this.shadowPool.instanceMatrix.count) {
          dummy.position.set(e.x + 0.22, 0.02, e.z + 0.15);
          dummy.rotation.set(-Math.PI / 2, 0, 0);
          dummy.scale.set(e.shadowScale, e.shadowScale, 1);
          dummy.updateMatrix();
          this.shadowPool.setMatrixAt(shadowIdx++, dummy.matrix);
        }
      }

      for (const [type, pool] of Object.entries(this.enemyPools)) {
        pool.count = enemyCounts[type];
        pool.instanceMatrix.needsUpdate = true;
        if (pool.instanceColor) pool.instanceColor.needsUpdate = true;
      }
      this.eliteRingPool.count = eliteIdx;
      this.eliteRingPool.instanceMatrix.needsUpdate = true;
      this.eliteHaloPool.count = eliteIdx;
      this.eliteHaloPool.instanceMatrix.needsUpdate = true;
      if (this.eliteHaloPool.instanceColor) this.eliteHaloPool.instanceColor.needsUpdate = true;
      this.bossRingPool.count = bossIdx;
      this.bossRingPool.instanceMatrix.needsUpdate = true;

      // 子彈分批寫入
      const projCounts = {
        bullet: 0, pellet: 0, rail: 0, ricochet: 0, grenade: 0,
        missile: 0, saw: 0, cryo: 0, venom: 0, vortex: 0, fire: 0, sonic: 0,
        fraction: 0, fraction_half: 0, fraction_quarter: 0, water: 0, egret: 0, firecracker: 0,
      };
      let trailIdx = 0;
      for (let i = 0; i < projectiles.length; i++) {
        const p = projectiles[i];
        const pool = this.projPools[p.sprite];
        const idx = projCounts[p.sprite];
        if (!pool || idx >= pool.instanceMatrix.count) continue;

        const yPos = p.height != null ? p.height : 0.65;
        const ang = p.angle || 0;
        dummy.position.set(p.x, yPos, p.z);
        dummy.rotation.set(TILT_X, 0, ang);
        const s = p.scale || 1;
        dummy.scale.set(p.scaleX || s, p.scaleY || s, 1);
        dummy.updateMatrix();
        pool.setMatrixAt(idx, dummy.matrix);
        projCounts[p.sprite]++;

        // 拖尾：沿精靈自身的 x 軸（行進方向）往後拉，顏色取自武器色
        const trail = TRAIL_DEFS[p.sprite];
        if (trail && trailIdx < 420) {
          const ca = Math.cos(ang);
          const sa = Math.sin(ang);
          const half = trail.len * 0.5 * s;
          dummy.position.set(p.x - ca * half, yPos - sa * COS_T * half, p.z - sa * SIN_T * half);
          dummy.rotation.set(TILT_X, 0, ang);
          dummy.scale.set(trail.len * s, trail.w * s, 1);
          dummy.updateMatrix();
          this.trailPool.setMatrixAt(trailIdx, dummy.matrix);
          this.tempColor.setHex(p.color != null ? p.color : 0xffffff);
          this.trailPool.setColorAt(trailIdx, this.tempColor);
          trailIdx++;
        }
      }
      this.trailPool.count = trailIdx;
      this.trailPool.instanceMatrix.needsUpdate = true;
      if (this.trailPool.instanceColor) this.trailPool.instanceColor.needsUpdate = true;

      for (const [type, pool] of Object.entries(this.projPools)) {
        pool.count = projCounts[type];
        pool.instanceMatrix.needsUpdate = true;
      }

      // 敵方遠程投射物分批寫入
      const eProjCounts = { e_arrow: 0, e_stone: 0, e_fire: 0, e_ice: 0, e_thunder: 0 };
      const eProjs = state.enemyProjectiles || [];
      for (let i = 0; i < eProjs.length; i++) {
        const ep = eProjs[i];
        const pool = this.enemyProjPools[ep.sprite];
        const idx = eProjCounts[ep.sprite];
        if (!pool || idx >= pool.instanceMatrix.count) continue;
        dummy.position.set(ep.x, 0.65, ep.z);
        dummy.rotation.set(TILT_X, 0, ep.angle || 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        pool.setMatrixAt(idx, dummy.matrix);
        eProjCounts[ep.sprite]++;
      }
      for (const [type, pool] of Object.entries(this.enemyProjPools)) {
        pool.count = eProjCounts[type];
        pool.instanceMatrix.needsUpdate = true;
      }

      // 掉落物（經驗寶石、金幣、符文石、裝備、數字運算牌）
      let gemIdx = 0;
      let coinIdx = 0;
      let riceIdx = 0;
      let cardIdx = 0;
      const runeCounts = { fire: 0, thunder: 0, ice: 0, light: 0, vampire: 0, quake: 0, water: 0, rice: 0, solar: 0 };
      const gearCounts = { weapon: 0, shield: 0, glove: 0, boot: 0 };
      const activeGrainLabels = new Set();
      for (let i = 0; i < pickups.length; i++) {
        const pk = pickups[i];
        if (pk.kind === 'math-grain') {
          let label = this.grainLabels.get(pk.id);
          if (!label) {
            label = createTextLabel(pk.value, 'grain');
            this.grainLabels.set(pk.id, label);
            this.scene.add(label.sprite);
          }
          setTextLabel(label, pk.value);
          label.sprite.position.set(pk.x, 1.45 + Math.sin(pk.bobPhase) * 0.12, pk.z);
          label.sprite.visible = true;
          activeGrainLabels.add(pk.id);
          continue;
        }
        const floatY = (pk.kind === 'rune' || pk.kind === 'gear' ? 0.52 : 0.42) + Math.sin(pk.bobPhase) * 0.12;
        dummy.position.set(pk.x, floatY, pk.z);
        dummy.rotation.set(TILT_X, 0, 0);
        const pickupScale = pk.bag ? 1.5 : 1;
        dummy.scale.set(pickupScale, pickupScale, 1);
        dummy.updateMatrix();

        if (pk.kind === 'gem' && gemIdx < this.gemPool.instanceMatrix.count) {
          this.gemPool.setMatrixAt(gemIdx++, dummy.matrix);
        } else if (pk.kind === 'coin' && coinIdx < this.coinPool.instanceMatrix.count) {
          this.coinPool.setMatrixAt(coinIdx++, dummy.matrix);
        } else if (pk.kind === 'rice' && riceIdx < this.ricePool.instanceMatrix.count) {
          this.ricePool.setMatrixAt(riceIdx++, dummy.matrix);
        } else if (pk.kind === 'card' && cardIdx < this.cardPool.instanceMatrix.count) {
          this.cardPool.setMatrixAt(cardIdx++, dummy.matrix);
        } else if (pk.kind === 'rune') {
          const rPool = this.runePools[pk.runeId];
          const rIdx = runeCounts[pk.runeId];
          if (rPool && rIdx < rPool.instanceMatrix.count) {
            rPool.setMatrixAt(rIdx, dummy.matrix);
            runeCounts[pk.runeId]++;
          }
        } else if (pk.kind === 'gear') {
          const gPool = this.gearPools[pk.gearType];
          const gIdx = gearCounts[pk.gearType];
          if (gPool && gIdx < gPool.instanceMatrix.count) {
            gPool.setMatrixAt(gIdx, dummy.matrix);
            gearCounts[pk.gearType]++;
          }
        }
      }
      this.gemPool.count = gemIdx;
      this.gemPool.instanceMatrix.needsUpdate = true;
      this.coinPool.count = coinIdx;
      this.coinPool.instanceMatrix.needsUpdate = true;
      this.ricePool.count = riceIdx;
      this.ricePool.instanceMatrix.needsUpdate = true;
      this.cardPool.count = cardIdx;
      this.cardPool.instanceMatrix.needsUpdate = true;
      for (const [rId, rPool] of Object.entries(this.runePools)) {
        rPool.count = runeCounts[rId];
        rPool.instanceMatrix.needsUpdate = true;
      }
      for (const [gType, gPool] of Object.entries(this.gearPools)) {
        gPool.count = gearCounts[gType];
        gPool.instanceMatrix.needsUpdate = true;
      }

      this.updateAnswerPads(state.answerPads || []);

      for (const [id, label] of this.grainLabels) {
        if (!activeGrainLabels.has(id)) {
          disposeTextLabel(label);
          this.grainLabels.delete(id);
        }
      }

      // 像素特效（爆炸方塊、換彈震波）
      let fxIdx = 0;
      for (let i = 0; i < effects.length; i++) {
        if (fxIdx >= this.fxPool.instanceMatrix.count) break;
        const fx = effects[i];
        dummy.position.set(fx.x, fx.y || 0.55, fx.z);
        dummy.rotation.set(fx.flat ? -Math.PI / 2 : TILT_X, 0, fx.angle || 0);
        dummy.scale.set(fx.scaleX || fx.size, fx.scaleY || fx.size, 1);
        dummy.updateMatrix();
        this.fxPool.setMatrixAt(fxIdx, dummy.matrix);
        this.tempColor.setHex(fx.color);
        this.fxPool.setColorAt(fxIdx, this.tempColor);
        fxIdx++;
      }
      this.fxPool.count = fxIdx;
      this.fxPool.instanceMatrix.needsUpdate = true;
      if (this.fxPool.instanceColor) this.fxPool.instanceColor.needsUpdate = true;

      const wave = state.mathHarvestWave;
      if (wave && wave.timer > 0) {
        const progress = 1 - wave.timer / wave.duration;
        dummy.position.set(wave.x, 0.045, wave.z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        const diameter = Math.max(1, wave.radius * 2 * progress);
        dummy.scale.set(diameter, diameter, 1);
        dummy.updateMatrix();
        this.harvestWavePool.setMatrixAt(0, dummy.matrix);
        this.harvestWavePool.count = 1;
        this.harvestWavePool.material.opacity = Math.min(0.9, wave.timer / wave.duration + 0.15);
      } else {
        this.harvestWavePool.count = 0;
      }
      this.harvestWavePool.instanceMatrix.needsUpdate = true;

      this.shadowPool.count = shadowIdx;
      this.shadowPool.instanceMatrix.needsUpdate = true;

      this.updateDamageNumbers(dt);
      this.renderer.render(this.scene, this.camera);
    }
  }

  PGS.PixelRenderer = PixelRenderer;
  // 標籤輔助函式（供回歸測試使用）
  PGS.RendererLabels = {
    createTextLabel, setTextLabel, disposeTextLabel, layoutAnswerLabelHeights, answerLabelSize,
    layoutAnswerLabels, answerLabelSafeRect, ANSWER_LABEL_SAFE, VIEW_SIZE, CAM_HEIGHT, CAM_OFFSET_Z,
    ANSWER_LABEL_RENDER_ORDER, GRAIN_LABEL_RENDER_ORDER,
  };
})(window);
