import { createGameSystems } from '../core/RuleEngine.js';
import { Player2D } from './Player2D.js';
import { PixelRenderer } from './PixelRenderer.js';
import { BodyActions } from '../player/BodyActions.js';
import { UIManager } from '../ui/UIManager.js';
import { AudioManager } from '../audio/AudioManager.js';
import { TouchControls } from '../input/TouchControls.js';
import { SCREENSHOT_SCALE } from './viewConfig.js';
import { HomeScene2D } from './scenes/HomeScene2D.js';

export class Game2D {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.canvas.classList.add('pixel-mode');
    this.mode = '2d';

    const { state, rules } = createGameSystems();
    this.state = state;
    this.rules = rules;
    this.ui = new UIManager(uiRoot, state, { renderMode: '2d' });
    this.audio = new AudioManager();
    this.clock = { last: performance.now() };
    this.currentScene = null;
    this.running = false;

    this.renderer = new PixelRenderer(canvas);
    this.player = new Player2D(canvas);
    this.body = new BodyActions(this, this.ui);
    this.touch = new TouchControls(this);

    this.ui.onA11yChange = (a11y) => {
      this.player.reducedMotion = a11y.reducedMotion;
      this.audio.setReduced(a11y.reducedAudio);
      this.audio.setMuted(a11y.muted);
      this.audio.setTinnitus(a11y.tinnitus);
    };

    window.addEventListener('resize', () => this.onResize());
    this.bindInput();
    this.bindBodyAudio();
  }

  bindBodyAudio() {
    const { audio, body } = this;
    const origCough = body.cough.bind(body);
    body.cough = () => {
      const ok = origCough();
      if (ok) {
        audio.playCough();
        if (!this.ui.a11y.reducedShake) {
          this.renderer.shake(0.07, 0.22);
        }
      }
      return ok;
    };
  }

  bindInput() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (!this.body.isEyesClosed()) this.body.closeEyes();
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.body.isEyesClosed()) {
          this.body.openEyes();
        } else {
          this.body.holdBreath(true);
        }
      }
      if (e.code === 'KeyC') this.body.cough();
      if (e.code === 'KeyX') this.body.lieDown(true);
      if (e.code === 'KeyE') this.tryInteract();
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.body.openEyes();
      }
      if (e.code === 'Space' && !this.body.isEyesClosed()) {
        this.body.holdBreath(false);
      }
      if (e.code === 'KeyX') this.body.lieDown(false);
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.body.isEyesClosed()) {
        this.body.openEyes();
      }
    });
  }

  tryInteract() {
    if (!this.currentScene?.getNearestInteractable) return;
    const pos = this.player.getPosition();
    const target = this.currentScene.getNearestInteractable(pos);
    if (target) this.currentScene.interact(target);
  }

  start(options = {}) {
    if (options.demo) {
      this.startDemo();
      return;
    }
    this.ui.onStart(async () => {
      this.audio.unlock();
      this.canvas.classList.add('isekai-warp');
      await this.ui.fadeOut(500);
      await this.ui.runIsekaiPrologue(this.state, this.audio);
      this.canvas.classList.remove('isekai-warp');
      this.loadScene(new HomeScene2D(this));
      this.running = true;
      this.tick();
    });
  }

  /** README 用スクリーンショット — プロローグ省略 */
  startDemo() {
    document.body.dataset.demo = '1';
    document.body.classList.add('screenshot-capture');
    this.ui.startScreen.classList.add('hidden');
    this.state.patientTicket.location = '自宅';
    this.ui.updatePatientTicket();
    this.ui.setObjective('→ 前の机 · 電話に E');
    this.renderer.setFixedScale(SCREENSHOT_SCALE);
    this.onResize();
    this.loadScene(new HomeScene2D(this, { demo: true }));
    this.running = true;
    this.tick();
  }

  loadScene(scene) {
    if (this.currentScene) this.currentScene.unload();
    this.currentScene = scene;
    scene.load();
    this.ui.updateFeverLayer(this.state.feverLayer);
    this.renderer.setFeverLayer(this.state.feverLayer);
    const preset = scene.constructor.audioPreset;
    if (preset) this.audio.setPreset(preset);
  }

  changeScene(SceneClass) {
    this.transitionTo(() => {
      this.clearSceneCallbacks();
      this.loadScene(new SceneClass(this));
    });
  }

  async transitionTo(fn) {
    if (this.ui.a11y.reducedMotion) {
      fn();
      return;
    }
    await this.ui.fadeOut(550);
    fn();
    await this.ui.fadeIn(550);
  }

  clearSceneCallbacks() {
    this.onEyesOpened = null;
    this.onEyesClosedStart = null;
    this.onBreathHeld = null;
    this.onCough = null;
    this.onLieDown = null;
    this.onDrinkWater = null;
  }

  onResize() {
    this.renderer.resize();
  }

  tick() {
    if (!this.running) return;
    requestAnimationFrame(() => this.tick());

    const now = performance.now();
    const dt = Math.min((now - this.clock.last) / 1000, 0.05);
    this.clock.last = now;

    this.body.update(dt);
    this.audio.update(dt, this.state, this.body);
    this.renderer.updateShake(dt);

    if (this.currentScene) {
      const collisionFn = this.currentScene.checkCollision?.bind(this.currentScene);
      if (!this.body.isEyesClosed()) {
        this.player.update(dt, collisionFn);
      }
      this.currentScene.update(dt);
      this.render();
    }
  }

  render() {
    const { renderer, player, currentScene, body, state } = this;
    const pos = player.getPosition();
    renderer.setCamera(pos.x, pos.z);
    renderer.setFeverLayer(state.feverLayer);
    renderer.beginFrame();
    currentScene.render(renderer);

    if (!body.isEyesClosed()) {
      renderer.drawPlayer(pos.x, pos.z, {
        dir: player.dir,
        bob: player.getBob(),
        facing: player.facing,
        walkFrame: player.getWalkFrame(),
        moving: player.moving,
        lying: body.isLyingDown(),
      });
      renderer.drawParticles();

      const nearest = currentScene.getNearestInteractable?.(pos);
      if (nearest?.x != null && nearest?.z != null) {
        renderer.drawInteractMarker(nearest.x, nearest.z - 0.4);
      }
    }

    if (body.isBreathHeld()) {
      renderer.drawBreathHeldOverlay();
    }
    renderer.drawFeverOverlay();
    renderer.drawVignette();
    renderer.drawScanlines();
    if (state.patientTicket.location) {
      renderer.drawSceneTitle(state.patientTicket.location);
    }
    renderer.endFrame();
  }
}
