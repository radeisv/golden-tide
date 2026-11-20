// Golden Tide — the cover painter. One function draws the whole poster at any
// size: deep purple frame, press bar with stars and quote, six photo panels
// with role tags, the giant striped title over the middle seam, the script
// subtitle, the ribbon, and the billing block with seal and barcode.
// The preview and the PNG exporter both call this, so what you see is what
// the file holds.

import { coverLayout, fitFont, drawStar, drawSeal, drawBarcode } from './layouts.js';
import { drawPhotoPanel } from './imaging.js';

const FRAME_TOP = '#2e0a36';
const FRAME_BOTTOM = '#15031c';
const GOLD = '#f2c14e';
const GOLD_DARK = '#b98a1e';
const INK = '#1d0426';
const PAPER = '#ffe9a8';

function background(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, FRAME_TOP);
  g.addColorStop(1, FRAME_BOTTOM);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(3, w * 0.004);
  ctx.strokeRect(w * 0.006, h * 0.006, w * 0.988, h * 0.988);
}

function pressBar(ctx, state, L) {
  const { x, y, w, h } = L.press;
  const cy = y + h / 2;
  // Five gold stars on the left.
  const r = h * 0.3;
  let sx = x + r;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, sx, cy, r, GOLD);
    sx += r * 2.3;
  }
  // The quote, centred in the space between the stars and the badge.
  const quote = `“${state.quote}”`;
  const text = `${quote} — ${state.paper}`;
  const size = fitFont(ctx, text, Math.round(h * 0.52), w * 0.5, 'Anton, sans-serif');
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PAPER;
  ctx.fillText(text, x + w * 0.585, cy);
  // The issue badge, a gold pill on the right.
  const badge = state.badge || 'ISSUE 01';
  const bs = Math.round(h * 0.44);
  ctx.font = `${bs}px Anton, sans-serif`;
  const bw = ctx.measureText(badge).width + h * 0.7;
  const bx = x + w - bw;
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.roundRect(bx, y + h * 0.14, bw, h * 0.72, h * 0.36);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.fillText(badge, bx + bw / 2, cy + 1);
}

function roleTag(ctx, panel, role, top) {
  const padX = Math.max(6, panel.w * 0.03);
  const tagH = Math.max(16, panel.h * 0.1);
  const size = fitFont(ctx, role, Math.round(tagH * 0.58), panel.w * 0.8, 'Anton, sans-serif');
  ctx.font = `${size}px Anton, sans-serif`;
  const tw = ctx.measureText(role).width + padX * 2;
  const th = tagH;
  const tx = panel.x + Math.max(4, panel.w * 0.02);
  const ty = top ? panel.y + Math.max(4, panel.h * 0.03) : panel.y + panel.h - th - Math.max(4, panel.h * 0.03);
  ctx.save();
  ctx.translate(tx + tw / 2, ty + th / 2);
  ctx.rotate(-0.045);
  ctx.fillStyle = 'rgba(10, 2, 16, 0.92)';
  ctx.fillRect(-tw / 2, -th / 2, tw, th);
  ctx.fillStyle = GOLD;
  ctx.fillRect(-tw / 2, -th / 2, Math.max(3, tw * 0.03), th);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(role, 0, 1);
  ctx.restore();
}

function locationPlate(ctx, hero, text) {
  // Right-aligned: the hero's role tag sits top-left, so the plate takes the
  // top-right corner. The plate is capped at 45% of the hero's width so it
  // can never reach the tag, even on the narrow portrait hero.
  let size = Math.max(11, Math.round(hero.h * 0.052));
  ctx.font = `${size}px Anton, sans-serif`;
  let tw = ctx.measureText(text).width + size * 1.6;
  while (size > 11 && tw > hero.w * 0.45) {
    size -= 1;
    ctx.font = `${size}px Anton, sans-serif`;
    tw = ctx.measureText(text).width + size * 1.6;
  }
  const th = size * 1.7;
  // Right-aligned: the hero's role tag sits top-left, so the plate takes the
  // top-right corner instead of the centre, where it would cover the tag.
  const tx = hero.x + hero.w - tw - Math.max(4, hero.h * 0.02);
  const ty = hero.y + Math.max(4, hero.h * 0.02);
  ctx.save();
  ctx.fillStyle = 'rgba(255, 248, 230, 0.96)';
  ctx.beginPath();
  ctx.roundRect(tx, ty, tw, th, th / 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, tx + tw / 2, ty + th / 2 + 1);
  ctx.restore();
}

function stripedTitleGradient(ctx, y0, y1) {
  // Horizontal bands of sunset colour, like a striped beach-towel fill.
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  const bands = ['#fff6b8', '#ffd94a', '#ff9e3d', '#ff5e8a', '#c04df0', '#7a2fd0'];
  const n = bands.length;
  for (let i = 0; i < n; i++) {
    g.addColorStop(i / n, bands[i]);
    g.addColorStop((i + 0.85) / n, bands[i]);
  }
  return g;
}

function titleBlock(ctx, state, L) {
  const { w, seamY } = L;
  const title = state.title || 'GOLDEN TIDE';
  const size = fitFont(ctx, title, L.titleSize, w * 0.96, 'Anton, sans-serif');
  const y = seamY;
  const shadow = size * 0.07;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.lineJoin = 'round';
  // Hard drop shadow, then thick outline, then the striped fill.
  ctx.fillStyle = INK;
  ctx.fillText(title, w / 2 + shadow * 0.5, y + shadow);
  ctx.strokeStyle = INK;
  ctx.lineWidth = size * 0.085;
  ctx.strokeText(title, w / 2, y);
  ctx.fillStyle = stripedTitleGradient(ctx, y - size * 0.5, y + size * 0.5);
  ctx.fillText(title, w / 2, y);
  ctx.restore();

  // Neon script subtitle, tilted a little and overlapping the title's lower
  // edge like the reference covers — never over the faces below the seam.
  const script = state.script || '';
  const ss = script ? fitFont(ctx, script, L.scriptSize, w * 0.8, 'Pacifico, cursive') : 0;
  if (script) {
    ctx.save();
    ctx.translate(w / 2, y + size * 0.4);
    ctx.rotate(-0.035);
    ctx.font = `${ss}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = ss * 0.35;
    ctx.fillStyle = '#ff8fc0';
    ctx.fillText(script, 0, 0);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffd7ea';
    ctx.fillText(script, 0, -ss * 0.04);
    ctx.restore();
  }

  // The ribbon no longer lives here: it used to cross the boat couple's
  // faces in the lower panels, so it now sits in the billing band instead
  // (see billingBlock) — out of the photo grid entirely.
}

function billingBlock(ctx, state, L) {
  const { w, h } = L;
  const B = L.billing;

  // Black ribbon with the tagline, as a strip at the top of the billing
  // band — out of the photo grid entirely, so it can never cross a face.
  const ribbon = state.ribbon || '';
  if (ribbon) {
    const rs = fitFont(ctx, ribbon, Math.round(L.ribbonH * 0.52), w * 0.72, 'Anton, sans-serif');
    ctx.font = `${rs}px Anton, sans-serif`;
    const rw = ctx.measureText(ribbon).width + rs * 2.4;
    const rh = L.ribbonH;
    const ry = B.y + B.h * 0.02;
    ctx.save();
    ctx.translate(w / 2, ry + rh / 2);
    ctx.rotate(-0.012);
    ctx.fillStyle = 'rgba(10, 2, 16, 0.94)';
    ctx.fillRect(-rw / 2, -rh / 2, rw, rh);
    ctx.fillStyle = GOLD;
    ctx.fillRect(-rw / 2, -rh / 2, Math.max(3, rw * 0.012), rh);
    ctx.fillRect(rw / 2 - Math.max(3, rw * 0.012), -rh / 2, Math.max(3, rw * 0.012), rh);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ribbon, 0, 1);
    ctx.restore();
  }

  // The billing lines sit below the ribbon, in the lower two-thirds of the
  // band, so the ribbon never touches them.
  const cy = B.y + B.h * 0.67;

  // Bottom line, neon pink, bottom-left — kept clear of the billing text.
  const bl = state.bottomLine || '';
  if (bl) {
    const bs = fitFont(ctx, bl, Math.round(B.h * 0.22), w * 0.24, 'Anton, sans-serif');
    ctx.font = `${bs}px Anton, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff6fb0';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = bs * 0.3;
    ctx.fillText(bl, B.x, cy);
    ctx.shadowBlur = 0;
  }

  // Billing, split at the middle dot into two centred lines, centred in the
  // space between the bottom line and the seal. Both lines are fitted to a
  // width that keeps their right edge clear of the barcode's white box: the
  // second line is the longer one, and fitting only the first let it run
  // under the barcode in portrait and square.
  const billing = state.billing || '';
  const parts = billing.split(' · ');
  const mid = Math.ceil(parts.length / 2);
  const line1 = parts.slice(0, mid).join(' · ');
  const line2 = parts.slice(mid).join(' · ');
  const cx = w * 0.6;
  const barcodeBoxLeft = w - L.pad - w * 0.085 - 4;
  const maxBillingW = Math.min(w * 0.5, 2 * (barcodeBoxLeft - 8 - cx));
  let bs = fitFont(ctx, line1, Math.round(B.h * 0.24), maxBillingW, 'Anton, sans-serif');
  if (line2) bs = Math.min(bs, fitFont(ctx, line2, Math.round(B.h * 0.24), maxBillingW, 'Anton, sans-serif'));
  ctx.font = `${bs}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 240, 200, 0.92)';
  ctx.fillText(line1, cx, cy - bs * 0.72);
  if (line2) ctx.fillText(line2, cx, cy + bs * 0.72);

  // Gold starburst seal overlapping the bottom-right panel's corner.
  const gridBottom = L.grid.y + L.grid.h;
  const r = Math.min(B.h * 0.52, w * 0.055);
  const sealCx = w - L.pad - r * 1.05;
  const sealCy = gridBottom - r * 0.1;
  drawSeal(ctx, sealCx, sealCy, r, GOLD, GOLD_DARK);
  const sealWords = (state.seal || 'HAND-GRADED ART').split(' ');
  const ss = fitFont(ctx, sealWords.join(' '), Math.round(r * 0.34), r * 1.5, 'Anton, sans-serif');
  ctx.font = `${ss}px Anton, sans-serif`;
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const midW = Math.ceil(sealWords.length / 2);
  ctx.fillText(sealWords.slice(0, midW).join(' '), sealCx, sealCy - ss * 0.55);
  ctx.fillText(sealWords.slice(midW).join(' '), sealCx, sealCy + ss * 0.55);

  // Barcode in the strip's bottom-right corner.
  const bw = w * 0.085;
  const bh = B.h * 0.3;
  drawBarcode(ctx, w - L.pad - bw, h - L.pad - bh - Math.max(4, h * 0.004), bw, bh, '042069 2026');
}

export function drawCover(ctx, state, images, W, H) {
  const L = coverLayout(W, H);
  background(ctx, W, H);
  pressBar(ctx, state, L);

  // Six photo panels, each with its own photo, grade and role tag.
  state.panels.forEach((panel, i) => {
    const rect = L.panels[i];
    const img = images[i];
    if (img) {
      drawPhotoPanel(ctx, img, rect, panel, state.preset, state.treatment, state.ink, 1000 + i * 77);
    } else {
      ctx.fillStyle = '#3a1530';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = Math.max(2, W * 0.002);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    roleTag(ctx, rect, panel.role, i < 3);
  });
  locationPlate(ctx, L.hero, state.location || '');

  titleBlock(ctx, state, L);
  billingBlock(ctx, state, L);
}

// Render the cover into a fresh canvas at exact size; the exporter uses this.
export function renderCoverToCanvas(state, images, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, state, images, w, h);
  return canvas;
}
