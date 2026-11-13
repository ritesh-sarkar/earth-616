# Test Report

## Automated checks
- `npm run lint` — passed.
- `npm test` — passed; all 78 tests passed across 8 files, including GMSL parsing, rejection reporting, bounded interpolation, timeline alignment, audio mapping, and voice commands.
- `npx next build --webpack` — passed; the optimized production bundle compiled, TypeScript validation completed, and static routes were generated.
- Repeated `npm run build` attempts hit a Windows `@tailwindcss/turbopack` worker subprocess crash (`0xc0000409`), with no source diagnostic; the webpack production build passed.

## Browser checks
Verified at `http://localhost:3001`:
- Selected Sea Level mode and confirmed the shared timeline moves to January 1993, the first available month; the interpolated smoothed value and mapped pitch update.
- Selected November 2026 and confirmed the app uses the nearest available observation from November 3 rather than extrapolating; it displays 11.53 cm smoothed, 11.52 cm raw, and 440 Hz.
- Started and stopped Sea Level playback successfully.
- Switched to CO₂ and Temperature + CO₂ modes and confirmed both retain their March 1958 first-available start.
- Confirmed all three historical charts render, including separate raw and smoothed weekly sea-level series.
- Confirmed no horizontal document overflow at 375px mobile and 1425px desktop viewport widths.
- No uncaught browser errors were observed. The existing non-blocking `THREE.Clock` deprecation warning remains.

## Known limitations
- NASA Worldview prevents iframe embedding (`X-Frame-Options: SAMEORIGIN` and restrictive frame policy). The app opens its official viewer in a new tab with the selected month; actual layer coverage varies by date.
- The supplied 2026 temperature series is incomplete after August. Missing observations remain unavailable.
- The sea-level source has a metadata version discrepancy and only partial independent numerical verification; details are in [SEA_LEVEL_VALIDATION.md](./SEA_LEVEL_VALIDATION.md).
- The globe texture is a credited contextual Three.js asset, not a NASA historical frame.
- The browser logs a non-blocking `THREE.Clock` deprecation warning from the installed React Three Fiber renderer; no uncaught page errors were observed.
