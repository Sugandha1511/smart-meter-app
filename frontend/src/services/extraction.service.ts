import { api } from './api';

export async function extractMeterReading(fileUrl: string) {
  const response = await api.post('/extraction/meter-reading', { file_url: fileUrl });
  return response.data;
}

export async function extractSealNumber(fileUrl: string) {
  const response = await api.post('/extraction/seal-number', { file_url: fileUrl });
  return response.data;
}
