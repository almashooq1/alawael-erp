/**
 * BulkCreateClaimsDialog.jsx — month-end batch driver UI for the
 * session→NPHIES bulk endpoint.
 *
 * Backend contract:
 *   POST /api/api/v1/sessions/admin/bulk-create-claims
 *   body: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', dryRun?, maxBatch? }
 *   resp: { ok, candidateCount, created, skipped, failed, dryRun, durationMs }
 *
 * UX rules:
 *   • Default to "this month" (1st → today). Most batches run end-of-month.
 *   • Dry-run by default — billing officer should see the report before
 *     committing. They flip the switch off for the real run.
 *   • Three colored sections show created / skipped / failed counts +
 *     samples. Each has its own aria-live region.
 *   • Failed > 0 is loud (red); skipped > 0 is informational (orange).
 *   • Maximum batch is hard-capped at 500 server-side. The UI shows a
 *     hint when the candidate count hits the cap so users know to split.
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Alert,
  Box,
  IconButton,
  CircularProgress,
  FormControlLabel,
  Switch,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  Collapse,
} from '@mui/material';
import {
  Close as CloseIcon,
  PlaylistAddCheck as PlaylistAddCheckIcon,
  CheckCircle as CheckCircleIcon,
  RemoveCircle as RemoveCircleIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import apiClient from '../../services/api.client';

const TITLE_ID = 'bulk-create-claims-title';
const SERVER_HARD_CAP = 500;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthIso() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function PartitionSection({ title, items, color, icon, sample = 5 }) {
  const [expanded, setExpanded] = useState(false);
  const count = items?.length || 0;

  return (
    <Box sx={{ mb: 1 }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ cursor: count ? 'pointer' : 'default' }}
        onClick={() => count && setExpanded(v => !v)}
        role={count ? 'button' : undefined}
        tabIndex={count ? 0 : undefined}
        onKeyDown={e => {
          if (count && (e.key === 'Enter' || e.key === ' ')) setExpanded(v => !v);
        }}
        aria-expanded={count ? expanded : undefined}
      >
        {icon}
        <Typography variant="subtitle2">
          {title}: <Chip size="small" color={color} label={count} />
        </Typography>
        {count > 0 &&
          (expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />)}
      </Stack>
      <Collapse in={expanded}>
        <List dense sx={{ pl: 4 }}>
          {items.slice(0, sample).map((it, i) => (
            <ListItem key={i} disableGutters>
              <ListItemText
                primary={it.claimNumber || it.reason || it.error || it.sessionId}
                secondary={
                  it.claimNumber
                    ? `${it.sessionId} · ${it.total ?? '—'} ر.س · ${it.priceSource || 'no-price'}`
                    : it.sessionId
                }
              />
            </ListItem>
          ))}
          {count > sample && (
            <ListItem>
              <ListItemText secondary={`...و ${count - sample} عنصر إضافي`} />
            </ListItem>
          )}
        </List>
      </Collapse>
    </Box>
  );
}

export default function BulkCreateClaimsDialog({ open, onClose, onCompleted }) {
  const [from, setFrom] = useState(firstOfMonthIso());
  const [to, setTo] = useState(todayIso());
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const reset = () => {
    setReport(null);
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    setFrom(firstOfMonthIso());
    setTo(todayIso());
    setDryRun(true);
    onClose && onClose();
  };

  const handleRun = async () => {
    setError(null);
    setReport(null);
    setLoading(true);
    try {
      const { data } = await apiClient.post('/api/v1/sessions/admin/bulk-create-claims', {
        from,
        to,
        dryRun,
      });
      setReport(data);
      if (data.ok && !dryRun && onCompleted) onCompleted(data);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'network_error');
    } finally {
      setLoading(false);
    }
  };

  const hitCap = useMemo(() => report?.candidateCount === SERVER_HARD_CAP, [report]);

  const datesInvalid = !from || !to || from > to;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth aria-labelledby={TITLE_ID}>
      <DialogTitle id={TITLE_ID} sx={{ fontWeight: 700 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <PlaylistAddCheckIcon color="primary" />
            <span>إنشاء مطالبات مجمّعة (نهاية الشهر)</span>
          </Stack>
          <IconButton aria-label="إغلاق" onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            ينشئ مسودات مطالبات تأمينية لكل الجلسات المكتملة في الفترة المحددة والتي لم تُفوتر بعد.
            السعر يُستخرج تلقائياً من جدول التعريفات.
          </Typography>

          <Stack direction="row" spacing={2}>
            <TextField
              label="من تاريخ"
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              disabled={loading}
            />
            <TextField
              label="إلى تاريخ"
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              disabled={loading}
            />
          </Stack>

          <FormControlLabel
            control={
              <Switch
                checked={dryRun}
                onChange={e => setDryRun(e.target.checked)}
                disabled={loading}
              />
            }
            label={dryRun ? 'معاينة فقط — لن يُحفظ شيء' : 'تنفيذ فعلي — سيتم إنشاء المطالبات'}
          />

          <Box aria-live="polite">
            {error && (
              <Alert severity="error">
                <Typography variant="subtitle2">تعذّر تشغيل العملية</Typography>
                <Typography variant="body2">{String(error)}</Typography>
              </Alert>
            )}

            {report && report.ok && (
              <>
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {report.dryRun ? 'تقرير المعاينة' : 'تقرير التنفيذ'}
                  </Typography>
                  <Chip size="small" label={`${report.candidateCount} جلسة مرشّحة`} />
                  <Chip size="small" label={`${(report.durationMs / 1000).toFixed(1)} ث`} />
                </Stack>

                {hitCap && (
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    وصلنا إلى الحد الأقصى ({SERVER_HARD_CAP} جلسة). قد تكون هناك جلسات إضافية خارج
                    هذه الدفعة — قسّم النطاق الزمني.
                  </Alert>
                )}

                <PartitionSection
                  title="تم الإنشاء"
                  items={report.created}
                  color="success"
                  icon={<CheckCircleIcon color="success" fontSize="small" />}
                />
                <PartitionSection
                  title="تم التخطي"
                  items={report.skipped}
                  color="warning"
                  icon={<RemoveCircleIcon color="warning" fontSize="small" />}
                />
                <PartitionSection
                  title="فشل"
                  items={report.failed}
                  color="error"
                  icon={<ErrorIcon color="error" fontSize="small" />}
                />
              </>
            )}

            {report && !report.ok && (
              <Alert severity="error">
                <Typography variant="subtitle2">رفضت الواجهة الخلفية الطلب</Typography>
                <Typography variant="body2">{report.reason}</Typography>
              </Alert>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          إغلاق
        </Button>
        <Button
          variant="contained"
          color={dryRun ? 'primary' : 'warning'}
          onClick={handleRun}
          disabled={loading || datesInvalid}
          startIcon={loading ? <CircularProgress size={16} /> : <PlaylistAddCheckIcon />}
        >
          {dryRun ? 'تشغيل المعاينة' : 'تنفيذ الإنشاء الفعلي'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
