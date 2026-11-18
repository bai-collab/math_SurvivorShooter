import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

// 第 1 關「稻香田野」地面降噪回歸測試（2026-11-18，使用者回報背景太花、很多稻米）。
// 用最小假 canvas 在 Node 內執行 stage-art.js，量地面貼圖的高頻雜訊與亮度離散度。
function readSource(name) {
  return readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
}

function makeFakeCanvas() {
  const canvas = {
    width: 0,
    height: 0,
    _px: null,
    getContext() {
      const self = canvas;
      const ensure = () => {
        if (!self._px || self._px.length !== self.width * self.height * 4) {
          self._px = new Uint8ClampedArray(self.width * self.height * 4);
        }
        return self._px;
      };
      const state = { fillStyle: 'rgb(0,0,0)', imageSmoothingEnabled: false };
      const noop = () => {};
      return new Proxy(state, {
        get(t, k) {
          if (k === 'fillRect') {
            return (x, y, w, h) => {
              const m = /(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(String(t.fillStyle));
              const rgb = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
              const a = m && m[4] !== undefined ? Math.round(Number(m[4]) * 255) : 255;
              const d = ensure();
              for (let yy = y; yy < y + h; yy++) {
                for (let xx = x; xx < x + w; xx++) {
                  if (xx < 0 || yy < 0 || xx >= self.width || yy >= self.height) continue;
                  const i = (yy * self.width + xx) * 4;
                  d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = a;
                }
              }
            };
          }
          if (k === 'createImageData') return (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
          if (k === 'getImageData') {
            return (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(ensure().subarray(0, w * h * 4)) });
          }
          if (k === 'putImageData') return (img) => { ensure().set(img.data); };
          if (k in t) return t[k];
          return noop;
        },
        set(t, k, v) { t[k] = v; return true; },
      });
    },
  };
  return canvas;
}

function loadStageArt() {
  const sandbox = {
    console,
    document: { createElement: () => makeFakeCanvas() },
    THREE: {
      NearestFilter: 1,
      RepeatWrapping: 2,
      CanvasTexture: class {
        constructor(canvas) { this.image = canvas; this.repeat = { set() {} }; }
      },
    },
  };
  sandbox.window = sandbox;
  sandbox.PGS = {};
  vm.createContext(sandbox);
  for (const file of ['pixel-art.js', 'stage-art.js']) {
    vm.runInContext(readSource(file), sandbox, { filename: `src/${file}` });
  }
  return sandbox.PGS.StageArt.build();
}

const lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

// 相鄰像素（右、下；貼圖重複排列所以邊界環繞）明度差平均值，與全圖亮度標準差
function metrics(canvas) {
  const { width: W, height: H, _px: d } = canvas;
  let diff = 0;
  let n = 0;
  let sum = 0;
  let sum2 = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const l = lum(d, (y * W + x) * 4);
      sum += l;
      sum2 += l * l;
      diff += Math.abs(l - lum(d, (y * W + ((x + 1) % W)) * 4));
      diff += Math.abs(l - lum(d, (((y + 1) % H) * W + x) * 4));
      n += 1;
    }
  }
  const mean = sum / n;
  return { neighborDiff: diff / (2 * n), std: Math.sqrt(Math.max(0, sum2 / n - mean * mean)), mean };
}

const art = loadStageArt();
const meadow = art.ground.meadow.map((t) => metrics(t.image));

// 改版前（2026-11-18 之前）第 1 關地面貼圖的量測值，由同一支量法在舊版 stage-art.js 上實測
const OLD_MEADOW = { neighborDiff: 15.7924, std: 28.1852 };
// 第 2、3 關沒有改動，量測值必須維持
const OLD_RUINS = { neighborDiff: 10.3729, std: 22.3968 };
const OLD_TEMPLE = { neighborDiff: 5.5074, std: 22.7125 };

test('第 1 關地面貼圖高頻雜訊（相鄰像素明度差平均）降到舊版的一半以下', () => {
  assert.equal(meadow.length, 2);
  for (const m of meadow) assert.ok(m.neighborDiff <= OLD_MEADOW.neighborDiff * 0.5, `neighborDiff ${m.neighborDiff}`);
});

test('第 1 關地面貼圖亮度標準差降到舊版的一半以下', () => {
  for (const m of meadow) assert.ok(m.std <= OLD_MEADOW.std * 0.5, `std ${m.std}`);
});

test('第 1 關地面維持中暗明度（平均明度 60～100），角色與子彈才有足夠對比', () => {
  for (const m of meadow) assert.ok(m.mean >= 60 && m.mean <= 100, `mean ${m.mean}`);
});

test('第 1 關稻田只出現在少數田塊：非草地（田塊土色與田埂）像素約佔 15～25%，水窪不到 1%', () => {
  for (const t of art.ground.meadow) {
    const { width, height, _px: d } = t.image;
    let plot = 0;
    let water = 0;
    for (let i = 0; i < width * height; i++) {
      const r = d[i * 4];
      const g = d[i * 4 + 1];
      const b = d[i * 4 + 2];
      if (b > r + 30) water++;
      else if (g - r < 20) plot++;
    }
    const ratio = plot / (width * height);
    assert.ok(ratio >= 0.15 && ratio <= 0.25, `田塊比例 ${ratio}`);
    assert.ok(water / (width * height) < 0.01, `水窪比例 ${water / (width * height)}`);
  }
});

test('第 1 關兩幀稻浪只有田塊內的稻穗與水窪漣漪不同，其餘地面逐像素一致', () => {
  const [a, b] = art.ground.meadow.map((t) => t.image._px);
  let changed = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) changed++;
  }
  assert.ok(changed > 0, '兩幀完全相同，稻浪動畫失效');
  assert.ok(changed / (a.length / 4) < 0.01, `兩幀差異像素比例 ${changed / (a.length / 4)}`);
});

test('第 2、3 關地面貼圖未被改動', () => {
  const ruins = metrics(art.ground.ruins[0].image);
  const temple = metrics(art.ground.temple[0].image);
  assert.ok(Math.abs(ruins.neighborDiff - OLD_RUINS.neighborDiff) < 0.001);
  assert.ok(Math.abs(ruins.std - OLD_RUINS.std) < 0.001);
  assert.ok(Math.abs(temple.neighborDiff - OLD_TEMPLE.neighborDiff) < 0.001);
  assert.ok(Math.abs(temple.std - OLD_TEMPLE.std) < 0.001);
});

test('renderer 第 1 關地面隨機裝飾保留機率降到原本的 1/3 以下，其餘兩關維持 0.55', () => {
  const src = readSource('renderer.js');
  const m = /DECOR_KEEP = \{ meadow: ([\d.]+), ruins: ([\d.]+), temple: ([\d.]+) \}/.exec(src);
  assert.ok(m, '找不到 DECOR_KEEP');
  assert.ok(Number(m[1]) <= 0.55 / 3);
  assert.equal(Number(m[2]), 0.55);
  assert.equal(Number(m[3]), 0.55);
  assert.match(src, /hashUnit\(gx \* salt \+ 0\.31, gz \+ 0\.77\) > keep/);
});

if (process.env.PGS_PRINT_METRICS) {
  console.log('meadow metrics', JSON.stringify(meadow));
}
