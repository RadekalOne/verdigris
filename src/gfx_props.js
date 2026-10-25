/* VERDIGRIS — props: structures, ground clutter and searchable containers.
   One bespoke silhouette per POI type, every solid form built with the
   four-layer recipe (ground shadow, body, vertical gradient, detail) plus a
   north-west rim light and a south-east contact shadow. */
window.VG = window.VG || {};
window.VG.GFX = window.VG.GFX || {};
(function (GFX, VG) {
  'use strict';

  /* ============================== palette ============================== */
  var INK = '#1b1a17';
  var AMBER = '#f0b64a';
  var AMBER_DIM = '#c69a45';
  var EMBER = '#c9533f';
  var L_AMBER = '255,196,110';
  var L_EMBER = '201,83,63';
  var RUST = '#8a4f2a';
  var STEEL = '#4a4f52';
  var DEEP = '#2f4a4a';
  var ENAMEL = '#9aa39c';
  var VERDIG = '#5d8a78';
  var CONCRETE = '#8d8a80';
  var EARTH = '#6f6355';
  var CANVAS = '#9a8f74';
  var SHADOW_COL = 'rgba(28,24,18,.30)';

  /* every silhouette is drawn inside this design box and scaled to the tier */
  var DW = 44, DH = 34;
  var SIZE = [[30, 24], [44, 34], [62, 48], [88, 70]];
  var _sc = 1;                 /* live design -> screen scale */
  var _gc = null, _gcCtx = null;   /* gradient cache */

  /* ============================ path helpers ============================ */
  function pathRect(ctx, x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); }

  function pathRound(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.arcTo(x + w, y, x + w, y + rr, rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    ctx.lineTo(x + rr, y + h);
    ctx.arcTo(x, y + h, x, y + h - rr, rr);
    ctx.lineTo(x, y + rr);
    ctx.arcTo(x, y, x + rr, y, rr);
    ctx.closePath();
  }

  function pathEll(ctx, cx, cy, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, VG.TAU);
  }

  /* half ellipse: down = bulging south, otherwise bulging north */
  function pathHalfEll(ctx, cx, cy, rx, ry, down) {
    ctx.beginPath();
    if (down) ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
    else ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, VG.TAU);
    ctx.closePath();
  }

  function pathPoly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }

  /* ============================ paint helpers ============================ */
  function gradV(ctx, color, x, y, h) {
    if (_gcCtx !== ctx) { _gc = {}; _gcCtx = ctx; }
    var key = color + '|' + x + '|' + y + '|' + h;
    var g = _gc[key];
    if (!g) {
      g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, VG.shade(color, 0.14));
      g.addColorStop(1, VG.shade(color, -0.18));
      _gc[key] = g;
    }
    return g;
  }

  /* one stroke that is a rim light in the north-west and a contact shadow
     in the south-east */
  function gradEdge(ctx) {
    if (_gcCtx !== ctx) { _gc = {}; _gcCtx = ctx; }
    var g = _gc.edge;
    if (!g) {
      g = ctx.createLinearGradient(0, 0, DW, DH);
      g.addColorStop(0, 'rgba(255,240,210,.16)');
      g.addColorStop(0.38, 'rgba(255,240,210,.03)');
      g.addColorStop(0.55, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,.18)');
      _gc.edge = g;
    }
    return g;
  }

  /* 1. ground shadow, offset +4 +5 */
  function shadow(ctx, pathFn, dx, dy) {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.fillStyle = SHADOW_COL;
    pathFn(ctx);
    ctx.fill();
    ctx.restore();
  }

  /* 2 + 3 + edges: body colour then a vertical gradient over the bbox */
  function form(ctx, pathFn, color, x, y, w, h, opt) {
    opt = opt || {};
    if (!opt.noShadow) shadow(ctx, pathFn, opt.sx === undefined ? 4 : opt.sx, opt.sy === undefined ? 5 : opt.sy);
    pathFn(ctx);
    ctx.fillStyle = color;
    ctx.fill();
    if (!opt.noGrad) {
      ctx.fillStyle = gradV(ctx, color, x, y, h);
      ctx.fill();
    }
    if (!opt.noEdge) {
      ctx.lineWidth = 1.25 / _sc;
      ctx.strokeStyle = gradEdge(ctx);
      ctx.stroke();
    }
  }

  /* detail fill, no shadow, no gradient */
  function flat(ctx, pathFn, color) {
    pathFn(ctx);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function seg(ctx, x1, y1, x2, y2, style, w) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = style || INK;
    ctx.lineWidth = w || (1 / _sc);
    ctx.stroke();
  }

  function polyline(ctx, pts, style, w) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = style || INK;
    ctx.lineWidth = w || (1 / _sc);
    ctx.stroke();
  }

  function dot(ctx, x, y, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, VG.TAU);
    ctx.fillStyle = color;
    ctx.fill();
  }

  /* a light in screen space */
  function addLight(info, lx, ly, r, color, intensity) {
    info.lights.push({
      x: info.ox + lx * info.sx,
      y: info.oy + ly * info.sy,
      r: r * info.sx,
      color: color,
      intensity: intensity
    });
  }

  /* per-poi random, stable across frames */
  function rnd(seed, k) { return VG.hash2(Math.floor(seed * 1000000), k, 9176); }

  /* small yard mass used by tier 2 and tier 3 compounds */
  function yardProp(ctx, x, y, kind) {
    if (kind === 0) {
      form(ctx, function () { pathRect(ctx, x, y, 11, 7); }, '#7f7a6d', x, y, 11, 7, { sx: 2, sy: 2 });
      seg(ctx, x, y + 3, x + 11, y + 3, 'rgba(27,26,23,.45)');
    } else if (kind === 1) {
      form(ctx, function () { pathEll(ctx, x + 4, y + 3, 4, 3); }, RUST, x, y, 8, 6, { sx: 2, sy: 2 });
      flat(ctx, function () { pathEll(ctx, x + 4, y + 2.4, 2, 1.4); }, '#a0603a');
    } else {
      form(ctx, function () { pathRect(ctx, x, y, 8, 6); }, RUST, x, y, 8, 6, { sx: 2, sy: 2 });
      form(ctx, function () { pathRect(ctx, x + 1, y + 6, 6, 4); }, '#7a4426', x + 1, y + 6, 6, 4, { sx: 2, sy: 2 });
    }
  }

  /* ======================== the thirty silhouettes ======================== */

  /* house: gabled body (two sloped roof quads) + chimney + porch step */
  function sil_house(ctx, info) {
    var roofN = '#a08d76', roofS = '#6f6253', wall = '#b3a68e';
    form(ctx, function () { pathRect(ctx, 4, 7, 36, 22); }, roofN, 4, 7, 36, 22);
    flat(ctx, function () { pathPoly(ctx, [[4, 18], [40, 18], [40, 29], [4, 29]]); }, roofS);
    flat(ctx, function () { pathPoly(ctx, [[4, 7], [40, 7], [40, 18], [4, 18]]); }, '#b09c83');
    seg(ctx, 4, 18, 40, 18, 'rgba(27,26,23,.55)', 1.2);
    /* chimney */
    form(ctx, function () { pathRect(ctx, 28, 9, 5, 7); }, '#6b5f50', 28, 9, 5, 7, { sx: 1, sy: 1 });
    flat(ctx, function () { pathRect(ctx, 27.5, 8.5, 6, 2); }, '#4a4237');
    /* porch step and door */
    form(ctx, function () { pathRect(ctx, 15, 29, 12, 5); }, '#a49a86', 15, 29, 12, 5, { sx: 1, sy: 1, noEdge: true });
    flat(ctx, function () { pathRect(ctx, 18, 26, 5, 4); }, '#2b2822');
    /* lit skylight */
    rect(ctx, 28, 20, 5, 4, AMBER);
    rect(ctx, 28, 20, 5, 1, '#ffe0a0');
    if (info.tier >= 2) yardProp(ctx, 2, 2, info.tier >= 3 ? 0 : 2);
    addLight(info, 30, 22, 80, L_AMBER, 0.42);
  }

  /* shop: wide flat-roof box + awning stripe + projecting sign board */
  function sil_shop(ctx, info) {
    form(ctx, function () { pathRect(ctx, 3, 8, 38, 20); }, ENAMEL, 3, 8, 38, 20);
    flat(ctx, function () { pathRect(ctx, 6, 11, 32, 12); }, '#aab3ac');
    seg(ctx, 8, 17, 36, 17, 'rgba(27,26,23,.32)');
    seg(ctx, 8, 21, 36, 21, 'rgba(27,26,23,.22)');
    /* shopfront window under the awning */
    rect(ctx, 5, 21, 34, 3, AMBER_DIM);
    /* awning: alternating stripes */
    for (var i = 0; i < 6; i++) {
      rect(ctx, 3 + i * 6.4, 24, 6.4, 8, i % 2 ? '#a8533f' : '#c9bda6');
    }
    seg(ctx, 3, 24, 41, 24, 'rgba(27,26,23,.4)');
    /* projecting sign board */
    form(ctx, function () { pathRect(ctx, 33, 2, 8, 7); }, '#6b6257', 33, 2, 8, 7, { sx: 2, sy: 2 });
    seg(ctx, 37, 8, 37, 9, INK, 1);
    if (info.tier >= 2) yardProp(ctx, 2, 1, 2);
    addLight(info, 22, 22, 90, L_AMBER, 0.45);
  }

  /* clinic: flat roof + cross plate on the facade + access ramp */
  function sil_clinic(ctx, info) {
    form(ctx, function () { pathRect(ctx, 4, 6, 34, 24); }, '#c0beb3', 4, 6, 34, 24);
    flat(ctx, function () { pathRect(ctx, 7, 9, 28, 13); }, '#cbc9be');
    flat(ctx, function () { pathRect(ctx, 10, 12, 22, 7); }, '#d3d1c6');
    /* cross plate */
    rect(ctx, 19, 22, 5, 11, '#e2e0d6');
    rect(ctx, 16, 25, 11, 5, '#e2e0d6');
    seg(ctx, 16, 25, 27, 25, 'rgba(27,26,23,.4)');
    /* access ramp */
    form(ctx, function () { pathPoly(ctx, [[24, 30], [40, 30], [40, 34], [24, 34]]); }, CONCRETE, 24, 30, 16, 4, { sx: 1, sy: 1, noEdge: true });
    seg(ctx, 26, 31, 38, 31, 'rgba(27,26,23,.3)');
    rect(ctx, 9, 20, 5, 4, AMBER);
    if (info.tier >= 2) yardProp(ctx, 2, 1, 0);
    addLight(info, 11, 22, 80, L_AMBER, 0.4);
  }

  /* police: flat roof + tall sign mast + pale blue-grey accent band */
  function sil_police(ctx, info) {
    form(ctx, function () { pathRect(ctx, 3, 9, 29, 22); }, '#8e9691', 3, 9, 29, 22);
    flat(ctx, function () { pathRect(ctx, 6, 12, 23, 11); }, '#99a19c');
    flat(ctx, function () { pathRect(ctx, 3, 26, 29, 5); }, '#8c9aa6');
    seg(ctx, 3, 26, 32, 26, 'rgba(27,26,23,.4)');
    /* tall sign mast */
    form(ctx, function () { pathRect(ctx, 34, 3, 3, 19); }, STEEL, 34, 3, 3, 19, { sx: 2, sy: 2 });
    form(ctx, function () { pathRect(ctx, 30, 0, 11, 5); }, '#5e6663', 30, 0, 11, 5, { sx: 2, sy: 2 });
    dot(ctx, 35, 2.5, 1.4, AMBER);
    if (info.tier >= 2) yardProp(ctx, 2, 1, 2);
    addLight(info, 35, 2, 70, L_AMBER, 0.4);
  }

  /* library: flat roof + column row along the front + pediment */
  function sil_library(ctx, info) {
    form(ctx, function () { pathRect(ctx, 6, 9, 32, 19); }, '#a89e8c', 6, 9, 32, 19);
    flat(ctx, function () { pathRect(ctx, 9, 12, 26, 12); }, '#b4ab98');
    /* pediment */
    form(ctx, function () { pathPoly(ctx, [[5, 9], [22, 1], [39, 9]]); }, '#b7ae9b', 5, 1, 34, 8, { sx: 2, sy: 2 });
    /* lit reading-room band */
    rect(ctx, 11, 24, 22, 3, AMBER_DIM);
    /* column row along the front */
    for (var i = 0; i < 6; i++) {
      form(ctx, (function (x) {
        return function () { pathRect(ctx, x, 27, 3, 7); };
      })(6.5 + i * 6.2), '#bdb3a0', 6.5 + i * 6.2, 27, 3, 7, { sx: 1, sy: 1, noEdge: true });
    }
    if (info.tier >= 2) yardProp(ctx, 1, 1, 1);
    addLight(info, 22, 25, 90, L_AMBER, 0.45);
  }

  /* chapel: steep gable + small spire */
  function sil_chapel(ctx, info) {
    form(ctx, function () { pathRect(ctx, 11, 13, 22, 19); }, '#a8a094', 11, 13, 22, 19);
    form(ctx, function () { pathPoly(ctx, [[8, 30], [22, 4], [36, 30]]); }, '#6f6558', 8, 4, 28, 26);
    flat(ctx, function () { pathPoly(ctx, [[8, 30], [22, 4], [22, 30]]); }, '#8a7f6d');
    seg(ctx, 22, 4, 22, 30, 'rgba(27,26,23,.6)', 1.2);
    /* spire */
    form(ctx, function () { pathPoly(ctx, [[19, 5], [22, 0], [25, 5]]); }, '#5c5348', 19, 0, 6, 5, { sx: 1, sy: 1 });
    seg(ctx, 19.5, 2.5, 24.5, 2.5, INK, 1);
    /* lit window */
    rect(ctx, 12, 21, 4, 6, AMBER);
    rect(ctx, 12, 21, 4, 1.5, '#ffe0a0');
    if (info.tier >= 2) yardProp(ctx, 2, 2, 2);
    addLight(info, 14, 24, 70, L_AMBER, 0.38);
  }

  /* diner: long box + rounded roof + amber neon strip along the facade */
  function sil_diner(ctx, info) {
    form(ctx, function () { pathRound(ctx, 2, 9, 40, 19, 7); }, '#a7b0a9', 2, 9, 40, 19);
    flat(ctx, function () { pathRound(ctx, 5, 12, 34, 13, 5); }, '#b8c1ba');
    seg(ctx, 14, 13, 14, 24, 'rgba(27,26,23,.28)');
    seg(ctx, 28, 13, 28, 24, 'rgba(27,26,23,.28)');
    flat(ctx, function () { pathRound(ctx, 18, 14, 9, 9, 2); }, '#c6cec7');
    /* neon strip */
    rect(ctx, 4, 26, 36, 3, AMBER);
    rect(ctx, 4, 26, 36, 1, '#ffe6a8');
    if (info.tier >= 2) yardProp(ctx, 3, 1, 2);
    addLight(info, 22, 27, 110, L_AMBER, 0.6);
  }

  /* gas: flat canopy on two posts + pump island + price sign post */
  function sil_gas(ctx, info) {
    form(ctx, function () { pathRound(ctx, 3, 4, 37, 16, 3); }, ENAMEL, 3, 4, 37, 16);
    flat(ctx, function () { pathRect(ctx, 6, 7, 31, 10); }, '#a8b1aa');
    /* posts */
    form(ctx, function () { pathRect(ctx, 8, 19, 3, 12); }, STEEL, 8, 19, 3, 12, { sx: 1, sy: 1, noEdge: true });
    form(ctx, function () { pathRect(ctx, 32, 19, 3, 12); }, STEEL, 32, 19, 3, 12, { sx: 1, sy: 1, noEdge: true });
    /* pump island */
    form(ctx, function () { pathRound(ctx, 10, 18, 22, 13, 2); }, '#b4b1a6', 10, 18, 22, 13, { sx: 2, sy: 2 });
    form(ctx, function () { pathRect(ctx, 13, 20, 6, 8); }, RUST, 13, 20, 6, 8, { sx: 1, sy: 1 });
    form(ctx, function () { pathRect(ctx, 23, 20, 6, 8); }, RUST, 23, 20, 6, 8, { sx: 1, sy: 1 });
    rect(ctx, 14, 21, 4, 2, '#cfd4ce');
    rect(ctx, 24, 21, 4, 2, '#cfd4ce');
    /* price sign post */
    form(ctx, function () { pathRect(ctx, 38, 12, 2, 18); }, STEEL, 38, 12, 2, 18, { sx: 1, sy: 1, noEdge: true });
    form(ctx, function () { pathRect(ctx, 34, 3, 10, 7); }, '#6f6659', 34, 3, 10, 7, { sx: 2, sy: 2 });
    flat(ctx, function () { pathRect(ctx, 35, 4, 8, 5); }, '#c8bda6');
    if (info.tier >= 2) yardProp(ctx, 2, 26, 2);
  }

  /* watertower: four splayed legs + cylindrical tank + conical cap + ladder rungs */
  function sil_watertower(ctx, info) {
    var rust = '#8a4f2a';
    /* legs */
    seg(ctx, 13, 18, 6, 33, STEEL, 2);
    seg(ctx, 20, 18, 15, 33, STEEL, 2);
    seg(ctx, 24, 18, 29, 33, STEEL, 2);
    seg(ctx, 31, 18, 38, 33, STEEL, 2);
    seg(ctx, 9, 27, 35, 27, 'rgba(74,79,82,.7)', 1.2);
    /* tank */
    form(ctx, function () { pathRect(ctx, 9, 12, 26, 11); }, rust, 9, 12, 26, 11);
    form(ctx, function () { pathEll(ctx, 22, 12, 13, 6.5); }, '#9d5f33', 9, 5.5, 26, 13);
    flat(ctx, function () { pathEll(ctx, 19, 10, 7, 3); }, '#b0754a');
    /* conical cap */
    form(ctx, function () { pathPoly(ctx, [[22, 0], [32, 6], [12, 6]]); }, '#7a4426', 12, 0, 20, 6, { sx: 1, sy: 1 });
    /* ladder rungs */
    seg(ctx, 35, 14, 35, 23, '#6d6558', 1);
    seg(ctx, 38, 14, 38, 23, '#6d6558', 1);
    for (var i = 0; i < 4; i++) seg(ctx, 35, 15 + i * 2.4, 38, 15 + i * 2.4, '#6d6558', 1);
    if (info.tier >= 2) yardProp(ctx, 1, 2, 1);
  }

  /* substation: box + two transformer blocks + three insulator stacks + fence */
  function sil_substation(ctx, info) {
    /* perimeter fence */
    ctx.save();
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = 'rgba(60,55,46,.75)';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, 42, 32);
    ctx.restore();
    /* insulator stacks */
    for (var i = 0; i < 3; i++) {
      var x = 18 + i * 7;
      seg(ctx, x, 14, x, 7, STEEL, 1.4);
      for (var j = 0; j < 3; j++) flat(ctx, (function (ex, ey) {
        return function () { pathEll(ctx, ex, ey, 2, 1); };
      })(x, 8 + j * 2.4), '#2f4a4a');
    }
    /* control box */
    form(ctx, function () { pathRect(ctx, 3, 19, 13, 12); }, CONCRETE, 3, 19, 13, 12);
    flat(ctx, function () { pathRect(ctx, 5, 21, 9, 6); }, '#9c988c');
    /* transformer blocks */
    form(ctx, function () { pathRound(ctx, 19, 15, 11, 12, 2); }, STEEL, 19, 15, 11, 12);
    for (var f = 0; f < 3; f++) seg(ctx, 20, 18 + f * 3, 29, 18 + f * 3, 'rgba(20,22,24,.8)', 1);
    form(ctx, function () { pathRound(ctx, 31, 19, 11, 10, 2); }, '#41464a', 31, 19, 11, 10);
    seg(ctx, 32, 22, 41, 22, 'rgba(20,22,24,.7)', 1);
    seg(ctx, 32, 25, 41, 25, 'rgba(20,22,24,.7)', 1);
    if (info.tier >= 2) yardProp(ctx, 2, 2, 2);
  }

  /* reactor_yard: containment dome + tall cooling stack + pipe runs */
  function sil_reactor_yard(ctx, info) {
    form(ctx, function () { pathEll(ctx, 14, 20, 12, 12); }, VERDIG, 2, 8, 24, 24);
    flat(ctx, function () { pathEll(ctx, 12, 18, 7, 7); }, '#71a08b');
    flat(ctx, function () { pathEll(ctx, 10, 15, 3, 2.6); }, '#8cb9a3');
    /* cooling stack */
    form(ctx, function () { pathEll(ctx, 35, 9, 7, 7); }, '#6d8a7c', 28, 2, 14, 14);
    flat(ctx, function () { pathEll(ctx, 35, 9, 4, 4); }, DEEP);
    flat(ctx, function () { pathEll(ctx, 33.5, 7.5, 1.6, 1.6); }, '#16211f');
    /* horizontal pipe runs */
    seg(ctx, 23, 17, 30, 17, RUST, 2.4);
    seg(ctx, 23, 21, 31, 21, RUST, 2.4);
    seg(ctx, 23, 25, 30, 25, RUST, 2.4);
    dot(ctx, 30, 17, 1.4, '#a0603a');
    dot(ctx, 31, 21, 1.4, '#a0603a');
    /* containment wall arc */
    polyline(ctx, [[3, 26], [9, 30], [20, 31]], 'rgba(60,72,66,.8)', 1.4);
    /* amber beacon */
    dot(ctx, 14, 12, 1.7, AMBER);
    addLight(info, 14, 12, 90, L_AMBER, 0.5);
    if (info.tier >= 2) yardProp(ctx, 2, 2, 1);
  }

  /* mine: headframe (A-legs + wheel) + spoil heap + rail spur */
  function sil_mine(ctx, info) {
    /* rail spur */
    seg(ctx, 0, 29, 27, 29, '#5a5145', 1.4);
    seg(ctx, 0, 32, 27, 32, '#5a5145', 1.4);
    for (var s = 0; s < 7; s++) seg(ctx, s * 4, 28, s * 4, 33, 'rgba(70,62,52,.9)', 1.4);
    /* headframe */
    seg(ctx, 14, 10, 7, 30, STEEL, 2.2);
    seg(ctx, 14, 10, 21, 30, STEEL, 2.2);
    seg(ctx, 11, 19, 18, 19, 'rgba(74,79,82,.8)', 1.4);
    seg(ctx, 9, 25, 19, 25, 'rgba(74,79,82,.8)', 1.4);
    /* sheave wheel */
    flat(ctx, function () { pathEll(ctx, 14, 6, 6, 6); }, '#5b6164');
    flat(ctx, function () { pathEll(ctx, 14, 6, 3.4, 3.4); }, '#31363a');
    seg(ctx, 8, 6, 20, 6, '#43494c', 1);
    seg(ctx, 14, 0, 14, 12, '#43494c', 1);
    /* spoil heap */
    form(ctx, function () { pathPoly(ctx, [[24, 20], [29, 14], [37, 17], [42, 25], [33, 30], [24, 26]]); }, '#7a6a54', 24, 14, 18, 16, { sx: 3, sy: 3 });
    flat(ctx, function () { pathPoly(ctx, [[29, 14], [37, 17], [33, 22], [24, 20]]); }, '#8f7f66');
    if (info.tier >= 2) yardProp(ctx, 2, 2, 2);
  }

  /* school: long block + bell tower + low yard wall */
  function sil_school(ctx, info) {
    form(ctx, function () { pathRect(ctx, 3, 11, 29, 17); }, '#b0a794', 3, 11, 29, 17);
    flat(ctx, function () { pathRect(ctx, 6, 14, 23, 9); }, '#bcb39f');
    /* bell tower */
    form(ctx, function () { pathRect(ctx, 34, 6, 8, 15); }, '#a89e8c', 34, 6, 8, 15);
    flat(ctx, function () { pathRect(ctx, 35.5, 8, 5, 5); }, DEEP);
    form(ctx, function () { pathPoly(ctx, [[33, 6], [38, 1], [43, 6]]); }, '#6f6558', 33, 1, 10, 5, { sx: 1, sy: 1 });
    /* lit windows */
    rect(ctx, 7, 23, 4, 3, AMBER);
    rect(ctx, 13, 23, 4, 3, AMBER);
    rect(ctx, 19, 23, 4, 3, AMBER_DIM);
    /* yard wall */
    form(ctx, function () { pathRect(ctx, 0, 30, 15, 3); }, '#9a917f', 0, 30, 15, 3, { sx: 1, sy: 1, noEdge: true });
    form(ctx, function () { pathRect(ctx, 20, 30, 24, 3); }, '#9a917f', 20, 30, 24, 3, { sx: 1, sy: 1, noEdge: true });
    addLight(info, 13, 24, 90, L_AMBER, 0.45);
  }

  /* hotel: tall block + vertical window bands + projecting marquee */
  function sil_hotel(ctx, info) {
    form(ctx, function () { pathRect(ctx, 9, 2, 26, 26); }, '#a2977f', 9, 2, 26, 26);
    flat(ctx, function () { pathRect(ctx, 12, 5, 20, 5); }, '#ab9f86');
    /* vertical window bands */
    var lit = [];
    for (var i = 0; i < 3; i++) lit.push(rnd(info.seed, 40 + i) > 0.45);
    for (var b = 0; b < 3; b++) {
      var bx = 13 + b * 7;
      for (var f = 0; f < 4; f++) {
        var on = lit[b] && (f !== 2);
        rect(ctx, bx, 12 + f * 4, 3, 3, on ? AMBER : '#33332d');
      }
    }
    /* marquee */
    form(ctx, function () { pathRect(ctx, 5, 26, 34, 6); }, '#8e8471', 5, 26, 34, 6, { sx: 2, sy: 2 });
    flat(ctx, function () { pathRect(ctx, 5, 30, 34, 2); }, '#4a463c');
    seg(ctx, 9, 26, 9, 32, 'rgba(27,26,23,.4)');
    seg(ctx, 35, 26, 35, 32, 'rgba(27,26,23,.4)');
    if (info.tier >= 2) yardProp(ctx, 1, 12, 2);
    addLight(info, 22, 15, 110, L_AMBER, 0.5);
  }

  /* bank: columned front + wide steps */
  function sil_bank(ctx, info) {
    form(ctx, function () { pathRect(ctx, 6, 5, 32, 19); }, '#a8a290', 6, 5, 32, 19);
    flat(ctx, function () { pathRect(ctx, 9, 8, 26, 11); }, '#b3ad9a');
    form(ctx, function () { pathEll(ctx, 22, 8, 5, 4); }, '#bdb7a4', 17, 4, 10, 8, { sx: 1, sy: 1, noEdge: true });
    /* columns */
    for (var i = 0; i < 5; i++) {
      form(ctx, (function (x) {
        return function () { pathRect(ctx, x, 24, 3, 6); };
      })(9 + i * 6.4), '#bdb3a0', 9 + i * 6.4, 24, 3, 6, { sx: 1, sy: 1, noEdge: true });
    }
    /* wide steps */
    form(ctx, function () { pathRect(ctx, 2, 30, 40, 2); }, '#b0a894', 2, 30, 40, 2, { sx: 1, sy: 1, noEdge: true });
    form(ctx, function () { pathRect(ctx, 4, 32, 36, 2); }, '#a89f8b', 4, 32, 36, 2, { sx: 1, sy: 1, noEdge: true });
    if (info.tier >= 2) yardProp(ctx, 1, 1, 0);
  }

  /* radio_tower: lattice mast (crossed bracing) + guy wires + red lamp */
  function sil_radio_tower(ctx, info) {
    seg(ctx, 22, 7, 4, 32, 'rgba(45,40,32,.6)', 1);
    seg(ctx, 22, 7, 40, 32, 'rgba(45,40,32,.6)', 1);
    seg(ctx, 22, 7, 22, 33, 'rgba(45,40,32,.45)', 1);
    /* two rails of the lattice */
    seg(ctx, 19, 33, 21, 6, STEEL, 1.8);
    seg(ctx, 25, 33, 23, 6, STEEL, 1.8);
    /* crossed bracing */
    for (var i = 0; i < 4; i++) {
      var t0 = 7 + i * 6.5, t1 = t0 + 6.5;
      var l0 = 19 + (21 - 19) * (1 - (t0 - 6) / 27), r0 = 25 + (23 - 25) * (1 - (t0 - 6) / 27);
      var l1 = 19 + (21 - 19) * (1 - (t1 - 6) / 27), r1 = 25 + (23 - 25) * (1 - (t1 - 6) / 27);
      seg(ctx, l0, t0, r1, t1, 'rgba(74,79,82,.9)', 1);
      seg(ctx, r0, t0, l1, t1, 'rgba(74,79,82,.9)', 1);
      seg(ctx, l1, t1, r1, t1, 'rgba(74,79,82,.9)', 1);
    }
    /* aircraft lamp */
    dot(ctx, 22, 4, 2.2, 'rgba(201,83,63,.35)');
    dot(ctx, 22, 4, 1.4, EMBER);
    if (info.tier >= 2) yardProp(ctx, 3, 24, 1);
    addLight(info, 22, 4, 80, L_EMBER, 0.55);
  }

  /* hangar: half-cylinder arched roof + open dark door */
  function sil_hangar(ctx, info) {
    form(ctx, function () { pathRound(ctx, 4, 6, 36, 26, 13); }, '#93968f', 4, 6, 36, 26);
    flat(ctx, function () { pathHalfEll(ctx, 22, 17, 18, 11, false); }, '#a4a79f');
    seg(ctx, 11, 10, 11, 24, 'rgba(74,79,82,.5)');
    seg(ctx, 22, 6, 22, 25, 'rgba(74,79,82,.5)');
    seg(ctx, 33, 10, 33, 24, 'rgba(74,79,82,.5)');
    /* open dark door */
    form(ctx, function () { pathRound(ctx, 16, 14, 12, 18, 4); }, '#2b2c28', 16, 14, 12, 18, { noShadow: true });
    flat(ctx, function () { pathRound(ctx, 18, 16, 8, 14, 3); }, '#191a17');
    if (info.tier >= 2) yardProp(ctx, 1, 2, 2);
  }

  /* camp: two canvas tents + fire ring + crate stack */
  function sil_camp(ctx, info) {
    form(ctx, function () { pathPoly(ctx, [[2, 28], [11, 9], [20, 28]]); }, CANVAS, 2, 9, 18, 19);
    flat(ctx, function () { pathPoly(ctx, [[11, 9], [20, 28], [11, 28]]); }, '#7f7560');
    form(ctx, function () { pathPoly(ctx, [[22, 26], [31, 11], [40, 26]]); }, '#8d8368', 22, 11, 18, 15);
    flat(ctx, function () { pathPoly(ctx, [[31, 11], [40, 26], [31, 26]]); }, '#736a57');
    /* fire ring */
    for (var i = 0; i < 7; i++) {
      var a = (i / 7) * VG.TAU;
      dot(ctx, 16 + Math.cos(a) * 3.2, 30 + Math.sin(a) * 2.2, 1.1, '#4a4438');
    }
    dot(ctx, 16, 30, 1.5, AMBER);
    dot(ctx, 16, 29.4, 0.8, '#ffe0a0');
    /* crate stack */
    form(ctx, function () { pathRect(ctx, 27, 25, 7, 6); }, RUST, 27, 25, 7, 6, { sx: 1, sy: 1 });
    form(ctx, function () { pathRect(ctx, 34, 27, 6, 5); }, '#7a4426', 34, 27, 6, 5, { sx: 1, sy: 1 });
    addLight(info, 16, 30, 95, L_AMBER, 0.55);
  }

  /* monument: stepped plinth + tapered obelisk */
  function sil_monument(ctx, info) {
    form(ctx, function () { pathRect(ctx, 8, 26, 28, 8); }, '#b3ab99', 8, 26, 28, 8);
    form(ctx, function () { pathRect(ctx, 11, 21, 22, 6); }, '#bdb5a2', 11, 21, 22, 6, { sx: 2, sy: 2 });
    form(ctx, function () { pathRect(ctx, 14, 17, 16, 5); }, '#c6bfae', 14, 17, 16, 5, { sx: 1, sy: 1 });
    form(ctx, function () { pathPoly(ctx, [[17, 17], [22, 1], [27, 17]]); }, '#cfc9b8', 17, 1, 10, 16);
    flat(ctx, function () { pathPoly(ctx, [[22, 1], [27, 17], [22, 17]]); }, '#b1aa98');
    seg(ctx, 17, 17, 27, 17, 'rgba(27,26,23,.4)');
    if (info.tier >= 2) yardProp(ctx, 2, 24, 2);
  }

  /* well: circular stone rim + A-frame windlass + bucket + rope */
  function sil_well(ctx, info) {
    form(ctx, function () { pathEll(ctx, 22, 18, 11, 11); }, '#8f8574', 11, 7, 22, 22);
    flat(ctx, function () { pathEll(ctx, 22, 18, 7, 7); }, '#33302a');
    flat(ctx, function () { pathEll(ctx, 22, 18.6, 4.6, 4.6); }, '#3d4a44');
    /* A frame */
    seg(ctx, 13, 32, 22, 17, '#6b6252', 2);
    seg(ctx, 31, 32, 22, 17, '#6b6252', 2);
    seg(ctx, 18, 18, 26, 18, '#5c5446', 1.6);
    /* bucket and rope */
    seg(ctx, 22, 15, 22, 20, 'rgba(50,44,34,.8)', 1);
    form(ctx, function () { pathRect(ctx, 19, 20, 6, 5); }, RUST, 19, 20, 6, 5, { sx: 1, sy: 1 });
    if (info.tier >= 2) yardProp(ctx, 1, 2, 2);
  }

  /* bunker: concrete slab + earth berm + heavy blast door + vent stacks */
  function sil_bunker(ctx, info) {
    form(ctx, function () { pathPoly(ctx, [[0, 0], [44, 0], [44, 13], [0, 20]]); }, EARTH, 0, 0, 44, 20, { sx: 3, sy: 3 });
    flat(ctx, function () { pathPoly(ctx, [[0, 0], [44, 0], [44, 7], [0, 11]]); }, '#7d7061');
    /* vent stacks */
    for (var i = 0; i < 3; i++) {
      form(ctx, function () { pathRect(ctx, 6 + i * 5, 7, 4, 8); }, '#6f6558', 6 + i * 5, 7, 4, 8, { sx: 1, sy: 1 });
      flat(ctx, function () { pathRect(ctx, 5.5 + i * 5, 6.5, 5, 2); }, '#3b372f');
    }
    /* slab */
    form(ctx, function () { pathRect(ctx, 4, 15, 36, 18); }, CONCRETE, 4, 15, 36, 18);
    flat(ctx, function () { pathRect(ctx, 7, 18, 30, 12); }, '#97948a');
    /* blast door */
    form(ctx, function () { pathRound(ctx, 14, 18, 14, 12, 2); }, STEEL, 14, 18, 14, 12);
    flat(ctx, function () { pathEll(ctx, 21, 24, 3.6, 3.6); }, '#31363a');
    seg(ctx, 21, 19.6, 21, 28.4, '#31363a', 1);
    seg(ctx, 16.6, 24, 25.4, 24, '#31363a', 1);
    if (info.tier >= 2) yardProp(ctx, 1, 2, 2);
  }

  /* foundry: big shed + tall chimney + dark slag heap */
  function sil_foundry(ctx, info) {
    form(ctx, function () { pathRect(ctx, 2, 12, 30, 20); }, '#8a5f42', 2, 12, 30, 20);
    flat(ctx, function () { pathRect(ctx, 5, 15, 24, 12); }, '#96684a');
    seg(ctx, 11, 15, 11, 27, 'rgba(60,40,26,.45)');
    seg(ctx, 17, 15, 17, 27, 'rgba(60,40,26,.45)');
    seg(ctx, 23, 15, 23, 27, 'rgba(60,40,26,.45)');
    /* chimney */
    form(ctx, function () { pathRect(ctx, 34, 0, 8, 15); }, '#7d5a3f', 34, 0, 8, 15);
    flat(ctx, function () { pathRect(ctx, 34, 4, 8, 2); }, '#5f4531');
    flat(ctx, function () { pathRect(ctx, 33, 0, 10, 2); }, '#2f2b26');
    /* slag heap */
    form(ctx, function () { pathPoly(ctx, [[28, 22], [34, 17], [41, 21], [42, 28], [34, 31], [28, 28]]); }, '#2f2b26', 28, 17, 14, 14, { sx: 2, sy: 2 });
    flat(ctx, function () { pathPoly(ctx, [[34, 17], [41, 21], [36, 24], [30, 22]]); }, '#4a443c');
    if (info.tier >= 2) yardProp(ctx, 1, 2, 1);
  }

  /* mill: square tower + attached lower shed + angled conveyor */
  function sil_mill(ctx, info) {
    form(ctx, function () { pathRect(ctx, 2, 19, 24, 13); }, '#8a8272', 2, 19, 24, 13);
    flat(ctx, function () { pathRect(ctx, 5, 22, 18, 7); }, '#948c7b');
    form(ctx, function () { pathRect(ctx, 26, 3, 16, 29); }, '#948b79', 26, 3, 16, 29);
    flat(ctx, function () { pathRect(ctx, 25, 2, 18, 3); }, '#7b7364');
    seg(ctx, 30, 6, 30, 30, 'rgba(60,56,48,.4)');
    seg(ctx, 38, 6, 38, 30, 'rgba(60,56,48,.4)');
    /* angled conveyor */
    form(ctx, function () { pathPoly(ctx, [[1, 10], [5, 8], [30, 24], [27, 27]]); }, '#6f685c', 1, 8, 29, 19, { sx: 2, sy: 2 });
    seg(ctx, 3, 9.5, 28, 25.5, 'rgba(30,28,24,.55)', 1.2);
    if (info.tier >= 2) yardProp(ctx, 1, 2, 2);
  }

  /* depot: long shed + rail siding + freight crates */
  function sil_depot(ctx, info) {
    form(ctx, function () { pathRect(ctx, 2, 7, 40, 18); }, '#7f7a6d', 2, 7, 40, 18);
    for (var i = 0; i < 4; i++) seg(ctx, 10 + i * 9, 7, 10 + i * 9, 25, 'rgba(50,46,40,.45)', 1);
    flat(ctx, function () { pathRect(ctx, 4, 9, 36, 3); }, '#8b8577');
    /* rail siding */
    seg(ctx, 0, 28, 44, 28, '#5a5145', 1.4);
    seg(ctx, 0, 31, 44, 31, '#5a5145', 1.4);
    for (var s = 0; s < 11; s++) seg(ctx, s * 4, 27, s * 4, 32, 'rgba(70,62,52,.85)', 1.4);
    /* freight crates */
    form(ctx, function () { pathRect(ctx, 5, 16, 9, 8); }, '#6d6552', 5, 16, 9, 8, { sx: 1, sy: 1 });
    form(ctx, function () { pathRect(ctx, 16, 17, 8, 7); }, RUST, 16, 17, 8, 7, { sx: 1, sy: 1 });
    form(ctx, function () { pathRect(ctx, 26, 18, 7, 6); }, '#6d6552', 26, 18, 7, 6, { sx: 1, sy: 1 });
    if (info.tier >= 2) yardProp(ctx, 1, 2, 1);
  }

  /* observatory: pale drum + white dome + open slit */
  function sil_observatory(ctx, info) {
    form(ctx, function () { pathEll(ctx, 22, 20, 17, 14); }, '#b9b6a8', 5, 6, 34, 28);
    flat(ctx, function () { pathEll(ctx, 22, 20, 13, 10); }, '#c8c5b7');
    form(ctx, function () { pathEll(ctx, 22, 11, 12, 9); }, '#e6e4da', 10, 2, 24, 18);
    flat(ctx, function () { pathEll(ctx, 18, 8, 5, 3.4); }, '#f6f4ec');
    /* open slit */
    flat(ctx, function () { pathPoly(ctx, [[22, 3], [26, 14], [19, 11]]); }, '#1b1a17');
    seg(ctx, 22, 3, 22, 16, 'rgba(120,116,106,.6)', 1);
    if (info.tier >= 2) yardProp(ctx, 2, 24, 1);
  }

  /* cannery: long shed + twin stacks + horizontal pipe */
  function sil_cannery(ctx, info) {
    form(ctx, function () { pathRect(ctx, 2, 12, 40, 18); }, '#8b8375', 2, 12, 40, 18);
    flat(ctx, function () { pathRect(ctx, 5, 15, 34, 11); }, '#968d7e');
    /* twin stacks */
    form(ctx, function () { pathRect(ctx, 9, 1, 6, 13); }, '#6f6558', 9, 1, 6, 13);
    form(ctx, function () { pathRect(ctx, 19, 1, 6, 13); }, '#6f6558', 19, 1, 6, 13);
    flat(ctx, function () { pathRect(ctx, 8, 0, 8, 2); }, '#3b372f');
    flat(ctx, function () { pathRect(ctx, 18, 0, 8, 2); }, '#3b372f');
    /* horizontal pipe */
    seg(ctx, 8, 27, 38, 27, RUST, 3);
    dot(ctx, 8, 27, 1.8, '#a0603a');
    dot(ctx, 38, 27, 1.8, '#a0603a');
    dot(ctx, 23, 27, 2, '#a0603a');
    if (info.tier >= 2) yardProp(ctx, 1, 2, 2);
  }

  /* garage: open shed + vehicle lift + car hulk */
  function sil_garage(ctx, info) {
    form(ctx, function () { pathRect(ctx, 2, 8, 40, 20); }, '#8a8478', 2, 8, 40, 20);
    flat(ctx, function () { pathRect(ctx, 5, 11, 34, 15); }, '#969083');
    /* open bay */
    flat(ctx, function () { pathRect(ctx, 6, 12, 32, 15); }, '#3a382f');
    /* vehicle lift */
    seg(ctx, 11, 14, 11, 27, '#5b6164', 2.4);
    seg(ctx, 25, 14, 25, 27, '#5b6164', 2.4);
    seg(ctx, 11, 17, 25, 17, '#4a4f52', 1.6);
    /* car hulk */
    form(ctx, function () { pathRound(ctx, 15, 12, 14, 9, 2); }, '#6b6a60', 15, 12, 14, 9, { sx: 1, sy: 1 });
    flat(ctx, function () { pathRound(ctx, 18, 13, 8, 5, 1); }, '#7d7c72');
    dot(ctx, 17, 21, 1.3, '#232320');
    dot(ctx, 27, 21, 1.3, '#232320');
    if (info.tier >= 2) yardProp(ctx, 1, 2, 2);
  }

  /* theater: tall facade + curved marquee + sign band */
  function sil_theater(ctx, info) {
    form(ctx, function () { pathRect(ctx, 6, 3, 32, 20); }, '#9c8f7d', 6, 3, 32, 20);
    flat(ctx, function () { pathRect(ctx, 9, 6, 26, 13); }, '#a79a87');
    /* sign band */
    flat(ctx, function () { pathRect(ctx, 10, 6, 24, 5); }, '#4a4438');
    for (var i = 0; i < 6; i++) rect(ctx, 12 + i * 4, 7, 2.4, 3, AMBER_DIM);
    /* curved marquee */
    form(ctx, function () { pathHalfEll(ctx, 22, 22, 20, 11, true); }, '#8a7f6c', 2, 11, 40, 22, { sx: 2, sy: 2 });
    for (var m = 0; m < 7; m++) {
      var a = (m + 0.5) / 7 * Math.PI;
      dot(ctx, 22 - Math.cos(a) * 20, 22 + Math.sin(a) * 11, 1.8, '#9a8f7b');
    }
    if (info.tier >= 2) yardProp(ctx, 1, 1, 0);
    addLight(info, 22, 8, 100, L_AMBER, 0.5);
  }

  /* market: row of stalls with striped canopies */
  function sil_market(ctx, info) {
    for (var i = 0; i < 4; i++) {
      var x = 1 + i * 11;
      form(ctx, (function (cx) {
        return function () { pathRect(ctx, cx, 17, 9, 11); };
      })(x), '#96896f', x, 17, 9, 11, { sx: 1, sy: 1 });
      /* striped canopy */
      for (var s = 0; s < 4; s++) {
        rect(ctx, x + s * 2.3, 7, 2.3, 9, s % 2 ? '#a8533f' : '#c9bda6');
      }
      flat(ctx, function () { pathRect(ctx, x, 7, 9.2, 1.4); }, 'rgba(27,26,23,.35)');
    }
    /* hanging bulbs */
    dot(ctx, 6, 15, 1.2, AMBER);
    dot(ctx, 28, 15, 1.2, AMBER);
    seg(ctx, 6, 16, 6, 17, 'rgba(40,36,28,.6)', 1);
    seg(ctx, 28, 16, 28, 17, 'rgba(40,36,28,.6)', 1);
    if (info.tier >= 2) yardProp(ctx, 1, 26, 2);
    addLight(info, 6, 15, 80, L_AMBER, 0.4);
    addLight(info, 28, 15, 80, L_AMBER, 0.4);
  }

  /* guardhouse: small box + sandbag wall + lamp hood */
  function sil_guardhouse(ctx, info) {
    form(ctx, function () { pathRect(ctx, 11, 10, 22, 17); }, '#8e8677', 11, 10, 22, 17);
    flat(ctx, function () { pathRect(ctx, 13, 12, 18, 10); }, '#9a9283');
    /* sandbag wall */
    for (var i = 0; i < 7; i++) {
      form(ctx, (function (x) {
        return function () { pathEll(ctx, x + 2.6, 29, 2.8, 1.9); };
      })(1 + i * 6), '#9c9482', 1 + i * 6, 27, 5.6, 4, { sx: 1, sy: 1, noEdge: true });
    }
    /* lamp hood */
    form(ctx, function () { pathPoly(ctx, [[30, 4], [38, 4], [35, 10], [33, 10]]); }, STEEL, 30, 4, 8, 6, { sx: 1, sy: 1 });
    dot(ctx, 34, 10, 1.5, AMBER);
    if (info.tier >= 2) yardProp(ctx, 2, 2, 2);
    addLight(info, 34, 10, 85, L_AMBER, 0.5);
  }

  var SIL = {
    house: sil_house, shop: sil_shop, clinic: sil_clinic, police: sil_police,
    library: sil_library, chapel: sil_chapel, diner: sil_diner, gas: sil_gas,
    watertower: sil_watertower, substation: sil_substation,
    reactor_yard: sil_reactor_yard, mine: sil_mine, school: sil_school,
    hotel: sil_hotel, bank: sil_bank, radio_tower: sil_radio_tower,
    hangar: sil_hangar, camp: sil_camp, monument: sil_monument, well: sil_well,
    bunker: sil_bunker, foundry: sil_foundry, mill: sil_mill, depot: sil_depot,
    observatory: sil_observatory, cannery: sil_cannery, garage: sil_garage,
    theater: sil_theater, market: sil_market, guardhouse: sil_guardhouse
  };

  /* ============================== structures ============================== */
  var _tiers = null;
  function tierOf(type) {
    if (!_tiers) {
      _tiers = {};
      var list = VG.POI_TYPES || [];
      for (var i = 0; i < list.length; i++) _tiers[list[i].key] = list[i].tier;
    }
    var t = _tiers[type];
    return (typeof t === 'number' && t >= 0 && t <= 3) ? t : 1;
  }

  /* world.js owns VG.TILE; read it at call time so this module never depends
     on load order and never divides by an undefined tile size */
  function tile() { return VG.TILE || 32; }

  function hashId(s) {
    var h = 2166136261;
    s = String(s);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h / 4294967296;
  }

  GFX.paintStructures = function (ctx, cam, world, opts) {
    var lights = (opts && opts.lights) || [];
    if (!world || !world.pois || !world.pois.length) return;
    var camx = cam ? cam.x : 0, camy = cam ? cam.y : 0;
    var vw = (ctx.canvas && ctx.canvas.width) || 1280;
    var vh = (ctx.canvas && ctx.canvas.height) || 720;
    var margin = 90;
    for (var i = 0; i < world.pois.length; i++) {
      var poi = world.pois[i];
      if (!poi) continue;
      var t = poi.tier;
      if (typeof t !== 'number' || t < 0 || t > 3) t = tierOf(poi.type);
      var sz = SIZE[t];
      var w = sz[0], h = sz[1];
      var wx = Math.round(poi.x * tile()), wy = Math.round(poi.y * tile());
      var ox = wx + tile() * 0.5 - w * 0.5 - camx;
      var oy = wy + tile() * 0.5 - h * 0.5 - camy;
      if (ox > vw + margin || oy > vh + margin || ox + w < -margin || oy + h < -margin) continue;
      var fn = SIL[poi.type];
      if (!fn) continue;
      _sc = w / DW;
      var sx = w / DW, sy = h / DH;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(sx, sy);
      fn(ctx, { ox: ox, oy: oy, sx: sx, sy: sy, w: w, h: h, tier: t, seed: hashId(poi.id), lights: lights, poi: poi });
      ctx.restore();
    }
    _sc = 1;
  };

  /* =============================== clutter =============================== */
  var CLUTTER_DENSITY = [0.3, 0.25, 1.4, 0.5, 1.2, 0.9, 0.4, 1.5];
  /* rock, rubble, shrub, tree, barrel, tyres, post, pole, bone, scorch */
  var CLUTTER_W = [
    [5.0, 2.2, 0.5, 0.2, 0.3, 0.3, 0.7, 0.6, 0.7, 0.6],
    [3.2, 2.4, 1.2, 0.6, 0.4, 0.3, 0.9, 1.0, 0.7, 0.4],
    [2.8, 2.0, 5.0, 1.6, 0.5, 0.4, 0.7, 0.8, 0.5, 0.8],
    [1.2, 3.0, 1.2, 1.2, 1.6, 1.7, 1.2, 1.0, 0.4, 0.9],
    [1.6, 2.4, 1.0, 0.6, 2.4, 2.0, 1.0, 1.0, 0.5, 1.9],
    [1.4, 2.2, 0.6, 0.4, 2.8, 2.2, 1.0, 0.9, 0.3, 3.4],
    [2.4, 1.6, 0.8, 0.3, 0.5, 0.5, 0.7, 0.6, 1.0, 0.6],
    [2.6, 4.0, 1.6, 1.8, 1.2, 0.9, 0.8, 0.6, 1.0, 2.4]
  ];

  function propRock(ctx, x, y, r) {
    var n = 5 + Math.floor(r * 3);
    var rad = 3 + r * 5;
    var pts = [];
    for (var i = 0; i < n; i++) {
      var a = -Math.PI * 0.75 + (i / n) * VG.TAU;
      var rr = rad * (0.62 + VG.hash2(i, Math.floor(r * 997) + 3, 31) * 0.7);
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.82]);
    }
    flat(ctx, function () { pathEll(ctx, x + 1, y + 1.5, rad * 0.95, rad * 0.6); }, SHADOW_COL);
    flat(ctx, function () { pathPoly(ctx, pts); }, '#8d8778');
    flat(ctx, function () { pathPoly(ctx, [pts[0], pts[1], [x - rad * 0.35, y - rad * 0.4]]); }, '#aaa494');
  }

  function propRubble(ctx, x, y, r) {
    flat(ctx, function () { pathEll(ctx, x + 1, y + 1, 5, 2.6); }, SHADOW_COL);
    for (var i = 0; i < 3 + Math.floor(r * 3); i++) {
      var ox = (VG.hash2(i, 7, 41) - 0.5) * 9;
      var oy = (VG.hash2(i, 11, 43) - 0.5) * 6;
      var s = 1.4 + VG.hash2(i, 13, 47) * 1.8;
      rect(ctx, x + ox, y + oy, s, s * 0.8, i % 2 ? '#7c7666' : '#918a7a');
    }
  }

  function propShrub(ctx, x, y, r) {
    flat(ctx, function () { pathEll(ctx, x + 1, y + 1, 5, 2.4); }, SHADOW_COL);
    var n = 3 + Math.floor(r * 3);
    for (var i = 0; i < n; i++) {
      var a = -Math.PI * 0.5 + (VG.hash2(i, 3, 53) - 0.5) * 2.4;
      var l = 3 + VG.hash2(i, 5, 59) * 4;
      seg(ctx, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l * 0.7, '#6d6a45', 1);
    }
  }

  function propTree(ctx, x, y, r) {
    var h = 14 + r * 12;
    flat(ctx, function () { pathEll(ctx, x + 1.5, y + 1.5, 4, 2.2); }, SHADOW_COL);
    seg(ctx, x, y, x, y - h, '#a89e8c', 1.6);
    for (var i = 0; i < 3 + Math.floor(r * 2); i++) {
      var f = 0.35 + i * 0.18;
      var sy2 = y - h * f;
      var a = -Math.PI * 0.5 + (i % 2 ? 1 : -1) * (0.6 + VG.hash2(i, 17, 61) * 0.7);
      var l = 3 + VG.hash2(i, 19, 67) * 5;
      var ex = x + Math.cos(a) * l, ey = sy2 + Math.sin(a) * l;
      seg(ctx, x, sy2, ex, ey, '#b3a897', 1.2);
      seg(ctx, (x + ex) * 0.5, (sy2 + ey) * 0.5, (x + ex) * 0.5 + Math.cos(a + 0.9) * l * 0.5,
        (sy2 + ey) * 0.5 + Math.sin(a + 0.9) * l * 0.5, '#b3a897', 1);
    }
  }

  function propBarrel(ctx, x, y, r) {
    var w = 6 + r * 2, h = 7 + r * 2;
    rect(ctx, x + 1 - w / 2, y + 1 - h / 2, w, h, SHADOW_COL);
    flat(ctx, function () { pathRect(ctx, x - w / 2, y - h / 2, w, h); }, RUST);
    flat(ctx, function () { pathEll(ctx, x, y - h / 2, w / 2, w / 5); }, '#a0603a');
    seg(ctx, x - w / 2 + 0.5, y - h / 2 + h * 0.45, x + w / 2 - 0.5, y - h / 2 + h * 0.45, 'rgba(30,20,12,.5)', 1);
  }

  function propTyres(ctx, x, y, r) {
    flat(ctx, function () { pathEll(ctx, x + 1.5, y + 1.5, 6, 3); }, SHADOW_COL);
    var n = 2 + Math.floor(r * 2);
    for (var i = 0; i < n; i++) {
      flat(ctx, (function (k) {
        return function () { pathEll(ctx, x, y, 5 - k * 1.1, 3 - k * 0.6); };
      })(i), i % 2 ? '#232320' : '#2e2e2a');
    }
    flat(ctx, function () { pathEll(ctx, x, y, 1.4, 0.9); }, '#3c3c37');
  }

  function propPost(ctx, x, y, r) {
    var h = 7 + r * 3;
    rect(ctx, x + 1, y + 1 - h, 1.8, h, SHADOW_COL);
    rect(ctx, x - 0.9, y - h, 1.8, h, '#6f6858');
    seg(ctx, x, y - h + 2, x + 14, y - h + 2, 'rgba(40,36,28,.5)', 1);
  }

  function propPole(ctx, x, y, r) {
    var h = 16 + r * 5;
    rect(ctx, x + 1.5, y + 1.5 - h, 2, h, SHADOW_COL);
    rect(ctx, x - 1, y - h, 2, h, '#7b7264');
    rect(ctx, x - 5, y - h + 2, 10, 1.6, '#6b6355');
    dot(ctx, x - 3.4, y - h + 1, 1.2, '#9aa39c');
    dot(ctx, x + 3.4, y - h + 1, 1.2, '#9aa39c');
  }

  function propBone(ctx, x, y, r) {
    flat(ctx, function () { pathEll(ctx, x + 1, y + 1, 4, 1.8); }, SHADOW_COL);
    seg(ctx, x - 4, y, x + 4, y - 1.2, '#cfc7b2', 1.6);
    dot(ctx, x - 4, y, 1.1, '#d8d0bc');
    dot(ctx, x + 4, y - 1.2, 1.1, '#d8d0bc');
  }

  function propScorch(ctx, x, y, r) {
    flat(ctx, function () { pathEll(ctx, x, y, 4 + r * 5, 2.6 + r * 3); }, 'rgba(26,22,18,.34)');
    flat(ctx, function () { pathEll(ctx, x - 1, y - 0.6, 2 + r * 2.4, 1.3 + r * 1.4); }, 'rgba(20,17,14,.26)');
  }

  var PROPS = [propRock, propRubble, propShrub, propTree, propBarrel,
    propTyres, propPost, propPole, propBone, propScorch];

  /* road shape: 0 none, 1 east-west, 2 north-south, 3 highway */
  function roadShape(world, tx, ty) {
    if (!world.isRoad || !world.isRoad(tx, ty)) return 0;
    var l = world.isRoad(tx - 1, ty), r = world.isRoad(tx + 1, ty);
    var n = world.isRoad(tx, ty - 1), s = world.isRoad(tx, ty + 1);
    var c = 0;
    if (l) c++;
    if (r) c++;
    if (n) c++;
    if (s) c++;
    if (c >= 3) return 3;
    if (l && r) return 1;
    if (n && s) return 2;
    return 1;
  }

  /* cells that hold a structure or a container are kept clear of clutter */
  function blockedCells(world, camx, camy, vw, vh) {
    var set = {};
    var i, x, y, cx, cy;
    if (world.pois) {
      for (i = 0; i < world.pois.length; i++) {
        var p = world.pois[i];
        if (!p) continue;
        var t = p.tier;
        if (typeof t !== 'number' || t < 0 || t > 3) t = tierOf(p.type);
        var sz = SIZE[t];
        var px = p.x * tile(), py = p.y * tile();
        if (px - camx > vw + 90 || py - camy > vh + 90 ||
            px - camx < -90 || py - camy < -90) continue;
        var x0 = Math.floor((px - sz[0] * 0.7) / 64), x1 = Math.floor((px + sz[0] * 0.7) / 64);
        var y0 = Math.floor((py - sz[1] * 0.7) / 64), y1 = Math.floor((py + sz[1] * 0.7) / 64);
        for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) set[x + ',' + y] = 1;
      }
    }
    if (world.containers) {
      for (i = 0; i < world.containers.length; i++) {
        var c = world.containers[i];
        if (!c) continue;
        cx = c.x * tile(); cy = c.y * tile();
        if (cx - camx > vw + 64 || cy - camy > vh + 64 ||
            cx - camx < -64 || cy - camy < -64) continue;
        set[Math.floor(cx / 64) + ',' + Math.floor(cy / 64)] = 1;
      }
    }
    return set;
  }

  GFX.paintClutter = function (ctx, cam, world) {
    if (!world) return;
    var camx = cam ? cam.x : 0, camy = cam ? cam.y : 0;
    var vw = (ctx.canvas && ctx.canvas.width) || 1280;
    var vh = (ctx.canvas && ctx.canvas.height) || 720;
    var margin = 64;
    var cx0 = Math.floor((camx - margin) / 64), cx1 = Math.floor((camx + vw + margin) / 64);
    var cy0 = Math.floor((camy - margin) / 64), cy1 = Math.floor((camy + vh + margin) / 64);
    var blocked = blockedCells(world, camx, camy, vw, vh);
    var seed = world.seed || 0;
    _sc = 1;
    ctx.save();
    ctx.translate(-camx, -camy);
    for (var cy = cy0; cy <= cy1; cy++) {
      for (var cx = cx0; cx <= cx1; cx++) {
        var ttx = Math.floor((cx * 64 + 32) / tile());
        var tty = Math.floor((cy * 64 + 32) / tile());
        var biome = world.biomeAt ? world.biomeAt(ttx, tty) : 2;
        var dens = CLUTTER_DENSITY[biome];
        if (dens === undefined) dens = 1;
        var n = Math.floor(VG.hash2(cx, cy, seed) * (1 + dens));
        if (n > 3) n = 3;
        if (n < 3 && VG.hash2(cx, cy, seed + 9173) > 0.88) n++;
        for (var i = 0; i < n; i++) {
          var wx = cx * 64 + VG.hash2(cx, cy, seed + 1009 + i * 733) * 64;
          var wy = cy * 64 + VG.hash2(cx, cy, seed + 2017 + i * 733) * 64;
          if (wx < camx - margin || wy < camy - margin ||
              wx > camx + vw + margin || wy > camy + vh + margin) continue;
          if (blocked[Math.floor(wx / 64) + ',' + Math.floor(wy / 64)]) continue;
          /* pick a candidate for this biome */
          var weights = CLUTTER_W[biome] || CLUTTER_W[2];
          var total = 0, j;
          for (j = 0; j < weights.length; j++) total += weights[j];
          var pick = VG.hash2(cx, cy, seed + 3001 + i * 577) * total;
          var kind = 0;
          for (j = 0; j < weights.length; j++) {
            pick -= weights[j];
            if (pick <= 0) { kind = j; break; }
          }
          /* roads carry poles and fence posts */
          var rtx = Math.floor(wx / tile()), rty = Math.floor(wy / tile());
          var shape = roadShape(world, rtx, rty);
          if (shape) {
            var side = VG.hash2(cx, cy, seed + 4111 + i * 97) > 0.5 ? 1 : -1;
            if (shape === 3) {
              kind = 7;
              wy += side * 11;
            } else if (shape === 1) {
              kind = (VG.hash2(cx, cy, seed + 4333 + i * 97) > 0.35) ? 6 : 7;
              wy += side * 10;
            } else if (shape === 2) {
              kind = (VG.hash2(cx, cy, seed + 4557 + i * 97) > 0.45) ? 6 : 7;
              wx += side * 10;
            } else {
              wx += side * 8;
            }
          }
          var rv = VG.hash2(cx, cy, seed + 6007 + i * 311);
          PROPS[kind](ctx, wx, wy, rv);
        }
      }
    }
    ctx.restore();
  };

  /* ============================= containers ============================= */
  function contCrate(ctx, x, y, w, h) {
    form(ctx, function () { pathRect(ctx, x, y, w, h); }, '#8a7a5e', x, y, w, h, { sx: 1, sy: 1 });
    seg(ctx, x, y, x + w, y + h, 'rgba(30,24,16,.45)');
    seg(ctx, x + w, y, x, y + h, 'rgba(30,24,16,.45)');
    seg(ctx, x, y + h * 0.5, x + w, y + h * 0.5, 'rgba(30,24,16,.28)');
  }

  function contToolbox(ctx, x, y, w, h) {
    form(ctx, function () { pathRect(ctx, x, y, w, h); }, '#8a4f2a', x, y, w, h, { sx: 1, sy: 1 });
    flat(ctx, function () { pathRect(ctx, x, y, w, h * 0.45); }, '#a0603a');
    seg(ctx, x + w * 0.3, y - 2, x + w * 0.7, y - 2, '#4a4238', 1.4);
  }

  function contLocker(ctx, x, y, w, h) {
    form(ctx, function () { pathRect(ctx, x, y, w, h); }, ENAMEL, x, y, w, h, { sx: 1, sy: 1 });
    seg(ctx, x + w * 0.5, y + 1, x + w * 0.5, y + h - 1, 'rgba(27,26,23,.45)');
    dot(ctx, x + w * 0.42, y + h * 0.5, 0.8, INK);
    dot(ctx, x + w * 0.58, y + h * 0.5, 0.8, INK);
  }

  function contDrum(ctx, x, y, w, h) {
    form(ctx, function () { pathRect(ctx, x, y, w, h); }, RUST, x, y, w, h, { sx: 1, sy: 1 });
    flat(ctx, function () { pathEll(ctx, x + w * 0.5, y, w * 0.5, w * 0.22); }, '#a0603a');
    seg(ctx, x, y + h * 0.35, x + w, y + h * 0.35, 'rgba(30,20,12,.45)');
    seg(ctx, x, y + h * 0.7, x + w, y + h * 0.7, 'rgba(30,20,12,.45)');
  }

  function contDesk(ctx, x, y, w, h) {
    form(ctx, function () { pathRect(ctx, x, y, w, h); }, '#8a7c62', x, y, w, h, { sx: 1, sy: 1 });
    flat(ctx, function () { pathRect(ctx, x, y, w, h * 0.5); }, '#9c8d70');
    seg(ctx, x + 1, y + h, x + 1, y + h + 2, 'rgba(27,26,23,.5)', 1.4);
    seg(ctx, x + w - 1, y + h, x + w - 1, y + h + 2, 'rgba(27,26,23,.5)', 1.4);
  }

  function contLockerBank(ctx, x, y, w, h) {
    form(ctx, function () { pathRect(ctx, x, y, w, h); }, ENAMEL, x, y, w, h, { sx: 1, sy: 1 });
    for (var i = 1; i < 3; i++) seg(ctx, x + w * i / 3, y + 1, x + w * i / 3, y + h - 1, 'rgba(27,26,23,.45)');
    for (var j = 0; j < 3; j++) dot(ctx, x + w * (j + 0.5) / 3, y + h * 0.6, 0.8, INK);
  }

  function contFiling(ctx, x, y, w, h) {
    form(ctx, function () { pathRect(ctx, x, y, w, h); }, CONCRETE, x, y, w, h, { sx: 1, sy: 1 });
    for (var i = 0; i < 3; i++) {
      var dy = y + 1.5 + i * (h - 2) / 3;
      seg(ctx, x + 1, dy, x + w - 1, dy, 'rgba(27,26,23,.45)');
      rect(ctx, x + w * 0.4, dy + 0.6, w * 0.2, 1, '#4a4f52');
    }
  }

  var CONT = [contCrate, contToolbox, contLocker, contDrum, contDesk, contLockerBank, contFiling];
  var CONT_W = [9, 11, 6, 8, 13, 15, 8];
  var CONT_H = [8, 5, 11, 10, 7, 10, 11];

  /* One container, drawn at an arbitrary screen point. The interior renderer
     reuses the same shapes, so a crate looks like a crate wherever it is. */
  GFX.paintContainerAt = function (ctx, c, sx, sy) {
    if (!ctx || !c) return;
    var hsh = hashId(c.id);
    var kind = Math.floor(hsh * 7) % 7;
    var w = CONT_W[kind], h = CONT_H[kind];
    CONT[kind](ctx, sx - w * 0.5, sy - h * 0.5, w, h);
    if (c.clueId) {
      var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      var pulse = Math.sin((now / 1000) * 1.5 + hsh * 6.283);
      var rr = 8 + pulse * 2.2;
      ctx.save();
      ctx.globalAlpha = 0.26 + pulse * 0.12;
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sx, sy, rr, 0, VG.TAU);
      ctx.stroke();
      ctx.restore();
      rect(ctx, sx + w * 0.4, sy - h * 0.5 - 2, 2, 2, AMBER);
    }
  };

  /* The footprint of a building silhouette, by tier. The interior module
     uses it to put the door marker on the edge of the building rather than
     in the middle of it. */
  GFX.buildingSize = function (tier) {
    var s = SIZE[tier];
    return s ? [s[0], s[1]] : [SIZE[1][0], SIZE[1][1]];
  };

  GFX.paintContainers = function (ctx, cam, world, p) {
    if (!world || !world.containers || !world.containers.length) return;
    var camx = cam ? cam.x : 0, camy = cam ? cam.y : 0;
    var vw = (ctx.canvas && ctx.canvas.width) || 1280;
    var vh = (ctx.canvas && ctx.canvas.height) || 720;
    _sc = 1;
    for (var i = 0; i < world.containers.length; i++) {
      var c = world.containers[i];
      if (!c || c.opened === true) continue;
      /* a crate that is inside a building is drawn by the interior renderer */
      if (c.inside) continue;
      var wx = Math.round(c.x * tile()), wy = Math.round(c.y * tile());
      var sx = wx - camx, sy = wy - camy;
      if (sx < -40 || sy < -40 || sx > vw + 40 || sy > vh + 40) continue;
      GFX.paintContainerAt(ctx, c, sx, sy);
    }
  };

  /* ============================== exported ============================== */
  GFX.poiSilhouettes = function () { return SIL; };
})(window.VG.GFX, window.VG);
