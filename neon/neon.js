/* PullTopia Neon-Vorschau: Echtzeit-3D-Sammelkarte (three.js, MIT). Kein Tracking, keine externen Dienste. */
import * as THREE from "three";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";
import { EffectComposer } from "./vendor/postprocessing/EffectComposer.js";
import { RenderPass } from "./vendor/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./vendor/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "./vendor/postprocessing/OutputPass.js";

const d = document, root = d.documentElement, PT = window.PT || { progress() {}, done() {}, onReady() {} };
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
let mobile = innerWidth < 820;
const HQ = /[?&]hq\b/.test(location.search);

function fail(why) { console.info("[neon] Fallback ohne WebGL:", why); root.classList.add("no-gl"); PT.done(); }

/* ---------- WebGL prüfen ---------- */
const canvas = d.getElementById("gl");
let renderer;
try {
  const test = d.createElement("canvas").getContext("webgl2") || d.createElement("canvas").getContext("webgl");
  if (!test) throw new Error("kein WebGL");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: false, powerPreference: "high-performance" });
} catch (e) { fail(e.message); }

if (renderer) start().catch(e => { console.warn("[neon]", e); fail("Fehler beim Aufbau"); });

/* ---------- Hilfen: Texturen per Canvas ---------- */
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.decoding = "async"; i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
function rr(x, ctx, X, Y, W, H, R) { ctx.beginPath(); ctx.moveTo(X + R, Y); ctx.arcTo(X + W, Y, X + W, Y + H, R); ctx.arcTo(X + W, Y + H, X, Y + H, R); ctx.arcTo(X, Y + H, X, Y, R); ctx.arcTo(X, Y, X + W, Y, R); ctx.closePath(); }
function silver(ctx, y0, y1) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, "#ffffff"); g.addColorStop(.45, "#c9ccdb"); g.addColorStop(.55, "#8e91a8"); g.addColorStop(1, "#f2f3fa"); return g; }

function drawFront(logo, W, H) {
  const c = d.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"); const u = W / 1000;
  // Grund
  let g = x.createRadialGradient(W / 2, H * .38, 10, W / 2, H * .45, H * .75);
  g.addColorStop(0, "#2b1258"); g.addColorStop(.45, "#120826"); g.addColorStop(1, "#040309");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // Hex-Raster
  x.strokeStyle = "rgba(155,92,255,.13)"; x.lineWidth = 1.2 * u; const s = 46 * u;
  for (let row = 0; row * s * .866 < H + s; row++) for (let col = 0; col * s * 1.5 < W + s; col++) {
    const cx = col * s * 1.5 + (row % 2) * s * .75, cy = row * s * .866; x.beginPath();
    for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k; x.lineTo(cx + Math.cos(a) * s * .48, cy + Math.sin(a) * s * .48); } x.closePath(); x.stroke();
  }
  // Silberrahmen + Neonlinie
  x.lineWidth = 26 * u; x.strokeStyle = silver(x, 0, H); rr(0, x, 18 * u, 18 * u, W - 36 * u, H - 36 * u, 48 * u); x.stroke();
  x.save(); x.shadowColor = "#41f2ff"; x.shadowBlur = 24 * u; x.lineWidth = 4 * u; x.strokeStyle = "#7ff7ff"; rr(0, x, 46 * u, 46 * u, W - 92 * u, H - 92 * u, 30 * u); x.stroke(); x.restore();
  // Kopfzeile
  x.textAlign = "center"; x.textBaseline = "middle";
  x.font = `700 ${52 * u}px Cinzel, Georgia, serif`; x.fillStyle = silver(x, 80 * u, 140 * u); x.fillText("PULLTOPIA NEXUS", W / 2, 118 * u);
  x.font = `600 ${22 * u}px Inter, sans-serif`; x.fillStyle = "#41f2ff"; x.fillText("✦  CARDVERSE · FIRST EDITION  ✦", W / 2, 168 * u);
  // Bildfenster
  const fx = 90 * u, fy = 210 * u, fw = W - 180 * u, fh = 760 * u;
  x.save(); rr(0, x, fx, fy, fw, fh, 22 * u); x.clip();
  g = x.createRadialGradient(W / 2, fy + fh * .48, 20 * u, W / 2, fy + fh * .5, fw * .75);
  g.addColorStop(0, "#6a3bd1"); g.addColorStop(.35, "#2a1166"); g.addColorStop(1, "#07040f"); x.fillStyle = g; x.fillRect(fx, fy, fw, fh);
  // Strahlen
  x.globalCompositeOperation = "lighter";
  for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2; x.strokeStyle = k % 2 ? "rgba(65,242,255,.07)" : "rgba(201,166,255,.08)"; x.lineWidth = 18 * u; x.beginPath(); x.moveTo(W / 2, fy + fh * .5); x.lineTo(W / 2 + Math.cos(a) * fw, fy + fh * .5 + Math.sin(a) * fw); x.stroke(); }
  for (let r = 1; r < 9; r++) { x.strokeStyle = `rgba(65,242,255,${.16 - r * .015})`; x.lineWidth = 2 * u; x.beginPath(); x.arc(W / 2, fy + fh * .5, r * 44 * u, 0, Math.PI * 2); x.stroke(); }
  x.globalCompositeOperation = "source-over";
  x.shadowColor = "rgba(155,92,255,.95)"; x.shadowBlur = 60 * u; const ls = 640 * u; x.drawImage(logo, W / 2 - ls / 2, fy + fh * .5 - ls / 2, ls, ls);
  x.shadowBlur = 0; x.restore();
  x.lineWidth = 5 * u; x.strokeStyle = silver(x, fy, fy + fh); rr(0, x, fx, fy, fw, fh, 22 * u); x.stroke();
  // Namensplatte
  const py = 1000 * u; x.fillStyle = "rgba(10,6,22,.85)"; rr(0, x, fx, py, fw, 110 * u, 16 * u); x.fill();
  x.lineWidth = 3 * u; x.strokeStyle = "rgba(155,92,255,.8)"; x.stroke();
  x.font = `700 ${50 * u}px Cinzel, Georgia, serif`; x.fillStyle = silver(x, py, py + 110 * u); x.fillText("Das gekrönte P", W / 2, py + 50 * u);
  x.font = `500 ${21 * u}px Inter, sans-serif`; x.fillStyle = "#c9a6ff"; x.fillText("Legendär · Nexus-Hüter", W / 2, py + 88 * u);
  // Werte
  x.font = `600 ${23 * u}px Inter, sans-serif`; x.fillStyle = "#e6e5f3";
  ["DROPS", "NEWS", "TAUSCH", "SAMMELN"].forEach((t, i) => x.fillText(t, fx + fw * (i + .5) / 4, 1175 * u));
  x.fillStyle = "#41f2ff"; [0, 1, 2, 3].forEach(i => { x.beginPath(); x.arc(fx + fw * (i + .5) / 4, 1213 * u, 5 * u, 0, 7); x.fill(); });
  x.font = `500 ${19 * u}px Inter, sans-serif`; x.fillStyle = "#8a86ab"; x.textAlign = "left"; x.fillText("#001 / 001", fx, 1290 * u);
  x.textAlign = "right"; x.fillText("PT-NX ✦ HOLO", fx + fw, 1290 * u);
  return c;
}

function drawBack(logo, W, H) {
  const c = d.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"); const u = W / 1000;
  x.fillStyle = "#05040c"; x.fillRect(0, 0, W, H);
  let g = x.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, H * .6); g.addColorStop(0, "rgba(120,60,255,.55)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = "lighter";
  for (let r = 1; r < 34; r++) { x.strokeStyle = r % 3 ? `rgba(65,242,255,${.22 - r * .005})` : `rgba(201,166,255,${.3 - r * .006})`; x.lineWidth = (r % 3 ? 2 : 3.5) * u; x.beginPath(); x.arc(W / 2, H / 2, r * 24 * u, 0, Math.PI * 2); x.stroke(); }
  // Rautenmuster
  x.strokeStyle = "rgba(155,92,255,.18)"; x.lineWidth = 1.5 * u;
  for (let k = -H; k < W + H; k += 70 * u) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + H * .7, H); x.stroke(); x.beginPath(); x.moveTo(k, H); x.lineTo(k + H * .7, 0); x.stroke(); }
  x.globalCompositeOperation = "source-over";
  x.lineWidth = 26 * u; x.strokeStyle = silver(x, 0, H); rr(0, x, 18 * u, 18 * u, W - 36 * u, H - 36 * u, 48 * u); x.stroke();
  x.save(); x.shadowColor = "#9b5cff"; x.shadowBlur = 26 * u; x.lineWidth = 4 * u; x.strokeStyle = "#c9a6ff"; rr(0, x, 46 * u, 46 * u, W - 92 * u, H - 92 * u, 30 * u); x.stroke(); x.restore();
  // Medaillon
  x.save(); x.fillStyle = "rgba(5,4,12,.85)"; x.beginPath(); x.arc(W / 2, H * .44, 250 * u, 0, 7); x.fill();
  x.lineWidth = 6 * u; x.strokeStyle = silver(x, H * .44 - 250 * u, H * .44 + 250 * u); x.stroke();
  x.shadowColor = "#41f2ff"; x.shadowBlur = 40 * u; const ls = 400 * u; x.drawImage(logo, W / 2 - ls / 2, H * .44 - ls / 2, ls, ls); x.restore();
  x.textAlign = "center"; x.textBaseline = "middle";
  x.font = `800 ${86 * u}px Cinzel, Georgia, serif`; x.fillStyle = silver(x, H * .74, H * .8); x.fillText("PULLTOPIA", W / 2, H * .77);
  x.font = `600 ${24 * u}px Inter, sans-serif`; x.fillStyle = "#41f2ff"; x.fillText("N E X U S  ·  C A R D V E R S E", W / 2, H * .83);
  return c;
}

function drawGiant(portrait) {
  const c = d.createElement("canvas"); const x = c.getContext("2d");
  if (portrait) { c.width = 2048; c.height = 1700; } else { c.width = 4096; c.height = 900; }
  x.textAlign = "center"; x.textBaseline = "middle";
  const lines = portrait ? ["PULL", "TOPIA"] : ["PULLTOPIA"];
  const fs = portrait ? 700 : 760;
  x.font = `900 ${fs}px Cinzel, Georgia, serif`;
  // Breite anpassen
  const w = Math.max(...lines.map(l => x.measureText(l).width)); const k = Math.min(1, c.width * .98 / w);
  x.font = `900 ${fs * k}px Cinzel, Georgia, serif`;
  const lh = fs * k * .98, y0 = c.height / 2 - (lines.length - 1) * lh / 2;
  lines.forEach((l, i) => {
    const y = y0 + i * lh, g = x.createLinearGradient(0, y - lh / 2, 0, y + lh / 2);
    g.addColorStop(0, "#ffffff"); g.addColorStop(.5, "#a9acc2"); g.addColorStop(.62, "#5e6178"); g.addColorStop(1, "#cfd2e4");
    x.fillStyle = g; x.fillText(l, c.width / 2, y + fs * k * .04);
  });
  return c;
}

function glowTex() {
  const c = d.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.25, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function roundedShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
function faceGeo(shape, w, h) {
  const g = new THREE.ShapeGeometry(shape, 10); const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5); uv.needsUpdate = true; return g;
}

/* ---------- Hauptaufbau ---------- */
async function start() {
  window.PT_GL = true;
  PT.progress(16, "Lade Schriften");
  await Promise.race([Promise.all([d.fonts.load('900 100px "Cinzel"'), d.fonts.load('600 40px "Inter"')]), new Promise(r => setTimeout(r, 2500))]).catch(() => {});
  PT.progress(32, "Lade gekröntes P");
  const logo = await loadImg("../logo.png");
  PT.progress(48, "Prägen der Holo-Karte");

  const maxTex = renderer.capabilities.maxTextureSize, TW = mobile ? 1000 : 1400, TH = Math.round(TW * 1.4);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const mk = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };
  const frontTex = mk(drawFront(logo, Math.min(TW, maxTex), Math.min(TH, maxTex)));
  await new Promise(r => setTimeout(r, 0));
  const backTex = mk(drawBack(logo, Math.min(TW, maxTex), Math.min(TH, maxTex)));
  PT.progress(64, "Kalibriere Licht");

  let dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050409);
  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, .1, 100); camera.position.set(0, 0, 10);
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;

  /* Karte */
  const CW = 2.14, CH = 3.0, CR = .14, DEP = .045;
  const shape = roundedShape(CW, CH, CR);
  const card = new THREE.Group(), tiltG = new THREE.Group(); tiltG.add(card); scene.add(tiltG);
  const edge = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: DEP, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 3, curveSegments: 10 }),
    new THREE.MeshStandardMaterial({ color: 0xdfe2ee, metalness: 1, roughness: .22, emissive: 0x2a1458, emissiveIntensity: .6 }));
  edge.position.z = -DEP / 2; card.add(edge);
  const fg = faceGeo(shape, CW, CH);
  const frontMat = new THREE.MeshPhysicalMaterial({ map: frontTex, emissiveMap: frontTex, emissive: 0xffffff, emissiveIntensity: .32, metalness: .35, roughness: .32, clearcoat: 1, clearcoatRoughness: .12, iridescence: .6, iridescenceIOR: 1.6 });
  const front = new THREE.Mesh(fg, frontMat); front.position.z = DEP / 2 + .0135; card.add(front);
  const backMat = new THREE.MeshPhysicalMaterial({ map: backTex, emissiveMap: backTex, emissive: 0xffffff, emissiveIntensity: .36, metalness: .3, roughness: .35, clearcoat: 1, clearcoatRoughness: .15 });
  const back = new THREE.Mesh(fg, backMat); back.rotation.y = Math.PI; back.position.z = -DEP / 2 - .0135; card.add(back);

  // Holo-Folie (additiv, blickwinkelabhängig)
  const holoU = { uTime: { value: 0 }, uTilt: { value: new THREE.Vector2() }, uStr: { value: .2 } };
  const holoMat = new THREE.ShaderMaterial({
    uniforms: holoU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 wp=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-wp.xyz); gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform float uTime; uniform vec2 uTilt; uniform float uStr; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      vec3 hsv(float h){ return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      void main(){
        float f = 1.0 - abs(dot(vN, vV));
        float band = vUv.x*1.3 + vUv.y*0.9 + uTilt.x*1.1 + uTilt.y*0.7 + uTime*0.03;
        vec3 col = hsv(fract(band)) ;
        float stripes = 0.55 + 0.45*sin((vUv.x - vUv.y)*38.0 + uTilt.x*9.0);
        float edgeM = smoothstep(0.30, 0.5, max(abs(vUv.x-.5), abs(vUv.y-.5)*0.95));
        float win = 1.0 - smoothstep(0.0, 0.02, max(abs(vUv.x-.5)-0.41, abs(vUv.y-0.595)-0.27));
        float m = mix(0.35, 1.0, edgeM) * (0.55 + 0.45*win) ;
        vec2 g = floor(vUv*vec2(160.,224.)); float sp = step(0.985, hash(g)) * (0.5+0.5*sin(uTime*3.0 + hash(g+1.)*40. + uTilt.x*20.));
        float a = uStr * (0.18 + f*1.6) * stripes * m;
        gl_FragColor = vec4(col * a + vec3(sp)*0.9*uStr, 1.0);
      }`
  });
  const holo = new THREE.Mesh(fg, holoMat); holo.position.z = DEP / 2 + .0145; card.add(holo);
  const holoB = new THREE.Mesh(fg, holoMat); holoB.rotation.y = Math.PI; holoB.position.z = -DEP / 2 - .0145; card.add(holoB);

  // Halo hinter der Karte
  const gt = glowTex();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: 0x7b3cff, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(7.5, 7.5, 1); halo.position.z = -1.2; scene.add(halo);
  const halo2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: 0x1fd8ff, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo2.scale.set(4.5, 6, 1); halo2.position.z = -1.0; scene.add(halo2);

  // Lichter
  scene.add(new THREE.AmbientLight(0x6a5aa0, .35));
  const lC = new THREE.PointLight(0x41f2ff, 18, 20, 1.6), lV = new THREE.PointLight(0xa06bff, 22, 20, 1.6), key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(2, 3, 6); scene.add(lC, lV, key);

  // Riesenschrift hinter der Karte
  let giantPortrait = innerWidth / innerHeight < .9;
  const giantMat = new THREE.MeshBasicMaterial({ map: mk(drawGiant(giantPortrait)), transparent: true, opacity: .92, depthWrite: false, toneMapped: false, color: 0xbfc2d8 });
  const giant = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), giantMat); giant.position.z = -3.2; scene.add(giant);
  const GZ = 10 - giant.position.z;
  function fitGiant() {
    const portrait = innerWidth / innerHeight < .9;
    if (portrait !== giantPortrait) { giantPortrait = portrait; giantMat.map.dispose(); giantMat.map = mk(drawGiant(portrait)); giantMat.needsUpdate = true; }
    const vh = 2 * GZ * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), vw = vh * camera.aspect;
    const ar = giantMat.map.image.width / giantMat.map.image.height; let w = vw * .94, h = w / ar; if (h > vh * .8) { h = vh * .8; w = h * ar; }
    giant.scale.set(w, h, 1);
  }

  // Partikel
  const N = mobile ? 380 : 1400, pos = new Float32Array(N * 3), seed = new Float32Array(N), col = new Float32Array(N * 3);
  const cA = new THREE.Color(0x41f2ff), cB = new THREE.Color(0xb48cff), cC = new THREE.Color(0xffffff);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - .5) * 22; pos[i * 3 + 1] = (Math.random() - .5) * 14; pos[i * 3 + 2] = -6 + Math.random() * 11;
    seed[i] = Math.random(); const cc = Math.random() < .45 ? cA : Math.random() < .8 ? cB : cC; col.set([cc.r, cc.g, cc.b], i * 3);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); pg.setAttribute("seed", new THREE.BufferAttribute(seed, 1)); pg.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const pU = { uTime: { value: 0 }, uScroll: { value: 0 }, uPx: { value: dpr } };
  const pts = new THREE.Points(pg, new THREE.ShaderMaterial({
    uniforms: pU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, toneMapped: false,
    vertexShader: `attribute float seed; uniform float uTime; uniform float uScroll; uniform float uPx; varying vec3 vC; varying float vA;
      void main(){ vec3 p=position; float t=uTime*(0.05+seed*0.08);
        p.y = mod(p.y + t + uScroll*(0.6+seed) + 7.0, 14.0) - 7.0; p.x += sin(uTime*0.3+seed*30.)*0.25;
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
        gl_PointSize = (2.0 + seed*5.0) * uPx * (8.0 / -mv.z);
        vC=color; vA = (0.35+0.65*sin(uTime*(0.6+seed*1.4)+seed*50.)*0.5+0.5) * smoothstep(-6.0,-2.0,p.z+0.0*mv.z); }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 c=gl_PointCoord-.5; float d=length(c); float a=smoothstep(.5,0.,d); a*=a; gl_FragColor=vec4(vC*a*vA,1.); }`
  }));
  scene.add(pts);

  /* Nachbearbeitung: Bloom */
  let composer = null, bloom = null;
  function buildComposer() {
    composer = new EffectComposer(renderer); composer.setPixelRatio(Math.min(dpr, mobile ? 1 : 1.25)); composer.setSize(innerWidth, innerHeight);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), mobile ? .45 : .55, .5, .78); composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }
  try { buildComposer(); } catch (e) { composer = null; }
  PT.progress(82, "Kompiliere Shader");
  renderer.compile(scene, camera);

  /* Szenen pro Abschnitt: x/y = Anteil der halben Sichtfläche, s = Skalierung, ry/rx/rz = Drehung */
  const TAU = Math.PI * 2;
  const KD = {
    top: { x: 0, y: .02, s: 1.18, ry: 0, rx: 0, rz: 0, g: 1 },
    drops: { x: .5, y: 0, s: .98, ry: -.5, rx: .08, rz: .05 },
    fruehwarnung: { x: -.5, y: 0, s: .98, ry: Math.PI + .45, rx: -.06, rz: -.05 },
    news: { x: .5, y: 0, s: .98, ry: TAU - .45, rx: .1, rz: .04 },
    tausch: { x: -.5, y: 0, s: .98, ry: TAU + .45, rx: -.05, rz: -.06 },
    cardverse: { x: .5, y: 0, s: 1.02, ry: 3 * Math.PI - .45, rx: .08, rz: .05 },
    community: { x: -.5, y: 0, s: .98, ry: 2 * TAU + .45, rx: -.06, rz: -.04 },
    creator: { x: .5, y: 0, s: .98, ry: 2 * TAU - .45, rx: .08, rz: .05 },
    zahlen: { x: 0, y: .05, s: .85, ry: 5 * Math.PI, rx: .3, rz: 0, dim: 1 },
    premium: { x: 0, y: 0, s: .8, ry: 3 * TAU, rx: -.25, rz: 0, dim: 1 },
    join: { x: 0, y: .4, s: .82, ry: 3 * TAU, rx: 0, rz: 0, g: .55 }
  };
  const mob = (k) => { const o = { ...KD[k] }; if (k === "top") { o.y = .3; o.s = .78; } else if (k === "join") { o.y = .5; o.s = .56; } else { o.x = 0; o.y = .5; o.s = .56; o.rx *= .6; } return o; };
  const secs = [...d.querySelectorAll("[data-sec]")].filter(s => KD[s.id]);
  let centers = [];
  function measure() { centers = secs.map(s => { const r = s.getBoundingClientRect(); const top = r.top + scrollY; return Math.max(0, top + Math.min(r.height, innerHeight * 1.2) / 2 - innerHeight / 2); }); centers[0] = 0; }
  function keyAt(i) { return mobile ? mob(secs[i].id) : KD[secs[i].id]; }
  const cur = { x: 0, y: 0, s: 1.18, ry: 0, rx: 0, rz: 0, g: 1, dim: 0 }, tgt = { ...cur };
  function targetFromScroll() {
    const y = scrollY; let i = 0; while (i < centers.length - 1 && y >= centers[i + 1]) i++;
    const a = keyAt(i), b = keyAt(Math.min(i + 1, centers.length - 1));
    const span = (centers[i + 1] ?? centers[i] + 1) - centers[i]; const t = i >= centers.length - 1 ? 0 : sstep(.18, .82, (y - centers[i]) / span);
    for (const k of ["x", "y", "s", "ry", "rx", "rz"]) tgt[k] = lerp(a[k], b[k], t);
    tgt.g = lerp(a.g || 0, b.g || 0, t); tgt.dim = lerp(a.dim || 0, b.dim || 0, t);
  }

  /* Eingaben: Maus / Gyro / Touch */
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  if (fine) addEventListener("pointermove", e => { ptr.tx = e.clientX / innerWidth - .5; ptr.ty = e.clientY / innerHeight - .5; }, { passive: true });
  addEventListener("deviceorientation", e => { if (e.gamma == null) return; ptr.tx = clamp(e.gamma / 45, -1, 1) * .5; ptr.ty = clamp((e.beta - 45) / 45, -1, 1) * .5; }, { passive: true });

  function resize() {
    mobile = innerWidth < 820;
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    if (composer) { composer.setSize(innerWidth, innerHeight); }
    fitGiant(); measure(); targetFromScroll();
  }
  addEventListener("resize", resize); addEventListener("orientationchange", () => setTimeout(resize, 200));
  addEventListener("load", measure);
  new ResizeObserver(() => measure()).observe(d.body);
  addEventListener("scroll", () => { targetFromScroll(); if (reduce) renderOnce(); }, { passive: true });
  resize();

  const clock = new THREE.Clock(); let introT = 0, ready = false, frames = 0, stage = 0, fpsT = 0, fpsN = 0, degraded = false;
  PT.onReady(() => { ready = true; });
  const halfH = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 10;

  function apply(time, dt) {
    const k = reduce ? 1 : 1 - Math.pow(.0015, dt);
    for (const key of Object.keys(tgt)) cur[key] = lerp(cur[key], tgt[key], k * (key === "ry" && !ready ? 0 : 1));
    if (!reduce && ready) introT = Math.min(1, introT + dt / 2.2);
    const intro = reduce ? 1 : 1 - Math.pow(1 - introT, 3);
    ptr.x = lerp(ptr.x, ptr.tx, 1 - Math.pow(.02, dt)); ptr.y = lerp(ptr.y, ptr.ty, 1 - Math.pow(.02, dt));
    const hh = halfH(), hw = hh * camera.aspect;
    const sway = reduce ? 0 : Math.sin(time * .45) * (.35 * cur.g + .12), bob = reduce ? 0 : Math.sin(time * .9) * .08;
    tiltG.position.set(cur.x * hw, cur.y * hh + bob + (1 - intro) * -1.2, lerp(-6, 0, intro));
    const sc = cur.s * (mobile ? Math.min(1, hw / 1.55) : 1); tiltG.scale.setScalar(sc);
    tiltG.rotation.set(cur.rx + ptr.y * .35, ptr.x * .5, cur.rz);
    card.rotation.y = cur.ry + sway + (1 - intro) * -TAU * (reduce ? 0 : 1);
    // Holo-Neigung aus Weltdrehung
    holoU.uTilt.value.set(card.rotation.y + ptr.x * 2, tiltG.rotation.x * 2); holoU.uTime.value = time;
    halo.position.x = halo2.position.x = tiltG.position.x; halo.position.y = halo2.position.y = tiltG.position.y;
    halo.material.opacity = (.5 + Math.sin(time * 1.3) * .08) * (1 - cur.dim * .2) * intro; halo2.material.opacity = .22 * intro;
    halo.scale.setScalar(7.5 * sc); halo2.scale.set(4.5 * sc, 6 * sc, 1);
    lC.position.set(Math.cos(time * .6) * 4 + tiltG.position.x, 1.5, Math.sin(time * .6) * 4 + 2);
    lV.position.set(Math.cos(time * .6 + Math.PI) * 4 + tiltG.position.x, -1.2, Math.sin(time * .6 + Math.PI) * 4 + 2);
    // Riesenschrift: nur im Hero, wandert beim Scrollen nach oben weg
    const hp = clamp(scrollY / innerHeight);
    giant.position.y = (mobile ? 1.3 : .25) + hp * 3.5; giantMat.opacity = (.92 * (1 - hp * 1.1) + .0) * (ready || reduce ? 1 : 0) * (0.15 + .85 * intro);
    giant.visible = giantMat.opacity > .01;
    // Inhalte bekommen mehr Ruhe: Karte leicht abdunkeln, wenn mittig hinter Glas
    frontMat.emissiveIntensity = .32 + cur.dim * .04; backMat.emissiveIntensity = .36 + cur.dim * .04;
    pU.uTime.value = reduce ? 0 : time; pU.uScroll.value = scrollY / innerHeight * .4;
  }
  function draw() { if (composer) composer.render(); else renderer.render(scene, camera); }
  function renderOnce() { apply(0, 1); draw(); }

  PT.progress(94, "Starte Nexus");
  draw();
  PT.done();
  if (reduce) { targetFromScroll(); Object.assign(cur, tgt); cur.ry = 0; tgt.ry = 0; ready = true; renderOnce(); PT.onReady(renderOnce); return; }

  function loop() {
    requestAnimationFrame(loop);
    if (d.hidden) return;
    const dt = Math.min(.05, clock.getDelta()), time = clock.elapsedTime;
    apply(time, dt); draw();
    // Leistung prüfen: zu langsam → ohne Bloom und mit weniger Pixeln
    if (ready && !degraded && !HQ) { fpsT += dt; fpsN++; if (fpsT > 2.5) { const fps = fpsN / fpsT; fpsT = 0; fpsN = 0; if (fps < 40) { stage++; if (stage === 1 && dpr > 1) { dpr = 1; renderer.setPixelRatio(dpr); pU.uPx.value = dpr; if (composer) composer.setPixelRatio(.75); resize(); } else { degraded = true; composer = null; resize(); } console.info("[neon] Leistungsmodus " + stage + " (" + fps.toFixed(0) + " fps)"); } } }
  }
  loop();
}
