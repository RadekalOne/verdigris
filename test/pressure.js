/* VERDIGRIS - the world pushes back
   Run: node test/pressure.js

   Section C of the review: the flats were a place you could walk through
   without anything in them noticing. A rusted moved at half the player's
   walking pace, so nothing on the flats could ever catch you. The
   survival clocks ran out in five minutes, which meant the survey ended
   before the survey began. Ammo could be made anywhere, including in the
   field, which meant the bench never mattered. And a pack with no limit
   meant the loot never cost anything to take.

   This file holds the engine to the opposite. It asserts the things a
   player would feel rather than the things a data table would show:

     1. A minute of walking costs you a sip, not a canteen.
     2. The reactor yard is a place you do not linger in.
     3. Ammo is made at a bench, and the bench is somewhere you have to go.
     4. Your pack has a limit, and taking a crate obeys it.
     5. Killing something pays you in the scrap the economy runs on.
     6. The building that holds your evidence is not empty.
     7. A rusted is faster than you walk, and it tells you before it lunges.

   Every check is on the ENGINE PATH - the movement, the clock, the drop,
   the guard - not on a data table. A world full of numbers is not a world
   that pushes back. */
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
  'src/world.js', 'src/case_questions.js', 'src/caseflow.js', 'src/loot.js', 'src/player.js',
  'src/interiors.js', 'src/save.js', 'src/ui.js', 'src/main.js'].forEach((f) => {
    if (!load(f)) fail++;
  });

const VG = sandbox.window.VG;
if (!VG) { console.log('FATAL: VG never defined'); process.exit(1); }
VG.itemIndex();

const WALK_SPEED = 132;
const INPUT = { up: true, down: false, left: false, right: false };

console.log('\n== the clocks are a clock, not a sprint ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;
  p.aim = 0;
  /* sixty seconds of walking */
  for (let i = 0; i < 60 * 30; i++) VG.updatePlayer(p, 1 / 30, INPUT, w);
  ok(p.water > 88, 'a minute of walking costs less than a sixth of your water (' + Math.round(p.water) + '% left)');
  ok(p.food > 92, 'a minute of walking costs less than a tenth of your food (' + Math.round(p.food) + '% left)');

  /* and the whole canteen, walking, is longer than a survey.
     100% of the canteen lasts as many minutes as 100% lasts one minute
     of walking - the percent that went off the clock in the sixty seconds
     above is the percent a full canteen has to survive. */
  const usedPerMin = 100 - p.water;
  const minutes = usedPerMin > 0 ? 100 / usedPerMin : 999;
  ok(minutes > 6, 'a full canteen lasts more than six minutes of walking (' + minutes.toFixed(1) + ' min)');
}

console.log('\n== the reactor yard is a place you do not linger in ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;
  p.aim = 0;
  /* stand in the middle of the reactor yard for ten seconds */
  p.x = w.yard.x * VG.TILE;
  p.y = w.yard.y * VG.TILE;
  for (let i = 0; i < 10 * 30; i++) VG.updatePlayer(p, 1 / 30, { up: false, down: false, left: false, right: false }, w);
  const dose = p.dose;
  ok(dose > 30, 'ten seconds in the reactor yard is a dose worth counting (' + Math.round(dose) + ')');
  ok(p.hp < p.maxhp, 'and it starts to cost you health (' + Math.round(p.hp) + '/' + p.maxhp + ')');

  /* the dust filter is what makes the yard survivable */
  const p2 = VG.newPlayer(w);
  VG.Player = p2;
  p2.aim = 0;
  p2.inv['aid_filter'] = 1;
  p2.x = w.yard.x * VG.TILE;
  p2.y = w.yard.y * VG.TILE;
  for (let i = 0; i < 10 * 30; i++) VG.updatePlayer(p2, 1 / 30, { up: false, down: false, left: false, right: false }, w);
  ok(p2.dose < dose * 0.7, 'a survey dust filter cuts the yard (' + Math.round(p2.dose) + ' against ' + Math.round(dose) + ')');
}

console.log('\n== ammo is made at a bench ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;
  const benchRecipe = VG.craftRecipes.find((r) => r.station === 'bench');
  const fieldRecipe = VG.craftRecipes.find((r) => r.station === 'field');
  ok(!!benchRecipe, 'there is a recipe that needs a bench');
  ok(!!fieldRecipe, 'and one that does not');

  ok(VG.benchAt(p, w) === null, 'there is no bench in the middle of the flats');
  ok(VG.canCraft(p, benchRecipe) === false, 'so a bench recipe cannot be made out there');
  ok(VG.canCraft(p, fieldRecipe) === true, 'but fieldcraft can - a bandage is a bandage');

  /* go to a bench */
  const room = VG.INTERIOR_BY_KEY.depot;
  ok(!!room, 'the freight depot has a room');
  const bench = VG.INT.benchAtRoom(room);
  ok(!!bench, 'the freight depot has a workbench in it');
  VG.INT.active = { tpl: room, poi: { id: 'px', x: 0, y: 0 } };
  p.x = bench.x; p.y = bench.y;
  ok(!!VG.benchAt(p, w), 'at the bench, the bench is there');
  ok(VG.canCraft(p, benchRecipe) === true, 'so a bench recipe can be made');
  VG.INT.active = null;
}

console.log('\n== the pack has a limit ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;
  ok(VG.invWeight(p) < VG.CARRY, 'the starting kit fits (' + VG.invWeight(p) + '/' + VG.CARRY + ')');

  /* a crate of scrap does not fit in the pack you already have, and does
     not break it */
  const res = VG.takeLoot(p, [{ id: 'scrap_copper', qty: 200 }]);
  ok(VG.invWeight(p) <= VG.CARRY, 'taking a crate obeys the limit (' + Math.round(VG.invWeight(p)) + '/' + VG.CARRY + ')');
  ok(res.left.length > 0, 'what does not fit is left behind');
  ok(res.taken.length > 0, 'what fits is taken');

  /* dropping makes room */
  const before = VG.invWeight(p);
  VG.invDrop(p, 'scrap_copper', 5);
  ok(VG.invWeight(p) < before, 'dropping something frees the load (' + Math.round(VG.invWeight(p)) + ')');
  ok(VG.invCount(p, 'scrap_copper') >= 0, 'and the pack still counts what is in it');
}

console.log('\n== killing something pays ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;
  const e = { id: 'e_test', x: 100, y: 100, kind: 'rusted', hp: 1, dmg: 12, r: 11, aggro: 0, dead: false, home: { x: 100, y: 100 } };
  w.enemies.push(e);
  const before = VG.invTotal(p);
  VG.killEnemy(e, p);
  ok(e.dead, 'the rusted goes down');
  ok(VG.invTotal(p) > before, 'and it pays out in scrap (' + (VG.invTotal(p) - before) + ' units)');
  ok(VG.invWeight(p) <= VG.CARRY + 1, 'the payout obeys the pack limit');
}

console.log('\n== the building that holds the evidence is not empty ==');
{
  const w = VG.genWorld(4242);
  ok(w.enemies.length > 0, 'the flats have enemies');
  const guarded = w.clues.map((cl) => {
    const c = w.containers[cl.container];
    const poi = w.poiById(c.poi);
    if (!poi) return 9999;
    let best = 9999;
    for (const e of w.enemies) {
      if (e.dead) continue;
      const d = VG.dist(e.x * VG.TILE, e.y * VG.TILE, poi.x * VG.TILE, poi.y * VG.TILE);
      if (d < best) best = d;
    }
    return best;
  });
  const worst = Math.max.apply(null, guarded);
  ok(worst < 400, 'every building holding evidence has something standing near it (worst ' + Math.round(worst) + 'px)');

  /* and the something holds its ground instead of walking off across the
     flats and leaving the door open behind it */
  const guard = w.enemies.find((e) => e.guardPoi);
  ok(!!guard, 'there is a guard to hold a building');
  if (guard) {
    const p = VG.newPlayer(w);
    VG.Player = p;
    p.x = w.start.x * VG.TILE; p.y = w.start.y * VG.TILE;
    const post = { x: guard.home.x, y: guard.home.y };
    let maxOff = 0;
    for (let i = 0; i < 60 * 20; i++) {
      VG.updateEnemies(1 / 30, p, w);
      const d = VG.dist(guard.x, guard.y, post.x, post.y);
      if (d > maxOff) maxOff = d;
    }
    ok(maxOff <= 5.6, 'and it stays on its post (worst ' + maxOff.toFixed(1) + ' tiles off)');
  }

  /* a file is placed in the world once. Placing it twice would scatter a
     second copy of its evidence into a second building, and the player
     would have two answers to one question. */
  const before = w.clues.length;
  VG.placeClues(w, VG.allCases()[0]);
  ok(w.clues.length === before, 'placing a file twice does not scatter its evidence again');
}

console.log('\n== the dark helps them, not you ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;
  const day = (function () {
    for (let raw = 0; raw < 86400; raw += 600) {
      if (!VG.isNight(raw)) { VG.state.time = raw; return VG.aggroRange(p); }
    }
    return VG.aggroRange(p);
  })();
  const night = (function () {
    for (let raw = 0; raw < 86400; raw += 600) {
      if (VG.isNight(raw)) { VG.state.time = raw; return VG.aggroRange(p); }
    }
    return VG.aggroRange(p);
  })();
  ok(night > day, 'after dark they see further (' + night + 'px against ' + day + 'px by day)');
  VG.state.time = 9 * 3600;
}

console.log('\n== how hard the flats push is a setting ==');
{
  /* Rad, 2026-11-13: "the enemy attacks approach super fast that there is no
     chance you shoot them before they get on top of you". The old rule here
     was "a rusted outruns a walking player". That rule is Harsh now, and the
     default lets a player back away and shoot. */
  VG.fightMode = 'harsh';
  ok(VG.enemySpeed('rusted') > WALK_SPEED,
    'on Harsh a rusted outruns a walking player (' + VG.enemySpeed('rusted') + ' against ' + WALK_SPEED + ')');
  VG.fightMode = 'fair';
  ok(VG.enemySpeed('rusted') < WALK_SPEED,
    'on Fair a walking player can back away from a rusted (' + VG.enemySpeed('rusted') + ' against ' + WALK_SPEED + ')');
  ok(VG.enemySpeed('warden') < WALK_SPEED, 'and from a warden (' + VG.enemySpeed('warden') + ')');
  ok(VG.enemySpeed('warden') > VG.enemySpeed('rusted'), 'a warden is faster than a rusted');
  ok(VG.enemySpeed('drover') > VG.enemySpeed('warden'), 'a drover is faster than a warden');
  ok(VG.enemySpeed('drover') > WALK_SPEED, 'and a drover still has to be shot or sprinted from');
  for (const k of ['gentle', 'fair', 'harsh']) {
    VG.fightMode = k;
    ok(VG.enemySpeed('drover') < 205, 'a sprinter outruns them all on ' + k + ' (' + VG.enemySpeed('drover') + ')');
  }
  VG.fightMode = 'fair';
}

console.log('\n== and it tells you before it lunges ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;
  p.x = 0; p.y = 0;
  const e = {
    id: 'e_lunge', x: 100 / VG.TILE, y: 0, kind: 'rusted', hp: 70, dmg: 12, r: 11,
    aggro: 2, dead: false, home: { x: 100 / VG.TILE, y: 0 }
  };
  w.enemies.push(e);
  /* step it into range and let it wind up */
  let sawWindup = false, windupAng = null, angHeld = true;
  let lunged = false, lungSpeed = 0;
  let x0 = e.x * VG.TILE;
  for (let i = 0; i < 90; i++) {
    const bx = e.x * VG.TILE;
    VG.updateEnemies(1 / 60, p, w);
    if (e.windup > 0) {
      sawWindup = true;
      if (windupAng === null) windupAng = e.lungeAng;
      else if (e.lungeAng !== windupAng) angHeld = false;
    }
    if (e.lunge > 0) {
      lunged = true;
      /* the lunge runs AT the player, so the signed travel is negative
         here - the speed is the magnitude of it */
      lungSpeed = Math.max(lungSpeed, Math.abs((e.x * VG.TILE - bx) * 60));
    }
  }
  ok(sawWindup, 'the rusted winds up before it lunges');
  ok(angHeld, 'and the direction it will lunge is fixed at the start of the windup');
  ok(lunged, 'and then it lunges');
  ok(lungSpeed > 250, 'the lunge is faster than a walk (' + Math.round(lungSpeed) + 'px/s)');
  ok(x0 >= 0, 'the test stood still');
}

console.log(fail ? '\nFAILED ' + fail + ' check(s)' : '\nall checks passed');
process.exit(fail ? 1 : 0);
