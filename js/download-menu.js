(function () {
  function closeAll(except) {
    document.querySelectorAll('[data-split-dl].is-open').forEach(function (wrap) {
      if (wrap === except) return;
      wrap.classList.remove('is-open');
      var btn = wrap.querySelector('.split-dl-toggle');
      var menu = wrap.querySelector('.split-dl-menu');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      if (menu) menu.hidden = true;
    });
  }

  function openMenu(wrap) {
    closeAll(wrap);
    var btn = wrap.querySelector('.split-dl-toggle');
    var menu = wrap.querySelector('.split-dl-menu');
    wrap.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    var first = menu.querySelector('[role="menuitem"]');
    if (first) first.focus();
  }

  function closeMenu(wrap, returnFocus) {
    var btn = wrap.querySelector('.split-dl-toggle');
    var menu = wrap.querySelector('.split-dl-menu');
    wrap.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    if (returnFocus) btn.focus();
  }

  function items(menu) {
    return Array.prototype.slice.call(menu.querySelectorAll('[role="menuitem"]'));
  }

  document.querySelectorAll('[data-split-dl]').forEach(function (wrap) {
    var btn = wrap.querySelector('.split-dl-toggle');
    var menu = wrap.querySelector('.split-dl-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (wrap.classList.contains('is-open')) closeMenu(wrap, false);
      else openMenu(wrap);
    });

    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMenu(wrap);
      }
    });

    menu.addEventListener('keydown', function (e) {
      var list = items(menu);
      var i = list.indexOf(document.activeElement);
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu(wrap, true);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        list[(i + 1) % list.length].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        list[(i - 1 + list.length) % list.length].focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        list[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        list[list.length - 1].focus();
      } else if (e.key === 'Tab') {
        closeMenu(wrap, false);
      }
    });
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-split-dl]')) closeAll(null);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll(null);
  });
})();
