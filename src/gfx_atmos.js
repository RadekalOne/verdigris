/* VERDIGRIS — atmosphere: lighting, weather, dust, colour grade */
window.VG = window.VG || {};
window.VG.GFX = window.VG.GFX || {};
(function (GFX, VG) {
  'use strict';

  /* ---------- shared state ---------- */
  let lightCv = null, lightCtx = null;
  let lw = 0, lh = 0, lscale = 1;

  let grainTiles = null, grainIdx = 0;
  let motes = null, moteSeed = -1;

  /* ---------- viewport helper ---------- */
  /* the main canvas carries a dpr transform; everything in here works in CSS
     pixels, so the scale has to be read back rather than assumed */
  function viewport(ctx) {
    let scale = 1;
    if (ctx.getTransform) {
      const m = ctx.getTransform();
      if (m && m.a) scale = m.a;
    }
    const cv = ctx.canvas || { width: 1280, height: 720 };
    const w = Math.max(1, Math.round(cv.width / scale));
    const h = Math.max(1, Math.round(cv.height / scale));
    return { w: w, h: h, scale: scale };
  }

  function ensureLight(ctx) {
    const vp = viewport(ctx);
    if (!lightCv || lw !== vp.w || lh !== vp.h) {
      lw = vp.w; lh = vp.h; lscale = vp.scale;
      lightCv = document.createElement('canvas');
      lightCv.width = Math.max(1, Math.floor(lw * lscale));
      lightCv.height = Math.max(1, Math.floor(lh * lscale));
      lightCtx = lightCv.getContext('2d');
      lightCtx.setTransform(lscale, 0, 0, lscale, 0, 0);
    }
    return vp;
  }

  /* ---------- day / night ---------- */
  /* one source of truth for both the darkness wash and the colour grade */
  GFX.daylight = function (time) {
    /* the clock lives in core.js — one source of truth for the whole game */
    const hour = VG.hourOfDay(time);
    let phase = 'day', amount = 0.05, tint = '8,13,24';
    if (hour >= 4.4 && hour < 6.6) {
      phase = 'dawn';
      amount = VG.lerp(0.66, 0.16, (hour - 4.4) / 2.2);
      tint = '54,34,20';
    } else if (hour >= 6.6 && hour < 17.4) {
      phase = 'day';
      const edge = Math.min(hour - 6.6, 17.4 - hour);
      amount = VG.clamp(0.20 - edge * 0.15, 0.02, 0.20);
      tint = '8,13,24';
    } else if (hour >= 17.4 && hour < 20.2) {
      phase = 'dusk';
      amount = VG.lerp(0.14, 0.68, (hour - 17.4) / 2.8);
      tint = '58,26,14';
    } else {
      phase = 'night';
      amount = 0.62;
      tint = '8,14,30';
    }
    return { amount: amount, tint: tint, hour: hour, phase: phase };
  };

  /* ---------- lighting ---------- */
  GFX.paintLighting = function (ctx, cam, p, state, world, lights) {
    const vp = ensureLight(ctx);
    const dl = GFX.daylight(state.time);
    const w = VG.weather || { kind: 'clear', haze: false };

    let amount = dl.amount;
    if (w.kind === 'haze') amount += 0.08;
    else if (w.kind === 'dust') amount += 0.10;
    else if (w.kind === 'rain') amount += 0.14;
    else if (w.kind === 'wind') amount += 0.03;
    amount = VG.clamp(amount, 0, 0.86);
    if (amount < 0.015) return;

    const g = lightCtx;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, vp.w, vp.h);
    g.fillStyle = 'rgba(' + dl.tint + ',' + amount.toFixed(3) + ')';
    g.fillRect(0, 0, vp.w, vp.h);

    g.globalCompositeOperation = 'destination-out';

    /* the player's own light: a warm pool that flickers like a flame */
    const ps = p.x - cam.x, pt = p.y - cam.y;
    const flick = 1 + Math.sin(performance.now() / 90) * 0.035 + Math.sin(performance.now() / 37) * 0.02;
    /* a night-vision scope widens how far you can see into the dark */
    const scope = VG.playerScope ? VG.playerScope(p) : 0;
    const rad = (188 + (state.flare || 0) + scope) * flick;
    const tg = g.createRadialGradient(ps, pt, 8, ps, pt, rad);
    tg.addColorStop(0, 'rgba(0,0,0,.97)');
    tg.addColorStop(0.28, 'rgba(0,0,0,.80)');
    tg.addColorStop(0.62, 'rgba(0,0,0,.38)');
    tg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = tg;
    g.beginPath(); g.arc(ps, pt, rad, 0, VG.TAU); g.fill();

    /* every artificial light in the world: windows, lamps, fires, torches */
    if (lights && lights.length) {
      for (let i = 0; i < lights.length; i++) {
        const L = lights[i];
        if (!L) continue;
        const r = L.r || 80;
        const inten = VG.clamp(L.intensity == null ? 0.5 : L.intensity, 0, 1);
        if (inten <= 0.01) continue;
        const lg = g.createRadialGradient(L.x, L.y, 2, L.x, L.y, r);
        lg.addColorStop(0, 'rgba(0,0,0,' + (0.92 * inten).toFixed(3) + ')');
        lg.addColorStop(0.45, 'rgba(0,0,0,' + (0.52 * inten).toFixed(3) + ')');
        lg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = lg;
        g.beginPath(); g.arc(L.x, L.y, r, 0, VG.TAU); g.fill();
      }
    }

    g.globalCompositeOperation = 'source-over';
    ctx.drawImage(lightCv, 0, 0, vp.w, vp.h);
  };

  /* ---------- grain ---------- */
  function buildGrain() {
    if (grainTiles) return;
    grainTiles = [];
    for (let k = 0; k < 4; k++) {
      const c = document.createElement('canvas');
      c.width = 128; c.height = 128;
      const g = c.getContext('2d');
      const img = g.createImageData(128, 128);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = 118 + ((Math.random() * 74) | 0);
        d[i] = n; d[i + 1] = n; d[i + 2] = n;
        d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      grainTiles.push(c);
    }
  }

  /* ---------- airborne dust ---------- */
  function buildMotes(world) {
    const rng = VG.makeRng((world.seed ^ 0x51ed3a) >>> 0);
    motes = [];
    for (let i = 0; i < 130; i++) {
      motes.push({
        x: rng.range(-120, 1920), y: rng.range(-120, 1080),
        d: rng.range(0.18, 1),                       // depth: near motes are bigger
        sp: rng.range(0.4, 1.25),                    // drift speed multiplier
        ph: rng.range(0, VG.TAU),
        sw: rng.range(6, 22)                         // horizontal sway
      });
    }
    moteSeed = world.seed;
  }

  /* ---------- main atmosphere pass ---------- */
  GFX.paintAtmosphere = function (ctx, cam, p, state, world) {
    const vp = viewport(ctx);
    const w = vp.w, h = vp.h;
    const t = performance.now() / 1000;
    const we = VG.weather || { kind: 'clear', haze: false };
    const dl = GFX.daylight(state.time);

    ctx.save();

    /* ---- 1. airborne dust ---- */
    if (!motes || moteSeed !== world.seed) buildMotes(world);
    const wind = we.kind === 'dust' ? 190 : we.kind === 'wind' ? 120 : we.kind === 'haze' ? 46 : 16;
    const moteAlpha = we.kind === 'dust' ? 2.1 : we.kind === 'haze' ? 1.5 : we.kind === 'wind' ? 1.3 : 1;
    ctx.fillStyle = '#e6d9b8';
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      m.x += (wind * m.sp * 0.016);
      m.y += Math.sin(t * 0.7 + m.ph) * 0.35 + 3.2 * m.d;
      if (m.x > w + 140) { m.x = -140; m.y = Math.random() * h; }
      if (m.y > h + 60) { m.y = -60; m.x = Math.random() * w; }
      const a = (0.05 + 0.20 * m.d) * moteAlpha;
      if (a > 0.42) ctx.globalAlpha = 0.42; else ctx.globalAlpha = a;
      const r = 0.6 + m.d * 1.5;
      ctx.beginPath();
      ctx.arc(m.x + Math.sin(t * 1.1 + m.ph) * m.sw * 0.25, m.y, r, 0, VG.TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* ---- 2. colour grade ---- */
    let grade = null;
    if (dl.phase === 'night') grade = 'rgba(38,58,116,.16)';
    else if (dl.phase === 'dusk') grade = 'rgba(255,118,58,.17)';
    else if (dl.phase === 'dawn') grade = 'rgba(255,162,92,.14)';
    else grade = 'rgba(255,244,214,.05)';
    ctx.fillStyle = grade;
    ctx.fillRect(0, 0, w, h);

    /* ---- 3. weather ---- */
    if (we.kind === 'haze') {
      ctx.fillStyle = 'rgba(196,150,86,.13)';
      ctx.fillRect(0, 0, w, h);
      /* slow horizontal dust bands, wider and slower than the motes */
      ctx.fillStyle = 'rgba(214,172,110,.055)';
      for (let i = 0; i < 4; i++) {
        const bx = ((t * (14 + i * 5) + i * 620) % (w + 900)) - 450;
        const by = h * (0.18 + i * 0.21) + Math.sin(t * 0.2 + i) * 40;
        ctx.beginPath();
        ctx.ellipse(bx, by, 460, 46 + i * 9, 0, 0, VG.TAU);
        ctx.fill();
      }
    } else if (we.kind === 'wind') {
      ctx.fillStyle = 'rgba(190,180,150,.08)';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(226,214,178,.16)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 46; i++) {
        const y = ((i * 97 + t * 40) % (h + 60)) - 30;
        const len = 40 + ((i * 37) % 90);
        const x = ((t * 340 + i * 211) % (w + 300)) - 150;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y + 1.5); ctx.stroke();
      }
    } else if (we.kind === 'rain') {
      ctx.fillStyle = 'rgba(58,66,78,.22)';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(168,196,210,.30)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 130; i++) {
        const x = ((i * 97 + t * 240) % (w + 90)) - 45;
        const y = ((i * 53 + t * 780) % (h + 90)) - 45;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4, y + 15); ctx.stroke();
      }
    } else if (we.kind === 'dust') {
      /* A dust storm is a wall that sweeps across the map, not a uniform tint.
         A flat 34% ochre wash over the whole frame turned every biome into the
         same brown mud and undid the palette entirely. So: a light ambient
         veil everywhere, and the real weight of the storm carried by a
         moving front that you can watch coming. */
      ctx.fillStyle = 'rgba(198,148,78,.15)';
      ctx.fillRect(0, 0, w, h);
      const bandW = w * 1.15;
      const bx = ((t * 96) % (w + bandW * 2)) - bandW;
      const fg = ctx.createLinearGradient(bx - bandW * 0.5, 0, bx + bandW * 0.5, 0);
      fg.addColorStop(0, 'rgba(200,150,80,0)');
      fg.addColorStop(0.5, 'rgba(200,150,80,.34)');
      fg.addColorStop(1, 'rgba(200,150,80,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(bx - bandW * 0.5, 0, bandW, h);
      ctx.fillStyle = 'rgba(214,168,96,.10)';
      for (let i = 0; i < 6; i++) {
        const px2 = ((t * (52 + i * 11) + i * 520) % (w + 1200)) - 600;
        const py = h * (0.1 + i * 0.16) + Math.sin(t * 0.5 + i * 1.7) * 26;
        ctx.beginPath();
        ctx.ellipse(px2, py, 520 + i * 40, 70 + i * 12, 0, 0, VG.TAU);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(232,202,150,.22)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 70; i++) {
        const y = ((i * 83 + t * 30) % (h + 60)) - 30;
        const len = 90 + ((i * 53) % 160);
        const x = ((t * 620 + i * 331) % (w + 500)) - 250;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y + 2); ctx.stroke();
      }
    }

    /* ---- 4. vignette ---- */
    const vg = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.34,
                                        w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(8,7,10,.30)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    /* ---- 5. grain ---- */
    buildGrain();
    grainIdx = (grainIdx + 1) & 3;
    const pat = ctx.createPattern(grainTiles[grainIdx], 'repeat');
    if (pat) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.055;
      ctx.save();
      ctx.translate((grainIdx * 37) % 128, (grainIdx * 61) % 128);
      ctx.fillStyle = pat;
      ctx.fillRect(-128, -128, w + 256, h + 256);
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
  };
})(window.VG.GFX, window.VG);
