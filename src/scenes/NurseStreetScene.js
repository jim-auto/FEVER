import * as THREE from 'three';
import { Rule } from '../core/GameState.js';
import {
  applyAtmosphere,
  clearAtmosphere,
  createMaterialSet,
  createInteractableMesh,
  addNurseStreetSkyline,
} from '../world/environment.js';
import { FinaleScene } from './FinaleScene.js';
import { triggerReinterpret } from '../core/Reinterpret.js';

/**
 * 巨大看護師通り — 影の間を通過する
 */
export class NurseStreetScene {
  static audioPreset = 'nurse';

  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.materials = createMaterialSet();
    this.interactables = [];
    this.nursePhase = 0;
    this.nurseZ = -20;
    this.shadowZones = [];
    this.exited = false;
    this.blockCooldown = 0;
    this.blockCount = 0;
    this.reinterpreted = false;
    this.guideShown = false;
    this.groundShadow = null;
    this.footstepTimer = 0;
  }

  load() {
    const { scene, state, ui } = this.game;
    applyAtmosphere(scene, 'nurse');
    scene.add(this.group);

    state.registerRule(new Rule({
      id: 'giant_nurse',
      premise: '巨大存在の影は地形として機能する',
      scope: 'local',
    }));

    state.patientTicket.location = '巨大看護師通り';
    ui.updatePatientTicket();

    this.buildStreet();
    addNurseStreetSkyline(this.group, this.materials);
    this.buildGiantNurse();
    this.game.player.setPosition(0, 1.55, 8);
    this.game.player.enable();
    this.runIntro();
  }

  buildStreet() {
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 40),
      this.materials.asphalt,
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -5);
    this.group.add(road);

    const walkL = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 40),
      this.materials.vinylFloor,
    );
    walkL.rotation.x = -Math.PI / 2;
    walkL.position.set(-3.5, 0.01, -5);
    this.group.add(walkL);

    const walkR = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 40),
      this.materials.vinylFloor,
    );
    walkR.rotation.x = -Math.PI / 2;
    walkR.position.set(3.5, 0.01, -5);
    this.group.add(walkR);

    const shop = createInteractableMesh(
      new THREE.BoxGeometry(1.5, 1.8, 1.2),
      this.materials.plasticWhite,
      { id: 'shopkeeper', label: '店員に話しかける' },
    );
    shop.position.set(-3.5, 0.9, 2);
    this.group.add(shop);
    this.interactables.push(shop);
  }

  buildGiantNurse() {
    this.nurseGroup = new THREE.Group();
    this.nurseGroup.position.set(4, 0, -20);

    const legL = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 8, 1.2),
      this.materials.plasticWhite,
    );
    legL.position.set(-0.8, 4, 0);
    this.nurseGroup.add(legL);

    const legR = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 8, 1.2),
      this.materials.plasticWhite,
    );
    legR.position.set(0.8, 4, 0);
    this.nurseGroup.add(legR);

    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.4, 2.0),
      this.materials.plasticWhite,
    );
    shoe.position.set(0, 0.2, 0.5);
    this.nurseGroup.add(shoe);

    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 14),
      new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 1, transparent: true, opacity: 0.55 }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.set(-2, 0.03, 0);
    this.nurseGroup.add(this.shadow);

    this.group.add(this.nurseGroup);

    this.groundShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 14),
      new THREE.MeshStandardMaterial({
        color: 0x0a0c10,
        transparent: true,
        opacity: 0.45,
        roughness: 1,
      }),
    );
    this.groundShadow.rotation.x = -Math.PI / 2;
    this.groundShadow.position.y = 0.025;
    this.group.add(this.groundShadow);

    this.shadowGapL = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 14),
      new THREE.MeshStandardMaterial({ color: 0x2a3040, transparent: true, opacity: 0.25 }),
    );
    this.shadowGapL.rotation.x = -Math.PI / 2;
    this.shadowGapL.position.y = 0.026;
    this.group.add(this.shadowGapL);
  }

  async runIntro() {
    await this.game.ui.wait(600);
    this.game.ui.showSubtitle({
      audio: '看護師の足元だけが、ビルの高さにある。誰も振り返らない。',
      duration: 4500,
    });
    this.nursePhase = 1;
    this.game.ui.setObjective('看護師の影の間を通る');
  }

  isInShadow(pos) {
    const nursePos = this.nurseGroup.position;
    const shadowCenterX = nursePos.x - 2;
    const shadowCenterZ = nursePos.z;
    const inX = Math.abs(pos.x - shadowCenterX) < 2.8;
    const inZ = Math.abs(pos.z - shadowCenterZ) < 6;
    return inX && inZ;
  }

  isBlockedByNurse(pos) {
    const nursePos = this.nurseGroup.position;
    const footX = nursePos.x;
    const footZ = nursePos.z + 1;
    const nearFeet = Math.abs(pos.x - footX) < 2.5 && Math.abs(pos.z - footZ) < 2;
    return nearFeet && !this.isInShadow(pos);
  }

  checkCollision(pos) {
    if (Math.abs(pos.x) > 4.5 || pos.z > 10 || pos.z < -28) return false;
    if (this.isBlockedByNurse(pos)) {
      if (this.blockCooldown <= 0) {
        this.blockCooldown = 2;
        this.blockCount += 1;
        this.game.ui.showSubtitle({
          audio: '看護師の足元に触れそうになる。影の中なら、通れる。',
          duration: 3500,
        });
        if (this.blockCount >= 3 && !this.reinterpreted) {
          this.reinterpreted = true;
          triggerReinterpret(this.game, 'nurse');
        }
      }
      return false;
    }
    return true;
  }

  getNearestInteractable(playerPos) {
    let nearest = null;
    let minDist = 2;
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
    if (obj.userData.id === 'shopkeeper') {
      this.game.ui.showSubtitle({
        speaker: '店員',
        audio: '「今日は靴音が遅いですね。影の間を通れば大丈夫ですよ」',
        duration: 4500,
      });
      this.game.state.getRule('giant_nurse')?.demonstrate();
    }
  }

  async exitStreet() {
    if (this.exited) return;
    this.exited = true;
    this.game.ui.resetObjective();
    this.game.ui.showSubtitle({
      audio: '影を抜けた。向こうの広場に、病院の形が見える。',
      duration: 4000,
    });
    await this.game.ui.wait(3500);
    this.game.changeScene(FinaleScene);
  }

  update(dt) {
    this.blockCooldown = Math.max(0, this.blockCooldown - dt);

    if (this.nursePhase >= 1) {
      this.nurseGroup.position.z += dt * 1.5;
      this.shadow.position.x = -2 + Math.sin(Date.now() * 0.001) * 0.3;

      const nursePos = this.nurseGroup.position;
      const shadowX = nursePos.x - 2;
      const shadowZ = nursePos.z;
      this.groundShadow.position.set(shadowX, 0.025, shadowZ);
      this.shadowGapL.position.set(shadowX - 3.2, 0.026, shadowZ);

      this.footstepTimer += dt;
      if (this.footstepTimer > 1.8) {
        this.footstepTimer = 0;
        this.game.audio.playFootstepRumble?.();
      }
    }

    const pos = this.game.player.getPosition();
    if (pos.z < -22 && !this.exited) {
      this.exitStreet();
    }

    const nearest = this.getNearestInteractable(pos);
    if (nearest && !this.exited) {
      this.game.ui.showPrompt(`[E] ${nearest.userData.label}`);
    } else if (!this.exited && this.nursePhase >= 1 && !this.guideShown) {
      this.guideShown = true;
      this.game.ui.showPrompt('W で前へ · 左の歩道（足元を避ける）');
    } else if (!this.exited) {
      this.game.ui.hidePrompt();
    }
  }

  unload() {
    clearAtmosphere(this.game.scene);
    this.game.scene.remove(this.group);
  }
}
