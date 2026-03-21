import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';

import {
  fetchClearances,
  initiateClearance,
  updateClearanceItem,
  calculateFinalSettlement,
  conductExitInterview,
  fetchClearanceStats,
} from '../../services/hr/employeeAffairsPhase3Service';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearIcon from '@mui/icons-material/Clear';

const statusColors = {
  بُدء: 'info',
  'قيد المعالجة': 'warning',
  'مكتمل جزئياً': 'primary',
  مكتمل: 'success',
  ملغي: 'error',
};
const itemStatusColors = {
  معلّق: 'default',
  'قيد الإجراء': 'warning',
  مُخلى: 'success',
  استثناء: 'info',
};
const departureTypes = ['استقالة', 'انتهاء عقد', 'فصل', 'تقاعد', 'وفاة', 'نقل', 'إنهاء فترة تجربة'];

export default function EmployeeClearanceManagement() {
  const [clearances, setClearances] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [settlementDialog, setSettlementDialog] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({ status: '', departureType: '' });
  const [form, setForm] = useState({
    employeeId: '',
    departureType: 'استقالة',
    lastWorkingDay: '',
    notes: '',
  });
  const [settlementForm, setSettlementForm] = useState({
    basicSalary: '',
    unpaidLeave: '',
    endOfService: '',
    otherEarnings: '',
    loanDeductions: '',
    otherDeductions: '',
  });
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([fetchClearances(filter), fetchClearanceStats()]);
      setClearances(cRes?.data?.clearances || cRes?.clearances || cRes || []);
      setStats(sRes?.data || sRes || null);
    } catch {
      /* demo */
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    try {
      await initiateClearance(form);
      setSnack('تم بدء إخلاء الطرف');
      setOpenDialog(false);
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  const handleClearItem = async (clearanceId, itemId) => {
    try {
      await updateClearanceItem(clearanceId, itemId, { status: 'مُخلى' });
      setSnack('تم إخلاء القسم');
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  const handleSettlement = async () => {
    try {
      await calculateFinalSettlement(selected._id, settlementForm);
      setSnack('تم حساب التسوية النهائية');
      setSettlementDialog(false);
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  const handleExitInterview = async clr => {
    try {
      await conductExitInterview(clr._id, {
        overallRating: 4,
        wouldReturn: true,
        feedback: 'بيئة عمل جيدة',
      });
      setSnack('تم إجراء مقابلة الخروج');
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          <ClearanceIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> إخلاء الطرف
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{ mr: 1 }}
          >
            بدء إخلاء طرف
          </Button>
          <IconButton onClick={load}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {snack && (
        <Alert severity="success" onClose={() => setSnack('')} sx={{ mb: 2 }}>
          {snack}
        </Alert>
      )}

      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" textAlign="center">
                  {stats.total}
                </Typography>
                <Typography textAlign="center" color="text.secondary">
                  إجمالي الطلبات
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'success.light' }}>
              <CardContent>
                <Typography variant="h4" textAlign="center">
                  {stats.byStatus?.find(s => s._id === 'مكتمل')?.count || 0}
                </Typography>
                <Typography textAlign="center">مكتملة</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'warning.light' }}>
              <CardContent>
                <Typography variant="h4" textAlign="center">
                  {stats.byStatus?.find(s => s._id === 'قيد المعالجة')?.count || 0}
                </Typography>
                <Typography textAlign="center">قيد المعالجة</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'info.light' }}>
              <CardContent>
                <Typography variant="h4" textAlign="center">
                  {stats.avgProgress}%
                </Typography>
                <Typography textAlign="center">متوسط التقدم</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          select
          size="small"
          label="الحالة"
          value={filter.status}
          onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">الكل</MenuItem>
          {Object.keys(statusColors).map(s => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="نوع المغادرة"
          value={filter.departureType}
          onChange={e => setFilter(f => ({ ...f, departureType: e.target.value }))}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">الكل</MenuItem>
          {departureTypes.map(t => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>رقم الإخلاء</TableCell>
              <TableCell>الموظف</TableCell>
              <TableCell>نوع المغادرة</TableCell>
              <TableCell>آخر يوم عمل</TableCell>
              <TableCell>التقدم</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(Array.isArray(clearances) ? clearances : []).map(c => (
              <TableRow key={c._id}>
                <TableCell>{c.clearanceNumber}</TableCell>
                <TableCell>
                  {c.employeeId?.firstName} {c.employeeId?.lastName}
                </TableCell>
                <TableCell>{c.departureType}</TableCell>
                <TableCell>
                  {c.lastWorkingDay ? new Date(c.lastWorkingDay).toLocaleDateString('ar-SA') : '-'}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={c.overallProgress || 0}
                      sx={{ width: 80, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption">{c.overallProgress || 0}%</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={c.status} size="small" color={statusColors[c.status] || 'default'} />
                </TableCell>
                <TableCell>
                  <Tooltip title="تفاصيل الأقسام">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => {
                        setSelected(c);
                        setDetailDialog(true);
                      }}
                    >
                      <ClearIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="التسوية النهائية">
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => {
                        setSelected(c);
                        setSettlementDialog(true);
                      }}
                    >
                      <SettlementIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="مقابلة خروج">
                    <IconButton size="small" color="info" onClick={() => handleExitInterview(c)}>
                      <InterviewIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>بدء إخلاء طرف</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="رقم الموظف"
                value={form.employeeId}
                onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="نوع المغادرة"
                value={form.departureType}
                onChange={e => setForm(f => ({ ...f, departureType: e.target.value }))}
              >
                {departureTypes.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="آخر يوم عمل"
                InputLabelProps={{ shrink: true }}
                value={form.lastWorkingDay}
                onChange={e => setForm(f => ({ ...f, lastWorkingDay: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate}>
            بدء
          </Button>
        </DialogActions>
      </Dialog>

      {/* Department items dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>أقسام إخلاء الطرف — {selected?.clearanceNumber}</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>القسم</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>تاريخ الإخلاء</TableCell>
                <TableCell>إجراء</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(selected?.items || []).map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{item.department || item.label}</TableCell>
                  <TableCell>
                    <Chip
                      label={item.status}
                      size="small"
                      color={itemStatusColors[item.status] || 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {item.clearedDate
                      ? new Date(item.clearedDate).toLocaleDateString('ar-SA')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {item.status !== 'مُخلى' && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        onClick={() => handleClearItem(selected._id, item._id)}
                      >
                        إخلاء
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Settlement dialog */}
      <Dialog
        open={settlementDialog}
        onClose={() => setSettlementDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>التسوية النهائية</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="الراتب الأساسي"
                value={settlementForm.basicSalary}
                onChange={e => setSettlementForm(f => ({ ...f, basicSalary: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="إجازات غير مدفوعة"
                value={settlementForm.unpaidLeave}
                onChange={e => setSettlementForm(f => ({ ...f, unpaidLeave: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="مكافأة نهاية خدمة"
                value={settlementForm.endOfService}
                onChange={e => setSettlementForm(f => ({ ...f, endOfService: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="خصم سلف"
                value={settlementForm.loanDeductions}
                onChange={e => setSettlementForm(f => ({ ...f, loanDeductions: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettlementDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSettlement}>
            حساب التسوية
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
