import { describe, expect, it, vi } from 'vitest';
import temperatureJson from '../../public/temperature.json';
import co2Json from '../../public/co2.json';
import seaLevelJson from '../../public/sea_level.json';
import {
  buildCombinedRecords,
  getFirstAvailableRecordIndex,
  parseCo2Dataset,
  parseTemperatureDataset,
} from './climateData';
import { executeVoiceCommand } from './voiceCommandHandler';
import { parseSeaLevelDataset } from './seaLevelData';

const temperatureRecords = parseTemperatureDataset(temperatureJson);
const co2Records = parseCo2Dataset(co2Json);
const seaLevelRecords = parseSeaLevelDataset(seaLevelJson).records;
const records = buildCombinedRecords(temperatureRecords, co2Records, seaLevelRecords);
const firstTemperatureRecord = records.find((record) => Number.isFinite(record.temperature));
const lastTemperatureRecord = records.filter((record) => Number.isFinite(record.temperature)).at(-1);
const playbackPaces = [
  { monthsPerSecond: 0.5, label: '0.5 month/s' },
  { monthsPerSecond: 1, label: '1 month/s' },
  { monthsPerSecond: 2, label: '2 months/s' },
  { monthsPerSecond: 60, label: '5 years/s' },
];

function createContext(overrides = {}) {
  const calls = {
    selectView: vi.fn(),
    selectMode: vi.fn((mode) => {
      const index = mode === 'temperature' ? -1 : getFirstAvailableRecordIndex(records, mode);
      return index >= 0 ? records[index] : context.currentRecord;
    }),
    startPlayback: vi.fn(async () => true),
    pausePlayback: vi.fn(),
    stopPlayback: vi.fn(),
    setDateKey: vi.fn(),
    setPlaybackSpeed: vi.fn(),
  };
  const context = {
    actions: calls,
    records,
    currentRecord: records.find((record) => record.dateKey === '2000-04'),
    firstTemperatureRecord,
    lastTemperatureRecord,
    playbackPaces,
    playbackSpeed: 1,
    sonificationMode: 'temperature',
    getUnavailableReason: vi.fn((mode, record) => `${mode} is unavailable for ${record?.dateKey ?? 'this month'}.`),
    ...overrides,
  };
  return { context, calls };
}

describe('executeVoiceCommand', () => {
  it('uses the existing view action', async () => {
    const { context, calls } = createContext();

    const result = await executeVoiceCommand({ type: 'SET_VIEW', value: 'thermal' }, context);

    expect(calls.selectView).toHaveBeenCalledWith('thermal');
    expect(result.ok).toBe(true);
  });

  it('selects CO2 mode and starts playback at its first valid observation', async () => {
    const { context, calls } = createContext();

    const result = await executeVoiceCommand(
      { type: 'SET_SONIFICATION', value: 'co2', play: true },
      context,
    );

    expect(calls.selectMode).toHaveBeenCalledWith('co2');
    expect(calls.startPlayback).toHaveBeenCalledWith(
      expect.objectContaining({ dateKey: '1958-03' }),
      'co2',
    );
    expect(result.message).toContain('March 1958');
  });

  it('selects sea-level mode at its first available month and starts playback', async () => {
    const { context, calls } = createContext();

    const result = await executeVoiceCommand(
      { type: 'SET_SONIFICATION', value: 'sea-level', play: true },
      context,
    );

    expect(calls.selectMode).toHaveBeenCalledWith('sea-level');
    expect(calls.startPlayback).toHaveBeenCalledWith(
      expect.objectContaining({ dateKey: '1993-01' }),
      'sea-level',
    );
    expect(result.message).toContain('January 1993');
  });

  it('moves to a valid temperature month and reports unavailable CO2', async () => {
    const { context, calls } = createContext();

    const result = await executeVoiceCommand({ type: 'GO_TO_YEAR', value: 1880 }, context);

    expect(calls.setDateKey).toHaveBeenCalledWith('1880-04');
    expect(result.message).toContain('CO₂ is unavailable');
  });

  it('does not fabricate missing CO2 readings', async () => {
    const { context } = createContext({
      currentRecord: records.find((record) => record.dateKey === '1880-01'),
    });

    const result = await executeVoiceCommand({ type: 'READ_CO2' }, context);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('unavailable');
    expect(result.message).not.toContain('0.0');
  });

  it('reads the measured sea-level estimate without treating missing dates as zero', async () => {
    const { context } = createContext({
      currentRecord: records.find((record) => record.dateKey === '2000-07'),
    });

    const result = await executeVoiceCommand({ type: 'READ_SEA_LEVEL' }, context);

    expect(result.ok).toBe(true);
    expect(result.message).toContain('60-day-smoothed global mean sea level');
    expect(result.message).toContain('raw estimate is');
    expect(result.message).not.toContain('0.00 centimeters');
  });

  it('identifies a deseasonalized CO2 value accurately', async () => {
    const { context } = createContext({
      currentRecord: {
        dateKey: '2000-01',
        year: 2000,
        month: 1,
        monthLabel: 'Jan',
        co2: 371.2,
        co2MonthlyAverage: null,
        co2Deseasonalized: 371.2,
      },
    });

    const result = await executeVoiceCommand({ type: 'READ_CO2' }, context);

    expect(result.message).toContain('deseasonalized CO₂');
    expect(result.message).toContain('371.2 parts per million');
  });

  it('keeps playback speed within the existing range', async () => {
    const { context, calls } = createContext({ playbackSpeed: 60 });

    const result = await executeVoiceCommand({ type: 'SET_SPEED', value: 'faster' }, context);

    expect(calls.setPlaybackSpeed).not.toHaveBeenCalled();
    expect(result.message).toContain('maximum');
  });

  it('explains the current combined mapping from the actual sonification design', async () => {
    const { context } = createContext({ sonificationMode: 'combined' });

    const result = await executeVoiceCommand(
      { type: 'EXPLAIN_SONIFICATION', subject: 'current' },
      context,
    );

    expect(result.message).toContain('primary pitch');
    expect(result.message).toContain('harmonic layer');
    expect(result.message).toContain('not a recording of Earth');
  });

  it('explains the CO2 layer correctly when asked in combined mode', async () => {
    const { context } = createContext({ sonificationMode: 'combined' });

    const result = await executeVoiceCommand(
      { type: 'EXPLAIN_SONIFICATION', subject: 'co2' },
      context,
    );

    expect(result.message).toContain('harmonic layer frequency and strength');
  });
});
