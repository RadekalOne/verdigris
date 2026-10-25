/* VERDIGRIS — headless test for the living flats
   Run: node test/live.js

   The living layer is the one place where content, engine and renderer can
   quietly disagree: a reward can name an item that does not exist (the
   reward is consumed and nothing appears), a case id can point at a clue
   that belongs to a different file, and a profile can claim to be quiet
   while still spawning calls. None of that throws. It just feels broken.

   So this test asserts the *engine path*, not the data shape. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = {
  window: {},
  console,
  performance: { now: () => Date.now() },
  Math, JSON, Date,
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ getContext: () => null, style: {} }),
    addEventListener: () => { }
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
const ok = (cond, msg) => { if (!cond) { console.log('  FAIL ' + msg); fail++; } else console.log('  ok   ' + msg); };

console.log('== loading modules ==');
['src/core.js', 'src/items.js', 'src/factions.js', 'src/cases.js', 'src/cases_b.js',
  'src/world.js', 'src/loot.js', 'src/player.js',
  'src/dyn_content.js', 'src/dynamic.js', 'src/gfx_live.js'].forEach((f) => {
    if (!load(f)) fail++;
  });

const VG = sandbox.window.VG;
if (!VG) { console.log('FATAL: VG never defined'); process.exit(1); }
VG.itemIndex();

const items = VG.ITEMS || [];
const itemIds = new Set(items.map((i) => i.id));
const cases = (VG.CASES || []).concat(VG.CASES_B || []);
const caseById = new Map(cases.map((c) => [c.id, c]));
/* allCases lives in ui.js, which needs a DOM. The engine only uses it for
   testimony, so stub it with the real case list. */
VG.allCases = () => cases;

/* A night clock, so the rusted come out after dark and the radio draws from
   the night bucket. Raw 49824 reads as 22:00 on the clock face. */
VG.state = { time: 49824, anim: 0 };

console.log('\n== the clock ==');
ok(Math.abs(VG.hourOfDay(13824) - 12) < 0.001, 'raw 13824 reads as 12:00');
ok(Math.abs(VG.hourOfDay(57024)) < 0.001, 'raw 57024 reads as midnight');
ok(Math.abs(VG.hourOfDay(32400) - 17.16) < 0.02, 'raw 32400 reads as 17:09');
ok(VG.isNight(49824) === true, '22:00 is night');
ok(VG.isNight(13824) === false, '12:00 is not night');
ok(VG.isNight(60000) === true, '00:49 is night');
ok(VG.isNight(1824) === false, '08:40 is not night');

const POI_TYPES = new Set((VG.POI_TYPES || []).map((p) => p.key));
const STORY_ONLY = new Set(['case_torque_reward', 'case_choir_reward', 'ledger_token']);
const REP_KEYS = new Set(['ledger', 'choir', 'free_line']);
const C = VG.DYN_CONTENT;

console.log('\n== content shape ==');
ok(!!C, 'VG.DYN_CONTENT exists');
ok(C.radio && Array.isArray(C.radio.ambient) && C.radio.ambient.length >= 20,
  'radio.ambient >= 20 (' + ((C.radio || {}).radio ? '' : '') + (C.radio.ambient || []).length + ')');
ok(C.radio.night && C.radio.night.length >= 10, 'radio.night >= 10 (' + (C.radio.night || []).length + ')');
ok(!!C.radio.weather, 'radio.weather exists');
for (const k of ['clear', 'haze', 'wind', 'rain', 'dust']) {
  ok(!!C.radio.weather[k] && C.radio.weather[k].length >= 4,
    'radio.weather.' + k + ' >= 4 (' + ((C.radio.weather || {})[k] || []).length + ')');
}
ok(C.survivors && C.survivors.length >= 16, 'survivors >= 16 (' + (C.survivors || []).length + ')');
ok(C.calls && C.calls.length >= 14, 'calls >= 14 (' + (C.calls || []).length + ')');
ok(C.raids && C.raids.length >= 6, 'raids >= 6 (' + (C.raids || []).length + ')');
ok(C.convoys && C.convoys.length >= 4, 'convoys >= 4 (' + (C.convoys || []).length + ')');

console.log('\n== content ids resolve (the ghost-id check) ==');
let ghost = [], story = [], badPoi = [], badRep = [], badCase = [];
const allIds = new Set();
for (const c of C.calls) {
  if (allIds.has(c.id)) { ghost.push('dup id ' + c.id); } allIds.add(c.id);
  for (const it of (c.reward && c.reward.items) || []) {
    if (!itemIds.has(it[0])) ghost.push('item ' + it[0] + ' in ' + c.id);
    else if (STORY_ONLY.has(it[0])) story.push(it[0] + ' in ' + c.id);
    if (!(it[1] > 0)) ghost.push('bad qty ' + it[0] + ' in ' + c.id);
  }
  for (const pt of (c.poiTypes || [])) if (!POI_TYPES.has(pt)) badPoi.push(pt);
  for (const k in ((c.reward && c.reward.rep) || {})) if (!REP_KEYS.has(k)) badRep.push(k);
  if (c.caseId) {
    const cse = caseById.get(c.caseId);
    if (!cse) badCase.push(c.caseId + ' (no such case)');
    else if (c.clue && !cse.clues.some((x) => x.id === c.clue)) badCase.push(c.clue + ' not in ' + c.caseId);
  }
}
for (const r of C.raids) {
  if (allIds.has(r.id)) { ghost.push('dup id ' + r.id); } allIds.add(r.id);
  for (const pt of (r.poiTypes || [])) if (!POI_TYPES.has(pt)) badPoi.push(pt);
  for (const k in (r.rep || {})) if (!REP_KEYS.has(k)) badRep.push(k);
}
for (const v of C.convoys) {
  if (allIds.has(v.id)) { ghost.push('dup id ' + v.id); } allIds.add(v.id);
  if (!['west', 'north'].includes(v.from)) badPoi.push('convoy from ' + v.from);
  if (!['yard', 'town', 'mine'].includes(v.to)) badPoi.push('convoy to ' + v.to);
}
ok(ghost.length === 0, 'no ghost ids / duplicate ids' + (ghost.length ? ': ' + ghost.join(', ') : ''));
ok(story.length === 0, 'no story-only items handed out as rewards' + (story.length ? ': ' + story.join(', ') : ''));
ok(badPoi.length === 0, 'every poiType / convoy leg is real' + (badPoi.length ? ': ' + badPoi.join(', ') : ''));
ok(badRep.length === 0, 'every rep key is a faction' + (badRep.length ? ': ' + badRep.join(', ') : ''));
ok(badCase.length === 0, 'every caseId/clue pair resolves' + (badCase.length ? ': ' + badCase.join(', ') : ''));
ok(C.calls.filter((c) => c.hostile).length >= 1, 'at least one lure call');
ok(C.calls.filter((c) => c.caseId).length >= 3, 'at least three calls carry testimony');

console.log('\n== the engine path ==');
const world = VG.genWorld(20260921);
const player = VG.newPlayer(world);
ok(!!world && !!player, 'world and player generated');

VG.DYN.init(world, world.seed);
ok(!!VG.DYN.rng, 'DYN.init seeds the rng');
ok(Array.isArray(VG.DYN.messages), 'radio log is an array');

/* --- a genuine call hands over real, visible items --- */
const savedCalls = C.calls.slice();
C.calls = savedCalls.filter((c) => !c.hostile && c.reward && c.reward.items && c.reward.items.length);
let call = null;
for (let i = 0; i < 40 && !call; i++) call = VG.DYN.spawnCall(world, player);
ok(!!call, 'a genuine call spawns');
if (call) {
  const before = Object.assign({}, player.inv);
  player.x = call.x; player.y = call.y;
  const near = VG.DYN.nearestCall(player, 120);
  ok(!!near && near.id === call.id, 'the call is findable from where it was made');
  const res = VG.DYN.answerCall(call, player, world);
  ok(res === true, 'answering a genuine call succeeds');
  let gained = 0, unknown = 0;
  for (const k in player.inv) {
    const d = (player.inv[k] || 0) - (before[k] || 0);
    if (d <= 0) continue;
    gained += d;
    if (!itemIds.has(k)) unknown++;
    if (!Number.isFinite(player.inv[k])) unknown++;
  }
  ok(gained > 0, 'the player actually received something (' + gained + ')');
  ok(unknown === 0, 'every item handed over exists in the catalog and has a real count');
}

/* --- a lure grants nothing and puts hostiles on the map --- */
C.calls = savedCalls.filter((c) => c.hostile);
const enemiesBefore = world.enemies.length;
let lure = null;
for (let i = 0; i < 40 && !lure; i++) lure = VG.DYN.spawnCall(world, player);
ok(!!lure, 'a lure call spawns');
if (lure) {
  const invBefore = Object.keys(player.inv).length;
  const res = VG.DYN.answerCall(lure, player, world);
  ok(res === false, 'answering a lure does not succeed');
  ok(world.enemies.length > enemiesBefore, 'a lure puts hostiles on the map');
  ok(Object.keys(player.inv).length === invBefore, 'a lure hands over nothing');
}
C.calls = savedCalls;

/* --- a raid actually spawns raiders --- */
const raidersBefore = world.enemies.length;
let raid = null;
for (let i = 0; i < 40 && !raid; i++) raid = VG.DYN.spawnRaid(world, player);
ok(!!raid, 'a raid spawns');
if (raid) {
  raid.life = raid.warn + 1;
  VG.DYN.update(2, player, world);
  ok(world.enemies.length > raidersBefore, 'the raid puts raiders on the map');
  ok(VG.DYN.raids.length >= 1, 'the raid is tracked');
}

/* --- a convoy runs the road and reports its arrival --- */
let conv = null;
for (let i = 0; i < 40 && !conv; i++) conv = VG.DYN.spawnConvoy(world, player);
ok(!!conv, 'a convoy spawns');
if (conv) {
  const pos = VG.DYN.convoyPos(conv);
  ok(Number.isFinite(pos.x) && Number.isFinite(pos.y), 'the convoy position is finite');
  ok(pos.x >= 0 && pos.y >= 0, 'the convoy position is on the map');
  conv.t = conv.dur + 1;
  VG.DYN.update(1, player, world);
  ok(!VG.DYN.convoys.includes(conv), 'the convoy leaves when it arrives');
}

/* --- markers point at real places --- */
const markers = VG.DYN.markers(world);
let badMarker = 0;
for (const m of markers) {
  if (!['call', 'raid', 'convoy'].includes(m.kind)) badMarker++;
  if (!Number.isFinite(m.x) || !Number.isFinite(m.y)) badMarker++;
}
ok(badMarker === 0, 'every map marker is well formed (' + markers.length + ')');

console.log('\n== intensity profiles behave differently ==');
function simulate(profile, seconds) {
  VG.DYN.setIntensity(profile);
  VG.DYN.init(world, world.seed);
  for (let i = 0; i < seconds; i++) {
    VG.DYN.update(1, player, world);
  }
  /* the radio log is capped, so the count of what actually happened is the
     only honest way to compare two profiles */
  return Object.assign({}, VG.DYN.stats);
}
const quiet = simulate('quiet', 4000);
const alive = simulate('alive', 4000);
const danger = simulate('danger', 4000);
ok(quiet.calls === 0, 'quiet spawns no calls (' + quiet.calls + ')');
ok(quiet.raids === 0, 'quiet spawns no raids (' + quiet.raids + ')');
ok(quiet.convoys === 0, 'quiet spawns no convoys (' + quiet.convoys + ')');
ok(quiet.radio > 0, 'quiet still has radio traffic (' + quiet.radio + ')');
ok(alive.radio > quiet.radio, 'alive is busier than quiet (' + alive.radio + ' vs ' + quiet.radio + ')');
ok(danger.radio > alive.radio, 'danger is busier than alive (' + danger.radio + ' vs ' + alive.radio + ')');
ok(danger.calls > alive.calls, 'danger produces more calls than alive (' + danger.calls + ' vs ' + alive.calls + ')');
ok(danger.raids > 0, 'danger produces raids');
ok(danger.convoys > 0, 'danger produces convoys');
ok(alive.calls > 0, 'alive produces calls');
ok(alive.raids > 0, 'alive produces raids');
ok(alive.convoys > 0, 'alive produces convoys');
ok(VG.DYN.setIntensity('nonsense') === false, 'a bad intensity is rejected');
ok(VG.DYN.setIntensity('alive') === true, 'a good intensity is accepted');

console.log('\n== pressure ==');
VG.DYN.setIntensity('alive');
VG.DYN.init(world, world.seed);
VG.DYN.heat = 0;
VG.DYN.addHeat(30);
ok(VG.DYN.threat().level >= 1, 'heat raises the threat level');
VG.DYN.heat = 0;
VG.DYN.addHeat(90);
ok(VG.DYN.threat().level === 3, 'high heat is the top threat level');
ok(VG.DYN.threat().heat <= 100, 'heat is capped');
VG.DYN.setIntensity('quiet');
VG.DYN.heat = 0;
VG.DYN.addHeat(60);
ok(VG.DYN.heat === 0, 'quiet worlds do not accumulate pressure');
VG.DYN.setIntensity('alive');

console.log('\n== it does not fall over ==');
VG.DYN.init({ W: 288, H: 288, pois: [], containers: [], enemies: [], inb: () => false, town: { x: 1, y: 1 }, yard: { x: 2, y: 2 }, mine: { x: 3, y: 3 }, lake: { x: 4, y: 4 }, seed: 1 }, 1);
let threw = null;
try {
  for (let i = 0; i < 500; i++) VG.DYN.update(1, player, world);
} catch (e) { threw = e; }
ok(!threw, 'an empty world does not throw' + (threw ? ': ' + threw.message : ''));

threw = null;
try {
  VG.DYN.init(world, world.seed);
  VG.DYN.update(1, null, world);
  VG.DYN.markers(world);
  VG.DYN.radioLine();
} catch (e) { threw = e; }
ok(!threw, 'no player does not throw' + (threw ? ': ' + threw.message : ''));

threw = null;
try {
  VG.DYN.setIntensity('alive');
  VG.DYN.load({ intensity: 'danger', heat: 55, helped: 3 });
  ok(VG.DYN.intensity === 'danger', 'a saved intensity loads');
  ok(VG.DYN.heat === 55, 'a saved heat loads');
  VG.DYN.load(null);
} catch (e) { threw = e; }
ok(!threw, 'a null save does not throw' + (threw ? ': ' + threw.message : ''));

console.log('\n== the live renderer ==');
const GFX = sandbox.window.VG.GFX || {};
ok(typeof GFX.paintLive === 'function', 'GFX.paintLive exists');
ok(typeof GFX.paintLiveMarkers === 'function', 'GFX.paintLiveMarkers exists');
ok(typeof GFX.liveLights === 'function', 'GFX.liveLights exists');

let ops = 0;
const stubCtx = {
  canvas: { width: 1280, height: 720 },
  getTransform: () => ({ a: 1 }),
  fillRect: () => { ops++; }, beginPath: () => { ops++; }, moveTo: () => { ops++; }, lineTo: () => { ops++; },
  arc: () => { ops++; }, ellipse: () => { ops++; }, fill: () => { ops++; }, stroke: () => { ops++; },
  save: () => { ops++; }, restore: () => { ops++; }, translate: () => { ops++; }, rotate: () => { ops++; },
  scale: () => { ops++; }, setTransform: () => { ops++; }, clearRect: () => { ops++; },
  fillText: () => { ops++; }, strokeText: () => { ops++; }, measureText: () => ({ width: 10 }),
  fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', globalAlpha: 1, textAlign: 'left',
  createLinearGradient: () => ({ addColorStop: () => { } }),
  createRadialGradient: () => ({ addColorStop: () => { } }),
  clip: () => { ops++; }, rect: () => { ops++; }, quadraticCurveTo: () => { ops++; },
  bezierCurveTo: () => { ops++; }, closePath: () => { ops++; }, strokeRect: () => { ops++; },
  drawImage: () => { ops++; }, setLineDash: () => { }
};
const dynStub = {
  calls: [{ id: 'c1', who: 'TEST', text: 'help', x: 500, y: 500, life: 400, maxLife: 400, hostile: false, answered: false }],
  raids: [{ id: 'r1', name: 'raid', x: 700, y: 700, life: 100, warn: 55, spawned: false, done: false }],
  convoys: [{ id: 'v1', name: 'convoy', from: { x: 3, y: 200 }, to: { x: 200, y: 200 }, t: 10, dur: 300, trucks: 3, done: false }]
};
const fakeWorld = { pois: [], enemies: [], containers: [], W: 288, H: 288, TILE: 32 };
const fakeP = { x: 100, y: 100, face: 0 };
const fakeSt = { time: 1000, showCrosshair: true };

threw = null;
try {
  GFX.paintLive(stubCtx, { x: 0, y: 0 }, fakeWorld, dynStub, fakeP, fakeSt, 1.0);
  GFX.paintLiveMarkers(stubCtx, { x: 0, y: 0 }, fakeWorld, dynStub, fakeP, fakeSt, 1.0);
  const lights = GFX.liveLights(stubCtx, { x: 0, y: 0 }, fakeWorld, dynStub, fakeP, fakeSt);
  ok(Array.isArray(lights), 'liveLights returns an array');
  ok(lights.length > 0, 'liveLights reports the convoy headlights (' + lights.length + ')');
  for (const L of lights) {
    if (!Number.isFinite(L.x) || !Number.isFinite(L.y) || !(L.r > 0)) { console.log('  FAIL bad light ' + JSON.stringify(L)); fail++; break; }
  }
} catch (e) { threw = e; }
ok(!threw, 'the live renderer does not throw' + (threw ? ': ' + threw.message : ''));
ok(ops > 0, 'the live renderer actually drew something (' + ops + ' ops)');

threw = null;
try {
  GFX.paintLive(stubCtx, { x: 0, y: 0 }, fakeWorld, null, fakeP, fakeSt, 1.0);
  GFX.paintLiveMarkers(stubCtx, { x: 0, y: 0 }, fakeWorld, null, fakeP, fakeSt, 1.0);
  const l2 = GFX.liveLights(stubCtx, { x: 0, y: 0 }, fakeWorld, null, fakeP, fakeSt);
  ok(l2.length === 0, 'no dynamic state means no lights');
} catch (e) { threw = e; }
ok(!threw, 'the live renderer survives a null dynamic state' + (threw ? ': ' + threw.message : ''));

console.log('\n== file rules ==');
/* dynamic.js is an engine file like main.js and ui.js, which use typographic
   dashes in their prose; the two NEW content/render files are held to plain
   ASCII because they are loaded as plain scripts and copied around. */
for (const f of ['src/dyn_content.js', 'src/dynamic.js', 'src/gfx_live.js']) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { console.log('  FAIL ' + f + ' does not exist'); fail++; continue; }
  const txt = fs.readFileSync(p, 'utf8');
  ok(txt.length <= 60 * 1024, f + ' is under 60 KB (' + Math.round(txt.length / 1024) + ' KB)');
  ok(!/\bimport\s|\bexport\s/.test(txt), f + ' has no import/export');
  ok(txt.indexOf('use strict') >= 0, f + ' declares strict mode');
}
for (const f of ['src/dyn_content.js', 'src/gfx_live.js']) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  const txt = fs.readFileSync(p, 'utf8');
  ok(!/[^\x00-\x7F]/.test(txt), f + ' is pure ASCII');
  ok(!/=>/.test(txt), f + ' uses no arrow functions');
  ok(!/\b(const|let)\s/.test(txt), f + ' uses no const/let');
}
const dynTxt = fs.readFileSync(path.join(ROOT, 'src/dynamic.js'), 'utf8');
ok(dynTxt.indexOf('VG.DYN') >= 0, 'dynamic.js publishes VG.DYN');
const livePath = path.join(ROOT, 'src/gfx_live.js');
const liveTxt = fs.existsSync(livePath) ? fs.readFileSync(livePath, 'utf8') : '';
const contentTxt = fs.readFileSync(path.join(ROOT, 'src/dyn_content.js'), 'utf8');
ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(contentTxt + liveTxt), 'no emoji in the new content');

console.log('\n== the renderer is wired to the living layer ==');
const renderTxt = fs.readFileSync(path.join(ROOT, 'src/render.js'), 'utf8');
ok(renderTxt.indexOf('paintLive') >= 0, 'render.js calls paintLive');
ok(renderTxt.indexOf('paintLiveMarkers') >= 0, 'render.js calls paintLiveMarkers');
ok(renderTxt.indexOf('liveLights') >= 0, 'render.js collects live lights');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
ok(html.indexOf('src/dynamic.js') >= 0, 'index.html loads dynamic.js');
ok(html.indexOf('src/dyn_content.js') >= 0, 'index.html loads dyn_content.js');
ok(html.indexOf('src/gfx_live.js') >= 0, 'index.html loads gfx_live.js');
ok(html.indexOf('id="comms-list"') >= 0, 'the HUD has a radio ticker');
ok(html.indexOf('id="threat"') >= 0, 'the HUD has a pressure card');

console.log('\n' + (fail === 0 ? 'ALL CHECKS PASSED' : fail + ' CHECK(S) FAILED'));
process.exit(fail === 0 ? 0 : 1);
