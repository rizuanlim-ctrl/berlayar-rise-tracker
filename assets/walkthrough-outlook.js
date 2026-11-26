import {elevationFor} from './berlayar-building-shapes.js?v=1';
import {plannedHousingSiteLocations} from './berlayar-site-model.js?v=3';

const dot = (a,b) => a.reduce((sum,value,i)=>sum+value*b[i],0);
const cardinal = ['N','NE','E','SE','S','SW','W','NW'];

function firstWall(origin, direction, polygon){
  let nearest=Infinity;
  const [x,z]=origin, [dx,dz]=direction;
  for(let i=0;i<polygon.length;i++){
    const [ax,az]=polygon[i], [bx,bz]=polygon[(i+1)%polygon.length];
    const ex=bx-ax, ez=bz-az, cross=dx*ez-dz*ex;
    if(Math.abs(cross)<1e-6)continue;
    const distance=((ax-x)*ez-(az-z)*ex)/cross;
    const along=((ax-x)*dz-(az-z)*dx)/cross;
    if(distance>.005&&along>=0&&along<=1)nearest=Math.min(nearest,distance);
  }
  return nearest;
}

export function createOutlookOverlay(scene,site){
  const overlay=document.createElement('div');
  overlay.className='outlook-overlay';
  overlay.hidden=true;
  const compass=document.createElement('div');
  compass.className='outlook-compass';
  compass.setAttribute('aria-label','Camera bearing');
  const markers=document.createElement('div');
  markers.className='outlook-markers';
  overlay.append(compass,markers);
  scene.append(overlay);
  const north=site.sunVector(0,0);
  const buildings=site.buildings.map(building=>({...building,height:elevationFor(building)}));
  const features=buildings.filter(b=>b.kind==='tower'||b.kind==='construction'||b.id==='201').map(b=>({
    name:b.id==='201'?'Car park':b.kind==='construction'?'Berlayar Residences (U/C)':'Blk '+b.id.split('-')[0],
    building:b,
    centre:b.polygon.reduce(([x,z],[u,v])=>[x+u/b.polygon.length,z+v/b.polygon.length],[0,0]),
  }));
  for(const {x,y,name} of plannedHousingSiteLocations){
    features.push({name:name+' GLS site',centre:site.toRoom([x,y]),planned:true});
  }
  const pins=Array.from({length:4},()=>{
    const pin=document.createElement('span');
    pin.className='outlook-pin';
    pin.hidden=true;
    markers.append(pin);
    return pin;
  });

  return function draw({active,eye,basis,altitude,aspect,focal,width,height}){
    overlay.hidden=!active;
    if(!active||!width||!height)return;
    const [front,right,up]=basis;
    const bearing=(Math.atan2(north[0]*front[2]-north[2]*front[0],north[0]*front[0]+north[2]*front[2])*180/Math.PI+360)%360;
    compass.textContent='↑ '+cardinal[Math.round(bearing/45)%8]+' '+Math.round(bearing)%360+'°';

    const origin=[eye[0],eye[2]], eyeHeight=eye[1]+altitude;
    const projected=[];
    for(const {name,centre,building,planned} of features){
      const direction=[centre[0]-origin[0],centre[1]-origin[1]];
      const step=building?firstWall(origin,direction,building.polygon):1;
      if(!Number.isFinite(step))continue;
      const targetHeight=building?Math.min(building.height*.84,Math.max(building.height*.37,eyeHeight)):2;
      const vector=[direction[0]*step,targetHeight-eyeHeight,direction[1]*step];
      const depth=dot(vector,front);
      if(depth<3)continue;
      const x=(.5+dot(vector,right)*focal/(2*depth*aspect))*width;
      const y=(.5-dot(vector,up)*focal/(2*depth))*height;
      if(x<45||x>width-45||y<height*.17||y>height*.74)continue;
      if(buildings.some(other=>{
        if(other===building)return false;
        const hit=firstWall(origin,direction,other.polygon);
        return hit<step-.002&&eyeHeight+(targetHeight-eyeHeight)*hit/step<other.height;
      }))continue;
      projected.push({name,x,y,depth,planned});
    }
    projected.sort((a,b)=>a.depth-b.depth);
    const placed=[];
    const usedNames=new Set();
    const max=width<560?3:4;
    for(const point of projected){
      if(placed.length>=max||usedNames.has(point.name))continue;
      const halfWidth=point.name.length*3.2+8;
      const left=Math.max(4,Math.min(width-2*halfWidth-4,point.x-halfWidth));
      if(placed.some(other=>Math.abs(other.y-point.y)<27&&other.left<left+2*halfWidth+5&&other.right>left-5))continue;
      const pin=pins[placed.length];
      pin.textContent=point.name;
      pin.style.left=left+'px';
      pin.style.top=point.y+'px';
      pin.classList.toggle('planned',!!point.planned);
      pin.hidden=false;
      usedNames.add(point.name);
      placed.push({left,right:left+2*halfWidth,y:point.y});
    }
    for(const pin of pins.slice(placed.length))pin.hidden=true;
  };
}

export function reportExplorerView(enabled,view,date,time){
  if(enabled)window.parent.postMessage({type:'unit-explorer-view',view,date,time},location.origin);
}
