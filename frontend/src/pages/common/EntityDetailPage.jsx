import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import apiClient from '../../services/api.client';

/**
 * Generic read-only "detail" view. GETs `${getBase}/${id}` and renders the
 * record as a labelled card. Used to fix dashboard row/view links that
 * navigated to `/x/:id` detail routes that did not exist (404s).
 *
 * config = { getBase, backTo, title }
 */
const HIDE_KEYS = new Set(['__v', 'password', 'passwordHash', 'tokens', '_id']);

function labelize(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function renderValue(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'نعم' : 'لا';
  if (Array.isArray(v)) return v.length ? `${v.length} عنصر` : '—';
  if (typeof v === 'object') {
    // shallow object (e.g. { ar, en } or nested) → compact
    const inner = v.ar || v.en || v.name || v.title || v.label;
    return inner ? String(inner) : '—';
  }
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    try {
      return new Date(v).toLocaleString('ar-SA');
    } catch {
      return v;
    }
  }
  return String(v);
}

export default function EntityDetailPage({ config }) {
  const cfg = config || {};
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const r = await apiClient.get(`${cfg.getBase}/${id}`);
        const d = r?.data;
        const rec =
          d?.data ||
          d?.item ||
          d?.record ||
          (d && typeof d === 'object' && !Array.isArray(d) ? d : null);
        if (alive) setRecord(rec || d || null);
      } catch (err) {
        if (alive) {
          const code = err?.response?.status;
          setError(
            code === 404
              ? 'السجلّ غير موجود.'
              : err?.response?.data?.message || 'تعذّر تحميل البيانات.'
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [cfg.getBase, id]);

  const entries =
    record && typeof record === 'object'
      ? Object.entries(record).filter(([k]) => !HIDE_KEYS.has(k) && !k.startsWith('_'))
      : [];

  return (
    <Container maxWidth="md" sx={{ py: 4 }} dir="rtl">
      <Paper sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
            {cfg.title || 'تفاصيل السجل'}
          </Typography>
          <Chip label={`#${id?.slice(-6) || ''}`} size="small" variant="outlined" />
        </Stack>
        <Divider sx={{ my: 2 }} />

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : entries.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            لا توجد بيانات لعرضها.
          </Alert>
        ) : (
          <Box
            component="dl"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '200px 1fr' },
              rowGap: 1.5,
              columnGap: 2,
              m: 0,
            }}
          >
            {entries.map(([k, v]) => (
              <React.Fragment key={k}>
                <Typography component="dt" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {labelize(k)}
                </Typography>
                <Typography component="dd" sx={{ m: 0 }}>
                  {renderValue(v)}
                </Typography>
              </React.Fragment>
            ))}
          </Box>
        )}

        <Divider sx={{ my: 3 }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button variant="outlined" onClick={() => navigate(cfg.backTo || -1)}>
            رجوع للقائمة
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
