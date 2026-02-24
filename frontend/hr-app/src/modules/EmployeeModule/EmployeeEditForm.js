import React, { useState } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { updateEmployee } from './api';
import { useTranslation } from 'react-i18next';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';

const EmployeeEditForm = ({ employee, onCancel, onSaved }) => {
  const [form, setForm] = useState({
    name: employee.name,
    email: employee.email,
    position: employee.position,
  });
  const { notify } = useNotification();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      await updateEmployee(employee._id, form);
      notify(t('Employee updated successfully'), 'success');
      if (onSaved) onSaved();
    } catch (err) {
      setError(err.message);
      notify(err.message || t('Failed to update employee'), 'error');
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

export default EmployeeEditForm;
