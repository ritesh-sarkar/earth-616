import { describe, expect, it } from 'vitest';
import temperatureJson from '../../public/temperature.json';
import co2Json from '../../public/co2.json';
import seaLevelJson from '../../public/sea_level.json';
import {
  buildCombinedRecords,
  getFirstAvailableRecordIndex,
  getSonificationAvailability,
  mapCo2ToTimbre,
  mapTemperatureToFrequency,
  normalizeDateKey,
  parseCo2Dataset,
  parseTemperatureDataset,
} from './climateData';
import { parseSeaLevelDataset } from './seaLevelData';

const temperatureRecords = parseTemperatureDataset(temperatureJson);
const co2Records = parseCo2Dataset(co2Json);
const combinedRecords = buildCombinedRecords(temperatureRecords, co2Records);
const seaLevelDataset = parseSeaLevelDataset(seaLevelJson);
const recordsWithSeaLevel = buildCombinedRecords(temperatureRecords, co2Records, seaLevelDataset.records);

describe('climate data utilities', () => {
  it('parses monthly temperature observations across the supplied history', () => {
    expect(temperatureRecords.length).toBeGreaterThan(1000);
    expect(temperatureRecords[0]).toMatchObject({
      year: 1880,
      month: 1,
      dateKey: '1880-01',
    });
    expect(temperatureRecords.at(-1).year).toBe(2026);
  });

  it('parses NOAA CO2 records and starts at March 1958', () => {
    expect(co2Records[0]).toMatchObject({
      year: 1958,
      month: 3,
      dateKey: '1958-03',
    });
    expect(co2Records.at(-1).dateKey).toBe('2026-09');
  });

  it('aligns measurements by exact year-month and keeps pre-1958 CO2 missing', () => {
    const firstOverlap = combinedRecords.find((record) => record.dateKey === '1958-03');
    const earlierObservation = combinedRecords.find((record) => record.dateKey === '1880-02');

    expect(firstOverlap.temperature).not.toBeNull();
    expect(firstOverlap.co2).toBeGreaterThan(0);
    expect(earlierObservation.temperature).not.toBeNull();
    expect(earlierObservation.co2).toBeNull();
  });

  it('preserves gaps and excludes NOAA negative concentration sentinels', () => {
    const parsed = parseCo2Dataset({
      records: [
        { year: 2020, month: 2, monthly_average: -99.99, deseasonalized: -99.99 },
        { year: 2020, month: 3, monthly_average: 410, deseasonalized: null },
        { year: 2020, month: 13, monthly_average: 411, deseasonalized: 411 },
      ],
    });

    expect(parsed).toHaveLength(1);
    expect(parsed[0].dateKey).toBe('2020-03');
    expect(parsed[0].deseasonalized).toBeNull();
    expect(normalizeDateKey(2020, 3)).toBe('2020-03');
  });

  it('deduplicates monthly source records deterministically using the last row', () => {
    const parsed = parseTemperatureDataset([
      { Year: 2000, Jan: 0.2 },
      { Year: 2000, Jan: 0.4 },
    ]);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].value).toBe(0.4);
  });

  it('maps identical measurements deterministically into safe audio ranges', () => {
    const temperatureFrequency = mapTemperatureToFrequency(1.09);
    const co2Timbre = mapCo2ToTimbre(429.55);

    expect(temperatureFrequency).toBe(mapTemperatureToFrequency(1.09));
    expect(temperatureFrequency).toBeGreaterThanOrEqual(110);
    expect(temperatureFrequency).toBeLessThanOrEqual(440);
    expect(co2Timbre).toBeGreaterThan(0.8);
    expect(co2Timbre).toBeLessThanOrEqual(1);
  });

  it('gates each sonification mode on its own valid observations', () => {
    const preCo2 = combinedRecords.find((record) => record.dateKey === '1880-02');
    const firstOverlap = combinedRecords.find((record) => record.dateKey === '1958-03');

    expect(getSonificationAvailability(preCo2, 'temperature').available).toBe(true);
    expect(getSonificationAvailability(preCo2, 'co2').available).toBe(false);
    expect(getSonificationAvailability(preCo2, 'combined').available).toBe(false);
    expect(getSonificationAvailability(firstOverlap, 'co2').available).toBe(true);
    expect(getSonificationAvailability(firstOverlap, 'combined').available).toBe(true);
  });

  it('starts CO2 and combined modes at their first available month', () => {
    const co2StartIndex = getFirstAvailableRecordIndex(combinedRecords, 'co2');
    const combinedStartIndex = getFirstAvailableRecordIndex(combinedRecords, 'combined');

    expect(combinedRecords[co2StartIndex].dateKey).toBe('1958-03');
    expect(combinedRecords[combinedStartIndex].dateKey).toBe('1958-03');
    expect(getFirstAvailableRecordIndex(combinedRecords, 'temperature')).toBe(0);
    expect(getFirstAvailableRecordIndex([], 'co2')).toBe(-1);
  });

  it('aligns weekly sea-level readings to the shared monthly timeline without extrapolating', () => {
    const firstSeaLevelIndex = getFirstAvailableRecordIndex(recordsWithSeaLevel, 'sea-level');
    const firstSeaLevel = recordsWithSeaLevel[firstSeaLevelIndex];
    const lastSeaLevel = recordsWithSeaLevel.at(-1);
    const preCoverage = recordsWithSeaLevel.find((record) => record.dateKey === '1992-12');

    expect(firstSeaLevel.dateKey).toBe('1993-01');
    expect(getSonificationAvailability(preCoverage, 'sea-level').available).toBe(false);
    expect(getSonificationAvailability(firstSeaLevel, 'sea-level').available).toBe(true);
    expect(firstSeaLevel.seaLevelMatchType).toBe('interpolated');
    expect(lastSeaLevel.dateKey).toBe('2026-11');
    expect(lastSeaLevel.seaLevelMatchType).toBe('nearest');
    expect(lastSeaLevel.seaLevelDateKey).toBe('2026-11-03');
    expect(lastSeaLevel.seaLevelSmoothedCm).toBe(11.525769);
  });

  it('uses a valid deseasonalized CO2 observation when the monthly mean is missing', () => {
    const records = buildCombinedRecords(
      [{ year: 2000, month: 1, monthLabel: 'Jan', dateKey: '2000-01', value: 0.2 }],
      [{
        year: 2000,
        month: 1,
        dateKey: '2000-01',
        monthlyAverage: null,
        deseasonalized: 369.4,
      }],
    );

    expect(records[0].co2).toBe(369.4);
    expect(getSonificationAvailability(records[0], 'co2').available).toBe(true);
  });

  it('does not map missing measurements to fabricated audio values', () => {
    expect(mapTemperatureToFrequency(null)).toBeNull();
    expect(mapCo2ToTimbre(null)).toBeNull();
  });

  it('keeps the combined timeline through the latest supplied measurement', () => {
    expect(combinedRecords[0].dateKey).toBe('1880-01');
    expect(combinedRecords.at(-1).dateKey).toBe('2026-09');
    expect(combinedRecords.at(-1).temperature).toBeNull();
    expect(combinedRecords.at(-1).co2).toBeGreaterThan(0);
  });
});
