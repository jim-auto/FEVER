import * as THREE from 'three';
import { Rule, temperatureToFloor, canAccessFloor } from '../core/GameState.js';
import {
  applyAtmosphere,
  clearAtmosphere,
  createMaterialSet,
  createInteractableMesh,
  addStairwellDetails,
} from '../world/environment.js';
import { createTextSprite, updateTextSprite } from '../world/textLabels.js';
import { CrosswalkScene } from './CrosswalkScene.js';
import { triggerReinterpret } from '../core/Reinterpret.js';

const LANDINGS = [
  { floor: '4.0', y: 6, zCenter: 0, zRange: [-1.2, 1.2] },
  { floor: '3.9', y: 3, zCenter: 5, zRange: [3.8, 6.2] },
  { floor: '3.8', y: 0, zCenter: 10, zRange: [8.8, 11.2] },
];

/**
 * 小数点階段 — 階数は体温で表される
 */
export class StairsScene {
  static audioPreset = 'stairs';

  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.materials = createMaterialSet();
    this.interactables = [];
    this.floorSigns = [];
    this.ruleDemonstrated = 0;
    this.npcTalked = false;
    this.handrailCooled = false;
    this.waterUsed = 0;
    this.blockedMsgCooldown = 0;
    this.blockCount = 0;
    this.reinterpreted = false;
  }

  load() {
    const { scene, state, ui } = this.game;
    applyAtmosphere(scene, 'stairs');
    scene.add(this.group);

    state.registerRule(new Rule({
      id: 'decimal_floor',
      premise: '階数は体温の小数点で表される',
      scope: 'local',
    }));

    state.patientTicket.location = `${temperatureToFloor(state.temperature)}階`;
    ui.updatePatientTicket();
    ui.updateFeverLayer(state.feverLayer);

    this.buildStairwell();
    this.buildInteractables();
    addStairwellDetails(this.group, this.materials, 2.4, 12);
    this.setupCallbacks();

    this.game.player.setPosition(0, 6 + 1.55, 0);
    this.game.player.enable();

    this.runIntro();
  }

  buildStairwell() {
    const w = 2.4;
    const h = 2.5;
    const totalLen = 12;

    const floorGeo = new THREE.PlaneGeometry(w, totalLen);
    const floor = new THREE.Mesh(floorGeo, this.materials.vinylFloor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.01, 5);
    this.group.add(floor);

    const wallMat = this.materials.wallPaper;
    const left = new THREE.Mesh(new THREE.PlaneGeometry(totalLen, h * 3), wallMat);
    left.position.set(-w / 2, h * 1.5, 5);
    left.rotation.y = Math.PI / 2;
    this.group.add(left);

    const right = new THREE.Mesh(new THREE.PlaneGeometry(totalLen, h * 3), wallMat);
    right.position.set(w / 2, h * 1.5, 5);
    right.rotation.y = -Math.PI / 2;
    this.group.add(right);

    for (const landing of LANDINGS) {
      const plat = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.08, 2.4),
        this.materials.vinylFloor,
      );
      plat.position.set(0, landing.y, landing.zCenter);
      this.group.add(plat);

      const sign = createTextSprite(`${landing.floor} 階`, { fontSize: 42, width: 220, height: 100 });
      sign.position.set(0, landing.y + 1.6, landing.zCenter - 1.0);
      this.group.add(sign);
      this.floorSigns.push({ sign, floor: landing.floor });

      const platEdge = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.04, 0.04, 2.44),
        this.materials.concrete,
      );
      platEdge.position.set(0, landing.y + 0.04, landing.zCenter);
      this.group.add(platEdge);
    }

    this.buildStairRamp(0, 5, 6, 3);
    this.buildStairRamp(5, 10, 3, 0);

    const handrail = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, 10),
      this.materials.plasticWhite,
    );
    handrail.position.set(-0.9, 4.5, 5);
    handrail.rotation.x = -Math.atan2(6, 10);
    handrail.userData = { id: 'handrail', interactable: false };
    this.group.add(handrail);
    this.handrail = handrail;
  }

  buildStairRamp(zStart, zEnd, yStart, yEnd) {
    const steps = 14;
    const w = 2.0;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const t2 = (i + 1) / steps;
      const z = THREE.MathUtils.lerp(zStart, zEnd, (t + t2) / 2);
      const y = THREE.MathUtils.lerp(yStart, yEnd, (t + t2) / 2);
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.06, (zEnd - zStart) / steps + 0.02),
        this.materials.plasticWhite,
      );
      step.position.set(0, y, z);
      this.group.add(step);
    }
  }

  buildInteractables() {
    const water = createInteractableMesh(
      new THREE.BoxGeometry(0.15, 0.25, 0.15),
      this.materials.glass,
      { id: 'water', label: '水を飲む' },
    );
    water.position.set(0.7, 6.2, 0.3);
    this.group.add(water);
    this.interactables.push(water);

    const npc = createInteractableMesh(
      new THREE.CylinderGeometry(0.25, 0.25, 1.6, 8),
      this.materials.plasticWhite,
      { id: 'resident', label: '住民に話しかける' },
    );
    npc.position.set(-0.6, 6.8, -0.4);
    this.group.add(npc);
    this.interactables.push(npc);

    const exitDoor = createInteractableMesh(
      new THREE.BoxGeometry(0.9, 1.9, 0.08),
      this.materials.door,
      { id: 'exit', label: '外へ出る' },
    );
    exitDoor.position.set(0, 0.95, 11.0);
    this.group.add(exitDoor);
    this.interactables.push(exitDoor);
  }

  setupCallbacks() {
    this.game.onDrinkWater = () => this.drinkWater();
    this.game.onBreathHeld = (held) => {
      if (!held) return;
      const pos = this.game.player.getPosition();
      if (pos.distanceTo(this.handrail.position) < 1.5 && !this.handrailCooled) {
        this.coolHandrail();
      }
    };
  }

  async runIntro() {
    await this.game.ui.wait(800);
    this.game.ui.showSubtitle({
      audio: '集合住宅の階段。案内板の数字が、小数点つきだ。',
      duration: 4500,
    });
    await this.game.ui.wait(3500);
    this.game.ui.showSubtitle({
      audio: `${temperatureToFloor(this.game.state.temperature)}階——体温と同じ数値が、階数になっている。`,
      duration: 5000,
    });
  }

  drinkWater() {
    const { state, ui } = this.game;
    this.game.audio.playWaterDrink();
    const prev = state.temperature;
    state.setTemperature(Math.max(37.0, prev - 0.4));
    this.waterUsed += 1;
    state.patientTicket.location = `${temperatureToFloor(state.temperature)}階`;
    ui.updatePatientTicket();
    ui.updateFeverLayer(state.feverLayer);

    const prevFloor = temperatureToFloor(prev);
    const newFloor = temperatureToFloor(state.temperature);
    if (prevFloor !== newFloor) {
      ui.showSubtitle({
        audio: `……${newFloor}階。体温が下がると、階数も下がる。`,
        duration: 4000,
      });
      this.game.state.getRule('decimal_floor')?.demonstrate();
      this.ruleDemonstrated += 1;
    } else {
      ui.showSubtitle({
        audio: '水の味は、子どもの頃の洗面所の匂いがする。',
        duration: 3000,
      });
    }
  }

  coolHandrail() {
    this.handrailCooled = true;
    const { state, ui } = this.game;
    state.setTemperature(Math.max(37.0, state.temperature - 0.25));
    state.patientTicket.location = `${temperatureToFloor(state.temperature)}階`;
    ui.updatePatientTicket();
    ui.updateFeverLayer(state.feverLayer);
    this.handrail.material.emissive = new THREE.Color(0x8ab0cc);
    this.handrail.material.emissiveIntensity = 0.2;
    ui.showSubtitle({
      audio: '手すりが冷たい。息を止めている間だけ、熱が移っていく。',
      duration: 4000,
    });
    this.game.state.getRule('decimal_floor')?.demonstrate();
  }

  getPlayerFloorLevel() {
    return parseFloat(temperatureToFloor(this.game.state.temperature));
  }

  getHeightForZ(z) {
    if (z <= 0) return 6;
    if (z >= 10) return 0;
    if (z <= 5) return 6 - (z / 5) * 3;
    return 3 - ((z - 5) / 5) * 3;
  }

  getRequiredFloorForZ(z) {
    if (z < 2.5) return 4.0;
    if (z < 7.5) return 3.9;
    return 3.8;
  }

  checkCollision(pos) {
    const w = 1.0;
    if (Math.abs(pos.x) > w) return false;

    const z = pos.z;
    if (z < -1.5 || z > 11.8) return false;

    const required = this.getRequiredFloorForZ(z);
    if (!canAccessFloor(this.game.state.temperature, required)) {
      if (this.blockedMsgCooldown <= 0) {
        this.blockedMsgCooldown = 2.5;
        this.blockCount += 1;
        this.showBlockedMessage(required);
        if (this.blockCount >= 4 && !this.reinterpreted) {
          this.reinterpreted = true;
          triggerReinterpret(this.game, 'stairs');
        }
      }
      return false;
    }

    return true;
  }

  showBlockedMessage(requiredFloor) {
    const { ui, state } = this.game;
    const current = temperatureToFloor(state.temperature);

    if (this.ruleDemonstrated < 1 && !this.npcTalked) {
      ui.showSubtitle({
        audio: `階段が、${current}度の人間を${requiredFloor}階へ下ろそうとしない。`,
        text: '身体を冷やせば、階数も下がる',
        duration: 5000,
      });
    } else {
      ui.showSubtitle({
        audio: `${requiredFloor}階へ下りるには、体温を${requiredFloor}以下にする必要がある。`,
        duration: 3500,
      });
    }
  }

  getNearestInteractable(playerPos) {
    let nearest = null;
    let minDist = 1.4;
    for (const obj of this.interactables) {
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
    const { ui, state } = this.game;
    const id = obj.userData.id;

    if (id === 'water') {
      this.drinkWater();
      return;
    }

    if (id === 'resident') {
      this.npcTalked = true;
      ui.showSubtitle({
        speaker: '住民',
        audio: '「今日は4.0階が混んでいる。3.9なら空いてるよ」',
        duration: 4500,
      });
      this.game.state.getRule('decimal_floor')?.demonstrate();
      return;
    }

    if (id === 'exit') {
      const playerPos = this.game.player.getPosition();
      if (!canAccessFloor(state.temperature, 3.8)) {
        ui.showSubtitle({
          audio: 'まだ3.8階まで下りきれていない。体温が高すぎる。',
          duration: 3500,
        });
        return;
      }
      if (playerPos.z < 9) {
        ui.showSubtitle({
          audio: '出口は、3.8階の踊り場にある。',
          duration: 3000,
        });
        return;
      }
      this.exitBuilding();
    }
  }

  async exitBuilding() {
    const { ui } = this.game;
    ui.showSubtitle({
      audio: '建物を出た。交差点の方から、信号の電子音が聞こえる。',
      duration: 3500,
    });
    await ui.wait(3000);
    this.game.changeScene(CrosswalkScene);
  }

  update(dt) {
    this.blockedMsgCooldown = Math.max(0, this.blockedMsgCooldown - dt);

    const pos = this.game.player.getPosition();
    const targetY = this.getHeightForZ(pos.z) + 1.55;
    this.game.player.camera.position.y = THREE.MathUtils.lerp(
      this.game.player.camera.position.y,
      targetY,
      0.15,
    );
    this.game.player.baseY = targetY;

    const currentFloor = temperatureToFloor(this.game.state.temperature);
    for (const { sign, floor } of this.floorSigns) {
      const active = floor === currentFloor;
      updateTextSprite(sign, active ? `${floor} 階 ←` : `${floor} 階`);
    }

    const nearest = this.getNearestInteractable(pos);
    if (nearest) {
      this.game.ui.showPrompt(`[E] ${nearest.userData.label}`);
    } else {
      this.game.ui.hidePrompt();
    }

    if (pos.z > 2 && !this.game.state.hasFlag('stairs_mid')) {
      this.game.state.addFlag('stairs_mid');
    }
  }

  unload() {
    clearAtmosphere(this.game.scene);
    this.game.scene.remove(this.group);
    this.game.onDrinkWater = null;
    this.game.onBreathHeld = null;
  }
}
