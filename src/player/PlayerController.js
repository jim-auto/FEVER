import * as THREE from 'three';

export class PlayerController {
  constructor(camera, domElement, options = {}) {
    this.camera = camera;
    this.domElement = domElement;
    this.enabled = false;
    this.moveSpeed = options.moveSpeed ?? 2.2;
    this.lookSpeed = options.lookSpeed ?? 0.002;
    this.breathBob = options.breathBob ?? 0.012;
    this.reducedMotion = false;
    this.reducedShake = false;
    this.fixedFov = options.fixedFov ?? false;

    this.keys = { forward: false, back: false, left: false, right: false };
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.velocity = new THREE.Vector3();
    this.breathPhase = 0;
    this.baseY = 1.55;
    this.collisionRadius = 0.35;

    this._onKeyDown = this.onKeyDown.bind(this);
    this._onKeyUp = this.onKeyUp.bind(this);
    this._onMouseMove = this.onMouseMove.bind(this);
    this._onClick = this.onClick.bind(this);
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.domElement.requestPointerLock?.();
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    this.domElement.addEventListener('click', this._onClick);
  }

  disable() {
    this.enabled = false;
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    this.domElement.removeEventListener('click', this._onClick);
    document.exitPointerLock?.();
  }

  onClick() {
    if (this.enabled && document.pointerLockElement !== this.domElement) {
      this.domElement.requestPointerLock?.();
    }
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

  onMouseMove(e) {
    if (!this.enabled || document.pointerLockElement !== this.domElement) return;
    this.applyLookDelta(e.movementX, e.movementY);
  }

  applyLookDelta(mdx, mdy) {
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= mdx * this.lookSpeed;
    this.euler.x -= mdy * this.lookSpeed;
    this.euler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.euler.x));
    this.camera.quaternion.setFromEuler(this.euler);
  }

  setPosition(x, y, z) {
    this.camera.position.set(x, y ?? this.baseY, z);
  }

  lookAtPoint(x, z) {
    const pos = this.camera.position;
    const yaw = Math.atan2(x - pos.x, z - pos.z);
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y = yaw;
    this.euler.x = Math.max(-0.15, Math.min(0.15, this.euler.x));
    this.camera.quaternion.setFromEuler(this.euler);
  }

  getPosition() {
    return this.camera.position.clone();
  }

  getForward() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.y = 0;
    return dir.normalize();
  }

  update(dt, collisionFn) {
    if (!this.enabled) return;

    const forward = this.getForward();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

    this.velocity.set(0, 0, 0);
    if (this.keys.forward) this.velocity.add(forward);
    if (this.keys.back) this.velocity.sub(forward);
    if (this.keys.left) this.velocity.sub(right);
    if (this.keys.right) this.velocity.add(right);

    if (this.velocity.lengthSq() > 0) {
      this.velocity.normalize().multiplyScalar(this.moveSpeed * dt);
      const next = this.camera.position.clone().add(this.velocity);
      if (!collisionFn || collisionFn(next)) {
        this.camera.position.copy(next);
      }
    }

    if (!this.reducedMotion) {
      this.breathPhase += dt * 1.8;
      const bob = this.reducedShake ? 0 : Math.sin(this.breathPhase) * this.breathBob;
      this.camera.position.y = this.baseY + bob;
    }

    if (this.fixedFov) {
      this.camera.fov = 75;
      this.camera.updateProjectionMatrix();
    }
  }
}
