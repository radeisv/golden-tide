// Golden Tide — boot. Loads the two display fonts and the six sample photos,
// then builds the editor. Everything is a local file; the app makes no network
// request at all.

import { freshState } from './state.js';
import { loadImage } from './imaging.js';
import { buildEditor } from './editor.js';

const FONTS = [
  { family: 'Anton', url: './fonts/Anton-Regular.ttf' },
  { family: 'Pacifico', url: './fonts/Pacifico-Regular.ttf' },
];

async function loadFonts() {
  for (const { family, url } of FONTS) {
    const face = new FontFace(family, `url(${url})`);
    const loaded = await face.load();
    document.fonts.add(loaded);
  }
  await document.fonts.ready;
}

async function boot() {
  const state = freshState();
  const canvas = document.getElementById('preview');
  const statusEl = document.getElementById('status');

  try {
    await loadFonts();
  } catch (err) {
    statusEl.textContent = `Fonts did not load (${err.message}); the cover still renders with fallback type.`;
    statusEl.classList.add('error');
  }

  // Sample photos load in panel order; a missing one leaves its panel dark
  // instead of breaking the whole app.
  const images = [];
  for (let i = 0; i < state.panels.length; i++) {
    try {
      images.push(await loadImage(state.panels[i].src));
    } catch {
      images.push(null);
    }
  }

  buildEditor(state, images, canvas);
}

boot();
