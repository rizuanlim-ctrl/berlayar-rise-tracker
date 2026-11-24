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
sheet.textContent='.bs-share-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.bs-share-actions button{min-height:40px;padding:7px 11px;border-radius:8px;border:1px solid #749984;background:#fff;color:#17452f;font:inherit;font-size:13px;cursor:pointer;white-space:normal}.bs-share-actions button:disabled{opacity:.6;cursor:wait}.bs-share-actions .bs-share-notice{font-size:12px;color:#236444;max-width:170px;line-height:1.3}.room-summary-toolbar{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0;padding:12px;border:1px solid #8ca797;border-radius:10px;background:#edf4ef;color:#173e2c;align-items:center}.room-summary-toolbar{flex-direction:column;align-items:stretch}.room-summary-heading{font-weight:800;font-size:20px}.room-summary-room-buttons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.room-summary-room-buttons button{min-width:0;white-space:normal;overflow-wrap:normal;text-align:center;font-weight:700;padding-inline:7px}.room-summary-toolbar button,.room-summary-toolbar a{font:inherit;min-height:40px;border:1px solid #66917c;border-radius:7px;padding:7px 10px;background:#fff;color:#174b35;text-decoration:none;cursor:pointer}.room-summary-toolbar .room-summary-room-buttons button[aria-pressed=true]{background:#1d513a;color:#fff;border-color:#1d513a}.room-summary-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.room-summary-actions>*{min-width:0;text-align:center;display:flex;justify-content:center;align-items:center;white-space:normal}html[data-tracker-theme=dark] .room-summary-toolbar{background:#20372a;color:#e2eee6}html[data-tracker-theme=dark] .room-summary-toolbar button,html[data-tracker-theme=dark] .room-summary-toolbar a{background:#243e30;color:#e2eee6}.bs-share-actions button:focus-visible,.room-summary-toolbar button:focus-visible{outline:3px solid #be6c23;outline-offset:2px}@media(max-width:750px){.room-summary-toolbar{padding:12px;gap:10px}.room-summary-heading{font-size:20px}.room-summary-room-buttons{gap:6px}.room-summary-room-buttons button{font-size:clamp(11px,3vw,14px);line-height:1.2;min-height:48px;padding:7px 4px}.room-summary-actions{gap:7px}.room-summary-actions>*{font-size:clamp(12px,3.2vw,15px);min-height:44px;padding:8px 5px}#berlayar-summary-modal .bs-head{flex-wrap:wrap}.bs-share-actions{width:100%}.bs-share-actions button{flex:1}.bs-share-actions .bs-share-notice{flex:1 0 100%;max-width:100%}}';
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
function makeMobileSummary(){
 const modal=getModal(),body=modal?.querySelector('.bs-body'),stats=body?.querySelector('.bs-stats'),blocks=[...(body?.querySelectorAll('.bs-block-panel')||[])];
 if(!stats||!blocks.length)throw Error('Summary is still loading. Please retry.');
 const room=getActive(),doc=document.implementation.createHTMLDocument('Berlayar Rise · '+rooms[room]+' Summary');
 const meta=doc.createElement('meta');meta.name='viewport';meta.content='width=device-width, initial-scale=1';doc.head.append(meta);
 const charset=doc.createElement('meta');charset.setAttribute('charset','utf-8');doc.head.prepend(charset);
 const style=doc.createElement('style');style.textContent=`*{box-sizing:border-box}body{margin:0;background:#f6f8f5;color:#173b29;font:15px system-ui,sans-serif}header{background:#1d513a;color:white;padding:20px}h1{font-size:24px;margin:5px 0}main{max-width:1100px;margin:auto;padding:12px}.metrics{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}.metrics span{background:#e4eee6;padding:9px;border-radius:8px;font-weight:700}.blocks{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}@media(min-width:650px){.blocks{grid-template-columns:repeat(2,minmax(0,1fr))}}section{background:white;border:1px solid #a9c2b3;border-radius:12px;padding:12px;min-width:0;break-inside:avoid}h2{margin:0 0 5px;font-size:20px}.quota{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.quota span{padding:5px 8px;border-radius:5px;font-weight:700;background:#e4eee6}.quota .bs-ethnic-m{background:#dff3e6;color:#11834c}.quota .bs-ethnic-c{background:#fce6e6;color:#a52b33}.quota .bs-ethnic-io{background:#ffefc8;color:#925c00}.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:clamp(10px,2.8vw,14px);text-align:center}td,th{border:1px solid #a9c2b3;padding:7px 3px;white-space:nowrap;background:#e5eee7}td.available{background:#9cddba;color:#0b4930}td.taken{background:#f0a4c4;color:#651b3c}td.unverified{background:#cbd2dc;color:#293547}td.bs-gap{background:#e6eae7}footer{padding:15px 0;line-height:1.6}a{color:#176542}button{font:inherit;padding:10px;border:1px solid #749984;border-radius:8px;background:white;color:#17452f} @media print{button{display:none}body{background:white}.blocks{display:block}section{margin-bottom:12px}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}}`;doc.head.append(style);
 const add=(parent,tag,value,cls)=>{const el=doc.createElement(tag);if(value!==undefined)el.textContent=value;if(cls)el.className=cls;parent.append(el);return el};
 const header=add(doc.body,'header');add(header,'div','BERLAYAR RISE · SELECTION SUMMARY');add(header,'h1',rooms[room]+' · All Blocks');add(header,'div','Snapshot: '+new Intl.DateTimeFormat('en-SG',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Singapore'}).format(new Date())+' SGT');
 const main=add(doc.body,'main'),metrics=add(main,'div',undefined,'metrics');for(const chip of stats.querySelectorAll('span'))add(metrics,'span',chip.textContent.trim());
 const legend=add(main,'p','Available = green · Taken = pink · Unverified = grey. M / C / I/O = remaining ethnic quota.');
 const grid=add(main,'div',undefined,'blocks');
 for(const block of blocks){const panel=add(grid,'section');add(panel,'h2',block.querySelector('h3')?.textContent.trim()||'');add(panel,'div',block.querySelector('.bs-block-count')?.textContent.trim()||'');const quota=add(panel,'div',undefined,'quota');for(const badge of block.querySelectorAll('.bs-ethnic-badge'))add(quota,'span',badge.textContent.trim(),badge.className);const wrap=add(panel,'div',undefined,'table-wrap'),table=add(wrap,'table');for(const group of ['thead','tbody']){const target=add(table,group);for(const row of block.querySelectorAll(group+' tr')){const tr=add(target,'tr');for(const cell of row.children)add(tr,cell.tagName.toLowerCase(),cell.textContent.trim(),cell.className)}}}
 const footer=add(main,'footer','Community-recorded snapshot. Verify official availability with HDB. ');const link=add(footer,'a','Open live room summary');link.href=url(room);
 return {blob:new Blob(['<!doctype html>\n'+doc.documentElement.outerHTML],{type:'text/html;charset=utf-8'}),room};
}
async function download(button){
 button.disabled=true;const original=button.textContent;button.textContent='Preparing summary…';
 try{const {blob,room}=makeMobileSummary();const filename='Berlayar-Rise-'+room+'-Mobile-Summary.html';const file=new File([blob],filename,{type:'text/html'});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'Berlayar Rise '+rooms[room]+' Summary'});return}catch(e){if(e.name==='AbortError')return}}save(blob,filename)}
 catch(e){window.alert(e.message||'Could not export summary. Please retry.')}
 finally{button.disabled=false;button.textContent=original}
}
function addModalActions(){
 const modal=getModal(),head=modal?.querySelector('.bs-head');
 if(!head||head.querySelector('.bs-share-actions'))return;
 const actions=document.createElement('div');actions.className='bs-share-actions';
 const copyButton=document.createElement('button');copyButton.type='button';copyButton.textContent='Copy summary link';
 const pngButton=document.createElement('button');pngButton.type='button';pngButton.textContent='Share / download summary';
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