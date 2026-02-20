import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Button,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  DoneAll as DoneAllIcon,
  Circle as CircleIcon,
  NotificationsNone as NotificationsNoneIcon,
} from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    fetchNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications,
  } = useNotifications();

  const [tab, setTab] = useState(0); // 0: All, 1: Unread

  useEffect(() => {
    // Refresh on page load
    fetchNotifications(1, tab === 1);
  }, [tab, fetchNotifications]);

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
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

  const filteredNotifications = tab === 1
    ? notifications.filter(n => !n.isRead)
    : notifications;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            الإشعارات
          </Typography>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount} غير مقروء`}
              color="error"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>

        {/* Actions */}
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {unreadCount > 0 && (
            <Button
              variant="outlined"
              startIcon={<DoneAllIcon />}
              onClick={markAllAsRead}
              size="small"
            >
              تحديد الكل كمقروء
            </Button>
          )}
          {notifications.some(n => n.isRead) && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={deleteReadNotifications}
              size="small"
            >
              حذف المقروءة
            </Button>
          )}
        </Box>

        {/* Tabs */}
        <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label={`الكل (${notifications.length})`} />
          <Tab label={`غير المقروءة (${unreadCount})`} />
        </Tabs>

        {/* Notifications List */}
        {loading && filteredNotifications.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={50} />
          </Box>
        ) : filteredNotifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <NotificationsNoneIcon sx={{ fontSize: 80, color: '#bdbdbd', mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              {tab === 1 ? 'لا توجد إشعارات غير مقروءة' : 'لا توجد إشعارات'}
            </Typography>
          </Box>
        ) : (
          <>
            <List sx={{ bgcolor: 'background.paper' }}>
              {filteredNotifications.map((notification) => (
                <ListItem
                  key={notification._id}
                  sx={{
                    backgroundColor: notification.isRead ? 'transparent' : '#f5f5f5',
                    mb: 1,
                    borderRadius: 1,
                    border: '1px solid #e0e0e0',
                    '&:hover': { backgroundColor: '#fafafa' },
                  }}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={() => deleteNotification(notification._id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemButton
                    onClick={() => handleNotificationClick(notification)}
                    sx={{ borderRadius: 1 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', pr: 6 }}>
                      {!notification.isRead && (
                        <CircleIcon
                          sx={{
                            fontSize: 12,
                            color: getNotificationColor(notification.type),
                            mr: 2,
                            mt: 0.5,
                          }}
                        />
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: notification.isRead ? 400 : 600,
                            mb: 0.5,
                          }}
                        >
                          {notification.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          sx={{ mb: 1 }}
                        >
                          {notification.message}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: getNotificationColor(notification.type),
                              fontWeight: 500,
                            }}
                          >
                            {getTimeAgo(notification.createdAt)}
                          </Typography>
                          {notification.type && (
                            <Chip
                              label={notification.type}
                              size="small"
                              sx={{
                                backgroundColor: getNotificationColor(notification.type),
                                color: 'white',
                                fontSize: '0.7rem',
                                height: 20,
                              }}
                            />
                          )}
                          {notification.priority === 'urgent' && (
                            <Chip
                              label="عاجل"
                              size="small"
                              color="error"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>

            {/* Load More */}
            {hasMore && (
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? 'جاري التحميل...' : 'تحميل المزيد'}
                </Button>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
};

export default NotificationsPage;
