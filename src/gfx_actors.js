/* VERDIGRIS — actors: enemies, projectiles, player */
window.VG = window.VG || {};
window.VG.GFX = window.VG.GFX || {};
(function (GFX, VG) {
  'use strict';

  /* ---------- constants ---------- */
  const INK = 'rgba(27,26,23,.55)';
  const RIM = 'rgba(255,240,210,.16)';
  const CONTACT = 'rgba(0,0,0,.18)';
  const TORCH_ID = 'wpn_scrap_torch';
  const KIND_HP = { rusted: 70, drover: 46, warden: 120 };
  const CULL = 72;

  /* ---- the player, indoors ----
     Outdoors the player wears a dull olive coat and reads against sand and
     scrub. Indoors they stand in the middle of their own torchlight on a
     floor that belongs to the same family of colour, and a coat the same
     value as the floor is not a person, it is a smudge. So the figure that
     is lit by its own lamp is drawn in the tone it would actually be in -
     bone and dust, bright against the room - with a dark hood for structure
     and a dark edge all the way round it.
     The dark edge is the same rule the hit marker and the damage number
     follow: a mark drawn over a lit thing needs its own darkness under it,
     or it dissolves into the thing it is drawn on. */
  const LIT_COAT = '#c4b795';
  const LIT_HOOD = '#6a604c';
  const LIT_ARM = '#8d8467';
  const LIT_SASH = 'rgba(226,142,46,.96)';
  const HALO = 'rgba(7,8,6,.66)';
  const RIM_LIT = 'rgba(255,241,214,.44)';

  /* ---------- module state (never written back into the game) ---------- */
  let lastCam = { x: 0, y: 0 };
  let walkPhase = 0;
  let lastPX = null;
  let lastPY = null;

  /* ---------- small helpers ---------- */

  /* world.js publishes VG.TILE; the contract value is 32 and is used as a
     fallback so this module also works in a bare helper sandbox */
  function tile() {
    const t = VG.TILE;
    return (typeof t === 'number' && isFinite(t) && t > 0) ? t : 32;
  }

  function viewport(ctx) {
    let scale = 1;
    if (ctx.getTransform) {
      const m = ctx.getTransform();
      if (m && m.a) scale = m.a;
    }
    const cv = ctx.canvas;
    const w = cv && cv.width ? cv.width / scale : 1280;
    const h = cv && cv.height ? cv.height / scale : 720;
    return { w: w, h: h };
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

  /* soft ground shadow: three stacked ellipses read softer than one and
     cost no gradient */
  function softShadow(ctx, x, y, rx, ry, alpha) {
    ctx.save();
    ctx.fillStyle = 'rgba(28,24,18,' + alpha + ')';
    for (let i = 0; i < 3; i++) {
      const k = 1 + i * 0.28;
      ctx.globalAlpha = 1 - i * 0.31;
      ctx.beginPath();
      ellipsePath(ctx, x, y, rx * k, ry * k, 0);
      ctx.fill();
    }
    ctx.restore();
  }

  /* the four-layer body recipe: gradient fill, ink edge, north-west rim
     light and south-east contact shadow. The rim colour and width are
     arguments because a lit figure needs a stronger rim than one that is
     standing in flat daylight. */
  function paintBody(ctx, pathFn, base, top, bottom, rimCol, rimW) {
    const rim = rimCol || RIM;
    const rw = (rimW === undefined || rimW === null) ? 1.8 : rimW;
    let fill = base;
    if (ctx.createLinearGradient) {
      const g = ctx.createLinearGradient(0, top, 0, bottom);
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
    ctx.strokeStyle = rim;
    ctx.lineWidth = rw;
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

  /* ---------- silhouettes ---------- */
  /* every path function only adds path commands; the caller owns beginPath */

  function coatPath(ctx, hx, hy) {
    ctx.moveTo(-6.2, -6.4);
    ctx.quadraticCurveTo(-8.2, -4.8, -7.4, -0.4);
    ctx.quadraticCurveTo(-6.8, 5.0, -4.4 + hx, 8.0 + hy);
    ctx.quadraticCurveTo(hx * 0.5, 9.7 + hy, 4.2 + hx, 7.8 + hy);
    ctx.quadraticCurveTo(6.8, 4.6, 7.2, -0.4);
    ctx.quadraticCurveTo(8.0, -4.8, 6.2, -6.4);
    ctx.quadraticCurveTo(0, -10.0, -6.2, -6.4);
    ctx.closePath();
  }

  function rustedPath(ctx) {
    ctx.moveTo(-8.4, -6.2);
    ctx.lineTo(5.6, -8.0);
    ctx.lineTo(9.2, -3.4);
    ctx.lineTo(8.6, 6.2);
    ctx.lineTo(1.6, 9.0);
    ctx.lineTo(-7.2, 7.6);
    ctx.lineTo(-9.4, 1.6);
    ctx.closePath();
  }

  function droverPath(ctx) {
    ctx.moveTo(-5.6, -3.0);
    ctx.quadraticCurveTo(-2.0, -5.2, 3.6, -3.6);
    ctx.quadraticCurveTo(6.2, -1.0, 5.4, 2.4);
    ctx.quadraticCurveTo(3.0, 5.0, -1.0, 4.6);
    ctx.quadraticCurveTo(-5.2, 4.2, -6.2, 0.6);
    ctx.closePath();
  }

  function packPath(ctx) {
    ctx.moveTo(-4.2, -3.0);
    ctx.quadraticCurveTo(0, -4.4, 4.2, -3.0);
    ctx.quadraticCurveTo(5.2, 0, 4.2, 3.0);
    ctx.quadraticCurveTo(0, 4.4, -4.2, 3.0);
    ctx.quadraticCurveTo(-5.2, 0, -4.2, -3.0);
    ctx.closePath();
  }

  function wardenPath(ctx) {
    ctx.moveTo(-13.5, -12.0);
    ctx.lineTo(9.0, -14.6);
    ctx.lineTo(16.2, -4.2);
    ctx.lineTo(14.4, 10.4);
    ctx.lineTo(2.4, 15.6);
    ctx.lineTo(-11.6, 12.8);
    ctx.lineTo(-16.2, 1.6);
    ctx.closePath();
  }

  /* ---------- facing ---------- */

  function idHash(id) {
    const s = String(id);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* aggroed enemies look at the player, the rest keep a stable heading
     derived from their id so they never spin */
  function enemyFace(e, p) {
    if (p && e.aggro > 0) {
      const ex = e.x * tile(), ey = e.y * tile();
      return Math.atan2(p.y - ey, p.x - ex);
    }
    return VG.hash2(idHash(e.id), 17, 977) * VG.TAU;
  }

  /* ---------- walk bob ---------- */

  function updateWalk(p) {
    if (typeof p.walkPhase === 'number') return p.walkPhase;
    if (lastPX === null) {
      lastPX = p.x;
      lastPY = p.y;
      return 0;
    }
    const dx = p.x - lastPX, dy = p.y - lastPY;
    const d = Math.sqrt(dx * dx + dy * dy);
    lastPX = p.x;
    lastPY = p.y;
    if (d > 120) return walkPhase;
    walkPhase += d * 0.14;
    if (!p.moving) {
      const rest = Math.round(walkPhase / Math.PI) * Math.PI;
      walkPhase += (rest - walkPhase) * 0.25;
    }
    return walkPhase;
  }

  /* ---------- hit points ---------- */

  function paintHpBar(ctx, sx, y, w, frac) {
    const h = 3;
    const x = sx - w / 2;
    ctx.fillStyle = 'rgba(10,9,7,.82)';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = 'rgba(40,35,26,.85)';
    ctx.fillRect(x, y, w, h);
    const fill = frac > 0.45 ? '#8fb255' : frac > 0.2 ? '#f0b64a' : '#c9533f';
    const fw = Math.max(1, w * frac);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, fw, h);
    ctx.fillStyle = 'rgba(255,255,255,.20)';
    ctx.fillRect(x, y, fw, 1);
  }

  /* ---------- enemies ---------- */

  function paintRusted(ctx, e, sx, sy, face) {
    const r = e.r || 11;
    softShadow(ctx, sx + 2, sy + 3, r * 0.86, r * 0.56, 0.34);
    const fx = Math.cos(face), fy = Math.sin(face);
    const nx = -fy, ny = fx;

    ctx.save();
    ctx.translate(sx, sy);
    paintBody(ctx, rustedPath, '#4e5355', -9, 9);

    /* recessed plate on the back of the chassis */
    ctx.save();
    ctx.beginPath();
    rustedPath(ctx);
    ctx.clip();
    const bx = -fx * 4.4, by = -fy * 4.4;
    ctx.beginPath();
    ctx.moveTo(bx - fx * 3.4 - nx * 3.0, by - fy * 3.4 - ny * 3.0);
    ctx.lineTo(bx + fx * 3.4 - nx * 3.0, by + fy * 3.4 - ny * 3.0);
    ctx.lineTo(bx + fx * 3.4 + nx * 3.0, by + fy * 3.4 + ny * 3.0);
    ctx.lineTo(bx - fx * 3.4 + nx * 3.0, by - fy * 3.4 + ny * 3.0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(24,28,30,.52)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(152,160,158,.22)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    /* the one lens */
    const lx = fx * 4.2, ly = fy * 4.2;
    ctx.beginPath();
    ctx.arc(lx, ly, 2.9, 0, VG.TAU);
    ctx.fillStyle = '#141311';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lx, ly, 1.8, 0, VG.TAU);
    ctx.fillStyle = '#a8c9c0';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lx - fx * 0.5, ly - fy * 0.5, 0.8, 0, VG.TAU);
    ctx.fillStyle = '#e8f3ec';
    ctx.fill();

    /* rust streaks */
    const h = VG.hash2(e.x * 13, e.y * 7, 41);
    ctx.save();
    ctx.strokeStyle = 'rgba(138,79,42,.85)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-7.4 + h * 2.0, 5.6);
    ctx.lineTo(-4.2 + h * 2.0, 2.6);
    ctx.moveTo(7.6 - h * 1.6, -5.0);
    ctx.lineTo(4.6 - h * 1.6, -3.0);
    ctx.stroke();
    ctx.restore();

    /* rivets */
    ctx.fillStyle = 'rgba(126,132,132,.75)';
    ctx.beginPath();
    ctx.arc(-7.5, -5.1, 0.8, 0, VG.TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7.3, 5.0, 0.8, 0, VG.TAU);
    ctx.fill();
    ctx.restore();
  }

  function paintDrover(ctx, e, sx, sy, face) {
    const r = e.r || 11;
    softShadow(ctx, sx + 2, sy + 3, r * 0.66, r * 0.44, 0.32);
    const fx = Math.cos(face), fy = Math.sin(face);

    ctx.save();
    ctx.translate(sx, sy);

    /* the pack rides high on the back */
    ctx.save();
    ctx.translate(-fx * 4.6, -fy * 4.0);
    paintBody(ctx, packPath, '#6a6049', -4.6, 4.6);
    ctx.strokeStyle = 'rgba(32,28,20,.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-3.0, -2.6);
    ctx.lineTo(3.0, 2.6);
    ctx.stroke();
    ctx.restore();

    /* low hunched body */
    paintBody(ctx, droverPath, '#8a7f5c', -5.4, 5.0);

    /* head carried forward */
    const hx = fx * 5.2, hy = fy * 4.6;
    ctx.save();
    ctx.beginPath();
    ellipsePath(ctx, hx, hy, 3.2, 2.9, 0);
    ctx.fillStyle = '#4c4634';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hx + fx * 1.5, hy + fy * 1.3, 1.1, 0, VG.TAU);
    ctx.fillStyle = 'rgba(214,201,170,.55)';
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function paintWarden(ctx, e, sx, sy, face, time) {
    softShadow(ctx, sx + 4, sy + 6, 16, 9.5, 0.44);

    /* amber containment ring */
    ctx.save();
    ctx.strokeStyle = 'rgba(240,182,74,.26)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 21, 0, VG.TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,96,.55)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      const a0 = time * 0.6 + i * (VG.TAU / 4);
      ctx.beginPath();
      ctx.arc(sx, sy, 21, a0, a0 + 0.55);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(sx, sy);
    paintBody(ctx, wardenPath, '#3e4447', -15, 16);

    /* armour plates */
    ctx.save();
    ctx.beginPath();
    wardenPath(ctx);
    ctx.clip();
    ctx.fillStyle = 'rgba(132,140,142,.20)';
    ctx.beginPath();
    ctx.moveTo(-13.5, -12.0);
    ctx.lineTo(2.0, -14.2);
    ctx.lineTo(3.4, -1.0);
    ctx.lineTo(-14.0, 1.0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath();
    ctx.moveTo(3.4, -1.0);
    ctx.lineTo(16.2, -4.2);
    ctx.lineTo(14.4, 10.4);
    ctx.lineTo(2.4, 15.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(18,20,21,.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(3.4, -14.2);
    ctx.lineTo(3.4, 15.0);
    ctx.moveTo(-14.0, 1.0);
    ctx.lineTo(16.0, -3.4);
    ctx.stroke();
    ctx.restore();

    /* bolts */
    ctx.fillStyle = 'rgba(150,158,158,.55)';
    ctx.beginPath();
    ctx.arc(-10.0, -8.6, 1.0, 0, VG.TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10.6, -9.6, 1.0, 0, VG.TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8.6, 8.4, 1.0, 0, VG.TAU);
    ctx.fill();

    /* the single amber eye */
    ctx.beginPath();
    ctx.arc(0, -1, 8.4, 0, VG.TAU);
    ctx.fillStyle = 'rgba(240,182,74,.13)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -1, 5.2, 0, VG.TAU);
    ctx.fillStyle = '#15130f';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -1, 3.4, 0, VG.TAU);
    ctx.fillStyle = '#f0b64a';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -1, 1.5, 0, VG.TAU);
    ctx.fillStyle = '#ffeec2';
    ctx.fill();
    ctx.restore();
  }

  function paintEnemy(ctx, e, sx, sy, p, time) {
    const face = enemyFace(e, p);
    if (e.kind === 'warden') paintWarden(ctx, e, sx, sy, face, time);
    else if (e.kind === 'drover') paintDrover(ctx, e, sx, sy, face);
    else paintRusted(ctx, e, sx, sy, face);

    /* A thing that has just been hit flares white, so a hit is something you
       can see rather than something you have to infer. A soft halo was not
       enough at this sprite scale: the body itself goes hot, and a ring
       opens out of it as the flare fades. */
    if (e.flash > 0) {
      const a = Math.max(0, Math.min(1, e.flash / 0.16));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      /* the body, white hot */
      ctx.globalAlpha = 0.8 * a;
      ctx.fillStyle = 'rgba(255,250,236,.92)';
      ctx.beginPath();
      ctx.ellipse(sx, sy - 3, 7, 10, 0, 0, VG.TAU);
      ctx.fill();
      /* the impact ring, opening out as the flare dies */
      ctx.globalAlpha = 0.9 * a;
      ctx.strokeStyle = 'rgba(255,238,190,.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy - 3, 9 + (1 - a) * 13, 0, VG.TAU);
      ctx.stroke();
      ctx.restore();
    }

    const maxhp = e.maxhp || KIND_HP[e.kind] || e.hp;
    if (e.hp < maxhp) {
      const w = e.kind === 'warden' ? 26 : 18;
      const top = e.kind === 'warden' ? -22 : e.kind === 'drover' ? -12 : -15;
      paintHpBar(ctx, sx, sy + top, w, e.hp / maxhp);
    }
  }

  /* ---------- death marks ---------- */

  function deathAge(e, state) {
    const t = e.deathTime;
    if (typeof t !== 'number' || !isFinite(t)) return null;
    if (!state || typeof state.time !== 'number') return null;
    let age = state.time - t;
    if (age < 0) age += 86400;
    return age;
  }

  function paintDeath(ctx, e, sx, sy, state) {
    /* the stain stays: it is the record of the fight */
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = 'rgba(30,25,19,.62)';
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * VG.TAU;
      const rad = 6.5 + VG.hash2(e.x * 31 + i, e.y * 17, 313) * 4.5;
      const px = sx + Math.cos(a) * rad;
      const py = sy + Math.sin(a) * rad * 0.68;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    /* the wreck fades out when the death time is known */
    const age = deathAge(e, state);
    const alpha = age === null ? 0.42 : Math.max(0, 1 - age / 6);
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(sx, sy);
    if (e.kind === 'warden') {
      ctx.fillStyle = '#33383a';
      ctx.beginPath();
      ctx.moveTo(-9.0, -4.0);
      ctx.lineTo(1.0, -7.0);
      ctx.lineTo(6.0, -1.0);
      ctx.lineTo(-4.0, 3.0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (e.kind === 'drover') {
      ctx.fillStyle = '#5b5340';
      ctx.beginPath();
      ellipsePath(ctx, 0, 0, 6.0, 3.6, 0.4);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillStyle = '#3c4143';
      ctx.beginPath();
      ctx.moveTo(-6.0, -4.0);
      ctx.lineTo(4.0, -6.0);
      ctx.lineTo(6.0, 2.0);
      ctx.lineTo(-3.0, 5.0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- projectiles ---------- */

  function paintBullet(ctx, b, sx, sy) {
    const vx = b.vx || 0, vy = b.vy || 0;
    const sp = Math.sqrt(vx * vx + vy * vy);
    let ux = 1, uy = 0;
    if (sp > 1) {
      ux = vx / sp;
      uy = vy / sp;
    }
    const friendly = b.friendly === undefined || b.friendly === null ? true : !!b.friendly;
    const len = Math.max(6, Math.min(18, sp * 0.018));
    const nx = -uy, ny = ux;
    const tx = sx - ux * len, ty = sy - uy * len;
    const hw = 1.9, tw = 0.5;

    ctx.save();
    /* faint motion trail */
    ctx.strokeStyle = friendly ? 'rgba(240,213,154,.22)' : 'rgba(224,167,147,.20)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(tx - ux * len * 0.7, ty - uy * len * 0.7);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    /* tracer streak */
    ctx.fillStyle = friendly ? 'rgba(246,222,168,.55)' : 'rgba(232,178,156,.50)';
    ctx.beginPath();
    ctx.moveTo(sx + nx * hw, sy + ny * hw);
    ctx.lineTo(sx - nx * hw, sy - ny * hw);
    ctx.lineTo(tx - nx * tw, ty - ny * tw);
    ctx.lineTo(tx + nx * tw, ty + ny * tw);
    ctx.closePath();
    ctx.fill();
    /* bright head */
    ctx.fillStyle = friendly ? '#fff0c4' : '#ffd2bd';
    ctx.beginPath();
    ctx.arc(sx, sy, 1.9, 0, VG.TAU);
    ctx.fill();
    ctx.fillStyle = friendly ? 'rgba(255,226,152,.20)' : 'rgba(255,190,160,.18)';
    ctx.beginPath();
    ctx.arc(sx, sy, 4.2, 0, VG.TAU);
    ctx.fill();
    ctx.restore();
  }

  /* ---------- the player ---------- */

  function paintFlame(ctx, x, y, time) {
    const fl = 1 + Math.sin(time * 11.3) * 0.17 + Math.sin(time * 23.1) * 0.09;
    const h = 7.4 * fl;
    const w = 2.9 + (2 - fl) * 0.9;
    ctx.save();
    ctx.fillStyle = 'rgba(255,196,96,.10)';
    ctx.beginPath();
    ctx.arc(x, y - h * 0.25, 7, 0, VG.TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#e07a26';
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.quadraticCurveTo(x + w, y - h * 0.34, x + w * 0.72, y + 1.2);
    ctx.quadraticCurveTo(x, y + 2.3, x - w * 0.72, y + 1.2);
    ctx.quadraticCurveTo(x - w, y - h * 0.34, x, y - h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe2a0';
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.56);
    ctx.quadraticCurveTo(x + w * 0.5, y - h * 0.14, x + w * 0.34, y + 0.9);
    ctx.quadraticCurveTo(x, y + 1.7, x - w * 0.34, y + 0.9);
    ctx.quadraticCurveTo(x - w * 0.5, y - h * 0.14, x, y - h * 0.56);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function paintPlayer(ctx, p, state, cam, time, lit) {
    const sx = p.x - cam.x;
    const sy = p.y - cam.y;
    /* The figure faces where the player is pointing, not where they last
       walked. A body that faces one way while the round goes another is
       how a player concludes that aiming does not work. */
    const face = typeof p.aim === 'number' ? p.aim : (typeof p.face === 'number' ? p.face : 0);
    const fx = Math.cos(face), fy = Math.sin(face);
    const nx = -fy, ny = fx;
    const bob = p.moving ? Math.sin(walkPhase) * 1.2 : 0;
    const py = sy + bob;

    softShadow(ctx, sx + 2, sy + 3, 9, 5.4, lit ? 0.44 : 0.34);

    /* radiation warning under the figure */
    if (typeof p.dose === 'number' && p.dose > 55) {
      ctx.save();
      ctx.strokeStyle = 'rgba(208,106,74,.45)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(sx, py, 16, 0, VG.TAU);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(sx, py);

    /* dust coat: rounded trapezoid, hem swung opposite the facing.
       The hem swings with the way you are actually travelling, so backing
       up reads as backing up and not as walking forward with a coat that
       has come loose on one side. */
    const travel = (typeof p.face === 'number') ? p.face : face;
    const back = p.moving && Math.cos(travel - face) < -0.2;
    const hem = back ? -1 : 1;
    const hx = -fx * 1.6 * hem, hy = -fy * 0.7 * hem;
    const coatBase = lit ? LIT_COAT : '#7e7358';
    const hoodBase = lit ? LIT_HOOD : '#5f5645';
    const hox = fx * 1.5, hoy = -8.2 + fy * 1.1;

    /* The dark edge. Drawn first, under the body, so it reads as the
       outline of the figure and not as a ring around it. */
    if (lit) {
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = HALO;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      coatPath(ctx, hx, hy);
      ctx.stroke();
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ellipsePath(ctx, hox, hoy, 4.5, 4.1, 0);
      ctx.stroke();
      ctx.restore();
    }

    paintBody(ctx, function (c) { coatPath(c, hx, hy); }, coatBase, -10, 10,
      lit ? RIM_LIT : RIM, lit ? 2.4 : 1.8);

    /* shoulder line */
    ctx.save();
    ctx.strokeStyle = 'rgba(34,30,22,.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6.2, -4.4);
    ctx.quadraticCurveTo(0, -3.2, 6.2, -4.4);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(198,186,158,.30)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-5.6, -3.4);
    ctx.quadraticCurveTo(0, -2.3, 5.6, -3.4);
    ctx.stroke();
    ctx.restore();

    /* surveyor's sash — the player's amber marker */
    ctx.save();
    ctx.fillStyle = lit ? LIT_SASH : 'rgba(240,182,74,.85)';
    ctx.beginPath();
    ctx.moveTo(-5.6, -3.4);
    ctx.lineTo(-4.3, -3.4);
    ctx.lineTo(-3.5, 5.6);
    ctx.lineTo(-4.8, 5.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    /* hood and head, turned toward the facing */
    ctx.save();
    ctx.beginPath();
    ellipsePath(ctx, hox, hoy, 4.5, 4.1, 0);
    let hoodFill = hoodBase;
    if (ctx.createLinearGradient) {
      const hg = ctx.createLinearGradient(0, hoy - 4.1, 0, hoy + 4.1);
      hg.addColorStop(0, VG.shade(hoodBase, 0.14));
      hg.addColorStop(1, VG.shade(hoodBase, -0.18));
      hoodFill = hg;
    }
    ctx.fillStyle = hoodFill;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();
    /* a lit hood gets a rim of its own, or the head is a hole in the coat */
    if (lit) {
      ctx.save();
      ctx.beginPath();
      ellipsePath(ctx, hox, hoy, 4.5, 4.1, 0);
      ctx.clip();
      ctx.translate(1.1, 1.1);
      ctx.beginPath();
      ellipsePath(ctx, hox, hoy, 4.5, 4.1, 0);
      ctx.strokeStyle = RIM_LIT;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();
    }
    /* the hood opening is where the player is looking */
    ctx.beginPath();
    ellipsePath(ctx, hox + fx * 2.2, hoy + fy * 1.9, 2.3, 1.9, face);
    ctx.fillStyle = 'rgba(22,20,16,.72)';
    ctx.fill();
    ctx.restore();

    /* arm and weapon. The hand is held out to the side: a torch directly
       over the head sits on the hood, and a figure whose head is hidden
       behind its own flame is a figure with no head. */
    const handX = fx * 7.5 + nx * 4.6, handY = fy * 7.5 + ny * 4.6;
    const tipX = handX + fx * 6.5, tipY = handY + fy * 6.5;
    ctx.save();
    if (lit) {
      /* the arm gets the same dark edge as the body */
      ctx.strokeStyle = HALO;
      ctx.lineWidth = 5.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -3.8);
      ctx.lineTo(handX, handY);
      ctx.stroke();
    }
    ctx.strokeStyle = lit ? LIT_ARM : '#6b6249';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -3.8);
    ctx.lineTo(handX, handY);
    ctx.stroke();
    ctx.restore();

    if (p.weapon === TORCH_ID) {
      ctx.save();
      ctx.strokeStyle = '#3c332a';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.restore();
      paintFlame(ctx, tipX, tipY, time);
    } else if (p.weapon) {
      ctx.save();
      ctx.strokeStyle = '#4a4f52';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.fillStyle = '#6d7478';
      ctx.beginPath();
      ctx.arc(tipX, tipY, 1.8, 0, VG.TAU);
      ctx.fill();
      ctx.restore();
    }
    /* The torch keeps burning in the pack. If the light you are standing in
       has nothing in it, the player is standing inside a lie - so the flame
       shows at the off hand whenever the torch is not in the hand that is
       holding the gun. */
    if (p.weapon !== TORCH_ID && p.inv && p.inv[TORCH_ID] > 0) {
      paintFlame(ctx, -fx * 3.0 - nx * 4.6, -fy * 3.0 - ny * 4.6, time);
    }
    ctx.restore();
  }

  /* ---------- public API ---------- */

  GFX.paintActors = function (ctx, cam, p, state, world) {
    if (!ctx) return;
    cam = cam || { x: 0, y: 0 };
    state = state || {};
    world = world || {};
    lastCam = { x: cam.x || 0, y: cam.y || 0 };
    const vp = viewport(ctx);
    /* Animation runs on the real-time clock, not the game clock. The game
       clock now runs twenty-four times faster than real time, so a flame
       flicker driven by it would be a 43 hertz strobe. */
    const time = typeof state.anim === 'number' ? state.anim
      : (typeof state.time === 'number' ? state.time : 0);
    const enemies = world.enemies || [];

    /* ground marks first, then the live actors in depth order */
    const live = [];
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e) continue;
      const wx = e.x * tile(), wy = e.y * tile();
      const sx = wx - cam.x, sy = wy - cam.y;
      if (!visible(sx, sy, vp, CULL)) continue;
      if (e.dead) {
        paintDeath(ctx, e, sx, sy, state);
        continue;
      }
      live.push({ e: e, sx: sx, sy: sy });
    }
    live.sort(function (a, b) { return a.sy - b.sy; });
    for (let i = 0; i < live.length; i++) {
      paintEnemy(ctx, live[i].e, live[i].sx, live[i].sy, p, time);
    }

    /* projectiles */
    const bullets = state.bullets || [];
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      if (!b) continue;
      if (b.life !== undefined && b.life <= 0) continue;
      const sx = b.x - cam.x, sy = b.y - cam.y;
      if (!visible(sx, sy, vp, 40)) continue;
      paintBullet(ctx, b, sx, sy);
    }

    /* the player sits on top of everything */
    if (p) {
      walkPhase = updateWalk(p);
      paintPlayer(ctx, p, state, cam, time);
    }
  };

  /* The player on their own. The interior scene has its own coordinate
     space and the flats' enemies have no business being drawn inside a
     diner, so the interior renderer asks for just the figure. It also asks
     for the lit version of it: indoors the figure is the one thing in the
     room that has to be readable at a glance, and the flat daylight coat
     dissolves into a floor of the same colour. */
  GFX.paintPlayerOnly = function (ctx, cam, p, state) {
    if (!ctx || !p) return;
    cam = cam || { x: 0, y: 0 };
    state = state || {};
    const time = typeof state.anim === 'number' ? state.anim
      : (typeof state.time === 'number' ? state.time : 0);
    walkPhase = updateWalk(p);
    paintPlayer(ctx, p, state, cam, time, true);
  };

  /* Light registration for the atmosphere pass. Coordinates are screen
     pixels, matching what gfx_atmos expects from a light entry. */
  function resolveCam(explicit) {
    if (explicit && typeof explicit.x === 'number' && typeof explicit.y === 'number') return explicit;
    if (typeof VG.worldToScreen === 'function') {
      const o = VG.worldToScreen(0, 0);
      if (o && typeof o.x === 'number' && typeof o.y === 'number') return { x: -o.x, y: -o.y };
    }
    return lastCam;
  }

  GFX.actorLights = function (p, state, world, cam) {
    const lights = [];
    if (!p) return lights;
    state = state || {};
    world = world || {};
    const time = typeof state.anim === 'number' ? state.anim
      : (typeof state.time === 'number' ? state.time : 0);
    const c = resolveCam(cam);

    /* the torch: a small flickering flame that punches a warm hole. It
       burns in the pack as well as in your hand, so the pool of light
       follows the flame and not the weapon you happen to be holding. */
    const tl = VG.torchLight ? VG.torchLight(p) : null;
    if (tl) {
      const flick = 1 + Math.sin(time * 11.3) * 0.12 + Math.sin(time * 23.1) * 0.07;
      lights.push({
        x: tl.x - c.x,
        y: tl.y - c.y,
        r: (tl.held ? 132 : 96) * flick,
        color: '255,176,88',
        intensity: (tl.held ? 0.62 : 0.46) * flick
      });
    }

    /* every live warden carries an amber eye that lights the ground */
    const enemies = world.enemies || [];
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e || e.dead || e.kind !== 'warden') continue;
      const pulse = 0.5 + Math.sin(time * 2.1 + idHash(e.id) % 628) * 0.07;
      lights.push({
        x: e.x * tile() - c.x,
        y: e.y * tile() - c.y,
        r: 96,
        color: '255,168,72',
        intensity: pulse
      });
    }
    return lights;
  };
})(window.VG.GFX, window.VG);
