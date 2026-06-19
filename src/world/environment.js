import * as THREE from 'three';
import {
  createWallpaperTexture,
  createVinylFloorTexture,
  createAsphaltTexture,
  createCeilingTexture,
  createWoodTexture,
  createSkyGradientTexture,
  createWindowCityTexture,
} from './textures.js';
import { createTextSprite } from './textLabels.js';

let tracked = [];

export function clearAtmosphere(scene) {
  for (const obj of tracked) {
    scene.remove(obj);
    obj.geometry?.dispose?.();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
      else obj.material.dispose?.();
    }
  }
  tracked = [];
}

function track(obj) {
  tracked.push(obj);
  return obj;
}

const PRESETS = {
  home: {
    sky: ['#1a2030', '#3a3540'],
    fog: { color: 0x2a2830, near: 4, far: 14 },
    ambient: 0xf4f6f0,
    ambientIntensity: 0.28,
    hemi: { sky: 0xc8d9cc, ground: 0x3a3540, intensity: 0.35 },
    main: { color: 0xfff8f0, intensity: 0.45, pos: [1.5, 3.5, 2] },
  },
  stairs: {
    sky: ['#252830', '#404550'],
    fog: { color: 0x2a2e38, near: 6, far: 22 },
    ambient: 0xe8ecf0,
    ambientIntensity: 0.25,
    hemi: { sky: 0xb0c0d0, ground: 0x353840, intensity: 0.4 },
    main: { color: 0xf4f6f0, intensity: 0.5, pos: [0, 8, 4] },
  },
  crosswalk: {
    sky: ['#c8d9cc', '#d8e0e8'],
    fog: { color: 0xd0dce4, near: 10, far: 42 },
    ambient: 0xf0f4f0,
    ambientIntensity: 0.52,
    hemi: { sky: 0xc8d9cc, ground: 0xb0b8c0, intensity: 0.62 },
    main: { color: 0xf4f6f0, intensity: 0.72, pos: [0, 10, 2] },
  },
  crosswalk_sunset: {
    sky: ['#4a5060', '#806060'],
    fog: { color: 0x605058, near: 12, far: 40 },
    ambient: 0xd0b8b0,
    ambientIntensity: 0.4,
    hemi: { sky: 0xc09080, ground: 0x403838, intensity: 0.5 },
    main: { color: 0xffd8c0, intensity: 0.5, pos: [-3, 8, 2] },
  },
  pharmacy: {
    sky: ['#d0d8e0', '#e8ecf0'],
    fog: { color: 0xd8dce4, near: 5, far: 16 },
    ambient: 0xf0f4f8,
    ambientIntensity: 0.5,
    hemi: { sky: 0xc8e0d8, ground: 0xc0c8d0, intensity: 0.6 },
    main: { color: 0xffffff, intensity: 0.55, pos: [0, 5, 2] },
  },
  nurse: {
    sky: ['#b8c8d8', '#d0d8e0'],
    fog: { color: 0xc0c8d0, near: 8, far: 36 },
    ambient: 0xe8f0ec,
    ambientIntensity: 0.48,
    hemi: { sky: 0xc8d9cc, ground: 0xa0a8b0, intensity: 0.58 },
    main: { color: 0xf4f6f0, intensity: 0.68, pos: [0, 12, 4] },
  },
  finale: {
    sky: ['#708090', '#a0a8b0'],
    fog: { color: 0x889098, near: 12, far: 50 },
    ambient: 0xe8ecf0,
    ambientIntensity: 0.4,
    hemi: { sky: 0xb0c0d0, ground: 0x505860, intensity: 0.55 },
    main: { color: 0xfff8f0, intensity: 0.6, pos: [0, 10, 8] },
  },
};

export function applyAtmosphere(scene, presetName) {
  clearAtmosphere(scene);
  const p = PRESETS[presetName] ?? PRESETS.home;

  const skyTex = createSkyGradientTexture(p.sky[0], p.sky[1]);
  const skyGeo = new THREE.SphereGeometry(48, 24, 12);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    fog: false,
  });
  scene.add(track(new THREE.Mesh(skyGeo, skyMat)));

  scene.background = null;
  scene.fog = new THREE.Fog(p.fog.color, p.fog.near, p.fog.far);

  scene.add(track(new THREE.AmbientLight(p.ambient, p.ambientIntensity)));

  const hemi = track(new THREE.HemisphereLight(p.hemi.sky, p.hemi.ground, p.hemi.intensity));
  scene.add(hemi);

  const dir = track(new THREE.DirectionalLight(p.main.color, p.main.intensity));
  dir.position.set(...p.main.pos);
  scene.add(dir);

  return presetName;
}

export function createMaterialSet() {
  return {
    wallPaper: new THREE.MeshStandardMaterial({
      map: createWallpaperTexture(false),
      roughness: 0.92,
      metalness: 0,
    }),
    wallPaperWet: new THREE.MeshStandardMaterial({
      map: createWallpaperTexture(true),
      roughness: 0.72,
      metalness: 0.04,
    }),
    vinylFloor: new THREE.MeshStandardMaterial({
      map: createVinylFloorTexture(),
      roughness: 0.48,
      metalness: 0.1,
    }),
    fluorescent: new THREE.MeshStandardMaterial({
      color: 0xf4f6f0,
      emissive: 0xf4f6f0,
      emissiveIntensity: 0.55,
      roughness: 0.25,
    }),
    wood: new THREE.MeshStandardMaterial({
      map: createWoodTexture(),
      roughness: 0.82,
    }),
    plasticWhite: new THREE.MeshStandardMaterial({
      color: 0xeceae4,
      roughness: 0.38,
      metalness: 0.04,
    }),
    door: new THREE.MeshStandardMaterial({
      color: 0xc4b8a8,
      roughness: 0.68,
    }),
    thermometer: new THREE.MeshStandardMaterial({
      color: 0xe8b4a8,
      emissive: 0xe8b4a8,
      emissiveIntensity: 0.18,
      roughness: 0.32,
    }),
    phone: new THREE.MeshStandardMaterial({
      color: 0x3a4048,
      roughness: 0.48,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0xd0dce8,
      transparent: true,
      opacity: 0.38,
      roughness: 0.08,
      metalness: 0.1,
    }),
    asphalt: new THREE.MeshStandardMaterial({
      map: createAsphaltTexture(true),
      roughness: 0.88,
      metalness: 0.05,
    }),
    crosswalk: new THREE.MeshStandardMaterial({
      color: 0xf4f6f0,
      roughness: 0.75,
    }),
    signalRed: new THREE.MeshStandardMaterial({
      color: 0xb84040,
      emissive: 0xb84040,
      emissiveIntensity: 0.55,
      roughness: 0.35,
    }),
    signalGreen: new THREE.MeshStandardMaterial({
      color: 0x5a9a6a,
      emissive: 0x5a9a6a,
      emissiveIntensity: 0.35,
      roughness: 0.35,
    }),
    scheduleRed: new THREE.MeshStandardMaterial({
      color: 0xd05050,
      roughness: 0.65,
    }),
    windowCity: new THREE.MeshStandardMaterial({
      map: createWindowCityTexture(),
      emissive: 0x888888,
      emissiveIntensity: 0.15,
      roughness: 0.2,
    }),
    clinicalGreen: new THREE.MeshStandardMaterial({
      color: 0xc8d9cc,
      roughness: 0.5,
      metalness: 0.05,
    }),
    coolingSheet: new THREE.MeshStandardMaterial({
      color: 0xd0e8f0,
      transparent: true,
      opacity: 0.85,
      roughness: 0.3,
    }),
    concrete: new THREE.MeshStandardMaterial({
      color: 0x9098a0,
      roughness: 0.95,
    }),
    building: new THREE.MeshStandardMaterial({
      color: 0x788088,
      roughness: 0.85,
    }),
    ceiling: new THREE.MeshStandardMaterial({
      map: createCeilingTexture(),
      roughness: 0.7,
    }),
  };
}

export function addFluorescent(group, materials, x, y, z, length = 0.8, rotY = 0) {
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(length, 0.05, 0.14),
    materials.plasticWhite,
  );
  housing.position.set(x, y, z);
  housing.rotation.y = rotY;

  const tube = new THREE.Mesh(
    new THREE.BoxGeometry(length * 0.92, 0.025, 0.08),
    materials.fluorescent,
  );
  tube.position.set(x, y - 0.02, z);
  tube.rotation.y = rotY;

  const light = new THREE.PointLight(0xf4f6f0, 0.35, 5);
  light.position.set(x, y - 0.05, z);

  group.add(housing, tube, light);
  return { tube, light };
}

export function addBaseboard(group, materials, w, d) {
  const mat = materials.wood;
  const boards = [
    [w, 0.08, 0.04, 0, 0.04, -d / 2],
    [w, 0.08, 0.04, 0, 0.04, d / 2],
    [0.04, 0.08, d, -w / 2, 0.04, 0],
    [0.04, 0.08, d, w / 2, 0.04, 0],
  ];
  for (const [bw, bh, bd, bx, by, bz] of boards) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
    b.position.set(bx, by, bz);
    group.add(b);
  }
}

export function addHomeDetails(group, materials) {
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(0.35, 0.25),
    materials.coolingSheet,
  );
  sheet.position.set(-0.55, 1.05, 0.15);
  group.add(sheet);

  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.03, 0.07, 10),
    materials.plasticWhite,
  );
  cup.position.set(0.65, 0.47, -0.55);
  group.add(cup);

  const calendar = new THREE.Mesh(
    new THREE.PlaneGeometry(0.35, 0.28),
    materials.plasticWhite,
  );
  calendar.position.set(-1.2, 1.65, -1.75);
  calendar.rotation.y = Math.PI / 2;
  group.add(calendar);

  const calRed = new THREE.Mesh(
    new THREE.PlaneGeometry(0.08, 0.06),
    materials.scheduleRed,
  );
  calRed.position.set(-1.19, 1.62, -1.75);
  calRed.rotation.y = Math.PI / 2;
  group.add(calRed);
}

export function addStairwellDetails(group, materials, w, totalLen) {
  for (const z of [2, 7, 11]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.7), materials.plasticWhite);
    frame.position.set(-w / 2 + 0.04, 1.8, z);
    group.add(frame);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), materials.windowCity);
    glass.position.set(-w / 2 + 0.07, 1.8, z);
    glass.rotation.y = Math.PI / 2;
    group.add(glass);
  }

  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, totalLen), materials.plasticWhite);
  rail.position.set(w / 2 - 0.15, 1.0, totalLen / 2 - 1);
  group.add(rail);

  for (let z = 0; z < totalLen; z += 2.5) {
    addFluorescent(group, materials, 0, 2.42, z - 1, 0.7);
  }
}

export function addStreetBuildings(group, materials) {
  const configs = [
    { x: -7, z: -4, w: 3, h: 12, d: 4 },
    { x: -7.5, z: 4, w: 2.5, h: 8, d: 3.5 },
    { x: 7, z: -2, w: 3.5, h: 15, d: 4 },
    { x: 6.5, z: 5, w: 2.8, h: 10, d: 3 },
  ];

  for (const c of configs) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), materials.building);
    b.position.set(c.x, c.h / 2, c.z);
    group.add(b);

    for (let row = 0; row < Math.floor(c.h / 1.8); row++) {
      for (let col = 0; col < Math.floor(c.w / 0.9); col++) {
        if (Math.random() > 0.55) continue;
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(0.35, 0.5),
          materials.windowCity,
        );
        win.position.set(c.x - c.w / 2 + 0.5 + col * 0.85, 1.2 + row * 1.8, c.z + c.d / 2 + 0.01);
        group.add(win);
      }
    }
  }

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 5, 6), materials.concrete);
  pole.position.set(-4.5, 2.5, -3);
  group.add(pole);

  const puddle = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 16),
    new THREE.MeshStandardMaterial({
      color: 0x607080,
      roughness: 0.15,
      metalness: 0.4,
      transparent: true,
      opacity: 0.55,
    }),
  );
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.set(-1.5, 0.015, -4);
  group.add(puddle);
}

/** 街＝病院 — 病棟棟・外来棟の外観 */
export function addHospitalWingBuildings(group, materials) {
  const configs = [
    { x: -7, z: -4, w: 3, h: 12, d: 4, wing: '外来A' },
    { x: -7.5, z: 4, w: 2.5, h: 8, d: 3.5, wing: '待合' },
    { x: 7, z: -2, w: 3.5, h: 15, d: 4, wing: '病棟B' },
    { x: 6.5, z: 5, w: 2.8, h: 10, d: 3, wing: '処置' },
  ];

  for (const c of configs) {
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(c.w, c.h, c.d),
      materials.plasticWhite,
    );
    b.position.set(c.x, c.h / 2, c.z);
    group.add(b);

    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(c.w + 0.02, 0.12, c.d + 0.02),
      materials.clinicalGreen,
    );
    stripe.position.set(c.x, c.h * 0.72, c.z);
    group.add(stripe);

    const sign = createTextSprite(c.wing, {
      fontSize: 32,
      width: 180,
      height: 64,
      bgColor: 'rgba(200, 217, 204, 0.95)',
      color: '#2a4048',
    });
    sign.position.set(c.x, c.h * 0.55, c.z + c.d / 2 + 0.08);
    sign.scale.set(0.9, 0.4, 1);
    group.add(sign);
  }

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 5, 6), materials.plasticWhite);
  pole.position.set(-4.5, 2.5, -3);
  group.add(pole);
}

/** 街路を外来廊下化 — 天井灯・案内板・待合ベンチ */
export function addHospitalCorridorDecor(group, materials, options = {}) {
  const {
    lightSpan = 18,
    lightStep = 3.5,
    lightY = 3.4,
    signs = [],
    benches = [],
    ivPoles = [],
  } = options;

  for (let z = -lightSpan / 2; z <= lightSpan / 2; z += lightStep) {
    addFluorescent(group, materials, 0, lightY, z, 1.4, Math.PI / 2);
  }

  const centerLine = new THREE.Mesh(
    new THREE.PlaneGeometry(0.15, lightSpan),
    new THREE.MeshStandardMaterial({
      color: 0xc8d9cc,
      emissive: 0xa8c0b0,
      emissiveIntensity: 0.15,
      roughness: 0.8,
    }),
  );
  centerLine.rotation.x = -Math.PI / 2;
  centerLine.position.y = 0.018;
  group.add(centerLine);

  for (const { text, x, y, z, scale = 1 } of signs) {
    const sign = createTextSprite(text, {
      fontSize: 30,
      width: 300,
      height: 80,
      bgColor: 'rgba(232, 226, 212, 0.95)',
      color: '#3a4850',
    });
    sign.position.set(x, y, z);
    sign.scale.set(scale, scale * 0.42, 1);
    group.add(sign);
  }

  for (const { x, z } of benches) {
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.45, 0.4),
      materials.plasticWhite,
    );
    bench.position.set(x, 0.22, z);
    group.add(bench);
    const num = createTextSprite('待', {
      fontSize: 28,
      width: 80,
      height: 64,
      bgColor: 'rgba(200, 217, 204, 0.9)',
    });
    num.position.set(x, 0.65, z);
    num.scale.set(0.35, 0.2, 1);
    group.add(num);
  }

  for (const { x, z } of ivPoles) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.03, 1.8, 6),
      materials.plasticWhite,
    );
    pole.position.set(x, 0.9, z);
    group.add(pole);
    const bag = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.18, 0.06),
      materials.glass,
    );
    bag.position.set(x, 1.5, z);
    group.add(bag);
  }
}

export function addNurseStreetSkyline(group, materials) {
  for (let i = 0; i < 10; i++) {
    const h = 8 + Math.random() * 18;
    const w = 2 + Math.random() * 2;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2.5), materials.building);
    b.position.set(-6 + i * 1.5, h / 2, -8 - Math.random() * 4);
    group.add(b);
  }

  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 4, 6), materials.concrete);
  lamp.position.set(-3, 2, 3);
  group.add(lamp);

  const lampGlow = new THREE.PointLight(0xffe8d0, 0.4, 8);
  lampGlow.position.set(-3, 3.5, 3);
  group.add(lampGlow);
}

export function addPharmacyDecor(group, materials) {
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.08), materials.signalGreen);
  cross.position.set(0, 2.5, -3.5);
  group.add(cross);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), materials.signalGreen);
  crossV.position.set(0, 2.5, -3.5);
  group.add(crossV);
}

export function buildRoom(group, materials, size = { w: 3.6, h: 2.4, d: 3.6 }) {
  const { w, h, d } = size;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), materials.vinylFloor);
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), materials.wallPaper);
  backWall.position.set(0, h / 2, -d / 2);
  group.add(backWall);

  const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), materials.wallPaper);
  frontWall.position.set(0, h / 2, d / 2);
  frontWall.rotation.y = Math.PI;
  group.add(frontWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(d, h), materials.wallPaperWet);
  leftWall.position.set(-w / 2, h / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  group.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(d, h), materials.wallPaper);
  rightWall.position.set(w / 2, h / 2, 0);
  rightWall.rotation.y = -Math.PI / 2;
  group.add(rightWall);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w, d), materials.ceiling);
  ceiling.position.y = h;
  ceiling.rotation.x = Math.PI / 2;
  group.add(ceiling);

  addBaseboard(group, materials, w, d);

  return { floor, backWall, frontWall, leftWall, rightWall, ceiling, bounds: { w, h, d } };
}

export function createInteractableMesh(geometry, material, userData = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData = { interactable: true, ...userData };
  return mesh;
}
