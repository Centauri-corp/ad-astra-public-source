(()=>{"use strict";document.documentElement.classList.add("js");
const mobile=matchMedia("(max-width:700px)").matches,reduced=matchMedia("(prefers-reduced-motion: reduce)").matches,save=!!(navigator.connection&&navigator.connection.saveData),weak=typeof navigator.deviceMemory==="number"&&navigator.deviceMemory<=3;
if(mobile||reduced||save||weak){document.querySelectorAll(".globe canvas").forEach(c=>c.remove());document.documentElement.dataset.graphic="static";}
const legacy=document.createElement("script");legacy.src="/assets/base.js";legacy.async=false;legacy.addEventListener("load",enhance,{once:true});legacy.addEventListener("error",()=>{enhance();document.documentElement.dataset.legacy="unavailable"},{once:true});document.head.append(legacy);
function enhance(){
document.querySelectorAll(".globe").forEach(stage=>{stage.setAttribute("role","group");const button=document.createElement("button");button.type="button";button.className="motion-toggle";const mq=matchMedia("(prefers-reduced-motion: reduce)");function sync(){const paused=document.documentElement.dataset.motion==="paused"||mq.matches;button.textContent=paused?"Resume motion":"Pause motion";button.disabled=mq.matches;button.setAttribute("aria-pressed",String(paused));if(mq.matches)button.textContent="Motion off";}button.addEventListener("click",()=>{document.documentElement.dataset.motion=document.documentElement.dataset.motion==="paused"?"running":"paused";dispatchEvent(new Event("ad-astra-motion"));sync()});mq.addEventListener("change",()=>{dispatchEvent(new Event("ad-astra-motion"));sync()});stage.append(button);sync()});

const path=location.pathname,body=document.body;body.dataset.adRoute=path.replace(/\W+/g,"-");
document.querySelectorAll("img[loading=lazy]").forEach(img=>img.setAttribute("decoding","async"));
document.querySelectorAll(".globe").forEach(g=>{g.setAttribute("aria-label","Conceptual illuminated orbital intelligence globe. Research platform in development.");g.querySelectorAll(".globe-tag").forEach(s=>s.setAttribute("aria-hidden","true"))});
document.querySelectorAll(".navdetails").forEach(details=>{const summary=details.querySelector("summary");summary.setAttribute("aria-label","Open "+summary.textContent.trim()+" navigation");details.querySelectorAll(".mega-links a").forEach(a=>a.setAttribute("aria-label",a.textContent.trim()))});
document.querySelectorAll(".atlas-grid").forEach(a=>{
const map=a.querySelector(".atlas-map"),panel=a.querySelector(".atlas-panel"),buttons=[...a.querySelectorAll("[data-k]")];
if(!map||!panel||!buttons.length)return;
map.setAttribute("aria-label","Choose a discipline to examine related AD ASTRA learning content.");
let related=panel.querySelector(".atlas-related");if(!related){related=document.createElement("nav");related.className="atlas-related";related.setAttribute("aria-label","Related evidence and learning guides");panel.append(related)}
const data={
physics:[["Research with evidence","/discover/research-with-evidence/"],["Research methods","/research/"]],
computing:[["AI reliability","/discover/ai-reliability/"],["Technology","/technology/"]],
biology:[["Verify research claims","/discover/verify-ai-answers/"],["Science & Research","/markets/science-research/"]],
earth:[["Earth, Space & Beyond","/frontier/"],["Manufacturing & Energy","/markets/manufacturing-energy/"]],
space:[["Space frontier","/frontier/"],["Research methods","/research/"]],
engineering:[["Plan with AI, retain control","/discover/plan-project-with-ai/"],["System architecture","/architecture/"]],
human:[["Verify AI answers","/discover/verify-ai-answers/"],["Trust and controls","/trust/"]]
};
function show(name){const links=data[name]||data.physics;related.textContent="";const h=document.createElement("strong");h.textContent="Related AD ASTRA reading";related.append(h);for(const [title,url] of links){const link=document.createElement("a");link.href=url;link.textContent=title+" →";related.append(link)}}
buttons.forEach((b,i)=>{b.addEventListener("click",()=>show(b.dataset.k));b.addEventListener("keydown",ev=>{let j=ev.key==="ArrowRight"||ev.key==="ArrowDown"?(i+1)%buttons.length:ev.key==="ArrowLeft"||ev.key==="ArrowUp"?(i+buttons.length-1)%buttons.length:ev.key==="Home"?0:ev.key==="End"?buttons.length-1:null;if(j!==null){ev.preventDefault();buttons[j].focus();buttons[j].click()}})});
show(buttons.find(x=>x.getAttribute("aria-pressed")==="true")?.dataset.k||"physics");
const help=document.createElement("p");help.className="atlas-help";help.textContent="Use Tab to focus the map, arrow keys to move between disciplines, and Enter to select.";panel.append(help);
});
const panels={
"/research/":{img:"/assets/world-space.svg",kicker:"EVIDENCE-FIRST EXPLORATION",headline:"From observation to understanding.",copy:"A visual framework for research questions, credible sources and transparent uncertainty.",href:"/discover/research-with-evidence/",label:"Explore evidence guides"},
"/technology/":{img:"/assets/orbital.svg",kicker:"TECHNOLOGY ARCHITECTURE",headline:"Complexity, made legible.",copy:"Explore proposed system components and learn which capabilities are still in development.",href:"/architecture/",label:"Explore architecture"},
"/architecture/":{img:"/assets/world-beyond.svg",kicker:"SYSTEM DESIGN",headline:"Clarity in every connection.",copy:"Interface and research diagrams should distinguish verified data, conceptual models, and human decisions.",href:"/trust/",label:"Review human control"},
"/mission-lab/":{img:"/assets/world-earth.svg",kicker:"MISSION LAB",headline:"Make the next step testable.",copy:"A research workflow begins with a question and continues through human-reviewed evidence.",href:"/research/",label:"Explore research"}
};
const cfg=panels[path],hero=document.querySelector(".pagehero");
if(cfg&&hero&&!document.querySelector(".story-panorama")){const section=document.createElement("section");section.className="story-panorama";section.setAttribute("aria-label",cfg.kicker);const inner=document.createElement("div");inner.className="wrap story-inner";const graphic=document.createElement("div");graphic.className="story-art";const img=document.createElement("img");img.src=cfg.img;img.alt="";img.loading="lazy";img.decoding="async";graphic.append(img);const copy=document.createElement("div");copy.className="story-copy";const label=document.createElement("small");label.textContent=cfg.kicker;const h=document.createElement("h2");h.textContent=cfg.headline;const p=document.createElement("p");p.textContent=cfg.copy;const a=document.createElement("a");a.href=cfg.href;a.textContent=cfg.label+" →";copy.append(label,h,p,a);inner.append(graphic,copy);section.append(inner);hero.insertAdjacentElement("afterend",section)}
const footer=document.querySelector(".footer");if(footer)footer.dataset.graphics="v3";
}
})();