# Model Limitations and Uncertainties

## Overview

This document provides a transparent assessment of the limitations, uncertainties, and potential failure modes of the cattle movement risk early warning model. Understanding these constraints is essential for responsible use and interpretation of model outputs.

## Fundamental Limitations

### 1. Correlation vs. Causation

**Limitation**: The model identifies environmental conditions *correlated* with cattle movement and conflict risk, but cannot prove causation.

**Implications**:
- Environmental stress is a *necessary but not sufficient* condition for resource-based conflict
- Other factors (political tensions, ethnic relations, weapon availability, governance) play critical roles
- Model predictions indicate *potential* risk, not inevitability

**Mitigation**:
- Combine model outputs with qualitative intelligence and local knowledge
- Validate against ground truth from humanitarian partners
- Frame results as "environmental risk factors" rather than "conflict predictions"

---

### 2. Spatial Resolution Constraints

**Limitation**: Primary datasets operate at 1-5 km resolution, which may miss critical small-scale features.

**Specific Issues**:
- Small water points (boreholes, small ponds) not detected by 30m JRC data
- Local variations in vegetation within 1km MODIS pixels
- Specific cattle routes and traditional migration corridors not captured

**Implications**:
- Risk may be underestimated in areas dependent on small water sources
- Model works best for broad spatial patterns, not pinpoint locations
- Convergence zones are approximate, not exact GPS coordinates

**Mitigation**:
- Supplement with local knowledge of water points and migration routes
- Use higher-resolution data (Sentinel-2) in critical hotspot areas if available
- Present results as "general risk zones" with uncertainty buffers (e.g., 5-10 km)

---

### 3. Temporal Resolution and Lag

**Limitation**: Satellite data has temporal lag; CHIRPS ~3 weeks, MODIS ~8 days for processing.

**Implications**:
- Model cannot provide real-time early warning
- By the time environmental stress is detected, movements may have already begun
- Best suited for seasonal forecasting (weeks-months ahead), not emergency response

**Temporal Use Cases**:
- ✅ Seasonal risk assessment (2-3 months ahead)
- ✅ Monitoring evolving conditions during dry season
- ❌ Immediate conflict prediction (hours-days)
- ❌ Real-time crisis response

**Mitigation**:
- Run model monthly during high-risk season for trend analysis
- Combine with weather forecasts for 1-2 week ahead predictions
- Position model as "early awareness" not "early warning" (medium-term planning tool)

---

### 4. Historical Data Limitations

**Limitation**: Model validation requires historical conflict data, which has known issues in South Sudan.

**ACLED Data Issues**:
- Reporting bias toward accessible areas and major events
- Remote pastoral conflicts often go unreported
- Event locations may be approximate
- Lag in reporting (days to weeks)

**Livestock Data Issues**:
- Most recent global livestock density data from 2010
- South Sudan data quality poor due to conflict and limited surveys
- Herd sizes and compositions have changed significantly since independence

**Implications**:
- Model accuracy metrics may be unreliable
- Risk may be underestimated in remote areas with poor reporting
- Cannot confidently state false positive/negative rates

**Mitigation**:
- Focus on relative risk (area A vs. area B) rather than absolute thresholds
- Validate with multiple sources: ACLED, IOM displacement data, local NGO reports
- Clearly communicate uncertainty in validation

---

## Technical Limitations

### 5. Cloud Cover and Missing Data

**Limitation**: Optical satellite data (Landsat, MODIS) affected by cloud cover, especially during wet season.

**Impact**:
- Vegetation indices may have data gaps
- Surface water detection limited during cloudy periods
- Temporal composites may miss short-term events

**Mitigation**:
- Use 16-day MODIS composites (maximize cloud-free observations)
- Interpolate missing data with caution
- Consider radar data (Sentinel-1) as supplement (cloud-penetrating)
- Clearly mark areas/periods with low data confidence

---

### 6. Model Calibration Uncertainty

**Limitation**: Weights in the risk formula (water 40%, vegetation 40%, convergence 20%) are theoretical, not empirically derived.

**Current Formula**:
```
Movement_Risk = (Water_Scarcity × 0.4) + (Vegetation_Stress × 0.4) + (Convergence_Potential × 0.2)
```

**Issues**:
- No ground truth cattle movement data to optimize weights
- Weights may vary by season, region, or community
- Threshold for "high risk" is arbitrary

**Research Needs**:
- Collect cattle movement GPS tracking data (if ethical and feasible)
- Conduct sensitivity analysis on weight variations
- Calibrate separately for different pastoral groups if cultural differences exist
- Machine learning approach (if sufficient training data available)

**Current Approach**: Weights based on literature review and expert consultation, but should be treated as a starting hypothesis.

---

### 7. Oversimplification of Pastoral Decision-Making

**Limitation**: Model treats pastoralists as purely resource-driven, ignoring complex decision factors.

**Factors Not Modeled**:
- **Social networks**: Kinship ties and alliances influence movement decisions
- **Market access**: Herders may prioritize proximity to markets over optimal grazing
- **Security**: Previous conflict history affects route choices
- **Cultural factors**: Traditional territories, sacred sites, customary agreements
- **Political factors**: Government policies, peace agreements, humanitarian aid distribution

**Implications**:
- Predicted convergence zones may not align with actual movement patterns
- Model may over-predict conflict in some areas, under-predict in others
- Environmental stress alone insufficient to explain all pastoral movements

**Mitigation**:
- Engage local experts and pastoral representatives in interpretation
- Overlay model outputs with qualitative context (peace agreements, aid programs)
- Use model as one input among many for decision-making

---

## Contextual Limitations

### 8. Non-Stationarity (Changing Conditions)

**Limitation**: Model assumptions based on historical patterns, but climate change and conflict are altering pastoral systems.

**Changes Over Time**:
- **Climate change**: Shifting rainfall patterns, increased drought frequency
- **Land use change**: Agricultural expansion, oil development reducing grazing land
- **Demographics**: Population growth increasing pressure on resources
- **Technology**: Boreholes and water infrastructure altering traditional routes
- **Conflict**: Years of war changing ethnic relations and territory control

**Implications**:
- Historical patterns may not predict future behavior
- Model may become less accurate over time without updates
- "Normal" conditions are shifting

**Mitigation**:
- Regular model recalibration
- Incorporate climate projections for long-term assessments
- Monitor for regime shifts in pastoral systems
- Adaptive management approach

---

### 9. Wet Season vs. Dry Season

**Limitation**: Model primarily designed for dry season water scarcity; wet season dynamics differ.

**Wet Season Challenges**:
- **Flooding**: Sudd wetlands and seasonal floods force movement (opposite problem)
- **Abundant resources**: Lower intrinsic conflict risk, but flooding can create resource concentration
- **Disease**: Vector-borne livestock diseases more prevalent
- **Access**: Roads impassable, limiting humanitarian response

**Current Model**: Optimized for dry season (December-March) risk assessment.

**Mitigation**:
- Develop separate wet season model focusing on flood risk and access constraints
- Clearly communicate seasonal applicability in all outputs
- Consider bi-annual analysis: dry season (scarcity) and wet season (flooding)

---

## Ethical and Political Limitations

### 10. Potential for Misuse

**Limitation**: Risk maps could be misused for targeting, surveillance, or discriminatory policies.

**Risk Scenarios**:
- Military actors using maps to predict pastoral group locations
- Discriminatory policies restricting movement of certain communities
- Stigmatization of areas or groups as "high conflict risk"
- Surveillance justification

**Safeguards**:
- See [ethics.md](ethics.md) for detailed discussion
- Limit spatial precision in public-facing outputs
- Share detailed outputs only with vetted humanitarian/peace partners
- Emphasize environmental conditions, not ethnic/community identities
- Require data use agreements

---

### 11. Resource Allocation Bias

**Limitation**: Early warning systems can inadvertently reinforce resource allocation patterns.

**Potential Issues**:
- Humanitarian resources flow to "high-risk" areas, neglecting structural issues elsewhere
- Self-fulfilling prophecy: attention and resources to predicted hotspots create new dynamics
- Neglect of non-environmental conflict drivers (governance, political inclusion)

**Mitigation**:
- Use model to inform preparedness, not allocate limited humanitarian aid
- Complement with conflict-sensitive development approaches
- Advocate for addressing root causes (governance, resource rights, development)

---

## Technical Uncertainty Quantification

### Model Output Uncertainty

**Sources of Uncertainty**:
1. **Input data uncertainty**: Satellite measurement errors, gaps, resolution limits
2. **Processing uncertainty**: Algorithm choices, parameter sensitivity
3. **Model uncertainty**: Formula weights, threshold definitions
4. **Validation uncertainty**: Ground truth data quality and completeness

**Current State**: Model does not yet quantify or propagate uncertainty through calculations.

**Future Development**:
- Implement Monte Carlo sensitivity analysis
- Provide confidence intervals for risk estimates
- Map data quality/confidence spatially
- Clearly communicate "low confidence" areas in outputs

---

## Recommendations for Users

### Do:
✅ Use model as one tool among many for situation awareness  
✅ Combine with qualitative intelligence and local knowledge  
✅ Focus on relative risk and broad trends, not absolute predictions  
✅ Validate findings with field partners before action  
✅ Update regularly with new data and ground truth  
✅ Communicate limitations transparently to stakeholders  

### Don't:
❌ Treat model outputs as definitive predictions  
❌ Use for real-time emergency response (temporal lag)  
❌ Base resource allocation solely on model outputs  
❌ Ignore local context and expert knowledge  
❌ Share detailed outputs publicly without security review  
❌ Assume causation from environmental correlation  

---

## Future Improvements

Priority areas for model enhancement:
1. Incorporate social/political context variables
2. Calibrate weights using movement tracking data
3. Develop uncertainty quantification framework
4. Create separate wet season flood risk model
5. Integrate near-term weather forecasts
6. Build feedback loop with humanitarian partners
7. Add higher-resolution analysis for critical hotspots
8. Develop mobile/SMS-based validation system with pastoral communities

---

## Conclusion

This model provides valuable environmental context for understanding cattle movement risk in South Sudan, but it is not a complete conflict prediction system. Environmental stress is one factor among many in pastoral conflicts. 

**The model is most valuable when**:
- Used for medium-term (weeks-months) planning
- Combined with qualitative intelligence
- Applied with local community engagement
- Interpreted by users who understand pastoral systems
- Updated regularly with validation data

**Users must understand that**:
- Predictions are probabilistic, not deterministic
- Uncertainty is inherent and should be communicated
- Ethical use requires careful consideration of potential harms
- Local context always trumps remote sensing

By acknowledging these limitations, we can use the model responsibly as part of a comprehensive approach to conflict prevention and humanitarian preparedness in South Sudan.

---

**Document Version**: 1.0  
**Last Updated**: February 2026  
**See Also**: [methodology.md](methodology.md), [ethics.md](ethics.md)
