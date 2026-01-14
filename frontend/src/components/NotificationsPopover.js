import React, { useState, useEffect } from 'react';
import { IconButton, Badge, Popover, List, ListItem, ListItemText, Typography, Box, Divider, Button, Chip } from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI, withMockFallback } from '../services/api';
import { useRealTimeNotifications } from '../contexts/SocketContext';

const mockNotifications = [
  { id: 1, title: 'فاتورة #9744 متأخرة', message: 'متأخرة 3 أيام', path: '/finance', severity: 'error', time: 'منذ ساعة' },
  { id: 2, title: 'كاميرا البوابة 2', message: 'انقطاع متقطع', path: '/security', severity: 'warning', time: 'منذ 2 ساعة' },
  { id: 3, title: 'طلب إجازة جديد', message: 'سارة محمد - بانتظار الموافقة', path: '/hr', severity: 'info', time: 'منذ 3 ساعات' },
  { id: 4, title: 'جلسة علاج نطق', message: 'مريم - بعد ساعة', path: '/sessions', severity: 'info', time: 'منذ 4 ساعات' },
  { id: 5, title: 'تقرير الأمان', message: 'مطلوب مراجعة', path: '/reports', severity: 'warning', time: 'أمس' },
];

const NotificationsPopover = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState(mockNotifications);
  const navigate = useNavigate();

  // Real-time notifications from WebSocket
  const { notifications: realtimeNotifications, unreadCount } = useRealTimeNotifications();

  // Merge real-time notifications with initial mock data
  useEffect(() => {
    // If we have real-time notifications, use those; otherwise use mock
    if (realtimeNotifications && realtimeNotifications.length > 0) {
      setNotifications(realtimeNotifications);
    } else {
      // Fall back to API fetch when popover opens
      const fetchNotifications = async () => {
        try {
          const data = await withMockFallback(() => notificationsAPI.getNotifications(10), { notifications: mockNotifications });
          if (data?.notifications) {
            setNotifications(data.notifications);
          }
        } catch (err) {
          console.error('Failed to fetch notifications:', err);
        }
      };

      if (anchorEl) {
        fetchNotifications();
      }
    }
  }, [realtimeNotifications, anchorEl]);

  const handleClick = event => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (path, notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
    navigate(path);
    handleClose();
  };

  const open = Boolean(anchorEl);
  const displayUnreadCount = unreadCount || notifications.length;

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Badge badgeContent={displayUnreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 360, maxHeight: 480, mt: 1 },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            الإشعارات
          </Typography>
          <Chip label={`${unreadCount} جديد`} size="small" color="primary" />
        </Box>
        <Divider />
        <List sx={{ p: 0 }}>
          {notifications.map((notif, idx) => (
            <React.Fragment key={notif.id}>
              <ListItem
                button
                onClick={() => handleNotificationClick(notif.path, notif.id)}
                sx={{
                  '&:hover': { bgcolor: 'action.hover' },
                  borderRight: 4,
                  borderColor: notif.severity === 'error' ? 'error.main' : notif.severity === 'warning' ? 'warning.main' : 'info.main',
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {notif.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {notif.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {notif.time}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              {idx < mockNotifications.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
        <Divider />
        <Box sx={{ p: 1.5, textAlign: 'center' }}>
          <Button
            size="small"
            fullWidth
            onClick={() => {
              navigate('/activity');
              handleClose();
            }}
          >
            عرض كل الإشعارات
          </Button>
        </Box>
      </Popover>
    </>
  );
};

export default NotificationsPopover;
