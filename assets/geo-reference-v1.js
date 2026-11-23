/* Berlayar Rise reference layer: official planning and geographic comparison. */
(()=>{'use strict';
const URA='https://eservice.ura.gov.sg/maps/';
const EARTH='https://earth.google.com/web/search/Telok+Blangah+Singapore';
const HDB='https://www.hdb.gov.sg/';
const isSite=location.pathname.includes('berlayar-3d');
const css=document.createElement('style');css.textContent=`
.geo-ref-trigger{min-height:44px;padding:9px 13px;border:1px solid #7c9f8b;border-radius:9px;background:#eaf3ec;color:#145336;font:600 13px system-ui;cursor:pointer}
.geo-ref-trigger:focus-visible,.geo-ref-close:focus-visible,.geo-ref-modal a:focus-visible{outline:3px solid #d48732;outline-offset:2px}
.geo-ref-modal{width:min(660px,94vw);max-height:85dvh;overflow:auto;border:1px solid #94b39d;border-radius:14px;padding:0;color:#183b2a;background:#fff;box-shadow:0 18px 55px #0005}
.geo-ref-modal::backdrop{background:#0009}.geo-ref-header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 20px;background:#e7f2e9}
.geo-ref-header h2{font:700 20px system-ui;margin:0}.geo-ref-close{min-height:42px;border:1px solid #7a9b83;background:white;border-radius:8px;padding:8px 14px;cursor:pointer}
.geo-ref-body{padding:18px 20px;display:grid;gap:14px;font:14px/1.55 system-ui}
.geo-ref-body p{margin:0}.geo-ref-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
.geo-ref-links a{display:block;padding:12px;background:#eef5ef;border:1px solid #bed2c2;border-radius:9px;color:#15583c;font-weight:700;text-decoration:none}
.geo-ref-note{padding:12px;border-left:4px solid #bf893f;background:#fff8e9}
.geo-ref-key{display:grid;gap:6px}.geo-ref-key div{display:flex;align-items:center;gap:9px}.geo-ref-dot{height:12px;width:12px;display:inline-block;border-radius:3px;flex:none}
html[data-tracker-theme=dark] .geo-ref-trigger{background:#254b37;color:#ecf7ef}
@media(max-width:480px){.geo-ref-links{grid-template-columns:1fr}.geo-ref-body{padding:14px}}
`;document.head.append(css);
const dialog=document.createElement('dialog');dialog.className='geo-ref-modal';dialog.setAttribute('aria-label','Geographical and planning references');
dialog.innerHTML='<div class="geo-ref-header"><h2>Geographical & planning references</h2><button type="button" class="geo-ref-close">Close</button></div><div class="geo-ref-body"><p id="geo-ref-context"></p><div class="geo-ref-links"><a href="'+EARTH+'" target="_blank" rel="noopener noreferrer">Google Earth · existing terrain & buildings ↗</a><a href="'+URA+'" target="_blank" rel="noopener noreferrer">URA SPACE · Master Plan 2025 ↗</a><a href="'+HDB+'" target="_blank" rel="noopener noreferrer">HDB · published site information ↗</a><a href="https://www.ura.gov.sg/land-planning/master-plan/" target="_blank" rel="noopener noreferrer">URA · statutory planning context ↗</a></div><div class="geo-ref-key"><strong>How to interpret the 3D model</strong><div><i class="geo-ref-dot" style="background:#368d68"></i> Existing surroundings: compare with Google Earth</div><div><i class="geo-ref-dot" style="background:#d79b48"></i> Planned or reserved sites: consult URA for land-use status</div><div><i class="geo-ref-dot" style="background:#85939b"></i> Model footprints, heights and window views: illustrative unless independently verified</div></div><p class="geo-ref-note">Google Earth imagery and URA plans are reference sources, not textures or licensed building geometry imported into this tracker. URA zoning is not an approved building design. Proposed developments, obstructions and future views can change.</p></div>';
document.body.append(dialog);dialog.querySelector('.geo-ref-close').onclick=()=>dialog.close();
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
function open(context){dialog.querySelector('#geo-ref-context').textContent=context;dialog.showModal()}
function trigger(context){const b=document.createElement('button');b.type='button';b.className='geo-ref-trigger';b.textContent='Google Earth / URA references';b.onclick=()=>open(context());return b}
if(isSite){
 const toolbar=document.querySelector('.toolbar');
 if(toolbar)toolbar.append(trigger(()=>{const f=document.querySelector('#focus')?.value;const st=document.querySelector('#map-stack')?.value;const fl=document.querySelector('#map-floor')?.value;return '3D site and surroundings'+(f?' · Block '+f:'')+(st?' · Stack '+st:'')+(fl?' · Floor '+fl:'')+'. Reference the same location in the official maps below.'}));
 const fut=document.querySelector('#future');if(fut){fut.title='Illustrative future land parcels, not confirmed building designs';fut.setAttribute('aria-label','Toggle illustrative future sites (not confirmed building designs)')}
}else{
 const observer=new MutationObserver(()=>{
  document.querySelectorAll('.detailsheet').forEach(sheet=>{
   if(sheet.querySelector('.geo-ref-trigger'))return;
   const anchor=sheet.querySelector('.detail-access-actions')||sheet;
   anchor.append(trigger(()=>{const title=sheet.textContent.slice(0,250).replace(/\\s+/g,' ').trim();return 'Unit 3D view reference · '+(title||'Berlayar Rise')+'. Compare nearby existing structures against Google Earth and possible future sites against URA SPACE.'}));
  });
 });
 observer.observe(document.body,{childList:true,subtree:true}); 
}
})();