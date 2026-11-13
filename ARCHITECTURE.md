# Earth Information Jukebox — Architecture

## High-level architecture
The application is structured as a single-page scientific experience built with Next.js App Router and client-side state management.

## Core modules
- `app/page.js`: top-level assembled experience and application shell
- `src/components/`: UI and visualization blocks
- `src/lib/`: data validation, alignment and scientific processing
- `src/audio/`: Web Audio factory and sonification helpers
- `public/`: static assets and generated dataset outputs

## Data flow
1. Load the supplied static JSON snapshots from `public/temperature.json` and `public/co2.json`.
2. Parse monthly values into a normalized internal data model.
3. Combine temperature and CO₂ by year-month key.
4. Feed the selected month into playback state and UI.
5. Sonify the current month with temperature as primary pitch and CO₂ as optional harmonic layer.
6. Update the 3D Earth and charts with the current selection.

## Important design choice
The app uses a shared timeline model instead of multiple independent timers. Playback state owns the current month and all dependent visualization/audio consumers read from the same source of truth.

## Fallback design
When WebGL is unavailable, the controls, measurements, charts and timeline remain usable. NASA Worldview is opened as an external date-linked viewer because its current frame policy disallows embedding. The app labels its local textured globe as contextual rather than a historical NASA frame.
