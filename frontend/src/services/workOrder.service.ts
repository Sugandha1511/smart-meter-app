import { api } from './api';

export async function startWorkOrder(dc: string, consumerIvrs: string): Promise<{
  work_order_id: string;
  consumer_name: string;
  address: string;
  phase: string;
  tariff_code: string;
  sanctioned_load: string;
}> {
  const response = await api.post('/work-orders/start', { dc, consumer_ivrs: consumerIvrs });
  return response.data;
}

export async function getAssignedWorkOrders(type = 'meter_installation') {
  const response = await api.get('/work-orders/assigned', {
    params: { type }
  });
  return response.data;
}

export async function getWorkflow(workOrderId: string) {
  const response = await api.get(`/work-orders/${workOrderId}/workflow`);
  return response.data;
}

export async function submitStepAnswer(payload: {
  workOrderId: string;
  stepId: string;
  value: unknown;
  inputMode?: string;
}) {
  const response = await api.post(
    `/work-orders/${payload.workOrderId}/steps/${payload.stepId}/answer`,
    {
      value: payload.value,
      input_mode: payload.inputMode ?? 'text'
    }
  );
  return response.data;
}

export async function submitWorkOrder(workOrderId: string) {
  const response = await api.post(`/work-orders/${workOrderId}/submit`);
  return response.data;
}

export async function resetWorkOrder(workOrderId: string) {
  await api.delete(`/work-orders/${workOrderId}/session`);
}

export async function getSubmissionHistory() {
  const response = await api.get('/work-orders/submitted');
  return response.data;
}
