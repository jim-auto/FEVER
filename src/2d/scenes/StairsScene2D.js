import { Rule, temperatureToFloor, canAccessFloor } from '../../core/GameState.js';
import { P } from '../palette.js';
import { createInteractable, nearestInteractable, horizontalDistance } from '../utils.js';
import { NPC_RESIDENT, ITEM_WATER } from '../sprites.js';
import { CrosswalkScene2D } from './CrosswalkScene2D.js';
import { triggerReinterpret } from '../../core/Reinterpret.js';

const STAIR_LENGTH = 12;
const LANDINGS = [
  { floor: '4.0', z: 0 },
  { floor: '3.9', z: 5 },
  { floor: '3.8', z: 10 },
];

/**
 * 小数点階段 — ドット絵
 */
export class StairsScene2D {
  static audioPreset = 'stairs';

  constructor(game) {
    this.game = game;
    this.interactables = [];
    this.ruleDemonstrated = 0;
    this.npcTalked = false;
    this.handrailCooled = false;
    this.waterUsed = 0;
    this.blockedMsgCooldown = 0;
    this.blockCount = 0;
    this.reinterpreted = false;
    this.handrail = { x: -1.0, z: 5 };
  }

  load() {
    const { state, ui, renderer } = this.game;
    renderer.setBackground(P.void);

    state.registerRule(new Rule({
      id: 'decimal_floor',
      premise: '階数は体温の小数点で表される',
      scope: 'local',
    }));

    state.patientTicket.location = `${temperatureToFloor(state.temperature)}階`;
    ui.updatePatientTicket();
    ui.updateFeverLayer(state.feverLayer);

    this.interactables = [
      createInteractable({ id: 'water', label: '水を飲む', x: 0.45, z: 0.4, range: 2.2 }),
      createInteractable({ id: 'resident', label: '病区住民に話す', x: -0.6, z: -0.4, range: 1.6 }),
      createInteractable({ id: 'exit', label: '外へ出る', x: 0, z: 11.0, range: 1.6 }),
    ];

    this.game.onDrinkWater = () => this.drinkWater();
    this.game.player.setPosition(0, 0, 0);
    this.game.player.enable();
    this.runIntro();
  }

  async runIntro() {
    await this.game.ui.wait(4200);
    this.game.ui.showSubtitle({
      audio: '集合住宅の階段——いや、病棟の階段。案内板の数字が、小数点つきだ。',
      duration: 4800,
    });
    await this.game.ui.wait(3500);
    this.game.ui.showSubtitle({
      audio: `${temperatureToFloor(this.game.state.temperature)}階——体温と同じ数値が、階数になっている。`,
      duration: 5000,
    });
    await this.game.ui.wait(4200);
    this.game.ui.setObjective('階段を下る · 水/手すりで体温↓');
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
    ui.showSubtitle({
      audio: '手すりが冷たい。息を止めている間だけ、熱が移っていく。',
      duration: 4000,
    });
    this.game.state.getRule('decimal_floor')?.demonstrate();
  }

  getRequiredFloorForZ(z) {
    if (z < 2.0) return 4.0;
    if (z < 7.8) return 3.9;
    return 3.8;
  }

  canMoveToZ(z) {
    return canAccessFloor(this.game.state.temperature, this.getRequiredFloorForZ(z));
  }

  checkCollision(pos) {
    const w = 1.15;
    if (Math.abs(pos.x) > w) return false;
    if (pos.z < -1.5 || pos.z > 11.8) return false;

    if (!this.canMoveToZ(pos.z)) {
      if (this.blockedMsgCooldown <= 0) {
        this.blockedMsgCooldown = 2.5;
        this.blockCount += 1;
        this.showBlockedMessage(this.getRequiredFloorForZ(pos.z));
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
    const currentFloor = temperatureToFloor(state.temperature);

    if (this.ruleDemonstrated < 1 && !this.npcTalked) {
      ui.showSubtitle({
        audio: `階段が、${currentFloor}階相当の体温を${requiredFloor}階へ下ろそうとしない。`,
        text: 'E で水を飲む · 手すりで Space（息）',
        duration: 5000,
      });
    } else {
      ui.showSubtitle({
        audio: `${requiredFloor}階へ下りるには、体温を${requiredFloor}以下（${requiredFloor}階相当）にする。`,
        duration: 3500,
      });
    }
  }

  getNearestInteractable(playerPos) {
    return nearestInteractable(playerPos, this.interactables);
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
        speaker: '病区住民',
        audio: '「今日は4.0階が混んでいる。3.9なら空いてるよ——体温、下げてからね」',
        duration: 4800,
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
    ui.resetObjective();
    ui.showSubtitle({
      audio: '建物を出た。交差点の方から、信号の電子音が聞こえる。',
      duration: 3500,
    });
    await ui.wait(3000);
    this.game.changeScene(CrosswalkScene2D);
  }

  render(r) {
    const currentFloor = temperatureToFloor(this.game.state.temperature);
    r.drawStairs(2.4, STAIR_LENGTH, LANDINGS, currentFloor);
    r.drawHandrail(this.handrail.x, this.handrail.z, this.handrailCooled);
    r.drawNpc(-0.6, -0.4, NPC_RESIDENT);
    r.drawSpriteWorld(0.45, 0.4, ITEM_WATER, 1);
    r.drawDoor(0, 11.0);
    r.label(`体温 ${this.game.state.temperature.toFixed(1)}°C`, -1.0, -1.2, P.highlight);
  }

  update(dt) {
    this.blockedMsgCooldown = Math.max(0, this.blockedMsgCooldown - dt);

    if (this.game.body.isBreathHeld() && !this.handrailCooled) {
      const pos = this.game.player.getPosition();
      if (horizontalDistance(pos, this.handrail) < 2.0) {
        this.coolHandrail();
      }
    }

    const pos = this.game.player.getPosition();
    const nearest = this.getNearestInteractable(pos);
    if (nearest) {
      this.game.ui.showPrompt(`[E] ${nearest.userData.label}`);
    } else if (!this.canMoveToZ(pos.z + 1.2) && this.canMoveToZ(pos.z)) {
      this.game.ui.showPrompt('下の階へ — E で水 / 手すりで Space');
    } else if (pos.z < 9 && this.canMoveToZ(pos.z)) {
      this.game.ui.showPrompt('W で階段を下る');
    } else {
      this.game.ui.hidePrompt();
    }

    if (pos.z > 2 && !this.game.state.hasFlag('stairs_mid')) {
      this.game.state.addFlag('stairs_mid');
    }
  }

  unload() {
    this.game.onDrinkWater = null;
  }
}
