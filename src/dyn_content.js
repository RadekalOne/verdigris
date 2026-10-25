window.VG = window.VG || {};
(function (VG) {
  'use strict';

  /* VERDIGRIS - living flats: radio traffic, calls, raids, convoys.
     Plain data. No module syntax; the game loads this as a script. */
  VG.DYN_CONTENT = {
    radio: {
      ambient: [
        {
          who: 'MESA RELAY',
          text: 'Copper Mesa relay is up. Anything on three, say again.'
        },
        {
          who: 'TRADER 6',
          text: 'Road is passable as far as the ward road. After that I stopped looking.'
        },
        {
          who: 'CH 3',
          text: 'Somebody is holding channel three open. It is not one of ours.'
        },
        {
          who: 'ANONYMOUS',
          text: 'Is the Survey Office still paying field work out here.'
        },
        {
          who: 'BAND',
          text: 'Nothing on three. Last traffic was a runner heading east who did not check in.'
        },
        {
          who: 'LINE 9',
          text: 'Line nine is running late. Two trucks are still out on the north track.'
        },
        {
          who: 'LEDGER CLERK',
          text: 'Form 44-B is due back. We are still issuing forms for a town of eleven thousand.'
        },
        {
          who: 'THE CHOIR',
          text: 'The machine is warm tonight. You can feel it from the chapel steps.'
        },
        {
          who: 'DRIFTER',
          text: 'Two days of water. I am not complaining. I am counting.'
        },
        {
          who: 'ROAD POST 4',
          text: 'Gate four is closed for repairs. It has been closed for repairs since the spring.'
        },
        {
          who: 'FREE LINE',
          text: 'Free Line answers for nobody. We answer for the road.'
        },
        {
          who: 'BAND',
          text: 'The relay is taking requests. The song has been the same one for years.'
        },
        {
          who: 'SCOUT 12',
          text: 'Fresh boot print at the mill. Single file, heading north, no tracks coming back.'
        },
        {
          who: 'ANONYMOUS',
          text: 'The canteen door at the depot is open. It has been open for eleven years.'
        },
        {
          who: 'RELAY DESK',
          text: 'Carrier check at the top of the hour. All well. All well.'
        },
        {
          who: 'TRADER 11',
          text: 'Buying glass by the sheet. Paying in wire, like it is still 1950.'
        },
        {
          who: 'HAULER',
          text: 'Truck is down to one wheel on the flats road. Making it slow.'
        },
        {
          who: 'MESA RELAY',
          text: 'Whoever is running the test tone, please stop. It unsettled the dogs and we had four.'
        },
        {
          who: 'SURVEY OFFICE',
          text: 'Field post is open for the season. Knock before the door comes off.'
        },
        {
          who: 'DROVER WATCH',
          text: 'Drovers crossed the north track at dawn. We did not go out and look.'
        },
        {
          who: 'ANON RELAY',
          text: 'There is a voice on the low band reading the same page over. I stopped answering it.'
        },
        {
          who: 'SETTLER',
          text: 'Moved the camp two hundred yards west. The wind changed. That is the whole reason.'
        },
        {
          who: 'BAND',
          text: 'Free Line convoy is on the depot road. Give them room and keep your hands visible.'
        },
        {
          who: 'CH 7',
          text: 'Channel seven is for weather. It has not been for weather for a long time.'
        },
        {
          who: 'TOWN WATCH',
          text: 'The chapel bell rang by itself at six. Wind does not ring bells.'
        },
        {
          who: 'MICA',
          text: 'Found a payroll stub in the yard office. The name on it is not a person I know.'
        },
        {
          who: 'DRIFTER',
          text: 'I have been walking since Tuesday. It should be noted that I am not lost.'
        },
        {
          who: 'LEDGER CLERK',
          text: 'If you have a badge number, say it slowly. We have to write it down.'
        },
        {
          who: 'BAND',
          text: 'Quiet on three for the hour. Stand by.'
        },
        {
          who: 'TRADER 2',
          text: 'Selling ceramic tile to anyone with a floor. I have more tile than sense.'
        },
        {
          who: 'HAULER',
          text: 'Out past the gas stop and back before dark. That is the whole plan.'
        },
        {
          who: 'ANONYMOUS',
          text: 'Do not tell the Choir where the water is. They know already, but do not help them.'
        }
      ],
      night: [
        {
          who: 'NIGHT WATCH',
          text: 'Lights at the old water stop again. Third night. I am not going over there again either.'
        },
        {
          who: 'NIGHT WATCH',
          text: 'Counted eleven shapes across the yard fence at two. Eleven is a number I do not like.'
        },
        {
          who: 'CH 3',
          text: 'There is a carrier on channel three that hums when it should be dead. Say again if you copy.'
        },
        {
          who: 'ANONYMOUS',
          text: 'I am at the mill. Please do not ask where I am.'
        },
        {
          who: 'NIGHT WATCH',
          text: 'All quiet except the sound out of the reactor yard. I stopped going out there in eighty-four.'
        },
        {
          who: 'TRADER 2',
          text: 'Parked under the tank with the lights off. I move before first light.'
        },
        {
          who: 'BAND',
          text: 'Night traffic is thin. Keep it short.'
        },
        {
          who: 'LINE 9',
          text: 'Nine is parked at the gate house. Nine does not leave until the road dries.'
        },
        {
          who: 'ANON RELAY',
          text: 'Somebody is reading a manifest on the low band. Same list every night, a little longer.'
        },
        {
          who: 'NIGHT WATCH',
          text: 'The dog went into the chapel and would not come out. I am not going in after the dog.'
        },
        {
          who: 'RELAY DESK',
          text: 'Signing off for the night. Carrier check at midnight. All well.'
        },
        {
          who: 'THE CHOIR',
          text: 'We keep the vigil at the yard gate. You are welcome to stand with us. You do not have to come in.'
        },
        {
          who: 'MICA',
          text: 'Sleeping rough at the substation. The relay hum is better than the wind.'
        },
        {
          who: 'ANONYMOUS',
          text: 'Do not send anyone to the north road. I mean it.'
        },
        {
          who: 'NIGHT WATCH',
          text: 'Moon is up. That is the whole report.'
        },
        {
          who: 'HAULER',
          text: 'Sleeping in the truck. If you hear it running, that is me leaving.'
        },
        {
          who: 'BAND',
          text: 'Nobody on three. We will hold the hour open anyway.'
        }
      ],
      weather: {
        clear: [
          {
            who: 'MESA RELAY',
            text: 'Clear over the basin. Good conditions for hauling and for being seen.'
          },
          {
            who: 'NIGHT WATCH',
            text: 'Stars are out. That makes the yard look closer than it is.'
          },
          {
            who: 'ROAD POST 4',
            text: 'Visibility to the ridge and past it. First time in a week.'
          },
          {
            who: 'TRADER 6',
            text: 'Clear enough to see the old town from here. I look every time.'
          },
          {
            who: 'BAND',
            text: 'Clear night, no traffic. Take it while it lasts.'
          },
          {
            who: 'HAULER',
            text: 'Good light for the last of the run.'
          }
        ],
        haze: [
          {
            who: 'MESA RELAY',
            text: 'Haze on the flats. Keep your filters on and keep your sentences short.'
          },
          {
            who: 'NIGHT WATCH',
            text: 'Haze makes the lights look close. The lights are not close.'
          },
          {
            who: 'TRADER 11',
            text: 'Dose is up in the haze. I am running with the scrubber on and the windows shut.'
          },
          {
            who: 'CH 3',
            text: 'Haze is thick enough to eat the signal. Say again, say again.'
          },
          {
            who: 'ROAD POST 4',
            text: 'Marker posts are gone from the road. Follow the ruts.'
          },
          {
            who: 'BAND',
            text: 'Haze report from the basin. Visibility poor. Take your time.'
          }
        ],
        wind: [
          {
            who: 'ROAD POST 4',
            text: 'Wind off the north side. Sand on the road in drifts.'
          },
          {
            who: 'HAULER',
            text: 'Wind is taking the tarp off the load. I am tying it down again.'
          },
          {
            who: 'NIGHT WATCH',
            text: 'Wind tonight. It comes off the flats and it does not stop at the fence.'
          },
          {
            who: 'MESA RELAY',
            text: 'Wind is shaking the mast. The carrier is steady, which is more than I can say for me.'
          },
          {
            who: 'TRADER 6',
            text: 'Blowing hard enough that the dust is in the cab. I am pulling in.'
          },
          {
            who: 'BAND',
            text: 'High wind advisory. If you are on the road, you already know.'
          }
        ],
        rain: [
          {
            who: 'MESA RELAY',
            text: 'Rain on the flats. It comes down black and it smells like the old pond.'
          },
          {
            who: 'TRADER 2',
            text: 'Rain has washed the road out by the mill. I am taking the long way round.'
          },
          {
            who: 'NIGHT WATCH',
            text: 'Rain since midnight. The sound on the tin roof is the only thing out here.'
          },
          {
            who: 'ROAD POST 4',
            text: 'Water is standing in the low crossing. It does not look deep. It is deep.'
          },
          {
            who: 'CH 3',
            text: 'Rain is loud on the roof of the relay hut. I can barely read you.'
          },
          {
            who: 'BAND',
            text: 'Rainfall on the basin. Weather turns by ten.'
          }
        ],
        dust: [
          {
            who: 'ROAD POST 4',
            text: 'Dust wall to the east. Nobody is moving on the flats road today.'
          },
          {
            who: 'TRADER 6',
            text: 'Cannot see the mesa. Staying put until it passes.'
          },
          {
            who: 'HAULER',
            text: 'Dust has it. I am stopped at the gate house with the truck pointed into it.'
          },
          {
            who: 'NIGHT WATCH',
            text: 'Dust all day. The dogs did not like it either.'
          },
          {
            who: 'MESA RELAY',
            text: 'Carrier is low. If I go quiet, the dust is doing it, not me.'
          },
          {
            who: 'BAND',
            text: 'Dust storm across the basin. Hold your positions.'
          }
        ]
      }
    },
    survivors: [
      'DELACROIX',
      'MARLOW',
      'THE WIDOW',
      'NO NAME',
      'SABLE',
      'HOLLIS',
      'BRAM',
      'ODETTA',
      'RUSKIN',
      'PELL',
      'MERCER',
      'LOWE',
      'KIT',
      'ADA',
      'CASS',
      'JUNIPER',
      'THE COPPER KID',
      'THE TALLYMAN',
      'OLD HENRY',
      'SISTER MAY',
      'FARROW',
      'MOTH',
      'KESSLER',
      'GRAY',
      'THE HOSTLER',
      'PIP',
      'WINTERS'
    ],
    calls: [
      {
        id: 'call_01',
        who: 'DELACROIX',
        text: 'Anyone on three. I am under the frame at the old water stop. I can hear water running and that is new.',
        poiTypes: ['watertower', 'camp', 'well'],
        life: 420,
        hostile: false,
        reward: {
          items: [['aid_field_dressing', 1], ['aid_canteen', 1], ['scrap_copper', 2]],
          xp: 60,
          rep: { 'free_line': 1 }
        }
      },
      {
        id: 'call_02',
        who: 'MARLOW',
        text: 'This is Marlow at the mill. The gear box runs but the belt is not on it. I can turn it by hand if the arm still wants to.',
        poiTypes: ['mill', 'depot', 'foundry'],
        life: 360,
        hostile: false,
        reward: {
          items: [['mat_repair_tape', 1], ['scrap_gear', 2]],
          xp: 50
        }
      },
      {
        id: 'call_03',
        who: 'THE WIDOW',
        text: 'I worked the canteen books at the depot commissary. Eleven weeks of eleven thousand heads, then one ruled line and no more. I kept my copy of the ledger.',
        poiTypes: ['depot', 'bunker', 'guardhouse'],
        life: 600,
        hostile: false,
        reward: {
          items: [['scrap_cloth', 2], ['aid_ration_tin', 2]],
          xp: 80,
          rep: { 'ledger': 1 }
        },
        caseId: 'case_letter_canteen',
        clue: 'clue_lc_ledger'
      },
      {
        id: 'call_04',
        who: 'NO NAME',
        text: 'Do not ask me a name. I am at the garage with the roll door stuck and something outside working the handle.',
        poiTypes: ['garage', 'hangar', 'depot'],
        life: 300,
        hostile: false,
        reward: {
          items: [['mat_oil_drum', 1], ['ammo_flare', 2]],
          xp: 70
        }
      },
      {
        id: 'call_05',
        who: 'SABLE',
        text: 'I am at the substation and I have the dispatcher log. The last line is an outgoing message, priority, and nothing after it. I am not leaving without somebody seeing it.',
        poiTypes: ['substation', 'police', 'reactor_yard'],
        life: 540,
        hostile: false,
        reward: {
          items: [['aid_filter', 2], ['scrap_plastic', 1]],
          xp: 75
        },
        caseId: 'case_quiet_week',
        clue: 'clue_qw_dispatch'
      },
      {
        id: 'call_06',
        who: 'HOLLIS',
        text: 'Hollis at the gas stop. The pump is dry but I have a drum that is not. Send a truck or send word.',
        poiTypes: ['gas', 'depot', 'garage'],
        life: 540,
        hostile: false,
        reward: {
          items: [['mat_fuel_tablet', 1], ['aid_canteen', 1]],
          xp: 55
        }
      },
      {
        id: 'call_07',
        who: 'BRAM',
        text: 'I am at Shelter Bay 4. The door has a wheel on the outside and nothing on the inside, and the lock is dated five days before it was shut.',
        poiTypes: ['bunker', 'reactor_yard', 'depot'],
        life: 660,
        hostile: false,
        reward: {
          items: [['aid_surgical_tray', 1], ['mat_lead_shield', 1]],
          xp: 90
        }
      },
      {
        id: 'call_08',
        who: 'ODETTA',
        text: 'I have a leg wound that has not decided what it is doing. Clinic at the old school. I am not walking further.',
        poiTypes: ['clinic', 'school', 'house'],
        life: 420,
        hostile: false,
        reward: {
          items: [['aid_saline_stim', 1], ['aid_field_dressing', 2], ['scrap_glass', 1]],
          xp: 75
        }
      },
      {
        id: 'call_09',
        who: 'RUSKIN',
        text: 'I am at the relay mast. The duty log has entries after the shutdown night, same hand, all the way to this year. Somebody has been coming back to sign it.',
        poiTypes: ['radio_tower', 'guardhouse', 'substation'],
        life: 600,
        hostile: false,
        reward: {
          items: [['mat_antenna_copper', 1], ['aid_filter', 1]],
          xp: 85
        },
        caseId: 'case_radio_broadcast',
        clue: 'clue_rb_dutylog'
      },
      {
        id: 'call_10',
        who: 'PELL',
        text: 'Pell on three. Two of my people are down with the water. I can get the third out if somebody tells me which side of the mesa is not rusted.',
        poiTypes: ['camp', 'well', 'watertower'],
        life: 480,
        hostile: false,
        reward: {
          items: [['aid_filter', 2], ['aid_chalk_draught', 1]],
          xp: 65
        }
      },
      {
        id: 'call_11',
        who: 'MERCER',
        text: 'Mercer at the cannery. The floor is dry for the first time in eleven years and I do not know what that means.',
        poiTypes: ['cannery', 'market', 'depot'],
        life: 360,
        hostile: false,
        reward: {
          items: [['scrap_ceramic', 3], ['aid_ration_tin', 1]],
          xp: 50
        }
      },
      {
        id: 'call_12',
        who: 'LOWE',
        text: 'I am at the observatory with a ventilation order. The date is typed into the top line of a standing form and the hour is one ahead of the front. It was filled in weeks before.',
        poiTypes: ['observatory', 'substation', 'reactor_yard'],
        life: 540,
        hostile: false,
        reward: {
          items: [['aid_survey_pack', 1], ['scrap_plastic', 2]],
          xp: 80
        },
        caseId: 'case_storm_ward',
        clue: 'clue_sw_ventlog'
      },
      {
        id: 'call_13',
        who: 'KIT',
        text: 'I am at the school. The roll is certified every spring, eleven thousand names, and I mark them off myself. Nobody comes to the door and I sign it anyway.',
        poiTypes: ['school', 'chapel', 'library'],
        life: 480,
        hostile: false,
        reward: {
          items: [['aid_ration_tin', 2], ['scrap_cloth', 1]],
          xp: 85
        },
        caseId: 'case_the_replacement',
        clue: 'clue_reve_roll'
      },
      {
        id: 'call_14',
        who: 'ADA',
        text: 'I am at the substation with the governor cabinet open. The drum kept turning when the plant did not, and the seal is dated eleven March. I signed for the bypass kit.',
        poiTypes: ['substation', 'depot', 'reactor_yard'],
        life: 720,
        hostile: false,
        reward: {
          items: [['mat_copper_wire', 2], ['aid_saline_stim', 1]],
          xp: 95,
          rep: { 'ledger': 1 }
        },
        caseId: 'case_torque',
        clue: 'clue_tq_governor_log'
      },
      {
        id: 'call_15',
        who: 'CASS',
        text: 'Cass on three. I am at the theater with a great deal of paper and no way to carry it. Bring a bag and do not bring the Ledger.',
        poiTypes: ['theater', 'library', 'bank'],
        life: 480,
        hostile: false,
        reward: {
          items: [['scrap_cloth', 3], ['scrap_glass', 1]],
          xp: 70,
          rep: { 'free_line': 1 }
        }
      },
      {
        id: 'call_16',
        who: 'JUNIPER',
        text: 'Juniper on three. I am at the well and I have been walking since dawn. Please come. Please come. Please come.',
        poiTypes: ['well', 'camp', 'monument'],
        life: 240,
        hostile: true,
        reward: {
          items: [],
          xp: 0
        }
      },
      {
        id: 'call_17',
        who: 'THE COPPER KID',
        text: 'The Copper Kid on three. I am at the mine and I can see the lights. I can see the lights. I can see the lights.',
        poiTypes: ['mine', 'depot', 'bunker'],
        life: 240,
        hostile: true,
        reward: {
          items: [],
          xp: 0
        }
      },
      {
        id: 'call_18',
        who: 'THE TALLYMAN',
        text: 'The Tallyman. I counted eleven thousand and the board has one more on it. One more. One more on the board.',
        poiTypes: ['school', 'bank', 'library'],
        life: 270,
        hostile: true,
        reward: {
          items: [],
          xp: 0
        }
      }
    ],
    raids: [
      {
        id: 'raid_01',
        name: 'Hollow senders at Vance Pit',
        text: 'Something is working the sluice gates at the pit. It wants the water.',
        poiTypes: ['mine', 'depot', 'bunker'],
        size: 4,
        warn: 55,
        fight: 320,
        rep: { 'ledger': -1 }
      },
      {
        id: 'raid_02',
        name: 'The yard fence comes down',
        text: 'They have picked the fence line on the yard side. Again.',
        poiTypes: ['reactor_yard', 'guardhouse', 'foundry'],
        size: 6,
        warn: 90,
        fight: 420
      },
      {
        id: 'raid_03',
        name: 'Scrap crews on the depot road',
        text: 'Drovers are stripping the freight cars by the depot road.',
        poiTypes: ['depot', 'garage', 'gas'],
        size: 5,
        warn: 70,
        fight: 300,
        rep: { 'free_line': -1 }
      },
      {
        id: 'raid_04',
        name: 'Hollow choir at the chapel',
        text: 'They are standing in the chapel doors and not moving.',
        poiTypes: ['chapel', 'school', 'library'],
        size: 7,
        warn: 110,
        fight: 480,
        rep: { 'choir': -1 }
      },
      {
        id: 'raid_05',
        name: 'Lights in the cannery',
        text: 'Lights in the cannery at night. They were not on before.',
        poiTypes: ['cannery', 'market', 'shop'],
        size: 3,
        warn: 45,
        fight: 240
      },
      {
        id: 'raid_06',
        name: 'Water stop overrun',
        text: 'They have the water stop and they are not drinking. They are waiting.',
        poiTypes: ['watertower', 'well', 'camp'],
        size: 5,
        warn: 60,
        fight: 360
      },
      {
        id: 'raid_07',
        name: 'Something in the mill hoppers',
        text: 'They are in the mill hoppers, working the ore over.',
        poiTypes: ['mill', 'foundry', 'depot'],
        size: 6,
        warn: 80,
        fight: 380
      },
      {
        id: 'raid_08',
        name: 'Bank of the flats road',
        text: 'They are sitting across the flats road, waiting for a truck.',
        poiTypes: ['bank', 'guardhouse', 'hotel'],
        size: 4,
        warn: 100,
        fight: 300,
        rep: { 'ledger': -1 }
      }
    ],
    convoys: [
      {
        id: 'conv_01',
        name: 'Free Line copper run',
        text: 'Two trucks of copper wire, light load. They keep to the ward road.',
        from: 'west',
        to: 'yard',
        duration: 300,
        trucks: 3
      },
      {
        id: 'conv_02',
        name: 'Ledger ration run',
        text: 'Ration tins and sealed drums. They do not stop for anyone.',
        from: 'north',
        to: 'town',
        duration: 360,
        trucks: 4
      },
      {
        id: 'conv_03',
        name: 'Survey Office supply run',
        text: 'Filters and paper, addressed to the field post. Sign for it at the gate.',
        from: 'west',
        to: 'town',
        duration: 240,
        trucks: 2
      },
      {
        id: 'conv_04',
        name: 'Free Line glass run',
        text: 'Glass by the sheet, wrapped in cloth. Heavy for what it is.',
        from: 'north',
        to: 'yard',
        duration: 420,
        trucks: 5
      },
      {
        id: 'conv_05',
        name: 'Water haul',
        text: 'Sealed bladders on a flatbed. The driver does not talk on the radio.',
        from: 'west',
        to: 'mine',
        duration: 330,
        trucks: 3
      }
    ]
  };
})(window.VG);
