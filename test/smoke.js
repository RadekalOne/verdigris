/* VERDIGRIS — headless smoke test
   Run: node test/smoke.js
   Validates world generation, content integrity and the deduction graph without a browser. */
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
  /* no-op timers: main.js schedules a respawn through setTimeout, and the
     sandbox has no event loop to run it in */
  setTimeout: () => 0,
  clearTimeout: () => { },
  /* the help panel and the log touch the DOM when a container is opened */
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, appendChild: () => { }, removeChild: () => { }, set innerHTML (v) { }, get innerHTML () { return ''; }, children: [] })
  },
  localStorage: { getItem: () => null, setItem: () => { } }
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
 'src/world.js', 'src/loot.js', 'src/player.js', 'src/save.js', 'src/audio.js', 'src/help.js',
 'src/ui.js', 'src/main.js'].forEach((f) => {
  const loaded = load(f);
  if (!loaded) fail++;
});

const VG = sandbox.window.VG;
if (!VG) { console.log('FATAL: VG never defined'); process.exit(1); }
/* main.js is loaded here so the bullet sweep can be exercised. It logs
   through VG.log, which lives in ui.js and needs a DOM, so the sandbox
   gets a stub. */
if (!VG.log) VG.log = () => { };

console.log('\n== content ==');
VG.itemIndex();
const items = VG.ITEMS || [];
ok(items.length >= 55, 'item count ' + items.length + ' (>=55)');
const ids = new Set(items.map((i) => i.id));
ok(ids.size === items.length, 'no duplicate item ids');
for (const it of items) {
  for (const k of ['dmg', 'rate', 'range', 'armor', 'hp', 'heal', 'rad', 'thirst', 'food']) {
    if (!(k in it.stats)) { console.log('  FAIL ' + it.id + ' missing stat ' + k); fail++; }
  }
  if (it.cat === 'weapon' && !ids.has(it.ammo)) { console.log('  FAIL ' + it.id + ' bad ammo'); fail++; }
  if ([...String(it.glyph)].length !== 1) { console.log('  FAIL ' + it.id + ' glyph not one char'); fail++; }
}
ok((VG.FACTIONS || []).length === 3, 'factions ' + (VG.FACTIONS || []).length);
ok((VG.QUESTS || []).length >= 9, 'quests ' + (VG.QUESTS || []).length);

const cases = (VG.CASES || []).concat(VG.CASES_B || []);
ok(cases.length === 8, 'cases ' + cases.length + ' (expect 8)');
const caseIds = new Set(cases.map((c) => c.id));
for (const q of (VG.QUESTS || [])) {
  if (q.requires && q.requires.case) ok(caseIds.has(q.requires.case), 'quest ' + q.id + ' references real case ' + q.requires.case);
}

console.log('\n== deduction graph ==');
let totalClues = 0;
for (const c of cases) {
  const fids = new Set(c.facts.map((f) => f.id));
  const cids = new Set(c.clues.map((x) => x.id));
  totalClues += c.clues.length;
  for (const cl of c.clues) {
    if (!fids.has(cl.fact)) { console.log('  FAIL ' + c.id + '/' + cl.id + ' -> missing fact ' + cl.fact); fail++; }
    if (!cl.text || cl.text.length < 40) { console.log('  FAIL ' + c.id + '/' + cl.id + ' thin text'); fail++; }
  }
  for (const f of c.facts) {
    if (f.source && !cids.has(f.source) && !(c.deductions || []).some((d) => d.id === f.source)) {
      console.log('  FAIL ' + c.id + '/' + f.id + ' bad source ' + f.source); fail++;
    }
  }
  for (const d of (c.deductions || [])) {
    for (const i of d.inputs) if (!fids.has(i)) { console.log('  FAIL ' + c.id + '/' + d.id + ' bad input ' + i); fail++; }
    if (!fids.has(d.output)) { console.log('  FAIL ' + c.id + '/' + d.id + ' bad output'); fail++; }
  }
  for (const s of (c.solutions || [])) {
    for (const r of (s.requires || [])) if (!fids.has(r)) { console.log('  FAIL ' + c.id + '/' + s.id + ' bad req ' + r); fail++; }
  }
  // reachability
  const reach = new Set(c.clues.map((x) => x.fact));
  let changed = true;
  while (changed) {
    changed = false;
    for (const d of (c.deductions || [])) {
      if (d.inputs.every((i) => reach.has(i)) && !reach.has(d.output)) { reach.add(d.output); changed = true; }
    }
  }
  for (const f of c.facts) if (!reach.has(f.id)) { console.log('  FAIL ' + c.id + ' unreachable fact ' + f.id); fail++; }
  for (const s of (c.solutions || [])) {
    if (!(s.requires || []).every((r) => reach.has(r))) { console.log('  FAIL ' + c.id + '/' + s.id + ' unreachable'); fail++; }
  }
  console.log('  ' + c.id.padEnd(24) + ' clues ' + String(c.clues.length).padStart(2) +
    '  facts ' + String(c.facts.length).padStart(2) + '  deductions ' + String((c.deductions || []).length).padStart(2) +
    '  solutions ' + (c.solutions || []).length);
}
ok(totalClues >= 32, 'total clues ' + totalClues);

console.log('\n== cross-file integrity ==');
const poiKeys = new Set((VG.POI_TYPES || []).map((t) => t.key));
const legalTypes = new Set(['log', 'photo', 'object', 'tape', 'testimony', 'body', 'specimen']);
const legalRep = new Set(['ledger', 'choir', 'free_line']);
const allClueIds = new Set(), allFactIds = new Set(), allDedIds = new Set(), allSolIds = new Set();
const seenSets = new Map();
const dupIds = [], dupSets = [], badPoi = [], badType = [], badRep = [], badItems = [];
for (const c of cases) {
  for (const x of (c.clues || [])) {
    if (allClueIds.has(x.id)) dupIds.push('clue ' + x.id);
    allClueIds.add(x.id);
    if (!poiKeys.has(x.poi)) badPoi.push(c.id + '/' + x.id + ' -> ' + x.poi);
    if (!legalTypes.has(x.type)) badType.push(c.id + '/' + x.id + ' -> ' + x.type);
  }
  for (const f of (c.facts || [])) {
    if (allFactIds.has(f.id)) dupIds.push('fact ' + f.id);
    allFactIds.add(f.id);
  }
  for (const d of (c.deductions || [])) {
    if (allDedIds.has(d.id)) dupIds.push('deduction ' + d.id);
    allDedIds.add(d.id);
    const k = (d.inputs || []).slice().sort().join('|');
    if (seenSets.has(k)) dupSets.push(c.id + ' vs ' + seenSets.get(k)); else seenSets.set(k, c.id);
  }
  for (const s of (c.solutions || [])) {
    if (allSolIds.has(s.id)) dupIds.push('solution ' + s.id);
    allSolIds.add(s.id);
  }
  const rewards = [(c.reward || {})].concat((c.solutions || []).map((s) => s.reward || {}));
  for (const r of rewards) {
    for (const k in (r.rep || {})) if (!legalRep.has(k)) badRep.push(c.id + ' -> ' + k);
    for (const it of (r.items || [])) if (!ids.has(it)) badItems.push(c.id + ' -> ' + it);
  }
}
ok(dupIds.length === 0, 'all clue/fact/deduction/solution ids unique across files' + (dupIds.length ? ' DUP ' + dupIds.join(', ') : ''));
ok(dupSets.length === 0, 'no duplicate deduction input sets across cases' + (dupSets.length ? ' DUP ' + dupSets.join(', ') : ''));
ok(badPoi.length === 0, 'every clue poi is a real POI type' + (badPoi.length ? ' BAD ' + badPoi.join(', ') : ''));
ok(badType.length === 0, 'every clue type is legal' + (badType.length ? ' BAD ' + badType.join(', ') : ''));
ok(badRep.length === 0, 'every reward rep key is a faction' + (badRep.length ? ' BAD ' + badRep.join(', ') : ''));
ok(badItems.length === 0, 'every reward item exists in the catalog' + (badItems.length ? ' BAD ' + badItems.join(', ') : ''));
const noBrief = cases.filter((c) => !c.brief || !c.brief.trim()).length;
ok(noBrief === 0, 'every case has a brief');
const noEp = cases.filter((c) => (c.solutions || []).some((s) => !s.epilogue || s.epilogue.trim().length < 80)).length;
ok(noEp === 0, 'every solution has a substantial epilogue');
const shortClue = cases.reduce((n, c) => n + (c.clues || []).filter((x) => !x.text || x.text.length < 120).length, 0);
ok(shortClue === 0, 'no thin clue text (' + shortClue + ' under 120 chars)');

console.log('\n== world generation ==');
const w = VG.genWorld(20261023);
ok(w.pois.length >= 60, 'pois ' + w.pois.length);
ok(w.containers.length >= 90, 'containers ' + w.containers.length);
const types = new Set(w.pois.map((p) => p.type));
let missingType = [];
for (const t of VG.POI_TYPES) if (!types.has(t.key)) missingType.push(t.key);
ok(missingType.length === 0, 'every POI type present' + (missingType.length ? ' MISSING ' + missingType.join(',') : ''));
ok(w.clues.length === totalClues, 'all ' + w.clues.length + ' clues placed into containers');
const clueInst = new Set(w.clues.map((cl) => cl.id));
ok(clueInst.size === w.clues.length, 'no duplicated clue placements');
const clueCons = new Set(w.clues.map((cl) => cl.container));
ok(clueCons.size === w.clues.length, 'every clue has its own container (' + clueCons.size + '/' + w.clues.length + ')');
const contWithClue = w.containers.filter((cn) => cn.clueId).length;
ok(contWithClue === w.clues.length, 'every clue container holds exactly one clue (' + contWithClue + ')');
const clueNoC = w.clues.filter((cl) => !cl.caseId);
ok(clueNoC.length === 0, 'every placed clue has a case');
const wCases = new Set(w.clues.map((cl) => cl.caseId));
ok(wCases.size === cases.length, 'all 8 cases have at least one placed clue (' + wCases.size + ')');
ok(w.enemies.length > 80, 'enemies ' + w.enemies.length);
ok(w.start && w.start.x > 0, 'start position set ' + JSON.stringify(w.start));

console.log('\n== loot + player ==');
const p = VG.newPlayer(w);
const rng = VG.makeRng(7);
for (let i = 0; i < 400; i++) {
  const l = VG.rollLoot(rng.int(0, 3), rng);
  for (const e of l) {
    if (!ids.has(e.id)) { console.log('  FAIL rolled unknown item ' + e.id); fail++; }
  }
}
ok(true, '400 loot rolls produced only catalog items');
VG.sprint = true;
VG.updatePlayer(p, 0.016, { up: true, down: false, left: false, right: false }, w);
ok(p.stam < 100, 'stamina drains while sprinting');
const stamAfterSprint = p.stam;
VG.sprint = false;
VG.updatePlayer(p, 0.016, { up: true, down: false, left: false, right: false }, w);
ok(p.stam >= stamAfterSprint, 'walking is free — stamina recovers on foot');
VG.updatePlayer(p, 0.016, { up: false, down: false, left: false, right: false }, w);
ok(p.stam > 0, 'stamina regenerates at rest');
const before = p.dose;
VG.updatePlayer(p, 0.5, { up: false, down: false, left: false, right: false }, w);
ok(p.dose >= before, 'dose accumulates over time');
ok(VG.invWeight(p) > 0, 'starting kit has weight ' + VG.invWeight(p));

/* needs are a clock, not a sprint. A survey that ends in a minute of
   dehydration is not a survey, so the drain rates get asserted. */
const drainSeconds = (stat) => {
  const q = VG.newPlayer(w);
  q[stat] = 100;
  let t = 0;
  while (q[stat] > 0 && t < 1200) {
    VG.updatePlayer(q, 0.1, { up: true, down: false, left: false, right: false }, w);
    t += 0.1;
  }
  return Math.round(t);
};
const waterSec = drainSeconds('water');
const foodSec = drainSeconds('food');
ok(waterSec > 180, 'water lasts more than three minutes of walking (' + waterSec + 's)');
ok(foodSec > 240, 'food lasts more than four minutes of walking (' + foodSec + 's)');
ok(waterSec < foodSec, 'water is the faster of the two needs');

console.log('\n== water sources ==');
/* a player who cannot find water cannot survive, so the flats must carry
   enough of it, and the HUD must be able to point at one */
let wellCounts = [];
for (let s = 1; s <= 8; s++) {
  const ww = VG.genWorld(s * 7919);
  const n = ww.pois.filter((x) => x.type === 'well' || x.type === 'watertower').length;
  wellCounts.push(n);
}
const minWells = Math.min.apply(null, wellCounts);
ok(minWells >= 5, 'every seed carries at least five water sources (min ' + minWells + ')');
ok(VG.World.pois.some((x) => x.type === 'well' || x.type === 'watertower'), 'the current world has water sources');

console.log('\n== item id integrity ==');
/* Every id the game hands to the player must exist in the catalog. A ghost id
   is invisible in the inventory, does nothing when used, and silently eats the
   materials that produced it. This is the failure that hid the whole crafting
   table, so it gets its own section. */
const ghostKit = Object.keys(p.inv).filter((k) => !ids.has(k));
ok(ghostKit.length === 0, 'starting kit holds only real items' + (ghostKit.length ? ' GHOST ' + ghostKit.join(', ') : ''));
const ghostHotbar = (p.hotbar || []).filter((k) => k && !ids.has(k));
ok(ghostHotbar.length === 0, 'starting hotbar holds only real items' + (ghostHotbar.length ? ' GHOST ' + ghostHotbar.join(', ') : ''));
ok(!p.weapon || ids.has(p.weapon), 'starting weapon exists in the catalog');

const ghostOut = [], ghostNeed = [];
for (const r of (VG.craftRecipes || [])) {
  if (!ids.has(r.out)) ghostOut.push(r.id + ' -> ' + r.out);
  for (const k in (r.need || {})) if (!ids.has(k)) ghostNeed.push(r.id + ' -> ' + k);
}
ok(ghostOut.length === 0, 'every craft recipe output is a real item' + (ghostOut.length ? ' GHOST ' + ghostOut.join(', ') : ''));
ok(ghostNeed.length === 0, 'every craft recipe input is a real item' + (ghostNeed.length ? ' GHOST ' + ghostNeed.join(', ') : ''));

const ghostQuest = [], ghostQuestReq = [];
for (const q of (VG.QUESTS || [])) {
  for (const it of ((q.reward || {}).items || [])) if (!ids.has(it)) ghostQuest.push(q.id + ' -> ' + it);
  const reqItems = (q.requires || {}).items;
  const reqIds = Array.isArray(reqItems) ? reqItems : Object.keys(reqItems || {});
  for (const it of reqIds) if (!ids.has(it)) ghostQuestReq.push(q.id + ' -> ' + it);
}
ok(ghostQuest.length === 0, 'every quest reward item is real' + (ghostQuest.length ? ' GHOST ' + ghostQuest.join(', ') : ''));
ok(ghostQuestReq.length === 0, 'every quest requirement item is real' + (ghostQuestReq.length ? ' GHOST ' + ghostQuestReq.join(', ') : ''));

/* a contract that names supplies must name a count the player can actually
   deliver — an array form with no target can never be satisfied */
const badCount = [];
for (const q of (VG.QUESTS || [])) {
  const reqItems = (q.requires || {}).items;
  if (!reqItems) continue;
  if (Array.isArray(reqItems) && !(q.target > 0)) badCount.push(q.id);
}
ok(badCount.length === 0, 'every supply contract states a count' + (badCount.length ? ' BAD ' + badCount.join(', ') : ''));

/* the survival loop needs at least one way to put each need back */
const canRestore = (stat) => items.some((i) => i.cat === 'aid' && i.stats[stat] > 0);
ok(canRestore('thirst'), 'at least one aid restores thirst');
ok(canRestore('food'), 'at least one aid restores food');
ok(canRestore('heal'), 'at least one aid restores health');
ok(items.some((i) => i.stats.rad < 0), 'at least one aid reduces dose');
ok(ids.has('aid_filter'), 'the dust filter the dose mechanic checks for exists');

/* passive gear must never be consumable */
const passive = items.filter((i) => i.passive);
ok(passive.length >= 1, 'a passive item exists (' + passive.length + ')');
ok(passive.every((i) => i.stats.heal === 0 && i.stats.thirst === 0 && i.stats.food === 0),
  'passive items restore nothing when used');

console.log('\n== landmarks are actually landmarks ==');
/* The elevation tests used to run before the landmark tests, so the salt and
   dune thresholds swallowed the town, the reactor yard and the mine before
   those tests ever ran. The map was 87% undifferentiated desert and the game
   looked empty no matter how the renderer was fixed. A place has to be a
   place: assert that each landmark disc is dominated by its own biome. */
{
  const bi = {};
  VG.BIOME.forEach((z, i) => { bi[z.key] = i; });
  let lmFail = 0;
  for (let s = 1; s <= 8; s++) {
    const ww = VG.genWorld(s * 7919);
    const disc = (cx, cy, r) => {
      const c = {};
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          if (x < 0 || y < 0 || x >= ww.W || y >= ww.H) continue;
          if (Math.hypot(x - cx, y - cy) > r) continue;
          const b = ww.biome[y * ww.W + x];
          c[b] = (c[b] || 0) + 1;
        }
      }
      const tot = Object.keys(c).reduce((a, k) => a + c[k], 0);
      return { c: c, tot: tot };
    };
    const town = disc(ww.town.x, ww.town.y, 26);
    const yard = disc(ww.yard.x, ww.yard.y, 30);
    const mine = disc(ww.mine.x, ww.mine.y, 16);
    const pct = (d, b) => +((100 * (d.c[b] || 0)) / d.tot).toFixed(1);
    const tp = pct(town, bi.town), yp = pct(yard, bi.refinery), mp = pct(mine, bi.ruin);
    if (tp < 70) { console.log('  FAIL seed ' + s + ': town disc is only ' + tp + '% town'); lmFail++; }
    if (yp < 70) { console.log('  FAIL seed ' + s + ': reactor yard disc is only ' + yp + '% refinery'); lmFail++; }
    if (mp < 60) { console.log('  FAIL seed ' + s + ': mine disc is only ' + mp + '% ruin'); lmFail++; }
  }
  ok(lmFail === 0, 'town, reactor yard and mine are dominated by their own biome on 8 seeds');
}

console.log('\n== 20 world seeds ==');
let seedFail = 0;
for (let s = 1; s <= 20; s++) {
  const ww = VG.genWorld(s * 7919);
  const ty = new Set(ww.pois.map((x) => x.type));
  if (ww.clues.length !== totalClues) { console.log('  seed ' + s + ' placed ' + ww.clues.length + '/' + totalClues + ' clues'); seedFail++; }
  for (const t of VG.POI_TYPES) if (!ty.has(t.key)) { console.log('  seed ' + s + ' missing ' + t.key); seedFail++; }
}
ok(seedFail === 0, 'all 20 seeds place every clue and POI type');

console.log('\n== the combat graph ==');
/* A weapon tag the engine ignores is a promise the game does not keep. The
   Field Kit prints these in front of the player, so every one of them has
   to mean something. */
const HANDLED_MODS = new Set(['heavy', 'rapid', 'accurate', 'silenced', 'nightvision', 'tough']);
const seenMods = new Set();
for (const it of items) for (const m of (it.mods || [])) seenMods.add(m);
const deadMods = [...seenMods].filter((m) => !HANDLED_MODS.has(m));
ok(deadMods.length === 0, 'every mod tag on an item is handled by the engine' +
  (deadMods.length ? ': ' + deadMods.join(', ') : ''));

/* every mod the engine handles is reachable - an implemented mod that no
   item carries is dead code pretending to be a feature */
for (const m of HANDLED_MODS) {
  if (!seenMods.has(m)) { console.log('  FAIL mod ' + m + ' is implemented but nothing carries it'); fail++; }
}
ok([...HANDLED_MODS].every((m) => seenMods.has(m)), 'no implemented mod is unreachable');

/* firearms fire, blades swing. The old rule (range 150 or more) quietly
   turned the shotgun, the sawn-off and the flare pistol into melee swings. */
const FIREARMS = ['wpn_pump_shotgun', 'wpn_sawn_off', 'wpn_flare_pistol', 'wpn_long_horn',
  'wpn_ledger_issue', 'wpn_sodium_lance', 'wpn_needle_carbine', 'wpn_survey_carbine',
  'wpn_survey_marksman', 'wpn_bolt_rifle', 'wpn_copper_slug', 'wpn_rivet_sling'];
const BLADES = ['wpn_scrap_torch', 'wpn_pick_mace'];
for (const id of FIREARMS) {
  const w = items.find((x) => x.id === id);
  if (!w) { console.log('  FAIL missing weapon ' + id); fail++; continue; }
  ok(VG.isRangedWeapon(w), id + ' fires rather than swings');
}
for (const id of BLADES) {
  const w = items.find((x) => x.id === id);
  if (!w) { console.log('  FAIL missing weapon ' + id); fail++; continue; }
  ok(!VG.isRangedWeapon(w), id + ' swings rather than fires');
}

/* rate is rate of fire: higher must be faster. It used to be ADDED into
   the cooldown, which made the weapons named 'rapid' the slowest. */
const pTest = { weapon: 'wpn_needle_carbine' };
const slow = { weapon: 'wpn_bolt_rifle' };
ok(VG.attackCooldown(pTest) < VG.attackCooldown(slow),
  'a higher rate of fire is a shorter cooldown (' +
  VG.attackCooldown(pTest).toFixed(2) + 's vs ' + VG.attackCooldown(slow).toFixed(2) + 's)');

/* and reach means something: a marksman rifle must out-range a revolver */
const mTest = { weapon: 'wpn_survey_marksman' };
const rTest = { weapon: 'wpn_long_horn' };
ok(VG.attackRange(mTest) > VG.attackRange(rTest), 'the marksman rifle out-ranges the revolver');
ok(VG.attackCooldown(mTest) > VG.attackCooldown(rTest), 'the marksman rifle is slower than the revolver');

/* the shot does not carry as far as a shot that does */
ok(VG.aggroRange({ weapon: 'wpn_needle_carbine' }) < VG.aggroRange({ weapon: 'wpn_bolt_rifle' }),
  'a silenced weapon is noticed later');
ok(VG.playerScope({ weapon: 'wpn_sodium_lance' }) > VG.playerScope({ weapon: 'wpn_bolt_rifle' }),
  'a night-vision scope sees further');
ok(VG.playerArmor({ armor: 'armor_patina_plate' }) > 0, 'armour counts');
ok(VG.playerArmor({ armor: null }) === 0, 'no armour means no armour');

/* the starting kit must agree with itself: coins in the pack are coins in
   the ammo counter */
const w0 = VG.genWorld(4242);
const p0 = VG.newPlayer(w0);
ok((p0.ammo['ammo_coin'] || 0) === (p0.inv['ammo_coin'] || 0),
  'the starting rivet coins are in the ammo counter (' + (p0.ammo['ammo_coin'] || 0) + ')');

/* and the flare pistol must actually light the ground */
ok(VG.item('wpn_flare_pistol').ammo === 'ammo_flare', 'the flare pistol fires flares');

/* a round must not pass through a target because the frame was long. At
   thirty frames a second a bullet moves 25 pixels and a target is 14
   wide, so a point test would miss it half the time. */
const wT = VG.genWorld(909);
const pT = VG.newPlayer(wT);
pT.x = 200; pT.y = 200;
const eT = { x: 200 / VG.TILE + 1.0, y: 200 / VG.TILE, hp: 70, r: 11, dead: false, kind: 'rusted' };
wT.enemies = [eT];
VG.state.bullets.length = 0;
VG.state.bullets.push({ x: 200 + 14, y: 200, vx: 760, vy: 0, life: 0.3, dmg: 30 });
VG.updateBullets(0.05, pT, wT);   // one long frame: 38 pixels in a single step
ok(eT.hp < 70, 'a round does not tunnel through a target on a long frame (' + eT.hp + ' hp)');
VG.state.bullets.length = 0;

console.log('\n== the food loop ==');
/* Water lives at a well: public, on the map, one key. Food had nowhere like
   that - it existed only as a chance roll inside a random crate, and a diner
   with nothing in the back was a picture of a diner. These assertions are
   about the ENGINE PATH, not the shape: a building can be in the food table
   and still hand you a crate with no rations in it. */
const wF = VG.genWorld(20261023);

/* every food-bearing type is a real building type, and its item exists */
const foodPoiKeys = new Set((VG.POI_TYPES || []).map((t) => t.key));
const foodTypes = Object.keys(VG.FOOD_POI || {});
ok(foodTypes.length > 0, foodTypes.length + ' building types keep provisions');
const badFoodType = foodTypes.filter((k) => !foodPoiKeys.has(k));
ok(badFoodType.length === 0, 'every food-bearing type is a real building' +
  (badFoodType.length ? ': ' + badFoodType.join(', ') : ''));
const ghostFood = foodTypes.filter((k) => !VG.item(VG.FOOD_POI[k].item));
ok(ghostFood.length === 0, 'every food-bearing type names a real item' +
  (ghostFood.length ? ': ' + ghostFood.join(', ') : ''));

/* every food-bearing building on the map holds at least one ration, and the
   container that holds it really carries that id */
let noFood = 0, wrongFood = 0, foodBuildings = 0;
for (const poi of wF.pois) {
  if (!VG.isFoodPoi(poi)) continue;
  foodBuildings++;
  const cs = poi.containers.map((i) => wF.containers[i]).filter((c) => c && c.food);
  if (!cs.length) { noFood++; continue; }
  for (const c of cs) {
    if (!VG.item(c.food)) wrongFood++;
    if (c.food !== VG.FOOD_POI[poi.type].item) wrongFood++;
  }
}
ok(foodBuildings > 0, foodBuildings + ' buildings on this seed keep provisions');
ok(noFood === 0, 'every building that keeps provisions actually holds them (' + noFood + ' empty)');
ok(wrongFood === 0, 'no container claims a food item that is not its building’s (' + wrongFood + ' wrong)');

/* the pointer has to point somewhere real, and in the right direction */
const pf = VG.newPlayer(wF);
pf.x = 100; pf.y = 100;
const cf = VG.closestFood(pf, wF);
ok(!!cf, 'the food pointer finds a building to point at');
if (cf) {
  const dx = cf.poi.x * VG.TILE - pf.x, dy = cf.poi.y * VG.TILE - pf.y;
  ok(cf.dir === VG.compassDir(dx, dy), 'the food pointer agrees with the geometry (' + cf.dir + ')');
  ok(cf.dist > 0 && cf.note && cf.note.length > 10, 'the food pointer carries a distance and a note');
}

/* OPEN A FOOD CONTAINER AND EAT WHAT IS IN IT. This is the assertion that
   matters: a food table that names an item nobody ever receives is the same
   bug as a reward that names an item which does not exist. */
const diner = wF.pois.find((p) => VG.isFoodPoi(p) && p.containers.length);
ok(!!diner, 'there is a food-bearing building to open');
if (diner) {
  const c = wF.containers[diner.containers.find((i) => wF.containers[i] && wF.containers[i].food)];
  const before = VG.invTotal(pf);
  VG.openContainer(c, pf);
  const got = pf.inv[VG.FOOD_POI[diner.type].item] || 0;
  ok(got > 0, 'opening a ' + diner.type + ' hands you its ' + VG.item(VG.FOOD_POI[diner.type].item).name);
  ok(VG.invTotal(pf) > before, 'opening it grew the pack (' + before + ' -> ' + VG.invTotal(pf) + ')');

  /* and the tin has to be usable: a ration you cannot eat is not food */
  pf.food = 30;
  const foodItem = VG.FOOD_POI[diner.type].item;
  const used = pf.inv[foodItem];
  VG.useItem(foodItem);
  ok(pf.food > 30, 'eating what you found raises your food (' + Math.round(pf.food) + ')');
  ok((pf.inv[foodItem] || 0) === used - 1, 'eating it consumes it');
  ok(pf.hotbar.indexOf(foodItem) < 0, 'the hotbar slot does not keep offering what you just ate');
}

/* a found consumable has to land somewhere you can reach: the hotbar */
const pf2 = VG.newPlayer(wF);
pf2.hotbar = [null, null, null, null, null];
VG.invAdd(pf2, 'aid_ration_tin', 1);
ok(pf2.hotbar.indexOf('aid_ration_tin') >= 0, 'a found ration lands in a hotbar slot you can press');
/* a passive aid must not waste a slot - it is carried, not consumed */
pf2.hotbar = [null, null, null, null, null];
VG.invAdd(pf2, 'aid_filter', 1);
ok(pf2.hotbar.indexOf('aid_filter') < 0, 'a carried filter does not take a hotbar slot');

/* the crafting route: cloth and ceramic make a ration, and it feeds you */
const pf3 = VG.newPlayer(wF);
pf3.hotbar = [null, null, null, null, null];
pf3.inv['scrap_cloth'] = 2; pf3.inv['scrap_ceramic'] = 2;
pf3.food = 25;
const recipe = VG.craftRecipes.find((r) => r.out === 'aid_ration_tin');
ok(!!recipe, 'there is a recipe for a ration tin');
if (recipe) {
  for (const k in recipe.need) {
    if ((pf3.inv[k] || 0) < recipe.need[k]) pf3.inv[k] = recipe.need[k];
  }
  for (const k in recipe.need) VG.invRemove(pf3, k, recipe.need[k]);
  VG.invAdd(pf3, recipe.out, recipe.qty);
  ok((pf3.inv[recipe.out] || 0) > 0, 'crafting a ration tin puts one in the pack');
  VG.useItem(recipe.out);
  ok(pf3.food > 25, 'the crafted tin feeds you (' + Math.round(pf3.food) + ')');
}

/* and there has to be enough of it: every seed must carry a few buildings
   that keep provisions, or a hungry player has nowhere to go */
let thinSeeds = 0;
for (let s = 1; s <= 8; s++) {
  const ww = VG.genWorld(s * 7919);
  const n = ww.pois.filter((p) => VG.isFoodPoi(p)).length;
  if (n < 3) thinSeeds++;
}
ok(thinSeeds === 0, 'every seed carries at least three places that kept provisions (' + thinSeeds + ' thin)');

console.log('\n== how shooting works ==');
/* The rules of shooting are only useful if the player can SEE them. These
   assertions are about the feedback, not the arithmetic: a reticle that is
   not where the round goes, and a hit you cannot see, are the same bug as
   a gun that does not fire. */
const wS = VG.genWorld(5150);
const pS = VG.newPlayer(wS);
pS.x = 400; pS.y = 400;

/* the round goes where the pointer is - not where the screen centre is */
VG.mouse.x = 400; VG.mouse.y = 330;
/* the camera has not moved, so screen space is world space here */
VG.mouse.world = { x: VG.mouse.x, y: VG.mouse.y };
VG.invAdd(pS, 'wpn_long_horn', 1);
VG.invAdd(pS, 'ammo_slug', 10);
VG.equipWeapon(pS, 'wpn_long_horn');
VG.state.fireCd = 0;
VG.state.bullets.length = 0;
VG.fire(pS, wS);
const bS = VG.state.bullets[0];
ok(!!bS, 'a gun puts a round in the air');
if (bS) {
  const shotAng = Math.atan2(bS.vy, bS.vx);
  const wantAng = Math.atan2(VG.mouse.world.y - pS.y, VG.mouse.world.x - pS.x);
  ok(Math.abs(shotAng - wantAng) < 0.02, 'the round goes exactly where the pointer is');
}

/* a hit has to be visible: a mark where it landed, and the thing flares */
const target = {
  x: VG.mouse.world.x / VG.TILE, y: VG.mouse.world.y / VG.TILE,
  hp: 60, maxhp: 60, r: 11, dead: false, kind: 'rusted', aggro: 0
};
wS.enemies = [target];
VG.state.fireCd = 0;
VG.state.bullets.length = 0;
VG.state.hits.length = 0;
VG.fire(pS, wS);
VG.updateBullets(0.05, pS, wS);
VG.updateBullets(0.05, pS, wS);
ok(target.hp < 60, 'the round hits what the pointer was on (' + Math.round(target.hp) + ' hp)');
ok(VG.state.hits.length > 0, 'the hit leaves a mark you can see');
ok(target.flash > 0, 'the thing that was hit flares');

/* a swing is drawn where it lands - an invisible arc cannot be aimed */
pS.x = 400; pS.y = 400;
VG.equipWeapon(pS, 'wpn_scrap_torch');
VG.state.fireCd = 0;
VG.state.swing = null;
VG.fire(pS, wS);
ok(!!VG.state.swing, 'a swing is drawn where it lands');

/* the gun shows the rounds it has left. Without this the player finds out
   they are out of ammunition by clicking, at the worst possible moment. */
pS.ammo['ammo_slug'] = 7;
ok(VG.slotCount(pS, 'wpn_long_horn') === 7, 'the gun shows how many rounds are left');
ok(VG.slotCount(pS, 'wpn_scrap_torch') === null, 'a swung weapon shows no ammunition count');
ok(VG.slotCount(pS, 'ammo_slug') === 7, 'a box of ammunition shows its count');

/* and the field manual says how it all works */
const helpSrc = fs.readFileSync(path.join(ROOT, 'src/help.js'), 'utf8');
ok(/Aiming/.test(helpSrc) && /no spread/i.test(helpSrc), 'the manual explains aiming');
ok(/Reach/.test(helpSrc) && /Swinging/.test(helpSrc), 'the manual explains reach and swinging');

/* The reticle has to be drawn WHERE THE ROUND GOES. This drives the real
   renderer against a recording canvas and looks at the coordinates it
   actually draws at - a source grep cannot tell you that the mark moved
   from the screen centre to the cursor, only that the word "mouse" is in
   the file. The reticle used to sit in the middle of the screen while the
   round flew to the cursor: a reticle that is not the aim point is worse
   than no reticle, because the player trusts it. */
console.log('\n== the reticle is at the aim point ==');
load('src/render.js');
const rec = { moves: [], rects: [] };
const stubCtx = {
  canvas: { width: 1280, height: 617 },
  fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '',
  globalAlpha: 1, globalCompositeOperation: '', shadowColor: '', shadowBlur: 0,
  shadowOffsetY: 0, lineJoin: '',
  save: () => { }, restore: () => { }, translate: () => { }, scale: () => { },
  beginPath: () => { }, closePath: () => { }, arc: () => { }, ellipse: () => { },
  rect: () => { }, fill: () => { }, clip: () => { }, fillText: () => { },
  strokeText: () => { },
  drawImage: () => { }, strokeRect: () => { }, putImageData: () => { },
  setTransform: () => { },
  createLinearGradient: () => ({ addColorStop: () => { } }),
  createRadialGradient: () => ({ addColorStop: () => { } }),
  moveTo: (x, y) => { rec.moves.push([x, y]); },
  lineTo: (x, y) => { rec.moves.push([x, y]); },
  fillRect: (x, y, w, h) => { rec.rects.push([x, y, w, h]); },
  stroke: () => { }
};
sandbox.window.innerWidth = 1280;
sandbox.window.innerHeight = 617;
sandbox.window.devicePixelRatio = 1;
const stubCanvas = {
  width: 0, height: 0, style: {},
  getContext: () => stubCtx,
  addEventListener: () => { }
};
VG.initRender(stubCanvas);

/* point the mouse well away from the centre of the screen */
const mxR = 903, myR = 214;
VG.mouse.x = mxR; VG.mouse.y = myR;
VG.mouse.world = { x: mxR, y: myR };
VG.state.paused = false;
VG.state.showCrosshair = true;
VG.state.hits.length = 0;
VG.state.swing = null;
pS.x = 400; pS.y = 400;
VG.equipWeapon(pS, 'wpn_long_horn');
rec.moves.length = 0; rec.rects.length = 0;
VG.draw(pS, wS, VG.state, 0.016);

const nearCursor = rec.moves.filter(([x, y]) => Math.abs(x - mxR) < 20 && Math.abs(y - myR) < 20);
const atCentre = rec.moves.filter(([x, y]) => Math.abs(x - 640) < 3 && Math.abs(y - 308) < 3);
ok(nearCursor.length >= 4, 'the reticle is drawn at the cursor (' + nearCursor.length + ' points)');
ok(atCentre.length === 0, 'nothing is drawn at the centre of the screen (' + atCentre.length + ' points)');
ok(stubCanvas.style.cursor === 'none', 'the system cursor stays out of the way of the reticle');
/* the damage number is outlined, because it lands on a body that may be
   flaring white - a cream number on a white-hot target is invisible */
VG.state.hits.push({ x: 500, y: 500, dmg: 35, life: 0.75 });
let outlined = false;
const origStrokeText = stubCtx.strokeText;
stubCtx.strokeText = function (t, x, y) { outlined = true; };
stubCtx.fillText = function () { };
VG.draw(pS, wS, VG.state, 0.016);
stubCtx.strokeText = origStrokeText;
ok(outlined, 'the damage number carries an outline so it reads on a white-hot target');

/* indoors there is nothing to aim at, so there is no crosshair at all */
VG.INT = VG.INT || {};
VG.INT.active = { key: 'diner' };
rec.moves.length = 0;
VG.draw(pS, wS, VG.state, 0.016);
const centreAfter = rec.moves.filter(([x, y]) => Math.abs(x - 640) < 3 && Math.abs(y - 308) < 3);
ok(centreAfter.length === 0, 'indoors there is no crosshair pointing at nothing');
ok(stubCanvas.style.cursor === 'default', 'indoors the system cursor comes back');
VG.INT.active = null;

console.log('\n' + (fail === 0 ? 'ALL CHECKS PASSED' : fail + ' FAILURE(S)'));
process.exit(fail === 0 ? 0 : 1);
