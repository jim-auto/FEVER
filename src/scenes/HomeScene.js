import * as THREE from 'three';
import { Rule } from '../core/GameState.js';
import {
  applyAtmosphere,
  clearAtmosphere,
  createMaterialSet,
  buildRoom,
  createInteractableMesh,
  addFluorescent,
  addHomeDetails,
} from '../world/environment.js';
import { StairsScene } from './StairsScene.js';

/**
 * プロローグ — 発汗する六畳間
 */
export class HomeScene {
  static audioPreset = 'home';

  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.materials = createMaterialSet();
    this.breathPhase = 0;
    this.doorPosition = 0;
    this.doorMesh = null;
    this.doorFrame = null;
    this.phoneUsed = false;
    this.introComplete = false;
    this.interactables = [];
  }

  load() {
    const { scene, state } = this.game;
    applyAtmosphere(scene, 'home');
    scene.add(this.group);

    state.registerRule(new Rule({
      id: 'observation',
      premise: '見ていない場所は書き換わる',
      scope: 'global',
    }));

    const room = buildRoom(this.group, this.materials);
    this.room = room;
    this.buildFurniture();
    this.buildDoor();
    addHomeDetails(this.group, this.materials);
    this.setupCallbacks();

    this.game.player.setPosition(0, 1.55, 0.5);
    this.game.player.enable();
    this.runIntro();
  }

  buildFurniture() {
    const futon = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.12, 2.0),
      this.materials.plasticWhite,
    );
    futon.position.set(-0.3, 0.06, 0.2);
    this.group.add(futon);

    const table = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.4, 0.35),
      this.materials.wood,
    );
    table.position.set(0.8, 0.2, -0.5);
    this.group.add(table);

    const thermometer = createInteractableMesh(
      new THREE.BoxGeometry(0.08, 0.25, 0.02),
      this.materials.thermometer,
      { id: 'thermometer', label: '体温計 — 40.2°C' },
    );
    thermometer.position.set(0.8, 0.52, -0.5);
    this.group.add(thermometer);
    this.interactables.push(thermometer);

    const phone = createInteractableMesh(
      new THREE.BoxGeometry(0.12, 0.04, 0.06),
      this.materials.phone,
      { id: 'phone', label: '病院へ電話する' },
    );
    phone.position.set(0.72, 0.42, -0.48);
    this.group.add(phone);
    this.interactables.push(phone);

    const { tube, light } = addFluorescent(this.group, this.materials, 0, 2.35, 0, 0.8);
    this.fluorescentMesh = tube;
    this.fluorescentLight = light;
  }

  buildDoor() {
    this.doorFrame = new THREE.Group();
    const doorGeo = new THREE.BoxGeometry(0.75, 1.85, 0.06);
    this.doorMesh = new THREE.Mesh(doorGeo, this.materials.door);
    this.doorMesh.userData = { id: 'door', interactable: true, label: '外へ出る' };
    this.doorFrame.add(this.doorMesh);
    this.group.add(this.doorFrame);
    this.interactables.push(this.doorMesh);
    this.setDoorWall(0);
  }

  setDoorWall(wallIndex) {
    const { w, d } = this.room.bounds;
    this.doorPosition = wallIndex;

    if (wallIndex === 0) {
      this.doorFrame.position.set(w / 2 - 0.05, 0.925, 0);
      this.doorFrame.rotation.y = -Math.PI / 2;
    } else {
      this.doorFrame.position.set(0, 0.925, d / 2 - 0.05);
      this.doorFrame.rotation.y = 0;
    }
  }

  setupCallbacks() {
    this.game.onEyesOpened = (duration) => {
      if (duration > 0.8 && !this.game.state.hasFlag('door_relocated')) {
        const newWall = this.doorPosition === 0 ? 1 : 0;
        this.setDoorWall(newWall);
        this.game.state.addFlag('door_relocated');
        this.game.state.forgetDetail('扉の位置');
        this.game.state.getRule('observation')?.demonstrate();
        this.game.ui.showSubtitle({
          speaker: '——',
          audio: '……扉が、違う壁にあった。',
          duration: 3500,
        });
      } else if (duration > 0.3 && duration <= 0.8) {
        this.game.ui.showSubtitle({
          audio: '目を開けた。何かが違う気がする。',
          duration: 2500,
        });
      }
    };
  }

  async runIntro() {
    await this.game.ui.wait(1500);
    this.game.ui.showSubtitle({
      audio: '熱い。体温計は40.2度を指している。',
      duration: 4000,
    });
  }

  checkCollision(pos) {
    const { w, d } = this.room.bounds;
    const margin = 0.3;
    return Math.abs(pos.x) <= w / 2 - margin && Math.abs(pos.z) <= d / 2 - margin;
  }

  getNearestInteractable(playerPos) {
    let nearest = null;
    let minDist = 1.2;
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

    if (id === 'thermometer') {
      ui.showSubtitle({
        audio: '40.2。数字は正確だ。身体も、そう言っている。',
        duration: 3500,
      });
      return;
    }

    if (id === 'phone' && !this.phoneUsed) {
      this.phoneUsed = true;
      this.runPhoneSequence();
      return;
    }

    if (id === 'door') {
      if (!this.phoneUsed) {
        ui.showSubtitle({
          audio: '……先に、病院へ連絡すべきかもしれない。',
          duration: 3000,
        });
        return;
      }
      if (!state.hasFlag('door_relocated')) {
        ui.showSubtitle({
          audio: '扉はここにある。でも、本当にここだったか。',
          text: '目を閉じて、場所を書き換えられるかもしれない',
          duration: 5000,
        });
        return;
      }
      this.exitRoom();
    }
  }

  async runPhoneSequence() {
    this.game.player.disable();
    this.game.audio.playPhoneRing();
    await this.game.ui.showPhoneDialog([
      { text: '（病院へ電話をかける）', pause: 1000 },
      { text: '受付', speaker: true, pause: 800 },
      { text: '「もしもし、〇〇病院です」', pause: 1800 },
      { text: '「熱があって……病院へ行きたいのですが」', pause: 1800 },
      { text: '受付', speaker: true, pause: 800 },
      { text: '「病院は現在移動中です」', pause: 2000 },
      { text: '「どこへですか」', pause: 1200 },
      { text: '「必要な方へです」', pause: 2000 },
      { text: '「私は必要です」', pause: 1200 },
      { text: '「それは到着後に確認します」', pause: 2200 },
    ]);

    this.game.state.setClassification('訪問者');
    this.game.ui.updatePatientTicket();
    this.game.ui.showSubtitle({
      audio: '……外へ出なければ。',
      duration: 3000,
    });
    this.game.player.enable();
  }

  async exitRoom() {
    const { ui } = this.game;
    ui.showSubtitle({
      audio: '自宅を出た。隣の集合住宅へ。',
      duration: 3000,
    });
    await ui.wait(2500);
    this.game.changeScene(StairsScene);
  }

  update(dt) {
    this.breathPhase += dt;

    const breathScale = 1 + Math.sin(this.breathPhase * 1.2) * 0.008;
    this.room.leftWall.scale.x = breathScale;
    this.room.rightWall.scale.x = breathScale;

    const sweat = 0.03 + Math.sin(this.breathPhase * 0.7) * 0.015;
    this.room.leftWall.material.emissive = new THREE.Color(0x887766);
    this.room.leftWall.material.emissiveIntensity = sweat;

    if (this.fluorescentLight) {
      this.fluorescentLight.intensity = 0.38 + Math.sin(this.breathPhase * 3.1) * 0.04;
    }
    if (this.fluorescentMesh) {
      this.fluorescentMesh.material.emissiveIntensity = 0.5 + Math.sin(this.breathPhase * 3.1) * 0.08;
    }

    const playerPos = this.game.player.getPosition();
    const nearest = this.getNearestInteractable(playerPos);

    if (nearest) {
      this.game.ui.showPrompt(`[E] ${nearest.userData.label}`);
    } else {
      this.game.ui.hidePrompt();
    }
  }

  unload() {
    clearAtmosphere(this.game.scene);
    this.game.scene.remove(this.group);
  }
}
