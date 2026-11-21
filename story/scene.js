/* PullTopia /story/ — Three.js: swirl, refractive crystals, burning tags */
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
  setBurnProgress(){},
  getShardScreens(){ return []; },
  reset(){},
  resize(){},
  pause(){},
  dim(){},
  nudge(){},
  lingerSwirl(){},
  hideSwirl(){}
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
  camera.position.set(0, 0.15, 8.8);

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

  let coinTex, swirlTex, holdTex, emberTex;
  try {
    [coinTex, swirlTex, holdTex, emberTex] = await Promise.all([
      loadTex("img/coin-alpha.webp").catch(() => loadTex("img/coin.webp")),
      loadTex("img/world-swirl.webp"),
      loadTex("img/world-hold.webp"),
      loadTex("img/world-ember.webp")
    ]);
  } catch (e) { console.warn("story textures", e); }

  let envMap = null;
  if (swirlTex){
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      envMap = pmrem.fromEquirectangular(swirlTex).texture;
      pmrem.dispose();
    } catch (e) {}
  }

  const bgMat = new THREE.MeshBasicMaterial({ map: holdTex || swirlTex || null, depthWrite: false, transparent: false });
  const bgPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bgMat);
  bgPlane.position.z = -8;
  bgPlane.renderOrder = -20;
  bgPlane.visible = false;
  scene.add(bgPlane);
  function fitBg(){
    const dist = Math.abs(bgPlane.position.z - camera.position.z);
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * dist;
    const w = h * camera.aspect;
    bgPlane.scale.set(w*1.05, h*1.05, 1);
  }
  fitBg();

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
    envMapIntensity: 0.9,
    transparent: true
  });
  const coinEdge = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.9, roughness: 0.35, envMap: envMap || null, transparent: true });
  for (let i=0;i<nCoins;i++){
    const m = new THREE.Mesh(coinGeo, [coinEdge, coinMat, coinMat]);
    const a = (i / nCoins) * Math.PI * 2;
    const r = 2.1 + (i % 3) * 0.55;
    m.userData = { a, r, y: (i%5-2)*0.55 - 0.35, spin: 0.8 + (i%4)*0.25, tilt: (i%2?1:-1)*0.4 };
    m.position.set(Math.cos(a)*r, m.userData.y, Math.sin(a)*r*0.32);
    m.rotation.x = Math.PI / 2;
    swirlRoot.add(m);
    coins.push(m);
  }

  const cardGeo = new THREE.BoxGeometry(1.05, 1.47, 0.03);
  const backTex = await loadTex("../assets/img/cardback.webp").catch(() => null);
  const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.45, metalness: 0.1, transparent: true });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x1a1220, roughness: 0.5, metalness: 0.2, transparent: true });
  for (let i=0;i<CARDS.length;i++){
    const front = await loadTex(CARDS[i]).catch(() => null);
    const frontMat = new THREE.MeshStandardMaterial({ map: front, roughness: 0.4, metalness: 0.15, transparent: true });
    const mats = [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat];
    const m = new THREE.Mesh(cardGeo, mats);
    const a = (i / CARDS.length) * Math.PI * 2 + 0.4;
    const r = 2.6 + (i%2)*0.4;
    m.userData = { a, r, y: (i%3-1)*0.85 - 0.4, spin: 0.25 + i*0.04 };
    m.position.set(Math.cos(a)*r, m.userData.y, Math.sin(a)*r*0.32);
    swirlRoot.add(m);
    cards.push(m);
  }

  /* ---------- faceted refractive shards ---------- */
  const crystalVert = /* glsl */`
    varying vec3 vN; varying vec3 vV; varying vec3 vW;
    void main(){
      vec4 wp = modelMatrix * vec4(position,1.0);
      vW = wp.xyz;
      vN = normalize(mat3(modelMatrix) * normal);
      vV = cameraPosition - wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;
  const crystalFrag = /* glsl */`
    uniform sampler2D uBg;
    uniform vec2 uRes;
    uniform float uTime;
    varying vec3 vN; varying vec3 vV; varying vec3 vW;
    void main(){
      vec3 n = normalize(vN);
      vec3 v = normalize(vV);
      float ndv = abs(dot(n, v));
      float fres = pow(1.0 - ndv, 1.7);
      float facet = pow(1.0 - ndv, 5.5);
      vec2 uv = gl_FragCoord.xy / uRes;
      vec2 off = -n.xy * (0.11 + 0.03*sin(uTime + vW.x*3.0));
      vec3 bg;
      bg.r = texture2D(uBg, clamp(uv + off*1.18, 0.0, 1.0)).r;
      bg.g = texture2D(uBg, clamp(uv + off, 0.0, 1.0)).g;
      bg.b = texture2D(uBg, clamp(uv + off*0.80, 0.0, 1.0)).b;
      vec3 tint = mix(vec3(0.40, 0.78, 1.0), vec3(1.0, 0.74, 0.28), 0.38 + 0.18*sin(uTime*0.7+vW.y));
      vec3 glass = bg * 0.92 + tint * 0.10;
      vec3 edge = tint * fres * 1.15 + vec3(1.0, 0.90, 0.52) * facet * 1.55;
      float alpha = 0.22 + fres * 0.62;
      gl_FragColor = vec4(glass + edge, alpha);
    }
  `;

  function hash(i){ return (Math.sin(i*127.1 + 311.7)*43758.5453)%1; }
  function makeShardGeo(s){
    const g = new THREE.IcosahedronGeometry(1, 0);
    g.scale(0.78 + s*0.16, 1.28 + s*0.2, 0.38 + s*0.12);
    const pos = g.attributes.position;
    for (let i=0;i<pos.count;i++){
      const hx = hash(i+s*10), hy = hash(i+17+s*7), hz = hash(i+29+s*3);
      pos.setXYZ(i,
        pos.getX(i) * (1 + (hx-0.5)*0.2),
        pos.getY(i) * (1 + (hy-0.5)*0.14),
        pos.getZ(i) * (1 + (hz-0.5)*0.22)
      );
    }
    g.computeVertexNormals();
    return g;
  }

  const rt = new THREE.WebGLRenderTarget(4, 4, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter
  });
  if (rt.texture) rt.texture.colorSpace = THREE.SRGBColorSpace;
  function syncRt(){
    const sz = new THREE.Vector2();
    renderer.getDrawingBufferSize(sz);
    const w = Math.max(2, Math.floor(sz.x)), h = Math.max(2, Math.floor(sz.y));
    if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
    shards.forEach((m) => { if (m.material && m.material.uniforms && m.material.uniforms.uRes) m.material.uniforms.uRes.value.set(w, h); });
  }

  const shards = [];
  for (let i=0;i<3;i++){
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uBg: { value: rt.texture },
        uRes: { value: new THREE.Vector2(app.clientWidth, app.clientHeight) },
        uTime: { value: 0 }
      },
      vertexShader: crystalVert,
      fragmentShader: crystalFrag,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false
    });
    const m = new THREE.Mesh(makeShardGeo(i+0.3), mat);
    m.userData = { i, spin: 0.18 + i*0.05 };
    shardRoot.add(m);
    shards.push(m);
  }
  function layoutShards(){
    const mob = isMob();
    shards.forEach((m,i) => {
      if (mob){
        m.scale.setScalar(0.72);
        m.position.set((i-1)*0.18, 1.35 - i*1.28, 0.05*i);
        m.rotation.set(0.15, 0.4+i*0.4, (i-1)*0.2);
      } else {
        m.scale.setScalar(1.05);
        const slot = [ [-2.05, 0.65, 0.1], [0.05, 0.1, 0.25], [2.1, 0.55, -0.05] ][i];
        m.position.set(slot[0], slot[1], slot[2]);
        m.rotation.set(0.2, 0.5+i*0.5, (i-1)*0.18);
      }
    });
  }
  layoutShards();
  syncRt();

  /* ---------- burn tags, thin dissolve edge ---------- */
  const tags = [];
  function tagTexture(){
    const c = document.createElement("canvas");
    c.width = 512; c.height = 320;
    const g = c.getContext("2d");
    g.fillStyle = "#1a1208";
    g.strokeStyle = "#e8b85a";
    g.lineWidth = 10;
    g.beginPath();
    const x=16,y=16,w=480,h=288,r=12;
    g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath();
    g.fill(); g.stroke();
    g.beginPath(); g.arc(70, 160, 16, 0, Math.PI*2); g.fillStyle = "#000"; g.fill();
    g.strokeStyle = "#e8b85a"; g.lineWidth = 4; g.stroke();
    g.fillStyle = "#ffdc8a";
    g.font = "700 48px Cinzel, Georgia, serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("SCALPER-PREIS", 280, 150);
    g.strokeStyle = "rgba(200,40,30,0.85)";
    g.lineWidth = 8;
    g.beginPath(); g.moveTo(90, 230); g.lineTo(460, 90); g.stroke();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const burnVert = /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
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
    float fbm(vec2 p){ return noise(p)*0.55 + noise(p*2.1)*0.3 + noise(p*4.3)*0.15; }
    void main(){
      vec4 col = texture2D(uMap, vUv);
      float n = fbm(vUv*7.5 + vec2(0.0, uTime*0.08));
      // edge also starts a little from the border
      float border = min(min(vUv.x, 1.0-vUv.x), min(vUv.y, 1.0-vUv.y));
      float field = n * 0.82 + (1.0-smoothstep(0.0, 0.14, border))*0.18;
      float t = uBurn;
      float ew = 0.055;
      if (field < t) discard;
      float rim = 1.0 - smoothstep(t, t + ew, field);
      vec3 ember = vec3(1.0, 0.42, 0.05);
      vec3 hot = vec3(1.0, 0.85, 0.35);
      col.rgb = mix(col.rgb, mix(ember, hot, rim), rim);
      col.rgb += mix(ember, hot, rim*0.6) * rim * 1.15;
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
      py: 1.15 + (i%4)*0.4,
      pz: (i%2?0.3:-0.4)*i*0.08,
      rot: (i-3)*0.18,
      delay: i * 0.18,
      vy: 0
    };
    m.position.set(m.userData.px, m.userData.py, m.userData.pz);
    m.rotation.z = m.userData.rot;
    burnRoot.add(m);
    tags.push(m);
  }

  const nEmb = isMob() ? 80 : 160;
  const embPos = new Float32Array(nEmb*3);
  const embVel = [];
  for (let i=0;i<nEmb;i++){
    embPos[i*3] = (Math.random()-0.5)*6;
    embPos[i*3+1] = Math.random()*3-0.5;
    embPos[i*3+2] = (Math.random()-0.5)*3;
    embVel.push({ vx:(Math.random()-.5)*0.3, vy:0.35+Math.random()*0.7, life: Math.random() });
  }
  const embGeo = new THREE.BufferGeometry();
  embGeo.setAttribute("position", new THREE.BufferAttribute(embPos, 3));
  const embMat = new THREE.PointsMaterial({ color: 0xff7a1a, size: 0.055, transparent: true, opacity: 0.9, depthWrite: false });
  const embers = new THREE.Points(embGeo, embMat);
  embers.visible = false;
  scene.add(embers);

  /* state */
  let mode = "idle";
  let swirlP = 0;
  let swirlLinger = 0;
  let burnT = 0;
  let burnScrub = 0;
  let t0 = performance.now();
  let running = true;
  let yaw = 0, pit = 0;

  function setMatsOpacity(root, a){
    root.traverse(function(o){
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      mats.forEach(function(m){ if (m && m.opacity !== undefined){ m.transparent = true; m.opacity = a; } });
    });
  }

  function startSwirl(){
    mode = "swirl";
    swirlLinger = 1;
    swirlRoot.visible = true;
    shardRoot.visible = false;
    burnRoot.visible = false;
    embers.visible = false;
    bgPlane.visible = false;
    swirlP = 0;
    setMatsOpacity(swirlRoot, 1);
    camera.position.set(0, 0.15, 8.8);
    running = true;
  }
  function setSwirlProgress(p){ swirlP = Math.max(0, Math.min(1, p)); }
  function lingerSwirl(level){
    swirlLinger = Math.max(0, Math.min(1, level));
    swirlRoot.visible = swirlLinger > 0.02;
    setMatsOpacity(swirlRoot, 0.16 + swirlLinger*0.35);
    // leave swirl mode so tick parks objects at the edges instead of through the prompt
    if (swirlLinger > 0.02 && (mode === "swirl" || mode === "linger" || mode === "idle")) mode = "linger";
  }
  function hideSwirl(){ lingerSwirl(0); }

  function startShards(){
    mode = "shards";
    lingerSwirl(0.18);
    camera.position.set(0, 0.15, 8.6);
    shardRoot.visible = true;
    shardRoot.scale.setScalar(0.15);
    burnRoot.visible = false;
    embers.visible = false;
    bgPlane.visible = true;
    if (holdTex) bgMat.map = holdTex;
    bgMat.needsUpdate = true;
    layoutShards();
    yaw = 0; pit = 0;
    running = true;
  }
  function startBurn(){
    mode = "burn";
    lingerSwirl(0);
    camera.position.set(0, 0.2, 8.2);
    shardRoot.visible = false;
    burnRoot.visible = true;
    embers.visible = true;
    bgPlane.visible = true;
    if (emberTex) bgMat.map = emberTex;
    bgMat.needsUpdate = true;
    embMat.opacity = 0.9;
    burnT = 0; burnScrub = 0;
    tags.forEach((m) => {
      m.position.set(m.userData.px, m.userData.py, m.userData.pz);
      m.userData.vy = 0;
      m.material.uniforms.uBurn.value = 0;
      m.visible = true;
    });
    running = true;
  }
  function setBurnProgress(p){ burnScrub = Math.max(burnScrub, Math.max(0, Math.min(1, p))); }
  function dim(){
    mode = "dim";
    shardRoot.visible = false;
  }
  function reset(){
    mode = "idle";
    swirlRoot.visible = shardRoot.visible = burnRoot.visible = embers.visible = bgPlane.visible = false;
    swirlP = 0; swirlLinger = 0; burnT = 0; burnScrub = 0; yaw = 0; pit = 0;
    setMatsOpacity(swirlRoot, 1);
  }
  function resize(){
    const w = app.clientWidth, h = Math.max(1, app.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isMob() ? 1.5 : 2));
    renderer.setSize(w, h, false);
    syncRt();
    fitBg();
    if (mode === "shards") layoutShards();
  }
  function nudge(dx, dy){
    yaw += dx * 0.005;
    pit += dy * 0.003;
    pit = Math.max(-0.5, Math.min(0.5, pit));
  }
  function getShardScreens(){
    const w = app.clientWidth, h = app.clientHeight;
    const v = new THREE.Vector3();
    return shards.map(m => {
      m.getWorldPosition(v);
      v.project(camera);
      return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h };
    });
  }

  function tick(now){
    const dt = Math.min(0.05, (now - t0)/1000);
    t0 = now;
    const t = now * 0.001;

    if (mode === "swirl" || (swirlRoot.visible && swirlLinger > 0)){
      const spread = 0.9 + swirlP * 0.28;
      const slow = (mode === "swirl") ? 1 : 0.45;
      coins.forEach((m,i) => {
        const u = m.userData;
        u.a += u.spin * 0.25 * dt * slow;
        const linger = mode !== "swirl";
        const r = u.r * spread * (linger ? 1.85 : 1);
        const yOff = linger ? -1.05 : 0;
        m.scale.setScalar(linger ? 0.7 : 1);
        let x = Math.cos(u.a)*r;
        if (linger && Math.abs(x) < 2.35) x = Math.sign(x || 1) * 2.35;
        m.position.set(x, u.y + yOff + Math.sin(t*0.8+i)*0.12, Math.sin(u.a)*r*0.32);
        m.rotation.x = Math.PI/2 + Math.sin(t*u.spin)*0.2;
        m.rotation.z = t * u.spin * slow;
      });
      cards.forEach((m,i) => {
        const u = m.userData;
        u.a += u.spin * dt * slow;
        const linger = mode !== "swirl";
        const r = u.r * spread * (linger ? 1.85 : 1);
        const yOff = linger ? -1.15 : 0;
        m.scale.setScalar(linger ? 0.7 : 1);
        let x = Math.cos(u.a)*r;
        if (linger && Math.abs(x) < 2.5) x = Math.sign(x || 1) * 2.5;
        m.position.set(x, u.y + yOff + Math.sin(t*0.6+i)*0.1, Math.sin(u.a)*r*0.32);
        m.lookAt(0, m.position.y*0.3, 0);
        m.rotateY(Math.sin(t*0.5+i)*0.15);
      });
      swirlRoot.rotation.y = t * 0.12 * slow;
      if (mode === "swirl"){
        camera.position.z = 8.8 - swirlP * 0.35;
        camera.position.y = 0.1 + swirlP * 0.08;
        fill.intensity = 0.5 + swirlP * 0.6;
      } else {
        // linger: keep group scale 1 so world radii stay at the edges

      }
    }
    if (mode === "swirl") swirlRoot.scale.setScalar(1);

    if (mode === "shards"){
      const sc = shardRoot.scale.x;
      if (sc < 1) shardRoot.scale.setScalar(Math.min(1, sc + dt*2.2));
      shards.forEach((m,i) => {
        m.rotation.y += m.userData.spin * dt + yaw*0.02;
        m.rotation.x += Math.sin(t*0.5+i)*0.08*dt + pit*0.01;
        m.position.y += Math.sin(t*0.7+i)*0.15*dt;
        m.material.uniforms.uTime.value = t;
      });
    }

    if (mode === "burn" || mode === "dim"){
      burnT += dt;
      const auto = Math.min(1, burnT / 3.9);
      const p = Math.max(auto, burnScrub);
      tags.forEach((m) => {
        const u = m.userData;
        const local = Math.max(0, p * 3.9 - u.delay) / 3.6;
        const b = Math.min(1, local);
        // slow fall so they stay readable while the edge eats them
        u.vy += 0.55 * dt;
        m.position.y -= u.vy * dt;
        m.rotation.z += 0.12 * dt;
        m.material.uniforms.uBurn.value = b;
        m.material.uniforms.uTime.value = t;
        if (b >= 0.99) m.visible = false;
      });
      const pos = embers.geometry.attributes.position.array;
      for (let i=0;i<nEmb;i++){
        const v = embVel[i];
        pos[i*3] += v.vx * dt;
        pos[i*3+1] += v.vy * dt;
        v.life -= dt*0.22;
        if (pos[i*3+1] > 4 || v.life <= 0){
          pos[i*3] = (Math.random()-0.5)*5;
          pos[i*3+1] = -0.4 + Math.random()*1.2;
          pos[i*3+2] = (Math.random()-0.5)*3;
          v.life = 1;
        }
      }
      embers.geometry.attributes.position.needsUpdate = true;
      if (mode === "dim"){
        embers.material.opacity = Math.max(0, embers.material.opacity - dt*0.5);
        burnRoot.visible = false;
      }
    }

    camera.lookAt(0, 0.1, 0);

    if (mode === "shards"){
      syncRt();
      shardRoot.visible = false;
      renderer.setRenderTarget(rt);
      renderer.setClearColor(0x000000, 1);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.setClearColor(0x000000, 0);
      shardRoot.visible = true;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  api.ok = true;
  api.startSwirl = startSwirl;
  api.setSwirlProgress = setSwirlProgress;
  api.startShards = startShards;
  api.startBurn = startBurn;
  api.setBurnProgress = setBurnProgress;
  api.getShardScreens = getShardScreens;
  api.reset = reset;
  api.resize = resize;
  api.pause = (v) => { running = !v; };
  api.dim = dim;
  api.nudge = nudge;
  api.lingerSwirl = lingerSwirl;
  api.hideSwirl = hideSwirl;
  api.renderer = renderer;

  window.dispatchEvent(new CustomEvent("story:ready", { detail:{ ok:true } }));
  requestAnimationFrame(tick);
}
