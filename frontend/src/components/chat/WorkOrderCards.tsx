import { WorkOrderSummary } from '../../types/work-order';

interface Props {
  items: WorkOrderSummary[];
  onSelect: (id: string) => void;
}

function statusBadge(status: string) {
  const label =
    status === 'submitted' ? 'Submitted' :
    status === 'in_progress' ? 'In Progress' :
    'Pending';
  const cls =
    status === 'submitted' ? 'badge submitted' :
    status === 'in_progress' ? 'badge in_progress' :
    'badge pending';
  return <span className={cls}>{label}</span>;
}

export default function WorkOrderCards({ items, onSelect }: Props) {
  return (
    <div className="grid">
      {items.map((item) => (
        <button key={item.id} onClick={() => onSelect(item.id)} className="card work-order-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 700 }}>{item.customerName}</div>
            {statusBadge(item.status)}
          </div>
          <div className="meta" style={{ marginTop: 4 }}>{item.address}</div>
          <div style={{ marginTop: 8, fontSize: 13, display: 'flex', gap: 12 }}>
            <span>WO: <strong>{item.workOrderNumber}</strong></span>
            {item.meterType && <span className="meta">{item.meterType}</span>}
          </div>
          {item.scheduledDate && (
            <div className="meta" style={{ marginTop: 4 }}>Scheduled: {item.scheduledDate}</div>
          )}
        </button>
      ))}
    </div>
  );
}
