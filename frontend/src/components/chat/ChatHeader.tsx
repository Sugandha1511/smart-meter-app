import { logout } from '../../services/auth.service';
import { useWorkOrderStore } from '../../store/workOrder.store';

export default function ChatHeader({
  title = 'Yukti',
  subtitle = 'Meter Installation'
}: {
  title?: string;
  subtitle?: string;
}) {
  const { language, setLanguage } = useWorkOrderStore();

  return (
    <header className="chat-header">
      <div>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{title}</div>
        <div className="meta">{subtitle}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className="progress-chip">Online</span>
        <button
          type="button"
          className={`lang-toggle ${language === 'en' ? '' : 'active'}`}
          onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
          title="Toggle language"
        >
          {language === 'en' ? 'EN' : 'हिं'}
        </button>
        <button
          type="button"
          className="btn logout"
          onClick={logout}
          title="Logout"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
