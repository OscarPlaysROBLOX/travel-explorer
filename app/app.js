(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var state = { tab: 'countries', q: '', region: '', sel: null, items: [], favs: [] };
  var DATA = null, byId = {}, byCca3 = {};
  var VERSION = '1.0.0';
  var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fold(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function num(n) { return n == null ? '—' : Number(n).toLocaleString('en-US'); }
  function area(km2, mi2) {
    if (km2 == null && mi2 == null) return '—';
    if (mi2 == null) mi2 = km2 * 0.386102; if (km2 == null) km2 = mi2 * 2.589988;
    var d = km2 < 10 ? 2 : 0;
    return num(Number(km2.toFixed(d))) + ' km²&nbsp; (' + num(Number(mi2.toFixed(mi2 < 10 ? 2 : 0))) + ' mi²)';
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'; }
  function list(a) { return a && a.length ? a.map(esc).join(', ') : '—'; }

  $('aboutBtn').addEventListener('click', function () { $('about').showModal(); });

  // ---- favorites (stored on this device) ----
  function loadFavs() {
    try { var f = JSON.parse(localStorage.getItem('te.favs') || '[]'); return Array.isArray(f) ? f : []; } catch (e) { return []; }
  }
  function saveFavs() {
    try { localStorage.setItem('te.favs', JSON.stringify(state.favs)); } catch (e) {}
  }
  function isFav(id) { return state.favs.indexOf(id) >= 0; }
  function toggleFav(id) {
    var i = state.favs.indexOf(id);
    if (i >= 0) state.favs.splice(i, 1); else state.favs.push(id);
    saveFavs(); renderList(); show(id, true);
  }

  // ---- list ----
  function matches(it, q) {
    if (!q) return true;
    return it._s.indexOf(q) >= 0;
  }
  function currentItems() {
    var src;
    if (state.tab === 'countries') src = DATA.countries;
    else if (state.tab === 'states') src = DATA.states;
    else src = state.favs.map(function (id) { return byId[id]; }).filter(Boolean).sort(function (a, b) { return a._name.localeCompare(b._name); });
    var q = fold(state.q.trim());
    return src.filter(function (it) {
      return matches(it, q) && (!state.region || state.tab !== 'countries' || it.region === state.region);
    });
  }
  function renderList() {
    var items = state.items = currentItems();
    var ul = $('list'), html = [];
    items.forEach(function (it) {
      html.push('<li role="option" data-id="' + it._id + '"' + (it._id === state.sel ? ' class="sel" aria-selected="true"' : '') + '>' +
        '<img loading="lazy" src="' + esc(it.flag) + '" alt="">' +
        '<span class="nm">' + esc(it._name) + (it._kind === 's' && state.tab === 'favs' ? ' <span class="muted">(US)</span>' : '') + '</span>' +
        (isFav(it._id) ? '<span class="st" title="Favorite">★</span>' : '') + '</li>');
    });
    if (!items.length) {
      html.push('<li class="empty">' + (state.tab === 'favs' && !state.favs.length
        ? 'No favorites yet. Open a country or state and click “☆ Add to favorites”.'
        : 'Nothing matches “' + esc(state.q) + '”.') + '</li>');
    }
    ul.innerHTML = html.join('');
    var total = state.tab === 'countries' ? DATA.countries.length : state.tab === 'states' ? DATA.states.length : state.favs.length;
    $('count').textContent = items.length === total ? (state.tab === 'states' ? '50 states + DC' : state.tab === 'favs' ? total + ' favorites' : total + ' countries and territories')
      : items.length + ' of ' + total;
    var s = ul.querySelector('.sel'); if (s) s.scrollIntoView({ block: 'nearest' });
  }
  $('list').addEventListener('click', function (e) {
    var li = e.target.closest('li[data-id]'); if (li) show(li.getAttribute('data-id'), false, true);
  });
  function move(delta) {
    var items = state.items; if (!items.length) return;
    var i = -1;
    for (var k = 0; k < items.length; k++) if (items[k]._id === state.sel) { i = k; break; }
    i = Math.max(0, Math.min(items.length - 1, i + delta));
    show(items[i]._id);
  }
  function keynav(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'PageDown') { e.preventDefault(); move(15); }
    else if (e.key === 'PageUp') { e.preventDefault(); move(-15); }
    else if (e.key === 'Enter' && state.items.length && e.target === $('search')) { e.preventDefault(); if (!state.items.some(function (x) { return x._id === state.sel; })) show(state.items[0]._id); }
  }
  $('list').addEventListener('keydown', keynav);
  $('search').addEventListener('keydown', keynav);
  $('search').addEventListener('input', function () {
    state.q = this.value; renderList();
    if (state.items.length && !state.items.some(function (x) { return x._id === state.sel; })) show(state.items[0]._id, true);
  });
  $('region').addEventListener('change', function () { state.region = this.value; renderList(); });

  function setTab(tab) {
    state.tab = tab;
    [['countries', 'tabCountries'], ['states', 'tabStates'], ['favs', 'tabFavs']].forEach(function (p) {
      var on = p[0] === tab; $(p[1]).classList.toggle('active', on); $(p[1]).setAttribute('aria-selected', on);
    });
    $('region').style.display = tab === 'countries' ? '' : 'none';
    renderList();
    var items = state.items;
    if (items.length && !items.some(function (x) { return x._id === state.sel; })) show(items[0]._id, true);
    if (!touch) $('search').focus();
  }
  $('tabCountries').addEventListener('click', function () { setTab('countries'); });
  $('tabStates').addEventListener('click', function () { setTab('states'); });
  $('tabFavs').addEventListener('click', function () { setTab('favs'); });

  // ---- detail ----
  function row(label, value) { return '<dt>' + esc(label) + '</dt><dd>' + value + '</dd>'; }
  function mapUrl(it) {
    var q = it._kind === 'c' ? it.name : (it.abbr === 'DC' ? 'Washington, District of Columbia, United States' : it.name + ', United States');
    return 'https://www.openstreetmap.org/search?query=' + encodeURIComponent(q);
  }
  function countryFacts(c) {
    var cur = c.currencies.length ? c.currencies.map(function (x) {
      return esc(x.name) + (x.symbol ? ' (' + esc(x.symbol) + ')' : '') + ' <span class="muted">' + esc(x.code) + '</span>';
    }).join('<br>') : '—';
    var borders = c.borders.length ? c.borders.map(function (b) {
      var n = byCca3[b]; return n ? '<button class="link" data-go="' + n._id + '">' + esc(n.name) + '</button>' : esc(b);
    }).join(', ') : (c.landlocked ? '—' : 'None (no land borders)');
    var status = c.unMember ? 'Independent, UN member' : c.independent ? 'Independent (not a UN member)' : 'Territory / dependency';
    return row('Capital', list(c.capital)) +
      row('Region', esc(c.region) + (c.subregion ? ' / ' + esc(c.subregion) : '')) +
      row('Population', num(c.population)) +
      row('Area', area(c.area, null)) +
      row('Languages', list(c.languages)) +
      row('Currencies', cur) +
      row('Time zones', c.timezones.map(function (t) { return '<span class="tz">' + esc(t) + '</span>'; }).join('') || '—') +
      row('Drives on the', cap(c.drive)) +
      row('Calling code', list(c.calling)) +
      row('Internet domain', list(c.tld)) +
      row('People are called', esc(c.demonym || '—')) +
      row('Week starts on', cap(c.startOfWeek)) +
      row('Borders', borders) +
      row('Status', status) +
      row('Country codes', esc(c.cca2) + ' / ' + esc(c.cca3));
  }
  function stateFacts(s) {
    var yr = parseInt(String(s.admitted).slice(-4), 10);
    var admLabel = s.federal_district ? 'Established' : yr <= 1790 ? 'Ratified Constitution' : 'Became a state';
    return row('Abbreviation', esc(s.abbr)) +
      row('Capital', esc(s.capital)) +
      row('Largest city', esc(s.largest)) +
      row('Population', num(s.pop) + ' <span class="muted">(2020 U.S. Census)</span>') +
      row('Area', area(s.area_km2, s.area_mi2)) +
      row('Time zones', s.timezones.map(function (t) { return '<span class="tz">' + esc(t) + '</span>'; }).join('<br>')) +
      row('Nickname', esc(s.nickname)) +
      row(admLabel, esc(s.admitted) + (!s.federal_district && yr <= 1790 ? ' <span class="muted">(one of the original 13)</span>' : '')) +
      row('Country', 'United States') +
      row('Drives on the', 'Right') +
      row('Currency', 'United States dollar ($) <span class="muted">USD</span>') +
      row('Calling code', '+1');
  }
  function show(id, keepFocus, fromTap) {
    var it = byId[id]; if (!it) return;
    state.sel = id;
    try { localStorage.setItem('te.sel', id); } catch (e) {}
    var lis = $('list').querySelectorAll('li[data-id]');
    for (var i = 0; i < lis.length; i++) {
      var on = lis[i].getAttribute('data-id') === id;
      lis[i].classList.toggle('sel', on);
      if (on) { lis[i].setAttribute('aria-selected', 'true'); lis[i].scrollIntoView({ block: 'nearest' }); } else lis[i].removeAttribute('aria-selected');
    }
    var fav = isFav(id);
    var sub = it._kind === 'c' ? it.official : (it.federal_district ? 'Federal district of the United States' : 'State of the United States · ' + it.nickname);
    $('detail').innerHTML =
      '<div class="hero"><img class="flag" src="' + esc(it.flag) + '" alt="Flag of ' + esc(it._name) + '">' +
      '<div><h1>' + esc(it._name) + '</h1><p class="official">' + esc(sub) + '</p>' +
      '<div class="actions"><a class="btn primary" target="_blank" rel="noopener noreferrer" href="' + esc(mapUrl(it)) + '" title="Opens OpenStreetMap in your web browser (needs internet)">🗺️ Open in map</a>' +
      '<button type="button" class="btn' + (fav ? ' on' : '') + '" id="favBtn">' + (fav ? '★ Favorite' : '☆ Add to favorites') + '</button>' +
      '<button type="button" class="btn" id="copyBtn" title="Copy these facts as text">Copy facts</button></div></div></div>' +
      '<section class="facts"><dl>' + (it._kind === 'c' ? countryFacts(it) : stateFacts(it)) + '</dl></section>' +
      '<p class="muted note">' + (it._kind === 'c' ? 'Population figures are recent estimates from REST Countries.' : 'Population is the official April 1, 2020 U.S. Census count.') + ' The map button is the only feature that needs internet.</p>';
    $('favBtn').addEventListener('click', function () { toggleFav(id); });
    $('copyBtn').addEventListener('click', function () {
      var txt = it._name + '\n' + Array.prototype.map.call($('detail').querySelectorAll('dt'), function (dt) {
        return dt.textContent + ': ' + dt.nextElementSibling.textContent.replace(/\s+/g, ' ').trim();
      }).join('\n');
      var b = this;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { b.textContent = 'Copied ✓'; }, function () {
        var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); b.textContent = 'Copied ✓'; } catch (e) {} ta.remove();
      });
    });
    Array.prototype.forEach.call($('detail').querySelectorAll('[data-go]'), function (b) {
      b.addEventListener('click', function () {
        var target = b.getAttribute('data-go');
        if (state.tab !== 'countries') setTab('countries');
        state.q = ''; $('search').value = ''; state.region = ''; $('region').value = '';
        renderList(); show(target);
      });
    });
    if (!keepFocus) $('detail').scrollTop = 0;
    if (!keepFocus && fromTap && window.matchMedia('(orientation: portrait)').matches) $('detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- boot ----
  Promise.all([
    fetch('data.json').then(function (r) { return r.json(); }),
  ]).then(function (res) {
    DATA = res[0]; state.favs = loadFavs();
    $('ver').textContent = 'v' + VERSION;
    DATA.countries.forEach(function (c) {
      c._kind = 'c'; c._id = 'c:' + c.cca3; c._name = c.name; byCca3[c.cca3] = c;
      c._s = fold([c.name, c.official, c.cca2, c.cca3].concat(c.capital).join(' | '));
      byId[c._id] = c;
    });
    DATA.states.forEach(function (s) {
      s._kind = 's'; s._id = 's:' + s.abbr; s._name = s.name;
      s._s = fold([s.name, s.abbr, s.capital, s.largest, s.nickname].join(' | '));
      byId[s._id] = s;
    });
    var regions = {}; DATA.countries.forEach(function (c) { if (c.region) regions[c.region] = 1; });
    Object.keys(regions).sort().forEach(function (r) { var o = document.createElement('option'); o.value = r; o.textContent = r; $('region').appendChild(o); });
    var m = DATA.meta || {};
    $('sources').innerHTML = '<li><b>Countries:</b> ' + esc(m.countrySource) + '</li><li><b>US states:</b> ' + esc(m.stateSource) + '</li><li><b>Flags:</b> ' + esc(m.flagSource) + '</li>' +
      (m.built ? '<li><b>Data built:</b> ' + esc(m.built) + '</li>' : '');
    var last = null; try { last = localStorage.getItem('te.sel'); } catch (e) {}
    var h = decodeURIComponent(location.hash.slice(1));
    var start = byId[h] ? h : byId[last] ? last : 'c:' + DATA.countries[0].cca3;
    setTab(start.charAt(0) === 's' ? 'states' : 'countries');
    show(start);
    window.addEventListener('hashchange', function () {
      var id = decodeURIComponent(location.hash.slice(1));
      if (!byId[id]) return;
      var tab = id.charAt(0) === 's' ? 'states' : 'countries';
      if (state.tab !== tab && state.tab !== 'favs') setTab(tab);
      renderList(); show(id);
    });
  }).catch(function (e) {
    $('detail').innerHTML = '<p class="placeholder">Could not load the built-in data: ' + esc(e) + '</p>';
  });

  // ---- offline support ----
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then(function () { return navigator.serviceWorker.ready; }).then(function () {
      return caches.match('data.json');
    }).then(function (ok) {
      if (ok) { $('offline').hidden = false; setTimeout(function () { $('offline').hidden = true; }, 4000); }
    }).catch(function () {});
  }
})();
