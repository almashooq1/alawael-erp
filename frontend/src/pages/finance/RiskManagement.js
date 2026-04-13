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
import { Security, Refresh, Add, Warning, Assessment, Shield } from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const severityMap = {
  critical: { label: 'حرج', color: '#D32F2F' },
  high: { label: 'مرتفع', color: '#F44336' },
  medium: { label: 'متوسط', color: '#FF9800' },
  low: { label: 'منخفض', color: '#4CAF50' },
  negligible: { label: 'ضئيل', color: '#9E9E9E' },
};

const statusMap = {
  identified: { label: 'تم التحديد', color: '#9E9E9E' },
  assessed: { label: 'تم التقييم', color: '#2196F3' },
  mitigating: { label: 'قيد المعالجة', color: '#FF9800' },
  accepted: { label: 'مقبول', color: '#4CAF50' },
  closed: { label: 'مغلق', color: '#8BC34A' },
  escalated: { label: 'مُصعّد', color: '#D32F2F' },
};

const categoryMap = {
  market: 'مخاطر السوق',
  credit: 'مخاطر الائتمان',
  operational: 'مخاطر تشغيلية',
  liquidity: 'مخاطر السيولة',
  compliance: 'مخاطر الامتثال',
  strategic: 'مخاطر استراتيجية',
  reputational: 'مخاطر السمعة',
  currency: 'مخاطر العملة',
  interest_rate: 'مخاطر سعر الفائدة',
};

const RiskManagement = () => {
  const [tab, setTab] = useState(0);
  const [risks, setRisks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({
    riskTitle: '',
    riskCategory: 'operational',
    severity: 'medium',
    likelihood: 'possible',
    description: '',
    riskOwner: '',
    'impact.financial': 0,
  });

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchRisks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/finance/elite/risk-register`, { headers });
      const json = await res.json();
      if (json.success) setRisks(json.data);
    } catch (e) {
      setError('خطأ في تحميل سجل المخاطر');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API}/finance/elite/risk-register/dashboard/summary`, { headers });
      const json = await res.json();
      if (json.success) setSummary(json.data);
    } catch (e) {
      /* silent */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRisks();
    fetchSummary();
  }, [fetchRisks, fetchSummary]);

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API}/finance/elite/risk-register`, {
        method: 'POST',
        headers,
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setOpenDialog(false);
        fetchRisks();
        fetchSummary();
      }
    } catch (e) {
      setError('خطأ في إنشاء سجل المخاطر');
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
            <Security sx={{ fontSize: 40, color: brandColors.primary }} />
            <Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: neutralColors.textPrimary, textAlign: 'right' }}
              >
                إدارة المخاطر المالية
              </Typography>
              <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                Financial Risk Management — سجل المخاطر، التقييم، وخطط التخفيف
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => {
                fetchRisks();
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
              إضافة خطر
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        {summary && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  background: `linear-gradient(135deg, ${brandColors.primary} 0%, #1565C0 100%)`,
                  color: '#fff',
                }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Assessment sx={{ fontSize: 36, mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {summary.total}
                  </Typography>
                  <Typography variant="body2">إجمالي المخاطر</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%)',
                  color: '#fff',
                }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Warning sx={{ fontSize: 36, mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {summary.breachedKRIs}
                  </Typography>
                  <Typography variant="body2">مؤشرات مخترقة</Typography>
                </CardContent>
              </Card>
            </Grid>
            {summary.bySeverity
              ?.filter(s => s._id === 'critical' || s._id === 'high')
              .map(s => (
                <Grid item xs={12} sm={6} md={3} key={s._id}>
                  <Card
                    sx={{
                      background: `linear-gradient(135deg, ${severityMap[s._id]?.color} 0%, #333 100%)`,
                      color: '#fff',
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Shield sx={{ fontSize: 36, mb: 1 }} />
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {s.count}
                      </Typography>
                      <Typography variant="body2">{severityMap[s._id]?.label}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
          </Grid>
        )}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 600 } }}
        >
          <Tab label="سجل المخاطر" />
          <Tab label="حسب الفئة" />
          <Tab label="مؤشرات المخاطر" />
        </Tabs>

        {tab === 0 && (
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: surfaceColors.sectionBg }}>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>رقم المخاطرة</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>العنوان</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الفئة</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الخطورة</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الاحتمالية</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>نقاط الخطر</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {risks.map(r => (
                    <TableRow key={r._id} hover>
                      <TableCell sx={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {r.riskNumber}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {r.riskTitle}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {categoryMap[r.riskCategory] || r.riskCategory}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={severityMap[r.severity]?.label || r.severity}
                          sx={{
                            bgcolor: severityMap[r.severity]?.color,
                            color: '#fff',
                            fontWeight: 600,
                          }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{r.likelihood}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1,
                          }}
                        >
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(r.riskScore * 4, 100)}
                            sx={{
                              width: 60,
                              height: 8,
                              borderRadius: 4,
                              '& .MuiLinearProgress-bar': {
                                bgcolor:
                                  r.riskScore >= 15
                                    ? '#D32F2F'
                                    : r.riskScore >= 9
                                      ? '#FF9800'
                                      : '#4CAF50',
                              },
                            }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {r.riskScore}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={statusMap[r.status]?.label || r.status}
                          sx={{ bgcolor: statusMap[r.status]?.color, color: '#fff' }}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {risks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                        لا توجد مخاطر مسجلة
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {tab === 1 && summary?.byCategory && (
          <Grid container spacing={2}>
            {summary.byCategory.map(cat => (
              <Grid item xs={12} sm={6} md={4} key={cat._id}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'right', mb: 1 }}>
                      {categoryMap[cat._id] || cat._id}
                    </Typography>
                    <Typography
                      variant="h3"
                      sx={{ fontWeight: 700, color: brandColors.primary, textAlign: 'center' }}
                    >
                      {cat.count}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ textAlign: 'center', color: neutralColors.textSecondary }}
                    >
                      متوسط النقاط: {Math.round(cat.avgScore || 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {tab === 2 && (
          <Card sx={{ borderRadius: 3, p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'right', mb: 2 }}>
              مؤشرات المخاطر الرئيسية (KRIs)
            </Typography>
            {risks
              .filter(r => r.keyRiskIndicators?.length > 0)
              .map(r => (
                <Box key={r._id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, textAlign: 'right' }}>
                    {r.riskTitle}
                  </Typography>
                  {r.keyRiskIndicators.map((kri, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mt: 1,
                      }}
                    >
                      <Chip
                        label={kri.breached ? 'مُخترق' : 'طبيعي'}
                        color={kri.breached ? 'error' : 'success'}
                        size="small"
                      />
                      <Typography variant="body2">
                        {kri.currentValue} / {kri.threshold}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {kri.name}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ))}
            {risks.filter(r => r.keyRiskIndicators?.length > 0).length === 0 && (
              <Typography sx={{ textAlign: 'center', color: neutralColors.textSecondary, py: 4 }}>
                لا توجد مؤشرات مسجلة
              </Typography>
            )}
          </Card>
        )}

        {/* Create Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ textAlign: 'right', fontWeight: 700 }}>إضافة خطر جديد</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="عنوان المخاطرة"
              value={form.riskTitle}
              onChange={e => setForm({ ...form, riskTitle: e.target.value })}
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              fullWidth
              select
              label="الفئة"
              value={form.riskCategory}
              onChange={e => setForm({ ...form, riskCategory: e.target.value })}
              sx={{ mb: 2 }}
            >
              {Object.entries(categoryMap).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              select
              label="الخطورة"
              value={form.severity}
              onChange={e => setForm({ ...form, severity: e.target.value })}
              sx={{ mb: 2 }}
            >
              {Object.entries(severityMap).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              select
              label="الاحتمالية"
              value={form.likelihood}
              onChange={e => setForm({ ...form, likelihood: e.target.value })}
              sx={{ mb: 2 }}
            >
              <MenuItem value="almost_certain">شبه مؤكد</MenuItem>
              <MenuItem value="likely">محتمل</MenuItem>
              <MenuItem value="possible">ممكن</MenuItem>
              <MenuItem value="unlikely">غير محتمل</MenuItem>
              <MenuItem value="rare">نادر</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="الوصف"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="مالك المخاطرة"
              value={form.riskOwner}
              onChange={e => setForm({ ...form, riskOwner: e.target.value })}
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

export default RiskManagement;
