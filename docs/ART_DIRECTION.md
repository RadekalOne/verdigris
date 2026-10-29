# VERDIGRIS — Art Direction & Graphics Contract

**Status:** authoritative. Every graphics module MUST follow this document. If a rule here
and a habit differ, the rule here wins.

---

## 0. Why this document exists

The world generator already computes good data. The old renderer threw it away:

- `world.elev` (a smooth fbm elevation field, 288×288) was **never read by the renderer**.
- `VG.BIOME[i].acc` (an accent colour per biome) was **never read by the renderer**.
- Every biome's two ground colours (`ground`, `ground2`) differ by only ~8% brightness.
- The renderer mixed them **per tile with a random hash**, producing a full-screen
  checkerboard of indistinguishable browns. That is what "flat" looked like.
- Every one of the 30 POI types was drawn as the *same rounded rectangle* with a colour
  looked up in a hardcoded 30-entry table. Nothing had a silhouette.
- The player and every enemy was a circle. Every container was an 8×8 square.
- Lighting was one radial gradient plus a flat full-screen darkness wash.
- The "haze" weather painted a **36% opaque ochre wash over the entire frame**, which is
  what turned the grey town into brown mud.

The minimap looked good because it painted the same `ground` colours *without* the random
per-tile mix and *without* the ochre wash. The data was fine. The painter was the problem.

**The rule this document exists to enforce: never discard computed world data, and never
make two colours differ by less than the eye can separate at gameplay distance.**

---

## 1. Setting and mood

> *The flats at ten in the morning, under a sky gone the colour of an old coin.*

A decommissioned sodium power station in high desert country, forty-one years after the
town emptied. Sun-bleached, oxidised, quiet. Nothing is neon. Nothing is cheerful.
Everything is either bleached pale or rusted dark, and the *only* saturated colour in
the palette belongs to things that still work: a lit window, a signal lamp, an amber
evidence marker.

**Not** grimdark. **Not** cartoon. **Not** clean sci-fi. Reference feel: abandoned
high-desert industrial, oxidised copper, sun-bleached enamel, dust.

### 1.1 Palette anchors

| Role | Hex | Use |
|---|---|---|
| Ground — bone | `#cdc6b2` | salt flat crust |
| Ground — sand | `#d9c294` | dune crest |
| Ground — olive | `#6f6b47` | scrub |
| Ground — concrete | `#8d8a80` | town paving |
| Ground — rust | `#6a5c4e` | industrial hardpack |
| Ground — mineral | `#7d8f94` | dry lake |
| Ground — umber | `#6f6355` | wreck |
| Machine — verdigris | `#5d8a78` | oxidised copper, reactor surfaces |
| Machine — deep teal | `#2f4a4a` | deep shadowed metal |
| Machine — gunmetal | `#4a4f52` | structural steel |
| Machine — rust orange | `#8a4f2a` | corroded steel, streaks |
| Machine — enamel | `#9aa39c` | old painted metal, faded |
| Accent — amber | `#f0b64a` | lit windows, evidence, the player marker |
| Accent — ember | `#c9533f` | danger, wardens, damage |
| Shadow — warm | `#241f18` | daytime shadow |
| Shadow — cool | `#161b26` | night shadow |
| Ink | `#1b1a17` | outline / darkest detail |

**Rules**

- Shadows are **never pure black**. Warm by day, cool by night.
- One saturated accent per frame is the goal, not a rule. Amber appears only on things
  that still work.
- Every palette pair must differ by **at least 22% luminance** (see §2.3).
- No emoji anywhere in graphics.

### 1.2 Light direction

The scene is lit from the **upper-left (north-west)**, high in the sky. Consequences:

- Top and left edges of a solid form are **lighter**; bottom and right edges are darker.
- Cast shadows fall to the **lower-right**.
- A vertical gradient on a form (top light → bottom dark) is the single most important
  cue that a flat shape is a solid object. Use it on every structure.

---

## 2. Terrain

### 2.1 The terrain cache (required, not optional)

The terrain is **static**. Do not recompute it per frame.

Build a `Uint32Array(world.W * world.H)` of packed RGBA tile colours the first time a
world is painted, and reuse it. Rebuild only when `world.seed` changes.

```js
GFX._cache = null;      // Uint32Array
GFX._cacheSeed = -1;
```

Per frame the painter then does one `fillRect` per visible tile from the cache. This buys
enough headroom to make the terrain genuinely detailed.

### 2.2 Hillshade — the biggest single visual win

`world.elev` is a smooth 0..1 fbm field. Use it. For each tile, compute a normal from
the elevation gradient and light it from the north-west:

```js
const dx = elev(x, y-1) - elev(x, y+1);   // north minus south
const dy = elev(x-1, y) - elev(x+1, y);   // west minus east
const lit = -(dx + dy) * SLOPE_GAIN;      // sign: see note below
```

> **Derive the sign; do not eyeball it.** The Lambert term for a north-west light is
> `∂h/∂x + ∂h/∂y` in screen coordinates (x east, y south). A slope whose surface faces
> the north-west — ground that rises toward the south-east — is the lit one. Getting
> this backwards shades the map like a relief lit from underneath, which reads as
> wrong without anyone being able to say why.
>
> Normalise `lit` against the **measured** spread of the elevation gradient rather than
> a guessed constant: `world.elev` is an fbm whose practical range is roughly 0.2..0.8
> with a gradient several times smaller than the raw field, so an un-normalised
> multiplier lands near 1.0 and does nothing at all. Measure the gradient spread once
> when the cache is built, then map `lit` to a brightness multiplier of about
> **0.80 → 1.22**.

Map `lit` to a brightness multiplier of about **0.80 → 1.22**. Slopes facing the light
brighten, slopes away darken. Hollows collect shadow.

Also use elevation for **large-scale albedo**: higher ground is drier and paler, hollows
are damper and darker. This is what makes a salt flat read as a *landform* rather than a
colour.

### 2.3 Biome palettes — replace, do not mix

The old `ground`/`ground2` pair must **not** be mixed per tile. Each biome gets an
explicit low/high pair with real separation. Put these in `gfx_terrain.js` as a local
table keyed by biome index; **do not edit `world.js`**.

| # | biome | low (shade) | high (light) | detail notes |
|---|---|---|---|---|
| 0 | salt | `#a49b87` | `#d8d2c0` | polygonal crust cracks, bright salt rims, very few marks |
| 1 | dune | `#b79c6c` | `#e2cda0` | wind ripple arcs running NE→SW, sharp crest highlights |
| 2 | scrub | `#4e4b32` | `#7d7749` | dry tufts, bare dirt patches, sparse |
| 3 | town | `#6d6a61` | `#a09c92` | paving slabs, kerb lines, gravel drift |
| 4 | indus | `#463f36` | `#75685a` | hardpack, oil staining, rust dust |
| 5 | refinery | `#3a453f` | `#6d8a7c` | verdigris staining, cracked pad, pale alkali crust |
| 6 | water | `#54666c` | `#9db3b6` | mineral blue, salt crust rings, cracked mud |
| 7 | ruin | `#4b4239` | `#867a6b` | ash and burnt earth, scorched patches |

Blend **across** biome borders so the map does not look like a quilt: for each tile, sample
the 4-neighbourhood and weight by inverse distance, mixing the two ground colours. Keep
the blend tight (radius 1–2 tiles) so biome identity stays readable.

### 2.4 Grain — how to break the tile grid without per-pixel cost

The cache gives smooth 32×32 blocks, which will read as a grid. Fix it with:

1. A **pre-rendered 128×128 grain tile** (random noise, alpha-varying, transparent) held
   in a module-level canvas, applied as a repeating `ctx.createPattern` over the whole
   viewport at low alpha (~0.10) with `globalCompositeOperation = 'overlay'`. Offset the
   pattern by `-(cam.x % 128), -(cam.y % 128)` so it slides with the camera and never
   looks like a fixed screen overlay.
2. **World-space clutter** (§4) drawn across tile boundaries — this is what actually
   destroys the grid.
3. Never draw a 1px tile border. Ever.

### 2.5 Roads

Roads are `world.road` per tile. Bake them into the cache as **asphalt** (`#3e3b35`),
one luminance step below town concrete, and add a **gravel shoulder** colour on road
tiles that touch a non-road tile (`#6a6152`). Draw worn dashes along the highway in
clutter, not in the cache.

---

## 3. Structures — one silhouette per type

**Every one of the 30 POI types gets its own silhouette.** No shared rounded rectangle.

Sizes by tier (world pixels, before camera offset):

| tier | footprint | notes |
|---|---|---|
| 0 | ~30 × 24 | shed, tent, well — simple, one or two masses |
| 1 | ~44 × 34 | shop, diner, chapel — one main mass + one detail mass |
| 2 | ~62 × 48 | clinic, school, mine — main mass + 2 detail masses + signage |
| 3 | ~88 × 70 | reactor yard, bunker, bank — compound of several masses |

### 3.1 The mandatory four-layer recipe

Every solid form, at every tier, is drawn as:

1. **Ground shadow** — soft dark shape, offset `(+4, +5)`, alpha ~0.30, colour
   `rgba(28,24,18,.30)`. Draw it *before* the body.
2. **Body** — the silhouette in its material colour.
3. **Vertical gradient** — top of the form lightened ~14%, bottom darkened ~18%.
   Use `ctx.createLinearGradient` over the form's bounding box. **This is what makes
   top-down shapes read as solid objects.** Never skip it on a main mass.
4. **Detail** — structure-specific: roof lines, ribs, ladders, vents, pipes, corrugation,
   door frames.

Then a final **north-west rim light**: a 1–2px stroke along the top and left edges in
`rgba(255,240,210,.16)`, and a **south-east contact shadow** in `rgba(0,0,0,.18)`.

### 3.2 Type silhouettes (required shapes)

| type | silhouette |
|---|---|
| `house` | gabled body (two sloped roof quads) + chimney + porch step |
| `shop` | wide flat-roof box + awning stripe + projecting sign board |
| `clinic` | flat roof + cross plate on the facade + access ramp |
| `police` | flat roof + tall sign mast + pale blue-grey accent band |
| `library` | flat roof + column row along the front + pediment |
| `chapel` | steep gable + small spire |
| `diner` | long box + rounded roof + amber neon strip along the facade |
| `gas` | flat canopy on two posts + pump island + price sign post |
| `watertower` | four splayed legs + cylindrical tank + conical cap + ladder rungs |
| `substation` | box + two transformer blocks + three insulator stacks + perimeter fence |
| `reactor_yard` | containment dome + tall cooling stack + horizontal pipe runs |
| `mine` | headframe (A-legs + wheel) + spoil heap + rail spur |
| `school` | long block + bell tower + low yard wall |
| `hotel` | tall block + vertical window bands + projecting marquee |
| `bank` | columned front + wide steps |
| `radio_tower` | lattice mast (crossed bracing) + guy wires + red aircraft lamp |
| `hangar` | half-cylinder arched roof + open dark door |
| `camp` | two canvas tents + fire ring + crate stack |
| `monument` | stepped plinth + tapered obelisk |
| `well` | circular stone rim + A-frame windlass + bucket + rope |
| `bunker` | concrete slab + earth berm + heavy blast door + vent stacks |
| `foundry` | big shed + tall chimney + dark slag heap |
| `mill` | square tower + attached lower shed + angled conveyor |
| `depot` | long shed + rail siding + freight crates |
| `observatory` | pale drum + white dome + open slit |
| `cannery` | long shed + twin stacks + horizontal pipe |
| `garage` | open shed + vehicle lift + car hulk |
| `theater` | tall facade + curved marquee + sign band |
| `market` | row of stalls with striped canopies |
| `guardhouse` | small box + sandbag wall + lamp hood |

Tier-3 compounds may reuse a mass type more than once with different placement.

### 3.3 Light registration

Any structure with a lit window, lamp, neon strip, fire, or aircraft light pushes a
light source into `opts.lights`:

```js
opts.lights.push({ x: sx, y: sy, r: 90, color: '255,196,110', intensity: 0.5 });
```

`x`/`y` are **screen** coordinates. `r` is the radius in pixels. `color` is an
`r,g,b` string. `intensity` is 0..1. Lighting uses these to punch warm holes in the
darkness wash. **A building with lit windows that registers no light is a bug** — the
windows and the light pool must agree.

### 3.4 Containers

Searchable containers are not 8×8 squares. Draw them as small believable objects:
a crate, a toolbox, a locker, a drum, a desk, a locker bank, a filing cabinet — chosen
by hash of the container id so each is stable across frames. Clue containers get a faint
amber glint and a slow pulse ring (this is the "something labelled" affordance; keep it
readable but not garish).

---

## 4. Clutter

Clutter is what makes ground look like ground.

Divide the world into **64×64 px cells**. For each visible cell, hash the cell
coordinates to decide 0–3 props. Props are drawn at world positions and may cross tile
boundaries. Candidates:

- **rock** — irregular 5–7 sided polygon, 3–9 px, 2 tones + highlight on the NW face
- **rubble** — 3–5 small angular chips
- **dead shrub** — 3–5 short branching strokes, dry olive
- **dead tree** — a trunk plus 3–4 forked branches, 14–26 px tall, bleached
- **barrel** — small cylinder with an elliptical top, rust orange
- **tyre stack** — 2–3 concentric ellipses, near-black rubber
- **fence post** — a short post with a wire run, along roads
- **telegraph pole** — pole + crossarm + two insulators, along the highway
- **bone / debris** — a pale sliver, rare
- **scorch** — a dark stain, common near the refinery

Density by biome: salt 0.3, dune 0.25, scrub 1.4, town 0.5, indus 1.2, refinery 0.9,
water 0.4, ruin 1.5. Never let clutter cover a container or a POI.

Every prop gets a **tiny contact shadow** offset `(+1, +1)` — this single detail is what
makes clutter sit on the ground instead of float.

---

## 5. Actors

Nothing is a circle any more.

- **Player** — a figure in a dust coat: coat body (rounded trapezoid), hood/head, a
  shoulder line, and an arm/weapon pointing along `p.face`. Walk bob: vertical offset
  `sin(walkPhase) * 1.2` while `p.moving`. Soft shadow offset `(+2, +3)`.
  The player's **torch** (when `p.weapon === 'wpn_scrap_torch'`) is a small flickering
  flame that also pushes a light.
- **`rusted`** — a corroded machine: angular chassis with a hard-edged plate silhouette,
  one lens, rust streaks. Roughly square, not round.
- **`drover`** — a hunched scavenger: low shoulders, a pack on the back, a head forward.
- **`warden`** — large, plated, heavy shadow, a single amber eye, an amber containment
  ring. Clearly the biggest thing on screen.

Hit points: keep the existing bar but restyle it — thin, dark, with an amber/green fill
and a 1px dark outline so it reads over any ground.

### 5.1 Hit feedback — a hit must be visible

A thing that has just been hit **flares white**. The body itself goes hot — an additive
`rgba(255,250,236,.92)` ellipse over the torso — and a **cream ring opens out of it** as the
flare fades (radius `9 + (1 - a) * 13`, `a = min(1, e.flash / 0.16)`). A soft halo alone was
not enough at this sprite scale: at 20 px tall, a 9 px glow reads as a smudge and the player
cannot tell a hit from a highlight.

The ring and the hot body are drawn in the **same colour family as the damage number** and the
hit marker, so the three of them must all carry a **dark edge** (a dark stroke under the bright
stroke, `rgba(22,18,13)` at 50–90%). On a white-hot target a cream number is invisible, and a
hit you cannot read is not feedback.

Projectiles: not 2.4px dots. Draw a short tracer streak with a bright head, plus a
faint motion trail.

### 5.2 The reticle — draw it where the shot goes

The reticle is drawn **at the cursor**, never in the middle of the screen. This is a top-down
world: a screen-centre reticle points at nothing, and a reticle that is not the aim point is
worse than no reticle, because the player trusts it.

- Amber `rgba(232,179,74,.95)`, four ticks, a wider gap for a gun than for a swung weapon.
- **A dark edge under the amber** (`rgba(20,17,12,.5)`, lineWidth 3.4 against 1.4). Pale
  ground swallows bare amber, and so does a body that has just flared white.
- A faint aim line runs from the figure to the reticle so the line of the shot is legible.
- The **melee arc** is drawn where it lands, in front of the figure, with the same dark edge.
- The **damage number** is outlined with `strokeText`, not merely shadowed, and sits clear
  above the impact point.

### 5.3 The player indoors — lit, edged, and drawn last

Outdoors the player wears a dull olive coat (`#7e7358`) and reads against sand and scrub. Indoors
they stand in the middle of their own torchlight on a floor of the same family of colour, and a
coat the same value as the floor is not a person, it is a smudge. Three rules fix it, and all
three are the same rule stated three ways: **the player is the one thing in the frame that has to
be readable at a glance.**

- **The indoor figure is lit.** Coat `#c4b795` (the outdoor coat as it would actually look with a
  lamp in your hand), hood `#6a604c` — a dark head against a lit body, which is what gives the
  silhouette its structure. Arm `#8d8467`, sash `rgba(226,142,46,.96)`.
- **The figure carries its own dark edge** — `rgba(7,8,6,.66)` stroked around the coat (lineWidth
  3.4) and the hood (2.6), drawn *under* the body. Same rule as the hit marker and the damage
  number: a mark drawn over a lit thing needs its own darkness under it, or it dissolves into it.
- **The figure is drawn last.** After the veil, after the torch glow, after the vignette. The
  veil and the glow used to land on the player as well as on the room, and a coat washed with the
  same amber as the floor is a smudge. Drawn last, no light in the room can dim the player.

The rim light on the lit coat is `rgba(255,241,214,.44)` at lineWidth 2.4, against the outdoor
`rgba(255,240,210,.16)` at 1.8. A lit figure needs a stronger rim than one in flat daylight.

Measured on the Fuel Stop Office at 17:41: coat luminance 178, floor luminance 108 — a ratio of
1.65, with the dark edge on both sides of the silhouette.

### 5.4 The light in a room is a veil, not a hole

The interior lighting pass paints the darkness on **its own canvas** and punches the lit holes in
*that*, then lays the result over the room with `source-over`. Punching the holes straight into
the scene removed the alpha from the floor, the walls, the furniture and the player underneath
them: the lit areas came out as holes to the page behind the canvas, the room read as a brown
fog, and the player floated in it. A hole in the veil now means what it looks like — less dark.

The additive glow that carries the colour of a light is kept lean (`0.20 * intensity + 0.04`, with
a tight falloff). A fat additive wash turns a lit room into a fog, and a fog has no edges and no
shapes in it.

The player also gets a **presence light**: a hole in the veil and nothing else, centred on them.
Outdoors the light pass opens a bright circle around the player; indoors the only hole in the dark
used to be the torch's, so anyone who put the torch away stood in the murk with their own coat for
company. The presence light opens a hole and adds no colour, so it never washes the figure.

### 5.5 A mark over a lit thing needs a dark edge

The crate that holds rations is marked with an amber pointer — but only to a hungry player.
Pointing at the building is half of the route to food; the other half is finding the right crate
in a room where every crate looks the same, and a route that dead-ends is not a route. The marker
is a triangle pointing down at the crate, stroked in `rgba(18,15,11,.88)` under its amber fill.

### 5.6 Every object says what to do with it

The same principle, applied to the interface. A player who cannot work out how to eat a tin of
rations or put a rifle in their hand has not been given a mechanic — they have been given a
puzzle. Three surfaces carry the answer, and they must agree:

- **The hotbar has a name plate.** The selected slot is named, with the key that uses it:
  `SLOT 4  Ration Tin  SPACE to eat`. A slot showing a glyph and nothing else is a guessing game.
- **The Field Kit says the verb on every row.** `SPACE to equip`, `click to wear it`,
  `goes into your ammo count`. The kit is the only place a weapon can be put in the player's hand,
  and it used to look like a shopping list.
- **The food panel gives the action, not just the bearing.** `Ration Tin in your bar — Press SPACE
  to eat it`, or `Diner · 84m SE — go inside and press E on a crate.` A pointer without an
  instruction tells a hungry player where to walk and leaves them guessing what to press when
  they get there.

The coach teaches both (`equipped` and `ate` steps) at the moment they apply: `equipped` shows
up when there is a weapon in the pack that is not in your hand, `ate` when there is something
usable in the bar.

### 5.7 A weapon has to be able to answer the fight

The complaint that produced this section was one sentence: *"the firing weapon only works when the
enemy is literally on top of you."* The firing code was correct — the round went where the
reticle was. Three numbers had never been checked against each other:

| number | value before | what it means |
| --- | --- | --- |
| the notice radius | 240m | how far away the Rusted notice you |
| a gun's reach | 90m – 340m | how far the round actually flies |
| the weapon you start with | a torch, 40m | a **swung** weapon, not a gun |

So the player began with a torch, every gun they found was shorter than the distance at which
anything could notice them, and the result was a game where shooting was a thing you did after the
enemy had already arrived. **A gun whose reach is shorter than the notice radius can never be the
reason a fight starts.** It is not a weak gun; it is a broken one.

The rules, which `test/weapons.js` enforces:

1. **Every gun reaches at least 240m** — the notice radius. The shortest gun is the Sawn Dust Pump
   at exactly 240; the Long Marksman reaches 400. The reach differences still matter, because a
   shot carries as far as the round flies: a longer gun opens a fight from further out than they
   can see you.
2. **The torch and the pick mace are swung, not fired.** They stay under 75m, and the interface
   says so: `click to swing · 40m reach`, never `click to fire`.
3. **You start with a gun in your hand.** The Longhorn Revolver, six rounds, slot 1. The torch is
   slot 2 — and it **keeps burning in the pack**, so putting a gun in your hand does not put you in
   the dark. A light with no visible source is a lie the player has to trust, so when the torch is
   not in the hand holding the gun, its flame shows at the off hand and the pool of light moves
   with it.
4. **The reach is printed wherever the weapon is.** `click to fire · reaches 280m` in the hotbar
   plate and on the Field Kit row. A player who has to fire at something a long way off to learn
   how far the gun reaches will conclude the gun does not work.
5. **A found weapon takes a free hotbar slot**, and the log names the key: `Press 5 to take the
   Survey Carbine, then SPACE to put it in your hand.` A gun in the pack with no route to the hand
   is a gun that is never fired.
6. **Equipping never throws a slot away.** Drawing a gun must not delete the torch from the bar,
   and the slot that is selected is the slot that shows what is in your hands.
7. **A shot is a noise.** Firing tells the Rusted within earshot where you are, so a fight can
   start with a shot instead of waiting for something to walk into you. A silenced weapon carries
   nothing beyond the distance at which they would have seen you anyway (120m).

---

## 6. Lighting

`drawLighting` is rewritten. It must:

1. Fill a light canvas with a **tinted** darkness wash:
   - night → `rgba(10,16,32, amount)`
   - dusk/dawn → `rgba(48,24,14, amount)`
   - day → `rgba(6,9,16, amount)`
2. Punch out the **player's light** with a warm radial (`rgba(0,0,0,.95)` → transparent),
   radius ~190 plus `state.flare`, with a small per-frame flicker so it feels like flame.
3. Punch out every light in `opts.lights` with a warm radial scaled by `intensity`.
4. Composite onto the main canvas with `globalCompositeOperation = 'source-over'`.

The darkness amount must come from a day/night curve that also drives the colour grade in
§7.3. One source of truth: `GFX.daylight(state.time)` returning
`{ amount: 0..1, tint: 'r,g,b', hour: 0..24, phase: 'night'|'dawn'|'day'|'dusk' }`.

---

## 7. Atmosphere

### 7.1 Dust motes

~90 world-space motes drifting on the wind. Draw as 1–2px soft dots, alpha by depth
(0.15–0.5), brighter when backlit by the player torch. They must **not** be so dense
that they read as noise.

### 7.2 Vignette and grain

- **Vignette** — a radial gradient darkening the screen edges by ~18%. Always on.
- **Grain** — a pre-rendered noise tile drawn over the frame at low alpha
  (`globalCompositeOperation = 'overlay'`, alpha ~0.055), offset by a few pixels each
  frame from a cycling set of 4 pre-rendered tiles. Never a per-frame `Math.random()`
  image generation.

### 7.3 Colour grade

A single full-screen pass whose colour depends on the time of day:

| phase | grade |
|---|---|
| night | `rgba(20,34,64,.22)` multiply-ish dark blue |
| dawn | `rgba(255,150,80,.14)` warm screen |
| day | neutral, `rgba(0,0,0,0)` |
| dusk | `rgba(255,120,60,.18)` warm screen |

Use `globalCompositeOperation = 'multiply'` for darkening grades and `'screen'` for warm
grades. One pass, not three.

### 7.4 Weather

The old weather was a flat full-screen wash — the haze at 36% alpha was destroying the
whole palette. Weather must now be **layered and directional**:

| kind | treatment |
|---|---|
| `clear` | nothing beyond the base grade |
| `haze` | warm veil at **~0.13** alpha + slow horizontal dust bands |
| `wind` | moving wind streaks + a slight desaturating veil at ~0.08 |
| `rain` | darker grey grade + slanted rain streaks + a wet sheen on roads |
| `dust` | **new** — a dust storm: heavy ochre veil (~0.34), strong streaking dust, a visible front sweeping across the map, reduced visibility |

`VG.weather.kind` may be extended with `'dust'` by `gfx_atmos.js`; the weather roller
lives in `render.js` and may be changed to include it.

---

## 8. Module API contract

Exactly these files, exactly these entry points. Do not add or rename them.

### `src/gfx_terrain.js`
```js
GFX.paintTerrain(ctx, cam, world)     // draws the ground plane for the viewport
GFX.groundColor(world, tx, ty)        // -> '#rrggbb' blended ground colour of a tile
GFX.terrainCache(world)               // builds/returns the cached Uint32Array
```

### `src/gfx_props.js`
```js
GFX.paintStructures(ctx, cam, world, opts)   // opts.lights: array, receives light sources
GFX.paintClutter(ctx, cam, world)             // ground clutter
GFX.paintContainers(ctx, cam, world, p)       // searchable containers
GFX.poiSilhouettes()                          // -> object map: type -> draw fn (for tests)
```

### `src/gfx_actors.js`
```js
GFX.paintActors(ctx, cam, p, state, world)    // enemies, projectiles, player
```

### `src/gfx_atmos.js`
```js
GFX.paintLighting(ctx, cam, p, state, world, lights)
GFX.paintAtmosphere(ctx, cam, p, state, world)
GFX.daylight(time)                             // -> { amount, tint, hour, phase }
```

### `src/gfx_interior.js`
The interior scene is a separate picture with its own coordinate space. The room is drawn in
**logical interior pixels** and the module scales that space to the window itself, so one room
fills the screen whatever the monitor size. `cam` is the **logical** camera, not world pixels.

The room is fitted into the band of screen **above the HUD furniture** (`INT.MARGIN_BOTTOM`),
not the whole canvas: the hotbar and the coach line own the bottom strip, and a doorway painted
under the hotbar is a doorway nobody can find. `INT.updateCamera` owns that fit; the renderer
just draws the room wherever the camera puts it.

```js
GFX.paintInterior(ctx, cam, room, p, state, world, view)
// view = { w, h, dpr } in CSS pixels. room = { poi, tpl, solids, containers }
GFX.paintInteriorDoors(ctx, cam, world, p)    // the marked thresholds, in the world scene
```

**The doorway is the brightest thing in the room.** It gets daylight through the opening, the pool
of light that lands on the floor, a threshold strip, a chevron pointing out, and a pulse — and it
is registered as a **light source** in the room's light list, so it punches through the darkness
overlay instead of being dimmed by it. The exit cue is not decoration: it is the difference
between a room you can leave and a room you are trapped in.

### Extra exports on the existing modules
```js
GFX.paintContainerAt(ctx, c, sx, sy)   // one container at an arbitrary screen point
GFX.buildingSize(tier)                // -> [w, h] the building footprint for a tier
GFX.paintPlayerOnly(ctx, cam, p, state) // the figure alone, in logical coordinates
```

### Integration order in `src/render.js`
1. clear the frame
2. `paintTerrain`
3. `paintClutter`
4. `paintStructures` (collects `lights`)
5. `paintContainers`
6. `paintActors`
7. `paintLighting` (using the collected `lights`)
8. `paintAtmosphere`
9. `paintLiveMarkers`
10. `paintInteriorDoors`
11. crosshair — the reticle at the cursor, the aim line, the melee arc
12. hit markers — the X, the damage number

**Inside a building the order above does not apply.** `render.js` branches to `paintInterior`
before any of the outdoor stages run, draws the room, the crates in it and the player, and
returns. The outdoor camera, the flats' enemies, the radio traffic and the weather do not exist
while you are indoors.

---

## 9. Code rules (all workers)

- Plain **ES5-compatible** JavaScript. No `import`, no `export`, no arrow functions
  required, no template literals, no optional chaining, no `??`. The game must run from
  `file://` with plain `<script src>` tags.
- 2-space indent. Single quotes. Semicolons.
- **≤ 60 KB per file.**
- No emoji. No `console.log` left behind.
- Each worker creates **exactly one new file**. Do not edit `render.js`, `world.js`,
  `core.js`, `index.html`, `ui.js`, `main.js` or another worker's file. The integrator
  wires them up.
- Namespace boilerplate, exactly:
  ```js
  /* VERDIGRIS — <module> */
  window.VG = window.VG || {};
  window.VG.GFX = window.VG.GFX || {};
  (function (GFX, VG) {
    'use strict';
    ...
  })(window.VG.GFX, window.VG);
  ```
  **`VG` must be captured as an IIFE parameter.** Do not rely on `VG` being an
  implicit global — the headless contract test loads these modules in a sandbox
  where `window` is a plain object, and an implicit global silently becomes a
  `ReferenceError` at the first call.
- `VG.TILE` is 32. World is 288×288 tiles.
- Use the existing helpers: `VG.mix`, `VG.shade`, `VG.lerp`, `VG.clamp`, `VG.hash2`,
  `VG.noise2`, `VG.fbm`, `VG.dist`, `VG.TAU`.
- `cam` is `{x, y}` in **world pixels** (already includes the camera offset). Screen
  position of a world point `wx, wy` is `wx - cam.x`, `wy - cam.y`.

---

## 10. Performance budget

- 60 fps at 1920×1080 on integrated graphics.
- Terrain colour work happens **once per world**, not per frame.
- Per frame: ≤ ~2500 `fillRect` calls, ≤ ~800 path operations, ≤ 1 gradient creation per
  structure (reuse where practical).
- No `ctx.filter`, no `shadowBlur` in hot loops, no per-frame image decoding, no
  per-frame `Math.random()` image generation.
