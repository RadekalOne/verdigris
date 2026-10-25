/* VERDIGRIS — world generation */
window.VG = window.VG || {};
(function (VG) {
  'use strict';

  const TILE = 32;
  const W = 288, H = 288;

  VG.TILE = TILE; VG.WORLD_W = W; VG.WORLD_H = H;

  VG.BIOME = [
    { key: 'salt',     name: 'Salt Flat',    ground: '#b3ac9a', ground2: '#a29a87', acc: '#d6cfba', walk: 1.00 },
    { key: 'dune',     name: 'Dunes',        ground: '#c3ad82', ground2: '#b09870', acc: '#dcc79c', walk: 1.18 },
    { key: 'scrub',    name: 'Scrub',        ground: '#6b6849', ground2: '#5a5740', acc: '#87875b', walk: 1.06 },
    { key: 'town',     name: 'Verdigris Flats', ground: '#6b6a62', ground2: '#5a5952', acc: '#9c9070', walk: 1.00 },
    { key: 'indus',    name: 'Industrial',   ground: '#59564f', ground2: '#4a4740', acc: '#7c796a', walk: 1.00 },
    { key: 'refinery', name: 'Reactor Yard', ground: '#555047', ground2: '#453f36', acc: '#86a89b', walk: 1.00 },
    { key: 'water',    name: 'Dry Lake',     ground: '#68787d', ground2: '#59696e', acc: '#9cb3b8', walk: 1.45 },
    { key: 'ruin',     name: 'Wreck',        ground: '#6c6257', ground2: '#5b5249', acc: '#908375', walk: 1.10 }
  ];

  VG.POI_TYPES = [
    { key: 'house',      name: 'Residence',    tier: 0, w: 3 },
    { key: 'shop',       name: 'Storefront',   tier: 1, w: 2 },
    { key: 'clinic',     name: 'Clinic',       tier: 2, w: 1 },
    { key: 'police',     name: 'Sheriff Post', tier: 2, w: 1 },
    { key: 'library',    name: 'Library',      tier: 2, w: 1 },
    { key: 'chapel',     name: 'Chapel',       tier: 1, w: 1 },
    { key: 'diner',      name: 'Diner',        tier: 1, w: 1 },
    { key: 'gas',        name: 'Fuel Stop',    tier: 1, w: 2 },
    { key: 'watertower', name: 'Water Tower',  tier: 1, w: 2 },
    { key: 'substation', name: 'Substation',   tier: 2, w: 1 },
    { key: 'reactor_yard', name: 'Reactor Yard', tier: 3, w: 1 },
    { key: 'mine',       name: 'Mine Head',    tier: 2, w: 1 },
    { key: 'school',     name: 'School',       tier: 2, w: 1 },
    { key: 'hotel',      name: 'Hotel',        tier: 2, w: 1 },
    { key: 'bank',       name: 'Bank',         tier: 3, w: 1 },
    { key: 'radio_tower', name: 'Relay Mast',  tier: 2, w: 1 },
    { key: 'hangar',     name: 'Hangar',       tier: 2, w: 1 },
    { key: 'camp',       name: 'Camp',         tier: 0, w: 2 },
    { key: 'monument',   name: 'Monument',     tier: 1, w: 1 },
    { key: 'well',       name: 'Well',         tier: 0, w: 2 },
    { key: 'bunker',     name: 'Bunker',       tier: 3, w: 1 },
    { key: 'foundry',    name: 'Foundry',      tier: 2, w: 1 },
    { key: 'mill',       name: 'Mill',         tier: 1, w: 1 },
    { key: 'depot',      name: 'Freight Depot', tier: 2, w: 1 },
    { key: 'observatory', name: 'Observatory', tier: 2, w: 1 },
    { key: 'cannery',    name: 'Cannery',      tier: 1, w: 1 },
    { key: 'garage',     name: 'Garage',       tier: 1, w: 1 },
    { key: 'theater',    name: 'Theater',      tier: 1, w: 1 },
    { key: 'market',     name: 'Market',       tier: 1, w: 1 },
    { key: 'guardhouse', name: 'Guard Post',   tier: 1, w: 1 }
  ];
  const POI_BY_KEY = {};
  VG.POI_TYPES.forEach((p) => { POI_BY_KEY[p.key] = p; });

  /* which POI types suit which biome */
  const AFFINITY = {
    town:     ['house', 'shop', 'diner', 'market', 'chapel', 'clinic', 'school', 'hotel', 'bank', 'library', 'police', 'theater', 'garage', 'gas', 'mill', 'cannery'],
    indus:    ['substation', 'gas', 'garage', 'foundry', 'depot', 'guardhouse', 'watertower', 'hangar', 'shop'],
    refinery: ['reactor_yard', 'guardhouse', 'substation', 'foundry', 'hangar', 'radio_tower', 'observatory'],
    salt:     ['camp', 'monument', 'well', 'mine', 'radio_tower'],
    dune:     ['camp', 'monument', 'well', 'bunker', 'hangar'],
    scrub:    ['camp', 'house', 'well', 'mill', 'observatory', 'monument'],
    water:    ['well', 'mine', 'camp', 'monument'],
    ruin:     ['house', 'shop', 'garage', 'depot', 'bunker', 'hotel']
  };

  const NAME_A = ['Hollis', 'Vance', 'Teague', 'Meridian', 'Sundown', 'Copper Mesa', 'Cutter', 'Blackwood',
    'Ashgrove', 'Pellam', 'Draycott', 'Ironside', 'Wexley', 'Calder', 'Rennick', 'Lowry'];
  const NAME_B = ['Depot', 'Supply', 'Store', 'Works', 'Junction', 'Exchange', 'Yard', 'Post', 'Roof',
    'Exchange Co.', 'Trading', 'Company', 'Station', 'Shed', 'Hall'];
  const TOWN_STREET = ['Alkali', 'Copper', 'Sundown', 'Hollis', 'Pellam', 'Cutter', 'Teague', 'Vance', 'Bellows', 'Ironside'];

  const B = { // biome keys by index
    salt: 0, dune: 1, scrub: 2, town: 3, indus: 4, refinery: 5, water: 6, ruin: 7
  };

  /* ---------------------------------------------------------------- */
  VG.World = null;

  /* Every case file, in order. This is engine data rather than a view
     concern: main.js needs it to find clues, and the headless tests need
     it without a DOM. */
  VG.allCases = function () { return (VG.CASES || []).concat(VG.CASES_B || []); };

  VG.genWorld = function (seed) {
    const rng = VG.makeRng(seed);
    const biome = new Uint8Array(W * H);
    const elev = new Float32Array(W * H);
    const road = new Uint8Array(W * H);
    const idx = (x, y) => y * W + x;
    const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

    // key locations
    const town = { x: Math.round(W * 0.33), y: Math.round(H * 0.60) };
    const yard = { x: Math.round(W * 0.70), y: Math.round(H * 0.28) };
    const mine = { x: Math.round(W * 0.18), y: Math.round(H * 0.22) };
    const lake = { x: Math.round(W * 0.60), y: Math.round(H * 0.78) };

    // ---- elevation + biome field ----
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const e = VG.fbm(x / 46, y / 46, seed, 5, 2.05, 0.5);
        elev[idx(x, y)] = e;
        let b = B.scrub;
        const dLake = VG.dist(x, y, lake.x, lake.y);
        const dTown = VG.dist(x, y, town.x, town.y);
        const dYard = VG.dist(x, y, yard.x, yard.y);
        const dMine = VG.dist(x, y, mine.x, mine.y);
        /* The landmark checks come FIRST. Elevation used to be tested first, so
           the salt and dune thresholds swallowed the town (82% dune), the
           reactor yard (71% dune) and the mine (89% salt) before the landmark
           tests ever ran. The map was 87% undifferentiated desert with three
           barely-visible patches — which is why the world looked empty no
           matter how the renderer was fixed. A place has to be a place. */
        if (dLake < 26) b = B.water;
        else if (dYard < 30) b = B.refinery;
        else if (dTown < 26) b = B.town;
        else if (dMine < 16) b = B.ruin;
        else if (dYard < 52 || dMine < 34) b = B.indus;
        else if (e < 0.42) b = B.salt;
        else if (e > 0.63) b = B.dune;
        biome[idx(x, y)] = b;
      }
    }
    // organic coastline for the dry lake
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const d = VG.dist(x, y, lake.x, lake.y);
        const wob = 22 + VG.fbm(x / 18, y / 18, seed + 31, 3) * 16;
        if (d < wob) biome[idx(x, y)] = B.water;
        else if (d < wob + 4 && biome[idx(x, y)] === B.salt) biome[idx(x, y)] = B.scrub;
      }
    }

    const pois = [];
    let poiId = 0;
    const used = new Set();
    const keyOf = (x, y) => x + ',' + y;

    function freeSpot(cx, cy, r, want) {
      for (let tries = 0; tries < 160; tries++) {
        const a = rng() * VG.TAU, d = Math.sqrt(rng()) * r;
        const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d);
        if (!inb(x, y) || used.has(keyOf(x, y))) continue;
        let ok = true;
        for (const p of pois) {
          if (VG.dist(x, y, p.x, p.y) < 13) { ok = false; break; }
        }
        if (!ok) continue;
        const b = biome[idx(x, y)];
        if (want && want.indexOf(b) < 0) continue;
        used.add(keyOf(x, y));
        return { x, y };
      }
      return null;
    }

    function addPoi(typeKey, x, y, name, forced) {
      const t = POI_BY_KEY[typeKey];
      const poi = {
        id: 'p' + (poiId++), type: typeKey, x, y, name: name || (t.name + ' ' + (poiId)),
        tier: t.tier, containers: [], radius: 30 + t.tier * 12, discovered: false
      };
      pois.push(poi);
      return poi;
    }

    function poiName(rng2, townish) {
      if (townish) {
        const s = rng2.pick(TOWN_STREET);
        return s + ' ' + rng2.pick(['St.', 'Ave.', 'Row', 'Lane']) + ' — ' +
          rng2.pick(['Residence', 'Storefront', 'Garage', 'Diner', 'Clinic', 'Rooms', 'Supply', 'Shop']);
      }
      return rng2.pick(NAME_A) + ' ' + rng2.pick(NAME_B);
    }

    /* ---- reactor yard compound (the centerpiece) ---- */
    addPoi('reactor_yard', yard.x, yard.y, 'Copper Mesa Station');
    for (let i = 0; i < 5; i++) {
      const s = freeSpot(yard.x, yard.y, 30, [B.refinery, B.indus]);
      if (s) addPoi(rng.pick(['guardhouse', 'foundry', 'substation', 'hangar', 'radio_tower']), s.x, s.y, null, true);
    }
    /* ---- town grid ---- */
    for (let i = 0; i < 26; i++) {
      const s = freeSpot(town.x, town.y, 30, [B.town]);
      if (s) addPoi(rng.pick(AFFINITY.town), s.x, s.y, poiName(rng, true), true);
    }
    /* ---- mine ---- */
    addPoi('mine', mine.x, mine.y, 'Vance Pit');
    for (let i = 0; i < 3; i++) {
      const s = freeSpot(mine.x, mine.y, 26, [B.ruin, B.indus, B.salt]);
      if (s) addPoi(rng.pick(['depot', 'garage', 'bunker', 'camp']), s.x, s.y, null, true);
    }
    /* ---- guarantee at least one of every POI type, for clue placement ---- */
    for (const t of VG.POI_TYPES) {
      const already = pois.some((p) => p.type === t.key);
      if (already) continue;
      const order = [B.town, B.indus, B.refinery, B.scrub, B.salt, B.dune, B.water, B.ruin];
      let placed = false;
      for (const b of order) {
        const s = freeSpot(W / 2, H / 2, 120, [b]);
        if (s) { addPoi(t.key, s.x, s.y, null, true); placed = true; break; }
      }
      if (!placed) {
        const s = freeSpot(W / 2, H / 2, 150, null);
        if (s) addPoi(t.key, s.x, s.y, null, true);
      }
    }
    /* ---- scatter wild POIs ---- */
    const wildCount = 46;
    for (let i = 0; i < wildCount; i++) {
      const b = rng.int(0, 7);
      const bk = Object.keys(B).find((k) => B[k] === b);
      const s = freeSpot(W / 2, H / 2, 150, [b]);
      if (!s) continue;
      const type = rng.pick(AFFINITY[bk] || ['camp']);
      addPoi(type, s.x, s.y, poiName(rng, false));
    }
    /* ---- roadside POIs along the highway ---- */
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const x = Math.round(W * (0.02 + t * 0.95));
      const y = Math.round(H * (0.86 - t * 0.10) + Math.sin(t * 9) * 8);
      if (!inb(x, y) || used.has(keyOf(x, y))) continue;
      used.add(keyOf(x, y));
      addPoi(rng.pick(['gas', 'motel', 'camp', 'garage', 'well', 'monument', 'diner', 'depot'].filter((k) => POI_BY_KEY[k])),
        x, y, poiName(rng, true));
    }

    /* ---- roads ---- */
    function carveRoad(x0, y0, x1, y1, wide) {
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = Math.round(VG.lerp(x0, x1, t));
        const y = Math.round(VG.lerp(y0, y1, t));
        /* wide === 0 means a single-tile lane; wide === 1 is a three-tile road
           with cut corners. The old "wide || 1" coerced 0 to 1, so every road
           in the game was three tiles wide and the town was 60% asphalt — a
           grid of dark bars rather than streets between blocks. */
        const w = (wide === undefined || wide === null) ? 1 : wide;
        for (let oy = -w; oy <= w; oy++) {
          for (let ox = -w; ox <= w; ox++) {
            if (ox * ox + oy * oy > w * w) continue;
            const px = x + ox, py = y + oy;
            if (!inb(px, py)) continue;
            road[idx(px, py)] = 1;
            if (biome[idx(px, py)] === B.water) biome[idx(px, py)] = B.salt;
          }
        }
      }
    }
    // town street grid
    for (let i = 0; i < 5; i++) {
      const off = (i - 2) * 8;
      carveRoad(town.x - 22, town.y + off, town.x + 22, town.y + off, 0);
      carveRoad(town.x + off, town.y - 22, town.x + off, town.y + 22, 0);
    }
    // highway: west edge -> town -> yard -> north edge
    carveRoad(2, Math.round(H * 0.88), town.x, town.y, 1);
    carveRoad(town.x, town.y, yard.x, yard.y, 1);
    carveRoad(yard.x, yard.y, Math.round(W * 0.94), 4, 1);
    // mine spur
    carveRoad(town.x, town.y, mine.x, mine.y, 0);
    // yard ring road
    carveRoad(yard.x - 20, yard.y - 18, yard.x + 20, yard.y - 18, 0);
    carveRoad(yard.x + 20, yard.y - 18, yard.x + 20, yard.y + 18, 0);
    carveRoad(yard.x + 20, yard.y + 18, yard.x - 20, yard.y + 18, 0);
    carveRoad(yard.x - 20, yard.y + 18, yard.x - 20, yard.y - 18, 0);
    // mine ring
    carveRoad(mine.x - 12, mine.y - 12, mine.x + 12, mine.y - 12, 0);
    carveRoad(mine.x + 12, mine.y - 12, mine.x + 12, mine.y + 12, 0);

    /* ---- start position: the Survey Office field trailer ---- */
    /* Pick a spot with company nearby — never inside a building, never alone. */
    let start = { x: town.x - 26, y: town.y + 24 };
    let bestScore = -1e9, bestStart = null;
    for (let i = 0; i < 900; i++) {
      const x = rng.int(6, W - 6), y = rng.int(6, H - 6);
      if (biome[idx(x, y)] !== B.town && !road[idx(x, y)]) continue;
      let dmin = 1e9, near = 0;
      for (const p of pois) {
        const d = VG.dist(x, y, p.x, p.y);
        if (d < dmin) dmin = d;
        if (d < 20) near++;
      }
      if (dmin < 5) continue;
      const score = near * 12 - Math.abs(dmin - 10) * 2;
      if (score > bestScore) { bestScore = score; bestStart = { x, y }; }
    }
    if (bestStart) start = bestStart;

    /* ---- the field camp: guaranteed company in the first minutes ---- */
    const CAMP = [['camp', 'Survey Field Camp'], ['well', 'Field Well'], ['garage', 'Trailer Yard']];
    for (const cp of CAMP) {
      let s = freeSpot(start.x, start.y, 13, null);
      if (!s) s = freeSpot(start.x, start.y, 20, null);
      if (!s) s = freeSpot(start.x, start.y, 28, null);
      if (s) addPoi(cp[0], s.x, s.y, cp[1]);
    }

    /* ---- containers: every POI gets searchable furniture ---- */
    const containers = [];
    for (const p of pois) {
      const n = 1 + (p.tier > 0 ? 1 : 0) + (p.tier > 1 ? 1 : 0) + (rng.chance(0.35) ? 1 : 0);
      /* The first container a building that kept provisions gets always holds
         them. A diner that might or might not have a tin in it is not a
         destination; a diner with a tin in it is. */
      const foodId = (VG.FOOD_POI && VG.FOOD_POI[p.type]) ? VG.FOOD_POI[p.type].item : null;
      let foodPlaced = false;
      for (let i = 0; i < n; i++) {
        const a = rng() * VG.TAU, d = rng() * (p.radius * 0.7);
        const cx = Math.round(p.x + Math.cos(a) * d), cy = Math.round(p.y + Math.sin(a) * d);
        if (!inb(cx, cy)) continue;
        const food = foodId ? (!foodPlaced ? foodId : (rng.chance(0.4) ? foodId : null)) : null;
        if (food) foodPlaced = true;
        containers.push({
          id: 'c' + containers.length, x: cx, y: cy, poi: p.id, tier: p.tier,
          opened: false, loot: null, name: null, clueId: null, food: food
        });
        p.containers.push(containers.length - 1);
      }
      /* and a building that keeps provisions is never left with nothing to
         keep them in */
      if (foodId && !foodPlaced) {
        containers.push({
          id: 'c' + containers.length, x: p.x, y: p.y, poi: p.id, tier: p.tier,
          opened: false, loot: null, name: null, clueId: null, food: foodId
        });
        p.containers.push(containers.length - 1);
      }
    }

    /* ---- place case clues into matching POIs ---- */
    const allCases = (VG.CASES || []).concat(VG.CASES_B || []);
    const clues = [];
    const hasFree = (p) => p.containers.some((ci) => containers[ci] && !containers[ci].clueId);
    for (const c of allCases) {
      for (const cl of (c.clues || [])) {
        let p = null;
        const exact = pois.filter((q) => q.type === cl.poi && hasFree(q));
        if (exact.length) p = rng.pick(exact);
        if (!p) {
          const alt = pois.filter((q) => hasFree(q));
          if (alt.length) p = rng.pick(alt);
        }
        if (!p) {
          /* nothing free anywhere: mint a container on a POI of the right type */
          const host = pois.filter((q) => q.type === cl.poi);
          const hp = host.length ? rng.pick(host) : (pois.length ? rng.pick(pois) : null);
          if (!hp) continue;
          containers.push({ id: 'c' + containers.length, x: hp.x, y: hp.y, poi: hp.id, tier: hp.tier, opened: false, loot: null, name: null, clueId: cl.id });
          hp.containers.push(containers.length - 1);
          clues.push({ id: cl.id, caseId: c.id, x: hp.x, y: hp.y, container: containers.length - 1 });
          continue;
        }
        const ci = p.containers.find((i) => containers[i] && !containers[i].clueId);
        containers[ci].clueId = cl.id;
        containers[ci].name = cl.name;
        clues.push({ id: cl.id, caseId: c.id, x: containers[ci].x, y: containers[ci].y, container: ci });
      }
    }

    /* ---- enemies in the wild ---- */
    const enemies = [];
    for (let i = 0; i < 130; i++) {
      const x = rng.int(4, W - 5), y = rng.int(4, H - 5);
      const b = biome[idx(x, y)];
      if (b === B.town || b === B.refinery) continue;
      if (road[idx(x, y)]) continue;
      if (VG.dist(x, y, start.x, start.y) < 24) continue;
      const kind = rng.weighted([['rusted', 6], ['drover', 4], ['warden', 1.2]]);
      enemies.push({
        id: 'e' + i, x: x + rng(), y: y + rng(), kind, hp: kind === 'warden' ? 120 : kind === 'drover' ? 46 : 70,
        dmg: kind === 'warden' ? 17 : kind === 'drover' ? 9 : 12, r: 11, aggro: 0, dead: false,
        home: { x, y }, loot: null
      });
    }

    const world = {
      seed, W, H, TILE, biome, elev, road, pois, containers, clues, enemies,
      town, yard, mine, lake, start,
      idx, inb,
      biomeAt: (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? B.scrub : biome[y * W + x]),
      isRoad: (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : road[y * W + x]),
      poiById: (id) => pois.find((p) => p.id === id)
    };
    VG.World = world;
    return world;
  };
})(window.VG);
