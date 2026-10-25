/* VERDIGRIS - living flats: survivors, beacons, convoys, guidance.
   ------------------------------------------------------------------
   Sibling to gfx_actors. Same rules: a north-west key light, a
   south-east contact shadow, every object gets its own silhouette before
   it gets its own colour, and nothing here may wash the screen.

   Plain ES5 on purpose - this file is loaded with a plain <script src>
   and has to work over file:// in an old browser. */
window.VG = window.VG || {};
window.VG.GFX = window.VG.GFX || {};
(function (GFX, VG) {
  'use strict';

  var INK = 'rgba(27,26,23,.55)';
  var RIM = 'rgba(255,240,210,.16)';
  var CONTACT = 'rgba(0,0,0,.18)';
  var CULL = 88;

  var COAT = '#a08b66';
  var COAT_DK = '#7d6c4d';
  var TROUSER = '#4a4438';
  var PACK = '#6b5c45';
  var SKIN = '#c3a882';
  var TRUCK = '#6d5f4c';
  var TRUCK_DK = '#4d4234';
  var TARP = '#8b8170';
  var SIGNAL = '127,196,216';
  var FLARE = '232,138,58';

  /* ---------- helpers ---------- */

  function tile() {
    var t = VG.TILE;
    return (typeof t === 'number' && isFinite(t) && t > 0) ? t : 32;
  }

  function viewport(ctx) {
    var scale = 1;
    if (ctx.getTransform) {
      var m = ctx.getTransform();
      if (m && m.a) scale = m.a;
    }
    var cv = ctx.canvas;
    var w = cv && cv.width ? cv.width / scale : 1280;
    var h = cv && cv.height ? cv.height / scale : 720;
    if (!w) w = 1280;
    if (!h) h = 720;
    return { w: w, h: h };
  }

  function dist(ax, ay, bx, by) {
    /* two arguments means "length of this vector"; four means point distance */
    if (bx === undefined) { bx = ax; by = ay; ax = 0; ay = 0; }
    var dx = bx - ax, dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function visible(sx, sy, vp, m) {
    return sx > -m && sy > -m && sx < vp.w + m && sy < vp.h + m;
  }

  function ellipsePath(ctx, x, y, rx, ry, rot) {
    if (ctx.ellipse) {
      ctx.ellipse(x, y, rx, ry, rot || 0, 0, VG.TAU);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.scale(1, ry / rx);
    ctx.arc(0, 0, rx, 0, VG.TAU);
    ctx.restore();
  }

  function softShadow(ctx, x, y, rx, ry, alpha) {
    ctx.save();
    ctx.fillStyle = 'rgba(28,24,18,' + alpha + ')';
    for (var i = 0; i < 3; i++) {
      var k = 1 + i * 0.28;
      ctx.globalAlpha = 1 - i * 0.31;
      ctx.beginPath();
      ellipsePath(ctx, x, y, rx * k, ry * k, 0);
      ctx.fill();
    }
    ctx.restore();
  }

  /* the four-layer body recipe, matched to gfx_actors: gradient fill, ink
     edge, north-west rim light, south-east contact shadow */
  function paintBody(ctx, pathFn, base, top, bottom) {
    var fill = base;
    if (ctx.createLinearGradient) {
      var g = ctx.createLinearGradient(0, top, 0, bottom);
      g.addColorStop(0, VG.shade(base, 0.14));
      g.addColorStop(0.5, base);
      g.addColorStop(1, VG.shade(base, -0.18));
      fill = g;
    }
    ctx.save();
    ctx.beginPath();
    pathFn(ctx);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    pathFn(ctx);
    ctx.clip();
    ctx.translate(1.1, 1.1);
    ctx.beginPath();
    pathFn(ctx);
    ctx.strokeStyle = RIM;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    pathFn(ctx);
    ctx.clip();
    ctx.translate(-1, -1);
    ctx.beginPath();
    pathFn(ctx);
    ctx.strokeStyle = CONTACT;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  /* ---------- the survivor ---------- */

  function survivorPath(ctx) {
    /* shoulders seen from slightly above: a coat, wider across the back */
    ctx.moveTo(-6.4, -8.2);
    ctx.quadraticCurveTo(-8.4, -4.4, -7.6, 3.2);
    ctx.quadraticCurveTo(-6.8, 8.4, -3.4, 9.4);
    ctx.lineTo(3.4, 9.4);
    ctx.quadraticCurveTo(6.8, 8.4, 7.6, 3.2);
    ctx.quadraticCurveTo(8.4, -4.4, 6.4, -8.2);
    ctx.quadraticCurveTo(0, -11.6, -6.4, -8.2);
    ctx.closePath();
  }

  function packPath(ctx) {
    ctx.moveTo(-4.6, -4.6);
    ctx.quadraticCurveTo(0, -6.2, 4.6, -4.6);
    ctx.quadraticCurveTo(5.6, 0.4, 4.6, 4.0);
    ctx.quadraticCurveTo(0, 5.6, -4.6, 4.0);
    ctx.quadraticCurveTo(-5.6, 0.4, -4.6, -4.6);
    ctx.closePath();
  }

  /* A person standing in the open waiting to be found. The raised arm is
     the whole point of the figure - it says "here" from a distance. */
  function paintSurvivor(ctx, sx, sy, t, waving, hostile) {
    softShadow(ctx, sx + 1.5, sy + 9, 7.5, 3.2, 0.30);

    /* the pack, behind the shoulders */
    ctx.save();
    ctx.translate(sx, sy - 3.2);
    paintBody(ctx, packPath, PACK, -7, 7);
    ctx.restore();

    /* the coat */
    ctx.save();
    ctx.translate(sx, sy);
    paintBody(ctx, survivorPath, COAT, -11, 10);
    ctx.restore();

    /* the head */
    ctx.save();
    ctx.translate(sx, sy - 9.6);
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, VG.TAU);
    ctx.fillStyle = SKIN;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-0.7, -0.9, 3.3, Math.PI * 0.85, Math.PI * 1.95);
    ctx.strokeStyle = 'rgba(96,72,48,.9)';
    ctx.lineWidth = 2.1;
    ctx.stroke();
    ctx.restore();

    /* the arm: raised and waving when the call is genuine, hanging when
       the voice on the band was a lie */
    var swing = waving ? Math.sin(t * 4.2) * 0.42 : 0;
    ctx.save();
    ctx.translate(sx + 5.2, sy - 5.4);
    ctx.rotate(-1.25 + swing);
    ctx.fillStyle = hostile ? COAT_DK : COAT;
    ctx.fillRect(-1.5, -1.4, 3.0, 8.4);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.9;
    ctx.strokeRect(-1.5, -1.4, 3.0, 8.4);
    ctx.beginPath();
    ctx.arc(0, 7.2, 1.5, 0, VG.TAU);
    ctx.fillStyle = SKIN;
    ctx.fill();
    ctx.restore();
  }

  /* ---------- the beacon ---------- */

  function paintBeacon(ctx, sx, sy, t) {
    var pulse = (t % 2.2) / 2.2;

    /* the column of light, so the call can be found through dust */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var h = 112;
    var g = null;
    if (ctx.createLinearGradient) {
      g = ctx.createLinearGradient(sx, sy, sx, sy - h);
      g.addColorStop(0, 'rgba(' + SIGNAL + ',' + (0.34 - pulse * 0.16).toFixed(3) + ')');
      g.addColorStop(0.35, 'rgba(' + SIGNAL + ',' + (0.15 - pulse * 0.07).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + SIGNAL + ',0)');
    }
    ctx.fillStyle = g || 'rgba(' + SIGNAL + ',0.12)';
    ctx.beginPath();
    ctx.moveTo(sx - 7, sy);
    ctx.lineTo(sx + 7, sy);
    ctx.lineTo(sx + 3.0, sy - h);
    ctx.lineTo(sx - 3.0, sy - h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    /* the ground ring, expanding */
    ctx.save();
    ctx.strokeStyle = 'rgba(' + SIGNAL + ',' + (0.55 * (1 - pulse)).toFixed(3) + ')';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ellipsePath(ctx, sx, sy, 9 + pulse * 16, (9 + pulse * 16) * 0.52, 0);
    ctx.stroke();
    ctx.restore();

    /* the lamp itself */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(' + SIGNAL + ',' + (0.40 + 0.20 * Math.sin(t * 2.8)).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(sx, sy - 4, 4.2, 0, VG.TAU);
    ctx.fill();
    ctx.restore();
  }

  /* ---------- the convoy truck ---------- */

  function truckCabPath(ctx) {
    ctx.moveTo(-6, -8.4);
    ctx.lineTo(7.2, -7.2);
    ctx.quadraticCurveTo(9.4, -6.6, 9.4, -4.4);
    ctx.lineTo(9.4, 4.4);
    ctx.quadraticCurveTo(9.4, 6.6, 7.2, 7.2);
    ctx.lineTo(-6, 8.4);
    ctx.closePath();
  }

  function truckBedPath(ctx) {
    ctx.moveTo(-20, -7.6);
    ctx.lineTo(-5.4, -8.2);
    ctx.lineTo(-5.4, 8.2);
    ctx.lineTo(-20, 7.6);
    ctx.closePath();
  }

  function tarpPath(ctx) {
    ctx.moveTo(-18, -6.2);
    ctx.quadraticCurveTo(-11, -9.4, -6.2, -6.0);
    ctx.lineTo(-6.2, 6.0);
    ctx.quadraticCurveTo(-11, 9.4, -18, 6.2);
    ctx.closePath();
  }

  function paintTruck(ctx, sx, sy, ang, night, lead) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang);

    softShadow(ctx, 1.5, 2.5, 21, 9, 0.32);

    /* the load */
    ctx.save();
    ctx.translate(-13, 0);
    paintBody(ctx, truckBedPath, TRUCK_DK, -9, 9);
    ctx.restore();

    /* the tarp over the load */
    ctx.save();
    ctx.translate(-12, 0);
    paintBody(ctx, tarpPath, TARP, -8, 8);
    ctx.restore();

    /* the cab */
    ctx.save();
    paintBody(ctx, truckCabPath, TRUCK, -9, 9);
    ctx.restore();

    /* windscreen */
    ctx.save();
    ctx.fillStyle = 'rgba(38,44,48,.82)';
    ctx.beginPath();
    ctx.moveTo(5.4, -6.0);
    ctx.lineTo(8.4, -5.2);
    ctx.lineTo(8.4, 5.2);
    ctx.lineTo(5.4, 6.0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.restore();

    /* wheels */
    ctx.save();
    ctx.fillStyle = '#23201c';
    var wheels = [[-14, -9.2], [-14, 9.2], [3, -9.2], [3, 9.2]];
    for (var i = 0; i < wheels.length; i++) {
      ctx.fillRect(wheels[i][0] - 2.6, wheels[i][1] - 1.9, 5.2, 3.8);
    }
    ctx.restore();

    /* the headlight beam, only after dark */
    if (night) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var bg = null;
      if (ctx.createLinearGradient) {
        bg = ctx.createLinearGradient(9, 0, 62, 0);
        bg.addColorStop(0, 'rgba(255,214,150,0.22)');
        bg.addColorStop(1, 'rgba(255,214,150,0)');
      }
      ctx.fillStyle = bg || 'rgba(255,214,150,0.12)';
      ctx.beginPath();
      ctx.moveTo(9, -6.2);
      ctx.lineTo(62, -17);
      ctx.lineTo(62, 17);
      ctx.lineTo(9, 6.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      /* the lamps themselves */
      ctx.save();
      ctx.fillStyle = 'rgba(255,226,170,.95)';
      ctx.beginPath();
      ctx.arc(8.6, -4.2, 1.7, 0, VG.TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(8.6, 4.2, 1.7, 0, VG.TAU);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  /* ---------- the raid marker ---------- */

  function paintRaid(ctx, sx, sy, t) {
    /* the flare on the ground */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(' + FLARE + ',' + (0.26 + 0.12 * Math.sin(t * 5.1)).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, VG.TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,196,120,.9)';
    ctx.beginPath();
    ctx.arc(sx, sy - 3, 1.9, 0, VG.TAU);
    ctx.fill();
    ctx.restore();

    /* the smoke, drifting up */
    ctx.save();
    for (var i = 0; i < 4; i++) {
      var ph = ((t * 0.22 + i * 0.25) % 1);
      var yy = sy - 10 - ph * 46;
      var xx = sx + Math.sin(t * 0.7 + i) * 5;
      var rr = 5 + ph * 12;
      ctx.fillStyle = 'rgba(38,33,28,' + (0.30 * (1 - ph)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(xx, yy, rr, 0, VG.TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- data access ---------- */

  function convoyPos(conv) {
    if (VG.DYN && VG.DYN.convoyPos) {
      var p = VG.DYN.convoyPos(conv);
      if (p && isFinite(p.x) && isFinite(p.y)) return p;
    }
    var f = conv.from || { x: 0, y: 0 };
    var to = conv.to || { x: 0, y: 0 };
    var t = Math.max(0, Math.min(1, (conv.t || 0) / Math.max(1, conv.dur || 1)));
    return { x: (f.x + (to.x - f.x) * t) * tile(), y: (f.y + (to.y - f.y) * t) * tile(), t: t };
  }

  function convoyAngle(conv) {
    var f = conv.from || { x: 0, y: 0 };
    var to = conv.to || { x: 0, y: 0 };
    var dx = to.x - f.x, dy = to.y - f.y;
    if (!dx && !dy) return 0;
    return Math.atan2(dy, dx);
  }

  function isNightNow() {
    try {
      if (VG.isNight) return !!VG.isNight(VG.state ? VG.state.time : 0);
    } catch (e) { /* fall through */ }
    return false;
  }

  /* ---------- public API ---------- */

  /* world-space living things. Drawn between the containers and the actors
     so the player reads as being in front of them. */
  GFX.paintLive = function (ctx, cam, world, dyn, p, state, t) {
    if (!ctx) return;
    if (!dyn) return;
    cam = cam || { x: 0, y: 0 };
    p = p || { x: 0, y: 0 };
    state = state || {};
    var vp = viewport(ctx);
    var night = isNightNow();

    /* --- survivors at their calls --- */
    var calls = dyn.calls || [];
    for (var i = 0; i < calls.length; i++) {
      var c = calls[i];
      if (!c || c.answered) continue;
      var sx = c.x - cam.x, sy = c.y - cam.y;
      if (!visible(sx, sy, vp, CULL)) continue;
      var d = dist(p.x - c.x, p.y - c.y);
      paintBeacon(ctx, sx, sy, t);
      paintSurvivor(ctx, sx, sy, t, d < 190 && !c.hostile, !!c.hostile);
    }

    /* --- convoys on the road --- */
    var convoys = dyn.convoys || [];
    for (var k = 0; k < convoys.length; k++) {
      var conv = convoys[k];
      if (!conv || conv.done) continue;
      var pos = convoyPos(conv);
      var ang = convoyAngle(conv);
      var dirx = Math.cos(ang), diry = Math.sin(ang);
      var trucks = conv.trucks || 1;
      for (var j = 0; j < trucks; j++) {
        var back = j * 62;
        var wx = pos.x - dirx * back;
        var wy = pos.y - diry * back;
        var tsx = wx - cam.x, tsy = wy - cam.y;
        if (!visible(tsx, tsy, vp, CULL + 30)) continue;
        paintTruck(ctx, tsx, tsy, ang, night, j === 0);
      }
    }

    /* --- raids: a flare and smoke where they are hitting --- */
    var raids = dyn.raids || [];
    for (var r = 0; r < raids.length; r++) {
      var raid = raids[r];
      if (!raid || raid.done) continue;
      var rsx = raid.x - cam.x, rsy = raid.y - cam.y;
      if (!visible(rsx, rsy, vp, CULL)) continue;
      paintRaid(ctx, rsx, rsy, t);
    }
  };

  /* ---------- guidance ---------- */

  function edgeChevron(ctx, px, py, tx, ty, vp, color, label, distM) {
    var dx = tx - px, dy = ty - py;
    var len = dist(dx, dy);
    if (!len) return false;
    var ux = dx / len, uy = dy / len;
    var margin = 40;
    var x0 = margin, y0 = margin, x1 = vp.w - margin, y1 = vp.h - margin;
    var tX = ux > 0 ? (x1 - px) / ux : (x0 - px) / ux;
    var tY = uy > 0 ? (y1 - py) / uy : (y0 - py) / uy;
    var t = Math.min(tX, tY);
    if (!isFinite(t) || t <= 0 || t >= len) return false;

    var ex = px + ux * t, ey = py + uy * t;
    var ang = Math.atan2(uy, ux);

    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(ang);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(-5, -7);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-5, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.font = '10px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(12,14,11,.72)';
    var tw = ctx.measureText(label).width;
    ctx.fillRect(ex - tw / 2 - 4, ey + 12, tw + 8, 13);
    ctx.fillStyle = color;
    ctx.fillText(label, ex, ey + 18);
    ctx.restore();
    return true;
  }

  /* Screen-space guidance, drawn after the atmosphere so it stays readable
     through dust and darkness. This is how a voice on the band turns into a
     place you can walk to. */
  GFX.paintLiveMarkers = function (ctx, cam, world, dyn, p, state, t) {
    if (!ctx) return;
    if (!dyn) return;
    cam = cam || { x: 0, y: 0 };
    p = p || { x: 0, y: 0 };
    var vp = viewport(ctx);
    var px = p.x - cam.x, py = p.y - cam.y;

    /* the nearest distress call gets the marker - it is time-limited */
    var calls = dyn.calls || [];
    var best = null, bd = Infinity;
    for (var i = 0; i < calls.length; i++) {
      var c = calls[i];
      if (!c || c.answered) continue;
      var d = dist(p.x - c.x, p.y - c.y);
      if (d < bd) { bd = d; best = c; }
    }
    if (best) {
      var tx = best.x - cam.x, ty = best.y - cam.y;
      if (!edgeChevron(ctx, px, py, tx, ty, vp, 'rgba(127,196,216,.95)',
        best.who + ' ' + Math.round(bd) + 'm', bd)) {
        /* it is on screen: a caret over the survivor's head */
        ctx.save();
        ctx.strokeStyle = 'rgba(127,196,216,.85)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(tx - 5, ty - 27);
        ctx.lineTo(tx, ty - 21);
        ctx.lineTo(tx + 5, ty - 27);
        ctx.stroke();
        ctx.restore();
      }
    }

    /* raids */
    var raids = dyn.raids || [];
    for (var r = 0; r < raids.length; r++) {
      var raid = raids[r];
      if (!raid || raid.done) continue;
      var rx = raid.x - cam.x, ry = raid.y - cam.y;
      var rd = dist(p.x - raid.x, p.y - raid.y);
      edgeChevron(ctx, px, py, rx, ry, vp, 'rgba(208,106,74,.95)',
        raid.name + ' ' + Math.round(rd) + 'm', rd);
    }

    /* convoys */
    var convoys = dyn.convoys || [];
    for (var k = 0; k < convoys.length; k++) {
      var conv = convoys[k];
      if (!conv || conv.done) continue;
      var pos = convoyPos(conv);
      var cx = pos.x - cam.x, cy = pos.y - cam.y;
      var cd = dist(p.x - pos.x, p.y - pos.y);
      edgeChevron(ctx, px, py, cx, cy, vp, 'rgba(232,179,74,.9)',
        conv.name + ' ' + Math.round(cd) + 'm', cd);
    }
  };

  /* ---------- lights ---------- */

  GFX.liveLights = function (ctx, cam, world, dyn, p, state) {
    var lights = [];
    if (!dyn) return lights;
    cam = cam || { x: 0, y: 0 };
    p = p || { x: 0, y: 0 };
    var vp = viewport(ctx);
    var night = isNightNow();

    var calls = dyn.calls || [];
    for (var i = 0; i < calls.length; i++) {
      var c = calls[i];
      if (!c || c.answered) continue;
      var sx = c.x - cam.x, sy = c.y - cam.y;
      if (!visible(sx, sy, vp, CULL)) continue;
      lights.push({ x: sx, y: sy - 6, r: 74, color: SIGNAL, intensity: 0.34 });
      lights.push({ x: sx, y: sy - 10, r: 52, color: '255,196,124', intensity: 0.22 });
    }

    var convoys = dyn.convoys || [];
    for (var k = 0; k < convoys.length; k++) {
      var conv = convoys[k];
      if (!conv || conv.done) continue;
      if (!night) continue;
      var pos = convoyPos(conv);
      var ang = convoyAngle(conv);
      var dirx = Math.cos(ang), diry = Math.sin(ang);
      var trucks = conv.trucks || 1;
      for (var j = 0; j < trucks; j++) {
        var back = j * 62;
        var wx = pos.x - dirx * back + dirx * 9;
        var wy = pos.y - diry * back + diry * 9;
        var tsx = wx - cam.x, tsy = wy - cam.y;
        if (!visible(tsx, tsy, vp, CULL)) continue;
        lights.push({ x: tsx, y: tsy, r: j === 0 ? 150 : 96, color: '255,214,150', intensity: j === 0 ? 0.42 : 0.22 });
      }
    }

    var raids = dyn.raids || [];
    for (var r = 0; r < raids.length; r++) {
      var raid = raids[r];
      if (!raid || raid.done) continue;
      var rsx = raid.x - cam.x, rsy = raid.y - cam.y;
      if (!visible(rsx, rsy, vp, CULL)) continue;
      lights.push({ x: rsx, y: rsy - 3, r: 96, color: FLARE, intensity: 0.30 });
    }

    return lights;
  };
})(window.VG.GFX, window.VG);
