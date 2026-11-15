(function (global) {
  'use strict';

  const PGS = (global.PGS = global.PGS || {});

  // 移植自 pixel-plays 的核心色彩系統：暗部偏冷紫、亮部偏暖黃
  const COOL = [46, 38, 84];
  const WARM = [255, 232, 180];
  const OUTLINE_RGBA = [24, 18, 42, 255];
  const BAYER = [
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5,
  ].map((v) => (v + 0.5) / 16);

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function mixRgb(c, m, tint, k) {
    return [
      clamp(Math.round(lerp(c[0] * m, tint[0], k)), 0, 255),
      clamp(Math.round(lerp(c[1] * m, tint[1], k)), 0, 255),
      clamp(Math.round(lerp(c[2] * m, tint[2], k)), 0, 255),
    ];
  }

  /**
   * 產生 5 階色相偏移色階（0 最暗偏紫 -> 4 最亮偏暖黃）
   */
  function rampOf(baseRgb) {
    return [
      mixRgb(baseRgb, 0.42, COOL, 0.36),
      mixRgb(baseRgb, 0.64, COOL, 0.18),
      mixRgb(baseRgb, 0.85, COOL, 0.05),
      mixRgb(baseRgb, 1.0, WARM, 0.0),
      mixRgb(baseRgb, 1.12, WARM, 0.24),
    ];
  }

  function rgbCss(rgb, a = 1) {
    return a < 1
      ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`
      : `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  }

  function hash2d(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function makeCanvasTexture(canvas, repeatX = 1, repeatY = 1) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    if (repeatX > 1 || repeatY > 1) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeatX, repeatY);
    }
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * 角色／物件專用像素畫布：無抖動平塗色塊 + 自動 1px 深色輪廓線 (dark silhouette)
   */
  function createOutlinedSprite(w, h, drawFn, outline = true) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;

    const px = (x, y, rgb, cw = 1, ch = 1) => {
      ctx.fillStyle = rgbCss(rgb);
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(cw), Math.round(ch));
    };

    drawFn(px, ctx, w, h);

    if (outline) {
      const img = ctx.getImageData(0, 0, w, h);
      const src = new Uint8ClampedArray(img.data);
      const dst = img.data;
      const isOpaque = (x, y) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return false;
        return src[(y * w + x) * 4 + 3] > 20;
      };
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          if (src[idx + 3] > 20) continue;
          if (isOpaque(x - 1, y) || isOpaque(x + 1, y) || isOpaque(x, y - 1) || isOpaque(x, y + 1)) {
            dst[idx] = OUTLINE_RGBA[0];
            dst[idx + 1] = OUTLINE_RGBA[1];
            dst[idx + 2] = OUTLINE_RGBA[2];
            dst[idx + 3] = OUTLINE_RGBA[3];
          }
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    return canvas;
  }

  /**
   * 產生 4×4 Bayer 抖動像素地磚（無外部貼圖）
   */
  function createGroundTexture() {
    const size = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    const data = img.data;

    const grassRamp = rampOf([72, 108, 68]);
    const pathRamp = rampOf([92, 98, 86]);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const bayer = BAYER[(y & 3) * 4 + (x & 3)];
        const n1 = Math.sin(x * 0.13) * Math.cos(y * 0.13) * 0.5 + 0.5;
        const n2 = hash2d(Math.floor(x / 3), Math.floor(y / 3));
        const val = n1 * 0.6 + n2 * 0.4;
        const ramp = val > 0.62 ? pathRamp : grassRamp;
        const level = clamp(Math.floor(val * 3.2 + (bayer - 0.5) * 0.65), 0, 3);
        const rgb = ramp[level];
        const i = (y * size + x) * 4;
        data[i] = rgb[0];
        data[i + 1] = rgb[1];
        data[i + 2] = rgb[2];
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    // 點綴幾株極簡像素小草（色塊 >= 2px）
    const tuftColor = rgbCss(grassRamp[4]);
    const darkTuft = rgbCss(grassRamp[1]);
    for (let k = 0; k < 18; k++) {
      const gx = Math.floor(hash2d(k, 7) * (size - 6)) + 3;
      const gy = Math.floor(hash2d(k, 19) * (size - 6)) + 3;
      ctx.fillStyle = darkTuft;
      ctx.fillRect(gx, gy + 1, 3, 2);
      ctx.fillStyle = tuftColor;
      ctx.fillRect(gx, gy, 2, 2);
    }

    return makeCanvasTexture(canvas, 32, 32);
  }

  function createShadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(28, 22, 54, 0.42)';
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 24; x++) {
        const dx = (x - 11.5) / 10.5;
        const dy = (y - 7.5) / 6.5;
        if (dx * dx + dy * dy <= 1) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    return makeCanvasTexture(canvas);
  }

  function buildAllAssets() {
    const coat = rampOf([66, 132, 184]);
    const skin = rampOf([236, 194, 158]);
    const visor = rampOf([112, 236, 255]);
    const steel = rampOf([140, 152, 168]);
    const wood = rampOf([148, 96, 62]);

    const playerCanvas = createOutlinedSprite(20, 24, (px) => {
      // 頭部與頭盔
      px(6, 3, coat[3], 8, 3);
      px(5, 5, coat[2], 10, 4);
      px(7, 6, visor[4], 6, 3);
      px(8, 7, visor[2], 2, 1);
      // 身體與風衣
      px(5, 9, coat[3], 10, 7);
      px(6, 10, coat[4], 4, 4);
      px(11, 10, coat[1], 3, 5);
      // 圍巾高光
      px(6, 9, skin[3], 8, 2);
      // 手與武器握把
      px(4, 11, skin[2], 2, 3);
      px(14, 11, skin[3], 2, 3);
      // 雙腿
      px(6, 16, steel[1], 3, 5);
      px(11, 16, steel[1], 3, 5);
      px(5, 20, steel[0], 4, 2);
      px(11, 20, steel[0], 4, 2);
    });

    // 4 種差異鮮明的像素怪物
    const slimeRamp = rampOf([104, 196, 92]);
    const crawlerCanvas = createOutlinedSprite(18, 18, (px) => {
      px(4, 6, slimeRamp[2], 10, 8);
      px(5, 4, slimeRamp[3], 8, 3);
      px(6, 5, slimeRamp[4], 4, 2);
      px(3, 12, slimeRamp[1], 12, 3);
      px(6, 9, [255, 240, 160], 2, 2);
      px(10, 9, [255, 240, 160], 2, 2);
    });

    const impRamp = rampOf([214, 86, 72]);
    const runnerCanvas = createOutlinedSprite(18, 20, (px) => {
      px(5, 2, WARM, 2, 3);
      px(11, 2, WARM, 2, 3);
      px(5, 5, impRamp[3], 8, 6);
      px(6, 7, [255, 245, 180], 2, 2);
      px(10, 7, [255, 245, 180], 2, 2);
      px(4, 11, impRamp[2], 10, 5);
      px(5, 16, impRamp[1], 3, 3);
      px(10, 16, impRamp[1], 3, 3);
    });

    const tankRamp = rampOf([122, 116, 152]);
    const tankCanvas = createOutlinedSprite(24, 24, (px) => {
      px(5, 3, tankRamp[3], 14, 6);
      px(3, 6, tankRamp[4], 4, 7);
      px(17, 6, tankRamp[2], 4, 7);
      px(6, 9, tankRamp[2], 12, 8);
      px(8, 6, [255, 120, 90], 3, 2);
      px(13, 6, [255, 120, 90], 3, 2);
      px(6, 17, tankRamp[1], 4, 5);
      px(14, 17, tankRamp[1], 4, 5);
    });

    const eliteRamp = rampOf([230, 176, 64]);
    const eliteCanvas = createOutlinedSprite(26, 26, (px) => {
      // 金冠
      px(7, 2, eliteRamp[4], 2, 3);
      px(12, 1, eliteRamp[4], 2, 4);
      px(17, 2, eliteRamp[4], 2, 3);
      px(6, 5, eliteRamp[3], 14, 3);
      // 身體
      px(5, 8, [168, 48, 76], 16, 10);
      px(7, 9, [214, 78, 102], 6, 5);
      px(9, 10, [255, 238, 140], 3, 3);
      px(15, 10, [255, 238, 140], 3, 3);
      px(6, 18, [96, 30, 52], 5, 5);
      px(15, 18, [96, 30, 52], 5, 5);
    });

    // 子彈與掉落物（高對比、遠看也清晰）
    const bulletCanvas = createOutlinedSprite(10, 10, (px) => {
      px(3, 3, [255, 232, 110], 4, 4);
      px(4, 4, [255, 255, 220], 2, 2);
    });

    const pelletCanvas = createOutlinedSprite(8, 8, (px) => {
      px(2, 2, [255, 152, 72], 4, 4);
      px(3, 3, [255, 228, 160], 2, 2);
    });

    const railCanvas = createOutlinedSprite(14, 8, (px) => {
      px(2, 2, [90, 236, 255], 10, 4);
      px(3, 3, [225, 255, 255], 8, 2);
    });

    const ricochetCanvas = createOutlinedSprite(10, 10, (px) => {
      px(3, 3, [238, 128, 255], 4, 4);
      px(4, 4, [255, 224, 255], 2, 2);
    });

    const grenadeCanvas = createOutlinedSprite(12, 12, (px) => {
      px(4, 2, steel[3], 4, 2);
      px(3, 4, [82, 168, 92], 6, 6);
      px(4, 5, [158, 232, 120], 2, 2);
    });

    const missileCanvas = createOutlinedSprite(12, 8, (px) => {
      px(2, 2, [255, 110, 76], 3, 4);
      px(5, 2, steel[4], 5, 4);
      px(9, 3, [255, 210, 90], 2, 2);
    });

    const sawCanvas = createOutlinedSprite(14, 14, (px) => {
      px(4, 2, steel[4], 6, 10);
      px(2, 4, steel[4], 10, 6);
      px(5, 5, [255, 120, 92], 4, 4);
    });

    const cryoCanvas = createOutlinedSprite(12, 10, (px) => {
      px(3, 2, [148, 240, 255], 6, 6);
      px(2, 4, [215, 252, 255], 8, 2);
      px(5, 1, [215, 252, 255], 2, 8);
    });

    const venomCanvas = createOutlinedSprite(10, 10, (px) => {
      px(3, 2, [130, 235, 88], 4, 6);
      px(2, 4, [76, 178, 62], 6, 3);
      px(4, 3, [224, 255, 170], 2, 2);
    });

    const vortexCanvas = createOutlinedSprite(14, 14, (px) => {
      px(3, 3, [120, 62, 188], 8, 8);
      px(5, 5, [28, 16, 52], 4, 4);
      px(4, 3, [210, 140, 255], 2, 2);
      px(8, 9, [210, 140, 255], 2, 2);
    });

    const fireCanvas = createOutlinedSprite(10, 10, (px) => {
      px(2, 3, [255, 118, 42], 6, 5);
      px(4, 2, [255, 218, 92], 3, 4);
    });

    const sonicCanvas = createOutlinedSprite(14, 14, (px) => {
      px(7, 2, [140, 255, 218], 3, 10);
      px(5, 4, [82, 224, 198], 3, 6);
      px(9, 4, [230, 255, 248], 2, 6);
    });

    const gemCanvas = createOutlinedSprite(10, 12, (px) => {
      px(4, 2, [120, 255, 214], 2, 8);
      px(3, 3, [76, 222, 194], 4, 6);
      px(2, 4, [46, 178, 168], 6, 4);
      px(4, 4, [220, 255, 248], 2, 2);
    });

    const coinCanvas = createOutlinedSprite(10, 10, (px) => {
      px(3, 2, [255, 206, 64], 4, 6);
      px(2, 3, [236, 172, 42], 6, 4);
      px(4, 3, [255, 246, 170], 2, 3);
    });

    // 18 把差異化武器圖示
    const weaponIcons = {
      pistol: createOutlinedSprite(20, 14, (px) => {
        px(4, 4, steel[3], 11, 4);
        px(5, 5, steel[4], 8, 1);
        px(5, 8, wood[2], 4, 4);
      }),
      revolver: createOutlinedSprite(22, 14, (px) => {
        px(4, 6, wood[3], 4, 5);
        px(7, 4, [196, 138, 224], 5, 4);
        px(12, 4, steel[4], 7, 3);
      }),
      dual_smg: createOutlinedSprite(24, 16, (px) => {
        px(3, 3, steel[3], 9, 3);
        px(4, 6, coat[3], 3, 4);
        px(11, 7, steel[4], 10, 3);
        px(12, 10, coat[3], 3, 4);
      }),
      venom_pistol: createOutlinedSprite(22, 14, (px) => {
        px(4, 4, [76, 168, 68], 11, 4);
        px(15, 5, [158, 248, 110], 4, 2);
        px(5, 8, wood[2], 4, 4);
      }),
      shotgun: createOutlinedSprite(24, 14, (px) => {
        px(3, 5, wood[2], 6, 4);
        px(8, 4, steel[3], 13, 3);
        px(10, 7, wood[3], 6, 2);
      }),
      dragon_breath: createOutlinedSprite(24, 14, (px) => {
        px(3, 5, [158, 64, 48], 6, 4);
        px(8, 4, [232, 112, 56], 11, 4);
        px(19, 4, [255, 214, 92], 3, 4);
      }),
      sonic_blaster: createOutlinedSprite(24, 16, (px) => {
        px(3, 6, coat[2], 8, 5);
        px(11, 4, [76, 222, 194], 7, 8);
        px(18, 3, [180, 255, 236], 3, 10);
      }),
      minigun: createOutlinedSprite(24, 16, (px) => {
        px(3, 4, steel[2], 8, 7);
        px(11, 4, steel[3], 10, 2);
        px(11, 7, steel[4], 10, 2);
        px(11, 10, steel[2], 10, 2);
        px(5, 11, [240, 178, 62], 4, 3);
      }),
      pulse_rifle: createOutlinedSprite(26, 14, (px) => {
        px(3, 5, coat[2], 12, 4);
        px(15, 5, steel[4], 8, 3);
        px(7, 4, [110, 240, 255], 6, 1);
        px(6, 9, steel[1], 4, 3);
      }),
      nailgun: createOutlinedSprite(22, 16, (px) => {
        px(4, 4, [218, 152, 56], 11, 5);
        px(15, 5, steel[4], 5, 2);
        px(6, 9, steel[1], 4, 5);
      }),
      railgun: createOutlinedSprite(26, 14, (px) => {
        px(3, 5, coat[2], 10, 5);
        px(12, 4, steel[4], 11, 2);
        px(12, 8, steel[3], 11, 2);
        px(13, 6, [104, 244, 255], 9, 2);
      }),
      cryo_beam: createOutlinedSprite(24, 14, (px) => {
        px(3, 5, [76, 172, 224], 11, 5);
        px(14, 5, [180, 248, 255], 7, 4);
        px(6, 3, [220, 255, 255], 5, 2);
      }),
      gravity_gun: createOutlinedSprite(24, 16, (px) => {
        px(3, 5, [86, 56, 138], 10, 6);
        px(13, 4, [172, 110, 248], 6, 8);
        px(16, 6, [34, 18, 56], 4, 4);
      }),
      swarm_missile: createOutlinedSprite(24, 16, (px) => {
        px(3, 4, [118, 128, 92], 13, 8);
        px(16, 4, [255, 110, 76], 4, 3);
        px(16, 9, [255, 110, 76], 4, 3);
      }),
      sawblade_gun: createOutlinedSprite(24, 16, (px) => {
        px(3, 6, steel[2], 11, 4);
        px(14, 3, steel[4], 7, 9);
        px(16, 5, [255, 120, 92], 3, 5);
      }),
      plasma_arc: createOutlinedSprite(24, 14, (px) => {
        px(3, 5, [74, 96, 172], 10, 5);
        px(13, 4, [220, 148, 255], 7, 6);
        px(15, 6, [255, 245, 160], 3, 2);
      }),
      launcher: createOutlinedSprite(24, 16, (px) => {
        px(3, 6, [92, 142, 86], 7, 5);
        px(9, 4, steel[2], 9, 7);
        px(18, 5, [255, 148, 68], 3, 5);
      }),
      cluster_mortar: createOutlinedSprite(24, 16, (px) => {
        px(4, 8, steel[1], 14, 5);
        px(7, 3, [214, 86, 72], 9, 6);
        px(16, 4, [255, 214, 92], 4, 4);
      }),
    };

    const textures = {
      ground: createGroundTexture(),
      shadow: createShadowTexture(),
      player: makeCanvasTexture(playerCanvas),
      crawler: makeCanvasTexture(crawlerCanvas),
      runner: makeCanvasTexture(runnerCanvas),
      tank: makeCanvasTexture(tankCanvas),
      elite: makeCanvasTexture(eliteCanvas),
      bullet: makeCanvasTexture(bulletCanvas),
      pellet: makeCanvasTexture(pelletCanvas),
      rail: makeCanvasTexture(railCanvas),
      ricochet: makeCanvasTexture(ricochetCanvas),
      grenade: makeCanvasTexture(grenadeCanvas),
      missile: makeCanvasTexture(missileCanvas),
      saw: makeCanvasTexture(sawCanvas),
      cryo: makeCanvasTexture(cryoCanvas),
      venom: makeCanvasTexture(venomCanvas),
      vortex: makeCanvasTexture(vortexCanvas),
      fire: makeCanvasTexture(fireCanvas),
      sonic: makeCanvasTexture(sonicCanvas),
      gem: makeCanvasTexture(gemCanvas),
      coin: makeCanvasTexture(coinCanvas),
    };

    const runeIcons = {
      fire: createOutlinedSprite(14, 14, (px) => {
        px(5, 2, [255, 214, 92], 4, 3);
        px(4, 5, [255, 118, 42], 6, 6);
        px(6, 7, [255, 232, 160], 2, 3);
      }),
      thunder: createOutlinedSprite(14, 14, (px) => {
        px(6, 2, [255, 240, 120], 4, 3);
        px(4, 5, [255, 224, 64], 5, 3);
        px(6, 8, [255, 245, 160], 4, 4);
      }),
      ice: createOutlinedSprite(14, 14, (px) => {
        px(6, 2, [190, 250, 255], 2, 10);
        px(2, 6, [190, 250, 255], 10, 2);
        px(4, 4, [118, 232, 255], 6, 6);
        px(6, 6, [255, 255, 255], 2, 2);
      }),
      light: createOutlinedSprite(14, 14, (px) => {
        px(6, 2, [255, 246, 184], 2, 10);
        px(2, 6, [255, 246, 184], 10, 2);
        px(4, 4, [255, 255, 235], 6, 6);
      }),
      vampire: createOutlinedSprite(14, 14, (px) => {
        px(3, 4, [235, 58, 96], 3, 4);
        px(8, 4, [235, 58, 96], 3, 4);
        px(4, 6, [255, 92, 128], 6, 4);
        px(6, 10, [186, 36, 68], 2, 2);
      }),
      quake: createOutlinedSprite(14, 14, (px) => {
        px(3, 3, [172, 120, 240], 8, 8);
        px(5, 5, [24, 18, 42], 4, 4);
        px(6, 6, [224, 190, 255], 2, 2);
      }),
    };

    const gearIcons = {
      weapon: createOutlinedSprite(16, 16, (px) => {
        px(3, 5, steel[3], 9, 4);
        px(4, 9, wood[2], 3, 4);
        px(11, 6, [255, 224, 90], 2, 2);
      }),
      shield: createOutlinedSprite(16, 16, (px) => {
        px(3, 3, steel[3], 10, 8);
        px(5, 11, steel[2], 6, 2);
        px(6, 5, coat[3], 4, 4);
      }),
      glove: createOutlinedSprite(16, 16, (px) => {
        px(4, 5, wood[3], 8, 6);
        px(3, 7, wood[2], 2, 3);
        px(5, 11, steel[3], 6, 2);
      }),
      boot: createOutlinedSprite(16, 16, (px) => {
        px(4, 3, wood[3], 5, 7);
        px(4, 9, wood[2], 9, 4);
        px(4, 12, steel[1], 9, 1);
      }),
    };

    const cardDropCanvas = createOutlinedSprite(12, 14, (px) => {
      px(2, 2, [255, 242, 196], 8, 10);
      px(4, 4, [76, 180, 224], 4, 2);
      px(4, 7, [224, 92, 120], 4, 3);
    });
    textures.card_drop = makeCanvasTexture(cardDropCanvas);

    const iconDataUrls = {};
    for (const [key, c] of Object.entries(weaponIcons)) {
      iconDataUrls[key] = c.toDataURL();
    }
    const runeDataUrls = {};
    for (const [key, c] of Object.entries(runeIcons)) {
      runeDataUrls[key] = c.toDataURL();
      textures[`rune_${key}`] = makeCanvasTexture(c);
    }
    const gearDataUrls = {};
    for (const [key, c] of Object.entries(gearIcons)) {
      gearDataUrls[key] = c.toDataURL();
      textures[`gear_${key}`] = makeCanvasTexture(c);
    }

    return { textures, iconDataUrls, runeDataUrls, gearDataUrls };
  }

  PGS.PixelArt = {
    rampOf,
    buildAllAssets,
  };
})(window);
