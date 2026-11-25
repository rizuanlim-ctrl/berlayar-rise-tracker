/* Berlayar Rise immersive tour: one visual shell across exterior and interior renderers. */
(()=>{
'use strict';
const $=s=>document.querySelector(s),controls=$('.unit-view-controls'),stack=$('#map-stack'),floor=$('#map-floor');
if(!controls||!stack||!floor)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const css='.site-enter-unit{grid-column:1/-1;width:100%;min-height:46px;padding:11px 14px;background:#176548!important;color:white!important;border:1px solid #126041!important;border-radius:9px;cursor:pointer;font-weight:700}.site-enter-unit:focus-visible,.tour-return:focus-visible{outline:3px solid #c87e33;outline-offset:3px}.tour-shell{position:fixed;inset:0;z-index:3000;display:none;flex-direction:column;background:#0f1f19;color:#fff;overflow:hidden}.tour-shell[data-open=true]{display:flex}.tour-head{z-index:5;flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:60px;padding:9px 14px;background:#153e2c;color:#fff}.tour-head strong{font-size:15px}.tour-head small{display:block;font-size:12px;margin-top:3px;opacity:.85}.tour-return{min-height:44px;padding:9px 13px;border-radius:8px;border:1px solid #a1c4ac;background:white;color:#165035;cursor:pointer;font-weight:700}.tour-stage{position:relative;flex:1;min-height:0;background:#111b18;overflow:hidden}.tour-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#111b18;opacity:0;transition:opacity .85s cubic-bezier(.2,.7,.1,1)}.tour-frame.is-ready{opacity:1}.tour-portal{position:absolute;inset:0;background:#dfeae3;z-index:3;pointer-events:none;opacity:1;transition:opacity 1.05s cubic-bezier(.3,.65,.2,1);transform-origin:50% 50%;overflow:hidden}.tour-portal img{position:absolute;width:100%;height:100%;object-fit:cover;transform:scale(1);transition:transform 1.3s cubic-bezier(.2,.7,.1,1)}.tour-portal.is-entering img{transform:scale(1.55)}.tour-portal.is-hidden{opacity:0}.tour-veil{position:absolute;inset:0;z-index:4;pointer-events:none;background:radial-gradient(circle at var(--portal-x,50%) var(--portal-y,50%),transparent 0%,#102d21 100%);opacity:0;transition:opacity .65s ease}.tour-veil.active{opacity:.33}.tour-caption{position:absolute;left:50%;top:50%;z-index:5;transform:translate(-50%,-50%);background:#183d2edd;color:white;border:1px solid #ffffff5c;border-radius:10px;padding:12px 20px;text-align:center;pointer-events:none;font-size:15px;opacity:0;transition:opacity .3s}.tour-caption.visible{opacity:1}.tour-footer{z-index:5;flex:none;background:#182d24;padding:7px 14px;font-size:11px;color:#d0ded6}.tour-shell .tour-head button:focus-visible{outline:3px solid #dba367;outline-offset:2px}body.tour-open{overflow:hidden!important}@media(max-width:600px){.tour-head{padding:7px 10px}.tour-head strong{font-size:13px}.tour-head small{font-size:11px}.tour-return{font-size:12px!important}.tour-footer{font-size:10px}}@media(prefers-reduced-motion:reduce){.tour-portal,.tour-portal img,.tour-frame,.tour-veil,.tour-caption{transition:none!important}}';
const style=document.createElement('style');style.textContent=css;document.head.append(style);
const enter=document.createElement('button');enter.type='button';enter.className='site-enter-unit';enter.textContent='Enter selected flat · immersive tour';controls.append(enter);
const shell=document.createElement('div');shell.className='tour-shell';shell.dataset.open='false';shell.setAttribute('role','region');shell.setAttribute('aria-label','Berlayar Rise connected 3D tour');
shell.innerHTML='<div class="tour-head"><div class="tour-title"></div><button type="button" class="tour-return">← Return to site</button></div><div class="tour-stage"><div class="tour-portal"><img alt=""></div><div class="tour-veil"></div><div class="tour-caption" aria-live="polite">Entering selected flat…</div></div><div class="tour-footer">Illustrative 3D models · Positions, views and future structures are approximate, not a guarantee.</div>';
document.body.append(shell);
const stage=shell.querySelector('.tour-stage'),portal=shell.querySelector('.tour-portal'),portalImage=shell.querySelector('.tour-portal img'),veil=shell.querySelector('.tour-veil'),caption=shell.querySelector('.tour-caption'),back=shell.querySelector('.tour-return');
let frame=null,oldFocus=null,oldOverflow='',phase='outside',closeToken=0;
const schedule=(fn,ms)=>setTimeout(fn,reduced.matches?0:ms);
const canonicalDate=(year,month,day)=>String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
const time=hour=>String(Math.floor(hour)).padStart(2,'0')+':'+String(Math.round((hour%1)*60)).padStart(2,'0');
function snapshot(){
 const source=$('#street-scene:not([hidden])')??$('#scene');if(!(source instanceof HTMLCanvasElement))return '';
 try{return source.toDataURL('image/jpeg',.83)}catch{return ''}
}
function portalOrigin(){
 const selected=stack.value;
 // The site's projected stack marker gives the animation its entry location.
 let px=50,py=50;
 try{
  const hit=hits.find(h=>h.stack===selected);
  if(hit&&Number.isFinite(hit.marker[0])&&Number.isFinite(hit.marker[1])){
   const canvas=$('#scene');px=100*hit.marker[0]/canvas.clientWidth;py=100*hit.marker[1]/canvas.clientHeight;
  }
 }catch{}
 px=Math.max(12,Math.min(88,px));py=Math.max(12,Math.min(88,py));
 veil.style.setProperty('--portal-x',px+'%');veil.style.setProperty('--portal-y',py+'%');
 portal.querySelector('img').style.transformOrigin=px+'% '+py+'%';
}
function clearFrame(){if(frame){frame.src='about:blank';frame.remove();frame=null}}
function open(){
 if(phase!=='outside')return;
 const unit=stack.value,level=Number(floor.value);if(!/^\d{3}$/.test(unit)||!Number.isInteger(level)||level<1)return;
 const token=++closeToken;
 oldFocus=document.activeElement;oldOverflow=document.body.style.overflow;
 const title=shell.querySelector('.tour-title');
 title.replaceChildren();
 const main=document.createElement('strong');main.textContent='Berlayar Rise · #'+String(level).padStart(2,'0')+'-'+unit;
 const sub=document.createElement('small');sub.textContent='3D precinct → same-scene exterior flight → interior';
 title.append(main,sub);
 portalOrigin();const src=snapshot();portalImage.src=src||'';
 portal.style.opacity='1';portal.classList.remove('is-hidden','is-entering');
 veil.classList.remove('active');
 caption.textContent='Approaching #'+String(level).padStart(2,'0')+'-'+unit;caption.classList.add('visible');
 shell.dataset.open='true';document.body.classList.add('tour-open');phase='entering';back.focus({preventScroll:true});
 const params=new URLSearchParams({embedded:'1',stack:unit,floor:String(level),view:'exterior',v:'fused-20261122'});
 try{
  params.set('sunDate',canonicalDate(state.sunYear,state.sunMonth,state.sunDay));
  params.set('sunTime',time(state.sunHour));
 }catch{}
 frame=document.createElement('iframe');frame.className='tour-frame';frame.title='Berlayar Rise flat #'+level+'-'+unit+' 3D interior';frame.allow='fullscreen';frame.src='/stack-139-walkthrough.html?'+params;
 stage.prepend(frame);
 const reveal=()=>{
  if(token!==closeToken||phase!=='entering')return;
  portal.classList.add('is-entering');veil.classList.add('active');
  frame.classList.add('is-ready');
  schedule(()=>{if(token!==closeToken||phase!=='entering')return;portal.classList.add('is-hidden');veil.classList.remove('active');caption.classList.remove('visible');phase='inside';},reduced.matches?0:550);
 };
 frame.addEventListener('load',reveal,{once:true});
 // If a browser blocks or stalls the iframe, do not leave the site unusable.
 frame.addEventListener('error',()=>{if(token===closeToken){caption.textContent='3D environment could not load. Return to the site and try again.';}},{once:true});
}
function close(){
 if(phase==='outside')return;
 const token=++closeToken;
 phase='returning';caption.textContent='Returning to the Berlayar Rise site…';caption.classList.add('visible');
 portal.classList.remove('is-hidden','is-entering');portal.style.opacity='0';veil.classList.add('active');
 if(frame)frame.classList.remove('is-ready');
 schedule(()=>{
  if(token!==closeToken)return;
  portal.style.opacity='1';veil.classList.remove('active');
  schedule(()=>{
   if(token!==closeToken)return;
   clearFrame();shell.dataset.open='false';document.body.classList.remove('tour-open');document.body.style.overflow=oldOverflow;
   caption.classList.remove('visible');phase='outside';(oldFocus?.isConnected?oldFocus:enter).focus({preventScroll:true});
  },reduced.matches?0:350);
 },reduced.matches?0:370);
}
enter.addEventListener('click',open);back.addEventListener('click',close);
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===frame?.contentWindow&&e.data==='close-unit-walkthrough')close()});
document.addEventListener('keydown',e=>{if(phase!=='outside'&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close()}},true);
})();