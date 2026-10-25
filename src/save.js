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

  VG.saveGame = function () {
    const p = VG.Player, w = VG.World;
    if (!p || !w) return;
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
        foundClues: p.foundClues, xp: p.xp, level: p.level, killed: p.killed, containersOpened: p.containersOpened
      },
      opened: w.containers.filter((c) => c.opened).map((c) => c.id),
      discovered: w.pois.filter((q) => q.discovered).map((q) => q.id),
      dead: w.enemies.filter((e) => e.dead).map((e) => e.id),
      dyn: VG.DYN ? VG.DYN.save() : null
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      VG.log('Survey notes saved.', 'good');
    } catch (err) {
      VG.log('Could not save: ' + err.message, 'bad');
    }
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
      for (const k of ['x', 'y', 'hp', 'stam', 'food', 'water', 'dose', 'xp', 'level', 'killed', 'containersOpened']) {
        if (s[k] !== undefined) p[k] = s[k];
      }
      p.inv = sanitizeMap(s.inv); p.ammo = sanitizeMap(s.ammo, 'ammo');
      p.hotbar = (s.hotbar || p.hotbar).map(sanitizeSlot);
      p.sel = s.sel || 0; p.weapon = sanitizeSlot(s.weapon); p.armor = sanitizeSlot(s.armor);
      p.rep = s.rep || p.rep; p.knownFacts = s.knownFacts || {};
      p.readClues = s.readClues || {}; p.solvedSolutions = s.solvedSolutions || {};
      p.foundClues = s.foundClues || {};
      VG.state.time = d.time || 0;
      const openSet = new Set(d.opened || []);
      for (const c of VG.World.containers) if (openSet.has(c.id)) c.opened = true;
      const discSet = new Set(d.discovered || []);
      for (const q of VG.World.pois) if (discSet.has(q.id)) q.discovered = true;
      const deadSet = new Set(d.dead || []);
      for (const e of VG.World.enemies) {
        if (deadSet.has(e.id)) { e.dead = true; e.hp = 0; }
        e.maxhp = e.hp;
      }
      VG.Player = p;
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
