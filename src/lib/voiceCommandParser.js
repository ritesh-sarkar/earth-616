function normalizeVoiceText(transcript) {
  return String(transcript ?? '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/co₂/g, 'co2')
    .replace(/\bcarbon dioxide\b/g, 'co2')
    .replace(/\bco\s+2\b/g, 'co2')
    .replace(/\bglobal mean sea level\b|\bgmsl\b/g, 'sea level')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SMALL_NUMBER_WORDS = new Map([
  ['zero', 0],
  ['one', 1],
  ['two', 2],
  ['three', 3],
  ['four', 4],
  ['five', 5],
  ['six', 6],
  ['seven', 7],
  ['eight', 8],
  ['nine', 9],
  ['ten', 10],
  ['eleven', 11],
  ['twelve', 12],
  ['thirteen', 13],
  ['fourteen', 14],
  ['fifteen', 15],
  ['sixteen', 16],
  ['seventeen', 17],
  ['eighteen', 18],
  ['nineteen', 19],
]);

const TENS_WORDS = new Map([
  ['twenty', 20],
  ['thirty', 30],
  ['forty', 40],
  ['fifty', 50],
  ['sixty', 60],
  ['seventy', 70],
  ['eighty', 80],
  ['ninety', 90],
]);

function parseTwoDigitNumberWords(words) {
  if (words.length === 1) {
    return SMALL_NUMBER_WORDS.get(words[0]) ?? TENS_WORDS.get(words[0]) ?? null;
  }
  if (words.length === 2 && TENS_WORDS.has(words[0])) {
    const unit = SMALL_NUMBER_WORDS.get(words[1]);
    return unit !== undefined && unit < 10 ? TENS_WORDS.get(words[0]) + unit : null;
  }
  return null;
}

function parseYearPhrase(phrase) {
  const words = phrase.split(' ').filter((word) => word && word !== 'and' && word !== 'please');
  if (words.length === 1 && /^\d{4}$/.test(words[0])) return Number(words[0]);
  if (words.length === 2 && /^(18|19|20)$/.test(words[0]) && /^\d{1,2}$/.test(words[1])) {
    return Number(words[0]) * 100 + Number(words[1]);
  }
  if (words[0] === 'two' && words[1] === 'thousand') {
    if (words.length === 2) return 2000;
    const suffix = parseTwoDigitNumberWords(words.slice(2));
    return suffix === null ? null : 2000 + suffix;
  }

  const century = new Map([['eighteen', 18], ['nineteen', 19], ['twenty', 20]]).get(words[0]);
  if (century === undefined) return null;
  if (words.length === 2 && words[1] === 'hundred') return century * 100;
  const suffix = parseTwoDigitNumberWords(words.slice(1));
  return suffix === null ? null : century * 100 + suffix;
}

function parseYearCommand(text) {
  const match = text.match(/^(?:go to|jump to|take me to|navigate to|set year to|show(?: me)?(?: the)? year)\s+(.+)$/);
  if (!match) return null;
  const year = parseYearPhrase(match[1]);
  return Number.isInteger(year) ? { type: 'GO_TO_YEAR', value: year } : null;
}

function parseMode(text) {
  const match = text.match(/^(play|start|select|switch to|choose|show|display)\s+(?:the\s+)?(temperature|co2|sea level|both|combined)(?:\s+mode)?(?:\s+playback)?$/);
  const exactMode = text.match(/^(temperature|co2|sea level|combined)\s+mode$/);
  const modeText = match?.[2] ?? exactMode?.[1];
  if (!modeText) return null;

  const value = modeText === 'both' ? 'combined' : modeText === 'sea level' ? 'sea-level' : modeText;
  return {
    type: 'SET_SONIFICATION',
    value,
    play: match?.[1] === 'play' || match?.[1] === 'start',
  };
}

export function parseVoiceCommand(transcript) {
  const text = normalizeVoiceText(transcript);
  if (!text) return null;

  const yearCommand = parseYearCommand(text);
  if (yearCommand) return yearCommand;

  if (/^(?:show|switch to|go to|use|display)\s+(?:the\s+)?satellite(?:\s+view)?$/.test(text)
    || /^satellite(?:\s+view)?$/.test(text)) {
    return { type: 'SET_VIEW', value: 'satellite' };
  }
  if (/^(?:show|switch to|go to|use|display)\s+(?:the\s+)?thermal(?:\s+view)?$/.test(text)
    || /^thermal(?:\s+view)?$/.test(text)) {
    return { type: 'SET_VIEW', value: 'thermal' };
  }

  if (/^(?:increase|decrease)\s+(?:the\s+)?playback speed$/.test(text)
    || /^play\s+(?:faster|slower)$/.test(text)
    || /^(?:speed up|slow down)$/.test(text)) {
    const value = /\b(?:increase|faster|speed up)\b/.test(text) ? 'faster' : 'slower';
    return { type: 'SET_SPEED', value };
  }
  if (/^(?:normal|default)\s+speed$/.test(text)) {
    return { type: 'SET_SPEED', value: 'normal' };
  }

  const modeCommand = parseMode(text);
  if (modeCommand) return modeCommand;

  if (/^(?:read|tell me|what are|what is|whats)\s+(?:the\s+)?(?:current\s+)?values$/.test(text)
    || /^current values$/.test(text)) {
    return { type: 'READ_VALUES' };
  }
  if (/^(?:what(?:s| is)|read|tell me)\s+(?:the\s+)?(?:current\s+)?(?:global\s+)?temperature(?:\s+(?:anomaly|value|level))?$/.test(text)
    || /^current temperature(?:\s+(?:anomaly|value))?$/.test(text)) {
    return { type: 'READ_TEMPERATURE' };
  }
  if (/^(?:what(?:s| is)|read|tell me)\s+(?:the\s+)?(?:current\s+)?(?:carbon\s+)?co2(?:\s+(?:level|concentration|value))?$/.test(text)
    || /^current co2(?:\s+(?:level|concentration|value))?$/.test(text)) {
    return { type: 'READ_CO2' };
  }
  if (/^(?:what(?:s| is)|read|tell me)\s+(?:the\s+)?(?:current\s+)?sea level(?:\s+(?:change|value|estimate))?$/.test(text)
    || /^current sea level$/.test(text)) {
    return { type: 'READ_SEA_LEVEL' };
  }
  if (/^(?:what(?:s| is)\s+)?(?:the\s+)?(?:current\s+)?year(?:\s+am i viewing)?$/.test(text)
    || /^what year am i (?:viewing|looking at)$/.test(text)) {
    return { type: 'READ_YEAR' };
  }

  const asksForExplanation = /^(?:explain|describe)\b/.test(text)
    && /\b(?:sonification|sound|hearing)\b/.test(text);
  if (asksForExplanation || /^what does this sound mean$/.test(text) || /^what am i hearing$/.test(text)) {
    const subject = /\bsea level\b/.test(text)
      ? 'sea-level'
      : /\bco2\b/.test(text)
        ? 'co2'
        : /\btemperature\b/.test(text)
          ? 'temperature'
          : 'current';
    return { type: 'EXPLAIN_SONIFICATION', subject };
  }

  if (/^(?:pause|pause playback)$/.test(text)) return { type: 'PAUSE' };
  if (/^(?:resume|continue|resume playback|continue playback)$/.test(text)) {
    return { type: 'RESUME' };
  }
  if (/^(?:stop|stop playback)$/.test(text)) return { type: 'STOP' };
  if (/^(?:play|start|playback|start playback)$/.test(text)) return { type: 'PLAY' };

  return null;
}
