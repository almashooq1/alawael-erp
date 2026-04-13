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
} from '@mui/material';
import {
  PieChart,
  Refresh,
  Add,
  PlayArrow,
  Assessment,
  AccountTree,
  Calculate,
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
  direct: 'مباشر',
  step_down: 'تنازلي',
  reciprocal: 'متبادل',
  activity_based: 'حسب النشاط (ABC)',
  volume_based: 'حسب الحجم',
  revenue_based: 'حسب الإيراد',
  headcount_based: 'حسب عدد الموظفين',
  custom: 'مخصص',
};

const statusMap = {
  draft: { label: 'مسودة', color: '#9E9E9E' },
  active: { label: 'نشط', color: '#4CAF50' },
  suspended: { label: 'معلق', color: '#FF9800' },
  archived: { label: 'مؤرشف', color: '#607D8B' },
};

const CostAllocation = () => {
  const [tab, setTab] = useState(0);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({
    name: '',
    allocationType: 'direct',
    'costPool.poolName': '',
    'costPool.totalAmount': 0,
    'period.fiscalYear': new Date().getFullYear(),
  });

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAllocations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/finance/elite/cost-allocation`, { headers });
      const json = await res.json();
      if (json.success) setAllocations(json.data);
    } catch (e) {
      setError('خطأ في تحميل توزيعات التكاليف');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  const handleCreate = async () => {
    try {
      const payload = {
        name: form.name,
        allocationType: form.allocationType,
        costPool: {
          poolName: form['costPool.poolName'],
          totalAmount: Number(form['costPool.totalAmount']),
        },
        period: { fiscalYear: Number(form['period.fiscalYear']) },
      };
      const res = await fetch(`${API}/finance/elite/cost-allocation`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setOpenDialog(false);
        fetchAllocations();
      }
    } catch (e) {
      setError('خطأ في إنشاء توزيع التكاليف');
    }
  };

  const handleExecute = async id => {
    try {
      await fetch(`${API}/finance/elite/cost-allocation/${id}/execute`, {
        method: 'POST',
        headers,
      });
      fetchAllocations();
    } catch (e) {
      setError('خطأ في تنفيذ التوزيع');
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
            <PieChart sx={{ fontSize: 40, color: brandColors.primary }} />
            <Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: neutralColors.textPrimary, textAlign: 'right' }}
              >
                توزيع التكاليف
              </Typography>
              <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                Cost Allocation — قواعد التوزيع، محركات التكلفة، التكلفة حسب النشاط
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchAllocations}>
              تحديث
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenDialog(true)}
              sx={{ bgcolor: brandColors.primary }}
            >
              توزيع جديد
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
                <AccountTree sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {allocations.length}
                </Typography>
                <Typography variant="body2">إجمالي التوزيعات</Typography>
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
                <Calculate sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {fmt(allocations.reduce((sum, a) => sum + (a.costPool?.totalAmount || 0), 0))}
                </Typography>
                <Typography variant="body2">إجمالي مجمعات التكلفة</Typography>
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
                <Assessment sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {allocations.filter(a => a.status === 'active').length}
                </Typography>
                <Typography variant="body2">توزيعات نشطة</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #9C27B0 0%, #6A1B9A 100%)',
                color: '#fff',
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <PlayArrow sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {allocations.reduce((sum, a) => sum + (a.executionLog?.length || 0), 0)}
                </Typography>
                <Typography variant="body2">عمليات التنفيذ</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 600 } }}
        >
          <Tab label="التوزيعات" />
          <Tab label="مراكز الربح" />
        </Tabs>

        {tab === 0 && (
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: surfaceColors.sectionBg }}>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>رقم التوزيع</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الاسم</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>مجمع التكلفة</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>المبلغ</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>السنة</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allocations.map(a => (
                    <TableRow key={a._id} hover>
                      <TableCell sx={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {a.allocationNumber}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>{a.name}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {typeMap[a.allocationType] || a.allocationType}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {a.costPool?.poolName || '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {fmt(a.costPool?.totalAmount)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {a.period?.fiscalYear || '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={statusMap[a.status]?.label || a.status}
                          sx={{ bgcolor: statusMap[a.status]?.color, color: '#fff' }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Button
                          size="small"
                          startIcon={<PlayArrow />}
                          onClick={() => handleExecute(a._id)}
                          variant="outlined"
                          color="primary"
                        >
                          تنفيذ
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {allocations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                        لا توجد توزيعات تكاليف
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {tab === 1 && (
          <Card sx={{ borderRadius: 3, p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'right', mb: 2 }}>
              مراكز الربح
            </Typography>
            {allocations
              .filter(a => a.profitCenterMapping?.length > 0)
              .map(a => (
                <Box key={a._id} sx={{ mb: 3 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, textAlign: 'right', mb: 1 }}
                  >
                    {a.name}
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>
                            مركز الربح
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>
                            الإيراد
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>
                            التكلفة
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>
                            المساهمة
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>
                            الهامش %
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {a.profitCenterMapping.map((pc, i) => (
                          <TableRow key={i}>
                            <TableCell sx={{ textAlign: 'right' }}>
                              {pc.profitCenterName || pc.profitCenter}
                            </TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>
                              {fmt(pc.allocatedRevenue)}
                            </TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>
                              {fmt(pc.allocatedCost)}
                            </TableCell>
                            <TableCell
                              sx={{
                                textAlign: 'right',
                                fontWeight: 600,
                                color: pc.contribution >= 0 ? '#4CAF50' : '#D32F2F',
                              }}
                            >
                              {fmt(pc.contribution)}
                            </TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>
                              {pc.marginPercentage?.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}
            {allocations.filter(a => a.profitCenterMapping?.length > 0).length === 0 && (
              <Typography sx={{ textAlign: 'center', color: neutralColors.textSecondary, py: 4 }}>
                لا توجد مراكز ربح مُعيّنة
              </Typography>
            )}
          </Card>
        )}

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ textAlign: 'right', fontWeight: 700 }}>توزيع تكاليف جديد</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="اسم التوزيع"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              fullWidth
              select
              label="نوع التوزيع"
              value={form.allocationType}
              onChange={e => setForm({ ...form, allocationType: e.target.value })}
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
              label="اسم مجمع التكلفة"
              value={form['costPool.poolName']}
              onChange={e => setForm({ ...form, 'costPool.poolName': e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="number"
              label="إجمالي المبلغ (ر.س)"
              value={form['costPool.totalAmount']}
              onChange={e => setForm({ ...form, 'costPool.totalAmount': e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="number"
              label="السنة المالية"
              value={form['period.fiscalYear']}
              onChange={e => setForm({ ...form, 'period.fiscalYear': e.target.value })}
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

export default CostAllocation;
