import { Classification, temperatureToFloor } from './GameState.js';

/** 失敗 = 再解釈。死亡ではなく、意味が変わる */
export const REINTERPRET_OUTCOMES = {
  stairs: [
    {
      message: '気を失い、別の踊り場で目を覚ました。階数の表示が、一つだけ違う。',
      changes: { location: '3.9階', status: Classification.ABSENT },
      temperature: 39.8,
      teleport: { x: 0, z: 0.5, y: 6 },
    },
    {
      message: '名前の欄が空になっている。体温計だけが、まだ自分を知っている。',
      changes: { name: '一時的に不在', location: '4.0階' },
      temperature: 40.0,
      teleport: { x: 0.5, z: 0, y: 6 },
    },
  ],
  crosswalk: [
    {
      message: '横断歩道の真ん中で立ちくらみ、向こう側のベンチで目を覚ました。予定表の赤が、少し薄れている。',
      changes: { location: '交差点・ベンチ', appointment: '薄赤' },
      teleport: { x: -1, z: -5 },
      openCrosswalk: true,
    },
  ],
  nurse: [
    {
      message: '巨大な靴音のあと、影の中で目を覚ました。ここは、さっきより少し先だ。',
      changes: { location: '看護師の影', companion: '影' },
      teleport: { x: 1, z: -5 },
    },
  ],
  pharmacy: [
    {
      message: 'カウンターでうたた寝をした。棚の向きが変わり、自分の身分表示も書き換わっていた。',
      changes: { status: Classification.PATIENT, location: '薬局・待合' },
      teleport: { x: 0, z: 0 },
      grantOutside: true,
    },
  ],
};

function applySceneEffects(game, sceneKey, outcome) {
  const scene = game.currentScene;
  if (!scene) return;

  if (outcome.openCrosswalk && scene.openCrosswalk) {
    scene.scheduleState = 'faded';
    scene.openCrosswalk();
  }

  if (outcome.grantOutside && sceneKey === 'pharmacy') {
    scene.boughtOutside = true;
    if (scene.door) scene.door.visible = true;
    game.state.addFlag('bought_outside');
  }
}

export function triggerReinterpret(game, sceneKey) {
  const pool = REINTERPRET_OUTCOMES[sceneKey];
  if (!pool?.length) return false;

  const idx = game.state.reinterpretCount % pool.length;
  const outcome = pool[idx];

  game.state.reinterpret(outcome.changes);

  if (outcome.temperature != null) {
    game.state.setTemperature(outcome.temperature);
    game.state.patientTicket.location = `${temperatureToFloor(outcome.temperature)}階`;
  }

  game.ui.updatePatientTicket();
  game.ui.updateFeverLayer(game.state.feverLayer);

  if (outcome.teleport) {
    const y = outcome.teleport.y ?? game.player.baseY;
    game.player.setPosition(outcome.teleport.x, y, outcome.teleport.z);
    if (outcome.teleport.y != null) game.player.baseY = y;
  }

  applySceneEffects(game, sceneKey, outcome);

  game.ui.showSubtitle({
    speaker: '——',
    audio: outcome.message,
    duration: 5500,
  });

  game.audio.playHospitalMotif(0.35);
  return true;
}
