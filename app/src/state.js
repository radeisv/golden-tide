// Golden Tide — the cover's state: every word on the cover, every panel's photo
// and crop, the grade preset and the export size. The editor mutates this object
// and re-renders; the exporter renders it at full size. All copy here is original.

export const SIZES = {
  landscape: { w: 1920, h: 1080, label: 'Landscape 1920 x 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  square: { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
};

// Four genuinely different grades. Each preset names the canvas filter for the
// photo pass plus the split-tone tints the pixel pass blends in.
export const PRESETS = {
  golden: {
    name: 'Golden Hour',
    filter: 'saturate(1.18) contrast(1.10) brightness(1.02) sepia(0.18)',
    shadow: [46, 18, 64],
    highlight: [255, 196, 90],
    quantize: 0,
  },
  neon: {
    name: 'Neon Nights',
    filter: 'saturate(1.38) contrast(1.12) brightness(0.98) sepia(0.06)',
    shadow: [28, 8, 72],
    highlight: [255, 108, 192],
    quantize: 0,
  },
  pastel: {
    name: 'Vice Pastel',
    filter: 'saturate(1.05) contrast(0.98) brightness(1.08) sepia(0.12)',
    shadow: [64, 42, 84],
    highlight: [255, 222, 182],
    quantize: 0,
  },
  noir: {
    name: 'Noir Gold',
    filter: 'saturate(0.82) contrast(1.26) brightness(0.95) sepia(0.26)',
    shadow: [10, 6, 18],
    highlight: [255, 190, 60],
    quantize: 0,
  },
};

// One panel: a photo plus its own crop state. fx/fy is the focal point in the
// photo (0..1); zoom, pan and flip are the editor's per-panel controls.
function panel(src, role, fx, fy) {
  return { src, role, fx, fy, zoom: 1, panX: 0, panY: 0, flip: false };
}

export function defaultState() {
  return {
    size: 'landscape',
    preset: 'golden',
    treatment: 80,
    ink: 0,
    title: 'GOLDEN TIDE',
    script: 'chasing the last light',
    quote: 'SALT, SUN, AND A GETAWAY PLAN',
    paper: 'THE TIDE HERALD',
    badge: 'ISSUE 01',
    location: 'GOLDEN PIER · 6:47 PM',
    ribbon: 'SIX FACES · ONE TIDE · NO TURNING BACK',
    billing: 'A TIDEWORKS PICTURE · STARRING YOU · SHOT ON YOUR OWN CAMERA · GRADED BY HAND',
    bottomLine: 'OUT AT FIRST LIGHT',
    seal: 'HAND-GRADED ART',
    panels: [
      panel('samples/02-bar.jpg', 'THE DEALER', 0.5, 0.34),
      panel('samples/01-hero.jpg', 'THE SIREN', 0.5, 0.56),
      panel('samples/03-marina.jpg', 'THE HARBOR MASTER', 0.5, 0.4),
      panel('samples/04-moto.jpg', 'THE WHEELMAN', 0.55, 0.42),
      panel('samples/05-boat.jpg', 'THE RUNAWAYS', 0.5, 0.5),
      panel('samples/06-car.jpg', 'THE GETAWAY', 0.45, 0.52),
    ],
  };
}

// A deep copy of the default, so the editor never mutates the template.
export function freshState() {
  return JSON.parse(JSON.stringify(defaultState()));
}
