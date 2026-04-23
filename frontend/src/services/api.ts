import axios from 'axios';

// Configurable via Vite env. In dev, set VITE_API_URL in `frontend/.env.local`
// (e.g. VITE_API_URL=https://abc-123.trycloudflare.com). Falls back to localhost.
const API_ROOT = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? 'http://localhost:8000';

export const API_BASE_URL = API_ROOT;

export const api = axios.create({
  baseURL: `${API_ROOT}/api/v1`
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
