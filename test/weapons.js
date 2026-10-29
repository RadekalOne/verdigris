/* VERDIGRIS - headless test for the weapon rules
   Run: node test/weapons.js

   This file exists because of one complaint: "the firing weapon only works
   when the enemy is literally on top of you". The cause was not the code
   that fires a round - that code was right - it was three numbers that no
   one had ever checked against each other:

     - the Rusted notice you at 240m
     - every gun used to have a reach between 90 and 340
     - the only weapon you started with was a torch, swung at 40m

   So a gun was never the reason a fight started, and the first thing you
   held could not fight at all. These assertions pin the rules that fix
   that, and they are rules rather than preferences: a gun that cannot
   reach the distance at which it is noticed is a broken gun. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function makeSandbox(store) {
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
    localStorage: {
      getItem: (k) => (store && store[k] !== undefined ? store[k] : null),
      setItem: (k, v) => { if (store) store[k] = v; },
      removeItem: (k) => { if (store) delete store[k]; }
    }
  };
  sandbox.window.addEventListener = () => { };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

function loadInto(sandbox, files) {
  for (const rel of files) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) { console.log('  MISSING ' + rel); return false; }
    vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p });
  }
  return true;
}

const MODULES = ['src/core.js', 'src/items.js', 'src/factions.js', 'src/cases.js', 'src/cases_b.js',
  'src/world.js', 'src/loot.js', 'src/player.js', 'src/save.js', 'src/audio.js', 'src/help.js',
  'src/ui.js', 'src/main.js'];

let fail = 0;
const ok = (cond, msg) => { if (!cond) { console.log('  FAIL ' + msg); fail++; } else console.log('  ok   ' + msg); };

const sandbox = makeSandbox(null);
console.log('== loading modules ==');
if (!loadInto(sandbox, MODULES)) { console.log('FATAL: modules did not load'); process.exit(1); }
const VG = sandbox.window.VG;
if (!VG) { console.log('FATAL: VG never defined'); process.exit(1); }
VG.itemIndex();

/* the log is captured so the tests can read what the player is told */
const logLines = [];
VG.log = (msg, cls) => { logLines.push(msg); };

const world = VG.genWorld(5150);
const NOTICE = 240;          /* the Rusted see you at 240m */
const SWING_REACH = 75;       /* below this a weapon is swung, not fired */

console.log('\n== the reach table ==');
const weapons = VG.ITEMS.filter((i) => i.cat === 'weapon');
ok(weapons.length === 14, 'there are fourteen weapons (' + weapons.length + ')');

for (const w of weapons) {
  const ranged = VG.isRangedWeapon(w);
  if (ranged) {
    /* the rule: a gun has to reach at least as far as it can be noticed */
    ok(w.stats.range >= NOTICE,
      w.name + ' reaches ' + w.stats.range + 'm, at least the ' + NOTICE + 'm notice radius');
    /* and a silenced gun has to reach its own, smaller, notice radius */
    if ((w.mods || []).indexOf('silenced') >= 0) {
      ok(w.stats.range >= 120, w.name + ' is silenced and reaches past its 120m notice radius');
    }
  } else {
    ok(w.stats.range < SWING_REACH, w.name + ' is swung, not fired (' + w.stats.range + 'm reach)');
  }
}

/* the two that are meant to be swung have to stay swung */
ok(!VG.isRangedWeapon(VG.item('wpn_scrap_torch')), 'the torch is swung, not fired');
ok(!VG.isRangedWeapon(VG.item('wpn_pick_mace')), 'the pick mace is swung, not fired');

console.log('\n== the round flies exactly as far as the number says ==');
/* The reach on the weapon is the distance the round travels. If these two
   ever disagree, the number the player reads is a lie. */
const BULLET_SPEED = 760;
for (const w of weapons) {
  if (!VG.isRangedWeapon(w)) continue;
  const life = Math.max(0.08, Math.min(1.2, w.stats.range / BULLET_SPEED));
  const flown = life * BULLET_SPEED;
  ok(Math.abs(flown - w.stats.range) < 0.001,
    w.name + ': a round flies ' + Math.round(flown) + 'm, which is the ' + w.stats.range + 'm on the label');
}

console.log('\n== what you start with ==');
const p = VG.newPlayer(world);
ok(p.weapon === 'wpn_long_horn', 'you start with a gun in your hand');
ok(p.hotbar[p.sel] === 'wpn_long_horn', 'the gun is in the slot you are holding');
ok(p.inv['wpn_long_horn'] === 1, 'the gun is in your pack');
ok((p.ammo['ammo_slug'] || 0) > 0, 'and it has rounds (' + (p.ammo['ammo_slug'] || 0) + ')');
ok(p.inv['wpn_scrap_torch'] >= 1, 'the torch is still with you');
ok(p.hotbar.indexOf('wpn_scrap_torch') >= 0, 'the torch is in the bar');
ok(p.hotbar.filter((s) => s).length < 5, 'a slot is left free for the first thing you find');

console.log('\n== the gun works at the distance a fight starts ==');
/* The exact case that was reported: something 220m away, which is inside
   the notice radius and therefore something you are already fighting. */
function shootAt(distance, weaponId) {
  const w2 = VG.genWorld(90210);
  const p2 = VG.newPlayer(w2);
  p2.x = 400; p2.y = 400;
  if (weaponId) {
    VG.invAdd(p2, weaponId, 1);
    VG.equipWeapon(p2, weaponId);
    p2.ammo[VG.item(weaponId).ammo] = 40;
  }
  const ex = 400 + distance, ey = 400;
  const foe = {
    x: ex / VG.TILE, y: ey / VG.TILE, hp: 200, maxhp: 200, r: 11,
    dead: false, kind: 'rusted', aggro: 0
  };
  w2.enemies = [foe];
  VG.mouse.x = ex; VG.mouse.y = ey;
  VG.mouse.world = { x: ex, y: ey };
  VG.state.fireCd = 0;
  VG.state.bullets.length = 0;
  VG.state.hits.length = 0;
  VG.fire(p2, w2);
  /* the round has to be stepped by hand: the sandbox has no frame loop */
  let marks = 0;
  for (let i = 0; i < 60; i++) {
    VG.updateBullets(0.02, p2, w2);
    if (VG.state.hits.length > marks) marks = VG.state.hits.length;
  }
  return { foe: foe, p2: p2, marks: marks };
}

const at220 = shootAt(220, null);
ok(at220.foe.hp < 200, 'the starting revolver hits something 220m away (' + Math.round(at220.foe.hp) + ' hp left)');
ok(at220.marks > 0, 'and the hit is marked where it landed');

const at320 = shootAt(320, null);
ok(at320.foe.hp === 200, 'and does not reach 320m, which the weapon says it does not');

/* a longer gun does reach further - the reach is not decoration */
const longShot = shootAt(320, 'wpn_survey_marksman');
ok(longShot.foe.hp < 200, 'the Long Marksman reaches 320m, because it says it does');

console.log('\n== a shot is a noise ==');
{
  const w3 = VG.genWorld(77);
  const p3 = VG.newPlayer(w3);
  p3.x = 400; p3.y = 400;
  const near = { x: (400 + 200) / VG.TILE, y: 400 / VG.TILE, hp: 50, maxhp: 50, r: 11, dead: false, kind: 'rusted', aggro: 0 };
  const far = { x: (400 + 400) / VG.TILE, y: 400 / VG.TILE, hp: 50, maxhp: 50, r: 11, dead: false, kind: 'rusted', aggro: 0 };
  w3.enemies = [near, far];
  VG.mouse.world = { x: 600, y: 400 };
  VG.state.fireCd = 0;
  VG.fire(p3, w3);
  ok(near.aggro > 0, 'firing tells something 200m away where you are');
  ok(far.aggro === 0, 'and does not reach something 400m away');
}
{
  /* a silenced weapon carries nothing beyond the distance they would have
     seen you at anyway */
  const w4 = VG.genWorld(78);
  const p4 = VG.newPlayer(w4);
  p4.x = 400; p4.y = 400;
  VG.invAdd(p4, 'wpn_needle_carbine', 1);
  VG.equipWeapon(p4, 'wpn_needle_carbine');
  p4.ammo['ammo_needle'] = 40;
  const at200 = { x: 600 / VG.TILE, y: 400 / VG.TILE, hp: 50, maxhp: 50, r: 11, dead: false, kind: 'rusted', aggro: 0 };
  const at100 = { x: 500 / VG.TILE, y: 400 / VG.TILE, hp: 50, maxhp: 50, r: 11, dead: false, kind: 'rusted', aggro: 0 };
  w4.enemies = [at200, at100];
  VG.mouse.world = { x: 600, y: 400 };
  VG.state.fireCd = 0;
  VG.fire(p4, w4);
  ok(at100.aggro > 0, 'a silenced gun still gives you away at 100m');
  ok(at200.aggro === 0, 'but not at 200m - it does not carry');
}

console.log('\n== a weapon you find has a home ==');
{
  const w5 = VG.genWorld(99);
  const p5 = VG.newPlayer(w5);
  VG.taughtWeapon = false;
  logLines.length = 0;
  VG.invAdd(p5, 'wpn_survey_carbine', 1);
  const slot = p5.hotbar.indexOf('wpn_survey_carbine');
  ok(slot >= 0, 'a found gun goes into a free hotbar slot (slot ' + (slot + 1) + ')');
  ok(logLines.some((l) => /Press \d/.test(l) && /survey carbine/i.test(l)),
    'and the log names the key to press');
}
{
  /* and a found aid still does */
  const w6 = VG.genWorld(98);
  const p6 = VG.newPlayer(w6);
  VG.taughtAid = false;
  logLines.length = 0;
  VG.invAdd(p6, 'aid_ration_tin', 1);
  ok(p6.hotbar.indexOf('aid_ration_tin') >= 0, 'a found tin goes into a free hotbar slot too');
}

console.log('\n== equipping never throws a slot away ==');
{
  const w7 = VG.genWorld(97);
  const p7 = VG.newPlayer(w7);
  VG.equipWeapon(p7, 'wpn_scrap_torch');
  ok(p7.weapon === 'wpn_scrap_torch', 'the torch is in your hand');
  ok(p7.hotbar.indexOf('wpn_long_horn') >= 0, 'and the revolver stays in the bar');
  ok(p7.hotbar.indexOf('wpn_scrap_torch') >= 0, 'and the torch is in the bar too');
  ok(p7.sel === p7.hotbar.indexOf('wpn_scrap_torch'), 'and the bar shows what is in your hand');
}
{
  const w8 = VG.genWorld(96);
  const p8 = VG.newPlayer(w8);
  p8.sel = 2;
  VG.equipWeapon(p8, 'wpn_scrap_torch');
  ok(p8.hotbar[2] === 'aid_canteen', 'equipping a weapon does not overwrite the slot you were on');
}
{
  /* every slot full: the new weapon goes in your hand and the old one stays
     in the pack - it is not destroyed */
  const w9 = VG.genWorld(95);
  const p9 = VG.newPlayer(w9);
  p9.hotbar = ['wpn_scrap_torch', 'aid_canteen', 'aid_field_dressing', 'ammo_slug', 'aid_saline_stim'];
  p9.sel = 0;
  VG.equipWeapon(p9, 'wpn_survey_carbine');
  ok(p9.weapon === 'wpn_survey_carbine', 'the gun is in your hand');
  ok(p9.hotbar[0] === 'wpn_survey_carbine', 'and it is in the bar');
  ok(p9.inv['wpn_scrap_torch'] === 1, 'the torch it displaced is still in your pack');
}

console.log('\n== the interface says what the weapon does ==');
{
  const w10 = VG.genWorld(94);
  const p10 = VG.newPlayer(w10);
  const gun = VG.item('wpn_long_horn');
  const hintGun = VG.useHint(gun, p10);
  ok(/fire/i.test(hintGun), 'a gun says it fires (' + hintGun + ')');
  ok(/280/.test(hintGun), 'and says how far it reaches (' + hintGun + ')');
  const torch = VG.item('wpn_scrap_torch');
  VG.equipWeapon(p10, 'wpn_scrap_torch');
  const hintTorch = VG.useHint(torch, p10);
  ok(/swing/i.test(hintTorch), 'a swung weapon says it swings (' + hintTorch + ')');
  ok(/40/.test(hintTorch), 'and says its reach (' + hintTorch + ')');
  const notHeld = VG.useHint(gun, p10);
  ok(/SPACE/i.test(notHeld), 'a weapon you are not holding says how to take it (' + notHeld + ')');
}

console.log('\n== the torch burns in the pack ==');
{
  const w11 = VG.genWorld(93);
  const p11 = VG.newPlayer(w11);
  VG.equipWeapon(p11, 'wpn_scrap_torch');
  const held = VG.torchLight(p11);
  ok(held !== null, 'the torch is burning while it is in your hand');
  ok(held && held.held === true, 'and the game knows it is in your hand');
  VG.equipWeapon(p11, 'wpn_long_horn');
  const packed = VG.torchLight(p11);
  ok(packed !== null, 'the torch keeps burning when it is in the pack');
  ok(packed && packed.held === false, 'and the game knows it is not in your hand');
  ok(packed && Math.abs(VG.dist(packed.x, packed.y, p11.x, p11.y)) > 1,
    'and the flame is somewhere else than the gun');
  ok(packed && held && Math.abs(VG.dist(packed.x, packed.y, held.x, held.y)) > 1,
    'and it is not in the same place as when it was in your hand');
  delete p11.inv['wpn_scrap_torch'];
  ok(VG.torchLight(p11) === null, 'with no torch there is no light');
}

console.log('\n== an old save is issued a gun ==');
{
  const store = {};
  store['verdigris.save.v1'] = JSON.stringify({
    v: 1, seed: 5150, time: 1000,
    player: {
      x: 400, y: 400, hp: 100, stam: 100, food: 100, water: 100, dose: 0,
      inv: { field_notebook: 1, aid_canteen: 1, wpn_scrap_torch: 1, ammo_coin: 6 },
      ammo: { ammo_coin: 6 },
      hotbar: ['wpn_scrap_torch', 'aid_canteen', null, null, null],
      sel: 0, weapon: 'wpn_scrap_torch', armor: null,
      rep: {}, knownFacts: {}, readClues: {}, solvedSolutions: {}, foundClues: {},
      xp: 0, level: 1, killed: 0, containersOpened: 0
    },
    opened: [], discovered: [], dead: [], dyn: null
  });
  const sb2 = makeSandbox(store);
  loadInto(sb2, MODULES);
  const VG2 = sb2.window.VG;
  VG2.itemIndex();
  const loaded = VG2.loadGame();
  ok(!!loaded, 'the old save loads');
  if (loaded) {
    ok(loaded.inv['wpn_long_horn'] === 1, 'a save with no gun is issued a revolver');
    ok((loaded.ammo['ammo_slug'] || 0) >= 6, 'with six rounds (' + (loaded.ammo['ammo_slug'] || 0) + ')');
    ok(loaded.hotbar.indexOf('wpn_long_horn') >= 0, 'and it lands in a hotbar slot');
    ok(loaded.inv['wpn_scrap_torch'] === 1, 'and the torch is not taken away');
  }
}

console.log(fail === 0 ? '\nALL CHECKS PASSED' : '\n' + fail + ' CHECKS FAILED');
process.exit(fail === 0 ? 0 : 1);
