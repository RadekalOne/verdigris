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

  /* The reactor yard is the one place on the map that kills a surveyor who
     walks in unprepared. The Office knows its own plant, so the file says so
     rather than letting the player find out the hard way - and it says where
     the answer is, because a warning the player cannot act on is a trap with
     better manners. Empty string when the file does not want the yard. */
  VG.yardWarning = function (cse, p) {
    const want = VG.caseWantedTypes(cse, p);
    if (want.indexOf('reactor_yard') < 0) return '';
    return 'The reactor yard\'s air will kill you without a filter. The relay stations keep them.';
  };

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
  VG.caseAnswers = function (cse, p) {
    if (!cse) return [];
    const facts = cse.facts || [];
    const known = (p && p.knownFacts) || {};
    const out = [];
    for (const d of (cse.deductions || [])) {
      const f = facts.find((x) => x.id === d.output);
      if (f) out.push({ id: f.id, label: f.label, known: !!known[f.id] });
    }
    return out;
  };

  /* The order the claims are listed in, for one question.

     They used to be listed in the order the file's deductions are written
     down, which meant the first option always answered the first question
     and the second option always answered the second. A player who chose
     "the first one" on every question would have closed the file without
     reading a word of it - the questions were a filing exercise with extra
     steps.

     Each question now has its own order. It is fixed for the life of the
     file, so it does not shuffle under the player's hands between clicks,
     and it does not shuffle when the survey is saved and reloaded - but it
     is different from question to question, so there is no rule to learn. */
  function seedOf(str) {
    let h = 2166136261;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  VG.questionAnswers = function (cse, dedId, p) {
    const all = VG.caseAnswers(cse, p);
    if (all.length < 2) return all;
    const byId = {};
    for (const a of all) byId[a.id] = a;
    const rng = VG.makeRng(seedOf((cse.id || '') + '|' + dedId));
    const order = rng.shuffle(all.map((a) => a.id));
    const out = [];
    for (const id of order) if (byId[id]) out.push(byId[id]);
    return out;
  };

  /* Every question the file asks, from the moment the file opens.

     A question used to appear only once the player held every fact it
     rested on - which meant that reading a fact announced, by the fact
     showing up in the question list, that it was one of the inputs. The
     player was being told which evidence to go and look for, and the
     mystery was being handed over one fact at a time.

     The Office asks all of its questions at once. The ones you cannot
     answer yet are greyed, and you go and find out. */
  VG.fileQuestions = function (cse, p) {
    if (!cse) return [];
    const known = (p && p.knownFacts) || {};
    const out = [];
    for (const d of (cse.deductions || [])) {
      const missing = (d.inputs || []).filter((i) => !known[i]);
      out.push({
        ded: d,
        id: d.id,
        ready: missing.length === 0,
        done: !!known[d.output],
        missing: missing.length,
        question: VG.questionFor(d.id) || d.label
      });
    }
    return out;
  };

  /* Answer a question. The player states the claim they believe and cites
     the evidence for it. Both have to be right, and the evidence has to be
     the evidence and not a pile of everything they happen to know.

     A wrong answer is a theory the Office did not accept, and the Office
     keeps a record of those. Every one of them costs a point of standing
     with the Ledger: it used to cost a point only the first time on a
     question, and that made the questions cheap - a player could try every
     reading and every set of evidence and pay for it once.

     The Office does not say which half of the answer was wrong. It used to,
     and that turned the question into two independent puzzles: pick the
     reading until the Office stopped complaining about the reading, then
     pick the evidence until it stopped complaining about the evidence. A
     question the player can solve by elimination is not a question. */
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
      p.rejectedTheories[dedId] = (p.rejectedTheories[dedId] || 0) + 1;
      const cost = 1;
      p.rep = p.rep || {};
      p.rep.ledger = (p.rep.ledger || 0) - cost;
      return {
        ok: false,
        cost: cost,
        reason: 'The Office does not accept that theory.'
      };
    }

    known[d.output] = cse.id;
    if (VG.addXp) VG.addXp(p, VG.XP.question, true);
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
