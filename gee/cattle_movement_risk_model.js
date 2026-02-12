// ============================================================================
// South Sudan Cattle Movement Risk Model (Google Earth Engine)
// ============================================================================
// Predicts cattle movement likelihood using environmental indicators:
//   Water availability, forage quality, land suitability, slope, and human
//   influence — weighted by season (dry vs. wet).
//
// Outputs:
//   1. Continuous cattle likelihood raster (0–1)
//   2. Classified risk map (4 classes, deterministic thresholds)
//   3. Permanent water bodies mask
//
// All exports: GeoTIFF, EPSG:4326, 500 m resolution.
// ============================================================================

// === CONFIG ===
var studyRegion = ee.Geometry.Rectangle([31.0, 4.5, 32.0, 5.0]); // Juba study area
var analysisEnd = ee.Date('2025-01-01');
var analysisStart = analysisEnd.advance(-90, 'day');           // 90-day lookback
var historicalStart = analysisEnd.advance(-365 * 3, 'day');    // 3-year historical baseline start
var historicalEnd = analysisEnd.advance(-365, 'day');           // 1-year ago baseline end

// Export configuration
var exportScale = 500;   // metres
var exportCrs = 'EPSG:4326';

// Determine season (Apr–Oct = wet, Nov–Mar = dry)
var month = analysisEnd.get('month');
var season = ee.Algorithms.If(
  ee.Number(month).gte(4).and(ee.Number(month).lte(10)),
  'wet_season',
  'dry_season'
);
print('Season:', season);

// === DATA COLLECTION ===

// 1. WATER SOURCES
var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
  .filterDate(analysisStart, analysisEnd)
  .filterBounds(studyRegion)
  .select('precipitation');

var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterDate(analysisStart, analysisEnd)
  .filterBounds(studyRegion)
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
  .select('VV');

var permanentWater = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
  .select('occurrence')
  .clip(studyRegion);

// 2. VEGETATION — Landsat 8 with cloud filter
var computeNDVI = function(img) {
  var nir = img.select('SR_B5').multiply(0.0000275).add(-0.2);
  var red = img.select('SR_B4').multiply(0.0000275).add(-0.2);
  var ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI');
  return ndvi.copyProperties(img, ['system:time_start']);
};

var landsat = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterDate(analysisStart, analysisEnd)
  .filterBounds(studyRegion)
  .filter(ee.Filter.lt('CLOUD_COVER', 70))
  .select(['SR_B4', 'SR_B5'])
  .map(computeNDVI);

var landsatHist = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterDate(historicalStart, historicalEnd)
  .filterBounds(studyRegion)
  .filter(ee.Filter.lt('CLOUD_COVER', 70))
  .select(['SR_B4', 'SR_B5'])
  .map(computeNDVI);

print('Landsat current scene count:', landsat.size());
print('Landsat historical scene count:', landsatHist.size());

// 3. TERRAIN — resampled to export resolution
var srtm = ee.Image('USGS/SRTMGL1_003')
  .clip(studyRegion)
  .reproject({crs: exportCrs, scale: exportScale});
var slope = ee.Terrain.slope(srtm);

// 4. HUMAN SETTLEMENTS — resampled to export resolution
var population = ee.ImageCollection('WorldPop/GP/100m/pop')
  .filterBounds(studyRegion)
  .sort('system:time_start', false)
  .first()
  .clip(studyRegion)
  .reproject({crs: exportCrs, scale: exportScale});

var landcover = ee.ImageCollection('ESA/WorldCover/v200')
  .first()
  .clip(studyRegion);

// === DERIVED INDICATORS ===

// A. WATER AVAILABILITY SCORE
var s1Median = s1.median();
var currentWater = s1Median.lt(-16).rename('current_water');

var rain30 = chirps.sum().rename('rain_30d');

var waterBinary = permanentWater.gt(50).unmask(0);
var distToWater = waterBinary.fastDistanceTransform().sqrt()
  .multiply(ee.Image.pixelArea().sqrt()).divide(1000);

var waterProximity = ee.Image(1).divide(distToWater.add(1)).pow(2);
var waterScore = waterProximity.multiply(0.5)
  .add(currentWater.multiply(0.3))
  .add(rain30.divide(150).clamp(0, 1).multiply(0.2))
  .rename('water_score')
  .clamp(0, 1);

// B. FORAGE QUALITY SCORE
var ndviCurrent = landsat.reduce(ee.Reducer.percentile([50]))
  .rename('NDVI')
  .clip(studyRegion);

var ndviHistorical = landsatHist.reduce(ee.Reducer.percentile([50]))
  .rename('NDVI')
  .clip(studyRegion);

// Clamp NDVI to valid range and fill gaps
ndviCurrent = ndviCurrent.clamp(-1, 1).unmask(0.3);
ndviHistorical = ndviHistorical.clamp(-1, 1).unmask(0.3);

var ndviAnomaly = ndviCurrent.subtract(ndviHistorical).clamp(-0.5, 0.5);

var forageScore = ndviCurrent.add(1).divide(2).multiply(0.7)
  .add(ndviAnomaly.add(0.15).divide(0.3).clamp(0, 1).multiply(0.3))
  .rename('forage_score')
  .clamp(0, 1)
  .unmask(0.3);

// C. LAND SUITABILITY SCORE
var grassland = landcover.eq(30).or(landcover.eq(40));
var shrubland = landcover.eq(20);
var forest = landcover.gte(10).and(landcover.lte(12));

var habitatScore = grassland.multiply(1.0)
  .add(shrubland.multiply(0.6))
  .add(forest.multiply(0.2))
  .unmask(0.5)
  .rename('habitat_score');

var slopeScore = ee.Image(1).subtract(slope.divide(30).clamp(0, 1))
  .rename('slope_score');

// D. HUMAN INFLUENCE SCORE
var popDensity = population.divide(100).clamp(0, 10).unmask(0);

var humanScore = popDensity.expression(
  "(pop < 0.5) ? pop * 0.2 : -0.5 * (pop - 0.5) / 9.5",
  {pop: popDensity}
).rename('human_influence')
.unmask(0);

// --- Intermediate layer validation ---
var validationParams = {
  reducer: ee.Reducer.minMax(),
  geometry: studyRegion,
  scale: 5000,
  maxPixels: 1e10,
  bestEffort: true
};

print('Water score min/max:',    waterScore.reduceRegion(validationParams));
print('Forage score min/max:',   forageScore.reduceRegion(validationParams));
print('Habitat score min/max:',  habitatScore.reduceRegion(validationParams));
print('Slope score min/max:',    slopeScore.reduceRegion(validationParams));
print('Human influence min/max:', humanScore.reduceRegion(validationParams));

// E. SEASONAL WEIGHTING
//   Dry season emphasises water; wet season emphasises forage.
var waterWeight  = ee.Number(ee.Algorithms.If(ee.String(season).equals('dry_season'), 0.45, 0.25));
var forageWeight = ee.Number(ee.Algorithms.If(ee.String(season).equals('dry_season'), 0.25, 0.40));
var habitatWeight = ee.Number(0.15);
var slopeWeight   = ee.Number(0.10);
var humanWeight   = ee.Number(0.05);

print('Weights — water:', waterWeight, 'forage:', forageWeight);

// === FINAL CATTLE LIKELIHOOD MODEL ===
var cattleLikelihood = waterScore.multiply(waterWeight)
  .add(forageScore.multiply(forageWeight))
  .add(habitatScore.multiply(habitatWeight))
  .add(slopeScore.multiply(slopeWeight))
  .add(humanScore.multiply(humanWeight))
  .rename('cattle_likelihood')
  .clip(studyRegion);

// Exclusion zones — set excluded areas to 0
var urbanMask = population.lt(500);          // mask out dense settlements
var waterExclude = permanentWater.lt(80);    // mask out permanent water

var finalLikelihood = cattleLikelihood
  .where(urbanMask.not(), 0)
  .where(waterExclude.not(), 0)
  .rename('cattle_likelihood');

// Reproject to consistent CRS and resolution
finalLikelihood = finalLikelihood.reproject({crs: exportCrs, scale: exportScale});

// Validate final likelihood range
print('Final likelihood min/max:',
  finalLikelihood.reduceRegion(validationParams));

// === CLASSIFICATION FUNCTION ===
// Deterministic, reusable classifier.  Uses additive threshold gates so every
// pixel falls into exactly one class with no gaps or overlaps.
//
// Class 0 : Excluded        (likelihood == 0)
// Class 1 : Low             (0 < likelihood < 0.3)
// Class 2 : Medium-Low      (0.3 <= likelihood < 0.5)
// Class 3 : Medium-High     (0.5 <= likelihood < 0.7)
// Class 4 : High            (likelihood >= 0.7)
//
// The additive approach works because each .gte() evaluates to 0 or 1:
//   class = gt(0) + gte(0.3) + gte(0.5) + gte(0.7)
// A pixel at 0.6 scores: 1 + 1 + 1 + 0 = 3 (Medium-High). ✓

var classifyLikelihood = function(likelihoodImage) {
  return likelihoodImage.gt(0)
    .add(likelihoodImage.gte(0.3))
    .add(likelihoodImage.gte(0.5))
    .add(likelihoodImage.gte(0.7))
    .byte()
    .rename('cattle_class');
};

var cattleClasses = classifyLikelihood(finalLikelihood)
  .reproject({crs: exportCrs, scale: exportScale});

// Validate classification: print pixel counts per class via histogram
print('Classification histogram:',
  cattleClasses.reduceRegion({
    reducer: ee.Reducer.frequencyHistogram(),
    geometry: studyRegion,
    scale: 5000,
    maxPixels: 1e10,
    bestEffort: true
  }));

// === VISUALIZATION ===
Map.centerObject(studyRegion, 7);

var waterBodies = permanentWater.gt(80);
Map.addLayer(waterBodies.updateMask(waterBodies),
  {palette: ['0000ff']}, 'Water Bodies', true);

Map.addLayer(finalLikelihood,
  {min: 0, max: 1, palette: ['440154', '31688e', '35b779', 'fde724']},
  'Cattle Likelihood', true);

// Toggle-off layers (enable manually if needed)
Map.addLayer(ndviCurrent, {min: 0, max: 0.6, palette: ['ffffff', '00ff00']}, 'NDVI', false);
Map.addLayer(waterScore, {min: 0, max: 1, palette: ['red', 'yellow', 'cyan']}, 'Water Score', false);
Map.addLayer(forageScore, {min: 0, max: 1, palette: ['brown', 'yellow', 'green']}, 'Forage Score', false);
Map.addLayer(distToWater, {min: 0, max: 20, palette: ['blue', 'white', 'red']}, 'Distance to Water', false);

var highProbability = finalLikelihood.gt(0.65);
Map.addLayer(highProbability.updateMask(highProbability),
  {palette: ['red']}, 'High Probability', false);

// === SUMMARY STATISTICS ===
var stats = finalLikelihood.reduceRegion({
  reducer: ee.Reducer.mean().combine({
    reducer2: ee.Reducer.stdDev(),
    sharedInputs: true
  }),
  geometry: studyRegion,
  scale: 5000,
  maxPixels: 1e10,
  bestEffort: true
});
print('Likelihood statistics (mean / stdDev):', stats);

var areaStats = highProbability.multiply(ee.Image.pixelArea()).divide(1e6)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: studyRegion,
    scale: 5000,
    maxPixels: 1e10,
    bestEffort: true
  });
print('High-probability area (km²):', areaStats);

// === EXPORTS (GeoTIFF, EPSG:4326, 500 m) ===

// 1. Continuous likelihood surface
Export.image.toDrive({
  image: finalLikelihood.float(),
  description: 'south_sudan_cattle_likelihood_full',
  region: studyRegion,
  scale: exportScale,
  maxPixels: 1e11,
  crs: exportCrs,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true
  }
});

// 2. Classified risk map (4 classes)
Export.image.toDrive({
  image: cattleClasses,
  description: 'south_sudan_cattle_classes_full',
  region: studyRegion,
  scale: exportScale,
  maxPixels: 1e11,
  crs: exportCrs,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true
  }
});

// 3. Permanent water bodies mask
Export.image.toDrive({
  image: waterBodies.byte().reproject({crs: exportCrs, scale: exportScale}),
  description: 'south_sudan_water_bodies_full',
  region: studyRegion,
  scale: exportScale,
  maxPixels: 1e11,
  crs: exportCrs,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true
  }
});
