/**
 * UserDetailDialog — حوار عرض تفاصيل المستخدم
 */
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Chip,
  Grid,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tab,
  Tabs,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CalendarToday as DateIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
  Badge as RoleIcon,
  Business as BranchIcon,
  Login as LoginIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Lock as LockedIcon,
  Laptop as DeviceIcon,
  LocationOn as LocationIcon,
  Fingerprint as MfaIcon,
  VerifiedUser as VerifiedIcon,
  GppBad as NotVerifiedIcon,
  Shield as ShieldIcon,
  Router as IpIcon,
} from '@mui/icons-material';
import { getRoleColor, getRoleLabel } from './constants';
import userManagementService from 'services/userManagementService';

const formatDate = (date) => {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const ACTION_LABELS = {
  user_created: 'إنشاء حساب',
  user_updated: 'تحديث بيانات',
  user_deactivated: 'تعطيل حساب',
  user_activated: 'تفعيل حساب',
  user_unlocked: 'فك قفل',
  password_reset_by_admin: 'إعادة تعيين كلمة المرور',
  permissions_updated: 'تحديث الصلاحيات',
  login_success: 'تسجيل دخول ناجح',
  login_failed: 'محاولة دخول فاشلة',
  logout: 'تسجيل خروج',
  password_changed: 'تغيير كلمة المرور',
  bulk_action: 'عملية جماعية',
  mfa_reset_by_admin: 'إعادة تعيين MFA',
  verification_status_changed: 'تغيير حالة التحقق',
  users_exported: 'تصدير مستخدمين',
  users_imported: 'استيراد مستخدمين',
};

const TabPanel = ({ children, value, index, ...props }) => (
  <div role="tabpanel" hidden={value !== index} {...props}>
    {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
  </div>
);

const InfoRow = ({ icon: Icon, label, value, dir }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
    <Icon sx={{ color: 'text.secondary', fontSize: 20 }} />
    <Box sx={{ minWidth: 120 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
    <Typography variant="body2" dir={dir} sx={{ fontWeight: 500 }}>
      {value || '—'}
    </Typography>
  </Box>
);

const UserDetailDialog = ({ open, onClose, user }) => {
  const [tab, setTab] = useState(0);
  const [loginHistory, setLoginHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Reset tab when a different user is selected
  useEffect(() => {
    if (open) {
      setTab(0);
      setLoginHistory([]);
    }
  }, [user, open]);

  // جلب سجل تسجيلات الدخول عند التبديل للتبويب 3
  const fetchLoginHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const userId = user._id || user.id;
      const result = await userManagementService.getLoginHistory(userId, { limit: 50 });
      setLoginHistory(result.history || []);
    } catch { /* ignore */ }
    setHistoryLoading(false);
  }, [user]);

  useEffect(() => {
    if (tab === 3 && user) {
      fetchLoginHistory();
    }
  }, [tab, user, fetchLoginHistory]);

  if (!user) return null;

  const isLocked = user.isLocked || (user.lockUntil && new Date(user.lockUntil) > new Date());

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: getRoleColor(user.role),
              fontSize: 22,
              fontWeight: 'bold',
            }}
          >
            {(user.fullName || user.username || '?').charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {user.fullName || 'بدون اسم'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Chip
                label={user.roleLabel || getRoleLabel(user.role)}
                size="small"
                sx={{
                  bgcolor: getRoleColor(user.role) + '20',
                  color: getRoleColor(user.role),
                  fontWeight: 600,
                }}
              />
              {isLocked ? (
                <Chip icon={<LockedIcon sx={{ fontSize: 14 }} />} label="مقفل" size="small" color="error" />
              ) : user.isActive ? (
                <Chip icon={<ActiveIcon sx={{ fontSize: 14 }} />} label="نشط" size="small" color="success" />
              ) : (
                <Chip icon={<InactiveIcon sx={{ fontSize: 14 }} />} label="معطل" size="small" color="default" />
              )}
            </Box>
          </Box>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="البيانات الأساسية" icon={<PersonIcon />} iconPosition="start" />
          <Tab label="الصلاحيات" icon={<SecurityIcon />} iconPosition="start" />
          <Tab label="سجل النشاط" icon={<HistoryIcon />} iconPosition="start" />
          <Tab label="سجل الدخول" icon={<LoginIcon />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 2.5 }}>
          {/* ─ تبويب البيانات الأساسية ─ */}
          <TabPanel value={tab} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                    معلومات الاتصال
                  </Typography>
                  <InfoRow icon={PersonIcon} label="اسم المستخدم" value={user.username ? `@${user.username}` : '—'} dir="ltr" />
                  <InfoRow icon={EmailIcon} label="البريد الإلكتروني" value={
                    user.email ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" dir="ltr" sx={{ fontWeight: 500 }}>{user.email}</Typography>
                        {user.emailVerified ? (
                          <Tooltip title="بريد موثق"><VerifiedIcon sx={{ fontSize: 16, color: 'success.main' }} /></Tooltip>
                        ) : (
                          <Tooltip title="غير موثق"><NotVerifiedIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></Tooltip>
                        )}
                      </Box>
                    ) : '—'
                  } />
                  <InfoRow icon={PhoneIcon} label="الهاتف" value={
                    user.phone ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" dir="ltr" sx={{ fontWeight: 500 }}>{user.phone}</Typography>
                        {user.phoneVerified ? (
                          <Tooltip title="هاتف موثق"><VerifiedIcon sx={{ fontSize: 16, color: 'success.main' }} /></Tooltip>
                        ) : (
                          <Tooltip title="غير موثق"><NotVerifiedIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></Tooltip>
                        )}
                      </Box>
                    ) : '—'
                  } />
                  <InfoRow icon={BranchIcon} label="الفرع" value={user.branch?.name || user.branch?.name_ar || '—'} />
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                    معلومات الحساب
                  </Typography>
                  <InfoRow icon={RoleIcon} label="الدور" value={user.roleLabel || getRoleLabel(user.role)} />
                  <InfoRow icon={DateIcon} label="تاريخ الإنشاء" value={formatDate(user.createdAt)} />
                  <InfoRow icon={LoginIcon} label="آخر تسجيل دخول" value={formatDate(user.lastLogin)} />
                  <InfoRow icon={DateIcon} label="آخر تحديث" value={formatDate(user.updatedAt)} />
                  {user.failedLoginAttempts > 0 && (
                    <InfoRow icon={LockedIcon} label="محاولات فاشلة" value={user.failedLoginAttempts} />
                  )}
                </Paper>
              </Grid>

              {/* حالة الأمان */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                    <ShieldIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
                    حالة الأمان
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {/* MFA */}
                    <Chip
                      icon={<MfaIcon sx={{ fontSize: 16 }} />}
                      label={user.mfa?.enabled ? 'المصادقة الثنائية مفعلة' : 'المصادقة الثنائية معطلة'}
                      color={user.mfa?.enabled ? 'success' : 'default'}
                      variant="outlined"
                      size="small"
                    />
                    {/* البريد */}
                    <Chip
                      icon={user.emailVerified ? <VerifiedIcon sx={{ fontSize: 16 }} /> : <NotVerifiedIcon sx={{ fontSize: 16 }} />}
                      label={user.emailVerified ? 'البريد موثق' : 'البريد غير موثق'}
                      color={user.emailVerified ? 'success' : 'warning'}
                      variant="outlined"
                      size="small"
                    />
                    {/* الهاتف */}
                    <Chip
                      icon={user.phoneVerified ? <VerifiedIcon sx={{ fontSize: 16 }} /> : <NotVerifiedIcon sx={{ fontSize: 16 }} />}
                      label={user.phoneVerified ? 'الهاتف موثق' : 'الهاتف غير موثق'}
                      color={user.phoneVerified ? 'success' : 'warning'}
                      variant="outlined"
                      size="small"
                    />
                    {/* تغيير كلمة المرور مطلوب */}
                    {user.requirePasswordChange && (
                      <Chip
                        icon={<LockedIcon sx={{ fontSize: 16 }} />}
                        label="يجب تغيير كلمة المرور"
                        color="error"
                        variant="outlined"
                        size="small"
                      />
                    )}
                    {/* أجهزة موثوقة */}
                    {user.mfa?.trustedDevices?.length > 0 && (
                      <Chip
                        icon={<DeviceIcon sx={{ fontSize: 16 }} />}
                        label={`${user.mfa.trustedDevices.length} جهاز موثوق`}
                        color="info"
                        variant="outlined"
                        size="small"
                      />
                    )}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* ─ تبويب الصلاحيات ─ */}
          <TabPanel value={tab} index={1}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                الصلاحيات المخصصة
              </Typography>
              {user.customPermissions?.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {user.customPermissions.map((perm) => (
                    <Chip key={perm} label={perm} size="small" color="success" variant="outlined" />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  لا توجد صلاحيات مخصصة — يتم استخدام صلاحيات الدور الافتراضية
                </Typography>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                الصلاحيات المرفوضة
              </Typography>
              {user.deniedPermissions?.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {user.deniedPermissions.map((perm) => (
                    <Chip key={perm} label={perm} size="small" color="error" variant="outlined" />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  لا توجد صلاحيات مرفوضة
                </Typography>
              )}
            </Paper>
          </TabPanel>

          {/* ─ تبويب سجل النشاط ─ */}
          <TabPanel value={tab} index={2}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                آخر الأنشطة
              </Typography>
              {user.recentActivity?.length > 0 ? (
                <List dense>
                  {user.recentActivity.map((activity, idx) => (
                    <ListItem key={idx} divider={idx < user.recentActivity.length - 1}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <HistoryIcon fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={ACTION_LABELS[activity.action] || activity.action}
                        secondary={formatDate(activity.createdAt || activity.timestamp)}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  لا يوجد سجل نشاط حتى الآن
                </Typography>
              )}
            </Paper>
          </TabPanel>

          {/* ─ تبويب سجل تسجيلات الدخول ─ */}
          <TabPanel value={tab} index={3}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                <LoginIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
                سجل تسجيلات الدخول
              </Typography>
              {historyLoading ? (
                <Typography variant="body2" color="text.secondary">جاري التحميل...</Typography>
              ) : loginHistory.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>عنوان IP</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>الجهاز</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>الموقع</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loginHistory.map((entry, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Typography variant="caption">{formatDate(entry.date)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <IpIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" dir="ltr">{entry.ip || '—'}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <DeviceIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {entry.device || '—'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LocationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption">{entry.location || '—'}</Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  لا توجد تسجيلات دخول سابقة
                </Typography>
              )}
            </Paper>
          </TabPanel>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserDetailDialog;
