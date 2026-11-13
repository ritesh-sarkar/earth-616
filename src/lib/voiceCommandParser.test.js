import { describe, expect, it } from 'vitest';
import { parseVoiceCommand } from './voiceCommandParser';

describe('parseVoiceCommand', () => {
  it.each([
    ['Show thermal view', { type: 'SET_VIEW', value: 'thermal' }],
    ['switch to satellite', { type: 'SET_VIEW', value: 'satellite' }],
    ['Play CO₂', { type: 'SET_SONIFICATION', value: 'co2', play: true }],
    ['Play carbon dioxide', { type: 'SET_SONIFICATION', value: 'co2', play: true }],
    ['Play sea level', { type: 'SET_SONIFICATION', value: 'sea-level', play: true }],
    ['Show global mean sea level', { type: 'SET_SONIFICATION', value: 'sea-level', play: false }],
    ['Switch to sea-level mode', { type: 'SET_SONIFICATION', value: 'sea-level', play: false }],
    ['Temperature mode', { type: 'SET_SONIFICATION', value: 'temperature', play: false }],
    ['Play both', { type: 'SET_SONIFICATION', value: 'combined', play: true }],
    ['Pause playback', { type: 'PAUSE' }],
    ['Continue', { type: 'RESUME' }],
    ['Stop.', { type: 'STOP' }],
    ['Go to 1880.', { type: 'GO_TO_YEAR', value: 1880 }],
    ['Jump to nineteen eighty five', { type: 'GO_TO_YEAR', value: 1985 }],
    ['Show the year two thousand and twenty', { type: 'GO_TO_YEAR', value: 2020 }],
    ['Increase playback speed', { type: 'SET_SPEED', value: 'faster' }],
    ['Play slower', { type: 'SET_SPEED', value: 'slower' }],
    ['Normal speed', { type: 'SET_SPEED', value: 'normal' }],
    ['What is the current temperature anomaly?', { type: 'READ_TEMPERATURE' }],
    ['What is the current CO2 level?', { type: 'READ_CO2' }],
    ['What is the current sea level?', { type: 'READ_SEA_LEVEL' }],
    ['Read the current values', { type: 'READ_VALUES' }],
    ['What year am I viewing?', { type: 'READ_YEAR' }],
    ['Explain the temperature sound', { type: 'EXPLAIN_SONIFICATION', subject: 'temperature' }],
    ['Explain the sea-level sound', { type: 'EXPLAIN_SONIFICATION', subject: 'sea-level' }],
    ['Explain what I am hearing', { type: 'EXPLAIN_SONIFICATION', subject: 'current' }],
  ])('parses "%s" into an allowlisted command', (transcript, command) => {
    expect(parseVoiceCommand(transcript)).toEqual(command);
  });

  it.each(['', 'play the moon', 'open settings', 'run arbitrary code'])(
    'does not execute unsupported command "%s"',
    (transcript) => {
      expect(parseVoiceCommand(transcript)).toBeNull();
    },
  );
});
