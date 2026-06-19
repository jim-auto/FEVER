import * as THREE from 'three';
import { createGameSystems } from './RuleEngine.js';
import { PlayerController } from '../player/PlayerController.js';
import { BodyActions } from '../player/BodyActions.js';
import { UIManager } from '../ui/UIManager.js';
import { AudioManager } from '../audio/AudioManager.js';
import { HomeScene } from '../scenes/HomeScene.js';

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    const { state, rules } = createGameSystems();
    this.state = state;
    this.rules = rules;
    this.ui = new UIManager(uiRoot, state);
    this.audio = new AudioManager();
    this.clock = new THREE.Clock();
    this.currentScene = null;
    this.running = false;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0c0e);
    this.scene.fog = new THREE.Fog(0x0a0c0e, 6, 14);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.05,
      50,
    );

    this.player = new PlayerController(this.camera, canvas);
    this.body = new BodyActions(this, this.ui);

    this.ui.onA11yChange = (a11y) => {
      this.player.reducedMotion = a11y.reducedMotion;
      this.player.reducedShake = a11y.reducedShake;
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
      if (ok) audio.playCough();
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
        this.body.holdBreath(true);
      }
      if (e.code === 'KeyC') this.body.cough();
      if (e.code === 'KeyX') this.body.lieDown(true);
      if (e.code === 'KeyE') this.tryInteract();
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.body.openEyes();
      }
      if (e.code === 'Space') this.body.holdBreath(false);
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

  start() {
    this.ui.onStart(() => {
      this.audio.unlock();
      this.loadScene(new HomeScene(this));
      this.running = true;
      this.tick();
    });
  }

  loadScene(scene) {
    if (this.currentScene) this.currentScene.unload();
    this.currentScene = scene;
    scene.load();
    this.ui.updateFeverLayer(this.state.feverLayer);
    const preset = scene.constructor.audioPreset;
    if (preset) {
      this.audio.setPreset(preset);
    }
  }

  changeScene(SceneClass) {
    this.clearSceneCallbacks();
    this.loadScene(new SceneClass(this));
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
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  tick() {
    if (!this.running) return;
    requestAnimationFrame(() => this.tick());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.body.update(dt);
    this.audio.update(dt, this.state, this.body);

    if (this.currentScene) {
      const collisionFn = this.currentScene.checkCollision?.bind(this.currentScene);
      if (!this.body.isEyesClosed()) {
        this.player.update(dt, collisionFn);
      }
      this.currentScene.update(dt);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
