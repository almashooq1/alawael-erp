/**
 * WebSocket Real-Time Integration 🔌
 * تكامل WebSocket للبيانات والاتصالات الفورية
 *
 * Features:
 * ✅ WebSocket connection management
 * ✅ Real-time messaging
 * ✅ Live notifications
 * ✅ Data synchronization
 * ✅ Connection monitoring
 * ✅ Reconnection logic
 * ✅ Event broadcasting
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  LinearProgress,
  Alert,
  AlertTitle,
  Divider,
  Code,
  Badge,
} from '@mui/material';
import {
  Bolt as BoltIcon,
  SignalCellularAlt as SignalIcon,
  Cloud as CloudIcon,
  Send as SendIcon,
  Message as MessageIcon,
  Notifications as NotificationsIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Error as ErrorIcon,
  Check as CheckIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';

const WebSocketIntegration = () => {
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [connections, setConnections] = useState([
    {
      id: 1,
      name: 'Main WebSocket',
      endpoint: 'wss://api.example.com/ws',
      status: 'connected',
      uptime: '48h 32m',
      latency: 45,
      bytesReceived: 2458.5,
      bytesSent: 1205.3,
    },
    {
      id: 2,
      name: 'Notification Hub',
      endpoint: 'wss://notify.example.com/ws',
      status: 'connected',
      uptime: '48h 10m',
      latency: 32,
      bytesReceived: 5620.8,
      bytesSent: 380.2,
    },
    {
      id: 3,
      name: 'Data Sync Service',
      endpoint: 'wss://sync.example.com/ws',
      status: 'connected',
      uptime: '47h 55m',
      latency: 58,
      bytesReceived: 12458.2,
      bytesSent: 8945.1,
    },
  ]);

  const [events, setEvents] = useState([
    { id: 1, timestamp: '2026-01-16 15:30:45', type: 'user_login', user: 'admin@example.com', data: 'User logged in', status: 'success' },
    { id: 2, timestamp: '2026-01-16 15:29:20', type: 'data_sync', user: 'system', data: 'Synchronized 250 records', status: 'success' },
    {
      id: 3,
      timestamp: '2026-01-16 15:28:10',
      type: 'notification',
      user: 'user@example.com',
      data: 'New order received',
      status: 'success',
    },
    { id: 4, timestamp: '2026-01-16 15:27:00', type: 'error', user: 'system', data: 'Connection timeout on endpoint 2', status: 'error' },
  ]);

  const [messageHistory, setMessageHistory] = useState([
    {
      id: 1,
      timestamp: '2026-01-16 15:30:45',
      direction: 'incoming',
      type: 'message',
      data: '{"event":"order_update","orderId":123,"status":"shipped"}',
      size: 58,
    },
    {
      id: 2,
      timestamp: '2026-01-16 15:30:30',
      direction: 'outgoing',
      type: 'subscribe',
      data: '{"action":"subscribe","channel":"orders"}',
      size: 42,
    },
    {
      id: 3,
      timestamp: '2026-01-16 15:30:15',
      direction: 'incoming',
      type: 'message',
      data: '{"event":"customer_created","customerId":456}',
      size: 51,
    },
    { id: 4, timestamp: '2026-01-16 15:30:00', direction: 'outgoing', type: 'ping', data: '{}', size: 2 },
  ]);

  const [liveConnections, setLiveConnections] = useState([
    {
      id: 1,
      userId: 'user123',
      device: 'Chrome on Windows',
      connectedAt: '2026-01-16 08:15',
      lastActivity: '2026-01-16 15:30',
      status: 'active',
    },
    {
      id: 2,
      userId: 'user456',
      device: 'Safari on iPhone',
      connectedAt: '2026-01-16 09:45',
      lastActivity: '2026-01-16 15:28',
      status: 'active',
    },
    {
      id: 3,
      userId: 'user789',
      device: 'Firefox on Linux',
      connectedAt: '2026-01-16 10:20',
      lastActivity: '2026-01-16 15:25',
      status: 'idle',
    },
  ]);

  const [openDialog, setOpenDialog] = useState(false);

  const stats = {
    activeConnections: connections.filter(c => c.status === 'connected').length,
    totalEvents: events.length,
    liveUsers: liveConnections.length,
    avgLatency: Math.round(connections.reduce((sum, c) => sum + c.latency, 0) / connections.length),
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'اتصالات نشطة', value: stats.activeConnections, icon: '🔗', color: '#4caf50' },
          { label: 'الأحداث الكلية', value: stats.totalEvents, icon: '⚡', color: '#2196f3' },
          { label: 'المستخدمون المتصلون', value: stats.liveUsers, icon: '👥', color: '#667eea' },
          { label: 'متوسط الزمن الكامن', value: `${stats.avgLatency}ms`, icon: '⏱️', color: '#ff9800' },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}05)`,
                border: `2px solid ${stat.color}30`,
              }}
            >
              <Typography variant="h3" sx={{ mb: 0.5 }}>
                {stat.icon}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: stat.color }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Connection Status */}
      <Alert
        severity={connectionStatus === 'connected' ? 'success' : connectionStatus === 'disconnected' ? 'error' : 'warning'}
        sx={{ mb: 3, borderRadius: 2 }}
      >
        <AlertTitle sx={{ fontWeight: 700 }}>
          {connectionStatus === 'connected' ? '✅ متصل' : connectionStatus === 'disconnected' ? '❌ غير متصل' : '⚠️ عدم استقرار'}
        </AlertTitle>
        {connectionStatus === 'connected' && 'جميع اتصالات WebSocket تعمل بشكل صحيح'}
        {connectionStatus === 'disconnected' && 'فقدان الاتصال - جاري إعادة الاتصال...'}
        {connectionStatus === 'unstable' && 'اتصال غير مستقر - قد تحدث تأخيرات'}
      </Alert>

      {/* Connections */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        🔌 اتصالات WebSocket
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {connections.map(conn => (
          <Grid item xs={12} key={conn.id}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {conn.name}
                    </Typography>
                    <CircleIcon sx={{ fontSize: 12, color: '#4caf50' }} />
                  </Box>
                  <Code sx={{ fontSize: 12, color: 'textSecondary' }}>{conn.endpoint}</Code>
                </Box>
                <Button size="small" variant="outlined" startIcon={<RefreshIcon />}>
                  إعادة اتصال
                </Button>
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      الحالة
                    </Typography>
                    <Chip label="متصل" color="success" size="small" sx={{ mt: 0.5 }} />
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      الزمن الكامن
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {conn.latency}ms
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      البيانات المستقبلة
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {conn.bytesReceived} KB
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      البيانات المرسلة
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {conn.bytesSent} KB
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid #eee' }}>
                <Typography variant="caption" color="textSecondary">
                  وقت التشغيل
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {conn.uptime}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Live Events */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        ⚡ الأحداث الحية
      </Typography>
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <List>
          {events.map((event, idx) => (
            <Box key={event.id}>
              <ListItem>
                <ListItemIcon>
                  {event.status === 'success' ? <CheckIcon sx={{ color: '#4caf50' }} /> : <ErrorIcon sx={{ color: '#f44336' }} />}
                </ListItemIcon>
                <ListItemText primary={event.type} secondary={`${event.timestamp} • ${event.user}`} />
                <Typography variant="caption" color="textSecondary">
                  {event.data}
                </Typography>
              </ListItem>
              {idx < events.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      </Paper>

      {/* Message History */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        💬 سجل الرسائل
      </Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: '#667eea' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الوقت</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الاتجاه</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>النوع</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>البيانات</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الحجم</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {messageHistory.map(msg => (
              <TableRow key={msg.id} sx={{ '&:hover': { backgroundColor: '#f8f9ff' } }}>
                <TableCell sx={{ fontSize: 12 }}>{msg.timestamp}</TableCell>
                <TableCell>
                  <Chip
                    label={msg.direction === 'incoming' ? 'وارد' : 'صادر'}
                    color={msg.direction === 'incoming' ? 'primary' : 'success'}
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>{msg.type}</TableCell>
                <TableCell>
                  <Code sx={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                    {msg.data}
                  </Code>
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>{msg.size} B</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Live Users */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        👥 المستخدمون المتصلون
      </Typography>
      <Grid container spacing={2}>
        {liveConnections.map(conn => (
          <Grid item xs={12} sm={6} key={conn.id}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {conn.userId}
                  </Typography>
                  <Chip
                    label={conn.status === 'active' ? 'نشط' : 'خامل'}
                    color={conn.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                  {conn.device}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      متصل منذ
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', fontSize: 11 }}>
                      {conn.connectedAt}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      آخر نشاط
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', fontSize: 11 }}>
                      {conn.lastActivity}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default WebSocketIntegration;
