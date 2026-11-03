/* Ammoha motion layer: GSAP + ScrollTrigger + Lenis, applied on top of the existing React-style (DC) site.
   Rules: never wraps or moves elements the site renders (no pin-spacers, no text splitting of dynamic text),
   so the site's own re-rendering stays intact. Everything is optional: without GSAP the site works unchanged. */
(function () {
  'use strict';
  var w = window, d = document, de = d.documentElement;
  if (!w.gsap || !w.ScrollTrigger) return;
  var gsap = w.gsap, ST = w.ScrollTrigger;
  gsap.registerPlugin(ST);
  var reduce = false, fine = false;
  try { reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches; fine = w.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) { /* ignore */ }
  de.classList.add('mo');
  if (reduce) { de.classList.add('mo-reduce'); }

  /* ---- loader: once per session, never blocks the shop ---- */
  var seen = false;
  try { seen = w.sessionStorage.getItem('mo-seen') === '1'; w.sessionStorage.setItem('mo-seen', '1'); } catch (e) { /* ignore */ }
  var t0 = Date.now();
  function endLoader() {
    if (!de.classList.contains('mo-load')) return;
    var wait = Math.max(0, 900 - (Date.now() - t0));
    setTimeout(function () {
      de.classList.add('mo-out');
      setTimeout(function () { de.classList.remove('mo-load', 'mo-out'); }, 900);
    }, wait);
  }
  if (!reduce && !seen) {
    de.classList.add('mo-load');
    setTimeout(endLoader, 3500);
    d.addEventListener('DOMContentLoaded', function () { var tries = 0; (function chk() { if (d.querySelector('.am-hero') || tries++ > 40) endLoader(); else setTimeout(chk, 100); })(); });
  }

  /* ---- smooth scrolling (desktop pointers only) ---- */
  var lenis = null;
  if (!reduce && fine && w.Lenis) {
    try {
      lenis = new w.Lenis({ duration: 1.05, smoothWheel: true });
      lenis.on('scroll', ST.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } catch (e) { lenis = null; }
  }

  /* ---- custom cursor + magnetic buttons (desktop pointers only) ---- */
  if (fine && !reduce) {
    var cur = d.createElement('div'); cur.className = 'mo-cursor'; cur.innerHTML = '<i></i><b></b>';
    var boot = function () { if (d.body) d.body.appendChild(cur); else setTimeout(boot, 50); }; boot();
    var cx = gsap.quickTo(cur, 'x', { duration: .25, ease: 'power3' }), cy = gsap.quickTo(cur, 'y', { duration: .25, ease: 'power3' });
    var label = cur.querySelector('b'), mag = null;
    d.addEventListener('pointermove', function (e) {
      cx(e.clientX); cy(e.clientY); cur.classList.add('on');
      var t = e.target && e.target.closest ? e.target : null;
      var hot = t && t.closest('a,button,[role=button],input,select,textarea,summary,.disc__row,[data-cursor]');
      cur.classList.toggle('hot', !!hot);
      var lab = t && t.closest('[data-cursor]'); label.textContent = lab ? lab.getAttribute('data-cursor') : '';
      cur.classList.toggle('lab', !!lab);
      var m = t && t.closest('.am-hero .am-btn, .mag');
      if (m !== mag) { if (mag) gsap.to(mag, { x: 0, y: 0, duration: .5, ease: 'elastic.out(1,.5)' }); mag = m; }
      if (mag) { var r = mag.getBoundingClientRect(); gsap.to(mag, { x: (e.clientX - r.left - r.width / 2) * .22, y: (e.clientY - r.top - r.height / 2) * .3, duration: .3, ease: 'power3.out' }); }
    }, { passive: true });
    d.addEventListener('pointerleave', function () { cur.classList.remove('on'); });
    /* floating product preview for the discovery list */
    var prev = d.createElement('div'); prev.className = 'disc__prev'; prev.innerHTML = '<img alt="">';
    var pimg = prev.querySelector('img'), px = gsap.quickTo(prev, 'x', { duration: .45, ease: 'power3' }), py = gsap.quickTo(prev, 'y', { duration: .45, ease: 'power3' });
    var boot2 = function () { if (d.body) d.body.appendChild(prev); else setTimeout(boot2, 50); }; boot2();
    d.addEventListener('pointermove', function (e) { if (prev.classList.contains('on')) { px(e.clientX); py(e.clientY); } }, { passive: true });
    d.addEventListener('pointerover', function (e) {
      var row = e.target && e.target.closest ? e.target.closest('.disc__row') : null;
      if (row) { var s = row.getAttribute('data-img'); if (s && pimg.getAttribute('src') !== s) pimg.setAttribute('src', s); prev.classList.add('on'); }
      else prev.classList.remove('on');
    });
  }


  /* ---- 3D tilt on product cards, cursor-driven depth in the product universe (fine pointers) ---- */
  if (fine && !reduce) {
    var tiltEl = null;
    d.addEventListener('pointermove', function (e) {
      var t = e.target && e.target.closest ? e.target : null;
      var card = t && t.closest('.pc');
      if (tiltEl && tiltEl !== card) { tiltEl.style.setProperty('--rx', '0deg'); tiltEl.style.setProperty('--ry', '0deg'); tiltEl.style.setProperty('--tx', '0px'); tiltEl.style.setProperty('--ty', '0px'); tiltEl = null; }
      if (card) {
        var r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        card.style.setProperty('--rx', (-py * 9).toFixed(2) + 'deg'); card.style.setProperty('--ry', (px * 11).toFixed(2) + 'deg');
        card.style.setProperty('--tx', (px * -10).toFixed(1) + 'px'); card.style.setProperty('--ty', (py * -10).toFixed(1) + 'px');
        tiltEl = card;
      }
      var st = t && t.closest('.uni__stage');
      if (st) { var q = st.getBoundingClientRect(); st.style.setProperty('--mx', (((e.clientX - q.left) / q.width - .5) * 2).toFixed(3)); st.style.setProperty('--my', (((e.clientY - q.top) / q.height - .5) * 2).toFixed(3)); }
    }, { passive: true });
  }

  /* ---- reading progress on blog articles ---- */
  var rp = null, rpOn = false;
  function progress() {
    var art = d.querySelector('.alay');
    if (!art) { if (rp) { rp.remove(); rp = null; } return; }
    if (!rp) { rp = d.createElement('div'); rp.className = 'rp'; rp.setAttribute('role', 'progressbar'); rp.setAttribute('aria-label', 'Reading progress'); rp.innerHTML = '<i></i>'; d.body.appendChild(rp); }
    var r = art.getBoundingClientRect(), total = r.height - w.innerHeight * .6, p = Math.min(1, Math.max(0, (-r.top + w.innerHeight * .2) / Math.max(1, total)));
    rp.firstChild.style.transform = 'scaleX(' + p.toFixed(4) + ')'; rp.setAttribute('aria-valuenow', Math.round(p * 100));
  }
  w.addEventListener('scroll', function () { if (!rpOn) { rpOn = true; w.requestAnimationFrame(function () { rpOn = false; progress(); }); } }, { passive: true });

  /* ---- scroll storytelling ---- */
  var done = new WeakSet(), mobile = w.innerWidth < 900;

  function setup(el) {
    if (done.has(el)) return; done.add(el);
    var kind = el.getAttribute('data-mo');
    if (kind === 'words') {
      var words = el.querySelectorAll('.mf__w');
      if (reduce) { gsap.set(words, { opacity: 1 }); return; }
      gsap.set(words, { opacity: .16 });
      gsap.to(words, { opacity: 1, stagger: .12, ease: 'none',
        scrollTrigger: { trigger: el, start: mobile ? 'top 75%' : 'top 15%', end: mobile ? 'bottom 55%' : 'bottom bottom', scrub: .6 } });
    } else if (kind === 'lines') {
      var inner = el.querySelectorAll('.w > span');
      if (reduce) return;
      gsap.set(inner, { yPercent: 110 });
      gsap.to(inner, { yPercent: 0, duration: 1, stagger: .06, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    } else if (kind === 'hscroll') {
      if (mobile || reduce) return;
      var track = el.querySelector('.hs__track'), wrap = el;
      var dist = function () { return Math.max(0, track.scrollWidth - w.innerWidth + 80); };
      var set = function () { wrap.style.setProperty('--hs', dist() + 'px'); }; set();
      gsap.to(track, { x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: { trigger: wrap, start: 'top top', end: 'bottom bottom', scrub: .5, invalidateOnRefresh: true, onRefresh: set } });
    } else if (kind === 'parallax') {
      if (reduce) return;
      var sp = parseFloat(el.getAttribute('data-speed') || '12');
      gsap.fromTo(el, { yPercent: -sp }, { yPercent: sp, ease: 'none', scrollTrigger: { trigger: el.parentElement || el, start: 'top bottom', end: 'bottom top', scrub: true } });
    } else if (kind === 'marquee') {
      if (reduce) return;
      gsap.fromTo(el, { xPercent: 4 }, { xPercent: -34, ease: 'none', scrollTrigger: { trigger: el.parentElement || el, start: 'top bottom', end: 'bottom top', scrub: .8 } });
    } else if (kind === 'reveal') {
      if (reduce) return;
      gsap.from(el, { y: 36, opacity: 0, duration: .9, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    } else if (kind === 'clip') {
      if (reduce) return;
      gsap.fromTo(el, { clipPath: 'inset(12% 8% 12% 8% round 6px)', scale: 1.08 }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', scale: 1, duration: 1.2, ease: 'power3.out', clearProps: 'clipPath,transform', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    }
  }

  var AUTO = '.am-sec-head, .cx-head, .pstory__in, .pben__g, .pfaq__in, .cx-shade__in, .cx-eyes__in, .cx-phil__in, .cx-blog__grid, .cx-news__in, .story, .ab-sec, .faq__h, .promo2, .am-tiles, .reels, .ft__grid';
  function scan() {
    /* drop triggers whose elements the site has already removed */
    ST.getAll().forEach(function (t) { var tr = t.trigger; if (tr && tr.isConnected === false) t.kill(); });
    d.querySelectorAll('[data-mo]').forEach(setup);
    d.querySelectorAll(AUTO).forEach(function (el) { if (!el.hasAttribute('data-mo')) { el.setAttribute('data-mo', 'reveal'); setup(el); } });
    /* product cards: staggered batch, hover transforms stay intact */
    if (!reduce) {
      var cards = [].filter.call(d.querySelectorAll('.gridv .pc, .cols-4 .pc, .cols-3 .pc'), function (c) { return !done.has(c); });
      cards.forEach(function (c) { done.add(c); });
      if (cards.length) { gsap.set(cards, { opacity: 0, y: 28 }); ST.batch(cards, { start: 'top 92%', once: true, onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, stagger: .07, duration: .7, ease: 'power3.out', clearProps: 'transform,opacity' }); } }); }
    }
    /* keep the smooth scroller out of panels that scroll themselves */
    d.querySelectorAll('.am-drawer,.ldrawer,.vbox,.dsel__menu,.gal__thumbs').forEach(function (e) { if (!e.hasAttribute('data-lenis-prevent')) e.setAttribute('data-lenis-prevent', ''); });
    progress();
    ST.refresh();
  }

  /* ---- page transitions: soft fade when the site changes page ---- */
  var lastSig = '';
  function sig() { var pg = d.querySelector('.pg'); if (!pg) return ''; return [].slice.call(pg.children, 0, 6).map(function (c) { return (c.className || '') + '|' + (c.children && c.children[0] ? c.children[0].className : ''); }).join(';'); }

  var timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      var s = sig();
      if (s !== lastSig) {
        var first = lastSig === ''; lastSig = s;
        
      }
      scan();
    }, 140);
  }
  function start() {
    var root = d.getElementById('dc-root') || d.body;
    new MutationObserver(function () { routeCheck(); schedule(); }).observe(root, { childList: true, subtree: true });
    schedule();
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();


  /* =================== Ammoha cinematic layer =================== */
  /* route curtain: covers the swap, then lifts to reveal the new page */
  var routeSigPrev = null, curtainTl = null, titlePrev = '';
  function routeSig() {
    var pg = d.querySelector('.pg'); if (!pg) return '';
    var el = [].slice.call(pg.children).filter(function (c) { return /^(cx-hero|cl-hero|pd|bhero|ahero|ab-hero|acct-hero|co|empty)/.test(c.className || '') || c.tagName === 'ARTICLE' || c.tagName === 'SECTION'; })[0];
    return el ? (el.className || '').split(' ')[0] : '';
  }
  function routeCheck() {
    var cur = routeSig(), t = d.title || '';
    if (routeSigPrev === null) { routeSigPrev = cur; titlePrev = t; return; }
    var changed = cur !== routeSigPrev || t !== titlePrev;
    routeSigPrev = cur; titlePrev = t;
    if (!changed || reduce || de.classList.contains('mo-load')) return;
    /* soft in-place entrance: no full-screen cover, header and footer stay put */
    var pg = d.querySelector('.pg'); if (!pg) return;
    var main = [].filter.call(pg.children, function (c) { return !/(^|\s)(am-bar|am-header|am-scrim|ldrawer|am-drawer|ft|sov|qv|am-toast|totop|vbox)(\s|$)/.test(c.className || '') && c.tagName !== 'ASIDE'; });
    if (Date.now() - (routeCheck.at || 0) < 900) return; routeCheck.at = Date.now();
    if (curtainTl) curtainTl.kill();
    curtainTl = gsap.fromTo(main, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .45, ease: 'power2.out', clearProps: 'opacity,transform' });
  }

  /* header hides on scroll down, returns on scroll up; sticky bars sit just under it */
  function hdrOff() { var h = d.querySelector('.am-header'); if (!h) return; de.style.setProperty('--hdr-off', h.classList.contains('is-hidden') ? '0px' : Math.round(h.getBoundingClientRect().height) + 'px'); }
  setInterval(hdrOff, 600); w.addEventListener('resize', hdrOff);
  var lastY = 0, hdr = null;
  w.addEventListener('scroll', function () {
    hdr = hdr || d.querySelector('.am-header'); if (!hdr) return;
    var y = w.pageYOffset || de.scrollTop || 0;
    if (y > lastY + 6 && y > 320) hdr.classList.add('is-hidden'); else if (y < lastY - 6 || y < 120) hdr.classList.remove('is-hidden');
    hdrOff();
    lastY = y;
  }, { passive: true });

  /* add to bag: the product flies to the bag, the count bumps; wishlist hearts burst */
  function bagBtn() { var all = d.querySelectorAll('.am-header__right .am-icon-btn'); return all[2] || all[all.length - 1]; }
  d.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-fly]') : null;
    if (t && t.getAttribute('aria-disabled') !== 'true') {
      var host = t.closest('.pc, .pbuy, .qv__box, .lab, .cx-eyes, .cx-shade, .pstick, .mshade') || t;
      var im = host.querySelector('.pc__img, .qv__art img, .lab__img.on, .mshade__img img') || d.querySelector('.pd .pgal__f.on');
      var r = (im || t).getBoundingClientRect(), tgt = bagBtn(), tr = tgt ? tgt.getBoundingClientRect() : { left: w.innerWidth - 60, top: 20, width: 20, height: 20 };
      t.classList.add('is-added'); setTimeout(function () { t.classList.remove('is-added'); }, 900);
      if (!reduce) {
        var f = d.createElement('div'); f.className = 'mo-fly';
        if (im && im.tagName === 'IMG') f.style.backgroundImage = 'url("' + (im.currentSrc || im.src) + '")'; else if (im) f.style.backgroundImage = im.style.backgroundImage;
        d.body.appendChild(f);
        var sx = r.left + r.width / 2 - 28, sy = r.top + r.height / 2 - 28, ex = tr.left + tr.width / 2 - 28, ey = tr.top + tr.height / 2 - 28;
        gsap.fromTo(f, { x: sx, y: sy, scale: 1, opacity: 1 }, { x: ex, y: ey, scale: .25, duration: .85, ease: 'power3.in', onComplete: function () {
          f.remove(); d.querySelectorAll('.am-header .am-count').forEach(function (n) { n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump'); });
        } });
      }
    }
    var wbtn = e.target && e.target.closest ? e.target.closest('.wishbtn') : null;
    if (wbtn && !reduce) {
      var wr = wbtn.getBoundingClientRect(), n = 9;
      for (var i = 0; i < n; i++) {
        var p = d.createElement('i'); p.className = 'mo-burst'; d.body.appendChild(p);
        var a = (i / n) * Math.PI * 2, dist = 26 + Math.random() * 16, cx0 = wr.left + wr.width / 2 - 4, cy0 = wr.top + wr.height / 2 - 4;
        gsap.fromTo(p, { x: cx0, y: cy0, scale: 1, opacity: 1 }, { x: cx0 + Math.cos(a) * dist, y: cy0 + Math.sin(a) * dist, scale: 0, opacity: 0, duration: .7, ease: 'power2.out', onComplete: (function (q) { return function () { q.remove(); }; })(p) });
      }
    }
  }, true);

  /* product gallery: pointer lens zoom on desktop, swipe on touch */
  var swipeX = null;
  d.addEventListener('pointermove', function (e) {
    var st = e.target && e.target.closest ? e.target.closest('.pgal__stage') : null;
    if (!st || !fine || reduce || e.pointerType === 'touch') return;
    var r = st.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * 100, py = (e.clientY - r.top) / r.height * 100;
    st.style.setProperty('--zx', px.toFixed(1) + '%'); st.style.setProperty('--zy', py.toFixed(1) + '%');
    var main = st.parentElement; if (main) { main.style.setProperty('--mx', px.toFixed(1) + '%'); main.style.setProperty('--my', py.toFixed(1) + '%'); }
  }, { passive: true });
  d.addEventListener('touchstart', function (e) { var st = e.target && e.target.closest ? e.target.closest('.pgal__stage') : null; swipeX = st ? e.touches[0].clientX : null; }, { passive: true });
  d.addEventListener('touchend', function (e) {
    if (swipeX === null) return; var dx = e.changedTouches[0].clientX - swipeX; swipeX = null;
    if (Math.abs(dx) < 46) return;
    var g = d.querySelector('.pgal'), b = g && g.querySelector(dx < 0 ? '.pgal__nav--r' : '.pgal__nav--l'); if (b) b.click();
  }, { passive: true });

  /* worlds accordion: the hovered panel leads */
  d.addEventListener('pointerover', function (e) {
    var row = e.target && e.target.closest ? e.target.closest('.cx-worlds__row') : null;
    d.querySelectorAll('.cx-worlds__row').forEach(function (r) { r.classList.toggle('has-hover', r === row); });
  });

  /* headline reveal on entry */
  function headlines() {
    if (reduce) return;
    d.querySelectorAll('.cl-hero__h:not([data-rv]), .pbuy__h:not([data-rv]), .cx-h2:not([data-rv])').forEach(function (el) {
      el.setAttribute('data-rv', '1');
      gsap.fromTo(el, { y: 44, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'power4.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: el, start: 'top 94%', once: true } });
    });
  }
  var hlTimer; new MutationObserver(function () { clearTimeout(hlTimer); hlTimer = setTimeout(headlines, 180); }).observe(d.documentElement, { childList: true, subtree: true });

  var rt = null, wasMobile = mobile;
  w.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var m = w.innerWidth < 900;
      if (m !== wasMobile) { wasMobile = m; mobile = m; ST.getAll().forEach(function (t) { t.kill(); }); done = new WeakSet(); d.querySelectorAll('[data-mo]').forEach(function (e) { e.style.cssText = e.style.cssText; }); }
      schedule();
    }, 250);
  });
  w.addEventListener('load', function () { setTimeout(function () { ST.refresh(); }, 600); });
})();
