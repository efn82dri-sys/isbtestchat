const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(pointer:fine) and (hover:hover)');
const hero = document.querySelector('.hero');
const header = document.querySelector('header');
const camera = {x:0,y:0,targetX:0,targetY:0,frame:0};
function moveCamera() {
  camera.x += (camera.targetX - camera.x) * .09;
  camera.y += (camera.targetY - camera.y) * .09;
  hero.style.setProperty('--camera-x', camera.x.toFixed(2) + 'px');
  hero.style.setProperty('--camera-y', camera.y.toFixed(2) + 'px');
  const moving = Math.abs(camera.targetX-camera.x) + Math.abs(camera.targetY-camera.y) > .1;
  camera.frame = moving ? requestAnimationFrame(moveCamera) : 0;
}
function aimCamera(x,y) {
  camera.targetX = x;
  camera.targetY = y;
  if (!camera.frame) camera.frame = requestAnimationFrame(moveCamera);
}
hero.addEventListener('pointermove', event => {
  if (!finePointer.matches || motionPreference.matches || hero.classList.contains('is-exploring')) return;
  const bounds = hero.getBoundingClientRect();
  aimCamera(((event.clientX-bounds.left)/bounds.width-.5)*34,
            ((event.clientY-bounds.top)/bounds.height-.5)*20);
}, {passive:true});
hero.addEventListener('pointerleave', () => aimCamera(0,0));
motionPreference.addEventListener('change', () => aimCamera(0,0));
const nav = header.querySelector('nav');
const navLinks = [...nav.querySelectorAll('a[href^="#"]')];
const indicator = document.createElement('span');
indicator.className = 'nav-indicator';
indicator.setAttribute('aria-hidden', 'true');
nav.prepend(indicator);
let activeLink;

function positionIndicator(link) {
  if (!link || !nav.clientWidth) return;
  indicator.style.width = link.offsetWidth + 20 + 'px';
  indicator.style.transform = 'translateX(' + (link.offsetLeft - 10) + 'px)';
  indicator.style.opacity = '1';
}

const sections = navLinks.map(link => document.querySelector(link.hash));
function syncNavigation() {
  const index = sections.findLastIndex(section => section && section.getBoundingClientRect().top < innerHeight * .45);
  activeLink = navLinks[index];
  navLinks.forEach(link => {
    if (link === activeLink) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  if (!nav.matches(':hover') && !nav.matches(':focus-within')) {
    if (activeLink) positionIndicator(activeLink);
    else indicator.style.opacity = '0';
  }
}
let scrollFrame = 0;
addEventListener('scroll', () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    syncNavigation();
  });
}, {passive:true});
new ResizeObserver(() => {
  if (activeLink) positionIndicator(activeLink);
}).observe(nav);
navLinks.forEach(link => {
  link.addEventListener('pointerenter', () => positionIndicator(link));
  link.addEventListener('focus', () => positionIndicator(link));
});
nav.addEventListener('pointerleave', syncNavigation);
nav.addEventListener('focusout', () => requestAnimationFrame(syncNavigation));
syncNavigation();

function play(element, frames, options) {
  if (!element || motionPreference.matches || !element.animate) return;
  return element.animate(frames, options);
}

const ease = 'cubic-bezier(.18,.75,.25,1)';
hero.querySelectorAll('.lead > *').forEach((element, index) => {
  play(element, [{opacity:0,translate:'0 32px',filter:'blur(7px)'},{opacity:1,translate:'0 0',filter:'blur(0)'}], {duration:850,delay:90*index,easing:ease,fill:'backwards'});
});

const revealed = new WeakSet();
const reveal = new IntersectionObserver(records => {
  for (const {target, isIntersecting} of records) {
    if (!isIntersecting) continue;
    reveal.unobserve(target);
    if (revealed.has(target)) continue;
    revealed.add(target);
    play(target, [
      {opacity:0,translate:'0 42px',rotate:'x 9deg',filter:'blur(5px)'},
      {opacity:1,translate:'0 0',rotate:'x 0deg',filter:'blur(0)'}
    ], {duration:760,easing:ease});
  }
}, {threshold:.13});
document.querySelectorAll('.section').forEach(section => reveal.observe(section));

const animatedControls = 'header a,header button,#stations button,.hero .actions .pill,.overview,#all-projects';
const rebound = new WeakMap();
function bounce(control) {
  rebound.get(control)?.cancel();
  const animation = play(control,[{scale:1},{scale:1.08,offset:.42},{scale:.985,offset:.78},{scale:1}],{duration:370,easing:ease});
  if (animation) rebound.set(control,animation);
}
document.addEventListener('pointerover', event => {
  const control = event.target.closest(animatedControls);
  if (finePointer.matches && control && !control.contains(event.relatedTarget)) bounce(control);
});
document.addEventListener('focusin', event => {
  const control = event.target.closest(animatedControls);
  if (control?.matches(':focus-visible')) bounce(control);
});

const stations = document.querySelector('#stations');
const stationObserver = new MutationObserver(records => {
  if (!records.some(record => record.addedNodes.length)) return;
  [...stations.children].forEach((button,index) => {
    play(button,[{opacity:0,translate:'0 12px'},{opacity:1,translate:'0 0'}],{duration:520,delay:index*70,easing:ease,fill:'backwards'});
  });
});
stationObserver.observe(stations,{childList:true});

let lastView = hero.classList.contains('is-exploring');
new MutationObserver(() => {
  const exploring = hero.classList.contains('is-exploring');
  if (exploring === lastView) return;
  lastView = exploring;
  const layer = hero.querySelector(exploring ? '#scene' : '.campus-poster');
  play(layer,[{filter:'blur(9px) brightness(.72)',scale:1.047},{filter:'blur(0) brightness(1)',scale:1}],{duration:950,easing:ease});
}).observe(hero,{attributes:true,attributeFilter:['class']});
