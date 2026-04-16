/**
 * Alerts Center — active alerts list with acknowledge + snooze actions.
 * Consumes /api/alerts/active, posts to /api/alerts/:id/{acknowledge,snooze}.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert as MuiAlert,
  Paper,
} from '@mui/material';
import { getActiveAlerts, acknowledgeAlert, snoozeAlert } from '../services/alerts.service';

const severityColor = {
  info: 'default',
  warning: 'warning',
  high: 'warning',
  critical: 'error',
};

const severityLabel = {
  info: 'معلوماتي',
  warning: 'تنبيه',
  high: 'عالي',
  critical: 'حرج',
};

const categoryLabel = {
  clinical: 'إكلينيكي',
  financial: 'مالي',
  operational: 'تشغيلي',
  quality: 'جودة',
  hr: 'الموارد البشرية',
  compliance: 'امتثال',
};

export default function AlertsCenter() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ severity: '', category: '' });
  const [dialog, setDialog] = useState({ open: false, alert: null, mode: 'ack' });
  const [note, setNote] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = {};
    if (filters.severity) params.severity = filters.severity;
    if (filters.category) params.category = filters.category;
    getActiveAlerts(params)
      .then(data => setAlerts(data.alerts || []))
      .catch(err => setError(err?.response?.data?.error || err.message || 'فشل تحميل التنبيهات'))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(fetchAlerts, [fetchAlerts]);

  const openDialog = (alert, mode) => {
    setDialog({ open: true, alert, mode });
    setNote('');
    setMinutes(60);
  };
  const closeDialog = () => setDialog({ open: false, alert: null, mode: 'ack' });

  const confirm = async () => {
    if (!dialog.alert) return;
    setSubmitting(true);
    try {
      if (dialog.mode === 'ack') {
        await acknowledgeAlert(dialog.alert._id, note);
      } else {
        await snoozeAlert(dialog.alert._id, minutes);
      }
      closeDialog();
      fetchAlerts();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'فشل الإجراء');
    } finally {
      setSubmitting(false);
    }
  };

  const filtersSummary = useMemo(() => {
    const chips = [];
    if (filters.severity) chips.push({ key: 'severity', label: severityLabel[filters.severity] });
    if (filters.category) chips.push({ key: 'category', label: categoryLabel[filters.category] });
    return chips;
  }, [filters]);

  return (
    <Container maxWidth="lg" sx={{ py: 3, direction: 'rtl' }}>
      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          مركز التنبيهات
        </Typography>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="sev-label">الخطورة</InputLabel>
          <Select
            labelId="sev-label"
            value={filters.severity}
            label="الخطورة"
            onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}
          >
            <MenuItem value="">كل المستويات</MenuItem>
            {Object.keys(severityLabel).map(k => (
              <MenuItem key={k} value={k}>
                {severityLabel[k]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="cat-label">الفئة</InputLabel>
          <Select
            labelId="cat-label"
            value={filters.category}
            label="الفئة"
            onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
          >
            <MenuItem value="">كل الفئات</MenuItem>
            {Object.keys(categoryLabel).map(k => (
              <MenuItem key={k} value={k}>
                {categoryLabel[k]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {filtersSummary.length > 0 && (
        <Stack direction="row" spacing={1} mb={2}>
          {filtersSummary.map(f => (
            <Chip
              key={f.key}
              label={f.label}
              onDelete={() => setFilters(v => ({ ...v, [f.key]: '' }))}
              size="small"
            />
          ))}
        </Stack>
      )}

      {error && (
        <MuiAlert severity="error" sx={{ mb: 2 }}>
          {error}
        </MuiAlert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : alerts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">لا توجد تنبيهات نشطة 🎉</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>الخطورة</TableCell>
                <TableCell>الفئة</TableCell>
                <TableCell>القاعدة</TableCell>
                <TableCell>الرسالة</TableCell>
                <TableCell>الفرع</TableCell>
                <TableCell>أول ظهور</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.map(a => (
                <TableRow key={a._id} hover>
                  <TableCell>
                    <Chip
                      size="small"
                      color={severityColor[a.severity] || 'default'}
                      label={severityLabel[a.severity] || a.severity}
                    />
                  </TableCell>
                  <TableCell>{categoryLabel[a.category] || a.category || '—'}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{a.ruleId}</TableCell>
                  <TableCell>{a.message}</TableCell>
                  <TableCell>{a.branchId || '—'}</TableCell>
                  <TableCell>
                    {a.firstSeenAt ? new Date(a.firstSeenAt).toLocaleString('ar-SA') : '—'}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Button size="small" onClick={() => openDialog(a, 'ack')}>
                        إقرار
                      </Button>
                      <Button size="small" onClick={() => openDialog(a, 'snooze')}>
                        تأجيل
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialog.open} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {dialog.mode === 'ack' ? 'إقرار بالاطلاع على التنبيه' : 'تأجيل التنبيه'}
        </DialogTitle>
        <DialogContent>
          {dialog.alert && (
            <Typography variant="body2" color="text.secondary" mb={2}>
              {dialog.alert.message}
            </Typography>
          )}
          {dialog.mode === 'ack' ? (
            <TextField
              autoFocus
              fullWidth
              multiline
              rows={3}
              label="ملاحظة (اختيارية)"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          ) : (
            <TextField
              autoFocus
              fullWidth
              type="number"
              label="مدة التأجيل (دقائق)"
              value={minutes}
              onChange={e => setMinutes(Number(e.target.value))}
              inputProps={{ min: 1, max: 24 * 60 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={submitting}>
            إلغاء
          </Button>
          <Button onClick={confirm} variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={16} /> : 'تأكيد'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
