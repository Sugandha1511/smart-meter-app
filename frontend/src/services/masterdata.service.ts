import { api } from './api';

export interface ConsumerMasterResponse {
  ivrs: string;
  row: Record<string, string | number | boolean | null>;
}

export async function getConsumerByIVRS(ivrs: string): Promise<ConsumerMasterResponse> {
  const response = await api.get(`/masterdata/consumer/${encodeURIComponent(ivrs)}`);
  return response.data;
}
