// Simplified landscape tracings from Esri World Imagery. Two shoreline points
// at Labrador Nature Reserve and Keppel Island align the traced features to
// the OSM shoreline in HDB-plan coordinates. Construction areas are omitted.
const planPoint = ([x,z]) => {
  const east = x - 482, south = z - 716;
  return [-530 + east * 4.84 + south * .094, 2162 + south * 4.84 - east * .094];
};

export const aerialGroves = [
  // Labrador coastal woodland and the wooded strip along Berlayer Creek.
  [[183,373],[241,342],[285,367],[324,411],[383,462],[425,516],[444,553],[419,600],[370,546],[312,493],[266,448],[230,442],[209,402]],
  [[367,261],[419,250],[466,274],[515,312],[510,363],[483,351],[461,325],[417,301],[381,305]],
  // Bukit Chermin and the waterfront trees below Reflections.
  [[611,504],[648,476],[675,463],[698,479],[723,505],[724,543],[694,562],[657,558],[626,536]],
  // West Sentosa and the woodland north of Telok Blangah Road.
  [[587,850],[647,837],[719,851],[774,890],[745,918],[692,918],[655,887],[612,893]],
  [[856,221],[889,130],[938,61],[1013,29],[1090,22],[1090,292],[1048,326],[1003,296],[962,251],[921,239],[888,250]],
].map(outline => outline.map(planPoint));

export const marinaPontoons = [
  [[802,517],[850,550]],
  [[800,540],[837,569]],
  [[818,568],[851,594]],
  [[863,529],[901,560]],
  [[881,556],[921,584]],
  [[903,582],[941,610]],
].map(path => ({width: 2.2, path: path.map(planPoint)}));
