(()=>{
'use strict';
const q=s=>document.querySelector(s),bar=q('.toolbar');
if(!bar)return;
const style=document.createElement('style');style.textContent=".region-launch{background:#e9f4ec!important;color:#174f35!important;font-weight:700!important}.region-panel{position:fixed;inset:0;z-index:2500;background:#edf3ee;color:#193e2c;display:none;overflow:auto;font:14px system-ui,Arial,sans-serif}.region-panel.open{display:block}.region-panel *{box-sizing:border-box}.region-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;background:#174f39;color:white}.region-head h2{margin:0;font-size:20px}.region-head button{min-height:44px;padding:8px 13px;border-radius:8px;border:0;background:white;color:#174f39;font:inherit;cursor:pointer}.region-layout{display:grid;grid-template-columns:minmax(350px,1.25fr) minmax(290px,1fr);gap:12px;padding:12px;max-width:1500px;margin:auto}.region-map{position:relative;min-height:520px;border-radius:12px;overflow:hidden;background:#dbe6df}.region-map iframe{border:0;width:100%;height:100%;min-height:520px}.region-map p{position:absolute;top:8px;left:10px;right:10px;background:#fffef4ed;padding:10px;border-radius:8px;font-size:12px;pointer-events:none}.region-data{background:white;padding:14px;border-radius:12px}.region-data h3{margin:0 0 6px}.region-filters{display:flex;flex-wrap:wrap;gap:8px;margin:13px 0}.region-filters select,.region-filters input{min-height:42px;border:1px solid #a6bea8;background:white;color:#173e2c;border-radius:8px;padding:8px;max-width:100%;font:inherit}.region-list{display:grid;gap:8px;max-height:56vh;overflow:auto}.region-place{padding:10px;border:1px solid #d3e1d7;border-radius:8px;background:#f6faf7}.region-place strong{display:block}.region-place p{font-size:12px;color:#536a59;margin:4px 0}.region-place a,.region-source a{color:#0b6242;text-decoration:underline;font-size:12px}.region-source{font-size:12px;border-top:1px solid #cbd9cb;margin-top:14px;padding-top:10px;line-height:1.9}.region-help{font-size:12px;color:#4d6656;line-height:1.5}@media(max-width:850px){.region-layout{grid-template-columns:1fr}.region-map,.region-map iframe{min-height:360px}.region-list{max-height:none}}";document.head.append(style);
const btn=document.createElement('button');btn.type='button';btn.className='region-launch';btn.textContent='5 km surroundings';bar.append(btn);
const panel=document.createElement('section');panel.className='region-panel';panel.setAttribute('role','region');panel.setAttribute('aria-label','Five kilometre surroundings context');
panel.innerHTML='<div class="region-head"><div><h2>Berlayar Rise · 5 km surroundings</h2><small>Regional reference map and 3D modelling priorities</small></div><button type="button" id="region-close">Back to 3D site</button></div><div class="region-layout"><div class="region-map"><iframe id="region-map" title="OpenStreetMap context surrounding Berlayar Rise" loading="lazy"></iframe><p>Interactive OpenStreetMap · approximate 5 km extent. Candidate landmarks are listed separately until their exact positions are verified.</p></div><div class="region-data"><h3>Landmarks and features</h3><p class="region-help">High / medium / distant = recommended modelling detail, not a claim that each landmark is at an exact distance.</p><div class="region-filters"><select id="region-tier"><option value="all">All detail bands</option><option value="0-1">High detail · 0–1 km</option><option value="1-3">Medium · 1–3 km</option><option value="3-5">Distant · 3–5 km</option></select><select id="region-category"><option value="all">All categories</option></select><input id="region-find" placeholder="Search landmark" type="search" aria-label="Search landmark"></div><div class="region-list" id="region-list">Loading…</div><div id="region-source" class="region-source"></div></div></div>';
document.body.append(panel);
const map=q('#region-map'),tier=q('#region-tier'),cat=q('#region-category'),find=q('#region-find'),list=q('#region-list');
const lat=1.26925,lon=103.8091,dl=5/111.2,dx=5/(111.2*Math.cos(lat*Math.PI/180));
const bbox=[lon-dx,lat-dl,lon+dx,lat+dl].map(n=>n.toFixed(5)).join(',');
let prior=null,overflow='',items=[],loaded=false;
function close(){panel.classList.remove('open');document.body.style.overflow=overflow;(prior?.isConnected?prior:btn).focus({preventScroll:true})}
function open(){prior=document.activeElement;overflow=document.body.style.overflow;document.body.style.overflow='hidden';panel.classList.add('open');q('#region-close').focus({preventScroll:true});if(!map.src)map.src='https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent(bbox)+'&layer=mapnik&marker='+encodeURIComponent(lat+','+lon);if(!loaded)load()}
btn.onclick=open;q('#region-close').onclick=close;
document.addEventListener('keydown',e=>{if(panel.classList.contains('open')&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close()}},true);
function render(){
 const search=find.value.trim().toLowerCase();list.replaceChildren();
 const chosen=items.filter(p=>(tier.value==='all'||tier.value===p.priorityTier)&&(cat.value==='all'||cat.value===p.category)&&(!search||p.name.toLowerCase().includes(search)||p.role.toLowerCase().includes(search)));
 if(!chosen.length){list.textContent='No landmarks match these filters.';return}
 for(const p of chosen){
  const article=document.createElement('article');article.className='region-place';
  const h=document.createElement('strong');h.textContent=p.name;
  const meta=document.createElement('p');meta.textContent=p.category+' · '+p.status+' · '+p.priorityTier+' km modelling band';
  const description=document.createElement('p');description.textContent=p.role;
  const a=document.createElement('a');a.href='https://www.openstreetmap.org/search?query='+encodeURIComponent(p.name+', Singapore');a.target='_blank';a.rel='noopener noreferrer';a.textContent='Find on OpenStreetMap';
  article.append(h,meta,description,a);list.append(article);
 }
}
async function load(){
 loaded=true;try{
 const r=await fetch('/assets/berlayar-5km-surroundings-spec.json?v=1');if(!r.ok)throw Error('Unavailable');const data=await r.json();if(!Array.isArray(data.landmarks))throw Error('Invalid');
 items=data.landmarks;
 for(const category of [...new Set(items.map(x=>x.category))].sort()){const o=document.createElement('option');o.value=category;o.textContent=category[0].toUpperCase()+category.slice(1);cat.add(o)}
 const sources=q('#region-source');sources.append(document.createTextNode('Reference sources: '));
 for(const source of data.sources||[]){const a=document.createElement('a');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=source.name;sources.append(a,document.createTextNode(' · '))}
 render();
 }catch{list.textContent='Reference data unavailable. Reload to retry.'}
}
tier.onchange=render;cat.onchange=render;find.oninput=render;
})();