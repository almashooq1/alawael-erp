import { useState, useEffect, useCallback } from 'react';




import { sharingApi } from '../../services/documentProPhase3Service';
import logger from '../../utils/logger';

const PERMISSIONS = [
  { value: 'view', label: 'عرض فقط', icon: <Visibility fontSize="small" />, color: 'info' },
  { value: 'comment', label: 'عرض وتعليق', icon: <CommentIcon fontSize="small" />, color: 'primary' },
  { value: 'edit', label: 'تعديل', icon: <EditIcon fontSize="small" />, color: 'warning' },
  { value: 'admin', label: 'إدارة كاملة', icon: <AdminPanelSettings fontSize="small" />, color: 'error' },
];

/* ═══════════════════════════════════════════════════
 *  Tab Panel Helper
 * ═══════════════════════════════════════════════════ */
function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

/* ═══════════════════════════════════════════════════
 *  SharingDialog — Main export
 * ═══════════════════════════════════════════════════ */
export default function SharingDialog({ open, onClose, documentId, documentTitle }) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [shares, setShares] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Share with user form
  const [targetUserId, setTargetUserId] = useState('');
  const [targetUserName, setTargetUserName] = useState('');
  const [permission, setPermission] = useState('view');
  const [message, setMessage] = useState('');

  // Department share
  const [departmentId, setDepartmentId] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [deptPermission, setDeptPermission] = useState('view');

  // Public link
  const [publicLink, setPublicLink] = useState(null);
  const [linkPassword, setLinkPassword] = useState('');
  const [linkExpiry, setLinkExpiry] = useState(7);
  const [maxAccess, setMaxAccess] = useState(0);

  // ── Load shares ────────────────────
  const loadShares = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const [sharesRes, statsRes] = await Promise.all([
        sharingApi.getDocumentShares(documentId),
        sharingApi.getStats(documentId),
      ]);
      setShares(sharesRes.data?.shares ?? []);
      setStats(statsRes.data?.stats ?? null);
    } catch (err) {
      logger.error('Load shares error', err);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (open) loadShares();
  }, [open, loadShares]);

  // ── Share with User ────────────────────
  const handleShareUser = async () => {
    if (!targetUserId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await sharingApi.shareWithUser({
        documentId,
        targetUserId: targetUserId.trim(),
        targetUserName: targetUserName.trim(),
        permission,
        message,
      });
      setSuccess('تمت المشاركة بنجاح');
      setTargetUserId('');
      setTargetUserName('');
      setMessage('');
      loadShares();
    } catch (err) {
      setError(err.response?.data?.error || 'فشلت المشاركة');
    } finally {
      setLoading(false);
    }
  };

  // ── Share with Department ────────────────────
  const handleShareDepartment = async () => {
    if (!departmentId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await sharingApi.shareWithDepartment({
        documentId,
        departmentId: departmentId.trim(),
        departmentName: departmentName.trim(),
        permission: deptPermission,
      });
      setSuccess('تمت المشاركة مع القسم بنجاح');
      setDepartmentId('');
      setDepartmentName('');
      loadShares();
    } catch (err) {
      setError(err.response?.data?.error || 'فشلت المشاركة');
    } finally {
      setLoading(false);
    }
  };

  // ── Create Public Link ────────────────────
  const handleCreateLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await sharingApi.createPublicLink({
        documentId,
        password: linkPassword || undefined,
        expiresInDays: linkExpiry,
        maxAccessCount: maxAccess || undefined,
      });
      setPublicLink(res.data?.share?.shareLink ?? res.data?.shareLink);
      setSuccess('تم إنشاء الرابط');
      loadShares();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل إنشاء الرابط');
    } finally {
      setLoading(false);
    }
  };

  // ── Revoke share ────────────────────
  const handleRevoke = async (shareId) => {
    try {
      await sharingApi.revokeShare(shareId);
      loadShares();
    } catch (err) {
      logger.error('Revoke error', err);
    }
  };

  // ── Copy link ────────────────────
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('تم نسخ الرابط');
    setTimeout(() => setSuccess(null), 2000);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" dir="rtl">
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <ShareIcon color="primary" />
            <Typography variant="h6">مشاركة المستند</Typography>
          </Stack>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Stack>
        {documentTitle && (
          <Typography variant="body2" color="text.secondary">{documentTitle}</Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab icon={<PersonIcon />} label="مشاركة مع مستخدم" />
          <Tab icon={<GroupIcon />} label="مشاركة مع قسم" />
          <Tab icon={<LinkIcon />} label="رابط عام" />
        </Tabs>

        {/* Tab 0: Share with User */}
        <TabPanel value={tab} index={0}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="معرّف المستخدم"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              placeholder="أدخل معرّف المستخدم"
            />
            <TextField
              fullWidth
              label="اسم المستخدم (اختياري)"
              value={targetUserName}
              onChange={(e) => setTargetUserName(e.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel>الصلاحيات</InputLabel>
              <Select value={permission} label="الصلاحيات" onChange={(e) => setPermission(e.target.value)}>
                {PERMISSIONS.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {p.icon}
                      <span>{p.label}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="رسالة (اختياري)"
              multiline
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="أرسل رسالة مع المشاركة..."
            />
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} /> : <ShareIcon />}
              onClick={handleShareUser}
              disabled={loading || !targetUserId.trim()}
            >
              مشاركة
            </Button>
          </Stack>
        </TabPanel>

        {/* Tab 1: Share with Department */}
        <TabPanel value={tab} index={1}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="معرّف القسم"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            />
            <TextField
              fullWidth
              label="اسم القسم"
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel>الصلاحيات</InputLabel>
              <Select value={deptPermission} label="الصلاحيات" onChange={(e) => setDeptPermission(e.target.value)}>
                {PERMISSIONS.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {p.icon}
                      <span>{p.label}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} /> : <GroupIcon />}
              onClick={handleShareDepartment}
              disabled={loading || !departmentId.trim()}
            >
              مشاركة مع القسم
            </Button>
          </Stack>
        </TabPanel>

        {/* Tab 2: Public Link */}
        <TabPanel value={tab} index={2}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="كلمة مرور (اختياري)"
              type="password"
              value={linkPassword}
              onChange={(e) => setLinkPassword(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><LockIcon /></InputAdornment>,
              }}
            />
            <TextField
              fullWidth
              label="مدة الصلاحية (أيام)"
              type="number"
              value={linkExpiry}
              onChange={(e) => setLinkExpiry(parseInt(e.target.value) || 7)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><ScheduleIcon /></InputAdornment>,
              }}
            />
            <TextField
              fullWidth
              label="الحد الأقصى للوصول (0 = غير محدود)"
              type="number"
              value={maxAccess}
              onChange={(e) => setMaxAccess(parseInt(e.target.value) || 0)}
            />
            <Button
              variant="contained"
              color="secondary"
              startIcon={loading ? <CircularProgress size={16} /> : <LinkIcon />}
              onClick={handleCreateLink}
              disabled={loading}
            >
              إنشاء رابط عام
            </Button>

            {publicLink && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>🔗 الرابط العام</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    fullWidth
                    size="small"
                    value={publicLink}
                    InputProps={{ readOnly: true }}
                  />
                  <Tooltip title="نسخ">
                    <IconButton color="primary" onClick={() => copyToClipboard(publicLink)}>
                      <ContentCopy />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Paper>
            )}
          </Stack>
        </TabPanel>

        {/* Current shares list */}
        <Divider sx={{ my: 3 }} />
        <Typography variant="h6" gutterBottom>
          المشاركات الحالية
          {stats && <Chip label={`${stats.totalShares ?? 0} مشاركة`} size="small" sx={{ mr: 1 }} />}
        </Typography>

        {shares.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={2}>
            لا توجد مشاركات حالية
          </Typography>
        ) : (
          <List>
            {shares.map((share, i) => (
              <React.Fragment key={share._id || i}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: share.shareType === 'public' ? 'secondary.main' : share.shareType === 'department' ? 'info.main' : 'primary.main' }}>
                      {share.shareType === 'public' ? <PublicIcon /> : share.shareType === 'department' ? <GroupIcon /> : <PersonIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>
                          {share.shareType === 'public'
                            ? 'رابط عام'
                            : share.shareType === 'department'
                            ? share.targetDepartmentName || share.targetDepartmentId
                            : share.targetUserName || share.targetUserId}
                        </span>
                        <Chip
                          size="small"
                          label={PERMISSIONS.find((p) => p.value === share.permission)?.label || share.permission}
                          color={PERMISSIONS.find((p) => p.value === share.permission)?.color || 'default'}
                          variant="outlined"
                        />
                      </Stack>
                    }
                    secondary={
                      <Stack direction="row" spacing={1} component="span">
                        <span>{new Date(share.createdAt).toLocaleString('ar-SA')}</span>
                        {share.expiresAt && <span>• ينتهي {new Date(share.expiresAt).toLocaleDateString('ar-SA')}</span>}
                        {share.accessCount > 0 && <span>• {share.accessCount} زيارة</span>}
                      </Stack>
                    }
                  />
                  <ListItemSecondaryAction>
                    {share.shareLink && (
                      <Tooltip title="نسخ الرابط">
                        <IconButton onClick={() => copyToClipboard(share.shareLink)}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="إلغاء المشاركة">
                      <IconButton edge="end" color="error" onClick={() => handleRevoke(share._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
                {i < shares.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}
