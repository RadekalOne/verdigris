/* VERDIGRIS - help and onboarding.
   A new player gets three things: a full controls reference that is always
   one keypress away, a checklist that ticks off as the mechanics are learned,
   and a single line at the bottom of the screen that says what to do next.  */
window.VG = window.VG || {};
(function (VG) {
  'use strict';

  const KEY = 'verdigris.tips.v1';

  const flags = {
    moved: false,
    searched: false,
    fired: false,
    entered: false,
    equipped: false,
    ate: false,
    helped: false,
    read: false,
    deduced: false,
    concluded: false,
    dismissed: false
  };

  const CONTROLS = [
    {
      group: 'Moving and looking',
      rows: [
        ['mouse', 'Aim. Your figure always faces the pointer'],
        ['W  /  Up', 'Walk toward the pointer'],
        ['S  /  Down', 'Walk back, away from the pointer'],
        ['A D  /  Left Right', 'Sidestep across the way you are facing'],
        ['SHIFT', 'Sprint. Costs stamina; walking is free'],
        ['left click', 'Fire the weapon in your hand, or swing it'],
        ['wheel  /  Z X', 'Step along the hotbar. A weapon you land on is in your hand'],
        ['1 - 5', 'Jump straight to a hotbar slot'],
        ['SPACE  /  right click', 'Use the selected item: eat, drink, dress a wound'],
        ['Q', 'Patch up with the best dressing you carry, whatever is selected'],
        ['M', 'Map. It fills in as you walk']
      ]
    },
    {
      group: 'Surveying',
      rows: [
        ['E', 'Search a container, survey a location, or go through a door'],
        ['R', 'Draw water at a well or a water tower'],
        ['J', 'Survey Journal: cases, evidence, deductions, reading'],
        ['TAB', 'Field Kit: gear, materials, aids, intel'],
        ['C', 'Field Codex: factions and contracts'],
        ['B', 'Contracts'],
        ['K', 'Make things: rounds and dressings by hand, guns at a bench'],
        ['F', 'Save'],
        ['H', 'This help'],
        ['O', 'Options: mixer, sound layers, and how alive the flats are'],
        ['N', 'Mute or unmute sound'],
        ['ESC', 'Close a panel, or step back outside if you are inside a building']
      ]
    }
  ];

  /* what each need costs you and how to put it back — the table below is the
     whole survival system in one screen */
  const SURVIVAL = [
    ['Stamina', 'Sprinting costs 15 a second. Walking costs nothing.',
      'Recover on foot at 5.5 a second, standing still at 12. Never drains while walking slowly.'],
    ['Food', 'Time, and faster while you move.',
      'Ration Tin (+20) or Survey Office Pack (+35). Craft a Ration Tin from cloth and ceramic at the workbench (K). The panel on the right points at the nearest building that kept provisions - the diner, the market hall, the bunker, the depot.'],
    ['Water', 'Time, and faster while you move. The fastest drain of all.',
      'Canteen (+25) or Survey Office Pack (+20). Craft a Canteen from ceramic and plastic. Press R at any well or water tower to drink (+35).'],
    ['Health', 'Starvation, dehydration, dose, and the Drovers.',
      'Press Q. It uses the dressing that fits the wound - Field Dressing (+18), Splint Kit (+30), Saline Stim (+45), Surgical Tray (+70). You start with three Field Dressings and K makes two more from two cloth, anywhere. You also heal on your own, about one point a second, as long as food and water are above a quarter and dose is under 40 - so eating and drinking is healing too.'],
    ['Dose', 'The refinery, the reactor yard, ash haze, and rusty well water.',
      'Chalk Draught (-20), Saline Stim (-6), Surgical Tray (-12). Carry a Survey Dust Filter and it builds a third as fast.']
  ];

  /* What the flats do back. These are the rules a player would otherwise
     have to learn by being hit by them: the tell, the drop, the pack, and
     the bench. */
  const FLATS = [
    ['They look before they come',
      'When something first notices you it stops, and a ! goes up over it. That beat is yours - it is when the gun comes up. Then it walks at you. On Fair a rusted walks at 108 and a warden at 118, both slower than your 132, so backing away while you shoot works; a drover does 140 and has to be shot or sprinted from. Options (O) has Gentle and Harsh if that is too much or too little.'],
    ['A hit stops it',
      'Something you hit stops for a moment and is shoved back, and a hit while it is winding up breaks the lunge. Shooting the thing that is about to jump you is the right answer. A warden is heavier: it barely slows and its lunge cannot be broken.'],
    ['The lunge',
      'When one gets close it stops, and the lane it will travel down is drawn on the ground along the direction it was facing when it stopped. Step out of the lane and it misses. The lane is exactly where it will go - it is not a decoration and it does not lie. It cannot lunge again for a few seconds, so a missed lunge is a free window to shoot.'],
    ['They leave what they were made of',
      'A rusted that goes down leaves two to eight units of scrap - copper, cloth, ceramic or gear - and about four on average. A drover leaves about the same, with glass in the pile. A warden leaves about seven, and a few rounds. The contracts ask for exactly this scrap, and the crates used to be the only place any of it came from. The flats are made of the same stuff the crates are made of.'],
    ['Your pack has a limit',
      '140 weight. A crate you cannot empty is not a limit, it is a wall - so when a crate does not fit, what does not fit stays in the crate and you come back for it. Put something down from the Field Kit to make room. The load is printed in the corner when you are carrying too much.'],
    ['Making things (K)',
      'K opens the sheet anywhere. The top half is made by hand where you stand: dressings from cloth, a canteen, and six revolver rounds from two copper. The bottom half needs a workbench, which is inside a building - the depot press, the market stall, the substation bench, the fuel stop bench - and the sheet names the nearest one and the way to it. A bench makes fourteen rounds from the same copper, rifle rounds, shells, and three plain guns.'],
    ['The buildings that hold the evidence are watched',
      'The buildings a file points you at are not empty. Something is standing in front of them, and it holds its ground: it will not wander off across the flats and leave the door open behind it. Go in prepared.']
  ];

  /* The posts. A contract handed in from anywhere is a checklist, and a
     checklist does not make you walk anywhere. */
  const POSTS = [
    ['Each faction keeps a post',
      'The Ledger works out of the bank, The Choir out of the chapel, Free Line out of the substation. A post is marked on the map in the colour of the faction, and the contract sheet (press B) says which post a contract has to go to and how far away it is.'],
    ['A contract is handed in at the post',
      'You have to be standing at the building. Turn one in anywhere else and they tell you where their post is and how far it is - nothing is taken and nothing is paid, so trying from the wrong side of the flats costs you nothing but the walk.'],
    ['Standing is the cost',
      'A theory the Office refuses costs a point of standing with the Ledger. Reopening a file costs two. Standing decides which contracts a faction will discuss with you at all, so a point of standing is a door rather than a number - and the post is where you spend it.']
  ];

  /* warnings that outrank the tutorial whenever they apply */
  const ALERTS = [
    { text: 'Your water is low. The panel on the right points at the nearest well — press R there to drink, or use a canteen from the Field Kit.', when: (p) => p.water <= 40 },
    { text: 'You are hungry. The panel on the right points at the nearest building that kept provisions — or craft a Ration Tin at the workbench from cloth and ceramic.', when: (p) => p.food <= 30 },
    { text: 'Your dose is climbing. Carry a dust filter, or take a chalk draught to cut it.', when: (p) => p.dose >= 60 },
    { text: 'You are exhausted. Stand still and let your stamina come back.', when: (p) => p.stam <= 12 }
  ];

  /* How shooting works. This is the one system in the game with rules the
     player cannot work out by looking at it: where the round goes, how far
     it reaches, and what a swing is. */
  const SHOOTING = [
    ['Aiming', 'The mouse is your aim and there is no spread. Put the reticle on or near something and the round is sent to where that thing will be when it arrives - you choose the target, the lead is done for you. Aim help can be switched off in Options (O), and then the round goes exactly at the reticle. Your figure turns to face where you are pointing.'],
    ['Firing', 'Left click fires. Hold the mouse down to keep firing at the weapon\'s rate of fire. The number on the weapon in the hotbar is the rounds it has left.'],
    ['Reach', 'A round lives exactly as long as the weapon\'s reach, so the revolver you start with covers 280 metres of flats and a marksman covers 400. Point at something beyond that and the round dies in the air. The hotbar and the Field Kit both print the reach, so you can read it before you shoot rather than after.'],
    ['The notice radius', 'The Rusted see you at 240 metres by day and 300 after dark. Every gun reaches at least as far as the daytime look, so a gun is never a thing you can only use at arm\'s length — but a longer gun lets you open a fight from further out than they can see you. After dark most guns no longer do: the dark is for working, not for standing still. A silenced weapon carries to 120, or 150 after dark.'],
    ['Swinging', 'The torch and the pick mace are swung, not fired. A swing is a short arc in front of you, drawn where it lands. They need no ammunition. The torch burns in the pack as well as in your hand, so you are never without light because you picked up a gun.'],
    ['Ammunition', 'You start with eighteen rounds. Rounds are pooled by type and shared between the guns that take them. Press K to hand-load six more from two copper anywhere, or fourteen at a bench; the things you put down sometimes carry a few. The number on the weapon in the bar is what is left, and the name plate warns you at four. An empty gun is swung like a club - it is a poor one, so switch to the torch with the wheel.'],
    ['Noise', 'A shot carries as far as the round flies, so firing is how a fight starts and not only how it ends. Silenced weapons do not bring the Rusted the way the others do.']
  ];

  /* the ordered first-run checklist; the coach points at the first undone one.
     A step may carry a `when` predicate so it only shows up when it applies —
     the radio step is pointless in a quiet world, and a coach that nags about
     a mechanic the player will never meet is worse than no coach. */
  const STEPS = [
    { id: 'moved', keys: ['W', 'S', 'A', 'D'], text: 'The pointer shows where you go: W walks toward it, S walks back, A and D sidestep. Hold SHIFT to sprint. (Prefer W = up? Press O.)' },
    {
      id: 'equipped', keys: ['1-5', 'SPACE', 'TAB'],
      text: 'Turn the mouse wheel (or press Z / X, or 1-5) to step along the hotbar. A weapon you land on is in your hand at once; a tin or a canteen waits for SPACE or the right mouse button. Anything else you find lands in your Field Kit (TAB) - click a weapon there to put it in your hand.',
      when: () => {
        const p = VG.Player;
        if (!p || !p.inv) return false;
        for (const id in p.inv) {
          const it = VG.item(id);
          if (!it) continue;
          if (it.cat === 'weapon' && p.weapon !== id) return true;
          if (it.cat === 'armor' && p.armor !== id) return true;
        }
        return false;
      }
    },
    { id: 'searched', keys: ['E'], text: 'Find something to search. Press E when the prompt appears.' },
    {
      id: 'fired', keys: ['mouse', 'left click'],
      text: 'The mouse aims and the left button fires - hold it to keep firing. Point at or near something and the shot is led for you. The round dies at the end of your weapon\'s reach, which the hotbar prints. When something sees you a ! goes up over it: that is your moment to shoot. Hurt? Press Q.'
    },
    {
      id: 'entered', keys: ['E'],
      text: 'Buildings have doors. Walk up to a marked threshold and press E to go inside. What you are looking for may be in the room.'
    },
    {
      id: 'ate', keys: ['SPACE', '1-5'],
      text: 'SPACE uses what is in the selected hotbar slot - a canteen to drink, a dressing to heal, a ration tin to eat. The wheel changes slot. Q heals without changing slot at all.',
      when: () => {
        const p = VG.Player;
        if (!p || !p.hotbar) return false;
        for (let i = 0; i < p.hotbar.length; i++) {
          const id = p.hotbar[i];
          if (!id) continue;
          const it = VG.item(id);
          if (it && it.cat === 'aid' && !it.passive) return true;
        }
        return false;
      }
    },
    {
      id: 'helped', keys: ['E'],
      text: 'Channel three is open. When somebody calls for help the band says where — follow the marker and press E.',
      when: () => !!(VG.DYN && VG.DYN.profile && VG.DYN.profile().call[0] > 0)
    },
    { id: 'read', keys: ['J'], text: 'Open the Survey Journal and read the evidence you found.' },
    { id: 'deduced', keys: ['J'], text: 'In QUESTIONS, answer the Office. Say what you believe and cite the evidence for it.' },
    { id: 'concluded', keys: ['J'], text: 'Open CASES, pick the file, and file the conclusion the evidence supports.' }
  ];

  /* a step is only in play when its predicate passes */
  function stepApplies(s) {
    if (!s.when) return true;
    try { return !!s.when(); } catch (e) { return false; }
  }
  function liveSteps() { return STEPS.filter(stepApplies); }

  const HOW = 'Reading a clue establishes a fact. The Office asks you questions about the file — answer one with the claim you believe and the evidence you are citing, and it may establish another fact. Hold the facts a file needs and you can put a conclusion on it. Some files carry two readings; you choose which one goes on the file, and you can reopen a file later if you change your mind.';

  /* the checklist signature, so the panel only rebuilds when it actually changed */
  let lastSig = '';

  function readStore() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }
  function writeStore() {
    try { localStorage.setItem(KEY, JSON.stringify(flags)); } catch (e) { /* private mode */ }
  }

  function load() {
    const s = readStore();
    for (const k in flags) if (s[k] !== undefined) flags[k] = !!s[k];
  }

  load();

  VG.Help = {
    flags: flags,
    steps: STEPS,

    /* mark a mechanic as learned; the checklist and coach update immediately */
    mark: function (id) {
      if (!flags[id] || flags[id] === true) {
        if (id in flags && flags[id] === true) { VG.Help.refresh(); return; }
      }
      if (id in flags) {
        flags[id] = true;
        writeStore();
      }
      VG.Help.refresh();
    },

    /* the next thing the player should try, or null when they have it all */
    next: function () {
      const live = liveSteps();
      for (const s of live) if (!flags[s.id]) return s;
      return null;
    },

    /* dismiss the coach for good, until the tutorial is reset */
    dismiss: function () {
      flags.dismissed = true;
      writeStore();
      VG.Help.refresh();
    },

    reset: function () {
      for (const k in flags) flags[k] = false;
      writeStore();
      VG.Help.refresh();
    },

    /* wire the coach dismiss button once the DOM exists */
    bind: function () {
      const x = document.querySelector('#coach .x');
      if (x) x.onclick = function () { VG.Help.dismiss(); };
    },

    /* ---- rendering ---- */

    coachText: function () {
      const p = VG.Player;
      /* Inside a building the only question that matters is how to get out.
         This outranks the survival nudges: there is no water within reach of
         a room, so a thirst warning indoors is noise. */
      if (VG.INT && VG.INT.active) {
        return 'You are inside. The way out is the lit gap in the far wall — walk into it, or press ESC.';
      }
      /* a survival warning always outranks the tutorial nudge, and it
         outranks a dismissed coach as well: a player who closed the coach
         still has to be told when they are about to die of thirst. */
      if (p) {
        for (const a of ALERTS) if (a.when(p)) return a.text;
      }
      if (flags.dismissed) return null;
      const s = VG.Help.next();
      if (!s) return null;
      return s.text;
    },

    refresh: function () {
      /* the coach strip */
      const el = document.getElementById('coach');
      if (el) {
        const txt = (VG.paused) ? null : VG.Help.coachText();
        const show = !!txt;
        if (el.getAttribute('data-shown') !== (show ? '1' : '0')) {
          el.style.display = show ? 'block' : 'none';
          el.setAttribute('data-shown', show ? '1' : '0');
        }
        if (show) {
          const t = el.querySelector('.t');
          if (t && t.textContent !== txt) t.textContent = txt;
        }
      }
      /* the checklist inside the help panel — only rebuild when it changed */
      const body = document.getElementById('help-body');
      if (body && body.getAttribute('data-filled') === '1') {
        const sig = liveSteps().map((s) => (flags[s.id] ? '1' : '0')).join('') + (flags.dismissed ? 'd' : '');
        if (sig !== lastSig) { lastSig = sig; VG.Help.render(); }
      }
    },

    render: function () {
      const body = document.getElementById('help-body');
      if (!body) return;
      let h = '';

      /* controls */
      for (const c of CONTROLS) {
        h += '<h3 style="color:var(--amber);font-size:12px;letter-spacing:.08em;margin:14px 0 6px">' + c.group + '</h3>';
        h += '<table class="kvtable">';
        for (const r of c.rows) {
          h += '<tr><td class="k">' + VG.htmlEscape(r[0]) + '</td><td>' + VG.htmlEscape(r[1]) + '</td></tr>';
        }
        h += '</table>';
      }

      /* the walking, in words. It is the one system that changed shape, and
         a player who has not seen it before needs it spelled out rather than
         inferred from a key list. */
      h += '<h3 style="color:var(--amber);font-size:12px;letter-spacing:.08em;margin:14px 0 6px">Walking</h3>';
      h += '<p class="muted" style="font-size:11px;line-height:1.6;margin:0 0 8px">' +
        'The mouse is your heading. Your figure always faces the pointer, and W walks you toward it, so ' +
        'where you are going is the place you are looking. S walks you backward, away from the pointer, and ' +
        'A and D step you sideways across the way you are facing - that is how you circle something without ' +
        'turning away from it. The same is true inside a building: the cursor over the room is where you are ' +
        'headed. The keys are measured against your facing and not against the screen, so there is only ever ' +
        'one direction to learn.</p>';

      /* the survey loop, in words. This is the game: one file at a time, and
         the evidence is somewhere rather than marked. */
      h += '<h3 style="color:var(--amber);font-size:12px;letter-spacing:.08em;margin:14px 0 6px">The files</h3>';
      h += '<p class="muted" style="font-size:11px;line-height:1.6;margin:0 0 8px">' +
        'The Survey Office works one file at a time. The journal (J) names the kind of building the open file ' +
        'needs - a Sheriff Post, a Diner, a Freight Depot - and it does not mark where that building is, because ' +
        'nobody has charted it yet. The panel on the right tells you which kinds to look for and gives you a ' +
        'bearing to the nearest one you have already charted; the map (M) rings and names the ones you have. ' +
        'Go in, press E on the crates, and read what is there. Then answer the questions the Office asks: say ' +
        'what you believe and cite the evidence for it. When the file has what it needs, put a conclusion on it - ' +
        'and closing it opens the next one, which is somewhere new.</p>';

      /* the checklist */
      h += '<h3 style="color:var(--amber);font-size:12px;letter-spacing:.08em;margin:16px 0 6px">Getting started</h3>';
      h += '<p class="muted" style="font-size:11px;line-height:1.6;margin:0 0 8px">' + VG.htmlEscape(HOW) + '</p>';
      h += '<div id="tip-list">';
      for (const s of liveSteps()) {
        const on = flags[s.id];
        h += '<div class="listitem' + (on ? ' sel' : '') + '"><div class="n">' +
          (on ? '✓ ' : '') + VG.htmlEscape(s.text) + '</div>' +
          '<div class="d">' + (on ? 'learned' : 'keys: ' + s.keys.join(', ')) + '</div></div>';
      }
      h += '</div>';

      /* the flats */
      h += '<h3 style="color:var(--amber);font-size:12px;letter-spacing:.08em;margin:16px 0 6px">The flats</h3>';
      h += '<p class="muted" style="font-size:11px;line-height:1.6;margin:0 0 8px">' +
        'Channel three carries traffic from anyone still out there. A distress call puts a marker on your map — ' +
        'walk to it and press E to answer. Some calls are honest and some are a lure, and you cannot tell which from the voice. ' +
        'At night the Rusted hit places that hold something worth taking, and convoys run the road whether or not you are watching. ' +
        'Everything you take raises your standing with whoever is keeping the ledger, and pressure brings people looking for you. ' +
        'Press O to change how alive the flats are — the story is the same either way.</p>';

      /* survival */
      h += '<h3 style="color:var(--amber);font-size:12px;letter-spacing:.08em;margin:16px 0 6px">Survival</h3>';
      h += '<p class="muted" style="font-size:11px;line-height:1.6;margin:0 0 8px">' +
        'Five needs, and every one of them is a clock. The HUD warns you before a need runs out — and the strip at the bottom of the screen will tell you what to do about it.</p>';
      h += '<table class="kvtable">';
      h += '<tr><td class="k">Need</td><td>What drains it</td></tr>';
      for (const s of SURVIVAL) {
        h += '<tr><td class="k">' + VG.htmlEscape(s[0]) + '</td><td>' + VG.htmlEscape(s[1]) +
          '<br><span style="color:#93b45a">Put it back:</span> ' + VG.htmlEscape(s[2]) + '</td></tr>';
      }
      h += '</table>';

      /* the flats push back */
      h += '<h3 style="color:var(--amber);font-size:12px;letter-spacing:.08em;margin:16px 0 6px">The flats push back</h3>';
      h += '<p class="muted" style="font-size:11px;line-height:1.6;margin:0 0 8px">' +
        'The flats are not a place you walk through. These are the rules you would otherwise have to learn by being hit by them.</p>';
      h += '<table class="kvtable">';
      h += '<tr><td class="k">Rule</td><td>What it means</td></tr>';
      for (const s of FLATS) {
        h += '<tr><td class="k">' + VG.htmlEscape(s[0]) + '</td><td>' + VG.htmlEscape(s[1]) + '</td></tr>';
      }
      h += '</table>';

      /* the posts */
      h += '<h3 style="color:var(--amber);font-size:12px;letter-spacing:.08em;margin:16px 0 6px">The posts</h3>';
      h += '<p class="muted" style="font-size:11px;line-height:1.6;margin:0 0 8px">' +
        'The factions are not menus. They are places, and a contract is handed in where the faction keeps its post.</p>';
      h += '<table class="kvtable">';
      h += '<tr><td class="k">Rule</td><td>What it means</td></tr>';
      for (const s of POSTS) {
        h += '<tr><td class="k">' + VG.htmlEscape(s[0]) + '</td><td>' + VG.htmlEscape(s[1]) + '</td></tr>';
      }
      h += '</table>';

      /* shooting */
      h += '<h3 style="color:var(--amber);font-size:12px;letter-spacing:.08em;margin:16px 0 6px">Shooting</h3>';
      h += '<p class="muted" style="font-size:11px;line-height:1.6;margin:0 0 8px">' +
        'The rules below are the whole system. Nothing about shooting is guesswork once you know them.</p>';
      h += '<table class="kvtable">';
      h += '<tr><td class="k">Rule</td><td>What it means</td></tr>';
      for (const s of SHOOTING) {
        h += '<tr><td class="k">' + VG.htmlEscape(s[0]) + '</td><td>' + VG.htmlEscape(s[1]) + '</td></tr>';
      }
      h += '</table>';

      /* audio + misc */
      h += '<h3 style="color:var(--amber);font-size:12px;letter-spacing:.08em;margin:16px 0 6px">Sound</h3>';
      h += '<p class="muted" style="font-size:11px;line-height:1.6;margin:0 0 8px">' +
        'Music and effects are generated live in the browser, so there is nothing to download and nothing to install. Press N to mute, or O for the mixer, where the music, the wind and the effects are set separately — the wind is its own layer, so you can keep the music and drop the moving air. The mix follows the hour and the weather, and the reactor hum fades in as you approach Copper Mesa Station.</p>';

      h += '<div style="height:12px"></div>';
      h += '<div class="btn" id="help-reset">RESET TUTORIAL</div>';

      body.innerHTML = h;
      body.setAttribute('data-filled', '1');
      lastSig = liveSteps().map((s) => (flags[s.id] ? '1' : '0')).join('') + (flags.dismissed ? 'd' : '');
      const rb = document.getElementById('help-reset');
      if (rb) rb.onclick = function () {
        VG.Help.reset();
        VG.Help.render();
      };
    }
  };
})(window.VG);
