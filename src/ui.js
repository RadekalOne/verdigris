/* VERDIGRIS — HUD and panels */
window.VG = window.VG || {};
(function (VG) {
  'use strict';

  let qState = {};               // deductionId -> { answer, evidence: [] }
  let qCur = null;               // the question the player is working on
  let invTab = 'gear';
  let jrTab = 'cases';
  let openCase = null;
  let openPanel = null;
  let lastCommsKey = '';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };

  VG.log = function (msg, cls) {
    const box = $('#log');
    if (!box) return;
    const d = el('div', cls || '', msg);
    box.appendChild(d);
    while (box.children.length > 7) box.removeChild(box.firstChild);
    setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 11000);
  };

  VG.showPanel = function (id) {
    $$('.panel').forEach((p) => p.classList.remove('on'));
    if (id) {
      const p = document.getElementById(id);
      if (p) p.classList.add('on');
    }
    if (VG.Audio) VG.Audio.click();
    openPanel = id || null;
    VG.paused = !!id;
    if (VG.Help) VG.Help.refresh();
    if (id === 'journal') VG.renderJournal();
    if (id === 'inv') VG.renderInv();
    if (id === 'map') VG.renderMap();
    if (id === 'codex') VG.renderCodex();
    if (id === 'craft') VG.renderCraft();
    if (id === 'contracts') VG.renderContracts();
    if (id === 'options') VG.renderOptions();
  };
  VG.closePanel = function () { VG.showPanel(null); };

  /* ================= HUD ================= */
  VG.drawHud = function (p, world, state) {
    const setBar = (id, v, max) => {
      const e = document.getElementById(id);
      if (e) e.style.width = VG.clamp((v / max) * 100, 0, 100) + '%';
    };
    setBar('b-stam', p.stam, 100);
    setBar('b-food', p.food, 100);
    setBar('b-water', p.water, 100);
    setBar('b-dose', p.dose, 100);
    const bd = document.getElementById('bar-dose');
    if (bd) bd.className = 'bar fill-dose' + (p.dose > 78 ? ' crit' : p.dose > 48 ? ' hot' : '');

    /* low-need states: the bar pulses and the card says what is wrong */
    const needLvl = (v) => (v <= 15 ? 'crit' : v <= 30 ? 'low' : '');
    const markBar = (id, lvl) => {
      const e = document.getElementById(id);
      if (!e) return;
      const base = e.className.replace(/\s+(low|crit)\b/g, '');
      e.className = base + (lvl ? ' ' + lvl : '');
    };
    markBar('bar-stam', needLvl(p.stam));
    markBar('bar-food', needLvl(p.food));
    markBar('bar-water', needLvl(p.water));

    const warn = document.getElementById('needs-warn');
    if (warn) {
      const msgs = [];
      if (p.water <= 30) msgs.push('water low');
      if (p.food <= 30) msgs.push('food low');
      if (p.dose >= 55) msgs.push('dose high');
      if (p.stam <= 15) msgs.push('exhausted');
      warn.textContent = msgs.join(' · ');
      warn.classList.toggle('show', msgs.length > 0);
    }

    // factions
    const rep = $('#rep');
    if (rep) {
      const f = (VG.FACTIONS || []);
      let h = '';
      for (const fa of f) {
        const v = p.rep[fa.id] || 0;
        const col = v >= 6 ? '#93b45a' : v <= -6 ? '#d06a4a' : fa.color;
        h += '<div class="r"><b style="color:' + col + '">' + fa.name + '</b><span>' + (v > 0 ? '+' : '') + v + '</span></div>';
      }
      h += '<div class="r" style="margin-top:4px;border-top:1px solid #2f382c;padding-top:4px"><b style="color:#e8b34a">Survey Office</b><span>Lv ' + p.level + '</span></div>';
      rep.innerHTML = h;
    }

    // compass
    const c = $('#compass');
    if (c) {
      /* One helper for both readings. The compass used to be turned a
         quarter turn out of true - it said south while you walked east -
         and a compass that lies is worse than no compass at all, because
         you stop trusting the one direction it is trying to tell you. */
      const dirs = VG.COMPASS || ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
      /* The compass has to agree with the figure. The figure faces the
         pointer, so the compass reads the pointer's bearing - not the
         direction of travel, which is a different thing the moment you
         walk backwards, and a compass that contradicts the figure is worse
         than no compass at all. */
      const look = (typeof p.aim === 'number') ? p.aim : (p.face || 0);
      const facing = VG.compassDir
        ? VG.compassDir(Math.cos(look), Math.sin(look))
        : dirs[Math.round((((look * 180 / Math.PI) % 360 + 360) % 360) / 45) % 8];
      /* inside a building the tile coordinates mean nothing on the map, so
         the readout names the room instead */
      if (VG.INT && VG.INT.active) {
        /* Inside a building the compass has to answer the only question
           that matters: which way is the door. */
        let sub = '';
        if (VG.INT.doorHint) {
          const hint = VG.INT.doorHint(p);
          if (hint) {
            const dd = VG.compassDir
              ? VG.compassDir(hint.dx, hint.dy)
              : dirs[Math.round((((Math.atan2(hint.dy, hint.dx) * 180 / Math.PI) % 360 + 360) % 360) / 45) % 8];
            sub = ' · <span class="muted">door ' + dd + ' ' + Math.round(hint.dist) + 'm</span>';
          }
        }
        c.innerHTML = '<b>' + facing + '</b> Inside · ' + VG.INT.active.tpl.title + sub;
      } else {
        const tgt = state.nearestPoi;
        let sub = '';
        if (tgt) {
          const ts = VG.worldToScreen(tgt.poi.x * VG.TILE, tgt.poi.y * VG.TILE);
          sub = ' · ' + tgt.poi.name + ' ' + Math.round(VG.dist(p.x, p.y, tgt.poi.x * VG.TILE, tgt.poi.y * VG.TILE)) + 'm';
        }
        c.innerHTML = '<b>' + facing + '</b> ' + Math.round(p.x / VG.TILE) + ', ' + Math.round(p.y / VG.TILE) + sub;
      }
    }

    // weather
    const w = $('#weather');
    if (w) {
      const names = { clear: 'Clear', haze: 'Corrosive Haze', wind: 'High Wind', rain: 'Rain', dust: 'Dust Storm' };
      const t = VG.timeOfDay(state.time);
      let note = 'Dose accumulates near Copper Mesa.';
      if (VG.weather.kind === 'haze') note = 'Dose accumulates outside. Keep a filter.';
      else if (VG.weather.kind === 'dust') note = 'Dust storm. Dose climbs fast — keep a filter.';
      else if (VG.weather.kind === 'wind') note = 'Wind is picking up. Visibility is poor.';
      w.innerHTML = '<div class="t">' + (names[VG.weather.kind] || 'Clear') + ' · ' + t.label + '</div>' +
        '<div class="d">' + note + '</div>';
    }

    /* radio traffic. The band is how the flats talk to you — it has to be
       readable at a glance while you are walking, so the last few lines sit
       under the rep card and never move. */
    const cl = document.getElementById('comms-list');
    if (cl) {
      const msgs = VG.DYN ? VG.DYN.recent(4) : [];
      const last = msgs.length ? msgs[msgs.length - 1] : null;
      const key = last ? (msgs.length + '|' + last.at + '|' + last.text) : '0';
      if (key !== lastCommsKey) {
        lastCommsKey = key;
        if (!msgs.length) {
          cl.innerHTML = '<div class="empty">Nothing on the band but carrier.</div>';
        } else {
          let h = '';
          for (const m of msgs) {
            h += '<div class="m ' + VG.htmlEscape(m.kind) + '"><span class="at">' + VG.htmlEscape(m.at) + '</span><b>' +
              VG.htmlEscape(m.who) + '</b> ' + VG.htmlEscape(m.text) + '</div>';
          }
          cl.innerHTML = h;
        }
      }
      const band = document.getElementById('comms-band');
      if (band && VG.DYN) {
        const P = VG.DYN.profile();
        band.textContent = P.label.toUpperCase() + ' BAND';
      }
    }

    /* pressure */
    const th = document.getElementById('threat');
    if (th && VG.DYN) {
      const t = VG.DYN.threat();
      const tl = th.querySelector('.t');
      if (tl) { tl.textContent = t.label; tl.style.color = t.color; }
      const td = th.querySelector('.d');
      if (td) td.textContent = t.detail;
      const fill = document.getElementById('threat-fill');
      if (fill) { fill.style.width = Math.round(t.heat) + '%'; fill.style.background = t.color; }
      const pr = th.querySelector('.prof');
      if (pr) {
        pr.textContent = 'Flats: ' + VG.DYN.profile().label + ' · helped ' + VG.DYN.helped;
      }
    }

    /* where the water is. A thirsty player should never have to guess. */
    const wh = document.getElementById('waterhint');
    let waterShown = false;
    if (wh) {
      const low = p.water <= 55;
      const cw = low && VG.closestWater ? VG.closestWater(p, world) : null;
      if (cw) {
        wh.style.display = 'block';
        waterShown = true;
        wh.innerHTML = '<div class="t">' + cw.poi.name + ' · ' + Math.round(cw.dist) + 'm ' + cw.dir + '</div>' +
          '<div class="d">Press R there to draw water.</div>';
      } else {
        wh.style.display = 'none';
      }
    }

    /* where the food is, and what to do about it. The same courtesy, the
       same panel. A pointer without an instruction is not help: it tells a
       hungry player where to walk and leaves them guessing what to press
       when they get there. */
    const fh = document.getElementById('foodhint');
    let foodShown = false;
    if (fh) {
      const hungry = p.food <= 55;
      const carried = VG.carriedFood ? VG.carriedFood(p) : null;
      const cf = (hungry && !carried && VG.closestFood) ? VG.closestFood(p, world) : null;
      if (carried) {
        fh.style.display = 'block';
        foodShown = true;
        fh.innerHTML = '<div class="t">' + VG.htmlEscape(carried.item.name) + ' in your bar</div>' +
          '<div class="d">Press SPACE to eat it. Press ' + (carried.slot + 1) + ' to pick that slot.</div>';
      } else if (cf) {
        fh.style.display = 'block';
        foodShown = true;
        fh.innerHTML = '<div class="t">' + VG.htmlEscape(cf.poi.name) + ' · ' + Math.round(cf.dist) + 'm ' + cf.dir + '</div>' +
          '<div class="d">' + VG.htmlEscape(cf.note || 'Provisions were kept there.') +
          ' Go inside and press E on a crate.</div>';
      } else {
        fh.style.display = 'none';
      }
    }
    /* the file the Office is working, and the kind of building it needs.
       This is the search loop in one card: it names the kind of place to
       walk to, and gives a bearing to the nearest one you have charted. A
       lead the player cannot act on is not a lead, and a building the
       Office has not charted is not a place to point at - that is the
       exploring the player came for. */
    let caseShown = false;
    const caseHint = document.getElementById('casehint');
    if (caseHint) {
      const want = VG.wantedTypes(p);
      if (!want.length) {
        caseHint.style.display = 'none';
      } else {
        caseShown = true;
        caseHint.style.display = 'block';
        const names = want.map((k) => VG.poiTypeName(k));
        let best = null, bd = Infinity;
        for (const poi of world.pois) {
          if (!poi.discovered) continue;
          if (want.indexOf(poi.type) < 0) continue;
          const d = VG.dist(p.x, p.y, poi.x * VG.TILE, poi.y * VG.TILE);
          if (d < bd) { bd = d; best = poi; }
        }
        /* The reactor yard is the one place on the map that will kill a
           surveyor who walks in unprepared. The Office knows its own plant,
           so the file says so rather than letting the player find out the
           hard way - and it says where the answer is, because a warning the
           player cannot act on is just a trap with better manners. */
        const yardWarn = want.indexOf('reactor_yard') >= 0
          ? '<div class="d" style="color:#c9533f;margin-top:4px">The reactor yard\'s air will kill you without a filter. The relay stations keep them.</div>'
          : '';
        if (best) {
          const dx = best.x * VG.TILE - p.x, dy = best.y * VG.TILE - p.y;
          caseHint.innerHTML = '<div class="t">' + VG.htmlEscape(VG.poiTypeName(best.type)) + ' · ' +
            Math.round(bd) + 'm ' + VG.compassDir(dx, dy) + '</div>' +
            '<div class="d">The file needs a ' + VG.htmlEscape(names.join(', a ')) + '. Go in and search it.</div>' + yardWarn;
        } else {
          caseHint.innerHTML = '<div class="t">Looking for a ' + VG.htmlEscape(names.join(', a ')) + '</div>' +
            '<div class="d">The Office has not charted one yet. Keep looking.</div>' + yardWarn;
        }
      }
    }
    const hintBox = document.getElementById('hints');
    if (hintBox) {
      hintBox.style.display = (waterShown || foodShown || caseShown) ? 'block' : 'none';
      /* The threat card sits under the hints, and the hints grow and shrink
         with what they have to say. Two of them at once pushes the card
         down, so the card below has to follow. */
      const threat = document.getElementById('threat');
      if (threat) {
        const h = (waterShown || foodShown || caseShown) ? (hintBox.offsetHeight || 44) : 0;
        threat.style.top = Math.round(276 + h + 8) + 'px';
      }
    }

    // hotbar
    const hb = $('#hotbar');
    if (hb) {
      let h = '';
      for (let i = 0; i < 5; i++) {
        const id = p.hotbar[i];
        const it = id ? VG.item(id) : null;
        /* a gun shows the rounds it has left */
        const qty = VG.slotCount ? VG.slotCount(p, id) : null;
        h += '<div class="slot' + (i === p.sel ? ' sel' : '') + '"><span class="k">' + (i + 1) + '</span>' +
          (it ? VG.htmlEscape(it.glyph) : '·') +
          (qty !== null && qty !== undefined ? '<span class="q">' + qty + '</span>' : '') + '</div>';
      }
      /* The name plate over the bar. A slot that shows a glyph and nothing
         else is a guessing game: the player has no way to tell a ration tin
         from a rivet sling, and no way to know that SPACE does anything at
         all. The plate names the selected slot and the key that uses it. */
      const selId = p.hotbar[p.sel];
      const selIt = selId ? VG.item(selId) : null;
      let plate = '';
      if (selIt) {
        const hint = VG.useHint ? VG.useHint(selIt, p) : '';
        plate = '<div id="slotinfo" class="on"><span class="k">SLOT ' + (p.sel + 1) + '</span><b>' +
          VG.htmlEscape(selIt.name) + '</b>' +
          (hint ? ' <span class="act">' + VG.htmlEscape(hint) + '</span>' : '') + '</div>';
      }
      hb.innerHTML = plate + '<div class="slots">' + h + '</div>';
    }

    // danger vignette
    const dz = $('#danger');
    if (dz) {
      const hurt = p.hp < 45 ? (45 - p.hp) / 45 : 0;
      const dose = p.dose > 60 ? (p.dose - 60) / 40 : 0;
      dz.style.opacity = Math.min(0.9, hurt * 0.75 + dose * 0.55);
    }

    VG.drawMinimap(p, world);
  };

  VG.htmlEscape = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  /* ================= minimap ================= */
  VG.drawMinimap = function (p, world) {
    const c = document.getElementById('mm');
    if (!c || !world) return;
    const g = c.getContext('2d');
    const S = c.width, k = S / world.W;
    g.clearRect(0, 0, S, S);
    g.fillStyle = '#10130e'; g.fillRect(0, 0, S, S);
    // biome pixels
    for (let y = 0; y < world.H; y += 2) {
      for (let x = 0; x < world.W; x += 2) {
        g.fillStyle = VG.BIOME[world.biome[y * world.W + x]].ground;
        g.globalAlpha = 0.55;
        g.fillRect(x * k, y * k, k * 2, k * 2);
      }
    }
    g.globalAlpha = 1;
    // roads
    g.fillStyle = '#2c2a25';
    for (let y = 0; y < world.H; y += 2) {
      for (let x = 0; x < world.W; x += 2) {
        if (world.isRoad(x, y)) g.fillRect(x * k, y * k, k * 2, k * 2);
      }
    }
    // pois
    for (const poi of world.pois) {
      /* wells and water towers show even when you have not been there — you
         need to know where the water is before you are dying of thirst */
      const isWater = (poi.type === 'well' || poi.type === 'watertower');
      if (!poi.discovered && !isWater) continue;
      if (isWater) {
        g.fillStyle = '#7fc4d8';
        g.fillRect(poi.x * k - 1.4, poi.y * k - 1.4, 3.4, 3.4);
        continue;
      }
      g.fillStyle = poi.tier >= 2 ? '#e8b34a' : '#8a8578';
      g.fillRect(poi.x * k - 1, poi.y * k - 1, 2.5, 2.5);
    }
    // clues: only the ones actually recovered read as cyan. A clue that has
    // not been found is not marked at all - it is a place to look for, and
    // marking all forty-seven of them hands the player the whole mystery
    // before they have taken a step.
    for (const cl of VG.visibleClues(world, VG.Player)) {
      g.fillStyle = '#7fc4d8';
      g.fillRect(cl.x * k - 1.5, cl.y * k - 1.5, 3, 3);
    }
    // live events — calls, raids, convoys. Marker coordinates are world
    // pixels, the minimap works in tiles.
    if (VG.DYN) {
      for (const mk of VG.DYN.markers(world)) {
        g.fillStyle = mk.kind === 'call' ? '#7fc4d8' : mk.kind === 'raid' ? '#d06a4a' : '#e8b34a';
        g.beginPath(); g.arc(mk.x / VG.TILE * k, mk.y / VG.TILE * k, 2.4, 0, VG.TAU); g.fill();
      }
    }
    // player. Inside a building the player is at interior coordinates, so
    // the dot goes on the building they are in rather than at the top left
    // of the map.
    const inside = VG.INT && VG.INT.active;
    const px = inside ? VG.INT.doorWorld(VG.INT.active.poi).x : p.x;
    const py = inside ? VG.INT.doorWorld(VG.INT.active.poi).y : p.y;
    g.fillStyle = inside ? '#e8b34a' : '#d6d1c3';
    g.beginPath(); g.arc(px / VG.TILE * k, py / VG.TILE * k, 2.6, 0, VG.TAU); g.fill();
  };

  /* ================= inventory ================= */
  /* Put something down. The pack has a limit, and a limit the player cannot
     act on is just a wall. */
  VG.dropItem = function (id) {
    const p = VG.Player;
    if (!p) return;
    const n = VG.invDrop(p, id, 1);
    if (n <= 0) return;
    const it = VG.item(id);
    VG.log('Put down: ' + (it ? it.name : id), '');
    if (VG.Audio) VG.Audio.pickup();
    VG.renderInv();
  };

  VG.renderInv = function () {
    const p = VG.Player, body = $('#inv-body');
    if (!body) return;
    const car = $('#inv-car');
    if (car) {
      const w = VG.invWeight(p);
      car.textContent = w + ' / ' + VG.CARRY + ' load';
      car.style.color = w > VG.CARRY ? '#c9533f' : '';
    }
    const cats = { gear: ['weapon', 'armor', 'misc', 'key', 'ammo'], mat: ['mat'], aid: ['aid'], intel: ['intel'] };
    const list = cats[invTab] || [];
    const entries = Object.keys(p.inv).filter((id) => {
      const it = VG.item(id);
      return it && list.indexOf(it.cat) >= 0;
    }).sort((a, b) => {
      const A = VG.item(a), B = VG.item(b);
      return (B.rarity - A.rarity) || A.name.localeCompare(B.name);
    });
    if (!entries.length) { body.innerHTML = '<p class="muted">Nothing here.</p>'; return; }
    let h = '<div class="grid">';
    for (const id of entries) {
      const it = VG.item(id), n = p.inv[id];
      const mods = (it.mods || []).map((m) => '<span class="tag">' + m + '</span>').join('');
      const passive = it.passive ? '<span class="tag on">passive</span>' : '';
      /* Every row says what clicking it will do. A list of names with no
         verbs is a list the player cannot act on: this is the only place a
         weapon can be put in their hand, and it used to look like a
         shopping list. */
      let act = '';
      if (it.cat === 'weapon' && p.weapon === id) act = '<span class="tag on">in hand</span>';
      else if (it.cat === 'armor' && p.armor === id) act = '<span class="tag on">worn</span>';
      const hint = VG.useHint ? VG.useHint(it, p) : '';
      /* The verb is shown even for the weapon already in your hand. The
         "in hand" tag says where it is; the verb says what it does and how
         far it reaches, and the reach is the number that decides whether
         the gun is worth carrying. */
      const verb = hint
        ? '<span class="do">' + VG.htmlEscape(hint) + '</span>' : '';
      h += '<div class="listitem" data-use="' + id + '"><div class="n rar' + it.rarity + '">' +
        VG.htmlEscape(it.glyph) + '  ' + VG.htmlEscape(it.name) + ' <span class="muted">x' + n + '</span></div>' +
        '<div class="d">' + VG.htmlEscape(it.desc) + '</div>' +
        '<div class="meta">' + it.cat + ' · ' + it.val + ' scrap · ' + (it.w || 1) + ' load' +
        (verb ? ' · ' + verb : '') + mods + passive + act +
        ' · <span class="do" data-drop="' + id + '">put down</span></div></div>';
    }
    h += '</div>';
    body.innerHTML = h;
    body.querySelectorAll('[data-use]').forEach((e) => {
      e.onclick = () => VG.useItem(e.getAttribute('data-use'));
    });
    /* A pack you cannot empty is not a limit, it is a wall. */
    body.querySelectorAll('[data-drop]').forEach((e) => {
      e.onclick = (ev) => {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        VG.dropItem(e.getAttribute('data-drop'));
      };
    });
  };

  /* VG.useItem moved to player.js. It changes the player - it eats, it
     heals, it equips - so it is engine behaviour, and the engine should be
     testable without a screen. This module only draws the result. */

  /* ================= journal ================= */
  /* VG.allCases now lives in world.js. It is engine data, not a view
     concern, and main.js needed it before the interface was ever built. */

  VG.renderJournal = function () {
    const p = VG.Player, body = $('#jr-body');
    if (!body) return;
    const cases = VG.allCases();
    if (jrTab === 'cases') {
      if (openCase) {
        const c = cases.find((x) => x.id === openCase);
        if (!c) { openCase = null; }
        else {
          let h = '<div class="btn" id="jr-back">◂ ALL CASES</div><div style="height:10px"></div>' +
            '<h3 style="color:#e8b34a;font-size:14px;letter-spacing:.08em">' + VG.htmlEscape(c.title) + '</h3>' +
            '<p style="color:#8a8578;line-height:1.7;margin:6px 0 12px;white-space:pre-line">' + VG.htmlEscape(c.brief || '') + '</p>';
          h += '<h3 style="color:#7fc4d8;font-size:11px;letter-spacing:.12em;margin-bottom:5px">EVIDENCE LOCATED</h3>';
          for (const cl of (c.clues || [])) {
            if (p.readClues[cl.id]) {
              h += '<div class="cardx" style="margin-bottom:6px"><h3>' + VG.htmlEscape(cl.name) + '</h3><p class="pre">' +
                VG.htmlEscape(cl.text) + '</p><div class="meta">' + cl.type + '</div></div>';
            } else {
              /* the lead names the KIND of building. It used to print the
                 raw data key ("search the police"), which is a note to the
                 programmer, not a direction a player can walk in. */
              h += '<div class="cardx" style="margin-bottom:6px;opacity:.45"><h3>— not yet located —</h3>' +
                '<p class="muted">' + VG.htmlEscape(VG.clueLead(cl)) + '</p></div>';
            }
          }
          const facts = (c.facts || []).filter((f) => p.knownFacts[f.id]);
          h += '<h3 style="color:#7fc4d8;font-size:11px;letter-spacing:.12em;margin:12px 0 5px">ESTABLISHED (' + facts.length + ')</h3>';
          if (!facts.length) h += '<p class="muted">Nothing established yet.</p>';
          for (const f of facts) {
            h += '<div class="kv"><span style="color:#d6d1c3">' + VG.htmlEscape(f.label) + '</span></div>';
          }
          const sol = VG.canConclude(c, p);
          /* ---- the conclusions you can put on the file ----
             A file with more than one conclusion is a fork: the player is
             the one who decides which reading goes on it. The engine used
             to take the first conclusion the evidence happened to support
             and file that, which meant the ending was decided by the
             order the data was written in. */
          const opts = VG.conclusionOptions(c, p);
          const filedId = VG.filedConclusion(c, p);
          const filedSol = (c.solutions || []).find((x) => x.id === filedId);
          const fork = (c.solutions || []).length > 1;
          if (filedSol) {
            h += '<h3 style="color:#93b45a;font-size:11px;letter-spacing:.12em;margin:14px 0 5px">ON THE FILE</h3>';
            h += '<div class="cardx" style="border-color:#5d7a3a"><h3 style="color:#93b45a">' +
              VG.htmlEscape(filedSol.label) + '</h3><p class="pre">' + VG.htmlEscape(filedSol.epilogue || '') + '</p></div>';
            /* an investigator who does not like their own conclusion may
               reopen the file. It costs, and the reading being withdrawn is
               struck out along with the standing it bought. */
            const amendable = opts.filter((o) => o.ready && !o.filed);
            if (amendable.length) {
              h += '<h3 style="color:#e8b34a;font-size:11px;letter-spacing:.12em;margin:14px 0 5px">REOPEN THE FILE</h3>';
              h += '<p class="muted" style="margin-bottom:6px">The Office has the evidence for another reading. Reopening the file costs ' +
                VG.AMEND_COST + ' points of standing with the Ledger, and the reading you are withdrawing is struck out.</p>';
              for (const o of amendable) {
                h += '<div class="cardx" style="margin-bottom:8px"><h3>' + VG.htmlEscape(o.sol.label) + '</h3>' +
                  '<p class="muted">' + VG.htmlEscape(o.requires.map((r) => VG.factLabel(r)).join(' · ')) + '</p>' +
                  '<div class="btn prim" data-amend="' + o.sol.id + '">REOPEN AND FILE THIS READING</div></div>';
              }
            }
          } else {
            const showable = opts.filter((o) => o.ready || fork);
            if (showable.length) {
              h += '<h3 style="color:#e8b34a;font-size:11px;letter-spacing:.12em;margin:14px 0 5px">THE FINDINGS THIS FILE CAN CARRY</h3>';
              for (const o of showable) {
                if (!o.ready) {
                  h += '<div class="cardx" style="margin-bottom:8px;opacity:.5"><h3>— another reading —</h3>' +
                    '<p class="muted">The evidence for this one is not yet in your hands.</p></div>';
                  continue;
                }
                h += '<div class="cardx" style="margin-bottom:8px"><h3>' + VG.htmlEscape(o.sol.label) + '</h3>' +
                  '<p class="muted">Rests on: ' + VG.htmlEscape(o.requires.map((r) => VG.factLabel(r)).join(' · ')) + '</p>' +
                  '<div class="btn prim" data-file="' + o.sol.id + '">FILE THIS CONCLUSION</div></div>';
              }
            } else {
              h += '<div style="height:12px"></div><p class="muted">You do not yet have the evidence to close this file.</p>';
            }
          }
          /* the Office keeps a record of the theories it refused */
          const refused = (c.deductions || []).filter((d) => (p.rejectedTheories || {})[d.id]);
          if (refused.length) {
            const n = refused.reduce((a, d) => a + (p.rejectedTheories[d.id] || 0), 0);
            h += '<p class="muted" style="margin-top:10px">The file carries ' + n +
              (n === 1 ? ' rejected theory' : ' rejected theories') + '. The Office does not forget.</p>';
          }
          body.innerHTML = h;
          const back = document.getElementById('jr-back');
          if (back) back.onclick = () => { openCase = null; VG.renderJournal(); };
          body.querySelectorAll('[data-file]').forEach((e) => {
            e.onclick = () => { VG.fileConclusion(c, e.getAttribute('data-file'), p); };
          });
          body.querySelectorAll('[data-amend]').forEach((e) => {
            e.onclick = () => { VG.amendConclusion(c, e.getAttribute('data-amend'), p); };
          });
          return;
        }
      }
      let h = '';
      for (const c of cases) {
        const found = (p.foundClues[c.id] || []).length;
        const total = (c.clues || []).length;
        const done = (p.solvedSolutions[c.id] || []).length;
        const closed = done > 0;
        /* The Office works one file at a time. A file that has not been
           opened is sealed: it is listed so the player knows the survey has
           more than one chapter, but its title and its brief are not shown,
           because the point of a mystery is not knowing what is coming. */
        if (!closed && !VG.caseIsOpen(c, p)) {
          h += '<div class="listitem"><div class="n">— sealed — <span class="tag">chapter ' + c.chapter + '</span></div>' +
            '<div class="d">The Office opens one file at a time. Close the file you are working and this one is unsealed.</div></div>';
          continue;
        }
        const st = closed ? '<span class="tag on">closed</span>' : (found > 0 ? '<span class="tag">open</span>' : '<span class="tag">unopened</span>');
        h += '<div class="listitem" data-case="' + c.id + '"><div class="n">' + VG.htmlEscape(c.title) + ' ' + st + '</div>' +
          '<div class="d">Case file · chapter ' + c.chapter + ' · evidence ' + found + '/' + total + ' · conclusions ' + done + '/' + (c.solutions || []).length + '</div></div>';
      }
      body.innerHTML = h;
      body.querySelectorAll('[data-case]').forEach((e) => {
        e.onclick = () => { openCase = e.getAttribute('data-case'); VG.renderJournal(); };
      });
      return;
    }
    if (jrTab === 'evid') {
      /* The Office asks a question and the player answers it with the
         claim they believe and the evidence they are citing for it. It
         used to be a lock with two keys in it: pick the right pair of facts
         and the engine handed you the answer, and a player who did not
         understand the case could still get through by trying pairs.

         The whole file's questions are listed from the start. A question
         used to appear only once the player held every fact it rested on,
         which meant reading a fact announced that it was one of the inputs
         - the Office was telling the player what to go and look for. */
      const open = VG.openCase(p);
      let h = '';
      if (!open) {
        h = '<p class="muted">No file is open. Close the file you are working and the Office opens the next one.</p>';
      } else {
        const qs = VG.fileQuestions(open, p);
        if (!qs.length) {
          h = '<p class="muted">This file asks nothing of you.</p>';
        } else {
          /* the whole list, from the moment the file opens */
          h += '<div class="cardx"><h3 style="color:#e8b34a;letter-spacing:.1em">THE QUESTIONS ON THIS FILE</h3>';
          for (let i = 0; i < qs.length; i++) {
            const q = qs[i];
            const tag = q.done ? 'ANSWERED' : (q.ready ? 'ANSWERABLE' : 'THE OFFICE NEEDS ' + q.missing + ' MORE FACTS');
            h += '<div class="listitem' + (q.id === qCur ? ' sel' : '') + '" data-q="' + q.id + '"' +
              (q.ready || q.done ? '' : ' style="opacity:.5"') + '>' +
              '<div class="n">' + (i + 1) + '. ' + VG.htmlEscape(q.question) + '</div>' +
              '<div class="d">' + tag + '</div></div>';
          }
          h += '<div style="height:8px"></div></div>';

          /* the one being worked on */
          let cur = qCur ? qs.find((x) => x.id === qCur) : null;
          if (!cur) {
            cur = qs.filter((x) => x.ready && !x.done)[0] || qs[0];
            qCur = cur.id;
          }
          if (cur.done) {
            h += '<div class="cardx" style="border-color:#5c7a4a">' +
              '<h3 style="color:#93b45a;letter-spacing:.1em">ANSWERED</h3>' +
              '<p style="font-size:13px;line-height:1.6;margin:6px 0 0">' + VG.htmlEscape(cur.question) + '</p>' +
              '<p class="muted" style="margin-top:6px">The Office has that one on the file.</p></div>';
          } else if (!cur.ready) {
            h += '<div class="cardx" style="border-color:#4a4f42">' +
              '<h3 style="color:#8a8f7c;letter-spacing:.1em">THE OFFICE ASKS</h3>' +
              '<p style="font-size:13px;line-height:1.6;margin:6px 0 0">' + VG.htmlEscape(cur.question) + '</p>' +
              '<p class="muted" style="margin-top:8px">The Office does not have the evidence for this one yet. ' +
              'It needs ' + cur.missing + ' more fact' + (cur.missing === 1 ? '' : 's') + ' before it can put it to you.</p></div>';
          } else {
            if (!qState[cur.id]) qState[cur.id] = { answer: null, evidence: [] };
            const st = qState[cur.id];
            h += '<div class="cardx" style="border-color:#e8b34a">' +
              '<h3 style="color:#e8b34a;letter-spacing:.1em">THE OFFICE ASKS</h3>' +
              '<p style="font-size:13px;line-height:1.6;margin:6px 0 12px">' + VG.htmlEscape(cur.question) + '</p>' +
              '<div class="meta" style="margin-bottom:4px">YOUR ANSWER</div>';
            for (const a of VG.questionAnswers(open, cur.id, p)) {
              const on = st.answer === a.id;
              h += '<div class="listitem' + (on ? ' sel' : '') + '" data-ans="' + a.id + '"><div class="n">' +
                VG.htmlEscape(a.label) + '</div></div>';
            }
            h += '<div class="meta" style="margin:12px 0 4px">THE EVIDENCE YOU ARE CITING</div>';
            const known = (open.facts || []).filter((f) => p.knownFacts[f.id]);
            for (const f of known) {
              const on = st.evidence.indexOf(f.id) >= 0;
              h += '<div class="listitem' + (on ? ' sel' : '') + '" data-ev="' + f.id + '"><div class="n">' +
                VG.htmlEscape(f.label) + '</div><div class="d">' + VG.htmlEscape(f.desc || '') + '</div></div>';
            }
            h += '<div style="height:10px"></div><div class="btn prim" id="btn-answer">ANSWER THE OFFICE</div>' +
              '<p class="muted" style="margin-top:6px">A theory the Office does not accept is written into the file, and every one of them costs a point of standing with the Ledger. It will not tell you which half of your answer was wrong.</p>';
          }
        }
      }
      body.innerHTML = h;
      body.querySelectorAll('[data-q]').forEach((e) => {
        e.onclick = () => {
          qCur = e.getAttribute('data-q');
          VG.renderJournal();
        };
      });
      body.querySelectorAll('[data-ans]').forEach((e) => {
        e.onclick = () => {
          const open2 = VG.openCase(p);
          if (!open2 || !qCur) return;
          const st = qState[qCur];
          if (!st) return;
          st.answer = (st.answer === e.getAttribute('data-ans')) ? null : e.getAttribute('data-ans');
          VG.renderJournal();
        };
      });
      body.querySelectorAll('[data-ev]').forEach((e) => {
        e.onclick = () => {
          const open2 = VG.openCase(p);
          if (!open2 || !qCur) return;
          const st = qState[qCur];
          if (!st) return;
          const id = e.getAttribute('data-ev');
          const i = st.evidence.indexOf(id);
          if (i >= 0) st.evidence.splice(i, 1); else st.evidence.push(id);
          VG.renderJournal();
        };
      });
      const btn = document.getElementById('btn-answer');
      if (btn) {
        btn.onclick = () => {
          const open2 = VG.openCase(p);
          if (!open2 || !qCur) return;
          const st = qState[qCur];
          if (!st) return;
          if (!st.answer) { VG.log('Say what you believe first.', 'bad'); return; }
          if (!st.evidence.length) { VG.log('Cite the evidence for it.', 'bad'); return; }
          const res = VG.answerQuestion(open2, qCur, st.answer, st.evidence, p);
          if (!res.ok) {
            VG.log(res.reason + (res.cost ? ' A point of standing with the Ledger is gone.' : ''), 'bad');
            if (VG.Audio) VG.Audio.deny();
            st.evidence = [];
          } else {
            VG.log(res.note || res.label || '', 'clue');
            if (VG.Audio) VG.Audio.deduct();
            if (VG.Help) VG.Help.mark('deduced');
            st.answer = null;
            st.evidence = [];
            delete qState[qCur];
            /* move on to the next question the Office is waiting on */
            const next = VG.fileQuestions(open2, p).filter((x) => x.ready && !x.done)[0];
            qCur = next ? next.id : qCur;
          }
          VG.renderJournal();
        };
      }
      return;
    }
    if (jrTab === 'deduct') {
      let h = '';
      let any = false;
      for (const c of cases) {
        for (const d of (c.deductions || [])) {
          if (!p.knownFacts[d.output]) continue;
          any = true;
          h += '<div class="cardx" style="margin-bottom:8px"><h3>' + VG.htmlEscape(d.label) + '</h3><p>' +
            VG.htmlEscape(d.note || '') + '</p><div class="meta">case · ' + VG.htmlEscape(c.title) + '</div></div>';
        }
      }
      if (!any) h = '<p class="muted">No conclusions yet. Gather evidence and combine it.</p>';
      body.innerHTML = h;
      return;
    }
    // read
    let h = '';
    for (const c of cases) {
      for (const cl of (c.clues || [])) {
        if (!p.readClues[cl.id]) continue;
        h += '<div class="cardx" style="margin-bottom:8px"><h3>' + VG.htmlEscape(cl.name) + '</h3><p class="pre">' +
          VG.htmlEscape(cl.text) + '</p><div class="meta">' + cl.type + ' · ' + VG.htmlEscape(c.title) + '</div></div>';
      }
    }
    if (!h) h = '<p class="muted">Nothing read yet. Search the flats for evidence.</p>';
    body.innerHTML = h;
  };

  VG.factLabel = function (id) {
    for (const c of VG.allCases()) {
      for (const f of (c.facts || [])) if (f.id === id) return f.label;
    }
    return id;
  };
  VG.caseOfFact = function (id) {
    for (const c of VG.allCases()) {
      for (const f of (c.facts || [])) if (f.id === id) return c;
    }
    return null;
  };

  /* The old pair-matching lock is gone. A deduction is now a question the
     Office asks, and the player answers it with a claim and the evidence
     for it - see VG.answerQuestion in caseflow.js. The engine function
     that used to live here walked every case looking for a pair of facts
     that matched a deduction's inputs, and it made the case a filing
     exercise rather than a mystery. */

  /* ================= map ================= */
  VG.renderMap = function () {
    const c = document.getElementById('mapc');
    if (!c || !VG.World) return;
    const g = c.getContext('2d');
    const w = VG.World, S = c.width, k = S / w.W;
    g.fillStyle = '#0d100c'; g.fillRect(0, 0, S, S);
    for (let y = 0; y < w.H; y++) {
      for (let x = 0; x < w.W; x++) {
        g.fillStyle = VG.BIOME[w.biome[y * w.W + x]].ground;
        g.globalAlpha = 0.62;
        g.fillRect(x * k, y * k, k + 1, k + 1);
      }
    }
    g.globalAlpha = 1;
    g.fillStyle = '#2b2924';
    for (let y = 0; y < w.H; y++) {
      for (let x = 0; x < w.W; x++) if (w.isRoad(x, y)) g.fillRect(x * k, y * k, k + 1, k + 1);
    }
    const p = VG.Player;
    /* the kind of building the open file is looking for. The map cannot
       point at the evidence - that is the whole point - but it can say what
       kind of place to walk to. */
    const wanted = VG.wantedTypes(p);
    for (const poi of w.pois) {
      /* water is public infrastructure — the Survey Office map knows where the
         wells and the towers are, so they are on the map from the start */
      const isWater = (poi.type === 'well' || poi.type === 'watertower');
      /* so are the faction posts. A contract whose office the map cannot
         point at is a contract the player cannot hand in, and the posts are
         public institutions - the Survey Office knows where the bank is. */
      const isPost = !!poi.post;
      /* but the post itself is a discovery: the marker appears once you have
         been there. The contract sheet names the post and gives a bearing
         the whole time, because the Office knows where its own counter is -
         the map marker is for having found it, not for finding it. */
      if (!poi.discovered && !isWater) continue;
      if (isWater) {
        g.fillStyle = '#7fc4d8';
        g.beginPath();
        g.arc(poi.x * k, poi.y * k, 3.2, 0, Math.PI * 2);
        g.fill();
        continue;
      }
      g.fillStyle = poi.tier >= 2 ? '#e8b34a' : '#9a958a';
      g.fillRect(poi.x * k - 1.5, poi.y * k - 1.5, 3.5, 3.5);
      if (poi.tier >= 3) {
        g.strokeStyle = 'rgba(232,179,74,.5)'; g.lineWidth = 1;
        g.strokeRect(poi.x * k - 4, poi.y * k - 4, 9, 9);
      }
      /* a faction post is ringed in the faction's colour and named. */
      if (isPost) {
        const fac = (VG.FACTIONS || []).find((x) => x.id === poi.post);
        const col = fac ? fac.color : '#e8b34a';
        g.strokeStyle = col; g.lineWidth = 1.5;
        g.beginPath(); g.arc(poi.x * k, poi.y * k, 6.5, 0, VG.TAU); g.stroke();
        const label = (fac ? fac.name : 'Faction') + ' post';
        g.font = '9px sans-serif';
        g.textAlign = 'left';
        g.textBaseline = 'middle';
        g.lineWidth = 3; g.strokeStyle = '#0d100c';
        g.strokeText(label, poi.x * k + 9, poi.y * k);
        g.fillStyle = col;
        g.fillText(label, poi.x * k + 9, poi.y * k);
      }
      /* a building of the kind the file needs is ringed and named. The map
         is the only place a player can look for something, so it has to
         answer the question the journal asks. */
      if (wanted.indexOf(poi.type) >= 0) {
        g.strokeStyle = '#e8b34a'; g.lineWidth = 1;
        g.strokeRect(poi.x * k - 4.5, poi.y * k - 4.5, 10, 10);
        const label = poi.typeName || VG.poiTypeName(poi.type);
        g.font = '9px sans-serif';
        g.textAlign = 'left';
        g.textBaseline = 'middle';
        g.lineWidth = 3; g.strokeStyle = '#0d100c';
        g.strokeText(label, poi.x * k + 7, poi.y * k);
        g.fillStyle = '#e8b34a';
        g.fillText(label, poi.x * k + 7, poi.y * k);
      }
    }
    /* the clues that have been read. The rest are not on the map. */
    for (const cl of VG.visibleClues(w, p)) {
      g.fillStyle = '#7fc4d8';
      g.beginPath(); g.arc(cl.x * k, cl.y * k, 3.4, 0, VG.TAU); g.fill();
    }
    /* live events. A call you cannot find is a call you cannot answer. */
    if (VG.DYN) {
      for (const mk of VG.DYN.markers(w)) {
        const col = mk.kind === 'call' ? '#7fc4d8' : mk.kind === 'raid' ? '#d06a4a' : '#e8b34a';
        const mx = mk.x / VG.TILE * k, my = mk.y / VG.TILE * k;
        g.fillStyle = col;
        g.beginPath(); g.arc(mx, my, 3.6, 0, VG.TAU); g.fill();
        g.strokeStyle = col; g.globalAlpha = 0.5; g.lineWidth = 1;
        g.beginPath(); g.arc(mx, my, 8, 0, VG.TAU); g.stroke();
        g.globalAlpha = 1;
      }
    }
    // player. Indoors the player stands at the building they are in.
    const inRoom = VG.INT && VG.INT.active;
    const dw = inRoom ? VG.INT.doorWorld(VG.INT.active.poi) : null;
    const px = inRoom ? dw.x : p.x;
    const py = inRoom ? dw.y : p.y;
    g.fillStyle = inRoom ? '#e8b34a' : '#d6d1c3';
    g.beginPath(); g.arc(px / VG.TILE * k, py / VG.TILE * k, 4, 0, VG.TAU); g.fill();
    g.strokeStyle = '#e8b34a'; g.lineWidth = 1.5; g.stroke();
    const sub = $('#map-sub');
    if (sub) {
      const wantNames = wanted.map((k) => VG.poiTypeName(k));
      sub.textContent = inRoom
        ? 'Inside ' + VG.INT.active.tpl.title
        : 'Surveyed ' + Math.round(p.x / VG.TILE) + ', ' + Math.round(p.y / VG.TILE) +
          (wantNames.length ? ' · looking for ' + wantNames.join(', ') : '');
    }
  };

  /* ================= codex ================= */
  VG.renderCodex = function () {
    const p = VG.Player, body = $('#codex-body');
    if (!body) return;
    let h = '<h3 style="color:#e8b34a;font-size:12px;letter-spacing:.12em;margin-bottom:8px">FACTIONS</h3>';
    for (const f of (VG.FACTIONS || [])) {
      const v = p.rep[f.id] || 0;
      /* where this faction can be found. Standing is a cost the player pays,
         so the sheet has to say what standing is worth and where to spend it. */
      const place = VG.postPlace ? VG.postPlace(VG.World, f.id, p) : null;
      const where = !place ? 'post not charted'
        : (place.here ? 'post at ' + place.name + ' - you are here'
          : 'post at ' + place.name + ' - ' + Math.round(place.dist) + 'm ' + place.dir);
      h += '<div class="cardx" style="margin-bottom:8px"><h3 style="color:' + f.color + '">' + VG.htmlEscape(f.name) +
        ' <span class="muted" style="font-size:11px">standing ' + (v > 0 ? '+' : '') + v + '</span></h3><p>' +
        VG.htmlEscape(f.blurb) + '</p>' +
        '<div class="meta" style="margin-top:5px">' + VG.htmlEscape(where) + '</div></div>';
    }
    h += '<div style="height:12px"></div><h3 style="color:#e8b34a;font-size:12px;letter-spacing:.12em;margin-bottom:8px">CONTRACTS</h3>';
    for (const q of (VG.QUESTS || [])) {
      const f = (VG.FACTIONS || []).find((x) => x.id === q.faction);
      const ok = (p.rep[q.faction] || 0) >= (q.repNeeded || 0);
      h += '<div class="listitem"><div class="n">' + VG.htmlEscape(q.title) +
        ' <span class="tag" style="border-color:' + (f ? f.color : '#555') + ';color:' + (f ? f.color : '#555') + '">' +
        (f ? f.name : q.faction) + '</span>' + (ok ? '<span class="tag on">available</span>' : '<span class="tag">locked</span>') + '</div>' +
        '<div class="d">' + VG.htmlEscape(q.desc) + '</div>' +
        '<div class="meta">' + (q.target ? 'deliver ' + q.target : '') + ' · reward ' +
        ((q.reward && q.reward.rep) ? Object.keys(q.reward.rep).map((k) => k + ' ' + (q.reward.rep[k] > 0 ? '+' : '') + q.reward.rep[k]).join(', ') : 'goods') +
        '</div></div>';
    }
    body.innerHTML = h;
  };

  /* ================= crafting ================= */
  VG.renderCraft = function () {
    const p = VG.Player, body = $('#craft-body');
    if (!body) return;
    /* the bench you are standing at, or the truth that there is not one */
    const bench = VG.benchAt(p, VG.World);
    const st = $('#craft-station');
    if (st) st.textContent = bench ? bench.name : 'no bench in reach';
    let h = '';
    for (const r of VG.craftRecipes) {
      const need = r.need || {};
      let ok = true, parts = [];
      for (const k in need) {
        const have = p.inv[k] || 0;
        if (have < need[k]) ok = false;
        parts.push(VG.htmlEscape(VG.item(k) ? VG.item(k).name : k) + ' ' + have + '/' + need[k]);
      }
      const here = VG.canCraft(p, r);
      const can = ok && here;
      h += '<div class="listitem"><div class="n">' + VG.htmlEscape(VG.item(r.out) ? VG.item(r.out).name : r.out) + ' x' + r.qty + '</div>' +
        '<div class="d">' + parts.join(' · ') + (here ? '' : ' · needs a bench') + '</div>' +
        '<div class="meta" style="margin-top:5px"><span class="btn' + (can ? ' prim' : ' dis') + '" data-craft="' + r.id + '">CRAFT</span></div></div>';
    }
    if (!bench) {
      h += '<p class="muted" style="margin-top:8px">A bench is a place you go. The depot press, the market stall, the substation and the fuel stop have one.</p>';
    }
    body.innerHTML = h;
    body.querySelectorAll('[data-craft]').forEach((e) => {
      e.onclick = () => {
        const r = VG.craftRecipes.find((x) => x.id === e.getAttribute('data-craft'));
        if (!r) return;
        if (!VG.canCraft(p, r)) { VG.log('That needs a bench. Find one.', 'bad'); return; }
        for (const k in r.need) if ((p.inv[k] || 0) < r.need[k]) { VG.log('Not enough materials.', 'bad'); return; }
        for (const k in r.need) VG.invRemove(p, k, r.need[k]);
        VG.invAdd(p, r.out, r.qty);
        VG.log('Crafted ' + (VG.item(r.out) ? VG.item(r.out).name : r.out) + ' x' + r.qty + '.', 'good');
        VG.renderCraft();
      };
    });
  };

  /* ================= options ================= */

  VG.renderOptions = function () {
    const body = $('#options-body');
    if (!body) return;
    let h = '';

    /* ---------- the flats: how alive the world is around you ---------- */
    if (VG.DYN && VG.DYN_PROFILES) {
      h += '<h3 style="color:var(--amber);font-size:11px;letter-spacing:.14em;margin:0 0 5px">THE FLATS</h3>';
      h += '<p class="muted" style="font-size:10px;line-height:1.6;margin:0 0 11px">' +
        'How much happens around you. This does not change the story — the files are the same either way, ' +
        'but the radio is busier, more people need help, and more of them are looking for you.</p>';
      for (const key of ['quiet', 'alive', 'danger']) {
        const P = VG.DYN_PROFILES[key];
        if (!P) continue;
        const on = VG.DYN.intensity === key;
        h += '<div class="optrow"><div class="lbl">' + P.label + '</div>' +
          '<div class="btn' + (on ? ' prim' : '') + '" data-int="' + key + '">' +
          (on ? 'SELECTED' : 'SELECT') + '</div></div>' +
          '<div class="hint">' + P.blurb + '</div>';
      }
      h += '<div style="height:18px"></div>';
    }

    /* ---------- sound ---------- */
    if (!VG.Audio) {
      h += '<h3 style="color:var(--amber);font-size:11px;letter-spacing:.14em;margin:0 0 5px">SOUND</h3>' +
        '<p class="muted">Sound is unavailable in this browser.</p>';
      body.innerHTML = h;
      return;
    }
    const A = VG.Audio;

    const rows = [
      ['master', 'Mixer', 'Everything, before it is split'],
      ['music', 'Music', 'Drone, reactor hum, the sparse melody'],
      ['wind', 'Wind', 'The moving air. Drop it to zero and the flats go quiet'],
      ['sfx', 'Effects', 'Footsteps, doors, shots, deductions, pickups']
    ];
    const setter = { master: A.setMaster, music: A.setMusic, wind: A.setWind, sfx: A.setSfx };

    h += '<h3 style="color:var(--amber);font-size:11px;letter-spacing:.14em;margin:0 0 5px">SOUND</h3>';
    h += '<p class="muted" style="font-size:11px;line-height:1.6;margin:0 0 14px">' +
      'Every sound in Verdigris is generated live in the browser, so there is nothing to download and nothing to install. ' +
      'Wind, music and effects are separate layers — set them independently, and the mix belongs to you.</p>';

    for (const r of rows) {
      const v = A.vol[r[0]];
      h += '<div class="optrow' + (v <= 0.001 ? ' off' : '') + '">' +
        '<div class="lbl">' + r[1] + '</div>' +
        '<input type="range" min="0" max="100" step="1" value="' + Math.round(v * 100) + '" data-vol="' + r[0] + '">' +
        '<div class="val" data-val="' + r[0] + '">' + Math.round(v * 100) + '%</div></div>' +
        '<div class="hint">' + r[2] + '</div>';
    }

    h += '<div style="height:14px"></div>';
    h += '<div class="optrow"><div class="lbl">Sound</div>' +
      '<div class="btn' + (A.muted ? '' : ' prim') + '" id="opt-mute">' +
      (A.muted ? 'MUTED — CLICK TO UNMUTE' : 'ON — CLICK TO MUTE') + '</div></div>';
    h += '<div style="height:16px"></div>';
    h += '<div class="btn" id="opt-reset">RESET SOUND DEFAULTS</div>';

    body.innerHTML = h;

    body.querySelectorAll('[data-int]').forEach((el) => {
      el.onclick = () => {
        const k = el.getAttribute('data-int');
        if (VG.DYN && VG.DYN.setIntensity(k)) VG.renderOptions();
      };
    });

    body.querySelectorAll('[data-vol]').forEach((el) => {
      el.oninput = () => {
        const which = el.getAttribute('data-vol');
        const val = parseInt(el.value, 10) / 100;
        setter[which](val);
        const out = body.querySelector('[data-val="' + which + '"]');
        if (out) out.textContent = Math.round(val * 100) + '%';
        const row = el.parentNode;
        if (row) row.classList.toggle('off', val <= 0.001);
      };
    });

    const mb = document.getElementById('opt-mute');
    if (mb) mb.onclick = () => { A.toggleMute(); VG.renderOptions(); };

    const rb = document.getElementById('opt-reset');
    if (rb) rb.onclick = () => {
      A.setMaster(0.85); A.setMusic(0.75); A.setWind(0.6); A.setSfx(0.45);
      A.setMuted(false);
      VG.log('Sound defaults restored.', '');
      VG.renderOptions();
    };
  };

  /* ================= contracts ================= */

  /* A contract may state its requirement as { items: ['scrap_copper'] } with the
     count in `target`, or as { items: { scrap_copper: 6 } }. Normalise both to
     an id -> count map so the ready check and the hand-over agree. */
  VG.contractNeeds = function (q) {
    const out = {};
    const it = (q.requires || {}).items;
    if (!it) return out;
    if (Array.isArray(it)) {
      const n = q.target || 1;
      for (const id of it) out[id] = (out[id] || 0) + n;
    } else {
      for (const k in it) out[k] = it[k];
    }
    return out;
  };

  VG.renderContracts = function () {
    const p = VG.Player, body = $('#contracts-body');
    if (!body) return;
    let h = '';
    /* The posts, once at the top: where each faction is and whether you are
       standing at it. A contract sheet that does not say where to go is a
       checklist, and the whole point of a post is that it is a place. */
    h += '<div class="cardx" style="margin-bottom:10px"><h3 style="color:#e8b34a;font-size:12px;letter-spacing:.12em;margin-bottom:6px">THE POSTS</h3>';
    for (const f of (VG.FACTIONS || [])) {
      const place = VG.postPlace ? VG.postPlace(VG.World, f.id, p) : null;
      const where = !place ? 'not charted'
        : (place.here ? 'you are at ' + place.name
          : place.name + ' - ' + Math.round(place.dist) + 'm ' + place.dir);
      h += '<div class="meta" style="margin-bottom:3px"><span style="color:' + f.color + '">' +
        VG.htmlEscape(f.name) + '</span> &middot; ' + VG.htmlEscape(where) + '</div>';
    }
    h += '</div>';
    for (const q of (VG.QUESTS || [])) {
      const f = (VG.FACTIONS || []).find((x) => x.id === q.faction);
      const repOk = (p.rep[q.faction] || 0) >= (q.repNeeded || 0);
      const req = q.requires || {};
      let reqOk = true, reqTxt = '';
      if (req.case) {
        reqOk = !!(p.solvedSolutions[req.case] && p.solvedSolutions[req.case].length);
        reqTxt = 'requires closing ' + (VG.allCases().find((c) => c.id === req.case) || { title: req.case }).title;
      } else if (req.items) {
        const needs = VG.contractNeeds(q);
        let have = 0, need = 0;
        for (const k in needs) { have += p.inv[k] || 0; need += needs[k]; }
        reqOk = have >= need;
        reqTxt = 'requires ' + have + '/' + need + ' supplies';
      }
      const ready = repOk && reqOk;
      /* a contract is handed in at the post. Standing is the only cost the
         player pays for it, and it has to be a cost they can act on. */
      const place = VG.postPlace ? VG.postPlace(VG.World, q.faction, p) : null;
      const atPost = !!(place && place.here);
      const label = !ready ? 'NOT READY' : (atPost ? 'TURN IN' : 'GO TO THE POST');
      h += '<div class="listitem"><div class="n">' + VG.htmlEscape(q.title) +
        (ready ? '<span class="tag on">ready</span>' : '<span class="tag">unavailable</span>') + '</div>' +
        '<div class="d">' + VG.htmlEscape(q.desc) + '</div>' +
        '<div class="meta">' + VG.htmlEscape(f ? f.name : q.faction) + ' · standing ' + (p.rep[q.faction] || 0) +
        (reqTxt ? ' · ' + reqTxt : '') + '</div>' +
        '<div class="meta">' + (place ? (atPost ? 'at the post' : 'hand in at ' + place.name +
          ' - ' + Math.round(place.dist) + 'm ' + place.dir) : 'post not charted') + '</div>' +
        '<div class="meta" style="margin-top:5px"><span class="btn' + (ready && atPost ? ' prim' : ' dis') +
        '" data-contract="' + q.id + '">' + label + '</span></div></div>';
    }
    body.innerHTML = h;
    body.querySelectorAll('[data-contract]').forEach((e) => {
      e.onclick = () => VG.turnIn(e.getAttribute('data-contract'));
    });
  };

  VG.turnIn = function (qid) {
    const p = VG.Player;
    const q = (VG.QUESTS || []).find((x) => x.id === qid);
    if (!q) return;
    /* the post, first. A contract that can be handed in from anywhere is a
       checklist, and the factions have to be somewhere you have to go. */
    const place = VG.postPlace ? VG.postPlace(VG.World, q.faction, p) : null;
    const fac = (VG.FACTIONS || []).find((f) => f.id === q.faction);
    if (!place) { VG.log('Nobody has charted where that post is.', 'bad'); return; }
    if (!place.here) {
      VG.log((fac ? fac.name : 'They') + ' will only take it at their post - ' +
        place.name + ', ' + Math.round(place.dist) + 'm ' + place.dir + '.', 'bad');
      return;
    }
    if ((p.rep[q.faction] || 0) < (q.repNeeded || 0)) { VG.log('They will not deal with you.', 'bad'); return; }
    const req = q.requires || {};
    if (req.case && !(p.solvedSolutions[req.case] && p.solvedSolutions[req.case].length)) { VG.log('The file is not closed.', 'bad'); return; }
    if (req.items) {
      const needs = VG.contractNeeds(q);
      for (const k in needs) if ((p.inv[k] || 0) < needs[k]) { VG.log('You are short on supplies.', 'bad'); return; }
      for (const k in needs) VG.invRemove(p, k, needs[k]);
    }
    if (q.reward) {
      for (const k in (q.reward.rep || {})) p.rep[k] = (p.rep[k] || 0) + q.reward.rep[k];
      for (const it of (q.reward.items || [])) VG.invAdd(p, it, 1);
      p.xp += q.reward.xp || 0;
    }
    p.level = 1 + Math.floor(p.xp / 250);
    VG.log('Contract complete: ' + q.title, 'good');
    VG.renderContracts();
  };

  VG.initUI = function () {
    $$('.panel .close').forEach((e) => { e.onclick = VG.closePanel; });
    $$('#inv .tab').forEach((e) => {
      e.onclick = () => {
        invTab = e.getAttribute('data-t');
        $$('#inv .tab').forEach((x) => x.classList.remove('on'));
        e.classList.add('on');
        VG.renderInv();
      };
    });
    $$('#journal .tab').forEach((e) => {
      e.onclick = () => {
        jrTab = e.getAttribute('data-t');
        $$('#journal .tab').forEach((x) => x.classList.remove('on'));
        e.classList.add('on');
        VG.renderJournal();
      };
    });
  };
})(window.VG);
