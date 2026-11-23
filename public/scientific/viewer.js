/* Static-first scientific 3D surface viewer, intentionally separate from decorative GPU effects.
 * Geometry is actual projected sampled data; no claims of measured observations.
 */
(() => {
  "use strict";
  const model=window.AdAstraScientific;
  const canvas=document.getElementById("scientific-surface");
  const caption=document.getElementById("scientific-surface-caption");
  const time=document.getElementById("scientific-time");
  const timeValue=document.getElementById("scientific-time-value");
  const rotateLeft=document.getElementById("scientific-left");
  const rotateRight=document.getElementById("scientific-right");
  const toggle=document.getElementById("scientific-animation");
  if(!model||!canvas||!caption||!time||!timeValue||!rotateLeft||!rotateRight||!toggle)return;
  const ctx=canvas.getContext("2d");
  if(!ctx){caption.textContent="3D visualization unavailable. Synthetic dataset description remains available.";return;}
  const motion=window.matchMedia("(prefers-reduced-motion: reduce)");
  const saveData=!!navigator.connection?.saveData;
  let yaw=.58,step=0,playing=false,raf=0,lastTime=0;
  let width=0,height=0,dpr=1;
  function resize(){
    const bounds=canvas.getBoundingClientRect();
    width=Math.max(200,Math.round(bounds.width));
    height=Math.max(180,Math.round(bounds.height));
    dpr=Math.min(window.devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    draw();
  }
  function label(frame){
    timeValue.textContent=String(frame.time);
    caption.textContent="Synthetic 3D surface at time step "+frame.time+
      "; height range "+frame.min.toFixed(3)+" to "+frame.max.toFixed(3)+
      " "+model.UNIT+". Illustrative geometry, not measured Earth data.";
  }
  function draw(){
    const frame=model.buildFrame(step,22);
    label(frame);
    ctx.clearRect(0,0,width,height);
    const gradient=ctx.createLinearGradient(0,0,0,height);
    gradient.addColorStop(0,"#061726");gradient.addColorStop(1,"#0e2a3a");
    ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
    const scale=Math.min(width*.30,height*.52);
    const centerX=width*.51,centerY=height*.57;
    const points=frame.points.map(p=>{
      const projected=model.project(p,yaw,.54);
      return {x:centerX+projected.x*scale,y:centerY-projected.y*scale,depth:projected.depth,height:p.y};
    });
    const idx=(row,col)=>row*(frame.resolution+1)+col;
    const facets=[];
    for(let r=0;r<frame.resolution;r++)for(let c=0;c<frame.resolution;c++){
      const p=[points[idx(r,c)],points[idx(r,c+1)],points[idx(r+1,c+1)],points[idx(r+1,c)]];
      facets.push({p,depth:p.reduce((a,v)=>a+v.depth,0)/4,height:p.reduce((a,v)=>a+v.height,0)/4});
    }
    facets.sort((a,b)=>b.depth-a.depth);
    for(const facet of facets){
      const shade=Math.min(1,Math.max(0,.5+facet.height*.9));
      const red=Math.round(24+shade*80),green=Math.round(95+shade*95),blue=Math.round(139+shade*72);
      ctx.fillStyle="rgba("+red+","+green+","+blue+",0.84)";
      ctx.strokeStyle="rgba(172,224,244,.24)";
      ctx.lineWidth=.5;
      ctx.beginPath();ctx.moveTo(facet.p[0].x,facet.p[0].y);
      for(let j=1;j<4;j++)ctx.lineTo(facet.p[j].x,facet.p[j].y);
      ctx.closePath();ctx.fill();ctx.stroke();
    }
    ctx.fillStyle="#d8c197";ctx.font="12px system-ui,sans-serif";
    ctx.fillText("SYNTHETIC / NOT MEASURED",14,22);
    ctx.fillStyle="#aecad7";ctx.font="11px system-ui,sans-serif";
    ctx.fillText("Time "+step+" / 8  ·  3D spatial surface",14,height-16);
  }
  function stop(){
    playing=false;if(raf)cancelAnimationFrame(raf);raf=0;
    toggle.setAttribute("aria-pressed","false");
    toggle.textContent="Play time evolution";
  }
  function animate(now){
    if(!playing)return;
    if(document.hidden||motion.matches||saveData){stop();return;}
    if(now-lastTime>=800){
      lastTime=now;step=(step+1)%model.STEPS.length;
      time.value=String(step);draw();
      if(step===0){stop();return;}
    }
    raf=requestAnimationFrame(animate);
  }
  time.addEventListener("input",()=>{stop();step=Number(time.value);draw();});
  rotateLeft.addEventListener("click",()=>{yaw=Math.max(-3.1,yaw-.25);draw();});
  rotateRight.addEventListener("click",()=>{yaw=Math.min(3.1,yaw+.25);draw();});
  toggle.addEventListener("click",()=>{
    if(playing){stop();return;}
    if(motion.matches||saveData){caption.textContent="Animation disabled by reduced-motion or data-saver preference. Manual time controls remain available.";return;}
    playing=true;lastTime=performance.now();
    toggle.setAttribute("aria-pressed","true");toggle.textContent="Pause time evolution";
    raf=requestAnimationFrame(animate);
  });
  window.addEventListener("resize",resize,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)stop();});
  motion.addEventListener?.("change",()=>{if(motion.matches)stop();});
  window.addEventListener("pagehide",stop,{once:true});
  resize();
})();
