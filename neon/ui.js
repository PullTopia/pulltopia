/* PullTopia Neon-Vorschau v2: UI-Schicht (Ladebildschirm, Sticky-Storytelling, Live-Daten, Karussell). Läuft auch ohne WebGL. */
(function(){
  "use strict";
  var d=document,root=d.documentElement;
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fmt=new Intl.NumberFormat("de-DE"),fmt1=new Intl.NumberFormat("de-DE",{maximumFractionDigits:1});
  function $(s){return d.querySelector(s)}
  function $$(s){return [].slice.call(d.querySelectorAll(s))}
  function clamp(v,a,b){return Math.min(b,Math.max(a,v))}
  function ss(a,b,x){var t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)}

  /* Ladebildschirm (zeitbasiert) */
  var bar=$("#ldbar"),pct=$("#ldpct"),msg=$("#ldmsg"),shown=0,target=0,t0=performance.now(),finished=false,doneCb=[],last=performance.now();
  function tick(now){
    var dt=Math.min(.25,(now-last)/1000);last=now;
    shown+=(target-shown)*(1-Math.exp(-dt*(finished?14:7)));if(target-shown<.6)shown=target;
    bar.style.width=shown.toFixed(1)+"%";pct.textContent=Math.round(shown)+"%";
    if(finished&&shown>=99.5){root.classList.add("ld-done");setTimeout(function(){root.classList.add("ready");doneCb.forEach(function(f){f()})},150);return}
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  window.PT={
    progress:function(p,m){target=Math.max(target,Math.min(100,p));if(m)msg.textContent=m},
    done:function(){if(finished)return;var wait=Math.max(0,(reduce?200:1100)-(performance.now()-t0));setTimeout(function(){finished=true;target=100},wait)},
    onReady:function(f){if(root.classList.contains("ready"))f();else doneCb.push(f)}
  };
  PT.progress(8);
  setTimeout(function(){if(!finished){if(!window.PT_GL)root.classList.add("no-gl");PT.done()}},6500);

  /* Film-Grain */
  try{var c=d.createElement("canvas");c.width=c.height=180;var x=c.getContext("2d"),im=x.createImageData(180,180);
    for(var i=0;i<im.data.length;i+=4){var v=Math.random()*255|0;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255}
    x.putImageData(im,0,0);$(".grain").style.backgroundImage="url("+c.toDataURL()+")"}catch(e){}

  /* Sticky-Abschnitte: Einblenden / Ausblenden wie eine Produktseite */
  var secs=$$(".sc");
  var hdr=function(){return parseFloat(getComputedStyle(root).getPropertyValue("--hdr"))||80};
  function fit(){
    // Abschnitte, deren Inhalt nicht in den Bildschirm passt, laufen normal mit (kein Abschneiden)
    secs.forEach(function(s){
      if(s.dataset.forceFlow===undefined)s.dataset.forceFlow=s.classList.contains("flow")?"1":"0";
      if(s.dataset.forceFlow==="1")return;
      s.classList.remove("flow");
      var ct=s.querySelector(".ct"),stk=s.querySelector(".stk"),avail=stk.clientHeight-hdr()-30;
      if(ct.scrollHeight>avail)s.classList.add("flow");
      // Oberkante des Inhalts im Sticky-Zustand (für die Platzierung der 3D-Karte auf dem Handy)
      var pb=parseFloat(getComputedStyle(stk).paddingBottom)||0;
      s.dataset.ctTop=Math.round(stk.clientHeight-pb-ct.offsetHeight);
    });
    window.dispatchEvent(new Event("pt-layout"));
  }
  var fio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)e.target.classList.add("in")})},{threshold:.12});
  secs.forEach(function(s){fio.observe(s)});
  function frame(){
    var vh=innerHeight;
    secs.forEach(function(s){
      var ct=s.querySelector(".ct");
      if(s.classList.contains("flow")){ct.style.opacity="";ct.style.transform="";return}
      var r=s.getBoundingClientRect();
      if(r.bottom<-50||r.top>vh+50)return;
      var range=Math.max(1,r.height-vh),p=clamp(-r.top/range,0,1),e=clamp(1-r.top/vh,0,1);
      var first=s.id==="top",last=s.id==="join";
      var op=(first?1:ss(.45,.95,e))*(last?1:(1-ss(.62,.95,p)));
      var sc=(first?1:.94+.06*ss(.4,1,e))*(last?1:(1+.05*ss(.62,1,p)));
      var ty=(first?0:(1-ss(.4,1,e))*40)-(last?0:ss(.62,1,p)*30);
      if(reduce){op=(first?1:ss(.6,.9,e))*(last?1:(1-ss(.8,.95,p)));sc=1;ty=0}
      ct.style.opacity=op.toFixed(3);ct.style.transform="translate3d(0,"+ty.toFixed(1)+"px,0) scale("+sc.toFixed(4)+")";
      ct.style.pointerEvents=op<.2?"none":"";
    });
  }
  var tk=false;function req(){if(!tk){tk=true;requestAnimationFrame(function(){tk=false;frame()})}}
  addEventListener("scroll",req,{passive:true});
  addEventListener("resize",function(){fit();req()});
  addEventListener("load",function(){fit();req()});
  fit();frame();

  /* Anker: auf den ruhigen Teil eines Sticky-Abschnitts springen, nicht auf dessen Anfang */
  $$('a[href^="#"]').forEach(function(a){a.addEventListener("click",function(ev){
    var t=d.getElementById(a.getAttribute("href").slice(1));if(!t)return;ev.preventDefault();
    var top=t.getBoundingClientRect().top+scrollY;
    if(t.classList.contains("sc")&&!t.classList.contains("flow")&&t.id!=="top")top+=(t.offsetHeight-innerHeight)*.25;
    if(t.id==="top")top=0;
    scrollTo({top:top,behavior:reduce?"auto":"smooth"});
  })});

  /* Gründerbalken */
  /* Gründerbalken + Preise: laufen beim Sichtbarwerden einmal hoch (Endwerte = echte Werte aus dem HTML) */
  var fc=$(".founder");
  if(fc){
    var fr=+fc.dataset.fcFree,tt=+fc.dataset.fcTotal,fbar=fc.querySelector(".fbar"),fi=fbar.querySelector("i"),fnum=fc.querySelector(".fc-free"),ftot=fc.querySelector(".fc-total");
    var fillPct=tt>0?clamp(fr/tt*100,0,100):0,prices=$$("[data-price]"),fmt2=new Intl.NumberFormat("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2});
    if(ftot)ftot.textContent=fmt.format(tt);
    function endState(){fi.style.setProperty("--fw",fillPct+"%");fnum.textContent=fmt.format(fr);prices.forEach(function(p){p.textContent=fmt2.format(+p.dataset.price)});fbar.classList.add("shine")}
    var played=false;
    function play(){
      if(played)return;played=true;
      if(reduce){endState();return}
      var st=performance.now(),dur=1000,pdur=900;fnum.textContent="0";
      (function step(now){var k=clamp((now-st)/dur,0,1),e=1-Math.pow(1-k,3);
        fi.style.setProperty("--fw",(fillPct*e).toFixed(2)+"%");fnum.textContent=fmt.format(Math.round(fr*e));
        var kp=clamp((now-st)/pdur,0,1),ep=1-Math.pow(1-kp,3);prices.forEach(function(p){p.textContent=fmt2.format(Math.round(+p.dataset.price*ep*100)/100)});
        if(k<1)requestAnimationFrame(step);else{endState()}})(st);
    }
    if(reduce||!("IntersectionObserver" in window))endState();
    else{fi.style.setProperty("--fw","0%");fnum.textContent="0";prices.forEach(function(p){p.textContent=fmt2.format(0)});
      var pio=new IntersectionObserver(function(es){if(es[0].isIntersecting){play();pio.disconnect()}},{threshold:.5});pio.observe(fbar)}
  }

  /* Live-Statistik wie Startseite: Live-Branch → ../stats.json → localStorage → Werte im HTML */
  var URLS=["https://raw.githubusercontent.com/PullTopia/pulltopia/live-stats/stats.json",new URL("../stats.json",location.href).href];
  var LS="pt-site-stats-v1",ORDER=["DE","AT","CH","NL","BE"];
  function valid(s){if(!s||s.version!==1||!s.metrics)return null;var m=s.metrics,need=["dropsDetected","restocksDetected","backdropsDetected","shopsLive","signalsLive","freeDelayMin"];for(var i=0;i<need.length;i++)if(!isFinite(m[need[i]]))return null;return s}
  function keys(by){if(!by)return[];var a=ORDER.filter(function(c){return by[c]>0});Object.keys(by).filter(function(c){return ORDER.indexOf(c)<0&&by[c]>0}).sort().forEach(function(c){a.push(c)});return a}
  /* Hochzählen beim Sichtbarwerden (Zahlen, Drops-Text) + TradeMatch-Chips, einmalig; reduced motion = Endwert */
  var CU=["drops","premmed","freemed","shops","signals","restocks","backdrops","shops-t","signals-t","freedelay"],NUM=/\d[\d.]*(?:,\d+)?/;
  function cuTxt(s,e){return s.replace(NUM,function(m){var dec=m.indexOf(",")>=0?m.split(",")[1].length:0,v=parseFloat(m.replace(/\./g,"").replace(",","."))*e;
    return new Intl.NumberFormat("de-DE",{minimumFractionDigits:dec,maximumFractionDigits:dec}).format(dec?v:Math.round(v))})}
  function whenShown(ct,cb){var go=false;var io=new IntersectionObserver(function(es){if(!es[0].isIntersecting||go)return;
      (function chk(){if(go)return;var r=ct.getBoundingClientRect();if(+getComputedStyle(ct).opacity>.7&&r.top<innerHeight*.85&&r.bottom>innerHeight*.15){go=true;io.disconnect();cb()}else requestAnimationFrame(chk)})()},{threshold:.15});io.observe(ct)}
  var anim=!reduce&&("IntersectionObserver" in window),groups=[];
  if(anim){CU.forEach(function(k){$$('[data-s="'+k+'"]').forEach(function(el){el._f=el.textContent;el._cu=1;el.textContent=cuTxt(el._f,0);
      var ct=el.closest(".ct"),g=groups.filter(function(x){return x.ct===ct})[0];if(!g){g={ct:ct,els:[]};groups.push(g)}g.els.push(el)})});
    groups.forEach(function(g){whenShown(g.ct,function(){var st=performance.now();
      (function step(now){var k=clamp((now-st)/1200,0,1),e=1-Math.pow(1-k,3);g.els.forEach(function(el){el.textContent=k<1?cuTxt(el._f,e):el._f});
        if(k<1)requestAnimationFrame(step);else g.els.forEach(function(el){el._cu=0})})(st)})})}
  var crits=$$(".crit");
  if(crits.length){if(!anim)crits.forEach(function(c){c.classList.add("on")});
    else whenShown(crits[0].closest(".ct"),function(){crits.forEach(function(c,i){setTimeout(function(){c.classList.add("on")},150+i*190)})})}
  function set(k,v){$$('[data-s="'+k+'"]').forEach(function(el){if(el._cu)el._f=v;else el.textContent=v})}
  function ago(iso){var ts=Date.parse(iso);if(!isFinite(ts))return"";var m=Math.max(0,Math.round((Date.now()-ts)/6e4));if(m<1)return"gerade eben";if(m<60)return"vor "+m+" Min";var h=Math.round(m/60);if(h<24)return"vor "+h+" Std.";var dd=Math.round(h/24);return"vor "+dd+" Tag"+(dd===1?"":"en")}
  function apply(s,live){
    var m=s.metrics;
    set("drops",fmt.format(m.dropsDetected));set("restocks",fmt.format(m.restocksDetected));set("backdrops",fmt.format(m.backdropsDetected));
    set("shops",fmt.format(m.shopsLive));set("signals",fmt.format(m.signalsLive));
    set("shops-t",fmt.format(m.shopsLive)+" Shops");set("signals-t",fmt.format(m.signalsLive)+" Signalquellen");set("freedelay",fmt.format(m.freeDelayMin));
    if(isFinite(m.premiumMedianSec)){set("premmed",fmt1.format(m.premiumMedianSec));if(isFinite(m.premiumMedianN))set("premnote","n = "+fmt.format(m.premiumMedianN)+" · interne Verarbeitungszeit")}
    if(isFinite(m.freeMedianMin)){set("freemed",fmt1.format(m.freeMedianMin));set("freenote",m.freeEarly===0?"keiner vor Ablauf der "+m.freeDelayMin+" Minuten":fmt.format(m.freeEarly)+" vor Ablauf der "+m.freeDelayMin+" Minuten")}
    var k=keys(m.shopsByCountry);
    if(k.length){set("legend",k.map(function(c){return fmt.format(m.shopsByCountry[c])+" "+c}).join(" · "));set("countries",k.length===1?k[0]:k.slice(0,-1).join(", ")+" und "+k[k.length-1])}
    if(s.countingSinceLabel)set("since",s.countingSinceLabel);
    var fresh=isFinite(Date.parse(s.generatedAt))&&(Date.now()-Date.parse(s.generatedAt)<2*36e5);
    $$("[data-live]").forEach(function(el){el.hidden=!(live&&fresh)});if(live&&fresh)set("ago",ago(s.generatedAt));
  }
  function fetchOne(u){var ac=new AbortController(),t=setTimeout(function(){ac.abort()},2500);
    return fetch(u,{cache:"no-store",signal:ac.signal,headers:{Accept:"application/json"}}).then(function(r){if(!r.ok)throw 0;return r.json()}).finally(function(){clearTimeout(t)})}
  (function load(i){
    if(i>=URLS.length){try{var s=valid(JSON.parse(localStorage.getItem(LS)||""));if(s)apply(s,false)}catch(e){}return}
    fetchOne(URLS[i]).then(function(j){var s=valid(j);if(!s)throw 0;apply(s,true);try{localStorage.setItem(LS,JSON.stringify(s))}catch(e){}}).catch(function(){load(i+1)});
  })(0);

  /* Cardverse-Karussell: ziehen / wischen / Pfeile, sanfte Trägheit, Auto-Drehung im Leerlauf */
  var cv=$("#cv"),ring=$("#cvring");
  if(cv&&ring){
    var ang=0,vel=0,drag=false,lx=0,idle=0,vis=false,lt=performance.now(),snapTo=null;
    var vio=new IntersectionObserver(function(es){vis=es[0].isIntersecting;if(vis)lt=performance.now(),requestAnimationFrame(spin)});vio.observe(cv);
    var cards=[].slice.call(ring.querySelectorAll(".cvc"));
    function setA(){ring.style.setProperty("--a",ang.toFixed(2)+"deg");
      // Karten direkt vor der Geheimkarte werden durchscheinend, damit sie sichtbar bleibt
      cards.forEach(function(c,i){var a=((i*36+ang)%360+540)%360-180,x=Math.abs(a);c.style.setProperty("--o",(x<62?ss(24,62,x):1).toFixed(2))})}
    cv.addEventListener("pointerdown",function(e){drag=true;lx=e.clientX;vel=0;snapTo=null;try{cv.setPointerCapture(e.pointerId)}catch(_){}});
    cv.addEventListener("pointermove",function(e){if(!drag)return;var dx=e.clientX-lx;lx=e.clientX;ang+=dx*.35;vel=dx*.35*60;idle=0;setA()});
    function up(){drag=false;idle=0}
    cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);cv.addEventListener("lostpointercapture",up);
    function step(dir){snapTo=Math.round((ang+dir*36)/36)*36;idle=0;vel=0;if(reduce){ang=snapTo;snapTo=null;setA()}}
    $$("[data-cv]").forEach(function(b){b.addEventListener("click",function(){step(+b.dataset.cv)})});
    cv.addEventListener("keydown",function(e){if(e.key==="ArrowLeft"){step(-1);e.preventDefault()}if(e.key==="ArrowRight"){step(1);e.preventDefault()}});
    function spin(now){
      if(!vis)return;var dt=Math.min(.05,(now-lt)/1000);lt=now;
      if(!drag){
        if(snapTo!==null){ang+=(snapTo-ang)*(1-Math.exp(-dt*8));if(Math.abs(snapTo-ang)<.05){ang=snapTo;snapTo=null}}
        else if(Math.abs(vel)>2){ang+=vel*dt;vel*=Math.exp(-dt*2.6)}
        else if(!reduce){idle+=dt;if(idle>1.2)ang+=dt*9*Math.min(1,(idle-1.2))}
        setA();
      }
      requestAnimationFrame(spin);
    }
    setA();
  }
})();
