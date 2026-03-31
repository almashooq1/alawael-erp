/**
 * Correspondence Detail — عرض تفاصيل المراسلة
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Avatar,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Tab,
  Tabs,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ArrowBack,
  Reply,
  Forward,
  Archive,
  Print,
  Download,
  CheckCircle,  AttachFile,
  InsertDriveFile,
  History,
  Person,
  Business,
  CalendarMonth,
  Lock,  CallReceived,
  CallMade,
  ThumbUp,
  ThumbDown,
  Share,  Directions,
} from '@mui/icons-material';
import { gradients } from '../../theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';
import adminCommunicationsService from '../../services/adminCommunications.service';
import {
  CORRESPONDENCE_TYPES,
  CORRESPONDENCE_STATUS,
  PRIORITY_LEVELS,
  CONFIDENTIALITY_LEVELS,
  DEPARTMENTS,
} from './constants';

/* ═══ Action Dialogs ═════════════════════════════════════════════════════ */
function DirectiveDialog({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({
    toUser: '',
    toDepartment: '',
    instructions: '',
    dueDate: '',
    priority: 'normal',
  });

  const handleSubmit = () => {
    onSubmit(form);
    onClose();
    setForm({ toUser: '', toDepartment: '', instructions: '', dueDate: '', priority: 'normal' });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>إضافة توجيه</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="إلى (الموظف)"
            value={form.toUser}
            onChange={e => setForm(p => ({ ...p, toUser: e.target.value }))}
          />
          <FormControl fullWidth>
            <InputLabel>القسم</InputLabel>
            <Select
              value={form.toDepartment}
              label="القسم"
              onChange={e => setForm(p => ({ ...p, toDepartment: e.target.value }))}
            >
              {DEPARTMENTS.map(d => (
                <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="التعليمات *"
            value={form.instructions}
            onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))}
          />
          <TextField
            fullWidth
            type="date"
            label="الموعد النهائي"
            value={form.dueDate}
            onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!form.instructions.trim()}>
          إضافة التوجيه
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ApprovalDialog({ open, onClose, onApprove, onReject }) {
  const [comments, setComments] = useState('');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState('approve');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'approve' ? 'اعتماد المراسلة' : 'رفض المراسلة'}
      </DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={1} sx={{ mb: 2, mt: 1 }}>
          <Button
            variant={mode === 'approve' ? 'contained' : 'outlined'}
            color="success"
            onClick={() => setMode('approve')}
            startIcon={<ThumbUp />}
          >
            اعتماد
          </Button>
          <Button
            variant={mode === 'reject' ? 'contained' : 'outlined'}
            color="error"
            onClick={() => setMode('reject')}
            startIcon={<ThumbDown />}
          >
            رفض
          </Button>
        </Stack>
        {mode === 'approve' ? (
          <TextField
            fullWidth
            multiline
            rows={3}
            label="ملاحظات (اختياري)"
            value={comments}
            onChange={e => setComments(e.target.value)}
          />
        ) : (
          <TextField
            fullWidth
            multiline
            rows={3}
            label="سبب الرفض *"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        {mode === 'approve' ? (
          <Button
            variant="contained"
            color="success"
            onClick={() => { onApprove(comments); onClose(); }}
          >
            تأكيد الاعتماد
          </Button>
        ) : (
          <Button
            variant="contained"
            color="error"
            onClick={() => { onReject(reason); onClose(); }}
            disabled={!reason.trim()}
          >
            تأكيد الرفض
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

/* ═══ Main Component ════════════════════════════════════════════════════ */
export default function CorrespondenceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [_searchParams] = useSearchParams();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [thread, setThread] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  // Dialogs
  const [directiveDialog, setDirectiveDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);

  /* ─── Load Data ────────────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detailRes, historyRes, threadRes] = await Promise.allSettled([
        adminCommunicationsService.getById(id),
        adminCommunicationsService.getHistory(id),
        adminCommunicationsService.getThread(id),
      ]);

      if (detailRes.status === 'fulfilled') {
        setItem(detailRes.value?.data?.data || null);
      }
      if (historyRes.status === 'fulfilled') {
        setHistory(historyRes.value?.data?.data || []);
      }
      if (threadRes.status === 'fulfilled') {
        setThread(threadRes.value?.data?.data || []);
      }

      // Mark as read
      adminCommunicationsService.markAsRead(id).catch(() => {});
    } catch {
      showSnackbar('خطأ في تحميل المراسلة', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ─── Actions ──────────────────────────────────────────────────────────── */
  const handleApprove = async comments => {
    try {
      await adminCommunicationsService.approve(id, comments);
      showSnackbar('تم اعتماد المراسلة بنجاح', 'success');
      loadData();
    } catch {
      showSnackbar('خطأ في اعتماد المراسلة', 'error');
    }
  };

  const handleReject = async reason => {
    try {
      await adminCommunicationsService.reject(id, reason);
      showSnackbar('تم رفض المراسلة', 'info');
      loadData();
    } catch {
      showSnackbar('خطأ في رفض المراسلة', 'error');
    }
  };

  const handleDirective = async data => {
    try {
      await adminCommunicationsService.addDirective(id, data);
      showSnackbar('تم إضافة التوجيه بنجاح', 'success');
      loadData();
    } catch {
      showSnackbar('خطأ في إضافة التوجيه', 'error');
    }
  };

  const handleArchive = async () => {
    try {
      await adminCommunicationsService.archive(id);
      showSnackbar('تم أرشفة المراسلة', 'success');
      navigate('/admin-communications/all');
    } catch {
      showSnackbar('خطأ في أرشفة المراسلة', 'error');
    }
  };

  const handleDownloadAttachment = async (filename, originalName) => {
    try {
      const res = await adminCommunicationsService.downloadAttachment(id, filename);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName || filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showSnackbar('خطأ في تحميل المرفق', 'error');
    }
  };

  /* ─── Loading / Not Found ──────────────────────────────────────────────── */
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (!item) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">المراسلة غير موجودة أو لا تملك صلاحية الوصول</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/admin-communications')}>
          العودة
        </Button>
      </Box>
    );
  }

  const typeConfig = CORRESPONDENCE_TYPES[item.correspondenceType || item.type] || {};
  const statusConfig = CORRESPONDENCE_STATUS[item.status] || {};
  const priorityConfig = PRIORITY_LEVELS[item.priority] || {};
  const confConfig = CONFIDENTIALITY_LEVELS[item.confidentialityLevel] || {};
  const isIncoming =
    item.correspondenceType === 'incoming' || item.type === 'incoming';

  /* ─── Render ───────────────────────────────────────────────────────────── */
  return (
    <Box sx={{ p: 3 }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background:
            gradients?.primary || 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: '#fff',
          borderRadius: 2,
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton sx={{ color: '#fff' }} onClick={() => navigate(-1)}>
              <ArrowBack />
            </IconButton>
            <Avatar
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                width: 48,
                height: 48,
              }}
            >
              {isIncoming ? <CallReceived /> : <CallMade />}
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {item.subject || 'بدون عنوان'}
              </Typography>
              <Stack direction="row" spacing={1} mt={0.5}>
                <Chip
                  label={typeConfig.label || item.correspondenceType}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                />
                <Chip
                  label={item.referenceNumber || 'بدون رقم'}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }}
                />
                <Chip
                  label={statusConfig.label || item.status}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                />
              </Stack>
            </Box>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="رد">
              <IconButton
                sx={{ color: '#fff' }}
                onClick={() => navigate(`/admin-communications/compose?replyTo=${id}`)}
              >
                <Reply />
              </IconButton>
            </Tooltip>
            <Tooltip title="تحويل">
              <IconButton sx={{ color: '#fff' }} onClick={() => setDirectiveDialog(true)}>
                <Forward />
              </IconButton>
            </Tooltip>
            <Tooltip title="اعتماد / رفض">
              <IconButton sx={{ color: '#fff' }} onClick={() => setApprovalDialog(true)}>
                <CheckCircle />
              </IconButton>
            </Tooltip>
            <Tooltip title="أرشفة">
              <IconButton sx={{ color: '#fff' }} onClick={handleArchive}>
                <Archive />
              </IconButton>
            </Tooltip>
            <Tooltip title="طباعة">
              <IconButton sx={{ color: '#fff' }} onClick={() => window.print()}>
                <Print />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* ── Main Content ──────────────────────────────────── */}
        <Grid item xs={12} md={8}>
          {/* Tabs */}
          <Paper sx={{ mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="fullWidth"
            >
              <Tab label="المراسلة" />
              <Tab label="المرفقات" />
              <Tab label="سجل الإجراءات" />
              <Tab label="سلسلة المراسلات" />
            </Tabs>
          </Paper>

          {/* Tab 0: Content */}
          {activeTab === 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                نص المراسلة
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.8,
                  minHeight: 200,
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                }}
              >
                {item.body || item.content || '(لا يوجد محتوى)'}
              </Typography>

              {item.notes && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    ملاحظات داخلية:
                  </Typography>
                  {item.notes}
                </Alert>
              )}

              {/* Directives */}
              {item.directives?.length > 0 && (
                <Box mt={3}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    <Directions sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                    التوجيهات
                  </Typography>
                  <List dense>
                    {item.directives.map((d, i) => (
                      <ListItem
                        key={i}
                        sx={{ bgcolor: '#fff8e1', borderRadius: 1, mb: 0.5 }}
                      >
                        <ListItemIcon>
                          <Directions color="warning" />
                        </ListItemIcon>
                        <ListItemText
                          primary={d.instructions}
                          secondary={`من: ${d.fromUserName || '-'} — إلى: ${d.toUser || d.toDepartment || '-'} — ${d.dueDate ? new Date(d.dueDate).toLocaleDateString('ar-SA') : ''}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Paper>
          )}

          {/* Tab 1: Attachments */}
          {activeTab === 1 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                <AttachFile sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                المرفقات ({item.attachments?.length || 0})
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {!item.attachments?.length ? (
                <Box py={4} textAlign="center">
                  <Typography color="text.secondary">لا توجد مرفقات</Typography>
                </Box>
              ) : (
                <List>
                  {item.attachments.map((att, i) => (
                    <ListItem
                      key={i}
                      sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}
                    >
                      <ListItemIcon>
                        <InsertDriveFile color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={att.originalName || att.fileName}
                        secondary={att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : ''}
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="تحميل">
                          <IconButton
                            onClick={() =>
                              handleDownloadAttachment(att.fileName, att.originalName)
                            }
                          >
                            <Download />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          )}

          {/* Tab 2: History */}
          {activeTab === 2 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                <History sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                سجل الإجراءات
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {history.length === 0 ? (
                <Box py={4} textAlign="center">
                  <Typography color="text.secondary">لا يوجد سجل إجراءات</Typography>
                </Box>
              ) : (
                <List>
                  {history.map((action, i) => (
                    <ListItem key={i} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                      <ListItemIcon>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.light' }}>
                          <History fontSize="small" />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={action.actionType || action.action}
                        secondary={
                          <>
                            {action.performedBy?.nameAr || action.performedBy?.name || '-'}
                            {' — '}
                            {action.performedAt
                              ? new Date(action.performedAt).toLocaleString('ar-SA')
                              : ''}
                            {action.comments && (
                              <Typography variant="caption" display="block">
                                {action.comments}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          )}

          {/* Tab 3: Thread */}
          {activeTab === 3 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                <Share sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                سلسلة المراسلات
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {thread.length === 0 ? (
                <Box py={4} textAlign="center">
                  <Typography color="text.secondary">لا توجد مراسلات مرتبطة</Typography>
                </Box>
              ) : (
                <List>
                  {thread.map((t, i) => (
                    <ListItem
                      key={t._id || i}
                      button
                      onClick={() =>
                        t._id !== id && navigate(`/admin-communications/view/${t._id}`)
                      }
                      sx={{
                        bgcolor: t._id === id ? '#e3f2fd' : 'inherit',
                        borderRadius: 1,
                        mb: 0.5,
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography
                            variant="body2"
                            fontWeight={t._id === id ? 'bold' : 'normal'}
                          >
                            {t.subject || 'بدون عنوان'}
                            {t._id === id && ' (الحالية)'}
                          </Typography>
                        }
                        secondary={`${t.referenceNumber || '-'} — ${t.createdAt ? new Date(t.createdAt).toLocaleDateString('ar-SA') : ''}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          )}
        </Grid>

        {/* ── Sidebar Info ──────────────────────────────────── */}
        <Grid item xs={12} md={4}>
          {/* Correspondence Info */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                بيانات المراسلة
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    الرقم المرجعي
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {item.referenceNumber || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">النوع</Typography>
                  <Box>
                    <Chip
                      label={typeConfig.label || '-'}
                      size="small"
                      sx={{ bgcolor: typeConfig.bg, color: typeConfig.color }}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">الحالة</Typography>
                  <Box>
                    <Chip
                      label={statusConfig.label || item.status}
                      size="small"
                      color={statusConfig.color || 'default'}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">الأولوية</Typography>
                  <Box>
                    <Chip
                      label={priorityConfig.label || item.priority}
                      size="small"
                      color={priorityConfig.chipColor || 'default'}
                      variant="outlined"
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">السرية</Typography>
                  <Typography variant="body2">
                    {item.confidentialityLevel === 'top_secret' && (
                      <Lock fontSize="inherit" sx={{ mr: 0.5, color: '#f44336' }} />
                    )}
                    {confConfig.label || item.confidentialityLevel || '-'}
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">تاريخ الإنشاء</Typography>
                  <Typography variant="body2">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString('ar-SA')
                      : '-'}
                  </Typography>
                </Box>
                {item.dueDate && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      <CalendarMonth fontSize="inherit" sx={{ mr: 0.5 }} />
                      تاريخ الاستحقاق
                    </Typography>
                    <Typography
                      variant="body2"
                      color={
                        new Date(item.dueDate) < new Date() ? 'error.main' : 'text.primary'
                      }
                      fontWeight="bold"
                    >
                      {new Date(item.dueDate).toLocaleDateString('ar-SA')}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Sender */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                <Person sx={{ verticalAlign: 'middle', mr: 0.5, fontSize: 20 }} />
                المرسل
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Typography variant="body2" fontWeight="bold">
                {item.sender?.entityId?.nameAr ||
                  item.sender?.entityId?.name ||
                  item.senderName ||
                  '-'}
              </Typography>
              {(item.sender?.department || item.senderDepartment) && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {item.sender?.department || item.senderDepartment}
                </Typography>
              )}
              {item.senderOrganization && (
                <Typography variant="caption" color="text.secondary" display="block">
                  <Business fontSize="inherit" sx={{ mr: 0.3 }} />
                  {item.senderOrganization}
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                <Business sx={{ verticalAlign: 'middle', mr: 0.5, fontSize: 20 }} />
                المستلمون
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              {item.recipients?.length > 0 ? (
                <List dense disablePadding>
                  {item.recipients.map((r, i) => (
                    <ListItem key={i} disableGutters>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Person fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={r.entityId?.nameAr || r.entityId?.name || r.name || '-'}
                        secondary={r.status ? CORRESPONDENCE_STATUS[r.status]?.label : ''}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2">
                  {item.receiverName || '-'}
                  {item.receiverDepartment && ` — ${item.receiverDepartment}`}
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Keywords */}
          {item.keywords?.length > 0 && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  الكلمات المفتاحية
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {item.keywords.map((kw, i) => (
                    <Chip key={i} label={kw} size="small" variant="outlined" />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                إجراءات
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Stack spacing={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Reply />}
                  onClick={() => navigate(`/admin-communications/compose?replyTo=${id}`)}
                >
                  رد على المراسلة
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Directions />}
                  onClick={() => setDirectiveDialog(true)}
                >
                  إضافة توجيه
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="success"
                  startIcon={<CheckCircle />}
                  onClick={() => setApprovalDialog(true)}
                >
                  اعتماد / رفض
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="inherit"
                  startIcon={<Archive />}
                  onClick={handleArchive}
                >
                  أرشفة
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Dialogs ─────────────────────────────────────────── */}
      <DirectiveDialog
        open={directiveDialog}
        onClose={() => setDirectiveDialog(false)}
        onSubmit={handleDirective}
      />
      <ApprovalDialog
        open={approvalDialog}
        onClose={() => setApprovalDialog(false)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </Box>
  );
}
