(function () {
  var root = document.documentElement;
  var ZH = window.I18N_ZH || {};
  var EN_UI = {
    ui_light: 'Light Mode',
    ui_circuit: 'Dark Mode',
    ui_light_aria: 'Switch to white background',
    ui_circuit_aria: 'Switch to dark background',
    demo_in: 'Input X-ray',
    demo_out: 'Model output: Grad-CAM heatmap',
    demo_run: 'Run model',
    demo_running: 'Running…',
    demo_reset: 'Show original',
    r_demo_in: 'Finished robot',
    r_demo_out: 'DQN simulation map',
    r_demo_run: 'See route planning',
    r_demo_reset: 'Show robot'
  };

  function save(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

  var lang = load('lang') === 'zh' ? 'zh' : 'en';
  function ui(key) { return lang === 'zh' && ZH[key] ? ZH[key] : EN_UI[key]; }

  // ---------- Demos: press a button to swap the image ----------
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var demos = [];

  function renderDemos() {
    demos.forEach(function (d) {
      var s = d.screen.dataset.state;
      d.tag.textContent = s === 'output' ? ui(d.keys.out) : ui(d.keys.in);
      d.btn.textContent = s === 'output' ? ui(d.keys.reset) : s === 'running' ? ui('demo_running') : ui(d.keys.run);
      d.btn.disabled = s === 'running';
    });
  }

  document.querySelectorAll('.demo:not(.gallery)').forEach(function (fig) {
    var robot = fig.classList.contains('demo--robot');
    var d = {
      screen: fig.querySelector('.demo__screen'),
      btn: fig.querySelector('.demo__run'),
      tag: fig.querySelector('.demo__tag'),
      keys: robot
        ? { in: 'r_demo_in', out: 'r_demo_out', run: 'r_demo_run', reset: 'r_demo_reset' }
        : { in: 'demo_in', out: 'demo_out', run: 'demo_run', reset: 'demo_reset' }
    };
    d.btn.addEventListener('click', function () {
      if (d.screen.dataset.state === 'output') {
        d.screen.dataset.state = 'input';
        renderDemos();
        return;
      }
      d.screen.dataset.state = 'running';
      renderDemos();
      setTimeout(function () {
        d.screen.dataset.state = 'output';
        renderDemos();
      }, reduce ? 0 : 1200);
    });
    demos.push(d);
  });

  // ---------- Gallery: tabs switch between views ----------
  var G_TAGS = ['Finished robot', 'DQN simulation map', 'PCB layout (3D)', 'Assembled control board', 'System schematic'];
  var galleries = [];
  document.querySelectorAll('.gallery').forEach(function (fig) {
    var g = {
      imgs: fig.querySelectorAll('.gallery__img'),
      tabs: fig.querySelectorAll('.gallery__tab'),
      tag: fig.querySelector('.gallery__tag'),
      full: fig.querySelector('.gallery__full'),
      i: 0
    };
    g.tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { g.i = i; renderGalleries(); });
    });
    // Clicking the image opens the full-size version, same as the corner icon
    fig.querySelector('.demo__screen').addEventListener('click', function (e) {
      if (!e.target.closest('.gallery__full')) g.full.click();
    });
    galleries.push(g);
  });
  function renderGalleries() {
    galleries.forEach(function (g) {
      g.imgs.forEach(function (img, i) { img.classList.toggle('is-active', i === g.i); });
      g.tabs.forEach(function (t, i) {
        t.classList.toggle('is-active', i === g.i);
        t.setAttribute('aria-pressed', i === g.i ? 'true' : 'false');
      });
      g.tag.textContent = lang === 'zh' && ZH['g_t' + g.i] ? ZH['g_t' + g.i] : G_TAGS[g.i];
      g.full.href = g.imgs[g.i].getAttribute('src');
    });
  }

  // ---------- Language ----------
  // Keep the English text from the page so we can switch back.
  var textEls = document.querySelectorAll('[data-i18n]');
  var htmlEls = document.querySelectorAll('[data-i18n-html]');
  var altEls = document.querySelectorAll('[data-i18n-alt]');
  textEls.forEach(function (el) { el.dataset.en = el.textContent; });
  htmlEls.forEach(function (el) { el.dataset.en = el.innerHTML; });
  altEls.forEach(function (el) { el.dataset.en = el.getAttribute('alt'); });

  var langBtn = document.querySelector('.lang-toggle');

  function applyLang() {
    var zh = lang === 'zh';
    root.setAttribute('lang', zh ? 'zh-Hant' : 'en');
    textEls.forEach(function (el) {
      var k = el.dataset.i18n;
      el.textContent = zh && ZH[k] ? ZH[k] : el.dataset.en;
    });
    htmlEls.forEach(function (el) {
      var k = el.dataset.i18nHtml;
      el.innerHTML = zh && ZH[k] ? ZH[k] : el.dataset.en;
    });
    altEls.forEach(function (el) {
      var k = el.dataset.i18nAlt;
      el.setAttribute('alt', zh && ZH[k] ? ZH[k] : el.dataset.en);
    });
    langBtn.textContent = zh ? 'English' : '中文';
    langBtn.setAttribute('lang', zh ? 'en' : 'zh-Hant');
    langBtn.setAttribute('aria-label', zh ? 'Switch to English' : '切換為中文');
    renderDemos();
    renderGalleries();
  }

  langBtn.addEventListener('click', function () {
    lang = lang === 'zh' ? 'en' : 'zh';
    save('lang', lang);
    applyLang();
  });

  applyLang();
})();

// ---------- Skills: hover the bar to preview, click to pin ----------
(function () {
  var grid = document.querySelector('.sgrid');
  if (!grid) return;
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.sg'));
  cards.forEach(function (c, i) { c.style.setProperty('--o', i * 2); });
  var btns = Array.prototype.slice.call(grid.querySelectorAll('.sg--btn'));
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var pinned = null, preview = null, timer = null;
  btns.forEach(function (b) { if (b.getAttribute('aria-expanded') === 'true') pinned = b; });

  var wrap = grid.querySelector('.sgpanels');
  var openPanel = null;
  function fitHeight() { if (wrap) wrap.style.height = openPanel ? openPanel.offsetHeight + 'px' : '0px'; }
  function render() {
    var active = preview || pinned;
    openPanel = null;
    if (active && wrap) wrap.style.setProperty('--po', cards.indexOf(active) * 2 + 1);
    btns.forEach(function (b) {
      var on = b === active;
      var panel = document.getElementById(b.getAttribute('aria-controls'));
      b.setAttribute('aria-expanded', on ? 'true' : 'false');
      b.classList.toggle('is-pinned', b === pinned);
      panel.classList.toggle('is-open', on);
      if (on) openPanel = panel;
      panel.inert = !on;
      panel.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    fitHeight();
  }
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      pinned = pinned === b ? null : b;
      preview = null;
      render();
    });
    if (canHover) {
      b.addEventListener('mouseenter', function () {
        clearTimeout(timer);
        if (pinned) return;          // while something is pinned, hover does nothing
        preview = b; render();
      });
    }
  });
  if (canHover) {
    cards.forEach(function (c) {
      if (!c.classList.contains('sg--btn')) c.addEventListener('mouseenter', function () {
        clearTimeout(timer); if (preview) { preview = null; render(); }
      });
    });
    grid.addEventListener('mouseenter', function () { clearTimeout(timer); });
    grid.addEventListener('mouseleave', function () {
      timer = setTimeout(function () { if (preview) { preview = null; render(); } }, 200);
    });
  }
  render();
  window.addEventListener('resize', fitHeight);
  if ('ResizeObserver' in window) grid.querySelectorAll('.sgpanel').forEach(function (p) { new ResizeObserver(fitHeight).observe(p); });
})();

// ---------- Scroll reveal ----------
(function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var targets = document.querySelectorAll(
    '.hero__text > *, .portrait, .section > h2, .duo h2, .honors > h2, .project, .timeline > li, .sg, .contact > *:not(h2)'
  );
  document.documentElement.classList.add('js-reveal');
  targets.forEach(function (el) {
    el.classList.add('reveal');
    // stagger siblings a little
    var i = Array.prototype.indexOf.call(el.parentNode.children, el);
    el.style.transitionDelay = Math.min(i * 80, 400) + 'ms';
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  targets.forEach(function (el) { io.observe(el); });
})();
