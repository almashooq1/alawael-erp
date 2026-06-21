/**
 * Beneficiary Lifecycle Panel — لوحة إدارة دورة حياة المستفيد
 *
 * W0-LifecycleAlign: UI surface for the unified lifecycle workflow.
 * Displays current state, allowed transitions, pending approvals, and
 * transition history for a single beneficiary.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
} from '@mui/material';
import { PlayArrow, CheckCircle, Cancel, Replay, Timeline, Warning } from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import beneficiaryLifecycleService from '../../services/beneficiaryLifecycleService';
import { getStatusLabel, getStatusColor } from './beneficiariesLabelHelpers';

const TRANSITION_LABELS = {
  waitlist: 'إدراج في قائمة الانتظار',
  cancel_waitlist: 'إلغاء قائمة الانتظار',
  admit: 'قبول وتفعيل',
  suspend: 'تعليق الملف',
  reactivate: 'إعادة تفعيل',
  initiate_transfer: 'بدء النقل لفرع آخر',
  complete_transfer: 'إتمام النقل',
  reverse_transfer: 'إلغاء النقل',
  discharge: 'تخرج وإغلاق ملف',
  record_deceased: 'تسجيل وفاة',
  archive: 'أرشفة الملف',
  restore: 'استعادة من الأرشيف',
  request_deletion: 'طلب حذف الملف',
  approve_deletion: 'اعتماد الحذف',
  cancel_deletion: 'إلغاء طلب الحذف',
};

const STATUS_CHIP_COLORS = {
  pending: 'warning',
  approved: 'info',
  executed: 'success',
  rejected: 'error',
  cancelled: 'default',
  reversed: 'secondary',
  failed: 'error',
};

export default function BeneficiaryLifecyclePanel({
  beneficiaryId,
  status,
  branchId,
  onStatusChange,
}) {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [allowedTransitions, setAllowedTransitions] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedTransition, setSelectedTransition] = useState('');
  const [reason, setReason] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!beneficiaryId || !status) return;
    setLoading(true);
    try {
      const [allowedRes, historyRes] = await Promise.all([
        beneficiaryLifecycleService.getAllowedTransitions(beneficiaryId, status),
        beneficiaryLifecycleService.getTransitionHistory(beneficiaryId),
      ]);
      setAllowedTransitions(allowedRes?.data?.transitions || []);
      setHistory(historyRes?.data?.transitions || []);
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'فشل تحميل بيانات دورة الحياة', 'error');
    } finally {
      setLoading(false);
    }
  }, [beneficiaryId, status, showSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedTransitionMeta = allowedTransitions.find(t => t.id === selectedTransition);
  const reasonCodes = selectedTransitionMeta?.allowedReasonCodes || [];

  const handleRequest = async () => {
    if (!selectedTransition) return;
    setSubmitting(true);
    try {
      const body = {
        beneficiaryId,
        branchId,
        transitionId: selectedTransition,
      };
      if (reason.trim()) body.reason = reason.trim();
      if (reasonCode) body.reasonCode = reasonCode;

      const res = await beneficiaryLifecycleService.requestTransition(body);
      if (res?.success) {
        showSnackbar('تم فتح طلب الانتقال بنجاح', 'success');
        setSelectedTransition('');
        setReason('');
        setReasonCode('');
        await fetchData();
      } else {
        showSnackbar(res?.message || 'فشل فتح طلب الانتقال', 'error');
      }
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'فشل فتح طلب الانتقال', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async id => {
    try {
      await beneficiaryLifecycleService.approveTransition(id, { approverRole: 'branch_manager' });
      showSnackbar('تم الاعتماد بنجاح', 'success');
      await fetchData();
      if (onStatusChange) onStatusChange();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'فشل الاعتماد', 'error');
    }
  };

  const handleExecute = async id => {
    try {
      const res = await beneficiaryLifecycleService.executeTransition(id);
      if (res?.data?.transitionRecord?.toState && onStatusChange) {
        onStatusChange(res.data.transitionRecord.toState);
      }
      showSnackbar('تم تنفيذ الانتقال بنجاح', 'success');
      await fetchData();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'فشل التنفيذ', 'error');
    }
  };

  const handleCancel = async id => {
    try {
      await beneficiaryLifecycleService.cancelTransition(id);
      showSnackbar('تم إلغاء الطلب', 'success');
      await fetchData();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'فشل الإلغاء', 'error');
    }
  };

  const handleReverse = async id => {
    try {
      await beneficiaryLifecycleService.reverseTransition(id);
      showSnackbar('تم التراجع عن الانتقال', 'success');
      await fetchData();
      if (onStatusChange) onStatusChange();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'فشل التراجع', 'error');
    }
  };

  const pendingApprovals = history.filter(r => r.status === 'pending' || r.status === 'approved');

  return (
    <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        دورة حياة المستفيد
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          الحالة الحالية
        </Typography>
        <Chip
          label={getStatusLabel(status)}
          sx={{ bgcolor: getStatusColor(status), color: '#fff', fontWeight: 700 }}
        />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Request transition */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              طلب انتقال جديد
            </Typography>
            {allowedTransitions.length === 0 ? (
              <Alert severity="info" icon={<Warning />}>
                لا توجد انتقالات مسموح بها من الحالة الحالية.
              </Alert>
            ) : (
              <Stack spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>الانتقال</InputLabel>
                  <Select
                    value={selectedTransition}
                    label="الانتقال"
                    onChange={e => {
                      setSelectedTransition(e.target.value);
                      setReasonCode('');
                    }}
                  >
                    {allowedTransitions.map(t => (
                      <MenuItem key={t.id} value={t.id}>
                        {TRANSITION_LABELS[t.id] || t.descriptionAr || t.id}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selectedTransitionMeta?.requiresReason && (
                  <>
                    {reasonCodes.length > 0 && (
                      <FormControl fullWidth size="small">
                        <InputLabel>سبب الانتقال</InputLabel>
                        <Select
                          value={reasonCode}
                          label="سبب الانتقال"
                          onChange={e => setReasonCode(e.target.value)}
                        >
                          {reasonCodes.map(code => (
                            <MenuItem key={code} value={code}>
                              {code}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                    <TextField
                      label="تعليق إضافي"
                      multiline
                      rows={2}
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      size="small"
                      fullWidth
                    />
                  </>
                )}

                <Box>
                  <Button
                    variant="contained"
                    startIcon={<PlayArrow />}
                    disabled={!selectedTransition || submitting}
                    onClick={handleRequest}
                  >
                    {submitting ? 'جاري الطلب...' : 'طلب الانتقال'}
                  </Button>
                </Box>
              </Stack>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Pending approvals */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              طلبات قيد المعالجة
            </Typography>
            {pendingApprovals.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                لا توجد طلبات قيد المعالجة.
              </Typography>
            ) : (
              <List dense>
                {pendingApprovals.map(record => (
                  <ListItem
                    key={record._id}
                    secondaryAction={
                      <Stack direction="row" spacing={0.5}>
                        {record.status === 'pending' && (
                          <Tooltip title="اعتماد">
                            <IconButton
                              edge="end"
                              color="success"
                              onClick={() => handleApprove(record._id)}
                            >
                              <CheckCircle />
                            </IconButton>
                          </Tooltip>
                        )}
                        {record.status === 'approved' && (
                          <Tooltip title="تنفيذ">
                            <IconButton
                              edge="end"
                              color="primary"
                              onClick={() => handleExecute(record._id)}
                            >
                              <PlayArrow />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="إلغاء">
                          <IconButton
                            edge="end"
                            color="error"
                            onClick={() => handleCancel(record._id)}
                          >
                            <Cancel />
                          </IconButton>
                        </Tooltip>
                        {record.status === 'executed' && (
                          <Tooltip title="تراجع">
                            <IconButton edge="end" onClick={() => handleReverse(record._id)}>
                              <Replay />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    }
                  >
                    <ListItemText
                      primary={`${TRANSITION_LABELS[record.transitionId] || record.transitionId} → ${
                        getStatusLabel(record.toState) || record.toState
                      }`}
                      secondary={
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          <Chip
                            label={record.status}
                            size="small"
                            color={STATUS_CHIP_COLORS[record.status] || 'default'}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {record.reasonCode || record.reason || '—'}
                          </Typography>
                        </Stack>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* History */}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              <Timeline sx={{ verticalAlign: 'middle', fontSize: 18, ml: 0.5 }} />
              سجل الانتقالات
            </Typography>
            {history.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                لا يوجد سجل انتقالات.
              </Typography>
            ) : (
              <List dense>
                {history.map(record => (
                  <ListItem key={record._id}>
                    <ListItemText
                      primary={`${getStatusLabel(record.fromState)} → ${getStatusLabel(record.toState)}`}
                      secondary={
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          <Chip
                            label={record.status}
                            size="small"
                            color={STATUS_CHIP_COLORS[record.status] || 'default'}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {record.transitionId} — {record.reasonCode || record.reason || '—'}
                          </Typography>
                        </Stack>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </>
      )}
    </Paper>
  );
}
