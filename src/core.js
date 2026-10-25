/* VERDIGRIS — core utilities */
window.VG = window.VG || {};
(function (VG) {
  'use strict';

  /* ---------- seeded RNG (mulberry32) ---------- */
  VG.makeRng = function (seed) {
    let a = (seed >>> 0) || 1;
    const f = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = (lo, hi) => lo + f() * (hi - lo);
    f.int = (lo, hi) => Math.floor(lo + f() * (hi - lo + 1));
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.chance = (p) => f() < p;
    f.shuffle = (arr) => {
      const b = arr.slice();
      for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); const t = b[i]; b[i] = b[j]; b[j] = t; }
      return b;
    };
    f.weighted = function (entries) {
      let total = 0;
      for (const e of entries) total += e[1];
      let r = f() * total;
      for (const e of entries) { r -= e[1]; if (r <= 0) return e[0]; }
      return entries[entries.length - 1][0];
    };
    return f;
  };

  /* ---------- math ---------- */
  VG.clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  VG.lerp = (a, b, t) => a + (b - a) * t;
  VG.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  VG.dist2 = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; };
  VG.smooth = (t) => t * t * (3 - 2 * t);
  VG.TAU = Math.PI * 2;

  /* The eight compass points, clockwise from east. Screen space has +y
     pointing south, so a bearing of 0 is east and 90 degrees is south. */
  VG.COMPASS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];

  /* The compass point for a direction. One helper, so the way you are
     facing and the way the door lies can never disagree with each other. */
  VG.compassDir = (dx, dy) => {
    const a = ((Math.atan2(dy, dx) * 180 / Math.PI) % 360 + 360) % 360;
    return VG.COMPASS[Math.round(a / 45) % 8];
  };

  VG.hexToRgb = function (h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  VG.rgbToHex = function (r, g, b) {
    const c = (v) => VG.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  };
  VG.mix = function (c1, c2, t) {
    const a = VG.hexToRgb(c1), b = VG.hexToRgb(c2);
    return VG.rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  };
  VG.shade = function (hex, amt) {
    const a = VG.hexToRgb(hex);
    return amt >= 0
      ? VG.rgbToHex(a[0] + (255 - a[0]) * amt, a[1] + (255 - a[1]) * amt, a[2] + (255 - a[2]) * amt)
      : VG.rgbToHex(a[0] * (1 + amt), a[1] * (1 + amt), a[2] * (1 + amt));
  };

  /* ---------- deterministic value noise ---------- */
  VG.hash2 = function (x, y, seed) {
    let h = ((x | 0) * 73856093) ^ ((y | 0) * 19349663) ^ ((seed | 0) * 83492791);
    h = h ^ (h >>> 13);
    h = Math.imul(h, 1274126177);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  };
  VG.noise2 = function (x, y,seed) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const u = VG.smooth(x - xi), v = VG.smooth(y - yi);
    const a = VG.hash2(xi, yi, seed), b = VG.hash2(xi + 1, yi, seed);
    const c = VG.hash2(xi, yi + 1, seed), d = VG.hash2(xi + 1, yi + 1, seed);
    return VG.lerp(VG.lerp(a, b, u), VG.lerp(c, d, u), v);
  };
  VG.fbm = function (x, y, seed, oct, lac, gain) {
    oct = oct || 4; lac = lac || 2.03; gain = gain || 0.5;
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) {
      sum += amp * VG.noise2(x * freq, y * freq, seed + i * 977);
      norm += amp; amp *= gain; freq *= lac;
    }
    return sum / norm;
  };

  /* ---------- misc ---------- */
  /* ---------- clock ---------- */
  /* The hour on the clock face, 0..24. The offset is load-bearing: raw
     state.time is NOT the wall clock. state.time 13824 reads as 12:00,
     state.time 32400 reads as 17:09, and 57024 is midnight. */
  VG.hourOfDay = function (t) {
    const s = ((t % 86400) + 86400) % 86400;
    return ((s / 86400) + 0.34) % 1 * 24;
  };
  /* night runs from 20:00 to 06:00 on the clock face */
  VG.isNight = function (t) {
    const h = VG.hourOfDay(t);
    return h >= 20 || h < 6;
  };
  VG.nowStamp = function () {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0');
  };
  VG.timeOfDay = function (t) {
    const h = VG.hourOfDay(t);
    const hh = Math.floor(h);
    const mm = Math.floor((h - hh) * 60);
    return { h: hh, m: mm, label: (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm };
  };
  VG.fmtTime = function (sec) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  };
  VG.titleCase = function (s) {
    return String(s).replace(/(^|[\s\-_/])([a-z])/g, (m, a, b) => a + b.toUpperCase());
  };
})(window.VG);
