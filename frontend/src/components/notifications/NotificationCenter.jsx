import React from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
// ...existing code...
import { useNotifications } from '../../contexts/NotificationContext';

function NotificationCenter() {
  // PDF export handler
  // ...existing code...

  const { unreadCount } = useNotifications();
  // ...existing code...

  return (
    <Paper elevation={4} sx={{ p: 3, minWidth: 400, maxWidth: 600 }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight={600}>مركز الإشعارات</Typography>
        {unreadCount > 0 && (
          <Chip label={`${unreadCount} غير مقروء`} color="error" />
        )}
      </Box>
      {/* ...existing code... */}
    </Paper>
  );
// ...existing code for NotificationCenter component...
}

export default NotificationCenter;
