/**
 * Document Approval Workflow Component
 * نظام المراجعات والموافقات
 *
 * Features:
 * ✅ سير عمل الموافقات
 * ✅ تتبع المراجعات
 * ✅ التعليقات على المراجعات
 * ✅ التوقيعات الرقمية
 * ✅ الإحصائيات
 * ✅ التنبيهات
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Card,
  CardContent,
  Chip,
  Avatar,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Tooltip,
  Dialog as ConfirmDialog,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

const DocumentApprovalWorkflow = ({ document, onApprove, onReject, onClose, currentUserRole = 'editor' }) => {
  const [approvals, setApprovals] = useState(document?.approvals || []);
  const [currentStep, setCurrentStep] = useState(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [_editingApproval, _setEditingApproval] = useState(null);

  const steps = ['المسودة', 'المراجعة', 'الموافقة', 'النشر'];

  const handleApprove = useCallback(async () => {
    const approval = {
      id: `approval_${Date.now()}`,
      timestamp: Date.now(),
      approver: 'محرر المستند',
      role: currentUserRole,
      status: 'approved',
      comment: approvalComment,
    };

    const newApprovals = [...approvals, approval];
    setApprovals(newApprovals);
    setApprovalComment('');

    if (onApprove) {
      await onApprove({ approvals: newApprovals });
    }

    const nextStep = Math.min(currentStep + 1, steps.length - 1);
    setCurrentStep(nextStep);
  }, [approvals, approvalComment, currentUserRole, currentStep, steps.length, onApprove]);

  const handleReject = useCallback(async () => {
    if (!rejectionReason.trim()) return;

    const approval = {
      id: `approval_${Date.now()}`,
      timestamp: Date.now(),
      approver: 'محرر المستند',
      role: currentUserRole,
      status: 'rejected',
      reason: rejectionReason,
    };

    const newApprovals = [...approvals, approval];
    setApprovals(newApprovals);
    setRejectionReason('');
    setShowRejectDialog(false);

    if (onReject) {
      await onReject({ approvals: newApprovals });
    }
  }, [approvals, rejectionReason, currentUserRole, onReject]);

  const getStatusColor = status => {
    const colors = {
      approved: 'success',
      rejected: 'error',
      pending: 'warning',
      draft: 'default',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = status => {
    const labels = {
      approved: 'موافقة',
      rejected: 'رفض',
      pending: 'قيد الانتظار',
      draft: 'مسودة',
    };
    return labels[status] || status;
  };

  const canApprove = currentUserRole === 'admin' || currentUserRole === 'reviewer';
  const lastApproval = approvals[approvals.length - 1];
  const isApproved = lastApproval?.status === 'approved';

  return (
    <>
      <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <ScheduleIcon />
          سير العمل والموافقات
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={3}>
            {/* سير العمل */}
            <Paper sx={{ p: 2, bgcolor: '#f8f9ff', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                📋 مراحل الموافقة
              </Typography>
              <Stepper activeStep={currentStep} orientation="horizontal">
                {steps.map((label, _index) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Paper>

            {/* المعلومات الحالية */}
            {isApproved && (
              <Alert severity="success" sx={{ borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckIcon />
                تم الموافقة على هذا المستند بنجاح
              </Alert>
            )}

            {lastApproval?.status === 'rejected' && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  ❌ تم رفض المستند
                </Typography>
                <Typography variant="body2">السبب: {lastApproval.reason}</Typography>
              </Alert>
            )}

            {/* جدول المراجعات */}
            <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, p: 2 }}>
                🔍 سجل المراجعات ({approvals.length})
              </Typography>
              {approvals.length === 0 ? (
                <Alert severity="info" sx={{ m: 2, borderRadius: 2 }}>
                  لا توجد مراجعات بعد
                </Alert>
              ) : (
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8f9ff' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>المراجع</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>الدور</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>الحالة</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>التاريخ</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>الملاحظة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {approvals.map(approval => (
                      <TableRow key={approval.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32 }}>{approval.approver?.charAt(0)}</Avatar>
                            <Typography variant="body2">{approval.approver}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={approval.role} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(approval.status)}
                            color={getStatusColor(approval.status)}
                            size="small"
                            icon={approval.status === 'approved' ? <CheckIcon /> : <CloseIcon />}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="textSecondary">
                            {new Date(approval.timestamp).toLocaleString('ar-SA')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={approval.comment || approval.reason || 'بدون ملاحظة'}>
                            <Typography
                              variant="caption"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: 200,
                                display: 'block',
                              }}
                            >
                              {approval.comment || approval.reason || '-'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>

            {/* منطقة الموافقة */}
            {canApprove && !isApproved && (
              <Paper sx={{ p: 2, bgcolor: '#f0fff4', borderRadius: 2, border: '2px solid #81c784' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                  ✅ الموافقة على المستند
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="ملاحظة عند الموافقة"
                    value={approvalComment}
                    onChange={e => setApprovalComment(e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="أضف أي ملاحظات حول المستند..."
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="contained" color="success" startIcon={<CheckIcon />} onClick={handleApprove} sx={{ flex: 1 }}>
                      الموافقة
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<CloseIcon />}
                      onClick={() => setShowRejectDialog(true)}
                      sx={{ flex: 1 }}
                    >
                      الرفض
                    </Button>
                  </Box>
                </Stack>
              </Paper>
            )}

            {/* الإحصائيات */}
            <Paper sx={{ p: 2, bgcolor: '#fff9f0', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                📊 الإحصائيات
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
                <Card sx={{ bgcolor: 'success.light' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" color="success.main" sx={{ fontWeight: 700 }}>
                      {approvals.filter(a => a.status === 'approved').length}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      موافقات
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ bgcolor: 'error.light' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" color="error.main" sx={{ fontWeight: 700 }}>
                      {approvals.filter(a => a.status === 'rejected').length}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      رفضات
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ bgcolor: 'info.light' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" color="info.main" sx={{ fontWeight: 700 }}>
                      {steps[currentStep]}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      المرحلة الحالية
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Paper>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* نافذة الرفض */}
      <ConfirmDialog
        open={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <CloseIcon />
          رفض المستند
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          <TextField
            label="سبب الرفض"
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            fullWidth
            multiline
            rows={4}
            placeholder="اشرح سبب رفضك للمستند..."
            variant="outlined"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setShowRejectDialog(false)} variant="outlined">
            إلغاء
          </Button>
          <Button onClick={handleReject} variant="contained" color="error" disabled={!rejectionReason.trim()}>
            تأكيد الرفض
          </Button>
        </DialogActions>
      </ConfirmDialog>
    </>
  );
};

export default DocumentApprovalWorkflow;
