// Employee API hooks
import { useState, useEffect } from 'react';

export function useEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/hr/employees')
      .then(res => res.json())
      .then(setEmployees)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { employees, loading, error };
}

export async function createEmployee(data) {
  const res = await fetch('/api/hr/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create employee');
  return res.json();
}

export async function updateEmployee(id, data) {
  const res = await fetch(`/api/hr/employees/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update employee');
  return res.json();
}

export async function deleteEmployee(id) {
  const res = await fetch(`/api/hr/employees/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete employee');
  return res.json();
}
