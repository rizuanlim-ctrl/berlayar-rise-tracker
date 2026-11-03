import {i as units,n as effective,r as quota,t as races} from './tracker-combined-export-v1.js?v=usability-20261009';
const API='https://berlayar-rise-tracker.rizuanlim.chatgpt.site/api/tracker';
const rooms=['2R','3R','4R'];let snapshot=null,revision=null,opened=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=r=>r.replace('R','-Room');
const style=document.createElement('style');style.textContent=`
#berlayar-summary-open{margin-left:8px;padding:10px 16px;border:1px solid #668c76;border-radius:9px;background:#e5f3e9;color:#153c2a;font-weight:750;cursor:pointer;min-height:44px}
#berlayar-summary-modal{position:fixed;inset:0;z-index:99999;background:#f5f8f5;color:#20392b;overflow:auto;padding:0}
#berlayar-summary-modal[hidden]{display:none}
#berlayar-summary-modal .bs-head{position:sticky;top:0;background:#f5f8f5;z-index:2;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 22px;border-bottom:1px solid #b8c8bb}
#berlayar-summary-modal .bs-head h2{margin:0;font-size:24px}
#berlayar-summary-modal .bs-head button{font-size:17px;padding:9px 16px;cursor:pointer}
#berlayar-summary-modal .bs-body{padding:16px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:start}
#berlayar-summary-modal .bs-room{min-width:0;background:white;border:1px solid #c7d6cb;border-radius:12px;padding:12px}
#berlayar-summary-modal h3{margin:0 0 10px;font-size:22px;font-weight:900!important;letter-spacing:.01em}
#berlayar-summary-modal .bs-stats{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
#berlayar-summary-modal .bs-stats span{background:#e8f1e9;border-radius:6px;padding:7px;font-weight:650}
#berlayar-summary-modal .bs-block{margin-top:14px;border-top:1px solid #ccd8ce;padding-top:10px}
#berlayar-summary-modal .bs-block h4{margin:0 0 8px}
#berlayar-summary-modal .bs-scroll{overflow:auto;max-height:430px}
#berlayar-summary-modal table{border-collapse:collapse;font-size:12px;white-space:nowrap}
#berlayar-summary-modal th,#berlayar-summary-modal td{border:1px solid #cad7cd;padding:5px 7px;text-align:center}
#berlayar-summary-modal th{background:#e5eee7;position:sticky;top:0;z-index:1}
#berlayar-summary-modal td.taken{background:#f0a4c4;color:#651b3c}
#berlayar-summary-modal td.available{background:#9cddba;color:#0b4930}
#berlayar-summary-modal td.unverified{background:#cbd2dc;color:#202b3b}
#berlayar-summary-modal .bs-quota{font-size:13px;margin:7px 0}
#berlayar-summary-modal .bs-note{padding:0 18px 18px;font-size:13px}
@media(max-width:1050px){#berlayar-summary-modal .bs-body{grid-template-columns:1fr}}
`;document.head.append(style);
const modal=document.createElement('section');modal.id='berlayar-summary-modal';modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Berlayar Rise selection summary');modal.innerHTML='<div class="bs-head"><h2>Berlayar Rise · Summary</h2><button type="button" id="berlayar-summary-close">Close ✕</button></div><div class="bs-body">Loading live records…</div>';document.body.append(modal);
modal.querySelector('#berlayar-summary-close').onclick=()=>{opened=false;modal.hidden=true;document.body.style.overflow=''};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened)modal.querySelector('#berlayar-summary-close').click()});
function mountButton(){const current=document.getElementById('berlayar-summary-open');const counter=document.getElementById('counter-tab-trigger');if(current){if(counter&&current.previousElementSibling!==counter)counter.insertAdjacentElement('afterend',current);return;}const target=document.querySelector('.app .roomtabs')||document.querySelector('.app .roomrow')||document.querySelector('.app');if(!target)return;const btn=document.createElement('button');btn.id='berlayar-summary-open';btn.type='button';btn.textContent='Summary';btn.onclick=()=>{opened=true;modal.hidden=false;document.body.style.overflow='hidden';render();refresh(true)};if(counter&&counter.parentElement){counter.insertAdjacentElement('afterend',btn)}else{const row=document.querySelector('.app .roomrow');if(row)row.appendChild(btn);else document.body.append(btn)}}
function render(){if(!opened)return;const body=modal.querySelector('.bs-body');if(!snapshot){body.textContent='Loading live records…';return}const all=effective(snapshot.state);body.innerHTML=rooms.map(room=>{const group=all.filter(u=>u.room===room);const taken=group.filter(u=>u.status==='Taken').length;let html='<section class="bs-room"><h3>'+label(room)+'</h3><div class="bs-stats"><span>Selected: '+taken+'</span><span>Remaining: '+(group.length-taken)+'</span><span>Total: '+group.length+'</span></div>';for(const block of [...new Set(group.map(u=>u.block))].sort()){const rows=group.filter(u=>u.block===block),stacks=[...new Set(rows.map(u=>String(u.stack)))].sort((a,b)=>Number(a)-Number(b)),floors=[...new Set(rows.map(u=>u.floor))].sort((a,b)=>b-a);const quotas=races.map(r=>{const q=quota(snapshot.state,all,room,block,r);return esc(r)+': '+(q.remaining===null?(q.opening===null?'Not provided':'Pending ethnicity'):q.remaining)}).join(' · ');html+='<div class="bs-block"><h4>Block '+esc(block)+' · '+rows.filter(u=>u.status==='Taken').length+' selected</h4><div class="bs-quota"><strong>Ethnic quota remaining:</strong> '+quotas+'</div><div class="bs-scroll"><table><thead><tr><th>Floor</th>'+stacks.map(s=>'<th>'+esc(s)+'</th>').join('')+'</tr></thead><tbody>'+floors.map(f=>'<tr><th>'+esc(f)+'</th>'+stacks.map(s=>{const u=rows.find(u=>u.floor===f&&String(u.stack)===s);if(!u)return '<td>—</td>';const status=u.status==='Taken'?'taken':u.status==='Available'?'available':'unverified';return '<td class="'+status+'" title="'+esc(u.unit)+' · '+esc(u.status)+'"><strong>'+esc(u.unit)+'</strong><div>'+(Number.isFinite(Number(u.price))?'$'+Number(u.price).toLocaleString('en-SG'):'Price N/A')+'</div><div>'+esc(u.status)+'</div></td>'}).join('')+'</tr>').join('')+'</tbody></table></div></div>'}return html+'</section>'}).join('');if(!response.ok)throw Error('Live service unavailable');const data=await response.json();if(!data.state?.overrides||!data.state?.quotas)throw Error('Invalid records');if(force||data.revision!==revision){snapshot=data;revision=data.revision;render()}document.dispatchEvent(new CustomEvent('berlayar-tracker-summary-refreshed',{detail:{revision}}))}catch(e){if(opened)console.warn('Summary refresh failed:',e)}}
new MutationObserver(mountButton).observe(document.getElementById('root')||document.body,{childList:true,subtree:true});mountButton();refresh();setInterval(()=>refresh(),15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true)});
