// Payroll API hooks
import { useState, useEffect } from 'react';

export function usePayroll() {
  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/hr/payroll')
      .then(res => res.json())
      .then(setPayroll)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { payroll, loading, error };
}

export async function createPayroll(data) {
  const res = await fetch('/api/hr/payroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create payroll record');
  return res.json();
}

export async function updatePayroll(id, data) {
  const res = await fetch(`/api/hr/payroll/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update payroll record');
  return res.json();
}

export async function deletePayroll(id) {
  const res = await fetch(`/api/hr/payroll/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete payroll record');
  return res.json();
}
