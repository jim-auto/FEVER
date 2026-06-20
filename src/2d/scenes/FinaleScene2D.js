import { P } from '../palette.js';
import { getReceptionChoices, resolveEnding } from '../../data/endings.js';

/**
 * フィナーレ — 歩行病院（ドット絵）
 */
export class FinaleScene2D {
  static audioPreset = 'finale';
  static zoom = 1;

  constructor(game) {
    this.game = game;
    this.phase = 0;
    this.phaseTimer = 0;
    this.hospitalPos = { x: 0, z: -25 };
    this.ended = false;
  }

  load() {
    const { state, ui, renderer } = this.game;
    renderer.setBackground(P.void);

    state.patientTicket.location = '病院中庭·外来広場';
    ui.updatePatientTicket();

    this.game.player.setPosition(0, 0, 5);
    this.game.player.enable();
    this.runSequence();
  }

  async runSequence() {
    const { ui } = this.game;
    await ui.wait(1000);
    ui.showSubtitle({ audio: 'あれが、病院だ——街の先端に、受付が歩いている。', duration: 3500 });
    await ui.wait(2500);
    this.phase = 1;
  }

  async onHospitalApproach() {
    if (this.phase >= 2) return;
    this.phase = 2;
    this.game.player.disable();
    this.game.audio.playHospitalMotif(1.2);

    const { ui } = this.game;
    ui.showSubtitle({
      audio: '病院が、立ち上がる。無数の廊下が脚になって、別の地区へ向かい始めた。',
      duration: 5500,
    });

    await ui.wait(2000);
    this.phase = 3;
    await ui.wait(4000);

    this.game.audio.playPhoneRing();
    await ui.showPhoneDialog([
      { text: '（電話が鳴る）', pause: 1200 },
      { text: '受付', speaker: true, pause: 800 },
      { text: '「ご来院ありがとうございます」', pause: 2000 },
      { text: '「まだ着いていません」', pause: 1500 },
      { text: '「それはこちらでは確認できません」', pause: 2200 },
    ]);

    await this.showReceptionQuestion();
  }

  async showReceptionQuestion() {
    const { ui } = this.game;
    ui.showSubtitle({
      speaker: '受付',
      audio: '「本日、どの部分が来院しましたか」',
      duration: 5000,
    });
    await ui.wait(1500);

    const choice = await ui.showChoiceDialog(
      '本日、どの部分が来院しましたか',
      getReceptionChoices(this.game.state).map((c) => ({ id: c.id, label: c.label })),
      { timeoutMs: 24000 },
    );

    const ending = resolveEnding(choice);
    if (ending) this.applyEnding(ending);
  }

  applyEnding(ending) {
    if (this.ended) return;
    this.ended = true;

    const { state, ui } = this.game;
    Object.assign(state.patientTicket, ending.ticket);
    if (ending.ticket.temperature === '分離') {
      state.setTemperature(37.0);
      state.patientTicket.temperature = 37.0;
    }
    ui.updatePatientTicket();
    if (ending.hideObjective) ui.hideObjective();

    this.game.audio.playHospitalMotif(0.8);
    ui.showEnding({
      title: ending.id === 'silence' ? '沈黙' : ending.label,
      epilogue: ending.epilogue,
      state: this.game.state,
    });
  }

  checkCollision(pos) {
    return Math.abs(pos.x) < 12 && pos.z > -15 && pos.z < 12;
  }

  render(r) {
    r.drawPlaza();
    r.drawHospital(this.hospitalPos.x, this.hospitalPos.z, this.phase, this.phaseTimer * 3);
    r.rectWorld(-3, 3, 1.4, 0.45, P.bench);
    r.label('中庭', 0, 2, P.text);
    r.label('← 外来', -5, 0, P.text);
  }

  update(dt) {
    this.phaseTimer += dt;
    if (this.phase === 1 && this.game.player.getPosition().z < 0) {
      this.onHospitalApproach();
    }
    if (this.phase >= 3) {
      this.hospitalPos.x += dt * 2;
      this.hospitalPos.z += dt * 3;
    }
  }

  unload() {}
}
