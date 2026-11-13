# Task Checklist

Status definitions: NOT STARTED, IN PROGRESS, COMPLETED, BLOCKED.

## PHASE 1 — Workspace inspection and architecture.
- [x] Reviewed existing Next.js App Router structure and preserved the JavaScript stack.
- [x] Kept the supplied local public JSON datasets as the application data source.

## PHASE 2 — Dataset inspection and validation.
- [x] Confirmed NASA GISTEMP monthly temperature coverage: 1880–2026 (latest valid month in supplied file: August 2026).
- [x] Confirmed NOAA Mauna Loa CO₂ coverage: March 1958–September 2026.
- [x] Added parsing, duplicate-date replacement, invalid-month guards, missing-value handling and rejection of negative concentration sentinels.

## PHASE 3 — Data processing and date alignment.
- [x] Normalize measurements to exact `YYYY-MM` date keys.
- [x] Preserve missing months as gaps and stop the timeline at the latest supplied measurement.
- [x] Keep monthly CO₂ for display and deseasonalized CO₂ for the secondary sound mapping.

## PHASE 4 — Sonification engine.
- [x] Use user-initiated Web Audio oscillator synthesis.
- [x] Map temperature anomaly to a documented 110–440 Hz primary pitch range.
- [x] Map positive deseasonalized CO₂ independently to a quieter harmonic interval and level.
- [x] Add volume, analyser waveform, smooth parameter ramps and audio cleanup.

## PHASE 5 — Playback and synchronization.
- [x] Use one monthly index as the master date cursor.
- [x] Connect play, pause, stop, previous/next, scrub, calendar selection and playback speed.
- [x] Update displayed measurements, chart cursor, globe response and sound from the selected record.

## PHASE 6 — NASA visual asset integration.
- [x] Provide a selected-date link to the official NASA Worldview site.
- [x] Explain that Worldview imagery is contextual and layer/date coverage varies.
- [x] Document that Worldview prohibits framing; the viewer opens externally.
- [x] Do not claim a local historical EIC frame is supplied.

## PHASE 7 — Interactive 3D Earth.
- [x] Load a verified Earth surface texture, with atmospheric rim and restrained sonification cue.
- [x] Add orbit interaction, rotation toggle, zoom and reset.
- [x] Include a WebGL fallback.

## PHASE 8 — Scientific charts and data panels.
- [x] Add separate full-history temperature and CO₂ charts with independent units and axes.
- [x] Preserve gaps and synchronize the selected-date marker.
- [x] Show current values, units, month-over-month temperature change and unavailable states.

## PHASE 9 — Complete user interface.
- [x] Create cinematic desktop experience and responsive tablet/mobile layouts.
- [x] Add accessible navigation, audio controls, month picker and guided listening mode.
- [x] Add data-to-sound explanation, citations and asset notes.

## PHASE 10 — Integration and performance optimization.
- [x] Keep audio context lifecycle separate from chart/globe rendering.
- [x] Use a single playback interval and an analyser-driven waveform.
- [x] Reduce WebGL pixel ratio, geometry and background detail for ordinary hardware.

## PHASE 11 — Automated and manual testing.
- [x] Run dataset parsing, alignment, gap and mapping unit tests.
- [x] Run ESLint.
- [x] Run the Next.js production build.
- [x] Browser-based interaction checks at desktop, tablet and mobile widths.

## PHASE 12 — Bug fixing and final verification.
- [x] Resolve lint issues and update the documentation.
- [x] Complete browser verification and update `TEST_REPORT.md`.

## Known limitations
- Supplied JSON ends with incomplete 2026 temperature observations; missing September–December values remain missing.
- No local NASA/EIC historical frame sequence was supplied. NASA Worldview is accessible externally; its date coverage depends on the selected layer.
