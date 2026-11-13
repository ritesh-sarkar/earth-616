'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import EarthScene from '@/src/components/earth/EarthScene';
import { AudioEngine } from '@/src/lib/audioEngine';
import {
  getCo2Observation,
  getFirstAvailableRecordIndex,
  getRecordByDateKey,
  getSonificationAvailability,
  loadClimateData,
  mapCo2ToTimbre,
  mapTemperatureToFrequency,
  SONIFICATION_MODES,
} from '@/src/lib/climateData';
import { getSeaLevelMonthTimestamp } from '@/src/lib/seaLevelData';
import { getThermalDisplayFrameForDate } from '@/src/lib/thermalData';
import { executeVoiceCommand } from '@/src/lib/voiceCommandHandler';
import VoiceControl from '@/src/components/layout/VoiceControl';

const PLAYBACK_PACES = [
  { monthsPerSecond: 0.5, label: '0.5 month/s' },
  { monthsPerSecond: 1, label: '1 month/s' },
  { monthsPerSecond: 2, label: '2 months/s' },
  { monthsPerSecond: 4, label: '4 months/s' },
  { monthsPerSecond: 6, label: '0.5 year/s' },
  { monthsPerSecond: 12, label: '1 year/s' },
  { monthsPerSecond: 24, label: '2 years/s' },
  { monthsPerSecond: 60, label: '5 years/s' },
];
const SEA_LEVEL_COLOR = '#83c6bf';
const DEMO_STEPS = [
  {
    dateKey: 'first-temperature',
    mode: 'temperature',
    title: 'A temperature-only beginning',
    copy: 'The temperature series begins before the supplied CO₂ series. Temperature can be heard on its own.',
  },
  {
    dateKey: 'first-co2',
    mode: 'co2',
    title: 'A CO₂-only signal',
    copy: 'At the first valid CO₂ observation, listen to concentration shape the harmonic texture without using temperature.',
  },
  {
    dateKey: 'first-sea-level',
    mode: 'sea-level',
    title: 'A satellite-altimeter view',
    copy: 'Weekly global mean sea-level observations begin in 1993. The smoothed series is aligned to the same monthly timeline.',
  },
  {
    dateKey: 'first-combined',
    mode: 'combined',
    title: 'Two measurements, two sound roles',
    copy: 'Where both series have valid observations, temperature controls pitch while CO₂ independently controls harmonic texture.',
  },
  {
    dateKey: 'last-co2',
    mode: 'co2',
    title: 'One synchronized experience',
    copy: 'The same selected month updates the Earth view, measurements, charts, and the active sonification mode.',
  },
];

function getDemoRecord(dateKey, records) {
  if (dateKey === 'first-temperature') {
    return records.find((record) => Number.isFinite(record.temperature)) ?? null;
  }
  if (dateKey === 'first-co2') {
    return records.find((record) => getCo2Observation(record) !== null) ?? null;
  }
  if (dateKey === 'first-sea-level') {
    return records.find((record) => Number.isFinite(record.seaLevelSmoothedCm)) ?? null;
  }
  if (dateKey === 'first-combined') {
    return records.find((record) => (
      Number.isFinite(record.temperature) && getCo2Observation(record) !== null
    )) ?? null;
  }
  if (dateKey === 'last-co2') {
    return records.filter((record) => getCo2Observation(record) !== null).at(-1) ?? null;
  }
  return getRecordByDateKey(dateKey, records);
}

function formatMonth(record) {
  if (!record) return '—';
  return `${record.monthLabel} ${record.year}`;
}

function getModeUnavailableReason(
  mode,
  record,
  firstCo2Record,
  lastCo2Record,
  firstSeaLevelRecord,
  lastSeaLevelRecord,
  seaLevelError,
) {
  const availability = getSonificationAvailability(record, mode);
  if (availability.available) return '';

  const missingSignals = [];
  if (availability.needsTemperature && !availability.temperatureAvailable) {
    missingSignals.push(`temperature has no valid observation for ${formatMonth(record)}`);
  }
  if (availability.needsCo2 && !availability.co2Available) {
    let co2Reason = `NOAA CO₂ has no valid observation for ${formatMonth(record)}`;
    if (!firstCo2Record) {
      co2Reason = 'the supplied NOAA CO₂ series has no valid observations';
    } else if (record?.dateKey < firstCo2Record.dateKey) {
      co2Reason = `NOAA CO₂ observations begin ${formatMonth(firstCo2Record)}`;
    } else if (record?.dateKey > lastCo2Record.dateKey) {
      co2Reason = `the supplied NOAA CO₂ series ends ${formatMonth(lastCo2Record)}`;
    }
    missingSignals.push(co2Reason);
  }
  if (availability.needsSeaLevel && !availability.seaLevelAvailable) {
    let seaLevelReason = `NASA PO.DAAC has no valid sea-level observation for ${formatMonth(record)}`;
    if (seaLevelError) {
      seaLevelReason = seaLevelError;
    } else if (!firstSeaLevelRecord) {
      seaLevelReason = 'the supplied NASA PO.DAAC sea-level series has no valid observations';
    } else if (record?.dateKey < firstSeaLevelRecord.dateKey) {
      seaLevelReason = `NASA PO.DAAC sea-level observations begin ${formatMonth(firstSeaLevelRecord)}`;
    } else if (record?.dateKey > lastSeaLevelRecord.dateKey) {
      seaLevelReason = `the supplied NASA PO.DAAC sea-level series ends ${formatMonth(lastSeaLevelRecord)}`;
    } else {
      seaLevelReason = `no weekly sea-level observation is close enough to ${formatMonth(record)} to align without extrapolation`;
    }
    missingSignals.push(seaLevelReason);
  }

  const reason = missingSignals.join('; ');
  return mode === 'combined'
    ? `Combined mode unavailable: ${reason}.`
    : `${reason}.`;
}

function formatNumber(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function ChartTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null;
  const firstPoint = payload[0]?.payload;
  const dateKey = firstPoint?.dateKey;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateKey ?? '')
    ? new Date(`${dateKey}T00:00:00Z`).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
    : dateKey;
  const values = payload.filter((entry) => Number.isFinite(entry.value));
  if (!values.length) return null;

  return (
    <div className="chart-tooltip">
      <span>{date}</span>
      {values.map((entry) => (
        <strong key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {entry.value.toFixed(unit === 'ppm' ? 1 : 2)} {unit}
        </strong>
      ))}
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  color,
  data,
  dataKey,
  selectedDate,
  coverageStart,
  unit,
  yDomain,
  selectedValue,
  onSelectDate,
  timeSeries = false,
  secondaryDataKey,
  secondaryLabel,
  secondaryColor,
  sourceLabel,
}) {
  const onChartClick = (state) => {
    const activePoint = state?.activePayload?.[0]?.payload;
    const dateKey = timeSeries
      ? activePoint?.dateKey?.slice(0, 7)
        ?? (Number.isFinite(Number(state?.activeLabel))
          ? new Date(Number(state.activeLabel)).toISOString().slice(0, 7)
          : null)
      : state?.activeLabel;
    if (dateKey) onSelectDate(dateKey);
  };

  return (
    <article className="chart-panel">
      <header className="chart-heading">
        <div>
          <div className="chart-title-row">
            <span className="variable-mark" style={{ backgroundColor: color }} />
            <h3>{title}</h3>
          </div>
          <p>{subtitle}</p>
        </div>
        <div className="chart-current" style={{ color }}>
          <strong>{formatNumber(selectedValue, unit === 'ppm' ? 1 : 2)}</strong>
          <span>{unit}</span>
        </div>
      </header>
      <div className="chart-canvas" role="img" aria-label={`${title} ${timeSeries ? 'weekly' : 'monthly'} history chart`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }} onClick={onChartClick}>
            <CartesianGrid stroke="rgba(170, 192, 210, 0.1)" vertical={false} />
            <XAxis
              dataKey={timeSeries ? 'timestamp' : 'dateKey'}
              type={timeSeries ? 'number' : 'category'}
              scale={timeSeries ? 'time' : undefined}
              domain={timeSeries ? ['dataMin', 'dataMax'] : undefined}
              tickFormatter={(value) => timeSeries
                ? String(new Date(Number(value)).getUTCFullYear())
                : String(value).slice(5) === '01' ? String(value).slice(0, 4) : ''}
              tick={{ fill: '#8194a4', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(170, 192, 210, 0.18)' }}
              minTickGap={22}
              interval="preserveStartEnd"
              tickCount={timeSeries ? 6 : undefined}
            />
            <YAxis
              tick={{ fill: '#8194a4', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={yDomain}
              width={42}
              tickCount={5}
            />
            <Tooltip content={<ChartTooltip unit={unit} />} />
            {selectedDate && (
              <ReferenceLine
                x={selectedDate}
                stroke={color}
                strokeDasharray="3 4"
                strokeOpacity={0.75}
                ifOverflow="extendDomain"
              />
            )}
            {secondaryDataKey && (
              <Line
                type="monotone"
                dataKey={secondaryDataKey}
                name={secondaryLabel}
                stroke={secondaryColor ?? color}
                strokeOpacity={0.35}
                strokeWidth={0.8}
                strokeDasharray="2 3"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            <Line
              type="monotone"
              dataKey={dataKey}
              name={title}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-axis-caption">
        <span>{coverageStart}</span>
        <span>{sourceLabel ?? (title === 'Atmospheric CO₂' ? 'NOAA Mauna Loa' : 'NASA GISTEMP')}</span>
      </div>
    </article>
  );
}

function Waveform({ engine, active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;

    let frameId;
    const data = new Uint8Array(512);
    const draw = () => {
      const { width, height } = canvas;
      context.clearRect(0, 0, width, height);
      context.beginPath();
      context.lineWidth = 1.5;
      context.strokeStyle = active ? '#e5b874' : '#607687';
      context.globalAlpha = active ? 0.92 : 0.52;

      const hasWaveform = active && engine?.readWaveform(data);
      for (let index = 0; index < data.length; index += 1) {
        const x = (index / (data.length - 1)) * width;
        const sample = hasWaveform ? data[index] / 128 - 1 : 0;
        const y = height / 2 + sample * height * 0.38;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }

      context.stroke();
      if (active) frameId = window.requestAnimationFrame(draw);
    };

    draw();
    return () => window.cancelAnimationFrame(frameId);
  }, [active, engine]);

  return <canvas ref={canvasRef} className="waveform" width="640" height="72" aria-label={active ? 'Live audio waveform' : 'Audio waveform inactive'} />;
}

function Glyph({ children }) {
  return <span aria-hidden="true" className="button-glyph">{children}</span>;
}

export default function MainExperience() {
  const [records, setRecords] = useState([]);
  const [seaLevelRecords, setSeaLevelRecords] = useState([]);
  const [seaLevelReport, setSeaLevelReport] = useState(null);
  const [seaLevelMetadata, setSeaLevelMetadata] = useState(null);
  const [seaLevelError, setSeaLevelError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStopped, setHasStopped] = useState(false);
  const [sonificationMode, setSonificationMode] = useState('temperature');
  const [earthView, setEarthView] = useState('satellite');
  const [audioReady, setAudioReady] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [volume, setVolume] = useState(0.45);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [autoRotate, setAutoRotate] = useState(true);
  const [earthDistance, setEarthDistance] = useState(5.4);
  const [guideStep, setGuideStep] = useState(-1);
  const [showSources, setShowSources] = useState(false);
  const [audioEngine] = useState(() => new AudioEngine());

  useEffect(() => {
    let active = true;
    loadClimateData()
      .then(({
        combinedRecords: loadedRecords,
        seaLevelRecords: loadedSeaLevelRecords,
        seaLevelReport: loadedSeaLevelReport,
        seaLevelMetadata: loadedSeaLevelMetadata,
        seaLevelError: loadedSeaLevelError,
      }) => {
        if (!active) return;
        setRecords(loadedRecords);
        setSeaLevelRecords(loadedSeaLevelRecords);
        setSeaLevelReport(loadedSeaLevelReport);
        setSeaLevelMetadata(loadedSeaLevelMetadata);
        setSeaLevelError(loadedSeaLevelError);
        const firstTemperatureMonth = loadedRecords.findIndex((record) => record.temperature !== null);
        setCurrentIndex(Math.max(0, firstTemperatureMonth));
        setLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : 'Climate data could not be loaded.');
        setLoading(false);
      });

    return () => {
      active = false;
      setIsPlaying(false);
      audioEngine.dispose();
    };
  }, [audioEngine]);

  const currentRecord = records[currentIndex] ?? null;
  const previousRecord = records[currentIndex - 1] ?? null;
  const firstTemperatureRecord = records.find((record) => Number.isFinite(record.temperature)) ?? null;
  const lastTemperatureRecord = records.filter((record) => Number.isFinite(record.temperature)).at(-1) ?? null;
  const firstCo2Record = records.find((record) => getCo2Observation(record) !== null) ?? null;
  const lastCo2Record = records.filter((record) => getCo2Observation(record) !== null).at(-1) ?? null;
  const firstSeaLevelRecord = records.find((record) => Number.isFinite(record.seaLevelSmoothedCm)) ?? null;
  const lastSeaLevelRecord = records.filter((record) => Number.isFinite(record.seaLevelSmoothedCm)).at(-1) ?? null;
  const temperatureDelta = Number.isFinite(currentRecord?.temperature) && Number.isFinite(previousRecord?.temperature)
    ? currentRecord.temperature - previousRecord.temperature
    : null;
  const temperatureFrequency = mapTemperatureToFrequency(currentRecord?.temperature);
  const selectedCo2 = getCo2Observation(currentRecord);
  const co2Timbre = mapCo2ToTimbre(selectedCo2);
  const seaLevelAvailable = Number.isFinite(currentRecord?.seaLevelSmoothedCm)
    && Number.isFinite(currentRecord?.seaLevelPitchHz);
  const seaLevelPitchHz = currentRecord?.seaLevelPitchHz ?? null;
  const temperatureData = records;
  const co2Data = useMemo(
    () => records.map((record) => ({
      ...record,
      chartCo2: record.co2,
    })),
    [records],
  );
  const seaLevelChartData = useMemo(
    () => seaLevelRecords.map((record) => ({
      ...record,
      rawGmslCm: record.gmslCm,
      smoothedGmslCm: record.smoothedCm,
    })),
    [seaLevelRecords],
  );
  const firstDate = records[0]?.dateKey ?? '';
  const latestDate = records.at(-1)?.dateKey ?? '';
  const firstCo2Index = records.findIndex((record) => record.co2 !== null);
  const co2StartPercent = firstCo2Index > 0
    ? `${(firstCo2Index / (records.length - 1)) * 100}%`
    : '0%';
  const firstSeaLevelIndex = records.findIndex((record) => Number.isFinite(record.seaLevelSmoothedCm));
  const seaLevelStartPercent = firstSeaLevelIndex > 0
    ? `${(firstSeaLevelIndex / (records.length - 1)) * 100}%`
    : '0%';
  const selectedDate = currentRecord?.dateKey ?? firstDate;
  const temperatureAvailable = Number.isFinite(currentRecord?.temperature);
  const co2Available = getCo2Observation(currentRecord) !== null;
  const modeAvailability = getSonificationAvailability(currentRecord, sonificationMode);
  const modeUnavailableReason = getModeUnavailableReason(
    sonificationMode,
    currentRecord,
    firstCo2Record,
    lastCo2Record,
    firstSeaLevelRecord,
    lastSeaLevelRecord,
    seaLevelError,
  );
  const thermalFrame = getThermalDisplayFrameForDate(selectedDate);
  const temperatureGlow = Math.min(1, Math.max(0, ((currentRecord?.temperature ?? 0) + 1.2) / 2.5));
  const dateValue = selectedDate.slice(0, 7);
  const playingStatus = !modeAvailability.available
    ? modeUnavailableReason
    : isPlaying
      ? sonificationMode === 'combined'
        ? 'Temperature + CO₂ active'
        : sonificationMode === 'co2'
          ? 'CO₂ sonification active'
          : sonificationMode === 'sea-level' ? 'Sea-level sonification active' : 'Temperature sonification active'
    : hasStopped
      ? 'Stopped at selected month'
      : audioReady ? 'Audio ready · paused' : 'Audio starts on interaction';

  useEffect(() => {
    if (!records.length || !isPlaying) return undefined;
    const timerId = window.setInterval(() => {
      setCurrentIndex((index) => {
        const nextIndex = index + 1;
        if (nextIndex >= records.length) {
          setIsPlaying(false);
          setHasStopped(true);
          audioEngine.stop();
          return records.length - 1;
        }
        return nextIndex;
      });
    }, 1000 / playbackSpeed);

    return () => window.clearInterval(timerId);
  }, [audioEngine, isPlaying, playbackSpeed, records]);

  useEffect(() => {
    if (isPlaying && currentRecord) {
      audioEngine.updateFromReading(currentRecord, { mode: sonificationMode });
    }
  }, [audioEngine, currentRecord, isPlaying, sonificationMode]);

  useEffect(() => {
    audioEngine.setVolume(volume);
  }, [audioEngine, volume]);

  const setDateKey = useCallback((dateKey) => {
    const record = getRecordByDateKey(dateKey, records);
    if (!record) return;
    const index = records.findIndex((item) => item.dateKey === record.dateKey);
    setCurrentIndex(index);
    setIsPlaying(false);
    setHasStopped(true);
    audioEngine.stop();
  }, [audioEngine, records]);

  const startPlayback = async (
    record = currentRecord,
    mode = sonificationMode,
  ) => {
    const availability = getSonificationAvailability(record, mode);
    if (!availability.available) {
      setAudioError(getModeUnavailableReason(
        mode,
        record,
        firstCo2Record,
        lastCo2Record,
        firstSeaLevelRecord,
        lastSeaLevelRecord,
        seaLevelError,
      ));
      return false;
    }

    setAudioError('');
    try {
      const started = await audioEngine.start();
      if (!started) {
        setAudioError('This browser does not support Web Audio. You can still explore the timeline and charts.');
        return false;
      }
      setAudioReady(true);
      setHasStopped(false);
      setIsPlaying(true);
      return true;
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : 'The audio engine could not start.');
      return false;
    }
  };

  const pausePlayback = useCallback(() => {
    audioEngine.pause();
    setIsPlaying(false);
  }, [audioEngine]);

  const stopPlayback = useCallback(() => {
    audioEngine.stop();
    setIsPlaying(false);
    setHasStopped(true);
  }, [audioEngine]);

  const selectSonificationMode = (mode) => {
    if (!SONIFICATION_MODES.includes(mode)) return;
    const firstAvailableIndex = mode === 'temperature'
      ? -1
      : getFirstAvailableRecordIndex(records, mode);
    const targetIndex = firstAvailableIndex >= 0 ? firstAvailableIndex : currentIndex;
    const targetRecord = records[targetIndex] ?? null;

    setSonificationMode(mode);
    setAudioError('');
    if (firstAvailableIndex >= 0) setCurrentIndex(firstAvailableIndex);

    if (isPlaying && !getSonificationAvailability(targetRecord, mode).available) {
      audioEngine.stop();
      setIsPlaying(false);
      setHasStopped(true);
    }
    return targetRecord;
  };

  const selectEarthView = (view) => {
    if (view === 'satellite' || view === 'thermal') setEarthView(view);
  };

  const changeDate = (nextIndex) => {
    const safeIndex = Math.max(0, Math.min(records.length - 1, nextIndex));
    setCurrentIndex(safeIndex);
    setIsPlaying(false);
    setHasStopped(true);
    audioEngine.stop();
  };

  const changeEarthDistance = (value) => {
    if (value === 'toggle-rotation') {
      setAutoRotate((current) => !current);
    } else if (value === 'reset') {
      setEarthDistance(5.4);
      setAutoRotate(true);
    } else {
      setEarthDistance(value);
    }
  };

  const prepareVoiceAudio = async () => {
    if (isPlaying) return true;
    try {
      const prepared = await audioEngine.unlockForVoiceControl();
      if (prepared) {
        setAudioReady(true);
      } else {
        setAudioError('This browser does not support Web Audio. Voice commands can still control the visualizations.');
      }
      return prepared;
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : 'Audio could not be prepared for voice playback.');
      throw error;
    }
  };

  const handleVoiceCommand = async (command) => {
    const result = await executeVoiceCommand(command, {
      actions: {
        selectView: selectEarthView,
        selectMode: selectSonificationMode,
        startPlayback,
        pausePlayback,
        stopPlayback,
        setDateKey,
        setPlaybackSpeed,
      },
      currentRecord,
      firstTemperatureRecord,
      lastTemperatureRecord,
      playbackPaces: PLAYBACK_PACES,
      playbackSpeed,
      records,
      sonificationMode,
      getUnavailableReason: (mode, record) => getModeUnavailableReason(
        mode,
        record,
        firstCo2Record,
        lastCo2Record,
        firstSeaLevelRecord,
        lastSeaLevelRecord,
        seaLevelError,
      ),
    });

    const playbackRequested = command.type === 'PLAY'
      || command.type === 'RESUME'
      || (command.type === 'SET_SONIFICATION' && command.play);
    if (!isPlaying && (!playbackRequested || !result.ok)) audioEngine.pause();
    return result;
  };

  const startGuidedDemo = async () => {
    const step = DEMO_STEPS[0];
    const record = getDemoRecord(step.dateKey, records);
    if (!record) {
      setAudioError('No valid temperature observation is available for the guided listen.');
      return;
    }
    setGuideStep(0);
    selectSonificationMode(step.mode);
    setDateKey(record.dateKey);
    await startPlayback(record, step.mode);
  };

  const advanceGuidedDemo = async () => {
    const nextStep = guideStep + 1;
    if (nextStep >= DEMO_STEPS.length) {
      setGuideStep(-1);
      return;
    }
    const step = DEMO_STEPS[nextStep];
    const record = getDemoRecord(step.dateKey, records);
    if (!record) {
      setAudioError(`No valid observation is available for the ${step.title.toLowerCase()} step.`);
      setGuideStep(-1);
      return;
    }
    setGuideStep(nextStep);
    selectSonificationMode(step.mode);
    setDateKey(record.dateKey);
    await startPlayback(record, step.mode);
  };

  const worldViewDate = `${selectedDate}-15`;
  const worldViewUrl = `https://worldview.earthdata.nasa.gov/?v=-180,-90,180,90&t=${worldViewDate}`;

  if (loading) {
    return (
      <main className="loading-screen">
        <div className="loading-orbit" aria-hidden="true" />
        <p>Loading Earth observations</p>
        <span>NASA GISTEMP · NOAA GML</span>
      </main>
    );
  }

  if (loadError || !records.length) {
    return (
      <main className="error-screen">
        <p className="eyebrow">DATA CONNECTION</p>
        <h1>Earth observations are unavailable</h1>
        <p>{loadError || 'The supplied datasets did not contain monthly observations.'}</p>
        <button type="button" className="button button-outline" onClick={() => window.location.reload()}>Retry data load</button>
      </main>
    );
  }

  return (
    <main className="experience-shell">
      <header className="topbar">
        <a className="brand" href="#experience" aria-label="Earth Jukebox home">
          <span className="brand-symbol" aria-hidden="true"><i /><i /><i /></span>
          <span className="brand-name">EARTH <b>JUKEBOX</b><small>NASA SPACE APPS · 2026</small></span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a className="active" href="#experience">Experience</a>
          <a href="#how-it-works">How it works</a>
          <a href="#sources">Data &amp; sources</a>
        </nav>
        <div className={`engine-indicator ${isPlaying ? 'is-playing' : ''}`} aria-live="polite">
          <span className="engine-dot" />
          {isPlaying ? 'PLAYING' : 'STANDBY'}
        </div>
        <VoiceControl onCommand={handleVoiceCommand} onBeforeListening={prepareVoiceAudio} />
      </header>

      <section id="experience" className="hero-section">
        <div className="hero-heading">
          <div>
            <p className="eyebrow">A LISTENING INSTRUMENT FOR OUR LIVING PLANET</p>
            <h1>Earth, <span className="hero-emphasis">in another register.</span></h1>
          </div>
          <div className="hero-intro">
            <span>01 — 03 / SHARED MONTHLY TIMELINE</span>
            <p>Move through a century of climate measurements. See the date move. Hear the data change.</p>
          </div>
        </div>

        <div className="experience-grid">
          <aside className="context-column">
            <div className="section-index">THE RECORD <span>01</span></div>
            <p className="context-lead">A long view of a changing climate system.</p>
            <p className="context-copy">NASA temperature and sea-level observations, alongside atmospheric CO₂ from NOAA&apos;s Mauna Loa record, share one timeline.</p>
            <div className="context-rule" />
            <div className="period-stat">
              <span>OBSERVATION WINDOW</span>
              <strong>{firstTemperatureRecord?.year} <i>—</i> {lastTemperatureRecord?.year}</strong>
            </div>
            <div className="availability-list">
              <div><span className="legend-line temperature-line" /> Temperature <small>NASA GISS · {formatMonth(firstTemperatureRecord)} onward</small></div>
              <div><span className="legend-line co2-line" /> Atmospheric CO₂ <small>NOAA GML · {formatMonth(firstCo2Record)} onward</small></div>
              <div><span className="legend-line sea-level-line" /> Global mean sea level <small>NASA PO.DAAC · {formatMonth(firstSeaLevelRecord)} onward</small></div>
            </div>
            <div className="context-note">
              <span className="note-mark">i</span>
              <p>Sea level is a global mean, not a local coastline measurement. Only the NASA thermal map shows gridded geographic anomalies.</p>
            </div>
          </aside>

          <section id="earth-view" className="earth-column" aria-label="Earth visualization" tabIndex={-1}>
            <div className="earth-heading">
              <span className="eyebrow">EARTH VIEW</span>
              <div className="earth-heading-tools">
                <div className="earth-view-toggle" role="group" aria-label="Earth visualization">
                  <button
                    type="button"
                    className={earthView === 'satellite' ? 'selected' : ''}
                    aria-pressed={earthView === 'satellite'}
                    onClick={() => selectEarthView('satellite')}
                  >
                    Satellite
                  </button>
                  <button
                    type="button"
                    className={earthView === 'thermal' ? 'selected' : ''}
                    aria-pressed={earthView === 'thermal'}
                    onClick={() => selectEarthView('thermal')}
                  >
                    Thermal
                  </button>
                </div>
                <a href={worldViewUrl} target="_blank" rel="noreferrer">NASA WORLDVIEW ↗</a>
              </div>
            </div>
            <EarthScene
              activeGlow={temperatureGlow}
              playing={isPlaying}
              autoRotate={autoRotate}
              distance={earthDistance}
              viewMode={earthView}
              frameIndex={earthView === 'thermal' ? thermalFrame?.frameIndex ?? null : null}
              frameDate={thermalFrame?.frameDate ?? ''}
              framePosition={thermalFrame ? `${thermalFrame.frameInYear}/${thermalFrame.framesInYear}` : ''}
              frameIsNearest={thermalFrame?.isNearest ?? false}
              selectedDate={selectedDate}
              onDistanceChange={changeEarthDistance}
            />
            <div className="earth-footnote">
              <span>{earthView === 'thermal' ? 'NASA GISTEMP · 24-MONTH RUNNING MEAN' : 'CONTEXTUAL SATELLITE TEXTURE'}</span>
              <span><button type="button" onClick={() => setShowSources(true)}>visual notes</button></span>
            </div>
            <section id="timeline-controls" className="transport transport-instrument" aria-label="Shared playback timeline and controls" tabIndex={-1}>
              <div className="transport-top">
                <div className="transport-date">
                  <span className="transport-kicker">SHARED TIMELINE</span>
                  <strong>{formatMonth(currentRecord)}</strong>
                </div>
                <div className="transport-controls">
                  <button type="button" className="transport-skip" aria-label="Previous month" title="Previous month" onClick={() => changeDate(currentIndex - 1)} disabled={currentIndex === 0}><Glyph>−|</Glyph></button>
                  <button
                    type="button"
                    className="transport-play"
                    aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
                    onClick={isPlaying ? pausePlayback : () => startPlayback()}
                    disabled={!isPlaying && !modeAvailability.available}
                  >
                    <Glyph>{isPlaying ? 'Ⅱ' : '▶'}</Glyph>
                  </button>
                  <button type="button" className="transport-skip" aria-label="Stop playback" title="Stop" onClick={stopPlayback}><Glyph>■</Glyph></button>
                  <button type="button" className="transport-skip" aria-label="Next month" title="Next month" onClick={() => changeDate(currentIndex + 1)} disabled={currentIndex >= records.length - 1}><Glyph>|+</Glyph></button>
                </div>
                <div className="transport-options">
                  <label htmlFor="playback-speed">PACE</label>
                  <select id="playback-speed" value={playbackSpeed} onChange={(event) => setPlaybackSpeed(Number(event.target.value))}>
                    {PLAYBACK_PACES.map(({ monthsPerSecond, label }) => (
                      <option key={monthsPerSecond} value={monthsPerSecond}>{label}</option>
                    ))}
                  </select>
                  <span className={`audio-status ${isPlaying ? 'is-playing' : ''}`} aria-live="polite">{playingStatus}</span>
                </div>
              </div>

              <div className="timeline-control">
                <div className="timeline-rail" style={{ '--co2-start': co2StartPercent, '--sea-level-start': seaLevelStartPercent }}>
                  <span className="timeline-temperature-band" />
                  <span className="timeline-co2-band" />
                  <span className="timeline-sea-level-band" />
                  <input
                    type="range"
                    min="0"
                    max={records.length - 1}
                    value={currentIndex}
                    aria-label="Select a month in the shared historical timeline"
                    aria-valuetext={formatMonth(currentRecord)}
                    onChange={(event) => changeDate(Number(event.target.value))}
                    style={{ '--timeline-progress': `${records.length > 1 ? (currentIndex / (records.length - 1)) * 100 : 0}%` }}
                  />
                </div>
                <div className="timeline-labels"><span>{records[0].dateKey}</span><span>{latestDate}</span></div>
              </div>

              <div className="transport-bottom">
                <div className="timeline-legend">
                  <span><i className="temperature-line" /> Temperature</span>
                  <span><i className="co2-line" /> CO₂ · from {firstCo2Record?.dateKey}</span>
                  <span><i className="sea-level-line" /> Sea level · from {firstSeaLevelRecord?.dateKey}</span>
                </div>
                <div className="audio-mix">
                  <div className="mix-toggle" role="group" aria-label="Sonification mode">
                    <button
                      type="button"
                      className={sonificationMode === 'temperature' ? 'selected' : ''}
                      aria-pressed={sonificationMode === 'temperature'}
                      onClick={() => selectSonificationMode('temperature')}
                    >
                      Temperature
                    </button>
                    <button
                      type="button"
                      className={sonificationMode === 'co2' ? 'selected' : ''}
                      aria-pressed={sonificationMode === 'co2'}
                      onClick={() => selectSonificationMode('co2')}
                    >
                      CO₂
                    </button>
                    <button
                      type="button"
                      className={sonificationMode === 'sea-level' ? 'selected' : ''}
                      aria-pressed={sonificationMode === 'sea-level'}
                      onClick={() => selectSonificationMode('sea-level')}
                    >
                      Sea Level
                    </button>
                    <button
                      type="button"
                      className={sonificationMode === 'combined' ? 'selected' : ''}
                      aria-pressed={sonificationMode === 'combined'}
                      onClick={() => selectSonificationMode('combined')}
                    >
                      Temperature + CO₂
                    </button>
                  </div>
                  <p className={`mode-availability ${modeAvailability.available ? '' : 'is-unavailable'}`} aria-live="polite">
                    {modeAvailability.available
                      ? sonificationMode === 'temperature'
                        ? 'Anomaly → pitch'
                        : sonificationMode === 'co2'
                          ? 'CO₂ concentration → harmonic frequency + strength'
                          : sonificationMode === 'sea-level'
                            ? '60-day-smoothed GMSL → pitch'
                            : 'Temperature → pitch · CO₂ → harmonic texture'
                      : modeUnavailableReason}
                  </p>
                  <label className="volume-control">
                    <span aria-hidden="true">VOL</span>
                    <input aria-label="Audio volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
                  </label>
                  <Waveform engine={audioEngine} active={isPlaying} />
                </div>
              </div>
              {audioError && <p className="inline-error" role="status">{audioError}</p>}
            </section>
          </section>

          <aside id="selected-observation" className="measure-column" tabIndex={-1}>
            <div className="section-index">SELECTED OBSERVATION <span>02</span></div>
            <div className="selected-date">
              <span>{currentRecord.monthLabel.toUpperCase()}</span>
              <strong>{currentRecord.year}</strong>
              <div className="date-picker-wrap">
                <label htmlFor="selected-month">Choose month</label>
                <input
                  id="selected-month"
                  type="month"
                  value={dateValue}
                  min={firstDate}
                  max={latestDate}
                  onChange={(event) => {
                    if (event.target.value) setDateKey(event.target.value);
                  }}
                />
              </div>
            </div>

            <div className="measurement-block temp-measurement">
              <div className="measurement-label">
                <span className="variable-symbol">T</span>
                <span>GLOBAL TEMPERATURE ANOMALY</span>
              </div>
              {temperatureAvailable ? (
                <>
                  <div className="measurement-value">{formatNumber(currentRecord.temperature)}<small>°C</small></div>
                  <div className="measurement-subline">
                    <span>NASA GISTEMP</span>
                    <span className={temperatureDelta === null ? '' : temperatureDelta > 0 ? 'change-up' : 'change-down'}>
                      {temperatureDelta === null ? 'NO PRIOR MONTH' : `${temperatureDelta > 0 ? '+' : ''}${formatNumber(temperatureDelta)}° THIS MONTH`}
                    </span>
                  </div>
                </>
              ) : (
                <div className="measurement-unavailable">No temperature observation for this month</div>
              )}
            </div>

            <div className="measurement-block co2-measurement">
              <div className="measurement-label">
                <span className="variable-symbol">CO₂</span>
                <span>ATMOSPHERIC CONCENTRATION</span>
              </div>
              {co2Available ? (
                <>
                  <div className="measurement-value">{formatNumber(selectedCo2, 1)}<small>ppm</small></div>
                  <div className="measurement-subline">
                    <span>NOAA MAUNA LOA</span>
                    <span>{Number.isFinite(currentRecord.co2MonthlyAverage) ? 'MONTHLY MEAN' : 'DESEASONALIZED'}</span>
                  </div>
                </>
              ) : (
                <div className="measurement-unavailable">Not available in the supplied record</div>
              )}
            </div>

            <div className="measurement-block sea-level-measurement">
              <div className="measurement-label">
                <span className="variable-symbol">SL</span>
                <span>GLOBAL MEAN SEA LEVEL</span>
              </div>
              {seaLevelAvailable ? (
                <>
                  <div className="measurement-value">
                    {formatNumber(currentRecord.seaLevelSmoothedCm)}<small>cm</small>
                  </div>
                  <div className="measurement-subline">
                    <span>NASA PO.DAAC · 60-DAY SMOOTHED</span>
                    <span>RAW {formatNumber(currentRecord.seaLevelCm)} cm</span>
                  </div>
                  <div className="measurement-subline sea-level-match">
                    <span>1993 MEAN REFERENCE</span>
                    <span>
                      {currentRecord.seaLevelMatchType === 'nearest'
                        ? `NEAREST · ${currentRecord.seaLevelDateKey}`
                        : currentRecord.seaLevelMatchType === 'observed'
                          ? `OBSERVED · ${currentRecord.seaLevelDateKey}`
                          : 'INTERPOLATED FROM WEEKLY DATA'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="measurement-unavailable">
                  {seaLevelError || 'Not available for this month in the supplied record'}
                </div>
              )}
            </div>

            <div className="measurement-block signal-measurement temperature-signal">
              <div className="measurement-label">
                <span className="variable-symbol signal-symbol" aria-hidden="true">♮</span>
                <span>TEMPERATURE PITCH</span>
              </div>
              <div className="signal-value-line">
                {temperatureAvailable ? (
                  <strong className="signal-value">{temperatureFrequency.toFixed(0)}<small>Hz</small></strong>
                ) : (
                  <strong className="signal-value is-unavailable">Unavailable</strong>
                )}
                <div className="signal-reference">
                  <strong>440 Hz</strong>
                </div>
              </div>
              <div className="signal-subline">
                <span>MAPPED SOUND OUTPUT</span>
                <span>A4 REFERENCE</span>
              </div>
            </div>

            <div className="measurement-block signal-measurement co2-signal">
              <div className="measurement-label">
                <span className="variable-symbol signal-symbol" aria-hidden="true">
                  <svg viewBox="0 0 32 24" fill="none" focusable="false">
                    <path d="M1 12c4-8 7-8 11 0s7 8 11 0 5-6 8 0" />
                    <path d="M1 12c4 5 7 5 11 0s7-5 11 0 5 4 8 0" />
                  </svg>
                </span>
                <span>CO₂ HARMONIC TEXTURE</span>
              </div>
              <div className="signal-value-line">
                {co2Available ? (
                  <strong className="signal-value">{Math.round(co2Timbre * 100)}<small>%</small></strong>
                ) : (
                  <strong className="signal-value is-unavailable">Unavailable</strong>
                )}
              </div>
              <div className="signal-subline">
                <span>HARMONIC DENSITY</span>
                <span>OVERTONE SERIES</span>
              </div>
            </div>

            <div className="measurement-block signal-measurement sea-level-signal">
              <div className="measurement-label">
                <span className="variable-symbol signal-symbol" aria-hidden="true">SL</span>
                <span>SEA LEVEL PITCH</span>
              </div>
              <div className="signal-value-line">
                {seaLevelAvailable ? (
                  <strong className="signal-value">{seaLevelPitchHz.toFixed(0)}<small>Hz</small></strong>
                ) : (
                  <strong className="signal-value is-unavailable">Unavailable</strong>
                )}
              </div>
              <div className="signal-subline">
                <span>60-DAY SMOOTHED GMSL</span>
                <span>110 — 440 Hz</span>
              </div>
            </div>
          </aside>
        </div>

      </section>

      <section className="charts-section" aria-labelledby="history-heading">
        <div className="section-header">
          <div>
            <p className="eyebrow">THE HISTORICAL SIGNAL</p>
            <h2 id="history-heading">Three records. One shared cursor.</h2>
          </div>
          <p>Choose any point on a chart to move the experience to that month.</p>
        </div>
        <div className="charts-grid">
          <ChartPanel
            title="Global temperature anomaly"
            subtitle="Monthly departure from the 1951–1980 mean · °C anomaly"
            color="#e5b874"
            data={temperatureData}
            dataKey="temperature"
            selectedDate={temperatureAvailable ? selectedDate : null}
            coverageStart={firstTemperatureRecord?.dateKey}
            unit="°C anomaly"
            yDomain={[-1, 2]}
            selectedValue={temperatureAvailable ? currentRecord.temperature : null}
            onSelectDate={setDateKey}
          />
          <ChartPanel
            title="Atmospheric CO₂"
            subtitle="Monthly mean from NOAA's Mauna Loa series"
            color="#7ab9d4"
            data={co2Data}
            dataKey="chartCo2"
            selectedDate={co2Available ? selectedDate : null}
            coverageStart={firstCo2Record?.dateKey}
            unit="ppm"
            yDomain={[300, 450]}
            selectedValue={co2Available ? selectedCo2 : null}
            onSelectDate={setDateKey}
          />
          <ChartPanel
            title="Global mean sea level"
            subtitle="Weekly altimeter observations · 60-day smoothed · 1993 mean reference"
            color={SEA_LEVEL_COLOR}
            data={seaLevelChartData}
            dataKey="smoothedGmslCm"
            secondaryDataKey="rawGmslCm"
            secondaryLabel="Weekly raw estimate"
            secondaryColor="#6c9895"
            selectedDate={seaLevelAvailable
              ? getSeaLevelMonthTimestamp(currentRecord.year, currentRecord.month)
              : null}
            coverageStart={seaLevelRecords[0]?.dateKey ?? 'No valid weekly observations'}
            unit="cm"
            yDomain={[-1, 12]}
            selectedValue={seaLevelAvailable ? currentRecord.seaLevelSmoothedCm : null}
            onSelectDate={setDateKey}
            timeSeries
            sourceLabel="NASA/JPL PO.DAAC"
          />
        </div>
      </section>

      <section id="how-it-works" className="story-section" tabIndex={-1}>
        <div className="story-heading">
          <p className="eyebrow">FROM MEASUREMENT TO MUSIC</p>
          <h2>Listen to the numbers,<br /><em>not a recording of Earth.</em></h2>
          <p>Choose temperature, CO₂, sea level, or both. Each mode synthesizes its own signal from the selected month in your browser.</p>
          <button type="button" className="button button-outline" onClick={startGuidedDemo}>Start the guided listen <span aria-hidden="true">↗</span></button>
        </div>
        <div className="sonification-explainer">
          <div className="pipeline-strip" aria-label="NASA, NOAA and PO.DAAC observations are aligned by month, visualized and sonified">
            <span>NASA + NOAA DATA</span><i>→</i><span>MONTHLY ALIGNMENT</span><i>→</i><span>VISUAL + AUDIO</span>
          </div>
          <div className="mapping-flow">
            <article className="mapping-step">
              <span className="step-index">01 / PRIMARY SIGNAL</span>
              <div className="mapping-node temp-node">T</div>
              <h3>Temperature anomaly</h3>
              <p>A monthly global departure from the NASA GISTEMP 1951–1980 mean. Higher anomalies map to a higher oscillator pitch.</p>
              <div className="mapping-arrow"><span>AMPLITUDE RANGE</span><strong>110 — 440 Hz</strong></div>
            </article>
            <div className="flow-connector" aria-hidden="true">→</div>
            <article className="mapping-step">
              <span className="step-index">02 / INDEPENDENT SIGNAL</span>
              <div className="mapping-node co2-node">CO₂</div>
              <h3>Atmospheric concentration</h3>
              <p>NOAA concentration controls harmonic frequency and strength in its own mode, or timbre in the combined mode.</p>
              <div className="mapping-arrow"><span>OBSERVED RANGE</span><strong>300 — 450 ppm</strong></div>
            </article>
            <div className="flow-connector" aria-hidden="true">→</div>
            <article className="mapping-step">
              <span className="step-index">03 / INDEPENDENT SIGNAL</span>
              <div className="mapping-node sea-level-node">SL</div>
              <h3>Global mean sea level</h3>
              <p>NASA PO.DAAC weekly readings use the supplied 60-day-smoothed series. Adjacent readings align to each month without extrapolating beyond coverage.</p>
              <div className="mapping-arrow">
                <span>OBSERVED RANGE · CM</span>
                <strong>
                  {seaLevelReport
                    ? `${formatNumber(seaLevelReport.smoothedMinCm)} — ${formatNumber(seaLevelReport.smoothedMaxCm)}`
                    : 'Unavailable'}
                </strong>
                <small>LINEARLY MAPPED TO 110 — 440 Hz</small>
              </div>
            </article>
            <div className="flow-connector" aria-hidden="true">→</div>
            <article className="mapping-step output-step">
              <span className="step-index">04 / AUDITORY RESPONSE</span>
              <div className="mapping-node sound-node"><span /><span /><span /><span /><span /></div>
              <h3>Sound, generated live</h3>
              <p>Each mode requires its own valid observation. Combined temperature + CO₂ retains its original pitch and harmonic mapping.</p>
              <div className="mapping-arrow"><span>OUTPUT</span><strong>Web Audio synthesis</strong></div>
            </article>
          </div>
        </div>
      </section>

      <section id="sources" className="sources-section">
        <div className="sources-heading">
          <div>
            <p className="eyebrow">TRANSPARENCY &amp; PROVENANCE</p>
            <h2>Follow the evidence.</h2>
          </div>
          <button type="button" className="text-button" onClick={() => setShowSources(true)}>Visual asset notes <span aria-hidden="true">↗</span></button>
        </div>
        <div className="source-list">
          <a href="https://data.giss.nasa.gov/gistemp/" target="_blank" rel="noreferrer" className="source-row">
            <span className="source-provider">NASA GISS</span>
            <span><strong>GISTEMP global monthly temperature anomalies</strong><small>Supplied local JSON · {firstTemperatureRecord?.dateKey} to {lastTemperatureRecord?.dateKey} · °C anomaly</small></span>
            <span aria-hidden="true">↗</span>
          </a>
          <a href="https://gml.noaa.gov/ccgg/trends/" target="_blank" rel="noreferrer" className="source-row">
            <span className="source-provider">NOAA GML</span>
            <span><strong>Mauna Loa atmospheric CO₂ measurements</strong><small>Supplied local JSON · {firstCo2Record?.dateKey} to {lastCo2Record?.dateKey} · monthly mean in ppm</small></span>
            <span aria-hidden="true">↗</span>
          </a>
          <a href="https://podaac.jpl.nasa.gov/dataset/NASA_SSH_GMSL_INDICATOR" target="_blank" rel="noreferrer" className="source-row">
            <span className="source-provider">NASA PO.DAAC</span>
            <span>
              <strong>Global mean sea level indicator · DOI 10.5067/NSIND-GMSV1</strong>
              <small>
                Supplied <code>/sea_level.json</code> · {seaLevelRecords[0]?.dateKey ?? 'no valid records'} to {seaLevelRecords.at(-1)?.dateKey ?? 'no valid records'} · weekly cm readings · 1993 mean reference · not adjusted for GIA
              </small>
              <small>
                {seaLevelReport
                  ? `Local audit: ${seaLevelReport.validRecords}/${seaLevelReport.totalRecords} valid rows; ${seaLevelReport.rejectedRecords.length} rejected. `
                  : 'Local data audit unavailable. '}
                Latest rounded indicator comparison agrees; full historical numerical verification is incomplete.
              </small>
            </span>
            <span aria-hidden="true">↗</span>
          </a>
          <a href="https://svs.gsfc.nasa.gov/5450/" target="_blank" rel="noreferrer" className="source-row">
            <span className="source-provider">NASA SVS</span>
            <span><strong>Global Temperature Anomalies from 1880 to 2024</strong><small>Geographic anomaly maps · 1951–1980 baseline · 24-month running mean</small></span>
            <span aria-hidden="true">↗</span>
          </a>
          <a href="https://worldview.earthdata.nasa.gov/" target="_blank" rel="noreferrer" className="source-row">
            <span className="source-provider">NASA EOSDIS</span>
            <span><strong>Worldview satellite imagery</strong><small>Live, contextual imagery · layer coverage varies by date · not a climate-data map</small></span>
            <span aria-hidden="true">↗</span>
          </a>
          <a href="https://earth.gov/" target="_blank" rel="noreferrer" className="source-row">
            <span className="source-provider">NASA EIC</span>
            <span><strong>Earth Information Center</strong><small>Official Earth information and visualization resources</small></span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
        {seaLevelReport?.metadataWarnings.length > 0 && (
          <p className="source-audit-note" role="note">
            Sea-level metadata needs a version check: the supplied product field cites {seaLevelMetadata?.source_dataset ?? 'an upstream source'}, while its citation field reports a different version. The supplied JSON is unchanged; see <code>SEA_LEVEL_VALIDATION.md</code> for the audit and comparison limits.
          </p>
        )}
      </section>

      <footer className="site-footer">
        <span>EARTH JUKEBOX <i>·</i> NASA SPACE APPS 2026</span>
        <span>Measurements in context. Sound by synthesis.</span>
        <button type="button" onClick={() => setShowSources(true)}>Sources &amp; credits</button>
      </footer>

      {guideStep >= 0 && (
        <div className="modal-backdrop" role="presentation">
          <section className="guided-modal" role="dialog" aria-modal="true" aria-labelledby="guided-title">
            <button type="button" className="modal-close" aria-label="Close guided demonstration" onClick={() => setGuideStep(-1)}>×</button>
            <p className="eyebrow">GUIDED LISTEN · {String(guideStep + 1).padStart(2, '0')} / {String(DEMO_STEPS.length).padStart(2, '0')}</p>
            <div className="guided-progress"><span style={{ width: `${((guideStep + 1) / DEMO_STEPS.length) * 100}%` }} /></div>
            <h2 id="guided-title">{DEMO_STEPS[guideStep].title}</h2>
            <p>{DEMO_STEPS[guideStep].copy}</p>
            <div className="guided-date"><span>SHARED TIMELINE</span><strong>{formatMonth(currentRecord)}</strong></div>
            <button type="button" className="button button-primary" onClick={advanceGuidedDemo}>
              {guideStep === DEMO_STEPS.length - 1 ? 'Finish guided listen' : 'Continue'} <span aria-hidden="true">→</span>
            </button>
          </section>
        </div>
      )}

      {showSources && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowSources(false);
        }}>
          <section className="guided-modal credits-modal" role="dialog" aria-modal="true" aria-labelledby="credits-title">
            <button type="button" className="modal-close" aria-label="Close visual notes" onClick={() => setShowSources(false)}>×</button>
            <p className="eyebrow">VISUAL PROVENANCE</p>
            <h2 id="credits-title">Two views, clearly sourced.</h2>
            <p>Satellite View uses the Three.js examples Earth texture as contextual imagery. Thermal View uses NASA SVS 5450 equirectangular GISTEMP anomaly maps (1951–1980 baseline, 24-month running mean); it displays the nearest available source frame for the selected year, not a pixel-level observation from the supplied monthly global-average value.</p>
            <p>NASA SVS credits data provided by Robert B. Schmunk (NASA/GSFC GISS), visualization by Mark SubbaRao (NASA/GSFC), and scientific consulting by Gavin A. Schmidt (NASA/GSFC GISS). Its map frames cover 1881–2024; outside that range the contextual satellite texture remains visible.</p>
            <p>NASA Worldview is not embedded here because its security policy disallows framing on this site. Use the date-linked viewer to open NASA imagery directly; its layer and date coverage varies.</p>
            <a className="button button-outline" href={worldViewUrl} target="_blank" rel="noreferrer">Open Worldview for {formatMonth(currentRecord)} ↗</a>
            <a className="button button-outline" href="https://svs.gsfc.nasa.gov/" target="_blank" rel="noreferrer">Browse NASA Scientific Visualization Studio ↗</a>
          </section>
        </div>
      )}
    </main>
  );
}
