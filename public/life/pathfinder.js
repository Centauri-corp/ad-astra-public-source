(()=>{'use strict';
const content={
 day:{eyebrow:'DAYFLOW / DAILY LIFE',title:'Make room for what matters today.',description:'Begin by identifying one priority and the time you can give it. Review your plan before acting.',label:'Explore DayFlow workspace',href:'/workspace/?product=day'},
 learn:{eyebrow:'LEARNPATH / KNOWLEDGE',title:'Turn curiosity into understanding.',description:'Start with one meaningful question. Compare explanations, inspect sources and decide what to explore next.',label:'Explore LearnPath workspace',href:'/workspace/?product=learn'},
 career:{eyebrow:'CAREERSTEP / GROWTH',title:'Give your next move a direction.',description:'Clarify one professional goal, identify a skill to build and choose a practical next step.',label:'Explore CareerStep workspace',href:'/workspace/?product=career'}
};
const choices=document.querySelectorAll('input[name="pathfinder-goal"]');
const type=document.getElementById('pathfinder-type');
const title=document.getElementById('pathfinder-result-title');
const copy=document.getElementById('pathfinder-result-copy');
const action=document.getElementById('pathfinder-action');
if(!choices.length||!type||!title||!copy||!action)return;
const update=value=>{
 const entry=Object.hasOwn(content,value)?content[value]:content.day;
 type.textContent=entry.eyebrow;
 title.textContent=entry.title;
 copy.textContent=entry.description;
 action.textContent=entry.label+' ↗';
 action.href=entry.href;
};
for(const choice of choices)choice.addEventListener('change',()=>{if(choice.checked)update(choice.value)});
const syncSelection=()=>update(Array.from(choices).find(x=>x.checked)?.value||'day');
syncSelection();
window.addEventListener('pageshow',syncSelection);
})();
