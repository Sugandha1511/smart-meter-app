import { api } from './api';

export async function uploadMedia(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}
