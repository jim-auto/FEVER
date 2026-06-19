import * as THREE from 'three';
import { applyAtmosphere, clearAtmosphere, createMaterialSet } from '../world/environment.js';

/**
 * MVP フィナーレ — 歩行病院の目撃
 */
export class FinaleScene {
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

    for (let i = 0; i < 12; i++) {
      const h = 3 + Math.random() * 6;
      const pole = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, h, 0.15),
        this.materials.concrete,
      );
      pole.position.set(-10 + i * 2, h / 2, -8 - Math.random() * 3);
      this.group.add(pole);
    }
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
    ui.showSubtitle({
      audio: 'あれが、病院だ。',
      duration: 3000,
    });
    await ui.wait(2500);
    this.phase = 1;
  }

  async onHospitalApproach() {
    if (this.phase >= 2) return;
    this.phase = 2;
    this.game.player.disable();

    const { ui } = this.game;
    ui.showSubtitle({
      audio: '病院が、立ち上がる。無数の廊下が脚になって、別の地区へ向かい始めた。',
      duration: 5500,
    });

    await ui.wait(2000);
    this.phase = 3;

    await ui.wait(4000);
    await ui.showPhoneDialog([
      { text: '（電話が鳴る）', pause: 1200 },
      { text: '受付', speaker: true, pause: 800 },
      { text: '「ご来院ありがとうございます」', pause: 2000 },
      { text: '「まだ着いていません」', pause: 1500 },
      { text: '「それはこちらでは確認できません」', pause: 2200 },
    ]);

    this.showEnding();
  }

  showEnding() {
    if (this.ended) return;
    this.ended = true;

    const overlay = document.createElement('div');
    overlay.className = 'start-screen interactive';
    overlay.innerHTML = `
      <h1>FEVER</h1>
      <p class="tagline">病院へ行く</p>
      <p style="margin-bottom:2rem;font-size:0.85rem;color:rgba(244,246,240,0.5);letter-spacing:0.15em;">
        MVP — 45分縦切りデモ（未完続き）
      </p>
      <button id="restart-btn">最初から</button>
      <p class="note">世界は、正常には戻らない</p>
    `;
    document.getElementById('ui-root').appendChild(overlay);
    overlay.querySelector('#restart-btn').addEventListener('click', () => {
      location.reload();
    });
  }

  checkCollision(pos) {
    return Math.abs(pos.x) < 12 && pos.z > -15 && pos.z < 12;
  }

  update(dt) {
    this.phaseTimer += dt;

    if (this.phase === 1) {
      const pos = this.game.player.getPosition();
      if (pos.z < 0) {
        this.onHospitalApproach();
      }
    }

    if (this.phase >= 3 && this.hospitalGroup) {
      this.hospitalGroup.position.x += dt * 2;
      this.hospitalGroup.position.z += dt * 3;
      this.hospitalGroup.rotation.y += dt * 0.08;
      for (const child of this.hospitalGroup.children) {
        if (child.geometry?.type === 'BoxGeometry' && child.position.y > 2) {
          child.position.y = 2.5 + Math.sin(this.phaseTimer * 4) * 0.1;
        }
      }
    }
  }

  unload() {
    clearAtmosphere(this.game.scene);
    this.game.scene.remove(this.group);
  }
}
