/* Accessible, progressive public journey UI; no privileged operations. */
(() => {
  "use strict";
  const journey = window.AdAstraJourney;
  const container = document.querySelector("[data-journey-navigation]");
  if (!journey || !container || !Array.isArray(journey.steps)) return;
  const current = container.getAttribute("data-current-journey") || "life";
  const nav = document.createElement("nav");
  nav.className = "single-journey-nav";
  nav.setAttribute("aria-label", "Ad Astra experience journey");
  const list = document.createElement("ol");
  list.className = "single-journey-list";
  journey.steps.forEach((step, index) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = step.href;
    link.setAttribute("data-journey-step", step.id);
    const number = document.createElement("span");
    number.className = "single-journey-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const label = document.createElement("span");
    label.textContent = step.label;
    link.append(number, label);
    item.append(link);
    list.append(item);
  });
  nav.append(list);
  container.replaceChildren(nav);
  journey.applyNavigation(document, current);
  const next = journey.nextStep(current);
  const nextAnchor = document.querySelector("[data-next-journey]");
  if (next && nextAnchor && nextAnchor.tagName === "A") {
    nextAnchor.href = next.href;
    nextAnchor.textContent = "Continue to " + next.label + " →";
  }
})();
