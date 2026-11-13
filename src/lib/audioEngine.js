import {
  getCo2Observation,
  getSonificationAvailability,
  mapCo2ToTimbre,
  mapTemperatureToFrequency,
} from './climateData';

const smooth = 0.18;

export class AudioEngine {
  constructor() {
    this.context = null;
    this.primaryOscillator = null;
    this.secondaryOscillator = null;
    this.primaryGain = null;
    this.secondaryGain = null;
    this.masterGain = null;
    this.analyser = null;
    this.started = false;
    this.volume = 0.45;
  }

  get isAvailable() {
    return typeof window !== 'undefined' && Boolean(window.AudioContext || window.webkitAudioContext);
  }

  ensureContext() {
    if (!this.isAvailable) return null;

    if (!this.context) {
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContextConstructor();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.volume;
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.78;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.context.destination);

      this.primaryOscillator = this.context.createOscillator();
      this.primaryOscillator.type = 'sine';
      this.primaryOscillator.frequency.value = 220;
      this.primaryGain = this.context.createGain();
      this.primaryGain.gain.value = 0;
      this.primaryOscillator.connect(this.primaryGain);
      this.primaryGain.connect(this.masterGain);
      this.primaryOscillator.start();

      this.secondaryOscillator = this.context.createOscillator();
      this.secondaryOscillator.type = 'triangle';
      this.secondaryOscillator.frequency.value = 440;
      this.secondaryGain = this.context.createGain();
      this.secondaryGain.gain.value = 0;
      this.secondaryOscillator.connect(this.secondaryGain);
      this.secondaryGain.connect(this.masterGain);
      this.secondaryOscillator.start();
    }

    return this.context;
  }

  async start() {
    const context = this.ensureContext();
    if (!context) return false;
    if (context.state !== 'running') await context.resume();
    this.started = true;
    return true;
  }

  async unlockForVoiceControl() {
    const context = this.ensureContext();
    if (!context) return false;

    const now = context.currentTime;
    for (const gain of [this.primaryGain?.gain, this.secondaryGain?.gain]) {
      if (!gain) continue;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(0, now);
    }
    this.started = false;

    if (context.state !== 'running') await context.resume();
    return true;
  }

  pause() {
    if (this.context?.state === 'running') {
      this.context.suspend();
    }
  }

  async resume() {
    return this.start();
  }

  stop() {
    if (!this.context || !this.primaryGain || !this.secondaryGain) return;
    const now = this.context.currentTime;
    this.ramp(this.primaryGain.gain, 0, now, 0.08);
    this.ramp(this.secondaryGain.gain, 0, now, 0.08);
    this.started = false;
  }

  setVolume(value) {
    const nextVolume = Number(value);
    if (!Number.isFinite(nextVolume)) return;
    this.volume = Math.max(0, Math.min(1, nextVolume));
    if (this.context && this.masterGain) {
      this.ramp(this.masterGain.gain, this.volume, this.context.currentTime);
    }
  }

  updateFromReading(record, { mode = 'temperature' } = {}) {
    if (!this.context || !this.primaryOscillator || !this.secondaryOscillator) return null;
    const now = this.context.currentTime;
    const availability = getSonificationAvailability(record, mode);
    const temperatureFrequency = (mode === 'temperature' || mode === 'combined')
      && availability.temperatureAvailable
      ? mapTemperatureToFrequency(record.temperature)
      : null;
    const seaLevelFrequency = mode === 'sea-level' && availability.seaLevelAvailable
      ? record.seaLevelPitchHz
      : null;
    const co2 = (mode === 'co2' || mode === 'combined') && availability.co2Available
      ? getCo2Observation(record)
      : null;
    const co2Timbre = co2 === null ? null : mapCo2ToTimbre(co2);

    if (!availability.available) {
      this.ramp(this.primaryGain.gain, 0, now);
      this.ramp(this.secondaryGain.gain, 0, now);
      return {
        mode,
        temperatureFrequency: null,
        seaLevelFrequency: null,
        co2Timbre: null,
        unavailable: true,
      };
    }

    if (mode === 'temperature') {
      this.primaryOscillator.frequency.setTargetAtTime(temperatureFrequency, now, smooth);
      this.ramp(this.primaryGain.gain, 0.32, now);
      this.ramp(this.secondaryGain.gain, 0, now);
    } else if (mode === 'co2') {
      this.primaryOscillator.frequency.setTargetAtTime(220, now, smooth);
      this.secondaryOscillator.frequency.setTargetAtTime(440 + co2Timbre * 440, now, smooth);
      this.ramp(this.primaryGain.gain, 0.2, now);
      this.ramp(this.secondaryGain.gain, 0.04 + co2Timbre * 0.16, now);
    } else if (mode === 'sea-level') {
      this.primaryOscillator.frequency.setTargetAtTime(seaLevelFrequency, now, smooth);
      this.ramp(this.primaryGain.gain, 0.32, now);
      this.ramp(this.secondaryGain.gain, 0, now);
    } else {
      this.primaryOscillator.frequency.setTargetAtTime(temperatureFrequency, now, smooth);
      this.secondaryOscillator.frequency.setTargetAtTime(
        temperatureFrequency * (2 + co2Timbre),
        now,
        smooth,
      );
      this.ramp(this.primaryGain.gain, 0.32, now);
      this.ramp(this.secondaryGain.gain, 0.035 + co2Timbre * 0.11, now);
    }

    return { mode, temperatureFrequency, seaLevelFrequency, co2Timbre, unavailable: false };
  }

  readWaveform(target) {
    if (!this.analyser || !target) return false;
    this.analyser.getByteTimeDomainData(target);
    return true;
  }

  ramp(parameter, value, now, duration = 0.16) {
    parameter.cancelScheduledValues(now);
    parameter.setTargetAtTime(value, now, duration);
  }

  async dispose() {
    if (!this.context) return;
    this.started = false;
    this.primaryOscillator?.stop();
    this.secondaryOscillator?.stop();
    const context = this.context;
    this.context = null;
    this.primaryOscillator = null;
    this.secondaryOscillator = null;
    this.primaryGain = null;
    this.secondaryGain = null;
    this.masterGain = null;
    this.analyser = null;
    await context.close();
  }
}
