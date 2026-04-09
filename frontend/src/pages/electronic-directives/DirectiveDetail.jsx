/**
 * Directive Detail — تفاصيل التوجيه الإلكتروني
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  Divider,
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  LinearProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Campaign as CampaignIcon,
  Gavel as DecisionIcon,
  Description as MemoIcon,
  NotificationsActive as UrgentIcon,
  PolicyOutlined as PolicyIcon,
  Rule as ProcedureIcon,
  Assignment as InstructionIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Send as IssueIcon,
  Visibility as ReadIcon,
  ThumbUp as AckIcon,
  AttachFile as AttachIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  Done as DoneIcon,
  PlayArrow as PlayIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import electronicDirectivesService from '../../services/electronicDirectives.service';
import {
  DIRECTIVE_TYPES,
  DIRECTIVE_PRIORITIES,
  DIRECTIVE_STATUS,
  ISSUER_TYPES,
  RECIPIENT_TYPES,
  ACTION_STATUS,
} from './constants';

const typeIcons = {
  instruction: <InstructionIcon />,
  circular: <CampaignIcon />,
  decision: <DecisionIcon />,
  memo: <MemoIcon />,
  urgent_notice: <UrgentIcon />,
  policy_update: <PolicyIcon />,
  procedure_change: <ProcedureIcon />,
};

export default function DirectiveDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [directive, setDirective] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Dialogs
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [ackDialog, setAckDialog] = useState(false);
  const [ackResponse, setAckResponse] = useState('');
  const [actionDialog, setActionDialog] = useState(false);
  const [newAction, setNewAction] = useState({ description: '', deadline: '' });

  // ─── Fetch ───────────────────────────────────────────
  const fetchDirective = useCallback(async () => {
    try {
      setLoading(true);
      const res = await electronicDirectivesService.getById(id);
      setDirective(res.data?.data || res.data);
    } catch (err) {
      console.error('Failed to load directive:', err);
      setError('فشل في تحميل التوجيه');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDirective();
  }, [fetchDirective]);

  // ─── Actions ─────────────────────────────────────────
  const handleIssue = async () => {
    try {
      await electronicDirectivesService.issue(id);
      setSnackbar({ open: true, message: 'تم إصدار التوجيه بنجاح', severity: 'success' });
      fetchDirective();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'فشل في إصدار التوجيه',
        severity: 'error',
      });
    }
  };

  const handleCancel = async () => {
    try {
      await electronicDirectivesService.cancel(id, cancelReason);
      setCancelDialog(false);
      setCancelReason('');
      setSnackbar({ open: true, message: 'تم إلغاء التوجيه', severity: 'info' });
      fetchDirective();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'فشل في إلغاء التوجيه',
        severity: 'error',
      });
    }
  };

  const handleMarkRead = async () => {
    try {
      await electronicDirectivesService.markAsRead(id);
      setSnackbar({ open: true, message: 'تم تحديد كمقروء', severity: 'success' });
      fetchDirective();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcknowledge = async () => {
    try {
      await electronicDirectivesService.acknowledge(id, ackResponse);
      setAckDialog(false);
      setAckResponse('');
      setSnackbar({ open: true, message: 'تم الإقرار بالاستلام', severity: 'success' });
      fetchDirective();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'فشل في الإقرار',
        severity: 'error',
      });
    }
  };

  const handleAddAction = async () => {
    if (!newAction.description.trim()) return;
    try {
      await electronicDirectivesService.addAction(id, newAction);
      setActionDialog(false);
      setNewAction({ description: '', deadline: '' });
      setSnackbar({ open: true, message: 'تمت إضافة الإجراء', severity: 'success' });
      fetchDirective();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'فشل في إضافة الإجراء',
        severity: 'error',
      });
    }
  };

  const handleCompleteAction = async (actionIdx) => {
    try {
      await electronicDirectivesService.completeAction(id, actionIdx);
      setSnackbar({ open: true, message: 'تم إكمال الإجراء', severity: 'success' });
      fetchDirective();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'فشل في إكمال الإجراء',
        severity: 'error',
      });
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await electronicDirectivesService.deleteAttachment(id, attachmentId);
      setSnackbar({ open: true, message: 'تم حذف المرفق', severity: 'info' });
      fetchDirective();
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'فشل في حذف المرفق',
        severity: 'error',
      });
    }
  };

  // ─── Loading / Error states ──────────────────────────
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton height={60} width={300} />
        <Skeleton height={200} sx={{ mt: 2 }} />
        <Skeleton height={200} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error || !directive) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error || 'التوجيه غير موجود'}
        </Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>
          رجوع
        </Button>
      </Box>
    );
  }

  const typeInfo = DIRECTIVE_TYPES[directive.type] || {};
  const priorityInfo = DIRECTIVE_PRIORITIES[directive.priority] || {};
  const statusInfo = DIRECTIVE_STATUS[directive.status] || {};
  const issuerInfo = ISSUER_TYPES[directive.issuedBy?.type] || {};
  const isDraft = directive.status === 'draft';
  const isActive = ['issued', 'delivered'].includes(directive.status);

  const deliveryStats = directive.deliveryStats || {};
  const totalRecipients = deliveryStats.totalRecipients || directive.recipients?.length || 0;
  const readPct = totalRecipients ? Math.round((deliveryStats.read / totalRecipients) * 100) : 0;
  const ackPct = totalRecipients
    ? Math.round((deliveryStats.acknowledged / totalRecipients) * 100)
    : 0;

  return (
    <Box sx={{ p: 3 }}>
      {/* ─── Header ────────────────────────────────────── */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate(-1)}>
          <BackIcon />
        </IconButton>
        <Avatar
          sx={{
            width: 48,
            height: 48,
            bgcolor: `${typeInfo.color || '#1976d2'}20`,
            color: typeInfo.color || '#1976d2',
          }}
        >
          {typeIcons[directive.type] || <CampaignIcon />}
        </Avatar>
        <Box flex={1}>
          <Typography variant="h5" fontWeight="bold">
            {directive.subject}
          </Typography>
          <Box display="flex" gap={1} alignItems="center" mt={0.5}>
            <Chip
              label={typeInfo.label || directive.type}
              size="small"
              sx={{ bgcolor: `${typeInfo.color}20`, color: typeInfo.color }}
            />
            <Chip
              label={priorityInfo.label || directive.priority}
              size="small"
              sx={{ bgcolor: `${priorityInfo.color}20`, color: priorityInfo.color, fontWeight: 'bold' }}
            />
            <Chip
              label={statusInfo.label || directive.status}
              size="small"
              variant="outlined"
              sx={{ borderColor: statusInfo.color, color: statusInfo.color }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {directive.referenceNumber}
            </Typography>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box display="flex" gap={1}>
          {isDraft && (
            <>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/electronic-directives/edit/${id}`)}
              >
                تعديل
              </Button>
              <Button variant="contained" startIcon={<IssueIcon />} onClick={handleIssue}>
                إصدار
              </Button>
            </>
          )}
          {isActive && (
            <>
              <Button
                variant="outlined"
                startIcon={<ReadIcon />}
                onClick={handleMarkRead}
              >
                تحديد كمقروء
              </Button>
              <Button
                variant="outlined"
                color="success"
                startIcon={<AckIcon />}
                onClick={() => setAckDialog(true)}
              >
                إقرار بالاستلام
              </Button>
            </>
          )}
          {(isDraft || isActive) && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => setCancelDialog(true)}
            >
              إلغاء
            </Button>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* ═══ Main Content ═══════════════════════════════ */}
        <Grid item xs={12} md={8}>
          {/* Content */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              محتوى التوجيه
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography
              variant="body1"
              sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}
            >
              {directive.content}
            </Typography>
          </Paper>

          {/* Recipients */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              المستلمون ({directive.recipients?.length || 0})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {directive.recipients?.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary' }}>النوع</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary' }}>الاسم</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary' }}>مقروء</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '12px', letterSpacing: 0.5, color: 'text.secondary' }}>الإقرار</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {directive.recipients.map((r, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Chip
                            label={RECIPIENT_TYPES[r.type]?.label || r.type}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{r.name || r.targetId || '—'}</TableCell>
                        <TableCell>
                          {r.readStatus?.read ? (
                            <Tooltip
                              title={
                                r.readStatus.readAt
                                  ? new Date(r.readStatus.readAt).toLocaleString('ar-SA')
                                  : ''
                              }
                            >
                              <CheckIcon color="success" fontSize="small" />
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              لم يُقرأ
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.acknowledgment?.acknowledged ? (
                            <Tooltip
                              title={
                                r.acknowledgment.acknowledgedAt
                                  ? new Date(r.acknowledgment.acknowledgedAt).toLocaleString(
                                      'ar-SA'
                                    )
                                  : ''
                              }
                            >
                              <CheckIcon color="success" fontSize="small" />
                            </Tooltip>
                          ) : directive.requiresAcknowledgment ? (
                            <Chip label="مطلوب" size="small" color="warning" variant="outlined" />
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary" textAlign="center" py={2}>
                لا توجد بيانات مستلمين
              </Typography>
            )}
          </Paper>

          {/* Required Actions */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700}>
                الإجراءات المطلوبة ({directive.requiredActions?.length || 0})
              </Typography>
              {isActive && (
                <Button
                  size="small"
                  startIcon={<PlayIcon />}
                  onClick={() => setActionDialog(true)}
                >
                  إضافة إجراء
                </Button>
              )}
            </Box>
            <Divider sx={{ mb: 2 }} />
            {directive.requiredActions?.length > 0 ? (
              <List disablePadding>
                {directive.requiredActions.map((action, idx) => {
                  const actionInfo = ACTION_STATUS[action.status] || {};
                  const isOverdue =
                    action.deadline &&
                    new Date(action.deadline) < new Date() &&
                    action.status !== 'completed';
                  return (
                    <ListItem
                      key={idx}
                      sx={{
                        bgcolor: isOverdue ? '#d32f2f08' : 'transparent',
                        borderRadius: '10px',
                        mb: 1,
                        border: isOverdue ? '1px solid #d32f2f30' : '1px solid transparent',
                      }}
                    >
                      <ListItemIcon>
                        {action.status === 'completed' ? (
                          <DoneIcon color="success" />
                        ) : isOverdue ? (
                          <WarningIcon color="error" />
                        ) : (
                          <ScheduleIcon color="action" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={action.description}
                        secondary={
                          <Box display="flex" gap={1} alignItems="center">
                            <Chip
                              label={actionInfo.label || action.status}
                              size="small"
                              sx={{
                                bgcolor: `${actionInfo.color || '#9e9e9e'}20`,
                                color: actionInfo.color || '#9e9e9e',
                                fontSize: '0.7rem',
                              }}
                            />
                            {action.deadline && (
                              <Typography variant="caption" color="text.secondary">
                                الموعد: {new Date(action.deadline).toLocaleDateString('ar-SA')}
                              </Typography>
                            )}
                            {action.completedAt && (
                              <Typography variant="caption" color="success.main">
                                أُكمل: {new Date(action.completedAt).toLocaleDateString('ar-SA')}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      {action.status !== 'completed' && isActive && (
                        <ListItemSecondaryAction>
                          <Tooltip title="إكمال الإجراء">
                            <IconButton
                              color="success"
                              onClick={() => handleCompleteAction(idx)}
                            >
                              <DoneIcon />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      )}
                    </ListItem>
                  );
                })}
              </List>
            ) : (
              <Typography color="text.secondary" textAlign="center" py={2}>
                لا توجد إجراءات مطلوبة
              </Typography>
            )}
          </Paper>

          {/* Attachments */}
          <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              المرفقات ({directive.attachments?.length || 0})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {directive.attachments?.length > 0 ? (
              <List disablePadding dense>
                {directive.attachments.map((att) => (
                  <ListItem key={att._id || att.filename}>
                    <ListItemIcon>
                      <AttachIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={att.originalName || att.filename}
                      secondary={
                        att.size
                          ? `${(att.size / 1024).toFixed(1)} KB`
                          : att.uploadedAt
                          ? new Date(att.uploadedAt).toLocaleDateString('ar-SA')
                          : ''
                      }
                    />
                    <ListItemSecondaryAction>
                      {isDraft && (
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleDeleteAttachment(att._id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" textAlign="center" py={2}>
                لا توجد مرفقات
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* ═══ Sidebar ═══════════════════════════════════ */}
        <Grid item xs={12} md={4}>
          {/* Info Card */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              معلومات التوجيه
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box mb={2}>
              <Typography variant="caption" color="text.secondary">
                الرقم المرجعي
              </Typography>
              <Typography variant="body2" fontFamily="monospace">
                {directive.referenceNumber}
              </Typography>
            </Box>

            <Box mb={2}>
              <Typography variant="caption" color="text.secondary">
                المُصدِر
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  {directive.issuedBy?.name || issuerInfo.label || '—'}
                </Typography>
              </Box>
              {directive.issuedBy?.position && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 3.5 }}>
                  {directive.issuedBy.position}
                </Typography>
              )}
            </Box>

            <Box mb={2}>
              <Typography variant="caption" color="text.secondary">
                تاريخ السريان
              </Typography>
              <Typography variant="body2">
                {directive.effectiveFrom
                  ? new Date(directive.effectiveFrom).toLocaleDateString('ar-SA')
                  : '—'}
              </Typography>
            </Box>

            {directive.effectiveUntil && (
              <Box mb={2}>
                <Typography variant="caption" color="text.secondary">
                  تاريخ الانتهاء
                </Typography>
                <Typography variant="body2">
                  {new Date(directive.effectiveUntil).toLocaleDateString('ar-SA')}
                </Typography>
              </Box>
            )}

            {directive.issuedAt && (
              <Box mb={2}>
                <Typography variant="caption" color="text.secondary">
                  تاريخ الإصدار
                </Typography>
                <Typography variant="body2">
                  {new Date(directive.issuedAt).toLocaleString('ar-SA')}
                </Typography>
              </Box>
            )}

            <Box mb={2}>
              <Typography variant="caption" color="text.secondary">
                تاريخ الإنشاء
              </Typography>
              <Typography variant="body2">
                {directive.createdAt
                  ? new Date(directive.createdAt).toLocaleString('ar-SA')
                  : '—'}
              </Typography>
            </Box>

            {directive.requiresAcknowledgment && (
              <Box mb={2}>
                <Chip label="يتطلب إقراراً" size="small" color="warning" />
                {directive.acknowledgmentDeadline && (
                  <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                    الموعد: {new Date(directive.acknowledgmentDeadline).toLocaleDateString('ar-SA')}
                  </Typography>
                )}
              </Box>
            )}

            {directive.autoExpire && (
              <Chip label="انتهاء تلقائي" size="small" variant="outlined" />
            )}
          </Paper>

          {/* Delivery Stats */}
          {isActive && totalRecipients > 0 && (
            <Paper sx={{ p: 3, mb: 3, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
              <Typography variant="h6" fontWeight={700} mb={2}>
                إحصائيات التسليم
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2">القراءة</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {deliveryStats.read || 0} / {totalRecipients} ({readPct}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={readPct}
                  sx={{ height: 8, borderRadius: 4 }}
                  color="info"
                />
              </Box>

              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2">الإقرار</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {deliveryStats.acknowledged || 0} / {totalRecipients} ({ackPct}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={ackPct}
                  sx={{ height: 8, borderRadius: 4 }}
                  color="success"
                />
              </Box>

              {deliveryStats.actionsCompleted > 0 && (
                <Box>
                  <Typography variant="body2">
                    إجراءات مكتملة: {deliveryStats.actionsCompleted}
                  </Typography>
                </Box>
              )}
            </Paper>
          )}

          {/* Tags & Categories */}
          {(directive.tags?.length > 0 || directive.categories?.length > 0) && (
            <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
              <Typography variant="h6" fontWeight={700} mb={2}>
                الوسوم والتصنيفات
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {directive.tags?.length > 0 && (
                <Box mb={1}>
                  <Typography variant="caption" color="text.secondary" mb={0.5}>
                    الوسوم
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {directive.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
              {directive.categories?.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" mb={0.5}>
                    التصنيفات
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {directive.categories.map((cat) => (
                      <Chip key={cat} label={cat} size="small" color="primary" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* ═══ Cancel Dialog ═══════════════════════════════ */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
        <DialogTitle>إلغاء التوجيه</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            يرجى ذكر سبب الإلغاء
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="سبب الإلغاء"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(false)}>تراجع</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCancel}
            disabled={!cancelReason.trim()}
          >
            تأكيد الإلغاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Acknowledge Dialog ══════════════════════════ */}
      <Dialog open={ackDialog} onClose={() => setAckDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
        <DialogTitle>الإقرار بالاستلام</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            يمكنك إضافة ملاحظة اختيارية مع الإقرار
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="ملاحظات (اختياري)"
            value={ackResponse}
            onChange={(e) => setAckResponse(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAckDialog(false)}>إلغاء</Button>
          <Button variant="contained" color="success" onClick={handleAcknowledge}>
            تأكيد الإقرار
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Add Action Dialog ═══════════════════════════ */}
      <Dialog open={actionDialog} onClose={() => setActionDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
        <DialogTitle>إضافة إجراء مطلوب</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="وصف الإجراء *"
            value={newAction.description}
            onChange={(e) => setNewAction((a) => ({ ...a, description: e.target.value }))}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            label="الموعد النهائي"
            type="date"
            value={newAction.deadline}
            onChange={(e) => setNewAction((a) => ({ ...a, deadline: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleAddAction}
            disabled={!newAction.description.trim()}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
