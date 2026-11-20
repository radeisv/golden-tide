// Golden Tide — cover geometry. One layout spec drives every size: a press bar
// on top, a 3 x 2 photo grid (hero top-center, wider than the rest), the giant
// title overlapping the grid's middle seam, and a billing block at the bottom.
// All rects are fractions of the cover size, so landscape, portrait and square
// share the same design.

export function coverLayout(w, h) {
  const pressH = h * 0.062;
  const billingH = h * 0.118;
  const pad = w * 0.02;
  const gap = Math.max(4, Math.round(w * 0.007));

  const grid = {
    x: pad,
    y: pressH + h * 0.014,
    w: w - pad * 2,
    h: h - pressH - billingH - h * 0.028,
  };

  // Column widths: the hero column is wider; rows split 52/48.
  const colW = [grid.w * 0.295, grid.w * 0.41, grid.w * 0.295];
  const rowH = [grid.h * 0.52, grid.h * 0.48];
  const colX = [
    grid.x,
    grid.x + colW[0] + gap,
    grid.x + colW[0] + colW[1] + gap * 2,
  ];
  const rowY = [grid.y, grid.y + rowH[0] + gap];

  // Grid order, left to right, top to bottom: bar, hero, marina / moto, boat, car.
  const panels = [
    { x: colX[0], y: rowY[0], w: colW[0], h: rowH[0] },
    { x: colX[1], y: rowY[0], w: colW[1], h: rowH[0] },
    { x: colX[2], y: rowY[0], w: colW[2], h: rowH[0] },
    { x: colX[0], y: rowY[1], w: colW[0], h: rowH[1] },
    { x: colX[1], y: rowY[1], w: colW[1], h: rowH[1] },
    { x: colX[2], y: rowY[1], w: colW[2], h: rowH[1] },
  ];

  const seamY = rowY[1] - gap / 2;

  return {
    w,
    h,
    pad,
    gap,
    press: { x: pad, y: h * 0.012, w: w - pad * 2, h: pressH },
    grid,
    panels,
    hero: panels[1],
    seamY,
    billing: { x: pad, y: h - billingH - h * 0.006, w: w - pad * 2, h: billingH },
    // Title: giant, centered on the seam, spanning almost the whole width.
    titleSize: Math.round(w * 0.148),
    scriptSize: Math.round(w * 0.052),
    ribbonH: Math.round(h * 0.038),
  };
}

// Fit one line of Anton caps into a width: shrink the font until it fits.
export function fitFont(ctx, text, startSize, maxWidth, family) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

// Draw a five-pointed star centered at (cx, cy) with outer radius r.
export function drawStar(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.42;
    const x = cx + Math.cos(angle) * rad;
    const y = cy + Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// A spiky starburst seal: alternating long/short spikes around a filled disc.
export function drawSeal(ctx, cx, cy, r, fill, stroke) {
  ctx.save();
  ctx.beginPath();
  const spikes = 16;
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.78;
    const x = cx + Math.cos(angle) * rad;
    const y = cy + Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.restore();
}

// A fake barcode: deterministic bar widths from a seed string, plus a number.
export function drawBarcode(ctx, x, y, w, h, code) {
  let seed = 0;
  for (const ch of code) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 22);
  ctx.fillStyle = '#111111';
  let bx = x;
  while (bx < x + w - 3) {
    const bw = 1 + Math.floor(next() * 4);
    if (next() > 0.42) ctx.fillRect(bx, y, bw, h);
    bx += bw + 1 + Math.floor(next() * 3);
  }
  ctx.font = `${Math.max(9, Math.round(h * 0.28))}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(code, x + w / 2, y + h + 3);
  ctx.restore();
}
