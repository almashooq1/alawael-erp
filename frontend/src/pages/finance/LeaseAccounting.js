/* eslint-disable no-console */
import { useState, useEffect, useCallback } from 'react';
import { getToken } from '../../utils/tokenStorage';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Grid,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import {
  HomeWork,
  Refresh,
  Add,
  Calculate,
  TrendingDown,
  AccountBalance,
  DateRange,
  Warning,
} from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';
const fmt = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v || 0);

const statusMap = {
  draft: { label: 'مسودة', color: '#9E9E9E' },
  active: { label: 'نشط', color: '#4CAF50' },
  modified: { label: 'معدّل', color: '#FF9800' },
  terminated: { label: 'منتهي', color: '#F44336' },
  expired: { label: 'منتهي الصلاحية', color: '#795548' },
};
const categoryMap = {
  building: 'مبنى',
  vehicle: 'مركبة',
  equipment: 'معدات',
  land: 'أرض',
  office_space: 'مكتب',
  warehouse: 'مستودع',
  it_equipment: 'أجهزة تقنية',
};

const LeaseAccounting = () => {
  const [tab, setTab] = useState(0);
  const [leases, setLeases] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    lesseeName: '',
    lessorName: '',
    assetCategory: 'building',
    assetDescription: '',
    startDate: '',
    endDate: '',
    monthlyPayment: '',
    incrementalBorrowingRate: '5',
  });

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [lRes, sRes] = await Promise.all([
        fetch(`${API}/finance/ultimate/leases`, { headers }),
        fetch(`${API}/finance/ultimate/leases/summary/dashboard`, { headers }),
      ]);
      const lData = await lRes.json();
      const sData = await sRes.json();
      if (lData.success) setLeases(lData.data);
      if (sData.success) setSummary(sData.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  const handleCreate = async () => {
    try {
      const payload = {
        ...form,
        monthlyPayment: parseFloat(form.monthlyPayment),
        incrementalBorrowingRate: parseFloat(form.incrementalBorrowingRate),
        paymentSchedule: [{ amount: parseFloat(form.monthlyPayment), frequency: 'monthly' }],
      };
      const res = await fetch(`${API}/finance/ultimate/leases`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setDialogOpen(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCalculateROU = async id => {
    try {
      await fetch(`${API}/finance/ultimate/leases/${id}/calculate-rou`, {
        method: 'POST',
        headers,
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDetail = async id => {
    try {
      const res = await fetch(`${API}/finance/ultimate/leases/${id}`, { headers });
      const data = await res.json();
      if (data.success) {
        setSelected(data.data);
        setDetailDialog(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );

  const expiring = leases.filter(l => {
    if (!l.endDate) return false;
    const diff = (new Date(l.endDate) - new Date()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 90;
  });

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700} color={neutralColors.textPrimary}>
          <HomeWork sx={{ mr: 1, verticalAlign: 'middle' }} />
          محاسبة الإيجارات - IFRS 16
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchData}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
            sx={{ bgcolor: brandColors.primary, '&:hover': { bgcolor: brandColors.primaryDark } }}
          >
            عقد إيجار جديد
          </Button>
        </Box>
      </Box>

      {expiring.length > 0 && (
        <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
          <strong>{expiring.length} عقود تنتهي خلال 90 يوماً</strong> — يرجى مراجعة خيارات التجديد
        </Alert>
      )}

      {summary && (
        <Grid container spacing={2} mb={3}>
          {[
            {
              label: 'إجمالي العقود',
              value: summary.totalLeases,
              color: '#2196F3',
              icon: <HomeWork />,
            },
            { label: 'عقود نشطة', value: summary.active, color: '#4CAF50', icon: <DateRange /> },
            {
              label: 'أصول حق الاستخدام',
              value: fmt(summary.totalROUAssets),
              color: '#FF9800',
              icon: <AccountBalance />,
            },
            {
              label: 'التزام الإيجار',
              value: fmt(summary.totalLeaseLiability),
              color: '#F44336',
              icon: <TrendingDown />,
            },
            {
              label: 'مصروف الإهلاك',
              value: fmt(summary.totalDepreciation),
              color: '#9C27B0',
              icon: <Calculate />,
            },
            { label: 'تنتهي قريباً', value: expiring.length, color: '#FF5722', icon: <Warning /> },
          ].map((s, i) => (
            <Grid item xs={6} md={2} key={i}>
              <Card sx={{ bgcolor: surfaceColors.card, border: `2px solid ${s.color}20` }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Box sx={{ color: s.color, mb: 0.5 }}>{s.icon}</Box>
                  <Typography variant="h5" fontWeight={700} color={s.color}>
                    {s.value}
                  </Typography>
                  <Typography variant="caption" color={neutralColors.textSecondary}>
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="عقود الإيجار" icon={<HomeWork />} iconPosition="start" />
        <Tab label="جدول الإهلاك" icon={<Calculate />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                  {[
                    'رقم العقد',
                    'المستأجر',
                    'نوع الأصل',
                    'وصف الأصل',
                    'الدفعة الشهرية',
                    'أصل حق الاستخدام',
                    'التزام الإيجار',
                    'الحالة',
                    'إجراءات',
                  ].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {leases.map(l => {
                  const st = statusMap[l.status] || statusMap.draft;
                  return (
                    <TableRow
                      key={l._id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => fetchDetail(l._id)}
                    >
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {l.leaseNumber}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{l.lesseeName}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {categoryMap[l.assetCategory] || l.assetCategory}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{l.assetDescription}</TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {fmt(l.paymentSchedule?.[0]?.amount)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', color: '#FF9800', fontWeight: 600 }}>
                        {fmt(l.rouAsset?.initialValue)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', color: '#F44336', fontWeight: 600 }}>
                        {fmt(l.leaseLiability?.initialValue)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={st.label}
                          size="small"
                          sx={{ bgcolor: `${st.color}20`, color: st.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <Tooltip title="حساب أصل حق الاستخدام">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleCalculateROU(l._id)}
                          >
                            <Calculate fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {leases.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد عقود إيجار
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {tab === 1 && selected && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>
              جدول الإهلاك - {selected.leaseNumber}
            </Typography>
            <Grid container spacing={2} mb={2}>
              <Grid item xs={4}>
                <Card sx={{ bgcolor: '#FF980010', p: 2, textAlign: 'center' }}>
                  <Typography variant="h6" color="#FF9800" fontWeight={700}>
                    {fmt(selected.rouAsset?.initialValue)}
                  </Typography>
                  <Typography variant="caption">أصل حق الاستخدام (أولي)</Typography>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card sx={{ bgcolor: '#9C27B010', p: 2, textAlign: 'center' }}>
                  <Typography variant="h6" color="#9C27B0" fontWeight={700}>
                    {fmt(selected.rouAsset?.accumulatedDepreciation)}
                  </Typography>
                  <Typography variant="caption">الإهلاك المتراكم</Typography>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card sx={{ bgcolor: '#4CAF5010', p: 2, textAlign: 'center' }}>
                  <Typography variant="h6" color="#4CAF50" fontWeight={700}>
                    {fmt(selected.rouAsset?.carryingAmount)}
                  </Typography>
                  <Typography variant="caption">القيمة الدفترية</Typography>
                </Card>
              </Grid>
            </Grid>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              جدول سداد الالتزام:
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['الفترة', 'الدفعة', 'الفائدة', 'أصل الالتزام', 'الرصيد المتبقي'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {(selected.amortizationSchedule || []).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ textAlign: 'right' }}>{row.period}</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>{fmt(row.payment)}</TableCell>
                    <TableCell sx={{ textAlign: 'right', color: '#F44336' }}>
                      {fmt(row.interest)}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', color: '#4CAF50' }}>
                      {fmt(row.principal)}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                      {fmt(row.balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>عقد إيجار جديد - IFRS 16</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="اسم المستأجر"
              value={form.lesseeName}
              onChange={e => setForm({ ...form, lesseeName: e.target.value })}
              fullWidth
            />
            <TextField
              label="اسم المؤجر"
              value={form.lessorName}
              onChange={e => setForm({ ...form, lessorName: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="نوع الأصل"
              value={form.assetCategory}
              onChange={e => setForm({ ...form, assetCategory: e.target.value })}
              fullWidth
            >
              {Object.entries(categoryMap).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="وصف الأصل"
              value={form.assetDescription}
              onChange={e => setForm({ ...form, assetDescription: e.target.value })}
              fullWidth
            />
            <TextField
              label="تاريخ البدء"
              type="date"
              value={form.startDate}
              onChange={e => setForm({ ...form, startDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="تاريخ الانتهاء"
              type="date"
              value={form.endDate}
              onChange={e => setForm({ ...form, endDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="الدفعة الشهرية (ر.س)"
              type="number"
              value={form.monthlyPayment}
              onChange={e => setForm({ ...form, monthlyPayment: e.target.value })}
              fullWidth
            />
            <TextField
              label="معدل الاقتراض الإضافي (%)"
              type="number"
              value={form.incrementalBorrowingRate}
              onChange={e => setForm({ ...form, incrementalBorrowingRate: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} sx={{ bgcolor: brandColors.primary }}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          تفاصيل عقد الإيجار - {selected?.leaseNumber}
        </DialogTitle>
        <DialogContent>
          {selected && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography>
                  <strong>المستأجر:</strong> {selected.lesseeName}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>المؤجر:</strong> {selected.lessorName}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>نوع الأصل:</strong> {categoryMap[selected.assetCategory]}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>معدل الاقتراض:</strong> {selected.incrementalBorrowingRate}%
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>أصل حق الاستخدام:</strong>{' '}
                  <span style={{ color: '#FF9800', fontWeight: 700 }}>
                    {fmt(selected.rouAsset?.initialValue)}
                  </span>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>التزام الإيجار:</strong>{' '}
                  <span style={{ color: '#F44336', fontWeight: 700 }}>
                    {fmt(selected.leaseLiability?.initialValue)}
                  </span>
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={600} mt={1}>
                  تفاصيل الأصل:
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2">
                  القيمة الأولية: {fmt(selected.rouAsset?.initialValue)}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2">
                  الإهلاك المتراكم: {fmt(selected.rouAsset?.accumulatedDepreciation)}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2">
                  القيمة الدفترية: {fmt(selected.rouAsset?.carryingAmount)}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LeaseAccounting;
