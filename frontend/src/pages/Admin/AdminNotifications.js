import { useState, useEffect } from 'react';




import { adminService } from 'services/adminService';
import api from 'services/api.client';
import { getStatusColor } from 'utils/statusColors';
import logger from 'utils/logger';
import { gradients } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';
import { useConfirmDialog } from 'components/common/ConfirmDialog';
import { useSnackbar } from '../../contexts/SnackbarContext';

const AdminNotifications = () => {
  const showSnackbar = useSnackbar();
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const [notifications, setNotifications] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openSendDialog, setOpenSendDialog] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmState, showConfirm] = useConfirmDialog();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await adminService.getAdminNotifications(userId);
        setNotifications(data);
      } catch (err) {
        logger.error('Failed to load notifications:', err);
        setError(err.message || 'حدث خطأ في تحميل الإشعارات');
        showSnackbar('حدث خطأ في تحميل الإشعارات', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [userId, showSnackbar]);

  const handleOpenDialog = (notification = null) => {
    setEditingNotification(notification);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingNotification(null);
  };

  const handleOpenSendDialog = () => {
    setOpenSendDialog(true);
  };

  const handleCloseSendDialog = () => {
    setOpenSendDialog(false);
  };

  const handleSaveNotification = async () => {
    try {
      if (editingNotification?._id || editingNotification?.id) {
        await api.put(
          `/notifications/${editingNotification._id || editingNotification.id}`,
          editingNotification
        );
      } else {
        await api.post('/notifications', editingNotification || {});
      }
      // Reload notifications
      const data = await adminService.getAdminNotifications(userId);
      setNotifications(data);
      showSnackbar('تم حفظ الإشعار بنجاح', 'success');
      handleCloseDialog();
    } catch (err) {
      logger.error('Failed to save notification:', err);
      showSnackbar('فشل حفظ الإشعار', 'error');
      handleCloseDialog();
    }
  };

  const handleDeleteNotification = notificationId => {
    showConfirm({
      title: 'حذف الإشعار',
      message: 'هل تريد حذف هذا الإشعار؟',
      confirmText: 'حذف',
      confirmColor: 'error',
      onConfirm: async () => {
        try {
          await api.delete(`/notifications/${notificationId}`);
          setNotifications(notifications.filter(n => (n._id || n.id) !== notificationId));
          showSnackbar('تم حذف الإشعار بنجاح', 'success');
        } catch (err) {
          logger.error('Failed to delete notification:', err);
          showSnackbar('فشل حذف الإشعار', 'error');
        }
      },
    });
  };

  const getPriorityColor = priority => {
    switch (priority) {
      case 'عالية':
        return 'error';
      case 'متوسطة':
        return 'warning';
      case 'منخفضة':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography color="error" variant="h6" align="center">
          {error}
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: gradients.primary,
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                إدارة الإشعارات
              </Typography>
              <Typography variant="body2">إرسال وإدارة الإشعارات للمستخدمين</Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleOpenSendDialog}
            sx={{ backgroundColor: 'rgba(255,255,255,0.3)', color: 'white' }}
          >
            إرسال إشعار جديد
          </Button>
        </Box>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: gradients.primary,
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                إجمالي الإشعارات
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {notifications.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: gradients.warning,
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                المرسلة
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {notifications.filter(n => n.status === 'مرسلة').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: gradients.info,
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                قيد الإرسال
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {notifications.filter(n => n.status === 'قيد الإرسال').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: gradients.success,
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                معدل الاستقبال
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                92%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Notifications Table */}
      <Card>
        <CardHeader title={`الإشعارات (${notifications.length})`} />
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>العنوان</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الأولوية</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>المستلمون</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {notifications.map(notification => (
                <TableRow key={notification.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{notification.title}</TableCell>
                  <TableCell>
                    <Chip label={notification.type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={notification.priority}
                      color={getPriorityColor(notification.priority)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{notification.recipientCount}</TableCell>
                  <TableCell>
                    <Chip
                      label={notification.status}
                      color={getStatusColor(notification.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(notification.sendDate).toLocaleDateString('ar-SA')}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Tooltip title="تعديل">
                      <IconButton
                        aria-label="إجراء"
                        size="small"
                        onClick={() => handleOpenDialog(notification)}
                      >
                        <EditNotificationIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton
                        aria-label="إجراء"
                        size="small"
                        onClick={() => handleDeleteNotification(notification.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Edit Notification Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingNotification ? 'تعديل الإشعار' : 'إضافة إشعار جديد'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="العنوان"
              defaultValue={editingNotification?.title || ''}
              size="small"
            />
            <TextField
              fullWidth
              label="الرسالة"
              defaultValue={editingNotification?.message || ''}
              multiline
              rows={3}
              size="small"
            />
            <FormControl fullWidth size="small">
              <InputLabel>النوع</InputLabel>
              <Select label="النوع" defaultValue={editingNotification?.type || 'عام'}>
                <MenuItem value="عام">عام</MenuItem>
                <MenuItem value="تحذير">تحذير</MenuItem>
                <MenuItem value="معلومة">معلومة</MenuItem>
                <MenuItem value="تذكير">تذكير</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>الأولوية</InputLabel>
              <Select label="الأولوية" defaultValue={editingNotification?.priority || 'متوسطة'}>
                <MenuItem value="عالية">عالية</MenuItem>
                <MenuItem value="متوسطة">متوسطة</MenuItem>
                <MenuItem value="منخفضة">منخفضة</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button variant="contained" onClick={handleSaveNotification}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Notification Dialog */}
      <Dialog open={openSendDialog} onClose={handleCloseSendDialog} maxWidth="sm" fullWidth>
        <DialogTitle>إرسال إشعار جديد</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField fullWidth label="العنوان" placeholder="أدخل عنوان الإشعار" size="small" />
            <TextField
              fullWidth
              label="الرسالة"
              placeholder="أدخل نص الإشعار"
              multiline
              rows={4}
              size="small"
            />
            <FormControl fullWidth size="small">
              <InputLabel>النوع</InputLabel>
              <Select defaultValue="عام">
                <MenuItem value="عام">عام</MenuItem>
                <MenuItem value="تحذير">تحذير</MenuItem>
                <MenuItem value="معلومة">معلومة</MenuItem>
                <MenuItem value="تذكير">تذكير</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>الأولوية</InputLabel>
              <Select defaultValue="متوسطة">
                <MenuItem value="عالية">عالية</MenuItem>
                <MenuItem value="متوسطة">متوسطة</MenuItem>
                <MenuItem value="منخفضة">منخفضة</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>المستلمون</InputLabel>
              <Select defaultValue="all">
                <MenuItem value="all">الكل</MenuItem>
                <MenuItem value="therapists">المعالجون فقط</MenuItem>
                <MenuItem value="students">الطلاب فقط</MenuItem>
                <MenuItem value="parents">الآباء فقط</MenuItem>
                <MenuItem value="admins">الإدارة فقط</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel control={<Switch defaultChecked />} label="إرسال فوري" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSendDialog}>إلغاء</Button>
          <Button variant="contained" color="primary" onClick={handleCloseSendDialog}>
            إرسال الآن
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog {...confirmState} />
    </Container>
  );
};

export default AdminNotifications;
