/**
 * Smart Maintenance System
 * نظام الصيانة الذكي - جدولة استباقية وتتبع شامل
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  LinearProgress,
  Typography,
  Stack,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Avatar,
  Rating,
  TimelineItem,
  Timeline,
  TimelineOppositeContent,
  TimelineConnector,
  TimelineSeparator,
  TimelineDot,
  TimelineContent,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Build as BuildIcon,
  Settings as SettingsIcon,
  Trending Up as TrendingUpIcon,
  CalendarToday as CalendarTodayIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';

const SmartMaintenanceSystem = () => {
  const [maintenances, setMaintenances] = useState([]);
  const [overdueMaintenance, setOverdueMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [openCompleteDialog, setOpenCompleteDialog] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [stats, setStats] = useState(null);

  const { get, post, patch } = useApi();

  const [scheduleForm, setScheduleForm] = useState({
    equipmentId: '',
    scheduleType: 'preventive',
    frequency: 30,
    frequencyType: 'monthly',
  });

  const [completeForm, setCompleteForm] = useState({
    findings: '',
    recommendations: '',
    duration: '',
    cost: '',
    checklist: [],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [maintenanceRes, overdueRes] = await Promise.all([
        get('/api/maintenance-schedules'),
        get('/api/maintenance/overdue'),
      ]);

      setMaintenances(maintenanceRes.data);
      setOverdueMaintenance(overdueRes.data);

      // حساب الإحصائيات
      const stats = {
        totalScheduled: maintenanceRes.data.length,
        completed: maintenanceRes.data.filter((m) => m.status === 'completed').length,
        inProgress: maintenanceRes.data.filter((m) => m.status === 'in_progress').length,
        overdue: overdueRes.data.length,
      };
      setStats(stats);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMaintenance = async () => {
    try {
      await post(`/api/maintenance/${selectedMaintenance._id}/complete`, completeForm);
      setOpenCompleteDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error completing maintenance:', error);
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      scheduled: <ScheduleIcon />,
      in_progress: <BuildIcon />,
      completed: <CheckCircleIcon sx={{ color: 'green' }} />,
      overdue: <WarningIcon sx={{ color: 'red' }} />,
    };
    return icons[status] || <ScheduleIcon />;
  };

  const getMaintenanceTypeLabel = (type) => {
    const labels = {
      preventive: '🛡️ وقائية',
      corrective: '🔧 إصلاحية',
      predictive: '📊 تنبؤية',
      condition_based: '📈 بناءً على الحالة',
    };
    return labels[type] || type;
  };

  const calculateProgress = (maintenance) => {
    if (maintenance.status === 'completed') return 100;
    if (maintenance.status === 'in_progress') return 60;
    if (maintenance.status === 'overdue') return 30;
    return 0;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
          🔧 نظام الصيانة الذكي
        </Typography>
        <Typography variant="body1" color="textSecondary">
          جدولة صيانة استباقية - تتبع ساعات التشغيل - تنبيهات قبل انتهاء الضمان
        </Typography>
      </Box>

      {/* Statistics */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <CardContent sx={{ color: 'white' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="rgba(255,255,255,0.8)" gutterBottom variant="body2">
                      الصيانات المجدولة
                    </Typography>
                    <Typography variant="h4">{stats.totalScheduled}</Typography>
                  </Box>
                  <ScheduleIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <CardContent sx={{ color: 'white' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="rgba(255,255,255,0.8)" gutterBottom variant="body2">
                      قيد التنفيذ
                    </Typography>
                    <Typography variant="h4">{stats.inProgress}</Typography>
                  </Box>
                  <BuildIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
              <CardContent sx={{ color: 'white' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="rgba(255,255,255,0.8)" gutterBottom variant="body2">
                      مكتملة
                    </Typography>
                    <Typography variant="h4">{stats.completed}</Typography>
                  </Box>
                  <CheckCircleIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
              <CardContent sx={{ color: 'white' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="rgba(255,255,255,0.8)" gutterBottom variant="body2">
                      متأخرة
                    </Typography>
                    <Typography variant="h4">{stats.overdue}</Typography>
                  </Box>
                  <WarningIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Overdue Alerts */}
      {overdueMaintenance.length > 0 && (
        <Alert
          severity="error"
          icon={<WarningIcon />}
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small">
              تتبع الآن
            </Button>
          }
        >
          ⚠️ {overdueMaintenance.length} صيانات متأخرة - تحتاج متابعة فورية
        </Alert>
      )}

      {/* Maintenance Schedule Table */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="📋 جدول الصيانة المجدول"
          action={
            <Button
              variant="contained"
              startIcon={<ScheduleIcon />}
              onClick={() => setOpenScheduleDialog(true)}
            >
              ➕ جدولة صيانة
            </Button>
          }
          subheader="صيانة وقائية دورية - تتبع ساعات التشغيل - تنبيهات ذكية"
        />

        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>المعدة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>نوع الصيانة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>التاريخ المقرر</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>المسؤول</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>التقدم</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {maintenances.map((maintenance) => (
                  <TableRow
                    key={maintenance._id}
                    hover
                    sx={{
                      backgroundColor:
                        maintenance.status === 'overdue' ? '#ffebee' : 'transparent',
                    }}
                  >
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      {maintenance.equipment?.name}
                    </TableCell>
                    <TableCell>
                      {getMaintenanceTypeLabel(maintenance.scheduleType)}
                    </TableCell>
                    <TableCell>
                      {new Date(
                        maintenance.preventiveSchedule?.nextScheduledDate
                      ).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      {maintenance.responsibleTechnician?.name || 'غير محدد'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ width: '100%', mr: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={calculateProgress(maintenance)}
                          sx={{ mb: 0.5 }}
                        />
                        <Typography variant="caption">
                          {calculateProgress(maintenance)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(maintenance.status)}
                        label={maintenance.status}
                        color={
                          maintenance.status === 'completed'
                            ? 'success'
                            : maintenance.status === 'overdue'
                            ? 'error'
                            : 'info'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {maintenance.status === 'scheduled' && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSelectedMaintenance(maintenance);
                            setOpenCompleteDialog(true);
                          }}
                        >
                          البدء
                        </Button>
                      )}
                      {maintenance.status === 'in_progress' && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => {
                            setSelectedMaintenance(maintenance);
                            setOpenCompleteDialog(true);
                          }}
                        >
                          إكمال
                        </Button>
                      )}
                      {maintenance.status === 'completed' && (
                        <Chip label="مكتملة" color="success" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {maintenances.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ScheduleIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
              <Typography color="textSecondary">
                لا توجد جداول صيانة مجدولة حالياً
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Maintenance Schedule Dialog */}
      <Dialog open={openScheduleDialog} onClose={() => setOpenScheduleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>📅 جدولة صيانة جديدة</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="رقم المعدة"
              value={scheduleForm.equipmentId}
              onChange={(e) =>
                setScheduleForm({ ...scheduleForm, equipmentId: e.target.value })
              }
            />

            <FormControl fullWidth>
              <InputLabel>نوع الصيانة</InputLabel>
              <Select
                value={scheduleForm.scheduleType}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, scheduleType: e.target.value })
                }
                label="نوع الصيانة"
              >
                <MenuItem value="preventive">🛡️ وقائية</MenuItem>
                <MenuItem value="corrective">🔧 إصلاحية</MenuItem>
                <MenuItem value="predictive">📊 تنبؤية</MenuItem>
                <MenuItem value="condition_based">📈 بناءً على الحالة</MenuItem>
              </Select>
            </FormControl>

            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
              <TextField
                type="number"
                label="التكرار"
                value={scheduleForm.frequency}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, frequency: parseInt(e.target.value) })
                }
              />
              <FormControl fullWidth>
                <InputLabel>النوع</InputLabel>
                <Select
                  value={scheduleForm.frequencyType}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, frequencyType: e.target.value })
                  }
                  label="النوع"
                >
                  <MenuItem value="daily">يومي</MenuItem>
                  <MenuItem value="weekly">أسبوعي</MenuItem>
                  <MenuItem value="monthly">شهري</MenuItem>
                  <MenuItem value="quarterly">ربع سنوي</MenuItem>
                  <MenuItem value="yearly">سنوي</MenuItem>
                  <MenuItem value="by_hours">حسب الساعات</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Alert severity="info">
              ℹ️ الصيانة الوقائية تحافظ على عمر المعدة وتقلل الأعطال المفاجئة
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenScheduleDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={() => setOpenScheduleDialog(false)}>
            ✓ جدولة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete Maintenance Dialog */}
      <Dialog open={openCompleteDialog} onClose={() => setOpenCompleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>✅ إكمال الصيانة</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedMaintenance && (
            <Stack spacing={2}>
              <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="textSecondary">
                  المعدة:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {selectedMaintenance.equipment?.name}
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="ساعات العمل المستخدمة"
                type="number"
                value={completeForm.duration}
                onChange={(e) =>
                  setCompleteForm({ ...completeForm, duration: e.target.value })
                }
              />

              <TextField
                fullWidth
                label="تكلفة الصيانة"
                type="number"
                value={completeForm.cost}
                onChange={(e) =>
                  setCompleteForm({ ...completeForm, cost: e.target.value })
                }
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="النتائج والملاحظات"
                value={completeForm.findings}
                onChange={(e) =>
                  setCompleteForm({ ...completeForm, findings: e.target.value })
                }
              />

              <TextField
                fullWidth
                multiline
                rows={2}
                label="التوصيات"
                value={completeForm.recommendations}
                onChange={(e) =>
                  setCompleteForm({ ...completeForm, recommendations: e.target.value })
                }
              />

              <Alert severity="success">
                ✓ بعد الإكمال ستتم إعادة جدولة الصيانة التالية تلقائياً
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCompleteDialog(false)}>إلغاء</Button>
          <Button variant="contained" color="success" onClick={handleCompleteMaintenance}>
            ✓ تأكيد الإكمال
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SmartMaintenanceSystem;
