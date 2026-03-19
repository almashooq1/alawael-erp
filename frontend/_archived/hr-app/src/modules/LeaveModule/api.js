// Leave API hooks
import { useState, useEffect } from 'react';

export function useLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/hr/leaves')
      .then(res => res.json())
      .then(setLeaves)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { leaves, loading, error };
}

export async function createLeave(data) {
  const res = await fetch('/api/hr/leaves', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create leave');
  return res.json();
}

export async function updateLeave(id, data) {
  const res = await fetch(`/api/hr/leaves/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update leave');
  return res.json();
}

export async function deleteLeave(id) {
  const res = await fetch(`/api/hr/leaves/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete leave');
  return res.json();
}
