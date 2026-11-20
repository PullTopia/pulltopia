/* PullTopia /pro/ — Three.js Cardverse viewer */
import * as THREE from "three";

const CARDS = [
  { id:"016", name:"Lunafuchs", no:"016/050", src:"../assets/img/card-016.webp" },
  { id:"023", name:"Ozeanwyrm", no:"023/050", src:"../assets/img/card-023.webp" },
  { id:"028", name:"Nexusfalke", no:"028/050", src:"../assets/img/card-028.webp" },
  { id:"033", name:"Vulkanphönix", no:"033/050", src:"../assets/img/card-033.webp" },
  { id:"045", name:"Kosmischer Wächter", no:"045/050", src:"../assets/img/card-045.webp" },
  { id:"050", name:"Schöpfungstitan", no:"050/050", src:"../assets/img/card-050.webp" }
];
const BACK = "../assets/img/cardback.webp";

const canvas = document.getElementById("gl");
const stage = document.getElementById("vstage");
const nameEl = document.getElementById("vname");
const fb = document.getElementById("vfb");
const thumbs = document.getElementById("thumbs");
const reduced = document.documentElement.classList.contains("rm");
const mobile = window.matchMedia("(max-width:820px)");

function noGL(){
  if (fb) fb.hidden = false;
  if (canvas) canvas.style.display = "none";
  const plat = document.querySelector(".platform");
  if (plat) plat.style.display = "none";
}

if (!canvas || !window.WebGLRenderingContext){
  noGL();
} else {
  try {
    const t = document.createElement("canvas");
    const ok = t.getContext("webgl2") || t.getContext("webgl");
    if (!ok) noGL();
    else {
      try { start(); }
      catch(err){ console.warn("viewer start", err); noGL(); }
    }
  } catch(e){ noGL(); }
}

function start(){

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile.matches, alpha: true, powerPreference:"high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0, 0.12, 4.2);

  const loader = new THREE.TextureLoader();
  function tex(url){
    return new Promise(function(res, rej){
      loader.load(url, function(t){
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        res(t);
      }, undefined, rej);
    });
  }

  const foilVert = `
    varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){
      vUv = uv;
      vec4 w = modelViewMatrix * vec4(position,1.0);
      vN = normalize(normalMatrix * normal);
      vV = normalize(-w.xyz);
      gl_Position = projectionMatrix * w;
    }
  `;
  const foilFrag = `
    uniform sampler2D map; uniform float time; uniform float foil;
    varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    vec3 irid(float t){
      return 0.55 + 0.45 * cos(6.28318*(vec3(0.0,0.33,0.67)+t));
    }
    void main(){
      vec4 base = texture2D(map, vUv);
      float fres = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.2);
      float ang = vUv.x * 1.4 + vUv.y * 0.8 + time * 0.08;
      vec3 rain = irid(ang);
      // specular streak
      float streak = pow(max(dot(normalize(vN), normalize(vec3(0.4,0.7,0.6))), 0.0), 28.0);
      vec3 col = base.rgb + rain * fres * 0.38 * foil + vec3(1.0,0.92,0.75) * streak * 0.65;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const W = 1.0, H = 1.4, T = 0.036;
  const group = new THREE.Group();
  scene.add(group);

  const amb = new THREE.AmbientLight(0x8899bb, 0.7);
  scene.add(amb);
  const key = new THREE.PointLight(0xffe0b0, 2.2, 12);
  key.position.set(1.6, 1.8, 2.4);
  scene.add(key);
  const fill = new THREE.PointLight(0x8a6aff, 1.1, 10);
  fill.position.set(-1.8, 0.4, 1.6);
  scene.add(fill);
  const rim = new THREE.PointLight(0xff9a3a, 1.4, 8);
  rim.position.set(0, -1.2, 1.2);
  scene.add(rim);

  // soft floor bounce
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1.6, 48),
    new THREE.MeshBasicMaterial({ color:0xff9a30, transparent:true, opacity:0.07, depthWrite:false })
  );
  floor.rotation.x = -Math.PI/2;
  floor.position.y = -1.05;
  scene.add(floor);

  let current = 0;
  let cardMesh = null;
  let swapping = false;
  const cache = {};

  function makeCard(front, back){
    const g = new THREE.Group();
    const frontMat = new THREE.ShaderMaterial({
      uniforms:{ map:{value:front}, time:{value:0}, foil:{value: mobile.matches?0.7:1} },
      vertexShader: foilVert, fragmentShader: foilFrag
    });
    const backMat = new THREE.MeshStandardMaterial({ map:back, roughness:0.45, metalness:0.15 });
    const edgeMat = new THREE.MeshStandardMaterial({ color:0x1a1208, roughness:0.4, metalness:0.6 });
    const box = new THREE.BoxGeometry(W, H, T);
    // assign materials: right, left, top, bottom, front, back
    const mats = [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat];
    const mesh = new THREE.Mesh(box, mats);
    g.add(mesh);
    g.userData.frontMat = frontMat;
    return g;
  }

  async function ensure(i){
    if (cache[i]) return cache[i];
    const [f,b] = await Promise.all([tex(CARDS[i].src), cache._back || tex(BACK)]);
    if (!cache._back) cache._back = b;
    cache[i] = { front:f, back: cache._back };
    return cache[i];
  }

  async function show(i, animate){
    const data = await ensure(i);
    current = i;
    if (nameEl) nameEl.innerHTML = CARDS[i].name + " <small>"+CARDS[i].no+"</small>";
    document.querySelectorAll(".thumbs button").forEach(function(btn){
      btn.classList.toggle("is-on", btn.getAttribute("data-id")===CARDS[i].id);
    });
    rotY=0; rotX=0; target.x=0; target.y=0; velX=0; velY=0;
    const next = makeCard(data.front, data.back);
    if (cardMesh && animate && !reduced){
      swapping = true;
      const prev = cardMesh;
      // fly previous out, new in
      next.scale.set(0.2,0.2,0.2);
      next.rotation.set(0.4, 1.6, 0.2);
      next.position.set(1.2, 0.3, 0);
      group.add(next);
      const t0 = performance.now();
      const dur = 700;
      function fly(now){
        const t = Math.min(1, (now-t0)/dur);
        const e = 1-Math.pow(1-t,3);
        prev.rotation.y += 0.08;
        prev.position.x = -1.4*e;
        prev.position.y = 0.25*e;
        prev.scale.setScalar(1-0.8*e);
        next.position.x = 1.2*(1-e);
        next.position.y = 0.3*(1-e);
        next.rotation.set(0.4*(1-e), 1.6*(1-e), 0.2*(1-e));
        next.scale.setScalar(0.2+0.8*e);
        if (t<1) requestAnimationFrame(fly);
        else {
          group.remove(prev);
          disposeGroup(prev);
          next.position.set(0,0,0);
          next.rotation.set(0,0,0);
          next.scale.set(1,1,1);
          cardMesh = next;
          swapping = false;
        }
      }
      requestAnimationFrame(fly);
    } else {
      if (cardMesh){ group.remove(cardMesh); disposeGroup(cardMesh); }
      group.add(next);
      cardMesh = next;
    }
  }

  function disposeGroup(g){
    g.traverse(function(o){
      if (o.geometry) o.geometry.dispose();
      // don't dispose shared textures
    });
  }

  if (thumbs){
    thumbs.addEventListener("click", function(e){
      const btn = e.target.closest("button[data-id]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const i = CARDS.findIndex(c => c.id===id);
      if (i>=0 && i!==current) show(i, true);
    });
  }

  // pointer drag / touch
  let dragging=false, lastX=0, lastY=0, velX=0, velY=0;
  let rotY=0, rotX=0;
  const target = { x:0, y:0 };
  function ptrDown(e){
    dragging=true;
    lastX = e.clientX || (e.touches&&e.touches[0].clientX) || 0;
    lastY = e.clientY || (e.touches&&e.touches[0].clientY) || 0;
    velX=velY=0;
    canvas.setPointerCapture && e.pointerId!=null && canvas.setPointerCapture(e.pointerId);
  }
  function ptrMove(e){
    if (!dragging) return;
    const x = e.clientX || (e.touches&&e.touches[0].clientX) || lastX;
    const y = e.clientY || (e.touches&&e.touches[0].clientY) || lastY;
    const dx = x-lastX, dy = y-lastY;
    lastX=x; lastY=y;
    velX = dx; velY = dy;
    target.y += dx * 0.012;
    target.x += dy * 0.008;
    target.x = Math.max(-0.7, Math.min(0.7, target.x));
    e.preventDefault();
  }
  function ptrUp(){ dragging=false; }
  canvas.addEventListener("pointerdown", ptrDown);
  window.addEventListener("pointermove", ptrMove, {passive:false});
  window.addEventListener("pointerup", ptrUp);
  canvas.addEventListener("touchstart", function(e){ if(e.touches[0]) ptrDown(e.touches[0]); }, {passive:true});
  canvas.addEventListener("touchmove", function(e){ if(e.touches[0]) ptrMove(e.touches[0]); }, {passive:false});
  canvas.addEventListener("touchend", ptrUp);

  function resize(){
    const r = stage.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    const dpr = Math.min(window.devicePixelRatio||1, mobile.matches?1.75:2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize, {passive:true});

  let visible = false;
  const io = new IntersectionObserver(function(entries){
    visible = entries[0] && entries[0].isIntersecting;
  }, { threshold: 0.05 });
  io.observe(stage);

  let t0 = performance.now();
  function frame(now){
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(0.05, (now-t0)/1000);
    t0 = now;
    if (!dragging){
      target.y += velX * 0.012; velX *= 0.92;
      target.x += velY * 0.008; velY *= 0.92;
      target.x *= 0.98;
      if (!reduced){
        target.y += dt * 0.18; // idle spin
      }
    }
    rotY += (target.y - rotY) * 0.12;
    rotX += (target.x - rotX) * 0.12;
    if (cardMesh && !swapping){
      const idle = reduced ? 0 : Math.sin(now*0.0014)*0.06;
      cardMesh.rotation.set(rotX, rotY, 0);
      cardMesh.position.y = idle;
      if (cardMesh.userData.frontMat){
        cardMesh.userData.frontMat.uniforms.time.value = now*0.001;
      }
    }
    renderer.render(scene, camera);
  }

  show(0, false).then(function(){ requestAnimationFrame(frame); }).catch(function(err){
    console.warn("viewer", err);
    noGL();
  });
}
