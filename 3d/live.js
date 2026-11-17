/* Kopie von assets/site.js für die Testseite /3d/ (Hero entfernt -> Null-Schutz, stats.json-Fallback ../). */
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

  /* live stats + count up */
  const fmt = new Intl.NumberFormat("de-DE");
  const STATS_URLS = [
    "https://raw.githubusercontent.com/PullTopia/pulltopia/live-stats/stats.json",
    new URL("../stats.json", location.href).href
  ];
  const STATS_LS = "pt-site-stats-v1";
  const COUNTRY_ORDER = ["DE", "AT", "CH", "NL", "BE"];
  const validStats = (s) => {
    if (!s || s.version !== 1 || !s.metrics) return null;
    const m = s.metrics, need = ["dropsDetected", "restocksDetected", "backdropsDetected", "shopsLive", "signalsLive", "freeDelayMin"];
    if (need.some(k => !Number.isFinite(m[k]))) return null;
    return s;
  };
  const countryKeys = (by) => {
    if (!by || typeof by !== "object") return [];
    return [...COUNTRY_ORDER.filter(c => by[c] > 0), ...Object.keys(by).filter(c => !COUNTRY_ORDER.includes(c) && by[c] > 0).sort()];
  };
  const countryLine = (by) => countryKeys(by).map(c => fmt.format(by[c]) + " " + c).join(" · ");
  const countryList = (by) => {
    const keys = countryKeys(by);
    if (!keys.length) return "";
    if (keys.length === 1) return keys[0];
    if (keys.length === 2) return keys[0] + " und " + keys[1];
    return keys.slice(0, -1).join(", ") + " und " + keys[keys.length - 1];
  };
  const agoText = (iso) => {
    const ts = Date.parse(iso);
    if (!Number.isFinite(ts)) return "";
    const min = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (min < 1) return "gerade eben";
    if (min < 60) return "vor " + min + " Min";
    const h = Math.round(min / 60);
    if (h < 24) return "vor " + h + " Std.";
    const days = Math.round(h / 24);
    return "vor " + days + " Tag" + (days === 1 ? "" : "en");
  };
  const setCnt = (name, val) => {
    const el = d.querySelector('[data-stat-count="' + name + '"]');
    if (el && Number.isFinite(val)) { el.dataset.to = String(val); el.textContent = fmt.format(Math.round(val)); }
  };
  const applyStats = (s, live) => {
    const m = s.metrics;
    setCnt("drops", m.dropsDetected);
    if (Number.isFinite(m.premiumMedianSec)) setCnt("premium-median", Math.round(m.premiumMedianSec));
    setCnt("free-delay", m.freeDelayMin);
    setCnt("shops", m.shopsLive);
    setCnt("restocks", m.restocksDetected);
    setCnt("backdrops", m.backdropsDetected);
    const sig = d.querySelector('[data-stat-em="signals"]');
    if (sig && Number.isFinite(m.signalsLive)) sig.textContent = "+" + fmt.format(m.signalsLive);
    const dropsNote = d.querySelector('[data-stat-note="drops"]');
    if (dropsNote && s.countingSinceLabel) dropsNote.textContent = "seit Start der Aufzeichnung · " + s.countingSinceLabel + " (Europe/Berlin)";
    const premNote = d.querySelector('[data-stat-note="premium-median"]');
    if (premNote && Number.isFinite(m.premiumMedianSec) && Number.isFinite(m.premiumMedianN)) {
      premNote.textContent = "n = " + fmt.format(m.premiumMedianN) + " · Median " + fmt.format(m.premiumMedianSec) + " s · interne Verarbeitungszeit, nicht ab Shop-Veröffentlichung";
    }
    const freeNote = d.querySelector('[data-stat-note="free-delay"]');
    if (freeNote && Number.isFinite(m.freeMedianMin)) {
      const early = m.freeEarly === 0
        ? "keiner vor Ablauf der " + m.freeDelayMin + " Minuten"
        : fmt.format(m.freeEarly) + " vor Ablauf der " + m.freeDelayMin + " Minuten";
      freeNote.textContent = "gemessen: Median " + fmt.format(m.freeMedianMin) + " Min · " + early;
    }
    const shopNote = d.querySelector('[data-stat-note="shops"]');
    const cl = countryLine(m.shopsByCountry);
    if (shopNote && cl) shopNote.textContent = cl;
    const radarShops = d.querySelector('[data-stat-text="radar-shops"]');
    if (radarShops && Number.isFinite(m.shopsLive)) radarShops.textContent = fmt.format(m.shopsLive) + " Shops";
    const radarSig = d.querySelector('[data-stat-text="radar-signals"]');
    if (radarSig && Number.isFinite(m.signalsLive)) radarSig.textContent = fmt.format(m.signalsLive) + " Signalquellen";
    const radarCo = d.querySelector('[data-stat-text="radar-countries"]');
    const list = countryList(m.shopsByCountry);
    if (radarCo && list) radarCo.textContent = list;
    const badge = d.getElementById("zahlen-live");
    const ago = d.getElementById("zahlen-ago");
    const fresh = Number.isFinite(Date.parse(s.generatedAt)) && (Date.now() - Date.parse(s.generatedAt) < 2 * 3600000);
    if (badge) {
      const show = !!(live && fresh);
      badge.hidden = !show;
      if (show && ago) ago.textContent = agoText(s.generatedAt);
    }
  };
  const fetchOne = (url, ms) => {
    const ac = new AbortController();
    const tmr = setTimeout(() => ac.abort(), ms);
    return fetch(url, { cache: "no-store", signal: ac.signal, headers: { Accept: "application/json" } })
      .then(r => { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .finally(() => clearTimeout(tmr));
  };
  const loadLiveStats = () => (async () => {
    for (const url of STATS_URLS) {
      try {
        const s = validStats(await fetchOne(url, 2500));
        if (!s) continue;
        applyStats(s, true);
        try { localStorage.setItem(STATS_LS, JSON.stringify(s)); } catch (e) {}
        return;
      } catch (e) {}
    }
    try {
      const s = validStats(JSON.parse(localStorage.getItem(STATS_LS) || ""));
      if (s) { applyStats(s, false); return; }
    } catch (e) {}
  })();
  const statsReady = loadLiveStats();

  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target;
    const run = () => {
      const to = +el.dataset.to;
      if (!Number.isFinite(to)) return;
      if (reduce) { el.textContent = fmt.format(Math.round(to)); return; }
      const t0 = performance.now(), dur = 1400 + Math.min(to, 600);
      const step = t => { const p = clamp((t - t0) / dur), q = 1 - Math.pow(1 - p, 4); el.textContent = fmt.format(Math.round(to * q)); if (p < 1) requestAnimationFrame(step); };
      el.textContent = "0"; requestAnimationFrame(step);
    };
    Promise.race([statsReady, new Promise(r => setTimeout(r, 2500))]).then(run, run);
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
    if (hero && fan) { const hr = hero.getBoundingClientRect(), hp = clamp(-hr.top / (hr.height * .7));
    fan.style.setProperty("--hp", hp.toFixed(3));
    fan.style.setProperty("--sp", (1 + hp * .55).toFixed(3)); }
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
    if (hero && fan) hero.addEventListener("pointermove", e => {
      const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
      fan.style.setProperty("--ry", (x * 14).toFixed(2) + "deg"); fan.style.setProperty("--rx", (-y * 8).toFixed(2) + "deg");
    });
    if (hero && fan) hero.addEventListener("pointerleave", () => { fan.style.setProperty("--ry", "0deg"); fan.style.setProperty("--rx", "0deg"); });
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
  const cv = d.getElementById("stars"); if (!cv) return; const ctx = cv.getContext("2d");
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
