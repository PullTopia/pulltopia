/* PullTopia Neon v5: Kino-Szenen. Pro Abschnitt ein KI-Video (lazy geladen, nur sichtbar abgespielt) plus Live-Funken (Canvas).
   Schleifen laufen nahtlos; Einmal-Szenen (Tausch, Cardverse) spielen beim Sichtbarwerden und bleiben im Endbild stehen.
   Übersprungen = Endzustand. Reduced motion = Standbild. */
(function(){
  "use strict";
  var d=document,reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobv=function(){return innerWidth<=820};
  function clamp(v,a,b){return Math.min(b,Math.max(a,v))}
  function ss(a,b,x){var t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)}
  var els=[].slice.call(d.querySelectorAll(".bg[data-bg]"));
  if(!els.length)return;
  var PAL={gold:["255,250,225","255,214,120","255,150,50"],fire:["255,235,180","255,165,60","210,60,15"],storm:["240,248,255","150,205,255","255,170,70"]};
  var spr={};
  function sprites(k){if(spr[k])return spr[k];var c=PAL[k]||PAL.gold,a=[[c[0],c[1]],[c[1],c[2]],[c[2],"160,30,10"]];
    spr[k]=a.map(function(p){var s=d.createElement("canvas");s.width=s.height=48;var g=s.getContext("2d"),r=g.createRadialGradient(24,24,0,24,24,24);
      r.addColorStop(0,"rgba("+p[0]+",1)");r.addColorStop(.25,"rgba("+p[1]+",.85)");r.addColorStop(1,"rgba("+p[1]+",0)");g.fillStyle=r;g.fillRect(0,0,48,48);return s});return spr[k]}
  var ptr={x:-1e4,y:-1e4,vx:0,vy:0,on:0};
  function mv(x,y){if(ptr.on>.05){ptr.vx=x-ptr.x;ptr.vy=y-ptr.y}ptr.x=x;ptr.y=y;ptr.on=1}
  addEventListener("pointermove",function(e){mv(e.clientX,e.clientY)},{passive:true});
  addEventListener("touchmove",function(e){var t=e.touches[0];if(t)mv(t.clientX,t.clientY)},{passive:true});
  addEventListener("touchstart",function(e){var t=e.touches[0];if(t){ptr.on=0;mv(t.clientX,t.clientY)}},{passive:true});

  var objs=els.map(function(el,i){
    var o={el:el,i:i,name:el.dataset.bg,mode:el.dataset.mode,em:el.dataset.em||"gold",N:+el.dataset.n||60,
      ex:(el.dataset.ex||"0,1,.8,1").split(",").map(parseFloat),
      inn:el.querySelector(".bg-in"),v:el.querySelector(".bg-v"),cv:el.querySelector(".bg-em"),img:el.querySelector(".bg-img"),
      loaded:false,started:false,done:false,vis:false,P:[],acc:0,W:0,H:0,dpr:1,cx:null};
    o.cx=o.cv.getContext("2d");
    return o});

  function suffix(){return mobv()?"-m":""}
  function setPoster(o){o.v.poster="scenes/"+o.name+"-a"+suffix()+".webp"}
  function load(o){if(o.loaded||o.done)return;o.loaded=true;setPoster(o);o.v.src="scenes/"+o.name+suffix()+".mp4";o.v.preload="auto";o.v.load();
    if(o.mode==="loop"&&o.vis)play(o)}
  function unload(o){if(!o.loaded||o.done)return;o.loaded=false;o.v.pause();o.v.removeAttribute("src");o.v.load();o.el.classList.remove("on")}
  function play(o){var p=o.v.play();if(p&&p.catch)p.catch(function(){if(o.mode==="once")endState(o)})}
  function setEnd(o){if(o.mode!=="once")return;o.el.querySelectorAll("source,img").forEach(function(n){if(n.srcset)n.srcset=n.srcset.replace("-a-m.webp","-b-m.webp");if(n.src&&n.tagName==="IMG")n.src=n.src.replace("-a.webp","-b.webp")})}
  function endState(o){o.started=true;o.done=true;setEnd(o);o.el.classList.add("skip");o.v.pause()}

  if(reduce||!("IntersectionObserver" in window)){
    els.forEach(function(el){el.classList.add("static")});objs.forEach(setEnd);
    setTimeout(function(){window.PT&&PT.done()},300);
    return}

  els.forEach(function(el,i){setPoster(objs[i])});
  objs.forEach(function(o){
    o.v.addEventListener("playing",function(){o.el.classList.add("on")});
    if(o.mode==="once")o.v.addEventListener("ended",function(){o.done=true});
  });
  var vh=function(){return innerHeight};
  var near=new IntersectionObserver(function(es){es.forEach(function(e){var o=objs[els.indexOf(e.target)];if(e.isIntersecting)load(o)})},{rootMargin:"100% 0px 100% 0px"});
  var far=new IntersectionObserver(function(es){es.forEach(function(e){var o=objs[els.indexOf(e.target)];if(!e.isIntersecting)unload(o)})},{rootMargin:"250% 0px 250% 0px"});
  var vis=new IntersectionObserver(function(es){es.forEach(function(e){
    var o=objs[els.indexOf(e.target.closest(".bg"))];o.vis=e.isIntersecting;
    if(o.vis){
      if(o.mode==="loop"){if(o.loaded)play(o)}
      else if(!o.started&&e.intersectionRatio>=.5){load(o);o.started=true;play(o)}
      startLoop()}
    else{o.v.pause();if(o.mode==="once"&&!o.done&&(o.started||e.boundingClientRect.bottom<0))endState(o)}
  })},{threshold:[0,.5]});
  els.forEach(function(el){near.observe(el);far.observe(el);vis.observe(el.querySelector(".bg-in"))});
  // Sprung über Einmal-Szenen hinweg: Endzustand zeigen
  var sk=false;function skipChk(){sk=false;objs.forEach(function(o){if(o.mode==="once"&&!o.started&&o.inn.getBoundingClientRect().bottom<0)endState(o)})}
  addEventListener("scroll",function(){if(!sk){sk=true;requestAnimationFrame(skipChk)}},{passive:true});
  skipChk();
  // Einmal-Szene, die sichtbar ist, aber gerade pausiert wurde (Tab-Wechsel): weiter
  d.addEventListener("visibilitychange",function(){if(!d.hidden)objs.forEach(function(o){if(o.vis&&o.loaded&&!o.done&&o.started&&o.mode==="once")play(o);if(o.vis&&o.mode==="loop"&&o.loaded)play(o)})});

  // Ladebildschirm: fertig, sobald die Hero-Szene bereitsteht
  (function(){var o=objs[0],fin=false;function go(){if(fin)return;fin=true;window.PT&&PT.done()}
    if(o.img.complete&&o.img.naturalWidth)go();else o.img.addEventListener("load",go);
    o.v.addEventListener("canplay",go,{once:true});setTimeout(go,3500);
    load(o)})();

  /* Funken */
  function size(o){var r=o.inn.getBoundingClientRect();o.dpr=Math.min(devicePixelRatio||1,mobv()?1.25:1.5);o.W=r.width;o.H=r.height;
    o.cv.width=Math.round(o.W*o.dpr);o.cv.height=Math.round(o.H*o.dpr);o.cx.setTransform(o.dpr,0,0,o.dpr,0,0)}
  addEventListener("resize",function(){objs.forEach(function(o){if(o.vis)size(o)})});
  function spawn(o){var s=mobv()?.85:1,x0=o.ex[0],x1=o.ex[1],y0=o.ex[2],y1=o.ex[3];
    o.P.push({x:o.W*(x0+Math.random()*(x1-x0)),y:o.H*(y0+Math.random()*(y1-y0)),vx:0,vy:-(30+Math.random()*80)*s,l:0,m:2.2+Math.random()*3.4,s:(.5+Math.random()*1.3)*(o.W/1000+.5),ph:Math.random()*6.28})}
  var running=false,lastT=0,tm=0;
  function startLoop(){if(running)return;running=true;lastT=0;requestAnimationFrame(loop)}
  function loop(now){
    var any=false;objs.forEach(function(o){if(o.vis)any=true});
    if(!any||d.hidden){running=false;return}
    requestAnimationFrame(loop);
    var gap=mobv()?33:14;if(now-lastT<gap)return;var dt=Math.min(.05,(now-(lastT||now-16))/1000);lastT=now;tm+=dt;
    ptr.on=Math.max(0,ptr.on-dt*1.1);ptr.vx*=.9;ptr.vy*=.9;
    objs.forEach(function(o){if(!o.vis)return;
      if(!o.W||Math.abs(o.inn.clientWidth-o.W)>2)size(o);
      var cx=o.cx,r=o.inn.getBoundingClientRect(),px=ptr.x-r.left,py=ptr.y-r.top,sp=sprites(o.em);
      // Stärke: Einmal-Szenen setzen mit dem Funkenregen im Video ein
      var k=o.mode==="once"?(o.done?1:(o.started?.35+.65*ss(.6,2.2,o.v.currentTime||0):.3)):1,max=(mobv()?Math.round(o.N*.4):o.N)*k;
      o.acc+=dt*max/3;while(o.acc>=1&&o.P.length<max){spawn(o);o.acc-=1}if(o.acc>3)o.acc=0;
      cx.clearRect(0,0,o.W,o.H);cx.globalCompositeOperation="lighter";
      for(var i=o.P.length-1;i>=0;i--){var p=o.P[i];p.l+=dt;if(p.l>=p.m||p.y<-20){o.P.splice(i,1);continue}
        var fx=Math.sin(p.y*.011+tm*.8+p.ph)*Math.cos(p.x*.007-tm*.45)*58,fy=Math.cos(p.x*.013+tm*.55)*Math.sin(p.y*.008+tm*.3+p.ph)*22-26;
        p.vx+=(fx-p.vx)*Math.min(1,dt*1.6);p.vy+=((fy-52)-p.vy)*Math.min(1,dt*.9);
        if(ptr.on>.02){var dx=p.x-px,dy=p.y-py,dd=Math.sqrt(dx*dx+dy*dy)+.01,R=mobv()?120:180;
          if(dd<R){var f=(1-dd/R)*ptr.on;p.vx+=(-dy/dd*480+ptr.vx*14)*f*dt;p.vy+=(dx/dd*480+ptr.vy*14)*f*dt-f*40*dt}}
        p.x+=p.vx*dt;p.y+=p.vy*dt;
        var a=p.l/p.m,al=Math.min(1,p.l*5)*(1-a)*(.65+.35*Math.sin(tm*18+p.ph*7)),sz=p.s*(3.2+6*(1-a))*1.2;
        cx.globalAlpha=Math.max(0,al);cx.drawImage(sp[a<.25?0:a<.6?1:2],p.x-sz/2,p.y-sz/2,sz,sz)}
      cx.globalAlpha=1;cx.globalCompositeOperation="source-over"});
  }
  window.PT_SCENES=function(){return objs.map(function(o){return{n:o.name,mode:o.mode,loaded:o.loaded,vis:o.vis,started:o.started,done:o.done,t:+(o.v.currentTime||0).toFixed(2),p:o.P.length,on:o.el.classList.contains("on"),skip:o.el.classList.contains("skip")}})};
})();
