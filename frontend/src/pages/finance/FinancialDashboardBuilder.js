import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
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
  Dashboard,
  Refresh,
  Add,
  Widgets,
  ContentCopy,
  Delete,
  Share,
  Visibility,
} from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const typeMap = {
  executive: 'تنفيذية',
  operational: 'تشغيلية',
  financial: 'مالية',
  kpi: 'مؤشرات أداء',
  analytics: 'تحليلية',
  compliance: 'امتثال',
  custom: 'مخصصة',
};

const statusMap = {
  draft: { label: 'مسودة', color: '#9E9E9E' },
  active: { label: 'نشطة', color: '#4CAF50' },
  archived: { label: 'مؤرشفة', color: '#FF9800' },
  shared: { label: 'مشاركة', color: '#2196F3' },
};

const FinancialDashboardBuilder = () => {
  const [tab, setTab] = useState(0);
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({
    name: '',
    dashboardType: 'custom',
    description: '',
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchDashboards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/finance/elite/dashboards`, { headers });
      const json = await res.json();
      if (json.success) setDashboards(json.data);
    } catch (e) {
      setError('خطأ في تحميل لوحات البيانات');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards]);

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API}/finance/elite/dashboards`, {
        method: 'POST',
        headers,
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setOpenDialog(false);
        fetchDashboards();
      }
    } catch (e) {
      setError('خطأ في إنشاء لوحة البيانات');
    }
  };

  const handleClone = async id => {
    try {
      await fetch(`${API}/finance/elite/dashboards/${id}/clone`, { method: 'POST', headers });
      fetchDashboards();
    } catch (e) {
      /* silent */
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('هل تريد حذف هذه اللوحة؟')) return;
    try {
      await fetch(`${API}/finance/elite/dashboards/${id}`, { method: 'DELETE', headers });
      fetchDashboards();
    } catch (e) {
      /* silent */
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
            <Dashboard sx={{ fontSize: 40, color: brandColors.primary }} />
            <Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: neutralColors.textPrimary, textAlign: 'right' }}
              >
                لوحات البيانات المخصصة
              </Typography>
              <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                Financial Dashboard Builder — تصميم وإدارة لوحات البيانات المالية
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchDashboards}>
              تحديث
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenDialog(true)}
              sx={{ bgcolor: brandColors.primary }}
            >
              لوحة جديدة
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
                <Dashboard sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {dashboards.length}
                </Typography>
                <Typography variant="body2">إجمالي اللوحات</Typography>
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
                <Visibility sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {dashboards.filter(d => d.status === 'active').length}
                </Typography>
                <Typography variant="body2">لوحات نشطة</Typography>
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
                <Widgets sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {dashboards.reduce((sum, d) => sum + (d.widgets?.length || 0), 0)}
                </Typography>
                <Typography variant="body2">إجمالي الأدوات</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #2196F3 0%, #0D47A1 100%)',
                color: '#fff',
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <Share sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {dashboards.filter(d => d.status === 'shared').length}
                </Typography>
                <Typography variant="body2">لوحات مشاركة</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 600 } }}
        >
          <Tab label="كل اللوحات" />
          <Tab label="النشطة" />
          <Tab label="المسودات" />
        </Tabs>

        <Grid container spacing={3}>
          {dashboards
            .filter(d =>
              tab === 0 ? true : tab === 1 ? d.status === 'active' : d.status === 'draft'
            )
            .map(d => (
              <Grid item xs={12} sm={6} md={4} key={d._id}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <CardContent sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="نسخ">
                          <IconButton size="small" onClick={() => handleClone(d._id)}>
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(d._id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {d.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                          {d.dashboardNumber}
                        </Typography>
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Chip
                        label={statusMap[d.status]?.label || d.status}
                        sx={{ bgcolor: statusMap[d.status]?.color, color: '#fff' }}
                        size="small"
                      />
                      <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                        {typeMap[d.dashboardType] || d.dashboardType}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ color: neutralColors.textSecondary, textAlign: 'right' }}
                    >
                      {d.widgets?.length || 0} أداة · {d.dataSources?.length || 0} مصدر بيانات
                    </Typography>
                    {d.description && (
                      <Typography variant="body2" sx={{ mt: 1, textAlign: 'right' }}>
                        {d.description}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          {dashboards.length === 0 && (
            <Grid item xs={12}>
              <Card sx={{ p: 4, textAlign: 'center' }}>
                <Typography sx={{ color: neutralColors.textSecondary }}>
                  لا توجد لوحات بيانات
                </Typography>
              </Card>
            </Grid>
          )}
        </Grid>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ textAlign: 'right', fontWeight: 700 }}>
            إنشاء لوحة بيانات جديدة
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="اسم اللوحة"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              fullWidth
              select
              label="النوع"
              value={form.dashboardType}
              onChange={e => setForm({ ...form, dashboardType: e.target.value })}
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
              label="الوصف"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              multiline
              rows={3}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              sx={{ bgcolor: brandColors.primary }}
            >
              إنشاء
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default FinancialDashboardBuilder;
