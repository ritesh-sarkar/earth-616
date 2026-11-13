import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VoiceControl from './VoiceControl';
import { parseVoiceCommand } from '../../lib/voiceCommandParser';

const recognitionInstances = [];

class MockSpeechRecognition {
  constructor() {
    recognitionInstances.push(this);
  }

  start() {
    this.onstart?.();
  }

  abort() {
    this.onend?.();
  }

  emitFinal(transcript) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ 0: { transcript }, isFinal: true }],
    });
  }
}

describe('VoiceControl', () => {
  beforeEach(() => {
    recognitionInstances.length = 0;
    window.SpeechRecognition = MockSpeechRecognition;
    delete window.webkitSpeechRecognition;
  });

  afterEach(() => {
    cleanup();
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    vi.restoreAllMocks();
  });

  it('starts recognition only after activation and routes a final command once', async () => {
    const onCommand = vi.fn(async () => ({ ok: true, message: 'Showing thermal view.' }));
    const { container } = render(
      <>
        <VoiceControl onCommand={onCommand} />
        <section id="earth-view" tabIndex={-1} />
      </>,
    );
    const earthView = container.querySelector('#earth-view');
    earthView.scrollIntoView = vi.fn();

    expect(recognitionInstances).toHaveLength(0);
    fireEvent.click(await screen.findByRole('button', { name: 'Start voice control' }));
    expect(screen.getByText('Listening…')).toBeInTheDocument();

    act(() => recognitionInstances[0].emitFinal('Show thermal view'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(onCommand).toHaveBeenCalledTimes(1);
    expect(onCommand).toHaveBeenCalledWith({ type: 'SET_VIEW', value: 'thermal' });
    await waitFor(() => expect(earthView.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    }));
    expect(earthView).toHaveFocus();
  });

  it('shows highlighted command examples that the parser accepts', async () => {
    render(<VoiceControl onCommand={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start voice control' }));

    const commandList = screen.getByRole('region', { name: 'Available commands' });
    const examples = Array.from(commandList.querySelectorAll('code'), (element) => (
      element.textContent.replace(/[“”]/g, '')
    ));

    expect(examples).toContain('Show thermal view');
    expect(examples).toContain('Play CO₂');
    expect(examples).toContain('Go to 2000');
    expect(examples.length).toBeGreaterThan(10);
    examples.forEach((example) => {
      expect(parseVoiceCommand(example), `Expected "${example}" to be supported`).not.toBeNull();
    });
  });

  it('ignores a final transcript that arrives after listening was stopped', async () => {
    const onCommand = vi.fn();
    render(<VoiceControl onCommand={onCommand} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Start voice control' }));
    const recognition = recognitionInstances[0];
    fireEvent.click(screen.getByRole('button', { name: 'Stop listening' }));
    act(() => recognition.emitFinal('Show thermal view'));

    await waitFor(() => expect(onCommand).not.toHaveBeenCalled());
    expect(screen.getByText('Listening stopped.')).toBeInTheDocument();
  });

  it('closes the dialog with its close button and restores focus to the trigger', async () => {
    render(<VoiceControl onCommand={vi.fn()} />);
    const trigger = await screen.findByRole('button', { name: 'Start voice control' });
    fireEvent.click(trigger);

    expect(await screen.findByRole('dialog', { name: 'VOICE CONTROL' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close voice panel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('closes the dialog with Escape and restores focus to the trigger', async () => {
    render(<VoiceControl onCommand={vi.fn()} />);
    const trigger = await screen.findByRole('button', { name: 'Start voice control' });
    fireEvent.click(trigger);

    expect(await screen.findByRole('dialog', { name: 'VOICE CONTROL' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('keeps the voice button and opens the manual-control fallback when unsupported', async () => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    render(<VoiceControl onCommand={vi.fn()} />);

    const trigger = await screen.findByRole('button', { name: 'Start voice control' });
    fireEvent.click(trigger);

    expect(await screen.findByRole('dialog', { name: 'VOICE CONTROL' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/unavailable in this browser/i);
  });
});
