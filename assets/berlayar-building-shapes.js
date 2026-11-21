import {STOREY_METRES} from './berlayar-site-model.js?v=2';

export const isReflectionsTower = ({kind,floors}) => kind==='landmark'&&floors>=24;
export function elevationFor(building) {
  return isReflectionsTower(building)
    ? building.floors>=40?174:116 : building.floors*STOREY_METRES;
}
export function buildingProfile(building, polygon, ground=0, scale=1) {
  if(!isReflectionsTower(building))return point=>point;
  const rise=elevationFor(building)*scale;
  const midX=polygon.reduce((sum,[x])=>sum+x,0)/polygon.length;
  const lean=Number(building.id.match(/\d+$/)?.[0]??0)%4===1?1:-1;
  return ([x,y,z])=>{
    const fraction=Math.max(0,Math.min(1,(y-ground)/rise));
    return [x+lean*8*scale*fraction*fraction,y+(x-midX)*.42*fraction**6,z-4*scale*fraction*fraction];
  };
}

// Approximate elevations and profiles for the three paired skybridges.
export function drawReflectionsBridges(buildings, ground, light, draw, scale=1) {
  for(const [a,b] of [[23,25],[27,29],[31,33]]){
    const pair=[a,b].map(id=>buildings.find(building=>building.id==='reflections-'+id));
    const [start,end]=pair.map(({polygon})=>polygon.reduce(([x,z],[u,v])=>[x+u/polygon.length,z+v/polygon.length],[0,0]));
    const lower=ground+78*scale,upper=lower+3.4*scale;
    const span=Math.hypot(end[0]-start[0],end[1]-start[1]);
    const nx=(end[1]-start[1])*1.9*scale/span,nz=(start[0]-end[0])*1.9*scale/span;
    const base=[
      [start[0]+nx,lower,start[1]+nz],[end[0]+nx,lower,end[1]+nz],
      [end[0]-nx,lower,end[1]-nz],[start[0]-nx,lower,start[1]-nz],
    ];
    const top=base.map(([x,,z])=>[x,upper,z]);
    draw(...top,'roofGarden',light);
    for(let i=0;i<4;i++){
      const j=(i+1)%4;
      draw(base[i],base[j],top[j],top[i],'facadeGlass',light*.91);
    }
  }
}
