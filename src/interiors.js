/* VERDIGRIS - enterable interiors
   ------------------------------------------------------------------
   Every building in the survey was a silhouette. You could walk up to
   the Diner, survey it, and read a line of text about it, but the
   building had no inside: there was no collision anywhere in the game
   and no way through a door.

   This file adds one. There are seventeen hand-built rooms, one for
   every building type that holds a clue, and every building of those
   types on the flats can be entered. The room is a separate scene with
   its own camera, its own movement rules and its own collision; the
   flats are suspended while you are inside.

   The thing that makes it worth doing: the loot and the clues move
   inside. A crate that was sitting in the yard is now a crate on the
   diner counter, and the file you are chasing is in the room that
   describes it.

   Coordinates are logical interior pixels. Rooms are laid out near a
   16:9 shape so that one fills the screen at the interior zoom. */
window.VG = window.VG || {};
(function (VG) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* authoring helpers                                                    */
  /* ------------------------------------------------------------------ */

  /* Four walls with a gap in the south side for the door. */
  function shell(w, h, doorX, doorW, t) {
    t = t || 14;
    const dl = Math.max(0, Math.round(doorX - doorW / 2));
    const dr = Math.min(w, Math.round(doorX + doorW / 2));
    return [
      { x: 0, y: 0, w: w, h: t },
      { x: 0, y: 0, w: t, h: h },
      { x: w - t, y: 0, w: t, h: h },
      { x: 0, y: h - t, w: dl, h: t },
      { x: dr, y: h - t, w: w - dr, h: t }
    ];
  }

  /* An interior partition with a doorway gap in it. */
  function divider(x, y, w, h, gapTop, gapBottom) {
    const out = [];
    if (gapTop > y) out.push({ x: x, y: y, w: w, h: gapTop - y });
    if (gapBottom < y + h) out.push({ x: x, y: gapBottom, w: w, h: (y + h) - gapBottom });
    return out;
  }

  function f(kind, x, y, w, h, ns) {
    return { k: kind, x: x, y: y, w: w, h: h, ns: !!ns };
  }

  /* ------------------------------------------------------------------ */
  /* the seventeen rooms                                                  */
  /* ------------------------------------------------------------------ */

  const TEMPLATES = [];

  TEMPLATES.push({
    key: 'diner',
    title: 'Diner',
    w: 640, h: 360,
    walls: shell(640, 360, 320, 76).concat(divider(430, 14, 14, 332, 154, 254)),
    furn: [
      f('counter', 130, 140, 230, 32),
      f('stool', 155, 178, 15, 15), f('stool', 215, 178, 15, 15),
      f('stool', 275, 178, 15, 15), f('stool', 335, 178, 15, 15),
      f('booth', 50, 40, 74, 46), f('booth', 50, 270, 74, 46),
      f('table', 280, 50, 52, 36), f('table', 280, 260, 52, 36),
      f('stove', 456, 40, 66, 42), f('sink', 460, 270, 36, 28),
      f('shelf', 398, 30, 22, 110),
      f('rug', 160, 225, 150, 58, true),
      f('case', 130, 106, 44, 28)
    ],
    lights: [{ x: 300, y: 180, r: 230, c: '#f0b64a', i: 0.50 }],
    windows: [{ x: 120, y: 0, w: 120, h: 14 }],
    loot: [[168, 156], [320, 156], [306, 68], [478, 284]],
    flavour: 'The door gives on a hiss of old grease. Inside: a counter, four stools, and coffee that stopped being made a long time ago.'
  });

  TEMPLATES.push({
    key: 'substation',
    title: 'Substation',
    w: 640, h: 360,
    walls: shell(640, 360, 110, 80),
    furn: [
      f('cabinet', 190, 50, 32, 104), f('cabinet', 236, 50, 32, 104),
      f('cabinet', 282, 50, 32, 104), f('cabinet', 328, 50, 32, 104),
      f('cabinet', 374, 50, 32, 104),
      f('desk', 190, 200, 120, 42), f('console', 330, 200, 120, 38),
      f('machine', 510, 60, 72, 86), f('tank', 510, 190, 62, 70),
      f('crate', 50, 110, 30, 28), f('crate', 50, 146, 30, 28), f('crate', 86, 146, 30, 28),
      f('pipe', 70, 290, 180, 12), f('valve', 150, 268, 28, 28)
    ],
    lights: [{ x: 300, y: 120, r: 210, c: '#e8b24a', i: 0.50 }],
    windows: [],
    loot: [[215, 220], [385, 219], [545, 100], [66, 126]],
    flavour: 'The door is swollen shut. Inside, the hum is still on. Something is still drawing power, and it is not the wind.'
  });

  TEMPLATES.push({
    key: 'reactor_yard',
    title: 'Control Building',
    w: 800, h: 440,
    walls: shell(800, 440, 170, 88).concat(divider(500, 14, 14, 412, 184, 280)),
    furn: [
      f('console', 80, 60, 140, 40), f('console', 80, 120, 140, 40),
      f('console', 250, 60, 140, 40), f('console', 250, 120, 140, 40),
      f('desk', 80, 270, 120, 44), f('chair', 215, 280, 18, 18),
      f('machine', 400, 320, 90, 96),
      f('tank', 560, 50, 80, 80), f('shelf', 560, 160, 80, 26),
      f('crate', 420, 50, 34, 32), f('crate', 420, 90, 34, 32), f('crate', 460, 90, 34, 32),
      f('cabinet', 660, 300, 70, 80),
      f('sign', 660, 50, 90, 44, true)
    ],
    lights: [
      { x: 230, y: 100, r: 250, c: '#86c9b4', i: 0.45 },
      { x: 610, y: 90, r: 160, c: '#e8b24a', i: 0.50 }
    ],
    windows: [{ x: 60, y: 0, w: 360, h: 14 }],
    loot: [[150, 80], [320, 80], [130, 292], [600, 90]],
    flavour: 'The control building door is welded from the outside and open from the inside. Somebody wanted it that way.'
  });

  TEMPLATES.push({
    key: 'police',
    title: 'Sheriff Post',
    w: 640, h: 360,
    walls: shell(640, 360, 520, 80).concat(divider(290, 14, 14, 332, 164, 250)),
    furn: [
      f('desk', 330, 60, 130, 44), f('chair', 470, 70, 18, 18),
      f('counter', 330, 160, 200, 30),
      f('locker', 330, 230, 120, 22), f('locker', 460, 230, 120, 22),
      f('cabinet', 330, 280, 60, 66),
      f('cage', 50, 50, 210, 140),
      f('bunk', 70, 215, 58, 96), f('bunk', 145, 215, 58, 96),
      f('crate', 235, 290, 30, 28), f('table', 100, 300, 42, 30)
    ],
    lights: [
      { x: 410, y: 110, r: 200, c: '#e8b24a', i: 0.50 },
      { x: 150, y: 140, r: 150, c: '#9fb6c4', i: 0.30 }
    ],
    windows: [{ x: 60, y: 0, w: 110, h: 14 }],
    loot: [[380, 82], [370, 175], [90, 110], [190, 262]],
    flavour: 'The sheriff post door swings. Behind the counter: a ledger nobody finished, and a cell block with something in it.'
  });

  TEMPLATES.push({
    key: 'clinic',
    title: 'Clinic',
    w: 560, h: 320,
    walls: shell(560, 320, 90, 76).concat(divider(280, 14, 14, 292, 144, 220)),
    furn: [
      f('bed', 50, 60, 48, 82), f('bed', 116, 60, 48, 82),
      f('cabinet', 196, 50, 42, 56),
      f('desk', 310, 50, 120, 42), f('chair', 440, 60, 18, 18),
      f('cabinet', 310, 120, 42, 66), f('counter', 380, 120, 120, 30),
      f('sink', 380, 170, 38, 28), f('bed', 310, 226, 48, 72),
      f('crate', 400, 240, 34, 30), f('plant', 230, 270, 24, 24)
    ],
    lights: [
      { x: 140, y: 110, r: 190, c: '#dfe8e0', i: 0.50 },
      { x: 400, y: 130, r: 130, c: '#e8b24a', i: 0.40 }
    ],
    windows: [{ x: 40, y: 0, w: 100, h: 14 }],
    loot: [[108, 100], [370, 72], [440, 135], [334, 276]],
    flavour: 'Clinic. The smell is iodine and dust. Two beds made up, one that was not.'
  });

  TEMPLATES.push({
    key: 'watertower',
    title: 'Pump House',
    w: 560, h: 320,
    walls: shell(560, 320, 420, 80),
    furn: [
      f('machine', 70, 60, 86, 76), f('machine', 190, 60, 86, 76),
      f('tank', 320, 50, 66, 104),
      f('pipe', 50, 190, 330, 12), f('valve', 210, 168, 28, 28),
      f('crate', 50, 240, 32, 30), f('crate', 90, 240, 32, 30),
      f('barrel', 140, 240, 24, 24),
      f('desk', 320, 190, 88, 38), f('sink', 440, 190, 32, 26)
    ],
    lights: [{ x: 150, y: 110, r: 180, c: '#e8b24a', i: 0.45 }],
    windows: [{ x: 240, y: 0, w: 90, h: 14 }],
    loot: [[113, 98], [106, 255], [365, 209], [352, 100]],
    flavour: 'The pump house at the foot of the tower. Chlorine, iron, and a meter still turning slowly.'
  });

  TEMPLATES.push({
    key: 'market',
    title: 'Market',
    w: 720, h: 400,
    walls: shell(720, 400, 110, 84),
    furn: [
      f('shelf', 210, 50, 26, 150), f('shelf', 270, 50, 26, 150),
      f('shelf', 330, 50, 26, 150), f('shelf', 390, 50, 26, 150),
      f('counter', 210, 250, 150, 36), f('table', 420, 240, 70, 50),
      f('crate', 540, 60, 40, 38), f('crate', 590, 60, 40, 38), f('crate', 540, 110, 40, 38),
      f('barrel', 600, 160, 26, 26),
      f('freezer', 60, 220, 90, 58), f('scale', 120, 300, 30, 26),
      f('crate', 50, 60, 36, 34), f('crate', 50, 300, 36, 34)
    ],
    lights: [
      { x: 300, y: 130, r: 250, c: '#e8b24a', i: 0.50 },
      { x: 110, y: 250, r: 140, c: '#cfe0d8', i: 0.35 }
    ],
    windows: [{ x: 460, y: 0, w: 160, h: 14 }],
    loot: [[223, 110], [270, 268], [565, 80], [100, 250]],
    flavour: 'The market hall. Four aisles of shelving, and a freezer with a padlock on it that was never locked.'
  });

  TEMPLATES.push({
    key: 'library',
    title: 'Library',
    w: 640, h: 360,
    walls: shell(640, 360, 510, 80),
    furn: [
      f('shelf', 70, 50, 26, 170), f('shelf', 130, 50, 26, 170),
      f('shelf', 190, 50, 26, 170), f('shelf', 250, 50, 26, 170),
      f('desk', 370, 60, 130, 46), f('chair', 510, 70, 18, 18),
      f('cabinet', 370, 140, 46, 56),
      f('table', 110, 270, 70, 50), f('table', 240, 270, 70, 50),
      f('chair', 95, 326, 18, 18), f('plant', 560, 300, 26, 26)
    ],
    lights: [
      { x: 190, y: 140, r: 230, c: '#e8d7a8', i: 0.45 },
      { x: 430, y: 90, r: 150, c: '#e8b24a', i: 0.45 }
    ],
    windows: [{ x: 300, y: 0, w: 120, h: 14 }],
    loot: [[83, 130], [153, 130], [420, 83], [145, 295]],
    flavour: 'The library. Reading tables, four rows of stacks, and a card catalogue with the cards still in it.'
  });

  TEMPLATES.push({
    key: 'shop',
    title: 'Storefront',
    w: 560, h: 320,
    walls: shell(560, 320, 470, 80),
    furn: [
      f('counter', 50, 140, 130, 32),
      f('shelf', 210, 50, 24, 120), f('shelf', 258, 50, 24, 120),
      f('shelf', 306, 50, 24, 120), f('shelf', 354, 50, 24, 120),
      f('cabinet', 220, 210, 48, 58),
      f('crate', 410, 200, 38, 36), f('crate', 410, 244, 38, 36), f('crate', 456, 244, 38, 36),
      f('barrel', 50, 230, 26, 26)
    ],
    lights: [{ x: 280, y: 110, r: 210, c: '#e8b24a', i: 0.50 }],
    windows: [{ x: 60, y: 0, w: 100, h: 14 }],
    loot: [[110, 156], [222, 110], [430, 218], [63, 243]],
    flavour: 'The store. Shelves stripped to the labels, a till with the drawer still in, and a storeroom.'
  });

  TEMPLATES.push({
    key: 'school',
    title: 'School',
    w: 720, h: 400,
    walls: shell(720, 400, 340, 84).concat(divider(430, 14, 14, 372, 194, 280)),
    furn: [
      f('board', 50, 30, 160, 24), f('desk', 240, 30, 100, 34),
      f('desk', 70, 90, 40, 28), f('desk', 140, 90, 40, 28), f('desk', 210, 90, 40, 28),
      f('desk', 70, 150, 40, 28), f('desk', 140, 150, 40, 28), f('desk', 210, 150, 40, 28),
      f('desk', 70, 210, 40, 28), f('desk', 140, 210, 40, 28), f('desk', 210, 210, 40, 28),
      f('locker', 460, 50, 140, 22), f('locker', 460, 82, 140, 22),
      f('crate', 460, 320, 36, 34), f('crate', 504, 320, 36, 34),
      f('cabinet', 570, 310, 60, 50), f('sink', 320, 330, 40, 28)
    ],
    lights: [
      { x: 180, y: 150, r: 240, c: '#e8d7a8', i: 0.45 },
      { x: 530, y: 80, r: 150, c: '#e8b24a', i: 0.40 }
    ],
    windows: [{ x: 40, y: 0, w: 150, h: 14 }],
    loot: [[90, 104], [280, 48], [520, 92], [340, 344]],
    flavour: 'The school. Six desks in rows, a board still carrying half a lesson, and lockers with the doors standing open.'
  });

  TEMPLATES.push({
    key: 'depot',
    title: 'Freight Depot',
    w: 800, h: 440,
    walls: shell(800, 440, 130, 96),
    furn: [
      f('stack', 230, 60, 100, 100), f('stack', 350, 60, 100, 100),
      f('pallet', 230, 180, 60, 40),
      f('machine', 600, 60, 110, 90),
      f('desk', 600, 200, 120, 44), f('cabinet', 600, 280, 60, 70),
      f('locker', 50, 200, 120, 24),
      f('tank', 200, 300, 70, 90), f('crate', 310, 330, 44, 40),
      f('scale', 420, 370, 44, 32), f('platform', 250, 210, 280, 54)
    ],
    lights: [
      { x: 380, y: 180, r: 300, c: '#e8b24a', i: 0.45 },
      { x: 650, y: 110, r: 150, c: '#9fb6c4', i: 0.30 }
    ],
    windows: [{ x: 640, y: 0, w: 120, h: 14 }],
    loot: [[260, 90], [660, 220], [630, 315], [332, 350]],
    flavour: 'The freight depot. Pallets, a dock, and a scale that still weighs things nobody has shipped in forty years.'
  });

  TEMPLATES.push({
    key: 'guardhouse',
    title: 'Guard Post',
    w: 480, h: 280,
    walls: shell(480, 280, 240, 76),
    furn: [
      f('desk', 80, 60, 130, 42), f('chair', 220, 70, 18, 18),
      f('cabinet', 80, 140, 46, 54), f('barrier', 240, 150, 140, 12),
      f('shelf', 240, 50, 24, 90),
      f('crate', 290, 200, 34, 32), f('barrel', 60, 210, 24, 24)
    ],
    lights: [{ x: 220, y: 120, r: 170, c: '#e8b24a', i: 0.50 }],
    windows: [{ x: 40, y: 0, w: 90, h: 14 }],
    loot: [[130, 82], [102, 166], [252, 70], [308, 216]],
    flavour: 'A guard post: a desk, a barrier arm, and a chair somebody left in the sun.'
  });

  TEMPLATES.push({
    key: 'bank',
    title: 'Bank',
    w: 720, h: 400,
    walls: shell(720, 400, 610, 80).concat(divider(230, 14, 14, 372, 184, 270)),
    furn: [
      f('cage', 60, 100, 160, 28), f('counter', 60, 128, 160, 30),
      f('vault', 50, 250, 130, 120),
      f('desk', 290, 50, 120, 44), f('chair', 420, 60, 18, 18),
      f('cabinet', 290, 130, 50, 70), f('table', 410, 130, 60, 44),
      f('shelf', 530, 50, 24, 120),
      f('crate', 550, 220, 38, 36), f('crate', 550, 264, 38, 36),
      f('barrel', 610, 230, 26, 26),
      f('sign', 290, 330, 110, 40, true)
    ],
    lights: [
      { x: 230, y: 140, r: 230, c: '#e8d7a8', i: 0.50 },
      { x: 610, y: 110, r: 140, c: '#e8b24a', i: 0.40 }
    ],
    windows: [{ x: 330, y: 0, w: 130, h: 14 }],
    loot: [[170, 143], [340, 72], [110, 340], [570, 238]],
    flavour: 'The bank. A teller counter with brass grilles, and a vault door that is closed but not locked.'
  });

  TEMPLATES.push({
    key: 'bunker',
    title: 'Bunker',
    w: 680, h: 380,
    walls: shell(680, 380, 560, 84),
    furn: [
      f('bunk', 60, 50, 54, 104), f('bunk', 126, 50, 54, 104),
      f('bunk', 60, 170, 54, 104), f('bunk', 126, 170, 54, 104),
      f('machine', 270, 50, 96, 66), f('tank', 400, 50, 66, 96),
      f('console', 270, 160, 116, 38), f('cabinet', 420, 180, 48, 66),
      f('pipe', 240, 300, 300, 12),
      f('crate', 500, 290, 36, 34), f('barrel', 50, 320, 26, 26), f('barrel', 84, 320, 26, 26)
    ],
    lights: [
      { x: 300, y: 130, r: 230, c: '#8fb6c8', i: 0.40 },
      { x: 110, y: 140, r: 150, c: '#e8b24a', i: 0.35 }
    ],
    windows: [],
    loot: [[290, 83], [310, 179], [445, 212], [518, 307]],
    flavour: 'Bunker. Four bunks made up, a generator turning over, and a filter unit with a service tag on it.'
  });

  TEMPLATES.push({
    key: 'radio_tower',
    title: 'Relay Hut',
    w: 480, h: 280,
    walls: shell(480, 280, 110, 80),
    furn: [
      f('console', 50, 60, 140, 38), f('cabinet', 220, 50, 48, 78),
      f('desk', 50, 140, 100, 38), f('chair', 160, 148, 18, 18),
      f('shelf', 290, 50, 24, 88),
      f('crate', 290, 180, 34, 32), f('barrel', 230, 190, 24, 24),
      f('chair', 230, 140, 18, 18)
    ],
    lights: [
      { x: 170, y: 110, r: 160, c: '#e8b24a', i: 0.50 },
      { x: 300, y: 80, r: 80, c: '#9fd8c8', i: 0.60 }
    ],
    windows: [{ x: 320, y: 0, w: 110, h: 14 }],
    loot: [[110, 79], [244, 89], [100, 160], [308, 196]],
    flavour: 'The relay hut under the mast. A rack of valves, a tape deck, and a duty log with a page torn out.'
  });

  TEMPLATES.push({
    key: 'gas',
    title: 'Fuel Stop Office',
    w: 480, h: 280,
    walls: shell(480, 280, 330, 80),
    furn: [
      f('counter', 50, 90, 130, 30),
      f('desk', 50, 160, 100, 38), f('chair', 160, 168, 18, 18),
      f('cabinet', 220, 50, 48, 58),
      f('crate', 320, 190, 34, 32), f('barrel', 320, 100, 26, 26),
      f('shelf', 220, 190, 22, 70)
    ],
    lights: [{ x: 170, y: 120, r: 160, c: '#e8b24a', i: 0.50 }],
    windows: [{ x: 40, y: 0, w: 100, h: 14 }],
    loot: [[110, 105], [85, 180], [244, 80], [338, 206]],
    flavour: 'The fuel stop office. A window onto the pumps, a register, and a cup that somebody left in the drawer.'
  });

  TEMPLATES.push({
    key: 'observatory',
    title: 'Observatory',
    w: 600, h: 340,
    walls: shell(600, 340, 470, 80),
    furn: [
      f('scope', 160, 100, 116, 116),
      f('desk', 320, 50, 130, 42), f('chair', 460, 60, 18, 18),
      f('cabinet', 320, 140, 44, 66), f('shelf', 50, 50, 24, 106),
      f('table', 50, 220, 68, 48),
      f('crate', 320, 260, 36, 32), f('crate', 364, 260, 36, 32)
    ],
    lights: [
      { x: 218, y: 158, r: 190, c: '#9fb6d8', i: 0.40 },
      { x: 410, y: 90, r: 130, c: '#e8b24a', i: 0.45 }
    ],
    windows: [{ x: 40, y: 0, w: 100, h: 14 }],
    loot: [[186, 158], [380, 72], [64, 244], [340, 276]],
    flavour: 'The observatory. The dome is stuck half open, and the plate cabinet has one drawer forced.'
  });

  const BY_KEY = {};
  for (let i = 0; i < TEMPLATES.length; i++) BY_KEY[TEMPLATES[i].key] = TEMPLATES[i];

  VG.INTERIOR_TEMPLATES = TEMPLATES;
  VG.INTERIOR_BY_KEY = BY_KEY;

  /* ------------------------------------------------------------------ */
  /* the engine                                                           */
  /* ------------------------------------------------------------------ */

  /* Mirrors the building footprint table the graphics module uses, so a door
     marker lands on the edge of the silhouette and not in the middle of it.
     The contract test asserts the two tables agree. */
  const BUILD_SIZE = [[30, 24], [44, 34], [62, 48], [88, 70]];

  const INT = {
    active: null,
    cam: { x: 0, y: 0 },
    zoom: 1,
    view: { w: 1280, h: 720, dpr: 1 },
    DOOR_REACH: 46,
    EXIT_REACH: 52,
    /* The hotbar, the name plate over it and the coach line sit across the
       bottom of the canvas. The room is fitted into the band above them, so
       the doorway - which is always in the south wall - can never end up
       behind a slot box. This is the whole difference between a room you can
       leave and a room you are trapped in because you cannot find the way
       out. */
    MARGIN_BOTTOM: 130,
    /* After you step out, the door must not immediately offer to take you
       back in. Being pushed straight back inside the moment you leave is the
       most confusing thing this game can do to you. */
    doorLock: 0
  };
  VG.INT = INT;

  INT.has = function (poi) { return !!(poi && BY_KEY[poi.type]); };
  INT.template = function (poi) { return poi ? BY_KEY[poi.type] || null : null; };

  INT.buildingSize = function (tier) {
    if (VG.GFX && typeof VG.GFX.buildingSize === 'function') return VG.GFX.buildingSize(tier);
    return BUILD_SIZE[tier] || BUILD_SIZE[1];
  };

  /* Where the door sits on the world map: the south face of the building. */
  INT.doorWorld = function (poi) {
    if (!poi) return null;
    if (poi._door) return poi._door;
    const sz = INT.buildingSize(poi.tier);
    const cx = poi.x * VG.TILE + VG.TILE / 2;
    const cy = poi.y * VG.TILE + VG.TILE / 2;
    poi._door = { x: cx, y: cy + sz[1] / 2 + 6 };
    return poi._door;
  };

  /* The doorway is the gap in the south wall. It is found rather than
     authored, so the door marker on the world map and the doorway inside the
     room can never drift apart. */
  INT.doorOf = function (tpl) {
    if (tpl._doorGap) return tpl._doorGap;
    const segs = [];
    for (let i = 0; i < tpl.walls.length; i++) {
      const wl = tpl.walls[i];
      /* the south wall only: it ends at the bottom edge and does not start
         at the top. The side walls end at the bottom edge too, so the start
         test is what tells them apart. */
      if (wl.y > 0 && wl.y + wl.h === tpl.h && wl.w > 1) segs.push(wl);
    }
    segs.sort((a, b) => a.x - b.x);
    let dx = tpl.w / 2, dy = tpl.h - 14;
    if (segs.length >= 2) dx = (segs[0].x + segs[0].w + segs[1].x) / 2;
    else if (segs.length === 1) { dx = segs[0].x + segs[0].w / 2; dy = segs[0].y; }
    tpl._doorGap = { x: dx, y: dy, w: segs.length >= 2 ? segs[1].x - (segs[0].x + segs[0].w) : 72 };
    return tpl._doorGap;
  };

  /* Every solid rectangle in a room: walls plus the furniture you cannot
     walk through. */
  INT.solids = function (tpl) {
    if (tpl._solids) return tpl._solids;
    const out = [];
    for (let i = 0; i < tpl.walls.length; i++) {
      const w = tpl.walls[i];
      out.push({ x: w.x, y: w.y, w: w.w, h: w.h });
    }
    for (let i = 0; i < tpl.furn.length; i++) {
      const g = tpl.furn[i];
      if (g.ns) continue;
      out.push({ x: g.x, y: g.y, w: g.w, h: g.h });
    }
    tpl._solids = out;
    return out;
  };

  /* Where the player stands when the door opens. It is found, not authored:
     a hand-written spawn point lands inside a counter sooner or later. The
     point must be clear of the furniture and far enough from the doorway
     that the way out is not the first thing the prompt offers. */
  INT.spawnFor = function (tpl) {
    if (tpl._spawn) return tpl._spawn;
    const solids = INT.solids(tpl);
    const door = INT.doorOf(tpl);
    const tries = [
      { x: door.x, y: tpl.h - 86 },
      { x: door.x - 56, y: tpl.h - 86 },
      { x: door.x + 56, y: tpl.h - 86 },
      { x: door.x, y: tpl.h - 116 },
      { x: door.x - 100, y: tpl.h - 62 },
      { x: door.x + 100, y: tpl.h - 62 },
      { x: door.x - 130, y: tpl.h - 92 },
      { x: door.x + 130, y: tpl.h - 92 }
    ];
    let pick = null;
    for (let i = 0; i < tries.length; i++) {
      const t = tries[i];
      if (t.x < 20 || t.x > tpl.w - 20 || t.y < 20 || t.y > tpl.h - 20) continue;
      if (VG.dist(t.x, t.y, door.x, door.y) < 64) continue;
      if (INT.blocked(t.x, t.y, 13, solids, tpl)) continue;
      pick = t;
      break;
    }
    if (!pick) pick = { x: door.x, y: tpl.h - 34 };
    tpl._spawn = pick;
    return pick;
  };

  /* Is a circle at (x,y) inside a wall or a piece of furniture? */
  INT.blocked = function (x, y, r, solids, tpl) {
    if (x - r < 0 || y - r < 0 || x + r > tpl.w || y + r > tpl.h) return true;
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      if (x + r > s.x && x - r < s.x + s.w && y + r > s.y && y - r < s.y + s.h) return true;
    }
    return false;
  };

  /* Move a building's crates inside it. A crate in the yard becomes a crate
     on the counter, and the clue it carries is now somewhere you have to
     walk into a building to reach. */
  INT.prepare = function (world) {
    if (!world || !world.pois) return 0;
    let moved = 0;
    for (let i = 0; i < world.pois.length; i++) {
      const poi = world.pois[i];
      const tpl = BY_KEY[poi.type];
      if (!tpl) continue;
      const slots = tpl.loot;
      let n = 0;
      for (let j = 0; j < poi.containers.length; j++) {
        const c = world.containers[poi.containers[j]];
        if (!c || c.inside) continue;
        const slot = slots[n % slots.length];
        const round = Math.floor(n / slots.length);
        c.inside = poi.id;
        c.ix = slot[0] + (round ? round * 20 : 0);
        c.iy = slot[1] + (round ? round * 16 : 0);
        /* the world position now points at the building itself, so a clue
           marker on the map lands on the door and not in the dust */
        c.x = poi.x;
        c.y = poi.y;
        n++;
        moved++;
      }
      /* clue map markers follow their crate into the building */
      for (let k = 0; k < world.clues.length; k++) {
        const cl = world.clues[k];
        if (!cl) continue;
        const cc = world.containers[cl.container];
        if (cc && cc.inside === poi.id) { cl.x = poi.x; cl.y = poi.y; }
      }
    }
    return moved;
  };

  /* ---- entering and leaving ---- */

  INT.enter = function (poi, p) {
    const tpl = BY_KEY[poi ? poi.type : null];
    if (!tpl || !p) return false;
    if (!VG.World) return false;
    INT.active = {
      poi: poi,
      tpl: tpl,
      solids: INT.solids(tpl),
      containers: VG.World.containers.filter((c) => c.inside === poi.id)
    };
    p.wx = p.x;
    p.wy = p.y;
    const spawn = INT.spawnFor(tpl);
    p.x = spawn.x;
    p.y = spawn.y;
    p.face = -Math.PI / 2;
    p.moving = false;
    /* The heading is the pointer's, in here as well as out there. The room
       is a room and there is nothing in it to shoot, so the heading is only
       about getting around - but it is the same rule in both places, and a
       player who walks in and finds the controls have changed is a player
       who stops trusting the controls. The pointer's place in the room is
       worked out by screenToLocal, so the cursor over the room picks the
       direction you walk. */
    p.aim = -Math.PI / 2;
    poi.discovered = true;
    if (VG.log) {
      VG.log(tpl.flavour, 'clue');
      VG.log('Inside: ' + tpl.title + '. The way out is the lit gap in the far wall - walk into it, or press ESC.', '');
    }
    if (VG.Audio) VG.Audio.open();
    if (VG.Help) VG.Help.mark('entered');
    return true;
  };

  INT.exit = function (p) {
    if (!INT.active || !p) return false;
    const dw = INT.doorWorld(INT.active.poi);
    INT.active = null;
    /* You come out well clear of the threshold. Landing inside the door
       reach means the prompt immediately offers to take you straight back in,
       and a player who presses E again is back where they started, which
       reads exactly like being stuck. */
    p.x = dw.x;
    p.y = dw.y + 58;
    p.face = -Math.PI / 2;
    INT.doorLock = 1.5;
    if (VG.log) VG.log('You step back out into the light.', '');
    return true;
  };

  /* ---- the scene update ---- */

  INT.update = function (p, dt, input) {
    if (!INT.active) return;
    if (VG.updatePlayerInterior) VG.updatePlayerInterior(p, dt, input, INT.active);
    /* The heading is not set here. The pointer sets it, in the room as well
       as on the flats, and the main loop resolves it before the player
       moves so the walking is measured from the direction the figure is
       turned to. */
    /* walking out through the gap in the south wall leaves the building */
    if (INT.active && INT.atDoorway(p)) INT.exit(p);
  };

  INT.updateCamera = function (p, dt, vw, vh) {
    if (!INT.active) return;
    const tpl = INT.active.tpl;
    /* The bottom strip of the canvas belongs to the hotbar and the coach
       line. The room is fitted into the band above them, so the doorway in
       the south wall is always on screen and never behind a slot box.
       Because the fit is computed against that band, the whole room fits at
       every window size - you can always see the way out. */
    const safeH = Math.max(160, vh - INT.MARGIN_BOTTOM);
    const z = VG.clamp(Math.min(vw / tpl.w, safeH / tpl.h), 0.75, 2.0);
    INT.zoom = z;
    const viewW = vw / z;
    const viewH = safeH / z;
    let tx, ty;
    if (viewW >= tpl.w) tx = (tpl.w - viewW) / 2;
    else tx = VG.clamp(p.x - viewW / 2, 0, tpl.w - viewW);
    if (viewH >= tpl.h) ty = (tpl.h - viewH) / 2;
    else ty = VG.clamp(p.y - viewH / 2, 0, tpl.h - viewH);
    const k = 1 - Math.pow(0.0015, dt);
    INT.cam.x += (tx - INT.cam.x) * k;
    INT.cam.y += (ty - INT.cam.y) * k;
  };

  /* Is the player standing in the gap in the south wall? Walking into it is
     the way out. There is no key to press and nothing to find first. */
  INT.atDoorway = function (p) {
    if (!INT.active || !p) return false;
    const tpl = INT.active.tpl;
    const door = INT.doorOf(tpl);
    if (p.y < tpl.h - 22) return false;
    return Math.abs(p.x - door.x) < door.w / 2;
  };

  /* How far is the way out, and which way is it? The compass shows this. */
  INT.doorHint = function (p) {
    if (!INT.active || !p) return null;
    const tpl = INT.active.tpl;
    const door = INT.doorOf(tpl);
    return {
      door: door,
      dist: VG.dist(p.x, p.y, door.x, door.y),
      dx: door.x - p.x,
      dy: door.y - p.y
    };
  };

  /* Where does the mouse point, in interior pixels? */
  INT.screenToLocal = function (sx, sy) {
    const z = INT.zoom || 1;
    return { x: sx / z + INT.cam.x, y: sy / z + INT.cam.y };
  };

  /* ---- targeting ---- */

  INT.findTarget = function (p) {
    if (!INT.active) return null;
    const tpl = INT.active.tpl;
    /* the way out always wins if you are standing in it */
    const door = INT.doorOf(tpl);
    const dd = VG.dist(p.x, p.y, door.x, door.y);
    if (dd < INT.EXIT_REACH) return { kind: 'exit', obj: INT.active.poi, dist: dd };
    let best = null, bd = 58;
    const cs = INT.active.containers;
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      if (c.opened) continue;
      const d = VG.dist(p.x, p.y, c.ix, c.iy);
      if (d < bd) { bd = d; best = { kind: 'container', obj: c, dist: d }; }
    }
    return best;
  };
})(window.VG);
