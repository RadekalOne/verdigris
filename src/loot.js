/* VERDIGRIS — loot tables and item helpers */
window.VG = window.VG || {};
(function (VG) {
  'use strict';

  VG.itemIndex = function () {
    const m = {};
    for (const it of (VG.ITEMS || [])) m[it.id] = it;
    VG.ITEM = m;
    return m;
  };
  VG.item = function (id) { return (VG.ITEM || {})[id] || null; };

  /* rarity weights by container tier — richer places hold better things */
  const TIER_WEIGHTS = {
    0: [[0, 62], [1, 30], [2, 7], [3, 1]],
    1: [[0, 44], [1, 38], [2, 15], [3, 3]],
    2: [[0, 24], [1, 40], [2, 27], [3, 8], [4, 1]],
    3: [[0, 8], [1, 30], [2, 38], [3, 20], [4, 4]]
  };

  const CAT_POOL = {
    0: ['mat', 'mat', 'misc', 'aid', 'ammo', 'misc', 'intel'],
    1: ['mat', 'aid', 'ammo', 'misc', 'weapon', 'armor', 'intel'],
    2: ['weapon', 'ammo', 'armor', 'aid', 'intel', 'misc', 'mat'],
    3: ['weapon', 'armor', 'aid', 'intel', 'ammo', 'misc']
  };

  /* story rewards never drop from random containers — they are case payouts */
  const STORY_ONLY = { case_torque_reward: 1, case_choir_reward: 1, ledger_token: 1 };
  const isStory = (it) => !!STORY_ONLY[it.id];

  /* Where provisions are kept.
     Water lives at a well: it is public infrastructure, it is on the map
     from the first minute, and you press R and drink. Food had no such
     place. It existed only as a chance roll inside a random crate, so a
     hungry player had nothing to walk toward - and a diner with nothing in
     the back was a picture of a diner.
     These are the buildings that kept a store. Every one of them on the
     flats holds at least one tin, and the panel points you at the nearest. */
  const FOOD_POI = {
    diner: { item: 'aid_ration_tin', note: 'The diner kept a store of rations.' },
    market: { item: 'aid_ration_tin', note: 'The market hall kept provisions.' },
    bunker: { item: 'aid_ration_tin', note: 'The bunker kept emergency rations.' },
    school: { item: 'aid_ration_tin', note: 'The school kept a caretaker store.' },
    depot: { item: 'aid_ration_tin', note: 'Freight came through the depot. Some of it was food.' },
    gas: { item: 'aid_ration_tin', note: 'The fuel stop office had a drivers stash.' },
    clinic: { item: 'aid_survey_pack', note: 'The clinic kept patient packs.' }
  };
  VG.FOOD_POI = FOOD_POI;
  VG.isFoodPoi = function (poi) { return !!(poi && FOOD_POI[poi.type]); };
  VG.foodNote = function (poi) { return (poi && FOOD_POI[poi.type]) ? FOOD_POI[poi.type].note : ''; };

  /* A container's own loot, plus whatever that building was keeping. The
     food is guaranteed, not rolled: a building that keeps rations always
     has them, so the route you are pointed at is never a dead one. */
  VG.rollContainerLoot = function (c, rng) {
    const out = VG.rollLoot(c.tier, rng);
    if (c && c.food) {
      const it = VG.item(c.food);
      if (it) out.push({ id: c.food, qty: 1 });
    }
    /* and what the building kept of the Office's own kit - a relay station
       keeps a dust filter, and the yard needs one */
    if (c && c.kit) {
      const it = VG.item(c.kit);
      if (it) out.push({ id: c.kit, qty: 1 });
    }
    return out;
  };

  VG.rollLoot = function (tier, rng) {
    tier = VG.clamp(tier | 0, 0, 3);
    const n = tier === 0 ? rng.int(1, 2) : tier === 1 ? rng.int(1, 3) : tier === 2 ? rng.int(2, 4) : rng.int(2, 5);
    const out = [];
    const wts = TIER_WEIGHTS[tier];
    for (let i = 0; i < n; i++) {
      const cat = rng.pick(CAT_POOL[tier]);
      const pool = (VG.ITEMS || []).filter((it) => it.cat === cat && !isStory(it));
      if (!pool.length) continue;
      const wantR = rng.weighted(wts);
      // prefer the rolled rarity; fall back to nearest
      let match = pool.filter((it) => it.rarity === wantR);
      if (!match.length) {
        match = pool.slice().sort((a, b) => Math.abs(a.rarity - wantR) - Math.abs(b.rarity - wantR)).slice(0, 4);
      }
      const it = rng.pick(match);
      const qty = (it.cat === 'ammo' || it.cat === 'mat') ? rng.int(1, it.stack || 10) : 1;
      out.push({ id: it.id, qty });
    }
    return out;
  };

  /* guaranteed finds: rare, hand-placed surprises */
  VG.SURPRISE = {
    /* container tier -> chance a container hides something notable */
    chance: function (tier) { return tier >= 2 ? 0.08 : tier === 1 ? 0.05 : 0.03; },
    pick: function (rng) {
      const pool = (VG.ITEMS || []).filter((it) => it.rarity >= 3 && !isStory(it));
      if (!pool.length) return null;
      return rng.pick(pool);
    }
  };

  /* Every out/need id below must exist in the item catalog — the smoke test
     enforces it. A recipe that names a ghost id silently eats the materials
     and produces nothing you can see or use. */
  VG.craftRecipes = [
    { id: 'c_bandage', out: 'aid_field_dressing', qty: 2, need: { scrap_cloth: 2 }, station: 'field' },
    { id: 'c_stim', out: 'aid_saline_stim', qty: 1, need: { scrap_ceramic: 2, scrap_copper: 1 }, station: 'field' },
    { id: 'c_water', out: 'aid_canteen', qty: 1, need: { scrap_ceramic: 1, scrap_plastic: 1 }, station: 'field' },
    /* Rounds by hand. Ammunition used to be bench-only, and a bench is
       inside a building the player may not have found - so the first time
       the revolver ran dry there was nothing to do about it. Hand-loading is
       the poor version: half the rounds for the copper. The bench is still
       where you go to do it properly. */
    { id: 'c_ammo_slug_hand', out: 'ammo_slug', qty: 6, need: { scrap_copper: 2 }, station: 'field' },
    { id: 'c_ammo_slug', out: 'ammo_slug', qty: 14, need: { scrap_copper: 2, scrap_gear: 1 }, station: 'bench' },
    { id: 'c_ammo_rifle', out: 'ammo_rifle', qty: 10, need: { scrap_copper: 3, scrap_gear: 1 }, station: 'bench' },
    { id: 'c_ammo_shell', out: 'ammo_shell', qty: 8, need: { scrap_copper: 3, scrap_gear: 2 }, station: 'bench' },
    { id: 'c_coin', out: 'ammo_coin', qty: 12, need: { scrap_copper: 2, scrap_gear: 1 }, station: 'bench' },
    { id: 'c_scrap_melee', out: 'wpn_scrap_torch', qty: 1, need: { scrap_gear: 4, scrap_cloth: 1 }, station: 'bench' },
    { id: 'c_radfilter', out: 'aid_filter', qty: 1, need: { scrap_cloth: 3, scrap_glass: 1, scrap_ceramic: 1 }, station: 'bench' },
    { id: 'c_ration', out: 'aid_ration_tin', qty: 1, need: { scrap_cloth: 1, scrap_ceramic: 1 }, station: 'bench' },
    { id: 'c_flare', out: 'ammo_flare', qty: 4, need: { scrap_glass: 2, scrap_copper: 2 }, station: 'bench' },
    { id: 'c_draught', out: 'aid_chalk_draught', qty: 1, need: { scrap_ceramic: 2, scrap_glass: 1 }, station: 'bench' },
    /* Guns. The only weapon a bench could make was the torch you already
       had, so "can I make a weapon" had the answer no. These are the plain
       ones: the good guns are still found, not made. */
    { id: 'c_wpn_sling', out: 'wpn_rivet_sling', qty: 1, need: { scrap_gear: 3, scrap_cloth: 2 }, station: 'bench' },
    { id: 'c_wpn_sawn', out: 'wpn_sawn_off', qty: 1, need: { scrap_gear: 5, scrap_copper: 4 }, station: 'bench' },
    { id: 'c_wpn_carbine', out: 'wpn_survey_carbine', qty: 1, need: { scrap_gear: 7, scrap_copper: 5, scrap_plastic: 2 }, station: 'bench' }
  ];

  /* What a thing does, in the fewest words. The workbench listed names and
     nothing else, so the player was asked to spend copper on a "Saline Stim"
     without being told it heals. */
  VG.itemEffect = function (it, p) {
    if (!it) return '';
    const s = it.stats || {};
    const out = [];
    if (it.cat === 'weapon') {
      out.push('damage ' + (s.dmg || 0));
      out.push((VG.isRangedWeapon && VG.isRangedWeapon(it) ? 'fires to ' : 'swung at ') + (s.range || 0) + 'm');
      if (it.ammo && VG.isRangedWeapon && VG.isRangedWeapon(it) && VG.item(it.ammo)) out.push('takes ' + VG.item(it.ammo).name);
      return out.join(' · ');
    }
    if (it.cat === 'ammo') {
      const guns = (VG.ITEMS || []).filter((w) => w.cat === 'weapon' && w.ammo === it.id && VG.isRangedWeapon && VG.isRangedWeapon(w));
      if (!guns.length) return 'ammunition';
      const mine = p ? guns.filter((w) => (p.inv[w.id] || 0) > 0) : [];
      const show = (mine.length ? mine : guns).slice(0, 3).map((w) => w.name);
      return 'rounds for ' + show.join(', ') + (mine.length ? '' : ' (you carry none of these)');
    }
    if (it.passive) return it.passiveNote || 'works while you carry it';
    if (s.heal > 0) out.push('+' + s.heal + ' health');
    if (s.food > 0) out.push('+' + s.food + ' food');
    if (s.thirst > 0) out.push('+' + s.thirst + ' water');
    if (s.rad < 0) out.push(s.rad + ' dose');
    if (s.armor > 0) out.push('armour ' + s.armor);
    return out.join(' · ');
  };

  /* The nearest building with a bench in it, and which way it is. */
  VG.nearestBench = function (p, world) {
    if (!p || !world || !world.pois || !VG.INTERIOR_BY_KEY) return null;
    const inside = !!(VG.INT && VG.INT.active);
    const px = inside && typeof p.wx === 'number' ? p.wx : p.x;
    const py = inside && typeof p.wy === 'number' ? p.wy : p.y;
    let best = null;
    for (const poi of world.pois) {
      const tpl = VG.INTERIOR_BY_KEY[poi.type];
      if (!tpl || !tpl.bench) continue;
      const dx = poi.x * VG.TILE - px, dy = poi.y * VG.TILE - py;
      const d = Math.hypot(dx, dy);
      if (!best || d < best.dist) best = { poi: poi, dist: d, dir: VG.compassDir ? VG.compassDir(dx, dy) : '', name: tpl.benchName || 'workbench' };
    }
    return best;
  };

  /* ---------- where you can make things ---------- */
  /* The bench the player is standing at, if any. Fieldcraft - a bandage, a
     tin of water - needs nothing but your hands. A bench recipe needs a
     bench, and a bench is a thing in a room: the depot press, the market
     stall, the substation bench, the fuel stop bench. Ammunition used to
     be made anywhere at all, which meant the bench was never a place you
     had to go, and the flats had nothing in them worth walking to. */
  VG.benchAt = function (p, world) {
    if (!p) return null;
    if (!VG.INT || !VG.INT.active) return null;
    const b = VG.INT.benchAtRoom(VG.INT.active.tpl);
    if (!b) return null;
    if (VG.dist(p.x, p.y, b.x, b.y) > 160) return null;
    return b;
  };

  /* Can this recipe be made where the player is standing right now? */
  VG.canCraft = function (p, r) {
    if (!r) return false;
    if (r.station !== 'bench') return true;
    return !!VG.benchAt(p, VG.World);
  };

  /* Make it. This changes the pack, so it lives here and not in the click
     handler that used to do it - the workbench sheet only draws the result. */
  VG.craft = function (p, r) {
    if (!p || !r) return { ok: false, why: 'none' };
    if (!VG.canCraft(p, r)) return { ok: false, why: 'bench' };
    for (const k in r.need) if ((p.inv[k] || 0) < r.need[k]) return { ok: false, why: 'short' };
    for (const k in r.need) VG.invRemove(p, k, r.need[k]);
    VG.invAdd(p, r.out, r.qty);
    return { ok: true, out: r.out, qty: r.qty };
  };
})(window.VG);
