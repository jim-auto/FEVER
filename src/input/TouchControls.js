/**
 * モバイル向けタッチ操作
 */
export class TouchControls {
  constructor(game) {
    this.game = game;
    this.enabled = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!this.enabled) return;

    this.lookTouchId = null;
    this.lookLast = { x: 0, y: 0 };
    this.joystickTouchId = null;
    this.joystickCenter = { x: 0, y: 0 };

    this.build();
    this.bind();
  }

  build() {
    const root = document.getElementById('ui-root');
    const el = document.createElement('div');
    el.id = 'touch-controls';
    el.className = 'touch-controls interactive';
    el.innerHTML = `
      <div class="touch-joystick" id="touch-joystick">
        <div class="touch-joystick__knob" id="touch-knob"></div>
      </div>
      <div class="touch-look" id="touch-look"></div>
      <div class="touch-buttons">
        <button class="touch-btn" id="touch-interact">E</button>
        <button class="touch-btn" id="touch-eyes">目</button>
        <button class="touch-btn" id="touch-breath">息</button>
      </div>
    `;
    root.appendChild(el);

    this.joystickEl = el.querySelector('#touch-joystick');
    this.knobEl = el.querySelector('#touch-knob');
    this.lookEl = el.querySelector('#touch-look');
  }

  bind() {
    const { game } = this;

    this.joystickEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this.joystickTouchId = t.identifier;
      const rect = this.joystickEl.getBoundingClientRect();
      this.joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }, { passive: false });

    this.lookEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this.lookTouchId = t.identifier;
      this.lookLast = { x: t.clientX, y: t.clientY };
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joystickTouchId) {
          e.preventDefault();
          const dx = t.clientX - this.joystickCenter.x;
          const dy = t.clientY - this.joystickCenter.y;
          const max = 40;
          const clamp = (v) => Math.max(-max, Math.min(max, v));
          const cx = clamp(dx);
          const cy = clamp(dy);
          this.knobEl.style.transform = `translate(${cx}px, ${cy}px)`;
          this.applyJoystick(cx, cy);
        }
        if (t.identifier === this.lookTouchId) {
          e.preventDefault();
          const mdx = t.clientX - this.lookLast.x;
          const mdy = t.clientY - this.lookLast.y;
          this.lookLast = { x: t.clientX, y: t.clientY };
          game.player.applyLookDelta(mdx, mdy);
        }
      }
    }, { passive: false });

    const endTouch = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joystickTouchId) {
          this.joystickTouchId = null;
          this.knobEl.style.transform = '';
          this.clearJoystick();
        }
        if (t.identifier === this.lookTouchId) {
          this.lookTouchId = null;
        }
      }
    };
    window.addEventListener('touchend', endTouch);
    window.addEventListener('touchcancel', endTouch);

    document.getElementById('touch-interact')?.addEventListener('click', () => game.tryInteract());

    const eyesBtn = document.getElementById('touch-eyes');
    eyesBtn?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!game.body.isEyesClosed()) game.body.closeEyes();
    }, { passive: false });
    eyesBtn?.addEventListener('touchend', () => game.body.openEyes());

    const breathBtn = document.getElementById('touch-breath');
    breathBtn?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      game.body.holdBreath(true);
    }, { passive: false });
    breathBtn?.addEventListener('touchend', () => game.body.holdBreath(false));
  }

  applyJoystick(dx, dy) {
    const threshold = 8;
    const keys = this.game.player.keys;
    keys.forward = dy < -threshold;
    keys.back = dy > threshold;
    keys.left = dx < -threshold;
    keys.right = dx > threshold;
  }

  clearJoystick() {
    const keys = this.game.player.keys;
    keys.forward = keys.back = keys.left = keys.right = false;
  }
}
