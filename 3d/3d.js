/* PullTopia · 3D-Vorschau (Testseite). three.js r170 + GSAP ScrollTrigger, lokal eingebunden. */
import * as THREE from "./vendor/three.module.min.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";
import { SW, SH, drawDrop, drawNews, drawArchive, drawPremium, drawWelcome, drawNotif, drawBadge } from "./screens.js";

const d = document, root = d.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const forceStatic = /[?&]static\b/.test(location.search);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

const loadImg = (src) => new Promise(res => { const i = new Image(); i.decoding = "async"; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

/* ---------------- Live-Zahlen (gleiche Logik wie Live-Seite) ---------------- */
const fmt = new Intl.NumberFormat("de-DE");
const STATS_URLS = ["https://raw.githubusercontent.com/PullTopia/pulltopia/live-stats/stats.json", new URL("../stats.json", location.href).href];
const STATS_LS = "pt-site-stats-v1";
const COUNTRY_ORDER = ["DE", "AT", "CH", "NL", "BE"];
const validStats = (s) => {
  if (!s || s.version !== 1 || !s.metrics) return null;
  const m = s.metrics;
  if (["dropsDetected", "restocksDetected", "backdropsDetected", "shopsLive", "signalsLive", "freeDelayMin"].some(k => !Number.isFinite(m[k]))) return null;
  return s;
};
const countryLine = (by) => {
  if (!by || typeof by !== "object") return "";
  const keys = [...COUNTRY_ORDER.filter(c => by[c] > 0), ...Object.keys(by).filter(c => !COUNTRY_ORDER.includes(c) && by[c] > 0).sort()];
  return keys.map(c => fmt.format(by[c]) + " " + c).join(" · ");
};
const agoText = (iso) => {
  const ts = Date.parse(iso); if (!Number.isFinite(ts)) return "";
  const min = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (min < 1) return "gerade eben"; if (min < 60) return "vor " + min + " Min";
  const h = Math.round(min / 60); if (h < 24) return "vor " + h + " Std.";
  const days = Math.round(h / 24); return "vor " + days + " Tag" + (days === 1 ? "" : "en");
};
const $ = (s) => d.querySelector(s), $$ = (s) => [...d.querySelectorAll(s)];
const setCnt = (name, val) => { const el = $('[data-stat-count="' + name + '"]'); if (el && Number.isFinite(val)) { el.dataset.to = String(val); el.textContent = fmt.format(Math.round(val)); } };
const setTxt = (sel, s) => $$(sel).forEach(el => { el.textContent = s; });
function applyStats(s, live) {
  const m = s.metrics;
  setCnt("drops", m.dropsDetected); setCnt("free-delay", m.freeDelayMin); setCnt("shops", m.shopsLive);
  setCnt("restocks", m.restocksDetected); setCnt("backdrops", m.backdropsDetected);
  if (Number.isFinite(m.premiumMedianSec)) { setCnt("premium-median", Math.round(m.premiumMedianSec)); setTxt('[data-stat-text="premium"]', fmt.format(m.premiumMedianSec) + " s"); }
  setTxt('[data-stat-text="shops"]', fmt.format(m.shopsLive) + " Shops");
  setTxt('[data-stat-text="signals"]', fmt.format(m.signalsLive) + " Signalquellen");
  const sig = $('[data-stat-em="signals"]'); if (sig) sig.textContent = "+" + fmt.format(m.signalsLive);
  const n1 = $('[data-stat-note="drops"]'); if (n1 && s.countingSinceLabel) n1.textContent = "seit Start der Aufzeichnung · " + s.countingSinceLabel + " (Europe/Berlin)";
  const n2 = $('[data-stat-note="premium-median"]');
  if (n2 && Number.isFinite(m.premiumMedianSec) && Number.isFinite(m.premiumMedianN)) n2.textContent = "n = " + fmt.format(m.premiumMedianN) + " · Median " + fmt.format(m.premiumMedianSec) + " s · interne Verarbeitungszeit, nicht ab Shop-Veröffentlichung";
  const n3 = $('[data-stat-note="free-delay"]');
  if (n3 && Number.isFinite(m.freeMedianMin)) n3.textContent = "gemessen: Median " + fmt.format(m.freeMedianMin) + " Min · " + (m.freeEarly === 0 ? "keiner vor Ablauf der " + m.freeDelayMin + " Minuten" : fmt.format(m.freeEarly) + " vor Ablauf der " + m.freeDelayMin + " Minuten");
  const n4 = $('[data-stat-note="shops"]'); const cl = countryLine(m.shopsByCountry); if (n4 && cl) n4.textContent = cl;
  const badge = $("#zahlen-live"), ago = $("#zahlen-ago");
  const fresh = Number.isFinite(Date.parse(s.generatedAt)) && (Date.now() - Date.parse(s.generatedAt) < 2 * 3600000);
  if (badge) { const show = !!(live && fresh); badge.hidden = !show; if (show && ago) ago.textContent = agoText(s.generatedAt); }
}
const fetchOne = (url, ms) => { const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms); return fetch(url, { cache: "no-store", signal: ac.signal, headers: { Accept: "application/json" } }).then(r => { if (!r.ok) throw new Error("http " + r.status); return r.json(); }).finally(() => clearTimeout(t)); };
const statsReady = (async () => {
  for (const url of STATS_URLS) {
    try { const s = validStats(await fetchOne(url, 2500)); if (!s) continue; applyStats(s, true); try { localStorage.setItem(STATS_LS, JSON.stringify(s)); } catch (e) {} return; } catch (e) {}
  }
  try { const s = validStats(JSON.parse(localStorage.getItem(STATS_LS) || "")); if (s) applyStats(s, false); } catch (e) {}
})();
const cio = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; cio.unobserve(e.target);
  const el = e.target;
  const run = () => {
    const to = +el.dataset.to; if (!Number.isFinite(to)) return;
    if (reduce) { el.textContent = fmt.format(Math.round(to)); return; }
    const t0 = performance.now(), dur = 1400 + Math.min(to, 600);
    const step = t => { const p = clamp((t - t0) / dur), q = 1 - Math.pow(1 - p, 4); el.textContent = fmt.format(Math.round(to * q)); if (p < 1) requestAnimationFrame(step); };
    el.textContent = "0"; requestAnimationFrame(step);
  };
  Promise.race([statsReady, new Promise(r => setTimeout(r, 2500))]).then(run, run);
}), { threshold: .6 });
$$(".cnt").forEach(el => cio.observe(el));

/* ---------------- Bildschirme (Canvas) ---------------- */
const mkCanvas = (w, h) => { const c = d.createElement("canvas"); c.width = w; c.height = h; return c; };
async function buildScreens() {
  try { await Promise.race([d.fonts.load("700 24px Inter"), new Promise(r => setTimeout(r, 1500))]); await d.fonts.load("500 20px Inter"); } catch (e) {}
  const [av, logo, c1, c2, c3] = await Promise.all([
    loadImg("../assets/img/logo-64.webp"), loadImg("../assets/img/logo-400.webp"),
    loadImg("../assets/img/creature-fire.webp"), loadImg("../assets/img/creature-grass.webp"), loadImg("../assets/img/creature-water.webp")
  ]);
  const screens = [0, 1, 2, 3, 4].map(() => mkCanvas(SW, SH));
  drawDrop(screens[0].getContext("2d"), av);
  drawNews(screens[1].getContext("2d"), av);
  drawArchive(screens[2].getContext("2d"), av, [c1, c2, c3]);
  drawPremium(screens[3].getContext("2d"), av);
  drawWelcome(screens[4].getContext("2d"), av, logo);
  const notif = mkCanvas(900, 220); drawNotif(notif.getContext("2d"), av, 900, 220);
  const bPrem = mkCanvas(560, 120); drawBadge(bPrem.getContext("2d"), 560, 120, "Premium · sofort", "#f7c35c");
  const bFree = mkCanvas(560, 120); drawBadge(bFree.getContext("2d"), 560, 120, "Kostenlos · +15 Min", "#2ee6ff");
  return { screens, notif, bPrem, bFree, logo };
}

/* ---------------- Static fallback ---------------- */
function goStatic(assets) {
  root.classList.add("static", "loaded");
  if (!assets) return;
  $$("[data-fig]").forEach(fig => {
    const i = +fig.dataset.fig; const cv = assets.screens[i]; if (!cv) return;
    const wrap = d.createElement("div"); wrap.className = "sphone";
    const img = new Image(); img.alt = "Nachgebaute Discord-Ansicht (Beispiel)"; img.width = SW; img.height = SH;
    try { img.src = cv.toDataURL("image/webp", .86); } catch (e) {}
    wrap.appendChild(img); fig.appendChild(wrap);
  });
}

function webglOK() {
  try { const c = d.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (e) { return false; }
}

/* ---------------- 3D ---------------- */
function rrShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function planeUV(geo, w, h) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5);
  uv.needsUpdate = true; return geo;
}
function radialTex(size = 256, stops = [[0, "rgba(255,255,255,1)"], [1, "rgba(255,255,255,0)"]]) {
  const c = mkCanvas(size, size), x = c.getContext("2d");
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col)); x.fillStyle = g; x.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

async function start3D(assets) {
  const canvas = $("#gl"), stage = $("#stage");
  const isMobile = () => stage.clientWidth < 761 || stage.clientWidth / stage.clientHeight < .8;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  const DPR = Math.min(window.devicePixelRatio || 1, isMobile() ? 2 : 1.75);
  renderer.setPixelRatio(DPR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 60); camera.position.set(0, 0, 8);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const accent = new THREE.Color("#2ee6ff"), accentTarget = accent.clone();

  const texLoader = new THREE.TextureLoader();
  const loadTex = (src) => new Promise(res => texLoader.load(src, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; res(t); }, undefined, () => res(null)));
  const [logoT, fog1, fog2] = await Promise.all([loadTex("../assets/img/logo-400.webp"), loadTex("../assets/img/fog-1.webp"), loadTex("../assets/img/fog-2.webp")]);

  /* lights */
  scene.add(new THREE.AmbientLight(0xffffff, .25));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-3, 4, 5); scene.add(key);
  const accLight = new THREE.PointLight(accent, 30, 14, 2); accLight.position.set(2.5, 1, 3); scene.add(accLight);
  const violetLight = new THREE.PointLight(0x9b6bff, 24, 14, 2); violetLight.position.set(-3, -1.5, 2); scene.add(violetLight);

  /* particles */
  const PN = isMobile() ? 260 : 480, pos = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) { pos[i * 3] = (Math.random() - .5) * 16; pos[i * 3 + 1] = (Math.random() - .5) * 10; pos[i * 3 + 2] = -Math.random() * 12 + 2; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pmat = new THREE.PointsMaterial({ size: .05, map: radialTex(64), color: 0xbfefff, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const points = new THREE.Points(pg, pmat); scene.add(points);

  /* fog */
  const fogs = [];
  const fogGeo = new THREE.PlaneGeometry(1, 1);
  const fogDefs = [
    [-2.6, .8, -4, 9, .55, 0x9b6bff, fog1], [2.8, -.6, -4.5, 10, .5, 0x2ee6ff, fog2], [0, -2.2, -3, 11, .45, 0x9b6bff, fog2], [-.5, 2.2, -5.5, 12, .4, 0x5c3cff, fog1],
    [-1.4, -.3, 1.2, 6, .75, 0xb28cff, fog1], [1.5, .4, 1.8, 6, .7, 0x6fe9ff, fog2], [0, 0, 2.6, 7, .65, 0x9b6bff, fog1]
  ];
  fogDefs.forEach(([x, y, z, s, op, col, map], i) => {
    const m = new THREE.MeshBasicMaterial({ map, color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending });
    const mesh = new THREE.Mesh(fogGeo, m); mesh.position.set(x, y, z); mesh.scale.set(s, s * .62, 1); mesh.rotation.z = i * 1.3;
    mesh.userData = { base: new THREE.Vector3(x, y, z), op, front: z > 0, spd: (i % 2 ? 1 : -1) * (.03 + i * .006) };
    scene.add(mesh); fogs.push(mesh);
  });

  /* coin: crowned silver P */
  const coin = new THREE.Group(); scene.add(coin);
  const silver = new THREE.MeshPhysicalMaterial({ color: 0xd9dce4, metalness: 1, roughness: .22, clearcoat: .6, clearcoatRoughness: .2 });
  const coinT = logoT ? logoT.clone() : null; if (coinT) { coinT.center.set(.5, .5); coinT.rotation = Math.PI; coinT.needsUpdate = true; }
  const capMat = new THREE.MeshStandardMaterial({ map: coinT, emissiveMap: coinT, emissive: 0xffffff, emissiveIntensity: .55, metalness: .25, roughness: .35, transparent: true });
  const coinGeo = new THREE.CylinderGeometry(1, 1, .14, 96, 1);
  const coinMesh = new THREE.Mesh(coinGeo, [silver, capMat, capMat]); coinMesh.rotation.x = Math.PI / 2; coinMesh.rotation.y = -Math.PI / 2; coin.add(coinMesh);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.0, .075, 24, 128), silver); coin.add(rim);
  const coinHalo = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), new THREE.MeshBasicMaterial({ map: radialTex(256, [[0, "rgba(255,255,255,.9)"], [.35, "rgba(255,255,255,.25)"], [1, "rgba(255,255,255,0)"]]), color: 0x9b6bff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  coinHalo.position.z = -.6; coin.add(coinHalo);
  const coinMats = [silver, capMat];

  /* phone */
  const PW = 1.5, PH = 3.1, PR = .26, PD = .12, BEV = .035;
  const phone = new THREE.Group(); scene.add(phone);
  const pivot = new THREE.Group(); phone.add(pivot);
  const bodyGeo = new THREE.ExtrudeGeometry(rrShape(PW, PH, PR), { depth: PD, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 5, curveSegments: 20 });
  bodyGeo.translate(0, 0, -PD / 2);
  const frameMat = new THREE.MeshPhysicalMaterial({ color: 0xc8ccd6, metalness: 1, roughness: .2, clearcoat: 1, clearcoatRoughness: .12 });
  pivot.add(new THREE.Mesh(bodyGeo, frameMat));
  const FZ = PD / 2 + BEV;
  const glass = new THREE.Mesh(planeUV(new THREE.ShapeGeometry(rrShape(PW + .02, PH + .02, PR + .01), 20), PW, PH), new THREE.MeshPhysicalMaterial({ color: 0x050507, roughness: .05, metalness: 0, clearcoat: 1 }));
  glass.position.z = FZ + .002; pivot.add(glass);
  const SWW = PW - .1, SHH = SWW * SH / SW;
  const screenTex = assets.screens.map(c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; });
  const screenMat = new THREE.ShaderMaterial({
    uniforms: { tA: { value: screenTex[0] }, tB: { value: screenTex[0] }, mixv: { value: 0 }, glow: { value: new THREE.Color() }, bright: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: `uniform sampler2D tA; uniform sampler2D tB; uniform float mixv; uniform vec3 glow; uniform float bright; varying vec2 vUv;
      void main(){ float m=smoothstep(0.0,1.0,mixv); vec2 ua=vUv+vec2(0.0,m*0.06); vec2 ub=vUv-vec2(0.0,(1.0-m)*0.06);
        vec4 a=texture2D(tA,ua); vec4 b=texture2D(tB,ub); vec4 c=mix(a,b,m);
        float e=smoothstep(0.0,0.06,vUv.y)*smoothstep(0.0,0.06,1.0-vUv.y); c.rgb*=bright; c.rgb+=glow*0.05*(1.0-e);
        gl_FragColor=vec4(c.rgb,1.0);
        #include <colorspace_fragment>
      }`,
    toneMapped: false
  });
  const screen = new THREE.Mesh(planeUV(new THREE.ShapeGeometry(rrShape(SWW, SHH, PR - .06), 20), SWW, SHH), screenMat);
  screen.position.z = FZ + .004; pivot.add(screen);
  // screen reflection sheen
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(SWW * 1.8, .9), new THREE.MeshBasicMaterial({ map: radialTex(128, [[0, "rgba(255,255,255,.22)"], [1, "rgba(255,255,255,0)"]]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sheen.rotation.z = .5; sheen.position.z = FZ + .006; pivot.add(sheen);
  // neon rim (accent)
  const ringShape = rrShape(PW + BEV * 2 + .05, PH + BEV * 2 + .05, PR + BEV + .025); ringShape.holes.push(rrShape(PW + BEV * 2 - .005, PH + BEV * 2 - .005, PR + BEV - .003));
  const ringMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .95, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
  const ringF = new THREE.Mesh(new THREE.ShapeGeometry(ringShape, 24), ringMat); ringF.position.z = FZ - .015; pivot.add(ringF);
  const ringB = ringF.clone(); ringB.position.z = -FZ + .015; pivot.add(ringB);
  // back: dark glass + crowned P
  const back = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(PW + .02, PH + .02, PR + .01), 20), new THREE.MeshPhysicalMaterial({ color: 0x0c0a16, metalness: .4, roughness: .25, clearcoat: 1 }));
  back.rotation.y = Math.PI; back.position.z = -FZ - .002; pivot.add(back);
  const backLogo = new THREE.Mesh(new THREE.CircleGeometry(.48, 64), new THREE.MeshStandardMaterial({ map: logoT, emissiveMap: logoT, emissive: 0xffffff, emissiveIntensity: .6, roughness: .3 }));
  backLogo.rotation.y = Math.PI; backLogo.position.set(0, .45, -FZ - .006); pivot.add(backLogo);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .04, 40), new THREE.MeshPhysicalMaterial({ color: 0x111111, metalness: .8, roughness: .15, clearcoat: 1 }));
  lens.rotation.x = Math.PI / 2; lens.position.set(.42, 1.18, -FZ - .02); pivot.add(lens);
  const lensRing = new THREE.Mesh(new THREE.TorusGeometry(.14, .018, 12, 40), frameMat); lensRing.position.set(.42, 1.18, -FZ - .03); pivot.add(lensRing);
  // side buttons
  const btnGeo = new THREE.BoxGeometry(.03, .34, .06);
  [[PW / 2 + BEV + .005, .55, .34], [-PW / 2 - BEV - .005, .75, .22], [-PW / 2 - BEV - .005, .42, .22]].forEach(([x, y, h]) => { const b = new THREE.Mesh(btnGeo, frameMat); b.position.set(x, y, 0); b.scale.y = h / .34; pivot.add(b); });
  // halo behind phone
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 6.2), new THREE.MeshBasicMaterial({ map: radialTex(256, [[0, "rgba(255,255,255,.55)"], [.45, "rgba(255,255,255,.12)"], [1, "rgba(255,255,255,0)"]]), color: accent, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  halo.position.z = -.7; phone.add(halo);
  // pop-out notification + premium badges
  const mkPlane = (cv, w) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * cv.height / cv.width), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false })); m.visible = false; return m; };
  const notif = mkPlane(assets.notif, 1.75); notif.position.set(0, 1.0, .45); pivot.add(notif);
  const bPrem = mkPlane(assets.bPrem, 1.15); bPrem.position.set(.45, .95, .4); pivot.add(bPrem);
  const bFree = mkPlane(assets.bFree, 1.15); bFree.position.set(-.45, -.35, .4); pivot.add(bFree);

  /* layout */
  let W = 0, H = 0, mobile = false;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w === W && Math.abs(h - H) < 2) return;
    W = w; H = h; mobile = isMobile();
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = mobile ? 38 : 32; camera.updateProjectionMatrix();
  }
  resize(); addEventListener("resize", resize, { passive: true });

  /* phone keyframes (desktop units) */
  const K = [
    [.10, { x: 0, y: -4.6, rx: .7, ry: -2.6, rz: .25, s: .9 }],
    [.21, { x: 1.55, y: 0, rx: .08, ry: -.42, rz: .03, s: 1 }],
    [.34, { x: 1.55, y: .05, rx: .02, ry: -.28, rz: 0, s: 1 }],
    [.40, { x: -1.55, y: 0, rx: .06, ry: .42, rz: -.03, s: 1 }],
    [.52, { x: -1.55, y: .05, rx: .02, ry: .28, rz: 0, s: 1 }],
    [.585, { x: 1.55, y: 0, rx: .1, ry: -.42 + TAU, rz: .03, s: 1 }],
    [.69, { x: 1.55, y: .05, rx: .02, ry: -.28 + TAU, rz: 0, s: 1 }],
    [.75, { x: -1.55, y: 0, rx: .06, ry: .42 + TAU, rz: -.03, s: 1 }],
    [.86, { x: -1.55, y: .05, rx: .02, ry: .28 + TAU, rz: 0, s: 1 }],
    [.93, { x: 0, y: .04, rx: -.04, ry: TAU, rz: 0, s: 1.04 }],
    [1.0, { x: 0, y: .04, rx: 0, ry: TAU + .15, rz: 0, s: 1.04 }]
  ];
  const tmp = {};
  function phoneAt(p) {
    let i = 0; while (i < K.length - 1 && p > K[i + 1][0]) i++;
    const [p0, a] = K[i], [p1, b] = K[Math.min(i + 1, K.length - 1)];
    const t = p1 === p0 ? 0 : smooth(p0, p1, p);
    for (const k in a) tmp[k] = lerp(a[k], b[k], p < p0 ? 0 : t);
    return tmp;
  }
  const TR = [[.34, .40], [.52, .58], [.69, .75], [.86, .905]];
  function screenAt(p) {
    let idx = 0;
    for (let k = 0; k < TR.length; k++) {
      const [a, b] = TR[k];
      if (p >= b) idx = k + 1; else if (p > a) return [k, k + 1, (p - a) / (b - a)];
    }
    return [idx, idx, 0];
  }

  /* panels + UI */
  const panels = $$(".panel").map(el => ({ el, a: +el.dataset.a, b: +el.dataset.b, side: el.classList.contains("side-l") ? -1 : el.classList.contains("side-r") ? 1 : 0, last: -1 }));
  const panelsBox = $(".panels"), sw = $("#swatches"), hint = $("#hint");
  function updatePanels(p) {
    let any = false;
    panels.forEach(o => {
      const fi = o.a <= 0 ? 1 : smooth(o.a, o.a + .028, p), fo = 1 - smooth(o.b - .028, o.b, p);
      const v = Math.min(fi, fo);
      if (v > .02) any = true;
      const q = Math.round(v * 1000) / 1000; if (q === o.last) return; o.last = q;
      const off = (1 - v) * (p < (o.a + o.b) / 2 ? 1 : -1);
      o.el.style.opacity = q;
      o.el.style.transform = mobile || !o.side ? `translate3d(0,${off * 26}px,0)` : `translate3d(${o.side * -off * 48}px,-50%,0)`;
      o.el.style.visibility = v < .01 ? "hidden" : "visible";
    });
    panelsBox.classList.toggle("dim", !any);
    sw.classList.toggle("on", p > .2 && p < .995);
    sw.classList.toggle("big", p > .89);
    hint.style.opacity = 1 - smooth(.0, .03, p);
  }

  /* swatches */
  const names = { "#2ee6ff": "Cyan", "#9b6bff": "Violett", "#f7c35c": "Gold", "#ff5fd2": "Pink" };
  sw.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    sw.querySelectorAll("button").forEach(o => o.setAttribute("aria-checked", String(o === b)));
    accentTarget.set(b.dataset.c); root.style.setProperty("--acc", b.dataset.c); $("#sw-name").textContent = names[b.dataset.c] || "";
    pulse = 1;
  }));
  let pulse = 0;

  /* scroll progress via GSAP ScrollTrigger (fallback: manual) */
  let target = 0, prog = 0;
  const storyEl = $("#story");
  const manual = () => { const r = storyEl.getBoundingClientRect(); const len = storyEl.offsetHeight - stage.clientHeight; target = clamp(-r.top / Math.max(1, len)); };
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({ trigger: storyEl, start: "top top", end: "bottom bottom", onUpdate: self => { target = self.progress; } });
    ScrollTrigger.config({ ignoreMobileResize: true });
    manual();
  } else { addEventListener("scroll", manual, { passive: true }); manual(); }

  /* visibility: render only while the story is on screen */
  let inView = true;
  new IntersectionObserver(es => es.forEach(e => { inView = e.isIntersecting; })).observe(storyEl);

  const clock = new THREE.Clock(); let t0 = null, frames = 0, fpsT = 0;
  window.__pt3d = { fps: 0, progress: () => prog };
  root.classList.add("loaded");
  const tmpC = new THREE.Color();

  function frame() {
    requestAnimationFrame(frame);
    if (!inView) return;
    const dt = Math.min(clock.getDelta(), .05), time = clock.elapsedTime;
    if (t0 === null) t0 = time;
    frames++; fpsT += dt; if (fpsT > 1) { window.__pt3d.fps = Math.round(frames / fpsT); frames = 0; fpsT = 0; }
    prog += (target - prog) * (1 - Math.pow(.0009, dt));   // frame-rate independent damping
    if (Math.abs(target - prog) < 1e-5) prog = target;
    const p = prog;
    accent.lerp(accentTarget, 1 - Math.pow(.002, dt));
    pulse = Math.max(0, pulse - dt * 1.6);

    /* intro: coin emerges from the fog */
    const appear = 1 - Math.pow(1 - clamp((time - t0 - .15) / 2.6), 3);
    const out = smooth(.09, .175, p);
    coin.visible = out < .999;
    if (coin.visible) {
      coin.position.set(0, (mobile ? .55 : .35) + out * 3.6 + Math.sin(time * 1.1) * .04, lerp(-7, 0, appear) - out * 1.2);
      const cs = (mobile ? .82 : 1) * (.55 + .45 * appear) * (1 + p * .8);
      coin.scale.setScalar(cs);
      coin.rotation.set(Math.sin(time * .6) * .08 - out * .6, (1 - appear) * -2.4 + Math.sin(time * .5) * .22 + p * 4 + out * Math.PI, 0);
      const op = appear * (1 - out);
      coinMats.forEach(m => { m.transparent = true; m.opacity = op; });
      coinHalo.material.opacity = op * (.55 + .15 * Math.sin(time * 1.7));
    }

    /* fog + particles */
    fogs.forEach((f, i) => {
      const u = f.userData;
      f.rotation.z += u.spd * dt;
      if (u.front) {
        const clear = Math.max(appear * .75, smooth(0, .12, p));
        f.position.set(u.base.x * (1 + clear * 1.6), u.base.y, u.base.z + clear * 3);
        f.material.opacity = u.op * (1 - clear) ;
        f.visible = f.material.opacity > .01;
      } else {
        f.position.set(u.base.x + Math.sin(time * .1 + i) * .3, u.base.y + Math.cos(time * .08 + i) * .2, u.base.z);
        f.material.opacity = u.op * (.75 + .25 * Math.sin(time * .3 + i)) * (1 - .45 * smooth(.12, .3, p));
      }
    });
    points.rotation.y = time * .012 + p * .6; points.position.z = p * 4;

    /* phone */
    phone.visible = p > .095;
    if (phone.visible) {
      const s = phoneAt(p);
      const mx = mobile ? .07 : 1, my = mobile ? .62 : 0, ms = mobile ? .86 : 1;
      phone.position.set(s.x * mx, s.y + (s.y > -1 ? my : my * .3) + Math.sin(time * 1.2) * .03, 0);
      pivot.rotation.set(s.rx + Math.sin(time * .9) * .015, s.ry + Math.sin(time * .7) * .025, s.rz);
      phone.scale.setScalar(s.s * ms);
      const [A, B, m] = screenAt(p);
      screenMat.uniforms.tA.value = screenTex[A]; screenMat.uniforms.tB.value = screenTex[B]; screenMat.uniforms.mixv.value = m;
      screenMat.uniforms.glow.value.copy(accent);
      sheen.position.y = lerp(1.8, -1.8, (p * 6) % 1);
      ringMat.color.copy(accent).multiplyScalar(1 + pulse * 1.5);
      halo.material.color.copy(tmpC.copy(accent).multiplyScalar(.9 + .1 * Math.sin(time * 2) + pulse));
      accLight.color.copy(accent);
      // notification pop (drop chapter)
      const nv = smooth(.225, .265, p) * (1 - smooth(.325, .345, p));
      notif.visible = nv > .01; notif.material.opacity = nv; notif.scale.setScalar(.7 + .3 * nv); notif.position.z = .2 + .35 * nv;
      const pv = smooth(.765, .8, p) * (1 - smooth(.845, .865, p));
      bPrem.visible = bFree.visible = pv > .01;
      bPrem.material.opacity = pv; bFree.material.opacity = smooth(.79, .82, p) * (1 - smooth(.845, .865, p));
      bPrem.position.z = .15 + .3 * pv; bFree.position.z = .15 + .3 * bFree.material.opacity;
      bPrem.scale.setScalar(.8 + .2 * pv + .03 * Math.sin(time * 3));
    }
    updatePanels(p);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}

/* ---------------- boot ---------------- */
(async () => {
  let assets = null;
  try { assets = await buildScreens(); } catch (e) { console.warn("screens", e); }
  if (forceStatic || reduce || !webglOK() || !assets) { goStatic(assets); return; }
  try { await start3D(assets); }
  catch (e) { console.warn("3D nicht verfügbar, statische Ansicht", e); goStatic(assets); }
})();
