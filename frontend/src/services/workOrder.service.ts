import { api } from './api';

export async function getAssignedWorkOrders() {
  const response = await api.get('/work-orders/assigned', {
    params: { type: 'meter_installation' }
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

export async function editWorkOrderStep(payload: { workOrderId: string; stepId: string }) {
  const response = await api.post(`/work-orders/${payload.workOrderId}/edit`, {
    step_id: payload.stepId
  });
  return response.data;
}
