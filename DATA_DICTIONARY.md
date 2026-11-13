# Data Dictionary

## Temperature series
Source: NASA GISS Surface Temperature Analysis (GISTEMP)

Fields:
- `year`: integer year
- `month`: integer month, 1-12
- `value`: monthly temperature anomaly, in °C
- `dateKey`: normalized `YYYY-MM`
- `monthName`: human-readable month label

Notes:
- The supplied snapshot spans 1880–2026; the last non-null temperature observation is August 2026.
- Missing values in the source remain null in the aligned timeline and are never fabricated.
- The dataset is anomaly-based, not a surface temperature map.
- The displayed anomaly is relative to the 1951–1980 mean.

## CO₂ series
Source: NOAA Mauna Loa monthly mean CO₂

Fields:
- `year`: integer year
- `month`: integer month, 1-12
- `value`: monthly average atmospheric CO₂, in ppm
- `deseasonalized`: optional deseasonalized value
- `dateKey`: normalized `YYYY-MM`

Notes:
- The supplied snapshot begins in March 1958 and ends in September 2026.
- CO₂ is used as a secondary sonification signal and contextual climate indicator.
- Monthly means are not geographic maps.
- Negative concentration sentinel values are treated as unavailable in the normalized model, while the supplied source JSON remains unchanged.

## Global mean sea level (GMSL)
Source: NASA-SSH / NASA Physical Oceanography Distributed Active Archive Center (PO.DAAC), supplied as `public/sea_level.json`.

Fields in each supplied weekly row:
- `decimal_year`: fractional calendar year converted to a UTC timestamp using the actual duration of that year.
- `gmsl_cm`: unsmoothed global mean sea-level estimate, in centimeters.
- `gmsl_60_day_smoothed_cm`: estimate smoothed over 60 days, in centimeters.

Notes:
- The file contains 1,755 weekly observations from 1993-01-04 through 2026-11-03. It has a zero-mean reference over calendar year 1993 and is not adjusted for Glacial Isostatic Adjustment (GIA).
- Negative values are retained; they are valid relative to the 1993 reference and are not replaced with zero.
- The source JSON remains unchanged. A runtime parser checks required numeric fields, the NASA fill value, duplicate/out-of-order times, implausible magnitudes, discontinuities, and metadata/data consistency. Every rejected row is retained in the validation report with its source index and reason.
- Each monthly timeline value is evaluated at the 15th, 12:00 UTC. Adjacent weekly rows are linearly interpolated only when the gap is at most 31 days; an edge observation may be used only within 14 days. Larger gaps and dates outside those limits remain unavailable.
- Sea Level mode maps the validated 60-day-smoothed series' observed range to 110–440 Hz. This mapping is a sonification scale, not a physical acoustic measurement.
- The historical chart shows both the weekly raw estimates and 60-day-smoothed series. Monthly selection markers use the shared timeline's aligned value.
- NASA's official GMSL indicator metadata identifies DOI `10.5067/NSIND-GMSV1` and currently names upstream Version 1. The supplied JSON's `source_dataset` names upstream Version 1.1 while its citation says Version 1; this lineage discrepancy is documented in [SEA_LEVEL_VALIDATION.md](./SEA_LEVEL_VALIDATION.md).
- Provenance is **partially verified**: the DOI/product identity and rounded latest value have been checked, but a full historical record-by-record comparison against NASA's protected granule is not available. See the validation report; the local file is not described as fully NASA-verified.

## Alignment model
- Internal model stores all records by exact `year-month` key.
- Temperature remains primary for pre-1958 periods.
- CO₂ is layered in only when valid data exists for the same month.
- Sea-level observations align to the monthly cursor through bounded interpolation and are unavailable outside their measured coverage.

## NASA geographic anomaly frames
Source: [NASA Scientific Visualization Studio 5450](https://svs.gsfc.nasa.gov/5450/).

- NASA's official `time.txt` lists 900 year-only timestamps: six frames per year for 1881–2023 and 42 frames for 2024. Thermal View distributes monthly timeline positions linearly across the available frames within each year so the map progresses with the selected month. This is approximate sequence-position alignment, not month-exact scientific matching, because NASA's frame metadata only specifies years.
- NASA describes the maps as global surface temperature anomalies relative to the 1951–1980 baseline, averaged over a running 24-month window.
- Frames are streamed on demand through `/api/thermal-frame/[frame]`, resized to 3072 pixels wide, and encoded as WebP. A browser-side bounded-concurrency queue preloads nearby frames into a five-texture LRU cache. This changes image encoding/resolution, not the underlying NASA map data.
- The thermal texture comes from this independent, geographic NASA map product. It is not created by spreading the supplied global-average temperature value across Earth.
- Outside 1881–2024, Thermal View displays the nearest boundary frame and labels its actual year and that it is the nearest available map. It does not imply the map represents the selected date.

## Sonification mappings
- **Temperature:** monthly GISTEMP anomaly maps linearly to a 110–440 Hz sine oscillator over the clamped −2.5°C to +2.5°C range.
- **CO₂:** a valid positive monthly concentration maps across 300–450 ppm to a harmonic between 440–880 Hz and a smoothly ramped gain. This mode does not read temperature.
- **Temperature + CO₂:** temperature controls the 110–440 Hz fundamental; CO₂ independently controls the harmonic interval and level.
- **Sea Level:** the 60-day-smoothed GMSL reading maps its validated observed range to a 110–440 Hz sine oscillator. It is an independent mode and does not alter Temperature + CO₂.
- Every mode uses the shared `YYYY-MM` timeline. A mode requiring a missing observation is unavailable; no missing value is replaced with zero or a synthetic observation.
