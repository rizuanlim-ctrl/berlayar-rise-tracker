// Approximate centreline from the HDB site plan and Esri aerial imagery.
// West Coast Highway runs above Telok Blangah Road along this corridor.
export const highwayCentreline = [
  [-680,-290],[-510,-248],[-360,-191],[-220,-123],[-105,-64],[22,-26],
  [149,-9],[263,10],[368,19],[477,17],[586,27],[689,42],[793,52],
  [894,57],[979,61],[1059,83],[1138,121],[1242,181],[1360,248],[1487,327],
];
const deckHeight = 8.6;
const halfDeckWidth = 11.4;

function pointBetween(a, b, distance) {
  const [dx,dz] = [b[0]-a[0],b[1]-a[1]];
  const length = Math.hypot(dx,dz);
  return [a[0]+dx*distance/length,a[1]+dz*distance/length];
}

export function highwayOutlook(path, centre) {
  let best = null;
  for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i];
    const [dx,dz]=[b[0]-a[0],b[1]-a[1]];
    const length=Math.hypot(dx,dz);
    const along=((centre[0]-a[0])*dx+(centre[1]-a[1])*dz)/length;
    const point=pointBetween(a,b,Math.max(0,Math.min(length,along)));
    const range=Math.hypot(point[0]-centre[0],point[1]-centre[1]);
    if(!best||range<best.range)best={point,range};
  }
  return [best.point,deckHeight*.64];
}

export function drawHighway(path, ground, light, draw) {
  // Break the path into short sections for the canvas renderer's depth sorting.
  let distance=0;
  const sections=[{point:path[0],distance}];
  for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i];
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const count=Math.ceil(length/11);
    for(let j=1;j<=count;j++){
      const along=length*j/count;
      sections.push({point:pointBetween(a,b,along),distance:distance+along});
    }
    distance+=length;
  }
  const direction=(a,b)=>{
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    return [-dz/length,dx/length];
  };
  const frames=sections.map(({point,distance},i)=>{
    const before=i?direction(sections[i-1].point,point):direction(point,sections[1].point);
    const after=i===sections.length-1?before:direction(point,sections[i+1].point);
    const scale=1+before[0]*after[0]+before[1]*after[1];
    return {point,distance,normal:[(before[0]+after[0])/scale,(before[1]+after[1])/scale]};
  });
  const at=({point:[x,z],normal:[nx,nz]},offset,height)=>[x+offset*nx,ground+height,z+offset*nz];
  const paint=(...args)=>draw(...args,light);
  for(let i=1;i<frames.length;i++){
    const a=frames[i-1],b=frames[i];
    const ribbon=(left,right,height,color)=>paint(at(a,left,height),at(b,left,height),at(b,right,height),at(a,right,height),color);
    const face=(offset,bottom,top,color)=>paint(at(a,offset,bottom),at(b,offset,bottom),at(b,offset,top),at(a,offset,top),color);

    ribbon(-16,16,.16,'surfaceAsphalt');
    ribbon(-2.2,2.2,.20,'highwayMedian');
    ribbon(-halfDeckWidth,halfDeckWidth,deckHeight-1.25,'highwaySoffit');
    ribbon(-halfDeckWidth,halfDeckWidth,deckHeight,'highwayAsphalt');
    for(const side of [-1,1]){
      const edge=side*halfDeckWidth;
      face(edge,deckHeight-1.25,deckHeight,'highwayFascia');
      face(edge,deckHeight,deckHeight+.85,'highwayRail');
      face(edge-side*.42,deckHeight,deckHeight+.85,'highwayRail');
      ribbon(Math.min(edge,edge-side*.42),Math.max(edge,edge-side*.42),deckHeight+.85,'railCap');
      ribbon(edge-side*1.0-.08,edge-side*1.0+.08,deckHeight+.026,'highwayStripe');
      ribbon(side*15.45-.07,side*15.45+.07,.184,'surfaceEdge');
    }
    for(const offset of [-.32,.32])face(offset,deckHeight,deckHeight+.70,'highwayRail');
    ribbon(-.32,.32,deckHeight+.70,'railCap');

    const length=b.distance-a.distance;
    const sectionAt=t=>({
      point:a.point.map((n,j)=>n+(b.point[j]-n)*t),
      normal:a.normal.map((n,j)=>n+(b.normal[j]-n)*t),
    });
    for(let dash=Math.floor(a.distance/11)*11;dash<b.distance;dash+=11){
      const start=Math.max(dash,a.distance),end=Math.min(dash+4,b.distance);
      if(end<=start)continue;
      const p=sectionAt((start-a.distance)/length),q=sectionAt((end-a.distance)/length);
      const mark=(offset,y,key)=>paint(at(p,offset-.07,y),at(q,offset-.07,y),at(q,offset+.07,y),at(p,offset+.07,y),key);
      for(const offset of [-7.25,-3.85,3.85,7.25])mark(offset,deckHeight+.026,'highwayStripe');
      for(const offset of [-11.1,-7.0,7.0,11.1])mark(offset,.184,'surfaceEdge');
    }
    const pier=18+Math.ceil((a.distance-18)/31)*31;
    if(pier>=b.distance)continue;
    const before=sectionAt((pier-1.30-a.distance)/length),after=sectionAt((pier+1.30-a.distance)/length);
    const base=[at(before,-1.20,.20),at(after,-1.20,.20),at(after,1.20,.20),at(before,1.20,.20)];
    const top=base.map(([x,,z])=>[x,ground+deckHeight-1.25,z]);
    for(let j=0;j<4;j++){
      const next=(j+1)%4;
      draw(base[j],base[next],top[next],top[j],'highwayPier',light*(.79+j*.05));
    }
  }
}
