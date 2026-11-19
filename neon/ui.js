/* PullTopia Neon-Vorschau: UI-Schicht (Ladebildschirm, Live-Daten, HUD, Einblendungen). Läuft auch ohne WebGL. */
(function(){
  "use strict";
  var d=document,root=d.documentElement;
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fmt=new Intl.NumberFormat("de-DE"),fmt1=new Intl.NumberFormat("de-DE",{maximumFractionDigits:1});
  function $(s){return d.querySelector(s)}
  function $$(s){return [].slice.call(d.querySelectorAll(s))}

  /* Ladebildschirm */
  var bar=$("#ldbar"),pct=$("#ldpct"),msg=$("#ldmsg"),shown=0,target=0,t0=performance.now(),finished=false,doneCb=[];
  var last=performance.now();
  function tick(now){
    var dt=Math.min(.25,((now||performance.now())-last)/1000);last=now||performance.now();
    shown+=(target-shown)*(1-Math.exp(-dt*(finished?14:7))); if(target-shown<.6)shown=target;
    bar.style.width=shown.toFixed(1)+"%"; pct.textContent=Math.round(shown)+"%";
    if(finished&&shown>=99.5){ root.classList.add("ld-done"); setTimeout(function(){root.classList.add("ready");doneCb.forEach(function(f){f()})},250); return; }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  window.PT={
    progress:function(p,m){target=Math.max(target,Math.min(100,p));if(m)msg.textContent=m},
    done:function(){ if(finished)return; var wait=Math.max(0,(reduce?300:1500)-(performance.now()-t0)); setTimeout(function(){finished=true;target=100;msg.textContent="Nexus bereit"},wait); },
    onReady:function(f){doneCb.push(f)}
  };
  PT.progress(8,"Initialisiere Kartenkern");
  // Sicherheitsnetz: falls 3D nicht meldet (kein WebGL / Modul-Fehler)
  setTimeout(function(){ if(!finished){ if(!window.PT_GL)root.classList.add("no-gl"); PT.done(); } },6500);

  /* Film-Grain (einmal erzeugt, als Hintergrundbild) */
  try{
    var c=d.createElement("canvas");c.width=c.height=180;var x=c.getContext("2d"),im=x.createImageData(180,180);
    for(var i=0;i<im.data.length;i+=4){var v=Math.random()*255|0;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255}
    x.putImageData(im,0,0);$(".grain").style.backgroundImage="url("+c.toDataURL()+")";
  }catch(e){}

  /* Abschnitte: Einblenden + HUD */
  var secs=$$("[data-sec]"),hno=$("#hudno"),hname=$("#hudname"),hpct=$("#hudpct");
  var tot=d.querySelector(".hud-sec span"); if(tot)tot.textContent="/ "+String(secs.length).padStart(2,"0");
  function pad(n){return String(n).padStart(2,"0")}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");decode(e.target);io.unobserve(e.target)}})},{threshold:.18});
  secs.forEach(function(s){io.observe(s)});
  if(reduce)secs.forEach(function(s){s.classList.add("in")});
  var cur=-1;
  function onScroll(){
    var mid=innerHeight*.5,idx=0;
    for(var i=0;i<secs.length;i++){var r=secs[i].getBoundingClientRect();if(r.top<=mid)idx=i}
    if(idx!==cur){cur=idx;hno.textContent=pad(idx+1);hname.textContent=secs[idx].dataset.sec}
    var max=d.documentElement.scrollHeight-innerHeight;
    hpct.textContent=String(Math.round(max>0?scrollY/max*100:0)).padStart(3,"0");
  }
  addEventListener("scroll",onScroll,{passive:true});addEventListener("resize",onScroll);onScroll();

  /* Decode-Effekt für die kleinen Überzeilen */
  var GL="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/·";
  function decode(sec){
    if(reduce)return;
    sec.querySelectorAll("[data-dec]").forEach(function(el){
      if(el.dataset.done)return;el.dataset.done=1;
      var fin=el.textContent,n=fin.length,start=performance.now(),dur=700;
      el.setAttribute("aria-label",fin);
      (function step(t){var p=Math.min(1,(t-start)/dur),k=Math.floor(p*n),s="";
        for(var i=0;i<n;i++){var ch=fin[i];s+=(i<k||ch===" ")?ch:GL[Math.random()*GL.length|0]}
        el.textContent=s;if(p<1)requestAnimationFrame(step);else el.textContent=fin;})(start);
    });
  }
  PT.onReady(function(){decode($("#top"))});

  /* Gründerbalken */
  var fc=$(".founder");
  if(fc){var fr=+fc.dataset.fcFree,tt=+fc.dataset.fcTotal;if(tt>0)fc.querySelector(".fbar i").style.setProperty("--w",(fr/tt*100)+"%")}

  /* Live-Statistik: wie Startseite (Live-Branch → ./stats.json der Live-Seite → localStorage → Werte im HTML) */
  var URLS=["https://raw.githubusercontent.com/PullTopia/pulltopia/live-stats/stats.json",new URL("../stats.json",location.href).href];
  var LS="pt-site-stats-v1",ORDER=["DE","AT","CH","NL","BE"];
  function valid(s){if(!s||s.version!==1||!s.metrics)return null;var m=s.metrics;var need=["dropsDetected","restocksDetected","backdropsDetected","shopsLive","signalsLive","freeDelayMin"];for(var i=0;i<need.length;i++)if(!isFinite(m[need[i]]))return null;return s}
  function keys(by){if(!by)return[];var a=ORDER.filter(function(c){return by[c]>0});Object.keys(by).filter(function(c){return ORDER.indexOf(c)<0&&by[c]>0}).sort().forEach(function(c){a.push(c)});return a}
  function set(k,v){$$('[data-s="'+k+'"]').forEach(function(el){el.textContent=v})}
  var lastBy={DE:118,AT:11,CH:8,NL:8,BE:7,FR:1};
  function ago(iso){var ts=Date.parse(iso);if(!isFinite(ts))return"";var m=Math.max(0,Math.round((Date.now()-ts)/6e4));if(m<1)return"gerade eben";if(m<60)return"vor "+m+" Min";var h=Math.round(m/60);if(h<24)return"vor "+h+" Std.";var dd=Math.round(h/24);return"vor "+dd+" Tag"+(dd===1?"":"en")}
  function apply(s,live){
    var m=s.metrics;
    set("drops",fmt.format(m.dropsDetected));set("restocks",fmt.format(m.restocksDetected));set("backdrops",fmt.format(m.backdropsDetected));
    set("shops",fmt.format(m.shopsLive));set("signals",fmt.format(m.signalsLive));
    set("shops-t",fmt.format(m.shopsLive)+" Shops");set("signals-t",fmt.format(m.signalsLive)+" Signalquellen");
    set("freedelay",fmt.format(m.freeDelayMin));
    if(isFinite(m.premiumMedianSec)){set("premmed",fmt1.format(m.premiumMedianSec));if(isFinite(m.premiumMedianN))set("premnote","n = "+fmt.format(m.premiumMedianN)+" · interne Verarbeitungszeit, nicht ab Shop-Veröffentlichung")}
    if(isFinite(m.freeMedianMin)){set("freemed",fmt1.format(m.freeMedianMin));set("freenote",m.freeEarly===0?"keiner vor Ablauf der "+m.freeDelayMin+" Minuten":fmt.format(m.freeEarly)+" vor Ablauf der "+m.freeDelayMin+" Minuten")}
    var k=keys(m.shopsByCountry);
    if(k.length){lastBy=m.shopsByCountry;set("legend",k.map(function(c){return fmt.format(m.shopsByCountry[c])+" "+c}).join(" · "));
      set("countries",k.length===1?k[0]:k.slice(0,-1).join(", ")+" und "+k[k.length-1])}
    if(s.countingSinceLabel)set("since",s.countingSinceLabel);
    var fresh=isFinite(Date.parse(s.generatedAt))&&(Date.now()-Date.parse(s.generatedAt)<2*36e5);
    $$("[data-live]").forEach(function(el){el.hidden=!(live&&fresh)});
    if(live&&fresh)set("ago",ago(s.generatedAt));
    drawDial();
  }
  function fetchOne(u){var ac=new AbortController(),t=setTimeout(function(){ac.abort()},2500);
    return fetch(u,{cache:"no-store",signal:ac.signal,headers:{Accept:"application/json"}}).then(function(r){if(!r.ok)throw 0;return r.json()}).finally(function(){clearTimeout(t)})}
  (function load(i){
    if(i>=URLS.length){try{var s=valid(JSON.parse(localStorage.getItem(LS)||""));if(s)apply(s,false)}catch(e){}return}
    fetchOne(URLS[i]).then(function(j){var s=valid(j);if(!s)throw 0;apply(s,true);try{localStorage.setItem(LS,JSON.stringify(s))}catch(e){}}).catch(function(){load(i+1)});
  })(0);

  /* Kreis-Dial: Shops nach Land (echte Anteile) */
  var COLORS=["#41f2ff","#9b5cff","#ff7ad9","#ffcf6b","#7dffb0","#c9a6ff","#ffffff"];
  var dialShown=false;
  function drawDial(){
    var g=$('[data-dial="countries"] .d-seg');if(!g)return;
    var k=keys(lastBy),sum=k.reduce(function(a,c){return a+lastBy[c]},0);if(!sum)return;
    var C=2*Math.PI*50,off=0,html="";
    k.forEach(function(c,i){var len=lastBy[c]/sum*C,gap=k.length>1?1.6:0;
      var L=Math.max(.5,len-gap).toFixed(2);
      html+='<circle cx="60" cy="60" r="50" stroke="'+COLORS[i%COLORS.length]+'" stroke-dasharray="'+((dialShown||reduce)?L:0)+' '+C.toFixed(2)+'" stroke-dashoffset="'+(-off).toFixed(2)+'" data-l="'+L+' '+C.toFixed(2)+'"><title>'+c+": "+lastBy[c]+'</title></circle>';off+=len});
    g.innerHTML=html;
  }
  drawDial();
  var dio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){dialShown=true;setTimeout(function(){$$('[data-dial] .d-seg circle').forEach(function(c){c.setAttribute("stroke-dasharray",c.dataset.l)})},200);dio.disconnect()}})},{threshold:.5});
  var dl=$("[data-dial]");if(dl)dio.observe(dl);
})();
