# Asset Credits and Limitations

## Satellite Earth textures
- **Asset:** Earth surface texture, `earth_atmos_2048.jpg`
- **Source:** [Three.js examples texture](https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg)
- **Use:** Local texture for the interactive contextual globe.
- **Coverage/date:** A static global Earth surface texture; it is not a historical observation or a NASA/EIC frame.

- **Supporting assets:** [`earth-normal-2048.jpg`](https://threejs.org/examples/textures/planets/earth_normal_2048.jpg), [`earth-specular-2048.jpg`](https://threejs.org/examples/textures/planets/earth_specular_2048.jpg), and [`earth-lights-2048.png`](https://threejs.org/examples/textures/planets/earth_lights_2048.png), from the [Three.js planetary texture set](https://threejs.org/examples/textures/planets/).
- **Use:** The normal map adds restrained relief shading, the specular map confines ocean highlights, and the static city-light map is revealed only on the night hemisphere. These supporting maps are contextual assets, not current or date-matched observations.

## Atmospheric clouds and scattering
- **Cloud asset:** [`earth-clouds-1024.png`](https://threejs.org/examples/textures/planets/earth_clouds_1024.png), from the Three.js planetary texture set. It is a genuine transparent cloud-cover texture, animated independently from the surface; it is static and not date-matched.
- **Atmosphere:** A lightweight Fresnel shader creates a thin blue scattering rim and three subdued bands. Its overall intensity is modulated between 0.92 and 1.00 by the existing normalized global-temperature glow value. This scalar is an artistic cue only; it does not represent local temperature, CO₂, or geographic climate measurements.

## NASA thermal visualization
- **Asset:** Equirectangular image sequence, `4096x2048_2x1_30p` frame set for [NASA SVS 5450](https://svs.gsfc.nasa.gov/5450/).
- **Source data:** NASA GISTEMP global surface temperature anomalies relative to the 1951–1980 baseline; the source maps are a 24-month running mean.
- **Coverage:** NASA's official [`time.txt`](https://svs.gsfc.nasa.gov/vis/a000000/a005400/a005450/time.txt) lists 900 year-only timestamps: six frames for each year from 1881 through 2023 and 42 frames for 2024. The app maps months linearly across the available frames within each year to follow the selected timeline position. This is approximate sequence-position alignment, not an exact month-to-frame mapping; the source does not provide month-exact frame timestamps. Dates outside 1881–2024 show the nearest boundary map, clearly labeled as such.
- **Use:** Loaded on demand in Thermal View, with two frames of forward and one of backward prefetch. A same-origin route fetches one requested NASA frame, resizes it to 3072 pixels wide, and serves a browser-cacheable WebP image.
- **Credits:** Data provided by Robert B. Schmunk (NASA/GSFC GISS); visualization by Mark SubbaRao (NASA/GSFC); scientific consulting by Gavin A. Schmidt (NASA/GSFC GISS).

## Scientific datasets
- **Global temperature anomalies:** NASA GISS GISTEMP, [data portal](https://data.giss.nasa.gov/gistemp/). Supplied local monthly JSON spans 1880–2026.
- **Atmospheric CO₂:** NOAA Global Monitoring Laboratory Mauna Loa series, [trends portal](https://gml.noaa.gov/ccgg/trends/). Supplied local JSON spans March 1958–September 2026.
- **Global mean sea level:** NASA-SSH / PO.DAAC, [GMSL Indicator](https://podaac.jpl.nasa.gov/dataset/NASA_SSH_GMSL_INDICATOR), DOI [10.5067/NSIND-GMSV1](https://doi.org/10.5067/NSIND-GMSV1). The supplied `public/sea_level.json` contains weekly raw and 60-day-smoothed estimates in centimeters, referenced to a 1993 zero mean, through 2026-11-03. It is not adjusted for GIA. The JSON names the Version 1.1 upstream grid in `source_dataset` but says Version 1 in `citation`; NASA's current GMSL Indicator collection description names upstream Version 1. The source-version relationship is therefore not treated as fully verified. See [SEA_LEVEL_VALIDATION.md](./SEA_LEVEL_VALIDATION.md) for audit metrics and verification limits.

## NASA / EIC visual resources
- **NASA Worldview:** [worldview.earthdata.nasa.gov](https://worldview.earthdata.nasa.gov/). The app provides a date-linked external viewer. Imagery-layer coverage varies by date and is not a geographic representation of the global-average climate measurements.
- **NASA Scientific Visualization Studio:** [svs.gsfc.nasa.gov](https://svs.gsfc.nasa.gov/).
- **NASA Earth Information Center:** [earth.gov](https://earth.gov/).

## Display limitation
NASA Worldview sends `X-Frame-Options: SAMEORIGIN` and a restrictive frame-ancestor policy, so it cannot be embedded in this app. The app opens its official viewer in a new tab instead. No historical EIC frames were supplied locally; the globe remains explicitly labeled as contextual imagery rather than a date-matched observation.

The supplied temperature and CO₂ time series are global and are not converted into local maps. The independent NASA SVS GISTEMP anomaly frames supply the geographic pattern used in Thermal View.
