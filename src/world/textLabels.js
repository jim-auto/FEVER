import * as THREE from 'three';

export function createTextSprite(text, options = {}) {
  const {
    fontSize = 48,
    color = '#2a2e32',
    bgColor = 'rgba(232, 226, 212, 0.95)',
    padding = 16,
    width = 256,
    height = 128,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(42, 46, 50, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  ctx.fillStyle = color;
  ctx.font = `500 ${fontSize}px "Segoe UI", "Yu Gothic UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.8, 0.4, 1);
  sprite.userData.canvas = canvas;
  sprite.userData.ctx = ctx;
  sprite.userData.texture = texture;
  sprite.userData.opts = { fontSize, color, bgColor, padding, width, height };
  return sprite;
}

export function updateTextSprite(sprite, text) {
  const { ctx, texture, opts } = sprite.userData;
  const { width, height, fontSize, color, bgColor } = opts;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(42, 46, 50, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);
  ctx.fillStyle = color;
  ctx.font = `500 ${fontSize}px "Segoe UI", "Yu Gothic UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
  texture.needsUpdate = true;
}
