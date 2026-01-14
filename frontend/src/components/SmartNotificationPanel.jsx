import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Badge,
  Popover,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  DoneAll as DoneAllIcon,
  Notifications as NotificationsIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import SmartNotificationService from '../services/smartNotificationService';

/**
 * Smart Notification Panel Component
 * مكون لوحة النوتيفيكيشنات الذكية
 */
function SmartNotificationPanel({ userId = 'user1' }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });

  // محاكاة جلب النوتيفيكيشنات
  const loadNotifications = useCallback(async () => {
    try {
      // جلب الإشعارات من الـ API
      const data = await SmartNotificationService.getSmartNotifications(userId);
      
      if (data && data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.stats?.unread || 0);
        setStats(data.stats || {});
      }
    } catch (error) {
      console.error('خطأ في جلب الإشعارات:', error);
      
      // استخدام بيانات محاكاة في حالة الخطأ
      const mockNotifications = [
        {
          id: 'notif_1',
          workflowId: 'wf_001',
          userId: userId,
          type: 'urgent',
          title: '🔴 فوري: طلب موافقة عاجل',
          message: 'هناك سير عمل عاجل يحتاج تدخل فوري',
          priority: 5,
          icon: '🔴',
          color: '#ff0000',
          createdAt: new Date(Date.now() - 5 * 60000),
          isRead: false,
          action: { label: 'معالجة فوراً', action: 'handle_immediately' },
          tags: ['urgent', 'high', 'approval']
        },
        {
          id: 'notif_2',
          workflowId: 'wf_002',
          userId: userId,
          type: 'sla_breach',
          title: '📛 انتهاك SLA: عطلة الموظف',
          message: 'تم تجاوز الوقت المسموح به (SLA)',
          priority: 5,
          icon: '📛',
          color: '#f44336',
          createdAt: new Date(Date.now() - 15 * 60000),
          isRead: false,
          action: { label: 'مراجعة', action: 'review' },
          tags: ['sla_breach', 'warning', 'urgent']
        },
        {
          id: 'notif_3',
          workflowId: 'wf_003',
          userId: userId,
          type: 'approval',
          title: '👤 موافقة مطلوبة: طلب مستحقات',
          message: 'يحتاج إلى موافقتك للمتابعة',
          priority: 3,
          icon: '👤',
          color: '#673ab7',
          createdAt: new Date(Date.now() - 1 * 3600000),
          isRead: true,
          action: { label: 'الموافقة', action: 'approve' },
          tags: ['approval', 'normal', 'hr']
        },
        {
          id: 'notif_4',
          workflowId: 'wf_004',
          userId: userId,
          type: 'success',
          title: '✅ نجاح: تقرير معتمد',
          message: 'تمت معالجة العملية بنجاح',
          priority: 1,
          icon: '✅',
          color: '#4caf50',
          createdAt: new Date(Date.now() - 2 * 3600000),
          isRead: true,
          action: { label: 'عرض النتيجة', action: 'view_result' },
          tags: ['success', 'completed']
        }
      ];
      
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.isRead).length);
      calculateStats(mockNotifications);
      showSnackbar('خطأ في تحميل النوتيفيكيشنات', 'error');
    }
  }, [userId]);

  useEffect(() => {
    loadNotifications();
    // تحديث كل 30 ثانية
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId, loadNotifications]);

  const handleClearAll = () => {
    setNotifications([]);
  };

  // Helper function to calculate stats
  const calculateStats = (notifs) => {
    const stats = {
      total: notifs.length,
      unread: notifs.filter(n => !n.isRead).length,
      byType: {},
      urgent: 0,
      today: 0
    };

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    notifs.forEach((n) => {
      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
      if (n.priority >= 4) stats.urgent++;
      if (now - n.createdAt.getTime() < oneDay) stats.today++;
    });

    setStats(stats);
  };

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      // استدعاء API لوضع علامة على الإشعار كمقروء
      await SmartNotificationService.markAsRead(notificationId);

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
      showSnackbar('تم وضع علامة على أنها مقروءة', 'success');
    } catch (error) {
      showSnackbar('خطأ في تحديث الحالة', 'error');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      // استدعاء API لحذف الإشعار
      await SmartNotificationService.deleteNotification(notificationId);
      
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      
      // تحديث عدد غير المقروءة إذا كان الإشعار غير مقروء
      const notification = notifications.find((n) => n.id === notificationId);
      if (notification && !notification.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      
      showSnackbar('تم حذف الإشعار بنجاح', 'success');
    } catch (error) {
      showSnackbar('خطأ في حذف الإشعار', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // استدعاء API لوضع علامة على جميع الإشعارات كمقروءة
      await SmartNotificationService.markAllAsRead(notifications);

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );

      setUnreadCount(0);
      showSnackbar('تم وضع علامة على الكل كمقروء', 'success');
    } catch (error) {
      showSnackbar('خطأ في التحديث', 'error');
    }
  };

  const handleOpenDetails = (notification) => {
    setSelectedNotification(notification);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedNotification(null);
  };

  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ open: true, message, type });
  };

  const getPriorityColor = (priority) => {
    if (priority >= 4) return 'error';
    if (priority >= 3) return 'warning';
    return 'info';
  };

  const open = Boolean(anchorEl);

  return (
    <>
      {/* زر النوتيفيكيشنات */}
      <IconButton
        onClick={handleOpenMenu}
        sx={{
          position: 'relative',
          color: 'primary.main'
        }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      {/* قائمة النوتيفيكيشنات */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Paper sx={{ width: 450, maxHeight: 600, overflow: 'auto' }}>
          {/* رأس القائمة */}
          <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">الإشعارات</Typography>
              <Box>
                <IconButton
                  size="small"
                  onClick={handleMarkAllAsRead}
                  title="تعليم الكل كمقروء"
                >
                  <DoneAllIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={handleClearAll}
                  title="مسح الكل"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* الإحصائيات */}
            {stats && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  label={`الإجمالي: ${stats.total}`}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label={`غير مقروء: ${stats.unread}`}
                  color="primary"
                  variant="outlined"
                />
                {stats.urgent > 0 && (
                  <Chip
                    size="small"
                    label={`عاجل: ${stats.urgent}`}
                    color="error"
                    variant="outlined"
                  />
                )}
              </Box>
            )}
          </Box>

          {/* قائمة النوتيفيكيشنات */}
          {notifications.length > 0 ? (
            <List sx={{ p: 0 }}>
              {notifications.map((notification) => (
                <ListItem
                  key={notification.id}
                  sx={{
                    borderBottom: '1px solid #eee',
                    backgroundColor: notification.isRead ? 'transparent' : '#f5f5f5',
                    '&:hover': { backgroundColor: '#f0f0f0' },
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={() => handleOpenDetails(notification)}
                >
                  <ListItemText
                    primary={
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: notification.isRead ? 'normal' : 'bold',
                          color: notification.color
                        }}
                      >
                        {notification.title}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', mt: 0.5 }}
                        >
                          {notification.message}
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {notification.tags.map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#999' }}>
                          {new Date(notification.createdAt).toLocaleString('ar-SA')}
                        </Typography>
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                    {!notification.isRead && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        title="وضع علامة كمقروء"
                      >
                        <DoneAllIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notification.id);
                      }}
                      title="حذف"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <InfoIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
              <Typography color="textSecondary">
                لا توجد إشعارات
              </Typography>
            </Box>
          )}
        </Paper>
      </Popover>

      {/* Dialog تفاصيل النوتيفيكيشن */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="sm"
        fullWidth
      >
        {selectedNotification && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span style={{ fontSize: 24 }}>
                  {selectedNotification.icon}
                </span>
                {selectedNotification.title}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                <Alert severity={getPriorityColor(selectedNotification.priority)}>
                  {selectedNotification.message}
                </Alert>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    التفاصيل:
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Typography variant="body2">
                      <strong>النوع:</strong> {selectedNotification.type}
                    </Typography>
                    <Typography variant="body2">
                      <strong>الأولوية:</strong> {selectedNotification.priority}/5
                    </Typography>
                    <Typography variant="body2">
                      <strong>الوقت:</strong> {new Date(selectedNotification.createdAt).toLocaleString('ar-SA')}
                    </Typography>
                    <Typography variant="body2">
                      <strong>الحالة:</strong> {selectedNotification.isRead ? 'مقروء' : 'غير مقروء'}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    العلامات:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedNotification.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Box>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetails}>إغلاق</Button>
              <Button
                variant="contained"
                onClick={() => {
                  // تنفيذ الإجراء المرتبط
                  console.log('تنفيذ الإجراء:', selectedNotification.action.action);
                  showSnackbar(`تم تنفيذ: ${selectedNotification.action.label}`, 'success');
                  handleCloseDetails();
                }}
              >
                {selectedNotification.action.label}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert severity={snackbar.type} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default SmartNotificationPanel;
