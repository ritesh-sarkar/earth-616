import {
  getSeaLevelMonthTimestamp,
  interpolateSeaLevelAt,
  mapSeaLevelToFrequency,
  parseSeaLevelDataset,
} from './seaLevelData';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const SONIFICATION_MODES = ['temperature', 'co2', 'combined', 'sea-level'];

export function normalizeDateKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseTemperatureDataset(rawRows = []) {
  const recordsByDate = new Map();

  rawRows.forEach((row) => {
    const year = Number(row.Year ?? row.year);
    if (!Number.isInteger(year)) return;

    MONTH_NAMES.forEach((label, index) => {
      const month = index + 1;
      const value = toNumber(row[label]);
      if (value === null) return;

      const dateKey = normalizeDateKey(year, month);
      recordsByDate.set(dateKey, {
        year,
        month,
        monthLabel: label,
        dateKey,
        value,
      });
    });
  });

  return [...recordsByDate.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

export function parseCo2Dataset(rawJson = { records: [] }) {
  const rows = Array.isArray(rawJson?.records) ? rawJson.records : Array.isArray(rawJson) ? rawJson : [];
  const recordsByDate = new Map();

  rows.forEach((row) => {
    const year = Number(row.year);
    const month = Number(row.month);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return;

    const rawMonthlyAverage = toNumber(row.monthly_average);
    const rawDeseasonalized = toNumber(row.deseasonalized);
    const monthlyAverage = rawMonthlyAverage > 0 ? rawMonthlyAverage : null;
    const deseasonalized = rawDeseasonalized > 0 ? rawDeseasonalized : null;
    if (monthlyAverage === null && deseasonalized === null) return;

    const dateKey = normalizeDateKey(year, month);
    recordsByDate.set(dateKey, {
      year,
      month,
      dateKey,
      decimalDate: toNumber(row.decimal_date),
      monthlyAverage,
      deseasonalized,
      numberOfDays: toNumber(row.number_of_days),
      standardDeviation: toNumber(row.standard_deviation),
      uncertaintyOfMonthlyMean: toNumber(row.uncertainty_of_monthly_mean),
    });
  });

  return [...recordsByDate.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

export function buildCombinedRecords(temperatureRecords, co2Records, seaLevelRecords = []) {
  const temperatureMap = new Map();
  temperatureRecords.forEach((record) => {
    temperatureMap.set(record.dateKey, record);
  });

  const co2Map = new Map();
  co2Records.forEach((record) => {
    co2Map.set(record.dateKey, record);
  });

  if (!temperatureRecords.length && !co2Records.length && !seaLevelRecords.length) return [];
  const firstDate = [
    temperatureRecords[0]?.dateKey,
    co2Records[0]?.dateKey,
    seaLevelRecords[0]?.dateKey?.slice(0, 7),
  ]
    .filter(Boolean)
    .sort()[0];
  const lastDate = [
    temperatureRecords.at(-1)?.dateKey,
    co2Records.at(-1)?.dateKey,
    seaLevelRecords.at(-1)?.dateKey?.slice(0, 7),
  ]
    .filter(Boolean)
    .sort()
    .at(-1);
  const seaLevelMin = Math.min(...seaLevelRecords.map((record) => record.smoothedCm));
  const seaLevelMax = Math.max(...seaLevelRecords.map((record) => record.smoothedCm));
  const [startYear, startMonth] = firstDate.split('-').map(Number);
  const [endYear, endMonth] = lastDate.split('-').map(Number);
  const combined = [];
  for (let year = startYear; year <= endYear; year += 1) {
    const firstMonth = year === startYear ? startMonth : 1;
    const finalMonth = year === endYear ? endMonth : 12;
    for (let month = firstMonth; month <= finalMonth; month += 1) {
      const monthLabel = MONTH_NAMES[month - 1];
      const dateKey = normalizeDateKey(year, month);
      const temperatureEntry = temperatureMap.get(dateKey) ?? null;
      const co2Entry = co2Map.get(dateKey) ?? null;
      const seaLevelEntry = interpolateSeaLevelAt(
        seaLevelRecords,
        getSeaLevelMonthTimestamp(year, month),
      );

      combined.push({
        year,
        month,
        monthLabel,
        dateKey,
        temperature: temperatureEntry ? temperatureEntry.value : null,
        co2: co2Entry ? co2Entry.monthlyAverage ?? co2Entry.deseasonalized : null,
        co2Display: co2Entry ? co2Entry.monthlyAverage ?? co2Entry.deseasonalized : null,
        co2MonthlyAverage: co2Entry ? co2Entry.monthlyAverage : null,
        co2Deseasonalized: co2Entry ? co2Entry.deseasonalized : null,
        seaLevelCm: seaLevelEntry?.gmslCm ?? null,
        seaLevelSmoothedCm: seaLevelEntry?.smoothedCm ?? null,
        seaLevelTimestamp: seaLevelEntry?.timestamp ?? null,
        seaLevelDateKey: seaLevelEntry?.dateKey ?? null,
        seaLevelMatchType: seaLevelEntry?.matchType ?? null,
        seaLevelSourceDates: seaLevelEntry?.sourceDates ?? [],
        seaLevelPitchHz: seaLevelEntry
          ? mapSeaLevelToFrequency(seaLevelEntry.smoothedCm, seaLevelMin, seaLevelMax)
          : null,
      });
    }
  }

  return combined;
}

export function getIndexForDateKey(dateKey, records = []) {
  return records.findIndex((record) => record.dateKey === dateKey);
}

export function getRecordByDateKey(dateKey, records = []) {
  if (!records || !records.length) return null;
  return records.find((record) => record.dateKey === dateKey) ?? null;
}

export function getCo2Observation(record) {
  const candidates = [record?.co2, record?.co2MonthlyAverage, record?.co2Deseasonalized];
  return candidates.find((value) => Number.isFinite(value) && value > 0) ?? null;
}

export function getSonificationAvailability(record, mode) {
  if (!SONIFICATION_MODES.includes(mode)) {
    throw new Error(`Unknown sonification mode: ${mode}`);
  }

  const temperatureAvailable = Number.isFinite(record?.temperature);
  const co2Available = getCo2Observation(record) !== null;
  const seaLevelAvailable = Number.isFinite(record?.seaLevelSmoothedCm)
    && Number.isFinite(record?.seaLevelPitchHz);
  const needsTemperature = mode === 'temperature' || mode === 'combined';
  const needsCo2 = mode === 'co2' || mode === 'combined';
  const needsSeaLevel = mode === 'sea-level';

  return {
    available: (!needsTemperature || temperatureAvailable)
      && (!needsCo2 || co2Available)
      && (!needsSeaLevel || seaLevelAvailable),
    temperatureAvailable,
    co2Available,
    seaLevelAvailable,
    needsTemperature,
    needsCo2,
    needsSeaLevel,
  };
}

export function getFirstAvailableRecordIndex(records = [], mode) {
  return records.findIndex((record) => getSonificationAvailability(record, mode).available);
}

export function getRecordByIndex(index, records = []) {
  if (!records || !records.length) return null;
  const safeIndex = Math.min(Math.max(index, 0), records.length - 1);
  return records[safeIndex] ?? null;
}

export function mapTemperatureToFrequency(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  const normalized = Math.max(-2.5, Math.min(Number(value), 2.5));
  const scaled = (normalized + 2.5) / 5;
  return 110 + scaled * 330;
}

export function mapCo2ToTimbre(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) <= 0) return null;
  const normalized = Math.max(300, Math.min(Number(value), 450));
  return (normalized - 300) / 150;
}

export async function loadClimateData() {
  const climateDataPromise = Promise.all([
    fetch('/temperature.json', { cache: 'force-cache' }).then((response) => {
      if (!response.ok) throw new Error('Unable to load temperature dataset');
      return response.json();
    }),
    fetch('/co2.json', { cache: 'force-cache' }).then((response) => {
      if (!response.ok) throw new Error('Unable to load CO2 dataset');
      return response.json();
    }),
  ]);
  const seaLevelDataPromise = fetch('/sea_level.json', { cache: 'force-cache' })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Unable to load sea-level dataset (HTTP ${response.status}).`);
      }
      return response.json();
    })
    .then(parseSeaLevelDataset)
    .then((data) => ({ data }))
    .catch((error) => ({ error }));

  const [[temperatureJson, co2Json], seaLevelResult] = await Promise.all([
    climateDataPromise,
    seaLevelDataPromise,
  ]);
  const temperatureRecords = parseTemperatureDataset(Array.isArray(temperatureJson) ? temperatureJson : []);
  const co2Records = parseCo2Dataset(co2Json);
  const seaLevelRecords = seaLevelResult.data?.records ?? [];
  const combinedRecords = buildCombinedRecords(temperatureRecords, co2Records, seaLevelRecords);

  if (!temperatureRecords.length) {
    throw new Error('Temperature data did not contain valid monthly observations.');
  }

  const seaLevelError = seaLevelResult.error
    ? `Sea-level data could not be loaded: ${seaLevelResult.error.message}`
    : seaLevelRecords.length
      ? ''
      : 'Sea-level dataset contains no valid observations.';

  return {
    temperatureRecords,
    co2Records,
    seaLevelRecords,
    seaLevelMetadata: seaLevelResult.data?.metadata ?? null,
    seaLevelReport: seaLevelResult.data?.report ?? null,
    seaLevelError,
    combinedRecords,
    firstYear: Number(temperatureRecords[0].year),
    lastYear: Number(combinedRecords.at(-1).year),
  };
}
