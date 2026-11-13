import { describe, expect, it } from 'vitest';
import seaLevelJson from '../../public/sea_level.json';
import {
  decimalYearToTimestamp,
  interpolateSeaLevelAt,
  mapSeaLevelToFrequency,
  parseSeaLevelDataset,
} from './seaLevelData';

const parsedDataset = parseSeaLevelDataset(seaLevelJson);

describe('NASA sea-level data utilities', () => {
  it('validates every supplied weekly row and preserves the negative 1993 baseline', () => {
    expect(parsedDataset.report).toMatchObject({
      totalRecords: 1755,
      validRecords: 1755,
      rejectedRecords: [],
      sourceStart: '1993-01-04',
      sourceEnd: '2026-11-03',
    });
    expect(parsedDataset.report.smoothedMinCm).toBeCloseTo(-0.565857);
    expect(parsedDataset.report.smoothedMaxCm).toBeCloseTo(11.525769);
    expect(parsedDataset.records[0].smoothedCm).toBe(-0.428032);
  });

  it('records missing, fill, duplicate, and out-of-order rows instead of silently correcting them', () => {
    const result = parseSeaLevelDataset({
      metadata: {},
      data: [
        { decimal_year: 2000, gmsl_cm: -0.2, gmsl_60_day_smoothed_cm: -0.1 },
        { decimal_year: 2000.02, gmsl_cm: 0.1, gmsl_60_day_smoothed_cm: -0.05 },
        { decimal_year: 2000.01, gmsl_cm: 0.2, gmsl_60_day_smoothed_cm: 0 },
        { decimal_year: 2000.02, gmsl_cm: 0.2, gmsl_60_day_smoothed_cm: 0 },
        { decimal_year: 2000.04, gmsl_cm: 9.96921e36, gmsl_60_day_smoothed_cm: 0.1 },
        { decimal_year: 2000.05, gmsl_cm: null, gmsl_60_day_smoothed_cm: 0.1 },
      ],
    });

    expect(result.records).toHaveLength(2);
    expect(result.records[0].gmslCm).toBe(-0.2);
    expect(result.report.rejectedRecords).toEqual([
      { sourceIndex: 2, reasons: ['out_of_order_timestamp'] },
      { sourceIndex: 3, reasons: ['duplicate_timestamp'] },
      { sourceIndex: 4, reasons: ['fill_value_gmsl_cm'] },
      { sourceIndex: 5, reasons: ['missing_gmsl_cm'] },
    ]);
  });

  it('interpolates only across bounded gaps and does not extrapolate beyond the edge tolerance', () => {
    const start = Date.UTC(2000, 0, 1);
    const records = [
      { timestamp: start, dateKey: '2000-01-01', gmslCm: 0, smoothedCm: 1 },
      { timestamp: start + 10 * 86400000, dateKey: '2000-01-11', gmslCm: 10, smoothedCm: 3 },
    ];

    expect(interpolateSeaLevelAt(records, start + 5 * 86400000)).toMatchObject({
      gmslCm: 5,
      smoothedCm: 2,
      matchType: 'interpolated',
    });
    expect(interpolateSeaLevelAt(records, start).matchType).toBe('observed');
    expect(interpolateSeaLevelAt(records, start + 10 * 86400000).matchType).toBe('observed');
    expect(interpolateSeaLevelAt(records, start - 14 * 86400000)).toMatchObject({
      gmslCm: 0,
      matchType: 'nearest',
    });
    expect(interpolateSeaLevelAt(records, start - 15 * 86400000)).toBeNull();
    expect(interpolateSeaLevelAt(records, start + 25 * 86400000)).toBeNull();
  });

  it('converts decimal years to UTC and maps the validated range into the pitch range', () => {
    expect(new Date(decimalYearToTimestamp(2020.5)).toISOString()).toBe('2020-07-02T00:00:00.000Z');
    expect(mapSeaLevelToFrequency(-0.5, -1, 10)).toBeCloseTo(125);
    expect(mapSeaLevelToFrequency(4.5, -1, 10)).toBeCloseTo(275);
    expect(mapSeaLevelToFrequency(null, -1, 10)).toBeNull();
  });
});
