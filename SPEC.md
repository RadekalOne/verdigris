# VERDIGRIS — data contract

**Setting (locked).** Verdigris Flats, a high-desert company town built around **Copper Mesa Station**, a sodium-cooled reactor. Forty-one years ago the station was declared "safe" and shut down. That same night all 11,000 residents of Verdigris left and were never seen again. The player is a **Survey Office** field investigator reopening the cold cases.

**Tone.** Retro-futurist post-collapse Americana. Dust, copper patina, sodium light, switchboards, paper ledgers. Competent adults, no cartoon jokers.

**Hard rule — originality.** No Fallout names, lore, locations, characters, art, audio, or terminology. Mechanics may echo F76; content must not. Use the vocabulary below, not F76's.

---

## Vocabulary (use these, do not invent parallels to Fallout terms)

| Concept | This game |
|---|---|
| Radiation | **dose** (units: rads) |
| Fallout | **ash** / **corrosive haze** |
| Mutants / zombies | **the Rusted** (machine scavengers), **Drovers** (wild animals gone strange) |
| Faction (paladin etc.) | **The Ledger**, **The Choir**, **Free Line**, plus the neutral **Survey Office** (the player) |
| Junk currency | **scrap** (value `val`) |
| Rarity | **scrap / common / fine / rare / legendary** (0–4) |
| VATS | *no equivalent — do not add one* |
| Quest types | **case** (mystery), **contract** (faction work) |

---

## File 1 — `src/items.js`

Must define exactly two globals. **No other globals. No `export`/`import` syntax** (the game loads plain scripts).

```js
window.VG = window.VG || {};
VG.RARITY = ['scrap','common','fine','rare','legendary'];
VG.RARITY_COLOR = ['#8a8578','#cfcabb','#7fc4d8','#c08ce0','#e8b34a'];
VG.ITEMS = [ /* see shape below */ ];
```

Item shape (every field required unless marked optional):

```js
{
  id: 'rifle_bolt',            // unique snake_case, no spaces
  name: 'Bolt-Action Rifle',   // display name
  cat: 'weapon',               // weapon|armor|aid|ammo|mat|intel|key|misc
  rarity: 2,                   // 0..4
  w: 6,                        // weight in load units
  val: 45,                     // scrap value
  glyph: '⌖',                  // exactly ONE printable char, used as the canvas icon
  desc: 'Pre-war bolt rifle. Reliable, heavy, slow to cycle.',
  stats: { dmg: 34, rate: 2, range: 260, armor: 0, hp: 0, heal: 0, rad: 0, thirst: 0, food: 0 },
  mods: ['accurate', 'heavy'],
  stack: 1,                    // max stack size
  ammo: 'ammo_slug'            // weapons only; must reference an ammo item id
}
```

Rules:
- `stats` always contains **all** numeric keys shown above (use `0` for unused).
- `ammo` only on `cat:'weapon'`. `stack` is `1` for weapons/armor, `1..50` for stacks.
- `glyph` must be a single char that renders in a browser canvas. Prefer geometric/box-drawing/alchemical symbols (`⌖ ✦ ❖ ⌂ ⌁ ⎈ ⊞ ⊠ ⌸ ✧ ⌇ ⍟ ⏣ ✶ ⌾`) and simple ASCII. **Emoji are banned** — they render inconsistently and look cheap.
- 60–75 items total. Distribution: ~14 weapons, ~8 armor, ~8 aid, ~8 ammo, ~18 mats, ~8 intel, ~4 key, ~6 misc.
- Every `cat:'weapon'` must have a matching `ammo` item id that exists.
- Include at least **4 legendary** items with `rarity:4` and real `mods` that the engine reads.

---

## File 2 — `src/cases.js` (cold cases = the mystery system)

```js
window.VG = window.VG || {};
VG.CASES = [ /* see shape below */ ];
```

```js
{
  id: 'case_torque',
  title: 'The Torque Anomaly',
  chapter: 1,                  // 1..4 — a label the Journal prints; the engine gates by file order
  brief: 'Two paragraphs. What the Survey Office believes happened and what is unexplained.',
  clues: [
    {
      id: 'clue_torque_shiftlog',
      name: 'Shift Log, 14 March',
      type: 'log',              // log|photo|object|tape|testimony|body|specimen
      poi: 'substation',        // POI TYPE it hides in; must be a real POI type
      text: 'What the player reads. Concrete, specific, revealing exactly one fact.',
      fact: 'f_torque_over'     // the single fact this clue reveals
    }
  ],
  facts: [
    {
      id: 'f_torque_over',
      label: 'Reactor ran 3% over rated torque',
      desc: 'One or two sentences on what this means.',
      source: 'clue_torque_shiftlog'   // the clue it came from
    }
  ],
  deductions: [
    {
      id: 'd_torque_gov',
      inputs: ['f_torque_over','f_torque_ordered'],   // 2..3 known facts
      output: 'f_torque_sabotage',                    // the NEW fact learned
      label: 'The over-torque was ordered, not a fault',
      note: 'Why this combination implies the conclusion.'
    }
  ],
  solutions: [
    {
      id: 's_torque_1',
      label: 'Someone cut the governor to force an evacuation',
      requires: ['f_torque_sabotage','f_torque_evac'],  // known facts
      epilogue: 'Two paragraphs. What the investigator concludes.',
      reward: { items: ['ledger_token'], rep: { ledger: 2, choir: -1 } }
    }
  ],
  reward: { items: ['case_torque_reward'], rep: { free_line: 1 } }
}
```

Rules:
- **8 cases**, chapters 1–4 (2 per chapter).
- Each case: **4–6 clues**, **7–12 facts**, **4–7 deductions**, **1–2 solutions**.
- Every clue's `fact` must exist in `facts`.
- Every fact's `source` must be a clue id in the same case.
- Every deduction's `inputs` and `output` must exist in `facts`.
- Every solution's `requires` must exist in `facts`.
- **Dependency graph must be acyclic and every fact reachable**: all clue-facts (depth 0) are known by finding clues; deduction outputs are known only after their inputs are known.
- `poi` must be one of the real POI types listed in the engine's POI table.
- Reward `items` must reference item ids from `src/items.js`. If unsure of an id, use the generic ones listed in the engine's guaranteed-item list: `scrap_copper`, `scrap_gear`, `scrap_ceramic`, `field_notebook`, `scrap_cloth`, `scrap_glass`, `scrap_plastic`.
- `rep` keys must be one of: `ledger`, `choir`, `free_line`.
- The 8 cases together must, read in order, form ONE coherent story: the town's evacuation. Each case's epilogue must reference or advance the previous ones without naming F76 concepts.

---

## File 3 — `src/factions.js`

```js
window.VG = window.VG || {};
VG.FACTIONS = [
  { id:'ledger', name:'The Ledger', color:'#7fb4c8', blurb:'Two sentences. Who they are and what they want.' },
  { id:'choir',  name:'The Choir',  color:'#c08ce0', blurb:'...' },
  { id:'free_line', name:'Free Line', color:'#e8b34a', blurb:'...' }
];
VG.QUESTS = [
  {
    id: 'q_ledger_tariffs',
    faction: 'ledger',
    title: 'Manifest Reconciliation',
    desc: 'What the player is asked to do.',
    repNeeded: 0,               // minimum reputation with that faction
    requires: { case: 'case_torque' } | { items: ['scrap_copper'] } | {},
    target: 6,                  // quantity needed, for a gather/fetch contract
    reward: { items: ['scrap_gear'], rep: { ledger: 3 }, xp: 120 }
  }
];
```

Rules:
- Exactly 3 factions. Exactly 1 neutral (the player is Survey Office; do not add a 4th).
- 9–12 contracts spread across the 3 factions, with `requires.case` referencing real case ids where used.
- `reward.rep` keys must be faction ids. `reward.items` must be real item ids.
- Each faction keeps a **post** in the world: `VG.FACTION_POST = { ledger: 'bank', choir: 'chapel', free_line: 'substation' }`. A post is a building the flats already have — the Ledger works out of the bank — so do **not** add a post field to the faction records or a new POI type for it. The engine picks the building, marks it (`poi.post`) and hands a contract in only when the player is standing there.

---

## Engine contract (what your data is allowed to assume)

- The engine reads `VG.ITEMS`, `VG.CASES`, `VG.FACTIONS`, `VG.QUESTS`, `VG.RARITY`, `VG.RARITY_COLOR`, and `VG.CASE_QUESTIONS` (the question the Office asks about each deduction, keyed by deduction id).
- The engine works **one file at a time**, in the order the cases appear in the data. Only the open file's evidence is in the world at all; closing a file opens the next one and puts its evidence into the flats.
- The engine places each clue at a POI of the matching `poi` type, inside that building's room. The building is never marked on the map until the player has charted it.
- The engine asks each deduction as a **question** (`VG.CASE_QUESTIONS[deduction.id]`). The player answers with the claim they believe and the evidence they cite. Both must be right. A theory the engine refuses is recorded on the file and **every** refused theory costs a point of standing with the Ledger — not only the first on a question. The Office gives one neutral answer for a wrong theory and never says which half of it was wrong, and the claims are shuffled per question with a fixed seed so the right one does not sit in the same place twice.
- The engine surfaces `cases[].facts` in the Journal as **Evidence**, `cases[].deductions` as **Deductions** the player can assemble, and `cases[].solutions` as **Conclusions**. A file with more than one solution is a fork: the player files the reading they believe, and may reopen the file later (at a cost) to file the other one.
- Nothing in the engine mutates your objects except `reward.rep` values.
- Do not reference `chapter` for gating logic — the engine handles the file order and the chapter unlocks. `chapter` is a label the Journal prints.
- The flats push back, and the push is in the engine, not in your data: `VG.ENEMY_SPEED` (rusted 138, warden 152, drover 170, against a player walk of 132 and a sprint of 205), `VG.LUNGE` (the windup, the range, the speed, the distance and the cooldown of the telegraphed lunge), `VG.aggroRange(p)` (240 by day, 300 at night), `VG.CARRY` (140 load). A kill pays out through `VG.ENEMY_DROP` and respects the pack; a recipe with `station: 'bench'` needs a bench in the room the player is standing in.
- A kill pays out **two stacks at a floor**: a Rusted or a Drover leaves about three and a half units and never less than two, and a Warden leaves about seven. Copper carries the economy — eight copper is about six kills — so its share is set deliberately rather than falling out of splitting the table evenly. The stack count is one knob (`VG.DROP_STACKS`); the table below it is the shape.
- Each faction has one post in the world (`VG.FACTION_POST`): the Ledger at the bank, the Choir at the chapel, Free Line at the substation. The post is the building, outdoors, at its threshold — there is no post room, and **standing never gates physical access to anything**. A contract is handed in only at the post; anywhere else the player is told where the post is and how far it is, and nothing is taken and nothing is paid. The post is marked on the map in the faction's colour once the player has been there. A contract is **settled once** (`player.doneContracts`) — standing is a currency, and one you can earn the same contract twice is not a currency.
- The crate a file's evidence lands in is a pure function of the **seed and the file**, not of what the player has already done. The picker ignores the `opened` flag, and an emptied crate that holds evidence stays searchable instead of being re-armed — so its contents are never paid out a second time and the file can always be closed.
- Placing a file also puts a **guard** on the building that holds its evidence (`VG.spawnGuard`). The guard's id is `g_<clueId>_<poiId>` so a save file can remember that you already killed it. Do not add guard data to the case files — the guard belongs to the evidence, and the evidence is what moves.
- A file is placed in the world **once** (`world.casesPlaced`). Placing it twice would scatter a second copy of its evidence into a second building.
- **One question decides whether a crate can be reached, drawn or searched**: `VG.crateSearchable(c, p)` - unsearched, or emptied but holding evidence the player has not read. The outdoor targeting, the indoor targeting and the interior painter all ask it. They used to ask three different questions, and the E key could not reach evidence filed in an emptied crate.
- A crate has three states and a save keeps all three: untouched, **partial** (searched, pack was full; `save.partial` holds what is left in it and any surprise) and `opened`. A partial crate is never re-rolled.
- **Experience is paid through `VG.addXp(p, n)` and nowhere else.** The grade is `VG.levelForXp(xp)` (grades start at 0, 300, 800, 1500 ... = `100 * (L-1) * (L+1)`), and what a grade is worth is applied from the level by `VG.applyGrade` (`maxhp = 100 + 8 per grade`) and `VG.carryCap(p)` (`VG.CARRY + 6 per grade`). A save's `level` is not trusted; it is worked out from `xp` on load. Use `VG.carryCap(p)`, not `VG.CARRY`, for the pack limit.
- A new survey starts at `VG.START_TIME` (noon on the clock face). The raw counter is offset from the clock - see `VG.hourOfDay` - so do not write a start time as `hours * 3600`.
- `src/fx.js` (`VG.FX`) is feedback only: shake, sparks, the loot feed, the banner, the saved pip. **Nothing in it may change a rule**, every call site is guarded with `if (VG.FX)`, and the game must play identically with the file missing.
- The survey saves itself (`VG.autosave`): every `VG.AUTOSAVE_EVERY` seconds, at a door, when a file closes, after coming to at the trailer, and when the tab is hidden or closed. Going down costs nothing from the pack and tops water and food up to 45, so a surveyor who died of thirst cannot die of it again on waking.

**Output style:** plain ES5-compatible JS, `var`/`const` is fine, 2-space indent, one trailing newline, no comments longer than one line. Total file size under 60 KB each.
