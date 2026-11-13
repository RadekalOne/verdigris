/* VERDIGRIS - can a person actually play this
   Run: node test/play.js

   Written after Rad played the merged build (2026-11-13) and said, in order:
   the enemies are on top of you before you can shoot, the shooting is hard
   to use, the bullets run out, he could not tell whether you can make more
   or how, healing is hard to grasp, and the bar should cycle.

   Every one of those was true in the numbers, and none of the suites said
   so, because the suites checked rules ("a rusted outruns a walk") and not
   outcomes ("a player who shoots at it wins"). This file runs the fight.

     1. A player who stands and shoots at what noticed them wins, untouched.
     2. Something that sees you looks before it comes, and a hit stops it.
     3. A shot at a thing that is walking across you lands.
     4. The starting rounds are several fights, an empty gun still does
        something, and rounds can be made where you stand.
     5. One key patches you up, and it picks the right dressing.
     6. The bar can be walked, and a weapon you land on is in your hand.
     7. The workbench says what a thing does and where a bench is. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const store = {};
/* the clock is ours: a fight is stepped frame by frame, and the engine's
   "was I hit in the last 900ms" has to see the same time the fight does */
let clock = 1e6;
const sandbox = {
  window: {},
  console,
  performance: { now: () => clock },
  Math, JSON, Date,
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

const HP = { rusted: 70, drover: 46, warden: 120 };
const DMG = { rusted: 12, drover: 9, warden: 17 };
const FPS = 60;

function arena() {
  const w = VG.genWorld(4242);
  w.enemies = [];
  const p = VG.newPlayer(w);
  VG.Player = p; VG.World = w;
  p.x = 4000; p.y = 4000;
  VG.state.time = VG.START_TIME;
  VG.state.bullets.length = 0;
  VG.state.fireCd = 0;
  if (VG.state.hits) VG.state.hits.length = 0;
  VG.INT.active = null;
  return { w, p };
}
function foe(p, kind, dist, extra) {
  const e = Object.assign({
    id: 'e_' + kind, x: (p.x + dist) / VG.TILE, y: p.y / VG.TILE, kind: kind,
    hp: HP[kind], maxhp: HP[kind], dmg: DMG[kind], r: 11, aggro: 0, dead: false,
    home: { x: (p.x + dist) / VG.TILE, y: p.y / VG.TILE },
    windup: 0, lunge: 0, lungeT: 0, lungeCd: 0, lungeAng: 0
  }, extra || {});
  return e;
}

/* One fight. The player holds the reticle on the body of the thing - not
   ahead of it; that is what a person does - and holds the button down.
   `retreat` walks them straight back at walking pace. */
function duel(kind, opts) {
  opts = opts || {};
  const { w, p } = arena();
  const e = foe(p, kind, VG.aggroRange(p) - 2);
  w.enemies.push(e);
  let t = 0, closest = 1e9, used = 0;
  for (let i = 0; i < FPS * 20 && !e.dead && p.hp > 0; i++) {
    const dt = 1 / FPS;
    clock += dt * 1000; t += dt;
    if (opts.retreat) p.x -= p.speed * dt;
    VG.mouse.world = { x: e.x * VG.TILE, y: e.y * VG.TILE };
    VG.state.fireCd = Math.max(0, VG.state.fireCd - dt);
    VG.updateEnemies(dt, p, w);
    /* counted shot by shot: a kill can put rounds back in the pack */
    const had = p.ammo['ammo_slug'];
    VG.fire(p, w);
    if (p.ammo['ammo_slug'] < had) used++;
    VG.updateBullets(dt, p, w);
    closest = Math.min(closest, VG.dist(p.x, p.y, e.x * VG.TILE, e.y * VG.TILE));
  }
  return { dead: e.dead, hp: p.hp, t: t, used: used, closest: closest };
}

console.log('\n== a player who stands and shoots wins ==');
{
  VG.fightMode = 'fair'; VG.aimAssist = true;
  const r = duel('rusted');
  ok(r.dead, 'the rusted that noticed you goes down (' + r.t.toFixed(2) + 's, ' + r.used + ' rounds)');
  ok(r.hp === 100, 'and it never touched you (' + r.hp + ' health, it got to ' + Math.round(r.closest) + 'px)');
  ok(r.closest > VG.LUNGE.range, 'it did not even get close enough to lunge');
  const d = duel('drover');
  ok(d.dead && d.hp === 100, 'a drover goes down untouched as well (' + d.used + ' rounds)');
  const wd = duel('warden', { retreat: true });
  ok(wd.dead && wd.hp === 100, 'a warden goes down if you back away while you shoot (' + wd.used + ' rounds, ' + wd.t.toFixed(2) + 's)');
  VG.fightMode = 'gentle';
  const g = duel('warden');
  ok(g.dead, 'on Gentle a warden goes down to a player who just stands there (' + Math.round(g.hp) + ' health left)');
  VG.fightMode = 'fair';
}

console.log('\n== it looks before it comes, and a hit stops it ==');
{
  const { w, p } = arena();
  const e = foe(p, 'rusted', VG.aggroRange(p) - 2);
  w.enemies.push(e);
  const x0 = e.x;
  VG.updateEnemies(1 / FPS, p, w);
  ok(e.aggro > 0 && e.alert > 0, 'a thing that has just seen you is looking, not running');
  for (let i = 0; i < FPS * 0.5; i++) { clock += 1000 / FPS; VG.updateEnemies(1 / FPS, p, w); }
  ok(e.x === x0, 'and it has not moved half a second later');
  for (let i = 0; i < FPS * 1.0; i++) { clock += 1000 / FPS; VG.updateEnemies(1 / FPS, p, w); }
  ok(e.x < x0, 'then it comes');
  ok(VG.FIGHT.gentle.beat > VG.FIGHT.fair.beat && VG.FIGHT.fair.beat > VG.FIGHT.harsh.beat, 'the look is longest on Gentle and shortest on Harsh');

  /* a hit during the windup breaks the lunge */
  const a2 = arena();
  const r = foe(a2.p, 'rusted', 100, { aggro: 2 });
  a2.w.enemies.push(r);
  for (let i = 0; i < 20 && !(r.windup > 0); i++) { clock += 1000 / FPS; VG.updateEnemies(1 / FPS, a2.p, a2.w); }
  ok(r.windup > 0, 'a rusted in range winds up');
  const rx = r.x;
  VG.hitEnemy(r, 5, 0, a2.p, 8);
  ok(r.windup === 0 && r.stun > 0, 'and a hit breaks the windup and stops it');
  ok(r.x > rx, 'and shoves it back');
  const wdn = foe(a2.p, 'warden', 100, { aggro: 2, windup: 0.4 });
  VG.hitEnemy(wdn, 5, 0, a2.p, 8);
  ok(wdn.windup > 0, 'a warden is too heavy for that: its lunge is not broken');
  ok(VG.LUNGE.windup >= 0.7, 'the tell is on the ground long enough to step out of (' + VG.LUNGE.windup + 's)');
}

console.log('\n== a shot at something walking across you lands ==');
{
  const cross = (assist) => {
    VG.aimAssist = assist;
    const { w, p } = arena();
    /* 200px east, walking north at a rusted's old pace */
    const e = foe(p, 'rusted', 200, { hp: 500, maxhp: 500 });
    e.vx = 0; e.vy = -138;
    w.enemies.push(e);
    VG.mouse.world = { x: e.x * VG.TILE, y: e.y * VG.TILE };
    VG.fire(p, w);
    for (let i = 0; i < 40; i++) {
      e.y += e.vy * (1 / FPS) / VG.TILE;
      VG.updateBullets(1 / FPS, p, w);
    }
    return e.hp < 500;
  };
  ok(cross(false) === false, 'without help, a round aimed at the body of a walking thing misses it');
  ok(cross(true) === true, 'with aim help the same shot is led and lands');
  VG.aimAssist = true;
  /* the help does not pick targets for you */
  const { w, p } = arena();
  const e = foe(p, 'rusted', 200);
  w.enemies.push(e);
  ok(VG.assistTarget(p, w, { x: p.x - 200, y: p.y }, 280, 760) === null, 'pointing the other way gets no help');
  ok(VG.assistTarget(p, w, { x: p.x + 200, y: p.y + 30 }, 280, 760) !== null, 'pointing near it does');
  const far = foe(p, 'rusted', 400);
  w.enemies = [far];
  ok(VG.assistTarget(p, w, { x: p.x + 400, y: p.y }, 280, 760) === null, 'and it does not reach past the weapon');
}

console.log('\n== rounds: enough, and more where you stand ==');
{
  const { w, p } = arena();
  const perKill = Math.ceil(HP.rusted / VG.attackDamage(p));
  ok(p.ammo['ammo_slug'] >= perKill * 5, 'the starting rounds are at least five rusted (' + p.ammo['ammo_slug'] + ' rounds, ' + perKill + ' a kill)');
  ok(p.inv['ammo_slug'] === p.ammo['ammo_slug'], 'and the pack and the counter agree');

  const hand = VG.craftRecipes.find((r) => r.out === 'ammo_slug' && r.station !== 'bench');
  ok(!!hand, 'revolver rounds can be made by hand');
  ok(VG.canCraft(p, hand), 'out on the flats, with no bench');
  const before = p.ammo['ammo_slug'];
  const res = VG.craft(p, hand);
  ok(res.ok && p.ammo['ammo_slug'] === before + hand.qty, 'the starting kit affords it: ' + before + ' -> ' + p.ammo['ammo_slug']);
  const bench = VG.craftRecipes.find((r) => r.out === 'ammo_slug' && r.station === 'bench');
  ok(bench && bench.qty > hand.qty, 'a bench still makes more for the copper (' + bench.qty + ' against ' + hand.qty + ')');
  ok(VG.craft(p, bench).ok === false, 'and a bench recipe is refused out here, with nothing taken');
  p.inv['scrap_copper'] = 0;
  ok(VG.craft(p, hand).ok === false, 'no copper, no rounds');

  /* the empty gun */
  const e = foe(p, 'rusted', 30, { aggro: 2 });
  w.enemies.push(e);
  p.ammo['ammo_slug'] = 0;
  VG.state.fireCd = 0; VG.state.bullets.length = 0; VG.state.swing = null;
  VG.mouse.world = { x: e.x * VG.TILE, y: e.y * VG.TILE };
  VG.fire(p, w);
  ok(VG.state.bullets.length === 0, 'an empty gun fires nothing');
  ok(!!VG.state.swing, 'but the click still does something: it is swung');
  ok(e.hp < HP.rusted, 'and it hurts what is in front of you (' + e.hp + ' of ' + HP.rusted + ')');
  ok(p.ammo['ammo_slug'] === 0, 'and the counter does not go below nothing');

  /* things you put down sometimes carry rounds */
  ok(VG.ENEMY_DROP.rusted.some((d) => d[0] === 'ammo_slug') && VG.ENEMY_DROP.drover.some((d) => d[0] === 'ammo_slug'),
    'a rusted and a drover can leave rounds behind');

  /* a gun can be made, and so can what it fires */
  const guns = VG.craftRecipes.filter((r) => VG.item(r.out) && VG.item(r.out).cat === 'weapon' && VG.isRangedWeapon(VG.item(r.out)));
  ok(guns.length >= 2, 'a bench makes guns (' + guns.map((r) => VG.item(r.out).name).join(', ') + ')');
  const orphan = guns.filter((r) => !VG.craftRecipes.some((a) => a.out === VG.item(r.out).ammo));
  ok(orphan.length === 0, 'and every gun you can make takes rounds you can make' + (orphan.length ? ' NOT ' + orphan.map((r) => r.out).join(', ') : ''));
}

console.log('\n== one key patches you up ==');
{
  const { p } = arena();
  ok(VG.healCount(p) >= 3, 'you start with dressings (' + VG.healCount(p) + ')');
  ok(VG.quickHeal(p) === false && VG.healCount(p) >= 3, 'unhurt, the key does nothing and wastes nothing');
  p.hp = 50;
  const n = VG.healCount(p);
  ok(VG.quickHeal(p) === true, 'hurt, it works');
  ok(p.hp === 68 && VG.healCount(p) === n - 1, 'a dressing is +18 and one is gone (' + p.hp + ' health, ' + VG.healCount(p) + ' left)');
  /* it picks the dressing that fits */
  VG.invAdd(p, 'aid_saline_stim', 1);
  p.hp = p.maxhp - 20;
  VG.quickHeal(p);
  ok((p.inv['aid_saline_stim'] || 0) === 1, 'a scratch takes a dressing, not the stim');
  p.hp = 30;
  VG.quickHeal(p);
  ok((p.inv['aid_saline_stim'] || 0) === 0, 'a real wound takes the stim');
  /* nothing left */
  for (const it of VG.healItems(p)) VG.invRemove(p, it.id, p.inv[it.id]);
  p.hp = 30;
  ok(VG.quickHeal(p) === false && p.hp === 30, 'with nothing to use it says so and changes nothing');
  const dress = VG.craftRecipes.find((r) => r.out === 'aid_field_dressing');
  ok(dress && dress.station !== 'bench', 'and a dressing is made by hand, anywhere');
}

console.log('\n== the bar can be walked ==');
{
  const { p } = arena();
  ok(p.weapon === 'wpn_long_horn' && p.sel === 0, 'you start holding the revolver');
  VG.cycleSlot(p, 1);
  ok(p.sel === 1 && p.weapon === 'wpn_scrap_torch', 'one step on is the torch, and it is in your hand without another key');
  const dressings = p.inv['aid_field_dressing'], water = p.water;
  VG.cycleSlot(p, 1);
  VG.cycleSlot(p, 1);
  ok(p.hotbar[p.sel] === 'aid_field_dressing', 'two more is the dressing');
  ok(p.inv['aid_field_dressing'] === dressings && p.water === water, 'landing on something does not use it');
  ok(p.weapon === 'wpn_scrap_torch', 'and what is in your hand is still in your hand');
  VG.cycleSlot(p, 1);
  ok(p.sel === 0 && p.weapon === 'wpn_long_horn', 'the empty slot is skipped and the bar wraps back to the gun');
  VG.cycleSlot(p, -1);
  ok(p.hotbar[p.sel] === 'aid_field_dressing', 'and it walks backwards the same way');
  VG.selectSlot(p, 0);
  ok(p.weapon === 'wpn_long_horn', 'a number key lands on a weapon the same way');
  ok(VG.slotCount(p, 'aid_field_dressing') === dressings, 'a dressing in the bar shows how many are left');
}

console.log('\n== the workbench explains itself ==');
{
  const { w, p } = arena();
  ok(/health/.test(VG.itemEffect(VG.item('aid_field_dressing'), p)), 'a dressing says it is health: "' + VG.itemEffect(VG.item('aid_field_dressing'), p) + '"');
  ok(/Longhorn Revolver/.test(VG.itemEffect(VG.item('ammo_slug'), p)), 'slugs say which gun they are for: "' + VG.itemEffect(VG.item('ammo_slug'), p) + '"');
  ok(/damage \d+/.test(VG.itemEffect(VG.item('wpn_survey_carbine'), p)), 'a gun says what it does: "' + VG.itemEffect(VG.item('wpn_survey_carbine'), p) + '"');
  const nb = VG.nearestBench(p, w);
  ok(!!nb && nb.dist > 0 && !!nb.poi.name, 'and the sheet can name the nearest bench (' + (nb ? nb.poi.name + ', ' + Math.round(nb.dist) + 'm ' + nb.dir : 'none') + ')');
  const ui = fs.readFileSync(path.join(ROOT, 'src/ui.js'), 'utf8');
  const main = fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8');
  ok(/BY HAND/.test(ui) && /AT A WORKBENCH/.test(ui), 'the sheet is in two halves: by hand, and at a bench');
  ok(/data-fight/.test(ui) && /opt-assist/.test(ui), 'Options has the fighting setting and the aim help switch');
  ok(/hbkeys/.test(ui), 'the bar prints its own keys');
  ok(/'wheel'/.test(main) && /quickHeal/.test(main), 'the wheel and the heal key are bound');
}

console.log('\n== every crate in every room can be opened from somewhere you can stand ==');
{
  /* Rad, playing: "the item on the table is unreachable from either side".
     It was a crate in the middle of the round table in the relay room. The
     table is solid and wider than the reach, so no place a player could
     stand was within reach of it. This walks every room from its door the
     way a player does and asks, for every place a crate can be put, whether
     there is anywhere to stand that opens it. */
  const R = 10, STEP = 6;
  const seen = new Set();
  let rooms = 0, slotsN = 0, oldMiss = 0;
  const stuck = [];
  for (const key in VG.INTERIOR_BY_KEY) {
    const tpl = VG.INTERIOR_BY_KEY[key];
    if (seen.has(tpl)) continue;
    seen.add(tpl); rooms++;
    const solids = VG.INT.solids(tpl);
    const door = VG.INT.doorOf(tpl);
    const sp = VG.INT.spawnFor(tpl);
    /* everywhere you can walk to from the door */
    const cols = Math.ceil(tpl.w / STEP), rows = Math.ceil(tpl.h / STEP);
    const open = new Uint8Array(cols * rows);
    const q = [[Math.round(sp.x / STEP), Math.round(sp.y / STEP)]];
    const stand = [];
    while (q.length) {
      const [cx, cy] = q.pop();
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
      if (open[cy * cols + cx]) continue;
      if (VG.INT.blocked(cx * STEP, cy * STEP, R, solids, tpl)) continue;
      open[cy * cols + cx] = 1;
      stand.push({ x: cx * STEP, y: cy * STEP });
      q.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    /* every place a crate can be put, including the second and third crate
       that share a slot */
    const spots = [];
    for (const s of tpl.loot) for (let round = 0; round < 3; round++) spots.push({ ix: s[0] + round * 20, iy: s[1] + round * 16 });
    for (const c of spots) {
      slotsN++;
      let can = false, old = false;
      for (const s of stand) {
        if (VG.dist(s.x, s.y, door.x, door.y) < VG.INT.EXIT_REACH) continue; /* the way out wins there */
        const d = VG.dist(s.x, s.y, c.ix, c.iy);
        if (d < 58) old = true;
        if (VG.INT.canReach(tpl, s, c, d)) { can = true; if (old) break; }
      }
      if (!old) oldMiss++;
      if (!can) stuck.push((tpl.title || key) + ' @' + c.ix + ',' + c.iy);
    }
  }
  ok(rooms > 5 && slotsN > 20, 'walked ' + rooms + ' rooms and ' + slotsN + ' places a crate can be');
  ok(oldMiss > 0, 'the old reach left ' + oldMiss + ' of them out of reach from everywhere (the bug)');
  ok(stuck.length === 0, 'now every one can be opened from somewhere' + (stuck.length ? ' STUCK ' + stuck.slice(0, 8).join(' | ') : ''));

  /* and reaching across a table is not reaching across a room */
  const tpl = VG.INTERIOR_BY_KEY.relay || [...seen][0];
  const big = (tpl.furn || []).filter((g) => !g.ns).sort((a, b) => Math.min(b.w, b.h) - Math.min(a.w, a.h))[0];
  if (big) {
    const c = { ix: big.x + big.w / 2, iy: big.y + big.h / 2 };
    ok(VG.INT.canReach(tpl, { x: big.x - 12, y: c.iy }, c), 'standing at the edge of a big table reaches the middle of it');
    ok(!VG.INT.canReach(tpl, { x: big.x - 120, y: c.iy }, c), 'standing well back from it does not');
  }
}

console.log('\n== a step is the same length indoors and out ==');
{
  /* Rad: "movement inside buildings is too fast". A room is drawn at up to
     twice the scale of the flats and the pace was not adjusted for it. */
  const { p } = arena();
  const tpl = VG.INTERIOR_BY_KEY.diner || VG.INTERIOR_BY_KEY[Object.keys(VG.INTERIOR_BY_KEY)[0]];
  const room = { tpl: tpl, solids: [] };
  const walk = (zoom, sprint) => {
    VG.INT.zoom = zoom; VG.sprint = !!sprint; VG.moveMode = 'screen';
    p.x = tpl.w / 2; p.y = tpl.h / 2; p.stam = 100;
    const x0 = p.x;
    for (let i = 0; i < FPS; i++) VG.updatePlayerInterior(p, 1 / FPS, { right: true }, room);
    VG.sprint = false; VG.moveMode = 'pointer';
    return (p.x - x0) * zoom; /* pixels of screen crossed in a second */
  };
  const at2 = walk(2, false), at1 = walk(1, false);
  ok(Math.abs(at2 - at1) < 2, 'the pace on screen is the same at any zoom (' + Math.round(at1) + ' and ' + Math.round(at2) + ' px/s)');
  ok(at2 <= p.speed, 'and it is no faster than walking on the flats (' + Math.round(at2) + ' against ' + p.speed + ')');
  ok(walk(2, true) < p.speed * 1.62, 'a sprint indoors is slower than a sprint outside');
  VG.INT.zoom = 1;
}

console.log(fail ? '\nFAILED ' + fail + ' check(s)' : '\nall checks passed');
process.exit(fail ? 1 : 0);
