import React, { useState } from 'react';
import { updateAttendance } from './api';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { useNotification } from '../../context/NotificationContext';
import { useTranslation } from 'react-i18next';

const AttendanceEditForm = ({ record, onCancel, onSaved }) => {
  const [form, setForm] = useState({
    employeeName: record.employeeName,
    date: record.date,
    status: record.status,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { notify } = useNotification();
  const { t } = useTranslation();

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.employeeName || !form.date || !form.status) {
      setError(t('All fields are required'));
      notify(t('All fields are required'), 'error');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await updateAttendance(record._id, form);
      notify(t('Attendance record updated successfully'), 'success');
      if (onSaved) onSaved();
    } catch (err) {
      setError(err.message);
      notify(err.message || t('Failed to update attendance record'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}
    >
      <TextField
        name="employeeName"
        value={form.employeeName}
        onChange={handleChange}
        label={t('Employee Name')}
        size="small"
        required
      />
      <TextField
        name="date"
        value={form.date}
        onChange={handleChange}
        label={t('Date')}
        type="date"
        size="small"
        InputLabelProps={{ shrink: true }}
        required
      />
      <TextField
        name="status"
        value={form.status}
        onChange={handleChange}
        label={t('Status')}
        size="small"
        required
      />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={loading}
        sx={{ minWidth: 100 }}
      >
        {loading ? t('Saving...') : t('Save')}
      </Button>
      <Button type="button" onClick={onCancel} disabled={loading} sx={{ minWidth: 100 }}>
        {t('Cancel')}
      </Button>
      {error && (
        <Alert severity="error" sx={{ ml: 2 }}>
          {error}
        </Alert>
      )}
    </form>
  );
};

export default AttendanceEditForm;
