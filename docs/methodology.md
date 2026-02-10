# Methodology: Cattle Movement Risk Early Warning Model

## Executive Summary

This document outlines the methodological approach for predicting cattle movement risk in South Sudan using Google Earth Engine (GEE) and remote sensing data. The model is designed to provide early warning indicators for humanitarian and conflict prevention planning by identifying areas where pastoral communities are likely to move their cattle herds due to environmental stress.

## Conceptual Framework

### The Causal Logic

The model is built on the following established causal chain in pastoral conflict dynamics:

```
Water Scarcity + Vegetation Stress 
    ↓
Pastoral Herd Movement (search for resources)
    ↓
Convergence on Limited Resource Points
    ↓
Inter-community Competition
    ↓
Increased Conflict Risk
```

### Theoretical Foundation

This approach is grounded in:

1. **Resource Competition Theory**: Conflicts arise when multiple groups compete for scarce resources (Homer-Dixon, 1999; Meier et al., 2007)

2. **Pastoral Livelihoods Research**: Cattle movements in South Sudan follow predictable patterns based on seasonal water and pasture availability (Catley et al., 2016; Schomerus & Allen, 2010)

3. **Climate-Security Nexus**: Environmental stress acts as a threat multiplier in regions with existing vulnerabilities (UNEP, 2018)

## Model Components

### 1. Water Scarcity Index

**Purpose**: Quantify the availability of water resources for livestock

**Input Data**:
- **Precipitation**: CHIRPS (Climate Hazards Group InfraRed Precipitation with Station data)
  - Temporal resolution: Daily
  - Spatial resolution: 0.05° (~5.5 km)
  - Coverage: 1981-present

- **Surface Water Extent**: JRC Global Surface Water
  - Source: Landsat imagery (1984-2021)
  - Spatial resolution: 30m
  - Frequency of water occurrence mapped

- **Soil Moisture** (Optional): NASA SMAP or ESA CCI
  - For assessing below-ground water availability
  - Spatial resolution: 9-36 km

**Processing Steps**:
1. Calculate precipitation anomaly relative to long-term (30-year) mean
2. Identify surface water body extent and change over time
3. Create composite water availability index
4. Normalize to 0-1 scale (0 = extreme scarcity, 1 = abundant water)

**Formula**:
```
Water_Scarcity_Index = 1 - ((Precip_Anomaly_Normalized + Surface_Water_Normalized) / 2)
```

### 2. Vegetation Stress Index

**Purpose**: Assess the quality and availability of grazing resources

**Input Data**:
- **NDVI (Normalized Difference Vegetation Index)**: MODIS Terra/Aqua
  - Product: MOD13A2 (16-day composite)
  - Spatial resolution: 1 km
  - Temporal coverage: 2000-present

- **EVI (Enhanced Vegetation Index)**: Also from MODIS
  - More sensitive to high biomass areas
  - Less affected by atmospheric conditions

**Processing Steps**:
1. Calculate mean NDVI for the period of interest
2. Compare against long-term average (baseline) for same season
3. Compute NDVI anomaly
4. Convert to stress index (higher stress = lower NDVI)

**Formula**:
```
Vegetation_Stress = 1 - (Current_NDVI / Long_Term_Mean_NDVI)
```

### 3. Convergence Zone Identification

**Purpose**: Identify areas that will attract converging herds due to relative resource availability

**Processing Logic**:
1. Combine water and vegetation indices to create "resource availability" map
2. Apply focal statistics (local maximum within 5-10 km radius)
3. Identify areas that are relatively better off compared to surroundings
4. These become predicted congregation points

**Rationale**: 
In widespread scarcity, pastoralists move toward areas with *relatively* better conditions, not just objectively good conditions. This creates predictable convergence patterns.

### 4. Movement Risk Calculation

**Purpose**: Generate final risk map combining all factors

**Weighted Formula**:
```
Movement_Risk = (Water_Scarcity × 0.4) + 
                (Vegetation_Stress × 0.4) + 
                (Convergence_Potential × 0.2)
```

**Weights Rationale**:
- Water is critical in South Sudan's semi-arid context (40%)
- Vegetation/grazing quality is equally important (40%)
- Convergence potential amplifies risk (20%)

Note: These weights should be calibrated using historical movement data and conflict event locations.

## Spatial and Temporal Scope

### Geographic Focus

**Primary Study Area**: Northwestern South Sudan
- Unity State
- Northern Bahr el Ghazal
- Warrap State

**Rationale**: These states experience significant pastoral movement and resource-based conflicts, particularly between Dinka and Nuer communities.

### Temporal Resolution

**Recommended Analysis Periods**:
- **Dry Season (December-March)**: Highest risk period due to water scarcity
- **Early Wet Season (April-June)**: Transition period, monitoring flood vs. drought
- **Monthly updates** during high-risk seasons
- **Quarterly updates** during lower-risk periods

## Validation Approach

### Ground Truth Data Sources

1. **Conflict Event Data**: ACLED (Armed Conflict Location & Event Data)
   - Filter for pastoral/resource-related conflicts
   - Spatial-temporal correlation with risk predictions

2. **Mobile Phone Survey Data**: 
   - IOM Displacement Tracking Matrix (DTM)
   - FEWS NET pastoral migration reports

3. **Expert Validation**:
   - Local NGO partner knowledge
   - UN OCHA field reports
   - Pastoral community representatives

### Accuracy Metrics

- **Spatial Accuracy**: How well do predicted high-risk zones align with reported conflict locations?
- **Temporal Accuracy**: How many days/weeks before conflict events do risk indicators appear?
- **False Positive Rate**: Areas flagged as high-risk with no subsequent conflict
- **False Negative Rate**: Conflict events in areas not flagged as high-risk

## Model Limitations and Uncertainties

See [limitations.md](limitations.md) for detailed discussion.

## References

- Catley, A., Lind, J., & Scoones, I. (2016). *Pastoralism and Development in Africa: Dynamic Change at the Margins*. Routledge.

- Homer-Dixon, T. F. (1999). *Environment, Scarcity, and Violence*. Princeton University Press.

- Meier, P., Bond, D., & Bond, J. (2007). Environmental influences on pastoral conflict in the Horn of Africa. *Political Geography*, 26(6), 716-735.

- Schomerus, M., & Allen, T. (2010). Southern Sudan at odds with itself: Dynamics of conflict and predicaments of peace. LSE Development Studies Institute.

- UNEP (2018). Addressing the Role of Natural Resources in Conflict and Peacebuilding. United Nations Environment Programme.

---

**Document Version**: 1.0  
**Last Updated**: February 2026  
**Contact**: See main README for contact information
