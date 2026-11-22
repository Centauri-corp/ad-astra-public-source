'use strict';
/*
 * AD ASTRA / ORIGINAL FLAGSHIP PROOF ENGINE
 * Four distinct authored, reproducible, LOCAL interactive visual studies.
 * Canvas2D projection is used intentionally: this is NOT photoreal CGI,
 * actual satellite measurements, production AI or a paid product.
 */
(() => {
  const root=document.querySelector('[data-proof-cinema]');
  const canvas=root?.querySelector('[data-proof-canvas]');
  if(!root||!canvas)return;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx){root.dataset.proofFallback='true';return;}
  const buttons=[...root.querySelectorAll('[data-proof-select]')];
  const title=root.querySelector('[data-proof-title]');
  const description=root.querySelector('[data-proof-description]');
  const evidence=root.querySelector('[data-proof-evidence]');
  const number=root.querySelector('[data-proof-number]');
  const readout=root.querySelector('[data-proof-readout]');
  const phase=root.querySelector('[data-proof-phase]');
  const link=root.querySelector('[data-proof-link]');
  const advance=root.querySelector('[data-proof-advance]');
  const reset=root.querySelector('[data-proof-reset]');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData=Boolean(navigator.connection?.saveData);
  const chapters=Object.freeze({
    discovery:{
      number:'01 / DISCOVERY',name:'Beyond Physics',url:'/products/beyond-physics/',
      intro:'Compare three explanations of an illustrative orbital observation. Choose what evidence should change the conclusion.',
      evidence:'Conceptual inquiry. Orbital geometry and evidence markers are illustrative; no real telescope feed or AI inference.',
      steps:['Observation','Competing models','Evidence review'],
      readings:['OBSERVATION / ORBITAL SIGNAL','THREE MODELS / ONE QUESTION','EVIDENCE / HUMAN REVIEW'],
      palettes:['#a4e0ec','#efc88e','#d6a6ef']
    },
    learning:{
      number:'02 / LEARNING',name:'Astra Lumen',url:'/products/astra-lumen/',
      intro:'Explore how an orbit changes when the speed and shape of a satellite trajectory change.',
      evidence:'Normalized Kepler-style teaching model. No flight prediction, mission-planning authority, or measured ephemeris.',
      steps:['Circular motion','Elliptical motion','Compare speeds'],
      readings:['ORBIT / CIRCULAR','ORBIT / ELLIPTICAL','VELOCITY / COMPARISON'],
      palettes:['#9fece0','#e4d8a3','#e6c4e9']
    },
    visualize:{
      number:'03 / SPATIAL SYSTEMS',name:'Neural Visual Experience',url:'/products/neural-visual-experience/',
      intro:'Inspect a time-varying synthetic spatial field from three camera perspectives. The surface is calculated locally.',
      evidence:'Procedurally generated mathematical height field. Values are synthetic; this is not a measured planetary or neural dataset.',
      steps:['Perspective A','Perspective B','Time evolution'],
      readings:['SYNTHETIC / SURFACE FIELD','SYNTHETIC / CAMERA ORBIT','SYNTHETIC / TIME + DEPTH'],
      palettes:['#7ed7ed','#bea4ff','#e0d3ff']
    },
    govern:{
      number:'04 / AUTHORIZATION',name:'Governed AI Workflows',url:'/products/governed-workflows/',
      intro:'Follow a hypothetical request through permissions, a human review point, and an auditable outcome.',
      evidence:'Local storyboard only. No real identity validation, human approval, external task execution, or accepted audit receipt.',
      steps:['Scope request','Human review','Receipt model'],
      readings:['REQUEST / BOUNDED INTENT','REVIEW / HUMAN CONTROL','RECEIPT / ILLUSTRATIVE'],
      palettes:['#b4d6e3','#f0cf90','#a4dfd6']
    }
  });
  let mode='discovery',step=0,animated=false,visible=true,started=0,last=0,frame=0;
  let width=1000,height=590,dpr=1,angle=0,focus=0;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const keyColor=(n)=>chapters[mode].palettes[n%3];
  function line(x1,y1,x2,y2,color,opacity=1,lw=1){
    ctx.globalAlpha=opacity;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
    ctx.lineWidth=lw;ctx.strokeStyle=color;ctx.stroke();ctx.globalAlpha=1;
  }
  function text(x,y,value,size=13,color='#e3f3f7',weight='500',align='left'){
    ctx.font=weight+' '+size+'px Manrope, sans-serif';ctx.textAlign=align;
    ctx.fillStyle=color;ctx.fillText(value,x,y);ctx.textAlign='left';
  }
  function glow(x,y,r,color,opacity=1){
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,color);g.addColorStop(0.11,color);g.addColorStop(1,'rgba(0,12,22,0)');
    ctx.globalAlpha=opacity;ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);ctx.globalAlpha=1;
  }
  function sphere(x,y,r,color,emphasis=.5){
    glow(x,y,r*2.1,color,.16+emphasis*.13);
    const grad=ctx.createRadialGradient(x-r*.33,y-r*.45,r*.1,x+r*.18,y+r*.11,r*1.3);
    grad.addColorStop(0,'#a9dbef');grad.addColorStop(.21,color);
    grad.addColorStop(.6,'#15324c');grad.addColorStop(.9,'#020711');grad.addColorStop(1,'#010610');
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();
    ctx.strokeStyle='rgba(162,228,235,.42)';ctx.lineWidth=1.5;ctx.stroke();
    ctx.save();ctx.translate(x,y);ctx.rotate(-.22);ctx.scale(1,.35);
    ctx.beginPath();ctx.arc(0,0,r*1.32,0,2*Math.PI);ctx.strokeStyle='rgba(223,190,136,.23)';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  }
  function noise(n){const q=Math.sin(n*112.13+51.7)*43758.5453;return q-Math.floor(q);}
  const starfield=Array.from({length:155},(_,i)=>({x:noise(i+1),y:noise(i+271),r:noise(i+551)*1.4+.25,a:noise(i+871)*.52+.08}));
  function base(t){
    const grad=ctx.createLinearGradient(0,0,width,height);
    grad.addColorStop(0,'#03111f');grad.addColorStop(.48,'#091f30');grad.addColorStop(1,'#030915');
    ctx.fillStyle=grad;ctx.fillRect(0,0,width,height);
    const cx=width*.5,cy=height*.48;glow(cx,cy,height*.78,keyColor(0),.05);
    starfield.forEach((s,i)=>{
      const flicker=animated?(.8+.2*Math.sin(t*.75+i*.85)):1;
      ctx.fillStyle='#b6e6f5';ctx.globalAlpha=s.a*flicker;
      ctx.beginPath();ctx.arc(s.x*width,s.y*height,s.r,0,7);ctx.fill();
    });
    ctx.globalAlpha=1;
    for(let i=0;i<15;i++)line(0,height*(i/14),width,height*(i/14),'#4a8092',.075,1);
    text(28,height-21,'AD ASTRA / ORIGINAL LOCAL INTERACTION',10,'#b4c8d1','700');
    text(width-28,height-21,'ILLUSTRATIVE / NOT LIVE INFERENCE',10,'#aec7cf','700','right');
  }
  function orbit(cx,cy,rx,ry,rotation,color,opacity=1,widthLine=1){
    ctx.save();ctx.translate(cx,cy);ctx.rotate(rotation);ctx.scale(1,ry/rx);
    ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);
    ctx.strokeStyle=color;ctx.globalAlpha=opacity;ctx.lineWidth=widthLine;ctx.stroke();ctx.restore();ctx.globalAlpha=1;
  }
  function discovery(t){
    const cx=width*.48,cy=height*.47,scale=Math.min(width*.26,height*.34);
    sphere(cx,cy,scale*.7,'#76b8da',.5);
    for(let n=0;n<3;n++){
      const r=scale*(1.05+n*.31),ry=r*(.45+n*.1),rot=-.32+n*.48;
      orbit(cx,cy,r,ry,rot,keyColor(n),.36+n*.1,1.2);
      const theta=t*(.28+n*.06)+(n+1)*2.5+step*.2;
      const xx=cx+Math.cos(theta)*r*Math.cos(rot)-Math.sin(theta)*ry*Math.sin(rot);
      const yy=cy+Math.cos(theta)*r*Math.sin(rot)+Math.sin(theta)*ry*Math.cos(rot);
      glow(xx,yy,23,keyColor(n),.3);glow(xx,yy,5,keyColor(n),.9);
      ctx.fillStyle=keyColor(n);ctx.beginPath();ctx.arc(xx,yy,3.5,0,7);ctx.fill();
      line(xx,yy,xx+45,yy-32,keyColor(n),.5,1);
      if(width>750)text(xx+50,yy-37,'MODEL 0'+(n+1),10,keyColor(n),'700');
    }
    if(step===1)for(let k=0;k<8;k++){
      const a=k/8*6.283+t*.12;
      line(cx+Math.cos(a)*scale*.7,cy+Math.sin(a)*scale*.34,cx+Math.cos(a)*scale*1.65,cy+Math.sin(a)*scale*.8,'#8fb8e7',.18,1);
    }
    if(step===2){
      glow(cx+scale*.82,cy-scale*.65,60,'#f5c77e',.12);
      line(cx,cy,cx+scale*.82,cy-scale*.65,'#f2c783',.8,2);
      text(cx+scale*.82,cy-scale*.65-19,'EVIDENCE POINT',11,'#f2d08d','700','center');
    }
    text(31,59,chapters[mode].readings[step],12,'#eacb91','700');
    text(31,82,'Choose a model and identify its evidence boundary',11,'#a4c8d5');
  }
  function learning(t){
    const cx=width*.47,cy=height*.47,R=Math.min(height*.34,width*.26);
    sphere(cx,cy,R*.55,'#5babc5',.7);
    const ell=step===0?.94:.6,rad=R*(step===2?1.55:1.4);
    orbit(cx,cy,rad,rad*ell,-.32,'#dfd2a1',.58,1.7);
    const th=t*.52+step*.52+.2,x=cx+Math.cos(th)*rad*Math.cos(-.32)-Math.sin(th)*rad*ell*Math.sin(-.32);
    const y=cy+Math.cos(th)*rad*Math.sin(-.32)+Math.sin(th)*rad*ell*Math.cos(-.32);
    glow(x,y,30,'#e3d48e',.4);sphere(x,y,7,'#e8d5a1',.6);
    const tangentX=-Math.sin(th)*rad*Math.cos(-.32)-Math.cos(th)*rad*ell*Math.sin(-.32);
    const tangentY=-Math.sin(th)*rad*Math.sin(-.32)+Math.cos(th)*rad*ell*Math.cos(-.32);
    const mag=Math.hypot(tangentX,tangentY)||1,tx=x+tangentX/mag*65,ty=y+tangentY/mag*65;
    line(x,y,tx,ty,'#a0e6ce',.92,2);
    line(tx,ty,tx-tangentX/mag*10-tangentY/mag*5,ty-tangentY/mag*10+tangentX/mag*5,'#a0e6ce',.8,1.7);
    line(tx,ty,tx-tangentX/mag*10+tangentY/mag*5,ty-tangentY/mag*10-tangentX/mag*5,'#a0e6ce',.8,1.7);
    text(31,59,chapters[mode].readings[step],12,'#eacb91','700');
    text(31,82,'Gravity bends a moving object into a trajectory',11,'#a4c8d5');
    text(width-35,58,'v / NORMALIZED',11,'#a6d8d2','700','right');
    if(step===2)for(let i=0;i<3;i++)orbit(cx,cy,rad*(.8+i*.2),rad*(.8+i*.2)*ell,-.32,'#8bd7c0',.11,1);
  }
  function surface(t){
    const cx=width*.5,cy=height*.53;const N=24;
    const w=Math.min(width*.036,height*.055);
    const ry=step===0?.53:step===1?.78:.39;
    const yaw=step===1?.95:-.32;
    const amp=step===2?1.5:1;
    function h(x,y){return (Math.sin(x*.43+t*.5)*Math.cos(y*.49-t*.27)+Math.sin((x+y)*.21+t*.2)*.55)*amp;}
    function project(x,y,z){
      const px=x*Math.cos(yaw)-y*Math.sin(yaw),py=x*Math.sin(yaw)+y*Math.cos(yaw);
      return [cx+px*w,cy+py*w*ry-z*w*1.13];
    }
    for(let i=-N/2;i<=N/2;i++){
      ctx.beginPath();
      for(let j=-N/2;j<=N/2;j++){
        const q=project(i,j,h(i,j)),k=j+N/2;
        k?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);
      }
      ctx.strokeStyle=i%3===0?'rgba(166,195,251,.58)':'rgba(126,205,228,.32)';
      ctx.lineWidth=i%3===0?1.25:.8;ctx.stroke();
    }
    for(let j=-N/2;j<=N/2;j++){
      ctx.beginPath();
      for(let i=-N/2;i<=N/2;i++){
        const q=project(i,j,h(i,j)),k=i+N/2;
        k?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);
      }
      ctx.strokeStyle=j%3===0?'rgba(198,166,245,.51)':'rgba(136,204,242,.31)';
      ctx.lineWidth=j%3===0?1.25:.8;ctx.stroke();
    }
    glow(cx,cy,90,'#9278e9',.13);
    text(31,59,chapters[mode].readings[step],12,'#eacb91','700');
    text(31,82,'Locally calculated height field / no measured data',11,'#a4c8d5');
    for(const pos of [[-9,-7],[4,-2],[7,8]]){
      const q=project(pos[0],pos[1],h(...pos));
      glow(q[0],q[1],17,'#dfc0ff',.35);ctx.fillStyle='#d2c6ff';ctx.beginPath();ctx.arc(q[0],q[1],3,0,7);ctx.fill();
    }
  }
  function governance(t){
    const rows=[['INTENT','INPUT'],['SCOPE','POLICY'],['HUMAN','REVIEW'],['EVIDENCE','RECEIPT']];
    const s=Math.min((width-75)/(rows.length*1.18),height*.245),cy=height*.51;
    const ox=(width-(rows.length-1)*s*1.18-s*.94)/2;
    const progress=step===0?1:step===1?2:3;
    for(let i=0;i<4;i++){
      const x=ox+i*s*1.18,y=cy-s*.47;
      const active=i<=progress;
      const color=i===2?'#eccb91':i===3?'#9bdccf':'#b9d9e9';
      const g=ctx.createLinearGradient(x,y,x+s,y+s);g.addColorStop(0,active?'#204456':'#0b2030');g.addColorStop(1,'#061522');
      ctx.fillStyle=g;ctx.fillRect(x,y,s*.93,s*.95);
      ctx.strokeStyle=active?color:'#426477';ctx.lineWidth=active?1.7:1;ctx.strokeRect(x,y,s*.93,s*.95);
      if(active){glow(x+s*.45,y+s*.3,s*.61,color,.11)}
      text(x+12,y+30,String(i+1).padStart(2,'0'),14,color,'700');
      text(x+12,y+s*.59,rows[i][0],Math.max(10,Math.min(17,s*.14)),'#e0edf3','700');
      text(x+12,y+s*.77,rows[i][1],Math.max(9,Math.min(11,s*.10)),'#afcad5');
      if(i!==3){
        const ax=x+s*.95,bx=ax+s*.22,ay=cy;
        line(ax,ay,bx,ay,i<progress?'#f0d39a':'#627f90',.8,2);
        line(bx-8,ay-5,bx,ay,i<progress?'#f0d39a':'#627f90',.8,2);
        line(bx-8,ay+5,bx,ay,i<progress?'#f0d39a':'#627f90',.8,2);
      }
    }
    if(step>=1)text(width*.5,cy+s*.8,'HUMAN REVIEW IS REQUIRED / NOT PERFORMED HERE',11,'#efd397','700','center');
    if(step===2)text(width*.5,cy+s*1.02,'OUTPUT SHOWN IS A LOCAL EXAMPLE, NOT AN AUTHORIZED RECEIPT',10,'#b3d8dd','700','center');
    text(31,59,chapters[mode].readings[step],12,'#eacb91','700');
    text(31,82,'Permissions are only illustrated; production remains gated',11,'#a4c8d5');
  }
  function draw(now){
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const t=animated?(now-started)/1000+angle:angle;
    base(t);
    if(mode==='discovery')discovery(t);
    else if(mode==='learning')learning(t);
    else if(mode==='visualize')surface(t);
    else governance(t);
  }
  function updateText(){
    const item=chapters[mode];root.dataset.proofActive=mode;
    if(title)title.textContent=item.name;
    if(description)description.textContent=item.intro;
    if(evidence)evidence.textContent=item.evidence;
    if(number)number.textContent=item.number;
    if(readout)readout.textContent=item.readings[step];
    if(phase)phase.textContent=item.steps[step]+' / '+(step+1)+' OF 3';
    if(link){link.href=item.url;link.setAttribute('aria-label','Explore '+item.name+' product details');}
    buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.proofSelect===mode)));
  }
  function change(next){
    if(!Object.hasOwn(chapters,next))return;
    mode=next;step=0;angle=0;updateText();draw(performance.now());
  }
  function forward(){step=(step+1)%3;angle+=.25;updateText();draw(performance.now());}
  function restart(){step=0;angle=0;updateText();draw(performance.now());}
  function resize(){
    const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;
    width=r.width;height=r.height;dpr=Math.min(window.devicePixelRatio||1,saveData?1:1.5);
    canvas.width=Math.max(1,Math.round(width*dpr));
    canvas.height=Math.max(1,Math.round(height*dpr));
    draw(performance.now());
  }
  function frameLoop(now){
    frame=0;
    if(!animated||!visible||document.hidden||reduced.matches||saveData)return;
    if(now-last>=33){draw(now);last=now;}
    frame=requestAnimationFrame(frameLoop);
  }
  function setMotion(on){
    animated=Boolean(on)&&!reduced.matches&&!saveData;
    if(animated)started=performance.now();
    if(frame)cancelAnimationFrame(frame);
    frame=0;
    if(animated&&visible&&!document.hidden)frame=requestAnimationFrame(frameLoop);
    draw(performance.now());
  }
  buttons.forEach(btn=>btn.addEventListener('click',()=>change(btn.dataset.proofSelect)));
  advance?.addEventListener('click',forward);reset?.addEventListener('click',restart);
  canvas.setAttribute('tabindex','0');
  canvas.addEventListener('keydown',ev=>{
    if(!['ArrowLeft','ArrowRight'].includes(ev.key))return;
    ev.preventDefault();ev.key==='ArrowRight'?forward():(step=(step+2)%3,updateText(),draw(performance.now()));
  });
  const onVisibility=()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;}else setMotion(animated);};
  document.addEventListener('visibilitychange',onVisibility);
  if('IntersectionObserver' in window){
    new IntersectionObserver(([entry])=>{
      visible=Boolean(entry?.isIntersecting);
      if(frame)cancelAnimationFrame(frame);frame=0;
      if(visible&&animated&&!document.hidden)frame=requestAnimationFrame(frameLoop);
    },{threshold:.05}).observe(root);
  }
  if('ResizeObserver' in window)new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize',resize,{passive:true});
  reduced.addEventListener?.('change',()=>setMotion(false));
  window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame)},{once:true});
  change('discovery');resize();
  if(!reduced.matches&&!saveData)setMotion(true);
  else if(phase)phase.textContent=chapters[mode].steps[step]+' / MOTION REDUCED';
})();