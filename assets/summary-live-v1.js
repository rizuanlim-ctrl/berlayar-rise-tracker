import {n as effective,r as quota,t as races} from './tracker-combined-export-v1.js?v=quota-sync-20261104';
const API='https://berlayar-rise-tracker.rizuanlim.chatgpt.site/api/tracker';
const rooms=['2R','3R','4R'];let snapshot=null,revision=null,opened=false,activeRoom='2R';let selectedUnit=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=r=>r.replace('R','-Room');
const style=document.createElement('style');style.textContent=`
#berlayar-summary-modal{position:fixed;inset:0;z-index:99999;background:#f5f8f5;color:#20392b;overflow:hidden;display:flex;flex-direction:column;padding:0}
#berlayar-summary-modal[hidden]{display:none}
#berlayar-summary-modal .bs-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 18px;border-bottom:1px solid #b8c8bb;flex:none}
#berlayar-summary-modal .bs-head h2{margin:0;font-size:21px}
#berlayar-summary-modal .bs-head button{font:inherit;min-height:40px;padding:7px 14px;cursor:pointer}
#berlayar-summary-modal .bs-room-tabs,#berlayar-summary-modal .bs-block-tabs{display:flex;gap:6px;flex:none}
#berlayar-summary-modal .bs-room-tabs{padding:9px 14px}
#berlayar-summary-modal .bs-room-tabs button,#berlayar-summary-modal .bs-block-tabs button{min-height:40px;padding:6px 12px;border:1px solid #668c76;border-radius:7px;background:transparent;color:inherit;font:inherit;font-weight:750;cursor:pointer}
#berlayar-summary-modal .bs-room-tabs button{flex:1}
#berlayar-summary-modal button[aria-pressed=true]{background:#d5e8dc;color:#173b29;box-shadow:inset 0 0 0 1px #416e53}
#berlayar-summary-modal .bs-body{padding:0 14px 10px;flex:1;min-height:0;display:flex;flex-direction:column;gap:7px;overflow:hidden}
#berlayar-summary-modal .bs-stats{display:flex;flex-wrap:wrap;gap:6px;font-size:16px;flex:none}
#berlayar-summary-modal .bs-stats span{background:#e8f1e9;border-radius:5px;padding:5px 8px;font-weight:700}
#berlayar-summary-modal .bs-block-tabs{flex-wrap:wrap}
#berlayar-summary-modal .bs-block-tabs button{flex:1;white-space:nowrap}
#berlayar-summary-modal .bs-quota{font-size:13px;line-height:1.3;flex:none}
#berlayar-summary-modal .bs-grid{flex:1;min-height:0;overflow:hidden;border:1px solid #9fb5a6;border-radius:6px}
#berlayar-summary-modal table{width:100%;height:100%;min-height:0;border-collapse:collapse;table-layout:fixed;font-size:var(--fit-font,11px);line-height:1}
#berlayar-summary-modal th,#berlayar-summary-modal td{border:1px solid #bacbbf;text-align:center;padding:0;height:var(--fit-row,14px);white-space:nowrap}
#berlayar-summary-modal th{background:#e5eee7;font-weight:800}
#berlayar-summary-modal th:first-child{width:18px}
#berlayar-summary-modal thead th{position:sticky;top:0;z-index:1}
#berlayar-summary-modal td.available{background:#9cddba;color:#0b4930}
#berlayar-summary-modal td.taken{background:#f0a4c4;color:#651b3c}
#berlayar-summary-modal td.unverified{background:#cbd2dc;color:#202b3b}
#berlayar-summary-modal td button{font:inherit;font-weight:700;color:inherit;background:transparent;border:0;width:100%;height:100%;min-height:0;padding:0;cursor:pointer}
#berlayar-summary-modal td button:focus-visible{outline:2px solid #163f2b;outline-offset:-2px}
#berlayar-summary-modal .bs-unit-info{flex:none;min-height:20px;font-size:13px;line-height:1.4}
#berlayar-summary-modal .bs-legend{flex:none;font-size:12px;display:flex;gap:14px;align-items:center}
#berlayar-summary-modal .bs-legend span:before{content:'';display:inline-block;width:10px;height:10px;margin-right:5px;border:1px solid #769581}
#berlayar-summary-modal .bs-legend .available:before{background:#9cddba}
#berlayar-summary-modal .bs-legend .taken:before{background:#f0a4c4}
html[data-tracker-theme=dark] #berlayar-summary-modal .bs-room-tabs,html[data-tracker-theme=dark] #berlayar-summary-modal .bs-body{background:#14271e;color:#e2eee6}
html[data-tracker-theme=dark] #berlayar-summary-modal button[aria-pressed=true]{background:#38634a;color:#fff}
@media(max-width:600px){#berlayar-summary-modal .bs-head{padding:8px 10px}#berlayar-summary-modal .bs-head h2{font-size:18px}#berlayar-summary-modal .bs-room-tabs{padding:6px 8px}#berlayar-summary-modal .bs-body{padding:0 8px 6px;gap:5px}#berlayar-summary-modal .bs-block-tabs{gap:4px}#berlayar-summary-modal .bs-block-tabs button{flex:1 1 28%;min-height:34px;padding:4px 6px;font-size:12px}#berlayar-summary-modal .bs-quota,#berlayar-summary-modal .bs-stats{font-size:12px}#berlayar-summary-modal .bs-unit-info{font-size:12px}}

#berlayar-summary-modal .bs-all-blocks{display:grid;grid-template-columns:repeat(var(--blocks),minmax(0,1fr));gap:8px;flex:1;min-height:0;overflow:hidden}
#berlayar-summary-modal .bs-block-panel{display:flex;flex-direction:column;min-width:0;min-height:0;gap:4px}
#berlayar-summary-modal .bs-block-panel h3{font-size:16px;font-weight:900;margin:0;text-align:center}
#berlayar-summary-modal .bs-block-count{font-size:16px;text-align:center}
#berlayar-summary-modal .bs-block-quota{font-size:16px;min-height:40px;line-height:1.25;text-align:center}
#berlayar-summary-modal .bs-gap{background:#e6eae7;color:#718077}
#berlayar-summary-modal .bs-legend small{font-size:inherit}
@media(max-width:700px){#berlayar-summary-modal .bs-all-blocks{gap:3px}#berlayar-summary-modal .bs-block-panel h3{font-size:10px}#berlayar-summary-modal .bs-block-count,#berlayar-summary-modal .bs-block-quota{font-size:10px}#berlayar-summary-modal .bs-block-quota{min-height:40px}#berlayar-summary-modal th:first-child{width:10px}#berlayar-summary-modal .bs-legend{font-size:9px;gap:6px}}
`;document.head.append(style);
const modal=document.createElement('section');modal.id='berlayar-summary-modal';modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Berlayar Rise selection summary');
modal.innerHTML='<div class="bs-head"><h2>Berlayar Rise · Summary</h2><button type="button" id="berlayar-summary-close">Close ✕</button></div><nav class="bs-room-tabs" aria-label="Summary room type">'+rooms.map(r=>'<button type="button" data-room="'+r+'" aria-pressed="'+(r===activeRoom)+'">'+label(r)+'</button>').join('')+'</nav><div class="bs-body">Loading live records…</div>';document.body.append(modal);
modal.querySelector('.bs-room-tabs').onclick=event=>{const room=event.target.dataset.room;if(!rooms.includes(room))return;activeRoom=room;selectedUnit=null;render();};
modal.querySelector('.bs-body').onclick=event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.unit){selectedUnit=button.dataset.unit;showUnitInfo();}};
modal.querySelector('#berlayar-summary-close').onclick=()=>{opened=false;modal.hidden=true;document.body.style.overflow='';document.getElementById('berlayar-summary-open')?.focus();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened)modal.querySelector('#berlayar-summary-close').click()});
function fitGrid(){if(!opened)return;modal.querySelectorAll('.bs-grid').forEach(grid=>{const count=Number(grid.dataset.rows),cols=Number(grid.dataset.cols);const row=Math.max(1,Math.floor((grid.clientHeight-2)/count));const cellWidth=Math.max(1,(grid.clientWidth-21)/cols);grid.style.setProperty('--fit-row',row+'px');grid.style.setProperty('--fit-font',Math.max(3,Math.min(12,row-2,cellWidth/4.1))+'px');});}
new ResizeObserver(fitGrid).observe(modal);
function showUnitInfo(){const target=modal.querySelector('.bs-unit-info');if(!target)return;const u=selectedUnit&&effective(snapshot.state).find(u=>u.id===selectedUnit);target.textContent=u?'Block '+u.block+' · #'+u.unit+' · '+u.status+' · $'+Number(u.price).toLocaleString('en-SG'):'Tap a unit for its price and status.';}
function mountButton(){const current=document.getElementById('berlayar-summary-open');const counter=document.getElementById('counter-tab-trigger');if(current){if(counter){let group=counter.closest('.tracker-overview-actions');if(!group){group=document.createElement('div');group.className='tracker-overview-actions';counter.before(group);group.append(counter);}if(current.parentElement!==group||current.previousElementSibling!==counter)group.append(current);}return;}const target=document.querySelector('.app .roomtabs')||document.querySelector('.app .roomrow')||document.querySelector('.app');if(!target)return;const btn=document.createElement('button');btn.id='berlayar-summary-open';btn.type='button';btn.textContent='Summary';btn.onclick=()=>{opened=true;modal.hidden=false;document.body.style.overflow='hidden';render();refresh(true)};if(counter&&counter.parentElement){counter.insertAdjacentElement('afterend',btn)}else{const row=document.querySelector('.app .roomrow');if(row)row.appendChild(btn);else document.body.append(btn)}}

function render(){if(!opened)return;const body=modal.querySelector('.bs-body');if(!snapshot){body.textContent='Loading live records…';return;}
const all=effective(snapshot.state),group=all.filter(u=>u.room===activeRoom),blocks=[...new Set(group.map(u=>u.block))].sort(),taken=group.filter(u=>u.status==='Taken').length,maxFloor=Math.max(...group.map(u=>u.floor)),minFloor=Math.min(...group.map(u=>u.floor)),floors=Array.from({length:maxFloor-minFloor+1},(_,i)=>maxFloor-i);
modal.querySelectorAll('.bs-room-tabs button').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.room===activeRoom)));
body.innerHTML='<div class="bs-stats"><span>'+label(activeRoom)+' · Selected: '+taken+'</span><span>Remaining: '+(group.length-taken)+'</span><span>Total: '+group.length+'</span></div><div class="bs-all-blocks" style="--blocks:'+blocks.length+'">'+blocks.map(block=>{const rows=group.filter(u=>u.block===block),stacks=[...new Set(rows.map(u=>String(u.stack)))].sort((a,b)=>Number(a)-Number(b)),quotas=races.map(r=>{const q=quota(snapshot.state,all,activeRoom,block,r);return (r==='Malay'?'M':r==='Chinese'?'C':'I/O')+': '+(q.remaining??'—');}).join(' · ');
return '<section class="bs-block-panel"><h3>Block '+block+'</h3><div class="bs-block-count">'+rows.filter(u=>u.status==='Taken').length+' selected</div><div class="bs-block-quota" title="Ethnic quota remaining">'+quotas+'</div><div class="bs-grid" data-rows="'+(floors.length+1)+'" data-cols="'+stacks.length+'" style="--rows:'+(floors.length+1)+'"><table aria-label="'+label(activeRoom)+' Block '+block+' unit availability"><thead><tr><th>Fl</th>'+stacks.map(s=>'<th>'+s+'</th>').join('')+'</tr></thead><tbody>'+floors.map(f=>'<tr><th scope="row">'+f+'</th>'+stacks.map(s=>{const u=rows.find(u=>u.floor===f&&String(u.stack)===s);if(!u)return '<td class="bs-gap">—</td>';const cls=u.status==='Taken'?'taken':u.status==='Available'?'available':'unverified',info='Block '+block+' · #'+u.unit+' · '+u.status+' · $'+Number(u.price).toLocaleString('en-SG');return '<td class="'+cls+'"><button type="button" data-unit="'+esc(u.id)+'" title="'+esc(info)+'" aria-label="'+esc(info)+'">'+esc(u.unit)+'</button></td>';}).join('')+'</tr>').join('')+'</tbody></table></div></section>';}).join('')+'</div><div class="bs-unit-info" aria-live="polite"></div><div class="bs-legend"><span class="available">Available</span><span class="taken">Taken</span><small>M / C / I/O = ethnic quota remaining</small></div>';showUnitInfo();requestAnimationFrame(fitGrid);}
async function refresh(force=false){try{const response=await fetch(API,{cache:'no-store'});if(!response.ok)throw Error('Live service unavailable');const data=await response.json();if(!data.state?.overrides||!data.state?.quotas)throw Error('Invalid records');if(force||data.revision!==revision){snapshot=data;revision=data.revision;render()}document.dispatchEvent(new CustomEvent('berlayar-tracker-summary-refreshed',{detail:{revision}}))}catch(e){if(opened)console.warn('Summary refresh failed:',e)}}
new MutationObserver(mountButton).observe(document.getElementById('root')||document.body,{childList:true,subtree:true});mountButton();refresh();setInterval(()=>refresh(),15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true)});
