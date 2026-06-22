import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Paper, Box, Typography, Button, Stack, Alert, CircularProgress,
  TextField, MenuItem, Divider,
} from '@mui/material';
import apiClient from '../../services/api.client';

/**
 * Bespoke file-upload screen — رفع ملف. Posts multipart/form-data (file +
 * fileType) to a verified upload endpoint. Built to fix the dashboard "upload"
 * links that pointed at routes that did not exist (404s).
 *
 * config = { title, endpoint, fileField?, fileTypes?, accept?, backTo, successMsg }
 */
const DEFAULT_TYPES = ['أشعة', 'تحاليل', 'تقرير طبي', 'وصفة طبية', 'صورة', 'مستند', 'أخرى'];
const DEFAULT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.dcm';

export default function FileUploadPage({ config }) {
  const cfg = config || {};
  const navigate = useNavigate();
  const types = Array.isArray(cfg.fileTypes) && cfg.fileTypes.length ? cfg.fileTypes : DEFAULT_TYPES;

  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(types[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!file) { setError('يرجى اختيار ملف للرفع.'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append(cfg.fileField || 'file', file);
      fd.append('fileType', fileType);
      await apiClient.post(cfg.endpoint, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDone(true);
      setTimeout(() => navigate(cfg.backTo || -1), 1000);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'تعذّر رفع الملف. حاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }} dir="rtl">
      <Paper sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
          {cfg.title || 'رفع ملف'}
        </Typography>
        {cfg.subtitle ? (
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>{cfg.subtitle}</Typography>
        ) : null}
        <Divider sx={{ my: 2 }} />

        {done ? <Alert severity="success" sx={{ mb: 2 }}>{cfg.successMsg || 'تم رفع الملف بنجاح ✓'}</Alert> : null}
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        <form onSubmit={submit} noValidate>
          <Stack spacing={2.5}>
            <TextField
              select
              fullWidth
              label="نوع الملف"
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              disabled={submitting || done}
            >
              {types.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>

            <Box>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                sx={{ py: 1.5, borderStyle: 'dashed' }}
                disabled={submitting || done}
              >
                {file ? `📎 ${file.name}` : 'اختر ملفاً (PDF / صورة / Word / Excel)'}
                <input
                  type="file"
                  hidden
                  accept={cfg.accept || DEFAULT_ACCEPT}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </Button>
              {file ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {(file.size / 1024).toFixed(0)} كيلوبايت
                </Typography>
              ) : null}
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={submitting || done || !file}
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
              >
                {submitting ? 'جارٍ الرفع…' : 'رفع'}
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
