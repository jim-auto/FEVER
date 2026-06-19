export class BodyActions {
  constructor(game, ui) {
    this.game = game;
    this.ui = ui;
    this.eyesClosed = false;
    this.eyesClosedDuration = 0;
    this.breathHeld = false;
    this.lyingDown = false;
    this.coughCooldown = 0;
  }

  update(dt) {
    if (this.coughCooldown > 0) this.coughCooldown -= dt;
    if (this.eyesClosed) {
      this.eyesClosedDuration += dt;
    }
  }

  closeEyes() {
    if (this.eyesClosed) return;
    this.eyesClosed = true;
    this.eyesClosedDuration = 0;
    this.ui.showEyesClosed(true);
    this.game.onEyesClosedStart?.();
  }

  openEyes() {
    if (!this.eyesClosed) return;
    const duration = this.eyesClosedDuration;
    this.eyesClosed = false;
    this.eyesClosedDuration = 0;
    this.ui.showEyesClosed(false);
    this.game.onEyesOpened?.(duration);
  }

  holdBreath(start) {
    this.breathHeld = start;
    this.game.onBreathHeld?.(start);
  }

  cough() {
    if (this.coughCooldown > 0) return false;
    this.coughCooldown = 0.8;
    this.game.onCough?.();
    return true;
  }

  lieDown(start) {
    this.lyingDown = start;
    this.game.onLieDown?.(start);
  }

  drinkWater() {
    this.game.onDrinkWater?.();
  }

  isEyesClosed() {
    return this.eyesClosed;
  }

  isBreathHeld() {
    return this.breathHeld;
  }

  isLyingDown() {
    return this.lyingDown;
  }
}
