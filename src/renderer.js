(function (global) {
  'use strict';

  const PGS = (global.PGS = global.PGS || {});

  const CAM_HEIGHT = 18;
  const CAM_OFFSET_Z = 24;
  const TILT_X = -Math.atan2(CAM_HEIGHT, CAM_OFFSET_Z);

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

  function createObstacleTexture() {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#535b66';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#6c7684';
    ctx.fillRect(0, 0, 16, 3);
    ctx.fillRect(2, 5, 4, 3);
    ctx.fillRect(9, 8, 5, 4);
    ctx.fillStyle = '#363c44';
    ctx.fillRect(0, 13, 16, 3);
    ctx.fillRect(6, 4, 2, 5);
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

  class PixelRenderer {
    constructor(container, textures) {
      this.textures = textures;
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x1f2822);

      this.viewSize = 13.5;
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
      this.renderer.domElement.style.imageRendering = 'pixelated';
      container.appendChild(this.renderer.domElement);

      // 地面（Bayer 4x4 抖動像素地磚）
      const groundGeo = new THREE.PlaneGeometry(240, 240);
      this.groundMat = new THREE.MeshBasicMaterial({ map: textures.ground });
      const ground = new THREE.Mesh(groundGeo, this.groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0;
      this.scene.add(ground);

      // 動態局部環境池與障礙物池
      this.terrainPools = {
        swamp: createTerrainPool(this.scene, createTerrainCircleTexture('#3c2f4a', '#7c5ca0', '#5a4375'), 12),
        poison: createTerrainPool(this.scene, createTerrainCircleTexture('#1f5a2e', '#58e878', '#8cff9e'), 12),
        thunder: createTerrainPool(this.scene, createTerrainCircleTexture('#5e4c14', '#ffe04a', '#fff6a8'), 12),
        ice: createTerrainPool(this.scene, createTerrainCircleTexture('#245a78', '#82e4ff', '#d8f7ff'), 12),
      };
      const obsGeo = new THREE.BoxGeometry(1, 1.35, 1);
      const obsMat = new THREE.MeshBasicMaterial({ map: createObstacleTexture() });
      this.obstaclePool = new THREE.InstancedMesh(obsGeo, obsMat, 16);
      this.obstaclePool.count = 0;
      this.obstaclePool.frustumCulled = false;
      this.scene.add(this.obstaclePool);

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
      };

      // 掉落物實例池
      this.gemPool = createPool(this.scene, textures.gem, 400, 0.65, 0.78, false);
      this.coinPool = createPool(this.scene, textures.coin, 150, 0.65, 0.65, false);
      this.runePools = {
        fire: createPool(this.scene, textures.rune_fire, 40, 0.9, 0.9, false),
        thunder: createPool(this.scene, textures.rune_thunder, 40, 0.9, 0.9, false),
        ice: createPool(this.scene, textures.rune_ice, 40, 0.9, 0.9, false),
        light: createPool(this.scene, textures.rune_light, 40, 0.9, 0.9, false),
        vampire: createPool(this.scene, textures.rune_vampire, 40, 0.9, 0.9, false),
        quake: createPool(this.scene, textures.rune_quake, 40, 0.9, 0.9, false),
      };
      this.gearPools = {
        weapon: createPool(this.scene, textures.gear_weapon, 30, 0.95, 0.95, false),
        shield: createPool(this.scene, textures.gear_shield, 30, 0.95, 0.95, false),
        glove: createPool(this.scene, textures.gear_glove, 30, 0.95, 0.95, false),
        boot: createPool(this.scene, textures.gear_boot, 30, 0.95, 0.95, false),
      };
      this.cardPool = createPool(this.scene, textures.card_drop, 60, 0.78, 0.9, false);

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
    }

    setStageTint(hex) {
      if (this.groundMat) this.groundMat.color.setHex(hex || 0xffffff);
    }

    addShake(mag, duration = 0.1) {
      this.shakeMag = Math.max(this.shakeMag, mag);
      this.shakeTime = Math.max(this.shakeTime, duration);
    }

    renderFrame(state, dt) {
      const { player, enemies, projectiles, pickups, effects, terrainZones, shakeEnabled } = state;

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

      // 玩家貼片與走路上下彈跳
      const bob = player.moving ? Math.abs(Math.sin(player.walkTimer * 12)) * 0.16 : 0;
      this.playerMesh.position.set(player.x, 0.85 + bob, player.z);
      this.playerMesh.scale.x = player.facing < 0 ? -1 : 1;

      const dummy = this.dummy;
      let shadowIdx = 0;

      // 動態環境區域與障礙物
      const tCounts = { swamp: 0, poison: 0, thunder: 0, ice: 0 };
      let obsIdx = 0;
      const zones = terrainZones || [];
      for (let i = 0; i < zones.length; i++) {
        const z = zones[i];
        const fade = z.life < 1.0 ? Math.max(0.25, z.life) : 1;
        if (z.kind === 'obstacle') {
          if (obsIdx < this.obstaclePool.instanceMatrix.count) {
            const d = z.radius * 1.65 * fade;
            dummy.position.set(z.x, 0.675 * fade, z.z);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(d, fade, d);
            dummy.updateMatrix();
            this.obstaclePool.setMatrixAt(obsIdx++, dummy.matrix);
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
      this.obstaclePool.count = obsIdx;
      this.obstaclePool.instanceMatrix.needsUpdate = true;
      for (const [k, pool] of Object.entries(this.terrainPools)) {
        pool.count = tCounts[k];
        pool.instanceMatrix.needsUpdate = true;
      }

      // 玩家陰影（向右偏移）
      dummy.position.set(player.x + 0.25, 0.02, player.z + 0.18);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(1.05, 1.05, 1);
      dummy.updateMatrix();
      this.shadowPool.setMatrixAt(shadowIdx++, dummy.matrix);

      // 怪物按類型分批寫入 InstancedMesh
      const enemyCounts = {};
      for (const k of Object.keys(this.enemyPools)) enemyCounts[k] = 0;
      const normalColor = new THREE.Color(0xffffff);
      const flashColor = new THREE.Color(0xffb8a8);

      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        const pool = this.enemyPools[e.type];
        const idx = enemyCounts[e.type];
        if (!pool || idx >= pool.instanceMatrix.count) continue;

        const ebob = Math.abs(Math.sin(e.walkPhase)) * 0.1;
        dummy.position.set(e.x, e.halfH + ebob, e.z);
        dummy.rotation.set(TILT_X, 0, 0);
        dummy.scale.set(e.vx < -0.05 ? -1 : 1, 1, 1);
        dummy.updateMatrix();
        pool.setMatrixAt(idx, dummy.matrix);
        pool.setColorAt(idx, e.hitFlash > 0 ? flashColor : normalColor);
        enemyCounts[e.type]++;

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

      // 子彈分批寫入
      const projCounts = {
        bullet: 0, pellet: 0, rail: 0, ricochet: 0, grenade: 0,
        missile: 0, saw: 0, cryo: 0, venom: 0, vortex: 0, fire: 0, sonic: 0,
      };
      for (let i = 0; i < projectiles.length; i++) {
        const p = projectiles[i];
        const pool = this.projPools[p.sprite];
        const idx = projCounts[p.sprite];
        if (!pool || idx >= pool.instanceMatrix.count) continue;

        const yPos = p.height != null ? p.height : 0.65;
        dummy.position.set(p.x, yPos, p.z);
        dummy.rotation.set(TILT_X, 0, p.angle || 0);
        const s = p.scale || 1;
        dummy.scale.set(s, s, 1);
        dummy.updateMatrix();
        pool.setMatrixAt(idx, dummy.matrix);
        projCounts[p.sprite]++;
      }

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
      let cardIdx = 0;
      const runeCounts = { fire: 0, thunder: 0, ice: 0, light: 0, vampire: 0, quake: 0 };
      const gearCounts = { weapon: 0, shield: 0, glove: 0, boot: 0 };
      for (let i = 0; i < pickups.length; i++) {
        const pk = pickups[i];
        const floatY = (pk.kind === 'rune' || pk.kind === 'gear' ? 0.52 : 0.42) + Math.sin(pk.bobPhase) * 0.12;
        dummy.position.set(pk.x, floatY, pk.z);
        dummy.rotation.set(TILT_X, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();

        if (pk.kind === 'gem' && gemIdx < this.gemPool.instanceMatrix.count) {
          this.gemPool.setMatrixAt(gemIdx++, dummy.matrix);
        } else if (pk.kind === 'coin' && coinIdx < this.coinPool.instanceMatrix.count) {
          this.coinPool.setMatrixAt(coinIdx++, dummy.matrix);
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

      // 像素特效（爆炸方塊、換彈震波）
      let fxIdx = 0;
      for (let i = 0; i < effects.length; i++) {
        if (fxIdx >= this.fxPool.instanceMatrix.count) break;
        const fx = effects[i];
        dummy.position.set(fx.x, fx.y || 0.55, fx.z);
        dummy.rotation.set(fx.flat ? -Math.PI / 2 : TILT_X, 0, 0);
        dummy.scale.set(fx.size, fx.size, 1);
        dummy.updateMatrix();
        this.fxPool.setMatrixAt(fxIdx, dummy.matrix);
        this.tempColor.setHex(fx.color);
        this.fxPool.setColorAt(fxIdx, this.tempColor);
        fxIdx++;
      }
      this.fxPool.count = fxIdx;
      this.fxPool.instanceMatrix.needsUpdate = true;
      if (this.fxPool.instanceColor) this.fxPool.instanceColor.needsUpdate = true;

      this.shadowPool.count = shadowIdx;
      this.shadowPool.instanceMatrix.needsUpdate = true;

      this.renderer.render(this.scene, this.camera);
    }
  }

  PGS.PixelRenderer = PixelRenderer;
})(window);
