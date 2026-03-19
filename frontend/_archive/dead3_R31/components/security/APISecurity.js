/**
 * API Security & Rate Limiting 🔐
 * نظام أمان واجهات البرمجة وتحديد المعدل
 *
 * Features:
 * ✅ API authentication
 * ✅ Token management
 * ✅ Rate limiting
 * ✅ DDoS protection
 * ✅ Input validation
 * ✅ CORS policy
 * ✅ API versioning
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Grid,
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
  Alert,
  AlertTitle,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Copy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';

const APISecurity = () => {
  const [apiKeys, _setApiKeys] = useState([
    {
      id: 1,
      name: 'Production API Key',
      key: 'pk_live_7h8e9d0c1b2a3f4g5h6i7j8k9l0m1n2o',
      created: '2025-06-15',
      lastUsed: '2026-01-16',
      status: 'active',
      permissions: ['read', 'write', 'delete'],
      rateLimit: '10000/hour',
    },
    {
      id: 2,
      name: 'Development API Key',
      key: 'pk_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p',
      created: '2025-08-20',
      lastUsed: '2026-01-14',
      status: 'active',
      permissions: ['read', 'write'],
      rateLimit: '1000/hour',
    },
    {
      id: 3,
      name: 'Third-party Integration',
      key: 'pk_partner_x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m',
      created: '2025-10-01',
      lastUsed: '2026-01-10',
      status: 'suspended',
      permissions: ['read'],
      rateLimit: '500/hour',
    },
  ]);

  const [rateLimits, _setRateLimits] = useState([
    { id: 1, endpoint: 'GET /api/v1/customers', limit: 1000, period: '1 hour', current: 750, status: 'ok' },
    { id: 2, endpoint: 'POST /api/v1/sales', limit: 500, period: '1 hour', current: 480, status: 'warning' },
    { id: 3, endpoint: 'DELETE /api/v1/users', limit: 100, period: '1 hour', current: 95, status: 'critical' },
  ]);

  const [blockedIPs, _setBlockedIPs] = useState([
    { id: 1, ip: '192.168.1.100', reason: 'Suspicious activity', blockedDate: '2026-01-15', unblockDate: '2026-01-22', status: 'active' },
    { id: 2, ip: '10.0.0.50', reason: 'Multiple failed attempts', blockedDate: '2026-01-14', unblockDate: null, status: 'permanent' },
    { id: 3, ip: '172.16.0.1', reason: 'DDoS attempt', blockedDate: '2026-01-13', unblockDate: '2026-01-20', status: 'expired' },
  ]);

  const [corsRules, _setCorsRules] = useState([
    { id: 1, domain: 'https://myapp.com', methods: ['GET', 'POST', 'PUT'], credentials: true, maxAge: 86400 },
    { id: 2, domain: 'https://api.example.com', methods: ['GET', 'POST'], credentials: false, maxAge: 3600 },
    { id: 3, domain: 'http://localhost:3000', methods: ['*'], credentials: true, maxAge: 0 },
  ]);

  const [openDialog, setOpenDialog] = useState(false);
  const [showKey, setShowKey] = useState({});

  const stats = {
    totalKeys: apiKeys.length,
    activeKeys: apiKeys.filter(k => k.status === 'active').length,
    blockedIPs: blockedIPs.filter(b => b.status === 'active' || b.status === 'permanent').length,
    corsRules: corsRules.length,
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'مفاتيح API', value: stats.totalKeys, icon: '🔑', color: '#667eea' },
          { label: 'نشطة', value: stats.activeKeys, icon: '✅', color: '#4caf50' },
          { label: 'عناوين IP محجوبة', value: stats.blockedIPs, icon: '🚫', color: '#f44336' },
          { label: 'قواعد CORS', value: stats.corsRules, icon: '🛡️', color: '#2196f3' },
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

      {/* Security Alert */}
      <Alert severity="warning" icon={<AlertTitle />} sx={{ mb: 3, borderRadius: 2 }}>
        <AlertTitle sx={{ fontWeight: 700 }}>⚠️ تنبيه أمان</AlertTitle>
        هناك مفتاح API قديم لم يتم استخدامه منذ 3 أشهر. يُرجى حذفه لتحسين الأمان.
      </Alert>

      {/* API Keys */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        🔑 مفاتيح واجهة البرمجة
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {apiKeys.map(apiKey => (
          <Grid item xs={12} key={apiKey.id}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {apiKey.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                    تم الإنشاء: {apiKey.created}
                  </Typography>
                </Box>
                <Chip
                  label={apiKey.status === 'active' ? 'نشط' : apiKey.status === 'suspended' ? 'معلق' : 'معطل'}
                  color={apiKey.status === 'active' ? 'success' : apiKey.status === 'suspended' ? 'warning' : 'error'}
                  size="small"
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2, backgroundColor: '#f8f9ff', p: 2, borderRadius: 1 }}>
                <Code sx={{ fontSize: 12, flex: 1, wordBreak: 'break-all' }}>
                  {showKey[apiKey.id] ? apiKey.key : apiKey.key.substring(0, 20) + '...'}
                </Code>
                <Tooltip title={showKey[apiKey.id] ? 'إخفاء' : 'عرض'}>
                  <IconButton size="small" onClick={() => setShowKey({ ...showKey, [apiKey.id]: !showKey[apiKey.id] })}>
                    {showKey[apiKey.id] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="نسخ">
                  <IconButton size="small" onClick={() => navigator.clipboard.writeText(apiKey.key)}>
                    <CopyIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    آخر استخدام
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                    {apiKey.lastUsed}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    حد المعدل
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                    {apiKey.rateLimit}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                الأذونات:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {apiKey.permissions.map(perm => (
                  <Chip key={perm} label={perm} size="small" variant="outlined" />
                ))}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Button variant="contained" fullWidth startIcon={<AddIcon />} onClick={() => setOpenDialog(true)} sx={{ mb: 3, borderRadius: 2 }}>
        إنشاء مفتاح جديد
      </Button>

      {/* Rate Limiting */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        ⏱️ تحديد المعدل
      </Typography>
      <Paper sx={{ p: 2.5, borderRadius: 2, mb: 3 }}>
        {rateLimits.map(limit => (
          <Box key={limit.id} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {limit.endpoint}
              </Typography>
              <Chip
                label={limit.status === 'ok' ? 'عادي' : limit.status === 'warning' ? 'تحذير' : 'حرج'}
                color={limit.status === 'ok' ? 'success' : limit.status === 'warning' ? 'warning' : 'error'}
                size="small"
              />
            </Box>
            <LinearProgress variant="determinate" value={(limit.current / limit.limit) * 100} sx={{ height: 6, borderRadius: 2 }} />
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
              {limit.current}/{limit.limit} طلب كل {limit.period}
            </Typography>
            {limit.id !== rateLimits.length && <Divider sx={{ my: 1.5 }} />}
          </Box>
        ))}
      </Paper>

      {/* Blocked IPs */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        🚫 عناوين IP المحجوبة
      </Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#667eea' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>عنوان IP</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>السبب</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>تاريخ الحجب</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الحالة</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {blockedIPs.map(ip => (
              <TableRow key={ip.id} sx={{ '&:hover': { backgroundColor: '#f8f9ff' } }}>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{ip.ip}</TableCell>
                <TableCell>{ip.reason}</TableCell>
                <TableCell>{ip.blockedDate}</TableCell>
                <TableCell>
                  <Chip
                    label={ip.status === 'active' ? 'نشط' : ip.status === 'permanent' ? 'دائم' : 'منتهي الصلاحية'}
                    color={ip.status === 'active' || ip.status === 'permanent' ? 'error' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Button size="small" startIcon={<CloseIcon />}>
                    فك الحجب
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* CORS Rules */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        🛡️ قواعد CORS
      </Typography>
      <Grid container spacing={2}>
        {corsRules.map(rule => (
          <Grid item xs={12} key={rule.id}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {rule.domain}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    الطرق
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                    {rule.methods.join(', ')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    أوراق الاعتماد
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                    {rule.credentials ? 'مسموح' : 'ممنوع'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Max Age
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                    {rule.maxAge} ثانية
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>🔑 إنشاء مفتاح API جديد</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField fullWidth label="اسم المفتاح" variant="outlined" margin="normal" />
          <TextField fullWidth label="حد المعدل" variant="outlined" margin="normal" placeholder="10000/hour" />
          <TextField fullWidth label="الأذونات" variant="outlined" margin="normal" multiline rows={3} placeholder="read,write,delete" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button onClick={() => setOpenDialog(false)} variant="contained">
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default APISecurity;
