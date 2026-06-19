import * as THREE from 'three';

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d') };
}

function toTexture(canvas, repeat) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (repeat) tex.repeat.set(repeat[0], repeat[1]);
  return tex;
}

function noise(ctx, w, h, alpha = 0.04) {
  for (let i = 0; i < w * h * 0.15; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const g = 200 + Math.random() * 40;
    ctx.fillStyle = `rgba(${g},${g},${g},${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }
}

export function createWallpaperTexture(wet = false) {
  const { canvas, ctx } = makeCanvas(512, 512);
  ctx.fillStyle = wet ? '#d4ccc0' : '#e8e2d4';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = wet ? 'rgba(160,150,140,0.25)' : 'rgba(180,170,155,0.35)';
  ctx.lineWidth = 1;
  for (let y = 0; y < 512; y += 32) {
    for (let x = 0; x < 512; x += 32) {
      ctx.strokeRect(x + 1, y + 1, 30, 30);
    }
  }

  if (wet) {
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * 512;
      const grad = ctx.createLinearGradient(x, 0, x + 30, 512);
      grad.addColorStop(0, 'rgba(120,130,140,0)');
      grad.addColorStop(0.5, 'rgba(100,115,130,0.18)');
      grad.addColorStop(1, 'rgba(120,130,140,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, 40, 512);
    }
  }

  for (let i = 0; i < 8; i++) {
    const x = 60 + Math.random() * 400;
    const y = 80 + Math.random() * 350;
    const r = 20 + Math.random() * 35;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, wet ? 'rgba(140,130,120,0.35)' : 'rgba(200,180,160,0.2)');
    grad.addColorStop(1, 'rgba(200,180,160,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  noise(ctx, 512, 512, wet ? 0.06 : 0.03);
  return toTexture(canvas, [2, 2]);
}

export function createVinylFloorTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);
  ctx.fillStyle = '#c8d9cc';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(140,160,145,0.45)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(120,140,125,${0.03 + Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 8 + Math.random() * 40, 2);
  }

  noise(ctx, 512, 512, 0.04);
  return toTexture(canvas, [3, 3]);
}

export function createAsphaltTexture(wet = true) {
  const { canvas, ctx } = makeCanvas(512, 512);
  ctx.fillStyle = '#3a4048';
  ctx.fillRect(0, 0, 512, 512);
  noise(ctx, 512, 512, 0.12);

  if (wet) {
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const w = 80 + Math.random() * 160;
      const h = 40 + Math.random() * 80;
      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, 'rgba(120,140,160,0.08)');
      grad.addColorStop(0.5, 'rgba(160,180,200,0.22)');
      grad.addColorStop(1, 'rgba(120,140,160,0.06)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
    }
  }

  return toTexture(canvas, [4, 4]);
}

export function createCeilingTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);
  ctx.fillStyle = '#eceae4';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(180,178,170,0.5)';
  for (let y = 0; y < 512; y += 64) {
    for (let x = 0; x < 512; x += 64) {
      ctx.strokeRect(x + 2, y + 2, 60, 60);
      ctx.fillStyle = 'rgba(220,218,210,0.4)';
      ctx.fillRect(x + 4, y + 4, 56, 56);
    }
  }
  noise(ctx, 512, 512, 0.03);
  return toTexture(canvas, [2, 2]);
}

export function createWoodTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#b8a890';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(140,120,100,${0.08 + Math.random() * 0.1})`;
    ctx.lineWidth = 1 + Math.random();
    ctx.beginPath();
    ctx.moveTo(0, i * 6 + Math.random() * 4);
    ctx.bezierCurveTo(80, i * 6 + 10, 180, i * 6 - 5, 256, i * 6 + 3);
    ctx.stroke();
  }
  return toTexture(canvas, [1, 1]);
}

export function createSkyGradientTexture(top, bottom) {
  const { canvas, ctx } = makeCanvas(512, 512);
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWindowCityTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#687080');
  grad.addColorStop(1, '#8898a8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 6; col++) {
      const lit = Math.random() > 0.45;
      ctx.fillStyle = lit ? 'rgba(244,240,220,0.7)' : 'rgba(50,55,65,0.8)';
      ctx.fillRect(16 + col * 38, 20 + row * 28, 28, 18);
    }
  }
  return toTexture(canvas, [1, 1]);
}
