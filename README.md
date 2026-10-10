# EARTH-616: Earth Information Jukebox

> **See Earth. Hear Earth. Understand Earth.**\
> **Earth → Data → Sound → Understanding**

EARTH-616 is a proposed interactive web experience exploring how NASA
Earth science data can be experienced through synchronized
visualization, data sonification, and AI-assisted explanations. The
initial focus is global temperature anomalies. The goal is to make
scientific information more engaging and approachable through both sight
and sound.

> **Project status:** Proposal / prototype planning. Planned features
> are not presented as already implemented.

## Table of Contents

-   [The Idea](#the-idea)
-   [The Problem](#the-problem)
-   [Our Proposed Solution](#our-proposed-solution)
-   [Initial Scientific Dataset](#initial-scientific-dataset)
-   [How Sonification Works](#how-sonification-works)
-   [Proposed User Experience](#proposed-user-experience)
-   [System Architecture](#system-architecture)
-   [Scientific Integrity and AI
    Boundaries](#scientific-integrity-and-ai-boundaries)
-   [Planned Technology Stack](#planned-technology-stack)
-   [Accessibility and Expected
    Impact](#accessibility-and-expected-impact)
-   [Future Development](#future-development)
-   [Current Scope and Limitations](#current-scope-and-limitations)
-   [Repository Status](#repository-status)
-   [Data Source and Acknowledgment](#data-source-and-acknowledgment)
-   [Team](#team)

## The Idea

Earth produces vast amounts of scientific data about its changing
systems. These measurements are often presented as numbers, tables,
maps, and charts. EARTH-616 explores another way to engage with this
information: **turning verified scientific measurements into sound while
keeping the data visible and explainable**.

The project is envisioned as an interactive "Earth Information Jukebox."
A user explores a time period, sees the selected scientific value, hears
a sound generated from that same value, and can request a plain-language
explanation of what the data represents.

EARTH-616 is not intended to create a soundtrack that claims to be the
literal sound of Earth. The sound is a carefully defined
**sonification**---an audible representation of scientific data.

## The Problem

Scientific datasets can be difficult to explore for people who are
unfamiliar with data visualization or who benefit from information
presented in more than one sensory format. Charts and numerical values
are important, but they are not the only possible way to communicate
patterns.

EARTH-616 investigates how sound, synchronized visuals, and contextual
explanations might help people notice changes over time and engage with
Earth science in a more interactive way. It is intended to complement
scientific visualizations, not replace them or simplify away the
underlying evidence.

## Our Proposed Solution

The initial experience focuses on global temperature anomalies. Users
will be able to:

1.  **Explore** annual temperature anomaly values along a timeline.
2.  **See** the selected year and its value in a visual interface.
3.  **Hear** a tone generated from that value using a fixed, documented
    mapping.
4.  **Compare** how the sound changes as the selected year changes.
5.  **Understand** the selected measurement through an optional
    AI-assisted explanation grounded in verified dataset information.

The experience is organized around one shared data object, called the
**Unified Earth State**. The selected year and scientific value should
remain consistent across the visualization, sound, and explanation.

## Initial Scientific Dataset

### NASA GISS Surface Temperature Analysis (GISTEMP v4)

The initial data source is NASA's **GISS Surface Temperature Analysis,
version 4 (GISTEMP v4)**, specifically the **Global Land-Ocean
Temperature Index (L-OTI)**.

-   **Dataset:** Global-mean annual land-ocean temperature anomalies
-   **Period selected for the initial analysis:** 1880--2025
-   **Number of complete annual records in the analyzed snapshot:** 146
-   **Reference baseline:** 1951--1980
-   **Unit:** Degrees Celsius (°C)
-   **Primary source:** [NASA GISTEMP
    v4](https://data.giss.nasa.gov/gistemp/)
-   **Data downloads:** [NASA GISTEMP v4 data
    tables](https://data.giss.nasa.gov/gistemp/data_v4.html)

A temperature anomaly describes how much warmer or cooler a period was
relative to a reference average. It is not the absolute temperature of
the planet.

For example, the project's analyzed dataset records a **2015 annual
anomaly of +0.90°C** relative to the 1951--1980 baseline. This value is
used below to illustrate the proposed sonification method.

**Data handling note:** NASA periodically updates its analysis as
observations and corrections become available. The project should retain
the date/version of the downloaded dataset and validate the exact values
used in each release. The 146-record count describes the analyzed
snapshot used for this proposal, not a guarantee that every future
download will contain the same values or coverage.

## How Sonification Works

Sonification is the use of sound to represent information. In
EARTH-616's initial mapping, the annual temperature anomaly controls the
pitch of a sine-wave tone.

### Proposed mapping

-   Lower temperature anomaly → lower pitch
-   Higher temperature anomaly → higher pitch
-   One consistent mapping range is used so values remain comparable
    across years.

The proposed fixed mapping parameters are:

  Parameter                                            Value
  ------------------------------- --------------------------
  Minimum anomaly for mapping                        −0.50°C
  Maximum anomaly for mapping                        +1.30°C
  Minimum frequency                                   220 Hz
  Maximum frequency                                   880 Hz
  Waveform                                         Sine wave
  Default playback pace             1 year per 1-second slot
  Sound portion of each slot                     0.8 seconds
  Gap between tones                              0.2 seconds
  Proposed playback speed range                     0.5×--4×

Values outside the configured anomaly range are clamped to the nearest
boundary. The range is fixed and documented rather than recalculated
from whichever years happen to be selected. This helps preserve
comparability between playback sessions.

### Mapping formula

For an anomaly value `T` in degrees Celsius:

``` text
normalized = clamp((T - MIN_TEMP) / (MAX_TEMP - MIN_TEMP), 0, 1)

frequency = MIN_FREQ + normalized * (MAX_FREQ - MIN_FREQ)
```

Using the proposed constants:

``` text
MIN_TEMP = -0.50
MAX_TEMP =  1.30
MIN_FREQ = 220
MAX_FREQ = 880
```

For the 2015 example:

``` text
T = +0.90°C

normalized = (0.90 - (-0.50)) / (1.30 - (-0.50))
           = 1.40 / 1.80
           ≈ 0.7778

frequency = 220 + 0.7778 * (880 - 220)
          ≈ 733.3 Hz
```

Therefore, **the 2015 value maps to approximately 733.3 Hz** under this
proposed mapping.

This frequency is a designed auditory representation of the data---not a
sound naturally emitted by the planet and not a scientific measurement
in itself. The mapping is a communication choice intended to make
changes in the selected data audible.

## Proposed User Experience

1.  The user opens the Earth Information Jukebox.
2.  The user selects a year on the timeline.
3.  The interface displays the corresponding verified temperature
    anomaly.
4.  The sonification engine calculates the tone using the documented
    mapping.
5.  The user plays or compares tones across years.
6.  The user can ask an optional question such as **"What am I
    hearing?"**
7.  The explanation uses the selected dataset value and its context.

The timeline, displayed value, audio, and explanation should all refer
to the same selected year. If the selected year changes, all related
elements should update together.

## System Architecture

The proposed system separates scientific data handling from the
presentation and explanation layers.

``` mermaid
flowchart TD
    A[NASA GISTEMP v4 L-OTI] --> B[Data Source Adapter / Dataset Snapshot]
    B --> C[Validation and Normalization]
    C --> D[Unified Earth State]
    D --> E[Visualization]
    D --> F[Deterministic Sonification]
    D --> G[AI-Assisted Explanation]
    E --> H[Shared Timeline and Playback Experience]
    F --> H
    G --> H
```

### Main components

-   **NASA data source:** Supplies the underlying scientific
    measurements.
-   **Data adapter and snapshot:** Loads a documented copy of the
    selected data and records its provenance.
-   **Validation and normalization:** Checks required fields, year
    coverage, units, missing values, and duplicate years.
-   **Unified Earth State:** Holds the currently selected year, value,
    unit, phenomenon, and dataset metadata.
-   **Visualization:** Presents the selected value and its context in
    charts or other visual forms.
-   **Sonification engine:** Applies the fixed formula and generates
    sound using the Web Audio API.
-   **AI-assisted explanation:** Provides contextual explanations based
    on the verified state and scientific metadata.
-   **Synchronization:** Keeps the year and value aligned across all
    parts of the experience.

## Scientific Integrity and AI Boundaries

Scientific trust is a core design principle for EARTH-616.

1.  **NASA data is the source of truth.** Scientific values should come
    from the selected dataset, not from an AI-generated response.
2.  **Sonification is deterministic.** The same input value and mapping
    settings should produce the same target frequency.
3.  **The mapping is documented.** The chosen range, formula, waveform,
    and playback rules should be visible in the project documentation.
4.  **The interface stays synchronized.** Visualization, audio, and
    explanation should use the same selected Earth State.
5.  **AI explains; it does not measure.** AI is intended to explain the
    supplied data and answer contextual questions. It must not invent
    values, choose the scientific mapping, or replace the source
    dataset.
6.  **Uncertainty and limitations matter.** Explanations should avoid
    claiming that a single annual anomaly describes every location or
    every aspect of the climate system.
7.  **Fallback behavior is important.** The core data exploration and
    sonification experience should remain usable even if the optional AI
    service is unavailable.

## Planned Technology Stack

The following stack is the current implementation plan, not a claim that
every component has already been built.

  -----------------------------------------------------------------------
  Area                    Planned technology      Purpose
  ----------------------- ----------------------- -----------------------
  Web application         Next.js and React       Application structure
                                                  and interactive UI

  Language                JavaScript              Application and
                                                  client-side logic

  Styling                 Tailwind CSS            Responsive interface
                                                  and visual system

  Charts                  Recharts                Time-series
                                                  visualization

  Audio                   Web Audio API           Programmatic tone
                                                  generation and playback

  Animation               Framer Motion           Interface transitions
                                                  and interaction
                                                  feedback

  AI explanation          Gemini through a        Optional data-grounded
                          server-side Next.js API explanations
                          route                   

  Deployment              Vercel                  Potential hosting and
                                                  deployment
  -----------------------------------------------------------------------

The initial prototype does not require a database, user accounts, or a
separate Express server. These can be reconsidered only if the project
later develops requirements that justify them.

Any AI API key must remain on the server and must never be exposed in
client-side code or committed to the repository.

## Accessibility and Expected Impact

EARTH-616 aims to support a more inclusive and engaging way to explore
Earth science by presenting data through multiple coordinated formats.

Potential benefits include:

-   **An additional way to perceive patterns:** Sound may help users
    notice changes that are not immediately obvious from a chart alone.
-   **Multisensory learning:** Combining visuals, sound, and
    plain-language context may support different learning preferences.
-   **More approachable scientific exploration:** Interactive playback
    can make a long time series feel more tangible.
-   **Potential accessibility support:** Sonification may provide an
    additional channel for people who have difficulty interpreting
    visual charts, though it does not by itself guarantee accessibility.
-   **Scientific literacy:** Clear explanations and transparent mappings
    can help users understand what a measurement represents and what it
    does not represent.

These are intended benefits to investigate and evaluate, not claims of
measured impact. Accessibility should include keyboard operation,
screen-reader-friendly labels, visible numerical values, adjustable
playback, and a way to use the experience without sound.

## Future Development

The initial focus is temperature anomaly mapped to pitch. If the core
experience is validated, future versions could explore additional Earth
systems using separate, documented mappings.

  -----------------------------------------------------------------------
  Potential data          Possible auditory       Status
  dimension               representation          
  ----------------------- ----------------------- -----------------------
  Global temperature      Pitch                   Initial focus
  anomaly                                         

  Temperature change over Pitch movement or       Future exploration
  time                    melodic interval        

  Wind speed              Loudness or another     Future exploration
                          controlled sound        
                          parameter               

  Precipitation           Rhythm or event density Future exploration

  Wildfire activity       Carefully designed      Future exploration
                          event patterns          

  Ocean changes           A distinct              Future exploration
                          low-frequency or tonal  
                          mapping                 

  Vegetation indicators   Timbre or another       Future exploration
                          documented sound        
                          characteristic          
  -----------------------------------------------------------------------

These are design possibilities, not established scientific equivalences.
Each additional mapping would require a reliable data source,
appropriate normalization, documented assumptions, testing, and care to
avoid misleading listeners.

Longer-term possibilities include spatial exploration, additional NASA
Earth datasets, improved accessibility controls, and richer
explanations. These ideas are outside the initial temperature-focused
scope unless they are explicitly implemented and validated.

## Current Scope and Limitations

The initial scope is intentionally focused:

-   One primary dataset: NASA GISTEMP v4 L-OTI.
-   Annual global temperature anomaly values from the analyzed
    1880--2025 snapshot.
-   A fixed, documented temperature-to-pitch mapping.
-   A shared state connecting the selected year, value, visualization,
    and sound.
-   Optional AI-assisted explanation that does not control scientific
    calculations.

The initial mapping does not encode every aspect of Earth's climate. A
single tone cannot communicate all the uncertainty, regional
differences, or interacting processes behind a global annual anomaly.
The interface should therefore show the original numerical value and
relevant context alongside the sound.

At this stage, this repository documents the concept, methodology,
architecture, and proposed implementation. Any component not yet built
or tested should be treated as planned work rather than a completed
feature.

## Repository Status

This repository is intended to document the EARTH-616 concept and its
proposed scientific and technical approach for the NASA Space Apps
Challenge submission.

As implementation progresses, update this checklist to reflect
verifiable status:

-   [ ] Dataset snapshot and provenance documented
-   [ ] Dataset validation script or checks completed
-   [ ] Temperature-to-pitch calculation tested
-   [ ] Audio playback prototype implemented
-   [ ] Timeline and chart connected to the same state
-   [ ] AI explanation route implemented with server-side key handling
-   [ ] End-to-end experience tested
-   [ ] Accessibility checks completed

Do not mark an item complete until it has actually been implemented or
verified.

## Data Source and Acknowledgment

The primary source is NASA's Goddard Institute for Space Studies (GISS)
Surface Temperature Analysis, version 4.

-   **GISTEMP overview:** https://data.giss.nasa.gov/gistemp/
-   **GISTEMP v4 data downloads:**
    https://data.giss.nasa.gov/gistemp/data_v4.html

NASA explains that GISTEMP v4 estimates global surface temperature
change and is updated as new observations and corrections become
available. The L-OTI data tables report anomalies relative to the
1951--1980 means.

When publishing results based on this dataset, retain the data access
date and cite NASA's dataset page and the relevant scientific
publication as directed by NASA's citation guidance.

Suggested acknowledgment:

> Data source: NASA Goddard Institute for Space Studies (GISS), GISS
> Surface Temperature Analysis (GISTEMP), version 4. Global Land-Ocean
> Temperature Index (L-OTI). https://data.giss.nasa.gov/gistemp/

EARTH-616 is a student project concept using NASA data. Do not imply
NASA endorsement or affiliation beyond the dataset attribution.

## Team

-   **Team name:** EARTH-616
-   **Project:** Earth Information Jukebox
-   **Challenge:** NASA Space Apps Challenge 2026

Add the team members' names and roles here before publishing, if
appropriate for the submission.

------------------------------------------------------------------------

**EARTH-616 --- See Earth. Hear Earth. Understand Earth.**

*Our goal is not simply to create a song about Earth. It is to build an
instrument for exploring Earth's changing systems through data, sound,
and understanding.*
