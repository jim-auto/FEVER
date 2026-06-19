/** 発熱レイヤー — 世界の存在方式を切り替える */
export const FeverLayer = {
  LOW: 'low',
  CHILL: 'chill',
  HEAT: 'heat',
  WHITE: 'white',
};

export const FEVER_THRESHOLDS = [
  { max: 37.5, layer: FeverLayer.LOW },
  { max: 38.5, layer: FeverLayer.CHILL },
  { max: 39.8, layer: FeverLayer.HEAT },
  { max: Infinity, layer: FeverLayer.WHITE },
];

export function temperatureToLayer(temp) {
  for (const { max, layer } of FEVER_THRESHOLDS) {
    if (temp < max) return layer;
  }
  return FeverLayer.WHITE;
}

/** 体温から階数表示を導出 — 39.4°C → 3.9階 */
export function temperatureToFloor(temp) {
  return (Math.floor(temp * 10) / 10).toFixed(1);
}

/** 指定階へアクセス可能か（体温が階数以下） */
export function canAccessFloor(temp, targetFloor) {
  return parseFloat(temperatureToFloor(temp)) <= parseFloat(targetFloor) + 0.001;
}

export const Classification = {
  PATIENT: '患者',
  VISITOR: '訪問者',
  RETURNING: '帰宅者',
  LATE: '遅刻者',
  CHILD: '子ども',
  LUGGAGE: '荷物',
  AMBULANCE: '救急車',
  COMPANION: '付き添い',
  ABSENT: '不在者',
};

export function createPatientTicket(overrides = {}) {
  return {
    name: '——',
    location: '自宅',
    destination: '病院',
    temperature: 40.2,
    status: Classification.VISITOR,
    appointment: '——',
    companion: '——',
    reason: '発熱',
    ...overrides,
  };
}

export class Rule {
  constructor({ id, premise, scope = 'local', demonstrations = 0 }) {
    this.id = id;
    this.premise = premise;
    this.scope = scope;
    this.demonstrations = demonstrations;
    this.residuals = [];
  }

  demonstrate() {
    this.demonstrations += 1;
  }

  isEstablished() {
    return this.demonstrations >= 2;
  }

  addResidual(effect) {
    this.residuals.push(effect);
  }
}

export class GameState {
  constructor() {
    this.temperature = 40.2;
    this.feverLayer = temperatureToLayer(this.temperature);
    this.patientTicket = createPatientTicket();
    this.rules = new Map();
    this.flags = new Set();
    this.reinterpretCount = 0;
    this.forgottenDetails = [];
    this.objective = '病院へ行く';
  }

  setTemperature(temp) {
    this.temperature = temp;
    this.patientTicket.temperature = temp;
    this.feverLayer = temperatureToLayer(temp);
  }

  setClassification(status) {
    this.patientTicket.status = status;
  }

  registerRule(rule) {
    this.rules.set(rule.id, rule);
  }

  getRule(id) {
    return this.rules.get(id);
  }

  addFlag(flag) {
    this.flags.add(flag);
  }

  hasFlag(flag) {
    return this.flags.has(flag);
  }

  reinterpret(changes = {}) {
    this.reinterpretCount += 1;
    Object.assign(this.patientTicket, changes);
  }

  forgetDetail(detail) {
    this.forgottenDetails.push(detail);
  }
}
