import {PRECINCT_ROUTES, streetCamera} from './berlayar-street-routes.js?v=1';
import {drawNeighbourhood, precinctSite} from './type-2-walkthrough-site.js?v=11';
import {PIXELS_PER_METRE} from './berlayar-site-model.js?v=2';
import {terrainGrid} from './berlayar-terrain.js?v=1';

export {PRECINCT_ROUTES};

const COLORS = {
  terrain:'#a9ad8d', landscape:'#8da471', road:'#858a88', kerb:'#bfbcb1', path:'#dbcfb8',
  water:'#588e9f', grove:'#698658', tree:'#64864f', treeLight:'#88a967', bark:'#756654',
  facade:'#e3ded0', facadeAccent:'#b7c0b7', selectedFacade:'#ddb582', facadeGlass:'#54717e',
  facadeLedge:'#f4efdf', windowReveal:'#becac3', deckVoid:'#414e51', facility:'#d0d0c0',
  remoteFacade:'#aabac1', roof:'#dcd9ce', roofGarden:'#8ca478', pontoon:'#dcd7c7',
  surfaceAsphalt:'#545e63', surfaceEdge:'#e2ded1', highwayMedian:'#9d9b8f', highwayAsphalt:'#455158',
  highwayStripe:'#f1ecda', highwaySoffit:'#6d797a', highwayFascia:'#a4adad', highwayRail:'#c5cac3',
  railCap:'#e7e6dc', highwayPier:'#a6aaa0',
};
const palette = Object.fromEntries(Object.entries(COLORS).map(([name,hex])=>[
  name,hex.slice(1).match(/../g).map(channel=>parseInt(channel,16)/255)
]));
const near = .22;
const northTerrain=[];
for(let row=1;row<terrainGrid.heights.length;row++){
  const south=terrainGrid.y+row*terrainGrid.step;
  if(south> -180)break;
  for(let col=1;col<terrainGrid.heights[row].length;col++){
    const corners=[[col-1,row-1],[col,row-1],[col,row],[col-1,row]].map(([i,j])=>[
      (terrainGrid.x+i*terrainGrid.step-485)/PIXELS_PER_METRE,terrainGrid.heights[j][i],
      (terrainGrid.y+j*terrainGrid.step-435)/PIXELS_PER_METRE
    ]);
    const relief=corners.reduce((sum,p)=>sum+p[1],0)/4;
    if(relief>1)northTerrain.push({corners,relief});
  }
}

function webglRenderer(canvas){
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true});
  if(!gl)return null;
  const vertex=`
    attribute vec3 point;
    attribute vec3 colour;
    attribute float surface;
    uniform vec3 eye, front, right, up;
    uniform vec2 scale;
    varying mediump vec3 tint;
    varying mediump float depth, grain;
    varying mediump vec2 ground;
    void main(){
      vec3 v=point-eye;
      float z=dot(v,front);
      tint=colour;
      depth=z;
      grain=surface;
      ground=point.xz;
      gl_Position=vec4(dot(v,right)*scale.x,dot(v,up)*scale.y,1.0003*z-.44,z);
    }
  `;
  const fragment=`
    precision mediump float;
    varying vec3 tint;
    varying float depth, grain;
    varying vec2 ground;
    uniform vec3 haze;
    void main(){
      float texture=sin(ground.x*.75+sin(ground.y*.23)*2.0)*sin(ground.y*.58);
      vec3 local=tint*(1.0+texture*grain*(1.0-smoothstep(40.0,240.0,depth)));
      float mist=smoothstep(90.0,760.0,depth)*.69;
      gl_FragColor=vec4(mix(local,haze,mist),1.);
    }
  `;
  const program=gl.createProgram();
  for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
    const shader=gl.createShader(type);
    gl.shaderSource(shader,source);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))return null;
    gl.attachShader(program,shader);
  }
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))return null;
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
  for(const [name,size,offset] of [['point',3,0],['colour',3,12],['surface',1,24]]){
    const index=gl.getAttribLocation(program,name);
    gl.enableVertexAttribArray(index);
    gl.vertexAttribPointer(index,size,gl.FLOAT,false,28,offset);
  }
  const uniforms=Object.fromEntries(['eye','front','right','up','scale','haze'].map(key=>[key,gl.getUniformLocation(program,key)]));
  let count=0;
  return {
    upload(faces){
      const vertices=new Float32Array(faces.length*42);
      let offset=0;
      for(const {points,colour,grain} of faces){
        for(const index of [0,1,2,0,2,3]){
          vertices.set(points[index],offset);
          vertices.set(colour,offset+3);
          vertices[offset+6]=grain;
          offset+=7;
        }
      }
      count=offset/7;
      gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
    },
    draw({w,h,eye,front,right,up,focal,haze}){
      gl.viewport(0,0,w,h);
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      for(const [key,value] of Object.entries({eye,front,right,up,haze}))gl.uniform3fv(uniforms[key],value);
      gl.uniform2f(uniforms.scale,focal*h/w,focal);
      gl.drawArrays(gl.TRIANGLES,0,count);
    }
  };
}

function canvasRenderer(canvas){
  const ctx=canvas.getContext('2d');
  if(!ctx)return null;
  let faces=[];
  return {
    upload(value){faces=value;},
    draw({w,h,eye,front,right,up,focal,haze}){
      ctx.clearRect(0,0,w,h);
      const projected=[];
      const sideLimit=w/(h*focal);
      for(const {points,centre,radius,colour,layer,normal} of faces){
        const dx=centre[0]-eye[0],dy=centre[1]-eye[1],dz=centre[2]-eye[2];
        if(normal&&dx*normal[0]+dz*normal[1]>.06)continue;
        const depth=dx*front[0]+dy*front[1]+dz*front[2];
        if(depth+radius<near)continue;
        if(Math.abs(dx*right[0]+dz*right[2])>(depth+radius)*sideLimit+radius)continue;
        if(Math.abs(dx*up[0]+dy*up[1]+dz*up[2])>(depth+radius)/focal+radius)continue;
        const view=points.map(([x,y,z])=>{
          x-=eye[0];y-=eye[1];z-=eye[2];
          return [x*right[0]+z*right[2],x*up[0]+y*up[1]+z*up[2],x*front[0]+y*front[1]+z*front[2]];
        });
        const clip=[];
        for(let i=0;i<4;i++){
          const a=view[i],b=view[(i+1)%4];
          if(a[2]>=near)clip.push(a);
          if((a[2]>=near)!==(b[2]>=near)){
            const t=(near-a[2])/(b[2]-a[2]);
            clip.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,near]);
          }
        }
        if(clip.length<3)continue;
        const fog=Math.max(0,Math.min(.69,(depth-90)/970));
        projected.push({clip,layer,depth,fill:`rgb(${colour.map((c,i)=>Math.round(255*(c+(haze[i]-c)*fog))).join(',')})`});
      }
      projected.sort((a,b)=>a.layer-b.layer||b.depth-a.depth);
      const scale=h*focal/2;
      for(const {clip,fill,layer} of projected){
        ctx.beginPath();
        clip.forEach(([x,y,z],i)=>{
          const sx=w/2+x*scale/z,sy=h/2-y*scale/z;
          if(i===0)ctx.moveTo(sx,sy);else ctx.lineTo(sx,sy);
        });
        ctx.closePath();
        ctx.fillStyle=fill;
        ctx.fill();
        if(layer===0){ctx.strokeStyle=fill;ctx.lineWidth=.55;ctx.stroke();}
      }
    }
  };
}

const groundLayers={terrain:-7,northTerrain:-7,water:-6,landscape:-5,kerb:-4,road:-3,path:-2,pontoon:-2,
  surfaceAsphalt:-2,highwayMedian:-1,surfaceEdge:-1};

function streetFaces(site,solar){
  const faces=[];
  const add=(a,b,c,d,key,light,layer,normal)=>{
    // The street camera stays below the raised deck. Its upper faces would
    // otherwise be visible through the soffit in the Canvas painter.
    if(key==='highwayAsphalt'||key==='highwayStripe'||key==='railCap')return;
    const points=[a,b,c,d],centre=[0,0,0];
    for(const point of points)for(let i=0;i<3;i++)centre[i]+=point[i]/4;
    const radius=Math.max(...points.map(p=>Math.hypot(p[0]-centre[0],p[1]-centre[1],p[2]-centre[2])));
    const grain=['terrain','landscape','water','northTerrain'].includes(key)?.065:0;
    const colour=palette[key==='northTerrain'?'grove':key].map(channel=>Math.min(1,channel*light));
    faces.push({points,centre,radius,grain,colour,normal,layer:groundLayers[key]??layer??0});
  };
  drawNeighbourhood(site,0,solar,add,true);
  if(site.context){
    const daylight=Math.max(.40,Math.min(1,.64+solar.altitude/92));
    for(const {corners,relief} of northTerrain)add(...corners,'northTerrain',daylight*(.9+Math.min(60,relief)*.0023));
  }
  return faces;
}

export function createStreetView(canvas){
  let renderer=webglRenderer(canvas);
  canvas.dataset.renderer=renderer?'webgl':'canvas2d';
  if(!renderer){
    // If WebGL took ownership before failing, give Canvas 2D a fresh surface.
    const fallback=canvas.cloneNode();
    canvas.replaceWith(fallback);
    canvas=fallback;
    renderer=canvasRenderer(canvas);
  }
  let meshKey='';
  return {
    canvas,
    draw({route,distance,turn,pitch,solar,context,floorCap,selected}){
      if(!renderer)return;
      const ratio=Math.min(devicePixelRatio||1,1.5);
      const w=Math.round(canvas.clientWidth*ratio),h=Math.round(canvas.clientHeight*ratio);
      if(!w||!h)return;
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      const key=[context,floorCap,selected,Math.round(solar.azimuth/8),Math.round(solar.altitude/5)].join();
      if(key!==meshKey){renderer.upload(streetFaces(precinctSite({context,floorCap,selected}),solar));meshKey=key;}
      const {eye,yaw}=streetCamera(route,distance,turn);
      const s=Math.sin(yaw),c=Math.cos(yaw),p=Math.sin(pitch),q=Math.cos(pitch);
      const haze=solar.altitude>0?[.74,.83,.86]:[.36,.47,.56];
      const horizon=50+p*50;
      canvas.style.background=solar.altitude>0
        ? `linear-gradient(180deg,transparent,#dce9df88 ${horizon}%,#b7c6ab),url('./assets/walkthrough-daylight.webp') ${50+s*26}% 22% / cover`
        : 'linear-gradient(#24364c,#657b88 54%,#879284)';
      renderer.draw({w,h,eye,front:[s*q,p,c*q],right:[-c,0,s],up:[-s*p,q,-c*p],focal:Math.max(.87,Math.min(1.42,1.88*w/h)),haze});
    }
  };
}
