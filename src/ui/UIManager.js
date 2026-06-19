import { FeverLayer } from '../core/GameState.js';

const TICKET_FIELDS = [
  ['name', '氏名'],
  ['location', '現在地'],
  ['destination', '行き先'],
  ['temperature', '体温'],
  ['status', '身分'],
  ['appointment', '予約時刻'],
  ['companion', '付き添い'],
  ['reason', '来院理由'],
];

export class UIManager {
  constructor(rootEl, gameState) {
    this.root = rootEl;
    this.state = gameState;
    this.a11y = {
      reducedMotion: false,
      reducedShake: false,
      fixedSubtitles: true,
      showTextLayer: true,
      reducedTint: false,
      reducedAudio: false,
      muted: false,
      tinnitus: false,
    };
    this.subtitleTimeout = null;
    this.build();
  }

  build() {
    this.root.innerHTML = `
      <div class="objective-display">${this.state.objective}</div>
      <div class="thermometer-hud"><span class="temp-value">40.2</span><span class="unit">°C</span></div>
      <div class="fever-tint layer-white" id="fever-tint"></div>
      <div class="fever-vision" id="fever-vision"></div>
      <div class="scene-fade" id="scene-fade"></div>
      <div class="patient-ticket" id="patient-ticket"></div>
      <div class="subtitle-bar" id="subtitle-bar"></div>
      <div class="interaction-prompt" id="interaction-prompt"></div>
      <div class="eyes-closed-overlay" id="eyes-closed"><span class="hint">目を開ける — 左クリック</span></div>
      <div class="body-actions-hud">
        <div><kbd>Shift</kbd> 目を閉じる</div>
        <div><kbd>Space</kbd> 息を止める</div>
        <div><kbd>C</kbd> 咳をする</div>
        <div><kbd>X</kbd> 横になる</div>
        <div><kbd>E</kbd> 調べる / 使う</div>
      </div>
      <div class="a11y-panel interactive">
        <button class="a11y-toggle" id="a11y-toggle">表示設定</button>
        <div class="a11y-menu" id="a11y-menu">
          <label><input type="checkbox" id="a11y-motion" /> 動きを減らす</label>
          <label><input type="checkbox" id="a11y-shake" /> 揺れを減らす</label>
          <label><input type="checkbox" id="a11y-subtitles" checked /> 固定字幕</label>
          <label><input type="checkbox" id="a11y-text-layer" checked /> 字幕テキスト層</label>
          <label><input type="checkbox" id="a11y-tint" /> 発熱色調を弱める</label>
          <label><input type="checkbox" id="a11y-audio" /> 環境音を減らす</label>
          <label><input type="checkbox" id="a11y-mute" /> 環境音をオフ</label>
          <label><input type="checkbox" id="a11y-tinnitus" /> 耳鳴り（フィナーレ）</label>
        </div>
      </div>
      <div class="phone-overlay" id="phone-overlay">
        <div class="phone-dialog" id="phone-dialog"></div>
      </div>
      <div class="choice-overlay interactive" id="choice-overlay">
        <div class="choice-dialog" id="choice-dialog"></div>
      </div>
      <div class="start-screen interactive" id="start-screen">
        <h1>FEVER</h1>
        <p class="tagline">病院へ行く</p>
        <button id="start-btn">始める</button>
        <p class="note">WASD 移動 · マウス 視点 · Shift 目を閉じる</p>
      </div>
    `;

    this.ticketEl = this.root.querySelector('#patient-ticket');
    this.subtitleEl = this.root.querySelector('#subtitle-bar');
    this.promptEl = this.root.querySelector('#interaction-prompt');
    this.eyesEl = this.root.querySelector('#eyes-closed');
    this.phoneEl = this.root.querySelector('#phone-overlay');
    this.phoneDialog = this.root.querySelector('#phone-dialog');
    this.startScreen = this.root.querySelector('#start-screen');
    this.feverTint = this.root.querySelector('#fever-tint');
    this.feverVision = this.root.querySelector('#fever-vision');
    this.sceneFade = this.root.querySelector('#scene-fade');
    this.objectiveEl = this.root.querySelector('.objective-display');
    this.choiceEl = this.root.querySelector('#choice-overlay');
    this.choiceDialog = this.root.querySelector('#choice-dialog');
    this.tempEl = this.root.querySelector('.temp-value');

    this.bindA11y();
    this.updatePatientTicket();
    this.updateFeverLayer(FeverLayer.WHITE);
  }

  bindA11y() {
    const toggle = this.root.querySelector('#a11y-toggle');
    const menu = this.root.querySelector('#a11y-menu');
    toggle.addEventListener('click', () => menu.classList.toggle('open'));

    const bind = (id, key) => {
      this.root.querySelector(id).addEventListener('change', (e) => {
        this.a11y[key] = e.target.checked;
        document.body.classList.toggle('reduced-motion', this.a11y.reducedMotion);
        if (this.a11y.reducedMotion) {
          this.feverVision.style.opacity = '0';
        }
        if (key === 'reducedTint') {
          this.feverTint.style.opacity = e.target.checked ? '0.3' : '';
        }
        this.onA11yChange?.(this.a11y);
      });
    };

    bind('#a11y-motion', 'reducedMotion');
    bind('#a11y-shake', 'reducedShake');
    bind('#a11y-subtitles', 'fixedSubtitles');
    bind('#a11y-text-layer', 'showTextLayer');
    bind('#a11y-tint', 'reducedTint');
    bind('#a11y-audio', 'reducedAudio');
    bind('#a11y-mute', 'muted');
    bind('#a11y-tinnitus', 'tinnitus');
  }

  onStart(callback) {
    this.root.querySelector('#start-btn').addEventListener('click', () => {
      this.startScreen.classList.add('hidden');
      callback();
    });
  }

  updatePatientTicket() {
    const t = this.state.patientTicket;
    this.ticketEl.innerHTML = `
      <div class="patient-ticket__title">患者票</div>
      ${TICKET_FIELDS.map(([key, label]) => {
        const val = key === 'temperature' ? t[key].toFixed(1) : t[key];
        const red = key === 'appointment' && t[key] === '赤';
        return `<div class="patient-ticket__row">
          <span class="patient-ticket__label">${label}</span>
          <span class="patient-ticket__value${red ? ' patient-ticket__value--red' : ''}">${val}</span>
        </div>`;
      }).join('')}
    `;
    this.tempEl.textContent = t.temperature.toFixed(1);
  }

  updateFeverLayer(layer) {
    this.feverTint.className = `fever-tint layer-${layer}`;
    this.feverVision.className = `fever-vision layer-${layer}`;
  }

  hideObjective() {
    if (this.objectiveEl) {
      this.objectiveEl.style.opacity = '0';
      this.objectiveEl.style.transition = 'opacity 2s';
    }
  }

  showSubtitle({ speaker, audio, text, duration = 4000 }) {
    clearTimeout(this.subtitleTimeout);
    const textHidden = !this.a11y.showTextLayer || !text;
    this.subtitleEl.innerHTML = `
      ${speaker ? `<span class="speaker">${speaker}</span>` : ''}
      <span class="audio-layer">${audio ?? ''}</span>
      ${text ? `<span class="text-layer${textHidden ? ' hidden' : ''}">${text}</span>` : ''}
    `;
    this.subtitleEl.classList.add('visible');
    if (!this.a11y.fixedSubtitles) {
      this.subtitleTimeout = setTimeout(() => this.hideSubtitle(), duration);
    }
  }

  hideSubtitle() {
    this.subtitleEl.classList.remove('visible');
  }

  showPrompt(text) {
    this.promptEl.textContent = text;
    this.promptEl.classList.add('visible');
  }

  hidePrompt() {
    this.promptEl.classList.remove('visible');
  }

  showEyesClosed(show) {
    this.eyesEl.classList.toggle('active', show);
  }

  async showPhoneDialog(lines) {
    this.phoneEl.classList.add('active');
    this.phoneDialog.innerHTML = lines.map((l, i) =>
      `<div class="line ${l.speaker ? 'speaker' : ''}" data-i="${i}">${l.text}</div>`
    ).join('');

    for (let i = 0; i < lines.length; i++) {
      await this.wait(600);
      this.phoneDialog.querySelector(`[data-i="${i}"]`)?.classList.add('visible');
      await this.wait(lines[i].pause ?? 1200);
    }

    await this.wait(800);
    this.phoneEl.classList.remove('active');
  }

  wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  fadeOut(ms = 600) {
    return new Promise((resolve) => {
      this.sceneFade.classList.add('active');
      setTimeout(resolve, ms);
    });
  }

  fadeIn(ms = 600) {
    return new Promise((resolve) => {
      this.sceneFade.classList.remove('active');
      setTimeout(resolve, ms);
    });
  }

  showChoiceDialog(question, options) {
    return new Promise((resolve) => {
      this.choiceDialog.innerHTML = `
        <p class="question">${question}</p>
        <div class="choices">
          ${options.map((o) =>
            `<button class="choice-btn" data-id="${o.id}">${o.label}</button>`,
          ).join('')}
        </div>
      `;
      this.choiceEl.classList.add('active');
      this.choiceDialog.querySelectorAll('.choice-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.choiceEl.classList.remove('active');
          resolve(btn.dataset.id);
        });
      });
    });
  }

  showEnding({ title, epilogue }) {
    const overlay = document.createElement('div');
    overlay.className = 'start-screen interactive ending-screen';
    overlay.innerHTML = `
      <h1>FEVER</h1>
      <p class="ending-title">${title}</p>
      <p class="ending-epilogue">${epilogue}</p>
      <button id="restart-btn">最初から</button>
      <p class="note">病院へ行く</p>
    `;
    document.getElementById('ui-root').appendChild(overlay);
    overlay.querySelector('#restart-btn').addEventListener('click', () => {
      location.reload();
    });
  }
}
