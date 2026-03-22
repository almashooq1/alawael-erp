/**
 * Shift Management — نظام إدارة الورديات
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Alert,
  Snackbar,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Schedule as ClockIcon,
  SwapHoriz as SwapIcon,
  Group as GroupIcon,
  NightsStay as NightIcon,
  WbSunny as DayIcon,
} from '@mui/icons-material';
import {
  getShiftDefinitions,
  createShiftDefinition,
  getShiftStats,
  createShiftSwapRequest,
  approveShiftSwap,
} from '../../services/hr/employeeAffairsPhase2Service';

const SHIFT_TYPES = ['صباحي', 'مسائي', 'ليلي', 'مرن', 'متقطع', 'مناوبة'];
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const shiftTypeIcon = {
  صباحي: <DayIcon />,
  مسائي: <ClockIcon />,
  ليلي: <NightIcon />,
  مرن: <SwapIcon />,
  متقطع: <ClockIcon />,
  مناوبة: <GroupIcon />,
};
const shiftTypeColor = {
  صباحي: '#ffa726',
  مسائي: '#42a5f5',
  ليلي: '#5c6bc0',
  مرن: '#66bb6a',
  متقطع: '#ef5350',
  مناوبة: '#ab47bc',
};

export default function ShiftManagement() {
  const [tab, setTab] = useState(0);
  const [definitions, setDefinitions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [viewDialog, setViewDialog] = useState(null);
  const [form, setForm] = useState({
    name: '',
    shiftCode: '',
    type: 'صباحي',
    startTime: '08:00',
    endTime: '16:00',
    breakDuration: 60,
    workingDays: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
    graceMinutes: 15,
    nightShiftAllowance: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [defs, st] = await Promise.all([getShiftDefinitions(), getShiftStats()]);
      setDefinitions(defs?.data || defs || []);
      setStats(st?.data || st);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    try {
      await createShiftDefinition({
        ...form,
        breakDuration: Number(form.breakDuration),
        graceMinutes: Number(form.graceMinutes),
        nightShiftAllowance: Number(form.nightShiftAllowance),
      });
      setOpenDialog(false);
      setForm({
        name: '',
        shiftCode: '',
        type: 'صباحي',
        startTime: '08:00',
        endTime: '16:00',
        breakDuration: 60,
        workingDays: DAYS,
        graceMinutes: 15,
        nightShiftAllowance: 0,
      });
      setSnackbar({ open: true, message: 'تم إنشاء الوردية بنجاح', severity: 'success' });
      fetchData();
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  };

  const calcHours = (start, end) => {
    if (!start || !end) return '-';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let diff = eh * 60 + em - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  const statCards = [
    { label: 'أنواع الورديات', value: stats?.totalDefinitions || 0, color: '#1976d2', icon: '📅' },
    { label: 'موظفين مجدولين', value: stats?.totalAssigned || 0, color: '#4caf50', icon: '👥' },
    { label: 'متأخرون اليوم', value: stats?.lateToday || 0, color: '#d32f2f', icon: '⏰' },
    { label: 'طلبات تبديل', value: stats?.pendingSwaps || 0, color: '#ff9800', icon: '🔄' },
  ];

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        📅 نظام إدارة الورديات
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={{ borderTop: `4px solid ${s.color}` }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5">{s.icon}</Typography>
                <Typography variant="h4" fontWeight="bold" color={s.color}>
                  {s.value}
                </Typography>
                <Typography variant="caption">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab icon={<ClockIcon />} label="تعريف الورديات" />
          <Tab icon={<SwapIcon />} label="طلبات التبديل" />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : tab === 0 ? (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
              إنشاء وردية
            </Button>
          </Box>
          <Grid container spacing={2}>
            {definitions.map(d => (
              <Grid item xs={12} md={4} key={d._id}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRight: `5px solid ${shiftTypeColor[d.type] || '#1976d2'}`,
                    height: '100%',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Box sx={{ color: shiftTypeColor[d.type], display: 'flex' }}>
                        {shiftTypeIcon[d.type]}
                      </Box>
                      <Box>
                        <Typography variant="h6">{d.name}</Typography>
                        <Chip label={d.shiftCode} size="small" variant="outlined" />
                      </Box>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          البداية
                        </Typography>
                        <Typography fontWeight="bold">{d.startTime}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          النهاية
                        </Typography>
                        <Typography fontWeight="bold">{d.endTime}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          الراحة
                        </Typography>
                        <Typography>{d.breakDuration} دقيقة</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          السماح
                        </Typography>
                        <Typography>{d.graceMinutes} دقيقة</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          أيام العمل
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {d.workingDays?.map(day => (
                            <Chip
                              key={day}
                              label={day}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          ))}
                        </Box>
                      </Grid>
                      {d.nightShiftAllowance > 0 && (
                        <Grid item xs={12}>
                          <Chip
                            icon={<NightIcon />}
                            label={`بدل ليلي: ${d.nightShiftAllowance}%`}
                            size="small"
                            color="secondary"
                          />
                        </Grid>
                      )}
                    </Grid>
                    <Box
                      sx={{
                        mt: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Chip
                        label={d.type}
                        size="small"
                        sx={{
                          bgcolor: `${shiftTypeColor[d.type]}22`,
                          color: shiftTypeColor[d.type],
                          fontWeight: 'bold',
                        }}
                      />
                      <Chip
                        label={d.isActive ? 'نشط' : 'غير نشط'}
                        size="small"
                        color={d.isActive !== false ? 'success' : 'default'}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {definitions.length === 0 && (
              <Grid item xs={12}>
                <Typography align="center">لا توجد ورديات معرّفة</Typography>
              </Grid>
            )}
          </Grid>
        </>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            طلبات تبديل الورديات
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            لا توجد طلبات تبديل حالياً — يمكن للموظفين تقديم طلبات التبديل من لوحة الخدمة الذاتية
          </Alert>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f3e5f5' }}>
                  <TableCell>رقم الطلب</TableCell>
                  <TableCell>الموظف الطالب</TableCell>
                  <TableCell>الموظف المبادل</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>السبب</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    لا توجد طلبات
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Create Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء وردية جديدة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={8}>
              <TextField
                fullWidth
                label="اسم الوردية"
                required
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="الرمز"
                required
                value={form.shiftCode}
                onChange={e => setForm(p => ({ ...p, shiftCode: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="النوع"
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              >
                {SHIFT_TYPES.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="وقت البداية"
                InputLabelProps={{ shrink: true }}
                value={form.startTime}
                onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="وقت النهاية"
                InputLabelProps={{ shrink: true }}
                value={form.endTime}
                onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="راحة (دقيقة)"
                value={form.breakDuration}
                onChange={e => setForm(p => ({ ...p, breakDuration: e.target.value }))}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="سماح (دقيقة)"
                value={form.graceMinutes}
                onChange={e => setForm(p => ({ ...p, graceMinutes: e.target.value }))}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="بدل ليلي %"
                value={form.nightShiftAllowance}
                onChange={e => setForm(p => ({ ...p, nightShiftAllowance: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!form.name || !form.shiftCode}
          >
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(p => ({ ...p, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(p => ({ ...p, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
