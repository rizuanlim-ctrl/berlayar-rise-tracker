(()=>{'use strict';
const root=document.documentElement,key='berlayar-tracker-theme';
let theme='light';try{if(localStorage.getItem(key)==='dark')theme='dark';}catch{}
root.dataset.trackerTheme=theme;root.classList.toggle('dark',theme==='dark');
const labels={en:['Light','Dark','Display theme'],zh:['浅色','深色','显示主题'],ms:['Cerah','Gelap','Tema paparan'],ta:['ஒளி','இருள்','காட்சி தீம்']};
function apply(value){theme=value;root.dataset.trackerTheme=value;root.classList.toggle('dark',value==='dark');try{localStorage.setItem(key,value);}catch{}sync();}
function sync(){const group=document.getElementById('tracker-theme-control');if(!group)return;const lang=(root.lang||'en').split('-')[0],text=labels[lang]||labels.en;group.setAttribute('aria-label',text[2]);group.querySelectorAll('button').forEach((b,i)=>{if(b.textContent!==text[i])b.textContent=text[i];const pressed=String(b.dataset.theme===theme);if(b.getAttribute('aria-pressed')!==pressed)b.setAttribute('aria-pressed',pressed);});}
function mount(){const actions=document.querySelector('.topactions');if(!actions)return;
if(!document.getElementById('tracker-theme-control')){const group=document.createElement('div');group.id='tracker-theme-control';group.className='theme-control';group.setAttribute('role','group');for(const value of ['light','dark']){const button=document.createElement('button');button.type='button';button.dataset.theme=value;button.onclick=()=>apply(value);group.append(button);}actions.append(group);}sync();}
function start(){mount();new MutationObserver(mount).observe(document.getElementById('root'),{childList:true,subtree:true});new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['lang']});}
window.addEventListener('storage',e=>{if(e.key===key)apply(e.newValue==='dark'?'dark':'light');});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();