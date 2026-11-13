/* VERDIGRIS — player state, needs, inventory */
window.VG = window.VG || {};
(function (VG) {
  'use strict';

  VG.Player = null;
  VG.START_ROUNDS = 18;

  VG.newPlayer = function (world) {
    const p = {
      x: world.start.x * VG.TILE + VG.TILE / 2,
      y: world.start.y * VG.TILE + VG.TILE / 2,
      r: 10, speed: 132, face: 0,
      hp: 100, maxhp: 100,
      stam: 100, food: 100, water: 100, dose: 0,
      inv: {}, ammo: {},          // itemId -> count
      hotbar: [null, null, null, null, null],
      sel: 0,
      weapon: null, armor: null,
      radius: 0,                  // flare radius while a torch is lit
      gold: 0,
      rep: { ledger: 0, choir: 0, free_line: 0 },
      doneContracts: {},         // contractId -> true. A contract is settled once.
      knownFacts: {},             // factId -> caseId
      readClues: {},              // clueId -> true
      solvedSolutions: {},        // solutionId -> caseId
      foundClues: {},             // caseId -> [clueIds]
      rejectedTheories: {},       // deductionId -> how many theories the Office refused
      xp: 0, level: 1,
      charted: 0,
      killed: 0, containersOpened: 0,
      lastDamage: 0,
      firing: 0
    };
    // starting kit
    p.inv['field_notebook'] = 1;
    p.inv['scrap_copper'] = 6;
    p.inv['scrap_cloth'] = 4;
    p.inv['scrap_ceramic'] = 2;
    p.inv['aid_canteen'] = 1;
    p.inv['aid_field_dressing'] = 3;
    /* The gun comes first. The player used to start with nothing but a
       torch - a swung weapon with a 40m reach - so the first fight in the
       flats was a fight they could only finish with their hands, and no
       gun they found had the reach to be used at all. The revolver is in
       your hand at the start, with six rounds, and it reaches further than
       anything on the flats can notice you. */
    p.hotbar[0] = 'wpn_long_horn';
    p.weapon = 'wpn_long_horn';
    /* the torch is slot 2: it is the light, and it keeps burning in the
       pack, so putting the gun in your hand does not put you in the dark */
    p.hotbar[1] = 'wpn_scrap_torch';
    /* the canteen and the dressing start in the bar, so the first time you
       find something you can use, the way to use it is already on screen */
    p.hotbar[2] = 'aid_canteen';
    p.hotbar[3] = 'aid_field_dressing';
    /* slot 5 is left empty on purpose: the first thing you find has a home */
    p.inv['wpn_scrap_torch'] = 1;
    p.inv['wpn_long_horn'] = 1;
    /* Eighteen rounds, not six. Six was two kills at perfect aim and then a
       walk to a bench the player had never seen. */
    p.inv['ammo_slug'] = VG.START_ROUNDS;
    p.ammo['ammo_slug'] = VG.START_ROUNDS;
    p.inv['ammo_coin'] = 6;
    /* the coins go into the ammo counter as well as the pack, or the sling
       reports itself empty while six of them sit in the inventory */
    p.ammo['ammo_coin'] = 6;
    VG.Player = p;
    return p;
  };

  VG.invCount = function (p, id) { return p.inv[id] || 0; };
  VG.invAdd = function (p, id, qty) {
    qty = qty || 1;
    p.inv[id] = (p.inv[id] || 0) + qty;
    const it = VG.item(id);
    if (it && it.cat === 'ammo') p.ammo[id] = (p.ammo[id] || 0) + qty;
    /* A consumable aid goes into a free hotbar slot the first time you find
       one. You draw water with R, but a tin of rations that sits in the pack
       with no route to your hands is a tin you cannot eat and a hunger you
       cannot fix. The slot is the route.
       A weapon goes into a free slot for the same reason, and harder: a gun
       you found and cannot reach is a gun you never shoot, and a player who
       has found a rifle and still fights with a torch has learned the wrong
       lesson about the whole game. */
    if (it && (it.cat === 'aid' || it.cat === 'weapon') && !it.passive && p.hotbar && p.hotbar.indexOf(id) < 0) {
      const free = p.hotbar.indexOf(null);
      if (free >= 0) {
        p.hotbar[free] = id;
        if (it.cat === 'weapon') {
          if (!VG.taughtWeapon) {
            VG.taughtWeapon = true;
            VG.log('Press ' + (free + 1) + ' to take the ' + it.name + ', then SPACE to put it in your hand.', 'good');
          }
        } else if (!VG.taughtAid) {
          VG.taughtAid = true;
          VG.log('Press ' + (free + 1) + ' to take it, then SPACE to use it.', 'good');
        }
      }
    }
  };
  VG.invRemove = function (p, id, qty) {
    qty = qty || 1;
    p.inv[id] = Math.max(0, (p.inv[id] || 0) - qty);
    if (p.inv[id] === 0) {
      delete p.inv[id];
      /* a slot that points at something you no longer have is a lie. You eat
         the last tin and the bar still offers it. */
      if (p.hotbar) {
        const s = p.hotbar.indexOf(id);
        if (s >= 0) p.hotbar[s] = null;
      }
    }
    if (VG.item(id) && VG.item(id).cat === 'ammo') p.ammo[id] = Math.max(0, (p.ammo[id] || 0) - qty);
  };
  VG.invTotal = function (p) {
    let n = 0;
    for (const k in p.inv) n += p.inv[k];
    return n;
  };
  VG.invWeight = function (p) {
    let w = 0;
    for (const k in p.inv) {
      const it = VG.item(k);
      if (it) w += (it.w || 1) * p.inv[k];
    }
    return w;
  };

  /* ---------- what you can carry ---------- */  /* A pack has a limit. Without one a crate is free, the loot is not a
     choice, and the flats stop being dangerous in the only way that
     matters: you can take everything you walk past. */
  VG.invCanFit = function (p, id, qty) {
    qty = qty || 1;
    const it = VG.item(id);
    const w = (it && it.w) ? it.w : 1;
    return VG.invWeight(p) + w * qty <= VG.carryCap(p);
  };

  /* Take what fits and leave the rest. The caller is told both, so a crate
     can keep what did not fit and be searched again once the player has
     made room - nothing is lost to a full pack, it is only late. */
  VG.takeLoot = function (p, items) {
    const taken = [], left = [];
    for (const l of (items || [])) {
      const qty = l.qty || 1;
      const it = VG.item(l.id);
      const w = (it && it.w) ? it.w : 1;
      const room = Math.floor((VG.carryCap(p) - VG.invWeight(p)) / w);
      if (room <= 0) { left.push({ id: l.id, qty: qty }); continue; }
      if (room >= qty) {
        VG.invAdd(p, l.id, qty);
        taken.push({ id: l.id, qty: qty });
      } else {
        VG.invAdd(p, l.id, room);
        taken.push({ id: l.id, qty: room });
        left.push({ id: l.id, qty: qty - room });
      }
    }
    return { taken: taken, left: left };
  };

  /* Put something down. A pack you cannot empty is not a limit, it is a
     wall. */
  VG.invDrop = function (p, id, qty) {
    qty = qty || 1;
    const have = p.inv[id] || 0;
    const n = Math.min(have, qty);
    if (n <= 0) return 0;
    VG.invRemove(p, id, n);
    return n;
  };
  VG.CARRY = 140;

  /* ---------- experience ---------- */
  /* The level used to be a number in the corner that did nothing. It was
     paid only for closing a file, so it moved eight times in a whole survey
     and bought nothing when it did. Now the things the survey is made of all
     pay a little - a place charted, a crate searched, evidence read, a
     question answered, a thing put down - and a grade is worth having: a
     surveyor who has been out longer carries more and takes more killing.

     The curve rises, so the early grades come quickly while the player is
     still learning what the number is, and the late ones have to be earned. */
  VG.XP = { chart: 12, crate: 4, clue: 35, question: 50, kill: 14, warden: 40, caseClosed: 250 };
  VG.GRADE = { hp: 8, carry: 6 };
  VG.GRADE_NAMES = ['Probationer', 'Field Clerk', 'Surveyor', 'Senior Surveyor', 'Investigator',
    'Senior Investigator', 'Inspector', 'Chief Inspector', 'Commissioner'];

  /* the experience a grade starts at: 0, 300, 800, 1500, 2400 ... */
  VG.xpForLevel = function (lv) { return lv <= 1 ? 0 : 100 * (lv - 1) * (lv + 1); };
  VG.levelForXp = function (xp) {
    let lv = 1;
    while (lv < 60 && xp >= VG.xpForLevel(lv + 1)) lv++;
    return lv;
  };
  VG.gradeName = function (lv) {
    return VG.GRADE_NAMES[Math.min(VG.GRADE_NAMES.length, Math.max(1, lv)) - 1];
  };
  VG.carryCap = function (p) {
    return VG.CARRY + (Math.max(1, (p && p.level) || 1) - 1) * VG.GRADE.carry;
  };
  /* what a grade is worth, applied from the level so a loaded survey and a
     live one can never disagree */
  VG.applyGrade = function (p) {
    p.level = VG.levelForXp(p.xp || 0);
    p.maxhp = 100 + (p.level - 1) * VG.GRADE.hp;
  };
  VG.addXp = function (p, n, quiet) {
    if (!p || !n) return;
    const before = p.level || 1;
    p.xp = (p.xp || 0) + n;
    VG.applyGrade(p);
    if (p.level > before) {
      /* a promotion puts you back on your feet */
      p.hp = p.maxhp;
      if (VG.log) VG.log('PROMOTED: ' + VG.gradeName(p.level) + ' (grade ' + p.level + '). You carry ' +
        VG.carryCap(p) + ' and can take ' + p.maxhp + '.', 'clue');
      if (VG.Audio && VG.Audio.levelUp) VG.Audio.levelUp();
      if (VG.FX) VG.FX.banner('PROMOTED · GRADE ' + p.level, VG.gradeName(p.level),
        { sub: 'Health ' + p.maxhp + ' · Pack ' + VG.carryCap(p), color: '#93b45a', hold: 2600 });
    } else if (!quiet && VG.FX) {
      VG.FX.note('+' + n + ' xp', 'xp');
    }
  };

  /* A crate is worth walking to when it has not been searched, or when the
     Office has since filed evidence in it. Every place that decides whether
     a crate can be reached, drawn or searched asks this one question - they
     used to ask three different ones, and the targeting said "emptied, skip
     it" about a crate the search itself would have opened. */
  VG.crateSearchable = function (c, p) {
    if (!c) return false;
    if (!c.opened) return true;
    p = p || VG.Player;
    return !!(c.clueId && p && !(p.readClues && p.readClues[c.clueId]));
  };

  VG.equipWeapon = function (p, id) {
    if (!VG.item(id) || VG.item(id).cat !== 'weapon') return false;
    p.weapon = id;
    /* Put it where the player can reach it: the slot it already sits in,
       else a free slot, else the selected one. Equipping must never throw
       a hotbar slot away - a torch that vanishes from the bar the moment
       you draw a gun is a torch you have to walk back to the Field Kit to
       find, and the slot the player selected is the slot that shows what
       is in their hands. */
    let slot = p.hotbar.indexOf(id);
    if (slot < 0) {
      const free = p.hotbar.indexOf(null);
      slot = (free >= 0) ? free : p.sel;
      p.hotbar[slot] = id;
    }
    p.sel = slot;
    if (VG.Help) VG.Help.mark('equipped');
    return true;
  };
  VG.equipArmor = function (p, id) {
    if (!VG.item(id) || VG.item(id).cat !== 'armor') return false;
    p.armor = id;
    if (VG.Help) VG.Help.mark('equipped');
    return true;
  };

  /* How many rounds a hotbar slot should show. A gun shows the rounds it
     has left; a swung weapon shows nothing, because it needs none. Without
     this the player finds out they are out of ammunition by clicking, at
     the worst possible moment. */
  VG.slotCount = function (p, id) {
    const it = VG.item(id);
    if (!it) return null;
    if (it.cat === 'ammo') return p.ammo[id] || 0;
    if (it.cat === 'weapon' && VG.isRangedWeapon(it)) return p.ammo[it.ammo] || 0;
    /* and a dressing shows how many are left, for the same reason */
    if (it.cat === 'aid' && !it.passive) return p.inv[id] || 0;
    return null;
  };

  /* ---------- the bar ---------- */
  /* Choosing a slot used to be half of a two-step: press the number, then
     press SPACE to put the thing in your hand. In a fight that is one key
     too many. A weapon you select is a weapon you are holding. Food and
     dressings still wait for SPACE (or the right button) - selecting a tin
     should not eat it. */
  VG.selectSlot = function (p, i) {
    if (!p || !p.hotbar) return false;
    if (i < 0 || i >= p.hotbar.length) return false;
    p.sel = i;
    const id = p.hotbar[i];
    const it = id ? VG.item(id) : null;
    if (it && it.cat === 'weapon') p.weapon = id;
    return true;
  };
  /* The wheel walks along the bar and skips the empty slots, so two turns
     of it never land on nothing. */
  VG.cycleSlot = function (p, dir) {
    if (!p || !p.hotbar) return false;
    const n = p.hotbar.length;
    dir = dir < 0 ? -1 : 1;
    for (let k = 1; k <= n; k++) {
      const i = (((p.sel + dir * k) % n) + n) % n;
      if (p.hotbar[i]) return VG.selectSlot(p, i);
    }
    return false;
  };

  /* ---------- patching up ---------- */
  /* Healing was: find the dressing in the bar, press its number, press
     SPACE - while something is hitting you. One key now. It picks the
     dressing that wastes least: the biggest one that fits the wound, or the
     smallest one you have if they are all too big. */
  VG.healItems = function (p) {
    const out = [];
    for (const id in (p.inv || {})) {
      if (!(p.inv[id] > 0)) continue;
      const it = VG.item(id);
      if (it && it.cat === 'aid' && !it.passive && it.stats && it.stats.heal > 0) out.push(it);
    }
    out.sort((a, b) => a.stats.heal - b.stats.heal);
    return out;
  };
  VG.healCount = function (p) {
    let n = 0;
    for (const it of VG.healItems(p)) n += p.inv[it.id] || 0;
    return n;
  };
  VG.quickHeal = function (p) {
    p = p || VG.Player;
    if (!p) return false;
    const say = (m, c) => { if (VG.log) VG.log(m, c); };
    const missing = (p.maxhp || 100) - p.hp;
    if (missing < 1) { say('You are not hurt.', 'muted'); return false; }
    const have = VG.healItems(p);
    if (!have.length) {
      say('Nothing to patch up with. Press K: two Field Dressings from two cloth, made by hand.', 'bad');
      return false;
    }
    let pick = have[0];
    for (const it of have) if (it.stats.heal <= missing + 4) pick = it;
    const before = p.hp;
    if (!VG.useItem(pick.id, p)) return false;
    say('Patched up: +' + Math.round(p.hp - before) + ' health. ' + VG.healCount(p) + ' left.', 'good');
    return true;
  };

  /* Use a carried item. This changes the player - it eats, it heals, it
     equips - so it lives in the engine and not in the interface. The
     interface only draws the result. A tin of rations you cannot eat is a
     tin of rations, and this is the line that makes it food. */
  VG.useItem = function (id, p) {
    p = p || VG.Player;
    const it = VG.item(id);
    if (!it || !p) return false;
    const say = (m, c) => { if (VG.log) VG.log(m, c); };
    if (it.passive) {
      /* passive gear works by being carried - never consume it */
      say(it.passiveNote || (it.name + ' stays in your pack. It is already working.'), 'good');
      return false;
    }
    if (it.cat === 'aid') {
      p.hp = Math.min(p.maxhp, p.hp + (it.stats.heal || 0));
      if (it.stats.food) p.food = Math.min(100, p.food + it.stats.food);
      if (it.stats.thirst) p.water = Math.min(100, p.water + it.stats.thirst);
      if (it.stats.rad) p.dose = VG.clamp(p.dose + it.stats.rad, 0, 100);
      VG.invRemove(p, id, 1);
      say('Used ' + it.name + '.', 'good');
      if (VG.Help) VG.Help.mark('ate');
      if (VG.renderInv) VG.renderInv();
      return true;
    }
    if (it.cat === 'weapon') {
      VG.equipWeapon(p, id);
      say('Equipped ' + it.name + '.');
      if (VG.renderInv) VG.renderInv();
      return true;
    }
    if (it.cat === 'armor') {
      VG.equipArmor(p, id);
      say('Wearing ' + it.name + '.');
      if (VG.renderInv) VG.renderInv();
      return true;
    }
    say(it.name + ' — nothing to do with it.', 'muted');
    return false;
  };

  /* What does the player press to use this?
     The hotbar and the Field Kit both have to say it out loud, because until
     the game says it the player is guessing, and a tin of rations you do not
     know how to eat is a tin of rations. One sentence per item, used
     everywhere the item is shown. */
  VG.useHint = function (it, p) {
    if (!it) return '';
    p = p || VG.Player;
    if (it.cat === 'weapon') {
      /* A weapon has two things the player needs to know and neither of them
         is its name: whether it fires or swings, and how far it reaches.
         "Reaches 280m" is the difference between a gun that works and a gun
         that dies in the air, and the player can only find that out by
         firing at something that is still a long way off. */
      const reach = (it.stats && it.stats.range) ? it.stats.range : 0;
      const inHand = !!(p && p.weapon === it.id);
      if (VG.isRangedWeapon(it)) {
        return inHand
          ? ('click to fire - reaches ' + reach + 'm')
          : ('SPACE to equip - fires to ' + reach + 'm');
      }
      return inHand
        ? ('click to swing - ' + reach + 'm reach')
        : ('SPACE to equip - swung at ' + reach + 'm');
    }
    if (it.cat === 'armor') return 'click to wear it';
    if (it.cat === 'aid') {
      if (it.passive) return 'worn - it works while you carry it';
      const s = it.stats || {};
      if (s.food > 0) return 'SPACE to eat';
      if (s.thirst > 0) return 'SPACE to drink';
      if (s.heal > 0) return 'SPACE to heal';
      if (s.rad < 0) return 'SPACE to take';
      return 'SPACE to use';
    }
    if (it.cat === 'ammo') return 'goes into your ammo count';
    return '';
  };

  /* The first thing in your bar that is food. A hungry player needs to be
     told what to press, not only where to walk. */
  VG.carriedFood = function (p) {
    p = p || VG.Player;
    if (!p || !p.hotbar) return null;
    for (let i = 0; i < p.hotbar.length; i++) {
      const id = p.hotbar[i];
      if (!id) continue;
      const it = VG.item(id);
      if (it && it.cat === 'aid' && !it.passive && it.stats && it.stats.food > 0) {
        return { id: id, item: it, slot: i };
      }
    }
    return null;
  };

  /* ---------- damage & hazards ---------- */
  VG.damagePlayer = function (p, amount, cause) {
    const armor = VG.playerArmor(p);
    const dealt = Math.max(1, amount - armor * 0.5);
    p.hp -= dealt;
    p.lastDamage = performance.now();
    if (VG.Audio) VG.Audio.hurt();
    if (VG.FX) { VG.FX.addShake(4 + Math.min(6, dealt * 0.35)); VG.FX.hurtFlash(0.5 + Math.min(0.5, dealt / 30)); }
    if (p.hp <= 0) { p.hp = 0; if (VG.onDeath) VG.onDeath(cause || 'unknown'); }
    return dealt;
  };

  /* ---------- walking ---------- */
  /* Where the player is looking, in radians. The pointer chooses it, and the
     figure turns to it whether the player is moving or not. A pointer
     sitting on top of the player has no direction in it, so the last
     heading is kept rather than letting the figure twitch between two
     angles. */
  VG.heading = function (p, mw) {
    if (!p) return 0;
    const last = (typeof p.aim === 'number') ? p.aim
      : ((typeof p.face === 'number') ? p.face : 0);
    const m = mw || (VG.mouse ? VG.mouse.world : null);
    if (!m) return last;
    const dx = m.x - p.x, dy = m.y - p.y;
    if (dx * dx + dy * dy < 64) return last;
    return Math.atan2(dy, dx);
  };

  /* Which way the player wants to go, in world space.
     The mouse chooses the heading; the keyboard chooses how to use it.
     W walks toward the pointer, S walks away from it, and A and D step
     sideways across it. The keys are measured against the heading and not
     against the screen, so the character has exactly one frame of reference
     - the way it is facing - and the two can never disagree. */
  /* The other way to walk. Plenty of people come to a top-down game with
     their hands already trained: W is up the screen, whatever the figure is
     looking at. That is a setting now (Options), not an argument - the
     pointer still aims, and only the meaning of the four keys changes. */
  VG.moveMode = 'pointer';
  VG.setMoveMode = function (m) {
    VG.moveMode = (m === 'screen') ? 'screen' : 'pointer';
    try { localStorage.setItem('verdigris.move', VG.moveMode); } catch (e) { /* private mode */ }
  };
  VG.loadMoveMode = function () {
    let v = null;
    try { v = localStorage.getItem('verdigris.move'); } catch (e) { /* private mode */ }
    VG.moveMode = (v === 'screen') ? 'screen' : 'pointer';
  };

  VG.moveVector = function (p, input) {
    if (VG.moveMode === 'screen') {
      const sx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const sy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      const sm = Math.hypot(sx, sy);
      if (sm < 1e-6) return { x: 0, y: 0, moving: false };
      return { x: sx / sm, y: sy / sm, moving: true };
    }
    const a = (typeof p.aim === 'number') ? p.aim
      : ((typeof p.face === 'number') ? p.face : 0);
    const fx = Math.cos(a), fy = Math.sin(a);
    const rx = -fy, ry = fx;          /* the heading's own right-hand side */
    let vx = 0, vy = 0;
    if (input.up) { vx += fx; vy += fy; }
    if (input.down) { vx -= fx; vy -= fy; }
    if (input.right) { vx += rx; vy += ry; }
    if (input.left) { vx -= rx; vy -= ry; }
    const mag = Math.hypot(vx, vy);
    if (mag < 1e-6) return { x: 0, y: 0, moving: false };
    return { x: vx / mag, y: vy / mag, moving: true };
  };

  /* ---------- the needs clock ---------- */
  /* One table, used in both the outdoor and the indoor update. They used to
     be two sets of numbers written at different times and never compared,
     and a surveyor could walk into a diner and dry out twice as fast as he
     did on the flats. A clock that runs at two speeds is not a clock. */
  VG.NEED_RATE = {
    food: 0.062, foodMove: 0.040,
    water: 0.110, waterMove: 0.070,
    doseDecay: 0.20
  };

  /* ---------- main update ---------- */
  VG.updatePlayer = function (p, dt, input, world) {
    const sp = VG.sprint && p.stam > 2 ? p.speed * 1.62 : p.speed;
    const mv = VG.moveVector(p, input);
    if (mv.moving) {
      const b = world.biomeAt(Math.floor(p.x / VG.TILE), Math.floor(p.y / VG.TILE));
      const walk = VG.BIOME[b].walk;
      p.x += mv.x * sp * dt / walk;
      p.y += mv.y * sp * dt / walk;
      /* the way you are travelling, which is not the way you are facing:
         walking backwards is the one case where the two disagree, and the
         renderer needs to know which is which */
      p.face = Math.atan2(mv.y, mv.x);
      p.moving = true;
    } else p.moving = false;

    /* stamina */
    if (VG.sprint && mv.moving && p.stam > 0) p.stam -= 15 * dt;
    else p.stam = Math.min(100, p.stam + (mv.moving ? 5.5 : 12) * dt);

    /* needs. These are a clock, not a sprint: the flats are meant to be
       explored, and a survey that ends in thirty seconds of dehydration is
       not a survey. The clocks used to run out in five minutes of walking,
       which meant the flats could not be crossed and the whole survey had
       to happen in one held breath. Now a canteen is a working day's worth
       of walking and a tin is two. You still have to think about it - the
       flats have rations in them - but you can cross the country and come
       back. */
    p.food = Math.max(0, p.food - (VG.NEED_RATE.food + (mv.moving ? VG.NEED_RATE.foodMove : 0)) * dt);
    p.water = Math.max(0, p.water - (VG.NEED_RATE.water + (mv.moving ? VG.NEED_RATE.waterMove : 0)) * dt);
    if (p.food <= 0) p.hp -= 0.9 * dt;
    if (p.water <= 0) p.hp -= 1.4 * dt;

    /* dose: reactor yard, ash storms, and the refinery perimeter.
       The yard is where three of the files keep their evidence, so it has
       to be a place you go and come back from, not a place that ends you.
       The field around it is stronger than it was and the harm starts
       earlier - you feel it before it finishes you, and the survey dust
       filter is what makes the yard survivable rather than merely
       survivable for a while. */
    const tx = Math.floor(p.x / VG.TILE), ty = Math.floor(p.y / VG.TILE);
    const b = world.biomeAt(tx, ty);
    const dYard = VG.dist(tx, ty, world.yard.x, world.yard.y);
    let doseRate = 0;
    if (b === VG.BIOME.indexOf(VG.BIOME.find((z) => z.key === 'refinery'))) doseRate = 1.9;
    else if (b === VG.BIOME.indexOf(VG.BIOME.find((z) => z.key === 'salt'))) doseRate = 0.30;
    else if (b === VG.BIOME.indexOf(VG.BIOME.find((z) => z.key === 'dune'))) doseRate = 0.16;
    if (dYard < 46) doseRate += (46 - dYard) * 0.10;
    if (VG.weather && VG.weather.haze) doseRate += 0.75;
    if (p.inv['aid_filter'] > 0) doseRate *= 0.35;
    p.dose = VG.clamp(p.dose + doseRate * dt - (p.dose > 0 ? VG.NEED_RATE.doseDecay * dt : 0), 0, 100);
    if (p.dose > 48) p.hp -= (p.dose - 48) * 0.09 * dt;
    if (p.dose > 76) p.hp -= (p.dose - 76) * 0.22 * dt;
    p.hp = Math.min(p.maxhp, p.hp);
    if (p.hp <= 0 && VG.onDeath) VG.onDeath('exposure');

    /* regen when fed and watered */
    if (p.hp < p.maxhp && p.food > 25 && p.water > 25 && p.dose < 40) {
      p.hp = Math.min(p.maxhp, p.hp + 0.85 * dt);
    }
  };

  /* ---------- movement inside a building ---------- */
  /* The flats have no collision at all: you walk through walls, cars and
     the reactor. A room needs to be a room, so indoors the player is a
     circle that is tested against every wall and every piece of furniture
     and slides along them. The needs still tick - you get thirsty in a
     diner - but the dose does not, because you are out of the wind. */
  VG.INDOOR = { pace: 0.94, sprint: 1.35 };
  VG.indoorPace = function () {
    const z = (VG.INT && VG.INT.zoom > 1) ? VG.INT.zoom : 1;
    return VG.INDOOR.pace / z;
  };
  VG.updatePlayerInterior = function (p, dt, input, room) {
    if (!room) return;
    const solids = room.solids || [];
    const tpl = room.tpl;
    /* A room is drawn up to twice the size of the flats, so the same walking
       pace crossed the screen twice as fast in here as it did out there -
       the figure skated across a diner in a second. The pace is divided by
       the zoom, so a step looks the same length indoors and out. */
    const sp = (VG.sprint && p.stam > 2 ? p.speed * VG.INDOOR.sprint : p.speed) * VG.indoorPace();
    const mv = VG.moveVector(p, input);
    if (mv.moving) {
      /* The move is taken in short sub-steps. A single large step can
         jump straight over a counter and land on the far side of it, which
         is how a player walks through a wall on a slow frame. Nothing here
         is thinner than a hand, so a five-pixel step cannot miss one. */
      const total = sp * dt;
      const steps = Math.max(1, Math.ceil(total / 5));
      const mx = (mv.x * total) / steps, my = (mv.y * total) / steps;
      for (let i = 0; i < steps; i++) {
        /* one axis at a time, so a wall slides you along it instead of
           sticking you to it */
        const nx = p.x + mx;
        if (!VG.blockedInRoom(nx, p.y, p.r, solids, tpl)) p.x = nx;
        const ny = p.y + my;
        if (!VG.blockedInRoom(p.x, ny, p.r, solids, tpl)) p.y = ny;
      }
      p.face = Math.atan2(mv.y, mv.x);
      p.moving = true;
    } else p.moving = false;

    /* stamina */
    if (VG.sprint && mv.moving && p.stam > 0) p.stam -= 15 * dt;
    else p.stam = Math.min(100, p.stam + (mv.moving ? 5.5 : 12) * dt);

    /* needs. The same clock as outdoors - see VG.NEED_RATE. */
    p.food = Math.max(0, p.food - (VG.NEED_RATE.food + (mv.moving ? VG.NEED_RATE.foodMove : 0)) * dt);
    p.water = Math.max(0, p.water - (VG.NEED_RATE.water + (mv.moving ? VG.NEED_RATE.waterMove : 0)) * dt);
    if (p.food <= 0) p.hp -= 0.9 * dt;
    if (p.water <= 0) p.hp -= 1.4 * dt;
    p.dose = Math.max(0, p.dose - VG.NEED_RATE.doseDecay * dt);
    if (p.hp < p.maxhp && p.food > 25 && p.water > 25 && p.dose < 40) {
      p.hp = Math.min(p.maxhp, p.hp + 0.85 * dt);
    }
    p.hp = Math.min(p.maxhp, p.hp);
    if (p.hp <= 0 && VG.onDeath) VG.onDeath('exposure');
  };

  /* Is the player standing inside a wall or a piece of furniture? */
  VG.blockedInRoom = function (x, y, r, solids, tpl) {
    if (!tpl) return false;
    if (x - r < 0 || y - r < 0 || x + r > tpl.w || y + r > tpl.h) return true;
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      if (x + r > s.x && x - r < s.x + s.w && y + r > s.y && y - r < s.y + s.h) return true;
    }
    return false;
  };

  /* ---------- the torch ---------- */
  /* Where the torch is burning, in world coordinates. The torch is a light
     source first and a weapon second: it keeps burning in the pack, so
     putting a gun in your hand does not put you in the dark - and the light
     you are standing in always has a visible source. Returns null when the
     torch is not with you at all. */
  VG.torchLight = function (p) {
    if (!p) return null;
    const held = p.weapon === 'wpn_scrap_torch';
    const carried = held || (p.inv && p.inv['wpn_scrap_torch'] > 0);
    if (!carried) return null;
    const face = (typeof p.aim === 'number') ? p.aim
      : ((typeof p.face === 'number') ? p.face : 0);
    const fx = Math.cos(face), fy = Math.sin(face);
    const nx = -fy, ny = fx;
    /* in your hand the flame is out in front of you; in the pack it burns at
       your off hand. The light and the flame have to be in the same place -
       a pool of light with nothing in it is a lie the player has to trust. */
    const out = held ? 14.0 : -3.0;
    const side = held ? 4.6 : -4.6;
    return { x: p.x + fx * out + nx * side, y: p.y + fy * out + ny * side, held: held };
  };

  /* ---------- combat ---------- */
  VG.playerWeapon = function (p) { return p.weapon ? VG.item(p.weapon) : null; };

  /* A weapon is fired rather than swung when it has an ammunition type and
     enough reach to shoot at something. The old rule - range 150 or more -
     quietly turned the Dust Pump, the sawn-off and the flare pistol into
     melee swings, because their ranges had been written as effective-reach
     numbers instead of as a yes/no flag. A shotgun that hits with a
     thirty-pixel arc instead of firing shells is not a shotgun. */
  VG.isRangedWeapon = function (w) {
    if (!w || !w.ammo) return false;
    return (w.stats.range || 0) >= 75;
  };

  /* Every mod a weapon carries does something. The Field Kit prints these
     as tags, so a tag the engine ignores is a promise the game does not
     keep - and the player has no way to tell which are real. */
  VG.attackDamage = function (p) {
    const w = VG.playerWeapon(p);
    if (!w) return 4;
    let d = w.stats.dmg || 6;
    for (const m of (w.mods || [])) {
      if (m === 'heavy') d *= 1.22;
      if (m === 'rapid') d *= 0.82;
      if (m === 'accurate') d *= 1.18;
    }
    return d;
  };
  VG.attackRange = function (p) {
    const w = VG.playerWeapon(p);
    return (w && w.stats.range ? w.stats.range : 90);
  };
  /* `rate` is rate of fire, so higher is faster. It used to be ADDED into
     the cooldown, which meant the weapons named 'rapid' were the slowest
     in the game and the bolt rifles were the fastest. The tags then mean
     what they say: a heavy weapon swings slower, a rapid one faster. */
  VG.attackCooldown = function (p) {
    const w = VG.playerWeapon(p);
    if (!w || !w.stats.rate) return 0.6;
    let cd = 1.15 - w.stats.rate * 0.14;
    const mods = w.mods || [];
    if (mods.indexOf('heavy') >= 0) cd *= 1.10;
    if (mods.indexOf('rapid') >= 0) cd *= 0.85;
    return VG.clamp(cd, 0.16, 1.2);
  };
  /* ---------- how the flats move ---------- */
  /* The Rusted used to walk at 66, half the player's pace. That meant
     nothing on the flats could ever catch you, the survey was a walk in a
     park, and a health bar was decoration. They are faster than a walking
     player now.

     The numbers are close together on purpose. A rusted closes on a
     walking player at six pixels a second - slow enough that you can feel
     it happening and cannot walk it off. The lunge is what actually takes
     ground back, and the lunge is dodgeable, so the answer is never "run
     forever". A sprint still outruns every one of them, but a sprint is
     not a thing you can do for four minutes. */
  /* That was the theory. In play it meant a Rusted went from noticing you
     to hitting you in a second and a half, with a revolver that fires every
     three quarters of a second - nobody shot anything before it was on top
     of them. So how hard the flats push is a setting now (Options), and the
     default lets you fight:

     - they are slower than your walk, so backing away while you shoot works;
     - when one first notices you it stops and stares for a beat (`beat`)
       before it comes, which is the time to raise the gun;
     - the old numbers are still here, as Harsh. */
  VG.FIGHT = {
    gentle: {
      label: 'Gentle', speed: { rusted: 92, warden: 102, drover: 118 }, dmg: 0.6, beat: 1.2,
      blurb: 'They are slow, they hit softly, and they take a long look before they come. For reading the flats rather than fighting them.'
    },
    fair: {
      label: 'Fair', speed: { rusted: 108, warden: 118, drover: 140 }, dmg: 1, beat: 0.8,
      blurb: 'Slower than your walk, except the Drover. You have time to aim, and backing away while you shoot works.'
    },
    harsh: {
      label: 'Harsh', speed: { rusted: 138, warden: 152, drover: 170 }, dmg: 1, beat: 0.3,
      blurb: 'Everything outruns a walk and comes the moment it sees you. Sprint, or shoot first.'
    }
  };
  VG.fightMode = 'fair';
  VG.fight = function () { return VG.FIGHT[VG.fightMode] || VG.FIGHT.fair; };
  VG.setFightMode = function (m) {
    VG.fightMode = VG.FIGHT[m] ? m : 'fair';
    try { localStorage.setItem('verdigris.fight', VG.fightMode); } catch (e) { /* private mode */ }
  };
  VG.loadFightMode = function () {
    let v = null;
    try { v = localStorage.getItem('verdigris.fight'); } catch (e) { /* private mode */ }
    VG.fightMode = VG.FIGHT[v] ? v : 'fair';
  };
  /* the default table, kept under its old name */
  VG.ENEMY_SPEED = VG.FIGHT.fair.speed;

  VG.enemySpeed = function (kind) {
    const s = VG.fight().speed;
    return s[kind] || s.rusted;
  };

  /* ---------- helping the shot land ---------- */
  /* "The round goes exactly where the reticle is" sounds fair and is not:
     the round takes a quarter of a second to cross 200 metres, and by then
     a walking Rusted has moved three body widths. To hit one you had to aim
     at where it was going to be, and nothing told you that.
     With this on, a shot aimed at or near something is sent to where that
     thing will be when the round arrives. You still choose the target and
     you still have to be pointing at it; the lead is done for you. */
  VG.ASSIST = { near: 48, cone: 0.11 };
  VG.aimAssist = true;
  VG.setAimAssist = function (on) {
    VG.aimAssist = !!on;
    try { localStorage.setItem('verdigris.assist', VG.aimAssist ? '1' : '0'); } catch (e) { /* private mode */ }
  };
  VG.loadAimAssist = function () {
    let v = null;
    try { v = localStorage.getItem('verdigris.assist'); } catch (e) { /* private mode */ }
    VG.aimAssist = v !== '0';
  };
  VG.assistTarget = function (p, world, m, reach, sp) {
    if (!VG.aimAssist || !p || !world || !world.enemies || !m) return null;
    const aim = Math.atan2(m.y - p.y, m.x - p.x);
    let best = null, bs = 1e9;
    for (const e of world.enemies) {
      if (!e || e.dead) continue;
      const ex = e.x * VG.TILE, ey = e.y * VG.TILE;
      const d = VG.dist(p.x, p.y, ex, ey);
      if (d > reach + 30 || d < 1) continue;
      const a = Math.atan2(ey - p.y, ex - p.x);
      const da = Math.abs(((a - aim + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const dm = VG.dist(m.x, m.y, ex, ey);
      if (dm > VG.ASSIST.near && da > VG.ASSIST.cone) continue;
      const score = Math.min(dm / VG.ASSIST.near, da / VG.ASSIST.cone);
      if (score < bs) { bs = score; best = e; }
    }
    if (!best) return null;
    const bx = best.x * VG.TILE, by = best.y * VG.TILE;
    const vx = best.vx || 0, vy = best.vy || 0;
    let tx = bx, ty = by;
    for (let i = 0; i < 2; i++) {
      const t = VG.dist(p.x, p.y, tx, ty) / (sp || 760);
      tx = bx + vx * t; ty = by + vy * t;
    }
    return { e: best, x: tx, y: ty, ang: Math.atan2(ty - p.y, tx - p.x) };
  };

  /* The lunge. The windup is the whole of it: the Rusted stops, and the
     lane it will travel down is drawn on the ground along the direction it
     was facing when it stopped. Walk out of the lane and it misses. A
     lunge you cannot dodge is not a threat, it is a tax. */
  VG.LUNGE = {
    windup: 0.7,    /* how long the tell is on the ground */
    range: 120,     /* how close it has to be to start one */
    speed: 420,     /* how fast the lane is travelled */
    dist: 130,      /* how far down the lane it goes */
    time: 0.55,     /* and how long it is allowed to take */
    cd: 2.4         /* and how long before it tries again */
  };

  /* how far off the Rusted notice you. A silenced weapon does not carry. */
  VG.aggroRange = function (p) {
    const w = VG.playerWeapon(p);
    const silenced = !!(w && (w.mods || []).indexOf('silenced') >= 0);
    /* After dark they see further. The flats are lit by whatever is left
       of the mast and the town, and the same thing that lets you work
       the country at night is the thing that makes you easier to find.
       It is also the reason a long gun matters: most of them do not reach
       as far as a night look. */
    const night = !!(VG.state && VG.isNight && VG.isNight(VG.state.time));
    return silenced ? (night ? 150 : 120) : (night ? 300 : 240);
  };
  /* A shot is a noise. The Rusted hear it, and a noise tells them where
     you are. Without this, firing at something that has not noticed you yet
     does nothing at all: the round may hit, but the flats stay quiet and the
     fight never starts - which is exactly what "the gun only works when it
     is on top of you" looks like from the player's side.
     A shot carries as far as the round flies, so the number on the weapon
     means two things: how far you can hit, and how far you can be heard.
     A silenced weapon carries nothing beyond the distance at which they
     would have seen you anyway. */
  VG.shotAlert = function (p, world, reach) {
    if (!world || !world.enemies) return;
    const w = VG.playerWeapon(p);
    const silenced = w && (w.mods || []).indexOf('silenced') >= 0;
    const r = silenced ? Math.min(reach, VG.aggroRange(p)) : reach;
    for (const e of world.enemies) {
      if (e.dead) continue;
      const ex = e.x * VG.TILE, ey = e.y * VG.TILE;
      if (VG.dist(p.x, p.y, ex, ey) <= r) e.aggro = 2.2;
    }
  };
  /* how much further you can see into the dark */
  VG.playerScope = function (p) {
    const w = VG.playerWeapon(p);
    if (w && (w.mods || []).indexOf('nightvision') >= 0) return 150;
    return 0;
  };
  /* the armour you are actually wearing, after the plate gets the benefit
     of being tough */
  VG.playerArmor = function (p) {
    const it = p.armor ? VG.item(p.armor) : null;
    if (!it) return 0;
    let a = it.stats.armor || 0;
    if ((it.mods || []).indexOf('tough') >= 0) a *= 1.3;
    return a;
  };
})(window.VG);
