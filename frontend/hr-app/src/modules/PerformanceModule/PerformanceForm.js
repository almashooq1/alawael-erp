import React, { useState } from 'react';
import { createPerformance } from './api';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { useNotification } from '../../context/NotificationContext';
import { useTranslation } from 'react-i18next';

const PerformanceForm = ({ onSuccess }) => {
  const [form, setForm] = useState({ employeeName: '', period: '', score: '', comments: '' });
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
      await createPerformance(form);
      setForm({ employeeName: '', period: '', score: '', comments: '' });
      notify(t('Performance evaluation added successfully'), 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
      notify(err.message || t('Failed to add performance evaluation'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}
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
        sx={{ minWidth: 120 }}
      >
        {loading ? t('Adding...') : t('Add Evaluation')}
      </Button>
      {error && (
        <Alert severity="error" sx={{ ml: 2 }}>
          {error}
        </Alert>
      )}
    </form>
  );
};

export default PerformanceForm;
