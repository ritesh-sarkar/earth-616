# Sea-Level Dataset Validation

## Status: PARTIALLY VERIFIED

The supplied `public/sea_level.json` is structurally and numerically audited, its NASA PO.DAAC product identity is supported by official catalog metadata, and its latest smoothed value agrees with NASA's rounded public indicator. The complete historical series has **not** been independently verified point by point against NASA's source granule. Do not describe the local file as fully NASA-verified.

## Source identity and metadata

- The NASA-SSH / PO.DAAC Global Mean Sea Level Indicator is cataloged as [`NASA_SSH_GMSL_INDICATOR`](https://podaac.jpl.nasa.gov/dataset/NASA_SSH_GMSL_INDICATOR), DOI [`10.5067/NSIND-GMSV1`](https://doi.org/10.5067/NSIND-GMSV1). NASA describes it as a weekly global-average sea-level time series in centimeters, based on satellite altimetry, with a 60-day-smoothed version and coverage beginning 1993-01-04.
- The supplied JSON's `source_dataset` points to NASA's official [`NASA_SSH_REF_SIMPLE_GRID_V11`](https://podaac.jpl.nasa.gov/dataset/NASA_SSH_REF_SIMPLE_GRID_V11) collection, DOI `10.5067/NSREF-SG0V11`. That official collection is Version 1.1.
- There is a version/label discrepancy: the local JSON cites the V1.1 grid in `source_dataset`, but its citation says Version 1. The current GMSL Indicator catalog description also identifies upstream Version 1 (`NASA_SSH_REF_SIMPLE_GRID_V1`). The local title omits “Simple” from NASA's catalog title. The parser reports the title and citation/source-version differences; the input JSON was not corrected or rewritten.
- NASA documents a 1993 zero-mean reference and notes that the indicator is not adjusted for Glacial Isostatic Adjustment (GIA). These limitations are shown in the UI and source documentation.

## Local file audit

The validator reads the supplied JSON without modifying it.

| Check | Result |
| --- | --- |
| Total / valid rows | 1,755 / 1,755 |
| Rejected rows | 0 |
| Duplicate or out-of-order timestamps | 0 |
| Missing or NASA fill-value measurements | 0 |
| Metadata record count and decimal-year boundaries | Match the data array |
| Sampling cadence | Approximately 7 days; largest adjacent gap 20.999983 days |
| Largest adjacent change in 60-day-smoothed value | 0.248973 cm |
| Raw range | −0.703369 to 11.588726 cm |
| 60-day-smoothed range | −0.565857 to 11.525769 cm |
| Converted observation coverage | 1993-01-04 to 2026-11-03 |
| Source JSON SHA-256 | `20ece165aceef1b91a584dc1a83d98b5861659794ff9c14805dfbb3e98996690` |

Negative readings are retained because values are relative to the 1993 reference. The parser records each rejected row's source index and reason if a future version contains missing values, fill sentinels, duplicate/out-of-order times, implausible magnitudes, or a smoothed discontinuity. It also reports long sampling gaps and metadata/data discrepancies instead of silently repairing them.

## Time alignment and sonification

- Decimal years are converted to UTC timestamps using the actual duration of the relevant year.
- The shared timeline samples each month at the 15th, 12:00 UTC. Weekly observations are linearly interpolated only between adjacent valid rows no more than 31 days apart.
- At the edge of coverage, the nearest actual observation may be used only when it is within 14 days. The code does not extrapolate; dates farther outside coverage or across wider gaps remain unavailable.
- The chart displays both the original weekly readings and the supplied 60-day-smoothed series. The monthly measurement and Sea Level mode use the aligned 60-day-smoothed value; the unsmoothed value remains separately visible.
- Sea Level mode maps the validated smoothed series' observed range to 110–440 Hz. This is an audio encoding, not a physical sound measurement. The existing Temperature + CO₂ mapping is unchanged.

## Numerical comparison limits

- The latest supplied smoothed value is **11.525769 cm**, or **115.25769 mm**, which rounds to **115.3 mm**. This matches the rounded latest value displayed on NASA's [Global Mean Sea Level Vital Sign](https://sealevel.nasa.gov/vital-signs/global-mean-sea-level/).
- Representative supplied smoothed readings are 1.305260 cm near July 2000, 4.452954 cm near June 2010, 8.142197 cm near June 2020, and 9.966565 cm near June 2026. These are local-series sanity checks, not independent historical NASA comparisons.
- The PO.DAAC catalog identifies NASA's source granules as protected and requiring Earthdata Login. Without an authorized source granule, historical records could not be compared one by one. The single rounded latest-value agreement is not enough to claim full numerical verification.

