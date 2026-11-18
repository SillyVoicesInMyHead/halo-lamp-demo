(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var smooth = function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // split text into words (content stays readable if nothing else runs)
  $$('[data-split],[data-reveal]').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', words.join(' '));
    el.innerHTML = words.map(function (w) { return '<span class="w" aria-hidden="true">' + w + '</span>'; }).join(' ');
  });

  // nav goes solid after the hero starts to scroll
  var nav = $('#nav');
  function navState() { nav.classList.toggle('solid', window.scrollY > 40); }
  addEventListener('scroll', navState, { passive: true }); navState();

  // dust motes in the lamp light
  var motes = $('#motes');
  for (var i = 0; i < 16; i++) {
    var s = document.createElement('span'), sz = 2 + Math.random() * 3;
    s.style.cssText = 'width:' + sz + 'px;height:' + sz + 'px;left:' + (45 + Math.random() * 50) + '%;top:' + (35 + Math.random() * 50) + '%;animation-delay:' + (-Math.random() * 9) + 's;animation-duration:' + (7 + Math.random() * 6) + 's';
    motes.appendChild(s);
  }

  // sunrise renderer (pure function of progress 0..1)
  var nightEl = $('.sr-night'), morning = $('.sr-morning'), cold = $('.sr-cold'), amber = $('.sr-amber'), bloom = $('.sr-bloom'), day = $('.sr-day');
  var imgs = $$('.sr-layer img'), caps = $$('.cap'), bar = $('#srBar'), tEl = $('#srTime'), kEl = $('#srK');
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function renderSunrise(p) {
    morning.style.opacity = smooth(0.3, 0.62, p);
    nightEl.style.opacity = 1 - smooth(0.34, 0.58, p);
    cold.style.opacity = 1 - smooth(0, 0.45, p);
    amber.style.opacity = smooth(0.1, 0.45, p) * (1 - 0.55 * smooth(0.65, 1, p));
    var b = smooth(0.35, 1, p);
    bloom.style.opacity = b;
    day.style.opacity = 0.32 * smooth(0.6, 1, p);
    bloom.style.transform = 'scale(' + (0.7 + b * 0.9) + ')';
    var sc = 1.14 - p * 0.08;
    imgs.forEach(function (im) { im.style.transform = 'scale(' + sc + ')'; });
    var mins = Math.round(330 + p * 75);
    tEl.textContent = pad(Math.floor(mins / 60)) + ':' + pad(mins % 60);
    kEl.textContent = Math.round((1800 + p * 3400) / 50) * 50;
    bar.style.transform = 'scaleX(' + p + ')';
    placeSunriseLamp(smooth(0.3, 0.62, p));
    caps.forEach(function (c, i) {
      var T = [0, 0.27, 0.53, 0.8, 1.01], a = T[i], z = T[i + 1], fadeIn = smooth(a - 0.02, a + 0.06, p), fadeOut = i === 3 ? 1 : 1 - smooth(z - 0.06, z, p);
      var o = i === 0 ? fadeOut : fadeIn * fadeOut;
      c.style.opacity = o;
      c.style.transform = 'translateY(' + ((1 - o) * 16) + 'px)';
    });
  }

  // pin a lamp to a nightstand: map a point in the photo's own pixels (px, py; pw is the lamp
  // width in photo pixels) to the screen, using the photo's real object-fit crop and transform,
  // so it stays on the furniture at every screen size
  function geom(img, px, py, pw) {
    var W = img.offsetWidth, H = img.offsetHeight, nw = img.naturalWidth, nh = img.naturalHeight;
    var k = Math.max(W / nw, H / nh);
    var pos = getComputedStyle(img).objectPosition.split(' ').map(parseFloat);
    var m = new DOMMatrixReadOnly(getComputedStyle(img).transform);
    var x = (W - nw * k) * pos[0] / 100 + px * k, y = (H - nh * k) * pos[1] / 100 + py * k;
    return { x: W / 2 + m.a * (x - W / 2) + m.e, y: H / 2 + m.d * (y - H / 2) + m.f, w: pw * k * m.a, W: W, H: H };
  }
  function apply(el, g) {
    var h = g.w * 500 / 513;
    el.style.width = g.w + 'px';
    el.style.transform = 'translate(' + (g.x - g.w / 2) + 'px,' + (g.y - h * 0.97) + 'px)';
    el.classList.add('placed');
  }
  var nums = function (v) { return v.split(',').map(Number); };
  // hero: the lamp has its own layer above the wash (same depth as the photo); both fill the stage
  function placeHero() {
    var el = $('#onStand'), img = $('.l-photo .room');
    if (!el || !img.naturalWidth) return;
    var g = geom(img, +el.dataset.x, +el.dataset.y, +el.dataset.w);
    apply(el, g);
    img.parentNode.style.setProperty('--sx', (g.x / g.W * 100) + '%');
    img.parentNode.style.setProperty('--sy', ((g.y - g.w / 2) / g.H * 100) + '%');
  }
  // sunrise: the two photos put the nightstand in slightly different places, so one lamp glides
  // from the night spot to the morning spot as the photos crossfade (t = morning opacity)
  var srT = 0;
  function placeSunriseLamp(t) {
    if (t != null) srT = t;
    var el = $('#srLamp'), ni = $('.sr-night > img'), mi = $('.sr-morning > img');
    if (!el || !ni.naturalWidth || !mi.naturalWidth) return;
    var a = geom.apply(null, [ni].concat(nums(el.dataset.night)));
    var b = geom.apply(null, [mi].concat(nums(el.dataset.morning)));
    var l = function (p, q) { return p + (q - p) * srT; };
    apply(el, { x: l(a.x, b.x), y: l(a.y, b.y), w: l(a.w, b.w) });
  }
  function placeLamps() { placeHero(); placeSunriseLamp(); }
  $$('.l-photo .room, .sr-layer > img').forEach(function (img) { if (!img.complete) img.addEventListener('load', placeLamps); });
  placeLamps();
  addEventListener('resize', placeLamps);

  // reserve button: an honest answer, works without GSAP or with reduced motion
  var cta = $('#cta'), ctaMsg = $('#ctaMsg');
  if (cta) cta.addEventListener('click', function () {
    ctaMsg.textContent = 'Halo is a design demo, so there is nothing to reserve yet. Thanks for scrolling all the way down.';
    ctaMsg.classList.add('flash');
  });

  if (reduce || !window.gsap || !window.ScrollTrigger) {
    renderSunrise(1);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // hero load reveal, word by word
  gsap.from('.hero h1 .w', { yPercent: 70, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09, delay: 0.15 });
  gsap.from('.hero .lede, .hero .cta-row', { opacity: 0, y: 18, duration: 0.9, ease: 'power2.out', stagger: 0.12, delay: 0.9 });
  gsap.from('#lamp, .lamp-rings, #wallGlow, .stand-pool', { opacity: 0, duration: 1.8, ease: 'power2.out', delay: 0.1 });
  // safety net: if the animation clock stalls (background tab), never leave the hero hidden
  setTimeout(function () {
    gsap.set('.hero h1 .w, .hero .lede, .hero .cta-row, #lamp, .lamp-rings, #wallGlow, .stand-pool', { clearProps: 'opacity,transform' });
  }, 3000);

  // lamp light follows the pointer a little (mouse only)
  if (matchMedia('(hover: hover)').matches) {
    var spill = $('#spill');
    addEventListener('pointermove', function (e) {
      spill.style.setProperty('--mx', (62 + (e.clientX / innerWidth) * 18) + '%');
      spill.style.setProperty('--my', (50 + (e.clientY / innerHeight) * 16) + '%');
    }, { passive: true });
  }

  // layered parallax + lamp brightening with scroll
  var layers = $$('.hero .layer').map(function (l) { return { el: l, d: parseFloat(l.dataset.depth) }; });
  var fg = $('.l-fg'), stand = $('#onStand'), lampLayer = $('.l-lamp');
  var glow = $('#wallGlow'), rings = $$('.ring'), hero = $('.hero-copy');
    ScrollTrigger.create({
    trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: function (st) {
      var p = st.progress, H = innerHeight;
      layers.forEach(function (o) {
        var y = -p * o.d * H * (o.el.classList.contains('l-fg') ? 0.5 : 0.55);
        o.el.style.transform = 'translate3d(0,' + y + 'px,0)';
      });
      glow.style.opacity = 0.75 + p * 0.25;
      // the dark wipe passes in front of the nightstand; dim the lamp by exactly the wipe's
      // darkness at the lamp's base, so lamp and furniture always fade together (never floats)
      var fr = fg.getBoundingClientRect(), rel = (stand.getBoundingClientRect().bottom - fr.top) / fr.height;
      var a = rel <= 0 ? 0 : rel < 0.22 ? 0.85 * rel / 0.22 : rel < 0.4 ? 0.85 + 0.15 * (rel - 0.22) / 0.18 : 1;
      lampLayer.style.opacity = (1 - a).toFixed(3);
      rings.forEach(function (r, i) { r.setAttribute('transform', 'translate(210 210) scale(' + (1 + p * 0.25 * (i + 1)) + ') translate(-210 -210)'); });
      hero.style.opacity = 1 - smooth(0.2, 0.5, p);
      hero.style.transform = 'translate3d(0,' + (-p * 60) + 'px,0)';
    }
  });

  // manifesto: words light up as you scroll
  gsap.fromTo('.manifesto .w', { opacity: 0.14 }, {
    opacity: 1, ease: 'none', stagger: 0.12,
    scrollTrigger: { trigger: '.manifesto p', start: 'top 80%', end: 'bottom 45%', scrub: true }
  });

  // section headings: word reveal on enter
  $$('.features h2, .specs h2').forEach(function (h) {
    gsap.from($$('.w', h), { yPercent: 60, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07,
      scrollTrigger: { trigger: h, start: 'top 85%', once: true } });
  });

  // pinned sunrise (CSS sticky frame, scroll progress drives it)
  renderSunrise(0);
  ScrollTrigger.create({ trigger: '.sunrise', start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: function (st) { renderSunrise(st.progress); } });

  // card stack: previous card recedes as the next one slides over it
  var cards = $$('.card');
  cards.forEach(function (c, i) {
    if (i === cards.length - 1) return;
    var next = cards[i + 1];
    // dim only once the next card actually starts to cover this one
    gsap.to(c, { scale: 0.95, '--dim': 0.3, ease: 'none',
      scrollTrigger: { trigger: next, start: function () { return 'top ' + (c.offsetHeight * 0.9 + parseFloat(getComputedStyle(c).top)) + 'px'; },
        end: 'top 25%', scrub: true, invalidateOnRefresh: true } });
  });
  // draw-on curve in first card
  var draw = $('.draw');
  if (draw) {
    var len = draw.getTotalLength();
    gsap.fromTo(draw, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, ease: 'none',
      scrollTrigger: { trigger: '.c1', start: 'top 80%', end: 'top 30%', scrub: true } });
  }

  addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
