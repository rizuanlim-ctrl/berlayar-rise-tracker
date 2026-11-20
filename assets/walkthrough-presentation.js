const ease = t => t*t*(3-2*t);
const mix = (a,b,t) => a+(b-a)*t;
const clamp = (n,min,max) => Math.max(min,Math.min(max,n));

export function roomSpot(room, toWorld, clear) {
  const [,x,z,yaw] = room;
  const [wx,wz] = toWorld(x,z);
  for (const radius of [0,.15,.25,.38,.48,.65,.8]) {
    for (let i=0;i<8;i++) {
      const angle=yaw+i*Math.PI/4;
      const p=[wx+radius*Math.sin(angle),wz+radius*Math.cos(angle)];
      if(clear(...p))return p;
    }
  }
  return null;
}

export function buildTour(rooms,toWorld,clear,windowOutlook) {
  const shots=[{name:'Floor plan',seconds:4,overview:true}];
  for(const room of rooms){
    const [name,,,yaw]=room;
    if(name.includes('shelter')||name.includes('bath'))continue;
    const point=roomSpot(room,toWorld,clear);
    if(!point)continue;
    const forward=[Math.sin(yaw),Math.cos(yaw)];
    const segment=[0,0];
    for(const direction of [-1,1]){
      for(const distance of [.16,.33,.51,.68]){
        if(!clear(point[0]+forward[0]*direction*distance,point[1]+forward[1]*direction*distance))break;
        segment[direction<0?0:1]=direction*distance;
      }
    }
    // Stop at the usable part of the room so the camera avoids walls and furnishings.
    shots.push({
      name,seconds:name==='Living / dining'?4.4:3.25,
      point,forward,segment,yaw
    });
  }
  shots.push({name:'Window outlook',seconds:4.4,outlook:true,...windowOutlook});
  let elapsed=0;
  return shots.map(shot=>{
    const start=elapsed;
    elapsed+=shot.seconds;
    return {...shot,start,end:elapsed};
  });
}

export function tourFrame(shot,elapsed){
  const t=clamp((elapsed-shot.start)/shot.seconds,0,1);
  const fade=1-Math.min(1,(elapsed-shot.start)/.25,(shot.end-elapsed)/.22);
  if(shot.overview)return {orbit:mix(.69,-.54,ease(t)),tilt:mix(.81,1.04,ease(t)),fade};
  if(shot.outlook)return {
    x:shot.point[0],z:shot.point[1],yaw:shot.yaw+mix(-.23,.27,ease(t)),
    pitch:mix(-.16,-.08,ease(t)),fade
  };
  const distance=mix(...shot.segment,ease(t));
  return {
    x:shot.point[0]+shot.forward[0]*distance,
    z:shot.point[1]+shot.forward[1]*distance,
    yaw:shot.yaw+mix(.18,-.19,ease(t)),
    pitch:mix(-.12,-.04,ease(t)),fade
  };
}

export function loungeFurniture([x,z,u,v],towards,draw) {
  const side=(u-x)<(v-z);
  const reverse=side?towards[0]>(x+u)/2:towards[1]>(z+v)/2;
  const place=(a,b,c,d,y,h,material)=>{
    if(reverse)[a,c]=[1-c,1-a];
    const box=side?[mix(x,u,a),mix(z,v,b),mix(x,u,c),mix(z,v,d)]
      :[mix(x,u,b),mix(z,v,a),mix(x,u,d),mix(z,v,c)];
    draw(...box,y,h,material);
  };
  place(0,0,1,1,.09,.34,'sage');
  place(.77,0,1,1,.28,.84,'sage');
  for(const [a,b] of [[.095,.49],[.51,.905]]){
    place(.10,a,.78,b,.33,.46,'upholstery');
    place(.61,a,.84,b,.46,.78,'upholstery');
  }
  for(const [a,b] of [[0,.09],[.91,1]])place(.05,a,.94,b,.27,.60,'sage');
  place(.45,.10,.72,.26,.52,.70,'cream');
  place(.43,.73,.74,.87,.49,.65,'accent');
  for(const [a,b] of [[.12,.14],[.76,.14],[.12,.80],[.76,.80]])place(a,b,a+.09,b+.04,.0,.11,'dark');
}

export function tableFurniture([x,z,u,v,h],draw) {
  draw(x,z,u,v,h-.054,h,'wood');
  for(const [a,b] of [[.13,.14],[.87,.14],[.13,.86],[.87,.86]]){
    const xx=mix(x,u,a),zz=mix(z,v,b);
    draw(xx-2,zz-2,xx+2,zz+2,.0,h-.053,'dark');
  }
  if(h<=.5){
    draw(mix(x,u,.21),mix(z,v,.18),mix(x,u,.52),mix(z,v,.54),h+.002,h+.018,'accent');
    draw(mix(x,u,.26),mix(z,v,.23),mix(x,u,.56),mix(z,v,.58),h+.018,h+.030,'cream');
  }
}
