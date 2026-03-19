import React, { useEffect, useState } from 'react';
import {
  Box,
  Badge,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import io from 'socket.io-client';

function NotificationCenter() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to WebSocket server
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('Connected to notification server');
    });

    // Listen for different notification types
    newSocket.on('beneficiary_created', (data) => {
      addNotification({
        id: Date.now(),
        type: 'success',
        title: 'مستفيد جديد',
        message: `تم إضافة ${data.firstName} ${data.lastName}`,
        timestamp: new Date(),
        read: false
      });
    });

    newSocket.on('beneficiary_updated', (data) => {
      addNotification({
        id: Date.now(),
        type: 'info',
        title: 'تم التحديث',
        message: `تم تحديث بيانات ${data.firstName} ${data.lastName}`,
        timestamp: new Date(),
        read: false
      });
    });

    newSocket.on('beneficiary_deleted', (data) => {
      addNotification({
        id: Date.now(),
        type: 'warning',
        title: 'تم الحذف',
        message: `تم حذف المستفيد ${data.firstName} ${data.lastName}`,
        timestamp: new Date(),
        read: false
      });
    });

    newSocket.on('medical_record_added', (data) => {
      addNotification({
        id: Date.now(),
        type: 'info',
        title: 'سجل طبي جديد',
        message: `تم إضافة سجل طبي جديد للمستفيد`,
        timestamp: new Date(),
        read: false
      });
    });

    newSocket.on('error', (data) => {
      addNotification({
        id: Date.now(),
        type: 'error',
        title: 'خطأ',
        message: data.message || 'حدث خطأ في النظام',
        timestamp: new Date(),
        read: false
      });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from notification server');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 10)); // Keep last 10
    setUnreadCount(prev => prev + 1);

    // Auto remove notification after 5 seconds
    setTimeout(() => {
      removeNotification(notification.id);
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === id ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
    setUnreadCount(0);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <SuccessIcon fontSize="small" sx={{ color: '#4caf50' }} />;
      case 'error':
        return <ErrorIcon fontSize="small" sx={{ color: '#f44336' }} />;
      case 'warning':
        return <InfoIcon fontSize="small" sx={{ color: '#ff9800' }} />;
      default:
        return <InfoIcon fontSize="small" sx={{ color: '#1976d2' }} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success':
        return '#e8f5e9';
      case 'error':
        return '#ffebee';
      case 'warning':
        return '#fff3e0';
      default:
        return '#e3f2fd';
    }
  };

  return (
    <Box>
      <Tooltip title="الإشعارات">
        <IconButton
          onClick={handleOpenMenu}
          color={unreadCount > 0 ? 'error' : 'default'}
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        PaperProps={{
          style: {
            maxHeight: 400,
            width: '350px'
          }
        }}
      >
        {notifications.length === 0 ? (
          <MenuItem disabled>
            <Typography align="center" sx={{ width: '100%' }}>
              لا توجد إشعارات
            </Typography>
          </MenuItem>
        ) : (
          notifications.map((notification, index) => (
            <Box key={notification.id}>
              <MenuItem
                onClick={() => markAsRead(notification.id)}
                sx={{
                  bgcolor: notification.read ? 'transparent' : getNotificationColor(notification.type),
                  '&:hover': {
                    bgcolor: getNotificationColor(notification.type)
                  }
                }}
              >
                <ListItemIcon>
                  {getNotificationIcon(notification.type)}
                </ListItemIcon>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {notification.title}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {notification.message}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" display="block">
                    {new Date(notification.timestamp).toLocaleTimeString('ar-SA')}
                  </Typography>
                </Box>
              </MenuItem>
              {index < notifications.length - 1 && <Divider />}
            </Box>
          ))
        )}

        {notifications.length > 0 && (
          <>
            <Divider />
            <MenuItem
              onClick={() => {
                setNotifications([]);
                handleCloseMenu();
              }}
              sx={{ justifyContent: 'center', color: '#f44336' }}
            >
              <CloseIcon fontSize="small" sx={{ mr: 1 }} />
              مسح الكل
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
}

export default NotificationCenter;
