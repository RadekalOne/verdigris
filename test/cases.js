/* VERDIGRIS - the search loop and the file handover
   Run: node test/cases.js

   The survey used to hand the player every clue in the world at once and
   draw all forty-seven of them on the map, so there was nothing to look for:
   the mystery was solved on the minimap before the player took a step. The
   journal printed the raw data key ("search the police") instead of the kind
   of building, so even a clue you did find told you nothing you could act
   on, and every case file was open from the first minute.

   This file holds the engine to the opposite, and asserts the rules that
   make a search a search:

     1. A clue you have not found is not on either map.
     2. The journal names the KIND of building, never the raw data key.
     3. Every building says what it is.
     4. Only the file the Office is working is in the world at all.
     5. Closing a file opens the next one and puts its evidence in the world.
     6. Evidence is never placed in a container the player has already
        emptied, so a file can never become impossible to close.
     7. A reloaded world puts the evidence back in the same places, because
        the world is rebuilt from the seed and the placement must survive.

   The rule this file follows: assert the ENGINE PATH, not the data shape.
   "Every clue has a poi key" is a shape check and it would pass on a game
   where every clue is already marked on the map. What matters is that a
   player has to walk to a building they cannot yet name. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = {
  window: {},
  console,
  performance: { now: () => Date.now() },
  Math, JSON, Date,
  setTimeout: () => 0,
  clearTimeout: () => { },
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
      style: {}, appendChild: () => { }, removeChild: () => { },
      set innerHTML (v) { }, get innerHTML () { return ''; }, children: []
    })
  },
  localStorage: { getItem: () => null, setItem: () => { } }
};
sandbox.window.addEventListener = () => { };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function load(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { console.log('  MISSING ' + rel); return false; }
  vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p });
  return true;
}

let fail = 0;
const ok = (cond, msg) => { if (!cond) { console.log('  FAIL ' + msg); fail++; } else console.log('  ok   ' + msg); };

console.log('== loading modules ==');
/* audio.js, help.js and the living-flats module are left out on purpose: they
   touch the DOM and the event loop, and none of them carries a rule this
   file is about. */
['src/core.js', 'src/items.js', 'src/factions.js', 'src/cases.js', 'src/cases_b.js',
  'src/world.js', 'src/case_questions.js', 'src/caseflow.js', 'src/loot.js', 'src/player.js', 'src/interiors.js',
  'src/ui.js', 'src/main.js'].forEach((f) => {
    if (!load(f)) fail++;
  });

const VG = sandbox.window.VG;
if (!VG) { console.log('FATAL: VG never defined'); process.exit(1); }
VG.itemIndex();

const ALL = VG.allCases();
const FIRST = ALL[0];
const SECOND = ALL[1];

console.log('\n== what the maps show ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;
  VG.INT.prepare(w);

  ok(typeof VG.visibleClues === 'function', 'the engine exposes which clues are worth showing');
  const none = VG.visibleClues(w, p);
  ok(none.length === 0, 'a player who has found nothing sees no clue markers (' + none.length + ')');

  const cl = w.clues[0];
  p.readClues[cl.id] = true;
  const one = VG.visibleClues(w, p);
  ok(one.length === 1 && one[0].id === cl.id, 'a clue you have read is on the map');

  /* and the map drawing must use that list, not the raw clue list */
  const ui = fs.readFileSync(path.join(ROOT, 'src/ui.js'), 'utf8');
  ok(/for \(const cl of VG\.visibleClues\(/.test(ui),
    'both maps draw the visible clues rather than every clue in the world');
}

console.log('\n== the journal names the building ==');
{
  ok(VG.poiTypeName('police') === 'Sheriff Post', 'the sheriff post is called a Sheriff Post, not "police"');
  ok(VG.poiTypeName('reactor_yard') === 'Reactor Yard', 'the reactor yard is called a Reactor Yard');
  ok(VG.poiTypeName('watertower') === 'Water Tower', 'the water tower is called a Water Tower');

  const cl = { id: 'clue_x', poi: 'police', name: 'Switchboard Key Ledger' };
  const lead = VG.clueLead(cl);
  ok(lead.indexOf('Sheriff Post') >= 0, 'the lead names the kind of building: "' + lead + '"');
  ok(lead.indexOf('police') < 0, 'the lead never prints the raw data key');
  ok(lead.indexOf('flats') < 0, 'the lead never falls back to a vague place');
}

console.log('\n== every building says what it is ==');
{
  const w = VG.genWorld(4242);
  let unnamed = 0, samples = [];
  for (const poi of w.pois) {
    const t = VG.poiTypeName(poi.type);
    if (poi.name.indexOf(t) < 0) { unnamed++; if (samples.length < 5) samples.push(poi.name + ' [' + poi.type + ']'); }
  }
  ok(unnamed === 0, 'every building carries its type in its name' +
    (unnamed ? ' MISSING ' + unnamed + ' e.g. ' + samples.join(' | ') : ''));

  /* the compass, the door prompt and the survey line all print the name, so
     one name reaches all three */
  const ui = fs.readFileSync(path.join(ROOT, 'src/ui.js'), 'utf8');
  const main = fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8');
  ok(ui.indexOf('tgt.poi.name') >= 0, 'the compass prints the building name');
  ok(main.indexOf('target.obj.name') >= 0, 'the door prompt prints the building name');
}

console.log('\n== one file at a time ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;

  ok(VG.openCase(p) && VG.openCase(p).id === FIRST.id,
    'the Office starts with the first file (' + (VG.openCase(p) || {}).id + ')');
  ok(w.clues.length === FIRST.clues.length,
    'only the open file is in the world (' + w.clues.length + ' clues for ' + FIRST.clues.length + ' wanted)');
  const foreign = w.clues.filter((c) => c.caseId !== FIRST.id);
  ok(foreign.length === 0, 'no clue from a later file is in the world');
  const later = ALL[3];
  const laterInWorld = w.clues.filter((c) => c.caseId === later.id).length;
  ok(laterInWorld === 0, 'a file three chapters away has nothing in the world');

  /* a sealed file cannot be closed, however much evidence you somehow hold */
  const q = VG.newPlayer(w);
  const openFacts = {};
  for (const f of (FIRST.facts || [])) openFacts[f.id] = true;
  q.knownFacts = openFacts;
  ok(VG.canConclude(FIRST, q) !== null, 'the open file can be concluded when its evidence is held');
  const sealedFacts = {};
  for (const f of (SECOND.facts || [])) sealedFacts[f.id] = true;
  q.knownFacts = sealedFacts;
  ok(VG.canConclude(SECOND, q) === null, 'a sealed file cannot be concluded');
}

console.log('\n== the handover ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;
  VG.INT.prepare(w);

  const logs = [];
  const realLog = VG.log;
  VG.log = (m) => { logs.push(String(m)); };

  const sol = (FIRST.solutions || [])[0];
  /* a conclusion can only be filed on the evidence, so the player has to
     have the facts before the file can be closed */
  for (const f of (FIRST.facts || [])) p.knownFacts[f.id] = FIRST.id;
  VG.conclude(FIRST, sol);

  const open = VG.openCase(p);
  ok(open && open.id === SECOND.id, 'closing a file opens the next one (' + (open || {}).id + ')');
  ok(w.clues.length === (FIRST.clues.length + SECOND.clues.length),
    'the next file\'s evidence is in the world (' + w.clues.length + ' clues)');
  const nextClues = w.clues.filter((c) => c.caseId === SECOND.id);
  ok(nextClues.length === SECOND.clues.length, 'every clue of the next file was placed');

  const said = logs.join(' | ');
  ok(said.indexOf(SECOND.title) >= 0, 'the handover says which file is open ("' + said.slice(0, 90) + '...")');
  const wanted = VG.caseWantedTypes(SECOND, p).map((k) => VG.poiTypeName(k)).join(', ');
  ok(said.indexOf(wanted.split(',')[0]) >= 0, 'the handover says what kind of building to look for');

  VG.log = realLog;
}

console.log('\n== the file points at the right kind of building ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;
  const want = VG.wantedTypes(p);
  const expect = [];
  for (const cl of (FIRST.clues || [])) if (expect.indexOf(cl.poi) < 0) expect.push(cl.poi);
  ok(want.length === expect.length, 'the open file wants ' + expect.length + ' kinds of building');
  ok(want.every((k) => expect.indexOf(k) >= 0), 'the wanted kinds are the kinds the clues sit in');
  ok(want.every((k) => !!VG.poiTypeName(k)), 'every wanted kind has a readable name');
}

console.log('\n== nothing can be lost ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;
  VG.INT.prepare(w);

  /* the player empties every crate in the world before the next file opens */
  for (const c of w.containers) c.opened = true;
  for (const f of (FIRST.facts || [])) p.knownFacts[f.id] = FIRST.id;
  VG.conclude(FIRST, (FIRST.solutions || [])[0]);

  const placed = w.clues.filter((c) => c.caseId === SECOND.id);
  ok(placed.length === SECOND.clues.length, 'the next file still gets all of its evidence');
  const buried = placed.filter((c) => w.containers[c.container] && w.containers[c.container].opened);
  ok(buried.length === 0, 'no evidence was placed in a crate the player had already emptied');
  const wrongType = [];
  for (const c of placed) {
    const poi = w.poiById(w.containers[c.container].poi);
    const cl = SECOND.clues.find((x) => x.id === c.id);
    if (!poi || !cl || poi.type !== cl.poi) wrongType.push(c.id + ' -> ' + (poi ? poi.type : 'none'));
  }
  ok(wrongType.length === 0, 'every clue is still in the kind of building the journal names' +
    (wrongType.length ? ' BAD ' + wrongType.join(', ') : ''));
}

console.log('\n== the Office asks you to answer for it ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;

  /* every deduction in every file has to have a question, or the Office is
     asking nothing and the player is back to spotting pairs */
  let noQuestion = [];
  for (const c of ALL) {
    for (const d of (c.deductions || [])) {
      if (!VG.questionFor(d.id)) noQuestion.push(d.id);
    }
  }
  ok(noQuestion.length === 0, 'every deduction has a question the Office asks' +
    (noQuestion.length ? ' MISSING ' + noQuestion.slice(0, 6).join(', ') : ''));

  /* the question only becomes askable once the player holds the evidence */
  const ded = FIRST.deductions[0];
  ok(VG.openQuestions(FIRST, p).length === 0, 'no question is asked before the evidence is in hand');
  for (const i of ded.inputs) p.knownFacts[i] = FIRST.id;
  const live = VG.openQuestions(FIRST, p);
  ok(live.length === 1 && live[0].id === ded.id, 'the question opens when its evidence is held');

  /* the answers are the claims of the file, not a yes/no */
  const answers = VG.caseAnswers(FIRST);
  ok(answers.length === FIRST.deductions.length, 'the player chooses between ' + answers.length + ' claims');
  ok(answers.some((a) => a.id === ded.output), 'the right answer is among them');
  ok(answers.some((a) => a.id !== ded.output), 'and so are the wrong ones');

  /* a wrong theory is rejected, and it costs */
  const repBefore = p.rep.ledger || 0;
  const wrong = VG.answerQuestion(FIRST, ded.id, 'not_a_fact', ded.inputs.slice(), p);
  ok(!wrong.ok, 'a wrong answer is rejected');
  ok((p.rep.ledger || 0) < repBefore, 'a rejected theory costs standing with the Ledger');
  ok(p.knownFacts[ded.output] === undefined, 'a rejected theory establishes nothing');

  /* the wrong evidence is rejected the same way, and only the first mistake
     on a question costs - the Office makes its point once */
  const repAfter = p.rep.ledger || 0;
  const wrong2 = VG.answerQuestion(FIRST, ded.id, ded.output, [ded.inputs[0]], p);
  ok(!wrong2.ok, 'citing the wrong evidence is rejected');
  ok((p.rep.ledger || 0) === repAfter, 'the second mistake on the same question is free');

  /* the right answer with the right evidence opens the fact */
  const right = VG.answerQuestion(FIRST, ded.id, ded.output, ded.inputs.slice(), p);
  ok(right.ok, 'the right answer with the right evidence is accepted');
  ok(p.knownFacts[ded.output] === FIRST.id, 'the fact is established');
  ok(VG.openQuestions(FIRST, p).length === 0, 'the answered question closes');
}

console.log('\n== a conclusion is a choice ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;
  const FORK = ALL.find((c) => (c.solutions || []).length > 1);
  ok(!!FORK, 'a file with two conclusions exists to fork on');

  /* the player must be able to choose, not have the engine choose */
  const opts = VG.conclusionOptions(FORK, p);
  ok(opts.length === FORK.solutions.length, 'both conclusions are offered');
  ok(opts.every((o) => !o.ready), 'neither is fileable before the evidence is held');

  /* work the files up to the fork so it is the open one */
  for (const c of ALL) {
    if (c.id === FORK.id) break;
    for (const f of (c.facts || [])) p.knownFacts[f.id] = c.id;
    const s = VG.canConclude(c, p);
    if (s) VG.fileConclusion(c, s.id, p);
  }
  ok(VG.openCase(p) && VG.openCase(p).id === FORK.id, 'the forked file is the open one');

  for (const f of FORK.facts) p.knownFacts[f.id] = FORK.id;
  const ready = VG.conclusionOptions(FORK, p);
  ok(ready.filter((o) => o.ready).length === FORK.solutions.length,
    'both conclusions become fileable once the file is worked through');

  /* filing the first one closes the file with that reading */
  const first = ready.find((o) => o.ready);
  VG.fileConclusion(FORK, first.sol.id, p);
  ok(VG.filedConclusion(FORK, p) === first.sol.id, 'the filed conclusion is the one the player chose');
  ok(VG.caseClosed(FORK, p), 'the file is closed');

  /* and the other reading can be reached later, by reopening the file at a
     price - that is the cost of changing your mind */
  ok(VG.canAmend(FORK, p), 'the file can be reopened once the other reading is supported');
  const repBefore = p.rep.ledger || 0;
  const other = FORK.solutions.find((s) => s.id !== first.sol.id);
  const oldItems = (first.sol.reward && first.sol.reward.items) || [];
  const oldItem = oldItems.length ? oldItems[0] : null;
  const heldBefore = oldItem ? (VG.invCount(p, oldItem) || 0) : 0;
  VG.amendConclusion(FORK, other.id, p);
  ok((p.rep.ledger || 0) < repBefore, 'reopening the file costs standing with the Ledger');
  ok(VG.filedConclusion(FORK, p) === other.id, 'the amended conclusion is the one on the file');
  ok(VG.caseClosed(FORK, p), 'the file is still closed after the amendment');
  ok(!VG.canAmend(FORK, p), 'a file cannot be reopened twice for the same reading');
  /* the reading that was struck out must not pay twice */
  if (oldItem) {
    ok((VG.invCount(p, oldItem) || 0) < heldBefore,
      'the goods the withdrawn reading paid in are taken back');
  }
  const newItems = (other.reward && other.reward.items) || [];
  if (newItems.length) {
    ok((VG.invCount(p, newItems[0]) || 0) > 0, 'the reading now on the file pays its goods');
  }
}

console.log('\n== the ending is the player\'s ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;
  /* close every file, taking the SECOND reading wherever there is one */
  for (const c of ALL) {
    for (const f of (c.facts || [])) p.knownFacts[f.id] = c.id;
    const opts = VG.conclusionOptions(c, p).filter((o) => o.ready);
    if (!opts.length) continue;
    const pick = opts[opts.length - 1];
    VG.fileConclusion(c, pick.sol.id, p);
  }
  const allClosed = ALL.every((c) => VG.filedConclusion(c, p));
  ok(allClosed, 'every file carries the conclusion the player chose');
  /* the ending must list what was filed, not what the data says first */
  const forks = ALL.filter((c) => (c.solutions || []).length > 1);
  let wrong = [];
  for (const c of forks) {
    const fid = VG.filedConclusion(c, p);
    if (fid === (c.solutions || [])[0].id) wrong.push(c.id);
  }
  ok(wrong.length === 0, 'the ending follows the player\'s reading, not the data order' +
    (wrong.length ? ' WRONG ' + wrong.join(', ') : ''));
}

console.log('\n== a reloaded world is the same world ==');
{
  /* the save stores the seed and rebuilds the world from it, so the evidence
     has to land in the same crates after a reload or a file can become
     impossible to close */
  const w1 = VG.genWorld(9090);
  const p1 = VG.newPlayer(w1);
  VG.Player = p1;
  VG.INT.prepare(w1);
  for (const f of (FIRST.facts || [])) p1.knownFacts[f.id] = FIRST.id;
  VG.conclude(FIRST, (FIRST.solutions || [])[0]);
  const before = {};
  for (const c of w1.clues) before[c.id] = w1.poiById(w1.containers[c.container].poi).id;

  const w2 = VG.genWorld(9090);
  const p2 = VG.newPlayer(w2);
  VG.Player = p2;
  p2.solvedSolutions[FIRST.id] = [(FIRST.solutions || [])[0].id];
  VG.rebuildOpenClues(w2, p2);
  VG.INT.prepare(w2);

  const after = {};
  for (const c of w2.clues) after[c.id] = w2.poiById(w2.containers[c.container].poi).id;

  const moved = Object.keys(before).filter((id) => before[id] !== after[id]);
  ok(moved.length === 0, 'every piece of evidence is in the same building after a reload' +
    (moved.length ? ' MOVED ' + moved.join(', ') : ''));
  ok(Object.keys(after).length === Object.keys(before).length, 'no evidence is lost by the reload');
}

console.log('\n== the world still holds together ==');
{
  const w = VG.genWorld(4242);
  const p = VG.newPlayer(w);
  VG.Player = p;
  VG.INT.prepare(w);
  ok(w.pois.length >= 60, 'pois ' + w.pois.length);
  ok(w.containers.length >= 90, 'containers ' + w.containers.length);
  ok(w.clues.length === FIRST.clues.length, 'the world carries only the open file');
  const inside = w.clues.filter((c) => w.containers[c.container] && w.containers[c.container].inside);
  ok(inside.length === w.clues.length,
    'every clue is inside a building, where the player has to go and look (' + inside.length + '/' + w.clues.length + ')');
  /* one clue per crate. Two pieces of evidence in one crate means one of
     them can never be found. */
  const cons = new Set(w.clues.map((c) => c.container));
  ok(cons.size === w.clues.length, 'every clue has a crate of its own (' + cons.size + '/' + w.clues.length + ')');
  const holding = w.containers.filter((c) => c.clueId).length;
  ok(holding === w.clues.length, 'no crate holds two pieces of evidence (' + holding + ' crates hold ' + w.clues.length + ' clues)');
  const types = new Set(w.pois.map((x) => x.type));
  let missing = [];
  for (const t of VG.POI_TYPES) if (!types.has(t.key)) missing.push(t.key);
  ok(missing.length === 0, 'every POI type present' + (missing.length ? ' MISSING ' + missing.join(',') : ''));
}

console.log(fail ? '\nFAILED ' + fail + ' check(s)' : '\nall checks passed');
process.exit(fail ? 1 : 0);
