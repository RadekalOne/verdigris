/* VERDIGRIS - the things a player feels, and the three bugs that broke the loop
   Run: node test/feel.js

   Every check here goes through the engine the way a player does. The bug
   this file was written for is the reason: the suite already "proved" that
   evidence filed in an emptied crate could be read, by calling
   VG.openContainer directly - while the E key, which goes through
   VG.findTarget first, could never reach that crate at all. A test that
   skips the step the player takes is a test of a different game.

     1. Evidence in a crate you already emptied can be reached with E.
     2. A crate you could not finish emptying survives a save, and pays out
        exactly what was left in it - not its whole contents a second time.
     3. A new survey starts in daylight.
     4. Experience buys something, and the grade is the same live and loaded.
     5. Going down does not put you in a loop you cannot get out of.
     6. The walking mode is a setting, and the default has not moved. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const store = {};
const sandbox = {
  window: {},
  console,
  performance: { now: () => Date.now() },
  Math, JSON, Date,
  /* timers fire at once: going down and coming to is one step here */
  setTimeout: (fn) => { fn(); return 0; },
  clearTimeout: () => { },
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => { },
    createElement: () => ({
      style: {}, appendChild: () => { }, removeChild: () => { },
      set innerHTML (v) { }, get innerHTML () { return ''; }, children: []
    })
  },
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
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
  'src/world.js', 'src/case_questions.js', 'src/caseflow.js', 'src/interiors.js', 'src/loot.js', 'src/player.js',
  'src/fx.js', 'src/ui.js', 'src/save.js', 'src/main.js'].forEach((f) => {
    if (!load(f)) fail++;
  });

const VG = sandbox.window.VG;
if (!VG) { console.log('FATAL: VG never defined'); process.exit(1); }
VG.itemIndex();

const bagOf = (p) => { const o = {}; for (const k in p.inv) o[k] = p.inv[k]; return o; };

console.log('\n== evidence in a crate you already emptied ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;
  VG.INT.prepare(w);
  /* the player has been everywhere and taken everything */
  for (const c of w.containers) { c.opened = true; c.loot = []; }
  ok(w.clues.length > 0, 'the open file has evidence in the world (' + w.clues.length + ')');

  let reached = 0, read = 0, stale = 0;
  const missed = [];
  for (const cl of w.clues) {
    const c = w.containers[cl.container];
    let t = null;
    if (c.inside) {
      const poi = w.pois.find((q) => q.id === c.inside);
      VG.INT.enter(poi, p);
      p.x = c.ix; p.y = c.iy;
      t = VG.findTarget(p, w);
    } else {
      p.x = c.x * VG.TILE + VG.TILE / 2; p.y = c.y * VG.TILE + VG.TILE / 2;
      t = VG.findTarget(p, w);
    }
    if (t && t.kind === 'container' && t.obj === c) {
      reached++;
      /* exactly what the E key does */
      VG.openContainer(t.obj, p);
      const full = VG.findClue(cl.id);
      if (p.readClues[cl.id] && full && p.knownFacts[full.fact]) read++;
      /* and once it has been read, the crate is an empty crate again */
      const again = VG.findTarget(p, w);
      if (again && again.kind === 'container' && again.obj === c) stale++;
    } else {
      missed.push(cl.id + ' -> ' + (t ? t.kind : 'nothing'));
    }
    if (VG.INT.active) VG.INT.exit(p);
    VG.INT.doorLock = 0;
  }
  ok(reached === w.clues.length, 'E reaches every piece of evidence in an emptied crate (' + reached + '/' + w.clues.length + ')' +
    (missed.length ? ' MISSED ' + missed.join(', ') : ''));
  ok(read === w.clues.length, 'and pressing E reads it (' + read + '/' + w.clues.length + ')');
  ok(stale === 0, 'a crate whose evidence has been read stops asking to be searched');
  const plain = w.containers.find((c) => !c.clueId && c.opened);
  ok(!VG.crateSearchable(plain, p), 'an emptied crate with nothing filed in it stays emptied');
}

console.log('\n== a half-emptied crate survives a save ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;
  VG.INT.prepare(w);
  /* a pack with no room in it at all */
  p.inv.scrap_copper = 4000;
  let c = null;
  for (const x of w.containers) {
    if (x.clueId) continue;
    VG.openContainer(x, p);
    if (x.loot && x.loot.length && !x.opened) { c = x; break; }
  }
  ok(!!c, 'a crate the pack could not empty keeps what is in it');
  const left = JSON.parse(JSON.stringify(c.loot));
  const leftQty = left.reduce((a, l) => a + (l.qty || 1), 0);
  ok(VG.saveGame(true) === true, 'the survey saves');
  const raw = JSON.parse(store['verdigris.save.v1']);
  ok((raw.partial || []).some((r) => r.id === c.id), 'and the save knows the crate is half-emptied');

  const p2 = VG.loadGame();
  ok(!!p2, 'the survey loads');
  const c2 = VG.World.containers.find((x) => x.id === c.id);
  ok(c2 && !c2.opened && c2.partial, 'the crate comes back unopened and marked as having more in it');
  ok(JSON.stringify(c2.loot) === JSON.stringify(left), 'with exactly what was left in it');
  /* make room and take it */
  p2.inv = {}; p2.ammo = {};
  const surprise = c2.surprise ? 1 : 0;
  VG.openContainer(c2, p2);
  const got = Object.keys(p2.inv).reduce((a, k) => a + p2.inv[k], 0);
  ok(got === leftQty + surprise, 'and it pays out what was left, not a fresh roll (' + got + ' taken, ' + (leftQty + surprise) + ' owed)');
  ok(c2.opened, 'after which it is emptied for good');
}

console.log('\n== a new survey starts in daylight ==');
{
  const h = VG.hourOfDay(VG.START_TIME);
  ok(Math.abs(h - 12) < 0.05, 'the clock reads noon at the start (' + h.toFixed(2) + ')');
  ok(!VG.isNight(VG.START_TIME), 'and it is not night');
  /* night is 20:00; the sky turns 24 times as fast as the wall clock */
  const mins = (20 - h) * 3600 / VG.TIME_SCALE / 60;
  ok(mins >= 15 && mins <= 30, 'dusk arrives inside one sitting, but not before the player can walk (' + mins.toFixed(0) + ' min)');
}

console.log('\n== experience buys something ==');
{
  const w = VG.genWorld(77);
  const p = VG.newPlayer(w);
  VG.Player = p;
  ok(VG.levelForXp(0) === 1 && VG.levelForXp(299) === 1 && VG.levelForXp(300) === 2 && VG.levelForXp(800) === 3,
    'the grades start at 0, 300, 800');
  const cap0 = VG.carryCap(p), hp0 = p.maxhp;
  ok(cap0 === VG.CARRY, 'a new surveyor carries the standard load (' + cap0 + ')');
  p.hp = 20;
  VG.addXp(p, 300, true);
  ok(p.level === 2, 'three hundred experience is a promotion');
  ok(VG.carryCap(p) > cap0 && p.maxhp > hp0, 'and a promotion carries more and takes more (' + VG.carryCap(p) + ' load, ' + p.maxhp + ' health)');
  ok(p.hp === p.maxhp, 'and puts you back on your feet');
  ok(VG.invCanFit(p, 'scrap_copper', 1), 'the pack limit is the grade limit');

  /* every part of the survey pays */
  const xp0 = p.xp;
  const crate = w.containers.find((c) => !c.clueId && !c.opened);
  VG.openContainer(crate, p);
  ok(p.xp === xp0 + VG.XP.crate, 'searching a crate pays');
  const e = { id: 'e_test', kind: 'rusted', x: 5, y: 5, dead: false, hp: 0 };
  const xp1 = p.xp;
  VG.killEnemy(e, p);
  ok(p.xp === xp1 + VG.XP.kill, 'putting one down pays');

  /* the grade is the same live and loaded */
  VG.saveGame(true);
  const lv = p.level, mh = p.maxhp;
  const p2 = VG.loadGame();
  ok(p2.level === lv && p2.maxhp === mh, 'a loaded survey has the grade it was saved with');
  /* an older save counted levels a different way; the file is not trusted */
  const raw = JSON.parse(store['verdigris.save.v1']);
  raw.player.level = 9; raw.player.xp = 500;
  store['verdigris.save.v1'] = JSON.stringify(raw);
  const p3 = VG.loadGame();
  ok(p3.level === 2, 'and the grade is worked out from the experience, not read from the file');
}

console.log('\n== going down is not a loop ==');
{
  const w = VG.genWorld(77);
  const p = VG.newPlayer(w);
  VG.Player = p;
  p.x = 3000; p.y = 3000; p.water = 0; p.food = 0;
  const pack = JSON.stringify(bagOf(p));
  p.hp = 0;
  VG.onDeath('exposure');
  ok(p.hp > 0, 'you come to (' + p.hp + ')');
  ok(p.water >= 40 && p.food >= 40, 'with water and food in you, so thirst cannot kill you twice in a row');
  ok(Math.abs(p.x - w.start.x * VG.TILE) < 1 && Math.abs(p.y - w.start.y * VG.TILE) < 1, 'at the field trailer');
  ok(JSON.stringify(bagOf(p)) === pack, 'and nothing in the pack is missing');
  /* a minute at the trailer does not put you straight back down */
  for (let i = 0; i < 60 * 30; i++) VG.updatePlayer(p, 1 / 30, { up: false, down: false, left: false, right: false }, w);
  ok(p.hp > 0, 'and a minute later you are still standing');
}

console.log('\n== the walking mode is a setting ==');
{
  const p = { aim: 1.2, face: 0 };
  const up = { up: true, down: false, left: false, right: false };
  ok(VG.moveMode === 'pointer', 'the default is still "walk toward the pointer"');
  const a = VG.moveVector(p, up);
  ok(Math.abs(a.x - Math.cos(1.2)) < 1e-9 && Math.abs(a.y - Math.sin(1.2)) < 1e-9, 'W walks along the heading');
  VG.setMoveMode('screen');
  const b = VG.moveVector(p, up);
  ok(b.moving && Math.abs(b.x) < 1e-9 && Math.abs(b.y + 1) < 1e-9, 'in classic mode W is up the screen, whatever the heading');
  const d = VG.moveVector(p, { up: true, down: false, left: false, right: true });
  ok(Math.abs(Math.hypot(d.x, d.y) - 1) < 1e-9, 'and a diagonal is no faster than a straight line');
  ok(store['verdigris.move'] === 'screen', 'the choice is remembered');
  VG.setMoveMode('pointer');
}

console.log('\n== the page loads the feel layer ==');
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok(html.indexOf('src/fx.js') >= 0, 'index.html loads src/fx.js');
  ok(html.indexOf('src/fx.js') < html.indexOf('src/render.js'), 'before the renderer that draws it');
  for (const id of ['bar-hp', 'banner', 'lootfeed', 'hurtflash', 'savepip', 'btn-new', 'title-save']) {
    ok(html.indexOf('id="' + id + '"') >= 0, 'index.html has #' + id);
  }
  /* shake is feedback, never a rule: with it off the offset is nothing */
  VG.FX.setShake(false);
  VG.FX.addShake(9);
  const o = VG.FX.offset();
  ok(o.x === 0 && o.y === 0, 'with screen shake switched off the world is drawn where it is');
  VG.FX.setShake(true);
}

console.log(fail ? '\nFAILED ' + fail + ' check(s)' : '\nall checks passed');
process.exit(fail ? 1 : 0);
