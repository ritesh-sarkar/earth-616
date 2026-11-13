export const MAX_SEA_LEVEL_INTERPOLATION_GAP_DAYS = 31;
export const MAX_SEA_LEVEL_EDGE_MATCH_DAYS = 14;

const FILL_VALUE = 9.96921e36;
const MAX_ABSOLUTE_GMSL_CM = 30;
const MAX_SMOOTHED_CHANGE_CM = 2;
const DAY_MS = 24 * 60 * 60 * 1000;
const REQUIRED_FIELDS = ['decimal_year', 'gmsl_cm', 'gmsl_60_day_smoothed_cm'];

export function decimalYearToTimestamp(decimalYear) {
  if (!Number.isFinite(decimalYear)) return null;
  const year = Math.floor(decimalYear);
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  return Math.round(start + (decimalYear - year) * (end - start));
}

function getMetadataWarnings(metadata, rows) {
  const warnings = [];
  if (!metadata || typeof metadata !== 'object') {
    return ['Metadata is missing or is not an object.'];
  }
  if (metadata.record_count !== rows.length) {
    warnings.push(`Metadata record_count is ${metadata.record_count ?? 'missing'}; data contains ${rows.length} rows.`);
  }
  if (!String(metadata.doi ?? '').includes('10.5067/NSIND-GMSV1')) {
    warnings.push('Metadata DOI does not match the NASA PO.DAAC GMSL indicator DOI.');
  }
  if (!/centimeter/i.test(String(metadata.units ?? ''))) {
    warnings.push(`Metadata units are not explicitly centimeters: ${metadata.units ?? 'missing'}.`);
  }
  if (!String(metadata.reference_period ?? '').includes('1993')) {
    warnings.push('Metadata does not identify the 1993 reference period.');
  }
  if (!String(metadata.title ?? '').toLowerCase().includes('simple gridded')) {
    warnings.push('Metadata title omits "Simple" from the official upstream product title.');
  }
  const sourceVersion = String(metadata.source_dataset ?? '').match(/\bversion\s+(\d+(?:\.\d+)?)/i)?.[1];
  const citationVersion = String(metadata.citation ?? '').match(/\bversion\s+(\d+(?:\.\d+)?)/i)?.[1];
  if (!sourceVersion || !citationVersion || sourceVersion !== citationVersion) {
    warnings.push('Metadata source_dataset and citation do not identify the same upstream version.');
  }
  const sourceUrlMatchesVersion = sourceVersion === '1.1'
    ? /NASA_SSH_REF_SIMPLE_GRID_V11(?:\/|$)/.test(String(metadata.source_dataset_url ?? ''))
    : sourceVersion === '1'
      ? /NASA_SSH_REF_SIMPLE_GRID_V1(?:\/|$)/.test(String(metadata.source_dataset_url ?? ''))
      : false;
  if (sourceVersion && !sourceUrlMatchesVersion) {
    warnings.push('Metadata source_dataset URL does not match the upstream version stated in source_dataset.');
  }
  if (metadata.data_start_decimal_year !== rows[0]?.decimal_year) {
    warnings.push('Metadata data_start_decimal_year does not match the first source row.');
  }
  if (metadata.data_end_decimal_year !== rows.at(-1)?.decimal_year) {
    warnings.push('Metadata data_end_decimal_year does not match the last source row.');
  }
  return warnings;
}

export function parseSeaLevelDataset(rawJson) {
  if (!Array.isArray(rawJson?.data)) {
    throw new Error('Sea-level dataset must contain a data array.');
  }

  const rows = rawJson.data;
  const report = {
    totalRecords: rows.length,
    validRecords: 0,
    rejectedRecords: [],
    samplingGaps: [],
    metadataWarnings: getMetadataWarnings(rawJson.metadata, rows),
    sourceStart: null,
    sourceEnd: null,
    rawMinCm: null,
    rawMaxCm: null,
    smoothedMinCm: null,
    smoothedMaxCm: null,
    maxSamplingGapDays: 0,
    maxSmoothedChangeCm: 0,
  };
  const records = [];
  const seenTimestamps = new Set();
  let previousRecord = null;

  rows.forEach((row, sourceIndex) => {
    const reasons = [];
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      report.rejectedRecords.push({ sourceIndex, reasons: ['record_is_not_an_object'] });
      return;
    }

    REQUIRED_FIELDS.forEach((field) => {
      const value = row[field];
      if (value === null || value === undefined) {
        reasons.push(`missing_${field}`);
      } else if (typeof value !== 'number' || !Number.isFinite(value)) {
        reasons.push(`invalid_${field}`);
      } else if (value === FILL_VALUE) {
        reasons.push(`fill_value_${field}`);
      }
    });

    if (!reasons.length) {
      if (Math.abs(row.gmsl_cm) > MAX_ABSOLUTE_GMSL_CM
        || Math.abs(row.gmsl_60_day_smoothed_cm) > MAX_ABSOLUTE_GMSL_CM) {
        reasons.push('implausible_gmsl_value');
      }
      if (previousRecord && row.decimal_year <= previousRecord.decimalYear) {
        reasons.push(seenTimestamps.has(row.decimal_year) ? 'duplicate_timestamp' : 'out_of_order_timestamp');
      }
      if (previousRecord) {
        const change = Math.abs(row.gmsl_60_day_smoothed_cm - previousRecord.smoothedCm);
        const gapDays = (decimalYearToTimestamp(row.decimal_year) - previousRecord.timestamp) / DAY_MS;
        if (change > MAX_SMOOTHED_CHANGE_CM) reasons.push('smoothed_discontinuity');
        if (gapDays > MAX_SEA_LEVEL_INTERPOLATION_GAP_DAYS) {
          report.samplingGaps.push({
            from: previousRecord.dateKey,
            to: new Date(decimalYearToTimestamp(row.decimal_year)).toISOString().slice(0, 10),
            gapDays,
          });
        }
      }
    }

    if (reasons.length) {
      report.rejectedRecords.push({ sourceIndex, reasons });
      return;
    }

    const timestamp = decimalYearToTimestamp(row.decimal_year);
    const record = {
      sourceIndex,
      decimalYear: row.decimal_year,
      timestamp,
      dateKey: new Date(timestamp).toISOString().slice(0, 10),
      gmslCm: row.gmsl_cm,
      smoothedCm: row.gmsl_60_day_smoothed_cm,
    };

    if (previousRecord) {
      const gapDays = (record.timestamp - previousRecord.timestamp) / DAY_MS;
      const change = Math.abs(record.smoothedCm - previousRecord.smoothedCm);
      report.maxSamplingGapDays = Math.max(report.maxSamplingGapDays, gapDays);
      report.maxSmoothedChangeCm = Math.max(report.maxSmoothedChangeCm, change);
    }
    records.push(record);
    seenTimestamps.add(record.decimalYear);
    previousRecord = record;
  });

  report.validRecords = records.length;
  if (records.length) {
    report.sourceStart = records[0].dateKey;
    report.sourceEnd = records.at(-1).dateKey;
    report.rawMinCm = Math.min(...records.map((record) => record.gmslCm));
    report.rawMaxCm = Math.max(...records.map((record) => record.gmslCm));
    report.smoothedMinCm = Math.min(...records.map((record) => record.smoothedCm));
    report.smoothedMaxCm = Math.max(...records.map((record) => record.smoothedCm));
  }

  return { metadata: rawJson.metadata ?? null, records, report };
}

function nearestEdgeMatch(records, index, timestamp) {
  const record = records[index];
  if (!record || Math.abs(record.timestamp - timestamp) > MAX_SEA_LEVEL_EDGE_MATCH_DAYS * DAY_MS) {
    return null;
  }
  return {
    gmslCm: record.gmslCm,
    smoothedCm: record.smoothedCm,
    timestamp: record.timestamp,
    dateKey: record.dateKey,
    matchType: 'nearest',
    sourceDates: [record.dateKey],
  };
}

function observedMatch(record) {
  return {
    gmslCm: record.gmslCm,
    smoothedCm: record.smoothedCm,
    timestamp: record.timestamp,
    dateKey: record.dateKey,
    matchType: 'observed',
    sourceDates: [record.dateKey],
  };
}

export function interpolateSeaLevelAt(records = [], timestamp) {
  if (!records.length || !Number.isFinite(timestamp)) return null;
  if (timestamp < records[0].timestamp) return nearestEdgeMatch(records, 0, timestamp);
  if (timestamp === records[0].timestamp) return observedMatch(records[0]);
  if (timestamp > records.at(-1).timestamp) return nearestEdgeMatch(records, records.length - 1, timestamp);
  if (timestamp === records.at(-1).timestamp) return observedMatch(records.at(-1));

  let low = 0;
  let high = records.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const record = records[middle];
    if (record.timestamp === timestamp) return observedMatch(record);
    if (record.timestamp < timestamp) low = middle + 1;
    else high = middle - 1;
  }

  const before = records[high];
  const after = records[low];
  const gap = after.timestamp - before.timestamp;
  if (gap <= 0 || gap > MAX_SEA_LEVEL_INTERPOLATION_GAP_DAYS * DAY_MS) {
    const nearestIndex = timestamp - before.timestamp <= after.timestamp - timestamp ? high : low;
    return nearestEdgeMatch(records, nearestIndex, timestamp);
  }

  const fraction = (timestamp - before.timestamp) / gap;
  const interpolate = (key) => before[key] + (after[key] - before[key]) * fraction;
  return {
    gmslCm: interpolate('gmslCm'),
    smoothedCm: interpolate('smoothedCm'),
    timestamp,
    dateKey: new Date(timestamp).toISOString().slice(0, 10),
    matchType: 'interpolated',
    sourceDates: [before.dateKey, after.dateKey],
  };
}

export function getSeaLevelMonthTimestamp(year, month) {
  return Date.UTC(year, month - 1, 15, 12);
}

export function mapSeaLevelToFrequency(value, min, max) {
  if (![value, min, max].every(Number.isFinite)) return null;
  if (max <= min) return 275;
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return 110 + normalized * 330;
}
