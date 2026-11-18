(function (global) {
  'use strict';

  const PGS = (global.PGS = global.PGS || {});

  // 三關主題：meadow 稻香田野、ruins 廟埕夜市、temple 星空水圳。
  // 全部由程式繪製（Bayer 抖動＋色相偏移色階），不使用任何外部圖片。
  const TILE = 256; // 地面貼圖邊長（像素）；世界 240 單位 / repeat 12 = 每張 20 單位

  function build() {
    const A = PGS.PixelArt;
    const { rampOf, makeCanvasTexture, createOutlinedSprite, hash2d, BAYER, clamp } = A;

    const mix = (a, b, k) => [
      Math.round(a[0] + (b[0] - a[0]) * k),
      Math.round(a[1] + (b[1] - a[1]) * k),
      Math.round(a[2] + (b[2] - a[2]) * k),
    ];
    const bayerAt = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

    /* ---------- 地面 ---------- */

    function makeTile(paint, frame) {
      const canvas = document.createElement('canvas');
      canvas.width = TILE;
      canvas.height = TILE;
      const ctx = canvas.getContext('2d');
      const img = ctx.createImageData(TILE, TILE);
      const d = img.data;
      const put = (x, y, c) => {
        x = ((Math.round(x) % TILE) + TILE) % TILE;
        y = ((Math.round(y) % TILE) + TILE) % TILE;
        const i = (y * TILE + x) * 4;
        d[i] = c[0];
        d[i + 1] = c[1];
        d[i + 2] = c[2];
        d[i + 3] = 255;
      };
      paint(put, frame);
      ctx.putImageData(img, 0, 0);
      return canvas;
    }

    // 第 1 關：稻香田野。田埂格線、成排稻株（第 2 幀稻穗微擺）、小水窪、田邊小花
    function paintMeadow(put, frame) {
      const base = rampOf([86, 122, 64]);
      const earth = rampOf([156, 122, 76]);
      const rice = rampOf([150, 178, 72]);
      const water = rampOf([76, 130, 140]);
      const CELL = 64;

      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const bx = bayerAt(x, y);
          // 低頻明暗：大塊緩變，避免高頻雜訊干擾辨識
          const n = hash2d(Math.floor(x / 24), Math.floor(y / 24)) * 0.55
            + (Math.sin(x * 0.045) * Math.cos(y * 0.052) * 0.5 + 0.5) * 0.45;
          let c = base[clamp(Math.floor(1.15 + n * 1.5 + (bx - 0.5) * 0.8), 1, 3)];
          const rx = x % CELL;
          const ry = y % CELL;
          if (ry < 5) {
            c = ry === 0 ? earth[4] : ry < 4 ? earth[bx < 0.3 ? 2 : 3] : earth[1];
          } else if (rx < 4) {
            c = rx === 0 ? earth[4] : rx < 3 ? earth[bx < 0.3 ? 2 : 3] : earth[1];
          }
          put(x, y, c);
        }
      }

      for (let fy = 0; fy < 4; fy++) {
        for (let fx = 0; fx < 4; fx++) {
          const puddle = hash2d(fx * 3 + 1, fy * 5 + 2) < 0.38;
          for (let j = 0; j < 3; j++) {
            if (puddle && j === 1) continue;
            for (let i = 0; i < 6; i++) {
              const x0 = fx * CELL + 8 + i * 9 + (j & 1) * 4;
              const y0 = fy * CELL + 14 + j * 15;
              const sway = frame && ((i + j + fx + fy) & 1) ? 1 : 0;
              for (let k = 0; k < 4; k++) put(x0 + k, y0 + 4, base[0]);
              put(x0 + 1, y0 + 3, rice[1]);
              put(x0 + 2, y0 + 3, rice[1]);
              for (let k = 0; k < 4; k++) put(x0 + k, y0 + 2, rice[2]);
              for (let k = 0; k < 4; k++) put(x0 + k, y0 + 1, rice[3]);
              put(x0 + 1 + sway, y0, rice[4]);
              put(x0 + 2 + sway, y0, rice[4]);
              if (hash2d(x0, y0) < 0.35) put(x0 + 2 + sway, y0 - 1, [255, 224, 110]);
            }
          }
          if (puddle) {
            const cx = fx * CELL + 32;
            const cy = fy * CELL + 31;
            for (let dy = -6; dy <= 6; dy++) {
              for (let dx = -19; dx <= 19; dx++) {
                const e = (dx / 19) * (dx / 19) + (dy / 6) * (dy / 6);
                if (e > 1) continue;
                put(cx + dx, cy + dy, e > 0.72 ? water[1] : ((dx + dy) & 1) && e < 0.4 ? water[3] : water[2]);
              }
            }
            const s1 = frame ? 4 : 0;
            const s2 = frame ? 3 : 0;
            for (let k = 0; k < 5; k++) put(cx - 9 + s1 + k, cy - 2, water[4]);
            for (let k = 0; k < 4; k++) put(cx + 2 - s2 + k, cy + 2, water[4]);
          }
        }
      }

      // 田埂邊小花（白、粉、黃）
      const petals = [[250, 244, 230], [244, 160, 180], [255, 214, 90]];
      for (let k = 0; k < 34; k++) {
        const x = Math.floor(hash2d(k, 11) * TILE);
        const y = Math.floor(hash2d(k, 29) * 4) * CELL - 3;
        const col = petals[Math.floor(hash2d(k, 47) * 3)];
        put(x, y, col);
        put(x + 1, y, col);
        put(x, y + 1, col);
        put(x + 1, y + 1, [255, 200, 60]);
        put(x, y + 2, rice[1]);
      }
    }

    // 第 2 關：廟埕夜市。紅磚地、錯縫排列、燈籠光暈（第 2 幀光暈微閃）
    function paintRuins(put, frame) {
      const brick = rampOf([122, 62, 52]);
      const stone = rampOf([122, 116, 112]);
      const mortar = [52, 32, 38];
      const warm = [255, 200, 120];
      const BW = 32;
      const BH = 16;
      const lights = [[48, 64], [200, 48], [120, 196], [230, 214]];
      const R = 44 + (frame ? 4 : 0);

      for (let y = 0; y < TILE; y++) {
        const row = Math.floor(y / BH);
        const off = (row & 1) * (BW / 2);
        const by = y % BH;
        for (let x = 0; x < TILE; x++) {
          const xx = (x + off) % TILE;
          const col = Math.floor(xx / BW);
          const bx = xx % BW;
          const id = hash2d(col + 3, row + 5);
          const isStone = id < 0.14;
          const ramp = isStone ? stone : brick;
          const bay = bayerAt(x, y);
          const lvl = clamp(Math.round(1.6 + id * 0.8 + (bay - 0.5) * 0.55), 1, 3);
          let c = ramp[lvl];
          if (by === 0 || bx === 0) c = mortar;
          else if (by === 1) c = bay > 0.25 ? ramp[4] : c;
          else if (by === BH - 1) c = ramp[0];
          else if (id > 0.88 && ((bx * 3 + by * 5 + col) % 29) === 0) c = ramp[0];

          let g = 0;
          for (let l = 0; l < lights.length; l++) {
            let dx = Math.abs(x - lights[l][0]);
            let dz = Math.abs(y - lights[l][1]);
            dx = Math.min(dx, TILE - dx);
            dz = Math.min(dz, TILE - dz);
            if (dx > R || dz > R) continue;
            g = Math.max(g, 1 - Math.hypot(dx, dz) / R);
          }
          if (g > 0) {
            const k = clamp(Math.floor(g * 3 + (bay - 0.5) * 0.9 + 0.1), 0, 3);
            if (k > 0) c = mix(c, warm, 0.12 * k);
          }
          put(x, y, c);
        }
      }
    }

    // 第 3 關：星空水圳。深藍石板、橫貫水圳與流光（第 2 幀流光位移）、星點
    function paintTemple(put, frame) {
      const night = rampOf([34, 46, 96]);
      const bank = rampOf([128, 150, 186]);
      const water = rampOf([36, 92, 160]);
      const SW = 32;
      const lineRows = [100, 106, 112, 118, 124];
      const Y0 = 96;
      const Y1 = 128;

      for (let y = 0; y < TILE; y++) {
        const row = Math.floor(y / SW);
        const off = (row & 1) * (SW / 2);
        const sy = y % SW;
        for (let x = 0; x < TILE; x++) {
          const bay = bayerAt(x, y);
          let c;
          if (y >= Y0 && y < Y1) {
            const t = (y - Y0) / (Y1 - Y0);
            c = water[clamp(Math.round(1.3 + (0.5 - Math.abs(t - 0.5)) * 1.6 + (bay - 0.5) * 0.7), 0, 3)];
            const li = lineRows.indexOf(y);
            if (li >= 0) {
              const phase = (((x - (frame ? 6 : 0) - li * 23) % 64) + 64) % 64;
              if (phase < 14) c = phase < 2 || phase > 11 ? water[3] : water[4];
            }
          } else if (y >= 90 && y < 96) {
            const yy = y - 90;
            c = yy === 0 ? bank[1] : yy === 1 ? bank[4] : yy < 5 ? bank[bay < 0.3 ? 2 : 3] : bank[0];
          } else if (y >= 128 && y < 133) {
            const yy = y - 128;
            c = yy === 0 ? bank[4] : yy < 4 ? bank[bay < 0.3 ? 2 : 3] : bank[0];
          } else {
            const xx = (x + off) % TILE;
            const sx = xx % SW;
            const id = hash2d(Math.floor(xx / SW) + 9, row + 2);
            c = night[clamp(Math.round(1.5 + id * 0.9 + (bay - 0.5) * 0.55), 1, 3)];
            if (sy === 0 || sx === 0) c = night[0];
            else if (sy === 1 && bay > 0.3) c = night[4];
          }
          put(x, y, c);
        }
      }

      for (let k = 0; k < 8; k++) {
        if ((k & 1) !== frame) continue;
        const sx = Math.floor(hash2d(k, 61) * (TILE - 4));
        const sy = Y0 + 3 + Math.floor(hash2d(k, 83) * (Y1 - Y0 - 6));
        put(sx, sy, [220, 245, 255]);
        put(sx + 1, sy, [220, 245, 255]);
      }
      for (let k = 0; k < 20; k++) {
        const sx = Math.floor(hash2d(k, 71) * TILE);
        const sy = Math.floor(hash2d(k, 93) * TILE);
        if (sy > 84 && sy < 138) continue;
        if (k % 3 === 0 && frame) continue;
        put(sx, sy, [200, 222, 255]);
        if (k % 4 === 0) {
          put(sx + 1, sy, [160, 190, 240]);
          put(sx, sy + 1, [160, 190, 240]);
        }
      }
    }

    const painters = { meadow: paintMeadow, ruins: paintRuins, temple: paintTemple };
    const ground = {};
    for (const [theme, paint] of Object.entries(painters)) {
      ground[theme] = [0, 1].map((frame) => makeCanvasTexture(makeTile(paint, frame), 12, 12));
    }

    /* ---------- 障礙物（每關 3 種，碰撞尺寸由 renderer 沿用 zone.radius） ---------- */

    const OW = 24;
    const OH = 28;
    const rect = (px, x, y, w, h, c) => px(x, y, c, w, h);

    const straw = rampOf([214, 176, 86]);
    const bamboo = rampOf([100, 170, 84]);
    const wood = rampOf([130, 92, 54]);
    const stoneG = rampOf([168, 162, 156]);
    const bronze = rampOf([176, 124, 58]);
    const frost = rampOf([150, 170, 200]);
    const rock = rampOf([98, 116, 150]);
    const crystal = rampOf([126, 200, 235]);
    const SNOW = [236, 248, 255];

    const obstacles = {
      meadow: [
        // 稻草堆
        createOutlinedSprite(OW, OH, (px) => {
          for (let y = 6; y <= 26; y++) {
            const t = (y - 6) / 20;
            const half = Math.max(1, Math.round(10.5 * Math.sqrt(t)));
            for (let x = 12 - half; x < 12 + half; x++) {
              const dx = x - 11.5;
              let shade = dx < -4 ? 4 : dx < 2 ? 3 : dx < 6 ? 2 : 1;
              if (hash2d(x, y) < 0.14) shade = Math.max(0, shade - 1);
              if (y === 26) shade = 0;
              px(x, y, straw[shade]);
            }
          }
          rect(px, 3, 17, 18, 2, [140, 86, 52]);
          rect(px, 10, 3, 3, 4, straw[4]);
          rect(px, 12, 4, 2, 3, straw[2]);
        }),
        // 竹叢
        createOutlinedSprite(OW, OH, (px) => {
          const stalks = [[4, 8], [9, 3], [14, 6], [19, 10]];
          for (const [sx, top] of stalks) {
            for (let y = top; y <= 26; y++) {
              const node = (y - top) % 6 === 5;
              px(sx, y, node ? bamboo[0] : bamboo[4]);
              px(sx + 1, y, node ? bamboo[0] : bamboo[3]);
              px(sx + 2, y, node ? bamboo[0] : bamboo[1]);
            }
            rect(px, sx - 3, top + 1, 3, 1, bamboo[3]);
            rect(px, sx + 3, top, 3, 1, bamboo[2]);
            rect(px, sx - 2, top + 3, 2, 1, bamboo[2]);
          }
          rect(px, 2, 26, 20, 2, [84, 96, 56]);
        }),
        // 稻草人
        createOutlinedSprite(OW, OH, (px) => {
          rect(px, 11, 6, 2, 21, wood[2]);
          rect(px, 2, 10, 20, 2, wood[3]);
          for (let y = 11; y < 20; y++) {
            for (let x = 7; x < 17; x++) {
              px(x, y, ((x >> 1) + (y >> 1)) & 1 ? [200, 70, 60] : [240, 220, 190]);
            }
          }
          rect(px, 9, 4, 6, 6, [230, 190, 150]);
          rect(px, 10, 6, 1, 1, [30, 20, 24]);
          rect(px, 13, 6, 1, 1, [30, 20, 24]);
          rect(px, 11, 8, 3, 1, [150, 70, 60]);
          rect(px, 7, 3, 10, 2, straw[3]);
          rect(px, 9, 1, 6, 3, straw[4]);
          rect(px, 0, 9, 3, 4, straw[3]);
          rect(px, 21, 9, 3, 4, straw[3]);
          rect(px, 8, 20, 3, 3, straw[2]);
          rect(px, 13, 20, 3, 3, straw[2]);
          rect(px, 6, 26, 12, 2, [84, 110, 58]);
        }),
      ],
      ruins: [
        // 石獅
        createOutlinedSprite(OW, OH, (px) => {
          rect(px, 3, 21, 18, 6, stoneG[2]);
          rect(px, 3, 21, 18, 1, stoneG[4]);
          rect(px, 3, 26, 18, 1, stoneG[0]);
          rect(px, 5, 13, 14, 9, stoneG[3]);
          rect(px, 15, 15, 4, 6, stoneG[2]);
          rect(px, 6, 4, 12, 10, stoneG[3]);
          rect(px, 4, 6, 3, 8, stoneG[2]);
          rect(px, 17, 6, 3, 8, stoneG[2]);
          rect(px, 7, 2, 3, 3, stoneG[3]);
          rect(px, 14, 2, 3, 3, stoneG[3]);
          rect(px, 7, 4, 5, 1, stoneG[4]);
          rect(px, 8, 7, 2, 2, [30, 20, 24]);
          rect(px, 14, 7, 2, 2, [30, 20, 24]);
          rect(px, 11, 9, 3, 2, stoneG[1]);
          rect(px, 10, 12, 5, 1, stoneG[0]);
          rect(px, 6, 14, 12, 2, [200, 52, 52]);
          rect(px, 11, 16, 3, 3, [240, 190, 70]);
        }),
        // 香爐
        createOutlinedSprite(OW, OH, (px) => {
          const halves = [10, 11, 11, 10, 9, 8, 6, 5];
          halves.forEach((h, i) => {
            const y = 14 + i;
            for (let x = 12 - h; x < 12 + h; x++) {
              px(x, y, x < 8 ? bronze[4] : x < 14 ? bronze[3] : bronze[2]);
            }
          });
          rect(px, 1, 13, 3, 2, bronze[3]);
          rect(px, 20, 13, 3, 2, bronze[3]);
          rect(px, 1, 13, 2, 5, bronze[2]);
          rect(px, 21, 13, 2, 5, bronze[2]);
          rect(px, 6, 12, 12, 2, bronze[4]);
          rect(px, 7, 22, 3, 5, bronze[1]);
          rect(px, 14, 22, 3, 5, bronze[1]);
          rect(px, 11, 23, 2, 4, bronze[0]);
          for (const [sx, top, len] of [[8, 5, 8], [11, 3, 10], [15, 6, 7]]) {
            rect(px, sx, top, 1, len, [150, 60, 40]);
            rect(px, sx, top - 1, 1, 1, [255, 150, 60]);
          }
          rect(px, 9, 1, 1, 1, [220, 215, 225]);
          rect(px, 10, 0, 1, 1, [220, 215, 225]);
          rect(px, 14, 2, 1, 1, [220, 215, 225]);
        }),
        // 紅燈籠柱
        createOutlinedSprite(OW, OH, (px) => {
          rect(px, 11, 13, 2, 14, wood[2]);
          rect(px, 8, 25, 8, 3, stoneG[2]);
          rect(px, 8, 25, 8, 1, stoneG[4]);
          for (let y = 2; y <= 14; y++) {
            const t = (y - 8.5) / 6.5;
            const half = Math.round(6.5 * Math.sqrt(Math.max(0, 1 - t * t)));
            for (let x = 12 - half; x < 12 + half; x++) {
              px(x, y, x < 9 ? [240, 110, 90] : x < 15 ? [210, 54, 48] : [150, 30, 36]);
            }
          }
          rect(px, 8, 7, 8, 3, [255, 208, 110]);
          rect(px, 7, 1, 10, 2, [240, 190, 70]);
          rect(px, 8, 14, 8, 2, [240, 190, 70]);
          rect(px, 11, 16, 2, 3, [210, 54, 48]);
        }),
      ],
      temple: [
        // 石燈籠
        createOutlinedSprite(OW, OH, (px) => {
          rect(px, 5, 24, 14, 3, frost[2]);
          rect(px, 10, 16, 4, 8, frost[3]);
          rect(px, 7, 9, 10, 8, frost[3]);
          rect(px, 9, 11, 6, 4, [255, 214, 120]);
          rect(px, 10, 12, 4, 2, [255, 240, 170]);
          rect(px, 4, 5, 16, 4, frost[3]);
          rect(px, 6, 3, 12, 2, frost[3]);
          rect(px, 9, 1, 6, 2, frost[4]);
          rect(px, 4, 5, 16, 1, SNOW);
          rect(px, 6, 3, 12, 1, SNOW);
          rect(px, 9, 1, 6, 1, SNOW);
          rect(px, 5, 24, 14, 1, frost[4]);
        }),
        // 霜岩
        createOutlinedSprite(OW, OH, (px) => {
          for (let y = 10; y <= 26; y++) {
            const t = (y - 18.5) / 8.5;
            const half = Math.round(10.5 * Math.sqrt(Math.max(0, 1 - t * t)));
            for (let x = 12 - half; x < 12 + half; x++) {
              const dx = x - 11.5;
              let c = dx < -3 ? rock[4] : dx < 3 ? rock[3] : rock[2];
              if (y > 22) c = rock[1];
              if (y < 15 + (hash2d(x, 3) > 0.5 ? 1 : 0)) c = SNOW;
              px(x, y, c);
            }
          }
          rect(px, 17, 6, 2, 7, crystal[4]);
          rect(px, 17, 5, 1, 1, SNOW);
          rect(px, 5, 8, 2, 5, crystal[3]);
        }),
        // 冰晶柱
        createOutlinedSprite(OW, OH, (px) => {
          const shard = (cx, top, bottom, half) => {
            for (let y = top; y <= bottom; y++) {
              const h = Math.min(half, 1 + Math.floor((y - top) * 0.6));
              for (let x = cx - h; x < cx + h; x++) {
                px(x, y, x < cx - 1 ? crystal[4] : x < cx + 1 ? crystal[3] : crystal[2]);
              }
              px(cx, y, crystal[3]);
            }
            px(cx - 1, top + 2, SNOW);
            px(cx - 1, top + 3, SNOW);
          };
          shard(4, 12, 26, 3);
          shard(19, 15, 26, 3);
          shard(12, 1, 26, 5);
          rect(px, 10, 6, 1, 8, SNOW);
          rect(px, 2, 26, 20, 2, frost[1]);
        }),
      ],
    };
    const obstacleTex = {};
    for (const theme of Object.keys(obstacles)) {
      obstacleTex[theme] = obstacles[theme].map((c) => makeCanvasTexture(c));
    }

    /* ---------- 局部環境（沼澤／毒霧／打雷／冰雪）圓形貼圖，每關各自配色 ---------- */

    const TERRAIN_PAL = {
      swamp: {
        meadow: { fill: [96, 74, 50], fill2: [84, 64, 44], ring: [58, 42, 30], dot: [150, 190, 190] },
        ruins: { fill: [70, 44, 48], fill2: [58, 36, 40], ring: [150, 80, 70], dot: [220, 150, 120] },
        temple: { fill: [30, 60, 96], fill2: [24, 48, 82], ring: [100, 160, 210], dot: [190, 230, 255] },
      },
      poison: {
        meadow: { fill: [52, 104, 62], fill2: [40, 86, 52], ring: [150, 220, 120], dot: [200, 255, 170] },
        ruins: { fill: [112, 92, 100], fill2: [96, 78, 88], ring: [214, 150, 110], dot: [255, 204, 140] },
        temple: { fill: [76, 76, 138], fill2: [62, 62, 120], ring: [160, 160, 240], dot: [210, 210, 255] },
      },
      thunder: {
        meadow: { fill: [100, 84, 30], fill2: [84, 70, 26], ring: [255, 224, 74], dot: [255, 246, 168] },
        ruins: { fill: [104, 72, 42], fill2: [88, 60, 36], ring: [255, 210, 70], dot: [255, 241, 168] },
        temple: { fill: [40, 54, 116], fill2: [32, 44, 100], ring: [140, 205, 255], dot: [230, 248, 255] },
      },
      ice: {
        meadow: { fill: [176, 218, 236], fill2: [200, 236, 250], ring: [242, 255, 255], dot: [255, 255, 255] },
        ruins: { fill: [176, 218, 236], fill2: [200, 236, 250], ring: [242, 255, 255], dot: [255, 255, 255] },
        temple: { fill: [176, 218, 236], fill2: [200, 236, 250], ring: [242, 255, 255], dot: [255, 255, 255] },
      },
    };

    function circleTexture(kind, theme, frame) {
      const pal = TERRAIN_PAL[kind][theme];
      const c = document.createElement('canvas');
      c.width = 32;
      c.height = 32;
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(32, 32);
      const d = img.data;
      const put = (x, y, col) => {
        if (x < 0 || y < 0 || x > 31 || y > 31) return;
        if (Math.hypot(x - 15.5, y - 15.5) > 15) return;
        const i = (y * 32 + x) * 4;
        d[i] = col[0];
        d[i + 1] = col[1];
        d[i + 2] = col[2];
        d[i + 3] = 255;
      };
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          const r = Math.hypot(x - 15.5, y - 15.5);
          if (r > 15) continue;
          let col = bayerAt(x, y) > 0.55 + (r / 15) * 0.25 ? pal.fill2 : pal.fill;
          if (r > 13.2) col = pal.ring;
          else if (r > 12.2) col = mix(pal.fill, pal.ring, 0.45);
          put(x, y, col);
        }
      }
      const s = frame ? 1 : 0;
      if (kind === 'swamp') {
        // 水面亮點
        for (const [dx, dy, len] of [[6, 9, 4], [17, 13, 5], [9, 21, 3], [19, 22, 3]]) {
          for (let k = 0; k < len; k++) put(dx + k + s * 2, dy, pal.dot);
        }
      } else if (kind === 'poison') {
        // 旋轉煙霧
        for (let y = 0; y < 32; y++) {
          for (let x = 0; x < 32; x++) {
            const r = Math.hypot(x - 15.5, y - 15.5);
            if (r > 12 || r < 2) continue;
            const a = Math.atan2(y - 15.5, x - 15.5);
            if (Math.sin(a * 3 + r * 0.55 + frame * 1.6) > 0.78 && bayerAt(x, y) > 0.3) put(x, y, pal.dot);
          }
        }
      } else if (kind === 'thunder') {
        const pts = frame
          ? [[17, 4], [13, 10], [18, 15], [13, 21], [16, 27]]
          : [[15, 4], [18, 10], [13, 15], [18, 21], [15, 27]];
        for (let i = 0; i < pts.length - 1; i++) {
          const [x0, y0] = pts[i];
          const [x1, y1] = pts[i + 1];
          const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
          for (let k = 0; k <= steps; k++) {
            const px = Math.round(x0 + ((x1 - x0) * k) / steps);
            const py = Math.round(y0 + ((y1 - y0) * k) / steps);
            put(px, py, pal.dot);
            put(px + 1, py, pal.ring);
          }
        }
      } else if (kind === 'ice') {
        for (let y = 0; y < 32; y++) {
          for (let x = 0; x < 32; x++) {
            const dx = x - 15.5;
            const dy = y - 15.5;
            const r = Math.hypot(dx, dy);
            if (r > 12 || r < 1.5) continue;
            const onArm = Math.abs(dx) < 0.8 || Math.abs(dy) < 0.8 || Math.abs(Math.abs(dx) - Math.abs(dy)) < 0.8;
            if (onArm && (Math.floor(r) + frame) % 3 !== 2) put(x, y, pal.dot);
          }
        }
      }
      ctx.putImageData(img, 0, 0);
      return makeCanvasTexture(c);
    }

    const terrain = {};
    for (const theme of Object.keys(painters)) {
      terrain[theme] = {};
      for (const kind of Object.keys(TERRAIN_PAL)) {
        terrain[theme][kind] = [0, 1].map((frame) => circleTexture(kind, theme, frame));
      }
    }

    /* ---------- 地面裝飾（不參與碰撞）：每關 3 種小物 ---------- */

    const leaf = rampOf([96, 150, 70]);
    const decor = {
      meadow: [
        createOutlinedSprite(14, 12, (px) => {
          rect(px, 6, 5, 1, 6, leaf[2]);
          rect(px, 3, 4, 3, 3, [250, 244, 230]);
          rect(px, 8, 3, 3, 3, [244, 160, 180]);
          rect(px, 5, 1, 3, 3, [255, 214, 90]);
          rect(px, 4, 5, 1, 1, [255, 200, 60]);
          rect(px, 9, 4, 1, 1, [255, 200, 60]);
        }),
        createOutlinedSprite(12, 8, (px) => {
          rect(px, 1, 3, 6, 4, [150, 150, 150]);
          rect(px, 2, 3, 3, 1, [200, 200, 196]);
          rect(px, 6, 4, 5, 3, [128, 128, 130]);
          rect(px, 7, 4, 2, 1, [180, 180, 176]);
        }),
        createOutlinedSprite(12, 12, (px) => {
          for (const [x, h] of [[2, 6], [5, 9], [8, 7]]) {
            rect(px, x, 11 - h, 2, h, leaf[3]);
            rect(px, x, 11 - h, 2, 2, [200, 214, 110]);
          }
        }),
      ],
      ruins: [
        createOutlinedSprite(12, 10, (px) => {
          rect(px, 1, 3, 3, 3, [214, 55, 64]);
          rect(px, 6, 1, 3, 3, [255, 214, 92]);
          rect(px, 5, 6, 4, 3, [214, 55, 64]);
          rect(px, 9, 5, 2, 2, [255, 214, 92]);
        }, false),
        createOutlinedSprite(12, 8, (px) => {
          rect(px, 1, 3, 6, 4, [150, 110, 98]);
          rect(px, 2, 3, 3, 1, [196, 160, 140]);
          rect(px, 6, 4, 5, 3, [118, 84, 78]);
        }),
        createOutlinedSprite(12, 12, (px) => {
          for (const x of [3, 6, 9]) {
            rect(px, x, 4, 1, 7, [120, 70, 44]);
            rect(px, x, 3, 1, 1, [255, 150, 60]);
          }
          rect(px, 2, 10, 9, 1, [70, 60, 60]);
        }),
      ],
      temple: [
        createOutlinedSprite(10, 16, (px) => {
          for (const [x, h] of [[2, 12], [5, 15], [7, 10]]) {
            rect(px, x, 15 - h, 1, h, [82, 168, 168]);
            rect(px, x, 15 - h, 1, 3, [150, 220, 210]);
          }
        }),
        createOutlinedSprite(12, 10, (px) => {
          rect(px, 1, 3, 9, 6, [88, 100, 140]);
          rect(px, 2, 3, 4, 1, [150, 170, 210]);
          rect(px, 6, 5, 2, 2, [140, 240, 255]);
        }),
        createOutlinedSprite(14, 10, (px) => {
          rect(px, 1, 4, 12, 4, [60, 130, 96]);
          rect(px, 3, 3, 8, 1, [96, 170, 120]);
          rect(px, 6, 1, 3, 4, [250, 240, 250]);
          rect(px, 7, 0, 1, 1, [255, 190, 210]);
        }),
      ],
    };
    const decorTex = {};
    for (const theme of Object.keys(decor)) decorTex[theme] = decor[theme].map((c) => makeCanvasTexture(c));

    /* ---------- 白鷺鷥（兩幀拍翅）、螢火／餘燼光點、子彈拖尾、菁英光環 ---------- */

    const egretFrame = (up) => createOutlinedSprite(30, 22, (px) => {
      const W = [250, 250, 246];
      const G = [214, 220, 226];
      rect(px, 9, 11, 12, 5, W);
      rect(px, 12, 15, 8, 2, G);
      rect(px, 20, 8, 3, 4, W);
      rect(px, 22, 5, 3, 4, W);
      rect(px, 23, 4, 3, 3, W);
      rect(px, 26, 5, 4, 1, [255, 200, 70]);
      rect(px, 24, 4, 1, 1, [30, 20, 24]);
      rect(px, 1, 14, 8, 1, [60, 50, 54]);
      rect(px, 0, 15, 4, 1, [60, 50, 54]);
      if (up) {
        rect(px, 10, 6, 7, 5, W);
        rect(px, 12, 2, 6, 5, W);
        rect(px, 14, 0, 3, 3, G);
      } else {
        rect(px, 10, 15, 8, 4, W);
        rect(px, 12, 18, 7, 3, G);
        rect(px, 9, 8, 5, 3, W);
      }
    });
    const egretTex = [egretFrame(true), egretFrame(false)].map((c) => makeCanvasTexture(c));

    const glowCanvas = createOutlinedSprite(8, 8, (px) => {
      rect(px, 3, 3, 2, 2, [255, 255, 255]);
      px(3, 1, [200, 200, 200]);
      px(3, 6, [200, 200, 200]);
      px(1, 3, [200, 200, 200]);
      px(6, 3, [200, 200, 200]);
    }, false);

    const trailCanvas = document.createElement('canvas');
    trailCanvas.width = 32;
    trailCanvas.height = 4;
    {
      const tctx = trailCanvas.getContext('2d');
      const alphas = [0.12, 0.3, 0.55, 0.9];
      for (let x = 0; x < 32; x++) {
        for (let y = 0; y < 4; y++) {
          const a = alphas[Math.floor(x / 8)] * (y === 0 || y === 3 ? 0.55 : 1);
          if (bayerAt(x, y) > a + 0.1) continue;
          tctx.fillStyle = 'rgb(255,255,255)';
          tctx.fillRect(x, y, 1, 1);
        }
      }
    }

    const ringCanvas = document.createElement('canvas');
    ringCanvas.width = 32;
    ringCanvas.height = 32;
    {
      const rctx = ringCanvas.getContext('2d');
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          const r = Math.hypot(x - 15.5, y - 15.5);
          if (r > 15.2) continue;
          if (r > 13.2) rctx.fillStyle = 'rgb(255,214,96)';
          else if (r > 9 && bayerAt(x, y) < (r - 9) / 4.2 * 0.6) rctx.fillStyle = 'rgb(255,190,70)';
          else continue;
          rctx.fillRect(x, y, 1, 1);
        }
      }
    }

    return {
      ground,
      obstacles: obstacleTex,
      terrain,
      decor: decorTex,
      egret: egretTex,
      glow: makeCanvasTexture(glowCanvas),
      trail: makeCanvasTexture(trailCanvas),
      eliteRing: makeCanvasTexture(ringCanvas),
    };
  }

  PGS.StageArt = { build, TILE };
})(window);
