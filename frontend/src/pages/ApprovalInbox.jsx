/**
 * Approval Inbox — requests awaiting current user's approval (per role).
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert as MuiAlert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { listInbox, approveRequest, rejectRequest } from '../services/approvals.service';

const statusColor = {
  pending_approval: 'warning',
  approved: 'success',
  rejected: 'error',
  escalated: 'warning',
  cancelled: 'default',
};

export default function ApprovalInbox() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState({ open: false, row: null, action: 'approve' });
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listInbox()
      .then(data => setRows(data.requests || []))
      .catch(err => setError(err?.response?.data?.error || err.message || 'تعذّر تحميل الصندوق'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const openDialog = (row, action) => {
    setDialog({ open: true, row, action });
    setNote('');
  };
  const closeDialog = () => setDialog({ open: false, row: null, action: 'approve' });

  const submit = async () => {
    if (!dialog.row) return;
    setSubmitting(true);
    try {
      if (dialog.action === 'approve') await approveRequest(dialog.row._id, note);
      else await rejectRequest(dialog.row._id, note);
      closeDialog();
      load();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'فشل الإجراء');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3, direction: 'rtl' }}>
      <Typography variant="h4" mb={3}>
        صندوق الاعتمادات
      </Typography>

      {error && (
        <MuiAlert severity="error" sx={{ mb: 2 }}>
          {String(error)}
        </MuiAlert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : rows.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">لا يوجد طلبات بانتظار اعتمادك ✅</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>النوع</TableCell>
                <TableCell>سلسلة الاعتماد</TableCell>
                <TableCell>المعرف</TableCell>
                <TableCell>الخطوة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>SLA ينتهي</TableCell>
                <TableCell align="center">الإجراء</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r._id} hover>
                  <TableCell>{r.resourceType}</TableCell>
                  <TableCell>{r.chainId}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {String(r.resourceId)}
                  </TableCell>
                  <TableCell>
                    {r.currentStep + 1}/{r.steps.length}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={statusColor[r.status] || 'default'}
                      label={r.status}
                    />
                  </TableCell>
                  <TableCell>
                    {r.slaDeadline ? new Date(r.slaDeadline).toLocaleString('ar-SA') : '—'}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Button size="small" color="success" onClick={() => openDialog(r, 'approve')}>
                        اعتماد
                      </Button>
                      <Button size="small" color="error" onClick={() => openDialog(r, 'reject')}>
                        رفض
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
        <DialogTitle>{dialog.action === 'approve' ? 'اعتماد الطلب' : 'رفض الطلب'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="ملاحظة (اختيارية)"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={submitting}>
            إلغاء
          </Button>
          <Button
            onClick={submit}
            variant="contained"
            color={dialog.action === 'approve' ? 'success' : 'error'}
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={16} /> : 'تأكيد'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
