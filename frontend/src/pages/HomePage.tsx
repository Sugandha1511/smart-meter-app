import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import ChatHeader from '../components/chat/ChatHeader';
import WorkOrderCards from '../components/chat/WorkOrderCards';
import { getAssignedWorkOrders } from '../services/workOrder.service';

export default function HomePage() {
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery({
    queryKey: ['assigned-work-orders'],
    queryFn: getAssignedWorkOrders
  });

  return (
    <div className="chat-layout">
      <ChatHeader subtitle="Assigned Work Orders" />
      <main className="chat-main">
        <div className="message bot">Hi. Please select the work order type.</div>
        <div className="message user">Meter Installation</div>
        <div className="message bot">Here are your assigned work orders.</div>
        {isLoading ? <div className="message bot">Loading work orders...</div> : null}
        <WorkOrderCards items={data} onSelect={(id) => navigate(`/work-orders/${id}`)} />
      </main>
    </div>
  );
}
