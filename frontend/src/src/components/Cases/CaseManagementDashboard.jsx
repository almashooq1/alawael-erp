import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Stack,
  LinearProgress,
} from '@mui/material';
import { Line, Bar, Pie } from 'react-chartjs-2';
import CaseList from './CaseList';
import CreateCase from './CreateCase';
import CaseDetails from './CaseDetails';
import CaseStatistics from './CaseStatistics';

/**
 * CaseManagementDashboard
 * 
 * الوصف: لوحة التحكم الرئيسية لإدارة حالات المراكز
 * - عرض إحصائيات شاملة
 * - قائمة بجميع الحالات مع التصفية
 * - إمكانية إنشاء حالات جديدة
 * - عرض تفاصيل الحالة
 */

function CaseManagementDashboard() {
  const [cases, setCases] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCase, setSelectedCase] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    disability: 'all',
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  const API_BASE = 'http://localhost:5000/api';

  // جلب الحالات
  const fetchCases = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.priority !== 'all') params.append('priority', filters.priority);
      if (filters.disability !== 'all') params.append('disability', filters.disability);
      if (filters.search) params.append('search', filters.search);
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);

      const response = await fetch(`${API_BASE}/cases?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setCases(data.data.cases);
        setPagination(prev => ({
          ...prev,
          total: data.data.pagination.total,
        }));
      }
      setError(null);
    } catch (err) {
      setError('خطأ في جلب الحالات: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // جلب الإحصائيات
  const fetchStatistics = async () => {
    try {
      const response = await fetch(`${API_BASE}/cases/statistics`);
      const data = await response.json();
      if (data.success) {
        setStatistics(data.data);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  // تحديث البيانات عند تغيير الفلترات
  useEffect(() => {
    fetchCases();
    fetchStatistics();
  }, [filters, pagination.page]);

  // معالجة تغيير الفلترات
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // معالجة البحث
  const handleSearch = (e) => {
    const value = e.target.value;
    setFilters(prev => ({
      ...prev,
      search: value,
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // معالجة إنشاء حالة جديدة
  const handleCreateCase = async (caseData) => {
    try {
      const response = await fetch(`${API_BASE}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caseData),
      });
      const data = await response.json();
      
      if (data.success) {
        setShowCreateDialog(false);
        fetchCases();
        fetchStatistics();
        Alert({ title: 'نجاح', message: 'تم إنشاء الحالة بنجاح' });
      }
    } catch (err) {
      setError('خطأ في إنشاء الحالة: ' + err.message);
    }
  };

  // الألوان حسب الأولوية
  const priorityColor = {
    low: 'success',
    normal: 'info',
    high: 'warning',
    urgent: 'error',
    critical: 'error',
  };

  // الألوان حسب الحالة
  const statusColor = {
    pending_review: 'default',
    under_assessment: 'info',
    approved: 'success',
    rejected: 'error',
    waitlist: 'warning',
    active: 'success',
    on_hold: 'warning',
    completed: 'success',
    transferred: 'info',
    discontinued: 'error',
  };

  if (loading && !cases.length) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* رأس الصفحة */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 2, fontWeight: 'bold', color: '#1976d2' }}>
          📋 لوحة التحكم - إدارة الحالات
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          إدارة شاملة لحالات المستفيدين في المركز
        </Typography>
      </Box>

      {/* رسائل الأخطاء */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* الإحصائيات السريعة */}
      {statistics && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  إجمالي الحالات
                </Typography>
                <Typography variant="h5">{statistics.summary.total}</Typography>
                <LinearProgress
                  variant="determinate"
                  value={(statistics.summary.total / 100) * 100}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  حالات نشطة
                </Typography>
                <Typography variant="h5" sx={{ color: '#4caf50' }}>
                  {statistics.summary.active}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  حالات معلقة
                </Typography>
                <Typography variant="h5" sx={{ color: '#ff9800' }}>
                  {statistics.summary.pending}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  حالات حرجة
                </Typography>
                <Typography variant="h5" sx={{ color: '#f44336' }}>
                  {statistics.summary.critical}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* التبويبات الرئيسية */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
          <Tab label="📊 لوحة التحكم" />
          <Tab label="📋 قائمة الحالات" />
          <Tab label="📈 الإحصائيات" />
          <Tab label="➕ حالة جديدة" />
        </Tabs>
      </Paper>

      {/* محتوى التبويبات */}
      {activeTab === 0 && (
        <Grid container spacing={2}>
          {/* شريط البحث والتصفية */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="🔍 بحث عن حالة"
                    placeholder="البحث برقم الحالة أو اسم المستفيد"
                    value={filters.search}
                    onChange={handleSearch}
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth>
                        <InputLabel>الحالة</InputLabel>
                        <Select
                          name="status"
                          value={filters.status}
                          onChange={handleFilterChange}
                          label="الحالة"
                        >
                          <MenuItem value="all">كل الحالات</MenuItem>
                          <MenuItem value="active">نشطة</MenuItem>
                          <MenuItem value="pending_review">قيد المراجعة</MenuItem>
                          <MenuItem value="completed">منتهية</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth>
                        <InputLabel>الأولوية</InputLabel>
                        <Select
                          name="priority"
                          value={filters.priority}
                          onChange={handleFilterChange}
                          label="الأولوية"
                        >
                          <MenuItem value="all">كل الأولويات</MenuItem>
                          <MenuItem value="critical">حرجة</MenuItem>
                          <MenuItem value="urgent">عاجلة</MenuItem>
                          <MenuItem value="high">مرتفعة</MenuItem>
                          <MenuItem value="normal">عادية</MenuItem>
                          <MenuItem value="low">منخفضة</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth>
                        <InputLabel>نوع الإعاقة</InputLabel>
                        <Select
                          name="disability"
                          value={filters.disability}
                          onChange={handleFilterChange}
                          label="نوع الإعاقة"
                        >
                          <MenuItem value="all">كل الأنواع</MenuItem>
                          <MenuItem value="physical">إعاقة حركية</MenuItem>
                          <MenuItem value="intellectual">إعاقة ذهنية</MenuItem>
                          <MenuItem value="visual">إعاقة بصرية</MenuItem>
                          <MenuItem value="hearing">إعاقة سمعية</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => setShowCreateDialog(true)}
                      >
                        ➕ إضافة حالة
                      </Button>
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* جدول الحالات */}
          <Grid item xs={12}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell align="right"><strong>رقم الحالة</strong></TableCell>
                    <TableCell align="right"><strong>اسم المستفيد</strong></TableCell>
                    <TableCell align="right"><strong>نوع الإعاقة</strong></TableCell>
                    <TableCell align="center"><strong>الحالة</strong></TableCell>
                    <TableCell align="center"><strong>الأولوية</strong></TableCell>
                    <TableCell align="center"><strong>الإجراء</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cases.length > 0 ? (
                    cases.map((caseItem) => (
                      <TableRow key={caseItem._id} hover>
                        <TableCell align="right">{caseItem.caseNumber}</TableCell>
                        <TableCell align="right">{caseItem.beneficiaryId?.fullName || 'N/A'}</TableCell>
                        <TableCell align="right">
                          {caseItem.disabilityInfo?.primaryDisability || 'N/A'}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={caseItem.admissionInfo?.status}
                            color={statusColor[caseItem.admissionInfo?.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={caseItem.admissionInfo?.priority}
                            color={priorityColor[caseItem.admissionInfo?.priority] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setSelectedCase(caseItem);
                              setActiveTab(1);
                            }}
                          >
                            عرض
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        لا توجد حالات
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <CaseList
          cases={cases}
          loading={loading}
          onSelectCase={setSelectedCase}
          onTabChange={setActiveTab}
        />
      )}

      {activeTab === 2 && statistics && (
        <CaseStatistics statistics={statistics} />
      )}

      {activeTab === 3 && (
        <CreateCase onSubmit={handleCreateCase} onClose={() => setActiveTab(0)} />
      )}

      {/* معالج عرض تفاصيل الحالة */}
      {selectedCase && (
        <Dialog
          open={true}
          onClose={() => setSelectedCase(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>تفاصيل الحالة - {selectedCase.caseNumber}</DialogTitle>
          <DialogContent>
            <CaseDetails caseData={selectedCase} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedCase(null)}>إغلاق</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* معالج إنشاء حالة جديدة */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>إنشاء حالة جديدة</DialogTitle>
        <DialogContent>
          <CreateCase
            onSubmit={handleCreateCase}
            onClose={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
}

export default CaseManagementDashboard;
