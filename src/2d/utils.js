export function createPos(x = 0, y = 0, z = 0) {
  return {
    x,
    y,
    z,
    clone() {
      return createPos(this.x, this.y, this.z);
    },
    distanceTo(other) {
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dz = this.z - other.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },
  };
}

export function horizontalDistance(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function createInteractable({ id, label, x, z, range = 1.6 }) {
  return {
    id,
    label,
    x,
    z,
    range,
    userData: { id, label, interactable: true },
  };
}

export function nearestInteractable(playerPos, list, filterFn) {
  let nearest = null;
  let bestDist = Infinity;
  for (const obj of list) {
    if (filterFn && !filterFn(obj)) continue;
    const dist = horizontalDistance(playerPos, obj);
    const range = obj.range ?? 1.6;
    if (dist < range && dist < bestDist) {
      bestDist = dist;
      nearest = obj;
    }
  }
  return nearest;
}
