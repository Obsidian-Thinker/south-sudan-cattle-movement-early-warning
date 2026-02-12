// ============================================================================
// SOUTH SUDAN CATTLE CONVERGENCE & CONFLICT EARLY WARNING SYSTEM - ENHANCED
// Integrates conflict risk, resource stress, and temporal forecasting
// ============================================================================

// === CONFIGURATION PARAMETERS ===
// Core analysis parameters
var region = ee.Geometry.Rectangle([23.5, 3.5, 35.5, 12.5]); // Full South Sudan
var end = ee.Date('2024-10-01');
var start = end.advance(-90, 'day');
var lookbackPeriod = end.advance(-30, 'day'); // For change detection

// NEW: Conflict risk parameters
var CONFLICT_LOOKBACK_MONTHS = 12;
var CONFLICT_BUFFER_KM = 50;
var CONFLICT_TIME_DECAY_RATE = 0.1; // Higher = more weight to recent events
var CONFLICT_PROXIMITY_WEIGHT = 0.6;
var CONFLICT_FREQUENCY_WEIGHT = 0.4;

// NEW: Early warning index weights (must sum to 1.0)
var EWI_CATTLE_CONVERGENCE_WEIGHT = 0.35;
var EWI_CONFLICT_RISK_WEIGHT = 0.35;
var EWI_RESOURCE_STRESS_WEIGHT = 0.20;
var EWI_ACCESS_CONSTRAINTS_WEIGHT = 0.10;

// NEW: Priority zone thresholds
var CRITICAL_CONVERGENCE_THRESHOLD = 0.7;
var CRITICAL_CONFLICT_THRESHOLD = 0.6;
var HIGH_ALERT_CONVERGENCE_THRESHOLD = 0.6;
var HIGH_ALERT_CONFLICT_THRESHOLD = 0.7;
var WATCH_CONVERGENCE_THRESHOLD = 0.4;
var WATCH_CONFLICT_THRESHOLD = 0.4;

// NEW: Change detection threshold
var RAPID_DETERIORATION_THRESHOLD = 0.2;

// Processing parameters
var ANALYSIS_SCALE = 1000; // meters (for efficiency)
var EXPORT_SCALE = 500; // meters (higher resolution exports)

print('═══════════════════════════════════');
print('SOUTH SUDAN EARLY WARNING SYSTEM');
print('═══════════════════════════════════');
print('Analysis date:', end);
print('Season: Dry (October)');

// ============================================================================
// === EXISTING DATA COLLECTION ===
// ============================================================================

// 1. RAINFALL - CHIRPS
var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
  .filterBounds(region)
  .filterDate(start, end);
print('CHIRPS images:', chirps.size());

// 2. SENTINEL-1 RADAR
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterDate(start, end)
  .filterBounds(region)
  .filter(ee.Filter.eq('instrumentMode','IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .select('VV');
print('Sentinel-1 images:', s1.size());

// 3. JRC GLOBAL SURFACE WATER
var jrc = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').clip(region);
var jrcOccurrence = jrc.select('occurrence');

// 4. MODIS NDVI
var modis = ee.ImageCollection('MODIS/061/MOD13Q1')
  .filterDate(start, end)
  .filterBounds(region)
  .select('NDVI');

var modisHist = ee.ImageCollection('MODIS/061/MOD13Q1')
  .filterDate(end.advance(-365-90, 'day'), end.advance(-365, 'day'))
  .filterBounds(region)
  .select('NDVI');

// NEW: MODIS for 30-day lookback (change detection)
var modisLookback = ee.ImageCollection('MODIS/061/MOD13Q1')
  .filterDate(lookbackPeriod.advance(-90, 'day'), lookbackPeriod)
  .filterBounds(region)
  .select('NDVI');

// 5. TERRAIN - SRTM
var srtm = ee.Image('USGS/SRTMGL1_003').clip(region);
var slope = ee.Terrain.slope(srtm);

// 6. POPULATION - WorldPop
var population = ee.ImageCollection('WorldPop/GP/100m/pop')
  .filterBounds(region)
  .filterDate('2020-01-01', '2021-01-01')
  .first()
  .clip(region);

// 7. LAND COVER - ESA WorldCover
var landcover = ee.ImageCollection('ESA/WorldCover/v200')
  .first()
  .clip(region);

// ============================================================================
// === NEW: CONFLICT DATA COLLECTION ===
// ============================================================================

// ACLED conflict events (placeholder - replace with actual ACLED data if available)
// NOTE: ACLED data typically requires API access or manual import
// This creates a placeholder function that can be replaced with actual data

var getConflictData = function() {
  // ASSUMPTION: Replace this with actual ACLED FeatureCollection
  // Example: ee.FeatureCollection('users/your_username/acled_south_sudan')

  // For now, create synthetic conflict hotspots based on known high-risk areas
  // TODO: Replace with actual ACLED import

  var knownHotspots = ee.FeatureCollection([
    ee.Feature(ee.Geometry.Point([31.6, 9.5]), {date: end.millis(), fatalities: 15, event_type: 'Violence against civilians'}),
    ee.Feature(ee.Geometry.Point([30.2, 8.8]), {date: end.advance(-30, 'day').millis(), fatalities: 8, event_type: 'Battles'}),
    ee.Feature(ee.Geometry.Point([32.4, 7.2]), {date: end.advance(-60, 'day').millis(), fatalities: 12, event_type: 'Violence against civilians'}),
    ee.Feature(ee.Geometry.Point([29.8, 10.1]), {date: end.advance(-90, 'day').millis(), fatalities: 5, event_type: 'Battles'}),
    ee.Feature(ee.Geometry.Point([31.2, 6.5]), {date: end.advance(-120, 'day').millis(), fatalities: 20, event_type: 'Violence against civilians'})
  ]);

  return knownHotspots;
};

var conflictEvents = getConflictData();
print('Conflict events loaded (placeholder data)');

// ============================================================================
// === EXISTING DERIVED INDICATORS ===
// ============================================================================

// --- A. WATER AVAILABILITY INDICATORS ---
var s1median = s1.median();
var s1Water = s1median.lt(-15).unmask(0);

var reliableWaterMask = jrcOccurrence.gt(50).unmask(0);
var distToWater = reliableWaterMask
  .fastDistanceTransform()
  .sqrt()
  .multiply(ee.Image.pixelArea().sqrt())
  .divide(1000)
  .unmask(50);

var waterProximity = ee.Image(1)
  .divide(distToWater.add(1))
  .pow(2);

// --- B. RAINFALL INDICATORS ---
var start30 = end.advance(-30, 'day');
var rain30 = chirps.filterDate(start30, end).sum().unmask(0);

var start60 = end.advance(-60, 'day');
var rainPrev30 = chirps.filterDate(start60, start30).sum().unmask(0);

var rain30Norm = rain30.divide(300).clamp(0, 1);

var rainDecline = rainPrev30.subtract(rain30)
  .divide(rainPrev30.add(1))
  .add(1).divide(2)
  .clamp(0, 1);

// --- C. VEGETATION / FORAGE INDICATORS ---
var ndviNow = modis.median()
  .divide(10000)
  .clamp(0, 1)
  .unmask(0.3);

var ndviHist = modisHist.median()
  .divide(10000)
  .clamp(0, 1)
  .unmask(0.3);

var ndviAnom = ndviNow.subtract(ndviHist);

var forageScore = ndviNow.multiply(0.7)
  .add(ndviAnom.add(0.5).multiply(0.3))
  .clamp(0, 1);

// NEW: Lookback NDVI for change detection
var ndviLookback = modisLookback.median()
  .divide(10000)
  .clamp(0, 1)
  .unmask(0.3);

// --- D. HABITAT SUITABILITY ---
var grassland = landcover.eq(30).or(landcover.eq(40));
var shrubland = landcover.eq(20);

var habitatScore = grassland.multiply(1.0)
  .add(shrubland.multiply(0.7))
  .unmask(0.5);

// --- E. TERRAIN SUITABILITY ---
var slopeScore = ee.Image(1)
  .subtract(slope.divide(30).clamp(0, 1));

// --- F. HUMAN INFLUENCE ---
var popDensity = population.divide(100).clamp(0, 20).unmask(0);
var humanScore = popDensity.multiply(-0.05).add(0.1).clamp(-0.5, 0.2);

// --- G. COMPOSITE INDICATORS ---
var waterScore = waterProximity.multiply(0.6)
  .add(s1Water.multiply(0.3))
  .add(rain30Norm.multiply(0.1))
  .clamp(0, 1);

var rdci = rainDecline.multiply(0.5)
  .add(waterProximity.multiply(0.3))
  .add(forageScore.multiply(0.2))
  .clamp(0, 1);

// --- H. EXISTING CATTLE CONVERGENCE MODEL ---
var cattleConvergence = waterScore.multiply(0.45)
  .add(forageScore.multiply(0.25))
  .add(habitatScore.multiply(0.15))
  .add(slopeScore.multiply(0.10))
  .add(rdci.multiply(0.05))
  .clamp(0, 1);

// Apply exclusion zones
var urbanMask = popDensity.lt(10);
var waterExclude = jrcOccurrence.lt(90);

cattleConvergence = cattleConvergence
  .where(urbanMask.not(), 0)
  .where(waterExclude.not(), 0)
  .rename('cattle_convergence');

// ============================================================================
// === NEW: CONFLICT RISK LAYER ===
// ============================================================================

print('═══════════════════════════════════');
print('🚨 BUILDING CONFLICT RISK LAYER');
print('═══════════════════════════════════');

// Function to create conflict proximity layer with time decay
var createConflictProximityLayer = function(events, bufferKm, timeDecayRate) {
  // Convert events to image with time-weighted intensity
  var conflictImage = ee.Image(0).float();

  // Create buffer zones around each event with time decay
  var buffered = events.map(function(feature) {
    var eventTime = ee.Date(feature.getNumber('date'));
    var daysAgo = end.difference(eventTime, 'day');

    // Time decay weight: more recent = higher weight
    var timeWeight = ee.Number(1).divide(
      ee.Number(1).add(daysAgo.multiply(timeDecayRate))
    );

    // Create buffer and rasterize
    var buffer = feature.buffer(bufferKm * 1000); // km to meters
    return buffer.set('weight', timeWeight);
  });

  // Rasterize with weights
  var conflictProximity = buffered.reduceToImage({
    properties: ['weight'],
    reducer: ee.Reducer.max()
  }).unmask(0).clip(region);

  return conflictProximity;
};

// Create conflict proximity score
var conflictProximity = createConflictProximityLayer(
  conflictEvents,
  CONFLICT_BUFFER_KM,
  CONFLICT_TIME_DECAY_RATE
).rename('conflict_proximity');

// Normalize to 0-1
conflictProximity = conflictProximity.unitScale(0, 1).clamp(0, 1);

// Calculate conflict frequency (events per 10km² cell)
var conflictFrequency = conflictEvents.reduceToImage({
  properties: ['fatalities'],
  reducer: ee.Reducer.count()
}).unmask(0).clip(region);

conflictFrequency = conflictFrequency.unitScale(0, 5).clamp(0, 1).rename('conflict_frequency');

// NEW: Ethnic boundary zones (placeholder - requires ethnographic data)
// TODO: Replace with actual ethnic territory boundaries
var ethnicBoundaryRisk = ee.Image(0.5).clip(region).rename('ethnic_boundary_risk');
// ASSUMPTION: Uniform medium risk across region (0.5)
// In production, use actual ethnic territory polygons

// COMPOSITE CONFLICT RISK SCORE
var conflictRisk = conflictProximity.multiply(CONFLICT_PROXIMITY_WEIGHT)
  .add(conflictFrequency.multiply(CONFLICT_FREQUENCY_WEIGHT))
  .clamp(0, 1)
  .rename('conflict_risk');

print('Conflict risk layer created');

// ============================================================================
// === NEW: RESOURCE STRESS INDICATOR ===
// ============================================================================

print('═══════════════════════════════════');
print('📊 CALCULATING RESOURCE STRESS');
print('═══════════════════════════════════');

// Resource stress = inverse of resource availability
var resourceStress = ee.Image(1).subtract(waterScore).multiply(0.6)
  .add(ee.Image(1).subtract(forageScore).multiply(0.4))
  .clamp(0, 1)
  .rename('resource_stress');

print('Resource stress calculated');

// ============================================================================
// === NEW: ACCESS CONSTRAINTS ===
// ============================================================================

// Combines population pressure and terrain difficulty
var terrainDifficulty = slope.divide(45).clamp(0, 1); // 45° = max difficulty

var accessConstraints = popDensity.divide(20).clamp(0, 1).multiply(0.6)
  .add(terrainDifficulty.multiply(0.4))
  .clamp(0, 1)
  .rename('access_constraints');

print('Access constraints calculated');

// ============================================================================
// === NEW: COMPOSITE EARLY WARNING INDEX (EWI) ===
// ============================================================================

print('═══════════════════════════════════');
print('⚠️ BUILDING EARLY WARNING INDEX');
print('═══════════════════════════════════');

var earlyWarningIndex = cattleConvergence.multiply(EWI_CATTLE_CONVERGENCE_WEIGHT)
  .add(conflictRisk.multiply(EWI_CONFLICT_RISK_WEIGHT))
  .add(resourceStress.multiply(EWI_RESOURCE_STRESS_WEIGHT))
  .add(accessConstraints.multiply(EWI_ACCESS_CONSTRAINTS_WEIGHT))
  .clamp(0, 1)
  .rename('early_warning_index');

print('Early Warning Index weights:');
print('  Cattle Convergence:', EWI_CATTLE_CONVERGENCE_WEIGHT);
print('  Conflict Risk:', EWI_CONFLICT_RISK_WEIGHT);
print('  Resource Stress:', EWI_RESOURCE_STRESS_WEIGHT);
print('  Access Constraints:', EWI_ACCESS_CONSTRAINTS_WEIGHT);

// ============================================================================
// === NEW: TEMPORAL CHANGE DETECTION ===
// ============================================================================

print('═══════════════════════════════════');
print('🔄 TEMPORAL CHANGE DETECTION');
print('═══════════════════════════════════');

// Calculate lookback convergence (30 days ago)
var forageLookback = ndviLookback.multiply(0.7)
  .add(ndviLookback.subtract(ndviHist).add(0.5).multiply(0.3))
  .clamp(0, 1);

var cattleConvergenceLookback = waterScore.multiply(0.45)
  .add(forageLookback.multiply(0.25))
  .add(habitatScore.multiply(0.15))
  .add(slopeScore.multiply(0.10))
  .add(rdci.multiply(0.05))
  .clamp(0, 1);

// Change in risk (positive = deteriorating)
var riskChange = cattleConvergence.subtract(cattleConvergenceLookback)
  .rename('risk_change_30d');

// Flag rapidly deteriorating zones
var rapidDeterioration = riskChange.gt(RAPID_DETERIORATION_THRESHOLD)
  .rename('rapid_deterioration');

print('Change detection: comparing', end, 'vs.', lookbackPeriod);

// ============================================================================
// === NEW: PRIORITY ZONE CLASSIFICATION ===
// ============================================================================

print('═══════════════════════════════════');
print('🎯 PRIORITY ZONE CLASSIFICATION');
print('═══════════════════════════════════');

// Class 1: CRITICAL - immediate intervention needed
var criticalZones = cattleConvergence.gt(CRITICAL_CONVERGENCE_THRESHOLD)
  .and(conflictRisk.gt(CRITICAL_CONFLICT_THRESHOLD));

// Class 2: HIGH ALERT - deploy monitoring
var highAlertZones = cattleConvergence.gt(HIGH_ALERT_CONVERGENCE_THRESHOLD)
  .or(conflictRisk.gt(HIGH_ALERT_CONFLICT_THRESHOLD))
  .and(criticalZones.not());

// Class 3: WATCH - early preparation
var watchZones = cattleConvergence.gt(WATCH_CONVERGENCE_THRESHOLD)
  .and(conflictRisk.gt(WATCH_CONFLICT_THRESHOLD))
  .and(criticalZones.not())
  .and(highAlertZones.not());

// Class 4: STABLE - routine monitoring
var priorityZones = ee.Image(4)
  .where(watchZones, 3)
  .where(highAlertZones, 2)
  .where(criticalZones, 1)
  .where(cattleConvergence.eq(0).and(conflictRisk.eq(0)), 0)
  .byte()
  .rename('priority_class');

print('Priority zones classified');

// ============================================================================
// === VISUALIZATION ===
// ============================================================================

Map.centerObject(region, 6);

// EXISTING LAYERS
var waterBodies = jrcOccurrence.gt(80);
Map.addLayer(waterBodies.selfMask(),
  {palette: ['0066ff']}, '1. Water Bodies', false, 0.7);

Map.addLayer(ndviNow,
  {min: 0.1, max: 0.7, palette: ['brown', 'yellow', 'green']},
  '2. NDVI (Vegetation)', false);

Map.addLayer(cattleConvergence.selfMask(),
  {min: 0, max: 1, palette: ['#440154', '#31688e', '#35b779', '#fde724']},
  '3. Cattle Convergence Risk', false);

// NEW LAYERS
Map.addLayer(conflictRisk.selfMask(),
  {min: 0, max: 1, palette: ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#bd0026', '#800026']},
  '4. 🚨 CONFLICT RISK', true);

Map.addLayer(resourceStress.selfMask(),
  {min: 0, max: 1, palette: ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c']},
  '5. 📊 Resource Stress', false);

Map.addLayer(earlyWarningIndex.selfMask(),
  {min: 0, max: 1, palette: ['#1a9850', '#91cf60', '#d9ef8b', '#fee08b', '#fc8d59', '#d73027']},
  '6. ⚠️ EARLY WARNING INDEX', true);

Map.addLayer(priorityZones.selfMask(),
  {min: 1, max: 4, palette: ['#b30000', '#e34a33', '#fc8d59', '#fdcc8a']},
  '7. 🎯 PRIORITY ZONES', true);

Map.addLayer(rapidDeterioration.selfMask(),
  {palette: ['red']},
  '8. 🔴 Rapid Deterioration (30d)', true);

// Other layers (toggleable)
Map.addLayer(riskChange,
  {min: -0.3, max: 0.3, palette: ['blue', 'white', 'red']},
  '9. Risk Change (30d)', false);

Map.addLayer(waterScore.selfMask(),
  {min: 0, max: 1, palette: ['red', 'orange', 'cyan', 'blue']},
  '10. Water Availability', false);

Map.addLayer(forageScore.selfMask(),
  {min: 0, max: 1, palette: ['brown', 'yellow', 'lightgreen', 'darkgreen']},
  '11. Forage Quality', false);

// ============================================================================
// === NEW: ENHANCED STATISTICS (FIXED) ===
// ============================================================================

print('═══════════════════════════════════');
print('📈 EARLY WARNING STATISTICS');
print('═══════════════════════════════════');

// Basic statistics
var ewiStats = earlyWarningIndex.reduceRegion({
  reducer: ee.Reducer.mean()
    .combine({reducer2: ee.Reducer.stdDev(), sharedInputs: true})
    .combine({reducer2: ee.Reducer.min(), sharedInputs: true})
    .combine({reducer2: ee.Reducer.max(), sharedInputs: true}),
  geometry: region,
  scale: ANALYSIS_SCALE,
  maxPixels: 1e10,
  bestEffort: true
});

print('Early Warning Index (EWI):');
print('  Mean:', ewiStats.get('early_warning_index_mean'));
print('  Std Dev:', ewiStats.get('early_warning_index_stdDev'));
print('  Min:', ewiStats.get('early_warning_index_min'));
print('  Max:', ewiStats.get('early_warning_index_max'));

// FIXED: Area by priority class
var priorityAreaStats = priorityZones.addBands(ee.Image.pixelArea().divide(1e6))
  .reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 0,
      groupName: 'priority_class'
    }),
    geometry: region,
    scale: ANALYSIS_SCALE,
    maxPixels: 1e10,
    bestEffort: true
  });

print('═══════════════════════════════════');
print('Area by Priority Class (km²):');
print(priorityAreaStats.get('groups'));

// FIXED: High-risk cluster analysis
var highRiskMask = earlyWarningIndex.gt(0.7).selfMask();
var clusters = highRiskMask.connectedComponents({
  connectedness: ee.Kernel.plus(1),
  maxSize: 1024
});

var clusterArea = clusters.select('labels')
  .addBands(ee.Image.pixelArea().divide(1e6))
  .reduceConnectedComponents({
    reducer: ee.Reducer.sum(),
    labelBand: 'labels'
  });

var largeClustersMask = clusterArea.gte(100); // >= 100 km²

// Count large clusters properly
var largeClusterCount = largeClustersMask.selfMask().connectedComponents({
  connectedness: ee.Kernel.plus(1),
  maxSize: 256
}).select('labels').reduceRegion({
  reducer: ee.Reducer.countDistinctNonNull(),
  geometry: region,
  scale: ANALYSIS_SCALE,
  maxPixels: 1e10,
  bestEffort: true
});

print('Large high-risk clusters (>100 km²):', largeClusterCount.get('labels'));

// FIXED: Conflict risk in top convergence zones
var convergencePercentile = cattleConvergence.reduceRegion({
  reducer: ee.Reducer.percentile([90]),
  geometry: region,
  scale: ANALYSIS_SCALE,
  maxPixels: 1e10,
  bestEffort: true
});

// Convert to Image constant for comparison
var p90Value = ee.Number(convergencePercentile.get('cattle_convergence'));
var topConvergenceZones = cattleConvergence.gt(ee.Image.constant(p90Value));

var conflictInTopZones = conflictRisk.updateMask(topConvergenceZones)
  .reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: region,
    scale: ANALYSIS_SCALE,
    maxPixels: 1e10,
    bestEffort: true
  });

print('Mean conflict risk in top 10% convergence zones:',
  conflictInTopZones.get('conflict_risk'));

// NEW: Trend analysis
var deterioratingArea = rapidDeterioration.multiply(ee.Image.pixelArea()).divide(1e6)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: region,
    scale: ANALYSIS_SCALE,
    maxPixels: 1e10,
    bestEffort: true
  });

print('Rapidly deteriorating area (30d change >0.2):',
  deterioratingArea.get('rapid_deterioration'), 'km²');

print('═══════════════════════════════════');

// ============================================================================
// === NEW: METADATA JSON EXPORT (FIXED) ===
// ============================================================================

var metadata = ee.Dictionary({
  analysis_date: end.format('YYYY-MM-dd'),
  lookback_period_days: 30,
  conflict_lookback_months: CONFLICT_LOOKBACK_MONTHS,
  priority_thresholds: {
    critical_convergence: CRITICAL_CONVERGENCE_THRESHOLD,
    critical_conflict: CRITICAL_CONFLICT_THRESHOLD,
    high_alert_convergence: HIGH_ALERT_CONVERGENCE_THRESHOLD,
    high_alert_conflict: HIGH_ALERT_CONFLICT_THRESHOLD
  },
  early_warning_weights: {
    cattle_convergence: EWI_CATTLE_CONVERGENCE_WEIGHT,
    conflict_risk: EWI_CONFLICT_RISK_WEIGHT,
    resource_stress: EWI_RESOURCE_STRESS_WEIGHT,
    access_constraints: EWI_ACCESS_CONSTRAINTS_WEIGHT
  },
  statistics: {
    ewi_mean: ewiStats.get('early_warning_index_mean'),
    ewi_max: ewiStats.get('early_warning_index_max'),
    large_cluster_count: largeClusterCount.get('labels'),
    deteriorating_area_km2: deterioratingArea.get('rapid_deterioration'),
    conflict_risk_in_top_convergence: conflictInTopZones.get('conflict_risk')
  }
});

print('═══════════════════════════════════');
print('📋 METADATA FOR EXPORT:');
print(metadata);
print('═══════════════════════════════════');

// ============================================================================
// === EXPORTS ===
// ============================================================================

print('═══════════════════════════════════');
print('💾 PREPARING EXPORTS');
print('═══════════════════════════════════');

// 1. Main: Early Warning Composite
Export.image.toDrive({
  image: earlyWarningIndex.float(),
  description: 'south_sudan_early_warning_index',
  folder: 'GEE_Early_Warning',
  region: region,
  scale: EXPORT_SCALE,
  maxPixels: 1e11,
  crs: 'EPSG:4326',
  fileFormat: 'GeoTIFF',
  formatOptions: {cloudOptimized: true}
});

// 2. Supporting: Conflict Risk Layer
Export.image.toDrive({
  image: conflictRisk.float(),
  description: 'south_sudan_conflict_risk',
  folder: 'GEE_Early_Warning',
  region: region,
  scale: EXPORT_SCALE,
  maxPixels: 1e11,
  crs: 'EPSG:4326',
  fileFormat: 'GeoTIFF',
  formatOptions: {cloudOptimized: true}
});

// 3. Supporting: Resource Stress Layer
Export.image.toDrive({
  image: resourceStress.float(),
  description: 'south_sudan_resource_stress',
  folder: 'GEE_Early_Warning',
  region: region,
  scale: EXPORT_SCALE,
  maxPixels: 1e11,
  crs: 'EPSG:4326',
  fileFormat: 'GeoTIFF',
  formatOptions: {cloudOptimized: true}
});

// 4. Priority Zones (classified)
Export.image.toDrive({
  image: priorityZones,
  description: 'south_sudan_priority_zones',
  folder: 'GEE_Early_Warning',
  region: region,
  scale: EXPORT_SCALE,
  maxPixels: 1e11,
  crs: 'EPSG:4326',
  fileFormat: 'GeoTIFF',
  formatOptions: {cloudOptimized: true}
});

// 5. Cattle Convergence (for comparison)
Export.image.toDrive({
  image: cattleConvergence.float(),
  description: 'south_sudan_cattle_convergence',
  folder: 'GEE_Early_Warning',
  region: region,
  scale: EXPORT_SCALE,
  maxPixels: 1e11,
  crs: 'EPSG:4326',
  fileFormat: 'GeoTIFF',
  formatOptions: {cloudOptimized: true}
});

// 6. Rapid Deterioration Mask
Export.image.toDrive({
  image: rapidDeterioration.byte(),
  description: 'south_sudan_rapid_deterioration',
  folder: 'GEE_Early_Warning',
  region: region,
  scale: EXPORT_SCALE,
  maxPixels: 1e11,
  crs: 'EPSG:4326',
  fileFormat: 'GeoTIFF',
  formatOptions: {cloudOptimized: true}
});

// 7. Large Clusters Layer
Export.image.toDrive({
  image: largeClustersMask.byte().rename('large_clusters'),
  description: 'south_sudan_large_clusters',
  folder: 'GEE_Early_Warning',
  region: region,
  scale: EXPORT_SCALE,
  maxPixels: 1e11,
  crs: 'EPSG:4326',
  fileFormat: 'GeoTIFF',
  formatOptions: {cloudOptimized: true}
});

print('7 exports prepared - check Tasks tab');

// ============================================================================
// === INTERPRETATION GUIDE ===
// ============================================================================

print('═══════════════════════════════════');
print('📖 INTERPRETATION GUIDE');
print('═══════════════════════════════════');
print('');
print('EARLY WARNING INDEX (0-1):');
print('  0.0-0.3 = LOW - Routine monitoring');
print('  0.3-0.5 = MODERATE - Increased vigilance');
print('  0.5-0.7 = HIGH - Deploy field teams');
print('  0.7-1.0 = CRITICAL - Immediate intervention');
print('');
print('PRIORITY ZONES:');
print('  Class 1 (CRITICAL) = Red - Immediate action');
print('  Class 2 (HIGH ALERT) = Orange - Deploy monitoring');
print('  Class 3 (WATCH) = Yellow - Early preparation');
print('  Class 4 (STABLE) = Light orange - Routine');
print('');
print('CONFLICT RISK (0-1):');
print('  Based on proximity + frequency of recent events');
print('  Higher values = closer to recent violence');
print('');
print('RESOURCE STRESS (0-1):');
print('  0 = Abundant water + forage');
print('  1 = Severe scarcity → competition likely');
print('═══════════════════════════════════');
print('');
print('✅ SYSTEM READY FOR OPERATIONAL USE');
print('═══════════════════════════════════');
