import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export const api = axios.create({ baseURL: BASE });

/** Fire-and-forget ping to wake the Render backend from sleep */
export function warmupBackend() {
  const healthUrl = BASE.replace(/\/api\/v1\/?$/, '/health');
  fetch(healthUrl, { method: 'GET' }).catch(() => {/* ignore errors */});
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
