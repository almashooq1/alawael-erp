// Attendance API hooks
import { useState, useEffect } from 'react';

export function useAttendance() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/hr/attendance')
      .then(res => res.json())
      .then(setAttendance)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { attendance, loading, error };
}

export async function createAttendance(data) {
  const res = await fetch('/api/hr/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create attendance record');
  return res.json();
}

export async function updateAttendance(id, data) {
  const res = await fetch(`/api/hr/attendance/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update attendance record');
  return res.json();
}

export async function deleteAttendance(id) {
  const res = await fetch(`/api/hr/attendance/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete attendance record');
  return res.json();
}
