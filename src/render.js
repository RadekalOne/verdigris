/* VERDIGRIS — canvas rendering */
window.VG = window.VG || {};
(function (VG) {
  'use strict';

  let cv, ctx, W = 0, H = 0, dpr = 1;
  let cam = { x: 0, y: 0 };
  let lastCursor = '';

  /* The canvas hides the system cursor while the game is being played, because
     the game draws its own reticle at the cursor. Two reticles, one of them
     lying, is worse than one. Indoors, and while paused, the system cursor
     comes back: there is nothing to aim at in a room. */
  function setCursor(kind) {
    if (!cv || kind === lastCursor) return;
    lastCursor = kind;
    cv.style.cursor = kind;
  }

  VG.initRender = function (canvas) {
    cv = canvas; ctx = cv.getContext('2d');
    VG.resize();
    window.addEventListener('resize', VG.resize);
  };

  VG.resize = function () {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* the interior camera needs to know how big the window is */
    VG.viewW = W; VG.viewH = H;
  };

  VG.screenToWorld = function (sx, sy) {
    return { x: sx + cam.x, y: sy + cam.y };
  };
  VG.worldToScreen = function (wx, wy) {
    return { x: wx - cam.x, y: wy - cam.y };
  };

  /* ---------- weather ---------- */
  VG.weather = { kind: 'clear', haze: false, timer: 0, next: 90 };
  VG.rollWeather = function (rng) {
    const kinds = ['clear', 'clear', 'clear', 'haze', 'haze', 'wind', 'wind', 'dust', 'rain'];
    VG.weather.kind = rng.pick(kinds);
    VG.weather.haze = VG.weather.kind === 'haze';
    VG.weather.timer = VG.weather.next;
    VG.weather.next = rng.range(90, 260);
  };

  /* ---------- camera ---------- */
  VG.updateCamera = function (p, dt, world) {
    const tx = VG.clamp(p.x - W / 2, 0, world.W * VG.TILE - W);
    const ty = VG.clamp(p.y - H / 2, 0, world.H * VG.TILE - H);
    const k = 1 - Math.pow(0.0015, dt);
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;
  };

  /* ---------- fallback terrain ---------- */
  /* If a graphics module is ever missing, the world must not go black. This is
     a plain flat fill of the biome ground colour — dull, but legible and
     playable. The real terrain painter replaces it. */
  function paintFlatFallback(ctx, cam, world) {
    const x0 = Math.max(0, Math.floor(cam.x / VG.TILE));
    const y0 = Math.max(0, Math.floor(cam.y / VG.TILE));
    const x1 = Math.min(world.W - 1, Math.ceil((cam.x + W) / VG.TILE));
    const y1 = Math.min(world.H - 1, Math.ceil((cam.y + H) / VG.TILE));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const b = VG.BIOME[world.biome[y * world.W + x]];
        ctx.fillStyle = b ? b.ground : '#6b6a62';
        ctx.fillRect(x * VG.TILE - cam.x, y * VG.TILE - cam.y, VG.TILE, VG.TILE);
      }
    }
  }

  /* ---------- main draw ---------- */
  /* The renderer used to paint every tile from a random mix of two nearly
     identical colours and every building as the same rounded rectangle. The
     world generator had good data — elevation, biome identity, hundreds of
     points of interest — and none of it reached the screen. The drawing is
     split across four modules now; this file owns the order and nothing
     else. */
  VG.draw = function (p, world, state, dt) {
    const G = VG.GFX || {};
    const indoors = !!(VG.INT && VG.INT.active);
    setCursor(indoors || state.paused ? 'default' : 'none');

    /* --- inside a building the flats are suspended --- */
    /* A room is its own scene: its own floor, its own walls, its own light.
       The world camera does not apply, so this returns before any of the
       outdoor stages run. */
    if (VG.INT && VG.INT.active && G.paintInterior) {
      if (!VG.INT.view) VG.INT.view = { w: W, h: H, dpr: dpr };
      VG.INT.view.w = W; VG.INT.view.h = H; VG.INT.view.dpr = dpr;
      G.paintInterior(ctx, VG.INT.cam, VG.INT.active, p, state, world, VG.INT.view);
      /* No crosshair in the room. There is nothing to shoot in there, and a
         mark in the middle of the screen points at nothing - the same lie
         the screen-centre reticle used to tell outdoors. */
      return;
    }

    ctx.fillStyle = '#0a0c09';
    ctx.fillRect(0, 0, W, H);

    /* --- terrain --- */
    if (G.paintTerrain) G.paintTerrain(ctx, cam, world);
    else paintFlatFallback(ctx, cam, world);

    /* --- ground clutter --- */
    if (G.paintClutter) G.paintClutter(ctx, cam, world);

    /* --- structures (collects their lights) --- */
    const lights = [];
    if (G.paintStructures) G.paintStructures(ctx, cam, world, { lights: lights });

    /* --- containers --- */
    if (G.paintContainers) G.paintContainers(ctx, cam, world, p);

    /* --- the living flats: survivors, beacons, convoys --- */
    const dyn = VG.DYN || null;
    const anim = state.anim || 0;
    if (G.paintLive) G.paintLive(ctx, cam, world, dyn, p, state, anim);

    /* --- actors --- */
    if (G.paintActors) G.paintActors(ctx, cam, p, state, world);

    /* --- artificial lights: buildings, then the actors' own --- */
    if (G.actorLights) {
      const al = G.actorLights(p, state, world, cam);
      if (al && al.length) for (let i = 0; i < al.length; i++) lights.push(al[i]);
    }
    if (G.liveLights) {
      const ll = G.liveLights(ctx, cam, world, dyn, p, state);
      if (ll && ll.length) for (let i = 0; i < ll.length; i++) lights.push(ll[i]);
    }

    /* --- lighting --- */
    if (G.paintLighting) G.paintLighting(ctx, cam, p, state, world, lights);

    /* --- atmosphere --- */
    if (G.paintAtmosphere) G.paintAtmosphere(ctx, cam, p, state, world);

    /* --- guidance markers, above the dust so they stay readable --- */
    if (G.paintLiveMarkers) G.paintLiveMarkers(ctx, cam, world, dyn, p, state, anim);
    /* --- doors you can walk into, on the same footing --- */
    if (G.paintInteriorDoors) G.paintInteriorDoors(ctx, cam, world, p);

    /* --- the reticle --- */
    /* The reticle is drawn at the CURSOR, because the cursor is where the
       round goes. It used to be drawn at the centre of the screen, which is
       where a first-person game puts it and nowhere in this one: a reticle
       that is not the aim point is worse than no reticle, because the player
       trusts it. */
    if (state.showCrosshair && VG.mouse && !VG.paused) {
      const mx = VG.mouse.x, my = VG.mouse.y;
      const ranged = VG.playerWeapon && VG.playerWeapon(p) ? VG.isRangedWeapon(VG.playerWeapon(p)) : true;

      /* a faint line from the figure to the reticle: the shot goes this way */
      const px = p ? VG.worldToScreen(p.x, p.y).x : 0;
      const py = p ? VG.worldToScreen(p.x, p.y).y : 0;
      ctx.strokeStyle = 'rgba(232,179,74,.13)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(mx, my);
      ctx.stroke();

      /* the melee arc is drawn where it lands */
      if (state.swing) {
        const sw = state.swing;
        const sxp = sw.x - cam.x, syp = sw.y - cam.y;
        const a = 0.22 * Math.max(0, Math.min(1, sw.life / 0.22));
        ctx.strokeStyle = 'rgba(20,17,12,' + (0.4 * a).toFixed(3) + ')';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(sxp, syp, sw.r * 0.85, sw.ang - 1.1, sw.ang + 1.1);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(232,179,74,' + (0.6 * a).toFixed(3) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sxp, syp, sw.r * 0.85, sw.ang - 1.1, sw.ang + 1.1);
        ctx.stroke();
      }

      /* The reticle carries a dark edge under the amber. Without it the
         reticle vanished against pale ground, and it vanished again on a
         body that had just flared white - and a reticle you cannot see is
         the same as no reticle at all. */
      const gap = ranged ? 6 : 4;
      const len = 7;
      function ticks() {
        ctx.beginPath();
        ctx.moveTo(mx - gap - len, my); ctx.lineTo(mx - gap, my);
        ctx.moveTo(mx + gap, my); ctx.lineTo(mx + gap + len, my);
        ctx.moveTo(mx, my - gap - len); ctx.lineTo(mx, my - gap);
        ctx.moveTo(mx, my + gap); ctx.lineTo(mx, my + gap + len);
      }
      ctx.strokeStyle = 'rgba(20,17,12,.5)';
      ctx.lineWidth = 3.4;
      ticks();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(232,179,74,.95)';
      ctx.lineWidth = 1.4;
      ticks();
      ctx.stroke();
      ctx.fillStyle = 'rgba(20,17,12,.5)';
      ctx.fillRect(mx - 2, my - 2, 4, 4);
      ctx.fillStyle = 'rgba(232,179,74,.95)';
      ctx.fillRect(mx - 1, my - 1, 2, 2);
    }

    /* --- where the rounds landed --- */
    /* The mark and the number are the same colour family as the flare on a
       struck body, so both carry a dark edge. A cream number on a white-hot
       target is invisible, and a hit you cannot read is not feedback. */
    const hits = state.hits || [];
    for (let i = 0; i < hits.length; i++) {
      const h = hits[i];
      const hx = h.x - cam.x, hy = h.y - cam.y;
      const a = Math.max(0, Math.min(1, h.life / 0.75));
      ctx.strokeStyle = 'rgba(22,18,13,' + (0.5 * a).toFixed(3) + ')';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(hx - 4, hy - 4); ctx.lineTo(hx + 4, hy + 4);
      ctx.moveTo(hx + 4, hy - 4); ctx.lineTo(hx - 4, hy + 4);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,226,160,' + (0.9 * a).toFixed(3) + ')';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(hx - 4, hy - 4); ctx.lineTo(hx + 4, hy + 4);
      ctx.moveTo(hx + 4, hy - 4); ctx.lineTo(hx - 4, hy + 4);
      ctx.stroke();
      if (h.dmg) {
        /* the number is outlined, not just shadowed: it lands on the body of
           whatever was struck, and that body may be flaring white */
        const txt = String(Math.round(h.dmg));
        ctx.font = '10px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(18,15,11,' + (0.9 * a).toFixed(3) + ')';
        ctx.strokeText(txt, hx, hy - 13);
        ctx.fillStyle = 'rgba(255,240,206,' + (0.98 * a).toFixed(3) + ')';
        ctx.fillText(txt, hx, hy - 13);
        ctx.textAlign = 'left';
      }
    }
  };
})(window.VG);
