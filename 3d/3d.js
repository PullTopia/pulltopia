/* PullTopia · 3D-Vorschau v4 (Testseite). Münze mit gekröntem P → Zoom in eine bildschirmfüllende, Discord-artige Oberfläche.
   Kanalstruktur = öffentliche Kanäle des echten Servers (channels.js), Chat-Inhalte = Beispiele mit fiktiven Namen.
   three.js r170 (nur für die Münze) + GSAP ScrollTrigger, lokal eingebunden. Keine fremden Server außer der eigenen stats.json auf GitHub. */
import * as THREE from "./vendor/three.module.min.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";
import { CATS } from "./channels.js";

const d = document, root = d.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const forceStatic = /[?&]static\b/.test(location.search);
const forceNoGL = /[?&]nogl\b/.test(location.search);
const measure = /[?&]measure\b/.test(location.search); // nur für Timing-Messung: ohne Nachlauf, Vektor der scroll-gesteuerten Werte
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const $ = (s) => d.querySelector(s), $$ = (s) => [...d.querySelectorAll(s)];
const mkCanvas = (w, h) => { const c = d.createElement("canvas"); c.width = w; c.height = h; return c; };

/* Szenen: jedes Thema genau einmal, jeweils mit dem passenden echten Kanal */
const SC = [
  { k: "intro", ch: "🌌│willkommen" },
  { k: "drop", ch: "🚨│drop-alerts", t: "Drop- & Restock-Radar · Beta" },
  { k: "pc", ch: "🧭│start-hier", t: "Interessen & Pings" },
  { k: "news", ch: "⚡│pokemon-news", t: "News-Radar · rund um die Uhr" },
  { k: "cardverse", ch: "🃏│cardverse", t: "Cardverse First Edition" },
  { k: "trade", ch: "🔄│karten-tauschboerse", t: "Tauschbörse mit TradeMatch" },
  { k: "voice", ch: "🔊│Nexus Lounge 1", t: "Voice Nexus · Sprachzentrale" },
  { k: "rank", ch: "🏆│sammler-rangliste", t: "Live-Sammler-Rangliste" },
  { k: "creator", ch: "🤝│creator-nexus", t: "Creator Nexus" },
  { k: "numbers", ch: "🛰️│updates", t: "Hinter den Kulissen" },
  { k: "premium", ch: "⭐│mitgliedschaften", t: "PullTopia Premium" },
  { k: "join", ch: "🌌│willkommen", t: "Willkommen im Nexus" }
];
const N = SC.length;
root.style.setProperty("--n", N);
const SIDX = {}; SC.forEach((s, i) => { SIDX[s.k] = i; });
const isMobileVP = () => innerWidth < 761 || innerWidth / innerHeight < .8;


/* ---------------- Live-Zahlen (gleiche Quelle und Prüfung wie die Live-Seite) ---------------- */
const fmt = new Intl.NumberFormat("de-DE");
const STATS_URLS = ["https://raw.githubusercontent.com/PullTopia/pulltopia/live-stats/stats.json", new URL("../stats.json", location.href).href];
const STATS_LS = "pt-site-stats-v1";
const validStats = (s) => {
  if (!s || s.version !== 1 || !s.metrics) return null;
  const m = s.metrics;
  if (["dropsDetected", "restocksDetected", "backdropsDetected", "shopsLive", "signalsLive", "freeDelayMin"].some(k => !Number.isFinite(m[k]))) return null;
  return s;
};
const agoText = (iso) => {
  const ts = Date.parse(iso); if (!Number.isFinite(ts)) return "";
  const min = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (min < 1) return "· gerade eben"; if (min < 60) return "· vor " + min + " Min";
  const h = Math.round(min / 60); if (h < 24) return "· vor " + h + " Std."; const dd = Math.round(h / 24); return "· vor " + dd + " Tag" + (dd === 1 ? "" : "en");
};
const setN = (k, v, pre = "") => $$('[data-n="' + k + '"]').forEach(el => { el.dataset.to = v; el.dataset.pre = pre; el.textContent = pre + fmt.format(Math.round(v)); });
function applyStats(s, live) {
  const m = s.metrics;
  setN("drops", m.dropsDetected); setN("shops", m.shopsLive); setN("signals", m.signalsLive, "+");
  setN("restocks", m.restocksDetected); setN("backdrops", m.backdropsDetected);
  if (Number.isFinite(m.premiumMedianSec)) setN("premium", Math.round(m.premiumMedianSec));
  const since = $('[data-n="since"]'); if (since && s.countingSinceLabel) since.textContent = "Seit Start der Aufzeichnung · " + s.countingSinceLabel + " (Europe/Berlin). Keine Schätzwerte. Alerts sind Hinweise, keine Kaufgarantie.";
  const fresh = Number.isFinite(Date.parse(s.generatedAt)) && (Date.now() - Date.parse(s.generatedAt) < 2 * 3600000);
  const badge = $("#zahlen-live"); if (badge) { badge.hidden = !(live && fresh); $("#zahlen-ago").textContent = agoText(s.generatedAt); }
}
const fetchOne = (url, ms) => { const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms); return fetch(url, { cache: "no-store", signal: ac.signal, headers: { Accept: "application/json" } }).then(r => { if (!r.ok) throw new Error("http " + r.status); return r.json(); }).finally(() => clearTimeout(t)); };
(async () => {
  for (const url of STATS_URLS) {
    try { const s = validStats(await fetchOne(url, 2500)); if (!s) continue; applyStats(s, true); try { localStorage.setItem(STATS_LS, JSON.stringify(s)); } catch (e) {} return; } catch (e) {}
  }
  try { const s = validStats(JSON.parse(localStorage.getItem(STATS_LS) || "")); if (s) applyStats(s, false); } catch (e) {}
})();
let counted = false;
function countUp() {
  if (counted) return; counted = true;
  if (reduce) return;
  $$("[data-n]").forEach(el => {
    const to = +el.dataset.to; if (!Number.isFinite(to)) return; const pre = el.dataset.pre || "";
    const t0 = performance.now(), dur = 1200 + Math.min(to, 600);
    const step = t => { const p = clamp((t - t0) / dur), q = 1 - Math.pow(1 - p, 4); el.textContent = pre + fmt.format(Math.round(to * q)); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

/* ---------------- Kanalliste (Desktop) und Kanalleiste (iPhone) aus channels.js ---------------- */
const VOICE = new Set(); const rowEl = {}, chipEl = {};
function buildChannels() {
  const clIn = $("#clIn"), stripIn = $("#stripIn"), fr = d.createDocumentFragment(), fs = d.createDocumentFragment();
  CATS.forEach(([cat, rows]) => {
    const c = d.createElement("div"); c.className = "cat"; c.textContent = cat; fr.appendChild(c);
    const sep = d.createElement("span"); sep.className = "chip cs-sep"; sep.textContent = cat.replace(/^[^A-Za-zÄÖÜ]+/u, "").split(" · ")[0]; fs.appendChild(sep);
    rows.forEach(([name, voice]) => {
      if (voice) VOICE.add(name);
      const r = d.createElement("div"); r.className = "row";
      r.innerHTML = `<span class="ic">${voice ? "🔈" : "#"}</span><span></span>`; r.lastChild.textContent = name; fr.appendChild(r); rowEl[name] = r;
      if (name === "🔊│Nexus Lounge 1") {
        const v = d.createElement("div"); v.className = "vus"; v.id = "vus";
        v.innerHTML = '<div class="vu"><span class="av" style="--a:#ff5fd2">S</span>Sternenfuchs</div><div class="vu"><span class="av" style="--a:#30d158">N</span>Nebelpilot</div><div class="vu"><span class="av" style="--a:#4ea1ff">K</span>Kristallnova</div><div class="vu"><span class="av" style="--a:#5865f2">D</span>Du</div>';
        fr.appendChild(v);
      }
      const ch = d.createElement("span"); ch.className = "chip"; ch.textContent = (voice ? "🔈 " : "# ") + name; fs.appendChild(ch); chipEl[name] = ch;
    });
  });
  clIn.appendChild(fr); stripIn.appendChild(fs);
}

/* ---------------- Fallback ---------------- */
function goStatic() {
  root.classList.add("static", "loaded");
  // Chat-Szene jeweils über die passende Erklärung setzen
  $$(".cs").forEach(cs => {
    const k = cs.dataset.s, pn = $(`.ex .pn[data-s="${k}"]`); if (!pn) return;
    const box = d.createElement("div"); box.className = "sdc";
    const s = SC[SIDX[k]]; box.innerHTML = `<header class="ch"><span class="ch-ic">${VOICE.has(s.ch) ? "🔈" : "#"}</span><b></b><span class="bsp">BEISPIEL</span></header>`; box.querySelector("b").textContent = s.ch;
    box.appendChild(cs); pn.prepend(box);
  });
}
function webglOK() { try { const c = d.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (e) { return false; } }
function radialTex(size = 256, stops = [[0, "rgba(255,255,255,1)"], [1, "rgba(255,255,255,0)"]]) {
  const c = mkCanvas(size, size), x = c.getContext("2d"); const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col)); x.fillStyle = g; x.fillRect(0, 0, size, size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------------- Münze (WebGL, nur im Intro gerendert) ---------------- */
async function makeCoin(mobile) {
  const canvas = $("#gl");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(mobile ? 38 : 32, 1, .1, 80); camera.position.set(0, 0, 8);
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const loader = new THREE.TextureLoader();
  const loadTex = (src) => new Promise(res => loader.load(src, t => { t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, () => res(null)));
  const [logoT, fog1, fog2] = await Promise.all(["logo-400", "fog-1", "fog-2"].map(n => loadTex("../assets/img/" + n + ".webp")));
  scene.add(new THREE.AmbientLight(0xffffff, .25));
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(-3, 4, 5); scene.add(key);
  const l1 = new THREE.PointLight(0x2ee6ff, 26, 16, 2); l1.position.set(2.5, 1, 3); scene.add(l1);
  const l2 = new THREE.PointLight(0x9b6bff, 22, 16, 2); l2.position.set(-3, -1.5, 2); scene.add(l2);
  const PN = mobile ? 220 : 420, pos = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) { pos[i * 3] = (Math.random() - .5) * 18; pos[i * 3 + 1] = (Math.random() - .5) * 11; pos[i * 3 + 2] = -Math.random() * 12 + 2; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(pg, new THREE.PointsMaterial({ size: .05, map: radialTex(64), color: 0xbfefff, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(points);
  const fogs = [], fogGeo = new THREE.PlaneGeometry(1, 1);
  [[-2.6, .8, -4, 9, .5, 0x9b6bff, fog1], [2.8, -.6, -4.5, 10, .45, 0x2ee6ff, fog2], [0, -2.2, -3, 11, .4, 0x9b6bff, fog2], [-1.4, -.3, 1.2, 6, .6, 0xb28cff, fog1], [1.5, .4, 1.8, 6, .55, 0x6fe9ff, fog2]].forEach(([x, y, z, s, op, col, map], i) => {
    const m = new THREE.Mesh(fogGeo, new THREE.MeshBasicMaterial({ map, color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.set(x, y, z); m.scale.set(s, s * .62, 1); m.rotation.z = i * 1.3; m.userData = { x, y, z, op, front: z > 0, spd: (i % 2 ? 1 : -1) * (.03 + i * .006) }; scene.add(m); fogs.push(m);
  });
  const coin = new THREE.Group(); scene.add(coin);
  const silver = new THREE.MeshPhysicalMaterial({ color: 0xd9dce4, metalness: 1, roughness: .22, clearcoat: .6, clearcoatRoughness: .2, transparent: true });
  const coinT = logoT ? logoT.clone() : null; if (coinT) { coinT.center.set(.5, .5); coinT.rotation = Math.PI; coinT.needsUpdate = true; }
  const capMat = new THREE.MeshStandardMaterial({ map: coinT, emissiveMap: coinT, emissive: 0xffffff, emissiveIntensity: .55, metalness: .25, roughness: .35, transparent: true });
  const coinMesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .14, 96, 1), [silver, capMat, capMat]); coinMesh.rotation.x = Math.PI / 2; coinMesh.rotation.y = -Math.PI / 2; coin.add(coinMesh);
  coin.add(new THREE.Mesh(new THREE.TorusGeometry(1, .075, 24, 128), silver));
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), new THREE.MeshBasicMaterial({ map: radialTex(256, [[0, "rgba(255,255,255,.9)"], [.35, "rgba(255,255,255,.25)"], [1, "rgba(255,255,255,0)"]]), color: 0x9b6bff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.z = -.6; coin.add(halo);
  let W = 0, H = 0;
  const size = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (w === W && h === H) return; W = w; H = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  // Bildschirmposition der Münzmitte (für den Zoom-Kreis)
  const scr = new THREE.Vector3();
  return {
    render(t, appear, u, b, tx, ty, m) {
      size();
      const yb = mobile ? 1.05 : .95, cz = lerp(-7, 0, appear) + b * 5.2;
      const hh = (8 - cz) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), hw = hh * camera.aspect;
      coin.position.set(lerp(0, (tx / W * 2 - 1) * hw, m), lerp(yb + u * .25, (1 - ty / H * 2) * hh, m), cz);
      coin.scale.setScalar((mobile ? .74 : .7) * (.55 + .45 * appear) * (1 + .1 * u));
      coin.rotation.set(Math.sin(t * .6) * .08, Math.sin(t * .5) * .25 + u * 1.6 + b * 2.2 + (1 - appear) * Math.PI, 0);
      const op = 1 - smooth(.55, .95, b); [silver, capMat].forEach(m => { m.opacity = op; }); halo.material.opacity = op * (.55 + .15 * Math.sin(t * 1.7));
      fogs.forEach((f, i) => { const q = f.userData; f.rotation.z += q.spd / 60; const clr = q.front ? Math.max(appear * .75, u) : 0; f.position.set(q.x * (1 + clr * 1.6), q.y, q.z + clr * 3); f.material.opacity = q.op * (1 - clr) * (1 - smooth(0, .45, b)); });
      points.rotation.y = t * .012 + u * .3; points.position.z = b * 9; points.scale.set(1, 1, 1 + b * 6); points.material.size = .05 + b * .06;
      renderer.render(scene, camera);
      scr.copy(coin.position).project(camera);
      return { x: (scr.x * .5 + .5) * W, y: (-scr.y * .5 + .5) * H };
    }
  };
}


/* ---------------- v5-Effekte ---------------- */
function buildFX(mobile) {
  const box = $("#streams"); if (!box) return;
  const ns = mobile ? 5 : 12, np = mobile ? 6 : 16, fr = d.createDocumentFragment();
  for (let i = 0; i < ns; i++) { const e = d.createElement("i"); e.className = "str" + (i % 3 === 1 ? " v" : ""); e.style.left = (4 + Math.random() * 92).toFixed(1) + "%"; e.style.setProperty("--d", (4.5 + Math.random() * 5).toFixed(1) + "s"); e.style.setProperty("--dl", (-Math.random() * 8).toFixed(1) + "s"); fr.appendChild(e); }
  for (let i = 0; i < np; i++) { const e = d.createElement("i"); e.className = "pt"; e.style.left = (Math.random() * 100).toFixed(1) + "%"; e.style.top = (Math.random() * 100).toFixed(1) + "%"; e.style.setProperty("--d", (6 + Math.random() * 8).toFixed(1) + "s"); e.style.setProperty("--dl", (-Math.random() * 8).toFixed(1) + "s"); e.style.setProperty("--x", ((Math.random() - .5) * 80).toFixed(0) + "px"); e.style.setProperty("--y", (-20 - Math.random() * 80).toFixed(0) + "px"); fr.appendChild(e); }
  box.appendChild(fr);
  // HUD-Label pro Erklärung
  $$(".ex .pn").forEach(pn => { const k = SIDX[pn.dataset.s]; const h = d.createElement("p"); h.className = "hud"; h.setAttribute("aria-hidden", "true"); h.textContent = `${String(k).padStart(2, "0")} / ${N - 1} · Nexus-Link`; pn.prepend(h); });
}
/* Titel kurz „entschlüsseln“ (0,45 s), danach exakt der Originaltext */
const GLY = "ABCDEFGHKMNPRSTUVWXYZ0123456789#/<>*+";
function decode(el) {
  const h = el.querySelector(".hl"); if (!h || h._busy) return; h._busy = true;
  const nodes = []; const walk = (n) => n.childNodes.forEach(c => c.nodeType === 3 ? (c.textContent.trim() && nodes.push([c, c._orig || (c._orig = c.textContent)])) : walk(c)); walk(h);
  const total = nodes.reduce((a, [, t]) => a + t.length, 0), t0 = performance.now(), dur = 450;
  const step = (now) => {
    const p = clamp((now - t0) / dur), rev = Math.floor(p * total * 1.15); let idx = 0;
    nodes.forEach(([n, t]) => { let o = ""; for (let i = 0; i < t.length; i++, idx++) { const ch = t[i]; o += (idx < rev || ch === " " || ch === "." || ch === "\u2011") ? ch : GLY[(Math.random() * GLY.length) | 0]; } n.textContent = o; });
    if (p < 1) requestAnimationFrame(step); else { nodes.forEach(([n, t]) => { n.textContent = t; }); h._busy = false; }
  };
  requestAnimationFrame(step);
}

/* ---------------- Story ---------------- */
async function start(useGL) {
  const mobile = isMobileVP();
  buildChannels();
  const coinGL = useGL ? await makeCoin(mobile).catch(e => { console.warn("Münze ohne WebGL", e); return null; }) : null;
  if (!coinGL) root.classList.add("nogl");
  const stage = $("#stage"), dc = $("#dc"), cl = $("#cl"), clIn = $("#clIn"), act = $("#act"), strip = $("#strip"), stripIn = $("#stripIn"), sact = $("#sact");
  const warp = $("#warp"), ring = $("#ring"), beam = $("#beam"), scan = $("#scan"), typing = $("#typing"), hudTag = $("#hudTag");
  const chName = $("#chName"), chTopic = $("#chTopic"), chIc = $("#chIc"), composer = $("#composer"), coin2d = $("#coin2d"), vus = $("#vus");
  const cs = SC.map(s => { const el = $(`.cs[data-s="${s.k}"]`); return { el, parts: [...el.querySelectorAll(".st")], last: "" }; });
  const panels = $$(".pn").map(el => ({ el, i: SIDX[el.dataset.s], last: -1, off: 0 }));
  const sceneRow = SC.map(s => rowEl[s.ch]), sceneChip = SC.map(s => chipEl[s.ch]);

  /* Geometrie (nur bei Größenänderung lesen, nie pro Frame) */
  let G = {};
  function measureLayout() {
    const vusH = vus ? vus.scrollHeight : 0;
    const r = dc.getBoundingClientRect(), ex = $("#ex").getBoundingClientRect(), side = $(".side");
    G = { dcR: r, exL: ex.left, x0: mobile ? 0 : (side.getBoundingClientRect().left), msgsH: $("#msgs").clientHeight, chTop: 48, dcTop: dc.offsetTop, listH: cl.clientHeight, listFull: clIn.scrollHeight + vusH, stripW: strip.clientWidth,
      rowY: sceneRow.map(r => r ? r.offsetTop : 0), rowH: 32,
      chipX: sceneChip.map(c => c ? c.offsetLeft : 0), chipW: sceneChip.map(c => c ? c.offsetWidth : 60), vusH };
  }
  measureLayout();
  let rzT, lastW = innerWidth;
  addEventListener("resize", () => { clearTimeout(rzT); rzT = setTimeout(() => {
    if (isMobileVP() !== mobile) { location.reload(); return; }
    if (mobile && innerWidth === lastW) return; // iOS-Adressleiste: Bühne ist 100svh, nichts neu berechnen
    lastW = innerWidth; measureLayout(); window.ScrollTrigger && ScrollTrigger.refresh();
  }, 150); });

  /* Fortschritt */
  let target = 0, prog = 0;
  const storyEl = $("#story");
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger); ScrollTrigger.config({ ignoreMobileResize: true });
    ScrollTrigger.create({ trigger: storyEl, start: "top top", end: "bottom bottom", onUpdate: s => { target = s.progress; } });
  } else addEventListener("scroll", () => { const r = storyEl.getBoundingClientRect(); target = clamp(-r.top / Math.max(1, storyEl.offsetHeight - innerHeight)); }, { passive: true });
  /* Timing pro Szene (u = 0..1): 0-20 % Text blendet ein, bis 44 % Lesen mit leichter Drift, 56-100 % weicher Übergang. */
  const T_IN = .2, T_OUT0 = .44, T_OUT1 = .64, T_B0 = .56;
  const ease = (t) => .5 - .5 * Math.cos(Math.PI * clamp(t));
  const at = (p) => { const f = clamp(p) * N, i = Math.min(N - 1, Math.floor(f)), u = f - i; const b = i < N - 1 ? ease((u - T_B0) / (1 - T_B0)) : 0; return { i, u, b }; };

  const dots = $("#dots"), hint = $("#hint");
  SC.forEach(() => dots.appendChild(d.createElement("i"))); const dotEls = [...dots.children];
  const set = (el, prop, v, cache) => { if (el["_" + prop] === v) return; el["_" + prop] = v; el.style[prop] = v; };
  let lastOn = -1, lastI = -1, tiltX = 0, tiltY = 0, mouseX = 0, mouseY = 0;
  if (!mobile) addEventListener("pointermove", e => { mouseX = e.clientX / innerWidth - .5; mouseY = e.clientY / innerHeight - .5; }, { passive: true });
  buildFX(mobile);

  root.classList.add("loaded");
  dc.style.visibility = "visible";
  let inView = true; new IntersectionObserver(es => { inView = es[0].isIntersecting; }).observe(storyEl);
  const clock = new THREE.Clock(); let t0 = null, frames = 0, fpsT = 0; window.__pt3d = { fps: 0 };

  function frame() {
    requestAnimationFrame(frame);
    if (!inView) return;
    const dt = Math.min(clock.getDelta(), .05), time = clock.elapsedTime; if (t0 === null) t0 = time;
    frames++; fpsT += dt; if (fpsT > 1) { window.__pt3d.fps = Math.round(frames / fpsT); frames = 0; fpsT = 0; }
    prog += (target - prog) * (1 - Math.pow(.012, dt)); if (measure || Math.abs(target - prog) < 1e-5) prog = target;
    const A = at(prog), j = Math.min(N - 1, A.i + 1);
    const appear = 1 - Math.pow(1 - clamp((time - t0 - .15) / 2.6), 3);

    /* Intro: Münze, dann Zoom in den Discord */
    const z = A.i === 0 ? A.b : 1;           // 0 = nur Münze, 1 = Discord voll
    const tx = G.dcR.left + G.dcR.width / 2, ty = G.dcR.top + G.dcR.height / 2;
    const mv = A.i === 0 ? smooth(.3, .62, A.u) : 1; // Münze gleitet vor dem Portal in die Mitte des Discord-Bereichs
    let cx = lerp(innerWidth / 2, tx, mv), cy = lerp(innerHeight * (mobile ? .34 : .38), ty, mv);
    if (z < 1) {
      if (coinGL) { coinGL.render(time, appear, A.i === 0 ? A.u : 1, z, tx, ty, mv); cx = tx; cy = ty; }
      else set(coin2d, "transform", `translate(calc(-50% + ${(cx - innerWidth / 2).toFixed(0)}px),calc(-50% + ${(cy - innerHeight * (mobile ? .34 : .38)).toFixed(0)}px)) scale(${(1 + A.u * .1 + z * 3).toFixed(3)})`), set(coin2d, "opacity", String((1 - smooth(.5, .9, z)).toFixed(3)));
    }
    set($("#gl"), "visibility", z < 1 ? "visible" : "hidden");
    const R = z >= 1 ? -1 : Math.pow(z, 1.35) * Math.hypot(innerWidth, innerHeight) * 1.05;
    set(dc, "clipPath", R < 0 ? "none" : `circle(${R.toFixed(1)}px at ${cx.toFixed(0)}px ${(cy - G.dcTop).toFixed(0)}px)`);
    const wv = z > 0 && z < 1 ? Math.pow(Math.sin(Math.PI * z), .8) : 0;
    set(warp, "opacity", (wv * .85).toFixed(3)); if (wv > 0) set(warp, "transform", `translate3d(${cx.toFixed(0)}px,${cy.toFixed(0)}px,0) scale(${(.25 + z * 1.4).toFixed(3)}) rotate(${(z * 40).toFixed(1)}deg)`);
    set(ring, "opacity", (wv * (1 - smooth(.7, 1, z))).toFixed(3)); if (wv > 0) { const D = Math.max(8, 2 * R); set(ring, "width", D.toFixed(0) + "px"); set(ring, "height", D.toFixed(0) + "px"); set(ring, "left", cx.toFixed(0) + "px"); set(ring, "top", cy.toFixed(0) + "px"); }
    /* leichte 3D-Neigung zur Maus (Desktop) bzw. zum Scroll */
    tiltX += ((mobile ? 0 : mouseY * -2.2) - tiltX) * .08; tiltY += ((mobile ? 0 : mouseX * 2.8) + Math.sin(prog * N * Math.PI) * (mobile ? 0 : .6) - tiltY) * .08;
    const tilt = mobile ? "" : ` perspective(1800px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
    set(dc, "transform", z >= 1 ? (tilt || "none") : `${tilt} scale(${(1.08 - .08 * z).toFixed(4)})`);

    /* Aktiver Kanal: Markierung springt animiert */
    const ry = lerp(G.rowY[A.i], G.rowY[j], A.b);
    const vusOpen = smooth(.15, .6, (A.i === SIDX.voice ? 1 - A.b : 0) + (j === SIDX.voice && A.i !== SIDX.voice ? A.b : 0));
    if (vus) set(vus, "height", (vusOpen * G.vusH).toFixed(1) + "px");
    const vShift = (k) => (vus && G.rowY[k] > G.rowY[SIDX.voice] ? vusOpen * G.vusH : 0);
    const ryS = ry + lerp(vShift(A.i), vShift(j), A.b);
    set(act, "transform", `translate3d(0,${ryS.toFixed(1)}px,0)`);
    const scroll = clamp(ryS - G.listH * .34, 0, Math.max(0, G.listFull - G.listH));
    set(clIn, "transform", `translate3d(0,${(-scroll).toFixed(1)}px,0)`);
    const on = A.b > .5 ? j : A.i;
    if (on !== lastOn) {
      if (lastOn >= 0) { sceneRow[lastOn] && sceneRow[lastOn].classList.remove("on"); sceneChip[lastOn] && sceneChip[lastOn].classList.remove("on"); }
      sceneRow[on] && sceneRow[on].classList.add("on"); sceneChip[on] && sceneChip[on].classList.add("on"); lastOn = on;
      const s = SC[on]; chName.textContent = s.ch; chTopic.textContent = s.t || ""; chIc.textContent = VOICE.has(s.ch) ? "🔈" : "#"; composer.textContent = "Nachricht an " + (VOICE.has(s.ch) ? "🔈" : "#") + s.ch;
      hudTag.textContent = on > 0 ? `CH ${String(on).padStart(2, "0")}/${N - 1} · SYNC` : "SYNC";
      if (lastOn !== -2 && !measure) { chName.classList.remove("gl"); void chName.offsetWidth; chName.classList.add("gl"); }
    }
    /* Scan über den Chat beim Wechsel, Lichtstrahl zur Erklärung */
    const sc = A.b > 0 && A.b < 1 ? A.b : 0;
    set(scan, "opacity", (Math.sin(Math.PI * sc) * .9).toFixed(3)); if (sc) set(scan, "transform", `translate3d(0,${(sc * (G.msgsH + 70) - 70).toFixed(1)}px,0)`);
    const bu = A.i > 0 ? smooth(0, .26, A.u) * (A.b === 0 ? 1 : 1 - A.b) : 0, bv = A.i > 0 && A.u < .3 ? Math.sin(Math.PI * clamp(A.u / .3)) : 0;
    set(beam, "opacity", bv.toFixed(3));
    if (bv > 0) { const y = mobile ? G.dcR.bottom - 1 : G.dcR.top + G.chTop + 8 + ryS - scroll + 15, x0 = mobile ? -160 : G.x0, x1 = mobile ? innerWidth : G.exL + 10; set(beam, "transform", `translate3d(${lerp(x0, x1 - 160, bu).toFixed(1)}px,${y.toFixed(1)}px,0)`); }
    if (mobile) {
      const cxp = lerp(G.chipX[A.i], G.chipX[j], A.b), cw = lerp(G.chipW[A.i], G.chipW[j], A.b);
      set(sact, "transform", `translate3d(${cxp.toFixed(1)}px,0,0)`); set(sact, "width", cw.toFixed(1) + "px");
      set(stripIn, "transform", `translate3d(${(G.stripW / 2 - cxp - cw / 2).toFixed(1)}px,0,0)`);
    }

    /* Chat-Szenen: Wechsel mit Kanal, Teile erscheinen nacheinander (erste Reaktion ab dem ersten Pixel) */
    let typingOn = false;
    const vec = measure ? [ryS / 40, scroll / 40, z, A.i + A.b] : null;
    cs.forEach((c, k) => {
      let w = 0, y = 0;
      if (k === A.i) { w = 1 - smooth(.1, .7, A.b); y = -A.b * 26 - A.u * 10 * (1 - A.b); }
      else if (k === j && A.b > 0) { w = smooth(.3, 1, A.b); y = (1 - A.b) * 26; }
      if (k === 0) w *= smooth(.5, 1, z);
      const key = w < .01 ? "h" : w.toFixed(3) + "|" + y.toFixed(1);
      if (key !== c.last) {
        c.last = key; c.el.style.visibility = w < .01 ? "hidden" : "visible";
        if (w >= .01) { c.el.style.opacity = w.toFixed(3); c.el.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`; }
      }
      // Szenenfortschritt für Teile und Effekte
      const pu = k < A.i ? 1 : k > A.i ? 0 : A.u;
      const n = c.parts.length, gap = .42 / Math.max(1, n - 1);
      c.parts.forEach((el, q) => {
        const t0p = q === 0 ? -1 : (q - 1) * gap * 1.0, v = q === 0 ? 1 : smooth(t0p, t0p + .14, pu);
        const kk = v.toFixed(3); if (el._v === kk) return; el._v = kk;
        el.style.setProperty("--v", kk); el.style.opacity = kk; el.style.transform = v >= 1 ? "none" : `translate3d(0,${((1 - v) * 14).toFixed(1)}px,0) scale(${(.97 + .03 * v).toFixed(3)})`;
        if (vec) vec.push(v * w);
      });
      const fx = SC[k].k === "cardverse" ? smooth(.05, .45, pu) : SC[k].k === "trade" ? smooth(.05, .4, pu) : SC[k].k === "rank" ? smooth(0, .4, pu) : -1;
      if (fx >= 0) { const fk = fx.toFixed(3); if (c.el._p !== fk) { c.el._p = fk; c.el.style.setProperty("--p", fk); } if (vec) vec.push(fx * w); }
      if (vec) vec.push(w, w * y / 30);
      if (k === A.i) { const lastT = (n - 2) * gap; typingOn = k > 0 && A.b < .2 && n > 1 && pu > -.02 && pu < lastT + .1; }
    });
    typing.classList.toggle("on", typingOn);

    /* Erklärung rechts / unten */
    panels.forEach(o => {
      let v = 0;
      if (o.i === A.i) v = (o.i === 0 ? 1 : smooth(0, T_IN, A.u)) * (o.i === N - 1 ? 1 : 1 - smooth(T_OUT0, T_OUT1, A.u));
      const q = Math.round(v * 1000) / 1000;
      const off = Math.round(((1 - v) * (A.u < .3 ? 1 : -1) + (o.i === A.i && o.i < N - 1 ? .5 - A.u : 0) * .7) * 1000) / 1000;
      if (vec) vec.push(q, off * q);
      if (q === o.last && off === o.off) return; if (o.last < .01 && q >= .01 && !measure) decode(o.el); o.last = q; o.off = off;
      o.el.style.opacity = q; o.el.style.visibility = v < .01 ? "hidden" : "visible";
      const intro = o.i === 0;
      o.el.style.transform = intro ? `translate3d(0,${(off * 24).toFixed(1)}px,0)` : (mobile ? `translate3d(0,${(off * 22).toFixed(1)}px,0)` : `translate3d(${(off * -30).toFixed(1)}px,calc(-50% + ${(off * 10).toFixed(1)}px),0)`);
      if (!mobile && !intro) o.el.style.filter = v > .98 ? "none" : `blur(${((1 - v) * 6).toFixed(1)}px)`;
      if (o.i === SIDX.numbers && v > .5) countUp();
    });
    if (A.i !== lastI) { lastI = A.i; dotEls.forEach((e, k) => e.classList.toggle("on", k === A.i)); }
    set(hint, "opacity", String(A.i === 0 ? (1 - smooth(0, .12, A.u)).toFixed(3) : 0));
    if (vec) window.__pt3d.vec = vec;
  }
  requestAnimationFrame(frame);
}

/* ---------------- Start ---------------- */
(async () => {
  try { await Promise.race([d.fonts.ready, new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  if (forceStatic || reduce) { buildChannels(); goStatic(); return; }
  try { await start(!forceNoGL && webglOK()); } catch (e) { console.warn("Story nicht verfügbar, statische Ansicht", e); goStatic(); }
})();
