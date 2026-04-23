export default function ChatHeader({ title = 'Yukti', subtitle = 'Meter Installation' }: { title?: string; subtitle?: string }) {
  return (
    <header className="chat-header">
      <div>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{title}</div>
        <div className="meta">{subtitle}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className="progress-chip">Online</span>
        <span className="meta">EN | हिन्दी</span>
      </div>
    </header>
  );
}
