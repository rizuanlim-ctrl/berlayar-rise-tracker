(()=>{
'use strict';
const $=s=>document.querySelector(s),controls=$('.unit-view-controls'),stack=$('#map-stack'),floor=$('#map-floor');
if(!controls||!stack||!floor)return;
const css='.site-interior-launch{grid-column:1/-1;width:100%;min-height:44px;padding:11px;border:1px solid #126041;border-radius:8px;background:#176548;color:white;font:inherit;font-weight:700;cursor:pointer}.site-interior-launch:focus-visible,.site-interior-back:focus-visible{outline:3px solid #c87e33;outline-offset:3px}.site-interior-layer{position:fixed;inset:0;z-index:2000;background:#161b1c;display:none;flex-direction:column;color:white}.site-interior-layer[data-open=true]{display:flex}.site-interior-header{flex:none;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 14px;background:#163c2d}.site-interior-header strong{font-size:15px}.site-interior-header small{display:block;font-size:12px;margin-top:4px;opacity:.85}.site-interior-back{background:#fff!important;color:#164d37!important;border:1px solid #a8cab4!important;border-radius:8px;padding:9px 12px;min-height:44px;font-weight:700;cursor:pointer}.site-interior-frame{width:100%;flex:1;min-height:0;border:0;background:#141719}.site-interior-note{font-size:11px;padding:6px 14px;background:#202b27;color:#d4ddd6;line-height:1.4}body.site-interior-active{overflow:hidden!important}@media(max-width:600px){.site-interior-header{padding:8px 10px}.site-interior-header strong{font-size:13px}.site-interior-back{font-size:12px!important}}';
const style=document.createElement('style');style.textContent=css;document.head.append(style);
const button=document.createElement('button');button.type='button';button.className='site-interior-launch';button.textContent='Enter selected unit · 3D walkthrough';controls.append(button);
const layer=document.createElement('div');layer.className='site-interior-layer';layer.dataset.open='false';layer.setAttribute('role','region');layer.setAttribute('aria-label','Unit interior walkthrough');
const header=document.createElement('div'),title=document.createElement('div'),back=document.createElement('button');
header.className='site-interior-header';back.type='button';back.className='site-interior-back';back.textContent='← Back to 3D site';header.append(title,back);
const note=document.createElement('div');note.className='site-interior-note';note.textContent='Illustrative interior and surroundings · Layouts, orientation and future views are approximate.';
layer.append(header,note);document.body.append(layer);
let frame=null,previousFocus=null,previousScroll=null;
function close(){
 if(layer.dataset.open!=='true')return;layer.dataset.open='false';document.body.classList.remove('site-interior-active');frame?.remove();frame=null;
 if(previousScroll!==null)document.body.style.overflow=previousScroll;
 (previousFocus?.isConnected?previousFocus:button).focus({preventScroll:true});
}
function open(){
 const unit=stack.value,storey=Number(floor.value);if(!/^\d{3}$/.test(unit)||!Number.isInteger(storey)||storey<1)return;
 previousFocus=document.activeElement;previousScroll=document.body.style.overflow;
 const strong=document.createElement('strong');strong.textContent='Stack '+unit+' · Floor '+String(storey).padStart(2,'0');
 const small=document.createElement('small');small.textContent='Interior walkthrough · Berlayar Rise';
 title.replaceChildren(strong,small);
 frame=document.createElement('iframe');frame.className='site-interior-frame';frame.title='Interactive walkthrough for stack '+unit+' at floor '+storey;frame.allow='fullscreen';frame.src='/stack-139-walkthrough.html?'+new URLSearchParams({embedded:'1',stack:unit,floor:String(storey),v:'site-joined-20261122'});
 layer.append(frame);layer.dataset.open='true';document.body.classList.add('site-interior-active');back.focus({preventScroll:true});
}
button.addEventListener('click',open);back.addEventListener('click',close);
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===frame?.contentWindow&&e.data==='close-unit-walkthrough')close();});
document.addEventListener('keydown',e=>{if(layer.dataset.open==='true'&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}},true);
})();