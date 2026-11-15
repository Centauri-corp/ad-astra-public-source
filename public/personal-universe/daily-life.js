'use strict';
// Local, user-directed daily-life navigation. No diagnosis or inferred emotion.
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AdAstraDailyLife=api;})(globalThis,()=>{
 const entries=Object.freeze([
  {id:'clarity',label:'Clarity',accent:'#a8e8f5',prompt:'Help me clarify my next decision with two options and a practical step.',question:'What matters most right now?',steps:['Name one important decision.','Compare two realistic options.','Choose a next step you control.']},
  {id:'time',label:'Time',accent:'#94b6de',prompt:'Help me organize today with realistic time constraints, priorities, and time to rest.',question:'Where do you want more time?',steps:['Choose one priority.','Identify one commitment to simplify.','Protect one focused period.']},
  {id:'wellbeing',label:'Well-being',accent:'#a6d0bb',prompt:'Help me create a simple self-care plan without diagnosing me or making medical claims.',question:'What would support you today?',steps:['Choose a small restorative action.','Set a realistic moment for it.','Seek real-world support when needed.']},
  {id:'connection',label:'Connection',accent:'#d5ba91',prompt:'Help me plan meaningful time with people I care about, respecting their autonomy.',question:'Who matters to you today?',steps:['Think of someone you value.','Make time for a genuine connection.','Listen and follow through.']},
  {id:'finance',label:'Financial clarity',accent:'#c1d4a2',prompt:'Help me compare a budgeting decision using only the real numbers I supply.',question:'What money choice needs clarity?',steps:['Collect the actual figures.','Consider two scenarios.','Choose a manageable next step.']},
  {id:'purpose',label:'Purpose',accent:'#c8ade6',prompt:'Help me turn one meaningful goal into a realistic action and a way to evaluate progress.',question:'What would make today meaningful?',steps:['Name a personally meaningful goal.','Choose an achievable first action.','Reflect on what happened.']}
 ].map(x=>Object.freeze(x)));
 const map=new Map(entries.map(x=>[x.id,x]));
 function createSession(initial='clarity'){
  let chosen=map.get(initial)||entries[0],done=new Set();
  return Object.freeze({
   list:()=>entries.map(({id,label,accent})=>({id,label,accent})),
   choose:id=>(chosen=map.get(id)||chosen),
   current:()=>chosen,
   setDone:(i,value)=>{if(!Number.isInteger(i)||i<0||i>=chosen.steps.length)throw Error('invalid_step');const key=chosen.id+':'+i;value?done.add(key):done.delete(key);return done.has(key);},
   isDone:i=>done.has(chosen.id+':'+i),
   snapshot:()=>Object.freeze({need:chosen.id,completed:chosen.steps.filter((_,i)=>done.has(chosen.id+':'+i)).length,total:chosen.steps.length,persisted:false}),
   clear:()=>{done.clear();chosen=entries[0];}
  });
 }
 return Object.freeze({entries,createSession});
});