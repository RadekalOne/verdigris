/* VERDIGRIS - interior renderer
   ------------------------------------------------------------------
   Draws the inside of a building: the floor, the walls with their top
   faces, the furniture, the crates you can search, the player, and the
   light. It also draws the door markers on the outside of every building
   that can be entered, which is how the player learns that a building is
   a building and not a silhouette.

   The interior scene works in its own logical pixel space. The renderer
   scales that space to the window, so a room is drawn once and fills the
   screen whatever the monitor size. Everything below is drawn in logical
   coordinates; only the lighting pass afterwards works in screen space.

   Rules this file follows: ES5 only, no arrow functions, no template
   literals, no characters outside plain ASCII. */
window.VG = window.VG || {};
window.VG.GFX = window.VG.GFX || {};
(function (GFX, VG) {
  'use strict';

  var INK = 'rgba(26,24,19,.55)';
  var SHADOW = 'rgba(14,13,10,.40)';

  /* ------------------------------------------------------------------ */
  /* materials                                                            */
  /* ------------------------------------------------------------------ */

  var FLOOR = {
    diner: 'checker', clinic: 'checker', shop: 'checker', bank: 'checker',
    library: 'plank', school: 'plank', market: 'plank', observatory: 'plank',
    police: 'concrete', substation: 'concrete', reactor_yard: 'concrete',
    watertower: 'concrete', depot: 'concrete', guardhouse: 'plank',
    bunker: 'concrete', radio_tower: 'plank', gas: 'checker'
  };

  var FLOOR_COL = {
    checker: '#5d5b52', plank: '#6a5a42', concrete: '#585851', dirt: '#5e5747'
  };

  var KIND = {
    counter: { c: '#8a7c62', t: '#6f644f' },
    desk: { c: '#857a62', t: '#6a6049' },
    table: { c: '#7d7359', t: '#5f5744' },
    booth: { c: '#7a5f4d', t: '#5d4839' },
    stool: { c: '#6f6250', t: '#4f4638' },
    chair: { c: '#6f6250', t: '#4f4638' },
    shelf: { c: '#6d604c', t: '#524839' },
    cabinet: { c: '#5c6a6b', t: '#44504f' },
    locker: { c: '#5e6a68', t: '#45504e' },
    console: { c: '#4f5859', t: '#39413f' },
    machine: { c: '#6d6250', t: '#514938' },
    tank: { c: '#6a6f5e', t: '#4d5245' },
    crate: { c: '#8a7a5e', t: '#6b5e47' },
    barrel: { c: '#7c4a2d', t: '#5c3620' },
    sink: { c: '#9aa3a1', t: '#727b79' },
    stove: { c: '#5e5a52', t: '#444039' },
    case: { c: '#7a6a52', t: '#5c4f3c' },
    bed: { c: '#8d8676', t: '#6b6558' },
    bunk: { c: '#6f6a5c', t: '#53503f' },
    cage: { c: '#5d6668', t: '#454c4d' },
    freezer: { c: '#7e8a8c', t: '#5e686a' },
    scale: { c: '#6e6a5c', t: '#514e43' },
    board: { c: '#2f3a30', t: '#232b24' },
    platform: { c: '#6a6252', t: '#4e483c' },
    barrier: { c: '#8a5a3a', t: '#6a422a' },
    vault: { c: '#5b5f64', t: '#42464a' },
    sign: { c: '#7a6a4e', t: '#5b4f3a' },
    pipe: { c: '#77705f', t: '#57513f' },
    scope: { c: '#5f6470', t: '#444852' },
    plant: { c: '#5a6146', t: '#40462f' },
    stack: { c: '#86765a', t: '#655a44' },
    pallet: { c: '#7b6b4f', t: '#5d513c' },
    valve: { c: '#7a5a3a', t: '#5a422a' },
    rug: { c: '#6a5548', t: '#54443a' }
  };

  /* ------------------------------------------------------------------ */
  /* drawing helpers                                                      */
  /* ------------------------------------------------------------------ */

  function rrect(ctx, x, y, w, h) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
  }

  function box(ctx, x, y, w, h, c, t, shadow) {
    if (shadow !== false) {
      ctx.fillStyle = SHADOW;
      ctx.fillRect(x + 3, y + 4, w, h);
    }
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = t;
    ctx.fillRect(x, y, w, Math.max(2, Math.round(h * 0.42)));
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function line(ctx, x1, y1, x2, y2, style, w) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = style || INK;
    ctx.lineWidth = w || 1;
    ctx.stroke();
  }

  function disc(ctx, cx, cy, r, color) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, VG.TAU);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function ring(ctx, cx, cy, r, color, w) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, VG.TAU);
    ctx.strokeStyle = color;
    ctx.lineWidth = w || 1;
    ctx.stroke();
  }

  /* ------------------------------------------------------------------ */
  /* the floor                                                            */
  /* ------------------------------------------------------------------ */

  function paintFloor(ctx, tpl) {
    var mat = FLOOR[tpl.key] || 'concrete';
    var base = FLOOR_COL[mat] || FLOOR_COL.concrete;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, tpl.w, tpl.h);

    var x, y, i;
    if (mat === 'checker') {
      var cs = 26;
      for (y = 0; y < tpl.h; y += cs) {
        for (x = 0; x < tpl.w; x += cs) {
          if (((x / cs) + (y / cs)) % 2 === 0) continue;
          ctx.fillStyle = 'rgba(20,19,16,.16)';
          ctx.fillRect(x, y, cs, cs);
        }
      }
      ctx.strokeStyle = 'rgba(20,19,16,.20)';
      ctx.lineWidth = 1;
      for (x = 0; x <= tpl.w; x += cs) line(ctx, x, 0, x, tpl.h, 'rgba(20,19,16,.14)');
      for (y = 0; y <= tpl.h; y += cs) line(ctx, 0, y, tpl.w, y, 'rgba(20,19,16,.14)');
    } else if (mat === 'plank') {
      var pw = 34;
      for (y = 0; y < tpl.h; y += pw) {
        var off = ((y / pw) % 2) * 18;
        ctx.fillStyle = 'rgba(20,16,10,.16)';
        ctx.fillRect(0, y, tpl.w, 1.5);
        for (x = -off; x < tpl.w; x += pw * 2) {
          ctx.fillStyle = 'rgba(20,16,10,.10)';
          ctx.fillRect(x + off, y, 1.2, pw);
        }
      }
    } else {
      /* concrete: a coarse speckle that keeps the floor from reading flat */
      for (i = 0; i < 180; i++) {
        var hx = VG.hash2(i, 7, 3311) * tpl.w;
        var hy = VG.hash2(i, 19, 991) * tpl.h;
        var s = 1 + VG.hash2(i, 3, 55) * 2.4;
        ctx.fillStyle = i % 2 ? 'rgba(230,226,210,.045)' : 'rgba(18,17,14,.07)';
        ctx.fillRect(hx, hy, s, s);
      }
      ctx.strokeStyle = 'rgba(20,19,16,.12)';
      ctx.lineWidth = 1;
      for (x = 64; x < tpl.w; x += 128) line(ctx, x, 0, x, tpl.h, 'rgba(20,19,16,.10)');
    }

    /* a soft darkening into the corners: rooms are lit from the middle */
    var g = ctx.createRadialGradient(tpl.w / 2, tpl.h / 2, Math.min(tpl.w, tpl.h) * 0.22,
      tpl.w / 2, tpl.h / 2, Math.max(tpl.w, tpl.h) * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.34)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, tpl.w, tpl.h);
  }

  /* ------------------------------------------------------------------ */
  /* walls                                                                */
  /* ------------------------------------------------------------------ */

  function paintWalls(ctx, tpl) {
    var i, wl;
    for (i = 0; i < tpl.walls.length; i++) {
      wl = tpl.walls[i];
      ctx.fillStyle = SHADOW;
      ctx.fillRect(wl.x + 3, wl.y + 4, wl.w, wl.h);
      ctx.fillStyle = '#6c6455';
      ctx.fillRect(wl.x, wl.y, wl.w, wl.h);
      /* the north face catches the light */
      ctx.fillStyle = '#857c69';
      ctx.fillRect(wl.x, wl.y, wl.w, Math.max(2, Math.min(6, wl.h)));
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.strokeRect(wl.x + 0.5, wl.y + 0.5, wl.w - 1, wl.h - 1);
      /* a skirting line so long walls read as walls and not as slabs */
      if (wl.w > wl.h) {
        line(ctx, wl.x, wl.y + wl.h - 1, wl.x + wl.w, wl.y + wl.h - 1, 'rgba(26,24,19,.35)');
      }
    }
  }

  function paintWindows(ctx, tpl, dayAmount) {
    var i, win;
    if (!tpl.windows || !tpl.windows.length) return;
    for (i = 0; i < tpl.windows.length; i++) {
      win = tpl.windows[i];
      var c = dayAmount > 0.5 ? 'rgba(196,214,224,.80)' : 'rgba(70,86,96,.72)';
      ctx.fillStyle = c;
      ctx.fillRect(win.x + 2, win.y + 1, win.w - 4, Math.max(3, win.h - 3));
      ctx.fillStyle = 'rgba(30,28,22,.55)';
      var mull = win.w / 3;
      for (var m = 1; m < 3; m++) {
        ctx.fillRect(win.x + mull * m - 1, win.y + 1, 2, Math.max(3, win.h - 3));
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* furniture                                                            */
  /* ------------------------------------------------------------------ */

  function paintFurn(ctx, g, seed) {
    var k = KIND[g.k] || KIND.crate;
    var x = g.x, y = g.y, w = g.w, h = g.h;
    var i;

    switch (g.k) {
      case 'counter':
        box(ctx, x, y, w, h, k.c, k.t);
        ctx.fillStyle = 'rgba(214,200,170,.20)';
        ctx.fillRect(x + 1, y + 1, w - 2, 2);
        break;
      case 'desk':
        box(ctx, x, y, w, h, k.c, k.t);
        ctx.fillStyle = 'rgba(228,220,198,.55)';
        ctx.fillRect(x + w - 16, y + 4, 11, 8);
        break;
      case 'table':
        box(ctx, x, y, w, h, k.c, k.t);
        ctx.fillStyle = 'rgba(20,17,12,.20)';
        ctx.fillRect(x + 2, y + Math.round(h / 2), w - 4, 1);
        break;
      case 'booth':
        box(ctx, x, y, w, h, k.c, k.t);
        ctx.fillStyle = 'rgba(20,16,11,.28)';
        ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
        ctx.fillStyle = 'rgba(214,196,166,.22)';
        ctx.fillRect(x + 4, y + 4, w - 8, 6);
        break;
      case 'stool':
        disc(ctx, x + w / 2, y + h / 2, w / 2, k.c);
        ring(ctx, x + w / 2, y + h / 2, w / 2, INK, 1);
        break;
      case 'chair':
        box(ctx, x, y, w, h, k.c, k.t);
        ctx.fillStyle = 'rgba(20,16,11,.30)';
        ctx.fillRect(x + 1, y + 1, w - 2, 4);
        break;
      case 'shelf':
        box(ctx, x, y, w, h, k.c, k.t);
        for (i = 6; i < h - 3; i += 9) line(ctx, x + 1, y + i, x + w - 1, y + i, 'rgba(26,22,16,.45)');
        break;
      case 'cabinet':
        box(ctx, x, y, w, h, k.c, k.t);
        line(ctx, x + w / 2, y + 2, x + w / 2, y + h - 2, 'rgba(26,24,19,.45)');
        disc(ctx, x + w * 0.28, y + h - 6, 1.4, '#9fd8c8');
        break;
      case 'locker':
        box(ctx, x, y, w, h, k.c, k.t);
        for (i = 1; i < Math.round(w / 22); i++) {
          line(ctx, x + i * 22, y + 1, x + i * 22, y + h - 1, 'rgba(26,24,19,.45)');
        }
        break;
      case 'console':
        box(ctx, x, y, w, h, k.c, k.t);
        for (i = 0; i < Math.max(2, Math.round(w / 34)); i++) {
          var sx = x + 6 + i * 32;
          ctx.fillStyle = i % 2 ? 'rgba(120,206,186,.55)' : 'rgba(226,168,86,.50)';
          ctx.fillRect(sx, y + 4, 20, Math.max(6, h - 12));
        }
        break;
      case 'machine':
        box(ctx, x, y, w, h, k.c, k.t);
        disc(ctx, x + w / 2, y + h / 2, Math.min(w, h) * 0.28, 'rgba(24,22,18,.55)');
        ring(ctx, x + w / 2, y + h / 2, Math.min(w, h) * 0.28, 'rgba(214,206,180,.22)', 1.4);
        break;
      case 'tank':
        box(ctx, x, y, w, h, k.c, k.t);
        disc(ctx, x + w / 2, y + h / 2, Math.min(w, h) * 0.34, 'rgba(24,22,18,.48)');
        ring(ctx, x + w / 2, y + h / 2, Math.min(w, h) * 0.34, 'rgba(214,206,180,.20)', 1.2);
        break;
      case 'crate':
        box(ctx, x, y, w, h, k.c, k.t);
        line(ctx, x + 2, y + 2, x + w - 2, y + h - 2, 'rgba(30,24,16,.45)');
        line(ctx, x + w - 2, y + 2, x + 2, y + h - 2, 'rgba(30,24,16,.45)');
        break;
      case 'stack':
        box(ctx, x, y, w, h, k.c, k.t);
        box(ctx, x + 6, y + 8, w - 12, h - 12, '#7d6e54', '#5f543e');
        break;
      case 'pallet':
        ctx.fillStyle = k.c;
        ctx.fillRect(x, y, w, h);
        for (i = 0; i < 4; i++) {
          ctx.fillStyle = 'rgba(24,19,12,.35)';
          ctx.fillRect(x + 2 + i * (w / 4), y + 2, 3, h - 4);
        }
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        break;
      case 'barrel':
        disc(ctx, x + w / 2, y + h / 2, w / 2, k.c);
        ring(ctx, x + w / 2, y + h / 2, w / 2, INK, 1);
        ring(ctx, x + w / 2, y + h / 2, w / 2 - 3, 'rgba(24,18,10,.45)', 1);
        break;
      case 'sink':
        box(ctx, x, y, w, h, k.c, k.t);
        ctx.fillStyle = 'rgba(40,48,50,.50)';
        ctx.fillRect(x + 4, y + 5, w - 8, h - 10);
        break;
      case 'stove':
        box(ctx, x, y, w, h, k.c, k.t);
        for (i = 0; i < 4; i++) {
          disc(ctx, x + 12 + (i % 2) * (w - 24), y + 12 + Math.floor(i / 2) * (h - 24), 5, 'rgba(28,24,20,.55)');
        }
        break;
      case 'case':
        box(ctx, x, y, w, h, k.c, k.t);
        ctx.fillStyle = 'rgba(206,216,210,.24)';
        ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
        line(ctx, x + 3, y + h * 0.55, x + w - 3, y + h * 0.55, 'rgba(26,24,19,.35)');
        break;
      case 'bed':
        box(ctx, x, y, w, h, k.c, k.t);
        ctx.fillStyle = 'rgba(226,220,204,.42)';
        ctx.fillRect(x + 4, y + 4, w - 8, 12);
        ctx.fillStyle = 'rgba(26,24,19,.22)';
        ctx.fillRect(x + 3, y + 20, w - 6, h - 24);
        break;
      case 'bunk':
        box(ctx, x, y, w, h, k.c, k.t);
        ctx.fillStyle = 'rgba(226,220,204,.34)';
        ctx.fillRect(x + 3, y + 3, w - 6, 8);
        ctx.fillRect(x + 3, y + Math.round(h / 2) + 2, w - 6, 8);
        line(ctx, x + w - 5, y + 4, x + w - 5, y + h - 4, 'rgba(26,24,19,.40)');
        break;
      case 'cage':
        ctx.fillStyle = 'rgba(22,22,20,.42)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(150,152,146,.45)';
        ctx.lineWidth = 1.4;
        for (i = 6; i < w - 2; i += 11) line(ctx, x + i, y + 1, x + i, y + h - 1, 'rgba(150,152,146,.42)', 1.4);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        break;
      case 'freezer':
        box(ctx, x, y, w, h, k.c, k.t);
        ctx.fillStyle = 'rgba(224,232,232,.26)';
        ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
        line(ctx, x + 4, y + 8, x + w - 4, y + 8, 'rgba(40,48,50,.45)');
        break;
      case 'scale':
        box(ctx, x, y, w, h, k.c, k.t);
        disc(ctx, x + w / 2, y + h / 2, Math.min(w, h) * 0.3, 'rgba(228,222,198,.55)');
        break;
      case 'board':
        ctx.fillStyle = k.c;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(26,24,19,.55)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        line(ctx, x + 8, y + h * 0.45, x + w - 24, y + h * 0.45, 'rgba(214,222,206,.35)');
        break;
      case 'platform':
        ctx.fillStyle = k.c;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(226,190,90,.35)';
        for (i = 0; i < w; i += 16) ctx.fillRect(x + i, y, 8, 3);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        break;
      case 'barrier':
        ctx.fillStyle = k.c;
        ctx.fillRect(x, y, w, h);
        for (i = 0; i < w; i += 18) {
          ctx.fillStyle = 'rgba(226,214,186,.72)';
          ctx.fillRect(x + i, y, 9, h);
        }
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        break;
      case 'vault':
        disc(ctx, x + w / 2, y + h / 2, Math.min(w, h) / 2, k.c);
        ring(ctx, x + w / 2, y + h / 2, Math.min(w, h) / 2, INK, 1.4);
        ring(ctx, x + w / 2, y + h / 2, Math.min(w, h) * 0.32, 'rgba(214,206,180,.28)', 1.6);
        disc(ctx, x + w / 2, y + h / 2, Math.min(w, h) * 0.10, 'rgba(24,22,18,.55)');
        break;
      case 'sign':
        ctx.fillStyle = 'rgba(122,106,78,.55)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(30,26,18,.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        for (i = 0; i < 3; i++) {
          ctx.fillStyle = 'rgba(232,220,192,.32)';
          ctx.fillRect(x + 6, y + 8 + i * 10, w - 12 - i * 14, 3);
        }
        break;
      case 'pipe':
        ctx.fillStyle = k.c;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(226,220,198,.20)';
        ctx.fillRect(x, y + 1, w, 2);
        for (i = 26; i < w; i += 56) {
          ctx.fillStyle = 'rgba(26,24,19,.42)';
          ctx.fillRect(x + i, y - 1, 4, h + 2);
        }
        break;
      case 'valve':
        disc(ctx, x + w / 2, y + h / 2, w / 2, k.c);
        ring(ctx, x + w / 2, y + h / 2, w / 2, INK, 1.2);
        for (i = 0; i < 4; i++) {
          var a = (i / 4) * VG.TAU;
          line(ctx, x + w / 2, y + h / 2, x + w / 2 + Math.cos(a) * w * 0.44,
            y + h / 2 + Math.sin(a) * h * 0.44, 'rgba(26,22,16,.55)', 1.4);
        }
        break;
      case 'scope':
        disc(ctx, x + w / 2, y + h / 2, Math.min(w, h) * 0.46, k.c);
        ring(ctx, x + w / 2, y + h / 2, Math.min(w, h) * 0.46, INK, 1.4);
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(-0.5);
        ctx.fillStyle = '#40444e';
        ctx.fillRect(-7, -Math.min(w, h) * 0.62, 14, Math.min(w, h) * 0.5);
        ctx.restore();
        break;
      case 'plant':
        disc(ctx, x + w / 2, y + h / 2, w / 2, '#6a563f');
        for (i = 0; i < 5; i++) {
          var la = (i / 5) * VG.TAU + 0.4;
          ctx.fillStyle = i % 2 ? '#57603f' : '#454d33';
          ctx.beginPath();
          ctx.ellipse(x + w / 2 + Math.cos(la) * w * 0.34, y + h / 2 + Math.sin(la) * h * 0.34,
            w * 0.22, h * 0.14, la, 0, VG.TAU);
          ctx.fill();
        }
        break;
      case 'rug':
        ctx.fillStyle = k.c;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(226,190,150,.22)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
        ctx.strokeStyle = 'rgba(20,16,12,.20)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        break;
      default:
        box(ctx, x, y, w, h, k.c, k.t);
        break;
    }
  }

  /* ------------------------------------------------------------------ */
  /* the way out                                                          */
  /* ------------------------------------------------------------------ */

  /* The doorway is the one thing a player inside a building has to be able
     to find without being told. It gets daylight through the opening, the
     pool of light that lands on the floor, a threshold to stand on, a
     chevron and a slow pulse. Every layer is there so that it reads from
     the far corner of a dark room. */
  function paintExit(ctx, tpl, anim) {
    if (!VG.INT) return;
    var door = VG.INT.doorOf(tpl);
    if (!door) return;
    var dl = door.x - door.w / 2;
    var dr = door.x + door.w / 2;
    var pulse = 0.5 + 0.5 * Math.sin((anim || 0) * 2.2);

    /* the light coming through the opening */
    var og = ctx.createLinearGradient(0, tpl.h - 16, 0, tpl.h);
    og.addColorStop(0, 'rgba(255,206,132,.34)');
    og.addColorStop(1, 'rgba(255,240,200,.98)');
    ctx.fillStyle = og;
    ctx.fillRect(dl, tpl.h - 15, dr - dl, 15);

    /* the pool of light it throws on the floor */
    var sg = ctx.createLinearGradient(0, tpl.h - 76, 0, tpl.h - 14);
    sg.addColorStop(0, 'rgba(238,196,120,0)');
    sg.addColorStop(1, 'rgba(238,196,120,.34)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(dl, tpl.h - 14);
    ctx.lineTo(dr, tpl.h - 14);
    ctx.lineTo(dr + 30, tpl.h - 76);
    ctx.lineTo(dl - 30, tpl.h - 76);
    ctx.closePath();
    ctx.fill();

    /* the threshold on the floor */
    ctx.fillStyle = 'rgba(255,226,162,' + (0.40 + pulse * 0.26).toFixed(3) + ')';
    ctx.fillRect(door.x - 31, tpl.h - 28, 62, 9);

    /* the chevron, pointing out */
    ctx.strokeStyle = 'rgba(255,236,180,' + (0.60 + pulse * 0.34).toFixed(3) + ')';
    ctx.lineWidth = 2.8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(door.x - 15, tpl.h - 40);
    ctx.lineTo(door.x, tpl.h - 53);
    ctx.lineTo(door.x + 15, tpl.h - 40);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.lineJoin = 'miter';
  }

  /* ------------------------------------------------------------------ */
  /* the scene                                                            */
  /* ------------------------------------------------------------------ */

  function lightList(tpl, state, p) {
    var out = [];
    var i, l;
    if (tpl.lights) {
      for (i = 0; i < tpl.lights.length; i++) {
        l = tpl.lights[i];
        out.push({ x: l.x, y: l.y, r: l.r, c: l.c, i: l.i });
      }
    }
    var d = GFX.daylight ? GFX.daylight(state.time) : { amount: 0.5 };
    if (tpl.windows && tpl.windows.length) {
      for (i = 0; i < tpl.windows.length; i++) {
        var win = tpl.windows[i];
        out.push({
          x: win.x + win.w / 2,
          y: win.y + win.h + 18,
          r: 190,
          c: d.amount > 0.45 ? '#8fb6d8' : '#5d7f96',
          i: 0.30 + (1 - d.amount) * 0.34
        });
      }
    }
    /* the torch is a light source and it does not stop working indoors */
    if (p && p.weapon === 'wpn_scrap_torch') {
      out.push({ x: p.x, y: p.y, r: 170, c: '#f0b64a', i: 0.55 });
    }
    /* the doorway is a light source too. The way out is the brightest thing
       in the room, and it stays that way whatever the hour is. */
    if (VG.INT) {
      var door = VG.INT.doorOf(tpl);
      if (door) out.push({ x: door.x, y: door.y - 10, r: 210, c: '#ffd98f', i: 0.62 });
    }
    return out;
  }

  GFX.paintInterior = function (ctx, cam, room, p, state, world, view) {
    if (!ctx || !room) return;
    var tpl = room.tpl;
    var z = (VG.INT && VG.INT.zoom) || 1;
    var vw = view ? view.w : 1280;
    var vh = view ? view.h : 720;

    /* the roof of the building, seen from above, around the room */
    ctx.fillStyle = '#15130f';
    ctx.fillRect(0, 0, vw, vh);
    ctx.strokeStyle = 'rgba(255,255,255,.016)';
    ctx.lineWidth = 1;
    for (var ry = 0; ry < vh; ry += 52) {
      ctx.beginPath();
      ctx.moveTo(0, ry);
      ctx.lineTo(vw, ry);
      ctx.stroke();
    }

    ctx.save();
    ctx.scale(z, z);
    ctx.translate(-cam.x, -cam.y);

    /* the shell of the building, so the room is not a hole in a black
       screen: a lit rim around the outside of the walls */
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(-16, -16, tpl.w + 32, tpl.h + 32);
    ctx.fillStyle = '#2b2721';
    ctx.fillRect(-9, -9, tpl.w + 18, tpl.h + 18);
    ctx.fillStyle = 'rgba(210,196,160,.06)';
    ctx.fillRect(-9, -9, tpl.w + 18, 3);

    paintFloor(ctx, tpl);

    /* decals first, then furniture over them */
    var i, g, order = [];
    for (i = 0; i < tpl.furn.length; i++) {
      g = tpl.furn[i];
      if (g.ns && g.k !== 'rug') continue;
      if (g.k === 'rug') { paintFurn(ctx, g, i); continue; }
      order.push(g);
    }
    order.sort(function (a, b) { return (a.y + a.h) - (b.y + b.h); });
    for (i = 0; i < order.length; i++) paintFurn(ctx, order[i], i);

    paintWalls(ctx, tpl);

    var d = GFX.daylight ? GFX.daylight(state.time) : { amount: 0.5 };
    paintWindows(ctx, tpl, 1 - d.amount);

    /* the crates you can search */
    if (room.containers && GFX.paintContainerAt) {
      for (i = 0; i < room.containers.length; i++) {
        var c = room.containers[i];
        if (!c || c.opened) continue;
        GFX.paintContainerAt(ctx, c, c.ix, c.iy);
      }
    }

    /* the way out */
    paintExit(ctx, tpl, state ? state.anim : 0);

    /* the player, in the same logical space as the room */
    if (p && GFX.paintPlayerOnly) GFX.paintPlayerOnly(ctx, { x: 0, y: 0 }, p, state);

    ctx.restore();

    /* ---- lighting, in screen space ---- */
    var lights = lightList(tpl, state, p);
    var dark = 0.20 + d.amount * 0.58;

    ctx.save();
    ctx.fillStyle = 'rgba(5,7,11,' + dark.toFixed(3) + ')';
    ctx.fillRect(0, 0, vw, vh);

    ctx.globalCompositeOperation = 'destination-out';
    for (i = 0; i < lights.length; i++) {
      var l = lights[i];
      var lx = (l.x - cam.x) * z, ly = (l.y - cam.y) * z;
      var lr = l.r * z;
      if (lx + lr < 0 || ly + lr < 0 || lx - lr > vw || ly - lr > vh) continue;
      var g = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr);
      g.addColorStop(0, 'rgba(0,0,0,' + (0.85 * l.i + 0.15).toFixed(3) + ')');
      g.addColorStop(0.55, 'rgba(0,0,0,' + (0.45 * l.i).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - lr, ly - lr, lr * 2, lr * 2);
    }

    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < lights.length; i++) {
      var l2 = lights[i];
      var lx2 = (l2.x - cam.x) * z, ly2 = (l2.y - cam.y) * z;
      var lr2 = l2.r * z;
      if (lx2 + lr2 < 0 || ly2 + lr2 < 0 || lx2 - lr2 > vw || ly2 - lr2 > vh) continue;
      var g2 = ctx.createRadialGradient(lx2, ly2, 0, lx2, ly2, lr2 * 0.8);
      g2.addColorStop(0, hexA(l2.c, 0.30 * l2.i + 0.06));
      g2.addColorStop(1, hexA(l2.c, 0));
      ctx.fillStyle = g2;
      ctx.fillRect(lx2 - lr2, ly2 - lr2, lr2 * 2, lr2 * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    /* a vignette so the room feels like a room */
    var vg = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.30,
      vw / 2, vh / 2, Math.max(vw, vh) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.52)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, vw, vh);
  };

  /* '#rrggbb' plus an alpha -> rgba() */
  function hexA(hex, a) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16);
    var g = parseInt(h.slice(2, 4), 16);
    var b = parseInt(h.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return 'rgba(240,182,74,' + a + ')';
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  /* ------------------------------------------------------------------ */
  /* door markers on the outside                                          */
  /* ------------------------------------------------------------------ */

  GFX.paintInteriorDoors = function (ctx, cam, world, p) {
    if (!ctx || !world || !world.pois || !VG.INT) return;
    var camx = cam ? cam.x : 0, camy = cam ? cam.y : 0;
    var vw = (ctx.canvas && ctx.canvas.width) || 1280;
    var vh = (ctx.canvas && ctx.canvas.height) || 720;
    var i, poi, d, sx, sy, near, pd, a;
    for (i = 0; i < world.pois.length; i++) {
      poi = world.pois[i];
      if (!VG.INT.has(poi)) continue;
      d = VG.INT.doorWorld(poi);
      if (!d) continue;
      sx = d.x - camx;
      sy = d.y - camy;
      if (sx < -50 || sy < -50 || sx > vw + 50 || sy > vh + 50) continue;
      pd = p ? VG.dist(p.x, p.y, d.x, d.y) : 9999;
      near = pd < VG.INT.DOOR_REACH + 22;
      a = near ? 0.85 : 0.34;

      /* a threshold mat on the ground */
      ctx.fillStyle = 'rgba(20,18,14,.40)';
      ctx.fillRect(sx - 13, sy - 4, 26, 9);
      ctx.fillStyle = 'rgba(232,190,110,' + a.toFixed(2) + ')';
      ctx.fillRect(sx - 11, sy - 2, 22, 2);

      /* a chevron pointing into the building */
      ctx.strokeStyle = 'rgba(232,190,110,' + a.toFixed(2) + ')';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sx - 5, sy + 4);
      ctx.lineTo(sx, sy);
      ctx.lineTo(sx + 5, sy + 4);
      ctx.stroke();

      if (near) {
        var pulse = 0.5 + 0.5 * Math.sin((VG.INT.view && VG.INT.view.t ? VG.INT.view.t : 0) * 4);
        ctx.strokeStyle = 'rgba(232,190,110,' + (0.30 + pulse * 0.28).toFixed(2) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx, sy - 2, 13 + pulse * 3, 0, VG.TAU);
        ctx.stroke();
      }
    }
  };
})(window.VG.GFX, window.VG);
