/**
 * Backup & Recovery System - Data Protection 💾
 * نظام النسخ الاحتياطية والاسترجاع
 *
 * Features:
 * ✅ Automated backups
 * ✅ Multiple backup schedules
 * ✅ Recovery point management
 * ✅ Disaster recovery
 * ✅ Backup verification
 * ✅ Data retention policies
 * ✅ Restore options
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
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Box as MuiBox,
  TextField,
} from '@mui/material';
import {
  CloudDownload as CloudDownloadIcon,
  CloudUpload as CloudUploadIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

const BackupRecovery = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('schedule');
  const [backups, _setBackups] = useState([
    {
      id: '1',
      name: 'نسخة يومية 16-01',
      type: 'daily',
      date: '2026-01-16 02:00',
      size: '4.2 GB',
      status: 'completed',
      verified: true,
      retention: 7,
      location: 'Cloud Storage',
    },
    {
      id: '2',
      name: 'نسخة أسبوعية',
      type: 'weekly',
      date: '2026-01-15 03:00',
      size: '4.1 GB',
      status: 'completed',
      verified: true,
      retention: 30,
      location: 'Cloud Storage',
    },
    {
      id: '3',
      name: 'نسخة شهرية',
      type: 'monthly',
      date: '2026-01-01 04:00',
      size: '3.9 GB',
      status: 'completed',
      verified: true,
      retention: 365,
      location: 'Cloud Storage',
    },
    {
      id: '4',
      name: 'نسخة احتياطية سريعة',
      type: 'quick',
      date: '2026-01-16 14:30',
      size: '2.1 GB',
      status: 'running',
      verified: false,
      retention: 1,
      location: 'Local Storage',
    },
  ]);

  const schedules = [
    {
      id: '1',
      name: 'نسخ يومية',
      frequency: 'يومي',
      time: '02:00 صباحاً',
      enabled: true,
      retention: 7,
      location: 'Cloud',
    },
    {
      id: '2',
      name: 'نسخ أسبوعية',
      frequency: 'أسبوعي (الأحد)',
      time: '03:00 صباحاً',
      enabled: true,
      retention: 30,
      location: 'Cloud',
    },
    {
      id: '3',
      name: 'نسخ شهرية',
      frequency: 'شهري (اليوم الأول)',
      time: '04:00 صباحاً',
      enabled: true,
      retention: 365,
      location: 'Cloud',
    },
  ];

  const stats = {
    totalBackups: backups.length,
    lastBackup: '2026-01-16 14:30',
    totalSize: '14.3 GB',
    storageUsed: 65,
  };

  const handleScheduleBackup = () => {
    setDialogType('schedule');
    setOpenDialog(true);
  };

  const handleRestoreBackup = _id => {
    if (window.confirm('هل تريد استعادة هذه النسخة؟ قد يستغرق الأمر عدة دقائق.')) {
      alert('تم بدء عملية الاسترجاع. يمكنك متابعة التقدم من لوحة المعلومات.');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي النسخ', value: stats.totalBackups, icon: '💾', color: '#667eea' },
          { label: 'آخر نسخة', value: stats.lastBackup, icon: '⏰', color: '#4caf50' },
          { label: 'إجمالي الحجم', value: stats.totalSize, icon: '📦', color: '#ff9800' },
          {
            label: 'المساحة المستخدمة',
            value: `${stats.storageUsed}%`,
            icon: '🗄️',
            color: '#2196f3',
          },
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
              <Typography variant="h6" sx={{ fontWeight: 700, color: stat.color }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Tabs Content */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={handleScheduleBackup}
          sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          نسخة احتياطية فورية
        </Button>
        <Button
          variant="outlined"
          startIcon={<ScheduleIcon />}
          onClick={() => {
            setDialogType('manage');
            setOpenDialog(true);
          }}
        >
          إدارة الجدول
        </Button>
      </Box>

      {/* Backup List */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        📋 النسخ الاحتياطية
      </Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#667eea' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الاسم</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>النوع</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>التاريخ</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الحجم</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الحالة</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>التحقق</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {backups.map(backup => (
              <TableRow key={backup.id} sx={{ '&:hover': { backgroundColor: '#f8f9ff' } }}>
                <TableCell sx={{ fontWeight: 600 }}>{backup.name}</TableCell>
                <TableCell>
                  <Chip label={backup.type} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{backup.date}</TableCell>
                <TableCell>{backup.size}</TableCell>
                <TableCell>
                  <Chip
                    label={backup.status === 'completed' ? 'مكتملة' : 'قيد التنفيذ'}
                    color={backup.status === 'completed' ? 'success' : 'warning'}
                    icon={backup.status === 'completed' ? <CheckIcon /> : <ScheduleIcon />}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={backup.verified ? 'تم التحقق' : 'قيد التحقق'}
                    color={backup.verified ? 'success' : 'default'}
                    icon={backup.verified ? <CheckIcon /> : <ScheduleIcon />}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="استعادة">
                    <IconButton
                      size="small"
                      onClick={() => handleRestoreBackup(backup.id)}
                      color="primary"
                    >
                      <RestoreIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تنزيل">
                    <IconButton size="small" color="info">
                      <CloudDownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="حذف">
                    <IconButton size="small" color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Backup Schedules */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        ⏰ جداول النسخ الاحتياطية
      </Typography>
      <Stack spacing={2}>
        {schedules.map(schedule => (
          <Card key={schedule.id} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {schedule.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{ display: 'block', mt: 0.5 }}
                  >
                    🕐 {schedule.frequency} الساعة {schedule.time}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    📁 الموقع: {schedule.location} • الاحتفاظ: {schedule.retention} يوم
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {schedule.enabled ? 'مفعل' : 'معطل'}
                  </Typography>
                  <Switch checked={schedule.enabled} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Storage Status */}
      <Paper sx={{ p: 3, borderRadius: 2, mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          🗄️ حالة المساحة التخزينية
        </Typography>
        <Stack spacing={2}>
          <MuiBox>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Cloud Storage
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#667eea' }}>
                6.5 GB / 10 GB
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={65} sx={{ height: 8, borderRadius: 4 }} />
          </MuiBox>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            💡 المساحة المتبقية: 3.5 GB. يُنصح بتنظيف النسخ القديمة.
          </Alert>
        </Stack>
      </Paper>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}
        >
          {dialogType === 'schedule' ? 'جدول نسخة احتياطية جديدة' : 'إدارة الجدول'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField label="اسم الجدول" fullWidth />
            <FormControl fullWidth>
              <InputLabel>التكرار</InputLabel>
              <Select label="التكرار">
                {['يومي', 'أسبوعي', 'شهري'].map(freq => (
                  <MenuItem key={freq} value={freq}>
                    {freq}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField type="time" label="الوقت" fullWidth />
            <FormControl fullWidth>
              <InputLabel>موقع التخزين</InputLabel>
              <Select label="موقع التخزين">
                {['Cloud Storage', 'Local Storage', 'Both'].map(loc => (
                  <MenuItem key={loc} value={loc}>
                    {loc}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button variant="contained">حفظ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BackupRecovery;
