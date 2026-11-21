import {PIXELS_PER_METRE,roads} from './berlayar-site-model.js?v=2';
import {coastline} from './berlayar-coastline.js?v=1';
import {aerialGroves,marinaPontoons} from './berlayar-aerial-context.js?v=2';
import {drawHighway,highwayCentreline} from './berlayar-highway.js?v=1';
import {estatePaths,estateRoads,landscape,treeRows} from './type-2-walkthrough-site.js?v=10';
import {terrainGrid} from './berlayar-terrain.js?v=1';

const {x:west,y:north,step,heights}=terrainGrid;
export function terrainAt(x,y){
  const u=(x-west)/step,v=(y-north)/step,i=Math.floor(u),j=Math.floor(v);
  if(i<0||i>=heights[0].length-1||j<0||j>=heights.length-1)return 0;
  const a=u-i,b=v-j;
  return ((heights[j][i]*(1-a)+heights[j][i+1]*a)*(1-b)+
    (heights[j+1][i]*(1-a)+heights[j+1][i+1]*a)*b)*PIXELS_PER_METRE;
}

const terrain=[];
for(let j=1;j<heights.length;j++)for(let i=1;i<heights[j].length;i++){
  const corners=[[i-1,j-1],[i,j-1],[i,j],[i-1,j]].map(([a,b])=>
    [west+a*step,north+b*step,heights[b][a]*PIXELS_PER_METRE]);
  const relief=(corners[0][2]+corners[1][2]+corners[2][2]+corners[3][2])/4;
  terrain.push({corners,relief});
}

const highwayColors={
  surfaceAsphalt:'#555c5e',surfaceEdge:'#ded9cd',highwayMedian:'#97998b',
  highwayAsphalt:'#394650',highwayStripe:'#eee9de',highwaySoffit:'#727e80',
  highwayFascia:'#98a4a5',highwayRail:'#bdc6c4',railCap:'#e2e4dd',highwayPier:'#9ba3a0',
};
const highwaySurface=[],highwayStructure=[];
drawHighway(highwayCentreline.map(p=>p.map(n=>n/PIXELS_PER_METRE)),0,1,(a,b,c,d,key,light)=>{
  const points=[a,b,c,d].map(([x,z,y])=>[x*PIXELS_PER_METRE,y*PIXELS_PER_METRE,z*PIXELS_PER_METRE]);
  const marking=key==='surfaceEdge'||key==='highwayStripe';
  const face={points,fill:highwayColors[key],light,marking};
  const target=key.startsWith('surface')||key==='highwayMedian'?highwaySurface:highwayStructure;
  target.push(face);
});
const localRoads=[...estateRoads,...roads.filter(road=>road.n!=='Telok Blangah Road'||road.p.every(([x])=>x>1487))];

const canopy=[];
for(const [a,b,spacing] of treeRows){
  const count=Math.max(1,Math.floor(Math.hypot(b[0]-a[0],b[1]-a[1])/spacing));
  for(let i=0;i<count;i++){
    const p=a.map((value,j)=>value+(b[j]-value)*(i+.5)/count);
    canopy.push([...p,4+(canopy.length%5)]);
  }
}

function trace(ctx,points){
  points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.closePath();
}

export function drawMapGround(ctx,project,{context,showTerrain,shade,zoom}){
  const fill=(points,color)=>{
    ctx.beginPath();trace(ctx,points.map(point=>project(...point)));
    ctx.fillStyle=color;ctx.fill();
  };
  if(context){
    const cells=terrain.map(({corners,relief})=>{
      const points=corners.map(p=>project(p[0],p[1],showTerrain?p[2]:0));
      return {points,relief,depth:points.reduce((sum,p)=>sum+p[2],0)/4};
    }).sort((a,b)=>a.depth-b.depth);
    for(const {points,relief} of cells){
      ctx.beginPath();trace(ctx,points);
      const raised=showTerrain?Math.min(1,relief/150):0;
      const color=shade(raised>.14?'#87a482':'#b9c6a7',.96+raised*.065);
      ctx.fillStyle=color;ctx.fill();
      ctx.strokeStyle=color;ctx.lineWidth=.55;ctx.stroke();
    }
    const blue=ctx.createLinearGradient(0,0,0,ctx.canvas.height/Math.max(1,ctx.getTransform().d));
    blue.addColorStop(0,shade('#85b6bc',1));
    blue.addColorStop(1,shade('#527f8f',1));
    ctx.beginPath();
    for(const area of coastline)for(const ring of area)trace(ctx,ring.map(p=>project(...p)));
    ctx.fillStyle=blue;ctx.fill('evenodd');
    for(const outline of aerialGroves)fill(outline.map(([x,y])=>[x,y,showTerrain?terrainAt(x,y)+.8:.8]),shade('#789975',1));
  }
  fill([[0,-10],[974,-10],[974,1000],[0,1000]],shade('#d6dec7',1));
  for(const polygon of landscape)fill(polygon.map(p=>[...p,.15]),shade('#a2b990',1));
  function paths(routes,color,baseWidth){
    ctx.lineJoin='round';ctx.lineCap='round';
    for(const {w,path,p} of routes){
      ctx.beginPath();
      (path??p).forEach(([x,y],i)=>{
        const point=project(x,y,showTerrain?terrainAt(x,y)+.7:.7);
        if(i)ctx.lineTo(point[0],point[1]);else ctx.moveTo(point[0],point[1]);
      });
      ctx.strokeStyle=color;ctx.lineWidth=Math.max(.65,(w??baseWidth)*zoom);ctx.stroke();
    }
  }
  if(context){
    paths(localRoads,shade('#939e9a',1),6);
    paths(marinaPontoons,shade('#d1cfbb',1),4.8);
  }else paths(estateRoads,shade('#939e9a',1),6);
  paths(estatePaths,shade('#e0d3b9',1),5);
  if(context)for(const {points,fill:color,light,marking} of highwaySurface){
    if(marking&&zoom<.26)continue;
    fill(points,shade(color,light));
  }
}

export function siteSceneryFaces(project,zoom,daylight){
  const faces=highwayStructure.filter(face=>!face.marking||zoom>=.26).map(face=>{
    const points=face.points.map(p=>project(...p));
    const raised=face.points.reduce((sum,p)=>sum+p[2],0)/4;
    return {p:points,fill:face.fill,light:face.light*daylight,
      depth:points.reduce((sum,p)=>sum+p[2],0)/4+(face.marking ? .12 : raised*.001)};
  });
  for(const [x,y,radius] of canopy){
    const point=project(x,y,radius*1.5),base=project(x,y);
    faces.push({p:[point],depth:base[2]+radius,tree:{radius:radius*zoom,base},light:daylight});
  }
  return faces;
}
