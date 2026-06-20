import { Rule, FeverLayer } from '../../core/GameState.js';
import { P } from '../palette.js';
import { createInteractable, nearestInteractable, horizontalDistance } from '../utils.js';
import { NurseStreetScene2D } from './NurseStreetScene2D.js';
import { triggerReinterpret } from '../../core/Reinterpret.js';

const MEDICINES = {
  antipyretic: { label: '解熱剤', temp: 38.0, status: '患者', cost: '発汗' },
  sudorific: { label: '発汗剤', temp: 40.5, status: '訪問者', cost: '悪寒' },
  outside: { label: '「外」', temp: null, status: null, cost: '一時間' },
};

/**
 * 移動薬局「さむけ」— ドット絵
 */
export class PharmacyScene2D {
  static audioPreset = 'pharmacy';
  static zoom = 2;

  constructor(game) {
    this.game = game;
    this.interactables = [];
    this.shelfAngle = 0;
    this.boughtOutside = false;
    this.boughtMedicine = false;
    this.exited = false;
    this.blockCooldown = 0;
    this.blockCount = 0;
    this.reinterpreted = false;
    this.door = { x: 0, z: 3.5, visible: false };
  }

  load() {
    const { state, ui, renderer } = this.game;
    renderer.setBackground(P.void);

    state.registerRule(new Rule({
      id: 'pharmacy_exit',
      premise: '薬局の出口は商品として陳列される',
      scope: 'local',
    }));

    state.patientTicket.location = '移動薬局「さむけ」·外来';
    ui.updatePatientTicket();

    this.interactables = [
      createInteractable({
        id: 'med_antipyretic',
        label: `${MEDICINES.antipyretic.label}を買う（代金：${MEDICINES.antipyretic.cost}）`,
        x: -1.2,
        z: -2.5,
        range: 1.8,
      }),
      createInteractable({
        id: 'med_sudorific',
        label: `${MEDICINES.sudorific.label}を買う（代金：${MEDICINES.sudorific.cost}）`,
        x: 1.2,
        z: -2.5,
        range: 1.8,
      }),
      createInteractable({
        id: 'med_outside',
        label: `${MEDICINES.outside.label}を買う（代金：${MEDICINES.outside.cost}）`,
        x: 0,
        z: -1.8,
        range: 2.2,
      }),
      createInteractable({ id: 'pharmacist', label: '薬剤師に話す', x: 0, z: 1.5, range: 1.8 }),
    ];

    this.game.player.setPosition(0, 0, 0);
    this.game.player.enable();
    this.runIntro();
  }

  async runIntro() {
    await this.game.ui.wait(800);
    this.game.ui.showSubtitle({
      audio: '薬局の棚が、ゆっくり自分の周りを回っている。ここも病院の一部だ。',
      duration: 4500,
    });
    await this.game.ui.wait(3500);
    this.game.ui.showSubtitle({
      speaker: '薬剤師',
      audio: '「出口をご希望の方は、商品棚をご確認ください。外来の方も同じ手順です」',
      duration: 4800,
    });
    this.game.state.getRule('pharmacy_exit')?.demonstrate();
    this.game.ui.setObjective('正面の「外」を買う → 出口');
  }

  buyMedicine(id) {
    const { state, ui, rules } = this.game;
    const med = MEDICINES[id];
    const rule = state.getRule('pharmacy_exit');

    if (id === 'outside') {
      if (this.boughtOutside) return;
      this.boughtOutside = true;
      this.door.visible = true;
      state.addFlag('bought_outside');
      state.patientTicket.companion = '一時間';
      ui.updatePatientTicket();
      rules.acceptInterpretation('pharmacy_exit', 'buy_outside', {
        effect: 'exit_unlocked',
        cost: 'unused_hour',
      });
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
    if (this.boughtOutside && this.door.visible) {
      if (horizontalDistance(playerPos, this.door) < 1.8) {
        return {
          x: this.door.x,
          z: this.door.z,
          userData: { id: 'door', label: '外へ出る' },
        };
      }
    }

    return nearestInteractable(playerPos, this.interactables, (obj) => {
      if (obj.id === 'med_outside' && this.boughtOutside) return false;
      if (obj.id.startsWith('med_') && obj.id !== 'med_outside' && this.boughtMedicine) return false;
      return true;
    });
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
    this.game.changeScene(NurseStreetScene2D);
  }

  render(r) {
    r.drawPharmacy(4, this.shelfAngle);
    const sa = this.shelfAngle;
    r.drawShelfItem(-1.2, -2.5, '解熱');
    r.drawShelfItem(1.2, -2.5, '発汗');
    if (!this.boughtOutside) {
      r.drawShelfItem(0, -1.8, '外', true);
    }
    r.rectWorld(0, 1.5, 1.8, 0.9, P.wood);
    r.label('薬剤師', 0, 2.2, P.text);
    if (this.door.visible) {
      r.drawDoor(this.door.x, this.door.z, 0, true);
    }
  }

  update(dt) {
    this.blockCooldown = Math.max(0, this.blockCooldown - dt);
    this.shelfAngle += dt * 0.15;

    const pos = this.game.player.getPosition();
    if (!this.boughtOutside && pos.z > 2.2 && !this.game.state.hasFlag('pharmacy_blocked')) {
      this.game.state.addFlag('pharmacy_blocked');
    }

    const nearest = this.getNearestInteractable(pos);
    if (nearest && !this.exited) {
      this.game.ui.showPrompt(`[E] ${nearest.userData.label}`);
    } else if (!this.boughtOutside && !this.exited) {
      this.game.ui.showPrompt('正面の青い「外」に E');
    } else if (!this.exited) {
      this.game.ui.hidePrompt();
    }
  }

  unload() {}
}
