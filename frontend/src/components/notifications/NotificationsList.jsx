import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Paper,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import {
  fetchNotifications,
  markAsRead,
  deleteNotification,
} from '../../store/slices/notificationsSlice';

const NotificationsList = () => {
  const dispatch = useDispatch();
  const { notifications, unreadCount, loading } = useSelector(
    (state) => state.notifications
  );

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const handleMarkAsRead = (notificationId) => {
    dispatch(markAsRead(notificationId));
  };

  const handleDelete = (notificationId) => {
    dispatch(deleteNotification(notificationId));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">الإشعارات</Typography>
        <Chip
          label={`${unreadCount} غير مقروء`}
          color="primary"
          variant="outlined"
        />
      </Box>

      <Paper>
        <List>
          {notifications.map((notification) => (
            <ListItem
              key={notification.id}
              sx={{
                backgroundColor: notification.read ? 'white' : '#f0f0f0',
                borderBottom: '1px solid #eee',
                '&:hover': {
                  backgroundColor: '#fafafa',
                },
              }}
            >
              <ListItemIcon>
                <NotificationsIcon />
              </ListItemIcon>
              <ListItemText
                primary={notification.title}
                secondary={notification.message}
              />
              {!notification.read && (
                <Button
                  size="small"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleMarkAsRead(notification.id)}
                  sx={{ mr: 1 }}
                >
                  قراءة
                </Button>
              )}
              <Button
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => handleDelete(notification.id)}
              >
                حذف
              </Button>
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default NotificationsList;
