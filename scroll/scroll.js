/* PullTopia /scroll/ — scroll-driven booster stage */
(function(){
  "use strict";
  var reduced = document.documentElement.classList.contains("rm") ||
    (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (reduced) document.documentElement.classList.add("rm");

  var mobile = window.matchMedia("(max-width:820px)");
  var secs = [].slice.call(document.querySelectorAll(".sec"));
  var bgs = [].slice.call(document.querySelectorAll(".bg"));
  var words = [].slice.call(document.querySelectorAll(".word"));
  var panels = [].slice.call(document.querySelectorAll(".panel"));
  var bst = document.getElementById("bst");
  var bstTop = bst.querySelector(".bst-half.top");
  var bstBot = bst.querySelector(".bst-half.bot");
  var bstLight = bst.querySelector(".bst-light");
  var flyBox = document.getElementById("fly");
  var canvas = document.getElementById("sparks");
  var ctx = canvas.getContext("2d", { alpha: true });
  var navLinks = [].slice.call(document.querySelectorAll(".nv-links a"));

  var CARDS = ["016","023","028","033","045","050"];
  var CARD_SRC = function(n){ return "../neon/scenes/cvf-"+n+".webp"; };

  function lerp(a,b,t){ return a + (b-a)*t; }
  function clamp(v,a,b){ return v<a?a:v>b?b:v; }
  function easeInOut(t){ return t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; }
  function smooth(a,b,x){ var t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); }

  /* ---------- flying objects (progress-driven, end state on skip) ---------- */
  function rng(seed){
    var s = seed|0;
    return function(){ s = (s*1664525 + 1013904223)>>>0; return s/4294967296; };
  }

  var bursts = []; // { startP, endP, items:[{el,type,path...}] }
  var finaleCards = [];

  function makeFly(type, src, w){
    var el = document.createElement("div");
    el.className = "fly" + (type==="card"?" is-card":"");
    el.style.width = w + "px";
    var img = document.createElement("img");
    img.src = src; img.alt = ""; img.decoding = "async"; img.draggable = false;
    el.appendChild(img);
    flyBox.appendChild(el);
    return el;
  }

  function seedBursts(){
    flyBox.textContent = "";
    bursts = [];
    // one burst at each section boundary after intro
    var ids = ["drops","news","tausch","cardverse","premium"];
    ids.forEach(function(id, i){
      var r = rng(1400+i*97);
      var items = [];
      var nCard = id==="cardverse" || id==="tausch" ? 5 : 3;
      var nCoin = id==="premium" || id==="drops" ? 8 : 5;
      var nGem  = id==="premium" || id==="cardverse" ? 5 : 3;
      var k;
      for (k=0;k<nCard;k++){
        var n = CARDS[(k+i)%CARDS.length];
        items.push({
          el: makeFly("card", CARD_SRC(n), 92 + (r()*28)|0),
          type:"card",
          ang: (r()*2-1)*140,
          spin: (r()*2-1)*420,
          dist: 280 + r()*420,
          dir: (r()*Math.PI*2),
          lift: -40 - r()*80,
          delay: r()*0.15
        });
      }
      for (k=0;k<nCoin;k++){
        items.push({
          el: makeFly("coin", "img/coin.png", 28 + (r()*22)|0),
          type:"coin",
          ang: (r()*2-1)*180,
          spin: (r()*2-1)*720,
          dist: 200 + r()*480,
          dir: (r()*Math.PI*2),
          lift: -20 - r()*60,
          delay: r()*0.2
        });
      }
      for (k=0;k<nGem;k++){
        items.push({
          el: makeFly("gem", "img/gem.png", 22 + (r()*18)|0),
          type:"gem",
          ang: (r()*2-1)*160,
          spin: (r()*2-1)*540,
          dist: 180 + r()*400,
          dir: (r()*Math.PI*2),
          lift: -30 - r()*70,
          delay: r()*0.18
        });
      }
      bursts.push({ target:id, items:items });
    });

    // finale: cards fly out and settle
    finaleCards = [];
    var r2 = rng(99);
    var settle = [
      {x:-250,y:-20, rot:-18, s:1.02},
      {x: 250,y:-16, rot: 16, s:1.02},
      {x:-280,y: 70, rot:-10, s:.90},
      {x: 280,y: 66, rot: 12, s:.90},
      {x:-200,y:130, rot: -6, s:.82},
      {x: 200,y:126, rot:  7, s:.82}
    ];
    settle.forEach(function(g, i){
      var n = CARDS[i%CARDS.length];
      finaleCards.push({
        el: makeFly("card", CARD_SRC(n), 110),
        goal:g,
        spin0: (r2()*2-1)*220,
        delay: i*0.04
      });
    });
  }
  seedBursts();

  function placeFly(el, x, y, rot, sc, op){
    el.style.opacity = op;
    el.style.transform = "translate(-50%,-50%) translate("+x+"px,"+y+"px) rotate("+rot+"deg) scale("+sc+")";
  }

  /* ---------- videos ---------- */
  function isMob(){ return mobile.matches; }
  function videoUrl(name){
    return "../neon/scenes/"+name+(isMob()?"-m":"")+".mp4";
  }
  function loadVideo(bg){
    if (reduced) return;
    var v = bg.querySelector(".bg-v");
    if (!v || v.dataset.loaded==="1") return;
    var name = bg.getAttribute("data-bg");
    v.src = videoUrl(name);
    v.dataset.loaded = "1";
    var go = function(){ v.classList.add("is-ready"); v.play().catch(function(){}); };
    if (v.readyState>=2) go(); else v.addEventListener("canplay", go, {once:true});
  }
  function updateVideos(weights){
    bgs.forEach(function(bg){
      var name = bg.getAttribute("data-bg");
      var w = weights[name]||0;
      bg.style.opacity = String(w);
      bg.classList.toggle("is-on", w>0.04);
      var v = bg.querySelector(".bg-v");
      if (w>0.05){
        loadVideo(bg);
        if (v && v.dataset.loaded==="1" && v.paused && !reduced) v.play().catch(function(){});
      } else if (v && !v.paused){
        v.pause();
      }
    });
    // preload neighbors: handled by weights > 0 during crossfade
  }
  mobile.addEventListener("change", function(){
    bgs.forEach(function(bg){
      var v = bg.querySelector(".bg-v");
      if (!v) return;
      v.removeAttribute("src"); v.load();
      v.dataset.loaded = "";
      v.classList.remove("is-ready");
    });
  });

  /* ---------- founder count-up (once, when premium is in view) ---------- */
  var counted = false;
  function runCount(){
    if (counted) return;
    counted = true;
    var nEl = document.querySelector(".fc-free");
    var bar = document.querySelector(".fbar i");
    var target = 50;
    if (reduced){
      if (nEl) nEl.textContent = "50";
      if (bar) bar.style.setProperty("--fw","100%");
      return;
    }
    var t0 = performance.now();
    var dur = 900;
    (function tick(now){
      var t = clamp((now-t0)/dur,0,1);
      var e = 1-Math.pow(1-t,3);
      if (nEl) nEl.textContent = String(Math.round(e*target));
      if (bar) bar.style.setProperty("--fw", (e*100).toFixed(1)+"%");
      if (t<1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------- sparks ---------- */
  var sparks = [];
  function resizeCanvas(){
    var dpr = Math.min(window.devicePixelRatio||1, 2);
    var w = canvas.clientWidth || innerWidth;
    var h = canvas.clientHeight || innerHeight;
    canvas.width = Math.round(w*dpr);
    canvas.height = Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  function emitSparks(n, energy){
    var i, a, sp;
    for (i=0;i<n;i++){
      a = Math.random()*Math.PI*2;
      sp = 80+Math.random()*260*energy;
      sparks.push({
        x: innerWidth/2, y: innerHeight*0.46,
        vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - 40,
        life: 1, decay: 0.55+Math.random()*0.7,
        size: 1+Math.random()*2.2,
        gold: Math.random()
      });
    }
  }
  var lastBurstKey = "";
  function sparkStep(dt, energy){
    var w = innerWidth, h = innerHeight;
    ctx.clearRect(0,0,w,h);
    if (reduced) return;
    var i, s;
    for (i=sparks.length-1;i>=0;i--){
      s = sparks[i];
      s.life -= s.decay*dt;
      if (s.life<=0){ sparks.splice(i,1); continue; }
      s.x += s.vx*dt; s.y += s.vy*dt; s.vy += 80*dt;
      var a = Math.max(0, s.life);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = s.gold>0.4 ? "rgba(255,210,100,"+(a*.9)+")" : "rgba(180,140,255,"+(a*.75)+")";
      ctx.beginPath();
      ctx.arc(s.x,s.y,s.size*(0.6+a),0,Math.PI*2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  /* ---------- layout / progress ---------- */
  function layout(){
    // midpoints in document Y
    return secs.map(function(sec){
      var r = sec.getBoundingClientRect();
      var top = r.top + window.scrollY;
      return { el:sec, id:sec.id, top:top, h:sec.offsetHeight, mid:top+sec.offsetHeight*0.42,
        bg:sec.getAttribute("data-bg")||"", word:sec.getAttribute("data-word")||"" };
    });
  }
  var lay = layout();
  window.addEventListener("resize", function(){ lay = layout(); });

  function weightsAt(focusY){
    var w = {};
    var i, a, b, t, id;
    if (!lay.length) return w;
    // find two nearest section mids
    for (i=0;i<lay.length;i++){
      if (focusY < lay[i].mid) break;
    }
    if (i<=0){ w[lay[0].bg]=1; return w; }
    if (i>=lay.length){ w[lay[lay.length-1].bg]=1; return w; }
    a = lay[i-1]; b = lay[i];
    t = smooth(a.mid, b.mid, focusY);
    w[a.bg] = 1-t;
    w[b.bg] = t;
    return w;
  }

  function activeIndex(focusY){
    var i;
    for (i=0;i<lay.length;i++){
      if (focusY < lay[i].top + lay[i].h) return i;
    }
    return Math.max(0, lay.length-1);
  }

  function sectionLocal(i, y){
    var s = lay[i];
    if (!s) return 0;
    return clamp((y - s.top) / Math.max(1,s.h - innerHeight*0.15), 0, 1);
  }

  /* overall 0-1 */
  function overallP(){
    var max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    return clamp(window.scrollY / max, 0, 1);
  }

  /* booster motion */
  function applyBooster(p, ai, focusY){
    var id = lay[ai] ? lay[ai].id : "intro";
    var premEl = document.getElementById("premium");
    var joinEl = document.getElementById("join");
    var yTop = window.scrollY + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hdr"))||80);
    var prem = !!(premEl && joinEl && yTop < joinEl.offsetTop - 8 && (window.scrollY + innerHeight) > premEl.offsetTop + 40);
    var fin  = id==="join" || (joinEl && window.scrollY + innerHeight*0.4 >= joinEl.offsetTop);
    document.body.classList.toggle("is-premium", prem && !fin);
    document.body.classList.toggle("is-finale", fin);

    var ry=0, rx=0, rz=0, sc=1, ty=0;
    if (!reduced){
      ry = Math.sin(p*Math.PI*2.15)*18;
      rx = Math.sin(p*Math.PI*1.35)*7;
      rz = Math.sin(p*Math.PI*0.9)*4;
      sc = 1 + Math.sin(p*Math.PI)*0.05;
    }

    // premium: shrink & lift so the founder box is readable
    if (prem){
      var lp = sectionLocal(ai, focusY);
      var u = easeInOut(clamp(lp*1.4,0,1));
      sc = lerp(sc, isMob()?0.70:0.58, u);
      ty = 0; // stage alignment handled in CSS
      ry *= (1-u*0.65);
      rx *= (1-u*0.65);
    }

    // finale: settle, then tear open
    var open = 0;
    if (fin){
      var lp = sectionLocal(ai, focusY);
      var settle = easeInOut(clamp(lp/0.22,0,1));
      ry = lerp(ry, 0, settle);
      rx = lerp(rx, 0, settle);
      rz = lerp(rz, 0, settle);
      sc = lerp(sc, isMob()?0.78:0.86, settle);
      ty = 0;
      open = reduced ? (lp>0.18?1:0) : easeInOut(clamp((lp-0.18)/0.35,0,1));
    } else if (p>0.96){
      open = 1;
    }
    document.body.classList.toggle("is-open", open>0.55);

    var spread = open*58;
    var rotTop = open*-28;
    var rotBot = open*8;
    if (bstTop) bstTop.style.transform = "translateY("+(-spread)+"px) rotateZ("+rotTop+"deg)";
    if (bstBot) bstBot.style.transform = "translateY("+(spread*0.35)+"px) rotateZ("+rotBot+"deg)";
    if (bstLight){ bstLight.style.opacity = String(open); bstLight.style.transform = "scaleX("+(0.2+0.8*open)+")"; }

    bst.style.transform = "translate3d(0,"+ty+"px,0) rotateX("+rx.toFixed(2)+"deg) rotateY("+ry.toFixed(2)+"deg) rotateZ("+rz.toFixed(2)+"deg) scale("+sc.toFixed(3)+")";
    return { open:open, id:id };
  }

  function applyWords(ai, focusY){
    var cur = lay[ai];
    words.forEach(function(w){
      var on = cur && w.getAttribute("data-for")===cur.word && cur.word;
      // fade around mid
      var op = 0;
      if (on){
        var d = Math.abs(focusY - cur.mid) / Math.max(200, cur.h*0.55);
        op = clamp(1-d, 0, 1);
        if (reduced) op = 1;
      }
      w.classList.toggle("is-on", op>0.08);
      w.style.opacity = String(op);
    });
  }

  function applyPanels(ai, focusY){
    panels.forEach(function(p){
      var r = p.getBoundingClientRect();
      var vis = r.bottom > innerHeight*0.18 && r.top < innerHeight*0.92;
      p.classList.toggle("is-on", vis);
      p.style.opacity = vis ? "1" : "0";
    });
    navLinks.forEach(function(a){
      var href = a.getAttribute("href")||"";
      a.classList.toggle("is-on", lay[ai] && href==="#"+lay[ai].id);
    });
  }

  function applyBursts(ai, focusY, p){
    // each burst is tied to the arrival into its target section
    bursts.forEach(function(b){
      var idx = -1, i;
      for (i=0;i<lay.length;i++) if (lay[i].id===b.target) idx=i;
      if (idx<1) return;
      var from = lay[idx-1].mid, to = lay[idx].mid;
      // local 0-1 across the transition, linger a bit after mid
      var t = clamp((focusY - from) / Math.max(1, (to-from)*1.15), 0, 1);
      // end state: gone
      b.items.forEach(function(it){
        var lt = clamp((t - it.delay)/0.85, 0, 1);
        var vis = (lt<=0 || lt>=1) ? 0 : Math.sin(lt*Math.PI);
        if (reduced){ it.el.style.opacity=0; return; }
        if (vis<=0.001){ it.el.style.opacity=0; return; }
        var e = easeInOut(lt);
        var x = Math.cos(it.dir)*it.dist*e;
        var y = Math.sin(it.dir)*it.dist*e + it.lift*e;
        var rot = it.ang + it.spin*e;
        var sc = it.type==="card" ? lerp(0.4,1,Math.min(1,lt*1.4)) : 1;
        placeFly(it.el, x, y, rot, sc, vis);
      });
      // emit sparks once when crossing the heart of the transition
      var key = b.target+":"+(t>0.25 && t<0.85 ? "on":"off");
      if (!reduced && key!==lastBurstKey && t>0.25 && t<0.55){
        lastBurstKey = key;
        emitSparks(isMob()?18:36, 1);
      }
    });

    // finale cards
    var fi = -1, i;
    for (i=0;i<lay.length;i++) if (lay[i].id==="join") fi=i;
    var openT = 0;
    if (fi>=0){
      var lp = sectionLocal(fi, focusY);
      openT = reduced ? (lp>0.2?1:0) : clamp((lp-0.2)/0.45, 0, 1);
    }
    finaleCards.forEach(function(it){
      var lt = clamp((openT-it.delay)/0.75, 0, 1);
      var e = easeInOut(lt);
      var g = it.goal;
      // scale for mobile
      var m = isMob()?0.62:1;
      var x = g.x * m * e;
      var y = (g.y + (isMob()?-10:0)) * m * e;
      var rot = lerp(it.spin0, g.rot, e);
      var sc = lerp(0.4, g.s*m, e);
      placeFly(it.el, x, y, rot, sc, e);
    });
  }

  /* ---------- main loop ---------- */
  var targetY = window.scrollY, curY = window.scrollY;
  var lastSpark = 0;
  var sparkInterval = 16;

  function readScroll(){
    targetY = window.scrollY;
    // no lag for reduced; tight follow otherwise so flings aren't lost
  }
  window.addEventListener("scroll", readScroll, {passive:true});

  function frame(now){
    sparkInterval = isMob() ? 33 : 16;
    // tight lerp so fast flings still land quickly
    var k = reduced ? 1 : 0.28;
    curY = curY + (targetY-curY)*k;
    if (Math.abs(targetY-curY)<0.4) curY = targetY;

    var focus = curY + innerHeight*0.45;
    var p = overallP();
    if (!lay.length || !lay[0].h) lay = layout();
    var ai = activeIndex(focus);
    var w = weightsAt(focus);
    updateVideos(w);
    applyWords(ai, focus);
    applyPanels(ai, focus);
    var st = applyBooster(p, ai, focus);
    applyBursts(ai, focus, p);
    if (lay[ai] && lay[ai].id==="premium") runCount();

    if (!lastSpark || now-lastSpark>=sparkInterval){
      sparkStep((now-(lastSpark||now))/1000, 1);
      lastSpark = now;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // first paint
  lay = layout();
  readScroll();
  // show intro immediately
  var introP = document.querySelector("#intro .panel");
  if (introP) introP.classList.add("is-on");
})();
