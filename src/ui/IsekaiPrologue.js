const PROLOGUE_LINES = [
  { text: '目が覚めた。', pause: 2200 },
  { text: '視界は白熱している。', pause: 2400 },
  { text: '耳鳴りの向こうに、蛍光灯の音だけがはっきりする。', pause: 2800 },
  { text: '……ここは、どこだ。', pause: 2600 },
];

const STATUS_ROWS = [
  ['転移先', '座標未確定（後に自宅と判明）'],
  ['体温', '40.2℃'],
  ['付与目的', '病院へ行く'],
  ['世界の前提', '一つだけ、間違っている'],
  ['警告', '住民は異常を異常として扱わない'],
];

function applyTransferState(state, ui) {
  state.patientTicket.location = '転移中';
  state.addFlag('isekai_transfer');
  ui.updatePatientTicket();
}

function showStatusPanel(el, state, ui, audio) {
  const statusEl = el.querySelector('.isekai-status');
  statusEl.innerHTML = `
    <p class="isekai-status__title">—— 転移 ——</p>
    ${STATUS_ROWS.map(([k, v]) =>
      `<div class="isekai-status__row"><span>${k}</span><span>${v}</span></div>`,
    ).join('')}
  `;
  statusEl.classList.add('visible');
  applyTransferState(state, ui);
  audio?.playHospitalMotif?.(0.45);
}

export async function runIsekaiPrologue(ui, state, audio) {
  if (ui.a11y.reducedMotion) {
    return runIsekaiPrologueReduced(ui, state, audio);
  }

  const el = createOverlay();
  ui.root.appendChild(el);
  let skipped = false;
  const skip = () => { skipped = true; };
  el.addEventListener('click', skip);

  audio?.playIsekaiTransfer?.();

  el.querySelector('.isekai-flash').classList.add('active');
  await ui.wait(900);
  if (skipped) {
    showStatusPanel(el, state, ui, audio);
    await ui.wait(400);
    return finish(el, ui);
  }

  const linesEl = el.querySelector('.isekai-lines');
  for (const line of PROLOGUE_LINES) {
    if (skipped) break;
    const p = document.createElement('p');
    p.className = 'isekai-line';
    p.textContent = line.text;
    linesEl.appendChild(p);
    await ui.wait(80);
    p.classList.add('visible');
    await ui.wait(line.pause);
  }

  if (!skipped) {
    showStatusPanel(el, state, ui, audio);
    await ui.wait(3200);
  } else {
    showStatusPanel(el, state, ui, audio);
    await ui.wait(400);
  }

  await finish(el, ui);
}

async function runIsekaiPrologueReduced(ui, state, audio) {
  const el = createOverlay();
  ui.root.appendChild(el);
  audio?.playIsekaiTransfer?.(true);

  const linesEl = el.querySelector('.isekai-lines');
  for (const line of PROLOGUE_LINES) {
    const p = document.createElement('p');
    p.className = 'isekai-line visible';
    p.textContent = line.text;
    linesEl.appendChild(p);
  }

  const statusEl = el.querySelector('.isekai-status');
  statusEl.innerHTML = `
    <p class="isekai-status__title">—— 転移 ——</p>
    ${STATUS_ROWS.map(([k, v]) =>
      `<div class="isekai-status__row"><span>${k}</span><span>${v}</span></div>`,
    ).join('')}
  `;
  statusEl.classList.add('visible');
  applyTransferState(state, ui);
  await ui.wait(2800);
  await finish(el, ui);
}

function createOverlay() {
  const el = document.createElement('div');
  el.className = 'isekai-prologue interactive';
  el.innerHTML = `
    <div class="isekai-flash"></div>
    <div class="isekai-vignette"></div>
    <div class="isekai-lines"></div>
    <div class="isekai-status"></div>
    <p class="isekai-skip-hint">クリックでスキップ</p>
  `;
  return el;
}

async function finish(el, ui) {
  el.classList.add('fade-out');
  await ui.wait(700);
  el.remove();
  await ui.fadeIn(400);
}
