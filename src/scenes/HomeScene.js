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
import { createTextSprite } from '../world/textLabels.js';

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
    this.phoneGroup = null;
    this.phoneLabel = null;
    this.phoneLight = null;
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
    this.game.player.disable();
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
      new THREE.BoxGeometry(0.9, 0.4, 0.55),
      this.materials.wood,
    );
    table.position.set(0, 0.2, -1.05);
    this.group.add(table);

    const tableMark = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 24),
      new THREE.MeshStandardMaterial({
        color: 0x6a9ec8,
        emissive: 0x4a7ea8,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.55,
      }),
    );
    tableMark.rotation.x = -Math.PI / 2;
    tableMark.position.set(0, 0.405, -1.05);
    this.group.add(tableMark);
    this.phoneMark = tableMark;

    const thermometer = createInteractableMesh(
      new THREE.BoxGeometry(0.08, 0.25, 0.02),
      this.materials.thermometer,
      { id: 'thermometer', label: '体温計 — 40.2°C' },
    );
    thermometer.position.set(0.32, 0.52, -1.05);
    this.group.add(thermometer);
    this.interactables.push(thermometer);

    this.phoneGroup = new THREE.Group();
    this.phoneGroup.position.set(0, 0.45, -1.05);

    const phoneBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.06, 0.16),
      this.materials.phone.clone(),
    );
    phoneBase.material.emissive = new THREE.Color(0x88ccff);
    phoneBase.material.emissiveIntensity = 0.45;
    this.phoneGroup.add(phoneBase);

    const phoneHandset = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.05, 0.22),
      phoneBase.material.clone(),
    );
    phoneHandset.position.set(0.08, 0.06, 0.02);
    phoneHandset.rotation.y = 0.35;
    this.phoneGroup.add(phoneHandset);
    this.phoneMesh = phoneBase;

    const phoneHit = createInteractableMesh(
      new THREE.BoxGeometry(0.45, 0.35, 0.45),
      new THREE.MeshBasicMaterial({ visible: false }),
      { id: 'phone', label: '病院へ電話する' },
    );
    phoneHit.position.set(0, 0.12, 0);
    this.phoneGroup.add(phoneHit);
    this.interactables.push(phoneHit);

    this.phoneLabel = createTextSprite('病院へ電話', {
      fontSize: 40,
      color: '#1a3048',
      bgColor: 'rgba(168, 210, 255, 0.95)',
      width: 320,
      height: 96,
    });
    this.phoneLabel.position.set(0, 0.55, 0);
    this.phoneLabel.scale.set(1.1, 0.55, 1);
    this.phoneGroup.add(this.phoneLabel);

    this.phoneLight = new THREE.PointLight(0x88bbee, 0.9, 3.5);
    this.phoneLight.position.set(0, 0.25, 0);
    this.phoneGroup.add(this.phoneLight);

    this.group.add(this.phoneGroup);

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
    const { ui, state } = this.game;
    if (state.hasFlag('isekai_transfer')) {
      state.patientTicket.location = '自宅';
      ui.updatePatientTicket();
      ui.showSubtitle({
        speaker: '——',
        audio: '転移先の座標が確定した。表示名は「自宅」。',
        duration: 4200,
      });
      await ui.wait(3800);
    }
    ui.showSubtitle({
      audio: '熱い。体温計は40.2度を指している。',
      duration: 4000,
    });
    await ui.wait(4200);
    ui.setObjective('→ 前の机 · 電話に E');
    ui.showSubtitle({
      audio: '目の前の机に電話がある。先に病院へ連絡してから、外へ出よう。',
      text: 'W で前へ · 近づいて E でかける',
      duration: 5500,
    });
    this.game.player.lookAtPoint(0, -1.05);
    this.game.player.enable();
    this.introComplete = true;
  }

  checkCollision(pos) {
    const { w, d } = this.room.bounds;
    const margin = 0.3;
    return Math.abs(pos.x) <= w / 2 - margin && Math.abs(pos.z) <= d / 2 - margin;
  }

  getNearestInteractable(playerPos) {
    let nearest = null;
    let bestDist = Infinity;
    for (const obj of this.interactables) {
      const worldPos = new THREE.Vector3();
      obj.getWorldPosition(worldPos);
      const dist = playerPos.distanceTo(worldPos);
      const range = obj.userData.id === 'phone' ? 2.4 : 1.2;
      if (dist < range && dist < bestDist) {
        bestDist = dist;
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
      if (this.phoneLabel) this.phoneLabel.visible = false;
      if (this.phoneMark) this.phoneMark.visible = false;
      if (this.phoneLight) this.phoneLight.intensity = 0;
      this.game.ui.resetObjective();
      this.runPhoneSequence();
      return;
    }

    if (id === 'door') {
      if (!this.phoneUsed) {
        ui.showSubtitle({
          audio: '……先に、病院へ連絡すべきかもしれない。',
          text: '机の上の電話に近づき、E キーでかける',
          duration: 4500,
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

    if (this.phoneMesh && !this.phoneUsed) {
      const pulse = 0.35 + Math.sin(this.breathPhase * 2.4) * 0.2;
      this.phoneMesh.material.emissiveIntensity = pulse;
      if (this.phoneMark) {
        this.phoneMark.material.emissiveIntensity = 0.25 + Math.sin(this.breathPhase * 2.4) * 0.15;
        this.phoneMark.scale.setScalar(1 + Math.sin(this.breathPhase * 2.4) * 0.06);
      }
      if (this.phoneLabel) {
        this.phoneLabel.position.y = 0.55 + Math.sin(this.breathPhase * 2.4) * 0.04;
      }
      if (this.phoneLight) {
        this.phoneLight.intensity = 0.7 + Math.sin(this.breathPhase * 2.4) * 0.25;
      }
    }

    const playerPos = this.game.player.getPosition();
    const nearest = this.getNearestInteractable(playerPos);
    const phoneDist = playerPos.distanceTo(new THREE.Vector3(0, playerPos.y, -1.05));

    if (nearest?.userData.id === 'phone') {
      this.game.ui.showPrompt(`[E] ${nearest.userData.label}`);
    } else if (nearest) {
      this.game.ui.showPrompt(`[E] ${nearest.userData.label}`);
    } else if (this.introComplete && !this.phoneUsed) {
      const hint = phoneDist > 2.2
        ? 'W で前へ — 机の青い光が電話'
        : 'もう少し近づいて E';
      this.game.ui.showPrompt(hint);
    } else {
      this.game.ui.hidePrompt();
    }
  }

  unload() {
    clearAtmosphere(this.game.scene);
    this.game.scene.remove(this.group);
  }
}
