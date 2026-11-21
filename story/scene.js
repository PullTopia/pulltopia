/* PullTopia /story/ — Three.js worlds: swirl, glass shards, burning tags */
async function loadThree(){
  try { return await import("three"); }
  catch (e){ return await import("./vendor/three.module.min.js"); }
}

const THREE = await loadThree();
const canvas = document.getElementById("gl");
const app = document.getElementById("app");

function webglOk(){
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl") || c.getContext("webgl2"));
  } catch (e){ return false; }
}

const api = {
  ok: false,
  startSwirl(){},
  setSwirlProgress(){},
  startShards(){},
  startBurn(){},
  reset(){},
  resize(){},
  pause(){},
  dim(){},
  nudge(){}
};
window.Story3D = api;

if (!canvas || !app || document.documentElement.classList.contains("rm") || !webglOk()){
  window.dispatchEvent(new CustomEvent("story:ready", { detail:{ ok:false } }));
} else {
  await boot();
}

async function boot(){
  try { await document.fonts.ready; } catch (e) {}
  const isMob = () => innerWidth < 821;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMob(), alpha: true, powerPreference:"default" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isMob() ? 1.5 : 2));
  renderer.setSize(app.clientWidth, app.clientHeight, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (renderer.toneMapping !== undefined) renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, app.clientWidth / Math.max(1, app.clientHeight), 0.1, 80);
  camera.position.set(0, 0.15, 8.4);

  const amb = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(amb);
  const key = new THREE.DirectionalLight(0xffe0a0, 1.25);
  key.position.set(3, 4, 6);
  scene.add(key);
  const fill = new THREE.PointLight(0x7ad7ff, 0.7, 30);
  fill.position.set(-4, -1, 3);
  scene.add(fill);
  const rim = new THREE.PointLight(0xc9a6ff, 0.5, 24);
  rim.position.set(2, -3, -2);
  scene.add(rim);

  const loader = new THREE.TextureLoader();
  const loadTex = (url) => new Promise((res, rej) => {
    loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, rej);
  });

  const CARDS = [
    "../assets/img/card-016.webp",
    "../assets/img/card-023.webp",
    "../assets/img/card-028.webp",
    "../assets/img/card-033.webp",
    "../assets/img/card-045.webp",
    "../assets/img/card-050.webp"
  ];

  let coinTex, envTex;
  try {
    [coinTex, envTex] = await Promise.all([
      loadTex("img/coin-alpha.webp").catch(() => loadTex("img/coin.webp")),
      loadTex("img/world-swirl.webp")
    ]);
  } catch (e) {
    console.warn("story textures", e);
  }

  let envMap = null;
  if (envTex){
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      envMap = pmrem.fromEquirectangular(envTex).texture;
      pmrem.dispose();
    } catch (e) {}
  }

  const swirlRoot = new THREE.Group();
  const shardRoot = new THREE.Group();
  const burnRoot = new THREE.Group();
  scene.add(swirlRoot, shardRoot, burnRoot);
  swirlRoot.visible = shardRoot.visible = burnRoot.visible = false;

  const coins = [];
  const cards = [];
  const nCoins = isMob() ? 7 : 11;
  const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.06, 40);
  const coinMat = new THREE.MeshStandardMaterial({
    map: coinTex || null,
    metalness: 0.85,
    roughness: 0.28,
    color: coinTex ? 0xffffff : 0xd4a017,
    envMap: envMap || null,
    envMapIntensity: 0.9
  });
  const coinEdge = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.9, roughness: 0.35, envMap: envMap || null });
  for (let i=0;i<nCoins;i++){
    const m = new THREE.Mesh(coinGeo, [coinEdge, coinMat, coinMat]);
    const a = (i / nCoins) * Math.PI * 2;
    const r = 2.1 + (i % 3) * 0.55;
    m.userData = { a, r, y: (i%5-2)*0.55, spin: 0.8 + (i%4)*0.25, tilt: (i%2?1:-1)*0.4 };
    m.position.set(Math.cos(a)*r, m.userData.y, Math.sin(a)*r);
    m.rotation.x = Math.PI / 2;
    swirlRoot.add(m);
    coins.push(m);
  }

  const cardGeo = new THREE.BoxGeometry(1.05, 1.47, 0.03);
  const backTex = await loadTex("../assets/img/cardback.webp").catch(() => null);
  const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.45, metalness: 0.1 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x1a1220, roughness: 0.5, metalness: 0.2 });
  for (let i=0;i<CARDS.length;i++){
    const front = await loadTex(CARDS[i]).catch(() => null);
    const frontMat = new THREE.MeshStandardMaterial({ map: front, roughness: 0.4, metalness: 0.15 });
    // box mats: +x -x +y -y +z -z
    const mats = [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat];
    const m = new THREE.Mesh(cardGeo, mats);
    const a = (i / CARDS.length) * Math.PI * 2 + 0.4;
    const r = 2.6 + (i%2)*0.4;
    m.userData = { a, r, y: (i%3-1)*0.85, spin: 0.25 + i*0.04 };
    m.position.set(Math.cos(a)*r, m.userData.y, Math.sin(a)*r);
    swirlRoot.add(m);
    cards.push(m);
  }

  /* shards */
  const FACTS = [
    { n:"24.880", s:"Produkte im Radar" },
    { n:"2,7 Min.", s:"Quelle bis Discord, Median" },
    { n:"87 %", s:"Hinweise in 15 Minuten" }
  ];
  const shards = [];

  function shardTexture(fact, w, h){
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    g.clearRect(0,0,w,h);
    const grd = g.createLinearGradient(0,0,w,h);
    grd.addColorStop(0, "rgba(28,22,40,0.92)");
    grd.addColorStop(0.45, "rgba(40,30,58,0.88)");
    grd.addColorStop(1, "rgba(22,16,28,0.92)");
    g.fillStyle = grd;
    roundPoly(g, w, h);
    g.fill();
    g.strokeStyle = "rgba(255,220,138,0.55)";
    g.lineWidth = 8;
    g.stroke();
    g.fillStyle = "#ffdc8a";
    g.font = "600 120px Cinzel, Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(fact.n, w/2, h*0.42);
    g.fillStyle = "rgba(255,255,255,0.92)";
    g.font = "500 32px Inter, sans-serif";
    g.fillText(fact.s, w/2, h*0.70);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function roundPoly(g, w, h){
    g.beginPath();
    g.moveTo(w*0.08, h*0.12);
    g.lineTo(w*0.92, h*0.08);
    g.lineTo(w*0.96, h*0.86);
    g.lineTo(w*0.1, h*0.94);
    g.closePath();
  }
  function shardShape(){
    const s = new THREE.Shape();
    s.moveTo(-0.9, 0.7);
    s.lineTo(0.95, 0.82);
    s.lineTo(0.8, -0.75);
    s.lineTo(-0.85, -0.7);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }

  const shardGeo = shardShape();
  for (let i=0;i<FACTS.length;i++){
    const tex = shardTexture(FACTS[i], 1024, 768);
    let mat;
    // Opaque frosted glass: transmission is unreliable on SwiftShader and hides the numbers.
    if (THREE.MeshPhysicalMaterial){
      mat = new THREE.MeshPhysicalMaterial({
        map: tex,
        transparent: true,
        roughness: 0.22,
        metalness: 0.15,
        transmission: 0.12,
        thickness: 0.35,
        ior: 1.4,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2,
        envMap: envMap || null,
        envMapIntensity: 0.7,
        opacity: 1,
        side: THREE.DoubleSide
      });
    } else {
      mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: 1, roughness: 0.25, metalness: 0.15, envMap: envMap || null, side: THREE.DoubleSide });
    }
    const m = new THREE.Mesh(shardGeo, mat);
    const mob = isMob();
    m.scale.set(mob ? 1.25 : 1.85, mob ? 0.98 : 1.35, 1);
    const a = (i / FACTS.length) * Math.PI * 2 - 0.4;
    m.userData = { a, r: mob ? 0.7 : 1.7 + i*0.2, y: (i-1)*(mob ? 1.15 : 0.85), rot: 0.15*(i+1) };
    if (mob) m.position.set((i-1)*0.35, m.userData.y, 0.1*i);
    else m.position.set(Math.cos(a)*m.userData.r, m.userData.y, Math.sin(a)*0.4);
    m.rotation.z = (i-1)*0.18;
    shardRoot.add(m);
    shards.push(m);
  }

  /* burn tags + embers */
  const tags = [];
  function tagTexture(){
    const c = document.createElement("canvas");
    c.width = 512; c.height = 320;
    const g = c.getContext("2d");
    g.fillStyle = "#1a1208";
    g.strokeStyle = "#e8b85a";
    g.lineWidth = 10;
    roundRectPath(g, 16, 16, 480, 288, 12);
    g.fill(); g.stroke();
    // hole
    g.beginPath(); g.arc(70, 160, 16, 0, Math.PI*2); g.fillStyle = "#000"; g.fill();
    g.strokeStyle = "#e8b85a"; g.lineWidth = 4; g.stroke();
    g.fillStyle = "#ffdc8a";
    g.font = "700 48px Cinzel, Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("SCALPER-PREIS", 280, 150);
    // red slash — decorative, not a number
    g.strokeStyle = "rgba(200,40,30,0.85)";
    g.lineWidth = 8;
    g.beginPath(); g.moveTo(90, 230); g.lineTo(460, 90); g.stroke();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function roundRectPath(g,x,y,w,h,r){
    g.beginPath();
    g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath();
  }

  const burnVert = /* glsl */`
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `;
  const burnFrag = /* glsl */`
    varying vec2 vUv;
    uniform sampler2D uMap;
    uniform float uBurn;
    uniform float uTime;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p); vec2 f = fract(p);
      float a = hash(i), b = hash(i+vec2(1.,0.)), c = hash(i+vec2(0.,1.)), d = hash(i+vec2(1.,1.));
      vec2 u = f*f*(3.-2.*f);
      return mix(a,b,u.x) + (c-a)*u.y*(1.-u.x) + (d-b)*u.x*u.y;
    }
    void main(){
      vec4 col = texture2D(uMap, vUv);
      float n = noise(vUv*7.0 + vec2(uTime*0.15, -uTime*0.2));
      float edge = min(min(vUv.x, 1.0-vUv.x), min(vUv.y, 1.0-vUv.y));
      float t = uBurn * 1.05 + (1.0-edge)*0.5 + n*0.22;
      if (t > 0.93) discard;
      vec3 ember = vec3(1.0, 0.42, 0.06);
      float rim = smoothstep(0.48, 0.82, t) * (1.0 - smoothstep(0.82, 0.93, t));
      col.rgb = mix(col.rgb, ember, rim * 0.9);
      col.rgb += ember * rim * 0.7;
      col.a *= smoothstep(0.93, 0.72, t);
      gl_FragColor = col;
    }
  `;

  const tagTex = tagTexture();
  const nTags = isMob() ? 5 : 7;
  for (let i=0;i<nTags;i++){
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap:{ value: tagTex }, uBurn:{ value: 0 }, uTime:{ value: 0 } },
      vertexShader: burnVert,
      fragmentShader: burnFrag,
      transparent: true
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.05), mat);
    m.userData = {
      px: (i%3-1)*1.5 + (i*0.12),
      py: 1.2 + (i%4)*0.45,
      pz: (i%2?0.3:-0.4)*i*0.08,
      rot: (i-3)*0.18,
      delay: i * 0.12,
      vy: 0
    };
    m.position.set(m.userData.px, m.userData.py, m.userData.pz);
    m.rotation.z = m.userData.rot;
    burnRoot.add(m);
    tags.push(m);
  }

  // embers
  const nEmb = isMob() ? 70 : 140;
  const embPos = new Float32Array(nEmb*3);
  const embVel = [];
  for (let i=0;i<nEmb;i++){
    embPos[i*3] = (Math.random()-0.5)*6;
    embPos[i*3+1] = Math.random()*3-0.5;
    embPos[i*3+2] = (Math.random()-0.5)*3;
    embVel.push({ vx:(Math.random()-.5)*0.3, vy:0.4+Math.random()*0.7, life: Math.random() });
  }
  const embGeo = new THREE.BufferGeometry();
  embGeo.setAttribute("position", new THREE.BufferAttribute(embPos, 3));
  const embMat = new THREE.PointsMaterial({ color: 0xff7a1a, size: 0.06, transparent: true, opacity: 0.85, depthWrite: false });
  const embers = new THREE.Points(embGeo, embMat);
  embers.visible = false;
  scene.add(embers);

  /* state */
  let mode = "idle"; // swirl | shards | burn | dim | idle
  let swirlP = 0;
  let burnT = 0;
  let t0 = performance.now();
  let running = true;
  let yaw = 0, pit = 0;

  function startSwirl(){
    mode = "swirl";
    swirlRoot.visible = true;
    shardRoot.visible = false;
    burnRoot.visible = false;
    embers.visible = false;
    swirlP = 0;
    camera.position.set(0, 0.15, 8.8);
    running = true;
  }
  function hideSwirl(){ swirlRoot.visible = false; }
  function setSwirlProgress(p){ swirlP = Math.max(0, Math.min(1, p)); }
  function startShards(){
    mode = "shards";
    camera.position.set(0, 0.15, 8.6);
    swirlRoot.visible = false;
    shardRoot.visible = true;
    burnRoot.visible = false;
    embers.visible = false;
    shardRoot.scale.setScalar(0.2);
    running = true;
  }
  function startBurn(){
    mode = "burn";
    camera.position.set(0, 0.2, 8.2);
    swirlRoot.visible = false;
    shardRoot.visible = false;
    burnRoot.visible = true;
    embers.visible = true;
    burnT = 0;
    tags.forEach((m,i) => {
      m.position.set(m.userData.px, m.userData.py, m.userData.pz);
      m.userData.vy = 0;
      m.material.uniforms.uBurn.value = 0;
      m.visible = true;
    });
    running = true;
  }
  function dim(){
    mode = "dim";
  }
  function reset(){
    mode = "idle";
    swirlRoot.visible = shardRoot.visible = burnRoot.visible = embers.visible = false;
    swirlP = 0; burnT = 0; yaw = 0; pit = 0;
  }
  function resize(){
    const w = app.clientWidth, h = Math.max(1, app.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isMob() ? 1.5 : 2));
    renderer.setSize(w, h, false);
  }
  function nudge(dx, dy){
    yaw += dx * 0.005;
    pit += dy * 0.003;
    pit = Math.max(-0.6, Math.min(0.6, pit));
  }

  function tick(now){
    if (!running && mode === "idle"){ requestAnimationFrame(tick); return; }
    const dt = Math.min(0.05, (now - t0)/1000);
    t0 = now;
    const t = now * 0.001;

    if (mode === "swirl"){
      const spread = 0.9 + swirlP * 0.28;
      coins.forEach((m,i) => {
        const u = m.userData;
        u.a += u.spin * 0.25 * dt;
        const r = u.r * spread;
        m.position.set(Math.cos(u.a)*r, u.y + Math.sin(t*0.8+i)*0.12, Math.sin(u.a)*r*0.32);
        m.rotation.x = Math.PI/2 + Math.sin(t*u.spin)*0.2;
        m.rotation.z = t * u.spin;
      });
      cards.forEach((m,i) => {
        const u = m.userData;
        u.a += u.spin * dt;
        const r = u.r * spread;
        m.position.set(Math.cos(u.a)*r, u.y + Math.sin(t*0.6+i)*0.1, Math.sin(u.a)*r*0.32);
        m.lookAt(0, m.position.y*0.3, 0);
        m.rotateY(Math.sin(t*0.5+i)*0.15);
      });
      swirlRoot.rotation.y = t * 0.12;
      camera.position.z = 8.8 - swirlP * 0.35;
      camera.position.y = 0.1 + swirlP * 0.08;
      fill.intensity = 0.5 + swirlP * 0.6;
    }

    if (mode === "shards"){
      const sc = shardRoot.scale.x;
      if (sc < 1) shardRoot.scale.setScalar(Math.min(1, sc + dt*1.8));
      shards.forEach((m,i) => {
        const u = m.userData;
        u.a += 0.18 * dt;
        m.position.x = Math.cos(u.a)*u.r;
        m.position.z = Math.sin(u.a)*0.55;
        m.position.y = u.y + Math.sin(t*0.7+i)*0.08;
        m.rotation.y = Math.sin(t*0.4+i)*0.35 + yaw;
        m.rotation.x = pit * 0.5 + Math.sin(t*0.3+i)*0.12;
      });
      shardRoot.rotation.y += (yaw*0.2 - shardRoot.rotation.y)*0.04;
    }

    if (mode === "burn" || mode === "dim"){
      burnT += dt;
      tags.forEach((m) => {
        const u = m.userData;
        const local = Math.max(0, burnT - u.delay);
        u.vy += 2.4 * dt;
        m.position.y -= u.vy * dt;
        m.rotation.z += 0.25 * dt;
        m.rotation.x += 0.1 * dt;
        const b = Math.min(1, local / 2.7);
        m.material.uniforms.uBurn.value = b;
        m.material.uniforms.uTime.value = t;
        if (b >= 0.98) m.visible = false;
      });
      const pos = embers.geometry.attributes.position.array;
      for (let i=0;i<nEmb;i++){
        const v = embVel[i];
        pos[i*3] += v.vx * dt;
        pos[i*3+1] += v.vy * dt;
        v.life -= dt*0.25;
        if (pos[i*3+1] > 4 || v.life <= 0){
          pos[i*3] = (Math.random()-0.5)*5;
          pos[i*3+1] = -0.4;
          pos[i*3+2] = (Math.random()-0.5)*3;
          v.life = 1;
        }
      }
      embers.geometry.attributes.position.needsUpdate = true;
      if (mode === "dim"){
        embers.material.opacity = Math.max(0, embers.material.opacity - dt*0.6);
      }
    }

    camera.lookAt(0, 0.1, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  api.ok = true;
  api.startSwirl = startSwirl;
  api.setSwirlProgress = setSwirlProgress;
  api.startShards = startShards;
  api.startBurn = startBurn;
  api.reset = reset;
  api.resize = resize;
  api.pause = (v) => { running = !v; };
  api.dim = dim;
  api.nudge = nudge;
  api.hideSwirl = hideSwirl;
  api.renderer = renderer;

  window.dispatchEvent(new CustomEvent("story:ready", { detail:{ ok:true } }));
  requestAnimationFrame(tick);
}
