/* Read-only reconciliation. Does not mutate tracker state or personal shortlists. */
import {n as effective,r as quota} from './tracker-combined-export-v1.js?v=quota-20261105';
const API='https://berlayar-rise-tracker.rizuanlim.chatgpt.site/api/tracker';
const OPEN={'200A':[145,38,21],'200B':[152,40,22],'201A':[155,41,23],'201B':[145,38,21],'204A':[128,34,19],'204B':[108,29,16]};
const REMAIN={'200A':[144,38,21],'200B':[151,40,22],'201A':[154,41,21],'201B':[136,37,20],'204A':[120,34,18],'204B':[105,29,15]};
const RACES=['Chinese','Malay','Indian / Other'];
let node,previous='';
const style=document.createElement('style');
style.textContent='.quota-reconcile{border:1px solid #8ea999;border-radius:10px;padding:12px;margin:12px 0;color:inherit;background:transparent}.quota-reconcile strong{font-weight:800}.quota-reconcile table{width:100%;border-collapse:collapse;font-size:14px}.quota-reconcile th,.quota-reconcile td{text-align:left;padding:6px;border-bottom:1px solid #8ea999}.quota-reconcile .qr-scroll{overflow-x:auto}.quota-reconcile p{margin:6px 0;font-size:14px}';
document.head.append(style);
function mount(){if(node?.isConnected)return;const anchor=document.getElementById('community-counter');if(!anchor)return;node=document.createElement('section');node.className='quota-reconcile';node.setAttribute('aria-label','Quota reconciliation');anchor.insertAdjacentElement('afterend',node)}
function esc(v){return String(v).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
async function refresh(){mount();if(!node)return;try{const response=await fetch(API,{cache:'no-store'});if(!response.ok)throw Error('service unavailable');const data=await response.json();if(!data.state?.quotas||!data.state?.overrides)throw Error('invalid state');if(data.revision===previous)return;previous=data.revision;const all=effective(data.state);let html='<strong>Ethnic quota reconciliation</strong><p>Quota usage is based on block totals, not assumed buyer ethnicity.</p><div class="qr-scroll"><table><thead><tr><th>Room</th><th>Block</th><th>Units selected</th><th>Quota used</th><th>Difference</th></tr></thead><tbody>';
for(const room of ['2R','4R']){const blocks=[...new Set(all.filter(u=>u.room===room).map(u=>u.block))].sort();for(const block of blocks){const selected=all.filter(u=>u.room===room&&u.block===block&&u.status==='Taken').length;let used=null;if(room==='2R'){used=RACES.reduce((sum,r)=>sum+quota(data.state,all,room,block,r).taken,0)}if(room==='4R'&&OPEN[block]){used=RACES.reduce((sum,r,i)=>sum+OPEN[block][i]-(data.state.quotas['4R|'+block+'|'+r]??REMAIN[block][i]),0)}const diff=used===null?'Pending':selected-used;html+='<tr><td>'+room+'</td><td>'+esc(block)+'</td><td>'+selected+'</td><td>'+(used??'Pending')+'</td><td>'+diff+'</td></tr>'}}
node.innerHTML=html+'</tbody></table></div><p>2-room quota usage uses fixed opening minus HDB remaining quotas recorded 5 Nov 2026 for 200A, 201A and 204A; other blocks retain previous figures. Differences flag records for review; they do not alter selections.</p>';
}catch(e){node.textContent='Quota reconciliation temporarily unavailable.'}}
new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});mount();refresh();setInterval(refresh,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
