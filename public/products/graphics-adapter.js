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
  precision mediump float;
  uniform vec2 resolution;
  uniform float time;
  uniform float motif;
  out vec4 pixel;
  float hash(float n){return fract(sin(n*137.13)*43758.5453);}
  void main(){
    vec2 uv=(gl_FragCoord.xy-.5*resolution)/max(resolution.y,1.0);
    float angle=time*.11;
    vec2 p=vec2(uv.x*cos(angle)-uv.y*sin(angle),uv.x*sin(angle)+uv.y*cos(angle));
    float r=length(p);
    float ring=exp(-pow((length(vec2(p.x*.76,p.y*1.55))-.35)*18.0,2.0));
    float core=exp(-r*r*48.0);
    float wave=.5+.5*sin(22.0*r-time*.7+motif*1.8);
    float signals=0.0;
    for(int i=0;i<28;i++){
      float f=float(i);
      float theta=f*2.39996+time*(.08+motif*.008);
      float radius=.22+.25*hash(f+motif*4.0);
      vec2 point=vec2(cos(theta)*radius,sin(theta)*radius*.67);
      float d=length(uv-point);
      signals+=.0024/(d*d+.0014);
    }
    vec3 cyan=vec3(.22,.69,.83);
    vec3 gold=vec3(.91,.70,.42);
    vec3 violet=vec3(.49,.39,.89);
    vec3 tint=mix(cyan,gold,clamp(motif*.22,0.0,.85));
    tint=mix(tint,violet,.3*wave);
    vec3 color=tint*(ring*.22+core*.75+signals*.07);
    color+=vec3(.025,.045,.095)*exp(-r*r*2.0);
    pixel=vec4(min(color,vec3(.72)),min(.80,max(.0,ring*.33+core*.55+signals*.09)));
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
