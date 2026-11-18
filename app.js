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
    caps.forEach(function (c, i) {
      var T = [0, 0.27, 0.53, 0.8, 1.01], a = T[i], z = T[i + 1], fadeIn = smooth(a - 0.02, a + 0.06, p), fadeOut = i === 3 ? 1 : 1 - smooth(z - 0.06, z, p);
      var o = i === 0 ? fadeOut : fadeIn * fadeOut;
      c.style.opacity = o;
      c.style.transform = 'translateY(' + ((1 - o) * 16) + 'px)';
    });
  }

  // pin the lamp to the nightstand: map a point in the photo's own pixels to the screen,
  // using the photo's real object-fit crop and transform, so it stays put at every size
  function placeOnStand() {
    var el = $('#onStand'), img = $('.l-photo .room'), layer = img.parentNode;
    // the lamp lives in its own layer above the wash; both layers fill the stage, so photo coordinates carry over
    if (!el || !img.naturalWidth) return;
    var W = img.offsetWidth, H = img.offsetHeight, nw = img.naturalWidth, nh = img.naturalHeight;
    var k = Math.max(W / nw, H / nh), dw = nw * k, dh = nh * k;
    var pos = getComputedStyle(img).objectPosition.split(' ').map(parseFloat);
    var m = new DOMMatrixReadOnly(getComputedStyle(img).transform);
    var x = (W - dw) * pos[0] / 100 + (+el.dataset.x) * k;
    var y = (H - dh) * pos[1] / 100 + (+el.dataset.y) * k;
    x = W / 2 + m.a * (x - W / 2) + m.e; y = H / 2 + m.d * (y - H / 2) + m.f;
    var w = (+el.dataset.w) * k * m.a, h = w * 500 / 513;
    el.style.width = w + 'px';
    el.style.transform = 'translate(' + (x - w / 2) + 'px,' + (y - h * 0.97) + 'px)';
    el.classList.add('placed');
    layer.style.setProperty('--sx', (x / W * 100) + '%');
    layer.style.setProperty('--sy', ((y - h / 2) / H * 100) + '%');
  }
  var roomImg = $('.l-photo .room');
  if (roomImg.complete) placeOnStand(); else roomImg.addEventListener('load', placeOnStand);
  addEventListener('resize', placeOnStand);

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
  var lamp = $('#lamp'), glow = $('#wallGlow'), rings = $$('.ring'), hero = $('.hero-copy');
    ScrollTrigger.create({
    trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: function (st) {
      var p = st.progress, H = innerHeight;
      layers.forEach(function (o) {
        var y = -p * o.d * H * (o.el.classList.contains('l-fg') ? 0.5 : 0.55);
        o.el.style.transform = 'translate3d(0,' + y + 'px,0)';
      });
      lamp.style.filter = 'brightness(' + (1 + p * 0.45).toFixed(3) + ') drop-shadow(0 4px 6px rgba(0,0,0,.55))';
      glow.style.opacity = 0.75 + p * 0.25;
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
    gsap.to(c, { scale: 0.95, filter: 'brightness(.72)', ease: 'none',
      scrollTrigger: { trigger: next, start: 'top 85%', end: 'top 25%', scrub: true } });
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
