import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eStampService from '../../services/eStamp.service';




import { useSnackbar } from '../../contexts/SnackbarContext';

/* ═══ Helpers ════════════════════════════════════════════════════════════════ */
const typeLabels = {
  official: 'رسمي',
  department: 'إداري',
  personal: 'شخصي',
  temporary: 'مؤقت',
  project: 'مشروع',
  confidential: 'سري',
  received: 'وارد',
  approved: 'معتمد',
  rejected: 'مرفوض',
  draft: 'مسودة',
  copy: 'نسخة',
  urgent: 'عاجل',
};

const statusConfig = {
  draft: {
    label: 'مسودة',
    color: 'default',
    gradient: 'linear-gradient(135deg, #757575, #9e9e9e)',
  },
  pending_approval: {
    label: 'بانتظار الاعتماد',
    color: 'warning',
    gradient: 'linear-gradient(135deg, #ef6c00, #ffa726)',
  },
  active: {
    label: 'مفعّل',
    color: 'success',
    gradient: 'linear-gradient(135deg, #2e7d32, #66bb6a)',
  },
  suspended: {
    label: 'معلّق',
    color: 'info',
    gradient: 'linear-gradient(135deg, #1565c0, #42a5f5)',
  },
  revoked: { label: 'ملغي', color: 'error', gradient: 'linear-gradient(135deg, #c62828, #ef5350)' },
  expired: {
    label: 'منتهي',
    color: 'default',
    gradient: 'linear-gradient(135deg, #546e7a, #90a4ae)',
  },
};

const actionLabels = {
  created: 'إنشاء',
  submitted_for_approval: 'تقديم للاعتماد',
  approved: 'اعتماد',
  rejected: 'رفض',
  activated: 'تفعيل',
  deactivated: 'تعليق',
  revoked: 'إلغاء',
  renewed: 'تجديد',
  applied: 'تطبيق',
  verified: 'تحقق',
  updated: 'تحديث',
  transferred: 'نقل ملكية',
  expired: 'انتهاء',
  deleted: 'حذف',
};

const actionIcons = {
  created: '🆕',
  submitted_for_approval: '📤',
  approved: '✅',
  rejected: '❌',
  activated: '🟢',
  deactivated: '⏸️',
  revoked: '🚫',
  renewed: '🔄',
  applied: '🔏',
  verified: '🔍',
  updated: '✏️',
  transferred: '🔀',
  expired: '⏰',
  deleted: '🗑️',
};

export default function EStampDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [stamp, setStamp] = useState(null);
  const [tab, setTab] = useState(0);

  /* Dialogs */
  const [renewDialog, setRenewDialog] = useState(false);
  const [renewDate, setRenewDate] = useState('');
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [authDialog, setAuthDialog] = useState(false);
  const [newAuth, setNewAuth] = useState({ name: '', email: '', department: '', role: 'user' });

  /* ─── Load ──────────────────────────────────────────────────────────────── */
  const loadStamp = useCallback(async () => {
    setLoading(true);
    try {
      const res = await eStampService.getById(id);
      if (res?.data?.data) setStamp(res.data.data);
    } catch {
      showSnackbar('خطأ في تحميل الختم', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    loadStamp();
  }, [loadStamp]);

  /* ─── Actions ───────────────────────────────────────────────────────────── */
  const doAction = async (fn, successMsg) => {
    try {
      await fn();
      showSnackbar(successMsg, 'success');
      loadStamp();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'خطأ', 'error');
    }
  };

  const handleApprove = () => doAction(() => eStampService.approve(id), 'تم اعتماد الختم');
  const handleActivate = () => doAction(() => eStampService.activate(id), 'تم تفعيل الختم');
  const handleDeactivate = () => doAction(() => eStampService.deactivate(id, {}), 'تم تعليق الختم');
  const handleRevoke = () => doAction(() => eStampService.revoke(id, {}), 'تم إلغاء الختم');
  const handleSubmitApproval = () =>
    doAction(() => eStampService.submitForApproval(id), 'تم التقديم للاعتماد');

  const handleRenew = async () => {
    if (!renewDate) return;
    await doAction(() => eStampService.renew(id, { validUntil: renewDate }), 'تم تجديد الختم');
    setRenewDialog(false);
  };

  const handleReject = async () => {
    await doAction(() => eStampService.reject(id, { reason: rejectReason }), 'تم رفض الختم');
    setRejectDialog(false);
  };

  const handleAddAuth = async () => {
    if (!newAuth.name) return;
    await doAction(() => eStampService.authorizeUser(id, newAuth), `تم تفويض ${newAuth.name}`);
    setAuthDialog(false);
    setNewAuth({ name: '', email: '', department: '', role: 'user' });
  };

  const handleRemoveAuth = async userId => {
    await doAction(() => eStampService.removeAuthorization(id, userId), 'تم إزالة التفويض');
  };

  if (loading)
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress size={48} />
      </Box>
    );
  if (!stamp)
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        الختم غير موجود
      </Alert>
    );

  const sc = statusConfig[stamp.status] || statusConfig.draft;
  const usageHistory = (stamp.usageHistory || []).sort(
    (a, b) => new Date(b.appliedAt) - new Date(a.appliedAt)
  );
  const auditTrail = (stamp.auditTrail || []).sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

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
            {stamp.stampImage ? (
              <Avatar
                src={stamp.stampImage}
                variant="rounded"
                sx={{
                  width: 64,
                  height: 64,
                  border: '2px solid rgba(255,255,255,0.5)',
                  bgcolor: 'white',
                }}
              />
            ) : (
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 64, height: 64 }}>
                <Verified sx={{ fontSize: 36 }} />
              </Avatar>
            )}
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {stamp.name_ar}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                <Chip
                  label={sc.label}
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  size="small"
                />
                <Typography variant="body2" sx={{ opacity: 0.8, fontFamily: 'monospace' }}>
                  {stamp.stampId}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/e-stamp')}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
            >
              رجوع
            </Button>

            {stamp.status === 'active' && (
              <Button
                variant="contained"
                startIcon={<Verified />}
                onClick={() => navigate(`/e-stamp/apply/${stamp._id}`)}
                sx={{ bgcolor: 'white', color: 'primary.main' }}
              >
                تطبيق
              </Button>
            )}
            {stamp.status === 'draft' && (
              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={handleSubmitApproval}
                sx={{ bgcolor: 'white', color: 'primary.main' }}
              >
                تقديم للاعتماد
              </Button>
            )}
            {stamp.status === 'pending_approval' && (
              <>
                <Button
                  variant="contained"
                  startIcon={<CheckCircle />}
                  onClick={handleApprove}
                  sx={{ bgcolor: 'white', color: 'success.main' }}
                >
                  اعتماد
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Block />}
                  onClick={() => setRejectDialog(true)}
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
                >
                  رفض
                </Button>
              </>
            )}
            {stamp.status === 'active' && (
              <Button
                variant="outlined"
                startIcon={<Block />}
                onClick={handleDeactivate}
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
              >
                تعليق
              </Button>
            )}
            {stamp.status === 'suspended' && (
              <Button
                variant="contained"
                startIcon={<CheckCircle />}
                onClick={handleActivate}
                sx={{ bgcolor: 'white', color: 'success.main' }}
              >
                تفعيل
              </Button>
            )}
            {stamp.status === 'expired' && (
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={() => setRenewDialog(true)}
                sx={{ bgcolor: 'white', color: 'primary.main' }}
              >
                تجديد
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {/* ─── Tabs ────────────────────────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="التفاصيل" />
          <Tab label={`سجل الاستخدام (${usageHistory.length})`} />
          <Tab label={`المفوّضون (${stamp.authorizedUsers?.length || 0})`} />
          <Tab label={`سجل التدقيق (${auditTrail.length})`} />
        </Tabs>
      </Paper>

      {/* ─── Tab 0: Details ──────────────────────────────────────────────── */}
      {tab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
              {stamp.stampImage ? (
                <Box
                  component="img"
                  src={stamp.stampImage}
                  sx={{
                    width: stamp.size?.width || 150,
                    height: stamp.size?.height || 150,
                    mx: 'auto',
                    display: 'block',
                    mb: 2,
                  }}
                />
              ) : (
                <Avatar
                  sx={{
                    width: 120,
                    height: 120,
                    mx: 'auto',
                    bgcolor: stamp.colorScheme?.primary || '#1a237e',
                    mb: 2,
                  }}
                >
                  <Verified sx={{ fontSize: 64, color: 'white' }} />
                </Avatar>
              )}
              <Chip label={typeLabels[stamp.stampType] || stamp.stampType} sx={{ mb: 1 }} />
              <Typography variant="h6" fontWeight="bold">
                {stamp.name_ar}
              </Typography>
              {stamp.name_en && (
                <Typography variant="body2" color="text.secondary">
                  {stamp.name_en}
                </Typography>
              )}
            </Paper>

            {/* Usage summary */}
            <Paper sx={{ p: 2, mt: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                إحصائيات الاستخدام
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">إجمالي الاستخدامات</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {stamp.usageCount || 0}
                </Typography>
              </Box>
              {stamp.maxUsageCount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">الحد الأقصى</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stamp.maxUsageCount}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">آخر استخدام</Typography>
                <Typography variant="body2">
                  {stamp.lastUsedAt ? new Date(stamp.lastUsedAt).toLocaleDateString('ar-SA') : '—'}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                بيانات الختم
              </Typography>
              <Grid container spacing={2}>
                {[
                  { label: 'رقم الختم', value: stamp.stampId },
                  { label: 'النوع', value: typeLabels[stamp.stampType] },
                  { label: 'التصنيف', value: stamp.category },
                  { label: 'المؤسسة', value: stamp.organization },
                  { label: 'القسم', value: stamp.department || '—' },
                  { label: 'مستوى الصلاحية', value: stamp.authorityLevel },
                  { label: 'الأولوية', value: stamp.priority },
                  { label: 'أنشأه', value: stamp.createdByName || '—' },
                  {
                    label: 'تاريخ الإنشاء',
                    value: stamp.createdAt
                      ? new Date(stamp.createdAt).toLocaleDateString('ar-SA')
                      : '—',
                  },
                  {
                    label: 'صالح من',
                    value: stamp.validFrom
                      ? new Date(stamp.validFrom).toLocaleDateString('ar-SA')
                      : '—',
                  },
                  {
                    label: 'صالح حتى',
                    value: stamp.validUntil
                      ? new Date(stamp.validUntil).toLocaleDateString('ar-SA')
                      : 'غير محدود',
                  },
                  { label: 'اعتمده', value: stamp.approvedByName || '—' },
                ].map((item, i) => (
                  <Grid item xs={6} sm={4} key={i}>
                    <Typography variant="caption" color="text.secondary">
                      {item.label}
                    </Typography>
                    <Typography variant="body2" fontWeight="600">
                      {item.value}
                    </Typography>
                  </Grid>
                ))}
              </Grid>

              {stamp.description && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    الوصف
                  </Typography>
                  <Typography variant="body2">{stamp.description}</Typography>
                </>
              )}

              {stamp.tags?.length > 0 && (
                <Box sx={{ mt: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {stamp.tags.map((t, i) => (
                    <Chip key={i} label={t} size="small" variant="outlined" />
                  ))}
                </Box>
              )}
            </Paper>

            {/* Security Settings */}
            <Paper sx={{ p: 3, mt: 2, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                <Lock sx={{ verticalAlign: 'middle', ml: 1 }} /> إعدادات الأمان
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Chip
                    label={stamp.requireOTP ? 'OTP مطلوب' : 'OTP غير مطلوب'}
                    color={stamp.requireOTP ? 'warning' : 'default'}
                    size="small"
                  />
                </Grid>
                <Grid item xs={4}>
                  <Chip
                    label={stamp.requireApprovalPerUse ? 'موافقة لكل استخدام' : 'بدون موافقة'}
                    color={stamp.requireApprovalPerUse ? 'warning' : 'default'}
                    size="small"
                  />
                </Grid>
                <Grid item xs={4}>
                  <Chip
                    label={stamp.isExpirable ? 'محدود المدة' : 'غير محدود المدة'}
                    color={stamp.isExpirable ? 'info' : 'default'}
                    size="small"
                  />
                </Grid>
              </Grid>
              {stamp.watermarkText && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  علامة مائية: <strong>{stamp.watermarkText}</strong>
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ─── Tab 1: Usage History ────────────────────────────────────────── */}
      {tab === 1 && (
        <Paper sx={{ borderRadius: 2 }}>
          {usageHistory.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <History sx={{ fontSize: 48, color: 'text.disabled' }} />
              <Typography color="text.secondary">لا يوجد سجل استخدام</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>المستند</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>طُبّق بواسطة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>كود التحقق</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>ملاحظات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usageHistory.map((u, i) => (
                    <TableRow key={i} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600">
                          {u.documentTitle || u.documentId || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{u.documentType || '—'}</TableCell>
                      <TableCell>{u.appliedByName || '—'}</TableCell>
                      <TableCell>
                        {u.appliedAt ? new Date(u.appliedAt).toLocaleString('ar-SA') : '—'}
                      </TableCell>
                      <TableCell>
                        {u.verificationCode && (
                          <Chip
                            label={u.verificationCode}
                            size="small"
                            variant="outlined"
                            sx={{ fontFamily: 'monospace', fontSize: 11 }}
                            onClick={() => {
                              navigator.clipboard.writeText(u.verificationCode);
                              showSnackbar('تم النسخ', 'info');
                            }}
                            icon={<ContentCopy sx={{ fontSize: 14 }} />}
                          />
                        )}
                      </TableCell>
                      <TableCell>{u.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ─── Tab 2: Authorized Users ─────────────────────────────────────── */}
      {tab === 2 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              المستخدمون المفوّضون
            </Typography>
            <Button size="small" startIcon={<People />} onClick={() => setAuthDialog(true)}>
              إضافة مستخدم
            </Button>
          </Box>
          {(stamp.authorizedUsers || []).length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <People sx={{ fontSize: 48, color: 'text.disabled' }} />
              <Typography color="text.secondary">لا يوجد مفوّضون</Typography>
            </Box>
          ) : (
            <List>
              {stamp.authorizedUsers.map((u, i) => (
                <ListItem
                  key={i}
                  sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}
                  secondaryAction={
                    u.role !== 'owner' && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveAuth(u.userId || u._id)}
                      >
                        <Delete />
                      </IconButton>
                    )
                  }
                >
                  <ListItemIcon>
                    <Avatar
                      sx={{
                        bgcolor: u.role === 'owner' ? 'primary.main' : 'grey.400',
                        width: 36,
                        height: 36,
                        fontSize: 14,
                      }}
                    >
                      {u.name?.[0] || '?'}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography fontWeight="600">{u.name}</Typography>
                        <Chip
                          label={
                            u.role === 'owner'
                              ? 'مالك'
                              : u.role === 'admin'
                                ? 'مسؤول'
                                : u.role === 'viewer'
                                  ? 'مشاهد'
                                  : 'مستخدم'
                          }
                          size="small"
                          color={u.role === 'owner' ? 'primary' : 'default'}
                        />
                      </Box>
                    }
                    secondary={`${u.email || ''} ${u.department ? `— ${u.department}` : ''}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      )}

      {/* ─── Tab 3: Audit Trail ──────────────────────────────────────────── */}
      {tab === 3 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            سجل التدقيق
          </Typography>
          {auditTrail.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              لا يوجد سجل
            </Typography>
          ) : (
            <List>
              {auditTrail.map((entry, i) => (
                <ListItem key={i} sx={{ borderBottom: '1px solid #f0f0f0' }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Typography sx={{ fontSize: 20 }}>
                      {actionIcons[entry.action] || '📋'}
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip
                          label={actionLabels[entry.action] || entry.action}
                          size="small"
                          variant="outlined"
                        />
                        <Typography variant="body2">{entry.details}</Typography>
                      </Box>
                    }
                    secondary={`${entry.performerName || 'النظام'} — ${entry.timestamp ? new Date(entry.timestamp).toLocaleString('ar-SA') : ''}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      )}

      {/* ═══ Renew Dialog ════════════════════════════════════════════════════ */}
      <Dialog open={renewDialog} onClose={() => setRenewDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>تجديد الختم</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="date"
            label="صالح حتى"
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
            value={renewDate}
            onChange={e => setRenewDate(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenewDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleRenew} disabled={!renewDate}>
            تجديد
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Reject Dialog ═══════════════════════════════════════════════════ */}
      <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>رفض الختم</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="سبب الرفض"
            sx={{ mt: 2 }}
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(false)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleReject}>
            رفض
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Add Authorization Dialog ════════════════════════════════════════ */}
      <Dialog open={authDialog} onClose={() => setAuthDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة مستخدم مفوّض</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                required
                label="الاسم"
                value={newAuth.name}
                onChange={e => setNewAuth({ ...newAuth, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                label="البريد"
                value={newAuth.email}
                onChange={e => setNewAuth({ ...newAuth, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                label="القسم"
                value={newAuth.department}
                onChange={e => setNewAuth({ ...newAuth, department: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="الدور"
                value={newAuth.role}
                onChange={e => setNewAuth({ ...newAuth, role: e.target.value })}
              >
                <MenuItem value="admin">مسؤول</MenuItem>
                <MenuItem value="user">مستخدم</MenuItem>
                <MenuItem value="viewer">مشاهد</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAuthDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleAddAuth} disabled={!newAuth.name}>
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
