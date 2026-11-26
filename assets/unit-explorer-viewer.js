import {walkthroughLayouts,additionalStacks} from '/assets/walkthrough-layouts.js';
const type2={
 '200B':['117','119','121','123'],
 '201A':['133','135','137','139'],
 '204A':['108','110','112','114'],
 '204B':['124','126','128','130']
};
const inventory={type1:{},type2,three:{},four:{}};
for(const [block,groups] of Object.entries(additionalStacks))
 for(const kind of ['type1','three','four'])
  if(groups[kind])inventory[kind][block]=groups[kind].map(([stack])=>String(stack));
// Actual unit floors from the tracker inventory; excludes non-residential/sky-terrace levels.
const availableFloors={"2R|200A":[2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46],"2R|200B":[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,41,42,43,44,45,46,47,48],"2R|201A":[2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49],"2R|201B":[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,23,24,25,26,27,28,29,30,31,32,33,34,35,37,38,39,40,41,42,43,44,45,46],"2R|204A":[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39],"2R|204B":[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33],"3R|200A":[2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46],"3R|201B":[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,23,24,25,26,27,28,29,30,31,32,33,34,35,37,38,39,40,41,42,43,44,45,46],"4R|200A":[2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46],"4R|200B":[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,41,42,43,44,45,46,47,48],"4R|201A":[2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49],"4R|201B":[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,23,24,25,26,27,28,29,30,31,32,33,34,35,37,38,39,40,41,42,43,44,45,46],"4R|204A":[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39],"4R|204B":[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33]};
const roomCodes={type1:'2R',type2:'2R',three:'3R',four:'4R'};

const modes = new Set(['walk','window','overview','outlook','exterior','tour']);
const query = new URLSearchParams(location.search);
const mobile = location.pathname.endsWith('-mobile.html');
const tour = document.getElementById('tour');
const viewer = tour.closest('.viewer');
const main = document.querySelector('main');
const walkthroughPath = mobile ? '/stack-139-walkthrough-mobile.html' : '/stack-139-walkthrough.html';
const selected = Object.fromEntries(['room','block','stack','floor'].map(id=>[id,document.getElementById(id)]));
const narrow = matchMedia('(max-width: 760px), (pointer: coarse) and (max-width: 900px)');
const viewState = {
  view: modes.has(query.get('view')) ? query.get('view') : '',
  date: query.get('sunDate') || '',
  time: query.get('sunTime') || '',
};

main.querySelector('.toolbar').insertAdjacentHTML('afterend', `
  <div class="explorer-actions">
    <button id="compare-open" type="button" aria-controls="unit-comparison" aria-expanded="false">Compare units</button>
    <button id="share-unit" type="button">Share this unit</button>
    <span id="share-status" role="status"></span>
  </div>
  <div id="share-link-fallback" class="share-link-fallback" hidden>
    <label>Copy unit link <input type="url" readonly></label>
    <button id="share-dismiss" type="button">Done</button>
  </div>`);
viewer.insertAdjacentHTML('afterend', `
  <section id="unit-comparison" aria-labelledby="compare-title" hidden>
    <div class="comparison-heading">
      <h2 id="compare-title" tabindex="-1">Compare window outlooks</h2>
      <button id="compare-close" type="button">Back to walkthrough</button>
    </div>
    <details class="comparison-settings">
      <summary>Unit B and sunlight</summary>
      <div class="comparison-fields">
        <label>Unit B room type <select id="compare-room"></select></label>
        <label>Block <select id="compare-block"></select></label>
        <label>Stack <select id="compare-stack"></select></label>
        <label>Floor <select id="compare-floor"></select></label>
      </div>
      <div class="comparison-sun" role="group" aria-label="Shared sunlight settings">
        <label>Sun date <input id="compare-date" type="date"></label>
        <label>Time (SGT) <input id="compare-time" type="time"></label>
      </div>
    </details>
    <div id="compare-toggle" class="comparison-toggle" role="group" aria-label="Choose which outlook to show">
      <button type="button" aria-pressed="true"></button><button type="button" aria-pressed="false"></button>
    </div>
    <div class="comparison-grid">
      <article class="comparison-card"><h3></h3><iframe title="Unit A window outlook" loading="eager"></iframe></article>
      <article class="comparison-card"><h3></h3><iframe title="Unit B window outlook" loading="eager"></iframe></article>
    </div>
  </section>`);

const comparison = document.getElementById('unit-comparison');
const compareOpen = document.getElementById('compare-open');
const closeCompare = document.getElementById('compare-close');
const comparisonSettings = comparison.querySelector('.comparison-settings');
const share = document.getElementById('share-unit');
const shareStatus = document.getElementById('share-status');
const shareFallback = document.getElementById('share-link-fallback');
const second = Object.fromEntries(['room','block','stack','floor'].map(id=>[id,document.getElementById('compare-'+id)]));
const date = document.getElementById('compare-date');
const time = document.getElementById('compare-time');
const toggle = document.getElementById('compare-toggle');
const tabs = [...toggle.querySelectorAll('button')];
const comparisonDate = '2031-12-21';
const comparisonTime = '16:00';
const cards = [...comparison.querySelectorAll('.comparison-card')].map(card=>({
  card, title:card.querySelector('h3'), frame:card.querySelector('iframe'),
}));
second.room.replaceChildren(...Array.from(selected.room.options,option=>option.cloneNode(true)));
let shown = 0;
let renderedStack;

function options(select, values, preferred){
  select.replaceChildren(...values.map(value=>new Option(value,value)));
  if(values.includes(preferred))select.value=preferred;
}

function floorsFor(fields){
  return availableFloors[roomCodes[fields.room.value]+'|'+fields.block.value] || [];
}
function stacksFor(fields){
  return (inventory[fields.room.value][fields.block.value] || []).filter(id=>walkthroughLayouts.has(id));
}

function bindSelection(fields,onChange){
  function updateFloor(preferred){
    const levels=floorsFor(fields);
    const requested=Number(preferred ?? (fields.floor.value || 2));
    const target=Number.isFinite(requested)?requested:20;
    const nearest=levels.reduce((best,level)=>Math.abs(level-target)<Math.abs(best-target)?level:best,levels[0]);
    options(fields.floor,levels.map(String),String(nearest));
    fields.floor.disabled=!levels.length;
    onChange();
  }
  function updateStack(preferredStack,preferredFloor){
    options(fields.stack,stacksFor(fields),preferredStack);
    updateFloor(preferredFloor);
  }
  function updateBlock(preferredBlock,preferredStack,preferredFloor){
    options(fields.block,Object.keys(inventory[fields.room.value]).sort(),preferredBlock);
    updateStack(preferredStack,preferredFloor);
  }
  fields.room.addEventListener('change',()=>updateBlock());
  fields.block.addEventListener('change',()=>updateStack());
  fields.stack.addEventListener('change',()=>updateFloor());
  fields.floor.addEventListener('change',onChange);
  return function select({room,block,stack,floor}){
    if(Object.hasOwn(inventory,room))fields.room.value=room;
    updateBlock(block,stack,floor);
  };
}

function currentUnit(fields){
  return Object.fromEntries(Object.entries(fields).map(([key,field])=>[key,field.value]));
}

function unitUrl(canonical=false,fields=selected,state=viewState){
  const url=new URL(canonical?'/unit-3d-explorer.html':location.href,location.origin);
  for(const [key,value] of Object.entries(currentUnit(fields)))url.searchParams.set(key,value);
  for(const [key,value] of Object.entries({view:state.view,sunDate:state.date,sunTime:state.time})){
    if(value)url.searchParams.set(key,value);
    else url.searchParams.delete(key);
  }
  return url;
}

function syncFloor(){
  tour.contentWindow.postMessage({type:'unit-explorer-floor',floor:Number(selected.floor.value)},location.origin);
}

function updateTour(){
  if(!selected.stack.value||!selected.floor.value)return;
  if(renderedStack===selected.stack.value)syncFloor();
  else{
    renderedStack=selected.stack.value;
    const params=new URLSearchParams({embedded:'1',explorer:'1',...currentUnit(selected),v:'compare-1'});
    if(viewState.view)params.set('view',viewState.view);
    if(viewState.date)params.set('sunDate',viewState.date);
    if(viewState.time)params.set('sunTime',viewState.time);
    tour.src=walkthroughPath+'?'+params;
  }
  history.replaceState(null,'',unitUrl());
  if(!comparison.hidden)updateComparison();
}

function prettyUnit({floor,stack}){
  return '#'+floor.padStart(2,'0')+'-'+stack;
}

function updateComparison(){
  if(comparison.hidden)return;
  const units=[currentUnit(selected),currentUnit(second)];
  toggle.hidden=!narrow.matches;
  share.textContent=narrow.matches&&shown===1?'Share unit B':'Share unit A';
  cards.forEach(({card,title,frame},index)=>{
    const unit=units[index];
    const number=prettyUnit(unit);
    const slot=index===0?'A':'B';
    title.textContent=slot+' · '+number+' · Blk '+unit.block;
    tabs[index].textContent=slot+' · '+number;
    tabs[index].setAttribute('aria-pressed',String(index===shown));
    card.hidden=narrow.matches&&index!==shown;
    if(!unit.stack||card.hidden)return;
    const params=new URLSearchParams({
      embedded:'1',compare:'1',view:'outlook',stack:unit.stack,floor:unit.floor,
      sunDate:date.value||comparisonDate,sunTime:time.value||comparisonTime,v:'compare-1',
    });
    frame.title='Unit '+slot+' '+number+' window outlook';
    const target=walkthroughPath+'?'+params;
    if(frame.getAttribute('src')!==target)frame.src=target;
  });
}

const selectSecond=bindSelection(second,updateComparison);
compareOpen.addEventListener('click',()=>{
  if(!comparison.hidden){
    closeCompare.click();
    return;
  }
  const unit=currentUnit(selected);
  const otherStack=stacksFor(selected).findLast(id=>id!==unit.stack);
  const otherFloor=floorsFor(selected).find(level=>level>Number(unit.floor)) ?? floorsFor(selected)[0];
  selectSecond({...unit,stack:otherStack||unit.stack,floor:otherStack?unit.floor:String(otherFloor)});
  date.value=viewState.date||comparisonDate;
  time.value=viewState.time||comparisonTime;
  shown=0;
  comparisonSettings.open=!narrow.matches;
  viewer.hidden=true;
  comparison.hidden=false;
  compareOpen.setAttribute('aria-expanded','true');
  updateComparison();
  document.getElementById('compare-title').focus({preventScroll:true});
  if(narrow.matches)comparison.scrollIntoView({block:'start'});
});
closeCompare.addEventListener('click',()=>{
  comparison.hidden=true;
  for(const {frame} of cards)frame.removeAttribute('src');
  viewer.hidden=false;
  share.textContent='Share this unit';
  compareOpen.setAttribute('aria-expanded','false');
  compareOpen.focus();
});
tabs.forEach((tab,index)=>tab.addEventListener('click',()=>{
  shown=index;
  updateComparison();
}));
narrow.addEventListener('change',()=>{
  comparisonSettings.open=!narrow.matches;
  updateComparison();
});
date.addEventListener('change',updateComparison);
time.addEventListener('change',updateComparison);

share.addEventListener('click',async()=>{
  shareStatus.textContent='';
  shareFallback.hidden=true;
  const sharingComparison=!comparison.hidden;
  const fields=sharingComparison&&narrow.matches&&shown===1?second:selected;
  const state=sharingComparison?{view:'outlook',date:date.value||comparisonDate,time:time.value||comparisonTime}:viewState;
  const url=unitUrl(true,fields,state).href;
  try{
    await navigator.clipboard.writeText(url);
    shareStatus.textContent='Link copied';
  }catch{
    shareFallback.hidden=false;
    const input=shareFallback.querySelector('input');
    input.value=url;
    input.focus();
    input.select();
  }
});
document.getElementById('share-dismiss').addEventListener('click',()=>{
  shareFallback.hidden=true;
  share.focus();
});

tour.addEventListener('load',syncFloor);
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==tour.contentWindow)return;
  const data=event.data;
  if(data==='close-unit-walkthrough')document.querySelector('.back').focus();
  if(data?.type==='unit-explorer-size'&&Number.isInteger(data.height)){
    tour.style.height=Math.max(mobile?360:480,Math.min(1400,data.height+2))+'px';
  }
  if(data?.type==='unit-explorer-view'&&modes.has(data.view)){
    viewState.view=data.view;
    if(/^\d{4}-\d{2}-\d{2}$/.test(data.date))viewState.date=data.date;
    if(/^\d{2}:\d{2}$/.test(data.time))viewState.time=data.time;
  }
});
bindSelection(selected,updateTour)(Object.fromEntries(query));
