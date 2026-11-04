/* VERDIGRIS - the survey's case flow
   ------------------------------------------------------------------
   The Survey Office works one file at a time. A file is opened, its
   evidence is somewhere in the flats, and when the file is closed the
   Office opens the next one.

   That is the whole difference between a mystery and a spreadsheet. With
   every case open at once and every clue marked on the map, the player is
   handed the answer before they take a step and there is nothing to look
   for. With one file open, its evidence is a place to look for - and the
   only way to know which building is the right one is to go and look.

   The order of the files is the order they appear in the case data, which
   is also the order the epilogues describe: closing a file names the next
   one ("Next file: the town's own ledgers"), and this module makes the
   engine agree with the prose. */
window.VG = window.VG || {};
(function (VG) {
  'use strict';

  /* the files, in the order the Office works them */
  VG.caseOrder = function () { return VG.allCases(); };

  VG.caseClosed = function (c, p) {
    return !!(c && p && p.solvedSolutions && (p.solvedSolutions[c.id] || []).length);
  };

  /* How many files are closed. The Office does not skip a file, so the
     closed ones are always a prefix of the order - and that prefix is
     what a save file needs in order to rebuild the world. */
  VG.closedCount = function (p) {
    const all = VG.caseOrder();
    let n = 0;
    for (let i = 0; i < all.length; i++) {
      if (VG.caseClosed(all[i], p)) n++; else break;
    }
    return n;
  };

  /* The file the Office is working: the first one that is not closed. */
  VG.openCase = function (p) {
    const all = VG.caseOrder();
    const n = VG.closedCount(p);
    return n < all.length ? all[n] : null;
  };

  VG.caseIsOpen = function (c, p) {
    const o = VG.openCase(p);
    return !!o && !!c && o.id === c.id;
  };

  /* The kinds of building a file still needs: the POI type of every clue
     the player has not read yet. A file that needs a Sheriff Post says so,
     and the player goes looking for a sheriff post. */
  VG.caseWantedTypes = function (c, p) {
    if (!c) return [];
    const out = [];
    for (const cl of (c.clues || [])) {
      if (p && p.readClues && p.readClues[cl.id]) continue;
      if (cl.poi && out.indexOf(cl.poi) < 0) out.push(cl.poi);
    }
    return out;
  };

  /* the kinds of building the open file needs */
  VG.wantedTypes = function (p) { return VG.caseWantedTypes(VG.openCase(p), p); };

  /* The journal line for a clue that has not been found. It names the kind
     of building, because that is the thing the player can act on - the raw
     data key ("search the police") is a note to self, not a lead. */
  VG.clueLead = function (cl) {
    const t = VG.poiTypeName(cl && cl.poi);
    return 'Search the ' + t + ' - the Office has not charted which one.';
  };

  /* The clues worth drawing on a map: the ones the player has actually
     read. A clue that has not been found is a place to look for, not a
     place to walk to, and marking it hands the player the whole mystery
     before they have taken a step. */
  VG.visibleClues = function (world, p) {
    if (!world || !world.clues) return [];
    const read = (p && p.readClues) || {};
    const out = [];
    for (const cl of world.clues) {
      if (read[cl.id]) out.push(cl);
    }
    return out;
  };

  /* Put the evidence for every file up to and including the open one back
     into the world. The save file stores the seed and rebuilds the world
     from it, so this has to reproduce the placement exactly - otherwise a
     reloaded survey finds its evidence in different crates and a file can
     become impossible to close. */
  VG.rebuildOpenClues = function (world, p) {
    const all = VG.caseOrder();
    const n = VG.closedCount(p);
    for (let i = 1; i <= n && i < all.length; i++) {
      VG.placeClues(world, all[i]);
    }
    return world;
  };

  /* ---------------------------------------------------------------- */
  /* the questions
     ---------------------------------------------------------------- */

  /* A deduction is ready to be asked when the player holds every fact it
     rests on. The Office does not ask a question the player cannot answer. */
  VG.deductionReady = function (ded, p) {
    if (!ded || !p) return false;
    const known = p.knownFacts || {};
    return (ded.inputs || []).every((i) => !!known[i]);
  };

  /* The questions the Office is waiting to ask: the deductions whose
     evidence the player holds and whose claim they have not established
     yet. */
  VG.openQuestions = function (cse, p) {
    if (!cse) return [];
    const known = (p && p.knownFacts) || {};
    const out = [];
    for (const d of (cse.deductions || [])) {
      if (known[d.output]) continue;
      if (!VG.deductionReady(d, p)) continue;
      out.push(d);
    }
    return out;
  };

  /* The claims the player may choose between. They are the claims the file
     itself makes, so several of them are always plausible for any one
     question - which is the point. The evidence is what settles it. */
  VG.caseAnswers = function (cse) {
    if (!cse) return [];
    const facts = cse.facts || [];
    const out = [];
    for (const d of (cse.deductions || [])) {
      const f = facts.find((x) => x.id === d.output);
      if (f) out.push({ id: f.id, label: f.label, known: false });
    }
    return out;
  };

  /* Answer a question. The player states the claim they believe and cites
     the evidence for it. Both have to be right, and the evidence has to be
     the evidence and not a pile of everything they happen to know.

     A wrong answer is a theory the Office did not accept, and the Office
     keeps a record of those. The first mistake on a question costs a point
     of standing with the Ledger; after that the point has been made and
     the file is not charged for it twice. */
  VG.answerQuestion = function (cse, dedId, answerId, evidence, p) {
    if (!cse || !p) return { ok: false, reason: 'No file is open.' };
    const d = (cse.deductions || []).find((x) => x.id === dedId);
    if (!d) return { ok: false, reason: 'That is not a question this file asks.' };
    const known = p.knownFacts || {};
    if (known[d.output]) return { ok: false, reason: 'The Office has already accepted that answer.' };

    const cited = (evidence || []).slice().sort();
    const want = (d.inputs || []).slice().sort();
    const sameEvidence = cited.length === want.length && cited.every((x, i) => x === want[i]);
    const rightClaim = (answerId === d.output);

    if (!rightClaim || !sameEvidence) {
      if (!p.rejectedTheories) p.rejectedTheories = {};
      const first = !p.rejectedTheories[dedId];
      p.rejectedTheories[dedId] = (p.rejectedTheories[dedId] || 0) + 1;
      let cost = 0;
      if (first) {
        cost = 1;
        p.rep = p.rep || {};
        p.rep.ledger = (p.rep.ledger || 0) - 1;
      }
      const fact = (cse.facts || []).find((x) => x.id === d.output);
      return {
        ok: false,
        cost: cost,
        reason: !rightClaim
          ? 'The Office does not accept that reading.'
          : 'That is not the evidence for it.'
      };
    }

    known[d.output] = cse.id;
    const fact = (cse.facts || []).find((x) => x.id === d.output);
    return { ok: true, note: d.note, label: fact ? fact.label : d.output };
  };

  /* ---------------------------------------------------------------- */
  /* the conclusions
     ---------------------------------------------------------------- */

  /* The conclusions the player could file, and whether each is supported
     by the evidence they hold. A file with more than one conclusion is a
     fork: both are real readings, and the player is the one who decides
     which one goes on the file. */
  VG.conclusionOptions = function (cse, p) {
    if (!cse) return [];
    const known = (p && p.knownFacts) || {};
    const filed = (p && p.solvedSolutions && p.solvedSolutions[cse.id]) || [];
    const out = [];
    for (const s of (cse.solutions || [])) {
      const ready = (s.requires || []).every((r) => !!known[r]);
      out.push({
        sol: s,
        ready: ready,
        filed: filed.indexOf(s.id) >= 0,
        requires: s.requires || []
      });
    }
    return out;
  };

  /* The conclusion currently on the file. A file can be reopened and
     amended, so this is the last one filed, not the first. */
  VG.filedConclusion = function (cse, p) {
    if (!cse || !p) return null;
    const list = (p.solvedSolutions && p.solvedSolutions[cse.id]) || [];
    return list.length ? list[list.length - 1] : null;
  };

  /* Can the file be reopened? Only if the player has the evidence for a
     reading that is not the one on the file. There is nothing to reopen it
     for otherwise. */
  VG.canAmend = function (cse, p) {
    if (!cse || !p) return false;
    const current = VG.filedConclusion(cse, p);
    if (!current) return false;
    const filed = (p.solvedSolutions && p.solvedSolutions[cse.id]) || [];
    const known = p.knownFacts || {};
    for (const s of (cse.solutions || [])) {
      if (filed.indexOf(s.id) >= 0) continue;
      if ((s.requires || []).every((r) => !!known[r])) return true;
    }
    return false;
  };

  /* The cost of changing your mind: two points of standing with the
     Ledger, and the reading you are withdrawing is struck from the file. */
  VG.AMEND_COST = 2;
})(window.VG);
