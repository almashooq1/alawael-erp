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
  Receipt,
  Refresh,
  Add,
  Assessment,
  Gavel,
  Timeline,
  VerifiedUser,
} from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';
const fmt = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v || 0);

const strategyTypeMap = {
  vat_optimization: 'تحسين ضريبة القيمة المضافة',
  zakat_planning: 'تخطيط الزكاة',
  withholding_optimization: 'تحسين ضريبة الاستقطاع',
  transfer_pricing: 'تسعير التحويلات',
  tax_incentive: 'الحوافز الضريبية',
  cross_border: 'العمليات العابرة للحدود',
  restructuring: 'إعادة الهيكلة الضريبية',
  compliance_optimization: 'تحسين الامتثال',
  general: 'عام',
};

const statusMap = {
  draft: { label: 'مسودة', color: '#9E9E9E' },
  under_review: { label: 'قيد المراجعة', color: '#FF9800' },
  approved: { label: 'معتمد', color: '#4CAF50' },
  active: { label: 'نشط', color: '#2196F3' },
  completed: { label: 'مكتمل', color: '#607D8B' },
  rejected: { label: 'مرفوض', color: '#D32F2F' },
};

const TaxPlanning = () => {
  const [tab, setTab] = useState(0);
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({
    name: '',
    strategyType: 'vat_optimization',
    description: '',
    'period.fiscalYear': new Date().getFullYear(),
    'estimatedSavings.amount': 0,
  });

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchStrategies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/finance/elite/tax-planning`, { headers });
      const json = await res.json();
      if (json.success) setStrategies(json.data);
    } catch (e) {
      setError('خطأ في تحميل استراتيجيات التخطيط الضريبي');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  const handleCreate = async () => {
    try {
      const payload = {
        name: form.name,
        strategyType: form.strategyType,
        description: form.description,
        period: { fiscalYear: Number(form['period.fiscalYear']) },
        estimatedSavings: { amount: Number(form['estimatedSavings.amount']) },
      };
      const res = await fetch(`${API}/finance/elite/tax-planning`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setOpenDialog(false);
        fetchStrategies();
      }
    } catch (e) {
      setError('خطأ في إنشاء الاستراتيجية');
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );

  const totalSavings = strategies.reduce((sum, s) => sum + (s.estimatedSavings?.amount || 0), 0);
  const actualSavings = strategies.reduce((sum, s) => sum + (s.actualSavings?.amount || 0), 0);
  const zatcaCompliant = strategies.filter(s => s.zatcaCompliance?.isCompliant).length;

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
            <Receipt sx={{ fontSize: 40, color: brandColors.primary }} />
            <Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: neutralColors.textPrimary, textAlign: 'right' }}
              >
                التخطيط الضريبي
              </Typography>
              <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                Tax Planning — استراتيجيات ضريبية، سيناريوهات، امتثال زاتكا
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchStrategies}>
              تحديث
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenDialog(true)}
              sx={{ bgcolor: brandColors.primary }}
            >
              استراتيجية جديدة
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: `linear-gradient(135deg, ${brandColors.primary} 0%, #1565C0 100%)`,
                color: '#fff',
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <Gavel sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {strategies.length}
                </Typography>
                <Typography variant="body2">إجمالي الاستراتيجيات</Typography>
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
                <Assessment sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {fmt(totalSavings)}
                </Typography>
                <Typography variant="body2">التوفير المقدّر</Typography>
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
                <Timeline sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {fmt(actualSavings)}
                </Typography>
                <Typography variant="body2">التوفير الفعلي</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #009688 0%, #00695C 100%)',
                color: '#fff',
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <VerifiedUser sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {zatcaCompliant}
                </Typography>
                <Typography variant="body2">ممتثلة لـ ZATCA</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 600 } }}
        >
          <Tab label="الاستراتيجيات" />
          <Tab label="حسب النوع" />
          <Tab label="امتثال ZATCA" />
        </Tabs>

        {tab === 0 && (
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: surfaceColors.sectionBg }}>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الرقم</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الاسم</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>
                      السنة المالية
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>
                      التوفير المقدّر
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>
                      التوفير الفعلي
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {strategies.map(s => {
                    const st = statusMap[s.status] || {};
                    const savingsRatio =
                      s.estimatedSavings?.amount > 0
                        ? Math.round(
                            ((s.actualSavings?.amount || 0) / s.estimatedSavings.amount) * 100
                          )
                        : 0;
                    return (
                      <TableRow key={s._id} hover>
                        <TableCell sx={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          {s.strategyNumber}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>{s.name}</TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          {strategyTypeMap[s.strategyType] || s.strategyType}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          {s.period?.fiscalYear || '-'}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          {fmt(s.estimatedSavings?.amount)}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {fmt(s.actualSavings?.amount)}
                            </Typography>
                            {s.estimatedSavings?.amount > 0 && (
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(savingsRatio, 100)}
                                sx={{ width: 60, height: 6, borderRadius: 3 }}
                                color={savingsRatio >= 80 ? 'success' : 'warning'}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Chip
                            label={st.label || s.status}
                            sx={{ bgcolor: st.color, color: '#fff' }}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {strategies.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                        لا توجد استراتيجيات ضريبية
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {tab === 1 && (
          <Grid container spacing={2}>
            {Object.entries(strategyTypeMap).map(([key, label]) => {
              const filtered = strategies.filter(s => s.strategyType === key);
              if (filtered.length === 0) return null;
              return (
                <Grid item xs={12} md={6} key={key}>
                  <Card sx={{ borderRadius: 3, p: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'right', mb: 2 }}>
                      {label} ({filtered.length})
                    </Typography>
                    {filtered.map(s => (
                      <Box
                        key={s._id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          py: 1,
                          borderBottom: '1px solid #eee',
                        }}
                      >
                        <Chip
                          label={statusMap[s.status]?.label || s.status}
                          sx={{ bgcolor: statusMap[s.status]?.color, color: '#fff' }}
                          size="small"
                        />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {s.name}
                        </Typography>
                      </Box>
                    ))}
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {tab === 2 && (
          <Card sx={{ borderRadius: 3, p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'right', mb: 3 }}>
              حالة الامتثال لـ ZATCA
            </Typography>
            {strategies.map(s => (
              <Box
                key={s._id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1.5,
                  borderBottom: '1px solid #eee',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={s.zatcaCompliance?.isCompliant ? 'ممتثل' : 'غير ممتثل'}
                    sx={{
                      bgcolor: s.zatcaCompliance?.isCompliant ? '#4CAF50' : '#D32F2F',
                      color: '#fff',
                    }}
                    size="small"
                  />
                  {s.zatcaCompliance?.phase && (
                    <Chip
                      label={`المرحلة ${s.zatcaCompliance.phase}`}
                      variant="outlined"
                      size="small"
                    />
                  )}
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>
                  {s.name}
                </Typography>
              </Box>
            ))}
            {strategies.length === 0 && (
              <Typography sx={{ textAlign: 'center', color: neutralColors.textSecondary, py: 4 }}>
                لا توجد استراتيجيات
              </Typography>
            )}
          </Card>
        )}

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ textAlign: 'right', fontWeight: 700 }}>
            استراتيجية ضريبية جديدة
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="اسم الاستراتيجية"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              fullWidth
              select
              label="نوع الاستراتيجية"
              value={form.strategyType}
              onChange={e => setForm({ ...form, strategyType: e.target.value })}
              sx={{ mb: 2 }}
            >
              {Object.entries(strategyTypeMap).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              type="number"
              label="السنة المالية"
              value={form['period.fiscalYear']}
              onChange={e => setForm({ ...form, 'period.fiscalYear': e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="number"
              label="التوفير المقدّر (ر.س)"
              value={form['estimatedSavings.amount']}
              onChange={e => setForm({ ...form, 'estimatedSavings.amount': e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="الوصف"
              value={form.description}
              multiline
              rows={3}
              onChange={e => setForm({ ...form, description: e.target.value })}
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

export default TaxPlanning;
