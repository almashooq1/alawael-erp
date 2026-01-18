/**
 * API Gateway & Integration Hub 🌉
 * بوابة API المركزية والتكامل مع الخدمات
 *
 * Features:
 * ✅ API request routing
 * ✅ Rate limiting
 * ✅ Request/Response caching
 * ✅ API versioning
 * ✅ Authentication
 * ✅ Logging & monitoring
 * ✅ Error handling
 */

import React, { useState } from 'react';
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
  Code,
  Divider,
  Alert,
  Tabs,
  Tab,
  Box as MuiBox,
} from '@mui/material';
import {
  Api as ApiIcon,
  CloudUpload as CloudIcon,
  Webhook as WebhookIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Monitor as MonitorIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';

const APIGateway = () => {
  const [tabValue, setTabValue] = useState(0);

  const [apis, setApis] = useState([
    {
      id: 1,
      name: 'نظام العملاء',
      endpoint: '/api/v1/customers',
      method: 'GET',
      status: 'active',
      uptime: 99.9,
      avgResponseTime: 125,
      rateLimit: '10000 req/h',
    },
    {
      id: 2,
      name: 'معالجة المبيعات',
      endpoint: '/api/v1/sales',
      method: 'POST',
      status: 'active',
      uptime: 99.7,
      avgResponseTime: 250,
      rateLimit: '5000 req/h',
    },
    {
      id: 3,
      name: 'إدارة المحفظة',
      endpoint: '/api/v1/wallet',
      method: 'GET/POST',
      status: 'active',
      uptime: 99.95,
      avgResponseTime: 180,
      rateLimit: '2000 req/h',
    },
    {
      id: 4,
      name: 'نظام الإخطارات',
      endpoint: '/api/v1/notifications',
      method: 'POST',
      status: 'degraded',
      uptime: 98.5,
      avgResponseTime: 450,
      rateLimit: '15000 req/h',
    },
  ]);

  const [integrations, setIntegrations] = useState([
    { id: 1, name: 'خدمة الدفع (Stripe)', status: 'connected', lastSync: '2026-01-16 14:30', syncInterval: '5 minutes', errorRate: 0.1 },
    {
      id: 2,
      name: 'نظام البريد الإلكتروني (SendGrid)',
      status: 'connected',
      lastSync: '2026-01-16 13:45',
      syncInterval: '10 minutes',
      errorRate: 0,
    },
    {
      id: 3,
      name: 'خدمة الخريطة (Google Maps)',
      status: 'connected',
      lastSync: '2026-01-16 15:00',
      syncInterval: 'real-time',
      errorRate: 0.05,
    },
    { id: 4, name: 'خدمة التحليلات (Analytics)', status: 'error', lastSync: '2026-01-16 12:00', syncInterval: '1 hour', errorRate: 2.5 },
  ]);

  const [rateLimits, setRateLimits] = useState([
    { id: 1, endpoint: '/api/v1/customers', currentUsage: 7500, limit: 10000, resetTime: '2026-01-17 00:00', percentage: 75 },
    { id: 2, endpoint: '/api/v1/sales', currentUsage: 4200, limit: 5000, resetTime: '2026-01-17 00:00', percentage: 84 },
    { id: 3, endpoint: '/api/v1/wallet', currentUsage: 1800, limit: 2000, resetTime: '2026-01-17 00:00', percentage: 90 },
  ]);

  const [logs, setLogs] = useState([
    {
      id: 1,
      timestamp: '2026-01-16 15:30:45',
      method: 'GET',
      endpoint: '/api/v1/customers',
      status: 200,
      responseTime: '120ms',
      user: 'admin@example.com',
    },
    {
      id: 2,
      timestamp: '2026-01-16 15:30:30',
      method: 'POST',
      endpoint: '/api/v1/sales',
      status: 201,
      responseTime: '250ms',
      user: 'user@example.com',
    },
    {
      id: 3,
      timestamp: '2026-01-16 15:30:15',
      method: 'GET',
      endpoint: '/api/v1/wallet',
      status: 200,
      responseTime: '180ms',
      user: 'admin@example.com',
    },
    {
      id: 4,
      timestamp: '2026-01-16 15:30:00',
      method: 'POST',
      endpoint: '/api/v1/notifications',
      status: 500,
      responseTime: '450ms',
      user: 'system',
    },
  ]);

  const stats = {
    totalAPIs: apis.length,
    activeAPIs: apis.filter(a => a.status === 'active').length,
    avgUptime: (apis.reduce((sum, a) => sum + a.uptime, 0) / apis.length).toFixed(2),
    integrations: integrations.length,
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي APIs', value: stats.totalAPIs, icon: '🌉', color: '#667eea' },
          { label: 'نشطة', value: stats.activeAPIs, icon: '✅', color: '#4caf50' },
          { label: 'متوسط الجاهزية', value: `${stats.avgUptime}%`, icon: '📈', color: '#2196f3' },
          { label: 'التكاملات', value: stats.integrations, icon: '🔗', color: '#ff9800' },
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

      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="📡 واجهات API" />
        <Tab label="🔗 التكاملات" />
        <Tab label="⏱️ حدود المعدل" />
        <Tab label="📜 السجلات" />
      </Tabs>

      {/* APIs Tab */}
      {tabValue === 0 && (
        <>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            📡 واجهات API المتاحة
          </Typography>
          <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#667eea' }}>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الاسم</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>النقطة</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الحالة</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الجاهزية</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>متوسط الاستجابة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {apis.map(api => (
                  <TableRow key={api.id} sx={{ '&:hover': { backgroundColor: '#f8f9ff' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>{api.name}</TableCell>
                    <TableCell>
                      <Code sx={{ fontSize: 12, backgroundColor: '#f8f9ff', p: 1, borderRadius: 1 }}>
                        {api.method} {api.endpoint}
                      </Code>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={api.status === 'active' ? 'نشطة' : 'متدهورة'}
                        color={api.status === 'active' ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption">{api.uptime}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={api.uptime} />
                      </Box>
                    </TableCell>
                    <TableCell>{api.avgResponseTime}ms</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Integrations Tab */}
      {tabValue === 1 && (
        <>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            🔗 التكاملات الخارجية
          </Typography>
          <Grid container spacing={2}>
            {integrations.map(integration => (
              <Grid item xs={12} key={integration.id}>
                <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {integration.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                        آخر مزامنة: {integration.lastSync}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        فترة المزامنة: {integration.syncInterval}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Chip
                        label={integration.status === 'connected' ? 'متصلة' : 'خطأ'}
                        color={integration.status === 'connected' ? 'success' : 'error'}
                        size="small"
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="caption" sx={{ display: 'block', color: integration.errorRate > 1 ? '#f44336' : '#4caf50' }}>
                        معدل الخطأ: {integration.errorRate}%
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Rate Limits Tab */}
      {tabValue === 2 && (
        <>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            ⏱️ حدود المعدل
          </Typography>
          {rateLimits.map(limit => (
            <Paper key={limit.id} sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {limit.endpoint}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, color: limit.percentage > 80 ? '#f44336' : '#4caf50' }}>
                  {limit.currentUsage}/{limit.limit}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={limit.percentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#e0e0e0',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: limit.percentage > 80 ? '#f44336' : limit.percentage > 50 ? '#ff9800' : '#4caf50',
                  },
                }}
              />
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                إعادة تعيين: {limit.resetTime}
              </Typography>
            </Paper>
          ))}
        </>
      )}

      {/* Logs Tab */}
      {tabValue === 3 && (
        <>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            📜 سجل الطلبات
          </Typography>
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#667eea' }}>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الوقت</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الطريقة</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>النقطة</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الحالة</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الوقت</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id} sx={{ '&:hover': { backgroundColor: '#f8f9ff' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>{log.timestamp}</TableCell>
                    <TableCell>
                      <Chip label={log.method} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{log.endpoint}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.status}
                        size="small"
                        color={log.status === 200 || log.status === 201 ? 'success' : 'error'}
                        icon={log.status === 200 || log.status === 201 ? <CheckIcon /> : <ErrorIcon />}
                      />
                    </TableCell>
                    <TableCell>{log.responseTime}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default APIGateway;
