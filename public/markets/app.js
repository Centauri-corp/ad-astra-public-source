'use strict';
document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{const value=button.getAttribute('data-copy');try{await navigator.clipboard.writeText(value);button.textContent='Copied';setTimeout(()=>{button.textContent='Copy link'},1200)}catch{button.textContent=value}}));
