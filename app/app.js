(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const app = $('app'), listEl = $('list'), q = $('q'), detail = $('detailInner'), countEl = $('count');
  const tabC = $('tabC'), tabS = $('tabS');
  const split = window.matchMedia('(min-width: 768px)');

  let countries = [], states = [];
  let showStates = false, selKey = null, pushed = false;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const N = (n) => Math.round(n).toLocaleString('en-US');
  const J = (l) => (!l || l.length === 0 ? '' : l.join(', '));
  const has = (s, t) => s != null && s.toLowerCase().includes(t);
  const keyOf = (o) => (o.cca2 ? 'c/' + o.cca2 : 's/' + o.abbr);

  function filtered() {
    const t = q.value.trim().toLowerCase();
    if (showStates) return states.filter((s) => t === '' || has(s.name, t) || s.abbr.toLowerCase() === t);
    return countries.filter((c) => t === '' || has(c.name, t) || has(c.official, t) || (c.capital && c.capital.some((x) => has(x, t))));
  }

  function setTabs() {
    tabC.setAttribute('aria-selected', String(!showStates));
    tabS.setAttribute('aria-selected', String(showStates));
  }

  function renderList() {
    setTabs();
    const items = filtered();
    countEl.textContent = items.length + (items.length === 1 ? ' place' : ' places');
    if (items.length === 0) {
      listEl.innerHTML = '<li class="empty">No matches</li>';
      if (split.matches) renderEmpty();
      return items;
    }
    listEl.innerHTML = items.map((o) => {
      const k = keyOf(o);
      const icon = o.cca2
        ? `<img class="thumb" src="flags/${o.cca2.toLowerCase()}.png" alt="" loading="lazy" decoding="async">`
        : `<span class="abbr">${esc(o.abbr)}</span>`;
      const sub = o.cca2 ? J(o.capital) : o.capital;
      return `<li class="${k === selKey ? 'sel' : ''}" data-k="${esc(k)}"><button type="button">${icon}<span class="nm">${esc(o.name)}</span><span class="sub">${esc(sub || '')}</span><svg class="chev" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M8.6 4.6a1 1 0 0 1 1.4 0l6.7 6.7a1 1 0 0 1 0 1.4L10 19.4A1 1 0 1 1 8.6 18l6-6-6-6a1 1 0 0 1 0-1.4z"/></svg></button></li>`;
    }).join('');
    return items;
  }

  function find(k) {
    if (!k) return null;
    const [t, code] = k.split('/');
    if (t === 'c') return countries.find((c) => c.cca2 === code) || null;
    if (t === 's') return states.find((s) => s.abbr === code) || null;
    return null;
  }

  const row = (k, v) => `<div><dt>${esc(k)}</dt><dd>${esc(v == null || String(v).trim() === '' ? '—' : v)}</dd></div>`;
  const cap = (s) => (!s ? '' : s[0].toUpperCase() + s.slice(1));

  function renderEmpty() {
    detail.innerHTML = '<div class="head"><div><h2 class="title">No matches</h2></div></div>';
  }

  function renderDetail(o) {
    let html, mapQuery;
    if (o.cca2) {
      html = `<div class="head"><img class="flag" src="flags/${o.cca2.toLowerCase()}.png" alt="Flag of ${esc(o.name)}" width="160"><div><h2 class="title">${esc(o.name)}</h2><p class="subtitle">${esc(o.official)}</p></div></div><dl class="facts">` +
        row('Capital', J(o.capital)) +
        row('Region', o.region + (o.subregion ? ' / ' + o.subregion : '')) +
        row('Population', N(o.population)) +
        row('Area', o.area > 0 ? N(o.area) + ' km²  (' + N(o.area * 0.386102) + ' mi²)' : '') +
        row('Languages', J(o.languages)) +
        row('Currencies', J(o.currencies)) +
        row('Time zones', J(o.timezones)) +
        row('Drives on the', cap(o.drive)) +
        row('Calling code', o.calling) + '</dl>';
      mapQuery = o.name;
    } else {
      html = `<div class="head"><div><h2 class="title">${esc(o.name)}&nbsp; (${esc(o.abbr)})</h2><p class="subtitle">"${esc(o.nickname)}"</p></div></div><dl class="facts">` +
        row('Abbreviation', o.abbr) +
        row('Capital', o.capital) +
        row('Largest city', o.largest) +
        row('Population (2020)', N(o.pop)) +
        row('Area', N(o.area_mi2) + ' mi²  (' + N(o.area_mi2 * 2.58999) + ' km²)') +
        row('Nickname', o.nickname) +
        row('Time zone(s)', o.timezones.join(', ')) + '</dl>';
      mapQuery = o.abbr === 'DC' ? 'Washington, DC' : o.name + ', USA';
    }
    const url = 'https://maps.apple.com/?q=' + encodeURIComponent(mapQuery);
    html += `<a class="map" id="mapBtn" href="${esc(url)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 1 7 7c0 5.2-7 13-7 13S5 14.2 5 9a7 7 0 0 1 7-7zm0 4.5A2.5 2.5 0 1 0 12 11.5 2.5 2.5 0 0 0 12 6.5z"/></svg>Open in map</a>`;
    detail.innerHTML = html;
    detail.parentElement.scrollTop = 0;
    document.title = o.name + ' · TravelExplorer';
  }

  function markSel() {
    for (const li of listEl.children) li.classList.toggle('sel', li.dataset.k === selKey);
  }

  function select(k, { fromUser = false } = {}) {
    const o = find(k);
    if (!o) return;
    selKey = k;
    renderDetail(o);
    markSel();
    if (fromUser) {
      if (!split.matches) {
        history.pushState({ k }, '', '#' + k);
        pushed = true;
        app.dataset.view = 'detail';
      } else {
        history.replaceState({ k }, '', '#' + k);
      }
    }
  }

  function refill() {
    const items = renderList();
    // Like the Windows app: in split view, always show something on the right.
    if (split.matches && items.length && !items.some((o) => keyOf(o) === selKey)) select(keyOf(items[0]));
    else markSel();
  }

  function goList() {
    app.dataset.view = 'list';
    document.title = 'TravelExplorer';
    const li = listEl.querySelector('.sel');
    if (li) li.scrollIntoView({ block: 'nearest' });
  }

  // Events
  tabC.addEventListener('click', () => { if (showStates) { showStates = false; listEl.scrollTop = 0; refill(); } });
  tabS.addEventListener('click', () => { if (!showStates) { showStates = true; listEl.scrollTop = 0; refill(); } });
  q.addEventListener('input', refill);
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') q.blur(); });
  listEl.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-k]');
    if (li) select(li.dataset.k, { fromUser: true });
  });
  $('back').addEventListener('click', () => {
    if (pushed) history.back();
    else { history.replaceState(null, '', location.pathname); goList(); }
  });
  window.addEventListener('popstate', () => {
    const k = location.hash.slice(1);
    if (k && find(k)) {
      showStates = k.startsWith('s/');
      select(k);
      if (!split.matches) app.dataset.view = 'detail';
    } else {
      pushed = false;
      goList();
    }
  });
  split.addEventListener('change', () => {
    if (split.matches) { app.dataset.view = 'list'; refill(); }
  });

  // About
  const about = $('about');
  $('aboutBtn').addEventListener('click', () => {
    $('aboutCounts').textContent = `Countries: ${countries.length} · US States: ${states.length} (50 states + DC).`;
    if (about.showModal) about.showModal(); else alert(about.innerText);
  });

  // "Add to Home Screen" hint for iPhone / iPad Safari that isn't installed yet
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  let dismissed = false;
  try { dismissed = localStorage.getItem('te-install-dismissed') === '1'; } catch (e) {}
  if ((isIOS && !standalone && !dismissed) || /[?&]install-hint/.test(location.search)) $('install').hidden = false;
  $('installX').addEventListener('click', () => {
    $('install').hidden = true;
    try { localStorage.setItem('te-install-dismissed', '1'); } catch (e) {}
  });

  // Offline support
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }

  // Load data (same files as the Windows app)
  Promise.all([
    fetch('data/countries.json').then((r) => r.json()),
    fetch('data/states.json').then((r) => r.json()),
  ]).then(([c, s]) => {
    countries = c; states = s;
    const k = location.hash.slice(1);
    if (k && find(k)) {
      showStates = k.startsWith('s/');
      renderList();
      select(k);
      if (!split.matches) app.dataset.view = 'detail';
    } else {
      refill();
    }
  }).catch(() => {
    detail.innerHTML = '<p class="loading">Couldn\'t load the data. Connect to the internet once and reopen the app.</p>';
  });
})();
