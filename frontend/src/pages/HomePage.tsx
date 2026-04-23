import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import ChatHeader from '../components/chat/ChatHeader';
import ChatMessageList from '../components/chat/ChatMessageList';

interface ChatMsg {
  id: string;
  sender: 'user' | 'bot';
  text: string;
}

type WorkOrderType = 'feeder_survey' | 'dt_survey' | 'consumer_survey' | 'meter_installation';

const WORK_ORDER_OPTIONS: Array<{ id: WorkOrderType; label: string }> = [
  { id: 'feeder_survey', label: 'Feeder Survey' },
  { id: 'dt_survey', label: 'DT Survey' },
  { id: 'consumer_survey', label: 'Consumer Survey' },
  { id: 'meter_installation', label: 'Meter Installation' }
];

export default function HomePage() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const canSend = useMemo(() => text.trim().length > 0, [text]);
  const hasStarted = messages.length > 0;

  const sendGreeting = () => {
    if (!canSend) return;
    const userText = text.trim();
    setText('');
    setNotice(null);
    setMessages([
      { id: crypto.randomUUID(), sender: 'user', text: userText },
      {
        id: crypto.randomUUID(),
        sender: 'bot',
        text: 'Hi! Which type of work order do you want to execute?'
      }
    ]);
    setShowOptions(true);
  };

  const selectType = (opt: (typeof WORK_ORDER_OPTIONS)[number]) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), sender: 'user', text: opt.label }
    ]);

    if (opt.id === 'meter_installation') {
      setShowOptions(false);
      setNotice(null);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), sender: 'bot', text: 'Great, starting Meter Installation...' }
      ]);
      setTimeout(() => navigate(`/work-orders/${crypto.randomUUID()}`), 350);
      return;
    }

    setNotice(`${opt.label} is coming soon. Please select Meter Installation for now.`);
  };

  if (hasStarted) {
    return (
      <div className="chat-layout">
        <ChatHeader subtitle="Select work order type" />
        <main className="chat-main">
          <ChatMessageList messages={messages} />
          {notice ? (
            <div className="preview-alert warn" style={{ maxWidth: 560 }}>
              {notice}
            </div>
          ) : null}
        </main>
        <footer className="input-bar">
          {showOptions ? (
            <div className="grid">
              {WORK_ORDER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="btn secondary full-width"
                  onClick={() => selectType(opt)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="message bot">Loading...</div>
          )}
        </footer>
      </div>
    );
  }

  return (
    <div className="welcome-shell" style={{ position: 'relative' }}>
      <button type="button" className="icon-btn welcome-action" aria-label="Quick action">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <main style={{ flex: 1 }}>
        <div className="welcome-top">
          <h1 className="welcome-title">
            Welcome to <br />
            <span className="welcome-brand">Yukti</span>
          </h1>
          <div className="welcome-hint">Type “Hi” in the chat window to start work orders</div>
        </div>
      </main>

      <footer className="composer-bar">
        <div className="composer">
          <button type="button" className="icon-btn" aria-label="Location">
            <svg className="composer-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M12 10.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
          </button>

          <div className="composer-pill">
            <input
              className="composer-input"
              placeholder="Type 'Hi' to begin"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendGreeting();
              }}
            />
            <button type="button" className="icon-btn" aria-label="Camera" onClick={sendGreeting}>
              <svg className="composer-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M8 7l1.2-2h5.6L16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            </button>
            <button type="button" className="icon-btn" aria-label="Mic" onClick={sendGreeting}>
              <svg className="composer-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M19 11a7 7 0 0 1-14 0"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M12 18v3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
