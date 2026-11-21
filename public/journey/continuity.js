/* One public-safe journey controller. No access to private graphics, billing or release APIs. */
(function (root) {
  "use strict";
  const steps = Object.freeze([
    { id: "arrival", label: "Earth and beyond", href: "/" },
    { id: "intelligence", label: "Explore intelligence", href: "/knowledge/" },
    { id: "life", label: "Life intelligence", href: "/life/" },
    { id: "products", label: "Products and solutions", href: "/services/" },
    { id: "workspace", label: "Customer workspace", href: "/workspace/" }
  ]);
  function getStep(id) { return steps.find(s => s.id === id) || null; }
  function nextStep(id) {
    const index = steps.findIndex(s => s.id === id);
    return index < 0 || index === steps.length - 1 ? null : steps[index + 1];
  }
  function safeStepFromHash(hash) {
    const value = typeof hash === "string" ? hash.replace(/^#/, "") : "";
    return getStep(value) || steps[0];
  }
  function applyNavigation(documentRef, id) {
    if (!documentRef || typeof documentRef.querySelectorAll !== "function") return false;
    const active = getStep(id);
    if (!active) return false;
    for (const link of documentRef.querySelectorAll("[data-journey-step]")) {
      const key = link.getAttribute("data-journey-step");
      if (key === active.id) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    }
    return true;
  }
  const api = Object.freeze({ steps, getStep, nextStep, safeStepFromHash, applyNavigation });
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AdAstraJourney = api;
})(typeof window === "object" ? window : null);
