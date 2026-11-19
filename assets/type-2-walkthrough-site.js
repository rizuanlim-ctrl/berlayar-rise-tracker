import {additionalStacks} from "./walkthrough-layouts.js?v=1";
import {coastline} from "./berlayar-coastline.js?v=1";
import {models, roads, PIXELS_PER_METRE, STOREY_METRES} from "./berlayar-site-model.js?v=1";

// Approximate stack centres traced from the same HDB site-plan image as the building footprints.
const blocks = [
  {id:'200A', angle:.025, skips:[9,29], stacks:[]},
  {id:'201B', angle:.085, skips:[22,36], stacks:[]},
  {id:'200B', angle:.073, skips:[20,40], stacks:[[117,444,233],[119,461,234],[121,457,264],[123,439,263]]},
  {id:'201A', angle:.085, skips:[9,29], stacks:[[133,607,245],[135,622,247],[137,619,278],[139,601,277]]},
  {id:'204A', angle:.078, skips:[], stacks:[[108,400,477],[110,416,478],[112,415,508],[114,397,507]]},
  {id:'204B', angle:.082, skips:[], stacks:[[124,265,603],[126,283,605],[128,280,636],[130,261,634]]},
];
const placements = new Map(blocks.flatMap(block => {
  const extra=Object.values(additionalStacks[block.id]).flat().map(([stack,,,x,y])=>[stack,x,y]);
  return [...block.stacks,...extra].map(([stack,x,y])=>[String(stack),{block,x,y}]);
}));

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
// Main pedestrian links traced from the precinct site plan.
const estatePaths = [
  {w:9,p:[[141,336],[230,351],[336,359],[377,326],[412,305],[449,297],[589,302],[649,308]]},
  {w:8,p:[[490,304],[480,350],[489,401],[507,448]]},
  {w:10,p:[[148,573],[297,583],[431,594],[552,608],[635,602],[672,567]]},
  {w:8,p:[[349,730],[380,687],[395,638],[407,600],[392,563],[387,542]]},
  {w:7,p:[[437,685],[469,653],[525,631],[591,628],[628,614],[647,565],[655,501]]},
];
const treeRows = [
  [[237,141],[805,179],38],[[221,231],[197,381],35],[[186,433],[152,513],26],
  [[120,562],[83,644],29],[[84,687],[235,765],32],[[264,759],[411,734],33],
  [[432,676],[633,636],32],[[651,636],[729,600],25],[[747,541],[812,343],33],
  [[349,346],[413,321],23],[[474,454],[437,523],30],[[569,586],[633,562],22],
];

export function unitSite(stack, centre=[3.135,4.845]) {
  const {block,x,y} = placements.get(stack);
  const cos = Math.cos(block.angle), sin = Math.sin(block.angle);
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
    floors, buildings, centre,
    ground: landscape.map(polygon=>polygon.map(toRoom)),
    water: coastline.map(polygon=>polygon.map(ring=>ring.map(toRoom))),
    streets: [...roads,...estateRoads].map(road=>({width:road.w/PIXELS_PER_METRE, path:road.p.map(toRoom)})),
    paths: estatePaths.map(path=>({width:path.w/PIXELS_PER_METRE,path:path.p.map(toRoom)})),
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

export function drawNeighbourhood(site, elevation, solar, draw, simplified=false) {
  const ground = -elevation;
  const [centreX,centreZ]=site.centre;
  const light = Math.max(.40, Math.min(1,.64+solar.altitude/92));
  const surface = (polygon, height, color, shade=light) => fillPolygon([polygon],height,draw,color,shade);
  surface([[-1450,-1250],[1450,-1250],[1450,1600],[-1450,1600]],ground,'terrain');
  for(const polygon of site.water)fillPolygon(polygon,ground+.24,draw,'water',light);
  for (const patch of site.ground) surface(patch,ground+.045,'landscape');
  function paths(routes,y,material,extraWidth=0) {
    for(const {width,path} of routes) {
      const radius=(width+extraWidth)/2;
      const edges=path.map(([x,z],i)=>{
        const direction=([a,b],[c,d])=>{
          const length=Math.hypot(c-a,d-b)||1;
          return [(d-b)/length,(a-c)/length];
        };
        const a=direction(path[Math.max(0,i-1)],path[Math.max(1,i)]);
        const b=direction(path[Math.min(i,path.length-2)],path[Math.min(i+1,path.length-1)]);
        const scale=radius/Math.max(1+a[0]*b[0]+a[1]*b[1],1);
        const dx=(a[0]+b[0])*scale,dz=(a[1]+b[1])*scale;
        return [[x-dx,y,z-dz],[x+dx,y,z+dz]];
      });
      for(let i=1;i<edges.length;i++)draw(...edges[i-1],edges[i][1],edges[i][0],material,light);
    }
  }
  paths(site.streets,ground+.13,'kerb',1);
  paths(site.streets,ground+.17,'road');
  paths(site.paths,ground+.19,'path');

  const [sunX,,sunZ] = site.sunVector(solar.azimuth,solar.altitude);
  for(const [i,[x,z]] of site.trees.entries()){
    const size=1.4+(i*17%9)*.19, crown=ground+size*1.55+.8;
    const trunk=.12+size*.025;
    const corners=[[-trunk,-trunk],[trunk,-trunk],[trunk,trunk],[-trunk,trunk]];
    for(let j=0;j<4;j++){
      const [a,b]=corners[j],[c,d]=corners[(j+1)%4];
      draw([x+a,ground,z+b],[x+c,ground,z+d],[x+c,crown,z+d],[x+a,crown,z+b],'bark',light*(.78+j*.05));
    }
    const count=simplified?7:10;
    const rings=[[.35,-.53],[.86,-.22],[1,.16],[.65,.59],[.13,.91]].map(([radius,height],row)=>
      Array.from({length:count},(_,j)=>{
        const angle=j*2*Math.PI/count;
        const spread=radius*size*(.93+(i*7+row*5+j*13)%11*.015);
        return [x+Math.cos(angle)*spread,crown+height*size,z+Math.sin(angle)*spread];
      }));
    for(let row=1;row<rings.length;row++)for(let j=0;j<count;j++){
      const k=(j+1)%count;
      const angle=(j+.5)*2*Math.PI/count;
      const sunlight=Math.max(0,Math.cos(angle)*sunX+Math.sin(angle)*sunZ);
      draw(rings[row-1][j],rings[row-1][k],rings[row][k],rings[row][j],i%4===0?'treeLight':'tree',light*(.59+.085*row+.22*sunlight));
    }
    const canopy=rings.at(-1), top=[x,crown+size*.98,z];
    for(let j=0;j<count;j++)draw(canopy[j],canopy[(j+1)%count],top,top,'treeLight',light*.99);
  }

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
        // The viewer stays inside the flat. Skip façades that face away from the whole unit.
        if((centreX-x)*nx+(centreZ-z)*nz < -9)return;
        const shade=light*(.76+.22*Math.max(0,nx*sunX+nz*sunZ));
        const wall=kind==='tower'?(i%5===0?'facadeAccent':'facade'):kind==='landmark'?'remoteFacade':'facility';
        const distance=Math.hypot((x+u)/2-centreX,(z+v)/2-centreZ);
        const face=(a,b,low,high,color,brightness,offset=0)=>{
          const at=(t,y)=>[x+(u-x)*t+nx*offset,y,z+(v-z)*t+nz*offset];
          draw(at(a,low),at(b,low),at(b,high),at(a,high),color,brightness);
        };
        if(len<1.5||kind==='existing'||ring===hole){
          face(0,1,ground,height,wall,shade);
          return;
        }
        if(simplified){
          const stride=distance>300?4:distance>125?2:1;
          const bays=Math.max(1,Math.round(len/(distance>125?6.6:3.6)));
          for(let level=0;level<floors;level+=stride){
            const y=ground+level*STOREY_METRES, rise=Math.min(stride,floors-level)*STOREY_METRES;
            for(let bay=0;bay<bays;bay++){
              const a=bay/bays,b=(bay+1)/bays;
              face(a,b,y,y+rise,wall,shade*(.96+(bay+level)%3*.02));
              const low=y+rise*.31,high=y+rise*.72,pad=(b-a)*.20;
              const tint=shade*(.84+((bay*3+level+i)%5)*.05);
              face(a+pad,b-pad,low,high,kind==='facility'?'deckVoid':'facadeGlass',tint,.22);
            }
          }
          return;
        }
        const distant=distance>225;
        const stride=distant?2:1;
        const bays=Math.max(1,Math.round(len/(distant?6.4:3.25)));
        const setback=.065+distance*.00024;
        for(let level=0;level<floors;level+=stride){
          const y=ground+level*STOREY_METRES;
          const rise=Math.min(stride,floors-level)*STOREY_METRES;
          const deck=kind==='facility';
          const sill=y+(deck ? .90 : .86), lintel=y+(deck?1.84:2.23);
          face(0,1,y,y+.22,'facadeLedge',shade*.92,setback*.6);
          face(0,1,y+.22,sill,wall,shade);
          face(0,1,lintel,y+rise,wall,shade);
          for(let bay=0;bay<bays;bay++){
            const start=bay/bays,end=(bay+1)/bays;
            const a=start+.18/bays,b=end-.18/bays;
            face(start,a,sill,lintel,wall,shade);
            face(b,end,sill,lintel,wall,shade);
            const tint=shade*(.86+((bay*3+level*7+i)%9)*.025);
            face(a,b,sill,lintel,deck?'deckVoid':'facadeGlass',tint,-setback);
            if(!distant){
              const lip=Math.min(.032,(b-a)*.12);
              const midpoint=(a+b)/2;
              face(a,a+lip,sill,lintel,'windowReveal',shade*.87);
              face(b-lip,b,sill,lintel,'windowReveal',shade*.76);
              face(a+lip,b-lip,sill,sill+.085,'windowReveal',shade);
              if(!deck)face(midpoint-lip*.4,midpoint+lip*.4,sill+.085,lintel,'windowReveal',shade*.77);
            }
          }
        }
      });
    }
  }
}
