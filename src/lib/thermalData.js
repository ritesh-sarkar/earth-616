export const NASA_THERMAL_START_YEAR = 1881;
export const NASA_THERMAL_END_YEAR = 2024;
export const NASA_THERMAL_FRAME_COUNT = 900;

const FRAMES_PER_YEAR = 6;
const FRAMES_IN_2024 = 42;
const FRAMES_BEFORE_2024 = (NASA_THERMAL_END_YEAR - NASA_THERMAL_START_YEAR) * FRAMES_PER_YEAR;

function parseDate(dateKey) {
  const match = /^(\d{4})-(\d{2})$/.exec(dateKey ?? '');
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  return { year, month };
}

function getFirstFrameOfYear(year) {
  return (year - NASA_THERMAL_START_YEAR) * FRAMES_PER_YEAR;
}

function getFramesInYear(year) {
  return year === NASA_THERMAL_END_YEAR ? FRAMES_IN_2024 : FRAMES_PER_YEAR;
}

export function getThermalFrameForDate(dateKey) {
  const date = parseDate(dateKey);
  if (
    date === null
    || date.year < NASA_THERMAL_START_YEAR
    || date.year > NASA_THERMAL_END_YEAR
  ) {
    return null;
  }

  const framesInYear = getFramesInYear(date.year);
  const frameOffset = Math.round(((date.month - 1) / 11) * (framesInYear - 1));
  return {
    frameIndex: getFirstFrameOfYear(date.year) + frameOffset,
    year: date.year,
    frameInYear: frameOffset + 1,
    framesInYear,
  };
}

export function getThermalDisplayFrameForDate(dateKey) {
  const date = parseDate(dateKey);
  if (date === null) return null;

  if (date.year < NASA_THERMAL_START_YEAR) {
    return {
      frameIndex: 0,
      year: NASA_THERMAL_START_YEAR,
      frameDate: String(NASA_THERMAL_START_YEAR),
      frameInYear: 1,
      framesInYear: FRAMES_PER_YEAR,
      isNearest: true,
    };
  }

  if (date.year > NASA_THERMAL_END_YEAR) {
    return {
      frameIndex: NASA_THERMAL_FRAME_COUNT - 1,
      year: NASA_THERMAL_END_YEAR,
      frameDate: String(NASA_THERMAL_END_YEAR),
      frameInYear: FRAMES_IN_2024,
      framesInYear: FRAMES_IN_2024,
      isNearest: true,
    };
  }

  const frame = getThermalFrameForDate(dateKey);
  return {
    ...frame,
    frameDate: String(date.year),
    isNearest: false,
  };
}

export function isValidThermalFrameIndex(frameIndex) {
  return Number.isInteger(frameIndex) && frameIndex >= 0 && frameIndex < NASA_THERMAL_FRAME_COUNT;
}

export const NASA_THERMAL_2024_FRAME_COUNT = FRAMES_IN_2024;
