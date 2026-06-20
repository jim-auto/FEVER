import { Rule } from '../../core/GameState.js';
import { P } from '../palette.js';
import { createInteractable, nearestInteractable, horizontalDistance } from '../utils.js';
import { NPC_WORKER, NPC_CHILD } from '../sprites.js';
import { PharmacyScene2D } from './PharmacyScene2D.js';
import { triggerReinterpret } from '../../core/Reinterpret.js';

const CROSSWALK_Z = 0;
const BLOCK_Z = -0.3;

/**
 * 赤い予定交差点 — ドット絵
 */
export class CrosswalkScene2D {
  static audioPreset = 'crosswalk';

  constructor(game) {
    this.game = game;
    this.interactables = [];
    this.scheduleState = 'red';
    this.blockCooldown = 0;
    this.blockCount = 0;
    this.reinterpreted = false;
    this.feverAttempted = false;
    this.demoPhase = 0;
    this.demoTimer = 0;
    this.officeWorker = { x: 1.5, z: -3 };
    this.officeWorkerPhase = 'idle';
    this.childDemoDone = false;
    this.crossed = false;
    this.isSunset = false;
    this.workerScheduleVisible = true;
    this.stripeWarp = 0.15;
  }

  load() {
    const { state, ui, renderer } = this.game;

    state.registerRule(new Rule({
      id: 'red_schedule',
      premise: '赤い予定は横断歩道を渡れない',
      scope: 'local',
    }));

    state.patientTicket.location = '外来トリアージ交差点';
    state.patientTicket.appointment = '赤';
    ui.updatePatientTicket();
    renderer.setBackground(this.isSunset ? '#3a3028' : P.void);

    this.interactables = [
      createInteractable({ id: 'signal', label: '信号機に話しかける', x: 3.5, z: -2, range: 2.2 }),
      createInteractable({ id: 'laundry', label: '予定表を洗う（コインランドリー）', x: -4, z: -4, range: 2.2 }),
      createInteractable({ id: 'emergency', label: '赤を「緊急」として登録', x: 4, z: -4, range: 2.2 }),
      createInteractable({ id: 'bench', label: 'ベンチで待つ（日が暮れるまで）', x: -1, z: -5, range: 2.2 }),
      createInteractable({ id: 'schedule', label: '自分の予定表を見る', x: -2.2, z: -6.5, range: 2.2 }),
      createInteractable({ id: 'child', label: '子どもを見る', x: -3, z: -2.5, range: 2.2 }),
    ];

    this.game.player.setPosition(-2, 0, -7);
    this.game.player.enable();
    this.runIntro();
  }

  canCross() {
    return this.scheduleState !== 'red';
  }

  async runIntro() {
    const { ui } = this.game;
    await ui.wait(1000);
    ui.showSubtitle({
      audio: 'ここは街のはずだ。床はビニール、天井は蛍光灯、案内板は全部「受付」系だ。',
      duration: 5000,
    });
    await ui.wait(4500);
    ui.showSubtitle({
      speaker: '——',
      audio: '交差点はトリアージ。信号機が、予定表を審査している。',
      duration: 4500,
    });
    await ui.wait(4000);
    this.startOfficeWorkerDemo();
  }

  startOfficeWorkerDemo() {
    this.officeWorkerPhase = 'approach';
    this.demoPhase = 1;
    this.game.ui.showSubtitle({
      speaker: '通行者',
      audio: '「外来の混雑で、横断歩道が塞がる日もあるらしいですよ」',
      duration: 4000,
    });
    this.game.state.getRule('red_schedule')?.demonstrate();
  }

  updateOfficeWorkerDemo(dt) {
    if (this.officeWorkerPhase === 'approach') {
      this.officeWorker.z += dt * 1.2;
      if (this.officeWorker.z >= CROSSWALK_Z - 0.5) {
        this.officeWorkerPhase = 'blocked';
        this.officeWorker.z = CROSSWALK_Z - 0.8;
        this.game.ui.showSubtitle({
          speaker: 'トリアージ',
          audio: '「赤い予定は渡れません。色を変えるか、緊急として再分類してください」',
          duration: 4000,
        });
        this.officeWorkerPhase = 'retreat';
      }
    } else if (this.officeWorkerPhase === 'retreat') {
      this.demoTimer += dt;
      if (this.demoTimer > 2) {
        this.officeWorker.z -= dt * 0.8;
        if (this.officeWorker.z < -3) {
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
    this.workerScheduleVisible = false;
    this.stripeWarp = 0;
    this.game.ui.showSubtitle({
      audio: '子どもが赤いシールを剥がすと、横断歩道がまっすぐになった。',
      duration: 4000,
    });
    await this.game.ui.wait(3500);
    this.game.state.getRule('red_schedule')?.demonstrate();
    this.game.ui.showSubtitle({
      audio: '……自分の予定表も、赤い。Patient票の「予約時刻」が赤になっている。',
      duration: 5000,
    });
    this.game.ui.setObjective('渡れない · 左:洗濯 / 右:緊急 / ベンチ');
  }

  openCrosswalk() {
    this.signalRedVisible = false;
    this.signalGreenVisible = true;
    this.game.audio.playWorldAccept();
    this.game.ui.resetObjective();
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
    this.game.renderer.setBackground('#3a3028');
    this.game.audio.setPreset('crosswalk_sunset');
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
        this.blockCount += 1;
        this.game.audio.playCrosswalkDeny();
        this.game.ui.showSubtitle({
          speaker: '信号機',
          audio: '「赤い予定は渡れません」',
          duration: 3000,
        });
        if (!this.feverAttempted) this.tryFeverExcuse();
        if (this.blockCount >= 5 && !this.reinterpreted) {
          this.reinterpreted = true;
          triggerReinterpret(this.game, 'crosswalk');
        }
      }
      return false;
    }
    return true;
  }

  getNearestInteractable(playerPos) {
    return nearestInteractable(playerPos, this.interactables, (obj) => {
      if (obj.id === 'laundry' && this.scheduleState !== 'red') return false;
      if (obj.id === 'emergency' && this.scheduleState !== 'red') return false;
      if (obj.id === 'bench' && this.scheduleState !== 'red') return false;
      return true;
    });
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

  render(r) {
    r.drawCrosswalk(10, 20, this.stripeWarp);
    r.drawSignal(3.5, -2, this.scheduleState);
    r.label('赤い予定は渡れません', 3.5, -3.2, P.text);
    r.rectWorld(-4, -4, 0.7, 1.1, P.white);
    r.label('洗濯', -4, -4.8, P.text);
    r.rectWorld(4, -4, 0.5, 1.3, P.bench);
    r.label('緊急', 4, -4.8, P.text);
    r.rectWorld(-1, -5, 1.2, 0.5, P.bench);
    r.rectWorld(-2.2, -6.5, 0.2, 0.28, P.schedule);
    r.drawNpc(this.officeWorker.x, this.officeWorker.z, NPC_WORKER);
    if (this.workerScheduleVisible) {
      r.rectWorld(1.7, -3, 0.15, 0.2, P.schedule);
    }
    r.drawNpc(-3, -2.5, NPC_CHILD);
    r.label('← 外来', -4.2, -6, P.text);
    r.label('トリアージ →', 4.2, -6, P.text);
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
    } else if (!this.crossed && this.scheduleState === 'red' && !this.canCross()) {
      this.game.ui.showPrompt('右: 緊急登録 / 左: 洗濯 / ベンチ: 日暮れ');
    } else if (!this.crossed && this.canCross()) {
      this.game.ui.showPrompt('W で横断歩道を渡る');
    } else if (!this.crossed) {
      this.game.ui.hidePrompt();
    }
  }

  async exitArea() {
    const { ui } = this.game;
    ui.resetObjective();
    ui.showSubtitle({
      audio: '横断歩道を渡った。向こう側の街路に、薬局の看板が見える。',
      duration: 3500,
    });
    this.game.state.patientTicket.location = '商店街北';
    ui.updatePatientTicket();
    await ui.wait(3000);
    this.game.changeScene(PharmacyScene2D);
  }

  unload() {}
}
