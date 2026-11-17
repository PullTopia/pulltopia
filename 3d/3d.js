/* PullTopia · 3D-Vorschau v3 (Testseite). Ein durchgehender Scroll-Flow mit schwebendem 3D-Discord-Fenster.
   three.js r170 + GSAP ScrollTrigger, lokal eingebunden. Keine fremden Server außer der eigenen stats.json auf GitHub. */
import * as THREE from "./vendor/three.module.min.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";
import { LAYOUTS, SCREENS, drawPCard, drawSecret, drawBadge } from "./screens.js";

const d = document, root = d.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const forceStatic = /[?&]static\b/.test(location.search);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const $ = (s) => d.querySelector(s), $$ = (s) => [...d.querySelectorAll(s)];
const loadImg = (src) => new Promise(res => { const i = new Image(); i.decoding = "async"; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
const mkCanvas = (w, h) => { const c = d.createElement("canvas"); c.width = w; c.height = h; return c; };

/* Szenen: jedes Thema genau einmal */
const SC = [
  { k: "intro", win: "hide", coin: 1 },
  { k: "drop", side: 1, scr: "drop" },
  { k: "pc", side: -1, scr: "pc" },
  { k: "news", side: 1, scr: "news" },
  { k: "cardverse", side: -1, scr: "cardverse" },
  { k: "trade", side: 1, scr: "trade" },
  { k: "voice", side: -1, scr: "voice" },
  { k: "rank", side: 1, scr: "rank" },
  { k: "creator", side: -1, scr: "creator" },
  { k: "numbers", win: "back", scr: "creator" },
  { k: "premium", side: 1, scr: "premium" },
  { k: "plans", win: "back", scr: "premium" },
  { k: "join", win: "far", scr: "premium", coin: 1 }
];
const N = SC.length;
root.style.setProperty("--n", N);
const SIDX = {}; SC.forEach((s, i) => { SIDX[s.k] = i; });

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

/* ---------------- Bildschirme ---------------- */
const isMobileVP = () => innerWidth < 761 || innerWidth / innerHeight < .8;
async function buildAssets(L) {
  try { await Promise.race([Promise.all([d.fonts.load("700 24px Inter"), d.fonts.load("500 20px Inter"), d.fonts.load("800 30px Inter")]), new Promise(r => setTimeout(r, 1800))]); } catch (e) {}
  const I = "../assets/img/";
  const [av, logo, cw, cf, secBase, secSil, fog1, fog2, ...cards] = await Promise.all(["logo-64", "logo-400", "creature-water", "creature-fire", "card-secret", "card-secret-sil", "fog-1", "fog-2", "card-016", "card-033", "card-046", "card-001", "cardback"].map(n => loadImg(I + n + ".webp")));
  const A = { av, logo, secBase, secSil, fog1, fog2 };
  const screens = {};
  for (const k in SCREENS) { const c = mkCanvas(L.W, L.H); SCREENS[k](c.getContext("2d"), L, A); screens[k] = c; }
  const pW = 420, pH = 588;
  const pc1 = mkCanvas(pW, pH); drawPCard(pc1.getContext("2d"), pW, pH, A, "Turtok-ex", "151 · 009/165", "Wasser", "#1b6fff", cw);
  const pc2 = mkCanvas(pW, pH); drawPCard(pc2.getContext("2d"), pW, pH, A, "Glurak-ex", "151 · 006/165", "Feuer", "#ff6a2a", cf);
  const sec = mkCanvas(540, 756); drawSecret(sec.getContext("2d"), 540, 756, A);
  const badge = (label, col, sub) => { const c = mkCanvas(620, sub ? 150 : 120); drawBadge(c.getContext("2d"), 620, sub ? 150 : 120, label, col, sub); return c; };
  return {
    screens, logo, cards: cards.slice(0, 4), cardback: cards[4], pc1, pc2, sec,
    bPing: badge("@Free-Alert · Pokémon", "#5865f2", "Neuer Drop · Beispiel"),
    bMatch: badge("Gegenseitiger Match", "#2ee6ff"),
    bPartner: badge("Offizieller Partner", "#f7c35c"),
    bPrem: badge("Premium · sofort", "#f7c35c"),
    bFree: badge("Kostenlos · +15 Min", "#2ee6ff")
  };
}

/* ---------------- Fallback ---------------- */
function goStatic(assets) {
  root.classList.add("static", "loaded");
  if (!assets) return;
  $$("[data-fig]").forEach(fig => {
    const cv = assets.screens[fig.dataset.fig]; if (!cv) return;
    const w = d.createElement("div"); w.className = "win";
    const img = new Image(); img.alt = "Nachgebaute Discord-Ansicht (Beispiel)"; img.width = cv.width; img.height = cv.height;
    try { img.src = cv.toDataURL("image/webp", .86); } catch (e) {}
    w.appendChild(img); fig.appendChild(w);
  });
}
function webglOK() { try { const c = d.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (e) { return false; } }

/* ---------------- 3D-Helfer ---------------- */
function rrShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
function planeUV(geo, w, h) { const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5); uv.needsUpdate = true; return geo; }
function radialTex(size = 256, stops = [[0, "rgba(255,255,255,1)"], [1, "rgba(255,255,255,0)"]]) {
  const c = mkCanvas(size, size), x = c.getContext("2d"); const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col)); x.fillStyle = g; x.fillRect(0, 0, size, size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

async function start3D(assets, L) {
  const canvas = $("#gl"), stage = $("#stage");
  const mobile = L.mobile;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 2 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(mobile ? 38 : 32, 1, .1, 80); camera.position.set(0, 0, 8);
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const accent = new THREE.Color("#2ee6ff"), accentT = accent.clone();
  const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };
  const loader = new THREE.TextureLoader();
  const loadTex = (src) => new Promise(res => loader.load(src, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; res(t); }, undefined, () => res(null)));
  const [logoT, fog1, fog2] = await Promise.all(["logo-400", "fog-1", "fog-2"].map(n => loadTex("../assets/img/" + n + ".webp")));

  scene.add(new THREE.AmbientLight(0xffffff, .25));
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(-3, 4, 5); scene.add(key);
  const accLight = new THREE.PointLight(accent, 26, 16, 2); accLight.position.set(2.5, 1, 3); scene.add(accLight);
  const vl = new THREE.PointLight(0x9b6bff, 22, 16, 2); vl.position.set(-3, -1.5, 2); scene.add(vl);

  /* Sterne + Nebel */
  const PN = mobile ? 240 : 460, pos = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) { pos[i * 3] = (Math.random() - .5) * 18; pos[i * 3 + 1] = (Math.random() - .5) * 11; pos[i * 3 + 2] = -Math.random() * 12 + 2; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(pg, new THREE.PointsMaterial({ size: .05, map: radialTex(64), color: 0xbfefff, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(points);
  const fogs = [], fogGeo = new THREE.PlaneGeometry(1, 1);
  [[-2.6, .8, -4, 9, .5, 0x9b6bff, fog1], [2.8, -.6, -4.5, 10, .45, 0x2ee6ff, fog2], [0, -2.2, -3, 11, .4, 0x9b6bff, fog2], [-.5, 2.2, -5.5, 12, .35, 0x5c3cff, fog1],
   [-1.4, -.3, 1.2, 6, .75, 0xb28cff, fog1], [1.5, .4, 1.8, 6, .7, 0x6fe9ff, fog2], [0, 0, 2.6, 7, .65, 0x9b6bff, fog1]].forEach(([x, y, z, s, op, col, map], i) => {
    const m = new THREE.Mesh(fogGeo, new THREE.MeshBasicMaterial({ map, color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.set(x, y, z); m.scale.set(s, s * .62, 1); m.rotation.z = i * 1.3; m.userData = { x, y, z, op, front: z > 0, spd: (i % 2 ? 1 : -1) * (.03 + i * .006) }; scene.add(m); fogs.push(m);
  });

  /* Münze mit gekröntem P */
  const coin = new THREE.Group(); scene.add(coin);
  const silver = new THREE.MeshPhysicalMaterial({ color: 0xd9dce4, metalness: 1, roughness: .22, clearcoat: .6, clearcoatRoughness: .2, transparent: true });
  const coinT = logoT ? logoT.clone() : null; if (coinT) { coinT.center.set(.5, .5); coinT.rotation = Math.PI; coinT.needsUpdate = true; }
  const capMat = new THREE.MeshStandardMaterial({ map: coinT, emissiveMap: coinT, emissive: 0xffffff, emissiveIntensity: .55, metalness: .25, roughness: .35, transparent: true });
  const coinMesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .14, 96, 1), [silver, capMat, capMat]); coinMesh.rotation.x = Math.PI / 2; coinMesh.rotation.y = -Math.PI / 2; coin.add(coinMesh);
  coin.add(new THREE.Mesh(new THREE.TorusGeometry(1, .075, 24, 128), silver));
  const coinHalo = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), new THREE.MeshBasicMaterial({ map: radialTex(256, [[0, "rgba(255,255,255,.9)"], [.35, "rgba(255,255,255,.25)"], [1, "rgba(255,255,255,0)"]]), color: 0x9b6bff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  coinHalo.position.z = -.6; coin.add(coinHalo);

  /* Discord-artiges Fenster */
  const WW = mobile ? 2.28 : 4.2, WH = WW * L.H / L.W, WR = mobile ? .16 : .14, WD = .07, BEV = .03;
  const win = new THREE.Group(); scene.add(win);
  const pivot = new THREE.Group(); win.add(pivot);
  const bodyGeo = new THREE.ExtrudeGeometry(rrShape(WW, WH, WR), { depth: WD, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 4, curveSegments: 16 }); bodyGeo.translate(0, 0, -WD / 2);
  const frameMat = new THREE.MeshPhysicalMaterial({ color: 0x9aa0ad, metalness: 1, roughness: .25, clearcoat: 1, clearcoatRoughness: .15 });
  pivot.add(new THREE.Mesh(bodyGeo, frameMat));
  const FZ = WD / 2 + BEV;
  const screenTex = {}; for (const k in assets.screens) { const t = tex(assets.screens[k]); t.minFilter = THREE.LinearMipmapLinearFilter; screenTex[k] = t; }
  const screenMat = new THREE.ShaderMaterial({
    uniforms: { tA: { value: screenTex.drop }, tB: { value: screenTex.drop }, mixv: { value: 0 }, glow: { value: new THREE.Color() }, bright: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: `uniform sampler2D tA; uniform sampler2D tB; uniform float mixv; uniform vec3 glow; uniform float bright; varying vec2 vUv;
      void main(){ float m=smoothstep(0.0,1.0,mixv); vec2 ua=vUv+vec2(0.0,m*0.04); vec2 ub=vUv-vec2(0.0,(1.0-m)*0.04);
        vec4 c=mix(texture2D(tA,ua),texture2D(tB,ub),m); float e=smoothstep(0.0,0.04,vUv.y)*smoothstep(0.0,0.04,1.0-vUv.y)*smoothstep(0.0,0.03,vUv.x)*smoothstep(0.0,0.03,1.0-vUv.x);
        c.rgb*=bright; c.rgb+=glow*0.06*(1.0-e); gl_FragColor=vec4(c.rgb,1.0);
        #include <colorspace_fragment>
      }`, toneMapped: false
  });
  const screen = new THREE.Mesh(planeUV(new THREE.ShapeGeometry(rrShape(WW, WH, WR), 16), WW, WH), screenMat); screen.position.z = FZ + .003; pivot.add(screen);
  const ringShape = rrShape(WW + BEV * 2 + .05, WH + BEV * 2 + .05, WR + BEV + .025); ringShape.holes.push(rrShape(WW + BEV * 2 - .005, WH + BEV * 2 - .005, WR + BEV - .003));
  const ringMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.ShapeGeometry(ringShape, 20), ringMat); ring.position.z = FZ - .012; pivot.add(ring);
  const back = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(WW, WH, WR), 16), new THREE.MeshPhysicalMaterial({ color: 0x0c0a16, metalness: .4, roughness: .25, clearcoat: 1 })); back.rotation.y = Math.PI; back.position.z = -FZ - .002; pivot.add(back);
  const backLogo = new THREE.Mesh(new THREE.CircleGeometry(Math.min(WW, WH) * .22, 64), new THREE.MeshStandardMaterial({ map: logoT, emissiveMap: logoT, emissive: 0xffffff, emissiveIntensity: .6 })); backLogo.rotation.y = Math.PI; backLogo.position.z = -FZ - .006; pivot.add(backLogo);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(WW * 1.9, WH * 1.9), new THREE.MeshBasicMaterial({ map: radialTex(256, [[0, "rgba(255,255,255,.5)"], [.45, "rgba(255,255,255,.1)"], [1, "rgba(255,255,255,0)"]]), color: accent, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  halo.position.z = -.6; win.add(halo);

  /* schwebende Objekte (lokal zum Fenster) */
  const plane = (c, w, opts = {}) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * c.height / c.width), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false, toneMapped: false, side: opts.double ? THREE.DoubleSide : THREE.FrontSide })); m.visible = false; return m; };
  const U = Math.min(WW, WH * 1.4);  // Grundgröße
  const cardW = U * (mobile ? .36 : .25), cardH = cardW * 1.4;
  const cardGeo = new THREE.BoxGeometry(cardW, cardH, .015);
  const backMat = new THREE.MeshStandardMaterial({ map: assets.cardback ? tex(assets.cardback) : null, roughness: .5 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xdedede, metalness: .6, roughness: .3 });
  const mkCard = (img) => { const t = img instanceof HTMLCanvasElement ? tex(img) : (img ? (() => { const tt = new THREE.Texture(img); tt.colorSpace = THREE.SRGBColorSpace; tt.anisotropy = aniso; tt.needsUpdate = true; return tt; })() : null);
    const front = new THREE.MeshStandardMaterial({ map: t, roughness: .35, metalness: .1, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: .35, transparent: true });
    const m = new THREE.Mesh(cardGeo, [edgeMat, edgeMat, edgeMat, edgeMat, front, backMat]); m.visible = false; m.userData.mats = [front]; pivot.add(m); return m; };
  const fan = assets.cards.map(mkCard);
  const secret = mkCard(assets.sec); secret.scale.setScalar(1.25);
  const tc1 = mkCard(assets.pc1), tc2 = mkCard(assets.pc2);
  const bW = U * (mobile ? .62 : .42);
  const bPing = plane(assets.bPing, bW), bMatch = plane(assets.bMatch, bW), bPartner = plane(assets.bPartner, bW), bPrem = plane(assets.bPrem, bW * .9), bFree = plane(assets.bFree, bW * .9);
  [bPing, bMatch, bPartner, bPrem, bFree].forEach(b => pivot.add(b));

  /* Layout: Fensterposition pro Szene, damit Text und Fenster sich nie überdecken */
  const panels = $$(".pn").map(el => ({ el, i: SIDX[el.dataset.s], last: -1, side: el.classList.contains("pn-l") ? -1 : el.classList.contains("pn-r") ? 1 : 0 }));
  let W = 0, H = 0, Hv0 = 5, state = [];
  function layout() {
    const w = stage.clientWidth, h = stage.clientHeight;
    W = w; H = h; Hv0 = 2 * 8 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const Hv = 2 * 8 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), Wv = Hv * camera.aspect, k = Hv / h;
    const top = parseFloat(getComputedStyle(root).getPropertyValue("--tb")) + parseFloat(getComputedStyle(root).getPropertyValue("--nv")) + 14;
    state = SC.map((s, i) => {
      if (s.win === "hide") return { x: 0, y: -Hv * .9, z: 0, s: .8, rx: .7, ry: -.5, rz: .1, dim: 1 };
      if (s.win === "back") return { x: 0, y: mobile ? .2 : 0, z: -5, s: 1, rx: .05, ry: 0, rz: 0, dim: .28 };
      if (s.win === "far") return { x: 0, y: Hv * 1.1, z: -4, s: .8, rx: -.6, ry: .4, rz: 0, dim: .2 };
      const pe = panels.find(p => p.i === i);
      if (mobile) {
        const r = pe ? pe.el.getBoundingClientRect() : { top: h * .6 };
        const availTop = top + 40, availBot = Math.max(top + 200, r.top - 14), availH = availBot - availTop;
        const sc = Math.min((availH * k) / (WH * 1.08), (Wv * .9) / WW, 1.15);
        const cy = (availTop + availBot) / 2;
        return { x: 0, y: Hv / 2 - cy * k, z: 0, s: sc, rx: .1, ry: (i % 2 ? .14 : -.14), rz: 0, dim: 1 };
      }
      const r = pe ? pe.el.getBoundingClientRect() : { left: w * .06, right: w * .38 };
      const side = pe ? pe.side : 0;
      const x0 = side < 0 ? r.right + w * .03 : w * .05, x1 = side < 0 ? w - 70 : r.left - w * .03;
      const sc = Math.min(((x1 - x0) * k) / (WW * 1.12), ((h - top - 40) * k) / (WH * 1.15), 1.1);
      const cx = (x0 + x1) / 2, cy = top + (h - top) / 2;
      return { x: cx * k - Wv / 2, y: Hv / 2 - cy * k, z: 0, s: sc, rx: .06, ry: side < 0 ? -.3 : .3, rz: 0, dim: 1 };
    });
  }
  layout();
  let rzT; addEventListener("resize", () => { clearTimeout(rzT); rzT = setTimeout(() => { if (isMobileVP() !== mobile) location.reload(); else { layout(); ScrollTrigger && ScrollTrigger.refresh(); } }, 150); });

  /* Fortschritt */
  let target = 0, prog = 0;
  const storyEl = $("#story");
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger); ScrollTrigger.config({ ignoreMobileResize: true });
    ScrollTrigger.create({ trigger: storyEl, start: "top top", end: "bottom bottom", onUpdate: s => { target = s.progress; } });
  } else addEventListener("scroll", () => { const r = storyEl.getBoundingClientRect(); target = clamp(-r.top / Math.max(1, storyEl.offsetHeight - innerHeight)); }, { passive: true });
  const at = (p) => { const f = clamp(p) * N, i = Math.min(N - 1, Math.floor(f)), u = f - i; const b = i < N - 1 ? smooth(.7, 1, u) : 0; return { i, u, b }; };
  const weight = (k, A) => (A.i === k ? 1 - A.b : 0) + (A.i === k - 1 ? A.b : 0);

  /* UI */
  const panelsBox = $("#panels"), sw = $("#swatches"), hint = $("#hint"), dots = $("#dots");
  SC.forEach(() => dots.appendChild(d.createElement("i"))); const dotEls = [...dots.children];
  sw.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { sw.querySelectorAll("button").forEach(o => o.setAttribute("aria-checked", String(o === b))); accentT.set(b.dataset.c); root.style.setProperty("--acc", b.dataset.c); pulse = 1; }));
  let pulse = 0, lastI = -1;
  function updatePanels(A) {
    let gr = false;
    panels.forEach(o => {
      let v = 0;
      if (o.i === A.i) v = (o.i === 0 ? 1 : smooth(.06, .2, A.u)) * (o.i === N - 1 ? 1 : 1 - smooth(.6, .72, A.u));
      if (v > .02 && !o.el.classList.contains("pn-card")) gr = true;
      const q = Math.round(v * 1000) / 1000; if (q === o.last) return; o.last = q;
      const off = (1 - v) * (A.u < .4 ? 1 : -1);
      o.el.style.opacity = q; o.el.style.visibility = v < .01 ? "hidden" : "visible";
      o.el.style.transform = (mobile || !o.side) ? (o.el.classList.contains("pn-intro") || o.el.classList.contains("pn-join") || mobile ? `translate3d(0,${off * 24}px,0)` : `translate3d(0,calc(-50% + ${off * 24}px),0)`) : `translate3d(${o.side * -off * 44}px,-50%,0)`;
      if (o.i === SIDX.numbers && v > .5) countUp();
    });
    panelsBox.classList.toggle("nogr", !gr);
    if (A.i !== lastI) { lastI = A.i; dotEls.forEach((e, j) => e.classList.toggle("on", j === A.i)); }
    sw.classList.toggle("on", A.i > 0 && A.i < N - 1 && !SC[A.i].win);
    hint.style.opacity = A.i === 0 ? 1 - smooth(.0, .25, A.u) : 0;
  }

  let inView = true; new IntersectionObserver(es => { inView = es[0].isIntersecting; }).observe(storyEl);
  const clock = new THREE.Clock(); let t0 = null, frames = 0, fpsT = 0;
  window.__pt3d = { fps: 0 };
  root.classList.add("loaded");
  const st = {}, tmpC = new THREE.Color(), keys = ["x", "y", "z", "s", "rx", "ry", "rz", "dim"];
  const showObj = (m, v) => { m.visible = v > .01; if (m.material && !Array.isArray(m.material)) m.material.opacity = v; else if (m.userData.mats) m.userData.mats.forEach(mm => { mm.opacity = v; }); };

  function frame() {
    requestAnimationFrame(frame);
    if (!inView) return;
    const dt = Math.min(clock.getDelta(), .05), time = clock.elapsedTime; if (t0 === null) t0 = time;
    frames++; fpsT += dt; if (fpsT > 1) { window.__pt3d.fps = Math.round(frames / fpsT); frames = 0; fpsT = 0; }
    prog += (target - prog) * (1 - Math.pow(.0009, dt)); if (Math.abs(target - prog) < 1e-5) prog = target;
    const A = at(prog);
    accent.lerp(accentT, 1 - Math.pow(.002, dt)); pulse = Math.max(0, pulse - dt * 1.6);

    /* Münze: Intro und Schluss */
    const appear = 1 - Math.pow(1 - clamp((time - t0 - .15) / 2.6), 3);
    const wIntro = weight(0, A), wJoin = weight(N - 1, A), cw = Math.max(wIntro * appear, wJoin);
    coin.visible = cw > .01;
    if (coin.visible) {
      const yb = mobile ? 1.0 : .95;
      coin.position.set(0, yb + (1 - wIntro) * (wJoin > .01 ? 0 : 3) + Math.sin(time * 1.1) * .04, wJoin > wIntro ? lerp(-6, 0, wJoin) : lerp(-7, 0, appear) - (1 - wIntro) * 1.2);
      coin.scale.setScalar((mobile ? .74 : .7) * (.55 + .45 * Math.max(appear * wIntro, wJoin)));
      coin.rotation.set(Math.sin(time * .6) * .08, Math.sin(time * .5) * .25 + prog * 6 + (1 - cw) * Math.PI, 0);
      [silver, capMat].forEach(m => { m.opacity = cw; }); coinHalo.material.opacity = cw * (.55 + .15 * Math.sin(time * 1.7));
    }
    fogs.forEach((f, i) => {
      const u = f.userData; f.rotation.z += u.spd * dt;
      if (u.front) { const clr = Math.max(appear * .75, 1 - wIntro); f.position.set(u.x * (1 + clr * 1.6), u.y, u.z + clr * 3); f.material.opacity = u.op * (1 - clr); f.visible = f.material.opacity > .01; }
      else { f.position.set(u.x + Math.sin(time * .1 + i) * .3, u.y + Math.cos(time * .08 + i) * .2, u.z); f.material.opacity = u.op * (.75 + .25 * Math.sin(time * .3 + i)) * (wIntro > .5 || wJoin > .5 ? 1 : .55); }
    });
    points.rotation.y = time * .012 + prog * .8;

    /* Fenster */
    const S0 = state[A.i], S1 = state[Math.min(N - 1, A.i + 1)];
    keys.forEach(k => { st[k] = lerp(S0[k], S1[k], A.b); });
    win.visible = st.y > -6 && st.y < Hv0 * 1.05;
    if (win.visible) {
      win.position.set(st.x, st.y + Math.sin(time * 1.1) * .025, st.z); win.scale.setScalar(st.s);
      pivot.rotation.set(st.rx + Math.sin(time * .8) * .012, st.ry + Math.sin(time * .6) * .02 + A.b * (A.i % 2 ? -.25 : .25) * Math.sin(A.b * Math.PI), st.rz);
      const sA = SC[A.i].scr || "drop", sB = SC[Math.min(N - 1, A.i + 1)].scr || sA;
      screenMat.uniforms.tA.value = screenTex[sA]; screenMat.uniforms.tB.value = screenTex[sB]; screenMat.uniforms.mixv.value = sA === sB ? 0 : A.b;
      screenMat.uniforms.glow.value.copy(accent); screenMat.uniforms.bright.value = st.dim;
      ringMat.color.copy(accent).multiplyScalar((1 + pulse * 1.5) * (.35 + .65 * st.dim)); ringMat.opacity = .95;
      halo.material.color.copy(tmpC.copy(accent).multiplyScalar((.9 + .1 * Math.sin(time * 2) + pulse) * st.dim)); accLight.color.copy(accent);

      const wDrop = weight(SIDX.drop, A), wCv = weight(SIDX.cardverse, A), wTr = weight(SIDX.trade, A), wCr = weight(SIDX.creator, A), wPr = weight(SIDX.premium, A);
      const inA = (w) => smooth(.15, .6, w);
      // Ping
      const pv = inA(wDrop) * (A.i === SIDX.drop ? smooth(.12, .3, A.u) : 1);
      showObj(bPing, pv); bPing.position.set(mobile ? 0 : WW * .12, WH * .36, .25 + .4 * pv); bPing.scale.setScalar(.75 + .25 * pv);
      // Cardverse: Karten fliegen aus dem Fenster
      const cv = inA(wCv) * (A.i === SIDX.cardverse ? smooth(.1, .45, A.u) : 1);
      fan.forEach((c, j) => {
        const a = (j - 1.5) / 1.5, spread = mobile ? .38 : .46;
        showObj(c, cv);
        c.position.set(lerp(0, a * WW * spread, cv), lerp(-WH * .1, -WH * .05 + (1 - Math.abs(a)) * WH * .06 + Math.sin(time * 1.3 + j) * .03, cv), lerp(0, .5 + (1 - Math.abs(a)) * .2, cv));
        c.rotation.set(-.08, lerp(0, -a * .5, cv) + Math.sin(time * .7 + j) * .05, lerp(0, -a * .18, cv));
      });
      showObj(secret, cv); secret.position.set(0, lerp(-WH * .1, WH * .02 + Math.sin(time * 1.1) * .04, cv), lerp(0, 1.0, cv));
      secret.rotation.set(-.05, Math.sin(time * .9) * .25 + (1 - cv) * Math.PI, 0);
      // TradeMatch: zwei Karten treffen sich
      const tv = inA(wTr), tm = A.i === SIDX.trade ? smooth(.15, .55, A.u) : (wTr > .5 ? 1 : 0);
      [[tc1, -1], [tc2, 1]].forEach(([c, sgn]) => {
        showObj(c, tv);
        c.position.set(sgn * lerp(WW * .55, WW * (mobile ? .2 : .16), tm), -WH * .05 + Math.sin(time * 1.2 + sgn) * .03, .6);
        c.rotation.set(-.05, -sgn * lerp(.9, .35, tm), sgn * -.06);
      });
      const mv = tv * smooth(.5, .62, A.i === SIDX.trade ? A.u : 0);
      showObj(bMatch, mv); bMatch.position.set(0, -WH * .05 - cardH * .62, .9); bMatch.scale.setScalar((.8 + .2 * mv) * (1 + .03 * Math.sin(time * 4)));
      // Partner-Abzeichen
      const crv = inA(wCr) * (A.i === SIDX.creator ? smooth(.15, .35, A.u) : 1);
      showObj(bPartner, crv); bPartner.position.set(mobile ? 0 : WW * .22, -WH * .34, .3 + .4 * crv);
      // Premium sofort / +15 Min
      const prv = inA(wPr) * (A.i === SIDX.premium ? smooth(.12, .3, A.u) : 1), frv = inA(wPr) * (A.i === SIDX.premium ? smooth(.3, .45, A.u) : 1);
      showObj(bPrem, prv); bPrem.position.set(mobile ? -WW * .16 : WW * .18, WH * .3, .3 + .4 * prv);
      showObj(bFree, frv); bFree.position.set(mobile ? WW * .16 : WW * .3, WH * .3 - bW * .3, .2 + .3 * frv);
    }
    updatePanels(A);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}

/* ---------------- Start ---------------- */
(async () => {
  const L = isMobileVP() ? LAYOUTS.mob : LAYOUTS.desk;
  let assets = null;
  try { assets = await buildAssets(L); } catch (e) { console.warn("screens", e); }
  if (forceStatic || reduce || !webglOK() || !assets) { goStatic(assets); return; }
  try { await start3D(assets, L); } catch (e) { console.warn("3D nicht verfügbar, statische Ansicht", e); goStatic(assets); }
})();
