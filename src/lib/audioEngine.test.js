import { describe, expect, it, vi } from 'vitest';
import { AudioEngine } from './audioEngine';

function createEngineWithAudioParameters() {
  const engine = new AudioEngine();
  const parameter = () => ({
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
  });

  engine.context = { currentTime: 1 };
  engine.primaryOscillator = { frequency: parameter() };
  engine.secondaryOscillator = { frequency: parameter() };
  engine.primaryGain = { gain: parameter() };
  engine.secondaryGain = { gain: parameter() };
  return engine;
}

describe('audio mode mappings', () => {
  it('unlocks the existing audio graph silently from an explicit voice-control gesture', async () => {
    const engine = createEngineWithAudioParameters();
    engine.context.state = 'suspended';
    engine.context.resume = vi.fn(async () => {});
    engine.started = true;
    const previousAudioContext = window.AudioContext;
    window.AudioContext = vi.fn();

    try {
      const result = await engine.unlockForVoiceControl();

      expect(result).toBe(true);
      expect(engine.context.resume).toHaveBeenCalledOnce();
      expect(engine.primaryGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 1);
      expect(engine.secondaryGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 1);
      expect(engine.started).toBe(false);
    } finally {
      if (previousAudioContext) window.AudioContext = previousAudioContext;
      else delete window.AudioContext;
    }
  });

  it('uses temperature pitch only in temperature mode', () => {
    const engine = createEngineWithAudioParameters();
    const reading = { temperature: 0.5, co2: 410 };

    const result = engine.updateFromReading(reading, { mode: 'temperature' });

    expect(result.temperatureFrequency).toBe(308);
    expect(result.co2Timbre).toBeNull();
    expect(engine.primaryOscillator.frequency.setTargetAtTime).toHaveBeenCalledWith(308, 1, expect.any(Number));
    expect(engine.secondaryGain.gain.setTargetAtTime).toHaveBeenCalledWith(0, 1, expect.any(Number));
  });

  it('sonifies CO2 without using temperature as a pitch input', () => {
    const engine = createEngineWithAudioParameters();

    const result = engine.updateFromReading({ temperature: null, co2: 400 }, { mode: 'co2' });

    expect(result.temperatureFrequency).toBeNull();
    expect(result.co2Timbre).toBeCloseTo(2 / 3);
    expect(engine.primaryOscillator.frequency.setTargetAtTime).toHaveBeenCalledWith(220, 1, expect.any(Number));
    expect(engine.secondaryOscillator.frequency.setTargetAtTime).toHaveBeenCalledWith(
      expect.closeTo(440 + (2 / 3) * 440),
      1,
      expect.any(Number),
    );
  });

  it('uses temperature for pitch and CO2 for the harmonic layer in combined mode', () => {
    const engine = createEngineWithAudioParameters();

    const result = engine.updateFromReading(
      { temperature: 0.5, co2: 400 },
      { mode: 'combined' },
    );

    expect(result.temperatureFrequency).toBe(308);
    expect(result.co2Timbre).toBeCloseTo(2 / 3);
    expect(engine.primaryOscillator.frequency.setTargetAtTime).toHaveBeenCalledWith(308, 1, expect.any(Number));
    expect(engine.secondaryOscillator.frequency.setTargetAtTime).toHaveBeenCalledWith(
      expect.closeTo(308 * (2 + (2 / 3))),
      1,
      expect.any(Number),
    );
  });

  it('uses the 60-day-smoothed sea-level pitch independently from temperature and CO2', () => {
    const engine = createEngineWithAudioParameters();

    const result = engine.updateFromReading(
      { temperature: null, co2: null, seaLevelSmoothedCm: 5, seaLevelPitchHz: 275 },
      { mode: 'sea-level' },
    );

    expect(result).toMatchObject({
      mode: 'sea-level',
      temperatureFrequency: null,
      seaLevelFrequency: 275,
      co2Timbre: null,
      unavailable: false,
    });
    expect(engine.primaryOscillator.frequency.setTargetAtTime).toHaveBeenCalledWith(275, 1, expect.any(Number));
    expect(engine.secondaryGain.gain.setTargetAtTime).toHaveBeenCalledWith(0, 1, expect.any(Number));
  });

  it('mutes rather than synthesizing a missing required signal', () => {
    const engine = createEngineWithAudioParameters();

    const result = engine.updateFromReading({ temperature: 0.5, co2: null }, { mode: 'combined' });

    expect(result.unavailable).toBe(true);
    expect(engine.primaryOscillator.frequency.setTargetAtTime).not.toHaveBeenCalled();
    expect(engine.primaryGain.gain.setTargetAtTime).toHaveBeenCalledWith(0, 1, expect.any(Number));
    expect(engine.secondaryGain.gain.setTargetAtTime).toHaveBeenCalledWith(0, 1, expect.any(Number));
  });
});
