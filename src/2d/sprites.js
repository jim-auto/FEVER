import { P } from './palette.js';

/** '.' = 透明 · 他は palette キー */
export const SPRITE_COLORS = {
  s: P.player,
  h: P.playerOutline,
  w: P.white,
  k: P.wood,
  b: P.phone,
  g: P.phoneGlow,
  r: P.red,
  n: P.nurse,
  c: P.cream,
  d: P.door,
  l: P.glass,
  y: P.clinical,
  t: P.text,
  a: P.asphalt,
};

export const PLAYER = {
  up: [
    [
      '..hh....',
      '.hhhh...',
      '..ss....',
      '.wwww...',
      '.w..w...',
      '..ww....',
      '.s..s...',
      '..ss....',
    ],
    [
      '..hh....',
      '.hhhh...',
      '..ss....',
      '.wwww...',
      '.w..w...',
      '..ww....',
      's....s..',
      '.s..s...',
    ],
  ],
  down: [
    [
      '..hh....',
      '.ssss...',
      '.ssss...',
      '.wwww...',
      '.w..w...',
      '..ww....',
      '.s..s...',
      '..ss....',
    ],
    [
      '..hh....',
      '.ssss...',
      '.ssss...',
      '.wwww...',
      '.w..w...',
      '..ww....',
      's....s..',
      '.s..s...',
    ],
  ],
  left: [
    [
      '...hh...',
      '..hhhh..',
      '..ss....',
      '.wwww...',
      '.w.w....',
      '..ww....',
      '.s.s....',
      '..ss....',
    ],
    [
      '...hh...',
      '..hhhh..',
      '..ss....',
      '.wwww...',
      '.w.w....',
      '..ww....',
      's..s....',
      '.s.s....',
    ],
  ],
  right: [
    [
      '...hh...',
      '..hhhh..',
      '....ss..',
      '...wwww.',
      '....w.w.',
      '....ww..',
      '....s.s.',
      '....ss..',
    ],
    [
      '...hh...',
      '..hhhh..',
      '....ss..',
      '...wwww.',
      '....w.w.',
      '....ww..',
      '....s..s',
      '....s.s.',
    ],
  ],
  lie: [
    [
      '........',
      '........',
      '..hhhh..',
      '.ssssss.',
      '.wwwwww.',
      '..ssss..',
      '........',
      '........',
    ],
  ],
};

export const NPC_RESIDENT = [
  '..hh..',
  '.cccc.',
  '.wwww.',
  '.w..w.',
  '.w..w.',
  '..ww..',
];

export const NPC_CHILD = [
  '.hh.',
  'cccc',
  'wwww',
  '.ww.',
];

export const NPC_WORKER = [
  '..hh..',
  '.cccc.',
  '.wwww.',
  '.w..w.',
  '..ww..',
];

export const ITEM_WATER = [
  '..ll..',
  '.llll.',
  '.llll.',
  '..ll..',
];

export const ITEM_THERMO = [
  '..r...',
  '..r...',
  '..r...',
  '.rrrr.',
];

export const ITEM_OUTSIDE = [
  '.gggg.',
  'ggllgg',
  'ggllgg',
  '.gggg.',
];

/** 移動ベクトルから向き */
export function facingFromDelta(dx, dz) {
  if (Math.abs(dx) > Math.abs(dz)) {
    return dx < 0 ? 'left' : 'right';
  }
  return dz < 0 ? 'up' : 'down';
}

export function facingFromAngle(angle) {
  const deg = ((angle * 180) / Math.PI + 360) % 360;
  if (deg >= 315 || deg < 45) return 'down';
  if (deg >= 45 && deg < 135) return 'right';
  if (deg >= 135 && deg < 225) return 'up';
  return 'left';
}
