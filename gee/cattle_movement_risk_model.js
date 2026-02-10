/**
 * South Sudan Cattle Movement Risk Early Warning Model
 * Google Earth Engine Implementation
 * 
 * PURPOSE:
 * This model predicts cattle movement risk based on environmental conditions
 * that drive pastoral communities to move their herds in search of water and grazing,
 * potentially leading to resource competition and conflict.
 * 
 * CONCEPTUAL LOGIC:
 * Water Scarcity + Vegetation Stress → Herd Movement → Convergence on Resources → Conflict Risk
 * 
 * STUDY AREA: Northwestern South Sudan (Unity, Northern Bahr el Ghazal, Warrap states)
 * 
 * AUTHOR: [Your Name/Organization]
 * DATE: February 2026
 * LICENSE: MIT
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

// Define study area (Northwestern South Sudan)
// Update these coordinates based on your specific area of interest
// === CONFIG ===
var region = ee.Geometry.Rectangle([27.5, 7.0, 31.0, 9.5]); // NW South Sudan
var end = ee.Date('2025-01-01');
var start = end.advance(-35, 'day');
var histStart = end.advance(-365*5, 'day');
var histEnd = end.advance(-365, 'day');

// Determine season (critical for South Sudan's bimodal rainfall)
var month = end.get('month');
var season = ee.Algorithms.If(
  ee.Number(month).gte(4).and(ee.Number(month).lte(10)),
  'wet_season',
  'dry_season'
);
print('Season:', season);

// === DATA COLLECTION ===

// 1. WATER SOURCES
var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
  .filterDate(start, end)
  .select('precipitation');

var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterDate(start, end)
  .filterBounds(region)
  .filter(ee.Filter.eq('instrumentMode','IW'))
  .select('VV');

// Permanent water (JRC Global Surface Water)
var permanentWater = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
  .select('occurrence')
  .clip(region);

// 2. VEGETATION / FORAGE QUALITY
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterDate(start, end)
  .filterBounds(region)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 60))
  .select(['B4','B8','B11']); // red, nir, swir

// Historical NDVI baseline
var s2hist = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterDate(histStart, histEnd)
  .filterBounds(region)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 60))
  .map(function(img){
    return img.normalizedDifference(['B8','B4']).rename('NDVI');
  });
var ndviHistMean = s2hist.mean();

// 3. TERRAIN
var srtm = ee.Image('USGS/SRTMGL1_003').clip(region);
var slope = ee.Terrain.slope(srtm);

// 4. HUMAN SETTLEMENTS (urbanization)
// WorldPop population density
var population = ee.ImageCollection('WorldPop/GP/100m/pop')
  .filterBounds(region)
  .sort('system:time_start', false)
  .first()
  .clip(region);

// ESA WorldCover land cover
var landcover = ee.ImageCollection('ESA/WorldCover/v200')
  .first()
  .clip(region);

// === DERIVED INDICATORS ===

// A. WATER AVAILABILITY SCORE (0-1, higher = better)
// Sentinel-1 current water detection
var s1median = s1.median();
var currentWater = s1median.lt(-16).rename('current_water'); // tuned threshold

// Cumulative rainfall (last 30 days - critical for ephemeral ponds)
var rain30 = chirps.sum().rename('rain30');

// Distance to permanent water (inverse distance weighted)
var waterBinary = permanentWater.gt(50).unmask(0); // >50% occurrence = reliable
var distToWater = waterBinary.fastDistanceTransform().sqrt()
  .multiply(ee.Image.pixelArea().sqrt()).divide(1000); // convert to km

// Water score: combination of proximity + current availability + recent rain
var waterProximity = ee.Image(1).divide(distToWater.add(1)).pow(2); // decay function
var waterScore = waterProximity.multiply(0.5)
  .add(currentWater.multiply(0.3))
  .add(rain30.divide(150).clamp(0,1).multiply(0.2)) // 150mm normalization
  .rename('water_score')
  .clamp(0, 1);

// B. FORAGE QUALITY SCORE (0-1, higher = better)
var ndviNow = s2
  .map(function(img){ 
    return img.normalizedDifference(['B8','B4'])
      .rename('NDVI')
      .copyProperties(img,['system:time_start']); 
  })
  .mean();

// NDVI anomaly (positive = better than average)
var ndviAnom = ndviNow.subtract(ndviHistMean);

// Moisture-adjusted vegetation index (accounts for senescent vegetation)
var msavi = s2.map(function(img){
  var nir = img.select('B8');
  var red = img.select('B4');
  return nir.multiply(2).add(1)
    .subtract(
      nir.multiply(2).add(1).pow(2)
        .subtract(nir.subtract(red).multiply(8))
        .sqrt()
    )
    .divide(2)
    .rename('MSAVI');
}).mean();

// Forage score: NDVI quality + greenness anomaly
var forageScore = ndviNow.divide(0.7).clamp(0,1).multiply(0.6) // normalize by regional max ~0.7
  .add(ndviAnom.add(0.15).divide(0.3).clamp(0,1).multiply(0.4)) // anomaly bonus
  .rename('forage_score')
  .clamp(0, 1);

// C. LAND SUITABILITY SCORE (0-1, higher = better)
// Grassland preference (ESA classes: 30=herbaceous, 40=cropland)
var grassland = landcover.eq(30).or(landcover.eq(40)); // grassland or cropland
var shrubland = landcover.eq(20); // shrubland (moderate suitability)
var forest = landcover.gte(10).and(landcover.lte(12)); // trees (low suitability)

var habitatScore = grassland.multiply(1.0)
  .add(shrubland.multiply(0.6))
  .add(forest.multiply(0.2))
  .unmask(0.5) // unknown areas = moderate
  .rename('habitat_score');

// Slope suitability (cattle avoid steep slopes >15°)
var slopeScore = ee.Image(1).subtract(slope.divide(30).clamp(0,1))
  .rename('slope_score');

// D. HUMAN INFLUENCE SCORE (-0.5 to +0.5)
// Low density = slight attraction (services, security)
// High density = strong repulsion (conflict, space)
var popDensity = population.divide(100).clamp(0,10); // people per hectare
var humanScore = popDensity.expression(
  "(pop < 0.5) ? pop * 0.2 : -0.5 * (pop - 0.5) / 9.5", // attraction up to 50/km², then repulsion
  {pop: popDensity}
).rename('human_influence');

// E. SEASONAL ADJUSTMENT
// Dry season: water proximity weight increases dramatically
// Wet season: forage quality matters more, water less critical
var waterWeight = ee.Number(ee.Algorithms.If(ee.String(season).equals('dry_season'), 0.45, 0.25));
var forageWeight = ee.Number(ee.Algorithms.If(ee.String(season).equals('dry_season'), 0.25, 0.40));
var habitatWeight = ee.Number(0.15);
var slopeWeight = ee.Number(0.10);
var humanWeight = ee.Number(0.05);

print('Weights - Water:', waterWeight, 'Forage:', forageWeight);

// === FINAL CATTLE LIKELIHOOD MODEL ===
var cattleLikelihood = waterScore.multiply(waterWeight)
  .add(forageScore.multiply(forageWeight))
  .add(habitatScore.multiply(habitatWeight))
  .add(slopeScore.multiply(slopeWeight))
  .add(humanScore.multiply(humanWeight))
  .rename('cattle_likelihood')
  .clip(region);

// Create exclusion zones (water bodies + dense urban)
var urbanMask = population.lt(500); // <50k people per km²
var waterExclude = permanentWater.lt(80); // NOT permanent water (true where ok for cattle)

// Set excluded areas to 0 probability (not masked, explicit zero)
var finalLikelihood = cattleLikelihood
  .where(urbanMask.not(), 0)  // urban areas = 0 probability
  .where(waterExclude.not(), 0)  // water bodies = 0 probability
  .rename('cattle_likelihood');

// === VISUALIZATION ===
Map.centerObject(region, 8);

// Individual factors
Map.addLayer(waterScore, {min:0, max:1, palette:['red','yellow','cyan']}, 'Water Availability', false);
Map.addLayer(forageScore, {min:0, max:1, palette:['brown','yellow','green']}, 'Forage Quality', false);
Map.addLayer(ndviNow, {min:0, max:0.6, palette:['ffffff','00ff00']}, 'Current NDVI', false);
Map.addLayer(distToWater, {min:0, max:20, palette:['blue','white','red']}, 'Distance to Water (km)', false);

// WATER BODIES LAYER - Blue visualization showing water locations
var waterBodies = permanentWater.gt(80); // Permanent water bodies
Map.addLayer(waterBodies.updateMask(waterBodies), 
  {palette:['0000ff']}, 'Water Bodies (Excluded Zones)');

// Alternative: More detailed water visualization
Map.addLayer(permanentWater.updateMask(permanentWater.gt(50)), 
  {min:50, max:100, palette:['lightblue','darkblue']}, 'Permanent Water (Occurrence %)', false);

// Final prediction (includes 0 values for water, but water layer shows on top)
Map.addLayer(finalLikelihood, 
  {min:0, max:1, palette:['440154','31688e','35b779','fde724']}, 
  'Cattle Likelihood (High=Yellow)');

// High-probability zones (top 20%)
var highProbability = finalLikelihood.gt(0.65);
Map.addLayer(highProbability.updateMask(highProbability), 
  {palette:['red']}, 'High Probability Zones (>0.65)', false);

// === STATISTICS ===
var stats = finalLikelihood.reduceRegion({
  reducer: ee.Reducer.mean().combine({
    reducer2: ee.Reducer.stdDev(),
    sharedInputs: true
  }),
  geometry: region,
  scale: 1000,
  maxPixels: 1e10
});
print('Cattle Likelihood Stats:', stats);

// Area of high-probability zones (excluding water/urban zeros)
var validArea = finalLikelihood.gt(0); // Only count non-zero areas
var areaStats = highProbability.multiply(ee.Image.pixelArea()).divide(1e6)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: region,
    scale: 1000,
    maxPixels: 1e10
  });
print('High Probability Area (km²):', areaStats);

// === EXPORT ===
// Export includes 0 values for water bodies (not nodata)
Export.image.toDrive({
  image: finalLikelihood.float(),
  description: 'cattle_likelihood_prediction',
  region: region,
  scale: 500,
  maxPixels: 1e11,
  crs: 'EPSG:4326'
});

// Export classification with water as Class 0
var classes = finalLikelihood.expression(
  "(b1 == 0) ? 0 : (b1 < 0.3) ? 1 : (b1 < 0.5) ? 2 : (b1 < 0.7) ? 3 : 4"
).byte();

Export.image.toDrive({
  image: classes,
  description: 'cattle_likelihood_classes',
  region: region,
  scale: 500,
  maxPixels: 1e11
});

// OPTIONAL: Export water bodies mask separately for web overlay
Export.image.toDrive({
  image: waterBodies.byte(),
  description: 'water_bodies_mask',
  region: region,
  scale: 500,
  maxPixels: 1e11
});
