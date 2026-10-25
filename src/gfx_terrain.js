/* VERDIGRIS — terrain */
window.VG = window.VG || {};
window.VG.GFX = window.VG.GFX || {};
(function (GFX, VG) {
  'use strict';

  /* ------------------------------------------------------------------
     2.3  Biome palette — explicit low/high pairs, >= 22% luminance apart.
     These REPLACE the old ground/ground2 mix. Index order matches VG.BIOME:
       0 salt  1 dune  2 scrub  3 town  4 indus  5 refinery  6 water  7 ruin
     ------------------------------------------------------------------ */
  const PALETTE = [
    ['#a49b87', '#d8d2c0'],   // 0 salt     — bone crust, shaded / sunlit
    ['#b79c6c', '#e2cda0'],   // 1 dune     — sand, shaded / crest
    ['#4e4b32', '#7d7749'],   // 2 scrub    — dead olive
    ['#6d6a61', '#a09c92'],   // 3 town     — concrete
    ['#463f36', '#75685a'],   // 4 indus    — hardpack
    ['#3a453f', '#6d8a7c'],   // 5 refinery — oxidised pad
    ['#54666c', '#9db3b6'],   // 6 water    — mineral blue
    ['#4b4239', '#867a6b']    // 7 ruin     — burnt umber
  ];

  const ASPHALT = '#413d35';  // worn asphalt
  const GRAVEL = '#6f6656';   // gravel shoulder
  const PALE = '#cdc6b2';    // dry, high ground (1.1 palette anchor)
  const DAMP = '#4c4739';    // damp hollow

  function parseHex(h) {
    const n = parseInt(h.substring(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  const LOW = PALETTE.map(function (p) { return parseHex(p[0]); });
  const HIGH = PALETTE.map(function (p) { return parseHex(p[1]); });
  const C_ASPHALT = parseHex(ASPHALT);
  const C_GRAVEL = parseHex(GRAVEL);
  const C_PALE = parseHex(PALE);
  const C_DAMP = parseHex(DAMP);

  const HEX = [];
  for (let i = 0; i < 256; i++) HEX[i] = (i < 16 ? '0' : '') + i.toString(16);

  /* biome indices */
  const B_SALT = 0, B_DUNE = 1, B_SCRUB = 2, B_TOWN = 3;
  const B_INDUS = 4, B_REFINERY = 5, B_WATER = 6, B_RUIN = 7;

  /* blend across biome borders: 4-neighbourhood + diagonals, inverse distance */
  const BLEND = 0.68;
  const NEIGH = [
    [-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1],
    [-1, -1, 0.7071], [1, -1, 0.7071], [-1, 1, 0.7071], [1, 1, 0.7071]
  ];

  /* hillshade range */
  const SHADE_MIN = 0.80, SHADE_MAX = 1.22;
  const SHADE_SPAN = 0.21;

  /* where each biome sits inside its own low/high pair.
     A salt flat is sun bleached, a refinery yard is not. */
  const BIAS = [0.60, 0.54, 0.40, 0.46, 0.38, 0.36, 0.48, 0.42];

  /* radius (tiles) of the local relief baseline */
  const RELIEF_R = 10;

  /* module state */
  GFX._cache = null;      // Uint32Array of packed RGBA tile colours
  GFX._cacheSeed = -1;
  let cssTab = null;      // parallel css colour strings (keeps the hot loop string-free)
  let grainTile = null;   // pre-rendered 128x128 grain canvas
  let grainPat = null;
  let grainCtx = null;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function clamp11(v) { return v < -1 ? -1 : v > 1 ? 1 : v; }

  function elevAt(elev, W, H, x, y) {
    if (x < 0) x = 0; else if (x >= W) x = W - 1;
    if (y < 0) y = 0; else if (y >= H) y = H - 1;
    return elev[y * W + x];
  }

  function biomeAt(world, x, y) {
    const W = world.W, H = world.H;
    if (x < 0 || y < 0 || x >= W || y >= H) return -1;
    return world.biome[y * W + x];
  }

  /* ==================================================================
     terrain cache
     ================================================================== */
  function buildCache(world) {
    const W = world.W, H = world.H, N = W * H;
    const biome = world.biome, elev = world.elev, road = world.road;
    const seed = world.seed;

    /* --- smooth the elevation before shading it ---
       world.elev is a 5-octave fbm whose highest octave has a wavelength of
       about 2.6 tiles. Shading that raw makes the slope flicker from tile to
       tile, and the high-pass relief flips sign between neighbouring tiles —
       together they produced hard-edged blocks in the middle of what is
       actually a smooth landscape. Smooth once, then shade the smooth field. */
    const elevS = boxBlur(elev, W, H, 3);

    /* --- gradient rms, so the hillshade gain is seed independent ---
       litRaw is positive where the surface turns toward the north-west
       light: east gradient + south gradient, averaged over 2 tiles. */
    let gs = 0, gn = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dE = elevAt(elevS, W, H, x + 1, y) - elevAt(elevS, W, H, x - 1, y);
        const dS = elevAt(elevS, W, H, x, y + 1) - elevAt(elevS, W, H, x, y - 1);
        const lit = (dE + dS) * 0.5;
        gs += lit * lit; gn++;
      }
    }
    const rms = Math.sqrt(gs / gn) || 1e-6;
    const slopeGain = SHADE_SPAN / (2.2 * rms);

    /* --- tone statistics for the soft intra-biome variation --- */
    let tsum = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) tsum += VG.fbm(x / 11, y / 11, seed + 733, 2, 2.05, 0.5);
    }
    const tmean = tsum / N;
    let tvs = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const d = VG.fbm(x / 11, y / 11, seed + 733, 2, 2.05, 0.5) - tmean;
        tvs += d * d;
      }
    }
    const tsd = Math.sqrt(tvs / N) || 1e-6;

    /* --- local relief: elevation minus a blurred baseline.
       Positive = a ridge or rise, negative = a hollow. This is what lets
       hollows collect shadow inside every biome, not only the low ones. */
    const base = boxBlur(elevS, W, H, RELIEF_R);
    const relief = new Float32Array(N);
    let rsum = 0;
    for (let i = 0; i < N; i++) { const d = elevS[i] - base[i]; relief[i] = d; rsum += d; }
    const rmean = rsum / N;
    let rvs = 0;
    for (let i = 0; i < N; i++) { const d = relief[i] - rmean; rvs += d * d; }
    const rsd = Math.sqrt(rvs / N) || 1e-6;

    /* --- per tile tone and palette base colour --- */
    const tone = new Float32Array(N);
    const br = new Float32Array(N), bg = new Float32Array(N), bb = new Float32Array(N);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const rel = clamp11(relief[i] / (2.2 * rsd));
        const vr = VG.fbm(x / 11, y / 11, seed + 733, 2, 2.05, 0.5);
        const vari = clamp11((vr - tmean) / (2.4 * tsd));
        const b = biome[i] & 7;
        const t = clamp01(BIAS[b] + 0.24 * rel + 0.11 * vari);
        tone[i] = t;
        const lo = LOW[b], hi = HIGH[b];
        br[i] = lo[0] + (hi[0] - lo[0]) * t;
        bg[i] = lo[1] + (hi[1] - lo[1]) * t;
        bb[i] = lo[2] + (hi[2] - lo[2]) * t;
      }
    }

    /* --- blend, shade, pack --- */
    const out = new Uint32Array(N);
    const css = new Array(N);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;

        /* blend the ground colour with the neighbourhood */
        let ar = 0, ag = 0, ab = 0, aw = 0;
        for (let k = 0; k < 8; k++) {
          const nx = x + NEIGH[k][0], ny = y + NEIGH[k][1];
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny * W + nx, w = NEIGH[k][2];
          ar += br[j] * w; ag += bg[j] * w; ab += bb[j] * w; aw += w;
        }
        const inv = aw > 0 ? 1 / aw : 0;
        let cr = br[i] + (ar * inv - br[i]) * BLEND;
        let cg = bg[i] + (ag * inv - bg[i]) * BLEND;
        let cb = bb[i] + (ab * inv - bb[i]) * BLEND;

        /* hillshade: slopes facing the north-west light brighten */
        const dE = elevAt(elevS, W, H, x + 1, y) - elevAt(elevS, W, H, x - 1, y);
        const dS = elevAt(elevS, W, H, x, y + 1) - elevAt(elevS, W, H, x, y - 1);
        let mult = 1 + (dE + dS) * 0.5 * slopeGain;
        if (mult < SHADE_MIN) mult = SHADE_MIN;
        else if (mult > SHADE_MAX) mult = SHADE_MAX;

        if (road[i]) {
          /* Interior road is asphalt; an edge road is asphalt worn toward
             gravel. The gravel difference has to stay small: the diagonal
             connector quads are painted in one tile's colour and cover half
             of their neighbour, so a strong edge/centre difference showed up
             as dark chevrons marching along every diagonal road. */
          const n = (roadAt(road, W, H, x - 1, y) ? 1 : 0) + (roadAt(road, W, H, x + 1, y) ? 1 : 0) +
                    (roadAt(road, W, H, x, y - 1) ? 1 : 0) + (roadAt(road, W, H, x, y + 1) ? 1 : 0);
          const k = n >= 4 ? 0 : 0.18;
          cr = (C_ASPHALT[0] + (C_GRAVEL[0] - C_ASPHALT[0]) * k) * mult;
          cg = (C_ASPHALT[1] + (C_GRAVEL[1] - C_ASPHALT[1]) * k) * mult;
          cb = (C_ASPHALT[2] + (C_GRAVEL[2] - C_ASPHALT[2]) * k) * mult;
        } else {
          /* large scale albedo: ground above its local baseline is drier and
             paler, hollows below it are damper and darker */
          const rel = clamp11(relief[i] / (2.2 * rsd));
          if (rel > 0) {
            const t = rel * 0.15;
            cr += (C_PALE[0] - cr) * t;
            cg += (C_PALE[1] - cg) * t;
            cb += (C_PALE[2] - cb) * t;
          } else if (rel < 0) {
            const t = -rel * 0.18;
            cr += (C_DAMP[0] - cr) * t;
            cg += (C_DAMP[1] - cg) * t;
            cb += (C_DAMP[2] - cb) * t;
          }
          cr *= mult; cg *= mult; cb *= mult;
        }

        const r = cr < 0 ? 0 : cr > 255 ? 255 : (cr + 0.5) | 0;
        const g = cg < 0 ? 0 : cg > 255 ? 255 : (cg + 0.5) | 0;
        const b2 = cb < 0 ? 0 : cb > 255 ? 255 : (cb + 0.5) | 0;
        out[i] = ((255 << 24) | (b2 << 16) | (g << 8) | r) >>> 0;
        css[i] = '#' + HEX[r] + HEX[g] + HEX[b2];
      }
    }

    GFX._cache = out;
    GFX._cacheSeed = seed;
    cssTab = css;
  }

  function roadAt(road, W, H, x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return 0;
    return road[y * W + x];
  }

  /* separable box blur, edges clamped. Gives a local baseline so a hollow
     reads as a hollow whatever biome it sits in. */
  function boxBlur(src, W, H, r) {
    const tmp = new Float32Array(W * H);
    const out = new Float32Array(W * H);
    const inv = 1 / (2 * r + 1);
    for (let y = 0; y < H; y++) {
      const row = y * W;
      let sum = 0;
      for (let x = -r; x <= r; x++) {
        const xi = x < 0 ? 0 : x >= W ? W - 1 : x;
        sum += src[row + xi];
      }
      for (let x = 0; x < W; x++) {
        tmp[row + x] = sum * inv;
        const o = x - r < 0 ? 0 : x - r >= W ? W - 1 : x - r;
        const n = x + r + 1 >= W ? W - 1 : x + r + 1;
        sum += src[row + n] - src[row + o];
      }
    }
    for (let x = 0; x < W; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) {
        const yi = y < 0 ? 0 : y >= H ? H - 1 : y;
        sum += tmp[yi * W + x];
      }
      for (let y = 0; y < H; y++) {
        out[y * W + x] = sum * inv;
        const o = y - r < 0 ? 0 : y - r >= H ? H - 1 : y - r;
        const n = y + r + 1 >= H ? H - 1 : y + r + 1;
        sum += tmp[n * W + x] - tmp[o * W + x];
      }
    }
    return out;
  }

  /* ==================================================================
     public API
     ================================================================== */
  GFX.terrainCache = function (world) {
    if (!GFX._cache || GFX._cacheSeed !== world.seed ||
        GFX._cache.length !== world.W * world.H) {
      buildCache(world);
    }
    return GFX._cache;
  };

  GFX.groundColor = function (world, tx, ty) {
    const c = GFX.terrainCache(world);
    const W = world.W, H = world.H;
    let x = tx | 0, y = ty | 0;
    if (!(x >= 0)) x = 0; else if (x >= W) x = W - 1;
    if (!(y >= 0)) y = 0; else if (y >= H) y = H - 1;
    const v = c[y * W + x];
    return '#' + HEX[v & 255] + HEX[(v >> 8) & 255] + HEX[(v >> 16) & 255];
  };

  GFX.paintTerrain = function (ctx, cam, world) {
    const W = world.W, H = world.H;
    const T = VG.TILE || 32;
    const camX = cam.x, camY = cam.y;
    GFX.terrainCache(world);

    /* viewport size, in the same units as cam (world pixels) */
    let scale = 1;
    if (ctx.getTransform) {
      const tr = ctx.getTransform();
      if (tr && tr.a) scale = tr.a;
    }
    const cw = ctx.canvas ? ctx.canvas.width : 1280;
    const ch = ctx.canvas ? ctx.canvas.height : 720;
    const vw = cw / scale, vh = ch / scale;

    const t0x = Math.max(0, Math.floor(camX / T) - 1);
    const t0y = Math.max(0, Math.floor(camY / T) - 1);
    const t1x = Math.min(W - 1, Math.floor((camX + vw) / T) + 1);
    const t1y = Math.min(H - 1, Math.floor((camY + vh) / T) + 1);

    /* snap the tile grid to the device pixel grid, so adjacent tiles
       never leave an antialiased seam between them */
    const ox = Math.round((t0x * T - camX) * scale) / scale;
    const oy = Math.round((t0y * T - camY) * scale) / scale;

    ctx.save();
    for (let ty = t0y; ty <= t1y; ty++) {
      const sy = oy + (ty - t0y) * T;
      const row = ty * W;
      for (let tx = t0x; tx <= t1x; tx++) {
        ctx.fillStyle = cssTab[row + tx];
        ctx.fillRect(ox + (tx - t0x) * T, sy, T, T);
      }
    }
    ctx.restore();

    paintRoadJunctions(ctx, world, t0x, t0y, t1x, t1y, ox, oy, T);
    paintDetail(ctx, world, t0x, t0y, t1x, t1y, ox, oy, T);
    paintGrain(ctx, camX, camY, vw, vh);
  };

  /* ---------- road diagonals ----------
     A road carved on the tile grid is a staircase. At 32px tiles a diagonal
     highway reads as a run of separate squares rather than a road, which is
     the single most obviously wrong thing in the frame. So for every pair of
     diagonally adjacent road tiles that genuinely continue the same run, fill
     the quad between their centres. Unioned with the tile squares that turns
     a staircase into a smooth band of constant width. */
  const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  function paintRoadJunctions(ctx, world, t0x, t0y, t1x, t1y, ox, oy, T) {
    const road = world.road;
    const W = world.W, H = world.H;
    const half = T * 0.5;
    for (let ty = t0y; ty <= t1y; ty++) {
      for (let tx = t0x; tx <= t1x; tx++) {
        const i = ty * W + tx;
        if (!road[i]) continue;
        const cx = ox + (tx - t0x) * T + half;
        const cy = oy + (ty - t0y) * T + half;
        for (let k = 0; k < 4; k++) {
          const nx = tx + DIAG[k][0], ny = ty + DIAG[k][1];
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          if (!road[ny * W + nx]) continue;
          /* Connect every diagonal road pair. A pure 45-degree run has no
             orthogonal road neighbour at all, so any "is this really the same
             street" test rejects exactly the case that most needs smoothing. */
          const dx = DIAG[k][0] * T, dy = DIAG[k][1] * T;
          const len = Math.sqrt(dx * dx + dy * dy);
          const ux = dx / len, uy = dy / len;
          const px = -uy * half, py = ux * half;
          ctx.fillStyle = cssTab[i];
          ctx.beginPath();
          ctx.moveTo(cx + px, cy + py);
          ctx.lineTo(cx + dx + px, cy + dy + py);
          ctx.lineTo(cx + dx - px, cy + dy - py);
          ctx.lineTo(cx - px, cy - py);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  /* ==================================================================
     2.4  grain — one pre-rendered 128x128 tile, slid with the camera
     ================================================================== */
  function makeGrain() {
    if (grainTile) return grainTile;
    if (typeof document === 'undefined' || !document.createElement) return null;
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    if (!g) return null;
    const img = g.createImageData(128, 128);
    const d = img.data;
    const rng = VG.makeRng ? VG.makeRng(0x5EED17) : Math.random;
    for (let i = 0, o = 0; i < 128 * 128; i++, o += 4) {
      const v = 30 + Math.floor(rng() * 196);
      const a = rng() < 0.15 ? 0 : 110 + Math.floor(rng() * 146);
      d[o] = v; d[o + 1] = v; d[o + 2] = v; d[o + 3] = a;
    }
    g.putImageData(img, 0, 0);
    grainTile = c;
    return c;
  }

  function grainPattern(ctx) {
    const tile = makeGrain();
    if (!tile) return null;
    if (grainPat && grainCtx === ctx) return grainPat;
    grainCtx = ctx;
    grainPat = ctx.createPattern(tile, 'repeat');
    return grainPat;
  }

  function paintGrain(ctx, camX, camY, vw, vh) {
    const pat = grainPattern(ctx);
    if (!pat) return;
    const gx = -(((camX % 128) + 128) % 128);
    const gy = -(((camY % 128) + 128) % 128);
    ctx.save();
    ctx.globalAlpha = 0.11;
    ctx.globalCompositeOperation = 'overlay';
    ctx.translate(gx, gy);
    ctx.fillStyle = pat;
    ctx.fillRect(-gx, -gy, vw + 128, vh + 128);
    ctx.restore();
  }

  /* ==================================================================
     2.7  per biome surface detail
     ================================================================== */

  /* fallback path sink: draws straight into the context, one mark at a time */
  function ImmediatePath(ctx) { this.ctx = ctx; }
  ImmediatePath.prototype.moveTo = function (x, y) { this.ctx.moveTo(x, y); };
  ImmediatePath.prototype.lineTo = function (x, y) { this.ctx.lineTo(x, y); };
  ImmediatePath.prototype.quadraticCurveTo = function (a, b, c, d) { this.ctx.quadraticCurveTo(a, b, c, d); };
  ImmediatePath.prototype.closePath = function () { this.ctx.closePath(); };

  const HAS_P2D = typeof Path2D !== 'undefined';

  /* shared: irregular blob outline */
  function blobPath(p, cx, cy, rad, tx, ty, seed) {
    const n = 6;
    p.moveTo(cx + rad, cy);
    for (let i = 1; i <= n; i++) {
      const a = (i / n) * VG.TAU;
      const r = rad * (0.62 + VG.hash2(tx * 13 + i, ty * 7, seed) * 0.62);
      p.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    p.closePath();
  }

  /* 0 salt — polygonal crust cracks. The crack crossings live on the shared
     tile edge, so neighbouring tiles join into one continuous crack. */
  function saltCrack(p, sx, sy, tx, ty, seed) {
    const K = seed + 1201;
    const hasE = VG.hash2(tx, ty, K) > 0.58;
    const hasW = VG.hash2(tx - 1, ty, K) > 0.58;
    if (!hasE && !hasW) return false;
    const yE = 5 + VG.hash2(tx, ty, K + 1) * 22;
    const yW = 5 + VG.hash2(tx - 1, ty, K + 1) * 22;
    const j = (VG.hash2(tx, ty, K + 2) - 0.5) * 9;
    if (hasW && hasE) {
      p.moveTo(sx, sy + yW);
      p.lineTo(sx + 11, sy + (yW + yE) * 0.5 + j);
      p.lineTo(sx + 21, sy + (yW + yE) * 0.5 - j * 0.6);
      p.lineTo(sx + 32, sy + yE);
    } else if (hasW) {
      p.moveTo(sx, sy + yW);
      p.lineTo(sx + 10, sy + yW + j);
      p.lineTo(sx + 19, sy + yW + j * 0.3);
    } else {
      p.moveTo(sx + 32, sy + yE);
      p.lineTo(sx + 22, sy + yE + j);
      p.lineTo(sx + 13, sy + yE + j * 0.3);
    }
    return true;
  }

  function saltRim(p, sx, sy, tx, ty, seed) {
    const K = seed + 1201;
    if (VG.hash2(tx, ty, K + 3) < 0.72) return false;
    const y = 6 + VG.hash2(tx, ty, K + 4) * 20;
    const x0 = 4 + VG.hash2(tx, ty, K + 5) * 14;
    const len = 6 + VG.hash2(tx, ty, K + 6) * 12;
    p.moveTo(sx + x0, sy + y);
    p.lineTo(sx + x0 + len * 0.5, sy + y + 1.6);
    p.lineTo(sx + x0 + len, sy + y);
    return true;
  }

  /* 1 dune — wind ripple arcs running north-east to south-west */
  function duneGeom(p, sx, sy, tx, ty, seed, perp) {
    const K = seed + 1307;
    const off = (VG.hash2(tx, ty, K + 2) - 0.5) * 26;
    const n = 1 + Math.floor(VG.hash2(tx, ty, K + 1) * 2);
    for (let i = 0; i < n; i++) {
      const u = off + i * 9 + perp;
      const cx = sx + 16 + u * 0.7071;
      const cy = sy + 16 + u * 0.7071;
      const w = (VG.hash2(tx, ty, K + 3 + i) - 0.5) * 3.4;
      p.moveTo(cx + 7.1, cy - 7.1);
      p.quadraticCurveTo(cx + w * 0.7071, cy + w * 0.7071, cx - 7.1, cy + 7.1);
    }
  }

  function duneRipple(p, sx, sy, tx, ty, seed) {
    if (VG.hash2(tx, ty, seed + 1307) < 0.26) return false;
    duneGeom(p, sx, sy, tx, ty, seed, 0);
    return true;
  }

  function duneCrest(p, sx, sy, tx, ty, seed) {
    if (VG.hash2(tx, ty, seed + 1307) < 0.26) return false;
    if (VG.hash2(tx, ty, seed + 1318) < 0.55) return false;
    duneGeom(p, sx, sy, tx, ty, seed, 2.2);
    return true;
  }

  /* 2 scrub — bare dirt patches and dry tufts */
  function scrubDirt(p, sx, sy, tx, ty, seed) {
    const K = seed + 1409;
    if (VG.hash2(tx, ty, K) < 0.50) return false;
    const cx = sx + 4 + VG.hash2(tx, ty, K + 1) * 24;
    const cy = sy + 4 + VG.hash2(tx, ty, K + 2) * 24;
    const rad = 3.5 + VG.hash2(tx, ty, K + 3) * 5;
    blobPath(p, cx, cy, rad, tx, ty, K + 4);
    return true;
  }

  function scrubTuft(p, sx, sy, tx, ty, seed) {
    const K = seed + 1409;
    if (VG.hash2(tx, ty, K + 5) < 0.60) return false;
    const bx = sx + 5 + VG.hash2(tx, ty, K + 6) * 22;
    const by = sy + 20 + VG.hash2(tx, ty, K + 7) * 8;
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.42 + (VG.hash2(tx, ty, K + 8 + i) - 0.5) * 0.3;
      const len = 3 + VG.hash2(tx, ty, K + 11 + i) * 4;
      p.moveTo(bx, by);
      p.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len);
    }
    return true;
  }

  /* 3 town — paving slab seams and kerb lines */
  function townSeam(p, sx, sy, tx, ty, seed) {
    const wx = tx * 32, wy = ty * 32;
    const row = Math.floor(wy / 16);
    const f = wy - row * 16;
    const j1 = 16 - f, j2 = j1 + 16;
    p.moveTo(sx, sy + j1); p.lineTo(sx + 32, sy + j1);
    p.moveTo(sx, sy + j2); p.lineTo(sx + 32, sy + j2);
    vertSeams(p, sx, sy, wx, row, seed, 0, j1);
    vertSeams(p, sx, sy, wx, row + 1, seed, j1, j2);
  }

  function vertSeams(p, sx, sy, wx, row, seed, y0, y1) {
    const off = VG.hash2(row, 17, seed + 1501) * 32;
    const k0 = Math.ceil((wx - off) / 32);
    for (let k = k0; k * 32 + off < wx + 32; k++) {
      const vx = k * 32 + off - wx;
      p.moveTo(sx + vx, sy + y0);
      p.lineTo(sx + vx, sy + y1);
    }
  }

  function townKerb(p, sx, sy, tx, ty, seed, world) {
    let drew = false;
    if (biomeAt(world, tx - 1, ty) !== B_TOWN) { p.moveTo(sx, sy); p.lineTo(sx, sy + 32); drew = true; }
    if (biomeAt(world, tx + 1, ty) !== B_TOWN) { p.moveTo(sx + 32, sy); p.lineTo(sx + 32, sy + 32); drew = true; }
    if (biomeAt(world, tx, ty - 1) !== B_TOWN) { p.moveTo(sx, sy); p.lineTo(sx + 32, sy); drew = true; }
    if (biomeAt(world, tx, ty + 1) !== B_TOWN) { p.moveTo(sx, sy + 32); p.lineTo(sx + 32, sy + 32); drew = true; }
    return drew;
  }

  /* 4 indus — oil staining and rust dust */
  function indusOil(p, sx, sy, tx, ty, seed) {
    const K = seed + 1607;
    if (VG.hash2(tx, ty, K) < 0.52) return false;
    const cx = sx + 5 + VG.hash2(tx, ty, K + 1) * 22;
    const cy = sy + 5 + VG.hash2(tx, ty, K + 2) * 22;
    const rad = 5 + VG.hash2(tx, ty, K + 3) * 8;
    blobPath(p, cx, cy, rad, tx, ty, K + 4);
    return true;
  }

  function indusRust(p, sx, sy, tx, ty, seed) {
    const K = seed + 1607;
    if (VG.hash2(tx, ty, K + 5) < 0.58) return false;
    const cx = sx + 5 + VG.hash2(tx, ty, K + 6) * 22;
    const cy = sy + 5 + VG.hash2(tx, ty, K + 7) * 22;
    const rad = 4 + VG.hash2(tx, ty, K + 8) * 7;
    blobPath(p, cx, cy, rad, tx, ty, K + 9);
    return true;
  }

  /* 5 refinery — verdigris staining and pale alkali crust at the pad edges */
  function refVerdigris(p, sx, sy, tx, ty, seed) {
    const K = seed + 1801;
    if (VG.hash2(tx, ty, K) < 0.54) return false;
    const cx = sx + 5 + VG.hash2(tx, ty, K + 1) * 22;
    const cy = sy + 5 + VG.hash2(tx, ty, K + 2) * 22;
    const rad = 4 + VG.hash2(tx, ty, K + 3) * 7;
    blobPath(p, cx, cy, rad, tx, ty, K + 4);
    return true;
  }

  function refAlkali(p, sx, sy, tx, ty, seed, world) {
    let drew = false;
    if (biomeAt(world, tx - 1, ty) !== B_REFINERY) { p.moveTo(sx, sy); p.lineTo(sx, sy + 32); drew = true; }
    if (biomeAt(world, tx + 1, ty) !== B_REFINERY) { p.moveTo(sx + 32, sy); p.lineTo(sx + 32, sy + 32); drew = true; }
    if (biomeAt(world, tx, ty - 1) !== B_REFINERY) { p.moveTo(sx, sy); p.lineTo(sx + 32, sy); drew = true; }
    if (biomeAt(world, tx, ty + 1) !== B_REFINERY) { p.moveTo(sx, sy + 32); p.lineTo(sx + 32, sy + 32); drew = true; }
    return drew;
  }

  /* 6 water — salt crust rings and cracked mud polygons */
  function watSaltRing(p, sx, sy, tx, ty, seed) {
    const K = seed + 1709;
    if (VG.hash2(tx, ty, K + 5) < 0.58) return false;
    const cx = sx + 7 + VG.hash2(tx, ty, K + 6) * 18;
    const cy = sy + 7 + VG.hash2(tx, ty, K + 7) * 18;
    const rx = 3 + VG.hash2(tx, ty, K + 8) * 5;
    const ry = rx * (0.45 + VG.hash2(tx, ty, K + 9) * 0.4);
    p.moveTo(cx + rx, cy);
    for (let i = 1; i <= 8; i++) {
      const a = (i / 8) * VG.TAU;
      p.lineTo(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
    }
    p.closePath();
    return true;
  }

  function watMudCrack(p, sx, sy, tx, ty, seed) {
    const K = seed + 1709;
    if (VG.hash2(tx, ty, K) < 0.55) return false;
    const cx = sx + 6 + VG.hash2(tx, ty, K + 1) * 20;
    const cy = sy + 6 + VG.hash2(tx, ty, K + 2) * 20;
    const rad = 4 + VG.hash2(tx, ty, K + 3) * 7;
    p.moveTo(cx + rad, cy);
    for (let i = 1; i <= 5; i++) {
      const a = (i / 5) * VG.TAU;
      const r = rad * (0.6 + VG.hash2(tx * 11 + i, ty * 5, K + 4) * 0.7);
      p.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    p.closePath();
    return true;
  }

  /* 7 ruin — ash patches and scorch */
  function ruinAsh(p, sx, sy, tx, ty, seed) {
    const K = seed + 1901;
    if (VG.hash2(tx, ty, K) < 0.55) return false;
    const cx = sx + 5 + VG.hash2(tx, ty, K + 1) * 22;
    const cy = sy + 5 + VG.hash2(tx, ty, K + 2) * 22;
    const rad = 4 + VG.hash2(tx, ty, K + 3) * 8;
    blobPath(p, cx, cy, rad, tx, ty, K + 4);
    return true;
  }

  function ruinScorch(p, sx, sy, tx, ty, seed) {
    const K = seed + 1901;
    if (VG.hash2(tx, ty, K + 5) < 0.50) return false;
    const cx = sx + 5 + VG.hash2(tx, ty, K + 6) * 22;
    const cy = sy + 5 + VG.hash2(tx, ty, K + 7) * 22;
    const rad = 5 + VG.hash2(tx, ty, K + 8) * 9;
    blobPath(p, cx, cy, rad, tx, ty, K + 9);
    return true;
  }

  /* style table: one path per style, stroked or filled in a single pass */
  const STYLES = [
    { bi: B_SALT, op: 'stroke', col: 'rgba(238,236,222,0.20)', lw: 1, fn: saltCrack },
    { bi: B_SALT, op: 'stroke', col: 'rgba(255,252,240,0.13)', lw: 1.6, fn: saltRim },
    { bi: B_DUNE, op: 'stroke', col: 'rgba(56,40,22,0.15)', lw: 1.2, fn: duneRipple },
    { bi: B_DUNE, op: 'stroke', col: 'rgba(255,246,218,0.15)', lw: 1, fn: duneCrest },
    { bi: B_SCRUB, op: 'fill', col: 'rgba(40,34,22,0.20)', lw: 1, fn: scrubDirt },
    { bi: B_SCRUB, op: 'stroke', col: 'rgba(150,145,95,0.30)', lw: 1, fn: scrubTuft },
    { bi: B_TOWN, op: 'stroke', col: 'rgba(24,22,18,0.22)', lw: 1, fn: townSeam },
    { bi: B_TOWN, op: 'stroke', col: 'rgba(208,204,192,0.20)', lw: 1.4, fn: townKerb },
    { bi: B_INDUS, op: 'fill', col: 'rgba(14,12,10,0.24)', lw: 1, fn: indusOil },
    { bi: B_INDUS, op: 'fill', col: 'rgba(138,79,42,0.13)', lw: 1, fn: indusRust },
    { bi: B_REFINERY, op: 'fill', col: 'rgba(93,138,120,0.20)', lw: 1, fn: refVerdigris },
    { bi: B_REFINERY, op: 'stroke', col: 'rgba(216,216,200,0.16)', lw: 1.4, fn: refAlkali },
    { bi: B_WATER, op: 'stroke', col: 'rgba(226,232,226,0.20)', lw: 1.1, fn: watSaltRing },
    { bi: B_WATER, op: 'stroke', col: 'rgba(26,36,40,0.22)', lw: 1, fn: watMudCrack },
    { bi: B_RUIN, op: 'fill', col: 'rgba(152,146,136,0.16)', lw: 1, fn: ruinAsh },
    { bi: B_RUIN, op: 'fill', col: 'rgba(12,10,9,0.26)', lw: 1, fn: ruinScorch }
  ];

  const BY_BIOME = [];
  for (let i = 0; i < 8; i++) BY_BIOME[i] = [];
  for (let i = 0; i < STYLES.length; i++) BY_BIOME[STYLES[i].bi].push(i);

  function paintDetail(ctx, world, t0x, t0y, t1x, t1y, ox, oy, T) {
    const W = world.W, biome = world.biome, road = world.road, seed = world.seed;
    const batch = HAS_P2D;
    let paths = null, used = null;
    if (batch) {
      paths = new Array(STYLES.length);
      used = new Array(STYLES.length);
      for (let i = 0; i < STYLES.length; i++) { paths[i] = new Path2D(); used[i] = 0; }
    }

    ctx.save();
    for (let ty = t0y; ty <= t1y; ty++) {
      const sy = oy + (ty - t0y) * T;
      const row = ty * W;
      for (let tx = t0x; tx <= t1x; tx++) {
        const i = row + tx;
        if (road[i]) continue;
        const list = BY_BIOME[biome[i] & 7];
        if (!list.length) continue;
        const sx = ox + (tx - t0x) * T;
        for (let k = 0; k < list.length; k++) {
          const s = list[k];
          const st = STYLES[s];
          if (batch) {
            if (st.fn(paths[s], sx, sy, tx, ty, seed, world)) used[s] = 1;
          } else {
            ctx.beginPath();
            ctx.strokeStyle = st.col;
            ctx.fillStyle = st.col;
            ctx.lineWidth = st.lw;
            const p = new ImmediatePath(ctx);
            if (st.fn(p, sx, sy, tx, ty, seed, world)) {
              if (st.op === 'stroke') ctx.stroke(); else ctx.fill();
            }
          }
        }
      }
    }

    if (batch) {
      for (let s = 0; s < STYLES.length; s++) {
        if (!used[s]) continue;
        const st = STYLES[s];
        ctx.strokeStyle = st.col;
        ctx.fillStyle = st.col;
        ctx.lineWidth = st.lw;
        if (st.op === 'stroke') ctx.stroke(paths[s]); else ctx.fill(paths[s]);
      }
    }
    ctx.restore();
  }
})(window.VG.GFX, window.VG);
