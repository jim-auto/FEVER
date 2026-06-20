import { Rule } from '../../core/GameState.js';
import { P } from '../palette.js';
import { createInteractable, nearestInteractable } from '../utils.js';
import { FinaleScene2D } from './FinaleScene2D.js';
import { triggerReinterpret } from '../../core/Reinterpret.js';

/**
 * 巨大看護師通り — ドット絵
 */
export class NurseStreetScene2D {
  static audioPreset = 'nurse';
  static zoom = 1.25;

  constructor(game) {
    this.game = game;
    this.interactables = [];
    this.nursePhase = 0;
    this.nursePos = { x: 4, z: -20 };
    this.exited = false;
    this.blockCooldown = 0;
    this.blockCount = 0;
    this.reinterpreted = false;
    this.guideShown = false;
    this.footstepTimer = 0;
  }

  load() {
    const { state, ui, renderer } = this.game;
    renderer.setBackground(P.void);

    state.registerRule(new Rule({
      id: 'giant_nurse',
      premise: '巨大存在の影は地形として機能する',
      scope: 'local',
    }));

    state.patientTicket.location = '病院回廊·看護師通り';
    ui.updatePatientTicket();

    this.interactables = [
      createInteractable({ id: 'shopkeeper', label: '案内に話す', x: -3.5, z: 2, range: 2 }),
    ];

    this.game.player.setPosition(0, 0, 8);
    this.game.player.enable();
    this.runIntro();
  }

  async runIntro() {
    await this.game.ui.wait(600);
    this.game.ui.showSubtitle({
      audio: '病院の回廊が、街の長さまで伸びている。看護師の足元だけが、ビルの高さにある。',
      duration: 4800,
    });
    this.nursePhase = 1;
    this.game.ui.setObjective('看護師の影の間を通る');
  }

  isInShadow(pos) {
    const shadowCenterX = this.nursePos.x - 2;
    const shadowCenterZ = this.nursePos.z;
    const inX = Math.abs(pos.x - shadowCenterX) < 2.8;
    const inZ = Math.abs(pos.z - shadowCenterZ) < 6;
    return inX && inZ;
  }

  isBlockedByNurse(pos) {
    const footX = this.nursePos.x;
    const footZ = this.nursePos.z + 1;
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
    return nearestInteractable(playerPos, this.interactables);
  }

  interact(obj) {
    if (obj.userData.id === 'shopkeeper') {
      this.game.ui.showSubtitle({
        speaker: '案内',
        audio: '「外来から病棟へは、影の間を通ってください。今日は歩幅が広いです」',
        duration: 4800,
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
    this.game.changeScene(FinaleScene2D);
  }

  render(r) {
    r.drawStreet(8, 40);
    const sway = Math.sin(Date.now() * 0.001) * 0.3;
    r.drawGiantNurse(this.nursePos.x, this.nursePos.z, sway);
    r.rectWorld(-3.5, 2, 1.5, 1.8, P.white);
    r.label('案内', -3.5, 3, P.text);
    r.label('← 病棟', -3.2, 2, P.text);
    r.label('回廊 →', 3.2, -8, P.text);
    r.label('影の間を通れ', -2, this.nursePos.z, P.highlight);
  }

  update(dt) {
    this.blockCooldown = Math.max(0, this.blockCooldown - dt);

    if (this.nursePhase >= 1) {
      this.nursePos.z += dt * 1.5;
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

  unload() {}
}
