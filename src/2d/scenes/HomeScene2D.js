import { Rule } from '../../core/GameState.js';
import { P } from '../palette.js';
import { createInteractable, nearestInteractable } from '../utils.js';
import { ITEM_THERMO } from '../sprites.js';
import { StairsScene2D } from './StairsScene2D.js';

/**
 * プロローグ — 発汗する六畳間（ドット絵）
 */
export class HomeScene2D {
  static audioPreset = 'home';
  static zoom = 4.5;

  constructor(game, options = {}) {
    this.game = game;
    this.demo = options.demo ?? false;
    this.room = { bounds: { w: 4, d: 4 } };
    this.doorPosition = 0;
    this.doorPos = { x: 2, z: 0 };
    this.phoneUsed = false;
    this.introComplete = false;
    this.breathPhase = 0;
    this.interactables = [];
  }

  load() {
    const { state, renderer } = this.game;
    renderer.setBackground(P.void);

    state.registerRule(new Rule({
      id: 'observation',
      premise: '見ていない場所は書き換わる',
      scope: 'global',
    }));

    this.buildInteractables();
    this.setupCallbacks();

    this.game.player.setPosition(0, 0, 0.5);
    if (this.demo) {
      this.introComplete = true;
      this.game.player.setPosition(0, 0, 0.2);
      this.game.player.facing = 'up';
      this.game.player.enable();
      return;
    }
    this.game.player.disable();
    this.runIntro();
  }

  buildInteractables() {
    this.interactables = [
      createInteractable({ id: 'thermometer', label: '体温計 — 40.2°C', x: 0.32, z: -1.05, range: 1.2 }),
      createInteractable({ id: 'phone', label: '病院へ電話する', x: 0, z: -1.05, range: 2.4 }),
      createInteractable({ id: 'door', label: '外へ出る', x: this.doorPos.x, z: this.doorPos.z, range: 1.2 }),
    ];
  }

  setDoorWall(wallIndex) {
    this.doorPosition = wallIndex;
    if (wallIndex === 0) {
      this.doorPos = { x: 2, z: 0 };
    } else {
      this.doorPos = { x: 0, z: 2 };
    }
    const door = this.interactables.find((o) => o.id === 'door');
    if (door) {
      door.x = this.doorPos.x;
      door.z = this.doorPos.z;
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
    return nearestInteractable(playerPos, this.interactables);
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
          text: 'Shift を1秒以上 · 目を閉じて扉を書き換える',
          duration: 5500,
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
      audio: '自宅を出た。外ではなく、病棟の廊下へ。',
      duration: 3000,
    });
    await ui.wait(2500);
    this.game.changeScene(StairsScene2D);
  }

  render(r) {
    r.drawRoom(this.room.bounds, { sweat: true, tatami: true });
    r.drawFuton(-0.3, 0.2);
    r.drawTable(0, -1.05);
    if (!this.phoneUsed) r.drawPhone(0, -1.05, 1);
    r.drawThermometer(0.32, -1.05, ITEM_THERMO);
    r.drawFluorescent(0, -1.8, 1);
    const rot = this.doorPosition === 0 ? 0 : Math.PI / 2;
    const doorHighlight = this.phoneUsed && this.game.state.hasFlag('door_relocated');
    r.drawDoor(this.doorPos.x, this.doorPos.z, rot, doorHighlight);
  }

  update(dt) {
    this.breathPhase += dt;
    const playerPos = this.game.player.getPosition();
    const nearest = this.getNearestInteractable(playerPos);
    const phoneDist = Math.abs(playerPos.z - (-1.05));

    if (nearest?.userData.id === 'phone' || nearest?.userData.id === 'door' || nearest?.userData.id === 'thermometer') {
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
    this.game.clearSceneCallbacks();
  }
}
