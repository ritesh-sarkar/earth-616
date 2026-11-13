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