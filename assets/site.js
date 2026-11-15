(() => {
  "use strict";
  const d = document, root = d.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) root.classList.add("reduce");
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* nav */
  const nav = d.getElementById("nav"), burger = d.getElementById("burger");
  const onNav = () => nav.classList.toggle("scrolled", scrollY > 8);
  burger.addEventListener("click", () => {
    const o = nav.classList.toggle("open");
    burger.setAttribute("aria-expanded", o); burger.setAttribute("aria-label", o ? "Menü schließen" : "Menü öffnen");
  });
  d.querySelectorAll(".nav-links a").forEach(a => a.addEventListener("click", () => { nav.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); }));

  /* reveal */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -8% 0px", threshold: .12 });
  d.querySelectorAll(".rv").forEach((el, i) => {
    const sib = el.parentElement ? [...el.parentElement.children].filter(c => c.classList.contains("rv")) : [];
    const k = sib.indexOf(el);
    if (k > 0 && sib.length > 2) el.style.transitionDelay = Math.min(k * 70, 350) + "ms";
    io.observe(el);
  });

  /* count up */
  const fmt = new Intl.NumberFormat("de-DE");
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, to = +el.dataset.to; if (reduce) return;
    const t0 = performance.now(), dur = 1400 + Math.min(to, 600);
    const step = t => { const p = clamp((t - t0) / dur), q = 1 - Math.pow(1 - p, 4); el.textContent = fmt.format(Math.round(to * q)); if (p < 1) requestAnimationFrame(step); };
    el.textContent = "0"; requestAnimationFrame(step);
  }), { threshold: .6 });
  d.querySelectorAll(".cnt").forEach(el => cio.observe(el));

  /* reel: lazy load, then duplicate for loop */
  const reelIO = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; reelIO.unobserve(e.target); e.target.querySelectorAll("img[data-src]").forEach(i => { i.src = i.dataset.src; i.removeAttribute("data-src"); }); }), { rootMargin: "600px 0px" });
  d.querySelectorAll(".reel").forEach(r => reelIO.observe(r));
  /* reel loop: duplicate */
  d.querySelectorAll(".reel-track").forEach(t => { [...t.children].forEach(c => { const n = c.cloneNode(true); n.alt = ""; n.setAttribute("aria-hidden", "true"); t.appendChild(n); }); });

  if (reduce) { d.querySelectorAll(".mf span,.blip,.crit,.m-ok").forEach(s => s.classList.add("on")); const rd = d.getElementById("radar"); rd.classList.add("s1", "s2", "s3"); rd.style.setProperty("--s2", 1); addEventListener("scroll", onNav, { passive: true }); onNav(); return; }

  /* scroll-driven scenes */
  const hero = d.querySelector(".hero"), fan = d.getElementById("fan");
  const mfWords = [...d.querySelectorAll("#mf span:not(.br)")];
  const manifest = d.getElementById("manifest"), radar = d.getElementById("radar"), tausch = d.getElementById("tausch");
  const blips = [...radar.querySelectorAll(".blip")];
  const crits = [...tausch.querySelectorAll(".crit")], mok = tausch.querySelector(".m-ok");
  const prog = el => { const r = el.getBoundingClientRect(), h = r.height - innerHeight; return h > 0 ? clamp(-r.top / h) : clamp(1 - r.top / innerHeight); };
  let ticking = false;
  const frame = () => {
    ticking = false; onNav();
    // hero: cards spread + tilt flatten
    const hr = hero.getBoundingClientRect(), hp = clamp(-hr.top / (hr.height * .7));
    fan.style.setProperty("--hp", hp.toFixed(3));
    fan.style.setProperty("--sp", (1 + hp * .55).toFixed(3));
    // manifest words
    const mp = prog(manifest), n = mfWords.length, lit = Math.floor(clamp((mp - .08) / .72) * (n + .001));
    mfWords.forEach((w, i) => w.classList.toggle("on", i < lit));
    // radar steps
    const rp = prog(radar);
    blips.forEach((b, i) => b.classList.toggle("on", rp > .02 + i * .035));
    radar.classList.add("s1");
    radar.classList.toggle("s2", rp >= .34); radar.classList.toggle("s3", rp >= .66);
    radar.style.setProperty("--s2", rp >= .34 ? 1 : 0);
    // tausch
    const tp = prog(tausch);
    tausch.style.setProperty("--p2", clamp((tp - .05) / .5).toFixed(3));
    crits.forEach((c, i) => c.classList.toggle("on", tp > .12 + i * .09));
    mok.classList.toggle("on", tp > .62);
  };
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener("scroll", req, { passive: true }); addEventListener("resize", req); frame();

  /* pointer tilt + holo */
  if (fine) {
    const stage = d.getElementById("heroStage");
    hero.addEventListener("pointermove", e => {
      const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
      fan.style.setProperty("--ry", (x * 14).toFixed(2) + "deg"); fan.style.setProperty("--rx", (-y * 8).toFixed(2) + "deg");
    });
    hero.addEventListener("pointerleave", () => { fan.style.setProperty("--ry", "0deg"); fan.style.setProperty("--rx", "0deg"); });
    d.querySelectorAll(".tilt").forEach(c => {
      c.addEventListener("pointermove", e => {
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.setProperty("--ry", ((x - .5) * 22).toFixed(2) + "deg"); c.style.setProperty("--rx", ((.5 - y) * 22).toFixed(2) + "deg");
        c.style.setProperty("--mx", (x * 100).toFixed(1) + "%"); c.style.setProperty("--my", (y * 100).toFixed(1) + "%"); c.classList.add("live");
      });
      c.addEventListener("pointerleave", () => { c.style.setProperty("--ry", "0deg"); c.style.setProperty("--rx", "0deg"); c.classList.remove("live"); });
    });
    d.querySelectorAll(".tile").forEach(t => t.addEventListener("pointermove", e => {
      const r = t.getBoundingClientRect(); t.style.setProperty("--gx", (e.clientX - r.left) + "px"); t.style.setProperty("--gy", (e.clientY - r.top) + "px");
    }));
  }

  /* starfield */
  const cv = d.getElementById("stars"), ctx = cv.getContext("2d");
  let W, H, stars = [], run = true, dpr = Math.min(devicePixelRatio || 1, 2);
  const init = () => {
    W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(W * H / 5200);
    stars = Array.from({ length: count }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.1 + .2, a: Math.random(), s: Math.random() * .015 + .004, v: Math.random() * .12 + .02, c: Math.random() < .18 ? (Math.random() < .5 ? "46,230,255" : "155,107,255") : "255,255,255" }));
  };
  const draw = () => {
    if (!run) return;
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      s.a += s.s; s.y -= s.v; if (s.y < -2) { s.y = H + 2; s.x = Math.random() * W; }
      const al = .25 + Math.abs(Math.sin(s.a)) * .75;
      ctx.fillStyle = `rgba(${s.c},${al.toFixed(3)})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    }
    requestAnimationFrame(draw);
  };
  init();
  new IntersectionObserver(es => { const v = es[0].isIntersecting; if (v && !run) { run = true; requestAnimationFrame(draw); } else if (!v) run = false; }).observe(cv);
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(init, 150); });
  d.addEventListener("visibilitychange", () => { if (d.hidden) run = false; else if (!run) { run = true; requestAnimationFrame(draw); } });
  requestAnimationFrame(draw);
})();
