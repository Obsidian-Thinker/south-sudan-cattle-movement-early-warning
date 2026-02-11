// === CONFIG ===
// Full South Sudan bounding box
var region = ee.Geometry.Rectangle([31.0, 4.5, 32.0, 5.0]); // Just Juba
var end = ee.Date('2025-01-01');
var start = end.advance(-90, 'day');
var histStart = end.advance(-365*3, 'day');
var histEnd = end.advance(-365, 'day');

// Determine season
var month = end.get('month');
var season = ee.Algorithms.If(
  ee.Number(month).gte(4).and(ee.Number(month).lte(10)),
  'wet_season',
  'dry_season'
);
print(season);

// === DATA COLLECTION ===

// 1. WATER SOURCES
var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
  .filterDate(start, end)
  .filterBounds(region)  // OPTIMIZATION: Filter by bounds early
  .select('precipitation');

var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterDate(start, end)
  .filterBounds(region)
  .filter(ee.Filter.eq('instrumentMode','IW'))
  .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING')) // OPTIMIZATION: Use only descending passes
  .select('VV');

var permanentWater = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
  .select('occurrence')
  .clip(region);

// 2. VEGETATION - LANDSAT 8/9 with OPTIMIZATION
var landsat = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterDate(start, end)
  .filterBounds(region)
  .filter(ee.Filter.lt('CLOUD_COVER', 70)) // OPTIMIZATION: Stricter cloud threshold
  .select(['SR_B4', 'SR_B5']) // OPTIMIZATION: Only select needed bands upfront
  .map(function(img) {
    var nir = img.select('SR_B5').multiply(0.0000275).add(-0.2);
    var red = img.select('SR_B4').multiply(0.0000275).add(-0.2);
    var ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI');
    return ndvi.copyProperties(img, ['system:time_start']); // OPTIMIZATION: Return only NDVI
  });

var landsatHist = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterDate(histStart, histEnd)
  .filterBounds(region)
  .filter(ee.Filter.lt('CLOUD_COVER', 70))
  .select(['SR_B4', 'SR_B5'])
  .map(function(img) {
    var nir = img.select('SR_B5').multiply(0.0000275).add(-0.2);
    var red = img.select('SR_B4').multiply(0.0000275).add(-0.2);
    var ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI');
    return ndvi.copyProperties(img, ['system:time_start']);
  });

print(landsat.size());
print(landsatHist.size());

// 3. TERRAIN - OPTIMIZATION: Resample to 500m to match export resolution
var srtm = ee.Image('USGS/SRTMGL1_003')
  .clip(region)
  .reproject({crs: 'EPSG:4326', scale: 500}); // OPTIMIZATION: Coarsen resolution
var slope = ee.Terrain.slope(srtm);

// 4. HUMAN SETTLEMENTS - OPTIMIZATION: Resample population to 500m
var population = ee.ImageCollection('WorldPop/GP/100m/pop')
  .filterBounds(region)
  .sort('system:time_start', false)
  .first()
  .clip(region)
  .reproject({crs: 'EPSG:4326', scale: 500}); // OPTIMIZATION: Resample from 100m to 500m

var landcover = ee.ImageCollection('ESA/WorldCover/v200')
  .first()
  .clip(region);

// === DERIVED INDICATORS ===

// A. WATER AVAILABILITY SCORE
var s1median = s1.median();
var currentWater = s1median.lt(-16).rename('current_water');

var rain30 = chirps.sum().rename('rain30');

var waterBinary = permanentWater.gt(50).unmask(0);
var distToWater = waterBinary.fastDistanceTransform().sqrt()
  .multiply(ee.Image.pixelArea().sqrt()).divide(1000);

var waterProximity = ee.Image(1).divide(distToWater.add(1)).pow(2);
var waterScore = waterProximity.multiply(0.5)
  .add(currentWater.multiply(0.3))
  .add(rain30.divide(150).clamp(0,1).multiply(0.2))
  .rename('water_score')
  .clamp(0, 1);

// B. FORAGE QUALITY SCORE - OPTIMIZATION: Use percentile instead of median for speed
var ndviNow = landsat.reduce(ee.Reducer.percentile([50])) // OPTIMIZATION: Percentile is faster than median
  .rename('NDVI')
  .clip(region);

var ndviHistMean = landsatHist.reduce(ee.Reducer.percentile([50]))
  .rename('NDVI')
  .clip(region);

// Clamp NDVI to valid range
ndviNow = ndviNow.clamp(-1, 1).unmask(0.3);
ndviHistMean = ndviHistMean.clamp(-1, 1).unmask(0.3);

// NDVI anomaly
var ndviAnom = ndviNow.subtract(ndviHistMean).clamp(-0.5, 0.5);

// Forage score
var forageScore = ndviNow.add(1).divide(2).multiply(0.7)
  .add(ndviAnom.add(0.15).divide(0.3).clamp(0,1).multiply(0.3))
  .rename('forage_score')
  .clamp(0, 1)
  .unmask(0.3);

// REMOVE DIAGNOSTIC PRINTS FOR SPEED - Comment these out for production
// print(ndviNow.reduceRegion({reducer: ee.Reducer.mean(), geometry: region, scale: 5000, maxPixels: 1e10}));
// print(forageScore.reduceRegion({reducer: ee.Reducer.mean(), geometry: region, scale: 5000, maxPixels: 1e10}));

// C. LAND SUITABILITY SCORE
var grassland = landcover.eq(30).or(landcover.eq(40));
var shrubland = landcover.eq(20);
var forest = landcover.gte(10).and(landcover.lte(12));

var habitatScore = grassland.multiply(1.0)
  .add(shrubland.multiply(0.6))
  .add(forest.multiply(0.2))
  .unmask(0.5)
  .rename('habitat_score');

var slopeScore = ee.Image(1).subtract(slope.divide(30).clamp(0,1))
  .rename('slope_score');

// D. HUMAN INFLUENCE SCORE
var popDensity = population.divide(100).clamp(0,10).unmask(0);

var humanScore = popDensity.expression(
  "(pop < 0.5) ? pop * 0.2 : -0.5 * (pop - 0.5) / 9.5",
  {pop: popDensity}
).rename('human_influence')
.unmask(0);

// E. SEASONAL ADJUSTMENT
var waterWeight = ee.Number(ee.Algorithms.If(ee.String(season).equals('dry_season'), 0.45, 0.25));
var forageWeight = ee.Number(ee.Algorithms.If(ee.String(season).equals('dry_season'), 0.25, 0.40));
var habitatWeight = ee.Number(0.15);
var slopeWeight = ee.Number(0.10);
var humanWeight = ee.Number(0.05);

print(waterWeight);
print(forageWeight);

// === FINAL CATTLE LIKELIHOOD MODEL ===
var cattleLikelihood = waterScore.multiply(waterWeight)
  .add(forageScore.multiply(forageWeight))
  .add(habitatScore.multiply(habitatWeight))
  .add(slopeScore.multiply(slopeWeight))
  .add(humanScore.multiply(humanWeight))
  .rename('cattle_likelihood')
  .clip(region);

// REMOVE DIAGNOSTIC PRINTS FOR PRODUCTION SPEED
// print(waterScore.reduceRegion({reducer: ee.Reducer.mean(), geometry: region, scale: 5000, maxPixels: 1e10}));
// print(habitatScore.reduceRegion({reducer: ee.Reducer.mean(), geometry: region, scale: 5000, maxPixels: 1e10}));
// print(slopeScore.reduceRegion({reducer: ee.Reducer.mean(), geometry: region, scale: 5000, maxPixels: 1e10}));
// print(humanScore.reduceRegion({reducer: ee.Reducer.mean(), geometry: region, scale: 5000, maxPixels: 1e10}));
// print(cattleLikelihood.reduceRegion({reducer: ee.Reducer.mean(), geometry: region, scale: 5000, maxPixels: 1e10}));

// Create exclusion zones
var urbanMask = population.lt(500);
var waterExclude = permanentWater.lt(80);

// Set excluded areas to 0 probability
var finalLikelihood = cattleLikelihood
  .where(urbanMask.not(), 0)
  .where(waterExclude.not(), 0)
  .rename('cattle_likelihood');

// OPTIMIZATION: Reproject final output to consistent CRS and scale
finalLikelihood = finalLikelihood.reproject({crs: 'EPSG:4326', scale: 500});

// === VISUALIZATION ===
Map.centerObject(region, 7);

// OPTIMIZATION: Reduce number of visible layers - too many layers slow down rendering
// Only show the most important layers by default

// Water bodies
var waterBodies = permanentWater.gt(80);
Map.addLayer(waterBodies.updateMask(waterBodies),
  {palette:['0000ff']}, 'Water Bodies', true);

// Final prediction
Map.addLayer(finalLikelihood,
  {min:0, max:1, palette:['440154','31688e','35b779','fde724']},
  'Cattle Likelihood', true);

// All other layers set to false (toggle on manually if needed)
Map.addLayer(ndviNow, {min:0, max:0.6, palette:['ffffff','00ff00']}, 'NDVI', false);
Map.addLayer(waterScore, {min:0, max:1, palette:['red','yellow','cyan']}, 'Water', false);
Map.addLayer(forageScore, {min:0, max:1, palette:['brown','yellow','green']}, 'Forage', false);
Map.addLayer(distToWater, {min:0, max:20, palette:['blue','white','red']}, 'Dist to Water', false);

// High-probability zones
var highProbability = finalLikelihood.gt(0.65);
Map.addLayer(highProbability.updateMask(highProbability),
  {palette:['red']}, 'High Probability', false);

// === STATISTICS - Keep only essential ones ===
var stats = finalLikelihood.reduceRegion({
  reducer: ee.Reducer.mean().combine({
    reducer2: ee.Reducer.stdDev(),
    sharedInputs: true
  }),
  geometry: region,
  scale: 5000, // OPTIMIZATION: Coarser scale for stats (faster)
  maxPixels: 1e10,
  bestEffort: true // OPTIMIZATION: Allow approximation for speed
});
print(stats);

var areaStats = highProbability.multiply(ee.Image.pixelArea()).divide(1e6)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: region,
    scale: 5000, // OPTIMIZATION: Coarser scale
    maxPixels: 1e10,
    bestEffort: true
  });
print(areaStats);

// === EXPORT - OPTIMIZED ===
Export.image.toDrive({
  image: finalLikelihood.float(),
  description: 'south_sudan_cattle_likelihood_full',
  region: region,
  scale: 500,
  maxPixels: 1e11,
  crs: 'EPSG:4326',
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true // OPTIMIZATION: Cloud-optimized GeoTIFF for faster web access
  }
});

// Export classification
var classes = ee.Image(0)
  .where(finalLikelihood.gt(0).and(finalLikelihood.lt(0.3)), 1)
  .where(finalLikelihood.gte(0.3).and(finalLikelihood.lt(0.5)), 2)
  .where(finalLikelihood.gte(0.5).and(finalLikelihood.lt(0.7)), 3)
  .where(finalLikelihood.gte(0.7), 4)
  .byte()
  .rename('cattle_class')
  .reproject({crs: 'EPSG:4326', scale: 500}); // OPTIMIZATION: Consistent projection

Export.image.toDrive({
  image: classes,
  description: 'south_sudan_cattle_classes_full',
  region: region,
  scale: 500,
  maxPixels: 1e11,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true
  }
});

Export.image.toDrive({
  image: waterBodies.byte().reproject({crs: 'EPSG:4326', scale: 500}),
  description: 'south_sudan_water_bodies_full',
  region: region,
  scale: 500,
  maxPixels: 1e11,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true
  }
});
