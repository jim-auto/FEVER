/**
 * FEVER 環境音 — 音楽と環境音を分けない。Web Audio API で procedural 生成。
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.initialized = false;
    this.preset = null;
    this.muted = false;
    this.reduced = false;
    this.tinnitusEnabled = false;
    this.layers = {};
    this.motifTimer = 0;
    this.beepTimer = 0;
    this.breathPhase = 0;
    this.heartPhase = 0;
  }

  unlock() {
    if (this.initialized) return;
    const ctx = new AudioContext();
    this.ctx = ctx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 12;
    compressor.ratio.value = 3;
    compressor.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(compressor);

    this.createLayers();
    this.initialized = true;
    this.setPreset('home');
  }

  createLayers() {
    const ctx = this.ctx;
    const bus = this.master;

    this.layers.fluorescent = this.createFluorescent(ctx, bus);
    this.layers.breath = this.createBreath(ctx, bus);
    this.layers.heart = this.createHeart(ctx, bus);
    this.layers.city = this.createCity(ctx, bus);
    this.layers.ac = this.createAC(ctx, bus);
    this.layers.tinnitus = this.createTinnitus(ctx, bus);
  }

  createFluorescent(ctx, bus) {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(bus);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 60;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 120;

    const g1 = ctx.createGain();
    g1.gain.value = 0.018;
    const g2 = ctx.createGain();
    g2.gain.value = 0.006;

    osc1.connect(g1).connect(gain);
    osc2.connect(g2).connect(gain);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.3;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.004;
    lfo.connect(lfoG).connect(g1.gain);
    lfo.start();

    osc1.start();
    osc2.start();

    return { gain };
  }

  createBreath(ctx, bus) {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(bus);

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.8;

    const mod = ctx.createGain();
    mod.gain.value = 0.012;

    source.connect(filter).connect(mod).connect(gain);
    source.start();

    return { gain, mod, filter };
  }

  createHeart(ctx, bus) {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(bus);
    return { gain };
  }

  createCity(ctx, bus) {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(bus);

    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    const g = ctx.createGain();
    g.gain.value = 0.04;

    source.connect(filter).connect(g).connect(gain);
    source.start();

    return { gain };
  }

  createAC(ctx, bus) {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(bus);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 90;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;

    const g = ctx.createGain();
    g.gain.value = 0.008;

    osc.connect(filter).connect(g).connect(gain);
    osc.start();

    return { gain };
  }

  createTinnitus(ctx, bus) {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(bus);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 4200;
    const g = ctx.createGain();
    g.gain.value = 0.003;
    osc.connect(g).connect(gain);
    osc.start();

    return { gain };
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.85, this.ctx.currentTime, 0.1);
    }
  }

  setReduced(reduced) {
    this.reduced = reduced;
    if (this.preset) this.applyPresetVolumes(this.preset);
  }

  setTinnitus(enabled) {
    this.tinnitusEnabled = enabled;
    if (this.preset) this.applyPresetVolumes(this.preset);
  }

  setPreset(name) {
    if (!this.initialized) return;
    this.preset = name;
    this.applyPresetVolumes(name);
  }

  applyPresetVolumes(name) {
    const scale = this.reduced ? 0.45 : 1;
    const vols = PRESETS[name] ?? PRESETS.home;

    for (const [key, layer] of Object.entries(this.layers)) {
      let target = (vols[key] ?? 0) * scale;
      if (key === 'tinnitus' && !this.tinnitusEnabled) target = 0;
      layer.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 1.8);
    }
  }

  playHeartBeat() {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.15 * (this.reduced ? 0.5 : 1), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(g).connect(this.layers.heart.gain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  playTone(freq, duration, volume = 0.08, type = 'sine') {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume * (this.reduced ? 0.5 : 1), t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  playHospitalMotif(intensity = 1) {
    const notes = [523.25, 659.25, 783.99];
    const vol = 0.04 * intensity * (this.reduced ? 0.5 : 1);
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.6, vol), i * 280);
    });
  }

  playCrosswalkBeep() {
    this.playTone(880, 0.08, 0.06, 'square');
    setTimeout(() => this.playTone(880, 0.08, 0.05, 'square'), 120);
  }

  playCrosswalkDeny() {
    this.playTone(440, 0.15, 0.07, 'sawtooth');
    setTimeout(() => this.playTone(330, 0.2, 0.06, 'sawtooth'), 180);
  }

  playPhoneRing() {
    if (!this.initialized || this.muted) return;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.playTone(480, 0.15, 0.05);
        setTimeout(() => this.playTone(620, 0.15, 0.04), 160);
      }, i * 600);
    }
  }

  playCough() {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const dur = 0.18;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.value = 0.12 * (this.reduced ? 0.5 : 1);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
  }

  playWaterDrink() {
    this.playTone(600, 0.05, 0.03);
    setTimeout(() => this.playTone(800, 0.08, 0.025), 60);
  }

  playWorldAccept() {
    this.playHospitalMotif(0.6);
  }

  playFootstepRumble() {
    if (!this.initialized || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(40, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06 * (this.reduced ? 0.5 : 1), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  update(dt, state, body) {
    if (!this.initialized || this.muted) return;

    this.breathPhase += dt;
    const breathLayer = this.layers.breath;
    if (body?.isBreathHeld?.()) {
      breathLayer.mod.gain.setTargetAtTime(0.001, this.ctx.currentTime, 0.15);
    } else {
      const breathRate = 0.4 + (state.temperature - 37) * 0.05;
      const mod = 0.008 + Math.max(0, Math.sin(this.breathPhase * breathRate * Math.PI * 2)) * 0.014;
      breathLayer.mod.gain.setTargetAtTime(mod, this.ctx.currentTime, 0.1);
    }

    const bpm = 70 + (state.temperature - 37) * 8;
    this.heartPhase += dt;
    const beatInterval = 60 / bpm;
    if (this.heartPhase >= beatInterval) {
      this.heartPhase -= beatInterval;
      this.playHeartBeat();
    }

    if (this.preset === 'crosswalk' || this.preset === 'crosswalk_sunset') {
      this.beepTimer += dt;
      if (this.beepTimer > 2.8) {
        this.beepTimer = 0;
        this.playCrosswalkBeep();
      }
    }

    this.motifTimer += dt;
    if (this.motifTimer > 18) {
      this.motifTimer = 0;
      const intensity = {
        home: 0.3, stairs: 0.4, crosswalk: 0.5, crosswalk_sunset: 0.45,
        pharmacy: 0.6, nurse: 0.7, finale: 1.0,
      }[this.preset] ?? 0.3;
      if (intensity > 0) this.playHospitalMotif(intensity);
    }

    if (this.layers.fluorescent && this.preset === 'home') {
      const flicker = 0.35 + Math.sin(this.breathPhase * 3.1) * 0.02;
      this.layers.fluorescent.gain.gain.setTargetAtTime(
        flicker * (this.reduced ? 0.45 : 1),
        this.ctx.currentTime,
        0.05,
      );
    }
  }
}

const PRESETS = {
  home: { fluorescent: 0.35, breath: 0.22, heart: 0.18, city: 0.05, ac: 0.12, tinnitus: 0 },
  stairs: { fluorescent: 0.4, breath: 0.2, heart: 0.2, city: 0.12, ac: 0.15, tinnitus: 0 },
  crosswalk: { fluorescent: 0.05, breath: 0.18, heart: 0.22, city: 0.35, ac: 0.08, tinnitus: 0 },
  crosswalk_sunset: { fluorescent: 0.02, breath: 0.2, heart: 0.2, city: 0.25, ac: 0.05, tinnitus: 0 },
  pharmacy: { fluorescent: 0.25, breath: 0.15, heart: 0.18, city: 0.08, ac: 0.35, tinnitus: 0 },
  nurse: { fluorescent: 0.08, breath: 0.2, heart: 0.25, city: 0.3, ac: 0.1, tinnitus: 0 },
  finale: { fluorescent: 0.1, breath: 0.18, heart: 0.28, city: 0.2, ac: 0.08, tinnitus: 0.08 },
};
