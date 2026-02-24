// Performance Evaluation API hooks
import { useState, useEffect } from 'react';

export function usePerformance() {
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/hr/performance')
      .then(res => res.json())
      .then(setPerformance)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { performance, loading, error };
}

export async function createPerformance(data) {
  const res = await fetch('/api/hr/performance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create performance record');
  return res.json();
}

export async function updatePerformance(id, data) {
  const res = await fetch(`/api/hr/performance/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update performance record');
  return res.json();
}

export async function deletePerformance(id) {
  const res = await fetch(`/api/hr/performance/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete performance record');
  return res.json();
}
