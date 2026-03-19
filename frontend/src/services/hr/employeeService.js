/**
 * Employee Service — CRUD operations for employees
 * خدمات إدارة بيانات الموظفين
 */
import { safeFetch } from './safeFetch';
import { DEMO_EMPLOYEES } from './demoData';

export const getEmployees = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return safeFetch(`/hr-advanced/employees${qs ? `?${qs}` : ''}`, DEMO_EMPLOYEES);
};

export const getEmployee = id => safeFetch(`/hr-advanced/employees/${id}/profile`, {});

export const createEmployee = data =>
  safeFetch('/hr-advanced/employees', null, { method: 'POST', body: data });

export const updateEmployee = (id, data) =>
  safeFetch(`/hr-advanced/employees/${id}`, null, { method: 'PUT', body: data });

export const deleteEmployee = id =>
  safeFetch(`/hr-advanced/employees/${id}`, null, { method: 'DELETE' });
