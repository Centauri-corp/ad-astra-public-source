/* Decorative neural study and prewritten examples only. No AI, telemetry or storage. */
(function () {
  'use strict';
  const states = Object.freeze({
    analyzing: {name:'Analyzing', description:'Frame the question. Separate assumptions from the evidence still needed.', color:[142,232,244], phase:0},
    reasoning: {name:'Reasoning', description:'Compare explanations, alternatives and uncertainty. Keep the explanation open to review.', color:[185,176,239], phase:0.6},
    planning: {name:'Planning', description:'Organize dependencies and options into a considered next step.', color:[171,218,202], phase:1.2},
    acting: {name:'Acting', description:'Prepare a proposed action for human review. This page executes no actions.', color:[239,197,152], phase:1.8},
    learning: {name:'Learning', description:'Revisit assumptions and outcomes. This visual state is not live model training.', color:[169,196,238], phase:2.4},
    aligning: {name:'Aligning', description:'Keep human intent, evidence and permissions aligned before any release.', color:[227,212,177], phase:3}
  });
  const stages = Object.freeze(['Intent','Evidence','Reasoning','Oversight']);
  const scenarios = Object.freeze({
    research: {question:'How could a new idea become a useful research project?', steps:[
      ['Make the question specific.','Name the decision the research should support. Define the audience, scope and what a useful outcome would look like.',['Write one bounded question.','Record the context and constraints.','Separate the desired outcome from assumptions.'],'This example contains no research findings.'],
      ['Build an evidence plan.','Identify the source types that would be needed before forming a conclusion. Nothing has been retrieved by this demonstration.',['Find relevant primary sources.','Check dates, provenance and limitations.','Record conflicting evidence, not just support.'],'No sources have been searched or verified here.'],
      ['Compare possible explanations.','Organize competing hypotheses and the observations that could support or challenge each one.',['Separate observation from interpretation.','List plausible alternatives.','Make uncertainty visible.'],'This is a prewritten outline, not an AI-generated analysis.'],
      ['Keep the decision with people.','A qualified reviewer would assess source quality, limitations and the proposed next step before accepting an outcome.',['Review the evidence in context.','Document unresolved questions.','Approve a bounded follow-up, not an assumption.'],'No review, approval or research activity has been performed.']
    ]},
    create: {question:'How could a new concept become a clear creative direction?', steps:[
      ['Give the idea a purpose.','Start with the audience and the feeling or message the work should convey.',['Describe the intended audience.','Name the central message.','Set practical and creative constraints.'],'Illustrative brief only; no creative asset is generated.'],
      ['Collect the right references.','A real project would gather licensed references and establish which source material may be reused.',['Record ownership and permitted uses.','Separate inspiration from material to reproduce.','Keep approved assets identifiable.'],'No reference research, licenses or rights have been verified here.'],
      ['Explore distinct directions.','Compare alternative approaches to story, form and tone instead of treating the first concept as the final answer.',['Outline more than one direction.','Compare trade-offs with the brief.','Keep original work and sources distinct.'],'These are prewritten prompts, not model-generated concepts.'],
      ['Review before release.','The responsible creative owner would check the actual artifact, rights and accessibility before approving publication.',['Review the finished artifact.','Confirm rights and audience suitability.','Approve the exact release version.'],'No publication, asset generation or approval occurs on this page.']
    ]},
    plan: {question:'How could a broad goal become a responsible next step?', steps:[
      ['Define the outcome.','Identify what success would mean and which decisions need to stay with the accountable person.',['Name the outcome and owner.','Set boundaries and constraints.','Identify what is not in scope.'],'This is a planning example, not an operational instruction.'],
      ['Surface the dependencies.','A real plan needs verified inputs, resources and current constraints before work is scheduled.',['List missing inputs.','Check resources and dependencies.','Separate estimates from verified facts.'],'No schedules, resources or budgets have been accessed.'],
      ['Choose a bounded sequence.','Compare options and order the smallest useful steps, making assumptions and failure conditions explicit.',['Consider alternative paths.','Define evidence for each milestone.','Include stop and recovery conditions.'],'No tasks are created or dispatched by this example.'],
      ['Authorize only the next step.','The responsible person would review the exact scope, cost and risk before approving execution.',['Check permissions and constraints.','Record a specific human decision.','Verify the outcome before continuing.'],'No agent, financial commitment or external action is activated.']
    ]}
  });
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : min));
  const nextStep = step => (Math.floor(clamp(step,0,3)) + 1) % 4;
  const canAnimate = p => !p.reduced && !p.saveData && !p.paused && p.visible && !p.hidden && p.intensity > 0;
  // Elliptical decorative pathways surround, but do not reconstruct, the original artwork.
  function orbitPoint(angle, ring, time, width, height, phase) {
    const tilt = [-0.45,0.58,-0.08][ring];
    const a = angle + time * [0.07,-0.055,0.035][ring] + phase;
    const rx = width * (0.35 + ring * 0.035), ry = height * (0.14 + ring * 0.025);
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    return {x:width/2+x*Math.cos(tilt)-y*Math.sin(tilt), y:height/2+x*Math.sin(tilt)+y*Math.cos(tilt), depth:(Math.sin(a)+1)/2};
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {states,stages,scenarios,clamp,nextStep,canAnimate,orbitPoint};
  if (typeof document === 'undefined') return;
  const root = document.querySelector('.brain-observatory');
  if (!root || root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';
  const byId = id => document.getElementById(id);
  const canvas = byId('neural-effects');
  let ctx = null;
  try { ctx = canvas && canvas.getContext('2d'); } catch (_) { /* Static artwork remains. */ }
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const connection = navigator.connection;
  const policy = {reduced:motionQuery.matches, saveData:Boolean(connection && connection.saveData), paused:false, visible:false, hidden:document.hidden, intensity:45};
  let frame = 0, lastTime = 0, clock = 0, width = 1, height = 1, currentState = 'analyzing';
  let selectedScenario = 'research', selectedStep = 0;
  const motionButton = byId('motion-toggle'), slider = byId('motion-intensity');
  const motionStatus = byId('motion-status');
  const model = root.querySelector('.brain-model');
  const artwork = root.querySelector('.brain-artwork');
  const controls = root.querySelector('.brain-motion-controls');
  if (controls) controls.hidden = !ctx;
  function draw() {
    if (!ctx) return;
    const state = states[currentState], color = state.color.join(',');
    const strength = policy.intensity / 100;
    ctx.clearRect(0,0,width,height);
    if (strength === 0) return;
    for (let ring=0; ring<3; ring++) {
      ctx.beginPath();
      for(let i=0;i<=100;i++){
        const p=orbitPoint(i*Math.PI*2/100,ring,clock,width,height,state.phase);
        if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
      }
      ctx.strokeStyle='rgba('+color+','+(0.12+strength*0.18)+')';ctx.lineWidth=0.65;ctx.stroke();
      for(let i=0;i<14;i++){
        const a=i*Math.PI*2/14, p=orbitPoint(a,ring,clock,width,height,state.phase);
        const pulse=0.5+0.5*Math.sin(clock*0.9+i*1.3+ring);
        ctx.beginPath();ctx.arc(p.x,p.y,0.8+p.depth*1.2+strength*pulse,0,Math.PI*2);
        ctx.fillStyle='rgba('+color+','+(0.2+p.depth*0.45)+')';ctx.fill();
        if(i%4===0){
          const q=orbitPoint(a+0.08, (ring+1)%3,clock,width,height,state.phase);
          ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);
          ctx.strokeStyle='rgba('+color+','+(strength*0.12)+')';ctx.stroke();
        }
      }
    }
  }
  function tick(timestamp) {
    frame=0;
    if (!canAnimate(policy) || !ctx) return;
    // Cap drawing to 30 fps. Time deltas are bounded after interruptions.
    if (!lastTime || timestamp-lastTime>=1000/30) {
      clock+=Math.min((timestamp-(lastTime||timestamp))/1000,0.075);
      lastTime=timestamp; draw();
    }
    frame=requestAnimationFrame(tick);
  }
  function syncMotion() {
    if(frame){cancelAnimationFrame(frame);frame=0;}
    lastTime=0;
    const allowed=canAnimate(policy)&&Boolean(ctx);
    root.dataset.motion=allowed?'running':'static';
    motionButton.setAttribute('aria-pressed',String(!policy.paused&&!policy.reduced&&!policy.saveData&&policy.intensity>0&&Boolean(ctx)));
    motionButton.disabled=policy.reduced||policy.saveData||!ctx||policy.intensity===0;
    motionButton.textContent=policy.reduced?'Reduced motion':policy.saveData?'Data saver on':policy.intensity===0?'Effects off':policy.paused?'Play motion':'Pause motion';
    motionStatus.textContent=!ctx?'Static artwork: animation is unavailable.':policy.reduced?'Reduced-motion preference respected. Decorative effects are static.':policy.saveData?'Data-saver preference respected. Decorative effects are static.':policy.intensity===0?'Decorative effects off. Original artwork preserved.':policy.paused?'Motion paused. State and example controls remain available.':!policy.visible||policy.hidden?'Motion suspended while the artwork is not visible.':'Decorative motion only. No AI engine is connected.';
    if(!allowed){artwork.style.removeProperty('--art-x');artwork.style.removeProperty('--art-y');}
    draw();
    if(allowed)frame=requestAnimationFrame(tick);
  }
  function resize() {
    if(!ctx)return;
    const box=model.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);
    const ratio=Math.min(window.devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);draw();
  }
  const stateButtons=Array.from(document.querySelectorAll('[data-state]'));
  for(const button of stateButtons){
    button.disabled=false;
    button.addEventListener('click',()=>{
      const key=button.dataset.state;if(!Object.hasOwn(states,key))return;
      currentState=key;root.dataset.neuralState=key;
      stateButtons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      byId('state-name').textContent=states[key].name;
      byId('state-description').textContent=states[key].description;draw();
    });
  }
  const scenarioButtons=Array.from(document.querySelectorAll('[data-scenario]'));
  const stepButtons=Array.from(document.querySelectorAll('[data-step]'));
  function updateExample() {
    const scenario=scenarios[selectedScenario], entry=scenario.steps[selectedStep];
    byId('example-question').textContent=scenario.question;
    byId('example-eyebrow').textContent=String(selectedStep+1).padStart(2,'0')+' / '+stages[selectedStep].toUpperCase();
    byId('example-title').textContent=entry[0];byId('example-copy').textContent=entry[1];
    byId('example-boundary').textContent=entry[3];
    const points=byId('example-points');points.replaceChildren();
    entry[2].forEach(text=>{const li=document.createElement('li');li.textContent=text;points.append(li);});
    byId('example-progress').textContent='STEP '+String(selectedStep+1).padStart(2,'0')+' OF 04';
    byId('example-next').textContent=selectedStep===3?'Restart example':'Next: '+stages[selectedStep+1]+' \u2192';
    scenarioButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scenario===selectedScenario)));
    stepButtons.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.step)===selectedStep)));
  }
  scenarioButtons.forEach(button=>{button.disabled=false;button.addEventListener('click',()=>{if(!Object.hasOwn(scenarios,button.dataset.scenario))return;selectedScenario=button.dataset.scenario;selectedStep=0;updateExample();});});
  stepButtons.forEach(button=>{button.disabled=false;button.addEventListener('click',()=>{selectedStep=Math.floor(clamp(button.dataset.step,0,3));updateExample();});});
  byId('example-next').disabled=false;
  byId('example-next').addEventListener('click',()=>{selectedStep=nextStep(selectedStep);updateExample();});
  motionButton.addEventListener('click',()=>{if(policy.reduced||policy.saveData||!ctx)return;policy.paused=!policy.paused;syncMotion();});
  slider.addEventListener('input',()=>{policy.intensity=clamp(slider.value,0,100);byId('intensity-value').value=policy.intensity+'%';syncMotion();});
  const preferenceChanged=()=>{policy.reduced=motionQuery.matches;policy.saveData=Boolean(connection&&connection.saveData);syncMotion();};
  if(motionQuery.addEventListener)motionQuery.addEventListener('change',preferenceChanged);else if(motionQuery.addListener)motionQuery.addListener(preferenceChanged);
  if(connection&&connection.addEventListener)connection.addEventListener('change',preferenceChanged);
  document.addEventListener('visibilitychange',()=>{policy.hidden=document.hidden;syncMotion();});
  window.addEventListener('pagehide',()=>{policy.hidden=true;syncMotion();});
  window.addEventListener('pageshow',()=>{policy.hidden=document.hidden;syncMotion();});
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{policy.visible=entries[0].isIntersecting;syncMotion();},{threshold:0.05}).observe(model);
  else policy.visible=true;
  if('ResizeObserver' in window)new ResizeObserver(resize).observe(model);else window.addEventListener('resize',resize,{passive:true});
  model.addEventListener('pointermove',event=>{
    if(!pointerQuery.matches||!canAnimate(policy))return;
    const rect=model.getBoundingClientRect();
    artwork.style.setProperty('--art-x',((event.clientX-rect.left)/rect.width-.5)*6+'px');
    artwork.style.setProperty('--art-y',((event.clientY-rect.top)/rect.height-.5)*6+'px');
  },{passive:true});
  model.addEventListener('pointerleave',()=>{artwork.style.removeProperty('--art-x');artwork.style.removeProperty('--art-y');},{passive:true});
  const original=new Image();
  original.onload=()=>{root.querySelector('.brain-artwork-fallback').hidden=true;};
  original.onerror=()=>{root.querySelector('.brain-artwork-fallback').hidden=false;};
  original.src='https://cdn.sanity.io/images/6a4vgjc9/production/443f89273eb4071329cac3fa151d2674b37e6eaf-1672x941.png';
  resize();syncMotion();updateExample();
})();
