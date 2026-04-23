import { WorkOrderSummary } from '../../types/work-order';

interface Props {
  items: WorkOrderSummary[];
  onSelect: (id: string) => void;
}

export default function WorkOrderCards({ items, onSelect }: Props) {
  return (
    <div className="grid">
      {items.map((item) => (
        <button key={item.id} onClick={() => onSelect(item.id)} className="card work-order-card">
          <div style={{ fontWeight: 700 }}>{item.customerName}</div>
          <div className="meta">{item.address}</div>
          <div style={{ marginTop: 8, fontSize: 14 }}>WO: {item.workOrderNumber}</div>
          <div className="meta">Status: {item.status}</div>
        </button>
      ))}
    </div>
  );
}
