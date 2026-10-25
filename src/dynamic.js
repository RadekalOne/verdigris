/* VERDIGRIS — the living flats
   ------------------------------------------------------------------
   The flats are not scenery. Traffic crosses them, people call for help,
   the rusted raid at night, convoys run the road whether or not anyone
   is watching, and the pressure builds the longer you stay out.

   Everything runs off a profile, so one build can be a lonely survey or
   a dangerous one. The dial lives in Options: Quiet / Alive / Dangerous.
   Quiet is not emptiness — weather, light and radio ambience still run —
   it just means nobody needs you and nothing is hunting you.

   The engine owns the rules. The words live in dyn_content.js, and the
   pictures live in gfx_live.js. Neither is allowed to reach in here:
   this file decides what happens, when, and what it costs. */
window.VG = window.VG || {};
(function (VG) {
  'use strict';

  /* ---------- profiles ---------- */
  /* radio/call are [min, max] seconds between events, on the game clock.
     The game runs sixty times real time, so a 30 second radio gap is
     about half a minute of story time. */
  const PROFILES = {
    quiet: {
      radio: [78, 150], call: [0, 0], raid: [0, 0], convoy: [0, 0],
      heat: 0, reward: 1.0, label: 'Quiet',
      blurb: 'Nobody needs you and nothing is hunting you. The flats keep their own weather and their own voices.'
    },
    alive: {
      radio: [17, 34], call: [95, 205], raid: [190, 430], convoy: [150, 340],
      heat: 1.0, reward: 1.0, label: 'Alive',
      blurb: 'Traffic on the band, people who need help, convoys on the road, and pressure that follows you.'
    },
    danger: {
      radio: [8, 17], call: [55, 118], raid: [95, 210], convoy: [80, 170],
      heat: 2.6, reward: 1.75, label: 'Dangerous',
      blurb: 'The band is crowded, the calls come fast, and everything you take is being counted by somebody.'
    }
  };
  VG.DYN_PROFILES = PROFILES;

  const INTENSITY_KEY = 'verdigris.intensity.v1';

  /* ---------- state ---------- */
  VG.DYN = {
    intensity: 'alive',
    heat: 0,
    messages: [],        // radio log, newest last
    calls: [],           // live distress calls
    raids: [],           // live raid events
    convoys: [],         // live convoy runs
    nextRadio: 20,
    nextCall: 110,
    nextRaid: 260,
    nextConvoy: 200,
    nextPatrol: 120,
    rng: null,
    seed: 0,
    helped: 0,           // survivors helped
    lured: 0,            // calls that were traps
    raidsSeen: 0,
    convoysSeen: 0,
    lastRadioKind: '',
    raidSeq: 0,
    callSeq: 0,
    convoySeq: 0,
    /* how much has actually happened. The radio log is capped, so the count
       has to live somewhere else — otherwise a busy world and a louder world
       look identical from the outside. */
    stats: { radio: 0, calls: 0, raids: 0, convoys: 0, answered: 0, lured: 0 }
  };

  function prof() { return PROFILES[VG.DYN.intensity] || PROFILES.alive; }
  VG.DYN.profile = prof;

  function content() {
    const c = VG.DYN_CONTENT || {};
    return {
      radio: c.radio || {},
      calls: c.calls || [],
      raids: c.raids || [],
      convoys: c.convoys || [],
      survivors: c.survivors || []
    };
  }
  VG.DYN.content = content;

  /* ---------- clock ---------- */
  function clock() {
    try { return VG.timeOfDay(VG.state.time).label; } catch (e) { return '--:--'; }
  }
  function hour() {
    try { return VG.timeOfDay(VG.state.time).h; } catch (e) { return 12; }
  }
  function isNight() {
    try { if (VG.isNight) return !!VG.isNight(VG.state.time); } catch (e) { /* fall through */ }
    const h = hour();
    return h >= 20 || h < 6;
  }

  /* ---------- radio log ---------- */
  VG.DYN.push = function (kind, who, text, extra) {
    const m = { kind: kind || 'ambient', who: who || '', text: text || '', at: clock() };
    if (extra) for (const k in extra) m[k] = extra[k];
    VG.DYN.messages.push(m);
    while (VG.DYN.messages.length > 80) VG.DYN.messages.shift();
    if (kind === 'call' || kind === 'raid' || kind === 'warn') {
      if (VG.log) VG.log('[RADIO] ' + (who ? who + ': ' : '') + text, kind === 'raid' ? 'bad' : 'clue');
    }
    return m;
  };

  VG.DYN.recent = function (n) {
    const msgs = VG.DYN.messages;
    const out = [];
    for (let i = msgs.length - 1; i >= 0 && out.length < n; i--) out.push(msgs[i]);
    return out.reverse();
  };

  /* ---------- intensity ---------- */
  VG.DYN.setIntensity = function (v) {
    if (!PROFILES[v]) return false;
    VG.DYN.intensity = v;
    try { localStorage.setItem(INTENSITY_KEY, v); } catch (e) { /* ignore */ }
    const P = prof();
    VG.DYN.nextRadio = Math.min(VG.DYN.nextRadio, P.radio[0]);
    if (!P.call[0]) VG.DYN.nextCall = Infinity;
    else VG.DYN.nextCall = Math.min(VG.DYN.nextCall, P.call[0]);
    if (!P.raid[0]) VG.DYN.nextRaid = Infinity;
    else VG.DYN.nextRaid = Math.min(VG.DYN.nextRaid, P.raid[0]);
    if (!P.convoy[0]) VG.DYN.nextConvoy = Infinity;
    else VG.DYN.nextConvoy = Math.min(VG.DYN.nextConvoy, P.convoy[0]);
    if (VG.log) VG.log('The flats are set to ' + P.label.toLowerCase() + '.', '');
    return true;
  };

  VG.DYN.loadIntensity = function () {
    let v = null;
    try { v = localStorage.getItem(INTENSITY_KEY); } catch (e) { v = null; }
    if (PROFILES[v]) VG.DYN.intensity = v;
    return VG.DYN.intensity;
  };

  /* ---------- init ---------- */
  VG.DYN.init = function (world, seed) {
    const D = VG.DYN;
    D.seed = seed >>> 0;
    D.rng = VG.makeRng(D.seed ^ 0x5bd1e995);
    D.messages = [];
    D.calls = [];
    D.raids = [];
    D.convoys = [];
    D.heat = 0;
    D.helped = 0; D.lured = 0; D.raidsSeen = 0; D.convoysSeen = 0;
    D.raidSeq = 0; D.callSeq = 0; D.convoySeq = 0;
    D.stats = { radio: 0, calls: 0, raids: 0, convoys: 0, answered: 0, lured: 0 };
    const P = prof();
    D.nextRadio = 10 + D.rng() * 12;
    D.nextCall = P.call[0] ? P.call[0] * (0.6 + D.rng() * 0.6) : Infinity;
    D.nextRaid = P.raid[0] ? P.raid[0] * (0.6 + D.rng() * 0.6) : Infinity;
    D.nextConvoy = P.convoy[0] ? P.convoy[0] * (0.6 + D.rng() * 0.6) : Infinity;
    D.nextPatrol = 140;
    if (D.rng.chance(0.7)) {
      D.push('ambient', 'BAND', 'Copper Mesa relay is up. Anything on three, say again.');
    }
    return D;
  };

  /* ---------- picking a place ---------- */
  /* A call needs a place with a reason to be called from. Prefer the
     template's preferred POI types, then fall back to anything that is
     not where the player is standing. */
  function pickPoi(rng, world, p, types, minD, maxD) {
    const pois = world.pois || [];
    if (!pois.length) return null;
    const px = p ? p.x : 0, py = p ? p.y : 0;
    let pool = pois;
    if (types && types.length) {
      const typed = pois.filter((q) => types.indexOf(q.type) >= 0);
      if (typed.length) pool = typed;
    }
    const scored = [];
    for (const q of pool) {
      const d = VG.dist(px, py, q.x * VG.TILE, q.y * VG.TILE);
      if (minD !== undefined && d < minD) continue;
      if (maxD !== undefined && d > maxD) continue;
      scored.push({ q: q, d: d });
    }
    if (!scored.length) {
      for (const q of pool) scored.push({ q: q, d: VG.dist(px, py, q.x * VG.TILE, q.y * VG.TILE) });
    }
    if (!scored.length) return null;
    /* not the nearest one — spread the calls out around the map */
    scored.sort((a, b) => b.d - a.d);
    const take = scored.slice(0, Math.max(1, Math.min(6, scored.length)));
    return rng.pick(take).q;
  }

  /* ---------- radio ambience ---------- */
  function pickLine(rng, list) {
    if (!list || !list.length) return null;
    return rng.pick(list);
  }

  VG.DYN.radioLine = function () {
    const rng = VG.DYN.rng;
    const C = content();
    const night = isNight();
    const wk = (VG.weather && VG.weather.kind) || 'clear';
    const buckets = [];
    if (night && C.radio.night && C.radio.night.length) buckets.push(C.radio.night);
    if (C.radio.weather && C.radio.weather[wk] && C.radio.weather[wk].length) buckets.push(C.radio.weather[wk]);
    if (C.radio.ambient && C.radio.ambient.length) buckets.push(C.radio.ambient);
    if (!buckets.length) return null;
    /* the day bucket is the common case, so weight it higher */
    for (let i = 0; i < 3; i++) buckets.push(C.radio.ambient || []);
    const pool = [];
    for (const b of buckets) for (const l of b) pool.push(l);
    if (!pool.length) return null;
    let line = rng.pick(pool);
    /* do not repeat the last thing you heard */
    let guard = 0;
    while (line && line.text === VG.DYN.lastRadioKind && guard < 6) {
      line = rng.pick(pool);
      guard++;
    }
    if (line) VG.DYN.lastRadioKind = line.text;
    return line;
  };

  /* ---------- distress calls ---------- */
  VG.DYN.spawnCall = function (world, p) {
    const D = VG.DYN;
    const C = content();
    if (!C.calls.length) return null;
    const rng = D.rng;
    const tmpl = rng.pick(C.calls);
    const poi = pickPoi(rng, world, p, tmpl.poiTypes, 500, 3200);
    if (!poi) return null;
    const maxLife = tmpl.life || 420;
    const who = tmpl.who || (C.survivors.length ? rng.pick(C.survivors) : 'SURVIVOR');
    const call = {
      id: 'call' + (D.callSeq++),
      who: who,
      text: tmpl.text,
      poi: poi,
      x: poi.x * VG.TILE,
      y: poi.y * VG.TILE,
      life: maxLife,
      maxLife: maxLife,
      hostile: !!tmpl.hostile,
      reward: tmpl.reward || null,
      caseId: tmpl.caseId || null,
      clueHint: tmpl.clue || null,
      answered: false
    };
    D.calls.push(call);
    D.stats.calls++;
    if (D.calls.length > 3) D.calls.shift();
    D.push('call', who, call.text, { callId: call.id });
    if (D.nextCall !== Infinity) {
      const P = prof();
      D.nextCall = P.call[0] + rng() * (P.call[1] - P.call[0]);
    }
    return call;
  };

  /* the call you are standing next to, if any */
  VG.DYN.nearestCall = function (p, reach) {
    const D = VG.DYN;
    let best = null, bd = reach || 110;
    for (const c of D.calls) {
      if (c.answered) continue;
      const d = VG.dist(p.x, p.y, c.x, c.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  };

  /* ---------- reward ---------- */
  function giveItems(p, items, mult) {
    const got = [];
    for (const entry of (items || [])) {
      const id = entry[0], qty = entry[1] || 1;
      /* a ghost id here would eat the reward and produce nothing, so the
         catalog is checked before anything is handed over */
      if (!VG.item(id)) continue;
      const n = Math.max(1, Math.round(qty * mult));
      VG.invAdd(p, id, n);
      const it = VG.item(id);
      got.push((it ? it.name : id) + (n > 1 ? ' x' + n : ''));
    }
    return got;
  }

  /* A survivor's testimony accelerates a case you have already opened.
     It never opens a new one: the mystery stays the spine of the game,
     the living world just shortens the walk. */
  function giveTestimony(p, call) {
    if (!call.caseId || !VG.allCases) return null;
    const cases = VG.allCases();
    const cse = cases.find((c) => c.id === call.caseId);
    if (!cse) return null;
    const started = (p.foundClues[cse.id] || []).length > 0;
    if (!started) return null;
    const candidates = (cse.clues || []).filter((cl) => cl.fact && !p.knownFacts[cl.fact]);
    if (!candidates.length) return null;
    let cl = null;
    if (call.clueHint) cl = candidates.find((c) => c.id === call.clueHint) || null;
    if (!cl) cl = candidates[candidates.length - 1];
    if (!cl) return null;
    p.readClues[cl.id] = true;
    p.knownFacts[cl.fact] = cse.id;
    p.foundClues[cse.id] = p.foundClues[cse.id] || [];
    if (p.foundClues[cse.id].indexOf(cl.id) < 0) p.foundClues[cse.id].push(cl.id);
    return { case: cse, clue: cl };
  }

  VG.DYN.answerCall = function (call, p, world) {
    if (!call || call.answered) return false;
    const D = VG.DYN;
    call.answered = true;
    const P = prof();
    const mult = P.reward;

    if (call.hostile) {
      D.lured++;
      D.stats.lured++;
      D.heat = Math.min(100, D.heat + 4 * P.heat);
      if (VG.log) VG.log('The voice was a loop. Something moves behind you.', 'bad');
      D.push('system', 'BAND', 'No further traffic from ' + call.who + '.');
      spawnHostiles(world, call.x, call.y, 3, 'rusted');
      removeCall(D, call);
      return false;
    }

    D.helped++;
    D.stats.answered++;
    const got = giveItems(p, call.reward && call.reward.items, mult);
    const xp = Math.round((call.reward && call.reward.xp ? call.reward.xp : 40) * mult);
    p.xp += xp;
    p.level = 1 + Math.floor(p.xp / 250);
    if (call.reward && call.reward.rep) {
      for (const k in call.reward.rep) p.rep[k] = (p.rep[k] || 0) + call.reward.rep[k];
    }
    if (VG.log) {
      VG.log(call.who + ' is alive. ' + (got.length ? got.join(', ') + '.' : 'They have nothing to give but the time.'), 'good');
      VG.log('Survey XP +' + xp + '.', '');
    }
    const t = giveTestimony(p, call);
    if (t) {
      if (VG.log) VG.log('TESTIMONY — ' + t.clue.name + ': ' + t.clue.text, 'clue');
      if (VG.Audio && VG.Audio.clue) VG.Audio.clue();
    }
    if (VG.Help) VG.Help.mark('helped');
    D.heat = Math.max(0, D.heat - 3 * P.heat);
    D.push('call', call.who, 'I am still here. Thank you. Keep the lights off.', { callId: call.id });
    removeCall(D, calls_contains(call));
    return true;
  };

  function calls_contains(c) { return c; }

  function removeCall(D, call) {
    const i = D.calls.indexOf(call);
    if (i >= 0) D.calls.splice(i, 1);
  }

  /* ---------- hostiles ---------- */
  function spawnHostiles(world, wx, wy, n, kind) {
    if (!world || !world.enemies) return [];
    const made = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * VG.TAU + Math.random() * 0.6;
      const r = 90 + Math.random() * 140;
      const tx = (wx + Math.cos(a) * r) / VG.TILE;
      const ty = (wy + Math.sin(a) * r) / VG.TILE;
      if (world.inb && !world.inb(Math.floor(tx), Math.floor(ty))) continue;
      const k = kind || 'rusted';
      const id = 'raid' + VG.DYN.raidSeq + '_' + i;
      VG.DYN.raidSeq++;
      const e = {
        id: id, x: tx, y: ty, kind: k,
        hp: k === 'warden' ? 120 : k === 'drover' ? 46 : 70,
        dmg: k === 'warden' ? 17 : k === 'drover' ? 9 : 12,
        r: 11, aggro: 0, dead: false, raid: true,
        home: { x: tx, y: ty }, loot: null
      };
      world.enemies.push(e);
      made.push(e);
    }
    return made;
  }
  VG.DYN.spawnHostiles = spawnHostiles;

  /* ---------- raids ---------- */
  VG.DYN.spawnRaid = function (world, p) {
    const D = VG.DYN;
    const C = content();
    if (!C.raids.length) return null;
    const rng = D.rng;
    const tmpl = rng.pick(C.raids);
    const poi = pickPoi(rng, world, p, tmpl.poiTypes, 400, 4200);
    if (!poi) return null;
    const raid = {
      id: 'raid' + (D.raidSeq++),
      name: tmpl.name || (poi.name + ' raid'),
      text: tmpl.text || 'They are coming.',
      poi: poi,
      x: poi.x * VG.TILE,
      y: poi.y * VG.TILE,
      size: tmpl.size || 4,
      warn: tmpl.warn || 55,
      life: (tmpl.warn || 55) + (tmpl.fight || 320),
      spawned: false,
      done: false,
      rep: tmpl.rep || null
    };
    D.raids.push(raid);
    D.raidsSeen++;
    D.stats.raids++;
    D.push('warn', 'BAND', raid.name + '. ' + raid.text, { raidId: raid.id });
    const P = prof();
    D.nextRaid = P.raid[0] + rng() * (P.raid[1] - P.raid[0]);
    return raid;
  };

  /* ---------- convoys ---------- */
  VG.DYN.spawnConvoy = function (world, p) {
    const D = VG.DYN;
    const C = content();
    if (!C.convoys.length) return null;
    const rng = D.rng;
    const tmpl = rng.pick(C.convoys);
    const w = world;
    const from = tmpl.from === 'west' ? { x: 3, y: Math.round(w.H * 0.88) }
      : tmpl.from === 'north' ? { x: Math.round(w.W * 0.94), y: 4 }
        : { x: Math.round(w.W * 0.5), y: 4 };
    const yard = w.yard || { x: w.W >> 1, y: w.H >> 1 };
    const town = w.town || yard;
    const mine = w.mine || yard;
    const to = tmpl.to === 'yard'
      ? { x: yard.x, y: yard.y }
      : tmpl.to === 'town' ? { x: town.x, y: town.y }
        : { x: mine.x, y: mine.y };
    const conv = {
      id: 'convoy' + (D.convoySeq++),
      name: tmpl.name || 'Convoy',
      text: tmpl.text || '',
      from: from, to: to,
      t: 0,
      dur: tmpl.duration || 300,
      trucks: tmpl.trucks || 3,
      alerted: false,
      done: false
    };
    D.convoys.push(conv);
    D.convoysSeen++;
    D.stats.convoys++;
    D.push('system', 'BAND', conv.name + ' is on the road. ' + conv.text, { convoyId: conv.id });
    const P = prof();
    D.nextConvoy = P.convoy[0] + rng() * (P.convoy[1] - P.convoy[0]);
    return conv;
  };

  VG.DYN.convoyPos = function (conv) {
    const t = Math.max(0, Math.min(1, conv.t / conv.dur));
    return {
      x: VG.lerp(conv.from.x, conv.to.x, t) * VG.TILE,
      y: VG.lerp(conv.from.y, conv.to.y, t) * VG.TILE,
      t: t
    };
  };

  /* ---------- pressure ---------- */
  VG.DYN.addHeat = function (n) {
    const D = VG.DYN;
    const P = prof();
    if (!P.heat) return;
    const before = D.heat;
    D.heat = Math.max(0, Math.min(100, D.heat + n * P.heat));
    const band = (v) => (v >= 75 ? 3 : v >= 45 ? 2 : v >= 20 ? 1 : 0);
    if (band(D.heat) > band(before)) {
      const msgs = [
        'Someone has written your tag into a ledger. You do not know whose.',
        'You have been counted twice this week. The Ledger is asking who you are.',
        'A warband is moving toward your position. The band is carrying names.',
        'They know your name. The band has stopped being a band.'
      ];
      const b = band(D.heat);
      if (b > 0) D.push('warn', 'BAND', msgs[b - 1]);
    }
  };

  VG.DYN.threat = function () {
    const D = VG.DYN;
    const h = D.heat;
    let level = 0, label = 'Unwatched', detail = 'Nobody is looking for you.', color = '#8a8578';
    if (h >= 20) { level = 1; label = 'Noticed'; detail = 'Your tag is on a list somewhere.'; color = '#cfcabb'; }
    if (h >= 45) { level = 2; label = 'Hunted'; detail = 'Something is being sent to find you.'; color = '#d09a4a'; }
    if (h >= 75) { level = 3; label = 'Marked'; detail = 'They are coming, and they have your name.'; color = '#d06a4a'; }
    return { level: level, label: label, detail: detail, color: color, heat: h };
  };

  /* ---------- markers for the map ---------- */
  VG.DYN.markers = function (world) {
    const D = VG.DYN;
    const out = [];
    for (const c of D.calls) {
      if (c.answered) continue;
      out.push({ x: c.x, y: c.y, kind: 'call', label: c.who, sub: 'distress call' });
    }
    for (const r of D.raids) {
      if (r.done) continue;
      out.push({ x: r.x, y: r.y, kind: 'raid', label: r.name, sub: r.spawned ? 'under attack' : 'incoming' });
    }
    for (const v of D.convoys) {
      if (v.done) continue;
      const pos = VG.DYN.convoyPos(v);
      out.push({ x: pos.x, y: pos.y, kind: 'convoy', label: v.name, sub: 'on the road' });
    }
    return out;
  };

  /* ---------- the update ---------- */
  VG.DYN.update = function (dt, p, world) {
    const D = VG.DYN;
    if (!D.rng) D.init(world, world ? world.seed : 1);
    const P = prof();
    const rng = D.rng;

    /* --- radio --- */
    D.nextRadio -= dt;
    if (D.nextRadio <= 0) {
      const line = VG.DYN.radioLine();
      if (line) { D.push(line.kind || 'ambient', line.who || 'BAND', line.text); D.stats.radio++; }
      D.nextRadio = P.radio[0] + rng() * (P.radio[1] - P.radio[0]);
    }

    /* --- calls --- */
    D.nextCall -= dt;
    if (D.nextCall <= 0 && P.call[0]) {
      VG.DYN.spawnCall(world, p);
      if (D.nextCall === Infinity) D.nextCall = P.call[0];
    }
    for (let i = D.calls.length - 1; i >= 0; i--) {
      const c = D.calls[i];
      c.life -= dt;
      if (c.life <= 0) {
        if (VG.log) VG.log('The carrier for ' + c.who + ' has gone quiet.', 'bad');
        D.push('system', 'BAND', 'No further traffic from ' + c.who + '.');
        D.calls.splice(i, 1);
      }
    }

    /* --- raids --- */
    D.nextRaid -= dt;
    if (D.nextRaid <= 0 && P.raid[0]) {
      /* the rusted come out after dark. In daylight the timer rolls over
         again, so the first raid of the night lands soon after dusk. */
      if (isNight()) {
        VG.DYN.spawnRaid(world, p);
        if (D.nextRaid === Infinity) D.nextRaid = P.raid[0];
      } else {
        D.nextRaid = 20;
      }
    }
    for (let i = D.raids.length - 1; i >= 0; i--) {
      const r = D.raids[i];
      r.life -= dt;
      if (!r.spawned && r.life <= r.warn) {
        r.spawned = true;
        const made = spawnHostiles(world, r.x, r.y, r.size, 'rusted');
        if (VG.log) VG.log('Raiders hit ' + r.poi.name + '. ' + made.length + ' of them.', 'bad');
        D.push('raid', 'BAND', r.poi.name + ' is under attack. ' + made.length + ' hostiles.', { raidId: r.id });
        if (VG.Audio && VG.Audio.hurt) VG.Audio.hurt();
      }
      if (r.life <= 0) {
        if (!r.done) {
          r.done = true;
          D.push('system', 'BAND', 'The shooting at ' + r.poi.name + ' has stopped.');
        }
        D.raids.splice(i, 1);
      }
    }

    /* --- convoys --- */
    D.nextConvoy -= dt;
    if (D.nextConvoy <= 0 && P.convoy[0]) {
      VG.DYN.spawnConvoy(world, p);
      if (D.nextConvoy === Infinity) D.nextConvoy = P.convoy[0];
    }
    for (let i = D.convoys.length - 1; i >= 0; i--) {
      const v = D.convoys[i];
      v.t += dt;
      if (v.t >= v.dur) {
        D.push('system', 'BAND', v.name + ' has made the yard.');
        D.convoys.splice(i, 1);
      }
    }

    /* --- pressure --- */
    if (P.heat) {
      D.heat = Math.max(0, D.heat - 0.045 * dt * P.heat);
      D.nextPatrol -= dt;
      if (D.heat >= 45 && D.nextPatrol <= 0 && p) {
        D.nextPatrol = 95 - Math.min(45, D.heat * 0.35);
        const a = rng() * VG.TAU;
        const r = 760 + rng() * 320;
        const wx = p.x + Math.cos(a) * r, wy = p.y + Math.sin(a) * r;
        const n = D.heat >= 75 ? 5 : D.heat >= 60 ? 4 : 3;
        const made = spawnHostiles(world, wx, wy, n, 'rusted');
        if (made.length && VG.log) VG.log('Movement on the flats. Something is looking for you.', 'bad');
        D.push('warn', 'BAND', 'Movement on the flats. They are working a grid.');
      }
    } else D.nextPatrol = 120;

    /* --- raid hostiles keep a longer leash than the ambient ones --- */
    if (world && world.enemies && p) {
      for (const e of world.enemies) {
        if (e.dead || !e.raid) continue;
        const d = VG.dist(p.x, p.y, e.x * VG.TILE, e.y * VG.TILE);
        if (d < 620) e.aggro = 3.0;
      }
    }
  };

  /* ---------- save / load ---------- */
  VG.DYN.save = function () {
    const D = VG.DYN;
    return {
      intensity: D.intensity,
      heat: D.heat,
      helped: D.helped,
      lured: D.lured,
      raidsSeen: D.raidsSeen,
      convoysSeen: D.convoysSeen
    };
  };

  VG.DYN.load = function (d) {
    if (!d) return;
    const D = VG.DYN;
    if (PROFILES[d.intensity]) D.intensity = d.intensity;
    if (typeof d.heat === 'number') D.heat = Math.max(0, Math.min(100, d.heat));
    if (typeof d.helped === 'number') D.helped = d.helped;
    if (typeof d.lured === 'number') D.lured = d.lured;
    if (typeof d.raidsSeen === 'number') D.raidsSeen = d.raidsSeen;
    if (typeof d.convoysSeen === 'number') D.convoysSeen = d.convoysSeen;
  };
})(window.VG);
