<<<<<<< HEAD
# 🌍 EARTH-616 — Earth Information Jukebox

### See Earth. Hear Earth. Understand Earth.

**Earth → Data → Sound → Understanding**

EARTH-616 is an interactive Earth-science experience that transforms complex environmental observations into an immersive combination of scientific data, 3D visualization, interactive timelines, and sound.

Built for **NASA Space Apps Challenge 2026 — Earth Information Jukebox**, the project explores a simple idea:

> What if we could not only see how our planet is changing, but also hear what its data tells us?

By combining Earth observation resources, climate datasets, interactive visualizations, and data sonification, EARTH-616 aims to make environmental information more engaging, understandable, and accessible.

---

## ✨ Features

### 🌎 Interactive 3D Earth

- Interactive 3D Earth visualization.
- Detailed planetary surface and Earth textures.
- Atmospheric representation.
- Satellite and thermal visualization modes.
- Interactive exploration of the planet.
- Integrated environmental visualization experience.

### 🌡️ Global Temperature Visualization

Explore historical global temperature anomalies and understand how Earth's temperature has changed over time.

- Historical temperature data visualization.
- Interactive timeline-based exploration.
- Temperature anomaly representation.
- Synchronized data presentation and sonification.

Temperature anomalies represent deviations from a reference-period average, rather than absolute temperatures.

### 🛰️ NASA Thermal Visualization

Explore thermal imagery through NASA Scientific Visualization Studio resources.

- NASA thermal frame sequence integration.
- Dynamic frame retrieval through a Next.js API route.
- Thermal visualization alongside the 3D Earth experience.

### 🧪 Atmospheric CO₂

Explore historical atmospheric carbon dioxide observations.

- CO₂ data visualization.
- Historical timeline exploration.
- Data-driven audio representation.
- Combined temperature and CO₂ exploration.

The interpretation of CO₂ observations depends on the underlying dataset and its measurement methodology. Station-based measurements should not be interpreted as a global spatial distribution.

### 🌊 Global Mean Sea-Level

Explore long-term changes in global mean sea level using NASA-SSH data.

- Historical global mean sea-level observations.
- Time-based data exploration.
- Raw and smoothed measurement fields.
- Integration with the shared environmental timeline.

The dataset represents global mean sea-level anomalies. It does not directly represent local coastal water levels, regional flooding, or flood-risk predictions.

### 🎵 Earth Data Sonification

EARTH-616 transforms environmental measurements into sound using data sonification.

Instead of presenting scientific observations only as numbers and charts, the project explores how changes in environmental measurements can be represented through audio.

The experience is designed to connect:

- Scientific measurements.
- Historical changes.
- Visual representations.
- Audio feedback.

**Important:** The generated audio is a sonification of scientific data. It is not a recording of actual sounds produced by Earth.

### 🎙️ Voice Interaction

Voice controls provide an alternative way to interact with the experience.

The project includes voice-control and voice-command processing modules to support a more accessible, hands-free interaction experience.

### 📊 Synchronized Exploration

The project brings multiple environmental data views into a shared exploration experience.

The goal is to help users understand how different environmental indicators change across time, rather than treating each dataset as an isolated visualization.

---

## 🧠 How It Works

EARTH-616 follows a data-driven visualization and sonification workflow.

```text
          NASA / NOAA / Scientific Data
                       |
                       v
              Data Acquisition
                       |
                       v
             Data Processing
                       |
                       v
              Data Validation
                       |
                       v
              Unified Data State
                       |
          +------------+------------+
          |            |            |
          v            v            v
      3D Earth      Charts       Sonification
          |            |            |
          +------------+------------+
                       |
                       v
             Interactive Experience
                       |
                       v
                User Exploration
```

### 1. Data Acquisition

Scientific observations and visualization resources are collected from relevant NASA and NOAA resources.

### 2. Data Processing

The application processes environmental measurements into structures suitable for visualization and audio mapping.

### 3. Data Validation

Scientific datasets require careful interpretation.

The application should preserve units, reference periods, timestamps, missing-value conventions, and source attribution when processing observations.

### 4. Visualization

The processed information is presented through the 3D Earth environment, thermal visualization, and interactive data views.

### 5. Sonification

Environmental measurements are mapped into audio parameters to create a sound-based representation of the underlying data.

### 6. Interactive Exploration

Users can explore the available environmental information through the application's interactive controls and timeline.

---

## 🛰️ Scientific Data & Resources

EARTH-616 uses scientific datasets and visualization resources to ground the experience in real environmental observations.

The following are the primary resources associated with the project.

| Data / Resource | Source | Purpose |
|---|---|---|
| Global temperature anomalies | NASA GISTEMP | Historical temperature exploration |
| Thermal imagery | NASA Scientific Visualization Studio | Thermal visualization |
| Atmospheric CO₂ | NOAA / relevant atmospheric observation datasets | CO₂ exploration |
| Global mean sea level | NASA-SSH / PO.DAAC | Sea-level anomaly exploration |

### 1. NASA GISTEMP — Global Temperature

**Source:** NASA Goddard Institute for Space Studies

NASA GISTEMP provides historical global surface temperature analysis.

- Dataset: GISTEMP v4 Global Land-Ocean Temperature Index.
- Measurement: Temperature anomaly.
- Unit: Degrees Celsius (°C).
- Reference period: 1951–1980.
- Historical coverage: Beginning in 1880.

Official resources:

- [NASA GISTEMP Data](https://data.giss.nasa.gov/gistemp/)
- [GISTEMP v4 Documentation](https://data.giss.nasa.gov/gistemp/data_v4.html)
- [Global Land-Ocean Temperature CSV](https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts%2BdSST.csv)

**Scientific note:** Global temperature anomalies are measurements relative to a reference-period average. They should not be confused with absolute surface temperatures or geographically resolved temperature maps.

### 2. NASA Scientific Visualization Studio — Thermal Imagery

**Source:** NASA Scientific Visualization Studio

Thermal visualization resources are used to support the application's thermal exploration experience.

- [NASA SVS — Visualization 5450](https://svs.gsfc.nasa.gov/5450/)
- [NASA SVS — Visualization 5603](https://svs.gsfc.nasa.gov/5603/)

Frame resources:

```text
https://svs.gsfc.nasa.gov/vis/a000000/a005400/a005450/frames/4096x2048_2x1_30p/
```

These resources provide visualization frames that can be used to present scientific information in an interactive visual format.

**Scientific note:** A rendered visualization frame sequence is not automatically equivalent to a raw scientific measurement dataset. Its metadata, timestamps, processing methodology, and original source should be considered when interpreting it.

### 3. Atmospheric CO₂ Observations

Atmospheric carbon dioxide observations provide another important environmental indicator.

Potential source resources associated with the project include:

- [NOAA Global Monitoring Laboratory](https://gml.noaa.gov/ccgg/trends/)
- [NOAA Mauna Loa CO₂ Data](https://gml.noaa.gov/ccgg/trends/data.html)
- [NASA OCO-2 Mission](https://oco.jpl.nasa.gov/)

**Scientific note:** Mauna Loa observations are station-based measurements. They do not independently describe the spatial distribution of atmospheric CO₂ across the entire planet.

### 4. NASA-SSH — Global Mean Sea Level

**Source:** NASA Physical Oceanography Distributed Active Archive Center (PO.DAAC)

Dataset: NASA-SSH Simple Gridded Sea Surface Height from Standardized Reference Missions Only, Version 1.1.

- Dataset identifier: `NASA_SSH_REF_SIMPLE_GRID_V1`
- DOI: [10.5067/NSIND-GMSV1](https://doi.org/10.5067/NSIND-GMSV1)
- Measurement: Global mean sea-level anomaly.
- Unit: Centimeters (cm).
- Reference: Zero mean over calendar year 1993.
- Temporal coverage: Beginning in 1993.

Relevant fields:

| Field | Description |
|---|---|
| `decimal_year` | Observation time |
| `gmsl_cm` | Global mean sea-level anomaly |
| `gmsl_60_day_smoothed_cm` | Smoothed global mean sea-level anomaly |

Official resources:

- [NASA PO.DAAC Dataset](https://podaac.jpl.nasa.gov/dataset/NASA_SSH_REF_SIMPLE_GRID_V1)
- [NASA Open Data — Global Mean Sea Level](https://data.nasa.gov/dataset/nasa-ssh-global-mean-sea-level-from-gridded-sea-surface-height)
- [NASA SVS — Global Mean Sea Level](https://svs.gsfc.nasa.gov/5611/)

**Scientific note:** Global mean sea-level anomaly is not equivalent to local sea-level change, absolute ocean depth, or a coastal flooding prediction. The dataset also should not be interpreted as a geographic map of sea-level rise.

---

## 🏗️ Technology Stack

EARTH-616 is built using a modern JavaScript-based web stack.

| Technology | Usage |
|---|---|
| Next.js 16 | Application framework |
| React 19 | User interface |
| JavaScript | Application logic |
| Tailwind CSS 4 | Styling |
| Three.js | 3D rendering |
| React Three Fiber | React-based 3D scene rendering |
| React Three Drei | 3D helpers and utilities |
| Recharts | Data visualization |
| Web APIs | Browser-side interaction and audio capabilities |
| Vitest | Automated testing |
| Testing Library | Component testing |
| ESLint | Code quality and linting |

---

## 📁 Project Structure

The project follows a modular Next.js application structure.

```text
earth-616/
│
├── app/
│   ├── api/
│   │   └── thermal-frame/
│   │       └── [frames]/
│   │
│   ├── ...
│
├── public/
│   ├── data/
│   │   └── ...
│   │
│   ├── earth/
│   │   └── ...
│   │
│   ├── temperature.json
│   ├── co2.json
│   └── sea_level.json
│
├── src/
│   ├── components/
│   │   ├── earth/
│   │   │   └── EarthScene.js
│   │   │
│   │   └── layout/
│   │       ├── MainExperience.js
│   │       └── VoiceControl.jsx
│   │
│   └── lib/
│       ├── audioEngine.js
│       ├── climateData.js
│       ├── seaLevelData.js
│       ├── thermalData.js
│       ├── thermalTextureCache.js
│       ├── voiceCommandHandler.js
│       ├── voiceCommandParser.js
│       └── ...
│
├── README.md
├── package.json
└── ...
```

**Note:** This is a simplified overview of the main project areas, not an exhaustive listing of every file.

Some directories, including `src/components/audio`, `src/components/visualization`, `src/data`, `src/hooks`, and `scripts`, are currently reserved for future organization and expansion.

---

## 🚀 Getting Started

Follow these instructions to run EARTH-616 locally.

### Prerequisites

Make sure you have installed:

- [Node.js](https://nodejs.org/) — compatible with your installed Next.js version.
- npm — included with Node.js.
- Git.

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/earth-616.git
```

### 2. Navigate to the Project

```bash
cd earth-616
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

The current project configuration does not require an environment variable file based on the provided setup.

If future integrations introduce API keys or other configuration, add the required variables to a local `.env.local` file and document them in `.env.example`.

Never commit private API keys or credentials.

### 5. Start the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The application should now be available locally.

---

## 📦 Available Commands

The following scripts are defined in `package.json`.

| Command | Description |
|---|---|
| `npm run dev` | Starts the development server on port 3000 |
| `npm run build` | Creates a production build |
| `npm run start` | Starts the production server |
| `npm run lint` | Runs ESLint |
| `npm test` | Executes the Vitest test suite |

### Production Build

To build the application:

```bash
npm run build
```

To start the production server after a successful build:

```bash
npm run start
```

### Run Tests

```bash
npm test
```

### Run Linting

```bash
npm run lint
```

---

## 🎧 Understanding Data Sonification

Sonification is the process of translating data into sound.

In EARTH-616, environmental measurements are used as inputs for audio generation.

A simplified conceptual workflow:

```text
Scientific Measurement
          |
          v
    Normalization
          |
          v
   Audio Mapping
          |
          v
 Frequency / Pitch / Sound
          |
          v
     Audio Output
```

For example, a temperature anomaly can be mapped to an audio frequency.

A higher anomaly may produce a higher pitch, while a lower anomaly may produce a lower pitch.

The exact mapping depends on the implemented sonification configuration.

The purpose is not to create music from arbitrary numbers, but to provide another way of perceiving patterns and changes in environmental data.

---

## 🔬 Scientific Integrity

Scientific accuracy is an essential part of EARTH-616.

The project aims to preserve the meaning and limitations of the underlying observations.

Important principles:

- Preserve original measurement units.
- Respect dataset reference periods.
- Use observation timestamps when synchronizing datasets.
- Distinguish raw measurements from smoothed measurements.
- Handle missing and invalid values appropriately.
- Avoid interpreting station measurements as global spatial observations.
- Avoid treating global averages as local environmental conditions.
- Preserve source attribution and dataset metadata.

Visualizations and audio mappings are representations of scientific observations, not substitutes for the original datasets or scientific analysis.

---

## 🌱 Project Goals

EARTH-616 explores how Earth science can become more intuitive through the combination of multiple forms of interaction.

Our goals include:

- Making environmental information more engaging.
- Connecting scientific observations with immersive visualization.
- Exploring data sonification as an alternative method of scientific communication.
- Helping users understand long-term environmental changes.
- Supporting accessible interaction through voice controls.
- Demonstrating how scientific datasets can be transformed into interactive digital experiences.

---

## 🛣️ Future Development

The project can be expanded with additional environmental datasets and scientific visualization capabilities.

Potential directions include:

- More environmental indicators.
- Additional NASA Earth observation datasets.
- Regional and spatial data exploration.
- More advanced sonification mappings.
- Expanded accessibility features.
- Improved scientific context and explanations.
- Additional environmental comparisons.

These are development opportunities, not claims that all such capabilities are already implemented.

---

## 👥 Team EARTH-616

Built by a five-member team for NASA Space Apps Challenge 2026.

| Team Member |
|---|
| Ritesh Sarkar Showharda |
| M Naem Sadik |
| Md Abdullah Al Sifar |
| Fahmid Yesmin Abedah |
| Mrinmoy Pondit Spondon |

---

## 🏆 Challenge

**NASA Space Apps Challenge 2026**

Challenge: **Earth Information Jukebox**

EARTH-616 is an independent student project developed for the challenge using publicly available scientific resources. It is not an official NASA product, and NASA does not endorse the project.

---

## 📄 License & Attribution

This project uses third-party libraries, scientific datasets, and visualization resources.

- NASA and NOAA datasets remain subject to their respective source terms and attribution requirements.
- Third-party libraries retain their original licenses.
- NASA visualization assets should be credited according to the applicable NASA asset information.
- Project-specific licensing should be specified in the repository's `LICENSE` file.

See the project's asset and data documentation for detailed attribution.

---

## 🌍 Final Thought

Earth is constantly changing.

Its temperature, atmosphere, oceans, and other environmental systems leave behind patterns in scientific data.

But data alone can sometimes be difficult to understand.

**EARTH-616 transforms those patterns into an experience where science can be explored, visualized, and heard.**

### See Earth. Hear Earth. Understand Earth.

**EARTH-616 — Earth Information Jukebox.**
=======
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
-   **Team members:**
-   **Ritesh Sarkar Showharda**
-   **M Naem Sadik**
-   **Md Abdullah Al Sifar**
-   **Fahmid Yesmin Abedah**
-   **Mrinmoy Pondit Spondon**

Add the team members' names and roles here before publishing, if
appropriate for the submission.

------------------------------------------------------------------------

**EARTH-616 --- See Earth. Hear Earth. Understand Earth.**

*Our goal is not simply to create a song about Earth. It is to build an
instrument for exploring Earth's changing systems through data, sound,
and understanding.*
>>>>>>> b1ce2324362732ad361f5aca985e03d42b52aaca
