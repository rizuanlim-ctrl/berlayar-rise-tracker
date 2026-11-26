// Shared material IDs for the unit and street WebGL renderers.
const exteriorMaterials = {
  water: 3, terrain: 6, landscape: 6, grove: 6, roofGarden: 6, northTerrain: 6,
  tree: 6, treeLight: 6, road: 9, surfaceAsphalt: 9, highwayAsphalt: 9, path: 9,
  facade: 10, facadeAccent: 10, facility: 10, selectedFacade: 10, remoteFacade: 10,
  facadeGlass: 11, roof: 12,
};

export function exteriorMaterial(key) {
  return exteriorMaterials[key] ?? 0;
}

export function interiorMaterial(key) {
  if (key === 'floor' || key.startsWith('plank')) return 1;
  if (key === 'wall' || key === 'ceiling' || key === 'structure') return 2;
  if (key === 'wood' || key === 'door') return 5;
  if (['upholstery', 'rug', 'linen', 'blanket', 'accent'].includes(key)) return 4;
  if (key === 'tile' || key === 'tiledWall' || key === 'shelter') return 8;
  return 0;
}

// Fade fine patterns before they become too small to resolve on the canvas.
export const materialShader = `
float fleck(vec2 p) {
  vec3 q = fract(p.xyx * vec3(.1031, .11369, .13787));
  q += dot(q, q.yzx + 11.73);
  return fract((q.x + q.y) * q.z) - .5;
}

float surfaceTone(float kind, vec3 p, float depth) {
  if (kind < .5) return 1.0;
  vec2 xz = p.xz;
  float fine = 1.0 - smoothstep(2.0, 11.0, depth);
  if (kind < 1.5 || (kind > 4.5 && kind < 5.5)) {
    vec2 wood = kind < 1.5 ? xz : vec2(p.x + p.z, p.y);
    float warp = sin(wood.x * 2.7 + wood.y * 4.1) + .45 * sin(wood.x * 9.0);
    float ribbons = sin(wood.y * 75.0 + warp * 2.4);
    float fibres = fleck(floor(wood * vec2(13.0, 101.0)));
    return .99 + .035 * sin(wood.y * 18.0 + warp) + fine * (.046 * ribbons + .055 * fibres);
  }
  if (kind < 2.5) {
    float heightShade = smoothstep(.0, .55, p.y) * smoothstep(.0, .22, 2.62 - p.y);
    return .944 + .048 * heightShade + .033 * fine * fleck(floor(xz * 66.0 + p.y * vec2(69.0, 39.0)));
  }
  if (kind < 3.5) {
    float swell = sin(p.x * .079 + p.z * .043);
    float waves = sin(p.x * .62 + p.z * .29 + swell * 1.9);
    float chop = sin(p.z * 1.7 - p.x * .37 + waves);
    return 1.0 + .045 * swell + (1.0 - smoothstep(40.0, 460.0, depth)) * (.048 * waves + .027 * chop);
  }
  if (kind < 4.5) {
    vec2 textile = xz * 92.0 + p.y * vec2(43.0, 61.0);
    float folds = sin(p.x * 17.0 + sin(p.z * 7.0)) * sin(p.z * 9.0);
    return .99 + .034 * folds + .08 * fine * fleck(floor(textile));
  }
  if (kind < 6.5) {
    float patches = sin(p.x * .27 + sin(p.z * .19)) * cos(p.z * .31);
    float leaves = fleck(floor(xz * 3.6 + p.y * vec2(1.3, 2.7)));
    return 1.0 + (1.0 - smoothstep(35.0, 360.0, depth)) * (.10 * patches + .095 * leaves);
  }
  if (kind < 8.5) {
    vec2 stone = xz + p.y * vec2(.61, .84);
    float cloud = sin(stone.x * 11.0 + cos(stone.y * 7.0)) * sin(stone.y * 12.0);
    return .99 + .042 * cloud + .048 * fine * fleck(floor(stone * 65.0));
  }
  if (kind < 9.5) {
    float wear = sin(p.x * .93 + sin(p.z * .62)) * sin(p.z * .81);
    return 1.0 + (1.0 - smoothstep(12.0, 120.0, depth)) * (.047 * wear + .16 * fleck(floor(xz * 12.0)));
  }
  if (kind < 10.5) {
    return 1.0 + (1.0 - smoothstep(24.0, 135.0, depth)) * .055 * fleck(floor(xz * 8.0 + p.y * vec2(5.0, 9.0)));
  }
  if (kind < 11.5) {
    float reflectedSky = sin(p.y * 2.1 + sin((p.x + p.z) * .86));
    return 1.0 + .12 * reflectedSky * (1.0 - smoothstep(25.0, 215.0, depth));
  }
  return 1.0 + .05 * sin(p.x * .75) * cos(p.z * .86) * (1.0 - smoothstep(30.0, 160.0, depth));
}
`;
