import { api } from './api';

export async function login(employeeId: string, pin: string) {
  const response = await api.post('/auth/login', {
    employee_id: employeeId,
    pin
  });
  return response.data;
}
