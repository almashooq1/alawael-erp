import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Divider,
} from '@mui/material';
import apiClient from '../../services/api.client';

/**
 * Generic, schema-driven entity form — supports CREATE and EDIT.
 *
 * CREATE: POSTs config.fields to config.endpoint.
 * EDIT  : config.mode === 'edit' → GET `${config.getEndpoint}/${id}` to
 *         prefill, then PUT `${config.endpoint}/${id}` on save. If no
 *         config.fields are given, editable fields are derived from the
 *         fetched record (scalar keys) so any GET+PUT entity works.
 *
 * config = {
 *   title, subtitle, endpoint, method, backTo, successMsg,
 *   mode?: 'edit', getEndpoint?,
 *   fields?: [{ name, label, type, required, options?, placeholder?, help? }]
 * }
 */
const SYSTEM_KEYS = new Set([
  '_id',
  '__v',
  'id',
  'createdAt',
  'updatedAt',
  'branchId',
  'createdBy',
  'updatedBy',
  'deletedAt',
]);

function labelize(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function deriveFields(record) {
  return Object.entries(record)
    .filter(
      ([k, v]) =>
        !SYSTEM_KEYS.has(k) &&
        !k.startsWith('_') &&
        (v === null || ['string', 'number', 'boolean'].includes(typeof v))
    )
    .map(([k, v]) => {
      let type = 'text';
      if (typeof v === 'boolean') type = 'checkbox';
      else if (typeof v === 'number') type = 'number';
      else if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) type = 'date';
      else if (typeof v === 'string' && v.length > 80) type = 'textarea';
      return { name: k, label: labelize(k), type };
    });
}

export default function EntityFormPage({ config }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const cfg = config || {};
  const isEdit = cfg.mode === 'edit';

  const [fields, setFields] = useState(Array.isArray(cfg.fields) ? cfg.fields : []);
  const [values, setValues] = useState(() => {
    const init = {};
    for (const f of cfg.fields || []) init[f.name] = f.type === 'checkbox' ? false : '';
    return init;
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);
  const [optionsMap, setOptionsMap] = useState({});

  // Fetch options for any entity-select fields (ref pickers)
  useEffect(() => {
    const dynamic = (cfg.fields || []).filter(f => f.type === 'entity-select' && f.optionsEndpoint);
    if (!dynamic.length) return undefined;
    let alive = true;
    (async () => {
      const map = {};
      await Promise.all(
        dynamic.map(async f => {
          try {
            const r = await apiClient.get(f.optionsEndpoint, { params: { limit: 500 } });
            const d = r?.data;
            const arr = Array.isArray(d) ? d : d?.data || d?.items || d?.results || d?.docs || [];
            const labels = Array.isArray(f.optionLabel) ? f.optionLabel : [f.optionLabel || 'name'];
            map[f.name] = (Array.isArray(arr) ? arr : [])
              .map(o => ({
                value: o[f.optionValue || '_id'],
                label:
                  labels.map(k => o[k]).find(Boolean) ||
                  o.name ||
                  o.title ||
                  String(o[f.optionValue || '_id']),
              }))
              .filter(o => o.value);
          } catch {
            map[f.name] = [];
          }
        })
      );
      if (alive) setOptionsMap(map);
    })();
    return () => {
      alive = false;
    };
  }, [cfg.fields]);

  // EDIT: load the record + prefill (+ derive fields if none given)
  useEffect(() => {
    if (!isEdit) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const r = await apiClient.get(`${cfg.getEndpoint}/${id}`);
        const d = r?.data;
        const rec =
          d?.data ||
          d?.item ||
          d?.record ||
          (d && typeof d === 'object' && !Array.isArray(d) ? d : {});
        const useFields =
          Array.isArray(cfg.fields) && cfg.fields.length ? cfg.fields : deriveFields(rec || {});
        const vals = {};
        for (const f of useFields) {
          let v = rec ? rec[f.name] : '';
          if (v === null || v === undefined) v = f.type === 'checkbox' ? false : '';
          else if (f.type === 'date' && typeof v === 'string') v = v.slice(0, 10);
          vals[f.name] = v;
        }
        if (alive) {
          setFields(useFields);
          setValues(vals);
        }
      } catch (err) {
        if (alive)
          setServerError(
            err?.response?.status === 404 ? 'السجل غير موجود.' : 'تعذّر تحميل البيانات.'
          );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isEdit, cfg.getEndpoint, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (name, val) => {
    setValues(v => ({ ...v, [name]: val }));
    if (errors[name]) setErrors(e => ({ ...e, [name]: '' }));
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

  const handleSubmit = async ev => {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (isEdit) {
        await apiClient.put(`${cfg.endpoint}/${id}`, buildPayload());
      } else {
        const method = (cfg.method || 'post').toLowerCase();
        await apiClient[method](cfg.endpoint, buildPayload());
      }
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

  const defaultTitle = isEdit ? 'تعديل السجل' : 'إضافة سجل جديد';
  const successText = cfg.successMsg || (isEdit ? 'تم الحفظ بنجاح ✓' : 'تمت الإضافة بنجاح ✓');

  return (
    <Container maxWidth="md" sx={{ py: 4 }} dir="rtl">
      <Paper sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 3 }}>
        <Box sx={{ mb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
            {cfg.title || defaultTitle}
          </Typography>
          {cfg.subtitle ? (
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              {cfg.subtitle}
            </Typography>
          ) : null}
        </Box>
        <Divider sx={{ my: 2 }} />

        {done ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successText}
          </Alert>
        ) : null}
        {serverError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              {fields.map(f => {
                const common = {
                  key: f.name,
                  fullWidth: true,
                  label: f.label + (f.required ? ' *' : ''),
                  value: values[f.name] ?? '',
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
                          onChange={e => setField(f.name, e.target.checked)}
                          disabled={submitting || done}
                        />
                      }
                      label={f.label}
                    />
                  );
                }
                if (f.type === 'select' || f.type === 'entity-select') {
                  const opts =
                    f.type === 'entity-select' ? optionsMap[f.name] || [] : f.options || [];
                  const help =
                    f.type === 'entity-select' && !opts.length
                      ? 'جارٍ تحميل الخيارات…'
                      : errors[f.name] || f.help || '';
                  return (
                    <TextField
                      {...common}
                      select
                      helperText={help}
                      onChange={e => setField(f.name, e.target.value)}
                    >
                      {opts.map(o => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
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
                    InputLabelProps={
                      ['date', 'datetime'].includes(f.type) ? { shrink: true } : undefined
                    }
                    onChange={e => setField(f.name, e.target.value)}
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
                  {submitting ? 'جارٍ الحفظ…' : isEdit ? 'حفظ التعديلات' : 'حفظ'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate(cfg.backTo || -1)}
                  disabled={submitting}
                >
                  إلغاء
                </Button>
              </Stack>
            </Stack>
          </form>
        )}
      </Paper>
    </Container>
  );
}
