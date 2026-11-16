/* PullTopia v2 (16.11.2026): Discord-Szenen, Geheimkarte, Gründerzähler. Ohne Frameworks. */
(() => {
  "use strict";
  const d = document;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = new Intl.NumberFormat("de-DE");

  /* Gründerzähler: die Zahlen stehen nur im HTML (data-fc-free / data-fc-total), der Balken wird daraus berechnet. */
  d.querySelectorAll(".fc").forEach(fc => {
    const free = parseInt(fc.querySelector("[data-fc-free]")?.textContent, 10);
    const total = parseInt(fc.querySelector("[data-fc-total]")?.textContent, 10);
    const bar = fc.querySelector(".fc-bar i");
    if (bar && total > 0 && free >= 0) bar.style.width = Math.max(0, Math.min(100, (free / total) * 100)) + "%";
  });

  /* Geheimkarte: kurzes Aufblitzen bei Hover / Tap / Enter, nie voll aufgedeckt. */
  d.querySelectorAll(".secret").forEach(c => {
    let busy = false;
    const flash = () => {
      if (busy) return; busy = true;
      c.classList.add("flash");
      setTimeout(() => c.classList.remove("flash"), reduce ? 500 : 650);
      setTimeout(() => { busy = false; }, 1400);
    };
    c.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") flash(); });
    c.addEventListener("click", flash);
    c.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flash(); } });
  });

  /* Discord-Szenen: Schritte mit data-t (ms) werden nacheinander aktiviert, sobald die Szene sichtbar ist. */
  const scenes = [...d.querySelectorAll(".dc[data-scene]")];
  if (!scenes.length) return;

  const act = (el, instant) => {
    const k = el.dataset.k || "";
    if (k === "press") { el.classList.add("press"); if (!instant) setTimeout(() => el.classList.remove("press"), 420); return; }
    if (k === "shake") { el.classList.add("shake"); return; }
    if (k === "open") { el.classList.remove("shake"); el.classList.add("open"); return; }
    if (k === "off") { el.classList.add("off"); return; }
    el.classList.add("on");
    if (el.dataset.type != null) {
      const txt = el.dataset.type;
      if (instant) { el.textContent = txt; return; }
      let i = 0; el.textContent = "";
      const step = () => { el.textContent = txt.slice(0, ++i); if (i < txt.length) el._tm = setTimeout(step, 55); };
      step();
    }
    if (el.dataset.count != null) {
      const to = +el.dataset.count, from = +(el.dataset.from || 0);
      if (instant) { el.textContent = fmt.format(to); return; }
      const t0 = performance.now(), dur = +(el.dataset.dur || 1200);
      const f = t => { const p = Math.min(1, (t - t0) / dur), q = 1 - Math.pow(1 - p, 3); el.textContent = fmt.format(Math.round(from + (to - from) * q)); if (p < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    }
    if (el.dataset.w != null) el.style.width = el.dataset.w;
  };

  const reset = sc => {
    (sc._tm || []).forEach(clearTimeout); sc._tm = [];
    sc.classList.remove("done");
    sc.querySelectorAll("[data-t]").forEach(el => {
      clearTimeout(el._tm);
      el.classList.remove("on", "press", "shake", "open", "off");
      if (el.dataset.type != null) el.textContent = "";
      if (el.dataset.count != null) el.textContent = fmt.format(+(el.dataset.from || 0));
      if (el.dataset.w != null) el.style.width = "";
    });
  };

  const steps = sc => [...sc.querySelectorAll("[data-t]")].sort((a, b) => +a.dataset.t - +b.dataset.t);

  const finish = sc => { steps(sc).forEach(el => act(el, true)); sc.classList.add("done"); };

  const play = sc => {
    reset(sc);
    let last = 0;
    steps(sc).forEach(el => { const t = +el.dataset.t; last = Math.max(last, t); sc._tm.push(setTimeout(() => act(el, false), t)); });
    sc._tm.push(setTimeout(() => sc.classList.add("done"), last + 1200));
  };

  scenes.forEach(sc => {
    const b = d.createElement("button");
    b.type = "button"; b.className = "dc-replay"; b.textContent = "↻ Nochmal abspielen";
    b.addEventListener("click", () => (reduce ? finish(sc) : play(sc)));
    sc.appendChild(b);
    if (reduce) finish(sc); else reset(sc);
  });
  if (reduce) return;

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target); play(e.target);
  }), { threshold: .35 });
  scenes.forEach(sc => io.observe(sc));
})();
