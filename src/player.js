/* VERDIGRIS — player state, needs, inventory */
window.VG = window.VG || {};
(function (VG) {
  'use strict';

  VG.Player = null;

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
      knownFacts: {},             // factId -> caseId
      readClues: {},              // clueId -> true
      solvedSolutions: {},        // solutionId -> caseId
      foundClues: {},             // caseId -> [clueIds]
      xp: 0, level: 1,
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
    p.inv['aid_field_dressing'] = 1;
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
    p.inv['ammo_slug'] = 6;
    p.ammo['ammo_slug'] = 6;
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
  VG.CARRY = 140;

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
    return null;
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
    if (p.hp <= 0) { p.hp = 0; if (VG.onDeath) VG.onDeath(cause || 'unknown'); }
    return dealt;
  };

  /* ---------- main update ---------- */
  VG.updatePlayer = function (p, dt, input, world) {
    const sp = VG.sprint && p.stam > 2 ? p.speed * 1.62 : p.speed;
    let vx = 0, vy = 0;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    const mag = Math.hypot(vx, vy);
    if (mag > 0) {
      vx /= mag; vy /= mag;
      const b = world.biomeAt(Math.floor(p.x / VG.TILE), Math.floor(p.y / VG.TILE));
      const walk = VG.BIOME[b].walk;
      p.x += vx * sp * dt / walk;
      p.y += vy * sp * dt / walk;
      p.face = Math.atan2(vy, vx);
      p.moving = true;
    } else p.moving = false;

    /* stamina */
    if (VG.sprint && mag > 0 && p.stam > 0) p.stam -= 15 * dt;
    else p.stam = Math.min(100, p.stam + (mag > 0 ? 5.5 : 12) * dt);

    /* needs. These are a clock, not a sprint: the flats are meant to be
       explored, and a survey that ends in thirty seconds of dehydration is
       not a survey. Water is the fastest of the three. */
    p.food = Math.max(0, p.food - (0.14 + (mag > 0 ? 0.09 : 0)) * dt);
    p.water = Math.max(0, p.water - (0.22 + (mag > 0 ? 0.12 : 0)) * dt);
    if (p.food <= 0) p.hp -= 0.9 * dt;
    if (p.water <= 0) p.hp -= 1.4 * dt;

    /* dose: reactor yard, ash storms, and the refinery perimeter */
    const tx = Math.floor(p.x / VG.TILE), ty = Math.floor(p.y / VG.TILE);
    const b = world.biomeAt(tx, ty);
    const dYard = VG.dist(tx, ty, world.yard.x, world.yard.y);
    let doseRate = 0;
    if (b === VG.BIOME.indexOf(VG.BIOME.find((z) => z.key === 'refinery'))) doseRate = 1.9;
    else if (b === VG.BIOME.indexOf(VG.BIOME.find((z) => z.key === 'salt'))) doseRate = 0.30;
    else if (b === VG.BIOME.indexOf(VG.BIOME.find((z) => z.key === 'dune'))) doseRate = 0.16;
    if (dYard < 46) doseRate += (46 - dYard) * 0.075;
    if (VG.weather && VG.weather.haze) doseRate += 0.75;
    if (p.inv['aid_filter'] > 0) doseRate *= 0.35;
    p.dose = VG.clamp(p.dose + doseRate * dt - (p.dose > 0 ? 0.16 * dt : 0), 0, 100);
    if (p.dose > 55) p.hp -= (p.dose - 55) * 0.09 * dt;
    if (p.dose > 82) p.hp -= (p.dose - 82) * 0.22 * dt;
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
  VG.updatePlayerInterior = function (p, dt, input, room) {
    if (!room) return;
    const solids = room.solids || [];
    const tpl = room.tpl;
    const sp = (VG.sprint && p.stam > 2 ? p.speed * 1.55 : p.speed) * 0.94;
    let vx = 0, vy = 0;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    const mag = Math.hypot(vx, vy);
    if (mag > 0) {
      vx /= mag; vy /= mag;
      /* The move is taken in short sub-steps. A single large step can
         jump straight over a counter and land on the far side of it, which
         is how a player walks through a wall on a slow frame. Nothing here
         is thinner than a hand, so a five-pixel step cannot miss one. */
      const total = sp * dt;
      const steps = Math.max(1, Math.ceil(total / 5));
      const mx = (vx * total) / steps, my = (vy * total) / steps;
      for (let i = 0; i < steps; i++) {
        /* one axis at a time, so a wall slides you along it instead of
           sticking you to it */
        const nx = p.x + mx;
        if (!VG.blockedInRoom(nx, p.y, p.r, solids, tpl)) p.x = nx;
        const ny = p.y + my;
        if (!VG.blockedInRoom(p.x, ny, p.r, solids, tpl)) p.y = ny;
      }
      p.face = Math.atan2(vy, vx);
      p.moving = true;
    } else p.moving = false;

    /* stamina */
    if (VG.sprint && mag > 0 && p.stam > 0) p.stam -= 15 * dt;
    else p.stam = Math.min(100, p.stam + (mag > 0 ? 5.5 : 12) * dt);

    /* needs */
    p.food = Math.max(0, p.food - (0.14 + (mag > 0 ? 0.09 : 0)) * dt);
    p.water = Math.max(0, p.water - (0.22 + (mag > 0 ? 0.12 : 0)) * dt);
    if (p.food <= 0) p.hp -= 0.9 * dt;
    if (p.water <= 0) p.hp -= 1.4 * dt;
    p.dose = Math.max(0, p.dose - 0.16 * dt);
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
  /* how far off the Rusted notice you. A silenced weapon does not carry. */
  VG.aggroRange = function (p) {
    const w = VG.playerWeapon(p);
    if (w && (w.mods || []).indexOf('silenced') >= 0) return 120;
    return 240;
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
