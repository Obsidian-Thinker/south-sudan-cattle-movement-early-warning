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
var studyArea = ee.Geometry.Rectangle([
  27.0, 7.5,  // Southwest corner [longitude, latitude]
  30.5, 10.5  // Northeast corner [longitude, latitude]
]);

// Time period for analysis
var startDate = '2023-01-01';
var endDate = '2023-12-31';

// Visualization parameters
var waterVizParams = {min: 0, max: 1, palette: ['red', 'yellow', 'green', 'blue']};
var vegetationVizParams = {min: 0, max: 0.8, palette: ['brown', 'yellow', 'green']};
var riskVizParams = {min: 0, max: 1, palette: ['green', 'yellow', 'orange', 'red']};

// =============================================================================
// DATA SOURCES
// =============================================================================

/**
 * Key Datasets Used:
 * 
 * 1. Water Availability:
 *    - Surface water extent: JRC Global Surface Water
 *    - Precipitation: CHIRPS (Climate Hazards Group InfraRed Precipitation with Station data)
 *    - Soil moisture: NASA SMAP or ESA CCI Soil Moisture
 * 
 * 2. Vegetation Health:
 *    - NDVI: MODIS Terra/Aqua or Sentinel-2
 *    - EVI: Enhanced Vegetation Index from MODIS
 * 
 * 3. Contextual Data:
 *    - Population density: WorldPop
 *    - Livestock density estimates: FAO GLiPHA or custom datasets
 *    - Historical conflict locations: ACLED (Armed Conflict Location & Event Data)
 */

// =============================================================================
// LOAD AND PROCESS ENVIRONMENTAL DATA
// =============================================================================

/**
 * STEP 1: Calculate Water Scarcity Index
 * Combines precipitation deficit, surface water extent, and soil moisture
 */
function calculateWaterScarcity(startDate, endDate, region) {
  // Load CHIRPS precipitation data
  // var precipitation = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
  //   .filterDate(startDate, endDate)
  //   .filterBounds(region)
  //   .select('precipitation');
  
  // Calculate precipitation anomaly compared to long-term average
  // var precipMean = precipitation.mean();
  // var precipAnomaly = precipitation.mean().subtract(precipMean);
  
  // Load surface water data from JRC Global Surface Water
  // var surfaceWater = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
  //   .select('occurrence')
  //   .clip(region);
  
  // Combine indicators into water scarcity index
  // Lower values = higher scarcity
  // var waterScarcityIndex = ...
  
  // PLACEHOLDER: Return dummy index for demonstration
  return ee.Image.constant(0.5).clip(region);
}

/**
 * STEP 2: Calculate Vegetation Stress Index
 * Uses NDVI/EVI to assess grazing quality and availability
 */
function calculateVegetationStress(startDate, endDate, region) {
  // Load MODIS NDVI data
  // var ndvi = ee.ImageCollection('MODIS/006/MOD13A2')
  //   .filterDate(startDate, endDate)
  //   .filterBounds(region)
  //   .select('NDVI')
  //   .map(function(img) {
  //     return img.multiply(0.0001); // Scale factor
  //   });
  
  // Calculate NDVI anomaly (current vs. long-term average)
  // var ndviMean = ndvi.mean();
  // var ndviAnomaly = ndvi.mean().subtract(ndviMean);
  
  // Convert to stress index (lower NDVI = higher stress)
  // var vegetationStress = ...
  
  // PLACEHOLDER: Return dummy index for demonstration
  return ee.Image.constant(0.5).clip(region);
}

/**
 * STEP 3: Identify High-Risk Convergence Zones
 * Areas with remaining resources become congregation points
 */
function identifyConvergenceZones(waterIndex, vegetationIndex, region) {
  // Find areas with relatively better conditions (attractors)
  // These become potential convergence zones
  
  // Calculate combined resource availability
  // var resourceAvailability = waterIndex.add(vegetationIndex).divide(2);
  
  // Identify local maxima (relative resource hotspots)
  // var convergenceZones = resourceAvailability.focal_max({radius: 5000, units: 'meters'});
  
  // PLACEHOLDER: Return dummy convergence zones
  return ee.Image.constant(0.3).clip(region);
}

/**
 * STEP 4: Calculate Movement Risk Index
 * Combines scarcity, stress, and convergence potential
 */
function calculateMovementRisk(waterScarcity, vegetationStress, convergenceZones) {
  // Higher scarcity + higher stress + convergence zones = higher movement risk
  
  // Weighted combination of factors
  // var movementRisk = waterScarcity.multiply(0.4)
  //   .add(vegetationStress.multiply(0.4))
  //   .add(convergenceZones.multiply(0.2));
  
  // Normalize to 0-1 range
  // movementRisk = movementRisk.unitScale(0, 1);
  
  // PLACEHOLDER: Return dummy risk index
  return ee.Image.constant(0.6);
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

/**
 * Run the complete risk assessment pipeline
 * 
 * TO USE THIS SCRIPT:
 * 1. Copy this entire script into the Google Earth Engine Code Editor (https://code.earthengine.google.com)
 * 2. Uncomment the data loading sections above
 * 3. Adjust the study area coordinates and date range as needed
 * 4. Run the script
 * 5. View results in the Map panel
 * 6. Export results using the Export functions (commented below)
 */
function runRiskAssessment() {
  print('=== South Sudan Cattle Movement Risk Assessment ===');
  print('Study Area:', studyArea.bounds().getInfo());
  print('Time Period:', startDate, 'to', endDate);
  
  // Calculate environmental indicators
  var waterScarcity = calculateWaterScarcity(startDate, endDate, studyArea);
  var vegetationStress = calculateVegetationStress(startDate, endDate, studyArea);
  var convergenceZones = identifyConvergenceZones(waterScarcity, vegetationStress, studyArea);
  
  // Calculate final risk index
  var movementRisk = calculateMovementRisk(waterScarcity, vegetationStress, convergenceZones);
  
  // Visualize results
  Map.centerObject(studyArea, 7);
  Map.addLayer(waterScarcity, waterVizParams, 'Water Scarcity Index');
  Map.addLayer(vegetationStress, vegetationVizParams, 'Vegetation Stress Index');
  Map.addLayer(convergenceZones, vegetationVizParams, 'Convergence Zones');
  Map.addLayer(movementRisk, riskVizParams, 'Cattle Movement Risk', true);
  
  // Add study area boundary
  Map.addLayer(studyArea, {color: 'yellow'}, 'Study Area', false);
  
  print('Risk Assessment Complete');
  print('See layers in Map panel');
  
  return movementRisk;
}

// =============================================================================
// EXPORT FUNCTIONS (Optional)
// =============================================================================

/**
 * Export the risk map to Google Drive or Google Cloud Storage
 * Uncomment and modify as needed
 */
function exportRiskMap(riskImage) {
  // Export.image.toDrive({
  //   image: riskImage,
  //   description: 'south_sudan_cattle_risk_map',
  //   folder: 'GEE_Exports',
  //   region: studyArea,
  //   scale: 1000, // 1km resolution
  //   maxPixels: 1e10
  // });
}

// =============================================================================
// RUN THE MODEL
// =============================================================================

// Execute the risk assessment
// Uncomment the line below to run the model
// var riskMap = runRiskAssessment();

// Optionally export results
// exportRiskMap(riskMap);

/**
 * NOTES FOR USERS:
 * 
 * 1. This is a demonstration/template script. The actual data loading and 
 *    processing code is commented out as placeholders.
 * 
 * 2. To implement the full model, you will need:
 *    - Access to Google Earth Engine (sign up at https://earthengine.google.com)
 *    - Uncomment and complete the data loading sections
 *    - Calibrate the weights and thresholds based on ground truth data
 *    - Validate results with local knowledge and conflict event data
 * 
 * 3. For questions or collaboration opportunities, refer to the repository README
 * 
 * 4. See /docs folder for detailed methodology and data source information
 */
