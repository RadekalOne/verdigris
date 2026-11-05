/* VERDIGRIS - the faction posts
   Run: node test/posts.js

   Claude's fourth point: Ledger standing was the only cost currency in the
   game, and its only use was gating Ledger contracts - which were menu fetch
   quests handed in from anywhere. The cost was real but invisible, because
   standing was never spent on a place you had to go to.

   The posts are the answer: one building each in the world - the Ledger at
   the bank, the Choir at the chapel, Free Line at the substation - and a
   contract is only handed in when you are standing at that building.

   The rule this file follows: assert the ENGINE PATH. It is not enough that
   a post exists and is named; a contract that can still be handed in from the
   middle of a field is the defect this section exists to remove. */
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
  setTimeout: () => 0,
  clearTimeout: () => { },
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
      style: {}, appendChild: () => { }, removeChild: () => { },
      set innerHTML (v) { }, get innerHTML () { return ''; }, children: []
    })
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
  'src/world.js', 'src/case_questions.js', 'src/caseflow.js', 'src/loot.js', 'src/player.js', 'src/interiors.js',
  'src/ui.js', 'src/main.js'].forEach((f) => {
    if (!load(f)) fail++;
  });

const VG = sandbox.window.VG;
if (!VG) { console.log('FATAL: VG never defined'); process.exit(1); }
VG.itemIndex();

console.log('\n== every faction keeps a post ==');
{
  const w = VG.genWorld(4242);
  ok((VG.FACTIONS || []).length === 3, 'there are three factions');
  for (const f of (VG.FACTIONS || [])) {
    const poi = VG.postPoi(w, f.id);
    ok(!!poi, f.name + ' has a post in the world');
    if (!poi) continue;
    ok(poi.type === VG.FACTION_POST[f.id],
      f.name + "'s post is a " + VG.poiTypeName(VG.FACTION_POST[f.id]));
    ok(poi.post === f.id, 'and the building is marked as that faction\'s post');
  }
  const counts = {};
  for (const poi of w.pois) if (poi.post) counts[poi.post] = (counts[poi.post] || 0) + 1;
  ok(Object.keys(counts).length === 3, 'exactly three buildings in the world are posts');
  ok(Object.keys(counts).every((k) => counts[k] === 1), 'and each faction has exactly one post');
}

console.log('\n== the same post every time ==');
{
  const ids = (seed) => VG.genWorld(seed).pois.filter((p) => p.post)
    .map((p) => p.id + ':' + p.post).sort().join(',');
  const a = ids(777), b = ids(777);
  ok(a.length > 0, 'a world built from a seed has posts (' + a + ')');
  ok(a === b, 'two worlds from the same seed have the same posts');
}

console.log('\n== Free Line keeps the substation on the way ==');
{
  const w = VG.genWorld(4242);
  const poi = VG.postPoi(w, 'free_line');
  let best = null, bd = Infinity;
  for (const q of w.pois) {
    if (q.type !== 'substation') continue;
    const d = VG.dist(q.x, q.y, w.start.x, w.start.y);
    if (d < bd) { bd = d; best = q; }
  }
  ok(poi && best && poi.id === best.id,
    'the Free Line post is the substation nearest the start (' +
    (poi ? poi.id : 'none') + ' vs ' + (best ? best.id : 'none') + ')');
}

console.log('\n== every contract belongs to a faction with a post ==');
{
  const w = VG.genWorld(4242);
  const orphans = (VG.QUESTS || []).filter((q) => !VG.postPoi(w, q.faction));
  ok(orphans.length === 0, 'no contract belongs to a faction that has nowhere to be handed in' +
    (orphans.length ? ' ORPHANS ' + orphans.map((q) => q.id).join(', ') : ''));
}

console.log('\n== a contract is handed in at the post, and only there ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;
  VG.INT.prepare(w);

  const q = (VG.QUESTS || []).find((x) => x.repNeeded === 0 && x.requires && x.requires.items &&
    x.requires.items.indexOf('scrap_copper') >= 0);
  ok(!!q, 'there is a contract that pays in standing for scrap');
  const need = (VG.contractNeeds(q) || {}).scrap_copper || q.target || 1;
  p.inv.scrap_copper = need;
  const repBefore = p.rep[q.faction] || 0;

  /* away from the post: nothing happens, and nothing is taken */
  p.x = 16; p.y = 16;
  ok(!VG.atPost(w, q.faction, p), 'the player is nowhere near the post');
  VG.turnIn(q.id);
  ok((p.rep[q.faction] || 0) === repBefore, 'a contract turned in away from the post earns no standing');
  ok((p.inv.scrap_copper || 0) === need, 'and the supplies are not taken either');

  /* at the post: it goes through */
  const place = VG.postPlace(w, q.faction, p);
  ok(!!place, 'the post can be described to the player');
  p.x = place.poi.x * VG.TILE;
  p.y = place.poi.y * VG.TILE;
  const at = VG.postPlace(w, q.faction, p);
  ok(VG.atPost(w, q.faction, p), 'standing at the building, the player is at the post');
  ok(at.dist <= VG.poiReach(at.poi), 'and the post is within reach of its own door');
  VG.turnIn(q.id);
  ok((p.rep[q.faction] || 0) > repBefore, 'the contract pays when it is handed in at the post');
  ok((p.inv.scrap_copper || 0) < need, 'and the supplies are collected');
}

console.log('\n== the post sheet tells you where to go ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;
  p.x = 16; p.y = 16;
  for (const f of (VG.FACTIONS || [])) {
    const place = VG.postPlace(w, f.id, p);
    ok(!!place && place.dist > 0 && !!place.dir,
      f.name + "'s post is given as a place and a bearing (" + (place ? Math.round(place.dist) + 'm ' + place.dir : 'none') + ')');
    ok(!!place && !!place.name, f.name + "'s post has a name the player can look for");
  }
}

console.log('\n== the flats still hold together ==');
{
  const w = VG.genWorld(4242);
  ok(w.pois.length >= 60, 'pois ' + w.pois.length);
  ok(w.containers.length >= 90, 'containers ' + w.containers.length);
  ok(VG.FACTION_POST.ledger === 'bank' && VG.FACTION_POST.choir === 'chapel' &&
    VG.FACTION_POST.free_line === 'substation', 'the posts are the buildings Claude asked for');
}

if (fail) { console.log('\n' + fail + ' FAILED'); process.exit(1); }
console.log('\nall checks passed');
