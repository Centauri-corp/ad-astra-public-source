// Optional decorative WebGPU particle pass. Never a representation of model reasoning.
// Built on device only after the visitor explicitly enables 3D and never on the server.
const SHADER=`
struct Params { time:f32, width:f32, height:f32, motion:f32, red:f32, green:f32, blue:f32, reserved:f32 };
@group(0) @binding(0) var<uniform> params:Params;
fn hash(t:f32)->f32{return fract(sin(t*127.17+78.23)*43758.5453);}
struct VOut{@builtin(position) position:vec4f,@location(0) uv:vec2f,@location(1) brightness:f32};
@vertex fn vs(@builtin(vertex_index) index:u32,@builtin(instance_index) instance:u32)->VOut{
 let corners=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(1.,1.),vec2f(-1.,-1.),vec2f(1.,1.),vec2f(-1.,1.));
 let seed=f32(instance);let radius=.19+pow(hash(seed+11.),.8)*.75;
 let angle=seed*2.399963+params.time*(.05+hash(seed+7.)*.07)*params.motion;
 let loc=vec2f(cos(angle)*radius,sin(angle*1.21)*radius*.78);
 let size=(1.3+hash(seed+91.)*3.0)/vec2f(params.width,params.height)*2.;
 var out:VOut;out.position=vec4f(loc+corners[index%6u]*size,0.,1.);
 out.uv=corners[index%6u];out.brightness=(.16+hash(seed+9.)*.62)*(1.-smoothstep(.72,1.,radius));return out;
}
@fragment fn fs(in:VOut)->@location(0) vec4f{
 let glow=(1.-smoothstep(.05,1.,length(in.uv)))*in.brightness;
 return vec4f(vec3f(params.red,params.green,params.blue)*glow,glow*.75);
}`;
const MAX=1600;
export async function createGPUField(host,{count=900}={}){
 if(!globalThis.navigator?.gpu||typeof GPUBufferUsage==='undefined')return null;
 const adapter=await navigator.gpu.requestAdapter({powerPreference:'low-power'});if(!adapter)return null;
 const device=await adapter.requestDevice();
 let canvas=null,ctx=null,buffer=null,observer=null,disposed=false,lost=false;
 try{
  canvas=document.createElement('canvas');canvas.className='gpu-neural-field';canvas.setAttribute('aria-hidden','true');
  canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';
  ctx=canvas.getContext('webgpu');if(!ctx)throw Error('webgpu_context_missing');
  const format=navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({device,format,alphaMode:'premultiplied'});
  const module=device.createShaderModule({code:SHADER});
  const pipeline=device.createRenderPipeline({
   layout:'auto',vertex:{module,entryPoint:'vs'},
   fragment:{module,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'src-alpha',dstFactor:'one',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},
   primitive:{topology:'triangle-list'}
  });
  buffer=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]});
  let width=1,height=1,color=[.71,.87,.93];
  function resize(){
   const scale=Math.min(devicePixelRatio||1,1.3);
   width=Math.max(1,Math.min(1920,Math.round(host.clientWidth*scale)));
   height=Math.max(1,Math.min(1080,Math.round(host.clientHeight*scale)));
   if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  }
  host.append(canvas);observer=new ResizeObserver(resize);observer.observe(host);resize();
  device.lost.then(()=>{lost=true;if(canvas)canvas.hidden=true;});
  const limit=Math.min(MAX,Math.max(100,Math.floor(Number(count)||900)));
  return Object.freeze({
   renderAt(time,{motion=.55}={}){
    if(disposed||lost||document.hidden)return;
    resize();
    device.queue.writeBuffer(buffer,0,new Float32Array([time,width,height,Math.max(0,Math.min(1,motion)),...color,0]));
    const encoder=device.createCommandEncoder();
    const pass=encoder.beginRenderPass({colorAttachments:[{view:ctx.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}]});
    pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(6,limit);pass.end();device.queue.submit([encoder.finish()]);
   },
   setTint(hex){if(/^#[0-9a-f]{6}$/i.test(hex))color=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);},
   dispose(){if(disposed)return;disposed=true;observer.disconnect();buffer.destroy();ctx.unconfigure();canvas.remove();}
  });
 }catch{if(observer)observer.disconnect();if(buffer)buffer.destroy();if(ctx)ctx.unconfigure();if(canvas)canvas.remove();return null;}
}
