/* VERDIGRIS — HUD and panels */
window.VG = window.VG || {};
(function (VG) {
  'use strict';

  let selFacts = [];
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
      const facing = VG.compassDir
        ? VG.compassDir(Math.cos(p.face), Math.sin(p.face))
        : dirs[Math.round((((p.face * 180 / Math.PI) % 360 + 360) % 360) / 45) % 8];
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
    const hintBox = document.getElementById('hints');
    if (hintBox) {
      hintBox.style.display = (waterShown || foodShown) ? 'block' : 'none';
      /* The threat card sits under the hints, and the hints grow and shrink
         with what they have to say. Two of them at once pushes the card
         down, so the card below has to follow. */
      const threat = document.getElementById('threat');
      if (threat) {
        const h = (waterShown || foodShown) ? (hintBox.offsetHeight || 44) : 0;
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
    // clues: only the ones actually recovered read as cyan. The rest are
    // faint, the way the Office manifest marks a location it has not visited.
    for (const cl of world.clues) {
      const known = (VG.Player.readClues || {})[cl.id];
      g.fillStyle = known ? '#7fc4d8' : 'rgba(232,179,74,.30)';
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
  VG.renderInv = function () {
    const p = VG.Player, body = $('#inv-body');
    if (!body) return;
    const car = $('#inv-car');
    if (car) car.textContent = VG.invWeight(p) + ' / ' + VG.CARRY + ' load';
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
        (verb ? ' · ' + verb : '') + mods + passive + act + '</div></div>';
    }
    h += '</div>';
    body.innerHTML = h;
    body.querySelectorAll('[data-use]').forEach((e) => {
      e.onclick = () => VG.useItem(e.getAttribute('data-use'));
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
              h += '<div class="cardx" style="margin-bottom:6px;opacity:.45"><h3>— not yet located —</h3>' +
                '<p class="muted">Search the ' + VG.htmlEscape(cl.poi || 'flats') + ' for this one.</p></div>';
            }
          }
          const facts = (c.facts || []).filter((f) => p.knownFacts[f.id]);
          h += '<h3 style="color:#7fc4d8;font-size:11px;letter-spacing:.12em;margin:12px 0 5px">ESTABLISHED (' + facts.length + ')</h3>';
          if (!facts.length) h += '<p class="muted">Nothing established yet.</p>';
          for (const f of facts) {
            h += '<div class="kv"><span style="color:#d6d1c3">' + VG.htmlEscape(f.label) + '</span></div>';
          }
          const sol = VG.canConclude(c, p);
          if (sol) {
            h += '<div style="height:12px"></div><div class="btn prim" id="btn-conclude">FILE CONCLUSION</div>' +
              '<p class="muted" style="margin-top:6px">You have the evidence to close this file.</p>';
          }
          for (const s of (c.solutions || [])) {
            if ((p.solvedSolutions[c.id] || []).indexOf(s.id) < 0) continue;
            h += '<div class="cardx" style="margin-top:10px;border-color:#5d7a3a"><h3 style="color:#93b45a">' +
              VG.htmlEscape(s.label) + '</h3><p class="pre">' + VG.htmlEscape(s.epilogue || '') + '</p></div>';
          }
          body.innerHTML = h;
          const back = document.getElementById('jr-back');
          if (back) back.onclick = () => { openCase = null; VG.renderJournal(); };
          const cb = document.getElementById('btn-conclude');
          if (cb) cb.onclick = () => { if (sol) VG.conclude(c, sol); };
          return;
        }
      }
      let h = '';
      for (const c of cases) {
        const found = (p.foundClues[c.id] || []).length;
        const total = (c.clues || []).length;
        const done = (p.solvedSolutions[c.id] || []).length;
        const st = done > 0 ? '<span class="tag on">closed</span>' : (found > 0 ? '<span class="tag">open</span>' : '<span class="tag">unopened</span>');
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
      let h = '<p class="muted" style="margin-bottom:8px">Select two pieces of evidence to assemble a deduction. Selected: ' +
        (selFacts.length ? selFacts.map((f) => VG.htmlEscape(VG.factLabel(f))).join('  +  ') : 'none') + '</p>' +
        '<div class="btn prim" id="btn-deduce">ASSEMBLE DEDUCTION</div><div style="height:10px"></div>';
      for (const c of cases) {
        const facts = (c.facts || []).filter((f) => p.knownFacts[f.id]);
        if (!facts.length) continue;
        h += '<h3 style="color:#e8b34a;font-size:12px;letter-spacing:.1em;margin:12px 0 6px">' + VG.htmlEscape(c.title) + '</h3>';
        for (const f of facts) {
          const on = selFacts.indexOf(f.id) >= 0;
          h += '<div class="listitem' + (on ? ' sel' : '') + '" data-fact="' + f.id + '"><div class="n">' +
            VG.htmlEscape(f.label) + '</div><div class="d">' + VG.htmlEscape(f.desc || '') + '</div></div>';
        }
      }
      body.innerHTML = h;
      body.querySelectorAll('[data-fact]').forEach((e) => {
        e.onclick = () => {
          const id = e.getAttribute('data-fact');
          const i = selFacts.indexOf(id);
          if (i >= 0) selFacts.splice(i, 1);
          else { selFacts.push(id); if (selFacts.length > 3) selFacts.shift(); }
          VG.renderJournal();
        };
      });
      const btn = document.getElementById('btn-deduce');
      if (btn) btn.onclick = VG.tryDeduction;
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

  VG.tryDeduction = function () {
    const p = VG.Player;
    if (selFacts.length < 2) { VG.log('Select two pieces of evidence.', 'bad'); return; }
    const set = selFacts.slice().sort().join('|');
    for (const c of VG.allCases()) {
      for (const d of (c.deductions || [])) {
        const dset = d.inputs.slice().sort().join('|');
        if (dset === set) {
          p.knownFacts[d.output] = c.id;
          selFacts = [];
          VG.log('DEDUCTION: ' + d.label, 'clue');
          if (VG.Audio) VG.Audio.deduct();
          if (VG.Help) VG.Help.mark('deduced');
          VG.renderJournal();
          return;
        }
      }
    }
    VG.log('The evidence does not support a conclusion.', 'bad');
    if (VG.Audio) VG.Audio.deny();
  };

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
    for (const poi of w.pois) {
      /* water is public infrastructure — the Survey Office map knows where the
         wells and the towers are, so they are on the map from the start */
      const isWater = (poi.type === 'well' || poi.type === 'watertower');
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
    }
    for (const cl of w.clues) {
      const cse = VG.allCases().find((x) => x.id === cl.caseId);
      if (!cse) continue;
      const known = (VG.Player.readClues || {})[cl.id];
      g.fillStyle = known ? '#7fc4d8' : 'rgba(232,179,74,.32)';
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
      sub.textContent = inRoom
        ? 'Inside ' + VG.INT.active.tpl.title
        : 'Surveyed ' + Math.round(p.x / VG.TILE) + ', ' + Math.round(p.y / VG.TILE);
    }
  };

  /* ================= codex ================= */
  VG.renderCodex = function () {
    const p = VG.Player, body = $('#codex-body');
    if (!body) return;
    let h = '<h3 style="color:#e8b34a;font-size:12px;letter-spacing:.12em;margin-bottom:8px">FACTIONS</h3>';
    for (const f of (VG.FACTIONS || [])) {
      const v = p.rep[f.id] || 0;
      h += '<div class="cardx" style="margin-bottom:8px"><h3 style="color:' + f.color + '">' + VG.htmlEscape(f.name) +
        ' <span class="muted" style="font-size:11px">standing ' + (v > 0 ? '+' : '') + v + '</span></h3><p>' +
        VG.htmlEscape(f.blurb) + '</p></div>';
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
    const st = $('#craft-station');
    if (st) st.textContent = VG.craftStation || 'field workbench';
    let h = '';
    for (const r of VG.craftRecipes) {
      const need = r.need || {};
      let ok = true, parts = [];
      for (const k in need) {
        const have = p.inv[k] || 0;
        if (have < need[k]) ok = false;
        parts.push(VG.htmlEscape(VG.item(k) ? VG.item(k).name : k) + ' ' + have + '/' + need[k]);
      }
      h += '<div class="listitem"><div class="n">' + VG.htmlEscape(VG.item(r.out) ? VG.item(r.out).name : r.out) + ' x' + r.qty + '</div>' +
        '<div class="d">' + parts.join(' · ') + '</div>' +
        '<div class="meta" style="margin-top:5px"><span class="btn' + (ok ? ' prim' : ' dis') + '" data-craft="' + r.id + '">CRAFT</span></div></div>';
    }
    body.innerHTML = h;
    body.querySelectorAll('[data-craft]').forEach((e) => {
      e.onclick = () => {
        const r = VG.craftRecipes.find((x) => x.id === e.getAttribute('data-craft'));
        if (!r) return;
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
      h += '<div class="listitem"><div class="n">' + VG.htmlEscape(q.title) +
        (ready ? '<span class="tag on">ready</span>' : '<span class="tag">unavailable</span>') + '</div>' +
        '<div class="d">' + VG.htmlEscape(q.desc) + '</div>' +
        '<div class="meta">' + VG.htmlEscape(f ? f.name : q.faction) + ' · standing ' + (p.rep[q.faction] || 0) +
        (reqTxt ? ' · ' + reqTxt : '') + '</div>' +
        '<div class="meta" style="margin-top:5px"><span class="btn' + (ready ? ' prim' : ' dis') + '" data-contract="' + q.id + '">TURN IN</span></div></div>';
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
