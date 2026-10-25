/* VERDIGRIS — cold cases, chapters 1 and 2.
   Plain ES5-compatible data. No exports; the game loads this as a script. */
window.VG = window.VG || {};

VG.CASES = [
  {
    id: 'case_quiet_week',
    title: 'The Quiet Week',
    chapter: 1,
    brief: 'The Survey Office reopened file 85-MESA-01 this spring on a technicality: the station\'s closing certificate, dated 15 March, was filed by a name that appears in no payroll this Office holds. Everything else about the shutdown reads like an ordinary decommissioning. Shift logs run daily. Maintenance tickets are numbered and closed. The station is certified safe, drained, and mothballed in the standard eleven-week sequence for a sodium plant of that class.\n\nWhat the Office cannot account for is the week of 14 March. The plant\'s own records stop inside an ordinary Tuesday. The shift log ends mid-sentence, the page that should follow has been cut away close to the fold, and the ticket board has one hole in it where a maintenance stub should be. A machine that fails leaves a grievance behind. This one left a silence, and the silence has been maintained.',
    clues: [
      {
        id: 'clue_qw_shiftlog',
        name: 'Shift Log, Final Page',
        type: 'log',
        poi: 'substation',
        text: 'A carbon sheet from the station shift log, 14 March 1985. The handwriting changes at midnight and stays level all night. At 23:40 the entry reads: "Turbine 2 bearing temp nominal. Yard quiet. Nothing to report." There is no end-of-shift line. The carbon is torn at the stub, and the wire stitching that held the following page is still in place with the paper cut away close to the fold.',
        fact: 'f_qw_ordinary_day'
      },
      {
        id: 'clue_qw_ticket_board',
        name: 'Maintenance Ticket Board',
        type: 'object',
        poi: 'reactor_yard',
        text: 'A corkboard in the yard office, forty numbered brass tickets on wire. Ticket 88-04 — "governor relay, annual calibration" — is pinned to the board, but its stub is gone. The stub is not torn. The cut is straight, taken with a blade held flat against the board, and the paper fibres are unfrayed. Whoever did it stood in front of this board with a knife and no particular hurry.',
        fact: 'f_qw_ticket_gap'
      },
      {
        id: 'clue_qw_dispatch',
        name: 'Dispatch Log, Night Shift',
        type: 'log',
        poi: 'substation',
        text: 'The night dispatcher\'s log, a narrow ruled column in an oilcloth notebook. Entries run in a practised hand from 18:00 to 23:50. The last line reads "outgoing message queued — priority — 23:48." There is no acknowledgement line after it. The message was never confirmed delivered and no reply was ever written down.',
        fact: 'f_qw_no_end_entry'
      },
      {
        id: 'clue_qw_key_ledger',
        name: 'Switchboard Key Ledger',
        type: 'log',
        poi: 'police',
        text: 'A ledger from the sheriff\'s switchboard. One line per key, each initialled and timed back in. Every line is full from January to March. From 19 March onward the lines are blank — but they are ruled, dated, and in sequence. The office kept issuing key-return lines for days after there was no plant to open. Nobody stopped filling in the ledger. They simply stopped signing it.',
        fact: 'f_qw_continuing_after'
      },
      {
        id: 'clue_qw_photo',
        name: 'Photograph, Station Parking Lot',
        type: 'photo',
        poi: 'clinic',
        text: 'A 4x6 print thumbtacked to the clinic corkboard, sodium lamps burning orange over a lot of parked vehicles. On the back in pencil: "11 March 85 — reel 4." The clinic keeps the whole reel in a shoebox. Frame three is the lot full. Frame four is the same lot, empty, lamps still lit, one car door still open. Frame five is missing from the canister and the strip is cut clean after frame four.',
        fact: 'f_qw_reel_missing'
      },
      {
        id: 'clue_qw_notebook',
        name: "Supervisor's Notebook",
        type: 'object',
        poi: 'diner',
        text: 'A pocket notebook left on the counter of a diner that has not served a meal in forty years. Most of it is shift notes, parts orders, the price of coffee. Near the end: "22:10 — told the day crew we run two more weeks. M. says we are buying time and I am signing off on it. If anybody reads this: we were not in danger. Ask why we went quiet." The next page is blank and the one after that does not exist.',
        fact: 'f_qw_buying_time'
      }
    ],
    facts: [
      {
        id: 'f_qw_ordinary_day',
        label: 'The last shift log records an ordinary, unremarkable night',
        desc: 'Nothing in the carbon sheet reports a problem. The plant ran its night shift the way it ran every night shift for three years.',
        source: 'clue_qw_shiftlog'
      },
      {
        id: 'f_qw_ticket_gap',
        label: 'One maintenance ticket stub was cut away by hand',
        desc: 'A straight, unfrayed blade cut. Not a tear and not a loss. Somebody removed it deliberately and calmly.',
        source: 'clue_qw_ticket_board'
      },
      {
        id: 'f_qw_no_end_entry',
        label: "The station's last transmission was queued but never acknowledged",
        desc: 'An outgoing message at 23:48 with no delivery confirmation and no reply. The plant spoke once more and heard nothing back.',
        source: 'clue_qw_dispatch'
      },
      {
        id: 'f_qw_continuing_after',
        label: 'Town offices kept filing paperwork after the station went quiet',
        desc: 'The switchboard kept issuing dated key-return lines for days after the plant stopped. The routine of the town carried on without the thing it depended on.',
        source: 'clue_qw_key_ledger'
      },
      {
        id: 'f_qw_reel_missing',
        label: 'A frame was cut from the middle of a photograph reel',
        desc: 'The lot empties between frame three and frame four. The strip is cut clean, and frame five was removed rather than lost.',
        source: 'clue_qw_photo'
      },
      {
        id: 'f_qw_buying_time',
        label: "The shift supervisor was told the station was 'buying time'",
        desc: 'Whoever ran the shift believed the quiet was deliberate, temporary, and being negotiated somewhere above them. They signed off on it anyway.',
        source: 'clue_qw_notebook'
      },
      {
        id: 'f_qw_stopped_by_hand',
        label: 'The station was stopped by a person, not by a fault',
        desc: 'A failing plant leaves tickets, codes, and complaints. This one left an ordinary night and a single stub cut away with a blade.',
        source: 'd_qw_by_hand'
      },
      {
        id: 'f_qw_paperwork_closed',
        label: 'The record was cleaned up afterwards, by hand',
        desc: 'Someone removed the documents that would have explained the shutdown, and had time to make the cuts neat.',
        source: 'd_qw_closed'
      },
      {
        id: 'f_qw_no_evac_order',
        label: 'Nobody was ever told to leave',
        desc: 'The last word out of the station was never delivered, and nothing came back.',
        source: 'd_qw_no_order'
      },
      {
        id: 'f_qw_cover_up',
        label: 'The shutdown was concealed by administration, not by panic',
        desc: 'Long after the plant stopped, the town offices kept issuing paperwork and nobody stopped signing. This was routine.',
        source: 'd_qw_admin'
      }
    ],
    deductions: [
      {
        id: 'd_qw_by_hand',
        inputs: ['f_qw_ordinary_day', 'f_qw_ticket_gap'],
        output: 'f_qw_stopped_by_hand',
        label: 'The plant was shut down by a person, not by a fault',
        note: 'A machine that fails leaves a grievance: an alarm code, a work order, somebody\'s complaint in the margin. This plant left an ordinary night and one maintenance stub cut away with a blade held flat against the board. You do not cut a stub during a breakdown. You cut it afterwards, when you have time to be careful.'
      },
      {
        id: 'd_qw_closed',
        inputs: ['f_qw_stopped_by_hand', 'f_qw_reel_missing'],
        output: 'f_qw_paperwork_closed',
        label: 'The record was cleaned up afterwards, by hand',
        note: 'A shutdown and a tidying leave two separate traces. Here the shutdown left an ordinary night and a missing stub, and the tidying left a photograph reel cut clean after frame four. Both removals were made with a blade, and both were made by someone who had time and a steady hand.'
      },
      {
        id: 'd_qw_no_order',
        inputs: ['f_qw_no_end_entry', 'f_qw_buying_time'],
        output: 'f_qw_no_evac_order',
        label: 'Nobody was ever told to leave',
        note: 'The last thing the station transmitted was queued at 23:48 and never acknowledged, and the man running the shift was told the quiet was bought time rather than danger. If an evacuation had been ordered, the order would have gone out that night and been answered before dawn. It was never sent, because there was not yet anything to tell eleven thousand people.'
      },
      {
        id: 'd_qw_admin',
        inputs: ['f_qw_continuing_after', 'f_qw_paperwork_closed'],
        output: 'f_qw_cover_up',
        label: 'The shutdown was concealed by administration',
        note: 'The sheriff\'s office kept issuing dated key-return lines for days after the station went quiet — the routine of the town carried on without the thing it depended on. Set that beside records edited by hand with a blade and the shape is clear. Nobody panicked and nobody forgot. Somebody filed the station\'s death in the ordinary course of business.'
      }
    ],
    solutions: [
      {
        id: 's_qw_1',
        label: 'The station was shut down by hand, and the record was cleaned to match',
        requires: ['f_qw_cover_up', 'f_qw_no_evac_order'],
        epilogue: 'The Survey Office has filed its first conclusion, and it is narrower than anyone wanted. Copper Mesa Station did not fail and Copper Mesa Station was not attacked. On the night of 14 March 1985 it was stopped by a person with authority, in an ordinary night shift, and the paperwork was edited afterwards by someone with a blade and a free afternoon. Nobody in the town was told. Nobody in the town left. The silence was manufactured, and it was manufactured by people who had time.\n\nThat leaves a worse question than a failure would have. A failure is weather. A shutdown by hand is a decision, and decisions have a desk, a budget, and a name. The Office has a name in the payroll it cannot find. Next file: the town\'s own ledgers. If the station was closed by hand, the books will show whether the town knew.',
        reward: { items: ['field_notebook'], rep: { ledger: 1 } }
      }
    ],
    reward: { items: ['scrap_copper'], rep: { free_line: 1 } }
  },

  {
    id: 'case_ledgers_gap',
    title: 'The Ledger Gap',
    chapter: 1,
    brief: 'The Survey Office pulled the town records next and expected ordinary decay: fading ink, water damage, boxes lost to the flood of \'87. What it found instead was worse. Three departments keep books in Verdigris Flats — water, power, and rations — and in each of them a precise block of weeks has been removed. The cuts are surgical. Everything before and after them is intact, water-stained and dog-eared, because those pages were handled.\n\nA town does not lose the same eight weeks by accident in two separate buildings, and it does not lose them while its ration book survives, complete and signed daily. Somebody chose which records to take and which to leave. The question is what they were protecting, and what they needed the town to believe afterwards.',
    clues: [
      {
        id: 'clue_lg_water_ledger',
        name: 'Water Ledger, Town Works',
        type: 'log',
        poi: 'watertower',
        text: 'The Town Works bound water ledger for 1979 through 1985, three volumes on a shelf in a pumping station office. Volume three runs in a neat hand until 4 January 1985. The next eight weeks are gone. The pages were not torn out; the block was cut through the binding with a blade and the stubs left standing. The pages before the cut are soft with handling. The pages after have never been opened.',
        fact: 'f_lg_water_gap'
      },
      {
        id: 'clue_lg_power_ledger',
        name: 'Power Ledger, Substation Annex',
        type: 'log',
        poi: 'substation',
        text: 'The substation annex keeps the town electricity accounts in a different hand, on different paper, in a building two hundred yards from the water office. Volume four opens in January 1985 and runs eight weeks of ordinary entries — meter readings, lamp circuits, the annex\'s own consumption — and then stops dead. The final eight weeks have been cut out with a blade and the stubs are still there. Two different clerks, two different buildings, the same eight weeks gone from both.',
        fact: 'f_lg_power_gap'
      },
      {
        id: 'clue_lg_ration_ledger',
        name: 'Ration Issue Ledger, Store Three',
        type: 'log',
        poi: 'market',
        text: 'Store Three\'s ration ledger runs daily, every entry initialled by the storekeeper, in a hand that does not vary across the whole year. Through the eight missing weeks it does not vary either. The issue is steady — flour, salt, oil, the same hundred-odd households, the same quantities — right to the end of the eighth week. Nobody\'s rations were stopped. Nobody\'s rations were doubled. The town was fed exactly as it had been fed for three years, while two offices lost their books.',
        fact: 'f_lg_ration_intact'
      },
      {
        id: 'clue_lg_notice',
        name: 'Records Continuity Notice',
        type: 'object',
        poi: 'library',
        text: 'A typed notice on the letterhead of the Bureau of Copper Country Records, pasted inside the back cover of the library accession register: "RECORDS CONTINUITY — the following volumes have been verified complete and unbroken for the period of interest: Town Works water ledger vol. III; Substation Annex power ledger vol. IV." It is dated 12 February 1985. It certifies as unbroken two books that would not be broken for another two months.',
        fact: 'f_lg_forged_notice'
      },
      {
        id: 'clue_lg_store_ledger',
        name: 'Store Three Day-Book',
        type: 'log',
        poi: 'shop',
        text: 'The day-book behind the counter at Store Three: prices, deliveries, the weather. It runs without a break through the eight missing weeks, right across the hole in the water books, citing the same standpipes and the same meter readings as the weeks before. On its final page, in the same steady hand: "No further issue. Closed by order. — A. Kell." The shelves behind the counter are still full. Nobody took anything. The store simply stopped being a store.',
        fact: 'f_lg_closed_by_order'
      },
      {
        id: 'clue_lg_census',
        name: 'Population Count Card',
        type: 'object',
        poi: 'school',
        text: 'A population count card from the town school — a census of every household in Verdigris Flats, dated 1 January and updated quarterly. The last completed card reads eleven thousand and forty-one. The next card sits in the file blank except for a printed line: "MOVED — SEE FILE 85-MESA-01." That number is the Survey Office\'s own case number for the station shutdown.',
        fact: 'f_lg_census_moved'
      }
    ],
    facts: [
      {
        id: 'f_lg_water_gap',
        label: "The town's water books were cut out for eight weeks",
        desc: 'Cut through the binding with a blade. The pages before are soft from handling; the pages after have never been opened.',
        source: 'clue_lg_water_ledger'
      },
      {
        id: 'f_lg_power_gap',
        label: "The substation's power books are missing the same eight weeks",
        desc: 'A different clerk, a different building, a different hand — and the identical span of time.',
        source: 'clue_lg_power_ledger'
      },
      {
        id: 'f_lg_ration_intact',
        label: 'The ration book is complete through the missing weeks',
        desc: 'Steady daily issue, the same households, the same signature, right to the end. The town was fed normally the whole time.',
        source: 'clue_lg_ration_ledger'
      },
      {
        id: 'f_lg_forged_notice',
        label: 'A continuity certificate for the missing weeks was written in advance',
        desc: 'Dated two weeks before the plant shut down, vouching for volumes that were not yet due to be broken.',
        source: 'clue_lg_notice'
      },
      {
        id: 'f_lg_closed_by_order',
        label: "The town's last store was closed by written order",
        desc: 'Not abandoned and not looted. Closed by order, with the shelves still full.',
        source: 'clue_lg_store_ledger'
      },
      {
        id: 'f_lg_census_moved',
        label: "The town's own census was routed to the Office's shutdown file",
        desc: 'A card marked "MOVED" and pointing at the case number this Office uses for the station closure.',
        source: 'clue_lg_census'
      },
      {
        id: 'f_lg_same_eight_weeks',
        label: 'Two offices lost the same eight weeks',
        desc: 'An identical span, cut twice, in two buildings, by one hand that knew what the other book said.',
        source: 'd_lg_same_weeks'
      },
      {
        id: 'f_lg_town_still_there',
        label: 'The town did not leave when the plant went dark',
        desc: 'Eight weeks of unbroken rations after the plant\'s books stop. Whatever happened, the departure was a second event.',
        source: 'd_lg_town_there'
      },
      {
        id: 'f_lg_sanitized',
        label: 'The record was prepared before the event it describes',
        desc: 'A certificate written and filed before there was anything to certify. The books were cut to match a story that already existed.',
        source: 'd_lg_sanitized'
      },
      {
        id: 'f_lg_ordered_closure',
        label: 'The closure was ordered, and the paperwork preceded the order',
        desc: 'A store closes by order. A certificate filed before the fact means the author knew the order was coming.',
        source: 'd_lg_ordered'
      },
      {
        id: 'f_lg_two_events',
        label: 'The shutdown and the departure were two separate decisions',
        desc: 'First the station, then the town, weeks apart and in that order. One decision could not have done both.',
        source: 'd_lg_two_events'
      },
      {
        id: 'f_lg_office_involved',
        label: 'This Office is inside the paperwork, not outside it',
        desc: 'The Bureau wrote the certificate and the town\'s census was redirected to the Bureau\'s own case file.',
        source: 'd_lg_office'
      }
    ],
    deductions: [
      {
        id: 'd_lg_same_weeks',
        inputs: ['f_lg_water_gap', 'f_lg_power_gap'],
        output: 'f_lg_same_eight_weeks',
        label: 'Two offices lost the same eight weeks',
        note: 'Water and power are kept by different clerks in different buildings, on different paper, with different habits. Books do not rot on a shared schedule. The identical span in both is not decay and not a flood — it is a cut, taken twice, by someone who knew what the other volume said.'
      },
      {
        id: 'd_lg_town_there',
        inputs: ['f_lg_same_eight_weeks', 'f_lg_ration_intact'],
        output: 'f_lg_town_still_there',
        label: 'The town did not leave when the plant went dark',
        note: 'For eight weeks the plant\'s books are missing and the town\'s ration book is not. Every day in that hole carries a signature against a normal issue for a full town. The people of Verdigris Flats were still here, still fed, still buying salt, after the station stopped. The departure was a second event, not the first.'
      },
      {
        id: 'd_lg_sanitized',
        inputs: ['f_lg_forged_notice', 'f_lg_same_eight_weeks'],
        output: 'f_lg_sanitized',
        label: 'The record was prepared before the event it describes',
        note: 'A certificate of continuity, dated two weeks before the plant shut down, vouching for books that had not yet been cut. Nobody sanitises a record under pressure — you cannot type, sign, and file while a town is being moved. This was built first. The books were cut to match a story that already existed.'
      },
      {
        id: 'd_lg_ordered',
        inputs: ['f_lg_sanitized', 'f_lg_closed_by_order'],
        output: 'f_lg_ordered_closure',
        label: 'The closure was ordered, and the paperwork came before the order',
        note: 'A store closes by order; a fire closes nothing by order and a flight closes nothing at all. Set that beside a continuity certificate filed before the fact: the plan was written, the books were prepared to agree with it, and only afterwards did somebody issue the order that shut the place down.'
      },
      {
        id: 'd_lg_two_events',
        inputs: ['f_lg_town_still_there', 'f_lg_ordered_closure'],
        output: 'f_lg_two_events',
        label: 'The shutdown and the departure were two separate decisions',
        note: 'The plant went dark and the town carried on eating. Later an order closed the stores. Two events, weeks apart, in that order: first the station, then the town. A single decision producing both would have had to happen at once. This one happened twice, and the second time it was written down.'
      },
      {
        id: 'd_lg_office',
        inputs: ['f_lg_sanitized', 'f_lg_census_moved'],
        output: 'f_lg_office_involved',
        label: 'This Office is inside the paperwork, not outside it',
        note: 'The Bureau of Copper Country Records wrote the continuity certificate, and the town\'s census was redirected to the Bureau\'s own shutdown case. Whoever buried this was not hiding it from the Bureau. They were hiding it inside the Bureau, where the file would look complete.'
      }
    ],
    solutions: [
      {
        id: 's_lg_1',
        label: "The evacuation was scheduled, and the town's books were cut to hide the scheduling",
        requires: ['f_lg_two_events', 'f_lg_office_involved'],
        epilogue: 'The Survey Office\'s second finding is the one it will not be able to unwrite. The evacuation of Verdigris Flats was not a reaction to anything. It was scheduled and provisioned in advance, and the town\'s books were cut with a blade to match a story that had already been written, signed, and filed — a certificate dated two weeks before the plant shut down, vouching for volumes that had not yet been cut.\n\nThe sequence is now fixed. The station goes dark first. The town stays eight more weeks, fed and signing for its rations, because nothing has told anyone to leave yet. Then the order arrives, the stores close by order with their shelves full, and eleven thousand people go somewhere. The Bureau of Copper Country Records — this Office\'s own ancestor — built the paperwork first and made the people fit it afterwards. The next question is where a town goes when it is sent. It will not be in these books. It will be in the ground, in the water caches, and in the doors.',
        reward: { items: ['ledger_token'], rep: { ledger: 2, choir: -1 } }
      }
    ],
    reward: { items: ['scrap_cloth'], rep: { free_line: 1 } }
  },

  {
    id: 'case_torque',
    title: 'The Torque Anomaly',
    chapter: 2,
    brief: 'Case 85-MESA-01 asked how a plant stops. Case 85-MESA-02 asks who made it stop, and it begins with a number: the turbine ran three percent over rated torque for forty-one minutes before it died, and held there without wavering. Faults do not hold. They spike, they scattershot, they trip on the first excursion and shout about themselves in a log. This machine was walked to the edge of its rating like a man walking a dog on a lead, and then cut.\n\nCopper Mesa Station\'s governor should have corrected that load in seconds. It did not correct it, because it was no longer in the circuit. The Office has found the requisition, the night crew, and the hand-punched shift card. Put them together and the shutdown stops being an event and becomes an instruction.',
    clues: [
      {
        id: 'clue_tq_turbine_log',
        name: 'Turbine Trace, Channel 2',
        type: 'log',
        poi: 'reactor_yard',
        text: 'A strip-chart trace from the station recorder, redrawn in grease pencil onto the back of a maintenance form by the shift engineer himself. Turbine load holds at 103.2 percent of rated torque for forty-one minutes, as flat as a table. At 04:11:52 the trace drops vertically to zero. There is no ramp, no decay, no coast-down curve. The machine did not slow down. It was stopped.',
        fact: 'f_tq_over_torque'
      },
      {
        id: 'clue_tq_governor_log',
        name: 'Governor Cabinet Log',
        type: 'object',
        poi: 'substation',
        text: 'The governor cabinet\'s own electromechanical log: a drum of chart paper turned by a clockwork that keeps time even when the plant does not. It records no over-temperature, no overspeed, no differential pressure trip, and no scram trip. At 04:11 the pen rises a millimetre and simply stops drawing. The cabinet door seal is intact and dated 11 March, unbroken.',
        fact: 'f_tq_no_fault'
      },
      {
        id: 'clue_tq_requisition',
        name: 'Requisition 402, Yard Stores',
        type: 'object',
        poi: 'depot',
        text: 'A yellow requisition from the yard stores, signed and approved three days before the shutdown: one (1) governor hydraulic bypass kit, site use only, priority. Collected on the morning of 14 March against the signature of a temporary agency worker whose surname is illegible. The kit itself is not in the stores. The stores clerk has signed the back of the form: ISSUED.',
        fact: 'f_tq_bypass_kit'
      },
      {
        id: 'clue_tq_punch_card',
        name: 'Shift Card, Control Desk',
        type: 'object',
        poi: 'reactor_yard',
        text: 'The control desk shift card for the second shift of 14 March, stiff card stocked in a rack with the other night cards. It is punched twice by hand, not by the desk clock: the holes are oval and off-centre, made with a hand punch and a wrist. 04:12, and two sets of initials in a box meant for one. Nobody signed the shift out. They signed it twice over.',
        fact: 'f_tq_hand_punched'
      },
      {
        id: 'clue_tq_deposition',
        name: 'Deposition, Guard Post',
        type: 'testimony',
        poi: 'guardhouse',
        text: 'A guard\'s deposition, taken four decades later by a Survey Office fieldworker from a man who was nineteen at the time and is seventy-eight now. He does not remember the plant. He remembers the yard. "The gate was open at four in the morning and the whole place was lit up. Two men in coveralls working on the turbine house door with a hand truck. They weren\'t hurrying. One of them had a clipboard. Nobody said anything to me and I didn\'t ask, because the foreman had told me the gate would be open."',
        fact: 'f_tq_night_work'
      },
      {
        id: 'clue_tq_payroll',
        name: 'Temporary Labour Authorization',
        type: 'log',
        poi: 'bank',
        text: 'A payroll authorization from the copper company\'s credit office: two temporary maintenance hands, agency, hired for a single night, paid in cash, with no work order raised against the plant\'s budget. Signed by the plant manager three days ahead and countersigned by a signature that is a careful facsimile of an original. Both names are illegible. The date is 11 March.',
        fact: 'f_tq_offbook_workers'
      }
    ],
    facts: [
      {
        id: 'f_tq_over_torque',
        label: 'The turbine held three percent over rated torque for forty-one minutes',
        desc: 'Steady as a table. A machine in trouble cannot hold a line it should never have been allowed to hold.',
        source: 'clue_tq_turbine_log'
      },
      {
        id: 'f_tq_no_fault',
        label: 'The governor recorded no fault and no scram trip',
        desc: 'No overspeed, no differential pressure, no over-temperature. The pen rises a millimetre and stops drawing.',
        source: 'clue_tq_governor_log'
      },
      {
        id: 'f_tq_bypass_kit',
        label: 'A governor bypass kit was approved and collected before the shutdown',
        desc: 'Ordered three days ahead, collected on the morning of the fourteenth, and never seen in the stores again.',
        source: 'clue_tq_requisition'
      },
      {
        id: 'f_tq_hand_punched',
        label: 'The control desk shift card was punched by hand at 04:12',
        desc: 'Oval, off-centre holes made with a wrist, and two sets of initials in a box meant for one.',
        source: 'clue_tq_punch_card'
      },
      {
        id: 'f_tq_night_work',
        label: 'Two men worked at the turbine house at four in the morning',
        desc: 'With a hand truck, a clipboard, and no hurry, on a night when the gate had been told to be open.',
        source: 'clue_tq_deposition'
      },
      {
        id: 'f_tq_offbook_workers',
        label: 'Two off-book agency workers were hired for that one night',
        desc: 'Cash, no work order, authorised three days early, and a countersignature that is a copy of a copy.',
        source: 'clue_tq_payroll'
      },
      {
        id: 'f_tq_not_a_fault',
        label: 'The over-torque was commanded, not suffered',
        desc: 'Only a person can hold a machine exactly where the governor would never have let it sit.',
        source: 'd_tq_commanded'
      },
      {
        id: 'f_tq_governor_cut',
        label: 'The governor was taken out of the circuit by hand',
        desc: 'The kit was ordered in advance, collected on the night, and the machine was then pushed to the edge to prove the cut had worked.',
        source: 'd_tq_cut'
      },
      {
        id: 'f_tq_forced_scram',
        label: 'The shutdown was a scram somebody asked for',
        desc: 'A hand-punched card at 04:12 makes the event official by wrist. Beside a governor already cut, it is an instruction.',
        source: 'd_tq_scram'
      },
      {
        id: 'f_tq_ordered_scram',
        label: 'The scram was ordered days in advance',
        desc: 'Labour hired, cash-paid, and authorised for the exact night. Paperwork prepared, money moved, a date chosen.',
        source: 'd_tq_ordered'
      },
      {
        id: 'f_tq_plant_first',
        label: 'The plant was shut before the town was moved',
        desc: 'A lit yard at four in the morning, two men with a clipboard, and no hurry. The first move of a plan already paid for.',
        source: 'd_tq_first'
      }
    ],
    deductions: [
      {
        id: 'd_tq_commanded',
        inputs: ['f_tq_over_torque', 'f_tq_no_fault'],
        output: 'f_tq_not_a_fault',
        label: 'The over-torque was commanded, not suffered',
        note: 'A fault that pushes a reactor past its rating announces itself. It trips on the first excursion and writes a code into a log that a clockwork keeps turning even when the plant does not. Here the governor wrote nothing for forty minutes while the machine held a load it should never have held. Only a person can hold a machine exactly where it should not be.'
      },
      {
        id: 'd_tq_cut',
        inputs: ['f_tq_bypass_kit', 'f_tq_not_a_fault'],
        output: 'f_tq_governor_cut',
        label: 'The governor was cut out of the circuit by hand',
        note: 'A bypass kit was approved three days in advance and collected on the morning itself, and then the machine was walked to the edge of its rating while nothing corrected it. Those two facts only fit together one way. The governor was removed by hand, and the over-torque was the proof that it was gone.'
      },
      {
        id: 'd_tq_scram',
        inputs: ['f_tq_governor_cut', 'f_tq_hand_punched'],
        output: 'f_tq_forced_scram',
        label: 'The shutdown was a scram somebody asked for',
        note: 'A hand-punched shift card at 04:12 with two sets of initials means a person stood at the desk and made the event official by wrist, with no clock involved. Put that beside a governor that was already cut and the plant did not fail. Somebody requested the shutdown and then made sure the paperwork recorded it as an ordinary shift.'
      },
      {
        id: 'd_tq_ordered',
        inputs: ['f_tq_forced_scram', 'f_tq_offbook_workers'],
        output: 'f_tq_ordered_scram',
        label: 'The scram was ordered days in advance',
        note: 'Agency labour was hired, cash-paid, and authorised for the exact night, with the authorisation dated three days earlier. That is not a crew improvising a repair at four in the morning. Paperwork was prepared, money moved, and a date was picked. The plant was shut on a schedule.'
      },
      {
        id: 'd_tq_first',
        inputs: ['f_tq_ordered_scram', 'f_tq_night_work'],
        output: 'f_tq_plant_first',
        label: 'The plant went down before the town did',
        note: 'The gate was told to be open, the yard was lit, and two men with a hand truck and a clipboard worked at the turbine house door without hurry, three days into a plan that had already been paid for. The shutdown was not a reaction to the town. It was the first move, made by people who knew what came after it.'
      }
    ],
    solutions: [
      {
        id: 's_tq_1',
        label: 'The governor was cut to force a scram, on an order given days in advance',
        requires: ['f_tq_ordered_scram', 'f_tq_plant_first'],
        epilogue: 'The Survey Office files its third conclusion, and it is the first one with a method in it. Copper Mesa Station was not shut down because it failed and not because anyone broke into it. The turbine was driven three percent over its rating for forty-one minutes with the governor physically removed from the circuit, then scrammed by hand while two men who had been hired, paid, and authorised for that exact night stood in the yard with a clipboard and a hand truck. The order is three days old. The bypass kit is a receipt. The shift card was punched by a wrist, not a clock.\n\nWhat makes it worse is the sequence. The plant went down first, on a schedule, and nothing about that night suggests the town was anywhere near the plant\'s decision. The town learned about it the way a town learns about a change in the weather — afterwards, from a notice. Which means the shutdown was not the emergency. It was the first half of a plan, and the plan has a second half we have not found yet. So look for what eleven thousand people were given, and where they were told to take it.',
        reward: { items: ['case_torque_reward'], rep: { ledger: 2, choir: -1 } }
      }
    ],
    reward: { items: ['scrap_gear'], rep: { free_line: 1 } }
  },

  {
    id: 'case_shelter_inventory',
    title: 'The Shelter Inventory',
    chapter: 2,
    brief: 'Case 85-MESA-03 opens on a tally sheet. In Shelter Bay 4, behind Copper Mesa Station, somebody counted eleven thousand persons of rations for thirty days and wrote the figure at the foot of the page in a firm hand. There is no matching count of people. There is no matching count of anywhere to go.\n\nThe shelters are not evacuation camps in the ordinary sense. They have been provisioned to a specification that includes medical kits in pairs per head and stretchers to the exact population, and their doors carry an override on the outside face, sealed with wire and a dated padlock. A town being evacuated does not get a stretcher for every citizen. A town being moved into confinement does, because somebody expected the moving to be hard on bodies, and did not expect anyone to leave on their own.',
    clues: [
      {
        id: 'clue_si_tally',
        name: 'Shelter Stores Tally Sheet',
        type: 'object',
        poi: 'bunker',
        text: 'A tally sheet clipped to a crate in Shelter Bay 4, in pencil, in a hand that does not hurry. It counts pallets. At the foot of the page, under a ruled line, a single figure: 11,000 persons x 30 days. Above it, forty-one pallet lines and a note reading "per the schedule." The schedule is not in the file. The crates are shrink-wrapped, labelled by week, and stacked to the roof.',
        fact: 'f_si_thirty_days'
      },
      {
        id: 'clue_si_water_manifest',
        name: 'Water Cache Manifest',
        type: 'log',
        poi: 'watertower',
        text: 'A manifest for the shelter water caches: eleven thousand sealed bladder liners, each rated for one person for thirty days, plus a second column for medical kits at two per head, plus a third for stretchers at one per head. It is signed out by the same clerk who signed the ration tally, and the quantities are not approximations. They are exact.',
        fact: 'f_si_medical_exact'
      },
      {
        id: 'clue_si_override',
        name: 'Shelter Door Override',
        type: 'object',
        poi: 'bunker',
        text: 'The manual override wheel on the shelter blast door is on the OUTSIDE face. The wheel turns. From inside there is no handle at all, only a plate reading: HOLD FOR RELEASE - DO NOT FORCE. The wheel is sealed with lead wire and a numbered padlock, the tag dated 9 March, five days before the shutdown. Somebody locked the outside of a door shut and dated the lock in advance.',
        fact: 'f_si_outside_override'
      },
      {
        id: 'clue_si_school_roll',
        name: 'School Shelter Roll',
        type: 'testimony',
        poi: 'school',
        text: 'A class roll from the town school, printed on a school form and used as a shelter manifest: every child in the town school by name and height, with a space for the teacher to sign each day. It is signed every day for thirty days, right to the last page. The teacher wrote one note on 4 March: "Ninety-one children, no parents present at the shelter door. I am not raising this again."',
        fact: 'f_si_children'
      },
      {
        id: 'clue_si_consignment',
        name: 'Freight Consignment Note',
        type: 'log',
        poi: 'depot',
        text: 'A consignment note from a freight firm, countersigned at the yard gate: 11,000 ration crates, 11,000 water bladders, 11,000 stretchers, consigned to Copper Mesa Station - Shelter Stores. Shipped in three convoys over nine days. The final convoy left eleven days before the plant shut down.',
        fact: 'f_si_shipped_early'
      },
      {
        id: 'clue_si_notices',
        name: 'Printing Order and Notice Proof',
        type: 'object',
        poi: 'library',
        text: 'A printing order from the town printer: eleven thousand notices reading PROCEED TO DESIGNATED SHELTER, CARRY WHAT YOU CAN, DO NOT DELAY. Run size eleven thousand. Order dated 13 March, the day before the plant stopped. The proof carries the date 15 March. The notices were printed two days early and dated for the day after. There is no route map, no destination, and no transport order. Only the address of the shelters.',
        fact: 'f_si_preprinted'
      }
    ],
    facts: [
      {
        id: 'f_si_thirty_days',
        label: 'Thirty days of rations were stocked for eleven thousand people',
        desc: 'Counted rather than estimated. Forty-one pallet lines and a figure written at the foot of the page.',
        source: 'clue_si_tally'
      },
      {
        id: 'f_si_medical_exact',
        label: 'Medical kits and stretchers were stocked to the exact population',
        desc: 'Two kits and one stretcher per head, to the person. This is a specification, not a shipment.',
        source: 'clue_si_water_manifest'
      },
      {
        id: 'f_si_outside_override',
        label: 'The shelter doors can only be opened from outside',
        desc: 'The override wheel is on the outer face, sealed with wire and a padlock dated five days before the shutdown.',
        source: 'clue_si_override'
      },
      {
        id: 'f_si_children',
        label: "The shelters were provisioned for the town's children",
        desc: 'Ninety-one of them, on a school roll, signed for thirty days, with no parents at the door.',
        source: 'clue_si_school_roll'
      },
      {
        id: 'f_si_shipped_early',
        label: 'The shelter stores were delivered eleven days before the shutdown',
        desc: 'Three convoys over nine days, the last of them gone before anybody knew the plant would stop.',
        source: 'clue_si_consignment'
      },
      {
        id: 'f_si_preprinted',
        label: 'Eleven thousand shelter notices were printed two days before the shutdown',
        desc: 'Dated for the day after it. No route map, no destination, no transport. Only the address of the shelters.',
        source: 'clue_si_notices'
      },
      {
        id: 'f_si_prepared',
        label: 'The confinement was prepared, not improvised',
        desc: 'Ordered, budgeted, and delivered while the town was still going about its day.',
        source: 'd_si_prepared'
      },
      {
        id: 'f_si_not_chaos',
        label: 'The town was being sent somewhere, not fleeing',
        desc: 'You print destination notices for a move. You do not print them for a panic, and you do not order stretchers for everyone in a town about to scatter.',
        source: 'd_si_not_chaos'
      },
      {
        id: 'f_si_locked_in',
        label: 'The shelters were designed to be shut on people',
        desc: 'The door design says so plainly. A scheduled move to a place with one-way doors is not a journey.',
        source: 'd_si_locked_in'
      },
      {
        id: 'f_si_civilians',
        label: 'This was detention, and it was planned for families',
        desc: 'The specification does not distinguish between plant workers and seven-year-olds.',
        source: 'd_si_civilians'
      },
      {
        id: 'f_si_authorized_above',
        label: 'The order came from above the plant',
        desc: 'No plant manager requisitions three convoys of food and eleven thousand notices, then hires off-book night labour to cut the governor. One desk, two orders, weeks apart.',
        source: 'd_si_above'
      }
    ],
    deductions: [
      {
        id: 'd_si_prepared',
        inputs: ['f_si_thirty_days', 'f_si_shipped_early'],
        output: 'f_si_prepared',
        label: 'The confinement was prepared, not improvised',
        note: 'Thirty days of food for eleven thousand people, shipped in three convoys and gone eleven days ahead of the shutdown, with stretchers and kits matched to the population to the person. An emergency does not have time to procure to the last unit. This was ordered, budgeted, paid for, and delivered while the town was still going to work.'
      },
      {
        id: 'd_si_not_chaos',
        inputs: ['f_si_prepared', 'f_si_preprinted'],
        output: 'f_si_not_chaos',
        label: 'The town was being sent somewhere, not fleeing',
        note: 'A town in flight leaves in whatever direction the road runs, and nobody prints eleven thousand destination notices for it. These notices were printed two days before the plant went down and dated for the day after, with shelter addresses and no route map. You print that for a move. A panic gets a shout.'
      },
      {
        id: 'd_si_locked_in',
        inputs: ['f_si_outside_override', 'f_si_preprinted'],
        output: 'f_si_locked_in',
        label: 'The shelters were designed to be shut on people',
        note: 'The override wheel is on the outer face and the padlock tag is dated before the notices were printed. Set that against a move that was scheduled rather than panicked and the design is unmistakable: the doors were meant to close on people, and meant to be opened by somebody else. From inside there is only the instruction not to force them.'
      },
      {
        id: 'd_si_civilians',
        inputs: ['f_si_locked_in', 'f_si_children'],
        output: 'f_si_civilians',
        label: 'This was detention, and it was planned for families',
        note: 'Two medical kits and a stretcher per head, and a school roll carried to the thirtieth day with ninety-one children on it and no parents at the door. The plan did not distinguish between the people who worked the plant and the people who were seven years old. Nobody drafting this thought it would be done with consent.'
      },
      {
        id: 'd_si_above',
        inputs: ['f_si_civilians', 'f_si_prepared'],
        output: 'f_si_authorized_above',
        label: 'The order came from above the plant',
        note: 'No plant manager requisitions three convoys of food, a full medical stock, and eleven thousand notices, and then hires off-book night labour to cut the governor. Both orders exist and they are weeks apart. They are the same order, from the same desk. The case file needs a name, and the name is not in the plant\'s payroll.'
      }
    ],
    solutions: [
      {
        id: 's_si_1',
        label: 'Eleven thousand people were confined on purpose, by a plan made weeks in advance',
        requires: ['f_si_authorized_above', 'f_si_not_chaos'],
        epilogue: 'The Survey Office files its fourth conclusion, and it is the first one about people rather than paper. Eleven thousand rations for thirty days, eleven thousand stretchers, two medical kits per head, three convoys delivered before anyone knew the plant would stop, and eleven thousand shelter notices printed in advance and dated for the day after the shutdown. That is not an evacuation. There is no version of this that is an evacuation. It is a move, made by people who had months to make it and expected it to be hard on bodies.\n\nThe doors settle it. The override is on the outside, sealed and dated five days ahead, and inside there is nothing but a plate telling the occupants not to force the door. Ninety-one children on a school roll with no parents at the shelter entrance. The town did not run. It was sent to shelters that were built to be shut, and the only question left in this file is who signed for it, because it was signed for, by someone above the plant, from the same desk that cut a governor and hired men to stand at a turbine house door at four in the morning. Find that desk and the rest of this stops being a cold case.',
        reward: { items: ['scrap_ceramic'], rep: { ledger: 1, free_line: 2 } }
      }
    ],
    reward: { items: ['scrap_plastic'], rep: { ledger: 1 } }
  }
];
