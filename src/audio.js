/* VERDIGRIS - audio.
   Every sound is synthesised live with the Web Audio API. There are no asset
   files anywhere in this project: the game stays a single folder of plain
   scripts that run from file:// with nothing to install.

   Ambience is reactive. The drone opens up at night, wind rises in a haze
   storm, and a reactor hum fades in as you approach Copper Mesa Station.  */
window.VG = window.VG || {};
(function (VG) {
  'use strict';

  const A = {
    ctx: null,
    master: null,
    musicBus: null,
    musicVol: null,
    windVol: null,
    sfxBus: null,
    noiseBuf: null,
    ready: false,
    started: false,
    muted: false,
    /* four independent buses: the mixer, the music, the wind, and the effects */
    vol: { master: 0.85, music: 0.75, sfx: 0.45, wind: 0.6 },
    stepPhase: 0,
    stepAccum: 0,
    motifAt: 0,
    motifStep: 0,
    motifPhrase: [],
    reactorNear: 0,
    night: false,
    haze: false,
    lastStep: 0
  };
  VG.Audio = A;

  const PENTA = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];

  function readStore(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function writeStore(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }

  /* ---------- lifecycle ---------- */

  A.init = function () {
    if (A.ctx) {
      if (A.ctx.state === 'suspended' && A.ctx.resume) A.ctx.resume();
      return A.ready;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return false;
    try { A.ctx = new Ctor(); } catch (e) { return false; }
    try { build(); } catch (e) { A.ctx = null; return false; }
    A.ready = true;
    A.started = true;
    if (A.ctx.state === 'suspended' && A.ctx.resume) A.ctx.resume();
    return true;
  };

  function build() {
    const c = A.ctx;

    A.master = c.createGain();
    A.master.gain.value = A.muted ? 0 : A.vol.master;
    A.master.connect(c.destination);
    target.master = A.muted ? 0 : A.vol.master;

    /* music runs through two nodes: the bus that the sources feed, and a
       separate volume node the slider owns. Keeping them apart means the
       slider still works while the game is paused on the options panel. */
    A.musicBus = c.createGain();
    A.musicBus.gain.value = 0;
    A.musicVol = c.createGain();
    A.musicVol.gain.value = A.vol.music;
    target.music = A.vol.music;
    A.musicBus.connect(A.musicVol);
    A.musicVol.connect(A.master);

    /* the wind is a layer of its own, not part of the music: you can keep the
       music and drop the wind entirely */
    A.windVol = c.createGain();
    A.windVol.gain.value = A.vol.wind;
    target.wind = A.vol.wind;
    A.windVol.connect(A.master);

    A.sfxBus = c.createGain();
    A.sfxBus.gain.value = A.vol.sfx;
    target.sfx = A.vol.sfx;
    A.sfxBus.connect(A.master);

    /* a short feedback delay gives the flats some size */
    A.delay = c.createDelay(1.0);
    A.delay.delayTime.value = 0.46;
    A.fb = c.createGain();
    A.fb.gain.value = 0.34;
    A.damp = c.createBiquadFilter();
    A.damp.type = 'lowpass';
    A.damp.frequency.value = 1800;
    A.delay.connect(A.damp);
    A.damp.connect(A.fb);
    A.fb.connect(A.delay);
    A.delay.connect(A.musicBus);

    /* shared white-noise buffer. Six seconds so the loop does not read as a
       repeating hiss. */
    const len = Math.floor(c.sampleRate * 6);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    A.noiseBuf = buf;

    buildDrone();
    buildWind();
    buildHum();

    /* fade the music in rather than slamming it on — a single ramp event, so
       nothing stacks up behind it */
    A.musicBus.gain.setValueAtTime(0, c.currentTime);
    A.musicBus.gain.linearRampToValueAtTime(1, c.currentTime + 7);
  }

  function buildDrone() {
    const c = A.ctx;
    A.droneFilter = c.createBiquadFilter();
    A.droneFilter.type = 'lowpass';
    A.droneFilter.frequency.value = 230;
    A.droneFilter.Q.value = 2.5;
    A.droneFilter.connect(A.musicBus);

    const mk = (type, freq, detune, gain) => {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      const g = c.createGain();
      g.gain.value = gain;
      o.connect(g);
      g.connect(A.droneFilter);
      o.start();
      return o;
    };
    mk('triangle', 55, 0, 0.13);
    mk('triangle', 82.41, 6, 0.085);
    mk('sine', 110, -4, 0.05);

    /* slow sweep across the drone filter */
    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.045;
    const lg = c.createGain();
    lg.gain.value = 120;
    lfo.connect(lg);
    lg.connect(A.droneFilter.frequency);
    lfo.start();

    /* a second, slower swell on the drone level */
    const amp = c.createOscillator();
    amp.type = 'sine';
    amp.frequency.value = 0.027;
    const ag = c.createGain();
    ag.gain.value = 0.035;
    amp.connect(ag);
    ag.connect(A.droneFilter.detune);
    amp.start();
  }

  function buildWind() {
    const c = A.ctx;
    const src = c.createBufferSource();
    src.buffer = A.noiseBuf;
    src.loop = true;
    A.windBand = c.createBiquadFilter();
    A.windBand.type = 'bandpass';
    A.windBand.frequency.value = 480;
    A.windBand.Q.value = 0.7;
    /* a lowpass after the band takes the edge off, so it reads as moving air
       instead of television static */
    A.windSoft = c.createBiquadFilter();
    A.windSoft.type = 'lowpass';
    A.windSoft.frequency.value = 1250;
    A.windGain = c.createGain();
    A.windGain.gain.value = 0.022;
    src.connect(A.windBand);
    A.windBand.connect(A.windSoft);
    A.windSoft.connect(A.windGain);
    A.windGain.connect(A.windVol);
    src.start();

    /* the band drifts, the level breathes, and a slow gust rides on top of it */
    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.083;
    const lg = c.createGain();
    lg.gain.value = 240;
    lfo.connect(lg);
    lg.connect(A.windBand.frequency);
    lfo.start();

    const alfo = c.createOscillator();
    alfo.type = 'sine';
    alfo.frequency.value = 0.043;
    const ag = c.createGain();
    ag.gain.value = 0.009;
    alfo.connect(ag);
    ag.connect(A.windGain.gain);
    alfo.start();

    const gust = c.createOscillator();
    gust.type = 'sine';
    gust.frequency.value = 0.0135;
    const gg = c.createGain();
    gg.gain.value = 0.007;
    gust.connect(gg);
    gg.connect(A.windGain.gain);
    gust.start();
  }

  function buildHum() {
    const c = A.ctx;
    A.humGain = c.createGain();
    A.humGain.gain.value = 0;
    A.humGain.connect(A.musicBus);
    const mk = (f, g) => {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const gg = c.createGain();
      gg.gain.value = g;
      o.connect(gg);
      gg.connect(A.humGain);
      o.start();
    };
    mk(120, 0.5);
    mk(180, 0.22);
    mk(60, 0.35);
  }

  /* ---------- primitives ---------- */

  function now() { return A.ctx.currentTime; }

  function noiseSource() {
    const s = A.ctx.createBufferSource();
    s.buffer = A.noiseBuf;
    s.loop = true;
    s.playbackRate.value = 0.8 + Math.random() * 0.5;
    return s;
  }

  /* one-shot oscillator with an envelope */
  function tone(opts) {
    if (!A.ready) return;
    const c = A.ctx;
    const t = now() + (opts.when || 0);
    const o = c.createOscillator();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(opts.freq, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t + (opts.dur || 0.3));
    if (opts.detune) o.detune.value = opts.detune;
    const g = c.createGain();
    const peak = opts.gain == null ? 0.1 : opts.gain;
    const atk = opts.attack == null ? 0.008 : opts.attack;
    const dur = opts.dur || 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let tail = o;
    if (opts.filter) {
      const f = c.createBiquadFilter();
      f.type = opts.filter;
      f.frequency.value = opts.cutoff || 1200;
      o.connect(f);
      tail = f;
    }
    tail.connect(g);
    g.connect(opts.bus || A.sfxBus);
    if (opts.send) g.connect(A.delay);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /* one-shot filtered noise */
  function noise(opts) {
    if (!A.ready) return;
    const c = A.ctx;
    const t = now() + (opts.when || 0);
    const s = noiseSource();
    const f = c.createBiquadFilter();
    f.type = opts.filter || 'bandpass';
    f.Q.value = opts.q == null ? 1 : opts.q;
    f.frequency.setValueAtTime(opts.freq || 1000, t);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(Math.max(60, opts.to), t + (opts.dur || 0.2));
    const g = c.createGain();
    const peak = opts.gain == null ? 0.08 : opts.gain;
    const dur = opts.dur || 0.15;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + (opts.attack || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(opts.bus || A.sfxBus);
    if (opts.send) g.connect(A.delay);
    s.start(t);
    s.stop(t + dur + 0.05);
  }

  /* ---------- sound effects ---------- */

  A.step = function () {
    A.stepPhase = (A.stepPhase + 1) % 2;
    noise({ filter: 'bandpass', freq: A.stepPhase ? 780 : 940, q: 1.4, gain: 0.045, dur: 0.075 });
    if (A.stepPhase === 0) tone({ type: 'sine', freq: 96, to: 62, gain: 0.028, dur: 0.07 });
  };

  A.open = function () {
    noise({ filter: 'lowpass', freq: 1900, to: 320, gain: 0.1, dur: 0.34 });
    tone({ type: 'sine', freq: 150, to: 88, gain: 0.05, dur: 0.14, when: 0.02 });
  };

  A.clue = function () {
    noise({ filter: 'highpass', freq: 2100, gain: 0.055, dur: 0.13 });
    noise({ filter: 'highpass', freq: 2700, gain: 0.04, dur: 0.1, when: 0.09 });
    tone({ type: 'triangle', freq: 1174, gain: 0.028, dur: 0.16, when: 0.02 });
  };

  A.deduct = function () {
    tone({ type: 'triangle', freq: 523.25, gain: 0.075, dur: 0.42, send: true });
    tone({ type: 'triangle', freq: 783.99, gain: 0.065, dur: 0.5, when: 0.11, send: true });
    tone({ type: 'sine', freq: 2093, gain: 0.022, dur: 0.3, when: 0.12 });
  };

  A.close = function () {
    tone({ type: 'sine', freq: 110, gain: 0.09, dur: 1.5, attack: 0.18, send: true });
    tone({ type: 'triangle', freq: 440, gain: 0.07, dur: 0.6, send: true });
    tone({ type: 'triangle', freq: 587.33, gain: 0.06, dur: 0.6, when: 0.16, send: true });
    tone({ type: 'triangle', freq: 349.23, gain: 0.065, dur: 1.0, when: 0.34, send: true });
  };

  A.deny = function () {
    tone({ type: 'square', freq: 92, gain: 0.045, dur: 0.17, filter: 'lowpass', cutoff: 420 });
    tone({ type: 'square', freq: 97, gain: 0.035, dur: 0.17, filter: 'lowpass', cutoff: 420 });
  };

  A.click = function () {
    noise({ filter: 'highpass', freq: 2600, gain: 0.028, dur: 0.035 });
  };

  A.shot = function () {
    noise({ filter: 'lowpass', freq: 4200, to: 240, gain: 0.2, dur: 0.13 });
    tone({ type: 'sine', freq: 170, to: 52, gain: 0.15, dur: 0.13 });
  };

  A.hit = function () {
    noise({ filter: 'bandpass', freq: 480, q: 1.1, gain: 0.1, dur: 0.09 });
    tone({ type: 'sine', freq: 120, to: 70, gain: 0.06, dur: 0.1 });
  };

  A.hurt = function () {
    tone({ type: 'sine', freq: 190, to: 64, gain: 0.15, dur: 0.26 });
    noise({ filter: 'lowpass', freq: 900, to: 220, gain: 0.09, dur: 0.2 });
  };

  A.pickup = function () {
    tone({ type: 'sine', freq: 1318.5, gain: 0.045, dur: 0.18 });
    tone({ type: 'sine', freq: 1975.5, gain: 0.028, dur: 0.14, when: 0.02 });
  };

  A.surprise = function () {
    const seq = [880, 1108.73, 1318.51, 1760];
    for (let i = 0; i < seq.length; i++) {
      tone({ type: 'triangle', freq: seq[i], gain: 0.075, dur: 0.42, when: i * 0.1, send: true });
    }
  };

  A.alert = function () {
    tone({ type: 'square', freq: 523, gain: 0.05, dur: 0.4, filter: 'bandpass', cutoff: 1200 });
    tone({ type: 'square', freq: 761, gain: 0.035, dur: 0.35, filter: 'bandpass', cutoff: 1400 });
    tone({ type: 'square', freq: 1093, gain: 0.025, dur: 0.3, filter: 'bandpass', cutoff: 1600 });
  };

  A.levelUp = function () {
    tone({ type: 'triangle', freq: 261.63, gain: 0.06, dur: 1.2, send: true });
    tone({ type: 'triangle', freq: 329.63, gain: 0.055, dur: 1.2, when: 0.08, send: true });
    tone({ type: 'triangle', freq: 392, gain: 0.05, dur: 1.4, when: 0.16, send: true });
  };

  /* ---------- music motif ---------- */

  function newPhrase() {
    const n = 2 + Math.floor(Math.random() * 3);
    const out = [];
    let idx = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      idx += Math.floor(Math.random() * 3) - 1;
      idx = Math.max(0, Math.min(PENTA.length - 1, idx));
      out.push({ f: PENTA[idx], w: 0.9 + Math.random() * 0.9 });
    }
    return out;
  }

  function playMotif() {
    const ph = A.motifPhrase;
    if (!ph.length) return;
    const step = ph[A.motifStep % ph.length];
    A.motifStep++;
    tone({ type: 'triangle', freq: step.f, gain: 0.075, dur: 1.5, attack: 0.05, bus: A.musicBus, send: true });
    tone({ type: 'sine', freq: step.f * 2, gain: 0.022, dur: 1.0, attack: 0.06, bus: A.musicBus });
    if (A.motifStep >= ph.length) {
      A.motifStep = 0;
      A.motifPhrase = newPhrase();
    }
  }

  /* ---------- per-frame update ---------- */

  /* Ambience parameters are written straight to the node and eased toward their
     target. Scheduling a ramp on every frame piles up automation events and
     leaves the param reporting a stale value, which is what made the mixer
     unreliable before. */
  function easeParam(param, goal, k) {
    if (!param) return;
    param.value += (goal - param.value) * k;
  }

  A.update = function (dt, info) {
    if (!A.ready) return;
    const c = A.ctx;
    const t = c.currentTime;

    info = info || {};
    A.night = !!info.night;
    A.haze = !!info.haze;

    /* the ambience reacts to the hour and the weather */
    const k = Math.min(1, dt / 0.7);
    const targetCut = A.night ? 165 : (A.haze ? 300 : 235);
    easeParam(A.droneFilter.frequency, targetCut, k);
    easeParam(A.windGain.gain, (A.haze ? 0.038 : 0.022), k);
    easeParam(A.windBand.Q, (A.haze ? 0.5 : 0.7), k);

    /* reactor hum rises as you approach the yard */
    const near = Math.max(0, Math.min(1, info.reactorNear || 0));
    A.reactorNear = near;
    easeParam(A.humGain.gain, near * 0.09, Math.min(1, dt / 0.5));

    /* footfalls */
    if (info.moved > 0) {
      A.stepAccum += info.moved;
      const stride = info.sprinting ? 34 : 26;
      if (A.stepAccum >= stride) {
        A.stepAccum = 0;
        if (t - A.lastStep > 0.12) {
          A.lastStep = t;
          A.step();
        }
      }
    } else {
      A.stepAccum = Math.min(A.stepAccum, 18);
    }

    /* sparse melody */
    A.motifAt -= dt;
    if (A.motifAt <= 0) {
      if (!A.motifPhrase.length) A.motifPhrase = newPhrase();
      playMotif();
      A.motifAt = 7 + Math.random() * 11;
    }
  };

  /* ---------- settings ---------- */

  /* Where each bus is heading.
     The mixer writes straight to the nodes. Scheduled ramps were tried first
     and left a bus stranded at a stale level when a slider was dragged, and a
     node that still has automation queued reports a stale .value — which is
     the one thing a mixer must never do. The write is eased over a few short
     steps by a timer that keeps running while the game is paused, so it lands
     softly and never clicks. */
  const target = { master: 0.85, music: 0.75, sfx: 0.45, wind: 0.6 };
  let easeTimer = null;

  function easeStep() {
    let moving = false;
    const step = (key, node) => {
      if (!node) return;
      const cur = node.gain.value;
      const d = target[key] - cur;
      if (Math.abs(d) < 0.003) {
        if (cur !== target[key]) node.gain.value = target[key];
        return;
      }
      moving = true;
      node.gain.value = cur + d * 0.35;
    };
    step('master', A.master);
    step('music', A.musicVol);
    step('wind', A.windVol);
    step('sfx', A.sfxBus);
    if (!moving && easeTimer) { clearInterval(easeTimer); easeTimer = null; }
  }

  /* push the current volume values onto the live graph */
  A.apply = function () {
    if (!A.ctx || !A.ready) return;
    target.master = A.muted ? 0 : A.vol.master;
    target.music = A.vol.music;
    target.wind = A.vol.wind;
    target.sfx = A.vol.sfx;
    if (!easeTimer) easeTimer = setInterval(easeStep, 25);
    easeStep();
  };

  A.setMuted = function (m) {
    A.muted = !!m;
    writeStore('verdigris.audio.muted', A.muted ? '1' : '0');
    A.apply();
    return A.muted;
  };

  A.toggleMute = function () { return A.setMuted(!A.muted); };

  function clampVol(v) { return Math.max(0, Math.min(1, v)); }

  function setVol(which, v) {
    A.vol[which] = clampVol(v);
    writeStore('verdigris.audio.' + which, String(A.vol[which]));
    A.apply();
    return A.vol[which];
  }

  A.setMaster = function (v) { return setVol('master', v); };
  A.setMusic = function (v) { return setVol('music', v); };
  A.setSfx = function (v) { return setVol('sfx', v); };
  A.setWind = function (v) { return setVol('wind', v); };

  /* legacy alias: the old single slider was the mixer */
  A.setVolume = function (v) { return A.setMaster(v); };

  A.loadSettings = function () {
    const m = readStore('verdigris.audio.muted');
    if (m === '1') A.muted = true;
    /* the old build stored one combined volume under a different key */
    const legacy = readStore('verdigris.audio.volume');
    for (const k of ['master', 'music', 'sfx', 'wind']) {
      const raw = readStore('verdigris.audio.' + k);
      if (raw !== null && !isNaN(parseFloat(raw))) A.vol[k] = clampVol(parseFloat(raw));
    }
    if (legacy !== null && !isNaN(parseFloat(legacy))) {
      A.vol.master = clampVol(parseFloat(legacy));
      A.vol.music = A.vol.master;
      A.vol.sfx = A.vol.master;
    }
  };

  A.status = function () {
    return {
      ready: A.ready,
      state: A.ctx ? A.ctx.state : 'none',
      muted: A.muted,
      master: A.vol.master,
      music: A.vol.music,
      sfx: A.vol.sfx,
      wind: A.vol.wind
    };
  };
})(window.VG);
