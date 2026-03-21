import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';

import {
  fetchContracts,
  createContract,
  renewContract,
  terminateContract,
  fetchExpiringContracts,
  fetchContractStats,
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
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import CancelIcon from '@mui/icons-material/Cancel';

const statusColors = {
  مسودة: 'default',
  ساري: 'success',
  'قيد التجديد': 'warning',
  منتهي: 'error',
  ملغي: 'error',
  معلّق: 'info',
};
const contractTypes = ['دوام كامل', 'دوام جزئي', 'مؤقت', 'موسمي', 'تدريب', 'استشاري', 'عن بعد'];

export default function ContractManagement() {
  const [contracts, setContracts] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [renewDialog, setRenewDialog] = useState(false);
  const [terminateDialog, setTerminateDialog] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [filter, setFilter] = useState({ status: '', contractType: '' });
  const [form, setForm] = useState({
    employeeId: '',
    contractType: 'دوام كامل',
    startDate: '',
    endDate: '',
    basicSalary: '',
    housingAllowance: '',
    transportAllowance: '',
    probationDuration: 90,
  });
  const [renewForm, setRenewForm] = useState({ newEndDate: '', notes: '' });
  const [terminateForm, setTerminateForm] = useState({ reason: '', lastWorkingDay: '' });
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, eRes, sRes] = await Promise.all([
        fetchContracts(filter),
        fetchExpiringContracts(),
        fetchContractStats(),
      ]);
      setContracts(cRes?.data?.contracts || cRes?.contracts || cRes || []);
      setExpiring(eRes?.data || eRes || []);
      setStats(sRes?.data || sRes || null);
    } catch {
      /* demo fallback */
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    try {
      await createContract(form);
      setSnack('تم إنشاء العقد بنجاح');
      setOpenDialog(false);
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  const handleRenew = async () => {
    try {
      await renewContract(selectedContract._id, renewForm);
      setSnack('تم تجديد العقد بنجاح');
      setRenewDialog(false);
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  const handleTerminate = async () => {
    try {
      await terminateContract(selectedContract._id, terminateForm);
      setSnack('تم إنهاء العقد');
      setTerminateDialog(false);
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          <ContractIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> إدارة العقود
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{ mr: 1 }}
          >
            عقد جديد
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

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h4" textAlign="center">
                  {stats.total}
                </Typography>
                <Typography textAlign="center" color="text.secondary">
                  إجمالي العقود
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'success.light' }}>
              <CardContent>
                <Typography variant="h4" textAlign="center">
                  {stats.byStatus?.find(s => s._id === 'ساري')?.count || 0}
                </Typography>
                <Typography textAlign="center">عقود سارية</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'warning.light' }}>
              <CardContent>
                <Typography variant="h4" textAlign="center">
                  {stats.expiringSoon}
                </Typography>
                <Typography textAlign="center">تنتهي قريباً</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'error.light' }}>
              <CardContent>
                <Typography variant="h4" textAlign="center">
                  {stats.byStatus?.find(s => s._id === 'منتهي')?.count || 0}
                </Typography>
                <Typography textAlign="center">منتهية</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="جميع العقود" />
        <Tab label={`تنتهي قريباً (${expiring.length})`} />
      </Tabs>

      {/* Filters */}
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
          label="نوع العقد"
          value={filter.contractType}
          onChange={e => setFilter(f => ({ ...f, contractType: e.target.value }))}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">الكل</MenuItem>
          {contractTypes.map(t => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {tab === 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>رقم العقد</TableCell>
                <TableCell>الموظف</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>تاريخ البداية</TableCell>
                <TableCell>تاريخ النهاية</TableCell>
                <TableCell>الراتب</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(Array.isArray(contracts) ? contracts : []).map(c => (
                <TableRow key={c._id}>
                  <TableCell>{c.contractNumber}</TableCell>
                  <TableCell>
                    {c.employeeId?.firstName} {c.employeeId?.lastName}
                  </TableCell>
                  <TableCell>{c.contractType}</TableCell>
                  <TableCell>
                    {c.startDate ? new Date(c.startDate).toLocaleDateString('ar-SA') : '-'}
                  </TableCell>
                  <TableCell>
                    {c.endDate ? new Date(c.endDate).toLocaleDateString('ar-SA') : 'مفتوح'}
                  </TableCell>
                  <TableCell>{c.basicSalary?.toLocaleString()} ر.س</TableCell>
                  <TableCell>
                    <Chip
                      label={c.status}
                      size="small"
                      color={statusColors[c.status] || 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="تجديد">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => {
                          setSelectedContract(c);
                          setRenewDialog(true);
                        }}
                      >
                        <RenewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="إنهاء">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setSelectedContract(c);
                          setTerminateDialog(true);
                        }}
                      >
                        <CancelIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 1 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>رقم العقد</TableCell>
                <TableCell>الموظف</TableCell>
                <TableCell>تاريخ الانتهاء</TableCell>
                <TableCell>الأيام المتبقية</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(Array.isArray(expiring) ? expiring : []).map(c => {
                const days = Math.ceil((new Date(c.endDate) - Date.now()) / 86400000);
                return (
                  <TableRow key={c._id}>
                    <TableCell>{c.contractNumber}</TableCell>
                    <TableCell>
                      {c.employeeId?.firstName} {c.employeeId?.lastName}
                    </TableCell>
                    <TableCell>{new Date(c.endDate).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${days} يوم`}
                        color={days < 30 ? 'error' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>إنشاء عقد جديد</DialogTitle>
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
                label="نوع العقد"
                value={form.contractType}
                onChange={e => setForm(f => ({ ...f, contractType: e.target.value }))}
              >
                {contractTypes.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ البداية"
                InputLabelProps={{ shrink: true }}
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ النهاية"
                InputLabelProps={{ shrink: true }}
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
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
                label="بدل سكن"
                value={form.housingAllowance}
                onChange={e => setForm(f => ({ ...f, housingAllowance: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="بدل نقل"
                value={form.transportAllowance}
                onChange={e => setForm(f => ({ ...f, transportAllowance: e.target.value }))}
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

      {/* Renew Dialog */}
      <Dialog open={renewDialog} onClose={() => setRenewDialog(false)}>
        <DialogTitle>تجديد العقد</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="date"
            label="تاريخ النهاية الجديد"
            InputLabelProps={{ shrink: true }}
            value={renewForm.newEndDate}
            onChange={e => setRenewForm(f => ({ ...f, newEndDate: e.target.value }))}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="ملاحظات"
            value={renewForm.notes}
            onChange={e => setRenewForm(f => ({ ...f, notes: e.target.value }))}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenewDialog(false)}>إلغاء</Button>
          <Button variant="contained" color="primary" onClick={handleRenew}>
            تجديد
          </Button>
        </DialogActions>
      </Dialog>

      {/* Terminate Dialog */}
      <Dialog open={terminateDialog} onClose={() => setTerminateDialog(false)}>
        <DialogTitle>إنهاء العقد</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="سبب الإنهاء"
            value={terminateForm.reason}
            onChange={e => setTerminateForm(f => ({ ...f, reason: e.target.value }))}
            sx={{ mt: 2 }}
          >
            {['استقالة', 'انتهاء العقد', 'فصل مادة 80', 'إنهاء بالتراضي', 'تقاعد'].map(r => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            type="date"
            label="آخر يوم عمل"
            InputLabelProps={{ shrink: true }}
            value={terminateForm.lastWorkingDay}
            onChange={e => setTerminateForm(f => ({ ...f, lastWorkingDay: e.target.value }))}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTerminateDialog(false)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleTerminate}>
            إنهاء العقد
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
