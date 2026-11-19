import {models, roads, PIXELS_PER_METRE, STOREY_METRES} from "./berlayar-site-model.js?v=1";

// Approximate stack centres traced from the same HDB site-plan image as the building footprints.
const blocks = [
  {id:'200B', angle:.073, skips:[20,40], stacks:[[117,444,233],[119,461,234],[121,457,264],[123,439,263]]},
  {id:'201A', angle:.085, skips:[9,29], stacks:[[133,607,245],[135,622,247],[137,619,278],[139,601,277]]},
  {id:'204A', angle:.078, skips:[], stacks:[[108,400,477],[110,416,478],[112,415,508],[114,397,507]]},
  {id:'204B', angle:.082, skips:[], stacks:[[124,265,603],[126,283,605],[128,280,636],[130,261,634]]},
];
const placements = new Map(blocks.flatMap(block => block.stacks.map(([stack,x,y]) =>
  [String(stack), {block, x, y}])));

const landscape = [
  [[226,133],[843,172],[821,302],[757,490],[725,600],[650,641],[492,654],[431,681],[413,744],[247,777],[138,743],[70,680],[115,609],[178,507],[211,390]],
  [[451,674],[623,640],[731,631],[678,698],[579,721],[433,737]],
  [[109,853],[293,878],[434,843],[514,858],[542,934],[162,990],[0,960],[0,902]],
  [[0,59],[166,110],[152,248],[84,422],[0,560]],
];
const estateRoads = [
  {w:25,p:[[0,714],[91,783],[183,819],[293,829],[439,801],[566,781],[697,750],[779,678],[844,557],[923,311],[966,198]]},
  {w:16,p:[[0,616],[63,560],[114,496],[153,417],[183,310],[204,177],[213,83],[185,0]]},
  {w:31,p:[[263,0],[360,26],[527,28],[704,50],[867,66],[971,52],[1060,24]]},
];
const treeRows = [
  [[237,141],[805,179],38],[[221,231],[197,381],35],[[186,433],[152,513],26],
  [[120,562],[83,644],29],[[84,687],[235,765],32],[[264,759],[411,734],33],
  [[432,676],[633,636],32],[[651,636],[729,600],25],[[747,541],[812,343],33],
  [[349,346],[413,321],23],[[474,454],[437,523],30],[[569,586],[633,562],22],
];

export function unitSite(stack) {
  const {block,x,y} = placements.get(stack);
  const cos = Math.cos(block.angle), sin = Math.sin(block.angle);
  const centre = [3.135,4.845];
  const toRoom = ([px,py]) => {
    const east = (px-x)/PIXELS_PER_METRE, south = (py-y)/PIXELS_PER_METRE;
    return [centre[0]+east*cos+south*sin, centre[1]-east*sin+south*cos];
  };
  // The source footprint has no unit recesses, so omit the host block from the view and shadow rays.
  const buildings = models.filter(model => model.id !== block.id).map(model => ({
    kind:model.kind, floors:model.floors, polygon:model.p.map(toRoom), hole:model.hole?.map(toRoom),
  }));
  const maxFloor = models.find(model => model.id === block.id).floors;
  const floors = Array.from({length:maxFloor-1}, (_,i)=>i+2).filter(floor=>!block.skips.includes(floor));
  return {
    floors, buildings,
    ground: landscape.map(polygon=>polygon.map(toRoom)),
    streets: [...roads,...estateRoads].map(road=>({width:road.w/PIXELS_PER_METRE, path:road.p.map(toRoom)})),
    trees: treeRows.flatMap(([a,b,spacing])=>{
      const count = Math.max(1,Math.floor(Math.hypot(b[0]-a[0],b[1]-a[1])/spacing));
      return Array.from({length:count},(_,i)=>toRoom(a.map((v,j)=>v+(b[j]-v)*(i+.5)/count)));
    }),
    sunVector(azimuth, altitude) {
      const bearing=azimuth*Math.PI/180-block.angle;
      return [Math.sin(bearing), Math.tan(altitude*Math.PI/180), -Math.cos(bearing)];
    },
  };
}

export const floorElevation = floor => (floor-1)*STOREY_METRES;

export function sunBlocked(site, origin, direction, elevation) {
  const [x,y,z] = origin, [dx,dy,dz] = direction;
  for (const building of site.buildings) {
    const height = building.floors*STOREY_METRES;
    if (height <= y+elevation) continue;
    const polygon = building.polygon;
    for (let i=0;i<polygon.length;i++) {
      const [ax,az] = polygon[i], [bx,bz] = polygon[(i+1)%polygon.length];
      const ex=bx-ax, ez=bz-az, cross=dx*ez-dz*ex;
      if (Math.abs(cross)<1e-6) continue;
      const t=((ax-x)*ez-(az-z)*ex)/cross;
      const u=((ax-x)*dz-(az-z)*dx)/cross;
      if (t>.02 && u>=0 && u<=1 && y+elevation+t*dy<height) return true;
    }
  }
  return false;
}

// Fill each horizontal slab between footprint vertices with trapezoids, including courtyard cut-outs.
function fillPolygon(rings, y, draw, color, light) {
  const levels = [...new Set(rings.flatMap(ring=>ring.map(p=>p[1])))].sort((a,b)=>a-b);
  for (let i=1;i<levels.length;i++) {
    const low=levels[i-1], high=levels[i], middle=(low+high)/2;
    const spans=[];
    for (const ring of rings) for (let index=0;index<ring.length;index++) {
      const [x,z]=ring[index], [u,v]=ring[(index+1)%ring.length];
      if (middle<=Math.min(z,v)||middle>=Math.max(z,v)) continue;
      const at = level => x+(u-x)*(level-z)/(v-z);
      spans.push([at(low),at(high)]);
    }
    spans.sort((a,b)=>a[0]+a[1]-b[0]-b[1]);
    for (let j=0;j+1<spans.length;j+=2) {
      const [left,right]=spans.slice(j,j+2);
      draw([left[0],y,low],[right[0],y,low],[right[1],y,high],[left[1],y,high],color,light);
    }
  }
}

export function drawNeighbourhood(site, elevation, solar, draw) {
  const ground = -elevation;
  const light = Math.max(.36, Math.min(1,.58+solar.altitude/75));
  const surface = (polygon, height, color) => fillPolygon([polygon],height,draw,color,light);
  surface([[-1100,-1100],[1100,-1100],[1100,1100],[-1100,1100]],ground,'terrain');
  for (const patch of site.ground) surface(patch,ground+.035,'landscape');
  for (const {width,path} of site.streets) for(let i=1;i<path.length;i++){
    const [x,z]=path[i-1], [u,v]=path[i], len=Math.hypot(u-x,v-z);
    if(len<.01)continue;
    const bx=(v-z)*width/(2*len), bz=(x-u)*width/(2*len), y=ground+.08;
    draw([x-bx,y,z-bz],[u-bx,y,v-bz],[u+bx,y,v+bz],[x+bx,y,z+bz],'road',light);
  }
  for(const [i,[x,z]] of site.trees.entries()){
    const size=1.6+(i%5)*.26, y=ground+1.8;
    const low=[x,ground+.2,z], top=[x,y+size,z];
    const points=[[x-size,y,z],[x,y+.4,z+size],[x+size,y,z],[x,y+.2,z-size]];
    points.forEach((p,j)=>{
      const q=points[(j+1)%4];
      draw(p,q,top,top,'tree',light*(.78+.07*j));
      draw(p,low,q,q,'tree',light*(.67+.06*j));
    });
  }
  const [sunX,,sunZ] = site.sunVector(solar.azimuth,solar.altitude);
  for (const building of site.buildings) {
    const {polygon,hole,kind,floors}=building, height=ground+floors*STOREY_METRES;
    const rings=hole?[polygon,hole]:[polygon];
    fillPolygon(rings,height,draw,kind==='facility'?'roofGarden':'roof',light);
    for(const ring of rings){
     const area=ring.reduce((total,[x,z],i)=>{
      const [u,v]=ring[(i+1)%ring.length];
      return total+x*v-u*z;
     },0);
     const outward=(area>0?1:-1)*(ring===hole?-1:1);
     ring.forEach(([x,z],i)=>{
      const [u,v]=ring[(i+1)%ring.length], len=Math.hypot(u-x,v-z);
      if(len<.12)return;
      const nx=outward*(v-z)/len,nz=outward*(x-u)/len;
      const shade=light*(.79+.16*Math.max(0,nx*sunX+nz*sunZ));
      const wall=kind==='tower'?'facade':kind==='landmark'?'remoteFacade':'facility';
      draw([x,ground,z],[u,ground,v],[u,height,v],[x,height,z],wall,shade);
      if(len<1)return;
      const bays=Math.max(1,Math.round(len/(kind==='landmark'?6.4:3.2)));
      const distance=Math.hypot((x+u)/2,(z+v)/2);
      const offset=.045+distance*.00034;
      const drawBand=(a,b,low,high,color,brightness)=>{
        const at=(t,y)=>[x+(u-x)*t+nx*offset,y,z+(v-z)*t+nz*offset];
        draw(at(a,low),at(b,low),at(b,high),at(a,high),color,brightness);
      };
      const stride=kind==='landmark'?2:1;
      for(let floor=0;floor<floors;floor+=stride){
        const y=ground+floor*STOREY_METRES;
        if(kind==='facility'){
          if(len>4)drawBand(.06,.94,y+.9,y+1.65,'facadeGlass',shade);
          continue;
        }
        if(kind==='existing')continue;
        if(len>3)drawBand(.005,.995,y+.12,y+.27,'roof',shade);
        for(let bay=0;bay<bays;bay++){
          drawBand((bay+.16)/bays,(bay+.84)/bays,y+.95,y+2.19,'facadeGlass',shade*(.82+((bay+floor*3+i)%5)*.06));
        }
      }
     });
    }
  }
}
