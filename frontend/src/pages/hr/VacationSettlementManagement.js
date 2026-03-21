import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';


import {
  fetchSettlements,
  createSettlement,
  approveSettlement,
  disburseSettlement,
  fetchSettlementStats,
} from '../../services/hr/employeeAffairsPhase3Service';

const statusColors = {
  مسودة: 'default',
  'قيد المراجعة': 'info',
  'معتمدة من المدير': 'warning',
  'معتمدة من المالية': 'primary',
  صرفت: 'success',
  مرفوضة: 'error',
  ملغية: 'error',
};
const settlementTypes = [
  'تسوية جزئية',
  'تسوية سنوية',
  'نهاية خدمة',
  'استقالة',
  'إنهاء عقد',
  'تعويض إجازة',
];

export default function VacationSettlementManagement() {
  const [settlements, setSettlements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [approveDialog, setApproveDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filter, setFilter] = useState({ status: '', type: '' });
  const [form, setForm] = useState({
    employeeId: '',
    type: 'تسوية سنوية',
    settlementDays: '',
    settlementYear: new Date().getFullYear(),
    basicSalary: '',
    housingAllowance: '',
    transportAllowance: '',
  });
  const [approveForm, setApproveForm] = useState({ role: 'manager', approved: true, notes: '' });
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, stRes] = await Promise.all([fetchSettlements(filter), fetchSettlementStats()]);
      setSettlements(sRes?.data?.settlements || sRes?.settlements || sRes || []);
      setStats(stRes?.data || stRes || null);
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
      await createSettlement(form);
      setSnack('تم إنشاء التسوية بنجاح');
      setOpenDialog(false);
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  const handleApprove = async () => {
    try {
      await approveSettlement(selectedItem._id, approveForm);
      setSnack('تم تحديث حالة الموافقة');
      setApproveDialog(false);
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  const handleDisburse = async item => {
    try {
      await disburseSettlement(item._id, { method: 'تحويل بنكي' });
      setSnack('تم صرف التسوية');
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          <VacIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> تسوية الإجازات
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{ mr: 1 }}
          >
            تسوية جديدة
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
                  إجمالي التسويات
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'success.light' }}>
              <CardContent>
                <Typography variant="h4" textAlign="center">
                  {stats.byStatus?.find(s => s._id === 'صرفت')?.count || 0}
                </Typography>
                <Typography textAlign="center">تم صرفها</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'info.light' }}>
              <CardContent>
                <Typography variant="h4" textAlign="center">
                  {stats.byStatus?.find(s => s._id === 'قيد المراجعة')?.count || 0}
                </Typography>
                <Typography textAlign="center">قيد المراجعة</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'warning.light' }}>
              <CardContent>
                <Typography variant="h4" textAlign="center">
                  {stats.totalDisbursed?.toLocaleString()} ر.س
                </Typography>
                <Typography textAlign="center">إجمالي المصروف</Typography>
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
          label="النوع"
          value={filter.type}
          onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">الكل</MenuItem>
          {settlementTypes.map(t => (
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
              <TableCell>رقم التسوية</TableCell>
              <TableCell>الموظف</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الأيام</TableCell>
              <TableCell>المبلغ الصافي</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(Array.isArray(settlements) ? settlements : []).map(s => (
              <TableRow key={s._id}>
                <TableCell>{s.settlementNumber}</TableCell>
                <TableCell>
                  {s.employeeId?.firstName} {s.employeeId?.lastName}
                </TableCell>
                <TableCell>{s.type}</TableCell>
                <TableCell>{s.settlementDays}</TableCell>
                <TableCell>{s.calculation?.netAmount?.toLocaleString()} ر.س</TableCell>
                <TableCell>
                  <Chip label={s.status} size="small" color={statusColors[s.status] || 'default'} />
                </TableCell>
                <TableCell>
                  <Tooltip title="موافقة">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => {
                        setSelectedItem(s);
                        setApproveDialog(true);
                      }}
                    >
                      <ApproveIcon />
                    </IconButton>
                  </Tooltip>
                  {s.status === 'معتمدة من المالية' && (
                    <Tooltip title="صرف">
                      <IconButton size="small" color="success" onClick={() => handleDisburse(s)}>
                        <PayIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>تسوية إجازة جديدة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="رقم الموظف"
                value={form.employeeId}
                onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="النوع"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                {settlementTypes.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="عدد أيام التسوية"
                value={form.settlementDays}
                onChange={e => setForm(f => ({ ...f, settlementDays: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="الراتب الأساسي"
                value={form.basicSalary}
                onChange={e => setForm(f => ({ ...f, basicSalary: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="بدل السكن"
                value={form.housingAllowance}
                onChange={e => setForm(f => ({ ...f, housingAllowance: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={approveDialog} onClose={() => setApproveDialog(false)}>
        <DialogTitle>موافقة على التسوية</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="الدور"
            value={approveForm.role}
            onChange={e => setApproveForm(f => ({ ...f, role: e.target.value }))}
            sx={{ mt: 2 }}
          >
            <MenuItem value="manager">المدير</MenuItem>
            <MenuItem value="finance">المالية</MenuItem>
          </TextField>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="ملاحظات"
            value={approveForm.notes}
            onChange={e => setApproveForm(f => ({ ...f, notes: e.target.value }))}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setApproveForm(f => ({ ...f, approved: false }));
              handleApprove();
            }}
          >
            رفض
          </Button>
          <Button variant="contained" color="success" onClick={handleApprove}>
            موافقة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
