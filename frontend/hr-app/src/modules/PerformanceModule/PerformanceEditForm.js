import React, { useState } from 'react';
import { updatePerformance } from './api';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { useNotification } from '../../context/NotificationContext';
import { useTranslation } from 'react-i18next';

const PerformanceEditForm = ({ record, onCancel, onSaved }) => {
  const [form, setForm] = useState({
    employeeName: record.employeeName,
    period: record.period,
    score: record.score,
    comments: record.comments,
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
    if (!form.employeeName || !form.period || !form.score) {
      setError(t('Employee, period, and score are required'));
      notify(t('Employee, period, and score are required'), 'error');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await updatePerformance(record._id, form);
      notify(t('Performance evaluation updated successfully'), 'success');
      if (onSaved) onSaved();
    } catch (err) {
      setError(err.message);
      notify(err.message || t('Failed to update performance evaluation'), 'error');
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
        name="period"
        value={form.period}
        onChange={handleChange}
        label={t('Period')}
        size="small"
        required
      />
      <TextField
        name="score"
        value={form.score}
        onChange={handleChange}
        label={t('Score')}
        size="small"
        required
      />
      <TextField
        name="comments"
        value={form.comments}
        onChange={handleChange}
        label={t('Comments')}
        size="small"
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

export default PerformanceEditForm;
