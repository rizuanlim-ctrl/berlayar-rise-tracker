import {PIXELS_PER_METRE} from './berlayar-site-model.js?v=2';
import {estatePaths, estateRoads} from './type-2-walkthrough-site.js?v=11';
import {highwayCentreline} from './berlayar-highway.js?v=1';

const toMetres=([x,y])=>[(x-485)/PIXELS_PER_METRE,(y-435)/PIXELS_PER_METRE];

function route(name,points,start,turn){
  const path=points.map(toMetres);
  const segments=[];
  let length=0;
  for(let i=1;i<path.length;i++){
    const [x,z]=path[i-1],dx=path[i][0]-x,dz=path[i][1]-z;
    const size=Math.hypot(dx,dz);
    segments.push({x,z,dx,dz,size,from:length});
    length+=size;
  }
  return {name,segments,length,start,turn};
}

export const PRECINCT_ROUTES={
  walkway:route('Estate walkway',estatePaths[2].p,.32,-1.02),
  drive:route('Berlayar Drive',estateRoads[0].p.slice(1,8),.40,.64),
  highway:route('Telok Blangah Road',
    highwayCentreline.slice(4,13).map(([x,y])=>[x,y+36]),.43,.27),
};

export function streetCamera(route,distance,turn){
  const along=Math.max(0,Math.min(route.length,distance));
  const segment=route.segments.find(s=>along<s.from+s.size)??route.segments.at(-1);
  const t=(along-segment.from)/segment.size;
  const next=route.segments[route.segments.indexOf(segment)+1];
  const bearing=Math.atan2(segment.dx,segment.dz);
  // Blend headings around bends so stepping through a vertex doesn't jerk the view.
  const angle=next?Math.atan2(next.dx,next.dz)-bearing:0;
  const blend=Math.max(0,(t-.72)/.28);
  const yaw=bearing+Math.atan2(Math.sin(angle),Math.cos(angle))*blend+turn;
  return {eye:[segment.x+segment.dx*t,1.68,segment.z+segment.dz*t],yaw};
}
