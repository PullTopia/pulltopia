/* PullTopia /pro/ — scroll scrub, worlds, typography */
(function(){
  "use strict";
  var reduced = document.documentElement.classList.contains("rm");
  var mobileQ = window.matchMedia("(max-width:820px)");
  function isMob(){ return mobileQ.matches; }

  var N = 100;
  var frames = new Array(N);
  var loaded = 0;
  var setId = isMob() ? "m" : "d";
  var canvas = document.getElementById("scrub");
  var ctx = canvas && canvas.getContext("2d");
  var poster = document.getElementById("poster");
  var sbar = document.getElementById("sbar");
  var hero = document.getElementById("hero");
  var hint = document.querySelector(".hint");
  var want = 0, drawn = -1;

  // Real Lunafuchs overlay, in 1280x720 source pixels (mobile crop is 540 wide, x origin 370)
  var CARD = { x:535, y:48, w:210, h:292, cropX:370 };
  var realCard = new Image();
  realCard.decoding = "async";
  realCard.src = "../assets/img/card-016.webp";
  var cardOff = document.createElement("canvas");
  var cardOffCtx = cardOff.getContext("2d");

  function frameSrc(i){ return "frames/" + setId + "/" + String(i).padStart(3,"0") + ".webp"; }
  function resetSet(){
    var next = isMob() ? "m" : "d";
    if (next===setId) return;
    setId = next;
    frames = new Array(N);
    loaded = 0;
    drawn = -1;
    if (canvas) canvas.classList.remove("is-ready");
    preloadAround(want);
  }

  function loadFrame(i){
    if (i<0||i>=N || frames[i] || frames[i]===false) return;
    frames[i] = false;
    var im = new Image();
    im.decoding = "async";
    im.onload = function(){ frames[i]=im; loaded++; if (canvas) canvas.classList.add("is-ready"); };
    im.onerror = function(){ frames[i]=null; };
    im.src = frameSrc(i);
  }

  function preloadAround(idx){
    loadFrame(idx);
    var r, d;
    for (d=1;d<=8;d++){
      if (idx+d<N) loadFrame(idx+d);
      if (idx-d>=0) loadFrame(idx-d);
    }
  }
  function preloadAllProgressive(){
    var i=0;
    function batch(){
      var n=0;
      while (i<N && n<6){ loadFrame(i++); n++; }
      if (i<N) setTimeout(batch, 40);
    }
    // first 10 immediately, rest after a tick
    for (i=0;i<10 && i<N;i++) loadFrame(i);
    setTimeout(batch, 120);
  }

  function nearestLoaded(i){
    if (frames[i] && frames[i].tagName) return frames[i];
    var d;
    for (d=1;d<N;d++){
      if (i+d<N && frames[i+d] && frames[i+d].tagName) return frames[i+d];
      if (i-d>=0 && frames[i-d] && frames[i-d].tagName) return frames[i-d];
    }
    return null;
  }

  function resizeScrub(){
    if (!canvas) return;
    var r = canvas.parentElement.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio||1, 2);
    canvas.width = Math.round(r.width*dpr);
    canvas.height = Math.round(r.height*dpr);
    canvas.style.width = r.width+"px";
    canvas.style.height = r.height+"px";
    drawn = -1;
  }

  function draw(idx){
    if (!ctx || !canvas) return;
    var im = nearestLoaded(idx);
    if (!im) return;
    var cw=canvas.width, ch=canvas.height;
    ctx.fillStyle="#000";
    ctx.fillRect(0,0,cw,ch);
    var iw=im.naturalWidth|| (isMob()?540:1280), ih=im.naturalHeight||720;
    var scale;
    if (isMob()){
      // pack lower so typography has room above; slight zoom
      scale = Math.max(cw/iw, (ch*0.72)/ih);
    } else {
      scale = Math.max(cw/iw, ch/ih);
    }
    var dw=iw*scale, dh=ih*scale;
    var dx=(cw-dw)/2, dy=(ch-dh)/2;
    if (isMob()) dy = (ch-dh)*0.62;
    ctx.drawImage(im, dx, dy, dw, dh);
    drawRealCard(dx, dy, scale, idx);
    drawn = idx;
  }

  function drawRealCard(dx, dy, scale, idx){
    if (!realCard.complete || !realCard.naturalWidth) return;
    var p = idx / Math.max(1, N-1);
    var a = 0;
    if (p>=0.88) a = Math.min(1, (p-0.88)/0.08);
    if (reduced) a = p>=0.92 ? 1 : 0;
    if (a<=0.01) return;
    var rx = isMob() ? (CARD.x - CARD.cropX) : CARD.x;
    var x = dx + rx*scale, y = dy + CARD.y*scale, w = CARD.w*scale, h = CARD.h*scale;
    var W = Math.max(1, Math.round(w)), H = Math.max(1, Math.round(h));
    if (cardOff.width!==W || cardOff.height!==H){ cardOff.width=W; cardOff.height=H; }
    var c = cardOffCtx;
    c.clearRect(0,0,W,H);
    c.save();
    c.beginPath();
    var rad = Math.max(6, W*0.045);
    if (c.roundRect) c.roundRect(0,0,W,H,rad);
    else c.rect(0,0,W,H);
    c.clip();
    c.drawImage(realCard, 0, 0, W, H);
    var g = c.createLinearGradient(0,0,0,H);
    // keep flavor text + ATK/DEF fully opaque; only soften the last few pixels into the gold tear
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(0.93, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0.55)");
    c.globalCompositeOperation = "destination-in";
    c.fillStyle = g;
    c.fillRect(0,0,W,H);
    c.restore();
    ctx.save();
    ctx.globalAlpha = a;
    ctx.drawImage(cardOff, x, y, w, h);
    ctx.restore();
  }

  function heroProgress(){
    if (!hero) return 0;
    var rect = hero.getBoundingClientRect();
    var y = -rect.top;
    var max = Math.max(1, hero.offsetHeight - (window.innerHeight - 0));
    return Math.max(0, Math.min(1, y/max));
  }

  function applyType(p){
    var sticky = hero && hero.querySelector(".hero-sticky");
    var leaving = sticky && sticky.getBoundingClientRect().bottom < window.innerHeight * 0.9;
    document.querySelectorAll(".ht").forEach(function(el){
      var a = parseFloat(el.getAttribute("data-in")||"0");
      var b = parseFloat(el.getAttribute("data-out")||"1");
      var on = p>=a && p<=b && !leaving;
      el.classList.toggle("is-on", (on || (reduced && p>0.01)) && !leaving);
      var local = 0;
      if (p>=a && p<=b){
        local = Math.min(1, (p-a)/0.14 + (a<=0.03 ? 0.9 : 0));
        local *= Math.min(1, (b-p)/0.08);
      }
      if (reduced) local = p>=a ? 1 : 0;
      if (leaving) local = 0;
      el.style.setProperty("--cut", ((1-local)*100).toFixed(1)+"%");
    });
    if (hint) hint.style.opacity = (p>0.12 || leaving) ? "0" : "1";
    if (sbar) sbar.style.width = (p*100).toFixed(2)+"%";
    if (sbar) sbar.parentElement.style.opacity = leaving ? "0" : "1";
  }

  /* worlds */
  var worlds = [].slice.call(document.querySelectorAll(".world, .viewer"));
  var wbgs = [].slice.call(document.querySelectorAll(".wbg"));
  var cards = [].slice.call(document.querySelectorAll(".card"));
  var navLinks = [].slice.call(document.querySelectorAll(".nv-links a"));

  function videoUrl(name){
    return "../neon/scenes/"+name+(isMob()?"-m":"")+".mp4";
  }
  function loadVid(bg){
    if (reduced) return;
    var v = bg.querySelector(".wbg-v");
    if (!v || v.dataset.loaded==="1") return;
    v.src = videoUrl(bg.getAttribute("data-bg"));
    v.dataset.loaded="1";
    var go=function(){ v.classList.add("is-ready"); v.play().catch(function(){}); };
    if (v.readyState>=2) go(); else v.addEventListener("canplay", go, {once:true});
  }
  function updateWorlds(){
    var focus = window.scrollY + innerHeight*0.45;
    var i, a, b, t, w={}, id, mid, tops=[];
    for (i=0;i<worlds.length;i++){
      var el=worlds[i];
      var top=el.getBoundingClientRect().top + window.scrollY;
      tops.push({el:el, id:el.id, bg:el.getAttribute("data-bg")||"", top:top, h:el.offsetHeight, mid:top+el.offsetHeight*0.45});
    }
    // weights between neighboring mids
    if (!tops.length) return;
    for (i=0;i<tops.length;i++) if (focus < tops[i].mid) break;
    if (i<=0) w[tops[0].bg]=1;
    else if (i>=tops.length) w[tops[tops.length-1].bg]=1;
    else {
      a=tops[i-1]; b=tops[i];
      t=(focus-a.mid)/Math.max(1,b.mid-a.mid);
      t=t*t*(3-2*t);
      w[a.bg]=1-t; w[b.bg]=t;
    }
    wbgs.forEach(function(bg){
      var name=bg.getAttribute("data-bg");
      var op=w[name]||0;
      bg.style.opacity=String(op);
      bg.classList.toggle("is-on", op>0.04);
      var v=bg.querySelector(".wbg-v");
      if (op>0.05){
        loadVid(bg);
        if (v && v.dataset.loaded==="1" && v.paused && !reduced) v.play().catch(function(){});
      } else if (v && !v.paused) v.pause();
    });
    // hide world layer while still deep in the hero
    var hp = heroProgress();
    document.getElementById("world").style.opacity = hp>0.96 || window.scrollY > hero.offsetHeight - innerHeight*0.15 ? "1" : "0";

    var ai=0, bd=1e9;
    for (i=0;i<tops.length;i++){
      var d=Math.abs(focus-tops[i].mid);
      if (d<bd){bd=d;ai=i;}
    }
    // contain focus
    for (i=0;i<tops.length;i++){
      if (focus < tops[i].top + tops[i].h){ ai=i; break; }
    }
    navLinks.forEach(function(a){
      a.classList.toggle("is-on", a.getAttribute("href")==="#"+tops[ai].id);
    });
    cards.forEach(function(c){
      var r=c.getBoundingClientRect();
      var vis=r.bottom>innerHeight*0.16 && r.top<innerHeight*0.92;
      c.classList.toggle("is-on", vis || reduced);
    });
    if (tops[ai] && tops[ai].id==="premium") runCount();
  }

  var counted=false;
  function runCount(){
    if (counted) return;
    counted=true;
    var nEl=document.querySelector(".fc-free");
    var bar=document.querySelector(".fbar i");
    if(nEl) nEl.textContent="50";
    if (reduced){ if(bar)bar.style.setProperty("--fw","100%"); return; }
    var t0=performance.now();
    (function tick(now){
      var t=Math.min(1,(now-t0)/700);
      var e=1-Math.pow(1-t,3);
      if(bar) bar.style.setProperty("--fw",(e*100).toFixed(1)+"%");
      if(t<1) requestAnimationFrame(tick);
    })(t0);
  }

  function tick(){
    var p = heroProgress();
    var idx = Math.round(p*(N-1));
    if (idx<0) idx=0; if (idx>N-1) idx=N-1;
    want = idx;
    preloadAround(idx);
    if (!reduced){
      if (drawn!==idx) draw(idx);
    } else {
      // static poster; at end of hero show last frame if loaded
      if (p>0.85) { loadFrame(N-1); draw(N-1); }
    }
    applyType(p);
    updateWorlds();
    requestAnimationFrame(tick);
  }

  resizeScrub();
  window.addEventListener("resize", function(){ resetSet(); resizeScrub(); draw(want); }, {passive:true});
  preloadAllProgressive();
  loadFrame(0);
  requestAnimationFrame(tick);
})();
