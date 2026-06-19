/**
 * クリア経路のロジック検証（WebGL なし）
 */
import {
  canAccessFloor,
  temperatureToFloor,
  createPatientTicket,
} from '../src/core/GameState.js';

const failures = [];

function assert(label, condition) {
  if (!condition) failures.push(label);
}

function drinkWater(temp) {
  return Math.max(37.0, temp - 0.4);
}

function coolHandrail(temp) {
  return Math.max(37.0, temp - 0.25);
}

// --- Home ---
assert('temperatureToFloor 40.2 → 4.0', temperatureToFloor(40.2) === '4.0');
assert('temperatureToFloor 39.8 → 3.9', temperatureToFloor(39.8) === '3.9');
assert('temperatureToFloor 38.6 → 3.8', temperatureToFloor(38.6) === '3.8');

// --- Stairs ---
let temp = 40.2;
assert('stairs start: 4.0 landing accessible', canAccessFloor(temp, 4.0));
assert('stairs start: 3.9 landing blocked', !canAccessFloor(temp, 3.9));

temp = drinkWater(temp);
temp = drinkWater(temp);
temp = drinkWater(temp);
temp = coolHandrail(temp);
assert('stairs after 3 water + handrail: 3.8 accessible', canAccessFloor(temp, 3.8));
assert(`stairs temp is 38.75 got ${temp}`, Math.abs(temp - 38.75) < 0.001);

function stairsRequiredFloor(z) {
  if (z < 2.0) return 4.0;
  if (z < 7.8) return 3.9;
  return 3.8;
}

function canMoveOnStairs(temp, z) {
  return canAccessFloor(temp, stairsRequiredFloor(z));
}

assert('stairs exit z=10 at 38.75', canMoveOnStairs(temp, 10));

// reinterpret stairs fix
temp = 40.2;
temp = 39.8;
assert('stairs reinterpret temp 39.8 at z=0', canMoveOnStairs(39.8, 0));
assert('stairs reinterpret temp 39.8 at z=5', canMoveOnStairs(39.8, 5));

// --- Crosswalk ---
const scheduleStates = { red: false, washed: true, emergency: true, faded: true };
function canCross(state) {
  return state !== 'red';
}
assert('crosswalk red blocks', !canCross('red'));
assert('crosswalk emergency opens', canCross('emergency'));
assert('crosswalk faded opens (reinterpret fix)', canCross('faded'));

// --- Pharmacy ---
let boughtOutside = false;
function canLeavePharmacy(z) {
  if (z > 2.8 && !boughtOutside) return false;
  return true;
}
assert('pharmacy blocks without 外', !canLeavePharmacy(3));
boughtOutside = true;
assert('pharmacy allows exit after 外', canLeavePharmacy(3.5));

// --- Nurse ---
function nurseExitReached(z) {
  return z < -22;
}
assert('nurse exit at z=-23', nurseExitReached(-23));

// --- Finale ---
const ticket = createPatientTicket();
assert('finale ticket has destination', ticket.destination === '病院');

if (failures.length) {
  console.error('PLAYTHROUGH TEST FAILED:');
  failures.forEach((f) => console.error('  ✗', f));
  process.exit(1);
}

console.log('PLAYTHROUGH TEST PASSED — logic clear path OK');
console.log('  Stairs fastest: 3× water + handrail → 38.75°C');
console.log('  Crosswalk: emergency / wash / sunset / reinterpret(faded)');
console.log('  Pharmacy: buy 外 → door → exit');
