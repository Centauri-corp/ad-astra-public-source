/* Public seven-system atlas. Scene definitions come from the canonical compiler, not from user data. */
(() => {
  "use strict";
  const api=window.AdAstraGraphicsCore;
  const mount=document.querySelector("[data-graphics-systems]");
  const stage=document.querySelector(".stage-orbit");
  const caption=document.getElementById("graphics-system-caption");
  if (!api || !mount || !stage || !caption) return;
  const atlas=api.buildGraphicsAtlas();
  if(!Array.isArray(atlas.scenes)||atlas.scenes.length!==7)return;
  const buttons=[];
  function choose(index) {
    if(!Number.isSafeInteger(index)||index<0||index>=atlas.scenes.length)return false;
    const scene=atlas.scenes[index];
    api.validateScene(scene);
    stage.dataset.graphicsSystem=String(index);
    stage.setAttribute("aria-label",scene.accessibility.staticDescription+" — conceptual illustration; no live customer data");
    caption.textContent=scene.title+" — "+scene.description+". Concept preview; not live scientific data.";
    buttons.forEach((button,i)=>button.setAttribute("aria-pressed",String(i===index)));
    return true;
  }
  const nav=document.createElement("div");
  nav.className="graphics-system-controls";
  nav.setAttribute("role","group");
  nav.setAttribute("aria-label","Seven Graphics Intelligence systems");
  atlas.scenes.forEach((scene,index)=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="graphics-system-button";
    button.textContent=scene.title;
    button.setAttribute("aria-pressed","false");
    button.addEventListener("click",()=>choose(index));
    nav.append(button);buttons.push(button);
  });
  mount.replaceChildren(nav);
  choose(0);
})();
