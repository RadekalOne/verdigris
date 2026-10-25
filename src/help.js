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
        ['W A S D  /  arrows', 'Move'],
        ['SHIFT', 'Sprint. Costs stamina; walking is free'],
        ['mouse', 'Aim'],
        ['left click', 'Fire the selected weapon'],
        ['1 - 5', 'Choose a hotbar slot'],
        ['SPACE', 'Equip or use the selected item'],
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
        ['K', 'Workbench and crafting'],
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
      'Field Dressing (+18), Saline Stim (+45), Splint Kit (+30), Surgical Tray (+70). Also heals slowly on its own while you are fed, watered and under 40 dose.'],
    ['Dose', 'The refinery, the reactor yard, ash haze, and rusty well water.',
      'Chalk Draught (-20), Saline Stim (-6), Surgical Tray (-12). Carry a Survey Dust Filter and it builds a third as fast.']
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
    ['Aiming', 'The mouse is your aim. The reticle sits under the cursor and the round goes exactly there — there is no spread, so if the reticle is on something, you hit it. Your figure turns to face where you are pointing.'],
    ['Firing', 'Left click fires. Hold the mouse down to keep firing at the weapon\'s rate of fire. The number on the weapon in the hotbar is the rounds it has left.'],
    ['Reach', 'A round lives exactly as long as the weapon\'s reach, so a revolver covers 150 metres of flats and a marksman covers 340. Point at something beyond that and the round dies in the air.'],
    ['Swinging', 'The torch and the pick mace are swung, not fired. A swing is a short arc in front of you, drawn where it lands. They need no ammunition.'],
    ['Ammunition', 'Rounds are pooled by type and shared between the guns that take them. Craft them at the workbench, or find them. Out of ammunition and the weapon says so.'],
    ['Noise', 'A shot carries. Silenced weapons do not bring the Rusted the way the others do.']
  ];

  /* the ordered first-run checklist; the coach points at the first undone one.
     A step may carry a `when` predicate so it only shows up when it applies —
     the radio step is pointless in a quiet world, and a coach that nags about
     a mechanic the player will never meet is worse than no coach. */
  const STEPS = [
    { id: 'moved', keys: ['W', 'A', 'S', 'D'], text: 'Walk around the flats. Hold SHIFT to sprint.' },
    { id: 'searched', keys: ['E'], text: 'Find something to search. Press E when the prompt appears.' },
    {
      id: 'fired', keys: ['mouse', 'left click'],
      text: 'The mouse aims and the left button fires. The round goes exactly where the reticle is - no spread - and your figure turns to face it.'
    },
    {
      id: 'entered', keys: ['E'],
      text: 'Buildings have doors. Walk up to a marked threshold and press E to go inside. What you are looking for may be in the room.'
    },
    {
      id: 'helped', keys: ['E'],
      text: 'Channel three is open. When somebody calls for help the band says where — follow the marker and press E.',
      when: () => !!(VG.DYN && VG.DYN.profile && VG.DYN.profile().call[0] > 0)
    },
    { id: 'read', keys: ['J'], text: 'Open the Survey Journal and read the evidence you found.' },
    { id: 'deduced', keys: ['J'], text: 'In EVIDENCE, click two facts, then press ASSEMBLE DEDUCTION.' },
    { id: 'concluded', keys: ['J'], text: 'Open CASES, pick the file, and press FILE CONCLUSION.' }
  ];

  /* a step is only in play when its predicate passes */
  function stepApplies(s) {
    if (!s.when) return true;
    try { return !!s.when(); } catch (e) { return false; }
  }
  function liveSteps() { return STEPS.filter(stepApplies); }

  const HOW = 'Reading a clue establishes a fact. Selecting two facts and assembling them yields a deduction, and a deduction can establish another fact. Hold the facts a case needs and you can close the file.';

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
      if (flags.dismissed) return null;
      const p = VG.Player;
      /* Inside a building the only question that matters is how to get out.
         This outranks the survival nudges: there is no water within reach of
         a room, so a thirst warning indoors is noise. */
      if (VG.INT && VG.INT.active) {
        return 'You are inside. The way out is the lit gap in the far wall — walk into it, or press ESC.';
      }
      /* a survival warning always outranks the tutorial nudge */
      if (p) {
        for (const a of ALERTS) if (a.when(p)) return a.text;
      }
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
