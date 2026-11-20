// Golden Tide — the pixel pipeline. Each panel photo is drawn twice on small
// offscreen canvases (once plain, once with the preset's canvas filter), blended
// by the Treatment slider, then split-toned, gently quantized, grained and,
// when Poster Ink is up, darkened along its edges with a soft Sobel pass.
// Everything is seeded, so the same state always renders the same pixels.

import { PRESETS } from './state.js';

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

// Deterministic PRNG (mulberry32) — grain must look the same on every render.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// Draw one photo into rect, cover-fit around its focal point, with zoom, pan
// and flip, then grade it. `seed` makes the grain stable per panel.
export function drawPhotoPanel(ctx, img, rect, panel, presetKey, treatment, ink, seed) {
  const w = Math.max(2, Math.round(rect.w));
  const h = Math.max(2, Math.round(rect.h));
  const preset = PRESETS[presetKey] || PRESETS.golden;
  const t = clamp01(treatment / 100);

  const plain = document.createElement('canvas');
  plain.width = w;
  plain.height = h;
  const graded = document.createElement('canvas');
  graded.width = w;
  graded.height = h;

  for (const [canvas, filter] of [
    [plain, 'none'],
    [graded, preset.filter],
  ]) {
    const c = canvas.getContext('2d');
    c.filter = filter;
    drawCoverFit(c, img, w, h, panel);
    c.filter = 'none';
  }

  const pctx = plain.getContext('2d');
  const pData = pctx.getImageData(0, 0, w, h);
  const gData = graded.getContext('2d').getImageData(0, 0, w, h);
  gradePixels(pData.data, gData.data, w, h, preset, t, ink, seed);
  pctx.putImageData(pData, 0, 0);

  ctx.save();
  ctx.drawImage(plain, rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

// Cover-fit draw of img into a w x h canvas, centred on the panel's focal
// point, shifted by pan, scaled by zoom, mirrored when flip is set.
function drawCoverFit(c, img, w, h, panel) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) {
    c.fillStyle = '#3a1530';
    c.fillRect(0, 0, w, h);
    return;
  }
  const base = Math.max(w / iw, h / ih) * (panel.zoom || 1);
  const sw = w / base;
  const sh = h / base;
  const cx = clamp01(panel.fx + (panel.panX || 0) * 0.3) * iw;
  const cy = clamp01(panel.fy + (panel.panY || 0) * 0.3) * ih;
  let sx = cx - sw / 2;
  let sy = cy - sh / 2;
  sx = Math.max(0, Math.min(iw - sw, sx));
  sy = Math.max(0, Math.min(ih - sh, sy));
  c.save();
  c.translate(w / 2, h / 2);
  if (panel.flip) c.scale(-1, 1);
  c.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
  c.restore();
}

// Blend plain/graded pixels by treatment, split-tone them, quantize gently,
// add seeded grain, then darken Sobel edges by the ink amount.
function gradePixels(plain, graded, w, h, preset, t, ink, seed) {
  const n = w * h;
  const lum = new Float32Array(n);
  const rand = mulberry32(seed);
  const [sr, sg, sb] = preset.shadow;
  const [hr, hg, hb] = preset.highlight;

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    let r = plain[o] + (graded[o] - plain[o]) * t;
    let g = plain[o + 1] + (graded[o + 1] - plain[o + 1]) * t;
    let b = plain[o + 2] + (graded[o + 2] - plain[o + 2]) * t;

    // Split tone: shadows lean to the shadow tint, highlights to the gold.
    const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const sw = (1 - l) * (1 - l) * 0.3 * t;
    const hw = l * l * 0.26 * t;
    r += (sr - r) * sw + (hr - r) * hw;
    g += (sg - g) * sw + (hg - g) * hw;
    b += (sb - b) * sw + (hb - b) * hw;

    // Gentle posterize: pull each channel toward an 8-step grid.
    const q = 0.45 * t;
    r += (Math.round(r / 8) * 8 - r) * q;
    g += (Math.round(g / 8) * 8 - g) * q;
    b += (Math.round(b / 8) * 8 - b) * q;

    // Deterministic grain, +/- 5 levels.
    const grain = (rand() - 0.5) * 10;
    plain[o] = r + grain;
    plain[o + 1] = g + grain;
    plain[o + 2] = b + grain;
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // Soft Sobel "Poster Ink": darken pixels that sit on a strong edge.
  const inkAmt = clamp01(ink / 100);
  if (inkAmt > 0.01) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const gx =
          -lum[i - w - 1] - 2 * lum[i - 1] - lum[i + w - 1] +
          lum[i - w + 1] + 2 * lum[i + 1] + lum[i + w + 1];
        const gy =
          -lum[i - w - 1] - 2 * lum[i - w] - lum[i - w + 1] +
          lum[i + w - 1] + 2 * lum[i + w] + lum[i + w + 1];
        const edge = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 360);
        if (edge > 0.12) {
          const dark = 1 - edge * inkAmt * 0.85;
          const o = i * 4;
          plain[o] *= dark;
          plain[o + 1] *= dark;
          plain[o + 2] *= dark;
        }
      }
    }
  }
}
