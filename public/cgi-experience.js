/* Conceptual time-dependent orbital artwork. No network calls or customer data. */
(()=>{'use strict';
for(const stage of document.querySelectorAll('[data-aa-cgi]')){
 const canvas=stage.querySelector('canvas'),button=stage.querySelector('button'),status=stage.querySelector('[data-aa-status]'),field=stage.querySelector('.aa-cgi-field');
 if(!canvas||!button||!status||!field||!canvas.getContext||!window.matchMedia)continue;
 const ctx=canvas.getContext('2d');if(!ctx)continue;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let w=0,h=0,raf=0,active=false,visible=false,start=0,last=0;
 const seed=Number(stage.dataset.seed)||1;
 const points=Array.from({length:240},(_,i)=>{const a=i*2.39996323,b=Math.acos(1-2*(i+.5)/240);return [Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)]});
 function draw(t){if(!w||!h)return;ctx.clearRect(0,0,w,h);
 const cx=w*.5,cy=h*.5,r=Math.min(w,h)*.35,phase=t*.00026+seed*.36,tilt=.4+seed*.03,c=Math.cos(phase),s=Math.sin(phase),ct=Math.cos(tilt),st=Math.sin(tilt);
 const p=points.map(([x,y,z],i)=>{const x1=x*c-z*s,z1=x*s+z*c,y1=y*ct-z1*st,z2=y*st+z1*ct,k=2.8/(3.1-z2);return{x:cx+x1*r*k,y:cy+y1*r*k,z:z2,i}});
 ctx.lineWidth=.7;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+13)%p.length];if(Math.hypot(a.x-b.x,a.y-b.y)>r*.48)continue;ctx.strokeStyle='rgba(141,219,241,'+(.08+(a.z+1)*.1)+')';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
 p.sort((a,b)=>a.z-b.z);for(const a of p){const alpha=.24+(a.z+1)*.32;ctx.fillStyle=a.i%11===0?'rgba(233,201,144,'+alpha+')':'rgba(155,223,227,'+alpha+')';ctx.beginPath();ctx.arc(a.x,a.y,.7+(a.z+1)*.8,0,Math.PI*2);ctx.fill();}
 for(let i=0;i<3;i++){ctx.strokeStyle=i===1?'rgba(233,201,144,.30)':'rgba(155,223,227,.22)';ctx.beginPath();ctx.ellipse(cx,cy,r*(1.08+i*.14),r*(.26+i*.14),phase*.28+i*.9,0,Math.PI*2);ctx.stroke();}}
 function size(){const b=field.getBoundingClientRect();w=Math.round(b.width);h=Math.round(b.height);if(!w||!h)return;const d=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);draw(0);}
 function stop(message){if(raf)cancelAnimationFrame(raf);raf=0;active=false;button.setAttribute('aria-pressed','false');button.textContent='Play orbital study';status.textContent=message||'Static artwork · motion is optional';draw(0);}
 function frame(now){if(!active)return;if(document.hidden||reduced.matches||!visible||now-start>12000){stop();return;}if(now-last>=33){draw(now-start);last=now;}raf=requestAnimationFrame(frame);}
 button.addEventListener('click',()=>{if(active){stop();return;}if(reduced.matches||document.hidden||!visible)return;active=true;start=performance.now();last=0;button.setAttribute('aria-pressed','true');button.textContent='Pause orbital study';status.textContent='Playing a 12-second conceptual motion study';raf=requestAnimationFrame(frame);});
 function sync(){stop(reduced.matches?'Reduced motion enabled · static artwork':'Static artwork · motion is optional');button.hidden=reduced.matches;}
 if(reduced.addEventListener)reduced.addEventListener('change',sync);else if(reduced.addListener)reduced.addListener(sync);
 if('IntersectionObserver' in window){new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);if(!visible&&active)stop();},{threshold:0}).observe(stage);}else visible=true;
 if('ResizeObserver' in window)new ResizeObserver(size).observe(field);else window.addEventListener('resize',size,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',()=>stop());size();sync();
}})();
