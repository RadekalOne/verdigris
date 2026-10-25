window.VG = window.VG || {};
var VG = window.VG;

VG.CASES_B = [
  {
    id: 'case_radio_broadcast',
    title: 'The Relay on Air',
    chapter: 3,
    brief: 'For forty-one years the Survey Office has held that Verdigris Flats emptied on the night the station was closed: eleven thousand people, a road east, a dust storm behind them. The paper supports it. The ledgers are silent in the way of a thing that was made silent, and the radio is worse than silent. The relay mast at Copper Mesa should have gone dark with the town. It did not.\n\nA carrier is sitting on 1180 kHz out of the old mast, strong enough on a clear night to hold a receiver together, and what it carries is not a voice but a test pattern, hour after hour, with a station identification naming a town that was officially empty. Either the transmitter was left running for four decades by a machine nobody switched off, or somebody has been feeding it. The equipment log says it was fed.',
    clues: [
      {
        id: 'clue_rb_reel',
        name: 'Relay Test Loop, Reel 3',
        type: 'tape',
        poi: 'radio_tower',
        text: 'A reel of quarter-inch tape still on the spindle in the relay hut, labelled in grease pencil: TEST LOOP - COPPER MESA RELAY - WK 3. The tape carries an hour of a resolution chart, a steady tone, and a woman reading the station identification: "Copper Mesa, KV-4-1, serving the flats and eleven thousand souls." A date stamp on the leader tape falls eleven weeks after the shutdown. The chair at the transmitter key is worn pale where a forearm rests.',
        fact: 'f_rb_reel_dated'
      },
      {
        id: 'clue_rb_dutylog',
        name: 'Relay Duty Log, green ledger',
        type: 'log',
        poi: 'radio_tower',
        text: 'A green ledger on the relay desk, ruled for date, carrier and initials. The first page carries the shutdown night. The entries after it do not stop: 0300 CARRIER CHECK. 0900 TAPE CHANGE. 1400 SIGN ON, ALL WELL. The hand does not change. The ink does not run out. The last dated entry is from the current year.',
        fact: 'f_rb_dutylog_after'
      },
      {
        id: 'clue_rb_ticket',
        name: 'Requisition 88-B, relay fuel and cells',
        type: 'log',
        poi: 'depot',
        text: 'A Sundown Salvage requisition, countersigned at the depot and paid out in scrip: 400 gal diesel, 240 dry cells, 60 lb of fourteen-gauge copper for the ground screen. It is dated two months after the town was declared empty, and it names the relay as the point of delivery. Somebody was buying fuel for a mast in a ghost town.',
        fact: 'f_rb_supplied_after'
      },
      {
        id: 'clue_rb_notice',
        name: 'Civic notice, market board',
        type: 'object',
        poi: 'market',
        text: 'A printed notice pinned to the market board under a layer of paper: "WATER RATIONING CONTINUES. WASH DAYS TUESDAY AND SATURDAY. SCHOOL TERM BEGINS THE FIRST WEEK OF THE MONTH. ALL RESIDENTS OF THE FLATS ARE REQUIRED TO REPORT TO THE CHAPEL FOR REGISTRATION." It is dated three weeks after the shutdown and it is addressed to a town of eleven thousand, by street and by name.',
        fact: 'f_rb_bulletin_present'
      },
      {
        id: 'clue_rb_hut',
        name: 'Survey photograph, relay hut interior',
        type: 'photo',
        poi: 'radio_tower',
        text: 'A survey photograph taken from the doorway of the relay hut and filed by a Survey Office inspector who never wrote the report: a cot made up, a calendar with every day of the last fourteen months marked in pencil, a camp stove with a kettle on it, and a chair pulled up to the transmitter key.',
        fact: 'f_rb_hut_inhabited'
      },
      {
        id: 'clue_rb_witness',
        name: 'Statement of a freight hauler',
        type: 'testimony',
        poi: 'gas',
        text: 'A driver who has worked the flats road for a living, sworn statement taken at the fuel stop: "I have run that road eleven years. The town is dark in the day and lit at night. There is smoke off the cannery stack on a still evening, and the mast light is on, and once I saw a truck come out of the depot yard heading north. I did not stop. Nobody stops for that." He has never stopped. Nobody has.',
        fact: 'f_rb_night_lights'
      }
    ],
    facts: [
      {
        id: 'f_rb_reel_dated',
        label: 'The relay test loop was recorded eleven weeks after the shutdown',
        desc: 'A tape on the spindle in the relay hut carries a date stamp eleven weeks past the night the town emptied. Whatever produced it was made by a working crew in a room with a chair at the key.',
        source: 'clue_rb_reel'
      },
      {
        id: 'f_rb_dutylog_after',
        label: 'The relay duty log runs on past the evacuation without interruption',
        desc: 'Routine entries, carrier checks and tape changes and sign-ons, from the shutdown night to the current year, in one unchanging hand.',
        source: 'clue_rb_dutylog'
      },
      {
        id: 'f_rb_supplied_after',
        label: 'Fuel and cells were bought for the relay two months after the town was declared empty',
        desc: 'A paid requisition delivers diesel, dry cells and ground screen copper to the mast. Nobody stocks a transmitter in a town with nobody in it.',
        source: 'clue_rb_ticket'
      },
      {
        id: 'f_rb_bulletin_present',
        label: 'A civic bulletin three weeks after the shutdown addresses eleven thousand residents',
        desc: 'Rationing, a school term, registration at the chapel, by street and by name. It is the ordinary paperwork of a town that expects to still be there next month.',
        source: 'clue_rb_notice'
      },
      {
        id: 'f_rb_hut_inhabited',
        label: 'Someone lives in the relay hut',
        desc: 'A cot, a marked calendar, a camp stove, a chair at the transmitter key. The hut is a residence that calls itself a hut.',
        source: 'clue_rb_hut'
      },
      {
        id: 'f_rb_night_lights',
        label: 'An outsider reports light and smoke in Verdigris at night, decades after the evacuation',
        desc: 'A working driver has run the flats road for eleven years and never once seen the town lit. He has also never once seen anyone come out of it.',
        source: 'clue_rb_witness'
      },
      {
        id: 'f_rb_live_operator',
        label: 'People were on the key and on shift in Verdigris after the evacuation',
        desc: 'Operators, not a fault. The station kept a staffed schedule, with checks and tape changes and a sign-on, long after the official record says the town was empty.',
        source: 'd_rb_manned'
      },
      {
        id: 'f_rb_occupied_after',
        label: 'Verdigris was still occupied two months after the town was declared empty',
        desc: 'Supplies were ordered, delivered and received. Whatever lived in the flats that spring was not living rough.',
        source: 'd_rb_occupied'
      },
      {
        id: 'f_rb_no_departure',
        label: 'No mass departure took place on the night of the shutdown',
        desc: 'Civic print and civic broadcast both continue past the date of the supposed evacuation, and both are addressed to the full population. The departure never happened.',
        source: 'd_rb_no_departure'
      },
      {
        id: 'f_rb_population_present',
        label: 'All 11,000 residents were still in Verdigris Flats after the shutdown',
        desc: 'The notice carries the census figure and the census figure never changes. Nobody left and nobody died. The town lost its paperwork, not its people.',
        source: 'd_rb_population'
      },
      {
        id: 'f_rb_today_inhabited',
        label: 'Verdigris is inhabited now, and has been for decades',
        desc: 'Houses lit at night, a stack smoking, a mast kept manned. The empty town in the file is the fiction, and the fiction is recent enough to have a cot in it.',
        source: 'd_rb_today'
      },
      {
        id: 'f_rb_never_left',
        label: 'The 11,000 were never evacuated. Verdigris was sealed, not emptied',
        desc: 'The evacuation is a paper construction, a shutdown dressed as a departure. The population stayed behind, behind sealed doors, in a town that was still running a school term.',
        source: 'd_rb_terminal'
      }
    ],
    deductions: [
      {
        id: 'd_rb_manned',
        inputs: ['f_rb_reel_dated', 'f_rb_dutylog_after'],
        output: 'f_rb_live_operator',
        label: 'The relay was manned by residents after the evacuation',
        note: 'A program needs an operator and a shift needs a hand to write it down. A dated test reel proves the station was still producing weeks after the town emptied; an unbroken duty log proves someone was still keeping the hours. A machine left running by accident does not sign for the sign-on.'
      },
      {
        id: 'd_rb_occupied',
        inputs: ['f_rb_supplied_after', 'f_rb_live_operator'],
        output: 'f_rb_occupied_after',
        label: 'Verdigris was occupied after the official evacuation',
        note: 'Diesel and dry cells were bought, paid for and delivered to the mast two months after the town was declared empty, and somebody was on shift to receive them. Fuel does not get requisitioned, counted and signed for at the depot on behalf of a site nobody intends to keep warm.'
      },
      {
        id: 'd_rb_no_departure',
        inputs: ['f_rb_bulletin_present', 'f_rb_reel_dated'],
        output: 'f_rb_no_departure',
        label: 'No mass departure took place on the night of the shutdown',
        note: 'A notice is printed for people who will read it and a broadcast is made for people who will hear it. Both are dated after the night the town supposedly emptied, and the notice addresses eleven thousand residents by street. A departed population cannot be issued a ration schedule.'
      },
      {
        id: 'd_rb_population',
        inputs: ['f_rb_no_departure', 'f_rb_bulletin_present'],
        output: 'f_rb_population_present',
        label: 'The whole population is still in the flats',
        note: 'If nobody departed, then the headcount on the notice is the headcount on the ground: eleven thousand. The town did not lose its people. It lost its paperwork.'
      },
      {
        id: 'd_rb_today',
        inputs: ['f_rb_hut_inhabited', 'f_rb_night_lights'],
        output: 'f_rb_today_inhabited',
        label: 'The town is inhabited today',
        note: 'A cot, a stove and a chair at the key in the relay hut, and a working driver who has watched light and smoke come out of the flats at night for eleven years without once seeing anyone come out. Both facts sit decades downstream of the evacuation. Whatever is in that town is still there, and it is still keeping the hours.'
      },
      {
        id: 'd_rb_terminal',
        inputs: ['f_rb_population_present', 'f_rb_today_inhabited'],
        output: 'f_rb_never_left',
        label: 'The eleven thousand never left. The evacuation was a cover story',
        note: 'Everyone still counted on the notice, and the town is still occupied now. Put the two together and the only reading left is the ugly one: nobody was ever evacuated. The record of eleven thousand departures is the thing that was fabricated. The town itself is the proof.'
      }
    ],
    solutions: [
      {
        id: 's_rb_1',
        label: 'Verdigris was sealed, not evacuated',
        requires: ['f_rb_never_left', 'f_rb_occupied_after'],
        epilogue: 'Write it plainly, because the plain version is the one that will survive review. Copper Mesa Station was scrammed and held, and it was never shut down. There is a voice on that mast tonight that can tell me when, and why, and who gave the order. The eleven thousand went into the ground beneath the town and stayed there, fed and watered and counted, while the paperwork told the country they had gone east by road.\n\nThat means the sealed shelters, the thirty days of stores, the blank ledgers and the closed file are one document read four ways. There was no panic and no convoy. There was an instruction, and the instruction was to make a town look empty from the outside and stay that way. The relay is still on air because somebody needed the country to hear that Copper Mesa was simply quiet now. We have a name for that somebody, and it is in the books. Not because they forgot to hide it. Because the office that wrote the file is the office asking the questions.',
        reward: { items: ['ledger_token'], rep: { ledger: 3 } }
      },
      {
        id: 's_rb_2',
        label: 'Someone is keeping the relay alive on purpose',
        requires: ['f_rb_live_operator', 'f_rb_supplied_after', 'f_rb_today_inhabited'],
        epilogue: 'Two people are keeping this station on air, and one of them is in the hut with the calendar. The reel is dated eleven weeks after the shutdown. The diesel was bought two months after that. The sign-on is in the same hand every time. This is not a machine left running in a windmill. Somebody is feeding tape, signing for fuel, and putting the name of the county into the sky on a schedule.\n\nWhich makes the broadcast an instrument rather than evidence of accident: a voice pointed outward, saying the same eleven thousand words to anyone who tunes the band. The town needed the world to believe it was empty and untroubled. So the question stops being whether anyone is alive at Copper Mesa and becomes who the performance is for, and what it is buying them.',
        reward: { items: ['scrap_copper'], rep: { choir: 1, free_line: 1 } }
      }
    ],
    reward: { items: ['scrap_gear'], rep: { ledger: 2 } }
  },

  {
    id: 'case_storm_ward',
    title: 'The Sealed Air',
    chapter: 3,
    brief: 'The night Copper Mesa was closed, a corrosive-haze front crossed the flats from the northeast and sat over the basin for two days. The county logged it: a black rain that ate rust off windmill towers and killed stock within a mile of the ground. The town was not touched by it. That is the part that will not sit right.\n\nCopper Mesa switched its air handling to full seal the same night, scrubber banks drawing, every exterior door dogged against the weather, with the order timed to the hour the front arrived. The flats outside took the storm raw and the water went metallic within the year. A seal arranged to the hour of a storm is not weather management. Either the town knew the front was coming and hid from it while the country did not, or the storm is why the seal was ordered, and in the second case the outside was left in it on purpose.',
    clues: [
      {
        id: 'clue_sw_weather',
        name: 'County meteorological log, Verdigris basin',
        type: 'log',
        poi: 'observatory',
        text: 'The county meteorological ledger for the basin, copied out by hand: haze front entered from the northeast at 2140 on the shutdown night, crossed the flats at walking pace, rain black and sour, grass killed in a two-mile band along the flats road. A marginal note in the county hand: "perished stock, wells gone metal. Not our business, town is shut."',
        fact: 'f_sw_storm_track'
      },
      {
        id: 'clue_sw_ventlog',
        name: 'Copper Mesa ventilation order 41-C/14',
        type: 'log',
        poi: 'substation',
        text: 'A ventilation order on plant letterhead: "All air handling to full seal, scrubbers A and B to draw continuously, no fresh-air damper above fifteen per cent, all exterior doors dogged, effective on the hour and not before." It carries the shutdown date and an hour earlier than the forecast arrival of the front. It is a standing form with the date typed into the top line, not a decision made in the dark.',
        fact: 'f_sw_seal_ordered'
      },
      {
        id: 'clue_sw_filter',
        name: 'Spent filter cassettes, yard drum',
        type: 'object',
        poi: 'reactor_yard',
        text: 'Two cassettes of filter medium pulled from the same model of housing, one from the town air handler and one from the county road-station blower, both dated the same week. The town cassette is clean enough to read print through. The county cassette is caked solid with the black deposit, and the metal of its frame has gone to powder in the hand.',
        fact: 'f_sw_filter_contrast'
      },
      {
        id: 'clue_sw_doors',
        name: 'Shelter door with manual override wheel',
        type: 'object',
        poi: 'bunker',
        text: 'A shelter door with its manual override wheel. The wheel is wound to the dogged position and pinned with a length of copper wire. On the inside face, stencilled: "OVERRIDE IS FOR USE BY THE DISTRICT SURVEY OFFICE ONLY. DO NOT WIND FROM WITHIN." Somebody outside wound this shut, and told the people inside they would not be let out that way. The stencil names the office the player carries on their own credentials.',
        fact: 'f_sw_doors_dogged'
      },
      {
        id: 'clue_sw_witness',
        name: 'Statement of a Cutter and Sons haulier',
        type: 'testimony',
        poi: 'market',
        text: 'A haulier who worked the flats for Cutter and Sons that season: "We ran the road with the windows up and wet masks, four loads of cow that died in the pen, and the town on the other side of the wire with its lights on like nothing was falling. When it cleared, the outside was grey to the fence and the inside of the wire was green. I never understood the fence."',
        fact: 'f_sw_outside_exposed'
      }
    ],
    facts: [
      {
        id: 'f_sw_storm_track',
        label: 'A corrosive-haze front crossed the flats on the shutdown night',
        desc: 'Northeast to southwest at walking pace, black rain, stock dead and grass killed in a two-mile band along the flats road. The county marked it and moved on.',
        source: 'clue_sw_weather'
      },
      {
        id: 'f_sw_seal_ordered',
        label: 'The seal was ordered in writing, dated before the front arrived',
        desc: 'A ventilation order on a standing form, with the date typed into the top line and the hour set an hour ahead of the front. It was prepared, not improvised.',
        source: 'clue_sw_ventlog'
      },
      {
        id: 'f_sw_filter_contrast',
        label: 'The town filter came through the storm clean; the county filter is caked in it',
        desc: 'Two cassettes of the same medium, same week, same weather. One ran sealed air and one ran the open flats. The difference was the town, not the filter.',
        source: 'clue_sw_filter'
      },
      {
        id: 'f_sw_doors_dogged',
        label: 'The shelter doors were dogged from outside, and the override is reserved to the Survey Office',
        desc: 'Wheel wound and pinned with copper wire, with a stencil on the inside face of the door. The instruction is aimed at the people inside, and it names an office rather than a man.',
        source: 'clue_sw_doors'
      },
      {
        id: 'f_sw_outside_exposed',
        label: 'The flats outside Verdigris took the full storm with no filtration at all',
        desc: 'A working haulier: dead stock, wet masks, and the town lit on the other side of the wire. The country was neither warned nor protected.',
        source: 'clue_sw_witness'
      },
      {
        id: 'f_sw_seal_timed',
        label: 'The sealing was timed to the storm rather than to the weather',
        desc: 'The order was set to the hour of the front and typed onto a standing form in advance. Nobody schedules a seal to the hour of a storm they did not know was coming.',
        source: 'd_sw_deliberate'
      },
      {
        id: 'f_sw_two_towns',
        label: 'There were two towns that night: one sealed, one left in the open',
        desc: 'Same medium, same week, same front, clean inside the line and ruined outside it. The difference in the air was made by the seal, and it stopped at the town boundary.',
        source: 'd_sw_contrast'
      },
      {
        id: 'f_sw_exposure_intended',
        label: 'Leaving the flats exposed was part of the plan',
        desc: 'If the intention had been the survival of everyone in the basin, the order would have been extended down the flats road, where the stock died. It was not extended. The protection had a boundary and the boundary was drawn around eleven thousand people.',
        source: 'd_sw_intended'
      },
      {
        id: 'f_sw_hazard_chosen',
        label: 'The haze was a tool in the plan, not an accident of weather',
        desc: 'A front crossing the basin is weather. A pre-dated seal covering one town and excluding its neighbours is intent. The storm was not something that happened to the plan; it was the hour the plan was working.',
        source: 'd_sw_hazard'
      },
      {
        id: 'f_sw_confinement_ordered',
        label: 'The confinement and the sealing were issued together by the Survey Office',
        desc: 'The doors were dogged from outside on the same night the air was sealed, and the override was reserved to the district office. Both ran to one clock and one seal.',
        source: 'd_sw_doors'
      },
      {
        id: 'f_sw_warded',
        label: 'The safety of the town was purchased with the exposure of the country',
        desc: 'The outside was left in the storm on purpose and the inside was sealed on the same clock by the same office. The hazard was the method, and the flats were the price.',
        source: 'd_sw_terminal'
      }
    ],
    deductions: [
      {
        id: 'd_sw_deliberate',
        inputs: ['f_sw_seal_ordered', 'f_sw_storm_track'],
        output: 'f_sw_seal_timed',
        label: 'The sealing was timed to the storm, not to the weather',
        note: 'The order sits on a standing form with the date typed in, and it takes effect an hour before the front arrives. Nobody sets an order to the hour of a storm they did not know was coming, unless they held the forecast. A forecast means the timing was arranged in advance rather than improvised in the dark.'
      },
      {
        id: 'd_sw_contrast',
        inputs: ['f_sw_filter_contrast', 'f_sw_outside_exposed'],
        output: 'f_sw_two_towns',
        label: 'There were two towns that night: one sealed, one left in the open',
        note: 'The same filter medium, the same week, the same weather, and the two results are not comparable. No natural difference in exposure produces one cassette clean enough to read print through and the other reduced to powder. Something drew a line and made the air stop on one side of it.'
      },
      {
        id: 'd_sw_intended',
        inputs: ['f_sw_two_towns', 'f_sw_seal_timed'],
        output: 'f_sw_exposure_intended',
        label: 'Leaving the flats exposed was part of the plan',
        note: 'The seal was arranged in advance, and it was arranged around the town alone. If the intent had been everyone in the basin, the order would have run down the flats road, where the stock died. It did not. Protection that stops precisely at the boundary of the settlement is a decision about who counts, not a decision about weather.'
      },
      {
        id: 'd_sw_hazard',
        inputs: ['f_sw_exposure_intended', 'f_sw_storm_track'],
        output: 'f_sw_hazard_chosen',
        label: 'The haze was a tool in the plan, not an accident of weather',
        note: 'A front crossing the basin is weather. A pre-dated seal that covers one town and excludes its neighbours is intent. Put the two together and the storm was not an event that happened to the plan. It was the hour the plan was working.'
      },
      {
        id: 'd_sw_doors',
        inputs: ['f_sw_doors_dogged', 'f_sw_seal_timed'],
        output: 'f_sw_confinement_ordered',
        label: 'The doors were sealed as part of the same instruction',
        note: 'The shelter doors were dogged from outside on the night the air was sealed, and the override on the wheel is reserved to the district office, an office rather than a neighbour. Two separate instruments, one clock, one signature. The air and the doors were closed by the same hand.'
      },
      {
        id: 'd_sw_terminal',
        inputs: ['f_sw_hazard_chosen', 'f_sw_confinement_ordered'],
        output: 'f_sw_warded',
        label: 'The town was warded, and the country paid for it',
        note: 'If the outside was left in the storm on purpose, and the inside was sealed on the same clock by the same office, then the hazard was never a risk that came with the closure. It was the method. The seal was the point of the night, and the flats around Verdigris were the price of it.'
      }
    ],
    solutions: [
      {
        id: 's_sw_1',
        label: 'The haze was aimed at the flats, not at the town',
        requires: ['f_sw_hazard_chosen', 'f_sw_exposure_intended'],
        epilogue: 'It was not weather. The order was typed onto a standing form and dated before the front arrived, and it stopped at the town boundary, a line clean enough that the same filter medium in the same week came out clean on one side of it and caked solid on the other. The people outside the wire were given no mask, no warning and no door. Somebody chose who the storm belonged to, and the eleven thousand were not on the list.\n\nThat also means the sealed shelters and the blank ledgers were not the frantic work of one bad night. There was a method here: seal the town, let the country take the weather, and record the whole thing as a shutdown that happened to coincide with a storm. Which means somebody with a calendar and a signature knew the front was coming. That is not a level of preparation a panic produces. It is a level of preparation an office produces.',
        reward: { items: ['field_notebook'], rep: { free_line: 2 } }
      },
      {
        id: 's_sw_2',
        label: 'The town was sealed because it was built to be a sealed town',
        requires: ['f_sw_warded', 'f_sw_confinement_ordered'],
        epilogue: 'Put the dogged door and the ventilation order side by side and they are the same document in two media. The plant sealed the air, the district office kept the key to the door, and both happened on the same night with the same confidence that it would not be needed often. This was not a night of bad air. It was the design of a place that was going to stay shut, with a written procedure for the day somebody opened it.\n\nThe stencil on the inside of the door gives the game away. The override belongs to the Survey Office. Not the county, not the company, not a neighbour with a strong arm and a reason. The office. So the instruction to seal eleven thousand people in was issued by the same institution that is now sending somebody out to ask how a town of eleven thousand came to be missing. I want that office file. I am not sure I want to open it.',
        reward: { items: ['scrap_copper'], rep: { ledger: 1, choir: -1 } }
      }
    ],
    reward: { items: ['scrap_ceramic'], rep: { free_line: 1, ledger: 1 } }
  },

  {
    id: 'case_letter_canteen',
    title: 'Eleven Thousand Breakfasts',
    chapter: 4,
    brief: 'The rails still run into Verdigris Flats. The spur was cut to move ore in, and after the shutdown it should have rusted where it lay. Instead the rail head on the depot road is bright down the middle, the sleepers are newer than the ballast, and the freight agent still keeps a telephone. Somebody kept this railway. The question is what they used it for.\n\nThe depot commissary kept a canteen ledger. Meals are booked against a headcount, every week, for eleven weeks after the shutdown, and the headcount is eleven thousand. Then the twelfth week is struck through and the ledger says no issue, and the count goes to zero for good. A town does not stop feeding eleven thousand people because of a paper decision. It stops because the people are somewhere else. The ledger says how many. The freight ticket book says how. The manifest would say where, and the manifest is not in the file.',
    clues: [
      {
        id: 'clue_lc_ledger',
        name: 'Canteen ledger, depot commissary',
        type: 'log',
        poi: 'depot',
        text: 'A bound ledger of the depot commissary, ruled in three columns: date, heads, meals issued. The heads column runs eleven thousand, seven days a week, from the shutdown night forward for eleven weeks. The meals column runs to four per head per day, written in one clerk hand throughout, with no gaps for a feast or a funeral.',
        fact: 'f_lc_meal_counts'
      },
      {
        id: 'clue_lc_crossed',
        name: 'Struck week, canteen ledger',
        type: 'log',
        poi: 'depot',
        text: 'The twelfth week of the same ledger is struck through with a single ruled line, and beneath it, in the clerk hand, two words: no issue. The heads column for that week is blank, and every week after it is blank too. The ledger was not closed. It was emptied from a certain week forward.',
        fact: 'f_lc_week_crossed'
      },
      {
        id: 'clue_lc_tickets',
        name: 'Freight ticket book, outbound stubs',
        type: 'object',
        poi: 'depot',
        text: 'A bound book of outbound freight tickets, four hundred and six stubs, all in the depot agent hand, dated across the eleven weeks. The stubs record consignee, weight and car count. The consignee column on every stub after the first week has been blotted out, not torn, with a blotter, so the paper underneath can still be read against a lamp.',
        fact: 'f_lc_ticketbook'
      },
      {
        id: 'clue_lc_wear',
        name: 'Spur roadbed and rail head',
        type: 'object',
        poi: 'depot',
        text: 'The spur where it leaves the depot yard: rail head polished bright to the gauge, sleepers of fresh creosote, ballast still pale on top. A line left idle for forty-one years has weeds in the ballast and rust freckled across the rail. This one has been worked, and worked recently.',
        fact: 'f_lc_spur_used'
      },
      {
        id: 'clue_lc_permits',
        name: 'Sheriff register of travel permits',
        type: 'log',
        poi: 'police',
        text: 'The town sheriff register of travel permits, kept close to hand in the post. Forty-one permits in a row, all issued after the shutdown, all to a company detail, all endorsed goods only, the endorsement that lets a train out of the district without its manifest being read. No individual names. No destinations. It is a list of departures with the passengers left off it.',
        fact: 'f_lc_permits'
      },
      {
        id: 'clue_lc_manifest',
        name: 'Depot manifest index, 11-1 to 11-13',
        type: 'log',
        poi: 'bank',
        text: 'The depot manifest index, kept in the strong room of the old bank because that is where the station agent kept it. It runs 11-1 through 11-13. The file for 11-13, the movement of the eleventh week, is not on the shelf. The stub is left: 11-13 WITHDRAWN - ORIGINATING OFFICE. It was withdrawn, not lost, and the withdrawal is dated and initialled.',
        fact: 'f_lc_manifest_gap'
      }
    ],
    facts: [
      {
        id: 'f_lc_meal_counts',
        label: 'The depot canteen fed eleven thousand people for eleven weeks after the shutdown',
        desc: 'Every day, every week, at four meals a head. This is the headcount of a living town, not a stocktake.',
        source: 'clue_lc_ledger'
      },
      {
        id: 'f_lc_week_crossed',
        label: 'The canteen ledger stops dead in the twelfth week and says no issue',
        desc: 'One ruled line through the week, the heads column blank from there on. The kitchen closed because the people left, not because the clerk abandoned the book.',
        source: 'clue_lc_crossed'
      },
      {
        id: 'f_lc_ticketbook',
        label: 'Four hundred and six outbound tickets were sold in the eleven weeks, and the consignee column is blotted out',
        desc: 'Weights and car counts intact, destinations erased with a blotter that can still be read against a lamp. Somebody took the trouble to erase one column only.',
        source: 'clue_lc_tickets'
      },
      {
        id: 'f_lc_spur_used',
        label: 'The spur was worked hard in that period, and has been worked recently',
        desc: 'Bright rail head, fresh sleepers, pale ballast. Not a line left to rot for four decades.',
        source: 'clue_lc_wear'
      },
      {
        id: 'f_lc_permits',
        label: 'Forty-one travel permits were issued to a company detail and endorsed goods only',
        desc: 'The sheriff own register, names omitted, destinations omitted. Goods only is the endorsement that lets a train out of the district without its manifest being examined.',
        source: 'clue_lc_permits'
      },
      {
        id: 'f_lc_manifest_gap',
        label: 'The manifest for the movement was withdrawn from the depot files by the originating office',
        desc: 'File 11-13 is off the shelf; the stub remains, dated and initialled. The record of where the town went was removed by an office, on purpose.',
        source: 'clue_lc_manifest'
      },
      {
        id: 'f_lc_still_there',
        label: 'All 11,000 were still being fed in Verdigris Flats weeks after the shutdown',
        desc: 'The town was not emptied on the shutdown night. It emptied later, all at once, and it emptied by rail.',
        source: 'd_lc_present'
      },
      {
        id: 'f_lc_moved_by_rail',
        label: 'The eleven thousand left Verdigris by train in the eleventh week',
        desc: 'Not in a panic, not by road, and not on the night the plant was closed. They were moved as a body, later, by rail.',
        source: 'd_lc_rail'
      },
      {
        id: 'f_lc_freight_was_people',
        label: 'The outbound freight traffic was the town own population',
        desc: 'Two books kept by two men who disliked each other, agreeing on scale, and only one of them mentions people. Whatever left Verdigris on the spur, it was not goods for a market somewhere.',
        source: 'd_lc_goods'
      },
      {
        id: 'f_lc_destination_withheld',
        label: 'The town was moved, and where it was moved to was deliberately erased',
        desc: 'Only the destination column is gone. The office that pulled the file knew exactly what it was doing, and left behind the evidence that it had.',
        source: 'd_lc_erased'
      },
      {
        id: 'f_lc_movement_concealed',
        label: 'The relocation was carried out to be deniable',
        desc: 'Eleven thousand people were moved, and the only sentence anyone needed to write about it was that they had never left.',
        source: 'd_lc_conceal'
      },
      {
        id: 'f_lc_relocated',
        label: 'Eleven thousand people were relocated off the maps to an unnamed place',
        desc: 'They were fed, they were moved as freight, and the destination was taken out of the record by an office. The question is no longer where they went. It is who has been keeping them off the map ever since.',
        source: 'd_lc_terminal'
      }
    ],
    deductions: [
      {
        id: 'd_lc_present',
        inputs: ['f_lc_meal_counts', 'f_lc_week_crossed'],
        output: 'f_lc_still_there',
        label: 'The population was still in town weeks after the shutdown',
        note: 'A canteen ledger books meals against a headcount, and eleven thousand meals a day at four per head is not a bookkeeping fiction. Somebody was cooking it. The count then stops in a single week with no issue in the margin, which means the kitchens closed because the people left, and they left weeks after the night the file says they went.'
      },
      {
        id: 'd_lc_rail',
        inputs: ['f_lc_week_crossed', 'f_lc_spur_used'],
        output: 'f_lc_moved_by_rail',
        label: 'The town emptied by rail, weeks after the shutdown',
        note: 'The count ends in the same season the spur was worked hard enough to polish the rail. The rail is the only door wide enough for a town of eleven thousand. The flats are four days of road from the nearest railhead, and the road is logged, so they did not walk. They went on the line.'
      },
      {
        id: 'd_lc_goods',
        inputs: ['f_lc_ticketbook', 'f_lc_permits'],
        output: 'f_lc_freight_was_people',
        label: 'The freight was the population',
        note: 'Two books, two men, two weeks: the agent tickets count four hundred and six carloads of freight in eleven weeks, the sheriff permits count forty-one departures of a company detail with no names on them. Four hundred carloads is not commissary resupply for a town of eleven thousand. It is eleven thousand people and everything they own, and the only way to move both is to move them as freight.'
      },
      {
        id: 'd_lc_erased',
        inputs: ['f_lc_ticketbook', 'f_lc_manifest_gap'],
        output: 'f_lc_destination_withheld',
        label: 'The destination was removed on purpose, and only the destination',
        note: 'The weights, the car counts and the dates were left standing. One column was blotted. The manifest file was withdrawn by the originating office and the stub was left in the index. That is not loss. Somebody wanted the fact of the movement on the record and the place of it nowhere in it.'
      },
      {
        id: 'd_lc_conceal',
        inputs: ['f_lc_destination_withheld', 'f_lc_freight_was_people'],
        output: 'f_lc_movement_concealed',
        label: 'The relocation was engineered to vanish from the record',
        note: 'Nobody blots a column and withdraws a manifest for a routine company movement. You do it when the fact of the movement is admissible and the place is not. The two halves of the record are the tell: they were content for the trains to have run, and never for the trains to have arrived anywhere.'
      },
      {
        id: 'd_lc_terminal',
        inputs: ['f_lc_movement_concealed', 'f_lc_still_there'],
        output: 'f_lc_relocated',
        label: 'Eleven thousand people were relocated off the maps to an unnamed place',
        note: 'They were fed for eleven weeks after the town was declared empty, they were moved as freight, and the destination was taken out of the record by an office. The people of Verdigris are not missing. They are somewhere that somebody has paid to keep off every index and every map.'
      }
    ],
    solutions: [
      {
        id: 's_lc_1',
        label: 'Eleven thousand people were moved out of Verdigris by rail',
        requires: ['f_lc_moved_by_rail', 'f_lc_still_there'],
        epilogue: 'The canteen settles the argument with the file. The town was fed for eleven weeks after the night the plant was closed, eleven thousand heads at four meals a day in a clerk careful hand, and then the ledger goes blank in a single week with two words beside it: no issue. That is not a panic and not a departure. That is an operation with a date on it. When eleven thousand people stop being fed in the same week the spur is worked hard enough to polish the rail, they have gone out on the trains.\n\nSo the evacuation of the first night was never an evacuation. It was the announcement. The trains came later, in ones and twos, and the depot agent sold four hundred and six carloads of freight without once writing down who it was for. What I cannot get out of this room is the one line I need: the destination. The manifest for the movement was withdrawn by the originating office, and the stub was left behind, initialed and dated, because somebody wanted the fact of the movement on the record and the place of it nowhere on it.',
        reward: { items: ['scrap_gear', 'field_notebook'], rep: { ledger: 2, free_line: 2 } }
      },
      {
        id: 's_lc_2',
        label: 'The manifest was withdrawn by an office, not lost',
        requires: ['f_lc_destination_withheld', 'f_lc_manifest_gap', 'f_lc_relocated'],
        epilogue: 'Nothing here was lost. The tickets survive with the consignee column blotted and the weights and dates left standing. The manifest index runs to 11-13 with the stub for the last movement in place. The withdrawal is dated and initialled in the house style, and the district office does not lose files, it moves them. Somewhere within four hundred miles there is a sheet of paper with a place name on it, filed by the party that made the trains unnecessary.\n\nThat narrows the field to people with a key to a strong room and a reason to use it. I do not enjoy the arithmetic here. Eleven thousand is a defensible number for a company town, and the risk was never the town, it was the plant standing behind it. But an office that pulls a manifest does not do it for the good of the record. Somebody decided the trains should not have arrived anywhere, wrote that down, and signed it.',
        reward: { items: ['ledger_token'], rep: { ledger: 3 } }
      }
    ],
    reward: { items: ['scrap_cloth'], rep: { ledger: 2, free_line: 1 } }
  },

  {
    id: 'case_the_replacement',
    title: 'The Replacement',
    chapter: 4,
    brief: 'Where the missing manifest pointed, the file goes quiet. Then, inside the Survey Office own survey sets, it starts talking again, in the numbering scheme of the office, on the paper of the office, under the seal of the office. There is a place called 41-C. It is not on any map a surveyor has published since. Its position is written once, on paper, in a hand I have seen on my own field forms.\n\nThe station never went cold. The service log at Copper Mesa shows the plant restarted nine days after the closure and running without a break since, a school roll is certified every spring for a population of eleven thousand, and freight still moves to a place addressed only as 41-C. The people of Verdigris are not dead and they are not gone. They are forty-one years into a decision, and the decision carries a seal I recognise. It is the seal of the office paying me to write this report.',
    clues: [
      {
        id: 'clue_reve_memo',
        name: 'Survey Office Memorandum 41-C/9',
        type: 'log',
        poi: 'library',
        text: 'A district memorandum in the Survey Office own series, filed in the town library because the district office used the library back room for its working files. It directs the removal of a company population of eleven thousand from the survey district, gives the exclusion radius of a live reactor as the stated reason, and notes that the station output remains required to the grid and to the district load. Three signatures. All Survey Office.',
        fact: 'f_reve_memo'
      },
      {
        id: 'clue_reve_plantlog',
        name: 'Station service log, Copper Mesa',
        type: 'log',
        poi: 'reactor_yard',
        text: 'The plant service log, thicker than it should be for a closed station. The last entry under the shutdown date reads SCRAM ORDERED - CONTROLLED. Nine days later, in a fresh hand, a new column starts: RESTART - PLANT HELD AT FIFTY PER CENT FOR DISTRICT LOAD. The book runs unbroken to the present year, with a weekly entry and a monthly inspection throughout.',
        fact: 'f_reve_plantlog'
      },
      {
        id: 'clue_reve_plate',
        name: 'Survey plate 41-C-9, Calico Draw',
        type: 'photo',
        poi: 'observatory',
        text: 'A Survey Office aerial plate, printed on office stock, annotated in the house hand: 41-C, CALICO DRAW - POP. ELEVEN THOUSAND - WATER RIGHTS SECURED - BRING NORTH. The plate photographs a town no published map carries: a chapel, a school with a yard, a mill, a water tower, and a short spur running north out of frame.',
        fact: 'f_reve_plate'
      },
      {
        id: 'clue_reve_roll',
        name: 'School roll for Site 41-C, annual certification',
        type: 'log',
        poi: 'school',
        text: 'The roll book of the school at the sanctuary, kept in the Verdigris school because Verdigris was where the district examiner came. It lists every child in the draw, year by year, and the certification page carries the Survey Office seal for each year, including this one, signed by an examiner still on the roll of staff. A town that is gone does not send a roll to be stamped.',
        fact: 'f_reve_roll'
      },
      {
        id: 'clue_reve_dockets',
        name: 'Freight dockets to 41-C, current year',
        type: 'log',
        poi: 'depot',
        text: 'A sheaf of current-year freight dockets at the depot, addressed to 41-C and nowhere else: seed, feed, lamp oil, a crate of sodium lamps, a ticket for a sewing machine, a schoolmaster trunk. The dockets are signed for at the depot end by a Survey Office clerk, who files them with the station master and not with the company.',
        fact: 'f_reve_dockets'
      },
      {
        id: 'clue_reve_circular',
        name: 'Survey Office Circular 41-C, current issue',
        type: 'log',
        poi: 'bank',
        text: 'A circular in the strong room of the old bank, where the district vault has been kept since the office took the building: SITE 41-C IS NOT TO BE INDEXED, PLOTTED, OR REFERRED TO IN ANY PUBLICATION OF THE SURVEY. RENEWAL OF THIS ORDER IS REQUIRED ANNUALLY BY THE DISTRICT EXAMINER. The current year renewal is stapled to the front of the file, dated six months ago.',
        fact: 'f_reve_circular'
      }
    ],
    facts: [
      {
        id: 'f_reve_memo',
        label: 'A Survey Office memorandum ordered the removal of the town population from the survey district',
        desc: 'Eleven thousand people, the exclusion radius of a live reactor given as the reason, output required to the grid, three Survey Office signatures. The office now investigating the disappearance issued the order that caused it.',
        source: 'clue_reve_memo'
      },
      {
        id: 'f_reve_plantlog',
        label: 'The station restarted nine days after the shutdown and has never gone cold',
        desc: 'A controlled scram, then a fresh column of entries: restart, half load held for the district, weekly entries and monthly inspections, unbroken to this year.',
        source: 'clue_reve_plantlog'
      },
      {
        id: 'f_reve_plate',
        label: 'A Survey Office plate photographs a town of eleven thousand that no map records',
        desc: 'Calico Draw, annotated with the same designation the office uses in its internal series, with a chapel, a school, a mill and a spur.',
        source: 'clue_reve_plate'
      },
      {
        id: 'f_reve_roll',
        label: 'The sanctuary school roll is certified by the Survey Office every year, including this year',
        desc: 'Children listed year by year, the office seal on each certification page, the latest one signed by a living examiner on the staff roll.',
        source: 'clue_reve_roll'
      },
      {
        id: 'f_reve_dockets',
        label: 'Freight still moves to 41-C this year, signed for by a Survey Office clerk',
        desc: 'Seed, feed, lamp oil, a sewing machine, a schoolmaster trunk. Addressed by code, filed with the station master rather than the company.',
        source: 'clue_reve_dockets'
      },
      {
        id: 'f_reve_circular',
        label: 'Survey Office policy forbids indexing Site 41-C and requires the order renewed annually',
        desc: 'Not to be plotted, not to be published, renewal required every year by the district examiner. The current renewal is dated six months ago.',
        source: 'clue_reve_circular'
      },
      {
        id: 'f_reve_shutdown_staged',
        label: 'The station was never really closed. The closure was cover for continued operation',
        desc: 'A scram ordered and controlled, a restart nine days later, forty-one years of service entries. The plant declared safe is still turning.',
        source: 'd_reve_cover'
      },
      {
        id: 'f_reve_sanctuary',
        label: 'Calico Draw is Site 41-C, the place the Survey Office ordered unindexed',
        desc: 'Forty-one years of relocation in one valley, thirty miles north, on the office own paper.',
        source: 'd_reve_site'
      },
      {
        id: 'f_reve_alive',
        label: 'The people of Verdigris are alive at 41-C and the settlement is running',
        desc: 'A school roll certified each spring, lamp oil and a sewing machine on the freight dockets, a running railway office. This is a town, in the present tense.',
        source: 'd_reve_alive'
      },
      {
        id: 'f_reve_office_did',
        label: 'The relocation and the concealment were both the Survey Office own work',
        desc: 'The office is not investigating a disappearance it did not cause. It is investigating the residue of its own policy.',
        source: 'd_reve_office'
      },
      {
        id: 'f_reve_choice_live',
        label: 'The decision to keep 41-C hidden is still being made, by this office, this year',
        desc: 'The last choice to leave them where they are was made by the institution the player works for, and it will be made again unless somebody stops it.',
        source: 'd_reve_choice'
      },
      {
        id: 'f_reve_they_are_alive',
        label: 'The 11,000 of Verdigris are alive at Site 41-C and have been for 41 years',
        desc: 'Alive, counted, supplied, and off every map in the country, because the Survey Office decided the world was better off not knowing.',
        source: 'd_reve_terminal'
      }
    ],
    deductions: [
      {
        id: 'd_reve_cover',
        inputs: ['f_reve_memo', 'f_reve_plantlog'],
        output: 'f_reve_shutdown_staged',
        label: 'The shutdown was staged so the station could keep producing',
        note: 'The memorandum needs the plant output, and the service log shows the plant restarted nine days after it was declared dead and has run without a cold period since. Read together, the closure was never a shutdown. It was the paperwork you file so that nobody asks why a plant declared safe is still turning, and why eleven thousand people are not living beside it.'
      },
      {
        id: 'd_reve_site',
        inputs: ['f_reve_plate', 'f_reve_circular'],
        output: 'f_reve_sanctuary',
        label: 'The settlement on the plate is Site 41-C',
        note: 'Survey Office stock, Survey Office annotation, and a designation that appears in Survey Office circulars. Same series, same file number, same house convention. Nobody issues an internal code twice by accident. The town in Calico Draw and the place the circular forbids are one place, and the office photographed it itself.'
      },
      {
        id: 'd_reve_alive',
        inputs: ['f_reve_sanctuary', 'f_reve_roll', 'f_reve_dockets'],
        output: 'f_reve_alive',
        label: 'The people of Verdigris are alive at 41-C',
        note: 'The plate identifies 41-C as a town of eleven thousand with a school and a mill, and the roll lists children year after year in the same place, and freight addressed to the same code keeps arriving with lamp oil and a schoolmaster trunk. All three are current. A census of the dead is not stamped every spring, and a delivery to a dead site is not signed for by a living clerk.'
      },
      {
        id: 'd_reve_office',
        inputs: ['f_reve_memo', 'f_reve_circular'],
        output: 'f_reve_office_did',
        label: 'The Survey Office moved the town and then took it off the maps',
        note: 'Two instruments, one office, two halves of the same work: a memorandum that removes eleven thousand people from the district, and a circular that keeps the place they went to out of every published index. One is the act and one is the concealment, and they carry the same seal and the same clearance. The office that sent me here is the office that emptied the town.'
      },
      {
        id: 'd_reve_choice',
        inputs: ['f_reve_circular', 'f_reve_roll'],
        output: 'f_reve_choice_live',
        label: 'The hiding is a standing decision, renewed every year',
        note: 'The circular does not lapse. It requires renewal annually by the district examiner, and this year renewal is dated six months ago while the roll carries this year certification. Nobody forgot. Somebody signed for it, recently, knowing exactly what was being renewed, and the town was still on the roll that morning.'
      },
      {
        id: 'd_reve_terminal',
        inputs: ['f_reve_alive', 'f_reve_office_did'],
        output: 'f_reve_they_are_alive',
        label: 'The eleven thousand are alive at 41-C, hidden there by the Survey Office for 41 years',
        note: 'If the roll is current and the freight is current, they are alive. If the memorandum and the circular are both office instruments, they are alive somewhere the office chose, and the office has kept off the map. There is no reading left that fits both halves. They were not taken from the flats. They were moved, and they were moved by us.'
      }
    ],
    solutions: [
      {
        id: 's_reve_1',
        label: 'The people of Verdigris are alive at Site 41-C',
        requires: ['f_reve_they_are_alive', 'f_reve_choice_live', 'f_reve_shutdown_staged'],
        epilogue: 'Here is the file, whole, and it is not what I was told to expect. Copper Mesa Station was scrammed and held, not shut down. The governor was cut to make a shutdown look like a fault, the paperwork was closed to make the closure look final, and nine days later the plant was restarted and has run ever since, because the district needed the output and the district office wrote that down and signed it. Eleven thousand people were moved off the fence of a live reactor, out of range and off the map and out of the record, to a valley thirty miles north that the Survey Office has kept unindexed since. They are alive. They have been alive the whole time: a roll certified each spring, lamp oil and a sewing machine on the dockets, a town doing the ordinary business of living while this office told the country it ended.\n\nAnd here is the part I cannot hand back. The circular is not old paper. It renews annually, and the current renewal is dated six months ago, signed by an examiner still on the staff roll, my office and my seal and my chain of command choosing this year to let them stay where they are. Nobody forced that signature and nobody has been dead for forty-one years to explain it. The men who started this are all gone; the signature on the front of the file is current. So the question of whether eleven thousand people come back out of the draw is not a historical question and it is not one I can close from this desk. It is the same question it has been every year since, and for forty-one years the answer has been no. The renewal is due again in six months. I have the file. I have the seal.',
        reward: { items: ['case_choir_reward', 'field_notebook'], rep: { ledger: 3, choir: -1, free_line: 1 } }
      },
      {
        id: 's_reve_2',
        label: 'The station is still producing today',
        requires: ['f_reve_shutdown_staged', 'f_reve_alive'],
        epilogue: 'Put the two logs together and the plant history is simple. A scram was ordered and controlled. The station was closed on paper. Nine days later it was restarted, held at half load for the district, and it has been inspected every month for forty-one years without a single cold period entered in the book. Copper Mesa has been burning the whole time. Anyone who tells me the plant was retired is quoting a document rather than a condition.\n\nThat has consequences outside this valley, and not only the obvious ones. There is a working reactor sitting on a line nobody has had business with for four decades, its output going to a load that has never been metered, and the last full inspection by anyone who was not Survey Office is of a date I can put on this page. Somebody has been keeping it warm for a town of eleven thousand, and every other person in the country has been taught to believe it is out. I am not yet sure what the plant is worth. I am quite sure it is worth more than the map says.',
        reward: { items: ['scrap_glass'], rep: { choir: 2, free_line: 2 } }
      }
    ],
    reward: { items: ['ledger_token', 'field_notebook'], rep: { ledger: 2, free_line: 1 } }
  }
];
