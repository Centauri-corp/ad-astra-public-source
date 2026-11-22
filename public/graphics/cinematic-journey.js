'use strict';
(() => {
  const host = document.querySelector('[data-cinematic-host]');
  const canvas = host?.querySelector('[data-cinematic-journey]');
  if (!host || !canvas) return;

  const status = host.querySelector('[data-cinematic-status]');
  const buttons = [...host.querySelectorAll('[data-cinematic-layer]')];
  const resetButton = host.querySelector('[data-cinematic-reset]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = !!navigator.connection?.saveData;
  const labels = [
    'ARRIVAL / EARTH + ORBIT + HUMAN INTENT',
    'SCIENCE / SPATIAL DATA LAYER',
    'SOLUTIONS / SIGNAL TO SYSTEM'
  ];
  const scenes = [
    { label: 'ARRIVAL', accent: 0.18 },
    { label: 'SCIENCE', accent: 0.57 },
    { label: 'SOLUTIONS', accent: 0.86 }
  ];

  const VERTEX_SOURCE = [
    '#version 300 es',
    'in vec2 position;',
    'void main(){gl_Position=vec4(position,0.0,1.0);}'
  ].join('\n');

  const FRAGMENT_SOURCE = [
    '#version 300 es',
    'precision highp float;',
    'uniform vec2 resolution;',
    'uniform float time;',
    'uniform float yaw;',
    'uniform float pitch;',
    'uniform float zoom;',
    'uniform float scene;',
    'uniform float energy;',
    'out vec4 pixel;',
    'const float PI=3.14159265359;',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',
    'float noise(vec2 p){',
    '  vec2 i=floor(p),f=fract(p);',
    '  f=f*f*(3.0-2.0*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);',
    '}',
    'vec3 rotY(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(c*v.x+s*v.z,v.y,-s*v.x+c*v.z);}',
    'vec3 rotX(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(v.x,c*v.y-s*v.z,s*v.y+c*v.z);}',
    'float sphereHit(vec3 ro,vec3 rd,float radius){',
    '  float b=dot(ro,rd),c=dot(ro,ro)-radius*radius,h=b*b-c;',
    '  return h<0.0?-1.0:-b-sqrt(h);',
    '}',
    'float lineGrid(float value,float count,float width){',
    '  float d=abs(fract(value*count+0.5)-0.5);',
    '  return 1.0-smoothstep(0.0,width,d);',
    '}',
    'void main(){',
    '  float aspect=resolution.x/max(resolution.y,1.0);',
    '  vec2 uv=(gl_FragCoord.xy*2.0-resolution)/max(resolution.y,1.0);',
    '  vec3 ro=vec3(0.0,0.0,3.25/zoom);',
    '  vec3 rd=normalize(vec3(uv.x,uv.y,-1.9));',
    '  ro=rotX(rotY(ro,yaw),pitch);',
    '  rd=rotX(rotY(rd,yaw),pitch);',
    '  vec3 cyan=vec3(0.20,0.78,0.94);',
    '  vec3 gold=vec3(0.92,0.70,0.38);',
    '  vec3 violet=vec3(0.52,0.40,0.94);',
    '  vec3 bg=vec3(0.012,0.028,0.055);',
    '  float vignette=1.0-smoothstep(0.32,1.35,length(uv*vec2(0.72,0.9)));',
    '  bg+=vec3(0.015,0.08,0.12)*vignette;',
    '  for(int i=0;i<56;i++){',
    '    float fi=float(i);',
    '    vec2 p=vec2(hash(vec2(fi,3.0)),hash(vec2(fi,7.0)))-0.5;',
    '    p.x*=aspect;',
    '    float pulse=0.45+0.55*sin(time*(0.6+hash(vec2(fi,12.0))*1.8)+fi);',
    '    float star=smoothstep(0.012+0.01*(1.0-pulse),0.0,length(uv-p*vec2(1.6,1.0)));',
    '    bg+=mix(cyan,gold,hash(vec2(fi,20.0)))*star*0.45;',
    '  }',
    '  float hit=sphereHit(ro,rd,0.82);',
    '  vec3 color=bg;',
    '  float alpha=0.98;',
    '  if(hit>0.0){',
    '    vec3 p=ro+rd*hit;',
    '    vec3 n=normalize(p);',
    '    float lon=atan(n.z,n.x)/PI*0.5+0.5;',
    '    float lat=asin(clamp(n.y,-1.0,1.0))/PI+0.5;',
    '    float terrain=noise(vec2(lon*4.2+scene*0.6,lat*6.0+sin(time*0.12)*0.2));',
    '    float ridges=noise(vec2(lon*18.0-time*0.025,lat*14.0+scene));',
    '    float land=smoothstep(0.55,0.75,terrain+0.12*ridges);',
    '    float meridian=lineGrid(lon,18.0,0.018);',
    '    float parallel=lineGrid(lat,10.0,0.018);',
    '    float grid=max(meridian,parallel);',
    '    vec3 light=normalize(vec3(-0.48,0.56,1.0));',
    '    float diffuse=max(dot(n,light),0.0);',
    '    float rim=pow(1.0-max(dot(n,normalize(vec3(0.0,0.0,1.0))),0.0),2.7);',
    '    vec3 ocean=mix(vec3(0.015,0.09,0.17),vec3(0.03,0.25,0.38),diffuse);',
    '    vec3 ground=mix(vec3(0.12,0.19,0.22),mix(cyan,gold,scene*0.42),0.32+diffuse*0.5);',
    '    vec3 surface=mix(ocean,ground,land);',
  '    float scienceMask=1.0-step(0.5,abs(scene-1.0));',
  '    float solutionsMask=step(1.5,scene);',
  '    float lattice=max(lineGrid(lon+lat*0.25,26.0,0.034),lineGrid(lat-lon*0.18,16.0,0.038));',
  '    vec3 scientificSurface=vec3(0.024,0.036,0.16)+violet*(0.16+0.64*lattice)+cyan*grid*0.28;',
  '    vec3 industrialSurface=vec3(0.16,0.082,0.024)+gold*(0.15+0.60*grid)+cyan*meridian*0.15;',
  '    surface=mix(surface,scientificSurface,scienceMask*0.88);',
  '    surface=mix(surface,industrialSurface,solutionsMask*0.86);',
    '    float contour=smoothstep(0.67,0.73,abs(fract((terrain+time*0.018)*7.0)-0.5));',
    '    surface+=cyan*grid*0.24+gold*contour*0.12;',
    '    color=surface+mix(cyan,mix(violet,gold,solutionsMask),clamp(scene,0.0,1.0))*rim*0.48;',
    '    float nodes=0.0;',
    '    for(int i=0;i<14;i++){',
    '      float fi=float(i);',
    '      float a=fi*2.39996+time*(0.08+scene*0.035);',
    '      float la=-0.36+hash(vec2(fi,scene+4.0))*0.72;',
    '      vec3 q=normalize(vec3(cos(a)*cos(la),sin(la),sin(a)*cos(la)));',
    '      nodes+=0.0012/(dot(n-q,n-q)+0.0012);',
    '    }',
    '    color+=mix(cyan,gold,scene)*nodes*0.012;',
    '  }',
    '  float ringRadius=0.98+0.08*sin(yaw+scene);',
    '  float ringDistance=abs(length(vec2(uv.x*0.72,uv.y*1.55))-ringRadius);',
    '  float ring=exp(-ringDistance*ringDistance*160.0);',
    '  float ring2=exp(-pow(abs(length(vec2(uv.x*1.12,uv.y*0.48))-(0.9+scene*0.04)),2.0)*110.0);',
    '  float signal=(0.5+0.5*sin(time*1.4+atan(uv.y,uv.x)*5.0+scene*2.0))*ring*0.35;',
    '  color+=gold*ring*0.30+violet*ring2*0.18+cyan*signal*(0.5+energy);',
    '  float edge=smoothstep(1.15,0.25,length(uv));',
    '  color*=0.74+edge*0.26;',
    '  pixel=vec4(min(color,vec3(0.98)),alpha);',
    '}'
  ].join('\n');

  let gl=null,program=null,buffer=null,uniforms=null,frame=0;
  let scene=0,yaw=-0.16,pitch=0.06,zoom=1.0,energy=0.4,visible=true;
  let dragging=false,lastX=0,lastY=0;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const sceneFromName=(name)=>{
    const value=String(name||'').toLowerCase();
    if(/science|product|horizon|approach|experience|knowledge/.test(value))return 1;
    if(/life|workspace|company|signature|solution/.test(value))return 2;
    return 0;
  };
  const setStatus=(message)=>{
    if(status)status.textContent=message;
  };
  const updateScene=(next,source='control')=>{
    const index=Number(next);
    if(!Number.isInteger(index)||index<0||index>2)return false;
    scene=index;
    host.dataset.cinematicScene=String(scene);
    host.dataset.cinematicLabel=scenes[scene].label;
    host.dispatchEvent(new CustomEvent('ad-astra:scene-change',{detail:{index:scene,source}}));
    buttons.forEach(button=>{
      const active=Number(button.dataset.cinematicLayer)===scene;
      button.setAttribute('aria-pressed',String(active));
    });
    const still=!gl||reduced.matches||saveData||host.classList.contains('cinematic-fallback');
    setStatus(still
      ? labels[scene]+' · static preview · choose a scene'
      : source==='scroll'
        ? labels[scene]+' · scroll-linked scene'
        : labels[scene]+' · drag or use arrow keys to orbit · Shift-scroll to zoom');
    draw(performance.now());
    return true;
  };
  const resetView=()=>{
    yaw=-0.16;pitch=0.06;zoom=1.0;energy=0.4;
    updateScene(scene,'reset');
  };
  canvas.addEventListener('keydown',event=>{
    const key=event.key;
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(key))return;
    event.preventDefault();
    if(key==='Home'){resetView();return;}
    if(!gl){
      if(key==='ArrowLeft'||key==='ArrowRight')updateScene((scene+(key==='ArrowRight'?1:2))%3,'keyboard');
      else setStatus(labels[scene]+' · still preview · select a scene or activate WebGL2');
      return;
    }
    if(key==='ArrowLeft')yaw-=0.12;
    if(key==='ArrowRight')yaw+=0.12;
    if(key==='ArrowUp')pitch=clamp(pitch-0.1,-0.72,0.72);
    if(key==='ArrowDown')pitch=clamp(pitch+0.1,-0.72,0.72);
    if(key==='+'||key==='=')zoom=clamp(zoom+0.08,0.72,1.42);
    if(key==='-')zoom=clamp(zoom-0.08,0.72,1.42);
    draw(performance.now());
  });
  const compile=(type,source)=>{
    const shader=gl.createShader(type);
    if(!shader)throw Error('shader unavailable');
    gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
      gl.deleteShader(shader);throw Error('shader compile failed');
    }
    return shader;
  };
  const resize=()=>{
    if(!gl)return;
    const rect=host.getBoundingClientRect();
    const dpr=Math.min(window.devicePixelRatio||1,1.5);
    canvas.width=Math.max(1,Math.min(2200,Math.floor(rect.width*dpr)));
    canvas.height=Math.max(1,Math.min(1400,Math.floor(rect.height*dpr)));
    gl.viewport(0,0,canvas.width,canvas.height);
    draw(performance.now());
  };
  const draw=(now)=>{
    if(!gl||!program)return;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);
    gl.uniform1f(uniforms.time,now*0.001);
    gl.uniform1f(uniforms.yaw,yaw);
    gl.uniform1f(uniforms.pitch,pitch);
    gl.uniform1f(uniforms.zoom,zoom);
    gl.uniform1f(uniforms.scene,scene);
    gl.uniform1f(uniforms.energy,energy);
    gl.drawArrays(gl.TRIANGLES,0,3);
  };
  const render=(now)=>{
    if(!frame)return;
    if(!document.hidden&&visible&&!document.body.classList.contains('paused')&&!reduced.matches&&!saveData)draw(now);
    frame=requestAnimationFrame(render);
  };
  const start=()=>{
    try{
      gl=canvas.getContext('webgl2',{alpha:true,antialias:false,depth:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
      if(!gl)throw Error('WebGL2 unavailable');
      const vs=compile(gl.VERTEX_SHADER,VERTEX_SOURCE);
      const fs=compile(gl.FRAGMENT_SHADER,FRAGMENT_SOURCE);
      program=gl.createProgram();
      if(!program)throw Error('program unavailable');
      gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      gl.deleteShader(vs);gl.deleteShader(fs);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('program link failed');
      buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'position');
      gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      uniforms={
        resolution:gl.getUniformLocation(program,'resolution'),
        time:gl.getUniformLocation(program,'time'),
        yaw:gl.getUniformLocation(program,'yaw'),
        pitch:gl.getUniformLocation(program,'pitch'),
        zoom:gl.getUniformLocation(program,'zoom'),
        scene:gl.getUniformLocation(program,'scene'),
        energy:gl.getUniformLocation(program,'energy')
      };
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      canvas.addEventListener('webglcontextlost',event=>{
        event.preventDefault();host.classList.add('cinematic-fallback');setStatus('Spatial graphics paused. Static fallback remains available.');
      },{once:true});
      canvas.addEventListener('pointerdown',event=>{
        dragging=true;lastX=event.clientX;lastY=event.clientY;canvas.setPointerCapture?.(event.pointerId);canvas.classList.add('is-dragging');
      });
      canvas.addEventListener('pointermove',event=>{
        const rect=canvas.getBoundingClientRect();
        energy=clamp((event.clientX-rect.left)/Math.max(rect.width,1),0.15,1.0);
        if(!dragging)return;
        yaw+=((event.clientX-lastX)/Math.max(rect.width,1))*2.6;
        pitch=clamp(pitch+((event.clientY-lastY)/Math.max(rect.height,1))*2.0,-0.72,0.72);
        lastX=event.clientX;lastY=event.clientY;draw(performance.now());
      });
      const endDrag=event=>{dragging=false;canvas.releasePointerCapture?.(event.pointerId);canvas.classList.remove('is-dragging');};
      canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
      canvas.addEventListener('wheel',event=>{
        if (!event.shiftKey) return;
        event.preventDefault();zoom=clamp(zoom-event.deltaY*0.0008,0.72,1.42);draw(performance.now());
      },{passive:false});
      
      if('ResizeObserver' in window)new ResizeObserver(resize).observe(host);else window.addEventListener('resize',resize,{passive:true});
      if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(host);
      const sections=[...document.querySelectorAll('[data-scene]')];
      if('IntersectionObserver' in window&&sections.length){
        const observer=new IntersectionObserver(entries=>{
          const current=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
          if(current)updateScene(current.target.dataset.cinematicScene||sceneFromName(current.target.dataset.scene),'scroll');
        },{threshold:[0.28,0.55,0.8]});
        sections.forEach(section=>observer.observe(section));
      }
      window.addEventListener('resize',resize,{passive:true});
      reduced.addEventListener?.('change',()=>{if(reduced.matches)draw(0);});
      host.classList.add('cinematic-ready');
      updateScene(host.dataset.cinematicScene||0,'control');
      resize();
      if(!reduced.matches&&!saveData){frame=requestAnimationFrame(render);}else setStatus(labels[scene]+' · static fallback for this device preference');
    }catch(error){
      host.classList.add('cinematic-fallback');
      setStatus('WebGL2 is unavailable. Static cinematic fallback remains available.');
    }
  };
  // Scene selection remains functional with static art, reduced motion or no WebGL2.
  updateScene(host.dataset.cinematicScene||'0','static');
  host.addEventListener('ad-astra:request-scene',event=>{
    const index=event?.detail?.index;
    if(Number.isInteger(index)&&index>=0&&index<=2)updateScene(index,'product');
  });
  for (const button of buttons) {
    button.addEventListener('click',()=>{
      const index=Number(button.dataset.cinematicLayer);
      if(!reduced.matches&&!saveData&&!gl&&!host.classList.contains('cinematic-fallback'))start();
      updateScene(index,'control');
    });
  }
  resetButton?.addEventListener('click',resetView);
})();
