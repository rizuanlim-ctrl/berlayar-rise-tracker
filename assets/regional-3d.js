// Longitude, latitude. The project centre is shared with the precinct's 5 km reference.
const site = [103.8091, 1.26925];
const earthView = {center: [103.8104835, 1.27080123], bearing: 51.74479245, pitch: 60, zoom: 15};
const places = [
  ['Berlayar Rise', site],
  ['Reflections at Keppel Bay', [103.8118, 1.2664]],
  ['VivoCity', [103.8224, 1.2643]],
  ['Mount Faber', [103.8198, 1.2737]],
  ['Sentosa · Imbiah Lookout', [103.8172, 1.2547]],
  ['Marina Bay Sands', [103.8607, 1.2834]],
  ['Singapore Botanic Gardens', [103.8155, 1.3138]],
  ['National Stadium', [103.8740, 1.3040]],
  ['Jurong East MRT', [103.7422, 1.3331]],
  ['Bukit Timah Hill', [103.7765, 1.3547]]
];
const radians = Math.PI / 180;
function radiusRing(km) {
  const lat = site[1] * radians;
  const arc = km / 6371.0088;
  return Array.from({length:181}, (_, i) => {
    const bearing = i * 2 * radians;
    const dest = Math.asin(Math.sin(lat)*Math.cos(arc) + Math.cos(lat)*Math.sin(arc)*Math.cos(bearing));
    const lon = Math.atan2(Math.sin(bearing)*Math.sin(arc)*Math.cos(lat), Math.cos(arc)-Math.sin(lat)*Math.sin(dest));
    return [site[0] + lon / radians, dest / radians];
  });
}
const ring = radiusRing(15);
const select = document.querySelector('#place');
select.add(new Option('Choose a place', ''));
places.forEach(([name], i) => select.add(new Option(name, i)));
const status = document.querySelector('#status');
function start() {
  const map = new maplibregl.Map({
    container:'map', style:'https://tiles.openfreemap.org/styles/liberty',
    ...earthView, maxPitch:75, maxZoom:19, minZoom:8, maxBounds:[[103.50,0.96],[104.12,1.58]],
    canvasContextAttributes:{antialias:true}
  });
  map.addControl(new maplibregl.NavigationControl({visualizePitch:true}));
  map.addControl(new maplibregl.ScaleControl({unit:'metric'}));
  map.on('error', () => { status.textContent='Some map data could not load. Check your connection and reload.'; });
  map.on('load', () => {
    status.textContent='';
    map.addSource('elevation', {
      type:'raster-dem', encoding:'terrarium', tileSize:256, maxzoom:15,
      tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      attribution:'Terrain: <a href="https://registry.opendata.aws/terrain-tiles/">Mapzen / AWS Open Data</a>'
    });
    map.setTerrain({source:'elevation',exaggeration:1});
    map.addSource('radius', {type:'geojson', data:{type:'LineString', coordinates:ring}});
    map.addLayer({id:'radius',type:'line',source:'radius',paint:{'line-color':'#14704d','line-width':2.5,'line-dasharray':[4,3]}});
    new maplibregl.Marker({color:'#146743'}).setLngLat(site).setPopup(new maplibregl.Popup().setText('Berlayar Rise · project centre')).addTo(map);
  });
  select.onchange = () => {
    if (select.value !== '') map.flyTo({center:places[Number(select.value)][1], zoom:16, pitch:60, bearing:earthView.bearing});
  };
  document.querySelector('#reference').onclick=() => {select.value='';map.flyTo(earthView);};
  document.querySelector('#overview').onclick=() => {
    select.value='';
    const bounds = ring.reduce((box,point) => box.extend(point), new maplibregl.LngLatBounds());
    map.fitBounds(bounds,{padding:30,pitch:0,bearing:0});
  };
}
async function startPlanMap() {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'assets/leaflet/leaflet.css';
  document.head.append(css);
  const script = document.createElement('script');
  script.src = 'assets/leaflet/leaflet.js';
  await new Promise((resolve,reject) => {
    script.onload=resolve;
    script.onerror=reject;
    document.head.append(script);
  });
  const container=document.createElement('div');
  container.id='map';
  document.querySelector('#map').replaceWith(container);
  const latLng=point => [point[1],point[0]];
  const map=L.map(container,{attributionControl:true}).setView(latLng(site),14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  }).addTo(map);
  const circle=L.circle(latLng(site),{radius:15000,color:'#14704d',weight:2,fill:false}).addTo(map);
  places.forEach(([name,point]) => L.circleMarker(latLng(point),{radius:5,color:'#165438',fillOpacity:1}).bindTooltip(name).addTo(map));
  select.onchange=() => {if(select.value!=='') map.setView(latLng(places[Number(select.value)][1]),16);};
  document.querySelector('#overview').onclick=() => {select.value='';map.fitBounds(circle.getBounds(),{padding:[20,20]});};
  document.querySelector('#reference').hidden=true;
  status.textContent='Plan view · 3D rendering is unavailable in this browser.';
}
try { start(); } catch {
  startPlanMap().catch(() => {status.textContent='Map unavailable. Open the Google Earth view below.';});
}
