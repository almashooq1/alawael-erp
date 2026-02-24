import React, { useState } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { createEmployee } from './api';
import { useTranslation } from 'react-i18next';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';

const EmployeeForm = ({ onSuccess }) => {
  const [form, setForm] = useState({ name: '', email: '', position: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { notify } = useNotification();
  const { t } = useTranslation();

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.position) {
      setError(t('All fields are required'));
      notify(t('All fields are required'), 'error');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createEmployee(form);
      setForm({ name: '', email: '', position: '' });
      notify(t('Employee added successfully'), 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
      notify(err.message || t('Failed to add employee'), 'error');
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
        name="name"
        value={form.name}
        onChange={handleChange}
        label={t('Name')}
        size="small"
        required
      />
      <TextField
        name="email"
        value={form.email}
        onChange={handleChange}
        label={t('Email')}
        size="small"
        required
      />
      <TextField
        name="position"
        value={form.position}
        onChange={handleChange}
        label={t('Position')}
        size="small"
        required
      />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={loading}
        sx={{ minWidth: 120 }}
      >
        {loading ? t('Adding...') : t('Add Employee')}
      </Button>
      {error && (
        <Alert severity="error" sx={{ ml: 2 }}>
          {error}
        </Alert>
      )}
    </form>
  );
};

export default EmployeeForm;
