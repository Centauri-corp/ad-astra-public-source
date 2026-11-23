/* CRC AD ASTRA — Human journey is a read-only, local visual synchronizer.
   Every chapter, link and availability disclosure works without JavaScript.
   No model calls, analytics, customer data or server requests. */
(() => {
  'use strict';
  const journey = document.querySelector('[data-human-journey]');
  if (!journey) return;
  const chapters = Array.from(journey.querySelectorAll('[data-human-chapter]'));
  const label = journey.querySelector('[data-human-scene-label]');
  const count = journey.querySelector('[data-human-scene-count]');
  if (chapters.length !== 3 || !label || !count) return;

  const labels = ['HUMAN CURIOSITY','CONNECTED EVIDENCE','A WORLD OF POSSIBILITY'];
  let current = 0;
  const setScene = index => {
    if (!Number.isInteger(index) || index < 0 || index >= chapters.length) return;
    if (current === index && journey.dataset.humanScene === String(index)) return;
    current = index;
    journey.dataset.humanScene = String(index);
    chapters.forEach((chapter, i) => {
      chapter.dataset.humanActive = String(i === index);
    });
    label.textContent = labels[index];
    count.textContent = String(index + 1).padStart(2,'0') + ' / 03';
  };

  const computeNearest = () => {
    const reference = window.innerHeight * 0.48;
    let closest = 0;
    let distance = Infinity;
    chapters.forEach((chapter,index) => {
      const box = chapter.getBoundingClientRect();
      const d = Math.abs((box.top + box.bottom) / 2 - reference);
      if (d < distance) { distance = d; closest = index; }
    });
    setScene(closest);
  };
  // A single passive scroll callback is cheaper and more reliable than
  // independent 3D/video render loops. Defer work to an available frame.
  let pending = false;
  const onTravel = () => {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(() => { pending = false; computeNearest(); });
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      entries => { if (entries.some(entry => entry.isIntersecting)) onTravel(); },
      { root:null,rootMargin:'-12% 0px -12% 0px',threshold:[0,.25,.5,.75] }
    );
    chapters.forEach(chapter => observer.observe(chapter));
  }
  window.addEventListener('scroll', onTravel, {passive:true});
  window.addEventListener('resize', onTravel, {passive:true});
  window.addEventListener('pageshow', onTravel);
  chapters.forEach((chapter,index) => chapter.addEventListener('focusin', () => setScene(index)));
  onTravel();
})();
