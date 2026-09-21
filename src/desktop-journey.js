import { createWorld } from './world.js';
import { createSceneLabels } from './scene-labels.js';
import { installNavigation, revealPage } from './navigation.js';

const mobileLayout = matchMedia('(max-width: 760px)');
const chapters = [...document.querySelectorAll('[data-scene]')];
const links = [...document.querySelectorAll('.journey-nav a')];
const toggle = document.querySelector('.motion-toggle');
const captions = ['Un tour de vos extérieurs','01 / Prendre soin de votre toiture','02 / Retrouver la lumière','03 / Profiter de votre jardin','04 / Du concret, sur le terrain','05 / Le sens du service','06 / Votre confiance','07 / Votre projet commence ici'];
const preference = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = preference.matches;
try { const saved=sessionStorage.getItem('catf-motion');if(saved) reduced=saved==='reduced'; } catch {}
let world, sceneLabels, target = 0, current = 0, dirty = true, lastTime = 0;
let cameraTransition = null;
let labelMove = null, lastScroll = 0;
const pointer={x:0,y:0}, smoothPointer={x:0,y:0};
let offsets=[];
function measure(){offsets=chapters.map(el=>el.offsetTop);if(!mobileLayout.matches)world?.resize();dirty=true;update();}
function applyMotion(){
  document.body.classList.toggle('reduced-motion',reduced);
  toggle.setAttribute('aria-pressed',String(reduced));
  toggle.textContent=reduced?'Animations : réduites':'Animations : actives';
  document.documentElement.style.scrollBehavior=reduced?'auto':'';
  dirty=true;
}
toggle.addEventListener('click',()=>{reduced=!reduced;try{sessionStorage.setItem('catf-motion',reduced?'reduced':'full');}catch{}applyMotion();});
preference.addEventListener('change',e=>{reduced=e.matches;applyMotion();});
applyMotion();
function update(){
  if(mobileLayout.matches)return;
  const y=scrollY;let segment=0;
  const anchorInset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  for(let i=0;i<offsets.length;i++){if(y>=offsets[i]-anchorInset-5)segment=i;}
  const next=offsets[segment+1]??offsets[segment]+innerHeight;
  const local=Math.max(0,Math.min(1,(y-offsets[segment])/(next-offsets[segment])));
  target=Math.min(7,segment+local);
  links.forEach((link,i)=>{if(i===segment)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});
  document.querySelector('#scene-caption').textContent=captions[segment];
  const fraction=y/Math.max(1,document.documentElement.scrollHeight-innerHeight);
  document.querySelector('.reading-progress').style.transform=`scaleX(${fraction})`;
  for(const chapter of chapters){
    const copy=chapter.querySelector('.chapter-copy');if(!copy)continue;
    const rect=chapter.getBoundingClientRect();
    const exit=Math.max(0,Math.min(1,(innerHeight*.85-rect.bottom)/(innerHeight*.65)));
    copy.style.opacity=String(1-exit*.7);
    copy.style.transform=`perspective(1100px) translate3d(0,${-exit*45}px,${-exit*110}px) rotateY(${-exit*7}deg)`;
  }
  dirty=true;
}
function fallback(){document.body.classList.remove('webgl-ready');document.body.classList.add('no-webgl');toggle.hidden=true;sceneLabels?.dispose();}
try {
  const canvas=document.querySelector('#world');
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();world?.renderer.setAnimationLoop(null);fallback();});
  canvas.addEventListener('webglcontextrestored',()=>location.reload());
  world=await createWorld(canvas);
  await world.prepare();
  performance.mark('catf-first-render-start');
  world.render(0);
  performance.measure('catf-first-render', 'catf-first-render-start');
  await world.finishFirstFrame();
  document.body.classList.add('webgl-ready');
  sceneLabels=createSceneLabels(world,canvas);
  world.renderer.setAnimationLoop(time=>{
    if(document.hidden||mobileLayout.matches)return;
    if(cameraTransition){
      const t=Math.min(1,(performance.now()-cameraTransition.start)/cameraTransition.duration);
      world.renderTransition(cameraTransition.returning?1-t:t);
      sceneLabels.update();
      if(cameraTransition.returning&&t===1){cameraTransition=null;dirty=true;}
      return;
    }
    const delta=Math.min((time-lastTime)/1000,.05)||.016;lastTime=time;
    const ease=1-Math.exp(-delta*6);
    if(labelMove&&!reduced){
      const now=performance.now(), amount=Math.min(1,(now-labelMove.start)/labelMove.duration);
      current=labelMove.interrupted?target:labelMove.destination;
      smoothPointer.x+=(pointer.x-smoothPointer.x)*ease;
      smoothPointer.y+=(pointer.y-smoothPointer.y)*ease;
      world.render(current,smoothPointer,amount);sceneLabels.update();
      // Keep the direct framing until the native anchor scroll has arrived.
      if(amount===1&&now-lastScroll>120){
        if(Math.abs(target-current)<.002){labelMove=null;current=target;}
        else {world.prepareDirectMove();labelMove={start:now,duration:500,interrupted:true};}
      }
      dirty=true;return;
    }
    if(reduced)labelMove=null;
    // Reduced motion holds one still overview while all HTML remains scrollable.
    const destination=reduced?0:target;
    const moving=Math.abs(current-destination)>.0002 || Math.abs(smoothPointer.x-pointer.x)>.001 || Math.abs(smoothPointer.y-pointer.y)>.001;
    if(!dirty&&!moving)return;
    current=reduced?0:current+(destination-current)*ease;
    smoothPointer.x+=(pointer.x-smoothPointer.x)*ease;
    smoothPointer.y+=(pointer.y-smoothPointer.y)*ease;
    world.render(current,reduced?{x:0,y:0}:smoothPointer);sceneLabels.update();dirty=false;
  });
} catch(error) { console.warn('Vue 3D indisponible, affichage du contenu classique.',error.message); fallback(); }
window.addEventListener('scroll',()=>{lastScroll=performance.now();update();},{passive:true});
document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||reduced||!world)return;
  const link=event.target.closest('a[href]');
  if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
  const url=new URL(link.href), here=new URL(location.href);
  const pagePath=url=>url.pathname.replace(/\/index\.html$/,'/');
  if(url.origin!==here.origin||pagePath(url)!==pagePath(here)||url.search!==here.search)return;
  const destination=chapters.findIndex(chapter=>`#${chapter.id}`===url.hash);
  if(destination<0)return;
  world.prepareDirectMove();
  labelMove={start:performance.now(),duration:1000,destination,interrupted:false};
  lastScroll=performance.now();dirty=true;
});
function resumeManualScroll(event){
  if(!labelMove||labelMove.interrupted)return;
  if(event.type==='keydown'&&(!['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key)||event.target.closest('input, textarea, select, [contenteditable]')))return;
  world.prepareDirectMove();
  labelMove={start:performance.now(),duration:500,interrupted:true};
}
window.addEventListener('wheel',resumeManualScroll,{passive:true});
window.addEventListener('touchstart',resumeManualScroll,{passive:true});
window.addEventListener('keydown',resumeManualScroll);
window.addEventListener('resize',measure,{passive:true});
window.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||reduced||e.target.closest('.scene-label'))return;pointer.x=e.clientX/innerWidth-.5;pointer.y=-(e.clientY/innerHeight-.5);},{passive:true});
document.addEventListener('visibilitychange',()=>{dirty=true;lastTime=0;});
new ResizeObserver(measure).observe(document.querySelector('main'));
window.addEventListener('load',()=>{measure();if(location.hash){const el=document.getElementById(location.hash.slice(1));el?.scrollIntoView({behavior:'instant'});update();current=target;}});
measure();
installNavigation({
  canAnimate:()=>!reduced&&!mobileLayout.matches,
  depart:section=>{
    if(!world||document.body.classList.contains('no-webgl')||!world.prepareTransition(section))return false;
    cameraTransition={start:performance.now(),duration:320,returning:false};return true;
  },
  reset:()=>{cameraTransition=null;dirty=true;},
});
function enterJourney(){
  measure();
  if(window.__catfPageEntry&&!reduced&&world&&!document.body.classList.contains('no-webgl')){
    const section=window.__catfPageEntry.section;
    document.getElementById(location.hash.slice(1))?.scrollIntoView({behavior:'instant'});
    update();current=target;world.render(current);
    if(world.prepareTransition(section)){
      cameraTransition={start:performance.now(),duration:240,returning:true};world.renderTransition(1);
    }
  }
  revealPage();
}
if(document.readyState==='complete')enterJourney();else window.addEventListener('load',enterJourney,{once:true});
