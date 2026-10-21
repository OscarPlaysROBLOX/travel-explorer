(function () {
  'use strict';
  var VERSION = '1.0.0';
  var $ = function (id) { return document.getElementById(id); };
  var uid = 0;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---- hand-made SVG planet drawings (not photos) ----
  var LOOK = {
    mercury: { c: ['#d9d4cc', '#8e8579', '#4b443d'], craters: true },
    venus:   { c: ['#fff1c4', '#e8b65a', '#9a6420'], bands: ['#f6d58f', '#d9a24a'] },
    earth:   { c: ['#7fd3ff', '#1e7fd8', '#0b3b80'], earth: true },
    mars:    { c: ['#ffb08a', '#d4532a', '#7a2410'], cap: true },
    jupiter: { c: ['#f7e1c3', '#c99a6b', '#7d5634'], bands: ['#b07a4f', '#e8cfae', '#a86a43', '#f1dcc0', '#9d6440'], spot: true },
    saturn:  { c: ['#fff0c8', '#e3c27f', '#9c7a3c'], bands: ['#d8b56f', '#f3dfaa', '#caa45e'], rings: '#e9d3a0' },
    uranus:  { c: ['#dcfbff', '#7fe0ea', '#2c98a8'], rings: '#bdf3f8', tilt: true },
    neptune: { c: ['#a9c8ff', '#3d6cf0', '#16308f'], bands: ['#5b86f5', '#2f58d6'], spotN: true },
    pluto:   { c: ['#f6e3cf', '#c99c7a', '#6f4d3a'], heart: true }
  };
  function planetSVG(id) {
    var L = LOOK[id], n = 'g' + (++uid), r = 70, parts = [];
    var defs = '<defs><radialGradient id="' + n + '" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="' + L.c[0] + '"/><stop offset=".55" stop-color="' + L.c[1] + '"/><stop offset="1" stop-color="' + L.c[2] + '"/></radialGradient>' +
      '<radialGradient id="' + n + 's" cx="30%" cy="28%" r="80%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>' +
      '<clipPath id="' + n + 'c"><circle cx="100" cy="100" r="' + r + '"/></clipPath></defs>';
    var ringBack = '', ringFront = '';
    if (L.rings) {
      var rot = L.tilt ? 'rotate(-70 100 100)' : 'rotate(-18 100 100)';
      var rx = L.tilt ? 96 : 98, ry = L.tilt ? 22 : 26, sw = L.tilt ? 4 : 13;
      ringBack = '<g transform="' + rot + '"><path d="M' + (100 - rx) + ' 100 A' + rx + ' ' + ry + ' 0 0 1 ' + (100 + rx) + ' 100" fill="none" stroke="' + L.rings + '" stroke-width="' + sw + '" opacity=".75"/></g>';
      ringFront = '<g transform="' + rot + '"><path d="M' + (100 - rx) + ' 100 A' + rx + ' ' + ry + ' 0 0 0 ' + (100 + rx) + ' 100" fill="none" stroke="' + L.rings + '" stroke-width="' + sw + '"/>' +
        (L.tilt ? '' : '<path d="M' + (100 - rx + 14) + ' 100 A' + (rx - 14) + ' ' + (ry - 5) + ' 0 0 0 ' + (100 + rx - 14) + ' 100" fill="none" stroke="#a88b55" stroke-width="2" opacity=".7"/>') + '</g>';
    }
    parts.push('<circle cx="100" cy="100" r="' + r + '" fill="url(#' + n + ')"/>');
    var g = [];
    if (L.bands) L.bands.forEach(function (col, i) {
      var y = 52 + i * (100 / L.bands.length) + (i % 2) * 6;
      g.push('<path d="M20 ' + y + ' Q100 ' + (y + 10) + ' 180 ' + y + ' L180 ' + (y + 11) + ' Q100 ' + (y + 21) + ' 20 ' + (y + 11) + 'Z" fill="' + col + '" opacity=".75"/>');
    });
    if (L.spot) g.push('<ellipse cx="128" cy="118" rx="15" ry="9" fill="#c2492b" stroke="#f3c7a6" stroke-width="2"/>');
    if (L.spotN) g.push('<ellipse cx="80" cy="88" rx="12" ry="7" fill="#1a2a78" opacity=".8"/>');
    if (L.craters) [[75, 80, 10], [120, 70, 7], [110, 125, 13], [70, 128, 6], [140, 105, 5], [95, 100, 4]].forEach(function (k) {
      g.push('<circle cx="' + k[0] + '" cy="' + k[1] + '" r="' + k[2] + '" fill="#6d655c" opacity=".55"/><circle cx="' + (k[0] - 1.5) + '" cy="' + (k[1] - 1.5) + '" r="' + (k[2] * .7) + '" fill="#b8b0a5" opacity=".5"/>');
    });
    if (L.earth) g.push('<path d="M55 70c12-14 32-12 38-2s-6 18 2 26-8 22-20 16-16-12-22-20-6-12 2-20z" fill="#3fbf5c"/><path d="M112 58c14-6 34 2 38 14s-8 10-14 18 4 22-6 30-18-4-16-16-12-12-8-22 0-18 6-24z" fill="#46c766"/><path d="M98 140c10-4 22 0 24 8s-12 12-22 8-10-12-2-16z" fill="#3fbf5c"/><ellipse cx="100" cy="36" rx="34" ry="8" fill="#fff" opacity=".9"/><path d="M40 92c20-6 40 4 60-2s40-8 62 2" stroke="#fff" stroke-width="5" fill="none" opacity=".5" stroke-linecap="round"/>');
    if (L.cap) g.push('<ellipse cx="100" cy="34" rx="30" ry="9" fill="#fff4ef"/><path d="M48 112c18 8 40-6 60 2s30 10 44-2" stroke="#9c3315" stroke-width="7" fill="none" opacity=".45" stroke-linecap="round"/><circle cx="125" cy="85" r="8" fill="#a6391a" opacity=".5"/>');
    if (L.heart) g.push('<path d="M100 135c-28-16-38-34-28-46 8-10 22-6 28 4 6-10 20-14 28-4 10 12 0 30-28 46z" fill="#fff3e4" opacity=".9"/>');
    parts.push('<g clip-path="url(#' + n + 'c)">' + g.join('') + '</g>');
    parts.push('<circle cx="100" cy="100" r="' + r + '" fill="url(#' + n + 's)"/>');
    parts.push('<ellipse cx="76" cy="70" rx="18" ry="11" fill="#fff" opacity=".25" transform="rotate(-30 76 70)"/>');
    return '<svg viewBox="0 0 200 200" role="img" aria-label="Drawing of ' + id + '">' + defs + ringBack + parts.join('') + ringFront + '</svg>';
  }

  // ---- grid ----
  var P = window.PLANETS, byId = {};
  P.forEach(function (p) { byId[p.id] = p; });
  $('grid').innerHTML = P.map(function (p) {
    return '<button type="button" class="pcard" data-id="' + p.id + '"><span class="num">' + p.order + '</span>' + planetSVG(p.id) +
      '<span class="pn">' + esc(p.name) + '</span><span class="pk">' + esc(p.nick) + '</span></button>';
  }).join('');
  $('plutoCard').innerHTML = planetSVG('pluto') + '<div><b>What about Pluto? 🤔</b><br><span>It used to be the 9th planet. Tap to find out what happened!</span></div>';
  $('grid').addEventListener('click', function (e) { var b = e.target.closest('.pcard'); if (b) location.hash = 'planet/' + b.dataset.id; });
  $('plutoCard').addEventListener('click', function () { location.hash = 'planet/pluto'; });

  function tile(icon, label, val) { return '<div class="tile"><div class="ti" aria-hidden="true">' + icon + '</div><span class="tl">' + label + '</span><span class="tv">' + esc(val) + '</span></div>'; }
  function story(cls, title, big, text) { return '<div class="story ' + cls + '"><h3>' + title + '</h3>' + (big ? '<p class="big">' + esc(big) + '</p>' : '') + '<p>' + esc(text) + '</p></div>'; }
  var ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

  function showPlanet(id) {
    var html;
    if (id === 'pluto') {
      var pl = window.PLUTO;
      html = '<div class="sheet"><button type="button" class="back" data-close>‹ All planets</button>' +
        '<div class="hero">' + planetSVG('pluto') + '<div><h2 id="dTitle">Pluto</h2><span class="tag">' + esc(pl.nick) + '</span></div></div>' +
        '<div class="tiles">' + tile('☀️', 'Distance from Sun', pl.distance) + tile('🌙', 'Moons', pl.moons) + tile('🔄', 'One day', pl.day) + tile('🗓️', 'One year', pl.year) + '</div>' +
        story('s1', '🔭 The story of Pluto', '', pl.text) + '</div>';
    } else {
      var p = byId[id]; if (!p) return;
      var i = P.indexOf(p), prev = P[i - 1], next = P[i + 1];
      html = '<div class="sheet"><button type="button" class="back" data-close>‹ All planets</button>' +
        '<div class="hero">' + planetSVG(p.id) + '<div><h2 id="dTitle">' + esc(p.name) + '</h2><span class="tag">' + esc(p.nick) + '</span><p class="ord">' + ORD[p.order] + ' planet from the Sun</p></div></div>' +
        '<div class="tiles">' + tile('☀️', 'Distance from Sun', p.distance + ' · ' + p.au) + tile('🌙', 'Moons', p.moons) + tile('🔄', 'One day', p.day) + tile('🗓️', 'One year', p.year) + '</div>' +
        story('s1', '🔭 Who discovered it?', p.discovered, p.discoveredStory) +
        story('s2', '🏛️ How it got its name', '', p.name_origin) +
        story('s3', '🛰️ First spacecraft to visit', p.firstVisit, p.firstVisitStory) +
        story('s4', '🤩 Fun facts', '', p.fun + ' ' + p.fun2) +
        '<div class="navrow">' + (prev ? '<button type="button" data-go="' + prev.id + '">‹ ' + esc(prev.name) + '</button>' : '<span></span>') +
        (next ? '<button type="button" data-go="' + next.id + '">' + esc(next.name) + ' ›</button>' : '<button type="button" data-go="pluto">Pluto ›</button>') + '</div></div>';
    }
    var d = $('detail'); d.innerHTML = html; d.hidden = false; d.scrollTop = 0;
  }
  $('detail').addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) location.hash = 'planets';
    var g = e.target.closest('[data-go]'); if (g) location.hash = 'planet/' + g.dataset.go;
  });

  // ---- about ----
  $('ver').textContent = VERSION;
  $('sources').innerHTML = window.SOURCES.map(function (s) { return '<li>' + esc(s[0]) + '<br><a href="' + esc(s[1]) + '" target="_blank" rel="noopener noreferrer">' + esc(s[1].replace('https://', '')) + '</a></li>'; }).join('');
  $('aboutBtn').addEventListener('click', function () { location.hash = 'about'; });
  $('about').addEventListener('click', function (e) { if (e.target.closest('[data-close]')) location.hash = 'planets'; });

  // ---- tabs + simple hash router ----
  var curTab = null;
  function setTab(t) {
    if (curTab !== t) { curTab = t; window.scrollTo(0, 0); }
    $('view-planets').hidden = t !== 'planets'; $('view-videos').hidden = t !== 'videos';
    [['planets', 'tab-planets'], ['videos', 'tab-videos']].forEach(function (x) { var on = x[0] === t; $(x[1]).classList.toggle('active', on); $(x[1]).setAttribute('aria-selected', on); });
  }
  $('tab-planets').addEventListener('click', function () { location.hash = 'planets'; });
  $('tab-videos').addEventListener('click', function () { location.hash = 'videos'; });
  function route() {
    var h = location.hash.slice(1);
    $('detail').hidden = true; $('about').hidden = true;
    if (h === 'videos') { setTab('videos'); }
    else { setTab('planets'); if (h.indexOf('planet/') === 0) showPlanet(h.slice(7)); else if (h === 'about') { $('about').hidden = false; $('about').scrollTop = 0; } }
  }
  window.addEventListener('hashchange', route);
  route();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
})();
