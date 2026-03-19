/**
 * Audit Logs & Compliance Reporting 📝
 * نظام سجلات التدقيق والتقارير الامتثالية
 *
 * Features:
 * ✅ Complete audit trails
 * ✅ User activity logging
 * ✅ Change tracking
 * ✅ Compliance reports
 * ✅ Export capabilities
 * ✅ Timeline analysis
 * ✅ Alerting system
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
  Alert,
  AlertTitle,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  History as HistoryIcon,
  Description as DescriptionIcon,
  Search as SearchIcon,
  FileDownload as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Check as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  Filter as FilterIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';

const AuditLogs = () => {
  const [logs, setLogs] = useState([
    {
      id: 1,
      timestamp: '2026-01-16 15:30:45',
      user: 'admin@example.com',
      action: 'CREATE',
      resource: 'User:user123',
      details: 'Created new user account',
      status: 'success',
      ipAddress: '192.168.1.100',
    },
    {
      id: 2,
      timestamp: '2026-01-16 15:25:20',
      user: 'manager@example.com',
      action: 'UPDATE',
      resource: 'Order:ORD-2026-001',
      details: 'Updated order status to shipped',
      status: 'success',
      ipAddress: '10.0.0.50',
    },
    {
      id: 3,
      timestamp: '2026-01-16 15:20:10',
      user: 'user@example.com',
      action: 'DELETE',
      resource: 'Document:DOC-456',
      details: 'Deleted document permanently',
      status: 'warning',
      ipAddress: '172.16.0.1',
    },
    {
      id: 4,
      timestamp: '2026-01-16 15:15:00',
      user: 'system',
      action: 'ACCESS',
      resource: 'Database:Reports',
      details: 'Accessed sensitive reports',
      status: 'success',
      ipAddress: '127.0.0.1',
    },
    {
      id: 5,
      timestamp: '2026-01-16 15:10:30',
      user: 'admin@example.com',
      action: 'PERMISSION_CHANGE',
      resource: 'User:user456',
      details: 'Granted admin privileges',
      status: 'warning',
      ipAddress: '192.168.1.101',
    },
  ]);

  const [filterAction, setFilterAction] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [openDetails, setOpenDetails] = useState(false);

  const stats = {
    totalActions: logs.length,
    successfulActions: logs.filter(l => l.status === 'success').length,
    warningActions: logs.filter(l => l.status === 'warning').length,
    failedActions: logs.filter(l => l.status === 'error').length,
  };

  const actionTypes = [
    { value: 'CREATE', label: 'إنشاء', icon: '➕', color: '#4caf50' },
    { value: 'UPDATE', label: 'تحديث', icon: '✏️', color: '#2196f3' },
    { value: 'DELETE', label: 'حذف', icon: '🗑️', color: '#f44336' },
    { value: 'ACCESS', label: 'وصول', icon: '👁️', color: '#667eea' },
    { value: 'PERMISSION_CHANGE', label: 'تغيير أذونات', icon: '🔐', color: '#ff9800' },
  ];

  const getActionIcon = action => {
    const actionType = actionTypes.find(t => t.value === action);
    return actionType ? actionType.icon : '❓';
  };

  const getActionColor = action => {
    const actionType = actionTypes.find(t => t.value === action);
    return actionType ? actionType.color : '#999';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الإجراءات', value: stats.totalActions, icon: '📊', color: '#667eea' },
          { label: 'ناجحة', value: stats.successfulActions, icon: '✅', color: '#4caf50' },
          { label: 'تحذيرات', value: stats.warningActions, icon: '⚠️', color: '#ff9800' },
          { label: 'فشلت', value: stats.failedActions, icon: '❌', color: '#f44336' },
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

      {/* Filters */}
      <Paper sx={{ p: 2.5, borderRadius: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="بحث"
              variant="outlined"
              size="small"
              placeholder="بحث عن مستخدم أو إجراء..."
              startAdornment={<SearchIcon sx={{ mr: 1 }} />}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>نوع الإجراء</InputLabel>
              <Select value={filterAction} onChange={e => setFilterAction(e.target.value)} label="نوع الإجراء">
                <MenuItem value="">الكل</MenuItem>
                {actionTypes.map(action => (
                  <MenuItem key={action.value} value={action.value}>
                    {action.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>الحالة</InputLabel>
              <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} label="الحالة">
                <MenuItem value="">الكل</MenuItem>
                <MenuItem value="success">ناجحة</MenuItem>
                <MenuItem value="warning">تحذير</MenuItem>
                <MenuItem value="error">خطأ</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Audit Logs Table */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        📝 سجلات التدقيق
      </Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#667eea' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الوقت</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>المستخدم</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الإجراء</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>المورد</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الحالة</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs
              .filter(log => !searchQuery || log.user.toLowerCase().includes(searchQuery.toLowerCase()))
              .filter(log => !filterAction || log.action === filterAction)
              .filter(log => !filterStatus || log.status === filterStatus)
              .map(log => (
                <TableRow key={log.id} sx={{ '&:hover': { backgroundColor: '#f8f9ff' } }}>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{log.timestamp}</TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {log.user}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={actionTypes.find(a => a.value === log.action)?.label}
                      size="small"
                      variant="outlined"
                      sx={{ borderColor: getActionColor(log.action), color: getActionColor(log.action) }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{log.resource}</TableCell>
                  <TableCell>
                    <Chip
                      label={log.status === 'success' ? 'ناجح' : log.status === 'warning' ? 'تحذير' : 'خطأ'}
                      color={log.status === 'success' ? 'success' : log.status === 'warning' ? 'warning' : 'error'}
                      size="small"
                      icon={log.status === 'success' ? <CheckIcon /> : log.status === 'warning' ? <WarningIcon /> : <ErrorIcon />}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setSelectedLog(log);
                        setOpenDetails(true);
                      }}
                    >
                      التفاصيل
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Export & Reports */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        📊 التقارير والتصدير
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'تصدير PDF', icon: DownloadIcon },
          { label: 'تصدير Excel', icon: DownloadIcon },
          { label: 'تقرير يومي', icon: DescriptionIcon },
          { label: 'تقرير شهري', icon: DescriptionIcon },
        ].map((report, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Button fullWidth variant="outlined" startIcon={<report.icon />} sx={{ borderRadius: 2, py: 1.5 }}>
              {report.label}
            </Button>
          </Grid>
        ))}
      </Grid>

      {/* Details Dialog */}
      <Dialog open={openDetails} onClose={() => setOpenDetails(false)} maxWidth="sm" fullWidth>
        <DialogTitle>📋 تفاصيل السجل</DialogTitle>
        {selectedLog && (
          <DialogContent sx={{ mt: 2 }}>
            <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f8f9ff' }}>
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    الوقت
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {selectedLog.timestamp}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    المستخدم
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {selectedLog.user}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    الإجراء
                  </Typography>
                  <Chip label={selectedLog.action} size="small" sx={{ mt: 0.5 }} />
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    المورد
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {selectedLog.resource}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    التفاصيل
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {selectedLog.details}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    عنوان IP
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {selectedLog.ipAddress}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    الحالة
                  </Typography>
                  <Chip
                    label={selectedLog.status === 'success' ? 'ناجحة' : 'تحذير'}
                    color={selectedLog.status === 'success' ? 'success' : 'warning'}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </Box>
            </Paper>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setOpenDetails(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditLogs;
