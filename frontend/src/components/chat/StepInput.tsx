import { useMemo, useRef, useState } from 'react';
import { WorkOrderStep } from '../../types/work-order';

interface Props {
  step: WorkOrderStep;
  language?: 'en' | 'hi';
  onSubmit: (value: unknown, inputMode?: string) => void;
}

export default function StepInput({ step, language = 'en', onSubmit }: Props) {
  const [value, setValue] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const label = language === 'hi' ? step.labelHi : step.labelEn;
  const canSubmitText = useMemo(() => value.trim().length > 0, [value]);

  const startVoice = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;

    if (!SR) {
      alert('Voice input is not supported in this browser. Please type your answer.');
      return;
    }

    const recognition = new SR();
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string;
      setValue(transcript);
      setCapturing(false);
    };
    recognition.onerror = () => setCapturing(false);
    recognition.onend = () => setCapturing(false);

    setCapturing(true);
    recognition.start();
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setCapturing(false);
  };

  // GPS capture step
  if (step.fieldKey === 'gps_location') {
    return (
      <div className="grid">
        <button
          type="button"
          className="btn gps full-width"
          disabled={capturing}
          onClick={() => {
            setCapturing(true);
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                setCapturing(false);
                onSubmit(
                  { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy },
                  'gps'
                );
              },
              () => {
                setCapturing(false);
                onSubmit({ lat: 28.6139, lng: 77.2090, accuracy: 0, error: 'GPS unavailable – using fallback' }, 'gps');
              },
              { enableHighAccuracy: true, timeout: 10000 }
            );
          }}
        >
          {capturing ? (
            <><span className="spinner" />Capturing GPS...</>
          ) : (
            'Capture GPS Location'
          )}
        </button>
      </div>
    );
  }

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
            {language === 'hi' ? option.labelHi : option.labelEn}
          </button>
        ))}
        <div className="row" style={{ marginTop: 4 }}>
          <input
            className="text-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={language === 'hi' ? 'या यहाँ टाइप करें…' : 'Or type here…'}
            style={{ flex: 1 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value.trim()) onSubmit(value.trim(), 'text');
            }}
          />
          <button
            type="button"
            className="btn primary"
            disabled={!canSubmitText}
            onClick={() => onSubmit(value.trim(), 'text')}
          >
            Send
          </button>
        </div>
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
          placeholder={label}
          style={{ flex: 1 }}
        />
        {step.inputType === 'voice_text' && (
          <button
            type="button"
            className={`btn ${capturing ? 'primary' : 'secondary'}`}
            style={{ minWidth: 54 }}
            onClick={capturing ? stopVoice : startVoice}
          >
            {capturing ? '⏹' : '🎤'}
          </button>
        )}
        <button
          type="button"
          className="btn primary"
          disabled={!canSubmitText}
          onClick={() => onSubmit(value.trim(), step.inputType === 'voice_text' ? 'voice_text' : 'text')}
        >
          Next
        </button>
      </div>
    );
  }

  if (step.inputType === 'photo' || step.inputType === 'video') {
    return (
      <div className="grid">
        {previewUrl && step.inputType === 'photo' && (
          <img src={previewUrl} alt="Captured" className="file-preview" />
        )}
        {previewUrl && step.inputType === 'video' && (
          <div className="file-preview-label">✅ Video selected — tap below to replace</div>
        )}
        <input
          type="file"
          accept={step.inputType === 'photo' ? 'image/*' : 'video/*'}
          capture="environment"
          className="file-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setPreviewUrl(step.inputType === 'photo' ? URL.createObjectURL(file) : 'video');
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

