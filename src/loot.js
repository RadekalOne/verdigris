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
    { id: 'c_ammo_slug', out: 'ammo_slug', qty: 12, need: { scrap_copper: 2, scrap_gear: 1 }, station: 'bench' },
    { id: 'c_ammo_shell', out: 'ammo_shell', qty: 8, need: { scrap_copper: 3, scrap_gear: 2 }, station: 'bench' },
    { id: 'c_coin', out: 'ammo_coin', qty: 12, need: { scrap_copper: 2, scrap_gear: 1 }, station: 'bench' },
    { id: 'c_scrap_melee', out: 'wpn_scrap_torch', qty: 1, need: { scrap_gear: 4, scrap_cloth: 1 }, station: 'bench' },
    { id: 'c_radfilter', out: 'aid_filter', qty: 1, need: { scrap_cloth: 3, scrap_glass: 1, scrap_ceramic: 1 }, station: 'bench' },
    { id: 'c_ration', out: 'aid_ration_tin', qty: 1, need: { scrap_cloth: 1, scrap_ceramic: 1 }, station: 'bench' },
    { id: 'c_flare', out: 'ammo_flare', qty: 4, need: { scrap_glass: 2, scrap_copper: 2 }, station: 'bench' },
    { id: 'c_draught', out: 'aid_chalk_draught', qty: 1, need: { scrap_ceramic: 2, scrap_glass: 1 }, station: 'bench' }
  ];
})(window.VG);
