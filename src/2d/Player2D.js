import { createPos } from './utils.js';
import { facingFromDelta } from './sprites.js';

export class Player2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.enabled = false;
    this.moveSpeed = 2.2;
    this.reducedMotion = false;
    this.baseY = 0;
    this.lockVertical = false;
    this.pos = createPos(0, 0, 0.5);
    this.dir = 0;
    this.facing = 'down';
    this.breathPhase = 0;
    this.walkPhase = 0;
    this.moving = false;
    this.keys = { forward: false, back: false, left: false, right: false };

    this._onKeyDown = this.onKeyDown.bind(this);
    this._onKeyUp = this.onKeyUp.bind(this);
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  disable() {
    this.enabled = false;
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.moving = false;
  }

  onKeyDown(e) {
    if (!this.enabled) return;
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
      case 'KeyS': case 'ArrowDown': this.keys.back = true; break;
      case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
      case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
      default: break;
    }
  }

  onKeyUp(e) {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
      case 'KeyS': case 'ArrowDown': this.keys.back = false; break;
      case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
      case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
      default: break;
    }
  }

  setPosition(x, y, z) {
    this.pos.x = x;
    this.pos.y = y ?? this.baseY;
    this.pos.z = z ?? this.pos.z;
  }

  lookAtPoint(x, z) {
    const dx = x - this.pos.x;
    const dz = z - this.pos.z;
    this.facing = facingFromDelta(dx, dz);
    this.dir = Math.atan2(dx, dz);
  }

  getPosition() {
    return this.pos;
  }

  update(dt, collisionFn) {
    if (!this.enabled) return;

    let dx = 0;
    let dz = 0;
    if (this.keys.forward) dz -= 1;
    if (this.keys.back) dz += 1;
    if (this.keys.left) dx -= 1;
    if (this.keys.right) dx += 1;

    this.moving = dx !== 0 || dz !== 0;

    if (this.moving) {
      const len = Math.sqrt(dx * dx + dz * dz);
      dx /= len;
      dz /= len;
      this.facing = facingFromDelta(dx, dz);
      this.dir = Math.atan2(dx, dz);
      this.walkPhase += dt * 8;

      const step = this.moveSpeed * dt;
      const next = createPos(this.pos.x + dx * step, this.pos.y, this.pos.z + dz * step);
      if (!collisionFn || collisionFn(next)) {
        this.pos.x = next.x;
        this.pos.z = next.z;
      }
    }

    if (!this.reducedMotion) {
      this.breathPhase += dt * 1.8;
    }
  }

  getBob() {
    return this.reducedMotion ? 0 : Math.sin(this.breathPhase) * 0.5;
  }

  getWalkFrame() {
    return Math.floor(this.walkPhase) % 2;
  }
}
