/* PullTopia Neon-Vorschau v2: UI-Schicht (Ladebildschirm, Sticky-Storytelling, Live-Daten, Karussell). Läuft auch ohne WebGL. */
(function(){
  "use strict";
  var d=document,root=d.documentElement;
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Handy/Touch: kürzere Abschnitte, kein Ausblenden, Mindestsichtbarkeit
  var touchMQ=matchMedia("(max-width:820px), (pointer:coarse)");function isTouch(){return touchMQ.matches}
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
  setTimeout(function(){if(!finished){PT.done()}},6500);

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
      // Touch: Text blendet nur ein (ab 40 %), nie aus; er scrollt am Abschnittsende einfach mit weg. So bleibt beim schnellen Wischen nichts unsichtbar
      if(isTouch()){op=first?1:.4+.6*ss(.15,.6,e);sc=1;ty=reduce?0:(1-ss(.15,.6,e))*16}
      ct.style.opacity=op.toFixed(3);ct.style.transform="translate3d(0,"+ty.toFixed(1)+"px,0) scale("+sc.toFixed(4)+")";
      ct.style.pointerEvents=op<.2?"none":"";
    });
  }
  /* Einmal-Animationen: starten zeitbasiert beim ersten Sichtbarwerden und laufen komplett durch, auch beim Weiterwischen.
     Wurde ein Abschnitt übersprungen (schon oberhalb des Bildschirms), steht sofort der Endzustand da. */
  var pend=[];
  function once(el,play,end){pend.push({el:el,play:play,end:end||play});check()}
  function check(){if(!pend.length)return;var vh=innerHeight,minOp=isTouch()?.25:.7;
    pend=pend.filter(function(q){var r=q.el.getBoundingClientRect();
      if(r.bottom<0){q.end();return false}
      if(r.top<vh*.92&&r.bottom>vh*.08){var ct=q.el.closest(".ct")||q.el;if(+getComputedStyle(ct).opacity>=minOp||ct.closest(".flow")){q.play();return false}}
      return true})}
  function passFlow(){secs.forEach(function(s){if(s.classList.contains("flow")&&!s.classList.contains("in")&&s.getBoundingClientRect().top<innerHeight*.9)s.classList.add("in")})}
  var tk=false;function req(){if(!tk){tk=true;requestAnimationFrame(function(){tk=false;frame();passFlow();check()})}}
  setInterval(function(){if(pend.length&&!d.hidden)check()},400);
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
      once(fbar,play,function(){played=true;endState()})}
  }

  /* Live-Statistik: Live-Branch → Root-stats.json (funktioniert unter / und /neon/) → localStorage → Werte im HTML */
  function siteStatsUrl(){var p=location.pathname;if(p.indexOf("/neon")>=0)p=p.replace(/\/neon(\/.*)?$/,"/");else p=p.replace(/\/[^/]*$/,"/");if(p.slice(-1)!=="/")p+="/";return location.origin+p+"stats.json"}
  var URLS=["https://raw.githubusercontent.com/PullTopia/pulltopia/live-stats/stats.json",siteStatsUrl()];
  var LS="pt-site-stats-v1",ORDER=["DE","AT","CH","NL","BE"];
  function valid(s){if(!s||s.version!==1||!s.metrics)return null;var m=s.metrics,need=["dropsDetected","restocksDetected","backdropsDetected","shopsLive","signalsLive","freeDelayMin"];for(var i=0;i<need.length;i++)if(!isFinite(m[need[i]]))return null;return s}
  function keys(by){if(!by)return[];var a=ORDER.filter(function(c){return by[c]>0});Object.keys(by).filter(function(c){return ORDER.indexOf(c)<0&&by[c]>0}).sort().forEach(function(c){a.push(c)});return a}
  /* Hochzählen beim Sichtbarwerden (Zahlen, Drops-Text) + TradeMatch-Chips, einmalig; reduced motion = Endwert */
  var CU=["drops","premmed","freemed","shops","signals","restocks","backdrops","shops-t","signals-t","freedelay"],NUM=/\d[\d.]*(?:,\d+)?/;
  function cuTxt(s,e){return s.replace(NUM,function(m){var dec=m.indexOf(",")>=0?m.split(",")[1].length:0,v=parseFloat(m.replace(/\./g,"").replace(",","."))*e;
    return new Intl.NumberFormat("de-DE",{minimumFractionDigits:dec,maximumFractionDigits:dec}).format(dec?v:Math.round(v))})}
  function whenShown(ct,cb,end){once(ct,cb,end)}
  var anim=!reduce&&("IntersectionObserver" in window),groups=[];
  if(anim){CU.forEach(function(k){$$('[data-s="'+k+'"]').forEach(function(el){el._f=el.textContent;el._cu=1;el.textContent=cuTxt(el._f,0);
      var ct=el.closest(".ct"),g=groups.filter(function(x){return x.ct===ct})[0];if(!g){g={ct:ct,els:[]};groups.push(g)}g.els.push(el)})});
    groups.forEach(function(g){function fin(){g.els.forEach(function(el){el.textContent=el._f;el._cu=0})}
      whenShown(g.ct,function(){var st=performance.now();
      (function step(now){var k=clamp((now-st)/1200,0,1),e=1-Math.pow(1-k,3);g.els.forEach(function(el){el.textContent=k<1?cuTxt(el._f,e):el._f});
        if(k<1)requestAnimationFrame(step);else fin()})(st)},fin)})}
  /* TradeMatch: von jedem Chip zeichnet sich eine Linie zu beiden Karten, dann wird der Chip grün; am Ende leuchtet MATCH grün */
  var crits=$$(".crit"),tmw=$(".tmw"),svg=$(".tm-lines");
  if(crits.length&&tmw&&svg){
    var NS="http://www.w3.org/2000/svg",cardsT=$$(".tmw .tcard"),mid=$(".tmw .tm-mid"),lines=[],done=false;
    svg.innerHTML='<defs><linearGradient id="tmgc" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#2ee6ff"/><stop offset="1" stop-color="#9b6bff"/></linearGradient></defs>';
    crits.forEach(function(c,i){var g=[];for(var j=0;j<2;j++){var p=d.createElementNS(NS,"path");svg.appendChild(p);g.push(p)}lines.push(g)});
    var dots=[0,1].map(function(){var c=d.createElementNS(NS,"circle");c.setAttribute("r","2.4");c.style.opacity="0";svg.appendChild(c);return c});
    function geo(){var wr=tmw.getBoundingClientRect(),s=wr.width/(tmw.offsetWidth||1)||1;
      function loc(el){var r=el.getBoundingClientRect();return{l:(r.left-wr.left)/s,t:(r.top-wr.top)/s,w:r.width/s,h:r.height/s}}
      var box=crits[0].parentNode;box.classList.remove("wrap");if(box.scrollWidth>box.clientWidth+1)box.classList.add("wrap");
      var cs=cardsT.map(loc),top0=loc(crits[0]).t;
      crits.forEach(function(c,i){var r=loc(c),sx=r.l+r.w/2,sy=r.t;
        // Chips in einer zweiten Reihe bekommen keine Linie, damit nichts über Text läuft
        lines[i].forEach(function(p){p.style.display=r.t>top0+4?"none":""});
        lines[i].forEach(function(p,j){var k=cs[j],ex=k.l+k.w*(.2+.15*i),ey=k.t+k.h,dy=sy-ey;
          // Bei wenig Platz kurze, fast gerade Linie; sonst sanft gebogen
          p.setAttribute("d",dy<14?"M"+sx+" "+sy+"L"+ex+" "+ey:"M"+sx+" "+sy+"C"+sx+" "+(sy-dy*.7)+" "+ex+" "+(ey+dy*.7)+" "+ex+" "+ey);
          var L=p.getTotalLength();p._L=L;p.style.strokeDasharray=L;if(p._k===undefined)p._k=0;p.style.strokeDashoffset=L*(1-p._k)})})}
    function pulse(){cardsT.forEach(function(c){c.classList.remove("pulse");void c.offsetWidth;c.classList.add("pulse")})}
    function finish(){done=true;crits.forEach(function(c,i){c.classList.add("on","ok");lines[i].forEach(function(p){p._k=1;p.classList.add("ok")})});mid.classList.add("ok");geo();dots.forEach(function(x){x.style.opacity="0"})}
    geo();addEventListener("resize",geo);
    if(d.fonts&&d.fonts.ready)d.fonts.ready.then(geo);
    if(!anim)finish();
    else whenShown(tmw.closest(".ct"),function(){geo();var st=performance.now(),D=620,GAP=250;
      (function step(now){var all=true;
        crits.forEach(function(c,i){var k=clamp((now-st-i*GAP)/D,0,1),e=1-Math.pow(1-k,2);
          if(k>0)c.classList.add("on");if(k<1)all=false;
          lines[i].forEach(function(p,j){p._k=e;p.style.strokeDashoffset=p._L*(1-e);
            if(k>0&&k<1){var pt=p.getPointAtLength(p._L*e);dots[j].setAttribute("cx",pt.x);dots[j].setAttribute("cy",pt.y);dots[j].style.opacity="1"}});
          if(k>=1&&!c.classList.contains("ok")){c.classList.add("ok");lines[i].forEach(function(p){p.classList.add("ok")});pulse();if(i===crits.length-1)dots.forEach(function(x){x.style.opacity="0"})}});
        if(!all)requestAnimationFrame(step);else setTimeout(function(){mid.classList.add("ok");done=true},200)})(st)},finish)
  }
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

  /* Feuer-Showcase: Video (Intro einmal, dann nahtlose Schleife) startet beim Sichtbarwerden; Funken live per Canvas.
     Übersprungen (Abschnitt schon oberhalb) = Endzustand (Flammen brennen). Reduced motion = Standbild. */
  var fxw=$(".fx-wrap");
  if(fxw){(function(){
    var frame=fxw.querySelector(".fx-frame"),vi=fxw.querySelector(".fx-intro"),vl=fxw.querySelector(".fx-loop"),cvs=fxw.querySelector(".fx-em");
    if(reduce||!("IntersectionObserver" in window)){fxw.classList.add("static");return}
    var mobv=function(){return innerWidth<=820},loaded=false,started=false,burning=false,inView=false,t0=0;
    var BASE=window.NEON_BASE||"";
    function setSrc(v,name){var m=mobv()?"-m":"";v.innerHTML="";
      [["mp4","video/mp4"],["webm","video/webm"]].forEach(function(f){var s=d.createElement("source");s.src=BASE+"fire/fire-"+name+m+"."+f[0];s.type=f[1];v.appendChild(s)});
      v.poster=BASE+"fire/fire-"+(name==="intro"?"start":"end")+m+".jpg";v.preload="auto";v.load()}
    function load(){if(loaded)return;loaded=true;setSrc(vi,"intro");setSrc(vl,"loop")}
    function burn(){if(burning)return;burning=true;fxw.classList.add("burn");if(inView)pl(vl)}
    function pl(v){var p=v.play();if(p&&p.catch)p.catch(function(){})}
    function playIntro(){if(started)return;started=true;load();t0=performance.now();
      var p=vi.play();if(p&&p.catch)p.catch(function(){burn()}); // Autoplay blockiert (z. B. Stromsparmodus): Endzustand zeigen
      vi.addEventListener("ended",burn,{once:true});vi.addEventListener("error",burn,{once:true});
      setTimeout(function(){if(!burning&&vi.readyState<2&&vi.currentTime===0)burn()},6000)}
    function endState(){if(started)return;started=true;load();burn()}
    var pre=new IntersectionObserver(function(es){if(es[0].isIntersecting){load();pre.disconnect()}},{rootMargin:"900px 0px"});pre.observe(frame);
    var io=new IntersectionObserver(function(es){es.forEach(function(e){
      inView=e.isIntersecting;
      if(inView){if(e.intersectionRatio>=.4&&!started)playIntro();if(burning)pl(vl);if(started&&!vi.ended&&!burning)pl(vi);startEm()}
      else{if(!started&&e.boundingClientRect.bottom<0)endState();vl.pause();if(!burning)vi.pause()}
    })},{threshold:[0,.4]});io.observe(frame);
    // Wurde der Abschnitt per Sprung übersprungen (kein Schwellen-Ereignis), steht sofort der Endzustand da
    var sk=false;function skipChk(){sk=false;if(!started&&frame.getBoundingClientRect().bottom<0)endState()}
    addEventListener("scroll",function(){if(!sk&&!started){sk=true;requestAnimationFrame(skipChk)}},{passive:true});
    /* Funken */
    var cx=cvs.getContext("2d"),P=[],W=0,H=0,dpr=1,fr={x:0,y:0,w:0,h:0},run=false,lastT=0,acc=0,tm=0,ms={x:-1e4,y:-1e4,vx:0,vy:0,on:0};
    var spr=[["255,250,225","255,214,120"],["255,214,120","255,150,50"],["255,150,50","200,50,10"]].map(function(c){var s=d.createElement("canvas");s.width=s.height=48;var g=s.getContext("2d"),r=g.createRadialGradient(24,24,0,24,24,24);
      r.addColorStop(0,"rgba("+c[0]+",1)");r.addColorStop(.25,"rgba("+c[1]+",.85)");r.addColorStop(1,"rgba("+c[1]+",0)");g.fillStyle=r;g.fillRect(0,0,48,48);return s});
    function size(){var r=cvs.getBoundingClientRect(),f=frame.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,mobv()?1.5:2);W=r.width;H=r.height;
      cvs.width=Math.round(W*dpr);cvs.height=Math.round(H*dpr);cx.setTransform(dpr,0,0,dpr,0,0);fr={x:f.left-r.left,y:f.top-r.top,w:f.width,h:f.height}}
    addEventListener("resize",function(){if(run)size()});
    function mv(x,y){var r=cvs.getBoundingClientRect(),nx=x-r.left,ny=y-r.top;if(ms.on>.05){ms.vx=nx-ms.x;ms.vy=ny-ms.y}ms.x=nx;ms.y=ny;ms.on=1}
    fxw.addEventListener("pointermove",function(e){mv(e.clientX,e.clientY)},{passive:true});
    fxw.addEventListener("touchmove",function(e){var t=e.touches[0];if(t)mv(t.clientX,t.clientY)},{passive:true});
    fxw.addEventListener("touchstart",function(e){var t=e.touches[0];if(t){ms.on=0;mv(t.clientX,t.clientY)}},{passive:true});
    function spawn(){var N=P.length,s=mobv()?.8:1;
      P.push({x:fr.x+fr.w*(.5+(Math.random()-.5)*.82),y:fr.y+fr.h*(.78+Math.random()*.1),vx:0,vy:-(30+Math.random()*80)*s,l:0,m:2+Math.random()*3.2,s:(.5+Math.random()*1.3)*(mobv()?1.05:1)*(fr.w/900+.5),ph:Math.random()*6.28})}
    function startEm(){if(run||!inView)return;run=true;size();lastT=0;requestAnimationFrame(em)}
    function em(now){
      if(!run)return;if(!inView||d.hidden){run=false;return}
      requestAnimationFrame(em);
      var gap=mobv()?33:14;if(now-lastT<gap)return;var dt=Math.min(.05,(now-(lastT||now-16))/1000);lastT=now;tm+=dt;
      // Stärke folgt dem Video: Funken setzen mit der Eruption ein
      var k=burning?1:(started?ss(.5,2.4,vi.currentTime||0):0),max=(mobv()?42:120)*k;
      ms.on=Math.max(0,ms.on-dt*1.1);ms.vx*=.9;ms.vy*=.9;
      acc+=dt*max/3;while(acc>=1&&P.length<max){spawn();acc-=1}if(acc>3)acc=0;
      cx.clearRect(0,0,W,H);cx.globalCompositeOperation="lighter";
      for(var i=P.length-1;i>=0;i--){var p=P[i];p.l+=dt;if(p.l>=p.m||p.y<-20){P.splice(i,1);continue}
        // Curl-artiges Driftfeld + Auftrieb
        var fx_=Math.sin(p.y*.011+tm*.8+p.ph)*Math.cos(p.x*.007-tm*.45)*58,fy_=Math.cos(p.x*.013+tm*.55)*Math.sin(p.y*.008+tm*.3+p.ph)*22-26;
        p.vx+=(fx_-p.vx)*Math.min(1,dt*1.6);p.vy+=((fy_-52)-p.vy)*Math.min(1,dt*.9);
        if(ms.on>.02){var dx=p.x-ms.x,dy=p.y-ms.y,dd=Math.sqrt(dx*dx+dy*dy)+.01,R=mobv()?120:170;
          if(dd<R){var f=(1-dd/R)*ms.on;p.vx+=(-dy/dd*480+ms.vx*14)*f*dt;p.vy+=(dx/dd*480+ms.vy*14)*f*dt-f*40*dt}}
        p.x+=p.vx*dt;p.y+=p.vy*dt;
        var a=p.l/p.m,al=Math.min(1,p.l*5)*(1-a)*(.65+.35*Math.sin(tm*18+p.ph*7)),sp=spr[a<.25?0:a<.6?1:2],sz=p.s*(3.2+6*(1-a))*1.2;
        cx.globalAlpha=Math.max(0,al);cx.drawImage(sp,p.x-sz/2,p.y-sz/2,sz,sz)}
      cx.globalAlpha=1;cx.globalCompositeOperation="source-over"}
    // Debug/Test-Hook: Zustand abfragen
    window.PT_FIRE=function(){return{started:started,burning:burning,particles:P.length,intro:vi.currentTime,loop:vl.currentTime}};
  })()}
})();
