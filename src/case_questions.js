/* VERDIGRIS - the questions the Office asks
   ------------------------------------------------------------------
   A deduction used to be a lock with two keys in it: pick the right pair of
   facts and the engine handed you the answer. That is not a mystery, it is
   a filing exercise, and a player who did not understand the case could
   still get through it by trying every combination.

   Each deduction now has a question attached to it. The Office asks it,
   the player answers with the claim they believe and the evidence they are
   citing for it, and the Office either accepts the answer or writes it down
   as a rejected theory - which costs a point of standing, because the
   Office keeps a record of what its investigators got wrong.

   The questions live here rather than inside the case files so that the
   case data stays a data contract and this stays a table of questions. The
   key is the deduction id. */
window.VG = window.VG || {};
(function (VG) {
  'use strict';

  VG.CASE_QUESTIONS = {
    /* --- The Quiet Week: the station that went quiet on 14 March --- */
    d_qw_by_hand: 'Why was the maintenance stub cut away with a blade?',
    d_qw_closed: 'Why was the photograph reel cut clean after frame four?',
    d_qw_no_order: 'Why did nobody in the town ever leave?',
    d_qw_admin: 'Who filed the station\'s death in the ordinary course of business?',

    /* --- The Ledger Gap: eight weeks cut out of two ledgers --- */
    d_lg_same_weeks: 'Why are the same eight weeks missing from two separate offices?',
    d_lg_town_there: 'Why was the ration book signed every day through the gap?',
    d_lg_sanitized: 'Why was a certificate of completeness filed two months before the books were cut?',
    d_lg_ordered: 'Why did the last store in the town close with its shelves still full?',
    d_lg_two_events: 'Why did the shutdown and the departure happen weeks apart?',
    d_lg_office: 'Why does the town\'s own census card point at this Office\'s file?',

    /* --- The Torque Anomaly: a scram that was arranged --- */
    d_tq_commanded: 'Why was the plant running three per cent over rated torque?',
    d_tq_cut: 'Why was the governor bypassed?',
    d_tq_scram: 'Why did the station scram in the middle of an ordinary night shift?',
    d_tq_ordered: 'Who ordered the scram, and how long before it happened?',
    d_tq_first: 'Why was Copper Mesa the first thing the Survey Office looked at?',

    /* --- The Shelter Inventory: thirty days of stores, ready --- */
    d_si_prepared: 'Why was thirty days of stores standing ready in sealed shelters?',
    d_si_not_chaos: 'Why were the shelter inventories printed in advance?',
    d_si_locked_in: 'Why were the shelter doors locked from the outside?',
    d_si_civilians: 'Who was inside those shelters when the doors were dogged?',
    d_si_above: 'Who authorised the sealing?',

    /* --- The Relay on Air: a station that never stopped talking --- */
    d_rb_manned: 'Who is still signing for fuel at the relay?',
    d_rb_occupied: 'Why was diesel bought two months after the shutdown?',
    d_rb_no_departure: 'Why does a record of eleven thousand departures exist at all?',
    d_rb_population: 'How many people were still living in Verdigris that week?',
    d_rb_today: 'Who lives at Copper Mesa tonight?',
    d_rb_terminal: 'Did the eleven thousand ever leave?',

    /* --- The Sealed Air: a town sealed, a country left in the storm --- */
    d_sw_deliberate: 'Why was the seal ordered to the hour the front arrived?',
    d_sw_contrast: 'Why did the country take the storm raw while the town did not?',
    d_sw_intended: 'Was the exposure of the flats part of the plan?',
    d_sw_hazard: 'Was the storm the method, or the excuse?',
    d_sw_doors: 'Who dogged the shelter doors, and when?',
    d_sw_terminal: 'What did the country pay for the town\'s protection?',

    /* --- Eleven Thousand Breakfasts: a town that kept eating --- */
    d_lc_present: 'How many people were eating in Verdigris after the town was supposed to be empty?',
    d_lc_rail: 'How did eleven thousand people leave a county town without a road?',
    d_lc_goods: 'What was actually on the freight?',
    d_lc_erased: 'Why was the destination struck out of the manifest?',
    d_lc_conceal: 'Who concealed the movement, and what were they buying with it?',
    d_lc_terminal: 'Where were the eleven thousand taken?',

    /* --- The Replacement: the file that renews itself --- */
    d_reve_cover: 'Why was the shutdown recorded on a plant that was still running?',
    d_reve_site: 'What has Site 41-C to do with the Survey Office?',
    d_reve_alive: 'Are the people on the roll still alive?',
    d_reve_office: 'Who chose where the eleven thousand were taken?',
    d_reve_choice: 'Who decided to leave them where they were?',
    d_reve_terminal: 'Who moved the people of Verdigris?'
  };

  /* The question the Office asks about a deduction. A deduction with no
     question still works - the engine falls back to the claim it produces -
     but every deduction in the shipped files has one. */
  VG.questionFor = function (dedId) {
    const q = VG.CASE_QUESTIONS || {};
    return q[dedId] || '';
  };
})(window.VG);
