import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';

import {
  fetchBenefitPackages,
  createBenefitPackage,
  fetchEmployeeBenefits,
  assignBenefit,
  adjustBenefitAllowance,
  claimAirTicket,
  fetchBenefitStats,
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
import AdjustIcon from '@mui/icons-material/Adjust';

const statusColors = { نشط: 'success', معلّق: 'warning', منتهي: 'error' };

export default function BenefitsManagement() {
  const [packages, setPackages] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [pkgDialog, setPkgDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [ticketDialog, setTicketDialog] = useState(false);
  const [selected, setSelected] = useState(null);
  const [pkgForm, setPkgForm] = useState({
    name: '',
    packageCode: '',
    grade: '',
    housingPercentage: '',
    transportationFixed: '',
  });
  const [assignForm, setAssignForm] = useState({ employeeId: '', packageId: '' });
  const [adjustForm, setAdjustForm] = useState({
    field: 'housingAmount',
    newValue: '',
    reason: '',
  });
  const [ticketForm, setTicketForm] = useState({ destination: '', travelDate: '', amount: '' });
  const [snack, setSnack] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, bRes, sRes] = await Promise.all([
        fetchBenefitPackages(),
        fetchEmployeeBenefits(),
        fetchBenefitStats(),
      ]);
      setPackages(pRes?.data || pRes || []);
      setBenefits(bRes?.data?.benefits || bRes?.benefits || bRes || []);
      setStats(sRes?.data || sRes || null);
    } catch {
      /* demo */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreatePkg = async () => {
    try {
      await createBenefitPackage(pkgForm);
      setSnack('تم إنشاء الحزمة');
      setPkgDialog(false);
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  const handleAssign = async () => {
    try {
      await assignBenefit(assignForm);
      setSnack('تم تعيين المزايا');
      setAssignDialog(false);
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  const handleAdjust = async () => {
    try {
      await adjustBenefitAllowance(selected._id, adjustForm);
      setSnack('تم تعديل البدل');
      setAdjustDialog(false);
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  const handleTicket = async () => {
    try {
      await claimAirTicket(selected._id, ticketForm);
      setSnack('تم تقديم مطالبة التذكرة');
      setTicketDialog(false);
      load();
    } catch {
      setSnack('حدث خطأ');
    }
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          <BenefitIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> المزايا والبدلات
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<PackageIcon />}
            onClick={() => setPkgDialog(true)}
            sx={{ mr: 1 }}
          >
            حزمة جديدة
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => setAssignDialog(true)}
            sx={{ mr: 1 }}
          >
            تعيين مزايا
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
                  {stats.totalPackages}
                </Typography>
                <Typography textAlign="center" color="text.secondary">
                  حزم المزايا
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'success.light' }}>
              <CardContent>
                <Typography variant="h4" textAlign="center">
                  {stats.totalBenefits}
                </Typography>
                <Typography textAlign="center">موظفين مسجلين</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'info.light' }}>
              <CardContent>
                <Typography variant="h4" textAlign="center">
                  {stats.byStatus?.find(s => s._id === 'نشط')?.count || 0}
                </Typography>
                <Typography textAlign="center">نشط</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card sx={{ bgcolor: 'warning.light' }}>
              <CardContent>
                <Typography variant="h4" textAlign="center">
                  {stats.totalMonthlyAllowances?.toLocaleString()} ر.س
                </Typography>
                <Typography textAlign="center">إجمالي البدلات الشهرية</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="حزم المزايا" />
        <Tab label="مزايا الموظفين" />
      </Tabs>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {tab === 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>رمز الحزمة</TableCell>
                <TableCell>الاسم</TableCell>
                <TableCell>الدرجة</TableCell>
                <TableCell>بدل سكن %</TableCell>
                <TableCell>بدل نقل</TableCell>
                <TableCell>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(Array.isArray(packages) ? packages : []).map(p => (
                <TableRow key={p._id}>
                  <TableCell>{p.packageCode}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.grade}</TableCell>
                  <TableCell>{p.allowances?.housingPercentage}%</TableCell>
                  <TableCell>{p.allowances?.transportationFixed?.toLocaleString()} ر.س</TableCell>
                  <TableCell>
                    <Chip
                      label={p.isActive ? 'نشط' : 'غير نشط'}
                      size="small"
                      color={p.isActive ? 'success' : 'default'}
                    />
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
                <TableCell>رقم المزايا</TableCell>
                <TableCell>الموظف</TableCell>
                <TableCell>الحزمة</TableCell>
                <TableCell>إجمالي البدلات</TableCell>
                <TableCell>GOSI موظف</TableCell>
                <TableCell>GOSI صاحب عمل</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(Array.isArray(benefits) ? benefits : []).map(b => (
                <TableRow key={b._id}>
                  <TableCell>{b.benefitNumber}</TableCell>
                  <TableCell>
                    {b.employeeId?.firstName} {b.employeeId?.lastName}
                  </TableCell>
                  <TableCell>{b.packageId?.name || b.packageId?.packageCode}</TableCell>
                  <TableCell>
                    {b.allowances?.totalMonthlyAllowances?.toLocaleString()} ر.س
                  </TableCell>
                  <TableCell>{b.gosi?.employeeContribution?.toLocaleString()} ر.س</TableCell>
                  <TableCell>{b.gosi?.employerContribution?.toLocaleString()} ر.س</TableCell>
                  <TableCell>
                    <Chip
                      label={b.status}
                      size="small"
                      color={statusColors[b.status] || 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="تعديل بدل">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => {
                          setSelected(b);
                          setAdjustDialog(true);
                        }}
                      >
                        <AdjustIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="مطالبة تذكرة">
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => {
                          setSelected(b);
                          setTicketDialog(true);
                        }}
                      >
                        <TicketIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Package dialog */}
      <Dialog open={pkgDialog} onClose={() => setPkgDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>حزمة مزايا جديدة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="اسم الحزمة"
                value={pkgForm.name}
                onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="رمز الحزمة"
                value={pkgForm.packageCode}
                onChange={e => setPkgForm(f => ({ ...f, packageCode: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="الدرجة"
                value={pkgForm.grade}
                onChange={e => setPkgForm(f => ({ ...f, grade: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="بدل سكن %"
                value={pkgForm.housingPercentage}
                onChange={e => setPkgForm(f => ({ ...f, housingPercentage: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="بدل نقل"
                value={pkgForm.transportationFixed}
                onChange={e => setPkgForm(f => ({ ...f, transportationFixed: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPkgDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreatePkg}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={assignDialog} onClose={() => setAssignDialog(false)}>
        <DialogTitle>تعيين مزايا لموظف</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="رقم الموظف"
            value={assignForm.employeeId}
            onChange={e => setAssignForm(f => ({ ...f, employeeId: e.target.value }))}
            sx={{ mt: 2 }}
          />
          <TextField
            select
            fullWidth
            label="الحزمة"
            value={assignForm.packageId}
            onChange={e => setAssignForm(f => ({ ...f, packageId: e.target.value }))}
            sx={{ mt: 2 }}
          >
            {(Array.isArray(packages) ? packages : []).map(p => (
              <MenuItem key={p._id} value={p._id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleAssign}>
            تعيين
          </Button>
        </DialogActions>
      </Dialog>

      {/* Adjust dialog */}
      <Dialog open={adjustDialog} onClose={() => setAdjustDialog(false)}>
        <DialogTitle>تعديل بدل</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="البدل"
            value={adjustForm.field}
            onChange={e => setAdjustForm(f => ({ ...f, field: e.target.value }))}
            sx={{ mt: 2 }}
          >
            {[
              'housingAmount',
              'transportationAmount',
              'phoneAllowance',
              'foodAllowance',
              'natureOfWorkAllowance',
            ].map(f => (
              <MenuItem key={f} value={f}>
                {f}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            type="number"
            label="القيمة الجديدة"
            value={adjustForm.newValue}
            onChange={e => setAdjustForm(f => ({ ...f, newValue: e.target.value }))}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="السبب"
            value={adjustForm.reason}
            onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleAdjust}>
            تعديل
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ticket claim dialog */}
      <Dialog open={ticketDialog} onClose={() => setTicketDialog(false)}>
        <DialogTitle>مطالبة تذكرة سفر</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="الوجهة"
            value={ticketForm.destination}
            onChange={e => setTicketForm(f => ({ ...f, destination: e.target.value }))}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            type="date"
            label="تاريخ السفر"
            InputLabelProps={{ shrink: true }}
            value={ticketForm.travelDate}
            onChange={e => setTicketForm(f => ({ ...f, travelDate: e.target.value }))}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            type="number"
            label="المبلغ"
            value={ticketForm.amount}
            onChange={e => setTicketForm(f => ({ ...f, amount: e.target.value }))}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTicketDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleTicket}>
            تقديم
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
