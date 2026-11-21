(()=>{'use strict';
const data={
"space-earth":["SPACE & EARTH","See the connected systems of place, planet and possibility.","A public entry for questions about our world, the wider universe and the evidence connecting them."],
"arts-culture":["ARTS & CULTURE","Make meaning visible.","Explore creative expression, cultural context and the perspectives that shape how people understand one another."],
"medical-health":["MEDICAL & HEALTH","Keep the human context in view.","A governed direction for health questions that keeps evidence, uncertainty and professional judgment visible."],
"science":["SCIENCE","Follow the evidence.","Move from curiosity to clearer inquiry across the scientific disciplines."],
"engineering":["ENGINEERING","Turn constraints into direction.","Connect systems thinking, design tradeoffs and practical next steps."],
"geotechnology":["GEOTECHNOLOGY","Read the shape of place.","Explore geospatial systems, infrastructure and the forces that connect environment and action."],
"education":["EDUCATION","Learn in the direction you choose.","Build context, compare perspectives and carry understanding forward."],
"law-civic":["LAW & CIVIC","Understand the framework around action.","A public direction for civic questions, rights, responsibilities and the need for qualified review."],
"economics":["ECONOMICS","See the relationships behind the numbers.","Connect incentives, markets, resources and decisions without hiding uncertainty."],
"environment":["ENVIRONMENT","Hold the whole system.","Explore the relationships between people, resources, climate and the living world."],
"technology":["TECHNOLOGY","Build with intention.","Map tools, systems and human outcomes before moving from possibility to implementation."],
"accessibility":["ACCESSIBILITY","Make the experience belong to everyone.","Keep language, motion, contrast and control available across the journey."]
};
const buttons=document.querySelectorAll('[data-atlas-domain]');
const label=document.querySelector('[data-atlas-label]');
const title=document.querySelector('[data-atlas-title]');
const copy=document.querySelector('[data-atlas-copy]');
buttons.forEach(button=>button.addEventListener('click',()=>{
 const item=data[button.dataset.atlasDomain]; if(!item)return;
 buttons.forEach(b=>b.setAttribute('aria-selected',String(b===button)));
 label.textContent='ATLAS / '+item[0];
 title.textContent=item[1];
 copy.textContent=item[2]+' Choose another domain or continue into the governed products and workspace.';
}));
})();