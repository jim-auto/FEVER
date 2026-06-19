import * as THREE from 'three';

/** 床面オブジェクトとの距離（Y を無視） */
export function horizontalDistance(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

export function getWorldXZ(mesh) {
  const v = new THREE.Vector3();
  mesh.getWorldPosition(v);
  return v;
}
