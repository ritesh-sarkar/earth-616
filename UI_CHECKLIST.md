# UI Development Checklist

Status: COMPLETED = implemented and checked; BLOCKED = intentionally unavailable with reason.

## Design system
- [x] Establish restrained space/navy palette with amber temperature and blue CO₂ accents.
- [x] Use consistent typography, scale, spacing and interactive states.
- [x] Add visible keyboard focus and reduced-motion behavior.
- [x] Reflow the interface for laptop, tablet and mobile widths.

## Main experience
- [x] Minimal identity and anchor navigation.
- [x] Large interactive 3D Earth with rotation, zoom and reset controls.
- [x] Label the globe and atmosphere as contextual, not a geographic data overlay.
- [x] Provide date-linked NASA Worldview access and visual provenance notes.
- [x] Display the selected month and current measurements with unavailable states.
- [x] Synchronize date picker, shared timeline, charts and audio parameters.
- [x] Add playback, pause, stop, previous/next, speed, volume and sonification mode controls.
- [x] Draw the actual Web Audio analyser waveform while playback is active.
- [x] Add independent temperature and CO₂ charts with a shared date cursor.
- [x] Explain the data-to-sound mappings and list scientific sources.
- [x] Add a guided demonstration using dates present in the supplied datasets.

## User experience states
- [x] Climate-data loading state.
- [x] Explicit data-load error state and retry.
- [x] Missing-month and pre-1958 CO₂ states.
- [x] Unsupported Web Audio message.
- [x] WebGL fallback.
- [x] NASA frame fallback: open the official viewer externally because NASA Worldview disallows iframe embedding.

## Functional verification
- [x] Dataset parsing/alignment tests.
- [x] Negative CO₂ concentration sentinels do not become measurements.
- [x] Production build and lint verification.
- [x] Browser-based interaction checks at desktop, tablet and mobile widths.
