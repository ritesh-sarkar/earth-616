# Earth Information Jukebox

An interactive climate-data listening experience for NASA Space Apps 2026. Explore global temperature anomalies, atmospheric CO₂, and global mean sea level on one shared timeline, then hear the selected signal synthesized in the browser.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other useful commands:

```bash
npm run lint
npm test
npm run build
```

## Experience

- Satellite View preserves the contextual Earth texture. Thermal View streams NASA SVS 5450's geographically gridded GISTEMP anomaly maps. As the shared month changes, the selected year’s frames advance in approximate, linear month-position order; NASA’s published frame timestamps have year-only precision, so this is not exact month-matched science data.
- The supplied monthly temperature JSON in `public/temperature.json` drives a 110–440 Hz oscillator in Temperature mode.
- The supplied NOAA CO₂ JSON in `public/co2.json` drives harmonic frequency and strength in CO₂ mode. In the combined mode, temperature controls pitch while CO₂ controls the harmonic voice.
- The supplied weekly NASA PO.DAAC observations in `public/sea_level.json` drive an independent Sea Level pitch mode. The shared monthly cursor uses bounded interpolation and does not extrapolate beyond observed coverage.
- A single monthly cursor synchronizes the calendar, timeline, measurements, chart markers, Earth response and sound parameters.
- Playback starts only after a user action. The waveform reads the Web Audio analyser output.
- Playback pace can be selected in months per second or years per second. Use the month picker, scrubber, chart, previous/next buttons, speed selector, volume control, or guided listen to explore the record.

Mode availability is derived from valid observations in the imported JSON. Negative CO₂ concentration sentinels and missing observations remain unavailable; no signal is replaced with zero. The GMSL file is audited at load time; its NASA attribution is only partially verified because the local metadata has an upstream-version discrepancy and complete historical granule access was unavailable. Details are in [SEA_LEVEL_VALIDATION.md](./SEA_LEVEL_VALIDATION.md). The NASA thermal map uses a 1951–1980 baseline and a 24-month running mean, with frames covering 1881–2024. NASA's `time.txt` contains year-only frame timestamps (six frames each for 1881–2023 and 42 for 2024); the app maps each selected month linearly across that year's available sequence positions. This improves visual synchronization but is approximate because the source does not publish month-exact frame times. Dates outside that range show the clearly labeled nearest boundary frame. A translucent procedural cloud layer rotates over the Earth as a visual effect, not as date-specific cloud observations.

## Scientific and visual transparency

The supplied temperature, CO₂, and sea-level datasets are global time series and are not mapped onto individual locations; GMSL is not a local coastline measurement. Thermal View is a separate, real NASA GISTEMP spatial anomaly visualization, not a geographic expansion of the supplied monthly global-average value. The NASA frame is loaded through a fixed same-origin route and resized/cached for display. NASA Worldview can be opened for the selected date, but its security policy prevents embedding it in this app and imagery coverage depends on the layer/date.

Dataset references, units, NASA map limitations, and Earth texture attribution are documented in [ASSET_CREDITS.md](./ASSET_CREDITS.md) and [DATA_DICTIONARY.md](./DATA_DICTIONARY.md). GMSL source checks and verification limits are in [SEA_LEVEL_VALIDATION.md](./SEA_LEVEL_VALIDATION.md). The UI implementation checklist is in [UI_CHECKLIST.md](./UI_CHECKLIST.md).
