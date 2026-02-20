import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  Button,
  Tooltip,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  Delete as DeleteIcon,
  DoneAll as DoneAllIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const NotificationBell = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    hasMore,
  } = useNotifications();

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    if (notification.link) {
      navigate(notification.link);
      handleClose();
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDelete = async (e, notificationId) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  const getNotificationColor = (type) => {
    const colors = {
      info: '#2196f3',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      system: '#9c27b0',
      message: '#00bcd4',
      task: '#ff5722',
      reminder: '#ffc107',
    };
    return colors[type] || '#757575';
  };

  const getTimeAgo = (date) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: ar,
      });
    } catch {
      return 'منذ وقت قريب';
    }
  };

  return (
    <>
      <Tooltip title="الإشعارات">
        <IconButton
          color="inherit"
          onClick={handleClick}
          aria-label="notifications"
          sx={{ ml: 1 }}
        >
          <Badge badgeContent={unreadCount} color="error" max={99}>
            {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 600,
            mt: 1.5,
            direction: 'rtl',
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              الإشعارات
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={`${unreadCount} جديد`}
                size="small"
                color="error"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>
          
          {notifications.length > 0 && (
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              {unreadCount > 0 && (
                <Button
                  size="small"
                  startIcon={<DoneAllIcon />}
                  onClick={handleMarkAllAsRead}
                  sx={{ fontSize: '0.75rem' }}
                >
                  تحديد الكل كمقروء
                </Button>
              )}
            </Box>
          )}
        </Box>

        {/* Notifications List */}
        {loading && notifications.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={40} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <NotificationsNoneIcon sx={{ fontSize: 60, color: '#bdbdbd', mb: 1 }} />
            <Typography color="textSecondary">
              لا توجد إشعارات
            </Typography>
          </Box>
        ) : (
          <>
            <List sx={{ p: 0, maxHeight: 400, overflow: 'auto' }}>
              {notifications.slice(0, 10).map((notification, index) => (
                <React.Fragment key={notification._id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    disablePadding
                    sx={{
                      backgroundColor: notification.isRead ? 'transparent' : '#f5f5f5',
                      '&:hover': { backgroundColor: '#fafafa' },
                    }}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => handleDelete(e, notification._id)}
                        sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemButton
                      onClick={() => handleNotificationClick(notification)}
                      sx={{ py: 1.5 }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
                        {!notification.isRead && (
                          <CircleIcon
                            sx={{
                              fontSize: 10,
                              color: getNotificationColor(notification.type),
                              mr: 1,
                              mt: 0.5,
                            }}
                          />
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: notification.isRead ? 400 : 600,
                              mb: 0.5,
                              pr: 4,
                            }}
                          >
                            {notification.title}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            sx={{
                              display: 'block',
                              mb: 0.5,
                              pr: 4,
                            }}
                          >
                            {notification.message}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: getNotificationColor(notification.type),
                              fontSize: '0.7rem',
                            }}
                          >
                            {getTimeAgo(notification.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                    </ListItemButton>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>

            {/* Footer */}
            <Divider />
            <Box sx={{ p: 1, textAlign: 'center' }}>
              {hasMore && (
                <Button
                  fullWidth
                  size="small"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? 'جاري التحميل...' : 'عرض المزيد'}
                </Button>
              )}
              <Button
                fullWidth
                size="small"
                onClick={() => {
                  navigate('/notifications');
                  handleClose();
                }}
                sx={{ mt: 0.5 }}
              >
                عرض جميع الإشعارات
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
};

export default NotificationBell;
