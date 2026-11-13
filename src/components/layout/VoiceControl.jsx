'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { parseVoiceCommand } from '../../lib/voiceCommandParser';

const UNKNOWN_COMMAND_MESSAGE = 'Sorry, I didn’t understand that command. Try from the commands list.';
const COMMAND_SECTION_BY_TYPE = {
  SET_VIEW: 'earth-view',
  SET_SONIFICATION: 'timeline-controls',
  PLAY: 'timeline-controls',
  RESUME: 'timeline-controls',
  PAUSE: 'timeline-controls',
  STOP: 'timeline-controls',
  SET_SPEED: 'timeline-controls',
  GO_TO_YEAR: 'timeline-controls',
  READ_TEMPERATURE: 'selected-observation',
  READ_CO2: 'selected-observation',
  READ_SEA_LEVEL: 'selected-observation',
  READ_VALUES: 'selected-observation',
  READ_YEAR: 'selected-observation',
  EXPLAIN_SONIFICATION: 'how-it-works',
};
const VOICE_COMMAND_GROUPS = [
  {
    label: 'Earth view',
    commands: ['Show satellite view', 'Show thermal view'],
  },
  {
    label: 'Sonification',
    commands: ['Play temperature', 'Play CO₂', 'Play sea level', 'Play both'],
  },
  {
    label: 'Timeline',
    commands: ['Go to 2000', 'What year am I viewing?'],
  },
  {
    label: 'Playback',
    commands: ['Play', 'Pause playback', 'Resume playback', 'Stop playback', 'Play faster', 'Play slower', 'Normal speed'],
  },
  {
    label: 'Read & explain',
    commands: ['Read current values', 'What is the current temperature?', 'What is the current CO₂ level?', 'What is the current sea level?', 'Explain the sea-level sound'],
  },
];

function getVoiceSupportSnapshot() {
  if (typeof window === 'undefined') return 'unknown';
  const canRecognize = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const canSpeak = typeof window.SpeechSynthesisUtterance === 'function'
    && typeof window.speechSynthesis?.speak === 'function';
  return `${canRecognize ? '1' : '0'}${canSpeak ? '1' : '0'}`;
}

function subscribeToVoiceSupport() {
  return () => {};
}

function getRecognitionErrorMessage(code) {
  if (code === 'not-allowed' || code === 'service-not-allowed') {
    return 'Microphone access was denied. Allow microphone access in your browser and try again.';
  }
  if (code === 'audio-capture') return 'No microphone is available. Connect a microphone and try again.';
  if (code === 'network') return 'The browser speech service had a network error. Try again.';
  if (code === 'no-speech') return 'No speech was detected. Try again.';
  if (code === 'aborted') return 'Voice recognition stopped. You can try again.';
  return `Speech recognition failed${code ? ` (${code})` : ''}. Try again.`;
}

function getCommandSectionId(command) {
  return COMMAND_SECTION_BY_TYPE[command.type] ?? 'experience';
}

function navigateToCommandSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) {
    console.warn(`Voice command destination #${sectionId} was not found.`);
    return;
  }

  if (typeof section.scrollIntoView === 'function') {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'center',
    });
  }
  section.focus({ preventScroll: true });
}

function MicrophoneIcon() {
  return (
    <svg className="voice-mic-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="7" y="2.5" width="6" height="10" rx="3" />
      <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5M7 17.5h6" />
    </svg>
  );
}

export default function VoiceControl({ onCommand, onBeforeListening }) {
  const voiceSupport = useSyncExternalStore(
    subscribeToVoiceSupport,
    getVoiceSupportSnapshot,
    () => 'unknown',
  );
  const recognitionSupported = voiceSupport === 'unknown' ? null : voiceSupport[0] === '1';
  const speechSupported = voiceSupport[1] === '1';
  const [panelOpen, setPanelOpen] = useState(false);
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [feedback, setFeedback] = useState('');
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const recognitionRef = useRef(null);
  const sessionRef = useRef(0);
  const processedSessionRef = useRef(0);
  const processingRef = useRef(false);
  const listeningRef = useRef(false);
  const recognitionErrorRef = useRef(false);
  const speechSupportedRef = useRef(false);
  const speechEnabledRef = useRef(true);
  const transcriptRef = useRef('');
  const triggerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const panelRef = useRef(null);
  const closePanelRef = useRef(null);
  const restoreFocusOnCloseRef = useRef(false);
  const onCommandRef = useRef(onCommand);
  const onBeforeListeningRef = useRef(onBeforeListening);
  const statusTimerRef = useRef(null);

  useEffect(() => {
    onCommandRef.current = onCommand;
    onBeforeListeningRef.current = onBeforeListening;
  }, [onBeforeListening, onCommand]);

  useEffect(() => {
    speechSupportedRef.current = speechSupported;
  }, [speechSupported]);

  useEffect(() => () => {
    sessionRef.current += 1;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      try {
        recognition.abort();
      } catch (error) {
        if (error?.name !== 'InvalidStateError') {
          console.warn('Voice recognition cleanup failed:', error);
        }
      }
    }
    if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
    window.speechSynthesis?.cancel();
  }, []);

  const updateStatus = (nextStatus, message = '') => {
    setStatus(nextStatus);
    setFeedback(message);
  };

  const scheduleStatusReset = (sessionId) => {
    if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
    statusTimerRef.current = window.setTimeout(() => {
      if (sessionRef.current === sessionId) setStatus('idle');
    }, 5000);
  };

  const speakResponse = (message, sessionId) => {
    if (!speechEnabledRef.current || !speechSupportedRef.current || !message) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(message);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      utterance.onerror = () => {
        if (sessionRef.current === sessionId) {
          updateStatus('error', 'Speech output failed; the response is still available as text.');
        }
      };
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      updateStatus('error', `Speech output failed: ${error.message}`);
    }
  };

  const executeTranscript = async (spokenText, sessionId) => {
    const command = parseVoiceCommand(spokenText);
    if (!command) {
      if (sessionRef.current !== sessionId) return;
      setLastCommand('No supported command recognized');
      updateStatus('error', UNKNOWN_COMMAND_MESSAGE);
      speakResponse(UNKNOWN_COMMAND_MESSAGE, sessionId);
      processingRef.current = false;
      scheduleStatusReset(sessionId);
      return;
    }

    setLastCommand(spokenText);
    try {
      const result = await onCommandRef.current(command);
      if (sessionRef.current !== sessionId) return;
      const message = result?.message || 'Command completed.';
      updateStatus(result?.ok === false ? 'error' : 'success', message);
      closePanel({ restoreFocus: false, cancelSpeech: false });
      window.requestAnimationFrame(() => navigateToCommandSection(getCommandSectionId(command)));
      speakResponse(result?.speech || message, sessionRef.current);
    } catch (error) {
      if (sessionRef.current !== sessionId) return;
      const message = error instanceof Error
        ? `The command could not be completed: ${error.message}`
        : 'The command could not be completed. Try again.';
      updateStatus('error', message);
      speakResponse(message, sessionId);
    } finally {
      if (sessionRef.current === sessionId) {
        processingRef.current = false;
        scheduleStatusReset(sessionId);
      }
    }
  };

  const startListening = () => {
    if (listeningRef.current || processingRef.current) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      updateStatus('error', 'Voice recognition is not supported in this browser. Use the timeline and on-screen controls instead.');
      return;
    }

    let recognition;
    try {
      recognition = new Recognition();
    } catch (error) {
      updateStatus('error', `Could not start speech recognition: ${error.message}`);
      return;
    }

    const sessionId = ++sessionRef.current;
    processedSessionRef.current = 0;
    processingRef.current = false;
    listeningRef.current = true;
    recognitionErrorRef.current = false;
    recognitionRef.current = recognition;
    transcriptRef.current = '';
    setTranscript('');
    setLastCommand('');
    updateStatus('listening', '');

    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      if (sessionRef.current === sessionId) updateStatus('listening', '');
    };
    recognition.onresult = (event) => {
      if (sessionRef.current !== sessionId || !listeningRef.current) return;
      let interimText = '';
      let finalText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const phrase = result?.[0]?.transcript ?? '';
        if (result?.isFinal) finalText += phrase;
        else interimText += phrase;
      }

      const visibleText = (finalText || interimText).trim();
      if (visibleText) {
        transcriptRef.current = visibleText;
        setTranscript(visibleText);
      }
      if (!finalText.trim() || processedSessionRef.current === sessionId) return;

      processedSessionRef.current = sessionId;
      listeningRef.current = false;
      processingRef.current = true;
      updateStatus('processing', '');
      void executeTranscript(finalText.trim(), sessionId);
    };
    recognition.onerror = (event) => {
      if (sessionRef.current !== sessionId || processingRef.current) return;
      recognitionRef.current = null;
      listeningRef.current = false;
      recognitionErrorRef.current = true;
      updateStatus('error', getRecognitionErrorMessage(event.error));
    };
    recognition.onend = () => {
      if (sessionRef.current !== sessionId) return;
      recognitionRef.current = null;
      listeningRef.current = false;
      if (processingRef.current || recognitionErrorRef.current) return;
      updateStatus('error', transcriptRef.current
        ? 'No complete command was detected. Try again.'
        : 'No speech was detected. Try again.');
    };

    try {
      const audioPreparation = onBeforeListeningRef.current?.();
      if (audioPreparation && typeof audioPreparation.catch === 'function') {
        audioPreparation.catch((error) => {
          if (sessionRef.current === sessionId) {
            setFeedback(`Audio could not be prepared for voice playback: ${error.message}`);
          }
        });
      }
      recognition.start();
    } catch (error) {
      recognitionRef.current = null;
      listeningRef.current = false;
      recognitionErrorRef.current = true;
      updateStatus('error', `Could not start speech recognition: ${error.message}`);
    }
  };

  const stopListening = () => {
    const recognition = recognitionRef.current;
    sessionRef.current += 1;
    recognitionRef.current = null;
    listeningRef.current = false;
    processingRef.current = false;
    if (recognition) {
      try {
        recognition.abort();
      } catch (error) {
        if (error?.name !== 'InvalidStateError') {
          updateStatus('error', `Could not stop speech recognition: ${error.message}`);
          return;
        }
      }
    }
    updateStatus('idle', 'Listening stopped.');
  };

  const closePanel = ({ restoreFocus = true, cancelSpeech = true } = {}) => {
    stopListening();
    if (cancelSpeech) window.speechSynthesis?.cancel();
    restoreFocusOnCloseRef.current = restoreFocus;
    setPanelOpen(false);
  };
  useEffect(() => {
    closePanelRef.current = closePanel;
  });

  useEffect(() => {
    if (panelOpen || !restoreFocusOnCloseRef.current) return;
    restoreFocusOnCloseRef.current = false;
    triggerRef.current?.focus();
  }, [panelOpen]);

  useEffect(() => {
    if (!panelOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePanelRef.current?.();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = panelRef.current?.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panelRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panelRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [panelOpen]);

  const togglePanel = () => {
    if (panelOpen) {
      closePanel();
      return;
    }
    setPanelOpen(true);
    startListening();
  };

  const updateSpeechPreference = (enabled) => {
    speechEnabledRef.current = enabled;
    setSpeechEnabled(enabled);
    if (!enabled) window.speechSynthesis?.cancel();
  };

  if (recognitionSupported === null) return null;

  const statusText = {
    idle: 'Ready',
    listening: 'Listening…',
    processing: 'Processing command…',
    success: 'Command complete',
    error: 'Needs attention',
  }[status];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`voice-trigger ${status === 'listening' ? 'is-listening' : ''} ${panelOpen ? 'is-open' : ''}`}
        aria-label={panelOpen ? 'Close voice control panel' : 'Start voice control'}
        aria-expanded={panelOpen}
        aria-controls="voice-control-panel"
        aria-pressed={status === 'listening'}
        title={panelOpen ? 'Close voice control panel' : 'Start voice control'}
        onClick={togglePanel}
      >
        <MicrophoneIcon />
        <span className="voice-trigger-label">Voice</span>
      </button>

      {panelOpen && (
        <div
          className="voice-modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closePanel();
          }}
        >
          <section
            ref={panelRef}
            className="voice-panel"
            id="voice-control-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="voice-dialog-title"
            aria-describedby="voice-dialog-description"
          >
            <div className="voice-panel-header">
              <div>
                <span className="eyebrow" id="voice-dialog-title">VOICE CONTROL</span>
                <p id="voice-dialog-description">Explore the shared Earth timeline by speaking a command.</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="voice-close"
                aria-label="Close voice panel"
                onClick={() => closePanel()}
              >
                ×
              </button>
            </div>

            {recognitionSupported ? (
              <>
                <div className={`voice-status-line is-${status}`}>
                  <span className="voice-status-dot" aria-hidden="true" />
                  <span role="status" aria-live="polite" aria-atomic="true">{statusText}</span>
                  {status === 'listening' && (
                    <span className="voice-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
                  )}
                </div>

                <p className="voice-transcript" aria-live="polite">
                  {transcript || 'Your recognized speech will appear here.'}
                </p>
                {lastCommand && <p className="voice-last-command">LAST COMMAND · {lastCommand}</p>}
                {feedback && <p className={`voice-feedback is-${status}`} aria-live="polite">{feedback}</p>}

                <div className="voice-panel-actions">
                  <button
                    type="button"
                    className="voice-listen-button"
                    onClick={status === 'listening' ? stopListening : startListening}
                    disabled={status === 'processing'}
                  >
                    <MicrophoneIcon />
                    {status === 'listening' ? 'Stop listening' : status === 'processing' ? 'Processing…' : 'Start listening'}
                  </button>
                  <label className="voice-speech-toggle">
                    <input
                      type="checkbox"
                      checked={speechEnabled}
                      disabled={!speechSupported}
                      onChange={(event) => updateSpeechPreference(event.target.checked)}
                    />
                    <span>Speak responses</span>
                  </label>
                </div>
                {!speechSupported && <p className="voice-speech-note">Speech output is unavailable; confirmations remain on screen.</p>}
                <p className="voice-privacy">
                  Speech recognition depends on your browser and may use a remote service. This app does not save audio or transcripts.
                </p>
              </>
            ) : (
              <p className="voice-support-message" role="status">
                Voice recognition is unavailable in this browser. Use the timeline and on-screen controls instead.
              </p>
            )}

            <section className="voice-command-list" aria-labelledby="voice-command-list-title">
              <h3 id="voice-command-list-title">Available commands</h3>
              <div className="voice-command-groups">
                {VOICE_COMMAND_GROUPS.map(({ label, commands }) => (
                  <div className="voice-command-group" key={label}>
                    <p>{label}</p>
                    <ul>
                      {commands.map((command) => (
                        <li key={command}><code>“{command}”</code></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </section>
        </div>
      )}
    </>
  );
}
