/* AD ASTRA: opt-in, bounded WebGL2 graphics adapter for the public Universal Stage.
 * Illustrative origin field only; no AI inference, telemetry, network, customer data or privileged actions.
 */
(() => {
  "use strict";
  const stage = document.querySelector(".stage-orbit");
  const button = document.getElementById("stage-graphics-toggle");
  const status = document.getElementById("stage-graphics-status");
  if (!stage || !button || !status) return;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const saveData = !!navigator.connection?.saveData;
  let gl = null, program = null, buffer = null, canvas = null, frame = 0, observer = null;
  let started = false, visible = true, stopAt = 0, previousFrame = 0;
  let uniforms = null;
  const MAX_DURATION_MS = 12000;
  const vertexSource = `#version 300 es
  in vec2 position;
  void main(){gl_Position=vec4(position,0.0,1.0);}
  `;
  const fragmentSource = `#version 300 es
  precision highp float;
  uniform vec2 resolution;
  uniform float time;
  uniform float motif;
  out vec4 pixel;
  const float PI = 3.14159265;
  float hash(float n){return fract(sin(n*137.13)*43758.5453);}
  float gridline(float angle,float count){
    float phase=abs(fract(angle*count)-.5);
    return 1.0-smoothstep(.474,.499,phase);
  }
  void main(){
    vec2 uv=(gl_FragCoord.xy-.5*resolution)/max(resolution.y,1.0);
    float sphereRadius=.31;
    float rr=dot(uv,uv);
    float inside=1.0-smoothstep(sphereRadius-.004,sphereRadius+.004,sqrt(rr));
    float z=sqrt(max(0.0,sphereRadius*sphereRadius-rr))/sphereRadius;
    vec3 normal=normalize(vec3(uv/sphereRadius,z));
    float spin=time*.19;
    vec3 rotated=vec3(normal.x*cos(spin)-normal.z*sin(spin),
                       normal.y,
                       normal.x*sin(spin)+normal.z*cos(spin));
    float longitude=atan(rotated.z,rotated.x)/(2.0*PI)+.5;
    float latitude=asin(clamp(rotated.y,-1.0,1.0))/PI+.5;
    float meridian=gridline(longitude,18.0);
    float parallel=gridline(latitude,10.0);
    float grid=max(meridian,parallel)*.24;
    vec3 lightDirection=normalize(vec3(-.5,.65,1.0));
    float lambert=max(.0,dot(normal,lightDirection));
    float rim=pow(1.0-max(.0,normal.z),3.0);
    vec3 cyan=vec3(.16,.70,.91);
    vec3 gold=vec3(.92,.72,.42);
    vec3 violet=vec3(.49,.40,.88);
    float sceneType=floor(motif*.92+.01);
    vec3 tint=mix(cyan,gold,clamp(sceneType/7.0,0.0,.7));
    tint=mix(tint,violet,.18+.10*sin(motif*2.2));
    float proceduralTerrain=.5+.5*sin(longitude*28.0+sin(latitude*32.0)*3.0)
                              *sin(latitude*40.0+cos(longitude*19.0)*4.0);
    float surface=.12+.46*lambert+.16*proceduralTerrain;
    vec3 globe=(tint*surface+vec3(.83,.89,.98)*grid+cyan*rim*.5)*inside;
    float atmosphere=exp(-pow((sqrt(rr)-sphereRadius)*25.0,2.0))*.25;
    float orbitDistance=length(vec2(uv.x*.73,uv.y*1.58));
    float orbit=exp(-pow((orbitDistance-.43)*30.0,2.0))*.17;
    float signals=0.0;
    for(int i=0;i<20;i++){
      float fi=float(i);
      float angle=fi*2.39996+time*.075;
      float distance=.36+.16*hash(fi+motif*4.0);
      vec2 point=vec2(cos(angle)*distance,sin(angle)*distance*.64);
      signals+=.0015/(dot(uv-point,uv-point)+.0015);
    }
    vec3 color=globe+cyan*atmosphere+gold*orbit+violet*signals*.035;
    float alpha=clamp(inside*.83+atmosphere+orbit*.5+signals*.025,0.0,.93);
    pixel=vec4(min(color,vec3(.95)),alpha);
  }
  `;
  function compile(type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw Error("shader unavailable");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); throw Error("shader compile failed"); }
    return shader;
  }
  function release() {
    if (frame) cancelAnimationFrame(frame);
    frame=0; started=false;
    if (gl) {
      try {
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
      } catch (_) { /* context may already be lost */ }
    }
    buffer=null;program=null;uniforms=null;gl=null;
    canvas?.remove();canvas=null;
    button.setAttribute("aria-pressed","false");
    button.textContent="Play optional graphics";
  }
  function stop(message="Graphics paused. Static visual available.") {
    release();
    status.textContent=message;
  }
  function resize() {
    if (!canvas || !gl) return;
    const rect=stage.getBoundingClientRect();
    const dpr=Math.min(window.devicePixelRatio||1,1.5);
    canvas.width=Math.max(1,Math.min(1800,Math.floor(rect.width*dpr)));
    canvas.height=Math.max(1,Math.min(1100,Math.floor(rect.height*dpr)));
    gl.viewport(0,0,canvas.width,canvas.height);
  }
  function draw(now) {
    if (!started || document.hidden || !visible || motion.matches || now>=stopAt) {
      stop("Motion ended. Static graphics remain available.");return;
    }
    if (now-previousFrame>=33) {
      previousFrame=now;
      gl.useProgram(program);
      gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);
      gl.uniform1f(uniforms.time,now*.001);
      const direction=stage.dataset.motif||"";
      const motif=["orbital-knowledge-field","luminous-neural-core","responsive-signal-lattice","approval-control-plane"].indexOf(direction);
      const systemIndex=Number(stage.dataset.graphicsSystem);
      const canonicalSystem=Number.isSafeInteger(systemIndex)&&systemIndex>=0&&systemIndex<7?systemIndex:0;
      gl.uniform1f(uniforms.motif,Math.max(0,motif)+canonicalSystem*.31);
      gl.drawArrays(gl.TRIANGLES,0,3);
    }
    frame=requestAnimationFrame(draw);
  }
  function start() {
    if (started) {stop();return;}
    if (motion.matches || saveData) {status.textContent="Reduced-motion or data-saver preference: static graphics.";return;}
    try {
      canvas=document.createElement("canvas");
      canvas.className="universal-stage-webgl";
      canvas.setAttribute("aria-hidden","true");
      canvas.tabIndex=-1;
      stage.prepend(canvas);
      gl=canvas.getContext("webgl2",{alpha:true,antialias:false,depth:false,preserveDrawingBuffer:false,powerPreference:"low-power"});
      if (!gl) {stop("WebGL2 unavailable. Static graphics remain available.");return;}
      const vs=compile(gl.VERTEX_SHADER,vertexSource),fs=compile(gl.FRAGMENT_SHADER,fragmentSource);
      program=gl.createProgram();
      if (!program) throw Error("program unavailable");
      gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      gl.deleteShader(vs);gl.deleteShader(fs);
      if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error("program link failed");
      buffer=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      const pos=gl.getAttribLocation(program,"position");
      gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
      uniforms={resolution:gl.getUniformLocation(program,"resolution"),time:gl.getUniformLocation(program,"time"),motif:gl.getUniformLocation(program,"motif")};
      canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();stop("Graphics context lost. Static visual restored.");},{once:true});
      resize();
      started=true;stopAt=performance.now()+MAX_DURATION_MS;previousFrame=0;
      button.setAttribute("aria-pressed","true");button.textContent="Pause optional graphics";
      status.textContent="Illustrative graphics active for up to twelve seconds. No live intelligence data.";
      frame=requestAnimationFrame(draw);
    } catch (_) {stop("Graphics unavailable. Static visual restored.");}
  }
  button.addEventListener("click",start);
  window.addEventListener("resize",()=>{if(started)resize();},{passive:true});
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&started)stop();});
  motion.addEventListener?.("change",()=>{if(motion.matches&&started)stop();});
  if ("IntersectionObserver" in window) {
    observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);if(!visible&&started)stop();});
    observer.observe(stage);
  }
  window.addEventListener("pagehide",()=>{stop();observer?.disconnect();},{once:true});
})();
