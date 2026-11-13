import { describe, expect, it } from 'vitest';
import {
  getThermalDisplayFrameForDate,
  getThermalFrameForDate,
  NASA_THERMAL_2024_FRAME_COUNT,
  NASA_THERMAL_FRAME_COUNT,
} from './thermalData';

describe('NASA thermal frame mapping', () => {
  it('maps each month across the frames available for its NASA source year', () => {
    expect(getThermalFrameForDate('1881-01')).toEqual({
      frameIndex: 0,
      year: 1881,
      frameInYear: 1,
      framesInYear: 6,
    });
    expect(getThermalFrameForDate('1881-03').frameIndex).toBe(1);
    expect(getThermalFrameForDate('1881-12').frameIndex).toBe(5);
    expect(getThermalFrameForDate('2023-12').frameIndex).toBe(857);
    expect(getThermalFrameForDate('2024-01')).toEqual({
      frameIndex: 858,
      year: 2024,
      frameInYear: 1,
      framesInYear: 42,
    });
    expect(getThermalFrameForDate('2024-12')).toEqual({
      frameIndex: 899,
      year: 2024,
      frameInYear: 42,
      framesInYear: 42,
    });
    expect(NASA_THERMAL_FRAME_COUNT).toBe(900);
    expect(NASA_THERMAL_2024_FRAME_COUNT).toBe(42);
  });

  it('advances frame positions monotonically with monthly timestamps', () => {
    const monthlyFrames = Array.from({ length: 12 }, (_, index) => (
      getThermalFrameForDate(`2024-${String(index + 1).padStart(2, '0')}`).frameIndex
    ));

    expect(monthlyFrames[0]).toBe(858);
    expect(monthlyFrames.at(-1)).toBe(899);
    expect(monthlyFrames.every((frameIndex, index) => (
      index === 0 || frameIndex > monthlyFrames[index - 1]
    ))).toBe(true);
  });

  it('does not imply NASA geographic coverage outside the visualization dates', () => {
    expect(getThermalFrameForDate('1880-12')).toBeNull();
    expect(getThermalFrameForDate('2025-01')).toBeNull();
    expect(getThermalFrameForDate('2024-13')).toBeNull();
    expect(getThermalFrameForDate('not-a-date')).toBeNull();
  });

  it('keeps Thermal View visible with a clearly identified nearest boundary frame', () => {
    expect(getThermalDisplayFrameForDate('1880-01')).toEqual({
      frameIndex: 0,
      year: 1881,
      frameDate: '1881',
      frameInYear: 1,
      framesInYear: 6,
      isNearest: true,
    });
    expect(getThermalDisplayFrameForDate('2026-09')).toEqual({
      frameIndex: 899,
      year: 2024,
      frameDate: '2024',
      frameInYear: 42,
      framesInYear: 42,
      isNearest: true,
    });
    expect(getThermalDisplayFrameForDate('2024-12')).toEqual({
      frameIndex: 899,
      year: 2024,
      frameDate: '2024',
      frameInYear: 42,
      framesInYear: 42,
      isNearest: false,
    });
    expect(getThermalDisplayFrameForDate('2026-13')).toBeNull();
  });
});
