// Golden Tide — the editor. Wires every control in the page to the state and
// re-renders the preview on every change. Photos are read on the user's own
// machine and never uploaded anywhere.

import { PRESETS, SIZES } from './state.js';
import { loadImage } from './imaging.js';
import { coverLayout } from './layouts.js';
import { drawCover } from './renderer.js';
import { exportPNG } from './export.js';

const $ = (id) => document.getElementById(id);

export function buildEditor(state, images, canvas) {
  const ctx = canvas.getContext('2d');
  let selected = 1; // the hero panel, selected by default
  let renderTimer = 0;

  function status(msg, isError) {
    const el = $('status');
    el.textContent = msg || '';
    el.classList.toggle('error', !!isError);
  }

  function render() {
    const size = SIZES[state.size];
    if (canvas.width !== size.w || canvas.height !== size.h) {
      canvas.width = size.w;
      canvas.height = size.h;
    }
    // The preview canvas shows the cover at a smaller CSS size; the canvas
    // itself stays at full export resolution so the pixels are the real ones.
    drawCover(ctx, state, images, size.w, size.h);
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 30);
  }

  // ----- text fields -------------------------------------------------------
  const textFields = [
    ['title', 'title', 40],
    ['script', 'script', 48],
    ['quote', 'quote', 80],
    ['paper', 'paper', 40],
    ['location', 'location', 40],
    ['ribbon', 'ribbon', 60],
    ['billing', 'billing', 120],
    ['bottom-line', 'bottomLine', 40],
    ['badge', 'badge', 16],
    ['seal', 'seal', 24],
  ];
  for (const [id, key, max] of textFields) {
    const el = $(id);
    if (!el) continue;
    el.maxLength = max;
    el.value = state[key];
    el.addEventListener('input', () => {
      state[key] = el.value;
      scheduleRender();
    });
  }

  // ----- presets -----------------------------------------------------------
  for (const key of Object.keys(PRESETS)) {
    const btn = $(`preset-${key}`);
    if (!btn) continue;
    btn.addEventListener('click', () => {
      state.preset = key;
      document.querySelectorAll('[data-preset]').forEach((b) => b.classList.toggle('active', b === btn));
      scheduleRender();
    });
  }

  // ----- treatment + poster ink -------------------------------------------
  const treatment = $('treatment');
  const ink = $('ink');
  if (treatment) {
    treatment.value = state.treatment;
    $('treatment-val').textContent = `${state.treatment}%`;
    treatment.addEventListener('input', () => {
      state.treatment = Number(treatment.value);
      $('treatment-val').textContent = `${state.treatment}%`;
      scheduleRender();
    });
  }
  if (ink) {
    ink.value = state.ink;
    $('ink-val').textContent = `${state.ink}%`;
    ink.addEventListener('input', () => {
      state.ink = Number(ink.value);
      $('ink-val').textContent = `${state.ink}%`;
      scheduleRender();
    });
  }

  // ----- sizes + export -----------------------------------------------------
  for (const key of Object.keys(SIZES)) {
    const sizeBtn = $(`size-${key}`);
    if (sizeBtn) {
      sizeBtn.addEventListener('click', () => {
        state.size = key;
        document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b === sizeBtn));
        canvas.classList.toggle('portrait', key === 'portrait');
        canvas.classList.toggle('square', key === 'square');
        render();
      });
    }
    const expBtn = $(`export-${key}`);
    if (expBtn) {
      expBtn.addEventListener('click', async () => {
        status(`Exporting ${SIZES[key].label}…`);
        try {
          await exportPNG(state, images, key);
          status(`${SIZES[key].label} PNG downloaded.`);
        } catch (err) {
          status(`Export failed: ${err.message}`, true);
        }
      });
    }
  }

  // ----- photo loading ------------------------------------------------------
  async function setPanelPhoto(index, file) {
    const panel = state.panels[index];
    let url;
    try {
      url = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('could not read that file'));
        reader.readAsDataURL(file);
      });
      const img = await loadImage(url);
      images[index] = img;
      panel.src = file.name;
      status(`Panel ${index + 1} now uses ${file.name}.`);
      render();
      return true;
    } catch (err) {
      status(`Could not use ${file.name}: ${err.message} — try a JPG or PNG photo.`, true);
      return false;
    }
  }

  // Multi-file upload: targets are fixed before any file is decoded, so each
  // file lands in the panel it was meant for even if one fails to decode.
  const uploadAll = $('upload-all');
  if (uploadAll) {
    uploadAll.addEventListener('change', async () => {
      const files = Array.from(uploadAll.files || []);
      if (!files.length) return;
      const targets = files.map((file, i) => ({ file, index: (selected + i) % state.panels.length }));
      status(`Reading ${files.length} photo${files.length > 1 ? 's' : ''}…`);
      let ok = 0;
      for (const { file, index } of targets) {
        if (await setPanelPhoto(index, file)) ok++;
      }
      if (ok === files.length) status(`${ok} photo${ok > 1 ? 's' : ''} loaded.`);
      uploadAll.value = '';
    });
  }

  // ----- panel rows ----------------------------------------------------------
  const container = $('panels');
  state.panels.forEach((panel, i) => {
    const row = document.createElement('div');
    row.className = 'panel-row';
    row.dataset.panel = String(i);
    row.innerHTML = `
      <div class="panel-head">
        <span class="panel-name">${i + 1} · <span class="panel-role-name">${panel.role}</span></span>
        <button type="button" data-act="select">Select</button>
      </div>
      <label>Role <input type="text" data-field="role" maxlength="24" value="${panel.role}"></label>
      <label>Photo <input type="file" accept="image/*" data-field="file"></label>
      <label>Zoom <input type="range" min="1" max="2.5" step="0.05" value="${panel.zoom}" data-field="zoom"></label>
      <label>Pan X <input type="range" min="-1" max="1" step="0.05" value="${panel.panX}" data-field="panX"></label>
      <label>Pan Y <input type="range" min="-1" max="1" step="0.05" value="${panel.panY}" data-field="panY"></label>
      <div class="panel-actions">
        <button type="button" data-act="flip">Flip</button>
        <button type="button" data-act="to-all">Use for all panels</button>
      </div>`;
    container.appendChild(row);

    const markSelected = () => {
      container.querySelectorAll('.panel-row').forEach((r) => r.classList.toggle('selected', Number(r.dataset.panel) === selected));
    };
    markSelected();

    row.querySelector('[data-act="select"]').addEventListener('click', () => {
      selected = i;
      markSelected();
      status(`Panel ${i + 1} selected — click the preview to set its focal point.`);
    });
    row.querySelector('[data-field="role"]').addEventListener('input', (e) => {
      panel.role = e.target.value.toUpperCase();
      row.querySelector('.panel-role-name').textContent = panel.role;
      scheduleRender();
    });
    row.querySelector('[data-field="file"]').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) setPanelPhoto(i, file);
      e.target.value = '';
    });
    for (const field of ['zoom', 'panX', 'panY']) {
      row.querySelector(`[data-field="${field}"]`).addEventListener('input', (e) => {
        panel[field] = Number(e.target.value);
        scheduleRender();
      });
    }
    row.querySelector('[data-act="flip"]').addEventListener('click', () => {
      panel.flip = !panel.flip;
      render();
    });
    row.querySelector('[data-act="to-all"]').addEventListener('click', () => {
      for (let j = 0; j < state.panels.length; j++) {
        if (j === i) continue;
        images[j] = images[i];
        state.panels[j].src = panel.src;
      }
      status(`Panel ${i + 1}'s photo now fills all six panels — re-crop each one freely.`);
      render();
    });
  });

  // ----- click the preview to set a panel's focal point ----------------------
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const L = coverLayout(canvas.width, canvas.height);
    const hit = L.panels.findIndex((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
    if (hit === -1) return;
    selected = hit;
    document.querySelectorAll('.panel-row').forEach((r) => r.classList.toggle('selected', Number(r.dataset.panel) === hit));
    const p = L.panels[hit];
    const panel = state.panels[hit];
    const fx = (x - p.x) / p.w;
    const fy = (y - p.y) / p.h;
    panel.fx = panel.flip ? 1 - fx : fx;
    panel.fy = fy;
    render();
  });

  // ----- QA hooks -------------------------------------------------------------
  window.GT = {
    state,
    images,
    render,
    selected: () => selected,
    setPanelPhoto,
    exportPNG: (sizeKey) => exportPNG(state, images, sizeKey),
  };

  render();
  return { render, status };
}
