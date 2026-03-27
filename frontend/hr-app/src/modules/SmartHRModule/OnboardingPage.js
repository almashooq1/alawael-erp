/**
 * صفحة تهيئة الموظف الجديد (Onboarding Page)
 */
import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  CircularProgress,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Paper,
} from '@mui/material';
import { Add, CheckCircle, Schedule, Warning, PlayArrow, Done } from '@mui/icons-material';
import {
  fetchOnboardingDashboard,
  fetchOnboardingList,
  fetchOnboardingTemplates,
  createOnboarding,
  updateOnboardingTask,
} from './api';

const statusColors = {
  'لم يبدأ': 'default',
  جاري: 'primary',
  مكتمل: 'success',
  متأخر: 'error',
  معلق: 'warning',
};

const taskStatusIcon = {
  معلق: <Schedule color="action" />,
  جاري: <PlayArrow color="primary" />,
  مكتمل: <Done color="success" />,
  متأخر: <Warning color="error" />,
};

const OnboardingPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [list, setList] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(null);
  const [form, setForm] = useState({ employeeId: '', templateType: 'standard', startDate: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [dashRes, listRes, tplRes] = await Promise.all([
        fetchOnboardingDashboard().catch(() => null),
        fetchOnboardingList({}).catch(() => ({ data: [] })),
        fetchOnboardingTemplates().catch(() => ({ data: [] })),
      ]);
      if (dashRes?.data) setDashboard(dashRes.data);
      setList(listRes?.data || []);
      setTemplates(tplRes?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    try {
      await createOnboarding(form);
      setCreateOpen(false);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleTaskUpdate = async (onboardingId, taskId, status) => {
    try {
      await updateOnboardingTask(onboardingId, taskId, { status });
      load();
      if (detailOpen) {
        const updated = list.find(o => o._id === onboardingId);
        setDetailOpen(updated);
      }
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading)
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box p={3} dir="rtl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          📋 تهيئة الموظفين الجدد
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
          تهيئة جديدة
        </Button>
      </Box>

      {/* ═══ Dashboard Stats ═══ */}
      {dashboard && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent>
                <Typography variant="caption">إجمالي</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {dashboard.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ borderTop: '3px solid #1976d2' }}>
              <CardContent>
                <Typography variant="caption">جارية</Typography>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {dashboard.inProgress}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ borderTop: '3px solid #2e7d32' }}>
              <CardContent>
                <Typography variant="caption">مكتملة</Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {dashboard.completed}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ borderTop: '3px solid #d32f2f' }}>
              <CardContent>
                <Typography variant="caption">متأخرة</Typography>
                <Typography variant="h4" fontWeight="bold" color="error">
                  {dashboard.delayed}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ═══ List ═══ */}
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>الموظف</TableCell>
              <TableCell>القالب</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>التقدم</TableCell>
              <TableCell>تاريخ البداية</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map(onb => (
              <TableRow key={onb._id} hover>
                <TableCell>
                  {onb.employeeId?.personalInfo?.firstName || onb.employeeId?.name || 'غير محدد'}
                </TableCell>
                <TableCell>{onb.templateName}</TableCell>
                <TableCell>
                  <Chip
                    label={onb.status}
                    color={statusColors[onb.status] || 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress
                      variant="determinate"
                      value={onb.progress || 0}
                      sx={{ flex: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2">{onb.progress || 0}%</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {onb.startDate ? new Date(onb.startDate).toLocaleDateString('ar') : '-'}
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => setDetailOpen(onb)}>
                    عرض المهام
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  لا توجد بيانات
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* ═══ Create Dialog ═══ */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء تهيئة جديدة</DialogTitle>
        <DialogContent>
          <TextField
            label="رقم الموظف (Employee ID)"
            fullWidth
            margin="normal"
            value={form.employeeId}
            onChange={e => setForm({ ...form, employeeId: e.target.value })}
          />
          <Select
            label="القالب"
            fullWidth
            value={form.templateType}
            onChange={e => setForm({ ...form, templateType: e.target.value })}
            sx={{ mt: 2 }}
          >
            {templates.map(t => (
              <MenuItem key={t.key} value={t.key}>
                {t.name} ({t.taskCount} مهمة)
              </MenuItem>
            ))}
          </Select>
          <TextField
            label="تاريخ البداية"
            type="date"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            value={form.startDate}
            onChange={e => setForm({ ...form, startDate: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Detail Dialog ═══ */}
      <Dialog open={!!detailOpen} onClose={() => setDetailOpen(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          مهام التهيئة — {detailOpen?.employeeId?.personalInfo?.firstName || 'الموظف'}
        </DialogTitle>
        <DialogContent>
          {detailOpen && (
            <>
              <Box mb={2}>
                <LinearProgress
                  variant="determinate"
                  value={detailOpen.progress || 0}
                  sx={{ height: 12, borderRadius: 6 }}
                />
                <Typography variant="body2" align="center" mt={0.5}>
                  {detailOpen.progress || 0}% مكتمل
                </Typography>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>المهمة</TableCell>
                    <TableCell>الفئة</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>إجراء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(detailOpen.tasks || []).map((task, i) => (
                    <TableRow key={task._id || i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{task.title}</TableCell>
                      <TableCell>
                        <Chip label={task.category} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          {taskStatusIcon[task.status]}
                          <Chip
                            label={task.status}
                            color={statusColors[task.status] || 'default'}
                            size="small"
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        {task.status !== 'مكتمل' && (
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleTaskUpdate(detailOpen._id, task._id, 'مكتمل')}
                          >
                            <CheckCircle />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OnboardingPage;
