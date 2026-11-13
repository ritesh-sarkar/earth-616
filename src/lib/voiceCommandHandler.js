import {
  getCo2Observation,
  getSonificationAvailability,
} from './climateData';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatMonth(record) {
  return record ? `${MONTH_NAMES[record.month - 1] ?? record.monthLabel} ${record.year}` : 'the selected month';
}

function getCo2Description(record) {
  if (Number.isFinite(record?.co2MonthlyAverage)) return 'monthly mean';
  if (Number.isFinite(record?.co2Deseasonalized)) return 'deseasonalized';
  return 'measured';
}

function createResponse(ok, message, speech = message) {
  return { ok, message, speech };
}

function explainSonification(subject, mode) {
  if (subject === 'current') {
    if (mode === 'sea-level') {
      return 'Sea-level sonification maps the supplied 60-day-smoothed global mean sea-level value to oscillator pitch. Weekly observations are boundedly interpolated to the shared monthly timeline; this is synthesized audio, not a recording of the ocean.';
    }
    if (mode === 'combined') {
      return 'Combined sonification maps temperature anomaly to the primary pitch and uses CO₂ concentration to shape the harmonic layer. This is a synthesized representation, not a recording of Earth.';
    }
    if (mode === 'co2') {
      return 'CO₂-only sonification uses concentration to change harmonic frequency and strength. This is a synthesized representation, not a recording of Earth.';
    }
    return 'Temperature sonification maps the global temperature anomaly to oscillator pitch. Higher anomalies produce higher pitches. This is a synthesized representation, not a recording of Earth.';
  }
  if (subject === 'temperature') {
    if (mode === 'co2') {
      return 'The current CO₂-only mode does not use temperature as a pitch input. Temperature is available as a separate sound mode.';
    }
    if (subject === 'sea-level') {
      return 'Sea-level mode maps the supplied 60-day-smoothed global mean sea-level value to oscillator pitch. It is an independent mode and does not change the existing temperature plus CO₂ mapping.';
    }
    return mode === 'combined'
      ? 'In combined mode, the temperature anomaly controls the primary oscillator pitch, while CO₂ shapes the harmonic layer. This is synthesized audio, not a recording of Earth.'
      : 'Temperature mode maps the global temperature anomaly to oscillator pitch. Higher anomalies produce higher pitches. This is synthesized audio, not a recording of Earth.';
  }
  if (mode === 'temperature') {
    return 'The current temperature-only mode does not sonify CO₂. CO₂ shapes the harmonic layer in combined mode and controls harmonic frequency and strength in CO₂-only mode.';
  }
  return mode === 'combined'
    ? 'In combined mode, temperature controls the primary pitch and CO₂ concentration shapes the harmonic layer frequency and strength. This is synthesized audio, not a recording of Earth.'
    : 'CO₂-only mode uses concentration to control harmonic frequency and strength. This is synthesized audio, not a recording of Earth.';
}

export async function executeVoiceCommand(command, context) {
  const {
    actions,
    currentRecord,
    firstTemperatureRecord,
    lastTemperatureRecord,
    playbackPaces,
    playbackSpeed,
    records,
    sonificationMode,
  } = context;

  if (command.type === 'SET_VIEW') {
    actions.selectView(command.value);
    return createResponse(true, `Showing ${command.value} view.`);
  }

  if (command.type === 'SET_SONIFICATION') {
    const targetRecord = actions.selectMode(command.value) ?? currentRecord;
    const availability = getSonificationAvailability(targetRecord, command.value);
    const modeName = command.value === 'co2'
      ? 'CO₂'
      : command.value === 'combined'
        ? 'combined'
        : command.value === 'sea-level' ? 'sea level' : 'temperature';

    if (!availability.available) {
      const reason = context.getUnavailableReason(command.value, targetRecord);
      return createResponse(false, `${modeName} mode is unavailable: ${reason}`);
    }

    const dateNote = targetRecord?.dateKey !== currentRecord?.dateKey
      ? ` The timeline moved to ${formatMonth(targetRecord)}, the first available observation.`
      : '';
    if (!command.play) {
      return createResponse(true, `Selected ${modeName} mode.${dateNote}`);
    }

    const started = await actions.startPlayback(targetRecord, command.value);
    return started
      ? createResponse(true, `Playing ${modeName} sonification for ${formatMonth(targetRecord)}.`)
      : createResponse(false, `Could not start ${modeName} sonification. ${context.getUnavailableReason(command.value, targetRecord)}`);
  }

  if (command.type === 'PLAY' || command.type === 'RESUME') {
    const started = await actions.startPlayback(currentRecord, sonificationMode);
    if (started) {
      return createResponse(true, command.type === 'RESUME' ? 'Playback resumed.' : 'Playback started.');
    }
    return createResponse(false, context.getUnavailableReason(sonificationMode, currentRecord));
  }

  if (command.type === 'PAUSE') {
    actions.pausePlayback();
    return createResponse(true, 'Playback paused.');
  }

  if (command.type === 'STOP') {
    actions.stopPlayback();
    return createResponse(true, 'Playback stopped.');
  }

  if (command.type === 'GO_TO_YEAR') {
    const firstYear = firstTemperatureRecord?.year;
    const lastYear = lastTemperatureRecord?.year;
    if (!Number.isInteger(command.value) || !Number.isInteger(firstYear) || !Number.isInteger(lastYear)
      || command.value < firstYear || command.value > lastYear) {
      return createResponse(
        false,
        `Temperature data is available from ${firstYear ?? 'an unknown year'} to ${lastYear ?? 'an unknown year'}.`,
      );
    }

    const yearRecords = records.filter((record) => record.year === command.value
      && Number.isFinite(record.temperature));
    if (!yearRecords.length) {
      return createResponse(false, `No valid temperature observation is available for ${command.value}.`);
    }

    const targetRecord = yearRecords.find((record) => record.month === currentRecord?.month) ?? yearRecords[0];
    actions.setDateKey(targetRecord.dateKey);
    const co2Note = getCo2Observation(targetRecord) === null
      ? ' CO₂ is unavailable for this period; temperature data remains available.'
      : '';
    return createResponse(true, `Moved the shared timeline to ${formatMonth(targetRecord)}.${co2Note}`);
  }

  if (command.type === 'SET_SPEED') {
    if (!playbackPaces?.length) {
      return createResponse(false, 'Playback speed controls are unavailable.');
    }

    if (!['faster', 'slower', 'normal'].includes(command.value)) {
      return createResponse(false, 'That playback speed command is not supported.');
    }

    const normalPace = playbackPaces.find((pace) => pace.monthsPerSecond === 1);
    const targetPace = command.value === 'normal'
      ? normalPace
      : command.value === 'faster'
        ? playbackPaces.find((pace) => pace.monthsPerSecond > playbackSpeed)
        : [...playbackPaces].reverse().find((pace) => pace.monthsPerSecond < playbackSpeed);

    if (!targetPace) {
      const limit = command.value === 'faster' ? 'maximum' : 'minimum';
      return createResponse(true, `Playback is already at its ${limit} speed.`);
    }

    actions.setPlaybackSpeed(targetPace.monthsPerSecond);
    return createResponse(true, `Playback speed set to ${targetPace.label}.`);
  }

  if (command.type === 'READ_TEMPERATURE') {
    if (!Number.isFinite(currentRecord?.temperature)) {
      return createResponse(false, `The temperature anomaly is unavailable for ${formatMonth(currentRecord)}.`);
    }
    return createResponse(
      true,
      `The global temperature anomaly for ${formatMonth(currentRecord)} is ${currentRecord.temperature.toFixed(2)} degrees Celsius relative to the 1951 to 1980 baseline.`,
    );
  }

  if (command.type === 'READ_CO2') {
    const value = getCo2Observation(currentRecord);
    if (value === null) {
      return createResponse(false, `The CO₂ concentration is unavailable for ${formatMonth(currentRecord)}.`);
    }
    return createResponse(
      true,
      `The NOAA ${getCo2Description(currentRecord)} CO₂ concentration for ${formatMonth(currentRecord)} is ${value.toFixed(1)} parts per million.`,
    );
  }

  if (command.type === 'READ_SEA_LEVEL') {
    if (!Number.isFinite(currentRecord?.seaLevelSmoothedCm)) {
      return createResponse(false, `Global mean sea level is unavailable for ${formatMonth(currentRecord)}.`);
    }
    const rawValue = Number.isFinite(currentRecord.seaLevelCm)
      ? ` The raw estimate is ${currentRecord.seaLevelCm.toFixed(2)} centimeters.`
      : '';
    return createResponse(
      true,
      `The 60-day-smoothed global mean sea level for ${formatMonth(currentRecord)} is ${currentRecord.seaLevelSmoothedCm.toFixed(2)} centimeters relative to the 1993 mean reference.${rawValue}`,
    );
  }

  if (command.type === 'READ_VALUES') {
    const temperatureText = Number.isFinite(currentRecord?.temperature)
      ? `temperature anomaly ${currentRecord.temperature.toFixed(2)} degrees Celsius`
      : 'temperature anomaly unavailable';
    const co2Value = getCo2Observation(currentRecord);
    const co2Text = co2Value === null
      ? 'CO₂ concentration unavailable'
      : `${getCo2Description(currentRecord)} CO₂ ${co2Value.toFixed(1)} parts per million`;
    const seaLevelText = Number.isFinite(currentRecord?.seaLevelSmoothedCm)
      ? `60-day-smoothed global mean sea level ${currentRecord.seaLevelSmoothedCm.toFixed(2)} centimeters`
      : 'global mean sea level unavailable';
    return createResponse(true, `For ${formatMonth(currentRecord)}, ${temperatureText}; ${co2Text}; ${seaLevelText}.`);
  }

  if (command.type === 'READ_YEAR') {
    return createResponse(true, `The selected observation is ${formatMonth(currentRecord)}.`);
  }

  if (command.type === 'EXPLAIN_SONIFICATION') {
    const explanation = explainSonification(command.subject, sonificationMode);
    return createResponse(true, explanation);
  }

  return createResponse(false, 'That command is not supported.');
}
