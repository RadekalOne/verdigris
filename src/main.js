/* VERDIGRIS — main loop, input, interaction */
window.VG = window.VG || {};
(function (VG) {
  'use strict';

  /* A survey starts at noon. The number that used to be here was 9 * 3600,
     which was meant as nine in the morning and is not: the clock face is
     offset from the raw counter (see VG.hourOfDay), so a new survey began at
     17:09 and was in the dark seven minutes later, before the player had
     learned to walk. Noon gives twenty minutes of daylight to learn in and
     still brings the night inside one sitting. */
  VG.START_TIME = 13824;
  VG.state = { time: VG.START_TIME, bullets: [], flash: 0, flare: 0, showCrosshair: true, paused: false, anim: 0, hits: [], swing: null, fireCd: 0 };

  /* How fast the sky turns. At one second per second a full day took
     twenty-four hours of real time, which meant the light never changed
     during a session — the torch, the lit windows and the night work were
     all invisible unless you forced the clock by hand. A full in-game day
     now takes an hour, so a survey runs from morning into dusk and then
     into the dark, which is where the rusted come out. */
  VG.TIME_SCALE = 24;
  const input = { up: false, down: false, left: false, right: false };
  let mouse = { x: 0, y: 0, world: { x: 0, y: 0 } };
  /* The renderer needs to know where the mouse is: the reticle is drawn at
     the cursor, because the cursor is where the round goes. */
  VG.mouse = mouse;
  let last = 0;
  /* holding the button keeps firing, at the weapon's rate of fire */
  let firing = false;
  let coachNext = 0;
  let canvas;

  /* ---------- interaction target ---------- */

  /* wells and water towers are worth standing a little further from */
  VG.isWaterPoi = function (poi) { return poi.type === 'well' || poi.type === 'watertower'; };
  VG.poiReach = function (poi) { return poi.radius + (VG.isWaterPoi(poi) ? 26 : 0); };

  /* The tag a faction post wears in the world prompt. Standing at one of
     these is the only place a contract can be handed in, so the prompt says
     so rather than leaving the player to work it out. */
  const postTag = (poi) => {
    const fid = VG.postFactionOf ? VG.postFactionOf(poi) : null;
    if (!fid) return '';
    const f = (VG.FACTIONS || []).find((x) => x.id === fid);
    return ' <span class="muted">· ' + (f ? f.name : 'Faction') + ' post · press B for their sheet</span>';
  };

  /* the nearest well or water tower within reach, if there is one */
  VG.nearestWater = function (p, world) {
    let best = null, bd = 1e9;
    for (const poi of world.pois) {
      if (!VG.isWaterPoi(poi)) continue;
      const d = VG.dist(p.x, p.y, poi.x * VG.TILE, poi.y * VG.TILE);
      if (d < VG.poiReach(poi) && d < bd) { bd = d; best = poi; }
    }
    return best;
  };

  /* the closest well or water tower anywhere on the flats, with a bearing, so
     a thirsty player can be pointed at one instead of wandering */
  VG.closestWater = function (p, world) {
    let best = null, bd = Infinity;
    for (const poi of world.pois) {
      if (!VG.isWaterPoi(poi)) continue;
      const d = VG.dist(p.x, p.y, poi.x * VG.TILE, poi.y * VG.TILE);
      if (d < bd) { bd = d; best = poi; }
    }
    if (!best) return null;
    const dx = best.x * VG.TILE - p.x, dy = best.y * VG.TILE - p.y;
    return { poi: best, dist: bd, dir: VG.compassDir(dx, dy) };
  };

  /* The closest building that kept provisions, with a bearing. Food needs a
     route as much as water does: a hungry player should be pointed at the
     diner, not left to wander the flats hoping to find a tin. */
  VG.closestFood = function (p, world) {
    let best = null, bd = Infinity;
    for (const poi of world.pois) {
      if (!VG.isFoodPoi(poi)) continue;
      const d = VG.dist(p.x, p.y, poi.x * VG.TILE, poi.y * VG.TILE);
      if (d < bd) { bd = d; best = poi; }
    }
    if (!best) return null;
    const dx = best.x * VG.TILE - p.x, dy = best.y * VG.TILE - p.y;
    return { poi: best, dist: bd, dir: VG.compassDir(dx, dy), note: VG.foodNote(best) };
  };

  VG.findTarget = function (p, world) {
    /* inside a building the flats do not exist: only the room does */
    if (VG.INT && VG.INT.active) return VG.INT.findTarget(p);
    let best = null, bd = 62;
    for (const c of world.containers) {
      /* an emptied crate is skipped - unless the Office has filed evidence
         in it since, which is exactly the crate the player has to reach */
      if (!VG.crateSearchable(c, p)) continue;
      /* a crate inside a building is not reachable from the yard */
      if (c.inside) continue;
      const d = VG.dist(p.x, p.y, c.x * VG.TILE + VG.TILE / 2, c.y * VG.TILE + VG.TILE / 2);
      if (d < bd) { bd = d; best = { kind: 'container', obj: c, dist: d }; }
    }
    /* a distress call outranks a crate when it is the closer of the two —
       a voice on the band is time-limited, a box is not */
    if (VG.DYN) {
      const call = VG.DYN.nearestCall(p, 120);
      if (call) {
        const d = VG.dist(p.x, p.y, call.x, call.y);
        if (!best || d < best.dist) best = { kind: 'call', obj: call, dist: d };
      }
    }
    for (const poi of world.pois) {
      const d = VG.dist(p.x, p.y, poi.x * VG.TILE, poi.y * VG.TILE);
      if (d < VG.poiReach(poi)) {
        if (!best || d < best.dist) best = { kind: 'poi', obj: poi, dist: d };
      }
    }
    /* a building you can walk into beats the generic "survey this" prompt.
       The lock keeps the door from grabbing you back the instant you step
       out of one. */
    if (VG.INT && VG.INT.doorLock <= 0) {
      let door = null, dd = VG.INT.DOOR_REACH;
      for (const poi of world.pois) {
        if (!VG.INT.has(poi)) continue;
        const dw = VG.INT.doorWorld(poi);
        const d = VG.dist(p.x, p.y, dw.x, dw.y);
        if (d < dd) { dd = d; door = poi; }
      }
      if (door && (!best || best.kind === 'poi' || dd < best.dist)) {
        best = { kind: 'door', obj: door, dist: dd };
      }
    }
    return best;
  };

  /* draw water from a well or a water tower: free hydration, a little effort,
     and well water costs you a little dose */
  VG.drinkWater = function (poi) {
    const p = VG.Player;
    if (!p) return false;
    if (p.water >= 99) { VG.log('You are not thirsty.', ''); return false; }
    p.water = Math.min(100, p.water + 35);
    p.stam = Math.max(0, p.stam - 4);
    if (poi.type === 'well') {
      VG.log('You work the pump handle. The water comes up cold and tastes of iron.', 'good');
      p.dose = VG.clamp(p.dose + 3, 0, 100);
      VG.log('Rusty water. Dose +3.', 'bad');
    } else {
      VG.log('You climb the ladder and drink from the tank. Flat, and faintly of chlorine.', 'good');
    }
    VG.log('Water ' + Math.round(p.water) + '%.', 'good');
    if (VG.Audio) VG.Audio.pickup();
    return true;
  };

  VG.openContainer = function (c, p) {
    /* An emptied crate cannot be searched again - UNLESS the Office has since
       filed evidence in it. It has to be allowed: the crate a file points at
       is chosen by the seed and not by what the player happens to have done
       already, so the evidence can land in a crate the player has taken. The
       contents are not given back a second time; only the evidence is new.
       Re-arming the crate instead would hand out the same copper twice. */
    const cl = c.clueId ? VG.findClue(c.clueId) : null;
    const holdsClue = !!(cl && !(p.readClues && p.readClues[cl.id]));
    if (c.opened && !holdsClue) return;
    const emptied = c.opened;
    /* The first time a crate is searched, its contents are decided and kept.
       A crate that did not fit in the pack stays worth searching, so the
       loot has to be the same loot the second time. */
    const first = !emptied && !c.loot;
    if (emptied) c.loot = [];
    if (first) {
      p.containersOpened++;
      VG.addXp(p, VG.XP.crate, true);
      if (VG.DYN) VG.DYN.addHeat(0.18);
      if (VG.Audio) VG.Audio.open();
      if (VG.Help) VG.Help.mark('searched');
      /* The seed must be different for every crate, including the ones that
         have moved indoors. Two crates in the same building used to share a
         tile position and therefore shared a seed, which handed out the same
         loot twice. */
      const seedIn = c.inside ? ((c.ix * 2654435761) ^ (c.iy * 40503) ^ (c.id.charCodeAt(1) * 2246822519)) : 0;
      const rng = VG.makeRng((VG.World.seed ^ (c.x * 73856093) ^ (c.y * 19349663) ^ seedIn) >>> 0);
      // surprise find
      if (rng.chance(VG.SURPRISE.chance(c.tier))) {
        const s = VG.SURPRISE.pick(rng);
        if (s) c.surprise = { id: s.id, name: s.name, desc: s.desc };
      }
      c.loot = VG.rollContainerLoot(c, rng);
    }

    /* take what fits. What does not fit stays in the crate, because a pack
       you cannot empty is not a limit, it is a wall - and losing loot to a
       full pack is worse than having to come back for it. */
    const res = VG.takeLoot(p, c.loot);
    c.loot = res.left;
    let lines = [];
    let best = 0;
    for (const l of res.taken) {
      const it = VG.item(l.id);
      lines.push((it ? it.name : l.id) + (l.qty > 1 ? ' x' + l.qty : ''));
      if (it && (it.rarity || 0) > best) best = it.rarity || 0;
      if (VG.FX) VG.FX.loot(l.id, l.qty);
    }
    if (c.surprise && VG.invCanFit(p, c.surprise.id, 1)) {
      VG.invAdd(p, c.surprise.id, 1);
      VG.log('SURPRISE FIND: ' + c.surprise.name + ' — ' + c.surprise.desc, 'clue');
      if (VG.Audio) VG.Audio.surprise();
      const sit = VG.item(c.surprise.id);
      if (sit && (sit.rarity || 0) > best) best = sit.rarity || 0;
      if (VG.FX) {
        VG.FX.loot(c.surprise.id, 1);
        VG.FX.banner('SURPRISE FIND', c.surprise.name, { sub: c.surprise.desc, color: (VG.RARITY_COLOR || [])[sit ? sit.rarity : 4] || '#e8b34a', hold: 2800 });
      }
      c.surprise = null;
    }
    if (VG.FX && !c.inside) VG.FX.crate(c.x * VG.TILE + VG.TILE / 2, c.y * VG.TILE + VG.TILE / 2, best);
    /* the good stuff is announced: a rare find that scrolls past in the log
       at the same size as a handful of cloth is a find the player misses */
    if (VG.FX && best >= 3 && first) {
      if (VG.Audio) VG.Audio.surprise();
      VG.FX.addShake(2);
    }
    if (lines.length) {
      VG.log('Searched: ' + lines.join(', '), 'good');
      if (VG.Audio) VG.Audio.pickup();
    }
    else if (emptied) {
      VG.log('The crate is picked clean, but a folder is wedged down the side.', 'good');
      if (VG.Audio) VG.Audio.pickup();
    }
    else VG.log('Nothing but dust.', '');

    if (res.left.length || c.surprise) {
      c.partial = true;
      VG.log('Your pack is full. ' + (res.left.length ? 'The rest is still in the crate.' : 'Something else is in there.'), 'bad');
    } else {
      c.opened = true;
    }

    if (c.clueId) {
      const cl = VG.findClue(c.clueId);
      if (cl && !p.readClues[cl.id]) {
        p.readClues[cl.id] = true;
        const cse = VG.allCases().find((x) => x.id === cl.caseId);
        p.knownFacts[cl.fact] = cl.caseId;
        p.foundClues[cl.caseId] = p.foundClues[cl.caseId] || [];
        if (p.foundClues[cl.caseId].indexOf(cl.id) < 0) p.foundClues[cl.caseId].push(cl.id);
        VG.log('EVIDENCE — ' + cl.name + ': ' + cl.text, 'clue');
        VG.addXp(p, VG.XP.clue, true);
        if (VG.FX) VG.FX.banner('EVIDENCE', cl.name, { sub: cse ? cse.title + ' · press J to read the file' : '', color: '#7fc4d8', hold: 2600 });
        if (VG.Audio) VG.Audio.clue();
        if (VG.Help) VG.Help.mark('read');
        if (cse) VG.log('Case file updated: ' + cse.title, 'clue');
      }
    }
  };

  VG.findClue = function (id) {
    for (const c of VG.allCases()) {
      for (const cl of (c.clues || [])) if (cl.id === id) return Object.assign({}, cl, { caseId: c.id });
    }
    return null;
  };

  /* ---------- conclusions ---------- */
  /* Only the file the Office is working can be closed. The files after it
     are sealed: their evidence is not in the world, and a conclusion filed
     on a sealed file would be a conclusion the Office never agreed to. */
  VG.canConclude = function (cse, p) {
    if (!VG.caseIsOpen(cse, p)) return null;
    for (const s of (cse.solutions || [])) {
      if ((p.solvedSolutions[cse.id] || []).indexOf(s.id) >= 0) continue;
      if ((s.requires || []).every((r) => p.knownFacts[r])) return s;
    }
    return null;
  };

  /* the standing and the goods a conclusion brings */
  VG.grantRewards = function (p, s) {
    if (!s) return;
    if (s.reward) {
      for (const k in (s.reward.rep || {})) p.rep[k] = (p.rep[k] || 0) + s.reward.rep[k];
      for (const it of (s.reward.items || [])) VG.invAdd(p, it, 1);
    }
  };

  /* File a conclusion. The player picks the reading that goes on the file.
     For a file with two conclusions that is a real choice, and it moves
     faction standing and the ending - the engine does not pick for them
     any more. */
  VG.fileConclusion = function (cse, solId, p) {
    p = p || VG.Player;
    const s = (cse.solutions || []).find((x) => x.id === solId);
    if (!s) { VG.log('That conclusion is not on this file.', 'bad'); return false; }
    if (!VG.caseIsOpen(cse, p)) { VG.log('That file is not open.', 'bad'); return false; }
    const ready = VG.conclusionOptions(cse, p).filter((o) => o.ready && o.sol.id === solId);
    if (!ready.length) {
      VG.log('The evidence does not support that conclusion yet.', 'bad');
      return false;
    }
    p.solvedSolutions[cse.id] = p.solvedSolutions[cse.id] || [];
    p.solvedSolutions[cse.id].push(s.id);
    if (VG.FX) VG.FX.banner('CASE CLOSED', cse.title, { sub: s.label, color: '#e8b34a', hold: 3600 });
    VG.addXp(p, VG.XP.caseClosed, true);
    if (VG.DYN) VG.DYN.addHeat(6);
    VG.log('CASE CLOSED: ' + cse.title, 'clue');
    if (VG.Audio) VG.Audio.close();
    if (VG.Help) VG.Help.mark('concluded');
    VG.grantRewards(p, s);
    if (cse.reward) {
      for (const k in (cse.reward.rep || {})) p.rep[k] = (p.rep[k] || 0) + cse.reward.rep[k];
      for (const it of (cse.reward.items || [])) VG.invAdd(p, it, 1);
    }
    VG.log(s.epilogue || '', 'clue');
    /* the closed file hands over the next one. The epilogue already says
       what comes next in the prose; this makes the engine agree with it -
       the next file opens and its evidence goes out into the flats, where
       it has to be found. */
    const next = VG.openCase(p);
    if (next && VG.World) {
      VG.placeClues(VG.World, next);
      if (VG.INT) VG.INT.prepare(VG.World);
      VG.log('FILE OPENED: ' + next.title, 'clue');
      if (VG.FX) VG.FX.banner('FILE OPENED', next.title, { sub: 'New evidence is out on the flats', color: '#c08ce0', hold: 3000 });
      const want = VG.caseWantedTypes(next, p).map((k) => VG.poiTypeName(k));
      if (want.length) {
        VG.log('The file needs a ' + want.join(', a ') + '. Go in and search it.', '');
      }
      /* and the Office says so when the file wants you in the yard */
      if (VG.yardWarning) {
        const warn = VG.yardWarning(next, p);
        if (warn) VG.log(warn, 'bad');
      }
    }
    const all = VG.allCases();
    const closed = all.filter((c) => (p.solvedSolutions[c.id] || []).length).length;
    if (closed === all.length) VG.showEndgame();
    VG.renderJournal();
    if (VG.autosave) VG.autosave();
    return true;
  };

  /* Reopen a closed file and file a different reading. An investigator who
     does not like their own conclusion may reopen the file - it costs two
     points of standing with the Ledger, and the reading being withdrawn is
     struck from the file along with the standing it bought. */
  VG.amendConclusion = function (cse, solId, p) {
    p = p || VG.Player;
    const s = (cse.solutions || []).find((x) => x.id === solId);
    if (!s) return false;
    const current = VG.filedConclusion(cse, p);
    if (!current || current === solId) return false;
    const filed = p.solvedSolutions[cse.id] || [];
    if (filed.indexOf(solId) >= 0) return false;
    if (!VG.canAmend(cse, p)) return false;
    const old = (cse.solutions || []).find((x) => x.id === current);
    if (old && old.reward) {
      /* the standing the withdrawn reading bought goes back, and so do the
         goods it paid in - as long as they are still in the pack. */
      if (old.reward.rep) {
        for (const k in old.reward.rep) p.rep[k] = (p.rep[k] || 0) - old.reward.rep[k];
      }
      for (const it of (old.reward.items || [])) {
        if (VG.invCount(p, it) > 0) VG.invRemove(p, it, 1);
      }
    }
    p.rep.ledger = (p.rep.ledger || 0) - VG.AMEND_COST;
    filed.push(solId);
    p.solvedSolutions[cse.id] = filed;
    VG.grantRewards(p, s);
    VG.log('THE FILE IS REOPENED. The earlier reading is struck out.', 'clue');
    VG.log('Reopening the file cost ' + VG.AMEND_COST + ' points of standing with the Ledger. Standing is now ' + (p.rep.ledger || 0) + '.', '');
    VG.log(s.epilogue || '', 'clue');
    VG.renderJournal();
    return true;
  };

  /* kept for the old call shape: filing a conclusion the player has picked */
  VG.conclude = function (cse, s) {
    if (!s) return false;
    return VG.fileConclusion(cse, s.id, VG.Player);
  };
  VG.showEndgame = function () {
    const p = VG.Player;
    const body = document.getElementById('endgame-body');
    if (body) {
      const all = VG.allCases();
      let h = '<p style="color:#d6d1c3;line-height:1.8">Eight files closed. The Survey Office has its answer, and the answer is worse than a missing town.</p><p style="color:#8a8578;line-height:1.8;margin-top:10px">The people of Verdigris Flats are alive. They have been for forty-one years, in a place the maps do not show, because this office decided the world was better off not knowing — and then kept deciding, year after year, long after the men who made that decision were gone.</p>';
      for (const c of all) {
        /* the conclusion the investigator actually filed, not the first one in
           the data. The ending is theirs - it used to be decided by the order
           the cases happened to be written in. */
        const fid = VG.filedConclusion(c, p);
        const s = (c.solutions || []).find((x) => x.id === fid);
        if (!s) continue;
        h += '<div class="cardx" style="margin-top:10px"><h3>' + VG.htmlEscape(c.title) + '</h3><p>' + VG.htmlEscape(s.label) + '</p></div>';
      }
      /* what the choices bought, and what they cost */
      h += '<div class="cardx" style="margin-top:10px"><h3>Standing</h3><p>' +
        'The Ledger ' + (p.rep.ledger || 0) + ' · The Choir ' + (p.rep.choir || 0) +
        ' · Free Line ' + (p.rep.free_line || 0) + '</p></div>';
      const refused = Object.keys(p.rejectedTheories || {}).reduce((a, k) => a + (p.rejectedTheories[k] || 0), 0);
      if (refused) {
        h += '<p class="muted" style="margin-top:10px">The file carries ' + refused +
          (refused === 1 ? ' rejected theory' : ' rejected theories') + '. The Office does not forget, but it has what it came for.</p>';
      }
      h += '<div style="height:14px"></div><div class="meta">Survey Office — Field Report ' + VG.nowStamp() + '</div>';
      body.innerHTML = h;
    }
    VG.showPanel('endgame');
  };

  /* ---------- combat ---------- */
  /* An empty gun is still a lump of iron. Clicking with nothing in it used
     to do nothing at all but print a line - at the moment the player most
     needed the click to do something. It is a poor club, but it is a club. */
  VG.DRY = { dmg: 9, range: 46, cd: 0.5 };
  /* how much wider than its body a thing is to a round */
  VG.HIT_PAD = 6;
  let dryTold = 0;

  /* Everything that happens to a thing when it is hit. A hit stops it for a
     moment and shoves it back, and a hit during the windup breaks the lunge
     - so shooting something that is about to jump you is the right answer,
     not a wasted round. A Warden is heavier: it barely slows, and its lunge
     cannot be broken. */
  VG.hitEnemy = function (e, dmg, ang, p, push) {
    if (!e || e.dead) return;
    e.hp -= dmg; e.flash = 0.16;
    const heavy = e.kind === 'warden';
    e.stun = Math.max(e.stun || 0, heavy ? 0.12 : 0.3);
    const k = (push || 8) * (heavy ? 0.4 : 1);
    e.x += Math.cos(ang) * k / VG.TILE;
    e.y += Math.sin(ang) * k / VG.TILE;
    if (!heavy && e.windup > 0) { e.windup = 0; e.lungeCd = 1.2; }
    e.alert = 0;
    e.aggro = Math.max(e.aggro || 0, 2.2);
    if (e.hp <= 0) VG.killEnemy(e, p);
  };

  VG.fire = function (p, world) {
    if (VG.state.fireCd > 0) return;
    const w = VG.playerWeapon(p);
    let range = VG.attackRange(p);
    /* a weapon is fired or swung, not chosen by an arbitrary reach number */
    let ranged = VG.isRangedWeapon(w);
    let dry = false;
    if (w && w.ammo && ranged && (p.ammo[w.ammo] || 0) <= 0) {
      dry = true; ranged = false; range = VG.DRY.range;
      const nowT = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
      if (!dryTold || nowT - dryTold > 5000) {
        dryTold = nowT || 1;
        VG.log('Out of ' + (VG.item(w.ammo) ? VG.item(w.ammo).name : 'ammunition') +
          '. You swing the empty ' + w.name + '. Press K to make rounds, or switch weapon with the wheel.', 'bad');
      }
    }
    if (VG.Audio) { if (dry) { if (VG.Audio.click) VG.Audio.click(); } else VG.Audio.shot(); }
    if (ranged && w && w.ammo) p.ammo[w.ammo]--;
    VG.state.fireCd = dry ? VG.DRY.cd : VG.attackCooldown(p);
    /* The round goes where the reticle is. There is no spread; the one
       thing done for the player is the lead on something that is moving
       (VG.assistTarget), and that can be switched off. */
    let ang = Math.atan2(mouse.world.y - p.y, mouse.world.x - p.x);
    if (ranged && VG.assistTarget) {
      const lock = VG.assistTarget(p, world, mouse.world, range, 760);
      if (lock) ang = lock.ang;
    }
    p.aim = ang;
    if (VG.Help) VG.Help.mark('fired');
    if (!ranged) {
      // melee swing
      const dmg = dry ? VG.DRY.dmg : VG.attackDamage(p);
      /* the swing is drawn: an invisible arc is a swing you cannot aim */
      VG.state.swing = { x: p.x, y: p.y, ang: ang, r: range, life: 0.22 };
      let hit = false;
      for (const e of world.enemies) {
        if (e.dead) continue;
        const d = VG.dist(p.x, p.y, e.x * VG.TILE, e.y * VG.TILE);
        if (d > range * 0.85) continue;
        const a = Math.atan2(e.y * VG.TILE - p.y, e.x * VG.TILE - p.x);
        let da = Math.abs(((a - ang + Math.PI * 3) % VG.TAU) - Math.PI);
        if (da > 1.1) continue;
        hit = true;
        VG.markHit(e.x * VG.TILE, e.y * VG.TILE, dmg);
        if (VG.FX) { VG.FX.impact(e.x * VG.TILE, e.y * VG.TILE, a + Math.PI); VG.FX.addShake(3.5); }
        VG.hitEnemy(e, dmg, a, p, 16);
      }
      if (hit) { if (VG.Audio) VG.Audio.hit(); VG.log('Strike for ' + Math.round(dmg) + '.', 'good'); }
      return;
    }
    /* a signal flare lights the ground around you for a while */
    if (w && w.ammo === 'ammo_flare') {
      VG.state.flare = 300;
      VG.log('The ground goes orange. You can see a long way.', 'good');
    }
    const sp = 760;
    /* the round lives exactly as long as the weapon's reach, so a marksman
       rifle outranges a revolver instead of both firing the same distance */
    const life = VG.clamp((w && w.stats.range ? w.stats.range : 220) / sp, 0.08, 1.2);
    if (VG.FX) {
      VG.FX.muzzle(p.x + Math.cos(ang) * 18, p.y + Math.sin(ang) * 18, ang);
      VG.FX.addShake(1.6 + Math.min(3, VG.attackDamage(p) / 22));
    }
    VG.state.bullets.push({
      x: p.x + Math.cos(ang) * 14, y: p.y + Math.sin(ang) * 14,
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: life, dmg: VG.attackDamage(p)
    });
    /* The shot is a noise. Whatever is close enough to hear it now knows
       where you are - so a fight can start with a shot instead of waiting
       for something to walk into you. */
    if (VG.shotAlert) VG.shotAlert(p, world, range);
  };

  /* A hit has to be visible. A round that connects leaves a mark where it
     landed and a number over it; without that, a shot and a miss look the
     same and the player cannot learn what their weapon does. */
  VG.markHit = function (x, y, dmg) {
    if (!VG.state.hits) VG.state.hits = [];
    VG.state.hits.push({ x: x, y: y, dmg: dmg, life: 0.75 });
    if (VG.state.hits.length > 24) VG.state.hits.shift();
  };

  VG.updateBullets = function (dt, p, world) {
    const bs = VG.state.bullets;
    if (VG.state.hits) {
      for (let i = VG.state.hits.length - 1; i >= 0; i--) {
        VG.state.hits[i].life -= dt;
        if (VG.state.hits[i].life <= 0) VG.state.hits.splice(i, 1);
      }
    }
    if (VG.state.swing) {
      VG.state.swing.life -= dt;
      if (VG.state.swing.life <= 0) VG.state.swing = null;
    }
    for (let i = bs.length - 1; i >= 0; i--) {
      const b = bs[i];
      /* A round covers 760 pixels a second, so at thirty frames a second it
         moves twenty-five pixels between checks - further than a target is
         wide, and it would pass straight through the thing you were aiming
         at. The bullet is swept along the segment it actually travelled this
         frame and the closest approach to the target is tested, so a hit is
         a hit at any frame rate. */
      const x0 = b.x, y0 = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let gone = b.life <= 0;
      const sx = b.x - x0, sy = b.y - y0;
      const slen2 = sx * sx + sy * sy;
      for (const e of world.enemies) {
        if (e.dead) continue;
        const ex = e.x * VG.TILE, ey = e.y * VG.TILE;
        let t = 0;
        if (slen2 > 0) {
          t = ((ex - x0) * sx + (ey - y0) * sy) / slen2;
          if (t < 0) t = 0; else if (t > 1) t = 1;
        }
        const cx = x0 + sx * t, cy = y0 + sy * t;
        if (VG.dist(cx, cy, ex, ey) < e.r + VG.HIT_PAD) {
          gone = true;
          VG.markHit(ex, ey, b.dmg);
          if (VG.FX) VG.FX.impact(cx, cy, Math.atan2(b.vy, b.vx));
          if (VG.Audio) VG.Audio.hit();
          VG.hitEnemy(e, b.dmg, Math.atan2(b.vy, b.vx), p, 8);
          break;
        }
      }
      if (gone) bs.splice(i, 1);
    }
  };

  VG.updateEnemies = function (dt, p, world) {
    /* how close you have to be before anything notices you - a silenced
       weapon does not carry the shot */
    const notice = VG.aggroRange(p);
    const fight = VG.fight ? VG.fight() : { dmg: 1, beat: 0 };
    for (const e of world.enemies) {
      if (e.dead) continue;
      /* how fast it is going, for the lead on a shot. Worked out from where
         it was last frame, so it is true whatever moved it. */
      if (dt > 0 && typeof e.px === 'number') {
        e.vx = (e.x - e.px) * VG.TILE / dt;
        e.vy = (e.y - e.py) * VG.TILE / dt;
      }
      e.px = e.x; e.py = e.y;
      /* the flash of a thing that has just been hit */
      if (e.flash > 0) e.flash -= dt;
      const ex = e.x * VG.TILE, ey = e.y * VG.TILE;
      const d = VG.dist(p.x, p.y, ex, ey);
      const wasCalm = !(e.aggro > 0);
      if (d < notice) e.aggro = 2.2;
      else e.aggro = Math.max(0, e.aggro - dt);
      /* The look. A thing that has just seen you stops and stares before it
         comes. That beat is the player's: it is when the gun comes up. */
      if (wasCalm && e.aggro > 0) {
        e.alert = fight.beat;
        if (VG.Audio && VG.Audio.click) VG.Audio.click();
      }
      if (e.aggro > 0 && e.stun > 0) {
        /* it has just been hit: it does nothing for a moment */
        e.stun -= dt;
      } else if (e.aggro > 0 && e.alert > 0) {
        e.alert -= dt;
      } else if (e.aggro > 0) {
        /* The lunge. A rusted used to walk at half the player's pace, which
           meant nothing on the flats could ever catch you and the survey
           was a walk in a park. They are faster than a walking player now,
           so you have to sprint, fight, or break the line of sight - and
           the lunge is the thing that makes sprinting necessary, because
           sprinting is not a thing you can do for four minutes.

           The windup is the whole point: the rusted stops, and the lane it
           will travel down is drawn on the ground, along the direction it
           was facing when it stopped. Walk out of the lane and it misses.
           A lunge you cannot dodge is not a threat, it is a tax. */
        if (e.windup > 0) {
          e.windup -= dt;
          if (e.windup <= 0) { e.lunge = VG.LUNGE.time; e.lungeT = 0; }
        } else if (e.lunge > 0) {
          e.lunge -= dt;
          /* lungeT counts the ground actually covered, so the lane the
             player was shown and the distance the Rusted travels are the
             same number. It used to be advanced twice per frame, which
             meant the lunge covered its whole lane in half the time it
             was telegraphed. */
          const step = Math.min(VG.LUNGE.speed * dt, Math.max(0, VG.LUNGE.dist - e.lungeT));
          e.lungeT += step;
          e.x += Math.cos(e.lungeAng) * step / VG.TILE;
          e.y += Math.sin(e.lungeAng) * step / VG.TILE;
          const ld = VG.dist(p.x, p.y, e.x * VG.TILE, e.y * VG.TILE);
          if (ld < e.r + p.r + 4 && p.lastDamage < performance.now() - 900) {
            VG.damagePlayer(p, e.dmg * fight.dmg, e.kind);
            VG.log('It lunges. Hit by a ' + e.kind + '.', 'bad');
          }
          if (e.lungeT >= VG.LUNGE.dist || e.lunge <= 0) { e.lunge = 0; e.lungeCd = VG.LUNGE.cd; }
        } else {
          const s = VG.enemySpeed(e.kind);
          const ux = (p.x - ex) / (d || 1), uy = (p.y - ey) / (d || 1);
          e.x += ux * s * dt / VG.TILE;
          e.y += uy * s * dt / VG.TILE;
          e.lungeCd = Math.max(0, (e.lungeCd || 0) - dt);
          if (d < VG.LUNGE.range && e.lungeCd <= 0 && p.lastDamage < performance.now() - 900) {
            e.windup = VG.LUNGE.windup;
            e.lungeAng = Math.atan2(p.y - ey, p.x - ex);
            e.lungeT = 0;
          }
          if (d < e.r + p.r + 6 && p.lastDamage < performance.now() - 900) {
            VG.damagePlayer(p, e.dmg * fight.dmg, e.kind);
            VG.log('Hit by a ' + e.kind + '.', 'bad');
          }
        }
      } else {
        /* a guard holds its post. It was put on a building because that
           building holds the evidence the player has to go and find, and a
           guard that wandered off into the desert would be no guard at all. */
        const home = e.guardPoi ? e.guardHome : e.home;
        if (Math.random() < 0.004) {
          e.wx = (Math.random() - 0.5) * 0.8;
          e.wy = (Math.random() - 0.5) * 0.8;
        }
        const speed = e.guardPoi ? 10 : 24;
        e.x += (e.wx || 0) * speed * dt / VG.TILE;
        e.y += (e.wy || 0) * speed * dt / VG.TILE;
        const leash = e.guardPoi ? 5.5 : 6;
        if (VG.dist(e.x, e.y, home.x, home.y) > leash) { e.x = home.x; e.y = home.y; }
      }
    }
  };

  /* ---------- what they leave behind ---------- */
  /* The economy runs on scrap, and nothing on the flats was a source of
     it. Every contract wants copper, ceramic, cloth or gear, and every
     one of them had to be found in a crate. The things that walk around
     the flats are made of the same stuff the crates are made of, and a
     survey that goes out on the flats should come back with something. */
  /* How many stacks a kill leaves, by kind. This used to be one or two for
     the Rusted and the Drover, and a third of all Rusted kills came away
     with a single unit - a fight you won and a pack that had nothing in it.
     Two is the floor now: you always come back with something. The Rusted and
     the Drover leave exactly two stacks, which puts them at about three and a
     half units a kill; the Warden keeps its two or three, because a Warden is
     a fight and should pay like one. This is the one knob for the whole
     table; the ranges below are the shape of it. */
  VG.DROP_STACKS = { rusted: [2, 2], drover: [2, 2], warden: [2, 3] };

  /* Copper carries the economy - the contracts are priced in it - so its
     share is set deliberately rather than falling out of splitting the table
     evenly. At [1,4] a Rusted hands over about 1.25 copper a kill, which
     makes eight copper about six kills. The other materials are spread so
     that no one of them is the only thing worth picking up. */
  VG.ENEMY_DROP = {
    rusted: [['scrap_copper', 1, 4], ['scrap_cloth', 1, 2], ['scrap_ceramic', 1, 2], ['scrap_gear', 1, 2], ['ammo_slug', 2, 4]],
    drover: [['scrap_gear', 1, 2], ['scrap_copper', 1, 4], ['scrap_glass', 1, 2], ['scrap_ceramic', 1, 2], ['ammo_slug', 2, 4]],
    warden: [['scrap_copper', 2, 4], ['scrap_gear', 1, 2], ['ammo_slug', 2, 6]]
  };

  VG.enemyDrop = function (e) {
    const table = VG.ENEMY_DROP[e.kind] || VG.ENEMY_DROP.rusted;
    const rng = VG.makeRng((VG.World.seed ^ (e.x * 7919) ^ (e.y * 104729) ^ (e.id.length * 31)) >>> 0);
    const out = [];
    const stacks = VG.DROP_STACKS[e.kind] || VG.DROP_STACKS.rusted;
    const n = rng.int(stacks[0], stacks[1]);
    for (let i = 0; i < n; i++) {
      const pick = rng.pick(table);
      out.push({ id: pick[0], qty: rng.int(pick[1], pick[2]) });
    }
    return out;
  };

  /* A thing that dies pays out, and the pack still has a limit. */
  VG.killEnemy = function (e, p) {
    if (!e || e.dead) return;
    e.dead = true;
    p.killed++;
    if (VG.DYN) VG.DYN.addHeat(1.2);
    VG.log('A ' + e.kind + ' goes down.', 'good');
    if (VG.FX) {
      VG.FX.wreck(e.x * VG.TILE, e.y * VG.TILE, e.kind);
      VG.FX.addShake(e.kind === 'warden' ? 8 : 5);
      VG.FX.hitStop(e.kind === 'warden' ? 0.09 : 0.05);
    }
    VG.addXp(p, e.kind === 'warden' ? VG.XP.warden : VG.XP.kill);
    const drop = VG.enemyDrop(e);
    const res = VG.takeLoot(p, drop);
    const parts = [];
    for (const l of res.taken) {
      const it = VG.item(l.id);
      parts.push((it ? it.name : l.id) + (l.qty > 1 ? ' x' + l.qty : ''));
      if (VG.FX) VG.FX.loot(l.id, l.qty);
    }
    if (parts.length) VG.log('You take from it: ' + parts.join(', '), 'good');
    if (res.left.length) VG.log('Your pack will not hold the rest.', 'bad');
  };

  VG.onDeath = function (cause) {
    const p = VG.Player;
    if (p.hp > 0) return;
    if (p.deadHandled) return;
    p.deadHandled = true;
    p.downs = (p.downs || 0) + 1;
    VG.log('You are down. The Survey Office files you as lost.', 'bad');
    if (VG.FX) { VG.FX.addShake(10); VG.FX.fade(true); }
    setTimeout(() => {
      /* if you were in a room when it happened, you are not in it now */
      if (VG.INT && VG.INT.active) VG.INT.active = null;
      p.hp = Math.round(p.maxhp * 0.6); p.stam = 60; p.dose = Math.min(p.dose, 40);
      /* Whoever carried you back gave you water. Without this a surveyor
         who died of thirst woke up at the trailer with an empty canteen
         clock, and died of thirst again four seconds later, forever. */
      p.water = Math.max(p.water, 45); p.food = Math.max(p.food, 45);
      p.x = VG.World.start.x * VG.TILE; p.y = VG.World.start.y * VG.TILE;
      p.deadHandled = false;
      /* nothing that was chasing you is still chasing you */
      for (const e of VG.World.enemies) { e.aggro = 0; e.windup = 0; e.lunge = 0; }
      VG.state.bullets.length = 0;
      VG.log('You come to at the field trailer. Somebody carried you. Nothing in your pack is missing.', 'good');
      if (VG.FX) { VG.FX.fade(false); VG.FX.banner('RECOVERED', 'The field trailer', { sub: 'Somebody carried you back. The files are where you left them.', color: '#d06a4a', hold: 3000 }); }
      if (VG.autosave) VG.autosave();
    }, 1500);
  };

  /* ---------- the survey keeps its own notes ---------- */
  /* Saving used to be a key (F) the player had to know about and remember
     to press. Somebody who played for forty minutes and closed the tab came
     back to nothing, and that is the end of that player. The notes are kept
     for them now: every minute, at every door, and whenever a file moves. */
  VG.AUTOSAVE_EVERY = 60;
  let autoT = 0;
  VG.autosave = function () {
    const p = VG.Player;
    if (!p || !VG.World || !VG.saveGame) return false;
    if (p.hp <= 0 || p.deadHandled) return false;
    autoT = 0;
    return VG.saveGame(true);
  };

  /* ---------- loop ---------- */
  function frame(ts) {
    requestAnimationFrame(frame);
    if (!VG.World) return;
    const now = ts / 1000;
    let dt = Math.min(0.05, now - last);
    if (!last) dt = 0.016;
    last = now;
    const p = VG.Player, world = VG.World;
    const st = VG.state;
    /* the feel layer runs on real seconds; the world holds its breath for a
       few frames when something dies, which is what makes a kill land */
    if (VG.FX) {
      if (!VG.paused) VG.FX.update(dt);
      if (VG.FX.stop > 0) { VG.FX.stop -= dt; dt *= 0.06; }
    }

    if (!VG.paused) {
      /* the animation clock runs on real seconds, not on the game clock —
         the torch flicker must not turn into a strobe when the sky speeds up */
      st.anim = (st.anim || 0) + dt;
      /* The pause on the door after you step out has to expire whether or not
         you are inside a building, and outdoors is exactly where it matters.
         Tick it here, not inside the interior update. */
      if (VG.INT && VG.INT.doorLock > 0) VG.INT.doorLock = Math.max(0, VG.INT.doorLock - dt);
      const px0 = p.x, py0 = p.y;
      st.time = (st.time + dt * VG.TIME_SCALE) % 86400;
      VG.sprint = VG.shiftHeld && (input.up || input.down || input.left || input.right) && p.stam > 1;
      /* inside a building the flats are suspended: no traffic, no rusted,
         no bullets. The room is the whole world for as long as you are in it. */
      const inside = !!(VG.INT && VG.INT.active);
      /* The pointer has to be resolved BEFORE the player moves: the walking
         is measured from the heading the pointer sets, and the figure turns
         to that heading whether the player is moving or not. The camera is
         resolved here too, because the pointer's place in the world is
         measured through it. */
      if (inside) {
        VG.INT.updateCamera(p, dt, VG.viewW || window.innerWidth, VG.viewH || window.innerHeight);
        mouse.world = VG.INT.screenToLocal(mouse.x, mouse.y);
      } else {
        VG.updateCamera(p, dt, world);
        mouse.world = VG.screenToWorld(mouse.x, mouse.y);
      }
      p.aim = VG.heading(p, mouse.world);
      if (inside) {
        VG.INT.update(p, dt, input);
      } else {
        VG.updatePlayer(p, dt, input, world);
        /* the living flats: traffic, calls, raids, convoys, pressure */
        if (VG.DYN) VG.DYN.update(dt, p, world);
      }
      const moved = Math.hypot(p.x - px0, p.y - py0);
      if (moved > 0.4 && VG.Help) VG.Help.mark('moved');
      /* a sprint kicks up the ground you are running on */
      if (VG.FX && !inside && VG.sprint && moved > 0.4) {
        st.dustT = (st.dustT || 0) - dt;
        if (st.dustT <= 0) { st.dustT = 0.07; VG.FX.dust(p.x - Math.cos(p.face) * 8, p.y - Math.sin(p.face) * 8 + 6); }
      }
      autoT += dt;
      if (autoT >= VG.AUTOSAVE_EVERY) VG.autosave();
      if (VG.Audio) {
        const yard = world.yard;
        const rd = inside ? 9999 : VG.dist(p.x, p.y, yard.x * VG.TILE, yard.y * VG.TILE);
        VG.Audio.update(dt, {
          moved: moved,
          sprinting: VG.sprint,
          night: VG.isNight(st.time),
          haze: !!(VG.weather && VG.weather.haze),
          reactorNear: Math.max(0, 1 - rd / 2400)
        });
      }
      if (!inside) {
        VG.updateEnemies(dt, p, world);
        VG.updateBullets(dt, p, world);
      }
      st.flare = Math.max(0, st.flare - dt * 20);
      // weather
      VG.weather.timer -= dt;
      if (VG.weather.timer <= 0) VG.rollWeather(VG.makeRng((Math.random() * 1e9) | 0));
      // discovery
      if (!inside) {
        for (const poi of world.pois) {
          if (!poi.discovered && VG.dist(p.x, p.y, poi.x * VG.TILE, poi.y * VG.TILE) < 260) {
            poi.discovered = true;
            p.charted = (p.charted || 0) + 1;
            VG.log('Location charted: ' + poi.name, 'clue');
            VG.addXp(p, VG.XP.chart, true);
            if (VG.FX) {
              const total = world.pois.length;
              const done = world.pois.filter((q) => q.discovered).length;
              const wanted = VG.wantedTypes ? VG.wantedTypes(p).indexOf(poi.type) >= 0 : false;
              VG.FX.banner(wanted ? 'CHARTED · THE FILE NEEDS THIS' : 'LOCATION CHARTED', poi.name,
                { sub: done + ' of ' + total + ' places on the flats', color: wanted ? '#e8b34a' : '#93b45a', hold: wanted ? 2600 : 1700 });
              VG.FX.ring(poi.x * VG.TILE, poi.y * VG.TILE, 120, wanted ? '232,179,74' : '147,180,90', 0.9);
            }
            if (VG.Audio && VG.Audio.click) VG.Audio.click();
          }
        }
        st.nearestPoi = null;
        let bd = 1e9;
        for (const poi of world.pois) {
          const d = VG.dist(p.x, p.y, poi.x * VG.TILE, poi.y * VG.TILE);
          if (d < bd) { bd = d; st.nearestPoi = { poi, dist: d }; }
        }
      }

      /* the coach has to notice thirst and hunger as they build. Time this
         off the frame clock, not the clamped delta — a backgrounded tab runs
         one frame a second and would stretch the delay tenfold. */
      if (ts - coachNext > 500) {
        coachNext = ts;
        if (VG.Help) VG.Help.refresh();
      }
    }
    VG.state.fireCd = Math.max(0, VG.state.fireCd - dt);
    /* holding the mouse button keeps the weapon working at its own rate */
    if (firing && !VG.paused && !(VG.INT && VG.INT.active)) VG.fire(p, world);
    VG.draw(p, world, st, dt);
    VG.drawHud(p, world, st);

    // interaction prompt
    const target = VG.paused ? null : VG.findTarget(p, world);
    const pr = document.getElementById('prompt');
    if (pr) {
      /* there is no well inside a building */
      const water = (VG.INT && VG.INT.active) ? null : VG.nearestWater(p, world);
      if (target && target.kind === 'call') {
        pr.style.display = 'block';
        pr.innerHTML = 'E — <b>answer the distress call</b> <span class="muted">· ' + target.obj.who + '</span>';
      } else if (target && target.kind === 'exit') {
        pr.style.display = 'block';
        pr.innerHTML = 'E — <b>step back outside</b> <span class="muted">· ' + (VG.INT.active ? VG.INT.active.tpl.title : '') + ' · or ESC</span>';
      } else if (target && target.kind === 'door') {
        pr.style.display = 'block';
        pr.innerHTML = 'E — <b>go inside</b> <span class="muted">· ' + target.obj.name + '</span>' +
          (VG.postFactionOf && VG.postFactionOf(target.obj) ? postTag(target.obj, p) : '');
      } else if (target && target.kind === 'container') {
        const c = target.obj;
        pr.style.display = 'block';
        pr.innerHTML = 'E — search ' + (c.clueId ? '<b>something labelled</b>' : 'the container') +
          (c.partial ? ' <span class="muted">· there is more in it</span>' : '') +
          (water ? ' <span class="muted">· R — draw water</span>' : '');
      } else if (target && target.kind === 'poi') {
        const poi = target.obj;
        pr.style.display = 'block';
        if (VG.isWaterPoi(poi)) {
          pr.innerHTML = 'E — <b>draw water</b> <span class="muted">' + poi.name + '</span>';
        } else if (VG.postFactionOf && VG.postFactionOf(poi)) {
          pr.innerHTML = '<b>' + poi.name + '</b> — ' + postTag(poi, p);
        } else {
          pr.innerHTML = poi.name + ' <span class="muted">— press E to survey</span>';
        }
      } else if (water) {
        pr.style.display = 'block';
        pr.innerHTML = 'R — <b>draw water</b> <span class="muted">' + water.name + '</span>';
      } else pr.style.display = 'none';
    }
    st.target = target;
  }

  /* ---------- input ---------- */
  function bindInput() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (VG.Audio) VG.Audio.init();
      if (k === 'shift') VG.shiftHeld = true;
      if (k === 'w' || k === 'arrowup') { input.up = true; e.preventDefault(); }
      if (k === 's' || k === 'arrowdown') { input.down = true; e.preventDefault(); }
      if (k === 'a' || k === 'arrowleft') { input.left = true; e.preventDefault(); }
      if (k === 'd' || k === 'arrowright') { input.right = true; e.preventDefault(); }
      if (k === 'e') {
        const t = VG.state.target;
        if (t && t.kind === 'container') VG.openContainer(t.obj, VG.Player);
        else if (t && t.kind === 'call') {
          if (VG.DYN) VG.DYN.answerCall(t.obj, VG.Player, VG.World);
        }
        else if (t && t.kind === 'door') {
          if (VG.INT && VG.INT.enter(t.obj, VG.Player)) VG.autosave();
        }
        else if (t && t.kind === 'exit') {
          if (VG.INT) VG.INT.exit(VG.Player);
        }
        else if (t && t.kind === 'poi') {
          const p = VG.Player;
          if (VG.isWaterPoi(t.obj)) { VG.drinkWater(t.obj); return; }
          p.discovered = p.discovered || {};
          VG.log('Surveyed ' + t.obj.name + '. ' + (t.obj.tier >= 2 ? 'Intact structure — worth a closer look.' : 'Little left standing.'), '');
          p.stam = Math.max(0, p.stam - 6);
        }
      }
      if (k === 'r') {
        /* drink, wherever a well or a water tower happens to be — the loot at
           a well would otherwise own the E key and the water would never be
           reachable. There is no well inside a building. */
        if (VG.INT && VG.INT.active) { VG.log('No water within reach.', ''); return; }
        const w = VG.nearestWater(VG.Player, VG.World);
        if (w) VG.drinkWater(w);
        else VG.log('No water within reach.', '');
      }
      if (k === 'tab') { e.preventDefault(); VG.showPanel(VG.paused ? null : 'inv'); }
      if (k === 'j') { VG.showPanel(VG.paused ? null : 'journal'); }
      if (k === 'm') { VG.showPanel(VG.paused ? null : 'map'); }
      if (k === 'c') { VG.showPanel(VG.paused ? null : 'codex'); }
      if (k === 'k') { VG.showPanel(VG.paused ? null : 'craft'); }
      if (k === 'b') { VG.showPanel(VG.paused ? null : 'contracts'); }
      if (k === 'h' || k === '?' || k === 'f1') { e.preventDefault(); VG.showPanel(VG.paused ? null : 'help'); }
      if (k === 'o') { VG.showPanel(VG.paused ? null : 'options'); }
      if (k === 'n') {
        const m = VG.Audio ? VG.Audio.toggleMute() : false;
        VG.log(m ? 'Sound muted.' : 'Sound on.', '');
      }
      if (k === 'escape') {
        /* escape closes a panel. If no panel is open and you are inside a
           building, escape is the way out. Nobody should ever have to hunt
           for a door they cannot see. */
        if (VG.paused) VG.closePanel();
        else if (VG.INT && VG.INT.active) VG.INT.exit(VG.Player);
      }
      if (k === 'f') { VG.saveGame(); }
      if (k >= '1' && k <= '5') { VG.selectSlot(VG.Player, parseInt(k, 10) - 1); }
      /* the bar can be walked as well as dialled: Z back, X on, or the wheel */
      if (k === 'z') VG.cycleSlot(VG.Player, -1);
      if (k === 'x') VG.cycleSlot(VG.Player, 1);
      /* one key to patch up, whatever slot is selected */
      if (k === 'q' && !VG.paused) VG.quickHeal(VG.Player);
      if (k === ' ' || k === 'enter') useSelected();
    });
    function useSelected() {
      const p = VG.Player;
      if (!p || VG.paused) return;
      const id = p.hotbar[p.sel];
      if (!id) return;
      const it = VG.item(id);
      if (it && it.cat === 'weapon') VG.equipWeapon(p, id);
      else if (it) VG.useItem(id);
    }
    let wheelAt = 0;
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (VG.paused || !VG.Player) return;
      /* a trackpad sends a burst of these for one gesture */
      const nowT = performance.now();
      if (nowT - wheelAt < 90) return;
      wheelAt = nowT;
      VG.cycleSlot(VG.Player, e.deltaY > 0 ? 1 : -1);
    }, { passive: false });
    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'shift') VG.shiftHeld = false;
      if (k === 'w' || k === 'arrowup') input.up = false;
      if (k === 's' || k === 'arrowdown') input.down = false;
      if (k === 'a' || k === 'arrowleft') input.left = false;
      if (k === 'd' || k === 'arrowright') input.right = false;
    });
    canvas.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY;
    });
    canvas.addEventListener('mousedown', (e) => {
      /* the right button uses what is selected - the same as SPACE, for a
         hand that is already on the mouse */
      if (e.button === 2) { useSelected(); return; }
      /* no shooting indoors: there is nothing in the room to shoot */
      if (e.button !== 0) return;
      firing = true;
      if (!VG.paused && !(VG.INT && VG.INT.active)) VG.fire(VG.Player, VG.World);
    });
    /* the button can be released anywhere, including off the canvas */
    window.addEventListener('mouseup', (e) => { if (e.button === 0) firing = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /* ---------- boot ---------- */
  function boot() {
    canvas = document.getElementById('game');
    VG.paused = false;
    /* the reticle starts in the middle of the screen, not in the corner */
    mouse.x = (VG.viewW || window.innerWidth || 640) / 2;
    mouse.y = (VG.viewH || window.innerHeight || 360) / 2;
    VG.itemIndex();
    VG.initRender(canvas);
    VG.initUI();
    bindInput();
    if (VG.Audio) VG.Audio.loadSettings();
    if (VG.DYN) VG.DYN.loadIntensity();
    if (VG.FX) VG.FX.loadSettings();
    if (VG.loadMoveMode) VG.loadMoveMode();
    if (VG.loadFightMode) VG.loadFightMode();
    if (VG.loadAimAssist) VG.loadAimAssist();
    if (VG.Help) { VG.Help.bind(); VG.Help.render(); }
    /* the notes are kept if the tab is closed or put away mid-survey */
    window.addEventListener('beforeunload', () => { if (VG.World && VG.autosave) VG.autosave(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && VG.World && VG.autosave) VG.autosave();
    });

    const btn = document.getElementById('btn-start');
    const start = (loaded) => {
      document.getElementById('title').style.display = 'none';
      if (VG.Audio) VG.Audio.init();
      if (!loaded) {
        VG.genWorld((Math.random() * 0x7fffffff) | 0);
        VG.newPlayer(VG.World);
        VG.Player.deadHandled = false;
        VG.state.time = VG.START_TIME;
      }
      /* the buildings take their crates inside: this has to run after the
         world exists, or it prepares a world that is about to be thrown away */
      if (VG.INT) VG.INT.prepare(VG.World);
      if (VG.DYN) {
        VG.DYN.init(VG.World, VG.World.seed);
        if (loaded && VG.loadedDyn) VG.DYN.load(VG.loadedDyn);
      }
      VG.log('Verdigris Flats. ' + VG.nowStamp() + '. Start at the Survey Office trailer.', 'clue');
      VG.log('Search the flats. Read what is left. Close the files.', '');
      VG.log('Channel three is open. If somebody calls, go and see.', '');
      /* the Office warns you about the one place it knows will kill you */
      const open0 = VG.openCase(VG.Player);
      if (open0 && VG.yardWarning) {
        const warn = VG.yardWarning(open0, VG.Player);
        if (warn) VG.log(warn, 'bad');
      }
      /* Say what is in your hand and how far it reaches. A player who does
         not know the reach of their own gun will find out by shooting at
         something that is still a long way off, and will conclude the gun
         does not work. */
      const w0 = VG.playerWeapon(VG.Player);
      if (w0 && VG.isRangedWeapon(w0)) {
        VG.log(w0.name + ' in your hand, ' + (VG.Player.ammo[w0.ammo] || 0) +
          ' rounds. It reaches ' + w0.stats.range + 'm - further than anything on the flats can see you.', 'good');
        VG.log('Wheel (or Z / X) changes what is in your hand. Q patches you up. K makes rounds and dressings.', 'good');
      } else if (w0) {
        VG.log(w0.name + ' in your hand. It is swung, not fired - ' + w0.stats.range + 'm of reach.', 'good');
      }
      if (VG.Player.issuedRevolver) {
        const slot = VG.Player.hotbar.indexOf('wpn_long_horn');
        VG.log('The Survey Office issues you a Longhorn Revolver and six rounds - it reaches 280m. Press ' +
          (slot + 1) + ' to take it and SPACE to put it in your hand.', 'good');
      }
      if (VG.Help) VG.Help.refresh();
      requestAnimationFrame(frame);
    };
    /* The title used to have one button, and it silently loaded a saved
       survey if there was one - so there was no way to start again, and no
       sign that there was anything to come back to. It says which it is now. */
    const fresh = document.getElementById('btn-new');
    const info = document.getElementById('title-save');
    const saved = VG.hasSave() ? VG.saveSummary() : null;
    if (btn) {
      if (saved) {
        btn.textContent = 'CONTINUE SURVEY';
        if (info) { info.textContent = saved; info.style.display = 'block'; }
        if (fresh) fresh.style.display = 'inline-block';
      }
      btn.onclick = () => {
        const p = saved ? VG.loadGame() : null;
        if (p) { VG.log('Survey notes recovered.', 'good'); start(true); }
        else start(false);
      };
    }
    if (fresh) {
      let armed = false;
      fresh.onclick = () => {
        /* two clicks: the first one only asks */
        if (!armed) { armed = true; fresh.textContent = 'ERASE THE OLD NOTES? CLICK AGAIN'; fresh.classList.add('warn'); return; }
        VG.clearSave();
        start(false);
      };
    }
  }

  window.addEventListener('load', boot);
})(window.VG);
