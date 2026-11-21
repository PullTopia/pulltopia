/* PullTopia /story/ — interaction director */
(function(){
  "use strict";
  var reduced = document.documentElement.classList.contains("rm");
  var $ = function(s, r){ return (r||document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
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
  var premEl = $("#premium");
  var labelsEl = $("#shard-labels");
  var ftEl = $("#ft");
  var fx = $("#fx");
  var fctx = fx ? fx.getContext("2d") : null;
  var tearEl = $("#pack-tear");
  var tearTop = $(".pt-top");
  var tearBot = $(".pt-bot");
  var tearLight = $(".pt-light");
  var tearGlow = $(".pt-glow");

  if (fillEl) fillEl.style.strokeDasharray = "100";

  var state = {
    stage: "drag",
    xp: 0,
    swirl: 0,
    hold: 0,
    burn: 0,
    dragging: false,
    holding: false,
    holdT0: 0,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    sparks: [],
    webgl: false,
    locked: false,
    jagged: null
  };
  var HOLD_MS = 1000;
  var BURN_MS = 4000;
  var timers = [];
  var labelRaf = 0;

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
    $$("#worlds .w").forEach(function(w){
      var on = names.indexOf(w.getAttribute("data-w")) !== -1;
      w.classList.toggle("is-on", on);
      if (!on) w.style.opacity = "";
    });
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
    if (state.sparks.length > 90) state.sparks.shift();
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

  /* ---------- PACK TEAR ---------- */
  function tearY0(){ return innerWidth < 821 ? 46 : 44; }
  function makeJagged(){
    var n = 16, y0 = tearY0(), amp = 3.2, seed = Math.random()*6+1;
    var pts = [];
    for (var i=0;i<=n;i++){
      var x = (i/n)*100;
      var j = Math.sin(seed*7+i*2.35)*0.55 + Math.sin(i*5.7+seed*1.3)*0.45;
      pts.push({ x:x, y:y0 + j*amp });
    }
    return pts;
  }
  function polyTop(pts, lift){
    var s = "0% -5%, 100% -5%";
    for (var i=pts.length-1;i>=0;i--) s += ", "+pts[i].x.toFixed(2)+"% "+(pts[i].y-lift).toFixed(2)+"%";
    return "polygon("+s+")";
  }
  function polyBot(pts, drop){
    var s = [];
    for (var i=0;i<pts.length;i++) s.push(pts[i].x.toFixed(2)+"% "+(pts[i].y+drop).toFixed(2)+"%");
    s.push("100% 105%", "0% 105%");
    return "polygon("+s.join(", ")+")";
  }
  function resetTear(){
    state.jagged = makeJagged();
    if (tearTop){ tearTop.style.transform = ""; }
    if (tearBot){ tearBot.style.transform = ""; }
    if (tearLight){ tearLight.style.height = "0px"; tearLight.style.opacity = "0"; }
    if (tearGlow) tearGlow.style.opacity = "0";
    if (tearEl) tearEl.style.setProperty("--tear-y", tearY0()+"%");
    applyTear(0, 0, 0);
  }
  function applyTear(p, dx, dy){
    if (!tearTop || !tearBot) return;
    if (!state.jagged) state.jagged = makeJagged();
    var gap = p * 4.8;
    tearTop.style.clipPath = polyTop(state.jagged, gap);
    tearBot.style.clipPath = polyBot(state.jagged, gap*0.35);
    var lift = p * Math.min(app.clientHeight, 900) * 0.22;
    var rot = Math.max(-14, Math.min(14, (dx||0)*0.04));
    var slideX = Math.max(-80, Math.min(80, (dx||0)*0.35));
    tearTop.style.transform = "translate(" + slideX + "px," + (-lift) + "px) rotate(" + rot + "deg)";
    tearBot.style.transform = "translate(0," + (p*12) + "px)";
    var midY = 0;
    state.jagged.forEach(function(pt){ midY += pt.y; });
    midY /= state.jagged.length;
    if (tearEl) tearEl.style.setProperty("--tear-y", midY.toFixed(2)+"%");
    if (tearLight){
      tearLight.style.height = (8 + p*28) + "px";
      tearLight.style.opacity = String(Math.min(1, p*1.4));
    }
    if (tearGlow) tearGlow.style.opacity = String(Math.min(1, p*1.1));
    // sparks along the tear
    if (p > 0.08 && fctx){
      var y = (midY/100)*app.clientHeight;
      spawnSpark(app.clientWidth*0.5 + (Math.random()-0.5)*app.clientWidth*0.5, y + (Math.random()-0.5)*8);
    }
  }

  /* ---------- DRAG ---------- */
  var dragDist = 0;
  function threshold(){ return Math.max(110, Math.min(app.clientWidth, app.clientHeight)*0.22); }

  function onPointerDown(e){
    if (e.target.closest && (e.target.closest("a") || e.target.closest("button") || e.target.closest(".tb") || e.target.closest(".ft") || e.target.closest(".prem"))) return;
    if (state.locked) return;
    if (e.button !== undefined && e.button !== 0) return;
    if (state.stage === "drag"){
      state.dragging = true;
      state.startX = e.clientX; state.startY = e.clientY;
      state.lastX = e.clientX; state.lastY = e.clientY;
      dragDist = 0;
      if (!state.jagged) state.jagged = makeJagged();
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
    } else if (state.stage === "premium"){
      enterFinale();
    }
  }
  function onPointerMove(e){
    if (state.stage === "drag" && state.dragging){
      var dx = e.clientX - state.startX, dy = e.clientY - state.startY;
      dragDist = Math.sqrt(dx*dx + dy*dy);
      var p = Math.min(1, dragDist / threshold());
      applyTear(p, dx, dy);
      setFill(p);
      spawnSpark(e.clientX, e.clientY - 24);
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
      applyTear(0, 0, 0);
      setFill(0);
      resetTear();
    }
  }

  function finishDrag(){
    if (state.stage !== "drag" || state.locked) return;
    state.locked = true;
    state.dragging = false;
    applyTear(1, 0, -40);
    setPrompt(false);
    flash("gold", 480);
    addXP(10);
    later(function(){
      if (tearEl) tearEl.style.opacity = "0";
      $$("#worlds .w").forEach(function(w){ w.style.opacity=""; });
      setWorld(["swirl"]);
      showType('<p class="big">Dein TCG-<br>Universum.</p>', true);
      setHint("Scrollen", true);
      showCta();
      setStage("swirl");
      if (window.Story3D && window.Story3D.startSwirl) window.Story3D.startSwirl();
      state.locked = false;
    }, 280);
  }

  function advanceSwirl(dp){
    if (state.stage !== "swirl" || state.locked) return;
    state.swirl = Math.max(0, Math.min(1, state.swirl + dp));
    window.__story.swirl = state.swirl;
    if (window.Story3D && window.Story3D.setSwirlProgress) window.Story3D.setSwirlProgress(state.swirl);
    if (state.swirl > 0.08) setHint("", false);
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
    } else if (state.stage === "burn"){
      e.preventDefault();
      bumpBurn(e.deltaY * 0.0009);
    } else if (state.stage === "premium" && e.deltaY > 20){
      e.preventDefault();
      enterFinale();
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
    if (window.Story3D && window.Story3D.lingerSwirl) window.Story3D.lingerSwirl(0.38);
    setStage("hold");
    state.locked = false;
  }

  var holdRaf = 0;
  function beginHold(e){
    if (state.stage !== "hold" || state.locked) return;
    state.holding = true;
    state.holdT0 = performance.now();
    state.startX = e.clientX; state.startY = e.clientY;
    chargeLoop();
  }
  function chargeLoop(){
    if (!state.holding) return;
    var t = (performance.now() - state.holdT0) / HOLD_MS;
    state.hold = Math.min(1, t);
    setFill(state.hold);
    flashEl.classList.remove("gold");
    flashEl.style.transition = "none";
    flashEl.style.opacity = String(Math.pow(state.hold, 1.2) * 0.55);
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
    if (window.Story3D && window.Story3D.lingerSwirl) window.Story3D.lingerSwirl(0.28);
    later(function(){
      showType("", false);
      setStage("shards");
      setStand(true);
      if (labelsEl){ labelsEl.hidden = false; requestAnimationFrame(function(){ labelsEl.classList.add("is-on"); }); }
      if (window.Story3D && window.Story3D.startShards) window.Story3D.startShards();
      startLabelTrack();
      state.locked = false;
      later(maybeAdvanceFromShards, 5200);
    }, 1600);
  }

  function startLabelTrack(){
    cancelAnimationFrame(labelRaf);
    var sl = $$("#shard-labels .sl");
    if (!sl.length) return;
    var mob = innerWidth < 821;
    if (mob) return; // CSS column layout — all on screen
    function tick(){
      if (state.stage !== "shards") return;
      if (window.Story3D && window.Story3D.getShardScreens){
        var pts = window.Story3D.getShardScreens();
        var w = app.clientWidth, h = app.clientHeight;
        sl.forEach(function(el, i){
          var p = pts && pts[i];
          if (!p) return;
          var x = Math.max(w*0.16, Math.min(w*0.84, p.x));
          var y = Math.max(90, Math.min(h-150, p.y));
          el.style.left = x+"px";
          el.style.top = y+"px";
        });
      }
      labelRaf = requestAnimationFrame(tick);
    }
    tick();
  }

  var shardsAdvancing = false;
  function maybeAdvanceFromShards(){
    if (state.stage !== "shards" || shardsAdvancing) return;
    shardsAdvancing = true;
    setStand(false);
    if (labelsEl){ labelsEl.classList.remove("is-on"); later(function(){ labelsEl.hidden = true; }, 400); }
    showType("", false);
    setWorld(["hold","ember"]);
    later(function(){ setWorld(["ember"]); }, 600);
    setStage("burn");
    state.burn = 0;
    if (window.Story3D && window.Story3D.startBurn) window.Story3D.startBurn();
    later(function(){ if (state.stage === "burn") enterPremium(); }, BURN_MS + 800);
  }

  function bumpBurn(dp){
    if (state.stage !== "burn") return;
    state.burn = Math.max(0, Math.min(1, state.burn + dp));
    window.__story.burn = state.burn;
    if (window.Story3D && window.Story3D.setBurnProgress) window.Story3D.setBurnProgress(state.burn);
    if (state.burn >= 0.98) enterPremium();
  }

  function enterPremium(){
    if (state.stage !== "burn") return;
    setStage("premium");
    if (window.Story3D && window.Story3D.dim) window.Story3D.dim();
    if (premEl){
      premEl.hidden = false;
      requestAnimationFrame(function(){ premEl.classList.add("is-on"); });
    }
    later(function(){ if (state.stage === "premium") enterFinale(); }, 4500);
  }

  function enterFinale(){
    if (state.stage !== "premium" && state.stage !== "burn") return;
    if (premEl){ premEl.classList.remove("is-on"); later(function(){ premEl.hidden = true; }, 400); }
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
    state.burn = 0;
    state.dragging = false;
    state.holding = false;
    state.locked = false;
    state.sparks = [];
    window.__story.xp = 0;
    window.__story.swirl = 0;
    window.__story.burn = 0;
    xpEl.hidden = true;
    xpEl.textContent = "0 XP";
    toastEl.classList.remove("is-on");
    ctaEl.classList.remove("is-on"); ctaEl.hidden = true;
    finaleEl.classList.remove("is-on"); finaleEl.hidden = true;
    if (premEl){ premEl.classList.remove("is-on"); premEl.hidden = true; }
    if (labelsEl){ labelsEl.classList.remove("is-on"); labelsEl.hidden = true; }
    ftEl.classList.remove("is-on");
    showType("", false);
    setStand(false);
    setHint("", false);
    setFill(0);
    resetTear();
    if (tearEl) tearEl.style.opacity = "";
    $$("#worlds .w").forEach(function(w){ w.style.opacity = ""; });
    setWorld(["studio"]);
    flashEl.style.opacity = "0";
    setPrompt(true, "Ziehen", 0);
    setStage("drag");
    if (window.Story3D && window.Story3D.reset) window.Story3D.reset();
  }

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
  $$("[data-restart]").forEach(function(b){
    b.addEventListener("click", function(e){ e.preventDefault(); reset(); });
  });
  window.addEventListener("keydown", function(e){
    if (e.repeat) return;
    if (e.code === "Space" || e.code === "Enter"){
      if (state.stage === "drag"){ e.preventDefault(); finishDrag(); }
      else if (state.stage === "hold"){
        e.preventDefault();
        beginHold({ clientX: app.clientWidth/2, clientY: app.clientHeight/2 });
      } else if (state.stage === "premium"){ e.preventDefault(); enterFinale(); }
    }
  });
  window.addEventListener("keyup", function(e){
    if ((e.code === "Space" || e.code === "Enter") && state.stage === "hold") cancelHold();
  });

  function boot(){
    resizeFx();
    tickFx();
    resetTear();
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
    burn: 0,
    webgl: false,
    reduced: false,
    reset: reset,
    finishDrag: finishDrag,
    advanceSwirl: advanceSwirl,
    enterHold: enterHold,
    finishHold: finishHold,
    maybeAdvanceFromShards: maybeAdvanceFromShards,
    enterPremium: enterPremium,
    enterFinale: enterFinale
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
