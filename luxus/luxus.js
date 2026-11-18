/* PullTopia Luxus-Vorschau: nur IntersectionObserver + leichter Parallax. Kein WebGL, keine Bibliotheken. */
(function(){
  var secs=[].slice.call(document.querySelectorAll('[data-sec]'));
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dots={};[].forEach.call(document.querySelectorAll('.dots a'),function(a){dots[a.dataset.t]=a});
  function showAll(){secs.forEach(function(s){s.classList.add('in')})}
  if(!('IntersectionObserver' in window)||reduce){showAll()}
  else{
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:0.22,rootMargin:'0px 0px -6% 0px'});
    secs.forEach(function(s){io.observe(s)});
    // Sicherheitsnetz: ein Abschnitt, der nie 22 % erreicht (sehr niedriges Fenster), wird trotzdem eingeblendet
    var io2=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io2.unobserve(e.target)}})},{threshold:0.01,rootMargin:'0px 0px -35% 0px'});
    secs.forEach(function(s){io2.observe(s)});
  }
  // aktive Markierung in der Punktnavigation
  if('IntersectionObserver' in window){
    var cur=null;
    var io3=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var id=e.target.id;if(cur)cur.classList.remove('on');cur=dots[id]||null;if(cur)cur.classList.add('on')}})},{rootMargin:'-45% 0px -45% 0px'});
    secs.forEach(function(s){io3.observe(s)});
  }
  // Parallax (sehr sanft, nur sichtbare Abschnitte)
  if(reduce)return;
  var pars=secs.map(function(s){return {s:s,p:s.querySelector('.par'),vis:false}}).filter(function(o){return o.p});
  var vio=new IntersectionObserver(function(es){es.forEach(function(e){pars.forEach(function(o){if(o.s===e.target)o.vis=e.isIntersecting})})});
  pars.forEach(function(o){vio.observe(o.s)});
  var amp=window.innerWidth<960?10:26,ticking=false;
  function frame(){
    ticking=false;var vh=window.innerHeight;
    pars.forEach(function(o){
      if(!o.vis||o.s.id==='top'||o.s.id==='premium')return;
      var r=o.s.getBoundingClientRect();
      var k=(r.top+r.height/2-vh/2)/vh; // -1..1
      k=Math.max(-1,Math.min(1,k));
      o.p.style.setProperty('--py',(k*amp).toFixed(1)+'px');
    });
  }
  function req(){if(!ticking){ticking=true;requestAnimationFrame(frame)}}
  addEventListener('scroll',req,{passive:true});
  addEventListener('resize',function(){amp=innerWidth<960?10:26;req()});
  frame();
})();
