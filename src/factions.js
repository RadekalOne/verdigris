// VERDIGRIS — factions and contracts
window.VG = window.VG || {};
var VG = window.VG;

VG.FACTIONS = [
  {
    id: 'ledger',
    name: 'The Ledger',
    color: '#7fb4c8',
    blurb: 'A salvage bureaucracy that keeps the paper record of the old world, down to the column and the signature. They want the record to stay true and legible, and they will not forgive a page that stops making sense.'
  },
  {
    id: 'choir',
    name: 'The Choir',
    color: '#c08ce0',
    blurb: 'A congregation convinced that Copper Mesa Station should be restarted and the town returned around it. They worship the machine rather than the people who lived beside it, and they treat the town as a temporary condition.'
  },
  {
    id: 'free_line',
    name: 'Free Line',
    color: '#e8b34a',
    blurb: 'Independent scrap traders who want the flats opened up and the grid running so trade can resume. They care about tonnage, fuel, and whether the road is passable, and they answer to nobody but the weather.'
  }
];

VG.QUESTS = [
  {
    id: 'q_ledger_manifest_reconciliation',
    faction: 'ledger',
    title: 'Manifest Reconciliation',
    desc: 'The Ledger wants the copper line on the salvage manifest reconciled against what actually left the site. Bring six units of copper scrap so the column can be closed without an amendment.',
    repNeeded: 0,
    requires: { items: ['scrap_copper'] },
    target: 6,
    reward: { items: ['scrap_gear'], rep: { ledger: 3 }, xp: 120 }
  },
  {
    id: 'q_ledger_shift_log_recovery',
    faction: 'ledger',
    title: 'Missing Shift Log',
    desc: 'A shift ledger went missing the week the station was declared safe. If it turns up, the Ledger will take a copy and pay for the inconvenience of the trouble it caused you.',
    repNeeded: 2,
    requires: { case: 'case_torque' },
    target: 1,
    reward: { items: ['int_shift_log', 'ledger_token'], rep: { ledger: 4 }, xp: 200 }
  },
  {
    id: 'q_ledger_ledgers_gap',
    faction: 'ledger',
    title: 'The Gap in the Ledger',
    desc: 'There is a stretch of the record with nothing in it, and the Ledger does not tolerate blank columns. Establish what happened, then hand them the manifest pages that explain it.',
    repNeeded: 4,
    requires: { case: 'case_ledgers_gap' },
    target: 3,
    reward: { items: ['int_manifest_ledger', 'scrap_copper'], rep: { ledger: 5 }, xp: 260 }
  },
  {
    id: 'q_ledger_storm_ward_audit',
    faction: 'ledger',
    title: 'Storm Ward Audit',
    desc: 'The storm ward kept its own books, and they do not agree with the station. The Ledger wants the ward records catalogued and the disagreement written up in the margin.',
    repNeeded: 6,
    requires: { case: 'case_storm_ward' },
    target: 2,
    reward: { items: ['case_manifest_carbon', 'mat_lead_shield'], rep: { ledger: 6 }, xp: 340 }
  },
  {
    id: 'q_choir_primer',
    faction: 'choir',
    title: 'Primer',
    desc: 'The Choir asks for four shards of ceramic for the recitation lamps, and asks that they be clean. They pay in copper, and they remember who brought it.',
    repNeeded: 0,
    requires: { items: ['scrap_ceramic'] },
    target: 4,
    reward: { items: ['scrap_copper'], rep: { choir: 3 }, xp: 100 }
  },
  {
    id: 'q_choir_recital_parts',
    faction: 'choir',
    title: 'Recitation Parts',
    desc: 'Parts of a recitation were broadcast on a loop for eleven nights, and the Choir has since reconstructed them from memory, badly. Find the original script and they will part with the copies they made from it.',
    repNeeded: 2,
    requires: { case: 'case_radio_broadcast' },
    target: 3,
    reward: { items: ['int_choir_hymn', 'scrap_ceramic'], rep: { choir: 4 }, xp: 210 }
  },
  {
    id: 'q_choir_restoration_rite',
    faction: 'choir',
    title: 'The Restoration Rite',
    desc: 'The Choir believes the station was never decommissioned, only interrupted. Find out who took the station master’s place and the Choir will explain what they intend to do with the answer.',
    repNeeded: 5,
    requires: { case: 'case_the_replacement' },
    target: 1,
    reward: { items: ['case_choir_reward'], rep: { choir: 6 }, xp: 380 }
  },
  {
    id: 'q_free_line_caravan_copper',
    faction: 'free_line',
    title: 'Caravan Copper',
    desc: 'Free Line is running a load out to the relay before the road dries and hardens. Eight units of copper scrap, clean and cut down, and they will pay above the station rate.',
    repNeeded: 0,
    requires: { items: ['scrap_copper'] },
    target: 8,
    reward: { items: ['mat_copper_ingot', 'scrap_copper'], rep: { free_line: 3 }, xp: 110 }
  },
  {
    id: 'q_free_line_shelter_survey',
    faction: 'free_line',
    title: 'Shelter Survey',
    desc: 'Traders want to know which of the flats shelters still stand and which way their doors hang. Survey the shelters, then bring back the gear that was not worth leaving behind.',
    repNeeded: 3,
    requires: { case: 'case_shelter_inventory' },
    target: 5,
    reward: { items: ['scrap_gear', 'mat_oil_drum'], rep: { free_line: 4 }, xp: 220 }
  },
  {
    id: 'q_free_line_canteen_rumor',
    faction: 'free_line',
    title: 'Canteen Rumor',
    desc: 'A letter went out of the canteen on the last night and the trader network will pay for the story behind it. Find the letter, and tell them what the canteen was doing with the keys.',
    repNeeded: 4,
    requires: { case: 'case_letter_canteen' },
    target: 2,
    reward: { items: ['misc_canteen_letter', 'aid_ration_tin'], rep: { free_line: 5 }, xp: 280 }
  },
  {
    id: 'q_free_line_quiet_week_freight',
    faction: 'free_line',
    title: 'Quiet Week Freight',
    desc: 'Whatever happened during the quiet week, the road has been passable since, and Free Line intends to keep it that way. Establish what went out and they will move fuel through the flats for you.',
    repNeeded: 6,
    requires: { case: 'case_quiet_week' },
    target: 3,
    reward: { items: ['mat_fuel_tablet', 'scrap_gear'], rep: { free_line: 7 }, xp: 360 }
  }
];
