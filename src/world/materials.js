import * as THREE from 'three';

export function createMaterials() {
  return {
    wallPaper: new THREE.MeshStandardMaterial({
      color: 0xe8e2d4,
      roughness: 0.92,
      metalness: 0,
    }),
    wallPaperWet: new THREE.MeshStandardMaterial({
      color: 0xd8d0c0,
      roughness: 0.75,
      metalness: 0.05,
    }),
    vinylFloor: new THREE.MeshStandardMaterial({
      color: 0xc8d9cc,
      roughness: 0.55,
      metalness: 0.08,
    }),
    fluorescent: new THREE.MeshStandardMaterial({
      color: 0xf4f6f0,
      emissive: 0xf4f6f0,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    }),
    wood: new THREE.MeshStandardMaterial({
      color: 0xb8a890,
      roughness: 0.85,
    }),
    plasticWhite: new THREE.MeshStandardMaterial({
      color: 0xeceae4,
      roughness: 0.4,
      metalness: 0.05,
    }),
    door: new THREE.MeshStandardMaterial({
      color: 0xc4b8a8,
      roughness: 0.7,
    }),
    thermometer: new THREE.MeshStandardMaterial({
      color: 0xe8b4a8,
      emissive: 0xe8b4a8,
      emissiveIntensity: 0.15,
      roughness: 0.35,
    }),
    phone: new THREE.MeshStandardMaterial({
      color: 0x3a4048,
      roughness: 0.5,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0xd0dce8,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
    }),
    asphalt: new THREE.MeshStandardMaterial({
      color: 0x3a4048,
      roughness: 0.95,
      metalness: 0,
    }),
    crosswalk: new THREE.MeshStandardMaterial({
      color: 0xf4f6f0,
      roughness: 0.8,
    }),
    signalRed: new THREE.MeshStandardMaterial({
      color: 0xb84040,
      emissive: 0xb84040,
      emissiveIntensity: 0.5,
      roughness: 0.4,
    }),
    signalGreen: new THREE.MeshStandardMaterial({
      color: 0x5a9a6a,
      emissive: 0x5a9a6a,
      emissiveIntensity: 0.3,
      roughness: 0.4,
    }),
    scheduleRed: new THREE.MeshStandardMaterial({
      color: 0xd05050,
      roughness: 0.7,
    }),
  };
}

export function setupLighting(scene) {
  const ambient = new THREE.AmbientLight(0xf4f6f0, 0.35);
  scene.add(ambient);

  const main = new THREE.DirectionalLight(0xf4f6f0, 0.55);
  main.position.set(2, 4, 1);
  scene.add(main);

  const fill = new THREE.PointLight(0xc8d9cc, 0.4, 8);
  fill.position.set(-1, 2.2, -1);
  scene.add(fill);
}

export function buildRoom(group, materials, size = { w: 3.6, h: 2.4, d: 3.6 }) {
  const { w, h, d } = size;
  const wallGeo = new THREE.PlaneGeometry(w, h);
  const floorGeo = new THREE.PlaneGeometry(w, d);

  const floor = new THREE.Mesh(floorGeo, materials.vinylFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const backWall = new THREE.Mesh(wallGeo, materials.wallPaper);
  backWall.position.set(0, h / 2, -d / 2);
  group.add(backWall);

  const frontWall = new THREE.Mesh(wallGeo, materials.wallPaper);
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

  const ceiling = new THREE.Mesh(floorGeo, materials.plasticWhite);
  ceiling.position.y = h;
  ceiling.rotation.x = Math.PI / 2;
  group.add(ceiling);

  return { floor, backWall, frontWall, leftWall, rightWall, ceiling, bounds: { w, h, d } };
}

export function createInteractableMesh(geometry, material, userData = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData = { interactable: true, ...userData };
  return mesh;
}
