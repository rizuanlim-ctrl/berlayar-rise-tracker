/* Share the actual block-by-block selection summary, not a separate KPI card. */
(()=>{
'use strict';
const rooms={'2R':'2-Room','3R':'3-Room','4R':'4-Room'};
const query=new URLSearchParams(location.search);
const linked=query.get('summary');
const requested=Object.hasOwn(rooms,linked)?linked:null;
const $=s=>document.querySelector(s);
const getModal=()=>$('#berlayar-summary-modal');
const getActive=()=>getModal()?.querySelector('.bs-room-tabs button[aria-pressed="true"]')?.dataset.room||'2R';
const url=room=>location.origin+location.pathname+'?summary='+encodeURIComponent(room);
const sheet=document.createElement('style');
sheet.textContent='.bs-share-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.bs-share-actions button{min-height:40px;padding:7px 11px;border-radius:8px;border:1px solid #749984;background:#fff;color:#17452f;font:inherit;font-size:13px;cursor:pointer;white-space:normal}.bs-share-actions button:disabled{opacity:.6;cursor:wait}.bs-share-actions .bs-share-notice{font-size:12px;color:#236444;max-width:170px;line-height:1.3}.room-summary-toolbar{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0;padding:12px;border:1px solid #8ca797;border-radius:10px;background:#edf4ef;color:#173e2c;align-items:center}.room-summary-toolbar{flex-direction:column;align-items:stretch}.room-summary-heading{font-weight:800;font-size:20px}.room-summary-room-buttons{display:flex;flex-wrap:wrap;gap:8px}.room-summary-room-buttons button{flex:1 1 140px}.room-summary-toolbar button,.room-summary-toolbar a{font:inherit;min-height:40px;border:1px solid #66917c;border-radius:7px;padding:7px 10px;background:#fff;color:#174b35;text-decoration:none;cursor:pointer}.room-summary-toolbar .room-summary-room-buttons button[aria-pressed=true]{background:#1d513a;color:#fff;border-color:#1d513a}.room-summary-actions{display:flex;gap:8px;flex-wrap:wrap}.room-summary-actions>*{flex:1 1 150px;text-align:center}html[data-tracker-theme=dark] .room-summary-toolbar{background:#20372a;color:#e2eee6}html[data-tracker-theme=dark] .room-summary-toolbar button,html[data-tracker-theme=dark] .room-summary-toolbar a{background:#243e30;color:#e2eee6}.bs-share-actions button:focus-visible,.room-summary-toolbar button:focus-visible{outline:3px solid #be6c23;outline-offset:2px}@media(max-width:750px){#berlayar-summary-modal .bs-head{flex-wrap:wrap}.bs-share-actions{width:100%}.bs-share-actions button{flex:1}.bs-share-actions .bs-share-notice{flex:1 0 100%;max-width:100%}}';
document.head.append(sheet);
let chosenRoom=requested||'2R';
function chooseRoom(room){
 if(!Object.hasOwn(rooms,room))return;
 chosenRoom=room;
 document.querySelectorAll('.room-summary-room-buttons button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.room===room)));
 const link=$('#room-summary-open-link');if(link)link.href=url(room);
}
function addToolbar(){
 if($('.room-summary-toolbar')||!$('#root .roomrow'))return;
 const bar=document.createElement('section');bar.className='room-summary-toolbar';bar.setAttribute('aria-label','Room Summary');
 bar.innerHTML='<div class="room-summary-heading">Room Summary</div><div class="room-summary-room-buttons" role="group" aria-label="Choose room type"><button type="button" data-room="2R">2-Room Flexi</button><button type="button" data-room="3R">3-Room</button><button type="button" data-room="4R">4-Room</button></div><div class="room-summary-actions"><a id="room-summary-open-link" href="'+url(chosenRoom)+'">Open full summary</a><button type="button" id="room-summary-copy-link">Copy link</button></div>';
 $('#root .roomrow').insertAdjacentElement('afterend',bar);
 bar.querySelector('.room-summary-room-buttons').addEventListener('click',e=>{const button=e.target.closest('button[data-room]');if(button)chooseRoom(button.dataset.room)});
 $('#room-summary-copy-link').onclick=()=>copy(chosenRoom,$('#room-summary-copy-link'));
 chooseRoom(chosenRoom);
}
async function copy(room,button){
 const value=url(room);
 try{await navigator.clipboard.writeText(value);const prior=button.textContent;button.textContent='Copied!';setTimeout(()=>{if(button.isConnected)button.textContent=prior},1600)}
 catch{window.prompt('Copy summary link',value)}
}
function save(blob,filename){
 const a=document.createElement('a'),objectUrl=URL.createObjectURL(blob);
 a.href=objectUrl;a.download=filename;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(objectUrl),2500);
}
function rounded(ctx,x,y,w,h,r,fill,stroke){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);
 if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke()}
}
function drawText(ctx,s,x,y,max,size=18,color='#173b29',weight=500,align='left'){
 ctx.fillStyle=color;ctx.font=String(weight)+' '+size+'px Arial, sans-serif';ctx.textAlign=align;ctx.textBaseline='middle';
 ctx.fillText(s,x,y,max);
}
function makeCanvasFromSummary(){
 const modal=getModal(),body=modal?.querySelector('.bs-body');
 const stats=body?.querySelector('.bs-stats'),blocks=[...(body?.querySelectorAll('.bs-block-panel')||[])];
 if(!stats||!blocks.length)throw Error('Summary grid is still loading. Please retry after the unit tables appear.');
 const room=getActive(),cols=blocks.length,W=2048,pad=32,gap=12,gridW=W-pad*2,blockW=(gridW-gap*(cols-1))/cols;
 const maxRows=Math.max(...blocks.map(b=>b.querySelectorAll('tbody tr').length));
 const rowH=30,headH=130,metricsH=90,blockTop=headH+metricsH+6,tableTop=blockTop+132;
 const footerY=tableTop+(maxRows+1)*rowH+30,H=footerY+110;
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('PNG rendering is unsupported on this device.');
 ctx.fillStyle='#f6f8f5';ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#1d513a';ctx.fillRect(0,0,W,headH);
 drawText(ctx,'BERLAYAR RISE · SELECTION SUMMARY',pad,39,W-2*pad,24,'#d8efe0',700);
 drawText(ctx,rooms[room]+' · All Blocks',pad,90,W-2*pad,44,'#ffffff',800);
 const chips=[...stats.querySelectorAll('span')].map(e=>e.textContent.trim());
 let x=pad;for(const chip of chips){
  ctx.font='700 24px Arial';const w=Math.min(620,ctx.measureText(chip).width+42);
  rounded(ctx,x,headH+19,w,54,10,'#e4eee6');drawText(ctx,chip,x+20,headH+47,w-36,24,'#234b35',700);x+=w+13;
 }
 for(let i=0;i<cols;i++){
  const el=blocks[i],left=pad+i*(blockW+gap),centre=left+blockW/2;
  drawText(ctx,el.querySelector('h3')?.textContent.trim()||'',centre,blockTop+20,blockW-5,Math.min(27,20+cols), '#173b29',800,'center');
  drawText(ctx,el.querySelector('.bs-block-count')?.textContent.trim()||'',centre,blockTop+52,blockW-5,20,'#476150',500,'center');
  const badges=[...el.querySelectorAll('.bs-ethnic-badge')],badgeSize=badges.length,quotaSize=Math.min(20,Math.max(14,blockW/(badgeSize*4.5)));
  badges.forEach((badge,j)=>{
   const text=badge.textContent.trim(),cx=centre+(j-(badgeSize-1)/2)*(blockW/badgeSize*.94);
   const color=badge.classList.contains('bs-ethnic-m')?'#11834c':badge.classList.contains('bs-ethnic-c')?'#bd3037':'#925c00';
   const fill=badge.classList.contains('bs-ethnic-m')?'#dff3e6':badge.classList.contains('bs-ethnic-c')?'#fce6e6':'#ffefc8';
   let bw=blockW/badgeSize*.88;
   rounded(ctx,cx-bw/2,blockTop+77,bw,31,5,fill);
   drawText(ctx,text,cx,blockTop+92,bw-7,quotaSize,color,800,'center');
  });
  const table=el.querySelector('table'),headers=[...table.querySelectorAll('thead th')].map(h=>h.textContent.trim());
  const tcols=headers.length,cellW=blockW/tcols,size=Math.max(8,Math.min(15,cellW/3.8));
  const cells=[headers,...[...table.querySelectorAll('tbody tr')].map(tr=>[...tr.children].map(td=>({text:td.textContent.trim(),cls:td.className})))];
  cells.forEach((row,j)=>row.forEach((c,k)=>{
   const cell=typeof c==='string'?{text:c,cls:'header'}:c;
   const bg=cell.cls.includes('taken')?'#f0a4c4':cell.cls.includes('available')?'#9cddba':cell.cls.includes('unverified')?'#cbd2dc':cell.cls.includes('bs-gap')?'#e6eae7':'#e5eee7';
   ctx.fillStyle=bg;ctx.fillRect(left+k*cellW,tableTop+j*rowH,cellW,rowH);
   ctx.strokeStyle='#a9c2b3';ctx.lineWidth=.7;ctx.strokeRect(left+k*cellW,tableTop+j*rowH,cellW,rowH);
   const tone=cell.cls.includes('taken')?'#651b3c':'#0b4930';
   drawText(ctx,cell.text, left+(k+.5)*cellW,tableTop+(j+.5)*rowH,cellW-3,k===0?Math.max(9,size-1):size,tone,k===0?800:700,'center');
  }));
 }
 drawText(ctx,'Tap a unit on the live tracker for price and status.',pad,footerY,W-pad*2,23,'#35543f',500);
 rounded(ctx,pad,footerY+27,25,23,0,'#9cddba','#6d9e86');drawText(ctx,'Available',pad+36,footerY+40,180,21,'#35543f');
 rounded(ctx,pad+220,footerY+27,25,23,0,'#f0a4c4','#8f6980');drawText(ctx,'Taken',pad+256,footerY+40,150,21,'#35543f');
 drawText(ctx,'M / C / I/O = ethnic quota remaining',pad+420,footerY+40,W-pad-430,21,'#35543f');
 drawText(ctx,'Community-recorded data · Verify official availability with HDB · berlayar-rise-tracker.vercel.app',pad,footerY+79,W-2*pad,16,'#5b715f');
 return {canvas,room};
}
async function download(button){
 button.disabled=true;const original=button.textContent;button.textContent='Preparing PNG…';
 try{const {canvas,room}=makeCanvasFromSummary();const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image export failed')),'image/png'));save(blob,'Berlayar-Rise-'+room+'-Full-Unit-Summary.png');}
 catch(e){window.alert(e.message||'Could not export PNG. Please retry.')}
 finally{button.disabled=false;button.textContent=original}
}
function addModalActions(){
 const modal=getModal(),head=modal?.querySelector('.bs-head');
 if(!head||head.querySelector('.bs-share-actions'))return;
 const actions=document.createElement('div');actions.className='bs-share-actions';
 const copyButton=document.createElement('button');copyButton.type='button';copyButton.textContent='Copy summary link';
 const pngButton=document.createElement('button');pngButton.type='button';pngButton.textContent='Download full PNG';
 copyButton.onclick=()=>copy(getActive(),copyButton);pngButton.onclick=()=>download(pngButton);
 const close=head.querySelector('#berlayar-summary-close');actions.append(copyButton,pngButton);close?.before(actions);
}
function openRequested(){
 if(!requested||window.__berlayarSummaryLinkOpened)return;
 const trigger=$('#berlayar-summary-open'),modal=getModal();
 if(!trigger||!modal)return;
 window.__berlayarSummaryLinkOpened=true;
 trigger.click();
 const tab=modal.querySelector('.bs-room-tabs button[data-room="'+requested+'"]');
 tab?.click();
}
function update(){
 addToolbar();addModalActions();openRequested();
}
const observer=new MutationObserver(()=>{if(!$('.room-summary-toolbar')||!getModal()?.querySelector('.bs-share-actions')||(requested&&!window.__berlayarSummaryLinkOpened))update()});
observer.observe(document.body,{childList:true,subtree:true});
update();
setInterval(()=>{if(!$('.room-summary-toolbar')||!getModal()?.querySelector('.bs-share-actions')||(requested&&!window.__berlayarSummaryLinkOpened))update()},2000);
})();