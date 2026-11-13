/* VERDIGRIS — feel: shake, sparks, the loot feed, the banner
   Everything in this file is feedback. None of it changes a rule: a shot
   does the same damage with the screen held still, and a crate pays the
   same with the feed switched off. It exists because an event the player
   cannot feel is an event that did not happen - a kill that only prints a
   line of text reads the same as a miss. */
window.VG = window.VG || {};
(function (VG) {
  'use strict';

  const FX = {
    shake: 0,          /* pixels of camera shake, decays on its own */
    stop: 0,           /* seconds of hit-stop still to serve */
    hurt: 0,           /* 0..1 red flash after taking a hit */
    parts: [],         /* world-space particles */
    rings: [],         /* world-space expanding rings */
    shakeOn: true,
    t: 0
  };
  VG.FX = FX;

  const MAX_PARTS = 260;
  const KEY_SHAKE = 'verdigris.shake';

  function readStore(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function writeStore(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }

  FX.loadSettings = function () {
    FX.shakeOn = readStore(KEY_SHAKE) !== 'off';
  };
  FX.setShake = function (on) {
    FX.shakeOn = !!on;
    writeStore(KEY_SHAKE, on ? 'on' : 'off');
    if (!on) FX.shake = 0;
  };

  /* ---------- camera ---------- */
  FX.addShake = function (n) {
    if (!FX.shakeOn) return;
    FX.shake = Math.min(14, Math.max(FX.shake, n));
  };
  /* the offset the world is drawn at this frame */
  FX.offset = function () {
    if (!FX.shakeOn || FX.shake < 0.2) return { x: 0, y: 0 };
    return { x: (Math.random() - 0.5) * 2 * FX.shake, y: (Math.random() - 0.5) * 2 * FX.shake };
  };
  FX.hitStop = function (sec) { FX.stop = Math.max(FX.stop, sec); };

  /* ---------- particles ---------- */
  function push(p) {
    if (FX.parts.length >= MAX_PARTS) FX.parts.shift();
    FX.parts.push(p);
  }

  /* A spray of short-lived sparks. `ang` aims the spray; leave it out for a
     burst in every direction. */
  FX.burst = function (x, y, o) {
    o = o || {};
    const n = o.n || 8;
    const spread = (o.ang === undefined) ? Math.PI : (o.spread || 0.6);
    const base = (o.ang === undefined) ? 0 : o.ang;
    for (let i = 0; i < n; i++) {
      const a = base + (Math.random() - 0.5) * 2 * spread;
      const sp = (o.speed || 150) * (0.35 + Math.random() * 0.85);
      push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: (o.life || 0.4) * (0.6 + Math.random() * 0.6), max: o.life || 0.4,
        size: (o.size || 2) * (0.6 + Math.random() * 0.8),
        color: o.color || '255,214,140', drag: o.drag === undefined ? 3.2 : o.drag,
        grow: o.grow || 0, kind: o.kind || 'spark'
      });
    }
  };

  /* the flash at the muzzle: a bright cone that is gone in three frames */
  FX.muzzle = function (x, y, ang) {
    FX.burst(x, y, { n: 7, ang: ang, spread: 0.28, speed: 420, life: 0.11, size: 2.2, color: '255,236,180', drag: 7 });
    push({ x: x, y: y, vx: 0, vy: 0, life: 0.07, max: 0.07, size: 11, color: '255,226,150', drag: 0, grow: 0, kind: 'glow' });
  };

  /* a round that connects throws metal back along the way it came */
  FX.impact = function (x, y, ang) {
    FX.burst(x, y, { n: 9, ang: ang + Math.PI, spread: 0.9, speed: 230, life: 0.32, size: 1.8, color: '255,214,140' });
  };

  /* what is left when one of them comes apart */
  FX.wreck = function (x, y, kind) {
    const col = kind === 'drover' ? '196,168,128' : '214,138,82';
    FX.burst(x, y, { n: 18, speed: 240, life: 0.6, size: 2.6, color: col, drag: 2.6 });
    FX.burst(x, y, { n: 8, speed: 60, life: 0.9, size: 7, color: '70,62,50', drag: 1.6, grow: 12, kind: 'dust' });
    FX.ring(x, y, 46, '255,214,140', 0.35);
  };

  FX.dust = function (x, y) {
    FX.burst(x, y, { n: 2, speed: 26, life: 0.5, size: 3.4, color: '188,170,136', drag: 2, grow: 9, kind: 'dust' });
  };

  /* an opened crate: a puff of the dust it has been sitting in */
  FX.crate = function (x, y, rarity) {
    FX.burst(x, y, { n: 6, speed: 46, life: 0.55, size: 4, color: '178,160,128', drag: 2, grow: 10, kind: 'dust' });
    if (rarity >= 2) {
      const rgb = VG.hexToRgb((VG.RARITY_COLOR || [])[rarity] || '#e8b34a').join(',');
      FX.burst(x, y, { n: 10 + rarity * 3, speed: 120, life: 0.7, size: 2, color: rgb, drag: 2.4 });
      FX.ring(x, y, 40 + rarity * 10, rgb, 0.5);
    }
  };

  FX.ring = function (x, y, r, color, life) {
    FX.rings.push({ x: x, y: y, r: r, color: color || '232,179,74', life: life || 0.5, max: life || 0.5 });
    if (FX.rings.length > 16) FX.rings.shift();
  };

  FX.hurtFlash = function (n) { FX.hurt = Math.min(1, Math.max(FX.hurt, n)); };

  /* ---------- per-frame ---------- */
  FX.update = function (dt) {
    FX.t += dt;
    FX.shake = FX.shake > 0.1 ? FX.shake * Math.pow(0.0009, dt) : 0;
    FX.hurt = Math.max(0, FX.hurt - dt * 2.4);
    for (let i = FX.parts.length - 1; i >= 0; i--) {
      const p = FX.parts[i];
      p.life -= dt;
      if (p.life <= 0) { FX.parts.splice(i, 1); continue; }
      const k = Math.max(0, 1 - p.drag * dt);
      p.vx *= k; p.vy *= k;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.grow) p.size += p.grow * dt;
    }
    for (let i = FX.rings.length - 1; i >= 0; i--) {
      FX.rings[i].life -= dt;
      if (FX.rings[i].life <= 0) FX.rings.splice(i, 1);
    }
    const dz = document.getElementById('hurtflash');
    if (dz && dz.style) dz.style.opacity = (FX.hurt * 0.55).toFixed(3);
  };

  /* Drawn in world space, over the actors and under the lighting, so a
     spark at night is still a spark and the dark still closes over it. */
  FX.paint = function (ctx, cam) {
    if (!ctx || !cam) return;
    for (let i = 0; i < FX.rings.length; i++) {
      const r = FX.rings[i];
      const t = 1 - r.life / r.max;
      ctx.strokeStyle = 'rgba(' + r.color + ',' + (0.7 * (1 - t)).toFixed(3) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x - cam.x, r.y - cam.y, 6 + r.r * t, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < FX.parts.length; i++) {
      const p = FX.parts[i];
      const a = Math.max(0, Math.min(1, p.life / p.max));
      const sx = p.x - cam.x, sy = p.y - cam.y;
      if (p.kind === 'spark') {
        ctx.fillStyle = 'rgba(' + p.color + ',' + a.toFixed(3) + ')';
        ctx.fillRect(sx - p.size / 2, sy - p.size / 2, p.size, p.size);
      } else {
        const al = p.kind === 'glow' ? 0.85 * a : 0.3 * a;
        ctx.fillStyle = 'rgba(' + p.color + ',' + al.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  /* A crate you have not searched catches the light now and then. The flats
     are brown and so are the crates; without a glint the loot the whole game
     is built around is the hardest thing on the screen to see. The better
     the crate, the warmer and the more often it winks. */
  FX.paintGlints = function (ctx, cam, world, vw, vh) {
    if (!ctx || !world || !world.containers) return;
    const T = VG.TILE || 32;
    for (let i = 0; i < world.containers.length; i++) {
      const c = world.containers[i];
      if (!c || c.opened || c.inside) continue;
      const sx = c.x * T + T / 2 - cam.x, sy = c.y * T + T / 2 - cam.y;
      if (sx < -20 || sy < -20 || sx > vw + 20 || sy > vh + 20) continue;
      const tier = c.tier || 0;
      const period = 3.4 - Math.min(2, tier) * 0.7;
      const ph = ((FX.t + i * 0.731) % period) / 0.55;
      if (ph > 1) continue;
      const a = Math.sin(ph * Math.PI);
      const len = 5 + tier * 2 + a * 5;
      const col = tier >= 3 ? '232,179,74' : tier >= 2 ? '150,214,232' : '255,244,214';
      ctx.strokeStyle = 'rgba(' + col + ',' + (0.9 * a).toFixed(3) + ')';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(sx - len, sy - 9); ctx.lineTo(sx + len, sy - 9);
      ctx.moveTo(sx, sy - 9 - len); ctx.lineTo(sx, sy - 9 + len);
      ctx.stroke();
    }
  };

  /* ---------- the loot feed ---------- */
  /* What you just picked up, as a short stack of chips in the colour of the
     thing's rarity. It works indoors and out, because it is not drawn in the
     world: a room has its own camera and the flats have another. */
  FX.loot = function (id, qty) {
    const it = VG.item ? VG.item(id) : null;
    const box = document.getElementById('lootfeed');
    if (!box || !it || !box.appendChild) return;
    const d = document.createElement('div');
    const r = it.rarity || 0;
    d.className = 'chip rar' + r + (r >= 3 ? ' hot' : '');
    d.innerHTML = '<span class="g">' + VG.htmlEscape(it.glyph || '·') + '</span>' + VG.htmlEscape(it.name) +
      (qty > 1 ? ' <span class="n">x' + qty + '</span>' : '') +
      (r >= 2 ? ' <span class="rr">' + (VG.RARITY ? VG.RARITY[r] : '') + '</span>' : '');
    box.appendChild(d);
    while (box.children.length > 6) box.removeChild(box.firstChild);
    setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 3600);
  };
  FX.note = function (text, cls) {
    const box = document.getElementById('lootfeed');
    if (!box || !box.appendChild) return;
    const d = document.createElement('div');
    d.className = 'chip ' + (cls || 'xp');
    d.innerHTML = VG.htmlEscape(text);
    box.appendChild(d);
    while (box.children.length > 6) box.removeChild(box.firstChild);
    setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 2600);
  };

  /* ---------- the banner ---------- */
  /* The moments the game is about - a place charted, evidence read, a file
     closed - used to arrive as one more line in the log, the same size as
     "Nothing but dust". They get the middle of the screen for two seconds.
     Banners queue, so two at once are read one after the other. */
  const queue = [];
  let showing = false;
  function next() {
    const el = document.getElementById('banner');
    if (!el || !el.classList) { queue.length = 0; showing = false; return; }
    const b = queue.shift();
    if (!b) { showing = false; return; }
    showing = true;
    el.innerHTML = '<div class="k" style="color:' + b.color + '">' + VG.htmlEscape(b.kicker) + '</div>' +
      '<div class="t">' + VG.htmlEscape(b.title) + '</div>' +
      (b.sub ? '<div class="s">' + VG.htmlEscape(b.sub) + '</div>' : '');
    el.style.borderColor = b.color;
    el.classList.remove('on');
    /* force a reflow so the entry animation restarts for every banner */
    void el.offsetWidth;
    el.classList.add('on');
    setTimeout(() => {
      el.classList.remove('on');
      setTimeout(next, 260);
    }, b.hold || 2100);
  }
  FX.banner = function (kicker, title, o) {
    o = o || {};
    if (queue.length > 4) queue.shift();
    queue.push({ kicker: kicker, title: title, sub: o.sub || '', color: o.color || '#e8b34a', hold: o.hold });
    if (!showing) next();
  };

  /* ---------- the saved pip ---------- */
  FX.saved = function () {
    const el = document.getElementById('savepip');
    if (!el || !el.classList) return;
    el.classList.remove('on');
    void el.offsetWidth;
    el.classList.add('on');
  };

  /* ---------- fade to black and back ---------- */
  FX.fade = function (on) {
    const f = document.getElementById('fader');
    if (f && f.style) f.style.opacity = on ? '1' : '0';
  };
})(window.VG);
