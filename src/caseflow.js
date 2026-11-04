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
})(window.VG);
