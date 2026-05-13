import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatHeader from '../components/chat/ChatHeader';
import { startWorkOrder } from '../services/workOrder.service';
import { logout } from '../services/auth.service';
import { useWorkOrderStore } from '../store/workOrder.store';

const WORK_ORDER_TYPES = [
  { en: 'Feeder Survey',      hi: 'फीडर सर्वे',         value: 'feeder_survey'      },
  { en: 'DT Survey',          hi: 'DT सर्वे',            value: 'dt_survey'          },
  { en: 'Consumer Survey',    hi: 'उपभोक्ता सर्वे',      value: 'consumer_survey'    },
  { en: 'Meter Installation', hi: 'मीटर इंस्टॉलेशन',    value: 'meter_installation' },
];

const DC_OPTIONS = [
  { en: 'Katara Hills',       hi: 'कटारा हिल्स',        value: 'katara_hills'       },
  { en: 'Shahpura Zone',      hi: 'शाहपुरा ज़ोन',       value: 'shahpura_zone'      },
  { en: 'Shakti Nagar',       hi: 'शक्ति नगर',          value: 'shakti_nagar'       },
  { en: 'Vallabh Nagar Zone', hi: 'वल्लभ नगर ज़ोन',    value: 'vallabh_nagar_zone' },
  { en: 'Vidhya Nagar Zone',  hi: 'विद्या नगर ज़ोन',   value: 'vidhya_nagar_zone'  },
];

const T = {
  start:         { en: 'Type "Hi" to get started.',                              hi: 'शुरू करने के लिए "नमस्ते" टाइप करें।' },
  welcome:       { en: 'Welcome to Yukti!\n\nPlease select the type of work order you want to execute.', hi: 'Yukti में आपका स्वागत है!\n\nकृपया उस कार्य आदेश का प्रकार चुनें जिसे आप निष्पादित करना चाहते हैं।' },
  selectDC:      { en: 'Please select your Distribution Circuit (DC).',           hi: 'कृपया अपना वितरण सर्किट (DC) चुनें।' },
  enterIvrs:     { en: 'Please enter the Consumer IVRS number.',                   hi: 'कृपया उपभोक्ता IVRS नंबर दर्ज करें।' },
  comingSoon:    { en: 'is coming soon. Please select Meter Installation.',        hi: 'जल्द आ रहा है। कृपया मीटर इंस्टॉलेशन चुनें।' },
  ivrsPlaceholder: { en: 'Enter Consumer IVRS number…',                           hi: 'उपभोक्ता IVRS नंबर दर्ज करें…' },
  selectAbove:   { en: 'Select an option above…',                                  hi: 'ऊपर से एक विकल्प चुनें…' },
  validating:    { en: 'Validating…',                                              hi: 'जाँच हो रही है…' },
  redirecting:   { en: 'Redirecting…',                                             hi: 'रीडायरेक्ट हो रहा है…' },
  checking:      { en: 'Checking…',                                                hi: 'जाँच हो रही है…' },
  send:          { en: 'Send',                                                      hi: 'भेजें' },
  notFound:      { en: 'IVRS not found. Please check the number and DC selection.', hi: 'IVRS नहीं मिला। कृपया नंबर और DC चयन जाँचें।' },
  verified:      { en: '✅ Consumer verified!',                                    hi: '✅ उपभोक्ता सत्यापित!' },
  starting:      { en: 'Starting Meter Installation workflow…',                    hi: 'मीटर इंस्टॉलेशन वर्कफ़्लो शुरू हो रहा है…' },
  name:          { en: 'Name',     hi: 'नाम' },
  address:       { en: 'Address',  hi: 'पता' },
  phase:         { en: 'Phase',    hi: 'फेज़' },
  dc:            { en: 'DC',       hi: 'DC' },
  retryIvrs:     { en: 'Please re-enter the Consumer IVRS number.',               hi: 'कृपया उपभोक्ता IVRS नंबर फिर से दर्ज करें।' },
  hiPrompt:      { en: 'Hi',       hi: 'नमस्ते' },
};

interface Message { id: string; sender: 'bot' | 'user'; text: string; }

type Stage = 'start' | 'type_selection' | 'dc_selection' | 'ivrs_entry' | 'validating' | 'confirmed';

export default function HomePage() {
  const navigate = useNavigate();
  const { language, setLanguage } = useWorkOrderStore();
  const t = (key: keyof typeof T) => language === 'hi' ? T[key].hi : T[key].en;
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
    const text = input.trim() || t('hiPrompt');
    setInput('');
    setMessages([
      { id: '1', sender: 'user', text },
      { id: '2', sender: 'bot', text: t('welcome') },
    ]);
    setStage('type_selection');
  };

  const handleTypeSelect = (type: typeof WORK_ORDER_TYPES[number]) => {
    const label = language === 'hi' ? type.hi : type.en;
    if (type.value === 'meter_installation') {
      addMessages(
        { sender: 'user', text: label },
        { sender: 'bot', text: t('selectDC') }
      );
      setStage('dc_selection');
    } else {
      addMessages(
        { sender: 'user', text: label },
        { sender: 'bot', text: `${label} ${t('comingSoon')}` }
      );
    }
  };

  const handleDcSelect = (dc: typeof DC_OPTIONS[number]) => {
    setSelectedDc(dc.value);
    setError('');
    const label = language === 'hi' ? dc.hi : dc.en;
    addMessages(
      { sender: 'user', text: label },
      { sender: 'bot', text: t('enterIvrs') }
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
      const dcOption = DC_OPTIONS.find(d => d.value === selectedDc);
      const dcLabel = dcOption ? (language === 'hi' ? dcOption.hi : dcOption.en) : selectedDc;
      addMessages({
        sender: 'bot',
        text: `${t('verified')}\n\n` +
          `${t('name')}: ${result.consumer_name}\n` +
          (result.address ? `${t('address')}: ${result.address}\n` : '') +
          `${t('phase')}: ${result.phase}\n` +
          `${t('dc')}: ${dcLabel}\n\n` +
          t('starting')
      });
      setStage('confirmed');
      setTimeout(() => navigate(`/work-orders/${result.work_order_id}`), 1500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? t('notFound');
      setError(msg);
      addMessages({ sender: 'bot', text: `❌ ${msg}\n\n${t('retryIvrs')}` });
      setStage('ivrs_entry');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const footerContent = () => {
    if (stage === 'start') {
      return (
        <>
          <button type="button" className="icon-btn" title="Location" aria-label="Location">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </button>
          <input
            ref={inputRef}
            className="start-text-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={language === 'hi' ? '"नमस्ते" टाइप करें…' : 'Type "Hi" to get started…'}
            onKeyDown={e => { if (e.key === 'Enter') handleStart(); }}
            autoFocus
          />
          <button type="button" className="icon-btn" title="Camera" aria-label="Camera">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          <button type="button" className="icon-btn" title="Voice" aria-label="Voice" onClick={handleStart}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        </>
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
              placeholder={t('ivrsPlaceholder')}
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
              {loading ? <><span className="spinner" />{t('checking')}</> : t('send')}
            </button>
          </div>
        </div>
      );
    }
    if (stage === 'validating' || stage === 'confirmed') {
      return (
        <div className="row">
          <input className="text-input" placeholder={stage === 'confirmed' ? t('redirecting') : t('validating')} readOnly style={{ flex: 1, opacity: 0.5 }} />
          <button type="button" className="btn primary" disabled>{t('send')}</button>
        </div>
      );
    }
    // type_selection / dc_selection — show greyed input below chips
    return (
      <div className="row">
        <input className="text-input" placeholder={t('selectAbove')} readOnly style={{ flex: 1, opacity: 0.5 }} />
        <button type="button" className="btn primary" disabled>{t('send')}</button>
      </div>
    );
  };

  return (
    <div className="chat-layout">
      <ChatHeader subtitle="Yukti Field App" />

      <main className="chat-main">
        {stage === 'start' && (
          <div className="message bot">
            {language === 'hi'
              ? <>शुरू करने के लिए <strong>"नमस्ते"</strong> टाइप करें।</>
              : <>Type <strong>"Hi"</strong> to get started.</>}
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} className={`message ${m.sender}`} style={{ whiteSpace: 'pre-line' }}>{m.text}</div>
        ))}

        {stage === 'type_selection' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0 12px' }}>
            {WORK_ORDER_TYPES.map(wt => (
              <button key={wt.value} type="button" className="btn secondary"
                style={{ borderRadius: 20, padding: '8px 18px', fontSize: 14 }}
                onClick={() => handleTypeSelect(wt)}>
                {language === 'hi' ? wt.hi : wt.en}
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
                {language === 'hi' ? dc.hi : dc.en}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      <footer className={stage === 'start' ? 'start-bar' : 'input-bar'}>{footerContent()}</footer>
    </div>
  );
}

