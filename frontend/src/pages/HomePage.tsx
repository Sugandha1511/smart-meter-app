import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import ChatHeader from '../components/chat/ChatHeader';
import WorkOrderCards from '../components/chat/WorkOrderCards';
import { getAssignedWorkOrders } from '../services/workOrder.service';

const WORK_ORDER_TYPES = [
  { label: 'Feeder Survey',    value: 'feeder_survey'     },
  { label: 'DT Survey',        value: 'dt_survey'         },
  { label: 'Consumer Survey',  value: 'consumer_survey'   },
  { label: 'Meter Installation', value: 'meter_installation' },
];

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
}

type Stage = 'start' | 'type_selection' | 'show_orders';

export default function HomePage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('start');
  const [selectedType, setSelectedType] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['assigned-work-orders', selectedType],
    queryFn: () => getAssignedWorkOrders(selectedType),
    enabled: stage === 'show_orders' && selectedType !== '',
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, stage, workOrders]);

  const handleStart = () => {
    const text = input.trim() || 'Hi';
    setInput('');
    setMessages([
      { id: '1', sender: 'user', text },
      {
        id: '2',
        sender: 'bot',
        text: 'Welcome to Yukti!\n\nPlease select the type of work order you want to execute.',
      },
    ]);
    setStage('type_selection');
  };

  const handleTypeSelect = (type: (typeof WORK_ORDER_TYPES)[number]) => {
    const userMsg: Message = { id: crypto.randomUUID(), sender: 'user', text: type.label };
    if (type.value === 'meter_installation') {
      const botMsg: Message = {
        id: crypto.randomUUID(),
        sender: 'bot',
        text: 'Here are your assigned Meter Installation work orders. Please select one to begin.',
      };
      setMessages((prev) => [...prev, userMsg, botMsg]);
      setSelectedType(type.value);
      setStage('show_orders');
    } else {
      const botMsg: Message = {
        id: crypto.randomUUID(),
        sender: 'bot',
        text: `${type.label} is coming soon. Please select Meter Installation.`,
      };
      setMessages((prev) => [...prev, userMsg, botMsg]);
    }
  };

  return (
    <div className="chat-layout">
      <ChatHeader subtitle="Yukti Field App" />

      <main className="chat-main">
        {stage === 'start' && (
          <div className="message bot" style={{ whiteSpace: 'pre-line' }}>
            Type <strong>"Hi"</strong> to get started.
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`message ${m.sender}`} style={{ whiteSpace: 'pre-line' }}>
            {m.text}
          </div>
        ))}

        {(stage === 'type_selection') && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0 12px' }}>
            {WORK_ORDER_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                className="btn secondary"
                style={{ borderRadius: 20, padding: '8px 18px', fontSize: 14 }}
                onClick={() => handleTypeSelect(t)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {stage === 'show_orders' && (
          isLoading
            ? <div className="message bot">Loading work orders...</div>
            : <WorkOrderCards items={workOrders} onSelect={(id) => navigate(`/work-orders/${id}`)} />
        )}

        <div ref={bottomRef} />
      </main>

      <footer className="input-bar">
        {stage === 'start' ? (
          <div className="row">
            <input
              className="text-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Type "Hi" to start…'
              style={{ flex: 1 }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleStart(); }}
              autoFocus
            />
            <button type="button" className="btn primary" onClick={handleStart}>
              Send
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <span className="meta" style={{ fontSize: 13 }}>
              {stage === 'show_orders' ? 'Tap a work order above to begin' : 'Select a work order type above'}
            </span>
          </div>
        )}
      </footer>
    </div>
  );
}

