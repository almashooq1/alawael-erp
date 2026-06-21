import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Paper, Box, Typography, TextField, MenuItem, Button, Stack,
  Alert, CircularProgress, Checkbox, FormControlLabel, Divider,
} from '@mui/material';
import apiClient from '../../services/api.client';

/**
 * Generic, schema-driven "create entity" form.
 *
 * Renders a form from a config object and POSTs to a verified backend
 * endpoint. Used to build out the "Add / New" screens that dashboards
 * link to. One component + a central registry routes them all.
 *
 * config = {
 *   title, subtitle, endpoint, method = 'post', backTo, successMsg,
 *   fields: [{ name, label, type, required, options?, placeholder?, help? }]
 * }
 * field.type: text | textarea | number | date | datetime | select | checkbox | email | tel
 */
export default function EntityFormPage({ config }) {
  const navigate = useNavigate();
  const cfg = config || {};
  const fields = Array.isArray(cfg.fields) ? cfg.fields : [];

  const initial = {};
  for (const f of fields) initial[f.name] = f.type === 'checkbox' ? false : '';

  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);

  const setField = (name, val) => {
    setValues((v) => ({ ...v, [name]: val }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    for (const f of fields) {
      if (f.required) {
        const val = values[f.name];
        if (val === '' || val === null || val === undefined || (f.type === 'checkbox' && !val)) {
          e[f.name] = 'هذا الحقل مطلوب';
        }
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => {
    const out = {};
    for (const f of fields) {
      let v = values[f.name];
      if (v === '' || v === null || v === undefined) continue;
      if (f.type === 'number') v = Number(v);
      out[f.name] = v;
    }
    return out;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      const method = (cfg.method || 'post').toLowerCase();
      await apiClient[method](cfg.endpoint, buildPayload());
      setDone(true);
      setTimeout(() => navigate(cfg.backTo || -1), 900);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'تعذّر الحفظ. حاول مرة أخرى.';
      setServerError(typeof msg === 'string' ? msg : 'تعذّر الحفظ.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }} dir="rtl">
      <Paper sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 3 }}>
        <Box sx={{ mb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
            {cfg.title || 'إضافة سجل جديد'}
          </Typography>
          {cfg.subtitle ? (
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>{cfg.subtitle}</Typography>
          ) : null}
        </Box>
        <Divider sx={{ my: 2 }} />

        {done ? (
          <Alert severity="success" sx={{ mb: 2 }}>{cfg.successMsg || 'تمت الإضافة بنجاح ✓'}</Alert>
        ) : null}
        {serverError ? <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert> : null}

        <form onSubmit={handleSubmit} noValidate>
          <Stack spacing={2.5}>
            {fields.map((f) => {
              const common = {
                key: f.name,
                fullWidth: true,
                label: f.label + (f.required ? ' *' : ''),
                value: values[f.name],
                error: Boolean(errors[f.name]),
                helperText: errors[f.name] || f.help || '',
                placeholder: f.placeholder || '',
                disabled: submitting || done,
              };
              if (f.type === 'checkbox') {
                return (
                  <FormControlLabel
                    key={f.name}
                    control={
                      <Checkbox
                        checked={Boolean(values[f.name])}
                        onChange={(e) => setField(f.name, e.target.checked)}
                        disabled={submitting || done}
                      />
                    }
                    label={f.label}
                  />
                );
              }
              if (f.type === 'select') {
                return (
                  <TextField
                    {...common}
                    select
                    onChange={(e) => setField(f.name, e.target.value)}
                  >
                    {(f.options || []).map((o) => (
                      <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                    ))}
                  </TextField>
                );
              }
              const typeMap = { textarea: 'text', datetime: 'datetime-local' };
              return (
                <TextField
                  {...common}
                  type={typeMap[f.type] || f.type || 'text'}
                  multiline={f.type === 'textarea'}
                  minRows={f.type === 'textarea' ? 3 : undefined}
                  InputLabelProps={['date', 'datetime'].includes(f.type) ? { shrink: true } : undefined}
                  onChange={(e) => setField(f.name, e.target.value)}
                />
              );
            })}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={submitting || done}
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
              >
                {submitting ? 'جارٍ الحفظ…' : 'حفظ'}
              </Button>
              <Button variant="outlined" onClick={() => navigate(cfg.backTo || -1)} disabled={submitting}>
                إلغاء
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
