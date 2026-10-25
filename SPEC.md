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
  chapter: 1,                  // 1..4, used for gating
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

---

## Engine contract (what your data is allowed to assume)

- The engine reads `VG.ITEMS`, `VG.CASES`, `VG.FACTIONS`, `VG.QUESTS`, `VG.RARITY`, `VG.RARITY_COLOR`.
- The engine places every clue at a POI of the matching `poi` type inside its case's `chapter` region of the world.
- The engine surfaces `cases[].facts` in the Journal as **Evidence** (facts the player knows), `cases[].deductions` as **Deductions** the player can assemble by picking two known facts, and `cases[].solutions` as **Conclusions** (multi-fact).
- Nothing in the engine mutates your objects except `reward.rep` values.
- Do not reference `chapter` for gating logic — the engine handles chapter unlocks.

**Output style:** plain ES5-compatible JS, `var`/`const` is fine, 2-space indent, one trailing newline, no comments longer than one line. Total file size under 60 KB each.
