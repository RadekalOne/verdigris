/* VERDIGRIS — main loop, input, interaction */
window.VG = window.VG || {};
(function (VG) {
  'use strict';

  VG.state = { time: 9 * 3600, bullets: [], flash: 0, flare: 0, showCrosshair: true, paused: false, anim: 0, hits: [], swing: null, fireCd: 0 };

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
      if (c.opened) continue;
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
    if (c.opened) return;
    c.opened = true;
    p.containersOpened++;
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
      if (s) {
        VG.invAdd(p, s.id, 1);
        VG.log('SURPRISE FIND: ' + s.name + ' — ' + s.desc, 'clue');
        if (VG.Audio) VG.Audio.surprise();
      }
    }
    const loot = c.loot || VG.rollContainerLoot(c, rng);
    c.loot = loot;
    let lines = [];
    for (const l of loot) {
      VG.invAdd(p, l.id, l.qty);
      const it = VG.item(l.id);
      lines.push((it ? it.name : l.id) + (l.qty > 1 ? ' x' + l.qty : ''));
    }
    if (lines.length) {
      VG.log('Searched: ' + lines.join(', '), 'good');
      if (VG.Audio) VG.Audio.pickup();
    }
    else VG.log('Nothing but dust.', '');

    if (c.clueId) {
      const cl = VG.findClue(c.clueId);
      if (cl) {
        p.readClues[cl.id] = true;
        const cse = VG.allCases().find((x) => x.id === cl.caseId);
        p.knownFacts[cl.fact] = cl.caseId;
        p.foundClues[cl.caseId] = p.foundClues[cl.caseId] || [];
        if (p.foundClues[cl.caseId].indexOf(cl.id) < 0) p.foundClues[cl.caseId].push(cl.id);
        VG.log('EVIDENCE — ' + cl.name + ': ' + cl.text, 'clue');
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
  VG.canConclude = function (cse, p) {
    for (const s of (cse.solutions || [])) {
      if ((p.solvedSolutions[cse.id] || []).indexOf(s.id) >= 0) continue;
      if ((s.requires || []).every((r) => p.knownFacts[r])) return s;
    }
    return null;
  };
  VG.conclude = function (cse, s) {
    const p = VG.Player;
    p.solvedSolutions[cse.id] = p.solvedSolutions[cse.id] || [];
    p.solvedSolutions[cse.id].push(s.id);
    p.xp += 250;
    p.level = 1 + Math.floor(p.xp / 250);
    if (VG.DYN) VG.DYN.addHeat(6);
    VG.log('CASE CLOSED: ' + cse.title, 'clue');
    if (VG.Audio) VG.Audio.close();
    if (VG.Help) VG.Help.mark('concluded');
    if (s.reward) {
      for (const k in (s.reward.rep || {})) p.rep[k] = (p.rep[k] || 0) + s.reward.rep[k];
      for (const it of (s.reward.items || [])) VG.invAdd(p, it, 1);
    }
    if (cse.reward) {
      for (const k in (cse.reward.rep || {})) p.rep[k] = (p.rep[k] || 0) + cse.reward.rep[k];
      for (const it of (cse.reward.items || [])) VG.invAdd(p, it, 1);
    }
    VG.log(s.epilogue || '', 'clue');
    const all = VG.allCases();
    const closed = all.filter((c) => (p.solvedSolutions[c.id] || []).length).length;
    if (closed === all.length) VG.showEndgame();
    VG.renderJournal();
  };
  VG.showEndgame = function () {
    const p = VG.Player;
    const body = document.getElementById('endgame-body');
    if (body) {
      const all = VG.allCases();
      let h = '<p style="color:#d6d1c3;line-height:1.8">Eight files closed. The Survey Office has its answer, and the answer is worse than a missing town.</p><p style="color:#8a8578;line-height:1.8;margin-top:10px">The people of Verdigris Flats are alive. They have been for forty-one years, in a place the maps do not show, because this office decided the world was better off not knowing — and then kept deciding, year after year, long after the men who made that decision were gone.</p>';
      for (const c of all) {
        const s = (c.solutions || [])[0];
        if (s) h += '<div class="cardx" style="margin-top:10px"><h3>' + VG.htmlEscape(c.title) + '</h3><p>' + VG.htmlEscape(s.label) + '</p></div>';
      }
      h += '<div style="height:14px"></div><div class="meta">Survey Office — Field Report ' + VG.nowStamp() + '</div>';
      body.innerHTML = h;
    }
    VG.showPanel('endgame');
  };

  /* ---------- combat ---------- */
  VG.fire = function (p, world) {
    if (VG.state.fireCd > 0) return;
    if (VG.Audio) VG.Audio.shot();
    const w = VG.playerWeapon(p);
    const range = VG.attackRange(p);
    /* a weapon is fired or swung, not chosen by an arbitrary reach number */
    const ranged = VG.isRangedWeapon(w);
    if (w && w.ammo && ranged) {
      if ((p.ammo[w.ammo] || 0) <= 0) { VG.log('Out of ' + (VG.item(w.ammo) ? VG.item(w.ammo).name : 'ammunition') + '.', 'bad'); VG.state.fireCd = 0.25; return; }
      p.ammo[w.ammo]--;
    }
    VG.state.fireCd = VG.attackCooldown(p);
    /* The round goes exactly where the reticle is. There is no spread: what
       the player points at is what they hit, and the only variable is how
       far the weapon reaches. */
    const ang = Math.atan2(mouse.world.y - p.y, mouse.world.x - p.x);
    p.aim = ang;
    if (VG.Help) VG.Help.mark('fired');
    if (!ranged) {
      // melee swing
      const dmg = VG.attackDamage(p);
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
        e.hp -= dmg; hit = true; e.flash = 0.16;
        VG.markHit(e.x * VG.TILE, e.y * VG.TILE, dmg);
        if (e.hp <= 0) { e.dead = true; p.killed++; if (VG.DYN) VG.DYN.addHeat(1.2); VG.log('A ' + e.kind + ' goes down.', 'good'); }
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
    VG.state.bullets.push({
      x: p.x + Math.cos(ang) * 14, y: p.y + Math.sin(ang) * 14,
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: life, dmg: VG.attackDamage(p)
    });
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
        if (VG.dist(cx, cy, ex, ey) < e.r + 3) {
          e.hp -= b.dmg; gone = true; e.flash = 0.16;
          VG.markHit(ex, ey, b.dmg);
          if (VG.Audio) VG.Audio.hit();
          if (e.hp <= 0) { e.dead = true; p.killed++; if (VG.DYN) VG.DYN.addHeat(1.2); VG.log('A ' + e.kind + ' goes down.', 'good'); }
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
    for (const e of world.enemies) {
      if (e.dead) continue;
      /* the flash of a thing that has just been hit */
      if (e.flash > 0) e.flash -= dt;
      const ex = e.x * VG.TILE, ey = e.y * VG.TILE;
      const d = VG.dist(p.x, p.y, ex, ey);
      if (d < notice) e.aggro = 2.2;
      else e.aggro = Math.max(0, e.aggro - dt);
      if (e.aggro > 0) {
        const s = e.kind === 'drover' ? 92 : e.kind === 'warden' ? 74 : 66;
        const ux = (p.x - ex) / (d || 1), uy = (p.y - ey) / (d || 1);
        e.x += ux * s * dt / VG.TILE;
        e.y += uy * s * dt / VG.TILE;
        if (d < e.r + p.r + 6 && p.lastDamage < performance.now() - 900) {
          VG.damagePlayer(p, e.dmg, e.kind);
          VG.log('Hit by a ' + e.kind + '.', 'bad');
        }
      } else {
        // wander near home
        if (Math.random() < 0.004) {
          e.wx = (Math.random() - 0.5) * 0.8;
          e.wy = (Math.random() - 0.5) * 0.8;
        }
        e.x += (e.wx || 0) * 24 * dt / VG.TILE;
        e.y += (e.wy || 0) * 24 * dt / VG.TILE;
        if (VG.dist(e.x, e.y, e.home.x, e.home.y) > 6) { e.x = e.home.x; e.y = e.home.y; }
      }
    }
  };

  VG.onDeath = function (cause) {
    const p = VG.Player;
    if (p.hp > 0) return;
    if (p.deadHandled) return;
    p.deadHandled = true;
    VG.log('You are down. The Survey Office files you as lost.', 'bad');
    setTimeout(() => {
      p.hp = 60; p.stam = 60; p.dose = Math.min(p.dose, 40);
      p.x = VG.World.start.x * VG.TILE; p.y = VG.World.start.y * VG.TILE;
      p.deadHandled = false;
      VG.log('You come to at the field trailer.', 'good');
    }, 1200);
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
      if (inside) {
        VG.INT.update(p, dt, input);
      } else {
        VG.updatePlayer(p, dt, input, world);
        /* the living flats: traffic, calls, raids, convoys, pressure */
        if (VG.DYN) VG.DYN.update(dt, p, world);
      }
      const moved = Math.hypot(p.x - px0, p.y - py0);
      if (moved > 0.4 && VG.Help) VG.Help.mark('moved');
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
            VG.log('Location charted: ' + poi.name, 'clue');
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
    if (VG.INT && VG.INT.active) {
      VG.INT.updateCamera(p, dt, VG.viewW || window.innerWidth, VG.viewH || window.innerHeight);
      mouse.world = VG.INT.screenToLocal(mouse.x, mouse.y);
    } else {
      VG.updateCamera(p, dt, world);
      mouse.world = VG.screenToWorld(mouse.x, mouse.y);
      /* where the player is looking. The figure turns to this, so a round
         leaves the body in the direction you are pointing. */
      p.aim = Math.atan2(mouse.world.y - p.y, mouse.world.x - p.x);
    }
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
        pr.innerHTML = 'E — <b>go inside</b> <span class="muted">· ' + target.obj.name + '</span>';
      } else if (target && target.kind === 'container') {
        const c = target.obj;
        pr.style.display = 'block';
        pr.innerHTML = 'E — search ' + (c.clueId ? '<b>something labelled</b>' : 'the container') +
          (water ? ' <span class="muted">· R — draw water</span>' : '');
      } else if (target && target.kind === 'poi') {
        const poi = target.obj;
        pr.style.display = 'block';
        if (VG.isWaterPoi(poi)) {
          pr.innerHTML = 'E — <b>draw water</b> <span class="muted">' + poi.name + '</span>';
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
          if (VG.INT) VG.INT.enter(t.obj, VG.Player);
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
      if (k >= '1' && k <= '5') { VG.Player.sel = parseInt(k, 10) - 1; }
      if (k === ' ' || k === 'enter') {
        const p = VG.Player;
        const id = p.hotbar[p.sel];
        if (id) {
          const it = VG.item(id);
          if (it && it.cat === 'weapon') VG.equipWeapon(p, id);
          else if (it) VG.useItem(id);
        }
      }
    });
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
    if (VG.Help) { VG.Help.bind(); VG.Help.render(); }

    const btn = document.getElementById('btn-start');
    const start = (loaded) => {
      document.getElementById('title').style.display = 'none';
      if (VG.Audio) VG.Audio.init();
      if (!loaded) {
        VG.genWorld((Math.random() * 0x7fffffff) | 0);
        VG.newPlayer(VG.World);
        VG.Player.deadHandled = false;
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
      if (VG.Help) VG.Help.refresh();
      requestAnimationFrame(frame);
    };
    if (btn) {
      btn.onclick = () => {
        const p = VG.loadGame();
        if (p) { VG.log('Survey notes recovered.', 'good'); start(true); }
        else start(false);
      };
    }
  }

  window.addEventListener('load', boot);
})(window.VG);
