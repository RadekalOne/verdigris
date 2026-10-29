/* VERDIGRIS - interiors contract test
   Run: node test/interiors.js

   Validates that the buildings can actually be entered: that the rooms are
   geometrically sound, that the player can stand in them and cannot walk
   through the walls, that every crate and every clue ends up inside a
   building instead of in the yard, and that the whole loop works end to
   end - walk to a door, go in, find a crate, open it, get loot, come back
   out.

   The rule this file follows: assert the ENGINE PATH, not the data shape.
   "Every template has four loot slots" is a shape check and it would pass
   on a set of rooms that no player could enter. What matters is that a
   clue the player is chasing is reachable by walking through a door. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

/* ---------- a recording 2d context ---------- */
function makeCtx() {
  const grad = { addColorStop: function () {} };
  return {
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
    fill: function () {}, stroke: function () {},
    fillRect: function () {}, strokeRect: function () {}, clearRect: function () {},
    clip: function () {}, translate: function () {}, rotate: function () {},
    scale: function () {}, setTransform: function () {}, transform: function () {},
    drawImage: function () {},
    createLinearGradient: function () { return grad; },
    createRadialGradient: function () { return grad; },
    createPattern: function () { return null; },
    createImageData: function (w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
    putImageData: function () {}, getImageData: function () { return { data: new Uint8ClampedArray(w * h * 4) }; },
    measureText: function () { return { width: 10 }; },
    fillText: function () {}, strokeText: function () {},
    setLineDash: function () {}, getLineDash: function () { return []; },
    getTransform: function () { return { a: 1, d: 1, e: 0, f: 0 }; }
  };
}
const ctx = makeCtx();
const canvasEl = { width: 1280, height: 720, getContext: function () { return ctx; }, style: {} };
ctx.canvas = canvasEl;

/* Every canvas the game creates is remembered, so a test can look at what
   was drawn on the offscreen ones - the darkness veil among them. */
const createdCanvasCtxs = [];

const sandbox = {
  window: {},
  console: console,
  performance: { now: function () { return Date.now(); } },
  Math, JSON, Date,
  setTimeout: () => 0,
  clearTimeout: () => { },
  document: {
    createElement: function (tag) {
      if (tag !== 'canvas') return { style: {} };
      const c = makeRecorder();
      createdCanvasCtxs.push(c);
      const cv = { width: 0, height: 0, style: {}, getContext: function () { return c; } };
      c.canvas = cv;
      return cv;
    },
    getElementById: function () { return null; }
  }
};
sandbox.window.addEventListener = () => { };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function load(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { console.log('  MISSING ' + rel); return false; }
  vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p });
  return true;
}

let fail = 0;
const ok = (cond, msg) => { if (!cond) { console.log('  FAIL ' + msg); fail++; } else console.log('  ok   ' + msg); };

console.log('== loading modules ==');
['src/core.js', 'src/items.js', 'src/factions.js', 'src/cases.js', 'src/cases_b.js',
 'src/world.js', 'src/interiors.js', 'src/loot.js', 'src/player.js',
 'src/gfx_props.js', 'src/gfx_actors.js', 'src/gfx_atmos.js', 'src/gfx_interior.js',
 'src/main.js'].forEach((f) => { if (!load(f)) fail++; });

const VG = sandbox.window.VG;
if (!VG) { console.log('FATAL: VG never defined'); process.exit(1); }
if (!VG.log) VG.log = () => { };
/* the item index is built when the game boots; the test never boots, so it
   has to be built here or every item lookup comes back empty */
if (VG.itemIndex && !VG.ITEM) VG.itemIndex();

console.log('\n== the seventeen rooms ==');
const TPL = VG.INTERIOR_TEMPLATES || [];
ok(TPL.length >= 15, 'room count ' + TPL.length + ' (>=15)');
ok(!!VG.INT, 'VG.INT exists');

const POI_KEYS = new Set((VG.POI_TYPES || []).map((p) => p.key));
const tplKeys = new Set(TPL.map((t) => t.key));
ok(tplKeys.size === TPL.length, 'no duplicate room keys');

/* a room for a building type that does not exist is a dead room */
const deadRooms = TPL.filter((t) => !POI_KEYS.has(t.key)).map((t) => t.key);
ok(deadRooms.length === 0, 'every room belongs to a real building type' +
  (deadRooms.length ? ': ' + deadRooms.join(', ') : ''));

/* ---- geometry ---- */
console.log('\n== room geometry ==');
for (const t of TPL) {
  const problems = [];
  if (!(t.w > 100 && t.h > 100)) problems.push('bad size');
  if (!t.walls || !t.walls.length) problems.push('no walls');
  if (!t.furn || !t.furn.length) problems.push('no furniture');
  if (!t.loot || t.loot.length < 4) problems.push('fewer than 4 loot slots');
  if (!t.flavour) problems.push('no flavour text');
  for (const w of (t.walls || [])) {
    if (w.x < 0 || w.y < 0 || w.x + w.w > t.w || w.y + w.h > t.h) problems.push('wall out of bounds');
  }
  for (const g of (t.furn || [])) {
    if (g.x < 0 || g.y < 0 || g.x + g.w > t.w || g.y + g.h > t.h) problems.push('furniture out of bounds: ' + g.k);
    /* furniture must not be buried in a wall: it makes a solid the player
       can be trapped inside, and it hides the room's shape */
    if (!g.ns) {
      for (const w of (t.walls || [])) {
        if (g.x < w.x + w.w && g.x + g.w > w.x && g.y < w.y + w.h && g.y + g.h > w.y) {
          problems.push('furniture in the wall: ' + g.k);
        }
      }
    }
  }
  ok(problems.length === 0, t.key + ' geometry is sound' + (problems.length ? ' (' + problems.join('; ') + ')' : ''));
}

/* the doorway is derived from the walls, so it must land in the gap */
console.log('\n== doorways ==');
for (const t of TPL) {
  const door = VG.INT.doorOf(t);
  const gapOk = door && door.x > t.w * 0.05 && door.x < t.w * 0.95 &&
    door.y > t.h - 30 && door.y <= t.h;
  ok(gapOk, t.key + ' has a doorway in the south wall');
  /* the doorway itself must not be blocked by furniture */
  const blocked = VG.INT.blocked(door.x, door.y, 12, VG.INT.solids(t), t);
  ok(!blocked, t.key + ' doorway is not blocked by furniture');
  /* and the player must be able to stand just inside it */
  const inside = VG.INT.blocked(door.x, t.h - 22, 12, VG.INT.solids(t), t);
  ok(!inside, t.key + ' has clear floor inside the doorway');
}

/* the spawn point is found, not authored, and it must be legal */
console.log('\n== spawn points ==');
for (const t of TPL) {
  const sp = VG.INT.spawnFor(t);
  const bad = VG.INT.blocked(sp.x, sp.y, 11, VG.INT.solids(t), t);
  ok(!bad, t.key + ' spawn point is clear of furniture (' + Math.round(sp.x) + ',' + Math.round(sp.y) + ')');
  const far = VG.dist(sp.x, sp.y, VG.INT.doorOf(t).x, VG.INT.doorOf(t).y);
  ok(far >= 40, t.key + ' spawn is clear of the exit trigger (' + Math.round(far) + 'px)');
}

console.log('\n== the spawn can reach the door ==');
/* A room can be perfectly legal and still seal the player in. Flood the
   floor from the spawn point and check that the doorway is in the same
   piece of floor. This is the check that catches a partition wall
   accidentally sealing off half a room. */
for (const t of TPL) {
  const STEP = 6;
  const cols = Math.floor(t.w / STEP), rows = Math.floor(t.h / STEP);
  const solids = VG.INT.solids(t);
  const free = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      free[r * cols + c] = VG.INT.blocked(c * STEP + STEP / 2, r * STEP + STEP / 2, 9, solids, t) ? 0 : 1;
    }
  }
  const sp = VG.INT.spawnFor(t);
  const door = VG.INT.doorOf(t);
  const sc = Math.min(cols - 1, Math.max(0, Math.floor(sp.x / STEP)));
  const sr = Math.min(rows - 1, Math.max(0, Math.floor(sp.y / STEP)));
  const dc = Math.min(cols - 1, Math.max(0, Math.floor(door.x / STEP)));
  const dr = Math.min(rows - 1, Math.max(0, Math.floor((t.h - 22) / STEP)));
  /* the spawn cell itself may be a hair inside a solid at grid resolution,
     so start the flood from the nearest free cell */
  let start = -1;
  for (let ring = 0; ring < 4 && start < 0; ring++) {
    for (let dy = -ring; dy <= ring && start < 0; dy++) {
      for (let dx = -ring; dx <= ring && start < 0; dx++) {
        const cx = sc + dx, cy = sr + dy;
        if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
        if (free[cy * cols + cx]) start = cy * cols + cx;
      }
    }
  }
  let reached = false;
  if (start >= 0) {
    const seen = new Uint8Array(cols * rows);
    const queue = [start];
    seen[start] = 1;
    while (queue.length) {
      const cur = queue.pop();
      const c = cur % cols, r = (cur - c) / cols;
      if (c === dc && r === dr) { reached = true; break; }
      const nb = [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]];
      for (const [nc, nr] of nb) {
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const ni = nr * cols + nc;
        if (seen[ni] || !free[ni]) continue;
        seen[ni] = 1;
        queue.push(ni);
      }
    }
  }
  ok(reached, t.key + ': the doorway is reachable from where the player lands');
}

/* the building size tables must agree, or the door marker floats */
console.log('\n== building sizes ==');
const FALLBACK = [[30, 24], [44, 34], [62, 48], [88, 70]];
let sizeOk = true;
for (let t = 0; t < 4; t++) {
  const g = VG.GFX.buildingSize(t);
  if (!g || g[0] !== FALLBACK[t][0] || g[1] !== FALLBACK[t][1]) sizeOk = false;
}
ok(sizeOk, 'the interior fallback size table matches the graphics module');

console.log('\n== the clues live in the rooms ==');
/* Every clue names the building type it belongs in. If that type has no
   room, the clue is in a yard somewhere and the player will never find it
   by going inside. This is the check that matters. */
const allCases = (VG.CASES || []).concat(VG.CASES_B || []);
const cluePois = new Set();
let clueCount = 0;
for (const c of allCases) {
  for (const cl of (c.clues || [])) { cluePois.add(cl.poi); clueCount++; }
}
ok(clueCount === 47, 'the case files still carry ' + clueCount + ' clues');
const homeless = [...cluePois].filter((k) => !tplKeys.has(k));
ok(homeless.length === 0, 'every clue has a room to be found in (' + cluePois.size + ' building types)' +
  (homeless.length ? ': missing ' + homeless.join(', ') : ''));

console.log('\n== the crates move inside ==');
const world = VG.genWorld(20261024);
VG.newPlayer(world);
const moved = VG.INT.prepare(world);
ok(moved > 0, moved + ' crates moved indoors');

let outside = 0, insideCount = 0;
for (const c of world.containers) {
  if (c.inside) {
    insideCount++;
    if (typeof c.ix !== 'number' || typeof c.iy !== 'number') { ok(false, 'crate ' + c.id + ' has no interior position'); }
  } else outside++;
}
ok(insideCount > 0, insideCount + ' crates are inside buildings, ' + outside + ' are still in the yard');

/* no crate may be in two places at once */
let dupe = 0;
for (const poi of world.pois) {
  for (const ci of poi.containers) {
    const c = world.containers[ci];
    if (c && c.inside && c.inside !== poi.id) dupe++;
  }
}
ok(dupe === 0, 'no crate is claimed by two buildings');

/* the clue marker on the map must land on the building that holds it */
let markerOk = true;
for (const cl of world.clues) {
  const c = world.containers[cl.container];
  if (!c || !c.inside) continue;
  const poi = world.poiById(c.inside);
  if (!poi || cl.x !== poi.x || cl.y !== poi.y) markerOk = false;
}
ok(markerOk, 'every indoor clue marker points at its building');

console.log('\n== entering, searching, leaving ==');
/* the whole loop, through the engine, on a real world */
const enterable = world.pois.filter((p) => VG.INT.has(p) && p.containers.length > 0);
ok(enterable.length > 0, enterable.length + ' buildings on the flats can be entered');

const poi = enterable[0];
const pl = VG.Player;
const before = VG.invTotal(pl);
const worldX = pl.x, worldY = pl.y;

const entered = VG.INT.enter(poi, pl);
ok(entered === true, 'walking into a door enters the building');
ok(!!VG.INT.active, 'the interior scene is live');
ok(VG.INT.active.poi === poi, 'the interior knows which building it is');
ok(pl.x !== worldX || pl.y !== worldY, 'the player moved into the room');

const tpl = VG.INT.active.tpl;
ok(pl.x > 0 && pl.x < tpl.w && pl.y > 0 && pl.y < tpl.h, 'the player is inside the room bounds');
ok(!VG.blockedInRoom(pl.x, pl.y, pl.r, VG.INT.active.solids, tpl), 'the player is not standing inside a wall');

/* the flats are suspended while you are inside */
const callBefore = VG.DYN ? VG.DYN.stats().calls : 0;
VG.DYN && VG.DYN.update(0.016, pl, world);
ok(true, 'the living flats tolerate a player standing in a room');

/* the crates of this building are here, and they are findable */
const roomCrates = VG.INT.active.containers;
ok(roomCrates.length === poi.containers.length, 'all ' + roomCrates.length + ' crates of this building came inside');
const c0 = roomCrates[0];
pl.x = c0.ix; pl.y = c0.iy;
const target = VG.findTarget(pl, world);
ok(target && target.kind === 'container', 'standing on a crate offers it as a target');

/* opening it must put real catalog items in the pack */
VG.openContainer(c0, pl);
const after = VG.invTotal(pl);
ok(after > before, 'opening a crate added something to the pack (' + before + ' -> ' + after + ')');
const ids = new Set((VG.ITEMS || []).map((i) => i.id));
let ghosts = 0;
for (const k in pl.inv) if (!ids.has(k)) ghosts++;
ok(ghosts === 0, 'no ghost item ids in the pack after searching indoors');

/* the way out is a target when you stand in the doorway */
const door = VG.INT.doorOf(tpl);
pl.x = door.x; pl.y = tpl.h - 22;
const exitTarget = VG.findTarget(pl, world);
ok(exitTarget && exitTarget.kind === 'exit', 'standing in the doorway offers the way out');

/* and leaving puts the player back on the flats */
VG.INT.exit(pl);
ok(VG.INT.active === null, 'the interior scene closed');
ok(Math.abs(pl.x - worldX) < 4000 && Math.abs(pl.y - worldY) < 4000, 'the player is back on the flats');

console.log('\n== the way out ==');
/* The room is fitted into the band of canvas above the hotbar, so the
   doorway is never behind a slot box. This is the bug that left a player
   stuck inside a building with no visible way out. */
const VIEWPORTS = [[1280, 617], [1920, 1080], [1280, 900], [2560, 1440], [1024, 640], [2133, 1090]];
const camProblems = [];
for (const vp of VIEWPORTS) {
  const vw = vp[0], vh = vp[1];
  const safeH = Math.max(160, vh - VG.INT.MARGIN_BOTTOM);
  for (const t of TPL) {
    const z = Math.max(0.75, Math.min(2.0, Math.min(vw / t.w, safeH / t.h)));
    const viewW = vw / z, viewH = safeH / z;
    const tx = viewW >= t.w ? (t.w - viewW) / 2 : 0;
    const ty = viewH >= t.h ? (t.h - viewH) / 2 : 0;
    const dr = VG.INT.doorOf(t);
    const dx = (dr.x - tx) * z, dy = (dr.y - ty) * z;
    if (dy > safeH - 8) camProblems.push(t.key + ' door at y=' + Math.round(dy) + ' in ' + vw + 'x' + vh);
    if (dx < 0 || dx > vw) camProblems.push(t.key + ' door off the side in ' + vw + 'x' + vh);
    if (t.h * z > safeH + 0.01) camProblems.push(t.key + ' room taller than the band in ' + vw + 'x' + vh);
  }
}
ok(camProblems.length === 0, 'the doorway is on screen and clear of the hotbar in every room and window size' +
  (camProblems.length ? ': ' + camProblems.slice(0, 4).join('; ') : ''));

/* the gap has to be wide enough for the player to walk through it */
const tooNarrow = TPL.filter((t) => VG.INT.doorOf(t).w < 28).map((t) => t.key);
ok(tooNarrow.length === 0, 'every doorway is wide enough to walk through' +
  (tooNarrow.length ? ': ' + tooNarrow.join(', ') : ''));

/* and the room must not drop you at the threshold */
let spawnTooClose = 0;
for (const t of TPL) {
  const sp = VG.INT.spawnFor(t);
  const dr = VG.INT.doorOf(t);
  if (VG.dist(sp.x, sp.y, dr.x, dr.y) < VG.INT.EXIT_REACH) spawnTooClose++;
}
ok(spawnTooClose === 0, 'no room drops you at the threshold (' + spawnTooClose + ' do)');

/* Walking into the gap in the south wall is the way out. There is no key to
   find and nothing to press. */
VG.INT.enter(poi, pl);
const room = VG.INT.active;
const gap = VG.INT.doorOf(room.tpl);
pl.x = gap.x; pl.y = room.tpl.h - 20;
VG.INT.update(pl, 0.1, { up: false, down: true, left: false, right: false });
ok(VG.INT.active === null, 'walking into the gap in the wall leaves the building');

/* Stepping out must not offer to take you straight back in. Being pushed
   back through the door the instant you leave reads as being stuck. */
VG.INT.enter(poi, pl);
VG.INT.exit(pl);
const dw = VG.INT.doorWorld(poi);
const clearOf = VG.dist(pl.x, pl.y, dw.x, dw.y);
ok(clearOf >= VG.INT.DOOR_REACH, 'stepping out leaves you clear of the threshold (' + Math.round(clearOf) + 'px)');
const backTarget = VG.findTarget(pl, world);
ok(!backTarget || backTarget.kind !== 'door', 'the door does not grab you back the moment you leave');
ok(VG.INT.doorLock > 0, 'the door is held for a moment after you step out');
ok(/doorLock > 0\) VG\.INT\.doorLock = Math\.max/.test(fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8')),
  'the door lock expires outdoors, not only while you are inside');

/* ESC is the other way out, and the coach says so while you are inside */
const mainExitSrc = fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8');
ok(/escape[\s\S]{0,400}VG\.INT\.exit/.test(mainExitSrc), 'ESC steps back outside a building');
const helpExitSrc = fs.readFileSync(path.join(ROOT, 'src/help.js'), 'utf8');
ok(/way out is the lit gap/i.test(helpExitSrc), 'the coach tells you how to get out');

/* The compass has to be true. A compass that is a quarter turn out points
   you away from the door you are looking for, which is a very expensive
   kind of wrong. */
ok(VG.compassDir(1, 0) === 'E', 'the compass reads east when you look east');
ok(VG.compassDir(0, 1) === 'S', 'the compass reads south when you look south');
ok(VG.compassDir(-1, 0) === 'W', 'the compass reads west when you look west');
ok(VG.compassDir(0, -1) === 'N', 'the compass reads north when you look north');
ok(VG.compassDir(1, 1) === 'SE', 'the compass reads south-east for a south-east bearing');
ok(VG.compassDir(-1, 1) === 'SW', 'the compass reads south-west for a south-west bearing');
ok(VG.compassDir(1, -1) === 'NE', 'the compass reads north-east for a north-east bearing');

/* and the door readout has to agree with where the door actually is */
let bearingWrong = 0;
for (const t of TPL) {
  const dr = VG.INT.doorOf(t);
  const sp = VG.INT.spawnFor(t);
  const dx = dr.x - sp.x, dy = dr.y - sp.y;
  const d = VG.compassDir(dx, dy);
  /* the doorway is always in the south wall, so the bearing always has to
     have a southerly component */
  if (dy > 0 && (d === 'N' || d === 'NE' || d === 'NW')) bearingWrong++;
}
ok(bearingWrong === 0, 'the door bearing always points into the southern half of the room');

console.log('\n== the walls hold ==');
/* a player who walks into a wall must not come out the other side */
const t2 = TPL[0];
const solids = VG.INT.solids(t2);
const wall = t2.walls[0];      /* the north wall */
const probe = { x: wall.x + wall.w / 2, y: wall.y + wall.h + 12, r: 10, speed: 200, face: 0, moving: false, hp: 100, maxhp: 100, stam: 100, food: 100, water: 100, dose: 0 };
VG.updatePlayerInterior(probe, 0.5, { up: true, down: false, left: false, right: false }, { solids: solids, tpl: t2 });
ok(probe.y > wall.y + wall.h - 1, 'the player did not pass through the north wall (y=' + Math.round(probe.y) + ')');

/* and the same for furniture */
const solid = t2.furn.find((g) => !g.ns && g.w > 30 && g.h > 20);
if (solid) {
  const p2 = { x: solid.x + solid.w / 2, y: solid.y + solid.h + 14, r: 10, speed: 200, face: 0, moving: false, hp: 100, maxhp: 100, stam: 100, food: 100, water: 100, dose: 0 };
  VG.updatePlayerInterior(p2, 0.5, { up: true, down: false, left: false, right: false }, { solids: solids, tpl: t2 });
  ok(p2.y > solid.y + solid.h - 1, 'the player did not walk through the furniture');
}

/* sliding along a wall must be possible, or rooms feel like glue */
const p3 = { x: t2.walls[1].x + t2.walls[1].w + 14, y: t2.h / 2, r: 10, speed: 200, face: 0, moving: false, hp: 100, maxhp: 100, stam: 100, food: 100, water: 100, dose: 0 };
VG.updatePlayerInterior(p3, 0.2, { up: false, down: false, left: false, right: true }, { solids: solids, tpl: t2 });
ok(p3.x > t2.walls[1].x, 'the player moved along the wall instead of sticking to it');

console.log('\n== the renderer runs ==');
try {
  const room = { poi: poi, tpl: TPL[0], solids: VG.INT.solids(TPL[0]), containers: [] };
  VG.INT.cam = { x: 0, y: 0 };
  VG.INT.zoom = 1.7;
  VG.INT.view = { w: 1280, h: 720, dpr: 1 };
  VG.GFX.paintInterior(ctx, VG.INT.cam, room, VG.Player, { time: 9 * 3600, anim: 1, bullets: [] }, world, VG.INT.view);
  ok(true, 'paintInterior runs');
} catch (e) { ok(false, 'paintInterior threw: ' + e.message); }

try {
  VG.GFX.paintInteriorDoors(ctx, { x: 0, y: 0 }, world, VG.Player);
  ok(true, 'paintInteriorDoors runs');
} catch (e) { ok(false, 'paintInteriorDoors threw: ' + e.message); }

console.log('\n== an empty world must not throw ==');
try {
  const empty = { seed: 1, W: 8, H: 8, TILE: 32, biome: new Uint8Array(64), elev: new Float32Array(64), road: new Uint8Array(64), pois: [], containers: [], clues: [], enemies: [] };
  VG.INT.prepare(empty);
  VG.GFX.paintInteriorDoors(ctx, { x: 0, y: 0 }, empty, VG.Player);
  VG.INT.findTarget(VG.Player);
  ok(true, 'the interior code survives an empty world');
} catch (e) { ok(false, 'empty world threw: ' + e.message); }

console.log('\n== the player is legible in a room ==');
/* This drives the real interior renderer against a recording canvas and
   looks at the ORDER of the operations, because that is the thing that was
   wrong. The player used to be painted before the light, so the veil and the
   torch glow landed on the figure as well as on the room: the coat came out
   the same amber as the floor it stood on and the player was a smudge.
   A source grep cannot see that. The operation log can. */
function makeRecorder() {
  const c = makeCtx();
  const ops = [];
  c.ops = ops;
  /* Every gradient gets its own object. The stub context hands out one
     shared gradient, and a shared gradient throws away the stops of the
     gradient before it - which is exactly the kind of lie this test exists
     to catch. */
  c.createLinearGradient = function () {
    const g = { kind: 'lin', stops: [] };
    g.addColorStop = function (o, col) { g.stops.push([o, col]); };
    return g;
  };
  c.createRadialGradient = function () {
    const g = { kind: 'rad', stops: [] };
    g.addColorStop = function (o, col) { g.stops.push([o, col]); };
    return g;
  };
  c.fill = function () { ops.push({ op: 'fill', style: c.fillStyle }); };
  c.stroke = function () { ops.push({ op: 'stroke', style: c.strokeStyle, lw: c.lineWidth }); };
  c.fillRect = function (x, y, w, h) {
    ops.push({ op: 'fillRect', style: c.fillStyle, comp: c.globalCompositeOperation, x: x, y: y, w: w, h: h });
  };
  c.drawImage = function () { ops.push({ op: 'drawImage' }); };
  return c;
}

const recCtx = makeRecorder();
const recCanvas = { width: 1280, height: 617, style: {}, getContext: function () { return recCtx; } };
recCtx.canvas = recCanvas;

/* the room, with a player standing in it and a torch in their hand */
const gasTpl = TPL.filter((t) => t.key === 'gas')[0] || TPL[0];
const litRoom = {
  poi: poi,
  tpl: gasTpl,
  solids: VG.INT.solids(gasTpl),
  containers: (world.containers || []).filter((c) => c && c.inside === poi.id).slice(0, 3)
};
const litPlayer = {
  x: 240, y: 170, r: 10, speed: 132, face: 0, aim: 0, moving: false,
  hp: 100, maxhp: 100, stam: 100, food: 30, water: 60, dose: 0,
  weapon: 'wpn_scrap_torch', sel: 0, hotbar: ['wpn_scrap_torch', null, null, null, null],
  inv: {}, ammo: {}
};
VG.INT.cam = { x: 0, y: 0 };
VG.INT.zoom = 1.7;
VG.INT.view = { w: 1280, h: 617, dpr: 1 };
recCtx.ops.length = 0;
VG.GFX.paintInterior(recCtx, VG.INT.cam, litRoom, litPlayer,
  { time: 17 * 3600 + 41 * 60, anim: 1, bullets: [] }, world, VG.INT.view);

/* where the light is, in the operation log */
const idxVeil = recCtx.ops.findIndex((o) => o.op === 'drawImage');
let idxGlow = -1;
recCtx.ops.forEach((o, i) => {
  if (o.op === 'fillRect' && o.comp === 'lighter') idxGlow = i;
});
/* where the figure is: the coat is the one gradient painted in the lit tone */
let idxCoat = -1;
recCtx.ops.forEach((o, i) => {
  if (o.op !== 'fill' || !o.style || !o.style.stops) return;
  for (const s of o.style.stops) if (s[1] === '#c4b795') idxCoat = i;
});
/* and the dark edge that has to be under it */
let idxHalo = -1;
recCtx.ops.forEach((o, i) => {
  if (o.op === 'stroke' && o.style === 'rgba(7,8,6,.66)' && idxHalo < 0) idxHalo = i;
});

ok(idxVeil >= 0, 'the darkness is a veil that is laid over the room, not a hole punched in it');
ok(idxCoat >= 0, 'the indoor figure is drawn in the lit tone, not the flat daylight coat');
ok(idxHalo >= 0 && idxHalo < idxCoat, 'the figure carries its own dark edge, under the body');
ok(idxVeil >= 0 && idxCoat > idxVeil, 'the figure is drawn after the light, so no veil can dim it');
ok(idxGlow >= 0 && idxCoat > idxGlow, 'the figure is drawn after the torch glow, so no pool of light can wash it out');

/* and the room itself must not be punched: the lit areas used to be holes
   to the page behind the canvas, which is why the whole room read as a fog */
const punches = recCtx.ops.filter((o) => o.op === 'fillRect' && o.comp === 'destination-out');
ok(punches.length === 0, 'nothing punches a hole in the room itself (' + punches.length + ')');

/* the veil has to be punched in the veil */
const veilCtx = createdCanvasCtxs.filter((c) =>
  c.ops.some((o) => o.op === 'fillRect' && o.comp === 'destination-out')).pop();
ok(!!veilCtx, 'the lit holes are punched in the veil on its own canvas');

console.log('\n== the kit says what to press ==');
/* Rad could not work out how to eat or how to equip anything, because
   nothing in the game ever said. Every item now carries the verb for it. */
ok(typeof VG.useHint === 'function', 'items can say what to press');
const tin = VG.item('aid_ration_tin');
ok(!!tin && /eat/i.test(VG.useHint(tin)), 'a ration tin says it is eaten');
const canteen = VG.item('aid_canteen');
ok(!!canteen && /drink/i.test(VG.useHint(canteen)), 'a canteen says it is drunk');
const gun = VG.item('wpn_rivet_sling');
ok(!!gun && /equip/i.test(VG.useHint(gun)), 'a weapon says it is equipped');
const jacket = VG.item('armor_duster_coat');
ok(!!jacket && /wear|equip/i.test(VG.useHint(jacket)), 'armour says it is worn');
ok(!!tin && /space/i.test(VG.useHint(tin)), 'the verb names the key, not just the action');

/* and the player can be told they are carrying food */
const hunger = { hotbar: ['wpn_scrap_torch', 'aid_ration_tin', null, null, null], inv: {}, ammo: {} };
const carried = VG.carriedFood ? VG.carriedFood(hunger) : null;
ok(!!carried && carried.item.id === 'aid_ration_tin', 'the food in your bar can be found');
ok(!!carried && carried.slot === 1, 'the food panel can name the slot to press');

/* the coach has to teach the two things that were never taught */
const helpSrc = fs.readFileSync(path.join(ROOT, 'src/help.js'), 'utf8');
ok(/id:\s*'equipped'/.test(helpSrc), 'the coach has a step that teaches equipping');
ok(/id:\s*'ate'/.test(helpSrc), 'the coach has a step that teaches eating');
ok(/SPACE uses what is in the selected hotbar slot/i.test(helpSrc), 'the coach names the key for the hotbar');
const uiSrc = fs.readFileSync(path.join(ROOT, 'src/ui.js'), 'utf8');
ok(/slotinfo/.test(uiSrc), 'the hotbar has a name plate');
ok(/Press SPACE to eat it/i.test(uiSrc), 'the food panel says the key to press');
ok(/Go inside and press E on a crate/i.test(uiSrc), 'the food panel says what to do at the building');

console.log('\n== the figure faces the way it walks indoors ==');
/* Indoors there is no pointer to aim at, so the figure used to keep facing
   whatever direction the mouse was pointing outside, while it walked the
   other way. */
const interiorSrc = fs.readFileSync(path.join(ROOT, 'src/interiors.js'), 'utf8');
ok(/p\.aim = p\.face/.test(interiorSrc), 'indoors the figure turns the way the player walks');

console.log('\n== file:// rules ==');
['src/gfx_interior.js'].forEach((rel) => {
  const p = path.join(ROOT, rel);
  const s = fs.readFileSync(p, 'utf8');
  const size = fs.statSync(p).size;
  ok(size <= 60 * 1024, rel + ' is ' + size + ' bytes (<= 61440)');
  ok(!/^\s*import\s/m.test(s) && !/^\s*export\s/m.test(s), rel + ' has no import/export');
  ok(!/=>/.test(s), rel + ' has no arrow functions');
  ok(!/\?\./.test(s) && !/\?\?/.test(s), rel + ' has no optional chaining or nullish coalescing');
  ok(!/`/.test(s), rel + ' has no template literals');
  /* eslint-disable-next-line no-control-regex */
  ok(!/[^\x00-\x7F]/.test(s), rel + ' is pure ASCII');
  ok(s.indexOf("'use strict'") >= 0, rel + " declares 'use strict'");
  ok(s.indexOf('window.VG.GFX, window.VG') >= 0, rel + ' captures VG as an IIFE parameter');
});

console.log('\n== the wiring ==');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
ok(html.indexOf('src/interiors.js') >= 0, 'index.html loads src/interiors.js');
ok(html.indexOf('src/gfx_interior.js') >= 0, 'index.html loads src/gfx_interior.js');
const mainSrc = fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8');
ok(mainSrc.indexOf("kind === 'door'") >= 0, 'main.js handles the door target');
ok(mainSrc.indexOf("kind === 'exit'") >= 0, 'main.js handles the exit target');
ok(mainSrc.indexOf('VG.INT.prepare') >= 0, 'main.js moves the crates inside');
const renderSrc = fs.readFileSync(path.join(ROOT, 'src/render.js'), 'utf8');
ok(renderSrc.indexOf('paintInterior') >= 0, 'render.js draws the interior scene');
ok(renderSrc.indexOf('paintInteriorDoors') >= 0, 'render.js draws the door markers');
const playerSrc = fs.readFileSync(path.join(ROOT, 'src/player.js'), 'utf8');
ok(playerSrc.indexOf('updatePlayerInterior') >= 0, 'player.js has the indoor movement path');
ok(playerSrc.indexOf('blockedInRoom') >= 0, 'player.js has the indoor collision test');

console.log('\n' + (fail ? 'FAILED: ' + fail + ' check(s)' : 'ALL CHECKS PASSED'));
process.exit(fail ? 1 : 0);
