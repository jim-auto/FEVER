import * as THREE from 'three';
import { Rule, FeverLayer } from '../core/GameState.js';
import {
  applyAtmosphere,
  clearAtmosphere,
  createMaterialSet,
  createInteractableMesh,
  addPharmacyDecor,
} from '../world/environment.js';
import { createTextSprite } from '../world/textLabels.js';
import { NurseStreetScene } from './NurseStreetScene.js';
import { triggerReinterpret } from '../core/Reinterpret.js';

const MEDICINES = {
  antipyretic: { label: '解熱剤', temp: 38.0, status: '患者', cost: '発汗' },
  sudorific: { label: '発汗剤', temp: 40.5, status: '訪問者', cost: '悪寒' },
  outside: { label: '「外」', temp: null, status: null, cost: '一時間' },
};

/**
 * 移動薬局「さむけ」— 出口そのものが商品
 */
export class PharmacyScene {
  static audioPreset = 'pharmacy';

  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.materials = createMaterialSet();
    this.interactables = [];
    this.shelfGroup = new THREE.Group();
    this.shelfAngle = 0;
    this.outsideMesh = null;
    this.boughtOutside = false;
    this.boughtMedicine = false;
    this.exited = false;
    this.blockCooldown = 0;
    this.blockCount = 0;
    this.reinterpreted = false;
  }

  load() {
    const { scene, state, ui } = this.game;
    applyAtmosphere(scene, 'pharmacy');
    scene.add(this.group);

    state.registerRule(new Rule({
      id: 'pharmacy_exit',
      premise: '薬局の出口は商品として陳列される',
      scope: 'local',
    }));

    state.patientTicket.location = '移動薬局「さむけ」';
    ui.updatePatientTicket();

    this.buildPharmacy();
    addPharmacyDecor(this.group, this.materials);
    this.game.player.setPosition(0, 1.55, 0);
    this.game.player.enable();
    this.runIntro();
  }

  buildPharmacy() {
    const r = 4;
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(r, 32),
      this.materials.vinylFloor,
    );
    floor.rotation.x = -Math.PI / 2;
    this.group.add(floor);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 2.4, 2.2),
        this.materials.plasticWhite,
      );
      wall.position.set(Math.cos(a) * r, 1.2, Math.sin(a) * r);
      wall.rotation.y = -a;
      this.group.add(wall);
    }

    const sign = createTextSprite('さむけ', { fontSize: 52, width: 200, height: 100 });
    sign.position.set(0, 2.2, -3.2);
    this.group.add(sign);

    this.group.add(this.shelfGroup);
    this.buildShelfItem('antipyretic', -1.2, 1.0, -2.5);
    this.buildShelfItem('sudorific', 1.2, 1.0, -2.5);
    this.buildShelfItem('outside', 0, 1.2, -3.0);

    this.door = createInteractableMesh(
      new THREE.BoxGeometry(1.0, 2.0, 0.1),
      this.materials.door,
      { id: 'door', label: '外へ出る' },
    );
    this.door.position.set(0, 1.0, 3.5);
    this.door.visible = false;
    this.group.add(this.door);

    const counter = createInteractableMesh(
      new THREE.BoxGeometry(1.8, 0.9, 0.6),
      this.materials.wood,
      { id: 'pharmacist', label: '薬剤師に話す' },
    );
    counter.position.set(0, 0.45, 1.5);
    this.group.add(counter);
    this.interactables.push(counter);
  }

  buildShelfItem(id, x, y, z) {
    const data = MEDICINES[id];
    const mesh = createInteractableMesh(
      new THREE.BoxGeometry(0.35, 0.45, 0.2),
      id === 'outside' ? this.materials.glass : this.materials.plasticWhite,
      { id: `med_${id}`, label: `${data.label}を買う（代金：${data.cost}）` },
    );
    mesh.position.set(x, y, z);
    this.shelfGroup.add(mesh);
    this.interactables.push(mesh);
    if (id === 'outside') {
      mesh.material = mesh.material.clone();
      mesh.material.emissive = new THREE.Color(0x88ccff);
      mesh.material.emissiveIntensity = 0.4;
      this.outsideMesh = mesh;
    }
  }

  async runIntro() {
    await this.game.ui.wait(800);
    this.game.ui.showSubtitle({
      audio: '薬局の棚が、ゆっくり自分の周りを回っている。',
      duration: 4000,
    });
    await this.game.ui.wait(3500);
    this.game.ui.showSubtitle({
      speaker: '薬剤師',
      audio: '「出口をご希望の方は、商品棚をご確認ください」',
      duration: 4500,
    });
    this.game.state.getRule('pharmacy_exit')?.demonstrate();
    this.game.ui.setObjective('回転棚の「外」を買う → 出口');
  }

  buyMedicine(id) {
    const { state, ui, rules } = this.game;
    const med = MEDICINES[id];
    const rule = state.getRule('pharmacy_exit');

    if (id === 'outside') {
      if (this.boughtOutside) return;
      this.boughtOutside = true;
      state.addFlag('bought_outside');
      state.patientTicket.companion = '一時間';
      ui.updatePatientTicket();
      rules.acceptInterpretation('pharmacy_exit', 'buy_outside', {
        effect: 'exit_unlocked',
        cost: 'unused_hour',
      });
      this.door.visible = true;
      rule?.demonstrate();
      ui.resetObjective();
      ui.showSubtitle({
        audio: '「外」を受け取った。使っていない一時間が、代金として消えた。',
        duration: 4500,
      });
      return;
    }

    if (this.boughtMedicine) {
      ui.showSubtitle({
        speaker: '薬剤師',
        audio: '「お一人様、一剤までです」',
        duration: 3000,
      });
      return;
    }

    this.boughtMedicine = true;
    if (med.temp !== null) state.setTemperature(med.temp);
    if (med.status) state.setClassification(med.status);
    ui.updatePatientTicket();
    ui.updateFeverLayer(state.feverLayer);
    rule?.demonstrate();

    const layerNames = {
      [FeverLayer.LOW]: '微熱層',
      [FeverLayer.CHILL]: '悪寒層',
      [FeverLayer.HEAT]: '熱層',
      [FeverLayer.WHITE]: '白熱層',
    };
    ui.showSubtitle({
      audio: `${med.label}を飲んだ。世界が${layerNames[state.feverLayer] ?? ''}へ切り替わる。`,
      duration: 5000,
    });
  }

  checkCollision(pos) {
    const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    if (dist > 3.6) return false;
    if (!this.boughtOutside && pos.z > 2.8) {
      if (this.blockCooldown <= 0) {
        this.blockCooldown = 2.5;
        this.blockCount += 1;
        this.game.ui.showSubtitle({
          speaker: '薬剤師',
          audio: '「外へは、商品として購入ください」',
          duration: 3500,
        });
        if (this.blockCount >= 3 && !this.reinterpreted) {
          this.reinterpreted = true;
          triggerReinterpret(this.game, 'pharmacy');
        }
      }
      return false;
    }
    return true;
  }

  getNearestInteractable(playerPos) {
    let nearest = null;
    let minDist = 1.6;
    for (const obj of this.interactables) {
      if (obj.userData.id?.startsWith('med_outside') && this.boughtOutside) continue;
      if (obj.userData.id?.startsWith('med_') && obj.userData.id !== 'med_outside' && this.boughtMedicine) continue;

      const worldPos = new THREE.Vector3();
      obj.getWorldPosition(worldPos);
      const dist = playerPos.distanceTo(worldPos);
      if (dist < minDist) {
        minDist = dist;
        nearest = obj;
      }
    }
    if (this.boughtOutside && this.door.visible) {
      const dPos = new THREE.Vector3();
      this.door.getWorldPosition(dPos);
      if (playerPos.distanceTo(dPos) < 1.6) return this.door;
    }
    return nearest;
  }

  interact(obj) {
    const id = obj.userData.id;
    if (id === 'pharmacist') {
      this.game.ui.showSubtitle({
        speaker: '薬剤師',
        audio: this.boughtOutside
          ? '「ご利用ありがとうございました。外は右奥に陳列してあります」'
          : '「薬より先に、出口をお求めですか？ それも商品です」',
        duration: 4000,
      });
      return;
    }
    if (id === 'door') {
      this.exitPharmacy();
      return;
    }
    if (id.startsWith('med_')) {
      this.buyMedicine(id.replace('med_', ''));
    }
  }

  async exitPharmacy() {
    if (this.exited) return;
    this.exited = true;
    const { ui } = this.game;
    ui.showSubtitle({
      audio: '薬局を出た。通りの向こうに、異様に長い影が落ちている。',
      duration: 4000,
    });
    await ui.wait(3500);
    this.game.changeScene(NurseStreetScene);
  }

  update(dt) {
    this.blockCooldown = Math.max(0, this.blockCooldown - dt);
    this.shelfAngle += dt * 0.15;
    this.shelfGroup.rotation.y = this.shelfAngle;

    if (this.outsideMesh && !this.boughtOutside) {
      const pulse = 0.32 + Math.sin(Date.now() * 0.002) * 0.18;
      this.outsideMesh.material.emissiveIntensity = pulse;
    }

    const pos = this.game.player.getPosition();
    if (!this.boughtOutside && pos.z > 2.2 && !this.game.state.hasFlag('pharmacy_blocked')) {
      this.game.state.addFlag('pharmacy_blocked');
    }

    const nearest = this.getNearestInteractable(pos);
    if (nearest && !this.exited) {
      this.game.ui.showPrompt(`[E] ${nearest.userData.label}`);
    } else if (!this.boughtOutside && !this.exited) {
      this.game.ui.showPrompt('回転棚の青い「外」を探して E');
    } else if (!this.exited) {
      this.game.ui.hidePrompt();
    }
  }

  unload() {
    clearAtmosphere(this.game.scene);
    this.game.scene.remove(this.group);
  }
}
