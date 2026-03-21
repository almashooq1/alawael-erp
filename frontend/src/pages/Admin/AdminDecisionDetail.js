import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import administrationService from '../../services/administration.service';

import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Send from '@mui/icons-material/Send';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import Visibility from '@mui/icons-material/Visibility';
import Refresh from '@mui/icons-material/Refresh';
import Flag from '@mui/icons-material/Flag';
import Lock from '@mui/icons-material/Lock';
import People from '@mui/icons-material/People';
import History from '@mui/icons-material/History';

/* ═══ Helpers ════════════════════════════════════════════════════════════════ */
const docTypeLabels = {
  decision: 'قرار إداري',
  memo: 'مذكرة',
  circular: 'تعميم',
  directive: 'توجيه',
  announcement: 'إعلان',
  policy: 'سياسة',
  procedure: 'إجراء',
  minutes: 'محضر اجتماع',
};
const docTypeIcons = {
  decision: '⚖️',
  memo: '📝',
  circular: '📢',
  directive: '📋',
  announcement: '📣',
  policy: '📜',
  procedure: '📑',
  minutes: '🗒️',
};

const statusConfig = {
  draft: { label: 'مسودة', color: 'default', gradient: 'linear-gradient(135deg,#757575,#9e9e9e)' },
  under_review: {
    label: 'قيد المراجعة',
    color: 'info',
    gradient: 'linear-gradient(135deg,#1565c0,#42a5f5)',
  },
  pending_approval: {
    label: 'بانتظار الاعتماد',
    color: 'warning',
    gradient: 'linear-gradient(135deg,#ef6c00,#ffa726)',
  },
  approved: {
    label: 'معتمد',
    color: 'success',
    gradient: 'linear-gradient(135deg,#2e7d32,#66bb6a)',
  },
  published: {
    label: 'منشور',
    color: 'success',
    gradient: 'linear-gradient(135deg,#1b5e20,#43a047)',
  },
  archived: {
    label: 'مؤرشف',
    color: 'default',
    gradient: 'linear-gradient(135deg,#546e7a,#90a4ae)',
  },
  revoked: { label: 'ملغي', color: 'error', gradient: 'linear-gradient(135deg,#c62828,#ef5350)' },
};

const categoryLabels = {
  administrative: 'إداري',
  financial: 'مالي',
  medical: 'طبي',
  legal: 'قانوني',
  hr: 'موارد بشرية',
  academic: 'أكاديمي',
  technical: 'تقني',
  operational: 'تشغيلي',
  general: 'عام',
};

const priorityLabels = {
  low: 'منخفضة',
  normal: 'عادية',
  high: 'عالية',
  urgent: 'عاجلة',
  critical: 'حرجة',
};
const priorityColors = {
  low: 'default',
  normal: 'info',
  high: 'warning',
  urgent: 'error',
  critical: 'error',
};
const confLabels = {
  public: 'عام',
  internal: 'داخلي',
  confidential: 'سري',
  top_secret: 'سري للغاية',
};

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function AdminDecisionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState(null);
  const [tab, setTab] = useState(0);
  const [actionDialog, setActionDialog] = useState({ open: false, type: '' });
  const [dialogReason, setDialogReason] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* ─── Load ──────────────────────────────────────────────────────────────── */
  const loadDecision = useCallback(async () => {
    setLoading(true);
    try {
      const res = await administrationService.getDecision(id);
      if (res?.data?.data) setDecision(res.data.data);
    } catch {
      showSnackbar('خطأ في تحميل القرار', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    loadDecision();
  }, [loadDecision]);

  /* ─── Actions ───────────────────────────────────────────────────────────── */
  const handleAction = async type => {
    if (type === 'reject' || type === 'revoke') {
      setActionDialog({ open: true, type });
      return;
    }
    setSubmitting(true);
    try {
      switch (type) {
        case 'submit':
          await administrationService.submitDecision(id);
          showSnackbar('تم الإرسال للمراجعة', 'success');
          break;
        case 'approve':
          await administrationService.approveDecision(id);
          showSnackbar('تم الاعتماد', 'success');
          break;
        case 'publish':
          await administrationService.publishDecision(id);
          showSnackbar('تم النشر', 'success');
          break;
        case 'archive':
          await administrationService.archiveDecision(id);
          showSnackbar('تم الأرشفة', 'success');
          break;
        case 'acknowledge':
          await administrationService.acknowledgeDecision(id);
          showSnackbar('تم تأكيد الاطلاع', 'success');
          break;
        default:
          break;
      }
      loadDecision();
    } catch {
      showSnackbar('خطأ في تنفيذ العملية', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDialogSubmit = async () => {
    setSubmitting(true);
    try {
      if (actionDialog.type === 'reject') {
        await administrationService.rejectDecision(id, { reason: dialogReason });
        showSnackbar('تم رفض القرار', 'success');
      } else if (actionDialog.type === 'revoke') {
        await administrationService.revokeDecision(id, { reason: dialogReason });
        showSnackbar('تم إلغاء القرار', 'success');
      }
      setActionDialog({ open: false, type: '' });
      setDialogReason('');
      loadDecision();
    } catch {
      showSnackbar('خطأ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await administrationService.addDecisionComment(id, { content: commentText });
      showSnackbar('تم إضافة التعليق', 'success');
      setCommentText('');
      loadDecision();
    } catch {
      showSnackbar('خطأ في إضافة التعليق', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (!decision) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">
          لم يتم العثور على القرار
        </Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/administration/decisions')}>
          العودة
        </Button>
      </Box>
    );
  }

  const sc = statusConfig[decision.status] || statusConfig.draft;
  const ackPct =
    decision.totalRecipients > 0
      ? Math.round((decision.acknowledgedCount / decision.totalRecipients) * 100)
      : 0;

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ background: sc.gradient, borderRadius: 3, p: 3, mb: 4, color: 'white' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={() => navigate('/administration/decisions')}
              sx={{ color: 'white' }}
            >
              <ArrowBack />
            </IconButton>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
              <Typography variant="h5">{docTypeIcons[decision.documentType] || '📄'}</Typography>
            </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h5" fontWeight="bold">
                  {decision.title}
                </Typography>
                <Chip
                  label={sc.label}
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  size="small"
                />
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {decision.decisionNumber} •{' '}
                {docTypeLabels[decision.documentType] || decision.documentType}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {decision.status === 'draft' && (
              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={() => handleAction('submit')}
                disabled={submitting}
                sx={{ bgcolor: 'white', color: 'primary.main' }}
              >
                إرسال للمراجعة
              </Button>
            )}
            {(decision.status === 'under_review' || decision.status === 'pending_approval') && (
              <>
                <Button
                  variant="contained"
                  startIcon={<CheckCircle />}
                  onClick={() => handleAction('approve')}
                  disabled={submitting}
                  sx={{ bgcolor: 'white', color: 'success.main' }}
                >
                  اعتماد
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={() => handleAction('reject')}
                  disabled={submitting}
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
                >
                  رفض
                </Button>
              </>
            )}
            {decision.status === 'approved' && (
              <Button
                variant="contained"
                startIcon={<Campaign />}
                onClick={() => handleAction('publish')}
                disabled={submitting}
                sx={{ bgcolor: 'white', color: 'success.main' }}
              >
                نشر
              </Button>
            )}
            {decision.status === 'published' && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<Visibility />}
                  onClick={() => handleAction('acknowledge')}
                  disabled={submitting}
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
                >
                  تأكيد الاطلاع
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Archive />}
                  onClick={() => handleAction('archive')}
                  disabled={submitting}
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
                >
                  أرشفة
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Block />}
                  onClick={() => handleAction('revoke')}
                  disabled={submitting}
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
                >
                  إلغاء
                </Button>
              </>
            )}
            <Tooltip title="تحديث">
              <IconButton onClick={loadDecision} sx={{ color: 'white' }}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* ─── Info cards ──────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'التصنيف',
            value: categoryLabels[decision.category] || decision.category,
            icon: <Flag />,
          },
          {
            label: 'الأولوية',
            value: priorityLabels[decision.priority] || decision.priority,
            icon: <AccessTime />,
            chipColor: priorityColors[decision.priority],
          },
          {
            label: 'السرية',
            value: confLabels[decision.confidentiality] || decision.confidentiality,
            icon: <Lock />,
          },
          { label: 'القسم', value: decision.department || '—', icon: <People /> },
        ].map((item, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Card sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ color: 'primary.main', mb: 0.5 }}>{item.icon}</Box>
                <Typography variant="caption" color="text.secondary">
                  {item.label}
                </Typography>
                {item.chipColor ? (
                  <Chip label={item.value} color={item.chipColor} size="small" sx={{ mt: 0.5 }} />
                ) : (
                  <Typography variant="body2" fontWeight="bold">
                    {item.value}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ─── Acknowledgment progress ─────────────────────────────────────── */}
      {decision.status === 'published' && decision.totalRecipients > 0 && (
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
          >
            <Typography variant="body2" fontWeight="bold">
              نسبة الاطلاع
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {decision.acknowledgedCount}/{decision.totalRecipients} ({ackPct}%)
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={ackPct}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': { borderRadius: 4 },
            }}
          />
        </Paper>
      )}

      {/* ─── Tabs ────────────────────────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="المحتوى" />
          <Tab label="المستلمون" />
          <Tab label="التعليقات" />
          <Tab label="سجل التدقيق" />
        </Tabs>
      </Paper>

      {/* ─── Tab: Content ────────────────────────────────────────────────── */}
      {tab === 0 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          {decision.subject && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                الموضوع
              </Typography>
              <Typography variant="h6">{decision.subject}</Typography>
            </Box>
          )}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              المحتوى
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
              <Typography
                sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decision.body) }}
              />
            </Paper>
          </Box>
          {decision.summary && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                الملخص
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {decision.summary}
              </Typography>
            </Box>
          )}
          {decision.issuingAuthority && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                جهة الإصدار
              </Typography>
              <Typography variant="body2">{decision.issuingAuthority}</Typography>
            </Box>
          )}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {decision.effectiveDate && (
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  تاريخ السريان
                </Typography>
                <Typography variant="body2">
                  {new Date(decision.effectiveDate).toLocaleDateString('ar-SA')}
                </Typography>
              </Grid>
            )}
            {decision.expiryDate && (
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  تاريخ الانتهاء
                </Typography>
                <Typography variant="body2">
                  {new Date(decision.expiryDate).toLocaleDateString('ar-SA')}
                </Typography>
              </Grid>
            )}
          </Grid>
          {decision.tags?.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {decision.tags.map((t, i) => (
                <Chip key={i} label={t} size="small" variant="outlined" />
              ))}
            </Box>
          )}
          {decision.rejectedReason && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                سبب الرفض:
              </Typography>
              <Typography variant="body2">{decision.rejectedReason}</Typography>
            </Alert>
          )}
          {decision.revokedReason && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                سبب الإلغاء:
              </Typography>
              <Typography variant="body2">{decision.revokedReason}</Typography>
            </Alert>
          )}
        </Paper>
      )}

      {/* ─── Tab: Recipients ─────────────────────────────────────────────── */}
      {tab === 1 && (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {decision.recipients?.sendToAll ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <People sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography>تم الإرسال لجميع الموظفين</Typography>
            </Box>
          ) : decision.recipients?.targetDepartments?.length > 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" fontWeight="bold" sx={{ mb: 2 }}>
                الأقسام المستهدفة:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {decision.recipients.targetDepartments.map((d, i) => (
                  <Chip key={i} label={d} variant="outlined" />
                ))}
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">لا توجد معلومات عن المستلمين</Typography>
            </Box>
          )}
          {decision.recipients?.individuals?.length > 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>الاسم</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>القسم</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الاطلاع</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>تاريخ الاطلاع</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {decision.recipients.individuals.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.department || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={r.acknowledged ? 'اطلع' : 'لم يطلع'}
                          size="small"
                          color={r.acknowledged ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {r.acknowledgedAt
                          ? new Date(r.acknowledgedAt).toLocaleDateString('ar-SA')
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ─── Tab: Comments ───────────────────────────────────────────────── */}
      {tab === 2 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="أضف تعليقاً..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
            />
            <Button variant="contained" onClick={handleAddComment} disabled={!commentText.trim()}>
              إرسال
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {decision.comments?.length > 0 ? (
            <List>
              {decision.comments.map((c, i) => (
                <ListItem key={i} sx={{ alignItems: 'flex-start', px: 0 }}>
                  <ListItemIcon>
                    <Comment color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {c.content}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {c.authorName || 'مستخدم'} •{' '}
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-SA') : ''}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary" textAlign="center">
              لا توجد تعليقات
            </Typography>
          )}
        </Paper>
      )}

      {/* ─── Tab: Audit trail ────────────────────────────────────────────── */}
      {tab === 3 && (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {decision.auditTrail?.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>الإجراء</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المستخدم</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>ملاحظات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {decision.auditTrail.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Chip label={a.action} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{a.userName || '—'}</TableCell>
                      <TableCell>
                        {a.timestamp ? new Date(a.timestamp).toLocaleString('ar-SA') : '—'}
                      </TableCell>
                      <TableCell>{a.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <History sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">لا يوجد سجل تدقيق</Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* ─── Reject / Revoke Dialog ──────────────────────────────────────── */}
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, type: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{actionDialog.type === 'reject' ? 'رفض القرار' : 'إلغاء القرار'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            يرجى كتابة سبب {actionDialog.type === 'reject' ? 'الرفض' : 'الإلغاء'}:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={dialogReason}
            onChange={e => setDialogReason(e.target.value)}
            placeholder="السبب..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, type: '' })}>إلغاء</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDialogSubmit}
            disabled={!dialogReason.trim() || submitting}
          >
            {submitting ? (
              <CircularProgress size={20} />
            ) : actionDialog.type === 'reject' ? (
              'رفض'
            ) : (
              'إلغاء القرار'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
