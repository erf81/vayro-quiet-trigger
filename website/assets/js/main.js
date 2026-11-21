// Quiet Trigger by VAYRO — Progressive-Enhancement Website Script
// Zero analytics, zero cookies, zero external network requests.
(function () {
  'use strict';

  // Mobile navigation toggle
  var toggle = document.querySelector('[data-nav-toggle]');
  var nav = document.querySelector('[data-nav-menu]');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('open', !expanded);
    });
  }

  // Interactive VAYRO Theme Studio Preset Previewer (exact hex values from themeSystem.js)
  var PRESETS = {
    aurora: {
      name: 'Aurora',
      subtitle: 'Blue · Violet · Pink',
      primary: '#4EA5FF',
      secondary: '#8B5CF6',
      tertiary: '#EC69B9',
      bg: '#111522',
      surface: '#191E2D',
      selected: '#242C43',
      border: '#2B3552'
    },
    ember: {
      name: 'Ember',
      subtitle: 'Crimson · Orange · Amber',
      primary: '#FF454F',
      secondary: '#FF813D',
      tertiary: '#FFC05A',
      bg: '#1D1417',
      surface: '#271A1D',
      selected: '#382127',
      border: '#4E2E35'
    },
    crimson: {
      name: 'Crimson',
      subtitle: 'Deep Red · Rose · Coral',
      primary: '#E83E5B',
      secondary: '#FF5E7A',
      tertiary: '#FF9B8A',
      bg: '#191318',
      surface: '#251A22',
      selected: '#38212E',
      border: '#4E2C40'
    },
    arctic: {
      name: 'Arctic',
      subtitle: 'Cyan · Blue · Indigo',
      primary: '#18D4E8',
      secondary: '#369EFF',
      tertiary: '#7878FF',
      bg: '#101921',
      surface: '#17232D',
      selected: '#203443',
      border: '#2A465C'
    },
    emerald: {
      name: 'Emerald',
      subtitle: 'Emerald · Mint · Teal',
      primary: '#00B88A',
      secondary: '#2BD4AA',
      tertiary: '#86D9A7',
      bg: '#111B19',
      surface: '#182521',
      selected: '#203A31',
      border: '#2B4E42'
    },
    monochrome: {
      name: 'Monochrome',
      subtitle: 'White · Silver · Graphite',
      primary: '#E8EAF0',
      secondary: '#AEB4C0',
      tertiary: '#747C8B',
      bg: '#141519',
      surface: '#202126',
      selected: '#30323A',
      border: '#40434E'
    }
  };

  var presetButtons = document.querySelectorAll('[data-preset]');
  var miniPalette = document.querySelector('[data-mini-palette]');
  if (presetButtons.length && miniPalette) {
    var inner = miniPalette.querySelector('[data-mini-inner]');
    var search = miniPalette.querySelector('[data-mini-search]');
    var selectedRow = miniPalette.querySelector('[data-mini-selected]');
    var rows = miniPalette.querySelectorAll('[data-mini-row]');
    var tokensEl = document.querySelector('[data-mini-tokens]');

    function applyPreset(key) {
      var p = PRESETS[key];
      if (!p) return;
      miniPalette.style.background = 'linear-gradient(135deg, ' + p.primary + ', ' + p.secondary + ', ' + p.tertiary + ')';
      if (inner) inner.style.backgroundColor = p.bg;
      if (search) {
        search.style.backgroundColor = p.surface;
        search.style.borderColor = p.border;
      }
      rows.forEach(function (r) {
        r.style.backgroundColor = p.surface;
        r.style.borderColor = 'transparent';
      });
      if (selectedRow) {
        selectedRow.style.backgroundColor = p.selected;
        selectedRow.style.borderColor = p.primary;
      }
      if (tokensEl) {
        tokensEl.textContent = p.name + ' (' + p.subtitle + ') · Primary ' + p.primary + ' · Secondary ' + p.secondary + ' · Tertiary ' + p.tertiary + ' · BG ' + p.bg;
      }
      presetButtons.forEach(function (btn) {
        var active = btn.getAttribute('data-preset') === key;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    }

    presetButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyPreset(btn.getAttribute('data-preset'));
      });
    });
  }

  // Copy-to-clipboard buttons (SHA-256 & UPIA CLI)
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy') || '';
      if (!text || !navigator.clipboard) return;
      navigator.clipboard.writeText(text).then(function () {
        var orig = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = orig; }, 1600);
      }).catch(function () {});
    });
  });

  // Command Category Filter on Documentation page
  var filterPills = document.querySelectorAll('[data-cat-filter]');
  var catSections = document.querySelectorAll('[data-cat-group]');
  if (filterPills.length && catSections.length) {
    filterPills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        var target = pill.getAttribute('data-cat-filter');
        filterPills.forEach(function (p) { p.classList.toggle('active', p === pill); });
        catSections.forEach(function (sec) {
          var show = target === 'all' || sec.getAttribute('data-cat-group') === target;
          sec.style.display = show ? '' : 'none';
        });
      });
    });
  }
})();
