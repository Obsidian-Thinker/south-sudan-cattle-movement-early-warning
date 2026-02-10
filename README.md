# South Sudan Cattle Movement Risk Early Warning Model

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Google Earth Engine](https://img.shields.io/badge/Google%20Earth%20Engine-Enabled-green)](https://earthengine.google.com/)

A research-focused demonstration of using satellite remote sensing and Google Earth Engine to predict cattle movement risk in South Sudan, based on environmental conditions that drive pastoral communities to move their herds in search of water and grazing resources.

**Target Audience**: Academic researchers, UN humanitarian agencies, conflict prevention practitioners, and development organizations working in pastoral conflict contexts.

**Status**: Research/Demonstration Repository (Not Operational)

---

## Table of Contents

- [Overview](#overview)
- [The Causal Logic](#the-causal-logic)
- [Datasets Used](#datasets-used)
- [How to Use This Model](#how-to-use-this-model)
- [Repository Structure](#repository-structure)
- [Limitations](#limitations)
- [Ethics and Responsible Use](#ethics-and-responsible-use)
- [Contributing](#contributing)
- [Citation](#citation)
- [License](#license)
- [Contact](#contact)

---

## Overview

In South Sudan, pastoral communities depend on cattle for their livelihoods and cultural identity. During periods of environmental stress—particularly water scarcity and degraded grazing land—herders must move their cattle to survive. When multiple communities converge on limited resources, competition can escalate into violence.

This model uses freely available satellite data to:
1. **Identify environmental stress conditions** (water scarcity, vegetation decline)
2. **Predict likely cattle movement patterns** based on resource availability
3. **Highlight potential convergence zones** where resource competition may occur
4. **Generate risk indicators** for humanitarian early warning and conflict prevention

**This is a demonstration/research tool**, not a fully operational early warning system. It shows what is possible with Earth observation data and provides a foundation for further development in partnership with local communities and humanitarian organizations.

---

## The Causal Logic

The model is built on the following evidence-based causal chain:

```
┌──────────────────────────────────────────────────────────────────┐
│                    Environmental Stressors                       │
│  • Drought / Reduced Precipitation                               │
│  • Surface Water Depletion                                       │
│  • Vegetation Degradation / Poor Grazing                         │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Pastoral Response                              │
│  • Herd Movement to Find Water and Grazing                      │
│  • Departure from Traditional/Preferred Territories              │
│  • Increased Herd Mobility and Range                            │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│              Resource Convergence                                │
│  • Multiple Communities Move to Same Limited Resource Points     │
│  • Concentration at Remaining Water Sources                      │
│  • Overlap in Grazing Areas                                     │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│              Increased Conflict Risk                             │
│  • Competition Over Water and Pasture                            │
│  • Territorial Disputes                                          │
│  • Cattle Raiding                                               │
│  • Inter-community Violence                                      │
└──────────────────────────────────────────────────────────────────┘
```

**Key Insight**: Environmental stress doesn't *cause* conflict directly, but it acts as a **threat multiplier** by forcing movements that increase the likelihood of resource competition, especially in contexts with existing ethnic tensions, weak governance, and proliferation of weapons.

**Evidence Base**: This logic is supported by extensive research on pastoral conflicts in East Africa (see [docs/methodology.md](docs/methodology.md) for references).

---

## Datasets Used

This model leverages multiple free, publicly available satellite datasets:

| Dataset | Purpose | Resolution | Provider |
|---------|---------|------------|----------|
| **CHIRPS** | Precipitation & drought monitoring | 5.5 km, daily | UC Santa Barbara |
| **JRC Global Surface Water** | Surface water extent & change | 30 m | European Commission JRC |
| **MODIS NDVI/EVI** | Vegetation health & grazing quality | 1 km, 16-day | NASA |
| **WorldPop** | Population density context | 100 m | WorldPop Project |
| **ACLED** | Conflict event validation (not input) | Event-level | ACLED |

**All datasets are accessible through Google Earth Engine** without downloading terabytes of satellite imagery. See [docs/data_sources.md](docs/data_sources.md) for detailed information on each dataset, access procedures, and data characteristics.

---

## How to Use This Model

### Prerequisites

1. **Google Earth Engine Access**: Sign up for a free account at [https://earthengine.google.com](https://earthengine.google.com)
   - Academic/research accounts are typically approved quickly
   - NGO/humanitarian organization accounts also available

2. **Basic JavaScript Knowledge**: GEE uses JavaScript for scripting (basic familiarity helpful but not required)

3. **Understanding of the Context**: Read the [methodology](docs/methodology.md) and [limitations](docs/limitations.md) documents before running the model

### Running the Model

**Option 1: Quick Start (Recommended)**

1. Open the [Google Earth Engine Code Editor](https://code.earthengine.google.com)

2. Copy the contents of [`gee/cattle_movement_risk_model.js`](gee/cattle_movement_risk_model.js)

3. Paste into the Code Editor

4. Review the configuration section (lines 20-30) and adjust:
   - Study area coordinates (default: Northwestern South Sudan)
   - Time period for analysis
   - Visualization parameters

5. Uncomment the data loading sections (currently marked as placeholders)

6. Click **Run** to execute the script

7. View results in the **Map** panel:
   - Water Scarcity Index
   - Vegetation Stress Index
   - Convergence Zones
   - Combined Movement Risk Map

8. (Optional) Export results to Google Drive or Google Cloud Storage using the export functions

**Option 2: Modify for Your Use Case**

- Adjust the study area to focus on specific regions
- Modify weights in the risk calculation based on local knowledge
- Integrate additional datasets (soil moisture, temperature, etc.)
- Change temporal resolution (weekly, monthly, seasonal)

**Note**: The provided script includes extensive comments and placeholder code to guide implementation. It is a **template/demonstration**, not a fully functional model out-of-the-box. You will need to uncomment and potentially modify the data processing sections based on your specific needs.

---

## Repository Structure

```
south-sudan-cattle-movement-early-warning/
│
├── README.md                          # This file - main documentation
├── LICENSE                            # MIT License
│
├── gee/                               # Google Earth Engine Scripts
│   └── cattle_movement_risk_model.js  # Main GEE model script (commented template)
│
└── docs/                              # Detailed Documentation
    ├── methodology.md                 # Detailed methodology, formulas, approach
    ├── data_sources.md                # Complete guide to datasets and access
    ├── limitations.md                 # Model limitations and uncertainties
    └── ethics.md                      # Ethics and responsible use guidelines
```

---

## Limitations

This model has important limitations that users must understand:

### Technical Limitations

- **Spatial Resolution**: 1-5 km resolution may miss small but critical water points
- **Temporal Lag**: Satellite data has 3-21 day processing lag; not for real-time response
- **Cloud Cover**: Optical satellite data affected by clouds, especially in wet season
- **Validation Data**: Limited ground truth data for model calibration

### Conceptual Limitations

- **Correlation ≠ Causation**: Environmental stress is associated with conflict risk but doesn't directly cause it
- **Oversimplification**: Pastoral decision-making is complex; model doesn't capture social, political, cultural factors
- **Non-Stationarity**: Climate change and conflict are altering historical patterns

### Use Case Limitations

- ✅ **Good for**: Seasonal risk assessment (weeks-months ahead), broad spatial patterns, humanitarian preparedness
- ❌ **Not suitable for**: Real-time emergency response, pinpoint location predictions, resource allocation decisions alone

**See [docs/limitations.md](docs/limitations.md) for comprehensive discussion of all limitations and how to work within them.**

---

## Ethics and Responsible Use

### ⚠️ Critical Ethical Considerations

Using predictive models in conflict contexts carries significant ethical responsibilities:

1. **Do No Harm**: Risk maps could be misused for targeting or surveillance
   - Share detailed outputs only with vetted humanitarian partners
   - Limit spatial precision in public materials
   - Never identify specific ethnic groups in risk assessments

2. **Community Participation**: Affected communities should have voice in how they are represented
   - This is currently a top-down model; community co-design is needed for operational use
   - Local knowledge should validate and complement, not be replaced by, satellite data

3. **Data Security**: Conflict-related data must be protected
   - Require data use agreements for detailed outputs
   - Encrypt sensitive information
   - Implement access controls

4. **Conflict Sensitivity**: Interventions can have unintended consequences
   - Frame issues in terms of environmental conditions, not ethnic identities
   - Work with peacebuilding actors, not just humanitarian ones
   - Avoid stigmatizing pastoral livelihoods

**See [docs/ethics.md](docs/ethics.md) for detailed ethical guidelines, governance recommendations, and responsible communication practices.**

---

## Contributing

This is a research demonstration repository. Contributions are welcome, particularly:

- **Validation Data**: Ground truth cattle movement or conflict data (with ethical safeguards)
- **Model Improvements**: Enhanced algorithms, additional datasets, calibration methods
- **Documentation**: Clearer explanations, translations, case studies
- **Ethical Review**: Feedback from conflict-sensitive programming experts and community representatives

**Before contributing**, please:
1. Read the [ethics guidelines](docs/ethics.md)
2. Open an issue to discuss proposed changes
3. Ensure any data shared has appropriate permissions and protections

---

## Citation

If you use this model or methodology in your research or operational work, please cite:

```
Obsidian-Thinker (2026). South Sudan Cattle Movement Risk Early Warning Model. 
GitHub repository: https://github.com/Obsidian-Thinker/south-sudan-cattle-movement-early-warning
```

**Academic/Technical References**: See bibliography in [docs/methodology.md](docs/methodology.md)

---

## Future Development

Potential enhancements for operational implementation:

- [ ] Calibrate model weights using GPS tracking data from pastoral communities (with consent)
- [ ] Integrate near-term weather forecasts for 1-2 week ahead predictions
- [ ] Develop mobile/SMS-based two-way information system with communities
- [ ] Create separate wet season model focusing on flooding dynamics
- [ ] Implement uncertainty quantification framework
- [ ] Build partnerships with local peace committees and NGOs
- [ ] Develop governance structure with ethics oversight and community representation

---

## Related Work

- **FEWS NET**: Famine Early Warning Systems Network (food security focus)
- **ICPAC**: IGAD Climate Prediction and Applications Centre (regional climate services)
- **IOM DTM**: Displacement Tracking Matrix (population mobility)
- **UNOSAT**: UN satellite analysis for humanitarian action

This model complements existing systems by focusing specifically on the environmental drivers of pastoral mobility and resource competition.

---

## Acknowledgments

This demonstration model is inspired by the work of humanitarian organizations, conflict researchers, and pastoral communities working toward peace in South Sudan. 

**Datasets**: We gratefully acknowledge the providers of open satellite data (NASA, European Commission JRC, UCSB, WorldPop) that make this analysis possible.

**Context**: Our understanding is informed by extensive research on pastoral livelihoods and conflicts in South Sudan by organizations including Mercy Corps, Saferworld, Conciliation Resources, and many others.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Note**: While the code is open source, please review the [ethics guidelines](docs/ethics.md) for responsible use of model outputs, particularly regarding data sharing and conflict sensitivity.

---

## Contact

**Repository Maintainer**: Obsidian-Thinker

**For Questions or Collaboration**:
- Open an issue in this repository
- For sensitive topics (security, ethics): [Contact through private channels]

**For Operational Use Inquiries**:
If you are a humanitarian organization or researcher interested in adapting this model for operational use, please reach out to discuss partnership, ethical safeguards, and community engagement requirements.

---

**Disclaimer**: This model is a research demonstration tool. It is not a fully operational early warning system and has not been validated for operational decision-making. Users must understand the limitations and ethical considerations before using model outputs to inform any interventions. The authors and contributors assume no liability for decisions made based on model outputs.
