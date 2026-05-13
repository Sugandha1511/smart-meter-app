import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatHeader from '../components/chat/ChatHeader';
import { startWorkOrder } from '../services/workOrder.service';

const WORK_ORDER_TYPES = [
  { label: 'Feeder Survey',      value: 'feeder_survey'      },
  { label: 'DT Survey',          value: 'dt_survey'          },
  { label: 'Consumer Survey',    value: 'consumer_survey'    },
  { label: 'Meter Installation', value: 'meter_installation' },
];

const DC_OPTIONS = [
  { label: 'Katara Hills',       value: 'katara_hills'       },
  { label: 'Shahpura Zone',      value: 'shahpura_zone'      },
  { label: 'Shakti Nagar',       value: 'shakti_nagar'       },
  { label: 'Vallabh Nagar Zone', value: 'vallabh_nagar_zone' },
  { label: 'Vidhya Nagar Zone',  value: 'vidhya_nagar_zone'  },
];

interface Message { id: string; sender: 'bot' | 'user'; text: string; }

type Stage = 'start' | 'type_selection' | 'dc_selection' | 'ivrs_entry' | 'validating' | 'confirmed';

export default function HomePage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('start');
  const [selectedDc, setSelectedDc] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, stage]);

  useEffect(() => {
    if (stage === 'ivrs_entry') inputRef.current?.focus();
  }, [stage]);

  const addMessages = (...msgs: Omit<Message, 'id'>[]) =>
    setMessages(prev => [...prev, ...msgs.map(m => ({ ...m, id: crypto.randomUUID() }))]);

  const handleStart = () => {
    const text = input.trim() || 'Hi';
    setInput('');
    setMessages([
      { id: '1', sender: 'user', text },
      { id: '2', sender: 'bot', text: 'Welcome to Yukti!\n\nPlease select the type of work order you want to execute.' },
    ]);
    setStage('type_selection');
  };

  const handleTypeSelect = (type: typeof WORK_ORDER_TYPES[number]) => {
    if (type.value === 'meter_installation') {
      addMessages(
        { sender: 'user', text: type.label },
        { sender: 'bot', text: 'Please select your Distribution Circuit (DC).' }
      );
      setStage('dc_selection');
    } else {
      addMessages(
        { sender: 'user', text: type.label },
        { sender: 'bot', text: `${type.label} is coming soon. Please select Meter Installation.` }
      );
    }
  };

  const handleDcSelect = (dc: typeof DC_OPTIONS[number]) => {
    setSelectedDc(dc.value);
    setError('');
    addMessages(
      { sender: 'user', text: dc.label },
      { sender: 'bot', text: 'Please enter the Consumer IVRS number.' }
    );
    setStage('ivrs_entry');
  };

  const handleIvrsSubmit = async () => {
    const ivrs = input.trim();
    if (!ivrs) return;
    setInput('');
    setError('');
    setLoading(true);
    addMessages({ sender: 'user', text: ivrs });
    setStage('validating');

    try {
      const result = await startWorkOrder(selectedDc, ivrs);
      const dcLabel = DC_OPTIONS.find(d => d.value === selectedDc)?.label ?? selectedDc;
      addMessages({
        sender: 'bot',
        text: `✅ Consumer verified!\n\n` +
          `Name: ${result.consumer_name}\n` +
          (result.address ? `Address: ${result.address}\n` : '') +
          `Phase: ${result.phase}\n` +
          `DC: ${dcLabel}\n\n` +
          `Starting Meter Installation workflow…`
      });
      setStage('confirmed');
      setTimeout(() => navigate(`/work-orders/${result.work_order_id}`), 1500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'IVRS not found. Please check the number and DC selection.';
      setError(msg);
      addMessages({ sender: 'bot', text: `❌ ${msg}\n\nPlease re-enter the Consumer IVRS number.` });
      setStage('ivrs_entry');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const footerContent = () => {
    if (stage === 'start') {
      return (
        <div className="row">
          <input
            ref={inputRef}
            className="text-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder='Type "Hi" to start…'
            style={{ flex: 1 }}
            onKeyDown={e => { if (e.key === 'Enter') handleStart(); }}
            autoFocus
          />
          <button type="button" className="btn primary" onClick={handleStart}>Send</button>
        </div>
      );
    }
    if (stage === 'ivrs_entry') {
      return (
        <div className="grid">
          {error && <div className="meta" style={{ color: '#dc2626', fontSize: 13 }}>{error}</div>}
          <div className="row">
            <input
              ref={inputRef}
              className="text-input"
              value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              placeholder="Enter Consumer IVRS number…"
              style={{ flex: 1 }}
              onKeyDown={e => { if (e.key === 'Enter') void handleIvrsSubmit(); }}
              disabled={loading}
            />
            <button
              type="button"
              className="btn primary"
              onClick={() => void handleIvrsSubmit()}
              disabled={!input.trim() || loading}
            >
              {loading ? <><span className="spinner" />Checking…</> : 'Send'}
            </button>
          </div>
        </div>
      );
    }
    if (stage === 'validating' || stage === 'confirmed') {
      return (
        <div className="row">
          <input className="text-input" placeholder={stage === 'confirmed' ? 'Redirecting…' : 'Validating…'} readOnly style={{ flex: 1, opacity: 0.5 }} />
          <button type="button" className="btn primary" disabled>Send</button>
        </div>
      );
    }
    // type_selection / dc_selection — show greyed input below chips
    return (
      <div className="row">
        <input className="text-input" placeholder="Select an option above…" readOnly style={{ flex: 1, opacity: 0.5 }} />
        <button type="button" className="btn primary" disabled>Send</button>
      </div>
    );
  };

  return (
    <div className="chat-layout">
      <ChatHeader subtitle="Yukti Field App" />

      <main className="chat-main">
        {stage === 'start' && (
          <div className="message bot">Type <strong>"Hi"</strong> to get started.</div>
        )}

        {messages.map(m => (
          <div key={m.id} className={`message ${m.sender}`} style={{ whiteSpace: 'pre-line' }}>{m.text}</div>
        ))}

        {stage === 'type_selection' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0 12px' }}>
            {WORK_ORDER_TYPES.map(t => (
              <button key={t.value} type="button" className="btn secondary"
                style={{ borderRadius: 20, padding: '8px 18px', fontSize: 14 }}
                onClick={() => handleTypeSelect(t)}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {stage === 'dc_selection' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0 12px' }}>
            {DC_OPTIONS.map(dc => (
              <button key={dc.value} type="button" className="btn secondary"
                style={{ borderRadius: 20, padding: '8px 18px', fontSize: 14 }}
                onClick={() => handleDcSelect(dc)}>
                {dc.label}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      <footer className="input-bar">{footerContent()}</footer>
    </div>
  );
}

