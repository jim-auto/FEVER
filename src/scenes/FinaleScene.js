import * as THREE from 'three';
import { applyAtmosphere, clearAtmosphere, createMaterialSet } from '../world/environment.js';
import { RECEPTION_CHOICES } from '../data/endings.js';

/**
 * フィナーレ — 歩行病院 → 受付の問い
 */
export class FinaleScene {
  static audioPreset = 'finale';

  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.materials = createMaterialSet();
    this.phase = 0;
    this.phaseTimer = 0;
    this.hospitalGroup = null;
    this.ended = false;
  }

  load() {
    const { scene, state, ui } = this.game;
    applyAtmosphere(scene, 'finale');
    scene.add(this.group);

    state.patientTicket.location = '病院が見える広場';
    ui.updatePatientTicket();

    this.buildPlaza();
    this.buildHospital();
    this.game.player.setPosition(0, 1.55, 5);
    this.game.player.enable();
    this.runSequence();
  }

  buildPlaza() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      this.materials.asphalt,
    );
    ground.rotation.x = -Math.PI / 2;
    this.group.add(ground);
  }

  buildHospital() {
    this.hospitalGroup = new THREE.Group();
    this.hospitalGroup.position.set(0, 0, -25);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(8, 3, 6),
      this.materials.plasticWhite,
    );
    body.position.y = 1.5;
    this.hospitalGroup.add(body);

    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 2.5, 0.4),
        this.materials.plasticWhite,
      );
      leg.position.set(-3 + i * 2, 2.5, 2);
      this.hospitalGroup.add(leg);
    }

    const cross = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.8, 0.1),
      this.materials.signalRed,
    );
    cross.position.set(0, 2.5, 3.05);
    this.hospitalGroup.add(cross);

    this.group.add(this.hospitalGroup);
  }

  async runSequence() {
    const { ui } = this.game;
    await ui.wait(1000);
    ui.showSubtitle({ audio: 'あれが、病院だ。', duration: 3000 });
    await ui.wait(2500);
    this.phase = 1;
  }

  async onHospitalApproach() {
    if (this.phase >= 2) return;
    this.phase = 2;
    this.game.player.disable();
    this.game.audio.playHospitalMotif(1.2);

    const { ui } = this.game;
    ui.showSubtitle({
      audio: '病院が、立ち上がる。無数の廊下が脚になって、別の地区へ向かい始めた。',
      duration: 5500,
    });

    await ui.wait(2000);
    this.phase = 3;
    await ui.wait(4000);

    this.game.audio.playPhoneRing();
    await ui.showPhoneDialog([
      { text: '（電話が鳴る）', pause: 1200 },
      { text: '受付', speaker: true, pause: 800 },
      { text: '「ご来院ありがとうございます」', pause: 2000 },
      { text: '「まだ着いていません」', pause: 1500 },
      { text: '「それはこちらでは確認できません」', pause: 2200 },
    ]);

    await this.showReceptionQuestion();
  }

  async showReceptionQuestion() {
    const { ui } = this.game;
    ui.showSubtitle({
      speaker: '受付',
      audio: '「本日、どの部分が来院しましたか」',
      duration: 5000,
    });
    await ui.wait(1500);

    const choice = await ui.showChoiceDialog(
      '本日、どの部分が来院しましたか',
      RECEPTION_CHOICES.map((c) => ({ id: c.id, label: c.label })),
    );

    const ending = RECEPTION_CHOICES.find((c) => c.id === choice);
    if (ending) this.applyEnding(ending);
  }

  applyEnding(ending) {
    if (this.ended) return;
    this.ended = true;

    const { state, ui } = this.game;
    Object.assign(state.patientTicket, ending.ticket);
    if (ending.ticket.temperature === '分離') {
      state.setTemperature(37.0);
      state.patientTicket.temperature = 37.0;
    }
    ui.updatePatientTicket();
    if (ending.hideObjective) ui.hideObjective();

    this.game.audio.playHospitalMotif(0.8);
    ui.showEnding({ title: ending.label, epilogue: ending.epilogue });
  }

  checkCollision(pos) {
    return Math.abs(pos.x) < 12 && pos.z > -15 && pos.z < 12;
  }

  update(dt) {
    this.phaseTimer += dt;
    if (this.phase === 1 && this.game.player.getPosition().z < 0) {
      this.onHospitalApproach();
    }
    if (this.phase >= 3 && this.hospitalGroup) {
      this.hospitalGroup.position.x += dt * 2;
      this.hospitalGroup.position.z += dt * 3;
      this.hospitalGroup.rotation.y += dt * 0.08;
    }
  }

  unload() {
    clearAtmosphere(this.game.scene);
    this.game.scene.remove(this.group);
  }
}
