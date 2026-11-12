/* VERDIGRIS — persistence */
window.VG = window.VG || {};
(function (VG) {
  'use strict';

  const KEY = 'verdigris.save.v1';

  /* Early builds named a few items that the catalog never shipped. Saves from
     that era still carry those ids, so map them forward and drop whatever is
     genuinely unknown rather than loading an invisible, unusable item. */
  const LEGACY_ITEMS = {
    aid_water: 'aid_canteen',
    aid_bandage: 'aid_field_dressing',
    aid_stim: 'aid_saline_stim',
    aid_ration: 'aid_ration_tin',
    aid_flash: 'ammo_flare',
    wpn_pipe: 'wpn_scrap_torch',
    wpn_trap: 'wpn_scrap_torch'
  };

  function resolveItem(id) { return LEGACY_ITEMS[id] || id; }

  function sanitizeMap(map, onlyCat) {
    const out = {};
    for (const k in (map || {})) {
      const id = resolveItem(k);
      const it = VG.item(id);
      if (!it) continue;
      if (onlyCat && it.cat !== onlyCat) continue;
      const n = map[k] || 0;
      if (n > 0) out[id] = (out[id] || 0) + n;
    }
    return out;
  }

  function sanitizeSlot(id) {
    if (!id) return null;
    const r = resolveItem(id);
    return VG.item(r) ? r : null;
  }

  VG.saveGame = function (quiet) {
    const p = VG.Player, w = VG.World;
    if (!p || !w) return false;
    /* saving indoors saves the spot on the flats, not the spot in the room:
       the room is not a place you can be when you come back */
    const px = (VG.INT && VG.INT.active && p.wx !== undefined) ? p.wx : p.x;
    const py = (VG.INT && VG.INT.active && p.wy !== undefined) ? p.wy : p.y;
    const data = {
      v: 1, seed: w.seed, time: VG.state.time,
      player: {
        x: px, y: py, hp: p.hp, stam: p.stam, food: p.food, water: p.water, dose: p.dose,
        inv: p.inv, ammo: p.ammo, hotbar: p.hotbar, sel: p.sel, weapon: p.weapon, armor: p.armor,
        rep: p.rep, knownFacts: p.knownFacts, readClues: p.readClues, solvedSolutions: p.solvedSolutions,
        foundClues: p.foundClues, rejectedTheories: p.rejectedTheories, doneContracts: p.doneContracts,
        xp: p.xp, level: p.level, killed: p.killed, containersOpened: p.containersOpened,
        charted: p.charted || 0, downs: p.downs || 0
      },
      opened: w.containers.filter((c) => c.opened).map((c) => c.id),
      /* A crate that was searched but not emptied - the pack was full - has
         its own state, and it is not "opened". Without this the crate came
         back from a save unrolled, paid out its whole contents a second time,
         and the things already taken from it were taken twice. What is still
         in it is written down; what is not in it stays gone. */
      partial: w.containers.filter((c) => !c.opened && c.loot).map((c) => ({
        id: c.id, loot: c.loot, surprise: c.surprise || null
      })),
      discovered: w.pois.filter((q) => q.discovered).map((q) => q.id),
      dead: w.enemies.filter((e) => e.dead).map((e) => e.id),
      dyn: VG.DYN ? VG.DYN.save() : null
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      if (!quiet) VG.log('Survey notes saved.', 'good');
      if (VG.FX) VG.FX.saved();
      return true;
    } catch (err) {
      if (!quiet) VG.log('Could not save: ' + err.message, 'bad');
      return false;
    }
  };

  /* One line for the title screen: what is waiting if you continue. */
  VG.saveSummary = function () {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (!d || d.v !== 1 || !d.player) return null;
      const s = d.player;
      let closed = 0;
      for (const k in (s.solvedSolutions || {})) if ((s.solvedSolutions[k] || []).length) closed++;
      const total = VG.allCases ? VG.allCases().length : 8;
      const lv = VG.levelForXp ? VG.levelForXp(s.xp || 0) : 1;
      return 'Notes on file: ' + closed + ' of ' + total + ' cases closed · ' + (d.discovered || []).length +
        ' places charted · ' + (VG.gradeName ? VG.gradeName(lv) : 'grade ' + lv);
    } catch (e) { return null; }
  };

  VG.loadGame = function () {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { return null; }
    if (!raw) return null;
    try {
      const d = JSON.parse(raw);
      if (!d || d.v !== 1) return null;
      VG.genWorld(d.seed);
      const p = VG.newPlayer(VG.World);
      const s = d.player || {};
      for (const k of ['x', 'y', 'hp', 'stam', 'food', 'water', 'dose', 'xp', 'level', 'killed', 'containersOpened', 'charted', 'downs']) {
        if (s[k] !== undefined) p[k] = s[k];
      }
      /* the grade is worked out from the experience, never trusted from the
         file: an older save counted levels a different way */
      if (VG.applyGrade) { VG.applyGrade(p); p.hp = Math.min(p.hp, p.maxhp); }
      p.inv = sanitizeMap(s.inv); p.ammo = sanitizeMap(s.ammo, 'ammo');
      p.hotbar = (s.hotbar || p.hotbar).map(sanitizeSlot);
      p.sel = s.sel || 0; p.weapon = sanitizeSlot(s.weapon); p.armor = sanitizeSlot(s.armor);
      p.rep = s.rep || p.rep; p.knownFacts = s.knownFacts || {};
      p.readClues = s.readClues || {}; p.solvedSolutions = s.solvedSolutions || {};
      p.foundClues = s.foundClues || {};
      p.rejectedTheories = s.rejectedTheories || {};
      p.doneContracts = s.doneContracts || {};
      /* A save written before the flats had a usable gun would load a world
         with nothing to shoot, and the player would rightly conclude the
         game is broken. The Survey Office issues you a revolver if you turn
         up with none - and it says which key to press. */
      let hasGun = false;
      for (const id in p.inv) {
        const it = VG.item(id);
        if (it && it.cat === 'weapon' && VG.isRangedWeapon(it)) { hasGun = true; break; }
      }
      if (!hasGun) {
        p.inv['wpn_long_horn'] = 1;
        p.inv['ammo_slug'] = (p.inv['ammo_slug'] || 0) + 6;
        p.ammo['ammo_slug'] = (p.ammo['ammo_slug'] || 0) + 6;
        const free = p.hotbar.indexOf(null);
        if (free >= 0) p.hotbar[free] = 'wpn_long_horn';
        p.issuedRevolver = true;
      }
      VG.state.time = d.time || 0;
      const openSet = new Set(d.opened || []);
      for (const c of VG.World.containers) if (openSet.has(c.id)) c.opened = true;
      const part = {};
      for (const r of (d.partial || [])) part[r.id] = r;
      for (const c of VG.World.containers) {
        const r = part[c.id];
        if (!r || c.opened) continue;
        c.loot = (r.loot || []).filter((l) => l && VG.item(resolveItem(l.id)))
          .map((l) => ({ id: resolveItem(l.id), qty: l.qty || 1 }));
        c.surprise = (r.surprise && VG.item(r.surprise.id)) ? r.surprise : null;
        c.partial = true;
      }
      const discSet = new Set(d.discovered || []);
      for (const q of VG.World.pois) if (discSet.has(q.id)) q.discovered = true;
      VG.Player = p;
      /* the files that were opened before the save have to be back in the
         world before the player goes looking for them. This runs after the
         opened crates are restored, because a crate the player already
         emptied is not a crate the evidence can go back into. */
      if (VG.rebuildOpenClues) VG.rebuildOpenClues(VG.World, p);
      /* and the dead come back dead. This has to run after the evidence is
         placed, because placing a file puts its guards into the world -
         and a guard you already killed has to stay killed, or the file
         you closed becomes a file you have to fight through twice. */
      const deadSet = new Set(d.dead || []);
      for (const e of VG.World.enemies) {
        if (deadSet.has(e.id)) { e.dead = true; e.hp = 0; }
        e.maxhp = e.hp;
      }
      /* the living-flats state is applied after VG.DYN.init, which resets it */
      VG.loadedDyn = d.dyn || null;
      return p;
    } catch (err) {
      return null;
    }
  };

  VG.hasSave = function () {
    try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
  };
  VG.clearSave = function () {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  };
})(window.VG);
