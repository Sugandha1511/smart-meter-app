import { useEffect, useMemo, useRef, useState } from 'react';
import { WorkOrderStep } from '../../types/work-order';

interface Props {
  step: WorkOrderStep;
  onSubmit: (value: unknown, inputMode?: string) => void;
}

export default function StepInput({ step, onSubmit }: Props) {
  const [value, setValue] = useState('');
  const [capturing, setCapturing] = useState(false);

  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedValue = useMemo(() => {
    if (step.inputType === 'voice_text') {
      // The workflow validation expects a compact alphanumeric string (no spaces/punctuation).
      return value.replace(/[^0-9A-Za-z]/g, '').trim();
    }
    return value.trim();
  }, [step.inputType, value]);

  const canSubmitText = useMemo(() => normalizedValue.length > 0, [normalizedValue]);

  const stopRecognition = () => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    try {
      rec?.stop?.();
    } catch {
      // ignore; stop() can throw if recognition was never started
    }
    setCapturing(false);
  };

  const startRecognition = () => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setVoiceError('Voice recognition is not supported in this browser.');
      setValue('');
      setCapturing(false);
      return;
    }

    // Reset state for a fresh capture.
    setVoiceError(null);
    setValue('');

    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;

    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript ?? '';
      setValue(String(transcript).trim());
    };

    recognition.onerror = (event: any) => {
      const err = String(event?.error ?? '');
      const msg =
        err === 'not-allowed' ? 'Microphone permission denied.' : 'Voice input failed. Try again.';
      setVoiceError(msg);
      setValue('');
      stopRecognition();
    };

    recognition.onend = () => {
      setCapturing(false);
      recognitionRef.current = null;
    };

    try {
      setCapturing(true);
      recognition.start();
    } catch {
      setVoiceError('Unable to start voice capture. Try again.');
      setValue('');
      stopRecognition();
    }
  };

  useEffect(() => {
    // Cleanup if user navigates away.
    return () => stopRecognition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // If the step changes away from voice, stop any active recognition session.
    if (step.inputType !== 'voice_text') {
      stopRecognition();
      setVoiceError(null);
      setValue('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.inputType]);

  if (step.inputType === 'quick_reply' || step.inputType === 'select') {
    return (
      <div className="grid">
        {step.options?.map((option) => (
          <button
            key={option.value}
            type="button"
            className="btn secondary full-width"
            onClick={() => onSubmit(option.value, 'select')}
          >
            {option.labelEn}
          </button>
        ))}
      </div>
    );
  }

  if (step.inputType === 'text' || step.inputType === 'number' || step.inputType === 'voice_text') {
    return (
      <div className="row">
        <input
          className="text-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={step.inputType === 'voice_text' ? (capturing ? 'Listening...' : step.labelEn) : step.labelEn}
        />
        {step.inputType === 'voice_text' && (
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              if (capturing) stopRecognition();
              else startRecognition();
            }}
          >
            {capturing ? 'Stop' : 'Mic'}
          </button>
        )}
        <button
          type="button"
          className="btn primary"
          disabled={!canSubmitText}
          onClick={() =>
            onSubmit(
              step.inputType === 'voice_text' ? normalizedValue : value.trim(),
              step.inputType === 'voice_text' ? 'voice_text' : 'text'
            )
          }
        >
          Next
        </button>

        {step.inputType === 'voice_text' && voiceError ? (
          <div style={{ width: '100%', color: 'crimson', fontSize: 12, marginTop: 8 }}>{voiceError}</div>
        ) : null}
      </div>
    );
  }

  if (step.inputType === 'photo' || step.inputType === 'video') {
    const isPhoto = step.inputType === 'photo';
    return (
      <div className="row">
        <button
          type="button"
          className="btn primary full-width"
          onClick={() => fileInputRef.current?.click()}
        >
          {isPhoto ? 'Take / choose photo' : 'Record / choose video'}
        </button>
        {/* Visually hidden but focusable input — programmatically clicked above.
            Using `display: none` on a file input is unreliable on iOS Safari,
            so we use an off-screen visually-hidden style instead. */}
        <input
          ref={fileInputRef}
          type="file"
          accept={isPhoto ? 'image/*' : 'video/*'}
          capture="environment"
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            whiteSpace: 'nowrap',
            border: 0,
            opacity: 0,
            pointerEvents: 'none'
          }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Reset so the same file can be re-selected and so the filename
            // doesn't linger in the DOM.
            e.target.value = '';
            if (file) {
              onSubmit(file, 'file');
            }
          }}
        />
      </div>
    );
  }

  if (step.inputType === 'confirm') {
    return (
      <div className="grid">
        <button type="button" className="btn primary full-width" onClick={() => onSubmit(true, 'confirm')}>
          Continue
        </button>
      </div>
    );
  }

  return null;
}
