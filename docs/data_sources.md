# Data Sources and Access Guide

## Overview

This document provides detailed information about all datasets used in the cattle movement risk early warning model, including access procedures, data characteristics, and processing requirements.

## Primary Environmental Datasets

### 1. CHIRPS - Precipitation Data

**Full Name**: Climate Hazards Group InfraRed Precipitation with Station data

**Provider**: University of California, Santa Barbara (UCSB) Climate Hazards Center

**Access**:
- Google Earth Engine: `UCSB-CHG/CHIRPS/DAILY` or `UCSB-CHG/CHIRPS/PENTAD`
- Direct download: https://www.chc.ucsb.edu/data/chirps
- No account required for GEE access

**Characteristics**:
- Spatial Resolution: 0.05° (~5.5 km at equator)
- Temporal Resolution: Daily, pentadal, monthly
- Temporal Coverage: 1981-present (updated regularly)
- Latency: ~3 weeks
- Geographic Coverage: 50°S to 50°N (covers all of Africa)

**Use in Model**: 
- Primary precipitation input for water scarcity index
- Calculate anomalies relative to 30-year climatology
- Identify dry spells and drought conditions

**Citation**:
> Funk, C., Peterson, P., Landsfeld, M., et al. (2015). The climate hazards infrared precipitation with stations—a new environmental record for monitoring extremes. *Scientific Data*, 2, 150066.

---

### 2. JRC Global Surface Water

**Full Name**: Joint Research Centre Global Surface Water

**Provider**: European Commission Joint Research Centre

**Access**:
- Google Earth Engine: `JRC/GSW1_4/GlobalSurfaceWater` (summary stats), `JRC/GSW1_4/MonthlyHistory` (monthly)
- Direct download: https://global-surface-water.appspot.com/
- No account required

**Characteristics**:
- Spatial Resolution: 30 meters
- Temporal Coverage: 1984-2021
- Data Basis: Landsat 5, 7, 8 imagery (3+ million scenes)
- Update Frequency: Periodic (major updates every few years)

**Key Layers**:
- **Occurrence**: Frequency of water presence (0-100%)
- **Change**: Pixel-level water presence changes
- **Seasonality**: Number of months water is present
- **Transitions**: Changes in water permanence

**Use in Model**:
- Identify permanent and seasonal water bodies
- Detect changes in surface water extent
- Locate critical watering points for livestock

**Citation**:
> Pekel, J.-F., Cottam, A., Gorelick, N., & Belward, A. S. (2016). High-resolution mapping of global surface water and its long-term changes. *Nature*, 540, 418-422.

---

### 3. MODIS Vegetation Indices

**Full Name**: Moderate Resolution Imaging Spectroradiometer NDVI/EVI Products

**Provider**: NASA EOSDIS Land Processes Distributed Active Archive Center (LP DAAC)

**Access**:
- Google Earth Engine: 
  - `MODIS/006/MOD13A2` (Terra, 16-day)
  - `MODIS/006/MYD13A2` (Aqua, 16-day)
  - `MODIS/006/MOD13Q1` (Terra, 250m resolution)
- Direct download: https://lpdaac.usgs.gov/
- Free but requires NASA Earthdata login

**Characteristics**:
- Spatial Resolution: 1 km (A2 product), 250m (Q1 product)
- Temporal Resolution: 16-day composite
- Temporal Coverage: 2000-present (Terra), 2002-present (Aqua)
- Latency: ~8 days

**Key Bands**:
- **NDVI**: Normalized Difference Vegetation Index (-1 to 1, typically 0-0.9 for vegetation)
- **EVI**: Enhanced Vegetation Index (improved sensitivity in high biomass areas)

**Use in Model**:
- Assess grazing land vegetation health
- Calculate vegetation anomalies
- Identify areas of vegetation stress

**Citation**:
> Didan, K. (2015). MOD13A2 MODIS/Terra Vegetation Indices 16-Day L3 Global 1km SIN Grid V006. NASA EOSDIS LP DAAC. doi:10.5067/MODIS/MOD13A2.006

---

### 4. NASA SMAP Soil Moisture (Optional)

**Full Name**: Soil Moisture Active Passive

**Provider**: NASA

**Access**:
- Google Earth Engine: `NASA_USDA/HSL/SMAP10KM_soil_moisture` (processed version)
- Direct download: https://nsidc.org/data/smap
- Free with NASA Earthdata account

**Characteristics**:
- Spatial Resolution: 10 km (downscaled) or 36 km (native)
- Temporal Resolution: Daily or 3-day composite
- Temporal Coverage: April 2015-present
- Latency: 1-3 days

**Use in Model**:
- Supplementary water availability indicator
- Can correlate with vegetation stress
- Useful for predicting vegetation response to rainfall

---

## Contextual Datasets

### 5. WorldPop Population Density

**Provider**: WorldPop Project (University of Southampton)

**Access**:
- Google Earth Engine: `WorldPop/GP/100m/pop`
- Direct download: https://www.worldpop.org/
- Open access, no account required

**Characteristics**:
- Spatial Resolution: 100 meters
- Temporal Coverage: 2000-2020 (annual)
- Type: Estimated population counts per pixel

**Use in Model**:
- Contextualize risk assessment with population density
- Identify settlement areas at risk of cattle-related incidents
- Weight risk by potential affected populations

---

### 6. FAO Livestock Density (GLiPHA)

**Full Name**: Global Livestock Production and Health Atlas

**Provider**: Food and Agriculture Organization (FAO)

**Access**:
- Website: http://www.fao.org/ag/againfo/resources/en/glw/home.html
- Alternative: https://dataverse.harvard.edu/dataverse/glw
- Open access

**Characteristics**:
- Spatial Resolution: ~10 km
- Species: Cattle, sheep, goats, pigs, chickens
- Year: 2010 (last major update)
- Note: South Sudan data may be limited; consider using regional estimates

**Use in Model**:
- Estimate baseline cattle density
- Identify areas with high livestock populations
- Context for conflict potential (more animals = higher stakes)

**Alternative**: Contact local ministries of agriculture or FEWS NET for more recent estimates

---

### 7. ACLED Conflict Events

**Full Name**: Armed Conflict Location & Event Data Project

**Provider**: ACLED (NGO)

**Access**:
- Website: https://acleddata.com/
- Free tier: Recent data accessible without registration
- Full access: Free registration for academic/humanitarian use
- API available for programmatic access

**Characteristics**:
- Temporal Coverage: Varies by country; South Sudan from 2011-present
- Temporal Resolution: Event-level (with dates)
- Spatial Precision: Geographic coordinates for most events
- Event Types: Battles, violence against civilians, protests, explosions, etc.

**Use in Model**:
- Validation data (not input data)
- Identify historical resource-related conflicts
- Filter events: search for "cattle," "water," "grazing," "pastoral" in event notes
- Assess model accuracy by comparing predictions to actual conflict timing/location

**Citation**:
> Raleigh, C., Linke, A., Hegre, H., & Karlsen, J. (2010). Introducing ACLED: An Armed Conflict Location and Event Dataset. *Journal of Peace Research*, 47(5), 651-660.

---

## Administrative and Reference Data

### 8. South Sudan Administrative Boundaries

**Sources**:
- **Humanitarian Data Exchange (HDX)**: https://data.humdata.org/
  - Search: "South Sudan administrative boundaries"
  - Typically updated by OCHA or humanitarian partners
  
- **GADM (Database of Global Administrative Areas)**: https://gadm.org/
  - Provides state and county boundaries
  - Free for academic/non-commercial use

**Use in Model**:
- Define study area boundaries
- Aggregate risk by administrative unit
- Facilitate reporting and communication with government/UN agencies

---

### 9. Seasonal Wetlands and Flooding

**Source**: Dartmouth Flood Observatory / Global Flood Database

**Access**:
- Website: https://floodobservatory.colorado.edu/
- Google Earth Engine: Various flood detection products available

**Use in Model**:
- Important context for South Sudan, where seasonal flooding (Sudd wetlands) affects pastoral movement
- During wet season, flooding can be as problematic as drought for cattle movement
- Integrate flood risk into movement predictions

---

## Data Access Requirements Summary

| Dataset | Account Required | Cost | Update Frequency |
|---------|------------------|------|------------------|
| CHIRPS | No | Free | ~3 weeks |
| JRC Surface Water | No | Free | Irregular |
| MODIS Vegetation | Optional (for direct download) | Free | 8 days |
| SMAP Soil Moisture | Optional | Free | 1-3 days |
| WorldPop | No | Free | Annual |
| FAO Livestock | No | Free | Static (2010) |
| ACLED | Registration for full access | Free (academic) | Real-time |
| Admin Boundaries | No | Free | As updated |

---

## Data Processing and Storage

### Google Earth Engine Advantages

Using GEE for this analysis provides:
- No need to download large datasets (petabytes of satellite imagery)
- Pre-processed, analysis-ready data
- Cloud computing for large-scale calculations
- Built-in visualization tools
- Easy sharing of scripts and results

### Local Processing Alternative

If GEE access is not available, data can be downloaded and processed locally using:
- Python: `xarray`, `rasterio`, `geopandas`
- R: `raster`, `terra`, `sf` packages
- QGIS for visualization

Note: Local processing requires significant storage and computational resources.

---

## Data Quality and Limitations

### Known Issues

1. **CHIRPS**: May underestimate extreme rainfall events; validation against station data recommended

2. **JRC Surface Water**: Based on optical imagery; cloud cover in tropics limits observation frequency

3. **MODIS**: 1km resolution may miss small but critical watering points; cloud contamination in certain seasons

4. **Livestock Data**: Global datasets are outdated for South Sudan; local ground truth essential

5. **Conflict Data (ACLED)**: Reporting bias toward accessible areas; remote pastoral conflicts may be underreported

### Validation Recommendations

- Cross-reference satellite data with local NGO reports
- Engage pastoral community representatives for ground truth
- Use multiple data sources to validate findings
- Report confidence intervals and uncertainty in predictions

---

## Data Ethics and Sensitivity

See [ethics.md](ethics.md) for detailed discussion on responsible data use, particularly regarding conflict data and community protection.

---

**Document Version**: 1.0  
**Last Updated**: February 2026  
**Maintained by**: [Your Organization]

**For Questions**: Contact [email/organization]
