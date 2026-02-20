import React, { useEffect, useState } from 'react';
import { Box, Typography, IconButton, Badge, Menu, MenuItem, CircularProgress, Alert } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';

const API = '/api/montessori/notifications';
const token = localStorage.getItem('montessori_token');

export default function MontessoriNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotifications(data);
      setUnread(data.filter(n => !n.read).length);
    } catch {
      setError('فشل في جلب الإشعارات');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchNotifications(); }, []);

  const handleOpen = e => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleMarkRead = async id => {
    try {
      await fetch(`${API}/${id}/read`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      fetchNotifications();
    } catch {}
  };

  return (
    <Box>
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={unread} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {loading && <MenuItem><CircularProgress size={20} /></MenuItem>}
        {error && <MenuItem><Alert severity="error">{error}</Alert></MenuItem>}
        {!loading && notifications.length === 0 && <MenuItem>لا توجد إشعارات</MenuItem>}
        {notifications.map(n => (
          <MenuItem key={n._id} selected={!n.read} onClick={() => { handleMarkRead(n._id); handleClose(); }}>
            <Typography color={n.read ? 'textSecondary' : 'primary'}>{n.message}</Typography>
            <Typography variant="caption" sx={{ ml: 1 }}>{n.date ? n.date.slice(0,16).replace('T',' ') : ''}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
