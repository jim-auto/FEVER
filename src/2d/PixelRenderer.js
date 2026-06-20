import { P } from './palette.js';
import { SPRITE_COLORS, PLAYER, facingFromAngle, ITEM_OUTSIDE } from './sprites.js';
import { FeverLayer } from '../core/GameState.js';
import { VIEW_WIDTH, VIEW_HEIGHT, PIXEL_UNIT, SPRITE_SCALE, MIN_DISPLAY_SCALE } from './viewConfig.js';

const FEVER_TINTS = {
  [FeverLayer.LOW]: 'rgba(200, 217, 204, 0.06)',
  [FeverLayer.CHILL]: 'rgba(196, 184, 204, 0.12)',
  [FeverLayer.HEAT]: 'rgba(232, 180, 168, 0.18)',
  [FeverLayer.WHITE]: 'rgba(255, 248, 240, 0.28)',
};

export class PixelRenderer {
  constructor(canvas, width = VIEW_WIDTH, height = VIEW_HEIGHT) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.unit = PIXEL_UNIT;
    this.sceneZoom = 1;
    this.camera = { x: 0, z: 0 };
    this.scale = 1;
    this.bg = P.void;
    this.flicker = 0;
    this.feverLayer = FeverLayer.WHITE;
    this.particles = [];
    this.fixedScale = null;
    this.shakeTimer = 0;
    this.shakeMag = 0;

    this.buffer = document.createElement('canvas');
    this.buffer.width = width;
    this.buffer.height = height;
    this.ctx = this.buffer.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.outCtx = canvas.getContext('2d');
    this.outCtx.imageSmoothingEnabled = false;
    this.resize();
  }

  get effectiveUnit() {
    return this.unit * this.sceneZoom;
  }

  get dot() {
    return this.effectiveUnit / 8;
  }

  get spriteScale() {
    return SPRITE_SCALE * this.sceneZoom;
  }

  setZoom(zoom) {
    this.sceneZoom = zoom;
  }

  resize() {
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    const scale = this.fixedScale ?? Math.max(
      MIN_DISPLAY_SCALE,
      Math.floor(Math.min(sw / this.width, sh / this.height)),
    );
    this.scale = scale;
    this.canvas.width = this.width * scale;
    this.canvas.height = this.height * scale;
    this.canvas.style.width = `${this.width * scale}px`;
    this.canvas.style.height = `${this.height * scale}px`;
  }

  setFixedScale(scale) {
    this.fixedScale = scale;
    this.resize();
  }

  shake(magnitude = 0.06, duration = 0.2) {
    this.shakeMag = magnitude;
    this.shakeTimer = duration;
  }

  updateShake(dt) {
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }
  }

  getShakeOffset() {
    if (this.shakeTimer <= 0) return { x: 0, y: 0 };
    const t = this.shakeTimer;
    return {
      x: (Math.random() - 0.5) * this.shakeMag * t * this.effectiveUnit * 12,
      y: (Math.random() - 0.5) * this.shakeMag * t * this.effectiveUnit * 12,
    };
  }

  setCamera(x, z) {
    this.camera.x = x;
    this.camera.z = z;
  }

  setBackground(color) {
    this.bg = color;
  }

  setFeverLayer(layer) {
    this.feverLayer = layer;
  }

  beginFrame() {
    this.ctx.fillStyle = this.bg;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.flicker += 0.05;
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) p.life -= 1;
  }

  endFrame() {
    this.outCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.outCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.outCtx.drawImage(
      this.buffer,
      0,
      0,
      this.width,
      this.height,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
  }

  worldToScreen(wx, wz) {
    const cx = this.width / 2;
    const cz = this.height / 2;
    const shake = this.getShakeOffset();
    return {
      x: Math.round(cx + (wx - this.camera.x) * this.effectiveUnit + shake.x),
      y: Math.round(cz + (wz - this.camera.z) * this.effectiveUnit + shake.y),
    };
  }

  px(x, y, w, h, color) {
    if (!color) return;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  rectWorld(wx, wz, ww, wh, color) {
    const { x, y } = this.worldToScreen(wx, wz);
    this.px(x - (ww * this.effectiveUnit) / 2, y - (wh * this.effectiveUnit) / 2, ww * this.effectiveUnit, wh * this.effectiveUnit, color);
  }

  /** スプライトをスクリーン座標に描画 */
  drawSprite(rows, sx, sy, scale = 1) {
    for (let row = 0; row < rows.length; row++) {
      for (let col = 0; col < rows[row].length; col++) {
        const ch = rows[row][col];
        const color = SPRITE_COLORS[ch];
        if (color) {
          this.px(sx + col * scale, sy + row * scale, scale, scale, color);
        }
      }
    }
  }

  drawSpriteWorld(wx, wz, rows, scale) {
    const s = scale ?? this.spriteScale;
    const { x, y } = this.worldToScreen(wx, wz);
    const w = rows[0].length * scale;
    const h = rows.length * scale;
    this.drawSprite(rows, x - w / 2, y - h / 2, scale);
  }

  label(text, wx, wz, color = P.fluorescent) {
    const { x, y } = this.worldToScreen(wx, wz);
    this.ctx.font = `${Math.max(4, Math.round(5 * this.dot))}px monospace`;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x, y);
  }

  /** 畳模様 */
  drawTatami(bounds) {
    const { w, d } = bounds;
    const hw = w / 2;
    const hd = d / 2;
    for (let tx = -hw + 0.5; tx < hw; tx += 1.0) {
      for (let tz = -hd + 0.5; tz < hd; tz += 1.0) {
        const shade = ((Math.floor(tx) + Math.floor(tz)) % 2 === 0) ? P.cream : P.wallDark;
        this.rectWorld(tx, tz, 0.95, 0.95, shade);
        this.rectWorld(tx, tz, 0.85, 0.85, shade === P.cream ? P.cream : P.wall);
      }
    }
  }

  drawRoom(bounds, options = {}) {
    const { w, d } = bounds;
    const hw = w / 2;
    const hd = d / 2;
    const wallColor = options.wall ?? P.wall;
    const floorColor = options.floor ?? P.floorLight;

    if (options.tatami) {
      this.drawTatami(bounds);
    } else {
      this.rectWorld(0, 0, w, d, floorColor);
    }

    this.rectWorld(-hw, 0, 0.12, d, wallColor);
    this.rectWorld(hw, 0, 0.12, d, wallColor);
    this.rectWorld(0, -hd, w, 0.12, wallColor);
    this.rectWorld(0, hd, w, 0.12, wallColor);

    if (options.sweat) {
      const pulse = 0.03 + Math.sin(this.flicker * 0.7) * 0.015;
      if (pulse > 0.035) {
        this.rectWorld(-hw + 0.06, 0, 0.04, d * 0.6, P.sweat);
        this.rectWorld(hw - 0.06, 0, 0.04, d * 0.4, P.sweat);
      }
    }
  }

  drawFluorescent(wx, wz, intensity = 1) {
    const flick = 0.5 + Math.sin(this.flicker * 3.1) * 0.08 * intensity;
    this.rectWorld(wx, wz, 0.8, 0.06, P.fluorescent);
    const { x, y } = this.worldToScreen(wx, wz);
    const d = this.dot;
    this.ctx.fillStyle = `rgba(244, 246, 240, ${0.06 * flick})`;
    this.ctx.fillRect(x - 24 * d, y - 36 * d, 48 * d, 48 * d);
  }

  drawDoor(wx, wz, rot = 0, highlight = false) {
    const { x, y } = this.worldToScreen(wx, wz);
    const d = this.dot;
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(rot);
    this.px(-3 * d, -7 * d, 6 * d, 14 * d, highlight ? P.highlight : P.door);
    this.px(-2 * d, -5 * d, 4 * d, 10 * d, P.wood);
    this.px(1 * d, 0, 1 * d, 1 * d, P.woodLight);
    this.ctx.restore();
  }

  drawPhone(wx, wz, pulse = 1) {
    const { x, y } = this.worldToScreen(wx, wz);
    const d = this.dot;
    const glow = 0.35 + Math.sin(this.flicker * 2.4) * 0.2 * pulse;
    this.px(x - 8 * d, y - 2 * d, 16 * d, 6 * d, P.phone);
    this.px(x - 6 * d, y - 5 * d, 10 * d, 3 * d, P.phoneGlow);
    this.px(x + 2 * d, y - 4 * d, 6 * d, 8 * d, P.phone);
    if (pulse > 0) {
      this.ctx.fillStyle = `rgba(168, 210, 255, ${glow * 0.4})`;
      this.ctx.fillRect(x - 14 * d, y - 12 * d, 28 * d, 20 * d);
    }
  }

  drawFuton(wx, wz) {
    this.rectWorld(wx, wz, 1.6, 2.0, P.white);
    this.rectWorld(wx - 0.3, wz, 0.5, 1.8, P.cream);
    this.rectWorld(wx + 0.4, wz + 0.3, 0.6, 1.2, P.wall);
  }

  drawTable(wx, wz) {
    this.rectWorld(wx, wz, 0.9, 0.55, P.wood);
    this.rectWorld(wx, wz - 0.15, 0.7, 0.08, P.woodLight);
  }

  drawThermometer(wx, wz, rows) {
    if (rows) {
      this.drawSpriteWorld(wx, wz - 0.1, rows);
    } else {
      this.rectWorld(wx, wz, 0.08, 0.25, P.red);
    }
  }

  drawPlayer(wx, wz, { dir = 0, bob = 0, facing = null, walkFrame = 0, lying = false, moving = false } = {}) {
    const face = lying ? 'lie' : (facing ?? facingFromAngle(dir));
    const frames = PLAYER[face] ?? PLAYER.down;
    const frame = lying ? 0 : walkFrame % frames.length;
    const scale = this.spriteScale;
    const { x, y } = this.worldToScreen(wx, wz);
    const by = y + (lying ? 2 * this.dot : bob);
    this.drawSprite(frames[frame], x - (frames[frame][0].length * scale) / 2, by - (frames[frame].length * scale) / 2, scale);

    if (moving && !lying) {
      this.spawnParticle(wx, wz, P.floorLight);
    }
  }

  spawnParticle(wx, wz, color) {
    if (this.particles.length > 24) return;
    const { x, y } = this.worldToScreen(wx, wz);
    this.particles.push({
      x: x + (Math.random() - 0.5) * 4,
      y: y + 2,
      color,
      life: 8,
      max: 8,
    });
  }

  drawParticles() {
    for (const p of this.particles) {
      const alpha = p.life / p.max;
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = alpha * 0.6;
      this.px(p.x, p.y, 2 * this.dot, 2 * this.dot, p.color);
      p.y += 0.3;
    }
    this.ctx.globalAlpha = 1;
  }

  drawStairs(w, length, landings, currentFloor) {
    this.rectWorld(0, length / 2 - 0.5, w, length, P.floor);
    this.rectWorld(-w / 2, length / 2 - 0.5, 0.1, length, P.wall);
    this.rectWorld(w / 2, length / 2 - 0.5, 0.1, length, P.wall);

    for (let z = 0; z < length; z += 0.8) {
      const shade = z % 1.6 < 0.8 ? P.floorLight : P.floor;
      this.rectWorld(0, z - length / 2 + 0.5, w - 0.2, 0.35, shade);
    }

    for (const { floor, z } of landings) {
      const wz = z - length / 2 + 0.5;
      const active = floor === currentFloor;
      this.rectWorld(0, wz, w - 0.3, 0.5, active ? P.clinical : P.floorLight);
      this.label(`${floor}階`, 0.9, wz, active ? P.highlight : P.text);
      if (active) {
        this.rectWorld(0, wz, w - 0.5, 0.55, null);
        const { x, y } = this.worldToScreen(0, wz);
        this.ctx.strokeStyle = P.highlight;
        this.ctx.globalAlpha = 0.35 + Math.sin(this.flicker * 2) * 0.15;
        this.ctx.strokeRect(x - (w - 0.5) * this.effectiveUnit / 2, y - 2, (w - 0.5) * this.effectiveUnit, 4);
        this.ctx.globalAlpha = 1;
      }
    }
  }

  drawHandrail(wx, wz, cooled = false) {
    this.rectWorld(wx, wz, 0.08, 2.5, cooled ? P.glass : P.wood);
    if (cooled) {
      const { x, y } = this.worldToScreen(wx, wz);
      const d = this.dot;
      this.ctx.fillStyle = 'rgba(136, 187, 238, 0.25)';
      this.ctx.fillRect(x - 4 * d, y - 12 * d, 8 * d, 24 * d);
    }
  }

  drawNpc(wx, wz, sprite, color = P.white) {
    if (sprite) {
      this.drawSpriteWorld(wx, wz, sprite, this.spriteScale);
    } else {
      this.rectWorld(wx, wz, 0.5, 0.5, color);
      const d = this.dot;
      this.px(this.worldToScreen(wx, wz).x - 2 * d, this.worldToScreen(wx, wz).y - 5 * d, 4 * d, 4 * d, P.cream);
    }
  }

  drawCrosswalk(roadW, roadD, stripeWarp = 0) {
    this.rectWorld(0, 0, roadW, roadD, P.asphalt);
    this.rectWorld(0, -roadD / 2 + 3, roadW, 6, P.floorLight);
    this.rectWorld(0, roadD / 2 - 3, roadW, 6, P.floorLight);
    for (let i = -3; i <= 3; i++) {
      const { x, y } = this.worldToScreen(i * 0.7 + stripeWarp * i, 0);
      const d = this.dot;
      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(stripeWarp * 0.3);
      this.px(-2 * d, -9 * d, 4 * d, 18 * d, P.crosswalk);
      this.ctx.restore();
    }
  }

  drawSignal(wx, wz, state) {
    this.rectWorld(wx, wz, 0.15, 1.2, P.white);
    const c = state === 'red' ? P.red : P.green;
    const { x, y } = this.worldToScreen(wx, wz);
    const d = this.dot;
    this.px(x - 2 * d, y - 5 * d, 4 * d, 4 * d, c);
    if (state === 'red') {
      this.ctx.fillStyle = `rgba(200, 64, 64, ${0.15 + Math.sin(this.flicker * 4) * 0.08})`;
      this.ctx.fillRect(x - 6 * d, y - 10 * d, 12 * d, 12 * d);
    }
  }

  drawPharmacy(r, shelfAngle = 0) {
    this.rectWorld(0, 0, r * 2, r * 2, P.pharmacy);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + shelfAngle;
      const wx = Math.cos(a) * r;
      const wz = Math.sin(a) * r;
      this.rectWorld(wx, wz, 0.12, 2.2, P.white);
    }
    this.label('さむけ', 0, -2.5, P.text);
    this.rectWorld(0, 0, 1.6, 1.6, P.wood);
    const d = this.dot;
    this.ctx.save();
    const { x, y } = this.worldToScreen(0, 0);
    this.ctx.translate(x, y);
    this.ctx.rotate(shelfAngle);
    this.px(-6 * d, -1 * d, 12 * d, 2 * d, P.woodLight);
    this.px(-1 * d, -6 * d, 2 * d, 12 * d, P.woodLight);
    this.ctx.restore();
  }

  drawShelfItem(wx, wz, label, highlight = false) {
    if (highlight) {
      this.drawSpriteWorld(wx, wz, ITEM_OUTSIDE);
    } else {
      this.rectWorld(wx, wz, 0.35, 0.45, P.white);
    }
    if (label) this.label(label, wx, wz + 0.5, highlight ? P.highlight : P.text);
  }

  drawStreet(w, length) {
    this.rectWorld(0, -length / 2 + 5, w, length, P.floor);
    this.rectWorld(-w / 2 + 1.5, -length / 2 + 5, 2, length, P.floorLight);
    this.rectWorld(w / 2 - 1.5, -length / 2 + 5, 2, length, P.floorLight);
    // 天井蛍光灯
    for (let z = -15; z < 8; z += 4) {
      this.drawFluorescent(0, z, 0.6);
    }
  }

  drawGiantNurse(wx, wz, shadowSway = 0) {
    this.rectWorld(wx - 0.8, wz, 1.2, 8, P.nurse);
    this.rectWorld(wx + 0.8, wz, 1.2, 8, P.nurse);
    this.rectWorld(wx, wz + 4, 2.8, 0.4, P.nurse);
    this.rectWorld(wx - 2 + shadowSway, wz, 6, 14, P.shadow);
    this.rectWorld(wx - 5.2 + shadowSway, wz, 1.2, 14, P.shadowGap);
    // ナース帽
    this.rectWorld(wx, wz - 3.5, 1.0, 0.3, P.white);
    this.rectWorld(wx, wz - 3.2, 0.4, 0.15, P.red);
  }

  drawHospital(wx, wz, phase = 0, walkPhase = 0) {
    const ox = phase > 0 ? Math.sin(Date.now() * 0.001) * 0.5 : 0;
    this.rectWorld(wx + ox, wz, 8, 6, P.white);
    for (let i = 0; i < 4; i++) {
      const legBob = phase >= 3 ? Math.sin(walkPhase + i) * 0.3 : 0;
      this.rectWorld(wx - 3 + i * 2 + ox, wz + 3 + legBob, 0.4, 2.5, P.white);
    }
    this.rectWorld(wx + ox, wz + 2.5, 0.8, 0.8, P.red);
    if (phase >= 2) {
      this.label('歩行中', wx + ox, wz - 3.5, P.red);
    }
  }

  drawPlaza() {
    this.rectWorld(0, 0, 30, 30, P.clinical);
    for (let x = -12; x <= 12; x += 3) {
      for (let z = -12; z <= 12; z += 3) {
        const c = (x + z) % 6 === 0 ? P.floorLight : P.clinical;
        this.rectWorld(x, z, 2.8, 2.8, c);
      }
    }
  }

  drawInteractMarker(wx, wz) {
    const bob = Math.sin(this.flicker * 3) * 2 * this.dot;
    const { x, y } = this.worldToScreen(wx, wz);
    const my = y - 10 * this.dot + bob;
    const d = this.dot;
    this.px(x - 1 * d, my, 2 * d, 2 * d, P.highlight);
    this.px(x - 2 * d, my + 2 * d, 4 * d, 2 * d, P.highlight);
    this.ctx.fillStyle = 'rgba(168, 210, 255, 0.3)';
    this.ctx.fillRect(x - 4 * d, my - 2 * d, 8 * d, 8 * d);
  }

  drawFeverOverlay() {
    const tint = FEVER_TINTS[this.feverLayer];
    if (!tint) return;
    this.ctx.fillStyle = tint;
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (this.feverLayer === FeverLayer.WHITE) {
      const pulse = 0.04 + Math.sin(this.flicker * 2.5) * 0.03;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
    if (this.feverLayer === FeverLayer.CHILL) {
      this.ctx.fillStyle = `rgba(180, 200, 220, ${0.03 + Math.sin(this.flicker) * 0.02})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  drawBreathHeldOverlay() {
    this.ctx.fillStyle = 'rgba(136, 187, 238, 0.08)';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawVignette(intensity = 0.15) {
    const g = this.ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      20,
      this.width / 2,
      this.height / 2,
      120,
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${intensity})`);
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawSceneTitle(text) {
    this.ctx.font = `${Math.max(4, Math.round(5 * this.dot))}px monospace`;
    this.ctx.fillStyle = 'rgba(244, 246, 240, 0.55)';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(text, 6, 10);
  }

  drawScanlines() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    for (let y = 0; y < this.height; y += 2) {
      this.ctx.fillRect(0, y, this.width, 1);
    }
  }
}
