// Golden Tide — PNG export. Renders the cover at the exact post size on an
// offscreen canvas and downloads it. The same renderer paints the preview,
// so the file is exactly what the editor shows.

import { SIZES } from './state.js';
import { renderCoverToCanvas } from './renderer.js';

export function exportPNG(state, images, sizeKey) {
  const size = SIZES[sizeKey] || SIZES.landscape;
  const canvas = renderCoverToCanvas(state, images, size.w, size.h);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('the browser could not write the PNG'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `golden-tide-${size.w}x${size.h}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve({ blob, size });
    }, 'image/png');
  });
}

// Render a size and hand the blob back without downloading (used by QA).
export function renderPNGBlob(state, images, sizeKey) {
  const size = SIZES[sizeKey] || SIZES.landscape;
  const canvas = renderCoverToCanvas(state, images, size.w, size.h);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('the browser could not write the PNG'));
      else resolve({ blob, size, canvas });
    }, 'image/png');
  });
}
