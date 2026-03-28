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
  Grid,
  Tabs,
  Tab,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  MoneyOff,
  Refresh,
  Add,
  Warning,
  CheckCircle,
  Timeline,
  AccountBalance,
} from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';
const fmt = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v || 0);

const typeMap = {
  term_loan: 'قرض لأجل',
  revolving_facility: 'تسهيل متجدد',
  bond: 'سند',
  sukuk: 'صكوك',
  murabaha: 'مرابحة',
  overdraft: 'سحب على المكشوف',
  trade_finance: 'تمويل تجاري',
  lease_finance: 'تمويل إيجاري',
  bilateral_loan: 'قرض ثنائي',
  syndicated_loan: 'قرض مشترك',
  commercial_paper: 'أوراق تجارية',
};

const statusMap = {
  proposed: { label: 'مقترح', color: '#9E9E9E' },
  negotiating: { label: 'قيد التفاوض', color: '#FF9800' },
  approved: { label: 'معتمد', color: '#2196F3' },
  active: { label: 'نشط', color: '#4CAF50' },
  fully_drawn: { label: 'مسحوب بالكامل', color: '#795548' },
  repaying: { label: 'قيد السداد', color: '#8BC34A' },
  matured: { label: 'مستحق', color: '#607D8B' },
  defaulted: { label: 'متعثر', color: '#D32F2F' },
  refinanced: { label: 'أعيد تمويله', color: '#9C27B0' },
  cancelled: { label: 'ملغي', color: '#F44336' },
};

const DebtManagement = () => {
  const [tab, setTab] = useState(0);
  const [instruments, setInstruments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({
    name: '',
    instrumentType: 'term_loan',
    'facility.facilityAmount': 0,
    'facility.currency': 'SAR',
    'lender.name': '',
  });

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchInstruments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/finance/elite/debt`, { headers });
      const json = await res.json();
      if (json.success) setInstruments(json.data);
    } catch (e) {
      setError('خطأ في تحميل أدوات الدين');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API}/finance/elite/debt/dashboard/summary`, { headers });
      const json = await res.json();
      if (json.success) setSummary(json.data);
    } catch (e) {
      /* silent */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchInstruments();
    fetchSummary();
  }, [fetchInstruments, fetchSummary]);

  const handleCreate = async () => {
    try {
      const payload = {
        name: form.name,
        instrumentType: form.instrumentType,
        facility: {
          facilityAmount: Number(form['facility.facilityAmount']),
          currency: form['facility.currency'],
        },
        lender: { name: form['lender.name'] },
      };
      const res = await fetch(`${API}/finance/elite/debt`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setOpenDialog(false);
        fetchInstruments();
        fetchSummary();
      }
    } catch (e) {
      setError('خطأ في إنشاء أداة الدين');
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${surfaceColors.background} 0%, #f0f4f8 100%)`,
        py: 4,
      }}
    >
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <MoneyOff sx={{ fontSize: 40, color: brandColors.primary }} />
            <Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: neutralColors.textPrimary, textAlign: 'right' }}
              >
                إدارة الديون
              </Typography>
              <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                Debt Management — أدوات الدين، الاستهلاك، التعهدات
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => {
                fetchInstruments();
                fetchSummary();
              }}
            >
              تحديث
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenDialog(true)}
              sx={{ bgcolor: brandColors.primary }}
            >
              أداة دين جديدة
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: `linear-gradient(135deg, ${brandColors.primary} 0%, #1565C0 100%)`,
                color: '#fff',
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <AccountBalance sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {instruments.length}
                </Typography>
                <Typography variant="body2">أدوات الدين</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
                color: '#fff',
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <Timeline sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {fmt(summary?.portfolio?.totalFacility)}
                </Typography>
                <Typography variant="body2">إجمالي التسهيلات</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #FF9800 0%, #E65100 100%)',
                color: '#fff',
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <MoneyOff sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {fmt(summary?.portfolio?.totalDrawn)}
                </Typography>
                <Typography variant="body2">المسحوب</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: `linear-gradient(135deg, ${summary?.covenantBreaches > 0 ? '#D32F2F' : '#4CAF50'} 0%, #333 100%)`,
                color: '#fff',
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                {summary?.covenantBreaches > 0 ? (
                  <Warning sx={{ fontSize: 36, mb: 1 }} />
                ) : (
                  <CheckCircle sx={{ fontSize: 36, mb: 1 }} />
                )}
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {summary?.covenantBreaches || 0}
                </Typography>
                <Typography variant="body2">مخالفات التعهدات</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 600 } }}
        >
          <Tab label="أدوات الدين" />
          <Tab label="حسب النوع" />
        </Tabs>

        {tab === 0 && (
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: surfaceColors.sectionBg }}>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>رقم الأداة</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الاسم</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>المُقرض</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>التسهيل</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>المسحوب</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>الاستخدام</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {instruments.map(inst => {
                    const utilization = inst.facility?.facilityAmount
                      ? (inst.facility.drawnAmount / inst.facility.facilityAmount) * 100
                      : 0;
                    return (
                      <TableRow key={inst._id} hover>
                        <TableCell sx={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          {inst.debtNumber}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                          {inst.name}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          {typeMap[inst.instrumentType] || inst.instrumentType}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          {inst.lender?.name || '-'}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                          {fmt(inst.facility?.facilityAmount)}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          {fmt(inst.facility?.drawnAmount)}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={utilization}
                              sx={{
                                width: 60,
                                height: 8,
                                borderRadius: 4,
                                '& .MuiLinearProgress-bar': {
                                  bgcolor:
                                    utilization > 80
                                      ? '#D32F2F'
                                      : utilization > 50
                                        ? '#FF9800'
                                        : '#4CAF50',
                                },
                              }}
                            />
                            <Typography variant="caption">{Math.round(utilization)}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Chip
                            label={statusMap[inst.status]?.label || inst.status}
                            sx={{ bgcolor: statusMap[inst.status]?.color, color: '#fff' }}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {instruments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                        لا توجد أدوات دين
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {tab === 1 && summary?.byType && (
          <Grid container spacing={2}>
            {summary.byType.map(t => (
              <Grid item xs={12} sm={6} md={4} key={t._id}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'right', mb: 1 }}>
                      {typeMap[t._id] || t._id}
                    </Typography>
                    <Typography
                      variant="h3"
                      sx={{ fontWeight: 700, color: brandColors.primary, textAlign: 'center' }}
                    >
                      {t.count}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="body2">المسحوب: {fmt(t.totalDrawn)}</Typography>
                      <Typography variant="body2">التسهيل: {fmt(t.totalFacility)}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ textAlign: 'right', fontWeight: 700 }}>أداة دين جديدة</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="اسم الأداة"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              fullWidth
              select
              label="النوع"
              value={form.instrumentType}
              onChange={e => setForm({ ...form, instrumentType: e.target.value })}
              sx={{ mb: 2 }}
            >
              {Object.entries(typeMap).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="المُقرض"
              value={form['lender.name']}
              onChange={e => setForm({ ...form, 'lender.name': e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="number"
              label="مبلغ التسهيل (ر.س)"
              value={form['facility.facilityAmount']}
              onChange={e => setForm({ ...form, 'facility.facilityAmount': e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              sx={{ bgcolor: brandColors.primary }}
            >
              حفظ
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default DebtManagement;
