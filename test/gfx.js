/* VERDIGRIS — graphics contract test
   Run: node test/gfx.js
   Validates that the four graphics modules export the API the renderer calls,
   that every biome is visually distinct, that elevation actually reaches the
   screen, and that no module breaks the file:// loading rules. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

/* ---------- a recording 2d context, enough for the modules to run ---------- */
function makeCtx() {
  const calls = { fillRect: 0, fill: 0, stroke: 0, gradients: 0, images: 0 };
  const grad = { addColorStop: function () {} };
  const ctx = {
    canvas: null,
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1,
    globalCompositeOperation: 'source-over', lineCap: 'butt', lineJoin: 'miter',
    font: '10px sans-serif', textAlign: 'left', textBaseline: 'alphabetic',
    shadowBlur: 0, shadowColor: '#000', shadowOffsetX: 0, shadowOffsetY: 0,
    save: function () {}, restore: function () {},
    beginPath: function () {}, closePath: function () {},
    moveTo: function () {}, lineTo: function () {}, arc: function () {},
    ellipse: function () {}, rect: function () {}, arcTo: function () {},
    quadraticCurveTo: function () {}, bezierCurveTo: function () {},
    fill: function () { calls.fill++; }, stroke: function () { calls.stroke++; },
    fillRect: function () { calls.fillRect++; },
    strokeRect: function () {}, clearRect: function () {},
    clip: function () {}, translate: function () {}, rotate: function () {},
    scale: function () {}, setTransform: function () {}, transform: function () {},
    drawImage: function () { calls.images++; },
    createLinearGradient: function () { calls.gradients++; return grad; },
    createRadialGradient: function () { calls.gradients++; return grad; },
    createPattern: function () { return null; },
    createImageData: function (w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
    putImageData: function () {}, getImageData: function (x, y, w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    measureText: function () { return { width: 10 }; },
    fillText: function () {}, strokeText: function () {},
    setLineDash: function () {}, getLineDash: function () { return []; },
    getTransform: function () { return { a: 1, d: 1, e: 0, f: 0 }; }
  };
  ctx.__calls = calls;
  return ctx;
}

const ctx = makeCtx();
const canvasEl = { width: 1280, height: 720, getContext: function () { return ctx; }, style: {} };
ctx.canvas = canvasEl;

const sandbox = {
  window: {},
  console: console,
  performance: { now: function () { return Date.now(); } },
  Math: Math, JSON: JSON, Date: Date,
  document: {
    createElement: function (tag) {
      if (tag !== 'canvas') return { style: {} };
      return { width: 0, height: 0, getContext: function () { return makeCtx(); }, style: {} };
    },
    getElementById: function () { return null; }
  }
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function load(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { console.log('  MISSING ' + rel); return false; }
  vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p });
  return true;
}

let fail = 0;
const ok = function (cond, msg) {
  if (!cond) { console.log('  FAIL ' + msg); fail++; } else console.log('  ok   ' + msg);
};

console.log('== loading modules ==');
['src/core.js', 'src/world.js',
 'src/gfx_terrain.js', 'src/gfx_props.js', 'src/gfx_actors.js', 'src/gfx_atmos.js',
 'src/render.js'].forEach(function (f) {
  if (!load(f)) fail++;
});

const VG = sandbox.window.VG;
if (!VG) { console.log('FATAL: VG never defined'); process.exit(1); }
const GFX = VG.GFX;

console.log('\n== module api ==');
ok(!!GFX, 'VG.GFX namespace exists');
['paintTerrain', 'groundColor', 'terrainCache',
 'paintStructures', 'paintClutter', 'paintContainers', 'poiSilhouettes',
 'paintActors', 'actorLights',
 'paintLighting', 'paintAtmosphere', 'daylight'].forEach(function (fn) {
  ok(typeof GFX[fn] === 'function', 'GFX.' + fn + ' is a function');
});

/* ---------- world builders ---------- */
function mkWorld(seed, biomeIdx, elevFn) {
  const W = 24, H = 24;
  const biome = new Uint8Array(W * H);
  const elev = new Float32Array(W * H);
  const road = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      biome[y * W + x] = biomeIdx;
      elev[y * W + x] = elevFn ? elevFn(x, y) : 0.5;
    }
  }
  return {
    seed: seed, W: W, H: H, TILE: 32, biome: biome, elev: elev, road: road,
    pois: [], containers: [], clues: [], enemies: [],
    biomeAt: function (x, y) { return (x < 0 || y < 0 || x >= W || y >= H) ? 2 : biome[y * W + x]; },
    isRoad: function (x, y) { return (x < 0 || y < 0 || x >= W || y >= H) ? 0 : road[y * W + x]; }
  };
}

/* ---------- biome distinction ---------- */
console.log('\n== biome palettes ==');
const BIOME_COUNT = 8;
const colors = [];
for (let b = 0; b < BIOME_COUNT; b++) {
  const w = mkWorld(1000 + b, b, null);
  const c = GFX.groundColor(w, 12, 12);
  ok(/^#[0-9a-f]{6}$/i.test(c), 'biome ' + b + ' ground colour is a hex string (' + c + ')');
  colors.push(c);
}
const lum = function (hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const bl = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
};
const lums = colors.map(lum);
const lmin = Math.min.apply(null, lums), lmax = Math.max.apply(null, lums);
ok(lmax - lmin > 0.10, 'biomes span a visible luminance range (' +
  (lmax - lmin).toFixed(3) + ' > 0.10)');
for (let i = 0; i < BIOME_COUNT; i++) {
  for (let j = i + 1; j < BIOME_COUNT; j++) {
    if (colors[i] === colors[j]) {
      console.log('  FAIL biome ' + i + ' and biome ' + j + ' are the same colour ' + colors[i]);
      fail++;
    }
  }
}
ok(new Set(colors).size === BIOME_COUNT, 'all ' + BIOME_COUNT + ' biome colours are distinct');

/* ---------- elevation reaches the screen ---------- */
console.log('\n== hillshade ==');
const flat = mkWorld(77, 1, function () { return 0.5; });
const ramp = mkWorld(78, 1, function (x, y) { return 0.2 + x * 0.03; });
const cFlat = GFX.groundColor(flat, 12, 12);
const cRamp = GFX.groundColor(ramp, 12, 12);
ok(cFlat !== cRamp, 'elevation changes the ground colour (' + cFlat + ' vs ' + cRamp + ')');

/* ---------- terrain cache ---------- */
console.log('\n== terrain cache ==');
const cw = mkWorld(999, 3, null);
const c1 = GFX.terrainCache(cw);
/* NB: instanceof is unusable here — the module runs inside a vm context, so
   its Uint32Array is a different realm's constructor than this file's. */
const isU32 = (v) => Object.prototype.toString.call(v) === '[object Uint32Array]';
ok(isU32(c1), 'terrainCache returns a Uint32Array');
ok(c1.length === cw.W * cw.H, 'cache length ' + c1.length + ' matches ' + (cw.W * cw.H));
const c2 = GFX.terrainCache(cw);
ok(c1 === c2, 'terrainCache is reused for the same world (same instance)');
const cw2 = mkWorld(1234, 3, null);
const c3 = GFX.terrainCache(cw2);
ok(c1 !== c3, 'terrainCache rebuilds for a new world seed');

/* ---------- silhouettes ---------- */
console.log('\n== poi silhouettes ==');
const EXPECT = ['bank', 'bunker', 'camp', 'cannery', 'chapel', 'clinic', 'depot', 'diner',
  'foundry', 'garage', 'gas', 'guardhouse', 'hangar', 'hotel', 'house', 'library', 'market', 'mine',
  'mill', 'monument', 'observatory', 'police', 'radio_tower', 'reactor_yard', 'school',
  'shop', 'substation', 'theater', 'watertower', 'well'].sort();
const sil = GFX.poiSilhouettes ? GFX.poiSilhouettes() : {};
const got = Object.keys(sil).sort();
ok(got.length === EXPECT.length, 'silhouette count ' + got.length + ' (expect ' + EXPECT.length + ')');
const missing = EXPECT.filter(function (t) { return got.indexOf(t) < 0; });
const extra = got.filter(function (t) { return EXPECT.indexOf(t) < 0; });
ok(missing.length === 0, 'no missing silhouettes' + (missing.length ? ': ' + missing.join(', ') : ''));
ok(extra.length === 0, 'no unexpected silhouettes' + (extra.length ? ': ' + extra.join(', ') : ''));

/* ---------- draw calls do not throw ---------- */
console.log('\n== draw safety ==');
const dw = mkWorld(4242, 3, null);
dw.pois = [];
for (const t of EXPECT) dw.pois.push({ id: 'p' + t, type: t, x: 12, y: 12, name: t, tier: 2, containers: [], radius: 30, discovered: true });
dw.containers = [{ id: 'c0', x: 10, y: 10, poi: 'p0', tier: 1, opened: false, loot: null, name: null, clueId: 'cl1' },
                 { id: 'c1', x: 11, y: 11, poi: 'p0', tier: 1, opened: true, loot: null, name: null, clueId: null }];
dw.enemies = [{ id: 'e0', x: 13.5, y: 13.5, kind: 'rusted', hp: 70, maxhp: 70, dmg: 12, r: 11, aggro: 0, dead: false, home: { x: 13, y: 13 } },
               { id: 'e1', x: 14.5, y: 14.5, kind: 'drover', hp: 46, maxhp: 46, dmg: 9, r: 11, aggro: 1, dead: false, home: { x: 14, y: 14 } },
               { id: 'e2', x: 15.5, y: 15.5, kind: 'warden', hp: 120, maxhp: 120, dmg: 17, r: 11, aggro: 0, dead: false, home: { x: 15, y: 15 } },
               { id: 'e3', x: 16.5, y: 16.5, kind: 'rusted', hp: 0, maxhp: 70, dmg: 12, r: 11, aggro: 0, dead: true, home: { x: 16, y: 16 } }];
const cam = { x: 0, y: 0 };
const player = { x: 400, y: 400, r: 10, speed: 132, face: 0.7, hp: 100, maxhp: 100,
  stam: 100, food: 100, water: 100, dose: 0, weapon: 'wpn_scrap_torch', armor: null,
  moving: true, firing: 0, inv: {}, ammo: {}, hotbar: [null, null, null, null, null], sel: 0 };
const state = { time: 9 * 3600, bullets: [{ x: 410, y: 400, vx: 100, vy: 0, life: 1, dmg: 5 }], flash: 0, flare: 0, showCrosshair: true, paused: false };

try { GFX.paintTerrain(ctx, cam, dw); ok(true, 'paintTerrain runs'); } catch (e) { ok(false, 'paintTerrain threw: ' + e.message); }
try { GFX.paintClutter(ctx, cam, dw); ok(true, 'paintClutter runs'); } catch (e) { ok(false, 'paintClutter threw: ' + e.message); }
let lights = [];
try { GFX.paintStructures(ctx, cam, dw, { lights: lights }); ok(true, 'paintStructures runs'); } catch (e) { ok(false, 'paintStructures threw: ' + e.message); }
ok(lights.length > 0, 'paintStructures registered ' + lights.length + ' lights');
try { GFX.paintContainers(ctx, cam, dw, player); ok(true, 'paintContainers runs'); } catch (e) { ok(false, 'paintContainers threw: ' + e.message); }
try { GFX.paintActors(ctx, cam, player, state, dw); ok(true, 'paintActors runs'); } catch (e) { ok(false, 'paintActors threw: ' + e.message); }
let al = [];
try { al = GFX.actorLights(player, state, dw) || []; ok(true, 'actorLights runs'); } catch (e) { ok(false, 'actorLights threw: ' + e.message); }
ok(al.length > 0, 'actorLights registered ' + al.length + ' lights (torch + warden)');
try { GFX.paintLighting(ctx, cam, player, state, dw, lights.concat(al)); ok(true, 'paintLighting runs'); } catch (e) { ok(false, 'paintLighting threw: ' + e.message); }
try { GFX.paintAtmosphere(ctx, cam, player, state, dw); ok(true, 'paintAtmosphere runs'); } catch (e) { ok(false, 'paintAtmosphere threw: ' + e.message); }

/* an empty world must not throw either */
const empty = mkWorld(5, 0, null);
try {
  GFX.paintTerrain(ctx, cam, empty);
  GFX.paintClutter(ctx, cam, empty);
  GFX.paintStructures(ctx, cam, empty, { lights: [] });
  GFX.paintContainers(ctx, cam, empty, player);
  GFX.paintActors(ctx, cam, player, { bullets: [] }, empty);
  ok(true, 'all draw calls survive an empty world');
} catch (e) { ok(false, 'empty world threw: ' + e.message); }

/* ---------- daylight ---------- */
console.log('\n== day / night ==');
for (let t = 0; t < 86400; t += 900) {
  const d = GFX.daylight(t);
  if (!d || typeof d.amount !== 'number' || d.amount < 0 || d.amount > 1) {
    ok(false, 'daylight(' + t + ') returned a bad amount: ' + JSON.stringify(d)); break;
  }
  if (!/^\d+,\d+,\d+$/.test(String(d.tint))) { ok(false, 'daylight(' + t + ') bad tint: ' + d.tint); break; }
  if (['night', 'dawn', 'day', 'dusk'].indexOf(d.phase) < 0) { ok(false, 'daylight(' + t + ') bad phase: ' + d.phase); break; }
  if (t === 0) continue;
}
ok(true, 'daylight is sane across 24 hours');
/* the game clock is offset: hour = (time/86400 + 0.34) % 1 * 24 */
const noon = GFX.daylight(13824);        // clock hour 12
const midnight = GFX.daylight(57024);    // clock hour 0
ok(noon.amount < 0.25, 'midday darkness is low (' + noon.amount.toFixed(3) + ')');
ok(midnight.amount > 0.40, 'midnight darkness is high (' + midnight.amount.toFixed(3) + ')');

/* ---------- the old bugs must not come back ---------- */
console.log('\n== regression guards ==');
const renderSrc = fs.readFileSync(path.join(ROOT, 'src/render.js'), 'utf8');
ok(renderSrc.indexOf('ground2') < 0, 'render.js no longer mixes ground/ground2 per tile');
ok(renderSrc.indexOf('ROOF') < 0, 'render.js no longer paints a flat roof table');
ok(renderSrc.indexOf('paintTerrain') >= 0 && renderSrc.indexOf('paintStructures') >= 0 &&
   renderSrc.indexOf('paintActors') >= 0 && renderSrc.indexOf('paintLighting') >= 0 &&
   renderSrc.indexOf('paintAtmosphere') >= 0, 'render.js calls all five gfx stages');
ok(renderSrc.indexOf("fillRect(0, 0, W, H);") >= 0 || renderSrc.indexOf("fillRect(0, 0, W, H)") >= 0,
  'render.js still clears the frame');

/* ---------- file:// loading rules ---------- */
console.log('\n== file:// rules ==');
['src/gfx_terrain.js', 'src/gfx_props.js', 'src/gfx_actors.js', 'src/gfx_atmos.js'].forEach(function (rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { ok(false, rel + ' missing'); return; }
  const s = fs.readFileSync(p, 'utf8');
  const size = fs.statSync(p).size;
  ok(size <= 60 * 1024, rel + ' is ' + size + ' bytes (<= 61440)');
  ok(!/^\s*import\s/m.test(s) && !/^\s*export\s/m.test(s), rel + ' has no import/export');
  ok(!/=>/.test(s), rel + ' has no arrow functions');
  ok(!/\?\./.test(s) && !/\?\?/.test(s), rel + ' has no optional chaining or nullish coalescing');
  ok(!/`/.test(s), rel + ' has no template literals');
  /* emoji: anything outside the BMP-ish safe ranges in a string context */
  ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s), rel + ' has no emoji');
  ok(s.indexOf("'use strict'") >= 0, rel + " declares 'use strict'");
});

console.log('\n' + (fail ? 'FAILED: ' + fail + ' check(s)' : 'ALL CHECKS PASSED'));
process.exit(fail ? 1 : 0);
