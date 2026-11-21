/* PullTopia /story/ — interaction director */
(function(){
  "use strict";
  var reduced = document.documentElement.classList.contains("rm");
  var $ = function(s, r){ return (r||document).querySelector(s); };
  var app = $("#app");
  if (!app || reduced) {
    window.__story = { stage:"static", xp:0, reduced:true, webgl:false };
    return;
  }

  var promptEl = $("#prompt");
  var labelEl = $("#prompt-label");
  var fillEl = promptEl && promptEl.querySelector(".fill");
  var typeEl = $("#type");
  var toastEl = $("#toast");
  var flashEl = $("#flash");
  var hintEl = $("#hint");
  var standEl = $("#stand");
  var xpEl = $("#xp");
  var ctaEl = $("#cta");
  var finaleEl = $("#finale");
  var ftEl = $("#ft");
  var fx = $("#fx");
  var fctx = fx ? fx.getContext("2d") : null;

  var CIRC = 2 * Math.PI * 52;
  if (fillEl) fillEl.style.strokeDasharray = "100";

  var state = {
    stage: "drag",
    xp: 0,
    swirl: 0,
    hold: 0,
    dragging: false,
    holding: false,
    holdT0: 0,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    sparks: [],
    webgl: false,
    locked: false
  };
  var HOLD_MS = 1000;
  var timers = [];
  var swirlHintAt = 0;

  function later(fn, ms){
    var id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }
  function clearTimers(){
    timers.forEach(clearTimeout);
    timers = [];
  }

  function setWorld(names){
    document.querySelectorAll("#worlds .w").forEach(function(w){
      var on = names.indexOf(w.getAttribute("data-w")) !== -1;
      w.classList.toggle("is-on", on);
      if (!on) w.style.opacity = "";
    });
  }
  function packBlend(p){
    var studio = $('[data-w="studio"]');
    var mid = $('[data-w="mid"]');
    var open = $('[data-w="open"]');
    if (!studio) return;
    // true crossfade: bottom stays opaque, top layer rises (avoids dark dip)
    if (p <= 0){ studio.style.opacity = 1; mid.style.opacity = 0; open.style.opacity = 0; return; }
    if (p < 0.48){
      var t = p / 0.48;
      studio.style.opacity = "1";
      mid.style.opacity = String(t);
      open.style.opacity = "0";
    } else {
      var t2 = (p-0.48)/0.52;
      studio.style.opacity = "0";
      mid.style.opacity = "1";
      open.style.opacity = String(t2);
    }
  }

  function setStage(name){
    state.stage = name;
    document.body.dataset.stage = name;
    window.__story.stage = name;
  }

  function setPrompt(on, text, fill){
    if (!promptEl) return;
    if (text) labelEl.textContent = text;
    promptEl.classList.toggle("is-on", !!on);
    promptEl.hidden = !on;
    setFill(fill || 0);
  }
  function setFill(p){
    if (fillEl) fillEl.style.strokeDashoffset = String(100 - Math.max(0, Math.min(1, p))*100);
  }

  function showType(html, on){
    if (!typeEl) return;
    if (html !== undefined && html !== null) typeEl.innerHTML = html;
    typeEl.classList.toggle("is-on", on !== false && !!typeEl.innerHTML);
  }
  function setHint(text, on){
    if (!hintEl) return;
    if (text) hintEl.textContent = text;
    hintEl.hidden = !on;
    hintEl.classList.toggle("is-on", !!on);
  }
  function setStand(on){
    if (!standEl) return;
    standEl.hidden = !on;
    standEl.classList.toggle("is-on", !!on);
  }

  function addXP(n){
    state.xp += n;
    window.__story.xp = state.xp;
    xpEl.hidden = false;
    xpEl.textContent = state.xp + " XP";
    toastEl.hidden = false;
    toastEl.querySelector("span").textContent = "+" + n + " XP";
    toastEl.classList.remove("is-on");
    void toastEl.offsetWidth;
    toastEl.classList.add("is-on");
    later(function(){ toastEl.classList.remove("is-on"); }, 1400);
  }

  function flash(kind, ms){
    flashEl.classList.toggle("gold", kind === "gold");
    flashEl.style.transition = "none";
    flashEl.style.opacity = "1";
    void flashEl.offsetWidth;
    flashEl.style.transition = "opacity " + (ms||280) + "ms ease-out";
    flashEl.style.opacity = "0";
  }

  function showCta(){
    ctaEl.hidden = false;
    requestAnimationFrame(function(){ ctaEl.classList.add("is-on"); });
  }

  function resizeFx(){
    if (!fx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = app.clientWidth, h = app.clientHeight;
    fx.width = Math.max(1, Math.round(w*dpr));
    fx.height = Math.max(1, Math.round(h*dpr));
    fx.style.width = w+"px";
    fx.style.height = h+"px";
    if (fctx) fctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function spawnSpark(x,y){
    state.sparks.push({ x:x, y:y, vx:(Math.random()-.5)*1.6, vy:(Math.random()-.8)*2.2, a:1, r:1+Math.random()*2.2 });
    if (state.sparks.length > 80) state.sparks.shift();
  }
  function tickFx(){
    if (!fctx || !fx) return;
    var w = app.clientWidth, h = app.clientHeight;
    fctx.clearRect(0,0,w,h);
    for (var i=state.sparks.length-1;i>=0;i--){
      var s = state.sparks[i];
      s.x += s.vx; s.y += s.vy; s.vy += 0.03; s.a -= 0.02;
      if (s.a <= 0){ state.sparks.splice(i,1); continue; }
      fctx.globalAlpha = s.a;
      fctx.fillStyle = "#ffdc8a";
      fctx.beginPath();
      fctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      fctx.fill();
    }
    fctx.globalAlpha = 1;
    requestAnimationFrame(tickFx);
  }

  /* ---------- DRAG ---------- */
  var dragDist = 0;
  function threshold(){ return Math.max(110, Math.min(app.clientWidth, app.clientHeight)*0.22); }

  function onPointerDown(e){
    if (e.target.closest && (e.target.closest("a") || e.target.closest("button") || e.target.closest(".tb") || e.target.closest(".ft"))) return;
    if (state.locked) return;
    if (e.button !== undefined && e.button !== 0) return;
    if (state.stage === "drag"){
      state.dragging = true;
      state.startX = e.clientX; state.startY = e.clientY;
      state.lastX = e.clientX; state.lastY = e.clientY;
      dragDist = 0;
      try { app.setPointerCapture(e.pointerId); } catch(_){}
      e.preventDefault();
    } else if (state.stage === "hold"){
      beginHold(e);
      try { app.setPointerCapture(e.pointerId); } catch(_){}
      e.preventDefault();
    } else if (state.stage === "swirl"){
      state.dragging = true;
      state.startX = e.clientX; state.startY = e.clientY;
      state.lastX = e.clientX; state.lastY = e.clientY;
      try { app.setPointerCapture(e.pointerId); } catch(_){}
      e.preventDefault();
    } else if (state.stage === "shards" && window.Story3D && window.Story3D.nudge){
      state.dragging = true;
      state.lastX = e.clientX; state.lastY = e.clientY;
      try { app.setPointerCapture(e.pointerId); } catch(_){}
    }
  }
  function onPointerMove(e){
    if (state.stage === "drag" && state.dragging){
      var dx = e.clientX - state.startX, dy = e.clientY - state.startY;
      dragDist = Math.sqrt(dx*dx + dy*dy);
      var p = Math.min(1, dragDist / threshold());
      packBlend(p);
      setFill(p);
      spawnSpark(e.clientX, e.clientY - 24);
      if (Math.abs(e.clientX-state.lastX)+Math.abs(e.clientY-state.lastY) > 10){
        spawnSpark((e.clientX+state.lastX)/2, (e.clientY+state.lastY)/2 - 24);
      }
      state.lastX = e.clientX; state.lastY = e.clientY;
      if (p >= 1) finishDrag();
      e.preventDefault();
    } else if (state.stage === "swirl" && state.dragging){
      var dy2 = e.clientY - state.lastY;
      advanceSwirl(-dy2 * 0.0035);
      state.lastX = e.clientX; state.lastY = e.clientY;
      e.preventDefault();
    } else if (state.stage === "hold" && state.holding){
      var md = Math.hypot(e.clientX-state.startX, e.clientY-state.startY);
      if (md > 40){ cancelHold(); }
      e.preventDefault();
    } else if (state.stage === "shards" && state.dragging && window.Story3D && window.Story3D.nudge){
      window.Story3D.nudge(e.clientX-state.lastX, e.clientY-state.lastY);
      state.lastX = e.clientX; state.lastY = e.clientY;
    }
  }
  function onPointerUp(){
    state.dragging = false;
    if (state.stage === "hold" && state.holding) cancelHold();
    if (state.stage === "drag" && dragDist < threshold()){
      packBlend(0);
      setFill(0);
    }
  }

  function finishDrag(){
    if (state.stage !== "drag" || state.locked) return;
    state.locked = true;
    state.dragging = false;
    packBlend(1);
    setPrompt(false);
    flash("gold", 420);
    addXP(10);
    later(function(){
      document.querySelectorAll("#worlds .w").forEach(function(w){ w.style.opacity=""; });
      setWorld(["swirl"]);
      showType('<p class="big">Dein TCG-<br>Universum.</p>', true);
      setHint("Scrollen", true);
      showCta();
      setStage("swirl");
      swirlHintAt = Date.now();
      if (window.Story3D && window.Story3D.startSwirl) window.Story3D.startSwirl();
      state.locked = false;
    }, 380);
  }

  function advanceSwirl(dp){
    if (state.stage !== "swirl" || state.locked) return;
    state.swirl = Math.max(0, Math.min(1, state.swirl + dp));
    window.__story.swirl = state.swirl;
    if (window.Story3D && window.Story3D.setSwirlProgress) window.Story3D.setSwirlProgress(state.swirl);
    if (state.swirl > 0.08) setHint("", false);
    if (state.swirl > 0.35) showType('<p class="big">Dein TCG-<br>Universum.</p>', true);
    var sw = $('[data-w="swirl"]');
    var ho = $('[data-w="hold"]');
    if (sw && ho){
      sw.style.opacity = String(1 - state.swirl*0.35);
      ho.classList.add("is-on");
      ho.style.opacity = String(state.swirl*0.45);
    }
    if (state.swirl >= 0.98) enterHold();
  }

  function onWheel(e){
    if (state.stage === "swirl"){
      e.preventDefault();
      advanceSwirl(e.deltaY * 0.00042);
    } else if (state.stage === "shards" && e.deltaY > 20){
      e.preventDefault();
      maybeAdvanceFromShards();
    }
  }

  function enterHold(){
    if (state.stage !== "swirl") return;
    state.locked = true;
    setWorld(["swirl","hold"]);
    later(function(){ setWorld(["hold"]); }, 500);
    showType("", false);
    setHint("", false);
    setPrompt(true, "Gedrückt halten", 0);
    if (window.Story3D && window.Story3D.hideSwirl) window.Story3D.hideSwirl();
    setStage("hold");
    state.locked = false;
  }

  var holdRaf = 0;
  function beginHold(e){
    if (state.stage !== "hold" || state.locked) return;
    state.holding = true;
    state.holdT0 = performance.now();
    state.startX = e.clientX; state.startY = e.clientY;
    document.body.classList.add("charging");
    chargeLoop();
  }
  function chargeLoop(){
    if (!state.holding) return;
    var t = (performance.now() - state.holdT0) / HOLD_MS;
    state.hold = Math.min(1, t);
    setFill(state.hold);
    var ch = Math.pow(state.hold, 1.2);
    flashEl.classList.remove("gold");
    flashEl.style.transition = "none";
    flashEl.style.opacity = String(ch * 0.55);
    if (state.hold >= 1){ finishHold(); return; }
    holdRaf = requestAnimationFrame(chargeLoop);
  }
  function cancelHold(){
    state.holding = false;
    state.hold = 0;
    setFill(0);
    flashEl.style.transition = "opacity .3s";
    flashEl.style.opacity = "0";
  }
  function finishHold(){
    if (state.stage !== "hold" || state.locked) return;
    state.holding = false;
    state.locked = true;
    setFill(1);
    flashEl.style.transition = "none";
    flashEl.style.opacity = "1";
    void flashEl.offsetWidth;
    flashEl.style.transition = "opacity 500ms ease-out";
    flashEl.style.opacity = "0";
    setPrompt(false);
    addXP(10);
    showType('<p class="big gold">Drop verpasst?<br>Nie wieder.</p>', true);
    later(function(){
      showType("", false);
      setStage("shards");
      setStand(true);
      if (window.Story3D && window.Story3D.startShards) window.Story3D.startShards();
      state.locked = false;
      later(maybeAdvanceFromShards, 4800);
    }, 1600);
  }

  var shardsAdvancing = false;
  function maybeAdvanceFromShards(){
    if (state.stage !== "shards" || shardsAdvancing) return;
    shardsAdvancing = true;
    setStand(false);
    showType("", false);
    setWorld(["hold","ember"]);
    later(function(){ setWorld(["ember"]); }, 600);
    setStage("burn");
    if (window.Story3D && window.Story3D.startBurn) window.Story3D.startBurn();
    later(enterFinale, 3200);
  }

  function enterFinale(){
    if (state.stage !== "burn") return;
    setStage("finale");
    finaleEl.hidden = false;
    requestAnimationFrame(function(){ finaleEl.classList.add("is-on"); });
    ftEl.classList.add("is-on");
    if (window.Story3D && window.Story3D.dim) window.Story3D.dim();
  }

  function reset(){
    clearTimers();
    shardsAdvancing = false;
    state.stage = "drag";
    state.xp = 0;
    state.swirl = 0;
    state.hold = 0;
    state.dragging = false;
    state.holding = false;
    state.locked = false;
    state.sparks = [];
    window.__story.xp = 0;
    window.__story.swirl = 0;
    xpEl.hidden = true;
    xpEl.textContent = "0 XP";
    toastEl.classList.remove("is-on");
    ctaEl.classList.remove("is-on"); ctaEl.hidden = true;
    finaleEl.classList.remove("is-on"); finaleEl.hidden = true;
    ftEl.classList.remove("is-on");
    showType("", false);
    setStand(false);
    setHint("", false);
    setFill(0);
    packBlend(0);
    setWorld(["studio"]);
    document.querySelectorAll("#worlds .w").forEach(function(w){ w.style.opacity = ""; });
    flashEl.style.opacity = "0";
    setPrompt(true, "Ziehen", 0);
    setStage("drag");
    if (window.Story3D && window.Story3D.reset) window.Story3D.reset();
  }

  /* events */
  app.addEventListener("pointerdown", onPointerDown, {passive:false});
  window.addEventListener("pointermove", onPointerMove, {passive:false});
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  app.addEventListener("wheel", onWheel, {passive:false});
  app.addEventListener("contextmenu", function(e){ e.preventDefault(); });
  app.addEventListener("selectstart", function(e){ e.preventDefault(); });
  window.addEventListener("resize", function(){
    resizeFx();
    if (window.Story3D && window.Story3D.resize) window.Story3D.resize();
  });
  document.querySelectorAll("[data-restart]").forEach(function(b){
    b.addEventListener("click", function(e){ e.preventDefault(); reset(); });
  });

  // keyboard: space/enter hold or skip drag for a11y (not reduced-motion path)
  window.addEventListener("keydown", function(e){
    if (e.repeat) return;
    if (e.code === "Space" || e.code === "Enter"){
      if (state.stage === "drag"){ e.preventDefault(); finishDrag(); }
      else if (state.stage === "hold"){
        e.preventDefault();
        beginHold({ clientX: app.clientWidth/2, clientY: app.clientHeight/2 });
      }
    }
  });
  window.addEventListener("keyup", function(e){
    if ((e.code === "Space" || e.code === "Enter") && state.stage === "hold") cancelHold();
  });

  function boot(){
    resizeFx();
    tickFx();
    packBlend(0);
    setWorld(["studio"]);
    setPrompt(true, "Ziehen", 0);
    later(function(){
      if (!window.Story3D || !window.Story3D.ok){
        document.documentElement.classList.add("no-webgl");
        state.webgl = false;
      } else {
        state.webgl = true;
      }
      window.__story.webgl = state.webgl;
    }, 1800);
  }

  window.addEventListener("story:ready", function(ev){
    state.webgl = !!(ev.detail && ev.detail.ok);
    window.__story.webgl = state.webgl;
    if (!state.webgl) document.documentElement.classList.add("no-webgl");
  });

  window.__story = {
    stage: "drag",
    xp: 0,
    swirl: 0,
    webgl: false,
    reduced: false,
    reset: reset,
    finishDrag: finishDrag,
    advanceSwirl: advanceSwirl,
    enterHold: enterHold,
    finishHold: finishHold,
    maybeAdvanceFromShards: maybeAdvanceFromShards
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
