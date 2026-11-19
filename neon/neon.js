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
const W = () => canvas.clientWidth || innerWidth, H = () => canvas.clientHeight || innerHeight;
async function start() {
  window.PT_GL = true;
  PT.progress(16, "Loading");
  await Promise.race([Promise.all([d.fonts.load('900 100px "Cinzel"'), d.fonts.load('600 40px "Inter"')]), new Promise(r => setTimeout(r, 2500))]).catch(() => {});
  PT.progress(30);
  const logo = await loadImg("../logo.png");
  PT.progress(46);

  const maxTex = renderer.capabilities.maxTextureSize, TW = Math.min(mobile ? 1000 : 1400, maxTex), TH = Math.min(Math.round(TW * 1.4), maxTex);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const mk = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };
  const frontTex = mk(drawFront(logo, TW, TH));
  await new Promise(r => setTimeout(r, 0));
  const backTex = mk(drawBack(logo, TW, TH));
  PT.progress(62);

  let dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr); renderer.setSize(W(), H(), false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000); scene.fog = new THREE.Fog(0x000000, 14, 30);
  const camera = new THREE.PerspectiveCamera(35, W() / H(), .1, 100); camera.position.set(0, 0, 10);
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const TAU = Math.PI * 2;

  /* Karte */
  const CW = 2.14, CH = 3.0, CR = .14, DEP = .045, shape = roundedShape(CW, CH, CR);
  const card = new THREE.Group(), tiltG = new THREE.Group(); tiltG.add(card); scene.add(tiltG);
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xdfe2ee, metalness: 1, roughness: .22, emissive: 0x2a1458, emissiveIntensity: .6 });
  const edge = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: DEP, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 3, curveSegments: 10 }), edgeMat);
  edge.position.z = -DEP / 2; card.add(edge);
  const fg = faceGeo(shape, CW, CH);
  const frontMat = new THREE.MeshPhysicalMaterial({ map: frontTex, emissiveMap: frontTex, emissive: 0xffffff, emissiveIntensity: .22, metalness: .35, roughness: .32, clearcoat: 1, clearcoatRoughness: .12, iridescence: .6, iridescenceIOR: 1.6 });
  const backMat = new THREE.MeshPhysicalMaterial({ map: backTex, emissiveMap: backTex, emissive: 0xffffff, emissiveIntensity: .26, metalness: .3, roughness: .35, clearcoat: 1, clearcoatRoughness: .15 });
  const front = new THREE.Mesh(fg, frontMat); front.position.z = DEP / 2 + .0135; card.add(front);
  const back = new THREE.Mesh(fg, backMat); back.rotation.y = Math.PI; back.position.z = -DEP / 2 - .0135; card.add(back);
  const cardMats = [edgeMat, frontMat, backMat];

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
        vec3 col = hsv(fract(band));
        float stripes = 0.55 + 0.45*sin((vUv.x - vUv.y)*38.0 + uTilt.x*9.0);
        float edgeM = smoothstep(0.30, 0.5, max(abs(vUv.x-.5), abs(vUv.y-.5)*0.95));
        float m = mix(0.35, 1.0, edgeM);
        vec2 g = floor(vUv*vec2(160.,224.)); float sp = step(0.985, hash(g)) * (0.5+0.5*sin(uTime*3.0 + hash(g+1.)*40. + uTilt.x*20.));
        float a = uStr * (0.18 + f*1.6) * stripes * m;
        gl_FragColor = vec4(col * a + vec3(sp)*0.9*uStr, 1.0);
      }`
  });
  const holo = new THREE.Mesh(fg, holoMat); holo.position.z = DEP / 2 + .0145; card.add(holo);
  const holoB = new THREE.Mesh(fg, holoMat); holoB.rotation.y = Math.PI; holoB.position.z = -DEP / 2 - .0145; card.add(holoB);

  const gt = glowTex();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: 0x7b3cff, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.position.z = -1.4; scene.add(halo);

  scene.add(new THREE.AmbientLight(0x6a5aa0, .35));
  const lC = new THREE.PointLight(0x41f2ff, 18, 20, 1.6), lV = new THREE.PointLight(0xa06bff, 22, 20, 1.6), key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(2, 3, 6); scene.add(lC, lV, key);

  /* Leuchtender Ring hinter der Karte */
  const ringU = { uTime: { value: 0 }, uOp: { value: 0 }, uFlash: { value: 0 } };
  const ringMat = new THREE.ShaderMaterial({
    uniforms: ringU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uTime; uniform float uOp; uniform float uFlash; varying vec2 vUv;
      void main(){ float a=vUv.x*6.2831853;
        vec3 c=mix(vec3(.25,.95,1.), vec3(.62,.36,1.), .5+.5*sin(a+uTime*.35));
        float hl=pow(.5+.5*sin(a*2.-uTime*.9),8.);
        float tube=1.-abs(vUv.y-.5)*1.6;
        gl_FragColor=vec4(c*(1.3+2.6*hl+uFlash*4.)*tube*uOp,1.); }`
  });
  const ringG = new THREE.Group(); scene.add(ringG);
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.1, .02, 12, 320), ringMat); ringG.add(ring1);
  const ring2U = { uTime: { value: 0 }, uOp: { value: 0 }, uFlash: { value: 0 } };
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.42, .006, 8, 320), ringMat.clone()); ring2.material.uniforms = ring2U; ringG.add(ring2);
  ringG.position.z = -1.0;

  /* Tunnel aus Ringen für die Übergänge */
  const TN = mobile ? 16 : 24, TL = 44, TSP = TL / TN;
  const tunU = { uWarp: { value: 0 } };
  const tunMat = new THREE.ShaderMaterial({
    uniforms: tunU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `varying float vA; varying vec3 vC; varying vec2 vUv; uniform float uWarp;
      void main(){ vec4 p=vec4(position,1.);
        #ifdef USE_INSTANCING
        p=instanceMatrix*p;
        #endif
        vC=vec3(.4,.85,1.);
        #ifdef USE_INSTANCING_COLOR
        vC=instanceColor;
        #endif
        vec4 mv=modelViewMatrix*p; float dz=-mv.z; vUv=uv;
        vA=uWarp*smoothstep(1.5,6.,dz)*(1.-smoothstep(22.,40.,dz));
        gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; varying vec3 vC; varying vec2 vUv; void main(){ float dash=.55+.45*step(.5,fract(vUv.x*24.)); gl_FragColor=vec4(vC*vA*1.6*dash,1.); }`
  });
  const tunnel = new THREE.InstancedMesh(new THREE.TorusGeometry(3.6, .014, 6, 180), tunMat, TN);
  const tc = [new THREE.Color(0x41f2ff), new THREE.Color(0x9b5cff), new THREE.Color(0xc9a6ff)];
  for (let i = 0; i < TN; i++) tunnel.setColorAt(i, tc[i % 3]);
  tunnel.frustumCulled = false; scene.add(tunnel);
  const tm4 = new THREE.Matrix4(), tq = new THREE.Quaternion(), tv = new THREE.Vector3(), ts = new THREE.Vector3(), te = new THREE.Euler();

  /* Riesenschrift (Marke, Cinzel) */
  let giantPortrait = W() / H() < .9;
  const giantMat = new THREE.MeshBasicMaterial({ map: mk(drawGiant(giantPortrait)), transparent: true, opacity: .0, depthWrite: false, toneMapped: false, color: 0x9a9db4, fog: false });
  const giant = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), giantMat); giant.position.z = -3.2; scene.add(giant);
  const GZ = 10 - giant.position.z;
  function fitGiant() {
    const portrait = W() / H() < .9;
    if (portrait !== giantPortrait) { giantPortrait = portrait; giantMat.map.dispose(); giantMat.map = mk(drawGiant(portrait)); giantMat.needsUpdate = true; }
    const vh = 2 * GZ * Math.tan(THREE.MathUtils.degToRad(35 / 2)), vw = vh * camera.aspect;
    const ar = giantMat.map.image.width / giantMat.map.image.height; let w = vw * .94, h = w / ar; if (h > vh * .62) { h = vh * .62; w = h * ar; }
    giant.scale.set(w, h, 1);
  }

  /* Partikel */
  const N = mobile ? 360 : 1200, pos = new Float32Array(N * 3), seed = new Float32Array(N), col = new Float32Array(N * 3);
  const cA = new THREE.Color(0x41f2ff), cB = new THREE.Color(0xb48cff), cC = new THREE.Color(0xffffff);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - .5) * 22; pos[i * 3 + 1] = (Math.random() - .5) * 14; pos[i * 3 + 2] = -6 + Math.random() * 11;
    seed[i] = Math.random(); const cc = Math.random() < .45 ? cA : Math.random() < .8 ? cB : cC; col.set([cc.r, cc.g, cc.b], i * 3);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); pg.setAttribute("seed", new THREE.BufferAttribute(seed, 1)); pg.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const pU = { uTime: { value: 0 }, uScroll: { value: 0 }, uPx: { value: dpr }, uOp: { value: .7 } };
  const pts = new THREE.Points(pg, new THREE.ShaderMaterial({
    uniforms: pU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, toneMapped: false,
    vertexShader: `attribute float seed; uniform float uTime; uniform float uScroll; uniform float uPx; varying vec3 vC; varying float vA;
      void main(){ vec3 p=position; float t=uTime*(0.05+seed*0.08);
        p.y = mod(p.y + t + uScroll*(0.6+seed) + 7.0, 14.0) - 7.0; p.x += sin(uTime*0.3+seed*30.)*0.25;
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
        gl_PointSize = (2.0 + seed*4.0) * uPx * (8.0 / -mv.z);
        vC=color; vA = 0.35+0.65*(sin(uTime*(0.6+seed*1.4)+seed*50.)*0.5+0.5); }`,
    fragmentShader: `uniform float uOp; varying vec3 vC; varying float vA; void main(){ vec2 c=gl_PointCoord-.5; float d=length(c); float a=smoothstep(.5,0.,d); a*=a; gl_FragColor=vec4(vC*a*vA*uOp,1.); }`
  }));
  scene.add(pts);

  /* Intro: das P setzt sich aus Splittern zusammen */
  const NF = reduce ? 0 : (mobile ? 700 : 1500);
  let frag = null, fS, fT, fD, fR;
  if (NF) {
    const sc = d.createElement("canvas"); sc.width = sc.height = 128; const sx = sc.getContext("2d"); sx.drawImage(logo, 0, 0, 128, 128);
    const px = sx.getImageData(0, 0, 128, 128).data, cand = [];
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const o = (y * 128 + x) * 4; if (px[o + 3] > 150) cand.push(o); }
    const tri = new THREE.BufferGeometry(); tri.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, .055, 0, -.045, -.035, 0, .05, -.03, 0]), 3));
    const fm = new THREE.MeshBasicMaterial({ transparent: true, opacity: 1, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
    frag = new THREE.InstancedMesh(tri, fm, NF); frag.frustumCulled = false;
    fS = new Float32Array(NF * 3); fT = new Float32Array(NF * 3); fD = new Float32Array(NF); fR = new Float32Array(NF * 3);
    const LS = CW * .64, LY = (0.5 - 590 / 1400) * CH, colr = new THREE.Color();
    for (let i = 0; i < NF; i++) {
      const o = cand[(Math.random() * cand.length) | 0], p = o / 4, x = p % 128, y = (p / 128) | 0;
      fT.set([(x / 128 - .5) * LS, LY + (.5 - y / 128) * LS, DEP / 2 + .03], i * 3);
      const th = Math.random() * TAU, ph = Math.acos(2 * Math.random() - 1), r = 5 + Math.random() * 5;
      fS.set([Math.sin(ph) * Math.cos(th) * r * 1.4, Math.sin(ph) * Math.sin(th) * r, Math.cos(ph) * r * .6 + 2], i * 3);
      fD[i] = Math.random() * .55; fR.set([Math.random() * 9, Math.random() * 9, Math.random() * 9], i * 3);
      colr.setRGB(px[o] / 255, px[o + 1] / 255, px[o + 2] / 255, THREE.SRGBColorSpace).multiplyScalar(1.7); frag.setColorAt(i, colr);
    }
    card.add(frag);
    cardMats.forEach(m => { m.transparent = true; m.opacity = 0; });
  }

  /* Bloom */
  let composer = null;
  function buildComposer() {
    composer = new EffectComposer(renderer); composer.setPixelRatio(Math.min(dpr, mobile ? 1 : 1.25)); composer.setSize(W(), H());
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(W(), H()), mobile ? .42 : .5, .45, .82));
    composer.addPass(new OutputPass());
  }
  try { buildComposer(); } catch (e) { composer = null; }
  PT.progress(82);
  renderer.compile(scene, camera);

  const halfH = () => Math.tan(THREE.MathUtils.degToRad(35 / 2)) * 10;
  /* Szenen pro Abschnitt: x/y Anteil der halben Sichtfläche, s Größe, ry/rx/rz Drehung, vis sichtbar, ring Hero-Ring, g Riesenschrift */
  const KD = {
    top: { x: 0, y: .14, s: .92, ry: 0, rx: 0, rz: 0, vis: 1, ring: 1, g: 1 },
    drops: { x: .48, y: 0, s: .95, ry: -.5, rx: .08, rz: .05, vis: 1 },
    fruehwarnung: { x: -.48, y: 0, s: .95, ry: Math.PI + .45, rx: -.06, rz: -.05, vis: 1 },
    news: { x: .48, y: 0, s: .95, ry: TAU - .45, rx: .1, rz: .04, vis: 1 },
    tausch: { x: 0, y: 0, s: .8, ry: TAU, rx: 0, rz: 0, vis: 0 },
    cardverse: { x: 0, y: 0, s: .8, ry: TAU + Math.PI, rx: 0, rz: 0, vis: 0 },
    community: { x: -.48, y: 0, s: .95, ry: 2 * TAU + .45, rx: -.06, rz: -.04, vis: 1 },
    creator: { x: 0, y: 0, s: .8, ry: 3 * TAU - .45, rx: 0, rz: 0, vis: 0 },
    zahlen: { x: 0, y: 0, s: .8, ry: 3 * TAU + Math.PI, rx: 0, rz: 0, vis: 0 },
    premium: { x: 0, y: 0, s: .8, ry: 4 * TAU, rx: 0, rz: 0, vis: 0 },
    join: { x: 0, y: .2, s: .86, ry: 4 * TAU, rx: 0, rz: 0, vis: 1, ring: 1 }
  };
  // Mobil: Karte genau in den freien Raum zwischen Kopfleiste und Text setzen; zu wenig Platz → Karte ausblenden
  const mob = (k, el) => {
    const o = { ...KD[k] }; o.x = 0; o.rx *= .6;
    const Hp = H(), hh = halfH(), hw = hh * camera.aspect, top = 84, ctTop = +(el && el.dataset.ctTop) || Hp * .5;
    const avail = ctTop - top - 12;
    if (avail < 150) { o.vis = 0; o.s = .5; o.y = .3; return o; }
    const cy = top + avail / 2, wantH = Math.min(avail * (o.ring ? .7 : .86), Hp * (o.ring ? .34 : .42));
    let s = wantH * (2 * hh / Hp) / CH; s = Math.min(s, (hw * 2 * (o.ring ? .5 : .6)) / CW);
    o.s = s; o.y = 1 - 2 * cy / Hp; return o;
  };
  const secs = [...d.querySelectorAll("[data-sec]")].filter(s => KD[s.id]);
  const footEl = d.querySelector(".ft");
  let anchors = [];
  function measure() {
    const vh = innerHeight;
    anchors = secs.map(s => { const top = s.getBoundingClientRect().top + scrollY, h = s.offsetHeight;
      return s.classList.contains("flow") ? Math.max(0, top - vh * .35) : top + Math.max(0, h - vh) * .3; });
    anchors[0] = 0;
  }
  const keyAt = (i) => mobile ? mob(secs[i].id, secs[i]) : KD[secs[i].id];
  const PK = ["x", "y", "s", "ry", "rx", "rz", "vis", "ring", "g"];
  const tgt = {}; let warp = 0;
  function targetFromScroll() {
    const y = scrollY; let i = 0; while (i < anchors.length - 1 && y >= anchors[i + 1]) i++;
    const a = keyAt(i), b = keyAt(Math.min(i + 1, anchors.length - 1));
    const last = i >= anchors.length - 1, u = last ? 0 : clamp((y - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i]));
    const t = sstep(.25, .75, u);
    for (const k of PK) tgt[k] = lerp(a[k] || 0, b[k] || 0, t);
    const span = last ? 1 : anchors[i + 1] - anchors[i], win = Math.min(span, innerHeight * 1.1), uw = last ? 0 : clamp(1 - (anchors[i + 1] - y) / win);
    // Tunnel nur kurz vor dem Übergang, nicht während langer Lese-Abschnitte
    warp = reduce || last ? 0 : Math.sin(Math.PI * clamp((uw - .15) / .7)) * (!(a.vis || 0) && !(b.vis || 0) ? 0 : .5 + .5 * Math.abs((a.vis || 0) - (b.vis || 0)));
  }
  const cur = {};

  /* Eingaben */
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  if (fine) addEventListener("pointermove", e => { ptr.tx = e.clientX / innerWidth - .5; ptr.ty = e.clientY / innerHeight - .5; }, { passive: true });
  addEventListener("deviceorientation", e => { if (e.gamma == null) return; ptr.tx = clamp(e.gamma / 45, -1, 1) * .5; ptr.ty = clamp((e.beta - 45) / 45, -1, 1) * .5; }, { passive: true });

  function resize() {
    mobile = innerWidth < 820;
    camera.aspect = W() / H(); camera.updateProjectionMatrix();
    renderer.setSize(W(), H(), false); if (composer) composer.setSize(W(), H());
    fitGiant(); measure(); targetFromScroll();
  }
  addEventListener("resize", resize); addEventListener("orientationchange", () => setTimeout(resize, 250));
  addEventListener("pt-layout", () => { measure(); targetFromScroll(); });
  addEventListener("load", () => { measure(); targetFromScroll(); });
  new ResizeObserver(() => { measure(); targetFromScroll(); }).observe(d.body);
  resize(); Object.assign(cur, tgt);

  const clock = new THREE.Clock(); let ready = false, it = reduce ? 9 : 0, introDone = !NF, stage = 0, fpsT = 0, fpsN = 0, degraded = false;
  PT.onReady(() => { ready = true; });
  const eo = (k) => 1 - Math.pow(1 - k, 3);

  let introStart = -1;
  function intro(dt) {
    if (introDone) return 1;
    if (ready) { const now = performance.now() / 1000; if (introStart < 0) introStart = now; it = now - introStart; }
    // Splitter fliegen zusammen
    for (let i = 0; i < NF; i++) {
      const k = eo(clamp((it - fD[i]) / 1.35)), j = i * 3;
      tv.set(lerp(fS[j], fT[j], k), lerp(fS[j + 1], fT[j + 1], k), lerp(fS[j + 2], fT[j + 2], k));
      te.set(fR[j] * (1 - k), fR[j + 1] * (1 - k), fR[j + 2] * (1 - k)); tq.setFromEuler(te);
      const s = .55 + .9 * (1 - k); ts.set(s, s, s); tm4.compose(tv, tq, ts); frag.setMatrixAt(i, tm4);
    }
    frag.instanceMatrix.needsUpdate = true;
    const cardIn = sstep(1.95, 2.6, it);
    cardMats.forEach(m => { m.opacity = cardIn; });
    frag.material.opacity = 1 - sstep(2.3, 3.0, it);
    ringU.uFlash.value = Math.exp(-Math.pow((it - 2.1) / .25, 2));
    if (it > 3.1) { introDone = true; card.remove(frag); frag.geometry.dispose(); frag.material.dispose(); cardMats.forEach(m => { m.transparent = false; m.opacity = 1; m.needsUpdate = true; }); return 1; }
    return cardIn;
  }

  function apply(time, dt) {
    const k = reduce ? 1 : 1 - Math.pow(.002, dt);
    for (const key of PK) cur[key] = lerp(cur[key], tgt[key], k);
    const cin = intro(dt);
    ptr.x = lerp(ptr.x, ptr.tx, 1 - Math.pow(.02, dt)); ptr.y = lerp(ptr.y, ptr.ty, 1 - Math.pow(.02, dt));
    const hh = halfH(), hw = hh * camera.aspect, vis = clamp(cur.vis);
    const sway = reduce ? 0 : Math.sin(time * .45) * (.28 * cur.g + .1) * cin, bob = reduce ? 0 : Math.sin(time * .9) * .07;
    // Am Seitenende schiebt der Footer die Bühne nach oben, damit Karte und Ring beim Schlusstext bleiben
    const ftTop = footEl ? footEl.getBoundingClientRect().top : 1e9, ftIn = Math.max(0, H() - ftTop), ftF = clamp(ftIn / (footEl ? footEl.offsetHeight || 1 : 1)), lift = ftIn * (2 * hh / H()) * (mobile ? .5 : .72);
    tiltG.position.set(cur.x * hw, cur.y * hh + bob + lift, -(1 - vis) * 20);
    const sc = cur.s * (.6 + .4 * vis) * (1 - (mobile ? .55 : .42) * ftF); tiltG.scale.setScalar(sc);
    tiltG.rotation.set(cur.rx + ptr.y * .3, ptr.x * .45, cur.rz);
    card.rotation.y = cur.ry + sway;
    tiltG.visible = vis > .01;
    holoU.uTilt.value.set(card.rotation.y + ptr.x * 2, tiltG.rotation.x * 2); holoU.uTime.value = time; holoU.uStr.value = .2 * vis * cin;
    halo.position.set(tiltG.position.x, tiltG.position.y, -1.4 - (1 - vis) * 20); halo.scale.setScalar(7 * sc); halo.material.opacity = (.32 + Math.sin(time * 1.3) * .05) * vis * cin;
    lC.position.set(Math.cos(time * .6) * 4 + tiltG.position.x, 1.5, Math.sin(time * .6) * 4 + 2);
    lV.position.set(Math.cos(time * .6 + Math.PI) * 4 + tiltG.position.x, -1.2, Math.sin(time * .6 + Math.PI) * 4 + 2);
    // Ring
    const rOp = clamp(cur.ring) * (reduce ? 1 : sstep(.6, 2.0, it));
    ringU.uOp.value = rOp; ringU.uTime.value = reduce ? 0 : time; ring2U.uOp.value = rOp * .45; ring2U.uTime.value = reduce ? 0 : -time * .7; ring2U.uFlash.value = ringU.uFlash.value * .5;
    ringG.visible = rOp > .01; ringG.position.x = tiltG.position.x; ringG.position.y = tiltG.position.y;
    ringG.scale.setScalar(sc * (mobile ? .95 : 1) * (1 + ringU.uFlash.value * .04)); ringG.rotation.set(reduce ? 0 : Math.sin(time * .3) * .12, reduce ? 0 : Math.cos(time * .25) * .12, 0);
    // Tunnel
    tunU.uWarp.value = warp; tunnel.visible = warp > .01;
    if (tunnel.visible) {
      const off = scrollY / innerHeight * 10;
      for (let i = 0; i < TN; i++) { const z = -34 + ((i * TSP + off) % TL + TL) % TL; tv.set(cur.x * hw * .3, 0, z); te.set(0, 0, i * .7 + time * .05); tq.setFromEuler(te); ts.set(camera.aspect > 1 ? 1.15 : .8, 1, 1); tm4.compose(tv, tq, ts); tunnel.setMatrixAt(i, tm4); }
      tunnel.instanceMatrix.needsUpdate = true;
    }
    camera.fov = 35 + warp * 7; camera.updateProjectionMatrix();
    // Riesenschrift
    const hp = clamp(scrollY / (innerHeight * .9));
    giant.position.y = cur.y * hh * (GZ / 10) + (mobile ? .1 : .05) + hp * 3 + lift * (GZ / 10);
    giantMat.opacity = .62 * clamp(cur.g) * (1 - hp) * (reduce ? 1 : sstep(1.6, 2.6, it));
    giant.visible = giantMat.opacity > .01;
    pU.uTime.value = reduce ? 0 : time; pU.uScroll.value = scrollY / innerHeight * .4; pU.uOp.value = .55 + warp * .45;
  }
  function draw() { if (composer) composer.render(); else renderer.render(scene, camera); }
  function renderOnce() { targetFromScroll(); Object.assign(cur, tgt); apply(0, 1); draw(); }

  PT.progress(94);
  apply(0, .016); draw();
  PT.done();
  if (reduce) { ready = true; renderOnce(); addEventListener("scroll", renderOnce, { passive: true }); addEventListener("resize", renderOnce); PT.onReady(renderOnce); return; }
  addEventListener("scroll", targetFromScroll, { passive: true });

  function loop() {
    requestAnimationFrame(loop);
    if (d.hidden) return;
    const dt = Math.min(.05, clock.getDelta()), time = clock.elapsedTime;
    apply(time, dt); draw();
    if (ready && introDone && !degraded && !HQ) { fpsT += dt; fpsN++; if (fpsT > 2.5) { const fps = fpsN / fpsT; fpsT = 0; fpsN = 0; if (fps < 40) { stage++; if (stage === 1 && dpr > 1) { dpr = 1; renderer.setPixelRatio(dpr); pU.uPx.value = dpr; if (composer) composer.setPixelRatio(.75); resize(); } else { degraded = true; composer = null; resize(); } console.info("[neon] Leistungsmodus " + stage + " (" + fps.toFixed(0) + " fps)"); } } }
  }
  loop();
}
