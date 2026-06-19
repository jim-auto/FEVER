import * as THREE from 'three';
import { Rule } from '../core/GameState.js';
import { createMaterials, setupLighting, createInteractableMesh } from '../world/materials.js';
import { createTextSprite } from '../world/textLabels.js';
import { PharmacyScene } from './PharmacyScene.js';

const CROSSWALK_Z = 0;
const BLOCK_Z = -0.3;

/**
 * 赤い予定交差点 — 赤い予定は横断歩道を渡れない
 */
export class CrosswalkScene {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.materials = createMaterials();
    this.interactables = [];
    this.crosswalkStripes = [];
    this.scheduleState = 'red';
    this.blockCooldown = 0;
    this.feverAttempted = false;
    this.demoPhase = 0;
    this.demoTimer = 0;
    this.officeWorker = null;
    this.officeWorkerPhase = 'idle';
    this.childDemoDone = false;
    this.crossed = false;
    this.sunsetTimer = 0;
    this.isSunset = false;
  }

  load() {
    const { scene, state, ui } = this.game;
    scene.background = new THREE.Color(0x889098);
    scene.fog = new THREE.Fog(0x889098, 12, 35);
    scene.add(this.group);
    setupLighting(scene);

    state.registerRule(new Rule({
      id: 'red_schedule',
      premise: '赤い予定は横断歩道を渡れない',
      scope: 'local',
    }));

    state.patientTicket.location = '赤い予定交差点';
    state.patientTicket.appointment = '赤';
    ui.updatePatientTicket();

    this.buildIntersection();
    this.buildInteractables();
    this.buildNPCs();

    this.game.player.setPosition(-2, 1.55, -7);
    this.game.player.enable();

    this.runIntro();
  }

  buildIntersection() {
    const roadW = 10;
    const roadD = 20;

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(roadW, roadD),
      this.materials.asphalt,
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, 0);
    this.group.add(road);

    for (let i = -3; i <= 3; i++) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.02, 2.2),
        this.materials.crosswalk,
      );
      stripe.position.set(i * 0.9, 0.02, CROSSWALK_Z);
      stripe.rotation.y = 0.15;
      this.group.add(stripe);
      this.crosswalkStripes.push(stripe);
    }

    const sidewalkS = new THREE.Mesh(
      new THREE.PlaneGeometry(roadW, 6),
      this.materials.vinylFloor,
    );
    sidewalkS.rotation.x = -Math.PI / 2;
    sidewalkS.position.set(0, 0.01, -6);
    this.group.add(sidewalkS);

    const sidewalkN = new THREE.Mesh(
      new THREE.PlaneGeometry(roadW, 6),
      this.materials.vinylFloor,
    );
    sidewalkN.rotation.x = -Math.PI / 2;
    sidewalkN.position.set(0, 0.01, 6);
    this.group.add(sidewalkN);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 3.2, 8),
      this.materials.plasticWhite,
    );
    pole.position.set(3.5, 1.6, -2);
    this.group.add(pole);

    this.signalRed = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      this.materials.signalRed,
    );
    this.signalRed.position.set(3.5, 2.8, -2);
    this.group.add(this.signalRed);

    this.signalGreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      this.materials.signalGreen,
    );
    this.signalGreen.position.set(3.5, 2.35, -2);
    this.signalGreen.visible = false;
    this.group.add(this.signalGreen);

    const sign = createTextSprite('赤い予定は渡れません', {
      fontSize: 28,
      width: 340,
      height: 80,
      color: '#2a2e32',
    });
    sign.position.set(3.5, 3.4, -2);
    sign.scale.set(1.2, 0.5, 1);
    this.group.add(sign);
  }

  buildInteractables() {
    const signal = createInteractableMesh(
      new THREE.BoxGeometry(0.4, 0.5, 0.4),
      this.materials.plasticWhite,
      { id: 'signal', label: '信号機に話しかける' },
    );
    signal.position.set(3.5, 2.5, -2);
    this.group.add(signal);
    this.interactables.push(signal);

    const laundry = createInteractableMesh(
      new THREE.BoxGeometry(0.7, 1.1, 0.6),
      this.materials.plasticWhite,
      { id: 'laundry', label: '予定表を洗う（コインランドリー）' },
    );
    laundry.position.set(-4, 0.55, -4);
    this.group.add(laundry);
    this.interactables.push(laundry);

    const emergency = createInteractableMesh(
      new THREE.BoxGeometry(0.5, 1.3, 0.4),
      this.materials.wood,
      { id: 'emergency', label: '赤を「緊急」として登録' },
    );
    emergency.position.set(4, 0.65, -4);
    this.group.add(emergency);
    this.interactables.push(emergency);

    const bench = createInteractableMesh(
      new THREE.BoxGeometry(1.2, 0.5, 0.4),
      this.materials.wood,
      { id: 'bench', label: 'ベンチで待つ（日が暮れるまで）' },
    );
    bench.position.set(-1, 0.25, -5);
    this.group.add(bench);
    this.interactables.push(bench);

    const schedule = createInteractableMesh(
      new THREE.BoxGeometry(0.2, 0.28, 0.02),
      this.materials.scheduleRed,
      { id: 'schedule', label: '自分の予定表を見る' },
    );
    schedule.position.set(-2.2, 1.3, -6.5);
    this.group.add(schedule);
    this.interactables.push(schedule);
  }

  buildNPCs() {
    this.officeWorker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 1.7, 8),
      this.materials.plasticWhite,
    );
    this.officeWorker.position.set(1.5, 0.85, -3);
    this.group.add(this.officeWorker);

    const workerSchedule = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.2, 0.02),
      this.materials.scheduleRed,
    );
    workerSchedule.position.set(1.7, 1.5, -3);
    this.group.add(workerSchedule);
    this.workerSchedule = workerSchedule;

    this.child = createInteractableMesh(
      new THREE.CylinderGeometry(0.15, 0.15, 1.0, 8),
      this.materials.plasticWhite,
      { id: 'child', label: '子どもを見る' },
    );
    this.child.position.set(-3, 0.5, -2.5);
    this.group.add(this.child);
    this.interactables.push(this.child);
  }

  canCross() {
    return this.scheduleState !== 'red';
  }

  async runIntro() {
    const { ui } = this.game;
    await ui.wait(1000);
    ui.showSubtitle({
      audio: '交差点。信号機が、予定表を審査している。',
      duration: 4500,
    });
    await ui.wait(4000);
    this.startOfficeWorkerDemo();
  }

  startOfficeWorkerDemo() {
    this.officeWorkerPhase = 'approach';
    this.demoPhase = 1;
    this.game.ui.showSubtitle({
      speaker: '会社員',
      audio: '「遅刻する——予定が赤くなった」',
      duration: 3500,
    });
    this.game.state.getRule('red_schedule')?.demonstrate();
  }

  updateOfficeWorkerDemo(dt) {
    if (this.officeWorkerPhase === 'approach') {
      this.officeWorker.position.z += dt * 1.2;
      if (this.officeWorker.position.z >= CROSSWALK_Z - 0.5) {
        this.officeWorkerPhase = 'blocked';
        this.officeWorker.position.z = CROSSWALK_Z - 0.8;
        this.game.ui.showSubtitle({
          speaker: '信号機',
          audio: '「赤い予定は渡れません」',
          duration: 3500,
        });
        this.officeWorkerPhase = 'retreat';
      }
    } else if (this.officeWorkerPhase === 'retreat') {
      this.demoTimer += dt;
      if (this.demoTimer > 2) {
        this.officeWorker.position.z -= dt * 0.8;
        if (this.officeWorker.position.z < -3) {
          this.officeWorkerPhase = 'done';
          this.runChildDemo();
        }
      }
    }
  }

  async runChildDemo() {
    if (this.childDemoDone) return;
    this.childDemoDone = true;
    await this.game.ui.wait(1500);
    this.game.ui.showSubtitle({
      speaker: '子ども',
      audio: '「シール、剥がせばいいんでしょ」',
      duration: 3000,
    });
    await this.game.ui.wait(2500);
    this.workerSchedule.visible = false;
    this.straightenCrosswalk(0.6);
    this.game.ui.showSubtitle({
      audio: '子どもが赤いシールを剥がすと、横断歩道がまっすぐになった。',
      duration: 4000,
    });
    await this.game.ui.wait(3500);
    this.warpCrosswalk(0.15);
    this.game.state.getRule('red_schedule')?.demonstrate();
    this.game.ui.showSubtitle({
      audio: '……自分の予定表も、赤い。Patient票の「予約時刻」が赤になっている。',
      duration: 5000,
    });
  }

  straightenCrosswalk(t) {
    for (const stripe of this.crosswalkStripes) {
      stripe.rotation.y = THREE.MathUtils.lerp(0.15, 0, t);
    }
  }

  warpCrosswalk(amount) {
    for (const stripe of this.crosswalkStripes) {
      stripe.rotation.y = amount;
    }
  }

  openCrosswalk() {
    this.straightenCrosswalk(1);
    this.signalRed.visible = false;
    this.signalGreen.visible = true;
  }

  tryFeverExcuse() {
    if (this.feverAttempted) return;
    this.feverAttempted = true;
    const { ui } = this.game;
    ui.showSubtitle({
      speaker: 'あなた',
      audio: '「熱があります」',
      duration: 2000,
    });
    setTimeout(() => {
      ui.showSubtitle({
        speaker: '信号機',
        audio: '「熱は色ではありません。まだ」',
        duration: 4000,
      });
    }, 2200);
  }

  washSchedule() {
    const { state, ui, rules } = this.game;
    this.scheduleState = 'washed';
    state.patientTicket.appointment = '——';
    ui.updatePatientTicket();
    rules.acceptInterpretation('red_schedule', 'wash', {
      effect: 'appointment_time_lost',
      message: '予約時間そのものが消えた',
    });
    this.openCrosswalk();
    ui.showSubtitle({
      audio: '洗濯機の中で、赤が水に溶けていく。予定表から、時刻そのものが落ちた。',
      duration: 5000,
    });
  }

  registerEmergency() {
    const { state, ui, rules } = this.game;
    this.scheduleState = 'emergency';
    state.patientTicket.appointment = '緊急';
    state.setClassification('救急車');
    ui.updatePatientTicket();
    rules.acceptInterpretation('red_schedule', 'emergency', {
      effect: 'classified_as_emergency',
      message: '赤は緊急の色として受理された',
    });
    this.openCrosswalk();
    ui.showSubtitle({
      audio: '「赤」は予定ではなく、緊急の色として登録された。横断歩道は、救急車を通す。',
      duration: 5000,
    });
  }

  async waitForSunset() {
    const { ui } = this.game;
    this.game.player.disable();
    ui.showSubtitle({
      audio: 'ベンチに座る。日が、ゆっくり落ちていく。',
      duration: 3500,
    });
    await ui.wait(2000);
    this.isSunset = true;
    this.game.scene.background = new THREE.Color(0x4a5060);
    this.game.scene.fog.color.set(0x4a5060);
    await ui.wait(3000);
    this.scheduleState = 'faded';
    this.game.state.patientTicket.appointment = '判別不能';
    ui.updatePatientTicket();
    this.game.rules.acceptInterpretation('red_schedule', 'sunset', {
      effect: 'color_unreadable',
      message: '日暮れで色が判別できなくなった',
    });
    this.openCrosswalk();
    ui.showSubtitle({
      audio: '紙の色が、もう判別できない。信号機は、しばらく黙っている。',
      duration: 4500,
    });
    this.game.player.enable();
  }

  checkCollision(pos) {
    if (Math.abs(pos.x) > 5) return false;
    if (pos.z < -9 || pos.z > 10) return false;

    if (!this.canCross() && pos.z > BLOCK_Z) {
      if (this.blockCooldown <= 0) {
        this.blockCooldown = 2;
        this.game.ui.showSubtitle({
          speaker: '信号機',
          audio: '「赤い予定は渡れません」',
          duration: 3000,
        });
        if (!this.feverAttempted) {
          this.tryFeverExcuse();
        }
      }
      return false;
    }

    return true;
  }

  getNearestInteractable(playerPos) {
    let nearest = null;
    let minDist = 1.8;
    for (const obj of this.interactables) {
      if (obj.userData.id === 'laundry' && this.scheduleState !== 'red') continue;
      if (obj.userData.id === 'emergency' && this.scheduleState !== 'red') continue;
      if (obj.userData.id === 'bench' && this.scheduleState !== 'red') continue;

      const worldPos = new THREE.Vector3();
      obj.getWorldPosition(worldPos);
      const dist = playerPos.distanceTo(worldPos);
      if (dist < minDist) {
        minDist = dist;
        nearest = obj;
      }
    }
    return nearest;
  }

  interact(obj) {
    const { ui } = this.game;
    const id = obj.userData.id;

    if (id === 'signal') {
      if (this.scheduleState === 'red') {
        ui.showSubtitle({
          speaker: '信号機',
          audio: '「赤い予定は渡れません。色を変えるか、意味を変えてください」',
          duration: 4500,
        });
      } else {
        ui.showSubtitle({
          speaker: '信号機',
          audio: '「……通過を、受理します」',
          duration: 3000,
        });
      }
      return;
    }

    if (id === 'schedule') {
      ui.showSubtitle({
        audio: '予定表の「15:00」が、赤いシールで覆われている。Patient票の予約時刻も、同じ赤だ。',
        duration: 4500,
      });
      return;
    }

    if (id === 'laundry' && this.scheduleState === 'red') {
      this.washSchedule();
      return;
    }

    if (id === 'emergency' && this.scheduleState === 'red') {
      this.registerEmergency();
      return;
    }

    if (id === 'bench' && this.scheduleState === 'red') {
      this.waitForSunset();
      return;
    }

    if (id === 'child' && !this.childDemoDone) {
      this.runChildDemo();
    }
  }

  update(dt) {
    this.blockCooldown = Math.max(0, this.blockCooldown - dt);

    if (this.demoPhase === 1) {
      this.updateOfficeWorkerDemo(dt);
    }

    const pos = this.game.player.getPosition();

    if (this.canCross() && pos.z > 3 && !this.crossed) {
      this.crossed = true;
      this.exitArea();
    }

    const nearest = this.getNearestInteractable(pos);
    if (nearest && !this.crossed) {
      this.game.ui.showPrompt(`[E] ${nearest.userData.label}`);
    } else if (!this.crossed) {
      this.game.ui.hidePrompt();
    }

    if (this.isSunset && this.signalRed) {
      this.signalRed.material.emissiveIntensity = 0.2 + Math.sin(Date.now() * 0.002) * 0.1;
    }
  }

  async exitArea() {
    const { ui } = this.game;
    ui.showSubtitle({
      audio: '横断歩道を渡った。向こう側の街路に、薬局の看板が見える。',
      duration: 3500,
    });
    this.game.state.patientTicket.location = '商店街北';
    ui.updatePatientTicket();
    await ui.wait(3000);
    this.game.changeScene(PharmacyScene);
  }

  unload() {
    this.game.scene.remove(this.group);
    this.game.scene.background = new THREE.Color(0x0a0c0e);
    this.game.scene.fog = new THREE.Fog(0x0a0c0e, 6, 14);
  }
}
