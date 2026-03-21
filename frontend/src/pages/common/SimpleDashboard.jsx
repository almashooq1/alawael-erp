/**
 * SimpleDashboard.jsx — Simple Dashboard (MUI)
 * لوحة تحكم بسيطة تعرض حالة المصادقة ومعلومات المستخدم
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, getUserData, clearAuthData } from 'utils/tokenStorage';




const SimpleDashboard = () => {
  const navigate = useNavigate();
  const user = getUserData() || {};
  const token = getToken();

  const handleLogout = () => {
    clearAuthData();
    navigate('/login');
  };

  useEffect(() => {
    if (!token) navigate('/login');
  }, [token, navigate]);

  if (!token) return null;

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 24 }}>
              {(user.fullName || user.email || '?')[0]}
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>لوحة التحكم</Typography>
              <Typography color="text.secondary">
                مرحباً، {user.fullName || user.email}!
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{ borderRadius: 2 }}
          >
            تسجيل الخروج
          </Button>
        </Box>
      </Paper>

      {/* Success Alert */}
      <Alert
        severity="success"
        variant="filled"
        icon={<CheckIcon fontSize="inherit" />}
        sx={{ mb: 3, borderRadius: 3, fontSize: '1.1rem' }}
      >
        تم تسجيل الدخول بنجاح!
      </Alert>

      {/* User Info */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3, border: '2px solid', borderColor: 'success.light' }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          معلومات المستخدم
        </Typography>
        <List disablePadding>
          <ListItem>
            <ListItemIcon><PersonIcon color="primary" /></ListItemIcon>
            <ListItemText primary="الاسم الكامل" secondary={user.fullName || '—'} />
          </ListItem>
          <Divider variant="inset" component="li" />
          <ListItem>
            <ListItemIcon><EmailIcon color="primary" /></ListItemIcon>
            <ListItemText primary="البريد الإلكتروني" secondary={user.email || '—'} />
          </ListItem>
          <Divider variant="inset" component="li" />
          <ListItem>
            <ListItemIcon><RoleIcon color="primary" /></ListItemIcon>
            <ListItemText
              primary="الدور"
              secondary={
                <Chip
                  label={user.role || 'غير محدد'}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />
              }
            />
          </ListItem>
        </List>
      </Paper>

      {/* Session Status */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3, border: '2px solid', borderColor: 'success.light' }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          حالة الجلسة
        </Typography>
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          الجلسة نشطة — المصادقة تعمل بشكل صحيح
        </Alert>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>الخطوات المكتملة:</Typography>
          {[
            { icon: <CheckIcon color="success" />, text: 'تم تسجيل الدخول بنجاح' },
            { icon: <CheckIcon color="success" />, text: 'تم حفظ بيانات المستخدم' },
            { icon: <CelebrationIcon color="warning" />, text: 'النظام يعمل بشكل صحيح!' },
          ].map((item, i) => (
            <ListItem key={i} sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </Box>
      </Paper>

      {/* Notes */}
      <Alert
        severity="info"
        icon={<InfoIcon fontSize="inherit" />}
        sx={{ borderRadius: 3 }}
      >
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>ملاحظات:</Typography>
        {[
          'إذا رأيت هذه الصفحة، فهذا يعني أن المصادقة تعمل بشكل صحيح',
          'يمكنك الآن البدء في استخدام باقي صفحات النظام',
        ].map((note, i) => (
          <Typography key={i} variant="body2" sx={{ mb: 0.5 }}>• {note}</Typography>
        ))}
        <Chip icon={<TimerIcon />} label="الجلسة صالحة لمدة 24 ساعة" size="small" sx={{ mt: 1 }} />
      </Alert>
    </Box>
  );
};

export default SimpleDashboard;
