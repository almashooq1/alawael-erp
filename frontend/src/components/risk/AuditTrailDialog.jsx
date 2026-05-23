/**
 * AuditTrailDialog — Wave 298
 *
 * Self-contained MUI dialog that fetches and renders the W295 plan-review
 * audit chain for a single planReviewId, with an "intact" / "broken at #N"
 * verdict banner.
 *
 * Usage:
 *   import AuditTrailDialog from '@/components/risk/AuditTrailDialog';
 *   <AuditTrailDialog
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     planReviewId={selectedReviewId}
 *   />
 *
 * Requires MFA tier 2 server-side (route gated). Component renders a
 * graceful error state if the user's tier is insufficient.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  AlertTitle,
  CircularProgress,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RefreshIcon from '@mui/icons-material/Refresh';
import apiClient from '../../services/api.client';

const ACTION_AR = {
  TRIGGERED: 'إنشاء تلقائي',
  ACK: 'تأكيد الإشعار',
  SLA_ESCALATED: 'تصعيد SLA',
};

const ACTION_COLOR = {
  TRIGGERED: 'info',
  ACK: 'success',
  SLA_ESCALATED: 'warning',
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ar-SA', { hour12: false });
  } catch {
    return String(iso);
  }
}

export default function AuditTrailDialog({ open, onClose, planReviewId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { ok, chainLength, brokenAt?, reason? }
  const [entries, setEntries] = useState([]); // optional: filled if route returns entries
  const [lastVerifiedAt, setLastVerifiedAt] = useState(null);

  const load = useCallback(async () => {
    if (!planReviewId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(`/risk-sweep/triggered-reviews/${planReviewId}/audit`);
      setResult({
        ok: !!data.ok,
        chainLength: data.chainLength || 0,
        brokenAt: data.brokenAt,
        reason: data.reason,
      });
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setLastVerifiedAt(new Date());
    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      if (status === 403) {
        setError('تحتاج صلاحية MFA من المستوى 2 لعرض سجل التدقيق.');
      } else if (status === 503) {
        setError('خدمة سجل التدقيق غير مهيأة على الخادم.');
      } else {
        setError(`تعذّر التحميل${code ? ` (${code})` : ''}.`);
      }
    } finally {
      setLoading(false);
    }
  }, [planReviewId]);

  useEffect(() => {
    if (open) load();
    else {
      setResult(null);
      setEntries([]);
      setError(null);
      setLastVerifiedAt(null);
    }
  }, [open, load]);

  const renderVerdict = () => {
    if (!result) return null;
    if (result.chainLength === 0) {
      return (
        <Alert severity="info" sx={{ mb: 2 }}>
          <AlertTitle>لا توجد قيود في السلسلة</AlertTitle>
          لم يُسجَّل أي حدث بعد لهذه المراجعة.
        </Alert>
      );
    }
    if (result.ok) {
      return (
        <Alert severity="success" icon={<VerifiedIcon fontSize="inherit" />} sx={{ mb: 2 }}>
          <AlertTitle>السلسلة سليمة</AlertTitle>
          عدد القيود: {result.chainLength}. تم التحقق من جميع روابط الهاش.
        </Alert>
      );
    }
    return (
      <Alert severity="error" icon={<WarningAmberIcon fontSize="inherit" />} sx={{ mb: 2 }}>
        <AlertTitle>سلسلة تدقيق مكسورة</AlertTitle>
        كَسر في القيد رقم {(result.brokenAt ?? 0) + 1} من أصل {result.chainLength} — السبب:{' '}
        <code>{result.reason}</code>. يُنصح بفتح بلاغ جودة فوراً.
      </Alert>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth dir="rtl">
      <DialogTitle>سجل تدقيق المراجعة الحرجة</DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={32} />
          </Box>
        )}
        {!loading && error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {!loading && !error && renderVerdict()}
        {!loading && !error && entries.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>الحدث</TableCell>
                <TableCell>المستوى</TableCell>
                <TableCell>الفاعل</TableCell>
                <TableCell>الوقت</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={ACTION_AR[e.action] || e.action}
                      color={ACTION_COLOR[e.action] || 'default'}
                    />
                  </TableCell>
                  <TableCell>{e.level == null ? '—' : e.level}</TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {e.actorUserId ? String(e.actorUserId).slice(-6) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(e.occurredAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && !error && entries.length === 0 && result && result.chainLength > 0 && (
          <Typography variant="caption" color="text.secondary">
            تم التحقق من السلسلة بدون كشف التفاصيل (نقطة النهاية لا ترجع القيود مفصّلة بعد).
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
        <Box sx={{ flex: 1 }}>
          {lastVerifiedAt && !loading && (
            <Typography variant="caption" color="text.secondary">
              آخر تحقّق: {formatDate(lastVerifiedAt.toISOString())}
            </Typography>
          )}
        </Box>
        <Button
          onClick={load}
          disabled={loading || !planReviewId}
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          color="primary"
        >
          إعادة تحقّق
        </Button>
        <Button onClick={onClose} variant="contained">
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
}
