/* AD ASTRA scientific scene prototype: reproducible synthetic 3D surface + time.
 * Not a geological model or real measurement. Accessible readout available without canvas.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.AdAstraScientific=api;
})(typeof window==="object"?window:null,function(){
  "use strict";
  const STEPS=Object.freeze([0,1,2,3,4,5,6,7,8]);
  const UNIT="normalized illustrative units";
  function sample(x,z,time){
    if(![x,z,time].every(Number.isFinite)||Math.abs(x)>1||Math.abs(z)>1||!STEPS.includes(time))
      throw new RangeError("Invalid sample coordinates or time");
    return .22*Math.sin(4*x+time*.32)*Math.cos(3*z-time*.17)+
      .16*Math.exp(-((x-.20)**2+(z+.15)**2)*7)+.08*Math.sin(8*(x+z)+time*.21);
  }
  function buildFrame(time,resolution=22){
    if(!STEPS.includes(time)||!Number.isInteger(resolution)||resolution<4||resolution>48)
      throw new RangeError("Invalid frame");
    const points=[];
    for(let row=0;row<=resolution;row++){
      const z=2*row/resolution-1;
      for(let col=0;col<=resolution;col++){
        const x=2*col/resolution-1;
        points.push(Object.freeze({x,y:sample(x,z,time),z}));
      }
    }
    const values=points.map(p=>p.y);
    return Object.freeze({
      schema:"ad-astra/scientific-scene/v1",source:"synthetic-illustrative",
      measured:false,time,unit:UNIT,resolution,
      min:Math.min(...values),max:Math.max(...values),
      points:Object.freeze(points)
    });
  }
  function project(point,yaw=0.6,pitch=0.52){
    if(!point||![point.x,point.y,point.z,yaw,pitch].every(Number.isFinite))
      throw new TypeError("Invalid projection");
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const x=point.x*cy-point.z*sy;
    const depth=point.x*sy+point.z*cy;
    const y=point.y*cp-depth*sp;
    return {x,y,depth:point.y*sp+depth*cp};
  }
  return Object.freeze({STEPS,UNIT,sample,buildFrame,project});
});
